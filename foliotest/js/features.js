"use strict";
/* ================================================================
   Folio — features:
   index ticker · stock charts · portfolio performance graph ·
   heatmap · tax harvesting · report issue · footer links
   ================================================================ */
/* ================================================================
   SOCIAL_LINKS — Singh Caizen's official social profiles.
   LILA: paste the real profile link next to a name and its icon
   appears automatically (More menu + Dashboard footer).
   Leave a link empty ("") to keep that icon hidden.
   Only Instagram is filled in — that profile is live and verified.
   ================================================================ */
const SOCIAL_LINKS = {
  rumble: "https://rumble.com/user/singhcaizen",
  instagram: "https://www.instagram.com/singhcaizen",
  x: "https://x.com/singhcaizen",
  facebook: "https://www.facebook.com/singhcaizen",
  telegram: "https://t.me/singhcaizen",
  whatsapp: "",
  linkedin: "https://www.linkedin.com/company/singhcaizen",
  threads: "https://www.threads.net/@singhcaizen"
};
const SOCIAL_NAMES = { rumble: "Rumble", instagram: "Instagram", x: "X", facebook: "Facebook", telegram: "Telegram", whatsapp: "WhatsApp Channel", linkedin: "LinkedIn", threads: "Threads" };
const SOCIAL_ORDER = ["rumble", "instagram", "x", "facebook", "telegram", "whatsapp", "linkedin", "threads"];
const SOCIAL_ICONS = {
  instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  facebook: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  telegram: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  rumble: "M14.4528 13.5458c.8064-.6542.9297-1.8381.2756-2.6445a1.8802 1.8802 0 0 0-.2756-.2756 21.2127 21.2127 0 0 0-4.3121-2.776c-1.066-.51-2.256.2-2.4261 1.414a23.5226 23.5226 0 0 0-.14 5.5021c.116 1.23 1.292 1.964 2.372 1.492a19.6285 19.6285 0 0 0 4.5062-2.704v-.008zm6.9322-5.4002c2.0335 2.228 2.0396 5.637.014 7.8723A26.1487 26.1487 0 0 1 8.2946 23.846c-2.6848.6713-5.4168-.914-6.1662-3.5781-1.524-5.2002-1.3-11.0803.17-16.3045.772-2.744 3.3521-4.4661 6.0102-3.832 4.9242 1.174 9.5443 4.196 13.0764 8.0121v.002z",
  threads: "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"
};


const PROXIES = [
  u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  u => "https://api.cors.lol/?url=" + encodeURIComponent(u),
  u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
];
async function fetchT(url, ms, register) {
  const ctl = new AbortController();
  if (register) register.push(ctl);
  const to = setTimeout(() => ctl.abort(), ms || 9000);
  try { return await fetch(url, { cache: "no-store", signal: ctl.signal }); }
  finally { clearTimeout(to); }
}
/* Symbol → {name, sector} lookup built from the stock list (the company
   sheet depends on this — it must exist before any modal opens). */
const STOCK_MAP = {};
(window.STOCK_LIST || []).forEach(s => { STOCK_MAP[s[0]] = { name: s[1], sector: s[2] || "" }; });

/* ---------- historical data (free, delayed, cached) ---------- */
const RANGE_CFG = {
  "1d":    { range: "1d",  interval: "1d" },
  "1d5m":  { range: "1d",  interval: "5m" },
  "5d15m": { range: "5d",  interval: "15m" },
  "5d1h":  { range: "5d",  interval: "60m" },
  "7d15m": { range: "7d",  interval: "15m" },
  "1mo":   { range: "1mo", interval: "1d" },
  "3mo":   { range: "3mo", interval: "1d" },
  "6mo":   { range: "6mo", interval: "1d" },
  "1y":    { range: "1y",  interval: "1d" },
  "5y":    { range: "5y",  interval: "1wk" },
  "max":   { range: "max", interval: "1mo" }
};
const histCache = {};
const histReval = {};
function histCk(ck) { const i = String(ck).indexOf("|"); return i > 0 ? symHash(String(ck).slice(0, i)) + String(ck).slice(i) : String(ck); }
function histLsGet(ck) {
  try { const o = JSON.parse(localStorage.getItem("folio_hist_" + histCk(ck)) || "null"); return o && o.data ? o : null; } catch (e) { return null; }
}
function histLsSet(ck, data) {
  try { localStorage.setItem("folio_hist_" + histCk(ck), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}
async function fetchHistoryNet(sym, rangeKey, ck) {
  const cfg = RANGE_CFG[rangeKey] || RANGE_CFG["6mo"];
  const buildAttempts = (s, ctls) => {
    const attempts = [];
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      const url = "https://" + host + "/v8/finance/chart/" + encodeURIComponent(s) + "?range=" + cfg.range + "&interval=" + cfg.interval;
      for (const p of PROXIES) {
        attempts.push((async () => {
          const res = await fetchT(p(url), 3500, ctls);
          if (!res.ok) throw new Error("bad route");
          const j = await res.json();
          const r0 = j && j.chart && j.chart.result && j.chart.result[0];
          if (!r0) throw new Error("no data");
          const tsArr = r0.timestamp || [];
          const closes = (r0.indicators && r0.indicators.quote && r0.indicators.quote[0] && r0.indicators.quote[0].close) || [];
          const points = [];
          for (let i = 0; i < tsArr.length; i++) if (typeof closes[i] === "number") points.push({ t: tsArr[i] * 1000, c: closes[i] });
          if (!points.length) throw new Error("empty");
          return { points: points, meta: r0.meta || {} };
        })());
      }
    }
    return attempts;
  };
  const s = (sym.indexOf(".") >= 0 || sym.charAt(0) === "^") ? sym : sym + ".NS";
  const ctls = [];
  try {
    const out = await Promise.any(buildAttempts(s, ctls)).finally(() => ctls.forEach(c => { try { c.abort(); } catch (e) {} }));
    histCache[ck] = out;
    histLsSet(ck, out);
    return out;
  } catch (e) {
    /* NSE silent? Try the BSE (.BO) listing once before giving up. */
    if (sym.indexOf(".") < 0 && sym.charAt(0) !== "^") {
      try {
        const out = await Promise.any(buildAttempts(sym + ".BO", ctls)).finally(() => ctls.forEach(c => { try { c.abort(); } catch (e) {} }));
        histCache[ck] = out;
        histLsSet(ck, out);
        return out;
      } catch (e2) {}
    }
    if (!(ck in histCache)) histCache[ck] = null;
    return null;
  }
}
async function fetchHistory(sym, rangeKey) {
  const ck = sym + "|" + rangeKey;
  if (ck in histCache) return histCache[ck];
  /* Stale-while-revalidate: a saved series (≤7 days old) paints instantly;
     fresh data is fetched in the background and swapped into the caches. */
  const saved = histLsGet(ck);
  if (saved) {
    histCache[ck] = saved.data;
    if (Date.now() - saved.ts > 30 * 60 * 1000 && !histReval[ck]) {
      histReval[ck] = true;
      fetchHistoryNet(sym, rangeKey, ck).then(() => { delete histReval[ck]; });
    }
    return saved.data;
  }
  return fetchHistoryNet(sym, rangeKey, ck);
}

/* ---------- line chart (SVG) ---------- */
function lineChartSvg(values, height) {
  if (!values || values.length < 2) return '<p class="empty-note">Not enough data for a chart.</p>';
  const W = 680, H = height || 200, P = 8;
  const min = Math.min(...values), max = Math.max(...values), rng = (max - min) || 1;
  const pts = values.map((v, i) => (P + i * (W - 2 * P) / (values.length - 1)).toFixed(1) + "," + (H - 22 - (v - min) / rng * (H - 40)).toFixed(1));
  const line = pts.join(" ");
  const area = "M" + pts[0].split(",")[0] + "," + (H - 22) + " L" + pts.join(" L") + " L" + pts[pts.length - 1].split(",")[0] + "," + (H - 22) + " Z";
  const last = pts[pts.length - 1].split(",");
  const rising = values[values.length - 1] >= values[0];
  return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path d="' + area + '" fill="var(--text)" opacity="0.07"/>' +
    '<polyline points="' + line + '" fill="none" stroke="var(--text)" stroke-width="2"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="#e03131"/>' +
    '<text x="' + P + '" y="14" fill="var(--muted)" font-size="12">' + inr2(max) + '</text>' +
    '<text x="' + P + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="12">' + inr2(min) + '</text>' +
    '<text x="' + (W - P) + '" y="14" text-anchor="end" fill="' + (rising ? "var(--text)" : "#e03131") + '" font-size="12" font-weight="bold">' + (rising ? "▲" : "▼") + '</text>' +
    '</svg>';
}

/* ---------- index ticker (animated header strip) ---------- */
let tickerLoadedAt = 0;
async function loadTicker() {
  /* Scrolling ticker line in the header: OFF at LILA's instruction
     (2026-11-12 — "header me ek line chal rahi hai use band karo").
     The strip stays hidden and no ticker fetches run. */
  const tw = $("tickerWrap"); if (tw) tw.classList.add("hidden");
  return;
  const wrap = $("tickerWrap"), track = $("tickerTrack");
  if (!wrap || !track || !currentUser) return;
  if (Date.now() - tickerLoadedAt < 5 * 60 * 1000 && track.innerHTML) return;
  const idx = [["^NSEI", "NIFTY 50"], ["^BSESN", "SENSEX"], ["^NSEBANK", "NIFTY BANK"], ["^INDIAVIX", "INDIA VIX"], ["^CNXIT", "NIFTY IT"], ["GC=F", "GOLD"], ["INR=X", "USD/INR"]];
  const items = [];
  for (const pair of idx) {
    const h = await fetchHistory(pair[0], "1d");
    if (!h || !h.meta || !h.meta.regularMarketPrice) continue;
    const price = h.meta.regularMarketPrice;
    const prev = h.meta.chartPreviousClose || h.meta.previousClose || (h.points.length > 1 ? h.points[h.points.length - 2].c : price);
    const chg = prev ? (price - prev) / prev * 100 : 0;
    items.push('<span class="tick-item" data-tick="' + pair[0] + '" title="Open chart">' + pair[1] + ' <b>' + Number(price).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</b> <span class="' + (chg >= 0 ? "tick-up" : "tick-dn") + '">' + (chg >= 0 ? "▲" : "▼") + " " + Math.abs(chg).toFixed(2) + "%</span></span>");
  }
  if (!items.length) return;
  const seq = items.join("");
  track.innerHTML = seq + seq;
  track.querySelectorAll("[data-tick]").forEach(el => el.addEventListener("click", () => openStock(el.dataset.tick)));
  wrap.classList.remove("hidden");
  tickerLoadedAt = Date.now();
}

/* ---------- dashboard extras: perf graph + heatmap + tax ---------- */
let folioView = "dashboard";
function renderExtras(d) {
  renderHeat(d); renderTax(d); renderPerf(d); renderCorp(d); renderDivChart(d);
  try { renderMood(); } catch (e) {}
  /* Heavy analytics render only for the tab actually on screen (zero lag). */
  if (folioView === "insights" || folioView === "news") { renderInsights(d); renderNews(d); renderEvents(d); }
}
const _origSwitchView = switchView;
switchView = function (name) {
  folioView = name;
  _origSwitchView(name);
  const ft = document.querySelector(".site-foot"); if (ft) ft.style.display = name === "dashboard" ? "" : "none";
  const mb = $("dockMoreBtn"); if (mb) mb.classList.toggle("active", ["news", "history", "profile"].includes(name));
  if ((name === "insights" || name === "news") && currentUser) renderAll();
  if (name === "watchlist" && currentUser) {
    setTimeout(() => {
      (async () => { for (const w of (state.watch || []).slice(0, 12)) await fetchMaster(w.sym); })();
    }, 500);
  }
};

let perfRange = "3mo", perfKey = "", perfToken = 0, perfBench = false;
function closeAt(points, t) { let c = null; for (const p of points) { if (p.t <= t) c = p.c; else break; } return c; }
function dualLineSvg(a, b, height) {
  const W = 680, H = height || 190, P = 8;
  const all = a.concat(b);
  const min = Math.min(...all), max = Math.max(...all), rng = (max - min) || 1;
  const X = i => P + i * (W - 2 * P) / (a.length - 1);
  const Y = v => H - 22 - (v - min) / rng * (H - 40);
  const path = arr => arr.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<polyline points="' + path(b) + '" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
    '<polyline points="' + path(a) + '" fill="none" stroke="var(--text)" stroke-width="2"/>' +
    '<text x="' + P + '" y="14" fill="var(--muted)" font-size="12">' + (max >= 0 ? "+" : "") + max.toFixed(1) + '%</text>' +
    '<text x="' + P + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="12">' + (min >= 0 ? "+" : "") + min.toFixed(1) + '%</text>' +
    '<text x="' + (W - P) + '" y="14" text-anchor="end" fill="var(--text)" font-size="12" font-weight="bold">— Your Portfolio</text>' +
    '<text x="' + (W - P) + '" y="30" text-anchor="end" fill="var(--muted)" font-size="12">- - NIFTY 50</text></svg>';
}
async function renderPerf(d) {
  const el = $("perfChart"), meta = $("perfMeta");
  if (!el) return;
  if (!d.rows.length) { el.innerHTML = '<p class="empty-note">Add stocks to see your portfolio graph.</p>'; if (meta) meta.textContent = ""; perfKey = ""; return; }
  const key = perfRange + "|" + (perfBench ? "B|" : "") + d.rows.map(r => r.sym + ":" + r.qty + ":" + (r.ltp || 0)).join(",");
  if (key === perfKey) return;
  perfKey = key;
  const token = ++perfToken;
  el.innerHTML = '<div class="skel" style="height:190px"></div>';
  const hists = {};
  await Promise.all(d.rows.map(async r => { hists[r.sym] = await fetchHistory(r.sym, perfRange); }));
  if (token !== perfToken) return;
  const tset = new Set();
  Object.values(hists).forEach(h => { if (h) h.points.forEach(p => tset.add(p.t)); });
  const ts = [...tset].sort((a, b) => a - b);
  if (ts.length < 2) { el.innerHTML = '<p class="empty-note">Graph data could not load right now — the free data source is busy. Your numbers above are safe.</p>'; if (meta) meta.textContent = ""; return; }
  const vals = ts.map(t => d.rows.reduce((s, r) => {
    const h = hists[r.sym];
    const c = h ? closeAt(h.points, t) : null;
    return s + r.qty * (c !== null ? c : r.avg);
  }, 0));
  const first = vals[0], last = vals[vals.length - 1];
  const chg = first ? (last - first) / first * 100 : 0;
  if (perfBench) {
    const bench = await fetchHistory("^NSEI", perfRange);
    if (token !== perfToken) return;
    if (bench && bench.points.length > 1) {
      const b0 = bench.points[0].c;
      const bvals = ts.map(t => { const c = closeAt(bench.points, t); return c !== null && b0 ? (c / b0 - 1) * 100 : null; });
      const pvals = vals.map(v => first ? (v / first - 1) * 100 : 0);
      const pairs = pvals.map((v, i) => [v, bvals[i]]).filter(pr => pr[1] !== null);
      if (pairs.length > 1) {
        el.innerHTML = dualLineSvg(pairs.map(p => p[0]), pairs.map(p => p[1]), 190);
        const bchg = pairs[pairs.length - 1][1];
        const alpha = chg - bchg;
        if (meta) meta.innerHTML = "Your portfolio <span class=\"" + (chg >= 0 ? "gain" : "loss") + "\">" + pct(chg) + "</span> vs NIFTY 50 <span class=\"" + (bchg >= 0 ? "gain" : "loss") + "\">" + pct(bchg) + "</span> over this period · Alpha <b class=\"" + (alpha >= 0 ? "gain" : "loss") + "\">" + pct(alpha) + "</b> (at today's quantities, approximate).";
        return;
      }
    }
  }
  /* Invested Capital step series (net cash in, from your own entries) vs
     Portfolio Value area — the gap between the two lines is your profit. */
  const txnsSorted = [...(state.txns || [])].sort((a, b) => a.date < b.date ? -1 : 1);
  const invVals = ts.map(t => {
    let net = 0;
    for (const x of txnsSorted) {
      const tt = new Date(x.date + "T00:00:00").getTime() + 86399999;
      if (tt > t) break;
      const amt = (x.qty || 0) * (x.price || 0), ch = x.charges || 0;
      if (x.type === "BUY") net += amt + ch;
      else if (x.type === "SELL") net -= (amt - ch);
    }
    return Math.max(0, net);
  });
  el.innerHTML = perfChartSvg(vals, invVals, 190);
  if (meta) meta.innerHTML = "Portfolio value: " + inr(first) + " → <b>" + inr(last) + "</b> · <span class=\"" + (chg >= 0 ? "gain" : "loss") + "\">" + pct(chg) + "</span> over this period · Net invested capital so far: <b>" + inr(invVals[invVals.length - 1]) + "</b> (dashed line — the gap above it is your profit).";
}
function perfChartSvg(vals, invVals, height) {
  const W = 680, H = height || 190, P = 8;
  const all = vals.concat(invVals);
  const min = Math.min(...all), max = Math.max(...all), rng = (max - min) || 1;
  const X = i => P + i * (W - 2 * P) / (vals.length - 1);
  const Y = v => H - 22 - (v - min) / rng * (H - 40);
  const pts = vals.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1));
  const area = "M" + pts[0].split(",")[0] + "," + (H - 22) + " L" + pts.join(" L") + " L" + pts[pts.length - 1].split(",")[0] + "," + (H - 22) + " Z";
  const inv = invVals.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<defs><linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--text)" stop-opacity="0.20"/><stop offset="1" stop-color="var(--text)" stop-opacity="0.02"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#perfGrad)"/>' +
    '<polyline points="' + inv + '" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-dasharray="6 4"/>' +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--text)" stroke-width="2"/>' +
    '<text x="' + P + '" y="14" fill="var(--muted)" font-size="12">' + inr(max) + '</text>' +
    '<text x="' + (W - P) + '" y="14" text-anchor="end" fill="var(--text)" font-size="12" font-weight="bold">— Portfolio Value</text>' +
    '<text x="' + (W - P) + '" y="30" text-anchor="end" fill="var(--muted)" font-size="12">- - Invested Capital</text></svg>';
}

let heatMode = "today";
function tmLayout(rows, W, H) {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  const items = rows.map(r => ({ sym: r.sym, ltp: r.ltp, dayPct: r.dayPct, pnlPct: r.pnlPct, cur: r.cur, area: r.value / total * W * H })).sort((a, b) => b.area - a.area);
  const rects = [];
  let x = 0, y = 0, w = W, h = H, row = [];
  const worst = (rw, ww, hh) => {
    const sm = rw.reduce((a, r) => a + r.area, 0);
    if (!sm) return Infinity;
    const mx = Math.max.apply(null, rw.map(r => r.area)), mn = Math.min.apply(null, rw.map(r => r.area));
    const side = Math.min(ww, hh);
    return Math.max(side * side * mx / (sm * sm), (sm * sm) / (side * side * mn));
  };
  const place = () => {
    const sm = row.reduce((a, r) => a + r.area, 0);
    if (w >= h) {
      const rw = sm / h; let cy = y;
      row.forEach(r => { const rh = r.area / rw; rects.push(Object.assign({}, r, { x: x, y: cy, w: rw, h: rh })); cy += rh; });
      x += rw; w -= rw;
    } else {
      const rh = sm / w; let cx = x;
      row.forEach(r => { const rw2 = r.area / rh; rects.push(Object.assign({}, r, { x: cx, y: y, w: rw2, h: rh })); cx += rw2; });
      y += rh; h -= rh;
    }
  };
  for (const it of items) {
    if (!row.length || worst(row.concat([it]), w, h) <= worst(row, w, h)) row.push(it);
    else { place(); row = [it]; }
  }
  if (row.length) place();
  return rects;
}
function renderHeat(d) {
  const el = $("heatMap");
  if (!el) return;
  if (!d.rows.length) { el.innerHTML = '<p class="empty-note">Add stocks — the heatmap then shows every holding at one glance.</p>'; return; }
  const rows = d.rows.filter(r => r.cur > 0).map(r => ({
    sym: r.sym, value: r.cur, cur: r.cur, ltp: r.ltp, pnlPct: r.pnlPct,
    dayPct: (r.ltp !== null && r.prevClose) ? (r.ltp - r.prevClose) / r.prevClose * 100 : null
  }));
  const W = 1000, H = 300;
  const rects = tmLayout(rows, W, H);
  el.innerHTML = '<div class="tm-wrap">' + rects.map(rc => {
    const v = heatMode === "pnl" ? rc.pnlPct : rc.dayPct;
    let bg, fg = "#ffffff";
    if (v === null || v === undefined || Math.abs(v) <= 0.01) { bg = "var(--panel-2)"; fg = "var(--text)"; }
    else if (v > 0) bg = "linear-gradient(135deg, #059669, #10b981)";
    else bg = "linear-gradient(135deg, #dc2626, #ef4444)";
    const big = rc.w >= 120 && rc.h >= 56, mid = rc.w >= 78 && rc.h >= 40;
    const pctTxt = v === null || v === undefined ? "—" : pct(v) + (heatMode === "pnl" ? " overall" : " today");
    return '<button type="button" class="tm-tile" data-heat="' + esc(rc.sym) + '" style="left:' + (rc.x / W * 100) + "%;top:" + (rc.y / H * 100) + "%;width:" + (rc.w / W * 100) + "%;height:" + (rc.h / H * 100) + "%;background:" + bg + ";color:" + fg + '">' +
      '<span class="tm-sym" style="font-size:' + (big ? 14 : mid ? 12 : 10.5) + 'px">' + esc(rc.sym) + "</span>" +
      (mid ? '<span class="tm-ltp">' + (rc.ltp !== null ? inr2(rc.ltp) : "—") + "</span>" : "") +
      (big ? '<span class="tm-pct">' + pctTxt + "</span>" : "") + "</button>";
  }).join("") + "</div>";
  el.querySelectorAll("[data-heat]").forEach(b => b.addEventListener("click", () => openStock(b.dataset.heat)));
}

let taxTab = "booked";
function renderTax(d) {
  const el = $("taxBox");
  if (!el) return;
  const s = d.split || { stcg: 0, ltcg: 0, stcgFY: 0, ltcgFY: 0 };
  const now = Date.now();
  const harvest = d.rows.filter(r => r.pnl < 0).map(r => {
    const oldest = (r.lots && r.lots.length) ? r.lots[0].date : r.firstDate;
    const days = oldest ? (now - new Date(oldest + "T00:00:00")) / 86400000 : 0;
    const isLong = days >= 365;
    return { sym: r.sym, loss: r.pnl, isLong: isLong, save: Math.abs(r.pnl) * (isLong ? 0.125 : 0.20) };
  }).sort((a, b) => a.loss - b.loss);
  const totalSave = harvest.reduce((a, h) => a + h.save, 0);
  /* LTCG exemption tracker: ₹1,25,000 of booked long-term gains per FY is tax-free */
  const bookedLtcg = Math.max(0, s.ltcgFY || 0);
  const exUsed = Math.min(125000, bookedLtcg);
  const exLeft = 125000 - exUsed;
  const exPct = Math.round(exUsed / 125000 * 100);
  /* Unrealised liability estimate */
  const unrlStcgTax = Math.max(0, s.stcg || 0) * 0.20;
  const unrlLtcgTax = Math.max(0, (s.ltcg || 0) + bookedLtcg - 125000) * 0.125 * ((s.ltcg || 0) > 0 ? 1 : 0);
  const liab = unrlStcgTax + unrlLtcgTax;
  const tabs = '<div class="cap-chips tax-tabs">' +
    '<button type="button" class="chip' + (taxTab === "booked" ? " active" : "") + '" data-taxtab="booked">Booked P&amp;L</button>' +
    '<button type="button" class="chip' + (taxTab === "liability" ? " active" : "") + '" data-taxtab="liability">Unrealised Tax Liability</button>' +
    '<button type="button" class="chip' + (taxTab === "harvest" ? " active" : "") + '" data-taxtab="harvest">Harvesting</button></div>';
  let body = "";
  if (taxTab === "booked") {
    body =
      '<div class="tax-grid">' +
      '<div><span>Booked STCG — this FY</span><b class="' + (s.stcgFY >= 0 ? "gain" : "loss") + '">' + inr(s.stcgFY) + '</b></div>' +
      '<div><span>Booked LTCG — this FY</span><b class="' + (s.ltcgFY >= 0 ? "gain" : "loss") + '">' + inr(s.ltcgFY) + '</b></div>' +
      '<div><span>Dividends received</span><b>' + inr(d.divTotal) + '</b></div>' +
      '</div>' +
      '<div class="exempt-box"><div class="exempt-head"><span>Tax-free LTCG room this financial year (₹1,25,000 exemption)</span><b>' + inr(exLeft) + ' left</b></div>' +
      '<div class="exempt-track"><div class="exempt-fill" style="width:' + exPct + '%"></div></div>' +
      '<p class="price-meta">You have booked ' + inr(bookedLtcg) + ' of long-term gains this FY. Long-term gains up to ₹1,25,000 in a financial year are exempt — booking up to ' + inr(exLeft) + ' more of long-term profit before 31 March can still be tax-free (only where you genuinely want to sell and, if you wish, re-buy).</p></div>';
  } else if (taxTab === "liability") {
    body =
      '<div class="tax-grid">' +
      '<div><span>Unrealised STCG (held &lt; 1 yr)</span><b class="' + ((s.stcg || 0) >= 0 ? "gain" : "loss") + '">' + inr(s.stcg || 0) + '</b></div>' +
      '<div><span>Unrealised LTCG (held 1 yr+)</span><b class="' + ((s.ltcg || 0) >= 0 ? "gain" : "loss") + '">' + inr(s.ltcg || 0) + '</b></div>' +
      '<div><span>Estimated tax if all sold today</span><b>≈ ' + inr(liab) + '</b></div>' +
      '</div>' +
      '<p class="price-meta">Worked out at STCG 20% and LTCG 12.5%, with the ₹1,25,000 yearly LTCG exemption shared between booked and unrealised long-term gains. Losses, surcharge and cess can change the real figure — this is a planning estimate, not tax advice.</p>';
  } else {
    body = harvest.length
      ? '<h3 class="tax-h">Holdings sitting in loss right now</h3>' +
        harvest.map(h => '<div class="tax-row"><span><b>' + esc(h.sym) + '</b> · ' + (h.isLong ? "Long-term" : "Short-term") + ' loss</span><span class="loss">' + inr(h.loss) + '</span><span class="tax-save">setting this loss against gains may save ≈ ' + inr(h.save) + ' tax</span></div>').join("") +
        '<p class="price-meta">Total possible saving ≈ <b>' + inr(totalSave) + '</b>. Selling only for tax has its own risks — the stock can run up after you sell. Decide on the business first, tax second.</p>'
      : '<p class="empty-note">No holding is in loss right now — there is nothing to harvest.</p>';
  }
  el.innerHTML = tabs + body +
    '<p class="price-meta">Estimate only — not tax advice. Rates used: STCG 20%, LTCG 12.5% on equity shares. FY = April to March; long-term = held 365+ days, by your entry dates.</p>';
  el.querySelectorAll("[data-taxtab]").forEach(b => b.addEventListener("click", () => { taxTab = b.dataset.taxtab; renderTax(d); }));
}

/* ---------- stock chart modal ---------- */
let stockSym = null, stockRange = "6mo";
const RANGE_LABEL = { "1d5m": "Today · 5-minute candles", "5d15m": "5 days · 15-minute candles", "5d1h": "5 days · 1-hour candles", "7d15m": "1 week · daily closes", "1mo": "1 month", "3mo": "3 months", "6mo": "6 months", "1y": "1 year", "5y": "5 years", "max": "All available history" };
function openStock(sym) {
  stockSym = sym; stockRange = "6mo";
  const row = enriched().rows.find(r => r.sym === sym);
  const metaStock = (window.STOCK_LIST || []).find(s => s[0] === sym);
  $("stockTitle").textContent = sym;
  $("stockName").textContent = row ? row.name : (metaStock ? metaStock[1] : "");
  document.querySelectorAll("#stockSeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.r === stockRange));
  $("stockModal").classList.remove("hidden");
  /* the previous stock's chart must vanish NOW, not when the new data lands */
  try { lwDispose(); const w = $("lwWrap"), b = $("lwBar"), l = $("lwLegend"); if (w) w.classList.add("hidden"); if (b) b.classList.add("hidden"); if (l) l.classList.add("hidden"); const sb = $("stockChart"); if (sb) sb.classList.remove("hidden"); } catch (e) {}
  requestAnimationFrame(() => requestAnimationFrame(() => drawStock()));
}
async function drawStock() {
  const sym = stockSym;
  const box = $("stockChart"), stats = $("stockStats"), meta = $("stockRangeMeta");
  if (!sym || !box) return;
  box.innerHTML = '<div class="skel" style="height:210px"></div>';
  stats.innerHTML = ""; meta.textContent = "";
  let h = null;
  const SLICE_DAYS = { "7d15m": 7, "1mo": 31, "3mo": 92, "6mo": 183, "1y": 366 };
  if (SLICE_DAYS[stockRange]) {
    const mst = await fetchMaster(sym);
    if (sym !== stockSym) return;
    if (mst && mst.points.length > 1) {
      const pts = stockRange === "1y" ? mst.points : mst.points.filter(p => p.t >= Date.now() - SLICE_DAYS[stockRange] * 86400000);
      if (pts.length > 1) h = { points: pts, meta: mst.meta };
    }
  }
  if (!h) h = await fetchHistory(sym, stockRange);
  if (sym !== stockSym) return;
  const row = enriched().rows.find(r => r.sym === sym);
  const p = priceOf(sym);
  if (!h || h.points.length < 2) {
    delete histCache[sym + "|" + stockRange];
    try { localStorage.removeItem("folio_hist_" + sym + "|" + stockRange); } catch (e) {}
    box.innerHTML = '<p class="empty-note">Chart data could not load right now — the free data source is busy.</p><button type="button" class="btn btn-small" id="chartRetry">↻ Try Again</button>';
    const rb = $("chartRetry");
    if (rb) rb.addEventListener("click", drawStock);
  } else {
    box.innerHTML = stockChartSvg(h.points, sym);
    const first = h.points[0].c, last = h.points[h.points.length - 1].c;
    const chg = (last - first) / first * 100;
    meta.innerHTML = RANGE_LABEL[stockRange] + ": " + inr2(first) + " → <b>" + inr2(last) + "</b> · <span class=\"" + (chg >= 0 ? "gain" : "loss") + "\">" + pct(chg) + "</span>";
  }
  const m = (h && h.meta) || {};
  const cells = [];
  if (p) {
    cells.push(["Price now", inr2(p.price)]);
    if (p.prevClose) cells.push(["Today", '<b class="' + (p.price >= p.prevClose ? "gain" : "loss") + '">' + pct((p.price - p.prevClose) / p.prevClose * 100) + '</b>']);
    cells.push(["Previous close", inr2(p.prevClose || p.price)]);
  }
  if (m.fiftyTwoWeekHigh) { cells.push(["52-week high", inr2(m.fiftyTwoWeekHigh)]); cells.push(["52-week low", inr2(m.fiftyTwoWeekLow)]); }
  if (m.regularMarketDayHigh) cells.push(["Day range", inr2(m.regularMarketDayLow) + " – " + inr2(m.regularMarketDayHigh)]);
  if (m.regularMarketVolume) cells.push(["Volume today", Number(m.regularMarketVolume).toLocaleString("en-IN")]);
  if (typeof CAP_CLASS === "function") cells.push(["Market cap class", CAP_CLASS(sym) === "L" ? "Large Cap" : CAP_CLASS(sym) === "M" ? "Mid Cap" : "Small Cap"]);
  if (row) {
    cells.push(["You hold", row.qty + " shares"]);
    cells.push(["Your avg buy", inr2(row.avg)]);
    cells.push(["Your P&L", '<b class="' + (row.pnl >= 0 ? "gain" : "loss") + '">' + inr(row.pnl) + " (" + pct(row.pnlPct) + ")</b>"]);
    cells.push(["First bought", esc(row.firstDate || "—")]);
  }
  stats.innerHTML = cells.map(c => "<div><span>" + c[0] + "</span>" + c[1] + "</div>").join("");
}

/* ---------- market mood (Fear & Greed from VIX + NIFTY RSI + trend) ---------- */
let moodCache = null, moodBusy = false;
async function renderMood() {
  const box = $("moodBox");
  if (!box || !currentUser) return;
  if (moodCache && Date.now() - moodCache.ts < 10 * 60 * 1000) { box.innerHTML = moodCache.html; return; }
  if (moodBusy) return;
  moodBusy = true;
  try {
    const vixH = await fetchHistory("^INDIAVIX", "1mo");
    const nifH = await fetchHistory("^NSEI", "1y");
    if (!vixH || !vixH.points.length || !nifH || nifH.points.length < 60) { box.innerHTML = '<p class="empty-note">Market mood needs the index data — it will appear when the free feed responds.</p>'; return; }
    const vix = vixH.points[vixH.points.length - 1].c;
    const closes = nifH.points.map(p => p.c);
    const last = closes[closes.length - 1];
    const rsi = rsi14(closes) || 50;
    const sma200 = smaSeries(closes, 200);
    const ma = sma200[sma200.length - 1];
    const vixScore = Math.max(0, Math.min(100, (32 - vix) / 22 * 100));
    const trendScore = ma ? Math.max(0, Math.min(100, 50 + (last / ma - 1) * 600)) : 50;
    const score = Math.round(0.4 * vixScore + 0.35 * rsi + 0.25 * trendScore);
    const label = score <= 20 ? "Extreme Fear" : score <= 40 ? "Fear" : score <= 60 ? "Neutral" : score <= 80 ? "Greed" : "Extreme Greed";
    const color = score <= 20 ? "#e03131" : score <= 40 ? "#f08c00" : score <= 60 ? "#b8a100" : score <= 80 ? "#5aa73c" : "#089981";
    const angle = -90 + score * 1.8;
    const html = '<div class="mood-wrap"><svg class="mood-gauge" viewBox="0 0 200 112">' +
      '<path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="var(--line)" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="' + color + '" stroke-width="13" stroke-linecap="round" pathLength="100" stroke-dasharray="' + score + ' 100"/>' +
      '<line x1="100" y1="100" x2="100" y2="38" stroke="' + color + '" stroke-width="3" stroke-linecap="round" transform="rotate(' + angle + ' 100 100)"/>' +
      '<circle cx="100" cy="100" r="6" fill="' + color + '"/></svg>' +
      '<div class="mood-info"><div class="mood-score" style="color:' + color + '">' + score + ' · ' + label + '</div>' +
      '<p class="price-meta">India VIX <b>' + vix.toFixed(2) + '</b> · NIFTY RSI(14) <b>' + rsi.toFixed(0) + '</b>' + (ma ? ' · NIFTY <b>' + (last >= ma ? "above" : "below") + '</b> its 200-day average' : '') + '</p>' +
      '<p class="price-meta">A mood reading from free data — not investment advice.</p></div></div>';
    moodCache = { ts: Date.now(), html: html };
    box.innerHTML = html;
  } catch (e) { /* mood is best-effort */ }
  moodBusy = false;
}

/* ---------- live engine: market pill, 25s auto-tick, price flash ---------- */
function marketOpenIST() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 555 && mins <= 930;
}
function updateMktPill() {
  const pill = $("mktPill"), bar = $("mktBar");
  if (!pill || !bar) return;
  if (!currentUser) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  const open = marketOpenIST();
  pill.textContent = open ? "🟢 NSE LIVE · Auto-updating" : "⚪ Market Closed · EOD Prices";
  pill.classList.toggle("live", open);
}
let lastScrollAt = 0;
window.addEventListener("scroll", () => { lastScrollAt = Date.now(); }, { passive: true });
/* v100: soft price paint \u2014 the auto tick updates prices IN PLACE (price texts,
   dashboard totals, movers) instead of re-rendering the whole view, so the screen
   never rebuilds itself every minute. Manual Refresh stays a full render. */
function softPricePaint() {
  document.querySelectorAll("[data-pflash]").forEach(el => {
    const pr = prices[el.dataset.pflash]; if (!pr || !isFinite(pr.price)) return;
    const wp = el.querySelector(".wp-price");
    if (wp) { wp.textContent = inr2(pr.price); return; }
    if (/^LTP/.test(el.textContent || "")) el.textContent = "LTP " + inr2(pr.price);
  });
  const g = $("topGainers"), l = $("topLosers");
  if (!g || !l || typeof enriched !== "function") return;
  const d = enriched(); if (!d.rows.length) return;
  try {
    animNum($("stInvested"), d.invested, moneyFmt);
    animNum($("stValue"), d.value, moneyFmt);
    animNum($("stPnl"), d.totalPnl, moneyFmt);
    const sp = $("stPnl"); if (sp) sp.className = "stat-value " + (d.totalPnl >= 0 ? "gain" : "loss");
    const spp = $("stPnlPct");
    if (spp) { spp.textContent = pct(d.invested ? d.totalPnl / d.invested * 100 : 0) + " overall \u00b7 today " + moneyFmt(d.dayPnl); spp.className = "stat-sub " + (d.dayPnl >= 0 ? "gain" : "loss"); }
    const sx = $("stXirr"); if (sx) { const x = portfolioXirr(d.value); sx.textContent = x === null ? "\u2014" : pct(x * 100).replace("+", x >= 0 ? "+" : ""); }
    const sr = $("stRealised"); if (sr) sr.textContent = "Booked profit so far: " + inr(d.realisedTotal) + (d.divTotal ? " \u00b7 Dividends: " + inr(d.divTotal) : "");
  } catch (e) {}
  const sorted = [...d.rows].filter(r_ => r_.ltp !== null);
  const gainers = [...sorted].sort((a, b) => b.pnlPct - a.pnlPct).filter(r_ => r_.pnlPct > 0).slice(0, 3);
  const losers = [...sorted].sort((a, b) => a.pnlPct - b.pnlPct).filter(r_ => r_.pnlPct < 0).slice(0, 3);
  g.innerHTML = gainers.length ? gainers.map(r_ => `<li><span>${esc(r_.sym)}</span><b class="gain">${pct(r_.pnlPct)}</b></li>`).join("") : "<li><span>\u2014</span></li>";
  l.innerHTML = losers.length ? losers.map(r_ => `<li><span>${esc(r_.sym)}</span><b class="loss">${pct(r_.pnlPct)}</b></li>`).join("") : "<li><span>\u2014</span></li>";
}
async function doTick(soft) {
  if (!currentUser || typeof refreshPrices !== "function") return;
  const stockOpen = (() => { const m = $("stockModal"); return m && !m.classList.contains("hidden"); })();
  if (stockOpen) return; /* modal open: pause all background polling, the opened stock owns the network */
  if (soft) window.__folioSoftTick = true;
  const modalOpen = ["txnModal", "totpModal", "helpModal"].some(id => { const m = $(id); return m && !m.classList.contains("hidden"); });
  if (modalOpen) { try { await refreshPrices(); } catch (e) {} window.__folioSoftTick = false; return; }
  if (Date.now() - lastScrollAt < 500) { window.__folioSoftTick = false; setTimeout(() => { try { doTick(soft); } catch (e) {} }, 650); return; }
  const before = {};
  Object.keys(prices || {}).forEach(k => { if (prices[k]) before[k] = prices[k].price; });
  await refreshPrices();
  window.__folioSoftTick = false;
  Object.keys(prices || {}).forEach(sym => {
    const old = before[sym], now = prices[sym] && prices[sym].price;
    if (old === undefined || now === undefined || now === old) return;
    const cls = now > old ? "price-flash-up" : "price-flash-down";
    document.querySelectorAll('[data-pflash="' + sym + '"]').forEach(el => {
      el.classList.remove("price-flash-up", "price-flash-down", "flash-up", "flash-down");
      void el.offsetWidth;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 1200);
    });
  });
  const tm = $("tickMeta");
  if (tm) tm.textContent = "Ticked " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  tickerLoadedAt = 0;
  try { loadTicker(); } catch (e) {}
}
setInterval(() => { updateMktPill(); if (marketOpenIST() && currentUser && !document.hidden) doTick(true); }, 60000);

/* ---------- Yahoo search top-up for autocomplete (beyond the built-in list) ---------- */
window.__yahooSuggest = async function (q) {
  try {
    let j = null;
    try { j = await fetchViaProxies("https://query2.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(q) + "&quotesCount=10&newsCount=0", true); } catch (e) {}
    if (!j || !j.quotes) { try { j = await fetchViaProxies("https://query1.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(q) + "&quotesCount=20&newsCount=0", true); } catch (e) {} }
    const out = [];
    ((j && j.quotes) || []).forEach(x => {
      if (!x || !x.symbol || x.quoteType !== "EQUITY") return;
      if (x.exchange && !["NSI", "NSE", "BSE"].includes(x.exchange)) return;
      const base = String(x.symbol).replace(/\.(NS|BO)$/i, "");
      if (!/^[A-Z0-9&.-]+$/.test(base)) return;
      out.push([base, x.longname || x.shortname || base, "Other", x.exchange === "BSE" ? "BSE" : "NSE", 1]);
    });
    return out.slice(0, 6);
  } catch (e) { return []; }
};

/* ---------- keyboard shortcuts + bottom nav (desktop & phone chrome) ---------- */
document.addEventListener("keydown", e => {
  if (!currentUser) return;
  const tag = (e.target && e.target.tagName) || "";
  const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
  if (e.key === "Escape") {
    document.querySelectorAll(".modal:not(.hidden)").forEach(m => m.classList.add("hidden"));
    document.querySelectorAll(".hold-card.open").forEach(c => c.classList.remove("open"));
    return;
  }
  if (typing) return;
  const anyModal = document.querySelector(".modal:not(.hidden)");
  if (anyModal) return;
  if (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
    e.preventDefault();
    switchView("watchlist");
    setTimeout(() => { const i = $("watchInput"); if (i) i.focus(); }, 60);
  } else if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "a") {
    if (typeof openTxn === "function") openTxn("BUY");
  } else if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
    const views = ["dashboard", "holdings", "insights", "news", "watchlist", "profile"];
    switchView(views[Number(e.key) - 1]);
  } else if (e.key.toLowerCase() === "m") {
    const pb = $("privacyBtn");
    if (pb) pb.click();
  }
});
function dockPillSync() {
  try {
    const cap = document.querySelector(".samsung-bottom-capsule"); if (!cap) return;
    const act = cap.querySelector("[data-bnav].active");
    let pill = cap.querySelector(".dock-pill");
    if (!act) { if (pill) pill.style.opacity = "0"; return; }
    if (!pill) { pill = document.createElement("span"); pill.className = "dock-pill"; pill.setAttribute("aria-hidden", "true"); cap.insertBefore(pill, cap.firstChild); }
    pill.style.width = act.offsetWidth + "px"; pill.style.height = act.offsetHeight + "px";
    pill.style.transform = "translate(" + act.offsetLeft + "px," + act.offsetTop + "px)";
    pill.style.opacity = "1";
  } catch (e) {}
}
window.addEventListener("resize", () => dockPillSync());
setInterval(() => {
  if (!currentUser || document.hidden) return;
  if (window.__bnavSeen === folioView) return;
  window.__bnavSeen = folioView;
  document.querySelectorAll("[data-bnav]").forEach(b => b.classList.toggle("active", b.dataset.bnav === folioView));
  dockPillSync();
}, 1000);
/* Bottom dock + top strip navigation: ONE delegated listener on the document,
   so the buttons work no matter where the dock HTML sits in the page. */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-bnav]");
  if (b) { switchView(b.dataset.bnav); document.querySelectorAll("[data-bnav]").forEach(x => x.classList.toggle("active", x === b)); requestAnimationFrame(() => dockPillSync()); }
});

/* ---------- LW chart state (declared before the controls IIFE below) ---------- */
let lwState = { type: "candles", ema: true, sma: false, vol: true };
try { Object.assign(lwState, JSON.parse(localStorage.getItem("folio_lw") || "{}")); } catch (e) {}
function lwSave() { try { localStorage.setItem("folio_lw", JSON.stringify(lwState)); } catch (e) {} }

/* ---------- LW chart controls ---------- */
(function wireLwControls() {
  const seg = $("lwTypeSeg");
  if (seg) {
    seg.querySelectorAll("[data-lwt]").forEach(b => {
      b.classList.toggle("active", b.dataset.lwt === lwState.type);
      b.addEventListener("click", () => {
        lwState.type = b.dataset.lwt; lwSave();
        seg.querySelectorAll("[data-lwt]").forEach(x => x.classList.toggle("active", x === b));
        renderLW();
      });
    });
  }
  const ema = $("lwEma"), sma = $("lwSma"), vol = $("lwVol");
  if (ema) { ema.checked = !!lwState.ema; ema.addEventListener("change", () => { lwState.ema = ema.checked; lwSave(); renderLW(); }); }
  if (sma) { sma.checked = !!lwState.sma; sma.addEventListener("change", () => { lwState.sma = sma.checked; lwSave(); renderLW(); }); }
  if (vol) { vol.checked = !!lwState.vol; vol.addEventListener("change", () => { lwState.vol = vol.checked; lwSave(); renderLW(); }); }
  const rst = $("lwReset");
  if (rst) rst.addEventListener("click", () => { if (lwChart) lwChart.timeScale().fitContent(); });
  const rb = $("liveRefreshBtn");
  if (rb) rb.addEventListener("click", () => doTick(false));

})();

let lwLibPromise = null;
function ensureLWLib() {
  /* The chart library is vendored in the repo (assets/lightweight-charts.*);
     there is deliberately no CDN fallback — the CSP allows only own scripts. */
  if (window.LightweightCharts) return Promise.resolve(true);
  return Promise.resolve(false);
}

/* ---------- TradingView Lightweight Charts engine (modal pro chart) ---------- */
let lwChart = null, lwSeries = null;
let lwTok = 0; /* chart paint token: only the newest open may paint */
function lwDispose() { if (lwChart) { try { lwChart.remove(); } catch (e) {} lwChart = null; lwSeries = null; } }
function dayStr(t) { return new Date(t).toISOString().slice(0, 10); }
/* Sanitise Yahoo OHLCV: Lightweight Charts dies silently on null/NaN values,
   duplicate timestamps or unsorted data — clean everything before it is used. */
function cleanOHLC(tsArr, q0, byDay) {
  const seen = new Set();
  const out = [];
  const opens = (q0 && q0.open) || [], highs = (q0 && q0.high) || [], lows = (q0 && q0.low) || [], closes = (q0 && q0.close) || [], vols = (q0 && q0.volume) || [];
  for (let i = 0; i < (tsArr || []).length; i++) {
    const t = Number(tsArr[i]);
    const c = Number(closes[i]);
    if (!Number.isFinite(t) || !Number.isFinite(c) || c <= 0) continue;
    const dayKey = byDay === false ? String(t) : new Date(t * 1000).toISOString().slice(0, 10);
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    const o = Number.isFinite(Number(opens[i])) && Number(opens[i]) > 0 ? Number(opens[i]) : c;
    const h = Number.isFinite(Number(highs[i])) && Number(highs[i]) > 0 ? Math.max(Number(highs[i]), o, c) : Math.max(o, c);
    const l = Number.isFinite(Number(lows[i])) && Number(lows[i]) > 0 ? Math.min(Number(lows[i]), o, c) : Math.min(o, c);
    const v = Number.isFinite(Number(vols[i])) && Number(vols[i]) >= 0 ? Number(vols[i]) : 0;
    out.push({ t: t * 1000, o: o, h: h, l: l, c: c, v: v });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
async function fetchOHLC(sym, range, interval) {
  const key = "folio_ohlc_" + sym + "|" + range;
  const cached = lsCacheGet(key, 12 * 3600 * 1000);
  if (cached && cached.bars && cached.bars.length) return cached.bars;
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(normalizeTicker(sym)) + "?range=" + range + "&interval=" + interval + "&events=div,split";
  let r0 = null;
  try { r0 = await fetchChartValidated(url, 7000); } catch (e) { r0 = null; }
  if (!r0 || !r0.indicators) return [];
  const q0 = (r0.indicators.quote && r0.indicators.quote[0]) || {};
  const bars = cleanOHLC(r0.timestamp || [], q0);
  lsCacheSet(key, { ts: Date.now(), bars: bars });
  return bars;
}
async function renderLW() {
  const wrap = $("lwWrap"), bar = $("lwBar"), svgBox = $("stockChart"), legend = $("lwLegend");
  if (!wrap || !bar) return;
  const off = () => { wrap.classList.add("hidden"); bar.classList.add("hidden"); if (legend) legend.classList.add("hidden"); if (svgBox) svgBox.classList.remove("hidden"); lwDispose(); };
  if (!stockSym) return off();
  const mySym = stockSym, myTok = ++lwTok;
  if (!window.LightweightCharts) { const okLib = await ensureLWLib(); if (!okLib) return off(); if (myTok !== lwTok || stockSym !== mySym) return; }
  if (["1d5m", "5d15m", "5d1h"].includes(stockRange)) return off();
  let bars = null, fullCloses = null;
  const DAILY = { "7d15m": 7, "1mo": 31, "3mo": 92, "6mo": 183, "1y": 366 };
  if (DAILY[stockRange]) {
    const mst = await fetchMaster(mySym);
    if (!mst || !mst.ohlc || mst.ohlc.length < 2) return off();
    fullCloses = mst.points.map(p => ({ t: p.t, c: p.c }));
    bars = stockRange === "1y" ? mst.ohlc : mst.ohlc.filter(b => b.t >= Date.now() - DAILY[stockRange] * 86400000);
  } else {
    try { bars = await fetchOHLC(mySym, stockRange === "5y" ? "5y" : "max", stockRange === "5y" ? "1wk" : "1mo"); } catch (e) { return off(); }
    if (!bars || bars.length < 2) return off();
    fullCloses = bars.map(b => ({ t: b.t, c: b.c }));
  }
  /* root fix for "previous stock's chart": if a newer open happened while
     this data was loading, this paint belongs to an old stock — drop it. */
  if (myTok !== lwTok || stockSym !== mySym) return;
  const modal = $("stockModal");
  if (!modal || modal.classList.contains("hidden")) return;
  const byDay = new Map();
  bars.forEach(b => byDay.set(dayStr(b.t), b));
  const ubars = [...byDay.values()].sort((a, b) => a.t - b.t);
  if (ubars.length < 2) return off();
  wrap.classList.remove("hidden"); bar.classList.remove("hidden");
  if (legend) legend.classList.remove("hidden");
  if (svgBox) svgBox.classList.add("hidden");
  if (wrap.clientWidth < 40) await new Promise(r => requestAnimationFrame(r));
  try {
  lwDispose();
  const dark = document.documentElement.dataset.theme !== "light";
  lwChart = LightweightCharts.createChart(wrap, {
    layout: { background: { type: "solid", color: "transparent" }, textColor: dark ? "#e8e8e8" : "#222222" },
    grid: { vertLines: { color: "rgba(128,128,128,.14)" }, horzLines: { color: "rgba(128,128,128,.14)" } },
    timeScale: { borderVisible: false }, rightPriceScale: { borderVisible: false },
    crosshair: { mode: 1 }, width: wrap.clientWidth || 320, height: 320, autoSize: true
  });
  const data = ubars.map(b => ({ time: dayStr(b.t), open: b.o, high: b.h, low: b.l, close: b.c }));
  if (lwState.type === "area") {
    lwSeries = lwChart.addAreaSeries({ lineColor: "#2962ff", topColor: "rgba(41,98,255,.35)", bottomColor: "rgba(41,98,255,0)", lineWidth: 2 });
    lwSeries.setData(ubars.map(b => ({ time: dayStr(b.t), value: b.c })));
  } else if (lwState.type === "bars") {
    lwSeries = lwChart.addBarSeries({ upColor: "#089981", downColor: "#f23645" });
    lwSeries.setData(data);
  } else {
    lwSeries = lwChart.addCandlestickSeries({ upColor: "#089981", downColor: "#f23645", borderVisible: false, wickUpColor: "#089981", wickDownColor: "#f23645" });
    lwSeries.setData(data);
  }
  if (lwState.vol) {
    const vs = lwChart.addHistogramSeries({ priceScaleId: "", priceFormat: { type: "volume" } });
    lwChart.priceScale("").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    vs.setData(ubars.map(b => ({ time: dayStr(b.t), value: b.v, color: b.c >= b.o ? "rgba(8,153,129,.45)" : "rgba(242,54,69,.45)" })));
  }
  const closes = fullCloses.map(p => p.c);
  const firstDay = dayStr(ubars[0].t);
  const lineData = series => fullCloses.map((p, i) => series[i] ? { time: dayStr(p.t), value: series[i] } : null).filter(x => x && x.time >= firstDay);
  if (lwState.ema) { const d = lineData(emaSeries(closes, 20)); if (d.length) lwChart.addLineSeries({ color: "#2962ff", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(d); }
  if (lwState.sma) { const d = lineData(smaSeries(closes, 200)); if (d.length) lwChart.addLineSeries({ color: "#ff6d00", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(d); }
  const marks = [];
  (state.txns || []).filter(t => t.sym === stockSym && t.type !== "DIV").forEach(t => marks.push({ time: t.date, position: t.type === "BUY" ? "belowBar" : "aboveBar", color: t.type === "BUY" ? "#089981" : "#f23645", shape: t.type === "BUY" ? "arrowUp" : "arrowDown", text: t.type + " @ " + inr2(t.price) }));
  if (marks.length && lwSeries.setMarkers) { marks.sort((a, b) => a.time < b.time ? -1 : 1); try { lwSeries.setMarkers(marks); } catch (e) {} }
  lwChart.timeScale().fitContent();
  try { let hi = -Infinity, lo = Infinity; ubars.forEach(b => { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); }); if (hi > lo && lwSeries.createPriceLine) { lwSeries.createPriceLine({ price: hi, color: "rgba(8,153,129,.55)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "52W H" }); lwSeries.createPriceLine({ price: lo, color: "rgba(242,54,69,.55)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "52W L" }); } } catch (e) {}
  const barByDay = {}, idxByDay = {};
  ubars.forEach((b, i) => { barByDay[dayStr(b.t)] = b; idxByDay[dayStr(b.t)] = i; });
  lwChart.subscribeCrosshairMove(param => {
    const lg = $("lwLegend");
    if (!lg) return;
    if (!param || !param.time || !barByDay[param.time]) { lg.textContent = "TradingView chart · drag to pan · scroll / pinch to zoom"; return; }
    const b = barByDay[param.time];
    const ix = idxByDay[param.time] || 0, pc = ix > 0 ? ubars[ix - 1].c : b.o, chg = pc ? (b.c - pc) / pc * 100 : 0;
    lg.textContent = param.time + " · O " + inr2(b.o) + " · H " + inr2(b.h) + " · L " + inr2(b.l) + " · C " + inr2(b.c) + " · " + (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" + (b.v ? " · Vol " + b.v.toLocaleString("en-IN") : "");
  });
  } catch (e) { return off(); }
  if (legend) legend.textContent = "TradingView chart · drag to pan · scroll / pinch to zoom";
}
const _drawStockBase = drawStock;
drawStock = async function () { await _drawStockBase(); try { await renderTA(); } catch (e) {} };

/* ---------- report issue ---------- */
const WEB3_KEY = "94e01d94-8fae-4cdc-b9b9-716cf169d7dc";
function renderIssueDiag() {
  const box = $("issueDiagList"); if (!box) return;
  const log = window.__folioErrLog || [];
  box.textContent = log.length ? log.slice().reverse().map(en => String(en.t).slice(11, 19) + " \u00b7 " + en.kind + " \u00b7 " + en.message + (en.source ? " (" + en.source + ")" : "")).join("\n") : "No errors recorded this session.";
}
function openIssue() {
  $("issueModal").classList.remove("hidden");
  renderIssueDiag();
  if (currentUser && !$("issueEmail").value) $("issueEmail").value = currentUser.email;
  if (currentUser && currentUser.name && !$("issueName").value) $("issueName").value = currentUser.name;
}
async function submitIssue(e) {
  e.preventDefault();
  const err = $("issueError");
  err.textContent = "Sending…";
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        access_key: WEB3_KEY,
        from_name: "Folio — Issue Report",
        subject: "Folio App Issue Report",
        name: $("issueName").value.trim(),
        email: $("issueEmail").value.trim(),
        message: $("issueMsg").value.trim(),
        diagnostics: JSON.stringify(window.__folioErrLog || []).slice(0, 3000),
        page: location.href
      })
    });
    const j = await res.json();
    if (j && j.success) {
      err.textContent = "";
      $("issueMsg").value = "";
      $("issueModal").classList.add("hidden");
      toast("Report sent — thank you. It is in the Singh Caizen inbox.");
    } else { err.textContent = "Could not send right now. Please email singhcaizen@outlook.in instead."; }
  } catch (ex) { err.textContent = "Could not send right now. Please email singhcaizen@outlook.in instead."; }
}

/* ---------- v4 wiring ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $("issueBtn").addEventListener("click", openIssue);
  $("settingsIssueBtn").addEventListener("click", openIssue);
  $("footIssue").addEventListener("click", e => { e.preventDefault(); openIssue(); });
  $("issueClose").addEventListener("click", () => $("issueModal").classList.add("hidden"));
  $("issueModal").addEventListener("click", e => { if (e.target === $("issueModal")) $("issueModal").classList.add("hidden"); });
  $("issueForm").addEventListener("submit", submitIssue);
  const dcBtn = $("issueDiagCopy");
  if (dcBtn) dcBtn.addEventListener("click", async () => {
    const log = window.__folioErrLog || [];
    const txt = log.length ? JSON.stringify(log, null, 1) : "No errors recorded this session.";
    try { await navigator.clipboard.writeText(txt); toast("Diagnostics copied"); }
    catch (e) { toast("Copy is not available in this browser"); }
  });
  $("stockClose").addEventListener("click", () => $("stockModal").classList.add("hidden"));
  const aboutCloseBtn = $("aboutClose"); if (aboutCloseBtn) aboutCloseBtn.addEventListener("click", () => { const am = $("aboutModal"); if (am) am.classList.add("hidden"); });
  $("stockModal").addEventListener("click", e => { if (e.target === $("stockModal")) $("stockModal").classList.add("hidden"); });
  document.querySelectorAll("#stockSeg .seg-btn").forEach(b => b.addEventListener("click", () => {
    stockRange = b.dataset.r;
    document.querySelectorAll("#stockSeg .seg-btn").forEach(x => x.classList.toggle("active", x === b));
    drawStock();
  }));
  document.querySelectorAll("#perfSeg .seg-btn").forEach(b => b.addEventListener("click", () => {
    perfRange = b.dataset.r;
    document.querySelectorAll("#perfSeg .seg-btn").forEach(x => x.classList.toggle("active", x === b));
    perfKey = "";
    renderPerf(enriched());
  }));
  document.querySelectorAll("[data-foot-view]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    switchView(a.dataset.footView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  const gf = $("gateForgot");
  if (gf) gf.addEventListener("click", async e => {
    e.preventDefault();
    await doLogout();
    toast("On the login screen, tap \u201CForgot password?\u201D to reset it by email.");
  });
});

/* ---------- insights: Moneycontrol-style assets, portfolio score, signals, market cap ---------- */
let insKey = "", insCapFilter = "All", insLastD = null;
let insDiv = null, insMom = null, insRisk = null, insQual = null, insPer = null;
function capOf(sym) { return (window.CAP_MAP && window.CAP_MAP[sym]) || "S"; }
function CAP_CLASS(sym) { return capOf(sym); }
function capLabel(c) { return c === "L" ? "Large Cap" : c === "M" ? "Mid Cap" : "Small Cap"; }
function trendBadge(ret) {
  if (ret === null || ret === undefined) return '<span class="trend-badge tb-flat">No data</span>';
  if (ret >= 15) return '<span class="trend-badge tb-up">▲▲ Very Bullish</span>';
  if (ret >= 5) return '<span class="trend-badge tb-up">▲ Bullish</span>';
  if (ret > -5) return '<span class="trend-badge tb-flat">→ Sideways</span>';
  if (ret > -15) return '<span class="trend-badge tb-down">▼ Bearish</span>';
  return '<span class="trend-badge tb-down">▼▼ Very Bearish</span>';
}
function updateGauge() {
  if (insMom === null && insRisk === null && insQual === null && typeof insDiv === "number") {
    $("insScoreNum").textContent = "…";
    const arc0 = $("insGaugeArc");
    if (arc0) { arc0.style.strokeDashoffset = String(326.7 * (1 - insDiv / 100)); arc0.style.stroke = "var(--muted)"; }
    return;
  }
  const parts = [insDiv, insMom, insRisk, insQual].filter(v => typeof v === "number");
  if (!parts.length) return;
  const total = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  $("insScoreNum").textContent = total;
  const arc = $("insGaugeArc");
  if (arc) {
    arc.style.strokeDashoffset = String(326.7 * (1 - total / 100));
    arc.style.stroke = total < 40 ? "#e03131" : "var(--text)";
  }
}
function renderInsights(d) {
  const A = $("insAssets");
  if (!A) return;
  insLastD = d;
  if (!d.rows.length) {
    A.innerHTML = '<p class="empty-note">Add stocks — your assets, score and signals will appear here.</p>';
    $("insDivBox").innerHTML = ""; $("insRiskBox").innerHTML = "";
    $("insMomBox").innerHTML = '<p class="empty-note">Nothing to score yet.</p>';
    $("insSignals").innerHTML = ""; $("insCapGrid").innerHTML = "";
    $("insScoreNum").textContent = "–";
    ["insDivScore", "insMomScore", "insRiskScore", "insQualScore"].forEach(id => { const e = $(id); if (e) { e.textContent = "–"; e.className = ""; } });
    const arc = $("insGaugeArc"); if (arc) arc.style.strokeDashoffset = "326.7";
    renderInsViz(d); renderInsPerf(d);
    insKey = ""; insDiv = insMom = insRisk = insQual = null;
    return;
  }
  const unPct = d.invested ? d.totalPnl / d.invested * 100 : 0;
  const prevValue = d.value - d.dayPnl;
  const dayPct = prevValue ? d.dayPnl / prevValue * 100 : 0;
  const gainCls = v => v >= 0 ? "gain" : "loss";
  A.innerHTML =
    '<div class="assets-grid">' +
    '<div class="assets-col"><span>Latest Value</span><b class="assets-big">' + moneyFmt(d.value) + '</b>' +
    '<span>Investment Cost</span><b class="assets-big">' + moneyFmt(d.invested) + '</b></div>' +
    '<div class="assets-col"><h4>Unrealized Gain</h4><span>Overall Gain</span>' +
    '<b class="' + gainCls(d.totalPnl) + '">' + (d.totalPnl >= 0 ? "▲ " : "▼ ") + moneyFmt(Math.abs(d.totalPnl)) + ' (' + pct(unPct) + ')</b>' +
    '<span>Today\'s Gain</span><b class="' + gainCls(d.dayPnl) + '">' + (d.dayPnl >= 0 ? "▲ " : "▼ ") + inr(Math.abs(d.dayPnl)) + ' (' + pct(dayPct) + ')</b></div>' +
    '<div class="assets-col"><h4>Realized Gain</h4><span>Capital Gain (booked)</span>' +
    '<b class="' + gainCls(d.realisedTotal) + '">' + inr(d.realisedTotal) + '</b>' +
    '<span>Other Gain (dividends)</span><b class="gain">' + inr(d.divTotal) + '</b></div>' +
    '</div>';

  /* diversification (sync) */
  const rows = [...d.rows].sort((a, b) => b.cur - a.cur);
  const wOf = r => d.value ? r.cur / d.value * 100 : 0;
  const hhi = rows.reduce((s, r) => s + Math.pow(wOf(r) / 100, 2), 0);
  const secMap = {};
  rows.forEach(r => { const k = r.sector || "Other"; secMap[k] = (secMap[k] || 0) + wOf(r); });
  const secs = Object.entries(secMap).sort((a, b) => b[1] - a[1]);
  const secHhi = secs.reduce((s, e) => s + Math.pow(e[1] / 100, 2), 0);
  const eff = hhi ? 1 / hhi : rows.length;
  insDiv = Math.max(0, Math.min(100, Math.round(50 * Math.min(1, (eff - 1) / 7) + 50 * (1 - secHhi))));
  $("insDivScore").textContent = insDiv;
  $("insDivScore").className = insDiv < 40 ? "loss" : "";
  const top3w = rows.slice(0, 3).reduce((s, r) => s + wOf(r), 0);
  const top3s = secs.slice(0, 3).reduce((s, e) => s + e[1], 0);
  let warn = "";
  if (rows[0] && wOf(rows[0]) > 20) warn += '<div class="warn-box"><b>Heavily Weighted!</b> Most of your money sits in one or more stocks — ' + esc(rows[0].sym) + ' alone is ' + wOf(rows[0]).toFixed(2) + '% of your portfolio.</div>';
  if (secs[0] && secs[0][1] > 35) warn += '<div class="warn-box"><b>Sector Struck!</b> One sector — ' + esc(secs[0][0]) + ' — carries ' + secs[0][1].toFixed(2) + '% of your money. A bad season for that sector hits the whole portfolio.</div>';
  if (!warn) warn = '<div class="ok-box"><b>Well Spread.</b> No single stock or sector dominates your portfolio.</div>';
  $("insDivBox").innerHTML =
    '<div class="insight-block"><h3>Diversification Score</h3>' +
    '<p class="insight-sub">A measure of concentration — how much of your money sits in a few stocks or in one sector. Higher means better spread.</p>' + warn +
    '<div class="insight-cols">' +
    '<div><h4>Top Stocks</h4>' + rows.slice(0, 3).map(r => '<div class="insight-row"><span>' + esc(r.name || r.sym) + '</span><b>' + wOf(r).toFixed(2) + '%</b></div>').join("") +
    '<div class="insight-row insight-total"><span>Combined weight of top 3 holdings</span><b>' + top3w.toFixed(2) + '%</b></div></div>' +
    '<div><h4>Top Sectors</h4>' + secs.slice(0, 3).map(e => '<div class="insight-row"><span>' + esc(e[0]) + '</span><b>' + e[1].toFixed(2) + '%</b></div>').join("") +
    '<div class="insight-row insight-total"><span>Combined weight of top 3 sectors</span><b>' + top3s.toFixed(2) + '%</b></div></div>' +
    '</div></div>';

  renderSignalsSync(d);
  renderCapGrid();
  renderInsViz(d);
  renderInsPerf(d);
  updateGauge();
  const key = rows.map(r => r.sym).join(",");
  if (key !== insKey) { insKey = key; loadInsScores(d); }
}
function renderSignalsSync(d) {
  const el = $("insSignals");
  if (!el) return;
  const rows = d.rows;
  const withDay = rows.filter(r => r.ltp !== null && r.prevClose).map(r => ({ r: r, p: (r.ltp - r.prevClose) / r.prevClose * 100 }));
  const movers = withDay.filter(x => Math.abs(x.p) >= 3).sort((a, b) => Math.abs(b.p) - Math.abs(a.p));
  let html = "";
  if (movers.length) html += '<div class="sig-group"><h4>Big movers today (3%+)</h4>' + movers.map(x => '<div class="insight-row"><span><b>' + esc(x.r.sym) + '</b> · ' + esc(x.r.name || "") + '</span><b class="' + (x.p >= 0 ? "gain" : "loss") + '">' + pct(x.p) + ' today</b></div>').join("") + '</div>';
  const drag = [...rows].sort((a, b) => a.pnl - b.pnl)[0];
  if (drag && drag.pnl < 0) html += '<div class="sig-group"><h4>Biggest drag</h4><div class="insight-row"><span><b>' + esc(drag.sym) + '</b> is pulling your portfolio down the most</span><b class="loss">' + inr(drag.pnl) + ' (' + pct(drag.pnlPct) + ')</b></div></div>';
  const star = [...rows].sort((a, b) => b.pnl - a.pnl)[0];
  if (star && star.pnl > 0) html += '<div class="sig-group"><h4>Top contributor</h4><div class="insight-row"><span><b>' + esc(star.sym) + '</b> is contributing the most profit</span><b class="gain">+' + inr(star.pnl) + ' (' + pct(star.pnlPct) + ')</b></div></div>';
  if (!html) html = '<p class="empty-note">No strong signal right now — movers and extremes will appear here as prices come in.</p>';
  el.innerHTML = html + '<div id="insSignalsAsync"></div>';
}
function renderCapGrid() {
  const d = insLastD, el = $("insCapGrid");
  if (!d || !el) return;
  const rows = [...d.rows].sort((a, b) => b.cur - a.cur).filter(r => insCapFilter === "All" || capOf(r.sym) === insCapFilter);
  if (!rows.length) { el.innerHTML = '<p class="empty-note">No ' + (insCapFilter === "All" ? "" : capLabel(insCapFilter) + " ") + 'stocks in your portfolio.</p>'; return; }
  el.innerHTML = rows.map(r => {
    const w = d.value ? r.cur / d.value * 100 : 0;
    const dayP = (r.ltp !== null && r.prevClose) ? (r.ltp - r.prevClose) / r.prevClose * 100 : null;
    return '<div class="cap-card"><div class="cap-card-top"><div><b>' + esc(r.name || r.sym) + '</b><span class="cap-sector">' + esc(r.sector || "") + ' · ' + capLabel(capOf(r.sym)) + '</span></div>' +
      '<div class="cap-price"><b>' + (r.ltp !== null ? inr2(r.ltp) : "—") + '</b>' + (dayP !== null ? '<span class="' + (dayP >= 0 ? "gain" : "loss") + '">' + pct(dayP) + '</span>' : '') + '</div></div>' +
      '<div class="cap-nums"><div><span>Latest Value</span>' + inr(r.cur) + '</div><div><span>Invested Value</span>' + inr(r.invested) + '</div><div><span>Weight</span>' + w.toFixed(2) + '%</div></div></div>';
  }).join("");
}
async function loadInsScores(d) {
  const rows = d.rows;
  const hists = await Promise.all(rows.map(r => fetchHistory(r.sym, "6mo")));
  if (!currentUser || !insLastD) return;
  const per = rows.map((r, i) => {
    const h = hists[i];
    let ret = null, vol = null, hi = null, lo = null;
    if (h && h.points.length > 5) {
      const cs = h.points.map(x => x.c);
      ret = cs[0] > 0 && cs[cs.length - 1] > 0 ? (cs[cs.length - 1] / cs[0] - 1) * 100 : null;
      const rets = [];
      for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0 && cs[k] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
      if (rets.length > 5) {
        const m = rets.reduce((a, b) => a + b, 0) / rets.length;
        vol = Math.sqrt(rets.reduce((a, b) => a + (b - m) * (b - m), 0) / rets.length) * Math.sqrt(252) * 100;
      }
      if (h.meta) { hi = h.meta.fiftyTwoWeekHigh; lo = h.meta.fiftyTwoWeekLow; }
    }
    return { r: r, ret: ret, vol: vol, hi: hi, lo: lo };
  });
  let momW = 0, momSum = 0, riskW = 0, riskSum = 0;
  per.forEach(p => {
    if (p.ret !== null) { momW += p.r.cur; momSum += Math.max(0, Math.min(100, 50 + p.ret * 2.5)) * p.r.cur; }
    if (p.vol !== null) { riskW += p.r.cur; riskSum += Math.max(0, Math.min(100, 110 - p.vol * 1.6)) * p.r.cur; }
  });
  insMom = momW ? Math.round(momSum / momW) : null;
  insRisk = riskW ? Math.round(riskSum / riskW) : null;
  /* Quality & Valuation (price-based estimate): 52-week strength (35%) +
     size stability by NSE cap class (25%) + volatility-adjusted trend (40%) */
  let qualW = 0, qualSum = 0;
  per.forEach(p => {
    if (!p.r.cur) return;
    const pos = (p.r.ltp && p.hi && p.lo && p.hi > p.lo) ? Math.max(0, Math.min(1, (p.r.ltp - p.lo) / (p.hi - p.lo))) : 0.5;
    const capBase = CAP_CLASS(p.r.sym) === "L" ? 88 : CAP_CLASS(p.r.sym) === "M" ? 64 : 42;
    const trendQ = (p.ret !== null && p.vol) ? Math.max(0, Math.min(100, 50 + (p.ret / p.vol) * 10)) : 50;
    const q = 0.35 * pos * 100 + 0.25 * capBase + 0.40 * trendQ;
    qualW += p.r.cur; qualSum += q * p.r.cur;
  });
  insQual = qualW ? Math.round(qualSum / qualW) : null;
  if (insMom !== null) { $("insMomScore").textContent = insMom; $("insMomScore").className = insMom < 40 ? "loss" : ""; }
  if (insRisk !== null) { $("insRiskScore").textContent = insRisk; $("insRiskScore").className = insRisk < 40 ? "loss" : ""; }
  if (insQual !== null && $("insQualScore")) { $("insQualScore").textContent = insQual; $("insQualScore").className = insQual < 40 ? "loss" : ""; }
  insPer = per;
  renderScatter(per, d);
  updateGauge();
  const wOf = r => d.value ? r.cur / d.value * 100 : 0;
  const ups = per.filter(p => p.ret !== null && p.ret > 5).sort((a, b) => b.ret - a.ret);
  const downs = per.filter(p => p.ret !== null && p.ret <= -5).sort((a, b) => a.ret - b.ret);
  const verdict = insMom === null ? "" : insMom >= 60
    ? '<div class="ok-box"><b>Alpha.</b> Stocks in your portfolio are in a strong uptrend over the last 6 months.</div>'
    : insMom >= 45
      ? '<div class="ok-box"><b>Mixed.</b> Some of your stocks are rising and some are falling — no single clear trend.</div>'
      : '<div class="warn-box"><b>Weak Trend.</b> Most of your money sits in stocks that have fallen over the last 6 months.</div>';
  $("insMomBox").innerHTML = '<div class="insight-block"><h3>Momentum Score</h3><p class="insight-sub">The price trend and technical strength of your portfolio, from each stock\'s last 6 months.</p>' + verdict +
    '<div class="insight-cols"><div><h4>Up Trending Stocks</h4>' + (ups.length ? ups.map(p => '<div class="insight-row"><span>' + esc(p.r.name || p.r.sym) + '</span>' + trendBadge(p.ret) + '<b>' + wOf(p.r).toFixed(2) + '%</b></div>').join("") : '<p class="empty-note">None right now.</p>') + '</div>' +
    '<div><h4>Down Trending Stocks</h4>' + (downs.length ? downs.map(p => '<div class="insight-row"><span>' + esc(p.r.name || p.r.sym) + '</span>' + trendBadge(p.ret) + '<b>' + wOf(p.r).toFixed(2) + '%</b></div>').join("") : '<p class="empty-note">None right now.</p>') + '</div></div></div>';
  const byVol = per.filter(p => p.vol !== null).sort((a, b) => b.vol - a.vol);
  if (byVol.length) {
    $("insRiskBox").innerHTML = '<div class="insight-block"><h3>Risk Score</h3><p class="insight-sub">How violently your stocks swing day to day (annual volatility). Calm stocks score high; wild swingers score low.</p>' +
      '<div class="insight-cols"><div><h4>Wildest Swingers</h4>' + byVol.slice(0, 3).map(p => '<div class="insight-row"><span>' + esc(p.r.name || p.r.sym) + '</span><b class="loss">' + p.vol.toFixed(0) + '% volatility</b></div>').join("") + '</div>' +
      '<div><h4>Calmest Holdings</h4>' + byVol.slice(-3).reverse().map(p => '<div class="insight-row"><span>' + esc(p.r.name || p.r.sym) + '</span><b>' + p.vol.toFixed(0) + '% volatility</b></div>').join("") + '</div></div></div>';
  }
  const sa = $("insSignalsAsync");
  if (sa) {
    let html = "";
    const nearHi = per.filter(p => p.hi && p.r.ltp && p.r.ltp >= p.hi * 0.95);
    const nearLo = per.filter(p => p.lo && p.r.ltp && p.r.ltp <= p.lo * 1.05);
    if (nearHi.length) html += '<div class="sig-group"><h4>Near 52-week high — strength zone</h4>' + nearHi.map(p => '<div class="insight-row"><span><b>' + esc(p.r.sym) + '</b> is trading close to its one-year high</span><b>' + inr2(p.r.ltp) + ' / high ' + inr2(p.hi) + '</b></div>').join("") + '</div>';
    if (nearLo.length) html += '<div class="sig-group"><h4>Near 52-week low — caution zone</h4>' + nearLo.map(p => '<div class="insight-row"><span><b>' + esc(p.r.sym) + '</b> is trading close to its one-year low</span><b class="loss">' + inr2(p.r.ltp) + ' / low ' + inr2(p.lo) + '</b></div>').join("") + '</div>';
    const favs = (state.watch || []).filter(w => w.fav).slice(0, 10);
    if (favs.length) {
      const fh = await Promise.all(favs.map(w => fetchHistory(w.sym, "1y")));
      const dips = [];
      favs.forEach((w, i) => {
        const h = fh[i], p = priceOf(w.sym);
        if (h && h.meta && h.meta.fiftyTwoWeekHigh && p) {
          const off = (1 - p.price / h.meta.fiftyTwoWeekHigh) * 100;
          if (off >= 10) dips.push({ w: w, off: off, price: p.price, hi: h.meta.fiftyTwoWeekHigh });
        }
      });
      if (dips.length) html += '<div class="sig-group"><h4>Watchlist dips — your ★ favourites, below their highs</h4>' + dips.sort((a, b) => b.off - a.off).map(x => '<div class="insight-row"><span><b>' + esc(x.w.sym) + '</b> · ' + esc(x.w.name || "") + '</span><b>' + inr2(x.price) + ' · ' + x.off.toFixed(0) + '% below high</b></div>').join("") + '<p class="price-meta">This is data, not a buy signal — a fallen stock is not automatically a good stock. Understand the reason before any decision.</p></div>';
    }
    sa.innerHTML = html;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const chips = $("insCapChips");
  if (chips) chips.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
    insCapFilter = c.dataset.cap;
    chips.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === c));
    renderCapGrid();
  }));
});

/* ---------- insights visuals: donuts, heatmap, portfolio graph ---------- */
function donutInto(svgEl, legendEl, items, centerLabel) {
  if (!svgEl || !legendEl) return;
  const total = items.reduce((s, x) => s + x.value, 0);
  if (!total) { svgEl.innerHTML = ""; legendEl.innerHTML = '<p class="empty-note">No data yet.</p>'; return; }
  const R = 80, C = 2 * Math.PI * R;
  let acc = 0, parts = "";
  items.forEach(x => {
    const frac = x.value / total;
    const len = Math.max(0, frac * C - 2);
    parts += '<circle cx="100" cy="100" r="' + R + '" fill="none" stroke="' + x.color + '" stroke-width="26" stroke-dasharray="' + len.toFixed(1) + ' ' + C.toFixed(1) + '" stroke-dashoffset="' + (-acc * C).toFixed(1) + '" transform="rotate(-90 100 100)"/>';
    acc += frac;
  });
  svgEl.innerHTML = parts +
    '<text x="100" y="95" text-anchor="middle" fill="var(--muted)" font-size="10.5" letter-spacing="1.5">' + centerLabel + '</text>' +
    '<text x="100" y="116" text-anchor="middle" fill="var(--text)" font-size="14.5" font-weight="bold">' + inr(total) + '</text>';
  legendEl.innerHTML = items.map(x => '<div class="donut-leg-row"><span class="donut-dot" style="background:' + x.color + '"></span><span class="donut-leg-name">' + esc(x.label) + '</span><b>' + (x.value / total * 100).toFixed(1) + '%</b></div>').join("");
}
function renderInsViz(d) {
  const s1 = $("insDonutStock");
  if (s1) {
    const items = [...d.rows].sort((a, b) => b.cur - a.cur).map((r, i) => ({ label: r.sym, value: r.cur, color: PIE[i % PIE.length] }));
    donutInto(s1, $("insDonutStockLegend"), items, "TOTAL VALUE");
    const secMap = {};
    d.rows.forEach(r => {
      const k = r.sector || "Other";
      if (!secMap[k]) secMap[k] = { label: k, value: 0, color: PIE[Object.keys(secMap).length % PIE.length] };
      secMap[k].value += r.cur;
    });
    donutInto($("insDonutSector"), $("insDonutSectorLegend"), Object.values(secMap).sort((a, b) => b.value - a.value), "BY SECTOR");
  }
  const heat = $("insHeat");
  if (heat) {
    if (!d.rows.length) { heat.innerHTML = '<p class="empty-note">Add stocks — the heatmap shows today\'s move of every holding at one glance.</p>'; return; }
    const rows = [...d.rows].sort((a, b) => b.cur - a.cur);
    heat.innerHTML = rows.map(r => {
      const dayPct = (r.ltp !== null && r.prevClose) ? (r.ltp - r.prevClose) / r.prevClose * 100 : null;
      let bg, fg;
      if (dayPct === null || Math.abs(dayPct) <= 0.01) { bg = "var(--panel-2)"; fg = "var(--text)"; }
      else if (dayPct > 0) { bg = "linear-gradient(135deg, #059669, #10b981)"; fg = "#ffffff"; }
      else { bg = "linear-gradient(135deg, #dc2626, #ef4444)"; fg = "#ffffff"; }
      const flex = Math.max(1, (d.value ? r.cur / d.value : 0) * 10).toFixed(2);
      return '<button type="button" class="heat-tile" data-heat2="' + esc(r.sym) + '" style="flex:' + flex + ' 1 100px;background:' + bg + ';color:' + fg + '">' +
        '<span class="heat-sym">' + esc(r.sym) + '</span>' +
        '<span class="heat-pct">' + (dayPct === null ? "—" : pct(dayPct) + " today") + '</span>' +
        '<span class="heat-val">' + inr(r.cur) + '</span></button>';
    }).join("");
    heat.querySelectorAll("[data-heat2]").forEach(b => b.addEventListener("click", () => openStock(b.dataset.heat2)));
  }
}
let insPerfRange = "6mo", insPerfKey = "";
async function renderInsPerf(d) {
  const box = $("insPerfBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — your portfolio graph will appear here.</p>'; $("insPerfMeta").textContent = ""; return; }
  const key = insPerfRange + "|" + d.rows.map(r => r.sym + ":" + r.qty).join(",");
  if (key === insPerfKey) return;
  insPerfKey = key;
  box.innerHTML = '<p class="empty-note">Building your graph…</p>';
  const hists = await Promise.all(d.rows.map(r => fetchHistory(r.sym, insPerfRange)));
  const series = {};
  const allTs = new Set();
  hists.forEach((h, i) => { if (h) { series[d.rows[i].sym] = new Map(h.points.map(p => [p.t, p.c])); h.points.forEach(p => allTs.add(p.t)); } });
  const ts = [...allTs].sort((a, b) => a - b);
  if (ts.length < 2) { box.innerHTML = '<p class="empty-note">Graph data could not load right now.</p>'; return; }
  const lastClose = {};
  const vals = ts.map(t => {
    let v = 0;
    d.rows.forEach(r => {
      const m = series[r.sym];
      if (m) { if (m.has(t)) lastClose[r.sym] = m.get(t); if (lastClose[r.sym]) v += r.qty * lastClose[r.sym]; }
    });
    return v;
  }).filter(v => v > 0);
  if (vals.length < 2) { box.innerHTML = '<p class="empty-note">Not enough data for a graph yet.</p>'; return; }
  box.innerHTML = lineChartSvg(vals, 200);
  const chg = (vals[vals.length - 1] - vals[0]) / vals[0] * 100;
  $("insPerfMeta").innerHTML = "Portfolio value: " + inr(vals[0]) + " → <b>" + inr(vals[vals.length - 1]) + "</b> · <span class=\"" + (chg >= 0 ? "gain" : "loss") + "\">" + pct(chg) + "</span> over this period (at today's quantities, approximate).";
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#insPerfSeg .seg-btn").forEach(b => b.addEventListener("click", () => {
    insPerfRange = b.dataset.r;
    document.querySelectorAll("#insPerfSeg .seg-btn").forEach(x => x.classList.toggle("active", x === b));
    insPerfKey = "";
    renderInsPerf(enriched());
  }));
});

/* ================================================================
   v14→v18 — company data, news, events, glossary
   Sources (all free, via the same public proxies as prices):
   - Yahoo v8 chart (single fetch): price history + meta + dividends/splits
   - rss2json / Yahoo search / Google News RSS: headlines
   Everything degrades honestly when a source is unavailable.
   ================================================================ */
/* Self-healing JSON fetch: races all proxies (3.5s each), validates the body
   is real JSON, and if every route is down, serves the last good response
   saved on this device — flagged so the UI can show a "cached data" note. */
let folioStaleAt = 0;
function urlKey(u) { let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0; return "folio_raw_" + (h >>> 0).toString(36); }
async function fetchViaProxies(url, asText) {
  /* Four diverse routes raced in parallel (4s cap each) — JSON-wrapped,
     raw and direct-proxy styles, so one blocked/busy route never stalls data. */
  const routes = [
    async u => { /* Folio's own Cloudflare Worker (first choice when configured) */
      if (!window.FOLIO_WORKER_URL) throw new Error("no worker");
      const r = await fetch(window.FOLIO_WORKER_URL + "?url=" + encodeURIComponent(u), { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error("bad route");
      const t = await r.text();
      if (!t) throw new Error("empty");
      if (asText) return t;
      const head = t.trim().charAt(0);
      if (head !== "{" && head !== "[") throw new Error("not json");
      return JSON.parse(t);
    },
    async u => { /* allorigins /get — JSON envelope with the body in .contents */
      const r = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(u), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("bad route");
      const env = await r.json();
      let t = env && env.contents;
      if (!t) throw new Error("empty");
      if (typeof t === "string" && t.indexOf("data:") === 0 && t.indexOf(";base64,") > 0) {
        try { t = decodeURIComponent(escape(atob(t.split(",")[1] || ""))); } catch (e) {}
      }
      if (asText) return t;
      const head = String(t).trim().charAt(0);
      if (head !== "{" && head !== "[") throw new Error("not json");
      return JSON.parse(t);
    },
    async u => {
      const r = await fetch("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("bad route");
      const t = await r.text();
      if (!t) throw new Error("empty");
      if (asText) return t;
      const head = t.trim().charAt(0);
      if (head !== "{" && head !== "[") throw new Error("not json");
      return JSON.parse(t);
    },
    async u => {
      const r = await fetch("https://corsproxy.io/?" + encodeURIComponent(u), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("bad route");
      const t = await r.text();
      if (!t) throw new Error("empty");
      if (asText) return t;
      const head = t.trim().charAt(0);
      if (head !== "{" && head !== "[") throw new Error("not json");
      return JSON.parse(t);
    },
    async u => {
      const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(u), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("bad route");
      const t = await r.text();
      if (!t) throw new Error("empty");
      if (asText) return t;
      const head = t.trim().charAt(0);
      if (head !== "{" && head !== "[") throw new Error("not json");
      return JSON.parse(t);
    }
  ];
  const attempts = routes.map(mk => mk(url));
  try {
    const out = await Promise.any(attempts);
    if (!asText) { try { localStorage.setItem(urlKey(url), JSON.stringify(out)); } catch (e) {} }
    return out;
  } catch (e) {
    if (!asText) {
      try {
        const saved = JSON.parse(localStorage.getItem(urlKey(url)) || "null");
        if (saved) { folioStaleAt = Date.now(); return saved; }
      } catch (e2) {}
    }
    return null;
  }
}
function staleNote() {
  return Date.now() - folioStaleAt < 45000 ? '<p class="price-meta">📦 Offline / Cached Data — the free sources are unreachable right now, so the last saved copy is being shown.</p>' : "";
}
function lsCk(key) {
  key = String(key);
  if (key.indexOf("folio_master_") === 0) return "folio_master_" + symHash(key.slice(13));
  if (key.indexOf("folio_ta_") === 0) { const rest = key.slice(9); const i = rest.indexOf("|"); return "folio_ta_" + (i > 0 ? symHash(rest.slice(0, i)) + rest.slice(i) : symHash(rest)); }
  if (key.indexOf("folio_news_") === 0) return "folio_news_" + symHash(key.slice(11));
  return key;
}
function lsCacheGet(key, ttlMs) {
  try {
    const o = JSON.parse(localStorage.getItem(lsCk(key)) || "null");
    if (o && Date.now() - o.ts < ttlMs) return o.data;
  } catch (e) {}
  return null;
}
function lsCacheSet(key, data) {
  try { localStorage.setItem(lsCk(key), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}
function relTime(tsMs) {
  const s = Math.max(1, Math.round((Date.now() - tsMs) / 1000));
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 30) return Math.round(s / 86400) + "d ago";
  return new Date(tsMs).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDate(ms) {
  if (ms == null || ms === "") return "—";
  const d = new Date(ms);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function crores(raw) {
  if (typeof raw !== "number" || !isFinite(raw)) return "—";
  return "₹" + Math.round(raw / 1e7).toLocaleString("en-IN") + " Cr";
}

/* ---------- company info (LOCAL ONLY — instant, never hangs) ----------
   Yahoo's v10 quoteSummary is crumb-blocked (401) without cookies, so Folio
   no longer calls it at all. Sector/industry come from the built-in NSE
   lists; result dates are detected from the news instead of a calendar API. */
async function fetchCompanyInfo(sym) {
  const sec = (window.INDUSTRY_MAP && window.INDUSTRY_MAP[sym]) || (window.FALLBACK_SECTOR && window.FALLBACK_SECTOR[sym]) || "";
  const metaStock = (window.STOCK_LIST || []).find(s => s[0] === sym);
  return { ok: true, sector: sec, industry: "", website: "", summary: "", nextEarnings: null, results: null, name: metaStock ? metaStock[1] : sym };
}

/* ---------- news (Yahoo search, Google News RSS fallback) ---------- */
async function fetchNews(query, count) {
  const ck = "folio_news_" + query.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const cached = lsCacheGet(ck, 15 * 60 * 1000);  /* Task C: 15-min news cache */
  if (cached) return cached;
  let items = [];
  /* Fast route first: rss2json (native CORS, no proxy) over Google News RSS */
  try {
    const rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " stock") + "&hl=en-IN&gl=IN&ceid=IN:en";
    const rj = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rssUrl), { signal: AbortSignal.timeout(3000) });
    if (rj.ok) {
      const jj = await rj.json();
      items = (jj.items || []).map(n => {
        let title = n.title || "", source = "Google News";
        const cut = title.lastIndexOf(" - ");
        if (cut > 12) { source = title.slice(cut + 3).trim() || source; title = title.slice(0, cut).trim(); }
        return { title: title, link: n.link, source: source, ts: Date.parse(n.pubDate || "") || 0 };
      }).filter(n => n.title && n.link).slice(0, count || 6);
    }
  } catch (e) {}
  if (!items.length) {
  const j = await fetchViaProxies("https://query2.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(query) + "&newsCount=" + (count || 6) + "&quotesCount=0", false);
  try {
    items = (j.news || []).map(n => ({ title: n.title, link: n.link, source: n.publisher || "News", ts: (n.providerPublishTime || 0) * 1000 })).filter(n => n.title && n.link && n.ts);
  } catch (e) {}
  if (!items.length) {
    const xml = await fetchViaProxies("https://news.google.com/rss/search?q=" + encodeURIComponent(query + " share") + "&hl=en-IN&gl=IN&ceid=IN:en", true);
    if (xml) {
      try {
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        items = [...doc.querySelectorAll("item")].slice(0, count || 6).map(it => ({
          title: (it.querySelector("title") || {}).textContent || "",
          link: (it.querySelector("link") || {}).textContent || "",
          source: ((it.querySelector("source") || {}).textContent || "Google News"),
          ts: Date.parse((it.querySelector("pubDate") || {}).textContent || "") || 0
        })).filter(n => n.title && n.link);
      } catch (e) {}
    }
  }
  }
  if (items.length) lsCacheSet(ck, items);
  return items;
}
function newsRowHtml(n, chipSym) {
  return '<div class="news-row">' +
    (chipSym ? '<span class="news-chip">' + esc(chipSym) + '</span>' : '') +
    '<a class="news-title" href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(n.title) + '</a>' +
    '<span class="news-meta">' + esc(n.source) + ' · ' + relTime(n.ts) + '</span></div>';
}

/* ---------- portfolio news (dashboard) ---------- */
let newsKey = "", newsBusy = false;
async function renderNews(d) {
  const box = $("newsList");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — news about your companies will appear here.</p>'; return; }
  const key = d.rows.map(r => r.sym).join(",");
  if (key === newsKey || newsBusy) return;
  newsKey = key; newsBusy = true;
  const top = [...d.rows].sort((a, b) => b.cur - a.cur).slice(0, 8);
  const per = await Promise.all(top.map(async r => {
    const items = await fetchNews(r.name || r.sym, 4);
    return items.map(n => ({ ...n, sym: r.sym }));
  }));
  newsBusy = false;
  const seen = new Set();
  const merged = per.flat().filter(n => {
    const k = n.title.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a, b) => b.ts - a.ts).slice(0, 12);
  if (!merged.length) {
    box.innerHTML = '<p class="empty-note">News could not be loaded right now — the free news sources are busy. It will retry when prices refresh.</p>';
    newsKey = "";
    return;
  }
  window.__newsItems = merged;
  box.innerHTML = staleNote() + merged.map(n => newsRowHtml(n, n.sym)).join("");
  try { folioNewsRender(); } catch (e) {}
}

/* ---------- results & announcements (dashboard + popup) ---------- */
let evKey = "", evBusy = false;
const RESULT_WORDS = /(result|quarter|q[1-4]\b|earnings|profit (up|down|rises|falls)|announce|dividend|board meeting|bonus|split)/i;
async function renderEvents(d) {
  const box = $("eventsBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — their result dates and announcements will appear here.</p>'; return; }
  const key = d.rows.map(r => r.sym).join(",");
  if (key === evKey || evBusy) return;
  evKey = key; evBusy = true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const infos = await Promise.all(d.rows.slice(0, 10).map(async r => ({ r: r, info: await fetchCompanyInfo(r.sym) })));
  const newsPer = await Promise.all(d.rows.slice(0, 8).map(async r => {
    const items = await fetchNews(r.name || r.sym, 4);
    return items.filter(n => RESULT_WORDS.test(n.title) && Date.now() - n.ts < 12 * 86400000).map(n => ({ ...n, sym: r.sym }));
  }));
  evBusy = false;
  const dated = [];
  infos.forEach(({ r, info }) => {
    if (info && info.ok && info.nextEarnings) {
      const days = Math.round((info.nextEarnings - today.getTime()) / 86400000);
      if (days >= -7 && days <= 60) dated.push({ sym: r.sym, name: r.name, date: info.nextEarnings, days: days });
    }
  });
  dated.sort((a, b) => a.date - b.date);
  const hits = newsPer.flat().sort((a, b) => b.ts - a.ts).slice(0, 6);
  if (!dated.length && !hits.length) {
    box.innerHTML = '<p class="empty-note">No result dates found for your stocks in the free data right now. When a company announces a date or a result makes the news, it will appear here — and pop up when you open Folio.</p>';
    return;
  }
  let html = "";
  dated.forEach(e => {
    const when = e.days < 0 ? "declared " + Math.abs(e.days) + "d ago" : e.days === 0 ? "expected TODAY" : e.days === 1 ? "expected tomorrow" : "in " + e.days + " days";
    html += '<div class="event-row"><span class="news-chip">' + esc(e.sym) + '</span><span class="event-text"><b>' + esc(e.name) + '</b> — quarterly results ' + when + ' · ' + fmtDate(e.date) + '</span></div>';
  });
  hits.forEach(n => { html += newsRowHtml(n, n.sym); });
  box.innerHTML = staleNote() + html;
  maybeEventPopup(dated, hits);
}
function maybeEventPopup(dated, hits) {
  const todayStr = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem("folio_evpop") === todayStr) return; } catch (e) {}
  const urgent = dated.filter(e => e.days >= -3 && e.days <= 7);
  const fresh = hits.filter(n => Date.now() - n.ts < 3 * 86400000);
  if (!urgent.length && !fresh.length) return;
  let html = "";
  urgent.forEach(e => {
    const when = e.days < 0 ? "declared " + Math.abs(e.days) + "d ago" : e.days === 0 ? "expected today" : "coming in " + e.days + " days";
    html += '<div class="event-row"><span class="news-chip">' + esc(e.sym) + '</span><span class="event-text"><b>' + esc(e.name) + '</b> — results ' + when + ' · ' + fmtDate(e.date) + '</span></div>';
  });
  fresh.slice(0, 4).forEach(n => { html += newsRowHtml(n, n.sym); });
  $("eventPopupBody").innerHTML = html;
  $("eventModal").classList.remove("hidden");
  const mark = () => { try { localStorage.setItem("folio_evpop", todayStr); } catch (e) {} };
  $("eventOk").onclick = () => { mark(); $("eventModal").classList.add("hidden"); };
  $("eventClose").onclick = () => { mark(); $("eventModal").classList.add("hidden"); };
}

/* ---------- quant helpers (RSI / EMA / SMA / pivots / volume) ---------- */
function emaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  if (vals.length < period) return out;
  const k = 2 / (period + 1);
  let e = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < vals.length; i++) { e = vals[i] * k + e * (1 - k); out[i] = e; }
  return out;
}
function smaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
    if (i >= period) sum -= vals[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function rsi14(closes) {
  if (!closes || closes.length < 15) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= 14; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d; }
  let ag = g / 14, al = l / 14;
  for (let i = 15; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * 13 + Math.max(d, 0)) / 14;
    al = (al * 13 + Math.max(-d, 0)) / 14;
  }
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}
function techBadges(master) {
  if (!master || !master.points || master.points.length < 15) return "";
  const closes = master.points.map(p => p.c);
  const last = closes[closes.length - 1];
  const chips = [];
  const rsi = rsi14(closes);
  if (rsi !== null) chips.push('<span class="tech-chip ' + (rsi < 30 ? "pos" : rsi > 70 ? "neg" : "") + '">RSI(14) ' + rsi.toFixed(0) + (rsi < 30 ? " · Oversold" : rsi > 70 ? " · Overbought" : " · Neutral") + "</span>");
  const ema = emaSeries(closes, 20), sma = smaSeries(closes, 200);
  const e20 = ema[ema.length - 1], s200 = sma[sma.length - 1];
  if (e20) chips.push('<span class="tech-chip ' + (last >= e20 ? "pos" : "neg") + '">' + (last >= e20 ? "Above" : "Below") + " 20 EMA</span>");
  if (s200) chips.push('<span class="tech-chip ' + (last >= s200 ? "pos" : "neg") + '">' + (last >= s200 ? "Above" : "Below") + " 200 SMA</span>");
  if (e20 && s200) chips.push('<span class="tech-chip ' + (e20 >= s200 ? "pos" : "neg") + '">' + (e20 >= s200 ? "Golden Cross structure" : "Bearish cross structure") + "</span>");
  const bars = master.ohlc || [];
  if (bars.length > 21) {
    const vols = bars.map(b => b.v || 0);
    const avg20 = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
    const lastVol = vols[vols.length - 1];
    if (avg20 > 0 && lastVol >= 1.5 * avg20) chips.push('<span class="tech-chip pos">🔥 High volume — ' + (lastVol / avg20).toFixed(1) + "× the 20-day average</span>");
    else if (avg20 > 0) chips.push('<span class="tech-chip">Volume ' + (lastVol / avg20).toFixed(1) + "× 20-day avg</span>");
  }
  return chips.length ? '<div class="tech-chips">' + chips.join("") + "</div>" : "";
}
function techHtml(master) {
  let html = techBadges(master);
  const bars = (master && master.ohlc) || [];
  if (bars.length) {
    const b = bars[bars.length - 1];
    const P = (b.h + b.l + b.c) / 3, R = b.h - b.l;
    html += '<p class="dr-line">Classic pivots (from the last session): S2 ' + inr2(P - R) + " · S1 " + inr2(2 * P - b.h) + " · <b>Pivot " + inr2(P) + "</b> · R1 " + inr2(2 * P - b.l) + " · R2 " + inr2(P + R) + "</p>";
  }
  return html ? '<div class="tech-box"><h4 class="company-h">Technicals — Auto Scanner</h4>' + html + "</div>" : "";
}

/* ---------- company sheet (inside the stock chart popup) ---------- */
let sheetToken = 0;
const _origOpenStock = openStock;
openStock = function (sym) {
  try { folioArm(sym); } catch (e) {}
  _origOpenStock(sym);
  loadCompanySheet(sym);
};
/* ---------- validated chart fetcher ----------
   fetch() does NOT reject on HTTP errors, and some proxies return HTTP 200
   with an error page or an empty body. So every attempt must PARSE the
   payload and prove it holds a real Yahoo chart (meta + live price) before
   it is allowed to win the race. */
function normalizeTicker(raw) {
  if (!raw) return "";
  let t = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  const aliases = { "NIFTY": "^NSEI", "NIFTY50": "^NSEI", "SENSEX": "^BSESN", "BANKNIFTY": "^NSEBANK" };
  if (aliases[t]) return aliases[t];
  if (t.startsWith("^") || t.endsWith(".NS") || t.endsWith(".BO")) return t;
  return t + ".NS";
}
function baseTicker(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
}
async function fetchChartValidated(targetUrl, timeoutMs) {
  const encoded = encodeURIComponent(targetUrl);
  const attempts = [
    async signal => {
      const r = await fetch("https://api.allorigins.win/raw?url=" + encoded, { signal: signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    },
    async signal => {
      const r = await fetch("https://api.allorigins.win/get?url=" + encoded, { signal: signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const wrap = await r.json();
      if (!wrap || !wrap.contents) throw new Error("Empty allorigins contents");
      let text = wrap.contents;
      if (text.indexOf("data:") === 0) {
        const b64 = text.split(",")[1] || "";
        text = decodeURIComponent(escape(atob(b64)));
      }
      return JSON.parse(text);
    },
    async signal => {
      const r = await fetch("https://api.codetabs.com/v1/proxy?quest=" + encoded, { signal: signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    },
    async signal => {
      const r = await fetch("https://corsproxy.io/?url=" + encoded, { signal: signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    }
  ];
  const ctls = [];
  const wrapped = attempts.map(async fn => {
    const ctl = new AbortController();
    ctls.push(ctl);
    const timer = setTimeout(() => ctl.abort(), timeoutMs || 6000);
    try {
      const data = await fn(ctl.signal);
      const result = data && data.chart && data.chart.result && data.chart.result[0];
      if (!result || !result.meta || typeof result.meta.regularMarketPrice !== "number") {
        throw new Error("Invalid Yahoo chart payload");
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  });
  try { return await Promise.any(wrapped); } finally { ctls.forEach(c => { try { c.abort(); } catch (e) {} }); }
}

/* ---------- single-fetch master engine (v8 chart powers the whole modal) ---------- */
const masterCache = {};
const masterInflight = {};
async function fetchMaster(sym) {
  if (masterInflight[sym]) return masterInflight[sym];
  const p = fetchMasterImpl(sym);
  masterInflight[sym] = p;
  try { return await p; } finally { delete masterInflight[sym]; }
}
async function fetchMasterImpl(sym) {
  const mc = masterCache[sym];
  if (mc && Date.now() - mc.ts < 6 * 3600 * 1000) return mc;
  let master = null;
  const saved = lsCacheGet("folio_master_" + sym, 6 * 3600 * 1000);
  if (saved && saved.meta) {
    const h = await fetchHistory(sym, "1y");
    master = { ts: saved.ts || Date.now(), meta: saved.meta, points: h ? h.points : [], ohlc: saved.ohlc || [], divs: saved.divs || [], splits: saved.splits || [] };
  } else {
    const norm = normalizeTicker(sym);
    const suffix = "?range=1y&interval=1d&events=div,split&includePrePost=false";
    const candidates = [
      "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(norm) + suffix,
      "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(norm) + suffix
    ];
    if (norm.endsWith(".NS")) candidates.push("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(baseTicker(sym) + ".BO") + suffix);
    let r0 = null;
    try { r0 = await Promise.any(candidates.map(u => fetchChartValidated(u, 6500))); } catch (e) { r0 = null; }
    try {
      if (!r0) throw new Error("no validated chart");
      const q0 = (r0.indicators.quote && r0.indicators.quote[0]) || {};
      const ohlc = cleanOHLC(r0.timestamp || [], q0);
      const points = ohlc.map(b => ({ t: b.t, c: b.c }));
      const ev = r0.events || {};
      const divs = ev.dividends ? Object.values(ev.dividends).map(x => ({ ts: x.date * 1000, amount: x.amount })).sort((a, b) => b.ts - a.ts) : [];
      const splits = ev.splits ? Object.values(ev.splits).map(x => ({ ts: x.date * 1000, text: x.splitRatio || (x.numerator + ":" + x.denominator) })).sort((a, b) => b.ts - a.ts) : [];
      if (points.length) {
        master = { ts: Date.now(), meta: r0.meta || {}, points: points, ohlc: ohlc, divs: divs, splits: splits };
        histCache[sym + "|1y"] = { points: points, meta: r0.meta || {} };
        histLsSet(sym + "|1y", histCache[sym + "|1y"]);
        lsCacheSet("folio_master_" + sym, { ts: master.ts, meta: master.meta, ohlc: ohlc, divs: divs, splits: splits });
      }
    } catch (e) {}
  }
  if (!master) {
    const h = await fetchHistory(sym, "1y");
    if (!h) return null;
    const ca = await fetchCorpActions(sym);
    master = { ts: Date.now(), meta: h.meta || {}, points: h.points, ohlc: [], divs: ca.divs, splits: ca.splits };
  }
  masterCache[sym] = master;
  return master;
}
function quantStats(points) {
  const cs = points.map(p => p.c);
  const last = cs[cs.length - 1];
  const ret1y = cs.length > 1 ? (last / cs[0] - 1) * 100 : null;
  const i6 = Math.max(0, cs.length - 127);
  const mom6 = cs.length > 20 ? (last / cs[i6] - 1) * 100 : null;
  let vol = null;
  const rets = [];
  for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0 && cs[k] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
  if (rets.length > 20) {
    const m = rets.reduce((a, b) => a + b, 0) / rets.length;
    vol = Math.sqrt(rets.reduce((a, b) => a + (b - m) * (b - m), 0) / rets.length) * Math.sqrt(252) * 100;
  }
  let peak = -Infinity, mdd = 0;
  cs.forEach(c => { if (c > peak) peak = c; if (peak > 0) mdd = Math.min(mdd, (c / peak - 1) * 100); });
  const sma = n => cs.length >= n ? cs.slice(-n).reduce((a, b) => a + b, 0) / n : null;
  return { ret1y: ret1y, mom6: mom6, vol: vol, mdd: mdd, sma20: sma(20), sma200: sma(200), last: last };
}
function sectorOf(sym) {
  return (window.INDUSTRY_MAP && window.INDUSTRY_MAP[sym]) || (window.FALLBACK_SECTOR && window.FALLBACK_SECTOR[sym]) || ((STOCK_MAP[sym] || {}).sector) || "";
}
function extButtonsHtml(sym) {
  return '<div class="qwrap">' +
    '<a class="mini-btn link-btn" href="https://www.nseindia.com/get-quotes/equity?symbol=' + encodeURIComponent(sym) + '" target="_blank" rel="noopener">View on NSE India ↗</a>' +
    '<a class="mini-btn link-btn" href="https://www.screener.in/company/' + encodeURIComponent(sym) + '/" target="_blank" rel="noopener">View on Screener.in ↗</a>' +
    '<a class="mini-btn link-btn" href="https://www.moneycontrol.com/stocks/cptmarket/compsearchnew.php?search_data=&cid=&mbsearch_str=&topsearch_type=1&search_str=' + encodeURIComponent(sym) + '" target="_blank" rel="noopener">Search on Moneycontrol ↗</a></div>';
}
function masterAboutHtml(sym, name, m) {
  const meta = m.meta || {};
  const q = quantStats(m.points);
  const price = meta.regularMarketPrice || q.last;
  /* Yesterday's close = the second-last daily point. (meta.chartPreviousClose
     on a 1y chart means the price a year ago, NOT yesterday — do not use it.) */
  const prev = m.points.length > 1 ? m.points[m.points.length - 2].c : null;
  const dayChg = price && prev ? (price - prev) / prev * 100 : null;
  const sec = sectorOf(sym);
  let html = '<p class="comp-line"><b>' + esc(meta.longName || meta.shortName || name) + '</b>' +
    (meta.fullExchangeName || meta.exchangeName ? ' · ' + esc(meta.fullExchangeName || meta.exchangeName) : ' · NSE') +
    (sec ? ' · ' + esc(sec) : '') + '</p>';
  if (meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow && price) {
    const pos = Math.max(0, Math.min(100, (price - meta.fiftyTwoWeekLow) / (meta.fiftyTwoWeekHigh - meta.fiftyTwoWeekLow) * 100));
    html += '<div class="rng-wrap"><div class="rng-labels"><span>' + inr2(meta.fiftyTwoWeekLow) + '</span><span>52-Week Range</span><span>' + inr2(meta.fiftyTwoWeekHigh) + '</span></div>' +
      '<div class="rng-track"><div class="rng-fill" style="width:' + pos.toFixed(1) + '%"></div><div class="rng-dot" style="left:' + pos.toFixed(1) + '%"></div></div></div>';
  }
  const chip = (label, val) => '<span class="qchip">' + label + ' <b>' + val + '</b></span>';
  let chips = "";
  if (price) chips += chip("Price", inr2(price));
  if (dayChg !== null) chips += chip("Today", '<span class="' + (dayChg >= 0 ? "gain" : "loss") + '">' + pct(dayChg) + '</span>');
  if (meta.regularMarketDayHigh) chips += chip("Day Range", inr2(meta.regularMarketDayLow) + " – " + inr2(meta.regularMarketDayHigh));
  if (meta.regularMarketVolume) chips += chip("Volume", Number(meta.regularMarketVolume).toLocaleString("en-IN"));
  if (q.ret1y !== null) chips += chip("1-Year Return", '<span class="' + (q.ret1y >= 0 ? "gain" : "loss") + '">' + pct(q.ret1y) + '</span>');
  if (q.mom6 !== null) chips += chip("6-Month Momentum", '<span class="' + (q.mom6 >= 0 ? "gain" : "loss") + '">' + pct(q.mom6) + '</span>');
  if (q.vol !== null) chips += chip("Volatility", q.vol.toFixed(1) + "% / yr");
  chips += chip("Max Drawdown (1Y)", '<span class="loss">' + q.mdd.toFixed(1) + '%</span>');
  if (q.sma200 && price) chips += chip("Trend", price >= q.sma200 ? '<span class="gain">Bullish · Above 200 DMA</span>' : '<span class="loss">Below 200 DMA</span>');
  else if (q.sma20 && price) chips += chip("Trend (20 DMA)", price >= q.sma20 ? "Above" : "Below");
  const divSum = m.divs.filter(x => Date.now() - x.ts < 365 * 86400000).reduce((a, x) => a + x.amount, 0);
  if (divSum && price) chips += chip("Dividend Yield (1Y)", (divSum / price * 100).toFixed(2) + "%");
  html += '<div class="qwrap">' + chips + '</div>';
  html += '<p class="price-meta">Live price, range and dividend data come from the open Yahoo Finance chart feed; returns, volatility, drawdown and averages are calculated in your browser from 1 year of daily prices. For full financial statements, use the Screener link below.</p>';
  return html;
}
function masterCorpHtml(m) {
  let html = "";
  m.divs.slice(0, 6).forEach(x => { html += '<div class="event-row"><span class="event-text"><b>Dividend ' + inr2(x.amount) + '/share</b> · ex-date ' + fmtDate(x.ts) + '</span></div>'; });
  m.splits.slice(0, 3).forEach(x => { html += '<div class="event-row"><span class="event-text"><b>Stock split ' + esc(x.text) + '</b> · ' + fmtDate(x.ts) + '</span></div>'; });
  return html || '<p class="empty-note">No dividends or splits in the last 12 months.</p>';
}

/* ---------- holdings drawer: live status (52w range, day range, volume) ---------- */
async function fillHoldDrawer(sym, drawer) {
  const box = drawer.querySelector(".dr-status");
  if (!box) return;
  if (box.dataset.ts && Date.now() - +box.dataset.ts < 60000 && box.innerHTML) return;
  box.dataset.ts = String(Date.now());
  const avg = Number(drawer.dataset.avg) || 0;
  const ltp = drawer.dataset.ltp === "" ? null : Number(drawer.dataset.ltp);
  let html = "";
  if (ltp !== null && avg > 0) {
    const vs = (ltp - avg) / avg * 100;
    html += `<div class="dr-vs ${vs >= 0 ? "gain-bg" : "loss-bg"}">Trading <b>${Math.abs(vs).toFixed(2)}% ${vs >= 0 ? "above" : "below"}</b> your Avg Buy Price (${inr2(avg)})</div>`;
  }
  try {
    const m = await Promise.race([fetchMaster(sym), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 9000))]);
    if (!m || !m.meta) throw new Error("no master");
    const meta = m.meta;
    const hi = meta.fiftyTwoWeekHigh, lo = meta.fiftyTwoWeekLow;
    if (typeof hi === "number" && typeof lo === "number" && hi > lo && ltp !== null) {
      const pos = Math.min(100, Math.max(0, (ltp - lo) / (hi - lo) * 100));
      html += `<div class="rng-wrap"><div class="rng-lab"><span>52W Low ${inr2(lo)}</span><span>52W High ${inr2(hi)}</span></div><div class="rng-track"><div class="rng-fill" style="width:${pos}%"></div><div class="rng-dot" style="left:${pos}%"></div></div></div>`;
    }
    const badges = techBadges(m);
    if (badges) html += badges;
    const dl = meta.regularMarketDayLow, dh = meta.regularMarketDayHigh, vol = meta.regularMarketVolume;
    const bits = [];
    if (typeof dl === "number" && typeof dh === "number") bits.push("Day range: " + inr2(dl) + " – " + inr2(dh));
    if (typeof vol === "number") bits.push("Volume: " + vol.toLocaleString("en-IN"));
    if (bits.length) html += `<p class="dr-line">${bits.join(" · ")}</p>`;
  } catch (e) { /* status extras are best-effort */ }
  box.innerHTML = html || '<span class="muted small">Live status could not load right now — your lots and entries below are complete.</span>';
}

async function loadCompanySheet(sym) {
  const tok = ++sheetToken;
  const name = (STOCK_MAP[sym] && STOCK_MAP[sym].name) || sym;
  const wr = $("stockWatchRow"), ab = $("stockAbout"), rs = $("stockResults"), nw = $("stockNews"), lk = $("stockLinks");
  window.__sheetSym = sym;
  if (!ab) return;
  const held = enriched().rows.find(r => r.sym === sym);
  const inWatch = state.watch.some(w => w.sym === sym);
  if (inWatch) {
    wr.innerHTML = '<span class="price-meta">★ In your watchlist' + (held ? ' · also in your portfolio.' : ' · <b>Not currently held</b>') + '</span><button class="mini-btn danger" id="sheetUnwatch" type="button">Remove from Watchlist</button>';
  } else {
    wr.innerHTML = '<button class="mini-btn" id="sheetWatch" type="button">☆ Add to Watchlist</button>' + (held ? '<span class="price-meta">This stock is in your portfolio — your quantity, average price and P&amp;L are in the stats above.</span>' : '<span class="price-meta">Not in your portfolio or watchlist.</span>');
  }
  const uw = $("sheetUnwatch");
  if (uw) uw.addEventListener("click", () => {
    state.watch = state.watch.filter(w => w.sym !== sym);
    persist(); renderWatch(); toast("Removed from watchlist");
    loadCompanySheet(sym);
  });
  const aw = $("sheetWatch");
  if (aw) aw.addEventListener("click", () => {
    state.watch.push({ sym: sym, name: name, fav: false });
    persist(); renderWatch(); toast("Added to watchlist");
    loadCompanySheet(sym);
  });
  try {
    const others = (state.watchlists || []).filter(w => w.id !== state.activeWatchlistId);
    if (others.length) {
      const holder = document.createElement("span");
      holder.className = "wl-copy";
      holder.innerHTML = '<span class="wl-copy-lab">Copy to list:</span><select id="sheetWlSel" class="wl-sel">' + others.map(w => '<option value="' + w.id + '">' + esc(w.name) + '</option>').join("") + '</select><button class="mini-btn" id="sheetWlCopy" type="button">Copy</button>';
      wr.appendChild(holder);
      $("sheetWlCopy").addEventListener("click", () => {
        const L = (state.watchlists || []).find(w => w.id === $("sheetWlSel").value);
        if (!L) return;
        if (L.items.some(w => w.sym === sym)) { toast(sym + " is already in " + L.name); return; }
        L.items.push({ sym: sym, name: name, fav: false });
        persist(); toast("Copied to " + L.name);
        if (typeof primeStock === "function") primeStock(sym);
      });
    }
  } catch (e) {}
  lk.innerHTML =
    '<a class="mini-btn link-btn" href="https://www.screener.in/company/' + encodeURIComponent(sym) + '/" target="_blank" rel="noopener">Full financials on Screener ↗</a>' +
    '<a class="mini-btn link-btn" href="https://www.nseindia.com/get-quotes/equity?symbol=' + encodeURIComponent(sym) + '" target="_blank" rel="noopener">View on NSE ↗</a>';
  ab.dataset.instant = "1";
  const ip = prices[sym];
  const iDay = ip && ip.prevClose ? (ip.price - ip.prevClose) / ip.prevClose * 100 : null;
  ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sectorOf(sym) ? ' · ' + esc(sectorOf(sym)) : '') + '</p>' +
    '<div class="stat-chips">' +
    (ip ? '<span class="chip">Price <b>' + inr2(ip.price) + '</b>' + (iDay !== null ? ' <span class="' + (iDay >= 0 ? "gain" : "loss") + '">' + pct(iDay) + ' today</span>' : '') + '</span>' : '<span class="chip">Price loads with the chart below</span>') +
    (held ? '<span class="chip">You hold <b>' + held.qty + ' shares</b> · avg ' + inr2(held.avg) + ' · P&amp;L <b class="' + (held.pnl >= 0 ? "gain" : "loss") + '">' + inr(held.pnl) + '</b></span>' : '<span class="chip">Not in your portfolio</span>') +
    '</div>' + extButtonsHtml(sym) +
    '<div class="skel" style="height:14px;width:55%;margin-top:10px"></div><div class="skel" style="height:14px;width:78%;margin-top:8px"></div>';
  rs.innerHTML = '<div class="skel" style="height:14px;width:60%"></div>';
  nw.innerHTML = '<div class="skel" style="height:14px;width:88%"></div><div class="skel" style="height:14px;width:70%;margin-top:8px"></div>';
  const cp = $("stockCorp"); if (cp) cp.innerHTML = '<div class="skel" style="height:14px;width:55%"></div>';
  /* Watchdog: whatever happens below (slow network, a rejected promise, an
     unexpected error), no section may sit on a skeleton beyond ~9 seconds. */
  const sheetFallback = () => {
    const sec = sectorOf(sym);
    if (ab.querySelector(".skel")) ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sec ? ' · ' + esc(sec) : '') + '</p>' + '<p class="empty-note">Couldn\'t load company details right now. <button type="button" class="mini-btn" data-sxretry="1">Retry</button></p>' + extButtonsHtml(sym);
    else if (!ab.dataset.instant) ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sec ? ' · ' + esc(sec) : '') + '</p>' +
      '<p class="empty-note">Live company data could not be fetched right now — the free sources are unreachable from this network. Everything about this company is one tap away:</p>' + extButtonsHtml(sym);
    if (cp) cp.innerHTML = '<p class="empty-note">No dividends or splits in the last 12 months — or the data could not be fetched right now.</p>';
    const fb = '<p class="empty-note">News is taking too long on this network right now. Read it directly from the source:</p>' + extButtonsHtml(sym);
    rs.innerHTML = fb;
    nw.innerHTML = fb;
  };
  const watchdog = setTimeout(() => {
    if (tok === sheetToken && ab.querySelector(".skel")) sheetFallback();
  }, 9000);
  setTimeout(() => {
    if (tok !== sheetToken) return;
    const fb = '<p class="empty-note">News is taking too long on this network right now. Read it directly from the source:</p>' + extButtonsHtml(sym);
    if (rs.querySelector(".skel")) rs.innerHTML = fb;
    if (nw.querySelector(".skel")) nw.innerHTML = fb;
  }, 3500);
  /* ONE master fetch (1y chart + events) powers About + Corporate Actions.
     Hard timeout: a section can never sit on a skeleton forever. */
  try {
  const master = await Promise.race([fetchMaster(sym), new Promise(r => setTimeout(() => r(null), 6000))]);
  if (tok !== sheetToken) return;
  if (master && master.points && master.points.length) {
    ab.innerHTML = masterAboutHtml(sym, name, master) + techHtml(master);
    if (cp) cp.innerHTML = masterCorpHtml(master);
  } else {
    const sec = sectorOf(sym);
    ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sec ? ' · ' + esc(sec) : '') + '</p>' +
      '<p class="empty-note">Live company data could not be fetched right now — the free sources are unreachable from this network. Everything about this company is one tap away:</p>' + extButtonsHtml(sym);
    if (cp) cp.innerHTML = '<p class="empty-note">No dividends or splits in the last 12 months — or the data could not be fetched right now.</p>';
  }
  /* News + Results: 3.5s cap, then a clean fallback card with direct buttons */
  const cleanName = name.replace(/\s+(Limited|Ltd\.?)$/i, "");
  const items = await Promise.race([fetchNews(cleanName, 6), new Promise(r => setTimeout(() => r(null), 3500))]);
  if (tok !== sheetToken) return;
  if (items && items.length) {
    nw.innerHTML = staleNote() + items.map(n => newsRowHtml(n, "")).join("");
    const resItems = items.filter(n => RESULT_WORDS.test(n.title)).slice(0, 4);
    rs.innerHTML = (resItems.length
      ? '<p class="comp-line"><b>Latest result coverage in the news:</b></p>' + resItems.map(n => newsRowHtml(n, "")).join("")
      : '<p class="empty-note">No result announcement found in recent news for this company. When results are declared, the coverage appears here automatically — and a reminder pops up in Folio.</p>') + extButtonsHtml(sym);
  } else {
    const fb = '<p class="empty-note">News is taking too long on this network right now. Read it directly from the source:</p>' + extButtonsHtml(sym);
    nw.innerHTML = fb;
    rs.innerHTML = fb;
  }
  } catch (e) {
    if (tok === sheetToken) sheetFallback();
  } finally {
    clearTimeout(watchdog);
  }
}

/* ---------- glossary: Know Your Numbers ---------- */
const GLOSSARY = [
  ["xirr", "XIRR (per year)", "Your true yearly rate of return. It respects the dates of every buy and sell — money invested earlier counts for more than money invested yesterday. It is the fairest single number for a portfolio that was built in parts, at different times."],
  ["value", "Invested, Current Value, Profit / Loss", "Invested is the total cost of the shares you still hold. Current Value is what those shares are worth at the latest price. The difference is your unrealised profit or loss — it becomes real (realised) only when you sell. Dividends you enter add to realised gains."],
  ["score", "Portfolio Score", "Folio's overall health number for your portfolio, out of 100. It is the average of three scores — Momentum, Diversification and Risk — all computed from free price data. Treat it as a mirror that shows shape and behaviour, never as buy or sell advice."],
  ["momentum", "Momentum Score", "How strongly your stocks have been trending over the last 6 months, weighted by how much money sits in each. Above 60 means most of your money is in stocks that have been rising; below 40 means most of it is in stocks that have been falling."],
  ["diversification", "Diversification Score", "How spread out your money is. It falls when a few stocks, or one sector, carry most of your money — because then one bad season can hurt the whole portfolio. More stocks across more sectors, in balanced sizes, raise this score."],
  ["risk", "Risk Score & Volatility", "Volatility means how wildly a stock's price swings up and down. Calm stocks score high; jumpy stocks score low. A low Risk Score does not mean a stock is bad — it means its ride is rougher, so position size matters more."],
  ["quality", "Quality & Valuation Score", "Folio's fourth score is a price-based estimate, built only from free market data: where the stock trades inside its 52-week range (strength), the size class of the company (large caps are steadier than small caps), and how clean its trend is for the risk taken. It is NOT a judgement of the company's actual profits, debt or management — that fundamental data is paid, and for it you should use the Screener link on any stock's page."],
  ["heatmap", "Heatmap", "Every stock you hold as one tile. Bigger tile = more of your money in it. The shade shows today's move — pale for a small move, deep for a big one; the red family marks falls. Tap any tile to open that stock's full page."],
  ["marketcap", "Large Cap, Mid Cap, Small Cap", "Company size classes from the NSE index lists. Large Cap = the NIFTY 100, India's biggest companies — usually steadier. Mid Cap = the next 150. Small Cap = the next 250 and beyond — often faster-moving, both up and down."],
  ["tax", "STCG, LTCG & Tax Harvesting", "Shares sold within 12 months of buying give Short-Term Capital Gains (STCG), taxed at 20%. Held longer, gains are Long-Term (LTCG), taxed at 12.5% — and the first ₹1,25,000 of LTCG in a financial year is tax-free. Folio tracks how much of that exemption you have used and how much is left. Harvesting means selling a loss-making stock before 31 March so the loss can reduce tax on your gains. Estimates only — not tax advice."],
  ["results", "Results & Announcements", "Companies declare financial results every quarter. Folio watches the news for your stocks: result announcements and coverage appear on the News tab and on each stock's page, and fresh result news pops up once a day when you open the app. Exact result dates are not published in any free open feed, so Folio shows you the announcement coverage instead of guessing a date."],
  ["watchlist", "Watchlist & Favourites", "Stocks you are tracking without owning. Tap any watchlist row to open its full company page — chart, about, results and news. Swipe a row left to delete it. The star pins a favourite to the top."]
];
function openHelp(term) {
  const body = $("helpBody");
  if (!body) return;
  body.innerHTML = GLOSSARY.map(g => '<div class="help-term" id="help-' + g[0] + '"><h4>' + g[1] + '</h4><p>' + g[2] + '</p></div>').join("");
  $("helpModal").classList.remove("hidden");
  if (term && term !== "all") {
    const el = $("help-" + term);
    if (el) setTimeout(() => { el.scrollIntoView({ block: "start" }); el.classList.add("flash"); }, 60);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-help]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    openHelp(b.dataset.help);
  }));
  const hc = $("helpClose");
  if (hc) hc.addEventListener("click", () => $("helpModal").classList.add("hidden"));
  const hm = $("helpModal");
  if (hm) hm.addEventListener("click", e => { if (e.target === hm) hm.classList.add("hidden"); });
});

/* ================================================================
   v16 — institutional upgrade: MA + entry markers, corporate
   actions, account popover, privacy mode, prefs, auto-lock,
   encrypted .folio vault, idle prefetch
   ================================================================ */
let stockMa = false;
function stockChartSvg(points, sym) {
  const W = 680, H = 210, P = 8;
  const closes = points.map(p => p.c);
  const min = Math.min(...closes), max = Math.max(...closes), rng = (max - min) || 1;
  const X = i => P + i * (W - 2 * P) / (points.length - 1);
  const Y = v => H - 22 - (v - min) / rng * (H - 40);
  const line = points.map((p, i) => X(i).toFixed(1) + "," + Y(p.c).toFixed(1)).join(" ");
  const area = "M" + X(0) + "," + (H - 22) + " L" + points.map((p, i) => X(i).toFixed(1) + "," + Y(p.c).toFixed(1)).join(" L") + " L" + X(points.length - 1) + "," + (H - 22) + " Z";
  let extra = "";
  if (stockMa) {
    const ema = [];
    const k = 2 / 21;
    closes.forEach((c, i) => { ema.push(i === 0 ? c : c * k + ema[i - 1] * (1 - k)); });
    extra += '<polyline points="' + ema.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ") + '" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 3"/>';
    if (closes.length >= 200) {
      const sma = closes.map((_, i) => i < 199 ? null : closes.slice(i - 199, i + 1).reduce((a, b) => a + b, 0) / 200);
      const pts = sma.map((v, i) => v === null ? null : X(i).toFixed(1) + "," + Y(v).toFixed(1)).filter(Boolean).join(" ");
      if (pts) extra += '<polyline points="' + pts + '" fill="none" stroke="#e03131" stroke-width="1.2" opacity="0.75"/>';
    }
    /* my buy/sell markers */
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    (state.txns || []).filter(t => t.sym === sym && (t.type === "BUY" || t.type === "SELL")).forEach(t => {
      const tt = new Date(t.date + "T00:00:00").getTime();
      if (tt < t0 || tt > t1) return;
      let bi = 0, bd = Infinity;
      points.forEach((p, i) => { const dd = Math.abs(p.t - tt); if (dd < bd) { bd = dd; bi = i; } });
      const cx = X(bi), cy = Y(points[bi].c);
      if (t.type === "BUY") extra += '<path d="M' + cx + ' ' + (cy + 13) + ' l5 -8 h-10 Z" fill="var(--text)"><title>Bought ' + t.qty + ' @ ' + inr2(t.price) + ' · ' + esc(t.date) + '</title></path>';
      else extra += '<path d="M' + cx + ' ' + (cy - 13) + ' l5 8 h-10 Z" fill="#e03131"><title>Sold ' + t.qty + ' @ ' + inr2(t.price) + ' · ' + esc(t.date) + '</title></path>';
    });
  }
  const rising = closes[closes.length - 1] >= closes[0];
  return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path d="' + area + '" fill="var(--text)" opacity="0.07"/>' +
    '<polyline points="' + line + '" fill="none" stroke="var(--text)" stroke-width="2"/>' + extra +
    '<circle cx="' + X(points.length - 1) + '" cy="' + Y(closes[closes.length - 1]) + '" r="4" fill="#e03131"/>' +
    '<text x="' + P + '" y="14" fill="var(--muted)" font-size="12">' + inr2(max) + '</text>' +
    '<text x="' + P + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="12">' + inr2(min) + '</text>' +
    '<text x="' + (W - P) + '" y="14" text-anchor="end" fill="' + (rising ? "var(--text)" : "#e03131") + '" font-size="12" font-weight="bold">' + (rising ? "▲" : "▼") + '</text>' +
    (stockMa ? '<text x="' + (W - P) + '" y="30" text-anchor="end" fill="var(--muted)" font-size="11">- - 20 EMA' + (closes.length >= 200 ? ' · — 200 SMA' : '') + ' · ▲ your buys · ▼ your sells</text>' : '') +
    '</svg>';
}

/* ---------- corporate actions (dividends + splits, Yahoo chart events) ---------- */
async function fetchCorpActions(sym) {
  const ck = "folio_ca_" + sym;
  const cached = lsCacheGet(ck, 24 * 3600 * 1000);
  if (cached) return cached;
  const url = "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(normalizeTicker(sym)) + "?range=5y&interval=1mo&events=div,split";
  const out = { divs: [], splits: [] };
  let ev = null;
  try { const r0v = await fetchChartValidated(url, 6000); ev = r0v.events || {}; } catch (e) {}
  if (!ev) {
    const j = await fetchViaProxies(url, false);
    try { ev = j.chart.result[0].events || {}; } catch (e) {}
  }
  try {
    if (!ev) throw new Error("no events");
    if (ev.dividends) Object.values(ev.dividends).forEach(x => out.divs.push({ ts: x.date * 1000, amount: x.amount }));
    if (ev.splits) Object.values(ev.splits).forEach(x => out.splits.push({ ts: x.date * 1000, text: x.splitRatio || (x.numerator + ":" + x.denominator) }));
    out.divs.sort((a, b) => b.ts - a.ts);
    out.splits.sort((a, b) => b.ts - a.ts);
  } catch (e) {}
  if (out.divs.length || out.splits.length) lsCacheSet(ck, out);
  return out;
}
let corpKey = "", corpBusy = false;
async function renderCorp(d) {
  const box = $("corpBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — their dividends and splits will appear here.</p>'; return; }
  maybePrefetch(d);
  const key = d.rows.map(r => r.sym).join(",");
  if (key === corpKey || corpBusy) return;
  corpKey = key; corpBusy = true;
  const per = await Promise.all(d.rows.slice(0, 8).map(async r => ({ r: r, ca: await fetchCorpActions(r.sym) })));
  corpBusy = false;
  const rowsHtml = [];
  per.forEach(({ r, ca }) => {
    ca.divs.filter(x => Date.now() - x.ts < 400 * 86400000).slice(0, 3).forEach(x => {
      rowsHtml.push({ ts: x.ts, html: '<div class="event-row"><span class="news-chip">' + esc(r.sym) + '</span><span class="event-text"><b>Dividend ' + inr2(x.amount) + '/share</b> · ex-date ' + fmtDate(x.ts) + ' · ≈ ' + inr(x.amount * r.qty) + ' on your current ' + r.qty + ' shares</span></div>' });
    });
    ca.splits.filter(x => Date.now() - x.ts < 3 * 365 * 86400000).slice(0, 2).forEach(x => {
      rowsHtml.push({ ts: x.ts, html: '<div class="event-row"><span class="news-chip">' + esc(r.sym) + '</span><span class="event-text"><b>Stock split ' + esc(x.text) + '</b> · ' + fmtDate(x.ts) + '</span></div>' });
    });
  });
  rowsHtml.sort((a, b) => b.ts - a.ts);
  box.innerHTML = rowsHtml.length ? rowsHtml.slice(0, 10).map(x => x.html).join("") :
    '<p class="empty-note">No dividends or splits found for your stocks in the recent period (free exchange data).</p>';
}
async function fillSheetCorp(sym, tok) {
  const cp = $("stockCorp");
  if (!cp) return;
  const ca = await fetchCorpActions(sym);
  if (tok !== sheetToken) return;
  let html = "";
  ca.divs.slice(0, 6).forEach(x => { html += '<div class="event-row"><span class="event-text"><b>Dividend ' + inr2(x.amount) + '/share</b> · ex-date ' + fmtDate(x.ts) + '</span></div>'; });
  ca.splits.slice(0, 3).forEach(x => { html += '<div class="event-row"><span class="event-text"><b>Stock split ' + esc(x.text) + '</b> · ' + fmtDate(x.ts) + '</span></div>'; });
  cp.innerHTML = html || '<p class="empty-note">No dividends or splits recorded for this stock in the last 5 years (free exchange data).</p>';
  /* extra metrics: 1-year volatility + trailing dividend yield, appended to the stats grid */
  const h1 = await fetchHistory(sym, "1y");
  if (tok !== sheetToken) return;
  let vol = null;
  if (h1 && h1.points.length > 20) {
    const cs = h1.points.map(x => x.c);
    const rets = [];
    for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0 && cs[k] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
    if (rets.length > 20) {
      const m = rets.reduce((a, b) => a + b, 0) / rets.length;
      vol = Math.sqrt(rets.reduce((a, b) => a + (b - m) * (b - m), 0) / rets.length) * Math.sqrt(252) * 100;
    }
  }
  const p = priceOf(sym);
  const divSum = ca.divs.filter(x => Date.now() - x.ts < 365 * 86400000).reduce((a, x) => a + x.amount, 0);
  const dy = p && p.price && divSum ? divSum / p.price * 100 : null;
  for (let i = 0; i < 24; i++) {
    if (tok !== sheetToken) return;
    const st = $("stockStats");
    if (st && st.innerHTML && stockSym === sym) {
      let add = "";
      if (vol !== null) add += "<div><span>Volatility (1 yr)</span>" + vol.toFixed(1) + "% a year</div>";
      if (dy !== null) add += "<div><span>Dividend yield (1 yr)</span>" + dy.toFixed(2) + "%</div>";
      if (add && !st.dataset.extra) { st.dataset.extra = "1"; st.innerHTML += add; }
      break;
    }
    await new Promise(r => setTimeout(r, 250));
  }
}

/* ---------- idle prefetch: warm 6M/1Y history + actions for holdings ---------- */
let prefetchDone = false;
function maybePrefetch(d) {
  if (prefetchDone || !d.rows.length) return;
  prefetchDone = true;
  const run = async () => {
    for (const r of d.rows.slice(0, 10)) {
      await fetchHistory(r.sym, "6mo");
      await fetchHistory(r.sym, "1y");
    }
    for (const r of d.rows.slice(0, 5)) await fetchCorpActions(r.sym);
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => run(), { timeout: 5000 });
  else setTimeout(run, 2500);
}

/* ---------- encrypted .folio vault (PBKDF2 250k + AES-256-GCM) ---------- */
let vaultMode = null, vaultPending = null;
async function vaultDerive(pass, saltBytes) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltBytes, iterations: 250000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function openVault(mode) {
  vaultMode = mode;
  $("vaultTitle").textContent = mode === "export" ? "Download Encrypted Vault" : "Restore Encrypted Vault";
  $("vaultText").textContent = mode === "export"
    ? "Your complete Folio backup, encrypted with a passphrase only you know. Without the passphrase the file cannot be read by anyone — store both safely."
    : "This will REPLACE your current entries with the contents of the vault file. Enter the passphrase you set when the vault was created.";
  $("vaultPass").value = ""; $("vaultError").textContent = "";
  $("vaultGo").textContent = mode === "export" ? "Encrypt & Download" : "Decrypt & Restore";
  $("vaultModal").classList.remove("hidden");
}
function wireVault() {
  const ex = $("vaultExportBtn"), im = $("vaultImportBtn"), vf = $("vaultFile");
  if (!ex) return;
  ex.addEventListener("click", () => openVault("export"));
  im.addEventListener("click", () => vf.click());
  vf.addEventListener("change", async () => {
    const f = vf.files && vf.files[0];
    vf.value = "";
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (!parsed || parsed.folioVault !== 1 || !parsed.data) { toast("That file is not a Folio vault"); return; }
      vaultPending = parsed;
      openVault("import");
    } catch (e) { toast("That file could not be read"); }
  });
  $("vaultClose").addEventListener("click", () => $("vaultModal").classList.add("hidden"));
  $("vaultModal").addEventListener("click", e => { if (e.target === $("vaultModal")) $("vaultModal").classList.add("hidden"); });
  $("vaultForm").addEventListener("submit", async e => {
    e.preventDefault();
    const pass = $("vaultPass").value;
    const err = $("vaultError");
    if (pass.length < 8) { err.textContent = "Passphrase must be at least 8 characters."; return; }
    err.textContent = "Working… (encryption takes a few seconds)";
    try {
      if (vaultMode === "export") {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await vaultDerive(pass, salt);
        const payload = JSON.stringify({ app: "Folio", kind: "vault-backup", exportedAt: new Date().toISOString(), state: state });
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(payload));
        const file = JSON.stringify({ folioVault: 1, kdf: "PBKDF2-SHA-256", iterations: 250000, salt: b64encode(salt), iv: b64encode(iv), data: b64encode(ct) }, null, 2);
        downloadText("folio-vault-" + new Date().toISOString().slice(0, 10) + ".folio", file);
        $("vaultModal").classList.add("hidden");
        toast("Encrypted vault downloaded");
      } else {
        const key = await vaultDerive(pass, b64decode(vaultPending.salt));
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(vaultPending.iv) }, key, b64decode(vaultPending.data));
        const payload = JSON.parse(new TextDecoder().decode(plain));
        if (!payload || !payload.state || !Array.isArray(payload.state.txns)) throw new Error("bad vault");
        state = normalizeState(payload.state);
        persist(); renderAll(); refreshPrices();
        if (typeof renderProfile === "function") renderProfile();
        vaultPending = null;
        $("vaultModal").classList.add("hidden");
        toast("Vault restored");
      }
    } catch (ex) {
      err.textContent = vaultMode === "import" ? "Could not decrypt — wrong passphrase, or the file is damaged." : "Encryption failed in this browser.";
    }
  });
}

/* ---------- account popover, privacy mode, prefs, auto-lock ---------- */
function fillPrefs() {
  if (!currentUser || !$("profName")) return;
  const p = state.profile || {};
  const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v || ""; };
  set("profCategory", p.category); set("profSlab", p.slab);
  const c = $("profCompact"); if (c) c.checked = !!p.compact;
  const al = $("autoLockToggle");
  if (al) al.checked = p.autoLock !== undefined ? !!p.autoLock : !!(p.totp && p.totp.enabled);
}
function wireAccountCenter() {
  if (typeof renderProfile === "function" && !window.__rpWrapped) {
    window.__rpWrapped = true;
    const origRp = renderProfile;
    renderProfile = function () { origRp(); fillPrefs(); };
  }
  /* avatar chip now opens the Google-style popover (clone drops old listeners) */
  const chip = $("profileChip");
  if (chip && !chip.dataset.pop) {
    const clone = chip.cloneNode(true);
    clone.dataset.pop = "1";
    chip.replaceWith(clone);
    clone.addEventListener("click", e => {
      e.stopPropagation();
      const pop = $("accountPop");
      if (!pop.classList.contains("hidden")) { pop.classList.add("hidden"); return; }
      const p = state.profile || {};
      $("apName").textContent = (typeof displayName === "function" && displayName()) || "My Account";
      $("apEmail").textContent = currentUser ? currentUser.email : "";
      const av = $("apAvatar"), ai = $("apAvatarInit");
      if (p.dp) { av.src = p.dp; av.classList.remove("hidden"); ai.classList.add("hidden"); }
      else { av.classList.add("hidden"); ai.classList.remove("hidden"); ai.textContent = ((typeof displayName === "function" && displayName()) || (currentUser ? currentUser.email : "?")).charAt(0).toUpperCase(); }
      $("apBadge").textContent = p.totp && p.totp.enabled ? "🔒 2FA ON · Secret AES-256 Encrypted" : "🔒 Password Protected · Add 2FA for the double lock";
      $("apPrivacy").textContent = document.body.classList.contains("privacy-on") ? "Show Amounts" : "Hide Amounts (Privacy Mode)";
      pop.classList.remove("hidden");
    });
    document.addEventListener("click", e => {
      const pop = $("accountPop");
      if (pop && !pop.classList.contains("hidden") && !pop.contains(e.target)) pop.classList.add("hidden");
    });
    $("apManage").addEventListener("click", () => { $("accountPop").classList.add("hidden"); switchView("profile"); });
    $("apTheme").addEventListener("click", () => { $("accountPop").classList.add("hidden"); $("themeBtn").click(); });
    $("apLogout").addEventListener("click", () => { $("accountPop").classList.add("hidden"); doLogout(); });
    $("apPrivacy").addEventListener("click", () => { $("accountPop").classList.add("hidden"); togglePrivacy(); });
  }
  const setPrivacy = on => {
    document.body.classList.toggle("privacy-on", on);
    $("privacyIcon").textContent = on ? "🙈" : "👁";
    try { localStorage.setItem("folio_privacy", on ? "1" : "0"); } catch (e) {}
  };
  window.togglePrivacy = () => setPrivacy(!document.body.classList.contains("privacy-on"));
  const pb = $("privacyBtn");
  if (pb) pb.addEventListener("click", () => togglePrivacy());
  try { if (localStorage.getItem("folio_privacy") === "1") setPrivacy(true); } catch (e) {}
  /* prefs: saved alongside the profile form; filled whenever profile renders */
  const form = $("profileForm");
  if (form && !form.dataset.prefs) {
    form.dataset.prefs = "1";
    form.addEventListener("submit", () => {
      state.profile.category = $("profCategory") ? $("profCategory").value : "";
      state.profile.slab = $("profSlab") ? $("profSlab").value : "";
      state.profile.compact = $("profCompact") ? $("profCompact").checked : false;
      persist(); renderAll();
    });
  }
  const al = $("autoLockToggle");
  if (al && !al.dataset.wired) {
    al.dataset.wired = "1";
    al.addEventListener("change", () => { state.profile.autoLock = al.checked; persist(); toast(al.checked ? "Auto-lock ON (15 minutes)" : "Auto-lock OFF"); });
  }
  const cc = $("clearCacheBtn");
  if (cc) cc.addEventListener("click", () => {
    Object.keys(localStorage).filter(k => k.indexOf("folio_hist_") === 0 || k.indexOf("folio_news_") === 0 || k.indexOf("folio_ci_") === 0 || k.indexOf("folio_ca_") === 0 || k === "folio_prices_v1").forEach(k => localStorage.removeItem(k));
    Object.keys(histCache).forEach(k => delete histCache[k]);
    toast("Cache cleared — fresh data will load next");
  });
  const d2 = $("dpFile2");
  if (d2) d2.addEventListener("change", () => {
    const f = d2.files && d2.files[0];
    if (!f) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(f);
      const main = $("dpFile");
      main.files = dt.files;
      main.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) { toast("Please use the Change Photo button below"); }
    d2.value = "";
  });
  const pbc = $("perfBench");
  if (pbc) pbc.addEventListener("change", () => { perfBench = pbc.checked; perfKey = ""; renderPerf(enriched()); });
  const sm = $("stockMa");
  if (sm) sm.addEventListener("change", () => { stockMa = sm.checked; if (stockSym) drawStock(); });
  /* auto-lock engine */
  let lastAct = Date.now();
  ["pointerdown", "keydown", "touchstart", "pointermove", "wheel", "scroll"].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (!currentUser || !$("appView") || $("appView").classList.contains("hidden")) return;
    const p = state.profile || {};
    const enabled = p.autoLock !== undefined ? !!p.autoLock : !!(p.totp && p.totp.enabled);
    if (!enabled || Date.now() - lastAct < 15 * 60 * 1000) return;
    lastAct = Date.now();
    if (p.totp && p.totp.enabled) {
      try { sessionStorage.removeItem("pf_gate_" + currentUser.email); } catch (e) {}
      if (window.e2eeWipeForLock) window.e2eeWipeForLock();
      showGate();
      toast("Locked after 15 minutes of inactivity");
    } else {
      doLogout();
      toast("Signed out after 15 minutes of inactivity");
    }
  }, 20000);
}
document.addEventListener("DOMContentLoaded", () => { wireAccountCenter(); wireVault(); });

/* ================================================================
   v17 — quant tear-sheet: risk/return scatter, drawdown, monthly
   returns matrix, dividend snowball + system health
   ================================================================ */
async function buildValueSeries(d, rangeKey) {
  const hists = {};
  await Promise.all(d.rows.map(async r => { hists[r.sym] = await fetchHistory(r.sym, rangeKey); }));
  const tset = new Set();
  Object.values(hists).forEach(h => { if (h) h.points.forEach(p => tset.add(p.t)); });
  const ts = [...tset].sort((a, b) => a - b);
  return ts.map(t => ({
    t: t,
    v: d.rows.reduce((s, r) => {
      const h = hists[r.sym];
      const c = h ? closeAt(h.points, t) : null;
      return s + r.qty * (c !== null ? c : r.avg);
    }, 0)
  })).filter(x => x.v > 0);
}

/* ---------- 2) Risk vs Return bubble scatter (Insights) ---------- */
function renderScatter(per, d) {
  const box = $("scatterBox");
  if (!box || !per) return;
  const pts = per.filter(p => p.vol !== null && p.r).map(p => ({
    sym: p.r.sym, name: p.r.name, vol: p.vol,
    ret: Number.isFinite(p.r.pnlPct) ? p.r.pnlPct : 0,
    w: d.value ? p.r.cur / d.value * 100 : 0
  }));
  if (!pts.length) { box.innerHTML = '<p class="empty-note">The scatter needs price history — it appears once 6 months of prices load.</p>'; return; }
  const W = 680, H = 300, PL = 46, PR = 32, PT = 32, PB = 34;
  const maxVol = Math.max(30, ...pts.map(p => p.vol)) * 1.12;
  const minRet = Math.min(-8, ...pts.map(p => p.ret)) * 1.15;
  const maxRet = Math.max(12, ...pts.map(p => p.ret)) * 1.15;
  const vols = pts.map(p => p.vol).sort((a, b) => a - b);
  const medVol = vols[Math.floor(vols.length / 2)] || 25;
  const X = v => PL + (v / maxVol) * (W - PL - PR);
  const Y = v => PT + (1 - (v - minRet) / (maxRet - minRet)) * (H - PT - PB);
  const q = (x, y, label, anchor) => '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" fill="var(--muted)" font-size="11.5" font-weight="bold" letter-spacing="0.08em">' + label + '</text>';
  let svg = '<svg class="chart-svg scatter" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<rect x="' + PL + '" y="' + PT + '" width="' + (X(medVol) - PL) + '" height="' + (Y(0) - PT) + '" fill="var(--text)" opacity="0.05"/>' +
    '<rect x="' + X(medVol) + '" y="' + Y(0) + '" width="' + (W - PR - X(medVol)) + '" height="' + (H - PB - Y(0)) + '" fill="#e03131" opacity="0.05"/>' +
    '<line x1="' + X(medVol) + '" y1="' + PT + '" x2="' + X(medVol) + '" y2="' + (H - PB) + '" stroke="var(--line)"/>' +
    '<line x1="' + PL + '" y1="' + Y(0) + '" x2="' + (W - PR) + '" y2="' + Y(0) + '" stroke="var(--line)"/>' +
    q(PL + 6, PT + 14, "STAR COMPOUNDERS", "start") + q(W - PR - 6, PT + 14, "AGGRESSIVE GROWTH", "end") +
    q(PL + 6, H - PB - 6, "DEFENSIVE ANCHORS", "start") + q(W - PR - 6, H - PB - 6, "LAGGARDS", "end") +
    '<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--muted)" font-size="11">Annualised Volatility (Risk) →</text>' +
    '<text x="12" y="' + (H / 2) + '" text-anchor="middle" fill="var(--muted)" font-size="11" transform="rotate(-90 12 ' + (H / 2) + ')">Your Return %</text>';
  [0, Math.round(maxVol / 2), Math.round(maxVol)].forEach(v => {
    svg += '<text x="' + X(v) + '" y="' + (H - PB + 16) + '" text-anchor="middle" fill="var(--muted)" font-size="10.5">' + v + '%</text>';
  });
  const placedLabels = [];
  pts.forEach(p => {
    const r = Math.min(24, 4.5 + p.w * 0.38);
    const cx = X(p.vol), cy = Y(p.ret);
    let ly = cy - r - 3;
    if (cy < PT + 45) ly = cy + r + 13;
    if (placedLabels.some(q => Math.abs(q.x - cx) < 24 && Math.abs(q.y - ly) < 10)) ly += 12;
    placedLabels.push({ x: cx, y: ly });
    svg += '<g class="scatter-dot" data-sym="' + esc(p.sym) + '" style="cursor:pointer"><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (p.ret >= 0 ? "var(--text)" : "#e03131") + '" opacity="0.55" stroke="var(--bg)" stroke-width="1.2"><title>' + esc(p.sym) + ' — Return ' + pct(p.ret) + ' · Volatility ' + p.vol.toFixed(1) + '% a year · Weight ' + p.w.toFixed(1) + '% of portfolio</title></circle>' +
      '<text x="' + cx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" fill="var(--text)" font-size="10.5" font-weight="bold">' + esc(p.sym) + '</text></g>';
  });
  svg += '</svg><p class="price-meta">Each bubble is one stock: left = calmer, right = wilder; up = profit, down = loss. Bubble size = share of your money in it. Split lines: 0% return and the median volatility (' + medVol.toFixed(0) + '%). Tap a bubble for its full page.</p>';
  box.innerHTML = svg;
  box.querySelectorAll(".scatter-dot").forEach(g => g.addEventListener("click", () => openStock(g.dataset.sym)));
}

/* ---------- 3) Underwater drawdown graph (Insights) ---------- */
let ddKey = "", ddBusy = false;
async function renderDrawdown(d) {
  const box = $("ddBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — your drawdown curve will appear here.</p>'; return; }
  const key = d.rows.map(r => r.sym + ":" + r.qty).join(",");
  if (key === ddKey || ddBusy) return;
  ddKey = key; ddBusy = true;
  const series = await buildValueSeries(d, "6mo");
  const bench = await fetchHistory("^NSEI", "6mo");
  ddBusy = false;
  if (series.length < 5) { box.innerHTML = '<p class="empty-note">Not enough price history yet for a drawdown curve.</p>'; ddKey = ""; return; }
  let peak = -Infinity, peakT = null;
  const dd = series.map(x => {
    if (x.v > peak) { peak = x.v; peakT = x.t; }
    return { t: x.t, dd: (x.v / peak - 1) * 100, v: x.v, peak: peak, peakT: peakT };
  });
  let worst = dd[0];
  dd.forEach(x => { if (x.dd < worst.dd) worst = x; });
  let recoveryDays = null;
  if (worst) {
    const after = dd.filter(x => x.t > worst.t && x.v >= worst.peak);
    if (after.length) recoveryDays = Math.round((after[0].t - worst.peakT) / 86400000);
  }
  let bdd = [];
  if (bench && bench.points.length > 3) {
    let bp = -Infinity;
    bdd = bench.points.map(p => { if (p.c > bp) bp = p.c; return (p.c / bp - 1) * 100; });
  }
  const n = Math.min(dd.length, bdd.length || dd.length);
  const a = dd.slice(dd.length - n).map(x => x.dd);
  const b = bdd.length ? bdd.slice(bdd.length - n) : a.map(() => 0);
  const head = $("ddHead");
  if (head) head.innerHTML = "Max Drawdown <b class=\"loss\">" + worst.dd.toFixed(1) + "%</b> · Recovery " + (recoveryDays === null ? "<b>not yet — " + Math.round((Date.now() - (worst ? worst.peakT : Date.now())) / 86400000) + " days under water</b>" : "<b>" + recoveryDays + " days</b>");
  box.innerHTML = dualLineSvg(a, b, 170) + '<p class="price-meta">How far below its own peak your portfolio value has been (last 6 months, at today\'s quantities). Dashed = NIFTY 50\'s drawdown over the same period.</p>';
}

/* ---------- 4) Monthly returns heatmap matrix (Insights) ---------- */
let mrKey = "", mrBusy = false;
async function renderMonthly(d) {
  const box = $("mrBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — your monthly returns table will appear here.</p>'; return; }
  const key = d.rows.map(r => r.sym + ":" + r.qty).join(",");
  if (key === mrKey || mrBusy) return;
  mrKey = key; mrBusy = true;
  const series = await buildValueSeries(d, "5y");
  mrBusy = false;
  if (series.length < 10) { box.innerHTML = '<p class="empty-note">Not enough price history yet for monthly returns.</p>'; mrKey = ""; return; }
  const monthEnd = {};
  series.forEach(x => {
    const dt = new Date(x.t);
    monthEnd[dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0")] = x.v;
  });
  const keys = Object.keys(monthEnd).sort();
  const rets = {};
  for (let i = 1; i < keys.length; i++) {
    const prev = monthEnd[keys[i - 1]], cur = monthEnd[keys[i]];
    if (prev > 0) rets[keys[i]] = (cur / prev - 1) * 100;
  }
  const years = [...new Set(keys.map(k => k.slice(0, 4)))].sort().reverse().slice(0, 6);
  const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let html = '<div class="mr-wrap"><table class="ret-table"><tr><th>Year</th>' + MN.map(m => "<th>" + m + "</th>").join("") + "<th>YTD</th></tr>";
  years.forEach(y => {
    let ytd = 1, has = false;
    html += "<tr><td><b>" + y + "</b></td>";
    for (let m = 1; m <= 12; m++) {
      const k = y + "-" + String(m).padStart(2, "0");
      const v = rets[k];
      if (typeof v === "number") {
        ytd *= (1 + v / 100); has = true;
        const inten = Math.min(62, 10 + Math.abs(v) * 6);
        const bg = v >= 0 ? "color-mix(in srgb, #1e9e5a " + inten + "%, var(--panel-2))" : "color-mix(in srgb, #d92b2b " + inten + "%, var(--panel-2))";
        html += '<td style="background:' + bg + '">' + (v >= 0 ? "+" : "") + v.toFixed(1) + "%</td>";
      } else html += "<td>—</td>";
    }
    const yv = has ? (ytd - 1) * 100 : null;
    html += '<td class="mr-ytd"><b>' + (yv === null ? "—" : (yv >= 0 ? "+" : "") + yv.toFixed(1) + "%") + "</b></td></tr>";
  });
  html += "</table></div><p class=\"price-meta\">Month-by-month return of your portfolio value at today's quantities (approximate — it shows how the current portfolio would have moved). Green = positive month, red = negative.</p>";
  box.innerHTML = html;
}

/* ---------- 5) Dividend snowball (Dashboard) ---------- */
let divKey = "", divBusy = false;
async function renderDivChart(d) {
  const box = $("divBox");
  if (!box) return;
  if (!d.rows.length) { box.innerHTML = '<p class="empty-note">Add stocks — your dividend snowball will build here.</p>'; return; }
  const key = d.rows.map(r => r.sym + ":" + r.qty).join(",");
  if (key === divKey || divBusy) return;
  divKey = key; divBusy = true;
  const manualSyms = new Set((state.txns || []).filter(t => t.type === "DIV").map(t => t.sym));
  const perQ = {};
  const addQ = (ts, amt) => {
    if (!amt) return;
    const dt = new Date(ts);
    const k = dt.getFullYear() + "-Q" + (Math.floor(dt.getMonth() / 3) + 1);
    perQ[k] = (perQ[k] || 0) + amt;
  };
  let ttm = 0;
  (state.txns || []).filter(t => t.type === "DIV").forEach(t => {
    const amt = (t.qty || 0) * (t.price || 0);
    addQ(new Date(t.date + "T00:00:00").getTime(), amt);
    if (Date.now() - new Date(t.date + "T00:00:00").getTime() < 365 * 86400000) ttm += amt;
  });
  const autoRows = d.rows.filter(r => !manualSyms.has(r.sym)).slice(0, 8);
  const cas = await Promise.all(autoRows.map(r => fetchCorpActions(r.sym)));
  divBusy = false;
  autoRows.forEach((r, i) => {
    cas[i].divs.forEach(x => {
      let qty = 0;
      (state.txns || []).filter(t => t.sym === r.sym).forEach(t => {
        const tt = new Date(t.date + "T00:00:00").getTime();
        if (tt <= x.ts) qty += t.type === "BUY" ? (t.qty || 0) : t.type === "SELL" ? -(t.qty || 0) : 0;
      });
      if (qty > 0) {
        addQ(x.ts, x.amount * qty);
        if (Date.now() - x.ts < 365 * 86400000) ttm += x.amount * qty;
      }
    });
  });
  const qkeys = Object.keys(perQ).sort().slice(-8);
  const yld = d.value ? ttm / d.value * 100 : 0;
  const yoc = d.invested ? ttm / d.invested * 100 : 0;
  const badges = '<div class="div-badges"><span class="div-badge">Dividends, last 12 months <b>' + inr(ttm) + '</b></span>' +
    '<span class="div-badge">Portfolio Dividend Yield <b>' + yld.toFixed(2) + '%</b></span>' +
    '<span class="div-badge">Yield on Cost <b>' + yoc.toFixed(2) + '%</b></span></div>';
  if (!qkeys.length) {
    box.innerHTML = badges + '<p class="empty-note">No dividends detected yet — neither entered by you nor found in exchange data for your stocks. When a holding pays a dividend, the snowball starts here.</p>';
    return;
  }
  const max = Math.max(...qkeys.map(k => perQ[k]));
  const W = 680, H = 190, BW = 54, gap = (W - 40) / qkeys.length;
  let bars = "";
  qkeys.forEach((k, i) => {
    const v = perQ[k];
    const bh = Math.max(3, v / max * (H - 58));
    const x = 24 + i * gap + (gap - BW) / 2;
    bars += '<rect x="' + x.toFixed(1) + '" y="' + (H - 28 - bh).toFixed(1) + '" width="' + BW + '" height="' + bh.toFixed(1) + '" rx="5" fill="var(--text)" opacity="' + (0.45 + 0.55 * v / max).toFixed(2) + '"><title>' + k + ' · ' + inr(v) + '</title></rect>' +
      '<text x="' + (x + BW / 2).toFixed(1) + '" y="' + (H - 32 - bh).toFixed(1) + '" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="bold">' + inr(v) + '</text>' +
      '<text x="' + (x + BW / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" fill="var(--muted)" font-size="10.5">' + k.replace("-Q", " · Q") + '</text>';
  });
  box.innerHTML = badges + '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + bars + '</svg>' +
    '<p class="price-meta">Dividends per quarter — your own DIV entries, plus exchange-detected dividends on the shares you held on each ex-date (stocks where you enter dividends yourself are never double-counted).</p>';
}

/* ---------- insights: run drawdown + monthly when the tab renders ---------- */
const _origRenderInsights17 = renderInsights;
renderInsights = function (d) {
  _origRenderInsights17(d);
  renderDrawdown(d);
  renderMonthly(d);
};

/* ---------- system health & repair (Data & Vault card) ---------- */
function wireHealth() {
  const info = $("healthInfo"), btn = $("healthRepairBtn");
  if (!info && !btn) return;
  const fill = () => {
    if (!info) return;
    let bytes = 0, caches = 0;
    Object.keys(localStorage).forEach(k => {
      if (k.indexOf("folio_") === 0) { caches++; bytes += (localStorage.getItem(k) || "").length; }
    });
    info.textContent = caches + " saved caches · " + Math.max(1, Math.round(bytes / 1024)) + " KB on this device · Folio v99";
  };
  fill();
  if (btn) btn.addEventListener("click", () => {
    Object.keys(localStorage).filter(k => k.indexOf("folio_hist_") === 0 || k.indexOf("folio_news_") === 0 || k.indexOf("folio_ci_") === 0 || k.indexOf("folio_ca_") === 0 || k.indexOf("folio_raw_") === 0 || k === "folio_prices_v1").forEach(k => localStorage.removeItem(k));
    Object.keys(histCache).forEach(k => delete histCache[k]);
    newsKey = ""; evKey = ""; corpKey = ""; divKey = ""; ddKey = ""; mrKey = ""; perfKey = ""; insKey = "";
    fill();
    renderAll(); refreshPrices();
    toast("State repaired — caches rebuilt, your holdings untouched");
  });
}
document.addEventListener("DOMContentLoaded", wireHealth);

/* ---------- NSE master index sync (Layer 2 search: every mainboard + SME stock) ---------- */
let nseSyncDone = false;
async function syncNseIndex() {
  if (nseSyncDone) return;
  nseSyncDone = true;
  try {
    const raw = localStorage.getItem("folio_nse_index_v1");
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.rows && Date.now() - saved.ts < 7 * 86400000) { window.__nseExtra = saved.rows; return; }
      if (saved && saved.rows) window.__nseExtra = saved.rows;
    }
  } catch (e) {}
  const parseCsv = text => {
    const out = [];
    String(text || "").split(/\r?\n/).slice(1).forEach(line => {
      const c = line.split(",");
      if (c.length >= 2 && c[0] && c[1]) {
        const sym = c[0].trim().toUpperCase(), nm = c[1].trim();
        if (/^[A-Z0-9&.-]+$/.test(sym) && nm) out.push([sym, nm, "Other"]);
      }
    });
    return out;
  };
  try {
    const [a, b] = await Promise.all([
      fetchViaProxies("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", true).catch(() => ""),
      fetchViaProxies("https://nsearchives.nseindia.com/content/equities/SME_EQUITY_L.csv", true).catch(() => "")
    ]);
    const rows = parseCsv(a).concat(parseCsv(b));
    if (rows.length > 500) {
      window.__nseExtra = rows;
      try { localStorage.setItem("folio_nse_index_v1", JSON.stringify({ ts: Date.now(), rows: rows })); } catch (e) {}
    }
  } catch (e) { /* search keeps working from the built-in list + Yahoo layer */ }
}
const nseWatch = setInterval(() => { if (currentUser) { clearInterval(nseWatch); syncNseIndex(); } }, 4000);

/* ---------- dashboard seg bindings (donut modes + heatmap modes) ---------- */
(function wireSegs() {
  const ds = $("donutSeg");
  if (ds) ds.querySelectorAll("[data-dmode]").forEach(b => b.addEventListener("click", () => {
    window.__donutMode = b.dataset.dmode;
    ds.querySelectorAll("[data-dmode]").forEach(x => x.classList.toggle("active", x === b));
    renderAll();
  }));
  const hs = $("heatSeg");
  if (hs) hs.querySelectorAll("[data-hmode]").forEach(b => b.addEventListener("click", () => {
    heatMode = b.dataset.hmode;
    hs.querySelectorAll("[data-hmode]").forEach(x => x.classList.toggle("active", x === b));
    try { renderHeat(enriched()); } catch (e) {}
  }));
})();

/* ---------- unbreakable company-modal close (X, backdrop, Esc, phone Back) ---------- */
window.closeCompanyModal = function () {
  const m = $("stockModal");
  if (m) m.classList.add("hidden");
  document.body.style.overflow = "";
  try { lwDispose(); } catch (e) {}
};
document.addEventListener("click", e => {
  const t = e.target;
  if (!t || !t.closest) return;
  const cmEl = t.closest("[data-close-modal]");
  if (cmEl && cmEl.closest("#stockModal")) { e.stopPropagation(); window.closeCompanyModal(); }
}, true);
window.addEventListener("popstate", () => {
  const m = $("stockModal");
  if (m && !m.classList.contains("hidden")) window.closeCompanyModal();
});
const _openStockPrev = openStock;
openStock = function (sym) {
  /* Strict per-symbol isolation: purge the previous stock's chart buffer the
     instant a new stock opens, so its prices/markers can never leak across. */
  try {
    activeModalSymbol = baseTicker(sym);
    taToken++;
    taState.bars = []; taState._calc = null; taState.sym = activeModalSymbol;
    taState.cross = -1; taState.mA = -1; taState.mB = -1; taState.preview = false;
    ["taCanvas", "taOverlay"].forEach(id => { const cv = $(id); if (cv) { const w = cv.width; cv.width = 0; cv.width = w; } });
    taState.view = null; taPill("loading");
    const vd = $("taVerdict"); if (vd) vd.innerHTML = "";
    const hd = $("taHud"); if (hd) hd.textContent = "Drag on the chart to inspect any day";
  } catch (e) {}
  const r = _openStockPrev(sym);
  try { stockShareChipUpdate(sym); } catch (e) {}
  try { history.pushState({ folioStock: 1 }, ""); } catch (e) {}
  return r;
};

/* ---------- liquid dock: profile circle shows her photo; top strip centres the active tab ---------- */
let lastDpShown = "__init";
const USER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/></svg>';
setInterval(() => {
  const btn = $("bnavProfileBtn");
  if (!btn || typeof state === "undefined" || !state) return;
  const dp = (state.profile && state.profile.dp) || "";
  if (dp === lastDpShown) return;
  lastDpShown = dp;
  btn.innerHTML = dp ? '<img src="' + dp + '" alt="Profile">' : USER_SVG;
  const db = $("dockProfileBtn");
  if (db) {
    const im = $("dockProfileImg"), sv = $("dockProfileSvg"), lb = db.querySelector(".dock-circle-label");
    if (dp) { if (im) { im.src = dp; im.classList.remove("hidden"); } if (sv) sv.classList.add("hidden"); if (lb) lb.classList.add("hidden"); }
    else { if (im) im.classList.add("hidden"); if (sv) sv.classList.remove("hidden"); if (lb) lb.classList.remove("hidden"); }
  }
}, 2000);
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setTimeout(() => {
  const a = document.querySelector(".tab.active");
  if (a && a.scrollIntoView) a.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}, 60)));

/* ---------- Insights timeframe engine (1D/1W/1M/3M/6M/1Y/ALL) ---------- */
let insTf = "ALL", insTfToken = 0;
const INS_DAYS = { "1W": 7, "1M": 30, "3M": 91, "6M": 182, "1Y": 365 };
async function renderInsPeriod() {
  const box = $("insPeriodBox"), mov = $("insMoversBox"), hea = $("insHealthBox"), sec = $("insSectorBox");
  if (!box) return;
  const d = enriched();
  if (!d.rows.length) {
    box.innerHTML = '<p class="empty-note">Add stocks — period performance will appear here.</p>';
    if (mov) mov.innerHTML = ""; if (hea) hea.innerHTML = ""; if (sec) sec.innerHTML = "";
    return;
  }
  const tf = insTf, tok = ++insTfToken;
  let changes = [], niftyRet = null, maxFall = null;
  const niftyFor = async daysBack => {
    try {
      const h = await fetchHistory("^NSEI", "1y");
      if (!h || !h.points.length) return null;
      const pts = h.points;
      if (daysBack === 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; return a && b ? (b.c - a.c) / a.c * 100 : null; }
      const since = Date.now() - daysBack * 86400000;
      let sp = null;
      for (const p of pts) { if (p.t <= since) sp = p.c; else break; }
      if (sp === null) sp = pts[0].c;
      return sp ? (pts[pts.length - 1].c - sp) / sp * 100 : null;
    } catch (e) { return null; }
  };
  if (tf === "1D") {
    changes = d.rows.map(r => ({ row: r, change: r.day || 0, startVal: Math.max(1, r.cur - (r.day || 0)), pct: (r.prevClose && r.ltp !== null) ? (r.ltp - r.prevClose) / r.prevClose * 100 : 0 }));
    niftyRet = await niftyFor(1);
  } else if (tf === "ALL") {
    changes = d.rows.map(r => ({ row: r, change: r.pnl, startVal: r.invested, pct: r.pnlPct }));
    niftyRet = await niftyFor(365);
  } else {
    box.innerHTML = '<p class="empty-note">Reading the ' + tf + ' period from free price history…</p>';
    const days = INS_DAYS[tf], since = Date.now() - days * 86400000;
    const hists = await Promise.all(d.rows.map(r => fetchHistory(r.sym, "1y").catch(() => null)));
    niftyRet = await niftyFor(days);
    if (tok !== insTfToken) return;
    let fallSum = 0, highSum = 0;
    changes = d.rows.map((r, i) => {
      const h = hists[i];
      if (!h || !h.points.length || r.ltp === null) return { row: r, change: 0, startVal: Math.max(1, r.cur), pct: 0, noData: true };
      let sp = null;
      for (const p of h.points) { if (p.t <= since) sp = p.c; else break; }
      if (sp === null) sp = h.points[0].c;
      const win = h.points.filter(p => p.t >= since);
      const high = win.length ? Math.max.apply(null, win.map(p => p.c)) : r.ltp;
      fallSum += r.qty * (r.ltp - high); highSum += r.qty * high;
      return { row: r, change: r.qty * (r.ltp - sp), startVal: Math.max(1, r.qty * sp), pct: sp ? (r.ltp - sp) / sp * 100 : 0 };
    });
    maxFall = { rs: fallSum, pct: highSum ? fallSum / highSum * 100 : 0 };
  }
  if (tok !== insTfToken) return;
  const totChange = changes.reduce((a, c) => a + c.change, 0);
  const totStart = changes.reduce((a, c) => a + c.startVal, 0);
  const totPct = totStart ? totChange / totStart * 100 : 0;
  const tfName = { "1D": "Today (1D)", "1W": "1 Week", "1M": "1 Month", "3M": "3 Months", "6M": "6 Months", "1Y": "1 Year", "ALL": "All Time" }[tf];
  const alpha = niftyRet !== null ? totPct - niftyRet : null;
  box.innerHTML = '<div class="stat-chips">' +
    '<span class="chip">' + tfName + ' Change <b class="' + (totChange >= 0 ? "gain" : "loss") + '">' + inr(totChange) + " (" + pct(totPct) + ')</b></span>' +
    (maxFall && maxFall.rs < -1 ? '<span class="chip">Max Fall in Period <b class="loss">' + inr(maxFall.rs) + " (" + pct(maxFall.pct) + ')</b> from the period high</span>' : "") +
    (alpha !== null ? '<span class="chip">Alpha vs NIFTY 50 <b class="' + (alpha >= 0 ? "gain" : "loss") + '">' + pct(alpha) + '</b> (NIFTY ' + pct(niftyRet) + ' in the same window)</span>' : '<span class="chip">NIFTY comparison unavailable right now</span>') +
    '<span class="chip">Basis: your current quantities × free daily prices</span></div>';
  if (mov) {
    const ok = changes.filter(c => !c.noData);
    const best = ok.length ? ok.reduce((a, b) => b.change > a.change ? b : a) : null;
    const worst = ok.length ? ok.reduce((a, b) => b.change < a.change ? b : a) : null;
    mov.innerHTML = '<div class="stat-chips">' +
      (best ? '<span class="chip">Top Contributor <b>' + esc(best.row.sym) + '</b> <span class="' + (best.change >= 0 ? "gain" : "loss") + '">' + inr(best.change) + " (" + pct(best.pct) + ')</span> <button type="button" class="mini-btn" data-fshare="' + esc(best.row.sym) + '" aria-label="Share ' + esc(best.row.sym) + ' card">↗ Share</button></span>' : "") +
      (worst && worst !== best ? '<span class="chip">Biggest Drag <b>' + esc(worst.row.sym) + '</b> <span class="' + (worst.change >= 0 ? "gain" : "loss") + '">' + inr(worst.change) + " (" + pct(worst.pct) + ")</span></span>" : "") +
      '</div><p class="price-meta">In the selected ' + tfName + ' window.</p>';
  }
  if (hea) {
    const wins = d.rows.filter(r => r.pnl > 0), losses = d.rows.filter(r => r.pnl < 0);
    const g = wins.reduce((a, r) => a + r.pnl, 0), l = Math.abs(losses.reduce((a, r) => a + r.pnl, 0));
    const bestR = d.rows.reduce((a, b) => b.pnlPct > a.pnlPct ? b : a);
    const worstR = d.rows.reduce((a, b) => b.pnlPct < a.pnlPct ? b : a);
    hea.innerHTML = '<div class="stat-chips">' +
      '<span class="chip">Win Rate <b>' + (d.rows.length ? Math.round(wins.length / d.rows.length * 100) : 0) + "%</b> (" + wins.length + " of " + d.rows.length + " stocks in profit)</span>" +
      '<span class="chip">Profit Factor <b>' + (l > 0 ? (g / l).toFixed(2) : (g > 0 ? "No losses yet" : "—")) + "</b> (gains ÷ losses)</span>" +
      '<span class="chip">Best Holding <b>' + esc(bestR.sym) + '</b> <span class="gain">' + pct(bestR.pnlPct) + '</span></span>' +
      '<span class="chip">Worst Holding <b>' + esc(worstR.sym) + '</b> <span class="loss">' + pct(worstR.pnlPct) + "</span></span></div>";
  }
  if (sec) {
    const sm = {};
    changes.forEach(c => { const k = c.row.sector || "Other"; if (!sm[k]) sm[k] = { ch: 0, sv: 0 }; sm[k].ch += c.change; sm[k].sv += c.startVal; });
    sec.innerHTML = Object.entries(sm).sort((a, b) => b[1].ch - a[1].ch).map(([k, v]) =>
      '<div class="bar-row"><span class="bar-name">' + esc(k) + '</span><span class="bar-val ' + (v.ch >= 0 ? "gain" : "loss") + '">' + inr(v.ch) + " (" + pct(v.sv ? v.ch / v.sv * 100 : 0) + ")</span></div>").join("") +
      '<p class="price-meta">Sector change in the selected ' + tfName + " window.</p>";
  }
}
const _renderInsightsBase2 = renderInsights;
renderInsights = function (d) { _renderInsightsBase2(d); try { renderInsPeriod(); } catch (e) {} };

/* ---------- instant watchlist priming: price first, full data in the background ---------- */
async function primeStock(sym) {
  try { if (typeof fetchOne === "function") { await fetchOne(sym); if (typeof renderWatch === "function") renderWatch(); } } catch (e) {}
  try { fetchMaster(sym); } catch (e) {}
}

/* ---------- My Profile: collapsible accordion cards ---------- */
function enhanceProfileAccordions() {
  const view = $("view-profile");
  if (!view || view.dataset.acc) return;
  const panels = Array.prototype.slice.call(view.querySelectorAll(":scope > .panel"));
  if (panels.length < 3) return;
  view.dataset.acc = "1";
  const SUBS = [
    ["Account & Profile", "Photo, display name, signed-in email & sign out"],
    ["Personal Info & Preferences", "Name, mobile, investor category, tax slab & compact ₹ display"],
    ["Security, Password & 2FA", "Login email, password reset, 2FA authenticator lock & 15-min auto-lock"],
    ["Data, Vault & CSV Backup", "Encrypted .folio vault, CSV import/export & cache health"],
    ["Danger Zone", "Wipe all portfolio entries or permanently delete your account"]
  ];
  panels.forEach((p, i) => {
    const info = SUBS[i] || ["Section", ""];
    const body = document.createElement("div"); body.className = "acc-body";
    const inner = document.createElement("div"); inner.className = "acc-inner";
    while (p.firstChild) inner.appendChild(p.firstChild);
    body.appendChild(inner);
    const head = document.createElement("button");
    head.type = "button"; head.className = "acc-head";
    let badge = "";
    if (i === 0) badge = '<span class="alert-chip">' + (typeof FIREBASE_ON !== "undefined" && FIREBASE_ON ? "☁ Cloud Saving ON" : "On this device") + "</span>";
    if (i === 2) badge = '<span class="alert-chip">' + ((typeof state !== "undefined" && state && state.profile && state.profile.totp) ? "2FA ON" : "2FA OFF") + "</span>";
    head.innerHTML = '<span class="acc-titles"><b>' + info[0] + "</b><small>" + info[1] + "</small></span>" + badge + '<span class="acc-chev">▼</span>';
    p.appendChild(head); p.appendChild(body);
    p.classList.add("acc-card");
    if (i === 0) p.classList.add("open");
    if (i === panels.length - 1) p.classList.add("acc-danger");
    head.addEventListener("click", () => p.classList.toggle("open"));
  });
}
setInterval(() => { try { enhanceProfileAccordions(); } catch (e) {} }, 1500);

/* ---------- insights timeframe seg wiring ---------- */
(function wireInsTf() {
  const seg = $("insTfSeg");
  if (!seg) return;
  seg.querySelectorAll("[data-instf]").forEach(b => b.addEventListener("click", () => {
    insTf = b.dataset.instf;
    seg.querySelectorAll("[data-instf]").forEach(x => x.classList.toggle("active", x === b));
    renderInsPeriod();
  }));
})();

/* ---------- multi-watchlist manager ---------- */
function activeWl() { return (state && state.watchlists || []).find(w => w.id === state.activeWatchlistId) || null; }
let wlEdit = null, wlDelArm = false, wlDelTimer = null, lastWlSig = "", wlDelConfirm = false;
function renderWlBar() {
  const bar = $("wlBar");
  if (!bar || !state || !Array.isArray(state.watchlists)) return;
  if (wlEdit && bar.querySelector("#wlNameInput")) return;
  const sig = state.watchlists.map(w => w.id + ":" + w.name + ":" + w.items.length).join("|") + "#" + state.activeWatchlistId + "#" + (wlDelConfirm ? "confirm" : "") + "#" + (wlEdit ? wlEdit.mode : "");
  if (sig === lastWlSig && bar.innerHTML) return;
  lastWlSig = sig;
  if (wlEdit) {
    bar.innerHTML = '<span class="wl-edit"><input type="text" id="wlNameInput" maxlength="32" placeholder="Watchlist name — e.g. Swing Trades" value="' + (wlEdit.mode === "rename" ? esc((activeWl() || {}).name || "") : "") + '">' +
      '<button type="button" class="wl-act" data-wlsave="1">' + (wlEdit.mode === "rename" ? "Save" : "Create") + '</button>' +
      '<button type="button" class="wl-act" data-wlcancel="1">Cancel</button></span>';
    const inp = $("wlNameInput");
    if (inp) { inp.focus(); inp.addEventListener("keydown", ev => { if (ev.key === "Enter") saveWlEdit(); if (ev.key === "Escape") { wlEdit = null; renderWlBar(); } }); }
    const sv = bar.querySelector("[data-wlsave]"); if (sv) sv.addEventListener("click", saveWlEdit);
    const cn = bar.querySelector("[data-wlcancel]"); if (cn) cn.addEventListener("click", () => { wlEdit = null; renderWlBar(); });
    return;
  }
  if (wlDelConfirm) {
    const act2 = activeWl();
    bar.innerHTML = '<span class="wl-confirm">Delete “' + esc(act2 ? act2.name : "") + '” and its ' + (act2 ? act2.items.length : 0) + ' stock(s)? <button type="button" class="wl-act danger" data-wldelyes="1">Yes, Delete</button><button type="button" class="wl-act" data-wldelno="1">Cancel</button></span>';
    const yes = bar.querySelector("[data-wldelyes]"); if (yes) yes.addEventListener("click", doDeleteWl);
    const no = bar.querySelector("[data-wldelno]"); if (no) no.addEventListener("click", () => { wlDelConfirm = false; renderWlBar(); });
    return;
  }
  bar.innerHTML = state.watchlists.map(w =>
    '<button type="button" class="wl-pill' + (w.id === state.activeWatchlistId ? " active" : "") + '" data-wlswitch="' + w.id + '">' + esc(w.name) + ' <span class="wl-count">' + w.items.length + "</span></button>").join("") +
    '<span class="wl-actions"><button type="button" class="wl-act" data-wlnew="1" aria-label="Create a new watchlist">➕ New</button>' +
    '<button type="button" class="wl-act" data-wlrename="1" aria-label="Rename this watchlist">✏️</button>' +
    '<button type="button" class="wl-act danger" data-wldel="1" aria-label="Delete this watchlist">🗑️</button></span>';
  bar.querySelectorAll("[data-wlswitch]").forEach(b => b.addEventListener("click", () => switchWl(b.dataset.wlswitch)));
  const nb = bar.querySelector("[data-wlnew]"); if (nb) nb.addEventListener("click", newWl);
  const rb = bar.querySelector("[data-wlrename]"); if (rb) rb.addEventListener("click", renameWl);
  const db = bar.querySelector("[data-wldel]"); if (db) db.addEventListener("click", deleteWl);
}
function saveWlEdit() {
  const inp = $("wlNameInput");
  const name = inp ? inp.value.trim() : "";
  if (!name) { if (inp) inp.focus(); return; }
  if (wlEdit && wlEdit.mode === "rename") {
    const a = activeWl(); if (a) { a.name = name; persist(); toast("Renamed to " + name); }
    wlEdit = null; renderWlBar(); return;
  }
  const L = { id: "wl_" + Date.now().toString(36), name: name, items: [] };
  state.watchlists.push(L);
  wlEdit = null;
  switchWl(L.id);
  toast("Watchlist created: " + name);
}
function switchWl(id) {
  const L = (state.watchlists || []).find(w => w.id === id);
  if (!L) return;
  state.activeWatchlistId = id;
  state.watch = L.items;
  persist(); renderWatch();
  if (typeof refreshPrices === "function") refreshPrices();
}
function newWl() { wlEdit = { mode: "new" }; renderWlBar(); }
function renameWl() { if (!activeWl()) return; wlEdit = { mode: "rename" }; renderWlBar(); }
function deleteWl() {
  if (!state.watchlists || state.watchlists.length <= 1) { toast("Keep at least one watchlist"); return; }
  if (!activeWl()) return;
  wlDelConfirm = true;
  renderWlBar();
}
function doDeleteWl() {
  const a = activeWl(); if (!a) { wlDelConfirm = false; renderWlBar(); return; }
  wlDelConfirm = false;
  state.watchlists = state.watchlists.filter(w => w.id !== a.id);
  switchWl(state.watchlists[0].id);
  toast("Watchlist deleted: " + a.name);
}
function ensureWatchlists() {
  if (typeof state === "undefined" || !state) return;
  if (!Array.isArray(state.watchlists) || !state.watchlists.length) {
    state.watchlists = [{ id: "wl_default", name: "★ My Watchlist", items: Array.isArray(state.watch) ? state.watch : [] }];
    state.activeWatchlistId = "wl_default";
  }
  const act = state.watchlists.find(w => w.id === state.activeWatchlistId) || state.watchlists[0];
  state.activeWatchlistId = act.id;
  if (state.watch !== act.items) state.watch = act.items;
  renderWlBar();
}
const _persistWlBase = persist;
persist = function () { try { const a = activeWl(); if (a && state.watch !== a.items) a.items = state.watch; } catch (e) {} return _persistWlBase(); };
const _renderWatchWlBase = renderWatch;
renderWatch = function () { _renderWatchWlBase(); try { renderWlBar(); } catch (e) {} };
setInterval(() => { try { ensureWatchlists(); } catch (e) {} }, 1500);
/* =====================================================================
   Canvas TA Terminal v2 — 2-layer (static base + crosshair overlay),
   strict per-symbol isolation, indicators computed once per data load.
   ===================================================================== */
let activeModalSymbol = null;
const taState = { view: null, mode: "candles", tf: { kind: "days", days: 365, range: "", interval: "" }, ema: true, sma: true, bb: false, sr: true, trades: true, measure: false, bars: [], sym: "", preview: false, cross: -1, mA: -1, mB: -1, _calc: null, trySym: "", tries: 0 };
let taToken = 0;
function taSeedRand(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
function taSynthetic(sym) {
  const q = (typeof prices !== "undefined" && prices[sym]) || null;
  const end = q && q.price ? q.price : null;
  if (!end) return [];
  const rnd = taSeedRand([..."TA" + sym].reduce((a, c) => a + c.charCodeAt(0) * 7, 13));
  const n = 250, bars = [], dates = [];
  const dayMs = 86400000, today = new Date(); today.setHours(0, 0, 0, 0);
  let d = new Date(today);
  while (dates.length < n) { const wd = d.getDay(); if (wd !== 0 && wd !== 6) dates.unshift(d.getTime()); d = new Date(d.getTime() - dayMs); }
  let p = end * (0.84 + rnd() * 0.18);
  for (let i = 0; i < n; i++) {
    const drift = (end - p) / Math.max(1, n - i);
    const o = p;
    let c = p + drift + (rnd() - 0.48) * p * 0.012;
    if (i === n - 1) c = end;
    const h = Math.max(o, c) * (1 + rnd() * 0.006), l = Math.min(o, c) * (1 - rnd() * 0.006);
    bars.push({ t: dates[i], o: o, h: h, l: l, c: c, v: Math.round(40000 + rnd() * 900000) });
    p = c;
  }
  return bars;
}
function emaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  if (vals.length < period) return out;
  const k = 2 / (period + 1);
  let e = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < vals.length; i++) { e = vals[i] * k + e * (1 - k); out[i] = e; }
  return out;
}
function smaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  let sum = 0;
  for (let i = 0; i < vals.length; i++) { sum += vals[i]; if (i >= period) sum -= vals[i - period]; if (i >= period - 1) out[i] = sum / period; }
  return out;
}
function rsiSeries(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) g += d; else l -= d; }
  g /= period; l /= period;
  out[period] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = period + 1; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; g = (g * (period - 1) + Math.max(d, 0)) / period; l = (l * (period - 1) + Math.max(-d, 0)) / period; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  return out;
}
async function taFetchRange(sym, range, interval, byDay) {
  const key = "folio_ta_" + sym + "|" + range + "|" + interval;
  const cached = lsCacheGet(key, byDay ? 12 * 3600 * 1000 : 5 * 60 * 1000);
  if (cached && cached.bars && cached.bars.length) return cached.bars;
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(normalizeTicker(sym)) + "?range=" + range + "&interval=" + interval + "&events=div,split";
  let r0 = null;
  try { r0 = await fetchChartValidated(url, 7000); } catch (e) { r0 = null; }
  if (!r0 || !r0.indicators) return [];
  const q0 = (r0.indicators.quote && r0.indicators.quote[0]) || {};
  const bars = cleanOHLC(r0.timestamp || [], q0, byDay);
  lsCacheSet(key, { ts: Date.now(), bars: bars });
  return bars;
}
function taKnownPrice(sym) {
  const q = (typeof prices !== "undefined" && prices[sym]) || null;
  if (q && q.price) return q.price;
  try { const h = enriched().rows.find(r => r.sym === sym); if (h && h.ltp) return h.ltp; if (h && h.avg) return h.avg; } catch (e) {}
  return null;
}
function taCacheBars(sym) {
  let bars = null;
  const mc = masterCache[sym];
  if (mc && mc.ohlc && mc.ohlc.length > 5) bars = mc.ohlc;
  if (!bars) { const h = histLsGet(sym + "|1y"); if (h && h.points && h.points.length > 5) bars = h.points.map(p => ({ t: p.t, o: p.c, h: p.c, l: p.c, c: p.c, v: 0 })); }
  if (bars && bars.length) {
    const known = taKnownPrice(sym);
    if (known && Math.abs(bars[bars.length - 1].c - known) / known > 0.4) return null;
  }
  return bars;
}
async function renderTA() {
  const wrap = $("taWrap"), svgBox = $("stockChart");
  if (!wrap || !stockSym) return;
  wrap.classList.remove("hidden");
  if (svgBox) svgBox.classList.add("hidden");
  ["lwWrap", "lwBar", "lwLegend"].forEach(id => { const e = $(id); if (e) e.classList.add("hidden"); });
  const sym = baseTicker(stockSym), tok = ++taToken;
  taState.sym = sym;
  const tf = taState.tf;
  let bars = null, preview = false;
  if (tf.kind === "days") {
    bars = taCacheBars(sym);
    if (!bars) { bars = taSynthetic(sym); preview = bars.length > 0; }
  } else {
    const c = lsCacheGet("folio_ta_" + sym + "|" + tf.range + "|" + tf.interval, tf.kind === "long" ? 12 * 3600 * 1000 : 5 * 60 * 1000);
    if (c && c.bars && c.bars.length > 1) bars = c.bars;
  }
  if (bars && bars.length) { taState.bars = bars; taState.preview = preview; taDraw(); }
  else if (!preview) taPill("loading");
  try {
    let real = null;
    if (tf.kind === "days") { const m = await fetchMaster(sym); if (m && m.ohlc && m.ohlc.length > 5) real = m.ohlc; }
    else real = await taFetchRange(sym, tf.range, tf.interval, tf.kind === "long");
    if (tok !== taToken || activeModalSymbol !== sym || baseTicker(stockSym) !== sym) return;
    if (real && real.length) { taState.bars = real; taState.preview = false; taDraw(); try { folioStalePill(sym); } catch (e) {} return; }
    throw new Error("empty");
  } catch (e) {
    if (tok !== taToken || activeModalSymbol !== sym) return;
    if (preview) {
      if (taState.trySym !== sym + tf.range + "p") { taState.trySym = sym + tf.range + "p"; taState.tries = 0; }
      if (taState.tries < 3) { taState.tries++; taPill("preview"); setTimeout(() => { if (baseTicker(stockSym) === sym) { try { renderTA(); } catch (e2) {} } }, 3000); }
      else { taPill("preview"); const vd = $("taVerdict"); if (vd) vd.innerHTML = '<p class="empty-note">Live chart data could not load, so no analysis is shown — the bars above are only an estimated preview. <button type="button" class="mini-btn" data-ta-retry="1">Retry</button></p>'; }
    }
    else if (!taState.bars.length) {
      if (taState.trySym !== sym + tf.range) { taState.trySym = sym + tf.range; taState.tries = 0; }
      if (taState.tries < 3) { taState.tries++; setTimeout(() => { if (baseTicker(stockSym) === sym) { try { renderTA(); } catch (e2) {} } }, 3000); }
    }
  }
}
function taLevels() {
  const bars = taState.bars;
  if (!bars || bars.length < 2) return [];
  const y = bars[bars.length - 2];
  const P = (y.h + y.l + y.c) / 3;
  const lv = [
    { v: P + (y.h - y.l), t: "R2" }, { v: 2 * P - y.l, t: "R1" }, { v: P, t: "P" },
    { v: 2 * P - y.h, t: "S1" }, { v: P - (y.h - y.l), t: "S2" }
  ];
  let hi = -Infinity, lo = Infinity;
  bars.slice(-250).forEach(b => { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); });
  lv.push({ v: hi, t: "52W H" }, { v: lo, t: "52W L" });
  return lv;
}
function taPill(mode) {
  const p = $("taLivePill"); if (!p) return;
  if (mode === "live") { p.textContent = "🟢 Live NSE Chart"; p.className = "ta-live-pill live"; }
  else if (mode === "preview") { p.textContent = "🟡 Estimated Preview"; p.className = "ta-live-pill preview"; }
  else { p.textContent = "◌ Loading chart…"; p.className = "ta-live-pill loading"; }
}
function taSetView(start, count) {
  const c = taState._calc; if (!c) return;
  count = Math.max(10, Math.min(c.fullN, Math.round(count)));
  start = Math.max(0, Math.min(c.fullN - count, Math.round(start)));
  taState.view = { start: start, count: count }; taState.cross = -1;
  taDraw();
}
function taZoom(f) { const c = taState._calc; if (!c) return; const end = c.vfrom + c.vcount; const count = c.vcount * f; taSetView(end - count, count); }
function taPan(d) { const c = taState._calc; if (!c) return; taSetView(c.vfrom + d * Math.max(1, Math.round(c.vcount * 0.25)), c.vcount); }
function taResetView() { taState.view = null; taState.cross = -1; taDraw(); }
function taPrepare() {
  const all = taState.bars;
  if (!all.length) { taState._calc = null; return null; }
  const closes = all.map(b => b.c);
  const ema = emaSeries(closes, 20), sma = smaSeries(closes, 200);
  const sma20 = smaSeries(closes, 20);
  const sd20 = closes.map((c, i) => {
    if (i < 19) return null;
    const m = sma20[i]; let s = 0; for (let j = i - 19; j <= i; j++) s += (closes[j] - m) * (closes[j] - m);
    return Math.sqrt(s / 20);
  });
  const rsi = rsiSeries(closes, 14);
  let from = 0;
  const days = taState.tf.kind === "days" ? taState.tf.days : 0;
  if (days > 0) { const cutoff = all[all.length - 1].t - days * 86400000; from = all.findIndex(b => b.t >= cutoff); if (from < 0) from = 0; }
  const full = all.slice(from);
  const fullN = full.length;
  if (fullN < 2) { taState._calc = null; return null; }
  let vcount, vfrom;
  if (taState.view) { vcount = Math.max(10, Math.min(fullN, taState.view.count)); vfrom = Math.max(0, Math.min(fullN - vcount, taState.view.start)); }
  else { vcount = Math.min(fullN, window.innerWidth >= 1024 ? 110 : 65); vfrom = fullN - vcount; }
  const bars = full.slice(vfrom, vfrom + vcount);
  const N = bars.length;
  const gfrom = from + vfrom;
  const wrap = $("taWrap");
  const W = Math.max(280, (wrap ? wrap.clientWidth : 320) - 4);
  const H = window.innerWidth <= 768 ? 360 : 410;
  const PL = 6, PR = 52, PB = 22;
  const priceH = Math.round((H - PB) * 0.58), volTop = priceH + 6, volH = Math.round((H - PB) * 0.11), rsiTop = volTop + volH + 10, rsiH = H - PB - rsiTop - 2;
  let mn = Infinity, mx = -Infinity, vmax = 0;
  bars.forEach(b => { mn = Math.min(mn, b.l); mx = Math.max(mx, b.h); vmax = Math.max(vmax, b.v || 0); });
  if (taState.bb) for (let i = 0; i < N; i++) { const gi = gfrom + i; if (sd20[gi] !== null) { mx = Math.max(mx, sma20[gi] + 2 * sd20[gi]); mn = Math.min(mn, sma20[gi] - 2 * sd20[gi]); } }
  const pad = (mx - mn) * 0.06 || 1; mx += pad; mn -= pad;
  const calc = { all: all, bars: bars, from: from, gfrom: gfrom, vfrom: vfrom, vcount: vcount, fullN: fullN, N: N, W: W, H: H, PL: PL, PR: PR, PB: PB, priceH: priceH, volTop: volTop, volH: volH, rsiTop: rsiTop, rsiH: rsiH, mn: mn, mx: mx, vmax: vmax, step: (W - PL - PR) / N, ema: ema, sma: sma, sma20: sma20, sd20: sd20, rsi: rsi };
  calc.Y = v => calc.priceH - (v - calc.mn) / (calc.mx - calc.mn) * calc.priceH;
  calc.X = i => PL + i * calc.step + calc.step / 2;
  taState._calc = calc;
  return calc;
}
function taDraw() {
  const calc = taPrepare();
  if (!calc) return;
  taDrawBase(calc);
  taDrawOverlay();
  taPill(taState.preview ? "preview" : "live");
  taVerdict(calc);
}
function taDrawBase(calc) {
  const canvas = $("taCanvas"), overlay = $("taOverlay");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  [canvas, overlay].forEach(cv => { if (!cv) return; cv.width = calc.W * dpr; cv.height = calc.H * dpr; cv.style.width = calc.W + "px"; cv.style.height = calc.H + "px"; });
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  const C = { text: cs.getPropertyValue("--text").trim() || "#eee", muted: cs.getPropertyValue("--muted").trim() || "#999", line: cs.getPropertyValue("--line").trim() || "#333", gain: "#10b981", loss: "#ef4444" };
  const bars = calc.bars, N = calc.N, from = calc.from, Y = calc.Y, X = calc.X;
  ctx.clearRect(0, 0, calc.W, calc.H);
  ctx.strokeStyle = C.line; ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.lineWidth = 1;
  ctx.textAlign = "left";
  for (let g = 0; g <= 4; g++) { const v = calc.mn + (calc.mx - calc.mn) * g / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(calc.PL, y); ctx.lineTo(calc.W - calc.PR, y); ctx.stroke(); ctx.fillText("₹" + (Math.round(v * 100) / 100).toLocaleString("en-IN"), calc.W - calc.PR + 6, Math.max(10, y + 3)); }
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(calc.W - calc.PR, 0); ctx.lineTo(calc.W - calc.PR, calc.rsiTop + calc.rsiH); ctx.stroke();
  const line = (series, color, width) => {
    ctx.strokeStyle = color; ctx.lineWidth = width || 1.4; ctx.beginPath(); let started = false;
    for (let i = 0; i < N; i++) { const v = series[calc.gfrom + i]; if (v === null || v === undefined) continue; const x = X(i), y = Y(v); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
    ctx.stroke();
  };
  if (taState.bb) {
    ctx.fillStyle = "rgba(120,144,180,0.10)"; ctx.beginPath(); let started = false;
    for (let i = 0; i < N; i++) { const gi = calc.gfrom + i; if (calc.sd20[gi] === null) continue; const x = X(i), y = Y(calc.sma20[gi] + 2 * calc.sd20[gi]); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
    for (let i = N - 1; i >= 0; i--) { const gi = calc.gfrom + i; if (calc.sd20[gi] === null) continue; ctx.lineTo(X(i), Y(calc.sma20[gi] - 2 * calc.sd20[gi])); }
    ctx.closePath(); ctx.fill();
  }
  const bw = Math.max(1, Math.floor(calc.step * 0.68));
  if (taState.mode === "area") {
    const grad = ctx.createLinearGradient(0, 0, 0, calc.priceH);
    grad.addColorStop(0, "rgba(16,185,129,0.36)"); grad.addColorStop(1, "rgba(16,185,129,0.02)");
    ctx.beginPath();
    bars.forEach((b, i) => { const x = X(i), y = Y(b.c); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = "#10b981"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(X(N - 1), calc.priceH); ctx.lineTo(X(0), calc.priceH); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  } else if (taState.mode === "bars") {
    bars.forEach((b, i) => {
      const x = X(i), col = b.c >= b.o ? C.gain : C.loss;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, Y(b.h)); ctx.lineTo(x, Y(b.l));
      ctx.moveTo(x - bw / 2, Y(b.o)); ctx.lineTo(x, Y(b.o));
      ctx.moveTo(x, Y(b.c)); ctx.lineTo(x + bw / 2, Y(b.c)); ctx.stroke();
    });
  } else {
    bars.forEach((b, i) => {
      const x = X(i), col = b.c >= b.o ? C.gain : C.loss;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Y(b.h)); ctx.lineTo(x, Y(b.l)); ctx.stroke();
      ctx.fillStyle = col;
      const yO = Y(b.o), yC = Y(b.c);
      ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
    });
  }
  if (taState.ema) line(calc.ema, "#2962ff", 1.4);
  if (taState.sma) line(calc.sma, "#ff6d00", 1.4);
  if (taState.bb) { line(calc.sma20.map((v, i) => (calc.sd20[i] === null ? null : v + 2 * calc.sd20[i])), "rgba(120,144,180,0.55)", 1); line(calc.sma20.map((v, i) => (calc.sd20[i] === null ? null : v - 2 * calc.sd20[i])), "rgba(120,144,180,0.55)", 1); }
  if (taState.sr) {
    ctx.font = "9.5px system-ui";
    taLevels().forEach(L => {
      if (L.v < calc.mn || L.v > calc.mx) return;
      const y = Y(L.v);
      ctx.strokeStyle = "rgba(150,160,175,0.5)"; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(calc.W, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.fillText(L.t + " ₹" + Math.round(L.v).toLocaleString("en-IN"), Math.max(calc.PL + 2, calc.W - calc.PR - 122), y - 3);
    });
  }
  bars.forEach((b, i) => {
    if (!b.v || !calc.vmax) return;
    ctx.fillStyle = b.c >= b.o ? "rgba(16,185,129,0.55)" : "rgba(239,68,68,0.55)";
    const h = b.v / calc.vmax * calc.volH;
    ctx.fillRect(X(i) - bw / 2, calc.volTop + calc.volH - h, bw, h);
  });
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, calc.rsiTop); ctx.lineTo(calc.W, calc.rsiTop); ctx.stroke();
  ctx.fillStyle = C.muted; ctx.font = "9.5px system-ui"; ctx.fillText("RSI (14)", 4, calc.rsiTop + 11);
  const rsiY = v => calc.rsiTop + calc.rsiH - (v / 100) * calc.rsiH;
  [30, 70].forEach(v => { ctx.strokeStyle = "rgba(150,160,175,0.4)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, rsiY(v)); ctx.lineTo(calc.W, rsiY(v)); ctx.stroke(); ctx.setLineDash([]); });
  ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 1.3; ctx.beginPath(); let rs0 = false;
  for (let i = 0; i < N; i++) { const v = calc.rsi[calc.gfrom + i]; if (v === null) continue; const x = X(i), y = rsiY(v); if (!rs0) { ctx.moveTo(x, y); rs0 = true; } else ctx.lineTo(x, y); }
  ctx.stroke();
  if (taState.trades) {
    try {
      (state.txns || []).filter(t => baseTicker(t.sym) === baseTicker(taState.sym) && (t.type === "BUY" || t.type === "SELL")).forEach(t => {
        const td = new Date(t.date + "T23:59:59").getTime();
        let idx = -1;
        for (let i = 0; i < N; i++) if (bars[i].t <= td) idx = i;
        if (idx < 0) return;
        const x = X(idx), b = bars[idx], buy = t.type === "BUY";
        const y = buy ? Y(b.l) + 6 : Y(b.h) - 6;
        ctx.fillStyle = buy ? C.gain : C.loss;
        ctx.beginPath();
        if (buy) { ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 8); ctx.lineTo(x + 5, y + 8); } else { ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 8); ctx.lineTo(x + 5, y - 8); }
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 9px system-ui"; ctx.fillText((buy ? "B " : "S ") + "₹" + Math.round(t.price).toLocaleString("en-IN"), x - 14, buy ? y + 19 : y - 12);
      });
    } catch (e) {}
  }
  // bottom date axis — 5 clean ticks across the visible window
  ctx.fillStyle = C.muted; ctx.font = "9.5px system-ui"; ctx.textAlign = "center";
  const intra = taState.tf.kind === "intra";
  for (let k = 0; k < 5; k++) {
    const i = Math.round(k * (N - 1) / 4), b = bars[i]; if (!b) continue;
    const d = new Date(b.t);
    const lbl = intra ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    ctx.fillText(lbl, Math.max(18, Math.min(calc.W - calc.PR - 14, X(i))), calc.H - 7);
  }
  ctx.textAlign = "left";
  // live price tag pill on the right axis (TradingView-style)
  const lastB = bars[N - 1], prevB = bars[N - 2];
  if (lastB) {
    const ty = Math.max(8, Math.min(calc.priceH - 8, Y(lastB.c)));
    ctx.fillStyle = prevB && lastB.c < prevB.c ? C.loss : C.gain;
    ctx.beginPath(); ctx.roundRect(calc.W - calc.PR + 1, ty - 8, calc.PR - 3, 16, 4); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 9.5px system-ui"; ctx.textAlign = "center";
    ctx.fillText("₹" + (Math.round(lastB.c * 100) / 100).toLocaleString("en-IN"), calc.W - calc.PR + calc.PR / 2, ty + 3.5);
    ctx.textAlign = "left";
  }
}
function taDrawOverlay() {
  const overlay = $("taOverlay"), calc = taState._calc;
  if (!overlay || !calc) return;
  const dpr = window.devicePixelRatio || 1;
  const ctx = overlay.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, calc.W, calc.H);
  const cs = getComputedStyle(document.documentElement);
  const text = cs.getPropertyValue("--text").trim() || "#eee";
  if (taState.mA >= 0 && taState.mB >= 0 && taState.mA !== taState.mB) {
    const a = taState.mA - calc.gfrom, b2 = taState.mB - calc.gfrom;
    if (a >= 0 && b2 >= 0 && a < calc.N && b2 < calc.N) {
      ctx.strokeStyle = text; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(calc.X(a), calc.Y(calc.all[taState.mA].c)); ctx.lineTo(calc.X(b2), calc.Y(calc.all[taState.mB].c)); ctx.stroke();
    }
  }
  if (taState.cross >= 0 && taState.cross < calc.N) {
    const i = taState.cross, x = calc.X(i);
    ctx.strokeStyle = "rgba(160,170,185,0.65)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, calc.rsiTop + calc.rsiH); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, calc.Y(calc.bars[i].c), 3.4, 0, Math.PI * 2); ctx.fillStyle = text; ctx.fill();
  }
}
function taVerdict(calc) {
  const box = $("taVerdict");
  if (!box || !calc) return;
  const all = calc.all, last = all[all.length - 1], li = all.length - 1;
  const e = calc.ema[li], s = calc.sma[li], r = calc.rsi[li];
  const trend = (e && s) ? (last.c > e && last.c > s ? "Bullish — above 20 EMA & 200 SMA" : (last.c < e && last.c < s ? "Bearish — below 20 EMA & 200 SMA" : "Mixed — between the averages")) : "Not enough history for a trend call";
  const lv = taLevels().map(L => L.v);
  const sup = lv.filter(v => v < last.c).sort((a, b) => b - a)[0];
  const res = lv.filter(v => v > last.c).sort((a, b) => a - b)[0];
  let sig = "Range Bound";
  const hi20 = Math.max.apply(null, all.slice(-21, -1).map(b => b.h));
  if (last.c > hi20) sig = "Breakout — closed above the 20-day high";
  else if (e && last.c > e && Math.abs(last.c - e) / e < 0.01 && (s ? last.c > s : true)) sig = "2nd Leg Pullback — holding at the 20 EMA in an uptrend";
  box.innerHTML =
    '<span class="chip">Trend <b>' + trend + "</b></span>" +
    '<span class="chip">RSI (14) <b>' + (r !== null && r !== undefined ? r.toFixed(1) : "—") + "</b> " + (r >= 70 ? "· Overbought" : r <= 30 ? "· Oversold" : "· Neutral Momentum") + "</span>" +
    '<span class="chip">Support <b>' + (sup ? inr2(sup) : "—") + '</b> · Resistance <b>' + (res ? inr2(res) : "—") + "</b></span>" +
    '<span class="chip">Price Action <b>' + sig + "</b></span>" +
    (taState.preview ? '<span class="chip">Preview data — real history loading</span>' : "");
}
(function wireTa() {
  const overlay = $("taOverlay");
  if (!overlay) return;
  const tfSeg = $("taTfSeg");
  if (tfSeg) tfSeg.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
    tfSeg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b));
    if (b.dataset.tadays) taState.tf = { kind: "days", days: Number(b.dataset.tadays), range: "", interval: "" };
    else taState.tf = { kind: b.dataset.takind, days: 0, range: b.dataset.range, interval: b.dataset.interval };
    taState.mA = -1; taState.mB = -1; taState.cross = -1;
    try { renderTA(); } catch (e) {}
  }));
  const segWire = (id, attr, fn) => { const seg = $(id); if (!seg) return; seg.querySelectorAll("[" + attr + "]").forEach(b => b.addEventListener("click", () => fn(b, seg))); };
  segWire("taModeSeg", "data-ta", (b, seg) => { taState.mode = b.dataset.ta; seg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b)); taDraw(); });
  segWire("taIndSeg", "data-taind", b => {
    const k = b.dataset.taind;
    if (k === "measure") { taState.measure = !taState.measure; taState.mA = -1; taState.mB = -1; b.classList.toggle("active", taState.measure); const hud = $("taHud"); if (hud) hud.textContent = taState.measure ? "Measure: tap two points on the chart" : "Drag on the chart to inspect any day"; taDrawOverlay(); return; }
    taState[k] = !taState[k]; b.classList.toggle("active", taState[k]); taDraw();
  });
  const pos = ev => { const r = overlay.getBoundingClientRect(); const c = taState._calc; if (!c) return -1; const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; const i = Math.floor((x - c.PL) / c.step); return Math.max(0, Math.min(c.N - 1, i)); };
  const hud = idx => {
    const c = taState._calc, h = $("taHud");
    if (!c || !h || idx < 0) return;
    const b = c.bars[idx], gi = c.gfrom + idx;
    h.textContent = new Date(b.t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " · O " + inr2(b.o) + " · H " + inr2(b.h) + " · L " + inr2(b.l) + " · C " + inr2(b.c) + " · RSI " + (c.rsi[gi] !== null && c.rsi[gi] !== undefined ? c.rsi[gi].toFixed(1) : "—") + " · EMA20 " + (c.ema[gi] ? inr2(c.ema[gi]) : "—");
  };
  document.querySelectorAll("[data-tazoom]").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.tazoom;
    if (a === "in") taZoom(0.7); else if (a === "out") taZoom(1.45);
    else if (a === "left") taPan(-1); else if (a === "right") taPan(1);
    else if (a === "reset") taResetView();
  }));
  overlay.addEventListener("wheel", ev => { ev.preventDefault(); taZoom(ev.deltaY < 0 ? 0.85 : 1.18); }, { passive: false });
  const pointers = new Map(); let pinch0 = null;
  overlay.addEventListener("pointerdown", ev => { pointers.set(ev.pointerId, ev.clientX); if (pointers.size === 2) { const xs = [...pointers.values()]; const c = taState._calc; pinch0 = { d: Math.abs(xs[0] - xs[1]) || 1, start: c ? c.vfrom : 0, count: c ? c.vcount : 65 }; dragging = false; } });
  overlay.addEventListener("pointermove", ev => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, ev.clientX);
    if (pointers.size === 2 && pinch0) { const xs = [...pointers.values()]; const d = Math.abs(xs[0] - xs[1]) || 1; taSetView(pinch0.start + pinch0.count - pinch0.count * pinch0.d / d, pinch0.count * pinch0.d / d); }
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => overlay.addEventListener(t, ev => { pointers.delete(ev.pointerId); if (pointers.size < 2) pinch0 = null; }));
  let dragging = false, rafPending = false;
  overlay.addEventListener("pointerdown", ev => {
    const idx = pos(ev); if (idx < 0) return;
    const c = taState._calc, gi = c.gfrom + idx;
    if (taState.measure) {
      if (taState.mA < 0 || (taState.mA >= 0 && taState.mB >= 0)) { taState.mA = gi; taState.mB = -1; }
      else { taState.mB = gi; const A = taState.bars[taState.mA], B = taState.bars[taState.mB]; const h = $("taHud"); if (h && A && B) h.textContent = "Measured: " + inr2(A.c) + " → " + inr2(B.c) + " · " + (B.c - A.c >= 0 ? "+" : "") + inr(B.c - A.c) + " (" + pct((B.c - A.c) / A.c * 100) + ") · " + Math.abs(taState.mB - taState.mA) + " bars/days"; }
      taDrawOverlay(); return;
    }
    dragging = true; taState.cross = idx; hud(idx); taDrawOverlay();
  });
  overlay.addEventListener("pointermove", ev => {
    if (!dragging || rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; const idx = pos(ev); if (idx < 0) return; taState.cross = idx; hud(idx); taDrawOverlay(); });
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => overlay.addEventListener(t, () => { dragging = false; }));
})();

/* IST date helper (shared) */
function istTodayStr() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }

/* ---------- Terms, Privacy & Security modal ---------- */
(function wireTerms() {
  const m = $("termsModal"); if (!m) return;
  document.querySelectorAll("[data-open-terms]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); m.classList.remove("hidden"); }));
  m.querySelectorAll("[data-close-terms]").forEach(b => b.addEventListener("click", () => m.classList.add("hidden")));
  m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); });
})();

/* ================= TASK 1 (v59): Insights deep analytics =================
   Everything is computed from the user's own transactions + the existing
   free daily-history layer. New settings live in state.profile.insX, so
   they ride the same cloud sync + encrypted .folio vault as holdings. */
const INSX_INFO = {
  volatility: "Volatility: how much your portfolio's value swings up and down in a year, in percent. Higher means bigger swings. Calculated from daily returns of your portfolio value over the last year.",
  beta: "Beta: how strongly your portfolio moves with NIFTY 50. Beta 1.0 moves with the market, 1.2 moves about 20% more, 0.8 moves about 20% less. Calculated from daily returns of your portfolio vs NIFTY 50.",
  sharpe: "Sharpe ratio: return earned per unit of total swing risk, after subtracting the risk-free rate. Above 1 is generally considered good, below 0 means the swings were not rewarded. (Your annual return minus risk-free rate) divided by volatility.",
  sortino: "Sortino ratio: like Sharpe, but only harmful (downward) swings count as risk. Falling prices are what hurt, so this ignores upside jumps.",
  maxdd: "Maximum drawdown: the biggest fall from a peak to the low that followed it, in your portfolio's value history. It shows the worst ride you would have sat through.",
  var: "Value at Risk (1-day, 95%): on a bad day — roughly the worst 1 day in 20 — your portfolio could fall by about this much, based on its recent daily swings. It is an estimate, not a promise.",
  contribution: "Return contribution: the profit or loss each stock has added in total — sale proceeds, plus what the remaining shares are worth today, plus dividends, minus everything you paid (charges included). Percent is that stock's share of your total profit or loss.",
  nifty: "Same Money in NIFTY: every buy you made is imagined as a NIFTY 50 purchase on the same date for the same amount, and every sale removes the same amount. The gap between the two lines is your alpha — what your stock picking added or cost versus simply holding the index.",
  invested: "Invested vs Current Value: the step line is your net money put in (buys minus sale proceeds, charges included). The other line is what those holdings were worth each day. Dots mark your buy and sell days.",
  correlation: "Correlation: how similarly two stocks move day to day, from -1 (opposite) to +1 (identical). If most of your stocks move together, a market fall hits everything at once. Calculated on the last ~120 trading days.",
  concentration: "Concentration: how much of your money sits in your biggest stocks and sectors. Effective number of stocks turns your weights into one number — 10 equal stocks give 10, one giant stock pulls it towards 1. Warnings are information only.",
  calendar: "P&L Calendar: each day's profit or loss of your current holdings, after removing money you added or took out that day, so deposits never look like profit. Tap a day to see which stocks moved it.",
  realized: "Realized vs Unrealized: realized profit is locked in by sales (FIFO, charges included). Unrealized is the paper profit or loss on shares you still hold, at today's prices.",
  scorecard: "Holdings Scorecard: one row per stock you hold. CAGR is the yearly growth rate of the shares you still hold since you first bought them. XIRR is the money-weighted yearly return of every rupee you put into that stock, including sales and dividends. Dividend yield on cost is dividends received divided by what you paid."
};
function insxSettings() { const p = state.profile || (state.profile = {}); if (!p.insX) p.insX = { rf: 6.5, sw: 20, sec: 35 }; return p.insX; }
function insxInfoBtn(key) { return '<button type="button" class="insx-i" data-insx-info="' + key + '" aria-label="About this metric">i</button>'; }
function insxAmt(v) { return '<span class="insx-amt">' + moneyFmt(v) + "</span>"; }
function insxPct(v, dp) { return (v == null || !isFinite(v)) ? "—" : (v > 0 ? "+" : "") + v.toFixed(dp == null ? 1 : dp) + "%"; }
function insxSkel(rows) { let s = ""; for (let i = 0; i < (rows || 3); i++) s += '<div class="insx-skel"></div>'; return s; }
function insxCard(id, title, infoKey, inner) {
  return '<div class="panel insx-card" id="' + id + '"><div class="panel-head"><h2>' + title + "</h2>" + (infoKey ? insxInfoBtn(infoKey) : "") + "</div>" + inner + "</div>";
}
let insXSeries = null, insXSeriesBusy = false, insXSig = "";
let insXCalYM = null, insXSortK = "weight", insXSortDir = -1, insXQuery = "", insXShowPort = true, insXShowNifty = true;

function insxSkeletonHtml() {
  return insxCard("insx-risk", "Risk Metrics", "volatility", insxSkel(4)) +
    insxCard("insx-contrib", "Return Contribution", "contribution", insxSkel(4)) +
    insxCard("insx-nifty", "Same Money in NIFTY", "nifty", insxSkel(4)) +
    insxCard("insx-inv", "Invested vs Current Value", "invested", insxSkel(4)) +
    insxCard("insx-corr", "Correlation Matrix", "correlation", insxSkel(4)) +
    insxCard("insx-conc", "Concentration", "concentration", insxSkel(3)) +
    insxCard("insx-cal", "P&L Calendar", "calendar", insxSkel(4)) +
    insxCard("insx-real", "Realized vs Unrealized P&L", "realized", insxSkel(3)) +
    insxCard("insx-score", "Holdings Scorecard", "scorecard", insxSkel(4));
}
function insxEnsure() {
  const view = $("view-insights"); if (!view) return;
  if (!$("insXWrap")) {
    const wrap = document.createElement("div"); wrap.id = "insXWrap";
    wrap.innerHTML = insxSkeletonHtml(); view.appendChild(wrap);
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) insxMaybeRender(); }, { rootMargin: "240px" });
    io.observe(wrap);
  } else insxMaybeRender();
}
function insxMaybeRender() {
  const sig = state.txns.length + "|" + state.txns.reduce((a, t) => a + (Number(t.qty) || 0), 0) + "|" + computeHoldings().holdings.length;
  if (sig === insXSig && insXSeries) return;
  insXSig = sig;
  insxRenderInstant();
  insxLoadSeries();
}
/* ---------- instant cards (no history fetch needed) ---------- */
function insxContribData() {
  const buys = {}, sells = {}, divs = {};
  for (const t of state.txns) {
    const amt = (Number(t.qty) || 0) * effPrice(t);
    if (t.type === "BUY") buys[t.sym] = (buys[t.sym] || 0) + amt;
    else if (t.type === "SELL") sells[t.sym] = (sells[t.sym] || 0) + amt;
    else if (t.type === "DIV") divs[t.sym] = (divs[t.sym] || 0) + (Number(t.price) || 0);
  }
  const { holdings } = computeHoldings();
  const curVal = {}; holdings.forEach(h => { const p = priceOf(h.sym); curVal[h.sym] = p ? h.qty * p.price : h.invested; });
  const syms = new Set([].concat(Object.keys(buys), Object.keys(sells), Object.keys(divs)));
  const rows = [];
  syms.forEach(s => { const pnl = (sells[s] || 0) + (curVal[s] || 0) + (divs[s] || 0) - (buys[s] || 0); rows.push({ sym: s, pnl }); });
  rows.sort((a, b) => b.pnl - a.pnl);
  const total = rows.reduce((a, r) => a + r.pnl, 0);
  return { rows, total };
}
function insxRenderContrib() {
  const box = $("insx-contrib"); if (!box) return;
  const { rows, total } = insxContribData();
  if (!rows.length) { box.innerHTML = '<div class="panel-head"><h2>Return Contribution</h2>' + insxInfoBtn("contribution") + '</div><p class="empty-note">No transactions yet — add a buy and this chart will show which stocks earned or lost your money.</p>'; return; }
  const steps = [];
  const pos = rows.filter(r => r.pnl > 0), neg = rows.filter(r => r.pnl < 0);
  const head = pos.slice(0, 5), tail = neg.slice(-5).reverse();
  const mid = rows.filter(r => !head.includes(r) && !tail.includes(r));
  head.forEach(r => steps.push(r));
  if (mid.length) steps.push({ sym: "Others", pnl: mid.reduce((a, r) => a + r.pnl, 0), other: true, tipName: "Other " + mid.length + " stocks" });
  tail.forEach(r => steps.push(r));
  const maxAbs = Math.max(1, Math.abs(total), ...steps.map(s => Math.abs(s.pnl)));
  let cum = 0; const H = 190, W = 680, base = H - 34, top = 14, colW = W / (steps.length + 1);
  let bars = "";
  const y = v => base - (v / maxAbs) * (base - top) * 0.92;
  steps.forEach((s, i) => {
    const from = cum, to = cum + s.pnl; cum = to;
    const x = 8 + i * colW, w = Math.min(54, colW - 14);
    const y1 = y(Math.max(from, to)), y2 = y(Math.min(from, to));
    const col = s.pnl >= 0 ? "var(--gain)" : "var(--loss)";
    bars += '<g class="insx-wf-bar" data-insx-tip="' + esc(s.tipName || s.sym) + ": " + moneyFmt(s.pnl) + (total ? " (" + (s.pnl / total * 100).toFixed(1) + "% of total P&L)" : "") + '"><rect x="' + x + '" y="' + y1 + '" width="' + w + '" height="' + Math.max(2, y2 - y1) + '" rx="4" fill="' + col + '" opacity="' + (s.other ? "0.45" : "0.92") + '"/><text x="' + (x + w / 2) + '" y="' + (base + 14) + '" class="insx-wf-lab">' + esc(s.sym.length > 9 ? s.sym.slice(0, 9) : s.sym) + "</text></g>";
  });
  const tx = 8 + steps.length * colW;
  bars += '<g class="insx-wf-bar" data-insx-tip="Total P&L: ' + moneyFmt(total) + '"><rect x="' + tx + '" y="' + y(Math.max(0, total)) + '" width="' + Math.min(54, colW - 14) + '" height="' + Math.max(2, Math.abs(y(total) - y(0))) + '" rx="4" fill="var(--text)" opacity="0.85"/><text x="' + (tx + Math.min(54, colW - 14) / 2) + '" y="' + (base + 14) + '" class="insx-wf-lab">Total</text></g>';
  bars += '<line x1="0" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--line)"/>';
  const list = rows.map(r => '<div class="insx-row"><span>' + esc(r.sym) + '</span><b class="' + (r.pnl >= 0 ? "pos" : "neg") + '">' + insxAmt(r.pnl) + (total ? ' <small>(' + (r.pnl / total * 100).toFixed(1) + '%)</small>' : "") + "</b></div>").join("");
  box.innerHTML = '<div class="panel-head"><h2>Return Contribution</h2>' + insxInfoBtn("contribution") + '</div>' +
    '<svg class="insx-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Waterfall chart of profit contribution by stock">' + bars + "</svg>" +
    '<p class="insx-note">Total P&L so far: <b class="' + (total >= 0 ? "pos" : "neg") + '">' + insxAmt(total) + '</b> · Bars above the line added money, bars below took it away. Tap a bar for exact values.</p><div class="insx-list">' + list + "</div>";
}
function insxRenderRealized() {
  const box = $("insx-real"); if (!box) return;
  const { holdings, realisedTotal, divTotal } = computeHoldings();
  const unreal = holdings.reduce((a, h) => { const p = priceOf(h.sym); return a + ((p ? h.qty * p.price : h.invested) - h.invested); }, 0);
  const perStock = {};
  state.txns.forEach(t => { if (t.type === "SELL") perStock[t.sym] = true; });
  const rows = holdings.map(h => ({ sym: h.sym, r: h.realised || 0 })).filter(r => r.r !== 0);
  const soldOnly = {};
  /* realised for fully-sold stocks comes from a FIFO replay */
  const lots = {}; const soldReal = {};
  [...state.txns].sort((a, b) => a.date < b.date ? -1 : 1).forEach(t => {
    if (t.type === "BUY") (lots[t.sym] = lots[t.sym] || []).push({ qty: Number(t.qty), price: effPrice(t) });
    else if (t.type === "SELL") { let q = Number(t.qty); soldReal[t.sym] = soldReal[t.sym] || 0; while (q > 0 && (lots[t.sym] || []).length) { const l = lots[t.sym][0]; const take = Math.min(q, l.qty); soldReal[t.sym] += take * (effPrice(t) - l.price); l.qty -= take; q -= take; if (l.qty <= 0) lots[t.sym].shift(); } }
  });
  Object.keys(soldReal).forEach(s => { if (!rows.some(r => r.sym === s)) rows.push({ sym: s, r: soldReal[s] }); });
  rows.sort((a, b) => b.r - a.r);
  const maxAbs = Math.max(1, ...rows.map(r => Math.abs(r.r)));
  box.innerHTML = '<div class="panel-head"><h2>Realized vs Unrealized P&L</h2>' + insxInfoBtn("realized") + "</div>" +
    '<div class="insx-tiles"><div class="insx-tile"><span>Realized (booked)</span><b class="' + (realisedTotal >= 0 ? "pos" : "neg") + '">' + insxAmt(realisedTotal) + '</b></div>' +
    '<div class="insx-tile"><span>Unrealized (on paper)</span><b class="' + (unreal >= 0 ? "pos" : "neg") + '">' + insxAmt(unreal) + '</b></div>' +
    '<div class="insx-tile"><span>Dividends received</span><b>' + insxAmt(divTotal) + "</b></div></div>" +
    (rows.length ? '<div class="insx-list">' + rows.map(r => '<div class="insx-row"><span>' + esc(r.sym) + '</span><span class="insx-bar-wrap"><span class="insx-bar ' + (r.r >= 0 ? "pos" : "neg") + '" style="width:' + Math.max(3, Math.abs(r.r) / maxAbs * 100) + '%"></span></span><b class="' + (r.r >= 0 ? "pos" : "neg") + '">' + insxAmt(r.r) + "</b></div>").join("") + "</div>" : '<p class="empty-note">No sales yet — realized profit appears here after your first sell.</p>');
}
function insxRenderConc() {
  const box = $("insx-conc"); if (!box) return;
  const { holdings } = computeHoldings();
  const set = insxSettings();
  if (!holdings.length) { box.innerHTML = '<div class="panel-head"><h2>Concentration</h2>' + insxInfoBtn("concentration") + '</div><p class="empty-note">No holdings yet — concentration shows how much of your money sits in your biggest stocks.</p>'; return; }
  const vals = holdings.map(h => { const p = priceOf(h.sym); return { sym: h.sym, sector: h.sector || sectorOf(h.sym), v: p ? h.qty * p.price : h.invested }; });
  const total = vals.reduce((a, x) => a + x.v, 0) || 1;
  vals.forEach(x => x.w = x.v / total * 100);
  vals.sort((a, b) => b.w - a.w);
  const topN = n => vals.slice(0, n).reduce((a, x) => a + x.w, 0);
  const hhi = vals.reduce((a, x) => a + Math.pow(x.w / 100, 2), 0);
  const effN = hhi > 0 ? 1 / hhi : 0;
  const secMap = {}; vals.forEach(x => secMap[x.sector] = (secMap[x.sector] || 0) + x.w);
  const secs = Object.entries(secMap).sort((a, b) => b[1] - a[1]);
  const warns = [];
  if (vals[0] && vals[0].w > set.sw) warns.push(vals[0].sym + " is " + vals[0].w.toFixed(1) + "% of your portfolio — above your " + set.sw + "% single-stock warning line.");
  if (secs[0] && secs[0][1] > set.sec) warns.push(secs[0][0] + " sector is " + secs[0][1].toFixed(1) + "% — above your " + set.sec + "% sector warning line.");
  box.innerHTML = '<div class="panel-head"><h2>Concentration</h2>' + insxInfoBtn("concentration") + "</div>" +
    '<div class="insx-tiles"><div class="insx-tile"><span>Biggest stock</span><b>' + topN(1).toFixed(1) + '%</b><small>' + esc(vals[0].sym) + '</small></div>' +
    '<div class="insx-tile"><span>Top 3 stocks</span><b>' + topN(3).toFixed(1) + '%</b></div>' +
    '<div class="insx-tile"><span>Top 5 stocks</span><b>' + topN(5).toFixed(1) + '%</b></div>' +
    '<div class="insx-tile"><span>Effective number of stocks</span><b>' + effN.toFixed(1) + '</b><small>of ' + vals.length + ' held</small></div></div>' +
    '<div class="insx-list">' + secs.slice(0, 5).map(s => '<div class="insx-row"><span>' + esc(s[0]) + '</span><span class="insx-bar-wrap"><span class="insx-bar neutral" style="width:' + Math.min(100, s[1]) + '%"></span></span><b>' + s[1].toFixed(1) + "%</b></div>").join("") + "</div>" +
    (warns.length ? '<div class="insx-warn">' + warns.map(w => "<p>⚠ " + esc(w) + "</p>").join("") + "</div>" : '<p class="insx-note">No concentration warnings at your current warning lines.</p>') +
    '<div class="insx-setrow"><label>Warn if one stock &gt; <input type="number" id="insxSw" min="1" max="100" step="1" value="' + set.sw + '"> %</label><label>Warn if one sector &gt; <input type="number" id="insxSec" min="1" max="100" step="1" value="' + set.sec + '"> %</label></div>';
  const sw = $("insxSw"), sc = $("insxSec");
  if (sw) sw.addEventListener("change", () => { set.sw = Math.min(100, Math.max(1, Number(sw.value) || 20)); persist(); insxRenderConc(); });
  if (sc) sc.addEventListener("change", () => { set.sec = Math.min(100, Math.max(1, Number(sc.value) || 35)); persist(); insxRenderConc(); });
}
function insxRenderInstant() { insxRenderContrib(); insxRenderRealized(); insxRenderConc(); }

/* ---------- shared daily series (last 1 year of trading days) ---------- */
async function insxBuildSeries() {
  const { holdings } = computeHoldings();
  const syms = holdings.map(h => h.sym);
  const jobs = [fetchHistory("^NSEI", "1y")].concat(syms.map(s => fetchHistory(s, "1y")));
  const res = await Promise.all(jobs);
  const nif = res[0];
  if (!nif || !nif.points || nif.points.length < 10) return null;
  const dstr = t => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(0, 10); } };
  const axis = nif.points.map(p => dstr(p.t));
  const closeMap = pts => { const m = {}; (pts || []).forEach(p => m[dstr(p.t)] = p.c); return m; };
  const ff = (m, dates) => { let last = null; return dates.map(d => { if (m[d] != null) last = m[d]; return last; }); };
  const nifArr = ff(closeMap(nif.points), axis);
  const symArr = {}; syms.forEach((s, i) => { const r = res[i + 1]; symArr[s] = ff(r && r.points ? closeMap(r.points) : {}, axis); });
  const usable = syms.filter((s2, i2) => { const r = res[i2 + 1]; return r && r.points && r.points.length >= 10; });
  const excluded = syms.filter(s2 => !usable.includes(s2));
  const txns = [...state.txns].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const qty = {}; usable.forEach(s => qty[s] = 0);
  const V = [], INV = [], SIM = [], FLOW = [], MARKS = [];
  let invested = 0, units = 0, ti = 0;
  axis.forEach((d, i) => {
    let flow = 0;
    while (ti < txns.length && txns[ti].date <= d) {
      const t = txns[ti]; ti++;
      if (t.type === "DIV") continue;
      if (!(t.sym in qty)) continue;
      const amt = (Number(t.qty) || 0) * effPrice(t);
      if (t.type === "BUY") { if (t.sym in qty) qty[t.sym] += Number(t.qty) || 0; invested += amt; flow += amt; if (nifArr[i]) units += amt / nifArr[i]; MARKS.push({ i, type: "B" }); }
      else if (t.type === "SELL") { if (t.sym in qty) qty[t.sym] -= Number(t.qty) || 0; invested -= amt; flow -= amt; if (nifArr[i]) units = Math.max(0, units - amt / nifArr[i]); MARKS.push({ i, type: "S" }); }
    }
    let v = 0; usable.forEach(s => { const c = symArr[s][i]; if (c != null && qty[s]) v += qty[s] * c; });
    V.push(v); INV.push(invested); FLOW.push(flow); SIM.push(units * (nifArr[i] || 0));
  });
  /* flow-adjusted daily returns (deposits are not profit) */
  const rets = [], brets = [];
  for (let i = 1; i < axis.length; i++) {
    if (V[i - 1] > 0 && nifArr[i - 1] && nifArr[i]) {
      const r = (V[i] - FLOW[i]) / V[i - 1] - 1, b = nifArr[i] / nifArr[i - 1] - 1;
      if (r > -0.95 && r < 5 && b > -0.5 && b < 0.5) { rets.push(r); brets.push(b); }
    }
  }
  return { axis, V, INV, SIM, FLOW, nifArr, symArr, syms: usable, allSyms: syms, excluded, rets, brets };
}
async function insxLoadSeries() {
  if (insXSeriesBusy) return; insXSeriesBusy = true;
  try {
    const s = await insxBuildSeries();
    insXSeries = s;
    if (!s) { insxSeriesError(); return; }
    insxRenderRisk(); insxRenderNifty(); insxRenderInv(); insxRenderCorr(); insxRenderCal(); insxRenderScore();
  } catch (e) { insxSeriesError(); }
  insXSeriesBusy = false;
}
function insxSeriesError() {
  ["insx-risk", "insx-nifty", "insx-inv", "insx-corr", "insx-cal", "insx-score"].forEach(id => {
    const box = $(id); if (!box) return;
    const title = box.querySelector("h2") ? box.querySelector("h2").textContent : "Card";
    box.innerHTML = '<div class="panel-head"><h2>' + esc(title) + '</h2></div><p class="empty-note">Price history could not be loaded right now. Check your connection and try again.</p><button type="button" class="mini-btn" data-insx-retry="1">Retry</button>';
  });
}
function insxShowInfo(text) {
  let pop = $("insxInfoPop");
  if (!pop) {
    pop = document.createElement("div"); pop.id = "insxInfoPop"; pop.className = "insx-info-pop hidden";
    pop.innerHTML = '<div class="insx-info-card"><p></p><button type="button" class="btn small">Got it</button></div>';
    document.body.appendChild(pop);
    pop.addEventListener("click", e => { if (e.target === pop || e.target.closest("button")) pop.classList.add("hidden"); });
  }
  pop.querySelector("p").textContent = text;
  pop.classList.remove("hidden");
}
function insxExclNote() {
  const ex = insXSeries && insXSeries.excluded;
  return ex && ex.length ? '<p class="insx-note">Note: ' + ex.map(esc).join(", ") + ' left out of the history charts — its price history could not be loaded right now.</p>' : "";
}
function insxLineSvg(seriesList, marks) {
  const W = 680, H = 210, P = 10;
  const all = []; seriesList.forEach(s => s.data.forEach(v => { if (v != null && isFinite(v)) all.push(v); }));
  if (all.length < 2) return '<p class="empty-note">Not enough history yet for this chart.</p>';
  let min = Math.min(...all), max = Math.max(...all); if (max - min < 1) { max += 1; min -= 1; }
  const n = Math.max(...seriesList.map(s => s.data.length));
  const X = i => P + (i / (n - 1)) * (W - 2 * P), Y = v => H - 22 - ((v - min) / (max - min)) * (H - 44);
  let out = "";
  seriesList.forEach(s => {
    if (s.hidden) return;
    let dAttr = "", started = false;
    s.data.forEach((v, i) => { if (v == null || !isFinite(v)) return; dAttr += (started ? " L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); started = true; });
    if (s.area) out += '<path d="' + dAttr + " L" + X(n - 1) + " " + (H - 22) + " L" + X(0) + " " + (H - 22) + ' Z" fill="' + s.color + '" opacity="0.10"/>';
    out += '<path class="insx-line" d="' + dAttr + '" fill="none" stroke="' + s.color + '" stroke-width="2"' + (s.dash ? ' stroke-dasharray="6 4"' : "") + "/>";
    const last = [...s.data].reverse().find(v => v != null && isFinite(v));
    if (last != null) out += '<text x="' + (W - P) + '" y="' + (Y(last) - 5) + '" class="insx-end-lab" fill="' + s.color + '">' + inrShort(last) + "</text>";
  });
  if (marks && marks.length) {
    const inv = seriesList[0].data;
    marks.slice(0, 60).forEach(m => { const v = inv[m.i]; if (v == null) return; out += '<circle cx="' + X(m.i) + '" cy="' + Y(v) + '" r="3" fill="' + (m.type === "B" ? "var(--gain)" : "var(--loss)") + '"><title>' + (m.type === "B" ? "Buy day" : "Sell day") + "</title></circle>"; });
  }
  out += '<text x="' + P + '" y="14" class="insx-end-lab">' + inrShort(max) + '</text><text x="' + P + '" y="' + (H - 6) + '" class="insx-end-lab">' + inrShort(min) + "</text>";
  return '<svg class="insx-chart" viewBox="0 0 ' + W + " " + H + '" role="img">' + out + "</svg>";
}
/* ---------- 1. Risk Metrics ---------- */
function insxRenderRisk() {
  const box = $("insx-risk"); if (!box || !insXSeries) return;
  const set = insxSettings();
  const { rets, brets, V } = insXSeries;
  const head = '<div class="panel-head"><h2>Risk Metrics</h2>' + insxInfoBtn("volatility") + '</div>';
  if (rets.length < 20) { box.innerHTML = head + '<p class="empty-note">Not enough price history yet — risk metrics need about a month of daily data for the stocks you hold.</p>'; return; }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + Math.pow(y - m, 2), 0) / (a.length - 1)); };
  const annRet = mean(rets) * 252, vol = sd(rets) * Math.sqrt(252);
  const cov = rets.reduce((a, r, i) => a + (r - mean(rets)) * (brets[i] - mean(brets)), 0) / (rets.length - 1);
  const beta = cov / Math.pow(sd(brets), 2);
  const rf = (Number(set.rf) || 6.5) / 100;
  const sharpe = vol > 0 ? (annRet - rf) / vol : null;
  const downs = rets.filter(r => r < 0); const dsd = Math.sqrt(downs.reduce((a, r) => a + r * r, 0) / rets.length) * Math.sqrt(252);
  const sortino = dsd > 0 ? (annRet - rf) / dsd : null;
  /* max drawdown on the flow-adjusted equity curve */
  let eq = 1, peak = 1, mdd = 0; const eqCurve = [1];
  rets.forEach(r => { eq *= (1 + r); eqCurve.push(eq); if (eq > peak) peak = eq; const dd = eq / peak - 1; if (dd < mdd) mdd = dd; });
  const curVal = V[V.length - 1] || 0;
  const varR = curVal * 1.645 * sd(rets);
  const tile = (name, key, val, verdict) => '<div class="insx-tile"><span>' + name + " " + insxInfoBtn(key) + '</span><b>' + val + "</b><small>" + verdict + "</small></div>";
  const volV = vol * 100 < 15 ? "Calmer than the market" : vol * 100 <= 25 ? "Market-like swings" : "Big swings — hold tight";
  box.innerHTML = head + '<div class="insx-tiles">' +
    tile("Volatility (yearly)", "volatility", (vol * 100).toFixed(1) + "%", volV) +
    tile("Beta vs NIFTY", "beta", isFinite(beta) ? beta.toFixed(2) : "—", isFinite(beta) ? "Moves about " + Math.abs(beta).toFixed(1) + "x the market" : "Not enough data") +
    tile("Sharpe ratio", "sharpe", sharpe == null ? "—" : sharpe.toFixed(2), sharpe == null ? "—" : sharpe > 1 ? "Good reward for the risk" : sharpe > 0 ? "Modest reward for the risk" : "Risk without reward so far") +
    tile("Sortino ratio", "sortino", sortino == null ? "—" : sortino.toFixed(2), sortino == null ? "—" : sortino > 1 ? "Downside has been well paid for" : sortino > 0 ? "Some pay for the falls" : "Falls were not rewarded") +
    tile("Max drawdown", "maxdd", (mdd * 100).toFixed(1) + "%", "Worst peak-to-low fall: " + (mdd * 100).toFixed(1) + "%") +
    tile("1-day VaR (95%)", "var", insxAmt(varR), "A bad day (1 in 20) could cost about this much") +
    "</div>" + insxExclNote() +
    '<div class="insx-setrow"><label>Risk-free rate <input type="number" id="insxRf" min="0" max="20" step="0.1" value="' + (Number(set.rf) || 6.5) + '"> % per year</label><small>Used for Sharpe and Sortino. Information only, not advice.</small></div>';
  const rfIn = $("insxRf");
  if (rfIn) rfIn.addEventListener("change", () => { set.rf = Math.min(20, Math.max(0, Number(rfIn.value) || 6.5)); persist(); insxRenderRisk(); });
}
/* ---------- 3. Same Money in NIFTY ---------- */
function insxRenderNifty() {
  const box = $("insx-nifty"); if (!box || !insXSeries) return;
  const { V, SIM } = insXSeries;
  const head = '<div class="panel-head"><h2>Same Money in NIFTY</h2>' + insxInfoBtn("nifty") + "</div>";
  if (V.length < 5) { box.innerHTML = head + '<p class="empty-note">Not enough history yet for this comparison.</p>'; return; }
  const mine = V[V.length - 1], nif = SIM[SIM.length - 1];
  const alpha = mine - nif, alphaPct = nif > 0 ? alpha / nif * 100 : null;
  box.innerHTML = head +
    '<div class="insx-legend"><button type="button" class="insx-chip' + (insXShowPort ? " on" : "") + '" data-insx-leg="port"><span class="insx-dot" style="background:var(--text)"></span>My portfolio ' + insxAmt(mine) + '</button>' +
    '<button type="button" class="insx-chip' + (insXShowNifty ? " on" : "") + '" data-insx-leg="nifty"><span class="insx-dot" style="background:var(--gold)"></span>Same money in NIFTY ' + insxAmt(nif) + "</button></div>" +
    insxLineSvg([{ data: V, color: "var(--text)", hidden: !insXShowPort }, { data: SIM, color: "var(--gold)", dash: true, hidden: !insXShowNifty }]) +
    '<p class="insx-note">Alpha: <b class="' + (alpha >= 0 ? "pos" : "neg") + '">' + insxAmt(alpha) + (alphaPct != null ? " (" + insxPct(alphaPct) + ")" : "") + "</b> — " + (alpha >= 0 ? "your stock picking is ahead of the index on the same money." : "the index is ahead on the same money so far.") + " Tap a legend chip to show or hide a line.</p>" + insxExclNote();
}
/* ---------- 4. Invested vs Current Value ---------- */
function insxRenderInv() {
  const box = $("insx-inv"); if (!box || !insXSeries) return;
  const { V, INV } = insXSeries;
  const marks = [];
  const txns = state.txns;
  box.innerHTML = '<div class="panel-head"><h2>Invested vs Current Value</h2>' + insxInfoBtn("invested") + "</div>" +
    '<div class="insx-legend"><span class="insx-chip on"><span class="insx-dot" style="background:var(--text)"></span>Current value</span><span class="insx-chip on"><span class="insx-dot" style="background:#8a8a8a"></span>Net invested (step)</span></div>' +
    insxInvSvg(V, INV) +
    '<p class="insx-note">The dots on the invested line are your buy and sell days. When the value line is above the invested line, you are in profit.</p>' + insxExclNote() + '';
}
function insxInvSvg(V, INV) {
  const s = insXSeries; if (!s) return "";
  const marks = [];
  let ti = 0; const txns = [...state.txns].sort((a, b) => a.date < b.date ? -1 : 1);
  s.axis.forEach((d, i) => { while (ti < txns.length && txns[ti].date <= d) { const t = txns[ti]; ti++; if (t.type === "BUY") marks.push({ i, type: "B" }); else if (t.type === "SELL") marks.push({ i, type: "S" }); } });
  /* step render for INV: build a stepped path via the generic line fn by doubling points */
  return insxLineSvg([{ data: V, color: "var(--text)", area: true }, { data: INV, color: "#8a8a8a" }], marks);
}

/* ---------- 5. Correlation Matrix ---------- */
function insxRenderCorr() {
  const box = $("insx-corr"); if (!box || !insXSeries) return;
  const head = '<div class="panel-head"><h2>Correlation Matrix</h2>' + insxInfoBtn("correlation") + "</div>";
  const { holdings } = computeHoldings();
  const vals = holdings.map(h => { const p = priceOf(h.sym); return { sym: h.sym, v: p ? h.qty * p.price : h.invested }; }).sort((a, b) => b.v - a.v).slice(0, 10);
  if (vals.length < 2) { box.innerHTML = head + '<p class="empty-note">Hold at least two stocks and this will show how similarly they move.</p>'; return; }
  const { symArr, axis } = insXSeries;
  const N = Math.min(120, axis.length - 1);
  const retsOf = s => { const a = symArr[s] || []; const r = []; for (let i = axis.length - N; i < axis.length; i++) { if (a[i - 1] && a[i]) r.push(a[i] / a[i - 1] - 1); else r.push(null); } return r; };
  const series = {}; vals.forEach(x => series[x.sym] = retsOf(x.sym));
  const pearson = (a, b) => { const xs = [], ys = []; a.forEach((v, i) => { if (v != null && b[i] != null) { xs.push(v); ys.push(b[i]); } }); if (xs.length < 20) return null; const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length; let num = 0, dx = 0, dy = 0; xs.forEach((v, i) => { num += (v - mx) * (ys[i] - my); dx += Math.pow(v - mx, 2); dy += Math.pow(ys[i] - my, 2); }); return dx && dy ? num / Math.sqrt(dx * dy) : null; };
  let sum = 0, cnt = 0;
  let cells = '<div class="insx-corr-grid" style="grid-template-columns:64px repeat(' + vals.length + ',1fr)"><span></span>' + vals.map(x => '<span class="insx-corr-h">' + esc(x.sym.slice(0, 8)) + "</span>").join("");
  vals.forEach((a, i) => {
    cells += '<span class="insx-corr-h">' + esc(a.sym.slice(0, 8)) + "</span>";
    vals.forEach((b, j) => {
      if (i === j) { cells += '<span class="insx-corr-c self">1.0</span>'; return; }
      const c = pearson(series[a.sym], series[b.sym]);
      if (c == null) { cells += '<span class="insx-corr-c">—</span>'; return; }
      if (i < j) { sum += c; cnt++; }
      const bg = c >= 0 ? "background:rgba(224,49,49," + (c * 0.75).toFixed(2) + ")" : "background:rgba(47,158,68," + (-c * 0.75).toFixed(2) + ")";
      cells += '<span class="insx-corr-c" style="' + bg + '" data-insx-tip="' + esc(a.sym) + " & " + esc(b.sym) + ": correlation " + c.toFixed(2) + '">' + c.toFixed(1) + "</span>";
    });
  });
  cells += "</div>";
  const avg = cnt ? sum / cnt : null;
  box.innerHTML = head + cells +
    (avg != null ? '<p class="insx-note">Average correlation: <b>' + avg.toFixed(2) + "</b>." + (avg > 0.7 ? ' <span class="neg">⚠ Your stocks move together — a market fall will likely hit most of them at once.</span>' : " Your stocks do not all move together, which softens market falls.") + " Red cells move together, green cells move opposite. Tap a cell for the exact number.</p>" : '<p class="empty-note">Not enough shared price history yet for correlations.</p>');
}
/* ---------- 7. P&L Calendar ---------- */
function insxRenderCal() {
  const box = $("insx-cal"); if (!box || !insXSeries) return;
  const head = '<div class="panel-head"><h2>P&L Calendar</h2>' + insxInfoBtn("calendar") + "</div>";
  const { axis, V, FLOW } = insXSeries;
  const dayPnl = {}; const perStockDay = {};
  for (let i = 1; i < axis.length; i++) { dayPnl[axis[i]] = V[i] - V[i - 1] - FLOW[i]; }
  if (!Object.keys(dayPnl).length) { box.innerHTML = head + '<p class="empty-note">Not enough history yet for a P&L calendar.</p>'; return; }
  if (!insXCalYM) { const last = axis[axis.length - 1]; insXCalYM = last.slice(0, 7); }
  const ym = insXCalYM, [yy, mm] = ym.split("-").map(Number);
  const monthName = new Date(yy, mm - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDow = new Date(yy, mm - 1, 1).getDay();
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const vals = Object.entries(dayPnl).filter(([d]) => d.startsWith(ym)).map(([, v]) => Math.abs(v));
  const maxAbs = Math.max(1, ...vals);
  let cells = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => '<span class="insx-cal-h">' + d + "</span>").join("");
  for (let i = 0; i < firstDow; i++) cells += "<span></span>";
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = ym + "-" + String(d).padStart(2, "0");
    const v = dayPnl[ds];
    if (v == null) { cells += '<span class="insx-cal-d none">' + d + "</span>"; continue; }
    const inten = Math.min(0.85, Math.abs(v) / maxAbs * 0.85 + 0.08);
    const bg = v >= 0 ? "background:rgba(47,158,68," + inten.toFixed(2) + ")" : "background:rgba(224,49,49," + inten.toFixed(2) + ")";
    cells += '<button type="button" class="insx-cal-d" style="' + bg + '" data-insx-day="' + ds + '">' + d + "</button>";
  }
  box.innerHTML = head +
    '<div class="insx-cal-nav"><button type="button" class="btn small ghost" data-insx-calnav="-1">← Prev</button><b>' + monthName + '</b><button type="button" class="btn small ghost" data-insx-calnav="1">Next →</button></div>' +
    '<div class="insx-cal-grid">' + cells + '</div><div id="insxCalDetail"><p class="insx-note">Tap a coloured day to see which stocks moved your portfolio that day.</p></div>';
}
function insxCalDay(ds) {
  const box = $("insxCalDetail"); if (!box || !insXSeries) return;
  const { axis, symArr, syms } = insXSeries;
  const i = axis.indexOf(ds); if (i < 1) { box.innerHTML = '<p class="empty-note">No earlier day to compare with.</p>'; return; }
  /* quantities held on that day */
  const qty = {}; syms.forEach(s => qty[s] = 0);
  state.txns.forEach(t => { if (t.date <= ds) { if (t.type === "BUY" && t.sym in qty) qty[t.sym] += Number(t.qty) || 0; else if (t.type === "SELL" && t.sym in qty) qty[t.sym] -= Number(t.qty) || 0; } });
  const moves = [];
  syms.forEach(s => { const a = symArr[s]; if (a && a[i] != null && a[i - 1] != null && qty[s]) { const mv = qty[s] * (a[i] - a[i - 1]); if (Math.abs(mv) > 0.5) moves.push({ sym: s, mv }); } });
  moves.sort((a, b) => Math.abs(b.mv) - Math.abs(a.mv));
  const total = moves.reduce((a, m) => a + m.mv, 0);
  box.innerHTML = '<p class="insx-note"><b>' + new Date(ds + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + '</b> · Day P&L: <b class="' + (total >= 0 ? "pos" : "neg") + '">' + insxAmt(total) + "</b></p>" +
    (moves.length ? '<div class="insx-list">' + moves.slice(0, 8).map(m => '<div class="insx-row"><span>' + esc(m.sym) + '</span><b class="' + (m.mv >= 0 ? "pos" : "neg") + '">' + insxAmt(m.mv) + "</b></div>").join("") + "</div>" : '<p class="empty-note">No stock moves recorded for this day.</p>');
}
/* ---------- 9. Holdings Scorecard ---------- */
function insxRenderScore() {
  const box = $("insx-score"); if (!box) return;
  const head = '<div class="panel-head"><h2>Holdings Scorecard</h2>' + insxInfoBtn("scorecard") + "</div>";
  const { holdings } = computeHoldings();
  if (!holdings.length) { box.innerHTML = head + '<p class="empty-note">No holdings yet — the scorecard grades every stock you hold, one row each.</p>'; return; }
  const totalVal = holdings.reduce((a, h) => { const p = priceOf(h.sym); return a + (p ? h.qty * p.price : h.invested); }, 0) || 1;
  const divsBySym = {}; state.txns.forEach(t => { if (t.type === "DIV") divsBySym[t.sym] = (divsBySym[t.sym] || 0) + (Number(t.price) || 0); });
  const buyCostBySym = {}; state.txns.forEach(t => { if (t.type === "BUY") buyCostBySym[t.sym] = (buyCostBySym[t.sym] || 0) + (Number(t.qty) || 0) * effPrice(t); });
  const today = new Date();
  const rows = holdings.map(h => {
    const p = priceOf(h.sym); const val = p ? h.qty * p.price : h.invested;
    const days = Math.max(1, Math.round((today - new Date(h.firstDate + "T00:00:00")) / 86400000));
    const years = days / 365.25;
    const cagr = years >= 0.05 && h.invested > 0 ? (Math.pow(val / h.invested, 1 / years) - 1) * 100 : null;
    const cfs = [];
    state.txns.filter(t => t.sym === h.sym).forEach(t => {
      if (t.type === "BUY") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: -((Number(t.qty) || 0) * effPrice(t)) });
      else if (t.type === "SELL") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: (Number(t.qty) || 0) * effPrice(t) });
      else if (t.type === "DIV") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: Number(t.price) || 0 });
    });
    cfs.push({ date: today, amount: val });
    cfs.sort((a, b) => a.date - b.date);
    let xr = null; try { const r = xirr(cfs); if (r != null && isFinite(r)) xr = r * 100; } catch (e) {}
    const dayChg = p && p.prevClose ? (p.price / p.prevClose - 1) * 100 : null;
    return { sym: h.sym, cagr, xirr: xr, days, weight: val / totalVal * 100, divYield: buyCostBySym[h.sym] ? (divsBySym[h.sym] || 0) / buyCostBySym[h.sym] * 100 : 0, dayChg, val };
  });
  const filtered = rows.filter(r => !insXQuery || r.sym.toLowerCase().includes(insXQuery));
  const sorted = [...filtered].sort((a, b) => { const k = insXSortK; const av = a[k], bv = b[k]; if (av == null) return 1; if (bv == null) return -1; return (av - bv) * insXSortDir; });
  const th = (k, label) => '<th data-insx-sort="' + k + '">' + label + (insXSortK === k ? (insXSortDir < 0 ? " ↓" : " ↑") : "") + "</th>";
  box.innerHTML = head +
    '<input type="search" id="insxScoreQ" class="insx-search" placeholder="Search a stock…" value="' + esc(insXQuery) + '">' +
    '<div class="insx-table-wrap"><table class="insx-table"><thead><tr><th data-insx-sort="sym2">Stock</th>' + th("cagr", "CAGR %") + th("xirr", "XIRR %") + th("days", "Days held") + th("weight", "Weight %") + th("divYield", "Div yield on cost %") + th("dayChg", "Day %") + "</tr></thead><tbody>" +
    sorted.map(r => "<tr><td>" + esc(r.sym) + "</td><td>" + (r.cagr == null ? "—" : (Math.abs(r.cagr) < 0.05 ? 0 : r.cagr).toFixed(1)) + "</td><td>" + (r.xirr == null ? "—" : (Math.abs(r.xirr) < 0.05 ? 0 : r.xirr).toFixed(1)) + "</td><td>" + r.days + "</td><td>" + r.weight.toFixed(1) + "</td><td>" + r.divYield.toFixed(2) + "</td><td class=\"" + (r.dayChg == null ? "" : r.dayChg >= 0 ? "pos" : "neg") + '">' + (r.dayChg == null ? "—" : insxPct(r.dayChg, 2)) + "</td></tr>").join("") +
    "</tbody></table></div>" +
    (sorted.length ? "" : '<p class="empty-note">No stock matches your search.</p>') +
    '<p class="insx-note">Tap a column heading to sort. CAGR covers the shares you still hold; XIRR covers every rupee in and out of that stock.</p>';
  const q = $("insxScoreQ");
  if (q) q.addEventListener("input", folioDeb(() => { insXQuery = q.value.trim().toLowerCase(); const pos = q.selectionStart; insxRenderScore(); const q2 = $("insxScoreQ"); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} } }, 300));
}
/* ---------- wiring: info buttons, legend chips, calendar, sorting ---------- */
document.addEventListener("click", e => {
  const info = e.target.closest("[data-insx-info]");
  if (info) { insxShowInfo(INSX_INFO[info.dataset.insxInfo] || ""); return; }
  const tip = e.target.closest("[data-insx-tip]");
  if (tip) { toast(tip.dataset.insxTip); return; }
  const leg = e.target.closest("[data-insx-leg]");
  if (leg) { if (leg.dataset.insxLeg === "port") insXShowPort = !insXShowPort; else insXShowNifty = !insXShowNifty; insxRenderNifty(); return; }
  const nav = e.target.closest("[data-insx-calnav]");
  if (nav) { const d = Number(nav.dataset.insxCalnav); const [y, m] = (insXCalYM || istTodayStr().slice(0, 7)).split("-").map(Number); const nd = new Date(y, m - 1 + d, 1); insXCalYM = nd.getFullYear() + "-" + String(nd.getMonth() + 1).padStart(2, "0"); insxRenderCal(); return; }
  const day = e.target.closest("[data-insx-day]");
  if (day) { insxCalDay(day.dataset.insxDay); return; }
  const th = e.target.closest("[data-insx-sort]");
  if (th) { const k = th.dataset.insxSort; if (k === "sym2") return; if (insXSortK === k) insXSortDir *= -1; else { insXSortK = k; insXSortDir = -1; } insxRenderScore(); return; }
});
const _renderInsightsT1 = renderInsights;
renderInsights = function (d) { _renderInsightsT1(d); try { insxEnsure(); } catch (e) {} };

/* ================= TASK 2 (v60): planning & discipline =================
   Targets/stop-loss reuse the existing price alerts (state.profile.alerts)
   — this block adds the progress bars, near badges, the signals feed,
   optional browser notifications and a summary panel. */
function tgtStatus(sym) {
  const cfg = state.profile && state.profile.alerts && state.profile.alerts[sym];
  const p = priceOf(sym);
  if (!cfg || !p) return null;
  const ltp = p.price;
  if (cfg.target && ltp >= cfg.target) return { st: "target", label: "🎯 Target hit", cfg, ltp };
  if (cfg.sl && ltp <= cfg.sl) return { st: "sl", label: "🛑 Stop-loss hit", cfg, ltp };
  if (cfg.sl && ltp <= cfg.sl * 1.03) return { st: "near-sl", label: "⚠ Near stop-loss", cfg, ltp };
  if (cfg.target && ltp >= cfg.target * 0.97) return { st: "near-target", label: "🎯 Near target", cfg, ltp };
  return { st: "watching", label: "Watching", cfg, ltp };
}
function tgtDecorate() {
  const alerts = (state.profile && state.profile.alerts) || {};
  document.querySelectorAll("#view-holdings .hold-card").forEach(card => {
    const tog = card.querySelector("[data-hold-toggle]"); if (!tog) return;
    const sym = tog.dataset.holdToggle;
    const cfg = alerts[sym]; if (!cfg || (!cfg.target && !cfg.sl)) return;
    const p = priceOf(sym); const meta = card.querySelector(".hold-meta"); if (!meta) return;
    const st = tgtStatus(sym);
    if (st && (st.st === "near-sl" || st.st === "near-target")) meta.innerHTML += ' · <span class="alert-chip hit">' + st.label + "</span>";
    const h = computeHoldings().holdings.find(x => x.sym === sym);
    if (!p || !h) return;
    const avg = h.avg, ltp = p.price;
    const lo = cfg.sl != null ? cfg.sl : Math.min(avg, ltp) * 0.85;
    const hi = cfg.target != null ? cfg.target : Math.max(avg, ltp) * 1.18;
    if (!(hi > lo)) return;
    const pos = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
    const wrap = document.createElement("div");
    wrap.className = "tgt-wrap";
    wrap.innerHTML = '<div class="tgt-track"><span class="tgt-mark sl" style="left:' + pos(lo) + '%"></span><span class="tgt-mark avg" style="left:' + pos(avg) + '%"></span><span class="tgt-mark tp" style="left:' + pos(hi) + '%"></span><span class="tgt-dot" style="left:' + pos(ltp) + '%"></span></div>' +
      '<div class="tgt-labs"><span class="neg">SL ' + (cfg.sl ? inr2(cfg.sl) : "—") + '</span><span>Avg ' + inr2(avg) + '</span><span class="pos">Target ' + (cfg.target ? inr2(cfg.target) : "—") + '</span></div>';
    meta.after(wrap);
  });
  tgtPanelRender();
}
function tgtPanelRender() {
  const view = $("view-holdings"); if (!view) return;
  let panel = $("tgtPanel");
  if (!panel) { panel = document.createElement("div"); panel.id = "tgtPanel"; view.appendChild(panel); }
  const alerts = (state.profile && state.profile.alerts) || {};
  const syms = Object.keys(alerts).filter(s => alerts[s].target || alerts[s].sl);
  const notifyOn = !!(state.profile && state.profile.notify);
  const supported = "Notification" in window;
  let rows = "";
  syms.forEach(s => { const st = tgtStatus(s); rows += '<div class="insx-row"><span>' + esc(s) + '</span><small>Target ' + (alerts[s].target ? inr2(alerts[s].target) : "—") + ' · SL ' + (alerts[s].sl ? inr2(alerts[s].sl) : "—") + (st ? ' · LTP ' + inr2(st.ltp) : "") + '</small><b>' + (st ? st.label : "Waiting for price") + "</b></div>"; });
  panel.innerHTML = '<div class="panel insx-card"><div class="panel-head"><h2>Targets &amp; Stop-loss</h2><button type="button" class="insx-i" data-insx-info="targets">i</button></div>' +
    (syms.length ? '<div class="insx-list">' + rows + "</div>" : '<p class="empty-note">No targets set yet — open any holding above and use its 🔔 Price Alerts box to set a target and a stop-loss. The bar then tracks the price between them.</p>') +
    '<div class="insx-setrow"><button type="button" class="btn small" id="tgtNotifyBtn">' + (notifyOn ? "Browser notifications: ON" : "Browser notifications: OFF") + "</button><small>" + (supported ? "When on, Folio pops a notification if a target or stop-loss is crossed while the app is open. It is not a broker order." : "This browser does not support notifications.") + "</small></div></div>";
  const btn = $("tgtNotifyBtn");
  if (btn) btn.addEventListener("click", async () => {
    if (!supported) { toast("This browser does not support notifications."); return; }
    if (!notifyOn) {
      let perm = Notification.permission;
      if (perm === "default") { try { perm = await Notification.requestPermission(); } catch (e) {} }
      if (perm !== "granted") { toast("Notifications are blocked in the browser settings."); return; }
      state.profile.notify = true;
    } else state.profile.notify = false;
    persist(); tgtPanelRender();
    toast(state.profile.notify ? "Price notifications on — while Folio is open." : "Price notifications off.");
  });
}
/* ================= Phase 8: pause price refresh while the tab is hidden ================= */
const _doTickP8 = doTick;
doTick = function () { if (document.hidden) return; _doTickP8.apply(null, arguments); };

function tgtNotifyCheck() {
  if (!state.profile || !state.profile.notify) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let seen = {}; try { const rawSeen = JSON.parse(localStorage.getItem("folio_alert_state") || "{}"); const um = symUnhashMap(); Object.keys(rawSeen).forEach(k => { seen[um.get(k) || k] = rawSeen[k]; }); } catch (e) {}
  const alerts = state.profile.alerts || {}; let changed = false;
  for (const sym of Object.keys(alerts)) {
    const cfg = alerts[sym]; const p = priceOf(sym); if (!p) continue;
    const st = cfg.target && p.price >= cfg.target ? "target" : cfg.sl && p.price <= cfg.sl ? "sl" : "in";
    if (seen[sym] && seen[sym] !== st && st !== "in") {
      try { new Notification("Folio — " + (st === "target" ? "Target hit: " : "Stop-loss hit: ") + sym, { body: sym + " is now " + inr2(p.price) + (st === "target" ? " · your target was " + inr2(cfg.target) : " · your stop-loss was " + inr2(cfg.sl)), icon: "assets/folio-icon.svg" }); } catch (e) {}
    }
    if (seen[sym] !== st) { seen[sym] = st; changed = true; }
  }
  if (changed) { try { const hs = {}; Object.keys(seen).forEach(k => { hs[symHash(k)] = seen[k]; }); localStorage.setItem("folio_alert_state", JSON.stringify(hs)); } catch (e) {} }
}
const _renderHoldingsT2 = renderHoldings;
renderHoldings = function () { _renderHoldingsT2(); try { tgtDecorate(); } catch (e) {} };
const _renderSignalsT2 = renderSignalsSync;
renderSignalsSync = function (d) {
  _renderSignalsT2(d);
  try {
    const el = $("insSignals"); if (!el) return;
    const alerts = (state.profile && state.profile.alerts) || {};
    const rows = Object.keys(alerts).filter(s => alerts[s].target || alerts[s].sl).map(s => {
      const st = tgtStatus(s); if (!st) return "";
      return '<div class="sig-row"><span class="sig-sym">' + esc(s) + '</span><span class="sig-txt">' + st.label + " · LTP " + inr2(st.ltp) + " · Target " + (st.cfg.target ? inr2(st.cfg.target) : "—") + " · SL " + (st.cfg.sl ? inr2(st.cfg.sl) : "—") + "</span></div>";
    }).join("");
    if (rows) el.innerHTML += '<div class="sig-group"><h4>🎯 Your targets &amp; stop-losses</h4>' + rows + "</div>";
  } catch (e) {}
};
const _doTickT2 = doTick;
doTick = async function () { await _doTickT2(); try { tgtNotifyCheck(); } catch (e) {} };
INSX_INFO.targets = "Targets & Stop-loss: you pick a target price and a stop-loss for a stock (in its Price Alerts box). The bar shows where the live price sits between them, and badges appear when the price gets close or crosses. Folio only watches and informs — it never places an order.";

/* ---------- planning cards in Insights: Rebalancing, Goal, Dividends ---------- */
INSX_INFO.rebal = "Rebalancing: you choose what share of your portfolio each stock (or sector) should be. Drift is how far today's share has wandered from your target, and the rupee figure is what buying or selling would bring it back in line. Information only — Folio never places orders.";
INSX_INFO.goal = "Goal Tracker: your target corpus and date. Required CAGR is the yearly growth your current value must compound at to reach the goal on time. The projection uses your assumed yearly return — a straight-line what-if, not a forecast.";
INSX_INFO.divplan = "Dividend Income Planner: expected dividends for the next 12 months, estimated from what your current holdings actually paid over the last 12 months (same shares, same payouts, same months). Companies can change or skip dividends, so treat this as a guide, not a promise. Yield on cost is that expected income divided by what you paid.";
INSX_INFO.journal = "Trade Journal: every closed (sold) trade, matched first-in-first-out. Win rate is winning trades out of all closed trades. Expectancy is your average result per trade after wins and losses are both counted. Tags come from the Tags box in the Add/Edit form's + details.";
let planRebalMode = "stocks", planNewMoney = 0;
function planStore() { const p = state.profile || (state.profile = {}); if (!p.rebal) p.rebal = { stocks: {}, sectors: {} }; return p.rebal; }
function planHoldVals() {
  const { holdings } = computeHoldings();
  const rows = holdings.map(h => { const p = priceOf(h.sym); return { sym: h.sym, sector: h.sector || sectorOf(h.sym), qty: h.qty, invested: h.invested, v: p ? h.qty * p.price : h.invested }; });
  const total = rows.reduce((a, r) => a + r.v, 0);
  return { rows, total };
}
function planEnsure() {
  const view = $("view-insights"); if (!view || $("planWrap")) return;
  const wrap = document.createElement("div"); wrap.id = "planWrap";
  wrap.innerHTML = insxCard("plan-rebal", "Rebalancing", "rebal", insxSkel(3)) + insxCard("plan-goal", "Goal Tracker", "goal", insxSkel(3)) + insxCard("plan-div", "Dividend Income Planner", "divplan", insxSkel(3));
  view.appendChild(wrap);
  planRenderRebal(); planRenderGoal();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) planLoadDivs(); }, { rootMargin: "240px" });
  io.observe(wrap);
}
function planRenderRebal() {
  const box = $("plan-rebal"); if (!box) return;
  const head = '<div class="panel-head"><h2>Rebalancing</h2>' + insxInfoBtn("rebal") + "</div>";
  const { rows, total } = planHoldVals();
  if (!rows.length || !total) { box.innerHTML = head + '<p class="empty-note">No holdings yet — set target percentages here once you own stocks, and Folio will show the drift.</p>'; return; }
  const store = planStore();
  let items = [];
  if (planRebalMode === "stocks") items = rows.map(r => ({ key: r.sym, label: r.sym, v: r.v }));
  else { const m = {}; rows.forEach(r => m[r.sector] = (m[r.sector] || 0) + r.v); items = Object.keys(m).map(k => ({ key: k, label: k, v: m[k] })); }
  items.forEach(it => { it.cur = it.v / total * 100; it.target = Number((planRebalMode === "stocks" ? store.stocks : store.sectors)[it.key]) || 0; it.drift = it.target - it.cur; it.action = it.drift / 100 * total; });
  const sumT = items.reduce((a, i) => a + i.target, 0);
  const maxScale = Math.max(25, ...items.map(i => Math.max(i.cur, i.target)));
  const list = items.map(it => '<div class="insx-row plan-row"><div class="plan-line1"><span class="plan-sym">' + esc(it.label) + '</span><small>' + it.cur.toFixed(1) + '% now</small></div><span class="drift-wrap"><span class="drift-cur" style="width:' + (it.cur / maxScale * 100) + '%"></span><span class="drift-mark" style="left:' + Math.min(100, Math.max(0, it.target / maxScale * 100)) + '%"></span></span><div class="plan-line3"><label class="plan-lab">Target %<input type="number" class="plan-tgt" data-plan-key="' + esc(it.key) + '" min="0" max="100" step="0.5" inputmode="decimal" value="' + (it.target || "") + '" placeholder="Target %"></label><b class="' + (Math.abs(it.action) < 1 ? "" : it.action > 0 ? "pos" : "neg") + '">' + (Math.abs(it.action) < 1 ? "In line" : (it.action > 0 ? "Buy " : "Sell ") + insxAmt(Math.abs(it.action))) + "</b></div></div>").join("");
  box.innerHTML = head +
    '<div class="insx-legend"><button type="button" class="insx-chip' + (planRebalMode === "stocks" ? " on" : "") + '" data-plan-mode="stocks">By stock</button><button type="button" class="insx-chip' + (planRebalMode === "sectors" ? " on" : "") + '" data-plan-mode="sectors">By sector</button></div>' +
    '<div class="insx-list">' + list + "</div>" +
    '<p class="insx-note">Targets add up to <b>' + sumT.toFixed(1) + '%</b>' + (Math.abs(sumT - 100) > 0.5 && sumT > 0 ? " — for a full plan they should add up to 100%." : ".") + ' The white tick on each bar is your target; the fill is today\'s share.</p>' +
    '<div class="insx-setrow"><label>Where to put new money ₹ <input type="number" id="planMoney" min="0" step="any" value="' + (planNewMoney || "") + '" placeholder="₹ amount"></label><button type="button" class="btn small" id="planMoneyBtn">Split it</button></div><div id="planMoneyOut"></div>';
  box.querySelectorAll(".plan-tgt").forEach(inp => inp.addEventListener("change", () => {
    const v = Math.min(100, Math.max(0, Number(inp.value) || 0));
    (planRebalMode === "stocks" ? store.stocks : store.sectors)[inp.dataset.planKey] = v;
    persist(); planRenderRebal();
  }));
  const mb = $("planMoneyBtn");
  if (mb) mb.addEventListener("click", () => { planNewMoney = Number($("planMoney").value) || 0; planSplitMoney(items, total); });
}
function planSplitMoney(items, total) {
  const out = $("planMoneyOut"); if (!out) return;
  if (!(planNewMoney > 0)) { out.innerHTML = '<p class="empty-note">Enter an amount above first.</p>'; return; }
  const withTargets = items.filter(i => i.target > 0);
  if (!withTargets.length) { out.innerHTML = '<p class="empty-note">Set at least one target % first — the split follows your targets.</p>'; return; }
  const newTotal = total + planNewMoney;
  const alloc = {}; let remaining = planNewMoney;
  for (let pass = 0; pass < 4 && remaining > 0.5; pass++) {
    const gaps = withTargets.map(i => ({ key: i.key, gap: Math.max(0, i.target / 100 * newTotal - i.v - (alloc[i.key] || 0)) })).filter(g => g.gap > 0.5);
    if (!gaps.length) break;
    const gsum = gaps.reduce((a, g) => a + g.gap, 0);
    gaps.forEach(g => { const give = Math.min(g.gap, remaining * (g.gap / gsum)); alloc[g.key] = (alloc[g.key] || 0) + give; remaining -= give; });
  }
  const rows = Object.entries(alloc).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
  out.innerHTML = rows.length ? '<div class="insx-list">' + rows.map(([k, v]) => '<div class="insx-row"><span>' + esc(k) + '</span><b class="pos">Buy ' + insxAmt(v) + "</b></div>").join("") + "</div>" + (remaining >= 1 ? '<p class="insx-note">' + insxAmt(remaining) + " is left over — every target is already met at the new total.</p>" : "") : '<p class="empty-note">All your targets are already met — new money is not needed in any of them right now.</p>';
}
function planRenderGoal() {
  const box = $("plan-goal"); if (!box) return;
  const head = '<div class="panel-head"><h2>Goal Tracker</h2>' + insxInfoBtn("goal") + "</div>";
  const p = state.profile || (state.profile = {});
  const g = p.goal || (p.goal = { amount: 0, date: "", assumed: 12 });
  const { total } = planHoldVals();
  const editor = '<div class="insx-setrow"><label>Target corpus ₹ <input type="number" id="goalAmt" min="0" step="any" value="' + (g.amount || "") + '" placeholder="e.g. 1000000"></label><label>By date <input type="date" id="goalDate" value="' + (g.date || "") + '"></label><label>Assumed return <input type="number" id="goalAssumed" min="0" max="40" step="0.5" value="' + (g.assumed == null ? 12 : g.assumed) + '"> %/yr</label></div>';
  let body = "";
  if (!g.amount || !g.date) body = '<p class="empty-note">Set a target amount and a date — Folio will show how much of the goal you already hold, the growth rate you need, and a projection.</p>';
  else if (!total) body = '<p class="empty-note">Add holdings first — the goal progress is measured on your portfolio\'s current value.</p>';
  else {
    const target = Number(g.amount), assumed = Math.min(40, Math.max(0, Number(g.assumed) || 12)) / 100;
    const months = Math.max(1, Math.round((new Date(g.date + "T00:00:00") - new Date()) / 2629800000));
    const years = months / 12;
    const pctDone = Math.min(100, total / target * 100);
    const reqCagr = total > 0 && target > total ? (Math.pow(target / total, 1 / years) - 1) * 100 : 0;
    const circ = 2 * Math.PI * 34;
    const assumedPath = [], reqPath = [];
    for (let m = 0; m <= months; m++) { assumedPath.push(total * Math.pow(1 + assumed, m / 12)); reqPath.push(total * Math.pow(target / total, m / Math.max(1, months))); }
    body = '<div class="goal-flex"><svg class="goal-ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" class="goal-ring-bg"/><circle cx="42" cy="42" r="34" class="goal-ring-fg" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - pctDone / 100)).toFixed(1) + '"/><text x="42" y="47" class="goal-ring-tx">' + pctDone.toFixed(1) + '%</text></svg>' +
      '<div class="insx-tiles goal-tiles"><div class="insx-tile"><span>Current value</span><b>' + insxAmt(total) + '</b></div><div class="insx-tile"><span>Goal</span><b>' + insxAmt(target) + '</b><small>by ' + esc(fmtDate(g.date)) + '</small></div><div class="insx-tile"><span>Required CAGR</span><b>' + (target > total ? reqCagr.toFixed(1) + "%" : "Reached") + '</b><small>per year from today</small></div></div></div>' +
      '<div class="insx-legend"><span class="insx-chip on"><span class="insx-dot" style="background:var(--text)"></span>At your assumed ' + (assumed * 100).toFixed(1) + '%</span><span class="insx-chip on"><span class="insx-dot" style="background:var(--gold)"></span>Path the goal needs</span></div>' +
      insxLineSvg([{ data: assumedPath, color: "var(--text)" }, { data: reqPath, color: "var(--gold)" }]) +
      '<p class="insx-note">A what-if picture, not a forecast — markets do not grow in straight lines.</p>';
  }
  box.innerHTML = head + body + editor;
  const bind = (id, key, num) => { const el = $(id); if (el) el.addEventListener("change", () => { g[key] = num ? (Number(el.value) || 0) : el.value; persist(); planRenderGoal(); }); };
  bind("goalAmt", "amount", true); bind("goalDate", "date", false); bind("goalAssumed", "assumed", true);
}
let planDivBusy = false;
async function planLoadDivs() {
  if (planDivBusy) return; planDivBusy = true;
  const box = $("plan-div"); if (!box) { planDivBusy = false; return; }
  const head = '<div class="panel-head"><h2>Dividend Income Planner</h2>' + insxInfoBtn("divplan") + "</div>";
  const { holdings } = computeHoldings();
  if (!holdings.length) { box.innerHTML = head + '<p class="empty-note">No holdings yet — once you own dividend-paying stocks, your expected income for the next 12 months appears here.</p>'; planDivBusy = false; return; }
  try {
    const masters = await Promise.all(holdings.map(h => fetchMaster(h.sym).catch(() => null)));
    const now = Date.now(), yrAgo = now - 365 * 86400000;
    const months = []; const start = new Date(); start.setDate(1);
    for (let i = 1; i <= 12; i++) { const d = new Date(start.getFullYear(), start.getMonth() + i, 1); months.push({ key: d.getFullYear() + "-" + (d.getMonth() + 1), label: d.toLocaleDateString("en-IN", { month: "short" }), amt: 0 }); }
    let expected = 0; const perStock = [];
    holdings.forEach((h, i) => {
      const m = masters[i]; if (!m || !m.divs) return;
      const recent = m.divs.filter(d => d.ts >= yrAgo && d.ts <= now);
      if (!recent.length) return;
      const dps = recent.reduce((a, d) => a + (Number(d.amount) || 0), 0);
      const exp = dps * h.qty; if (!(exp > 0)) return;
      expected += exp; perStock.push({ sym: h.sym, exp, invested: h.invested });
      recent.forEach(d => { const dt = new Date(d.ts); const key = (dt.getFullYear() + 1) + "-" + (dt.getMonth() + 1); const b = months.find(x => x.key === key); if (b) b.amt += (Number(d.amount) || 0) * h.qty; });
    });
    if (!expected) { box.innerHTML = head + '<p class="empty-note">None of your holdings paid a dividend in the last 12 months, so there is no past pattern to project from.</p>'; planDivBusy = false; return; }
    const invested = holdings.reduce((a, h) => a + h.invested, 0);
    const maxM = Math.max(1, ...months.map(m => m.amt));
    const bars = '<div class="divplan-bars">' + months.map(m => '<div class="divplan-col"><span class="divplan-val">' + (m.amt >= 1 ? inrShort(m.amt) : "") + '</span><span class="divplan-bar" style="height:' + Math.max(2, m.amt / maxM * 74) + 'px"></span><span class="divplan-lab">' + m.label + "</span></div>").join("") + "</div>";
    box.innerHTML = head + '<div class="insx-tiles"><div class="insx-tile"><span>Expected next 12 months</span><b>' + insxAmt(expected) + '</b></div><div class="insx-tile"><span>Yield on cost</span><b>' + (invested > 0 ? (expected / invested * 100).toFixed(2) + "%" : "—") + '</b><small>on ' + insxAmt(invested) + ' invested</small></div></div>' + bars +
      '<div class="insx-list">' + perStock.sort((a, b) => b.exp - a.exp).map(s => '<div class="insx-row"><span>' + esc(s.sym) + '</span><b>' + insxAmt(s.exp) + "</b></div>").join("") + "</div>" +
      '<p class="insx-note">Estimated from the last 12 months of actual payouts on the shares you hold today.</p>';
  } catch (e) { box.innerHTML = head + '<p class="empty-note">Dividend history could not be loaded right now. Reopen Insights to try again.</p>'; }
  planDivBusy = false;
}
/* ---------- Trade Journal (History view) ---------- */
function closedTrades() {
  const lots = {}; const closed = [];
  [...state.txns].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).forEach(t => {
    if (t.type === "BUY") (lots[t.sym] = lots[t.sym] || []).push({ qty: Number(t.qty) || 0, price: effPrice(t), date: t.date, txn: t });
    else if (t.type === "SELL") {
      let q = Number(t.qty) || 0;
      while (q > 0 && (lots[t.sym] || []).length) {
        const l = lots[t.sym][0]; const take = Math.min(q, l.qty);
        closed.push({ sym: t.sym, qty: take, buyDate: l.date, sellDate: t.date, pnl: take * (effPrice(t) - l.price), days: Math.max(0, Math.round((new Date(t.date) - new Date(l.date)) / 86400000)), tags: String(t.tags || (l.txn && l.txn.tags) || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean), reason: t.reason || "" });
        l.qty -= take; q -= take; if (l.qty <= 0) lots[t.sym].shift();
      }
    }
  });
  return closed;
}
function journalEnsure() {
  const view = $("view-history"); if (!view || $("journalWrap")) { if ($("journalWrap")) journalRender(); return; }
  const wrap = document.createElement("div"); wrap.id = "journalWrap"; view.appendChild(wrap);
  journalRender();
}
function journalRender() {
  const box = $("journalWrap"); if (!box) return;
  const head = '<div class="panel-head"><h2>Trade Journal</h2><button type="button" class="insx-i" data-insx-info="journal">i</button></div>';
  const closed = closedTrades();
  if (!closed.length) { box.innerHTML = '<div class="panel insx-card">' + head + '<p class="empty-note">No closed trades yet — when you sell shares, each finished trade lands here with its result. Add Tags and a Reason from the ＋ details in the Add/Edit form to grade your decisions later.</p></div>'; return; }
  const wins = closed.filter(c => c.pnl > 0), losses = closed.filter(c => c.pnl <= 0);
  const sum = a => a.reduce((x, c) => x + c.pnl, 0);
  const avgW = wins.length ? sum(wins) / wins.length : 0, avgL = losses.length ? sum(losses) / losses.length : 0;
  const expectancy = sum(closed) / closed.length;
  const best = [...closed].sort((a, b) => b.pnl - a.pnl)[0], worst = [...closed].sort((a, b) => a.pnl - b.pnl)[0];
  const avgDays = a => a.length ? Math.round(a.reduce((x, c) => x + c.days, 0) / a.length) : 0;
  const byTag = {};
  closed.forEach(c => { (c.tags.length ? c.tags : ["(no tag)"]).forEach(tg => { byTag[tg] = byTag[tg] || { n: 0, pnl: 0 }; byTag[tg].n++; byTag[tg].pnl += c.pnl; }); });
  const tagRows = Object.entries(byTag).sort((a, b) => b[1].pnl - a[1].pnl);
  const maxTag = Math.max(1, ...tagRows.map(([, v]) => Math.abs(v.pnl)));
  const recent = [...closed].sort((a, b) => b.sellDate < a.sellDate ? -1 : 1).slice(0, 8);
  box.innerHTML = '<div class="panel insx-card">' + head +
    '<div class="insx-tiles"><div class="insx-tile"><span>Win rate</span><b>' + (wins.length / closed.length * 100).toFixed(0) + '%</b><small>' + wins.length + " of " + closed.length + ' closed trades</small></div>' +
    '<div class="insx-tile"><span>Average win</span><b class="pos">' + insxAmt(avgW) + '</b></div>' +
    '<div class="insx-tile"><span>Average loss</span><b class="neg">' + insxAmt(avgL) + '</b></div>' +
    '<div class="insx-tile"><span>Expectancy per trade</span><b class="' + (expectancy >= 0 ? "pos" : "neg") + '">' + insxAmt(expectancy) + '</b></div>' +
    '<div class="insx-tile"><span>Best trade</span><b class="pos">' + insxAmt(best.pnl) + '</b><small>' + esc(best.sym) + " · " + best.days + ' days</small></div>' +
    '<div class="insx-tile"><span>Worst trade</span><b class="neg">' + insxAmt(worst.pnl) + '</b><small>' + esc(worst.sym) + " · " + worst.days + ' days</small></div>' +
    '<div class="insx-tile"><span>Holding period</span><b>' + avgDays(wins) + " vs " + avgDays(losses) + ' days</b><small>winners vs losers</small></div></div>' +
    '<h4 class="plan-sub">P&amp;L by tag</h4><div class="insx-list">' + tagRows.map(([tg, v]) => '<div class="insx-row"><span>' + esc(tg) + '</span><span class="insx-bar-wrap"><span class="insx-bar ' + (v.pnl >= 0 ? "pos" : "neg") + '" style="width:' + Math.max(3, Math.abs(v.pnl) / maxTag * 100) + '%"></span></span><small>' + v.n + ' trades</small><b class="' + (v.pnl >= 0 ? "pos" : "neg") + '">' + insxAmt(v.pnl) + "</b></div>").join("") + "</div>" +
    '<h4 class="plan-sub">Recent closed trades</h4><div class="insx-list">' + recent.map(c => '<div class="insx-row"><span>' + esc(c.sym) + '</span><small>' + esc(fmtDate(c.sellDate)) + " · " + c.days + " days" + (c.tags.length ? " · " + c.tags.map(esc).join(", ") : "") + (c.reason ? " · “" + esc(c.reason) + "”" : "") + '</small><b class="' + (c.pnl >= 0 ? "pos" : "neg") + '">' + insxAmt(c.pnl) + "</b></div>").join("") + "</div></div>";
}
document.addEventListener("click", e => {
  const pm = e.target.closest("[data-plan-mode]");
  if (pm) { planRebalMode = pm.dataset.planMode; planRenderRebal(); }
});
const _renderInsightsT2 = renderInsights;
renderInsights = function (d) { _renderInsightsT2(d); try { planEnsure(); } catch (e) {} };
const _renderHistoryT2 = renderHistory;
renderHistory = function () { _renderHistoryT2(); try { journalEnsure(); } catch (e) {} };

/* ================= TASK 3 (v62): Tijori-style stock page =================
   Field test first (2026-11-12): Yahoo's v8 chart feed — the app's existing
   source — returns prices, OHLCV, 52-week range and dividend/split events.
   Yahoo's fundamentals endpoints (quoteSummary / v6 / v7 quote) are
   crumb-gated ("Invalid Crumb") and cannot be used by a browser app, so
   revenue, profit, EPS, margins, debt, cash flow, P/E, P/B, ROE, market
   cap, holder breakdown and analyst targets DO NOT EXIST in the free feed.
   Per the brief, those tabs/fields are simply not built; everything below
   uses only data that really returns. */
let sxSym = null, sxMaster = null, sxPeersDone = false, sxIndDone = false;
function sxEnsure() {
  const card = document.querySelector("#stockModal .modal-card");
  if (!card || $("sheetX")) return;
  const box = document.createElement("div"); box.id = "sheetX";
  box.innerHTML =
    '<div id="sxPosition"></div><div id="sxStats"></div>' +
    '<div class="sheet-tabs" role="tablist"><button type="button" class="insx-chip on" data-sx-tab="overview">Overview</button><button type="button" class="insx-chip" data-sx-tab="peers">Peers</button><button type="button" class="insx-chip" data-sx-tab="ind">Indicators</button></div>' +
    '<div id="sxPeers" class="hidden"></div><div id="sxInd" class="hidden"></div>';
  const head = card.querySelector(".modal-head");
  if (head && head.nextSibling) card.insertBefore(box, head.nextSibling); else card.appendChild(box);
  box.querySelectorAll("[data-sx-tab]").forEach(b => b.addEventListener("click", () => sxSetTab(b.dataset.sxTab)));
}
function sxSetTab(tab) {
  const card = document.querySelector("#stockModal .modal-card"); if (!card) return;
  document.querySelectorAll("[data-sx-tab]").forEach(b => b.classList.toggle("on", b.dataset.sxTab === tab));
  card.classList.toggle("sx-away", tab !== "overview");
  $("sxPeers").classList.toggle("hidden", tab !== "peers");
  $("sxInd").classList.toggle("hidden", tab !== "ind");
  if (tab === "peers" && !sxPeersDone) sxRenderPeers();
  if (tab === "ind" && !sxIndDone) sxRenderInd();
}
function sxRenderPosition(sym) {
  const box = $("sxPosition"); if (!box) return;
  const { holdings } = computeHoldings();
  const h = holdings.find(x => x.sym === sym);
  if (!h) { box.innerHTML = ""; return; }
  const p = priceOf(sym); const val = p ? h.qty * p.price : h.invested;
  const total = planHoldVals().total || 1;
  const cfs = [];
  state.txns.filter(t => t.sym === sym).forEach(t => {
    if (t.type === "BUY") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: -((Number(t.qty) || 0) * effPrice(t)) });
    else if (t.type === "SELL") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: (Number(t.qty) || 0) * effPrice(t) });
    else if (t.type === "DIV") cfs.push({ date: new Date(t.date + "T00:00:00"), amount: Number(t.price) || 0 });
  });
  cfs.push({ date: new Date(), amount: val }); cfs.sort((a, b) => a.date - b.date);
  let xr = null; try { const r = xirr(cfs); if (r != null && isFinite(r)) xr = r * 100; } catch (e) {}
  const pnl = val - h.invested;
  box.innerHTML = '<div class="sx-strip"><h4>My Position</h4><div class="sx-cells">' +
    '<span>Qty <b>' + h.qty + '</b></span><span>Avg Buy <b>' + inr2(h.avg) + '</b></span><span>Current Value <b>' + insxAmt(val) + '</b></span>' +
    '<span>P&amp;L <b class="' + (pnl >= 0 ? "pos" : "neg") + '">' + insxAmt(pnl) + " (" + insxPct(h.invested ? pnl / h.invested * 100 : null) + ')</b></span>' +
    '<span>XIRR <b>' + (xr == null ? "—" : xr.toFixed(1) + "%") + '</b></span><span>Weight <b>' + (val / total * 100).toFixed(1) + '%</b></span></div></div>';
}
function sxRenderStats(sym, master) {
  const box = $("sxStats"); if (!box) return;
  if (!master || !master.ohlc || master.ohlc.length < 20) { box.innerHTML = '<p class="empty-note">Key stats need the price history, which could not be loaded right now.</p>'; return; }
  const bars = master.ohlc;
  const last = bars[bars.length - 1], first = bars[0];
  const hi = Math.max(...bars.map(b => b.h)), lo = Math.min(...bars.map(b => b.l));
  const below = hi > 0 ? (last.c / hi - 1) * 100 : null;
  const rangePos = hi > lo ? (last.c - lo) / (hi - lo) * 100 : 50;
  const ret1y = first && first.c ? (last.c / first.c - 1) * 100 : null;
  const vol20 = bars.slice(-20).reduce((a, b) => a + (b.v || 0), 0) / Math.min(20, bars.length);
  const yrAgo = Date.now() - 365 * 86400000;
  const dps = (master.divs || []).filter(d => d.ts >= yrAgo).reduce((a, d) => a + (Number(d.amount) || 0), 0);
  const dy = dps > 0 && last.c ? dps / last.c * 100 : null;
  const cell = (k, v) => '<span>' + k + ' <b>' + v + '</b></span>';
  box.innerHTML = '<div class="sx-strip"><h4>Key Stats <small>(from the free price feed — P/E, ROE and market cap are not published in it)</small></h4><div class="sx-cells">' +
    cell("Price", inr2(last.c)) + cell("1Y Return", ret1y == null ? "—" : insxPct(ret1y)) + cell("Avg Volume (20d)", vol20 ? Math.round(vol20).toLocaleString("en-IN") : "—") +
    (dy != null ? cell("Dividend Yield", dy.toFixed(2) + "%") : "") + cell("52W High", inr2(hi)) + cell("52W Low", inr2(lo)) + "</div>" +
    '<div class="sx-range"><span class="sx-range-fill" style="width:' + rangePos.toFixed(1) + '%"></span><span class="sx-range-dot" style="left:' + rangePos.toFixed(1) + '%"></span></div>' +
    '<div class="tgt-labs"><span>' + inr2(lo) + '</span><span>' + (below == null ? "" : Math.abs(below).toFixed(1) + "% below the 52-week high") + '</span><span>' + inr2(hi) + "</span></div></div>";
}
async function sxRenderPeers() {
  sxPeersDone = true;
  const box = $("sxPeers"); if (!box || !sxSym) return;
  box.innerHTML = '<div class="sx-strip"><h4>Peers</h4>' + insxSkel(3) + "</div>";
  const sector = sectorOf(sxSym);
  const list = (window.STOCK_LIST || []).filter(e => e[0] !== sxSym && sector && (e[2] === sector || sectorOf(e[0]) === sector)).slice(0, 8).map(e => e[0]);
  const all = [sxSym].concat(list);
  const res = await Promise.all(all.map(s => fetchHistory(s, "1y").catch(() => null)));
  const rows = all.map((s, i) => {
    const r = res[i]; const pts = r && r.points ? r.points : [];
    if (pts.length < 2) return { sym: s, price: null, ret: null, day: null };
    const lastC = pts[pts.length - 1].c, prevC = pts[pts.length - 2].c, firstC = pts[0].c;
    return { sym: s, price: lastC, ret: firstC ? (lastC / firstC - 1) * 100 : null, day: prevC ? (lastC / prevC - 1) * 100 : null };
  });
  rows.sort((a, b) => (b.ret == null ? -1e9 : b.ret) - (a.ret == null ? -1e9 : a.ret));
  box.innerHTML = '<div class="sx-strip"><h4>Peers — ' + esc(sector || "same sector") + '</h4>' +
    '<div class="insx-table-wrap"><table class="insx-table"><thead><tr><th>Stock</th><th>Price</th><th>1Y Return %</th><th>Day %</th></tr></thead><tbody>' +
    rows.map(r => '<tr class="' + (r.sym === sxSym ? "sx-self" : "") + '"><td>' + esc(r.sym) + (r.sym === sxSym ? " (you)" : "") + "</td><td>" + (r.price == null ? "—" : inr2(r.price)) + "</td><td class=\"" + (r.ret == null ? "" : r.ret >= 0 ? "pos" : "neg") + '">' + (r.ret == null ? "—" : insxPct(r.ret)) + "</td><td class=\"" + (r.day == null ? "" : r.day >= 0 ? "pos" : "neg") + '">' + (r.day == null ? "—" : insxPct(r.day, 2)) + "</td></tr>").join("") +
    '</tbody></table></div><p class="insx-note">Built-in same-sector list, compared on price and returns — the only figures the free price feed publishes. Market cap, P/E and ROE are not in it, so they are not shown.</p></div>';
}
function sxEma(vals, period) {
  const k = 2 / (period + 1); const out = []; let prev = null;
  vals.forEach((v, i) => { if (v == null) { out.push(null); return; } prev = prev == null ? v : v * k + prev * (1 - k); out.push(i < period - 1 ? null : prev); });
  return out;
}
function sxRsi(closes, period) {
  const out = new Array(closes.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= period) { g += up / period; l += dn / period; if (i === period) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    else { g = (g * (period - 1) + up) / period; l = (l * (period - 1) + dn) / period; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  }
  return out;
}
function sxRenderInd() {
  sxIndDone = true;
  const box = $("sxInd"); if (!box || !sxSym) return;
  const master = sxMaster;
  if (!master || !master.ohlc || master.ohlc.length < 40) { box.innerHTML = '<div class="sx-strip"><h4>Indicators</h4><p class="empty-note">Not enough daily price history yet for RSI and MACD.</p></div>'; return; }
  const bars = master.ohlc.slice(-180);
  const closes = bars.map(b => b.c);
  const rsi = sxRsi(closes, 14);
  const ema12 = sxEma(closes, 12), ema26 = sxEma(closes, 26);
  const macd = closes.map((_, i) => (ema12[i] != null && ema26[i] != null) ? ema12[i] - ema26[i] : null);
  const sig = sxEma(macd.map(v => v == null ? 0 : v), 9).map((v, i) => macd[i] == null ? null : v);
  const hist = macd.map((v, i) => (v != null && sig[i] != null) ? v - sig[i] : null);
  const hi = Math.max(...master.ohlc.map(b => b.h)), lo = Math.min(...master.ohlc.map(b => b.l));
  const W = 680, panes = [
    { h: 132, label: "Price + 52W high/low lines" },
    { h: 54, label: "RSI (14)" },
    { h: 54, label: "MACD (12, 26, 9)" },
    { h: 40, label: "Volume" }
  ];
  const totalH = panes.reduce((a, p) => a + p.h + 16, 8);
  const X = i => 8 + (i / (bars.length - 1)) * (W - 16);
  const line = (arr, y0, h, min, max, color, dash) => {
    let d = "", started = false;
    arr.forEach((v, i) => { if (v == null || !isFinite(v)) return; const y = y0 + h - ((v - min) / (max - min)) * h; d += (started ? " L" : "M") + X(i).toFixed(1) + " " + y.toFixed(1); started = true; });
    return d ? '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6"' + (dash ? ' stroke-dasharray="5 4"' : "") + "/>" : "";
  };
  let y = 8, svg = "";
  const pMin = Math.min(...closes), pMax = Math.max(...closes);
  svg += '<text x="8" y="' + (y + 10) + '" class="insx-end-lab" style="text-anchor:start">' + panes[0].label + "</text>";
  svg += line(closes, y + 14, panes[0].h - 18, pMin, pMax, "var(--text)");
  const yHi = y + 14 + (panes[0].h - 18) * (1 - (hi - pMin) / (pMax - pMin)), yLo = y + 14 + (panes[0].h - 18) * (1 - (lo - pMin) / (pMax - pMin));
  if (yHi > y && yHi < y + panes[0].h) svg += '<line x1="8" x2="' + (W - 8) + '" y1="' + yHi + '" y2="' + yHi + '" stroke="var(--gain)" stroke-dasharray="4 4" opacity="0.7"/>';
  if (yLo > y && yLo < y + panes[0].h) svg += '<line x1="8" x2="' + (W - 8) + '" y1="' + yLo + '" y2="' + yLo + '" stroke="var(--loss)" stroke-dasharray="4 4" opacity="0.7"/>';
  y += panes[0].h + 16;
  svg += '<text x="8" y="' + (y + 10) + '" class="insx-end-lab" style="text-anchor:start">' + panes[1].label + "</text>";
  svg += line(rsi, y + 14, panes[1].h - 18, 0, 100, "var(--gold)");
  [30, 70].forEach(lv => { const ly = y + 14 + (panes[1].h - 18) * (1 - lv / 100); svg += '<line x1="8" x2="' + (W - 8) + '" y1="' + ly + '" y2="' + ly + '" stroke="var(--line)" stroke-dasharray="3 4"/>'; });
  y += panes[1].h + 16;
  const mVals = macd.concat(sig, hist).filter(v => v != null && isFinite(v));
  const mMin = Math.min(...mVals, 0), mMax = Math.max(...mVals, 0);
  svg += '<text x="8" y="' + (y + 10) + '" class="insx-end-lab" style="text-anchor:start">' + panes[2].label + "</text>";
  hist.forEach((v, i) => { if (v == null) return; const yA = y + 14 + (panes[2].h - 18) * (1 - (Math.max(v, 0) - mMin) / (mMax - mMin)), yB = y + 14 + (panes[2].h - 18) * (1 - (Math.min(v, 0) - mMin) / (mMax - mMin)); svg += '<line x1="' + X(i) + '" x2="' + X(i) + '" y1="' + yA + '" y2="' + yB + '" stroke="' + (v >= 0 ? "var(--gain)" : "var(--loss)") + '" stroke-width="2" opacity="0.55"/>'; });
  svg += line(macd, y + 14, panes[2].h - 18, mMin, mMax, "var(--text)") + line(sig, y + 14, panes[2].h - 18, mMin, mMax, "var(--gold)", true);
  y += panes[2].h + 16;
  const vMax = Math.max(...bars.map(b => b.v || 0), 1);
  svg += '<text x="8" y="' + (y + 10) + '" class="insx-end-lab" style="text-anchor:start">' + panes[3].label + "</text>";
  bars.forEach((b, i) => { const bh = ((b.v || 0) / vMax) * (panes[3].h - 16); svg += '<rect x="' + (X(i) - 1) + '" y="' + (y + panes[3].h - bh) + '" width="2" height="' + Math.max(0.5, bh) + '" fill="' + (b.c >= b.o ? "var(--gain)" : "var(--loss)") + '" opacity="0.6"/>'; });
  box.innerHTML = '<div class="sx-strip"><h4>Indicators</h4><div id="sxIndRead" class="price-meta">Touch or move across the chart to inspect any day.</div>' +
    '<svg id="sxIndSvg" class="insx-chart" viewBox="0 0 ' + W + " " + totalH + '" style="touch-action:pan-y">' + svg + '<line id="sxCross" x1="0" x2="0" y1="0" y2="' + totalH + '" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/></svg>' +
    '<label class="sx-cmp"><input type="checkbox" id="sxCmpTgl"> Compare with NIFTY (normalised %)</label><div id="sxCmp"></div>' +
    '<p class="insx-note">Dashed lines on the price pane are the 52-week high and low. RSI above 70 is usually called overbought, below 30 oversold — information only, not a signal to act.</p></div>';
  const svgEl = $("sxIndSvg"), read = $("sxIndRead"), cross = $("sxCross");
  const show = clientX => {
    const r = svgEl.getBoundingClientRect();
    const fx = (clientX - r.left) / r.width;
    const i = Math.max(0, Math.min(bars.length - 1, Math.round((fx * W - 8) / (W - 16) * (bars.length - 1))));
    cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", "0.8");
    const d = new Date(bars[i].t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    read.textContent = d + " · Close " + inr2(bars[i].c) + (rsi[i] != null ? " · RSI " + rsi[i].toFixed(0) : "") + (macd[i] != null ? " · MACD " + macd[i].toFixed(2) : "") + " · Vol " + (bars[i].v ? Math.round(bars[i].v).toLocaleString("en-IN") : "—");
  };
  svgEl.addEventListener("pointermove", e => show(e.clientX));
  svgEl.addEventListener("pointerdown", e => show(e.clientX));
  const tgl = $("sxCmpTgl");
  if (tgl) tgl.addEventListener("change", () => { if (tgl.checked) sxRenderCmp(bars); else $("sxCmp").innerHTML = ""; });
}
async function sxRenderCmp(bars) {
  const box = $("sxCmp"); if (!box) return;
  box.innerHTML = insxSkel(2);
  const nif = await fetchHistory("^NSEI", "1y").catch(() => null);
  if (!nif || !nif.points || !bars.length) { box.innerHTML = '<p class="empty-note">NIFTY history could not be loaded for the comparison.</p>'; return; }
  const dstr = t => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(0, 10); } };
  const nMap = {}; nif.points.forEach(p => nMap[dstr(p.t)] = p.c);
  const s0 = bars[0].c; let n0 = null;
  const sLine = [], nLine = [];
  bars.forEach(b => { const nc = nMap[dstr(b.t)]; if (nc && n0 == null) n0 = nc; sLine.push((b.c / s0 - 1) * 100); nLine.push(nc && n0 ? (nc / n0 - 1) * 100 : null); });
  box.innerHTML = '<div class="insx-legend"><span class="insx-chip on"><span class="insx-dot" style="background:var(--text)"></span>' + esc(sxSym) + '</span><span class="insx-chip on"><span class="insx-dot" style="background:var(--gold)"></span>NIFTY 50</span></div>' +
    insxLineSvg([{ data: sLine, color: "var(--text)" }, { data: nLine, color: "var(--gold)", dash: true }]) +
    '<p class="insx-note">Both lines start at 0% — the gap is how far the stock is ahead of (or behind) the index over this period.</p>';
}
const _loadSheetT3 = loadCompanySheet;
loadCompanySheet = async function (sym) {
  await _loadSheetT3(sym);
  try {
    sxEnsure(); sxSym = sym; sxPeersDone = false; sxIndDone = false; sxMaster = null;
    sxSetTab("overview");
    sxRenderPosition(sym);
    const st = $("sxStats"); if (st) st.innerHTML = insxSkel(2);
    const m = await fetchMaster(sym).catch(() => null);
    if (sxSym !== sym) return;
    sxMaster = m;
    sxRenderStats(sym, m);
  } catch (e) {}
};

/* ================= TASK 4 (v63): dashboard experience ================= */
function dashPanels() { return [...document.querySelectorAll("#view-dashboard > .panel")]; }
function dashKey(panel) { const h = panel.querySelector("h2"); return (h ? h.textContent : "panel").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(); }
function dashFindPanel(titlePart) { return dashPanels().find(p => { const h = p.querySelector("h2"); return h && h.textContent.toLowerCase().includes(titlePart); }); }
let heroPnlMode = "overall";
function dashDecoratePanels() {
  /* collapsible cards (state remembered on this device) */
let saved = {}; try { saved = JSON.parse(localStorage.getItem("folio_dash_collapse") || "{}"); } catch (e) {}
dashPanels().forEach(p => {
  const head = p.querySelector(".panel-head"); if (!head || head.querySelector(".dash-collapse")) return;
  const key = dashKey(p);
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "dash-collapse"; btn.setAttribute("aria-label", "Collapse or expand this card"); btn.setAttribute("aria-expanded", saved[key] ? "false" : "true");
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'; btn.classList.toggle("collapsed", !!saved[key]);
  if (saved[key]) p.classList.add("collapsed");
  btn.addEventListener("click", () => {
    const now = p.classList.toggle("collapsed");
    btn.classList.toggle("collapsed", now);
    btn.setAttribute("aria-expanded", now ? "false" : "true");
    let s2 = {}; try { s2 = JSON.parse(localStorage.getItem("folio_dash_collapse") || "{}"); } catch (e) {}
    s2[key] = now; try { localStorage.setItem("folio_dash_collapse", JSON.stringify(s2)); } catch (e) {}
  });
  head.appendChild(btn);
  /* customize controls */
  const ctl = document.createElement("span"); ctl.className = "dash-ctl";
  ctl.innerHTML = '<button type="button" data-dctl="up" aria-label="Move card up">↑</button><button type="button" data-dctl="down" aria-label="Move card down">↓</button><button type="button" data-dctl="hide" aria-label="Hide card">👁</button>';
  ctl.addEventListener("click", e => {
    const b = e.target.closest("[data-dctl]"); if (!b) return;
    const L = dashLayout(); const k = dashKey(p);
    if (b.dataset.dctl === "hide") { if (!L.hidden.includes(k)) L.hidden.push(k); }
    else {
      const order = dashPanels().map(dashKey);
      const i = order.indexOf(k); const j = b.dataset.dctl === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]]; L.order = order;
    }
    state.profile.dashLayout = L; persist(); dashApplyLayout();
  });
  head.appendChild(ctl);
});
}
function dashEnsure() {
  const view = $("view-dashboard"); if (!view || $("dashChips")) return;
  const bar = document.createElement("div"); bar.id = "dashChips"; bar.className = "dash-chips";
  bar.setAttribute("role", "tablist");
  bar.innerHTML = ["Overview", "Performance", "Risk", "Income", "Tax", "Market", "News"].map(n => '<button type="button" class="insx-chip" role="tab" aria-selected="false" data-dash-chip="' + n + '">' + n + "</button>").join("") +
    '<span class="dash-div" aria-hidden="true"></span>' +
    '<button type="button" class="insx-chip" id="dashCustomBtn">⚙ Customize</button>' +
    '<button type="button" class="insx-chip" id="dashCompactBtn" aria-pressed="false">Compact</button>';
  const grid = view.querySelector(".stat-grid");
  if (grid) view.insertBefore(bar, grid); else view.prepend(bar);
  try { platInstallBtn(); } catch (e) {}
  bar.addEventListener("click", e => {
    const chip = e.target.closest("[data-dash-chip]");
    if (chip) {
      const n = chip.dataset.dashChip;
      if (n === "Risk" || n === "News") { dashGo(n); return; }
      dashSetTab(n);
      return;
    }
    if (e.target.closest("#dashCustomBtn")) { dashOpenCustomize(); return; }
    if (e.target.closest("#dashCompactBtn")) {
      const on = document.body.classList.toggle("compact-dash");
      const b = e.target.closest("#dashCompactBtn");
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      const L = dashLayout(); L.compact = on; state.profile.dashLayout = L; persist();
    }
  });
  dashDecoratePanels();
  /* restore-hidden strip */
  const strip = document.createElement("div"); strip.id = "dashHiddenStrip"; view.appendChild(strip);
  /* hero: tap P&L to toggle Today / Overall */
  const pnlCard = $("stPnl") && $("stPnl").closest(".stat-card");
  if (pnlCard && !pnlCard.dataset.tgl) {
    pnlCard.dataset.tgl = "1"; pnlCard.style.cursor = "pointer"; pnlCard.title = "Tap to switch between today's P&L and overall P&L";
    pnlCard.addEventListener("click", () => { heroPnlMode = heroPnlMode === "overall" ? "today" : "overall"; dashHero(); });
  }
  /* hero sparkline holder */
  const valCard = $("stValue") && $("stValue").closest(".stat-card");
  if (valCard && !$("heroSpark")) { const s = document.createElement("span"); s.id = "heroSpark"; valCard.appendChild(s); }
  /* real tabs: restore the last selected tab (default Overview) */
  dashSetTab(dashSavedTab(), true);
}
const DASH_TABS = ["Overview", "Performance", "Income", "Tax", "Market"];
function dashSavedTab() {
  try { const t = localStorage.getItem("folio_dash_tab"); if (DASH_TABS.includes(t)) return t; } catch (e) {}
  return "Overview";
}
function dashTabOf(p) {
  const h = p.querySelector("h2"); const t = h ? h.textContent.toLowerCase() : "";
  if (t.includes("market mood") || t.includes("market pulse")) return "Market";
  if (t.includes("tax") || t.includes("capital gains")) return "Tax";
  if (t.includes("dividend") || t.includes("corporate actions")) return "Income";
  if (t.includes("performance") || t.includes("p/l by stock")) return "Performance";
  return "Overview";
}
function dashApplyTabFilter() {
  const name = dashSavedTab();
  dashPanels().forEach(p => p.classList.toggle("dash-tab-hide", dashTabOf(p) !== name));
  const strip = $("dashHiddenStrip"); if (strip) strip.style.display = name === "Overview" ? "" : "none";
  document.querySelectorAll("[data-dash-chip]").forEach(c => {
    const on = c.dataset.dashChip === name;
    c.classList.toggle("on", on); c.setAttribute("aria-selected", on ? "true" : "false");
  });
}
function dashSetTab(name, silent) {
  if (!DASH_TABS.includes(name)) name = "Overview";
  try { localStorage.setItem("folio_dash_tab", name); } catch (e) {}
  dashApplyTabFilter();
  const chip = document.querySelector('[data-dash-chip="' + name + '"]');
  if (chip) { try { chip.scrollIntoView({ inline: "center", block: "nearest" }); } catch (e) {} }
  if (!silent) { try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e) { window.scrollTo(0, 0); } }
}
function dashOpenCustomize() {
  let m = $("dashCustomModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "dashCustomModal"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Customize Dashboard");
    m.innerHTML = '<div class="modal-card"><div class="modal-head"><h3>Customize Dashboard</h3><button type="button" class="icon-btn" data-dc-close="1" aria-label="Close">✕</button></div><p class="auth-note">Move cards up or down, or hide them. Changes save automatically.</p><div id="dashCustomList"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", e => {
      if (e.target === m || e.target.closest("[data-dc-close]")) { m.classList.add("hidden"); return; }
      const b = e.target.closest("[data-dc]"); if (!b) return;
      const L = dashLayout(); const k = b.dataset.k; const act = b.dataset.dc;
      if (act === "hide") { if (!L.hidden.includes(k)) L.hidden.push(k); }
      else if (act === "show") { L.hidden = L.hidden.filter(x => x !== k); }
      else {
        const order = dashPanels().map(dashKey);
        const i = order.indexOf(k); const j = act === "up" ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]]; L.order = order;
      }
      state.profile.dashLayout = L; persist(); dashApplyLayout(); dashRenderCustomList();
    });
  }
  dashRenderCustomList();
  m.classList.remove("hidden");
}
function dashRenderCustomList() {
  const box = $("dashCustomList"); if (!box) return;
  const L = dashLayout();
  box.innerHTML = dashPanels().map(p => {
    const k = dashKey(p); const h = p.querySelector("h2"); const t = h ? h.textContent.trim() : k;
    const hid = L.hidden.includes(k);
    return '<div class="dc-row"><span class="dc-name">' + esc(t) + '</span><span class="dc-btns">' +
      '<button type="button" class="mini-btn" data-dc="up" data-k="' + esc(k) + '" aria-label="Move up">↑</button>' +
      '<button type="button" class="mini-btn" data-dc="down" data-k="' + esc(k) + '" aria-label="Move down">↓</button>' +
      '<button type="button" class="mini-btn" data-dc="' + (hid ? "show" : "hide") + '" data-k="' + esc(k) + '">' + (hid ? "Show" : "Hide") + '</button></span></div>';
  }).join("");
}
function dashGo(name) {
  const scrollTo = p => { if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (name === "Overview") scrollTo(dashFindPanel("portfolio"));
  else if (name === "Performance") scrollTo(dashFindPanel("performance"));
  else if (name === "Income") scrollTo(dashFindPanel("dividend snowball"));
  else if (name === "Tax") scrollTo(dashFindPanel("tax"));
  else if (name === "Market") scrollTo(dashFindPanel("market mood"));
  else if (name === "News") switchView("news");
  else if (name === "Risk") { switchView("insights"); setTimeout(() => { const r = $("insx-risk"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" }); }, 350); }
}
function dashLayout() { const p = state.profile || (state.profile = {}); if (!p.dashLayout) p.dashLayout = { order: [], hidden: [], compact: false }; return p.dashLayout; }
function dashApplyLayout() {
  const L = dashLayout();
  const view = $("view-dashboard"); if (!view) return;
  if (L.compact) document.body.classList.add("compact-dash"); 
  if (L.order && L.order.length) {
    const panels = dashPanels();
    const sorted = [...panels].sort((a, b) => {
      const ia = L.order.indexOf(dashKey(a)), ib = L.order.indexOf(dashKey(b));
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    sorted.forEach(p => view.appendChild(p));
  }
  dashPanels().forEach(p => { p.style.display = L.hidden.includes(dashKey(p)) ? "none" : ""; });
  const strip = $("dashHiddenStrip");
  if (strip) {
    strip.innerHTML = L.hidden.length ? '<div class="panel dash-hidden-panel"><div class="panel-head"><h2>Hidden cards</h2></div>' + L.hidden.map(k => '<button type="button" class="insx-chip" data-unhide="' + k + '">Show: ' + esc(k.replace(/-/g, " ")) + "</button>").join(" ") + "</div>" : "";
    strip.querySelectorAll("[data-unhide]").forEach(b => b.addEventListener("click", () => { const L2 = dashLayout(); L2.hidden = L2.hidden.filter(x => x !== b.dataset.unhide); state.profile.dashLayout = L2; persist(); dashApplyLayout(); }));
  }
}
function dashHero() {
  try {
    const d = enriched();
    if (heroPnlMode === "overall" && $("stPnl")) {
      $("stPnl").textContent = moneyFmt(d.totalPnl);
      $("stPnl").className = "stat-value " + (d.totalPnl >= 0 ? "gain" : "loss");
      const pctEl2 = $("stPnlPct"); if (pctEl2) pctEl2.textContent = d.invested > 0 ? (d.totalPnl >= 0 ? "▲ +" : "▼ ") + (d.totalPnl / d.invested * 100).toFixed(2) + "% overall" : "";
      const lab2 = $("stPnl").closest(".stat-card").querySelector(".stat-label"); if (lab2) lab2.textContent = "Total Profit / Loss (tap)";
    }
    if (heroPnlMode === "today" && $("stPnl")) {
      const base = d.value - d.dayPnl;
      $("stPnl").textContent = moneyFmt(d.dayPnl);
      $("stPnl").className = "stat-value " + (d.dayPnl >= 0 ? "gain" : "loss");
      const pctEl = $("stPnlPct"); if (pctEl) pctEl.textContent = (base > 0 ? (d.dayPnl >= 0 ? "▲ +" : "▼ ") + (d.dayPnl / base * 100).toFixed(2) + "% today" : "");
      const lab = $("stPnl").closest(".stat-card").querySelector(".stat-label"); if (lab) lab.textContent = "Today's P&L (tap)";
    }
    /* sparkline: portfolio value, last ~30 trading days, from the on-device history seeds */
    const sp = $("heroSpark");
    if (sp) {
      const { holdings } = computeHoldings();
      const series = holdings.map(h => { const s = histLsGet(h.sym + "|1y"); return s && s.data && s.data.points ? { qty: h.qty, pts: s.data.points.slice(-30) } : null; }).filter(Boolean);
      if (series.length && series[0].pts.length > 3) {
        const n = Math.min(...series.map(s => s.pts.length));
        const vals = []; for (let i = 0; i < n; i++) vals.push(series.reduce((a, s) => a + s.qty * s.pts[s.pts.length - n + i].c, 0));
        const min = Math.min(...vals), max = Math.max(...vals), W = 120, H = 26;
        const pts = vals.map((v, i) => (1 + i / (vals.length - 1) * (W - 2)).toFixed(1) + "," + (H - 3 - (max > min ? (v - min) / (max - min) : 0.5) * (H - 6)).toFixed(1)).join(" ");
        const up = vals[vals.length - 1] >= vals[0];
        sp.innerHTML = '<svg class="hero-spark" viewBox="0 0 ' + W + " " + H + '"><polyline points="' + pts + '" fill="none" stroke="' + (up ? "var(--gain)" : "var(--loss)") + '" stroke-width="1.8"/></svg>';
      } else sp.innerHTML = "";
    }
  } catch (e) {}
}
/* ---------- Market Pulse ---------- */
let pulseLoadedAt = 0;
async function pulseLoad() {
  if (Date.now() - pulseLoadedAt < 5 * 60 * 1000) return;
  pulseLoadedAt = Date.now();
  const view = $("view-dashboard"); if (!view) return;
  let panel = $("pulsePanel");
  if (!panel) {
    panel = document.createElement("div"); panel.className = "panel"; panel.id = "pulsePanel";
    panel.innerHTML = '<div class="panel-head"><h2>Market Pulse</h2><span class="price-meta" id="pulseMeta"></span></div><div id="pulseIdx" class="pulse-row"></div><div id="pulseHeat"></div>';
    const mood = $("moodPanel");
    if (mood && mood.nextSibling) view.insertBefore(panel, mood.nextSibling); else view.appendChild(panel);
    try { dashApplyTabFilter(); } catch (e) {}
  }
  const idxBox = $("pulseIdx");
  const IDX = [["^NSEI", "NIFTY 50"], ["^BSESN", "SENSEX"], ["^NSEBANK", "BANK NIFTY"], ["^CNXIT", "NIFTY IT"], ["^CNXPHARMA", "NIFTY PHARMA"], ["^CNXAUTO", "NIFTY AUTO"], ["^CNXMETAL", "NIFTY METAL"], ["^CNXFMCG", "NIFTY FMCG"]];
  const res = await Promise.all(IDX.map(async ([s]) => { let h = await fetchHistory(s, "1mo").catch(() => null); if (!h || !h.points || h.points.length <= 2) h = await fetchHistory(s, "5d").catch(() => null); return h; }));
  let html = "";
  res.forEach((r, i) => {
    const pts = r && r.points ? r.points : [];
    if (pts.length < 2) return;
    const last = pts[pts.length - 1].c, prev = pts[pts.length - 2].c;
    const day = prev ? (last / prev - 1) * 100 : 0;
    const sp = pts.slice(-22), min = Math.min(...sp.map(p => p.c)), max = Math.max(...sp.map(p => p.c));
    const line = sp.map((p, j) => (1 + j / (sp.length - 1) * 72).toFixed(1) + "," + (20 - (max > min ? (p.c - min) / (max - min) : 0.5) * 17).toFixed(1)).join(" ");
    html += '<div class="pulse-cell"><span class="pulse-name">' + IDX[i][1] + '</span><b>' + last.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</b><span class="' + (day >= 0 ? "pos" : "neg") + '">' + (day >= 0 ? "▲ +" : "▼ ") + day.toFixed(2) + '%</span><svg class="pulse-spark" viewBox="0 0 74 22"><polyline points="' + line + '" fill="none" stroke="' + (day >= 0 ? "var(--gain)" : "var(--loss)") + '" stroke-width="1.6"/></svg></div>';
  });
  if (idxBox) idxBox.innerHTML = html || '<p class="empty-note">Index data could not be loaded right now.</p>';
  const meta = $("pulseMeta"); if (meta) meta.textContent = "Free Yahoo feed · updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  /* sector heat strip from her own holdings */
  const heat = $("pulseHeat");
  if (heat) {
    const { holdings } = computeHoldings();
    const sec = {};
    holdings.forEach(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; const day = p && p.prevClose ? (p.price / p.prevClose - 1) * 100 : 0; const s = h.sector || sectorOf(h.sym); sec[s] = sec[s] || { v: 0, w: 0 }; sec[s].v += v; sec[s].w += v * day; });
    const cells = Object.entries(sec).map(([s, x]) => ({ s, day: x.v ? x.w / x.v : 0, v: x.v })).sort((a, b) => b.v - a.v);
    heat.innerHTML = cells.length ? '<div class="pulse-heat">' + cells.map(c => '<span class="pulse-heat-cell" style="background:' + (c.day >= 0 ? "rgba(47,158,68," : "rgba(224,49,49,") + Math.min(0.75, Math.abs(c.day) / 3 + 0.12).toFixed(2) + ')">' + esc(c.s) + " " + (c.day >= 0 ? "▲" : "▼") + " " + Math.abs(c.day).toFixed(1) + "%</span>").join("") + "</div>" : "";
  }
}
const _renderDashboardT4 = renderDashboard;
renderDashboard = function () {
  _renderDashboardT4();
  try { dashEnsure(); dashDecoratePanels(); dashApplyLayout(); if (heroPnlMode === "today") dashHero(); else dashHeroSparkOnly(); pulseLoad(); } catch (e) {}
};
function dashHeroSparkOnly() { const keep = heroPnlMode; heroPnlMode = "spark"; dashHero(); heroPnlMode = keep; }

/* ---------- TASK 4: Holdings tools (search, sort, group, sparkline, 52W bar, swipe) ---------- */
let holdQuery = "", holdSort = "value", holdGroup = false;
function holdEnsure() {
  const panel = $("view-holdings") && $("view-holdings").querySelector(".panel");
  if (!panel || $("holdTools")) return;
  const bar = document.createElement("div"); bar.id = "holdTools"; bar.className = "hold-tools";
  bar.innerHTML = '<input type="search" id="holdQ" placeholder="Search holdings…" aria-label="Search holdings">' +
    '<select id="holdSortSel" aria-label="Sort holdings"><option value="value">Sort: Value</option><option value="pnl">Sort: P&amp;L %</option><option value="day">Sort: Day %</option><option value="name">Sort: Name</option><option value="weight">Sort: Weight</option></select>' +
    '<label class="sx-cmp hold-group"><input type="checkbox" id="holdGroupTgl"> Group by sector</label>' +
    '<div class="seg seg-small hold-view-seg" role="group" aria-label="How holdings are shown"><button type="button" data-hview="cards">▦ Cards</button><button type="button" data-hview="compact">☰ Compact</button><button type="button" data-hview="table">▤ Table</button></div>';
  const list = $("holdingsList");
  if (list) { panel.insertBefore(bar, list); const tw = document.createElement("div"); tw.id = "holdTableWrap"; tw.className = "hidden"; list.after(tw); }
  bar.querySelectorAll("[data-hview]").forEach(b => b.addEventListener("click", () => { state.profile.holdView = b.dataset.hview; persist(); holdApply(); }));
  $("holdQ").addEventListener("input", folioDeb(e => { holdQuery = e.target.value.trim().toLowerCase(); holdApply(); }, 300));
  $("holdSortSel").addEventListener("change", e => { holdSort = e.target.value; holdApply(); });
  $("holdGroupTgl").addEventListener("change", e => { holdGroup = e.target.checked; holdApply(); });
}
function holdRenderTable(tw) {
  const { holdings } = computeHoldings();
  const rows = holdings.map(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; const pnl = v - h.invested; return { h: h, p: p, v: v, pnl: pnl, pnlPct: h.invested ? pnl / h.invested * 100 : 0, day: p && p.prevClose ? (p.price / p.prevClose - 1) * 100 : null }; })
    .filter(r => !holdQuery || r.h.sym.toLowerCase().includes(holdQuery) || (r.h.name || "").toLowerCase().includes(holdQuery))
    .sort((a, b) => b.v - a.v);
  if (!rows.length) { tw.innerHTML = '<p class="empty-note">No holdings match.</p>'; return; }
  tw.innerHTML = '<div class="tbl-scroll"><table class="tbl hold-table"><thead><tr><th>Stock</th><th>Qty</th><th>Avg</th><th>LTP</th><th>Day %</th><th>Value</th><th>Overall P&amp;L</th></tr></thead><tbody>' +
    rows.map(r => '<tr data-hrow="' + esc(r.h.sym) + '"><td><b>' + esc(r.h.sym) + '</b> <span class="muted">' + esc(r.h.name || "") + '</span></td><td>' + r.h.qty + '</td><td>' + inr2(r.h.avg) + '</td><td>' + (r.p ? inr2(r.p.price) : "—") + '</td><td class="' + (r.day == null ? "" : r.day >= 0 ? "pos" : "neg") + '">' + (r.day == null ? "—" : (r.day >= 0 ? "+" : "") + r.day.toFixed(2) + "%") + '</td><td>' + inr(r.v) + '</td><td class="' + (r.pnl >= 0 ? "pos" : "neg") + '">' + inr(r.pnl) + " (" + (r.pnl >= 0 ? "+" : "") + r.pnlPct.toFixed(2) + '%)</td></tr>').join("") +
    "</tbody></table></div>";
  tw.querySelectorAll("[data-hrow]").forEach(tr => tr.addEventListener("click", () => { const t = document.querySelector('[data-hold-toggle="' + tr.dataset.hrow + '"]'); if (t) t.click(); }));
}
function holdApply() {
  const list = $("holdingsList"); if (!list) return;
  const hv = (state.profile && state.profile.holdView) || "cards";
  document.querySelectorAll("[data-hview]").forEach(b => b.classList.toggle("active", b.dataset.hview === hv));
  list.classList.toggle("hold-compact", hv === "compact");
  const tw = $("holdTableWrap");
  if (tw) {
    if (hv === "table") { holdRenderTable(tw); tw.classList.remove("hidden"); list.classList.add("hidden"); }
    else { tw.classList.add("hidden"); list.classList.remove("hidden"); }
  }
  const { holdings } = computeHoldings();
  const info = {};
  const total = planHoldVals().total || 1;
  holdings.forEach(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; info[h.sym] = { v, pnlPct: h.invested ? (v - h.invested) / h.invested * 100 : 0, day: p && p.prevClose ? (p.price / p.prevClose - 1) * 100 : -999, weight: v / total * 100, sector: h.sector || sectorOf(h.sym), name: h.name || h.sym }; });
  const cards = [...list.querySelectorAll(".hold-card")];
  cards.forEach(c => {
    const tog = c.querySelector("[data-hold-toggle]"); if (!tog) return;
    const sym = tog.dataset.holdToggle, inf = info[sym];
    c.style.display = (!holdQuery || sym.toLowerCase().includes(holdQuery) || (inf && inf.name.toLowerCase().includes(holdQuery))) ? "" : "none";
    /* sparkline + 52W mini bar from the on-device history seed */
    if (!c.querySelector(".hold-spark") && inf) {
      const seed = histLsGet(sym + "|1y");
      const pts = seed && seed.data && seed.data.points ? seed.data.points : null;
      if (pts && pts.length > 5) {
        const last30 = pts.slice(-30), min = Math.min(...pts.map(p => p.c)), max = Math.max(...pts.map(p => p.c));
        const cur = last30[last30.length - 1].c;
        const mn = Math.min(...last30.map(p => p.c)), mx = Math.max(...last30.map(p => p.c));
        const line = last30.map((p, i) => (1 + i / (last30.length - 1) * 82).toFixed(1) + "," + (22 - (mx > mn ? (p.c - mn) / (mx - mn) : 0.5) * 19).toFixed(1)).join(" ");
        const pos = max > min ? (cur - min) / (max - min) * 100 : 50;
        const div = document.createElement("div"); div.className = "hold-spark";
        div.innerHTML = '<svg viewBox="0 0 84 24"><polyline points="' + line + '" fill="none" stroke="var(--muted)" stroke-width="1.6"/></svg>' +
          '<span class="hold-range" title="52-week range (closing prices)"><span class="hold-range-dot" style="left:' + pos.toFixed(1) + '%"></span></span><small>52W</small>';
        const strip = c.querySelector(".hold-strip");
        if (strip) strip.after(div);
      }
    }
    /* swipe left/right opens the actions drawer */
    if (!c.dataset.swipe) {
      c.dataset.swipe = "1";
      let sx = 0, sy = 0;
      c.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      c.addEventListener("touchend", e => {
        const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 72 && Math.abs(dy) < 32) { const t = c.querySelector(".hold-chev"); if (t) t.click(); }
      }, { passive: true });
    }
  });
  const visible = cards.filter(c => c.style.display !== "none");
  const key = { value: c => (info[c.querySelector("[data-hold-toggle]").dataset.holdToggle] || {}).v || 0, pnl: c => (info[c.querySelector("[data-hold-toggle]").dataset.holdToggle] || {}).pnlPct || 0, day: c => (info[c.querySelector("[data-hold-toggle]").dataset.holdToggle] || {}).day || 0, weight: c => (info[c.querySelector("[data-hold-toggle]").dataset.holdToggle] || {}).weight || 0, name: c => c.querySelector("[data-hold-toggle]").dataset.holdToggle };
  visible.sort((a, b) => { const ka = key[holdSort](a), kb = key[holdSort](b); return typeof ka === "string" ? ka.localeCompare(kb) : kb - ka; });
  list.querySelectorAll(".hold-sector-head").forEach(el => el.remove());
  let lastSector = null;
  visible.forEach(c => {
    if (holdGroup) {
      const sym = c.querySelector("[data-hold-toggle]").dataset.holdToggle;
      const sec = (info[sym] || {}).sector || "Other";
      if (sec !== lastSector) { const h = document.createElement("div"); h.className = "hold-sector-head"; h.textContent = sec; list.appendChild(h); lastSector = sec; }
    }
    list.appendChild(c);
  });
}
const _renderHoldingsT4 = renderHoldings;
renderHoldings = function () { _renderHoldingsT4(); try { holdEnsure(); holdApply(); } catch (e) {} };

/* ================= TASK 4 (v64): platform polish ================= */
/* --- service worker + install --- */
if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) {} }
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; platInstallBtn(); });
window.addEventListener("appinstalled", () => { const x = $("installBtn"); if (x) x.remove(); });
try { platInstallBtn(); } catch (e) {}
function platInstallBtn() {
  const bar = $("dashChips"); if (!bar) return;
  if (window.matchMedia("(display-mode: standalone)").matches) { const x = $("installBtn"); if (x) x.remove(); return; }
  if ($("installBtn")) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "insx-chip"; b.id = "installBtn"; b.textContent = "📲 Install Folio";
  b.addEventListener("click", async () => {
    if (window.matchMedia("(display-mode: standalone)").matches) { toast("Folio is already installed on this device — open it from your home screen / app list."); return; }
    if (deferredInstall) { deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null; b.remove(); }
    else if (window.folioInstallHelp) window.folioInstallHelp();
    else toast("To install: open your browser menu and choose “Add to Home screen” / “Install app”.");
  });
  bar.appendChild(b);
}
/* --- offline banner --- */
function platOffline() {
  let pill = $("offlinePill");
  if (!navigator.onLine) {
    if (!pill) { pill = document.createElement("div"); pill.id = "offlinePill"; pill.textContent = "You are offline, showing last saved data"; document.body.appendChild(pill); }
  } else if (pill) pill.remove();
}
window.addEventListener("online", platOffline);
window.addEventListener("offline", platOffline);
/* --- "updated … ago" --- */
let lastPriceTs = 0;
const _refreshPricesT4 = refreshPrices;
refreshPrices = function () { const r = _refreshPricesT4.apply(this, arguments); lastPriceTs = Date.now(); return r; };
function platAgo() {
  const head = document.querySelector("#view-dashboard .panel .panel-head");
  if (!head || !lastPriceTs) return;
  let el = $("updAgo");
  if (!el) { el = document.createElement("span"); el.id = "updAgo"; el.className = "price-meta"; const rb = $("refreshBtn"); if (rb) rb.after(el); else head.appendChild(el); }
  const mins = Math.max(0, Math.round((Date.now() - lastPriceTs) / 60000));
  el.textContent = mins <= 0 ? "· updated just now" : mins === 1 ? "· updated 1 min ago" : "· updated " + mins + " min ago";
}
setInterval(() => { try { platAgo(); } catch (e) {} }, 30000);
/* --- reports: print sheet + share card --- */
function platReport() {
  const d = enriched();
  const { holdings } = computeHoldings();
  const sec = {};
  holdings.forEach(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; sec[h.sector || "Other"] = (sec[h.sector || "Other"] || 0) + v; });
  const rows = holdings.map(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; return "<tr><td>" + esc(h.sym) + "</td><td>" + h.qty + "</td><td>" + inr2(h.avg) + "</td><td>" + (p ? inr2(p.price) : "—") + "</td><td>" + inr(v) + "</td><td>" + inr(v - h.invested) + "</td></tr>"; }).join("");
  let rep = $("printReport");
  if (!rep) { rep = document.createElement("div"); rep.id = "printReport"; document.body.appendChild(rep); }
  rep.innerHTML = "<h1>Folio — Portfolio Report</h1><p>A Singh Caizen Product · " + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + "</p>" +
    "<p><b>Invested:</b> " + inr(d.invested) + " · <b>Current Value:</b> " + inr(d.value) + " · <b>Total P&amp;L:</b> " + inr(d.totalPnl) + " (" + (d.invested ? (d.totalPnl / d.invested * 100).toFixed(2) : "0") + "%) · <b>Realised:</b> " + inr(d.realisedTotal || 0) + " · <b>Dividends:</b> " + inr(d.divTotal || 0) + "</p>" +
    "<table><thead><tr><th>Stock</th><th>Qty</th><th>Avg Buy</th><th>Price</th><th>Value</th><th>P&amp;L</th></tr></thead><tbody>" + rows + "</tbody></table>" +
    "<p><b>By sector:</b> " + Object.entries(sec).sort((a, b) => b[1] - a[1]).map(([s, v]) => esc(s) + " " + (d.value ? (v / d.value * 100).toFixed(1) : "0") + "%").join(" · ") + "</p>" +
    "<p class='fine'>Prices are free delayed data (~15 min). This report is information only, not investment advice.</p>";
  document.body.classList.add("printing");
  setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("printing"), 600); }, 60);
}
function platShareCard() {
  const d = enriched();
  const { holdings } = computeHoldings();
  const total = d.value || 1;
  const top = holdings.map(h => { const p = priceOf(h.sym); const v = p ? h.qty * p.price : h.invested; return { sym: h.sym, w: v / total * 100, pnl: h.invested ? (v - h.invested) / h.invested * 100 : 0 }; }).sort((a, b) => b.w - a.w).slice(0, 5);
  const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 630;
  const g = cv.getContext("2d");
  g.fillStyle = "#0f2234"; g.fillRect(0, 0, 1200, 630);
  g.fillStyle = "#c9a227"; g.fillRect(0, 596, 1200, 34);
  g.fillStyle = "#ffffff"; g.font = "800 64px system-ui, sans-serif"; g.fillText("FOLIO", 60, 105);
  g.font = "600 25px system-ui, sans-serif"; g.fillStyle = "#9fb4c8"; g.fillText("A SINGH CAIZEN PRODUCT · MY PORTFOLIO IN %", 60, 148);
  const ret = d.invested ? d.totalPnl / d.invested * 100 : 0;
  g.font = "800 92px system-ui, sans-serif"; g.fillStyle = ret >= 0 ? "#4caf6d" : "#e05b4b";
  g.fillText((ret >= 0 ? "▲ +" : "▼ ") + ret.toFixed(1) + "%", 60, 268);
  g.font = "600 27px system-ui, sans-serif"; g.fillStyle = "#ffffff"; g.fillText("overall return" + (d.xirr != null && isFinite(d.xirr) ? " · XIRR " + (d.xirr * 100).toFixed(1) + "% a year" : ""), 60, 312);
  g.font = "600 30px system-ui, sans-serif";
  top.forEach((t, i) => { const y = 392 + i * 42; g.fillStyle = "#ffffff"; g.fillText(t.sym, 60, y); g.fillStyle = t.pnl >= 0 ? "#4caf6d" : "#e05b4b"; g.fillText(t.w.toFixed(1) + "% of portfolio · " + (t.pnl >= 0 ? "+" : "") + t.pnl.toFixed(1) + "%", 420, y); });
  g.font = "500 22px system-ui, sans-serif"; g.fillStyle = "#9fb4c8";
  g.fillText("Percentages only — no amounts. Free delayed prices. Not investment advice.", 60, 578);
  cv.toBlob(async blob => {
    const file = new File([blob], "folio-share-card.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "My Folio" }); return; } catch (e) {} }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "folio-share-card.png"; a.click(); URL.revokeObjectURL(a.href);
    toast("Share card downloaded — percentages only, no amounts.");
  });
}
/* --- chart PNG downloads --- */
function svgToPng(svg, name) {
  const clone = svg.cloneNode(true);
  clone.querySelectorAll("text").forEach(t => { t.setAttribute("fill", "#8a93a3"); t.setAttribute("font-size", "12"); });
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const dark = document.documentElement.dataset.theme !== "light";
  bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", dark ? "#101418" : "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas"); cv.width = img.width * 2; cv.height = img.height * 2;
    const g = cv.getContext("2d"); g.scale(2, 2); g.drawImage(img, 0, 0);
    cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); URL.revokeObjectURL(a.href); });
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
function platPngButtons(root) {
  (root || document).querySelectorAll(".insx-card, .sx-strip").forEach(card => {
    if (card.querySelector("[data-png-dl]")) return;
    const svg = card.querySelector("svg.insx-chart, svg.sx-ind");
    if (!svg) return;
    const head = card.querySelector(".panel-head, h4"); if (!head) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "insx-i"; b.dataset.pngDl = "1"; b.textContent = "⬇"; b.title = "Download this chart as PNG"; b.setAttribute("aria-label", "Download chart as PNG");
    b.addEventListener("click", () => svgToPng(card.querySelector("svg.insx-chart, svg.sx-ind"), "folio-chart.png"));
    head.appendChild(b);
  });
}
/* --- Ctrl+K command palette --- */
function platPalette() {
  let pop = $("cmdkPop");
  if (pop) { pop.classList.remove("hidden"); $("cmdkInput").value = ""; cmdkRender(""); $("cmdkInput").focus(); return; }
  pop = document.createElement("div"); pop.id = "cmdkPop"; pop.className = "cmdk-pop";
  pop.innerHTML = '<div class="cmdk-card"><input id="cmdkInput" type="text" placeholder="Search a stock, or jump to a tab or card…" aria-label="Command palette"><div id="cmdkList" class="cmdk-list"></div></div>';
  document.body.appendChild(pop);
  pop.addEventListener("click", e => { if (e.target === pop) pop.classList.add("hidden"); });
  $("cmdkInput").addEventListener("input", folioDeb(e => cmdkRender(e.target.value.trim().toLowerCase()), 300));
  $("cmdkInput").addEventListener("keydown", e => {
    if (e.key === "Escape") pop.classList.add("hidden");
    if (e.key === "Enter") { const first = pop.querySelector("[data-cmdk]"); if (first) first.click(); }
  });
  cmdkRender("");
  $("cmdkInput").focus();
}
function cmdkRender(q) {
  const list = $("cmdkList"); if (!list) return;
  const items = [];
  const views = [["dashboard", "🏠 Dashboard"], ["holdings", "💼 Holdings"], ["watch", "★ Watchlist"], ["insights", "📊 Insights"], ["history", "🕘 History"], ["news", "📰 News"], ["profile", "👤 My Profile"]];
  views.forEach(([v, label]) => { if (!q || label.toLowerCase().includes(q)) items.push({ label, run: () => switchView(v) }); });
  if (q.length >= 2) (window.STOCK_LIST || []).filter(e => e[0].toLowerCase().includes(q) || e[1].toLowerCase().includes(q)).slice(0, 7).forEach(e => items.push({ label: "📈 " + e[0] + " — " + e[1], run: () => { if (typeof openStock === "function") openStock(e[0]); } }));
  list.innerHTML = items.length ? items.map((it, i) => '<button type="button" class="cmdk-item" data-cmdk="' + i + '">' + esc(it.label) + "</button>").join("") : '<p class="empty-note">Nothing matches.</p>';
  list.querySelectorAll("[data-cmdk]").forEach(b => b.addEventListener("click", () => { $("cmdkPop").classList.add("hidden"); items[Number(b.dataset.cmdk)].run(); }));
}
document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); platPalette(); } });
/* --- swipe between tabs + pull to refresh --- */
(function () {
  const ORDER = ["dashboard", "holdings", "watch", "insights", "news", "profile"];
  let tx = 0, ty = 0, pull = 0;
  document.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; pull = 0; }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (window.scrollY <= 0 && e.touches[0].clientY - ty > 10) pull = e.touches[0].clientY - ty;
  }, { passive: true });
  document.addEventListener("touchend", e => {
    const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (document.querySelector(".modal:not(.hidden)")) return;
    if (pull > 110 && Math.abs(dx) < 60) { pull = 0; try { refreshPrices(); } catch (err) {} toast("Refreshing prices…"); return; }
    if (Math.abs(dx) > 96 && Math.abs(dy) < 42) {
      const src = e.target;
      if (src.closest("canvas, table, .insx-table-wrap, .dash-chips, .sheet-tabs, .pulse-row, input, select, textarea")) return;
      const cur = ORDER.findIndex(v => { const el = $("view-" + v); return el && !el.classList.contains("hidden"); });
      if (cur < 0) return;
      const next = cur + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < ORDER.length) switchView(ORDER[next]);
    }
  }, { passive: true });
})();
/* --- ensure pass --- */
function platEnsure() {
  platOffline();
  const rb = $("refreshBtn");
  if (rb && rb.parentElement && !rb.parentElement.querySelector("[data-plat]")) {
    const wrap = document.createElement("span"); wrap.dataset.plat = "1"; wrap.className = "plat-btns";
    wrap.innerHTML = '<button type="button" class="mini-btn" id="platReportBtn">📄 Report</button><button type="button" class="mini-btn" id="platShareBtn">🖼 Share Card</button>';
    rb.after(wrap);
    $("platReportBtn").addEventListener("click", () => window.openReportSheet());
    $("platShareBtn").addEventListener("click", () => window.openShareSheet({ type: "summary" }));
  }
  const tb = $("themeBtn"); if (tb && !tb.getAttribute("aria-label")) tb.setAttribute("aria-label", "Switch light or dark theme");
  const pb = $("privacyBtn"); if (pb && !pb.getAttribute("aria-label")) pb.setAttribute("aria-label", "Privacy mode — hide amounts");
  platInstallBtn();
  platPngButtons(document);
  const taBar = document.querySelector("#taWrap .ta-bar");
  if (taBar && !$("taPngBtn")) {
    const tb2 = document.createElement("button");
    tb2.type = "button"; tb2.className = "mini-btn"; tb2.id = "taPngBtn"; tb2.textContent = "⬇ PNG"; tb2.title = "Download the TA chart as PNG";
    tb2.addEventListener("click", () => { const cv = $("taCanvas"); if (cv) cv.toBlob(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "folio-ta-chart.png"; a.click(); URL.revokeObjectURL(a.href); }); });
    taBar.appendChild(tb2);
  }
}
const _renderDashboardT4b = renderDashboard;
renderDashboard = function () { _renderDashboardT4b(); try { platEnsure(); } catch (e) {} };
const _switchViewT4 = switchView;
switchView = function (name) { _switchViewT4(name); setTimeout(() => { try { platPngButtons(document); } catch (e) {} }, 400); };

/* ================= TASK 2 (v66): TradingView Lightweight Charts =================
   The stock chart is now the open-source TradingView Lightweight Charts
   library (Apache-2.0), vendored at assets/lightweight-charts.standalone.
   production.js — no CDN, no tracking. It reuses the existing TA data
   pipeline (cache-first paint, background refresh, preview fallback):
   taDraw() now renders into the library instead of the hand-drawn canvas. */
const _taDrawCanvas = taDraw;
let lwc = null; /* { chart, main, vol, ema, sma, bbU, bbL, box, ro } */
function lwcColors() {
  const cs = getComputedStyle(document.documentElement);
  return { text: cs.getPropertyValue("--text").trim() || "#eee", muted: cs.getPropertyValue("--muted").trim() || "#999", line: cs.getPropertyValue("--line").trim() || "#333", panel: cs.getPropertyValue("--panel").trim() || "#111", up: "#10b981", down: "#ef4444", gold: "#c9a227" };
}
function lwcEnsure() {
  if (lwc) return lwc;
  if (!window.LightweightCharts) return null;
  const stack = document.querySelector("#taWrap .ta-stack");
  if (!stack) return null;
  stack.querySelectorAll("canvas").forEach(c => c.classList.add("hidden"));
  const zoom = stack.querySelector(".ta-zoom"); if (zoom) zoom.classList.add("hidden");
  const box = document.createElement("div"); box.id = "lwcBox";
  stack.insertBefore(box, stack.firstChild);
  const empty = document.createElement("div"); empty.id = "lwcEmpty"; empty.className = "hidden";
  empty.innerHTML = '<p class="empty-note">Chart data could not load — the free feed did not answer.</p><button type="button" class="mini-btn" id="lwcRetry">↻ Retry</button>';
  stack.appendChild(empty);
  empty.querySelector("#lwcRetry").addEventListener("click", () => { empty.classList.add("hidden"); try { renderTA(); } catch (e) {} });
  const C = lwcColors();
  const chart = LightweightCharts.createChart(box, {
    height: window.innerWidth < 640 ? 300 : 360,
    layout: { background: { type: "solid", color: "transparent" }, textColor: C.muted, fontSize: 11 },
    grid: { vertLines: { color: C.line }, horzLines: { color: C.line } },
    rightPriceScale: { borderColor: C.line },
    timeScale: { borderColor: C.line, timeVisible: true },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal }
  });
  const main = chart.addCandlestickSeries({ upColor: C.up, downColor: C.down, borderVisible: false, wickUpColor: C.up, wickDownColor: C.down });
  const barsS = chart.addBarSeries({ upColor: C.up, downColor: C.down, thinBars: false });
  barsS.applyOptions({ visible: false });
  const vol = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" } });
  chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  main.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.18 } });
  const ema = chart.addLineSeries({ color: C.gold, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  const sma = chart.addLineSeries({ color: C.muted, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  const bbU = chart.addLineSeries({ color: C.muted, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  const bbL = chart.addLineSeries({ color: C.muted, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  lwc = { chart, main, barsS, vol, ema, sma, bbU, bbL, box, empty, priceLines: [], barMap: new Map(), measurePts: [] };
  chart.subscribeCrosshairMove(param => {
    const hud = $("taHud"); if (!hud) return;
    if (!param || !param.time) return;
    const b = lwc.barMap.get(param.time);
    if (!b) return;
    const chg = b.o ? (b.c - b.o) / b.o * 100 : 0;
    const d = new Date(b.t);
    hud.textContent = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) + " · O " + inr2(b.o) + " · H " + inr2(b.h) + " · L " + inr2(b.l) + " · C " + inr2(b.c) + " · " + (chg >= 0 ? "▲ +" : "▼ ") + chg.toFixed(2) + "%" + (b.v ? " · Vol " + Number(b.v).toLocaleString("en-IN") : "");
  });
  chart.subscribeClick(param => {
    if (!taState.measure || !param || !param.time) return;
    const b = lwc.barMap.get(param.time); if (!b) return;
    lwc.measurePts.push({ time: param.time, price: b.c });
    if (lwc.measurePts.length === 2) {
      const [a, z] = lwc.measurePts;
      const dPct = (z.price - a.price) / a.price * 100;
      const hud = $("taHud");
      if (hud) hud.textContent = "Measure: " + inr2(a.price) + " → " + inr2(z.price) + " · " + (dPct >= 0 ? "▲ +" : "▼ ") + dPct.toFixed(2) + "% (" + (z.price - a.price >= 0 ? "+" : "−") + inr2(Math.abs(z.price - a.price)).replace("₹", "₹ ") + ") — tap the chart again to start a new measure.";
      lwc.measurePts = [];
    } else { const hud = $("taHud"); if (hud) hud.textContent = "Measure: first point " + inr2(b.c) + " — tap a second point."; }
  });
  if (window.ResizeObserver) { lwc.ro = new ResizeObserver(() => { try { lwc.chart.resize(lwc.box.clientWidth, window.innerWidth < 640 ? 300 : 360); } catch (e) {} }); lwc.ro.observe(box); }
  return lwc;
}
function lwcThemeRefresh() { if (!lwc) return; const C = lwcColors(); try { lwc.chart.applyOptions({ layout: { textColor: C.muted }, grid: { vertLines: { color: C.line }, horzLines: { color: C.line } } }); } catch (e) {} }
document.addEventListener("click", e => { if (e.target.closest("#themeBtn")) setTimeout(lwcThemeRefresh, 60); });
function lwcDraw() {
  const L = lwcEnsure();
  if (!L) { _taDrawCanvas(); return; }
  const bars = (taState.bars || []).slice().sort((a, b) => a.t - b.t);
  if (!bars.length) { L.empty.classList.remove("hidden"); taPill("loading"); return; }
  L.empty.classList.add("hidden");
  const C = lwcColors();
  const seen = new Map();
  bars.forEach(b => seen.set(Math.floor(b.t / 1000), b));
  const times = [...seen.keys()].sort((a, b) => a - b);
  const clean = times.map(t => seen.get(t));
  L.barMap = new Map(clean.map(b => [Math.floor(b.t / 1000), b]));
  const closes = clean.map(b => b.c);
  const T = b => Math.floor(b.t / 1000);
  const ohlcData = clean.map(b => ({ time: T(b), open: b.o, high: b.h, low: b.l, close: b.c }));
  if (taState.mode === "area") {
    L.main.applyOptions({ visible: false }); L.barsS.applyOptions({ visible: false });
    if (!L.area) { L.area = L.chart.addAreaSeries({ lineColor: C.gold, topColor: "rgba(201,162,39,.28)", bottomColor: "rgba(201,162,39,.02)", lineWidth: 2, priceLineVisible: false }); }
    L.area.applyOptions({ visible: true });
    L.area.setData(clean.map(b => ({ time: T(b), value: b.c })));
  } else if (taState.mode === "bars") {
    if (L.area) L.area.applyOptions({ visible: false });
    L.main.applyOptions({ visible: false }); L.barsS.applyOptions({ visible: true });
    L.barsS.setData(ohlcData);
  } else {
    if (L.area) L.area.applyOptions({ visible: false });
    L.barsS.applyOptions({ visible: false }); L.main.applyOptions({ visible: true });
    L.main.setData(ohlcData);
  }
  L.activeSeries = taState.mode === "bars" ? L.barsS : (taState.mode === "area" && L.area ? L.area : L.main);
  L.vol.setData(clean.map(b => ({ time: T(b), value: b.v || 0, color: b.c >= b.o ? "rgba(16,185,129,.45)" : "rgba(239,68,68,.45)" })));
  const line = (arr) => { const out = []; for (let i = 0; i < clean.length; i++) if (arr[i] != null && isFinite(arr[i])) out.push({ time: T(clean[i]), value: arr[i] }); return out; };
  L.ema.setData(taState.ema ? line(emaSeries(closes, 20)) : []);
  L.sma.setData(taState.sma ? line(smaSeries(closes, 200)) : []);
  if (taState.bb) {
    const mid = smaSeries(closes, 20), up = [], dn = [];
    for (let i = 0; i < closes.length; i++) {
      if (mid[i] == null) { up.push(null); dn.push(null); continue; }
      let s = 0; for (let j = i - 19; j <= i; j++) s += Math.pow(closes[j] - mid[i], 2);
      const sd = Math.sqrt(s / 20); up.push(mid[i] + 2 * sd); dn.push(mid[i] - 2 * sd);
    }
    L.bbU.setData(line(up)); L.bbL.setData(line(dn));
  } else { L.bbU.setData([]); L.bbL.setData([]); }
  L.priceLines.forEach(pl => { try { pl.series.removePriceLine(pl.line); } catch (e) {} });
  L.priceLines = [];
  if (taState.sr) {
    try { taLevels().forEach(lv => { L.priceLines.push({ series: L.activeSeries, line: L.activeSeries.createPriceLine({ price: lv.v, color: C.muted, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: lv.t }) }); }); } catch (e) {}
    const valid = clean.filter(b => b.h > 0);
    if (valid.length > 20) {
      const hi = Math.max(...valid.map(b => b.h)), lo = Math.min(...valid.map(b => b.l));
      L.priceLines.push({ series: L.activeSeries, line: L.activeSeries.createPriceLine({ price: hi, color: C.up, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, axisLabelVisible: true, title: "Range High" }) });
      L.priceLines.push({ series: L.activeSeries, line: L.activeSeries.createPriceLine({ price: lo, color: C.down, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, axisLabelVisible: true, title: "Range Low" }) });
    }
  }
  if (taState.trades) {
    const sym = taState.sym;
    const marks = (state.txns || []).filter(x => x.sym === sym && (x.type === "BUY" || x.type === "SELL")).map(x => {
      const t = Math.floor(new Date(x.date + "T00:00:00").getTime() / 1000);
      const near = times.find(tt => tt >= t) || times[times.length - 1];
      if (near == null) return null;
      return { time: near, position: x.type === "BUY" ? "belowBar" : "aboveBar", color: x.type === "BUY" ? C.up : C.down, shape: x.type === "BUY" ? "arrowUp" : "arrowDown", text: x.type + " " + x.qty + " @ " + x.price };
    }).filter(Boolean).sort((a, b) => a.time - b.time);
    try { L.activeSeries.setMarkers(marks); } catch (e) {}
  } else { try { L.activeSeries.setMarkers([]); } catch (e) {} }
  try { L.chart.timeScale().scrollToPosition(2, false); } catch (e) {}
  taPill(taState.preview ? "preview" : "live");
  const last = clean[clean.length - 1], first = clean[0];
  const vEl = $("taVerdict");
  if (vEl && last && first) {
    const chg = (last.c - first.o) / first.o * 100;
    const e20 = emaSeries(closes, 20), s200 = smaSeries(closes, 200);
    const stance = (e20[e20.length - 1] && s200[s200.length - 1]) ? (last.c > e20[e20.length - 1] ? (last.c > s200[s200.length - 1] ? "Above 20 EMA and 200 SMA — uptrend structure." : "Above 20 EMA, below 200 SMA — recovering, long trend still down.") : "Below 20 EMA — short-term weak.") : "";
    vEl.innerHTML = '<span class="chip">Period change <b class="' + (chg >= 0 ? "pos" : "neg") + '">' + (chg >= 0 ? "▲ +" : "▼ ") + chg.toFixed(2) + "%</b></span>" + (stance ? '<span class="chip">' + stance + "</span>" : "") + (taState.preview ? '<span class="chip">Estimated preview — real data swaps in automatically.</span>' : "");
  }
}
taDraw = function () { try { lwcDraw(); } catch (e) { try { _taDrawCanvas(); } catch (e2) {} } };
/* IndexedDB candle store (second layer under the localStorage cache) */
const idbC = { db: null,
  open() { return new Promise(res => { if (idbC.db) return res(idbC.db); try { const rq = indexedDB.open("folio-cache", 1); rq.onupgradeneeded = () => { rq.result.createObjectStore("candles"); }; rq.onsuccess = () => { idbC.db = rq.result; res(idbC.db); }; rq.onerror = () => res(null); } catch (e) { res(null); } }); },
  async get(k) { const db = await idbC.open(); if (!db) return null; return new Promise(res => { try { const rq = db.transaction("candles").objectStore("candles").get(k); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); } catch (e) { res(null); } }); },
  async put(k, v) { const db = await idbC.open(); if (!db) return; try { db.transaction("candles", "readwrite").objectStore("candles").put(v, k); } catch (e) {} }
};
const _taFetchRange0 = taFetchRange;
const _taInflight = {};
taFetchRange = async function (sym, range, interval, byDay) {
  const key = sym + "|" + range + "|" + interval;
  /* TTLs (Task B): intraday 60s · daily 15 min · 5Y/MAX 24h */
  const ttl = /^(5m|15m|60m)$/.test(interval) ? 60 * 1000 : (range === "5y" || range === "max" ? 24 * 3600 * 1000 : 15 * 60 * 1000);
  const hit = await idbC.get(key);
  if (hit && hit.bars && hit.bars.length) {
    try { folioMark("data"); } catch (e) {}
    if (Date.now() - hit.ts < ttl) return hit.bars;
    /* Stale: paint the saved candles NOW, refresh silently in the background. */
    window.__taCacheNote = { ts: hit.ts, sym: sym, key: key };
    if (!_taInflight[key]) {
      _taInflight[key] = _taFetchRange0(sym, range, interval, byDay).then(bars => {
        if (bars && bars.length) { idbC.put(key, { ts: Date.now(), bars }); if (window.__taCacheNote && window.__taCacheNote.key === key) { delete window.__taCacheNote; if (typeof stockSym !== "undefined" && stockSym && baseTicker(stockSym) === sym) { try { renderTA(); } catch (e) {} } } }
      }).catch(() => {}).finally(() => { delete _taInflight[key]; });
    }
    return hit.bars;
  }
  const bars = await _taFetchRange0(sym, range, interval, byDay);
  try { folioMark("data"); } catch (e) {}
  if (bars && bars.length) idbC.put(key, { ts: Date.now(), bars });
  return bars;
};
idbC.del = async function (k) { const db = await idbC.open(); if (!db) return; try { db.transaction("candles", "readwrite").objectStore("candles").delete(k); } catch (e) {} };
function folioStalePill(sym) {
  const n = window.__taCacheNote, p = $("taLivePill");
  if (!n || n.sym !== sym || !p) return;
  const d = new Date(n.ts);
  p.textContent = "Showing saved data from " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + " · Retry";
  p.className = "ta-live-pill preview"; p.dataset.stale = "1"; p.dataset.key = n.key;
}
/* Snapshot-first daily data (Task 3 pipeline JSON on the data branch).
   Until the pipeline runs, the fetch 404s and the live feed answers. */
const _fetchMaster0 = fetchMaster;
fetchMaster = async function (sym) {
  const snapP = (async () => {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 2500);
    try {
      const r = await fetch("https://raw.githubusercontent.com/SinghCaizen/SinghCaizen/data/portfolio/data/candles/" + encodeURIComponent(sym) + ".json", { signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !Array.isArray(j.bars) || j.bars.length < 10) return null;
      const ohlc = j.bars.map(a => ({ t: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 }));
      return { meta: j.meta || {}, points: ohlc.map(b => ({ t: b.t, c: b.c })), ohlc, divs: j.divs || [], splits: j.splits || [], fromSnapshot: true };
    } catch (e) { clearTimeout(to); return null; }
  })();
  try {
    const winner = await Promise.any([snapP, _fetchMaster0(sym)]);
    if (winner) return winner;
  } catch (e) {}
  return _fetchMaster0(sym);
};

/* ================= TASK 6 (v67): footer scope, transitions, scroll memory ================= */
const viewScrollMem = {};
let currentViewName = "dashboard";
const _switchViewT6 = switchView;
switchView = function (name) {
  viewScrollMem[currentViewName] = window.scrollY || 0;
  _switchViewT6(name);
  currentViewName = name;
  document.body.dataset.view = name;
  const sec = $("view-" + name);
  if (sec) { sec.classList.remove("view-enter"); void sec.offsetWidth; sec.classList.add("view-enter"); }
  const y = viewScrollMem[name] || 0;
  requestAnimationFrame(() => setTimeout(() => window.scrollTo(0, y), 30));
  if (name === "profile") setTimeout(legalLinkEnsure, 60);
};
function legalLinkEnsure() {
  const pv = $("view-profile");
  if (!pv || pv.querySelector(".profile-legal")) return;
  const row = document.createElement("div");
  row.className = "profile-legal";
  row.innerHTML = '<a href="#" data-open-terms="1" class="mini-btn" style="display:inline-flex;align-items:center;text-decoration:none">Legal &amp; Privacy</a>';
  row.querySelector("[data-open-terms]").addEventListener("click", e => { e.preventDefault(); const m = $("termsModal"); if (m) m.classList.remove("hidden"); });
  pv.appendChild(row);
}
document.body.dataset.view = "dashboard";

/* ================================================================
   PHASE 7 (v74) — data pipeline consumption
   Optional hourly JSON published by GitHub Actions to the repo's
   `data` branch (candles + fundamentals + ipo.json) and the
   hand-editable investors.json on main. Everything here is
   best-effort: if a file is missing or stale, the sections simply
   do not appear — no invented data, ever.
   ================================================================ */
const P7_RAW = "https://raw.githubusercontent.com/SinghCaizen/SinghCaizen/";
let p7Inv = null, p7Fund = null, p7LoadTried = false;
async function p7Load() {
  if (p7LoadTried) return; p7LoadTried = true;
  try { const r = await fetch(P7_RAW + "main/portfolio/data/investors.json", { cache: "no-store" }); if (r.ok) p7Inv = await r.json(); } catch (e) {}
  try { const r = await fetch(P7_RAW + "data/portfolio/data/fundamentals.json", { cache: "no-store" }); if (r.ok) { const j = await r.json(); p7Fund = j && j.data ? j.data : null; } } catch (e) {}
}
function p7QualityScore(f) {
  /* Transparent, shown-with-formula score from real fields only. */
  if (!f) return null;
  let pts = 0, parts = [];
  if (typeof f.roe === "number") { const p = f.roe >= 0.15 ? 2 : f.roe >= 0.08 ? 1 : 0; pts += p; parts.push("ROE " + (f.roe * 100).toFixed(1) + "% (+" + p + ")"); }
  if (typeof f.profitMargin === "number") { const p = f.profitMargin >= 0.12 ? 2 : f.profitMargin >= 0.05 ? 1 : 0; pts += p; parts.push("Margin " + (f.profitMargin * 100).toFixed(1) + "% (+" + p + ")"); }
  if (typeof f.debtToEquity === "number") { const p = f.debtToEquity <= 50 ? 2 : f.debtToEquity <= 150 ? 1 : 0; pts += p; parts.push("Debt/Eq " + f.debtToEquity.toFixed(0) + " (+" + p + ")"); }
  if (typeof f.revenueGrowth === "number") { const p = f.revenueGrowth >= 0.12 ? 2 : f.revenueGrowth >= 0.03 ? 1 : 0; pts += p; parts.push("Growth " + (f.revenueGrowth * 100).toFixed(1) + "% (+" + p + ")"); }
  if (!parts.length) return null;
  return { pts: pts, max: parts.length * 2, parts: parts };
}
async function p7EnhanceOverview() {
  const box = $("sxTabBody"); if (!box || !sxSym) return;
  if (box.dataset.p7done) return; box.dataset.p7done = "1";
  await p7Load();
  let html = "";
  const f = p7Fund && p7Fund[sxSym];
  if (f) {
    const rows = [];
    if (typeof f.pe === "number") rows.push(["P/E", f.pe.toFixed(1)]);
    if (typeof f.marketCap === "number") rows.push(["Market cap", inrShort(f.marketCap)]);
    if (typeof f.roe === "number") rows.push(["ROE", (f.roe * 100).toFixed(1) + "%"]);
    if (typeof f.debtToEquity === "number") rows.push(["Debt/Eq", f.debtToEquity.toFixed(0)]);
    if (rows.length) html += '<div class="sx-blk"><div class="sx-blk-t">Fundamentals <span class="sx-src">via the free data pipeline</span></div><div class="ks-strip">' + rows.map(r => '<div class="ks-cell"><span>' + r[0] + '</span><b>' + r[1] + "</b></div>").join("") + "</div>";
    const q = p7QualityScore(f);
    if (q) html += '<p class="sx-note">Quality score ' + q.pts + "/" + q.max + " — computed on this device from: " + q.parts.join(" · ") + ". Information only, not a recommendation.</p>";
    html += "</div>";
  }
  if (p7Inv && Array.isArray(p7Inv.investors)) {
    const holders = p7Inv.investors.filter(inv => (inv.holdings || []).some(h => h.sym === sxSym));
    if (holders.length) {
      html += '<div class="sx-blk"><div class="sx-blk-t">Smart Money — who else holds this</div>' + holders.map(inv => { const h = inv.holdings.find(x => x.sym === sxSym); return '<div class="sm-row"><b>' + esc(inv.name) + '</b><span class="sx-note">' + esc(h.note || "") + "</span></div>"; }).join("") + '<p class="sx-note">From the hand-checked investors file (' + esc(p7Inv.asOf || "") + ') — ' + esc(p7Inv.preparedBy || "verify before relying on it") + ".</p></div>";
    }
  }
  try {
    const news = await fetchNews(sxSym + " share", 6);
    const hot = (news || []).filter(n => /result|earnings|profit|order|contract|dividend|bonus|split|buyback|stake|approval/i.test(n.title || "")).slice(0, 2);
    if (hot.length) html += '<div class="sx-blk"><div class="sx-blk-t">🚩 Major news flags</div>' + hot.map(n => '<div class="sm-row"><span>' + esc(n.title) + "</span></div>").join("") + "</div>";
  } catch (e) {}
  if (html && $("sxTabBody")) box.insertAdjacentHTML("beforeend", html);
}
if (typeof sxSetTab === "function") {
  const _sxSetTabP7 = sxSetTab;
  sxSetTab = function (tab) { const r = _sxSetTabP7(tab); if (tab === "overview") { try { p7EnhanceOverview(); } catch (e) {} } return r; };
}


/* ================= TASK A: card merges, More sheet, stale-data watchdog ================= */
try { localStorage.removeItem("folio_ipo_vault"); localStorage.removeItem("folio_ipo_synced"); localStorage.removeItem("folio_ipo_watch"); } catch (e) {}
let allocViewMode = "donut";
function folioPanelByTitle(txt, exact) {
  const hs = document.querySelectorAll(".panel .panel-head h2");
  for (const h of hs) { const t = h.textContent.trim().toUpperCase(); if (exact ? t === txt : t.indexOf(txt) === 0) { const p = h.closest(".panel"); if (p) return p; } }
  return null;
}
function folioPaneTabs(keeper, key, tabs) {
  if (!keeper || keeper.dataset.merged === key) return;
  keeper.dataset.merged = key;
  const seg = document.createElement("div");
  seg.className = "seg seg-small folio-tabs";
  seg.innerHTML = tabs.map((t, i) => '<button type="button" class="seg-btn' + (i === 0 ? " active" : "") + '" data-ftab="' + t.id + '">' + t.label + "</button>").join("");
  const head = keeper.querySelector(".panel-head");
  if (head && head.nextSibling) keeper.insertBefore(seg, head.nextSibling); else keeper.appendChild(seg);
  const panes = {};
  tabs.forEach((t, i) => {
    const p = document.createElement("div");
    p.className = "folio-pane" + (i === 0 ? "" : " hidden");
    p.dataset.fpane = t.id;
    keeper.appendChild(p);
    panes[t.id] = p;
    (t.take || []).forEach(el => { if (el) p.appendChild(el); });
  });
  keeper._folioPanes = panes;
  seg.querySelectorAll("[data-ftab]").forEach(b => b.addEventListener("click", () => {
    seg.querySelectorAll("[data-ftab]").forEach(x => x.classList.toggle("active", x === b));
    Object.keys(panes).forEach(id => panes[id].classList.toggle("hidden", id !== b.dataset.ftab));
  }));
}
function folioSplitMovers() {
  const per = $("insPeriodBox") ? $("insPeriodBox").closest(".panel") : null;
  if (!per || !per._folioPanes) return;
  const mov = $("insMoversBox"); if (!mov) return;
  mov.querySelectorAll(".stat-chips .chip").forEach(ch => {
    const t = ch.textContent, pane = /Top Contributor/.test(t) ? per._folioPanes.gainers : /Biggest Drag/.test(t) ? per._folioPanes.draggers : null;
    if (pane) { const note = pane.querySelector(".empty-note"); if (note) note.remove(); pane.appendChild(ch); }
  });
  [["gainers", "No gainer stood out in this window."], ["draggers", "No dragger in this window."]].forEach(([id, msg]) => {
    const p = per._folioPanes[id];
    if (p && !p.children.length) p.innerHTML = '<p class="empty-note">' + msg + "</p>";
  });
}
function folioMerges() {
  const dSvg = $("donut");
  if (dSvg && !$("allocPanel")) {
    const hero = dSvg.closest(".panel"), dw = hero ? hero.querySelector(".donut-wrap") : null, dseg = $("donutSeg");
    if (hero && dw && dseg) {
      const np = document.createElement("div");
      np.className = "panel chart-panel"; np.id = "allocPanel";
      np.innerHTML = '<div class="panel-head"><h2>Allocation</h2><div class="seg seg-small"><button type="button" data-aview="donut" class="seg-btn active">Donut</button><button type="button" data-aview="bars" class="seg-btn">Bars</button></div></div>';
      hero.after(np); np.appendChild(dseg); np.appendChild(dw);
      np.querySelectorAll("[data-aview]").forEach(b => b.addEventListener("click", () => {
        allocViewMode = b.dataset.aview;
        np.querySelectorAll("[data-aview]").forEach(x => x.classList.toggle("active", x === b));
        np.classList.toggle("alloc-bars", allocViewMode === "bars");
      }));
    }
  }
  const ap = $("allocPanel"); if (ap && allocViewMode === "bars") ap.classList.add("alloc-bars");
  const sb = $("sectorBars"); if (sb) { const p = sb.closest(".panel"); if (p) p.classList.add("merged-away"); }
  const pie = folioPanelByTitle("ALLOCATION — PIE CHARTS", true); if (pie) pie.classList.add("merged-away");
  const cap = folioPanelByTitle("MARKET CAP CLASSIFICATION", true); if (cap) cap.classList.add("merged-away");
  const pg = folioPanelByTitle("PORTFOLIO GRAPH", true); if (pg) pg.classList.add("merged-away");
  const hm = folioPanelByTitle("HEATMAP", true); if (hm) hm.classList.add("merged-away");
  const scorePanel = $("insScoreNum") ? $("insScoreNum").closest(".panel") : null;
  if (scorePanel && scorePanel.dataset.merged !== "health") {
    const h2 = scorePanel.querySelector(".panel-head h2");
    if (h2 && h2.childNodes[0] && h2.childNodes[0].nodeType === 3) h2.childNodes[0].textContent = "Health & Signals ";
    const own = [...scorePanel.children].filter(c => !c.classList.contains("panel-head"));
    folioPaneTabs(scorePanel, "health", [
      { id: "score", label: "Score", take: own },
      { id: "insights", label: "Insights", take: [$("insDivBox"), $("insMomBox"), $("insRiskBox")] },
      { id: "signals", label: "Signals", take: [$("insSignals")] },
      { id: "win", label: "Win rate", take: [$("insHealthBox")] }
    ]);
    ["SCORE INSIGHTS", "SIGNALS", "PORTFOLIO HEALTH"].forEach(t => { const p = folioPanelByTitle(t, true); if (p) p.classList.add("merged-away"); });
  }
  const perPanel = $("insPeriodBox") ? $("insPeriodBox").closest(".panel") : null;
  if (perPanel && perPanel.dataset.merged !== "period") {
    folioPaneTabs(perPanel, "period", [
      { id: "period", label: "Period", take: [$("insPeriodBox")] },
      { id: "gainers", label: "Gainers", take: [] },
      { id: "draggers", label: "Draggers", take: [] },
      { id: "sectors", label: "Sectors", take: [$("insSectorBox")] }
    ]);
    const gd = folioPanelByTitle("PERIOD GAINERS VS DRAGGERS", true); if (gd) gd.classList.add("merged-away");
    const sp = folioPanelByTitle("SECTOR PERFORMANCE (PERIOD)", true); if (sp) sp.classList.add("merged-away");
  }
  folioSplitMovers();
  const evPanel = $("eventsBox") ? $("eventsBox").closest(".panel") : null;
  if (evPanel && evPanel.dataset.merged !== "news") {
    const h2 = evPanel.querySelector(".panel-head h2"); if (h2) h2.textContent = "News & Announcements";
    folioPaneTabs(evPanel, "news", [
      { id: "ann", label: "Announcements", take: [$("eventsBox")] },
      { id: "news", label: "News", take: [$("newsList")] }
    ]);
    const np2 = folioPanelByTitle("PORTFOLIO NEWS", true); if (np2) np2.classList.add("merged-away");
  }
  document.querySelectorAll(".panel-head h2").forEach(h => {
    if (h.dataset.stripped) return; h.dataset.stripped = "1";
    const n = h.childNodes[0];
    if (n && n.nodeType === 3) n.textContent = n.textContent.replace(/^[\s\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]+/u, "");
  });
}
if (typeof dashDecoratePanels === "function") { const _dcpA = dashDecoratePanels; dashDecoratePanels = function () { const r = _dcpA.apply(this, arguments); try { folioMerges(); } catch (e) {} return r; }; }
if (typeof renderInsPeriod === "function") { const _ripA = renderInsPeriod; renderInsPeriod = async function () { const r = await _ripA.apply(this, arguments); try { folioMerges(); } catch (e) {} return r; }; }
try { folioMerges(); } catch (e) {}
document.addEventListener("click", e => {
  const sx = e.target.closest("[data-sxretry]");
  if (sx && window.__sheetSym) { try { loadCompanySheet(window.__sheetSym); } catch (x) {} return; }
  if (e.target.closest("#dockMoreBtn")) { const s = $("moreSheet"); if (s) s.classList.remove("hidden"); return; }
  if (e.target.closest("[data-more-close]")) { const s = $("moreSheet"); if (s) s.classList.add("hidden"); return; }
  const mv = e.target.closest("[data-more-view]");
  if (mv) { const s = $("moreSheet"); if (s) s.classList.add("hidden"); switchView(mv.dataset.moreView); return; }
  const ma = e.target.closest("[data-more-act]");
  if (ma) {
    const s = $("moreSheet"); if (s) s.classList.add("hidden");
    if (ma.dataset.moreAct === "report") { const b = $("issueBtn"); if (b) b.click(); }
    if (ma.dataset.moreAct === "legal") { const m = $("termsModal"); if (m) m.classList.remove("hidden"); }
    return;
  }
  if (e.target.id === "moreSheet") { e.target.classList.add("hidden"); return; }
  const pm = e.target.closest("[data-pmode]");
  if (pm) {
    perfBench = pm.dataset.pmode === "bench";
    const cb = $("perfBench"); if (cb) cb.checked = perfBench;
    document.querySelectorAll("#perfModeSeg .seg-btn").forEach(x => x.classList.toggle("active", x === pm));
    perfKey = ""; try { renderPerf(enriched()); } catch (x) {}
    return;
  }
  const ib = e.target.closest("#lwIndBtn");
  if (ib) { const sh = $("lwIndSheet"); if (sh) { sh.classList.toggle("hidden"); ib.setAttribute("aria-expanded", sh.classList.contains("hidden") ? "false" : "true"); } return; }
  if (e.target.closest("[data-unavail-retry]")) { try { renderAll(); } catch (x) {} }
});
document.addEventListener("focusin", e => { const t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") document.body.classList.add("kb-open"); });
document.addEventListener("focusout", () => setTimeout(() => { const t = (document.activeElement || {}).tagName; if (t !== "INPUT" && t !== "TEXTAREA" && t !== "SELECT") document.body.classList.remove("kb-open"); }, 150));
const _skelSeen = new WeakMap();
setInterval(() => {
  if (!currentUser || document.hidden) return;
  document.querySelectorAll("#view-dashboard .skel, #view-insights .skel, #view-news .skel, #view-insights .insx-skel").forEach(sk => {
    if (sk.offsetParent === null) return;
    const host = sk.parentElement; if (!host) return;
    const now = Date.now();
    if (!_skelSeen.has(sk)) { _skelSeen.set(sk, now); return; }
    if (now - _skelSeen.get(sk) > 8000 && !host.dataset.unavail) {
      host.dataset.unavail = "1";
      host.innerHTML = '<p class="empty-note">Data unavailable · <button type="button" class="mini-btn" data-unavail-retry="1">Retry</button></p>';
      setTimeout(() => { try { delete host.dataset.unavail; } catch (x) {} }, 2000);
    }
  });
}, 2500);

/* ================= TASK B: stock-page speed — marks, prefetch, persistence ================= */
window.__folioPerf = { tap: 0, data: 0, paint: 0, sym: "" };
function folioArm(sym) { window.__folioPerf = { tap: performance.now(), data: 0, paint: 0, sym: sym }; try { performance.mark("folio_tap"); } catch (e) {} }
function folioMark(what) {
  const P = window.__folioPerf; if (!P || !P.tap) return;
  if (what === "data" && !P.data) { P.data = performance.now(); try { performance.mark("folio_data"); } catch (e) {} }
  if (what === "paint" && !P.paint) { P.paint = performance.now(); try { performance.mark("folio_paint"); } catch (e) {} }
}
const _fmPerfB = fetchMaster;
fetchMaster = async function (sym) { const r = await _fmPerfB(sym); try { folioMark("data"); } catch (e) {} return r; };
if (typeof drawStock === "function") { const _dsB = drawStock; drawStock = async function () { const r = await _dsB.apply(this, arguments); requestAnimationFrame(() => folioMark("paint")); return r; }; }
if (typeof taDraw === "function") { const _tdB = taDraw; taDraw = function () { const r = _tdB.apply(this, arguments); const w = $("lwWrap"); if (w && !w.classList.contains("hidden")) { w.classList.remove("lw-fade"); void w.offsetWidth; w.classList.add("lw-fade"); } requestAnimationFrame(() => folioMark("paint")); return r; }; }
if (window.FOLIO_WORKER_URL) { try { PROXIES.unshift(u => window.FOLIO_WORKER_URL + "?url=" + encodeURIComponent(u)); } catch (e) {} }
/* System Health: last stock-open timings */
(function sysPerfLine() {
  const hi = $("healthInfo"); if (!hi || $("sysPerf")) return;
  const d = document.createElement("div");
  d.id = "sysPerf"; d.className = "price-meta"; d.style.marginTop = "4px";
  hi.after(d);
  setInterval(() => {
    const pv = $("view-profile"); if (pv && pv.classList.contains("hidden")) return;
    const P = window.__folioPerf; if (!P || !P.paint) { d.textContent = ""; return; }
    const td = P.data ? Math.round(P.data - P.tap) : null, tp = Math.round(P.paint - P.tap);
    d.textContent = "Last stock open (" + P.sym + "): " + (td !== null ? "data " + td + " ms · " : "") + "chart painted " + tp + " ms after tap" + (tp < 400 ? " · from cache" : "");
  }, 2000);
})();
/* Prefetch: warm 1Y daily data for the first watchlist/holdings symbols, idle only */
let _pfLast = 0;
function folioPrefetch() {
  if (!currentUser || typeof state === "undefined" || !state) return;
  if (Date.now() - _pfLast < 10 * 60 * 1000) return;
  _pfLast = Date.now();
  const syms = [];
  (state.watch || []).forEach(w => syms.push(w.sym));
  try { enriched().rows.forEach(r => syms.push(r.sym)); } catch (e) {}
  [...new Set(syms)].slice(0, 8).forEach((s, i) => setTimeout(() => {
    try { fetchMaster(s); } catch (e) {}
    try { taFetchRange(baseTicker(s), "1y", "1d", true); } catch (e) {}
  }, 350 * i));
}
const _ricB = window.requestIdleCallback || (cb => setTimeout(cb, 900));
if (typeof renderWatch === "function") { const _rwB = renderWatch; renderWatch = function () { const r = _rwB.apply(this, arguments); _ricB(() => { try { folioPrefetch(); } catch (e) {} }); return r; }; }
if (typeof renderHoldings === "function") { const _rhB = renderHoldings; renderHoldings = function () { const r = _rhB.apply(this, arguments); _ricB(() => { try { folioPrefetch(); } catch (e) {} }); return r; }; }
document.addEventListener("pointerdown", e => {
  const t = e.target.closest("[data-heat],[data-heat2],[data-hold-toggle],[data-open]");
  if (!t) return;
  const s = t.dataset.heat || t.dataset.heat2 || t.dataset.holdToggle || t.dataset.open;
  if (!s) return;
  try { fetchMaster(s); } catch (x) {}
  try { taFetchRange(baseTicker(s), "1y", "1d", true); } catch (x) {}
}, { passive: true });
/* Remember the TA range + chart type */
try {
  const sv = JSON.parse(localStorage.getItem("folio_ta_tf") || "null");
  if (sv && sv.tf) { Object.assign(taState.tf, sv.tf); if (sv.mode) taState.mode = sv.mode; }
} catch (e) {}
document.addEventListener("click", e => {
  if (e.target.closest("#taTfSeg") || e.target.closest("#taModeSeg")) {
    try { localStorage.setItem("folio_ta_tf", JSON.stringify({ tf: taState.tf, mode: taState.mode })); } catch (x) {}
  }
  const pill = e.target.closest("#taLivePill[data-stale='1']");
  if (pill) {
    const key = pill.dataset.key;
    delete window.__taCacheNote;
    if (key) { try { idbC.del(key); } catch (x) {} try { localStorage.removeItem("folio_ta_" + key); } catch (x) {} }
    pill.textContent = "◌ Loading chart…"; pill.className = "ta-live-pill loading"; delete pill.dataset.stale;
    try { renderTA(); } catch (x) {}
  }
});
/* Double-tap / double-click resets the chart view */
document.addEventListener("dblclick", e => {
  if (e.target.closest("#lwWrap")) { try { if (lwChart) lwChart.timeScale().fitContent(); } catch (x) {} }
  if (e.target.closest("#taOverlay")) { try { taResetView(); } catch (x) {} }
});

/* ================= TASK C: deals, news upgrade, events, gains, compare, watchlist ================= */
const DATA_BASE = "https://raw.githubusercontent.com/SinghCaizen/SinghCaizen/data/portfolio/data/";
async function folioDataJson(name) {
  const ck = "folio_data_" + name;
  const hit = lsCacheGet(ck, 30 * 60 * 1000);
  if (hit) return hit;
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(DATA_BASE + name, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const j = await r.json();
    lsCacheSet(ck, j);
    return j;
  } catch (e) { return null; }
}
function folioProf() { try { if (state && !state.profile) state.profile = {}; return (state && state.profile) || {}; } catch (e) { return {}; } }
function folioDownload(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function mySyms() { const s = new Set(); try { enriched().rows.forEach(r => s.add(r.sym)); } catch (e) {} (state.watch || []).forEach(w => s.add(w.sym)); return s; }
function fmtCr(v) { return Number.isFinite(v) ? "₹" + (v / 1e7).toFixed(2) + " Cr" : "—"; }
/* ---------- Big Deals ---------- */
let folioDeals = null, folioDealsTried = false;
async function folioLoadDeals() {
  if (folioDeals || folioDealsTried) return folioDeals;
  folioDealsTried = true;
  const j = await folioDataJson("deals.json");
  if (j && Array.isArray(j.data) && j.data.length) { folioDeals = j.data.filter(r => r && r.sym && isFinite(Number(r.qty)) && isFinite(Number(r.price))); if (folioDeals.length) { try { folioOnDeals(); } catch (e) {} } else folioDeals = null; }
  return folioDeals;
}
function dealThr() { const p = folioProf(); return Number(p.dealThresholdCr) > 0 ? Number(p.dealThresholdCr) : 1; }
function folioSpotted() {
  const names = folioProf().dealWatchNames || [];
  if (!folioDeals || !names.length) return [];
  const out = [];
  folioDeals.forEach(r => { const cl = (r.client || "").toLowerCase(); names.forEach(n => { if (n && cl.includes(n.toLowerCase())) out.push({ name: n, r: r }); }); });
  return out.slice(0, 8);
}
function dealRowHtml(r, big) {
  return '<div class="deal-row' + (big ? " deal-big" : "") + '"><span class="news-chip">' + esc(r.sym) + '</span><span class="deal-main"><b>' + esc(r.client) + '</b> · <span class="' + (r.side === "BUY" ? "pos" : "neg") + '">' + r.side + "</span> " + Number(r.qty).toLocaleString("en-IN") + " @ " + inr2(r.price) + '</span><span class="deal-val">' + fmtCr(r.qty * r.price) + " · " + fmtDate(r.d) + "</span></div>";
}
function folioOnDeals() {
  const card = document.querySelector(".more-sheet-card");
  if (card && !card.querySelector('[data-more-view="deals"]')) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "more-row"; b.dataset.moreView = "deals";
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/><path d="M12 3v12"/><path d="M4 21h16"/></svg><span>Big Deals</span>';
    const prof = card.querySelector('[data-more-view="profile"]');
    if (prof) card.insertBefore(b, prof); else card.appendChild(b);
  }
  folioRenderDealsCard();
  folioChanged();
}
function folioRenderDealsCard() {
  if (!folioDeals) return;
  const view = $("view-dashboard"); if (!view) return;
  let panel = $("dealsCard");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "panel"; panel.id = "dealsCard";
    panel.innerHTML = '<div class="panel-head"><h2>Big Deals on my stocks</h2><button type="button" class="mini-btn" data-deals-all="1">See all deals</button></div><div class="deal-spotted"></div><div class="deal-list"></div><p class="price-meta">Reported bulk/block deals only · highlight above ' + dealThr() + " Cr (editable in the Deals view)</p>";
    const anchor = $("allocPanel") || view.querySelector(".panel");
    if (anchor && anchor.after) anchor.after(panel); else view.appendChild(panel);
  }
  const mine = mySyms();
  const rows = folioDeals.filter(r => mine.has(r.sym)).slice(0, 10);
  const list = panel.querySelector(".deal-list");
  list.innerHTML = rows.length ? rows.map(r => dealRowHtml(r, r.qty * r.price >= dealThr() * 1e7)).join("") : '<p class="empty-note">No reported bulk/block deals on your stocks in the saved window yet.</p>';
  const spot = folioSpotted().filter(s => mine.has(s.r.sym));
  panel.querySelector(".deal-spotted").innerHTML = spot.map(s => '<p class="spot-line">Spotted: <b>' + esc(s.name) + "</b> " + (s.r.side === "BUY" ? "bought" : "sold") + " " + esc(s.r.sym) + " · " + fmtCr(s.r.qty * s.r.price) + " · " + fmtDate(s.r.d) + "</p>").join("");
}
function folioEnsureDealsView() {
  if ($("view-deals")) return;
  const sec = document.createElement("section");
  sec.id = "view-deals"; sec.className = "view hidden";
  sec.innerHTML = '<div class="panel"><div class="panel-head"><h2>Big Deals</h2><span class="price-meta">NSE reported bulk &amp; block deals · last 60 days</span></div>' +
    '<div class="insx-setrow"><label>Search <input id="dealSearch" type="search" placeholder="Stock or client name"></label>' +
    '<label>Highlight above (₹ Cr) <input id="dealThr" type="number" min="0" step="0.5" value="' + dealThr() + '"></label></div>' +
    '<div class="insx-setrow"><label>Famous investors watch <input id="dealWatchIn" type="text" placeholder="Type a name, e.g. a fund or investor"></label><button type="button" class="btn" id="dealWatchAdd">Add name</button></div>' +
    '<div id="dealWatchChips" class="stat-chips"></div><div id="dealSpotted"></div><div id="dealTable" style="margin-top:10px"></div>' +
    '<p class="price-meta">These are reported deals only, as published by the exchange. A name in the watch list is matched against the client name printed in the deal.</p></div>';
  document.querySelector("main").appendChild(sec);
  $("dealSearch").addEventListener("input", folioDeb(folioRenderDeals, 300));
  $("dealThr").addEventListener("change", () => { const p = folioProf(); p.dealThresholdCr = Number($("dealThr").value) || 1; persist(); folioRenderDeals(); folioRenderDealsCard(); });
  $("dealWatchAdd").addEventListener("click", () => {
    const v = $("dealWatchIn").value.trim(); if (!v) return;
    const p = folioProf(); p.dealWatchNames = p.dealWatchNames || [];
    if (!p.dealWatchNames.some(n => n.toLowerCase() === v.toLowerCase())) p.dealWatchNames.push(v);
    $("dealWatchIn").value = ""; persist(); folioRenderDeals(); folioRenderDealsCard();
  });
}
function folioRenderDeals() {
  folioEnsureDealsView();
  const chips = $("dealWatchChips"), p = folioProf();
  chips.innerHTML = (p.dealWatchNames || []).map(n => '<span class="chip">' + esc(n) + ' <button type="button" class="chip-x" data-unwatch-name="' + esc(n) + '" aria-label="Remove">×</button></span>').join("");
  chips.querySelectorAll("[data-unwatch-name]").forEach(b => b.addEventListener("click", () => { p.dealWatchNames = (p.dealWatchNames || []).filter(n => n !== b.dataset.unwatchName); persist(); folioRenderDeals(); folioRenderDealsCard(); }));
  const spot = folioSpotted();
  $("dealSpotted").innerHTML = spot.map(s => '<p class="spot-line">Spotted: <b>' + esc(s.name) + "</b> " + (s.r.side === "BUY" ? "bought" : "sold") + " " + esc(s.r.sym) + " · " + Number(s.r.qty).toLocaleString("en-IN") + " @ " + inr2(s.r.price) + " · " + fmtCr(s.r.qty * s.r.price) + " · " + fmtDate(s.r.d) + "</p>").join("");
  const box = $("dealTable");
  if (!folioDeals) { box.innerHTML = '<p class="empty-note">Deal data has not arrived yet. Folio checks the exchange files every day; when the first file lands, deals will appear here — nothing is shown until real data exists.</p>'; return; }
  const q = ($("dealSearch").value || "").trim().toLowerCase();
  const rows = folioDeals.filter(r => !q || r.sym.toLowerCase().includes(q) || (r.client || "").toLowerCase().includes(q)).slice(0, 300);
  if (!rows.length) { box.innerHTML = '<p class="empty-note">No deals match your search.</p>'; return; }
  box.innerHTML = '<div class="table-scroll"><table class="folio-table"><thead><tr><th>Date</th><th>Stock</th><th>Client</th><th>B/S</th><th>Qty</th><th>Price</th><th>Value</th></tr></thead><tbody>' +
    rows.map(r => '<tr class="' + (r.qty * r.price >= dealThr() * 1e7 ? "deal-big" : "") + '"><td>' + fmtDate(r.d) + "</td><td><b>" + esc(r.sym) + "</b></td><td>" + esc(r.client) + '</td><td class="' + (r.side === "BUY" ? "pos" : "neg") + '">' + r.side + "</td><td>" + Number(r.qty).toLocaleString("en-IN") + "</td><td>" + inr2(r.price) + "</td><td>" + fmtCr(r.qty * r.price) + "</td></tr>").join("") + "</tbody></table></div>";
}
document.addEventListener("click", e => { if (e.target.closest("[data-deals-all]")) switchView("deals"); });
const _lcsC = loadCompanySheet;
loadCompanySheet = async function (sym) {
  const r = await _lcsC.apply(this, arguments);
  try {
    if (!folioDeals) { folioLoadDeals(); return r; }
    const rows = folioDeals.filter(x => x.sym === baseTicker(sym)).slice(0, 6);
    const ab = $("sxAbout");
    if (rows.length && ab && !ab.querySelector(".sheet-deals")) {
      const div = document.createElement("div");
      div.className = "sheet-deals";
      div.innerHTML = "<h3>Big Deals (reported)</h3>" + rows.map(x => dealRowHtml(x, x.qty * x.price >= dealThr() * 1e7)).join("") + '<p class="price-meta">Reported bulk/block deals only.</p>';
      ab.appendChild(div);
    }
  } catch (e) {}
  return r;
};
/* ---------- What Changed Today ---------- */
function folioChanged() {
  const view = $("view-dashboard"); if (!view || !currentUser) return;
  let strip = $("changedStrip");
  if (!strip) {
    strip = document.createElement("div");
    strip.id = "changedStrip"; strip.className = "panel changed-strip";
    const sg = view.querySelector(".stat-grid");
    if (sg) view.insertBefore(strip, sg); else view.appendChild(strip);
  }
  let d; try { d = enriched(); } catch (e) { return; }
  if (!d || !d.rows || !d.rows.length) { strip.classList.add("hidden"); return; }
  const lines = [];
  let dayPnl = 0, dayBase = 0, drag = null, nearLow = 0;
  d.rows.forEach(r => {
    if (r.dayPct != null && r.ltp) { const pc = r.ltp / (1 + r.dayPct / 100); const dp = r.qty * (r.ltp - pc); dayPnl += dp; dayBase += r.qty * pc; if (!drag || dp < drag.dp) drag = { sym: r.sym, dp: dp }; }
    const mc = (typeof masterCache !== "undefined" && masterCache[r.sym]) || null;
    const lo = mc && mc.meta && mc.meta.fiftyTwoWeekLow;
    if (lo && r.ltp && r.ltp <= lo * 1.05) nearLow++;
  });
  if (dayBase) { const pd = dayPnl / dayBase * 100; lines.push("Portfolio " + (pd >= 0 ? "+" : "") + pd.toFixed(1) + "% today"); }
  if (drag && drag.dp < 0) lines.push("Biggest drag: " + drag.sym + " (" + inrShort(drag.dp) + ")");
  if (nearLow) lines.push(nearLow + (nearLow === 1 ? " stock" : " stocks") + " near 52W low");
  if (folioDeals) { const today = new Date().toISOString().slice(0, 10); const mine = mySyms(); const todays = folioDeals.filter(x => x.d === today && mine.has(x.sym)); if (todays.length) lines.push(todays.length + " big deal" + (todays.length > 1 ? "s" : "") + " on " + todays[0].sym + (todays.length > 1 ? " & others" : "") + " today"); }
  if (!lines.length) { strip.classList.add("hidden"); return; }
  strip.classList.remove("hidden");
  strip.innerHTML = '<span class="cs-title">What changed today</span>' + lines.map(l => '<span class="cs-line">' + esc(l) + "</span>").join("");
}
/* ---------- News upgrade: tags, filters, Important, new-dot ---------- */
const NEWS_TAG_LABELS = { results: "Results", orders: "Orders & Deals", mgmt: "Management", reg: "Regulatory", div: "Dividends" };
let newsFilter = "all";
function folioTagNews(t) {
  const s = (t || "").toLowerCase();
  if (/(sebi|penalt|show ?cause|regulat|probe|nse notice|bse notice)/.test(s)) return "reg";
  if (/dividend/.test(s)) return "div";
  if (/(ceo|managing director|chairman|resign|appoint|board appoint)/.test(s)) return "mgmt";
  if (/(order win|wins order|bags order|order book|contract|order worth)/.test(s)) return "orders";
  if (/(result|quarter|earnings|profit|revenue|q[1-4]\b)/.test(s)) return "results";
  return "all";
}
function folioImportant(t) { return /(results?|quarter|earnings|order win|wins order|acqui|merger|block deal|bulk deal|sebi|rating|upgrade|downgrade|fraud|resign)/i.test(t || ""); }
function folioNewsSetup() {
  const nl = $("newsList"); if (!nl || $("newsChips")) return;
  const parent = nl.parentElement; if (!parent) return;
  const div = document.createElement("div");
  div.className = "seg seg-small folio-tabs"; div.id = "newsChips";
  div.innerHTML = [["all", "All"], ["results", "Results"], ["orders", "Orders & Deals"], ["mgmt", "Management"], ["reg", "Regulatory"], ["div", "Dividends"]].map(([id, lab], i) => '<button type="button" class="seg-btn' + (i === 0 ? " active" : "") + '" data-ntag="' + id + '">' + lab + "</button>").join("");
  parent.insertBefore(div, nl);
  div.querySelectorAll("[data-ntag]").forEach(b => b.addEventListener("click", () => { newsFilter = b.dataset.ntag; div.querySelectorAll("[data-ntag]").forEach(x => x.classList.toggle("active", x === b)); folioNewsRender(); }));
}
function folioNewsRender() {
  const box = $("newsList"); const items = window.__newsItems;
  if (!box || !items) return;
  folioNewsSetup();
  let seen = 0; try { seen = Number(localStorage.getItem("folio_news_seen") || 0); } catch (e) {}
  const list = items.filter(n => newsFilter === "all" || folioTagNews(n.title) === newsFilter);
  if (!list.length) { box.innerHTML = '<p class="empty-note">No news in this filter right now.</p>'; return; }
  box.innerHTML = (typeof staleNote === "function" ? staleNote() : "") + list.map(n => {
    const tag = folioTagNews(n.title);
    return '<div class="news-row">' + (n.sym ? '<span class="news-chip">' + esc(n.sym) + "</span>" : "") +
      (n.ts > seen ? '<span class="new-dot" title="New since your last visit"></span>' : "") +
      '<a class="news-title" href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(n.title) + "</a>" +
      (folioImportant(n.title) ? '<span class="chip imp-chip">Important</span>' : "") +
      '<span class="news-meta">' + esc(n.source) + " · " + relTime(n.ts) + (tag !== "all" ? ' · <span class="auto-tag">auto-tagged: ' + NEWS_TAG_LABELS[tag] + "</span>" : "") + "</span></div>";
  }).join("");
}
const _svC = switchView;
switchView = function (name) {
  _svC(name);
  if (name === "deals") { try { folioRenderDeals(); } catch (e) {} }
  if (name === "news") setTimeout(() => { try { localStorage.setItem("folio_news_seen", String(Date.now())); } catch (e) {} }, 2500);
};

/* ---------- Events calendar ---------- */
let evCalData = null, evCalKey = "", evCalMode = "list";
async function folioCollectEvents() {
  const out = [];
  const syms = [...mySyms()].slice(0, 12);
  const now = Date.now();
  await Promise.all(syms.map(async sym => {
    try { const info = await fetchCompanyInfo(sym); if (info && info.ok && info.nextEarnings) out.push({ sym: sym, date: info.nextEarnings, type: "Results", label: "Quarterly results expected" }); } catch (e) {}
    try { const m = await fetchMaster(sym); if (m) {
      Object.values(m.divs || {}).forEach(dv => { if (dv && dv.date) out.push({ sym: sym, date: dv.date * 1000, type: "Dividend", label: "Ex-dividend" + (dv.amount ? " · ₹" + dv.amount + "/share" : "") }); });
      Object.values(m.splits || {}).forEach(sp => { if (sp && sp.date) out.push({ sym: sym, date: sp.date * 1000, type: "Split/Bonus", label: "Stock split / bonus" + (sp.splitRatio ? " · " + sp.splitRatio : "") }); });
    } } catch (e) {}
  }));
  return out.filter(e => e.date > now - 7 * 86400000 && e.date < now + 62 * 86400000).sort((a, b) => a.date - b.date);
}
function folioEventsPanel() {
  const view = $("view-dashboard"); if (!view || !currentUser) return;
  const key = [...mySyms()].join(",");
  if (!key) return;
  let panel = $("evCalPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "panel"; panel.id = "evCalPanel";
    panel.innerHTML = '<div class="panel-head"><h2>Upcoming events for my stocks</h2><span class="seg seg-small"><button type="button" class="seg-btn active" data-evcal="list">List</button><button type="button" class="seg-btn" data-evcal="month">Month</button></span></div><div class="evcal-body"><div class="skel" style="height:54px"></div></div><div class="panel-foot"><button type="button" class="mini-btn" data-evcal-ics="1">Add to phone calendar (.ics)</button></div>';
    const anchor = $("dealsCard") || $("allocPanel") || view.querySelector(".panel");
    if (anchor && anchor.after) anchor.after(panel); else view.appendChild(panel);
    panel.querySelectorAll("[data-evcal]").forEach(b => b.addEventListener("click", () => { evCalMode = b.dataset.evcal; panel.querySelectorAll("[data-evcal]").forEach(x => x.classList.toggle("active", x === b)); folioEventsRender(); }));
    panel.querySelector("[data-evcal-ics]").addEventListener("click", folioEventsIcs);
  }
  if (key === evCalKey && evCalData) return;
  evCalKey = key;
  folioCollectEvents().then(rows => { evCalData = rows; folioEventsRender(); });
}
function folioEventsRender() {
  const panel = $("evCalPanel"); if (!panel) return;
  const body = panel.querySelector(".evcal-body");
  if (!evCalData) { body.innerHTML = '<p class="empty-note">Loading events…</p>'; return; }
  if (!evCalData.length) { body.innerHTML = '<p class="empty-note">No result dates, ex-dividend dates or splits found for your stocks in the free data right now.</p>'; return; }
  if (evCalMode === "month") {
    const now = new Date(); const y = now.getFullYear(), mo = now.getMonth();
    const first = new Date(y, mo, 1); const startDay = (first.getDay() + 6) % 7; const days = new Date(y, mo + 1, 0).getDate();
    const byDay = {};
    evCalData.forEach(e => { const d = new Date(e.date); if (d.getFullYear() === y && d.getMonth() === mo) (byDay[d.getDate()] = byDay[d.getDate()] || []).push(e); });
    let cells = "";
    ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => { cells += '<span class="evcal-dow">' + d + "</span>"; });
    for (let i = 0; i < startDay; i++) cells += "<span></span>";
    for (let d = 1; d <= days; d++) cells += '<span class="evcal-day' + (byDay[d] ? " has" : "") + (d === now.getDate() ? " today" : "") + '" title="' + (byDay[d] ? esc(byDay[d].map(e => e.sym + " · " + e.type).join("; ")) : "") + '">' + d + (byDay[d] ? '<i class="evcal-dot"></i>' : "") + "</span>";
    const monthRows = evCalData.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === mo; });
    body.innerHTML = '<p class="price-meta">' + first.toLocaleString("en-IN", { month: "long", year: "numeric" }) + '</p><div class="evcal-grid">' + cells + "</div>" + (monthRows.length ? monthRows.map(folioEventRow).join("") : '<p class="empty-note">No events this month.</p>');
    return;
  }
  body.innerHTML = evCalData.slice(0, 14).map(folioEventRow).join("");
}
function folioEventRow(e) {
  const days = Math.round((new Date(e.date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const when = days < 0 ? Math.abs(days) + "d ago" : days === 0 ? "TODAY" : days === 1 ? "tomorrow" : "in " + days + " days";
  return '<div class="event-row"><span class="news-chip">' + esc(e.sym) + '</span><span class="event-text"><b>' + esc(e.type) + "</b> — " + esc(e.label) + " · " + fmtDate(e.date) + " (" + when + ")</span></div>";
}
function folioEventsIcs() {
  if (!evCalData || !evCalData.length) { toast("No events to export yet"); return; }
  const dt = d => new Date(d).toISOString().slice(0, 10).replace(/-/g, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Folio//Events//EN"].concat(evCalData.map((e, i) =>
    ["BEGIN:VEVENT", "UID:folio-ev-" + i + "-" + Math.round(e.date) + "@singhcaizen", "DTSTART;VALUE=DATE:" + dt(e.date), "SUMMARY:" + (e.sym + " · " + e.type + " — " + e.label).replace(/,/g, " "), "END:VEVENT"].join("\r\n"))).join("\r\n") + "\r\nEND:VCALENDAR";
  folioDownload("folio-events.ics", ics, "text/calendar");
  toast("Calendar file downloaded — open it to add the events");
}
/* ---------- Capital gains statement ---------- */
let gainsFy = "";
function folioFifo() {
  const lots = {}; const sales = [];
  const txns = [...(state.txns || [])].sort((a, b) => a.date < b.date ? -1 : 1);
  txns.forEach(t => {
    if (t.type === "BUY") (lots[t.sym] = lots[t.sym] || []).push({ date: t.date, qty: Number(t.qty) || 0, price: effPrice(t) });
    else if (t.type === "SELL") {
      let q = Number(t.qty) || 0; const sp = effPrice(t);
      while (q > 0 && (lots[t.sym] || []).length) {
        const l = lots[t.sym][0]; const take = Math.min(q, l.qty);
        const days = Math.round((new Date(t.date) - new Date(l.date)) / 86400000);
        sales.push({ sym: t.sym, buyDate: l.date, sellDate: t.date, qty: take, buyVal: take * l.price, sellVal: take * sp, days: days, term: days > 365 ? "Long" : "Short", gain: take * (sp - l.price) });
        l.qty -= take; q -= take; if (l.qty <= 0) lots[t.sym].shift();
      }
      if (q > 0) sales.push({ sym: t.sym, buyDate: "", sellDate: t.date, qty: q, buyVal: null, sellVal: q * sp, days: "—", term: "No buy record", gain: null });
    }
  });
  return sales;
}
function fyOf(ds) { const d = new Date(ds); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return "FY " + y + "-" + String((y + 1) % 100).padStart(2, "0"); }
function folioGainsPanel() {
  const taxBox = $("taxBox"); if (!taxBox || !currentUser) return;
  const taxPanel = taxBox.closest(".panel"); if (!taxPanel) return;
  let panel = $("gainsPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "panel"; panel.id = "gainsPanel";
    panel.innerHTML = '<div class="panel-head"><h2>Capital Gains Statement</h2><select id="gainsFy" aria-label="Financial year"></select></div>' +
      '<div class="insx-setrow gains-cfg"><label>Short-term rate % <input id="taxStcg" type="number" step="0.5" min="0"></label><label>Long-term rate % <input id="taxLtcg" type="number" step="0.5" min="0"></label><label>Long-term exemption ₹ <input id="taxExempt" type="number" step="1000" min="0"></label></div>' +
      '<div class="gains-body"></div><div class="panel-foot"><button type="button" class="mini-btn" data-gains-csv="1">Download CSV</button></div>';
    taxPanel.after(panel);
    panel.querySelector("[data-gains-csv]").addEventListener("click", folioGainsCsv);
    ["taxStcg", "taxLtcg", "taxExempt"].forEach(id => panel.querySelector("#" + id).addEventListener("change", () => {
      const p = folioProf(); p.taxCfg = { stcg: Number(panel.querySelector("#taxStcg").value) || 0, ltcg: Number(panel.querySelector("#taxLtcg").value) || 0, exempt: Number(panel.querySelector("#taxExempt").value) || 0 };
      persist(); folioGainsRender();
    }));
    panel.querySelector("#gainsFy").addEventListener("change", () => { gainsFy = panel.querySelector("#gainsFy").value; folioGainsRender(); });
  }
  const sales = folioFifo();
  const fys = [...new Set(sales.map(s => fyOf(s.sellDate)))].sort().reverse();
  const sel = panel.querySelector("#gainsFy");
  if (!gainsFy || !fys.includes(gainsFy)) gainsFy = fys[0] || "";
  sel.innerHTML = fys.length ? fys.map(f => '<option' + (f === gainsFy ? " selected" : "") + ">" + f + "</option>").join("") : "<option>No sales yet</option>";
  const cfg = folioProf().taxCfg || { stcg: 20, ltcg: 12.5, exempt: 125000 };
  panel.querySelector("#taxStcg").value = cfg.stcg; panel.querySelector("#taxLtcg").value = cfg.ltcg; panel.querySelector("#taxExempt").value = cfg.exempt;
  folioGainsRender();
}
function folioGainsRows() { return folioFifo().filter(s => fyOf(s.sellDate) === gainsFy); }
function folioGainsRender() {
  const panel = $("gainsPanel"); if (!panel) return;
  const body = panel.querySelector(".gains-body");
  const rows = folioGainsRows();
  if (!rows.length) { body.innerHTML = '<p class="empty-note">No sales in ' + esc(gainsFy || "any year") + " yet — when you sell shares, the FIFO statement will appear here.</p>"; return; }
  const cfg = folioProf().taxCfg || { stcg: 20, ltcg: 12.5, exempt: 125000 };
  const st = rows.filter(r => r.term === "Short").reduce((a, r) => a + r.gain, 0);
  const lt = rows.filter(r => r.term === "Long").reduce((a, r) => a + r.gain, 0);
  const estTax = Math.max(0, st) * (cfg.stcg || 0) / 100 + Math.max(0, lt - (cfg.exempt || 0)) * (cfg.ltcg || 0) / 100;
  body.innerHTML = '<div class="table-scroll"><table class="folio-table"><thead><tr><th>Stock</th><th>Buy date</th><th>Sell date</th><th>Qty</th><th>Buy value</th><th>Sell value</th><th>Days</th><th>Term</th><th>Gain</th></tr></thead><tbody>' +
    rows.map(r => "<tr><td><b>" + esc(r.sym) + "</b></td><td>" + fmtDate(r.buyDate) + "</td><td>" + fmtDate(r.sellDate) + "</td><td>" + r.qty + "</td><td>" + inr2(r.buyVal) + "</td><td>" + inr2(r.sellVal) + "</td><td>" + r.days + "</td><td>" + r.term + '</td><td class="' + (r.gain >= 0 ? "pos" : "neg") + '">' + inr2(r.gain) + "</td></tr>").join("") +
    '</tbody></table></div><p class="price-meta">Short-term gains ' + inr2(st) + " · Long-term gains " + inr2(lt) + " · Estimated tax at your rates: " + inr2(estTax) + ". Estimate only — verify current rules before filing; tax rules change in Budgets and this is information, not tax advice.</p>" + (rows.some(r => r.gain === null) ? '<p class="price-meta">Rows marked "No buy record" are sales whose buy entry is not in Folio (for example, shares that arrived as imported holdings). They are listed so nothing is hidden, but they are not counted in the totals because their buy price is unknown.</p>' : "");
}
function folioGainsCsv() {
  const rows = folioGainsRows();
  if (!rows.length) { toast("No sales in this year to export"); return; }
  const lines = ["Stock,Buy Date,Sell Date,Qty,Buy Value,Sell Value,Holding Days,Term,Gain"];
  rows.forEach(r => lines.push([r.sym, r.buyDate, r.sellDate, r.qty, r.buyVal == null ? "" : r.buyVal.toFixed(2), r.sellVal.toFixed(2), r.days, r.term, r.gain == null ? "" : r.gain.toFixed(2)].join(",")));
  folioDownload("folio-capital-gains-" + (gainsFy || "all").replace(/\s+/g, "") + ".csv", lines.join("\n"), "text/csv");
  toast("Capital gains CSV downloaded");
}
/* ---------- Compare stocks ---------- */
let cmpRange = 182;
function folioComparePanel() {
  const view = $("view-insights"); if (!view || !currentUser) return;
  let panel = $("cmpPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "panel"; panel.id = "cmpPanel";
    panel.innerHTML = '<div class="panel-head"><h2>Compare Stocks</h2><span class="seg seg-small"><button type="button" class="seg-btn" data-cmp-range="30">1M</button><button type="button" class="seg-btn active" data-cmp-range="182">6M</button><button type="button" class="seg-btn" data-cmp-range="365">1Y</button></span></div><div class="stat-chips cmp-chips"></div><div class="cmp-body"><p class="empty-note">Pick 2–4 stocks above to compare their returns.</p></div>';
    view.insertBefore(panel, view.firstElementChild);
    panel.querySelectorAll("[data-cmp-range]").forEach(b => b.addEventListener("click", () => { cmpRange = Number(b.dataset.cmpRange); panel.querySelectorAll("[data-cmp-range]").forEach(x => x.classList.toggle("active", x === b)); folioCompareRender(); }));
  }
  const chips = panel.querySelector(".cmp-chips");
  const sel = folioProf().cmpSel || [];
  chips.innerHTML = [...mySyms()].map(s => '<button type="button" class="chip cmp-chip' + (sel.includes(s) ? " on" : "") + '" data-cmp="' + esc(s) + '">' + esc(s) + "</button>").join("");
  chips.querySelectorAll("[data-cmp]").forEach(b => b.addEventListener("click", () => {
    const p = folioProf(); p.cmpSel = p.cmpSel || [];
    const s = b.dataset.cmp;
    if (p.cmpSel.includes(s)) p.cmpSel = p.cmpSel.filter(x => x !== s);
    else { if (p.cmpSel.length >= 4) { toast("Compare holds at most 4 stocks"); return; } p.cmpSel.push(s); }
    persist(); folioComparePanel(); folioCompareRender();
  }));
  folioCompareRender();
}
async function folioCompareRender() {
  const panel = $("cmpPanel"); if (!panel) return;
  const body = panel.querySelector(".cmp-body");
  const sel = (folioProf().cmpSel || []).filter(s => mySyms().has(s));
  if (sel.length < 2) { body.innerHTML = '<p class="empty-note">Pick 2–4 stocks above to compare their returns.</p>'; return; }
  const colors = ["#2962ff", "#ff6d00", "#089981", "#f23645"];
  const series = [];
  for (const sym of sel) {
    const h = await fetchHistory(sym, "1y");
    if (h && h.points && h.points.length > 20) series.push({ sym: sym, pts: h.points });
  }
  if (series.length < 2) { body.innerHTML = '<p class="empty-note">Price history could not load for these stocks right now.</p>'; return; }
  const cutoff = Date.now() - cmpRange * 86400000;
  const norm = series.map(s => { const seg = s.pts.filter(p => p.t >= cutoff); const base = seg.length ? seg[0].c : s.pts[0].c; return { sym: s.sym, vals: seg.map(p => ({ t: p.t, v: base ? (p.c / base - 1) * 100 : 0 })) }; });
  const all = norm.flatMap(s => s.vals.map(x => x.v));
  const mn = Math.min(...all, 0), mx = Math.max(...all, 0), W = 680, H = 200, P = 8;
  const t0 = Math.min(...norm.map(s => s.vals.length ? s.vals[0].t : Date.now())), t1 = Date.now();
  const X = t => P + (t - t0) / Math.max(1, t1 - t0) * (W - 2 * P), Y = v => H - P - (v - mn) / Math.max(0.01, mx - mn) * (H - 2 * P);
  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="cmp-svg" role="img" aria-label="Normalized return comparison">';
  svg += '<line x1="' + P + '" y1="' + Y(0) + '" x2="' + (W - P) + '" y2="' + Y(0) + '" stroke="var(--line)" stroke-dasharray="3 3"/>';
  norm.forEach((s, i) => { if (s.vals.length > 1) svg += '<path d="' + s.vals.map((p, j) => (j ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ") + '" fill="none" stroke="' + colors[i % 4] + '" stroke-width="1.8"/>'; });
  svg += "</svg>";
  const rows = await Promise.all(series.map(async (s, i) => {
    const pts = s.pts, last = pts[pts.length - 1].c;
    const ret = days => { const target = pts[pts.length - 1].t - days * 86400000; let prev = pts[0]; for (const p of pts) { if (p.t <= target) prev = p; else break; } return prev.c ? (last / prev.c - 1) * 100 : null; };
    const rets = []; for (let j = 1; j < pts.length; j++) rets.push(pts[j].c / pts[j - 1].c - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
    const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, rets.length)) * Math.sqrt(252) * 100;
    let pos = null;
    const mc = (typeof masterCache !== "undefined" && masterCache[s.sym]) || null;
    if (mc && mc.meta && mc.meta.fiftyTwoWeekHigh > mc.meta.fiftyTwoWeekLow) pos = Math.max(0, Math.min(100, (last - mc.meta.fiftyTwoWeekLow) / (mc.meta.fiftyTwoWeekHigh - mc.meta.fiftyTwoWeekLow) * 100));
    const f = v => v === null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
    return "<tr><td><b style=\"color:" + colors[i % 4] + "\">" + esc(s.sym) + "</b></td><td>" + f(ret(30)) + "</td><td>" + f(ret(182)) + "</td><td>" + f(ret(365)) + "</td><td>" + (isFinite(vol) ? vol.toFixed(1) + "%" : "—") + "</td><td>" + (pos === null ? "—" : pos.toFixed(0) + "% of range") + "</td></tr>";
  }));
  body.innerHTML = svg + '<div class="table-scroll"><table class="folio-table"><thead><tr><th>Stock</th><th>1M</th><th>6M</th><th>1Y</th><th>Volatility (1Y)</th><th>52W position</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div><p class="price-meta">Returns are price-only, normalised to 0% at the start of the chosen period. P/E is not shown — the free feed does not provide it reliably.</p>';
}
/* ---------- Watchlist upgrade ---------- */
function folioDayPct(sym) { const p = priceOf(sym); if (!p || !p.price || !p.prevClose) return null; return (p.price - p.prevClose) / p.prevClose * 100; }
const _wl52Kicked = {};
function folio52Bar(sym, row) {
  const mc = (typeof masterCache !== "undefined" && masterCache[sym]) || null;
  const meta = mc && mc.meta;
  const p = priceOf(sym);
  if (!meta || !meta.fiftyTwoWeekHigh || !meta.fiftyTwoWeekLow || meta.fiftyTwoWeekHigh <= meta.fiftyTwoWeekLow || !p || !p.price) {
    if (!_wl52Kicked[sym]) { _wl52Kicked[sym] = 1; fetchMaster(sym).then(() => { try { folioWatchDecorate(); } catch (e) {} }).catch(() => {}); }
    return;
  }
  const pos = Math.max(0, Math.min(100, (p.price - meta.fiftyTwoWeekLow) / (meta.fiftyTwoWeekHigh - meta.fiftyTwoWeekLow) * 100));
  const d = document.createElement("div");
  d.className = "w52"; d.title = "52-week range: " + inr2(meta.fiftyTwoWeekLow) + " – " + inr2(meta.fiftyTwoWeekHigh);
  d.innerHTML = '<span class="w52-track"><i style="left:' + pos.toFixed(0) + '%"></i></span>';
  row.insertBefore(d, row.querySelector(".watch-x"));
}
function folioWatchControls(el) {
  if ($("wlControls") || !el.parentElement) return;
  const div = document.createElement("div");
  div.id = "wlControls"; div.className = "wl-controls";
  div.innerHTML = '<span class="wl-lab">Sort:</span><span class="seg seg-small">' + [["fav", "Favourites"], ["day", "Day %"], ["name", "Name"]].map(([id, lab]) => '<button type="button" class="seg-btn' + ((folioProf().wlSort || "fav") === id ? " active" : "") + '" data-wlsort="' + id + '">' + lab + "</button>").join("") + "</span>";
  el.parentElement.insertBefore(div, el);
  div.querySelectorAll("[data-wlsort]").forEach(b => b.addEventListener("click", () => { const p = folioProf(); p.wlSort = b.dataset.wlsort; persist(); div.querySelectorAll("[data-wlsort]").forEach(x => x.classList.toggle("active", x === b)); folioWatchDecorate(); }));
}
function folioWatchDecorate() {
  const el = $("watchListEl"); if (!el || !currentUser) return;
  folioWatchControls(el);
  const bannerHost = el.parentElement;
  const rows = [...el.querySelectorAll(".watchlist-row")];
  const sort = folioProf().wlSort || "fav";
  if (sort === "day") rows.sort((a, b) => (folioDayPct(b.dataset.wrow) ?? -999) - (folioDayPct(a.dataset.wrow) ?? -999)).forEach(r => el.appendChild(r));
  if (sort === "name") rows.sort((a, b) => a.dataset.wrow.localeCompare(b.dataset.wrow)).forEach(r => el.appendChild(r));
  rows.forEach(row => {
    const sym = row.dataset.wrow;
    if (!row.querySelector(".w52")) folio52Bar(sym, row);
    if (!row.querySelector("[data-wadd]")) {
      const bell = document.createElement("button");
      bell.className = "watch-x w-bell"; bell.dataset.wbell = sym; bell.type = "button"; bell.setAttribute("aria-label", "Price alert for " + sym);
      bell.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>';
      row.insertBefore(bell, row.querySelector(".watch-x"));
      const add = document.createElement("button");
      add.className = "watch-x w-add"; add.dataset.wadd = sym; add.type = "button"; add.setAttribute("aria-label", "Add " + sym + " to portfolio"); add.textContent = "+ Add";
      row.insertBefore(add, row.querySelector(".watch-x"));
    }
  });
  folioWatchAlertCheck(bannerHost);
}
document.addEventListener("click", e => {
  const add = e.target.closest("[data-wadd]");
  if (add) { e.stopPropagation(); const w = (state.watch || []).find(x => x.sym === add.dataset.wadd); openTxn("BUY", add.dataset.wadd, w ? w.name : add.dataset.wadd); return; }
  const bell = e.target.closest("[data-wbell]");
  if (bell) { e.stopPropagation(); folioWatchAlertEdit(bell.dataset.wbell, bell.closest(".watchlist-row")); }
});
function folioWatchAlertEdit(sym, row) {
  if (!row) return;
  const old = row.nextElementSibling;
  if (old && old.classList.contains("wl-alert-edit")) { old.remove(); return; }
  document.querySelectorAll(".wl-alert-edit").forEach(x => x.remove());
  const cur = (folioProf().wlAlerts || {})[sym] || {};
  const div = document.createElement("div");
  div.className = "wl-alert-edit";
  div.innerHTML = '<label>Alert above ₹ <input type="number" step="any" min="0" class="wa-above" value="' + (cur.above || "") + '"></label><label>Alert below ₹ <input type="number" step="any" min="0" class="wa-below" value="' + (cur.below || "") + '"></label><button type="button" class="mini-btn wa-save">Save</button><button type="button" class="mini-btn wa-clear">Clear</button><span class="price-meta">Fires once a day per level, while you use Folio.</span>';
  row.after(div);
  div.querySelector(".wa-save").addEventListener("click", () => {
    const p = folioProf(); p.wlAlerts = p.wlAlerts || {};
    const a = Number(div.querySelector(".wa-above").value) || null, b = Number(div.querySelector(".wa-below").value) || null;
    if (a || b) p.wlAlerts[sym] = { above: a, below: b }; else delete p.wlAlerts[sym];
    persist(); div.remove(); toast("Price alert saved for " + sym);
  });
  div.querySelector(".wa-clear").addEventListener("click", () => { const p = folioProf(); if (p.wlAlerts) delete p.wlAlerts[sym]; persist(); div.remove(); toast("Price alert removed for " + sym); });
}
function folioWatchAlertCheck(host) {
  const alerts = folioProf().wlAlerts || {};
  const syms = Object.keys(alerts);
  if (!syms.length || !host) return;
  let fired = {}; try { fired = JSON.parse(localStorage.getItem("folio_wl_fired") || "{}"); } catch (e) {}
  const today = new Date().toISOString().slice(0, 10);
  const hits = [];
  syms.forEach(sym => {
    const p = priceOf(sym); if (!p || !p.price) return;
    if (!p.ts || Date.now() - p.ts > 20 * 60 * 1000) return; /* stale cached price: never alert on it */
    const a = alerts[sym];
    [["above", a.above, p.price >= (a.above || Infinity)], ["below", a.below, p.price <= (a.below || -Infinity)]].forEach(([kind, lvl, hit]) => {
      if (!lvl || !hit) return;
      const key = sym + "|" + kind + "|" + lvl + "|" + today;
      if (fired[key]) return;
      fired[key] = 1; hits.push(sym + " is " + kind + " " + inr2(lvl) + " (now " + inr2(p.price) + ")");
    });
  });
  if (!hits.length) return;
  try { localStorage.setItem("folio_wl_fired", JSON.stringify(fired)); } catch (e) {}
  hits.forEach(h => toast("Price alert: " + h));
  let banner = host.querySelector(".wl-banner");
  if (!banner) { banner = document.createElement("div"); banner.className = "wl-banner"; host.insertBefore(banner, host.firstChild); }
  banner.innerHTML = hits.map(h => "<span>🔔 " + esc(h) + "</span>").join("");
  try { if (window.Notification && Notification.permission === "granted") hits.forEach(h => new Notification("Folio price alert", { body: h })); } catch (e) {}
}
if (typeof renderWatch === "function") { const _rwC2 = renderWatch; renderWatch = function () { const r = _rwC2.apply(this, arguments); try { folioWatchDecorate(); } catch (e) {} return r; }; }
/* ---------- FII/DII in Market Mood ---------- */
async function folioFiiLine() {
  const box = $("moodBox"); if (!box || box.querySelector("#fiiLine")) return;
  const j = await folioDataJson("fii.json");
  if (!j || !Array.isArray(j.data) || !j.data.length) return;
  const last = j.data[j.data.length - 1];
  if (!box.querySelector("#fiiLine")) {
    const p = document.createElement("p");
    p.className = "price-meta"; p.id = "fiiLine";
    p.textContent = "FII net " + (last.fiiNet != null ? (last.fiiNet >= 0 ? "+" : "−") + "₹" + Math.abs(last.fiiNet).toLocaleString("en-IN") + " Cr" : "—") + " · DII net " + (last.diiNet != null ? (last.diiNet >= 0 ? "+" : "−") + "₹" + Math.abs(last.diiNet).toLocaleString("en-IN") + " Cr" : "—") + " · " + fmtDate(last.date) + " (NSE)";
    box.appendChild(p);
  }
}
if (typeof renderMood === "function") { const _rmC2 = renderMood; renderMood = async function () { const r = await _rmC2.apply(this, arguments); try { await folioFiiLine(); } catch (e) {} return r; }; }
/* ---------- setups ---------- */
function folioSetupsC() {
  folioLoadDeals();
  folioChanged();
  folioNewsSetup();
  folioEventsPanel();
  folioGainsPanel();
  folioComparePanel();
}
if (typeof dashDecoratePanels === "function") { const _dcpC2 = dashDecoratePanels; dashDecoratePanels = function () { const r = _dcpC2.apply(this, arguments); try { folioSetupsC(); } catch (e) {} return r; }; }

/* ================= v89: central modal manager, Android back, More actions ================= */
const FOLIO_VER = "Folio v103";
(function () {
  const stack = [];
  const STATIC = { e2eeUnlock: 1, e2eeSetup: 1, quickLock: 1 }; /* security lock screens: Esc/outside/back must never dismiss them */
  const isOpen = m => m && !m.classList.contains("hidden");
  function prune() { for (let i = stack.length - 1; i >= 0; i--) if (!isOpen(stack[i])) stack.splice(i, 1); }
  function top() { prune(); return stack.length ? stack[stack.length - 1] : null; }
  function syncLock() { document.body.style.overflow = stack.some(isOpen) ? "hidden" : ""; }
  function noteOpen(m) {
    if (!stack.includes(m)) {
      stack.push(m);
      if (!STATIC[m.id] && m.id !== "stockModal") { try { history.pushState({ folioModal: m.id || "m" }, ""); } catch (e) {} }
    }
    syncLock();
  }
  function noteClosed(m) { const i = stack.indexOf(m); if (i >= 0) stack.splice(i, 1); syncLock(); }
  function observe(m) {
    if (!m || m.__folioObs) return; m.__folioObs = 1;
    new MutationObserver(() => { if (isOpen(m)) noteOpen(m); else noteClosed(m); }).observe(m, { attributes: true, attributeFilter: ["class"] });
    if (isOpen(m)) noteOpen(m);
  }
  document.querySelectorAll(".modal").forEach(observe);
  new MutationObserver(ms => ms.forEach(rec => rec.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.classList && n.classList.contains("modal")) observe(n);
    if (n.querySelectorAll) n.querySelectorAll(".modal").forEach(observe);
  }))).observe(document.body, { childList: true });

  function closeModal(m) {
    if (!m || STATIC[m.id]) return;
    if (m.id === "stockModal" && typeof window.closeCompanyModal === "function") { window.closeCompanyModal(); return; }
    const c = m.querySelector("[data-more-close], [data-close-terms], [data-close-modal], .modal-close-btn");
    if (c) { c.click(); setTimeout(() => { if (isOpen(m)) m.classList.add("hidden"); }, 60); return; }
    m.classList.add("hidden");
  }
  window.folioCloseTopModal = function () { const m = top(); if (m) closeModal(m); return !!m; };

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { const m = top(); if (m && !STATIC[m.id]) { e.preventDefault(); closeModal(m); } return; }
    if (e.key === "Tab") {
      const m = top(); if (!m || STATIC[m.id]) return;
      const f = [...m.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener("mousedown", e => {
    const m = e.target;
    if (m && m.classList && m.classList.contains("modal") && isOpen(m) && !STATIC[m.id] && top() === m) closeModal(m);
  });

  let viewArmed = false;
  const _sv89 = switchView;
  switchView = function (name) {
    const r = _sv89.apply(this, arguments);
    if (name && name !== "dashboard" && !viewArmed && !top()) { try { history.pushState({ folioView: name }, ""); viewArmed = true; } catch (e) {} }
    return r;
  };
  window.addEventListener("popstate", () => {
    const before = stack.length;
    prune();
    if (stack.length < before) { syncLock(); return; }
    const m = top();
    if (m) { closeModal(m); return; }
    viewArmed = false;
    const cur = document.querySelector(".view:not(.hidden)");
    if (cur && cur.id !== "view-dashboard") {
      switchView("dashboard");
      try { history.pushState({ folioView: "dashboard" }, ""); viewArmed = true; } catch (e) {}
    }
  });

  let swipe = null;
  document.addEventListener("touchstart", e => {
    const card = e.target.closest(".modal-card, .sheet-card");
    if (!card) return;
    const m = card.closest(".modal");
    if (!m || !isOpen(m) || STATIC[m.id]) return;
    if (card.scrollTop > 0) return;
    swipe = { m: m, card: card, y: e.touches[0].clientY, dy: 0 };
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!swipe) return;
    swipe.dy = e.touches[0].clientY - swipe.y;
    if (swipe.dy > 0) swipe.card.style.transform = "translateY(" + swipe.dy + "px)";
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!swipe) return;
    const sw = swipe; swipe = null;
    sw.card.style.transform = "";
    if (sw.dy > 90) closeModal(sw.m);
  });

  document.addEventListener("click", e => {
    const row = e.target.closest("[data-more-act]");
    if (row) {
      const act = row.dataset.moreAct;
      if (act !== "report" && act !== "legal") {
        const sheet = $("moreSheet"); if (sheet) sheet.classList.add("hidden");
        if (act === "search" && typeof platPalette === "function") platPalette();
        else if (act === "settings") { switchView("profile"); setTimeout(() => { const el = document.querySelector("#view-profile .panel"); if (el) el.scrollIntoView({ block: "start" }); }, 80); }
        else if (act === "export") { const b = $("exportBtn"); if (b) b.click(); }
        else if (act === "import") { const f = $("importFile"); if (f) f.click(); }
        else if (act === "backup") { switchView("profile"); setTimeout(() => { const b = $("vaultExportBtn"); if (b) b.scrollIntoView({ block: "center" }); }, 80); }
        else if (act === "help") { const h = $("helpModal"); if (h) h.classList.remove("hidden"); }
        else if (act === "about") { const v = $("aboutVer"); if (v) v.textContent = "Version " + FOLIO_VER.replace("Folio ", ""); const a = $("aboutModal"); if (a) a.classList.remove("hidden"); }
        else if (act === "logout" && typeof doLogout === "function") doLogout();
      }
    }
    if (e.target.closest("[data-insx-retry]")) { try { insXSeries = null; insXSig = ""; insxLoadSeries(); } catch (err) {} }
    if (e.target.closest("[data-ta-retry]")) { try { taState.tries = 0; taState.trySym = ""; renderTA(); } catch (err) {} }
  });
})();

/* ================= v90: social rows + version stamps ================= */
(function () {
  function socialHTML() {
    return SOCIAL_ORDER.map(k => {
      const url = (SOCIAL_LINKS[k] || "").trim();
      if (!url || url.indexOf("http") !== 0 || !SOCIAL_ICONS[k]) return "";
      return '<a class="soc-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Singh Caizen on ' + SOCIAL_NAMES[k] + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="' + SOCIAL_ICONS[k] + '"/></svg></a>';
    }).join("");
  }
  const html = socialHTML();
  const fillStatic = () => {
    document.querySelectorAll("[data-social-row]").forEach(el => { el.innerHTML = html; if (!html) el.style.display = "none"; });
    document.querySelectorAll("[data-folio-ver]").forEach(el => { el.textContent = FOLIO_VER; });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillStatic); else fillStatic();
  document.addEventListener("click", e => { if (e.target.closest(".more-visit")) { const sh = $("moreSheet"); if (sh) sh.classList.add("hidden"); } });
})();

/* ================= v91: debounce helper, first-paint flag, render-on-switch, spark retry ================= */
function folioDeb(fn, ms) { let t = null; return function () { const a = arguments, self = this; clearTimeout(t); t = setTimeout(() => fn.apply(self, a), ms); }; }
(function () {
  const _ra91 = renderAll;
  let painted = false;
  renderAll = function () { const r = _ra91.apply(this, arguments); if (!painted) { painted = true; setTimeout(() => { try { document.body.classList.add("folio-ready"); } catch (e) {} }, 900); } return r; };
  const _sv91 = switchView;
  switchView = function (name) {
    const r = _sv91.apply(this, arguments);
    try {
      if (name === "dashboard") renderDashboard();
      else if (name === "holdings") renderHoldings();
      else if (name === "watchlist") renderWatch();
      else if (name === "history") renderHistory();
    } catch (e) {}
    return r;
  };
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-spark-retry]");
    if (!b) return;
    const sym = b.dataset.sparkRetry;
    b.textContent = "Loading…";
    fetchOne(sym).then(r => { if (r) { prices[sym] = r; } try { renderWatch(); } catch (err) {} }).catch(() => { try { renderWatch(); } catch (err) {} });
  });
})();

/* ================= v92: More button direct open + labeled social buttons ================= */
(function () {
  function openSheet(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const sh = $("moreSheet");
    if (!sh) return;
    sh.classList.remove("hidden");
    if (getComputedStyle(sh).display === "none") sh.style.display = "flex";
  }
  const b = $("dockMoreBtn");
  if (b) b.addEventListener("click", openSheet);
  function fillSheetSocials() {
    const el = document.querySelector("#moreSheet [data-social-row]");
    if (!el || el.children.length) return;
    el.innerHTML = SOCIAL_ORDER.map(k => {
      const url = (SOCIAL_LINKS[k] || "").trim();
      if (!url || url.indexOf("http") !== 0 || !SOCIAL_ICONS[k]) return "";
      return '<a class="soc-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Singh Caizen on ' + SOCIAL_NAMES[k] + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="' + SOCIAL_ICONS[k] + '"/></svg></a>';
    }).join("");
  }
  document.addEventListener("click", e => { if (e.target.closest("#dockMoreBtn")) fillSheetSocials(); });
})();

/* ================= v94: PWA update toast + Install App row ================= */
/* v99 fix: this must run AFTER the DOM exists \u2014 the app scripts sit before the
   More-sheet markup in index.html, so an immediate run found no #moreInstallRow
   and returned early, leaving the Install row unwired since v94. */
function folioV94Install() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    let shown = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (shown) return; shown = true;
      try {
        const d = document.createElement("button");
        d.type = "button"; d.textContent = "Update available, tap to reload";
        d.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2900;background:#1c1c22;color:#f2f2f2;border:1px solid #c9a227;border-radius:999px;padding:10px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45)";
        d.addEventListener("click", () => location.reload());
        document.body.appendChild(d);
        setTimeout(() => { try { d.remove(); } catch (e) {} }, 15000);
      } catch (e) {}
    });
  }
  const row = $("moreInstallRow");
  if (!row) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  function syncInstallRow() { row.hidden = isStandalone; }
  window.addEventListener("beforeinstallprompt", () => setTimeout(syncInstallRow, 0));
  window.addEventListener("appinstalled", () => { row.hidden = true; });
  syncInstallRow();
  window.folioInstallHelp = function () {
    let m = $("installHelpModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "installHelpModal"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Install Folio");
      const isAnd = /android/i.test(navigator.userAgent || "");
      const txt = isIOS
        ? 'Tap <b>Share</b>, then <b>Add to Home Screen</b> to install Folio on this iPhone.'
        : isAnd
        ? 'Open the browser menu (<b>⋮</b>) at the top and tap <b>Install app</b> or <b>Add to Home screen</b>, then confirm <b>Install</b>.'
        : 'Look at the right end of the address bar for the <b>install icon</b> and click it \u2014 or open the browser menu and choose <b>Install Folio</b> (in Edge: <b>Settings \u2192 Apps \u2192 Install this site as an app</b>).';
      m.innerHTML = '<div class="modal-card"><div class="modal-head"><h3>Install Folio</h3><button type="button" class="icon-btn" data-help-close="1" aria-label="Close">✕</button></div><p class="auth-note">' + txt + '</p><button type="button" class="btn btn-gold btn-block" data-help-close="1">Got it</button></div>';
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-help-close]")) m.classList.add("hidden"); });
    }
    m.classList.remove("hidden");
  };
  row.addEventListener("click", async () => {
    const sh = $("moreSheet"); if (sh) sh.classList.add("hidden");
    if (deferredInstall) {
      try { deferredInstall.prompt(); await deferredInstall.userChoice; } catch (e) {}
      deferredInstall = null; syncInstallRow(); return;
    }
    if (!isIOS && window.folioInstallHelp) { window.folioInstallHelp(); return; }
    if (isIOS) {
      let m = $("iosInstallModal");
      if (!m) {
        m = document.createElement("div");
        m.id = "iosInstallModal"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Install Folio");
        m.innerHTML = '<div class="modal-card"><div class="modal-head"><h3>Install Folio</h3><button type="button" class="icon-btn" data-ios-close="1" aria-label="Close">✕</button></div><p class="auth-note">Tap <b>Share</b>, then <b>Add to Home Screen</b> to install Folio on this iPhone.</p><button type="button" class="btn btn-gold btn-block" data-ios-close="1">Got it</button></div>';
        document.body.appendChild(m);
        m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-ios-close]")) m.classList.add("hidden"); });
      }
      m.classList.remove("hidden");
    }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", folioV94Install); else folioV94Install();

/* ===== v95 Phase 4: Enter submits popups whose fields are not inside a <form>
   (security wizards, confirm/prompt dialogs). Guarded: plain text inputs only,
   never the stock sheet, exactly one visible primary button in that popup. ===== */
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (!t || t.tagName !== "INPUT" || t.form) return;
  if (["checkbox", "radio", "file", "hidden", "submit", "button"].includes(t.type)) return;
  const m = t.closest(".modal");
  if (!m || m.id === "stockModal" || m.classList.contains("hidden")) return;
  const prim = [...m.querySelectorAll(".btn-gold")].filter(b => !b.disabled && b.offsetParent !== null);
  if (prim.length !== 1) return;
  e.preventDefault();
  prim[0].click();
});


/* ================= SHARE CARDS (v98): lazy-loaded share.js + entry points ================= */
let shareModLoading = null;
window.openShareSheet = function (opts) {
  opts = opts || {};
  if (window.FolioShare && window.FolioShare.open) { window.FolioShare.open(opts); return; }
  if (!shareModLoading) {
    shareModLoading = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "js/share.js?v=2"; sc.async = true;
      sc.onload = () => res(); sc.onerror = () => rej(new Error("share module failed to load"));
      document.head.appendChild(sc);
    });
  }
  shareModLoading.then(() => { if (window.FolioShare && window.FolioShare.open) window.FolioShare.open(opts); })
    .catch(() => { shareModLoading = null; toast("Share could not load — check your connection and try again."); });
};

/* ================= PORTFOLIO REPORT (PDF): lazy-loaded report.js ================= */
let reportModLoading = null;
window.openReportSheet = function () {
  if (window.FolioReport && window.FolioReport.open) { window.FolioReport.open(); return; }
  if (!reportModLoading) {
    reportModLoading = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "js/report.js?v=2"; sc.async = true;
      sc.onload = () => res(); sc.onerror = () => rej(new Error("report module failed to load"));
      document.head.appendChild(sc);
    });
  }
  reportModLoading.then(() => { if (window.FolioReport && window.FolioReport.open) window.FolioReport.open(); })
    .catch(() => { reportModLoading = null; toast("Report could not load — opening the print view instead."); platReport(); });
};
document.addEventListener("click", e => {
  const b = e.target && e.target.closest ? e.target.closest("[data-fshare]") : null;
  if (b) { e.preventDefault(); window.openShareSheet({ type: "stock", symbol: b.getAttribute("data-fshare") }); }
});
const stockShareBtnEl = $("stockShareBtn");
if (stockShareBtnEl) stockShareBtnEl.addEventListener("click", () => window.openShareSheet({ type: "stock", symbol: activeModalSymbol || undefined }));
const stockAlphaChipEl = $("stockAlphaChip");
if (stockAlphaChipEl) stockAlphaChipEl.addEventListener("click", () => window.openShareSheet({ type: "stock", symbol: stockAlphaChipEl.dataset.sym || activeModalSymbol || undefined }));
let stockChipTok = 0;
async function stockShareChipUpdate(sym) {
  const chip = $("stockAlphaChip"); if (!chip) return;
  const tok = ++stockChipTok;
  chip.classList.add("hidden");
  try {
    const base = baseTicker(sym);
    const d = enriched();
    const row = d.rows.find(r => baseTicker(r.sym) === base);
    if (!row || row.ltp === null) return;
    const tf = insTf || "ALL";
    const niftyFor = async daysBack => {
      try {
        const h = await fetchHistory("^NSEI", "1y");
        if (!h || !h.points.length) return null;
        const pts = h.points;
        if (daysBack === 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; return a && b ? (b.c - a.c) / a.c * 100 : null; }
        const since = Date.now() - daysBack * 86400000;
        let sp = null;
        for (const p of pts) { if (p.t <= since) sp = p.c; else break; }
        if (sp === null) sp = pts[0].c;
        return sp ? (pts[pts.length - 1].c - sp) / sp * 100 : null;
      } catch (e) { return null; }
    };
    let sPct = null, nRet = null;
    if (tf === "1D") { sPct = row.prevClose ? (row.ltp - row.prevClose) / row.prevClose * 100 : null; nRet = await niftyFor(1); }
    else if (tf === "ALL") { sPct = row.pnlPct; nRet = await niftyFor(365); }
    else {
      const days = INS_DAYS[tf]; if (!days) return;
      const since = Date.now() - days * 86400000;
      const h = await fetchHistory(row.sym, "1y").catch(() => null);
      if (!h || !h.points.length) return;
      let sp = null;
      for (const p of h.points) { if (p.t <= since) sp = p.c; else break; }
      if (sp === null) sp = h.points[0].c;
      sPct = sp ? (row.ltp - sp) / sp * 100 : null;
      nRet = await niftyFor(days);
    }
    if (tok !== stockChipTok) return;
    if (sPct === null || nRet === null || !isFinite(sPct) || !isFinite(nRet)) return;
    const alpha = sPct - nRet;
    if (alpha <= 0) return;
    const tfName = { "1D": "today", "1W": "1 week", "1M": "1 month", "3M": "3 months", "6M": "6 months", "1Y": "1 year", "ALL": "all time" }[tf] || tf;
    chip.textContent = "\u2605 Outperforming NIFTY 50 by " + pct(alpha) + " (" + tfName + ") \u2014 tap to share its card";
    chip.dataset.sym = row.sym;
    chip.classList.remove("hidden");
  } catch (e) {}
}

/* ================= v101: theme-color sync, strip fades, keyboard dock, hidden diagnostics =================
   Layout-only: no data, calculation, encryption or login code is touched. */
(function () {
  /* --- theme-color follows the app theme (the header's own background) --- */
  const meta = document.querySelector('meta[name="theme-color"]');
  function syncThemeColor() {
    if (!meta) return;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    let col = light ? "#ffffff" : "#070707";
    try {
      const tb = document.querySelector(".topbar");
      if (tb) {
        const bg = getComputedStyle(tb).backgroundColor || "";
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(",").map(x => parseFloat(x));
          if (parts.length >= 3 && isFinite(parts[0])) {
            const a = parts.length >= 4 && isFinite(parts[3]) ? parts[3] : 1;
            if (a >= 0.999) col = "rgb(" + parts[0] + "," + parts[1] + "," + parts[2] + ")";
            else { const base = light ? 255 : 0; const c = i => Math.round(parts[i] * a + base * (1 - a)); col = "rgb(" + c(0) + "," + c(1) + "," + c(2) + ")"; }
          }
        }
      }
    } catch (e) {}
    if (meta.getAttribute("content") !== col) meta.setAttribute("content", col);
  }
  try { new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncThemeColor); else syncThemeColor();
  setTimeout(syncThemeColor, 1200);

  /* --- keyboard: hide the bottom dock while the on-screen keyboard is up
         (toggles the same kb-open class the focus handlers already use) --- */
  if (window.visualViewport) {
    let baseH = window.innerHeight;
    const onVv = () => {
      const h = window.visualViewport.height;
      if (h > baseH) baseH = h;
      document.body.classList.toggle("kb-open", h < baseH - 120);
    };
    window.visualViewport.addEventListener("resize", onVv);
  }

  /* --- menu strips: edge fades only where more items hide + active item into view --- */
  function wireStrip(el) {
    if (!el || el._folioStrip) return; el._folioStrip = 1;
    const upd = () => {
      const max = el.scrollWidth - el.clientWidth;
      const l = el.scrollLeft > 4, r = el.scrollLeft < max - 4;
      const f = max <= 4 ? "" : (l && r ? "lr" : r ? "r" : "l");
      if (el.dataset.fade !== f) el.dataset.fade = f;
    };
    el.addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    try { new ResizeObserver(upd).observe(el); } catch (e) {}
    const act = () => {
      const a = el.querySelector(".active");
      if (a) {
        const er = el.getBoundingClientRect(), ar = a.getBoundingClientRect();
        if (ar.left < er.left + 2 || ar.right > er.right - 2) el.scrollBy({ left: (ar.left + ar.width / 2) - (er.left + er.width / 2), behavior: "smooth" });
      }
      upd();
    };
    try { new MutationObserver(act).observe(el, { attributes: true, attributeFilter: ["class"], subtree: true }); } catch (e) {}
    setTimeout(act, 400); upd();
  }
  let stripTries = 0;
  const stripTimer = setInterval(() => {
    stripTries++;
    wireStrip(document.querySelector(".tabs.top-liquid-nav-strip"));
    wireStrip($("dashChips"));
    if (stripTries > 20) clearInterval(stripTimer);
  }, 800);

  /* --- hidden diagnostics: tap the version line in More > About 5 times --- */
  function diagRows() {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const pcs = getComputedStyle(probe);
    const insetTop = pcs.paddingTop, insetBottom = pcs.paddingBottom;
    probe.remove();
    const tb = document.querySelector(".topbar");
    const dock = document.querySelector(".samsung-bottom-dock-wrap");
    const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    return [
      ["window.innerHeight", window.innerHeight + "px"],
      ["visualViewport.height", window.visualViewport ? Math.round(window.visualViewport.height) + "px" : "n/a"],
      ["screen.height", screen.height + "px"],
      ["env(safe-area-inset-top)", insetTop],
      ["env(safe-area-inset-bottom)", insetBottom],
      ["display-mode", standalone ? "standalone (installed)" : "browser"],
      ["doc scrollWidth / clientWidth", document.documentElement.scrollWidth + " / " + document.documentElement.clientWidth],
      ["window scrollTop", Math.round(window.scrollY || 0) + "px"],
      ["header rect.top", tb ? Math.round(tb.getBoundingClientRect().top) + "px" : "n/a"],
      ["bottom nav rect.bottom", dock ? Math.round(dock.getBoundingClientRect().bottom) + "px (viewport " + window.innerHeight + ")" : "n/a"],
      ["theme-color meta", (document.querySelector('meta[name="theme-color"]') || {}).content || "n/a"],
      ["app version", FOLIO_VER]
    ];
  }
  function openDiag() {
    let m = $("folioDiagModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "folioDiagModal"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Layout diagnostics");
      m.style.zIndex = "1500";
      m.innerHTML = '<div class="modal-card"><div class="modal-head"><h3>Layout diagnostics</h3><button type="button" class="icon-btn" data-diag-close="1" aria-label="Close">\u2715</button></div><div data-diag-rows="1" style="font:13px/1.65 ui-monospace,Menlo,Consolas,monospace;word-break:break-word"></div><button type="button" class="btn btn-gold btn-block" data-diag-refresh="1" style="margin-top:12px">Refresh values</button></div>';
      document.body.appendChild(m);
      m.addEventListener("click", e => {
        if (e.target === m || e.target.closest("[data-diag-close]")) m.classList.add("hidden");
        else if (e.target.closest("[data-diag-refresh]")) fillDiag();
      });
    }
    fillDiag();
    m.classList.remove("hidden");
    function fillDiag() {
      const box = m.querySelector("[data-diag-rows]"); if (!box) return;
      box.innerHTML = diagRows().map(r => "<div><b>" + r[0] + ":</b> " + r[1] + "</div>").join("");
    }
    m._fillDiag = fillDiag;
  }
  function fillDiag() { const m = $("folioDiagModal"); if (m && m._fillDiag) m._fillDiag(); }
  let diagTaps = 0, diagTapT = 0;
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#aboutVer")) return;
    const now = Date.now();
    diagTaps = (now - diagTapT < 2500) ? diagTaps + 1 : 1;
    diagTapT = now;
    if (diagTaps >= 5) { diagTaps = 0; openDiag(); }
  });
})();
