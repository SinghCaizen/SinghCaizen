/* foliotest ONLY: no offline worker for the test copy. This worker removes any
   previously installed Folio service worker and all of its caches, so test
   loads always come straight from the network (no stale-build snapshots). */
self.addEventListener("install", e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (err) {}
    try { await self.clients.claim(); } catch (err) {}
    try { const cs = await self.clients.matchAll({ type: "window" }); cs.forEach(c => { try { c.navigate(c.url); } catch (err) {} }); } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
  })());
});
self.addEventListener("fetch", () => {});
