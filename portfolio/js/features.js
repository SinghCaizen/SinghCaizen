"use strict";
/* ================================================================
   Folio — features:
   index ticker · stock charts · portfolio performance graph ·
   heatmap · tax harvesting · report issue · footer links
   ================================================================ */

const PROXIES = [
  u => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u),
  u => "https://api.cors.lol/?url=" + encodeURIComponent(u)
];
async function fetchT(url, ms) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms || 9000);
  try { return await fetch(url, { cache: "no-store", signal: ctl.signal }); }
  finally { clearTimeout(to); }
}

/* ---------- historical data (free, delayed, cached) ---------- */
const histCache = {};
const RANGE_CFG = {
  "1d":    { range: "1d",  interval: "1d" },
  "1d5m":  { range: "1d",  interval: "5m" },
  "5d15m": { range: "5d",  interval: "15m" },
  "5d1h":  { range: "5d",  interval: "60m" },
  "1mo":   { range: "1mo", interval: "1d" },
  "3mo":   { range: "3mo", interval: "1d" },
  "6mo":   { range: "6mo", interval: "1d" },
  "1y":    { range: "1y",  interval: "1d" },
  "5y":    { range: "5y",  interval: "1wk" }
};
async function fetchHistory(sym, rangeKey) {
  const ck = sym + "|" + rangeKey;
  if (ck in histCache) return histCache[ck];
  const s = (sym.indexOf(".") >= 0 || sym.charAt(0) === "^") ? sym : sym + ".NS";
  const cfg = RANGE_CFG[rangeKey] || RANGE_CFG["6mo"];
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    const url = "https://" + host + "/v8/finance/chart/" + encodeURIComponent(s) + "?range=" + cfg.range + "&interval=" + cfg.interval;
    for (const p of PROXIES) {
      try {
        const res = await fetchT(p(url));
        if (!res.ok) continue;
        const j = await res.json();
        const r0 = j && j.chart && j.chart.result && j.chart.result[0];
        if (!r0) continue;
        const tsArr = r0.timestamp || [];
        const closes = (r0.indicators && r0.indicators.quote && r0.indicators.quote[0] && r0.indicators.quote[0].close) || [];
        const points = [];
        for (let i = 0; i < tsArr.length; i++) if (typeof closes[i] === "number") points.push({ t: tsArr[i] * 1000, c: closes[i] });
        if (points.length) { const out = { points: points, meta: r0.meta || {} }; histCache[ck] = out; return out; }
      } catch (e) { /* next proxy */ }
    }
  }
  histCache[ck] = null;
  return null;
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
function renderExtras(d) { renderHeat(d); renderTax(d); renderPerf(d); renderInsights(d); }

