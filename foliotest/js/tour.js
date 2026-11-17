/* ================================================================
   FOLIO — guided tour (Phase 3, additive, lazy-loaded by
   js/authflow.js only when the tour is about to run; never part
   of the SW CORE list, same lazy contract as share.js/report.js).

   Five coach marks over elements that exist in the Phase 2 shell.
   A step whose anchor is missing is skipped silently. The tour
   never starts while a modal/sheet is open, ends silently if one
   opens mid-tour, is fully skippable (Skip / ✕ / Esc), honours
   prefers-reduced-motion, and marks itself done on this device
   (localStorage folio_tour_done_v1) the moment it first shows —
   automatic runs happen once per device; the More hub's
   "Take the tour" row can re-run it any time.
   It reads nothing about the account and changes no data; the
   only navigation it performs is the app's own switchView().
   ================================================================ */
(function () {
  "use strict";
  var FLAG = "folio_tour_done_v1";
  var CSS = [
    ".ft-block{position:fixed;inset:0;z-index:1400;background:transparent}",
    ".ft-hole{position:fixed;z-index:1401;border-radius:14px;box-shadow:0 0 0 9999px rgba(4,10,6,.58);pointer-events:none;transition:top .25s ease,left .25s ease,width .25s ease,height .25s ease}",
    ".ft-bubble{position:fixed;z-index:1402;width:min(320px,calc(100vw - 24px));background:var(--panel,#151916);color:var(--text,#edf3ee);border:1px solid var(--glass-line,rgba(237,243,238,.12));border-radius:var(--r-lg,20px);box-shadow:var(--sh-3,0 24px 60px rgba(0,0,0,.45));padding:16px;box-sizing:border-box;transition:top .25s ease,left .25s ease}",
    ".ft-bubble h4{margin:0 24px 6px 0;font-size:1rem;line-height:1.3}",
    ".ft-bubble p{margin:0;font-size:.9rem;line-height:1.45;color:var(--muted,#9db1a3)}",
    ".ft-x{position:absolute;top:8px;right:8px;width:36px;height:36px;border:none;background:none;color:var(--muted,#9db1a3);font-size:1rem;cursor:pointer;border-radius:10px}",
    ".ft-foot{display:flex;align-items:center;gap:8px;margin-top:14px}",
    ".ft-prog{flex:1;font-size:.78rem;color:var(--muted,#9db1a3);letter-spacing:.04em}",
    ".ft-btn{border:1px solid var(--line-strong,#5b6f62);background:var(--panel-2,#1e2420);color:var(--text,#edf3ee);border-radius:999px;padding:.5rem 1rem;font-size:.9rem;cursor:pointer;min-height:44px}",
    ".ft-btn.primary{background:var(--accent,#2fbd6b);border-color:var(--accent,#2fbd6b);color:var(--accent-ink,#04231a);font-weight:700}",
    "@media (prefers-reduced-motion: reduce){.ft-hole,.ft-bubble{transition:none}}"
  ].join("\n");

  var STEPS = [
    {
      title: "Your five tabs",
      text: "Home, Holdings, Watchlist, Insights and More live in this capsule. Tap a tab to jump — tap the tab you are already on to scroll back to the top.",
      find: function () { return document.querySelector(".samsung-bottom-capsule"); }
    },
    {
      title: "Add your stocks",
      text: "Every buy, sell and dividend goes in through Add Stock. Folio tracks only what you enter — no broker login, ever.",
      go: "holdings",
      find: function () { return document.getElementById("addStockBtn"); }
    },
    {
      title: "Insights",
      text: "Your report card, returns, risk numbers and planning tools live under Insights.",
      find: function () { return document.querySelector('[data-bnav="insights"]'); }
    },
    {
      title: "Jump straight to a section",
      text: "This jump bar takes you directly to any Insights section — Report Card, Risk, Allocation, Scenarios and more.",
      go: "insights",
      wait: 700,
      find: function () { return document.getElementById("anaJump"); }
    },
    {
      title: "The More hub",
      text: "News, History, your account and settings, PDF reports, share cards and this tour live under More.",
      find: function () { return document.getElementById("dockMoreBtn"); }
    }
  ];

  var running = false, idx = 0, els = null, mo = null, navigated = false;
  /* v129: the tour is a history layer like every other — one Back ends
     ONLY the tour (the v89 manager and the stock listener stand down
     while #folioTour exists), and ending it by tap hands its entry
     back through the shared __folioPopSuppress claim. */
  var tourFromPop = false, tourEntryLive = false;
  function onTourPop() { tourFromPop = true; end(false); }

  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function visible(elm) {
    if (!elm) return false;
    var r = elm.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var cs = window.getComputedStyle(elm);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }
  function anyModalOpen() { return !!document.querySelector(".modal:not(.hidden)"); }

  function build() {
    if (!document.getElementById("folioTourCss")) {
      var st = document.createElement("style");
      st.id = "folioTourCss"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var wrap = document.createElement("div");
    wrap.id = "folioTour";
    wrap.innerHTML =
      '<div class="ft-block"></div>' +
      '<div class="ft-hole"></div>' +
      '<div class="ft-bubble" role="dialog" aria-label="Guided tour">' +
      '<button type="button" class="ft-x" aria-label="Close tour">✕</button>' +
      "<h4></h4><p></p>" +
      '<div class="ft-foot"><span class="ft-prog"></span>' +
      '<button type="button" class="ft-btn ft-skip">Skip</button>' +
      '<button type="button" class="ft-btn primary ft-next">Next</button></div></div>';
    document.body.appendChild(wrap);
    els = {
      wrap: wrap,
      hole: wrap.querySelector(".ft-hole"),
      bubble: wrap.querySelector(".ft-bubble"),
      title: wrap.querySelector("h4"),
      text: wrap.querySelector("p"),
      prog: wrap.querySelector(".ft-prog"),
      next: wrap.querySelector(".ft-next"),
      skip: wrap.querySelector(".ft-skip")
    };
    wrap.querySelector(".ft-x").addEventListener("click", function () { end(true); });
    els.skip.addEventListener("click", function () { end(true); });
    els.next.addEventListener("click", function () { show(idx + 1); });
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    mo = new MutationObserver(function () {
      if (running && anyModalOpen()) end(false);
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
  }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); end(true); } }
  var rzT = null;
  function onResize() { clearTimeout(rzT); rzT = setTimeout(function () { if (running) place(currentAnchor); }, 120); }
  var currentAnchor = null;

  function place(anchor) {
    if (!anchor || !els) return;
    var r = anchor.getBoundingClientRect();
    var pad = 6;
    els.hole.style.top = (r.top - pad) + "px";
    els.hole.style.left = (r.left - pad) + "px";
    els.hole.style.width = (r.width + pad * 2) + "px";
    els.hole.style.height = (r.height + pad * 2) + "px";
    var bw = Math.min(320, window.innerWidth - 24);
    var bh = els.bubble.offsetHeight || 170;
    var left = Math.max(12, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - 12 - bw));
    var top = r.bottom + 16;
    if (top + bh > window.innerHeight - 12) top = Math.max(12, r.top - 16 - bh);
    els.bubble.style.left = left + "px";
    els.bubble.style.top = top + "px";
  }

  function show(i) {
    if (!running) return;
    if (i >= STEPS.length) { end(true); return; }
    idx = i;
    var step = STEPS[i];
    var proceed = function () {
      if (!running) return;
      if (anyModalOpen()) { end(false); return; }
      var anchor = null;
      try { anchor = step.find(); } catch (e) {}
      if (!visible(anchor)) { show(i + 1); return; } /* missing anchor: skip silently */
      currentAnchor = anchor;
      try { anchor.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
      setTimeout(function () {
        if (!running) return;
        els.title.textContent = step.title;
        els.text.textContent = step.text;
        els.prog.textContent = "Step " + (i + 1) + " of " + STEPS.length;
        els.next.textContent = i === STEPS.length - 1 ? "Done" : "Next";
        place(anchor);
      }, reduced() ? 30 : 260);
    };
    if (step.go && typeof switchView === "function") {
      navigated = true;
      try { switchView(step.go); } catch (e) {}
      setTimeout(proceed, step.wait || 450);
    } else {
      proceed();
    }
  }

  function end(finished) {
    if (!running) return;
    running = false;
    window.removeEventListener("popstate", onTourPop);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; }
    if (els && els.wrap && els.wrap.parentNode) els.wrap.parentNode.removeChild(els.wrap);
    els = null; currentAnchor = null;
    if (finished && navigated && typeof switchView === "function") {
      try { switchView("dashboard"); } catch (e) {}
    }
    navigated = false;
    if (!tourFromPop && tourEntryLive) {
      try { window.__folioPopSuppress = (window.__folioPopSuppress || 0) + 1; history.back(); } catch (e) {}
    }
    tourEntryLive = false;
    tourFromPop = false;
  }

  window.folioTourStart = function (manual) {
    if (running) return;
    var app = document.getElementById("appView");
    if (!app || app.classList.contains("hidden")) return;
    if (anyModalOpen()) {
      if (manual && typeof toast === "function") toast("Close the open window first, then take the tour.");
      return;
    }
    if (!manual) {
      try { if (localStorage.getItem(FLAG) === "1") return; } catch (e) {}
    }
    running = true; idx = 0; navigated = false;
    try { localStorage.setItem(FLAG, "1"); } catch (e) {} /* shown once per device */
    build();
    show(0);
    try { history.pushState({ folioTour: 1 }, ""); tourEntryLive = true; } catch (e) {}
    window.addEventListener("popstate", onTourPop);
  };
})();
