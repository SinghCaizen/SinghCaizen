"use strict";
/* ================================================================
   Singh Caizen Finance — Profile + 2FA module (v3)
   2FA design (free, no paid Firebase MFA):
   - TOTP (authenticator app) computed locally with WebCrypto.
   - The TOTP secret is generated FROM a 12-word seed phrase
     (seed bytes + first 8 bytes of its SHA-256 = 20-byte secret),
     so the seed phrase alone can rebuild the authenticator.
   - The secret is stored ONLY as AES-GCM ciphertext: one copy
     wrapped with a key derived from the user's password (PBKDF2),
     one copy wrapped with a key derived from the seed phrase.
     Without the password or the seed, the database copy is useless.
   - Recovery codes are stored only as SHA-256 hashes, single-use.
   ================================================================ */

const TE = new TextEncoder(), TD = new TextDecoder();
function b64encode(buf) { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function b64decode(s) { const bin = atob(s); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
async function sha256bytes(data) { return new Uint8Array(await crypto.subtle.digest("SHA-256", data)); }
async function sha256hex(text) { const h = await sha256bytes(TE.encode(text)); return Array.from(h).map(x => x.toString(16).padStart(2, "0")).join(""); }
function keySalt() { return "scf|" + (currentUser ? currentUser.email : ""); }
async function deriveAesKey(secretText, saltText) {
  const base = await crypto.subtle.importKey("raw", TE.encode(secretText), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: TE.encode(saltText), iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function aesEnc(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, bytes);
  return { iv: b64encode(iv), data: b64encode(data) };
}
async function aesDec(key, pack) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(pack.iv) }, key, b64decode(pack.data));
  return new Uint8Array(plain);
}

/* ---------- base32 (RFC 4648) ---------- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32encode(bytes) {
  let out = "", buffer = 0, bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte; bitsLeft += 8;
    while (bitsLeft >= 5) { out += B32[(buffer >>> (bitsLeft - 5)) & 31]; bitsLeft -= 5; }
  }
  if (bitsLeft > 0) out += B32[(buffer << (5 - bitsLeft)) & 31];
  return out;
}

/* ---------- TOTP (RFC 6238, SHA-1, 6 digits, 30s) ---------- */
async function totpAt(secret, counter) {
  const msg = new Uint8Array(8); let c = counter;
  for (let i = 7; i >= 0; i--) { msg[i] = c % 256; c = Math.floor(c / 256); }
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const off = sig[sig.length - 1] & 0xf;
  const bin = ((sig[off] & 0x7f) << 24) | ((sig[off + 1] & 0xff) << 16) | ((sig[off + 2] & 0xff) << 8) | (sig[off + 3] & 0xff);
  return String(bin % 1000000).padStart(6, "0");
}
async function totpVerify(secret, code) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const ctr = Math.floor(Date.now() / 30000);
  for (const d of [-1, 0, 1]) { if (await totpAt(secret, ctr + d) === code) return true; }
  return false;
}

/* ---------- seed phrase: 256-word list, 1 word = 1 byte ---------- */
const WORDS = ("apple river stone light house water earth fire wind song bird tree leaf road star moon " +
"sun sky cloud rain snow hill lake sea beach field forest garden flower grass rock sand dust " +
"king queen prince story book page word letter number color shape size sound music dance art ink " +
"happy brave calm kind wise bold free true fair warm cool soft hard bright dark sweet sour " +
"red green gold silver black white brown pink gray orange purple yellow copper iron steel bronze wood " +
"cat dog horse cow pig sheep goat deer bear wolf lion tiger fish frog duck hen fox " +
"bread milk rice wheat corn grape lemon mango melon peach pear plum fig nut honey salt oil " +
"chair table door window room wall floor roof bed lamp clock watch phone key bag shoe hat " +
"hand foot head eye ear nose mouth tooth arm leg heart blood bone skin hair face neck " +
"mother father sister brother baby friend guest teacher doctor farmer driver singer actor writer artist soldier cook " +
"city village town street bridge market school temple office farm shop bank park zoo museum library hotel " +
"spring summer autumn winter morning evening night today week month year hour minute second season weather storm " +
"north south east west left right top bottom front back near far high low deep wide long " +
"run walk jump swim fly sing read write speak listen look hear smell taste touch think dream " +
"love hope peace joy pride trust faith smile laugh cry sleep wake eat drink play work rest gem coin").split(" ");
async function secretFromSeed(seedBytes) {
  const h = await sha256bytes(seedBytes);
  const out = new Uint8Array(20); out.set(seedBytes, 0); out.set(h.slice(0, 8), 12);
  return out;
}
function seedPhrase(bytes) { return Array.from(bytes).map(b => WORDS[b]).join(" "); }
function phraseToBytes(phrase) {
  const ws = String(phrase || "").trim().toLowerCase().split(/\s+/);
  if (ws.length !== 12) return null;
  const out = new Uint8Array(12);
  for (let i = 0; i < 12; i++) { const idx = WORDS.indexOf(ws[i]); if (idx < 0) return null; out[i] = idx; }
  return out;
}

