/* Folio build identity — the ONE source for the app version + build date.
   Loaded by index.html (window.FOLIO_BUILD) and by sw.js (importScripts ->
   self.FOLIO_BUILD), so the About box, the More footer and the service
   worker cache name can never drift apart. */
var FOLIO_BUILD = { version: "1.110.0", label: "v110", date: "2026-11-14" };
if (typeof window !== "undefined") window.FOLIO_BUILD = FOLIO_BUILD;
if (typeof self !== "undefined") self.FOLIO_BUILD = FOLIO_BUILD;
