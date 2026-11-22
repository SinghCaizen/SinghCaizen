/* IELTS Study — service worker
   App shell ke liye NETWORK-FIRST strategy: pehle hamesha taaza file,
   network na ho tab cache. Isse har update turant milta hai.
   Study media (Drive/audio/PDF) hamesha network se aata hai. */
const CACHE = 'ielts-study-v2';
const SHELL = ['./', './index.html', './styles.css', './app.js', './data/chapters.js', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
