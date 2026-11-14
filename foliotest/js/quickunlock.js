"use strict";
/* ================================================================
   Quick unlock (v96) — a device-local convenience unlock for the
   end-to-end encrypted vault. The vault itself is NOT changed:
   same master key, same password / seed-phrase / recovery-code
   wraps, same encryption. Quick unlock adds ONE extra wrap of the
   master key that exists only in this device's IndexedDB:
     - the wrap's secret is a random 32-byte device secret;
     - that secret is itself stored only encrypted — behind a
       WebAuthn platform verification (fingerprint / face / phone
       PIN or pattern; PRF output as the key when the browser
       supports it, otherwise a non-extractable IndexedDB device
       key that is used only after a verified WebAuthn assertion),
       and/or behind an optional 6-digit app PIN (PBKDF2, 600k
       rounds — the same KDF as the vault's own wraps).
   Nothing here is uploaded anywhere. Signing out wipes it. The
   master methods always remain the fallback.
   ================================================================ */
const QUICK_DB = "folio-quickunlock";
const QUICK_REC = "rec";
const QUICK_DEVKEY = "devkey";
let quickDbPromise = null;

function qdb() {
  if (quickDbPromise) return quickDbPromise;
  quickDbPromise = new Promise((resolve, reject) => {
    try {
      const rq = indexedDB.open(QUICK_DB, 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore("kv"); } catch (e) {} };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    } catch (e) { reject(e); }
  });
  return quickDbPromise;
}
async function qget(key) {
  const db = await qdb();
  return new Promise((resolve, reject) => {
    const rq = db.transaction("kv", "readonly").objectStore("kv").get(key);
    rq.onsuccess = () => resolve(rq.result === undefined ? null : rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
async function qset(key, val) {
  const db = await qdb();
  return new Promise((resolve, reject) => {
    const rq = db.transaction("kv", "readwrite").objectStore("kv").put(val, key);
    rq.onsuccess = () => resolve(true);
    rq.onerror = () => reject(rq.error);
  });
}
async function qdel(key) {
  const db = await qdb();
  return new Promise((resolve, reject) => {
    const rq = db.transaction("kv", "readwrite").objectStore("kv").delete(key);
    rq.onsuccess = () => resolve(true);
    rq.onerror = () => reject(rq.error);
  });
}
async function quickRecord() { try { return await qget(QUICK_REC); } catch (e) { return null; } }
window.quickWipe = async function () {
  try { await qdel(QUICK_REC); } catch (e) {}
  try { await qdel(QUICK_DEVKEY); } catch (e) {}
};

/* ---------------- small helpers ---------------- */
function b64urlEncode(buf) { return b64encode(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlDecode(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return b64decode(s); }
let quickPrfSaltP = null;
function quickPrfSalt() {
  if (!quickPrfSaltP) quickPrfSaltP = crypto.subtle.digest("SHA-256", TE.encode("folio-quickunlock-prf-v1"));
  return quickPrfSaltP;
}
function quickCfg() {
  try { const c = JSON.parse(localStorage.getItem("folio_quick_cfg") || "{}"); if ([0, 1, 5, 15].includes(c.mins)) return c; } catch (e) {}
  return { mins: 1 };
}
function quickSetCfg(mins) { try { localStorage.setItem("folio_quick_cfg", JSON.stringify({ mins: mins })); } catch (e) {} }
function quickEmail() {
  return (typeof E2 !== "undefined" && E2.pendingUser && E2.pendingUser.email) || (typeof currentUser !== "undefined" && currentUser && currentUser.email) || "";
}
async function quickBioAvailable() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials || !window.isSecureContext) return false;
    return !!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch (e) { return false; }
}

/* ---------------- WebAuthn ---------------- */
async function quickAssert(credIdB64Url, wantPrf) {
  const opts = { challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: "public-key", id: b64urlDecode(credIdB64Url) }],
    userVerification: "required", timeout: 60000 };
  if (wantPrf) opts.extensions = { prf: { eval: { first: await quickPrfSalt() } } };
  const a = await navigator.credentials.get({ publicKey: opts });
  if (!a) throw new Error("Verification was cancelled.");
  const ext = a.getClientExtensionResults ? a.getClientExtensionResults() : {};
  return (ext.prf && ext.prf.results && ext.prf.results.first) || null;
}
async function quickEnrollBio(deviceSecret) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { id: location.hostname, name: "Folio — Singh Caizen" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: quickEmail(), displayName: quickEmail() },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
    attestation: "none", timeout: 60000,
    extensions: { prf: { eval: { first: await quickPrfSalt() } } }
  } });
  if (!cred) throw new Error("Fingerprint setup was cancelled.");
  const credId = b64urlEncode(cred.rawId);
  const ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
  let prfOut = (ext.prf && ext.prf.results && ext.prf.results.first) || null;
  if (!prfOut && ext.prf && ext.prf.enabled) { try { prfOut = await quickAssert(credId, true); } catch (e) {} }
  if (prfOut) {
    const kek = await crypto.subtle.importKey("raw", prfOut, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    const pack = await aesEnc(kek, TE.encode(deviceSecret));
    return { credId: credId, mode: "prf", iv: pack.iv, data: pack.data };
  }
  /* PRF not available: a non-extractable device key in IndexedDB holds the
     secret; it is used only after a verified WebAuthn assertion succeeds. */
  const devKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await qset(QUICK_DEVKEY, devKey);
  const pack = await aesEnc(devKey, TE.encode(deviceSecret));
  return { credId: credId, mode: "dev", iv: pack.iv, data: pack.data };
}
async function quickBioSecret(rec) {
  if (rec.bio.mode === "prf") {
    const prfOut = await quickAssert(rec.bio.credId, true);
    if (!prfOut) throw new Error("This device could not produce the unlock key. Use your app PIN or account password.");
    const kek = await crypto.subtle.importKey("raw", prfOut, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    return TD.decode(await aesDec(kek, { iv: rec.bio.iv, data: rec.bio.data }));
  }
  await quickAssert(rec.bio.credId, false); /* the phone verifies the person first */
  const devKey = await qget(QUICK_DEVKEY);
  if (!devKey) throw new Error("This device's quick-unlock key is missing. Use your account password.");
  return TD.decode(await aesDec(devKey, { iv: rec.bio.iv, data: rec.bio.data }));
}

/* ---------------- app PIN ---------------- */
async function quickPinWrap(pin, deviceSecret) {
  const salt = b64encode(crypto.getRandomValues(new Uint8Array(16)));
  const kek = await e2eeKek(pin, salt);
  const pack = await aesEnc(kek, TE.encode(deviceSecret));
  return { salt: salt, iv: pack.iv, data: pack.data, fails: 0, lockUntil: 0 };
}
async function quickPinSecret(pin, rec) {
  const kek = await e2eeKek(pin, rec.pin.salt);
  return TD.decode(await aesDec(kek, { iv: rec.pin.iv, data: rec.pin.data }));
}
function quickPinWaitSecs(rec) {
  if (!rec.pin || !rec.pin.lockUntil) return 0;
  return Math.max(0, Math.ceil((rec.pin.lockUntil - Date.now()) / 1000));
}

/* ---------------- finishing an unlock ---------------- */
async function quickFinish(deviceSecret, rec) {
  const ok = await e2eeUnwrapFrom(rec.wrap, deviceSecret);
  if (!ok) return false;
  /* blur first: a still-focused PIN field would make the editing shield
     defer app entry until the field loses focus (the v95 Enter lesson) */
  if (document.activeElement && document.activeElement.blur) { try { document.activeElement.blur(); } catch (e) {} }
  hideQuickLock();
  await e2eeFinish();
  if (window.e2eeSecRefresh) try { e2eeSecRefresh(); } catch (e) {}
  refreshQuickRow();
  return true;
}

/* ---------------- the gate: quick card or the master sheet ---------------- */
window.quickGate = async function () {
  try {
    const rec = await quickRecord();
    const em = quickEmail();
    if (rec && em && rec.email === em && window.e2eeNeedsUnlock && window.e2eeNeedsUnlock()) {
      if (rec.skip) { /* Skip password on this device: silent auto-unlock */
        try {
          const devKey = await qget(QUICK_DEVKEY);
          if (devKey) {
            const secret = TD.decode(await aesDec(devKey, { iv: rec.skip.iv, data: rec.skip.data }));
            if (await quickFinish(secret, rec)) return;
          }
        } catch (e) {}
        e2eeShowUnlock(); /* skip failed on this device \u2014 fall back to the master sheet */
        return;
      }
      showQuickLock(rec);
      return;
    }
  } catch (e) {}
  e2eeShowUnlock();
};

/* ---------------- lock card ---------------- */
function hideQuickLock() { const m = $("quickLock"); if (m) m.classList.add("hidden"); }
function showQuickLock(rec) {
  let m = $("quickLock");
  if (!m) {
    m = document.createElement("div");
    m.id = "quickLock"; m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Folio is locked");
    m.innerHTML =
      '<div class="modal-card quick-card">' +
      '<div class="quick-lock-head"><span class="quick-lock-ico" aria-hidden="true">🔐</span><h3>Folio is locked</h3>' +
      '<p class="muted">Unlock quickly on this device — your data stays encrypted until you do.</p></div>' +
      '<p class="form-error" id="quickMsg"></p>' +
      '<div id="quickMain">' +
      '<button type="button" class="btn btn-gold btn-block" id="quickBioBtn">Unlock with fingerprint / face / phone PIN</button>' +
      '<button type="button" class="btn btn-block" id="quickPinBtn" style="margin-top:8px">Use app PIN</button>' +
      '<button type="button" class="btn btn-block" id="quickPwBtn" style="margin-top:8px">Use account password</button>' +
      "</div>" +
      '<form id="quickPinForm" class="hidden" autocomplete="off">' +
      '<label class="fld">Your 6-digit app PIN<input type="password" id="quickPinInput" inputmode="numeric" autocomplete="off" enterkeyhint="go" maxlength="6" placeholder="••••••"></label>' +
      '<p class="form-error" id="quickPinMsg"></p>' +
      '<button type="submit" class="btn btn-gold btn-block" id="quickPinGo">Unlock</button>' +
      '<button type="button" class="btn btn-block" id="quickPinBack" style="margin-top:8px">Back</button>' +
      "</form>" +
      "</div>";
    document.body.appendChild(m);
    $("quickBioBtn").addEventListener("click", () => quickBioFlow());
    $("quickPinBtn").addEventListener("click", () => quickShowPinPane());
    $("quickPwBtn").addEventListener("click", () => { hideQuickLock(); e2eeShowUnlock(); });
    $("quickPinBack").addEventListener("click", () => quickShowMainPane());
    $("quickPinForm").addEventListener("submit", e => { e.preventDefault(); quickPinFlow(); });
  }
  m.dataset.email = rec.email;
  $("quickBioBtn").style.display = rec.bio ? "" : "none";
  $("quickPinBtn").style.display = rec.pin ? "" : "none";
  $("quickMsg").textContent = "";
  quickShowMainPane();
  m.classList.remove("hidden");
  if (rec.bio) setTimeout(() => { if (!$("quickLock").classList.contains("hidden")) quickBioFlow(true); }, 400);
}
function quickShowMainPane() {
  const f = $("quickPinForm"), mn = $("quickMain");
  if (f) f.classList.add("hidden");
  if (mn) mn.classList.remove("hidden");
}
async function quickShowPinPane() {
  const rec = await quickRecord();
  if (!rec || !rec.pin) { quickShowMainPane(); return; }
  $("quickMain").classList.add("hidden");
  $("quickPinForm").classList.remove("hidden");
  $("quickPinInput").value = "";
  const wait = quickPinWaitSecs(rec);
  $("quickPinMsg").textContent = wait > 0 ? "Too many wrong tries. Wait " + wait + " seconds, or use your account password." : "";
  setTimeout(() => { const i = $("quickPinInput"); if (i) try { i.focus(); } catch (e) {} }, 60);
}
let quickBioBusy = false;
async function quickBioFlow(auto) {
  if (quickBioBusy) return;
  const rec = await quickRecord();
  if (!rec || !rec.bio) return;
  quickBioBusy = true;
  const msg = $("quickMsg");
  if (msg) msg.textContent = "";
  try {
    const secret = await quickBioSecret(rec);
    const ok = await quickFinish(secret, rec);
    if (!ok && msg) msg.textContent = "That did not unlock your data. Try again, or use your account password.";
  } catch (e) {
    if (msg && !auto) msg.textContent = (e && e.message) || "Verification did not complete. Try again, or use your account password.";
    else if (msg && auto) msg.textContent = "Tap the button below and verify with your fingerprint, face or phone PIN.";
  }
  quickBioBusy = false;
}
async function quickPinFlow() {
  const rec = await quickRecord();
  if (!rec || !rec.pin) return;
  const pinEl = $("quickPinInput"), msg = $("quickPinMsg"), btn = $("quickPinGo");
  const pin = (pinEl.value || "").replace(/\D/g, "");
  if (quickPinWaitSecs(rec) > 0) { msg.textContent = "Please wait " + quickPinWaitSecs(rec) + " seconds before trying again — or use your account password."; return; }
  if (pin.length !== 6) { msg.textContent = "Enter your full 6-digit PIN."; return; }
  btn.disabled = true; btn.textContent = "Checking…";
  let secret = null;
  try { secret = await quickPinSecret(pin, rec); } catch (e) { secret = null; }
  btn.disabled = false; btn.textContent = "Unlock";
  if (secret) {
    rec.pin.fails = 0; rec.pin.lockUntil = 0;
    try { await qset(QUICK_REC, rec); } catch (e) {}
    const ok = await quickFinish(secret, rec);
    if (!ok) msg.textContent = "That did not unlock your data. Use your account password.";
    return;
  }
  rec.pin.fails = (rec.pin.fails || 0) + 1;
  if (rec.pin.fails >= 10) {
    await window.quickWipe();
    hideQuickLock();
    toast("Too many wrong PINs — Quick unlock has been turned off on this device. Unlock with your account password.");
    e2eeShowUnlock();
    return;
  }
  if (rec.pin.fails >= 5) {
    const wait = Math.min(30 * Math.pow(2, rec.pin.fails - 5), 900);
    rec.pin.lockUntil = Date.now() + wait * 1000;
    msg.textContent = "Wrong PIN (try " + rec.pin.fails + " of 10). Wait " + wait + " seconds before the next try.";
  } else {
    msg.textContent = "Wrong PIN (try " + rec.pin.fails + " of 10). After 10 wrong tries Quick unlock turns itself off.";
  }
  try { await qset(QUICK_REC, rec); } catch (e) {}
  pinEl.value = "";
  const card = pinEl.closest(".modal-card");
  if (card) { card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); }
}