/* ---------- recovery codes ---------- */
const RC_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    let s = ""; const r = crypto.getRandomValues(new Uint8Array(8));
    for (const b of r) s += RC_CHARS[b % RC_CHARS.length];
    codes.push(s.slice(0, 4) + "-" + s.slice(4));
  }
  return codes;
}
async function hashCodes(codes) {
  const out = [];
  for (const c of codes) out.push(await sha256hex(c.replace(/[^A-Za-z0-9]/g, "").toUpperCase()));
  return out;
}

/* ---------- helpers ---------- */
function displayName() {
  const p = state.profile || {};
  return (p.name || (currentUser && currentUser.name) || "").trim();
}
async function verifyOwnPassword(pass) {
  if (!pass || !currentUser) return false;
  if (FIREBASE_ON) {
    try {
      const u = fb.auth.currentUser;
      const cred = firebase.auth.EmailAuthProvider.credential(u.email, pass);
      await u.reauthenticateWithCredential(cred);
      return true;
    } catch (e) { return false; }
  }
  const rec = lsUsers()[currentUser.email];
  return !!rec && rec.pass === pass;
}
async function unlockSecret(pass) {
  const t = state.profile && state.profile.totp;
  if (!t || !t.encPw) return null;
  try { return await aesDec(await deriveAesKey(pass, keySalt()), t.encPw); }
  catch (e) { return null; }
}
function otpAuthUrl(secretBytes) {
  return "otpauth://totp/SinghCaizenFinance:" + encodeURIComponent(currentUser.email) +
    "?secret=" + base32encode(secretBytes) + "&issuer=SinghCaizenFinance&digits=6&period=30";
}
function drawQr(canvas, text) {
  try {
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), cell = Math.max(2, Math.floor(216 / n)), dim = cell * n;
    canvas.width = dim; canvas.height = dim;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = "#171410";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
    return true;
  } catch (e) { return false; }
}

/* ================= PROFILE UI ================= */
function renderAvatars() {
  if (!currentUser) return;
  const p = state.profile || {};
  const dp = p.dp || "";
  const init = (displayName() || currentUser.email || "?").charAt(0).toUpperCase();
  const pa = $("profAvatar"), pi = $("profAvatarInit"), ta = $("topAvatar");
  if (!pa) return;
  if (dp) {
    pa.src = dp; pa.classList.remove("hidden"); pi.classList.add("hidden");
    ta.src = dp; ta.classList.remove("hidden");
  } else {
    pa.classList.add("hidden"); pi.classList.remove("hidden"); pi.textContent = init;
    ta.classList.add("hidden");
  }
}
function renderProfile() {
  if (!currentUser || !$("profName")) return;
  const p = state.profile;
  if (document.activeElement !== $("profName")) $("profName").value = p.name || "";
  if (document.activeElement !== $("profPhone")) $("profPhone").value = p.phone || "";
  $("profNameTitle").textContent = displayName() || "My Profile";
  $("profEmailLine").textContent = currentUser.email;
  $("topName").textContent = displayName() ? "Hi, " + displayName().split(" ")[0] : "";
  renderAvatars();
  renderTotpArea(false);
}

