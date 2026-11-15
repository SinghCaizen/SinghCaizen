/* ================================================================
   FOLIO — Phase 3 presentation layer: auth screens, sign-up wizard,
   Security Checkup, first-run panel, tour launcher.

   PRESENTATION ONLY. This file performs NO auth, vault, gate or
   unlock operation. It never calls doAuth / doGoogleSignIn /
   doForgot / totp* / e2ee* / quick* functions; it only:
     - toggles which part of the EXISTING #authForm is visible
       (the sign-up stepper) and mirrors the existing mode label
       on the EXISTING Google button (same id, same handler);
     - toggles input.type for show/hide-password eyes (the exact
       thing the existing #passEye handler does);
     - renders a read-only Security Checkup from state the app
       already exposes, whose rows scroll to the EXISTING setting
       controls (or call the existing window.togglePrivacy());
     - shows a first-run panel whose buttons invoke the EXISTING
       flows (openTxn / the #importFile input, exactly like the
       More hub's Import row);
     - lazy-loads js/tour.js on demand.
   No data is read for display beyond booleans/counts listed in
   PHASE3-AUTH.md; nothing is logged; no network requests except
   the one same-origin tour.js script.
   ================================================================ */
(function () {
  function el(id) { return document.getElementById(id); }
  function reducedMotion() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  /* ---------------- 1. Sign-up wizard (progressive disclosure
     over the SAME #authForm; the submit path is untouched) ------ */
  var wizStep = 0; // 0 = name, 1 = email, 2 = password
  function wizSteps() { return Array.prototype.slice.call(document.querySelectorAll("#authForm .auth-step")); }
  function wizShow(n, focus) {
    var steps = wizSteps(); if (!steps.length) return;
    wizStep = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach(function (s, i) { s.classList.toggle("active", i === wizStep); });
    var form = el("authForm"); if (form) form.classList.toggle("wiz-last", wizStep === steps.length - 1);
    var prog = el("authWizProg"); if (prog) prog.textContent = "Step " + (wizStep + 1) + " of " + steps.length;
    var back = el("authWizBack"); if (back) back.style.visibility = wizStep === 0 ? "hidden" : "visible";
    var next = el("authWizNext"); if (next) next.style.visibility = wizStep === steps.length - 1 ? "hidden" : "visible";
    if (focus) { var inp = steps[wizStep].querySelector("input"); if (inp) { try { inp.focus(); } catch (e) {} } }
  }
  function wizMode(m) {
    var form = el("authForm"), nav = el("authWizNav");
    if (!form) return;
    if (m === "signup") {
      form.classList.add("wizard-on");
      if (nav) nav.classList.remove("hidden");
      wizShow(0, false);
    } else {
      form.classList.remove("wizard-on", "wiz-last");
      if (nav) nav.classList.add("hidden");
    }
    /* Same button, same id, same doGoogleSignIn handler — only the
       label mirrors the current tab, like #authSubmit already does. */
    var gb = el("googleBtn");
    if (gb) {
      for (var i = 0; i < gb.childNodes.length; i++) {
        var nd = gb.childNodes[i];
        if (nd.nodeType === 3 && nd.textContent.trim()) { nd.textContent = m === "signup" ? " Sign up with Google " : " Sign in with Google "; break; }
      }
    }
  }
  function wireWizard() {
    var form = el("authForm"); if (!form) return;
    var next = el("authWizNext"), back = el("authWizBack");
    if (next) next.addEventListener("click", function () { wizShow(wizStep + 1, true); });
    if (back) back.addEventListener("click", function () { wizShow(wizStep - 1, true); });
    /* Enter on an early step means "Continue" (the fields already
       carry enterkeyhint="next"); on the last step Enter submits
       through the untouched native form path, exactly as before. */
    form.addEventListener("keydown", function (e) {
      if (!form.classList.contains("wizard-on")) return;
      if (e.key !== "Enter") return;
      if (!e.target || e.target.tagName !== "INPUT") return;
      if (wizStep < wizSteps().length - 1) { e.preventDefault(); wizShow(wizStep + 1, true); }
    });
    /* If the EXISTING submit handler reports an error (its own
       message, in the existing #authError element), bring the step
       that holds the field into view. No validation is added here:
       empty email -> email step, anything else -> password step. */
    var err = el("authError");
    if (err && window.MutationObserver) {
      new MutationObserver(function () {
        if (!form.classList.contains("wizard-on")) return;
        if (!err.textContent || !err.textContent.trim()) return;
        var email = el("authEmail");
        wizShow(email && !email.value.trim() ? 1 : 2, true);
      }).observe(err, { childList: true, characterData: true, subtree: true });
    }
  }
  /* Wrap setAuthMode (app.js) — the original runs first, unchanged;
     we only restyle around its result. Same wrap pattern the app
     itself uses for switchView (e2ee.js / quickunlock.js). */
  if (typeof setAuthMode === "function") {
    var _setAuthModeP3 = setAuthMode;
    setAuthMode = function (m) { _setAuthModeP3(m); try { wizMode(m); } catch (e) {} };
  }

  /* ---------------- 2. Show/hide eyes ----------------
     #passEye is wired by app.js itself (unchanged). The gate and
     vault eyes are new buttons wired here; JS-built unlock inputs
     (#e2eePw, #quickPinInput, #skipPw) get an eye appended into
     their existing <label class="fld"> when they appear. Every eye
     does one thing: toggle that input's type + swap its glyph —
     the same presentation trick as the existing #passEye. */
  function wireEye(btnId, inputId) {
    var b = el(btnId), inp = el(inputId);
    if (!b || !inp || b.dataset.p3Wired) return;
    b.dataset.p3Wired = "1";
    b.addEventListener("click", function () {
      var show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.textContent = show ? "🙈" : "👁";
    });
  }
  function injectEyes() {
    var wanted = ["e2eePw", "quickPinInput", "skipPw"], done = 0;
    wanted.forEach(function (id) {
      var inp = el(id);
      if (!inp) return;
      var host = inp.closest("label");
      if (!host) { done++; return; }
      if (host.querySelector(".p3-eye")) { done++; return; }
      host.classList.add("p3-eye-host");
      var b = document.createElement("button");
      b.type = "button"; b.className = "p3-eye"; b.title = "Show or hide"; b.setAttribute("aria-label", "Show or hide"); b.textContent = "👁";
      b.addEventListener("click", function () {
        var show = inp.type === "password";
        inp.type = show ? "text" : "password";
        b.textContent = show ? "🙈" : "👁";
      });
      host.appendChild(b);
      done++;
    });
    return done === wanted.length;
  }

  /* ---------------- 3. Security Checkup ----------------
     Read-only. Every value comes from state the app already keeps;
     every action scrolls to (and opens) the EXISTING control, or
     calls the EXISTING window.togglePrivacy(). Nothing here can
     change a setting. */
  function secPanel() {
    var view = el("view-profile"); if (!view) return null;
    return view.querySelectorAll(":scope > .panel")[2] || null;
  }
  function gotoSetting(target) {
    if (!target) return;
    var sec = secPanel();
    if (sec && sec.classList.contains("acc-card") && !sec.classList.contains("open")) {
      var head = sec.querySelector(".acc-head"); if (head) head.click();
    }
    setTimeout(function () {
      try { target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (e) {}
    }, 60);
  }
  function badge(on, onTxt, offTxt) {
    return '<span class="ds-badge ' + (on ? "ds-badge--pos" : "ds-badge--warn") + '">' + (on ? onTxt : offTxt) + "</span>";
  }
  function row(icon, title, sub, rightHtml, gotoId) {
    var inner = '<span class="ds-row__icon"><svg class="ds-icon ds-icon--sm"><use href="#' + icon + '"/></svg></span>' +
      '<span class="ds-row__main"><span class="ds-row__title">' + title + '</span>' +
      (sub ? '<span class="ds-row__sub">' + sub + "</span>" : "") + "</span>" + (rightHtml || "");
    if (gotoId) return '<button type="button" class="ds-row sec-row" data-goto="' + gotoId + '">' + inner + '<span class="ds-row__chev"><svg class="ds-icon ds-icon--sm"><use href="#i-chev-r"/></svg></span></button>';
    return '<div class="ds-row ds-row--static">' + inner + "</div>";
  }
  async function renderCheckup() {
    var card = el("secCheckup");
    if (!card) return;
    if (typeof currentUser === "undefined" || !currentUser || typeof state === "undefined" || !state) { card.classList.add("hidden"); return; }
    var prof = state.profile || {};
    /* Sign-in method — Firebase providerData; demo users are plain
       objects without it and are email/password by construction. */
    var method = "Email & password";
    try {
      var pd = currentUser.providerData || [];
      for (var i = 0; i < pd.length; i++) { if (pd[i] && pd[i].providerId === "google.com") { method = "Google"; break; } }
      if (!currentUser.providerData) method = "Email & password (this browser)";
    } catch (e) {}
    var emailVerifiable = typeof currentUser.emailVerified === "boolean";
    var emailVerified = emailVerifiable && currentUser.emailVerified === true;
    var totpOn = !!(prof.totp && prof.totp.enabled);
    var codesLeft = (prof.recovery || []).length;
    var e2eeOn = !!((typeof window !== "undefined" && window.__e2eeActive) || (typeof E2 !== "undefined" && E2 && E2.wraps));
    var e2eeSub = !e2eeOn ? "Cloud stores your data unencrypted" :
      (window.__e2eeActive ? "Cloud stores ciphertext only" : "On — locked on this device right now");
    var quickOn = false, skipOn = false;
    if (e2eeOn && typeof quickRecord === "function") {
      try {
        var rec = await quickRecord();
        var mine = !!(rec && rec.email === currentUser.email);
        quickOn = !!(mine && (rec.bio || rec.pin));
        skipOn = !!(mine && rec.skip);
      } catch (e) {}
    }
    var autoLockOn = prof.autoLock !== undefined ? !!prof.autoLock : totpOn;
    var privOn = document.body.classList.contains("privacy-on");
    /* The counted protections: only rows that are knowable booleans. */
    var counted = [totpOn, e2eeOn, quickOn, skipOn];
    if (emailVerifiable) counted.unshift(emailVerified);
    var onCount = counted.filter(Boolean).length;

    var html = '<div class="sec-checkup-head"><h3><svg class="ds-icon"><use href="#i-shield"/></svg> Security Checkup</h3>' +
      '<span class="sec-summary">' + onCount + " of " + counted.length + " protections on</span></div>";
    html += row("i-user", "Sign-in method", "", '<span class="ds-row__value">' + method + "</span>", null);
    if (emailVerifiable) html += row("i-check", "Email verified", emailVerified ? "Your email address is confirmed" : "Not confirmed yet — check your inbox for the verification mail", badge(emailVerified, "Verified", "Not verified"), null);
    html += row("i-shield", "Two-factor authentication (2FA)", totpOn ? "Recovery codes left: " + codesLeft + " of 8" : "Off — a code from an authenticator app after your password", badge(totpOn, "On", "Off"), "totp");
    html += row("i-shield", "Vault encryption (E2EE)", e2eeSub, badge(e2eeOn, "On", "Off"), "e2ee");
    html += row("i-check", "Quick unlock on this device", e2eeOn ? (quickOn ? "Fingerprint / face / PIN set up here" : "Not set up on this device") : "Needs vault encryption first", badge(quickOn, "On", "Off"), e2eeOn ? "quick" : "e2ee");
    html += row("i-check", "Skip password on this device", e2eeOn ? (skipOn ? "This device opens straight to your dashboard" : "This device asks for your password") : "Needs vault encryption first", badge(skipOn, "On", "Off"), e2eeOn ? "skip" : "e2ee");
    html += row("i-check", "Auto-lock after 15 minutes", autoLockOn ? "Locks the app when you step away" : "Off — the app stays open", badge(autoLockOn, "On", "Off"), "autolock");
    html += row("i-eye", "Privacy Mode (hide amounts)", privOn ? "Amounts are blurred on this screen" : "Amounts are visible", badge(privOn, "On", "Off"), "privacy");
    html += '<p class="sec-checkup-note">Tap a row to jump to that setting. This card only reports — it never changes anything itself.</p>';
    card.innerHTML = html;
    card.classList.remove("hidden");
  }
  function wireCheckup() {
    var card = el("secCheckup");
    if (card) {
      card.addEventListener("click", function (e) {
        var r = e.target.closest("[data-goto]"); if (!r) return;
        var g = r.dataset.goto;
        if (g === "privacy") { if (window.togglePrivacy) window.togglePrivacy(); setTimeout(renderCheckup, 60); return; }
        var target = g === "totp" ? el("totpArea") :
          g === "e2ee" ? el("e2eeSecRow") :
          g === "quick" ? el("quickSecRow") :
          g === "skip" ? el("skipSecRow") :
          g === "autolock" ? (el("autoLockToggle") ? el("autoLockToggle").closest(".setting-row") : null) : null;
        gotoSetting(target);
      });
    }
    /* Security actions taken in the panel below (toggles, setup
       buttons) refresh the card shortly after they land. */
    var view = el("view-profile");
    if (view) view.addEventListener("click", function (e) {
      if (e.target.closest("#secCheckup")) return;
      if (e.target.closest("button, input, label")) setTimeout(function () { try { renderCheckup(); } catch (err) {} }, 800);
    });
  }

  /* ---------------- 4. First-run empty state ----------------
     Shown only when the signed-in account has zero transactions
     AND zero holdings. Dismissal is a session flag on this device
     (sessionStorage) — never account data. */
  function frEval() {
    var p = el("firstRunPanel"); if (!p) return;
    var show = false;
    try {
      var app = el("appView");
      var dismissed = sessionStorage.getItem("folio_firstrun_skip") === "1";
      if (app && !app.classList.contains("hidden") && typeof currentUser !== "undefined" && currentUser && !dismissed && typeof state !== "undefined" && state) {
        var tx = (state.txns || []).length;
        var holds = 0;
        try { var h = (typeof computeHoldings === "function") ? computeHoldings() : []; holds = Array.isArray(h) ? h.length : 0; } catch (e) {}
        show = tx === 0 && holds === 0;
      }
    } catch (e) {}
    p.classList.toggle("hidden", !show);
  }
  function wireFirstRun() {
    var add = el("frAdd"), imp = el("frImport"), skip = el("frSkip");
    if (add) add.addEventListener("click", function () { if (typeof openTxn === "function") openTxn("BUY", "", ""); });
    if (imp) imp.addEventListener("click", function () { var f = el("importFile"); if (f) f.click(); });
    if (skip) skip.addEventListener("click", function () {
      try { sessionStorage.setItem("folio_firstrun_skip", "1"); } catch (e) {}
      frEval();
    });
    var tm = el("txnModal");
    if (tm && window.MutationObserver) {
      new MutationObserver(function () { if (tm.classList.contains("hidden")) setTimeout(frEval, 300); })
        .observe(tm, { attributes: true, attributeFilter: ["class"] });
    }
  }

  /* ---------------- 5. Tour launcher ----------------
     tour.js stays lazy (never in the SW CORE list, like share /
     report). Auto-start: once per device, the first time the app
     is fully entered and no modal/sheet is open. */
  var tourLoading = false;
  window.folioTourLoad = function (manual) {
    if (typeof window.folioTourStart === "function") { window.folioTourStart(!!manual); return; }
    if (tourLoading) return;
    tourLoading = true;
    var sc = document.createElement("script");
    sc.src = "js/tour.js?v=1"; sc.async = true;
    sc.onload = function () { tourLoading = false; if (typeof window.folioTourStart === "function") window.folioTourStart(!!manual); };
    sc.onerror = function () {
      tourLoading = false;
      if (manual && typeof toast === "function") toast("The tour could not load — please check your connection and try again.");
    };
    document.head.appendChild(sc);
  };
  function tourAutoStart() {
    var done = false;
    try { done = localStorage.getItem("folio_tour_done_v1") === "1"; } catch (e) {}
    if (done) return;
    var app = el("appView"); if (!app) return;
    var started = false, tries = 0;
    function clearMoment() {
      if (app.classList.contains("hidden")) return false;
      if (document.querySelector(".modal:not(.hidden)")) return false;
      if (!el("gateView") || !el("gateView").classList.contains("hidden")) return false;
      return true;
    }
    function poll() {
      if (started) return;
      tries++;
      if (clearMoment()) { started = true; window.folioTourLoad(false); return; }
      if (tries < 30) setTimeout(poll, 800);
    }
    if (!app.classList.contains("hidden")) { setTimeout(poll, 1200); return; }
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!app.classList.contains("hidden")) { mo.disconnect(); setTimeout(poll, 1200); }
      });
      mo.observe(app, { attributes: true, attributeFilter: ["class"] });
    }
  }

  /* ---------------- boot wiring ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    wireWizard();
    wireEye("gateEye", "gatePass");
    wireEye("vaultEye", "vaultPass");
    wireCheckup();
    wireFirstRun();
    frEval();
    tourAutoStart();
    if (window.MutationObserver && !injectEyes()) {
      var mo = new MutationObserver(function () { if (injectEyes()) mo.disconnect(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 120000);
    }
    /* Outermost switchView wrap (installed last, like the app's
       own wraps): the whole existing chain runs first; afterwards
       we refresh the two read-only Phase 3 surfaces. */
    if (typeof switchView === "function") {
      var _svP3 = switchView;
      switchView = function (n) {
        _svP3(n);
        try { if (n === "profile") renderCheckup(); } catch (e) {}
        try { frEval(); } catch (e) {}
      };
    }
    var app = el("appView");
    if (app && window.MutationObserver) {
      new MutationObserver(function () { if (!app.classList.contains("hidden")) frEval(); })
        .observe(app, { attributes: true, attributeFilter: ["class"] });
    }
  });
})();
