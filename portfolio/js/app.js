"use strict";
/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const inr2 = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pct = n => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); setTimeout(() => t.classList.add("hidden"), 2600); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ================= state ================= */
let state = emptyState();
let prices = {};           // SYM -> {price, prevClose, ts}
let currentUser = null;    // {email, name}
let fb = { auth: null, db: null, docRef: null, unsub: null };
const FIREBASE_ON = !!window.FIREBASE_READY;

function emptyState() { return { txns: [], watch: [], manualPrices: {}, profile: { name: "", phone: "", dp: "", totp: null, recovery: [] } }; }
function normalizeState(s) {
  const base = emptyState();
  if (!s || typeof s !== "object") return base;
  return {
    txns: Array.isArray(s.txns) ? s.txns : [],
    watch: Array.isArray(s.watch) ? s.watch : [],
    manualPrices: s.manualPrices || {},
    profile: Object.assign(base.profile, s.profile || {})
  };
}

/* ---------- local (demo) storage ---------- */
const LS_USERS = "pf_users_v1", LS_SESSION = "pf_session_v1";
function lsUsers() { try { return JSON.parse(localStorage.getItem(LS_USERS)) || {}; } catch (e) { return {}; } }
function lsSaveUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function localSave() {
  if (!currentUser) return;
  const u = lsUsers(); if (u[currentUser.email]) { u[currentUser.email].state = state; lsSaveUsers(u); }
}

/* ---------- firebase ---------- */
function initFirebase() {
  if (!FIREBASE_ON) return false;
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fb.auth = firebase.auth(); fb.db = firebase.firestore();
    return true;
  } catch (e) { console.warn("Firebase init failed", e); return false; }
}
let saveTimer = null;
function cloudSave() {
  if (FIREBASE_ON && fb.docRef) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fb.docRef.set({ state: state, updatedAt: Date.now() }).catch(e => console.warn("save failed", e));
    }, 400);
  } else { localSave(); }
}
function persist() { cloudSave(); }

/* ================= auth ================= */
let authMode = "login";
function setAuthMode(m) {
  authMode = m;
  $("tabLogin").classList.toggle("active", m === "login");
  $("tabSignup").classList.toggle("active", m === "signup");
  $("authSubmit").textContent = m === "login" ? "Login" : "Create Account";
  $("authName").closest("label").style.display = m === "signup" ? "block" : "none";
}
function authError(msg) { $("authError").textContent = msg || ""; }

async function doAuth(ev) {
  ev.preventDefault(); authError("");
  const email = $("authEmail").value.trim().toLowerCase();
  const pass = $("authPass").value;
  const name = $("authName").value.trim();
  if (!email || pass.length < 6) { authError("Email and a 6+ character password are needed."); return; }
  if (FIREBASE_ON) {
    try {
      if (authMode === "signup") {
        const cred = await fb.auth.createUserWithEmailAndPassword(email, pass);
        if (name) await cred.user.updateProfile({ displayName: name });
      } else {
        await fb.auth.signInWithEmailAndPassword(email, pass);
      }
    } catch (e) { authError(friendlyFbError(e)); }
  } else {
    const users = lsUsers();
    if (authMode === "signup") {
      if (users[email]) { authError("This email already has an account here. Please login."); return; }
      users[email] = { pass: pass, name: name, state: emptyState() }; lsSaveUsers(users);
    } else {
      if (!users[email]) { authError("No account with this email in this browser. Please sign up first."); return; }
      if (users[email].pass !== pass) { authError("Wrong password."); return; }
    }
    localStorage.setItem(LS_SESSION, email);
    enterApp({ email: email, name: users[email].name || "" }, users[email].state);
  }
}
function friendlyFbError(e) {
  const c = (e && e.code) || "";
  if (c.includes("wrong-password") || c.includes("invalid-credential")) return "Wrong email or password.";
  if (c.includes("user-not-found")) return "No account with this email. Please sign up first.";
  if (c.includes("email-already-in-use")) return "This email already has an account. Please login.";
  if (c.includes("weak-password")) return "Password is too weak — use 6+ characters.";
  if (c.includes("invalid-email")) return "That email does not look right.";
  return "Something went wrong. Please check your internet and try again.";
}
async function doLogout() {
  const em = currentUser ? currentUser.email : null;
  if (em) sessionStorage.removeItem("pf_gate_" + em);
  if (FIREBASE_ON) { try { await fb.auth.signOut(); } catch (e) {} }
  localStorage.removeItem(LS_SESSION);
  currentUser = null; state = emptyState(); prices = {};
  if (fb.unsub) { fb.unsub(); fb.unsub = null; }
  $("appView").classList.add("hidden"); $("gateView").classList.add("hidden"); $("authView").classList.remove("hidden");
}
async function doForgot(ev) {
  ev.preventDefault();
  const email = $("authEmail").value.trim().toLowerCase();
  if (!email) { authError("Type your email above first, then tap Forgot password."); return; }
  if (FIREBASE_ON) {
    try { await fb.auth.sendPasswordResetEmail(email); toast("Password reset email sent. Check your inbox."); }
    catch (e) { authError(friendlyFbError(e)); }
  } else { toast("In demo mode the password is the one saved in this browser."); }
}