/* ================= 2FA SETUP / MANAGE ================= */
let wz = null;          // wizard state while setting up
let totpSig = "";       // last rendered state signature
function renderTotpArea(force) {
  const area = $("totpArea"); if (!area || !currentUser) return;
  const t = state.profile.totp;
  const sig = t && t.enabled ? "on" : (wz ? "wz" : "off");
  if (!force && sig === totpSig) return;
  totpSig = sig;
  if (t && t.enabled) {
    const left = (state.profile.recovery || []).length;
    area.innerHTML =
      '<p class="totp-status on">2FA is <b>ON</b> — after login, a code from your authenticator app is asked. This is your double lock.</p>' +
      '<div class="totp-actions">' +
      '<button class="btn btn-small" id="tShowQr" type="button">Show QR / Key Again</button>' +
      '<button class="btn btn-small" id="tRegen" type="button">New Recovery Codes</button>' +
      '<button class="btn btn-small btn-danger" id="tDisable" type="button">Turn OFF 2FA</button>' +
      '</div><div id="totpBox"></div>' +
      '<p class="price-meta">Recovery codes left: ' + left + ' of 8. Each code works only once.</p>';
    $("tShowQr").addEventListener("click", totpShowQrAgain);
    $("tRegen").addEventListener("click", totpRegenCodes);
    $("tDisable").addEventListener("click", totpDisable);
    return;
  }
  if (wz) {
    area.innerHTML =
      '<div class="totp-box">' +
      '<p><b>Step 1 —</b> Scan this QR code in your authenticator app, or type the key below it.</p>' +
      '<canvas id="wzQr" class="qr-canvas" width="216" height="216"></canvas>' +
      '<p class="totp-key" id="wzKey"></p>' +
      '<p><b>Step 2 —</b> Write this <b>12-word seed phrase</b> on paper and keep it safe. If you lose the app, these 12 words are the ONLY way back in.</p>' +
      '<div class="seed-grid" id="wzSeed"></div>' +
      '<p><b>Step 3 —</b> Save these one-time recovery codes too (each works once):</p>' +
      '<div class="rec-grid" id="wzCodes"></div>' +
      '<label class="check-line"><input type="checkbox" id="wzSaved"> I have saved my seed phrase and recovery codes safely.</label>' +
      '<label>Step 4 — Enter the 6-digit code now showing in your app<input type="text" id="wzCode" inputmode="numeric" maxlength="6" placeholder="123456"></label>' +
      '<button class="btn btn-gold" id="wzEnable" type="button">Turn ON 2FA</button> ' +
      '<button class="mini-btn" id="wzCancel" type="button">Cancel</button>' +
      '<p id="wzError2" class="form-error"></p></div>';
    drawQr($("wzQr"), otpAuthUrl(wz.secret));
    $("wzKey").textContent = base32encode(wz.secret).replace(/(.{4})/g, "$1 ").trim();
    $("wzSeed").innerHTML = wz.phrase.split(" ").map((w, i) => '<span class="seed-word"><i>' + (i + 1) + '</i>' + esc(w) + '</span>').join("");
    $("wzCodes").innerHTML = wz.codes.map(c => '<span class="rec-code">' + esc(c) + '</span>').join("");
    $("wzEnable").addEventListener("click", totpEnable);
    $("wzCancel").addEventListener("click", () => { wz = null; renderTotpArea(true); });
    return;
  }
  area.innerHTML =
    '<p class="totp-status off">2FA is currently <b>OFF</b>.</p>' +
    '<label>Your account password (to lock your secret key)' +
    '<input type="password" id="wzPass" autocomplete="current-password"></label>' +
    '<button class="btn btn-gold" id="wzGen" type="button">Generate My Setup</button>' +
    '<p id="wzError" class="form-error"></p>';
  $("wzGen").addEventListener("click", totpStartSetup);
}

