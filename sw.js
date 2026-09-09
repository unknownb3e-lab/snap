const CACHE_NAME = 'snaptube-v2';
const urlsToCache = ['/', '/index.html', '/styles.css', '/script.js', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request).then((fetchRes) => {
                if (fetchRes && fetchRes.status === 200) {
                    const clone = fetchRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return fetchRes;
            }).catch(() => caches.match('/index.html'));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
    );
});
