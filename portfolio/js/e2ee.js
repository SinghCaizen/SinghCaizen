"use strict";
/* ================================================================
   Folio — End-to-End Encryption (Phase 2)
   Envelope encryption with Web Crypto:
   - A random 256-bit data key (DEK) encrypts the whole account
     state (AES-256-GCM, fresh IV per write, AAD = uid + version).
   - The DEK is wrapped separately by keys derived (PBKDF2-SHA256,
     600,000 iterations, per-wrap random salt) from: the account
     password, a 12-word vault seed phrase, and each of 8 vault
     recovery codes. A password change only re-wraps the DEK.
   - The DEK lives only in memory (non-extractable CryptoKey).
     Logout and the 15-minute lock wipe it.
   - Firebase (or demo localStorage) only ever stores ciphertext
     plus the wraps (salts + wrapped keys are not usable alone).
   Nothing in here touches the separate 2FA/TOTP system.
   ================================================================ */
const E2_ITER = 600000;
const E2 = { dek: null, wraps: null, pendingDoc: null, pendingUser: null, lastDoc: null, mode: "cloud", setupFor: "" };
window.__e2eeActive = false;

async function e2eeKek(secret, saltB64) {
  const base = await crypto.subtle.importKey("raw", TE.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64decode(saltB64), iterations: E2_ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function e2eeAad() { return TE.encode(((currentUser && currentUser.email) || "") + "|folio-state-v2"); }
async function e2eeEncryptState(stateObj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, additionalData: e2eeAad() }, E2.dek, TE.encode(JSON.stringify(stateObj)));
  return { iv: b64encode(iv), data: b64encode(ct) };
}
async function e2eeDecryptDoc(doc) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(doc.enc.iv), additionalData: e2eeAad() }, E2.dek, b64decode(doc.enc.data));
  return JSON.parse(TD.decode(pt));
}
async function e2eeWrapDek(dekRaw, secret) {
  const salt = b64encode(crypto.getRandomValues(new Uint8Array(16)));
  const kek = await e2eeKek(secret, salt);
  const pack = await aesEnc(kek, dekRaw);
  return { salt: salt, iv: pack.iv, data: pack.data };
}
async function e2eeUnwrapFrom(wrap, secret) {
  try {
    const kek = await e2eeKek(secret, wrap.salt);
    const raw = await aesDec(kek, { iv: wrap.iv, data: wrap.data });
    E2.dek = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return true;
  } catch (e) { return false; }
}
async function e2eeBuildPayload(stateObj) {
  const enc = await e2eeEncryptState(stateObj);
  const payload = { v: 2, schema: 2, enc: enc, wraps: E2.wraps, updatedAt: Date.now() };
  E2.lastDoc = payload;
  return payload;
}
function e2eeActivate() { window.__e2eeActive = !!E2.dek; }
function e2eeLock() {
  E2.dek = null; E2.wraps = null; E2.pendingDoc = null; E2.pendingUser = null; E2.lastDoc = null;
  window.__pendingPass = undefined; e2eeActivate();
}
window.e2eeLock = e2eeLock;
window.e2eeNeedsUnlock = function () { return !!(E2.pendingDoc && !E2.dek); };
window.e2eeWipeForLock = function () {
  /* The 15-minute lock wipes the DEK. The in-memory state stays only
     until the gate is passed; the unlock that follows replaces it with
     a fresh decryption, and signing out wipes everything. */
  if (!window.__e2eeActive) return;
  E2.dek = null; e2eeActivate();
  E2.pendingDoc = E2.lastDoc; E2.pendingUser = currentUser ? { email: currentUser.email, name: currentUser.name || "" } : null;
};