async function totpStartSetup() {
  const pass = $("wzPass").value;
  $("wzError").textContent = "Checking password...";
  if (!(await verifyOwnPassword(pass))) { $("wzError").textContent = "That password is not correct."; return; }
  const seedBytes = crypto.getRandomValues(new Uint8Array(12));
  const secret = await secretFromSeed(seedBytes);
  const phrase = seedPhrase(seedBytes);
  const codes = genRecoveryCodes();
  wz = {
    secret: secret, phrase: phrase, codes: codes,
    encPw: await aesEnc(await deriveAesKey(pass, keySalt()), secret),
    encSeed: await aesEnc(await deriveAesKey("seed:" + phrase, keySalt()), secret),
    hashes: await hashCodes(codes)
  };
  renderTotpArea(true);
}
async function totpEnable() {
  const err = $("wzError2");
  if (!$("wzSaved").checked) { err.textContent = "Pehle seed phrase aur recovery codes save karke tick karo."; return; }
  if (!(await totpVerify(wz.secret, $("wzCode").value))) { err.textContent = "Code match nahi hua. App me dikh raha fresh code dalo."; return; }
  state.profile.totp = { enabled: true, encPw: wz.encPw, encSeed: wz.encSeed, createdAt: new Date().toISOString() };
  state.profile.recovery = wz.hashes;
  wz = null; persist(); renderTotpArea(true);
  toast("2FA ON — double lock lag gaya");
}
async function totpShowQrAgain() {
  const box = $("totpBox");
  const pass = prompt("Apna password dalo — QR/key dekhne ke liye:");
  if (pass === null) return;
  const secret = await unlockSecret(pass);
  if (!secret) { alert("Password galat hai — key unlock nahi hui."); return; }
  box.innerHTML = '<canvas id="tQr" class="qr-canvas" width="216" height="216"></canvas><p class="totp-key" id="tKey"></p>';
  drawQr($("tQr"), otpAuthUrl(secret));
  $("tKey").textContent = base32encode(secret).replace(/(.{4})/g, "$1 ").trim();
}
async function totpRegenCodes() {
  const pass = prompt("Password dalo:"); if (pass === null) return;
  const secret = await unlockSecret(pass);
  if (!secret) { alert("Password galat hai."); return; }
  const code = prompt("App ka current 6-digit code dalo:"); if (code === null) return;
  if (!(await totpVerify(secret, code))) { alert("Code match nahi hua."); return; }
  const codes = genRecoveryCodes();
  state.profile.recovery = await hashCodes(codes);
  persist();
  $("totpBox").innerHTML = '<p><b>New recovery codes</b> — purane wale ab kaam nahi karenge. Inhe save kar lo:</p><div class="rec-grid">' +
    codes.map(c => '<span class="rec-code">' + esc(c) + '</span>').join("") + '</div>';
  renderTotpArea(false);
  toast("New recovery codes ready");
}
async function totpDisable() {
  const pass = prompt("2FA band karne ke liye password dalo:"); if (pass === null) return;
  const secret = await unlockSecret(pass);
  if (!secret) { alert("Password galat hai."); return; }
  const code = prompt("App ka current 6-digit code dalo:"); if (code === null) return;
  if (!(await totpVerify(secret, code))) { alert("Code match nahi hua."); return; }
  state.profile.totp = null; state.profile.recovery = [];
  persist(); renderTotpArea(true);
  toast("2FA OFF ho gaya");
}

