/* ================= FOLIO PORTFOLIO TOOLS (Phase 6B) =================
   Lazy module — loaded on first open via window.folioOpenPTools() in
   features.js (same contract as tools.js / share.js / report.js).
   NOT in SW CORE. Offline maths on the user's OWN data only: it READS
   enriched() / computeHoldings() / priceOf() outputs and the analytics
   hook's published result — it never alters a holding, a transaction
   or any existing calculation, and nothing here places a trade.

   Persisted settings (insX pattern — state.profile.ptools, so they
   ride the existing cloud doc / .folio vault):
     ptools.targets {SYM: target %}   — Rebalance Planner targets
     ptools.tax     {stcg, ltcg, exempt} — Harvest helper rates.
   The tax defaults are SEEDED from the app's existing Capital Gains
   rates (state.profile.taxCfg) when present, else the verified
   statutory defaults below, so this helper and the Tax section start
   in agreement. Edits here write to ptools.tax only.

   TAX RATE PROVENANCE (verified 2026-11-16 via official sources):
     STCG 20% on STT-paid listed equity — Section 111A, Income-tax
       Act 1961 (Section 196 of the Income-tax Act, 2025 from
       1 Apr 2026), raised from 15% by the Finance (No. 2) Act, 2024
       for transfers on or after 23 Jul 2024.
     LTCG 12.5% above a Rs 1,25,000 per-FY exemption — Section 112A
       (Section 198 of the 2025 Act), same Finance Act; exemption
       raised from Rs 1,00,000.
     Budget 2025 and Budget 2026 left both rates and the exemption
       unchanged (confirmed against Income Tax Department guidance
       summaries and multiple Budget analyses, Nov 2026).
     Long-term = held more than 12 months; this app's FIFO tax code
       (folioFifo) uses days > 365, and so does the harvest helper. */
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
  function fmtD(ds) {
    try { if (typeof fmtDate === "function") return fmtDate(ds); } catch (e) {}
    return ds || "—";
  }
  function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
  function todayStrSafe() {
    try { if (typeof todayStr === "function") return todayStr(); } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- persistence (insX pattern: state.profile + persist()) ---------- */
  var TAX_FALLBACK = { stcg: 20, ltcg: 12.5, exempt: 125000 };
  function ptSettings() {
    try {
      var p = state.profile || (state.profile = {});
      if (!p.ptools) p.ptools = {};
      return p.ptools;
    } catch (e) { return {}; }
  }
  function taxConfig() {
    var pt = ptSettings();
    if (pt.tax && Number.isFinite(pt.tax.stcg) && Number.isFinite(pt.tax.ltcg) && Number.isFinite(pt.tax.exempt)) {
      return { stcg: pt.tax.stcg, ltcg: pt.tax.ltcg, exempt: pt.tax.exempt };
    }
    /* Seed from the app's existing Capital Gains rates so both agree. */
    try {
      var c = (typeof folioProf === "function") ? (folioProf().taxCfg || null) : null;
      if (c && Number.isFinite(c.stcg) && Number.isFinite(c.ltcg) && Number.isFinite(c.exempt)) {
        return { stcg: c.stcg, ltcg: c.ltcg, exempt: c.exempt };
      }
    } catch (e) {}
    return { stcg: TAX_FALLBACK.stcg, ltcg: TAX_FALLBACK.ltcg, exempt: TAX_FALLBACK.exempt };
  }
  function saveTax(cfg) {
    var pt = ptSettings();
    pt.tax = { stcg: cfg.stcg, ltcg: cfg.ltcg, exempt: cfg.exempt };
    try { persist(); } catch (e) {}
  }
  function savedTargets() {
    var pt = ptSettings();
    return (pt.targets && typeof pt.targets === "object") ? pt.targets : {};
  }
  function saveTarget(sym, pct) {
    var pt = ptSettings();
    if (!pt.targets) pt.targets = {};
    pt.targets[sym] = pct;
    try { persist(); } catch (e) {}
  }

  /* ================= PURE MATHS (window.FolioPToolsMath — harness-tested) ================= */
  var M = {};

  /* Concentration picture of a set of positions.
     rows: [{sym, cur}] — cur = current value in ₹. Weights in %. */
  M.concentration = function (rows) {
    var total = 0;
    rows.forEach(function (r) { if (Number.isFinite(r.cur) && r.cur > 0) total += r.cur; });
    var weights = {};
    rows.forEach(function (r) { weights[r.sym] = total > 0 && Number.isFinite(r.cur) ? Math.max(0, r.cur) / total * 100 : 0; });
    var sorted = Object.keys(weights).map(function (k) { return weights[k]; }).sort(function (a, b) { return b - a; });
    var hhi = 0;
    sorted.forEach(function (w) { hhi += Math.pow(w / 100, 2); });
    return {
      total: total, weights: weights,
      top1: sorted.length ? sorted[0] : 0,
      top3: sorted.slice(0, 3).reduce(function (a, b) { return a + b; }, 0),
      hhi: hhi, effN: hhi > 0 ? 1 / hhi : 0
    };
  };

  /* Rebalance planner.
     rows: [{sym, qty, cur, ltp}] — ltp null = no live price (skipped).
     targets: {sym: pct}. mode: "add" (newCash funds buys only) or
     "full" (buys and sells). Fractional shares are rounded DOWN to
     whole shares in both modes; in "add" mode buys are funded
     largest-gap-first so they never exceed the cash entered. */
  M.rebalance = function (rows, targets, mode, newCash) {
    var total = 0;
    rows.forEach(function (r) { if (Number.isFinite(r.cur)) total += r.cur; });
    var cash = mode === "add" ? Math.max(0, newCash || 0) : 0;
    var base = total + cash;
    var out = rows.map(function (r) {
      var t = Number(targets[r.sym]);
      var targetPct = Number.isFinite(t) ? Math.min(100, Math.max(0, t)) : 0;
      var curPct = total > 0 && Number.isFinite(r.cur) ? r.cur / total * 100 : 0;
      var o = {
        sym: r.sym, qtyHeld: r.qty, cur: r.cur, ltp: r.ltp,
        curPct: curPct, targetPct: targetPct,
        targetVal: targetPct / 100 * base,
        action: "none", qty: 0, val: 0, skipped: false
      };
      if (r.ltp == null || !(r.ltp > 0)) { o.skipped = true; o.action = "skip"; }
      return o;
    });
    var totalBuys = 0, totalSells = 0;
    if (mode === "full") {
      out.forEach(function (o) {
        if (o.skipped) return;
        var diff = o.targetVal - o.cur;
        if (diff > 0) {
          o.qty = Math.floor(diff / o.ltp); o.val = o.qty * o.ltp;
          if (o.qty > 0) { o.action = "buy"; totalBuys += o.val; } else o.qty = 0;
        } else if (diff < 0) {
          o.qty = Math.min(o.qtyHeld, Math.floor(-diff / o.ltp)); o.val = o.qty * o.ltp;
          if (o.qty > 0) { o.action = "sell"; totalSells += o.val; } else o.qty = 0;
        }
      });
    } else {
      var cashLeft = cash;
      var gaps = out.filter(function (o) { return !o.skipped && o.targetVal - o.cur > 0; })
        .sort(function (a, b) { return (b.targetVal - b.cur) - (a.targetVal - a.cur); });
      gaps.forEach(function (o) {
        if (cashLeft <= 0) return;
        var spend = Math.min(o.targetVal - o.cur, cashLeft);
        o.qty = Math.floor(spend / o.ltp); o.val = o.qty * o.ltp;
        if (o.qty > 0) { o.action = "buy"; totalBuys += o.val; cashLeft -= o.val; }
        else { o.qty = 0; o.val = 0; }
      });
    }
    return {
      rows: out, total: total, base: base, newCash: cash,
      totalBuys: totalBuys, totalSells: totalSells,
      leftover: mode === "add" ? cash - totalBuys : totalSells - totalBuys,
      targetSum: out.reduce(function (a, o) { return a + o.targetPct; }, 0)
    };
  };

  /* What-if: apply a signed ₹ change (deltaVal) to one stock and
     compare concentration before / after. rows: [{sym, cur}]. */
  M.whatIf = function (rows, sym, deltaVal) {
    var before = M.concentration(rows);
    var afterRows = [], found = false;
    rows.forEach(function (r) {
      if (r.sym === sym) { found = true; var nv = r.cur + deltaVal; if (nv > 0) afterRows.push({ sym: r.sym, cur: nv }); }
      else afterRows.push({ sym: r.sym, cur: r.cur });
    });
    if (!found && deltaVal > 0) afterRows.push({ sym: sym, cur: deltaVal });
    var after = M.concentration(afterRows);
    return {
      before: before, after: after,
      stockBefore: before.weights[sym] || 0,
      stockAfter: after.weights[sym] || 0
    };
  };

  /* Weighted-average beta from per-stock betas (the same Σ w·β the
     app's own stress test uses). Returns covered = share of weight
     that has a beta; callers must require covered >= 0.999. */
  M.wtdBeta = function (weights, betas) {
    var sum = 0, covered = 0;
    Object.keys(weights).forEach(function (sym) {
      var w = weights[sym];
      if (!(w > 0)) return;
      var b = betas ? betas[sym] : null;
      if (Number.isFinite(b)) { sum += w * b; covered += w; }
    });
    return { beta: covered > 0 ? sum / covered : null, covered: covered };
  };
  /* Weighted-average per-stock volatility (weights as fractions). */
  M.wtdVol = function (weights, vols) {
    var sum = 0, covered = 0;
    Object.keys(weights).forEach(function (sym) {
      var w = weights[sym];
      if (!(w > 0)) return;
      var v = vols ? vols[sym] : null;
      if (Number.isFinite(v)) { sum += w * v; covered += w; }
    });
    return { vol: covered > 0 ? sum / covered : null, covered: covered };
  };

  /* Losing lots still held. rows: enriched() rows (carry .lots from
     computeHoldings and .ltp). Term per folioFifo: days > 365 = Long.
     Lots without a live price are reported via `unpriced`, never
     guessed. Loss is a positive number in the output rows. */
  M.harvestLots = function (rows, today) {
    var out = [], stLoss = 0, ltLoss = 0, unpriced = [];
    var tNow = new Date(today);
    (rows || []).forEach(function (r) {
      if (r.ltp == null || !(r.ltp > 0)) { if ((r.lots || []).length) unpriced.push(r.sym); return; }
      (r.lots || []).forEach(function (l) {
        if (!(l.qty > 0) || !(l.price > r.ltp)) return;
        var days = Math.round((tNow - new Date(l.date)) / 86400000);
        var term = days > 365 ? "Long" : "Short";
        var loss = l.qty * (l.price - r.ltp);
        if (term === "Long") ltLoss += loss; else stLoss += loss;
        out.push({ sym: r.sym, date: l.date, days: days, term: term, qty: l.qty, avg: l.price, ltp: r.ltp, loss: loss });
      });
    });
    out.sort(function (a, b) { return b.loss - a.loss; });
    return { lots: out, stLoss: stLoss, ltLoss: ltLoss, unpriced: unpriced };
  };

  /* Estimated tax saved by harvesting, counted ONLY against gains
     already booked this financial year (the same booked figures the
     Tax section shows). Long-term losses are counted only against
     the part of booked LTCG that sits ABOVE the remaining yearly
     exemption — the exemption interaction. Anything beyond that is
     deliberately not counted (the UI explains carry-forward). */
  M.harvestBenefit = function (stLoss, ltLoss, bookedSt, bookedLt, cfg) {
    var bookedStPos = Math.max(0, bookedSt || 0);
    var bookedLtPos = Math.max(0, bookedLt || 0);
    var remainingExemption = Math.max(0, (cfg.exempt || 0) - bookedLtPos);
    var taxableBookedLt = Math.max(0, bookedLtPos - (cfg.exempt || 0));
    var stUsed = Math.min(Math.max(0, stLoss || 0), bookedStPos);
    var ltUsed = Math.min(Math.max(0, ltLoss || 0), taxableBookedLt);
    return {
      stBenefit: stUsed * (cfg.stcg || 0) / 100,
      ltBenefit: ltUsed * (cfg.ltcg || 0) / 100,
      stUsed: stUsed, ltUsed: ltUsed,
      remainingExemption: remainingExemption,
      taxableBookedLt: taxableBookedLt
    };
  };
  window.FolioPToolsMath = M;

  /* ================= data access (read-only) ================= */
  function portRows() {
    try { if (typeof enriched === "function") return (enriched() || {}).rows || []; } catch (e) {}
    return [];
  }
  function portSplit() {
    try { if (typeof enriched === "function") return (enriched() || {}).split || null; } catch (e) {}
    return null;
  }
  function livePrice(sym) {
    try { if (typeof priceOf === "function") { var p = priceOf(sym); if (p && Number.isFinite(p.price)) return p.price; } } catch (e) {}
    return null;
  }

  /* ================= UI helpers (mirror tools.js) ================= */
  function fld(id, label, val, extra) {
    return '<div class="ds-field pt-fld"><input class="ds-input" id="' + id + '" type="number" inputmode="decimal" step="any" placeholder=" " value="' + (val == null ? "" : val) + '"' + (extra || "") + '><label class="ds-field__label" for="' + id + '">' + label + "</label></div>";
  }
  function fldText(id, label, val) {
    return '<div class="ds-field pt-fld"><input class="ds-input" id="' + id + '" type="text" autocapitalize="characters" autocomplete="off" placeholder=" " value="' + (val == null ? "" : escT(val)) + '"><label class="ds-field__label" for="' + id + '">' + label + "</label></div>";
  }
  function seg(id, opts, active) {
    return '<div class="ds-seg pt-seg" data-pt-seg="' + id + '" role="group">' + opts.map(function (o) {
      return '<button type="button" class="ds-seg__btn" data-val="' + o[0] + '" aria-pressed="' + (o[0] === active ? "true" : "false") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function amt(html) { return '<span class="ds-amt">' + html + "</span>"; }
  function statsHtml(items) {
    return '<div class="ds-stat-grid pt-stats">' + items.map(function (it) {
      return '<div class="ds-stat"><div class="ds-stat__label">' + it[0] + '</div><div class="ds-stat__value pt-stat-v">' + it[1] +
        (it[2] ? '</div><div class="ds-stat__sub">' + it[2] + "</div>" : "</div>") + "</div>";
    }).join("") + "</div>";
  }
  function deltaChip(before, after, fmt, invert) {
    if (!Number.isFinite(before) || !Number.isFinite(after)) return "";
    var d = after - before;
    if (Math.abs(d) < 1e-9) return ' <span class="pt-delta">no change</span>';
    var good = invert ? d < 0 : d > 0;
    return ' <span class="pt-delta ' + (good ? "pos" : "neg") + '">' + (d > 0 ? "▲ " : "▼ ") + fmt(Math.abs(d)) + "</span>";
  }
  function panelShell(def, inner) {
    return '<section class="pt-panel hidden" data-panel="' + def.id + '">' +
      '<p class="pt-info">' + def.info + "</p>" + inner +
      '<p class="pt-err hidden" role="alert"></p><div class="pt-results"></div>' +
      (def.advice ? '<p class="pt-advice">' + def.advice + "</p>" : "") + "</section>";
  }
  function setErr(panel, msg) {
    var e = panel.querySelector(".pt-err"), r = panel.querySelector(".pt-results");
    if (msg) { e.textContent = msg; e.classList.remove("hidden"); r.innerHTML = ""; }
    else { e.textContent = ""; e.classList.add("hidden"); }
  }
  function setResults(panel, html) {
    setErr(panel, null);
    panel.querySelector(".pt-results").innerHTML = html;
  }
  function val(panel, id) { var el = panel.querySelector("#" + id); return el ? num(el.value) : null; }
  function segVal(panel, id) {
    var s = panel.querySelector('[data-pt-seg="' + id + '"]');
    if (!s) return null;
    if (s.dataset.value) return s.dataset.value;
    var on = s.querySelector('[aria-pressed="true"]');
    return on ? on.dataset.val : null;
  }

  var ORDERS_NOTE = "Information only — Folio never places orders. Check every quantity with your broker before acting.";
  var RISK_NOTE = "Volatility and beta need price history for every stock — not shown for this simulation.";

  var PANELS = [
    {
      id: "rebal", group: "Plan the portfolio", title: "Rebalance Planner",
      info: "Set a target share for each stock and get the exact whole-share buys and sells that take you there, at today's prices.",
      advice: ORDERS_NOTE,
      html: function () {
        return '<label class="pt-lab">How should the plan be funded?</label>' +
          seg("ptRbMode", [["add", "Add money only"], ["full", "Full rebalance"]], "add") +
          '<div class="pt-rb-cash">' + fld("ptRbCash", "New money to invest (₹)", "") + "</div>" +
          '<div class="pt-rb-tools"><button type="button" class="btn small" data-pt-rb="current">Reset to current weights</button>' +
          '<button type="button" class="btn small" data-pt-rb="equal">Equal weight</button></div>' +
          '<div class="pt-trows"></div><p class="pt-note pt-rb-sum"></p>';
      },
      mount: function (p) { buildTargetRows(p); },
      compute: function (p) {
        var rows = portRows();
        if (!rows.length) return setResults(p, '<p class="empty-note">No holdings yet — once you own stocks, you can plan target weights and the exact trades to reach them here.</p>');
        var mode = segVal(p, "ptRbMode") || "add";
        var cashWrap = p.querySelector(".pt-rb-cash");
        if (cashWrap) cashWrap.classList.toggle("hidden", mode !== "add");
        var targets = {};
        p.querySelectorAll(".pt-tin").forEach(function (inp) {
          var v = num(inp.value);
          targets[inp.dataset.ptSym] = v == null ? 0 : v;
        });
        var cash = val(p, "ptRbCash") || 0;
        var data = rows.map(function (r) { return { sym: r.sym, qty: r.qty, cur: r.cur, ltp: r.ltp }; });
        var res = M.rebalance(data, targets, mode, cash);
        p.querySelector(".pt-rb-sum").textContent = "Targets add up to " + res.targetSum.toFixed(1) + "%" +
          (Math.abs(res.targetSum - 100) > 0.5 && res.targetSum > 0 ? " — for a full plan they should add up to 100%." : ".");
        if (mode === "add" && !(cash > 0)) {
          return setResults(p, '<p class="empty-note">Enter the new money you plan to invest above — in Add-money mode the buy quantities are funded from it, largest gap first. Nothing is sold in this mode.</p>');
        }
        var body = res.rows.map(function (o) {
          var act = o.skipped ? '<span class="pt-skip">Price unavailable — skipped</span>'
            : o.action === "buy" ? '<b class="pos">Buy</b>'
            : o.action === "sell" ? '<b class="neg">Sell</b>' : "—";
          return "<tr><td><b>" + escT(o.sym) + "</b></td><td>" + o.curPct.toFixed(1) + "%</td><td>" + o.targetPct.toFixed(1) + "%</td><td>" + act + "</td><td>" +
            (o.skipped || o.action === "none" ? "—" : amt(String(o.qty))) + "</td><td>" +
            (o.skipped || o.action === "none" ? "—" : amt(fmtInr(o.val))) + "</td></tr>";
        }).join("");
        var totals;
        if (mode === "add") {
          totals = statsHtml([
            ["New money", amt(fmtInr(res.newCash))],
            ["Goes into buys", amt(fmtInr(res.totalBuys))],
            ["Left over", amt(fmtInr(res.leftover)), "whole shares only — fractions are never bought"]
          ]);
        } else {
          totals = statsHtml([
            ["Total buys", amt(fmtInr(res.totalBuys))],
            ["Total sells", amt(fmtInr(res.totalSells))],
            [res.leftover >= 0 ? "Cash left over" : "Extra cash needed", amt(fmtInr(Math.abs(res.leftover))), res.leftover >= 0 ? "released by sells, after the buys" : "the sells do not fully fund the buys"]
          ]);
        }
        var skipped = res.rows.filter(function (o) { return o.skipped; });
        setResults(p, totals +
          '<div class="ds-table-wrap pt-table-wrap"><table class="pt-table"><thead><tr><th>Stock</th><th>Now</th><th>Target</th><th>Action</th><th>Qty</th><th>Value</th></tr></thead><tbody>' + body + "</tbody></table></div>" +
          (skipped.length ? '<p class="pt-note">No live price for ' + skipped.map(function (o) { return escT(o.sym); }).join(", ") + " — those rows are skipped, never guessed. Their value still counts in the portfolio total, so the other targets are worked out against the full portfolio.</p>" : "") +
          '<p class="pt-note">Quantities use the latest price on this device and are rounded down to whole shares.</p>');
      }
    },
    {
      id: "whatif", group: "Plan the portfolio", title: "What-If Simulator",
      info: "Try a buy or a sell on paper and see the portfolio you would end up with — weights, concentration and, where history allows, risk.",
      advice: "Simulation only — no trade is placed, and nothing is saved.",
      html: function () {
        return '<label class="pt-lab" for="ptWiPick">Stock</label><select id="ptWiPick" class="pt-select"></select>' +
          '<div class="pt-wi-symrow hidden">' + fldText("ptWiSym", "Symbol (e.g. RELIANCE)", "") + "</div>" +
          '<p class="pt-note pt-wi-held"></p>' +
          fld("ptWiPrice", "Price to simulate at (₹)", "") +
          '<label class="pt-lab">Side</label>' + seg("ptWiSide", [["buy", "Buy"], ["sell", "Sell"]], "buy") +
          '<label class="pt-lab">Size it by</label>' + seg("ptWiBasis", [["qty", "Quantity"], ["amt", "Amount ₹"]], "qty") +
          '<div class="pt-wi-qty">' + fld("ptWiQty", "Quantity (shares)", "") + '</div>' +
          '<div class="pt-wi-amt hidden">' + fld("ptWiAmt", "Amount (₹)", "") + "</div>" +
          '<div class="pt-wi-risk"></div>';
      },
      mount: function (p) { buildWiPick(p); syncWiPick(p); },
      compute: function (p) { computeWhatIf(p); }
    },
    {
      id: "harvest", group: "Tax", title: "Tax-Loss Harvesting Helper",
      info: "Positions sitting at a loss, lot by lot. Booking a loss before 31 March can reduce the tax on gains you have already booked this financial year.",
      advice: false,
      html: function () {
        return '<button type="button" class="btn pt-rates-btn" data-pt-rates="1">Edit tax rates</button>' +
          '<div class="pt-rates hidden">' +
          fld("ptTaxStcg", "Short-term rate — STCG (%)", "", ' data-pt-rate="stcg"') +
          fld("ptTaxLtcg", "Long-term rate — LTCG (%)", "", ' data-pt-rate="ltcg"') +
          fld("ptTaxExempt", "LTCG exemption per year (₹)", "", ' data-pt-rate="exempt"') +
          '<p class="pt-note" id="ptTaxVerified"></p>' +
          '<button type="button" class="btn" data-pt-rates-reset="1">Reset rates to verified defaults</button></div>';
      },
      mount: function (p) { syncTaxInputs(p); },
      compute: function (p) { computeHarvest(p); }
    }
  ];

  /* ---------- Rebalance Planner: target rows ---------- */
  function buildTargetRows(p) {
    var wrap = p.querySelector(".pt-trows");
    if (!wrap) return;
    var rows = portRows();
    if (!rows.length) { wrap.innerHTML = '<p class="empty-note">No holdings yet.</p>'; return; }
    var total = rows.reduce(function (a, r) { return a + (Number.isFinite(r.cur) ? r.cur : 0); }, 0);
    var saved = savedTargets();
    wrap.innerHTML = rows.map(function (r) {
      var curPct = total > 0 ? r.cur / total * 100 : 0;
      var t = Number.isFinite(saved[r.sym]) ? saved[r.sym] : Math.round(curPct * 10) / 10;
      return '<div class="pt-trow"><span class="pt-trow-sym">' + escT(r.sym) + '</span>' +
        '<span class="pt-trow-now">' + curPct.toFixed(1) + '% now</span>' +
        '<input class="pt-tin" data-pt-sym="' + escT(r.sym) + '" type="number" inputmode="decimal" step="0.5" min="0" max="100" value="' + t + '" aria-label="Target percent for ' + escT(r.sym) + '">' +
        '<span class="pt-trow-pct">%</span></div>';
    }).join("");
  }

  /* ---------- What-If Simulator ---------- */
  var wiRiskToken = 0;
  function wiPickVal(p) {
    var sel = p.querySelector("#ptWiPick");
    return sel ? sel.value : "";
  }
  function wiSymbol(p) {
    var v = wiPickVal(p);
    if (v.indexOf("X:") === 0) {
      var inp = p.querySelector("#ptWiSym");
      return inp ? inp.value.trim().toUpperCase() : "";
    }
    return v.slice(2);
  }
  function buildWiPick(p) {
    var sel = p.querySelector("#ptWiPick");
    if (!sel) return;
    var rows = portRows();
    var held = {};
    rows.forEach(function (r) { held[r.sym] = 1; });
    var watch = [];
    try { (state.watch || []).forEach(function (w) { if (w && w.sym && !held[w.sym]) watch.push(w.sym); }); } catch (e) {}
    var html = "";
    if (rows.length) html += '<optgroup label="My holdings">' + rows.map(function (r) { return '<option value="H:' + escT(r.sym) + '">' + escT(r.sym) + "</option>"; }).join("") + "</optgroup>";
    if (watch.length) html += '<optgroup label="Watchlist">' + watch.map(function (s) { return '<option value="W:' + escT(s) + '">' + escT(s) + "</option>"; }).join("") + "</optgroup>";
    html += '<option value="X:">Type a symbol…</option>';
    sel.innerHTML = html;
  }
  function syncWiPick(p) {
    var v = wiPickVal(p);
    var symRow = p.querySelector(".pt-wi-symrow");
    if (symRow) symRow.classList.toggle("hidden", v.indexOf("X:") !== 0);
    var sym = wiSymbol(p);
    var rows = portRows();
    var held = null;
    rows.forEach(function (r) { if (r.sym === sym) held = r; });
    var price = held && held.ltp != null ? held.ltp : (sym ? livePrice(sym) : null);
    var priceInp = p.querySelector("#ptWiPrice");
    if (priceInp && document.activeElement !== priceInp) priceInp.value = price != null ? price : "";
    var heldEl = p.querySelector(".pt-wi-held");
    if (heldEl) {
      if (!sym) heldEl.textContent = "";
      else if (held) heldEl.textContent = "You hold " + held.qty + " shares" + (held.ltp != null ? " · latest price " + fmtInr2(held.ltp) : " · no live price on this device — type the price to simulate at") + ".";
      else heldEl.textContent = "Not in your holdings" + (price != null ? " · latest price " + fmtInr2(price) + "." : " — type the price to simulate at.");
    }
  }
  function computeWhatIf(p) {
    var riskBox = p.querySelector(".pt-wi-risk");
    var rows = portRows();
    if (!rows.length) {
      if (riskBox) riskBox.innerHTML = "";
      return setResults(p, '<p class="empty-note">No holdings yet — the simulator needs a portfolio to change. Add holdings first, then try trades on paper here.</p>');
    }
    var sym = wiSymbol(p);
    if (!sym) return setErr(p, "Pick a stock, or type a symbol.");
    var price = val(p, "ptWiPrice");
    if (!(price > 0)) return setErr(p, "Enter the price to simulate at — there is no live price for " + sym + " on this device, and Folio will not guess one.");
    var side = segVal(p, "ptWiSide") || "buy";
    var basis = segVal(p, "ptWiBasis") || "qty";
    var held = null;
    rows.forEach(function (r) { if (r.sym === sym) held = r; });
    var qty;
    if (basis === "qty") {
      qty = val(p, "ptWiQty");
      if (!(qty > 0)) return setErr(p, "Enter a quantity above 0.");
      qty = Math.floor(qty);
      if (qty < 1) return setErr(p, "Quantity must be at least 1 whole share.");
    } else {
      var amount = val(p, "ptWiAmt");
      if (!(amount > 0)) return setErr(p, "Enter an amount above 0.");
      qty = Math.floor(amount / price);
      if (qty < 1) return setErr(p, "That amount buys less than 1 share at this price.");
    }
    if (side === "sell") {
      if (!held) return setErr(p, "You do not hold " + sym + " — a sell can only be simulated on a stock you own.");
      if (qty > held.qty) return setErr(p, "You hold only " + held.qty + " shares of " + sym + " — the simulated sell cannot be bigger.");
    }
    var deltaVal = (side === "buy" ? 1 : -1) * qty * price;
    var data = rows.map(function (r) { return { sym: r.sym, cur: r.cur }; });
    var res = M.whatIf(data, sym, deltaVal);
    var pctFmt = function (x) { return x.toFixed(2) + "%"; };
    var html = statsHtml([
      ["Portfolio value", amt(fmtInr(res.before.total)) + " → " + amt(fmtInr(res.after.total)), deltaChip(res.before.total, res.after.total, function (x) { return fmtInr(x); })],
      [escT(sym) + " weight", res.stockBefore.toFixed(2) + "% → " + res.stockAfter.toFixed(2) + "%", deltaChip(res.stockBefore, res.stockAfter, pctFmt)],
      ["Biggest stock (top 1)", res.before.top1.toFixed(2) + "% → " + res.after.top1.toFixed(2) + "%", deltaChip(res.before.top1, res.after.top1, pctFmt, true)],
      ["Top 3 together", res.before.top3.toFixed(2) + "% → " + res.after.top3.toFixed(2) + "%", deltaChip(res.before.top3, res.after.top3, pctFmt, true)],
      ["HHI concentration", res.before.hhi.toFixed(3) + " → " + res.after.hhi.toFixed(3), deltaChip(res.before.hhi, res.after.hhi, function (x) { return x.toFixed(3); }, true)],
      ["Effective stocks", res.before.effN.toFixed(1) + " → " + res.after.effN.toFixed(1), "1 ÷ HHI — the equal-sized holdings your spread behaves like"]
    ]) + '<p class="pt-note">Simulated: ' + (side === "buy" ? "buy" : "sell") + " " + amt(String(qty)) + " shares of " + escT(sym) + " at " + amt(fmtInr2(price)) + " (" + amt(fmtInr(Math.abs(deltaVal))) + "). Weights use the latest prices on this device.</p>";
    setResults(p, html);
    fillWiRisk(p, riskBox, sym, rows, res);
  }
  /* Risk before/after — ONLY from the analytics engine's own published
     result (the folioAnalyticsForReport hook), ONLY when the simulated
     stock is an existing holding with history and EVERY holding has a
     beta and a volatility there. Beta is the weighted average of the
     stock betas (the Σ w·β the app's stress test uses); volatility
     after scales the engine's portfolio volatility by the change in
     weighted-average stock volatility, keeping the diversification
     benefit unchanged — both labelled estimates. Anything missing →
     the plain note, never an invented number. */
  function fillWiRisk(p, box, sym, rows, res) {
    if (!box) return;
    var token = ++wiRiskToken;
    box.innerHTML = '<p class="pt-note">Checking the risk picture…</p>';
    if (typeof window.folioAnalyticsForReport !== "function") { box.innerHTML = '<p class="pt-note">' + RISK_NOTE + "</p>"; return; }
    var heldSyms = {};
    rows.forEach(function (r) { heldSyms[r.sym] = 1; });
    if (!heldSyms[sym]) { box.innerHTML = '<p class="pt-note">' + RISK_NOTE + "</p>"; return; }
    window.folioAnalyticsForReport().then(function (pack) {
      if (token !== wiRiskToken) return;
      var fail = function () { box.innerHTML = '<p class="pt-note">' + RISK_NOTE + "</p>"; };
      try {
        var R = pack && pack.result;
        if (!R || !R.enough || !R.risk || R.risk.vol == null || R.risk.beta == null || !R.stocks) return fail();
        var st = R.stocks[sym];
        if (!st || st.vol == null || st.beta == null) return fail();
        var betas = {}, vols = {};
        var ok = true;
        rows.forEach(function (r) {
          var s = R.stocks[r.sym];
          if (!s || s.beta == null || s.vol == null) ok = false;
          else { betas[r.sym] = s.beta; vols[r.sym] = s.vol; }
        });
        if (!ok) return fail();
        var wB = {}, wA = {};
        rows.forEach(function (r) { wB[r.sym] = res.before.total > 0 ? r.cur / res.before.total : 0; });
        /* after-weights come straight from the concentration result */
        Object.keys(res.after.weights).forEach(function (k) { wA[k] = res.after.weights[k] / 100; });
        var bB = M.wtdBeta(wB, betas), bA = M.wtdBeta(wA, betas);
        var vB = M.wtdVol(wB, vols), vA = M.wtdVol(wA, vols);
        if (bB.covered < 0.999 || bA.covered < 0.999 || vB.covered < 0.999 || vA.covered < 0.999) return fail();
        if (bB.beta == null || bA.beta == null || !(vB.vol > 0) || vA.vol == null) return fail();
        var volAfter = R.risk.vol * (vA.vol / vB.vol);
        box.innerHTML = '<div class="pt-riskbox"><div class="pt-riskrow"><span>Volatility (per year)</span><b>' +
          (R.risk.vol * 100).toFixed(1) + "% → " + (volAfter * 100).toFixed(1) + "%</b></div>" +
          '<div class="pt-riskrow"><span>Beta vs ' + escT(pack.benchName || "benchmark") + '</span><b>' +
          bB.beta.toFixed(2) + " → " + bA.beta.toFixed(2) + "</b></div>" +
          '<p class="pt-note">Estimates from the same engine as Insights. Beta here is the weighted average of each stock\'s beta; the volatility-after figure keeps the portfolio\'s diversification benefit unchanged. The engine needs about a year of prices, so these appear only when every stock has that history.</p></div>';
      } catch (e) { fail(); }
    }).catch(function () { if (token === wiRiskToken) box.innerHTML = '<p class="pt-note">' + RISK_NOTE + "</p>"; });
  }

  /* ---------- Tax-Loss Harvesting Helper ---------- */
  function verifiedTaxNote() {
    return "Default rates last verified 16 Nov 2026: STCG 20% and LTCG 12.5% above a ₹1,25,000 yearly exemption — Finance (No. 2) Act, 2024 (Sections 111A / 112A), unchanged by Budget 2025 and Budget 2026.";
  }
  function syncTaxInputs(p) {
    var cfg = taxConfig();
    p.querySelectorAll("[data-pt-rate]").forEach(function (inp) { inp.value = cfg[inp.dataset.ptRate]; });
    var note = p.querySelector("#ptTaxVerified");
    if (note) note.textContent = verifiedTaxNote() + (ptSettings().tax ? " You have customised rates saved — they are used below." : "");
  }
  function computeHarvest(p) {
    var rows = portRows();
    if (!rows.length) return setResults(p, '<p class="empty-note">No holdings yet — once you own stocks, any position sitting at a loss will be listed here, lot by lot.</p>');
    var cfg = taxConfig();
    var res = M.harvestLots(rows, todayStrSafe());
    var split = portSplit() || { stcgFY: 0, ltcgFY: 0 };
    var ben = M.harvestBenefit(res.stLoss, res.ltLoss, split.stcgFY || 0, split.ltcgFY || 0, cfg);
    if (!res.lots.length) {
      return setResults(p, '<p class="empty-note">No position is sitting at an unrealised loss at the latest prices — there is nothing to harvest right now.</p>' +
        (res.unpriced.length ? '<p class="pt-note">No live price for ' + res.unpriced.map(escT).join(", ") + " — those holdings could not be checked.</p>" : ""));
    }
    var body = res.lots.map(function (l) {
      return "<tr><td><b>" + escT(l.sym) + '</b></td><td>' + fmtD(l.date) + '</td><td>' + l.days + 'd <span class="pt-term ' + (l.term === "Long" ? "lt" : "st") + '">' + (l.term === "Long" ? "LT" : "ST") + '</span></td><td>' +
        amt(String(l.qty)) + "</td><td>" + amt(fmtInr2(l.avg)) + "</td><td>" + fmtInr2(l.ltp) + '</td><td><b class="neg">' + amt(fmtInr(l.loss)) + "</b></td></tr>";
    }).join("");
    var html = statsHtml([
      ["Short-term losses", amt(fmtInr(res.stLoss)), "held 12 months or less"],
      ["Long-term losses", amt(fmtInr(res.ltLoss)), "held over 12 months"],
      ["Est. tax saved — short-term", amt(fmtInr(ben.stBenefit)), "at " + cfg.stcg + "% on " + amt(fmtInr(ben.stUsed)) + " of losses"],
      ["Est. tax saved — long-term", amt(fmtInr(ben.ltBenefit)), "at " + cfg.ltcg + "% on " + amt(fmtInr(ben.ltUsed)) + " of losses"]
    ]) +
      '<p class="pt-note">Booked so far this financial year (from your Tax section): short-term gains ' + amt(fmtInr(Math.max(0, split.stcgFY || 0))) +
      " · long-term gains " + amt(fmtInr(Math.max(0, split.ltcgFY || 0))) +
      " · LTCG exemption still unused: " + amt(fmtInr(ben.remainingExemption)) +
      ". The saving above counts only losses that offset those booked gains — long-term losses are counted only against booked long-term gains above the exemption, because gains inside the exemption are tax-free anyway. Losses can also offset gains you book later this year, and an unused loss can be carried forward for up to 8 years if you file your return on time.</p>" +
      '<div class="ds-table-wrap pt-table-wrap"><table class="pt-table"><thead><tr><th>Stock</th><th>Bought</th><th>Held</th><th>Qty</th><th>Avg ₹</th><th>LTP ₹</th><th>Loss</th></tr></thead><tbody>' + body + "</tbody></table></div>" +
      (res.unpriced.length ? '<p class="pt-note">No live price for ' + res.unpriced.map(escT).join(", ") + " — those holdings could not be checked and are not in the list.</p>" : "") +
      '<p class="pt-advice">Estimate only — not tax advice. India has no wash-sale rule, but re-buying has costs and market risk; check with your CA for large amounts. Harvesting only counts if the sale happens before 31 March, and losses are worked out first-in-first-out from your buy lots, the same matching as your Tax section.</p>';
    setResults(p, html);
  }

  /* ================= sheet ================= */
  var sheetEl = null;
  function panelById(id) { for (var i = 0; i < PANELS.length; i++) if (PANELS[i].id === id) return PANELS[i]; return null; }
  function buildSheet() {
    var m = document.createElement("div");
    m.id = "ptoolsSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Portfolio Tools");
    var groups = [], seen = {};
    PANELS.forEach(function (d) { if (!seen[d.group]) { seen[d.group] = 1; groups.push(d.group); } });
    var indexHtml = '<p class="pt-info">Deeper planners that work on your own portfolio, on this device. Nothing here places a trade or changes a holding.</p>' +
      groups.map(function (g) {
        return '<div class="pt-group">' + g + "</div>" + PANELS.filter(function (d) { return d.group === g; }).map(function (d) {
          return '<button type="button" class="pt-idx-row" data-pt-go="' + d.id + '"><span class="pt-idx-main"><span class="pt-idx-title">' + d.title + '</span><span class="pt-idx-sub">' + d.info + '</span></span><span class="pt-idx-chev" aria-hidden="true">›</span></button>';
        }).join("");
      }).join("") +
      '<div class="pt-group">Already in Folio</div>' +
      '<button type="button" class="pt-idx-row" data-pt-goal="1"><span class="pt-idx-main"><span class="pt-idx-title">Goal Tracker</span><span class="pt-idx-sub">Portfolio goals live in Insights → Goal Tracker — tap to jump there.</span></span><span class="pt-idx-chev" aria-hidden="true">›</span></button>';
    m.innerHTML = '<div class="modal-card pt-card">' +
      '<div class="pt-head"><button type="button" class="icon-btn pt-back hidden" id="ptBack" aria-label="Back to all portfolio tools"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>' +
      '<h3 id="ptTitle">Portfolio Tools</h3><button type="button" class="icon-btn" id="ptClose" aria-label="Close">✕</button></div>' +
      '<div class="pt-body"><div id="ptIndex">' + indexHtml + "</div>" +
      PANELS.map(function (d) { return panelShell(d, d.html()); }).join("") +
      "</div></div>";
    document.body.appendChild(m);
    PANELS.forEach(function (d) { if (d.mount) { try { d.mount(m.querySelector('[data-panel="' + d.id + '"]')); } catch (e) {} } });
    wire(m);
    return m;
  }
  function showIndex() {
    if (!sheetEl) return;
    sheetEl.querySelectorAll(".pt-panel").forEach(function (s) { s.classList.add("hidden"); });
    sheetEl.querySelector("#ptIndex").classList.remove("hidden");
    sheetEl.querySelector("#ptTitle").textContent = "Portfolio Tools";
    sheetEl.querySelector("#ptBack").classList.add("hidden");
    sheetEl.querySelector(".pt-body").scrollTop = 0;
  }
  function showPanel(id) {
    var def = panelById(id); if (!def || !sheetEl) return;
    sheetEl.querySelector("#ptIndex").classList.add("hidden");
    sheetEl.querySelectorAll(".pt-panel").forEach(function (s) { s.classList.toggle("hidden", s.dataset.panel !== id); });
    sheetEl.querySelector("#ptTitle").textContent = def.title;
    sheetEl.querySelector("#ptBack").classList.remove("hidden");
    var p = sheetEl.querySelector('[data-panel="' + id + '"]');
    sheetEl.querySelector(".pt-body").scrollTop = 0;
    /* Rebuild data-driven controls against the CURRENT portfolio. */
    try {
      if (id === "rebal") buildTargetRows(p);
      if (id === "whatif") { buildWiPick(p); syncWiPick(p); }
      if (id === "harvest") syncTaxInputs(p);
      def.compute(p);
    } catch (e) { setErr(p, "Something went wrong in this tool — check the numbers and try again."); }
  }
  function openPTools(opts) {
    if (!sheetEl) sheetEl = buildSheet();
    sheetEl.classList.remove("hidden");
    if (opts && opts.tool && panelById(opts.tool)) showPanel(opts.tool);
    else showIndex();
  }
  function goGoal() {
    if (sheetEl) sheetEl.classList.add("hidden");
    if (window.FolioRouter && window.FolioRouter.go) window.FolioRouter.go("#/insights");
    else if (typeof switchView === "function") switchView("insights");
    var tries = 0;
    var iv = setInterval(function () {
      var el = document.getElementById("plan-goal");
      if (el) { try { el.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} clearInterval(iv); }
      else if (++tries > 14) clearInterval(iv);
    }, 250);
  }
  function computeFrom(el) {
    var p = el.closest ? el.closest(".pt-panel") : null;
    if (!p) return;
    var def = panelById(p.dataset.panel);
    if (def) { try { def.compute(p); } catch (e) { setErr(p, "Something went wrong in this tool — check the numbers and try again."); } }
  }
  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#ptClose")) { m.classList.add("hidden"); return; }
      if (t.closest("#ptBack")) { showIndex(); return; }
      var go = t.closest("[data-pt-go]");
      if (go) { showPanel(go.dataset.ptGo); return; }
      if (t.closest("[data-pt-goal]")) { goGoal(); return; }
      var segBtn = t.closest(".ds-seg__btn");
      if (segBtn) {
        var seg = segBtn.closest("[data-pt-seg]");
        seg.querySelectorAll(".ds-seg__btn").forEach(function (b) { b.setAttribute("aria-pressed", b === segBtn ? "true" : "false"); });
        seg.dataset.value = segBtn.dataset.val;
        if (seg.dataset.ptSeg === "ptWiBasis") {
          var wp = seg.closest(".pt-panel");
          wp.querySelector(".pt-wi-qty").classList.toggle("hidden", segBtn.dataset.val !== "qty");
          wp.querySelector(".pt-wi-amt").classList.toggle("hidden", segBtn.dataset.val !== "amt");
        }
        computeFrom(segBtn);
        return;
      }
      var rb = t.closest("[data-pt-rb]");
      if (rb) {
        var rp = rb.closest(".pt-panel");
        var rows = portRows();
        var total = rows.reduce(function (a, r) { return a + (Number.isFinite(r.cur) ? r.cur : 0); }, 0);
        rp.querySelectorAll(".pt-tin").forEach(function (inp) {
          var sym = inp.dataset.ptSym;
          var v;
          if (rb.dataset.ptRb === "equal") v = rows.length ? Math.round(1000 / rows.length) / 10 : 0;
          else {
            var row = null;
            rows.forEach(function (r) { if (r.sym === sym) row = r; });
            v = row && total > 0 ? Math.round(row.cur / total * 1000) / 10 : 0;
          }
          inp.value = v;
          saveTarget(sym, v);
        });
        computeFrom(rb);
        return;
      }
      if (t.closest("[data-pt-rates]")) { m.querySelector(".pt-rates").classList.toggle("hidden"); return; }
      if (t.closest("[data-pt-rates-reset]")) {
        var pt = ptSettings(); delete pt.tax;
        try { persist(); } catch (err) {}
        var hp = m.querySelector('[data-panel="harvest"]');
        syncTaxInputs(hp); computeFrom(t);
        return;
      }
    });
    m.addEventListener("input", function (e) {
      /* Rate fields persist on 'change' only — never mid-keystroke,
         and the stored rates drive the maths until then (6A lesson). */
      if (e.target.classList && e.target.classList.contains("ds-input") && e.target.dataset && e.target.dataset.ptRate) return;
      computeFrom(e.target);
    });
    m.addEventListener("change", function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains("pt-tin")) {
        var v = num(t.value);
        v = v == null ? 0 : Math.min(100, Math.max(0, v));
        saveTarget(t.dataset.ptSym, v);
        computeFrom(t);
        return;
      }
      if (t.dataset && t.dataset.ptRate) {
        var hp = t.closest(".pt-panel");
        var cfg = taxConfig();
        hp.querySelectorAll("[data-pt-rate]").forEach(function (inp) {
          var rv = num(inp.value);
          if (rv != null && rv >= 0 && rv <= 100 && inp.dataset.ptRate !== "exempt") cfg[inp.dataset.ptRate] = rv;
          else if (rv != null && rv >= 0 && inp.dataset.ptRate === "exempt") cfg.exempt = rv;
        });
        saveTax(cfg);
        syncTaxInputs(hp);
        computeFrom(t);
        return;
      }
      if (t.id === "ptWiPick") { syncWiPick(t.closest(".pt-panel")); computeFrom(t); return; }
      if (t.id === "ptWiSym") { syncWiPick(t.closest(".pt-panel")); computeFrom(t); return; }
    });
  }

  window.FolioPTools = { open: openPTools };
})();