let perfRange = "3mo", perfKey = "", perfToken = 0;
function closeAt(points, t) { let c = null; for (const p of points) { if (p.t <= t) c = p.c; else break; } return c; }
async function renderPerf(d) {
  const el = $("perfChart"), meta = $("perfMeta");
  if (!el) return;
  if (!d.rows.length) { el.innerHTML = '<p class="empty-note">Add stocks to see your portfolio graph.</p>'; if (meta) meta.textContent = ""; perfKey = ""; return; }
  const key = perfRange + "|" + d.rows.map(r => r.sym + ":" + r.qty + ":" + (r.ltp || 0)).join(",");
  if (key === perfKey) return;
  perfKey = key;
  const token = ++perfToken;
  el.innerHTML = '<p class="empty-note">Loading graph…</p>';
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
  el.innerHTML = lineChartSvg(vals, 190);
  const first = vals[0], last = vals[vals.length - 1];
  const chg = first ? (last - first) / first * 100 : 0;
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

function renderTax(d) {
  const el = $("taxBox");
  if (!el) return;
  const s = d.split || { stcgFY: 0, ltcgFY: 0 };
  const now = Date.now();
  const harvest = d.rows.filter(r => r.pnl < 0).map(r => {
    const oldest = (r.lots && r.lots.length) ? r.lots[0].date : r.firstDate;
    const days = oldest ? (now - new Date(oldest + "T00:00:00")) / 86400000 : 0;
    const isLong = days >= 365;
    return { sym: r.sym, loss: r.pnl, isLong: isLong, save: Math.abs(r.pnl) * (isLong ? 0.125 : 0.20) };
  }).sort((a, b) => a.loss - b.loss);
  const totalSave = harvest.reduce((a, h) => a + h.save, 0);
  el.innerHTML =
    '<div class="tax-grid">' +
    '<div><span>Booked STCG — this FY</span><b class="' + (s.stcgFY >= 0 ? "gain" : "loss") + '">' + inr(s.stcgFY) + '</b></div>' +
    '<div><span>Booked LTCG — this FY</span><b class="' + (s.ltcgFY >= 0 ? "gain" : "loss") + '">' + inr(s.ltcgFY) + '</b></div>' +
    '<div><span>Dividends received</span><b>' + inr(d.divTotal) + '</b></div>' +
    '</div>' +
    (harvest.length
      ? '<h3 class="tax-h">Harvesting — holdings sitting in loss right now</h3>' +
        harvest.map(h => '<div class="tax-row"><span><b>' + esc(h.sym) + '</b> · ' + (h.isLong ? "Long-term" : "Short-term") + ' loss</span><span class="loss">' + inr(h.loss) + '</span><span class="tax-save">setting this loss against gains may save ≈ ' + inr(h.save) + ' tax</span></div>').join("") +
        '<p class="price-meta">Total possible saving ≈ <b>' + inr(totalSave) + '</b>. Selling only for tax has its own risks — the stock can run up after you sell. Decide on the business first, tax second.</p>'
      : '<p class="empty-note">No holding is in loss right now — there is nothing to harvest.</p>') +
    '<p class="price-meta">Estimate only — not tax advice. Rates used: STCG 20%, LTCG 12.5% on equity. The ₹1.25 lakh per-year LTCG exemption and loss set-off / carry-forward rules are not fully applied. FY = April to March; long-term = held 365+ days, by your entry dates.</p>';
}

/* ---------- stock chart modal ---------- */
let stockSym = null, stockRange = "6mo";
const RANGE_LABEL = { "1d5m": "Today · 5-minute candles", "5d15m": "5 days · 15-minute candles", "5d1h": "5 days · 1-hour candles", "1mo": "1 month", "3mo": "3 months", "6mo": "6 months", "1y": "1 year", "5y": "5 years" };
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
  box.innerHTML = '<p class="empty-note">Loading chart…</p>';
  stats.innerHTML = ""; meta.textContent = "";
  const h = await fetchHistory(sym, stockRange);
  if (sym !== stockSym) return;
  const row = enriched().rows.find(r => r.sym === sym);
  const p = priceOf(sym);
  if (!h || h.points.length < 2) {
    delete histCache[sym + "|" + stockRange];
    box.innerHTML = '<p class="empty-note">Chart data could not load right now — the free data source is busy.</p><button type="button" class="btn btn-small" id="chartRetry">↻ Try Again</button>';
    const rb = $("chartRetry");
    if (rb) rb.addEventListener("click", drawStock);
  } else {
    box.innerHTML = lineChartSvg(h.points.map(x => x.c), 210);
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
let insDiv = null, insMom = null, insRisk = null;
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
  const parts = [insDiv, insMom, insRisk].filter(v => typeof v === "number");
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
    ["insDivScore", "insMomScore", "insRiskScore"].forEach(id => { $(id).textContent = "–"; $(id).className = ""; });
    const arc = $("insGaugeArc"); if (arc) arc.style.strokeDashoffset = "326.7";
    insKey = ""; insDiv = insMom = insRisk = null;
    return;
  }
  const unPct = d.invested ? d.totalPnl / d.invested * 100 : 0;
  const prevValue = d.value - d.dayPnl;
  const dayPct = prevValue ? d.dayPnl / prevValue * 100 : 0;
  const gainCls = v => v >= 0 ? "gain" : "loss";
  A.innerHTML =
    '<div class="assets-grid">' +
    '<div class="assets-col"><span>Latest Value</span><b class="assets-big">' + inr(d.value) + '</b>' +
    '<span>Investment Cost</span><b class="assets-big">' + inr(d.invested) + '</b></div>' +
    '<div class="assets-col"><h4>Unrealized Gain</h4><span>Overall Gain</span>' +
    '<b class="' + gainCls(d.totalPnl) + '">' + (d.totalPnl >= 0 ? "▲ " : "▼ ") + inr(Math.abs(d.totalPnl)) + ' (' + pct(unPct) + ')</b>' +
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
  if (rows[0] && wOf(rows[0]) > 25) warn += '<div class="warn-box"><b>Heavily Weighted!</b> Most of your money sits in one or more stocks — ' + esc(rows[0].sym) + ' alone is ' + wOf(rows[0]).toFixed(2) + '% of your portfolio.</div>';
  if (secs[0] && secs[0][1] > 40) warn += '<div class="warn-box"><b>Sector Struck!</b> One sector — ' + esc(secs[0][0]) + ' — carries ' + secs[0][1].toFixed(2) + '% of your money. A bad season for that sector hits the whole portfolio.</div>';
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
  if (insMom !== null) { $("insMomScore").textContent = insMom; $("insMomScore").className = insMom < 40 ? "loss" : ""; }
  if (insRisk !== null) { $("insRiskScore").textContent = insRisk; $("insRiskScore").className = insRisk < 40 ? "loss" : ""; }
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
