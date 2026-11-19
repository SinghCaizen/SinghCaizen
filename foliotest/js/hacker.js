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
    var lines = ["> INITIALIZING FOLIO...", "> DECRYPTING VAULT...", "> ACCESS GRANTED"];
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
  var rainCv = null, rainCtx = null, rainCols = [], rainRun = false, rainFrame = 0, rainCol = "#00ff66", rainDim = false;
  function rainColor() { rainCol = accent(); }
  var rainBand = false;
  var rainPartyUntil = 0;
  window.__hkRainParty = function (sec) {
    if (fx() === "off") return;
    rainPartyUntil = Date.now() + (sec || 10) * 1000;
    if (rainBand) { rainBand = false; }
    rainSetup(); rainResize();
    if (!rainRun) { rainRun = true; requestAnimationFrame(rainStep); }
    setTimeout(rainSync, (sec || 10) * 1000 + 400);
  };
  function rainWanted() {
    if (document.hidden) return false;
    if (Date.now() < rainPartyUntil) { if (rainBand) { rainBand = false; rainResize(); } return fx() !== "off"; }
    if (fx() !== "full") return false;
    var auth = document.getElementById("authView");
    if (auth && !auth.classList.contains("hidden")) { if (rainBand) { rainBand = false; rainResize(); } return true; }
    var app = document.getElementById("appView");
    if (app && !app.classList.contains("hidden")) {
      var dash = document.getElementById("view-dashboard");
      if (dash && !dash.classList.contains("hidden")) { if (!rainBand) { rainBand = true; rainResize(); } rainDim = false; return true; }
      /* v141: rain behind every view, dimmed outside login/dashboard */
      if (rainBand) { rainBand = false; rainResize(); }
      rainDim = true;
      return true;
    }
    rainDim = false;
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
    rainCv.height = rainBand && Date.now() >= rainPartyUntil ? 260 : window.innerHeight;
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
      rainCtx.globalAlpha = Date.now() < rainPartyUntil ? .30 + Math.random() * .30 : (rainDim ? .05 + Math.random() * .10 : .10 + Math.random() * .22);
      rainCtx.fillText(KATA.charAt((Math.random() * KATA.length) | 0), x, y);
      c.y += c.s;
      if (y > h && Math.random() > .976) c.y = Math.random() * -24;
    }
    rainCtx.globalAlpha = 1;
  }
  function rainSync() {
    if (fx() === "off") {
      if (rainCv && rainCv.parentNode) { rainRun = false; rainCv.parentNode.removeChild(rainCv); rainCv = null; rainCtx = null; }
      return;
    }
    if (fx() === "full" || Date.now() < rainPartyUntil) {
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
  var GLYPHS = "!<>-_\\/[]{}=+*^?#0101";
  function typeTitle(viewEl) {
    if (fx() !== "full" || !viewEl) return;
    var h = viewEl.querySelector(".panel-head h2") || viewEl.querySelector("h2");
    if (!h) return;
    var full = h.dataset.hkText || h.textContent.trim();
    if (!full || full.length > 42) return;
    h.dataset.hkText = full;
    var my = ++typerId, frame = 0;
    var total = Math.max(6, Math.round(full.length * 0.9));
    (function tick() {
      if (my !== typerId || !document.body.contains(h)) return;
      frame++;
      var cut = Math.floor(full.length * frame / total);
      var out = full.slice(0, cut);
      for (var j = cut; j < full.length; j++) out += full.charAt(j) === " " ? " " : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      h.textContent = out;
      if (frame < total) setTimeout(tick, 24);
      else h.textContent = full;
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

/* ================================================================
   v139 — sounds, status bar, holdings ticker, activity log,
   dashboard greeting, entrance choreography, terminal toasts,
   easter-egg rain. Everything obeys the Effects setting and only
   ever DECORATES the app: no feature, calculation or data changes.
   ================================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function fx() { try { return window.FolioMotion ? FolioMotion.effective() : "full"; } catch (e) { return "full"; } }
  function escT(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------------- sound engine (Web Audio, synthesized) -------- */
  var AC = null, master = null;
  var sfx = { on: true, vol: 0.5 };
  try { var savedSfx = JSON.parse(localStorage.getItem("folio_sfx") || "null"); if (savedSfx) { sfx.on = savedSfx.on !== false; sfx.vol = typeof savedSfx.vol === "number" ? Math.min(1, Math.max(0, savedSfx.vol)) : 0.5; } } catch (e) {}
  var lastGesture = 0;
  function saveSfx() { try { localStorage.setItem("folio_sfx", JSON.stringify(sfx)); } catch (e) {} syncSfxUI(); }
  function acInit() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return true; }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      AC = new Ctx(); master = AC.createGain(); master.gain.value = sfx.vol * 0.9; master.connect(AC.destination);
      return true;
    } catch (e) { return false; }
  }
  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!sfx.on || !AC || AC.state !== "running") return;
    try {
      var t0 = AC.currentTime + (delay || 0);
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  var lastVib = 0;
  function buzz10() {
    try {
      if (typeof folioHapticsOn === "function" && !folioHapticsOn()) return;
      if (navigator.vibrate && Date.now() - lastVib > 90) { lastVib = Date.now(); navigator.vibrate(10); }
    } catch (e) {}
  }
  var Snd = {
    tap: function () { tone(950, 0.05, "square", 0.20); buzz10(); },
    tick: function () { tone(720, 0.07, "square", 0.22, 0, 1180); buzz10(); },
    open: function () { tone(280, 0.16, "sine", 0.26, 0, 720); },
    close: function () { tone(720, 0.14, "sine", 0.22, 0, 260); },
    togOn: function () { tone(660, 0.06, "square", 0.20); tone(990, 0.08, "square", 0.20, 0.055); },
    togOff: function () { tone(990, 0.06, "square", 0.19); tone(620, 0.08, "square", 0.19, 0.055); },
    ok: function () { tone(880, 0.07, "square", 0.24); tone(1318, 0.10, "square", 0.24, 0.07); },
    err: function () { tone(150, 0.20, "sawtooth", 0.26); },
    warn: function () { tone(392, 0.10, "square", 0.22); tone(392, 0.12, "square", 0.22, 0.13); },
    chirp: function () { tone(1250, 0.05, "sine", 0.18); tone(1560, 0.05, "sine", 0.18, 0.05); tone(1870, 0.06, "sine", 0.18, 0.10); },
    chord: function () { tone(523, 0.22, "sine", 0.22); tone(659, 0.22, "sine", 0.20, 0.07); tone(784, 0.26, "sine", 0.22, 0.14); tone(1046, 0.30, "sine", 0.18, 0.21); },
    power: function () { tone(640, 0.28, "sine", 0.24, 0, 110); },
    key: function () { tone(1350, 0.018, "square", 0.06); },
    up: function () { tone(587, 0.07, "sine", 0.20); tone(880, 0.10, "sine", 0.20, 0.06); },
    down: function () { tone(392, 0.07, "sine", 0.19); tone(262, 0.11, "sine", 0.19, 0.06); },
    boot: function () { tone(196, 0.30, "sine", 0.20, 0, 784); tone(392, 0.18, "sine", 0.14, 0.16); tone(784, 0.22, "sine", 0.14, 0.26); },
    burst: function () {
      if (!sfx.on || !AC || AC.state !== "running") return;
      try {
        var len = Math.floor(AC.sampleRate * 0.07);
        var buf = AC.createBuffer(1, len, AC.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = AC.createBufferSource(); src.buffer = buf;
        var f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.8;
        var g = AC.createGain(); g.gain.value = 0.16;
        src.connect(f); f.connect(g); g.connect(master); src.start();
      } catch (e) {}
    }
  };
  window.HkSfx = {
    setOn: function (v) { sfx.on = !!v; saveSfx(); if (sfx.on) { acInit(); Snd.ok(); } },
    setVol: function (v) { sfx.vol = Math.min(1, Math.max(0, Number(v) || 0)); if (master) master.gain.value = sfx.vol * 0.9; saveSfx(); },
    isOn: function () { return sfx.on; },
    play: function (name) { if (Snd[name]) Snd[name](); }
  };

  /* ---------------- activity log (real events only) -------------- */
  var LOG_KEY = "folio_actlog";
  function logEvent(msg) {
    try {
      var arr = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      arr.push({ t: Date.now(), m: msg });
      while (arr.length > 60) arr.shift();
      localStorage.setItem(LOG_KEY, JSON.stringify(arr));
    } catch (e) {}
    renderLog();
  }
  function renderLog() {
    var body = $("hkLogBody"); if (!body) return;
    var arr = []; try { arr = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch (e) {}
    if (!arr.length) { body.innerHTML = '<p class="hk-log-empty">// NO EVENTS RECORDED YET</p>'; return; }
    body.innerHTML = arr.slice(-30).reverse().map(function (e) {
      return '<div class="hk-log-line">[' + new Date(e.t).toLocaleTimeString("en-GB") + "] " + escT(e.m) + "</div>";
    }).join("");
  }

  /* ---------------- status bar ----------------------------------- */
  var lastSyncTs = 0;
  function buildStatus() {
    if ($("hkStatus")) return;
    var app = $("appView"); if (!app) return;
    var bar = document.createElement("div");
    bar.id = "hkStatus"; bar.className = "hk-status";
    bar.innerHTML = '<span id="hkStSys">SYS: ONLINE</span><span class="hk-st-sep">|</span><span>PRICES: DELAYED 15M</span><span class="hk-st-sep">|</span><span id="hkStSync">LAST SYNC: --:--:--</span><span class="hk-st-sep">|</span><span id="hkStVault">VAULT: —</span>';
    var head = app.querySelector(".topbar") || app.firstElementChild;
    if (head && head.parentNode) head.parentNode.insertBefore(bar, head.nextSibling);
    else app.insertBefore(bar, app.firstChild);
  }
  function updateStatus() {
    var sys = $("hkStSys"), sync = $("hkStSync"), vault = $("hkStVault");
    if (sys) sys.textContent = "SYS: " + (navigator.onLine ? "ONLINE" : "OFFLINE");
    if (sync) sync.textContent = "LAST SYNC: " + (lastSyncTs ? new Date(lastSyncTs).toLocaleTimeString("en-GB") : "--:--:--");
    if (vault) {
      var locked = false;
      try { locked = !!(window.e2eeNeedsUnlock && e2eeNeedsUnlock()); } catch (e) {}
      vault.textContent = "VAULT: " + (locked ? "LOCKED" : "UNLOCKED");
    }
  }

  /* ---------------- holdings ticker tape ------------------------- */
  var tapeBuiltAt = 0;
  function buildTape() {
    var dash = $("view-dashboard"); if (!dash) return;
    var tape = $("hkTape");
    if (!tape) {
      tape = document.createElement("div");
      tape.id = "hkTape"; tape.className = "hk-tape hidden";
      tape.innerHTML = '<div class="hk-tape-track" id="hkTapeTrack"></div>';
      dash.insertBefore(tape, dash.firstChild);
    }
    if (Date.now() - tapeBuiltAt < 4000 && !tape.classList.contains("hidden")) return;
    var rows = [];
    try { rows = enriched().rows.filter(function (r) { return r.ltp != null; }); } catch (e) {}
    if (!rows.length) { tape.classList.add("hidden"); return; }
    tapeBuiltAt = Date.now();
    var html = rows.map(function (r) {
      var p = null; try { p = priceOf(r.sym); } catch (e) {}
      var day = p && p.prevClose ? (p.price / p.prevClose - 1) * 100 : null;
      var cls = day == null ? "" : day >= 0 ? "gain" : "loss";
      var arrow = day == null ? "" : day >= 0 ? "▲" : "▼";
      return '<span class="hk-tape-item"><b>' + escT(r.sym) + "</b> " + inr2(r.ltp) + (day == null ? "" : ' <i class="' + cls + '">' + arrow + Math.abs(day).toFixed(2) + "%</i>") + "</span>";
    }).join('<span class="hk-tape-sep">//</span>');
    var track = $("hkTapeTrack");
    if (track) {
      track.innerHTML = html + '<span class="hk-tape-sep">//</span>' + html + '<span class="hk-tape-sep">//</span>';
      track.style.animationDuration = Math.max(16, rows.length * 5) + "s";
    }
    tape.classList.remove("hidden");
  }

  /* ---------------- dashboard greeting (once per session) -------- */
  function greet() {
    var dash = $("view-dashboard"); if (!dash) return;
    if (ssGet("hk_greet")) return;
    var g = $("hkGreet");
    if (!g) { g = document.createElement("div"); g.id = "hkGreet"; g.className = "hk-greet"; dash.insertBefore(g, dash.firstChild); }
    ssSet("hk_greet", "1");
    var name = "TRADER";
    try {
      var dn = "";
      if (typeof displayName === "function") dn = displayName();
      if (!dn) dn = (state.profile && state.profile.name) || (window.currentUser && currentUser.name) || "";
      name = String(dn || "TRADER").split(" ")[0].toUpperCase() || "TRADER";
    } catch (e) {}
    if (name === "TRADER") g.dataset.fallback = "1"; else delete g.dataset.fallback;
    var full = "> WELCOME BACK, " + name;
    if (fx() === "full") {
      var rest = full.slice(2), i = 0;
      g.textContent = "> _";
      var step = function () {
        if (!g.isConnected) return;
        i++;
        g.textContent = "> " + rest.slice(0, i) + "_";
        if (i < rest.length) setTimeout(step, 34);
      };
      setTimeout(step, 120);
    } else {
      g.textContent = full + (fx() === "off" ? "" : "_");
    }
  }

  /* ---------------- entrance choreography (once per element) ----- */
  var io = null;
  function entranceScan(viewName) {
    if (fx() === "off" || viewName === "profile") return;
    var view = viewName ? $("view-" + viewName) : document.querySelector(".view:not(.hidden)");
    if (!view) return;
    var els = view.querySelectorAll(".panel:not([data-hk-seen]), .stat-card:not([data-hk-seen])");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) return;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("hk-on"); io.unobserve(en.target); } });
      }, { threshold: 0.05 });
    }
    var idx = 0;
    els.forEach(function (el) {
      el.setAttribute("data-hk-seen", "1");
      el.classList.add("hk-in");
      el.style.transitionDelay = Math.min(idx++, 8) * 45 + "ms";
      io.observe(el);
      setTimeout(function () { el.classList.add("hk-on"); }, 1800); /* safety: never leave a card hidden */
    });
  }

  /* ---------------- profile panel: sounds + activity log --------- */
  function syncMuteBtn() { var b = $("hkMuteBtn"); if (b) b.textContent = sfx.on ? "♪ ON" : "♪ OFF"; }
  function syncSfxUI() {
    document.querySelectorAll("[data-sfx-opt]").forEach(function (b) { b.classList.toggle("active", (b.getAttribute("data-sfx-opt") === "on") === sfx.on); });
    var v = $("hkVol"); if (v && document.activeElement !== v) v.value = Math.round(sfx.vol * 100);
    syncMuteBtn();
  }
  function extendPanel() {
    var panel = $("hkPanel"); if (!panel || panel.dataset.hk2) return;
    panel.dataset.hk2 = "1";
    var rows = panel; /* v139 fix: rows are direct children of the panel */
    var srow = document.createElement("div"); srow.className = "hk-row";
    srow.innerHTML = '<span class="hk-row-label">SOUND FX</span><span class="seg seg-small"><button type="button" class="seg-btn" data-sfx-opt="on">ON</button><button type="button" class="seg-btn" data-sfx-opt="off">OFF</button></span>';
    rows.appendChild(srow);
    var vrow = document.createElement("div"); vrow.className = "hk-row";
    vrow.innerHTML = '<span class="hk-row-label">VOLUME</span><input type="range" id="hkVol" class="hk-vol" min="0" max="100" step="5" value="' + Math.round(sfx.vol * 100) + '" aria-label="Sound volume">';
    rows.appendChild(vrow);
    srow.querySelectorAll("[data-sfx-opt]").forEach(function (b) { b.addEventListener("click", function () { HkSfx.setOn(b.getAttribute("data-sfx-opt") === "on"); }); });
    var vol = vrow.querySelector("#hkVol");
    vol.addEventListener("input", function () { HkSfx.setVol(vol.value / 100); });
    vol.addEventListener("change", function () { if (sfx.on) { acInit(); Snd.ok(); } });
    syncSfxUI();
    var lp = document.createElement("section");
    lp.className = "hk-panel"; lp.id = "hkLogPanel";
    lp.innerHTML = '<div class="hk-panel-head">&gt; ACTIVITY LOG_</div><div id="hkLogBody" class="hk-log"></div><button type="button" class="mini-btn" id="hkLogClear">CLEAR LOG</button>';
    panel.parentNode.insertBefore(lp, panel.nextSibling);
    lp.querySelector("#hkLogClear").addEventListener("click", function () { try { localStorage.removeItem(LOG_KEY); } catch (e) {} renderLog(); });
    renderLog();
  }
  function buildHeaderBtns() {
    var tb = $("themeBtn"); if (!tb || !tb.parentNode) return;
    if (!$("hkMuteBtn")) {
      var b = document.createElement("button");
      b.type = "button"; b.id = "hkMuteBtn"; b.className = "theme-btn hk-head-btn"; b.setAttribute("aria-label", "Toggle sounds");
      b.addEventListener("click", function () { HkSfx.setOn(!sfx.on); if (window.toast) toast(sfx.on ? "SOUND: ON" : "SOUND: OFF"); });
      tb.parentNode.insertBefore(b, tb);
    }
    if (!$("hkCmdBtn")) {
      var k = document.createElement("button");
      k.type = "button"; k.id = "hkCmdBtn"; k.className = "theme-btn hk-head-btn"; k.textContent = ">_ CMD";
      k.title = "Command palette (Ctrl+K or /)"; k.setAttribute("aria-label", "Open command palette");
      k.addEventListener("click", function () { if (typeof window.platPalette === "function") platPalette(); });
      tb.parentNode.insertBefore(k, tb);
    }
    syncMuteBtn();
  }

  /* ---------------- wrappers: sounds + log + status -------------- */
  function wrapToast2() {
    if (typeof window.toast !== "function" || window.toast.__hk2) return;
    var orig = window.toast;
    var w = function (msg, undoFn) {
      var m = String(msg == null ? "" : msg);
      try {
        if (sfx.on && AC && Date.now() - lastGesture < 4000) {
          if (/error|could not|failed|invalid|not recognised|enter a valid/i.test(m)) Snd.err();
          else if (/delet|remov/i.test(m)) Snd.warn();
          else if (/saved|added|updated|imported|created|refreshed/i.test(m)) Snd.ok();
        }
        if (/transaction.*added|entry updated/i.test(m)) logEvent("TRANSACTION SAVED");
        else if (/deleted/i.test(m)) logEvent("RECORD DELETED");
      } catch (e) {}
      var out = m;
      if (out && out.charAt(0) !== ">") out = (/^(error|could not|failed|invalid)/i.test(m) ? "> ERROR: " : "> ") + out;
      return orig.call(this, out, undoFn);
    };
    w.__hk2 = true;
    window.toast = w;
  }
  var lastAutoLogAt = 0, prevDayPnl = null;
  function wrapRefresh2() {
    if (typeof window.refreshPrices !== "function" || window.refreshPrices.__hk2) return;
    var orig = window.refreshPrices;
    var w = async function () {
      var userInit = Date.now() - lastGesture < 2500;
      var r = await orig.apply(this, arguments);
      try {
        var nowPnl = null;
        try { nowPnl = enriched().dayPnl; } catch (e) {}
        if (userInit && sfx.on && AC && prevDayPnl !== null && typeof nowPnl === "number" && nowPnl !== prevDayPnl) {
          if (nowPnl > prevDayPnl) Snd.up(); else Snd.down();
          var sv = $("stValue");
          var card = sv ? sv.closest(".stat-card, .panel") : null;
          if (card) {
            card.classList.remove("hk-flash-gain", "hk-flash-loss");
            void card.offsetWidth;
            card.classList.add(nowPnl > prevDayPnl ? "hk-flash-gain" : "hk-flash-loss");
            setTimeout(function () { card.classList.remove("hk-flash-gain", "hk-flash-loss"); }, 800);
          }
        }
        if (typeof nowPnl === "number") prevDayPnl = nowPnl;
      } catch (e) {}
      try {
        lastSyncTs = Date.now(); updateStatus();
        var n = 0; try { n = Object.keys(prices || {}).length; } catch (e) {}
        if (userInit) { if (sfx.on && AC) Snd.chirp(); logEvent("PRICES REFRESHED (" + n + " SYMBOLS)"); }
        else if (Date.now() - lastAutoLogAt > 10 * 60 * 1000) { lastAutoLogAt = Date.now(); logEvent("PRICES AUTO-REFRESHED (" + n + " SYMBOLS)"); }
        buildTape();
      } catch (e) {}
      return r;
    };
    w.__hk2 = true;
    window.refreshPrices = w;
  }
  function wrapShowApp2() {
    if (typeof window.showApp !== "function" || window.showApp.__hk2) return;
    var orig = window.showApp;
    var w = function () {
      var r = orig.apply(this, arguments);
      try {
        if (!ssGet("hk_sess_log")) { ssSet("hk_sess_log", "1"); logEvent("SESSION STARTED"); }
        if (sfx.on && AC && Date.now() - lastGesture < 20000) Snd.chord();
        setTimeout(function () { buildStatus(); updateStatus(); buildTape(); greet(); entranceScan("dashboard"); }, 400);
      } catch (e) {}
      return r;
    };
    w.__hk2 = true; w.__hkApp = true;
    window.showApp = w;
  }
  function wrapSwitchView2() {
    if (typeof window.switchView !== "function" || window.switchView.__hk2) return;
    var orig = window.switchView;
    var w = function (name) {
      var r = orig.apply(this, arguments);
      try {
        if (sfx.on && AC && Date.now() - lastGesture < 1500) Snd.tick();
        entranceScan(name);
        if (name === "profile") { extendPanel(); renderLog(); }
        if (name === "dashboard") { buildTape(); greet(); }
        updateStatus();
      } catch (e) {}
      return r;
    };
    w.__hk2 = true; w.__hk = true;
    window.switchView = w;
  }
  function wrapSkinLog() {
    if (window.FolioSkin && FolioSkin.set && !FolioSkin.set.__hk2) {
      var os = FolioSkin.set;
      var w = function (s) { var r = os.apply(this, arguments); try { logEvent("THEME CHANGED → " + String(s).toUpperCase()); } catch (e) {} return r; };
      w.__hk2 = true;
      FolioSkin.set = w;
    }
  }

  /* ---------------- layer sounds + error buzz -------------------- */
  var modalSndAt = 0;
  function watchLayers() {
    if (watchLayers.done || !document.body) return;
    watchLayers.done = true;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "childList") {
          m.addedNodes.forEach(function (n) { if (n.id === "folioErrBanner" && sfx.on && AC) Snd.err(); });
          continue;
        }
        var el = m.target;
        if (!el.classList || !(el.classList.contains("modal") || el.classList.contains("sheet") || el.id === "cmdkPop")) continue;
        if (Date.now() - modalSndAt < 200) continue;
        modalSndAt = Date.now();
        if (!sfx.on || !AC || Date.now() - lastGesture > 6000) continue;
        if (el.classList.contains("hidden")) Snd.close(); else Snd.open();
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
  }

  /* ---------------- global gesture / key wiring ------------------ */
  document.addEventListener("pointerdown", function () { lastGesture = Date.now(); if (sfx.on) acInit(); }, true);
  document.addEventListener("pointerup", function () { if (sfx.on) acInit(); }, true);
  document.addEventListener("click", function () { if (sfx.on) acInit(); }, true);
  document.addEventListener("keydown", function () { lastGesture = Date.now(); }, true);
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    /* sign-out: power-down + log */
    var btn = t && t.closest ? t.closest("button, a") : null;
    if (btn) {
      var txt = (btn.textContent || "").trim().toLowerCase();
      if (txt === "sign out" || txt === "log out" || txt === "logout") { if (sfx.on && AC) Snd.power(); logEvent("LOGGED OUT"); }
    }
    if (!sfx.on || !AC) return;
    if (t.closest && t.closest(".dock-btn")) return; /* switchView plays the tick */
    var el = t.closest ? t.closest("button, .chip, select, a.btn") : null;
    if (el && !el.disabled) Snd.tap();
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t && t.type === "checkbox" && sfx.on && AC) { if (t.checked) Snd.togOn(); else Snd.togOff(); }
  });
  var lastKeyTick = 0;
  document.addEventListener("keydown", function (ev) {
    var t = ev.target;
    var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (typing && t.type !== "checkbox" && t.type !== "radio" && t.type !== "range") {
      if (Date.now() - lastKeyTick > 50) { lastKeyTick = Date.now(); if (sfx.on && AC) Snd.key(); }
    }
  });
  /* Capture phase: runs BEFORE the app's single-key shortcut handler, so
     "a" (add transaction) cannot hijack the sequence mid-word. */
  var eggBuf = "", eggPrivacy = null, konamiIdx = 0;
  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  window.addEventListener("keydown", function (ev) {
    var t = ev.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) { eggBuf = ""; konamiIdx = 0; return; }
    if (document.querySelector(".modal:not(.hidden)")) { eggBuf = ""; konamiIdx = 0; return; }
    var k = (ev.key || "").toLowerCase();
    /* Konami: only the final b/a are swallowed, and only mid-sequence. */
    if (k === KONAMI[konamiIdx]) {
      if (konamiIdx >= 8) ev.stopPropagation();
      konamiIdx++;
      if (konamiIdx === KONAMI.length) { konamiIdx = 0; eggParty(); return; }
    } else konamiIdx = k === KONAMI[0] ? 1 : 0;
    if (k.length !== 1) { if (k !== "shift") eggBuf = ""; return; }
    var cand = eggBuf + k;
    if ("matrix".indexOf(cand) === 0) {
      if (cand === "m") { eggPrivacy = document.body.classList.contains("privacy-on"); eggBuf = "m"; return; }
      ev.stopPropagation();
      eggBuf = cand;
      if (cand === "matrix") {
        eggBuf = "";
        if (eggPrivacy !== null && document.body.classList.contains("privacy-on") !== eggPrivacy && window.togglePrivacy) togglePrivacy();
        eggPrivacy = null;
        eggParty();
      }
    } else {
      eggBuf = k === "m" ? "m" : "";
      if (k === "m") eggPrivacy = document.body.classList.contains("privacy-on");
    }
  }, true);
  function eggParty() {
    if (window.__hkRainParty) __hkRainParty(10);
    if (window.toast) toast("MATRIX MODE: 10S");
    logEvent("EASTER EGG: MATRIX MODE");
  }

  /* ---------------- boot ------------------------------------------ */
  function boot2() {
    wrapToast2(); wrapRefresh2(); wrapShowApp2(); wrapSwitchView2(); wrapSkinLog();
    buildHeaderBtns(); extendPanel(); buildStatus(); updateStatus(); watchLayers();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot2);
  else boot2();
  var tries2 = 0;
  var iv2 = setInterval(function () { tries2++; boot2(); if (tries2 > 24) clearInterval(iv2); }, 500);
  setInterval(function () {
    var app = $("appView");
    if (app && !app.classList.contains("hidden")) { buildStatus(); updateStatus(); }
  }, 1000);
  setInterval(function () {
    try {
      var p = $("hkPanel");
      if (p && !p.querySelector("[data-sfx-opt]")) { delete p.dataset.hk2; extendPanel(); }
      var g = $("hkGreet");
      if (g && g.dataset.fallback === "1") {
        var dn = "";
        if (typeof displayName === "function") dn = displayName();
        if (!dn) dn = (state.profile && state.profile.name) || (window.currentUser && currentUser.name) || "";
        dn = String(dn || "").split(" ")[0].toUpperCase();
        if (dn) { g.textContent = "> WELCOME BACK, " + dn + (fx() === "off" ? "" : "_"); delete g.dataset.fallback; }
      }
    } catch (e) {}
  }, 2000);
})();

