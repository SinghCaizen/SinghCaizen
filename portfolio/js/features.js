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
  if ((name === "insights" || name === "news") && currentUser) renderAll();
  if (name === "ipo" && currentUser) { try { renderIpo(); } catch (e) {} }
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
async function doTick() {
  if (!currentUser || typeof refreshPrices !== "function") return;
  const stockOpen = (() => { const m = $("stockModal"); return m && !m.classList.contains("hidden"); })();
  if (stockOpen) return; /* modal open: pause all background polling, the opened stock owns the network */
  const modalOpen = ["txnModal", "totpModal", "helpModal"].some(id => { const m = $(id); return m && !m.classList.contains("hidden"); });
  if (modalOpen) { try { await refreshPrices(); } catch (e) {} return; }
  if (Date.now() - lastScrollAt < 500) { setTimeout(() => { try { doTick(); } catch (e) {} }, 650); return; }
  const before = {};
  Object.keys(prices || {}).forEach(k => { if (prices[k]) before[k] = prices[k].price; });
  await refreshPrices();
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
setInterval(() => { updateMktPill(); if (marketOpenIST() && currentUser && !document.hidden) doTick(); }, 25000);
setInterval(updateMktPill, 30000);

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
setInterval(() => {
  document.querySelectorAll("[data-bnav]").forEach(b => b.classList.toggle("active", b.dataset.bnav === folioView));
}, 1000);

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
  if (rb) rb.addEventListener("click", doTick);
  document.querySelectorAll("[data-bnav]").forEach(b => b.addEventListener("click", () => switchView(b.dataset.bnav)));
})();

let lwLibPromise = null;
function ensureLWLib() {
  if (window.LightweightCharts) return Promise.resolve(true);
  if (lwLibPromise) return lwLibPromise;
  const urls = ["https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js", "https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"];
  lwLibPromise = (async () => {
    for (const u of urls) {
      try {
        await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = u; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); setTimeout(rej, 8000); });
        if (window.LightweightCharts) return true;
      } catch (e) {}
    }
    return !!window.LightweightCharts;
  })();
  return lwLibPromise;
}

