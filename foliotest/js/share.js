/* ================================================================
   FOLIO — Share module (redesigned share cards)
   Self-contained: injects its own CSS + DOM, draws the card on a
   canvas (the SAME canvas is the live preview and the PNG export,
   so preview and export are always identical).

   Numbers come from the app's own functions only:
     enriched() / computeHoldings() / priceOf() / portfolioXirr()
     fetchHistory() — the Insights period engine (renderInsPeriod)
     returns no values (it paints DOM), so its formulas are mirrored
     1:1 below using the same inputs (same rows, same history, same
     INS_DAYS windows, same NIFTY method) — the numbers match the
     Insights page because the maths and data sources are identical.

   Loaded lazily by the app only when a share button is used.
   API:  window.FolioShare.open({ type, symbol, range })
         type: 'summary' | 'today' | 'period' | 'gainers' | 'stock'
   ================================================================ */
(function () {
  "use strict";

  /* ---------------- config (ONE place to change) ---------------- */
  var SHARE_LINK = "https://singhcaizen.github.io/SinghCaizen/"; // same URL as the "Visit Singh Caizen Website" button
  var LOGO_FOR_DARK_CARD = "assets/logo-white.svg";   // Singh Caizen logo, light version (for dark card styles)
  var LOGO_FOR_LIGHT_CARD = "assets/logo-dark.svg";   // Singh Caizen logo, dark version (for light card styles)
  var HANDLE_TEXT = "@SinghCaizen";
  var DISCLAIMER = "For tracking only. Not investment advice.";

  var RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"];
  var RANGE_LABEL = { "1D": "Today", "1W": "1 Week", "1M": "1 Month", "3M": "3 Months", "6M": "6 Months", "1Y": "1 Year", "ALL": "All Time" };
  var INS_DAYS = { "1W": 7, "1M": 30, "3M": 91, "6M": 182, "1Y": 365 }; // same windows as the Insights engine
  var SIZES = {
    square:   { id: "square",   label: "Square 1:1",  w: 1080, h: 1080 },
    portrait: { id: "portrait", label: "Portrait 4:5", w: 1080, h: 1350 },
    story:    { id: "story",    label: "Story 9:16",  w: 1080, h: 1920 },
    wide:     { id: "wide",     label: "Wide 16:9",   w: 1920, h: 1080 }
  };
  var TYPES = [
    { id: "summary", label: "Portfolio summary" },
    { id: "today",   label: "Today's performance" },
    { id: "period",  label: "Period performance" },
    { id: "gainers", label: "Top gainers & draggers" },
    { id: "stock",   label: "Single stock" }
  ];

  /* Palette — the app's own theme colours (css/style.css :root). */
  var PAL = { gold: "#c9a227", goldSoft: "#e3c565", gain: "#4caf6d", loss: "#e05b4b", redWarm: "#b3392f" };
  var STYLES = [
    { id: "classic",  name: "Classic Dark",  dark: true,  bg: ["#1b1a17", "#121110"], panel: "rgba(242,234,216,0.055)", stroke: "rgba(201,162,39,0.38)", text: "#f2ead8", muted: "#a89e88", accent: PAL.gold },
    { id: "neon",     name: "Neon Glass",    dark: true,  bg: ["#101511", "#0b0e0c"], panel: "rgba(76,175,109,0.09)",  stroke: "rgba(76,175,109,0.5)",  text: "#eef5ea", muted: "#9db89f", accent: PAL.gain, glow: true },
    { id: "minimal",  name: "Minimal Light", dark: false, bg: ["#f7f3ea", "#f7f3ea"], panel: "#fffdf6",                 stroke: "#ddd3ba",               text: "#26221a", muted: "#6f6450", accent: PAL.gold },
    { id: "gradient", name: "Bold Gradient", dark: true,  bg: ["#b3392f", "#8a5a16", "#c9a227"], panel: "rgba(18,17,16,0.20)", stroke: "rgba(255,255,255,0.4)", text: "#ffffff", muted: "rgba(255,255,255,0.78)", accent: "#ffffff", diag: true },
    { id: "gold",     name: "Premium Gold",  dark: true,  bg: ["#171408", "#100e08"], panel: "rgba(201,162,39,0.08)",  stroke: "rgba(201,162,39,0.65)", text: "#f2ead8", muted: "#b3a67f", accent: PAL.goldSoft, frame: true },
    { id: "white",    name: "Clean White",   dark: false, bg: ["#fffdf6", "#fffdf6"], panel: "#f1ead9",                 stroke: "#ddd3ba",               text: "#26221a", muted: "#6f6450", accent: PAL.gold }
  ];
  var DISPLAY_FONT = "'Fraunces', Georgia, 'Times New Roman', serif";
  var BODY_FONT = "'Public Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  /* ---------------- safe access to app globals ----------------
     (bare identifiers: works for the app's const/let/function
     globals; every access is guarded so a missing piece degrades
     gracefully instead of throwing) */
  function gEnriched() { try { return (typeof enriched === "function") ? enriched() : null; } catch (e) { return null; } }
  function gFetchHistory(sym, rk) {
    try {
      if (typeof fetchHistory !== "function") return Promise.resolve(null);
      return Promise.resolve(fetchHistory(sym, rk)).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function gXirr(d) { try { return (typeof portfolioXirr === "function" && d && d.rows.length) ? portfolioXirr(d.value) : null; } catch (e) { return null; } }
  function gToast(msg) {
    try { if (typeof toast === "function") { toast(msg); return; } } catch (e) {}
    moduleToast(msg);
  }
  function fmtInr(n) { try { if (typeof inr === "function") return inr(n); } catch (e) {} return Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—"; }
  function fmtInr2(n) { try { if (typeof inr2 === "function") return inr2(n); } catch (e) {} return Number.isFinite(n) ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"; }
  function fmtPct(n) { try { if (typeof pct === "function") return pct(n); } catch (e) {} return Number.isFinite(n) ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—"; }
  function stockName(sym) {
    try { if (typeof STOCK_MAP !== "undefined" && STOCK_MAP[sym]) return STOCK_MAP[sym].name || ""; } catch (e) {}
    return "";
  }
  function socialEntries() {
    var out = [];
    try {
      if (typeof SOCIAL_LINKS === "undefined" || typeof SOCIAL_ORDER === "undefined" || typeof SOCIAL_ICONS === "undefined") return out;
      SOCIAL_ORDER.forEach(function (k) {
        if (k === "youtube") return; // never YouTube
        var url = (SOCIAL_LINKS[k] || "").trim();
        if (!url || url.indexOf("http") !== 0 || !SOCIAL_ICONS[k]) return; // only real links, like the app footer
        out.push({ key: k, name: (typeof SOCIAL_NAMES !== "undefined" && SOCIAL_NAMES[k]) || k, icon: SOCIAL_ICONS[k] });
      });
    } catch (e) {}
    return out;
  }
  function appPrivacyOn() { try { return localStorage.getItem("folio_privacy") === "1"; } catch (e) { return false; } }
  function isLightTheme() { try { return document.documentElement.dataset.theme === "light"; } catch (e) { return false; } }

  /* ================================================================
     DATA ENGINE — mirrors renderInsPeriod() in features.js exactly:
     same enriched() rows, same start-price rule (last close on or
     before the window start, else the first close), same NIFTY
     method, same totals. Returns plain data instead of DOM.
     ================================================================ */
  function niftyFor(daysBack) {
    return gFetchHistory("^NSEI", "1y").then(function (h) {
      try {
        if (!h || !h.points || !h.points.length) return null;
        var pts = h.points;
        if (daysBack === 1) {
          var a = pts[pts.length - 2], b = pts[pts.length - 1];
          return a && b && a.c ? (b.c - a.c) / a.c * 100 : null;
        }
        var since = Date.now() - daysBack * 86400000, sp = null;
        for (var i = 0; i < pts.length; i++) { if (pts[i].t <= since) sp = pts[i].c; else break; }
        if (sp === null) sp = pts[0].c;
        return sp ? (pts[pts.length - 1].c - sp) / sp * 100 : null;
      } catch (e) { return null; }
    });
  }
  function daysFor(tf) { return tf === "1D" ? 1 : (tf === "ALL" ? 365 : INS_DAYS[tf]); }

  /* Returns { changes:[{row, change, startVal, pct, noData}], totChange, totStart, totPct, niftyRet, alpha } */
  function periodStats(d, tf) {
    var rows = d.rows;
    if (tf === "1D") {
      var changes1 = rows.map(function (r) {
        return { row: r, change: r.day || 0, startVal: Math.max(1, r.cur - (r.day || 0)), pct: (r.prevClose && r.ltp !== null) ? (r.ltp - r.prevClose) / r.prevClose * 100 : 0 };
      });
      return niftyFor(1).then(function (n) { return finishStats(changes1, n); });
    }
    if (tf === "ALL") {
      var changesA = rows.map(function (r) { return { row: r, change: r.pnl, startVal: r.invested, pct: r.pnlPct }; });
      return niftyFor(365).then(function (n) { return finishStats(changesA, n); });
    }
    var days = INS_DAYS[tf], since = Date.now() - days * 86400000;
    return Promise.all(rows.map(function (r) { return gFetchHistory(r.sym, "1y"); })).then(function (hists) {
      var changes = rows.map(function (r, i) {
        var h = hists[i];
        if (!h || !h.points || !h.points.length || r.ltp === null) return { row: r, change: 0, startVal: Math.max(1, r.cur), pct: 0, noData: true };
        var sp = null;
        for (var j = 0; j < h.points.length; j++) { if (h.points[j].t <= since) sp = h.points[j].c; else break; }
        if (sp === null) sp = h.points[0].c;
        return { row: r, change: r.qty * (r.ltp - sp), startVal: Math.max(1, r.qty * sp), pct: sp ? (r.ltp - sp) / sp * 100 : 0 };
      });
      return niftyFor(days).then(function (n) { return finishStats(changes, n); });
    });
  }
  function finishStats(changes, niftyRet) {
    var totChange = changes.reduce(function (a, c) { return a + c.change; }, 0);
    var totStart = changes.reduce(function (a, c) { return a + c.startVal; }, 0);
    var totPct = totStart ? totChange / totStart * 100 : 0;
    return { changes: changes, totChange: totChange, totStart: totStart, totPct: totPct, niftyRet: niftyRet, alpha: niftyRet !== null ? totPct - niftyRet : null };
  }

  /* Portfolio value series — the same technique as renderPerf():
     union of timestamps, each holding valued at closeAt() with the
     buy average as fallback. Returns an array of values or null. */
  function portfolioSeries(d, rangeKey) {
    return Promise.all(d.rows.map(function (r) { return gFetchHistory(r.sym, rangeKey); })).then(function (hists) {
      try {
        var tset = new Set();
        hists.forEach(function (h) { if (h && h.points) h.points.forEach(function (p) { tset.add(p.t); }); });
        var ts = Array.from(tset).sort(function (a, b) { return a - b; });
        if (ts.length < 2) return null;
        var bySym = {};
        d.rows.forEach(function (r, i) { bySym[r.sym] = hists[i]; });
        return ts.map(function (t) {
          return d.rows.reduce(function (s, r) {
            var h = bySym[r.sym], c = null;
            if (h && h.points) { for (var j = 0; j < h.points.length; j++) { if (h.points[j].t <= t) c = h.points[j].c; else break; } }
            return s + r.qty * (c !== null ? c : r.avg);
          }, 0);
        });
      } catch (e) { return null; }
    });
  }
  /* Window value series for period/gainers cards (daily "1y" history, window-sliced). */
  function windowSeries(d, tf) {
    if (tf === "1D") return Promise.resolve(intradaySeries(d));
    if (tf === "ALL") return portfolioSeries(d, "5y").then(function (s) { return s || portfolioSeries(d, "1y"); });
    var since = Date.now() - INS_DAYS[tf] * 86400000;
    return Promise.all(d.rows.map(function (r) { return gFetchHistory(r.sym, "1y"); })).then(function (hists) {
      try {
        var tset = new Set();
        hists.forEach(function (h) { if (h && h.points) h.points.forEach(function (p) { if (p.t >= since) tset.add(p.t); }); });
        var ts = Array.from(tset).sort(function (a, b) { return a - b; });
        if (ts.length < 2) return null;
        return ts.map(function (t) {
          return d.rows.reduce(function (s, r, i) {
            var h = hists[i], c = null;
            if (h && h.points) { for (var j = 0; j < h.points.length; j++) { if (h.points[j].t <= t) c = h.points[j].c; else break; } }
            return s + r.qty * (c !== null ? c : r.avg);
          }, 0);
        });
      } catch (e) { return null; }
    });
  }
  /* Today's intraday composite from the spark arrays fetchOne() already
     stored on each price (rows carry r.spark via enriched()). */
  function intradaySeries(d) {
    try {
      var rows = d.rows.filter(function (r) { return r.spark && r.spark.length >= 2; });
      if (!rows.length) return null;
      var n = Math.max.apply(null, rows.map(function (r) { return r.spark.length; }));
      if (n < 2) return null;
      var out = [];
      for (var i = 0; i < n; i++) {
        var s = 0;
        rows.forEach(function (r) {
          var idx = r.spark.length - n + i;
          s += r.qty * (idx >= 0 ? r.spark[idx] : r.spark[0]);
        });
        out.push(s);
      }
      return out;
    } catch (e) { return null; }
  }
  /* Single-stock closes for the mini chart, per window. */
  function stockSeries(sym, tf) {
    if (tf === "1D") {
      return gFetchHistory(sym, "1d5m").then(function (h) {
        if (h && h.points && h.points.length >= 2) return h.points.map(function (p) { return p.c; });
        return gFetchHistory(sym, "5d15m").then(function (h2) {
          if (!h2 || !h2.points || !h2.points.length) return null;
          var lastDay = new Date(h2.points[h2.points.length - 1].t).toDateString();
          var pts = h2.points.filter(function (p) { return new Date(p.t).toDateString() === lastDay; });
          return pts.length >= 2 ? pts.map(function (p) { return p.c; }) : h2.points.map(function (p) { return p.c; });
        });
      });
    }
    if (tf === "ALL") {
      return gFetchHistory(sym, "5y").then(function (h) {
        if (h && h.points && h.points.length >= 2) return h.points.map(function (p) { return p.c; });
        return gFetchHistory(sym, "1y").then(function (h2) { return h2 && h2.points && h2.points.length >= 2 ? h2.points.map(function (p) { return p.c; }) : null; });
      });
    }
    var since = Date.now() - INS_DAYS[tf] * 86400000;
    return gFetchHistory(sym, "1y").then(function (h) {
      if (!h || !h.points) return null;
      var pts = h.points.filter(function (p) { return p.t >= since; });
      if (pts.length < 2) pts = h.points.slice(-2);
      return pts.length >= 2 ? pts.map(function (p) { return p.c; }) : null;
    });
  }
  /* Single-stock return for a window — same per-row maths as the Insights engine. */
  function stockReturn(row, tf) {
    if (tf === "1D") return Promise.resolve((row.prevClose && row.ltp !== null) ? (row.ltp - row.prevClose) / row.prevClose * 100 : null);
    if (tf === "ALL") return Promise.resolve(row.pnlPct);
    var since = Date.now() - INS_DAYS[tf] * 86400000;
    return gFetchHistory(row.sym, "1y").then(function (h) {
      try {
        if (!h || !h.points || !h.points.length || row.ltp === null) return null;
        var sp = null;
        for (var j = 0; j < h.points.length; j++) { if (h.points[j].t <= since) sp = h.points[j].c; else break; }
        if (sp === null) sp = h.points[0].c;
        return sp ? (row.ltp - sp) / sp * 100 : null;
      } catch (e) { return null; }
    });
  }

  /* ================================================================
     SHEET — DOM + CSS injected by this module only.
     ================================================================ */
  var CSS_TEXT = [
    ".fsh-overlay{position:fixed;inset:0;z-index:1250;background:rgba(8,8,6,0.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}",
    ".fsh-overlay[hidden]{display:none!important}",
    ".fsh-sheet{background:var(--panel,#1b1a17);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:18px;width:100%;max-width:520px;max-height:92dvh;overflow-y:auto;box-shadow:0 24px 70px rgba(0,0,0,0.5);box-sizing:border-box;font-family:'Public Sans',system-ui,sans-serif;animation:fshIn .22s ease}",
    "@keyframes fshIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}",
    ".fsh-handle{display:none}",
    ".fsh-head{display:flex;align-items:center;gap:8px;padding:14px 16px 6px}",
    ".fsh-head h3{flex:1;margin:0;font-family:'Fraunces',Georgia,serif;font-size:1.15rem;color:var(--gold,#c9a227);letter-spacing:.02em}",
    ".fsh-iconbtn{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:10px;width:38px;height:38px;min-width:38px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}",
    ".fsh-iconbtn:hover{border-color:var(--gold,#c9a227);color:var(--gold,#c9a227)}",
    ".fsh-iconbtn svg{width:18px;height:18px}",
    ".fsh-preview{padding:8px 16px 2px;position:relative}",
    ".fsh-preview canvas{width:100%;height:auto;display:block;border-radius:12px;border:1px solid var(--line,#33302a);background:#121110}",
    ".fsh-loading{position:absolute;inset:8px 16px 2px;display:flex;align-items:center;justify-content:center;margin:0;color:var(--muted,#a89e88);font-size:.9rem;background:rgba(10,10,8,0.45);border-radius:12px;text-align:center;padding:0 12px}",
    ".fsh-loading[hidden]{display:none}",
    ".fsh-body{padding:6px 16px 4px}",
    ".fsh-sec{margin:12px 0 2px}",
    ".fsh-sec>span{display:block;font-size:.72rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted,#a89e88);margin-bottom:7px}",
    ".fsh-seg{display:flex;flex-wrap:wrap;gap:6px}",
    ".fsh-seg button{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:999px;padding:.42rem .8rem;font-size:.86rem;cursor:pointer;font-family:inherit}",
    ".fsh-seg button[aria-pressed='true']{background:var(--gold,#c9a227);border-color:var(--gold,#c9a227);color:#171408;font-weight:700}",
    ".fsh-styles{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory}",
    ".fsh-style{flex:0 0 auto;width:104px;background:none;border:none;padding:0;cursor:pointer;scroll-snap-align:start;font-family:inherit}",
    ".fsh-style canvas{width:104px;height:104px;display:block;border-radius:10px;border:2px solid var(--line,#33302a)}",
    ".fsh-style[aria-pressed='true'] canvas{border-color:var(--gold,#c9a227)}",
    ".fsh-style small{display:block;margin-top:5px;font-size:.74rem;color:var(--muted,#a89e88);text-align:center}",
    ".fsh-style[aria-pressed='true'] small{color:var(--gold,#c9a227);font-weight:700}",
    ".fsh-select{width:100%;background:var(--input,#16150f);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:10px;padding:.55rem .7rem;font-size:.95rem;font-family:inherit}",
    ".fsh-toggle{display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer;font-size:.92rem}",
    ".fsh-toggle input{width:20px;height:20px;accent-color:var(--gold,#c9a227);flex:0 0 auto}",
    ".fsh-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 16px 18px}",
    ".fsh-act{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:12px;padding:.7rem .6rem;font-size:.92rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;min-height:46px}",
    ".fsh-act svg{width:17px;height:17px;flex:0 0 auto}",
    ".fsh-act:hover{border-color:var(--gold,#c9a227)}",
    ".fsh-act.primary{grid-column:1/-1;background:var(--gold,#c9a227);border-color:var(--gold,#c9a227);color:#171408;font-weight:800;font-size:1rem}",
    ".fsh-act.primary:hover{background:var(--gold-soft,#e3c565)}",
    ".fsh-act[disabled]{opacity:.45;cursor:not-allowed}",
    ".fsh-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--gold,#c9a227);border-radius:12px;padding:.7rem 1.1rem;z-index:1300;font-size:.92rem;box-shadow:0 12px 34px rgba(0,0,0,0.45);max-width:calc(100vw - 32px);text-align:center;font-family:'Public Sans',system-ui,sans-serif}",
    "@media (max-width:640px){",
    "  .fsh-overlay{align-items:flex-end;padding:0}",
    "  .fsh-sheet{max-width:none;border-radius:20px 20px 0 0;border-bottom:none;max-height:90dvh;animation:fshUp .24s ease}",
    "  @keyframes fshUp{from{transform:translateY(46px);opacity:.4}to{transform:none;opacity:1}}",
    "  .fsh-handle{display:block;width:44px;height:5px;border-radius:99px;background:var(--line,#33302a);margin:9px auto 0}",
    "}"
  ].join("\n");

  var ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.3 10.8l6.9-4M8.3 13.2l6.9 4"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 11L12 15.5 16.5 11"/><path d="M4.5 19.5h15"/></svg>',
    copyImg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="2.5"/><path d="M20.5 7.5v11a2 2 0 0 1-2 2H7.5"/><circle cx="9.8" cy="9.3" r="1.4"/><path d="M4 16.5l4.2-4.2 2.6 2.6 2.4-2.4 3.3 3.3"/></svg>',
    copyText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>'
  };

  var state = null;      // sheet session state
  var dom = null;        // sheet DOM refs
  var logoImgs = { dark: null, light: null }; // Image objects (dark = for light cards)
  var renderToken = 0;

  function moduleToast(msg) {
    var t = document.createElement("div");
    t.className = "fsh-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 3400);
  }
  function loadLogo(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = src;
    });
  }
  function ensureLogos() {
    var jobs = [];
    if (!logoImgs.dark) jobs.push(loadLogo(LOGO_FOR_DARK_CARD).then(function (i) { logoImgs.dark = i || "failed"; }));
    if (!logoImgs.light) jobs.push(loadLogo(LOGO_FOR_LIGHT_CARD).then(function (i) { logoImgs.light = i || "failed"; }));
    return Promise.all(jobs).then(function () {
      if (logoImgs.dark === "failed") logoImgs.dark = null;
      if (logoImgs.light === "failed") logoImgs.light = null;
    });
  }

  function buildSheet() {
    if (dom) return;
    var styleEl = document.createElement("style");
    styleEl.id = "folioShareCss";
    styleEl.textContent = CSS_TEXT;
    document.head.appendChild(styleEl);

    var ov = document.createElement("div");
    ov.className = "fsh-overlay"; ov.hidden = true; ov.id = "folioShareOverlay";
    ov.innerHTML =
      '<div class="fsh-sheet" role="dialog" aria-modal="true" aria-labelledby="fshTitle">' +
        '<div class="fsh-handle" aria-hidden="true"></div>' +
        '<div class="fsh-head">' +
          '<button type="button" class="fsh-iconbtn" id="fshBack" aria-label="Back">' + ICONS.back + '</button>' +
          '<h3 id="fshTitle">Share Card</h3>' +
          '<button type="button" class="fsh-iconbtn" id="fshClose" aria-label="Close share sheet">' + ICONS.close + '</button>' +
        '</div>' +
        '<div class="fsh-preview"><canvas id="fshCanvas" aria-label="Share card preview"></canvas><p class="fsh-loading" id="fshLoading">Preparing your card…</p></div>' +
        '<div class="fsh-body">' +
          '<div class="fsh-sec"><span id="fshTypeLbl">Card type</span><div class="fsh-seg" id="fshTypeSeg" role="group" aria-labelledby="fshTypeLbl"></div></div>' +
          '<div class="fsh-sec" id="fshRangeSec"><span id="fshRangeLbl">Period</span><div class="fsh-seg" id="fshRangeSeg" role="group" aria-labelledby="fshRangeLbl"></div></div>' +
          '<div class="fsh-sec" id="fshStockSec"><span id="fshStockLbl">Stock</span><select class="fsh-select" id="fshStockSel" aria-labelledby="fshStockLbl"></select></div>' +
          '<div class="fsh-sec"><span id="fshStyleLbl">Card style</span><div class="fsh-styles" id="fshStyles" role="group" aria-labelledby="fshStyleLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshSizeLbl">Size</span><div class="fsh-seg" id="fshSizeSeg" role="group" aria-labelledby="fshSizeLbl"></div></div>' +
          '<div class="fsh-sec"><span>Privacy</span>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshHideAmt"> Hide amounts — show percentages only</label>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshHideQty"> Hide quantities and invested value</label>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshShowDate"> Show date</label>' +
          '</div>' +
        '</div>' +
        '<div class="fsh-actions">' +
          '<button type="button" class="fsh-act primary" id="fshShareBtn">' + ICONS.share + ' Share</button>' +
          '<button type="button" class="fsh-act" id="fshSaveBtn" aria-label="Save card as PNG image">' + ICONS.save + ' Save image (PNG)</button>' +
          '<button type="button" class="fsh-act" id="fshCopyImgBtn" aria-label="Copy card image to clipboard">' + ICONS.copyImg + ' Copy image</button>' +
          '<button type="button" class="fsh-act" id="fshCopyTxtBtn" aria-label="Copy summary text and website link">' + ICONS.copyText + ' Copy text &amp; link</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    dom = {
      ov: ov, sheet: ov.querySelector(".fsh-sheet"), canvas: ov.querySelector("#fshCanvas"),
      loading: ov.querySelector("#fshLoading"), typeSeg: ov.querySelector("#fshTypeSeg"),
      rangeSec: ov.querySelector("#fshRangeSec"), rangeSeg: ov.querySelector("#fshRangeSeg"),
      stockSec: ov.querySelector("#fshStockSec"), stockSel: ov.querySelector("#fshStockSel"),
      styles: ov.querySelector("#fshStyles"), sizeSeg: ov.querySelector("#fshSizeSeg"),
      hideAmt: ov.querySelector("#fshHideAmt"), hideQty: ov.querySelector("#fshHideQty"), showDate: ov.querySelector("#fshShowDate"),
      shareBtn: ov.querySelector("#fshShareBtn"), saveBtn: ov.querySelector("#fshSaveBtn"),
      copyImgBtn: ov.querySelector("#fshCopyImgBtn"), copyTxtBtn: ov.querySelector("#fshCopyTxtBtn")
    };

    ov.addEventListener("click", function (e) { if (e.target === ov) closeSheet(); });
    ov.querySelector("#fshClose").addEventListener("click", closeSheet);
    ov.querySelector("#fshBack").addEventListener("click", closeSheet);
    /* keep app-level swipe navigation out of the sheet */
    ["touchstart", "touchend"].forEach(function (ev) { ov.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    /* swipe down to close (phone bottom sheet) */
    var dragY = null;
    ov.addEventListener("touchstart", function (e) { dragY = e.touches[0].clientY; }, { passive: true });
    ov.addEventListener("touchmove", function (e) {
      if (dragY === null) return;
      var dy = e.touches[0].clientY - dragY;
      if (window.innerWidth <= 640 && dom.sheet.scrollTop <= 0 && dy > 0) dom.sheet.style.transform = "translateY(" + Math.min(dy, 190) + "px)";
    }, { passive: true });
    ov.addEventListener("touchend", function (e) {
      if (dragY === null) return;
      var dy = e.changedTouches[0].clientY - dragY; dragY = null;
      dom.sheet.style.transform = "";
      if (window.innerWidth <= 640 && dom.sheet.scrollTop <= 0 && dy > 78) closeSheet();
    }, { passive: true });

    buildSeg(dom.typeSeg, TYPES.map(function (t) { return { id: t.id, label: t.label }; }), function (id) { state.type = id; syncControls(); scheduleRender(true); });
    buildSeg(dom.rangeSeg, RANGES.map(function (r) { return { id: r, label: r }; }), function (id) { state.range = id; scheduleRender(true); });
    buildSeg(dom.sizeSeg, Object.keys(SIZES).map(function (k) { return { id: k, label: SIZES[k].label }; }), function (id) { state.size = id; scheduleRender(false); });
    dom.stockSel.addEventListener("change", function () { state.symbol = dom.stockSel.value; scheduleRender(true); });
    [dom.hideAmt, dom.hideQty, dom.showDate].forEach(function (el) {
      el.addEventListener("change", function () {
        state.hideAmounts = dom.hideAmt.checked; state.hideQty = dom.hideQty.checked; state.showDate = dom.showDate.checked;
        scheduleRender(false);
      });
    });
    dom.shareBtn.addEventListener("click", doShare);
    dom.saveBtn.addEventListener("click", doSave);
    dom.copyImgBtn.addEventListener("click", doCopyImage);
    dom.copyTxtBtn.addEventListener("click", doCopyText);
  }
  function buildSeg(container, items, onPick) {
    container.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = it.label; b.dataset.val = it.id;
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", it.label);
      b.addEventListener("click", function () { onPick(it.id); });
      container.appendChild(b);
    });
  }
  function setSeg(container, val) {
    Array.prototype.forEach.call(container.children, function (b) { b.setAttribute("aria-pressed", b.dataset.val === val ? "true" : "false"); });
  }
  function buildStyleThumbs(model) {
    dom.styles.innerHTML = "";
    STYLES.forEach(function (st) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "fsh-style"; b.dataset.val = st.id;
      b.setAttribute("aria-pressed", st.id === state.style ? "true" : "false");
      b.setAttribute("aria-label", "Card style: " + st.name);
      var cv = document.createElement("canvas"); cv.width = 312; cv.height = 312; cv.setAttribute("aria-hidden", "true");
      b.appendChild(cv);
      var sm = document.createElement("small"); sm.textContent = st.name; b.appendChild(sm);
      b.addEventListener("click", function () { state.style = st.id; syncControls(); scheduleRender(false); });
      dom.styles.appendChild(b);
      try { drawCard(cv.getContext("2d"), 312, 312, model, st, true); } catch (e) {}
    });
  }
  function syncControls() {
    setSeg(dom.typeSeg, state.type);
    setSeg(dom.rangeSeg, state.range);
    setSeg(dom.sizeSeg, state.size);
    var needsRange = state.type === "period" || state.type === "gainers" || state.type === "stock";
    dom.rangeSec.style.display = needsRange ? "" : "none";
    dom.stockSec.style.display = state.type === "stock" ? "" : "none";
    Array.prototype.forEach.call(dom.styles.children, function (b) { b.setAttribute("aria-pressed", b.dataset.val === state.style ? "true" : "false"); });
  }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); closeSheet(); } }
  function onPop() { if (state && state.open) closeSheet(true); }

  function openSheet(opts) {
    opts = opts || {};
    buildSheet();
    var d = gEnriched();
    var rows = d && d.rows ? d.rows : [];
    var type = TYPES.some(function (t) { return t.id === opts.type; }) ? opts.type : "summary";
    var range = RANGES.indexOf(opts.range) >= 0 ? opts.range
      : (typeof insTf !== "undefined" && RANGES.indexOf(insTf) >= 0 ? insTf : "ALL"); // match what Insights is showing
    var symbol = opts.symbol ? String(opts.symbol).toUpperCase() : (rows.length ? rows[0].sym : "");
    if (type === "stock" && opts.symbol) symbol = String(opts.symbol).toUpperCase();
    var privacy = appPrivacyOn();
    state = {
      open: true, type: type, range: range, symbol: symbol,
      size: "square",
      style: isLightTheme() ? "minimal" : "classic",
      hideAmounts: true,               // spec default ON
      hideQty: true,                   // spec default ON
      showDate: true,
      appPrivacy: privacy,
      model: null, modelKey: "", shareText: "",
      lastFocus: document.activeElement
    };
    if (privacy) { state.hideAmounts = true; state.hideQty = true; }
    /* stock picker */
    dom.stockSel.innerHTML = "";
    rows.forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.sym; o.textContent = r.sym + (stockName(r.sym) ? " — " + stockName(r.sym) : "");
      dom.stockSel.appendChild(o);
    });
    if (symbol) dom.stockSel.value = symbol;
    dom.hideAmt.checked = state.hideAmounts; dom.hideQty.checked = state.hideQty; dom.showDate.checked = state.showDate;
    dom.hideAmt.disabled = privacy; dom.hideQty.disabled = privacy;
    syncControls();
    dom.ov.hidden = false;
    document.body.style.overflow = "hidden";
    try { history.pushState({ folioShare: 1 }, ""); } catch (e) {}
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey, true);
    var cb = dom.ov.querySelector("#fshClose"); if (cb) cb.focus();
    scheduleRender(true);
  }
  function closeSheet(fromPop) {
    if (!state) return;
    state.open = false;
    if (dom) { dom.ov.hidden = true; dom.sheet.style.transform = ""; }
    document.body.style.overflow = "";
    window.removeEventListener("popstate", onPop);
    document.removeEventListener("keydown", onKey, true);
    if (!fromPop) { try { if (history.state && history.state.folioShare) history.back(); } catch (e) {} }
    if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus(); } catch (e) {} }
  }

  /* ================================================================
     MODEL — plain data for the canvas painter.
     ================================================================ */
  function dateLine() {
    try { return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }
  function socialFooter() { return socialEntries(); }

  function buildModel() {
    var d = gEnriched();
    if (!d || !d.rows || !d.rows.length) {
      return Promise.resolve({ empty: "Add stocks to Folio first — your share card will appear here.", typeLabel: "FOLIO", social: socialFooter() });
    }
    var type = state.type, range = state.range;
    var hideAmt = state.hideAmounts, hideQty = state.hideQty;
    var base = { typeLabel: "", social: socialFooter(), date: state.showDate ? dateLine() : "" };

    if (type === "summary") {
      var ret = d.invested ? d.totalPnl / d.invested * 100 : 0;
      var x = gXirr(d);
      var top = d.rows.slice().sort(function (a, b) { return b.cur - a.cur; }).slice(0, 5);
      var total = d.value || 1;
      base.typeLabel = "PORTFOLIO SUMMARY";
      base.title = "My Portfolio";
      base.heroPct = ret; base.heroLabel = "overall return";
      base.heroSub = hideAmt ? "Percentages only — no amounts shown"
        : "Invested " + fmtInr(d.invested) + "  →  Now " + fmtInr(d.value) + "  ·  P&L " + fmtInr(d.totalPnl);
      var todayPct = 0;
      var totStart1D = d.rows.reduce(function (a, r) { return a + Math.max(1, r.cur - (r.day || 0)); }, 0);
      todayPct = totStart1D ? d.dayPnl / totStart1D * 100 : 0;
      base.chips = [
        { label: "XIRR (per year)", value: x !== null && isFinite(x) ? fmtPct(x * 100) : "—", color: x !== null && isFinite(x) ? (x >= 0 ? "gain" : "loss") : "text" },
        { label: "Today", value: fmtPct(todayPct), color: todayPct >= 0 ? "gain" : "loss" },
        { label: "Holdings", value: String(d.rows.length) + (d.rows.length === 1 ? " stock" : " stocks"), color: "text" }
      ];
      base.listTitle = "TOP HOLDINGS";
      base.rows = top.map(function (r) {
        return { left: r.sym, sub: (d.value ? (r.cur / total * 100).toFixed(1) : "0") + "% of portfolio" + (!hideQty ? " · " + r.qty + " shares" : ""), right: fmtPct(r.pnlPct), color: r.pnlPct >= 0 ? "gain" : "loss", rightSub: hideAmt ? "" : fmtInr(r.cur) };
      });
      base.shareText = "My portfolio is " + (ret >= 0 ? "up " : "down ") + Math.abs(ret).toFixed(1) + "% overall";
      return portfolioSeries(d, "6mo").then(function (s) { base.series = s; base.seriesLabel = "Portfolio value · last 6 months"; return base; });
    }

    if (type === "today") {
      return periodStats(d, "1D").then(function (st) {
        base.typeLabel = "TODAY'S PERFORMANCE";
        base.title = "Today's Performance";
        base.heroPct = st.totPct; base.heroLabel = "today";
        base.heroSub = hideAmt ? "Percentages only — no amounts shown" : "Today's change " + fmtInr(st.totChange) + "  ·  Portfolio " + fmtInr(d.value);
        base.chips = [
          { label: "My Portfolio", value: fmtPct(st.totPct), color: st.totPct >= 0 ? "gain" : "loss" },
          { label: "NIFTY 50", value: st.niftyRet !== null ? fmtPct(st.niftyRet) : "—", color: st.niftyRet === null ? "text" : (st.niftyRet >= 0 ? "gain" : "loss") },
          { label: "Alpha vs NIFTY", value: st.alpha !== null ? fmtPct(st.alpha) : "—", color: st.alpha === null ? "text" : (st.alpha >= 0 ? "gain" : "loss"), hot: st.alpha !== null && st.alpha > 0 }
        ];
        var sorted = st.changes.slice().sort(function (a, b) { return b.pct - a.pct; });
        base.listTitle = "TODAY'S MOVERS";
        base.rows = sorted.slice(0, 5).map(function (c) {
          return { left: c.row.sym, sub: hideAmt ? "" : fmtInr(c.change) + " today", right: fmtPct(c.pct), color: c.pct >= 0 ? "gain" : "loss" };
        });
        base.series = intradaySeries(d); base.seriesLabel = "Portfolio value · today";
        base.shareText = "My portfolio is " + (st.totPct >= 0 ? "up " : "down ") + Math.abs(st.totPct).toFixed(1) + "% today";
        return base;
      });
    }

    if (type === "period" || type === "gainers") {
      return periodStats(d, range).then(function (st) {
        return windowSeries(d, range).then(function (series) {
          var ok = st.changes.filter(function (c) { return !c.noData; });
          var best = ok.length ? ok.reduce(function (a, b) { return b.change > a.change ? b : a; }) : null;
          var worst = ok.length ? ok.reduce(function (a, b) { return b.change < a.change ? b : a; }) : null;
          base.series = series; base.seriesLabel = "Portfolio value · " + RANGE_LABEL[range].toLowerCase();
          base.chips = [
            { label: "My Portfolio", value: fmtPct(st.totPct), color: st.totPct >= 0 ? "gain" : "loss" },
            { label: "NIFTY 50", value: st.niftyRet !== null ? fmtPct(st.niftyRet) : "—", color: st.niftyRet === null ? "text" : (st.niftyRet >= 0 ? "gain" : "loss") },
            { label: "Alpha vs NIFTY", value: st.alpha !== null ? fmtPct(st.alpha) : "—", color: st.alpha === null ? "text" : (st.alpha >= 0 ? "gain" : "loss"), hot: st.alpha !== null && st.alpha > 0 }
          ];
          if (type === "period") {
            base.typeLabel = "PERIOD PERFORMANCE";
            base.title = RANGE_LABEL[range] + " Performance";
            base.heroPct = st.totPct; base.heroLabel = "in " + RANGE_LABEL[range].toLowerCase();
            base.heroSub = hideAmt ? "Percentages only — no amounts shown" : "Change " + fmtInr(st.totChange) + " in this window";
            base.listTitle = "TOP CONTRIBUTOR & BIGGEST DRAG";
            base.rows = [];
            if (best) base.rows.push({ left: best.row.sym, sub: "Top contributor" + (hideAmt ? "" : " · " + fmtInr(best.change)), right: fmtPct(best.pct), color: best.pct >= 0 ? "gain" : "loss" });
            if (worst && worst !== best) base.rows.push({ left: worst.row.sym, sub: "Biggest drag" + (hideAmt ? "" : " · " + fmtInr(worst.change)), right: fmtPct(worst.pct), color: worst.pct >= 0 ? "gain" : "loss" });
            base.shareText = "My portfolio moved " + fmtPct(st.totPct) + " over " + RANGE_LABEL[range].toLowerCase() + (st.alpha !== null ? " — alpha vs NIFTY 50: " + fmtPct(st.alpha) : "");
          } else {
            base.typeLabel = "TOP GAINERS & DRAGGERS";
            base.title = "Gainers & Draggers";
            base.heroPct = st.totPct; base.heroLabel = "portfolio · " + RANGE_LABEL[range].toLowerCase();
            base.heroSub = "Ranked by return in the " + RANGE_LABEL[range].toLowerCase() + " window";
            var byPct = ok.slice().sort(function (a, b) { return b.pct - a.pct; });
            var gainers = byPct.filter(function (c) { return c.pct > 0; }).slice(0, 3);
            var draggers = byPct.filter(function (c) { return c.pct < 0; }).slice(-3).reverse();
            if (!gainers.length && !draggers.length) { gainers = byPct.slice(0, 3); }
            base.twoCol = {
              leftTitle: "TOP GAINERS", rightTitle: "TOP DRAGGERS",
              left: gainers.map(function (c) { return { left: c.row.sym, right: fmtPct(c.pct), color: "gain", sub: hideAmt ? "" : fmtInr(c.change) }; }),
              right: draggers.map(function (c) { return { left: c.row.sym, right: fmtPct(c.pct), color: "loss", sub: hideAmt ? "" : fmtInr(c.change) }; })
            };
            var top1 = byPct[0];
            base.shareText = top1 ? "My top mover (" + RANGE_LABEL[range] + "): " + top1.row.sym + " " + fmtPct(top1.pct) : "My portfolio · " + RANGE_LABEL[range];
          }
          return base;
        });
      });
    }

    /* single stock */
    var row = d.rows.filter(function (r) { return r.sym === state.symbol; })[0] || d.rows[0];
    state.symbol = row.sym;
    return stockReturn(row, range).then(function (ret) {
      return niftyFor(daysFor(range)).then(function (nRet) {
        return stockSeries(row.sym, range).then(function (series) {
          var alpha = (ret !== null && nRet !== null) ? ret - nRet : null;
          base.typeLabel = "SINGLE STOCK";
          base.title = row.sym;
          base.subtitle = stockName(row.sym);
          base.badge = alpha !== null && alpha > 0;
          base.heroPct = ret; base.heroLabel = "in " + RANGE_LABEL[range].toLowerCase();
          base.heroSub = row.ltp !== null ? "Last price " + fmtInr2(row.ltp) : "Last price unavailable";
          base.chips = [
            { label: row.sym + " return", value: ret !== null ? fmtPct(ret) : "—", color: ret === null ? "text" : (ret >= 0 ? "gain" : "loss") },
            { label: "NIFTY 50", value: nRet !== null ? fmtPct(nRet) : "—", color: nRet === null ? "text" : (nRet >= 0 ? "gain" : "loss") },
            { label: "Alpha vs NIFTY", value: alpha !== null ? fmtPct(alpha) : "—", color: alpha === null ? "text" : (alpha >= 0 ? "gain" : "loss"), hot: base.badge }
          ];
          base.series = series; base.seriesLabel = row.sym + " · " + RANGE_LABEL[range].toLowerCase();
          base.listTitle = "MY POSITION";
          base.rows = [];
          if (!hideQty) base.rows.push({ left: "Quantity", right: String(row.qty) + " shares", color: "text" });
          if (!hideQty) base.rows.push({ left: "Average buy", right: fmtInr2(row.avg), color: "text" });
          if (!hideAmt) base.rows.push({ left: "Invested", right: fmtInr(row.invested), color: "text" });
          if (!hideAmt) base.rows.push({ left: "Current value", right: fmtInr(row.cur), color: "text" });
          base.rows.push({ left: "Overall P&L", right: fmtPct(row.pnlPct) + (hideAmt ? "" : "  ·  " + fmtInr(row.pnl)), color: row.pnlPct >= 0 ? "gain" : "loss" });
          base.shareText = row.sym + " is " + (ret === null ? "on my Folio watch" : (ret >= 0 ? "up " : "down ") + Math.abs(ret).toFixed(1) + "% over " + RANGE_LABEL[range].toLowerCase()) + (alpha !== null ? " — alpha vs NIFTY 50: " + fmtPct(alpha) : "");
          return base;
        });
      });
    });
  }

  function scheduleRender(needsData) {
    if (!state || !state.open) return;
    var key = [state.type, state.range, state.symbol, state.hideAmounts, state.hideQty, state.showDate, state.style, state.size].join("|");
    var token = ++renderToken;
    var size = SIZES[state.size];
    dom.canvas.width = size.w; dom.canvas.height = size.h;
    if (!needsData && state.model && state.modelKey === key.split("|").slice(0, 3).join("|") + "|" + state.hideAmounts + "|" + state.hideQty + "|" + state.showDate) {
      paint(state.model); return;
    }
    dom.loading.hidden = false;
    Promise.all([ensureLogos(), (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()]).then(function () {
      return buildModel();
    }).then(function (model) {
      if (token !== renderToken || !state.open) return;
      state.model = model;
      state.modelKey = [state.type, state.range, state.symbol].join("|") + "|" + state.hideAmounts + "|" + state.hideQty + "|" + state.showDate;
      state.shareText = (model.shareText || "My portfolio on FOLIO") + " via FOLIO by Singh Caizen " + SHARE_LINK;
      paint(model);
      buildStyleThumbs(model);
    }).catch(function () {
      if (token !== renderToken || !state.open) return;
      dom.loading.hidden = true;
      gToast("The share card could not be prepared — please try again.");
    });
  }
  function paint(model) {
    var size = SIZES[state.size];
    dom.canvas.width = size.w; dom.canvas.height = size.h;
    var st = STYLES.filter(function (s) { return s.id === state.style; })[0] || STYLES[0];
    try { drawCard(dom.canvas.getContext("2d"), size.w, size.h, model, st, false); } catch (e) {}
    dom.loading.hidden = true;
  }

  /* ================================================================
     CANVAS PAINTER — one code path for preview, thumbnails, export.
     ================================================================ */
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function semColor(st, kind) {
    if (kind === "gain") return PAL.gain;
    if (kind === "loss") return PAL.loss;
    if (kind === "gold") return st.accent;
    return st.text;
  }
  function drawSpark(g, vals, x, y, w, h, st) {
    if (!vals || vals.length < 2) return false;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = (max - min) || 1;
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? PAL.gain : PAL.loss;
    var px = function (i) { return x + i * w / (vals.length - 1); };
    var py = function (v) { return y + h - (v - min) / rng * h; };
    g.beginPath();
    vals.forEach(function (v, i) { if (i === 0) g.moveTo(px(i), py(v)); else g.lineTo(px(i), py(v)); });
    g.strokeStyle = col; g.lineWidth = Math.max(2, w * 0.004); g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
    g.lineTo(px(vals.length - 1), y + h); g.lineTo(px(0), y + h); g.closePath();
    var grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, up ? "rgba(76,175,109,0.30)" : "rgba(224,91,75,0.30)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fill();
    g.beginPath(); g.arc(px(vals.length - 1), py(vals[vals.length - 1]), Math.max(3, w * 0.006), 0, Math.PI * 2);
    g.fillStyle = col; g.fill();
    return true;
  }
  function drawBadge(g, cx, cy, r, st) {
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = PAL.gold; g.fill();
    g.lineWidth = r * 0.09; g.strokeStyle = PAL.goldSoft; g.stroke();
    /* star */
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 === 0 ? r * 0.58 : r * 0.25;
      pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
    }
    g.beginPath();
    pts.forEach(function (p, i) { if (i === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); });
    g.closePath(); g.fillStyle = "#171408"; g.fill();
    g.restore();
  }
  function drawFooter(g, W, H, model, st, fs, pad) {
    var items = model.social || [];
    var f = BODY_FONT;
    /* disclaimer */
    var yDisc = H - pad * 0.55;
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    /* website link (bottom line) */
    g.font = "600 " + Math.round(27 * fs) + "px " + f;
    g.fillStyle = st.accent;
    var linkText = SHARE_LINK.replace(/^https?:\/\//, "").replace(/\/$/, "");
    g.fillText(linkText, W / 2, yDisc);
    var linkH = 40 * fs;
    /* social grid above the link */
    var cols = items.length > 4 ? 3 : 2;
    var rows = Math.max(1, Math.ceil(items.length / cols));
    var itemH = 44 * fs, gridH = rows * itemH;
    var gridTop = yDisc - linkH - gridH;
    var colW = (W - pad * 2) / cols;
    var iconS = 30 * fs;
    g.font = "600 " + Math.round(26 * fs) + "px " + f;
    items.forEach(function (it, i) {
      var cx = pad + (i % cols) * colW, cy = gridTop + Math.floor(i / cols) * itemH;
      var midY = cy + itemH / 2;
      g.save();
      try {
        var p = new Path2D(it.icon);
        g.translate(cx, midY - iconS / 2); g.scale(iconS / 24, iconS / 24);
        g.fillStyle = st.muted; g.fill(p);
      } catch (e) {}
      g.restore();
      g.textAlign = "left"; g.textBaseline = "middle";
      g.fillStyle = st.text;
      g.fillText(HANDLE_TEXT, cx + iconS + 12 * fs, midY + 1);
      g.textBaseline = "alphabetic";
    });
    /* disclaimer above the grid */
    g.textAlign = "center";
    g.font = "500 " + Math.round(23 * fs) + "px " + f;
    g.fillStyle = st.muted;
    g.fillText(DISCLAIMER, W / 2, gridTop - 18 * fs);
    return gridTop - 18 * fs - 30 * fs; /* content must end above this y */
  }

  function drawCard(g, W, H, model, st, thumb) {
    var fs = W / 1080; if (W > H) fs = Math.min(W / 1080, (H / 1080) * 1.5);
    fs = Math.max(0.26, Math.min(fs, 1.8));
    var pad = Math.round(W * 0.052);
    /* ---- background ---- */
    var bg;
    if (st.diag) { bg = g.createLinearGradient(0, 0, W, H); }
    else { bg = g.createLinearGradient(0, 0, 0, H); }
    st.bg.forEach(function (c, i) { bg.addColorStop(st.bg.length === 1 ? 0 : i / (st.bg.length - 1), c); });
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (st.glow) {
      var rg = g.createRadialGradient(W * 0.82, H * 0.1, 10, W * 0.82, H * 0.1, W * 0.75);
      rg.addColorStop(0, "rgba(76,175,109,0.20)"); rg.addColorStop(1, "rgba(76,175,109,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (st.frame) {
      g.strokeStyle = "rgba(201,162,39,0.85)"; g.lineWidth = 3 * fs;
      rr(g, 16 * fs, 16 * fs, W - 32 * fs, H - 32 * fs, 26 * fs); g.stroke();
      g.strokeStyle = "rgba(201,162,39,0.35)"; g.lineWidth = 1.4 * fs;
      rr(g, 26 * fs, 26 * fs, W - 52 * fs, H - 52 * fs, 20 * fs); g.stroke();
    }
    var contentBottom = drawFooter(g, W, H, model, st, fs, pad);

    /* ---- header: real Singh Caizen logo + FOLIO wordmark ---- */
    var y = pad * 0.92;
    var logoH = 58 * fs, logoW = logoH * 639 / 392;
    var logo = st.dark ? logoImgs.dark : logoImgs.light;
    g.textBaseline = "alphabetic";
    if (logo) { try { g.drawImage(logo, pad, y, logoW, logoH); } catch (e) { logo = null; } }
    if (!logo) {
      g.textAlign = "left"; g.fillStyle = st.accent;
      g.font = "700 " + Math.round(30 * fs) + "px " + DISPLAY_FONT;
      g.fillText("SINGH CAIZEN", pad, y + logoH * 0.68);
      logoW = g.measureText("SINGH CAIZEN").width;
    }
    g.textAlign = "left"; g.fillStyle = st.text;
    g.font = "700 " + Math.round(40 * fs) + "px " + DISPLAY_FONT;
    try { g.letterSpacing = Math.round(6 * fs) + "px"; } catch (e) {}
    g.fillText("FOLIO", pad + logoW + 20 * fs, y + logoH * 0.7);
    try { g.letterSpacing = "0px"; } catch (e) {}
    /* header right: card type + date */
    g.textAlign = "right"; g.fillStyle = st.muted;
    g.font = "700 " + Math.round(21 * fs) + "px " + BODY_FONT;
    g.fillText(model.typeLabel || "", W - pad, y + logoH * 0.42);
    if (model.date) {
      g.font = "500 " + Math.round(21 * fs) + "px " + BODY_FONT;
      g.fillText(model.date, W - pad, y + logoH * 0.42 + 28 * fs);
    }
    y += logoH + 34 * fs;

    if (model.empty) {
      g.textAlign = "center"; g.fillStyle = st.muted;
      g.font = "500 " + Math.round(30 * fs) + "px " + BODY_FONT;
      g.fillText(model.empty, W / 2, Math.min(y + 190 * fs, contentBottom - 40 * fs));
      return;
    }

    /* ---- title ---- */
    g.textAlign = "left"; g.fillStyle = st.muted;
    g.font = "700 " + Math.round(23 * fs) + "px " + BODY_FONT;
    var titleTxt = (model.title || "").toUpperCase();
    g.fillText(titleTxt, pad, y + 22 * fs);
    if (model.badge) {
      var bw = 300 * fs;
      drawBadge(g, W - pad - 40 * fs, y + 26 * fs, 36 * fs, st);
      g.textAlign = "right"; g.fillStyle = PAL.gold;
      g.font = "800 " + Math.round(21 * fs) + "px " + BODY_FONT;
      g.fillText("OUTPERFORMER", W - pad - 88 * fs, y + 34 * fs);
      g.textAlign = "left";
    }
    y += 44 * fs;
    if (model.subtitle) {
      g.fillStyle = st.muted; g.font = "500 " + Math.round(24 * fs) + "px " + BODY_FONT;
      var sub = model.subtitle; var maxSub = W - pad * 2;
      while (sub.length > 4 && g.measureText(sub).width > maxSub) sub = sub.slice(0, -2);
      if (sub !== model.subtitle) sub = sub.trim() + "…";
      g.fillText(sub, pad, y + 20 * fs);
      y += 34 * fs;
    }

    /* ---- hero number ---- */
    var heroTxt = (model.heroPct === null || model.heroPct === undefined) ? "—"
      : (model.heroPct >= 0 ? "▲ +" : "▼ ") + Math.abs(model.heroPct).toFixed(2) + "%";
    g.font = "800 " + Math.round(112 * fs) + "px " + DISPLAY_FONT;
    var heroCol = (model.heroPct === null || model.heroPct === undefined) ? st.text : semColor(st, model.heroPct >= 0 ? "gain" : "loss");
    if (st.glow && model.heroPct !== null && model.heroPct !== undefined) { g.shadowColor = heroCol; g.shadowBlur = 34 * fs; }
    g.fillStyle = heroCol;
    g.fillText(heroTxt, pad, y + 104 * fs);
    g.shadowBlur = 0;
    var heroW = g.measureText(heroTxt).width;
    g.font = "600 " + Math.round(27 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.muted;
    g.fillText(model.heroLabel || "", pad + heroW + 18 * fs, y + 104 * fs);
    y += 128 * fs;
    if (model.heroSub) {
      g.font = "500 " + Math.round(25 * fs) + "px " + BODY_FONT;
      g.fillStyle = st.muted;
      g.fillText(model.heroSub, pad, y + 22 * fs);
      y += 40 * fs;
    }

    /* ---- stat chips (glass panels) ---- */
    if (model.chips && model.chips.length) {
      var n = model.chips.length, gap = 14 * fs, cw = (W - pad * 2 - gap * (n - 1)) / n, chh = 108 * fs;
      model.chips.forEach(function (c, i) {
        var cx = pad + i * (cw + gap);
        rr(g, cx, y, cw, chh, 18 * fs);
        g.fillStyle = st.panel; g.fill();
        g.strokeStyle = c.hot ? PAL.gold : st.stroke; g.lineWidth = c.hot ? 2.4 * fs : 1.2 * fs; g.stroke();
        g.textAlign = "left"; g.fillStyle = st.muted;
        g.font = "700 " + Math.round(19 * fs) + "px " + BODY_FONT;
        g.fillText(c.label.toUpperCase(), cx + 20 * fs, y + 38 * fs);
        g.fillStyle = semColor(st, c.color);
        var vSize = 39;
        g.font = "700 " + Math.round(vSize * fs) + "px " + DISPLAY_FONT;
        var v = c.value;
        while (vSize > 22 && g.measureText(v).width > cw - 36 * fs) { vSize -= 3; g.font = "700 " + Math.round(vSize * fs) + "px " + DISPLAY_FONT; }
        g.fillText(v, cx + 20 * fs, y + 86 * fs);
      });
      y += chh + 26 * fs;
    }

    /* ---- sparkline panel ---- */
    var avail = contentBottom - y;
    if (model.series && model.series.length >= 2 && avail > 190 * fs) {
      var sh = Math.min(avail * 0.42, 330 * fs);
      if (H / W > 1.5) sh = Math.min(avail * 0.5, 470 * fs);
      rr(g, pad, y, W - pad * 2, sh, 20 * fs);
      g.fillStyle = st.panel; g.fill();
      g.strokeStyle = st.stroke; g.lineWidth = 1.2 * fs; g.stroke();
      if (model.seriesLabel && !thumb) {
        g.textAlign = "left"; g.fillStyle = st.muted;
        g.font = "600 " + Math.round(20 * fs) + "px " + BODY_FONT;
        g.fillText(model.seriesLabel.toUpperCase(), pad + 22 * fs, y + 34 * fs);
      }
      drawSpark(g, model.series, pad + 22 * fs, y + (thumb ? 16 * fs : 48 * fs), W - pad * 2 - 44 * fs, sh - (thumb ? 32 * fs : 68 * fs), st);
      y += sh + 26 * fs;
    }

    /* ---- list rows ---- */
    function listRow(r, x, yy, w) {
      g.textAlign = "left"; g.fillStyle = st.text;
      g.font = "700 " + Math.round(29 * fs) + "px " + BODY_FONT;
      g.fillText(r.left, x, yy);
      var lw = g.measureText(r.left).width;
      if (r.sub) {
        g.fillStyle = st.muted; g.font = "500 " + Math.round(23 * fs) + "px " + BODY_FONT;
        var s = r.sub, maxS = w - lw - 190 * fs;
        while (s.length > 3 && g.measureText(s).width > maxS) s = s.slice(0, -2);
        if (s !== r.sub) s = s.trim() + "…";
        g.fillText(s, x + lw + 16 * fs, yy);
      }
      g.textAlign = "right"; g.fillStyle = semColor(st, r.color);
      g.font = "700 " + Math.round(29 * fs) + "px " + BODY_FONT;
      g.fillText(r.right, x + w, yy);
      if (r.rightSub) {
        g.fillStyle = st.muted; g.font = "500 " + Math.round(21 * fs) + "px " + BODY_FONT;
        g.fillText(r.rightSub, x + w, yy + 27 * fs);
      }
      g.textAlign = "left";
    }
    if (model.twoCol) {
      var colGap = 26 * fs, colW2 = (W - pad * 2 - colGap) / 2;
      var maxRows = Math.max(model.twoCol.left.length, model.twoCol.right.length);
      [[model.twoCol.leftTitle, model.twoCol.left, pad], [model.twoCol.rightTitle, model.twoCol.right, pad + colW2 + colGap]].forEach(function (col) {
        g.textAlign = "left"; g.fillStyle = col[0].indexOf("GAIN") >= 0 ? PAL.gain : PAL.loss;
        g.font = "800 " + Math.round(22 * fs) + "px " + BODY_FONT;
        g.fillText(col[0], col[2], y + 20 * fs);
        col[1].forEach(function (r, i) {
          var yy = y + 66 * fs + i * 52 * fs;
          if (yy > contentBottom - 10 * fs) return;
          g.textAlign = "left"; g.fillStyle = st.text;
          g.font = "700 " + Math.round(27 * fs) + "px " + BODY_FONT;
          g.fillText(r.left, col[2], yy);
          g.textAlign = "right"; g.fillStyle = semColor(st, r.color);
          g.fillText(r.right, col[2] + colW2, yy);
        });
        if (!col[1].length) {
          g.fillStyle = st.muted; g.font = "500 " + Math.round(23 * fs) + "px " + BODY_FONT;
          g.fillText("None in this window", col[2], y + 66 * fs);
        }
      });
      y += 66 * fs + maxRows * 52 * fs;
    } else if (model.rows && model.rows.length) {
      if (model.listTitle && !thumb) {
        g.textAlign = "left"; g.fillStyle = st.muted;
        g.font = "700 " + Math.round(21 * fs) + "px " + BODY_FONT;
        g.fillText(model.listTitle, pad, y + 20 * fs);
        y += 36 * fs;
      }
      model.rows.forEach(function (r, i) {
        var yy = y + 34 * fs + i * 58 * fs;
        if (yy > contentBottom - 8 * fs) return;
        listRow(r, pad, yy, W - pad * 2);
        if (i < model.rows.length - 1) {
          g.strokeStyle = st.stroke; g.globalAlpha = 0.45; g.lineWidth = 1;
          g.beginPath(); g.moveTo(pad, yy + 16 * fs); g.lineTo(W - pad, yy + 16 * fs); g.stroke();
          g.globalAlpha = 1;
        }
      });
    }
  }

  /* ================================================================
     ACTIONS — share / save / copy.
     ================================================================ */
  function canvasBlob() {
    return new Promise(function (res) {
      try { dom.canvas.toBlob(function (b) { res(b); }, "image/png"); }
      catch (e) { res(null); }
    });
  }
  function fileName() {
    var t = state ? state.type : "card";
    return "folio-" + t + "-card.png";
  }
  function downloadBlob(blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function copyTextFallback(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove(); return true;
    } catch (e) { return false; }
  }
  function writeClipboardText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return copyTextFallback(text); });
    return Promise.resolve(copyTextFallback(text));
  }

  function doShare() {
    if (!state || !state.model) return;
    canvasBlob().then(function (blob) {
      if (!blob) { gToast("Could not create the card image."); return; }
      var text = state.shareText;
      var file = null;
      try { file = new File([blob], fileName(), { type: "image/png" }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        var payload = { files: [file], title: "FOLIO — My Portfolio Card", text: text };
        navigator.share(payload).catch(function (err) {
          if (err && err.name === "AbortError") return; // user closed the share sheet
          /* sharing failed for another reason → friendly fallback */
          downloadBlob(blob);
          writeClipboardText(text).then(function () { gToast("Sharing was not available — the card image was downloaded and the text copied instead."); });
        });
        return;
      }
      /* Fallback (spec): download the image + copy the text with the link. */
      downloadBlob(blob);
      writeClipboardText(text).then(function (ok) {
        gToast(ok ? "File sharing is not supported here — the card image was downloaded and the text with the link was copied."
                  : "File sharing is not supported here — the card image was downloaded instead.");
      });
    });
  }
  function doSave() {
    if (!state || !state.model) return;
    canvasBlob().then(function (blob) {
      if (!blob) { gToast("Could not create the card image."); return; }
      downloadBlob(blob);
      gToast("Share card saved as a PNG image.");
    });
  }
  function doCopyImage() {
    if (!state || !state.model) return;
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard || !navigator.clipboard.write) {
      gToast("Copying images is not supported in this browser — use Save image instead.");
      return;
    }
    var item = {};
    item["image/png"] = canvasBlob().then(function (b) { if (!b) throw new Error("no blob"); return b; });
    try {
      navigator.clipboard.write([new ClipboardItem(item)]).then(function () {
        gToast("Card image copied — paste it anywhere.");
      }).catch(function () { gToast("Copy failed in this browser — use Save image instead."); });
    } catch (e) { gToast("Copy failed in this browser — use Save image instead."); }
  }
  function doCopyText() {
    if (!state) return;
    writeClipboardText(state.shareText || ("My portfolio on FOLIO via FOLIO by Singh Caizen " + SHARE_LINK)).then(function (ok) {
      gToast(ok ? "Text and link copied." : "Copy failed — long-press the preview to save the image instead.");
    });
  }

  /* ---------------- public API ---------------- */
  window.FolioShare = {
    open: function (opts) { openSheet(opts || {}); },
    close: function () { closeSheet(); },
    SHARE_LINK: SHARE_LINK
  };
})();
