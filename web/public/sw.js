// Service worker tối giản: cache app shell (network-first cho HTML, cache-first cho asset build).
// Không cache /api và file nhạc (stream trực tiếp).
const CACHE = 'my-music-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/media')) return;
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; })));
  } else if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => { caches.open(CACHE).then((c) => c.put('/', res.clone())); return res; }).catch(() => caches.match('/')));
  }
});