/* ---------- TradingView Lightweight Charts engine (modal pro chart) ---------- */
let lwChart = null, lwSeries = null;
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
  const r0 = await fetchChartValidated(url, 7000);
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
  if (!window.LightweightCharts) { const okLib = await ensureLWLib(); if (!okLib) return off(); }
  if (["1d5m", "5d15m", "5d1h"].includes(stockRange)) return off();
  let bars = null, fullCloses = null;
  const DAILY = { "7d15m": 7, "1mo": 31, "3mo": 92, "6mo": 183, "1y": 366 };
  if (DAILY[stockRange]) {
    const mst = await fetchMaster(stockSym);
    if (!mst || !mst.ohlc || mst.ohlc.length < 2) return off();
    fullCloses = mst.points.map(p => ({ t: p.t, c: p.c }));
    bars = stockRange === "1y" ? mst.ohlc : mst.ohlc.filter(b => b.t >= Date.now() - DAILY[stockRange] * 86400000);
  } else {
    try { bars = await fetchOHLC(stockSym, stockRange === "5y" ? "5y" : "max", stockRange === "5y" ? "1wk" : "1mo"); } catch (e) { return off(); }
    if (!bars || bars.length < 2) return off();
    fullCloses = bars.map(b => ({ t: b.t, c: b.c }));
  }
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
  const barByDay = {};
  ubars.forEach(b => barByDay[dayStr(b.t)] = b);
  lwChart.subscribeCrosshairMove(param => {
    const lg = $("lwLegend");
    if (!lg) return;
    if (!param || !param.time || !barByDay[param.time]) { lg.textContent = "TradingView chart · drag to pan · scroll / pinch to zoom"; return; }
    const b = barByDay[param.time];
    lg.textContent = param.time + " · O " + inr2(b.o) + " · H " + inr2(b.h) + " · L " + inr2(b.l) + " · C " + inr2(b.c) + (b.v ? " · Vol " + b.v.toLocaleString("en-IN") : "");
  });
  } catch (e) { return off(); }
  if (legend) legend.textContent = "TradingView chart · drag to pan · scroll / pinch to zoom";
}
const _drawStockBase = drawStock;
drawStock = async function () { await _drawStockBase(); try { await renderTA(); } catch (e) {} };

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
    for (const u of candidates) {
      try { r0 = await fetchChartValidated(u, 6500); break; } catch (e) { /* next candidate */ }
    }
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
      holder.innerHTML = '<select id="sheetWlSel" class="wl-sel">' + others.map(w => '<option value="' + w.id + '">' + esc(w.name) + '</option>').join("") + '</select><button class="mini-btn" id="sheetWlCopy" type="button">Copy to List</button>';
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
    '<p class="price-meta">Full details (52-week range, technicals) replace this card the moment the free feed answers.</p>';
  rs.innerHTML = '<div class="skel" style="height:14px;width:60%"></div>';
  nw.innerHTML = '<div class="skel" style="height:14px;width:88%"></div><div class="skel" style="height:14px;width:70%;margin-top:8px"></div>';
  const cp = $("stockCorp"); if (cp) cp.innerHTML = '<div class="skel" style="height:14px;width:55%"></div>';
  /* Watchdog: whatever happens below (slow network, a rejected promise, an
     unexpected error), no section may sit on a skeleton beyond ~9 seconds. */
  const sheetFallback = () => {
    const sec = sectorOf(sym);
    if (!ab.dataset.instant) ab.innerHTML = '<p class="comp-line"><b>' + esc(name) + '</b> · NSE' + (sec ? ' · ' + esc(sec) : '') + '</p>' +
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
    info.textContent = caches + " saved caches · " + Math.max(1, Math.round(bytes / 1024)) + " KB on this device · Folio v63";
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
  if (t.closest("[data-close-modal]")) { e.stopPropagation(); window.closeCompanyModal(); }
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
      (best ? '<span class="chip">Top Contributor <b>' + esc(best.row.sym) + '</b> <span class="' + (best.change >= 0 ? "gain" : "loss") + '">' + inr(best.change) + " (" + pct(best.pct) + ")</span></span>" : "") +
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
    '<span class="wl-actions"><button type="button" class="wl-act" data-wlnew="1" title="Create a new watchlist">➕ New</button>' +
    '<button type="button" class="wl-act" data-wlrename="1" title="Rename this watchlist">✏️</button>' +
    '<button type="button" class="wl-act danger" data-wldel="1" title="Delete this watchlist">🗑️</button></span>';
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
  const r0 = await fetchChartValidated(url, 7000);
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
    if (real && real.length) { taState.bars = real; taState.preview = false; taDraw(); return; }
    throw new Error("empty");
  } catch (e) {
    if (tok !== taToken || activeModalSymbol !== sym) return;
    if (preview) taPill("preview");
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

/* =====================================================================
   IPO Master v2 — IPO Master-style hub: 5 views (All / GMP / Subscription /
   Allotment / FAQs & Lead Managers), quick-filter patti, hero + KPI snapshot,
   sidebar widgets, desktop table + mobile cards, PAN vault (device-local),
   application & UPI mandate tracker, and a best-effort ipomaster.net sync.
   Market-wide headline figures are LILA-supplied IPO Master snapshot values,
   labelled as such; Folio's own counts always come from the real catalog.
   ===================================================================== */
const IPO_MARKET = { total: 835, open: 0, upcoming: 1, closed: 834, y2026: 304, yMain: 111, ySme: 193, funds: "₹1,70,178 Cr", profitPct: "60%", profitOf: "180 of 299 listings", avgGain: "+12.8%", median: "+3.0%", avgSubs: "64.73x", bestName: "Tempsens Instruments (India) IPO", bestGain: "+111.3%", busiest: "September 2026 · 86 issues", yearActivity: "351 IPOs opened in the last 12 months" };
const IPO_CATALOG = [
  { name: "Crystal Crop Protection IPO", sym: "", board: "MAINBOARD", status: "upcoming", low: null, high: null, lot: null, size: null, fresh: 355, fv: 10, open: "2026-11-18", close: "2026-11-20", allot: "2026-11-23", listing: "2026-11-26", listed: null, reg: "MUFG Intime", year: 2026, subsT: 0, managers: "IIFL Capital Services · Motilal Oswal Investment Advisors · DAM Capital Advisors", gainPct: null, tentative: true, saleType: "Fresh Capital & Offer For Sale", sectorLine: "Chemicals", industry: "Pesticides & Agrochemicals", about: "Crystal Crop Protection Limited is an agrochemical and seed company engaged in providing comprehensive crop solutions to Indian farmers. Its core business comprises crop protection products and seeds. The crop protection portfolio includes herbicides, insecticides, fungicides, plant growth regulators, and bio-stimulants.",
    objective: ["Repayment/pre-payment, in full or part of certain borrowings availed by our Company.", "Investment in our Material Subsidiary namely Saffire Crop Science Private Limited for repayment/pre-payment, in full or in part, of all or a portion of certain of its outstanding borrowings.", "Funding inorganic growth through unidentified acquisitions and strategic initiatives and general corporate purposes."],
    fin: { periods: ["31 Mar 2023", "31 Mar 2024", "31 Mar 2025", "30 Sep 2025"], revenue: [2540.10, 2385.40, 2731.90, 1995.86], pat: [134.80, 92.40, 118.30, 153.51], patMargin: "7.69%", cols: ["30 Sep 2025", "31 Mar 2025", "31 Mar 2024", "31 Mar 2023"], rows: [["Assets", [3859.23, 3372.40, 3110.15, 2890.50]], ["Revenue", [1995.86, 2731.90, 2385.40, 2540.10]], ["Profit After Tax", [153.51, 118.30, 92.40, 134.80]], ["Net Worth", [1748.90, 1600.20, 1482.10, 1390.00]], ["Reserve & Surplus", [0.0, 0.0, 0.0, 0.0]], ["Total Borrowings", [1205.24, 947.00, 885.60, 812.30]]] },
    peers: [["Crystal Crop Protection Ltd", "0.00", "9.30", "8.76%"], ["Kaveri Seeds Company Ltd", "17.75", "55.10", "21.40%"], ["Sumitomo Chemical India Ltd", "45.88", "10.10", "18.90%"], ["Bayer CropScience Ltd", "35.58", "126.30", "24.10%"], ["Rallis India Limited", "39.78", "6.40", "8.20%"]],
    kpiA: [["ROE (%)", "9.98", "8.30"], ["ROCE (%)", "15.81", "17.20"], ["Debt/Equity", "0.75", "0.60"], ["RoNW (%)", "8.76", "7.40"], ["PAT Margin (%)", "7.69", "4.30"]],
    kpiB: [["EPS (₹)", "0.00", "0.00"], ["P/E (x)", "0.00", "0.00"]],
    contact: { name: "Crystal Crop Protection Ltd.", addr: "206, 2nd Floor, Span Trade Centre Opp. Kochrab, Gandhi Ashram, Near Paldi Char Rasta, Ashram Road Ellisbridge, Ahmedabad, Gujarat, 380006", phone: "+91 11 49007100", email: "investor@crystalcrop.com", web: "https://www.crystalcropprotection.com/" },
    regDetail: { name: "MUFG Intime India Pvt Ltd", formerly: "formerly Link Intime India Private Limited", phone: "+91 8108114949", email: "ipo.helpdesk@linkintime.co.in" } },
  { name: "Tempsens Instruments (India) IPO", sym: "", board: "MAINBOARD", status: "listed", low: 285, high: 300, lot: 50, size: 650, open: "2026-08-21", close: "2026-08-25", allot: "2026-08-26", listing: "2026-08-28", listed: 634, reg: "KFintech", fv: 10, year: 2026, subsT: 184.07, subs: { q: 302.88, n: 314.44, r: 60.69, t: 184.07 }, managers: "ICICI Securities · JM Financial", gainPct: null, about: "Temperature sensing instruments maker. Listed 28 Aug 2026 at ₹634 against the ₹300 issue price (+111.3%) — the best listing of 2026 in the IPO Master snapshot. Subscribed 184.07x overall (QIB 302.88x · NII 314.44x · Retail 60.69x)." },
  { name: "Bharat Coking Coal IPO", sym: "", board: "MAINBOARD", status: "listed", low: null, high: null, lot: null, size: null, open: "2026-06-08", close: "2026-06-10", allot: "2026-06-11", listing: "2026-06-15", listed: null, reg: "", fv: 10, year: 2026, subsT: 98.4, managers: "", gainPct: 96.0, about: "Coal India subsidiary and India's largest coking coal producer. Listed at +96.0% in the IPO Master snapshot." },
  { name: "Bajaj Housing Finance", sym: "BAJAJHFL", board: "MAINBOARD", status: "listed", low: 66, high: 70, lot: 214, size: 6560, open: "2024-09-09", close: "2024-09-11", allot: "2024-09-12", listing: "2024-09-16", listed: 165, reg: "KFintech", fv: 10, year: 2024, subsT: 63.6, managers: "SBI Capital · BOB Capital · HSBC · Nomura · IIFL", about: "Housing finance arm of the Bajaj group — home loans, LAP and developer finance. One of 2024's most subscribed large IPOs." },
  { name: "Hyundai Motor India", sym: "HYUNDAI", board: "MAINBOARD", status: "listed", low: 1865, high: 1960, lot: 7, size: 27870, open: "2024-10-15", close: "2024-10-17", allot: "2024-10-18", listing: "2024-10-22", listed: 1934, reg: "KFintech", fv: 10, year: 2024, subsT: 2.4, managers: "Kotak Mahindra Capital · Citigroup · HSBC · JP Morgan · Morgan Stanley", about: "India's second-largest car maker (Creta, i20, Verna). India's largest IPO by size at the time — a pure offer-for-sale by the Korean parent." },
  { name: "Waaree Energies", sym: "WAAREEENER", board: "MAINBOARD", status: "listed", low: 1427, high: 1503, lot: 9, size: 4321, open: "2024-10-21", close: "2024-10-23", allot: "2024-10-24", listing: "2024-10-28", listed: 2550, reg: "Link Intime", fv: 10, year: 2024, subsT: 79.4, managers: "Axis Capital · IIFL · SBI Capital · Jefferies", about: "India's largest solar PV module manufacturer, exporting heavily to the US. Listed at a blockbuster premium." },
  { name: "Premier Energies", sym: "PREMIERENE", board: "MAINBOARD", status: "listed", low: 427, high: 450, lot: 33, size: 2830, open: "2024-08-27", close: "2024-08-29", allot: "2024-08-30", listing: "2024-09-03", listed: 991, reg: "KFintech", fv: 10, year: 2024, subsT: 95.0, managers: "Kotak · ICICI Securities · Nuvama", about: "Integrated solar cell and module manufacturer. One of the strongest listings of 2024 (over +120% on debut)." },
  { name: "Ola Electric Mobility", sym: "OLAELEC", board: "MAINBOARD", status: "listed", low: 72, high: 76, lot: 195, size: 6146, open: "2024-08-02", close: "2024-08-06", allot: "2024-08-07", listing: "2024-08-09", listed: 91, reg: "Link Intime", fv: 10, year: 2024, subsT: 4.3, managers: "BOB Capital · Axis Capital · ICICI Securities · SBI Capital", about: "India's largest electric two-wheeler maker (S1 scooter range) with its own cell gigafactory plans." },
  { name: "Swiggy", sym: "SWIGGY", board: "MAINBOARD", status: "listed", low: 371, high: 390, lot: 38, size: 11327, open: "2024-11-06", close: "2024-11-08", allot: "2024-11-11", listing: "2024-11-13", listed: 420, reg: "Link Intime", fv: 10, year: 2024, subsT: 3.6, managers: "Kotak · JP Morgan · BofA · Jefferies · Avendus", about: "Food delivery (Swiggy), quick commerce (Instamart) and dining (Dineout) platform — India's second listed food-tech giant." },
  { name: "NTPC Green Energy", sym: "NTPCGREEN", board: "MAINBOARD", status: "listed", low: 102, high: 108, lot: 138, size: 10000, open: "2024-11-19", close: "2024-11-22", allot: "2024-11-25", listing: "2024-11-27", listed: 111.5, reg: "KFintech", fv: 10, year: 2024, subsT: 2.6, managers: "IDBI Capital · HDFC Bank · IIFL · Nuvama", about: "NTPC's renewable energy arm — large solar and wind portfolio with aggressive capacity targets." },
  { name: "Vishal Mega Mart", sym: "VMM", board: "MAINBOARD", status: "listed", low: 74, high: 78, lot: 190, size: 8000, open: "2024-12-11", close: "2024-12-13", allot: "2024-12-16", listing: "2024-12-18", listed: 110, reg: "KFintech", fv: 10, year: 2024, subsT: 2.2, managers: "JM Financial · Morgan Stanley · Axis · Kotak", about: "Value fashion and FMCG retail chain with 600+ stores, strong in tier-2/3 India. Pure offer-for-sale by Samayat Services." },
  { name: "Mobikwik", sym: "MOBIKWIK", board: "MAINBOARD", status: "listed", low: 265, high: 279, lot: 53, size: 572, open: "2024-12-11", close: "2024-12-13", allot: "2024-12-16", listing: "2024-12-18", listed: 442, reg: "Link Intime", fv: 10, year: 2024, subsT: 119.3, managers: "SBI Capital · DAM Capital", about: "Digital payments and consumer credit (BNPL) fintech. Small issue, huge demand — listed near +58%." },
  { name: "Sai Life Sciences", sym: "SAILIFE", board: "MAINBOARD", status: "listed", low: 522, high: 549, lot: 27, size: 3043, open: "2024-12-11", close: "2024-12-13", allot: "2024-12-16", listing: "2024-12-18", listed: 650, reg: "KFintech", fv: 10, year: 2024, subsT: 10.3, managers: "Kotak · IIFL · Jefferies · Nomura", about: "Contract research & manufacturing (CRDMO) partner for global pharma innovators, Hyderabad-based." },
  { name: "Sagility India", sym: "SAGILITY", board: "MAINBOARD", status: "listed", low: 28, high: 30, lot: 500, size: 2107, open: "2024-11-05", close: "2024-11-07", allot: "2024-11-08", listing: "2024-11-12", listed: 31, reg: "KFintech", fv: 10, year: 2024, subsT: 3.2, managers: "ICICI Securities · IIFL · Jefferies · JP Morgan", about: "Healthcare-focused BPM services for US health insurers and providers. Pure offer-for-sale." },
  { name: "Afcons Infrastructure", sym: "AFCONS", board: "MAINBOARD", status: "listed", low: 440, high: 463, lot: 32, size: 5430, open: "2024-10-25", close: "2024-10-29", allot: "2024-10-30", listing: "2024-11-04", listed: 474, reg: "Link Intime", fv: 10, year: 2024, subsT: 46.7, managers: "ICICI Securities · DAM Capital · Jefferies · Nomura", about: "Shapoorji Pallonji group's infrastructure arm — metros, tunnels, marine and complex EPC projects." },
  { name: "Enviro Infra Engineers", sym: "ENVIRO", board: "MAINBOARD", status: "listed", low: 140, high: 148, lot: 101, size: 650, open: "2024-11-22", close: "2024-11-26", allot: "2024-11-27", listing: "2024-11-29", listed: 218, reg: "Bigshare", fv: 10, year: 2024, subsT: 89.0, managers: "HDFC Bank · Sharekhan", about: "Water and wastewater treatment EPC (STPs, sewerage networks) for government bodies." },
  { name: "Zinka Logistics (BlackBuck)", sym: "ZINKALOG", board: "MAINBOARD", status: "listed", low: 259, high: 273, lot: 54, size: 550, open: "2024-11-13", close: "2024-11-18", allot: "2024-11-19", listing: "2024-11-22", listed: 279, reg: "KFintech", fv: 10, year: 2024, subsT: 1.9, managers: "Morgan Stanley · Axis · JM Financial · IIFL", about: "BlackBuck — digital platform for truck operators: payments, telematics, loads and vehicle finance." }
];
const REGISTRAR_CARDS = [
  { name: "MUFG Intime / Link Intime", url: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html", note: "Erstwhile Link Intime India" },
  { name: "KFintech — IPO Allotment", url: "https://ris.kfintech.com/ipostatus/", note: "KFin Technologies status page" },
  { name: "KFintech Kosmic Portal", url: "https://kosmic.kfintech.com/", note: "KFin investor services portal" },
  { name: "Bigshare Services", url: "https://ipo.bigshareonline.com/IPO_Status.html", note: "Bigshare allotment status" },
  { name: "BSE India — Application Check", url: "https://www.bseindia.com/investors/appli_check.aspx", note: "Official exchange application check" },
  { name: "NSE India — Bid Verification", url: "https://www.nseindia.com/products-services/ipo-bid-verification", note: "Verify your IPO bid on NSE" }
];
const IPO_FAQS = [
  ["What is GMP and should I trust it?", "GMP (Grey Market Premium) is the unofficial premium at which IPO applications trade before listing. It hints at listing sentiment but is unregulated, thin and can swing wildly — never apply only because of GMP. Check the business, valuation and subscription quality (QIB demand) first."],
  ["What are the investor categories and their quotas?", "Retail (RII): applications up to ₹2 lakh — at least 35% of a mainboard issue. sNII: ₹2–10 lakh; bNII: above ₹10 lakh — together NII gets at least 15%. QIBs get up to 50%. SME IPOs have different minimums (usually ₹1–2 lakh per application)."],
  ["How many lots should a retail investor apply for?", "If an IPO is heavily oversubscribed, allotment is a lottery and extra lots do not improve your odds beyond one application per PAN — apply 1 lot from multiple family PANs instead (each with its own demat + bank). Money stays blocked only till allotment finalises."],
  ["What is ASBA / UPI mandate and when is money debited?", "Your money is only BLOCKED (lien) in your bank account, not debited. Approve the UPI mandate before the deadline (usually 5 PM on closing day). If you get no allotment, the block is released; if allotted, exactly the allotted amount is debited."],
  ["When and how do I check allotment?", "Allotment finalises a day or two after the issue closes. Check on the registrar's website (Link Intime / KFintech / Bigshare) with PAN, or on BSE's application check. This hub's Allotment tab keeps the official links one tap away."],
  ["What happens on listing day?", "Shares credit to your demat a day before listing. On listing day you can sell immediately or hold — there is no lock-in for IPO allottees (except anchor investors). SME listings have a lot-size exit: you can only sell multiples of the lot initially."]
];
let ipoMainView = "all", ipoQuick = "live", ipoBoard = "ALL", ipoYear = "all", ipoSort = "new", ipoQuery = "", ipoOpenKey = "";
let ipoSyncing = false;
function ipoSynced() { try { return JSON.parse(localStorage.getItem("folio_ipo_synced") || "[]").filter(s => !(/crystal/i.test(s.name || "") && (s.low == null || s.low < 272.07))); } catch (e) { return []; } }
function ipoWatch() { try { return JSON.parse(localStorage.getItem("folio_ipo_watch") || "[]"); } catch (e) { return []; } }
function ipoToggleWatch(key) {
  let w = ipoWatch();
  w = w.includes(key) ? w.filter(k => k !== key) : w.concat(key);
  localStorage.setItem("folio_ipo_watch", JSON.stringify(w));
  return w.includes(key);
}
function ipoMono(x) {
  const words = (x.name || "?").replace(/\bIPO\b/i, "").trim().split(/\s+/).filter(Boolean);
  return ((words[0] || "?")[0] + ((words[1] || "")[0] || "")).toUpperCase();
}
function ipoHue(x) { let h = 0; const s = x.name || ""; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function ipoShortD(d) { if (!d) return "—"; const p = d.split("-"); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return p.length === 3 ? p[2].replace(/^0/, "") + " " + M[parseInt(p[1], 10) - 1] : d; }
let ipoCat = "mainline";
function istTodayStr() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function ipoEffStatus(x) {
  if (!x || !x.open || !x.close) return x ? x.status : "listed";
  const t = istTodayStr();
  if (t < x.open) return "upcoming";
  if (t > x.close) return "listed";
  return "open";
}
function ipoAll() {
  const custom = ((state.profile && state.profile.customIpos) || []).map(x => Object.assign({}, x, { custom: true }));
  const synced = ipoSynced().filter(s => !custom.some(c => c.name.toLowerCase() === s.name.toLowerCase()) && !IPO_CATALOG.some(c => c.name.toLowerCase() === s.name.toLowerCase()));
  return custom.concat(synced, IPO_CATALOG);
}
function ipoKey(x) { return (x.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
function ipoFmtD(d) { if (!d) return "—"; const p = d.split("-"); if (p.length !== 3) return d; const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return p[2].replace(/^0/, "") + " " + M[parseInt(p[1], 10) - 1] + " " + p[0]; }
function ipoGain(x) {
  if (x.gainPct != null) return x.gainPct;
  if (x.listed != null && x.high) return (x.listed / x.high - 1) * 100;
  return null;
}
function ipoSubsParts(x) { return x.subs || null; }
function ipoFiltered() {
  let list = ipoAll();
  if (ipoCat === "watch") { const w = ipoWatch(); list = list.filter(x => w.includes(ipoKey(x))); }
  if (ipoQuick === "live") list = list.filter(x => ipoEffStatus(x) === "open");
  else if (ipoQuick === "upcoming") list = list.filter(x => ipoEffStatus(x) === "upcoming");
  else if (ipoQuick === "listed") list = list.filter(x => ipoEffStatus(x) === "listed");
  else if (ipoQuick === "sme") list = list.filter(x => /SME/.test(x.board || ""));
  else if (ipoQuick === "y2026") list = list.filter(x => x.year === 2026);
  else if (ipoQuick === "gainers") list = list.filter(x => ipoGain(x) != null).sort((a, b) => ipoGain(b) - ipoGain(a)).slice(0, 10);
  if (ipoBoard === "MAINBOARD") list = list.filter(x => x.board === "MAINBOARD");
  if (ipoBoard === "SME") list = list.filter(x => /SME/.test(x.board || ""));
  if (ipoYear !== "all") list = list.filter(x => x.year === parseInt(ipoYear, 10));
  if (ipoQuery) { const q = ipoQuery.toLowerCase(); list = list.filter(x => (x.name + " " + (x.sym || "")).toLowerCase().includes(q)); }
  const dkey = x => x.open || x.listing || "";
  if (ipoSort === "gain") list.sort((a, b) => (ipoGain(b) == null ? -1e9 : ipoGain(b)) - (ipoGain(a) == null ? -1e9 : ipoGain(a)));
  else if (ipoSort === "subs") list.sort((a, b) => (b.subsT || -1) - (a.subsT || -1));
  else if (ipoSort === "size") list.sort((a, b) => (b.size || -1) - (a.size || -1));
  else list.sort((a, b) => dkey(b).localeCompare(dkey(a)));
  if (ipoQuick === "listed") { list.sort((a, b) => String(b.close || b.listing || "").localeCompare(String(a.close || a.listing || ""))); list = list.slice(0, 10); }
  return list;
}
function ipoBadge(x) {
  if (ipoEffStatus(x) === "open") return '<span class="ipo-badge open">● LIVE · Closes ' + ipoFmtD(x.close) + "</span>";
  if (ipoEffStatus(x) === "upcoming") return '<span class="ipo-badge upcoming">Opens ' + ipoFmtD(x.open) + "</span>";
  const g = ipoGain(x);
  return '<span class="ipo-badge listed">Listed ' + ipoFmtD(x.listing) + (g != null ? ' · <b class="' + (g >= 0 ? "pos" : "neg") + '">' + (g >= 0 ? "+" : "") + g.toFixed(1) + "%</b>" : "") + "</span>";
}
function ipoLotCalc(x, lots) {
  const per = (x.high != null && x.lot) ? x.high * x.lot : null;
  if (!per) return { per: null, snii: null, bnii: null };
  return { per, snii: Math.max(1, Math.ceil(200000 / per)), bnii: Math.max(1, Math.ceil(1000000 / per)) };
}
function ipoDetailHtml(x, key) {
  const band = x.low != null ? "₹" + x.low + " – ₹" + x.high : "TBA (band not announced)";
  const calc = ipoLotCalc(x, 1);
  const subs = ipoSubsParts(x);
  const subsRows = subs ? [["QIB", subs.q], ["NII", subs.n], ["Retail", subs.r], ["Employee", subs.e], ["Total", subs.t]] : (x.subsT != null ? [["Total subscription", x.subsT]] : []);
  const subsHtml = subsRows.length ? '<h4>Subscription</h4><div class="ipo-sub-grid">' + subsRows.map(r => "<div><span>" + r[0] + '</span><b>' + (r[1] != null ? Number(r[1]).toFixed(2) + "x" : "—") + "</b></div>").join("") + "</div>" : "";
  const calcHtml = calc.per ? '<h4>Lot Calculator</h4><div class="ipo-sub-grid"><div><span>Retail · 1 lot</span><b>' + inrShort(calc.per) + '</b></div><div><span>sNII min · ' + calc.snii + ' lots &gt; ₹2L</span><b>' + inrShort(calc.per * calc.snii) + '</b></div><div><span>bNII min · ' + calc.bnii + '+ lots &gt; ₹10L</span><b>' + inrShort(calc.per * calc.bnii) + "+</b></div></div>" : "";
  const regBtns = REGISTRAR_CARDS.map(r => '<a class="btn btn-small" href="' + r.url + '" target="_blank" rel="noopener">' + r.name.split(" — ")[0] + " ↗</a>").join("");
  const news = '<a class="btn btn-small" href="https://news.google.com/search?q=' + encodeURIComponent(x.name + " IPO") + '" target="_blank" rel="noopener">📰 IPO News</a>';
  return (x.about ? "<h4>About the Company</h4><p>" + esc(x.about) + "</p>" : "") +
    '<div class="ipo-sub-grid"><div><span>Price Band</span><b>' + band + '</b></div><div><span>Lot Size</span><b>' + (x.lot ? x.lot + " shares" : "TBA") + '</b></div><div><span>Issue Size</span><b>' + (x.size ? "₹" + Number(x.size).toLocaleString("en-IN") + " Cr" : "—") + '</b></div><div><span>Registrar</span><b>' + esc(x.reg || "—") + '</b></div>' + (x.managers ? '<div><span>Lead Managers</span><b class="ipo-mgr">' + esc(x.managers) + "</b></div>" : "") + "</div>" +
    subsHtml + calcHtml +
    '<h4>Check Allotment (official)</h4><div class="ipo-reg-row">' + regBtns + news + '<button type="button" class="btn btn-small" data-allotgo="1">🎯 Open Allotment Hub</button></div>' +
    '<h4>📝 Log My Application</h4><div class="ipo-logform"><select class="lf-cat"><option>Retail</option><option>sNII</option><option>bNII</option><option>Shareholder</option><option>Employee</option></select><input type="number" class="lf-lots" value="1" min="1" placeholder="Lots"><select class="lf-upi"><option>iMobile Pay</option><option>Kotak 811</option><option>BHIM</option><option>PhonePe</option><option>Google Pay</option><option>Paytm</option><option>Other</option></select><select class="lf-status"><option>Mandate Pending</option><option>Mandate Approved</option><option>Applied</option><option>Allotted</option><option>Not Allotted</option><option>Listed</option><option>Refunded</option></select><button type="button" class="btn btn-gold btn-small" data-logsave="' + key + '">💾 Save Application</button></div>';
}
function ipoCardHtml(x) {
  const key = ipoKey(x);
  const starred = ipoWatch().includes(key);
  const band = x.low != null ? "₹" + x.low.toLocaleString("en-IN") + " – ₹" + x.high.toLocaleString("en-IN") : "---";
  const minInv = (x.high != null && x.lot) ? inrShort(x.high * x.lot) : "-";
  const g = ipoGain(x);
  const isCrystal = /crystal/i.test(x.name);
  const logo = isCrystal ? '<span class="ipo-logo-emoji">🌿</span><span class="ipo-logo-word">CRYSTAL</span>' : '<span class="ipo-logo-mono">' + ipoMono(x) + "</span>";
  const title = esc(x.name) + (x.tentative ? ' <span class="ipo-tent">(Tentative date)</span>' : "");
  const effSt = ipoEffStatus(x);
  const statusPill = effSt === "open" ? '<span class="ipo-badge open">● Live / Open</span>' : effSt === "upcoming" ? '<span class="ipo-badge upcoming-blue">UpComing</span>' : '<span class="ipo-badge listed">Listed' + (g != null ? " " + (g >= 0 ? "+" : "") + g.toFixed(1) + "%" : "") + "</span>";
  const sizeTxt = x.size ? "₹" + Number(x.size).toLocaleString("en-IN") + " Cr." : (x.fresh ? "₹" + Number(x.fresh).toFixed(2) + " Cr. (Fresh)" : "TBA");
  const steps = [[x.open, "Open"], [x.close, "Close"], [x.allot, "Allotment"], [x.listing, "Listing"]];
  return '<article class="ipo-card">' +
    '<div class="ipo-card-top"><span class="ipo-logo" style="--hue:' + ipoHue(x) + '">' + logo + '</span><span class="ipo-title-wrap"><b class="ipo-title">' + title + '</b><small>Book-building IPO (BSE, NSE)' + (x.board ? " · " + (x.board === "SME" ? "SME" : "Mainboard") : "") + "</small>" + (ipoCountBadge(x) ? '<small class="ipo-count-badge">' + ipoCountBadge(x) + "</small>" : "") + '</span><span class="ipo-top-r">' + statusPill + '<button type="button" class="ipo-star-btn' + (starred ? " on" : "") + '" data-ipostar="' + key + '" title="Save to IPO Watchlist">' + (starred ? "★" : "☆") + "</button></span></div>" +
    '<div class="ipo-date-grid"><div class="ipo-date-box open"><span>Open Date</span><b>' + (x.open ? ipoShortD(x.open) + " " + x.open.slice(0, 4) : "—") + '</b></div><div class="ipo-date-box close"><span>Close Date</span><b>' + (x.close ? ipoShortD(x.close) + " " + x.close.slice(0, 4) : "—") + "</b></div></div>" +
    '<div class="ipo-mrow r3"><div><span>Price Band</span><b>' + band + '</b></div><div><span>Lot Size</span><b>' + (x.lot || "-") + '</b></div><div><span>Min Invest.</span><b>' + minInv + "</b></div></div>" +
    '<div class="ipo-mrow r2"><div><span>Face Value</span><b>' + (x.fv ? x.fv.toFixed(1) : "—") + '</b></div><div><span>Issue Size</span><b>' + sizeTxt + "</b></div></div>" +
    '<div class="ipo-mrow r2"><div><span>GMP</span><b>' + (g != null ? (g >= 0 ? "+" : "") + g.toFixed(1) + "%" : "-") + '</b></div><div><span>Subscription (Times)</span><b class="ipo-subs-orange">' + (x.subsT == null ? "NA" : Number(x.subsT).toFixed(2) + "x") + "</b></div></div>" +
    '<div class="ipo-tl-head"><i></i><span>Timeline</span><i></i></div><div class="ipo-tl-row">' + steps.map(s => '<div class="ipo-tl-step"><b>[' + ipoShortD(s[0]) + "]</b><span>" + s[1] + "</span></div>").join('<i class="ipo-tl-link"></i>') + "</div>" +
    '<div class="ipo-card-actions"><button type="button" class="btn btn-gold ipo-full-btn" data-deepipo="' + key + '">View Full IPO Details, Financials &amp; KPIs →</button><button type="button" class="btn ipo-share-btn" data-shareipo="' + key + '">↗ Share</button></div>' +
    "</article>";
}
function ipoTableHtml(list) {
  const rows = list.map(x => {
    const g = ipoGain(x);
    return '<tr data-deskipo="' + ipoKey(x) + '"><td><b>' + esc(x.name) + "</b><br><small>" + esc(x.board || "") + '</small></td><td>' + ipoFmtD(x.open) + " → " + ipoFmtD(x.close) + '</td><td>' + (x.low != null ? "₹" + x.low.toLocaleString("en-IN") + "–" + x.high.toLocaleString("en-IN") : "TBA") + '</td><td>' + (x.size ? "₹" + Number(x.size).toLocaleString("en-IN") + " Cr" : "—") + '</td><td>' + (x.subsT != null ? Number(x.subsT).toFixed(1) + "x" : "—") + '</td><td>' + (g != null ? '<b class="' + (g >= 0 ? "pos" : "neg") + '">' + (g >= 0 ? "+" : "") + g.toFixed(1) + "%</b>" : "—") + "</td><td>" + ipoBadge(x) + "</td></tr>";
  }).join("");
  return '<div class="ipo-table-wrap"><table class="ipo-table"><thead><tr><th>Company</th><th>Dates</th><th>Price Band</th><th>Issue Size</th><th>Subs.</th><th>GMP / Listing</th><th>Status</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}
function renderIpoHero() {
  const line = $("ipoHeroLine"), kpis = $("ipoKpis");
  const all = ipoAll();
  if (line) line.innerHTML = "<b>" + IPO_MARKET.total + " mainboard &amp; SME IPOs</b> (IPO Master market snapshot): <b>" + IPO_MARKET.open + "</b> open for bidding, <b>" + IPO_MARKET.upcoming + "</b> upcoming and <b>" + IPO_MARKET.closed + "</b> closed. In 2026, <b>" + IPO_MARKET.profitOf + "</b> opened above the issue price, led by <b>" + esc(IPO_MARKET.bestName) + "</b> at <b>" + IPO_MARKET.bestGain + "</b>. Folio's built-in catalog below tracks <b>" + all.length + " IPOs</b> in full detail.";
  if (kpis) kpis.innerHTML = [
    ["IPOs in 2026", IPO_MARKET.y2026, IPO_MARKET.yMain + " Mainboard · " + IPO_MARKET.ySme + " SME"],
    ["Funds raised", IPO_MARKET.funds, "Total issue size"],
    ["Listed in profit", IPO_MARKET.profitPct, IPO_MARKET.profitOf],
    ["Avg. listing gain", IPO_MARKET.avgGain, "Median " + IPO_MARKET.median],
    ["Avg. subscription", IPO_MARKET.avgSubs, "Across all categories"]
  ].map(k => '<div class="ipo-kpi"><span>' + k[0] + "</span><b>" + k[1] + "</b><small>" + k[2] + "</small></div>").join("");
}
function renderIpoQuick() {
  const seg = $("ipoSubSeg"); if (!seg) return;
  let base = ipoAll();
  if (ipoCat === "watch") { const w = ipoWatch(); base = base.filter(x => w.includes(ipoKey(x))); }
  if (ipoBoard === "MAINBOARD") base = base.filter(x => x.board === "MAINBOARD");
  if (ipoBoard === "SME") base = base.filter(x => /SME/.test(x.board || ""));
  const n = s => base.filter(x => ipoEffStatus(x) === s).length;
  const items = [["live", "Ongoing (" + n("open") + ")"], ["upcoming", "Upcoming (" + n("upcoming") + ")"], ["listed", "Closed (" + Math.min(10, n("listed")) + ")"]];
  seg.innerHTML = items.map(i => '<button type="button" data-ipoquick="' + i[0] + '" class="seg-btn ipo-status-pill' + (ipoQuick === i[0] ? " active" : "") + '">' + i[1] + "</button>").join("");
  seg.querySelectorAll("[data-ipoquick]").forEach(b => b.addEventListener("click", () => { ipoQuick = b.dataset.ipoquick; ipoOpenKey = ""; renderIpo(); }));
}
function renderIpoAside() {
  const all = ipoAll();
  const openBox = $("ipoAsideOpen"), weekBox = $("ipoAsideWeek"), bestBox = $("ipoAsideBest"), actBox = $("ipoAsideActivity");
  if (openBox) {
    const opens = all.filter(x => ipoEffStatus(x) === "open");
    openBox.innerHTML = "<h4>Open now (" + opens.length + ")</h4>" + (opens.length ? opens.map(x => '<button type="button" class="ipo-side-row" data-sideipo="' + ipoKey(x) + '"><b>' + esc(x.name) + "</b><span>Closes " + ipoFmtD(x.close) + "</span></button>").join("") : '<p>No IPO is open today.</p><button type="button" class="btn btn-small" data-gotosubs="1">Live subscription →</button>');
  }
  if (weekBox) {
    const up = all.filter(x => x.status === "upcoming").sort((a, b) => (a.open || "").localeCompare(b.open || ""))[0];
    weekBox.innerHTML = "<h4>This week (Upcoming)</h4>" + (up ? '<button type="button" class="ipo-side-row" data-sideipo="' + ipoKey(up) + '"><b>' + esc(up.name) + '</b><span class="ipo-badge upcoming">Opens ' + ipoFmtD(up.open) + "</span><span>" + esc(up.board || "") + '</span></button><button type="button" class="btn btn-small" data-gotoupcoming="1">IPO calendar →</button>' : "<p>No upcoming IPO on the calendar.</p>");
  }
  if (bestBox) {
    const best = all.filter(x => ipoGain(x) != null).sort((a, b) => ipoGain(b) - ipoGain(a)).slice(0, 5);
    bestBox.innerHTML = "<h4>Best listings (Folio catalog)</h4>" + best.map(x => '<button type="button" class="ipo-side-row" data-sideipo="' + ipoKey(x) + '"><b>' + esc(x.name) + '</b><span class="ipo-gain-pill">+' + ipoGain(x).toFixed(1) + "%</span></button>").join("");
  }
  if (actBox) {
    const months = [];
    const now = new Date(2026, 10, 1);
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ ym: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()] + " " + String(d.getFullYear()).slice(2), main: 0, sme: 0 }); }
    all.forEach(x => { const src = x.listing || x.open || ""; const m = months.find(mm => mm.ym === src.slice(0, 7)); if (m) { if (/SME/.test(x.board || "")) m.sme++; else m.main++; } });
    const max = Math.max(1, ...months.map(m => m.main + m.sme));
    actBox.innerHTML = "<h4>IPO activity — last 12 months</h4><p class='ipo-act-sub'>Market: " + IPO_MARKET.yearActivity + "; busiest " + IPO_MARKET.busiest + ". Bars below = Folio's tracked catalog.</p>" + '<div class="ipo-bars">' + months.map(m => '<div class="ipo-bar-col" title="' + m.label + ": " + (m.main + m.sme) + '"><div class="ipo-bar-stack" style="height:' + Math.max(4, (m.main + m.sme) / max * 64) + 'px"><i class="ipo-bar-sme" style="height:' + (m.main + m.sme ? (m.sme / (m.main + m.sme)) * 100 : 0) + '%"></i></div><span>' + m.label.split(" ")[0] + "</span></div>").join("") + "</div>";
  }
}
function renderIpoAll() {
  const wrap = $("ipoList"); if (!wrap) return;
  const list = ipoFiltered();
  const detail = $("ipoDetail"); if (detail) detail.innerHTML = "";
  if (!list.length) {
    if (ipoCat === "watch") { wrap.innerHTML = '<div class="ipo-card ipo-empty"><h3>No starred IPOs yet</h3><p class="empty-note">Tap the ☆ on any IPO card to track it here.</p></div>'; return; }
    if (ipoQuick === "live") {
      const upN = ipoAll().filter(x => x.status === "upcoming").length;
      wrap.innerHTML = '<div class="ipo-card ipo-empty"><svg class="ipo-empty-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><h3>No Ongoing IPOs</h3><p class="empty-note">You can visit upcoming section</p><button type="button" class="btn btn-gold" data-emptyup="1">View Upcoming (' + upN + ') IPO →</button></div>';
      const u = wrap.querySelector("[data-emptyup]"); if (u) u.addEventListener("click", () => { ipoQuick = "upcoming"; renderIpo(); });
      return;
    }
    wrap.innerHTML = '<p class="empty-note">No IPOs match this filter in the Folio catalog. Add one with “➕ Add Custom IPO” or tap “🔄 Sync Live from IPO Master”.</p>';
    return;
  }
  wrap.innerHTML = ipoTableHtml(list) + '<div class="ipo-cards-wrap">' + list.map(ipoCardHtml).join("") + "</div>";
  wrap.querySelectorAll("[data-deskipo]").forEach(r => r.addEventListener("click", () => openIpoDeep(r.dataset.deskipo)));
}
function ipoShowDetail(key, keep) {
  const x = ipoAll().find(i => ipoKey(i) === key); const d = $("ipoDetail"); if (!x || !d) return;
  if (!keep) ipoOpenKey = key;
  d.innerHTML = '<div class="ipo-card ipo-detail-card"><div class="ipo-card-head"><span class="ipo-head-l"><b>' + esc(x.name) + "</b><small>" + esc(x.board || "") + " · " + esc(x.reg || "") + '</small></span><span class="ipo-head-r">' + ipoBadge(x) + '</span></div><div class="ipo-drawer">' + ipoDetailHtml(x, key) + "</div></div>";
  d.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function renderIpoGmp() {
  const w = $("ipoGmpList"); if (!w) return;
  const list = ipoAll().slice().sort((a, b) => (ipoGain(b) == null ? -1e9 : ipoGain(b)) - (ipoGain(a) == null ? -1e9 : ipoGain(a)));
  w.innerHTML = '<div class="ipo-table-wrap gmp"><table class="ipo-table"><thead><tr><th>IPO</th><th>Price Band</th><th>GMP / Listing Gain</th><th>Est. Listing Price</th><th>Kostak</th><th>Subject to Sauda</th></tr></thead><tbody>' + list.map(x => {
    const g = ipoGain(x);
    const est = x.listed != null ? "₹" + Number(x.listed).toLocaleString("en-IN") : (x.high && g != null ? "₹" + Math.round(x.high * (1 + g / 100)).toLocaleString("en-IN") : "—");
    return "<tr><td><b>" + esc(x.name) + "</b><br><small>" + (x.status === "listed" ? "Listed " + ipoFmtD(x.listing) : x.status === "open" ? "Live now" : "Upcoming " + ipoFmtD(x.open)) + '</small></td><td>' + (x.low != null ? "₹" + x.low.toLocaleString("en-IN") + "–" + x.high.toLocaleString("en-IN") : "TBA") + '</td><td>' + (g != null ? '<b class="' + (g >= 0 ? "pos" : "neg") + '">' + (g >= 0 ? "+" : "") + g.toFixed(1) + "%</b>" : "—") + "</td><td>" + est + "</td><td>—</td><td>—</td></tr>";
  }).join("") + "</tbody></table></div>";
}
function renderIpoSubs() {
  const w = $("ipoSubsList"); if (!w) return;
  const list = ipoAll().filter(x => x.subsT != null || ipoSubsParts(x)).sort((a, b) => (b.subsT || 0) - (a.subsT || 0));
  if (!list.length) { w.innerHTML = '<p class="empty-note">No subscription data in the catalog yet.</p>'; return; }
  w.innerHTML = '<div class="ipo-table-wrap subs"><table class="ipo-table"><thead><tr><th>IPO</th><th>QIB</th><th>NII</th><th>Retail</th><th>Employee</th><th>Total</th></tr></thead><tbody>' + list.map(x => {
    const s = ipoSubsParts(x) || {};
    const cell = v => v != null ? Number(v).toFixed(2) + "x" : "—";
    return "<tr><td><b>" + esc(x.name) + "</b></td><td>" + cell(s.q) + "</td><td>" + cell(s.n) + "</td><td>" + cell(s.r) + "</td><td>" + cell(s.e) + "</td><td><b>" + cell(x.subsT != null ? x.subsT : s.t) + "</b></td></tr>";
  }).join("") + "</tbody></table></div><p class='price-meta'>Category splits appear when a live sync or a detailed source provides them; totals are from the curated snapshot.</p>";
}
const IPO_APP_STATUSES = ["Mandate Pending", "Mandate Approved", "Applied", "Allotted", "Not Allotted", "Listed", "Refunded", "Cancelled"];
function ipoApps() { return (state.profile && state.profile.ipoApps) || []; }
function renderIpoApps() {
  const w = $("ipoAppsWrap"); if (!w) return;
  const apps = ipoApps();
  if (!apps.length) { w.innerHTML = '<p class="empty-note">No applications logged yet. Open any IPO card → “📝 Log My Application”.</p>'; return; }
  w.innerHTML = apps.map(a => {
    const canAdd = (a.status === "Allotted" || a.status === "Listed") && !a.added && a.sym && a.lotSize && a.price;
    return '<div class="ipo-app-row"><span class="ipo-app-main"><b>' + esc(a.ipoName) + "</b><small>" + esc(a.category) + " · " + a.lots + " lot(s) · " + inrShort(a.amount || 0) + " blocked" + (a.upi ? " · UPI: " + esc(a.upi) : "") + " · " + ipoFmtD((a.added || "").slice(0, 10)) + '</small></span><select data-appstatus="' + a.id + '">' + IPO_APP_STATUSES.map(s => '<option' + (a.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select>" + (a.added ? '<span class="ipo-badge open">✓ In Holdings</span>' : canAdd ? '<button type="button" class="btn btn-gold btn-small" data-addhold="' + a.id + '">🚀 Transfer Allotted Shares to Holdings</button>' : "") + '<button type="button" class="btn btn-small" data-appdel="' + a.id + '">✕</button></div>';
  }).join("");
  w.querySelectorAll("[data-appstatus]").forEach(s => s.addEventListener("change", () => { const a = ipoApps().find(v => v.id === s.dataset.appstatus); if (a) { a.status = s.value; persist(); renderIpoApps(); toast("Status updated: " + a.status); } }));
  w.querySelectorAll("[data-appdel]").forEach(b => b.addEventListener("click", () => { state.profile.ipoApps = ipoApps().filter(v => v.id !== b.dataset.appdel); persist(); renderIpoApps(); }));
  w.querySelectorAll("[data-addhold]").forEach(b => b.addEventListener("click", () => addIpoToHoldings(b.dataset.addhold)));
}
function addIpoToHoldings(id) {
  const a = ipoApps().find(v => v.id === id); if (!a || a.added) return;
  const qty = a.lots * a.lotSize;
  const st = resolveStock(a.sym, a.ipoName);
  state.txs.push({ id: "t" + Date.now().toString(36), type: "BUY", symbol: st.symbol, name: st.name, sector: st.sector || sectorOf(st.symbol, st.name), qty, price: a.price, date: a.listingDate || new Date().toISOString().slice(0, 10), charges: 0, chargesMode: "amount", broker: "IPO Allotment", exchange: "NSE", note: "IPO allotment — " + a.ipoName + " (" + a.category + ", " + a.lots + " lot" + (a.lots > 1 ? "s" : "") + ")" });
  a.added = true;
  persist(); renderAll(); renderIpoApps();
  toast("🎉 " + qty + " " + a.sym + " shares added to Holdings at ₹" + a.price);
}
let ipoAllotQuery = "";
const IPO_REGISTRARS = [
  { test: /mufg|link intime/i, name: "MUFG Intime (Link Intime)", url: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html" },
  { test: /kfin/i, name: "KFintech", url: "https://ris.kfintech.com/ipostatus/" },
  { test: /bigshare/i, name: "Bigshare Services", url: "https://ipo.bigshareonline.com/IPO_Status.html" },
  { test: /maashitla/i, name: "Maashitla Securities", url: "https://maashitla.com/allotment-status/public-issues" },
  { test: /skyline/i, name: "Skyline Financial Services", url: "https://www.skylinerta.com/ipo.php" },
  { test: /purva/i, name: "Purva Sharegistry", url: "https://www.purvashare.com/investor-service/ipo-query" },
  { test: /cameo/i, name: "Cameo Corporate Services", url: "https://ipo.cameoindia.com/" },
];
function ipoRegInfo(x) {
  const r = IPO_REGISTRARS.find(g => g.test.test(x.reg || ""));
  if (r) return r;
  return { name: (x.reg || "Registrar") + " · via BSE", url: "https://www.bseindia.com/investors/appli_check.aspx" };
}
function ipoDayDiff(a, b) { return Math.round((new Date(a + "T00:00:00+05:30") - new Date(b + "T00:00:00+05:30")) / 86400000); }
function ipoCountBadge(x) {
  const eff = ipoEffStatus(x); const t = istTodayStr();
  if (eff === "upcoming" && x.open) { const d = ipoDayDiff(x.open, t); return d <= 0 ? "Opens Today" : d === 1 ? "Opens Tomorrow" : "Opens in " + d + " Days"; }
  if (eff === "open" && x.close) { const d = ipoDayDiff(x.close, t); return d <= 0 ? "Closing Today" : d === 1 ? "Closes Tomorrow" : "Closes in " + d + " Days"; }
  return "";
}
function ipoAllotCard(x) {
  const key = ipoKey(x);
  const reg = ipoRegInfo(x);
  const today = istTodayStr();
  const future = x.allot && x.allot >= today;
  const dateBadge = future ? "📅 Allotment: " + ipoFmtD(x.allot) : "Allotted: " + ipoFmtD(x.allot);
  const statusPill = future ? '<span class="ipo-badge upcoming-blue">⏳ Allotment on ' + ipoShortD(x.allot) + "</span>" : '<span class="ipo-badge open">✅ Allotment Out · Check Now</span>';
  const boardPill = x.board === "SME" ? "NSE SME" : "Mainboard";
  const price = x.high != null ? "₹" + Number(x.high).toLocaleString("en-IN") : "TBA";
  const subs = x.subsT != null ? Number(x.subsT).toFixed(2).replace(/\.00$/, "") + "x" : "—";
  return '<article class="ipo-card ipo-allot-card">' +
    '<div class="ipo-card-top"><span class="ipo-logo" style="--hue:' + ipoHue(x) + '"><span class="ipo-logo-mono">' + ipoMono(x) + '</span></span><span class="ipo-title-wrap"><b class="ipo-title">' + esc(x.name) + '</b><small><span class="ipo-board-pill">' + boardPill + '</span></small></span><span class="ipo-top-r allot-r"><span class="ipo-allot-date">' + dateBadge + "</span>" + statusPill + "</span></div>" +
    '<div class="ipo-allot-strip"><span>Issue Date: ' + ipoFmtD(x.open) + "</span><span>Issue Price: " + price + "</span><span>Sub: " + subs + "</span><span>Registrar: <b>" + esc(reg.name) + "</b></span></div>" +
    '<a class="btn btn-gold ipo-allot-btn" href="' + reg.url + '" target="_blank" rel="noopener">' + (future ? "🎯 Registrar: " + esc(reg.name) + " (Opens on Allotment Day) ↗" : "🎯 Check Allotment on " + esc(reg.name) + " ↗") + "</a>" +
    "</article>";
}
function renderIpoAllot() {
  const box = $("ipoViewAllot"); if (!box) return;
  const today = istTodayStr();
  let list = ipoAll().filter(x => x.allot && ipoDayDiff(today, x.allot) <= 7);
  if (ipoAllotQuery) { const q = ipoAllotQuery.toLowerCase(); list = list.filter(x => x.name.toLowerCase().includes(q)); }
  const upcoming = list.filter(x => x.allot >= today).sort((a, b) => a.allot.localeCompare(b.allot));
  const recent = list.filter(x => x.allot < today).sort((a, b) => b.allot.localeCompare(a.allot));
  const ordered = upcoming.concat(recent);
  box.innerHTML = '<div class="panel ipo-allot-head"><h2>IPO Allotment Status</h2><p class="ipo-allot-sub">Sorted by allotment date · Tap "Check Allotment" to open the official registrar portal for that IPO.</p>' +
    '<input id="ipoAllotSearch" class="ipo-allot-search" type="search" placeholder="Search company name..." value="' + esc(ipoAllotQuery) + '"></div>' +
    '<div class="ipo-cards-wrap">' + (ordered.length ? ordered.map(ipoAllotCard).join("") : '<p class="empty-note">No allotments this week — upcoming and last-7-days allotments appear here.</p>') + "</div>";
  const s = $("ipoAllotSearch");
  if (s) s.addEventListener("input", () => { ipoAllotQuery = s.value; const pos = s.selectionStart; renderIpoAllot(); const s2 = $("ipoAllotSearch"); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} } });
}
function renderIpoFaqs() {
  const f = $("ipoFaqList");
  if (f && !f.children.length) f.innerHTML = IPO_FAQS.map(q => "<details class='ipo-faq'><summary>" + q[0] + "</summary><p>" + q[1] + "</p></details>").join("");
  const m = $("ipoManagers"); if (!m) return;
  const agg = {};
  ipoAll().forEach(x => { (x.managers || "").split("·").map(s => s.trim()).filter(Boolean).forEach(mg => { agg[mg] = agg[mg] || { n: 0, gains: [] }; agg[mg].n++; const g = ipoGain(x); if (g != null) agg[mg].gains.push(g); }); });
  const rows = Object.keys(agg).map(k => ({ name: k, n: agg[k].n, avg: agg[k].gains.length ? agg[k].gains.reduce((a, b) => a + b, 0) / agg[k].gains.length : null })).sort((a, b) => b.n - a.n || (b.avg || -1e9) - (a.avg || -1e9));
  m.innerHTML = rows.length ? rows.map((r, i) => '<div class="ipo-mgr-row"><span class="ipo-mgr-rank">' + (i + 1) + '</span><span class="ipo-app-main"><b>' + esc(r.name) + "</b><small>" + r.n + " issue(s) in Folio's catalog</small></span>" + (r.avg != null ? '<span class="ipo-gain-pill">avg +' + r.avg.toFixed(1) + "%</span>" : '<span class="price-meta">no listed data</span>') + "</div>").join("") : '<p class="empty-note">No lead-manager data in the catalog yet.</p>';
}
function setIpoMain(v) {
  ipoMainView = v;
  const vw = $("view-ipo"); if (vw) vw.classList.toggle("ipo-show-more", v === "faqs");
  document.querySelectorAll("#ipoMainSeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.ipomain === v));
  [["all", "ipoViewAll"], ["gmp", "ipoViewGmp"], ["subs", "ipoViewSubs"], ["allot", "ipoViewAllot"], ["faqs", "ipoViewFaqs"]].forEach(p => { const el = $(p[1]); if (el) el.classList.toggle("hidden", p[0] !== v); });
  renderIpo();
}
function renderIpo() {
  renderIpoHero(); renderIpoQuick(); renderIpoAside();
  if (ipoMainView === "all") renderIpoAll();
  else if (ipoMainView === "gmp") renderIpoGmp();
  else if (ipoMainView === "subs") renderIpoSubs();
  else if (ipoMainView === "allot") renderIpoAllot();
  else if (ipoMainView === "faqs") renderIpoFaqs();
  if (!window.__ipoSyncTried) { window.__ipoSyncTried = 1; setTimeout(() => ipoSyncMaster(true), 1500); }
}
async function ipoSyncMaster(silent) {
  if (ipoSyncing) return; ipoSyncing = true;
  const st = $("ipoSyncState"); if (st) st.textContent = "Syncing with ipomaster.net…";
  let added = 0, okPages = 0;
  try {
    const pages = [["ongoing", "open"], ["upcoming", "upcoming"], ["closed", "listed"]];
    const known = new Set(ipoAll().map(x => x.name.toLowerCase()));
    const synced = ipoSynced();
    for (const [q, status] of pages) {
      try {
        const html = await fetchViaProxies("https://ipomaster.net/all-ipos?status=" + q);
        if (!html || html.length < 500) continue;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const rows = doc.querySelectorAll("table tbody tr, table tr");
        let pageAdded = 0;
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim());
          if (cells.length < 3) return;
          const name = cells[0].replace(/\s+/g, " ");
          if (!name || name.length < 4 || /company|ipo name/i.test(name)) return;
          const key = name.toLowerCase().replace(/\s+ipo$/, "");
          if (known.has(key) || known.has(name.toLowerCase())) return;
          known.add(name.toLowerCase());
          synced.push({ name: name.replace(/\s+ipo$/i, "") + (/\bipo\b/i.test(name) ? "" : ""), sym: "", board: /sme/i.test(tr.textContent) ? "SME" : "MAINBOARD", status, low: null, high: null, lot: null, size: null, open: "", close: "", allot: "", listing: "", listed: null, reg: "", year: 2026, subsT: null, managers: "", gainPct: null, about: "Synced from ipomaster.net — details fill in as the issue progresses. Verify on NSE/BSE.", synced: true });
          pageAdded++;
        });
        if (pageAdded || rows.length) okPages++;
        added += pageAdded;
      } catch (e) { /* one page failing is fine */ }
    }
    if (synced.length) localStorage.setItem("folio_ipo_synced", JSON.stringify(synced.slice(-80)));
    if (st) st.textContent = okPages ? "Last sync: " + new Date().toLocaleTimeString("en-IN") + " · " + added + " new IPO(s) merged from ipomaster.net" : "Sync could not read ipomaster.net right now — the built-in catalog below is complete and instant.";
    if (!silent) toast(okPages ? "IPO sync done · " + added + " new merged" : "ipomaster.net unreachable right now — catalog is up to date");
    if (added) renderIpo();
  } finally { ipoSyncing = false; }
}
function ipoVault() { try { return JSON.parse(localStorage.getItem("folio_ipo_vault") || "{}"); } catch (e) { return {}; } }

/* ---------- IPO deep-dive (full-screen, 11 sections, jump patti) ---------- */
let ipoDeepKey = "";
const IPO_JUMPS = [["dd-details", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg> IPO Details'], ["dd-timeline", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg> Timeline'], ["dd-objective", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg> Objective'], ["dd-docs", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/></svg> IPO Documents'], ["dd-fin", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v15.5h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/></svg> Financial Performance'], ["dd-peers", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M6 20h12"/><path d="M7.5 7L5 12.5h5zM16.5 7L14 12.5h5z"/></svg> Peer Comparison'], ["dd-kpi", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19a8 8 0 1 1 14 0"/><path d="M12 15l3.5-5.5"/></svg> KPI'], ["dd-about", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg> About Company'], ["dd-contact", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg> Contact Details'], ["dd-managers", '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M6 21V9l6-5 6 5v12"/><path d="M10 21v-5h4v5"/></svg> Lead Managers & Registrar']];
function ipoDayPlus(d, n) { if (!d) return ""; const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); }
function ipoKvRows(rows) { return rows.map(r => '<div class="ipo-kv"><span>' + r[0] + "</span><b>" + r[1] + "</b></div>").join(""); }
function openIpoDeep(key) {
  const x = ipoAll().find(i => ipoKey(i) === key); if (!x) return;
  ipoDeepKey = key;
  const deep = $("ipoDeep"), body = $("ipoDeepBody"), title = $("ipoDeepTitle"), star = $("ipoDeepStar"), jump = $("ipoJumpSeg");
  if (!deep || !body) return;
  if (title) title.textContent = x.name;
  if (star) { const on = ipoWatch().includes(key); star.textContent = on ? "★" : "☆"; star.classList.toggle("on", on); }
  if (jump) jump.innerHTML = IPO_JUMPS.map(j => '<button type="button" class="seg-btn" data-jump="' + j[0] + '">' + j[1] + "</button>").join("") + '<button type="button" class="seg-btn" data-jump="dd-apply"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5.5"/></svg> My Application</button>';
  const g = ipoGain(x);
  const band = x.low != null ? "₹" + x.low.toLocaleString("en-IN") + " – ₹" + x.high.toLocaleString("en-IN") : "TBA (-)";
  const details = ipoKvRows([
    ["IPO Issue Date", (x.open ? ipoShortD(x.open) : "—") + " - " + (x.close ? ipoShortD(x.close) + " " + x.close.slice(0, 4) : "—")],
    ["Price Band", band], ["Lot Size", x.lot ? x.lot + " shares" : "TBA (-)"], ["Face Value", x.fv ? "₹" + x.fv : "—"],
    ["Sale Type", x.saleType || "Fresh Capital & Offer For Sale"], ["Issue Type", "Book-building IPO"], ["Listing On", "BSE, NSE"],
    ["Sector", x.sectorLine || "—"], ["Industry", x.industry || "—"], ["GMP", g != null ? (g >= 0 ? "+" : "") + g.toFixed(1) + "%" : "-"],
    ["Times Subscribed", '<span class="ipo-subs-orange">' + (x.subsT == null ? "NA" : Number(x.subsT).toFixed(2) + "x") + "</span>"],
    ["Total Issue Size", x.size ? "₹" + Number(x.size).toLocaleString("en-IN") + " Cr." : "TBA"],
    ["Fresh Issue", x.fresh ? "₹" + Number(x.fresh).toFixed(2) + " Cr." : "—"]
  ]);
  const tl = [[x.open, "Opening Date"], [x.close, "Closing Date"], [x.allot, "Finalisation of basis of allotment"], [x.allot, "Initiation of refund"], [ipoDayPlus(x.allot, 1), "Transfer of shares to Demat A/C"], [x.listing, "Listing Date"]];
  const timeline = tl.map(s => '<div class="ipo-tl-v"><span class="ipo-tl-badge">' + ipoShortD(s[0]) + '</span><span class="ipo-tl-txt"><b>' + (s[0] ? ipoShortD(s[0]) + " " + s[0].slice(0, 4) : "—") + "</b><span>" + s[1] + "</span></span></div>").join("") + '<p class="price-meta">Note : The Schedule is ' + (x.tentative ? "tentative" : "as per the issue timetable") + ".</p>";
  const objective = x.objective ? "<ol class='ipo-obj'>" + x.objective.map(o => "<li>" + esc(o) + "</li>").join("") + "</ol>" : '<p class="empty-note">Objects of the issue are listed in the DRHP (see Documents).</p>';
  const docs = '<a class="ipo-doc-tile" href="https://www.google.com/search?q=' + encodeURIComponent("DRHP " + x.name + " filetype:pdf") + '" target="_blank" rel="noopener"><span class="ipo-doc-ic">DRHP</span><span><b>DRHP File Document</b><small>Opens the DRHP filing search in a new tab</small></span></a>' + '<a class="ipo-doc-tile" href="https://www.nseindia.com/products-services/ipo" target="_blank" rel="noopener"><span class="ipo-doc-ic alt">NSE</span><span><b>NSE IPO Centre</b><small>Exchange issue page &amp; circulars</small></span></a>';
  let fin = '<p class="empty-note">Financials are not in this snapshot yet — they are in the DRHP (Documents above).</p>';
  if (x.fin) {
    const maxR = Math.max(...x.fin.revenue);
    const bars = x.fin.periods.map((p, i) => '<div class="ipo-fin-col"><div class="ipo-fin-bars"><i class="ipo-fin-rev" style="height:' + Math.max(4, x.fin.revenue[i] / maxR * 92) + 'px" title="Revenue ₹' + x.fin.revenue[i] + ' Cr"></i><i class="ipo-fin-pat" style="height:' + Math.max(3, x.fin.pat[i] / maxR * 92) + 'px" title="PAT ₹' + x.fin.pat[i] + ' Cr"></i></div><span>' + p + "</span></div>").join("");
    const table = '<div class="ipo-table-wrap always"><table class="ipo-table"><thead><tr><th>As On</th>' + x.fin.cols.map(c => "<th>" + c + "</th>").join("") + "</tr></thead><tbody>" + x.fin.rows.map(r => "<tr><td><b>" + r[0] + "</b></td>" + r[1].map(v => "<td>" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
    fin = '<div class="ipo-fin-callout"><b>' + x.fin.patMargin + '</b><span>PAT Margin</span></div><div class="ipo-fin-chart">' + bars + '</div><div class="ipo-fin-legend"><span><i class="lg-rev"></i>Revenue</span><span><i class="lg-pat"></i>Net Profit</span><span class="price-meta">All values are in Cr.</span></div>' + table;
  }
  const peers = x.peers ? '<div class="ipo-table-wrap always"><table class="ipo-table"><thead><tr><th>Company Name</th><th>P/E (x)</th><th>EPS (Basic)</th><th>RoNW (%)</th></tr></thead><tbody>' + x.peers.map((p, i) => "<tr" + (i === 0 ? ' class="ipo-peer-self"' : "") + "><td><b>" + esc(p[0]) + "</b></td><td>" + p[1] + "</td><td>" + p[2] + "</td><td>" + p[3] + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="empty-note">Peer comparison is not in this snapshot yet.</p>';
  const kpi = x.kpiA ? '<div class="ipo-table-wrap always"><table class="ipo-table"><thead><tr><th>KPI</th><th>30 Sep 2025</th><th>31 Mar 2025</th></tr></thead><tbody>' + x.kpiA.map(r => "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") + '</tbody></table></div><div class="ipo-table-wrap always"><table class="ipo-table"><thead><tr><th>Measure</th><th>Pre IPO</th><th>Post IPO</th></tr></thead><tbody>' + x.kpiB.map(r => "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="empty-note">KPIs are not in this snapshot yet.</p>';
  const about = x.about ? "<p class='ipo-about-p'>" + esc(x.about) + "</p>" : '<p class="empty-note">Company overview is in the DRHP.</p>';
  const contact = x.contact ? '<p class="ipo-about-p"><b>' + esc(x.contact.name) + "</b><br>" + esc(x.contact.addr) + '<br>Phone: ' + esc(x.contact.phone) + ' · Email: ' + esc(x.contact.email) + '<br>Website: <a href="' + x.contact.web + '" target="_blank" rel="noopener">' + esc(x.contact.web) + "</a></p>" : '<p class="empty-note">Registered office and contact details are in the DRHP.</p>';
  const mgrs = (x.managers || "").split("·").map(s => s.trim()).filter(Boolean);
  const regName = x.regDetail ? x.regDetail.name : (x.reg || "—");
  const regExtra = x.regDetail ? "<br><small>(" + esc(x.regDetail.formerly) + ")</small><br>Phone: " + esc(x.regDetail.phone) + " · Email: " + esc(x.regDetail.email) : "";
  const regUrl = (REGISTRAR_CARDS.find(r => (x.reg || "").toLowerCase().includes("kfin") ? /kfin/i.test(r.name) : (x.reg || "").toLowerCase().includes("bigshare") ? /bigshare/i.test(r.name) : /intime/i.test(r.name)) || REGISTRAR_CARDS[0]).url;
  const managers = (mgrs.length ? mgrs.map(mg => '<p class="ipo-mgr-line"><b>' + esc(mg) + "</b></p>").join("") : '<p class="empty-note">Lead managers are in the DRHP.</p>') + '<h4 class="ipo-dd-sub">Registrar</h4><p class="ipo-about-p"><b>' + esc(regName) + "</b>" + regExtra + '</p><button type="button" class="btn btn-gold" data-reggo="' + regUrl + '">🎯 Allotment Check on ' + esc((x.reg || "Registrar").split(" ")[0]) + " ↗</button>";
  const sec = (id, title, inner, badge) => '<div class="panel ipo-dd-card" id="' + id + '"><div class="panel-head"><h2>' + title + "</h2>" + (badge || "") + "</div>" + inner + "</div>";
  body.innerHTML =
    sec("dd-details", "IPO Details", details, '<span class="ipo-drhp-badge">DRHP</span>') +
    sec("dd-timeline", "Timeline", timeline) +
    sec("dd-objective", "Objective", objective) +
    sec("dd-docs", "IPO Documents", docs) +
    sec("dd-fin", "Financial Performance", fin) +
    sec("dd-peers", "Peer Comparison", peers) +
    sec("dd-kpi", "Key Performance Indicators (KPI)", kpi) +
    sec("dd-about", "About Company", about) +
    sec("dd-contact", "Contact Details", contact) +
    sec("dd-managers", "Lead Managers & Registrar", managers) +
    sec("dd-apply", "📝 Log My Application", ipoDetailHtml(x, key).split('<h4>📝 Log My Application</h4>')[1] || "");
  deep.classList.remove("hidden");
  deep.scrollTop = 0;
  if (jump) jump.querySelectorAll("[data-jump]").forEach(b => b.addEventListener("click", () => {
    jump.querySelectorAll(".seg-btn").forEach(y => y.classList.toggle("active", y === b));
    const t = $(b.dataset.jump); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}
function closeIpoDeep() { const d = $("ipoDeep"); if (d) d.classList.add("hidden"); ipoDeepKey = ""; }
function ipoShare(key) {
  const x = ipoAll().find(i => ipoKey(i) === key); if (!x) return;
  const txt = x.name + " · " + (x.low != null ? "Price band ₹" + x.low + "–₹" + x.high + ", lot " + x.lot : "Price band TBA") + " · Open " + ipoFmtD(x.open) + ", Close " + ipoFmtD(x.close) + (x.listing ? ", Listing " + ipoFmtD(x.listing) : "") + " · via Folio (A Singh Caizen Product)";
  if (navigator.share) navigator.share({ title: x.name, text: txt }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("📋 IPO summary copied — paste it anywhere"));
}

function ipoGotoCat(c) {
  document.querySelectorAll("#ipoCatSeg .seg-btn").forEach(y => y.classList.toggle("active", y.dataset.ipocat === c));
  document.querySelectorAll("#ipo-bottom-dock .ipo-nav-item").forEach(y => y.classList.toggle("active", y.dataset.ipoNav === c || y.dataset.ipoNav === (c === "watch" ? "watchlist" : c) || (c === "allot" && y.dataset.ipoNav === "allotment")));
  if (c === "allot") { setIpoMain("allot"); return; }
  if (c === "more") { setIpoMain("faqs"); return; }
  ipoCat = c;
  ipoBoard = c === "sme" ? "SME" : (c === "mainline" ? "MAINBOARD" : "ALL");
  const bseg = $("ipoBoardSeg"); if (bseg) bseg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x.dataset.ipoboard === ipoBoard));
  setIpoMain("all");
}
window.setAppWorld = function (w) { switchView(w === "ipo" ? "ipo" : "dashboard"); };
function wireIpo() {
  document.querySelectorAll("#ipoMainSeg .seg-btn").forEach(b => b.addEventListener("click", () => setIpoMain(b.dataset.ipomain)));
  const catSeg = $("ipoCatSeg");
  if (catSeg) catSeg.querySelectorAll("[data-ipocat]").forEach(b => b.addEventListener("click", () => ipoGotoCat(b.dataset.ipocat === "allot" ? "allot" : b.dataset.ipocat)));
  document.querySelectorAll("#ipo-bottom-dock .ipo-nav-item").forEach(b => b.addEventListener("click", () => {
    const map = { mainline: "mainline", sme: "sme", allotment: "allot", watchlist: "watch", more: "more" };
    ipoGotoCat(map[b.dataset.ipoNav] || "mainline");
  }));
  const exitBtn = $("ipoExitBtn"); if (exitBtn) exitBtn.addEventListener("click", () => window.setAppWorld("portfolio"));
  document.querySelectorAll("[data-appbar]").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.appbar;
    if (a === "more") ipoGotoCat("more");
    else if (a === "theme") { const t = $("themeBtn"); if (t) t.click(); }
    else if (a === "calendar") { ipoCat = "mainline"; ipoQuick = "upcoming"; setIpoMain("all"); renderIpo(); toast("IPO calendar — upcoming issues"); }
    else if (a === "search") { const v = $("view-ipo"); if (v) v.classList.toggle("ipo-filters-open"); const s = $("ipoSearch"); if (s) setTimeout(() => s.focus(), 30); }
    else if (a === "filter") {
      ipoBoard = ipoBoard === "ALL" ? "MAINBOARD" : (ipoBoard === "MAINBOARD" ? "SME" : "ALL");
      const bseg = $("ipoBoardSeg"); if (bseg) bseg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x.dataset.ipoboard === ipoBoard));
      if (ipoMainView === "all") renderIpoAll();
      toast("Board filter: " + (ipoBoard === "ALL" ? "All boards" : ipoBoard));
    }
  }));
  const dBack = $("ipoDeepBack"); if (dBack) dBack.addEventListener("click", closeIpoDeep);
  const dStar = $("ipoDeepStar"); if (dStar) dStar.addEventListener("click", () => { if (!ipoDeepKey) return; const on = ipoToggleWatch(ipoDeepKey); dStar.textContent = on ? "★" : "☆"; dStar.classList.toggle("on", on); if (ipoMainView === "all") renderIpoAll(); });
  const dDeep = $("ipoDeep"), dTop = $("ipoDeepTop");
  if (dDeep && dTop) { dDeep.addEventListener("scroll", () => dTop.classList.toggle("hidden", dDeep.scrollTop < 300), { passive: true }); dTop.addEventListener("click", () => dDeep.scrollTo({ top: 0, behavior: "smooth" })); }
  const bs = $("ipoBoardSeg"); if (bs) bs.querySelectorAll("[data-ipoboard]").forEach(b => b.addEventListener("click", () => { bs.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b)); ipoBoard = b.dataset.ipoboard; renderIpoAll(); }));
  const ys = $("ipoYearSel"); if (ys) ys.addEventListener("change", () => { ipoYear = ys.value; renderIpoAll(); });
  const ss = $("ipoSortSel"); if (ss) ss.addEventListener("change", () => { ipoSort = ss.value; renderIpoAll(); });
  const search = $("ipoSearch"); if (search) search.addEventListener("input", () => { ipoQuery = search.value.trim(); renderIpoAll(); });
  const ap = $("ipoApplyBtn"); if (ap) ap.addEventListener("click", () => { renderIpoAll(); toast("Filters applied"); });
  const rs = $("ipoResetBtn"); if (rs) rs.addEventListener("click", () => { ipoQuick = "all"; ipoBoard = "ALL"; ipoYear = "all"; ipoSort = "new"; ipoQuery = ""; if (search) search.value = ""; if (ys) ys.value = "all"; if (ss) ss.value = "new"; if (bs) bs.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x.dataset.ipoboard === "ALL")); renderIpo(); });
  const sync = $("ipoSyncBtn"); if (sync) sync.addEventListener("click", () => ipoSyncMaster(false));
  const add = $("ipoAddBtn"); if (add) add.addEventListener("click", () => { const f = $("ipoCustomForm"); if (f) f.classList.toggle("hidden"); });
  const cancel = $("icCancel"); if (cancel) cancel.addEventListener("click", () => { const f = $("ipoCustomForm"); if (f) f.classList.add("hidden"); });
  const form = $("ipoCustomForm");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("icName").value.trim(); if (!name) return;
    const entry = { name, sym: $("icSymbol").value.trim().toUpperCase(), board: $("icBoard").value, status: $("icStatus").value, low: parseFloat($("icLow").value) || null, high: parseFloat($("icHigh").value) || null, lot: parseInt($("icLot").value, 10) || null, size: parseFloat($("icIssue").value) || null, open: $("icOpen").value, close: $("icClose").value, allot: "", listing: $("icListing").value, listed: null, reg: $("icRegistrar").value, year: 2026, subsT: null, managers: "", gainPct: null, about: "Added by you in Folio." };
    if (!state.profile) state.profile = {};
    if (!Array.isArray(state.profile.customIpos)) state.profile.customIpos = [];
    state.profile.customIpos.unshift(entry);
    persist(); form.classList.add("hidden"); form.reset();
    ipoQuick = "all"; renderIpo();
    toast("Custom IPO added: " + name);
  });
  const buzz = $("ipoRefreshBtn"); if (buzz) buzz.addEventListener("click", loadIpoBuzz);
  const view = $("view-ipo");
  if (view) view.addEventListener("click", e => {
    const save = e.target.closest("[data-logsave]");
    if (save) {
      const key = save.dataset.logsave;
      const x = ipoAll().find(i => ipoKey(i) === key); if (!x) return;
      const wrap = save.closest(".ipo-drawer, .ipo-detail-card, .ipo-dd-card") || document;
      const lots = Math.max(1, parseInt((wrap.querySelector(".lf-lots") || {}).value, 10) || 1);
      const cat = (wrap.querySelector(".lf-cat") || {}).value || "Retail";
      const upi = (wrap.querySelector(".lf-upi") || {}).value || "";
      const status = (wrap.querySelector(".lf-status") || {}).value || "Applied";
      const price = x.high || x.low || 0;
      if (!state.profile) state.profile = {};
      if (!Array.isArray(state.profile.ipoApps)) state.profile.ipoApps = [];
      state.profile.ipoApps.unshift({ id: "ia" + Date.now().toString(36), ipoName: x.name, sym: x.sym || "", category: cat, lots, lotSize: x.lot || 0, price, amount: price && x.lot ? price * x.lot * lots : 0, upi, status, listingDate: x.listing || "", added: false });
      persist(); setIpoMain("allot");
      toast("Application saved under 🎯 Allotment → My Applications");
      return;
    }
    const go = e.target.closest("[data-allotgo]"); if (go) { setIpoMain("allot"); return; }
    const gs = e.target.closest("[data-gotosubs]"); if (gs) { setIpoMain("subs"); return; }
    const gu = e.target.closest("[data-gotoupcoming]"); if (gu) { ipoQuick = "upcoming"; setIpoMain("all"); return; }
    const side = e.target.closest("[data-sideipo]");
    if (side) { ipoQuick = "all"; setIpoMain("all"); setTimeout(() => openIpoDeep(side.dataset.sideipo), 30); return; }
    const deepB = e.target.closest("[data-deepipo]"); if (deepB) { openIpoDeep(deepB.dataset.deepipo); return; }
    const starB = e.target.closest("[data-ipostar]");
    if (starB) { const on = ipoToggleWatch(starB.dataset.ipostar); toast(on ? "★ Added to IPO Watchlist" : "Removed from IPO Watchlist"); if (ipoMainView === "all") renderIpoAll(); return; }
    const shareB = e.target.closest("[data-shareipo]"); if (shareB) { ipoShare(shareB.dataset.shareipo); return; }
    const regGo = e.target.closest("[data-reggo]");
    if (regGo) { const v = ipoVault(); if (v.pan && navigator.clipboard) navigator.clipboard.writeText(v.pan).then(() => toast("PAN copied — paste it on the registrar page"), () => {}); window.open(regGo.dataset.reggo, "_blank", "noopener"); return; }
    const reg = e.target.closest("[data-reg]");
    if (reg) {
      const vault = ipoVault();
      const open = url => window.open(url, "_blank", "noopener");
      if (reg.dataset.reg === "search") { const sel = $("ipoAllotSel"); open("https://www.google.com/search?q=" + encodeURIComponent("IPO allotment status " + (sel ? sel.value : ""))); return; }
      const card = REGISTRAR_CARDS[parseInt(reg.dataset.reg, 10)]; if (!card) return;
      if (vault.pan && navigator.clipboard) navigator.clipboard.writeText(vault.pan).then(() => toast("PAN copied — paste it on the registrar page"), () => {});
      else if (vault.pan) toast("PAN saved in the vault above — copy it before you go");
      open(card.url);
    }
  });
  const pan = $("ipoVaultPan"), dp = $("ipoVaultDp"), upiSel = $("ipoVaultUpi");
  const vault = ipoVault();
  if (pan) { pan.value = vault.pan || ""; pan.addEventListener("input", () => { const v = ipoVault(); v.pan = pan.value.trim().toUpperCase(); localStorage.setItem("folio_ipo_vault", JSON.stringify(v)); }); }
  if (dp) { dp.value = vault.dp || ""; dp.addEventListener("input", () => { const v = ipoVault(); v.dp = dp.value.trim(); localStorage.setItem("folio_ipo_vault", JSON.stringify(v)); }); }
  if (upiSel) { if (vault.upi) upiSel.value = vault.upi; upiSel.addEventListener("change", () => { const v = ipoVault(); v.upi = upiSel.value; localStorage.setItem("folio_ipo_vault", JSON.stringify(v)); }); }
  const cp = $("ipoCopyPan"); if (cp) cp.addEventListener("click", () => { const v = ipoVault(); if (!v.pan) { toast("Please enter your PAN first (it saves automatically as you type)"); return; } if (navigator.clipboard) navigator.clipboard.writeText(v.pan).then(() => toast("📋 PAN copied")); });
  const cd = $("ipoCopyDp"); if (cd) cd.addEventListener("click", () => { const v = ipoVault(); if (!v.dp) { toast("Please enter your DP / Client ID first (it saves automatically as you type)"); return; } if (navigator.clipboard) navigator.clipboard.writeText(v.dp).then(() => toast("📋 DP ID copied")); });
}
async function loadIpoBuzz() {
  const w = $("ipoBuzz"); if (!w) return;
  w.innerHTML = '<p class="empty-note">Loading the latest IPO headlines…</p>';
  try {
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent("https://news.google.com/rss/search?q=IPO+India+when:7d&hl=en-IN&gl=IN&ceid=IN:en");
    const raw = await fetchViaProxies(url);
    const data = JSON.parse(raw);
    const items = (data.items || []).slice(0, 8);
    if (!items.length) throw new Error("empty");
    w.innerHTML = items.map(it => '<a class="ipo-news-item" href="' + esc(it.link) + '" target="_blank" rel="noopener"><b>' + esc(it.title) + "</b><span>" + esc((it.pubDate || "").slice(0, 10)) + "</span></a>").join("");
  } catch (e) {
    w.innerHTML = '<p class="empty-note">Live headlines did not load (network). <a href="https://news.google.com/search?q=IPO%20India" target="_blank" rel="noopener">Open IPO news on Google News →</a></p>';
  }
}
wireIpo();
const _switchViewIpo2 = switchView;
switchView = function (v) { _switchViewIpo2(v); document.body.classList.toggle("ipo-world-active", v === "ipo"); if (v === "ipo") renderIpo(); };

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
    box.innerHTML = '<div class="panel-head"><h2>' + esc(title) + '</h2></div><p class="empty-note">Price history could not be loaded right now. Check your connection and reopen Insights to try again.</p>';
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
  if (q) q.addEventListener("input", () => { insXQuery = q.value.trim().toLowerCase(); const pos = q.selectionStart; insxRenderScore(); const q2 = $("insxScoreQ"); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} } });
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
    '<div class="insx-setrow"><button type="button" class="btn small" id="tgtNotifyBtn">' + (notifyOn ? "🔔 Browser notifications: ON" : "🔔 Browser notifications: OFF") + "</button><small>" + (supported ? "When on, Folio pops a notification if a target or stop-loss is crossed while the app is open. It is not a broker order." : "This browser does not support notifications.") + "</small></div></div>";
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
function tgtNotifyCheck() {
  if (!state.profile || !state.profile.notify) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem("folio_alert_state") || "{}"); } catch (e) {}
  const alerts = state.profile.alerts || {}; let changed = false;
  for (const sym of Object.keys(alerts)) {
    const cfg = alerts[sym]; const p = priceOf(sym); if (!p) continue;
    const st = cfg.target && p.price >= cfg.target ? "target" : cfg.sl && p.price <= cfg.sl ? "sl" : "in";
    if (seen[sym] && seen[sym] !== st && st !== "in") {
      try { new Notification("Folio — " + (st === "target" ? "Target hit: " : "Stop-loss hit: ") + sym, { body: sym + " is now " + inr2(p.price) + (st === "target" ? " · your target was " + inr2(cfg.target) : " · your stop-loss was " + inr2(cfg.sl)), icon: "assets/folio-icon.svg" }); } catch (e) {}
    }
    if (seen[sym] !== st) { seen[sym] = st; changed = true; }
  }
  if (changed) { try { localStorage.setItem("folio_alert_state", JSON.stringify(seen)); } catch (e) {} }
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
  const list = items.map(it => '<div class="insx-row plan-row"><div class="plan-line1"><span class="plan-sym">' + esc(it.label) + '</span><small>' + it.cur.toFixed(1) + '% now</small></div><span class="drift-wrap"><span class="drift-cur" style="width:' + (it.cur / maxScale * 100) + '%"></span><span class="drift-mark" style="left:' + Math.min(100, Math.max(0, it.target / maxScale * 100)) + '%"></span></span><div class="plan-line3"><label class="plan-lab">Target %<input type="number" class="plan-tgt" data-plan-key="' + esc(it.key) + '" min="0" max="100" step="0.5" inputmode="decimal" value="' + (it.target || "") + '" placeholder="e.g. 10"></label><b class="' + (Math.abs(it.action) < 1 ? "" : it.action > 0 ? "pos" : "neg") + '">' + (Math.abs(it.action) < 1 ? "In line" : (it.action > 0 ? "Buy " : "Sell ") + insxAmt(Math.abs(it.action))) + "</b></div></div>").join("");
  box.innerHTML = head +
    '<div class="insx-legend"><button type="button" class="insx-chip' + (planRebalMode === "stocks" ? " on" : "") + '" data-plan-mode="stocks">By stock</button><button type="button" class="insx-chip' + (planRebalMode === "sectors" ? " on" : "") + '" data-plan-mode="sectors">By sector</button></div>' +
    '<div class="insx-list">' + list + "</div>" +
    '<p class="insx-note">Targets add up to <b>' + sumT.toFixed(1) + '%</b>' + (Math.abs(sumT - 100) > 0.5 && sumT > 0 ? " — for a full plan they should add up to 100%." : ".") + ' The white tick on each bar is your target; the fill is today\'s share.</p>' +
    '<div class="insx-setrow"><label>Where to put new money ₹ <input type="number" id="planMoney" min="0" step="any" value="' + (planNewMoney || "") + '" placeholder="e.g. 25000"></label><button type="button" class="btn small" id="planMoneyBtn">Split it</button></div><div id="planMoneyOut"></div>';
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
function dashEnsure() {
  const view = $("view-dashboard"); if (!view || $("dashChips")) return;
  const bar = document.createElement("div"); bar.id = "dashChips"; bar.className = "dash-chips";
  bar.innerHTML = ["Overview", "Performance", "Risk", "Income", "Tax", "Market", "News"].map(n => '<button type="button" class="insx-chip" data-dash-chip="' + n + '">' + n + "</button>").join("") +
    '<button type="button" class="insx-chip" id="dashCustomBtn">⚙ Customize</button>' +
    '<button type="button" class="insx-chip" id="dashCompactBtn">Compact</button>';
  const grid = view.querySelector(".stat-grid");
  if (grid) view.insertBefore(bar, grid); else view.prepend(bar);
  bar.addEventListener("click", e => {
    const chip = e.target.closest("[data-dash-chip]");
    if (chip) { dashGo(chip.dataset.dashChip); return; }
    if (e.target.closest("#dashCustomBtn")) { document.body.classList.toggle("dash-customizing"); toast(document.body.classList.contains("dash-customizing") ? "Customize mode: use the ↑ ↓ 👁 buttons on each card. Tap Customize again to finish." : "Dashboard layout saved."); return; }
    if (e.target.closest("#dashCompactBtn")) {
      const on = document.body.classList.toggle("compact-dash");
      e.target.closest("#dashCompactBtn").classList.toggle("on", on);
      const L = dashLayout(); L.compact = on; state.profile.dashLayout = L; persist();
    }
  });
  /* collapsible cards (state remembered on this device) */
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("folio_dash_collapse") || "{}"); } catch (e) {}
  dashPanels().forEach(p => {
    const head = p.querySelector(".panel-head"); if (!head || head.querySelector(".dash-collapse")) return;
    const key = dashKey(p);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "dash-collapse"; btn.setAttribute("aria-label", "Collapse or expand this card");
    btn.textContent = saved[key] ? "▸" : "▾";
    if (saved[key]) p.classList.add("collapsed");
    btn.addEventListener("click", () => {
      const now = p.classList.toggle("collapsed");
      btn.textContent = now ? "▸" : "▾";
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
  /* active-chip highlighting */
  const io = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      const map = [["portfolio", "Overview"], ["performance", "Performance"], ["dividend snowball", "Income"], ["tax", "Tax"], ["market mood", "Market"]];
      const h = en.target.querySelector("h2"); if (!h) return;
      const m = map.find(([t]) => h.textContent.toLowerCase().includes(t));
      document.querySelectorAll("[data-dash-chip]").forEach(c => c.classList.toggle("on", !!m && c.dataset.dashChip === m[1]));
    });
  }, { rootMargin: "-30% 0px -55% 0px" });
  dashPanels().forEach(p => io.observe(p));
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
        const pts = vals.map((v, i) => (i / (vals.length - 1) * W).toFixed(1) + "," + (H - 3 - (max > min ? (v - min) / (max - min) : 0.5) * (H - 6)).toFixed(1)).join(" ");
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
  }
  const idxBox = $("pulseIdx");
  const IDX = [["^NSEI", "NIFTY 50"], ["^BSESN", "SENSEX"], ["^NSEBANK", "BANK NIFTY"], ["^CNXIT", "NIFTY IT"], ["^CNXPHARMA", "NIFTY PHARMA"], ["^CNXAUTO", "NIFTY AUTO"], ["^CNXMETAL", "NIFTY METAL"], ["^CNXFMCG", "NIFTY FMCG"]];
  const res = await Promise.all(IDX.map(([s]) => fetchHistory(s, "1mo").catch(() => null)));
  let html = "";
  res.forEach((r, i) => {
    const pts = r && r.points ? r.points : [];
    if (pts.length < 2) return;
    const last = pts[pts.length - 1].c, prev = pts[pts.length - 2].c;
    const day = prev ? (last / prev - 1) * 100 : 0;
    const sp = pts.slice(-22), min = Math.min(...sp.map(p => p.c)), max = Math.max(...sp.map(p => p.c));
    const line = sp.map((p, j) => (j / (sp.length - 1) * 74).toFixed(1) + "," + (20 - (max > min ? (p.c - min) / (max - min) : 0.5) * 17).toFixed(1)).join(" ");
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
  try { dashEnsure(); dashApplyLayout(); if (heroPnlMode === "today") dashHero(); else dashHeroSparkOnly(); pulseLoad(); } catch (e) {}
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
    '<label class="sx-cmp hold-group"><input type="checkbox" id="holdGroupTgl"> Group by sector</label>';
  const list = $("holdingsList");
  if (list) panel.insertBefore(bar, list);
  $("holdQ").addEventListener("input", e => { holdQuery = e.target.value.trim().toLowerCase(); holdApply(); });
  $("holdSortSel").addEventListener("change", e => { holdSort = e.target.value; holdApply(); });
  $("holdGroupTgl").addEventListener("change", e => { holdGroup = e.target.checked; holdApply(); });
}
function holdApply() {
  const list = $("holdingsList"); if (!list) return;
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
        const line = last30.map((p, i) => (i / (last30.length - 1) * 84).toFixed(1) + "," + (22 - (mx > mn ? (p.c - mn) / (mx - mn) : 0.5) * 19).toFixed(1)).join(" ");
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
function platInstallBtn() {
  const bar = $("dashChips"); if (!bar || $("installBtn")) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "insx-chip"; b.id = "installBtn"; b.textContent = "📲 Install Folio";
  b.addEventListener("click", async () => {
    if (deferredInstall) { deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null; b.remove(); }
    else toast("To install: open your browser menu and choose “Add to Home screen” / “Install app”.");
  });
  bar.appendChild(b);
}
/* --- offline banner --- */
function platOffline() {
  let pill = $("offlinePill");
  if (!navigator.onLine) {
    if (!pill) { pill = document.createElement("div"); pill.id = "offlinePill"; pill.textContent = "You're offline — showing your last saved data. Nothing you see can refresh until you're back online."; document.body.appendChild(pill); }
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
  $("cmdkInput").addEventListener("input", e => cmdkRender(e.target.value.trim().toLowerCase()));
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
  const views = [["dashboard", "🏠 Dashboard"], ["holdings", "💼 Holdings"], ["watch", "★ Watchlist"], ["insights", "📊 Insights"], ["history", "🕘 History"], ["news", "📰 News"], ["profile", "👤 My Profile"], ["ipo", "🚀 IPO Master"]];
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
    $("platReportBtn").addEventListener("click", platReport);
    $("platShareBtn").addEventListener("click", platShareCard);
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
taFetchRange = async function (sym, range, interval, byDay) {
  const key = sym + "|" + range + "|" + interval;
  const ttl = byDay ? 12 * 3600 * 1000 : 5 * 60 * 1000;
  const hit = await idbC.get(key);
  if (hit && hit.bars && hit.bars.length && Date.now() - hit.ts < ttl) return hit.bars;
  const bars = await _taFetchRange0(sym, range, interval, byDay);
  if (bars && bars.length) idbC.put(key, { ts: Date.now(), bars });
  return bars;
};
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
  row.innerHTML = '<a href="#" data-open-terms="1" class="mini-btn" style="display:inline-flex;align-items:center;text-decoration:none">🛡️ Terms, Privacy &amp; Security</a>';
  row.querySelector("[data-open-terms]").addEventListener("click", e => { e.preventDefault(); const m = $("termsModal"); if (m) m.classList.remove("hidden"); });
  pv.appendChild(row);
}
document.body.dataset.view = "dashboard";
