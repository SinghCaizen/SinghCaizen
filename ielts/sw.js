/* IELTS Study — service worker
   Sirf app shell (HTML/CSS/JS) cache hota hai taaki site offline bhi khule.
   Study media (Drive/audio/PDF) hamesha network se aata hai. */
const CACHE = 'ielts-study-v1';
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
  // Sirf apne hi shell files ko cache-first do; baaki sab (Drive, cdnjs) network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(hit => hit || fetch(event.request))
    );
  }
});
