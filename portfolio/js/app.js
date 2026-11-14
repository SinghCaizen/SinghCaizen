"use strict";
/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const inr = n => Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—";
const inr2 = n => Number.isFinite(n) ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
const pct = n => Number.isFinite(n) ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—";
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let __toastTimer = null;
function toast(msg, undoFn) {
  const t = $("toast"); if (!t) return;
  t.innerHTML = "";
  t.appendChild(document.createTextNode(msg));
  if (typeof undoFn === "function") {
    const b = document.createElement("button");
    b.type = "button"; b.className = "toast-undo"; b.textContent = "Undo";
    b.addEventListener("click", () => { clearTimeout(__toastTimer); t.classList.add("hidden"); undoFn(); });
    t.appendChild(b);
  }
  t.classList.remove("hidden");
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => t.classList.add("hidden"), typeof undoFn === "function" ? 6000 : 2600);
}
/* In-app confirm dialog (replaces the browser's native confirm) */
function folioConfirm(msg, okLabel) {
  return new Promise(res => {
    let m = $("confirmModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "confirmModal"; m.className = "modal hidden"; m.setAttribute("role", "alertdialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = '<div class="modal-card confirm-card"><p class="confirm-msg"></p><div class="confirm-btns"><button type="button" class="btn" data-cf="0">Cancel</button><button type="button" class="btn btn-gold" data-cf="1"></button></div></div>';
      document.body.appendChild(m);
    }
    m.querySelector(".confirm-msg").textContent = msg;
    m.querySelector('[data-cf="1"]').textContent = okLabel || "Delete";
    m.classList.remove("hidden");
    const cancel = m.querySelector('[data-cf="0"]'); if (cancel) cancel.focus();
    const done = v => { m.classList.add("hidden"); m.removeEventListener("click", onClick); res(v); };
    const onClick = e => { const b = e.target.closest("[data-cf]"); if (b) done(b.dataset.cf === "1"); else if (e.target === m) done(false); };
    m.addEventListener("click", onClick);
  });
}
async function deleteTxnWithConfirm(id) {
  if (!await folioConfirm("Delete this entry?")) return;
  const idx = state.txns.findIndex(t => t.id === id);
  if (idx < 0) return;
  const removed = state.txns[idx];
  state.txns.splice(idx, 1); persist(); renderAll();
  toast("Entry deleted", () => { state.txns.splice(Math.min(idx, state.txns.length), 0, removed); persist(); renderAll(); toast("Entry restored"); });
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ================= state ================= */
let state = emptyState();
let prices = {};           // SYM -> {price, prevClose, ts}
let currentUser = null;    // {email, name}
let fb = { auth: null, db: null, docRef: null, unsub: null };
const FIREBASE_ON = !!window.FIREBASE_READY;

function emptyState() { return { txns: [], watch: [], watchlists: null, activeWatchlistId: "wl_default", manualPrices: {}, profile: { name: "", phone: "", dp: "", totp: null, recovery: [] } }; }
/* Exchange renames: the old symbol is dead (no data anywhere) and the new
   one is its legal heir (same ISIN). Stored entries heal automatically. */
const SYMBOL_RENAMES = { "TATAMOTORS": "TMPV" };
function normalizeState(s) {
  const base = emptyState();
  if (!s || typeof s !== "object") return base;
  const out = {
    txns: Array.isArray(s.txns) ? s.txns : [],
    watch: Array.isArray(s.watch) ? s.watch : [],
    watchlists: Array.isArray(s.watchlists) ? s.watchlists : null,
    activeWatchlistId: s.activeWatchlistId || "wl_default",
    manualPrices: s.manualPrices || {},
    profile: Object.assign(base.profile, s.profile || {})
  };
  /* IPO was removed from Folio: old backups may still carry IPO fields — drop them on load/restore so they never re-enter exports or the vault. */
  if (out.profile) { delete out.profile.ipoApps; delete out.profile.ipoVault; }
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

/* ---------- symbol hashing for on-device caches ----------
   Price/history caches are public market data, but their storage keys
   would reveal which stocks this user tracks. Keys are therefore stored
   under a deterministic hash of the symbol. (The symbol universe is
   small and public, so treat this as privacy-by-obscurity for storage
   at rest — the account data itself is protected by E2EE.) */
function symHash(sym) { let h = 0x811c9dc5; const s = String(sym || ""); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return "s" + (h >>> 0).toString(16).padStart(8, "0"); }
function symUnhashMap() {
  const m = new Map();
  (window.STOCK_LIST || []).forEach(e => m.set(symHash(e[0]), e[0]));
  try { (state.txns || []).forEach(t => m.set(symHash(t.sym), t.sym)); (state.watch || []).forEach(w => m.set(symHash(w.sym), w.sym)); } catch (e) {}
  return m;
}

/* ---------- local (demo) storage ---------- */
const LS_USERS = "pf_users_v1", LS_SESSION = "pf_session_v1";
function lsUsers() { try { return JSON.parse(localStorage.getItem(LS_USERS)) || {}; } catch (e) { return {}; } }
function lsSaveUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function localSave() {
  if (!currentUser || syncFrozen) return;
  const u = lsUsers(); if (!u[currentUser.email]) return;
  if (window.__e2eeActive && window.e2eeBuildPayload) {
    window.e2eeBuildPayload(state).then(payload => { const uu = lsUsers(); if (uu[currentUser.email]) { uu[currentUser.email].encDoc = payload; delete uu[currentUser.email].state; lsSaveUsers(uu); } });
    return;
  }
  u[currentUser.email].state = state; lsSaveUsers(u);
}

/* ---------- firebase ---------- */
function initFirebase() {
  window.__fbInitOk = false;
  if (!FIREBASE_ON) return false;
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fb.auth = firebase.auth(); fb.db = firebase.firestore();
    window.__fbInitOk = true;
    return true;
  } catch (e) { return false; }
}
let saveTimer = null;
let syncFrozen = true;            /* no saves until enterApp installs THIS account's state */
let lastLocalEditTs = 0;          /* newest local change not yet echoed back */
let lastAppliedCloudTs = 0;       /* updatedAt of the newest cloud state we applied */
function cloudSave() {
  if (syncFrozen) return;
  lastLocalEditTs = Date.now();
  if (FIREBASE_ON && fb.docRef) {
    clearTimeout(saveTimer);
    const ref = fb.docRef, uid = currentUser ? currentUser.email : "";
    saveTimer = setTimeout(async () => {
      if (syncFrozen || !currentUser || currentUser.email !== uid || fb.docRef !== ref) return; /* account changed mid-flight: drop the write */
      const ts = Date.now();
      const payload = (window.__e2eeActive && window.e2eeBuildPayload) ? await window.e2eeBuildPayload(state) : { state: state, updatedAt: ts };
      ref.set(payload).then(() => { lastAppliedCloudTs = Math.max(lastAppliedCloudTs, ts); }).catch(e => { if (!window.__saveFailAt || Date.now() - window.__saveFailAt > 30000) { window.__saveFailAt = Date.now(); toast("Couldn't save your last change to the cloud — please check your connection."); } });
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
  $("authPass").autocomplete = m === "signup" ? "new-password" : "current-password";
}
function authError(msg) {
  $("authError").textContent = msg || "";
  const b = $("authSubmit"); if (b) { b.disabled = false; b.textContent = b.dataset.txt || b.textContent; }
  if (msg) { const card = document.querySelector(".auth-card"); if (card) { card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); } }
}

async function doAuth(ev) {
  ev.preventDefault(); authError("");
  const email = $("authEmail").value.trim().toLowerCase();
  const pass = $("authPass").value;
  window.__pendingPass = pass;
  const name = $("authName").value.trim();
  if (!email || pass.length < 6) { authError("Email and a 6+ character password are needed."); return; }
  const __sb = $("authSubmit"); if (__sb) { __sb.dataset.txt = __sb.textContent; __sb.disabled = true; __sb.textContent = "Please wait…"; }
  if (FIREBASE_ON) {
    try { const P = firebase.auth.Auth.Persistence; await fb.auth.setPersistence($("rememberMe") && $("rememberMe").checked ? P.LOCAL : P.SESSION); } catch (e) {}
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
    window.__e2eeDemoUser = email;
    if (users[email].encDoc && window.e2eeHandleDoc) { window.e2eeHandleDoc(users[email].encDoc, { email: email, name: users[email].name || "" }, "demo"); return; }
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
  syncFrozen = true; clearTimeout(saveTimer);
  if (window.e2eeLock) window.e2eeLock();
  const em = currentUser ? currentUser.email : null;
  if (em) sessionStorage.removeItem("pf_gate_" + em);
  if (FIREBASE_ON) { try { await fb.auth.signOut(); } catch (e) {} }
  localStorage.removeItem(LS_SESSION);
  currentUser = null; state = emptyState(); prices = {};
  if (fb.unsub) { fb.unsub(); fb.unsub = null; }
  $("appView").classList.add("hidden"); $("gateView").classList.add("hidden"); $("authView").classList.remove("hidden"); authError("");
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
  if (__enteredEmail && user && user.email === __enteredEmail && uiBusy()) { __pendingEnter = { user: user, s: initialState }; return; }
  __enteredEmail = user ? user.email : "";
  currentUser = user;
  state = normalizeState(initialState);
  syncFrozen = false;
  if (window.__symRepaired) { window.__symRepaired = false; try { persist(); } catch (e) {} }
  buildDatalist();
  if (needsGate()) { showGate(); return; }
  showApp();
  if (window.e2eeMaybeSetup) { try { window.e2eeMaybeSetup(user); } catch (e) {} }
}
function needsGate() {
  const t = state.profile && state.profile.totp;
  return !!(t && t.enabled && currentUser && sessionStorage.getItem("pf_gate_" + currentUser.email) !== "1");
}
function showGate() {
  $("authView").classList.add("hidden"); $("appView").classList.add("hidden");
  $("gateView").classList.remove("hidden");
  setTimeout(() => { const gp = $("gatePass"); if (gp) try { gp.focus(); } catch (e) {} }, 60);
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
  if (state.profile && !state.profile.termsSeen && localStorage.getItem("folio_terms_seen") !== "1") $("welcomeModal").classList.remove("hidden");
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
  let sugT = null;
  input.addEventListener("input", () => { clearTimeout(sugT); sugT = setTimeout(render, 300); });
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
async function fetchTO(url, ms, register) {
  const ctl = new AbortController();
  if (register) register.push(ctl);
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
  const ctls = [];
  for (const url of urls) for (const p of proxies) {
    attempts.push((async () => {
      const res = await fetchTO(p(url), 3500, ctls);
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
  try { return await Promise.any(attempts); } catch (e) { /* every NSE route failed */ } finally { ctls.forEach(c => { try { c.abort(); } catch (e) {} }); }
  if (sym.indexOf(".") < 0 && sym.charAt(0) !== "^") {
    const ctls2 = [];
    const boAttempts = proxies.map(p => (async () => {
      const res = await fetchTO(p(yahooUrl(sym).replace(".NS", ".BO")), 3500, ctls2);
      if (!res.ok) throw new Error("bad route");
      const j = await res.json();
      const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (!meta || !meta.regularMarketPrice) throw new Error("no data");
      let spark = [];
      try { const q = j.chart.result[0].indicators.quote[0].close || []; spark = q.filter(v => typeof v === "number"); } catch (e2) {}
      const prev = spark.length > 1 ? spark[spark.length - 2] : (meta.chartPreviousClose || meta.regularMarketPrice);
      return { price: meta.regularMarketPrice, prevClose: prev, ts: Date.now(), manual: false, spark: spark };
    })());
    try { return await Promise.any(boAttempts); } catch (e) { /* BSE failed too */ } finally { ctls2.forEach(c => { try { c.abort(); } catch (e) {} }); }
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
  }
  refreshing = false;
  savePricesLS();
  const any = Object.keys(prices).length;
  $("priceMeta").textContent = any ? "Prices updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · free data, ~15 min delay" : "Prices could not load right now — check internet, or set a price manually from a holding's ⋯ menu.";
  renderAfterPrices();
}
function renderAfterPrices() {
  const v = document.querySelector(".view:not(.hidden)");
  const name = v ? v.id.replace("view-", "") : "";
  if (name === "dashboard") renderDashboard();
  else if (name === "holdings") renderHoldings();
  else if (name === "watchlist") renderWatch();
  else if (name === "history") renderHistory();
  else renderAll();
}
function priceOf(sym) { return prices[sym] || null; }
/* Instant paint: last session's prices load from this device first (stale-
   while-revalidate) — the dashboard renders in 0ms, then fresh prices land. */
function savePricesLS() {
  try { const hp = {}; Object.keys(prices || {}).forEach(k => { hp[symHash(k)] = prices[k]; }); localStorage.setItem("folio_prices_v1", JSON.stringify({ ts: Date.now(), prices: hp })); } catch (e) {}
}
function loadPricesLS() {
  try {
    const o = JSON.parse(localStorage.getItem("folio_prices_v1") || "null");
    if (o && o.prices && Date.now() - o.ts < 24 * 3600 * 1000) { const um = symUnhashMap(); const up = {}; Object.keys(o.prices).forEach(k => { up[um.get(k) || k] = o.prices[k]; }); prices = up; }
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
/* ---------- editing shield ----------
   Background refreshes (price ticks, cloud echoes) must never rebuild
   the screen while the user is editing: a rebuild kills open forms.
   While a modal is open or a field has focus, renders are deferred
   and applied once the user is free. */
let __pendingEnter = null, __pendingRender = false, __enteredEmail = "";
function uiBusy() {
  if (document.querySelector(".modal:not(.hidden)")) return true;
  const ae = document.activeElement;
  /* Fields on the sign-in / gate screens are the entry flow itself, never
     "editing": counting them deferred app entry forever when the login was
     submitted with Enter/Go, because focus stays in the password field. */
  if (ae && ae.closest && (ae.closest("#authView") || ae.closest("#gateView"))) return false;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT") && ae.type !== "checkbox" && ae.type !== "radio" && ae.type !== "search") return true;
  return false;
}
const _renderAllCore = renderAll;
renderAll = function () { if (uiBusy()) { __pendingRender = true; return; } _renderAllCore(); };
setInterval(() => {
  if (uiBusy()) return;
  if (__pendingEnter) { const p = __pendingEnter; __pendingEnter = null; enterApp(p.user, p.s); }
  else if (__pendingRender) { __pendingRender = false; _renderAllCore(); }
}, 1200);
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
  const W = 100, H = 30, P = 4;
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
      <button class="hold-chev" data-hold-toggle="${esc(h.sym)}" type="button"><span class="chev-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Buy Dates, Status &amp; Edit</span><span class="chev-pill">Open ▼</span></button>
      <div class="hold-drawer" data-drawer="${esc(h.sym)}" data-avg="${h.avg}" data-ltp="${h.ltp === null ? "" : h.ltp}">
       <div class="drawer-inner">
        <div class="dr-block"><h4>Live Status</h4><div class="dr-status"><span class="muted small">Loading status…</span></div></div>
        <div class="dr-block"><h4>Purchase History — Your Buy Lots</h4>${lotsHtml}<p class="dr-tax">${taxLine}</p></div>
        <div class="dr-block"><h4>All Entries</h4>${txnHtml || '<p class="muted small">No entries.</p>'}</div>
        <div class="dr-block alerts"><h4>🔔 Price Alerts</h4>
          <div class="wi-row"><label>Target Price<input type="number" inputmode="decimal" class="al-target" min="0" step="any" placeholder="₹ target" value="${alertCfg && alertCfg.target ? alertCfg.target : ""}"></label><label>Stop-Loss Price<input type="number" inputmode="decimal" class="al-sl" min="0" step="any" placeholder="₹ stop-loss" value="${alertCfg && alertCfg.sl ? alertCfg.sl : ""}"></label></div>
          <div class="al-btns"><button class="mini-btn" data-alertsave="${esc(h.sym)}" type="button">Save Alert</button><button class="mini-btn danger" data-alertclear="${esc(h.sym)}" type="button">Clear</button><span class="price-meta">Alerts show on this card when the live price crosses them (checked on every refresh — not a broker order).</span></div>
        </div>
        <div class="dr-block whatif" data-qty="${h.qty}" data-avg="${h.avg}" data-inv="${h.invested}"><h4>What-If Average Calculator</h4>
          <div class="wi-row"><label>New Qty<input type="number" inputmode="decimal" class="wi-qty" min="0" step="any" placeholder="0"></label><label>Buy Price<input type="number" inputmode="decimal" class="wi-price" min="0" step="any" value="${h.ltp === null ? "" : h.ltp.toFixed(2)}"></label></div>
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
    deleteTxnWithConfirm(b.dataset.deltxn);
  }));
  el.querySelectorAll("[data-hold-toggle]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".hold-card");
    const drawer = card && card.querySelector(".hold-drawer");
    if (!drawer) return;
    const opening = !card.classList.contains("open");
    card.classList.toggle("open", opening);
    card.querySelectorAll(".chev-pill").forEach(c => c.textContent = opening ? "Close ▲" : "Open ▼");
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
      const drw = w.closest(".hold-drawer"); const ltp2 = drw && drw.dataset.ltp !== "" && drw.dataset.ltp != null ? Number(drw.dataset.ltp) : null;
      let extra2 = "";
      if (ltp2) { const nqty = cq + nq; const npnl = (ltp2 - na) * nqty; let tot2 = 0; try { tot2 = enriched().value || 0; } catch (err) {} const wgt2 = (tot2 + nq * pr) > 0 ? (ltp2 * nqty) / (tot2 + nq * pr) * 100 : 0; extra2 = " · New P&L at " + inr2(ltp2) + ": <b>" + inr(npnl) + "</b> · New Weight: <b>" + wgt2.toFixed(1) + "%</b>"; }
      out.innerHTML = "New Avg Price: <b>" + inr2(na) + "</b> · New Total Invested: <b>" + inr(ci + nq * pr) + "</b> · Total Qty: <b>" + (cq + nq) + "</b>" + extra2;
    };
    qtyEl.addEventListener("input", calc);
    priceEl.addEventListener("input", calc);
  });
}
function holdingAction(ds) {
  if (ds.act === "chart") { if (typeof openStock === "function") openStock(ds.sym); return; }
  if (ds.act === "del") {
    folioConfirm("Remove ALL entries of " + ds.sym + " (buys, sells, dividends)?", "Remove all").then(ok => {
      if (!ok) return;
      const removed = state.txns.filter(t => t.sym === ds.sym);
      state.txns = state.txns.filter(t => t.sym !== ds.sym); persist(); renderAll();
      toast(ds.sym + " removed", () => { state.txns.push(...removed); persist(); renderAll(); toast(ds.sym + " restored"); });
    });
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
    let p = priceOf(w.sym);
    try {
      const hc = (typeof histCache !== "undefined" && histCache[w.sym + "|1y"]) || (typeof histLsGet === "function" && histLsGet(w.sym + "|1y"));
      if (hc && hc.points && hc.points.length) {
        if (typeof histCache !== "undefined" && !histCache[w.sym + "|1y"]) histCache[w.sym + "|1y"] = hc;
        const pts = hc.points, last = pts[pts.length - 1], prev = pts.length > 1 ? pts[pts.length - 2] : null;
        if (!p) p = { price: last.c, prevClose: prev ? prev.c : null, spark: pts.slice(-30).map(x => x.c) };
        else if (!p.spark || p.spark.length < 2) p = Object.assign({}, p, { spark: pts.slice(-30).map(x => x.c) });
      }
    } catch (e) {}
    const chg = p && p.prevClose ? (p.price - p.prevClose) / p.prevClose * 100 : null;
    return `<div class="watchlist-row" data-wrow="${esc(w.sym)}">
      <button class="star-btn ${w.fav ? "fav" : ""}" data-star="${esc(w.sym)}" type="button" aria-label="Favourite">${w.fav ? "★" : "☆"}</button>
      <div class="w-id"><span class="w-sym">${esc(w.sym)}</span><span class="w-name">${esc(w.name)}</span></div>
      <div class="watch-spark">${p && p.spark && p.spark.length > 1 ? sparkSvg(p.spark) : p ? '<span class="spark-nodata">No chart data</span>' : refreshing ? '<span class="spark-skel" aria-hidden="true"></span>' : '<button type="button" class="spark-retry" data-spark-retry="' + esc(w.sym) + '" aria-label="Retry chart for ' + esc(w.sym) + '">No chart data \u21BB</button>'}</div>
      <div class="w-price" data-pflash="${esc(w.sym)}"><span class="wp-price">${p ? inr2(p.price) : "—"}</span>${chg !== null ? `<span class="wp-pill ${chg >= 0 ? "gain" : "loss"}">${chg >= 0 ? "▲" : "▼"} ${pct(chg)}</span>` : `<span class="wp-pill flat">—</span>`}</div>
      <button class="watch-x" data-unwatch="${esc(w.sym)}" type="button" aria-label="Remove from watchlist">🗑️</button>
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
    row.addEventListener("click", () => { if (typeof openStock === "function") openStock(row.dataset.wrow); });
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
    deleteTxnWithConfirm(b.dataset.deltxn);
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
    '<input type="number" inputmode="decimal" class="bt-qty" min="0" step="any" placeholder="Qty">' +
    '<input type="number" inputmode="decimal" class="bt-price" min="0" step="any" placeholder="Price">' +
    '<input class="bt-amount" readonly placeholder="Amount">' +
    '<span class="bt-btns"><button type="button" class="icon-btn bt-optbtn" title="Optional: broker, charges, notes">＋</button>' +
    '<button type="button" class="icon-btn bt-del" title="Remove this row">🗑</button></span>' +
    '</div>' +
    '<div class="bt-optbox hidden">' +
    '<label>Select Broker<select class="bt-broker"><option>Zerodha</option><option>Dhan</option><option>Groww</option><option>Upstox</option><option>Other</option></select></label>' +
    '<label>Total Charges (₹)<input type="number" inputmode="decimal" class="bt-charges" min="0" step="any" placeholder="0"></label>' +
    '<label>Net Amount<input class="bt-net" readonly placeholder="—"></label>' +
    '<label>Notes<input type="text" class="bt-note" placeholder="Note for future reference"></label>' +
    '<label>Tags<input type="text" class="bt-tags" placeholder="e.g. breakout, long-term, tip"></label>' +
    '<label>Reason<input type="text" class="bt-reason" placeholder="Why this trade? (journal)"></label>' +
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
    if (prefill.tags) { q(".bt-tags").value = prefill.tags; q(".bt-optbox").classList.remove("hidden"); }
    if (prefill.reason) { q(".bt-reason").value = prefill.reason; q(".bt-optbox").classList.remove("hidden"); }
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
  box.appendChild(batchRow({ type: t.type, stock: t.name && t.name !== t.sym ? t.name : t.sym, exch: t.exch || "NSE", date: t.date, qty: t.qty, price: t.price, charges: t.charges || 0, broker: t.broker || "Zerodha", note: t.note || "", tags: t.tags || "", reason: t.reason || "" }));
  $("txnError").textContent = "Editing your " + t.type + " entry of " + t.sym + " — saving replaces the old entry.";
  $("txnModal").classList.remove("hidden");
}
function closeTxn() { window.__editTxnId = null; $("txnModal").classList.add("hidden"); }
function saveTxn(ev) {
  ev.preventDefault();
  const rows = [...document.querySelectorAll(".bt-row")];
  const sellsQueued = {};
  const buysQueued = {};
  const editSellBack = {};
  if (window.__editTxnId && document.querySelectorAll(".bt-row").length === 1) {
    const orig = state.txns.find(t => t.id === window.__editTxnId);
    if (orig && orig.type === "SELL") editSellBack[orig.sym] = Number(orig.qty) || 0;
  }
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
    if (type === "DIV" && !(price > 0)) { $("txnError").textContent = st.sym + ": please enter the dividend amount received."; return; }
    if (type !== "DIV" && !(qty > 0)) { $("txnError").textContent = st.sym + ": quantity must be more than 0."; return; }
    if (type === "BUY") buysQueued[st.sym] = (buysQueued[st.sym] || 0) + qty;
    if (type === "SELL") {
      const h = computeHoldings().holdings.find(x => x.sym === st.sym);
      const have = (h ? h.qty : 0) + (buysQueued[st.sym] || 0) + (editSellBack[st.sym] || 0) - (sellsQueued[st.sym] || 0);
      if (qty > have) { $("txnError").textContent = "You hold only " + have + " shares of " + st.sym + "."; return; }
      sellsQueued[st.sym] = (sellsQueued[st.sym] || 0) + qty;
    }
    adds.push({ id: uid(), type: type, sym: st.sym, name: st.name, sector: st.sector, qty: qty, price: price, date: date, exch: q(".bt-exch").value, broker: q(".bt-broker").value, charges: Number(q(".bt-charges").value) || 0, note: q(".bt-note").value.trim(), tags: q(".bt-tags").value.trim(), reason: q(".bt-reason").value.trim() });
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
  const lines = ["Date,Type,Symbol,Name,Qty,Price,Charges,Broker,Exchange,Note,Tags,Reason"];
  [...state.txns].sort((a, b) => a.date < b.date ? -1 : 1).forEach(t =>
    lines.push([t.date, t.type, t.sym, '"' + String(t.name || "").replace(/"/g, '""') + '"', t.qty, t.price, t.charges || 0, t.broker || "", t.exch || "", '"' + String(t.note || "").replace(/"/g, '""') + '",' + '"' + String(t.tags || "").replace(/"/g, '""') + '",' + '"' + String(t.reason || "").replace(/"/g, '""') + '"'].join(",")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "folio-portfolio.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast("CSV downloaded — keep it safe, it is your backup.");
}
let xlsxLibPromise = null;
function loadXlsxLib() {
  if (window.XLSX) return Promise.resolve(true);
  if (xlsxLibPromise) return xlsxLibPromise;
  xlsxLibPromise = new Promise(res => {
    const sc = document.createElement("script");
    sc.src = "assets/xlsx.full.min.js?v=1";
    sc.onload = () => res(!!window.XLSX);
    sc.onerror = () => res(false);
    document.head.appendChild(sc);
  });
  return xlsxLibPromise;
}
function impStatus(msg, pct) {
  const box = $("importStatus"); if (!box) return;
  box.classList.remove("hidden");
  if ($("impText")) $("impText").textContent = msg;
  if ($("impBarFill") && typeof pct === "number") $("impBarFill").style.width = pct + "%";
}
function impFinish(res, fileName) {
  const fromModal = !!window.__importFromModal;
  window.__importFromModal = false;
  if (!res || res.error) {
    const msg = (res && res.error) || "That file could not be read.";
    if (fromModal) impStatus("⚠️ " + msg, 100);
    toast(msg);
    return;
  }
  const msg = "Imported " + res.n + " entries" + (res.skipped ? " · " + res.skipped + " rows skipped" : "") + (res.holdingsMode ? " · holdings format — buy dates set to today (the file has none)" : res.mapped ? " · broker format detected" : "") + ".";
  if (fromModal) {
    impStatus("✅ Done — " + res.n + " stocks added from " + (fileName || "your file") + ". Opening your Holdings…", 100);
    setTimeout(() => {
      const m = $("txnModal"); if (m) m.classList.add("hidden");
      const box = $("importStatus"); if (box) box.classList.add("hidden");
      switchView("holdings");
    }, 1000);
  }
  toast(msg);
}
function importFile(file) {
  if (window.__importFromModal) impStatus("📄 " + (file ? file.name : "file") + " — reading…", 25);
  const name = (file && file.name || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) { importExcel(file); return; }
  importCsv(file);
}
function importExcel(file) {
  loadXlsxLib().then(ok => {
    if (!ok || !window.XLSX) { impFinish({ error: "The Excel reader could not load — please try a CSV export instead." }, file && file.name); return; }
    if (window.__importFromModal) impStatus("📄 " + file.name + " — reading the Excel file…", 55);
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const wb = XLSX.read(new Uint8Array(rd.result), { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
        if (window.__importFromModal) impStatus("⚙️ Importing your stocks…", 80);
        impFinish(importRows(rows), file.name);
      } catch (e) { impFinish({ error: "That Excel file could not be read." }, file.name); }
    };
    rd.onerror = () => impFinish({ error: "That file could not be read." }, file.name);
    rd.readAsArrayBuffer(file);
  });
}
function importCsv(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const lines = String(rd.result).split(/\r?\n/).filter(r => r.trim());
      if (lines.length < 2) { toast("That file looks empty."); return; }
      const splitRow = r => r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.replace(/^"|"$/g, "").trim());
      impFinish(importRows(lines.map(splitRow)), file.name);
    } catch (e) { impFinish({ error: "That CSV could not be read." }, file.name); }
  };
  rd.onerror = () => impFinish({ error: "That file could not be read." }, file.name);
  rd.readAsText(file);
}
function importRows(allRows) {
    try {
      const rows = (allRows || []).filter(r => r && r.some(c => String(c).trim() !== ""));
      if (rows.length < 2) return { n: 0, skipped: 0, error: "That file looks empty." };
      const ALIAS_WORDS = ["symbol", "instrument", "trading symbol", "scrip", "date", "trade date", "quantity", "qty", "price", "trade type", "type"];
      let hIdx = rows.findIndex(r => { const cells = r.map(c => String(c).toLowerCase().trim()); return cells.filter(c => ALIAS_WORDS.some(w => c === w || c.includes(w))).length >= 3; });
      if (hIdx < 0) hIdx = 0;
      const header = rows[hIdx].map(h => String(h).toLowerCase().replace(/\s+/g, " ").trim());
      const ALIASES = {
        sym: ["symbol", "instrument", "trading symbol", "tradingsymbol", "scrip", "scrip name", "stock", "symbol name", "company"],
        date: ["date", "trade date", "trade_date", "order execution time", "execution time", "transaction date", "order time"],
        type: ["type", "trade type", "trade_type", "transaction type", "buy/sell", "side", "txn type"],
        qty: ["qty", "quantity", "filled qty", "qty.", "shares", "quantity filled"],
        price: ["price", "trade price", "avg. cost", "avg cost", "average price", "rate", "price per share", "avg. price"],
        tags: ["tags", "tag"],
        reason: ["reason"]
      };
      const col = {};
      for (const k of Object.keys(ALIASES)) col[k] = header.findIndex(h => ALIASES[k].includes(h));
      col.segment = header.findIndex(h => h === "segment");
      const hasDate = col.date >= 0;
      const mapped = col.sym >= 0 && col.qty >= 0 && col.price >= 0;
      const holdingsMode = mapped && !hasDate;
      let n = 0, skipped = 0;
      const normDate = v => {
        if (v instanceof Date && !isNaN(v)) return v.getFullYear() + "-" + String(v.getMonth() + 1).padStart(2, "0") + "-" + String(v.getDate()).padStart(2, "0");
        if (typeof v === "number" && v > 20000 && v < 90000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
        v = String(v || "").trim();
        let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + "-" + m[2] + "-" + m[3];
        m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (m) return m[3] + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0");
        return "";
      };
      const num = v => (typeof v === "number" ? v : Number(String(v || "").replace(/[^0-9.\-]/g, ""))) || 0;
      for (const r of rows.slice(hIdx + 1)) {
        const c = r.map(x => (x instanceof Date || typeof x === "number") ? x : String(x == null ? "" : x));
        if (col.segment >= 0 && c[col.segment] && !/^(EQ|BE|NSE|BSE)/i.test(String(c[col.segment]))) { skipped++; continue; }
        let symCell, dateCell, typeCell, qtyCell, priceCell, charges = 0, broker = "", exch = "", note = "", tags = "", reason = "";
        if (mapped) {
          symCell = c[col.sym]; dateCell = hasDate ? c[col.date] : ""; typeCell = col.type >= 0 ? c[col.type] : "BUY";
          qtyCell = c[col.qty]; priceCell = c[col.price]; if (col.tags >= 0) tags = c[col.tags] || ""; if (col.reason >= 0) reason = c[col.reason] || "";
        } else {
          if (c.length < 6) { skipped++; continue; }
          dateCell = c[0]; typeCell = c[1]; symCell = c[2]; qtyCell = c[4]; priceCell = c[5];
          charges = num(c[6]); broker = c[7] || ""; exch = c[8] || ""; note = c[9] || ""; tags = c[10] || ""; reason = c[11] || "";
        }
        let date = normDate(dateCell);
        if (!date && holdingsMode) { date = (window.istTodayStr ? istTodayStr() : new Date().toISOString().slice(0, 10)); note = (note ? note + " · " : "") + "Holdings import — buy date is the import date"; }
        const tu = String(typeCell || "").toUpperCase();
        const type = tu.includes("SELL") || tu === "S" ? "SELL" : tu.includes("DIV") ? "DIV" : "BUY";
        const qty = num(qtyCell), price = num(priceCell);
        if (!date || !symCell || !(price >= 0) || (type !== "DIV" && !(qty > 0))) { skipped++; continue; }
        const rawSym = String(symCell).toUpperCase().trim();
        const hit = (window.STOCK_LIST || []).find(x => x[0] === rawSym);
        const st = hit ? { sym: hit[0], name: hit[1], sector: hit[2] || "Other" } : resolveStock(symCell);
        if (!st.sym) { skipped++; continue; }
        state.txns.push({ id: uid(), date: date, type: type, sym: st.sym, name: st.name, sector: st.sector || "Other", qty: type === "DIV" ? 0 : qty, price: price, charges: charges, broker: broker, exch: exch, note: note, tags: tags, reason: reason });
        n++;
      }
      persist(); renderAll(); refreshPrices();
      return { n: n, skipped: skipped, holdingsMode: holdingsMode, mapped: mapped };
    } catch (e) { return { n: 0, skipped: 0, error: "That file could not be read." }; }
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
  window.refreshDemoBanner = function () { const b = $("demoBanner"); if (!b) return; const ready = !!window.__fbInitOk; b.classList.toggle("hidden", ready); if (!ready) b.textContent = window.FIREBASE_CONFIG ? "Cloud sign-in could not load (network) — you can still use Folio on this device, and your cloud account and data are safe. Reopen the app on a better connection for cloud saving." : "Demo mode is ON — data is saved only in this browser. Cloud saving starts when the Firebase keys are added."; };
  setAuthMode("login");
  $("tabLogin").addEventListener("click", () => setAuthMode("login"));
  $("tabSignup").addEventListener("click", () => setAuthMode("signup"));
  $("authForm").addEventListener("submit", doAuth);
  setTimeout(() => { try { if (!$("authView").classList.contains("hidden")) $("authEmail").focus(); } catch (e) {} }, 350);
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
    try { localStorage.setItem("folio_terms_seen", "1"); } catch (e) {}
    $("welcomeModal").classList.add("hidden");
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
  const fpBtn = $("filePickBtn");
  if (fpBtn && fpBtn.tagName === "BUTTON") fpBtn.addEventListener("click", () => $("importFile").click());
  if (fpBtn) fpBtn.addEventListener("click", () => { window.__importFromModal = true; });
  $("watchForm").addEventListener("submit", addWatch);
  attachSuggest($("watchInput"));
  $("exportBtn").addEventListener("click", exportCsv);
  $("importFile").addEventListener("change", e => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ""; });
  $("wipeBtn").addEventListener("click", () => {
    folioConfirm("Delete ALL your entries? Take a CSV export first if unsure.", "Delete all").then(ok => {
      if (!ok) return;
      const old = state;
      state = emptyState(); persist(); renderAll();
      toast("All entries deleted", () => { state = old; persist(); renderAll(); toast("Entries restored"); });
    });
  });
  $("resetPassBtn").addEventListener("click", async () => {
    if (FIREBASE_ON && currentUser) {
      try { await fb.auth.sendPasswordResetEmail(currentUser.email); toast("Reset email sent to " + currentUser.email); }
      catch (e) { toast("Could not send reset email right now."); }
    } else toast("In demo mode, your password is saved in this browser only.");
  });

  const fbOn = initFirebase();
  if (window.refreshDemoBanner) window.refreshDemoBanner();
  if (fbOn) {
    fb.auth.onAuthStateChanged(user => {
      syncFrozen = true; clearTimeout(saveTimer);
      if (user) {
        fb.docRef = fb.db.collection("users").doc(user.uid);
        if (fb.unsub) fb.unsub();
        fb.unsub = fb.docRef.onSnapshot(doc => {
          const data = doc.exists ? doc.data() : null;
          const ts = data && data.updatedAt ? data.updatedAt : 0;
          if (ts && ts < lastAppliedCloudTs) return;               /* older echo: never roll back */
          if (ts && lastLocalEditTs > ts) { cloudSave(); return; } /* our newer edits win; re-push them */
          if (ts) lastAppliedCloudTs = ts;
          if (data && data.v === 2 && window.e2eeHandleDoc) { window.e2eeHandleDoc(data, { email: user.email, name: user.displayName || "" }, "cloud"); return; }
          enterApp({ email: user.email, name: user.displayName || "" }, data && data.state ? data.state : emptyState());
        }, err => {
          try {
            authError("Couldn't load your data. Check your connection, then tap Retry.");
            let rb = $("authRetryBtn");
            if (!rb) { rb = document.createElement("button"); rb.id = "authRetryBtn"; rb.type = "button"; rb.className = "btn btn-gold btn-block"; rb.textContent = "Retry"; rb.addEventListener("click", () => location.reload()); $("authForm").after(rb); }
            rb.classList.remove("hidden");
          } catch (e2) {}
        });
      } else {
        $("appView").classList.add("hidden"); $("authView").classList.remove("hidden"); authError("");
      }
    });
  } else {
    const sess = localStorage.getItem(LS_SESSION);
    if (sess && lsUsers()[sess]) {
      window.__e2eeDemoUser = sess;
      const rec = lsUsers()[sess];
      if (rec.encDoc && window.e2eeHandleDoc) window.e2eeHandleDoc(rec.encDoc, { email: sess, name: rec.name || "" }, "demo");
      else enterApp({ email: sess, name: rec.name || "" }, rec.state);
    }
  }
});
