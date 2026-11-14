"use strict";
/* ================================================================
   Folio — Profile + 2FA module
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
  return "otpauth://totp/Folio:" + encodeURIComponent(currentUser.email) +
    "?secret=" + base32encode(secretBytes) + "&issuer=Folio&digits=6&period=30";
}
function ensureQrLib() {
  return new Promise(res => {
    if (typeof qrcode === "function") return res(true);
    const sc = document.createElement("script");
    sc.src = "assets/qrcode.min.js?v=1";
    sc.onload = () => res(typeof qrcode === "function");
    sc.onerror = () => res(false);
    document.head.appendChild(sc);
  });
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
  const pa = $("profAvatar"), pi = $("profAvatarInit"), ta = $("topAvatar"), ti = $("topAvatarInit");
  if (!pa) return;
  if (dp) {
    pa.src = dp; pa.classList.remove("hidden"); pi.classList.add("hidden");
    if (ta) { ta.src = dp; ta.classList.remove("hidden"); }
    if (ti) ti.classList.add("hidden");
  } else {
    pa.classList.add("hidden"); pi.classList.remove("hidden"); pi.textContent = init;
    if (ta) ta.classList.add("hidden");
    if (ti) { ti.classList.remove("hidden"); ti.textContent = init; }
  }
}
function renderProfile() {
  if (!currentUser || !$("profName")) return;
  const p = state.profile;
  if (document.activeElement !== $("profName")) $("profName").value = p.name || "";
  if (document.activeElement !== $("profPhone")) $("profPhone").value = p.phone || "";
  $("profNameTitle").textContent = displayName() || "My Profile";
  $("profEmailLine").textContent = currentUser.email;
  const er = $("profEmailRow"); if (er) er.textContent = currentUser.email;
  const rs = $("secRecSummary");
  if (rs) {
    const t2 = state.profile.totp;
    const left2 = (state.profile.recovery || []).length;
    rs.textContent = t2 && t2.enabled
      ? "2FA is ON · " + left2 + " of 8 recovery codes unused · Seed phrase backup active"
      : "2FA is OFF — turn it on below to activate your seed phrase and recovery codes";
  }
  $("topName").textContent = displayName() ? displayName().split(" ")[0] : "Account";
  renderAvatars();
  renderTotpArea(false);
}

/* ================= 2FA SETUP / MANAGE (all in popups) ================= */
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (x) {}
    ta.remove();
  }
  toast("Copied");
}
function downloadText(name, text) {
  const b = new Blob([text], { type: "text/plain" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 3000);
  toast("Downloaded — keep it somewhere safe and private");
}
function openTotpModal(title) {
  $("totpModalTitle").textContent = title || "Two-Factor Authentication";
  $("totpModal").classList.remove("hidden");
}
function closeTotpModal() {
  $("totpModal").classList.add("hidden");
  $("totpModalBody").innerHTML = "";
  wz = null;
}
function seedFileText() {
  return "Folio — 2FA SEED PHRASE\n" +
    "Keep this PRIVATE. Anyone with these 12 words can enter your account if you lose your phone.\n\n" +
    wz.phrase.split(" ").map((w, i) => (i + 1) + ". " + w).join("\n") +
    "\n\nPhrase: " + wz.phrase + "\nAccount: " + currentUser.email + "\n";
}
function codesFileText(codes) {
  return "Folio — 2FA RECOVERY CODES\n" +
    "Each code works ONLY ONCE. Keep them PRIVATE.\n\n" +
    codes.join("\n") + "\n\nAccount: " + currentUser.email + "\n";
}

let wz = null;          // wizard state while setting up
let totpSig = "";       // last rendered state signature
function renderTotpArea(force) {
  const area = $("totpArea"); if (!area || !currentUser) return;
  const t = state.profile.totp;
  const sig = t && t.enabled ? "on" : "off";
  if (!force && sig === totpSig) return;
  totpSig = sig;
  if (t && t.enabled) {
    const left = (state.profile.recovery || []).length;
    area.innerHTML =
      '<p class="totp-status on">2FA is <b>ON</b> — after login, a code from your authenticator app is asked. This is your double lock.</p>' +
      '<div class="totp-actions">' +
      '<button class="btn btn-small" id="tShowQr" type="button">Show QR / Key Again</button>' +
      '<button class="btn btn-small" id="tShowSeed" type="button">View Seed Phrase</button>' +
      '<button class="btn btn-small" id="tRegen" type="button">New Recovery Codes</button>' +
      '<button class="btn btn-small btn-danger" id="tDisable" type="button">Turn OFF 2FA</button>' +
      '</div>' +
      '<p class="price-meta">Recovery codes left: ' + left + ' of 8. Each code works only once. Your seed phrase and your recovery codes both work on the sign-in screen — together they are your complete backup.</p>';
    $("tShowQr").addEventListener("click", totpShowQrAgain);
    $("tShowSeed").addEventListener("click", totpShowSeed);
    $("tRegen").addEventListener("click", totpRegenCodes);
    $("tDisable").addEventListener("click", totpDisable);
    return;
  }
  area.innerHTML =
    '<p class="totp-status off">2FA is currently <b>OFF</b>.</p>' +
    '<p class="auth-note">Setup opens in a popup: scan a QR code, save a 12-word seed phrase and 8 recovery codes (with Copy and Download buttons), then enter one code to switch it on.</p>' +
    '<button class="btn btn-gold" id="tSetup" type="button">Set Up 2FA</button>';
  $("tSetup").addEventListener("click", totpStartSetup);
}

function totpStartSetup() {
  openTotpModal("Set Up Two-Factor Authentication");
  $("totpModalBody").innerHTML =
    '<p>First, confirm it is really you. Your account password locks your secret key — the key itself is never stored in plain form.</p>' +
    '<label>Your account password<input type="password" id="mzPass" autocomplete="current-password"></label>' +
    '<p id="mzError" class="form-error"></p>' +
    '<button class="btn btn-gold btn-block" id="mzGen" type="button">Generate My Setup</button>';
  $("mzGen").addEventListener("click", async () => {
    const pass = $("mzPass").value;
    const err = $("mzError");
    err.textContent = "Checking password...";
    if (!(await verifyOwnPassword(pass))) { err.textContent = "That password is not correct."; return; }
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
    renderWz();
  });
}
function renderWz() {
  const body = $("totpModalBody");
  body.innerHTML =
    '<p><b>Step 1 —</b> Scan this QR code in your authenticator app (Google Authenticator, Microsoft Authenticator, Authy — any), or type the key below it.</p>' +
    '<canvas id="wzQr" class="qr-canvas" width="216" height="216"></canvas>' +
    '<p class="totp-key" id="wzKey"></p>' +
    '<div class="dl-row"><button class="btn btn-small" id="wzCopyKey" type="button">Copy Key</button></div>' +
    '<p><b>Step 2 —</b> Save this <b>12-word seed phrase</b>. If you lose the app, these 12 words are the ONLY way back in. Best: write them on paper.</p>' +
    '<div class="seed-grid" id="wzSeed"></div>' +
    '<div class="dl-row"><button class="btn btn-small" id="wzCopySeed" type="button">Copy Seed Phrase</button>' +
    '<button class="btn btn-small" id="wzDlSeed" type="button">Download Seed Phrase</button></div>' +
    '<p><b>Step 3 —</b> Save these one-time recovery codes too (each works once):</p>' +
    '<div class="rec-grid" id="wzCodes"></div>' +
    '<div class="dl-row"><button class="btn btn-small" id="wzCopyCodes" type="button">Copy Recovery Codes</button>' +
    '<button class="btn btn-small" id="wzDlCodes" type="button">Download Recovery Codes</button></div>' +
    '<label class="check-line"><input type="checkbox" id="wzSaved"> I have saved my seed phrase and recovery codes safely.</label>' +
    '<label>Step 4 — Enter the 6-digit code now showing in your app<input type="text" id="wzCode" inputmode="numeric" maxlength="6" placeholder="123456"></label>' +
    '<p id="wzError2" class="form-error"></p>' +
    '<button class="btn btn-gold btn-block" id="wzEnable" type="button">Turn ON 2FA</button>' +
    '<button class="mini-btn" id="wzCancel" type="button">Cancel setup</button>';
  ensureQrLib().then(() => drawQr($("wzQr"), otpAuthUrl(wz.secret)));
  const keyText = base32encode(wz.secret);
  $("wzKey").textContent = keyText.replace(/(.{4})/g, "$1 ").trim();
  $("wzSeed").innerHTML = wz.phrase.split(" ").map((w, i) => '<span class="seed-word"><i>' + (i + 1) + '</i>' + esc(w) + '</span>').join("");
  $("wzCodes").innerHTML = wz.codes.map(c => '<span class="rec-code">' + esc(c) + '</span>').join("");
  $("wzCopyKey").addEventListener("click", () => copyText(keyText));
  $("wzCopySeed").addEventListener("click", () => copyText(wz.phrase));
  $("wzDlSeed").addEventListener("click", () => downloadText("folio-seed-phrase.txt", seedFileText()));
  $("wzCopyCodes").addEventListener("click", () => copyText(wz.codes.join("\n")));
  $("wzDlCodes").addEventListener("click", () => downloadText("folio-recovery-codes.txt", codesFileText(wz.codes)));
  $("wzEnable").addEventListener("click", totpEnable);
  $("wzCancel").addEventListener("click", closeTotpModal);
}
async function totpEnable() {
  const err = $("wzError2");
  if (!$("wzSaved").checked) { err.textContent = "Please save your seed phrase and recovery codes first, then tick the box."; return; }
  if (!(await totpVerify(wz.secret, $("wzCode").value))) { err.textContent = "That code did not match. Enter the current code showing in your app."; return; }
  state.profile.totp = { enabled: true, encPw: wz.encPw, encSeed: wz.encSeed, createdAt: new Date().toISOString() };
  state.profile.recovery = wz.hashes;
  persist();
  closeTotpModal();
  renderTotpArea(true);
  toast("2FA is ON");
}
function totpShowQrAgain() {
  openTotpModal("Your Authenticator Key");
  $("totpModalBody").innerHTML =
    '<p>Enter your password to unlock and see your QR code and key again — for adding the app on a new phone.</p>' +
    '<label>Your password<input type="password" id="mqPass" autocomplete="current-password"></label>' +
    '<p id="mqError" class="form-error"></p>' +
    '<button class="btn btn-gold btn-block" id="mqGo" type="button">Show My QR &amp; Key</button>';
  $("mqGo").addEventListener("click", async () => {
    const secret = await unlockSecret($("mqPass").value);
    if (!secret) { $("mqError").textContent = "Incorrect password — the key could not be unlocked."; return; }
    const keyText = base32encode(secret);
    $("totpModalBody").innerHTML =
      '<canvas id="mqQr" class="qr-canvas" width="216" height="216"></canvas>' +
      '<p class="totp-key">' + esc(keyText.replace(/(.{4})/g, "$1 ").trim()) + '</p>' +
      '<div class="dl-row"><button class="btn btn-small" id="mqCopy" type="button">Copy Key</button>' +
      '<button class="btn btn-small" id="mqDone" type="button">Done</button></div>' +
      '<p class="auth-note">Keep this key private — anyone with it can generate your codes.</p>';
    ensureQrLib().then(() => drawQr($("mqQr"), otpAuthUrl(secret)));
    $("mqCopy").addEventListener("click", () => copyText(keyText));
    $("mqDone").addEventListener("click", closeTotpModal);
  });
}
function totpShowSeed() {
  openTotpModal("Your Seed Phrase");
  $("totpModalBody").innerHTML =
    '<p>Your 12-word seed phrase is the master backup of your 2FA — with it, you can always get back in, even without the app or a recovery code. Enter your password to view it.</p>' +
    '<label>Your password<input type="password" id="msPass" autocomplete="current-password"></label>' +
    '<p id="msError" class="form-error"></p>' +
    '<button class="btn btn-gold btn-block" id="msGo" type="button">View Seed Phrase</button>';
  $("msGo").addEventListener("click", async () => {
    const secret = await unlockSecret($("msPass").value);
    if (!secret) { $("msError").textContent = "Incorrect password — the key could not be unlocked."; return; }
    const phrase = seedPhrase(secret.slice(0, 12));
    $("totpModalBody").innerHTML =
      '<p><b>Your 12-word seed phrase</b> — keep it private and offline. Anyone with these words can rebuild your authenticator.</p>' +
      '<div class="seed-grid">' + phrase.split(" ").map((w, i) => '<span class="seed-word"><i>' + (i + 1) + '</i>' + esc(w) + '</span>').join("") + '</div>' +
      '<div class="dl-row"><button class="btn btn-small" id="msCopy" type="button">Copy Seed Phrase</button>' +
      '<button class="btn btn-small" id="msDl" type="button">Download</button>' +
      '<button class="btn btn-small" id="msDone" type="button">Done</button></div>';
    $("msCopy").addEventListener("click", () => copyText(phrase));
    $("msDl").addEventListener("click", () => downloadText("folio-seed-phrase.txt",
      "Folio — 2FA SEED PHRASE\nKeep this PRIVATE. Anyone with these 12 words can enter your account if you lose your phone.\n\n" +
      phrase.split(" ").map((w, i) => (i + 1) + ". " + w).join("\n") + "\n\nPhrase: " + phrase + "\nAccount: " + currentUser.email + "\n"));
    $("msDone").addEventListener("click", closeTotpModal);
  });
}
function totpRegenCodes() {
  openTotpModal("New Recovery Codes");
  $("totpModalBody").innerHTML =
    '<p>For safety, confirm with your password and a current app code. The moment new codes are made, the old ones stop working.</p>' +
    '<label>Your password<input type="password" id="mrPass" autocomplete="current-password"></label>' +
    '<label>6-digit code from your app<input type="text" id="mrCode" inputmode="numeric" maxlength="6" placeholder="123456"></label>' +
    '<p id="mrError" class="form-error"></p>' +
    '<button class="btn btn-gold btn-block" id="mrGo" type="button">Make New Codes</button>';
  $("mrGo").addEventListener("click", async () => {
    const secret = await unlockSecret($("mrPass").value);
    if (!secret) { $("mrError").textContent = "Incorrect password."; return; }
    if (!(await totpVerify(secret, $("mrCode").value))) { $("mrError").textContent = "That code did not match."; return; }
    const codes = genRecoveryCodes();
    state.profile.recovery = await hashCodes(codes);
    persist();
    $("totpModalBody").innerHTML =
      '<p><b>Your new recovery codes</b> — your old codes stop working from this moment. Save these right away:</p>' +
      '<div class="rec-grid">' + codes.map(c => '<span class="rec-code">' + esc(c) + '</span>').join("") + '</div>' +
      '<div class="dl-row"><button class="btn btn-small" id="mrCopy" type="button">Copy Codes</button>' +
      '<button class="btn btn-small" id="mrDl" type="button">Download Codes</button>' +
      '<button class="btn btn-small" id="mrDone" type="button">Done</button></div>';
    $("mrCopy").addEventListener("click", () => copyText(codes.join("\n")));
    $("mrDl").addEventListener("click", () => downloadText("folio-recovery-codes.txt", codesFileText(codes)));
    $("mrDone").addEventListener("click", closeTotpModal);
    renderTotpArea(true);
    toast("New recovery codes ready");
  });
}
function totpDisable() {
  openTotpModal("Turn OFF 2FA");
  $("totpModalBody").innerHTML =
    '<p>Turning 2FA off removes the double lock from your account. To confirm, enter your password and a current code from your app.</p>' +
    '<label>Your password<input type="password" id="mxPass" autocomplete="current-password"></label>' +
    '<label>6-digit code from your app<input type="text" id="mxCode" inputmode="numeric" maxlength="6" placeholder="123456"></label>' +
    '<p id="mxError" class="form-error"></p>' +
    '<button class="btn btn-danger btn-block" id="mxGo" type="button">Turn OFF 2FA</button>';
  $("mxGo").addEventListener("click", async () => {
    const secret = await unlockSecret($("mxPass").value);
    if (!secret) { $("mxError").textContent = "Incorrect password."; return; }
    if (!(await totpVerify(secret, $("mxCode").value))) { $("mxError").textContent = "That code did not match."; return; }
    state.profile.totp = null; state.profile.recovery = [];
    persist();
    closeTotpModal();
    renderTotpArea(true);
    toast("2FA is OFF");
  });
}

/* ================= GATE (after login) ================= */
let gateAltMode = null;
function unlockSession() {
  sessionStorage.setItem("pf_gate_" + currentUser.email, "1");
  if (window.e2eeNeedsUnlock && window.e2eeNeedsUnlock()) { window.e2eeShowUnlock(); return; }
  showApp();
}
function gateShakeCard() {
  const card = document.querySelector("#gateView .auth-card");
  if (!card) return;
  card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
}
function wireGate() {
  $("gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    if (form.dataset.busy) return;
    form.dataset.busy = "1";
    const btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    const err = $("gateError");
    err.textContent = "Checking...";
    const finish = ok => {
      delete form.dataset.busy;
      if (btn) btn.disabled = false;
      if (!ok) { const card = form.closest(".auth-card") || form; card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); }
    };
    const secret = await unlockSecret($("gatePass").value);
    if (!secret) { err.textContent = "Incorrect password, or the key could not be unlocked."; finish(false); return; }
    if (!(await totpVerify(secret, $("gateCode").value))) { err.textContent = "That code did not match. Wait for a fresh code, then try again."; finish(false); return; }
    err.textContent = "";
    finish(true);
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
    if (e.target.dataset.busy) return;
    e.target.dataset.busy = "1";
    const altBtn = e.target.querySelector('[type="submit"]');
    if (altBtn) altBtn.disabled = true;
    const altDone = () => { delete e.target.dataset.busy; if (altBtn) altBtn.disabled = false; };
    const err = $("gateAltError");
    const val = $("gateAltInput").value;
    err.textContent = "Checking...";
    if (gateAltMode === "recovery") {
      const h = await sha256hex(val.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
      const idx = (state.profile.recovery || []).indexOf(h);
      if (idx < 0) { err.textContent = "This recovery code is not valid, or it has already been used."; altDone(); gateShakeCard(); return; }
      state.profile.recovery.splice(idx, 1);
      persist();
      altDone();
      err.textContent = "";
      toast("Recovery code accepted");
      unlockSession();
      return;
    }
    if (gateAltMode === "seed") {
      const bytes = phraseToBytes(val);
      if (!bytes) { err.textContent = "Enter all 12 words, in the same order as you received them."; altDone(); gateShakeCard(); return; }
      const phrase = seedPhrase(bytes);
      try {
        const key = await deriveAesKey("seed:" + phrase, keySalt());
        await aesDec(key, state.profile.totp.encSeed);
      } catch (ex) { err.textContent = "The seed phrase could not unlock your key. Check the words and their order."; altDone(); gateShakeCard(); return; }
      altDone();
      err.textContent = "";
      toast("Seed phrase accepted. You can re-add the app any time from My Profile.");
      unlockSession();
    }
  });
  $("gateLogout").addEventListener("click", e => { e.preventDefault(); doLogout(); });
}

