/* ===== FIREBASE CONFIG =====
   LILA: paste your Firebase web config here (from Firebase Console >
   Project settings > Your apps > Web app). These keys are safe to keep
   in the website code - Firebase web keys are public by design; your
   data is protected by your login and Firestore rules.
   Until real keys are pasted, the site runs in DEMO mode (browser-only). */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  appId: "PASTE_YOUR_APP_ID"
};
window.FIREBASE_READY = window.FIREBASE_CONFIG.apiKey.indexOf("PASTE_") !== 0;
