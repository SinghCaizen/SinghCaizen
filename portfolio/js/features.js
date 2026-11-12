"use strict";
/* ================================================================
   Folio — features:
   index ticker · stock charts · portfolio performance graph ·
   heatmap · tax harvesting · report issue · footer links
   ================================================================ */

const PROXIES = [
  u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  u => "https://api.cors.lol/?url=" + encodeURIComponent(u),
  u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
];
async function fetchT(url, ms) {
  const ctl = new AbortController();
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
function histLsGet(ck) {
  try { const o = JSON.parse(localStorage.getItem("folio_hist_" + ck) || "null"); return o && o.data ? o : null; } catch (e) { return null; }
}
function histLsSet(ck, data) {
  try { localStorage.setItem("folio_hist_" + ck, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}
async function fetchHistoryNet(sym, rangeKey, ck) {
  const cfg = RANGE_CFG[rangeKey] || RANGE_CFG["6mo"];
  const buildAttempts = s => {
    const attempts = [];
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      const url = "https://" + host + "/v8/finance/chart/" + encodeURIComponent(s) + "?range=" + cfg.range + "&interval=" + cfg.interval;
      for (const p of PROXIES) {
        attempts.push((async () => {
          const res = await fetchT(p(url), 3500);
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
  try {
    const out = await Promise.any(buildAttempts(s));
    histCache[ck] = out;
    histLsSet(ck, out);
    return out;
  } catch (e) {
    /* NSE silent? Try the BSE (.BO) listing once before giving up. */
    if (sym.indexOf(".") < 0 && sym.charAt(0) !== "^") {
      try {
        const out = await Promise.any(buildAttempts(sym + ".BO"));
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
  const wrap = $("tickerWrap"), track = $("tickerTrack");
  if (!wrap || !track || !currentUser) return;
  if (Date.now() - tickerLoadedAt < 5 * 60 * 1000 && track.innerHTML) return;
  const idx = [["^NSEI", "NIFTY 50"], ["^BSESN", "SENSEX"], ["^NSEBANK", "NIFTY BANK"], ["^INDIAVIX", "INDIA VIX"]];
  const items = [];
  for (const pair of idx) {
    const h = await fetchHistory(pair[0], "1d");
    if (!h || !h.meta || !h.meta.regularMarketPrice) continue;
    const price = h.meta.regularMarketPrice;
    const prev = h.meta.chartPreviousClose || h.meta.previousClose || (h.points.length > 1 ? h.points[h.points.length - 2].c : price);
    const chg = prev ? (price - prev) / prev * 100 : 0;
    items.push('<span class="tick-item">' + pair[1] + ' <b>' + Number(price).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</b> <span class="' + (chg >= 0 ? "tick-up" : "tick-dn") + '">' + (chg >= 0 ? "▲" : "▼") + " " + Math.abs(chg).toFixed(2) + "%</span></span>");
  }
  if (!items.length) return;
  const seq = items.join("");
  track.innerHTML = seq + seq;
  wrap.classList.remove("hidden");
  tickerLoadedAt = Date.now();
}

/* ---------- dashboard extras: perf graph + heatmap + tax ---------- */
let folioView = "dashboard";
function renderExtras(d) {
  renderHeat(d); renderTax(d); renderPerf(d); renderCorp(d); renderDivChart(d);
  /* Heavy analytics render only for the tab actually on screen (zero lag). */
  if (folioView === "insights" || folioView === "news") { renderInsights(d); renderNews(d); renderEvents(d); }
}
const _origSwitchView = switchView;
switchView = function (name) {
  folioView = name;
  _origSwitchView(name);
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

function renderHeat(d) {
  const el = $("heatMap");
  if (!el) return;
  if (!d.rows.length) { el.innerHTML = '<p class="empty-note">Add stocks — the heatmap then shows today\'s move of every holding at one glance.</p>'; return; }
  const rows = [...d.rows].sort((a, b) => b.cur - a.cur);
  el.innerHTML = rows.map(r => {
    const dayPct = (r.ltp !== null && r.prevClose) ? (r.ltp - r.prevClose) / r.prevClose * 100 : null;
    let bg, fg;
    if (dayPct === null) { bg = "var(--panel-2)"; fg = "var(--text)"; }
    else if (dayPct >= 0) {
      const k = Math.min(68, 14 + Math.abs(dayPct) * 18);
      bg = "color-mix(in srgb, var(--text) " + k + "%, var(--panel-2))";
      fg = k > 46 ? "var(--bg)" : "var(--text)";
    } else {
      const k = Math.min(72, 16 + Math.abs(dayPct) * 18);
      bg = "color-mix(in srgb, #e03131 " + k + "%, var(--panel-2))";
      fg = "#ffffff";
    }
    const flex = Math.max(1, (d.value ? r.cur / d.value : 0) * 10).toFixed(2);
    return '<button type="button" class="heat-tile" data-heat="' + esc(r.sym) + '" style="flex:' + flex + ' 1 100px;background:' + bg + ';color:' + fg + '">' +
      '<span class="heat-sym">' + esc(r.sym) + '</span>' +
      '<span class="heat-pct">' + (dayPct === null ? "—" : pct(dayPct) + " today") + '</span>' +
      '<span class="heat-val">' + inr(r.cur) + '</span></button>';
  }).join("");
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

/* ---------- report issue ---------- */
const WEB3_KEY = "94e01d94-8fae-4cdc-b9b9-716cf169d7dc";
function openIssue() {
  $("issueModal").classList.remove("hidden");
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
  $("stockClose").addEventListener("click", () => $("stockModal").classList.add("hidden"));
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
      ret = (cs[cs.length - 1] / cs[0] - 1) * 100;
      const rets = [];
      for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
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
      if (dayPct === null) { bg = "var(--panel-2)"; fg = "var(--text)"; }
      else if (dayPct >= 0) {
        const k = Math.min(68, 14 + Math.abs(dayPct) * 18);
        bg = "color-mix(in srgb, var(--text) " + k + "%, var(--panel-2))";
        fg = k > 46 ? "var(--bg)" : "var(--text)";
      } else {
        const k = Math.min(72, 16 + Math.abs(dayPct) * 18);
        bg = "color-mix(in srgb, #e03131 " + k + "%, var(--panel-2))";
        fg = "#ffffff";
      }
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
    async u => { /* allorigins /get — JSON envelope with the body in .contents */
      const r = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(u), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("bad route");
      const env = await r.json();
      const t = env && env.contents;
      if (!t) throw new Error("empty");
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
function lsCacheGet(key, ttlMs) {
  try {
    const o = JSON.parse(localStorage.getItem(key) || "null");
    if (o && Date.now() - o.ts < ttlMs) return o.data;
  } catch (e) {}
  return null;
}
function lsCacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}
function relTime(tsMs) {
  const s = Math.max(1, Math.round((Date.now() - tsMs) / 1000));
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 30) return Math.round(s / 86400) + "d ago";
  return new Date(tsMs).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDate(ms) {
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function crores(raw) {
  if (typeof raw !== "number") return "—";
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
  const cached = lsCacheGet(ck, 20 * 60 * 1000);
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
  box.innerHTML = staleNote() + merged.map(n => newsRowHtml(n, n.sym)).join("");
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

/* ---------- company sheet (inside the stock chart popup) ---------- */
let sheetToken = 0;
const _origOpenStock = openStock;
openStock = function (sym) {
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
  const wrapped = attempts.map(async fn => {
    const ctl = new AbortController();
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
  return await Promise.any(wrapped);
}

/* ---------- single-fetch master engine (v8 chart powers the whole modal) ---------- */
const masterCache = {};
async function fetchMaster(sym) {
  const mc = masterCache[sym];
  if (mc && Date.now() - mc.ts < 6 * 3600 * 1000) return mc;
  let master = null;
  const saved = lsCacheGet("folio_master_" + sym, 6 * 3600 * 1000);
  if (saved && saved.meta) {
    const h = await fetchHistory(sym, "1y");
    master = { ts: saved.ts || Date.now(), meta: saved.meta, points: h ? h.points : [], divs: saved.divs || [], splits: saved.splits || [] };
  } else {
    const norm = normalizeTicker(sym);
    const suffix = "?range=1y&interval=1d&events=div,split&includePrePost=false";
    const candidates = [
      "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(norm) + suffix,
      "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(norm) + suffix
    ];
    if (norm.endsWith(".NS")) candidates.push("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(baseTicker(sym) + ".BO") + suffix);
    let r0 = null;
    for (const u of candidates) {
      try { r0 = await fetchChartValidated(u, 6500); break; } catch (e) { /* next candidate */ }
    }
    try {
      if (!r0) throw new Error("no validated chart");
      const tsArr = r0.timestamp || [];
      const closes = (r0.indicators.quote[0].close) || [];
      const points = [];
      for (let i = 0; i < tsArr.length; i++) if (typeof closes[i] === "number") points.push({ t: tsArr[i] * 1000, c: closes[i] });
      const ev = r0.events || {};
      const divs = ev.dividends ? Object.values(ev.dividends).map(x => ({ ts: x.date * 1000, amount: x.amount })).sort((a, b) => b.ts - a.ts) : [];
      const splits = ev.splits ? Object.values(ev.splits).map(x => ({ ts: x.date * 1000, text: x.splitRatio || (x.numerator + ":" + x.denominator) })).sort((a, b) => b.ts - a.ts) : [];
      if (points.length) {
        master = { ts: Date.now(), meta: r0.meta || {}, points: points, divs: divs, splits: splits };
        histCache[sym + "|1y"] = { points: points, meta: r0.meta || {} };
        histLsSet(sym + "|1y", histCache[sym + "|1y"]);
        lsCacheSet("folio_master_" + sym, { ts: master.ts, meta: master.meta, divs: divs, splits: splits });
      }
    } catch (e) {}
  }
  if (!master) {
    const h = await fetchHistory(sym, "1y");
    if (!h) return null;
    const ca = await fetchCorpActions(sym);
    master = { ts: Date.now(), meta: h.meta || {}, points: h.points, divs: ca.divs, splits: ca.splits };
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
  for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
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
  const avg = Number(drawer.dataset.avg) || 0;
  const ltp = drawer.dataset.ltp === "" ? null : Number(drawer.dataset.ltp);
  let html = "";
  if (ltp !== null && avg > 0) {
    const vs = (ltp - avg) / avg * 100;
    html += `<div class="dr-vs ${vs >= 0 ? "gain-bg" : "loss-bg"}">Trading <b>${pct(Math.abs(vs))} ${vs >= 0 ? "above" : "below"}</b> your Avg Buy Price (${inr2(avg)})</div>`;
  }
  try {
    const m = await fetchMaster(sym);
    if (!m || !m.meta) throw new Error("no master");
    const meta = m.meta;
    const hi = meta.fiftyTwoWeekHigh, lo = meta.fiftyTwoWeekLow;
    if (typeof hi === "number" && typeof lo === "number" && hi > lo && ltp !== null) {
      const pos = Math.min(100, Math.max(0, (ltp - lo) / (hi - lo) * 100));
      html += `<div class="rng-wrap"><div class="rng-lab"><span>52W Low ${inr2(lo)}</span><span>52W High ${inr2(hi)}</span></div><div class="rng-track"><div class="rng-fill" style="width:${pos}%"></div><div class="rng-dot" style="left:${pos}%"></div></div></div>`;
    }
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
  lk.innerHTML =
    '<a class="mini-btn link-btn" href="https://www.screener.in/company/' + encodeURIComponent(sym) + '/" target="_blank" rel="noopener">Full financials on Screener ↗</a>' +
    '<a class="mini-btn link-btn" href="https://www.nseindia.com/get-quotes/equity?symbol=' + encodeURIComponent(sym) + '" target="_blank" rel="noopener">View on NSE ↗</a>';
  ab.innerHTML = '<div class="skel" style="height:14px;width:92%"></div><div class="skel" style="height:14px;width:78%;margin-top:8px"></div>';
  rs.innerHTML = '<div class="skel" style="height:14px;width:60%"></div>';
  nw.innerHTML = '<div class="skel" style="height:14px;width:88%"></div><div class="skel" style="height:14px;width:70%;margin-top:8px"></div>';
  const cp = $("stockCorp"); if (cp) cp.innerHTML = '<div class="skel" style="height:14px;width:55%"></div>';
  /* Watchdog: whatever happens below (slow network, a rejected promise, an
     unexpected error), no section may sit on a skeleton beyond ~9 seconds. */
  const sheetFallback = () => {
    const sec = sectorOf(sym);
    ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sec ? ' · ' + esc(sec) : '') + '</p>' +
      '<p class="empty-note">Live company data could not be fetched right now — the free sources are unreachable from this network. Everything about this company is one tap away:</p>' + extButtonsHtml(sym);
    if (cp) cp.innerHTML = '<p class="empty-note">No dividends or splits in the last 12 months — or the data could not be fetched right now.</p>';
    const fb = '<p class="empty-note">News is taking too long on this network right now. Read it directly from the source:</p>' + extButtonsHtml(sym);
    rs.innerHTML = fb;
    nw.innerHTML = fb;
  };
  const watchdog = setTimeout(() => {
    if (tok === sheetToken && ab.querySelector(".skel")) sheetFallback();
  }, 9000);
  /* ONE master fetch (1y chart + events) powers About + Corporate Actions.
     Hard timeout: a section can never sit on a skeleton forever. */
  try {
  const master = await Promise.race([fetchMaster(sym), new Promise(r => setTimeout(() => r(null), 6000))]);
  if (tok !== sheetToken) return;
  if (master && master.points && master.points.length) {
    ab.innerHTML = masterAboutHtml(sym, name, master);
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
    for (let k = 1; k < cs.length; k++) if (cs[k - 1] > 0) rets.push(Math.log(cs[k] / cs[k - 1]));
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
  ["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (!currentUser || !$("appView") || $("appView").classList.contains("hidden")) return;
    const p = state.profile || {};
    const enabled = p.autoLock !== undefined ? !!p.autoLock : !!(p.totp && p.totp.enabled);
    if (!enabled || Date.now() - lastAct < 15 * 60 * 1000) return;
    lastAct = Date.now();
    if (p.totp && p.totp.enabled) {
      try { sessionStorage.removeItem("pf_gate_" + currentUser.email); } catch (e) {}
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
  const W = 680, H = 300, PL = 46, PR = 14, PT = 16, PB = 34;
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
  pts.forEach(p => {
    const r = Math.min(24, 4.5 + p.w * 0.38);
    svg += '<g class="scatter-dot" data-sym="' + esc(p.sym) + '" style="cursor:pointer"><circle cx="' + X(p.vol).toFixed(1) + '" cy="' + Y(p.ret).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (p.ret >= 0 ? "var(--text)" : "#e03131") + '" opacity="0.55" stroke="var(--bg)" stroke-width="1.2"><title>' + esc(p.sym) + ' — Return ' + pct(p.ret) + ' · Volatility ' + p.vol.toFixed(1) + '% a year · Weight ' + p.w.toFixed(1) + '% of portfolio</title></circle>' +
      '<text x="' + X(p.vol).toFixed(1) + '" y="' + (Y(p.ret) - r - 3).toFixed(1) + '" text-anchor="middle" fill="var(--text)" font-size="10.5" font-weight="bold">' + esc(p.sym) + '</text></g>';
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
    info.textContent = caches + " saved caches · " + Math.max(1, Math.round(bytes / 1024)) + " KB on this device · Folio v17";
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