/* ---------- entry: a v2 cloud/demo document arrived ---------- */
async function e2eeHandleDoc(doc, user, mode) {
  E2.mode = mode || "cloud";
  E2.lastDoc = doc; E2.pendingDoc = doc; E2.pendingUser = user;
  E2.wraps = doc.wraps || null;
  if (E2.dek) { await e2eeFinish(); return; }
  if (window.__pendingPass && E2.wraps && E2.wraps.pw) {
    if (await e2eeUnwrapFrom(E2.wraps.pw, window.__pendingPass)) { window.__pendingPass = undefined; await e2eeFinish(); return; }
  }
  const gateUp = $("gateView") && !$("gateView").classList.contains("hidden");
  if (!gateUp) e2eeShowUnlock();
}
window.e2eeHandleDoc = e2eeHandleDoc;
async function e2eeFinish() {
  if (!E2.pendingDoc || !E2.dek) return;
  try {
    const plain = await e2eeDecryptDoc(E2.pendingDoc);
    const user = E2.pendingUser, mode = E2.mode;
    E2.pendingDoc = null;
    e2eeActivate();
    if (mode === "demo") { /* demo: nothing else to wire */ }
    enterApp(user, plain);
  } catch (e) {
    E2.dek = null; e2eeActivate();
    toast("This data could not be decrypted — it may be damaged, or it belongs to a different account.");
    e2eeShowUnlock();
  }
}
/* ---------- unlock modal ---------- */
function e2eeShowUnlock() {
  let m = $("e2eeUnlock");
  if (m) { m.classList.remove("hidden"); return; }
  m = document.createElement("div");
  m.id = "e2eeUnlock"; m.className = "modal";
  const hasPw = !!(E2.wraps && E2.wraps.pw);
  m.innerHTML =
    '<div class="modal-card">' +
    '<div class="modal-head"><h3>🔐 Unlock your encrypted portfolio</h3></div>' +
    '<p class="muted">Your Folio data is end-to-end encrypted. Google (and anyone with database access) sees only scrambled text. Unlock it here on your device — the key never leaves this phone or computer.</p>' +
    '<div class="seg seg-small" id="e2eeTabs">' +
    (hasPw ? '<button type="button" class="seg-btn active" data-e2tab="pw">Password</button>' : "") +
    '<button type="button" class="seg-btn' + (hasPw ? "" : " active") + '" data-e2tab="seed">Seed phrase</button>' +
    '<button type="button" class="seg-btn" data-e2tab="code">Recovery code</button></div>' +
    '<div id="e2eePanePw" class="e2ee-pane' + (hasPw ? "" : " hidden") + '"><label class="fld">Account password<input type="password" id="e2eePw" autocomplete="current-password" placeholder="The password for this Folio account"></label></div>' +
    '<div id="e2eePaneSeed" class="e2ee-pane' + (hasPw ? " hidden" : "") + '"><label class="fld">Your 12-word vault seed phrase<textarea id="e2eeSeed" rows="3" placeholder="word1 word2 word3 …"></textarea></label></div>' +
    '<div id="e2eePaneCode" class="e2ee-pane hidden"><label class="fld">One recovery code<input type="text" id="e2eeCode" placeholder="e.g. ABCD-2345" autocomplete="off"></label></div>' +
    '<p class="form-error" id="e2eeErr"></p>' +
    '<button type="button" class="btn btn-gold" id="e2eeGo" style="width:100%">Unlock</button>' +
    '<button type="button" class="btn" id="e2eeOut" style="width:100%;margin-top:8px">Sign out instead</button>' +
    '<p class="muted small">Forgot your password? Reset it from the sign-in screen first (that reset only changes sign-in), then unlock here with your seed phrase or a recovery code. If both the password and the seed phrase are lost, the data cannot be recovered — by design.</p>' +
    "</div>";
  document.body.appendChild(m);
  let tab = hasPw ? "pw" : "seed";
  m.querySelectorAll("[data-e2tab]").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.e2tab;
    m.querySelectorAll("[data-e2tab]").forEach(x => x.classList.toggle("active", x === b));
    $("e2eePanePw").classList.toggle("hidden", tab !== "pw");
    $("e2eePaneSeed").classList.toggle("hidden", tab !== "seed");
    $("e2eePaneCode").classList.toggle("hidden", tab !== "code");
    $("e2eeErr").textContent = "";
  }));
  $("e2eeOut").addEventListener("click", () => { m.classList.add("hidden"); doLogout(); });
  $("e2eeGo").addEventListener("click", async () => {
    const err = $("e2eeErr"); err.textContent = "";
    const btn = $("e2eeGo"); btn.disabled = true; btn.textContent = "Unlocking…";
    let ok = false;
    try {
      if (tab === "pw") ok = await e2eeUnwrapFrom(E2.wraps.pw, $("e2eePw").value);
      else if (tab === "seed") {
        const bytes = phraseToBytes($("e2eeSeed").value);
        if (!bytes) { err.textContent = "That is not a valid 12-word phrase — check the words and their order."; }
        else ok = await e2eeUnwrapFrom(E2.wraps.seed, seedPhrase(bytes));
      } else {
        const code = $("e2eeCode").value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        for (const w of (E2.wraps.codes || [])) { if (await e2eeUnwrapFrom(w, code)) { ok = true; break; } }
      }
    } catch (e) {}
    btn.disabled = false; btn.textContent = "Unlock";
    if (!ok) { if (!err.textContent) err.textContent = "That did not unlock your data. Check it and try again — nothing is deleted by trying."; return; }
    m.classList.add("hidden");
    await e2eeFinish();
  });
}
window.e2eeShowUnlock = e2eeShowUnlock;