/* ================= PROFILE ACTIONS ================= */
function wireProfile() {
  /* ---- popup open/close wiring (email / password / 2FA) ---- */
  $("openEmailModal").addEventListener("click", () => {
    $("emailMsg").textContent = ""; $("emailError").textContent = "";
    $("emailModal").classList.remove("hidden");
  });
  $("emailClose").addEventListener("click", () => $("emailModal").classList.add("hidden"));
  $("emailModal").addEventListener("click", e => { if (e.target === $("emailModal")) $("emailModal").classList.add("hidden"); });
  $("openPassModal").addEventListener("click", () => {
    $("passMsg").textContent = ""; $("passError").textContent = "";
    $("passModal").classList.remove("hidden");
  });
  $("passClose").addEventListener("click", () => $("passModal").classList.add("hidden"));
  $("passModal").addEventListener("click", e => { if (e.target === $("passModal")) $("passModal").classList.add("hidden"); });
  $("totpClose").addEventListener("click", closeTotpModal);
  $("totpModal").addEventListener("click", e => { if (e.target === $("totpModal")) closeTotpModal(); });

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
    img.onerror = () => { URL.revokeObjectURL(url); toast("That photo could not be loaded"); };
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
    if (!newEmail || newEmail === currentUser.email) { errEl.textContent = "Enter a new email address (different from the current one)."; return; }
    // If 2FA is on, the secret is locked to the OLD email salt — unlock first.
    let secret = null;
    const t = state.profile.totp;
    if (t && t.enabled) {
      secret = await unlockSecret(curPass);
      if (!secret) { errEl.textContent = "Your current password could not unlock your 2FA key, so the email change was stopped — otherwise 2FA would have broken."; return; }
    }
    const oldEmail = currentUser.email;
    try {
      if (FIREBASE_ON) {
        const u = fb.auth.currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
        await u.reauthenticateWithCredential(cred);
        if (typeof u.verifyBeforeUpdateEmail === "function") {
          await u.verifyBeforeUpdateEmail(newEmail);
          okEl.textContent = "A confirmation link has been sent to the new email. Click it to complete the change. Until then, your current email remains your login, and 2FA keeps working as it is.";
          return;
        }
        await u.updateEmail(newEmail);
      } else {
        const users = lsUsers();
        if (!users[oldEmail] || users[oldEmail].pass !== curPass) { errEl.textContent = "Current password is incorrect."; return; }
        if (users[newEmail]) { errEl.textContent = "This email is already registered."; return; }
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
    $("setEmail").textContent = newEmail;
    renderProfile();
    $("emailCurPass").value = ""; $("newEmail").value = "";
    $("emailModal").classList.add("hidden");
    toast("Email changed — sign in with your new email from now on");
  });

  $("passForm").addEventListener("submit", async e => {
    e.preventDefault();
    const curPass = $("passCur").value, newPass = $("passNew").value;
    const okEl = $("passMsg"), errEl = $("passError");
    okEl.textContent = ""; errEl.textContent = "";
    if (newPass.length < 6) { errEl.textContent = "New password must be at least 6 characters."; return; }
    let secret = null;
    const t = state.profile.totp;
    if (t && t.enabled) {
      secret = await unlockSecret(curPass);
      if (!secret) { errEl.textContent = "Your current password could not unlock your 2FA key, so the password change was stopped. (If you reset your password by email, first sign out and come back in with your seed phrase.)"; return; }
    }
    try {
      if (FIREBASE_ON) {
        const u = fb.auth.currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, curPass);
        await u.reauthenticateWithCredential(cred);
        await u.updatePassword(newPass);
      } else {
        const users = lsUsers();
        if (!users[currentUser.email] || users[currentUser.email].pass !== curPass) { errEl.textContent = "Current password is incorrect."; return; }
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
    $("passModal").classList.add("hidden");
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
    if (!pass) { err.textContent = "Enter your password first."; return; }
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
        if (!users[currentUser.email] || users[currentUser.email].pass !== pass) { err.textContent = "Incorrect password — nothing was deleted."; return; }
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
