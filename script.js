const isRailway = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE = isRailway ? '' : 'http://localhost:3000/api';

class SnapTube {
    constructor() {
        this.urlInput = document.getElementById('urlInput');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.preview = document.getElementById('preview');
        this.previewTitle = document.getElementById('previewTitle');
        this.previewMeta = document.getElementById('previewMeta');
        this.previewThumb = document.getElementById('previewThumb');
        this.qualityList = document.getElementById('qualityList');
        this.formatTabs = document.getElementById('formatTabs');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadHistory = document.getElementById('downloadHistory');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        this.qualityHint = document.getElementById('qualityHint');

        this.currentInfo = null;
        this.selectedFormat = 'mp4';
        this.selectedQuality = null;
        this.downloads = JSON.parse(localStorage.getItem('snapTubeDownloads') || '[]');

        this.init();
    }

    init() {
        this.bindEvents();
        this.renderHistory();
    }

    bindEvents() {
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.urlInput.addEventListener('paste', () => setTimeout(() => this.handleInput(), 100));
        this.urlInput.addEventListener('input', () => this.handleInput());
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.startDownload();
        });

        this.formatTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.format-tab');
            if (!tab) return;
            this.formatTabs.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.selectedFormat = tab.dataset.format;
            this.renderQualities();
        });

        this.downloadBtn.addEventListener('click', () => this.startDownload());

        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
    }

    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.urlInput.value = text;
            this.handleInput();
            this.urlInput.focus();
        } catch (err) {
            this.showToast('لم يتمكن من الوصول للحافظة', 'error');
        }
    }

    validateUrl(url) {
        return !!url && (url.startsWith('http://') || url.startsWith('https://'));
    }

    async handleInput() {
        const url = this.urlInput.value.trim();
        if (!url || !this.validateUrl(url)) {
            this.preview.style.display = 'none';
            this.currentInfo = null;
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/video-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            this.currentInfo = { ...data, url };
            this.previewTitle.textContent = data.title || 'فيديو';
            this.previewMeta.textContent = `${data.author || 'غير معروف'} • ${this.formatDuration(data.duration)}`;

            if (data.thumbnail) {
                this.previewThumb.innerHTML = `<img src="${data.thumbnail}" alt="thumbnail"><div class="preview-play">▶</div>`;
            } else {
                this.previewThumb.innerHTML = `<div class="preview-play">▶</div>`;
            }

            this.preview.style.display = 'block';
            this.selectedFormat = 'mp4';
            this.formatTabs.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
            this.formatTabs.querySelector('[data-format="mp4"]')?.classList.add('active');
            this.renderQualities();
        } catch (err) {
            console.error(err);
            this.preview.style.display = 'none';
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    getAvailableQualities() {
        if (!this.currentInfo || !this.currentInfo.formats) return [];
        const seen = new Set();
        const items = [];

        for (const f of this.currentInfo.formats) {
            if (this.selectedFormat === 'mp3' || this.selectedFormat === 'm4a') {
                if (f.hasAudio && !f.hasVideo) {
                    const key = `audio-${f.audioQuality || 'highest'}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        items.push({
                            label: f.audioQuality || 'صوت عالي',
                            size: this.formatBytes(f.filesize),
                            type: 'audio',
                            format: this.selectedFormat,
                            itag: f.itag
                        });
                    }
                }
            } else {
                if (f.hasVideo && f.hasAudio) {
                    const h = f.qualityLabel?.match(/(\d+)p/);
                    if (!h) continue;
                    const p = h[1];
                    const key = `${p}p`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        items.push({
                            label: `${p}p HD`,
                            size: this.formatBytes(f.filesize),
                            type: 'video',
                            format: 'mp4',
                            itag: f.itag
                        });
                    }
                }
            }
        }

        items.sort((a, b) => {
            const aNum = parseInt(a.label) || 0;
            const bNum = parseInt(b.label) || 0;
            return bNum - aNum;
        });

        return items;
    }

    formatBytes(bytes) {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1000) return `${(mb / 1000).toFixed(2)} GB`;
        return `${mb.toFixed(1)} MB`;
    }

    renderQualities() {
        const qualities = this.getAvailableQualities();
        if (!qualities.length) {
            this.qualityList.innerHTML = '<div class="quality-item"><div class="quality-left"><div class="quality-name">لا توجد جودات متاحة</div></div></div>';
            this.selectedQuality = null;
            this.qualityHint.textContent = '---';
            return;
        }

        this.qualityList.innerHTML = '';
        this.selectedQuality = qualities[0];

        qualities.forEach((q, idx) => {
            const el = document.createElement('div');
            el.className = `quality-item${idx === 0 ? ' selected' : ''}`;
            el.innerHTML = `
                <div class="quality-left">
                    <div class="quality-name">${q.label}</div>
                    <div class="quality-size">${q.size || 'حجم غير معروف'}</div>
                </div>
                <div class="quality-chip">${q.format.toUpperCase()}</div>
            `;
            el.addEventListener('click', () => {
                this.qualityList.querySelectorAll('.quality-item').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedQuality = q;
            });
            this.qualityList.appendChild(el);
        });

        const best = qualities[0];
        this.qualityHint.textContent = best ? `الأفضل: ${best.label}` : '---';
    }

    async startDownload() {
        const url = this.urlInput.value.trim();
        if (!url || !this.currentInfo) {
            this.showToast('أدخل رابط فيديو صحيح أولاً', 'error');
            return;
        }

        if (!this.selectedQuality) {
            this.showToast('اختر جودة التنزيل', 'error');
            return;
        }

        this.downloadBtn.disabled = true;
        this.downloadBtn.innerHTML = '<span>جاري التنزيل...</span>';

        const isAudio = this.selectedFormat === 'mp3' || this.selectedFormat === 'm4a';
        const videoRecord = {
            id: Date.now(),
            title: this.currentInfo.title || this.previewTitle.textContent,
            platform: 'video',
            quality: this.selectedQuality.label,
            format: this.selectedFormat,
            thumbnail: this.currentInfo.thumbnail || '',
            date: new Date().toLocaleDateString('ar-SA'),
            status: 'downloading',
            filename: null
        };

        const item = this.createHistoryItem(videoRecord);
        this.downloadHistory.insertBefore(item, this.downloadHistory.firstChild);
        this.clearHistoryBtn.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    quality: this.selectedQuality.label,
                    format: this.selectedFormat,
                    type: isAudio ? 'audio' : 'video',
                    itag: this.selectedQuality.itag
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'فشل التنزيل');

            videoRecord.status = 'completed';
            videoRecord.filename = data.filename;

            const progressFill = item.querySelector('.progress-fill');
            const progressText = item.querySelector('.progress-text');
            const actionBtn = item.querySelector('.btn-download');

            progressFill.style.width = '100%';
            progressFill.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
            progressText.textContent = 'مكتمل ✓';
            actionBtn.innerHTML = '⬇';
            actionBtn.title = 'فتح الملف';
            actionBtn.disabled = false;
            actionBtn.onclick = () => window.open(`${API_BASE}/download-file/${data.filename}`, '_blank');

            this.downloads.unshift(videoRecord);
            this.saveToStorage();
            this.showToast('تم التنزيل بنجاح!', 'success');
        } catch (err) {
            videoRecord.status = 'error';
            const progressText = item.querySelector('.progress-text');
            progressText.textContent = 'خطأ: ' + err.message;
            progressText.style.color = 'var(--error)';
            this.showToast(err.message, 'error');
        } finally {
            this.downloadBtn.disabled = false;
            this.downloadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>تنزيل الآن</span>
            `;
        }
    }

    createHistoryItem(video) {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.dataset.id = video.id;

        const thumbHtml = video.thumbnail
            ? `<img src="${video.thumbnail}" alt="thumb"><div class="preview-play" style="position:absolute;inset:0;margin:auto;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;">▶</div>`
            : `<span style="position:relative;z-index:1;">▶</span>`;

        el.innerHTML = `
            <div class="history-thumb">${thumbHtml}</div>
            <div class="history-body">
                <div class="history-title">${video.title}</div>
                <div class="history-meta">
                    <span>${video.platform}</span>
                    <span>${video.quality}</span>
                    <span>${video.format.toUpperCase()}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">جاري التنزيل...</div>
            </div>
            <div class="history-actions">
                <button class="icon-btn download" title="فتح الملف">⬇</button>
                <button class="icon-btn delete" title="حذف">✕</button>
            </div>
        `;

        el.querySelector('.btn-delete, .icon-btn.delete')?.addEventListener('click', () => this.deleteDownload(video.id));

        const dlBtn = el.querySelector('.icon-btn.download');
        dlBtn.addEventListener('click', () => {
            if (video.status === 'completed' && video.filename) {
                window.open(`${API_BASE}/download-file/${video.filename}`, '_blank');
            } else {
                this.showToast('التنزيل لم يكتمل بعد', 'info');
            }
        });

        return el;
    }

    deleteDownload(id) {
        const item = this.downloadHistory.querySelector(`[data-id="${id}"]`);
        if (!item) return;
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        setTimeout(() => {
            item.remove();
            this.downloads = this.downloads.filter(d => d.id !== id);
            this.saveToStorage();
            if (!this.downloads.length) {
                this.clearHistoryBtn.style.display = 'none';
            }
        }, 250);
    }

    clearHistory() {
        if (!confirm('مسح كل سجل التنزيلات؟')) return;
        this.downloads = [];
        this.saveToStorage();
        this.renderHistory();
        this.clearHistoryBtn.style.display = 'none';
    }

    renderHistory() {
        if (!this.downloads.length) {
            this.downloadHistory.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>لا توجد تنزيلات بعد</p>
                    <p class="empty-hint">الصق رابط أي فيديو للبدء</p>
                </div>
            `;
            return;
        }

        this.downloadHistory.innerHTML = '';
        this.downloads.forEach(video => {
            this.downloadHistory.appendChild(this.createHistoryItem(video));
        });
        this.clearHistoryBtn.style.display = 'block';
    }

    saveToStorage() {
        localStorage.setItem('snapTubeDownloads', JSON.stringify(this.downloads));
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SnapTube();
});
