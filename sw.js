/* 05CamLink service worker — offline-first, GitHub Pages subdirectory safe */
const CACHE = '05camlink-v6';

/* relative paths resolve against the SW scope, so this works at /repo/ too */
const SHELL = [
  './',
  'index.html',
  'viewer.html',
  'styles.css',
  'app.js',
  'pairing.js',
  'jsqr.min.js',
  'peerjs.min.js',
  'manifest.json',
  'konva.min.js',
  'qrcode.min.js',
  'gifler.min.js',
  'icon-192.png',
  'icon-512.png',
  'maskable-192.png',
  'maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never cache cross-origin (e.g. STUN, remote logos)

  // navigations → cache-first shell, fall back to index.html offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // static assets → cache-first, then network, then update cache
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
