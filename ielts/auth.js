/* =====================================================================
   IELTS STUDY — auth.js (Firebase Auth + Firestore sync)
   Modular SDK, pinned version 10.12.2, official gstatic CDN.
   Agar firebase-config.js me placeholder values hain to ye file kuch
   nahi karti — website LOCAL mode me chalti rehti hai (koi lock nahi).
   Config milte hi: Sign Up / Sign In / Google login + cloud sync ON.
   ===================================================================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE_');
window.FIREBASE_CONFIGURED = !!configured;

const $ = s => document.querySelector(s);

if (!configured) {
  // Local mode: gate kabhi nahi dikhega, account card me setup ki jankari
  window.CloudSync = { enabled: false, save: function () {} };
  window.renderAccountInfo = function () {
    const el = $('#accountInfo');
    if (el) el.innerHTML = '<p>Abhi website <strong>local mode</strong> me hai — progress isi browser me save hoti hai. Cloud login ke liye neeche wale steps se Firebase setup karo (ek baar ka kaam hai), phir Noor ko config bhej do.</p>';
    const so = $('#btnSignOut'); if (so) so.hidden = true;
    const ss = $('#syncStatus'); if (ss) ss.textContent = 'Sync: Local only';
    if (window.setSavedStatus) window.setSavedStatus('● Local', false);
  };
} else {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let uid = null;
  let syncTimer = null;
  let pendingState = null;

  const gate = $('#authGate');
  const card = $('#authCard');
  const loading = $('#authLoading');
  gate.hidden = false; card.hidden = true; loading.hidden = false;

  /* ---------- Cloud sync: 1s debounce + honest status + offline queue ---------- */
  let lastPushOk = false;
  async function pushState(state) {
    if (!uid) return;
    try {
      if (window.setSavedStatus) window.setSavedStatus('Syncing…', true);
      await setDoc(doc(db, 'users', uid, 'data', 'state'), {
        state: state, updatedAt: new Date().toISOString()
      });
      lastPushOk = true;
      pendingState = null;
      if (window.setSyncBlocked) window.setSyncBlocked(false);
      if (window.setSavedStatus) window.setSavedStatus('Synced ✓', true);
      const ss = $('#syncStatus'); if (ss) ss.textContent = 'Sync: Synced ✓ (cloud)';
    } catch (e) {
      pendingState = state; // queue — retry hota rahega
      if (e && e.code === 'permission-denied') {
        // Firestore rules is path ko rok rahe hain — ye offline nahi, rules ki dikkat hai
        if (window.setSyncBlocked) window.setSyncBlocked(true);
        const ss = $('#syncStatus'); if (ss) ss.textContent = 'Sync: BLOCKED — Firestore rules update chahiye (neeche wala box dekho)';
      } else {
        if (window.setSavedStatus) window.setSavedStatus('Offline — will retry', true);
        const ss = $('#syncStatus'); if (ss) ss.textContent = 'Sync: Offline — connection aate hi sync hoga';
      }
    }
  }
  setInterval(() => { if (pendingState && uid) pushState(pendingState); }, 30000);
  window.CloudSync = {
    enabled: true,
    save: function (state) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => pushState(state), 1000);
    }
  };
  window.addEventListener('online', () => {
    if (pendingState) { const s = pendingState; pendingState = null; pushState(s); }
  });

  /* ---------- Auth state ---------- */
  onAuthStateChanged(auth, async user => {
    loading.hidden = true;
    if (!user) {
      uid = null;
      card.hidden = false;
      if (window.setSavedStatus) window.setSavedStatus('● Signed out', false);
      return;
    }
    uid = user.uid;
    gate.hidden = true;
    if (window.setSavedStatus) window.setSavedStatus('Syncing…', true);
    if (window.renderAccountInfo) window.renderAccountInfo();

    // Cloud state load karo
    let cloudState = null;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'state'));
      if (snap.exists()) cloudState = snap.data().state;
    } catch (e) { /* offline — local se chalega */ }

    const local = window.getLocalState ? window.getLocalState() : null;
    const localHasData = local && (
      Object.keys(local.progress || {}).length ||
      Object.values(local.notes || {}).some(n => (n || '').trim())
    );
    const offerKey = 'ieltsImportOffered.' + uid;
    if (localHasData && !localStorage.getItem(offerKey)) {
      localStorage.setItem(offerKey, '1');
      const yes = confirm('Is device par purani (bina-login wali) progress mili hai. Use apne account me jod dein? (Merge hoga, kuch delete nahi hoga.)');
      if (yes) {
        const merged = mergeStates(cloudState, local);
        window.applyCloudState(merged);
        pushState(merged);
        return;
      }
    }
    if (cloudState) window.applyCloudState(cloudState);
    // Writability test + taaza state cloud par pakka karo (rules ki dikkat yahi pakdi jayegi)
    const cur = window.getLocalState ? window.getLocalState() : null;
    if (cur) pushState(cur);
  });

  function mergeStates(cloud, local) {
    if (!cloud) return local;
    if (!local) return cloud;
    const m = Object.assign({}, cloud);
    ['progress', 'completedOn', 'notes', 'bookmarks', 'positions', 'pdfPage', 'dayDone', 'focusByDate'].forEach(k => {
      m[k] = Object.assign({}, cloud[k] || {}, local[k] || {});
    });
    m.favorites = [...new Set([].concat(cloud.favorites || [], local.favorites || []))];
    if (!m.plan && local.plan) m.plan = local.plan;
    return m;
  }

  /* ---------- Auth UI ---------- */
  let mode = 'signin';
  const submitBtn = $('#authSubmit');
  function setMode(m) {
    mode = m;
    $('#tabSignIn').classList.toggle('is-active', m === 'signin');
    $('#tabSignUp').classList.toggle('is-active', m === 'signup');
    $('#authTitle').textContent = m === 'signin' ? 'Welcome back' : 'Create your account';
    $('#authSub').textContent = m === 'signin'
      ? 'Sign in karke apni progress har device par pao.'
      : 'Account banao — progress cloud me save hogi, har device par milegi.';
    submitBtn.textContent = m === 'signin' ? 'Sign In' : 'Sign Up';
    $('#authPass').setAttribute('autocomplete', m === 'signin' ? 'current-password' : 'new-password');
    showError('');
  }
  $('#tabSignIn').addEventListener('click', () => setMode('signin'));
  $('#tabSignUp').addEventListener('click', () => setMode('signup'));
  $('#authPassToggle').addEventListener('click', () => {
    const p = $('#authPass');
    p.type = p.type === 'password' ? 'text' : 'password';
  });
  function showError(msg) {
    const e = $('#authError');
    e.hidden = !msg;
    e.textContent = msg || '';
  }
  function friendly(err) {
    const code = (err && err.code) || '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
      return 'Email ya password galat hai. Dobara check karo.';
    if (code.includes('email-already-in-use')) return 'Is email se account pehle se hai. Sign In karo.';
    if (code.includes('weak-password')) return 'Password kam se kam 6 characters ka rakho.';
    if (code.includes('invalid-email')) return 'Email sahi format me likho.';
    if (code.includes('popup-closed')) return 'Google wala popup band ho gaya. Dobara try karo.';
    if (code.includes('network')) return 'Internet connection check karo.';
    return 'Kuch gadbad ho gayi: ' + (err && err.message ? err.message : 'unknown error');
  }
  function busy(b) {
    submitBtn.disabled = b;
    submitBtn.textContent = b ? 'Ek second…' : (mode === 'signin' ? 'Sign In' : 'Sign Up');
  }
  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#authEmail').value.trim();
    const pass = $('#authPass').value;
    if (!email || !pass) { showError('Email aur password dono bharo.'); return; }
    busy(true); showError('');
    try {
      if (mode === 'signin') await signInWithEmailAndPassword(auth, email, pass);
      else await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { showError(friendly(err)); }
    busy(false);
  });
  $('#btnGoogle').addEventListener('click', async () => {
    showError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { showError(friendly(err)); }
  });
  $('#authForgot').addEventListener('click', async () => {
    const email = $('#authEmail').value.trim();
    if (!email) { showError('Pehle upar apna email likho, phir Forgot password dabao.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      showError('');
      alert('Password reset email bhej diya hai: ' + email + ' — inbox (aur spam folder) check karo.');
    } catch (err) { showError(friendly(err)); }
  });

  window.renderAccountInfo = function () {
    const el = $('#accountInfo');
    const user = auth.currentUser;
    if (el) el.innerHTML = user
      ? '<p>Signed in as <strong>' + (user.email || 'Google user') + '</strong> ☁️<br><span class="muted">Progress cloud me save ho rahi hai — kisi bhi device par sign in karo, sab waisa hi milega.</span></p>'
      : '<p>Signed out.</p>';
    const so = $('#btnSignOut'); if (so) so.hidden = !user;
    const ss = $('#syncStatus'); if (ss) ss.textContent = user ? 'Sync: Cloud ON' : 'Sync: —';
  };
  const soBtn = $('#btnSignOut');
  if (soBtn) soBtn.addEventListener('click', async () => {
    await signOut(auth);
    gate.hidden = false; card.hidden = false;
  });
}