function enterApp(user, initialState) {
  currentUser = user;
  state = normalizeState(initialState);
  buildDatalist();
  if (needsGate()) { showGate(); return; }
  showApp();
}
function needsGate() {
  const t = state.profile && state.profile.totp;
  return !!(t && t.enabled && currentUser && sessionStorage.getItem("pf_gate_" + currentUser.email) !== "1");
}
function showGate() {
  $("authView").classList.add("hidden"); $("appView").classList.add("hidden");
  $("gateView").classList.remove("hidden");
  $("gateError").textContent = ""; $("gateCode").value = ""; $("gatePass").value = "";
  $("gateAltForm").classList.add("hidden");
}
function showApp() {
  $("authView").classList.add("hidden"); $("gateView").classList.add("hidden"); $("appView").classList.remove("hidden");
  $("userEmail").textContent = currentUser.email;
  $("setEmail").textContent = currentUser.email;
  $("setMode").textContent = FIREBASE_ON ? "Cloud (Firebase) — saved online" : "Demo — this browser only";
  if (typeof renderProfile === "function") renderProfile(); renderAll(); refreshPrices();
  if (typeof loadTicker === "function") loadTicker();
}

/* ================= portfolio math ================= */
function resolveStock(input) {
  const raw = String(input || "").trim();
  const up = raw.toUpperCase();
  const hit = (window.STOCK_LIST || []).find(s => s[0] === up || s[1].toUpperCase() === up || raw.toLowerCase() === s[1].toLowerCase());
  if (hit) return { sym: hit[0], name: hit[1], sector: hit[2] || "Other" };
  const sym = up.replace(/\s+/g, "").replace(/[^A-Z0-9&\-\.]/g, "");
  return { sym: sym, name: raw, sector: "Other" };
}
function fyStartOf(dateStr) { const d = new Date(dateStr + "T00:00:00"); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; }
function computeHoldings() {
  const lots = {}; const order = []; const realised = {}; let divTotal = 0;
  const split = { stcg: 0, ltcg: 0, stcgFY: 0, ltcgFY: 0 };
  const curFY = fyStartOf(todayStr());
  const txns = [...state.txns].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  for (const t of txns) {
    if (t.type === "DIV") { divTotal += Number(t.price) || 0; continue; }
    if (!lots[t.sym]) { lots[t.sym] = []; order.push(t.sym); realised[t.sym] = 0; }
    if (t.type === "BUY") lots[t.sym].push({ qty: Number(t.qty), price: Number(t.price), date: t.date, name: t.name, sector: t.sector || "Other" });
    else if (t.type === "SELL") {
      let q = Number(t.qty);
      while (q > 0 && lots[t.sym].length) {
        const lot = lots[t.sym][0]; const take = Math.min(q, lot.qty);
        const gain = take * (Number(t.price) - lot.price);
        realised[t.sym] += gain;
        const days = (new Date(t.date + "T00:00:00") - new Date(lot.date + "T00:00:00")) / 86400000;
        const isLong = days >= 365;
        if (isLong) { split.ltcg += gain; if (fyStartOf(t.date) === curFY) split.ltcgFY += gain; }
        else { split.stcg += gain; if (fyStartOf(t.date) === curFY) split.stcgFY += gain; }
        lot.qty -= take; q -= take; if (lot.qty <= 0) lots[t.sym].shift();
      }
    }
  }
  const out = [];
  for (const sym of order) {
    const ls = lots[sym]; if (!ls || !ls.length) continue;
    const qty = ls.reduce((s, l) => s + l.qty, 0);
    const cost = ls.reduce((s, l) => s + l.qty * l.price, 0);
    out.push({ sym: sym, name: ls[0].name || sym, sector: ls[0].sector || "Other", qty: qty, avg: cost / qty, invested: cost, realised: realised[sym] || 0, lots: ls.map(l => ({ qty: l.qty, price: l.price, date: l.date })), firstDate: ls[0].date });
  }
  return { holdings: out, realisedTotal: Object.values(realised).reduce((a, b) => a + b, 0), divTotal: divTotal, split: split };
}
function xirr(cashflows) {
  if (!cashflows.length) return null;
  const t0 = cashflows[0].date.getTime();
  const npv = r => cashflows.reduce((s, cf) => s + cf.amount / Math.pow(1 + r, (cf.date.getTime() - t0) / 31557600000), 0);
  let lo = -0.9999, hi = 10, flo = npv(lo);
  if (isNaN(flo)) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (Math.abs(fm) < 0.01) return mid;
    if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}
