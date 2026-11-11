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
  const s = (sym.indexOf(".") >= 0 || sym.charAt(0) === "^") ? sym : sym + ".NS";
  const cfg = RANGE_CFG[rangeKey] || RANGE_CFG["6mo"];
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
  try {
    const out = await Promise.any(attempts);
    histCache[ck] = out;
    histLsSet(ck, out);
    return out;
  } catch (e) {
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
function renderExtras(d) { renderHeat(d); renderTax(d); renderPerf(d); renderInsights(d); renderNews(d); renderEvents(d); renderCorp(d); }

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
  el.innerHTML = lineChartSvg(vals, 190);
  if (meta) meta.innerHTML = "Portfolio value: " + inr(first) + " → <b>" + inr(last) + "</b> · <span class=\"" + (chg >= 0 ? "gain" : "loss") + "\">" + pct(chg) + "</span> over this period (at today's quantities, approximate).";
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
const RANGE_LABEL = { "1d5m": "Today · 5-minute candles", "5d15m": "5 days · 15-minute candles", "5d1h": "5 days · 1-hour candles", "7d15m": "1 week · 15-minute candles", "1mo": "1 month", "3mo": "3 months", "6mo": "6 months", "1y": "1 year", "5y": "5 years", "max": "All available history" };
function openStock(sym) {
  stockSym = sym; stockRange = "6mo";
  const row = enriched().rows.find(r => r.sym === sym);
  const metaStock = (window.STOCK_LIST || []).find(s => s[0] === sym);
  $("stockTitle").textContent = sym;
  $("stockName").textContent = row ? row.name : (metaStock ? metaStock[1] : "");
  document.querySelectorAll("#stockSeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.r === stockRange));
  $("stockModal").classList.remove("hidden");
  drawStock();
}
async function drawStock() {
  const sym = stockSym;
  const box = $("stockChart"), stats = $("stockStats"), meta = $("stockRangeMeta");
  if (!sym || !box) return;
  box.innerHTML = '<div class="skel" style="height:210px"></div>';
  stats.innerHTML = ""; meta.textContent = "";
  const h = await fetchHistory(sym, stockRange);
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
let insDiv = null, insMom = null, insRisk = null, insQual = null;
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
   v14 — company data, news, events, glossary
   Sources (all free, via the same public proxies as prices):
   - Yahoo quoteSummary: company profile, earnings calendar, results
   - Yahoo search / Google News RSS: headlines
   Everything degrades honestly when a source is unavailable.
   ================================================================ */
async function fetchViaProxies(url, asText) {
  const routes = [
    u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    u => "https://api.cors.lol/?url=" + encodeURIComponent(u),
    u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
  ];
  for (const mk of routes) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(mk(url), { signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const t = await r.text();
      if (!t) continue;
      if (asText) return t;
      try { return JSON.parse(t); } catch (e) { continue; }
    } catch (e) {}
  }
  return null;
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

/* ---------- company info (profile + earnings calendar + results) ---------- */
async function fetchCompanyInfo(sym) {
  const ck = "folio_ci_" + sym;
  const cached = lsCacheGet(ck, 6 * 3600 * 1000);
  if (cached) return cached;
  const url = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym + ".NS?modules=assetProfile,calendarEvents,incomeStatementHistoryQuarterly";
  const j = await fetchViaProxies(url, false);
  let out = { ok: false };
  try {
    const r = j.quoteSummary.result[0];
    out = { ok: true };
    if (r.assetProfile) {
      out.industry = r.assetProfile.industry || "";
      out.sectorY = r.assetProfile.sector || "";
      out.website = r.assetProfile.website || "";
      out.summary = (r.assetProfile.longBusinessSummary || "").slice(0, 700);
    }
    if (r.calendarEvents && r.calendarEvents.earnings) {
      const e = r.calendarEvents.earnings;
      const dates = (e.earningsDate || []).map(x => x.raw ? x.raw * 1000 : (x.fmt ? Date.parse(x.fmt) : null)).filter(Boolean);
      if (dates.length) {
        const upcoming = dates.filter(x => x > Date.now() - 86400000 * 2);
        out.nextEarnings = upcoming.length ? Math.min(...upcoming) : dates[0];
      }
      if (e.earningsAverageEstimate && typeof e.earningsAverageEstimate.raw === "number") out.epsEst = e.earningsAverageEstimate.raw;
    }
    if (r.incomeStatementHistoryQuarterly && r.incomeStatementHistoryQuarterly.incomeStatementHistory) {
      out.results = r.incomeStatementHistoryQuarterly.incomeStatementHistory.slice(0, 4).map(q => ({
        period: q.endDate ? (q.endDate.fmt || "") : "",
        revenue: q.totalRevenue ? q.totalRevenue.raw : null,
        profit: q.netIncome ? q.netIncome.raw : null
      })).filter(q => q.period);
    }
  } catch (e) {}
  if (out.ok) lsCacheSet(ck, out);
  return out;
}

/* ---------- news (Yahoo search, Google News RSS fallback) ---------- */
async function fetchNews(query, count) {
  const ck = "folio_news_" + query.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const cached = lsCacheGet(ck, 20 * 60 * 1000);
  if (cached) return cached;
  let items = [];
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
  box.innerHTML = merged.map(n => newsRowHtml(n, n.sym)).join("");
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
  box.innerHTML = html;
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
async function loadCompanySheet(sym) {
  const tok = ++sheetToken;
  const name = (STOCK_MAP[sym] && STOCK_MAP[sym].name) || sym;
  const wr = $("stockWatchRow"), ab = $("stockAbout"), rs = $("stockResults"), nw = $("stockNews"), lk = $("stockLinks");
  if (!ab) return;
  const inWatch = state.watch.some(w => w.sym === sym);
  const inPf = state.txns.some(t => t.sym === sym && t.type === "BUY");
  wr.innerHTML = inWatch
    ? '<span class="price-meta">★ This stock is in your watchlist.</span><button class="mini-btn danger" id="sheetUnwatch" type="button">Remove from Watchlist</button>'
    : '<button class="mini-btn" id="sheetWatch" type="button">☆ Add to Watchlist</button>' + (inPf ? '<span class="price-meta">This stock is in your portfolio.</span>' : '');
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
  const both = await Promise.all([fetchCompanyInfo(sym), fetchNews(name, 6)]);
  if (tok !== sheetToken) return;
  const info = both[0], items = both[1];
  if (info && info.ok && (info.summary || info.industry)) {
    ab.innerHTML =
      (info.industry ? '<p class="comp-line"><b>Industry:</b> ' + esc(info.industry) + (info.website ? ' · <a href="' + esc(info.website) + '" target="_blank" rel="noopener">Company website ↗</a>' : '') + '</p>' : '') +
      (info.summary ? '<p class="comp-about">' + esc(info.summary) + (info.summary.length >= 700 ? '…' : '') + '</p>' : '');
  } else {
    const sec = (window.INDUSTRY_MAP && window.INDUSTRY_MAP[sym]) || (window.FALLBACK_SECTOR && window.FALLBACK_SECTOR[sym]) || "";
    ab.innerHTML = '<p class="empty-note">' + (sec ? 'Sector: ' + esc(sec) + '. ' : '') + 'A detailed company profile is not available from the free source right now — use the Screener link below for the full profile.</p>';
  }
  let rhtml = "";
  if (info && info.ok && info.nextEarnings) {
    const days = Math.round((info.nextEarnings - Date.now()) / 86400000);
    rhtml += '<p class="comp-line"><b>Next quarterly result:</b> ' + fmtDate(info.nextEarnings) + (days >= 0 ? ' (in ' + days + ' days)' : '') + (typeof info.epsEst === "number" ? ' · Expected EPS ≈ ₹' + info.epsEst.toFixed(2) : '') + '</p>';
  }
  if (info && info.ok && info.results && info.results.length) {
    rhtml += '<table class="res-table"><tr><th>Quarter ended</th><th>Revenue</th><th>Net Profit</th></tr>' +
      info.results.map(q => '<tr><td>' + esc(q.period) + '</td><td>' + crores(q.revenue) + '</td><td>' + crores(q.profit) + '</td></tr>').join("") + '</table>';
  }
  rs.innerHTML = rhtml || '<p class="empty-note">Result dates and past results are not available from the free source for this stock right now.</p>';
  nw.innerHTML = items.length ? items.map(n => newsRowHtml(n, "")).join("") : '<p class="empty-note">No recent news found for this company.</p>';
  fillSheetCorp(sym, tok);
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
  ["results", "Results & Announcements", "Companies declare financial results every quarter. Folio watches the free earnings calendar and the news for your stocks: upcoming result dates appear on your Dashboard, and anything close pops up once a day when you open the app. If the free source carries no date for a stock, Folio says so instead of guessing."],
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
  const url = "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym + ".NS") + "?range=5y&interval=1mo&events=div,split";
  const j = await fetchViaProxies(url, false);
  const out = { divs: [], splits: [] };
  try {
    const ev = j.chart.result[0].events || {};
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
