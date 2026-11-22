/* =====================================================================
   FIREBASE CONFIG — sirf ye ek file badalni hai cloud login/sync ke liye.
   ---------------------------------------------------------------------
   Jab tak neeche wale values "PASTE_" se shuru hote hain, website
   LOCAL mode me chalegi (bina login ke, progress isi browser me save).
   Apna Firebase web config yaha paste karte hi Sign Up / Sign In aur
   cloud sync apne aap ON ho jayega. Poore steps: Settings → Cloud Sync.
   Sirf PUBLIC config yaha aata hai — koi secret/private key kabhi nahi.
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
