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
              | 'growth' | 'alpha' | 'donut' | 'heatmapM' | 'dividend'
              | 'scorecard' | 'journey' | 'milestones' | 'winrate'
              | 'mood' | 'star' | 'podium' | 'dip' | 'heatToday'
              | 'wrapped'   (a 5-card set; state.wrappedPeriod picks
                             'month' | 'year', the sheet pages through it)

   v112 additions (all additive — the five original types, six styles
   and four sizes behave exactly as before):
     - Singh Caizen logo at the top-right of every card, 9% of the
       card width, white artwork on dark cards / dark on light cards;
       the brand line reads "FOLIO by Singh Caizen" with Singh Caizen
       in bold.
     - Colour THEMES (Emerald default = the legacy palette, Midnight,
       Sunset, Ocean, Royal Purple, Mono, Gold) applied OVER the six
       layout styles, plus a background mode: Solid | Gradient | Glass.
       Theme + style + size + background persist in folio_share_pref.
     - A "Suggested for you" row computed from real portfolio state.
     - Analytics numbers come only from window.folioAnalyticsForReport()
       (the same values the Insights tab and the PDF report show);
       trade statistics only from folioFifo(); transactions only from
       the app's own state via the guarded gAppTxns() helper below.
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
    { id: "summary",   label: "Portfolio summary",      group: "portfolio" },
    { id: "today",     label: "Today's performance",    group: "stocks" },
    { id: "period",    label: "Period performance",     group: "portfolio" },
    { id: "gainers",   label: "Top gainers & draggers", group: "stocks" },
    { id: "stock",     label: "Single stock",           group: "stocks" },
    { id: "growth",    label: "Portfolio growth",       group: "portfolio" },
    { id: "alpha",     label: "Alpha vs NIFTY",         group: "portfolio" },
    { id: "donut",     label: "Allocation donut",       group: "portfolio" },
    { id: "heatmapM",  label: "Monthly returns",        group: "portfolio" },
    { id: "dividend",  label: "Dividend income",        group: "portfolio" },
    { id: "scorecard", label: "Risk & quality grades",  group: "portfolio" },
    { id: "journey",   label: "Investing journey",       group: "portfolio" },
    { id: "milestones", label: "Milestones & streaks",  group: "portfolio" },
    { id: "winrate",   label: "Win rate & profit factor", group: "portfolio" },
    { id: "mood",      label: "Market mood (NIFTY)",    group: "portfolio" },
    { id: "star",      label: "Star performer",         group: "stocks" },
    { id: "podium",    label: "Top 3 gainers podium",   group: "stocks" },
    { id: "dip",       label: "Biggest fall",           group: "stocks" },
    { id: "heatToday", label: "Today's heatmap",        group: "stocks" },
    { id: "wrapped",   label: "Wrapped (5-card set)",   group: "wrapped" },
    /* Smart Money (Part 2): data comes ONLY via the Part 1 hook
       (window.folioSmartMoneyForReport / folioSmartMoneyGates) — this
       module never fetches Smart Money data itself. Types whose
       dataset is unavailable are hidden by refreshSmPicker(); the
       deal type stays visible but disabled while deals are gated off. */
    { id: "sm_whoowns",    label: "Who owns this stock",          group: "smartmoney" },
    { id: "sm_fundact",    label: "Fund house activity",          group: "smartmoney" },
    { id: "sm_deal",       label: "Bulk / block deal",            group: "smartmoney" },
    { id: "sm_accum",      label: "Funds accumulating",           group: "smartmoney" },
    { id: "sm_portfolio",  label: "Smart money in my portfolio",  group: "smartmoney" },
    { id: "sm_leaderboard", label: "Top MF buys & sells",         group: "smartmoney" },
    { id: "sm_flows",      label: "FII flows — monthly (NSDL)",   group: "smartmoney" },
    { id: "sm_trend",      label: "Ownership trend",              group: "smartmoney" }
  ];
  var TYPE_GROUPS = [
    { id: "portfolio", label: "Portfolio" },
    { id: "stocks",    label: "Stocks" },
    { id: "wrapped",   label: "Wrapped" },
    { id: "smartmoney", label: "Smart Money" }
  ];
  var SM_TYPES = { sm_whoowns: 1, sm_fundact: 1, sm_deal: 1, sm_accum: 1, sm_portfolio: 1, sm_leaderboard: 1, sm_flows: 1, sm_trend: 1 };
  var SM_STOCK_TYPES = ["sm_whoowns", "sm_trend"];

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
  /* Colour themes — a palette applied OVER the layout styles above.
     EMERALD IS SPECIAL: it is the legacy palette. effStyle() returns
     the base style untouched for Emerald, so every pre-v112 card
     renders byte-for-byte as before. Other themes recolour accents
     and the gain/loss semantics across all styles; the *L fields are
     darker variants used on light styles so text stays readable
     (see SHARE112.md for the contrast rules). gradStops replaces the
     Bold Gradient style's background (all are dark, so its white
     text and the theme accent stay legible). */
  var THEMES = [
    { id: "emerald", name: "Emerald" },
    { id: "midnight", name: "Midnight", accent: "#6f9cf5", accentSoft: "#a8c4f8", gain: "#3fce97", loss: "#ff7a6b",
      accentL: "#2f5fc0", gainL: "#1d7a4c", lossL: "#c23a2a",
      panelTint: "rgba(111,156,245,0.10)", strokeTint: "rgba(111,156,245,0.45)", gradStops: ["#0d1b3e", "#1d3a6e", "#3f6fb5"] },
    { id: "sunset", name: "Sunset", accent: "#ff9e57", accentSoft: "#ffc38f", gain: "#58c172", loss: "#ff6b5e",
      accentL: "#b04e12", gainL: "#22763d", lossL: "#c23a2a",
      panelTint: "rgba(255,158,87,0.10)", strokeTint: "rgba(255,158,87,0.45)", gradStops: ["#571d0c", "#a03d17", "#cf7024"] },
    { id: "ocean", name: "Ocean", accent: "#39c2d7", accentSoft: "#8fe0ee", gain: "#3ecf8e", loss: "#ff7a6b",
      accentL: "#0b6e84", gainL: "#1d7a4c", lossL: "#c23a2a",
      panelTint: "rgba(57,194,215,0.10)", strokeTint: "rgba(57,194,215,0.45)", gradStops: ["#062a3a", "#0d556e", "#1283a0"] },
    { id: "royal", name: "Royal Purple", accent: "#b48cf2", accentSoft: "#d3b8f8", gain: "#4cc38a", loss: "#ff7a6b",
      accentL: "#6d28c9", gainL: "#1d7a4c", lossL: "#c23a2a",
      panelTint: "rgba(180,140,242,0.12)", strokeTint: "rgba(180,140,242,0.50)", gradStops: ["#2a1052", "#4b2386", "#7440b8"] },
    { id: "mono", name: "Mono", accent: "#c9c9c9", accentSoft: "#e6e6e6", gain: "#9db89f", loss: "#d29a92",
      accentL: "#3d3d3d", gainL: "#4a6b4e", lossL: "#96504a",
      panelTint: "rgba(200,200,200,0.08)", strokeTint: "rgba(200,200,200,0.40)", gradStops: ["#232323", "#454545", "#6e6e6e"] },
    { id: "gold", name: "Gold", accent: "#e3c565", accentSoft: "#f0d47a", gain: "#4caf6d", loss: "#e05b4b",
      accentL: "#8a6d14", gainL: "#2e7d46", lossL: "#c23a2a",
      panelTint: "rgba(201,162,39,0.10)", strokeTint: "rgba(201,162,39,0.55)", gradStops: ["#3a2c07", "#8a5a16", "#c9a227"] }
  ];
  var BG_MODES = [
    { id: "solid",    label: "Solid" },
    { id: "gradient", label: "Gradient" },
    { id: "glass",    label: "Glass" }
  ];
  /* Categorical colours for the allocation donut — deliberately NOT
     theme/semantic colours, so a slice always means "a holding",
     never "good/bad", and slices stay distinct in every theme. */
  var DONUT_COLORS = ["#c9a227", "#4caf6d", "#39c2d7", "#b48cf2", "#ff9e57", "#e05b4b", "#7fb069", "#8a8d93"];
  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

  /* ---------------- v112 guarded accessors ----------------
     gAnalytics(): the v111 report hook — resolves to
     { result, benchName, rf } or null. Cached: the hook itself can
     take seconds when Insights was never opened (it computes on
     demand), so every caller shares one promise. result follows the
     analytics engine contract: reportCard {Returns, RiskControl,
     Diversification, Consistency, Momentum} each {grade, score,
     reason}; returns/risk/allocation field units are documented in
     docs/ANALYTICS.md (fractions vs percents matter — see builders).
     gAppTxns(): the app's transaction list. This module's own sheet
     state is also called `state`, which shadows the app's global
     `state` everywhere inside this IIFE — so the transactions are
     read through a Function-constructor probe whose scope is the
     global scope only (the same trick report.js does not need
     because it has no `state` of its own). Guarded like everything
     else: any failure returns null and cards degrade honestly.
     gFifo(): features.js' global FIFO sale matcher (buy/sell pairing
     with realised gains), for win-rate statistics. */
  var analyticsPromise = null;
  function gAnalytics() {
    if (!analyticsPromise) {
      try {
        if (typeof window !== "undefined" && typeof window.folioAnalyticsForReport === "function") {
          analyticsPromise = Promise.resolve(window.folioAnalyticsForReport()).catch(function () { return null; });
        } else return Promise.resolve(null); /* hook not loaded yet — do not cache the miss */
      } catch (e) { return Promise.resolve(null); }
    }
    return analyticsPromise;
  }
  /* Smart Money (Part 2): the Part 1 data hook, guarded + cached like
     gAnalytics(). Resolves to the bundle assembled by smartmoney.js
     ({ mfAvailable, myStocks, feed, leaderboards, flows, houses,
     overlap, stockFile, houseFile, ... }) or null when the pipeline
     has not published / the module is unavailable. A miss is NOT
     cached, so a later open can retry after the hook loads. */
  var smBundlePromise = null;
  function gSmartMoney() {
    if (!smBundlePromise) {
      try {
        if (typeof window !== "undefined" && typeof window.folioSmartMoneyForReport === "function") {
          smBundlePromise = Promise.resolve(window.folioSmartMoneyForReport()).then(function (b) {
            if (!b) smBundlePromise = null;
            return b;
          }).catch(function () { smBundlePromise = null; return null; });
        } else return Promise.resolve(null); /* hook not loaded yet — do not cache the miss */
      } catch (e) { return Promise.resolve(null); }
    }
    return smBundlePromise;
  }
  /* Followed fund houses, read through the same global-scope probe
     gAppTxns uses (this module's own `state` shadows the app's). */
  function gSmFollows() {
    try {
      var probe = new Function("return (typeof state !== 'undefined' && state && state.profile && state.profile.smartmoney && Array.isArray(state.profile.smartmoney.follows)) ? state.profile.smartmoney.follows : null;");
      var f = probe();
      return Array.isArray(f) ? f : [];
    } catch (e) { return []; }
  }
  function gAppTxns() {
    try {
      var probe = new Function("return (typeof state !== 'undefined' && state && state.txns) ? state.txns : null;");
      var t = probe();
      return Array.isArray(t) ? t : null;
    } catch (e) { return null; }
  }
  function gFifo() { try { return (typeof folioFifo === "function") ? folioFifo() : null; } catch (e) { return null; } }
  /* DIV transactions store the TOTAL rupees received in `price`
     (qty is 0 for DIV — see computeHoldings() and the txn form in
     app.js), so a dividend's amount is simply Number(t.price). */
  function divAmount(t) { return Number(t && t.price) || 0; }
  function txnTime(t) { var ms = new Date((t && t.date) + "T00:00:00").getTime(); return isFinite(ms) ? ms : null; }

  /* "#rrggbb" + alpha -> "rgba(r,g,b,a)"; falls back to the input. */
  function hexA(hex, a) {
    try {
      var m = /^#([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return hex;
      var n = parseInt(m[1], 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    } catch (e) { return hex; }
  }
  function themeById(id) { return THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0]; }

  /* Effective style for a render: base layout style + the session's
     theme + background mode. Emerald returns the base style object
     itself (legacy rendering, untouched). Other themes return a
     shallow copy with themed fields set; drawCard/semColor/drawSpark
     prefer st.gain/st.loss/st.themed when present and fall back to
     the legacy PAL values, so Emerald output is bit-identical. */
  function effStyle(base) {
    var th = themeById(state ? state.theme : "emerald");
    var mode = state ? state.bgMode : "gradient";
    if (th.id === "emerald" && mode === "gradient") return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (th.id !== "emerald") {
      var light = !base.dark;
      out.themed = true;
      out.accent = light ? th.accentL : th.accent;
      out.accentSoft = th.accentSoft;
      out.gain = light ? th.gainL : th.gain;
      out.loss = light ? th.lossL : th.loss;
      if (!light && th.panelTint) out.panel = th.panelTint;
      if (!light && th.strokeTint) out.stroke = th.strokeTint;
      if (base.id === "gradient" && th.gradStops) out.bg = th.gradStops;
    }
    if (mode === "solid") out.bg = [out.bg[0], out.bg[0]];
    out.bgMode = mode;
    return out;
  }

  /* Dated portfolio value series [{t, v}] — the same construction
     as features.js buildValueSeries()/renderMonthly(): union of
     timestamps, today's quantities valued at closeAt() with the buy
     average as fallback, zero/negative points dropped. The base
     module's portfolioSeries() returns values only; the monthly
     heatmap and Wrapped cards need the dates too. */
  function datedSeries(d, rangeKey) {
    return Promise.all(d.rows.map(function (r) { return gFetchHistory(r.sym, rangeKey); })).then(function (hists) {
      try {
        var tset = new Set();
        hists.forEach(function (h) { if (h && h.points) h.points.forEach(function (p) { tset.add(p.t); }); });
        var ts = Array.from(tset).sort(function (a, b) { return a - b; });
        var out = ts.map(function (t) {
          return {
            t: t,
            v: d.rows.reduce(function (s, r, i) {
              var h = hists[i], c = null;
              if (h && h.points) { for (var j = 0; j < h.points.length; j++) { if (h.points[j].t <= t) c = h.points[j].c; else break; } }
              return s + r.qty * (c !== null ? c : r.avg);
            }, 0)
          };
        }).filter(function (x) { return x.v > 0; });
        return out.length ? out : null;
      } catch (e) { return null; }
    });
  }
  /* Month-end values + chained monthly returns, exactly as
     renderMonthly() in features.js computes them. Returns
     { keys: ["YYYY-MM"...], monthEnd: {key: v}, rets: {key: pct} }. */
  function monthlyFromSeries(series) {
    var monthEnd = {};
    (series || []).forEach(function (x) {
      var dt = new Date(x.t);
      monthEnd[dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0")] = x.v;
    });
    var keys = Object.keys(monthEnd).sort();
    var rets = {};
    for (var i = 1; i < keys.length; i++) {
      var prev = monthEnd[keys[i - 1]], cur = monthEnd[keys[i]];
      if (prev > 0) rets[keys[i]] = (cur / prev - 1) * 100;
    }
    return { keys: keys, monthEnd: monthEnd, rets: rets };
  }
  /* One stock's return between two timestamps, from its own closes
     (last close on/before the start, else the first close after it —
     the same start-price rule as the Insights engine). */
  function stockReturnWindow(sym, startTs) {
    return gFetchHistory(sym, "5y").then(function (h) {
      try {
        if (!h || !h.points || h.points.length < 2) return null;
        var pts = h.points, sp = null;
        for (var j = 0; j < pts.length; j++) { if (pts[j].t <= startTs) sp = pts[j].c; else break; }
        if (sp === null) sp = pts[0].c;
        var last = pts[pts.length - 1].c;
        return sp ? (last - sp) / sp * 100 : null;
      } catch (e) { return null; }
    });
  }
  /* One stock's closes from a timestamp onward (Wrapped growth mini
     charts for a single name are not used; this serves period stars
     when a custom window is needed). Returns [closes] or null. */
  function stockClosesSince(sym, startTs) {
    return gFetchHistory(sym, "5y").then(function (h) {
      try {
        if (!h || !h.points) return null;
        var pts = h.points.filter(function (p) { return p.t >= startTs; });
        return pts.length >= 2 ? pts.map(function (p) { return p.c; }) : null;
      } catch (e) { return null; }
    });
  }

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
    ".fsh-overlay{position:fixed;inset:0;z-index:1450;background:rgba(8,8,6,0.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}",
    ".fsh-overlay[hidden]{display:none!important}",
    ".fsh-sheet{background:var(--panel,#1b1a17);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:18px;width:100%;max-width:520px;max-height:92dvh;overflow-y:auto;box-shadow:0 24px 70px rgba(0,0,0,0.5);box-sizing:border-box;font-family:'Public Sans',system-ui,sans-serif;animation:fshIn .22s ease}",
    "@keyframes fshIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}",
    ".fsh-handle{display:none}",
    ".fsh-head{display:flex;align-items:center;gap:8px;padding:14px 16px 6px}",
    ".fsh-head h3{flex:1;margin:0;font-family:inherit;font-size:1.15rem;color:var(--text);letter-spacing:.02em}",
    ".fsh-iconbtn{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:10px;width:38px;height:38px;min-width:38px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}",
    ".fsh-iconbtn:hover{border-color:var(--accent);color:var(--accent)}",
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
    ".fsh-seg button[aria-pressed='true']{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}",
    ".fsh-seg button:disabled{opacity:.45;cursor:not-allowed;font-weight:400}",
    ".fsh-styles{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory}",
    ".fsh-style{flex:0 0 auto;width:104px;background:none;border:none;padding:0;cursor:pointer;scroll-snap-align:start;font-family:inherit}",
    ".fsh-style canvas{width:104px;height:104px;display:block;border-radius:10px;border:2px solid var(--line,#33302a)}",
    ".fsh-style[aria-pressed='true'] canvas{border-color:var(--accent)}",
    ".fsh-style small{display:block;margin-top:5px;font-size:.74rem;color:var(--muted,#a89e88);text-align:center}",
    ".fsh-style[aria-pressed='true'] small{color:var(--accent);font-weight:700}",
    ".fsh-select{width:100%;background:var(--input,#16150f);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:10px;padding:.55rem .7rem;font-size:.95rem;font-family:inherit}",
    ".fsh-toggle{display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer;font-size:.92rem}",
    ".fsh-toggle input{width:20px;height:20px;accent-color:var(--accent);flex:0 0 auto}",
    ".fsh-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 16px 18px}",
    ".fsh-act{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:12px;padding:.7rem .6rem;font-size:.92rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;min-height:46px}",
    ".fsh-act svg{width:17px;height:17px;flex:0 0 auto}",
    ".fsh-act:hover{border-color:var(--gold,#c9a227)}",
    ".fsh-act.primary{grid-column:1/-1;background:var(--gold,#c9a227);border-color:var(--gold,#c9a227);color:#171408;font-weight:800;font-size:1rem}",
    ".fsh-act.primary:hover{background:var(--gold-soft,#e3c565)}",
    ".fsh-act[disabled]{opacity:.45;cursor:not-allowed}",
    ".fsh-suggest{display:flex;flex-wrap:wrap;gap:6px}",
    ".fsh-suggest button{background:var(--gold,#c9a227);color:#171408;border:1px solid var(--gold,#c9a227);border-radius:999px;padding:.42rem .8rem;font-size:.86rem;cursor:pointer;font-family:inherit;font-weight:700}",
    ".fsh-wrapnav{display:flex;align-items:center;gap:10px;padding:8px 16px 0}",
    ".fsh-wrapnav[hidden]{display:none!important}",
    ".fsh-wrapnav .fsh-wn-label{flex:1;text-align:center;font-size:.86rem;color:var(--muted,#a89e88);font-weight:600}",
    ".fsh-wrapnav button{background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--line,#33302a);border-radius:10px;padding:.45rem .9rem;font-size:.88rem;cursor:pointer;font-family:inherit;min-height:40px}",
    ".fsh-wrapnav button[disabled]{opacity:.4;cursor:not-allowed}",
    ".fsh-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--panel-2,#232019);color:var(--text,#f2ead8);border:1px solid var(--gold,#c9a227);border-radius:12px;padding:.7rem 1.1rem;z-index:1480;font-size:.92rem;box-shadow:0 12px 34px rgba(0,0,0,0.45);max-width:calc(100vw - 32px);text-align:center;font-family:'Public Sans',system-ui,sans-serif}",
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
        '<div class="fsh-wrapnav" id="fshWrapNav" hidden>' +
          '<button type="button" id="fshWrapPrev" aria-label="Previous wrapped card">‹ Prev</button>' +
          '<span class="fsh-wn-label" id="fshWrapLbl">Card 1 of 5</span>' +
          '<button type="button" id="fshWrapNext" aria-label="Next wrapped card">Next ›</button>' +
        '</div>' +
        '<div class="fsh-body">' +
          '<div class="fsh-sec"><span id="fshSuggestLbl">Suggested for you</span><div class="fsh-suggest" id="fshSuggest" role="group" aria-labelledby="fshSuggestLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshTypePLbl">Card type · Portfolio</span><div class="fsh-seg" id="fshTypeSegP" role="group" aria-labelledby="fshTypePLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshTypeSLbl">Card type · Stocks</span><div class="fsh-seg" id="fshTypeSegS" role="group" aria-labelledby="fshTypeSLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshTypeWLbl">Card type · Wrapped</span><div class="fsh-seg" id="fshTypeSegW" role="group" aria-labelledby="fshTypeWLbl"></div></div>' +
          '<div class="fsh-sec" id="fshSmSec"><span id="fshTypeMLbl">Card type · Smart Money</span><div class="fsh-seg" id="fshTypeSegM" role="group" aria-labelledby="fshTypeMLbl"></div></div>' +
          '<div class="fsh-sec" id="fshRangeSec"><span id="fshRangeLbl">Period</span><div class="fsh-seg" id="fshRangeSeg" role="group" aria-labelledby="fshRangeLbl"></div></div>' +
          '<div class="fsh-sec" id="fshWrapSec"><span id="fshWrapLbl2">Wrapped period</span><div class="fsh-seg" id="fshWrapSeg" role="group" aria-labelledby="fshWrapLbl2"></div></div>' +
          '<div class="fsh-sec" id="fshStockSec"><span id="fshStockLbl">Stock</span><select class="fsh-select" id="fshStockSel" aria-labelledby="fshStockLbl"></select></div>' +
          '<div class="fsh-sec"><span id="fshStyleLbl">Card style</span><div class="fsh-styles" id="fshStyles" role="group" aria-labelledby="fshStyleLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshThemeLbl">Colour theme</span><div class="fsh-seg" id="fshThemeSeg" role="group" aria-labelledby="fshThemeLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshBgLbl">Background</span><div class="fsh-seg" id="fshBgSeg" role="group" aria-labelledby="fshBgLbl"></div></div>' +
          '<div class="fsh-sec"><span id="fshSizeLbl">Size</span><div class="fsh-seg" id="fshSizeSeg" role="group" aria-labelledby="fshSizeLbl"></div></div>' +
          '<div class="fsh-sec"><span>Privacy</span>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshHideAmt"> Hide amounts — show percentages only</label>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshHideQty"> Hide quantities and invested value</label>' +
            '<label class="fsh-toggle"><input type="checkbox" id="fshShowDate"> Show date</label>' +
            '<label class="fsh-toggle" id="fshSmNamesRow"><input type="checkbox" id="fshSmNames"> Show my stock names (Smart Money portfolio card)</label>' +
          '</div>' +
        '</div>' +
        '<div class="fsh-actions">' +
          '<button type="button" class="fsh-act primary" id="fshShareBtn">' + ICONS.share + ' Share</button>' +
          '<button type="button" class="fsh-act" id="fshSaveBtn" aria-label="Save card as PNG image">' + ICONS.save + ' Save image (PNG)</button>' +
          '<button type="button" class="fsh-act" id="fshCopyImgBtn" aria-label="Copy card image to clipboard">' + ICONS.copyImg + ' Copy image</button>' +
          '<button type="button" class="fsh-act" id="fshCopyTxtBtn" aria-label="Copy summary text and website link">' + ICONS.copyText + ' Copy text &amp; link</button>' +
          '<button type="button" class="fsh-act" id="fshDlAllBtn" hidden>' + ICONS.save + ' Download all 5 cards</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    dom = {
      ov: ov, sheet: ov.querySelector(".fsh-sheet"), canvas: ov.querySelector("#fshCanvas"),
      loading: ov.querySelector("#fshLoading"),
      suggest: ov.querySelector("#fshSuggest"),
      typeSegs: { portfolio: ov.querySelector("#fshTypeSegP"), stocks: ov.querySelector("#fshTypeSegS"), wrapped: ov.querySelector("#fshTypeSegW"), smartmoney: ov.querySelector("#fshTypeSegM") },
      smSec: ov.querySelector("#fshSmSec"), smNamesRow: ov.querySelector("#fshSmNamesRow"), smNames: ov.querySelector("#fshSmNames"),
      rangeSec: ov.querySelector("#fshRangeSec"), rangeSeg: ov.querySelector("#fshRangeSeg"),
      wrapSec: ov.querySelector("#fshWrapSec"), wrapSeg: ov.querySelector("#fshWrapSeg"),
      wrapNav: ov.querySelector("#fshWrapNav"), wrapLbl: ov.querySelector("#fshWrapLbl"),
      wrapPrev: ov.querySelector("#fshWrapPrev"), wrapNext: ov.querySelector("#fshWrapNext"),
      stockSec: ov.querySelector("#fshStockSec"), stockSel: ov.querySelector("#fshStockSel"),
      styles: ov.querySelector("#fshStyles"), sizeSeg: ov.querySelector("#fshSizeSeg"),
      themeSeg: ov.querySelector("#fshThemeSeg"), bgSeg: ov.querySelector("#fshBgSeg"),
      hideAmt: ov.querySelector("#fshHideAmt"), hideQty: ov.querySelector("#fshHideQty"), showDate: ov.querySelector("#fshShowDate"),
      shareBtn: ov.querySelector("#fshShareBtn"), saveBtn: ov.querySelector("#fshSaveBtn"),
      copyImgBtn: ov.querySelector("#fshCopyImgBtn"), copyTxtBtn: ov.querySelector("#fshCopyTxtBtn"),
      dlAllBtn: ov.querySelector("#fshDlAllBtn")
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

    TYPE_GROUPS.forEach(function (grp) {
      buildSeg(dom.typeSegs[grp.id], TYPES.filter(function (t) { return t.group === grp.id; }).map(function (t) { return { id: t.id, label: t.label }; }),
        function (id) { state.type = id; state.wrappedIdx = 0; syncControls(); queueRender(true); });
    });
    buildSeg(dom.rangeSeg, RANGES.map(function (r) { return { id: r, label: r }; }), function (id) { state.range = id; queueRender(true); });
    buildSeg(dom.wrapSeg, [{ id: "month", label: "This month" }, { id: "year", label: "This year" }], function (id) { state.wrappedPeriod = id; state.wrappedIdx = 0; syncControls(); queueRender(true); });
    buildSeg(dom.sizeSeg, Object.keys(SIZES).map(function (k) { return { id: k, label: SIZES[k].label }; }), function (id) { state.size = id; savePref(); queueRender(false); });
    buildSeg(dom.themeSeg, THEMES.map(function (t) { return { id: t.id, label: t.name }; }), function (id) { state.theme = id; savePref(); syncControls(); queueRender(false); });
    buildSeg(dom.bgSeg, BG_MODES.map(function (b) { return { id: b.id, label: b.label }; }), function (id) { state.bgMode = id; savePref(); syncControls(); queueRender(false); });
    dom.stockSel.addEventListener("change", function () { state.symbol = dom.stockSel.value; queueRender(true); });
    [dom.hideAmt, dom.hideQty, dom.showDate].forEach(function (el) {
      el.addEventListener("change", function () {
        state.hideAmounts = dom.hideAmt.checked; state.hideQty = dom.hideQty.checked; state.showDate = dom.showDate.checked;
        queueRender(false);
      });
    });
    if (dom.smNames) dom.smNames.addEventListener("change", function () {
      state.smNames = !!dom.smNames.checked;
      savePref();
      queueRender(true);
    });
    dom.wrapPrev.addEventListener("click", function () { stepWrapped(-1); });
    dom.wrapNext.addEventListener("click", function () { stepWrapped(1); });
    dom.shareBtn.addEventListener("click", doShare);
    dom.saveBtn.addEventListener("click", doSave);
    dom.copyImgBtn.addEventListener("click", doCopyImage);
    dom.copyTxtBtn.addEventListener("click", doCopyText);
    dom.dlAllBtn.addEventListener("click", doDownloadAll);
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
      b.addEventListener("click", function () { state.style = st.id; savePref(); syncControls(); queueRender(false); });
      dom.styles.appendChild(b);
      try { drawCard(cv.getContext("2d"), 312, 312, model, effStyle(st), true); } catch (e) {}
    });
  }
  function syncControls() {
    TYPE_GROUPS.forEach(function (grp) { setSeg(dom.typeSegs[grp.id], state.type); });
    setSeg(dom.rangeSeg, state.range);
    setSeg(dom.sizeSeg, state.size);
    setSeg(dom.themeSeg, state.theme);
    setSeg(dom.bgSeg, state.bgMode);
    setSeg(dom.wrapSeg, state.wrappedPeriod);
    var needsRange = ["period", "gainers", "stock", "growth", "star", "podium", "dip", "alpha"].indexOf(state.type) >= 0;
    dom.rangeSec.style.display = needsRange ? "" : "none";
    dom.stockSec.style.display = (state.type === "stock" || SM_STOCK_TYPES.indexOf(state.type) >= 0) ? "" : "none";
    if (dom.smNamesRow) dom.smNamesRow.style.display = state.type === "sm_portfolio" ? "" : "none";
    var isWrapped = state.type === "wrapped";
    dom.wrapSec.style.display = isWrapped ? "" : "none";
    dom.wrapNav.hidden = !isWrapped;
    dom.dlAllBtn.hidden = !isWrapped;
    if (isWrapped) syncWrapNav();
    Array.prototype.forEach.call(dom.styles.children, function (b) { b.setAttribute("aria-pressed", b.dataset.val === state.style ? "true" : "false"); });
  }
  function syncWrapNav() {
    var n = state.wrappedSet ? state.wrappedSet.length : 5;
    dom.wrapLbl.textContent = "Card " + (state.wrappedIdx + 1) + " of " + n;
    dom.wrapPrev.disabled = state.wrappedIdx <= 0;
    dom.wrapNext.disabled = state.wrappedIdx >= n - 1;
  }
  /* Page through the already-built Wrapped set — no recompute, the
     models were all built by buildModel() in one pass. */
  function stepWrapped(dir) {
    if (!state || !state.wrappedSet || !state.wrappedSet.length) return;
    var nx = state.wrappedIdx + dir;
    if (nx < 0 || nx >= state.wrappedSet.length) return;
    state.wrappedIdx = nx;
    state.model = state.wrappedSet[nx];
    state.shareText = (state.model.shareText || "My portfolio on FOLIO") + " via FOLIO by Singh Caizen " + SHARE_LINK;
    syncWrapNav();
    paint(state.model);
  }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); closeSheet(); } }
  function onPop() { if (state && state.open) closeSheet(true); }

  /* Sheet look preferences (theme / style / size / background),
     persisted across sessions. First run — no stored pref — keeps
     the legacy defaults exactly (square, app-theme-driven style). */
  function loadPref() {
    try {
      var p = JSON.parse(localStorage.getItem("folio_share_pref") || "null");
      if (!p || typeof p !== "object") return null;
      return {
        theme: THEMES.some(function (t) { return t.id === p.theme; }) ? p.theme : null,
        style: STYLES.some(function (s) { return s.id === p.style; }) ? p.style : null,
        size: SIZES[p.size] ? p.size : null,
        bgMode: BG_MODES.some(function (b) { return b.id === p.bgMode; }) ? p.bgMode : null,
        smNames: p.smNames === true
      };
    } catch (e) { return null; }
  }
  function savePref() {
    if (!state) return;
    try {
      localStorage.setItem("folio_share_pref", JSON.stringify({ theme: state.theme, style: state.style, size: state.size, bgMode: state.bgMode, smNames: !!state.smNames }));
    } catch (e) {}
  }

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
    var pref = loadPref() || {};
    state = {
      open: true, type: type, range: range, symbol: symbol,
      size: pref.size || "square",
      style: pref.style || (isLightTheme() ? "minimal" : "classic"),
      theme: pref.theme || "emerald",
      bgMode: pref.bgMode || "gradient",
      wrappedPeriod: "month", wrappedIdx: 0, wrappedSet: null,
      hideAmounts: true,               // spec default ON
      hideQty: true,                   // spec default ON
      showDate: true,
      appPrivacy: privacy,
      smCtx: opts.sm || null,          // Smart Money entry-point context { houseId, deal }
      smNames: false,                  // Smart Money portfolio card: stock names only when allowed
      model: null, modelKey: "", shareText: "",
      lastFocus: document.activeElement
    };
    if (privacy) { state.hideAmounts = true; state.hideQty = true; }
    state.smNames = privacy ? false : !!pref.smNames; /* Privacy Mode forces names off */
    /* stock picker */
    dom.stockSel.innerHTML = "";
    rows.forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.sym; o.textContent = r.sym + (stockName(r.sym) ? " — " + stockName(r.sym) : "");
      dom.stockSel.appendChild(o);
    });
    /* Smart Money stock cards can target a watched (not held) stock —
       make sure the picker can represent it. */
    if (SM_STOCK_TYPES.indexOf(type) >= 0 && symbol && !rows.some(function (r) { return r.sym === symbol; })) {
      var ox = document.createElement("option");
      ox.value = symbol; ox.textContent = symbol + (stockName(symbol) ? " — " + stockName(symbol) : "");
      dom.stockSel.appendChild(ox);
    }
    if (symbol) dom.stockSel.value = symbol;
    dom.hideAmt.checked = state.hideAmounts; dom.hideQty.checked = state.hideQty; dom.showDate.checked = state.showDate;
    dom.hideAmt.disabled = privacy; dom.hideQty.disabled = privacy;
    if (dom.smNames) { dom.smNames.checked = state.smNames; dom.smNames.disabled = privacy; }
    dom.suggest.innerHTML = "";
    buildSuggestions();
    syncControls();
    refreshSmPicker();
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
  function fmtDay(iso) {
    try {
      var dt = new Date(iso + "T00:00:00");
      if (isFinite(dt.getTime())) return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {}
    return String(iso || "");
  }
  function socialFooter() { return socialEntries(); }

  /* ================================================================
     SMART MONEY CARD TYPES (Part 2) — models for the eight sm_ types.
     Data comes ONLY from gSmartMoney() (the Part 1 hook's bundle) and
     its per-file accessors; this module fetches nothing itself. Every
     model carries sourceLine (drawn by drawFooter above the standard
     disclaimer) and uses inferred wording for fund activity. The
     portfolio card never prints a rupee amount — percentages, scheme
     counts and (only when the user allows) stock names only; Privacy
     Mode forces names off in openSheet.
     ================================================================ */
  function smMonthText(iso) {
    if (!iso) return "";
    var p = String(iso).split("-");
    if (p.length >= 2 && /^\d{4}$/.test(p[0])) {
      var mn = MONTH_SHORT[Number(p[1]) - 1];
      if (mn) return p.length >= 3 && p[2] ? Number(p[2]) + " " + mn + " " + p[0] : mn + " " + p[0];
    }
    return String(iso);
  }
  function smSourceLine(bundle, kind) {
    var asOf = kind === "fii" ? bundle.fiiAsOf : (kind === "deal" ? bundle.dealsAsOf : bundle.mfAsOf);
    return "Source: AMFI, AMC disclosures, NSDL. Data as of " + (smMonthText(asOf) || "the latest disclosure") + ".";
  }
  function smEmpty(base, msg) { base.empty = msg; return base; }
  function smFmtShares(n) {
    if (n == null || !isFinite(n)) return "—";
    if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + " Cr sh";
    if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(1) + " L sh";
    return Math.round(n).toLocaleString("en-IN") + " sh";
  }
  /* Mirrors of smartmoney.js' stockTotals/stockDirection (this module
     stays independent of the SM module's load state, like it mirrors
     the Insights maths elsewhere). */
  function smTotalsOf(file) {
    var t = { schemesNow: 0, schemesPrev: 0, houses: {}, sharesNow: 0, sharesPrev: 0, houseCount: 0 };
    (file.schemes || []).forEach(function (s) {
      if ((s.shares || 0) > 0) { t.schemesNow++; t.sharesNow += s.shares; if (s.house) t.houses[s.house] = 1; }
      if ((s.prevShares || 0) > 0) { t.schemesPrev++; t.sharesPrev += s.prevShares; }
    });
    t.houseCount = Object.keys(t.houses).length;
    return t;
  }
  function smDirectionOf(t) {
    if (t.schemesPrev === 0 && t.schemesNow > 0) return "New entry";
    if (t.schemesNow === 0 && t.schemesPrev > 0) return "Exited";
    if (t.sharesPrev > 0) {
      var p = (t.sharesNow - t.sharesPrev) / t.sharesPrev * 100;
      if (p >= 0.5) return "Increased";
      if (p <= -0.5) return "Reduced";
      return "Little change";
    }
    return "—";
  }
  var SM_MF_MISSING = "Mutual fund data is not available yet — see Data Sources in the app.";

  function smBuildWhoOwns(base, bundle) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var sym = state.symbol;
    if (!sym) return smEmpty(base, "Pick a stock first.");
    return Promise.resolve(bundle.stockFile(sym)).then(function (file) {
      var none = "No covered mutual fund held " + sym + " in the latest disclosure month (" + smMonthText(bundle.mfAsOf) + ").";
      if (!file || !(file.schemes || []).length) return smEmpty(base, none);
      var t = smTotalsOf(file);
      if (!t.schemesNow && !t.schemesPrev) return smEmpty(base, none);
      var byHouse = {};
      file.schemes.forEach(function (s) {
        var hid = s.house || s.houseName || "?";
        var g = byHouse[hid] || (byHouse[hid] = { name: s.houseName || hid, now: 0, prev: 0 });
        g.now += s.shares || 0; g.prev += s.prevShares || 0;
      });
      var holders = Object.keys(byHouse).map(function (k) { return byHouse[k]; })
        .filter(function (g) { return g.now > 0; })
        .sort(function (a, b) { return b.now - a.now; }).slice(0, 3)
        .map(function (g) {
          var net = g.now - g.prev;
          return { name: g.name, held: smFmtShares(g.now), change: net === 0 ? "steady" : (net > 0 ? "▲ " : "▼ ") + smFmtShares(Math.abs(net)), tone: net > 0 ? "gain" : (net < 0 ? "loss" : "") };
        });
      base.typeLabel = "WHO OWNS THIS STOCK";
      base.title = sym + (file.name ? " — " + file.name : "");
      base.subtitle = "Mutual fund holders · " + smMonthText(file.asOf || bundle.mfAsOf) + " disclosures";
      base.heroSub = t.houseCount + " fund houses · " + smDirectionOf(t) + " vs last month (inferred)";
      base.chips = [
        { label: "Schemes", value: t.schemesNow + " (was " + t.schemesPrev + ")" },
        { label: "Fund shares", value: smFmtShares(t.sharesNow) }
      ];
      if (file.mfPct != null) {
        base.heroText = file.mfPct.toFixed(1) + "%";
        base.heroLabel = "of shares held by mutual funds";
        /* The painter draws the MF bar AND the holder rows — drawCard
           gives a custom block the whole content area. */
        base.custom = { kind: "smOwnBar", pct: file.mfPct, holders: holders };
      } else {
        base.heroText = String(t.schemesNow);
        base.heroLabel = "schemes hold this stock";
        base.listTitle = "TOP FUND HOLDERS";
        base.rows = holders.map(function (h) { return { left: h.name, sub: h.held + " held", right: h.change, color: h.tone || undefined }; });
      }
      base.shareText = "Who owns " + sym + ": " + (file.mfPct != null ? file.mfPct.toFixed(1) + "% with mutual funds, " : "") + t.schemesNow + " schemes across " + t.houseCount + " houses — " + smDirectionOf(t).toLowerCase() + " last month (inferred from disclosures)";
      return base;
    });
  }

  function smBuildTrend(base, bundle) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var sym = state.symbol;
    if (!sym) return smEmpty(base, "Pick a stock first.");
    return Promise.resolve(bundle.stockFile(sym)).then(function (file) {
      var hist = (file && file.history) || [];
      var useShares = hist.some(function (h) { return h.totalShares != null; });
      var vals = hist.map(function (h) { return useShares ? h.totalShares : h.schemeCount; });
      if (hist.length < 2 || vals.some(function (v) { return v == null; })) {
        return smEmpty(base, "Not enough monthly history for " + sym + " yet — the trend needs at least two disclosure months.");
      }
      var first = hist[0], last = hist[hist.length - 1];
      base.typeLabel = "OWNERSHIP TREND";
      base.title = sym + (file.name ? " — " + file.name : "");
      base.subtitle = "Mutual fund holding trend · monthly disclosures";
      base.heroText = last.schemeCount != null ? String(last.schemeCount) : "—";
      base.heroLabel = "schemes hold it now";
      base.heroSub = "Was " + (first.schemeCount != null ? first.schemeCount : "—") + " schemes in " + smMonthText(first.month) + " · latest " + smMonthText(last.month);
      base.series = vals;
      base.seriesLabel = useShares ? "Shares held by mutual funds" : "Schemes holding the stock";
      base.shareText = sym + " ownership trend: " + (last.schemeCount != null ? last.schemeCount : "—") + " MF schemes hold it (" + smMonthText(last.month) + "), from " + (first.schemeCount != null ? first.schemeCount : "—") + " in " + smMonthText(first.month);
      return base;
    });
  }

  function smBuildFundAct(base, bundle) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var houses = bundle.houses || [];
    var followed = gSmFollows().filter(function (id) { return houses.some(function (h) { return h.id === id; }); });
    var houseId = (state.smCtx && state.smCtx.houseId) || followed[0] || (houses[0] && houses[0].id) || null;
    if (!houseId) return smEmpty(base, "No fund house data yet.");
    return Promise.resolve(bundle.houseFile(houseId)).then(function (f) {
      if (!f) return smEmpty(base, "This house's monthly disclosure is not available yet.");
      var h = houses.filter(function (x) { return x.id === houseId; })[0];
      var name = f.name || (h && h.name) || houseId;
      var a = f.activity || { newEntries: [], exits: [], increases: [], decreases: [] };
      var buys = (a.increases || []).concat(a.newEntries || []);
      var sells = (a.decreases || []).concat(a.exits || []);
      if (!buys.length && !sells.length) return smEmpty(base, name + " reported no equity activity in the latest disclosure month.");
      base.typeLabel = "FUND HOUSE ACTIVITY";
      base.title = name;
      base.subtitle = "Monthly activity · " + smMonthText(f.asOf || bundle.mfAsOf) + " · inferred from disclosures";
      base.twoCol = {
        leftTitle: "BOUGHT / GAINED", rightTitle: "REDUCED / EXITED",
        left: buys.slice(0, 6).map(function (r) {
          return { left: r.sym, right: r.schemes != null ? r.schemes + " sch" : "", color: "gain", sub: (a.newEntries || []).indexOf(r) >= 0 ? "new entry" : "increased" };
        }),
        right: sells.slice(0, 6).map(function (r) {
          return { left: r.sym, right: r.schemes != null ? r.schemes + " sch" : "", color: "loss", sub: (a.exits || []).indexOf(r) >= 0 ? "exited" : "reduced" };
        })
      };
      base.chips = [
        { label: "New entries", value: String((a.newEntries || []).length) },
        { label: "Full exits", value: String((a.exits || []).length) }
      ];
      base.shareText = name + " in " + smMonthText(f.asOf || bundle.mfAsOf) + ": " + (a.newEntries || []).length + " new entries, " + (a.exits || []).length + " full exits (inferred from scheme disclosures)";
      return base;
    });
  }

  function smBuildDeal(base, bundle) {
    if (!bundle.dealsAvailable) return smEmpty(base, "Bulk and block deal data is not available yet — the free pipeline cannot reach the exchange deal files today.");
    var deal = state.smCtx && state.smCtx.deal;
    if (!deal || !deal.sym) return smEmpty(base, "Open a stock's Who Owns It tab and tap Share on a deal to build this card.");
    var buy = String(deal.side || "").toUpperCase() !== "SELL";
    var qtyTxt = deal.qty != null ? Math.round(deal.qty).toLocaleString("en-IN") + " shares" : "—";
    base.typeLabel = String(deal.type || "bulk").toUpperCase() + " DEAL";
    base.title = deal.sym;
    base.subtitle = (deal.client || "Institutional client") + " · " + smMonthText(deal.date);
    base.heroText = (buy ? "BOUGHT " : "SOLD ") + qtyTxt;
    base.heroLabel = buy ? "in one bulk/block deal" : "in one bulk/block deal";
    if (deal.price != null) base.heroSub = "at " + fmtInr2(deal.price) + " per share";
    base.listTitle = "DEAL DETAILS";
    base.rows = [
      { left: "Client", sub: "", right: deal.client || "—" },
      { left: "Side", sub: "", right: buy ? "Buy" : "Sell", color: buy ? "gain" : "loss" },
      { left: "Date", sub: "", right: smMonthText(deal.date) || "—" }
    ];
    base.shareText = deal.sym + ": " + (buy ? "bulk/block buy of " : "bulk/block sale of ") + qtyTxt + " by " + (deal.client || "a client") + " (" + smMonthText(deal.date) + ")";
    return base;
  }

  function smBuildAccum(base, bundle) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var lb = bundle.leaderboards;
    var rows = (lb && lb.accumulation) || [];
    if (!rows.length) return smEmpty(base, "No multi-fund accumulation data in the latest disclosure month.");
    base.typeLabel = "FUNDS ACCUMULATING";
    base.title = "Funds accumulating together";
    base.subtitle = "Stocks the most fund houses added to · " + smMonthText(lb.asOf || bundle.mfAsOf);
    base.heroText = rows[0].sym;
    base.heroLabel = "most widely accumulated";
    base.heroSub = rows[0].houses != null ? rows[0].houses + " fund houses added or raised it" : "";
    if (rows[0].spark && rows[0].spark.length > 1) { base.series = rows[0].spark; base.seriesLabel = rows[0].sym + " — accumulation, recent months"; }
    base.listTitle = "ACCUMULATION LEADERBOARD";
    base.rows = rows.slice(0, 6).map(function (r) {
      return { left: r.sym, sub: r.name || "", right: (r.houses != null ? r.houses + " houses" : "") + (r.schemes != null ? " · " + r.schemes + " sch" : ""), color: "gain" };
    });
    base.shareText = "Funds are accumulating " + rows[0].sym + " together (" + (rows[0].houses != null ? rows[0].houses + " houses" : "many houses") + ") — inferred from monthly disclosures";
    return base;
  }

  function smBuildLeaderboard(base, bundle) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var lb = bundle.leaderboards;
    if (!lb || (!lb.netBuys.length && !lb.netSells.length)) return smEmpty(base, "Leaderboards are empty for the latest disclosure month.");
    var fmtCr = function (v) { return v != null ? "₹" + Math.round(v).toLocaleString("en-IN") + " Cr est." : "—"; };
    base.typeLabel = "TOP MF BUYS & SELLS";
    base.title = "Top MF buys & sells";
    base.subtitle = smMonthText(lb.asOf || bundle.mfAsOf) + " · estimated from share changes × price";
    base.twoCol = {
      leftTitle: "TOP NET BUYS (GAINERS)", rightTitle: "TOP NET SELLS",
      left: lb.netBuys.slice(0, 5).map(function (r) { return { left: r.sym, sub: r.name || "", right: fmtCr(r.valueCr), color: "gain" }; }),
      right: lb.netSells.slice(0, 5).map(function (r) { return { left: r.sym, sub: r.name || "", right: fmtCr(r.valueCr), color: "loss" }; })
    };
    base.shareText = "Top MF net buy of " + smMonthText(lb.asOf || bundle.mfAsOf) + ": " + (lb.netBuys[0] ? lb.netBuys[0].sym : "—") + " (estimated, inferred from disclosures)";
    return base;
  }

  function smBuildPortfolio(base, bundle, d) {
    if (!bundle.mfAvailable) return smEmpty(base, SM_MF_MISSING);
    var stocks = (bundle.myStocks || []).filter(function (s) { return s.schemesNow > 0 || s.schemesPrev > 0; });
    if (!stocks.length) return smEmpty(base, "No covered mutual fund held your stocks in the latest disclosure month (" + smMonthText(bundle.mfAsOf) + ").");
    var names = !!state.smNames && !state.appPrivacy;
    base.typeLabel = "SMART MONEY IN MY PORTFOLIO";
    base.title = "Smart money in my portfolio";
    base.subtitle = "Mutual fund presence in my holdings · " + smMonthText(bundle.mfAsOf);
    if (bundle.overlap) {
      base.heroText = bundle.overlap.pct.toFixed(1) + "%";
      base.heroLabel = "of my portfolio is in stocks funds also hold";
    } else {
      base.heroText = String(stocks.length);
      base.heroLabel = "of my stocks are held by mutual funds";
    }
    base.listTitle = names ? "MY STOCKS THAT FUNDS HOLD" : "MY HOLDINGS THAT FUNDS HOLD";
    base.rows = stocks.slice(0, 6).map(function (s, i) {
      return {
        left: names ? s.sym : "Holding " + "ABCDEFGH".charAt(i),
        sub: s.houses + " houses · " + s.schemesNow + " schemes",
        right: s.mfPct != null ? s.mfPct.toFixed(1) + "% with funds" : s.direction,
        color: (s.direction === "Increased" || s.direction === "New entry") ? "gain" : (s.direction === "Reduced" || s.direction === "Exited") ? "loss" : undefined
      };
    });
    base.chips = [{ label: "Stocks covered", value: stocks.length + " of " + ((d && d.rows) ? d.rows.length : stocks.length) }];
    base.shareText = "Smart money in my portfolio: mutual funds hold " + stocks.length + " of my stocks (" + smMonthText(bundle.mfAsOf) + " disclosures, inferred)";
    return base;
  }

  function smBuildFlows(base, bundle) {
    if (!bundle.fiiAvailable || !bundle.flows || !(bundle.flows.months || []).length) {
      return smEmpty(base, "NSDL monthly FII flow data is not available yet.");
    }
    var months = bundle.flows.months.slice(-8);
    var last = months[months.length - 1];
    var crTxt = function (v) { return (v >= 0 ? "+" : "−") + "₹" + Math.round(Math.abs(v)).toLocaleString("en-IN") + " Cr"; };
    base.typeLabel = "FII FLOWS — MONTHLY (NSDL)";
    base.title = "Foreign investor flows";
    base.subtitle = "Monthly net FII investment · NSDL · published with a lag";
    base.heroText = crTxt(last.net);
    base.heroLabel = smMonthText(last.month) + (last.net >= 0 ? " net buying" : " net selling");
    base.heroSub = "FII only, whole market. Daily FII/DII figures are not available in free data.";
    base.custom = { kind: "smBars", bars: months.map(function (m) { return { label: smMonthText(m.month), value: m.net }; }) };
    base.shareText = "FII flows, " + smMonthText(last.month) + ": " + crTxt(last.net) + " net — monthly NSDL data, published with a lag";
    return base;
  }

  function buildSmModel(d) {
    var base = { typeLabel: "", social: socialFooter(), date: state.showDate ? dateLine() : "" };
    return gSmartMoney().then(function (bundle) {
      if (!bundle) return smEmpty(base, "Smart Money data is not available yet — the pipeline has not published. See Data Sources in the app for status.");
      base.sourceLine = smSourceLine(bundle, state.type === "sm_flows" ? "fii" : (state.type === "sm_deal" ? "deal" : "mf"));
      if (state.type === "sm_whoowns") return smBuildWhoOwns(base, bundle);
      if (state.type === "sm_trend") return smBuildTrend(base, bundle);
      if (state.type === "sm_fundact") return smBuildFundAct(base, bundle);
      if (state.type === "sm_deal") return smBuildDeal(base, bundle);
      if (state.type === "sm_accum") return smBuildAccum(base, bundle);
      if (state.type === "sm_leaderboard") return smBuildLeaderboard(base, bundle);
      if (state.type === "sm_portfolio") return smBuildPortfolio(base, bundle, d);
      if (state.type === "sm_flows") return smBuildFlows(base, bundle);
      return smEmpty(base, "This Smart Money card is not available.");
    }).catch(function () { return smEmpty(base, "Smart Money data could not be loaded right now."); });
  }

  /* Picker gating: Smart Money types appear only when their dataset
     is live (checked through the Part 1 gates hook, once per open).
     The deal type is the one exception — its seg button supports a
     real disabled state, so it stays visible with its reason, the
     same pattern as the report sheet's section note. If the whole MF
     dataset is unavailable, the Smart Money section hides entirely
     and a pre-selected SM type falls back to the summary card (the
     builders still gate authoritatively if data vanishes). */
  function refreshSmPicker() {
    if (!dom || !dom.typeSegs || !dom.typeSegs.smartmoney) return;
    var seg = dom.typeSegs.smartmoney;
    var btns = {};
    Array.prototype.forEach.call(seg.children, function (b) { btns[b.dataset.val] = b; });
    Object.keys(btns).forEach(function (k) { btns[k].style.display = "none"; });
    function unavailable() {
      if (dom.smSec) dom.smSec.style.display = "none";
      if (state && SM_TYPES[state.type]) { state.type = "summary"; syncControls(); queueRender(true); }
    }
    if (typeof window === "undefined" || typeof window.folioSmartMoneyGates !== "function") { unavailable(); return; }
    window.folioSmartMoneyGates().then(function (g) {
      if (!state || !state.open || !dom) return;
      if (!g || !g.mf || !g.mf.ok) { unavailable(); return; }
      if (dom.smSec) dom.smSec.style.display = "";
      ["sm_whoowns", "sm_fundact", "sm_accum", "sm_portfolio", "sm_leaderboard", "sm_trend"].forEach(function (id) {
        if (btns[id]) btns[id].style.display = "";
      });
      if (btns.sm_flows) btns.sm_flows.style.display = (g.fii && g.fii.ok) ? "" : "none";
      if (btns.sm_deal) {
        btns.sm_deal.style.display = "";
        if (g.deals && g.deals.ok) {
          btns.sm_deal.disabled = false;
          btns.sm_deal.textContent = "Bulk / block deal";
          btns.sm_deal.removeAttribute("title");
        } else {
          btns.sm_deal.disabled = true;
          btns.sm_deal.textContent = "Bulk / block deal — not available yet";
          btns.sm_deal.title = "Bulk and block deal data is not available yet — the free pipeline cannot reach the exchange deal files today.";
        }
      }
    }).catch(function () {});
  }

  function buildModel() {
    var d = gEnriched();
    if (SM_TYPES[state.type]) return buildSmModel(d);
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

    /* ================= v112 card types =================
       Every number below comes from the same sources as the rest of
       this module: enriched() rows, periodStats()/windowSeries()/
       stockSeries() (the Insights-mirroring engine above),
       gAppTxns() (the app's own transactions), gFifo() (features.js'
       FIFO matcher) and gAnalytics() (the Insights/report engine).
       Where a source cannot supply a number, the card says so —
       "Not available in free data" — instead of inventing one. */

    if (type === "growth" || type === "alpha") {
      return periodStats(d, range).then(function (st) {
        return windowSeries(d, range).then(function (series) {
          base.series = series; base.seriesLabel = "Portfolio value · " + RANGE_LABEL[range].toLowerCase();
          if (type === "growth") {
            base.typeLabel = "PORTFOLIO GROWTH";
            base.title = "Portfolio Growth";
            base.heroPct = st.totPct; base.heroLabel = "in " + RANGE_LABEL[range].toLowerCase();
            base.heroSub = hideAmt ? "Percentages only — no amounts shown"
              : "From " + fmtInr(st.totStart) + " to " + fmtInr(st.totStart + st.totChange) + " in this window";
            base.chips = [
              { label: "Start value", value: hideAmt ? "—" : fmtInr(st.totStart), color: "text" },
              { label: "End value", value: hideAmt ? "—" : fmtInr(st.totStart + st.totChange), color: "text" },
              { label: "Alpha vs NIFTY", value: st.alpha !== null ? fmtPct(st.alpha) : "—", color: st.alpha === null ? "text" : (st.alpha >= 0 ? "gain" : "loss"), hot: st.alpha !== null && st.alpha > 0 }
            ];
            base.shareText = "My portfolio moved " + fmtPct(st.totPct) + " over " + RANGE_LABEL[range].toLowerCase() + " on FOLIO";
          } else {
            base.typeLabel = "ALPHA VS NIFTY 50";
            base.title = "Alpha vs NIFTY";
            base.heroPct = st.alpha; base.heroLabel = "alpha · " + RANGE_LABEL[range].toLowerCase();
            base.heroSub = st.alpha === null ? "NIFTY 50 data is not available in free data right now"
              : (st.alpha >= 0 ? "My portfolio beat NIFTY 50 in this window" : "My portfolio trailed NIFTY 50 in this window");
            base.chips = [
              { label: "My Portfolio", value: fmtPct(st.totPct), color: st.totPct >= 0 ? "gain" : "loss" },
              { label: "NIFTY 50", value: st.niftyRet !== null ? fmtPct(st.niftyRet) : "—", color: st.niftyRet === null ? "text" : (st.niftyRet >= 0 ? "gain" : "loss") },
              { label: "Alpha", value: st.alpha !== null ? fmtPct(st.alpha) : "—", color: st.alpha === null ? "text" : (st.alpha >= 0 ? "gain" : "loss"), hot: st.alpha !== null && st.alpha > 0 }
            ];
            base.shareText = "My alpha vs NIFTY 50 (" + RANGE_LABEL[range] + "): " + (st.alpha !== null ? fmtPct(st.alpha) : "not available") + " — tracked on FOLIO";
          }
          return base;
        });
      });
    }

    if (type === "star" || type === "dip") {
      return periodStats(d, range).then(function (st) {
        var okS = st.changes.filter(function (c) { return !c.noData; });
        if (!okS.length) {
          base.typeLabel = type === "star" ? "STAR PERFORMER" : "BIGGEST FALL";
          base.empty = "Price history is not available in free data for this window yet.";
          return base;
        }
        var pick = okS.reduce(function (a, b) { return (type === "star" ? b.pct > a.pct : b.pct < a.pct) ? b : a; });
        var rowS = pick.row;
        return stockSeries(rowS.sym, range).then(function (series) {
          var sAlpha = st.niftyRet !== null ? pick.pct - st.niftyRet : null;
          base.typeLabel = type === "star" ? "STAR PERFORMER" : "BIGGEST FALL";
          base.title = rowS.sym;
          base.subtitle = stockName(rowS.sym);
          base.heroPct = pick.pct;
          base.heroLabel = "in " + RANGE_LABEL[range].toLowerCase();
          if (type === "star") {
            base.badge = sAlpha !== null && sAlpha > 0;
            base.heroSub = pick.pct < 0 ? "All holdings fell — this one fell the least" : "Best performer in my portfolio this window";
          } else {
            base.heroSub = "Largest fall in this window";
          }
          base.chips = [
            { label: rowS.sym + " return", value: fmtPct(pick.pct), color: pick.pct >= 0 ? "gain" : "loss" },
            { label: "NIFTY 50", value: st.niftyRet !== null ? fmtPct(st.niftyRet) : "—", color: st.niftyRet === null ? "text" : (st.niftyRet >= 0 ? "gain" : "loss") },
            { label: "Alpha vs NIFTY", value: sAlpha !== null ? fmtPct(sAlpha) : "—", color: sAlpha === null ? "text" : (sAlpha >= 0 ? "gain" : "loss"), hot: type === "star" && sAlpha !== null && sAlpha > 0 }
          ];
          base.series = series; base.seriesLabel = rowS.sym + " · " + RANGE_LABEL[range].toLowerCase();
          base.listTitle = "MY POSITION";
          base.rows = [];
          if (!hideQty) base.rows.push({ left: "Quantity", right: String(rowS.qty) + " shares", color: "text" });
          if (!hideQty) base.rows.push({ left: "Average buy", right: fmtInr2(rowS.avg), color: "text" });
          if (!hideAmt) base.rows.push({ left: "Invested", right: fmtInr(rowS.invested), color: "text" });
          if (!hideAmt) base.rows.push({ left: "Current value", right: fmtInr(rowS.cur), color: "text" });
          base.rows.push({ left: "Overall P&L", right: fmtPct(rowS.pnlPct) + (hideAmt ? "" : "  ·  " + fmtInr(rowS.pnl)), color: rowS.pnlPct >= 0 ? "gain" : "loss" });
          base.shareText = type === "star"
            ? "My star performer (" + RANGE_LABEL[range] + "): " + rowS.sym + " " + fmtPct(pick.pct)
            : "Biggest fall in my portfolio (" + RANGE_LABEL[range] + "): " + rowS.sym + " " + fmtPct(pick.pct);
          return base;
        });
      });
    }

    if (type === "podium") {
      return periodStats(d, range).then(function (st) {
        var okP = st.changes.filter(function (c) { return !c.noData; }).slice().sort(function (a, b) { return b.pct - a.pct; });
        var top3 = okP.filter(function (c) { return c.pct > 0; }).slice(0, 3);
        base.typeLabel = "TOP 3 GAINERS";
        base.title = "Top 3 Gainers";
        if (!top3.length) {
          base.empty = okP.length ? "No holding gained in this window — the podium fills when one does." : "Price history is not available in free data for this window yet.";
          return base;
        }
        base.heroPct = st.totPct; base.heroLabel = "portfolio · " + RANGE_LABEL[range].toLowerCase();
        base.heroSub = "Ranked by return in the " + RANGE_LABEL[range].toLowerCase() + " window";
        base.custom = { kind: "podium", entries: top3.map(function (c) { return { sym: c.row.sym, pct: c.pct, change: hideAmt ? null : c.change }; }) };
        base.shareText = "My top gainers (" + RANGE_LABEL[range] + "): " + top3.map(function (c) { return c.row.sym + " " + fmtPct(c.pct); }).join(", ");
        return base;
      });
    }

    if (type === "donut") {
      var totalV = d.value || 1;
      var sortedDn = d.rows.slice().sort(function (a, b) { return b.cur - a.cur; });
      var segs = sortedDn.slice(0, 6).map(function (r, i) { return { label: r.sym, frac: r.cur / totalV, color: DONUT_COLORS[i % DONUT_COLORS.length] }; });
      if (sortedDn.length > 6) {
        var restV = sortedDn.slice(6).reduce(function (a, r) { return a + r.cur; }, 0);
        segs.push({ label: "Other", frac: restV / totalV, color: DONUT_COLORS[7] });
      }
      base.typeLabel = "ALLOCATION";
      base.title = "Where My Money Is";
      if (sortedDn.length) {
        base.heroText = (sortedDn[0].cur / totalV * 100).toFixed(1) + "%";
        base.heroLabel = "in " + sortedDn[0].sym + " · largest holding";
      }
      base.heroSub = "Share of portfolio value in each holding";
      base.custom = { kind: "donut", segments: segs, centerTop: String(d.rows.length), centerBottom: d.rows.length === 1 ? "stock" : "stocks" };
      base.shareText = "My portfolio allocation across " + d.rows.length + " stocks on FOLIO";
      return Promise.resolve(base);
    }

    if (type === "heatmapM") {
      base.typeLabel = "MONTHLY RETURNS";
      base.title = "Monthly Returns";
      return datedSeries(d, "5y").then(function (series) {
        if (!series) { base.empty = "Not enough price history yet — the monthly map builds as your history grows."; return base; }
        var mm = monthlyFromSeries(series);
        var retKeys = Object.keys(mm.rets);
        if (retKeys.length < 2) { base.empty = "Not enough price history yet — the monthly map needs at least two months of returns."; return base; }
        var yList = Array.from(new Set(retKeys.map(function (k) { return k.slice(0, 4); }))).sort().reverse().slice(0, 4);
        var years = yList.map(function (y) {
          var cells = [], ytd = 1, has = false;
          for (var m = 1; m <= 12; m++) {
            var k = y + "-" + String(m).padStart(2, "0");
            var v = (k in mm.rets) ? mm.rets[k] : null;
            cells.push(v);
            if (v !== null) { ytd *= (1 + v / 100); has = true; }
          }
          return { year: y, cells: cells, ytd: has ? (ytd - 1) * 100 : null };
        });
        base.heroSub = "At today's quantities — same basis as Insights";
        base.custom = { kind: "monthGrid", years: years };
        var latestKey = retKeys[retKeys.length - 1];
        base.heroPct = mm.rets[latestKey];
        base.heroLabel = "latest month · " + MONTH_SHORT[Number(latestKey.slice(5, 7)) - 1] + " " + latestKey.slice(0, 4);
        base.shareText = "My monthly returns map on FOLIO — latest month " + fmtPct(mm.rets[latestKey]);
        return base;
      });
    }

    if (type === "dividend") {
      base.typeLabel = "DIVIDEND INCOME";
      base.title = "Dividend Income";
      var txD = gAppTxns();
      var divs = txD ? txD.filter(function (t) { return t.type === "DIV"; }) : [];
      var allTime = txD ? divs.reduce(function (a, t) { return a + divAmount(t); }, 0) : (d.divTotal || 0);
      if (!allTime && !divs.length) { base.empty = "No dividends recorded yet — when a holding pays you, it will appear here."; return Promise.resolve(base); }
      var cut12 = Date.now() - 365 * 86400000;
      var last12 = 0, pay12 = 0, perSym = {};
      divs.forEach(function (t) {
        var amt = divAmount(t);
        perSym[t.sym] = (perSym[t.sym] || 0) + amt;
        var ms = txnTime(t);
        if (ms !== null && ms >= cut12) { last12 += amt; pay12++; }
      });
      var yoc = d.invested ? last12 / d.invested * 100 : null;
      base.heroPct = txD ? yoc : null;
      base.heroLabel = "yield on cost · last 12 months";
      base.heroSub = txD ? "From the dividends recorded in Folio" : "All-time total from your Folio records";
      if (txD) {
        base.chips = [
          { label: "Last 12 months", value: hideAmt ? pay12 + (pay12 === 1 ? " payment" : " payments") : fmtInr(last12), color: "text" },
          { label: "All time", value: hideAmt ? Object.keys(perSym).length + (Object.keys(perSym).length === 1 ? " stock paid" : " stocks paid") : fmtInr(allTime), color: "text" },
          { label: "Yield on value (12M)", value: d.value && last12 ? fmtPct(last12 / d.value * 100) : "—", color: "text" }
        ];
        base.listTitle = "TOP DIVIDEND PAYERS";
        base.rows = Object.keys(perSym).sort(function (a, b) { return perSym[b] - perSym[a]; }).slice(0, 5).map(function (s) {
          var share = allTime ? perSym[s] / allTime * 100 : 0;
          return hideAmt
            ? { left: s, sub: "", right: fmtPct(share), color: "text" }
            : { left: s, sub: share.toFixed(1) + "% of all dividends", right: fmtInr(perSym[s]), color: "text" };
        });
      } else {
        base.chips = [
          { label: "All time", value: hideAmt ? "—" : fmtInr(allTime), color: "text" },
          { label: "Last 12 months", value: "—", color: "text" },
          { label: "Yield on cost (12M)", value: "—", color: "text" }
        ];
      }
      base.shareText = "My dividend income on FOLIO" + (txD && yoc !== null ? " — yield on cost " + fmtPct(yoc) + " in the last 12 months" : "");
      return Promise.resolve(base);
    }

    if (type === "scorecard") {
      base.typeLabel = "RISK & QUALITY";
      base.title = "Portfolio Report Card";
      return gAnalytics().then(function (ana) {
        var res = ana && ana.result;
        if (!res || !res.reportCard) {
          base.empty = "Open the Insights tab once so Folio can compute your grades — then this card is ready to share.";
          return base;
        }
        var order = [["Returns", "Returns"], ["RiskControl", "Risk Control"], ["Diversification", "Diversification"], ["Consistency", "Consistency"], ["Momentum", "Momentum"]];
        var items = order.map(function (o) {
          var g = res.reportCard[o[0]];
          if (!g) return { label: o[1], grade: null, score: null, reason: "Not available in free data" };
          return { label: o[1], grade: g.grade || null, score: (g.score === null || g.score === undefined) ? null : Math.round(g.score), reason: g.reason || "" };
        });
        var scores = items.filter(function (i) { return i.score !== null; }).map(function (i) { return i.score; });
        if (scores.length >= 3) {
          base.heroText = String(Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length)) + " / 100";
          base.heroLabel = "average grade score";
        } else if (scores.length) {
          base.heroText = String(Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length)) + " / 100";
          base.heroLabel = "average of the grades available";
        }
        base.heroSub = "Benchmark: " + (ana.benchName || "NIFTY 50") + " · Same grades as Insights";
        base.custom = { kind: "grades", items: items };
        base.shareText = "My Folio report card: " + items.filter(function (i) { return i.grade; }).map(function (i) { return i.label + " " + i.grade; }).join(" · ");
        return base;
      });
    }

    if (type === "heatToday") {
      base.typeLabel = "TODAY'S HEATMAP";
      base.title = "Today's Heatmap";
      var tiles = d.rows.filter(function (r) { return r.cur > 0; }).map(function (r) {
        return { sym: r.sym, w: d.value ? r.cur / d.value : 0, pct: (r.prevClose && r.ltp !== null) ? (r.ltp - r.prevClose) / r.prevClose * 100 : null };
      });
      if (!tiles.length || tiles.every(function (t) { return t.pct === null; })) {
        base.empty = "Today's moves are not available in free data right now.";
        return Promise.resolve(base);
      }
      var totStartT = d.rows.reduce(function (a, r) { return a + Math.max(1, r.cur - (r.day || 0)); }, 0);
      base.heroPct = totStartT ? d.dayPnl / totStartT * 100 : 0;
      base.heroLabel = "portfolio today";
      base.heroSub = "Tile size = share of portfolio · Colour = today's move";
      base.custom = { kind: "tiles", tiles: tiles };
      base.shareText = "My portfolio today: " + fmtPct(base.heroPct) + " — today's heatmap on FOLIO";
      return Promise.resolve(base);
    }

    if (type === "winrate") {
      base.typeLabel = "WIN RATE & PROFIT FACTOR";
      base.title = "Trading Scorecard";
      var sales = gFifo();
      if (!sales) { base.empty = "Trade history is not available in free data right now."; return Promise.resolve(base); }
      var closed = sales.filter(function (s) { return s.gain !== null && s.gain !== undefined && s.buyVal; });
      if (!closed.length) { base.empty = "No closed trades yet — sell a holding and your win rate will appear here."; return Promise.resolve(base); }
      var wins = closed.filter(function (s) { return s.gain > 0; });
      var losses = closed.filter(function (s) { return s.gain < 0; });
      var gw = wins.reduce(function (a, s) { return a + s.gain; }, 0);
      var gl = Math.abs(losses.reduce(function (a, s) { return a + s.gain; }, 0));
      var pf = gl > 0 ? gw / gl : null;
      var winRate = wins.length / closed.length * 100;
      base.heroPct = winRate; base.heroLabel = "win rate on closed trades";
      base.heroSub = closed.length + (closed.length === 1 ? " closed trade" : " closed trades") + ", matched buy-by-buy (FIFO)";
      base.chips = [
        { label: "Profit factor", value: pf !== null ? pf.toFixed(2) : (gw > 0 ? "No losses yet" : "—"), color: "text" },
        { label: "Wins", value: String(wins.length), color: "gain" },
        { label: "Losses", value: String(losses.length), color: "loss" }
      ];
      base.listTitle = "BEST CLOSED TRADES (BY RETURN)";
      base.rows = closed.slice().sort(function (a, b) { return (b.gain / b.buyVal) - (a.gain / a.buyVal); }).slice(0, 3).map(function (s) {
        var rpct = s.gain / s.buyVal * 100;
        return { left: s.sym, sub: fmtDay(s.buyDate) + " → " + fmtDay(s.sellDate), right: fmtPct(rpct) + (hideAmt ? "" : "  ·  " + fmtInr(s.gain)), color: rpct >= 0 ? "gain" : "loss" };
      });
      base.shareText = "My win rate on closed trades is " + winRate.toFixed(0) + "%" + (pf !== null ? " with a profit factor of " + pf.toFixed(2) : "") + " — tracked on FOLIO";
      return Promise.resolve(base);
    }

    if (type === "milestones") {
      base.typeLabel = "MILESTONES & STREAKS";
      base.title = "Milestones & Streaks";
      var txM = gAppTxns();
      if (!txM || !txM.length) { base.empty = "Milestones appear once your first transaction is recorded."; return Promise.resolve(base); }
      return gAnalytics().then(function (ana) {
        var sortedM = txM.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        var firstMs = txnTime(sortedM[0]);
        var daysM = firstMs !== null ? Math.max(0, Math.floor((Date.now() - firstMs) / 86400000)) : 0;
        var buysM = sortedM.filter(function (t) { return t.type === "BUY"; });
        var sellsM = sortedM.filter(function (t) { return t.type === "SELL"; });
        var symsEver = Array.from(new Set(buysM.map(function (t) { return t.sym; })));
        var items = [];
        var DAY_STEPS = [30, 100, 200, 365, 500, 730, 1000, 1500, 2000];
        var dayHit = null, dayNext = null;
        DAY_STEPS.forEach(function (s) { if (daysM >= s) dayHit = s; else if (dayNext === null) dayNext = s; });
        if (dayHit) items.push({ head: dayHit + " days of tracking", sub: "Started " + fmtDay(sortedM[0].date) + " · " + daysM + " days so far" });
        var STOCK_STEPS = [1, 5, 10, 15, 20, 25, 50];
        var stockHit = null, stockNext = null;
        STOCK_STEPS.forEach(function (s) { if (symsEver.length >= s) stockHit = s; else if (stockNext === null) stockNext = s; });
        if (stockHit === 1 && buysM.length) items.push({ head: "First stock bought", sub: buysM[0].sym + " · " + fmtDay(buysM[0].date) });
        else if (stockHit) items.push({ head: stockHit + " different stocks bought", sub: symsEver.length + " stocks tried so far" });
        var firstDiv = sortedM.filter(function (t) { return t.type === "DIV"; })[0];
        if (firstDiv) items.push({ head: "First dividend received", sub: firstDiv.sym + " · " + fmtDay(firstDiv.date) });
        var tradeCount = buysM.length + sellsM.length;
        var TRADE_STEPS = [10, 25, 50, 100, 250];
        var tradeHit = null, tradeNext = null;
        TRADE_STEPS.forEach(function (s) { if (tradeCount >= s) tradeHit = s; else if (tradeNext === null) tradeNext = s; });
        if (tradeHit) items.push({ head: tradeHit + " trades recorded", sub: buysM.length + " buys · " + sellsM.length + " sells" });
        var pm = ana && ana.result && ana.result.returns ? ana.result.returns.positiveMonths : null;
        if (pm && pm.curStreak >= 3) items.push({ head: pm.curStreak + "-day green streak", sub: "Current streak · " + (pm.greenDays || 0) + " green days in the last year" });
        else if (pm && pm.bestStreak >= 5) items.push({ head: "Best streak: " + pm.bestStreak + " green days", sub: "Longest run of up days in the last year" });
        /* The nearest upcoming milestone — shown on its own when
           nothing has been achieved yet (never faked as achieved). */
        var nextOne = null;
        if (dayNext) nextOne = { head: dayNext + " days of tracking", sub: (dayNext - daysM) + " days away" };
        else if (stockNext) nextOne = { head: stockNext + " different stocks bought", sub: (stockNext - symsEver.length) + " more to go" };
        else if (tradeNext) nextOne = { head: tradeNext + " trades recorded", sub: (tradeNext - tradeCount) + " more to go" };
        else if (!firstDiv) nextOne = { head: "First dividend received", sub: "When a holding pays out" };
        if (daysM >= 1) { base.heroText = daysM + (daysM === 1 ? " day" : " days"); base.heroLabel = "of tracking so far"; }
        if (!items.length && !nextOne) { base.empty = "Your first milestone is on its way — it appears here as you invest."; return base; }
        base.custom = { kind: "checks", items: items.slice(0, 5), onlyNext: items.length ? null : nextOne };
        base.shareText = "Milestone on FOLIO: " + (items.length ? items[0].head : "Next up — " + nextOne.head);
        return base;
      });
    }

    if (type === "journey") {
      base.typeLabel = "INVESTING JOURNEY";
      base.title = "My Investing Journey";
      var txJ = gAppTxns();
      if (!txJ || !txJ.length) { base.empty = "Your journey starts with your first transaction."; return Promise.resolve(base); }
      var sortedJ = txJ.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var firstBuy = sortedJ.filter(function (t) { return t.type === "BUY"; })[0] || sortedJ[0];
      var startMsJ = txnTime(firstBuy);
      var daysJ = startMsJ !== null ? Math.max(0, Math.floor((Date.now() - startMsJ) / 86400000)) : 0;
      var buysJ = txJ.filter(function (t) { return t.type === "BUY"; }).length;
      var sellsJ = txJ.filter(function (t) { return t.type === "SELL"; }).length;
      var divsJ = txJ.filter(function (t) { return t.type === "DIV"; }).length;
      var everJ = new Set(txJ.filter(function (t) { return t.type === "BUY"; }).map(function (t) { return t.sym; })).size;
      var xJ = gXirr(d);
      var retJ = d.invested ? d.totalPnl / d.invested * 100 : 0;
      base.heroPct = retJ; base.heroLabel = "overall return";
      base.heroSub = "Investing since " + fmtDay(firstBuy.date);
      base.chips = [
        { label: "XIRR (per year)", value: xJ !== null && isFinite(xJ) ? fmtPct(xJ * 100) : "—", color: xJ !== null && isFinite(xJ) ? (xJ >= 0 ? "gain" : "loss") : "text" },
        { label: "Days invested", value: String(daysJ), color: "text" },
        { label: "Buys · Sells", value: buysJ + " · " + sellsJ, color: "text" }
      ];
      base.listTitle = "THE JOURNEY SO FAR";
      base.rows = [
        { left: "Started", right: fmtDay(firstBuy.date), color: "text" },
        { left: "Stocks held now", right: String(d.rows.length), color: "text" },
        { left: "Stocks ever bought", right: String(everJ), color: "text" },
        { left: "Dividends received", right: String(divsJ) + (hideAmt ? "" : "  ·  " + fmtInr(d.divTotal || 0)), color: "text" }
      ];
      base.shareText = "My investing journey on FOLIO: " + daysJ + " days, " + everJ + " stocks tried, overall return " + fmtPct(retJ);
      return Promise.resolve(base);
    }

    if (type === "mood") {
      base.typeLabel = "MARKET MOOD · NIFTY 50";
      base.title = "Market Mood";
      return gFetchHistory("^NSEI", "1y").then(function (h) {
        if (!h || !h.points || h.points.length < 50) { base.empty = "NIFTY 50 history is not available in free data right now."; return base; }
        var closes = h.points.map(function (p) { return p.c; });
        var lastC = closes[closes.length - 1];
        function ma(n) { if (closes.length < n) return null; var s = 0; for (var i = closes.length - n; i < closes.length; i++) s += closes[i]; return s / n; }
        var ma50 = ma(50), ma200 = ma(200);
        var vs50 = ma50 ? (lastC / ma50 - 1) * 100 : null;
        var vs200 = ma200 ? (lastC / ma200 - 1) * 100 : null;
        var ret1m = closes.length > 21 ? (lastC / closes[closes.length - 22] - 1) * 100 : null;
        function clampS(v) { return Math.max(0, Math.min(100, v)); }
        var s50 = vs50 !== null ? clampS(50 + vs50 * 10) : 50;
        var sMom = ret1m !== null ? clampS(50 + ret1m * 8) : 50;
        var score = vs200 !== null
          ? Math.round(clampS(0.4 * s50 + 0.35 * clampS(50 + vs200 * 6) + 0.25 * sMom))
          : Math.round(clampS(0.55 * s50 + 0.45 * sMom));
        var word = score >= 65 ? "Positive" : score >= 55 ? "Mildly positive" : score >= 45 ? "Neutral" : score >= 35 ? "Cautious" : "Weak";
        base.heroText = word;
        base.heroLabel = "market mood · score " + score + " / 100";
        base.heroSub = "Folio's own reading of NIFTY 50 — not an official index";
        base.chips = [
          { label: "NIFTY vs 50-day avg", value: vs50 !== null ? fmtPct(vs50) : "—", color: vs50 === null ? "text" : (vs50 >= 0 ? "gain" : "loss") },
          { label: "NIFTY vs 200-day avg", value: vs200 !== null ? fmtPct(vs200) : "—", color: vs200 === null ? "text" : (vs200 >= 0 ? "gain" : "loss") },
          { label: "NIFTY · 1 month", value: ret1m !== null ? fmtPct(ret1m) : "—", color: ret1m === null ? "text" : (ret1m >= 0 ? "gain" : "loss") }
        ];
        base.custom = { kind: "gauge", score: score, word: word };
        base.shareText = "Market mood (NIFTY 50): " + word + " — " + score + "/100 on FOLIO's own reading";
        return base;
      });
    }

    if (type === "wrapped") {
      var period = state.wrappedPeriod === "year" ? "year" : "month";
      var nowD = new Date();
      var startD = period === "month" ? new Date(nowD.getFullYear(), nowD.getMonth(), 1) : new Date(nowD.getFullYear(), 0, 1);
      var startTs = startD.getTime();
      var periodName = period === "month" ? MONTH_SHORT[nowD.getMonth()] + " " + nowD.getFullYear() : String(nowD.getFullYear());
      var tagW = (period === "month" ? MONTH_SHORT[nowD.getMonth()].toUpperCase() + " " + nowD.getFullYear() : String(nowD.getFullYear())) + " WRAPPED";
      var daysBack = Math.max(1, Math.round((nowD.getTime() - startTs) / 86400000));
      return Promise.all([datedSeries(d, "5y"), niftyFor(daysBack), gAnalytics()]).then(function (wr) {
        var seriesW = wr[0], nRetW = wr[1], anaW = wr[2];
        var txW = gAppTxns() || [];
        /* Period return on the month-end chaining basis (today's
           quantities), the same method as renderMonthly(): the value
           just before the period starts against the latest value. */
        var pRet = null, pDays = 0, startVW = null, endVW = null, sliceW = null;
        if (seriesW && seriesW.length >= 2) {
          var beforeW = null, inPW = [];
          seriesW.forEach(function (x) { if (x.t < startTs) beforeW = x; else inPW.push(x); });
          pDays = inPW.length;
          if (inPW.length) {
            startVW = beforeW ? beforeW.v : inPW[0].v;
            endVW = inPW[inPW.length - 1].v;
            if (startVW > 0) pRet = (endVW / startVW - 1) * 100;
            sliceW = (beforeW ? [beforeW] : []).concat(inPW).map(function (x) { return x.v; });
          }
        }
        var alphaW = (pRet !== null && nRetW !== null) ? pRet - nRetW : null;
        function mkW(idx, extra) {
          var m = { typeLabel: tagW + " · " + idx + " / 5", social: socialFooter(), date: state.showDate ? dateLine() : "" };
          Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
          return m;
        }
        /* Card 4 — activity in the period, straight from transactions */
        var buysP = txW.filter(function (t) { return t.type === "BUY" && (txnTime(t) || 0) >= startTs; });
        var sellsP = txW.filter(function (t) { return t.type === "SELL" && (txnTime(t) || 0) >= startTs; });
        var divsP = txW.filter(function (t) { return t.type === "DIV" && (txnTime(t) || 0) >= startTs; });
        var divTotP = divsP.reduce(function (a, t) { return a + divAmount(t); }, 0);
        var firstBuyEver = {};
        txW.filter(function (t) { return t.type === "BUY"; }).forEach(function (t) { var ms = txnTime(t); if (ms !== null && (firstBuyEver[t.sym] === undefined || ms < firstBuyEver[t.sym])) firstBuyEver[t.sym] = ms; });
        var newSyms = Object.keys(firstBuyEver).filter(function (s) { return firstBuyEver[s] >= startTs; });
        var quietW = !buysP.length && !sellsP.length && !divsP.length;
        var card4 = mkW(4, {
          title: "Money Moves",
          heroText: quietW ? "A quiet " + (period === "month" ? "month" : "year") : (buysP.length + sellsP.length) + (buysP.length + sellsP.length === 1 ? " move" : " moves"),
          heroLabel: "buys & sells this " + (period === "month" ? "month" : "year"),
          listTitle: "ACTIVITY",
          rows: quietW
            ? [{ left: "No buys, sells or dividends recorded", right: "", color: "text" }]
            : [
              { left: "Dividends received", sub: divsP.length + (divsP.length === 1 ? " payment" : " payments"), right: hideAmt ? "" : fmtInr(divTotP), color: "text" },
              { left: "Buys", right: String(buysP.length), color: "text" },
              { left: "Sells", right: String(sellsP.length), color: "text" },
              { left: "New stocks added", sub: newSyms.slice(0, 3).join(", "), right: String(newSyms.length), color: "text" }
            ],
          shareText: "My " + periodName + " activity on FOLIO (Wrapped 4 of 5)"
        });
        /* Card 5 — risk snapshot when the analytics engine has run,
           journey facts otherwise */
        var resW = anaW && anaW.result;
        var card5;
        if (resW && resW.risk) {
          var KW = resW.risk;
          card5 = mkW(5, {
            title: "Risk Snapshot",
            heroText: KW.maxDD ? "-" + KW.maxDD.pct.toFixed(1) + "%" : ((KW.vol !== null && KW.vol !== undefined) ? (KW.vol * 100).toFixed(1) + "%" : undefined),
            heroLabel: KW.maxDD ? "max drawdown · last 12 months" : "volatility · per year",
            heroSub: "From the same analytics as the Insights tab",
            listTitle: "LAST 12 MONTHS",
            rows: [
              { left: "Volatility (per year)", right: (KW.vol !== null && KW.vol !== undefined) ? (KW.vol * 100).toFixed(1) + "%" : "Not available in free data", color: "text" },
              { left: "Max drawdown", right: KW.maxDD ? "-" + KW.maxDD.pct.toFixed(1) + "%" : "Not available in free data", color: "text" },
              { left: "Sharpe ratio", right: (KW.sharpe !== null && KW.sharpe !== undefined) ? KW.sharpe.toFixed(2) : "Not available in free data", color: "text" },
              { left: "Beta vs " + (anaW.benchName || "NIFTY 50"), right: (KW.beta !== null && KW.beta !== undefined) ? KW.beta.toFixed(2) : "Not available in free data", color: "text" }
            ],
            shareText: "My risk snapshot on FOLIO (Wrapped 5 of 5)"
          });
        } else {
          var sortedW = txW.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          var firstW = sortedW.filter(function (t) { return t.type === "BUY"; })[0] || sortedW[0];
          var daysW = firstW ? Math.max(0, Math.floor((Date.now() - (txnTime(firstW) || Date.now())) / 86400000)) : 0;
          card5 = mkW(5, {
            title: "The Journey So Far",
            heroText: daysW + (daysW === 1 ? " day" : " days"),
            heroLabel: "of tracking",
            heroSub: firstW ? "Investing since " + fmtDay(firstW.date) : "",
            listTitle: "ALL TIME",
            rows: [
              { left: "Days of tracking", right: String(daysW), color: "text" },
              { left: "Stocks held now", right: String(d.rows.length), color: "text" },
              { left: "Buys recorded", right: String(txW.filter(function (t) { return t.type === "BUY"; }).length), color: "text" },
              { left: "Dividends received", right: String(txW.filter(function (t) { return t.type === "DIV"; }).length), color: "text" }
            ],
            shareText: "My investing journey on FOLIO (Wrapped 5 of 5)"
          });
        }
        var cardsW = [
          mkW(1, {
            title: period === "month" ? MONTH_SHORT[nowD.getMonth()] + " Wrapped" : nowD.getFullYear() + " Wrapped",
            heroPct: pRet, heroLabel: period === "month" ? "this month" : "this year",
            heroSub: pRet === null ? "Not enough price history in free data for this period yet"
              : (pDays < 10 ? "Only " + pDays + " days of price history this period — figures cover those days" : "Your portfolio's " + (period === "month" ? "month" : "year") + " at a glance"),
            chips: [
              { label: "My Portfolio", value: pRet !== null ? fmtPct(pRet) : "—", color: pRet === null ? "text" : (pRet >= 0 ? "gain" : "loss") },
              { label: "NIFTY 50", value: nRetW !== null ? fmtPct(nRetW) : "—", color: nRetW === null ? "text" : (nRetW >= 0 ? "gain" : "loss") },
              { label: "Alpha vs NIFTY", value: alphaW !== null ? fmtPct(alphaW) : "—", color: alphaW === null ? "text" : (alphaW >= 0 ? "gain" : "loss"), hot: alphaW !== null && alphaW > 0 }
            ],
            series: sliceW && sliceW.length >= 2 ? sliceW : null, seriesLabel: "Portfolio value · " + periodName,
            shareText: "My " + periodName + " on FOLIO" + (pRet !== null ? ": " + fmtPct(pRet) : "") + " (Wrapped 1 of 5)"
          }),
          null, null, card4, card5
        ];
        /* Cards 2 and 3 need per-stock period returns */
        return Promise.all(d.rows.map(function (r) { return stockReturnWindow(r.sym, startTs); })).then(function (retsW) {
          var bestI = -1, bestVW = null, worstVW = null;
          retsW.forEach(function (v, i) { if (v === null) return; if (bestVW === null || v > bestVW) { bestVW = v; bestI = i; } if (worstVW === null || v < worstVW) worstVW = v; });
          if (bestI >= 0) {
            var brW = d.rows[bestI];
            cardsW[1] = mkW(2, {
              title: brW.sym, subtitle: stockName(brW.sym),
              heroPct: bestVW, heroLabel: "star of the " + (period === "month" ? "month" : "year"),
              heroSub: "Best performer in your portfolio this " + (period === "month" ? "month" : "year"),
              chips: [
                { label: brW.sym + " return", value: fmtPct(bestVW), color: bestVW >= 0 ? "gain" : "loss" },
                { label: "Weakest performer", value: worstVW !== null ? fmtPct(worstVW) : "—", color: worstVW === null ? "text" : (worstVW >= 0 ? "gain" : "loss") },
                { label: "Share of portfolio", value: (d.value ? (brW.cur / d.value * 100).toFixed(1) : "0") + "%", color: "text" }
              ],
              shareText: "My star of " + periodName + ": " + brW.sym + " " + fmtPct(bestVW) + " (Wrapped 2 of 5)"
            });
          } else {
            cardsW[1] = mkW(2, { title: "Star Performer", empty: "Per-stock price history is not available in free data for this period.", shareText: "My " + periodName + " Wrapped on FOLIO (2 of 5)" });
          }
          cardsW[2] = mkW(3, {
            title: "Portfolio Growth",
            heroPct: pRet, heroLabel: period === "month" ? "this month" : "this year",
            heroSub: hideAmt ? "Percentages only — no amounts shown" : (startVW !== null ? "From " + fmtInr(startVW) + " to " + fmtInr(endVW) : ""),
            series: sliceW && sliceW.length >= 2 ? sliceW : null, seriesLabel: "Portfolio value · " + periodName,
            shareText: "My portfolio growth in " + periodName + " (Wrapped 3 of 5)"
          });
          state.wrappedSet = cardsW;
          if (state.wrappedIdx >= cardsW.length) state.wrappedIdx = 0;
          return cardsW[state.wrappedIdx];
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

  /* "Suggested for you" — deterministic rules over real state, in
     this order, at most 4 chips:
       (a) a holding moved |day %| >= 5 -> Star performer (up move)
           or Biggest fall (down move) for today; if both exist, the
           larger absolute move wins;
       (b) today is in the first 3 or last 3 days of the month ->
           Monthly Wrapped;
       (c) a dividend arrived in the last 90 days -> Dividend income;
       (d) the analytics hook yields report-card grades -> Risk &
           quality grades (checked against the shared analytics
           promise raced with a short timeout, so the row never
           blocks the sheet; if grades are not ready in time the row
           simply renders without (d));
       (e) if nothing above applied -> Portfolio growth (1Y) and
           Alpha vs NIFTY (1Y). */
  function buildSuggestions() {
    if (!dom || !state) return;
    var d = gEnriched();
    var rows = d && d.rows ? d.rows : [];
    var sugg = [];
    var best = null, worst = null;
    rows.forEach(function (r) {
      if (!r.prevClose || r.ltp === null) return;
      var p = (r.ltp - r.prevClose) / r.prevClose * 100;
      if (Math.abs(p) >= 5) {
        if (p > 0 && (!best || p > best.p)) best = { p: p };
        if (p < 0 && (!worst || p < worst.p)) worst = { p: p };
      }
    });
    if (best && (!worst || best.p >= Math.abs(worst.p))) sugg.push({ type: "star", range: "1D", label: "Star performer · Today" });
    else if (worst) sugg.push({ type: "dip", range: "1D", label: "Biggest fall · Today" });
    var nowD = new Date();
    var lastDay = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
    if (nowD.getDate() <= 3 || nowD.getDate() > lastDay - 3) sugg.push({ type: "wrapped", period: "month", label: "Monthly Wrapped" });
    var txS = gAppTxns();
    if (txS && txS.some(function (t) { var ms = txnTime(t); return t.type === "DIV" && ms !== null && ms >= Date.now() - 90 * 86400000; })) {
      sugg.push({ type: "dividend", label: "Dividend income" });
    }
    function finish(withGrades) {
      if (withGrades) sugg.push({ type: "scorecard", label: "Risk & quality grades" });
      if (!sugg.length) {
        sugg.push({ type: "growth", range: "1Y", label: "Portfolio growth · 1Y" });
        sugg.push({ type: "alpha", range: "1Y", label: "Alpha vs NIFTY · 1Y" });
      }
      renderSuggestions(sugg.slice(0, 4));
    }
    var settled = false;
    var timer = setTimeout(function () { if (!settled) { settled = true; finish(false); } }, 1200);
    gAnalytics().then(function (ana) {
      if (settled) return; settled = true; clearTimeout(timer);
      finish(!!(ana && ana.result && ana.result.reportCard));
    }).catch(function () { if (!settled) { settled = true; clearTimeout(timer); finish(false); } });
  }
  function renderSuggestions(sugg) {
    if (!dom || !state || !state.open) return;
    dom.suggest.innerHTML = "";
    sugg.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = s.label;
      b.setAttribute("aria-label", "Suggested card: " + s.label);
      b.addEventListener("click", function () {
        state.type = s.type;
        if (s.range && RANGES.indexOf(s.range) >= 0) state.range = s.range;
        if (s.period) state.wrappedPeriod = s.period;
        state.wrappedIdx = 0;
        syncControls();
        queueRender(true);
      });
      dom.suggest.appendChild(b);
    });
  }

  /* v112: control changes are debounced (~120 ms) so stepping
     through options does not trigger a render per click; the first
     paint on open still goes through scheduleRender() directly. */
  var renderDebounce = null;
  function queueRender(needsData) {
    if (renderDebounce) clearTimeout(renderDebounce);
    renderDebounce = setTimeout(function () { renderDebounce = null; scheduleRender(needsData); }, 120);
  }
  function dataKey() {
    return [state.type, state.range, state.symbol, state.type === "wrapped" ? state.wrappedPeriod : ""].join("|")
      + "|" + state.hideAmounts + "|" + state.hideQty + "|" + state.showDate
      + "|" + (state.smNames ? 1 : 0)
      + "|" + (state.smCtx && state.smCtx.houseId ? state.smCtx.houseId : "")
      + "|" + (state.smCtx && state.smCtx.deal ? state.smCtx.deal.sym + "@" + state.smCtx.deal.date : "");
  }

  function scheduleRender(needsData) {
    if (!state || !state.open) return;
    var token = ++renderToken;
    var size = SIZES[state.size];
    dom.canvas.width = size.w; dom.canvas.height = size.h;
    if (!needsData && state.model && state.modelKey === dataKey()) {
      paint(state.model); return;
    }
    dom.loading.hidden = false;
    Promise.all([ensureLogos(), (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()]).then(function () {
      return buildModel();
    }).then(function (model) {
      if (token !== renderToken || !state.open) return;
      state.model = model;
      state.modelKey = dataKey();
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
    try { drawCard(dom.canvas.getContext("2d"), size.w, size.h, model, effStyle(st), false); } catch (e) {}
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
    if (kind === "gain") return st.gain || PAL.gain;
    if (kind === "loss") return st.loss || PAL.loss;
    if (kind === "gold") return st.accent;
    return st.text;
  }
  function drawSpark(g, vals, x, y, w, h, st) {
    if (!vals || vals.length < 2) return false;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = (max - min) || 1;
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? (st.gain || PAL.gain) : (st.loss || PAL.loss);
    var px = function (i) { return x + i * w / (vals.length - 1); };
    var py = function (v) { return y + h - (v - min) / rng * h; };
    g.beginPath();
    vals.forEach(function (v, i) { if (i === 0) g.moveTo(px(i), py(v)); else g.lineTo(px(i), py(v)); });
    g.strokeStyle = col; g.lineWidth = Math.max(2, w * 0.004); g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
    g.lineTo(px(vals.length - 1), y + h); g.lineTo(px(0), y + h); g.closePath();
    var grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, hexA(col, 0.30));
    grad.addColorStop(1, hexA(col, 0));
    g.fillStyle = grad; g.fill();
    g.beginPath(); g.arc(px(vals.length - 1), py(vals[vals.length - 1]), Math.max(3, w * 0.006), 0, Math.PI * 2);
    g.fillStyle = col; g.fill();
    return true;
  }
  function drawBadge(g, cx, cy, r, st) {
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = st.themed ? st.accent : PAL.gold; g.fill();
    g.lineWidth = r * 0.09; g.strokeStyle = st.themed ? (st.accentSoft || st.accent) : PAL.goldSoft; g.stroke();
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
    var contentBottom = gridTop - 18 * fs - 30 * fs; /* content must end above this y */
    /* Smart Money source line (additive: only SM models set
       sourceLine, so every pre-existing card's layout is unchanged) */
    if (model.sourceLine) {
      g.font = "500 " + Math.round(21 * fs) + "px " + f;
      g.fillText(truncTo(g, model.sourceLine, W - pad * 2), W / 2, contentBottom - 4 * fs);
      contentBottom -= 34 * fs;
    }
    return contentBottom;
  }

  /* ================================================================
     v112 CUSTOM PAINTERS — one per `custom.kind`. Each receives the
     content box (x, y, w, h) left after the standard header / title /
     hero / chips / series sections, the effective style and the font
     scale. All are defensive: they clamp to the box and shrink text
     rather than overflow, and drawCustom is called inside try/catch.
     ================================================================ */
  function truncTo(g, s, maxW) {
    s = String(s === null || s === undefined ? "" : s);
    if (g.measureText(s).width <= maxW) return s;
    while (s.length > 3 && g.measureText(s).width > maxW) s = s.slice(0, -2);
    return s.trim() + "…";
  }
  function gradeColor(gr, st) {
    if (gr === "A") return st.gain || PAL.gain;
    if (gr === "B") return "#7fb069";
    if (gr === "C") return "#d9a441";
    if (gr === "D") return st.loss || PAL.loss;
    return st.muted;
  }
  function drawCustom(g, cu, x, y, w, h, st, fs, thumb) {
    if (cu.kind === "donut") return drawDonut(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "monthGrid") return drawMonthGrid(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "tiles") return drawTiles(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "gauge") return drawGauge(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "grades") return drawGrades(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "podium") return drawPodium(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "checks") return drawChecks(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "smOwnBar") return drawSmOwnBar(g, cu, x, y, w, h, st, fs);
    if (cu.kind === "smBars") return drawSmBars(g, cu, x, y, w, h, st, fs);
  }

  /* Smart Money: MF ownership bar + the top-3 holder rows beneath it
     (a custom block owns the whole content area in drawCard, so the
     holders ride inside this painter). */
  function drawSmOwnBar(g, cu, x, y, w, h, st, fs) {
    var pct = Math.max(0, Math.min(100, cu.pct || 0));
    var barH = 54 * fs;
    rr(g, x, y, w, barH, barH / 2);
    g.fillStyle = st.panel; g.fill();
    g.strokeStyle = st.stroke; g.lineWidth = 1.2 * fs; g.stroke();
    if (pct > 0) {
      g.save();
      rr(g, x, y, w, barH, barH / 2); g.clip();
      g.fillStyle = st.accent;
      g.fillRect(x, y, w * pct / 100, barH);
      g.restore();
    }
    g.textAlign = "left"; g.fillStyle = st.text;
    g.font = "700 " + Math.round(24 * fs) + "px " + BODY_FONT;
    g.fillText("Mutual funds " + pct.toFixed(1) + "%", x, y + barH + 38 * fs);
    g.textAlign = "right"; g.fillStyle = st.muted;
    g.fillText("Others " + (100 - pct).toFixed(1) + "%", x + w, y + barH + 38 * fs);
    g.textAlign = "left";
    var holders = cu.holders || [];
    if (holders.length) {
      var ly = y + barH + 84 * fs;
      g.fillStyle = st.muted; g.font = "700 " + Math.round(21 * fs) + "px " + BODY_FONT;
      g.fillText("TOP FUND HOLDERS", x, ly);
      holders.forEach(function (hd, i) {
        var yy = ly + 46 * fs + i * 58 * fs;
        if (yy > y + h) return;
        g.fillStyle = st.text; g.font = "700 " + Math.round(26 * fs) + "px " + BODY_FONT;
        g.fillText(truncTo(g, hd.name, w * 0.5), x, yy);
        g.fillStyle = st.muted; g.font = "500 " + Math.round(22 * fs) + "px " + BODY_FONT;
        g.fillText(hd.held + " held", x + w * 0.54, yy);
        g.textAlign = "right"; g.fillStyle = semColor(st, hd.tone || undefined);
        g.font = "700 " + Math.round(24 * fs) + "px " + BODY_FONT;
        g.fillText(hd.change, x + w, yy);
        g.textAlign = "left";
      });
    }
  }

  /* Smart Money: diverging monthly bars (NSDL FII net flows, ₹ Cr) —
     green right of the zero line, red left, value at the row's end. */
  function drawSmBars(g, cu, x, y, w, h, st, fs) {
    var bars = cu.bars || [];
    if (!bars.length) return;
    var maxAbs = 0;
    bars.forEach(function (b) { if (Math.abs(b.value) > maxAbs) maxAbs = Math.abs(b.value); });
    if (!maxAbs) maxAbs = 1;
    var labelW = 122 * fs, valW = 176 * fs;
    var plotX = x + labelW, plotW = w - labelW - valW;
    var zeroX = plotX + plotW / 2;
    var rowH = Math.min(64 * fs, h / bars.length);
    var barH = Math.min(30 * fs, rowH * 0.52);
    g.strokeStyle = st.stroke; g.lineWidth = 1.2 * fs;
    g.beginPath(); g.moveTo(zeroX, y); g.lineTo(zeroX, y + rowH * bars.length); g.stroke();
    bars.forEach(function (b, i) {
      var cy = y + i * rowH + rowH / 2;
      g.textAlign = "left"; g.fillStyle = st.muted;
      g.font = "600 " + Math.round(22 * fs) + "px " + BODY_FONT;
      g.fillText(truncTo(g, b.label, labelW - 10 * fs), x, cy + 8 * fs);
      var bw = Math.max(2, Math.abs(b.value) / maxAbs * (plotW / 2));
      g.fillStyle = semColor(st, b.value >= 0 ? "gain" : "loss");
      if (b.value >= 0) g.fillRect(zeroX, cy - barH / 2, bw, barH);
      else g.fillRect(zeroX - bw, cy - barH / 2, bw, barH);
      g.fillStyle = st.text;
      g.font = "700 " + Math.round(23 * fs) + "px " + BODY_FONT;
      g.fillText((b.value >= 0 ? "+" : "−") + "₹" + Math.round(Math.abs(b.value)).toLocaleString("en-IN") + " Cr", zeroX + plotW / 2 + 12 * fs, cy + 8 * fs);
    });
    g.textAlign = "left";
  }

  function drawDonut(g, cu, x, y, w, h, st, fs) {
    var segs = cu.segments || [];
    if (!segs.length) return;
    var side = w > h * 1.15;
    var d = side ? Math.min(h, w * 0.44) : Math.min(w * 0.52, h * 0.58);
    var cx = side ? x + d / 2 : x + w / 2;
    var cy = side ? y + h / 2 : y + d / 2;
    var rO = d / 2, rI = d * 0.31;
    var start = -Math.PI / 2;
    segs.forEach(function (s) {
      var ang = Math.max(0, s.frac) * Math.PI * 2;
      if (ang > 0.004) {
        g.beginPath();
        g.arc(cx, cy, rO, start + 0.012, start + ang - 0.012);
        g.arc(cx, cy, rI, start + ang - 0.012, start + 0.012, true);
        g.closePath();
        g.fillStyle = s.color; g.fill();
      }
      start += ang;
    });
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillStyle = st.text;
    g.font = "800 " + Math.round(64 * fs) + "px " + DISPLAY_FONT;
    g.fillText(cu.centerTop || "", cx, cy + 6 * fs);
    g.fillStyle = st.muted;
    g.font = "600 " + Math.round(24 * fs) + "px " + BODY_FONT;
    g.fillText(cu.centerBottom || "", cx, cy + 40 * fs);
    /* legend */
    var lx = side ? x + d + 36 * fs : x + w * 0.08;
    var lw = side ? x + w - lx : w * 0.84;
    var ly = side ? y + (h - segs.length * 52 * fs) / 2 + 30 * fs : y + d + 52 * fs;
    var rowH = Math.min(52 * fs, side ? h / Math.max(1, segs.length) : (y + h - ly + 30 * fs) / Math.max(1, segs.length));
    segs.forEach(function (s, i) {
      var yy = ly + i * rowH;
      if (yy > y + h + 4 * fs) return;
      g.textAlign = "left";
      g.beginPath(); g.arc(lx + 10 * fs, yy - 9 * fs, 10 * fs, 0, Math.PI * 2);
      g.fillStyle = s.color; g.fill();
      g.fillStyle = st.text;
      g.font = "700 " + Math.round(27 * fs) + "px " + BODY_FONT;
      g.fillText(truncTo(g, s.label, lw - 130 * fs), lx + 34 * fs, yy);
      g.textAlign = "right"; g.fillStyle = st.muted;
      g.font = "700 " + Math.round(27 * fs) + "px " + BODY_FONT;
      g.fillText((s.frac * 100).toFixed(1) + "%", lx + lw, yy);
    });
    g.textAlign = "left";
  }

  function drawMonthGrid(g, cu, x, y, w, h, st, fs) {
    var years = cu.years || [];
    if (!years.length) return;
    var yearW = 74 * fs, ytdW = 96 * fs, gap = 5 * fs;
    var cellW = (w - yearW - ytdW - gap * 13) / 12;
    var headH = 34 * fs;
    var rowH = Math.min(72 * fs, (h - headH) / years.length);
    g.textBaseline = "alphabetic";
    /* month header */
    g.font = "700 " + Math.round(19 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.muted; g.textAlign = "center";
    for (var m = 0; m < 12; m++) {
      g.fillText(MONTH_SHORT[m][0], x + yearW + gap + m * (cellW + gap) + cellW / 2, y + 22 * fs);
    }
    g.textAlign = "right";
    g.fillText("Year", x + w, y + 22 * fs);
    years.forEach(function (yr, ri) {
      var ry = y + headH + ri * rowH;
      g.textAlign = "left"; g.fillStyle = st.text;
      g.font = "700 " + Math.round(26 * fs) + "px " + BODY_FONT;
      g.fillText(yr.year, x, ry + rowH * 0.62);
      yr.cells.forEach(function (v, mi) {
        var cxp = x + yearW + gap + mi * (cellW + gap);
        rr(g, cxp, ry + 4 * fs, cellW, rowH - 10 * fs, 8 * fs);
        if (v === null) { g.fillStyle = st.panel; g.fill(); return; }
        var inten = Math.min(0.82, 0.20 + Math.abs(v) * 0.085);
        g.fillStyle = hexA(v >= 0 ? (st.gain || PAL.gain) : (st.loss || PAL.loss), inten);
        g.fill();
        var label = (v >= 0 ? "+" : "") + v.toFixed(1);
        var fSize = 21;
        g.font = "700 " + Math.round(fSize * fs) + "px " + BODY_FONT;
        while (fSize > 12 && g.measureText(label).width > cellW - 6 * fs) { fSize -= 2; g.font = "700 " + Math.round(fSize * fs) + "px " + BODY_FONT; }
        g.textAlign = "center"; g.fillStyle = st.text;
        g.fillText(label, cxp + cellW / 2, ry + rowH * 0.62);
      });
      g.textAlign = "right";
      g.fillStyle = yr.ytd === null ? st.muted : semColor(st, yr.ytd >= 0 ? "gain" : "loss");
      g.font = "700 " + Math.round(24 * fs) + "px " + BODY_FONT;
      g.fillText(yr.ytd === null ? "—" : (yr.ytd >= 0 ? "+" : "") + yr.ytd.toFixed(1) + "%", x + w, ry + rowH * 0.62);
    });
    g.textAlign = "left";
  }

  /* Squarified treemap over the content box; tile area ∝ weight,
     fill = day-move colour with intensity ∝ |pct| (a flat day is a
     plain panel tile). */
  function drawTiles(g, cu, x, y, w, h, st, fs) {
    var tiles = (cu.tiles || []).filter(function (t) { return t.w > 0; }).slice().sort(function (a, b) { return b.w - a.w; });
    if (!tiles.length) return;
    var total = tiles.reduce(function (a, t) { return a + t.w; }, 0) || 1;
    var rects = [];
    (function squarify(items, rx, ry, rw, rh) {
      if (!items.length) return;
      if (items.length === 1) { rects.push({ t: items[0], x: rx, y: ry, w: rw, h: rh }); return; }
      var area = rw * rh;
      var row = [], rowArea = 0;
      function worst(rowItems, rowA, side) {
        var s = rowItems.reduce(function (a, t) { return a + t.w / total * area; }, 0);
        var mx = 0, mn = Infinity;
        rowItems.forEach(function (t) { var a2 = t.w / total * area; if (a2 > mx) mx = a2; if (a2 < mn) mn = a2; });
        var ss = s * s;
        return Math.max((side * side * mx) / ss, ss / (side * side * mn));
      }
      var i = 0, side = Math.min(rw, rh);
      while (i < items.length) {
        var cand = row.concat([items[i]]);
        var candArea = rowArea + items[i].w / total * area;
        if (!row.length || worst(cand, candArea, side) <= worst(row, rowArea, side)) { row = cand; rowArea = candArea; i++; }
        else break;
      }
      var rowFrac = rowArea / area;
      var rest = items.slice(row.length);
      if (rw >= rh) {
        var colW = rw * rowFrac, accY = ry;
        row.forEach(function (t) { var hh = rh * (t.w / total * area) / rowArea; rects.push({ t: t, x: rx, y: accY, w: colW, h: hh }); accY += hh; });
        squarify(rest, rx + colW, ry, rw - colW, rh);
      } else {
        var rowH = rh * rowFrac, accX = rx;
        row.forEach(function (t) { var ww = rw * (t.w / total * area) / rowArea; rects.push({ t: t, x: accX, y: ry, w: ww, h: rowH }); accX += ww; });
        squarify(rest, rx, ry + rowH, rw, rh - rowH);
      }
    })(tiles, x, y, w, h);
    rects.forEach(function (r) {
      var inset = 3 * fs;
      var rx = r.x + inset, ry = r.y + inset, rw = Math.max(0, r.w - inset * 2), rh = Math.max(0, r.h - inset * 2);
      if (rw < 8 || rh < 8) return;
      rr(g, rx, ry, rw, rh, 10 * fs);
      if (r.t.pct === null) g.fillStyle = st.panel;
      else if (Math.abs(r.t.pct) < 0.05) g.fillStyle = st.panel;
      else g.fillStyle = hexA(r.t.pct >= 0 ? (st.gain || PAL.gain) : (st.loss || PAL.loss), Math.min(0.85, 0.25 + Math.abs(r.t.pct) * 0.14));
      g.fill();
      g.strokeStyle = st.stroke; g.lineWidth = 1; g.stroke();
      if (rw < 52 * fs || rh < 40 * fs) return;
      var cxp = rx + rw / 2, big = rh > 92 * fs && rw > 120 * fs;
      g.textAlign = "center";
      g.fillStyle = st.text;
      g.font = "800 " + Math.round((big ? 30 : 24) * fs) + "px " + BODY_FONT;
      g.fillText(truncTo(g, r.t.sym, rw - 14 * fs), cxp, ry + rh / 2 - (big ? 4 * fs : 2 * fs));
      if (r.t.pct !== null) {
        g.font = "700 " + Math.round((big ? 27 : 22) * fs) + "px " + BODY_FONT;
        g.fillStyle = st.text;
        g.fillText(fmtPct(r.t.pct), cxp, ry + rh / 2 + (big ? 32 * fs : 26 * fs));
      }
    });
    g.textAlign = "left";
  }

  function drawGauge(g, cu, x, y, w, h, st, fs) {
    var cx = x + w / 2;
    var r = Math.min(w * 0.34, h * 0.78);
    var cy = y + Math.min(h, r + 74 * fs);
    var lw = Math.max(10 * fs, r * 0.16);
    function pt(ang, rad) { return [cx + rad * Math.cos(ang), cy - rad * Math.sin(ang)]; }
    /* track + coloured zones (weak -> positive) */
    var zones = [[0, 35, st.loss || PAL.loss], [35, 45, "#d9a441"], [45, 55, st.muted], [55, 65, "#7fb069"], [65, 100, st.gain || PAL.gain]];
    zones.forEach(function (z) {
      var a0 = Math.PI * (1 - z[0] / 100), a1 = Math.PI * (1 - z[1] / 100);
      g.beginPath();
      g.arc(cx, cy, r, -a0, -a1, false);
      g.strokeStyle = hexA(z[2], 0.55); g.lineWidth = lw; g.lineCap = "butt"; g.stroke();
    });
    g.beginPath(); g.arc(cx, cy, r, Math.PI, 0, false);
    g.strokeStyle = st.stroke; g.lineWidth = 1.2 * fs; g.stroke();
    /* tick labels */
    g.font = "600 " + Math.round(20 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.muted; g.textAlign = "center";
    [0, 50, 100].forEach(function (v) {
      var p = pt(Math.PI - (v / 100) * Math.PI, r + lw * 0.95);
      g.fillText(String(v), p[0], p[1] + 8 * fs);
    });
    /* needle */
    var na = Math.PI - (Math.max(0, Math.min(100, cu.score)) / 100) * Math.PI;
    var np = pt(na, r - lw * 0.7);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(np[0], np[1]);
    g.strokeStyle = st.text; g.lineWidth = Math.max(3 * fs, r * 0.035); g.lineCap = "round"; g.stroke();
    g.beginPath(); g.arc(cx, cy, r * 0.07, 0, Math.PI * 2); g.fillStyle = st.text; g.fill();
    /* score under the hub */
    g.font = "800 " + Math.round(58 * fs) + "px " + DISPLAY_FONT;
    g.fillStyle = st.text;
    g.fillText(String(cu.score), cx, cy + 66 * fs);
    g.font = "600 " + Math.round(21 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.muted;
    g.fillText("OUT OF 100 · BASED ON NIFTY 50 DATA", cx, cy + 100 * fs);
    g.textAlign = "left";
  }

  function drawGrades(g, cu, x, y, w, h, st, fs) {
    var items = cu.items || [];
    if (!items.length) return;
    var rowH = h / items.length;
    items.forEach(function (it, i) {
      var ry = y + i * rowH;
      var chip = Math.min(64 * fs, rowH * 0.52);
      rr(g, x, ry + (rowH - chip) / 2, chip, chip, 14 * fs);
      g.fillStyle = gradeColor(it.grade, st); g.fill();
      g.textAlign = "center"; g.fillStyle = "#ffffff";
      g.font = "800 " + Math.round(chip * 0.52) + "px " + DISPLAY_FONT;
      g.fillText(it.grade || "—", x + chip / 2, ry + rowH / 2 + chip * 0.19);
      var tx = x + chip + 22 * fs;
      g.textAlign = "left"; g.fillStyle = st.text;
      g.font = "700 " + Math.round(29 * fs) + "px " + BODY_FONT;
      var labelTxt = it.label + (it.score !== null ? "  ·  " + it.score + " / 100" : "");
      g.fillText(truncTo(g, labelTxt, w - chip - 22 * fs), tx, ry + rowH / 2 - 4 * fs);
      if (it.reason) {
        g.fillStyle = st.muted;
        g.font = "500 " + Math.round(22 * fs) + "px " + BODY_FONT;
        g.fillText(truncTo(g, it.reason, w - chip - 22 * fs), tx, ry + rowH / 2 + 28 * fs);
      }
      if (i < items.length - 1) {
        g.strokeStyle = st.stroke; g.globalAlpha = 0.45; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, ry + rowH); g.lineTo(x + w, ry + rowH); g.stroke();
        g.globalAlpha = 1;
      }
    });
    g.textAlign = "left";
  }

  function drawPodium(g, cu, x, y, w, h, st, fs) {
    var entries = cu.entries || [];
    if (!entries.length) return;
    var disp = entries.length === 1 ? [entries[0]]
      : entries.length === 2 ? [entries[1], entries[0]]
      : [entries[1], entries[0], entries[2]];
    var ranks = entries.length === 1 ? [1] : entries.length === 2 ? [2, 1] : [2, 1, 3];
    var heights = entries.length === 1 ? [1] : entries.length === 2 ? [0.66, 1] : [0.68, 1, 0.52];
    var n = disp.length, gap = 18 * fs;
    var bw = (w - gap * (n - 1)) / n;
    var baseY = y + h;
    var topSpace = 118 * fs;
    disp.forEach(function (e, i) {
      var bx = x + i * (bw + gap);
      var bh = (h - topSpace) * heights[i];
      var by = baseY - bh;
      /* name + % above the block */
      g.textAlign = "center";
      g.fillStyle = st.text;
      g.font = "800 " + Math.round(31 * fs) + "px " + BODY_FONT;
      g.fillText(truncTo(g, e.sym, bw - 10 * fs), bx + bw / 2, by - 52 * fs);
      g.fillStyle = semColor(st, e.pct >= 0 ? "gain" : "loss");
      g.font = "800 " + Math.round(36 * fs) + "px " + DISPLAY_FONT;
      g.fillText(fmtPct(e.pct), bx + bw / 2, by - 14 * fs);
      /* block */
      rr(g, bx, by, bw, bh, 14 * fs);
      g.fillStyle = st.panel; g.fill();
      g.strokeStyle = ranks[i] === 1 ? (st.themed ? st.accent : PAL.gold) : st.stroke;
      g.lineWidth = ranks[i] === 1 ? 2.6 * fs : 1.2 * fs; g.stroke();
      g.fillStyle = ranks[i] === 1 ? (st.themed ? st.accent : PAL.gold) : st.muted;
      g.font = "800 " + Math.round(64 * fs) + "px " + DISPLAY_FONT;
      g.fillText(String(ranks[i]), bx + bw / 2, by + 78 * fs);
      if (e.change !== null && e.change !== undefined && bh > 150 * fs) {
        g.fillStyle = st.muted;
        g.font = "600 " + Math.round(23 * fs) + "px " + BODY_FONT;
        g.fillText(fmtInr(e.change), bx + bw / 2, by + 118 * fs);
      }
    });
    g.textAlign = "left";
  }

  function drawChecks(g, cu, x, y, w, h, st, fs) {
    if (cu.onlyNext) {
      var nx = cu.onlyNext;
      var ccx = x + w / 2, ccy = y + 92 * fs, cr = 52 * fs;
      g.beginPath(); g.arc(ccx, ccy, cr, 0, Math.PI * 2);
      g.strokeStyle = st.accent; g.lineWidth = 3 * fs; g.stroke();
      g.textAlign = "center"; g.fillStyle = st.accent;
      g.font = "800 " + Math.round(44 * fs) + "px " + DISPLAY_FONT;
      g.fillText("→", ccx, ccy + 15 * fs);
      g.fillStyle = st.muted;
      g.font = "700 " + Math.round(21 * fs) + "px " + BODY_FONT;
      g.fillText("NEXT MILESTONE", ccx, ccy + cr + 44 * fs);
      g.fillStyle = st.text;
      g.font = "800 " + Math.round(40 * fs) + "px " + DISPLAY_FONT;
      g.fillText(truncTo(g, nx.head, w - 20 * fs), ccx, ccy + cr + 96 * fs);
      g.fillStyle = st.muted;
      g.font = "500 " + Math.round(24 * fs) + "px " + BODY_FONT;
      g.fillText(nx.sub || "", ccx, ccy + cr + 134 * fs);
      g.textAlign = "left";
      return;
    }
    var items = cu.items || [];
    if (!items.length) return;
    var rowH = Math.min(96 * fs, h / items.length);
    items.forEach(function (it, i) {
      var ry = y + i * rowH, cy = ry + rowH / 2;
      g.beginPath(); g.arc(x + 26 * fs, cy, 24 * fs, 0, Math.PI * 2);
      g.fillStyle = st.gain || PAL.gain; g.fill();
      g.beginPath();
      g.moveTo(x + 15 * fs, cy + 1 * fs); g.lineTo(x + 23 * fs, cy + 9 * fs); g.lineTo(x + 38 * fs, cy - 9 * fs);
      g.strokeStyle = "#ffffff"; g.lineWidth = 4.4 * fs; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
      g.textAlign = "left"; g.fillStyle = st.text;
      g.font = "700 " + Math.round(29 * fs) + "px " + BODY_FONT;
      g.fillText(truncTo(g, it.head, w - 76 * fs), x + 66 * fs, cy - 2 * fs);
      if (it.sub) {
        g.fillStyle = st.muted;
        g.font = "500 " + Math.round(22 * fs) + "px " + BODY_FONT;
        g.fillText(truncTo(g, it.sub, w - 76 * fs), x + 66 * fs, cy + 28 * fs);
      }
    });
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
      rg.addColorStop(0, st.themed ? hexA(st.accent, 0.20) : "rgba(76,175,109,0.20)");
      rg.addColorStop(1, st.themed ? hexA(st.accent, 0) : "rgba(76,175,109,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (st.bgMode === "glass") {
      /* Glass background mode: one translucent panel + hairline
         border floating over the gradient (the gradient itself is
         resolved by effStyle — theme stops for Bold Gradient). */
      rr(g, pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9, 30 * fs);
      g.fillStyle = st.panel; g.fill();
      g.strokeStyle = st.stroke; g.lineWidth = 1.6 * fs; g.stroke();
    }
    if (st.frame) {
      g.strokeStyle = st.themed ? hexA(st.accent, 0.85) : "rgba(201,162,39,0.85)"; g.lineWidth = 3 * fs;
      rr(g, 16 * fs, 16 * fs, W - 32 * fs, H - 32 * fs, 26 * fs); g.stroke();
      g.strokeStyle = st.themed ? hexA(st.accent, 0.35) : "rgba(201,162,39,0.35)"; g.lineWidth = 1.4 * fs;
      rr(g, 26 * fs, 26 * fs, W - 52 * fs, H - 52 * fs, 20 * fs); g.stroke();
    }
    var contentBottom = drawFooter(g, W, H, model, st, fs, pad);

    /* ---- header: FOLIO brand line (left) + the Singh Caizen logo
       at the top-right, 9% of the card width, on EVERY card. The
       brand line reads "FOLIO by Singh Caizen" — "FOLIO" in the
       display face, "by" regular, "Singh Caizen" in bold. ---- */
    var y = pad * 0.92;
    var logoW = Math.round(W * 0.09), logoH = logoW * 392 / 639;
    var logo = st.dark ? logoImgs.dark : logoImgs.light;
    g.textBaseline = "alphabetic";
    var brandBase = y + logoH * 0.72;
    g.textAlign = "left"; g.fillStyle = st.text;
    g.font = "700 " + Math.round(40 * fs) + "px " + DISPLAY_FONT;
    try { g.letterSpacing = Math.round(6 * fs) + "px"; } catch (e) {}
    g.fillText("FOLIO", pad, brandBase);
    var brandX = pad + g.measureText("FOLIO").width + Math.round(6 * fs) + 16 * fs;
    try { g.letterSpacing = "0px"; } catch (e) {}
    g.font = "500 " + Math.round(27 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.muted;
    g.fillText("by", brandX, brandBase);
    brandX += g.measureText("by").width + 9 * fs;
    g.font = "700 " + Math.round(27 * fs) + "px " + BODY_FONT;
    g.fillStyle = st.text;
    g.fillText("Singh Caizen", brandX, brandBase);
    /* header right: the logo itself in the corner; the card type
       and date sit just left of it, on the logo's own lines — so
       the header is exactly as tall as the pre-v112 header and no
       content space is lost. */
    var logoX = W - pad - logoW;
    if (logo) { try { g.drawImage(logo, logoX, y, logoW, logoH); } catch (e) { logo = null; } }
    if (!logo) {
      g.textAlign = "right"; g.fillStyle = st.accent;
      g.font = "700 " + Math.round(30 * fs) + "px " + DISPLAY_FONT;
      g.fillText("SINGH CAIZEN", W - pad, y + logoH * 0.68);
    }
    g.textAlign = "right"; g.fillStyle = st.muted;
    g.font = "700 " + Math.round(21 * fs) + "px " + BODY_FONT;
    g.fillText(truncTo(g, model.typeLabel || "", logoX - pad - 34 * fs), logoX - 18 * fs, y + logoH * 0.42);
    if (model.date) {
      g.font = "500 " + Math.round(21 * fs) + "px " + BODY_FONT;
      g.fillText(model.date, logoX - 18 * fs, y + logoH * 0.42 + 28 * fs);
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
      g.textAlign = "right"; g.fillStyle = st.themed ? st.accent : PAL.gold;
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

    /* ---- hero number (or heroText for non-percentage heroes:
       mood words, day counts, wrapped move counts) ---- */
    var heroTxt = model.heroText ? String(model.heroText)
      : (model.heroPct === null || model.heroPct === undefined) ? "—"
      : (model.heroPct >= 0 ? "▲ +" : "▼ ") + Math.abs(model.heroPct).toFixed(2) + "%";
    var heroSize = model.heroText ? 84 : 112;
    g.font = "800 " + Math.round(heroSize * fs) + "px " + DISPLAY_FONT;
    while (heroSize > 40 && g.measureText(heroTxt).width > W - pad * 2 - 190 * fs) { heroSize -= 6; g.font = "800 " + Math.round(heroSize * fs) + "px " + DISPLAY_FONT; }
    var heroCol = (model.heroPct === null || model.heroPct === undefined) ? st.text : semColor(st, model.heroPct >= 0 ? "gain" : "loss");
    if (st.glow && (model.heroText || (model.heroPct !== null && model.heroPct !== undefined))) { g.shadowColor = heroCol; g.shadowBlur = 34 * fs; }
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
        g.strokeStyle = c.hot ? (st.themed ? st.accent : PAL.gold) : st.stroke; g.lineWidth = c.hot ? 2.4 * fs : 1.2 * fs; g.stroke();
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

    /* ---- v112 custom blocks (donut / monthly grid / tiles /
       gauge / grades / podium / milestone checks) ---- */
    if (model.custom) {
      var customH = contentBottom - y;
      if (customH > 120 * fs) {
        try { drawCustom(g, model.custom, pad, y, W - pad * 2, Math.min(customH, (H / W > 1.5 ? 0.52 : 0.46) * (contentBottom - pad)), st, fs, thumb); } catch (e) {}
      }
      y = contentBottom;
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
        g.textAlign = "left"; g.fillStyle = col[0].indexOf("GAIN") >= 0 ? semColor(st, "gain") : semColor(st, "loss");
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
    if (state && t === "wrapped" && state.wrappedSet) return wrappedFileName(state.wrappedIdx);
    return "folio-" + t + "-card.png";
  }
  function wrappedFileName(i) {
    return "folio-wrapped-" + (state ? state.wrappedPeriod : "month") + "-" + (i + 1) + "-of-" + (state && state.wrappedSet ? state.wrappedSet.length : 5) + ".png";
  }
  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name || fileName();
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

  /* Render any model offscreen at the current size and style —
     the same drawCard() path as the visible preview, so a Wrapped
     export is identical to paging the set in the sheet. */
  function renderBlobFor(model) {
    return new Promise(function (res) {
      try {
        var size = SIZES[state.size];
        var cv = document.createElement("canvas");
        cv.width = size.w; cv.height = size.h;
        var stB = STYLES.filter(function (s) { return s.id === state.style; })[0] || STYLES[0];
        drawCard(cv.getContext("2d"), size.w, size.h, model, effStyle(stB), false);
        if (cv.toBlob) cv.toBlob(function (b) { res(b); }, "image/png");
        else res(null);
      } catch (e) { res(null); }
    });
  }
  function doDownloadAll() {
    if (!state || !state.wrappedSet || !state.wrappedSet.length) return;
    var set = state.wrappedSet, i = 0;
    gToast("Preparing all " + set.length + " Wrapped cards…");
    (function next() {
      if (i >= set.length) { gToast("All " + set.length + " Wrapped cards downloaded."); return; }
      var idx = i++;
      renderBlobFor(set[idx]).then(function (blob) {
        if (blob) downloadBlob(blob, wrappedFileName(idx));
        setTimeout(next, 350);
      });
    })();
  }
  function doShareWrapped() {
    var set = state.wrappedSet;
    Promise.all(set.map(function (m) { return renderBlobFor(m); })).then(function (blobs) {
      var files = [];
      blobs.forEach(function (b, i) { if (b) { try { files.push(new File([b], wrappedFileName(i), { type: "image/png" })); } catch (e) {} } });
      var text = ((set[0] && set[0].shareText) || "My Wrapped on FOLIO") + " via FOLIO by Singh Caizen " + SHARE_LINK;
      if (files.length === set.length && files.length > 1 && navigator.canShare && navigator.canShare({ files: files })) {
        navigator.share({ files: files, title: "FOLIO — My Wrapped", text: text }).catch(function (err) {
          if (err && err.name === "AbortError") return;
          shareWrappedFallback(files, blobs, text);
        });
        return;
      }
      shareWrappedFallback(files, blobs, text);
    });
  }
  function shareWrappedFallback(files, blobs, text) {
    /* Multi-file sharing is unavailable here: share the first card
       only, and say plainly how to get the whole set. */
    var first = files && files[0];
    if (first && navigator.canShare && navigator.canShare({ files: [first] })) {
      navigator.share({ files: [first], title: "FOLIO — My Wrapped", text: text }).then(function () {
        gToast("This browser shares one image at a time — the first card was shared. Use Download all for the full set.");
      }).catch(function (err) { if (err && err.name !== "AbortError") gToast("Use Download all to save the full Wrapped set."); });
      return;
    }
    if (blobs && blobs[0]) downloadBlob(blobs[0], wrappedFileName(0));
    writeClipboardText(text).then(function () { gToast("File sharing is not supported here — the first card was downloaded. Use Download all for the full set."); });
  }

  function doShare() {
    if (!state || !state.model) return;
    if (state.type === "wrapped" && state.wrappedSet && state.wrappedSet.length > 1) { doShareWrapped(); return; }
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
