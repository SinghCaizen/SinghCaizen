/* ============================================================================
   FolioAnalytics — pure analytics engine for "FOLIO by Singh Caizen"
   ----------------------------------------------------------------------------
   Pure vanilla JS: no DOM, no fetch, no app globals, no imports.
   Everything arrives as plain data; everything returned is JSON-serializable.
   Safe to load lazily in the page AND inside a Web Worker via importScripts.

   BASIS (must match the app exactly):
   - The app works on NIFTY trading days (~1 year window) and computes
     flow-adjusted daily portfolio returns  r = (V[i] - FLOW[i]) / V[i-1] - 1
     and drops wild outliers. The engine either takes those ready-made
     (input.rets / input.brets, aligned pairwise) or rebuilds them from
     V + FLOW with exactly that formula (dropping non-finite values and
     |r| > 0.5, which for a whole portfolio can only be a data error).
   - Annualization: 252 trading days. Risk-free rate rf is an annual decimal
     (default 0.065); daily rf = rf / 252.
   - If the return chain has < 60 points, portfolio history-dependent outputs
     are null and the result carries enough:false. Weights / HHI (which need
     no history) still compute.

   UNITS (see ANALYTICS.md for the full table):
   - Returns, vol, alpha, tracking error, impacts: decimal fractions
     (0.05 = 5%).
   - Fields named *Pct, VaR/CVaR, maxDD.pct, currentDD.pct, risk
     contributions, capture ratios and positive-month ratio: PERCENT units
     (5 = 5%, contributions sum to 100).
   - No NaN / undefined / Infinity ever leaves compute(): every division is
     guarded and a final sanitize pass converts non-finite numbers to null.
   ============================================================================ */