function portfolioXirr(currentValue) {
  const cfs = [];
  for (const t of state.txns) {
    const d = new Date(t.date + "T00:00:00");
    if (t.type === "BUY") cfs.push({ date: d, amount: -Number(t.qty) * Number(t.price) });
    else if (t.type === "SELL") cfs.push({ date: d, amount: Number(t.qty) * Number(t.price) });
    else if (t.type === "DIV") cfs.push({ date: d, amount: Number(t.price) || 0 });
  }
  if (!cfs.length || currentValue <= 0) return null;
  cfs.sort((a, b) => a.date - b.date);
  cfs.push({ date: new Date(), amount: currentValue });
  return xirr(cfs);
}

/* ================= prices (free, delayed) ================= */
function yahooUrl(sym) {
  const s = sym.indexOf(".") >= 0 ? sym : sym + ".NS";
  return "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(s) + "?range=1mo&interval=1d";
}
async function fetchOne(sym) {
  const manual = state.manualPrices && state.manualPrices[sym];
  const url = yahooUrl(sym);
  const proxies = [
    u => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
  ];
  for (const p of proxies) {
    try {
      const res = await fetch(p(url), { cache: "no-store" });
      if (!res.ok) continue;
      const j = await res.json();
      const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        let spark = [];
        try { const q = j.chart.result[0].indicators.quote[0].close || []; spark = q.filter(v => typeof v === "number"); } catch (e) {}
        const prev = spark.length > 1 ? spark[spark.length - 2] : (meta.chartPreviousClose || meta.regularMarketPrice);
        return { price: meta.regularMarketPrice, prevClose: prev, ts: Date.now(), manual: false, spark: spark };
      }
    } catch (e) { /* try next proxy */ }
  }
  if (manual) return { price: Number(manual), prevClose: Number(manual), ts: Date.now(), manual: true, spark: [] };
  return null;
}
let refreshing = false;
async function refreshPrices() {
  if (refreshing || !currentUser) return;
  const syms = new Set();
  computeHoldings().holdings.forEach(h => syms.add(h.sym));
  state.watch.forEach(w => syms.add(w.sym));
  if (!syms.size) { renderAll(); return; }
  refreshing = true;
  $("priceMeta").textContent = "Fetching prices…";
  const list = [...syms];
  for (let i = 0; i < list.length; i += 4) {
    const batch = list.slice(i, i + 4);
    const res = await Promise.all(batch.map(fetchOne));
    res.forEach((r, k) => { if (r) prices[batch[k]] = r; });
    renderAll();
  }
  refreshing = false;
  const any = Object.keys(prices).length;
  $("priceMeta").textContent = any ? "Prices updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · free data, ~15 min delay" : "Prices could not load right now — check internet, or set a price manually from a holding's ⋯ menu.";
  renderAll();
}
function priceOf(sym) { return prices[sym] || null; }

