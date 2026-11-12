"use strict";
/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const inr = n => Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—";
const inr2 = n => Number.isFinite(n) ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
const pct = n => Number.isFinite(n) ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—";
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
/* Exchange renames: the old symbol is dead (no data anywhere) and the new
   one is its legal heir (same ISIN). Stored entries heal automatically. */
const SYMBOL_RENAMES = { "TATAMOTORS": "TMPV" };
function normalizeState(s) {
  const base = emptyState();
  if (!s || typeof s !== "object") return base;
  const out = {
    txns: Array.isArray(s.txns) ? s.txns : [],
    watch: Array.isArray(s.watch) ? s.watch : [],
    manualPrices: s.manualPrices || {},
    profile: Object.assign(base.profile, s.profile || {})
  };
  /* self-heal: a symbol typed free-hand that is not a real NSE symbol (e.g. TATACAPITAL)
     is re-resolved from its stored name to the real symbol (TATACAP) so prices/charts work */
  try {
    const known = new Set((window.STOCK_LIST || []).map(x => x[0]));
    let fixed = false;
    const renamePass = t => {
      if (!t || !t.sym || !SYMBOL_RENAMES[t.sym]) return;
      const target = SYMBOL_RENAMES[t.sym];
      const entry = (window.STOCK_LIST || []).find(x => x[0] === target);
      t.sym = target;
      if (entry) { t.name = entry[1]; t.sector = entry[2] || t.sector; }
      fixed = true;
    };
    out.txns.forEach(renamePass);
    out.watch.forEach(renamePass);
    const repair = t => {
      if (!t || !t.sym || known.has(t.sym)) return;
      const st = resolveStock(t.name || t.sym);
      if (st && st.sym !== t.sym && known.has(st.sym)) { t.sym = st.sym; t.name = st.name; if (!t.sector || t.sector === "Other") t.sector = st.sector; fixed = true; }
    };
    out.txns.forEach(repair);
    out.watch.forEach(repair);
    if (fixed) window.__symRepaired = true;
  } catch (e) { /* repair is best-effort */ }
  return out;
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
  if (c.includes("popup-closed")) return "The Google window closed before finishing. Please try again.";
  if (c.includes("unauthorized-domain")) return "This website's domain is not allowed in Firebase yet (Settings → Authorized domains).";
  if (c.includes("operation-not-allowed")) return "This sign-in method is not enabled in Firebase yet.";
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
async function doGoogleSignIn() {
  authError("");
  if (!FIREBASE_ON) { authError("Google login starts once the Firebase config is added — it is on its way. Till then, please use email and password."); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  try { await fb.auth.signInWithPopup(provider); }
  catch (e) {
    if (e && e.code && e.code.includes("popup-blocked")) {
      try { await fb.auth.signInWithRedirect(provider); return; } catch (e2) { authError(friendlyFbError(e2)); return; }
    }
    authError(friendlyFbError(e));
  }
}

function enterApp(user, initialState) {
  currentUser = user;
  state = normalizeState(initialState);
  if (window.__symRepaired) { window.__symRepaired = false; try { persist(); } catch (e) {} }
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
  $("setEmail").textContent = currentUser.email;
  $("setMode").textContent = FIREBASE_ON ? "Cloud (Firebase) — saved online" : "Demo — this browser only";
  loadPricesLS();
  if (typeof renderProfile === "function") renderProfile(); renderAll(); refreshPrices();
  if (typeof loadTicker === "function") loadTicker();
  if (state.profile && !state.profile.termsSeen) $("termsModal").classList.remove("hidden");
}

/* ================= portfolio math ================= */
function resolveStock(input) {
  const raw = String(input || "").trim();
  const up = raw.toUpperCase();
  const list = window.STOCK_LIST || [];
  if (SYMBOL_RENAMES[up]) {
    const heir = list.find(x => x[0] === SYMBOL_RENAMES[up]);
    if (heir) return { sym: heir[0], name: heir[1], sector: heir[2] || "Other" };
  }
  const hit = list.find(s => s[0] === up || s[1].toUpperCase() === up || raw.toLowerCase() === s[1].toLowerCase());
  if (hit) return { sym: hit[0], name: hit[1], sector: hit[2] || "Other" };
  const xhit = (window.__nseExtra || []).find(s => s[0] === up || s[1].toUpperCase() === up);
  if (xhit) return { sym: xhit[0], name: xhit[1], sector: xhit[2] || "Other" };
  const strip = s => s.toLowerCase().replace(/\s+(limited|ltd\.?)$/g, "").trim();
  const clean = strip(raw);
  if (clean.length >= 3) {
    const byName = list.filter(s => strip(s[1]) === clean);
    if (byName.length === 1) return { sym: byName[0][0], name: byName[0][1], sector: byName[0][2] || "Other" };
    const byPrefix = list.filter(s => s[1].toLowerCase().indexOf(clean) === 0 || s[0].toLowerCase().indexOf(raw.toLowerCase()) === 0);
    if (byPrefix.length === 1) return { sym: byPrefix[0][0], name: byPrefix[0][1], sector: byPrefix[0][2] || "Other" };
  }
  const sym = up.replace(/\s+/g, "").replace(/[^A-Z0-9&\-\.]/g, "");
  return { sym: sym, name: raw, sector: "Other" };
}

/* Custom suggestion dropdown: appears only while typing (2+ letters), filtered, Indian stocks only */
function attachSuggest(input) {
  if (!input || input.dataset.sug) return;
  input.dataset.sug = "1";
  const wrap = document.createElement("span");
  wrap.className = "sug-wrap";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const box = document.createElement("div");
  box.className = "suggest-box hidden";
  wrap.appendChild(box);
  let items = [], active = -1, remoteItems = [], remoteFor = "", sugTimer = null;
  function close() { box.classList.add("hidden"); active = -1; }
  function pick(i) {
    if (!items[i]) return;
    input.value = items[i][4] ? items[i][0] : items[i][1];
    close();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }
  function render() {
    const txt = input.value.trim().toLowerCase();
    if (txt.length < 2) { close(); return; }
    const list = (window.STOCK_LIST || []).concat(window.__nseExtra || []);
    const starts = [], contains = [];
    for (const s of list) {
      const nm = s[1].toLowerCase(), sy = s[0].toLowerCase();
      if (sy.indexOf(txt) === 0 || nm.indexOf(txt) === 0) { starts.push(s); if (starts.length >= 8) break; }
      else if (contains.length < 8 && (nm.indexOf(txt) >= 0 || sy.indexOf(txt) >= 0)) contains.push(s);
    }
    const local = starts.concat(contains);
    if (window.__yahooSuggest && remoteFor !== txt) {
      remoteFor = txt;
      clearTimeout(sugTimer);
      sugTimer = setTimeout(async () => {
        const res = await window.__yahooSuggest(txt);
        if (input.value.trim().toLowerCase() === txt) { remoteItems = res || []; render(); }
      }, 220);
    }
    if (remoteFor !== txt) remoteItems = [];
    items = local.concat(remoteItems.filter(r => !local.some(l => l[0] === r[0]))).slice(0, 8);
    const typed = input.value.trim();
    box.innerHTML = items.map((s, i) => '<button type="button" class="suggest-item" data-i="' + i + '"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span><span class="sug-price" data-sugp="' + esc(s[0]) + '">' + (prices[s[0]] ? inr2(prices[s[0]].price) : '') + '</span>' + (s[3] ? '<span class="sug-exch">' + esc(s[3]) + '</span>' : '') + '</button>').join("") +
      '<button type="button" class="suggest-item sug-custom" data-custom="1">➕ Use "' + esc(typed.toUpperCase()) + '" — Add Custom / Newly Listed Stock (NSE / BSE / SME)</button>';
    box.classList.remove("hidden");
    items.slice(0, 5).forEach(it => {
      const sym = it[0];
      if (prices[sym]) return;
      fetchOne(sym).then(() => {
        if (input.value.trim().toLowerCase() !== txt) return;
        const elp = box.querySelector('[data-sugp="' + sym + '"]');
        if (elp && prices[sym]) elp.textContent = inr2(prices[sym].price);
      }).catch(() => {});
    });
    const cb = box.querySelector("[data-custom]");
    if (cb) cb.addEventListener("mousedown", e => { e.preventDefault(); input.value = typed.toUpperCase(); close(); input.dispatchEvent(new Event("input", { bubbles: true })); input.focus(); });
    if (!items.length) return;
    box.classList.remove("hidden");
    box.querySelectorAll(".suggest-item").forEach(b => b.addEventListener("mousedown", e => { e.preventDefault(); pick(Number(b.dataset.i)); }));
  }
  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.addEventListener("keydown", e => {
    if (box.classList.contains("hidden")) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = e.key === "ArrowDown" ? Math.min(active + 1, items.length - 1) : Math.max(active - 1, 0);
      box.querySelectorAll(".suggest-item").forEach((b, i) => b.classList.toggle("active", i === active));
    } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") close();
  });
}
function fmtDate(ds) {
  if (!ds) return "—";
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = String(ds).split("-");
  if (p.length !== 3) return ds;
  return Number(p[2]) + " " + (M[Number(p[1]) - 1] || "") + " " + p[0];
}
function fyStartOf(dateStr) { const d = new Date(dateStr + "T00:00:00"); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; }
function effPrice(t) {
  const p = Number(t.price) || 0, q = Number(t.qty) || 0, c = Number(t.charges) || 0;
  if (!c || !q) return p;
  if (t.type === "BUY") return p + c / q;
  if (t.type === "SELL") return Math.max(0, p - c / q);
  return p;
}
function computeHoldings() {
  const lots = {}; const order = []; const realised = {}; let divTotal = 0;
  const split = { stcg: 0, ltcg: 0, stcgFY: 0, ltcgFY: 0 };
  const curFY = fyStartOf(todayStr());
  const txns = [...state.txns].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  for (const t of txns) {
    if (t.type === "DIV") { divTotal += Number(t.price) || 0; continue; }
    if (!lots[t.sym]) { lots[t.sym] = []; order.push(t.sym); realised[t.sym] = 0; }
    if (t.type === "BUY") lots[t.sym].push({ qty: Number(t.qty), price: effPrice(t), date: t.date, name: t.name, sector: (t.sector && t.sector !== "Other") ? t.sector : ((window.INDUSTRY_MAP && window.INDUSTRY_MAP[t.sym]) || (window.FALLBACK_SECTOR && window.FALLBACK_SECTOR[t.sym]) || t.sector || "Other") });
    else if (t.type === "SELL") {
      let q = Number(t.qty);
      while (q > 0 && lots[t.sym].length) {
        const lot = lots[t.sym][0]; const take = Math.min(q, lot.qty);
        const gain = take * (effPrice(t) - lot.price);
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
    if (t.type === "BUY") cfs.push({ date: d, amount: -Number(t.qty) * effPrice(t) });
    else if (t.type === "SELL") cfs.push({ date: d, amount: Number(t.qty) * effPrice(t) });
    else if (t.type === "DIV") cfs.push({ date: d, amount: Number(t.price) || 0 });
  }
  if (!cfs.length || currentValue <= 0) return null;
  cfs.sort((a, b) => a.date - b.date);
  if (Date.now() - cfs[0].date.getTime() < 7 * 86400000) return null;
  cfs.push({ date: new Date(), amount: currentValue });
  return xirr(cfs);
}

/* ================= prices (free, delayed) ================= */
function yahooUrl(sym) {
  const s = sym.indexOf(".") >= 0 ? sym : sym + ".NS";
  return "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(s) + "?range=1mo&interval=1d";
}
async function fetchTO(url, ms) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms || 9000);
  try { return await fetch(url, { cache: "no-store", signal: ctl.signal }); }
  finally { clearTimeout(to); }
}
async function fetchOne(sym) {
  const manual = state.manualPrices && state.manualPrices[sym];
  const proxies = [
    u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    u => "https://api.cors.lol/?url=" + encodeURIComponent(u),
    u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
  ];
  const urls = [yahooUrl(sym), yahooUrl(sym).replace("query1.finance.yahoo.com", "query2.finance.yahoo.com")];
  /* Proxy racing: every route runs in parallel (3.5s cap each) — the first
     valid answer wins, so one slow proxy can never hold up a price. */
  const attempts = [];
  for (const url of urls) for (const p of proxies) {
    attempts.push((async () => {
      const res = await fetchTO(p(url), 3500);
      if (!res.ok) throw new Error("bad route");
      const j = await res.json();
      const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (!meta || !meta.regularMarketPrice) throw new Error("no data");
      let spark = [];
      try { const q = j.chart.result[0].indicators.quote[0].close || []; spark = q.filter(v => typeof v === "number"); } catch (e) {}
      const prev = spark.length > 1 ? spark[spark.length - 2] : (meta.chartPreviousClose || meta.regularMarketPrice);
      return { price: meta.regularMarketPrice, prevClose: prev, ts: Date.now(), manual: false, spark: spark };
    })());
  }
  try { return await Promise.any(attempts); } catch (e) { /* every NSE route failed */ }
  if (sym.indexOf(".") < 0 && sym.charAt(0) !== "^") {
    const boAttempts = proxies.map(p => (async () => {
      const res = await fetchTO(p(yahooUrl(sym).replace(".NS", ".BO")), 3500);
      if (!res.ok) throw new Error("bad route");
      const j = await res.json();
      const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (!meta || !meta.regularMarketPrice) throw new Error("no data");
      let spark = [];
      try { const q = j.chart.result[0].indicators.quote[0].close || []; spark = q.filter(v => typeof v === "number"); } catch (e2) {}
      const prev = spark.length > 1 ? spark[spark.length - 2] : (meta.chartPreviousClose || meta.regularMarketPrice);
      return { price: meta.regularMarketPrice, prevClose: prev, ts: Date.now(), manual: false, spark: spark };
    })());
    try { return await Promise.any(boAttempts); } catch (e) { /* BSE failed too */ }
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
  savePricesLS();
  const any = Object.keys(prices).length;
  $("priceMeta").textContent = any ? "Prices updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · free data, ~15 min delay" : "Prices could not load right now — check internet, or set a price manually from a holding's ⋯ menu.";
  renderAll();
}
function priceOf(sym) { return prices[sym] || null; }
/* Instant paint: last session's prices load from this device first (stale-
   while-revalidate) — the dashboard renders in 0ms, then fresh prices land. */
function savePricesLS() {
  try { localStorage.setItem("folio_prices_v1", JSON.stringify({ ts: Date.now(), prices: prices })); } catch (e) {}
}
function loadPricesLS() {
  try {
    const o = JSON.parse(localStorage.getItem("folio_prices_v1") || "null");
    if (o && o.prices && Date.now() - o.ts < 24 * 3600 * 1000) prices = o.prices;
  } catch (e) {}
}
/* Money formatting: Indian system by default; compact (₹ L / ₹ Cr) when the
   user turns it on in Personal Info. */
function inrShort(v) {
  const neg = v < 0, a = Math.abs(v);
  let s;
  if (a >= 1e7) s = "₹" + (a / 1e7).toFixed(2) + " Cr";
  else if (a >= 1e5) s = "₹" + (a / 1e5).toFixed(2) + " L";
  else if (a >= 1e3) s = "₹" + (a / 1e3).toFixed(1) + "k";
  else s = inr(a);
  return neg ? "-" + s : s;
}
function moneyFmt(v) {
  return (state && state.profile && state.profile.compact) ? inrShort(v) : inr(v);
}

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
    animNum($("stInvested"), d.invested, moneyFmt);
    animNum($("stValue"), d.value, moneyFmt);
    animNum($("stPnl"), d.totalPnl, moneyFmt);
    $("stPnl").className = "stat-value " + (d.totalPnl >= 0 ? "gain" : "loss");
    $("stPnlPct").textContent = pct(d.invested ? d.totalPnl / d.invested * 100 : 0) + " overall · today " + moneyFmt(d.dayPnl);
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
    const dmode = window.__donutMode || "stock";
    let slices;
    if (dmode === "sector") {
      const m = {};
      d.rows.forEach(r_ => { const k = r_.sector || "Other"; if (!m[k]) m[k] = { key: k, label: k, value: 0, inv: 0 }; m[k].value += r_.cur; m[k].inv += r_.invested; });
      slices = Object.values(m).sort((a, b) => b.value - a.value).map((x, i) => ({ ...x, color: PIE[i % PIE.length], ret: x.inv ? (x.value - x.inv) / x.inv * 100 : 0 }));
    } else if (dmode === "cap") {
      const m = {};
      d.rows.forEach(r_ => { const cc = typeof CAP_CLASS === "function" ? CAP_CLASS(r_.sym) : "S"; const k = cc === "L" ? "Large Cap" : cc === "M" ? "Mid Cap" : "Small Cap"; if (!m[k]) m[k] = { key: k, label: k, value: 0, inv: 0 }; m[k].value += r_.cur; m[k].inv += r_.invested; });
      slices = Object.values(m).sort((a, b) => b.value - a.value).map((x, i) => ({ ...x, color: PIE[i % PIE.length], ret: x.inv ? (x.value - x.inv) / x.inv * 100 : 0 }));
    } else {
      slices = d.rows.map(r_ => ({ key: r_.sym, label: r_.sym, value: r_.cur, color: r_.color, ret: r_.pnlPct }));
    }
    let a0 = -Math.PI / 2, parts = "";
    const cx = 100, cy = 100, r = 82, r2 = 48;
    const sectorPath = (sa, ea) => {
      const span = ea - sa, n = Math.max(1, Math.ceil(span / Math.PI));
      const pt = (ang, rad) => (cx + rad * Math.cos(ang)).toFixed(2) + "," + (cy + rad * Math.sin(ang)).toFixed(2);
      let dd = "M" + pt(sa, r);
      for (let i = 1; i <= n; i++) dd += " A" + r + "," + r + " 0 0 1 " + pt(sa + span * i / n, r);
      dd += " L" + pt(ea, r2);
      for (let i = 1; i <= n; i++) dd += " A" + r2 + "," + r2 + " 0 0 0 " + pt(ea - span * i / n, r2);
      return dd + " Z";
    };
    for (const sl of slices) {
      const frac = sl.value / d.value; if (frac <= 0) continue;
      const a1 = a0 + frac * Math.PI * 2;
      parts += `<path class="seg" data-sym="${esc(sl.key)}" d="${sectorPath(a0, a1)}" fill="${sl.color}" stroke="var(--panel)" stroke-width="1.5"/>`;
      a0 = a1;
    }
    svg.innerHTML = parts + `<text id="donutTop" x="100" y="92" text-anchor="middle" fill="var(--muted)" font-size="10.5" letter-spacing="1.5">TOTAL VALUE</text><text id="donutMain" x="100" y="112" text-anchor="middle" fill="var(--text)" font-size="14.5" font-weight="bold">${esc(inr(d.value))}</text><text id="donutSub" x="100" y="128" text-anchor="middle" fill="var(--muted)" font-size="10"></text>`;
    legend.innerHTML = slices.map(sl => `<div class="legend-item" data-sym="${esc(sl.key)}"><span class="sw" style="background:${sl.color}"></span><span class="lg-name">${esc(sl.label)}</span><span class="lg-bar"><i style="width:${(sl.value / d.value * 100).toFixed(1)}%;background:${sl.color}"></i></span><span class="lg-pct">${(sl.value / d.value * 100).toFixed(1)}%</span></div>`).join("");
    const setCenter = key => {
      const top = $("donutTop"), main = $("donutMain"), sub = $("donutSub"); if (!top || !main) return;
      const sl = key ? slices.find(x => x.key === key) : null;
      top.textContent = sl ? sl.label.toUpperCase() : "TOTAL VALUE";
      main.textContent = sl ? (sl.value / d.value * 100).toFixed(1) + "% · " + inr(sl.value) : inr(d.value);
      if (sub) sub.textContent = sl ? "Return " + pct(sl.ret) : "";
      svg.querySelectorAll(".seg").forEach(p => p.style.opacity = (!key || p.dataset.sym === key) ? "1" : "0.3");
    };
    svg.querySelectorAll(".seg").forEach(p => { p.addEventListener("mouseenter", () => setCenter(p.dataset.sym)); p.addEventListener("click", () => setCenter(p.dataset.sym)); p.addEventListener("mouseleave", () => setCenter(null)); });
    legend.querySelectorAll(".legend-item").forEach(el2 => { el2.addEventListener("mouseenter", () => setCenter(el2.dataset.sym)); el2.addEventListener("click", () => setCenter(el2.dataset.sym)); el2.addEventListener("mouseleave", () => setCenter(null)); });
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
  const today = new Date(todayStr() + "T00:00:00");
  el.innerHTML = d.rows.map((h, i) => {
    const dayPct = h.ltp !== null && h.prevClose ? (h.ltp - h.prevClose) / h.prevClose * 100 : null;
    const alertCfg = (state.profile.alerts || {})[h.sym] || null;
    let alertChip = "";
    if (alertCfg && h.ltp !== null) {
      if (alertCfg.target && h.ltp >= alertCfg.target) alertChip = '<span class="alert-chip hit">🔔 Target hit — ' + inr2(alertCfg.target) + "</span>";
      else if (alertCfg.sl && h.ltp <= alertCfg.sl) alertChip = '<span class="alert-chip hit">🔔 Stop-loss hit — ' + inr2(alertCfg.sl) + "</span>";
      else alertChip = '<span class="alert-chip">🔔 ' + (alertCfg.target ? "T " + inr2(alertCfg.target) : "") + (alertCfg.target && alertCfg.sl ? " · " : "") + (alertCfg.sl ? "SL " + inr2(alertCfg.sl) : "") + "</span>";
    }
    const weight = d.value ? h.cur / d.value * 100 : 0;
    const claimedLots = new Set();
    const lotsHtml = (h.lots || []).map(l => {
      const days = Math.max(0, Math.round((today - new Date(l.date + "T00:00:00")) / 86400000));
      const long = days >= 365;
      const lp = h.ltp !== null ? l.qty * (h.ltp - l.price) : null;
      const lpPct = h.ltp !== null && l.price ? (h.ltp - l.price) / l.price * 100 : null;
      const origin = state.txns.find(t => t.type === "BUY" && t.sym === h.sym && t.date === l.date && Math.abs(effPrice(t) - l.price) < 0.011 && Number(t.qty) >= l.qty && !claimedLots.has(t.id));
      if (origin) claimedLots.add(origin.id);
      return `<div class="lot-row"><span class="lot-date">${esc(fmtDate(l.date))}</span><span>${l.qty} shares × ${inr2(l.price)}</span><span class="lot-age">${days} days held</span><span class="tax-chip ${long ? "ltcg" : "stcg"}">${long ? "LTCG" : "STCG"}</span>${lp !== null ? `<span class="lot-pnl ${lp >= 0 ? "gain" : "loss"}">${inr(lp)} (${pct(lpPct)})</span>` : ""}${origin ? `<button class="mini-btn lot-edit" data-edittxn="${origin.id}" type="button">✏️ Edit Lot</button><button class="mini-btn danger lot-del" data-deltxn="${origin.id}" type="button">🗑️ Delete Lot</button>` : ""}</div>`;
    }).join("");
    const ltcgQty = (h.lots || []).filter(l => (today - new Date(l.date + "T00:00:00")) / 86400000 >= 365).reduce((a, l) => a + l.qty, 0);
    const taxLine = ltcgQty > 0
      ? (ltcgQty >= h.qty ? "All " + h.qty + " shares are past 1 year — selling now counts as LTCG (12.5% above ₹1.25 lakh a year)." : ltcgQty + " of " + h.qty + " shares are past 1 year (LTCG); the rest are still under 1 year (STCG if sold).")
      : "No shares past 1 year yet — selling now counts as STCG (20%).";
    const txns = state.txns.filter(t => t.sym === h.sym).sort((a, b) => b.date < a.date ? -1 : 1);
    const txnHtml = txns.map(t => `<div class="dr-txn"><span class="hist-type ${t.type}">${t.type}</span><span class="dr-txn-main">${t.type === "DIV" ? inr(t.price) + " received" : t.qty + " × " + inr2(t.price)} · ${esc(fmtDate(t.date))}</span><button class="mini-btn" data-edittxn="${t.id}" type="button">✎ Edit</button><button class="mini-btn danger" data-deltxn="${t.id}" type="button">Delete</button></div>`).join("");
    return `
    <div class="hold-card" style="animation-delay:${i * 60}ms">
      <button class="hold-head" data-hold-toggle="${esc(h.sym)}" type="button">
        <span class="hh-left"><span class="hold-sym">${esc(h.sym)}</span><span class="hh-sub"><span class="hold-name">${esc(h.name)}</span><span class="sector-chip">${esc(h.sector || "Other")}</span></span></span>
        <span class="hh-right"><span class="hh-ltp" data-pflash="${esc(h.sym)}">${h.ltp !== null ? "LTP " + inr2(h.ltp) : "LTP —"}</span>${dayPct !== null ? `<span class="wp-pill ${dayPct >= 0 ? "gain" : "loss"}">${dayPct >= 0 ? "▲" : "▼"} ${pct(dayPct)}</span>` : ""}</span>
      </button>
      <div class="hold-strip">
        <div><span>Current Value</span><b>${inr(h.cur)}</b></div>
        <div><span>Invested</span><b>${inr(h.invested)}</b></div>
        <div><span>Overall P&amp;L</span><b class="${h.pnl >= 0 ? "gain" : "loss"}">${inr(h.pnl)} (${pct(h.pnlPct)})</b></div>
        <div><span>Day's P&amp;L</span><b class="${h.day >= 0 ? "gain" : "loss"}">${inr(h.day)}</b></div>
      </div>
      <div class="hold-meta">Qty: ${h.qty} shares · Avg Buy: ${inr2(h.avg)} · Weight: ${weight.toFixed(1)}% of portfolio${h.ltp === null ? ' · <span class="alert-chip">Custom Quote — valued at your buy price (no live feed)</span>' : ""} · Booked P&amp;L: <b class="${h.realised >= 0 ? "gain" : "loss"}">${inr(h.realised)}</b>${alertChip ? " · " + alertChip : ""}</div>
      <button class="hold-chev" data-hold-toggle="${esc(h.sym)}" type="button"><span class="chev-label">📅 Buy Dates, Live Status &amp; Edit</span><span class="chev-pill">Tap to Open ▼</span></button>
      <div class="hold-drawer" data-drawer="${esc(h.sym)}" data-avg="${h.avg}" data-ltp="${h.ltp === null ? "" : h.ltp}">
       <div class="drawer-inner">
        <div class="dr-block"><h4>Live Status</h4><div class="dr-status"><span class="muted small">Loading status…</span></div></div>
        <div class="dr-block"><h4>Kab Kharida — Your Buy Lots</h4>${lotsHtml}<p class="dr-tax">${taxLine}</p></div>
        <div class="dr-block"><h4>All Entries</h4>${txnHtml || '<p class="muted small">No entries.</p>'}</div>
        <div class="dr-block alerts"><h4>🔔 Price Alerts</h4>
          <div class="wi-row"><label>Target Price<input type="number" class="al-target" min="0" step="any" placeholder="₹ target" value="${alertCfg && alertCfg.target ? alertCfg.target : ""}"></label><label>Stop-Loss Price<input type="number" class="al-sl" min="0" step="any" placeholder="₹ stop-loss" value="${alertCfg && alertCfg.sl ? alertCfg.sl : ""}"></label></div>
          <div class="al-btns"><button class="mini-btn" data-alertsave="${esc(h.sym)}" type="button">Save Alert</button><button class="mini-btn danger" data-alertclear="${esc(h.sym)}" type="button">Clear</button><span class="price-meta">Alerts show on this card when the live price crosses them (checked on every refresh — not a broker order).</span></div>
        </div>
        <div class="dr-block whatif" data-qty="${h.qty}" data-avg="${h.avg}" data-inv="${h.invested}"><h4>What-If Average Calculator</h4>
          <div class="wi-row"><label>New Qty<input type="number" class="wi-qty" min="0" step="any" placeholder="0"></label><label>Buy Price<input type="number" class="wi-price" min="0" step="any" value="${h.ltp === null ? "" : h.ltp}"></label></div>
          <p class="wi-out price-meta">Add a quantity to see your new average price.</p>
        </div>
        <div class="hold-actions">
          <button class="mini-btn" data-act="chart" data-sym="${esc(h.sym)}">📊 Chart &amp; News</button>
          <button class="mini-btn" data-act="buy" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">+ Buy More</button>
          <button class="mini-btn" data-act="sell" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">Sell</button>
          <button class="mini-btn" data-act="div" data-sym="${esc(h.sym)}" data-name="${esc(h.name)}">Dividend</button>
          <button class="mini-btn" data-act="price" data-sym="${esc(h.sym)}">Set Price</button>
          <button class="mini-btn danger" data-act="del" data-sym="${esc(h.sym)}">Remove All</button>
        </div>
       </div>
      </div>
    </div>`;
  }).join("");
  el.querySelectorAll("button[data-act]").forEach(b => b.addEventListener("click", () => holdingAction(b.dataset)));
  el.querySelectorAll("[data-edittxn]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openEditTxn(b.dataset.edittxn); }));
  el.querySelectorAll("[data-deltxn]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    if (!confirm("Delete this entry?")) return;
    state.txns = state.txns.filter(t => t.id !== b.dataset.deltxn); persist(); renderAll(); toast("Entry deleted");
  }));
  el.querySelectorAll("[data-hold-toggle]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".hold-card");
    const drawer = card && card.querySelector(".hold-drawer");
    if (!drawer) return;
    const opening = !card.classList.contains("open");
    card.classList.toggle("open", opening);
    card.querySelectorAll(".chev-pill").forEach(c => c.textContent = opening ? "Hide Details ▲" : "Tap to Open ▼");
    if (opening && !drawer.dataset.filled) {
      drawer.dataset.filled = "1";
      if (typeof fillHoldDrawer === "function") fillHoldDrawer(drawer.dataset.drawer, drawer);
    }
  }));
  el.querySelectorAll("[data-alertsave]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".hold-card");
    const t = Number(card.querySelector(".al-target").value) || null;
    const sl = Number(card.querySelector(".al-sl").value) || null;
    if (!state.profile.alerts) state.profile.alerts = {};
    if (!t && !sl) delete state.profile.alerts[b.dataset.alertsave];
    else state.profile.alerts[b.dataset.alertsave] = { target: t, sl: sl };
    persist(); renderAll(); toast("Price alert saved for " + b.dataset.alertsave);
  }));
  el.querySelectorAll("[data-alertclear]").forEach(b => b.addEventListener("click", () => {
    if (state.profile.alerts) delete state.profile.alerts[b.dataset.alertclear];
    persist(); renderAll(); toast("Price alert cleared");
  }));
  el.querySelectorAll(".whatif").forEach(w => {
    const qtyEl = w.querySelector(".wi-qty"), priceEl = w.querySelector(".wi-price"), out = w.querySelector(".wi-out");
    const calc = () => {
      const nq = Number(qtyEl.value) || 0, pr = Number(priceEl.value) || 0;
      const cq = Number(w.dataset.qty), ca = Number(w.dataset.avg), ci = Number(w.dataset.inv);
      if (!(nq > 0) || !(pr > 0)) { out.textContent = "Add a quantity to see your new average price."; return; }
      const na = (cq * ca + nq * pr) / (cq + nq);
      out.innerHTML = "New Avg Price: <b>" + inr2(na) + "</b> · New Total Invested: <b>" + inr(ci + nq * pr) + "</b> · Total Qty: <b>" + (cq + nq) + "</b>";
    };
    qtyEl.addEventListener("input", calc);
    priceEl.addEventListener("input", calc);
  });
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
    return `<div class="watchlist-row" data-wrow="${esc(w.sym)}">
      <button class="star-btn ${w.fav ? "fav" : ""}" data-star="${esc(w.sym)}" type="button" title="Favourite">${w.fav ? "★" : "☆"}</button>
      <div class="w-id"><span class="w-sym">${esc(w.sym)}</span><span class="w-name">${esc(w.name)}</span></div>
      <div class="watch-spark">${p && p.spark && p.spark.length > 1 ? sparkSvg(p.spark) : ""}</div>
      <div class="w-price" data-pflash="${esc(w.sym)}"><span class="wp-price">${p ? inr2(p.price) : "—"}</span>${chg !== null ? `<span class="wp-pill ${chg >= 0 ? "gain" : "loss"}">${chg >= 0 ? "▲" : "▼"} ${pct(chg)}</span>` : `<span class="wp-pill flat">—</span>`}</div>
      <button class="watch-x" data-unwatch="${esc(w.sym)}" type="button" title="Remove from watchlist">🗑️</button>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-star]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const w = state.watch.find(x => x.sym === b.dataset.star); if (w) { w.fav = !w.fav; persist(); renderWatch(); }
  }));
  el.querySelectorAll("[data-unwatch]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    state.watch = state.watch.filter(x => x.sym !== b.dataset.unwatch); persist(); renderWatch(); toast("Removed from watchlist");
  }));
  el.querySelectorAll(".watchlist-row").forEach(row => {
    row.addEventListener("click", () => openStock(row.dataset.wrow));
  });
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

/* ================= add-transaction panel (MoneyControl-style) ================= */
function batchRow(prefill) {
  const row = document.createElement("div");
  row.className = "bt-row";
  row.innerHTML =
    '<div class="bt-main">' +
    '<select class="bt-action"><option value="BUY">Buy</option><option value="SELL">Sell</option><option value="DIV">Dividend</option></select>' +
    '<input class="bt-stock" placeholder="Stock name or symbol">' +
    '<select class="bt-exch"><option>NSE</option><option>BSE</option></select>' +
    '<input type="date" class="bt-date">' +
    '<input type="number" class="bt-qty" min="0" step="any" placeholder="Qty">' +
    '<input type="number" class="bt-price" min="0" step="any" placeholder="Price">' +
    '<input class="bt-amount" readonly placeholder="Amount">' +
    '<span class="bt-btns"><button type="button" class="icon-btn bt-optbtn" title="Optional: broker, charges, notes">＋</button>' +
    '<button type="button" class="icon-btn bt-del" title="Remove this row">🗑</button></span>' +
    '</div>' +
    '<div class="bt-optbox hidden">' +
    '<label>Select Broker<select class="bt-broker"><option>Zerodha</option><option>Dhan</option><option>Groww</option><option>Upstox</option><option>Other</option></select></label>' +
    '<label>Total Charges (₹)<input type="number" class="bt-charges" min="0" step="any" placeholder="0"></label>' +
    '<label>Net Amount<input class="bt-net" readonly placeholder="—"></label>' +
    '<label>Notes<input type="text" class="bt-note" placeholder="Note for future reference"></label>' +
    '</div>';
  const q = s => row.querySelector(s);
  attachSuggest(q(".bt-stock"));
  const act = q(".bt-action"), qty = q(".bt-qty"), price = q(".bt-price"), charges = q(".bt-charges");
  function recalc() {
    const type = act.value;
    const p = Number(price.value) || 0, n = Number(qty.value) || 0, c = Number(charges.value) || 0;
    const amt = type === "DIV" ? p : n * p;
    q(".bt-amount").value = amt ? "₹" + amt.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "";
    const net = type === "BUY" ? amt + c : type === "SELL" ? amt - c : amt;
    q(".bt-net").value = amt ? "₹" + net.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "";
    qty.disabled = type === "DIV";
    if (type === "DIV") qty.value = "";
    price.placeholder = type === "DIV" ? "Total ₹ received" : "Price";
  }
  row.addEventListener("input", recalc);
  row.addEventListener("change", recalc);
  q(".bt-optbtn").addEventListener("click", () => q(".bt-optbox").classList.toggle("hidden"));
  q(".bt-del").addEventListener("click", () => {
    if (document.querySelectorAll(".bt-row").length > 1) row.remove();
    else { row.querySelectorAll("input").forEach(i => { if (!i.classList.contains("bt-date")) i.value = ""; }); recalc(); }
  });
  if (prefill) {
    if (prefill.type) act.value = prefill.type;
    if (prefill.stock) q(".bt-stock").value = prefill.stock;
    if (prefill.exch) q(".bt-exch").value = prefill.exch;
    if (prefill.qty) qty.value = prefill.qty;
    if (prefill.price) price.value = prefill.price;
    if (prefill.charges) { charges.value = prefill.charges; q(".bt-optbox").classList.remove("hidden"); }
    if (prefill.broker) q(".bt-broker").value = prefill.broker;
    if (prefill.note) { q(".bt-note").value = prefill.note; q(".bt-optbox").classList.remove("hidden"); }
    if (prefill.date) q(".bt-date").value = prefill.date;
  }
  if (!prefill || !prefill.date) q(".bt-date").value = todayStr();
  recalc();
  return row;
}
function setEntryTab(file) {
  $("entryManual").classList.toggle("active", !file);
  $("entryFile").classList.toggle("active", file);
  $("txnForm").classList.toggle("hidden", file);
  $("fileBox").classList.toggle("hidden", !file);
}
function openTxn(type, sym, name) {
  setEntryTab(false);
  const box = $("batchRows");
  box.innerHTML = "";
  box.appendChild(batchRow({ type: type || "BUY", stock: sym ? (name && name !== sym ? name : sym) : "" }));
  $("txnError").textContent = "";
  $("txnModal").classList.remove("hidden");
}
function openEditTxn(id) {
  const t = state.txns.find(x => x.id === id);
  if (!t) return;
  window.__editTxnId = id;
  setEntryTab(false);
  const box = $("batchRows");
  box.innerHTML = "";
  box.appendChild(batchRow({ type: t.type, stock: t.name && t.name !== t.sym ? t.name : t.sym, exch: t.exch || "NSE", date: t.date, qty: t.qty, price: t.price, charges: t.charges || 0, broker: t.broker || "Zerodha", note: t.note || "" }));
  $("txnError").textContent = "Editing your " + t.type + " entry of " + t.sym + " — saving replaces the old entry.";
  $("txnModal").classList.remove("hidden");
}
function closeTxn() { window.__editTxnId = null; $("txnModal").classList.add("hidden"); }
function saveTxn(ev) {
  ev.preventDefault();
  const rows = [...document.querySelectorAll(".bt-row")];
  const sellsQueued = {};
  const adds = [];
  for (const row of rows) {
    const q = s => row.querySelector(s);
    const stockTxt = q(".bt-stock").value.trim();
    if (!stockTxt) continue;
    const type = q(".bt-action").value;
    const st = resolveStock(stockTxt);
    if (!st.sym) { $("txnError").textContent = "One row's stock could not be recognised — check its name or symbol."; return; }
    const date = q(".bt-date").value;
    const price = Number(q(".bt-price").value);
    const qty = type === "DIV" ? 0 : Number(q(".bt-qty").value);
    if (!date || !(price >= 0) || (type !== "DIV" && !(price > 0))) { $("txnError").textContent = st.sym + ": please enter a valid date and price."; return; }
    if (type !== "DIV" && !(qty > 0)) { $("txnError").textContent = st.sym + ": quantity must be more than 0."; return; }
    if (type === "SELL") {
      const h = computeHoldings().holdings.find(x => x.sym === st.sym);
      const have = (h ? h.qty : 0) - (sellsQueued[st.sym] || 0);
      if (qty > have) { $("txnError").textContent = "You hold only " + have + " shares of " + st.sym + "."; return; }
      sellsQueued[st.sym] = (sellsQueued[st.sym] || 0) + qty;
    }
    adds.push({ id: uid(), type: type, sym: st.sym, name: st.name, sector: st.sector, qty: qty, price: price, date: date, exch: q(".bt-exch").value, broker: q(".bt-broker").value, charges: Number(q(".bt-charges").value) || 0, note: q(".bt-note").value.trim() });
  }
  if (!adds.length) { $("txnError").textContent = "Add at least one stock first."; return; }
  let edited = false;
  if (window.__editTxnId && adds.length === 1) {
    const before = state.txns.length;
    state.txns = state.txns.filter(t => t.id !== window.__editTxnId);
    edited = state.txns.length < before;
    window.__editTxnId = null;
  }
  state.txns.push(...adds);
  persist(); closeTxn(); renderAll(); refreshPrices();
  toast(edited ? "Entry updated" : adds.length + (adds.length > 1 ? " transactions" : " transaction") + " added");
}

/* ================= watch / settings ================= */
function addWatch(ev) {
  ev.preventDefault();
  const st = resolveStock($("watchInput").value);
  if (!st.sym) return;
  if (state.watch.some(w => w.sym === st.sym)) { toast(st.sym + " is already in your watchlist"); return; }
  state.watch.push({ sym: st.sym, name: st.name, fav: false });
  $("watchInput").value = ""; persist(); renderWatch(); refreshPrices();
  if (typeof primeStock === "function") primeStock(st.sym);
}
function exportCsv() {
  const lines = ["Date,Type,Symbol,Name,Qty,Price,Charges,Broker,Exchange,Note"];
  [...state.txns].sort((a, b) => a.date < b.date ? -1 : 1).forEach(t =>
    lines.push([t.date, t.type, t.sym, '"' + String(t.name || "").replace(/"/g, '""') + '"', t.qty, t.price, t.charges || 0, t.broker || "", t.exch || "", '"' + String(t.note || "").replace(/"/g, '""') + '"'].join(",")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "folio-portfolio.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast("CSV downloaded — keep it safe, it is your backup.");
}
function importCsv(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const lines = String(rd.result).split(/\r?\n/).filter(r => r.trim());
      if (lines.length < 2) { toast("That file looks empty."); return; }
      const splitRow = r => r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.replace(/^"|"$/g, "").trim());
      const header = splitRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, " "));
      const ALIASES = {
        sym: ["symbol", "instrument", "trading symbol", "tradingsymbol", "scrip", "scrip name", "stock", "symbol name", "company"],
        date: ["date", "trade date", "trade_date", "order execution time", "execution time", "transaction date", "order time"],
        type: ["type", "trade type", "trade_type", "transaction type", "buy/sell", "side", "txn type"],
        qty: ["qty", "quantity", "filled qty", "qty.", "shares", "quantity filled"],
        price: ["price", "trade price", "avg. cost", "avg cost", "average price", "rate", "price per share", "avg. price"]
      };
      const col = {};
      for (const k of Object.keys(ALIASES)) col[k] = header.findIndex(h => ALIASES[k].includes(h));
      const mapped = col.sym >= 0 && col.date >= 0 && col.qty >= 0 && col.price >= 0;
      let n = 0, skipped = 0;
      const normDate = v => {
        v = String(v || "").trim();
        let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + "-" + m[2] + "-" + m[3];
        m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (m) return m[3] + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0");
        return "";
      };
      const num = v => Number(String(v || "").replace(/[^0-9.\-]/g, "")) || 0;
      for (const r of lines.slice(1)) {
        const c = splitRow(r);
        let symCell, dateCell, typeCell, qtyCell, priceCell, charges = 0, broker = "", exch = "", note = "";
        if (mapped) {
          symCell = c[col.sym]; dateCell = c[col.date]; typeCell = col.type >= 0 ? c[col.type] : "BUY";
          qtyCell = c[col.qty]; priceCell = c[col.price];
        } else {
          if (c.length < 6) { skipped++; continue; }
          dateCell = c[0]; typeCell = c[1]; symCell = c[2]; qtyCell = c[4]; priceCell = c[5];
          charges = num(c[6]); broker = c[7] || ""; exch = c[8] || ""; note = c[9] || "";
        }
        const date = normDate(dateCell);
        const tu = String(typeCell || "").toUpperCase();
        const type = tu.includes("SELL") || tu === "S" ? "SELL" : tu.includes("DIV") ? "DIV" : "BUY";
        const qty = num(qtyCell), price = num(priceCell);
        if (!date || !symCell || !(price >= 0) || (type !== "DIV" && !(qty > 0))) { skipped++; continue; }
        const rawSym = String(symCell).toUpperCase().trim();
        const hit = (window.STOCK_LIST || []).find(x => x[0] === rawSym);
        const st = hit ? { sym: hit[0], name: hit[1], sector: hit[2] || "Other" } : resolveStock(symCell);
        if (!st.sym) { skipped++; continue; }
        state.txns.push({ id: uid(), date: date, type: type, sym: st.sym, name: st.name, sector: st.sector || "Other", qty: type === "DIV" ? 0 : qty, price: price, charges: charges, broker: broker, exch: exch, note: note });
        n++;
      }
      persist(); renderAll(); refreshPrices();
      toast("Imported " + n + " entries" + (skipped ? " · " + skipped + " rows skipped" : "") + (mapped ? " · broker format detected" : "") + ".");
    } catch (e) { toast("That CSV could not be read."); }
  };
  rd.readAsText(file);
}

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
  const syncThemeIcon = () => { const ti = $("themeIcon"); if (ti) ti.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☀" : "☾"; };
  syncThemeIcon();
  $("demoBanner").classList.toggle("hidden", FIREBASE_ON);
  setAuthMode("login");
  $("tabLogin").addEventListener("click", () => setAuthMode("login"));
  $("tabSignup").addEventListener("click", () => setAuthMode("signup"));
  $("authForm").addEventListener("submit", doAuth);
  $("forgotLink").addEventListener("click", doForgot);
  $("googleBtn").addEventListener("click", doGoogleSignIn);
  $("passEye").addEventListener("click", () => {
    const inp = $("authPass");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    $("passEye").textContent = show ? "🙈" : "👁";
  });
  $("logoutBtn2").addEventListener("click", doLogout);
  $("profileChip").addEventListener("click", () => { switchView("profile"); if (typeof renderProfile === "function") renderProfile(); });
  $("termsAgree").addEventListener("click", () => {
    if (state && state.profile) { state.profile.termsSeen = true; persist(); }
    $("termsModal").classList.add("hidden");
    toast("Welcome to Folio");
  });
  $("themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur); localStorage.setItem("pf_theme", cur);
    syncThemeIcon();
  });
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchView(t.dataset.view)));
  $("refreshBtn").addEventListener("click", refreshPrices);
  $("addStockBtn").addEventListener("click", () => openTxn("BUY", "", ""));
  $("txnClose").addEventListener("click", closeTxn);
  $("txnModal").addEventListener("click", e => { if (e.target === $("txnModal")) closeTxn(); });
  $("txnForm").addEventListener("submit", saveTxn);
  $("addRowBtn").addEventListener("click", () => $("batchRows").appendChild(batchRow(null)));
  $("txnReset").addEventListener("click", () => openTxn("BUY", "", ""));
  $("entryManual").addEventListener("click", () => setEntryTab(false));
  $("entryFile").addEventListener("click", () => setEntryTab(true));
  $("filePickBtn").addEventListener("click", () => $("importFile").click());
  $("watchForm").addEventListener("submit", addWatch);
  attachSuggest($("watchInput"));
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
