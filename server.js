const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const YT_COOKIES = process.env.YT_COOKIES || '';
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');
if (YT_COOKIES && !fs.existsSync(COOKIES_PATH)) {
    fs.writeFileSync(COOKIES_PATH, YT_COOKIES, 'utf8');
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(YTDLP, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                const errorMsg = stderr || stdout || `yt-dlp exited with code ${code}`;
                reject(new Error(errorMsg));
            } else {
                resolve(stdout);
            }
        });

        child.on('error', (err) => {
            reject(new Error(`yt-dlp not found: ${err.message}`));
        });
    });
}

function extractJsonFromOutput(output) {
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SnapTube API is running' });
});

app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        try {
            let output;
            try {
                output = await runYtDlp([
                    url,
                    '--dump-json',
                    '--no-playlist',
                    '--no-warnings',
                    '--extractor-args', 'youtube:player_client=android;player_skip=configs',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ...(YT_COOKIES && fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [])
                ]);
            } catch (cookieError) {
                if (YT_COOKIES && fs.existsSync(COOKIES_PATH)) {
                    output = await runYtDlp([
                        url,
                        '--dump-json',
                        '--no-playlist',
                        '--no-warnings',
                        '--extractor-args', 'youtube:player_client=android;player_skip=configs',
                        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ]);
                } else {
                    throw cookieError;
                }
            }

        const lines = output.split('\n').filter(Boolean);
        const info = lines.length > 0 ? JSON.parse(lines[0]) : null;

        if (!info) {
            throw new Error('Failed to parse video info');
        }

        const formats = (lines)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
            .map(f => {
                const isVideo = f.has_video && !f.has_audio;
                const isAudio = f.has_audio && !f.has_video;
                const isCombined = f.has_video && f.has_audio;
                if (!isVideo && !isAudio && !isCombined) return null;
                return {
                    itag: f.format_id,
                    quality: f.quality_label || f.audio_quality || (isVideo ? 'video' : isAudio ? 'audio' : 'unknown'),
                    resolution: f.resolution || (isVideo ? 'video' : isAudio ? 'audio only' : 'unknown'),
                    container: f.ext,
                    hasVideo: !!f.has_video,
                    hasAudio: !!f.has_audio,
                    filesize: f.filesize || f.filesize_approx || null,
                    mimeType: f.mime_type || `video/${f.ext || 'mp4'}`
                };
            })
            .filter(Boolean);

        const thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || '';

        res.json({
            title: info.title || 'فيديو غير معروف',
            author: info.uploader || info.channel || 'غير معروف',
            thumbnail,
            duration: info.duration || 0,
            views: info.view_count || 0,
            formats
        });
    } catch (error) {
        console.error('Error fetching video info:', error.message);
        res.status(500).json({ error: `Failed to fetch video info: ${error.message}` });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { url, format, type, itag } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const filename = `${uuidv4()}`;
        let outputPath;
        let formatOption = '';

        if (type === 'audio') {
            formatOption = 'bestaudio/best';
            outputPath = path.join(DOWNLOADS_DIR, `${filename}.${format === 'm4a' ? 'm4a' : 'mp3'}`);
        } else {
            formatOption = itag ? itag : 'bestvideo+bestaudio/best';
            outputPath = path.join(DOWNLOADS_DIR, `${filename}.${format === 'webm' ? 'webm' : 'mp4'}`);
        }

        const args = [
            url,
            '-f', formatOption,
            '-o', outputPath,
            '--no-playlist',
            '--no-warnings',
            '--quiet'
        ];

        if (type === 'audio') {
            args.push('-x');
            args.push('--audio-format');
            args.push(format === 'm4a' ? 'm4a' : 'mp3');
            args.push('--audio-quality');
            args.push('0');
        }

        if (format === 'mp4' && type !== 'audio') {
            args.push('--merge-output-format');
            args.push('mp4');
        }

        await runYtDlp(args);

        const actualFile = fs.existsSync(outputPath)
            ? outputPath
            : await new Promise((resolve) => {
                const check = () => {
                    const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(filename));
                    if (files.length) return path.join(DOWNLOADS_DIR, files[0]);
                    return null;
                };
                const found = check();
                if (found) return resolve(found);
                setTimeout(() => resolve(check()), 1000);
            });

        if (!actualFile || !fs.existsSync(actualFile)) {
            throw new Error('File not found after download');
        }

        const finalName = path.basename(actualFile);

        res.json({
            success: true,
            message: 'Download completed',
            filename: finalName
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: `Download failed: ${error.message}` });
    }
});

app.get('/api/download-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DOWNLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.download(filePath, (err) => {
        if (err) console.error('Download error:', err);
    });
});

app.get('/manifest.json', (req, res) => {
    res.json({
        name: 'SnapTube Downloader',
        short_name: 'SnapTube',
        description: 'Download videos and music',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0f',
        theme_color: '#ff3b3b',
        icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
    });
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'sw.js'));
});

app.listen(PORT, () => {
    console.log(`🚀 SnapTube server running on port ${PORT}`);
    console.log(`📱 Access at: http://localhost:${PORT}`);
});

module.exports = app;
