/* ================= FOLIO MARKET HUB (Phase 6C) =================
   Lazy module — loaded on first open via window.folioOpenMarketHub()
   in features.js (same contract as tools.js / ptools.js / smartmoney.js).
   NOT in SW CORE. Nothing in this module runs at app startup.

   DATA: free Yahoo Finance chart data ONLY, fetched through the app's
   own existing machinery — never a new endpoint pattern:
   - Symbols Yahoo writes with a caret (^NSEI, ^GSPC, ^CNXIT ...) ride
     fetchHistory() from features.js (the exact call the Dashboard's
     Market Pulse strip makes), which carries the app's proxy race,
     localStorage cache and stale-while-revalidate.
   - Symbols Yahoo writes with "=" or "-" (INR=X, GC=F, SI=F, CL=F,
     BTC-USD) cannot ride fetchHistory: its symbol rule appends ".NS"
     to anything without a dot or caret, which would corrupt them.
     Those ride fetchChartValidated() — the same validated proxy race
     fetchMaster()/fetchOHLC() use — with a chart URL of the identical
     shape fetchOHLC builds (v8/finance/chart/<sym>?range&interval).
   Day change is always the last two daily closes (the Market Pulse
   convention; meta.chartPreviousClose on a 1-month chart is NOT
   yesterday, so it is never used for the day move). A symbol whose
   fetch fails is hidden — never shown as 0, never faked.

   PRIVACY: the hub shows public market data only. It never prints a
   portfolio amount, a holding value or a quantity, so there is
   nothing for Privacy Mode to mask here. Watchlist symbols are
   public tickers (the Watchlist view itself shows them openly).

   Persisted settings (insX pattern — state.profile.markethub, riding
   the existing cloud doc / .folio vault via persist()):
     markethub.show        {india, global, fx, sectors, movers,
                            watch52, compare} section visibility
     markethub.compareSyms [SYM, ...] up to 4
     markethub.compareRange "1M" | "3M" | "6M" | "1Y"

   MARKET STATUS is computed on-device from the IST clock, the
   weekday and the built-in NSE holiday list below. It is display
   only — it never touches the app's refresh logic or market pill. */
