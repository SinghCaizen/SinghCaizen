/* Folio — optional Cloudflare Worker proxy (free tier).
   Purpose: a private, rate-limit-friendly door to Yahoo Finance for the
   chart/IPO data paths, so Folio does not depend on public proxies.
   Deploy: see README.md next to this file. Nothing here stores data;
   it only forwards the request and returns the response. */
const ALLOWED = [
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "www.nseindia.com",
  "www.bseindia.com",
];
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("Folio proxy: pass ?url=<encoded target>", { status: 400 });
    let t;
    try { t = new URL(target); } catch (e) { return new Response("bad url", { status: 400 }); }
    if (!ALLOWED.includes(t.hostname)) return new Response("host not allowed", { status: 403 });
    const resp = await fetch(t.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36", "Accept": "*/*" },
    });
    const body = await resp.arrayBuffer();
    return new Response(body, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
