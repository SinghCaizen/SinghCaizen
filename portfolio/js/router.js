/* ================================================================
   FOLIO — Phase 2 hash router (v113). Presentation/navigation only.

   Design (audit R1/R2/R3):
   - The router ABSORBS switchView(): it wraps the fully-wrapped
     switchView one more time (this file loads last) and calls the
     whole existing chain on every navigation, so every wrapper
     side-effect keeps firing — folioView tracking + footer scope
     (features 198), PNG buttons (T4), scroll memory + view-enter +
     body[data-view] + legal link (T6), news-seen
     marker (folioC), the v89 history arm, render-on-switch (v91),
     analytics mount (ana), e2ee/quick/skip security-row refreshes.
   - History has ONE owner: the v89 modal/view history system.
     The router NEVER pushState()s — it only replaceState()s the
     hash on the current entry, so the Back stack is byte-for-byte
     the one v89 already maintained (modal close -> Home -> exit).
   - Per-tab scroll memory stays where it already lives (the T6
     switchView wrap, viewScrollMem). The router adds only the
     missing piece: tap the ACTIVE dock tab -> smooth-scroll top.
   - Route changes are gated exactly like renders (audit R3): if
     the app is not shown yet (auth / gate / unlock still up) the
     route waits; if uiBusy() is true (modal open, field focused)
     the route queues and retries on the app's own 1.2 s cadence.
   - Overlay routes (#/stock/<SYM>, #/report, #/share, #/help,
     #/legal, #/about) fire the existing opener, then restore the
     underlying view's hash — the overlays keep their own v89 /
     stock history entries, untouched (audit R2).
   - #/more presents the existing #moreSheet: the v89 manager
     already pushes exactly one history entry when it opens; the
     router only mirrors the hash to #/more and back on close.
   ================================================================ */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  var VIEW_HASH = { dashboard: "#/home", holdings: "#/holdings", watchlist: "#/watchlist", insights: "#/insights", news: "#/news", history: "#/history", profile: "#/account" };
  var HASH_VIEW = { "#/home": "dashboard", "#/holdings": "holdings", "#/watchlist": "watchlist", "#/insights": "insights", "#/news": "news", "#/history": "history", "#/account": "profile" };
  /* #/account/<key> -> index of the section panel inside #view-profile
     (static DOM order: 0 account card, 1 Personal Info, 2 Security,
     3 Data & Vault, 4 Danger Zone — the same order the profile
     accordion builder labels them). */
  var ACC = { profile: 1, security: 2, data: 3, danger: 4 };

  var pending = null;        /* route waiting for auth or for uiBusy() to clear */
  var staleHash = false;     /* hash left over from a previous signed-in session */
  var appWasShown = false;
  var keepHashOnce = false;  /* router is applying an account sub-route: the wrap must not stomp its hash */
  var retryTimer = null;
  var screenIdx = null;      /* Phase 4B: profile panel index currently presented as a settings screen (null = hub) */

  function appShown() { var a = $("appView"); return !!(a && !a.classList.contains("hidden")); }
  function currentView() {
    if (document.body && document.body.dataset && document.body.dataset.view) return document.body.dataset.view;
    var v = document.querySelector(".view:not(.hidden)");
    return v ? v.id.replace(/^view-/, "") : "dashboard";
  }
  function busy() { try { return typeof uiBusy === "function" && uiBusy(); } catch (e) { return false; } }
  function viewForHash(h) {
    for (var v in VIEW_HASH) if (VIEW_HASH[v] === h) return v;
    if (h && h.indexOf("#/account") === 0) return "profile";
    return null;
  }
  function setHash(h) {
    try {
      if (window.location.hash === h) return;
      var st = history.state, v = viewForHash(h);
      /* v136 fix (QA log, 2026-11-19): preserving a STALE folioView
         state while changing the URL rewrote other entries into
         mismatched state/URL pairs (a holdings entry ended up tagged
         #/insights; the insights entry got rewritten to holdings),
         which stalled Back and truncated the Forward stack. A mirror
         write must always produce a CONSISTENT entry: if the kept
         state names a different view than the hash, retag it. */
      if (v && st && st.folioView && st.folioView !== v) st = { folioView: v };
      history.replaceState(st, "", h);
    } catch (e) {}
  }
  /* v136: tag the boot entry with the view it boots into, so a Back
     traversal that lands on it knows its screen (the v89 tail reads
     history.state). Never overwrites an existing folioView tag. */
  function tagBoot() {
    try {
      var st = history.state;
      if (!st) history.replaceState({ folioView: currentView() }, "", window.location.hash || VIEW_HASH[currentView()] || "#/home");
    } catch (e) {}
  }
  function moreOpen() { var s = $("moreSheet"); return !!(s && !s.classList.contains("hidden")); }

  function parse(hash) {
    if (!hash || hash === "#") return null;               /* no route: never a navigation */
    if (hash === "#/") return { kind: "view", view: "dashboard", hash: "#/home" };
    if (hash === "#/dashboard") return { kind: "view", view: "dashboard", hash: "#/home" };
    if (hash === "#/profile") return { kind: "view", view: "profile", hash: "#/account" };
    if (hash.indexOf("#/profile/") === 0) {
      var pk = hash.slice("#/profile/".length);
      if (Object.prototype.hasOwnProperty.call(ACC, pk)) return { kind: "view", view: "profile", acc: ACC[pk], hash: "#/account/" + pk };
      return { kind: "view", view: "profile", hash: "#/account" };
    }
    if (HASH_VIEW[hash]) return { kind: "view", view: HASH_VIEW[hash], hash: hash };
    if (hash === "#/more") return { kind: "more", hash: hash };
    if (hash.indexOf("#/account/") === 0) {
      var k = hash.slice("#/account/".length);
      if (Object.prototype.hasOwnProperty.call(ACC, k)) return { kind: "view", view: "profile", acc: ACC[k], hash: hash };
      return { kind: "view", view: "profile", hash: "#/account" };
    }
    if (hash.indexOf("#/stock/") === 0) {
      var sym = "";
      try { sym = decodeURIComponent(hash.slice("#/stock/".length)).trim().toUpperCase(); } catch (e) {}
      if (sym) return { kind: "overlay", name: "stock", arg: sym, hash: hash };
      return { kind: "view", view: "dashboard", hash: "#/home" };
    }
    if (hash === "#/report") return { kind: "overlay", name: "report", hash: hash };
    if (hash === "#/share") return { kind: "overlay", name: "share", hash: hash };
    if (hash === "#/help") return { kind: "overlay", name: "help", hash: hash };
    if (hash === "#/legal") return { kind: "overlay", name: "legal", hash: hash };
    if (hash === "#/about") return { kind: "overlay", name: "about", hash: hash };
    return { kind: "view", view: "dashboard", hash: "#/home", unknown: true };  /* unknown hash -> Home */
  }

  function startRetry() {
    if (retryTimer) return;
    var n = 0;
    retryTimer = setInterval(function () {
      n++;
      if (!pending || n > 25) { clearInterval(retryTimer); retryTimer = null; return; }
      if (appShown() && !busy()) { var r = pending; clearInterval(retryTimer); retryTimer = null; applyRoute(r); }
    }, 1200);
  }

  /* ---- Phase 4B: settings-screen presentation state ----
     The router is the single writer. Screen state is presentation
     only: .prof-screen on #view-profile + .prof-screen-panel on the
     open section panel + .on on the matching #profIndex row (the
     desktop section index built by the features.js decorator). No
     DOM node is moved and no accordion state is touched beyond the
     pop rule: leaving a screen (hub route, or leaving the profile
     view) collapses the panel that was presented, returning the
     hub to its list look. Panel 0 (the account card) is never a
     screen — it is part of the hub itself. */
  function setScreen(idx) {
    var view = $("view-profile"); if (!view) return;
    var panels = view.querySelectorAll(":scope > .panel");
    if (screenIdx != null && idx == null && panels[screenIdx]) panels[screenIdx].classList.remove("open");
    screenIdx = idx;
    view.classList.toggle("prof-screen", idx != null);
    for (var i = 0; i < panels.length; i++) panels[i].classList.toggle("prof-screen-panel", idx != null && i === idx);
    var key = null;
    if (idx != null) for (var k in ACC) if (ACC[k] === idx) key = k;
    var rows = view.querySelectorAll("[data-prof-go]");
    for (var j = 0; j < rows.length; j++) {
      var on = !!key && rows[j].getAttribute("data-prof-go") === key;
      rows[j].classList.toggle("on", on);
      if (on) rows[j].setAttribute("aria-current", "true"); else rows[j].removeAttribute("aria-current");
    }
  }

  function openAccPanel(idx, tries) {
    var view = $("view-profile"); if (!view) return;
    var panels = view.querySelectorAll(":scope > .panel");
    var p = panels && panels[idx];
    if (!p) return;
    if (!p.classList.contains("acc-card")) {
      /* Accordions are built by a 1.5 s interval in features.js; wait for them. */
      if ((tries || 0) < 8) setTimeout(function () { openAccPanel(idx, (tries || 0) + 1); }, 200);
      else p.scrollIntoView({ block: "start" });
      return;
    }
    if (!p.classList.contains("open")) { var hd = p.querySelector(".acc-head"); if (hd) hd.click(); }
    setScreen(idx);
    setTimeout(function () { try { p.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) { p.scrollIntoView(); } }, 60);
  }

  function fireOverlay(r) {
    try {
      if (r.name === "stock") { if (typeof openStock === "function") openStock(r.arg); }
      else if (r.name === "report") { if (window.openReportSheet) window.openReportSheet(); }
      else if (r.name === "share") { if (window.openShareSheet) window.openShareSheet({ type: "summary" }); }
      else if (r.name === "help") { var h = $("helpModal"); if (h) h.classList.remove("hidden"); }
      else if (r.name === "legal") { var t = $("termsModal"); if (t) t.classList.remove("hidden"); }
      else if (r.name === "about") {
        var v = $("aboutVer");
        if (v && typeof FOLIO_VER !== "undefined") v.textContent = "Version " + FOLIO_VER.replace("Folio ", "") + (typeof FOLIO_BUILT !== "undefined" && FOLIO_BUILT ? " \u00b7 Built " + FOLIO_BUILT : "");
        var a = $("aboutModal"); if (a) a.classList.remove("hidden");
      }
    } catch (e) {}
  }

  function applyRoute(r) {
    if (!r) return;
    if (!appShown()) { pending = r; startRetry(); return; }
    if (busy()) { pending = r; startRetry(); return; }
    pending = null;
    if (r.kind === "view") {
      if (currentView() !== r.view) {
        if (r.acc != null) keepHashOnce = true;
        try { switchView(r.view); } catch (e) {}
        keepHashOnce = false;
      }
      if (r.acc != null) openAccPanel(r.acc);
      else if (r.view === "profile") setScreen(null);  /* hub route: pop any settings screen */
      setHash(r.hash);
    } else if (r.kind === "more") {
      /* v131: a Back/Forward traversal that merely LANDS on a stale
         #/more entry (the hub was closed long ago; its entry is dead)
         must not re-open the hub — the v89 manager owns Back and it
         never opens layers. Only a fresh hash assignment (deep link,
         FolioRouter.navigate) opens it. */
      if (Date.now() - lastPopAt < 1500) { setHash(VIEW_HASH[currentView()] || "#/home"); return; }
      var s = $("moreSheet");
      if (s && s.classList.contains("hidden")) s.classList.remove("hidden");
      setHash("#/more");
    } else if (r.kind === "overlay") {
      fireOverlay(r);
      setHash(VIEW_HASH[currentView()] || "#/home");
    }
  }

  /* ---- absorb switchView: outermost wrap; the whole existing
     chain runs first, the hash is mirrored afterwards. ---- */
  if (typeof switchView === "function") {
    var _prevSwitch = switchView;
    switchView = function (name) {
      var r = _prevSwitch.apply(this, arguments);
      try {
        if (name !== "profile") setScreen(null);  /* leaving Account pops any settings screen */
        if (!keepHashOnce && appShown() && !moreOpen()) {
          var h = VIEW_HASH[name];
          if (h) setHash(h);
        }
      } catch (e) {}
      return r;
    };
  }

  /* v131: when the last popstate happened — applyRoute uses it to
     tell a traversal landing on #/more apart from a fresh hash
     assignment to #/more. */
  var lastPopAt = 0;
  window.addEventListener("popstate", function () { lastPopAt = Date.now(); });

  window.addEventListener("hashchange", function () {
    /* v136 fix: a Back/Forward traversal across entries with
       different hashes fires popstate AND hashchange. The v89
       popstate tail has already switched to the landed entry's view;
       re-applying the route here switched a SECOND time (unguarded),
       whose arm push truncated the Forward stack. Inside the pop
       window, only mirror the hash of the view that is showing. */
    var rPeek = parse(window.location.hash);
    if (Date.now() - lastPopAt < 1500 && rPeek && rPeek.kind === "view" && rPeek.view === currentView()) { setHash(VIEW_HASH[currentView()] || "#/home"); return; }
    var r = parse(window.location.hash);
    if (!r) return;
    if (!appShown()) { staleHash = false; pending = r; startRetry(); return; }
    applyRoute(r);
  });

  /* ---- tap the ACTIVE dock tab -> smooth scroll to top ----
     (capture listener snapshots the view before the existing
     dock handler runs switchView; the bubble listener — registered
     after features.js', so it runs after that handler — acts only
     when the tapped tab was already the current view.) */
  var clickSnap = null;
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-bnav]") : null;
    clickSnap = b ? { view: b.getAttribute("data-bnav"), cur: currentView() } : null;
  }, true);
  document.addEventListener("click", function () {
    var s = clickSnap; clickSnap = null;
    if (!s || !s.view || s.view !== s.cur) return;
    if (!appShown() || busy()) return;
    setTimeout(function () {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
      try { if (typeof viewScrollMem !== "undefined" && viewScrollMem) viewScrollMem[s.view] = 0; } catch (e) {}
    }, 80);
  }, false);

  function init() {
    /* Mirror #moreSheet open/close into the hash (v89 keeps the
       single history entry; the router only relabels it). */
    var s = $("moreSheet");
    if (s) {
      new MutationObserver(function () {
        if (!appShown()) return;
        if (!s.classList.contains("hidden")) setHash("#/more");
        else if (window.location.hash === "#/more") setHash(VIEW_HASH[currentView()] || "#/home");
      }).observe(s, { attributes: true, attributeFilter: ["class"] });
    }
    /* Boot / sign-out bookkeeping: a route that arrives before the
       app is shown waits (deep link); a hash left over from a
       previous session is NOT applied after a fresh sign-in (the
       app lands on Home, exactly as before the router existed). */
    var a = $("appView");
    if (a) {
      new MutationObserver(function () {
        var shown = appShown();
        if (shown && !appWasShown) {
          appWasShown = true;
          tagBoot();
          if (staleHash) { staleHash = false; pending = null; setHash(VIEW_HASH[currentView()] || "#/home"); }
          else if (pending) applyRoute(pending);
          else setHash(VIEW_HASH[currentView()] || "#/home");
        } else if (!shown && appWasShown) {
          appWasShown = false; staleHash = true; pending = null;
        }
      }).observe(a, { attributes: true, attributeFilter: ["class"] });
    }
    var r = parse(window.location.hash);
    if (appShown()) { appWasShown = true; tagBoot(); if (r) applyRoute(r); else setHash(VIEW_HASH[currentView()] || "#/home"); }
    else if (r) pending = r;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.FolioRouter = {
    navigate: function (h) { window.location.hash = h; },
    /* Phase 4B: apply a route NOW, through the same path a hashchange
       takes, but without pushing a history entry (the router never
       pushStates — v89 owns the Back stack). Used by in-app section
       taps (accordion heads, the settings index) so the hash stays a
       replaceState mirror, exactly like every other navigation. */
    go: function (h) { var r = parse(h); if (r) applyRoute(r); },
    hashFor: function (view) { return VIEW_HASH[view] || "#/home"; }
  };
})();