/* ---------------- enrolment ---------------- */
let quickPending = null; /* { secret, rec } while the offer dialog is open; never stored until saved */
let quickOfferedSession = false;
async function quickStartPending() {
  const secret = b64encode(crypto.getRandomValues(new Uint8Array(32)));
  const wrap = await e2eeWrapDek(E2.dekRaw, secret);
  quickPending = { secret: secret, rec: { v: 1, email: quickEmail(), wrap: wrap } };
  return quickPending;
}
async function quickSavePending() {
  if (!quickPending) return false;
  try { const old = await quickRecord(); if (old && old.skip && old.email === quickPending.rec.email) toast("Password skip was turned OFF on this device \u2014 Quick unlock and Skip password cannot both be on."); } catch (e) {}
  await qset(QUICK_REC, quickPending.rec);
  if (window.refreshSkipRow) { try { refreshSkipRow(); } catch (e) {} }
  quickPending = null;
  refreshQuickRow();
  toast("Quick unlock is ON for this device.");
  return true;
}
async function openQuickOffer() {
  if (typeof E2 === "undefined" || !E2.dek || !E2.dekRaw) {
    toast("Unlock your vault with your account password first, then turn on Quick unlock.");
    if (window.quickGate) window.quickGate();
    return;
  }
  let m = $("quickOffer");
  if (!m) {
    m = document.createElement("div");
    m.id = "quickOffer"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Turn on Quick unlock");
    m.innerHTML =
      '<div class="modal-card quick-card">' +
      '<div class="modal-head"><h3>Quick unlock on this device</h3><button type="button" class="icon-btn" id="quickOfferX" aria-label="Close">✕</button></div>' +
      '<div id="quickPaneChoose">' +
      '<p class="muted">Skip the long account password on this device. Your vault key gets one extra lock that lives <b>only on this device</b> — nothing is uploaded, and your password, seed phrase and recovery codes keep working exactly as before.</p>' +
      '<p class="form-error" id="quickOfferMsg"></p>' +
      '<button type="button" class="btn btn-gold btn-block" id="quickOfferBio">Use fingerprint / face / phone lock</button>' +
      '<button type="button" class="btn btn-block" id="quickOfferPin" style="margin-top:8px">Use an app PIN instead</button>' +
      '<button type="button" class="btn btn-block" id="quickOfferSkip" style="margin-top:8px">Not now</button>' +
      "</div>" +
      '<div id="quickPanePin" class="hidden">' +
      '<p class="muted">Choose a 6-digit app PIN for this device. It is never stored — only a slow, salted check of it is kept. After 10 wrong tries, Quick unlock turns itself off and your account password is needed.</p>' +
      '<form id="quickSetPinForm" autocomplete="off">' +
      '<label class="fld">New 6-digit PIN<input type="password" id="quickNewPin" inputmode="numeric" autocomplete="new-password" enterkeyhint="next" maxlength="6" placeholder="••••••"></label>' +
      '<label class="fld">Type it again<input type="password" id="quickNewPin2" inputmode="numeric" autocomplete="new-password" enterkeyhint="go" maxlength="6" placeholder="••••••"></label>' +
      '<p class="form-error" id="quickSetPinMsg"></p>' +
      '<button type="submit" class="btn btn-gold btn-block">Save PIN</button>' +
      '<button type="button" class="btn btn-block" id="quickPinCancel" style="margin-top:8px">Back</button>' +
      "</form></div>" +
      '<div id="quickPaneAlso" class="hidden">' +
      '<p>Fingerprint / phone lock is set. ✅</p>' +
      '<p class="muted">Want an app PIN too, as a backup for this device? (Optional — the PIN also helps when the fingerprint sensor is wet or busy.)</p>' +
      '<button type="button" class="btn btn-gold btn-block" id="quickAlsoPin">Also set an app PIN</button>' +
      '<button type="button" class="btn btn-block" id="quickAlsoSkip" style="margin-top:8px">Skip — finish</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(m);
    const closeOffer = () => { m.classList.add("hidden"); quickPending = null; };
    $("quickOfferX").addEventListener("click", closeOffer);
    $("quickOfferSkip").addEventListener("click", closeOffer);
    m.addEventListener("click", e => { if (e.target === m) closeOffer(); });
    $("quickOfferBio").addEventListener("click", async () => {
      const btn = $("quickOfferBio"), msg = $("quickOfferMsg");
      btn.disabled = true; btn.textContent = "Waiting for verification…"; msg.textContent = "";
      try {
        if (!quickPending) await quickStartPending();
        quickPending.rec.bio = await quickEnrollBio(quickPending.secret);
        quickPane("quickPaneAlso");
      } catch (e) {
        msg.textContent = (e && e.message) || "That did not complete. You can use an app PIN instead.";
      }
      btn.disabled = false; btn.textContent = "Use fingerprint / face / phone lock";
    });
    $("quickOfferPin").addEventListener("click", async () => {
      if (!quickPending) await quickStartPending();
      quickPane("quickPanePin");
    });
    $("quickAlsoPin").addEventListener("click", () => quickPane("quickPanePin"));
    $("quickAlsoSkip").addEventListener("click", async () => { await quickSavePending(); m.classList.add("hidden"); });
    $("quickPinCancel").addEventListener("click", () => quickPane(quickPending && quickPending.rec.bio ? "quickPaneAlso" : "quickPaneChoose"));
    $("quickSetPinForm").addEventListener("submit", async e => {
      e.preventDefault();
      const p1 = ($("quickNewPin").value || "").replace(/\D/g, ""), p2 = ($("quickNewPin2").value || "").replace(/\D/g, "");
      const msg = $("quickSetPinMsg");
      if (p1.length !== 6) { msg.textContent = "The PIN must be exactly 6 digits."; return; }
      if (p1 !== p2) { msg.textContent = "The two PINs do not match — type the same PIN twice."; return; }
      if (!quickPending) await quickStartPending();
      quickPending.rec.pin = await quickPinWrap(p1, quickPending.secret);
      await quickSavePending();
      m.classList.add("hidden");
    });
  }
  quickPending = null;
  quickPane("quickPaneChoose");
  $("quickOfferMsg").textContent = "";
  $("quickOfferBio").style.display = (await quickBioAvailable()) ? "" : "none";
  m.classList.remove("hidden");
}
function quickPane(id) {
  ["quickPaneChoose", "quickPanePin", "quickPaneAlso"].forEach(p => { const el = $(p); if (el) el.classList.toggle("hidden", p !== id); });
}