/* ================= rendering ================= */
const PIE = ["#f2f2f2", "#bdbdbd", "#8a8a8a", "#5c5c5c", "#e03131", "#3d3d3d", "#d6d6d6", "#757575", "#a8a8a8", "#2b2b2b"];
function renderAll() { renderDashboard(); renderHoldings(); renderWatch(); renderHistory(); }
function enriched() {
  const { holdings, realisedTotal, divTotal, split } = computeHoldings();
  let invested = 0, value = 0, dayPnl = 0;
  const rows = holdings.map((h, i) => {
    const p = priceOf(h.sym);
    const cur = p ? h.qty * p.price : h.invested;
    const pnl = cur - h.invested;
    const day = p ? h.qty * (p.price - p.prevClose) : 0;
    invested += h.invested; value += cur; dayPnl += day;
    return { ...h, ltp: p ? p.price : null, prevClose: p ? p.prevClose : null, spark: p ? p.spark : null, cur: cur, pnl: pnl, pnlPct: h.invested ? pnl / h.invested * 100 : 0, day: day, color: PIE[i % PIE.length], manual: p ? p.manual : false };
  });
  return { rows: rows, invested: invested, value: value, totalPnl: value - invested, dayPnl: dayPnl, realisedTotal: realisedTotal, divTotal: divTotal, split: split };
}
/* ---- v2 helpers: animated numbers + sparklines ---- */
let dashAnimated = false;
function animNum(el, val, fmt) {
  if (!el) return;
  if (dashAnimated || !isFinite(val)) { el.textContent = fmt(val); return; }
  const start = performance.now(), dur = 850;
  const step = now => { const k = Math.min(1, (now - start) / dur); el.textContent = fmt(val * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function sparkSvg(closes) {
  if (!closes || closes.length < 2) return "";
  const min = Math.min(...closes), max = Math.max(...closes), rng = (max - min) || 1;
  const W = 100, H = 30, P = 2;
  const pts = closes.map((v, i) => (P + i * (W - 2 * P) / (closes.length - 1)).toFixed(1) + "," + (H - P - (v - min) / rng * (H - 2 * P)).toFixed(1)).join(" ");
  const up = closes[closes.length - 1] >= closes[0];
  const col = up ? "var(--gain)" : "var(--loss)";
  const last = pts.split(" ").pop().split(",");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6"/><circle cx="${last[0]}" cy="${last[1]}" r="2.2" fill="${col}"/></svg>`;
}

function renderDashboard() {
  const d = enriched();
  if (d.rows.length) {
    animNum($("stInvested"), d.invested, inr);
    animNum($("stValue"), d.value, inr);
    animNum($("stPnl"), d.totalPnl, inr);
    $("stPnl").className = "stat-value " + (d.totalPnl >= 0 ? "gain" : "loss");
    $("stPnlPct").textContent = pct(d.invested ? d.totalPnl / d.invested * 100 : 0) + " overall · today " + inr(d.dayPnl);
    $("stPnlPct").className = "stat-sub " + (d.dayPnl >= 0 ? "gain" : "loss");
  } else { $("stInvested").textContent = "—"; $("stValue").textContent = "—"; $("stPnl").textContent = "—"; $("stPnlPct").textContent = ""; }
  const x = d.rows.length ? portfolioXirr(d.value) : null;
  $("stXirr").textContent = x === null ? "—" : pct(x * 100).replace("+", x >= 0 ? "+" : "");
  $("stRealised").textContent = d.rows.length ? "Booked profit so far: " + inr(d.realisedTotal) + (d.divTotal ? " · Dividends: " + inr(d.divTotal) : "") : "";
  $("dashEmpty").classList.toggle("hidden", d.rows.length > 0);
  if (d.rows.length) dashAnimated = true;
  // donut (hover any slice or name to inspect)
  const svg = $("donut"); const legend = $("donutLegend");
  if (!d.rows.length || d.value <= 0) { svg.innerHTML = ""; legend.innerHTML = ""; $("sectorBars").innerHTML = ""; $("pnlBars").innerHTML = ""; }
  else {
    let a0 = -Math.PI / 2, parts = "";
    const cx = 100, cy = 100, r = 82, r2 = 48;
    for (const r_ of d.rows) {
      const frac = r_.cur / d.value; if (frac <= 0) continue;
      const a1 = a0 + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const xi1 = cx + r2 * Math.cos(a1), yi1 = cy + r2 * Math.sin(a1), xi0 = cx + r2 * Math.cos(a0), yi0 = cy + r2 * Math.sin(a0);
      parts += `<path class="seg" data-sym="${esc(r_.sym)}" d="M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r2},${r2} 0 ${large} 0 ${xi0},${yi0} Z" fill="${r_.color}" stroke="var(--panel)" stroke-width="1.5"/>`;
      a0 = a1;
    }
    svg.innerHTML = parts + `<text id="donutTop" x="100" y="95" text-anchor="middle" fill="var(--muted)" font-size="10.5" letter-spacing="1.5">TOTAL VALUE</text><text id="donutMain" x="100" y="115" text-anchor="middle" fill="var(--text)" font-size="14.5" font-weight="bold">${esc(inr(d.value))}</text>`;
    legend.innerHTML = d.rows.map(r_ => `<div class="legend-item" data-sym="${esc(r_.sym)}"><span class="sw" style="background:${r_.color}"></span>${esc(r_.sym)} — ${(r_.cur / d.value * 100).toFixed(1)}%</div>`).join("");
    const setCenter = sym => {
      const top = $("donutTop"), main = $("donutMain"); if (!top || !main) return;
      const row = sym ? d.rows.find(r_ => r_.sym === sym) : null;
      top.textContent = row ? row.sym : "TOTAL VALUE";
      main.textContent = row ? (row.cur / d.value * 100).toFixed(1) + "% · " + inr(row.cur) : inr(d.value);
      svg.querySelectorAll(".seg").forEach(p => p.style.opacity = (!sym || p.dataset.sym === sym) ? "1" : "0.3");
    };
    svg.querySelectorAll(".seg").forEach(p => { p.addEventListener("mouseenter", () => setCenter(p.dataset.sym)); p.addEventListener("mouseleave", () => setCenter(null)); });
    legend.querySelectorAll(".legend-item").forEach(el2 => { el2.addEventListener("mouseenter", () => setCenter(el2.dataset.sym)); el2.addEventListener("mouseleave", () => setCenter(null)); });
    // sector bars
    const secMap = {};
    d.rows.forEach(r_ => { const s = r_.sector || "Other"; secMap[s] = (secMap[s] || 0) + r_.cur; });
    const secs = Object.entries(secMap).sort((a, b) => b[1] - a[1]);
    $("sectorBars").innerHTML = secs.map((sv, i) => `<div class="bar-row"><span class="bar-name">${esc(sv[0])}</span><div class="bar-track"><div class="bar-fill" style="width:${(sv[1] / d.value * 100).toFixed(1)}%;background:${PIE[i % PIE.length]}"></div></div><span class="bar-val">${inr(sv[1])} · ${(sv[1] / d.value * 100).toFixed(1)}%</span></div>`).join("");
    // profit/loss bars (zero in the middle)
    const maxAbs = Math.max(...d.rows.map(r_ => Math.abs(r_.pnl)), 1);
    $("pnlBars").innerHTML = [...d.rows].sort((a, b) => b.pnl - a.pnl).map(r_ => {
      const w = (Math.abs(r_.pnl) / maxAbs * 50).toFixed(1);
      const fill = r_.pnl >= 0 ? `<div class="pnl-fill gain-fill" style="left:50%;width:${w}%"></div>` : `<div class="pnl-fill loss-fill" style="right:50%;width:${w}%"></div>`;
      return `<div class="pnl-row"><span class="bar-name">${esc(r_.sym)}</span><div class="pnl-track">${fill}<span class="pnl-zero"></span></div><span class="bar-val ${r_.pnl >= 0 ? "gain" : "loss"}">${inr(r_.pnl)}</span></div>`;
    }).join("");
  }
  const sorted = [...d.rows].filter(r_ => r_.ltp !== null);
  const gainers = [...sorted].sort((a, b) => b.pnlPct - a.pnlPct).filter(r_ => r_.pnlPct > 0).slice(0, 3);
  const losers = [...sorted].sort((a, b) => a.pnlPct - b.pnlPct).filter(r_ => r_.pnlPct < 0).slice(0, 3);
  $("topGainers").innerHTML = gainers.length ? gainers.map(r_ => `<li><span>${esc(r_.sym)}</span><b class="gain">${pct(r_.pnlPct)}</b></li>`).join("") : "<li><span>—</span></li>";
  $("topLosers").innerHTML = losers.length ? losers.map(r_ => `<li><span>${esc(r_.sym)}</span><b class="loss">${pct(r_.pnlPct)}</b></li>`).join("") : "<li><span>—</span></li>";
  if (typeof renderExtras === "function") renderExtras(d);
}
function renderHoldings() {
  const d = enriched();
  const el = $("holdingsList");
  $("holdEmpty").classList.toggle("hidden", d.rows.length > 0);
  el.innerHTML = d.rows.map((h, i) => `
    <div class="hold-card" style="animation-delay:${i * 60}ms">
      <div class="hold-top"><div><span class="hold-sym">${esc(h.sym)}</span><span class="hold-name">${esc(h.name)}</span><span class="sector-chip">${esc(h.sector || "Other")}</span></div>
      <div class="hold-pnl ${h.pnl >= 0 ? "gain" : "loss"}">${inr(h.pnl)} (${pct(h.pnlPct)})</div></div>
      ${h.spark && h.spark.length > 1 ? `<div class="spark-wrap">${sparkSvg(h.spark)}<span class="spark-cap">last 1 month</span></div>` : ""}
      <div class="hold-grid">
        <div><span>Qty</span>${h.qty}</div>
        <div><span>Avg Buy</span>${inr2(h.avg)}</div>
        <div><span>Price Now${h.manual ? " (manual)" : ""}</span>${h.ltp !== null ? inr2(h.ltp) : "—"}</div>
        <div><span>Today</span>${h.ltp !== null && h.prevClose ? `<b class="${h.day >= 0 ? "gain" : "loss"}">${inr(h.day)} (${pct((h.ltp - h.prevClose) / h.prevClose * 100)})</b>` : "—"}</div>
        <div><span>Invested</span>${inr(h.invested)}</div>
        <div><span>Value Now</span>${inr(h.cur)}</div>
        <div><span>First Bought</span>${esc(h.firstDate || "—")}</div>
        <div><span>Booked P&amp;L</span><b class="${h.realised >= 0 ? "gain" : "loss"}">${inr(h.realised)}</b></div>
      </div>
      <div class="hold-actions">
        <button class="mini-btn" data-act="chart" data-sym="${esc(h.sym)}">📈 Chart</button>
        <button class="mini-btn" data-act="buy" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">+ Buy More</button>
        <button class="mini-btn" data-act="sell" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">Sell</button>
        <button class="mini-btn" data-act="div" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">Dividend</button>
        <button class="mini-btn" data-act="price" data-sym="${esc(h.sym)}">Set Price</button>
        <button class="mini-btn danger" data-act="del" data-sym="${esc(h.sym)}">Remove All</button>
      </div>
    </div>`).join("");
  el.querySelectorAll("button[data-act]").forEach(b => b.addEventListener("click", () => holdingAction(b.dataset)));
}
function holdingAction(ds) {
  if (ds.act === "chart") { if (typeof openStock === "function") openStock(ds.sym); return; }
  if (ds.act === "del") {
    if (!confirm("Remove ALL entries of " + ds.sym + " (buys, sells, dividends)? This cannot be undone.")) return;
    state.txns = state.txns.filter(t => t.sym !== ds.sym); persist(); renderAll(); toast(ds.sym + " removed");
    return;
  }
  if (ds.act === "price") {
    const cur = state.manualPrices[ds.sym] || "";
    const v = prompt("Set current price for " + ds.sym + " (₹). Leave empty to use auto price.", cur);
    if (v === null) return;
    if (v.trim() === "") delete state.manualPrices[ds.sym]; else state.manualPrices[ds.sym] = Number(v) || 0;
    persist(); refreshPrices(); return;
  }
  openTxn(ds.act === "buy" ? "BUY" : ds.act === "sell" ? "SELL" : "DIV", ds.sym, ds.name);
}
function renderWatch() {
  const el = $("watchListEl");
  const rows = [...state.watch].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  $("watchEmpty").classList.toggle("hidden", rows.length > 0);
  el.innerHTML = rows.map(w => {
    const p = priceOf(w.sym);
    const chg = p && p.prevClose ? (p.price - p.prevClose) / p.prevClose * 100 : null;
    return `<div class="watch-row">
      <div><button class="star-btn ${w.fav ? "fav" : ""}" data-star="${esc(w.sym)}">${w.fav ? "★" : "☆"}</button>
      <span class="w-sym">${esc(w.sym)}</span> <span class="hold-name">${esc(w.name)}</span></div>
      <div>${p ? inr2(p.price) : "—"} ${chg !== null ? `<b class="${chg >= 0 ? "gain" : "loss"}">${pct(chg)}</b>` : ""}
      <button class="mini-btn danger" data-unwatch="${esc(w.sym)}">Remove</button></div></div>`;
  }).join("");
  el.querySelectorAll("[data-star]").forEach(b => b.addEventListener("click", () => {
    const w = state.watch.find(x => x.sym === b.dataset.star); if (w) { w.fav = !w.fav; persist(); renderWatch(); }
  }));
  el.querySelectorAll("[data-unwatch]").forEach(b => b.addEventListener("click", () => {
    state.watch = state.watch.filter(x => x.sym !== b.dataset.unwatch); persist(); renderWatch();
  }));
}
function renderHistory() {
  const el = $("historyList");
  const rows = [...state.txns].sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : 0);
  $("histEmpty").classList.toggle("hidden", rows.length > 0);
  el.innerHTML = rows.map(t => `<div class="hist-row">
    <div><span class="hist-type ${t.type}">${t.type}</span> <b>${esc(t.sym)}</b> <span class="hold-name">${esc(t.name || "")}</span></div>
    <div>${t.type === "DIV" ? inr(t.price) + " received" : t.qty + " × " + inr2(t.price)} · ${esc(t.date)}
    <button class="mini-btn danger" data-deltxn="${t.id}">Delete</button></div></div>`).join("");
  el.querySelectorAll("[data-deltxn]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("Delete this entry?")) return;
    state.txns = state.txns.filter(t => t.id !== b.dataset.deltxn); persist(); renderAll(); toast("Entry deleted");
  }));
}

