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
function renderExtras(d) { renderHeat(d); renderTax(d); renderPerf(d); }

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
