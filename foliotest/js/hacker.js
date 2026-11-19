/* =====================================================================
   FOLIO — HACKER SKIN + EFFECTS (v137, LILA's order 2026-11-19)
   Pure presentation layer. Reads/writes NO portfolio data.
   - Theme: html[data-skin] = matrix | cyan | amber (localStorage
     folio_skin, default matrix), set pre-paint by theme-init.js.
   - Effects ride the app's own Animations system (FolioMotion):
     Full = "full", Light = "reduced", Off = "off" (data-anim).
   Loaded LAST so its wrappers sit outermost.
   ===================================================================== */
(function () {
  "use strict";
  var SKINS = [["matrix", "MATRIX"], ["cyan", "CYAN"], ["amber", "AMBER"]];
  var GLYPHS = "0123456789#$%*<>/\\|=+";

  function skin() { return document.documentElement.getAttribute("data-skin") || "matrix"; }
  function fx() {
    try { if (window.FolioMotion && FolioMotion.effective) return FolioMotion.effective(); } catch (e) {}
    return document.documentElement.getAttribute("data-anim") || "full";
  }
  function accent() {
    try { return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#00ff66"; } catch (e) { return "#00ff66"; }
  }

  /* ---------------- theme switching ---------------- */
  function syncSkinUI() {
    var s = skin(), i, b = document.getElementById("themeBtn");
    if (b) b.textContent = ">_ " + (s === "matrix" ? "MATRIX" : s === "cyan" ? "CYAN" : "AMBER");
    var btns = document.querySelectorAll("[data-skin-opt]");
    for (i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].getAttribute("data-skin-opt") === s);
    rainColor();
  }
  function setSkin(s) {
    document.documentElement.setAttribute("data-skin", s);
    document.documentElement.setAttribute("data-theme", "dark");
    try { localStorage.setItem("folio_skin", s); localStorage.setItem("pf_theme", "dark"); } catch (e) {}
    syncSkinUI();
  }
  window.FolioSkin = { get: skin, set: setSkin };

  function initThemeBtn() {
    var btn = document.getElementById("themeBtn");
    if (!btn || btn.dataset.hkBound) return;
    var nb = btn.cloneNode(false);           /* clone drops app.js's light/dark listener */
    nb.id = "themeBtn"; nb.dataset.hkBound = "1";
    nb.setAttribute("aria-label", "Switch terminal theme");
    btn.parentNode.replaceChild(nb, btn);
    nb.addEventListener("click", function () {
      var cur = skin(), nxt = "matrix";
      for (var i = 0; i < SKINS.length; i++) if (SKINS[i][0] === cur) nxt = SKINS[(i + 1) % SKINS.length][0];
      setSkin(nxt);
      if (typeof toast === "function") toast("THEME // " + nxt.toUpperCase());
    });
    syncSkinUI();
  }

  /* ---------------- profile settings panel (theme + effects) ---------------- */
  function ensurePanel() {
    var view = document.getElementById("view-profile");
    if (!view || document.getElementById("hkPanel")) return;
    var sec = document.createElement("section");
    sec.className = "hk-panel"; sec.id = "hkPanel";
    sec.innerHTML =
      "<h3>Terminal Interface</h3>" +
      "<p>Theme aur effects sirf look badalte hain — features, data aur calculations bilkul same rehte hain.</p>" +
      '<div class="hk-row"><span>Theme</span><span class="seg" role="group" aria-label="Terminal theme">' +
      '<button type="button" class="seg-btn" data-skin-opt="matrix">Matrix</button>' +
      '<button type="button" class="seg-btn" data-skin-opt="cyan">Cyan</button>' +
      '<button type="button" class="seg-btn" data-skin-opt="amber">Amber</button></span></div>' +
      '<div class="hk-row"><span>Effects</span><span class="seg" role="group" aria-label="Effects">' +
      '<button type="button" class="seg-btn" data-anim-opt="full">Full</button>' +
      '<button type="button" class="seg-btn" data-anim-opt="reduced">Light</button>' +
      '<button type="button" class="seg-btn" data-anim-opt="off">Off</button></span></div>';
    view.appendChild(sec);
    sec.addEventListener("click", function (ev) {
      var t = ev.target.closest ? ev.target.closest("button") : null;
      if (!t) return;
      var so = t.getAttribute("data-skin-opt");
      if (so) { setSkin(so); return; }
      var ao = t.getAttribute("data-anim-opt");
      if (ao && window.FolioMotion && FolioMotion.set) {
        FolioMotion.set(ao);
        setTimeout(function () { rainSync(); }, 60);
      }
    });
    syncSkinUI();
    try { if (window.FolioMotion && FolioMotion.apply) FolioMotion.apply(); } catch (e) {}
    syncFxSeg();
  }

  function syncFxSeg() {
    var panel = document.getElementById("hkPanel");
    if (!panel) return;
    var stored = null;
    try { stored = localStorage.getItem("folio_anim"); } catch (e) {}
    if (stored === "full" || stored === "reduced" || stored === "off") return; /* folioAnimApply already syncs explicit settings */
    var eff = fx();
    panel.querySelectorAll("[data-anim-opt]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-anim-opt") === eff);
    });
  }

  /* ---------------- boot sequence in the splash ---------------- */
  function bootSeq() {
    var sp = document.getElementById("splash");
    if (!sp || sp.dataset.hkBoot) return;
    sp.dataset.hkBoot = "1";
    if (fx() === "off") return;
    try { if (getComputedStyle(sp).display === "none") return; } catch (e) {}
    var box = document.createElement("div");
    box.id = "hkBoot"; sp.appendChild(box);
    var lines = ["> INITIALIZING FOLIO", "> LOADING VAULT", "> SECURE CONNECTION OK"];
    if (fx() === "reduced") { box.textContent = lines.join("\n"); return; }
    var li = 0, ci = 0, done = "";
    (function tick() {
      if (!document.body.contains(sp)) return;
      if (li >= lines.length) { box.textContent = done; return; }
      var line = lines[li];
      ci++;
      box.textContent = done + line.slice(0, ci) + "_";
      if (ci >= line.length) { done += line + "\n"; li++; ci = 0; setTimeout(tick, 70); }
      else setTimeout(tick, 16);
    })();
  }

  /* ---------------- ACCESS GRANTED ---------------- */
  var lastGranted = 0;
  function granted() {
    if (fx() === "off") return;
    var now = Date.now();
    if (now - lastGranted < 5000) return;
    lastGranted = now;
    var ov = document.createElement("div");
    ov.id = "hkGranted";
    ov.innerHTML = '<div class="hk-granted-box">ACCESS GRANTED</div>';
    document.body.appendChild(ov);
    setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, fx() === "full" ? 820 : 650);
  }
  function wrapShowApp() {
    if (typeof window.showApp !== "function" || window.showApp.__hk) return;
    var orig = window.showApp;
    var wrapped = function () { var r = orig.apply(this, arguments); try { granted(); } catch (e) {} return r; };
    wrapped.__hk = true;
    window.showApp = wrapped;
  }

  /* ---------------- auth terminal head + AUTHENTICATING ---------------- */
  function initAuth() {
    var card = document.querySelector(".auth-card");
    if (card && !card.querySelector(".hk-auth-head")) {
      var head = document.createElement("div");
      head.className = "hk-auth-head";
      head.innerHTML = '<span id="hkAuthLine">&gt; ACCESS PORTAL</span><span class="hk-dots">&#9679;&#9679;&#9679;</span>';
      card.insertBefore(head, card.firstChild);
    }
    var form = document.getElementById("authForm");
    if (form && !form.dataset.hkBound) {
      form.dataset.hkBound = "1";
      form.addEventListener("submit", function () {
        var line = document.getElementById("hkAuthLine");
        if (line && fx() !== "off") line.textContent = "> AUTHENTICATING...";
      });
    }
  }

  /* ---------------- matrix rain ---------------- */
  var rainCv = null, rainCtx = null, rainCols = [], rainRun = false, rainFrame = 0, rainCol = "#00ff66";
  function rainColor() { rainCol = accent(); }
  var rainBand = false;
  function rainWanted() {
    if (fx() !== "full" || document.hidden) return false;
    var auth = document.getElementById("authView");
    if (auth && !auth.classList.contains("hidden")) { if (rainBand) { rainBand = false; rainResize(); } return true; }
    var app = document.getElementById("appView");
    if (app && !app.classList.contains("hidden")) {
      var dash = document.getElementById("view-dashboard");
      if (dash && !dash.classList.contains("hidden")) { if (!rainBand) { rainBand = true; rainResize(); } return true; }
    }
    return false;
  }
  function rainSetup() {
    if (rainCv) return;
    rainCv = document.createElement("canvas");
    rainCv.id = "hkRain"; rainCv.setAttribute("aria-hidden", "true");
    document.body.insertBefore(rainCv, document.body.firstChild);
    rainCtx = rainCv.getContext("2d");
    rainResize(); rainColor();
    window.addEventListener("resize", rainResize);
  }
  function rainResize() {
    if (!rainCv) return;
    rainCv.width = Math.min(window.innerWidth, 1440);
    rainCv.height = rainBand ? 260 : window.innerHeight;
    var n = Math.ceil(rainCv.width / 20);
    rainCols = [];
    for (var i = 0; i < n; i++) rainCols.push({ y: Math.random() * -40, s: .4 + Math.random() * .9 });
    rainCtx.font = "15px 'JetBrains Mono', monospace";
  }
  var KATA = "アカサタナハマヤラワガザダバパ0123456789$#*+=<>";
  function rainStep() {
    if (!rainRun) return;
    requestAnimationFrame(rainStep);
    if (!rainWanted()) return;
    rainFrame++;
    if (rainFrame % 3) return;                    /* ~20fps — gentle on battery */
    var w = rainCv.width, h = rainCv.height;
    rainCtx.fillStyle = "rgba(0,0,0,0.14)";
    rainCtx.fillRect(0, 0, w, h);
    rainCtx.fillStyle = rainCol;
    for (var i = 0; i < rainCols.length; i++) {
      var c = rainCols[i], x = i * 20, y = c.y * 20;
      rainCtx.globalAlpha = .10 + Math.random() * .22;
      rainCtx.fillText(KATA.charAt((Math.random() * KATA.length) | 0), x, y);
      c.y += c.s;
      if (y > h && Math.random() > .976) c.y = Math.random() * -24;
    }
    rainCtx.globalAlpha = 1;
  }
  function rainSync() {
    if (fx() === "full") {
      rainSetup();
      if (!rainRun) { rainRun = true; requestAnimationFrame(rainStep); }
    } else if (rainCv && rainCv.parentNode) {
      rainRun = false;
      rainCv.parentNode.removeChild(rainCv);
      rainCv = null; rainCtx = null;
    }
  }

  /* ---------------- typewriter view titles + dock glitch ---------------- */
  var typerId = 0;
  function typeTitle(viewEl) {
    if (fx() !== "full" || !viewEl) return;
    var h = viewEl.querySelector(".panel-head h2") || viewEl.querySelector("h2");
    if (!h) return;
    var full = h.dataset.hkText || h.textContent.trim();
    if (!full || full.length > 42) return;
    h.dataset.hkText = full;
    var my = ++typerId, i = 0;
    (function tick() {
      if (my !== typerId || !document.body.contains(h)) return;
      i++;
      h.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(tick, 14);
    })();
  }
  function wrapSwitchView() {
    if (typeof window.switchView !== "function" || window.switchView.__hk) return;
    var orig = window.switchView;
    var wrapped = function (name) {
      var r = orig.apply(this, arguments);
      try {
        ensurePanel();
        syncFxSeg();
        var v = document.getElementById("view-" + name);
        typeTitle(v);
        if (fx() === "full") {
          var dock = document.querySelector(".dock");
          if (dock) { dock.classList.remove("hk-glitch"); void dock.offsetWidth; dock.classList.add("hk-glitch"); setTimeout(function () { dock.classList.remove("hk-glitch"); }, 340); }
        }
        rainSync();
      } catch (e) {}
      return r;
    };
    wrapped.__hk = true;
    window.switchView = wrapped;
  }

  /* ---------------- dashboard number scramble (on dashboard entry) ---------------- */
  var scrambleArmed = false;
  function scrambleEl(el) {
    var final = el.textContent.trim();
    if (!final || final.length > 18 || !/[0-9]/.test(final)) return;
    if (el.dataset.hkLast === final) return;
    el.dataset.hkLast = final;
    var digits = 0, i;
    for (i = 0; i < final.length; i++) if (/[0-9]/.test(final[i])) digits++;
    if (digits < 2) return;
    var start = null;
    function frame(ts) {
      if (!document.body.contains(el)) return;
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 550), lock = Math.floor(p * digits), seen = 0, out = "";
      for (var j = 0; j < final.length; j++) {
        var ch = final[j];
        if (/[0-9]/.test(ch)) { seen++; out += seen <= lock ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }
        else out += ch;
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = final;
    }
    requestAnimationFrame(frame);
  }
  function wrapRenderDashboard() {
    if (typeof window.renderDashboard !== "function" || window.renderDashboard.__hk) return;
    var orig = window.renderDashboard;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try {
        if (scrambleArmed && fx() === "full") {
          scrambleArmed = false;
          var vals = document.querySelectorAll("#view-dashboard .stat-value");
          for (var i = 0; i < vals.length; i++) scrambleEl(vals[i]);
        }
      } catch (e) {}
      return r;
    };
    wrapped.__hk = true;
    window.renderDashboard = wrapped;
  }
  function wrapSwitchArm() {
    if (typeof window.switchView !== "function" || window.switchView.__hkArm) return;
    var prev = window.switchView;
    var wrapped = function (name) {
      if (name === "dashboard") scrambleArmed = true;
      return prev.apply(this, arguments);
    };
    wrapped.__hk = true; wrapped.__hkArm = true;
    window.switchView = wrapped;
  }

  /* ---------------- init ---------------- */
  function versionToast() {
    try {
      var label = (window.FOLIO_BUILD && window.FOLIO_BUILD.label) || "";
      if (!label) return;
      var seen = localStorage.getItem("folio_seen_build");
      localStorage.setItem("folio_seen_build", label);
      if (seen && seen !== label && typeof toast === "function") {
        setTimeout(function () { toast("NEW VERSION LOADED // " + label.toUpperCase()); }, 1400);
      }
    } catch (e) {}
  }
  function init() {
    document.documentElement.setAttribute("data-theme", "dark");
    versionToast();
    initThemeBtn();
    initAuth();
    ensurePanel();
    bootSeq();
    wrapShowApp();
    wrapSwitchView();
    wrapRenderDashboard();
    wrapSwitchArm();
    rainSync();
    document.addEventListener("visibilitychange", rainSync);
    document.addEventListener("click", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-anim-opt]") : null;
      if (t) { setTimeout(rainSync, 80); setTimeout(rainSync, 450); setTimeout(syncFxSeg, 120); }
    });
    setInterval(rainSync, 4000);                 /* safety: keep rain state honest */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