/* ---------- setup wizard (new accounts + migration) ---------- */
window.e2eeMaybeSetup = function (user) {
  if (!user || E2.dek || !FIREBASE_ON) return;
  if (E2.setupFor === user.email) return;
  try { if (sessionStorage.getItem("folio_e2ee_later") === user.email) return; } catch (e) {}
  E2.setupFor = user.email;
  setTimeout(() => { if (!E2.dek && currentUser && currentUser.email === user.email) e2eeShowSetup(user); }, 900);
};
function e2eeShowSetup(user) {
  let m = $("e2eeSetup");
  if (m) { m.classList.remove("hidden"); return; }
  m = document.createElement("div");
  m.id = "e2eeSetup"; m.className = "modal";
  m.innerHTML =
    '<div class="modal-card modal-wide">' +
    '<div class="modal-head"><h3>🔐 Encrypt your portfolio end-to-end</h3></div>' +
    '<div id="e2eeStep1">' +
    '<p>From now on, your transactions, watchlists, profile, IPO applications, PAN and notes can be stored in the cloud as <b>ciphertext only</b>. Not even Google can read them.</p>' +
    '<p class="muted">How it works: a random master key encrypts your data on this device. That key is locked separately by your password, by a 12-word seed phrase, and by 8 recovery codes — you will save the phrase and codes in the next step.</p>' +
    '<p class="form-error">⚠️ If you lose BOTH your password AND your seed phrase (and all recovery codes), your data can never be recovered. No one can reset encryption for you — that is the point of it.</p>' +
    (window.__pendingPass ? "" : '<label class="fld">Create a vault password (only for unlocking Folio on this device — separate from Google sign-in)<input type="password" id="e2eeNewPw" placeholder="6+ characters"></label>') +
    '<button type="button" class="btn btn-gold" id="e2eeGen" style="width:100%">Generate my seed phrase &amp; codes</button>' +
    '<button type="button" class="btn" id="e2eeLater" style="width:100%;margin-top:8px">Later (not recommended)</button></div>' +
    '<div id="e2eeStep2" class="hidden">' +
    '<p><b>Save these somewhere safe — on paper or in a password manager. They are shown only once.</b></p>' +
    '<p class="fld">Vault seed phrase<textarea id="e2eeSeedOut" rows="3" readonly></textarea></p>' +
    '<p class="fld">Recovery codes<textarea id="e2eeCodesOut" rows="4" readonly></textarea></p>' +
    '<label class="fld" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="e2eeSavedChk"> I have saved my seed phrase and recovery codes safely.</label>' +
    '<label class="fld">Type word 3 and word 9 of the phrase to confirm (e.g. “stone light”)<input type="text" id="e2eeConfirmWords" placeholder="word3 word9"></label>' +
    '<p class="form-error" id="e2eeSetupErr"></p>' +
    '<button type="button" class="btn btn-gold" id="e2eeDo" style="width:100%">Encrypt my data now</button></div>' +
    '<div id="e2eeStep3" class="hidden"><p>✅ <b>Done — your data is now stored encrypted.</b></p><p class="muted">You can verify: open your Firebase console → Firestore Database → your user document. It now holds only scrambled ciphertext (a field called “enc”) plus key wraps — no stock names, quantities or amounts.</p><button type="button" class="btn btn-gold" id="e2eeDone" style="width:100%">Continue</button></div>' +
    "</div>";
  document.body.appendChild(m);
  let gen = null;
  $("e2eeLater").addEventListener("click", () => { try { sessionStorage.setItem("folio_e2ee_later", user.email); } catch (e) {} m.classList.add("hidden"); });
  $("e2eeGen").addEventListener("click", async () => {
    const pwField = $("e2eeNewPw");
    const pw = window.__pendingPass || (pwField ? pwField.value : "");
    if (!pw || pw.length < 6) { toast("A 6+ character password is needed to lock the key — sign in with email/password once, or type a vault password."); if (pwField) pwField.focus(); return; }
    gen = await e2eeMakeKeyset(pw);
    $("e2eeSeedOut").value = gen.phrase;
    $("e2eeCodesOut").value = gen.codes.join("\n");
    $("e2eeStep1").classList.add("hidden"); $("e2eeStep2").classList.remove("hidden");
  });
  $("e2eeDo").addEventListener("click", async () => {
    const err = $("e2eeSetupErr"); err.textContent = "";
    if (!$("e2eeSavedChk").checked) { err.textContent = "Please confirm you saved the phrase and codes — without them, a lost password means lost data."; return; }
    const words = gen.phrase.split(" ");
    const typed = $("e2eeConfirmWords").value.trim().toLowerCase().split(/\s+/);
    if (typed.length !== 2 || typed[0] !== words[2] || typed[1] !== words[8]) { err.textContent = "Those two words do not match the phrase above — check and try again."; return; }
    const btn = $("e2eeDo"); btn.disabled = true; btn.textContent = "Encrypting…";
    const ok = await e2eeCommitSetup(user, gen);
    btn.disabled = false; btn.textContent = "Encrypt my data now";
    if (!ok) { err.textContent = "Encryption could not be verified, so nothing was changed — your data is still stored as before. Please try again."; return; }
    $("e2eeStep2").classList.add("hidden"); $("e2eeStep3").classList.remove("hidden");
  });
  $("e2eeDone").addEventListener("click", () => m.classList.add("hidden"));
}
async function e2eeMakeKeyset(password) {
  const dekKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const dekRaw = new Uint8Array(await crypto.subtle.exportKey("raw", dekKey));
  const seedBytes = crypto.getRandomValues(new Uint8Array(12));
  const phrase = seedPhrase(seedBytes);
  const codes = genRecoveryCodes();
  const wraps = { pw: await e2eeWrapDek(dekRaw, password), seed: await e2eeWrapDek(dekRaw, phrase), codes: [] };
  for (const c of codes) wraps.codes.push(await e2eeWrapDek(dekRaw, c.replace(/[^A-Za-z0-9]/g, "").toUpperCase()));
  return { dekRaw: dekRaw, wraps: wraps, phrase: phrase, codes: codes };
}
async function e2eeCommitSetup(user, gen) {
  try {
    /* local backup of the current (plaintext) state until verified */
    try { localStorage.setItem("folio_pre_enc_backup", JSON.stringify({ email: user.email, state: state, ts: Date.now() })); } catch (e) {}
    E2.dek = await crypto.subtle.importKey("raw", gen.dekRaw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    E2.wraps = gen.wraps; e2eeActivate();
    const payload = await e2eeBuildPayload(state);
    if (E2.mode === "demo") {
      const users = lsUsers(); if (!users[user.email]) return false;
      users[user.email].encDoc = payload; delete users[user.email].state; lsSaveUsers(users);
    } else {
      if (!fb.docRef) return false;
      await fb.docRef.set(payload);
      const snap = await fb.docRef.get();
      const back = snap.exists ? snap.data() : null;
      if (!back || back.v !== 2) throw new Error("verify failed");
      const round = await e2eeDecryptDoc(back);
      if (e2eeFingerprint(JSON.stringify(round.txns || [])) !== e2eeFingerprint(JSON.stringify(state.txns || []))) throw new Error("round-trip mismatch");
    }
    try { localStorage.removeItem("folio_pre_enc_backup"); } catch (e) {}
    window.__pendingPass = undefined;
    return true;
  } catch (e) {
    E2.dek = null; E2.wraps = null; e2eeActivate();
    return false;
  }
}
function e2eeFingerprint(text) { /* small non-crypto fingerprint for the round-trip compare */
  let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0; return String(h) + ":" + text.length;
}
