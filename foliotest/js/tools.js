/* ================= FOLIO TOOLS HUB (Phase 6A) =================
   Lazy module — loaded on first open via window.folioOpenTools() in
   features.js (same contract as share.js / report.js). NOT in SW CORE.
   Offline maths only: no network, no trackers, no keys. Every calculator
   is standalone — the portfolio's own data, maths and storage are never
   touched. The one persisted thing is the charges-rate config, saved in
   state.profile.tools (the insX pattern), so it rides the existing
   cloud doc / .folio vault like every other profile setting. */
(function () {
  "use strict";

  /* ---------- formatting: ride the app's helpers when present ---------- */
  function fmtInr(n) {
    try { if (typeof inr === "function") return inr(n); } catch (e) {}
    return Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—";
  }
  function fmtInr2(n) {
    try { if (typeof inr2 === "function") return inr2(n); } catch (e) {}
    return Number.isFinite(n) ? "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  }
  function fmtPct(x, digits) {
    if (!Number.isFinite(x)) return "—";
    return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 2 : digits) + "%";
  }
  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

  /* ---------- charges config (item 5) ----------
     DEFAULT RATES — verified 2026-11-16 against official sources:
       STT delivery 0.1% buy + 0.1% sell; STT intraday 0.025% sell only
         — Zerodha official charges page (zerodha.com/charges); equity STT
           unchanged by Budget 2026 (only F&O rates rose, from 1 Apr 2026).
       NSE transaction charge 0.00307% (Rs 306.99 per crore)
         — NSE circular NSE/FA/73061, 27 Feb 2026, effective 1 Mar 2026.
       BSE transaction charge 0.00375% (Rs 375 per crore, Group A/B scrips)
         — BSE transaction-fee schedule as published Jun 2025.
       SEBI turnover fee 0.0001% (Rs 10 per crore, both sides) — SEBI schedule.
       Stamp duty: delivery 0.015% / intraday 0.003%, buy side only
         — Indian Stamp Act, uniform national rates since 1 Jul 2020.
       GST 18% on brokerage + exchange charges + SEBI fee.
       DP charge Rs 15.34 per scrip per day on a delivery sell, incl. GST
         (Rs 3.5 CDSL + Rs 9.5 broker + Rs 2.34 GST) — Zerodha's published
         figure; it is broker-specific, so it is an editable default, not
         a statutory rate.
     The user can edit every rate in the panel; edits persist in
     state.profile.tools.charges and the "last verified" date below stays
     attached to the DEFAULTS, never to user edits. */
  var CHARGES_DEFAULTS = {
    sttDeliveryPct: 0.1,
    sttIntradayPct: 0.025,
    nseTxnPct: 0.00307,
    bseTxnPct: 0.00375,
    sebiPct: 0.0001,
    stampDeliveryPct: 0.015,
    stampIntradayPct: 0.003,
    gstPct: 18,
    dpCharge: 15.34,
    verifiedOn: "2026-11-16"
  };
  var RATE_LABELS = [
    ["sttDeliveryPct", "STT — delivery (% each side)"],
    ["sttIntradayPct", "STT — intraday (% sell side)"],
    ["nseTxnPct", "Exchange charge — NSE (%)"],
    ["bseTxnPct", "Exchange charge — BSE (%)"],
    ["sebiPct", "SEBI fee (%)"],
    ["stampDeliveryPct", "Stamp duty — delivery (% buy)"],
    ["stampIntradayPct", "Stamp duty — intraday (% buy)"],
    ["gstPct", "GST (% on brokerage + exchange + SEBI)"],
    ["dpCharge", "DP charge (₹ per scrip, delivery sell, incl. GST)"]
  ];

  /* ---------- persistence (insX pattern: state.profile + persist()) ---------- */
  function toolsSettings() {
    try {
      var p = state.profile || (state.profile = {});
      if (!p.tools) p.tools = {};
      return p.tools;
    } catch (e) { return {}; }
  }
  function chargesConfig() {
    var t = toolsSettings();
    var c = {}, k;
    for (k in CHARGES_DEFAULTS) c[k] = CHARGES_DEFAULTS[k];
    if (t.charges) for (k in t.charges) if (Number.isFinite(t.charges[k])) c[k] = t.charges[k];
    return c;
  }
  function saveCharges(cfg) {
    var t = toolsSettings();
    t.charges = {};
    RATE_LABELS.forEach(function (r) { t.charges[r[0]] = cfg[r[0]]; });
    try { persist(); } catch (e) {}
  }
  function chargesCustomised() {
    var t = toolsSettings();
    return !!(t.charges && RATE_LABELS.some(function (r) { return Number.isFinite(t.charges[r[0]]) && t.charges[r[0]] !== CHARGES_DEFAULTS[r[0]]; }));
  }

  /* ================= PURE MATHS (window.FolioToolsMath — harness-tested) ================= */
  var M = {};

  /* SIP future value: deposit at the START of each month, monthly growth
     i = annualPct/1200 (the convention Indian SIP calculators publish).
     Simulated month by month so the step-up path uses the identical code. */
  M.sipFV = function (monthly, annualPct, years, stepPct) {
    var i = annualPct / 100 / 12, n = Math.round(years * 12), fv = 0;
    for (var m = 0; m < n; m++) {
      var p = stepPct ? monthly * Math.pow(1 + stepPct / 100, Math.floor(m / 12)) : monthly;
      fv = (fv + p) * (1 + i);
    }
    return fv;
  };
  M.sipInvested = function (monthly, years, stepPct) {
    var n = Math.round(years * 12), sum = 0;
    for (var m = 0; m < n; m++) sum += stepPct ? monthly * Math.pow(1 + stepPct / 100, Math.floor(m / 12)) : monthly;
    return sum;
  };
  M.sipRequired = function (target, annualPct, years, stepPct) {
    if (!(target > 0) || !(years > 0)) return null;
    if (!stepPct) {
      var i = annualPct / 100 / 12, n = Math.round(years * 12);
      if (i === 0) return target / n;
      var f = (Math.pow(1 + i, n) - 1) / i * (1 + i);
      return f > 0 ? target / f : null;
    }
    var lo = 0, hi = Math.max(target, 1);
    while (M.sipFV(hi, annualPct, years, stepPct) < target && hi < target * 1e6) hi *= 2;
    if (M.sipFV(hi, annualPct, years, stepPct) < target) return null;
    for (var k = 0; k < 80; k++) { var mid = (lo + hi) / 2; if (M.sipFV(mid, annualPct, years, stepPct) < target) lo = mid; else hi = mid; }
    return hi;
  };
  M.lumpsumFV = function (principal, annualPct, years) {
    return principal * Math.pow(1 + annualPct / 100, years);
  };
  /* FIRE: corpus at retirement funds expenses (growing with inflation)
     from retirement to lifeAge, discounted at the post-retirement real
     rate; existing savings grow at the pre-retirement return. */
  M.firePlan = function (o) {
    var n = o.retireAge - o.curAge, m = o.lifeAge - o.retireAge;
    if (!(n > 0) || !(m > 0)) return null;
    var annualAtRet = o.monthlyExp * 12 * Math.pow(1 + o.inflationPct / 100, n);
    var realPost = (1 + o.postPct / 100) / (1 + o.inflationPct / 100) - 1;
    var corpus = realPost > 1e-9
      ? annualAtRet * (1 - Math.pow(1 + realPost, -m)) / realPost
      : annualAtRet * m;
    var existingAtRet = (o.existing || 0) * Math.pow(1 + o.prePct / 100, n);
    var gap = Math.max(0, corpus - existingAtRet);
    return {
      yearsToRetire: n, yearsInRetirement: m, annualExpAtRet: annualAtRet,
      corpus: corpus, existingAtRet: existingAtRet, gap: gap,
      sip: gap > 0 ? M.sipRequired(gap, o.prePct, n) : 0,
      multiple: annualAtRet > 0 ? corpus / annualAtRet : null
    };
  };
  /* Itemised round-trip charges. o = {buyVal, sellVal, segment, exchange,
     brkFlat (₹ per order), brkPct (% per side), cfg}. One buy order + one
     sell order. DP applies once, delivery sells only, and the default DP
     figure already includes GST, so GST is charged on brokerage +
     exchange + SEBI only. */
  M.chargesAt = function (o) {
    var cfg = o.cfg, buyVal = Math.max(0, o.buyVal), sellVal = Math.max(0, o.sellVal);
    var turnover = buyVal + sellVal;
    var exchRate = o.exchange === "bse" ? cfg.bseTxnPct : cfg.nseTxnPct;
    var brokerage = (o.brkFlat + buyVal * o.brkPct / 100) + (o.brkFlat + sellVal * o.brkPct / 100);
    var stt = o.segment === "delivery"
      ? (buyVal + sellVal) * cfg.sttDeliveryPct / 100
      : sellVal * cfg.sttIntradayPct / 100;
    var exch = turnover * exchRate / 100;
    var sebi = turnover * cfg.sebiPct / 100;
    var stamp = buyVal * (o.segment === "delivery" ? cfg.stampDeliveryPct : cfg.stampIntradayPct) / 100;
    var gst = (brokerage + exch + sebi) * cfg.gstPct / 100;
    var dp = o.segment === "delivery" && sellVal > 0 ? cfg.dpCharge : 0;
    return {
      brokerage: brokerage, stt: stt, exch: exch, sebi: sebi, stamp: stamp,
      gst: gst, dp: dp, total: brokerage + stt + exch + sebi + stamp + gst + dp
    };
  };
  /* Break-even sell value: charges are affine in sellVal, so evaluate at
     0 and 1 and solve S − charges(S) = buyVal exactly. */
  M.breakEvenSell = function (o) {
    function at(s) { return M.chargesAt({ buyVal: o.buyVal, sellVal: s, segment: o.segment, exchange: o.exchange, brkFlat: o.brkFlat, brkPct: o.brkPct, cfg: o.cfg }).total; }
    /* Evaluate at two POSITIVE sell values: the flat DP charge steps in
       at any sellVal > 0, so a 0→1 difference would mistake that step
       for a per-rupee slope. charges(S) = F + slope*S for S > 0. */
    var c1 = at(1), c2 = at(2), slope = c2 - c1, fixed = c1 - slope;
    if (!(slope < 1)) return null;
    return (o.buyVal + fixed) / (1 - slope);
  };
  M.positionSize = function (o) {
    var perShare = Math.abs(o.entry - o.sl);
    if (!(perShare > 0) || !(o.capital > 0) || !(o.riskPct > 0)) return null;
    var riskAmt = o.capital * o.riskPct / 100;
    var qty = Math.floor(riskAmt / perShare);
    return {
      riskAmt: riskAmt, perShare: perShare, qty: qty,
      positionValue: qty * o.entry, actualRisk: qty * perShare,
      capitalUsedPct: o.capital > 0 ? qty * o.entry / o.capital * 100 : null
    };
  };
  M.averaging = function (lots, chargesPct, curPrice) {
    var qty = 0, cost = 0;
    lots.forEach(function (l) { qty += l.qty; cost += l.qty * l.price; });
    if (!(qty > 0)) return null;
    var avg = cost / qty;
    var be = avg * (1 + (chargesPct || 0) / 100);
    return {
      qty: qty, cost: cost, avg: avg, breakEven: be,
      curValue: curPrice != null ? curPrice * qty : null,
      pnlVsBreakEven: curPrice != null ? (curPrice - be) * qty : null
    };
  };
  M.dividendProj = function (o) {
    var annual = o.mode === "pershare" ? o.shares * o.perShare : o.shares * o.price * o.yieldPct / 100;
    return {
      annual: annual, monthly: annual / 12,
      impliedYield: o.price > 0 && o.mode === "pershare" ? o.perShare / o.price * 100 : (o.mode === "yield" ? o.yieldPct : null),
      impliedPerShare: o.mode === "yield" ? o.price * o.yieldPct / 100 : o.perShare
    };
  };
  M.inflationAdj = function (o) {
    var realPct = ((1 + o.nominalPct / 100) / (1 + o.inflationPct / 100) - 1) * 100;
    return {
      realPct: realPct,
      fvNominal: o.amount * Math.pow(1 + o.nominalPct / 100, o.years),
      fvInTodaysMoney: o.amount * Math.pow((1 + o.nominalPct / 100) / (1 + o.inflationPct / 100), o.years),
      costLater: o.amount * Math.pow(1 + o.inflationPct / 100, o.years)
    };
  };
  /* XIRR: Newton first, then a bracketed bisection scan. Flows use
     ACT/365.25 from the earliest flow. Returns {rate} (a fraction) or
     {err} with a plain-English reason — never a fake number. */
  M.xirr = function (flows) {
    var clean = flows.filter(f => f && Number.isFinite(f.t) && Number.isFinite(f.a) && f.a !== 0)
      .slice().sort((a, b) => a.t - b.t);
    if (clean.length < 2) return { err: "Add at least two rows with amounts — money in and money out." };
    if (!clean.some(f => f.a < 0) || !clean.some(f => f.a > 0))
      return { err: "XIRR needs both sides: money you put in (negative) and money you took out or still hold (positive)." };
    var t0 = clean[0].t, YEAR = 31557600000;
    if (clean[clean.length - 1].t === t0) return { err: "The flows are all on the same date — spread them over time." };
    function npv(r) { var s = 0; for (var j = 0; j < clean.length; j++) s += clean[j].a / Math.pow(1 + r, (clean[j].t - t0) / YEAR); return s; }
    function dnpv(r) { var s = 0; for (var j = 0; j < clean.length; j++) { var y = (clean[j].t - t0) / YEAR; s += -y * clean[j].a / Math.pow(1 + r, y + 1); } return s; }
    var r = 0.1, k;
    for (k = 0; k < 100; k++) {
      var v = npv(r), d = dnpv(r);
      if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
      var rn = r - v / d;
      if (!Number.isFinite(rn) || rn <= -0.9999) break;
      if (Math.abs(rn - r) < 1e-10) { r = rn; if (Math.abs(npv(r)) < 1e-6) return { rate: r }; break; }
      r = rn;
    }
    if (Math.abs(npv(r)) < 1e-6) return { rate: r };
    var grid = [-0.99, -0.9, -0.75, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 1, 2, 4, 9, 19, 49, 99];
    for (k = 0; k < grid.length - 1; k++) {
      var a = grid[k], b = grid[k + 1], fa = npv(a), fb = npv(b);
      if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
      if (fa === 0) return { rate: a };
      if (fa * fb < 0) {
        for (var it = 0; it < 200; it++) { var mid = (a + b) / 2, fm = npv(mid); if (Math.abs(fm) < 1e-9) return { rate: mid }; if (fa * fm < 0) { b = mid; fb = fm; } else { a = mid; fa = fm; } }
        return { rate: (a + b) / 2 };
      }
    }
    return { err: "No single rate fits these flows — check the dates and amounts (this can happen with several sign changes)." };
  };
  window.FolioToolsMath = M;

  /* ================= UI ================= */
  var ADVICE = "Estimate only — the return is assumed, not promised. Not financial advice.";
  function fld(id, label, val) {
    return '<div class="ds-field tl-fld"><input class="ds-input" id="' + id + '" type="number" inputmode="decimal" step="any" placeholder=" " value="' + (val == null ? "" : val) + '"><label class="ds-field__label" for="' + id + '">' + label + "</label></div>";
  }
  function seg(id, opts, active) {
    return '<div class="ds-seg tl-seg" data-tl-seg="' + id + '" role="group">' + opts.map(function (o) {
      return '<button type="button" class="ds-seg__btn" data-val="' + o[0] + '" aria-pressed="' + (o[0] === active ? "true" : "false") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function statsHtml(items, priv) {
    return '<div class="ds-stat-grid tl-stats">' + items.map(function (it) {
      return '<div class="ds-stat"><div class="ds-stat__label">' + it[0] + '</div><div class="ds-stat__value tl-stat-v">' +
        (priv ? '<span class="ds-amt">' + it[1] + "</span>" : it[1]) +
        (it[2] ? '</div><div class="ds-stat__sub">' + it[2] + "</div>" : "</div>") + "</div>";
    }).join("") + "</div>";
  }
  function panelShell(def, inner) {
    return '<section class="tl-panel hidden" data-panel="' + def.id + '">' +
      '<p class="tl-info">' + def.info + "</p>" + inner +
      '<p class="tl-err hidden" role="alert"></p><div class="tl-results"></div>' +
      (def.advice === false ? "" : '<p class="tl-advice">' + ADVICE + "</p>") + "</section>";
  }
  function setErr(panel, msg) {
    var e = panel.querySelector(".tl-err"), r = panel.querySelector(".tl-results");
    if (msg) { e.textContent = msg; e.classList.remove("hidden"); r.innerHTML = ""; }
    else { e.textContent = ""; e.classList.add("hidden"); }
  }
  function setResults(panel, html) {
    setErr(panel, null);
    panel.querySelector(".tl-results").innerHTML = html;
  }
  function val(panel, id) { var el = panel.querySelector("#" + id); return el ? num(el.value) : null; }
  function segVal(panel, id) { var s = panel.querySelector('[data-tl-seg="' + id + '"]'); return s ? s.dataset.value || s.querySelector('[aria-pressed="true"]').dataset.val : null; }

  var PANELS = [
    {
      id: "sip", group: "Plan & grow", title: "SIP Calculator",
      info: "A fixed amount invested every month, growing at the return you assume.",
      html: function () {
        return fld("tlSipAmt", "Monthly SIP (₹)", 10000) + fld("tlSipYrs", "Years", 10) + fld("tlSipRet", "Expected return (% per year)", 12);
      },
      compute: function (p) {
        var amt = val(p, "tlSipAmt"), yrs = val(p, "tlSipYrs"), ret = val(p, "tlSipRet");
        if (!(amt > 0)) return setErr(p, "Enter a monthly amount above 0.");
        if (!(yrs > 0 && yrs <= 60)) return setErr(p, "Enter a period between 1 and 60 years.");
        if (ret == null || ret < -50 || ret > 100) return setErr(p, "Enter an expected return between −50% and 100%.");
        var fv = M.sipFV(amt, ret, yrs), inv = amt * 12 * yrs;
        var rows = "", maxV = fv > 0 ? fv : 1;
        for (var y = 1; y <= Math.floor(yrs); y++) {
          var v = M.sipFV(amt, ret, y);
          rows += "<tr><td>" + y + "</td><td>" + fmtInr(amt * 12 * y) + '</td><td><span class="tl-bar" style="width:' + Math.max(2, Math.round(v / maxV * 100)) + '%"></span>' + fmtInr(v) + "</td></tr>";
        }
        setResults(p, statsHtml([
          ["You invest", fmtInr(inv)], ["Gains", fmtInr(fv - inv)],
          ["Maturity value", fmtInr(fv)], ["Every month", fmtInr(amt)]
        ]) + '<div class="ds-table-wrap tl-table-wrap"><table class="tl-table"><thead><tr><th>Year</th><th>Invested</th><th>Value</th></tr></thead><tbody>' + rows + "</tbody></table></div>");
      }
    },
    {
      id: "lumpsum", group: "Plan & grow", title: "Lumpsum Calculator",
      info: "One amount invested once, growing at the return you assume.",
      html: function () {
        return fld("tlLumAmt", "Amount invested (₹)", 100000) + fld("tlLumYrs", "Years", 10) + fld("tlLumRet", "Expected return (% per year)", 12);
      },
      compute: function (p) {
        var amt = val(p, "tlLumAmt"), yrs = val(p, "tlLumYrs"), ret = val(p, "tlLumRet");
        if (!(amt > 0)) return setErr(p, "Enter an amount above 0.");
        if (!(yrs > 0 && yrs <= 60)) return setErr(p, "Enter a period between 1 and 60 years.");
        if (ret == null || ret <= -100 || ret > 100) return setErr(p, "Enter an expected return above −100% and up to 100%.");
        var fv = M.lumpsumFV(amt, ret, yrs);
        setResults(p, statsHtml([
          ["You invest", fmtInr(amt)], ["Gains", fmtInr(fv - amt)], ["Maturity value", fmtInr(fv)]
        ]));
      }
    },
    {
      id: "goal", group: "Plan & grow", title: "Goal Planner",
      info: "Works backwards from your target to the monthly SIP that reaches it.",
      html: function () {
        return fld("tlGoalAmt", "Target amount (₹)", 10000000) + fld("tlGoalYrs", "Years to reach it", 15) +
          fld("tlGoalRet", "Expected return (% per year)", 12) + fld("tlGoalStep", "Step-up every year (% — optional)", 0);
      },
      compute: function (p) {
        var tgt = val(p, "tlGoalAmt"), yrs = val(p, "tlGoalYrs"), ret = val(p, "tlGoalRet"), step = val(p, "tlGoalStep") || 0;
        if (!(tgt > 0)) return setErr(p, "Enter a target amount above 0.");
        if (!(yrs > 0 && yrs <= 60)) return setErr(p, "Enter a period between 1 and 60 years.");
        if (ret == null || ret <= -100 || ret > 100) return setErr(p, "Enter an expected return above −100% and up to 100%.");
        if (step < 0 || step > 100) return setErr(p, "Step-up must be between 0% and 100%.");
        var sip = M.sipRequired(tgt, ret, yrs, step);
        if (sip == null) return setErr(p, "This target cannot be reached with those numbers — try a longer period or a higher return.");
        setResults(p, statsHtml([
          [step > 0 ? "Starting monthly SIP" : "Monthly SIP needed", fmtInr(sip)],
          ["You will invest", fmtInr(M.sipInvested(sip, yrs, step))],
          ["Target", fmtInr(tgt)],
          ["Growth does the rest", fmtInr(tgt - M.sipInvested(sip, yrs, step))]
        ]) + (step > 0 ? '<p class="tl-note">The SIP rises by ' + step + "% every year; the figure above is the first year's monthly amount.</p>" : ""));
      }
    },
    {
      id: "fire", group: "Plan & grow", title: "FIRE & Retirement Planner",
      info: "The corpus that can fund your monthly expenses after retirement, and the SIP to build it.",
      html: function () {
        return fld("tlFireCur", "Your age today", 30) + fld("tlFireRet", "Retire at age", 60) + fld("tlFireLife", "Plan expenses till age", 85) +
          fld("tlFireExp", "Monthly expenses today (₹)", 50000) + fld("tlFireInf", "Inflation (% per year)", 6) +
          fld("tlFirePre", "Return before retirement (% per year)", 12) + fld("tlFirePost", "Return after retirement (% per year)", 8) +
          fld("tlFireHave", "Savings already invested (₹)", 500000);
      },
      compute: function (p) {
        var o = {
          curAge: val(p, "tlFireCur"), retireAge: val(p, "tlFireRet"), lifeAge: val(p, "tlFireLife"),
          monthlyExp: val(p, "tlFireExp"), inflationPct: val(p, "tlFireInf"),
          prePct: val(p, "tlFirePre"), postPct: val(p, "tlFirePost"), existing: val(p, "tlFireHave") || 0
        };
        if (!(o.monthlyExp > 0)) return setErr(p, "Enter today's monthly expenses above 0.");
        if (!(o.curAge > 0) || !(o.retireAge > o.curAge)) return setErr(p, "Retirement age must be after your age today.");
        if (!(o.lifeAge > o.retireAge)) return setErr(p, "Plan-till age must be after retirement age.");
        if (o.inflationPct == null || o.prePct == null || o.postPct == null) return setErr(p, "Fill in inflation and both return figures.");
        var r = M.firePlan(o);
        if (!r) return setErr(p, "Those ages do not leave time to build or spend a corpus — check them.");
        setResults(p, statsHtml([
          ["Corpus needed at " + o.retireAge, fmtInr(r.corpus), r.multiple ? "≈ " + r.multiple.toFixed(1) + "× a year of expenses then" : ""],
          ["Monthly expense at retirement", fmtInr(r.annualExpAtRet / 12)],
          ["Your savings by then", fmtInr(r.existingAtRet)],
          ["Monthly SIP needed", r.gap > 0 ? fmtInr(r.sip) : "₹0 — savings cover it"]
        ]) + '<p class="tl-note">Expenses are assumed to keep rising with inflation after retirement, funded for ' + r.yearsInRetirement + " years.</p>");
      }
    }
  ];

  PANELS.push(
    {
      id: "charges", group: "Trading costs & risk", title: "Brokerage & Charges",
      info: "Every statutory charge on one buy + one sell, at the rates below — edit them if your broker differs.",
      advice: false,
      html: function () {
        return '<label class="tl-lab">Trade type</label>' + seg("tlChSeg", [["delivery", "Delivery"], ["intraday", "Intraday"]], "delivery") +
          '<label class="tl-lab">Exchange</label>' + seg("tlChExch", [["nse", "NSE"], ["bse", "BSE"]], "nse") +
          fld("tlChQty", "Quantity", 100) + fld("tlChBuy", "Buy price (₹)", 500) + fld("tlChSell", "Sell price (₹)", 550) +
          fld("tlChBrkFlat", "Brokerage (₹ per order)", 0) + fld("tlChBrkPct", "Brokerage (% of value, per side)", 0) +
          '<button type="button" class="btn tl-rates-btn" data-tl-rates="1">Edit charge rates</button>' +
          '<div class="tl-rates hidden">' + RATE_LABELS.map(function (r) {
            return '<div class="ds-field tl-fld"><input class="ds-input tl-rate" data-rate="' + r[0] + '" type="number" inputmode="decimal" step="any" placeholder=" "><label class="ds-field__label">' + r[1] + "</label></div>";
          }).join("") +
          '<p class="tl-note" id="tlChVerified"></p>' +
          '<button type="button" class="btn" data-tl-rates-reset="1">Reset rates to verified defaults</button></div>' +
          '<p class="tl-advice">Estimate — statutory charges change; check your broker\'s contract note. DP charge is per scrip per day on delivery sells and differs by broker.</p>';
      },
      mount: function (p) { syncRateInputs(p); },
      compute: function (p) {
        var qty = val(p, "tlChQty"), buy = val(p, "tlChBuy"), sell = val(p, "tlChSell");
        if (!(qty > 0)) return setErr(p, "Enter a quantity above 0.");
        if (!(buy > 0) || !(sell > 0)) return setErr(p, "Enter buy and sell prices above 0.");
        var o = {
          buyVal: buy * qty, sellVal: sell * qty,
          segment: segVal(p, "tlChSeg"), exchange: segVal(p, "tlChExch"),
          brkFlat: val(p, "tlChBrkFlat") || 0, brkPct: val(p, "tlChBrkPct") || 0,
          cfg: readRateInputs(p)
        };
        var c = M.chargesAt(o);
        var be = M.breakEvenSell(o);
        var net = (o.sellVal - o.buyVal) - c.total;
        function line(label, v) { return "<tr><td>" + label + "</td><td>" + fmtInr2(v) + "</td></tr>"; }
        setResults(p, statsHtml([
          ["Total charges", fmtInr2(c.total)],
          ["Net P&L after charges", fmtInr2(net)],
          ["Break-even sell price", be != null ? fmtInr2(be / qty) : "—", be != null && buy > 0 ? fmtPct((be / qty / buy - 1) * 100) + " from your buy price" : ""],
          ["Charges as % of buy value", fmtPct(c.total / o.buyVal * 100)]
        ]) + '<div class="ds-table-wrap tl-table-wrap"><table class="tl-table"><tbody>' +
          line("Brokerage", c.brokerage) + line("STT", c.stt) + line("Exchange transaction charges", c.exch) +
          line("SEBI fee", c.sebi) + line("Stamp duty (buy side)", c.stamp) + line("GST", c.gst) +
          line("DP charge", c.dp) + line("<b>Total</b>", c.total) + "</tbody></table></div>");
      }
    },
    {
      id: "possize", group: "Trading costs & risk", title: "Position Size & Risk",
      info: "Sizes a trade so one stop-loss hit costs only the risk % you choose.",
      advice: false,
      html: function () {
        return fld("tlPsCap", "Trading capital (₹)", 500000) + fld("tlPsRisk", "Risk per trade (%)", 1) +
          fld("tlPsEntry", "Entry price (₹)", 250) + fld("tlPsSl", "Stop-loss price (₹)", 235);
      },
      compute: function (p) {
        var o = { capital: val(p, "tlPsCap"), riskPct: val(p, "tlPsRisk"), entry: val(p, "tlPsEntry"), sl: val(p, "tlPsSl") };
        if (!(o.entry > 0) || !(o.sl > 0)) return setErr(p, "Enter entry and stop-loss prices above 0.");
        if (o.entry === o.sl) return setErr(p, "Entry and stop-loss are the same — there is no risk gap to size against.");
        var r = M.positionSize(o);
        if (!r) return setErr(p, "Enter capital above 0 and a risk % above 0.");
        if (r.qty === 0) return setErr(p, "Your risk budget buys less than 1 share at this stop distance — widen the stop, raise the risk %, or skip the trade.");
        setResults(p, statsHtml([
          ["Quantity to buy", String(r.qty)],
          ["Amount at risk", fmtInr(r.actualRisk), "of your " + fmtInr(r.riskAmt) + " budget"],
          ["Position value", fmtInr(r.positionValue)],
          ["Capital used", fmtPct(r.capitalUsedPct)]
        ]) + '<p class="tl-note">If the stop-loss is hit, you lose about ' + fmtInr(r.actualRisk) + " before charges and slippage.</p>");
      }
    },
    {
      id: "avg", group: "Trading costs & risk", title: "Averaging & Break-even",
      info: "Your true average price and break-even across several buys of the same stock.",
      advice: false,
      html: function () {
        return '<div class="tl-lots">' +
          lotRow(100, 500) + lotRow(50, 450) +
          '</div><button type="button" class="btn" data-tl-add-lot="1">+ Add a buy</button>' +
          fld("tlAvgChg", "Buying charges so far (% of cost — optional)", 0.2) +
          fld("tlAvgCur", "Current price (₹ — optional)", "");
      },
      compute: function (p) {
        var lots = [];
        p.querySelectorAll(".tl-lot").forEach(function (row) {
          var q = num(row.querySelector(".tl-lot-qty").value), pr = num(row.querySelector(".tl-lot-price").value);
          if (q > 0 && pr > 0) lots.push({ qty: q, price: pr });
        });
        if (!lots.length) return setErr(p, "Add at least one buy with quantity and price above 0.");
        var chg = val(p, "tlAvgChg") || 0, cur = val(p, "tlAvgCur");
        var r = M.averaging(lots, chg, cur);
        var items = [
          ["Total shares", String(r.qty)], ["Total invested", fmtInr(r.cost)],
          ["Average price", fmtInr2(r.avg)], ["Break-even (incl. charges)", fmtInr2(r.breakEven)]
        ];
        if (r.curValue != null) {
          items.push(["Current value", fmtInr(r.curValue)]);
          items.push(["P&L vs break-even", fmtInr(r.pnlVsBreakEven)]);
        }
        setResults(p, statsHtml(items) + '<p class="tl-note">Break-even here covers buying charges only; selling charges and taxes come off the top when you sell.</p>');
      }
    },
    {
      id: "div", group: "Income & returns", title: "Dividend Income Projector",
      info: "Expected dividend income from a yield or a per-share amount.",
      html: function () {
        return '<label class="tl-lab">Whose shares?</label>' + seg("tlDivMode", [["manual", "Manual entry"], ["holdings", "My holdings"]], "manual") +
          '<div class="tl-divpick hidden"><label class="tl-lab" for="tlDivPick">Pick a holding</label><select id="tlDivPick" class="tl-select"></select></div>' +
          fld("tlDivShares", "Shares", 100) + fld("tlDivPrice", "Share price (₹)", 500) +
          '<label class="tl-lab">Dividend as</label>' + seg("tlDivBasis", [["yield", "Yield %"], ["pershare", "₹ per share / year"]], "yield") +
          '<div class="tl-basis-yield">' + fld("tlDivYield", "Dividend yield (% per year)", 2) + "</div>" +
          '<div class="tl-basis-pershare hidden">' + fld("tlDivDps", "Dividend (₹ per share per year)", 10) + "</div>";
      },
      mount: function (p) { fillHoldingPick(p); },
      compute: function (p) {
        var mode = segVal(p, "tlDivMode"), basis = segVal(p, "tlDivBasis");
        p.querySelector(".tl-divpick").classList.toggle("hidden", mode !== "holdings");
        p.querySelector(".tl-basis-yield").classList.toggle("hidden", basis !== "yield");
        p.querySelector(".tl-basis-pershare").classList.toggle("hidden", basis !== "pershare");
        var shares = val(p, "tlDivShares"), price = val(p, "tlDivPrice");
        if (!(shares > 0)) return setErr(p, "Enter a share count above 0.");
        if (!(price > 0)) return setErr(p, "Enter a share price above 0.");
        var o = { shares: shares, price: price, mode: basis, yieldPct: val(p, "tlDivYield"), perShare: val(p, "tlDivDps") };
        if (basis === "yield" && !(o.yieldPct >= 0)) return setErr(p, "Enter a dividend yield of 0% or more.");
        if (basis === "pershare" && !(o.perShare >= 0)) return setErr(p, "Enter a dividend per share of 0 or more.");
        var r = M.dividendProj(o);
        var priv = mode === "holdings"; /* real portfolio figures: Privacy Mode applies */
        setResults(p, statsHtml([
          ["Expected per year", fmtInr(r.annual)], ["Expected per month", fmtInr(r.monthly)],
          ["Dividend yield", r.impliedYield != null ? fmtPct(r.impliedYield) : "—"],
          ["Per share per year", fmtInr2(r.impliedPerShare)]
        ], priv) + '<p class="tl-note">Dividends are never guaranteed — companies can raise, cut or skip them.</p>');
      }
    },
    {
      id: "infl", group: "Income & returns", title: "Inflation-adjusted Return",
      info: "What a headline return is really worth after inflation takes its share.",
      html: function () {
        return fld("tlInfAmt", "Amount (₹)", 100000) + fld("tlInfNom", "Return (% per year)", 12) +
          fld("tlInfInf", "Inflation (% per year)", 6) + fld("tlInfYrs", "Years", 10);
      },
      compute: function (p) {
        var o = { amount: val(p, "tlInfAmt"), nominalPct: val(p, "tlInfNom"), inflationPct: val(p, "tlInfInf"), years: val(p, "tlInfYrs") };
        if (!(o.amount > 0)) return setErr(p, "Enter an amount above 0.");
        if (o.nominalPct == null || o.inflationPct == null || !(o.years > 0 && o.years <= 100)) return setErr(p, "Fill in return, inflation and a period of 1–100 years.");
        var r = M.inflationAdj(o);
        setResults(p, statsHtml([
          ["Real return", fmtPct(r.realPct), "per year, after inflation"],
          ["Grows to", fmtInr(r.fvNominal)],
          ["Worth in today's money", fmtInr(r.fvInTodaysMoney)],
          ["Today's basket will cost", fmtInr(r.costLater)]
        ]));
      }
    },
    {
      id: "xirr", group: "Income & returns", title: "XIRR — Custom Cash Flows",
      info: "The single yearly rate that explains a set of dated cash flows.",
      advice: false,
      html: function () {
        var now = new Date(), yrAgo = new Date(now.getTime() - 365.25 * 86400000);
        function iso(d) { return d.toISOString().slice(0, 10); }
        return '<p class="tl-note">Money you put IN is negative (−100000). Money you take OUT — or today\'s value of what you still hold — is positive.</p>' +
          '<div class="tl-xrows">' + xirrRow(iso(yrAgo), -100000) + xirrRow(iso(now), 112000) + "</div>" +
          '<button type="button" class="btn" data-tl-add-xirr="1">+ Add a cash flow</button>';
      },
      compute: function (p) {
        var flows = [];
        p.querySelectorAll(".tl-xrow").forEach(function (row) {
          var d = row.querySelector(".tl-xdate").value, a = num(row.querySelector(".tl-xamt").value);
          var t = d ? new Date(d + "T00:00:00").getTime() : NaN;
          if (Number.isFinite(t) && a != null && a !== 0) flows.push({ t: t, a: a });
        });
        var r = M.xirr(flows);
        if (r.err) return setErr(p, r.err);
        setResults(p, statsHtml([["XIRR", fmtPct(r.rate * 100), "per year, on your dates"]]) +
          '<p class="tl-note">XIRR assumes every flow is reinvested at this same rate — a summary of the past, not a promise.</p>');
      }
    }
  );
  function lotRow(q, pr) {
    return '<div class="tl-lot"><div class="ds-field tl-fld"><input class="ds-input tl-lot-qty" type="number" inputmode="decimal" step="any" placeholder=" " value="' + q + '"><label class="ds-field__label">Qty</label></div>' +
      '<div class="ds-field tl-fld"><input class="ds-input tl-lot-price" type="number" inputmode="decimal" step="any" placeholder=" " value="' + pr + '"><label class="ds-field__label">Buy price (₹)</label></div>' +
      '<button type="button" class="icon-btn tl-row-x" data-tl-del-lot="1" aria-label="Remove this buy">✕</button></div>';
  }
  function xirrRow(date, amt) {
    return '<div class="tl-xrow"><input class="tl-xdate" type="date" value="' + date + '" aria-label="Date">' +
      '<div class="ds-field tl-fld"><input class="ds-input tl-xamt" type="number" inputmode="decimal" step="any" placeholder=" " value="' + amt + '"><label class="ds-field__label">Amount (₹)</label></div>' +
      '<button type="button" class="icon-btn tl-row-x" data-tl-del-xirr="1" aria-label="Remove this cash flow">✕</button></div>';
  }
  function verifiedNoteText() {
    return "Default rates last verified " + new Date(CHARGES_DEFAULTS.verifiedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " against NSE, SEBI and broker published schedules." + (chargesCustomised() ? " You have customised rates saved — they are used above and kept in your profile." : "");
  }
  function syncRateInputs(p) {
    var cfg = chargesConfig();
    p.querySelectorAll(".tl-rate").forEach(function (inp) { inp.value = cfg[inp.dataset.rate]; });
    var note = p.querySelector("#tlChVerified");
    if (note) note.textContent = verifiedNoteText();
  }
  function readRateInputs(p) {
    var cfg = chargesConfig();
    p.querySelectorAll(".tl-rate").forEach(function (inp) {
      var v = num(inp.value);
      if (v != null && v >= 0) cfg[inp.dataset.rate] = v;
    });
    return cfg;
  }
  function fillHoldingPick(p) {
    var sel = p.querySelector("#tlDivPick");
    if (!sel || sel.options.length) return;
    var rows = [];
    try { if (typeof enriched === "function") rows = (enriched() || {}).rows || []; } catch (e) {}
    if (!rows.length) {
      sel.innerHTML = '<option value="">No holdings found — use Manual entry</option>';
      return;
    }
    sel.innerHTML = rows.map(function (r, i) {
      return '<option value="' + i + '" data-qty="' + (r.qty != null ? r.qty : (r.quantity != null ? r.quantity : "")) + '" data-ltp="' + (r.ltp != null ? r.ltp : "") + '">' + escT(r.sym) + "</option>";
    }).join("");
  }

  /* ================= sheet ================= */
  var sheetEl = null;
  function panelById(id) { for (var i = 0; i < PANELS.length; i++) if (PANELS[i].id === id) return PANELS[i]; return null; }
  function buildSheet() {
    var m = document.createElement("div");
    m.id = "toolsSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Tools");
    var groups = [], seen = {};
    PANELS.forEach(function (d) { if (!seen[d.group]) { seen[d.group] = 1; groups.push(d.group); } });
    var indexHtml = '<p class="tl-info">Free calculators that run entirely on this device — no internet needed, nothing is uploaded.</p>' +
      groups.map(function (g) {
        return '<div class="tl-group">' + g + "</div>" + PANELS.filter(function (d) { return d.group === g; }).map(function (d) {
          return '<button type="button" class="tl-idx-row" data-tl-go="' + d.id + '"><span class="tl-idx-main"><span class="tl-idx-title">' + d.title + '</span><span class="tl-idx-sub">' + d.info + '</span></span><span class="tl-idx-chev" aria-hidden="true">›</span></button>';
        }).join("");
      }).join("");
    m.innerHTML = '<div class="modal-card tl-card">' +
      '<div class="tl-head"><button type="button" class="icon-btn tl-back hidden" id="tlBack" aria-label="Back to all tools"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>' +
      '<h3 id="tlTitle">Tools</h3><button type="button" class="icon-btn" id="tlClose" aria-label="Close">✕</button></div>' +
      '<div class="tl-body"><div id="tlIndex">' + indexHtml + "</div>" +
      PANELS.map(function (d) { return panelShell(d, d.html()); }).join("") +
      "</div></div>";
    document.body.appendChild(m);
    PANELS.forEach(function (d) { if (d.mount) { try { d.mount(m.querySelector('[data-panel="' + d.id + '"]')); } catch (e) {} } });
    wire(m);
    return m;
  }
  function showIndex() {
    if (!sheetEl) return;
    sheetEl.querySelectorAll(".tl-panel").forEach(function (s) { s.classList.add("hidden"); });
    sheetEl.querySelector("#tlIndex").classList.remove("hidden");
    sheetEl.querySelector("#tlTitle").textContent = "Tools";
    sheetEl.querySelector("#tlBack").classList.add("hidden");
    sheetEl.querySelector(".tl-body").scrollTop = 0;
  }
  /* v130: the open calculator is ONE history step of its own (registered
     with the modal manager), so a Back press returns to this index and
     only a second Back closes the sheet. */
  var subTok = null;
  function backToIndex() { subTok = null; showIndex(); }
  function showPanel(id) {
    var def = panelById(id); if (!def || !sheetEl) return;
    sheetEl.querySelector("#tlIndex").classList.add("hidden");
    sheetEl.querySelectorAll(".tl-panel").forEach(function (s) { s.classList.toggle("hidden", s.dataset.panel !== id); });
    sheetEl.querySelector("#tlTitle").textContent = def.title;
    sheetEl.querySelector("#tlBack").classList.remove("hidden");
    var p = sheetEl.querySelector('[data-panel="' + id + '"]');
    sheetEl.querySelector(".tl-body").scrollTop = 0;
    try { def.compute(p); } catch (e) { setErr(p, "Something went wrong in this calculator — check the numbers and try again."); }
    if (window.folioSubSwap) subTok = window.folioSubSwap(sheetEl, backToIndex);
  }
  function openTools(opts) {
    if (!sheetEl) sheetEl = buildSheet();
    var wasHidden = sheetEl.classList.contains("hidden");
    /* A token left over from a previous open is stale (the manager
       discarded it when the sheet closed) — settling it just runs the
       visual close. A live token with no calculator requested settles
       for real, so the sheet reopens at its index, one step deep. */
    if (subTok && window.folioSubSettle && (wasHidden || !(opts && opts.calc))) window.folioSubSettle(subTok);
    if (wasHidden) subTok = null;
    sheetEl.classList.remove("hidden");
    if (opts && opts.calc && panelById(opts.calc)) showPanel(opts.calc);
    else showIndex();
  }
  function computeFrom(el) {
    var p = el.closest ? el.closest(".tl-panel") : null;
    if (!p) return;
    var def = panelById(p.dataset.panel);
    if (def) { try { def.compute(p); } catch (e) { setErr(p, "Something went wrong in this calculator — check the numbers and try again."); } }
  }
  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#tlClose")) { m.classList.add("hidden"); return; }
      if (t.closest("#tlBack")) { if (subTok && window.folioSubSettle) window.folioSubSettle(subTok); else showIndex(); return; }
      var go = t.closest("[data-tl-go]");
      if (go) { showPanel(go.dataset.tlGo); return; }
      var segBtn = t.closest(".ds-seg__btn");
      if (segBtn) {
        var seg = segBtn.closest("[data-tl-seg]");
        seg.querySelectorAll(".ds-seg__btn").forEach(function (b) { b.setAttribute("aria-pressed", b === segBtn ? "true" : "false"); });
        seg.dataset.value = segBtn.dataset.val;
        if (seg.dataset.tlSeg === "tlDivMode" && segBtn.dataset.val === "holdings") {
          var p0 = seg.closest(".tl-panel"); fillHoldingPick(p0); applyHoldingPick(p0);
        }
        computeFrom(segBtn);
        return;
      }
      if (t.closest("[data-tl-rates]")) { m.querySelector(".tl-rates").classList.toggle("hidden"); return; }
      if (t.closest("[data-tl-rates-reset]")) {
        var ts = toolsSettings(); delete ts.charges;
        try { persist(); } catch (err) {}
        var pc = m.querySelector('[data-panel="charges"]');
        syncRateInputs(pc); computeFrom(t);
        return;
      }
      if (t.closest("[data-tl-add-lot]")) {
        var lots = t.closest(".tl-panel").querySelector(".tl-lots");
        lots.insertAdjacentHTML("beforeend", lotRow("", ""));
        computeFrom(t); return;
      }
      var delLot = t.closest("[data-tl-del-lot]");
      if (delLot) {
        var lp = delLot.closest(".tl-panel");
        if (lp.querySelectorAll(".tl-lot").length > 1) delLot.closest(".tl-lot").remove();
        else delLot.closest(".tl-lot").querySelectorAll("input").forEach(function (i) { i.value = ""; });
        computeFrom(t); return;
      }
      if (t.closest("[data-tl-add-xirr]")) {
        var xr = t.closest(".tl-panel").querySelector(".tl-xrows");
        xr.insertAdjacentHTML("beforeend", xirrRow(new Date().toISOString().slice(0, 10), ""));
        computeFrom(t); return;
      }
      var delX = t.closest("[data-tl-del-xirr]");
      if (delX) {
        var xp = delX.closest(".tl-panel");
        if (xp.querySelectorAll(".tl-xrow").length > 1) delX.closest(".tl-xrow").remove();
        computeFrom(t); return;
      }
    });
    m.addEventListener("input", function (e) {
      if (e.target.classList && e.target.classList.contains("tl-rate")) {
        var cfg = readRateInputs(m.querySelector('[data-panel="charges"]'));
        saveCharges(cfg);
        /* Refresh only the note — never rewrite the rate inputs here:
           writing values back mid-keystroke would eat characters like
           the "." in "0.00307" while the user is still typing. */
        var note = m.querySelector("#tlChVerified");
        if (note) note.textContent = verifiedNoteText();
      }
      computeFrom(e.target);
    });
    m.addEventListener("change", function (e) {
      if (e.target.id === "tlDivPick") { applyHoldingPick(e.target.closest(".tl-panel")); computeFrom(e.target); return; }
      if (e.target.classList && e.target.classList.contains("tl-xdate")) computeFrom(e.target);
    });
  }
  function applyHoldingPick(p) {
    var sel = p.querySelector("#tlDivPick");
    if (!sel || !sel.options.length || sel.selectedIndex < 0) return;
    var opt = sel.options[sel.selectedIndex];
    var q = opt.getAttribute("data-qty"), ltp = opt.getAttribute("data-ltp");
    if (q) p.querySelector("#tlDivShares").value = q;
    if (ltp) p.querySelector("#tlDivPrice").value = ltp;
  }

  window.FolioTools = { open: openTools };
})();
