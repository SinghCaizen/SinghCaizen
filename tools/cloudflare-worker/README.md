# Optional: your own free proxy (Cloudflare Worker)

Folio already works without this (it uses free public sources). A Worker
on YOUR free Cloudflare account just makes price/IPO data more reliable.

1. Go to https://dash.cloudflare.com → sign up (free) if needed.
2. Left menu: **Workers & Pages** → **Create** → **Create Worker**.
3. Name it `folio-proxy` → **Deploy**.
4. Open the worker → **Edit code** → delete the sample → paste the whole
   `worker.js` from this folder → **Deploy** (top right).
5. Copy your worker URL (looks like
   `https://folio-proxy.<your-name>.workers.dev`).
6. In Folio, the app starts using it automatically once Noor wires the
   URL into the proxy list — just send the URL in chat. No keys, no cost:
   the free plan allows 100,000 requests/day, far beyond Folio's use.
