from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import os
import uuid
from datetime import datetime

app = Flask(__name__)

DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    try:
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL مطلوب'}), 400

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        return jsonify({
            'title': info.get('title', 'فيديو غير معروف'),
            'duration': info.get('duration', 0),
            'thumbnail': info.get('thumbnail', ''),
            'uploader': info.get('uploader', 'غير معروف'),
            'view_count': info.get('view_count', 0),
        })

    except Exception as e:
        return jsonify({'error': f'خطأ في استخراج معلومات الفيديو: {str(e)}'}), 400

@app.route('/api/download', methods=['POST'])
def download_video():
    try:
        data = request.get_json()
        url = data.get('url')
        quality = data.get('quality', '720')
        format_type = data.get('format', 'mp4')
        is_audio = data.get('isAudio', False)

        if not url:
            return jsonify({'error': 'URL مطلوب'}), 400

        filename = f"{uuid.uuid4()}"
        output_path = os.path.join(DOWNLOAD_FOLDER, f"{filename}.%(ext)s")

        ydl_opts = {
            'outtmpl': output_path,
            'quiet': False,
            'no_warnings': False,
        }

        if is_audio:
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': format_type,
                'preferredquality': quality,
            }]
            ydl_opts['postprocessor_args'] = ['-ar', '44100']
        else:
            ydl_opts['format'] = f'best[height<={quality}]/best'
            if format_type == 'mp4':
                ydl_opts['merge_output_format'] = 'mp4'

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info)

            if is_audio:
                base, _ = os.path.splitext(downloaded_file)
                downloaded_file = f"{base}.{format_type}"

        return jsonify({
            'success': True,
            'filename': os.path.basename(downloaded_file),
            'message': 'تم التنزيل بنجاح'
        })

    except Exception as e:
        return jsonify({'error': f'خطأ في التنزيل: {str(e)}'}), 400

@app.route('/api/download-file/<filename>')
def serve_file(filename):
    try:
        file_path = os.path.join(DOWNLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        return jsonify({'error': 'الملف غير موجود'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        files = []
        for filename in os.listdir(DOWNLOAD_FOLDER):
            file_path = os.path.join(DOWNLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                files.append({
                    'filename': filename,
                    'size': os.path.getsize(file_path),
                    'date': datetime.fromtimestamp(
                        os.path.getctime(file_path)
                    ).strftime('%Y-%m-%d %H:%M')
                })
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("=" * 50)
    print("🎬 سناب تيوب - خادم التنزيل")
    print("=" * 50)
    print("الخادم يعمل على: http://localhost:5000")
    print("اضغط Ctrl+C للإيقاف")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