/* ================= txn modal ================= */
function openTxn(type, sym, name) {
  $("txnType").value = type;
  document.querySelectorAll("#txnSeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.t === type));
  $("txnTitle").textContent = type === "BUY" ? "Add / Buy Stock" : type === "SELL" ? "Sell Stock" : "Add Dividend";
  $("txnStock").value = sym ? (name && name !== sym ? name : sym) : "";
  $("txnQty").value = ""; $("txnPrice").value = "";
  $("txnDate").value = todayStr();
  $("txnError").textContent = "";
  syncTxnLabels(); $("txnModal").classList.remove("hidden");
}
function syncTxnLabels() {
  const t = $("txnType").value;
  $("txnQty").closest("label").style.display = t === "DIV" ? "none" : "block";
  $("txnPriceLabel").firstChild.textContent = t === "BUY" ? "Buy price (per share ₹) " : t === "SELL" ? "Sell price (per share ₹) " : "Total dividend received (₹) ";
}
function closeTxn() { $("txnModal").classList.add("hidden"); }
function saveTxn(ev) {
  ev.preventDefault();
  const type = $("txnType").value;
  const st = resolveStock($("txnStock").value);
  if (!st.sym) { $("txnError").textContent = "Please enter a stock name or symbol."; return; }
  const qty = type === "DIV" ? 0 : Number($("txnQty").value);
  const price = Number($("txnPrice").value);
  const date = $("txnDate").value;
  if (type !== "DIV" && !(qty > 0)) { $("txnError").textContent = "Quantity must be more than 0."; return; }
  if (!(price >= 0) || !date) { $("txnError").textContent = "Please fill price and date."; return; }
  if (type === "SELL") {
    const h = computeHoldings().holdings.find(x => x.sym === st.sym);
    if (!h || qty > h.qty) { $("txnError").textContent = "You hold only " + (h ? h.qty : 0) + " shares of " + st.sym + "."; return; }
  }
  state.txns.push({ id: uid(), type: type, sym: st.sym, name: st.name, sector: st.sector, qty: qty, price: price, date: date });
  persist(); closeTxn(); renderAll(); refreshPrices();
  toast(type === "BUY" ? "Added " + st.sym : type === "SELL" ? "Sold " + st.sym : "Dividend saved");
}

/* ================= watch / settings ================= */
function addWatch(ev) {
  ev.preventDefault();
  const st = resolveStock($("watchInput").value);
  if (!st.sym) return;
  if (state.watch.some(w => w.sym === st.sym)) { toast(st.sym + " is already in your watchlist"); return; }
  state.watch.push({ sym: st.sym, name: st.name, fav: false });
  $("watchInput").value = ""; persist(); renderWatch(); refreshPrices();
}
function exportCsv() {
  const lines = ["Date,Type,Symbol,Name,Qty,Price"];
  [...state.txns].sort((a, b) => a.date < b.date ? -1 : 1).forEach(t =>
    lines.push([t.date, t.type, t.sym, '"' + String(t.name || "").replace(/"/g, '""') + '"', t.qty, t.price].join(",")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "my-portfolio.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast("CSV downloaded — keep it safe, it is your backup.");
}
function importCsv(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const rows = String(rd.result).split(/\r?\n/).slice(1).filter(r => r.trim());
      let n = 0;
      for (const r of rows) {
        const c = r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.replace(/^"|"$/g, "").trim());
        if (c.length < 6) continue;
        const type = c[1].toUpperCase(); if (!["BUY", "SELL", "DIV"].includes(type)) continue;
        const hit = (window.STOCK_LIST || []).find(s => s[0] === c[2].toUpperCase());
        state.txns.push({ id: uid(), date: c[0], type: type, sym: c[2].toUpperCase(), name: c[3], sector: hit ? (hit[2] || "Other") : "Other", qty: Number(c[4]) || 0, price: Number(c[5]) || 0 });
        n++;
      }
      persist(); renderAll(); refreshPrices(); toast("Imported " + n + " entries.");
    } catch (e) { toast("That CSV could not be read."); }
  };
  rd.readAsText(file);
}

/* ================= misc ui ================= */
function buildDatalist() {
  const dl = $("stockList");
  const seen = new Set(); let html = "";
  for (const s of (window.STOCK_LIST || [])) {
    if (seen.has(s[0])) continue; seen.add(s[0]);
    html += `<option value="${esc(s[1])}">${esc(s[0])}</option>`;
  }
  dl.innerHTML = html;
}
function switchView(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $("view-" + name).classList.remove("hidden");
}

/* ================= wiring ================= */
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("pf_theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  $("demoBanner").classList.toggle("hidden", FIREBASE_ON);
  setAuthMode("login");
  $("tabLogin").addEventListener("click", () => setAuthMode("login"));
  $("tabSignup").addEventListener("click", () => setAuthMode("signup"));
  $("authForm").addEventListener("submit", doAuth);
  $("forgotLink").addEventListener("click", doForgot);
  $("logoutBtn").addEventListener("click", doLogout);
  $("themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur); localStorage.setItem("pf_theme", cur);
  });
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchView(t.dataset.view)));
  $("refreshBtn").addEventListener("click", refreshPrices);
  $("addStockBtn").addEventListener("click", () => openTxn("BUY", "", ""));
  $("txnClose").addEventListener("click", closeTxn);
  $("txnModal").addEventListener("click", e => { if (e.target === $("txnModal")) closeTxn(); });
  document.querySelectorAll("#txnSeg .seg-btn").forEach(b => b.addEventListener("click", () => {
    $("txnType").value = b.dataset.t;
    document.querySelectorAll("#txnSeg .seg-btn").forEach(x => x.classList.toggle("active", x === b));
    syncTxnLabels();
  }));
  $("txnForm").addEventListener("submit", saveTxn);
  $("watchForm").addEventListener("submit", addWatch);
  $("exportBtn").addEventListener("click", exportCsv);
  $("importFile").addEventListener("change", e => { if (e.target.files[0]) importCsv(e.target.files[0]); e.target.value = ""; });
  $("wipeBtn").addEventListener("click", () => {
    if (!confirm("Delete ALL your entries? Take a CSV export first if unsure.")) return;
    state = emptyState(); persist(); renderAll(); toast("All entries deleted");
  });
  $("resetPassBtn").addEventListener("click", async () => {
    if (FIREBASE_ON && currentUser) {
      try { await fb.auth.sendPasswordResetEmail(currentUser.email); toast("Reset email sent to " + currentUser.email); }
      catch (e) { toast("Could not send reset email right now."); }
    } else toast("In demo mode, your password is saved in this browser only.");
  });

  const fbOn = initFirebase();
  if (fbOn) {
    fb.auth.onAuthStateChanged(user => {
      if (user) {
        fb.docRef = fb.db.collection("users").doc(user.uid);
        if (fb.unsub) fb.unsub();
        fb.unsub = fb.docRef.onSnapshot(doc => {
          const data = doc.exists ? doc.data() : null;
          enterApp({ email: user.email, name: user.displayName || "" }, data && data.state ? data.state : emptyState());
        }, err => console.warn("snapshot error", err));
      } else {
        $("appView").classList.add("hidden"); $("authView").classList.remove("hidden");
      }
    });
  } else {
    const sess = localStorage.getItem(LS_SESSION);
    if (sess && lsUsers()[sess]) enterApp({ email: sess, name: lsUsers()[sess].name || "" }, lsUsers()[sess].state);
  }
});