(function () {
  "use strict";

  var TRADING_DAYS = 252;
  var MIN_POINTS = 60;      // portfolio chain minimum ("Needs at least 60 days of data")
  var PAIR_MIN = 30;        // minimum paired observations for stock-level stats
  var OUTLIER = 0.5;        // |daily portfolio return| above this = data error
  var NEED_60 = "Needs at least 60 days of data";
  var NO_FREE = "Not available in free data";

  /* ------------------------------ utilities ------------------------------ */

  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function arr(x) { return Object.prototype.toString.call(x) === "[object Array]" ? x : []; }
  function isArr(x) { return Object.prototype.toString.call(x) === "[object Array]"; }

  function mean(a) {
    if (!a.length) return null;
    var s = 0; for (var i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
  }
  // Sample variance / stdev (denominator n-1). Null when not computable.
  function variance(a, m) {
    if (a.length < 2) return null;
    if (m == null) m = mean(a);
    var s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; }
    return s / (a.length - 1);
  }
  function stdev(a, m) { var v = variance(a, m); return v == null ? null : Math.sqrt(v); }

  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  // Type-7 (linear interpolation) quantile of an ascending-sorted array.
  function quantileSorted(s, q) {
    if (!s.length) return null;
    var pos = q * (s.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  function prod1p(a, from, to) { // product of (1 + a[i]) for i in [from, to)
    var p = 1; for (var i = from; i < to; i++) p *= (1 + a[i]);
    return p;
  }
  // Date helpers: accept "YYYY-MM-DD" strings, epoch ms, or Date objects.
  function yearOf(d) {
    if (d == null) return null;
    if (typeof d === "string") { var m = d.match(/^(\d{4})/); if (m) return +m[1]; }
    var dt = (d instanceof Date) ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.getFullYear();
  }
  function monthKeyOf(d) { // "YYYY-MM" or null
    if (d == null) return null;
    if (typeof d === "string") { var m = d.match(/^(\d{4})-(\d{2})/); if (m) return m[1] + "-" + m[2]; }
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    var mm = dt.getMonth() + 1;
    return dt.getFullYear() + "-" + (mm < 10 ? "0" : "") + mm;
  }
  // mulberry32: small deterministic PRNG (reproducible Monte Carlo).
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Safety net: no non-finite number may leave the engine.
  function sanitize(o) {
    if (typeof o === "number") return isFinite(o) ? o : null;
    if (isArr(o)) { var r = []; for (var i = 0; i < o.length; i++) r.push(sanitize(o[i])); return r; }
    if (o && typeof o === "object" && !(o instanceof Date)) {
      var k, out = {};
      for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = sanitize(o[k]);
      return out;
    }
    return o === undefined ? null : o;
  }
  // Formatting helpers for report-card reasons (fractions -> "12.3%").
  function pctF(x, dp) { return (x * 100).toFixed(dp == null ? 1 : dp) + "%"; }
  function pctS(x, dp) { var v = x * 100; return (v > 0 ? "+" : "") + v.toFixed(dp == null ? 1 : dp) + "%"; }

  /* --------------------------- chain building ---------------------------- */
  /* Returns { rets:[], brets:[]|null, retDates:[] } — rets[k] is the return
     ENDING on retDates[k]; brets (when present) is aligned with rets and may
     contain nulls where the benchmark close was unusable that day. */
  function benchRetAt(bench, i) {
    var bp = bench[i - 1], bc = bench[i];
    if (isNum(bp) && isNum(bc) && bp > 0) { var b = bc / bp - 1; if (isNum(b)) return b; }
    return null;
  }
  function buildChain(input) {
    var dates = arr(input.dates);
    var rets = null, brets = null, retDates = null, k, i;

    if (arr(input.rets).length) {
      // Ready-made chain from the app (basis preserved verbatim).
      rets = input.rets.slice();
      if (arr(input.brets).length) brets = input.brets.slice();
      if (arr(input.retDates).length === rets.length) retDates = input.retDates.slice();
      else if (dates.length === rets.length + 1) retDates = dates.slice(1);
      else if (dates.length === rets.length) retDates = dates.slice();
      else { retDates = []; for (k = 0; k < rets.length; k++) retDates.push(null); }
      if (brets && brets.length !== rets.length) { // app promises pairwise; truncate defensively
        var m = Math.min(brets.length, rets.length);
        rets = rets.slice(0, m); brets = brets.slice(0, m); retDates = retDates.slice(0, m);
      }
      if (!brets && arr(input.bench).length) {
        // Derive benchmark returns assuming rets[k] ends on dates[k+1]
        // (or dates[k] when the arrays are the same length).
        var bench = input.bench, cand = [];
        if (bench.length === dates.length && dates.length === rets.length + 1) {
          for (k = 0; k < rets.length; k++) cand.push(benchRetAt(bench, k + 1));
          brets = cand;
        } else if (bench.length === dates.length && dates.length === rets.length) {
          cand.push(null);
          for (k = 1; k < rets.length; k++) cand.push(benchRetAt(bench, k));
          brets = cand;
        }
      }
    } else if (arr(input.V).length > 1) {
      // Rebuild with the app's exact formula: r = (V[i] - FLOW[i]) / V[i-1] - 1.
      var V = input.V, FLOW = arr(input.FLOW), bench2 = arr(input.bench);
      rets = []; brets = []; retDates = [];
      var benchAligned = bench2.length === V.length;
      for (i = 1; i < V.length; i++) {
        var prev = V[i - 1], cur = V[i];
        if (!isNum(prev) || !isNum(cur) || prev <= 0) continue;
        var f = isNum(FLOW[i]) ? FLOW[i] : 0;
        var r = (cur - f) / prev - 1;
        if (!isNum(r) || Math.abs(r) > OUTLIER) continue; // wild outlier = data error
        rets.push(r);
        brets.push(benchAligned ? benchRetAt(bench2, i) : null);
        retDates.push(dates[i] != null ? dates[i] : null);
      }
      if (!benchAligned) brets = null;
    }

    if (!rets) rets = [];
    // Drop pairs whose portfolio return is unusable; keep alignment.
    var cr = [], cb = [], cd = [];
    for (k = 0; k < rets.length; k++) {
      if (!isNum(rets[k])) continue;
      cr.push(rets[k]);
      cb.push(brets ? (isNum(brets[k]) ? brets[k] : null) : null);
      cd.push(retDates ? retDates[k] : null);
    }
    return { rets: cr, brets: brets ? cb : null, retDates: cd };
  }
  // Paired portfolio/benchmark returns (both usable).
  function paired(rets, brets) {
    var p = [], b = [];
    if (!brets) return { p: p, b: b };
    for (var i = 0; i < rets.length; i++) if (isNum(brets[i])) { p.push(rets[i]); b.push(brets[i]); }
    return { p: p, b: b };
  }

  /* --------------------------- drawdown engine --------------------------- */
  /* wealth: unitized (or raw value) series, index 0 = start. dates optional,
     same length as wealth. pct fields are PERCENT (50 = 50%).
     Episode length is measured peak -> recovery in steps (trading days);
     recoveryDays is trough -> first index back at/above the peak level. */
  function drawdownStats(w, dts) {
    var out = {
      maxDD: { pct: 0, peakDate: null, troughDate: null },
      currentDD: { pct: 0, peakDate: null, days: 0 },
      longestDD: { days: 0, recovered: true, recoveryDays: 0 }
    };
    if (!w || w.length < 2) return out;
    var peakVal = w[0], peakIdx = 0;
    var maxPct = 0, maxPeakIdx = 0, maxTroughIdx = 0;
    var epOpen = false, epPeakIdx = 0, epPeakVal = 0, epTroughIdx = 0, epTroughVal = 0;
    var best = { days: 0, recovered: true, recoveryDays: 0 };
    function closeEpisode(recoveryIdx) {
      var days = recoveryIdx - epPeakIdx;
      if (days > best.days) best = { days: days, recovered: true, recoveryDays: recoveryIdx - epTroughIdx };
    }
    for (var i = 0; i < w.length; i++) {
      var v = w[i];
      if (!isNum(v)) continue;
      if (v > peakVal) {
        if (epOpen) { closeEpisode(i); epOpen = false; }
        peakVal = v; peakIdx = i;
      } else if (v < peakVal) {
        if (peakVal > 0) {
          var dd = (1 - v / peakVal) * 100;
          if (!epOpen) { epOpen = true; epPeakIdx = peakIdx; epPeakVal = peakVal; epTroughIdx = i; epTroughVal = v; }
          else if (v < epTroughVal) { epTroughVal = v; epTroughIdx = i; }
          if (dd > maxPct) { maxPct = dd; maxPeakIdx = peakIdx; maxTroughIdx = i; }
        }
      } else if (epOpen && v >= epPeakVal) { // exactly back at the peak level
        closeEpisode(i); epOpen = false;
      }
    }
    if (epOpen) {
      var openDays = (w.length - 1) - epPeakIdx;
      if (openDays > best.days) best = { days: openDays, recovered: false, recoveryDays: null };
    }
    var dt = function (idx) { return dts && dts[idx] != null ? dts[idx] : null; };
    out.maxDD = maxPct > 0
      ? { pct: maxPct, peakDate: dt(maxPeakIdx), troughDate: dt(maxTroughIdx) }
      : { pct: 0, peakDate: null, troughDate: null };
    var lastIdx = w.length - 1;
    out.currentDD = {
      pct: peakVal > 0 ? Math.max(0, (1 - w[lastIdx] / peakVal) * 100) : 0,
      peakDate: dt(peakIdx),
      days: lastIdx - peakIdx
    };
    out.longestDD = best;
    return out;
  }
  function wealthFromRets(rets) {
    var w = [1];
    for (var i = 0; i < rets.length; i++) w.push(w[i] * (1 + rets[i]));
    return w;
  }
  function wealthDates(retDates, dates, nRets) {
    var d = [null];
    if (dates && dates.length === nRets + 1) d[0] = dates[0];
    for (var i = 0; i < nRets; i++) d.push(retDates && retDates[i] != null ? retDates[i] : null);
    return d;
  }

  /* ------------------------------ VaR / CVaR ----------------------------- */
  /* Historical method. Sort returns ascending; idx = floor(0.05 * n);
     VaR return = sorted[idx]; CVaR return = mean of sorted[0..idx]
     (the tail at-or-beyond the VaR point). Reported as POSITIVE percent
     loss (a negative result means the boundary itself was a gain). */
  function varCvar(rets, conf) {
    var a = rets.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    if (!n) return { var95: null, cvar95: null };
    var tail = 1 - (conf == null ? 0.95 : conf);
    var idx = Math.floor(tail * n);
    if (idx >= n) idx = n - 1;
    var varRet = a[idx];
    var s = 0; for (var i = 0; i <= idx; i++) s += a[i];
    var cvarRet = s / (idx + 1);
    return { var95: -varRet * 100, cvar95: -cvarRet * 100 };
  }

  /* ------------------------------ regression ----------------------------- */
  // Ordinary least squares of y on x. Returns nulls when degenerate.
  function linStats(xs, ys) {
    var n = xs.length;
    if (n < 2) return null;
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0, syy = 0, i, dx, dy;
    for (i = 0; i < n; i++) { dx = xs[i] - mx; dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    var beta = sxx > 0 ? sxy / sxx : null;
    var corr = (sxx > 0 && syy > 0) ? sxy / Math.sqrt(sxx * syy) : null;
    return {
      n: n, meanX: mx, meanY: my, beta: beta,
      intercept: (beta != null) ? my - beta * mx : null,
      corr: corr, r2: corr != null ? corr * corr : null
    };
  }

  /* ------------------------------ RETURNS -------------------------------- */
  function computeReturns(rets, retDates) {
    var n = rets.length, i, j;
    var windows = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252 };
    var rolling = {};
    for (var key in windows) {
      var w = windows[key];
      rolling[key] = n >= w ? prod1p(rets, n - w, n) - 1 : null; // strict: null if window > data
    }
    // Calendar years: chain returns whose END date falls in the year.
    var byYear = {}, order = [];
    for (i = 0; i < n; i++) {
      var y = yearOf(retDates[i]);
      if (y == null) continue;
      if (!byYear[y]) { byYear[y] = { year: y, prod: 1, days: 0 }; order.push(y); }
      byYear[y].prod *= (1 + rets[i]); byYear[y].days++;
    }
    order.sort(function (a, b) { return a - b; });
    var calendarYears = order.map(function (yy) {
      return { year: yy, ret: byYear[yy].prod - 1, days: byYear[yy].days };
    });
    // Best / worst: single day, rolling 5-return "week", rolling 21-return "month".
    function bestWorstWindow(win) {
      if (n < win) return { best: null, worst: null };
      var best = null, worst = null, p, e;
      for (var s = 0; s + win <= n; s++) {
        p = prod1p(rets, s, s + win) - 1;
        e = retDates[s + win - 1];
        if (!best || p > best.ret) best = { ret: p, endDate: e != null ? e : null };
        if (!worst || p < worst.ret) worst = { ret: p, endDate: e != null ? e : null };
      }
      return { best: best, worst: worst };
    }
    var bDay = null, wDay = null;
    for (i = 0; i < n; i++) {
      if (!bDay || rets[i] > bDay.ret) bDay = { ret: rets[i], date: retDates[i] != null ? retDates[i] : null };
      if (!wDay || rets[i] < wDay.ret) wDay = { ret: rets[i], date: retDates[i] != null ? retDates[i] : null };
    }
    var bwW = bestWorstWindow(5), bwM = bestWorstWindow(21);
    // Positive months + day streaks.
    var byMonth = {}, mOrder = [];
    for (i = 0; i < n; i++) {
      var mk = monthKeyOf(retDates[i]);
      if (mk == null) continue;
      if (!byMonth[mk]) { byMonth[mk] = 1; mOrder.push(mk); }
      byMonth[mk] *= (1 + rets[i]);
    }
    var posMonths = 0;
    for (j = 0; j < mOrder.length; j++) if (byMonth[mOrder[j]] - 1 > 0) posMonths++;
    var bestStreak = 0, run = 0, greenDays = 0;
    for (i = 0; i < n; i++) {
      if (rets[i] > 0) { greenDays++; run++; if (run > bestStreak) bestStreak = run; }
      else run = 0;
    }
    var curStreak = 0;
    if (n) {
      var sgn = rets[n - 1] > 0 ? 1 : (rets[n - 1] < 0 ? -1 : 0);
      if (sgn !== 0) { var c = 0; for (i = n - 1; i >= 0; i--) { if ((rets[i] > 0 ? 1 : (rets[i] < 0 ? -1 : 0)) === sgn) c++; else break; } curStreak = sgn * c; }
    }
    // Histogram: 12 equal-width bins across [min, max] of the daily returns.
    var mn = Infinity, mx = -Infinity;
    for (i = 0; i < n; i++) { if (rets[i] < mn) mn = rets[i]; if (rets[i] > mx) mx = rets[i]; }
    var bins = [], bw = (mx - mn) / 12;
    for (i = 0; i < 12; i++) bins.push({ from: mn + i * bw, to: mn + (i + 1) * bw, count: 0 });
    for (i = 0; i < n; i++) {
      var bi = bw > 0 ? Math.min(11, Math.floor((rets[i] - mn) / bw)) : 0;
      bins[bi].count++;
    }
    var mu = mean(rets), sd = stdev(rets, mu), skew = null;
    if (n >= 3 && sd != null && sd > 0) {
      var m2 = 0, m3 = 0;
      for (i = 0; i < n; i++) { var d = rets[i] - mu; m2 += d * d; m3 += d * d * d; }
      m2 /= n; m3 /= n;
      if (m2 > 0) skew = (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / Math.pow(m2, 1.5)); // adjusted Fisher-Pearson
    }
    var twrTotal = prod1p(rets, 0, n) - 1;
    var twrAnn = null;
    if (n > 0 && 1 + twrTotal > 0) twrAnn = Math.pow(1 + twrTotal, TRADING_DAYS / n) - 1;
    return {
      rolling: rolling,
      calendarYears: calendarYears,
      bestWorst: {
        day: bDay, worstDay: wDay,
        week: bwW.best, worstWeek: bwW.worst,
        month: bwM.best, worstMonth: bwM.worst
      },
      positiveMonths: {
        ratio: mOrder.length ? (posMonths / mOrder.length) * 100 : null,
        monthsCounted: mOrder.length,
        bestStreak: bestStreak, curStreak: curStreak,
        greenDays: greenDays, totalDays: n
      },
      histogram: { bins: bins, min: mn, max: mx, mean: mu, median: median(rets), skew: skew },
      twrTotal: twrTotal,
      twrAnnualized: twrAnn
    };
  }

  /* -------------------------------- RISK --------------------------------- */
  function computeRisk(rets, brets, retDates, dates, rf, returnsOut) {
    var n = rets.length, i;
    var rfD = rf / TRADING_DAYS;
    var mu = mean(rets), sd = stdev(rets, mu);
    var vol = sd != null ? sd * Math.sqrt(TRADING_DAYS) : null;
    // Downside deviation vs the daily risk-free target (all days in denominator).
    var dsq = 0;
    for (i = 0; i < n; i++) { var ex = rets[i] - rfD; if (ex < 0) dsq += ex * ex; }
    var downsideDaily = n ? Math.sqrt(dsq / n) : null;
    var sharpe = (sd != null && sd > 0 && mu != null) ? (mu - rfD) / sd * Math.sqrt(TRADING_DAYS) : null;
    var sortino = (downsideDaily != null && downsideDaily > 0 && mu != null)
      ? (mu - rfD) / downsideDaily * Math.sqrt(TRADING_DAYS) : null;
    var wealth = wealthFromRets(rets);
    var dd = drawdownStats(wealth, wealthDates(retDates, dates, n));
    var calmar = (returnsOut.twrAnnualized != null && dd.maxDD.pct > 0)
      ? returnsOut.twrAnnualized / (dd.maxDD.pct / 100) : null;
    var vc = varCvar(rets, 0.95);
    // Benchmark-relative stats on the paired subset.
    var pr = paired(rets, brets), beta = null, alpha = null, corr = null, r2 = null, te = null;
    var upCapture = null, downCapture = null, benchAnn = null;
    if (pr.p.length >= 2) {
      var ls = linStats(pr.b, pr.p);
      if (ls) {
        beta = ls.beta; corr = ls.corr; r2 = ls.r2;
        if (beta != null) alpha = ((ls.meanY - rfD) - beta * (ls.meanX - rfD)) * TRADING_DAYS;
      }
      var diffs = [];
      for (i = 0; i < pr.p.length; i++) diffs.push(pr.p[i] - pr.b[i]);
      var teSd = stdev(diffs);
      te = teSd != null ? teSd * Math.sqrt(TRADING_DAYS) : null;
      var upP = [], upB = [], dnP = [], dnB = [];
      for (i = 0; i < pr.p.length; i++) {
        if (pr.b[i] > 0) { upP.push(pr.p[i]); upB.push(pr.b[i]); }
        else if (pr.b[i] < 0) { dnP.push(pr.p[i]); dnB.push(pr.b[i]); }
      }
      var mub;
      if (upB.length && (mub = mean(upB)) !== 0 && mub != null) upCapture = mean(upP) / mub * 100;
      if (dnB.length && (mub = mean(dnB)) !== 0 && mub != null) downCapture = mean(dnP) / mub * 100;
      if (pr.b.length >= MIN_POINTS) {
        var bp = prod1p(pr.b, 0, pr.b.length) - 1;
        if (1 + bp > 0) benchAnn = Math.pow(1 + bp, TRADING_DAYS / pr.b.length) - 1;
      }
    }
    return {
      vol: vol,
      downsideDev: downsideDaily != null ? downsideDaily * Math.sqrt(TRADING_DAYS) : null,
      sharpe: sharpe, sortino: sortino, calmar: calmar,
      maxDD: dd.maxDD, currentDD: dd.currentDD, longestDD: dd.longestDD,
      var95: vc.var95, cvar95: vc.cvar95,
      beta: beta, alpha: alpha, corr: corr, r2: r2, trackingError: te,
      upCapture: upCapture, downCapture: downCapture,
      benchAnn: benchAnn // helper for the report card (documented in ANALYTICS.md)
    };
  }

  /* ------------------------- per-stock day machinery ---------------------- */
  // closes: array aligned with the app dates (may contain nulls).
  // pts: [{i, c}] usable closes in order. retByDay[t]: return ending day t,
  // only when closes at t-1 and t both exist (adjacent trading days).
  function stockSeries(closes) {
    var pts = [], i;
    for (i = 0; i < closes.length; i++) if (isNum(closes[i]) && closes[i] > 0) pts.push({ i: i, c: closes[i] });
    var retByDay = [], ownRets = [], k;
    for (i = 0; i < closes.length; i++) retByDay.push(null);
    for (k = 1; k < pts.length; k++) {
      var r = pts[k].c / pts[k - 1].c - 1;
      if (isNum(r)) {
        ownRets.push(r);
        if (pts[k].i === pts[k - 1].i + 1) retByDay[pts[k].i] = r;
      }
    }
    return { pts: pts, retByDay: retByDay, ownRets: ownRets };
  }
  function benchRetByDay(bench) {
    var out = [], i;
    for (i = 0; i < bench.length; i++) out.push(i === 0 ? null : benchRetAt(bench, i));
    return out;
  }
  // Pair a stock's day-aligned returns with benchmark day returns.
  function pairDay(retByDay, benchByDay, nDays) {
    var xs = [], ys = [];
    for (var t = 0; t < nDays; t++) {
      if (isNum(retByDay[t]) && isNum(benchByDay[t])) { xs.push(benchByDay[t]); ys.push(retByDay[t]); }
    }
    return { x: xs, y: ys };
  }
  function rsiWilder(closes, period) {
    period = period || 14;
    if (closes.length < period + 1) return null;
    var gains = 0, losses = 0, k, ch;
    for (k = 1; k <= period; k++) { ch = closes[k] - closes[k - 1]; if (ch > 0) gains += ch; else losses -= ch; }
    var ag = gains / period, al = losses / period;
    for (k = period + 1; k < closes.length; k++) {
      ch = closes[k] - closes[k - 1];
      ag = (ag * (period - 1) + Math.max(ch, 0)) / period;
      al = (al * (period - 1) + Math.max(-ch, 0)) / period;
    }
    if (al === 0) return ag === 0 ? 50 : 100;
    return 100 - 100 / (1 + ag / al);
  }

  /* -------------------------------- STOCKS -------------------------------- */
  /* Price-path metrics (momentum, MAs, RSI, 52w, own TWR) use the stock's own
     usable closes in order. Day-aligned statistics (vol, beta, corr) use only
     returns between adjacent trading days with both closes present, paired
     against the benchmark's same-day returns; they need >= PAIR_MIN pairs. */
  function computeStocks(symCloses, benchByDay, nDays) {
    var out = {}, syms = Object.keys(symCloses || {}), s, sym;
    for (s = 0; s < syms.length; s++) {
      sym = syms[s];
      var closes = arr(symCloses[sym]);
      var S = stockSeries(closes);
      var pts = S.pts, cs = pts.map(function (p) { return p.c; });
      var last = cs.length ? cs[cs.length - 1] : null;
      // Own time-weighted return over its available window + annualised.
      var twrStock = null, annStock = null;
      if (S.ownRets.length >= 1) {
        twrStock = prod1p(S.ownRets, 0, S.ownRets.length) - 1;
        if (S.ownRets.length >= MIN_POINTS && 1 + twrStock > 0)
          annStock = Math.pow(1 + twrStock, TRADING_DAYS / S.ownRets.length) - 1;
      }
      // Day-aligned returns for vol / beta / corr.
      var aligned = [];
      for (var t = 0; t < S.retByDay.length; t++) if (isNum(S.retByDay[t])) aligned.push(S.retByDay[t]);
      var vol = null;
      if (aligned.length >= PAIR_MIN) { var sdv = stdev(aligned); vol = sdv != null ? sdv * Math.sqrt(TRADING_DAYS) : null; }
      var beta = null, corr = null;
      if (benchByDay) {
        var pr = pairDay(S.retByDay, benchByDay, nDays);
        if (pr.x.length >= PAIR_MIN) { var ls = linStats(pr.x, pr.y); if (ls) { beta = ls.beta; corr = ls.corr; } }
      }
      // Momentum: close-to-close over the last k own returns.
      var mom = {}, wins = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252 }, wk;
      for (wk in wins) {
        var w = wins[wk];
        mom[wk] = (S.ownRets.length >= w && cs.length > w) ? cs[cs.length - 1] / cs[cs.length - 1 - w] - 1 : null;
      }
      // 52-week window = last 252 usable closes (the input window is ~1Y).
      var win = cs.slice(-252), hi = null, lo = null;
      if (win.length) { hi = Math.max.apply(null, win); lo = Math.min.apply(null, win); }
      var ma = function (k) { return cs.length >= k ? mean(cs.slice(-k)) : null; };
      var d20 = ma(20), d50 = ma(50), d200 = ma(200);
      var vs = function (m) { return (m != null && last != null && m > 0) ? (last / m - 1) * 100 : null; };
      var ddStock = cs.length >= 2 ? drawdownStats(cs, null).maxDD.pct : null;
      out[sym] = {
        twrStock: twrStock, annStock: annStock,
        vol: vol, beta: beta, corr: corr,
        mom: mom,
        hi52: hi, lo52: lo,
        distHiPct: (hi && last != null) ? (last / hi - 1) * 100 : null,
        distLoPct: (lo && last != null) ? (last / lo - 1) * 100 : null,
        rangePosPct: (hi != null && lo != null && hi > lo && last != null) ? (last - lo) / (hi - lo) * 100 : null,
        ma: { d20: d20, d50: d50, d200: d200, vs20: vs(d20), vs50: vs(d50), vs200: vs(d200) },
        rsi14: rsiWilder(cs, 14),
        maxDDStock: ddStock
        // ddFromCost is NOT computable here (needs average cost) — the UI adds it.
      };
    }
    return out;
  }

  /* ------------------------------ ALLOCATION ------------------------------ */
  function computeAllocation(input, enough, seriesBySym, benchByDay, nDays, portVol) {
    var weights = input.weights || {};
    var syms = Object.keys(weights).filter(function (s2) { return isNum(weights[s2]); });
    var sorted = syms.slice().sort(function (a, b) { return weights[b] - weights[a]; });
    var topSum = function (k) {
      if (!sorted.length) return null;
      var s = 0; for (var i = 0; i < Math.min(k, sorted.length); i++) s += weights[sorted[i]];
      return s;
    };
    var hhi = null, effN = null;
    if (syms.length) {
      hhi = 0; for (var i = 0; i < syms.length; i++) hhi += weights[syms[i]] * weights[syms[i]];
      effN = hhi > 0 ? 1 / hhi : null;
    }
    var out = {
      top1: topSum(1), top3: topSum(3), top5: topSum(5),
      hhi: hhi, effN: effN,
      corrMatrix: null, divRatio: null, riskContrib: null
    };
    if (!enough) return out; // history-dependent parts stay null

    // Pairwise correlation of day-aligned stock returns (>= PAIR_MIN shared days).
    var csyms = Object.keys(seriesBySym);
    var matrix = [], a, b, i2, j2;
    for (i2 = 0; i2 < csyms.length; i2++) {
      var row = [];
      for (j2 = 0; j2 < csyms.length; j2++) {
        if (i2 === j2) {
          var own = 0;
          for (var t0 = 0; t0 < nDays; t0++) if (isNum(seriesBySym[csyms[i2]].retByDay[t0])) own++;
          row.push(own >= PAIR_MIN ? 1 : null);
          continue;
        }
        var xs = [], ys = [];
        for (var t = 0; t < nDays; t++) {
          var ra = seriesBySym[csyms[i2]].retByDay[t], rb = seriesBySym[csyms[j2]].retByDay[t];
          if (isNum(ra) && isNum(rb)) { xs.push(ra); ys.push(rb); }
        }
        if (xs.length < PAIR_MIN) { row.push(null); continue; }
        var ls = linStats(xs, ys);
        row.push(ls ? ls.corr : null);
      }
      matrix.push(row);
    }
    out.corrMatrix = { syms: csyms, matrix: matrix };

    // Diversification ratio: weighted average of individual vols / portfolio vol.
    if (portVol != null && portVol > 0) {
      var num = 0, wsum = 0;
      for (a = 0; a < syms.length; a++) {
        var S = seriesBySym[syms[a]];
        if (!S || !(weights[syms[a]] > 0)) continue;
        var al = [];
        for (var t2 = 0; t2 < S.retByDay.length; t2++) if (isNum(S.retByDay[t2])) al.push(S.retByDay[t2]);
        if (al.length < PAIR_MIN) continue;
        var sdi = stdev(al);
        if (sdi == null) continue;
        num += weights[syms[a]] * sdi * Math.sqrt(TRADING_DAYS);
        wsum += weights[syms[a]];
      }
      if (wsum > 0) out.divRatio = num / wsum / portVol;
    }

    // Risk contributions: RC_i = w_i * (Sigma w)_i / sigma_p^2 * 100 (percent),
    // covariance from the days where ALL included stocks have a return
    // (listwise), current weights renormalised over the included stocks.
    var inc = syms.filter(function (s3) { return weights[s3] > 0 && seriesBySym[s3]; });
    if (inc.length) {
      var wRaw = inc.map(function (s4) { return weights[s4]; });
      var wTot = wRaw.reduce(function (x, y) { return x + y; }, 0);
      var wv = wRaw.map(function (x) { return x / wTot; });
      var daysIdx = [];
      for (var t3 = 0; t3 < nDays; t3++) {
        var okAll = true;
        for (var k2 = 0; k2 < inc.length; k2++) if (!isNum(seriesBySym[inc[k2]].retByDay[t3])) { okAll = false; break; }
        if (okAll) daysIdx.push(t3);
      }
      if (daysIdx.length >= PAIR_MIN) {
        var m = inc.length, nd = daysIdx.length, means = [], cov = [], ii, jj, dd2;
        for (ii = 0; ii < m; ii++) {
          var col = daysIdx.map(function (ix) { return seriesBySym[inc[ii]].retByDay[ix]; });
          means.push(mean(col));
        }
        for (ii = 0; ii < m; ii++) {
          cov.push([]);
          for (jj = 0; jj < m; jj++) {
            var sxy = 0;
            for (dd2 = 0; dd2 < nd; dd2++)
              sxy += (seriesBySym[inc[ii]].retByDay[daysIdx[dd2]] - means[ii]) *
                     (seriesBySym[inc[jj]].retByDay[daysIdx[dd2]] - means[jj]);
            cov[ii].push(nd > 1 ? sxy / (nd - 1) : 0);
          }
        }
        var sw = []; // (Sigma w)_i
        for (ii = 0; ii < m; ii++) { var acc = 0; for (jj = 0; jj < m; jj++) acc += cov[ii][jj] * wv[jj]; sw.push(acc); }
        var varP = 0; for (ii = 0; ii < m; ii++) varP += wv[ii] * sw[ii];
        if (varP > 0) {
          var raw = inc.map(function (s5, ix2) { return wv[ix2] * sw[ix2] / varP * 100; });
          var rounded = raw.map(function (x) { return Math.round(x * 100) / 100; });
          var rsum = rounded.reduce(function (x, y) { return x + y; }, 0);
          var diff = Math.round((100 - rsum) * 100) / 100;
          if (diff !== 0) { // adjust on the largest contributor so the sum is exactly 100
            var li = 0; for (ii = 1; ii < rounded.length; ii++) if (rounded[ii] > rounded[li]) li = ii;
            rounded[li] = Math.round((rounded[li] + diff) * 100) / 100;
          }
          var rc = {};
          for (ii = 0; ii < m; ii++) rc[inc[ii]] = rounded[ii];
          out.riskContrib = rc;
        }
      }
    }
    return out;
  }

  /* ------------------------------- SCENARIOS ------------------------------ */
  function monteCarlo(rets, paths, seed) {
    var n = rets.length;
    if (!n) return null;
    var rand = mulberry32(seed | 0);
    var stepDays = 21, totalDays = 1260, nSteps = totalDays / stepDays; // 60 monthly steps
    var samples = [], s;
    for (s = 0; s <= nSteps; s++) samples.push(new Array(paths));
    for (var p = 0; p < paths; p++) {
      var cur = 1;
      samples[0][p] = 1;
      for (var day = 1; day <= totalDays; day++) {
        var f = 1 + rets[(rand() * n) | 0];
        if (f < 0) f = 0; // a single day can at most wipe out the value
        cur *= f;
        if (day % stepDays === 0) samples[day / stepDays][p] = cur;
      }
    }
    var bands = {};
    [1, 3, 5].forEach(function (yr) {
      var pts = [], maxSi = 12 * yr;
      for (var si = 0; si <= maxSi; si++) {
        var colArr = samples[si].slice().sort(function (x, y) { return x - y; });
        pts.push({
          step: si * stepDays,
          p5: quantileSorted(colArr, 0.05), p25: quantileSorted(colArr, 0.25),
          p50: quantileSorted(colArr, 0.50), p75: quantileSorted(colArr, 0.75),
          p95: quantileSorted(colArr, 0.95)
        });
      }
      bands[String(yr)] = pts;
    });
    return { paths: paths, seed: seed, stepDays: stepDays, bands: bands };
  }
  function computeScenarios(enough, rets, stocks, weights, input) {
    // Stress test: impact = shock x sum(w_i * beta_i) over stocks with a beta.
    var stress = null, coverage = null;
    var wsum = 0, covered = 0, any = false;
    for (var sym in weights) {
      if (!Object.prototype.hasOwnProperty.call(weights, sym) || !isNum(weights[sym])) continue;
      wsum += weights[sym];
      var st = stocks[sym];
      if (st && isNum(st.beta)) { covered += weights[sym] * st.beta; any = true; }
    }
    if (any) {
      var covW = 0;
      for (var sym2 in weights) {
        if (!Object.prototype.hasOwnProperty.call(weights, sym2) || !isNum(weights[sym2])) continue;
        if (stocks[sym2] && isNum(stocks[sym2].beta)) covW += weights[sym2];
      }
      coverage = wsum > 0 ? covW / wsum : null;
      stress = [
        { shock: -0.10, impact: -0.10 * covered },
        { shock: -0.20, impact: -0.20 * covered }
      ];
    }
    var paths = 1000;
    if (isNum(input.paths)) paths = clamp(Math.floor(input.paths), 10, 2000);
    var seed = isNum(input.seed) ? Math.floor(input.seed) : 42;
    return {
      stress: stress,
      stressCoverage: coverage,
      monteCarlo: enough ? monteCarlo(rets, paths, seed) : null
    };
  }

  /* ------------------------------ REPORT CARD ----------------------------- */
  /* Transparent, rule-based grades. Score 0..100; A >= 75, B >= 55, C >= 35,
     else D. Exact rules are documented in ANALYTICS.md. Neutral wording only. */
  function gradeOf(score) { return score == null ? null : (score >= 75 ? "A" : (score >= 55 ? "B" : (score >= 35 ? "C" : "D"))); }
  function computeReportCard(enough, returnsOut, riskOut, allocation, input, chain) {
    var benchName = input.benchName || "NIFTY 50";
    var nullGrade = function (reason) { return { grade: null, score: null, reason: reason }; };
    var card = {};
    // Diversification: weights-based, available even when history is short.
    if (allocation.effN != null && allocation.top1 != null) {
      var effScore = clamp((allocation.effN - 1) / 9 * 100, 0, 100);
      var topScore = clamp(100 - Math.max(0, allocation.top1 - 0.25) * 200, 0, 100);
      var dScore = Math.round(0.6 * effScore + 0.4 * topScore);
      card.Diversification = {
        grade: gradeOf(dScore), score: dScore,
        reason: "Holdings behave like " + allocation.effN.toFixed(1) + " equal-sized stocks; the largest holding is " +
          pctF(allocation.top1) + " of the portfolio."
      };
    } else card.Diversification = nullGrade(NO_FREE);
    if (!enough) {
      card.Returns = nullGrade(NEED_60);
      card.RiskControl = nullGrade(NEED_60);
      card.Consistency = nullGrade(NEED_60);
      card.Momentum = nullGrade(NEED_60);
      return card;
    }
    // Returns: annualised TWR vs benchmark annualised.
    if (returnsOut.twrAnnualized != null && riskOut.benchAnn != null) {
      var excess = returnsOut.twrAnnualized - riskOut.benchAnn;
      var rScore = clamp(Math.round(50 + excess * 500), 0, 100);
      card.Returns = {
        grade: gradeOf(rScore), score: rScore,
        reason: "Annualised return " + pctS(returnsOut.twrAnnualized) + " vs " + benchName + " " +
          pctS(riskOut.benchAnn) + " over " + chain.rets.length + " trading days."
      };
    } else card.Returns = nullGrade(NO_FREE);
    // Risk control: max drawdown (60%) + volatility (40%).
    if (riskOut.maxDD && riskOut.vol != null) {
      var ddScore = clamp(100 - riskOut.maxDD.pct * 2.2, 0, 100);
      var volScore = clamp(110 - riskOut.vol * 100 * 2.2, 0, 100);
      var rkScore = Math.round(0.6 * ddScore + 0.4 * volScore);
      card.RiskControl = {
        grade: gradeOf(rkScore), score: rkScore,
        reason: "Largest fall from a peak was " + riskOut.maxDD.pct.toFixed(1) + "%; annualised volatility is " +
          pctF(riskOut.vol) + "."
      };
    } else card.RiskControl = nullGrade(NO_FREE);
    // Consistency: positive months (60%) + green days (40%).
    var pm = returnsOut.positiveMonths;
    if (pm && pm.ratio != null && pm.totalDays) {
      var greenShare = pm.greenDays / pm.totalDays * 100;
      var cScore = Math.round(0.6 * pm.ratio + 0.4 * greenShare);
      card.Consistency = {
        grade: gradeOf(cScore), score: cScore,
        reason: pm.ratio.toFixed(1) + "% of months were positive and " + greenShare.toFixed(1) + "% of days were green."
      };
    } else card.Consistency = nullGrade(NO_FREE);
    // Momentum: rolling 3M/6M sign + portfolio value vs its own 50/200-day MAs.
    var V = arr(input.V), mScore = 0, parts = [];
    var r3 = returnsOut.rolling["3M"], r6 = returnsOut.rolling["6M"];
    if (r3 != null) { if (r3 > 0) mScore += 30; parts.push("last 3 months " + pctS(r3)); }
    if (r6 != null) { if (r6 > 0) mScore += 30; parts.push("last 6 months " + pctS(r6)); }
    if (V.length) {
      var lastV = V[V.length - 1];
      var ma50 = V.length >= 50 ? mean(V.slice(-50)) : null;
      var ma200 = V.length >= 200 ? mean(V.slice(-200)) : null;
      var maParts = [];
      if (ma50 != null && isNum(lastV)) { if (lastV > ma50) mScore += 20; maParts.push((lastV > ma50 ? "above" : "below") + " its 50-day average"); }
      if (ma200 != null && isNum(lastV)) { if (lastV > ma200) mScore += 20; maParts.push((lastV > ma200 ? "above" : "below") + " its 200-day average"); }
      if (maParts.length) parts.push("value is " + maParts.join(" and "));
    }
    card.Momentum = {
      grade: gradeOf(mScore), score: mScore,
      reason: parts.length ? ("Momentum: " + parts.join("; ") + ".") : NO_FREE
    };
    if (!parts.length) card.Momentum = nullGrade(NO_FREE);
    return card;
  }

  /* ----------------------------- CROSS-CHECKS ----------------------------- */
  // Independent recomputation of the window TWR straight from V and FLOW
  // (same validity rules as the chain builder), compared with the chain.
  function twrFromVF(input) {
    var V = arr(input.V), FLOW = arr(input.FLOW);
    if (V.length < 2) return null;
    var p = 1, used = 0;
    for (var i = 1; i < V.length; i++) {
      var prev = V[i - 1], cur = V[i];
      if (!isNum(prev) || !isNum(cur) || prev <= 0) continue;
      var f = isNum(FLOW[i]) ? FLOW[i] : 0;
      var r = (cur - f) / prev - 1;
      if (!isNum(r) || Math.abs(r) > OUTLIER) continue;
      p *= (1 + r); used++;
    }
    return used ? p - 1 : null;
  }

  /* -------------------------------- COMPUTE ------------------------------- */
  function compute(input) {
    input = input || {};
    var rf = isNum(input.rf) ? input.rf : 0.065;
    // Weights fallback: if no current weights were passed, derive them from
    // the last available per-stock values in symValues.
    if ((!input.weights || !Object.keys(input.weights).length) && input.symValues) {
      var lastVals = {}, totV = 0, wsym, av, vi;
      for (wsym in input.symValues) {
        if (!Object.prototype.hasOwnProperty.call(input.symValues, wsym)) continue;
        av = arr(input.symValues[wsym]);
        for (vi = av.length - 1; vi >= 0; vi--) if (isNum(av[vi])) { lastVals[wsym] = av[vi]; totV += av[vi]; break; }
      }
      if (totV > 0) {
        var derived = {};
        for (wsym in lastVals) derived[wsym] = lastVals[wsym] / totV;
        var copy = {}, ck;
        for (ck in input) if (Object.prototype.hasOwnProperty.call(input, ck)) copy[ck] = input[ck];
        copy.weights = derived;
        input = copy;
      }
    }
    var dates = arr(input.dates);
    var chain = buildChain(input);
    var rets = chain.rets, n = rets.length;
    var enough = n >= MIN_POINTS;

    var symCloses = input.symCloses || {};
    var nDays = dates.length;
    var benchByDay = arr(input.bench).length === nDays && nDays ? benchRetByDay(input.bench) : null;
    var seriesBySym = {}, sym;
    for (sym in symCloses) if (Object.prototype.hasOwnProperty.call(symCloses, sym)) seriesBySym[sym] = stockSeries(arr(symCloses[sym]));

    var returnsOut = enough ? computeReturns(rets, chain.retDates) : null;
    var riskOut = enough ? computeRisk(rets, chain.brets, chain.retDates, dates, rf, returnsOut) : null;
    var stocks = computeStocks(symCloses, benchByDay, nDays);
    var allocation = computeAllocation(input, enough, seriesBySym, benchByDay, nDays, riskOut ? riskOut.vol : null);
    var scenarios = computeScenarios(enough, rets, stocks, input.weights || {}, input);
    var reportCard = computeReportCard(enough, returnsOut, riskOut || {}, allocation, input, chain);

    var fromVF = twrFromVF(input);
    var fromRets = enough || n ? prod1p(rets, 0, n) - 1 : null;
    if (!n) fromRets = null;
    var rcSum = null;
    if (allocation.riskContrib) {
      rcSum = 0;
      for (var k in allocation.riskContrib) if (Object.prototype.hasOwnProperty.call(allocation.riskContrib, k)) rcSum += allocation.riskContrib[k];
    }
    var wSum = 0;
    var weights = input.weights || {};
    for (var w2 in weights) if (Object.prototype.hasOwnProperty.call(weights, w2) && isNum(weights[w2])) wSum += weights[w2];

    var result = {
      enough: enough,
      points: n,
      asOf: dates.length ? dates[dates.length - 1] : (chain.retDates.length ? chain.retDates[chain.retDates.length - 1] : null),
      reason: enough ? null : NEED_60,
      returns: returnsOut,
      risk: riskOut,
      allocation: allocation,
      stocks: stocks,
      scenarios: scenarios,
      reportCard: reportCard,
      crossChecks: {
        weightsSum: symsOf(weights).length ? wSum : null,
        riskContribSum: rcSum != null ? Math.round(rcSum * 10000) / 10000 : null,
        twrVsGiven: {
          fromRets: fromRets,
          fromVF: fromVF,
          ok: (fromRets != null && fromVF != null)
            ? Math.abs(fromRets - fromVF) <= 0.005 + 0.01 * Math.abs(fromVF)
            : null
        }
      }
    };
    return sanitize(result);
  }
  function symsOf(o) { return Object.keys(o || {}); }

  /* ------------------------------- SELF-TEST ------------------------------ */
  /* Synthetic cases with known answers. Where compute() deliberately gates
     output behind the 60-day rule, the unit under test is exercised directly
     (drawdown engine) — this is noted per case. Returns [{name, pass, got, want}]. */
  function selfTest() {
    var tests = [];
    function T(name, got, want, tol) {
      var pass;
      if (typeof got === "number" && typeof want === "number") pass = Math.abs(got - want) <= (tol == null ? 1e-9 : tol);
      else pass = got === want;
      tests.push({ name: name, pass: !!pass, got: got === undefined ? null : got, want: want === undefined ? null : want });
    }
    function dateSeq(count) {
      var out = [], d = new Date(Date.UTC(2025, 0, 1));
      for (var i = 0; i < count; i++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
      return out;
    }
    function closesFrom(retsArr, start) {
      var out = [start == null ? 100 : start];
      for (var i = 0; i < retsArr.length; i++) out.push(out[i] * (1 + retsArr[i]));
      return out;
    }
    var i, k;

    /* 1 — Constant series: rets all +1% a day, derived from V (tests the chain
       builder + guards). n = 100 returns. */
    (function () {
      var days = 101, V = [10000], FLOW = [0], bench = [100], dates = dateSeq(days);
      for (i = 1; i < days; i++) { V.push(V[i - 1] * 1.01); FLOW.push(0); bench.push(100); }
      var r = compute({ dates: dates, V: V, FLOW: FLOW, bench: bench, weights: {}, rf: 0.065 });
      T("1a constant series: twrTotal = 1.01^100 - 1", r.returns.twrTotal, Math.pow(1.01, 100) - 1, 1e-6);
      T("1b constant series: vol ~ 0", r.risk.vol, 0, 1e-6);
      T("1c constant series: Sharpe null (zero stdev guard)", r.risk.sharpe, null);
    })();

    /* 2 — Alternating rets [+0.02, -0.01] x 50: sample stdev by hand.
       mean = 0.005; every deviation is +/-0.015; sum sq = 100 * 0.015^2;
       sample var = that / 99; vol = sd * sqrt(252). */
    (function () {
      var rets = [], brets = [];
      for (i = 0; i < 50; i++) { rets.push(0.02, -0.01); brets.push(0, 0); }
      var r = compute({ dates: dateSeq(101), rets: rets, brets: brets, weights: {}, rf: 0.065 });
      var sd = Math.sqrt(100 * 0.015 * 0.015 / 99);
      T("2 alternating rets: vol = sample sd * sqrt(252)", r.risk.vol, sd * Math.sqrt(252), sd * Math.sqrt(252) * 0.01);
    })();

    /* 3 — Beta: stock returns exactly 2x benchmark returns (rf = 0). */
    (function () {
      var br = [], sr = [];
      for (i = 0; i < 100; i++) { var b = (i % 2 === 0) ? 0.01 : -0.004; br.push(b); sr.push(2 * b); }
      var bench = closesFrom(br, 100), stk = closesFrom(sr, 50), V = closesFrom(sr, 1000);
      var FLOW = V.map(function () { return 0; });
      var r = compute({
        dates: dateSeq(101), V: V, FLOW: FLOW, bench: bench,
        symCloses: { STK: stk }, weights: { STK: 1 }, rf: 0
      });
      T("3a beta = 2", r.risk.beta, 2, 0.001);
      T("3b corr = 1", r.risk.corr, 1, 1e-6);
      T("3c alpha ~ 0 (rf = 0)", r.risk.alpha, 0, 0.005);
      T("3d r2 = 1", r.risk.r2, 1, 1e-6);
    })();

    /* 4 — Drawdown engine on V = [100, 120, 60, 90, 130], zero flows.
       Peak 120 -> trough 60 = 50%; series ends at a new peak (130), so the
       current drawdown is 0; the episode runs peak idx1 -> recovery idx4
       = 3 trading days, trough idx2 -> recovery = 2 days. (Exercised on the
       engine directly: compute() gates risk behind the 60-day rule.) */
    (function () {
      var dd = drawdownStats([100, 120, 60, 90, 130], dateSeq(5));
      T("4a maxDD = 50%", dd.maxDD.pct, 50, 1e-9);
      T("4b currentDD = 0 after recovery", dd.currentDD.pct, 0, 1e-9);
      T("4c longestDD days = 3 (peak to recovery)", dd.longestDD.days, 3, 0);
      T("4d longestDD recovered", dd.longestDD.recovered, true);
      T("4e recoveryDays = 2 (trough to back-at-peak)", dd.longestDD.recoveryDays, 2, 0);
    })();

    /* 5 — VaR95, historical method, idx = floor(0.05 * n) into ascending sort.
       (a) The specified series — one -5% day in 100: the 5% boundary is the
           6th smallest return (+0.1%), so the rule yields var95 = -0.1
           (boundary was a gain) and cvar95 = 0.75 (mean of the 6 tail points).
       (b) A populated tail (ten -5% days in 100): var95 = cvar95 = 5 exactly. */
    (function () {
      var rets = [-0.05], brets = [0];
      for (i = 0; i < 99; i++) { rets.push(0.001); brets.push(0); }
      var r = compute({ dates: dateSeq(101), rets: rets, brets: brets, weights: {}, rf: 0.065 });
      T("5a VaR95 index rule (single -5% day in 100: boundary = +0.1%)", r.risk.var95, -0.1, 1e-9);
      T("5b CVaR95 (single -5% day in 100)", r.risk.cvar95, 0.75, 1e-9);
      var rets2 = [], brets2 = [];
      for (i = 0; i < 10; i++) { rets2.push(-0.05); brets2.push(0); }
      for (i = 0; i < 90; i++) { rets2.push(0.001); brets2.push(0); }
      var r2x = compute({ dates: dateSeq(101), rets: rets2, brets: brets2, weights: {}, rf: 0.065 });
      T("5c VaR95 = 5% when the 5% tail is populated", r2x.risk.var95, 5, 1e-9);
      T("5d CVaR95 = 5% when the 5% tail is populated", r2x.risk.cvar95, 5, 1e-9);
    })();

    /* 6 — HHI / effective N from weights alone (no history needed). */
    (function () {
      var r = compute({ dates: [], weights: { A: 0.5, B: 0.3, C: 0.2 } });
      T("6a HHI = 0.38", r.allocation.hhi, 0.38, 1e-9);
      T("6b effN = 2.6316", r.allocation.effN, 1 / 0.38, 1e-3);
      T("6c enough = false with no history, weights still compute", r.enough, false);
    })();

    /* 7 — Monte Carlo reproducibility: same seed -> identical year-1 p50. */
    (function () {
      var rets = [], brets = [];
      for (i = 0; i < 120; i++) { rets.push(0.004 * Math.sin(i) + 0.002); brets.push(0); }
      var inp = { dates: dateSeq(121), rets: rets, brets: brets, weights: {}, rf: 0.065, paths: 200, seed: 42 };
      var a = compute(inp), b = compute(inp);
      var pa = a.scenarios.monteCarlo.bands["1"][12].p50;
      var pb = b.scenarios.monteCarlo.bands["1"][12].p50;
      T("7 Monte Carlo: same seed -> identical year-1 p50", pa, pb, 0);
    })();

    /* 8 — Risk contributions sum to 100 on a 3-stock synthetic with a shared
       factor (real covariance structure), 120 common trading days. */
    (function () {
      var rA = [], rB = [], rC = [], chain = [], brets = [];
      for (k = 0; k < 120; k++) {
        var f = 0.006 * Math.sin(1.3 * k);
        rA.push(0.001 + f + 0.004 * Math.sin(2.1 * k));
        rB.push(0.0005 + 0.7 * f + 0.005 * Math.cos(1.1 * k));
        rC.push(0.0002 + 0.3 * f + 0.008 * Math.sin(0.7 * k + 2));
        chain.push(rA[k]); brets.push(0.001 * Math.sin(0.5 * k));
      }
      var bench = closesFrom(brets, 100);
      var r = compute({
        dates: dateSeq(121), rets: chain, brets: brets, bench: bench,
        symCloses: { A: closesFrom(rA), B: closesFrom(rB), C: closesFrom(rC) },
        weights: { A: 0.5, B: 0.3, C: 0.2 }, rf: 0.065
      });
      var sum = null;
      if (r.allocation.riskContrib) {
        sum = 0;
        for (var s in r.allocation.riskContrib) sum += r.allocation.riskContrib[s];
      }
      T("8 risk contributions sum to 100 +/- 0.5", sum, 100, 0.5);
    })();

    return tests;
  }

  /* -------------------------------- exports ------------------------------- */
  var api = { compute: compute, selfTest: selfTest };
  if (typeof self !== "undefined") self.FolioAnalytics = api;
  if (typeof window !== "undefined") window.FolioAnalytics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