/* ================================================================
   v141 — "emerging from darkness" transitions, tap ripple/glitch,
   long-note "?" toggles, boot tone. Transform/opacity only; every
   effect obeys the Effects setting (Full / Light / Off).
   ================================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function fx() { try { return window.FolioMotion ? FolioMotion.effective() : "full"; } catch (e) { return "full"; } }

  /* ---------------- the darkness dip ------------------------------ */
  var dipEl = null;
  function ensureDip() {
    if (dipEl) return dipEl;
    dipEl = document.createElement("div");
    dipEl.id = "hkDip";
    dipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(dipEl);
    return dipEl;
  }
  function dipSwap(swapFn) {
    if (fx() === "off" || document.hidden) { swapFn(); return; }
    var d = ensureDip();
    d.classList.remove("out");
    d.classList.add("on");
    var hold = fx() === "full" ? 60 : 40;
    setTimeout(function () {
      try { swapFn(); } catch (e) {}
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          d.classList.add("out");
          d.classList.remove("on");
          setTimeout(function () { d.classList.remove("out"); }, 280);
        });
      });
    }, hold);
  }
  function dipFlash() {
    if (fx() === "off" || document.hidden) return;
    var d = ensureDip();
    d.classList.remove("out");
    d.classList.add("on");
    setTimeout(function () {
      d.classList.add("out");
      d.classList.remove("on");
      setTimeout(function () { d.classList.remove("out"); }, 280);
    }, 90);
  }
  function emerge(el) {
    if (!el || fx() !== "full") return;
    el.classList.remove("hk-emerge");
    void el.offsetWidth;
    el.classList.add("hk-emerge");
    setTimeout(function () { el.classList.remove("hk-emerge"); }, 420);
  }
  function visibleViewName() {
    var v = document.querySelector(".view:not(.hidden)");
    return v ? v.id.replace("view-", "") : null;
  }

  /* ---------------- view switches emerge from darkness ------------ */
  var bootedAt = Date.now();
  function wrapSwitchView3() {
    if (typeof window.switchView !== "function" || window.switchView.__hk3) return;
    var orig = window.switchView;
    var w = function (name) {
      var cur = visibleViewName();
      var self = this, args = arguments;
      if (fx() === "off" || !name || name === cur || Date.now() - bootedAt < 900) {
        return orig.apply(self, args);
      }
      dipSwap(function () {
        orig.apply(self, args);
        var v = $("view-" + name);
        emerge(v);
        if (window.HkSfx && HkSfx.isOn()) HkSfx.play("burst");
        decorateNotes(v);
        try {
          v.querySelectorAll(".dash-chips, .cap-chips, .tax-tabs, .sheet-tabs, .hist-filter, .stat-chips").forEach(function (strip) {
            var act = strip.querySelector(".active");
            if (act && strip.scrollWidth > strip.clientWidth + 4) act.scrollIntoView({ block: "nearest", inline: "nearest" });
          });
        } catch (e) {}
      });
    };
    w.__hk3 = true; w.__hk2 = true; w.__hk = true;
    window.switchView = w;
  }

  /* ---------------- layers (modal / sheet / palette) -------------- */
  var layerAt = 0;
  function watchLayers3() {
    if (watchLayers3.done || !document.body) return;
    watchLayers3.done = true;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var el = muts[i].target;
        if (!el.classList || !(el.classList.contains("modal") || el.classList.contains("sheet") || el.id === "cmdkPop")) continue;
        if (Date.now() - layerAt < 150) continue;
        layerAt = Date.now();
        if (el.classList.contains("hidden")) { dipFlash(); continue; }
        var card = el.querySelector(".modal-card, .sheet, .cmdk-card") || el;
        emerge(card);
        decorateNotes(el);
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
  }

  /* ---------------- tap glitch + ripple ---------------------------- */
  document.addEventListener("pointerdown", function (ev) {
    if (fx() !== "full") return;
    var t = ev.target && ev.target.closest ? ev.target.closest(".btn, .mini-btn, .seg-btn, .chip") : null;
    if (!t || t.disabled) return;
    t.classList.remove("hk-tapfx");
    void t.offsetWidth;
    t.classList.add("hk-tapfx");
    setTimeout(function () { t.classList.remove("hk-tapfx"); }, 220);
    if (t.closest(".dock, .samsung-bottom-capsule")) return;
    try {
      var r = t.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      var s = document.createElement("span");
      s.className = "hk-rip";
      var size = Math.max(r.width, r.height);
      s.style.width = s.style.height = size + "px";
      s.style.left = (ev.clientX - r.left - size / 2) + "px";
      s.style.top = (ev.clientY - r.top - size / 2) + "px";
      t.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 480);
    } catch (e) {}
  }, true);

  /* ---------------- long hints collapse into a "?" toggle --------- */
  function decorateNotes(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".price-meta, .insx-note, .auth-note, .panel-note").forEach(function (el) {
      if (el.dataset.hkNote || el.textContent.trim().length < 150) return;
      el.dataset.hkNote = "1";
      el.classList.add("hk-note-clamp");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hk-note-btn";
      b.textContent = "?";
      b.title = "Show / hide the full note";
      b.setAttribute("aria-label", "Toggle full note");
      b.addEventListener("click", function () {
        var clamped = el.classList.toggle("hk-note-clamp");
        b.textContent = clamped ? "?" : "–";
      });
      el.parentNode.insertBefore(b, el.nextSibling);
    });
  }

  /* ---------------- boot tone on the first tap --------------------- */
  var bootToneDone = false;
  document.addEventListener("pointerdown", function () {
    if (bootToneDone) return;
    bootToneDone = true;
    if (Date.now() - bootedAt < 45000 && window.HkSfx && HkSfx.isOn()) {
      setTimeout(function () { HkSfx.play("boot"); }, 60);
    }
  }, true);

  /* ---------------- boot ------------------------------------------- */
  function boot3() {
    wrapSwitchView3();
    watchLayers3();
    decorateNotes(document);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot3);
  else boot3();
  var tries3 = 0;
  var iv3 = setInterval(function () { tries3++; boot3(); if (tries3 > 16) clearInterval(iv3); }, 500);
})();
