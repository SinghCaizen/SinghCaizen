/* Folio service worker — network-first for the app shell so a new build is
   never stuck behind the cache; the cache only answers when offline. */
try { importScripts("js/build.js"); } catch (e) {}
const CACHE = "folio-shell-" + (self.FOLIO_BUILD ? self.FOLIO_BUILD.version : "v3");
const CORE = ["./", "./index.html", "./css/style.css", "./js/app.js", "./js/features.js", "./js/stocks.js", "./js/profile.js", "./js/firebase-config.js", "./js/build.js", "./assets/folio-icon.svg", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* prices, Firebase, fonts: live network only */
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") { const idx = await caches.match("./index.html"); if (idx) return idx; }
      throw err;
    }
  })());
});