/* ================= GATE (after login) ================= */
let gateAltMode = null;
function unlockSession() {
  sessionStorage.setItem("pf_gate_" + currentUser.email, "1");
  showApp();
}
function wireGate() {
  $("gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("gateError");
    err.textContent = "Checking...";
    const secret = await unlockSecret($("gatePass").value);
    if (!secret) { err.textContent = "Password galat hai, ya key unlock nahi hui."; return; }
    if (!(await totpVerify(secret, $("gateCode").value))) { err.textContent = "Code match nahi hua. Fresh code aane do, phir try karo."; return; }
    err.textContent = "";
    toast("Welcome back");
    unlockSession();
  });
  $("gateUseRecovery").addEventListener("click", () => {
    gateAltMode = "recovery";
    $("gateAltLabel").textContent = "Recovery code";
    $("gateAltInput").placeholder = "XXXX-XXXX";
    $("gateAltInput").value = "";
    $("gateAltError").textContent = "";
    $("gateAltForm").classList.remove("hidden");
  });
  $("gateUseSeed").addEventListener("click", () => {
    gateAltMode = "seed";
    $("gateAltLabel").textContent = "Your 12-word seed phrase";
    $("gateAltInput").placeholder = "word1 word2 word3 ... (12 words)";
    $("gateAltInput").value = "";
    $("gateAltError").textContent = "";
    $("gateAltForm").classList.remove("hidden");
  });
  $("gateAltForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("gateAltError");
    const val = $("gateAltInput").value;
    err.textContent = "Checking...";
    if (gateAltMode === "recovery") {
      const h = await sha256hex(val.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
      const idx = (state.profile.recovery || []).indexOf(h);
      if (idx < 0) { err.textContent = "Ye recovery code sahi nahi hai, ya pehle use ho chuka hai."; return; }
      state.profile.recovery.splice(idx, 1);
      persist();
      err.textContent = "";
      toast("Recovery code accepted");
      unlockSession();
      return;
    }
    if (gateAltMode === "seed") {
      const bytes = phraseToBytes(val);
      if (!bytes) { err.textContent = "Pure 12 words, bilkul waise hi jaise mile the."; return; }
      const phrase = seedPhrase(bytes);
      try {
        const key = await deriveAesKey("seed:" + phrase, keySalt());
        await aesDec(key, state.profile.totp.encSeed);
      } catch (ex) { err.textContent = "Seed phrase se key unlock nahi hui. Words dobara check karo."; return; }
      err.textContent = "";
      toast("Seed accepted — andar ja rahe ho. Profile me 'Show QR' se app dobara add kar lena.");
      unlockSession();
    }
  });
  $("gateLogout").addEventListener("click", e => { e.preventDefault(); doLogout(); });
}

