/* ================= FOLIO MUTUAL FUNDS (Phase 6D) =================
   Lazy module — loaded on first open via window.folioOpenMutualFunds()
   in features.js (same contract as tools.js / ptools.js / markethub.js).
   NOT in SW CORE. Nothing in this module runs at app startup.

   DATA: the free open API at api.mfapi.in ONLY (brief-sanctioned;
   CORS-open, no key). mfapi republishes AMFI's official NAV data:
   - GET https://api.mfapi.in/mf/search?q=<text>  -> [{schemeCode,
     schemeName}] (verified live 2026-11-16; multi-word queries can
     return [] even for real schemes, so an empty result is retried
     once with the first word of the query — same endpoint, and the
     UI says when it did so).
   - GET https://api.mfapi.in/mf/<schemeCode>     -> {meta:{fund_house,
     scheme_type, scheme_category, scheme_code, scheme_name}, data:
     [{date:"DD-MM-YYYY", nav:"210.17020"} ...]} newest first.
   No scraping of AMFI / AMC / aggregator sites, no API keys. A failed
   fetch shows an honest error state with Retry — never a stale or
   invented number (the NAV date is printed wherever a NAV is shown,
   so freshness is always visible).

   This section is a TRACKER / EXPLORER. It is NOT a holding type:
   nothing here touches the holdings schema, portfolio totals or XIRR.
   The only things persisted are the user's saved scheme codes and
   their hypothetical SIP inputs, in state.profile.mutualfunds (the
   insX pattern — rides the cloud doc / .folio vault via persist()).
   NAV data itself is cached in memory for the session only, keyed by
   scheme code with the latest NAV date stored as its freshness key;
   it is never written into the cloud doc.

   RETURNS, worked out on-device from the NAV series (returns are
   already inside NAV — dividends/bonus are reflected in it, so no
   separate adjustment is made or needed):
   - Windows under 1 year (1M/3M/6M) show the ABSOLUTE point-to-point
     % between the latest NAV and the NAV on or before the window
     start (nearest-prior convention — never interpolated).
   - Windows of 1 year and up (1Y/3Y/5Y) show CAGR % per year over the
     ACTUAL elapsed time between the two NAV dates used.
   - "Since start" runs from the first NAV in the series mfapi
     returns for the scheme to the latest NAV.
   Every returns table prints the exact NAV dates it used. Fields
   mfapi does not provide (expense ratio, benchmark, AUM) are simply
   not shown — never guessed.

   SIP maths: the projection uses the SAME annuity-due convention as
   the Tools Hub SIP calculator (FolioToolsMath.sipFV in tools.js):
   deposit at the START of each month, monthly growth i = pct/1200,
   simulated month by month. The "past SIP outcome" mode instead
   walks the scheme's real NAV history: one instalment at the start
   of each month, bought at the first NAV on or after that date,
   valued at the latest NAV. It is labelled a past outcome, never a
   prediction. */
