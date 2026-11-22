/* IELTS Study — service worker (v5)
   Network-first: hamesha taaza version pehle, offline par cache.
   Media (Drive iframes) isme cache nahi hote — wo Google serve karta hai. */
const CACHE = 'ielts-study-v5';
const SHELL = [
  './',
  'index.html',
  'styles.css?v=6',
  'app.js?v=7',
  'auth.js?v=6',
  'firebase-config.js?v=6',
  'data/chapters.js?v=5',
  'data/plan.json',
  'data/resources.json',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