/* offer once per session, right after a master unlock completes */
function maybeOfferQuick() {
  if (quickOfferedSession) return;
  if (typeof E2 === "undefined" || !E2.dek || !E2.dekRaw) return;
  if (!currentUser) return;
  if (document.querySelector(".modal:not(.hidden)")) return;
  quickOfferedSession = true;
  quickRecord().then(rec => {
    if (rec && rec.email === currentUser.email) { refreshQuickRow(); return; }
    openQuickOffer();
  }).catch(() => {});
}
document.addEventListener("DOMContentLoaded", () => {
  try {
    const mo = new MutationObserver(() => {
      const u = $("e2eeUnlock"), s = $("e2eeSetup");
      if ((!u || u.classList.contains("hidden")) && (!s || s.classList.contains("hidden"))) {
        if (typeof E2 !== "undefined" && E2.dek) {
          if (window.e2eeSecRefresh) { try { e2eeSecRefresh(); } catch (e) {} }
          setTimeout(maybeOfferQuick, 500);
        }
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
  } catch (e) {}
});

/* ---------------- settings row (My Profile → Security) ---------------- */
function ensureQuickRow() {
  if ($("quickSecRow")) return;
  const anchor = $("e2eeSecRow");
  if (!anchor) return;
  const row = document.createElement("div");
  row.className = "setting-row"; row.id = "quickSecRow";
  row.innerHTML = '<span id="quickSecState">Quick unlock: …</span><span id="quickSecCtl" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end"></span>';
  anchor.after(row);
  refreshQuickRow();
}
async function refreshQuickRow() {
  const st = $("quickSecState"), ctl = $("quickSecCtl");
  if (!st || !ctl) return;
  const row = $("quickSecRow");
  const hasVault = (typeof E2 !== "undefined") && (window.__e2eeActive || E2.wraps);
  if (!hasVault) { if (row) row.style.display = "none"; return; }
  if (row) row.style.display = "";
  const rec = await quickRecord();
  const mine = rec && currentUser && rec.email === currentUser.email;
  ctl.innerHTML = "";
  if (!window.__e2eeActive) {
    st.textContent = mine ? "Quick unlock: ON on this device (vault is locked)" : "Quick unlock: unlock your vault to manage";
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn btn-small"; b.textContent = "Unlock";
    b.addEventListener("click", () => { if (window.quickGate) window.quickGate(); });
    ctl.appendChild(b);
    if (mine) ctl.appendChild(quickOffButton());
    return;
  }
  if (!mine) {
    st.textContent = "Quick unlock on this device: OFF";
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn btn-small"; b.textContent = "Turn on";
    b.addEventListener("click", () => openQuickOffer());
    ctl.appendChild(b);
    return;
  }
  const parts = [];
  if (rec.bio) parts.push(rec.bio.mode === "prf" ? "fingerprint / face / phone lock (PRF)" : "fingerprint / face / phone lock");
  if (rec.pin) parts.push("app PIN");
  st.textContent = "Quick unlock: ON — " + parts.join(" + ") + " (this device only)";
  const sel = document.createElement("select");
  sel.id = "quickAutoLock"; sel.className = "mini-select"; sel.setAttribute("aria-label", "Auto-lock when the app is in the background");
  sel.innerHTML = '<option value="0">Lock: immediately</option><option value="1">Lock: after 1 min away</option><option value="5">Lock: after 5 min away</option><option value="15">Lock: after 15 min away</option>';
  sel.value = String(quickCfg().mins);
  sel.addEventListener("change", () => { quickSetCfg(parseInt(sel.value, 10)); toast("Auto-lock setting saved for this device."); });
  ctl.appendChild(sel);
  ctl.appendChild(quickOffButton());
}
function quickOffButton() {
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn btn-small"; b.textContent = "Turn off";
  b.addEventListener("click", async () => {
    await window.quickWipe();
    refreshQuickRow();
    toast("Quick unlock is OFF. This device now needs your account password, seed phrase or a recovery code.");
  });
  return b;
}
document.addEventListener("DOMContentLoaded", () => {
  ensureQuickRow();
  const _svQ = switchView;
  switchView = function (n) { _svQ(n); if (n === "profile") { ensureQuickRow(); refreshQuickRow(); } };
});

/* ---------------- background auto-lock ---------------- */
let quickHiddenAt = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { quickHiddenAt = Date.now(); return; }
  if (!quickHiddenAt) return;
  const away = Date.now() - quickHiddenAt;
  quickHiddenAt = 0;
  if (!window.__e2eeActive) return;
  const rec = await quickRecord();
  if (!rec || !currentUser || rec.email !== currentUser.email) return;
  if (rec.skip) return; /* Skip password is ON: this device does not lock */
  
  if (away < quickCfg().mins * 60000) return;
  if (window.e2eeWipeForLock) window.e2eeWipeForLock();
  if (window.quickGate) window.quickGate();
});

/* ================================================================
   Skip password on this device (v102) — a fully automatic,
   device-local unlock for the same unchanged vault. Like Quick
   unlock it adds ONE extra wrap of the master key, held only in
   this device's IndexedDB — but here the wrap's secret is sealed
   by a NON-extractable device key alone, so opening the app
   unlocks with no password, no PIN and no fingerprint. The
   password / seed phrase / recovery code wraps are untouched and
   remain the fallback everywhere else. Only ONE of Quick unlock
   and Skip password can be on at a time (they share one record).
   Signing out wipes the record and the device key (app.js calls
   quickWipe). The password itself and the seed phrase are NEVER
   stored — only the sealed wrap and the device key are.
   ================================================================ */
function ensureSkipRow() {
  if ($("skipSecRow")) return;
  const anchor = $("quickSecRow") || $("e2eeSecRow");
  if (!anchor) return;
  const row = document.createElement("div");
  row.className = "setting-row"; row.id = "skipSecRow";
  row.innerHTML =
    '<span><b>Skip password on this device</b>' +
    '<span class="muted small" style="display:block;margin-top:2px">Open Folio straight to your dashboard on THIS device — no password, PIN or fingerprint. Other devices still ask. Your phone or computer lock screen becomes the only protection.</span>' +
    '<span class="muted small" id="skipSecStatus" style="display:block;margin-top:2px"></span></span>' +
    '<label class="fld" style="flex-direction:row;align-items:center;gap:6px;margin:0">Off <input type="checkbox" id="skipToggle" role="switch" aria-label="Skip password on this device"> On</label>';
  anchor.after(row);
  $("skipToggle").addEventListener("change", async e => {
    if (e.target.checked) { e.target.checked = false; openSkipConfirm(); }
    else {
      await window.quickWipe();
      refreshSkipRow(); refreshQuickRow();
      toast("Skip password is OFF. This device will ask for your password again.");
    }
  });
  refreshSkipRow();
}
async function refreshSkipRow() {
  const tg = $("skipToggle"), st = $("skipSecStatus"), row = $("skipSecRow");
  if (!tg || !st) return;
  const hasVault = (typeof E2 !== "undefined") && (window.__e2eeActive || E2.wraps);
  if (!hasVault) { if (row) row.style.display = "none"; return; }
  if (row) row.style.display = "";
  const rec = await quickRecord();
  const mine = rec && currentUser && rec.email === currentUser.email;
  const on = !!(mine && rec.skip);
  tg.checked = on;
  st.textContent = on && rec.skip.since
    ? "Password skipped on this device since " + new Date(rec.skip.since).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
}
window.refreshSkipRow = refreshSkipRow;
function openSkipConfirm() {
  let m = $("skipConfirm");
  if (!m) {
    m = document.createElement("div");
    m.id = "skipConfirm"; m.className = "modal hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Turn on Skip password");
    m.innerHTML =
      '<div class="modal-card quick-card">' +
      '<div class="modal-head"><h3>Skip password on this device?</h3><button type="button" class="icon-btn" id="skipX" aria-label="Close">\u2715</button></div>' +
      '<div id="skipPaneWarn">' +
      '<p>Anyone who can open this app on this phone or computer will see your portfolio without a password. Your phone\u2019s own lock screen is your only protection. You can turn this off any time.</p>' +
      '<button type="button" class="btn btn-gold btn-block" id="skipTurnOn">Turn on</button>' +
      '<button type="button" class="btn btn-block" id="skipCancel" style="margin-top:8px">Cancel</button>' +
      "</div>" +
      '<form id="skipPanePw" class="hidden" autocomplete="off">' +
      '<p class="muted">Enter your account password once. It is used only to prepare this device\u2019s key — the password itself is never stored.</p>' +
      '<label class="fld">Account password<input type="password" id="skipPw" autocomplete="current-password" enterkeyhint="go" placeholder="Your Folio account password"></label>' +
      '<p class="form-error" id="skipPwMsg"></p>' +
      '<button type="submit" class="btn btn-gold btn-block" id="skipPwGo">Turn on Skip password</button>' +
      '<button type="button" class="btn btn-block" id="skipPwBack" style="margin-top:8px">Back</button>' +
      "</form>" +
      "</div>";
    document.body.appendChild(m);
    const close = () => { m.classList.add("hidden"); refreshSkipRow(); };
    $("skipX").addEventListener("click", close);
    $("skipCancel").addEventListener("click", close);
    m.addEventListener("click", e => { if (e.target === m) close(); });
    $("skipTurnOn").addEventListener("click", () => {
      $("skipPaneWarn").classList.add("hidden");
      $("skipPanePw").classList.remove("hidden");
      $("skipPw").value = ""; $("skipPwMsg").textContent = "";
      setTimeout(() => { const i = $("skipPw"); if (i) try { i.focus(); } catch (e) {} }, 60);
    });
    $("skipPwBack").addEventListener("click", () => {
      $("skipPanePw").classList.add("hidden");
      $("skipPaneWarn").classList.remove("hidden");
    });
    $("skipPanePw").addEventListener("submit", async e => {
      e.preventDefault();
      const pw = $("skipPw").value, msg = $("skipPwMsg"), btn = $("skipPwGo");
      if (!pw) { msg.textContent = "Enter your account password."; return; }
      if (typeof E2 === "undefined" || !E2.wraps || !E2.wraps.pw) { msg.textContent = "The vault password link was not found for this account."; return; }
      btn.disabled = true; btn.textContent = "Checking\u2026";
      const raw = await e2eeUnwrapRaw(E2.wraps.pw, pw);
      if (!raw) { btn.disabled = false; btn.textContent = "Turn on Skip password"; msg.textContent = "That password did not open your vault — check it and try again."; return; }
      try {
        let hadQuick = false;
        try { const old = await quickRecord(); hadQuick = !!(old && old.email === quickEmail() && (old.bio || old.pin)); } catch (e) {}
        const secret = b64encode(crypto.getRandomValues(new Uint8Array(32)));
        const wrap = await e2eeWrapDek(raw, secret);
        const devKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        await qset(QUICK_DEVKEY, devKey);
        const pack = await aesEnc(devKey, TE.encode(secret));
        await qset(QUICK_REC, { v: 1, email: quickEmail(), wrap: wrap, skip: { iv: pack.iv, data: pack.data, since: Date.now() } });
        if (document.activeElement && document.activeElement.blur) { try { document.activeElement.blur(); } catch (e) {} }
        m.classList.add("hidden");
        refreshSkipRow(); refreshQuickRow();
        toast(hadQuick ? "Skip password is ON for this device. Quick unlock was turned off \u2014 only one of the two can be on." : "Skip password is ON for this device.");
      } catch (e2) {
        msg.textContent = "Something went wrong while setting this up. Nothing was changed.";
      }
      btn.disabled = false; btn.textContent = "Turn on Skip password";
    });
  }
  $("skipPanePw").classList.add("hidden");
  $("skipPaneWarn").classList.remove("hidden");
  m.classList.remove("hidden");
}
document.addEventListener("DOMContentLoaded", () => {
  ensureSkipRow();
  const _svS = switchView;
  switchView = function (n) { _svS(n); if (n === "profile") { ensureSkipRow(); refreshSkipRow(); } };
});