(function () {
  "use strict";

  var MF_API = "https://api.mfapi.in/mf/";

  /* ---------- formatting: ride the app's helpers when present ---------- */
  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fmtInr(n) {
    try { if (typeof inr === "function") return inr(n); } catch (e) {}
    return Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—";
  }
  function fmtPct(x, digits) {
    if (!Number.isFinite(x)) return "—";
    return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 2 : digits) + "%";
  }
  function fmtNav(n) {
    return Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "—";
  }
  function num(v) { var n = (typeof v === "number") ? v : parseFloat(v); return Number.isFinite(n) ? n : null; }
  function toastMsg(m) { try { if (typeof toast === "function") { toast(m); return; } } catch (e) {} }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(ms) {
    if (!Number.isFinite(ms)) return "—";
    var d = new Date(ms);
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  /* ---------- persistence (insX pattern: state.profile + persist()) ---------- */
  function mfSettings() {
    try {
      var p = state.profile || (state.profile = {});
      if (!p.mutualfunds || typeof p.mutualfunds !== "object") p.mutualfunds = {};
      var s = p.mutualfunds;
      if (!Array.isArray(s.saved)) s.saved = [];
      s.saved = s.saved.map(String).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
      if (!s.sip || typeof s.sip !== "object") s.sip = {};
      if (!Number.isFinite(s.sip.amount) || s.sip.amount <= 0) s.sip.amount = 10000;
      if (!Number.isFinite(s.sip.years) || s.sip.years <= 0) s.sip.years = 5;
      return s;
    } catch (e) {
      return { saved: [], sip: { amount: 10000, years: 5 } };
    }
  }
  function mfSave() { try { persist(); } catch (e) {} }
  function isSaved(code) { return mfSettings().saved.indexOf(String(code)) >= 0; }
  function setSaved(code, on) {
    var s = mfSettings();
    code = String(code);
    var i = s.saved.indexOf(code);
    if (on && i < 0) s.saved.push(code);
    if (!on && i >= 0) s.saved.splice(i, 1);
    mfSave();
  }

  var EXPLAIN = {
    nav: "NAV is the price of one unit of the fund on that date, published by the fund house and collected by AMFI. mfapi.in republishes the same official figures. Gains and dividends declared by the fund are already reflected in its NAV.",
    returns: "Returns are worked out on this device from the fund's NAV history. Windows under one year show the simple (absolute) change; one year and longer show CAGR — the steady per-year rate that would produce the same overall change over the actual dates used. Past returns do not guarantee future returns.",
    pastsip: "This replays real history: the monthly amount is treated as invested at the start of each month, buying units at that month's first published NAV, and the units are valued at the latest NAV. It shows what actually happened in this scheme — it is not a prediction of what will happen next.",
    projection: "A projection assumes the return you type in and compounds it monthly, depositing at the start of each month — the same maths as Folio's SIP Calculator in Calculators & Tools. The assumed return is your guess, not a promise; the fund's own past CAGR is only pre-filled as a starting point."
  };

  /* ================= PURE LOGIC (window.FolioMutualFundsMath — harness-tested) ================= */
  var M = {};

  /* mfapi dates are "DD-MM-YYYY"; ISO "YYYY-MM-DD" is also tolerated.
     Returns UTC ms at midnight, or null. */
  M.parseDate = function (s) {
    if (typeof s !== "string") return null;
    var m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      var t = Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      return Number.isFinite(t) ? t : null;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var t2 = Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      return Number.isFinite(t2) ? t2 : null;
    }
    return null;
  };

  /* Normalise one mfapi scheme payload. Tolerant of key aliases so a
     small upstream rename degrades instead of breaking; fields mfapi
     does not send stay empty and the UI hides them. NAV rows come
     back newest-first upstream; the result is ascending by date,
     de-duplicated (last row for a date wins) with bad rows dropped. */
  M.normScheme = function (raw) {
    if (!raw || typeof raw !== "object") return null;
    var meta = (raw.meta && typeof raw.meta === "object") ? raw.meta : {};
    var code = meta.scheme_code != null ? meta.scheme_code : (meta.schemeCode != null ? meta.schemeCode : raw.schemeCode);
    var rows = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw.navs) ? raw.navs : (Array.isArray(raw.history) ? raw.history : []));
    var byT = {};
    rows.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      var t = M.parseDate(r.date != null ? r.date : r.navDate);
      var nav = num(r.nav != null ? r.nav : r.value);
      if (t == null || nav == null || nav <= 0) return;
      byT[t] = { t: t, nav: nav, dateStr: String(r.date != null ? r.date : r.navDate) };
    });
    var navs = Object.keys(byT).map(function (k) { return byT[k]; }).sort(function (a, b) { return a.t - b.t; });
    return {
      code: code != null ? String(code) : "",
      name: String(meta.scheme_name || meta.schemeName || raw.schemeName || ""),
      house: String(meta.fund_house || meta.fundHouse || ""),
      category: String(meta.scheme_category || meta.schemeCategory || ""),
      type: String(meta.scheme_type || meta.schemeType || ""),
      navs: navs
    };
  };

  /* Normalise an mfapi search payload: [{schemeCode, schemeName}]. */
  M.normSearch = function (raw) {
    if (!Array.isArray(raw)) return [];
    var seen = {}, out = [];
    raw.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      var code = r.schemeCode != null ? r.schemeCode : (r.scheme_code != null ? r.scheme_code : r.code);
      var name = r.schemeName || r.scheme_name || r.name || "";
      if (code == null || !name) return;
      code = String(code);
      if (seen[code]) return;
      seen[code] = 1;
      out.push({ code: code, name: String(name) });
    });
    return out;
  };

  /* navs ascending. Last point with t <= ms (nearest-prior), or null. */
  M.navOnOrBefore = function (navs, ms) {
    if (!Array.isArray(navs) || !navs.length) return null;
    var lo = 0, hi = navs.length - 1, ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (navs[mid].t <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans >= 0 ? navs[ans] : null;
  };
  /* First point with t >= ms, or null. */
  M.navOnOrAfter = function (navs, ms) {
    if (!Array.isArray(navs) || !navs.length) return null;
    var lo = 0, hi = navs.length - 1, ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (navs[mid].t >= ms) { ans = mid; hi = mid - 1; } else lo = mid + 1;
    }
    return ans >= 0 ? navs[ans] : null;
  };

  /* One window's return: latest NAV vs the NAV on or before
     (latest - days). pct is the absolute change; cagrPct annualises
     it over the ACTUAL elapsed years between the two NAV dates. */
  M.windowReturn = function (navs, days) {
    if (!Array.isArray(navs) || navs.length < 2) return null;
    var last = navs[navs.length - 1];
    var start = M.navOnOrBefore(navs, last.t - days * 86400000);
    if (!start || start.t >= last.t || !(start.nav > 0)) return null;
    var years = (last.t - start.t) / 86400000 / 365.25;
    var ratio = last.nav / start.nav;
    return {
      fromT: start.t, fromNav: start.nav, toT: last.t, toNav: last.nav,
      pct: (ratio - 1) * 100,
      years: years,
      cagrPct: years > 0 ? (Math.pow(ratio, 1 / years) - 1) * 100 : null
    };
  };

  /* The returns table. kind "abs" = show pct; kind "cagr" = show
     cagrPct (per year). ALL runs first NAV -> latest NAV. */
  M.WINDOWS = [
    { key: "1M", label: "1 Month", days: 30, kind: "abs" },
    { key: "3M", label: "3 Months", days: 91, kind: "abs" },
    { key: "6M", label: "6 Months", days: 182, kind: "abs" },
    { key: "1Y", label: "1 Year", days: 365, kind: "cagr" },
    { key: "3Y", label: "3 Years", days: 1095, kind: "cagr" },
    { key: "5Y", label: "5 Years", days: 1826, kind: "cagr" }
  ];
  M.returnsTable = function (navs) {
    var out = {};
    M.WINDOWS.forEach(function (w) { out[w.key] = M.windowReturn(navs, w.days); });
    if (Array.isArray(navs) && navs.length >= 2) {
      var first = navs[0], last = navs[navs.length - 1];
      var years = (last.t - first.t) / 86400000 / 365.25;
      var ratio = last.nav / first.nav;
      out.ALL = {
        fromT: first.t, fromNav: first.nav, toT: last.t, toNav: last.nav,
        pct: (ratio - 1) * 100, years: years,
        cagrPct: years > 0 ? (Math.pow(ratio, 1 / years) - 1) * 100 : null
      };
    } else out.ALL = null;
    return out;
  };

  /* SIP projection — the Tools Hub formula, mirrored exactly
     (FolioToolsMath.sipFV with no step-up): deposit at the START of
     each month, monthly growth i = annualPct/1200, month by month. */
  M.sipFV = function (monthly, annualPct, years) {
    var i = annualPct / 100 / 12, n = Math.round(years * 12), fv = 0;
    for (var m = 0; m < n; m++) fv = (fv + monthly) * (1 + i);
    return fv;
  };

  M.addMonthsUTC = function (ms, k) {
    var d = new Date(ms);
    var day = d.getUTCDate();
    var first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
    var dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, dim),
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  };
  /* Whole calendar months from aMs to bMs (day-of-month ignored). */
  M.monthsBetween = function (aMs, bMs) {
    var a = new Date(aMs), b = new Date(bMs);
    return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  };

  /* Past SIP outcome over real NAV history. One instalment at the
     start of each month for `years` years ending at the latest NAV,
     each bought at the first NAV on or after its date. When the
     series is shorter than the request, the run is capped at the
     whole months available and `capped` says so. */
  M.pastSip = function (navs, monthly, years) {
    if (!Array.isArray(navs) || navs.length < 2 || !(monthly > 0) || !(years > 0)) return null;
    var first = navs[0], last = navs[navs.length - 1];
    var availMonths = M.monthsBetween(first.t, last.t);
    if (availMonths < 1) return null;
    var wantMonths = Math.round(years * 12);
    var months = Math.min(wantMonths, availMonths);
    if (months < 1) return null;
    var startMs = M.addMonthsUTC(last.t, -months);
    var units = 0, count = 0, firstBuyT = null;
    for (var k = 0; k < months; k++) {
      var hit = M.navOnOrAfter(navs, M.addMonthsUTC(startMs, k));
      if (!hit) break;
      units += monthly / hit.nav;
      count++;
      if (firstBuyT == null) firstBuyT = hit.t;
    }
    if (!count) return null;
    var invested = monthly * count;
    var value = units * last.nav;
    return {
      units: units, invested: invested, value: value,
      gainPct: invested > 0 ? (value / invested - 1) * 100 : null,
      count: count, months: months, capped: months < wantMonths,
      firstBuyT: firstBuyT, lastT: last.t
    };
  };

  /* Points for the NAV chart: the last `days` (null = all), thinned
     to at most `max` points, first and last always kept. */
  M.chartPoints = function (navs, days, max) {
    if (!Array.isArray(navs) || !navs.length) return [];
    max = max || 160;
    var pts = navs;
    if (days != null) {
      var cutoff = navs[navs.length - 1].t - days * 86400000;
      pts = navs.filter(function (p) { return p.t >= cutoff; });
      if (pts.length < 2) pts = navs.slice(-2);
    }
    if (pts.length <= max) return pts.slice();
    var stride = Math.ceil(pts.length / max), out = [];
    for (var i = 0; i < pts.length; i += stride) out.push(pts[i]);
    if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
    return out;
  };

  window.FolioMutualFundsMath = M;

  /* ================= fetching (mfapi.in only) ================= */
  var schemeCache = {};    /* code -> {scheme, navDate} — session only */
  var schemeInflight = {}; /* code -> Promise */

  function fetchJson(url) {
    return new Promise(function (resolve, reject) {
      if (typeof fetch !== "function") { reject(new Error("fetch unavailable")); return; }
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) {} } }, 15000);
      fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(resolve, function (e) { clearTimeout(timer); reject(e); });
    });
  }
  function getScheme(code, force) {
    code = String(code);
    if (!force && schemeCache[code]) return Promise.resolve(schemeCache[code].scheme);
    if (!force && schemeInflight[code]) return schemeInflight[code];
    var p = fetchJson(MF_API + encodeURIComponent(code)).then(function (raw) {
      var s = M.normScheme(raw);
      delete schemeInflight[code];
      if (!s || !s.navs.length) throw new Error("no NAV data for this scheme");
      if (!s.code) s.code = code;
      schemeCache[code] = { scheme: s, navDate: s.navs[s.navs.length - 1].dateStr };
      return s;
    }).catch(function (e) { delete schemeInflight[code]; throw e; });
    schemeInflight[code] = p;
    return p;
  }
  /* Search. mfapi's search can return [] for a multi-word query that
     names a real scheme (verified in the feasibility pass), so an
     empty first attempt is retried once with the first word only —
     same endpoint; `retried` tells the UI to say so. */
  function searchSchemes(q) {
    var url = MF_API + "search?q=" + encodeURIComponent(q);
    return fetchJson(url).then(function (raw) {
      var list = M.normSearch(raw);
      var words = q.trim().split(/\s+/);
      if (!list.length && words.length > 1 && words[0].length >= 3) {
        return fetchJson(MF_API + "search?q=" + encodeURIComponent(words[0])).then(function (raw2) {
          return { list: M.normSearch(raw2), retried: words[0] };
        });
      }
      return { list: list, retried: null };
    });
  }

  /* ================= sheet ================= */
  var sheetEl = null, loadToken = 0;
  var view = "home";                 /* "home" | "detail" */
  var curCode = null, curScheme = null, chartRange = "1Y";
  var sipMode = "past";              /* "past" | "proj" */
  var projRetSeededFor = null;       /* code the projection % was pre-filled for */
  var lastQuery = "";
  var searchTimer = null, searchToken = 0;

  function infoBtn(key) {
    return '<button type="button" class="mf-info" data-mf-info="' + key + '" aria-label="What is this?">i</button>';
  }
  function starBtn(code, big) {
    var on = isSaved(code);
    return '<button type="button" class="mf-star' + (on ? " mf-star-on" : "") + (big ? " mf-star-big" : "") + '" data-mf-star="' + escT(code) + '" aria-label="' + (on ? "Remove from My Schemes" : "Save to My Schemes") + '" aria-pressed="' + (on ? "true" : "false") + '">' + (on ? "★" : "☆") + "</button>";
  }
  function errHtml(what, retryKey) {
    return '<p class="mf-note">' + escT(what) + ' could not load right now. <button type="button" class="mf-retry" data-mf-retry="' + retryKey + '">Retry</button></p>';
  }
  function pctChip(v) {
    if (!Number.isFinite(v)) return '<span class="mf-muted">—</span>';
    return '<span class="' + (v >= 0 ? "mf-up" : "mf-dn") + '">' + fmtPct(v) + "</span>";
  }

  function buildSheet() {
    var m = document.createElement("div");
    m.id = "mutualfundsSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Mutual Funds");
    m.innerHTML = '<div class="modal-card mf-card">' +
      '<div class="mf-head"><h3>Mutual Funds</h3>' +
      '<button type="button" class="icon-btn" id="mfRefresh" aria-label="Refresh fund data"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v4h-4"/></svg></button>' +
      '<button type="button" class="icon-btn" id="mfClose" aria-label="Close">✕</button></div>' +
      '<div class="mf-body" id="mfBody">' +
      '<div id="mfHome">' +
      '<section class="mf-sec"><div class="mf-sec-head"><h4 class="mf-sec-title">Find a scheme</h4>' + infoBtn("nav") + "</div>" +
      '<div class="mf-search"><input id="mfSearchInput" class="mf-input" type="search" placeholder="Type a fund name — e.g. Parag Parikh Flexi Cap" autocomplete="off" aria-label="Search mutual fund schemes">' +
      '<button type="button" class="mf-add-btn" id="mfSearchBtn">Search</button></div>' +
      '<div id="mfSearchOut"><p class="mf-note">Search covers every Indian mutual fund scheme in AMFI\'s list, via the free mfapi.in service. Tap a scheme to see its NAV history, returns and SIP outcomes. This section only tracks and explores — Folio does not buy or sell funds.</p></div></section>' +
      '<section class="mf-sec"><div class="mf-sec-head"><h4 class="mf-sec-title">My Schemes</h4></div><div id="mfSaved"></div></section>' +
      "</div>" +
      '<div id="mfDetail" class="hidden"></div>' +
      '<p class="mf-foot">NAV data: mfapi.in, republishing AMFI\'s official figures — free, no account needed. Returns are worked out on this device from that NAV history. Past returns do not guarantee future returns. Information only — not investment advice.</p>' +
      "</div></div>";
    document.body.appendChild(m);
    wire(m);
    return m;
  }

  /* ---------- home: saved schemes ---------- */
  function renderSaved(tok) {
    var el = sheetEl && sheetEl.querySelector("#mfSaved");
    if (!el) return;
    var s = mfSettings();
    if (!s.saved.length) {
      el.innerHTML = '<p class="mf-note">No schemes saved yet. Search for a fund above and tap ☆ to keep it here — its latest NAV and 1-year return will show on this list.</p>';
      return;
    }
    el.innerHTML = s.saved.map(function (code) {
      return '<div class="mf-row" data-mf-row="' + escT(code) + '"><span class="mf-row-main"><b>Scheme ' + escT(code) + '</b><span class="mf-muted">Loading…</span></span><span class="skel mf-skel-line mf-row-skel"></span>' + starBtn(code) + "</div>";
    }).join("");
    s.saved.forEach(function (code) {
      getScheme(code).then(function (sch) {
        if (tok !== loadToken || !sheetEl) return;
        var row = sheetEl.querySelector('[data-mf-row="' + code + '"]');
        if (!row) return;
        var last = sch.navs[sch.navs.length - 1];
        var r1 = M.windowReturn(sch.navs, 365);
        row.innerHTML = '<button type="button" class="mf-row-open" data-mf-open="' + escT(code) + '"><span class="mf-row-main"><b>' + escT(sch.name || ("Scheme " + code)) + '</b><span class="mf-muted">' + escT(sch.house) + "</span></span>" +
          '<span class="mf-row-fig"><b>₹' + fmtNav(last.nav) + '</b><span class="mf-muted">NAV ' + escT(last.dateStr) + '</span><span class="mf-row-ret">1Y ' + pctChip(r1 ? r1.cagrPct : null) + "</span></span></button>" + starBtn(code);
      }).catch(function () {
        if (tok !== loadToken || !sheetEl) return;
        var row = sheetEl.querySelector('[data-mf-row="' + code + '"]');
        if (row) row.innerHTML = '<span class="mf-row-main"><b>Scheme ' + escT(code) + '</b><span class="mf-muted">Could not load right now.</span></span><button type="button" class="mf-retry" data-mf-retry="saved">Retry</button>' + starBtn(code);
      });
    });
  }

  /* ---------- home: search ---------- */
  function runSearch() {
    var inp = sheetEl && sheetEl.querySelector("#mfSearchInput");
    var out = sheetEl && sheetEl.querySelector("#mfSearchOut");
    if (!inp || !out) return;
    var q = inp.value.trim();
    lastQuery = q;
    if (q.length < 3) {
      out.innerHTML = '<p class="mf-note">Type at least 3 letters of the fund name to search.</p>';
      return;
    }
    var tok = ++searchToken;
    out.innerHTML = '<div class="skel mf-skel-block"></div>';
    searchSchemes(q).then(function (res) {
      if (tok !== searchToken || !sheetEl) return;
      var out2 = sheetEl.querySelector("#mfSearchOut");
      if (!out2) return;
      if (!res.list.length) {
        out2.innerHTML = '<p class="mf-note">No schemes matched "' + escT(q) + '". Check the spelling, or try the fund house name (for example "Parag" or "Quant").</p>';
        return;
      }
      var shown = res.list.slice(0, 40);
      out2.innerHTML = (res.retried ? '<p class="mf-note">No exact match for the full name — showing matches for "' + escT(res.retried) + '".</p>' : "") +
        shown.map(function (r) {
          return '<div class="mf-row"><button type="button" class="mf-row-open" data-mf-open="' + escT(r.code) + '"><span class="mf-row-main"><b>' + escT(r.name) + '</b><span class="mf-muted">Scheme code ' + escT(r.code) + "</span></span></button>" + starBtn(r.code) + "</div>";
        }).join("") +
        (res.list.length > shown.length ? '<p class="mf-note">Showing the first ' + shown.length + " of " + res.list.length + " matches — type more of the name to narrow it down.</p>" : "");
    }).catch(function () {
      if (tok !== searchToken || !sheetEl) return;
      var out3 = sheetEl.querySelector("#mfSearchOut");
      if (out3) out3.innerHTML = errHtml("Scheme search", "search");
    });
  }

  /* ---------- detail ---------- */
  function openDetail(code, force) {
    code = String(code);
    view = "detail"; curCode = code; curScheme = null; projRetSeededFor = null;
    var home = sheetEl.querySelector("#mfHome"), det = sheetEl.querySelector("#mfDetail");
    if (home) home.classList.add("hidden");
    if (det) { det.classList.remove("hidden"); det.innerHTML = '<div class="skel mf-skel-block"></div><div class="skel mf-skel-block"></div>'; }
    var tok = ++loadToken;
    getScheme(code, force).then(function (sch) {
      if (tok !== loadToken || !sheetEl || view !== "detail" || curCode !== code) return;
      curScheme = sch;
      renderDetail();
    }).catch(function () {
      if (tok !== loadToken || !sheetEl) return;
      var det2 = sheetEl.querySelector("#mfDetail");
      if (det2) det2.innerHTML = '<button type="button" class="mf-back" data-mf-back="1">← All schemes</button>' + errHtml("This scheme", "detail");
    });
  }
  function showHome() {
    view = "home"; curCode = null; curScheme = null;
    var home = sheetEl.querySelector("#mfHome"), det = sheetEl.querySelector("#mfDetail");
    if (det) { det.classList.add("hidden"); det.innerHTML = ""; }
    if (home) home.classList.remove("hidden");
    renderSaved(loadToken);
  }

  function renderDetail() {
    var det = sheetEl && sheetEl.querySelector("#mfDetail");
    if (!det || !curScheme) return;
    var sch = curScheme, navs = sch.navs;
    var last = navs[navs.length - 1], first = navs[0];
    var rt = M.returnsTable(navs);
    var meta = [];
    if (sch.house) meta.push(escT(sch.house));
    if (sch.category) meta.push(escT(sch.category));
    if (sch.type) meta.push(escT(sch.type));
    var retRows = M.WINDOWS.map(function (w) {
      var r = rt[w.key];
      if (!r) return '<div class="mf-ret-row"><span class="mf-ret-lab">' + w.label + '</span><span class="mf-ret-val mf-muted">—</span><span class="mf-ret-kind mf-muted">not enough history</span></div>';
      var v = w.kind === "cagr" ? r.cagrPct : r.pct;
      return '<div class="mf-ret-row"><span class="mf-ret-lab">' + w.label + '</span><span class="mf-ret-val ' + (v >= 0 ? "mf-up" : "mf-dn") + '">' + fmtPct(v) + '</span><span class="mf-ret-kind mf-muted">' + (w.kind === "cagr" ? "per year (CAGR)" : "absolute") + " · " + fmtDate(r.fromT) + " → " + fmtDate(r.toT) + "</span></div>";
    }).join("");
    var ra = rt.ALL;
    var allRow = ra ? '<div class="mf-ret-row"><span class="mf-ret-lab">Since ' + fmtDate(ra.fromT) + '</span><span class="mf-ret-val ' + (ra.pct >= 0 ? "mf-up" : "mf-dn") + '">' + fmtPct(ra.pct) + '</span><span class="mf-ret-kind mf-muted">' + (ra.cagrPct != null && ra.years >= 1 ? fmtPct(ra.cagrPct) + " per year (CAGR) · " : "") + "whole period in the free data</span></div>" : "";
    det.innerHTML =
      '<button type="button" class="mf-back" data-mf-back="1">← All schemes</button>' +
      '<div class="mf-det-head"><div class="mf-det-title"><h4>' + escT(sch.name || ("Scheme " + sch.code)) + "</h4>" +
      (meta.length ? '<p class="mf-muted">' + meta.join(" · ") + "</p>" : "") + "</div>" + starBtn(sch.code, true) + "</div>" +
      '<div class="mf-nav-block"><span class="mf-nav-lab">Latest NAV ' + infoBtn("nav") + '</span><b class="mf-nav-val">₹' + fmtNav(last.nav) + '</b><span class="mf-muted">as of ' + escT(last.dateStr) + " · NAV history in the free data starts " + fmtDate(first.t) + "</span></div>" +
      '<section class="mf-sec"><div class="mf-sec-head"><h4 class="mf-sec-title">Returns</h4>' + infoBtn("returns") + '</div><div class="mf-ret">' + retRows + allRow + "</div>" +
      '<p class="mf-note">Worked out from the NAVs above (' + fmtDate(first.t) + " → " + fmtDate(last.t) + "). Past returns do not guarantee future returns.</p></section>" +
      '<section class="mf-sec"><div class="mf-sec-head"><h4 class="mf-sec-title">NAV history</h4></div>' +
      '<div class="ds-seg mf-seg" id="mfChartSeg" role="group" aria-label="Chart range">' +
      ["1Y", "3Y", "ALL"].map(function (r) { return '<button type="button" class="ds-seg__btn" data-mf-chart="' + r + '" aria-pressed="' + (r === chartRange ? "true" : "false") + '">' + (r === "ALL" ? "All" : r) + "</button>"; }).join("") + "</div>" +
      '<div id="mfChart"></div></section>' +
      '<section class="mf-sec"><div class="mf-sec-head"><h4 class="mf-sec-title">SIP in this scheme</h4></div>' +
      '<div class="ds-seg mf-seg" id="mfSipSeg" role="group" aria-label="SIP mode">' +
      '<button type="button" class="ds-seg__btn" data-mf-sipmode="past" aria-pressed="' + (sipMode === "past" ? "true" : "false") + '">Past outcome</button>' +
      '<button type="button" class="ds-seg__btn" data-mf-sipmode="proj" aria-pressed="' + (sipMode === "proj" ? "true" : "false") + '">Projection</button></div>' +
      '<div class="mf-sip-grid">' +
      '<label class="mf-field"><span>Monthly SIP (₹)</span><input id="mfSipAmt" class="mf-input" type="number" inputmode="numeric" min="100" step="100"></label>' +
      '<label class="mf-field"><span>Years</span><input id="mfSipYrs" class="mf-input" type="number" inputmode="numeric" min="1" max="30" step="1"></label>' +
      '<label class="mf-field" id="mfRetWrap"><span>Assumed return (% per year)</span><input id="mfSipRet" class="mf-input" type="number" inputmode="decimal" min="0" max="30" step="0.5"></label>' +
      "</div>" +
      '<div id="mfSipOut"></div></section>';
    var s = mfSettings();
    var amt = sheetEl.querySelector("#mfSipAmt"), yrs = sheetEl.querySelector("#mfSipYrs");
    if (amt) amt.value = s.sip.amount;
    if (yrs) yrs.value = Math.min(30, Math.max(1, Math.round(s.sip.years)));
    drawChart();
    renderSip();
  }

  function drawChart() {
    var host = sheetEl && sheetEl.querySelector("#mfChart");
    if (!host || !curScheme) return;
    var days = chartRange === "1Y" ? 365 : (chartRange === "3Y" ? 1095 : null);
    var pts = M.chartPoints(curScheme.navs, days, 160);
    if (pts.length < 2) { host.innerHTML = '<p class="mf-note">Not enough NAV history to draw a chart.</p>'; return; }
    var mn = Infinity, mx = -Infinity;
    pts.forEach(function (p) { if (p.nav < mn) mn = p.nav; if (p.nav > mx) mx = p.nav; });
    if (!(mx > mn)) { host.innerHTML = '<p class="mf-note">The NAV has not moved in this period.</p>'; return; }
    var W = 680, H = 180, P = 8;
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    var X = function (t) { return P + (t - t0) / Math.max(1, t1 - t0) * (W - 2 * P); };
    var Y = function (v) { return H - P - (v - mn) / (mx - mn) * (H - 2 * P); };
    var dAttr = pts.map(function (p, j) { return (j ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.nav).toFixed(1); }).join(" ");
    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" class="mf-chart-svg" role="img" aria-label="NAV history chart"><path d="' + dAttr + '" fill="none" stroke="var(--accent)" stroke-width="1.8"/></svg>' +
      '<div class="mf-chart-lbl"><span>' + fmtDate(t0) + " · ₹" + fmtNav(pts[0].nav) + "</span><span>" + fmtDate(t1) + " · ₹" + fmtNav(pts[pts.length - 1].nav) + "</span></div>";
  }

  /* ---------- SIP block ---------- */
  function renderSip() {
    var out = sheetEl && sheetEl.querySelector("#mfSipOut");
    if (!out || !curScheme) return;
    var s = mfSettings();
    var amtEl = sheetEl.querySelector("#mfSipAmt"), yrsEl = sheetEl.querySelector("#mfSipYrs"), retEl = sheetEl.querySelector("#mfSipRet");
    var amt = amtEl ? num(amtEl.value) : s.sip.amount;
    var yrs = yrsEl ? num(yrsEl.value) : s.sip.years;
    var retWrap = sheetEl.querySelector("#mfRetWrap");
    if (retWrap) retWrap.style.display = sipMode === "proj" ? "" : "none";
    sheetEl.querySelectorAll("#mfSipSeg .ds-seg__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.mfSipmode === sipMode ? "true" : "false");
    });
    if (!(amt > 0) || !(yrs > 0)) { out.innerHTML = '<p class="mf-note">Enter a monthly amount and a number of years to see the outcome.</p>'; return; }
    yrs = Math.min(30, Math.max(1, Math.round(yrs)));
    if (sipMode === "past") {
      var r = M.pastSip(curScheme.navs, amt, yrs);
      if (!r) { out.innerHTML = '<p class="mf-note">Not enough NAV history in the free data to replay a monthly SIP for this scheme.</p>'; return; }
      out.innerHTML = '<div class="mf-sip-head"><b>Past SIP outcome — not a prediction</b>' + infoBtn("pastsip") + "</div>" +
        '<div class="mf-kv"><span>Invested (' + r.count + ' monthly instalments)</span><b class="ds-amt">' + fmtInr(r.invested) + "</b></div>" +
        '<div class="mf-kv"><span>Value at the latest NAV (' + fmtDate(r.lastT) + ')</span><b class="ds-amt">' + fmtInr(r.value) + "</b></div>" +
        '<div class="mf-kv"><span>Gain</span><b class="' + (r.gainPct >= 0 ? "mf-up" : "mf-dn") + '">' + fmtPct(r.gainPct) + "</b></div>" +
        (r.capped ? '<p class="mf-note">This scheme\'s NAV history in the free data covers ' + r.months + ' months, so the outcome uses ' + (r.months / 12).toFixed(r.months % 12 ? 1 : 0) + " years — the longest that can be replayed honestly.</p>" : "") +
        '<p class="mf-note">First instalment bought at the NAV of ' + fmtDate(r.firstBuyT) + ". Past performance does not guarantee future returns.</p>";
      return;
    }
    /* projection */
    if (retEl && projRetSeededFor !== curCode) {
      var rt5 = M.windowReturn(curScheme.navs, 1826);
      retEl.value = rt5 && rt5.cagrPct != null ? Math.max(0, Math.round(rt5.cagrPct * 2) / 2) : 12;
      projRetSeededFor = curCode;
    }
    var ret = retEl ? num(retEl.value) : null;
    if (ret == null || ret < 0) { out.innerHTML = '<p class="mf-note">Type an assumed return (% per year) to see the projection.</p>'; return; }
    var fv = M.sipFV(amt, ret, yrs), inv = amt * 12 * yrs;
    out.innerHTML = '<div class="mf-sip-head"><b>Projection at your assumed return</b>' + infoBtn("projection") + "</div>" +
      '<div class="mf-kv"><span>You would invest</span><b class="ds-amt">' + fmtInr(inv) + "</b></div>" +
      '<div class="mf-kv"><span>Projected value</span><b class="ds-amt">' + fmtInr(fv) + "</b></div>" +
      '<div class="mf-kv"><span>Growth part</span><b class="ds-amt">' + fmtInr(fv - inv) + "</b></div>" +
      '<p class="mf-note">Assumes ' + fmtPct(ret).replace("+", "") + ' every year, deposited at the start of each month — the same maths as the SIP Calculator in Calculators &amp; Tools. An assumption, not a promise: real returns vary year to year.</p>';
  }
  function saveSipInputs() {
    var s = mfSettings();
    var amtEl = sheetEl && sheetEl.querySelector("#mfSipAmt"), yrsEl = sheetEl && sheetEl.querySelector("#mfSipYrs");
    var amt = amtEl ? num(amtEl.value) : null, yrs = yrsEl ? num(yrsEl.value) : null;
    var changed = false;
    if (amt > 0 && amt !== s.sip.amount) { s.sip.amount = amt; changed = true; }
    if (yrs > 0 && Math.round(yrs) !== Math.round(s.sip.years)) { s.sip.years = Math.round(yrs); changed = true; }
    if (changed) mfSave();
  }

  /* ---------- open / refresh ---------- */
  function openMF(opts) {
    opts = opts || {};
    if (!sheetEl) sheetEl = buildSheet();
    loadToken++;
    sheetEl.classList.remove("hidden");
    if (opts.code) openDetail(opts.code);
    else showHome();
  }
  function refreshMF() {
    schemeCache = {}; schemeInflight = {};
    loadToken++;
    if (view === "detail" && curCode) openDetail(curCode, true);
    else { showHome(); if (lastQuery) runSearch(); }
  }

  /* ---------- wiring ---------- */
  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#mfClose")) { m.classList.add("hidden"); return; }
      if (t.closest("#mfRefresh")) { refreshMF(); return; }
      var info = t.closest("[data-mf-info]");
      if (info) { toastMsg(EXPLAIN[info.dataset.mfInfo] || ""); return; }
      var star = t.closest("[data-mf-star]");
      if (star) {
        var code = star.dataset.mfStar;
        var on = !isSaved(code);
        setSaved(code, on);
        toastMsg(on ? "Saved to My Schemes." : "Removed from My Schemes.");
        /* repaint every star for this code + the saved list */
        m.querySelectorAll('[data-mf-star="' + code + '"]').forEach(function (b) {
          var now = isSaved(code);
          b.classList.toggle("mf-star-on", now);
          b.textContent = now ? "★" : "☆";
          b.setAttribute("aria-pressed", now ? "true" : "false");
        });
        if (view === "home") renderSaved(loadToken);
        return;
      }
      var open = t.closest("[data-mf-open]");
      if (open) { openDetail(open.dataset.mfOpen); return; }
      if (t.closest("[data-mf-back]")) { showHome(); return; }
      if (t.closest("#mfSearchBtn")) { runSearch(); return; }
      var retry = t.closest("[data-mf-retry]");
      if (retry) {
        var k = retry.dataset.mfRetry;
        if (k === "search") runSearch();
        else if (k === "saved") renderSaved(loadToken);
        else if (k === "detail" && curCode) openDetail(curCode, true);
        return;
      }
      var ch = t.closest("[data-mf-chart]");
      if (ch) {
        chartRange = ch.dataset.mfChart;
        m.querySelectorAll("#mfChartSeg .ds-seg__btn").forEach(function (b) {
          b.setAttribute("aria-pressed", b.dataset.mfChart === chartRange ? "true" : "false");
        });
        drawChart();
        return;
      }
      var sm = t.closest("[data-mf-sipmode]");
      if (sm) { sipMode = sm.dataset.mfSipmode; renderSip(); return; }
    });
    m.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "mfSearchInput") {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(runSearch, 350);
        return;
      }
      if (t.id === "mfSipAmt" || t.id === "mfSipYrs" || t.id === "mfSipRet") { saveSipInputs(); renderSip(); }
    });
    m.addEventListener("keydown", function (e) {
      if (e.target && e.target.id === "mfSearchInput" && e.key === "Enter") { e.preventDefault(); runSearch(); }
    });
  }

  window.FolioMutualFunds = { open: openMF };
})();