/* ================= PROFILE ACTIONS ================= */
function wireProfile() {
  $("profileForm").addEventListener("submit", e => {
    e.preventDefault();
    state.profile.name = $("profName").value.trim();
    state.profile.phone = $("profPhone").value.trim();
    persist(); renderProfile();
    $("profileMsg").textContent = "Saved.";
    toast("Profile saved");
  });

  $("dpFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const draw = (size, q) => {
        const c = document.createElement("canvas");
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", q);
      };
      let data = draw(256, 0.85);
      if (data.length > 900000) data = draw(192, 0.7);
      URL.revokeObjectURL(url);
      state.profile.dp = data;
      persist(); renderAvatars();
      toast("Photo updated");
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Photo load nahi hui"); };
    img.src = url;
    e.target.value = "";
  });
  $("dpRemove").addEventListener("click", () => {
    state.profile.dp = ""; persist(); renderAvatars(); toast("Photo removed");
  });

  $("emailForm").addEventListener("submit", async e => {
    e.preventDefault();
    const newEmail = $("newEmail").value.trim().toLowerCase();
    const curPass = $("emailCurPass").value;
    const okEl = $("emailMsg"), errEl = $("emailError");
    okEl.textContent = ""; errEl.textContent = "";
    if (!newEmail || newEmail === currentUser.email) { errEl.textContent = "Naya email dalo (purane se alag)."; return; }
    // If 2FA is on, the secret is locked to the OLD email salt — unlock first.
    let secret = null;
    const t = state.profile.totp;
    if (t && t.enabled) {
      secret = await unlockSecret(curPass);
      if (!secret) { errEl.textContent = "Current password se 2FA key unlock nahi hui — email change rok diya gaya, warna 2FA toot jata."; return; }
    }
    const oldEmail = currentUser.email;
    try {
      if (FIREBASE_ON) {
        const u = fb.auth.currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
        await u.reauthenticateWithCredential(cred);
        if (typeof u.verifyBeforeUpdateEmail === "function") {
          await u.verifyBeforeUpdateEmail(newEmail);
          okEl.textContent = "Naye email par ek confirmation link gaya hai — use click karte hi email change ho jayega. Tab tak purana email hi login rahega, aur 2FA bhi purane hisab se chalega.";
          return;
        }
        await u.updateEmail(newEmail);
      } else {
        const users = lsUsers();
        if (!users[oldEmail] || users[oldEmail].pass !== curPass) { errEl.textContent = "Current password galat hai."; return; }
        if (users[newEmail]) { errEl.textContent = "Ye email pehle se registered hai."; return; }
        users[newEmail] = users[oldEmail]; delete users[oldEmail];
        lsSaveUsers(users);
        localStorage.setItem(LS_SESSION, newEmail);
      }
    } catch (ex) { errEl.textContent = friendlyFbError(ex); return; }
    currentUser.email = newEmail;
    if (secret) {
      const key = await deriveAesKey(curPass, keySalt()); // salt uses the NEW email now
      state.profile.totp.encPw = await aesEnc(key, secret);
    }
    persist();
    $("userEmail").textContent = newEmail;
    $("setEmail").textContent = newEmail;
    renderProfile();
    okEl.textContent = "Email updated — ab naye email se login hoga.";
    $("emailCurPass").value = "";
    toast("Email changed");
  });

  $("passForm").addEventListener("submit", async e => {
    e.preventDefault();
    const curPass = $("passCur").value, newPass = $("passNew").value;
    const okEl = $("passMsg"), errEl = $("passError");
    okEl.textContent = ""; errEl.textContent = "";
    if (newPass.length < 6) { errEl.textContent = "New password kam se kam 6 characters ka ho."; return; }
    let secret = null;
    const t = state.profile.totp;
    if (t && t.enabled) {
      secret = await unlockSecret(curPass);
      if (!secret) { errEl.textContent = "Current password se 2FA key unlock nahi hui, isliye password change rok diya. (Agar password email se reset kiya tha, to pehle logout karke seed phrase se andar aao.)"; return; }
    }
    try {
      if (FIREBASE_ON) {
        const u = fb.auth.currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, curPass);
        await u.reauthenticateWithCredential(cred);
        await u.updatePassword(newPass);
      } else {
        const users = lsUsers();
        if (!users[currentUser.email] || users[currentUser.email].pass !== curPass) { errEl.textContent = "Current password galat hai."; return; }
        users[currentUser.email].pass = newPass;
        lsSaveUsers(users);
      }
    } catch (ex) { errEl.textContent = friendlyFbError(ex); return; }
    if (secret) {
      const key = await deriveAesKey(newPass, keySalt());
      state.profile.totp.encPw = await aesEnc(key, secret);
      persist();
    }
    $("passCur").value = ""; $("passNew").value = "";
    okEl.textContent = "Password changed.";
    toast("Password updated");
  });

  $("deleteAccountBtn").addEventListener("click", () => {
    $("delError").textContent = ""; $("delPass").value = "";
    $("delModal").classList.remove("hidden");
  });
  $("delClose").addEventListener("click", () => $("delModal").classList.add("hidden"));
  $("delModal").addEventListener("click", e => { if (e.target === $("delModal")) $("delModal").classList.add("hidden"); });
  $("delForm").addEventListener("submit", async e => {
    e.preventDefault();
    const pass = $("delPass").value;
    const err = $("delError");
    if (!pass) { err.textContent = "Pehle apna password dalo."; return; }
    err.textContent = "Deleting...";
    try {
      if (FIREBASE_ON) {
        const u = fb.auth.currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, pass);
        await u.reauthenticateWithCredential(cred);
        try { await fb.db.collection("users").doc(u.uid).delete(); } catch (ex) {}
        await u.delete();
      } else {
        const users = lsUsers();
        if (!users[currentUser.email] || users[currentUser.email].pass !== pass) { err.textContent = "Password galat hai — delete nahi hua."; return; }
        delete users[currentUser.email];
        lsSaveUsers(users);
      }
    } catch (ex) { err.textContent = friendlyFbError(ex); return; }
    $("delModal").classList.add("hidden");
    toast("Account deleted");
    doLogout();
  });
}

document.addEventListener("DOMContentLoaded", () => { wireGate(); wireProfile(); });
