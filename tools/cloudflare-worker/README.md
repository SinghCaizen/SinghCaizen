# Optional: your own free proxy (Cloudflare Worker)

Folio already works without this (it uses free public sources). A Worker
on YOUR free Cloudflare account makes the chart and price data much
faster and more reliable: responses are cached at Cloudflare's edge
(intraday ~45s, daily ~10 min, 5Y/MAX ~1h), only your GitHub Pages
origin may use it, only Yahoo Finance chart/quote/search URLs are
forwarded, and if Yahoo errors, the last good cached response is
served instead of failing.

1. Go to https://dash.cloudflare.com → sign up (free) if needed.
2. Left menu: **Workers & Pages** → **Create** → **Create Worker**.
3. Name it `folio-proxy` → **Deploy**.
4. Open the worker → **Edit code** → delete the sample → paste the whole
   `worker.js` from this folder → **Deploy** (top right).
5. Copy your worker URL (looks like
   `https://folio-proxy.<your-name>.workers.dev`).
6. Send the URL to Noor in chat (or paste it yourself into
   `portfolio/js/firebase-config.js` — `window.FOLIO_WORKER_URL`, the one
   config constant the app reads). From then on Folio tries your Worker
   first and keeps the public proxies as fallbacks. No keys, no cost:
   the free plan allows 100,000 requests/day, far beyond Folio's use.
