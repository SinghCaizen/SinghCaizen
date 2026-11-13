/* Folio — private Cloudflare Worker proxy (free plan).
   One job: fetch Yahoo Finance chart/quote/search data for Folio, from
   Cloudflare's edge, with caching — so the app stops depending on slow
   public proxies. It is NOT an open proxy:
   - Only the Folio site origin gets CORS access.
   - Only Yahoo Finance chart / quoteSummary / search URLs are forwarded.
   - Responses are cached at the edge; on an upstream error the last
     good (stale) response is served instead of failing.
   Deploy: see README.md next to this file. */

const ALLOWED_ORIGIN = "https://singhcaizen.github.io";
const UPSTREAM_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const UPSTREAM_PATHS = [/^\/v8\/finance\/chart\//, /^\/v10\/finance\/quoteSummary\//, /^\/v1\/finance\/search$/, /^\/v7\/finance\/quote$/];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function ttlFor(target) {
  const iv = target.searchParams.get("interval") || "";
  const rg = target.searchParams.get("range") || "";
  if (/^(1m|2m|5m|15m|30m|60m|90m|1h)$/.test(iv)) return 45;        // intraday: 30–60s
  if (rg === "5y" || rg === "max") return 3600;                      // long ranges change slowly
  return 600;                                                        // daily: 10 min (spec 5–15)
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
    if (origin && origin !== ALLOWED_ORIGIN) return new Response("origin not allowed", { status: 403 });

    const url = new URL(request.url);
    const raw = url.searchParams.get("url");
    if (!raw) return new Response("Folio proxy: pass ?url=<encoded Yahoo URL>", { status: 400, headers: corsHeaders(origin) });
    let t;
    try { t = new URL(raw); } catch (e) { return new Response("bad url", { status: 400, headers: corsHeaders(origin) }); }
    if (!UPSTREAM_HOSTS.includes(t.hostname) || !UPSTREAM_PATHS.some(re => re.test(t.pathname))) {
      return new Response("target not allowed", { status: 403, headers: corsHeaders(origin) });
    }

    const ttl = ttlFor(t);
    const cache = caches.default;
    const cacheKey = new Request(t.toString(), { method: "GET" });
    const hit = await cache.match(cacheKey);
    const ageOf = resp => { const ts = Number(resp.headers.get("x-folio-ts") || 0); return ts ? (Date.now() - ts) / 1000 : Infinity; };
    if (hit && ageOf(hit) < ttl) {
      const h = new Headers(hit.headers); Object.entries(corsHeaders(origin)).forEach(([k, v]) => h.set(k, v));
      return new Response(hit.body, { status: hit.status, headers: h });
    }
    try {
      const resp = await fetch(t.toString(), { headers: { "User-Agent": UA, "Accept": "application/json, text/plain, */*" } });
      if (!resp.ok) throw new Error("upstream " + resp.status);
      const body = await resp.arrayBuffer();
      const stored = new Response(body, {
        status: 200,
        headers: { "Content-Type": resp.headers.get("Content-Type") || "application/json", "x-folio-ts": String(Date.now()), "Cache-Control": "public, max-age=86400" },
      });
      ctx.waitUntil(cache.put(cacheKey, stored.clone()));
      const h = new Headers(stored.headers); Object.entries(corsHeaders(origin)).forEach(([k, v]) => h.set(k, v));
      return new Response(body, { status: 200, headers: h });
    } catch (e) {
      if (hit) { /* serve stale on upstream error */
        const h = new Headers(hit.headers); Object.entries(corsHeaders(origin)).forEach(([k, v]) => h.set(k, v)); h.set("x-folio-stale", "1");
        return new Response(hit.body, { status: hit.status, headers: h });
      }
      return new Response(JSON.stringify({ error: "upstream unavailable" }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } });
    }
  },
};