(function () {
  "use strict";

  /* ---------- formatting: ride the app's helpers when present ---------- */
  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fmtPct(x, digits) {
    if (!Number.isFinite(x)) return "—";
    return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 2 : digits) + "%";
  }
  function fmtNum(n, digits) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-IN", { minimumFractionDigits: digits == null ? 2 : digits, maximumFractionDigits: digits == null ? 2 : digits });
  }
  function fmtInt(n) { return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "—"; }
  function num(v) { var n = (typeof v === "number") ? v : parseFloat(v); return Number.isFinite(n) ? n : null; }
  function toastMsg(m) { try { if (typeof toast === "function") { toast(m); return; } } catch (e) {} }

  /* ---------- persistence (insX pattern: state.profile + persist()) ---------- */
  var SHOW_KEYS = ["india", "global", "fx", "sectors", "movers", "watch52", "compare"];
  function mhSettings() {
    try {
      var p = state.profile || (state.profile = {});
      if (!p.markethub || typeof p.markethub !== "object") p.markethub = {};
      var s = p.markethub;
      if (!s.show || typeof s.show !== "object") s.show = {};
      SHOW_KEYS.forEach(function (k) { if (typeof s.show[k] !== "boolean") s.show[k] = true; });
      if (!Array.isArray(s.compareSyms)) s.compareSyms = [];
      if (["1M", "3M", "6M", "1Y"].indexOf(s.compareRange) < 0) s.compareRange = "3M";
      return s;
    } catch (e) {
      var d = { show: {}, compareSyms: [], compareRange: "3M" };
      SHOW_KEYS.forEach(function (k) { d.show[k] = true; });
      return d;
    }
  }
  function mhSave() { try { persist(); } catch (e) {} }

  /* ================= CONFIG =================
     NSE trading holidays 2026 (equity segment) — EDITABLE built-in
     list, verified 2026-11-16 against the NSE 2026 holiday calendar
     as republished by multiple broker/ exchange-calendar sources
     (16 weekday closures; the 15 Jan Maharashtra municipal-election
     holiday was added by NSE after the original circular). Dates not
     in this list fall back to the weekday schedule, and the status
     line says so. Muhurat trading (Sun 8 Nov 2026) is a special
     one-hour session this indicator does not model — it reports that
     Sunday as closed. */
  var NSE_HOLIDAYS_2026 = {
    "2026-01-15": "Municipal Corporation Elections — Maharashtra",
    "2026-01-26": "Republic Day",
    "2026-03-03": "Holi",
    "2026-03-26": "Shri Ram Navami",
    "2026-03-31": "Shri Mahavir Jayanti",
    "2026-04-03": "Good Friday",
    "2026-04-14": "Dr Baba Saheb Ambedkar Jayanti",
    "2026-05-01": "Maharashtra Day",
    "2026-05-28": "Bakri Id",
    "2026-06-26": "Muharram",
    "2026-09-14": "Ganesh Chaturthi",
    "2026-10-02": "Mahatma Gandhi Jayanti",
    "2026-10-20": "Dussehra",
    "2026-11-10": "Diwali — Balipratipada",
    "2026-11-24": "Guru Nanak Jayanti",
    "2026-12-25": "Christmas"
  };
  var OPEN_MIN = 555, CLOSE_MIN = 930; /* 9:15 AM – 3:30 PM IST, the app pill's own window (marketOpenIST) */

  var INDIA_TILES = [
    { sym: "^NSEI", label: "NIFTY 50" },
    { sym: "^BSESN", label: "SENSEX" },
    { sym: "^NSEBANK", label: "NIFTY BANK" },
    { sym: "^INDIAVIX", label: "INDIA VIX", note: "Fear gauge — higher means more expected swings" }
  ];
  var GLOBAL_TILES = [
    { sym: "^GSPC", label: "S&P 500", place: "New York", tz: "America/New_York" },
    { sym: "^IXIC", label: "NASDAQ", place: "New York", tz: "America/New_York" },
    { sym: "^DJI", label: "Dow Jones", place: "New York", tz: "America/New_York" },
    { sym: "^N225", label: "Nikkei 225", place: "Tokyo", tz: "Asia/Tokyo" },
    { sym: "^HSI", label: "Hang Seng", place: "Hong Kong", tz: "Asia/Hong_Kong" }
  ];
  /* FX / commodity / crypto tiles ride fetchChartValidated (see header).
     Prices are USD-denominated on Yahoo except USD/INR; the unit label
     on every tile says exactly what the number is — no ₹ is ever put
     in front of a dollar price. */
  var FX_TILES = [
    { sym: "INR=X", label: "USD / INR", unit: "₹ per $1", digits: 2 },
    { sym: "GC=F", label: "Gold", unit: "USD / troy oz", digits: 2 },
    { sym: "SI=F", label: "Silver", unit: "USD / troy oz", digits: 2 },
    { sym: "CL=F", label: "Crude Oil (WTI)", unit: "USD / barrel", digits: 2 },
    { sym: "BTC-USD", label: "Bitcoin", unit: "USD", digits: 0 }
  ];
  /* Sector indices — only symbols the app itself already fetches for
     the Dashboard Market Pulse strip (features.js pulseLoad), so every
     one is a confirmed Yahoo symbol in this codebase. */
  var SECTOR_TILES = [
    { sym: "^NSEBANK", label: "Bank" },
    { sym: "^CNXIT", label: "IT" },
    { sym: "^CNXPHARMA", label: "Pharma" },
    { sym: "^CNXAUTO", label: "Auto" },
    { sym: "^CNXMETAL", label: "Metal" },
    { sym: "^CNXFMCG", label: "FMCG" }
  ];
  /* NIFTY 50 constituents — built-in snapshot of the index after the
     Sep 2025 reconstitution (INDIGO, MAXHEALTH in; HEROMOTOCO,
     INDUSINDBK out; ETERNAL, JIOFIN in since Mar 2025) and the Oct
     2025 Tata Motors demerger (TMPV is the index constituent).
     A stale name still shows its own real day move; the panel always
     prints how many of the 50 actually loaded. */
  var NIFTY50 = ["ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO", "BAJAJFINSV", "BAJFINANCE", "BEL", "BHARTIARTL", "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL", "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", "HINDALCO", "HINDUNILVR", "ICICIBANK", "INDIGO", "INFY", "ITC", "JIOFIN", "JSWSTEEL", "KOTAKBANK", "LT", "M&M", "MARUTI", "MAXHEALTH", "NESTLEIND", "NTPC", "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", "SHRIRAMFIN", "SUNPHARMA", "TATACONSUM", "TMPV", "TATASTEEL", "TCS", "TECHM", "TITAN", "TRENT", "ULTRACEMCO", "WIPRO"];
  var RANGE_DAYS = { "1M": 30, "3M": 91, "6M": 182, "1Y": 365 };
  var RANGE_KEY = { "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y" };
  var CMP_COLORS = ["#c9a227", "#4caf6d", "#39c2d7", "#b48cf2"];

  var EXPLAIN = {
    day: "Day change compares the latest price with the previous trading day's close, from the free Yahoo feed (about 15 minutes delayed).",
    vix: "INDIA VIX is the market's expected-swing gauge for the next 30 days, worked out from NIFTY option prices. Higher means traders expect bigger moves — it is not a direction signal.",
    fx: "Currency and commodity prices come from Yahoo's global feed in US dollars (except USD/INR, which is rupees per one dollar). They are reference prices, not the rate any bank or broker would give you.",
    movers: "Every NIFTY 50 stock's day change, fetched one by one through the same free feed as your portfolio prices, then sorted. Based only on the stocks that actually loaded.",
    sectors: "Each sector index's day change, from the same Yahoo symbols the Dashboard's Market Pulse strip uses. Colour depth grows with the size of the move.",
    watch52: "The 52-week high and low are worked out from one year of daily closing prices, so they can differ slightly from the exchange's intraday 52-week range. Position shows where the latest price sits between that low and high.",
    compare: "Each stock's price is reset to 0% at the start of the window, so the lines compare percentage performance only — not price levels. Price-only: dividends are not added back."
  };

  /* ================= PURE LOGIC (window.FolioMarketHubMath — harness-tested) ================= */
  var M = {};

  /* points: [{t, c}] ascending. Returns {level, prevClose, dayPct,
     closes} or null when there is not one usable close. dayPct is the
     last close vs the close before it (the Market Pulse convention);
     with a single close, dayPct is null — never a fabricated 0%. */
  M.quoteFromPoints = function (points) {
    if (!Array.isArray(points)) return null;
    var closes = [];
    points.forEach(function (p) { var c = num(p && p.c); if (c != null && c > 0) closes.push(c); });
    if (!closes.length) return null;
    var level = closes[closes.length - 1];
    var prev = closes.length >= 2 ? closes[closes.length - 2] : null;
    return { level: level, prevClose: prev, dayPct: prev ? (level / prev - 1) * 100 : null, closes: closes };
  };

  /* rows: [{sym, dayPct}] (dayPct may be null) -> top gainers/losers. */
  M.movers = function (rows, n) {
    n = n || 5;
    var ok = (rows || []).filter(function (r) { return r && Number.isFinite(r.dayPct); });
    var gainers = ok.filter(function (r) { return r.dayPct > 0; }).sort(function (a, b) { return b.dayPct - a.dayPct; }).slice(0, n);
    var losers = ok.filter(function (r) { return r.dayPct < 0; }).sort(function (a, b) { return a.dayPct - b.dayPct; }).slice(0, n);
    return { gainers: gainers, losers: losers, loaded: ok.length };
  };

  /* 52-week picture from 1 year of daily closes. */
  M.range52 = function (points) {
    if (!Array.isArray(points) || points.length < 2) return null;
    var closes = [];
    points.forEach(function (p) { var c = num(p && p.c); if (c != null && c > 0) closes.push(c); });
    if (closes.length < 2) return null;
    var hi = Math.max.apply(null, closes), lo = Math.min.apply(null, closes);
    if (!(hi > lo)) return null;
    var last = closes[closes.length - 1];
    return {
      hi: hi, lo: lo, last: last,
      posPct: (last - lo) / (hi - lo) * 100,
      belowHighPct: (last / hi - 1) * 100,
      aboveLowPct: (last / lo - 1) * 100
    };
  };

  /* Normalise a series to % from the window start. Base = the first
     close inside the window, else the last close before it (so sparse
     series still draw). Returns {vals:[{t,v}], finalPct} or null. */
  M.normalizeSeries = function (points, days, nowMs) {
    if (!Array.isArray(points) || points.length < 2) return null;
    var pts = points.filter(function (p) { return p && Number.isFinite(p.t) && num(p.c) != null && p.c > 0; })
      .slice().sort(function (a, b) { return a.t - b.t; });
    if (pts.length < 2) return null;
    var cutoff = (Number.isFinite(nowMs) ? nowMs : Date.now()) - days * 86400000;
    var base = null, seg = [];
    pts.forEach(function (p) { if (p.t < cutoff) base = p; else seg.push(p); });
    if (!seg.length) return null;
    if (!base) base = seg[0];
    var b = base.c;
    if (!(b > 0)) return null;
    var all = [base].concat(seg);
    var vals = all.map(function (p) { return { t: p.t, v: (p.c / b - 1) * 100 }; });
    return { vals: vals, finalPct: vals[vals.length - 1].v };
  };

  /* IST wall-clock parts for a Date, via Intl (no manual offset maths,
     so DST-style edge cases in the viewer's own zone cannot leak in). */
  M.istParts = function (date) {
    var dtf = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" });
    var parts = {};
    dtf.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    var dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var y = parseInt(parts.year, 10), mo = parseInt(parts.month, 10), d = parseInt(parts.day, 10);
    var hh = parseInt(parts.hour, 10) % 24, mm = parseInt(parts.minute, 10);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return { y: y, mo: mo, d: d, dow: dowMap[parts.weekday], mins: hh * 60 + mm, dateStr: y + "-" + pad(mo) + "-" + pad(d) };
  };

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dayLabel(parts, todayStr) {
    if (parts.dateStr === todayStr) return "today";
    /* tomorrow check via IST date arithmetic on the parts */
    return DAY_NAMES[parts.dow] + " " + parts.d + " " + MON_NAMES[parts.mo - 1];
  }

  /* India market status for a moment. holidays: {"YYYY-MM-DD": name}.
     Returns {open, kind, label, detail, covered} — kind is one of
     open | pre | post | weekend | holiday. covered=false when the
     year has no holiday entries at all (weekday schedule only). */
  M.marketStatus = function (date, holidays) {
    holidays = holidays || {};
    var p = M.istParts(date);
    var covered = Object.keys(holidays).some(function (k) { return k.indexOf(String(p.y) + "-") === 0; });
    var holiday = holidays[p.dateStr] || null;
    var weekend = (p.dow === 0 || p.dow === 6);
    var tradingToday = !weekend && !holiday;
    function nextOpen() {
      /* Scan forward over IST calendar dates. A calendar date's
         weekday and ISO string are properties of the date itself, so
         the candidates are built as UTC dates with the same Y/M/D —
         no timezone conversion is involved. Today (add 0) counts
         only before the open; a weekend or holiday never counts. */
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      for (var add = 0; add <= 10; add++) {
        if (add === 0 && p.mins >= OPEN_MIN) continue;
        var cd = new Date(Date.UTC(p.y, p.mo - 1, p.d + add));
        var cp = {
          y: cd.getUTCFullYear(), mo: cd.getUTCMonth() + 1, d: cd.getUTCDate(), dow: cd.getUTCDay(),
          dateStr: cd.getUTCFullYear() + "-" + pad(cd.getUTCMonth() + 1) + "-" + pad(cd.getUTCDate())
        };
        if (cp.dow === 0 || cp.dow === 6) continue;
        if (holidays[cp.dateStr]) continue;
        return cp;
      }
      return null;
    }
    if (tradingToday && p.mins >= OPEN_MIN && p.mins <= CLOSE_MIN) {
      return { open: true, kind: "open", label: "India market is open", detail: "Closes today at 3:30 PM IST", covered: covered };
    }
    var nx = nextOpen();
    var when = nx ? (nx.dateStr === p.dateStr ? "today at 9:15 AM" : dayLabel(nx, p.dateStr) + " at 9:15 AM") : "at the next trading session";
    if (tradingToday && p.mins < OPEN_MIN) {
      return { open: false, kind: "pre", label: "India market is closed", detail: "Opens " + when, covered: covered };
    }
    if (tradingToday) {
      return { open: false, kind: "post", label: "India market is closed", detail: "Opens " + when, covered: covered };
    }
    if (holiday) {
      return { open: false, kind: "holiday", label: "India market is closed", detail: "Holiday — " + holiday + ". Opens " + when, covered: covered };
    }
    return { open: false, kind: "weekend", label: "India market is closed", detail: "Weekend. Opens " + when, covered: covered };
  };

  /* Local time label for a world-market tile, e.g. "4:02 AM local". */
  M.localTime = function (date, tz) {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(date) + " local";
    } catch (e) { return ""; }
  };

  window.FolioMarketHubMath = M;

  /* ================= fetching (app machinery only) ================= */
  var quoteCache = {}; /* yahooSym -> {ts, quote} for validated-route tiles */
  var QUOTE_TTL = 5 * 60 * 1000;

  function histOf(sym, rangeKey) {
    try {
      if (typeof fetchHistory !== "function") return Promise.resolve(null);
      return Promise.resolve(fetchHistory(sym, rangeKey)).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  /* Caret-symbol quote via fetchHistory (Market Pulse pattern). */
  function quoteViaHistory(yahooSym) {
    return histOf(yahooSym, "1mo").then(function (h) {
      if (!h || !h.points || h.points.length < 1) return null;
      return M.quoteFromPoints(h.points);
    });
  }
  /* "="-style symbol quote via fetchChartValidated — the same race
     fetchOHLC uses, with the same URL shape it builds. */
  function quoteViaValidated(yahooSym) {
    var c = quoteCache[yahooSym];
    if (c && Date.now() - c.ts < QUOTE_TTL) return Promise.resolve(c.quote);
    var done = function (q) { quoteCache[yahooSym] = { ts: Date.now(), quote: q }; return q; };
    try {
      if (typeof fetchChartValidated !== "function") return Promise.resolve(null);
      var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSym) + "?range=1mo&interval=1d";
      return Promise.resolve(fetchChartValidated(url, 7000)).then(function (r0) {
        if (!r0) return done(null);
        var tsArr = r0.timestamp || [];
        var closes = (r0.indicators && r0.indicators.quote && r0.indicators.quote[0] && r0.indicators.quote[0].close) || [];
        var points = [];
        for (var i = 0; i < tsArr.length; i++) if (typeof closes[i] === "number") points.push({ t: tsArr[i] * 1000, c: closes[i] });
        return done(points.length ? M.quoteFromPoints(points) : null);
      }).catch(function () { return done(null); });
    } catch (e) { return Promise.resolve(null); }
  }
  /* Run fn over items, `size` at a time (the app's own batch of 4). */
  function runBatches(items, size, fn) {
    var out = new Array(items.length);
    var chain = Promise.resolve();
    var _loop = function (i) {
      chain = chain.then(function () {
        var batch = items.slice(i, i + size);
        return Promise.all(batch.map(function (it, k) {
          return Promise.resolve(fn(it)).then(function (r) { out[i + k] = r; }).catch(function () { out[i + k] = null; });
        }));
      });
    };
    for (var i = 0; i < items.length; i += size) _loop(i);
    return chain.then(function () { return out; });
  }
  function stockName(sym) {
    try { if (typeof STOCK_MAP !== "undefined" && STOCK_MAP[sym]) return STOCK_MAP[sym].name || ""; } catch (e) {}
    return "";
  }
  function heldSyms() {
    try {
      if (typeof computeHoldings === "function") {
        var ch = computeHoldings();
        return ((ch && ch.holdings) || []).map(function (h) { return h.sym; }).filter(Boolean);
      }
    } catch (e) {}
    return [];
  }
  function watchSyms() {
    try {
      if (typeof state !== "undefined" && Array.isArray(state.watch)) return state.watch.map(function (w) { return w.sym; }).filter(Boolean);
    } catch (e) {}
    return [];
  }

  /* ================= sheet ================= */
  var sheetEl = null, loadToken = 0, statusTimer = null;
  var lazyDone = {};   /* section id -> true once its lazy load ran */
  var cmpState = { drawn: false };

  function infoBtn(key) {
    return '<button type="button" class="mh-info" data-mh-info="' + key + '" aria-label="What is this?">i</button>';
  }
  function sectionShell(id, title, infoKey, bodyHtml) {
    return '<section class="mh-sec" data-mh-sec="' + id + '">' +
      '<div class="mh-sec-head"><h4 class="mh-sec-title">' + escT(title) + "</h4>" + (infoKey ? infoBtn(infoKey) : "") + "</div>" +
      '<div class="mh-sec-body" id="mhSec-' + id + '">' + bodyHtml + "</div></section>";
  }
  function skelTiles(n) {
    var s = '<div class="mh-tiles" aria-hidden="true">';
    for (var i = 0; i < n; i++) s += '<div class="mh-tile"><div class="skel mh-skel-line"></div><div class="skel mh-skel-big"></div><div class="skel mh-skel-line"></div></div>';
    return s + "</div>";
  }
  function errHtml(what, sec) {
    return '<p class="mh-note">' + escT(what) + ' could not load right now. <button type="button" class="mh-retry" data-mh-retry="' + sec + '">Retry</button></p>';
  }
  function updLine() {
    return '<p class="mh-upd">Free Yahoo feed · about 15 min delayed · updated ' + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + "</p>";
  }

  function buildSheet() {
    var m = document.createElement("div");
    m.id = "markethubSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Market Hub");
    m.innerHTML = '<div class="modal-card mh-card">' +
      '<div class="mh-head"><h3>Market Hub</h3>' +
      '<button type="button" class="icon-btn" id="mhRefresh" aria-label="Refresh market data"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v4h-4"/></svg></button>' +
      '<button type="button" class="icon-btn" id="mhClose" aria-label="Close">✕</button></div>' +
      '<div class="mh-body" id="mhBody">' +
      '<div class="mh-status" id="mhStatus"><span class="mh-dot mh-dot-off"></span><span class="mh-status-txt">Checking market hours…</span></div>' +
      '<div id="mhSections"></div>' +
      '<details class="mh-custom" id="mhCustom"><summary>Customise this hub</summary><div class="mh-custom-body" id="mhCustomBody"></div></details>' +
      '<p class="mh-foot">Prices and index levels come from the free Yahoo Finance feed, about 15 minutes delayed. ' +
      'The market open/closed line is worked out on this device from the IST clock and a built-in NSE holiday list for 2026. ' +
      'Information only — not investment advice.</p>' +
      "</div></div>";
    document.body.appendChild(m);
    wire(m);
    return m;
  }

  var SECTIONS = [
    { id: "india", title: "India indices", info: "day" },
    { id: "global", title: "World indices", info: "day" },
    { id: "fx", title: "Currency & commodities", info: "fx" },
    { id: "sectors", title: "Sector heat", info: "sectors" },
    { id: "movers", title: "NIFTY 50 stocks — today's movers (delayed prices)", info: "movers" },
    { id: "watch52", title: "My watchlist — 52-week position", info: "watch52" },
    { id: "compare", title: "Compare stocks", info: "compare" }
  ];

  function renderSections() {
    var s = mhSettings();
    var host = sheetEl.querySelector("#mhSections");
    host.innerHTML = SECTIONS.filter(function (d) { return s.show[d.id]; }).map(function (d) {
      var body = d.id === "compare" ? compareShell() : (d.id === "india" || d.id === "global" ? skelTiles(4) : (d.id === "fx" ? skelTiles(5) : '<div class="skel mh-skel-block"></div>'));
      return sectionShell(d.id, d.title, d.info, body);
    }).join("");
    var cb = sheetEl.querySelector("#mhCustomBody");
    cb.innerHTML = SECTIONS.map(function (d) {
      return '<label class="mh-set-row"><span>' + escT(d.title) + '</span><span class="mh-switch"><input type="checkbox" data-mh-show="' + d.id + '"' + (s.show[d.id] ? " checked" : "") + "><i></i></span></label>";
    }).join("") + '<p class="mh-note">Choices are saved with your Folio profile, like your other settings.</p>';
  }

  /* ---------- status ---------- */
  function paintStatus() {
    var el = sheetEl && sheetEl.querySelector("#mhStatus");
    if (!el) return;
    var st = M.marketStatus(new Date(), NSE_HOLIDAYS_2026);
    el.innerHTML = '<span class="mh-dot ' + (st.open ? "mh-dot-on" : "mh-dot-off") + '"></span><span class="mh-status-txt"><b>' +
      escT(st.label) + "</b> · " + escT(st.detail) +
      (st.covered ? "" : ' <span class="mh-muted">(weekday schedule — 2027 holidays are not in the app yet)</span>') + "</span>";
  }

  /* ---------- tiles ---------- */
  function tileHtml(def, q, sub) {
    if (!q) return "";
    var chg = q.dayPct == null ? '<span class="mh-muted">—</span>' :
      '<span class="' + (q.dayPct >= 0 ? "mh-up" : "mh-dn") + '">' + (q.dayPct >= 0 ? "▲ " : "▼ ") + fmtPct(Math.abs(q.dayPct)) + "</span>";
    return '<div class="mh-tile"><span class="mh-tile-name">' + escT(def.label) + "</span>" +
      '<b class="mh-tile-val">' + fmtNum(q.level, def.digits) + "</b>" +
      '<span class="mh-tile-sub">' + chg + (sub ? ' <span class="mh-muted">' + escT(sub) + "</span>" : "") + "</span></div>";
  }
  function paintTiles(secId, defs, quotes, subFn) {
    var el = sheetEl && sheetEl.querySelector("#mhSec-" + secId);
    if (!el) return;
    var html = "";
    defs.forEach(function (d, i) { html += tileHtml(d, quotes[i], subFn ? subFn(d) : (d.unit || d.note || "")); });
    el.innerHTML = html ? '<div class="mh-tiles">' + html + "</div>" + updLine() : errHtml("Market data", secId);
  }
  function loadTiles(tok) {
    var s = mhSettings();
    if (s.show.india) {
      Promise.all(INDIA_TILES.map(function (d) { return quoteViaHistory(d.sym); }))
        .then(function (qs) { if (tok === loadToken) paintTiles("india", INDIA_TILES, qs, function (d) { return d.note || ""; }); });
    }
    if (s.show.global) {
      Promise.all(GLOBAL_TILES.map(function (d) { return quoteViaHistory(d.sym); }))
        .then(function (qs) {
          if (tok !== loadToken) return;
          paintTiles("global", GLOBAL_TILES, qs, function (d) { return d.place + " · " + M.localTime(new Date(), d.tz); });
        });
    }
    if (s.show.fx) {
      Promise.all(FX_TILES.map(function (d) { return quoteViaValidated(d.sym); }))
        .then(function (qs) { if (tok === loadToken) paintTiles("fx", FX_TILES, qs, function (d) { return d.unit; }); });
    }
    if (s.show.sectors) loadSectors(tok);
  }
  function loadSectors(tok) {
    var el = sheetEl && sheetEl.querySelector("#mhSec-sectors");
    if (!el) return;
    Promise.all(SECTOR_TILES.map(function (d) { return quoteViaHistory(d.sym); })).then(function (qs) {
      if (tok !== loadToken) return;
      var cells = "";
      SECTOR_TILES.forEach(function (d, i) {
        var q = qs[i];
        if (!q || q.dayPct == null) return;
        var a = Math.min(0.75, Math.abs(q.dayPct) / 3 + 0.12).toFixed(2);
        cells += '<span class="mh-heat-cell" style="background:' + (q.dayPct >= 0 ? "rgba(47,158,68," : "rgba(224,49,49,") + a + ')">' +
          escT(d.label) + " " + (q.dayPct >= 0 ? "▲" : "▼") + " " + Math.abs(q.dayPct).toFixed(1) + "%</span>";
      });
      el.innerHTML = cells ? '<div class="mh-heat">' + cells + "</div>" + updLine() : errHtml("Sector data", "sectors");
    });
  }

  /* ---------- NIFTY movers (lazy) ---------- */
  function loadMovers(tok) {
    var el = sheetEl && sheetEl.querySelector("#mhSec-movers");
    if (!el) return;
    el.innerHTML = '<p class="mh-note" id="mhMoversProg">Loading prices for the NIFTY 50 stocks… 0 / ' + NIFTY50.length + "</p>";
    var done = 0;
    runBatches(NIFTY50, 4, function (sym) {
      return histOf(sym, "1mo").then(function (h) {
        done++;
        var prog = sheetEl && sheetEl.querySelector("#mhMoversProg");
        if (prog && tok === loadToken) prog.textContent = "Loading prices for the NIFTY 50 stocks… " + done + " / " + NIFTY50.length;
        if (!h || !h.points) return { sym: sym, dayPct: null };
        var q = M.quoteFromPoints(h.points);
        return { sym: sym, dayPct: q ? q.dayPct : null, price: q ? q.level : null };
      });
    }).then(function (rows) {
      if (tok !== loadToken) return;
      var mv = M.movers(rows, 5);
      if (!mv.loaded) { el.innerHTML = errHtml("Movers data", "movers"); return; }
      function rowHtml(r, cls) {
        return '<button type="button" class="mh-mv-row" data-mh-stock="' + escT(r.sym) + '"><span class="mh-mv-main"><b>' + escT(r.sym) + '</b><span class="mh-muted">' + escT(stockName(r.sym)) + "</span></span>" +
          '<span class="mh-mv-px">' + (Number.isFinite(r.price) ? "₹" + fmtNum(r.price) : "") + '</span><span class="' + cls + '">' + fmtPct(r.dayPct) + "</span></button>";
      }
      el.innerHTML =
        '<div class="mh-mv-cols"><div class="mh-mv-col"><div class="mh-mv-h mh-up">Top gainers</div>' +
        (mv.gainers.length ? mv.gainers.map(function (r) { return rowHtml(r, "mh-up"); }).join("") : '<p class="mh-note">No stock is up today among those loaded.</p>') +
        '</div><div class="mh-mv-col"><div class="mh-mv-h mh-dn">Top losers</div>' +
        (mv.losers.length ? mv.losers.map(function (r) { return rowHtml(r, "mh-dn"); }).join("") : '<p class="mh-note">No stock is down today among those loaded.</p>') +
        "</div></div>" +
        '<p class="mh-note">Based on ' + mv.loaded + " of " + NIFTY50.length + " stocks loaded · tap a stock to open it.</p>" + updLine();
    });
  }

  /* ---------- watchlist 52-week (lazy) ---------- */
  function loadWatch52(tok) {
    var el = sheetEl && sheetEl.querySelector("#mhSec-watch52");
    if (!el) return;
    var syms = watchSyms();
    if (!syms.length) {
      el.innerHTML = '<p class="mh-note">Your watchlist is empty. Add stocks in the Watchlist tab and their 52-week positions will show here.</p>';
      return;
    }
    el.innerHTML = '<div class="skel mh-skel-block"></div>';
    runBatches(syms, 4, function (sym) {
      return histOf(sym, "1y").then(function (h) {
        return { sym: sym, r: h && h.points ? M.range52(h.points) : null };
      });
    }).then(function (rows) {
      if (tok !== loadToken) return;
      var ok = rows.filter(function (x) { return x.r; }).sort(function (a, b) { return b.r.posPct - a.r.posPct; });
      if (!ok.length) { el.innerHTML = errHtml("52-week data", "watch52"); return; }
      el.innerHTML = ok.map(function (x) {
        var r = x.r;
        return '<button type="button" class="mh-w52-row" data-mh-stock="' + escT(x.sym) + '"><span class="mh-w52-main"><b>' + escT(x.sym) + '</b><span class="mh-muted">' + escT(stockName(x.sym)) + "</span></span>" +
          '<span class="mh-w52-bar"><span class="mh-w52-track"><i style="left:' + r.posPct.toFixed(0) + '%"></i></span>' +
          '<span class="mh-w52-lbl">₹' + fmtNum(r.lo) + " — ₹" + fmtNum(r.hi) + "</span></span>" +
          '<span class="mh-w52-fig"><b>₹' + fmtNum(r.last) + "</b><span>" + fmtPct(r.belowHighPct, 1) + " from high · " + fmtPct(r.aboveLowPct, 1) + " above low</span></span></button>";
      }).join("") +
        '<p class="mh-note">Range worked out from 1 year of daily closing prices (' + ok.length + " of " + syms.length + " watchlist stocks loaded).</p>" + updLine();
    });
  }

  /* ---------- compare ---------- */
  function compareShell() {
    return '<div class="mh-cmp-pick" id="mhCmpPick"></div>' +
      '<div class="mh-cmp-add"><select id="mhCmpSel" class="mh-select" aria-label="Pick a stock to compare"></select>' +
      '<input id="mhCmpInput" class="mh-input" type="text" placeholder="Or type a symbol, e.g. RELIANCE" autocomplete="off" autocapitalize="characters">' +
      '<button type="button" class="mh-add-btn" id="mhCmpAdd">Add</button></div>' +
      '<div class="ds-seg mh-cmp-seg" id="mhCmpSeg" role="group" aria-label="Compare range">' +
      ["1M", "3M", "6M", "1Y"].map(function (r) { return '<button type="button" class="ds-seg__btn" data-mh-range="' + r + '" aria-pressed="false">' + r + "</button>"; }).join("") + "</div>" +
      '<div id="mhCmpBody"><p class="mh-note">Pick 2 to 4 stocks to compare their percentage performance.</p></div>';
  }
  function cmpCandidates() {
    var seen = {}, out = [];
    heldSyms().concat(watchSyms()).forEach(function (s) { if (s && !seen[s]) { seen[s] = 1; out.push(s); } });
    return out;
  }
  function syncCompareControls() {
    var s = mhSettings();
    var pick = sheetEl.querySelector("#mhCmpPick");
    if (pick) {
      pick.innerHTML = s.compareSyms.length ? s.compareSyms.map(function (sym, i) {
        return '<span class="mh-chip" style="border-color:' + CMP_COLORS[i % 4] + '"><i style="background:' + CMP_COLORS[i % 4] + '"></i>' + escT(sym) +
          '<button type="button" data-mh-cmp-del="' + escT(sym) + '" aria-label="Remove ' + escT(sym) + '">✕</button></span>';
      }).join("") : '<span class="mh-muted">No stocks picked yet.</span>';
    }
    var sel = sheetEl.querySelector("#mhCmpSel");
    if (sel) {
      var cands = cmpCandidates().filter(function (x) { return s.compareSyms.indexOf(x) < 0; });
      sel.innerHTML = cands.length ? cands.map(function (x) { return '<option value="' + escT(x) + '">' + escT(x) + (stockName(x) ? " — " + escT(stockName(x)) : "") + "</option>"; }).join("") : '<option value="">No more holdings / watchlist stocks</option>';
    }
    sheetEl.querySelectorAll("#mhCmpSeg .ds-seg__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.mhRange === s.compareRange ? "true" : "false");
    });
  }
  function drawCompare() {
    var body = sheetEl && sheetEl.querySelector("#mhCmpBody");
    if (!body) return;
    var s = mhSettings();
    var syms = s.compareSyms.slice(0, 4);
    if (syms.length < 2) {
      body.innerHTML = '<p class="mh-note">Pick at least 2 stocks to draw the comparison.</p>';
      cmpState.drawn = syms.length === 0;
      return;
    }
    var range = s.compareRange, rk = RANGE_KEY[range], days = RANGE_DAYS[range];
    body.innerHTML = '<div class="skel mh-skel-block"></div>';
    var tok = loadToken;
    Promise.all(syms.map(function (sym) { return histOf(sym, rk); })).then(function (hists) {
      if (tok !== loadToken || !sheetEl || sheetEl.classList.contains("hidden")) return;
      var body2 = sheetEl.querySelector("#mhCmpBody");
      if (!body2) return;
      var series = [], missing = [];
      syms.forEach(function (sym, i) {
        var h = hists[i];
        var n = h && h.points ? M.normalizeSeries(h.points, days, Date.now()) : null;
        if (n) series.push({ sym: sym, color: CMP_COLORS[i % 4], n: n });
        else missing.push(sym);
      });
      if (!series.length) {
        body2.innerHTML = '<p class="mh-note">Price history could not load for the picked stocks right now.</p>';
        return;
      }
      var all = [];
      series.forEach(function (sr) { sr.n.vals.forEach(function (v) { all.push(v.v); }); });
      var mn = Math.min.apply(null, all.concat([0])), mx = Math.max.apply(null, all.concat([0]));
      var t0 = Math.min.apply(null, series.map(function (sr) { return sr.n.vals[0].t; }));
      var t1 = Math.max.apply(null, series.map(function (sr) { return sr.n.vals[sr.n.vals.length - 1].t; }));
      var W = 680, H = 200, P = 8;
      var X = function (t) { return P + (t - t0) / Math.max(1, t1 - t0) * (W - 2 * P); };
      var Y = function (v) { return H - P - (v - mn) / Math.max(0.01, mx - mn) * (H - 2 * P); };
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="mh-cmp-svg" role="img" aria-label="Normalised performance comparison">' +
        '<line x1="' + P + '" y1="' + Y(0).toFixed(1) + '" x2="' + (W - P) + '" y2="' + Y(0).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 3"/>';
      series.forEach(function (sr) {
        if (sr.n.vals.length > 1) svg += '<path d="' + sr.n.vals.map(function (p, j) { return (j ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1); }).join(" ") + '" fill="none" stroke="' + sr.color + '" stroke-width="1.8"/>';
      });
      svg += "</svg>";
      var legend = series.map(function (sr) {
        return '<span class="mh-cmp-leg"><i style="background:' + sr.color + '"></i><b>' + escT(sr.sym) + "</b> " +
          '<span class="' + (sr.n.finalPct >= 0 ? "mh-up" : "mh-dn") + '">' + fmtPct(sr.n.finalPct, 1) + "</span></span>";
      }).join("");
      body2.innerHTML = svg + '<div class="mh-cmp-legs">' + legend + "</div>" +
        (missing.length ? '<p class="mh-note">No price history in the free feed for ' + missing.map(escT).join(", ") + " — left out of the chart.</p>" : "") +
        '<p class="mh-note">Performance over ' + range + ', each stock reset to 0% at the start. Price-only.</p>';
      cmpState.drawn = true;
    });
  }

  /* ---------- lazy sections ---------- */
  var io = null;
  function armLazy() {
    if (io) { io.disconnect(); io = null; }
    var body = sheetEl.querySelector("#mhBody");
    if (!("IntersectionObserver" in window)) {
      ["movers", "watch52", "compare"].forEach(function (id) { startLazy(id); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { startLazy(en.target.dataset.mhSec); io.unobserve(en.target); }
      });
    }, { root: body, rootMargin: "240px" });
    sheetEl.querySelectorAll("[data-mh-sec]").forEach(function (sec) {
      var id = sec.dataset.mhSec;
      if ((id === "movers" || id === "watch52" || id === "compare") && !lazyDone[id]) io.observe(sec);
    });
  }
  function startLazy(id) {
    if (lazyDone[id]) return;
    var s = mhSettings();
    if (!s.show[id]) return;
    lazyDone[id] = true;
    if (id === "movers") loadMovers(loadToken);
    else if (id === "watch52") loadWatch52(loadToken);
    else if (id === "compare") { syncCompareControls(); drawCompare(); }
  }

  /* ---------- open / refresh ---------- */
  function openHub(opts) {
    if (!sheetEl) sheetEl = buildSheet();
    loadToken++;
    lazyDone = {};
    cmpState.drawn = false;
    renderSections();
    paintStatus();
    sheetEl.classList.remove("hidden");
    if (statusTimer) clearInterval(statusTimer);
    statusTimer = setInterval(function () {
      if (!sheetEl || sheetEl.classList.contains("hidden")) { clearInterval(statusTimer); statusTimer = null; return; }
      paintStatus();
    }, 30000);
    loadTiles(loadToken);
    armLazy();
    if (opts && opts.section) {
      setTimeout(function () {
        var sec = sheetEl && sheetEl.querySelector('[data-mh-sec="' + opts.section + '"]');
        if (sec) { try { sec.scrollIntoView({ block: "start" }); } catch (e) {} }
      }, 60);
    }
  }
  function refreshHub() {
    quoteCache = {};
    loadToken++;
    lazyDone = {};
    renderSections();
    paintStatus();
    loadTiles(loadToken);
    armLazy(); /* the observer fires at once for sections already in view; the rest stay lazy */
  }

  /* ---------- wiring ---------- */
  function openStockFrom(sym) {
    if (sheetEl) sheetEl.classList.add("hidden");
    try { if (typeof openStock === "function") openStock(sym); } catch (e) {}
  }
  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#mhClose")) { m.classList.add("hidden"); return; }
      if (t.closest("#mhRefresh")) { refreshHub(); return; }
      var info = t.closest("[data-mh-info]");
      if (info) { toastMsg(EXPLAIN[info.dataset.mhInfo] || ""); return; }
      var retry = t.closest("[data-mh-retry]");
      if (retry) {
        var sec = retry.dataset.mhRetry;
        if (sec === "movers") { lazyDone.movers = false; loadMovers(loadToken); }
        else if (sec === "watch52") { lazyDone.watch52 = false; loadWatch52(loadToken); }
        else if (sec === "sectors") loadSectors(loadToken);
        else loadTiles(loadToken);
        return;
      }
      var stock = t.closest("[data-mh-stock]");
      if (stock) { openStockFrom(stock.dataset.mhStock); return; }
      var del = t.closest("[data-mh-cmp-del]");
      if (del) {
        var s = mhSettings();
        s.compareSyms = s.compareSyms.filter(function (x) { return x !== del.dataset.mhCmpDel; });
        mhSave(); syncCompareControls(); drawCompare();
        return;
      }
      var rg = t.closest("[data-mh-range]");
      if (rg) {
        var s2 = mhSettings();
        s2.compareRange = rg.dataset.mhRange;
        mhSave(); syncCompareControls(); drawCompare();
        return;
      }
      if (t.closest("#mhCmpAdd")) {
        var s3 = mhSettings();
        var inp = m.querySelector("#mhCmpInput"), sel = m.querySelector("#mhCmpSel");
        var typed = inp && inp.value ? inp.value.trim().toUpperCase().replace(/\s+/g, "") : "";
        var sym = typed || (sel ? sel.value : "");
        if (!sym) { toastMsg("Pick a stock from the list, or type its symbol first."); return; }
        if (s3.compareSyms.indexOf(sym) >= 0) { toastMsg(sym + " is already in the comparison."); return; }
        if (s3.compareSyms.length >= 4) { toastMsg("Compare holds up to 4 stocks — remove one first."); return; }
        s3.compareSyms.push(sym);
        mhSave();
        if (inp) inp.value = "";
        syncCompareControls(); drawCompare();
        return;
      }
    });
    m.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.mhShow) {
        var s = mhSettings();
        s.show[t.dataset.mhShow] = !!t.checked;
        mhSave();
        loadToken++;
        lazyDone = {}; /* section DOM was rebuilt — lazy loads re-arm */
        renderSections();
        loadTiles(loadToken);
        armLazy();
      }
    });
  }

  window.FolioMarketHub = { open: openHub, holidays: function () { return NSE_HOLIDAYS_2026; } }; /* holidays accessor added Phase 6G — the Calendar module reuses this one list via window.folioNseHolidays() instead of duplicating it */
})();
