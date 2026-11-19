/* ================= FOLIO — Portfolio Report (PDF) =================
   Lazily loaded only when the Report button is tapped (see the
   window.openReportSheet loader in features.js). Builds a deep A4 PDF
   with jsPDF (assets/jspdf.umd.min.js, also lazy) and a subset Noto Sans
   (js/report-font.js) so the rupee symbol renders correctly.

   Every number comes from the app's own functions — enriched(),
   computeHoldings(), priceOf(), portfolioXirr(), fetchHistory(),
   insxBuildSeries(), folioFifo(), planStore()/planHoldVals() — and the
   period/risk maths mirror renderInsPeriod() and insxRenderRisk()
   line for line. Nothing here invents a figure: sections whose data is
   missing or too short print "Not enough data" or are skipped.

   v110: the "Advanced analytics" sections read the SAME computed
   payload the Insights tab shows, via window.folioAnalyticsForReport()
   (see docs/ANALYTICS.md for that engine's contract and formulas), so
   the PDF figures equal the on-screen figures. Section choices can be
   applied as presets (Quick / Standard / Full deep analysis / Custom)
   and the last choice is remembered in localStorage. Every page
   carries the Singh Caizen logo (top-right, rasterised from
   assets/sc-logo-dark.svg) and the words "Singh Caizen" are typeset in
   bold wherever they appear (cover, running head, footer).           */
(function () {
  "use strict";

  var SECTIONS = [
    ["summary", "Executive summary"],
    ["holdings", "Holdings table"],
    ["allocation", "Allocation & concentration"],
    ["performance", "Performance vs NIFTY 50"],
    ["contributors", "Contributors & draggers"],
    ["risk", "Risk"],
    ["health", "Portfolio health"],
    ["incomeTax", "Realised P&L, dividends & tax"],
    ["goals", "Rebalancing & goals"],
    ["review", "Things to review"],
    ["anaGrades", "Report card (grades)"],
    ["anaReturns", "Returns — advanced"],
    ["anaRisk", "Risk — advanced"],
    ["anaAlloc", "Allocation & risk contribution"],
    ["anaStocks", "Stock deep-dive"],
    ["anaIncome", "Income — dividends"],
    ["anaTrades", "Trades — statistics"],
    ["anaScen", "Scenarios"],
    ["methodology", "Methodology & formulas (appendix)"]
  ];
  var WEBSITE = "https://singhcaizen.github.io/SinghCaizen/";
  var INK = [26, 26, 26], MUTED = [107, 107, 107], FAINT = [150, 150, 150];
  var GOLD = [184, 145, 42], LINE = [216, 208, 188];
  var GAIN = [30, 125, 50], LOSS = [198, 40, 40];
  var NAVY = [15, 34, 52];

  var tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var sc = document.createElement("script");
      sc.src = src; sc.async = true;
      sc.onload = function () { res(); };
      sc.onerror = function () { rej(new Error("failed to load " + src)); };
      document.head.appendChild(sc);
    });
  }
  function dateLabel(ds) { /* "YYYY-MM-DD" -> "14 Nov 2026" (local, presentation only) */
    if (!ds) return "—";
    var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var p = String(ds).split("-");
    if (p.length !== 3) return String(ds);
    return Number(p[2]) + " " + (M[Number(p[1]) - 1] || "") + " " + p[0];
  }
  function truncToWidth(doc, s, maxW) {
    s = String(s == null ? "" : s);
    if (doc.getTextWidth(s) <= maxW) return s;
    while (s.length > 1 && doc.getTextWidth(s + "…") > maxW) s = s.slice(0, -1);
    return s + "…";
  }

  /* ================= options sheet =================
     Section presets: Quick = summary + holdings; Standard = the ten
     sections this sheet originally shipped with (all on by default)
     plus the Report card; Full deep analysis = every section. Any
     manual section toggle switches the preset to Custom. The last
     choice (preset + sections + hide-amounts) is remembered in
     localStorage under "folio_report_sel"; with nothing stored, the
     sheet falls back to the original defaults (the ten original
     sections on, amounts shown). */
  var REP_SEL_KEY = "folio_report_sel";
  var LEGACY_DEFAULT_SECS = ["summary", "holdings", "allocation", "performance", "contributors", "risk", "health", "incomeTax", "goals", "review"];
  var PRESETS = {
    quick: ["summary", "holdings"],
    standard: LEGACY_DEFAULT_SECS.concat(["anaGrades"]),
    full: SECTIONS.map(function (s) { return s[0]; })
  };
  var PRESET_LABELS = [["quick", "Quick"], ["standard", "Standard"], ["full", "Full deep analysis"], ["custom", "Custom"]];
  var repPreset = "custom";
  function repLoadSel() {
    try {
      var raw = localStorage.getItem(REP_SEL_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object" || !o.sections || typeof o.sections !== "object") return null;
      return o;
    } catch (e) { return null; }
  }
  function repSaveSel() {
    if (!sheetEl) return;
    try {
      var secs = {};
      sheetEl.querySelectorAll(".rep-sec").forEach(function (c) { secs[c.dataset.sec] = !!c.checked; });
      var hide = sheetEl.querySelector("#repHideAmt");
      localStorage.setItem(REP_SEL_KEY, JSON.stringify({ preset: repPreset, sections: secs, hideAmounts: !!hide && !!hide.checked }));
    } catch (e) { /* storage unavailable — the sheet still works */ }
  }
  function repSyncPresetButtons() {
    if (!sheetEl) return;
    sheetEl.querySelectorAll(".rep-preset").forEach(function (b) {
      var on = b.dataset.preset === repPreset;
      b.style.background = on ? "#b8912a" : "transparent";
      b.style.color = on ? "#ffffff" : "inherit";
      b.style.borderColor = on ? "#b8912a" : "#c9c2ae";
    });
  }
  function repApplySections(idList) {
    if (!sheetEl) return;
    sheetEl.querySelectorAll(".rep-sec").forEach(function (c) { c.checked = idList.indexOf(c.dataset.sec) >= 0; });
  }
  function repInitSheetState() {
    if (!sheetEl) return;
    var saved = repLoadSel();
    var hide = sheetEl.querySelector("#repHideAmt");
    if (saved) {
      sheetEl.querySelectorAll(".rep-sec").forEach(function (c) { c.checked = !!saved.sections[c.dataset.sec]; });
      if (hide) hide.checked = !!saved.hideAmounts;
      repPreset = ["quick", "standard", "full", "custom"].indexOf(saved.preset) >= 0 ? saved.preset : "custom";
    } else {
      repApplySections(LEGACY_DEFAULT_SECS);
      if (hide) hide.checked = false;
      repPreset = "custom";
    }
    repSyncPresetButtons();
  }

  var sheetEl = null, busy = false;
  function buildSheet() {
    var m = document.createElement("div");
    m.id = "reportSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Portfolio report");
    m.innerHTML =
      '<div class="modal-card">' +
      '<div class="modal-head"><h3>Portfolio Report</h3><button type="button" class="icon-btn" data-rep-close="1" aria-label="Close">✕</button></div>' +
      '<label class="fsh-toggle" style="display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer">' +
      '<input type="checkbox" id="repHideAmt" style="width:20px;height:20px;flex:0 0 auto"> Hide amounts (percentages only)</label>' +
      '<p class="auth-note" style="margin:.6rem 0 .2rem"><b>Preset</b></p>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      PRESET_LABELS.map(function (p) {
        return '<button type="button" class="rep-preset" data-preset="' + p[0] + '" style="padding:6px 12px;border:1px solid #c9c2ae;border-radius:999px;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px">' + p[1] + "</button>";
      }).join("") + "</div>" +
      '<p class="auth-note" style="margin:.6rem 0 .2rem"><b>Customize sections</b></p>' +
      SECTIONS.map(function (s) {
        return '<label style="display:flex;align-items:center;gap:10px;padding:5px 0;cursor:pointer">' +
          '<input type="checkbox" class="rep-sec" data-sec="' + s[0] + '" style="width:19px;height:19px;flex:0 0 auto"> ' + s[1] + "</label>";
      }).join("") +
      '<p class="auth-note">The methodology &amp; disclaimer page is always included.</p>' +
      '<p class="auth-note" id="repProgress" style="min-height:1.2em"></p>' +
      '<button type="button" class="btn btn-gold btn-block" id="repDownload">Download PDF</button>' +
      "</div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (busy) return;
      if (e.target === m || e.target.closest("[data-rep-close]")) m.classList.add("hidden");
    });
    m.querySelectorAll(".rep-preset").forEach(function (b) {
      b.addEventListener("click", function () {
        if (busy) return;
        var name = b.dataset.preset;
        if (PRESETS[name]) repApplySections(PRESETS[name]);
        repPreset = name;
        repSyncPresetButtons();
        repSaveSel();
      });
    });
    m.addEventListener("change", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("rep-sec")) {
        repPreset = "custom";
        repSyncPresetButtons();
        repSaveSel();
      } else if (e.target && e.target.id === "repHideAmt") {
        repSaveSel();
      }
    });
    m.querySelector("#repDownload").addEventListener("click", onDownload);
    return m;
  }
  function setProgress(txt, isBusy) {
    busy = !!isBusy;
    var p = sheetEl && sheetEl.querySelector("#repProgress");
    var b = sheetEl && sheetEl.querySelector("#repDownload");
    if (p) p.textContent = txt || "";
    if (b) { b.disabled = !!isBusy; b.textContent = isBusy ? "Preparing your report..." : "Download PDF"; }
  }
  function open() {
    if (!sheetEl) sheetEl = buildSheet();
    repInitSheetState();
    setProgress("", false);
    sheetEl.classList.remove("hidden");
  }

  async function onDownload() {
    if (busy) return;
    var hideAmt = !!sheetEl.querySelector("#repHideAmt").checked;
    var secs = {};
    sheetEl.querySelectorAll(".rep-sec").forEach(function (c) { secs[c.dataset.sec] = !!c.checked; });
    repSaveSel();
    setProgress("Preparing your report...", true);
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) await loadScript("assets/jspdf.umd.min.js");
      if (!window.__FOLIO_FONT_B64) await loadScript("js/report-font.js");
      if (!window.jspdf || !window.jspdf.jsPDF || !window.__FOLIO_FONT_B64) throw new Error("pdf stack unavailable");
    } catch (e) {
      setProgress("", false);
      sheetEl.classList.add("hidden");
      toast("PDF tools could not load — opening the print view instead.");
      if (typeof platReport === "function") platReport();
      return;
    }
    try {
      await buildAndSave({ hideAmt: hideAmt, secs: secs }, function (t) { setProgress(t, true); });
      setProgress("", false);
      sheetEl.classList.add("hidden");
      toast("Report downloaded.");
    } catch (e) {
      try { console.error("[Folio] report failed", e); } catch (x) {}
      setProgress("", false);
      toast("Report could not be built — " + (e && e.message ? e.message : "please try again."));
    }
  }

  /* ================= data gathering (app functions only) ================= */

  /* Mirror of renderInsPeriod()'s maths for one window, without the DOM.
     Returns { totPct, niftyRet, alpha, rowPct: {sym: pct|null}, anyHist } */
  async function periodStats(tf, d, histMap, niftyHist) {
    var rows = d.rows;
    function niftyFor(daysBack) {
      if (!niftyHist || !niftyHist.points || !niftyHist.points.length) return null;
      var pts = niftyHist.points;
      if (daysBack === 1) {
        var a = pts[pts.length - 2], b = pts[pts.length - 1];
        return a && b ? (b.c - a.c) / a.c * 100 : null;
      }
      var since = Date.now() - daysBack * 86400000, sp = null;
      for (var i = 0; i < pts.length; i++) { if (pts[i].t <= since) sp = pts[i].c; else break; }
      if (sp === null) sp = pts[0].c;
      return sp ? (pts[pts.length - 1].c - sp) / sp * 100 : null;
    }
    var changes, niftyRet = null, rowPct = {}, anyHist = false;
    if (tf === "1D") {
      changes = rows.map(function (r) {
        var p = (r.prevClose && r.ltp !== null) ? (r.ltp - r.prevClose) / r.prevClose * 100 : 0;
        rowPct[r.sym] = p;
        return { change: r.day || 0, startVal: Math.max(1, r.cur - (r.day || 0)) };
      });
      niftyRet = niftyFor(1);
    } else if (tf === "ALL") {
      changes = rows.map(function (r) {
        rowPct[r.sym] = r.pnlPct;
        return { change: r.pnl, startVal: r.invested };
      });
      niftyRet = niftyFor(365);
    } else {
      var days = INS_DAYS[tf], since = Date.now() - days * 86400000;
      changes = rows.map(function (r) {
        var h = histMap[r.sym];
        if (!h || !h.points.length || r.ltp === null) { rowPct[r.sym] = null; return { change: 0, startVal: Math.max(1, r.cur), noData: true }; }
        anyHist = true;
        var sp = null;
        for (var i = 0; i < h.points.length; i++) { if (h.points[i].t <= since) sp = h.points[i].c; else break; }
        if (sp === null) sp = h.points[0].c;
        rowPct[r.sym] = sp ? (r.ltp - sp) / sp * 100 : 0;
        return { change: r.qty * (r.ltp - sp), startVal: Math.max(1, r.qty * sp) };
      });
      niftyRet = niftyFor(days);
    }
    var totChange = changes.reduce(function (a, c) { return a + c.change; }, 0);
    var totStart = changes.reduce(function (a, c) { return a + c.startVal; }, 0);
    var totPct = totStart ? totChange / totStart * 100 : 0;
    return { totPct: totPct, niftyRet: niftyRet, alpha: niftyRet !== null ? totPct - niftyRet : null, rowPct: rowPct, anyHist: anyHist };
  }

  async function gather(opts, progress) {
    var d = enriched();
    if (!d.rows.length) throw new Error("add stocks first — the report needs at least one holding.");
    /* self-check: every total used below comes from this one enriched()
       call; assert the per-row sums agree with it exactly. */
    var sInv = d.rows.reduce(function (a, r) { return a + r.invested; }, 0);
    var sVal = d.rows.reduce(function (a, r) { return a + r.cur; }, 0);
    if (Math.abs(sInv - d.invested) > 0.5 || Math.abs(sVal - d.value) > 0.5 || Math.abs((sVal - sInv) - d.totalPnl) > 0.5) {
      throw new Error("report totals did not match the dashboard, so the report was cancelled.");
    }
    var needSeries = opts.secs.performance || opts.secs.risk;
    var series = null;
    if (needSeries) {
      progress("Reading price history...");
      try { series = await insxBuildSeries(); } catch (e) { series = null; }
      await tick();
    }
    var histMap = {}, niftyHist = null;
    if (opts.secs.performance || opts.secs.risk || opts.secs.review) {
      progress("Reading price history...");
      var jobs = d.rows.map(function (r) {
        return fetchHistory(r.sym, "1y").then(function (h) { histMap[r.sym] = h; }).catch(function () { histMap[r.sym] = null; });
      });
      jobs.push(fetchHistory("^NSEI", "1y").then(function (h) { niftyHist = h; }).catch(function () { niftyHist = null; }));
      await Promise.all(jobs);
      await tick();
    }
    var periods = null;
    if (opts.secs.performance || opts.secs.review) {
      progress("Working out period returns...");
      periods = {};
      var tfs = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"];
      for (var i = 0; i < tfs.length; i++) { periods[tfs[i]] = await periodStats(tfs[i], d, histMap, niftyHist); await tick(); }
    }
    /* Advanced analytics: the same computed payload the Insights tab
       shows (folioAnalyticsForReport computes it on demand when the
       tab was never opened). Any failure leaves ana null and the
       analytics sections print an honest "not available" line. */
    var ana = null;
    var wantAna = ["anaGrades", "anaReturns", "anaRisk", "anaAlloc", "anaStocks", "anaIncome", "anaTrades", "anaScen", "methodology"].some(function (k) { return opts.secs[k]; });
    if (wantAna) {
      progress("Working out advanced analytics...");
      try {
        if (typeof window !== "undefined" && typeof window.folioAnalyticsForReport === "function") ana = await window.folioAnalyticsForReport();
      } catch (e) { ana = null; }
      /* self-check: surface a broken payload in the console (the same
         diagnostics path as the report failure log below) — the
         download itself is never blocked on it. */
      try {
        var ccx = ana && ana.result ? ana.result.crossChecks : null;
        if (ccx) {
          if (ccx.weightsSum != null && Math.abs(ccx.weightsSum - 1) > 0.02) console.warn("[Folio] report self-check: analytics weights sum is " + ccx.weightsSum + " (expected about 1).");
          if (ccx.riskContribSum != null && Math.abs(ccx.riskContribSum - 100) > 0.6) console.warn("[Folio] report self-check: risk contributions sum is " + ccx.riskContribSum + " (expected 100).");
          if (ccx.twrVsGiven && ccx.twrVsGiven.ok === false) console.warn("[Folio] report self-check: the analytics return chain does not match the value/flow series.");
        }
      } catch (e) { /* self-check is advisory only */ }
      await tick();
    }
    /* Estimated next-12-months dividends, the Dividend Snowball way:
       each stock's payouts of the last 12 months × the shares held.
       fetchCorpActions is the app's own 24-hour-cached feed; any
       failure leaves the estimate null and the section prints "—". */
    var divEst = null;
    if (opts.secs.anaIncome) {
      try {
        if (typeof fetchCorpActions === "function" && typeof computeHoldings === "function") {
          progress("Reading dividend history...");
          var ch = computeHoldings();
          var holdRows = (ch && ch.holdings) || [];
          var sinceMs = Date.now() - 365 * 86400000, estSum = 0, estAny = false;
          var divJobs = holdRows.map(function (h3) {
            return fetchCorpActions(h3.sym).then(function (ca) {
              if (ca && ca.divs) {
                var dps = 0;
                ca.divs.forEach(function (x) { if (x.ts >= sinceMs) dps += Number(x.amount) || 0; });
                if (dps > 0) { estSum += dps * (Number(h3.qty) || 0); estAny = true; }
              }
            }).catch(function () {});
          });
          await Promise.all(divJobs);
          divEst = estAny ? estSum : null;
        }
      } catch (e) { divEst = null; }
      await tick();
    }
    return { d: d, series: series, histMap: histMap, niftyHist: niftyHist, periods: periods, ana: ana, divEst: divEst };
  }

  /* ================= PDF builder ================= */
  async function buildAndSave(opts, progress) {
    var data = await gather(opts, progress);
    var d = data.d;
    var hideAmt = opts.hideAmt, secs = opts.secs;
    var M = hideAmt ? function () { return "•••"; } : function (v) { return inr(v); };
    var M2 = hideAmt ? function () { return "•••"; } : function (v) { return inr2(v); };
    var P = function (v) { return pct(v); };

    progress("Building your report...");
    var JsPDF = window.jspdf.jsPDF;
    var doc = new JsPDF({ unit: "mm", format: "a4", compress: true });
    doc.addFileToVFS("FolioSans-Regular.ttf", window.__FOLIO_FONT_B64);
    doc.addFont("FolioSans-Regular.ttf", "FolioSans", "normal");
    if (window.__FOLIO_FONT_B64_BOLD) {
      doc.addFileToVFS("FolioSans-Bold.ttf", window.__FOLIO_FONT_B64_BOLD);
      doc.addFont("FolioSans-Bold.ttf", "FolioSans", "bold");
    }
    var PW = 210, PH = 297, ML = 14, MR = 14, CW = PW - ML - MR, BOT = PH - 16;
    var y = 0;
    var curF = { style: "normal", size: 9.5, color: INK };
    function setF(style, size, color) {
      curF.style = style; curF.size = size; curF.color = color;
      doc.setFont("FolioSans", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    }
    /* "Singh Caizen" is always typeset in bold, the surrounding text in
       the caller's base style. The string is drawn as measured segments
       (regular / bold / regular) at the current size and colour, and the
       font state found on entry is restored before returning, so plain
       doc.text calls around it are unaffected. Single-line draws only.
       Without the bold font (not registered), falls back to plain text. */
    var BOLD_OK = !!window.__FOLIO_FONT_B64_BOLD;
    function brandText(text, x, yy, opts, baseStyle) {
      text = String(text === null || text === undefined ? "" : text);
      if (!BOLD_OK || text.indexOf("Singh Caizen") < 0) { doc.text(text, x, yy, opts); return; }
      var entry = { style: curF.style, size: curF.size, color: curF.color };
      var base = baseStyle || entry.style, size = entry.size, color = entry.color;
      var segs = [], rest = text, idx;
      while ((idx = rest.indexOf("Singh Caizen")) >= 0) {
        if (idx > 0) segs.push({ t: rest.slice(0, idx), b: false });
        segs.push({ t: "Singh Caizen", b: true });
        rest = rest.slice(idx + "Singh Caizen".length);
      }
      if (rest) segs.push({ t: rest, b: false });
      var widths = segs.map(function (sg) { setF(sg.b ? "bold" : base, size, color); return doc.getTextWidth(sg.t); });
      var totalW = widths.reduce(function (a, w) { return a + w; }, 0);
      var sx = x, align = opts && opts.align;
      if (align === "right") sx = x - totalW; else if (align === "center") sx = x - totalW / 2;
      segs.forEach(function (sg, i) { setF(sg.b ? "bold" : base, size, color); doc.text(sg.t, sx, yy); sx += widths[i]; });
      setF(entry.style, entry.size, entry.color);
    }
    /* Percent formatting that mirrors the Insights tab (insxPct): the
       argument is already in percent units; sign shown, one decimal. */
    function pct1(v) { return (v === null || v === undefined || !isFinite(v)) ? "—" : (v > 0 ? "+" : "") + Number(v).toFixed(1) + "%"; }
    function f2(v) { return (v === null || v === undefined || !isFinite(v)) ? "—" : Number(v).toFixed(2); }
    function newPage(first) {
      if (!first) doc.addPage();
      y = 14;
      if (!first) {
        setF("normal", 7.5, FAINT);
        brandText("FOLIO by Singh Caizen — Portfolio Report", ML, 9);
        y = 15;
      }
    }
    function ensure(h) { if (y + h > BOT) { newPage(false); } }
    function rule(color, w) {
      doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(w || 0.3);
      doc.line(ML, y, ML + CW, y); y += 3;
    }
    function heading(text, sub) {
      ensure(22);
      y += 3;
      setF("bold", 13, INK);
      doc.text(text, ML, y); y += 2.2;
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.7);
      doc.line(ML, y, ML + 22, y); y += 5.5;
      if (sub) { setF("normal", 8.5, MUTED); doc.text(sub, ML, y); y += 5; }
    }
    function para(text, size, color, gap) {
      setF("normal", size || 9.5, color || INK);
      var lines = doc.splitTextToSize(text, CW);
      for (var i = 0; i < lines.length; i++) { ensure(4.6); doc.text(lines[i], ML, y); y += 4.6; }
      y += gap == null ? 2.5 : gap;
    }
    function note(text) { para(text, 8, MUTED, 3); }
    function kv(label, value, color) {
      setF("bold", 9.5, color || INK);
      if (doc.getTextWidth(String(value)) > CW * 0.58) {
        /* long value (e.g. a list of symbols): label on its own line,
           value wrapped underneath — never collides with the label */
        ensure(11);
        setF("normal", 9.5, MUTED); doc.text(label, ML, y); y += 5.2;
        setF("bold", 9.5, color || INK);
        var lines = doc.splitTextToSize(String(value), CW);
        lines.forEach(function (ln) { ensure(5); doc.text(ln, ML, y); y += 5; });
        y += 1;
        return;
      }
      ensure(6);
      setF("normal", 9.5, MUTED); doc.text(label, ML, y);
      setF("bold", 9.5, color || INK);
      doc.text(value, ML + CW, y, { align: "right" });
      y += 6;
    }
    /* generic table: cols = [{h, w, align, val(row)->string, color(row)->rgb|null}] */
    function table(cols, rows, rowH) {
      rowH = rowH || 5.6;
      function drawHead() {
        ensure(8);
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.rect(ML, y - 3.6, CW, 5.8, "F");
        setF("bold", 7.8, [255, 255, 255]);
        var x = ML;
        cols.forEach(function (c) {
          var tx = c.align === "right" ? x + c.w - 1.2 : x + 1.2;
          doc.text(c.h, tx, y, { align: c.align === "right" ? "right" : "left" });
          x += c.w;
        });
        y += 5.4;
      }
      drawHead();
      doc.setFillColor(247, 243, 234);
      rows.forEach(function (r, ri) {
        if (y + rowH > BOT) { newPage(false); drawHead(); }
        if (ri % 2 === 0) { doc.setFillColor(247, 243, 234); doc.rect(ML, y - 3.4, CW, rowH, "F"); }
        var x = ML;
        cols.forEach(function (c) {
          var col = c.color ? c.color(r) : INK;
          setF(c.bold ? "bold" : "normal", 7.8, col || INK);
          var tx = c.align === "right" ? x + c.w - 1.2 : x + 1.2;
          doc.text(truncToWidth(doc, c.val(r), c.w - 2.2), tx, y, { align: c.align === "right" ? "right" : "left" });
          x += c.w;
        });
        y += rowH;
      });
      y += 3;
    }

    /* ---------- charts (offscreen canvas, 2x) ---------- */
    function chartCanvas(wMm, hMm) {
      /* canvas pixels = 4 per mm; drawing space = 2 units per mm, so the
         context is scaled 2x and the embedded image is 2x resolution. */
      var pxPerMm = 4;
      var cv = document.createElement("canvas");
      cv.width = Math.round(wMm * pxPerMm); cv.height = Math.round(hMm * pxPerMm);
      var g = cv.getContext("2d");
      g.scale(2, 2);
      return { cv: cv, g: g, w: wMm * 2, h: hMm * 2 };
    }
    function placeChart(cv, hMm) {
      ensure(hMm + 2);
      doc.addImage(cv.toDataURL("image/png"), "PNG", ML, y, CW, hMm);
      y += hMm + 3;
    }
    function hBarChart(items, hMm, labelFn) {
      /* items: [{label, value, pctLabel}] horizontal bars, value may be negative */
      var wMm = CW, c = chartCanvas(wMm, hMm), g = c.g;
      var W = c.w, H = c.h;
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); }).concat([1]));
      var labelW = 100, valW = 88, barX = labelW, barW = W - labelW - valW;
      var bh = Math.min(11, (H - 8) / items.length), gap = (H - 8 - bh * items.length) / Math.max(1, items.length - 1 || 1);
      g.font = "600 11px 'Public Sans', system-ui, sans-serif";
      items.forEach(function (it, i) {
        var yy = 4 + i * (bh + gap);
        g.fillStyle = "#1a1a1a"; g.textAlign = "right"; g.textBaseline = "middle";
        var lab = it.label; while (g.measureText(lab).width > labelW - 10 && lab.length > 1) lab = lab.slice(0, -1);
        g.fillText(lab, barX - 8, yy + bh / 2);
        g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(barX, yy, barW, bh);
        g.fillStyle = it.value >= 0 ? "#1e7d32" : "#c62828";
        g.fillRect(barX, yy, Math.max(2, Math.abs(it.value) / max * barW), bh);
        g.textAlign = "left"; g.fillStyle = it.value >= 0 ? "#1e7d32" : "#c62828";
        g.fillText(labelFn(it), barX + barW + 8, yy + bh / 2);
      });
      return c.cv;
    }
    function lineChart(V, INV, axis, hMm) {
      var c = chartCanvas(CW, hMm), g = c.g, W = c.w, H = c.h;
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      var all = V.concat(INV).filter(function (v) { return v != null && isFinite(v) && v > 0; });
      if (all.length < 2) return null;
      var min = Math.min.apply(null, all), max = Math.max.apply(null, all);
      if (max - min < 1) { max += 1; min -= 1; }
      var padL = 8, padR = 8, padT = 14, padB = 26;
      var X = function (i) { return padL + i / (V.length - 1) * (W - padL - padR); };
      var Y = function (v) { return padT + (1 - (v - min) / (max - min)) * (H - padT - padB); };
      g.strokeStyle = "rgba(0,0,0,0.10)"; g.lineWidth = 1;
      for (var k = 0; k <= 3; k++) { var yy = padT + k * (H - padT - padB) / 3; g.beginPath(); g.moveTo(padL, yy); g.lineTo(W - padR, yy); g.stroke(); }
      g.font = "500 11px 'Public Sans', system-ui, sans-serif"; g.fillStyle = "#6b6b6b";
      if (!hideAmt) {
        g.textAlign = "left"; g.fillText(inrShort(max), padL, 12);
        g.fillText(inrShort(min), padL, H - padB - 4);
      }
      function drawLine(data, color, dash) {
        g.strokeStyle = color; g.lineWidth = 2.4; g.setLineDash(dash || []);
        g.beginPath(); var started = false;
        data.forEach(function (v, i) { if (v == null || !isFinite(v)) return; var x = X(i), yv = Y(v); if (!started) { g.moveTo(x, yv); started = true; } else g.lineTo(x, yv); });
        g.stroke(); g.setLineDash([]);
      }
      drawLine(INV, "#9a9a9a", [7, 5]);
      drawLine(V, "#b8912a", null);
      g.fillStyle = "#9a9a9a"; g.fillRect(W - 178, 2, 16, 3.4);
      g.fillStyle = "#6b6b6b"; g.textAlign = "left"; g.fillText("Invested", W - 158, 8);
      g.fillStyle = "#b8912a"; g.fillRect(W - 92, 2, 16, 3.4);
      g.fillStyle = "#6b6b6b"; g.fillText("Value", W - 72, 8);
      g.fillStyle = "#6b6b6b";
      [0, Math.floor((axis.length - 1) / 2), axis.length - 1].forEach(function (i) {
        g.textAlign = i === 0 ? "left" : (i === axis.length - 1 ? "right" : "center");
        g.fillText(axis[i] || "", X(i), H - 6);
      });
      return c.cv;
    }

    /* ================= PAGE 1: cover + summary ================= */
    newPage(true);
    try {
      var iconBlob = await (await fetch("assets/icon-512.png")).blob();
      var iconUrl = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(iconBlob); });
      doc.addImage(iconUrl, "PNG", ML, y, 15, 15);
    } catch (e) { /* icon is decoration — branding text below carries it */ }
    setF("normal", 17, INK);
    brandText("FOLIO by Singh Caizen", ML + 19, y + 6.5, null, "normal");
    setF("normal", 10.5, MUTED);
    doc.text("Portfolio Analysis Report", ML + 19, y + 12.5);
    y += 19;
    rule(GOLD, 0.8);
    var now = new Date();
    var tsList = d.rows.map(function (r) { var p = priceOf(r.sym); return p && p.ts ? p.ts : 0; }).filter(Boolean);
    var priceNote = tsList.length ? "Prices as of " + new Date(Math.max.apply(null, tsList)).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ", " : "";
    para("Generated " + now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + ", " +
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ". " + priceNote +
      "Price basis: free delayed feed (about 15 minutes delay), the same prices the app shows." +
      (d.rows.some(function (r) { return r.manual; }) ? " Some prices were set manually in the app." : ""), 9, MUTED, 2);
    kv("Total portfolio value", M(d.value));
    await tick();

    var xirrV = d.rows.length ? portfolioXirr(d.value) : null;
    var wins = d.rows.filter(function (r) { return r.pnl > 0; });
    var losses = d.rows.filter(function (r) { return r.pnl < 0; });
    var winRate = d.rows.length ? Math.round(wins.length / d.rows.length * 100) : 0;
    var sortedByVal = [...d.rows].sort(function (a, b) { return b.cur - a.cur; });
    var wt = function (r) { return d.value ? r.cur / d.value * 100 : 0; };
    var topShare = function (n) { return sortedByVal.slice(0, n).reduce(function (a, r) { return a + wt(r); }, 0); };

    if (secs.summary) {
      heading("Executive Summary");
      kv("Invested", M(d.invested));
      kv("Current value", M(d.value));
      kv("Total profit / loss", M(d.totalPnl) + "  (" + P(d.invested ? d.totalPnl / d.invested * 100 : 0) + ")", d.totalPnl >= 0 ? GAIN : LOSS);
      kv("Today's profit / loss", M(d.dayPnl), d.dayPnl >= 0 ? GAIN : LOSS);
      kv("XIRR (per year)", xirrV === null ? "—" : P(xirrV * 100));
      kv("Booked (realised) profit", M(d.realisedTotal));
      if (d.divTotal) kv("Dividends recorded", M(d.divTotal));
      kv("Holdings", String(d.rows.length));
      kv("Win rate", winRate + "% (" + wins.length + " of " + d.rows.length + " in profit)");
      y += 2;
      var obs = [];
      obs.push("Largest holding is " + sortedByVal[0].sym + " at " + wt(sortedByVal[0]).toFixed(1) + "% of the portfolio.");
      obs.push(losses.length + " of " + d.rows.length + (d.rows.length === 1 ? " holding is" : " holdings are") + " currently in loss.");
      if (d.rows.length > 3) obs.push("The top 3 holdings make up " + topShare(3).toFixed(1) + "% of the portfolio.");
      if (d.rows.length > 1) {
        var bestR = d.rows.reduce(function (a, b) { return b.pnlPct > a.pnlPct ? b : a; });
        var worstR = d.rows.reduce(function (a, b) { return b.pnlPct < a.pnlPct ? b : a; });
        obs.push("Best performer is " + bestR.sym + " (" + P(bestR.pnlPct) + "); weakest is " + worstR.sym + " (" + P(worstR.pnlPct) + ").");
      }
      var secMap = {};
      d.rows.forEach(function (r) { var k = r.sector || "Other"; secMap[k] = (secMap[k] || 0) + r.cur; });
      var secTop = Object.entries(secMap).sort(function (a, b) { return b[1] - a[1]; })[0];
      if (secTop && Object.keys(secMap).length > 1) obs.push("Largest sector is " + secTop[0] + " at " + (d.value ? secTop[1] / d.value * 100 : 0).toFixed(1) + "% of the portfolio.");
      if (d.dayPnl !== 0) obs.push("Today the portfolio moved " + (hideAmt ? P(d.invested ? d.dayPnl / d.invested * 100 : 0) : M(d.dayPnl)) + ".");
      if (d.divTotal > 0) obs.push("Dividends recorded so far total " + M(d.divTotal) + ".");
      if (xirrV !== null) obs.push("The portfolio's XIRR is " + P(xirrV * 100) + " per year, on the app's cash-flow method.");
      obs.slice(0, 6).forEach(function (o) { para("•  " + o, 9.5, INK, 0.8); });
      y += 2;
    }
    await tick();

    /* ================= Holdings ================= */
    if (secs.holdings) {
      heading("Holdings", "Average buy prices include charges, exactly as the app works them out (FIFO lots).");
      var cols = [
        { h: "Symbol", w: 23, val: function (r) { return r.sym; }, bold: true },
        { h: "Qty", w: 10, align: "right", val: function (r) { return String(r.qty); } },
        { h: "Avg Buy", w: 19, align: "right", val: function (r) { return M2(r.avg); } },
        { h: "Price", w: 19, align: "right", val: function (r) { return r.ltp === null ? "—" : M2(r.ltp); } },
        { h: "Invested", w: 21, align: "right", val: function (r) { return M(r.invested); } },
        { h: "Value", w: 21, align: "right", val: function (r) { return M(r.cur); } },
        { h: "P&L", w: 23, align: "right", val: function (r) { return M(r.pnl); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } },
        { h: "P&L %", w: 14, align: "right", val: function (r) { return P(r.pnlPct); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } },
        { h: "Wt %", w: 11, align: "right", val: function (r) { return wt(r).toFixed(1); } },
        { h: "Day %", w: 13, align: "right", val: function (r) { return (r.prevClose && r.ltp !== null) ? P((r.ltp - r.prevClose) / r.prevClose * 100) : "—"; }, color: function (r) { return (r.prevClose && r.ltp !== null && (r.ltp - r.prevClose) >= 0) ? GAIN : LOSS; } }
      ];
      table(cols, sortedByVal, 5.6);
      await tick();
    }

    /* ================= Allocation ================= */
    if (secs.allocation) {
      heading("Allocation & Concentration");
      var top = sortedByVal.slice(0, 10).map(function (r) { return { label: r.sym, value: wt(r) }; });
      if (sortedByVal.length > 10) top.push({ label: "Others (" + (sortedByVal.length - 10) + ")", value: sortedByVal.slice(10).reduce(function (a, r) { return a + wt(r); }, 0) });
      placeChart(hBarChart(top, Math.max(24, top.length * 8.5), function (it) { return it.value.toFixed(1) + "%"; }), Math.max(24, top.length * 8.5));
      kv("Top 1 holding", topShare(1).toFixed(1) + "%");
      kv("Top 3 holdings", topShare(3).toFixed(1) + "%");
      kv("Top 5 holdings", topShare(5).toFixed(1) + "%");
      para(topShare(1) >= 40
        ? "Diversification note: one holding carries a large share of this portfolio (" + topShare(1).toFixed(1) + "%), so its moves will drive most of the portfolio's moves."
        : topShare(3) >= 70
          ? "Diversification note: the portfolio leans mainly on its top 3 holdings (" + topShare(3).toFixed(1) + "% combined)."
          : "Diversification note: no single holding dominates this portfolio; the largest is " + topShare(1).toFixed(1) + "%.", 9.5, INK, 2);
      var secRows = Object.entries(secMap).map(function (e) { return { name: e[0], v: e[1] }; }).sort(function (a, b) { return b.v - a.v; });
      if (secRows.length > 1 || (secRows.length === 1 && secRows[0].name !== "Other")) {
        setF("bold", 10.5, INK); ensure(7); doc.text("By sector", ML, y); y += 6;
        table([
          { h: "Sector", w: 100, val: function (r) { return r.name; } },
          { h: "Value", w: 41, align: "right", val: function (r) { return M(r.v); } },
          { h: "Weight %", w: 33, align: "right", val: function (r) { return (d.value ? r.v / d.value * 100 : 0).toFixed(1); } }
        ], secRows, 5.6);
      }
      await tick();
    }

    /* ================= Performance ================= */
    if (secs.performance) {
      heading("Performance vs NIFTY 50", "Same windows and method as the app's Insights page: your current quantities at daily closing prices.");
      var TFN = { "1D": "Today (1D)", "1W": "1 Week", "1M": "1 Month", "3M": "3 Months", "6M": "6 Months", "1Y": "1 Year", "ALL": "All Time" };
      var histRows = ["1W", "1M", "3M", "6M", "1Y"].some(function (tf) { return data.periods[tf] && data.periods[tf].anyHist; });
      if (!histRows && !data.niftyHist) {
        note("Not enough data — the free price history for your holdings could not be loaded, so period returns are not shown.");
      } else {
        table([
          { h: "Period", w: 44, val: function (r) { return r.label; }, bold: true },
          { h: "Portfolio", w: 42, align: "right", val: function (r) { return P(r.p.totPct); }, color: function (r) { return r.p.totPct >= 0 ? GAIN : LOSS; } },
          { h: "NIFTY 50", w: 42, align: "right", val: function (r) { return r.p.niftyRet === null ? "—" : P(r.p.niftyRet); }, color: function (r) { return r.p.niftyRet === null ? INK : (r.p.niftyRet >= 0 ? GAIN : LOSS); } },
          { h: "Alpha", w: 46, align: "right", val: function (r) { return r.p.alpha === null ? "—" : P(r.p.alpha); }, color: function (r) { return r.p.alpha === null ? INK : (r.p.alpha >= 0 ? GAIN : LOSS); } }
        ], ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"].map(function (tf) { return { label: TFN[tf], p: data.periods[tf] }; }), 5.6);
      }
      var s = data.series;
      if (s && s.V && s.V.length >= 30 && s.V.some(function (v) { return v > 0; })) {
        setF("bold", 10.5, INK); ensure(7); doc.text("Portfolio value vs invested (last 1 year, at the quantities held on each day)", ML, y); y += 5;
        var lc = lineChart(s.V, s.INV, s.axis, 52);
        if (lc) placeChart(lc, 52);
        if (s.excluded && s.excluded.length) note("Note: " + s.excluded.join(", ") + " left out of this chart — its price history could not be loaded (same note as the Insights page).");
      } else {
        note("Value history chart: not enough data yet (needs about a month of daily price history).");
      }
      await tick();
    }

    /* ================= Contributors & draggers ================= */
    if (secs.contributors) {
      heading("Contributors & Draggers", "By profit and loss on the holdings you own today.");
      var byRs = [...d.rows].sort(function (a, b) { return b.pnl - a.pnl; });
      var byPc = [...d.rows].sort(function (a, b) { return b.pnlPct - a.pnlPct; });
      var mk = function (list) { return list.map(function (r) { return { sym: r.sym, pnl: r.pnl, pnlPct: r.pnlPct }; }); };
      setF("bold", 10.5, INK); ensure(7); doc.text("Top gainers", ML, y); y += 5.5;
      table([
        { h: "Stock", w: 44, val: function (r) { return r.sym; }, bold: true },
        { h: "By amount", w: 62, align: "right", val: function (r) { return M(r.pnl); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } },
        { h: "By percent", w: 68, align: "right", val: function (r) { return P(r.pnlPct); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } }
      ], mk(byRs.filter(function (r) { return r.pnl > 0; }).slice(0, 5)), 5.6);
      setF("bold", 10.5, INK); ensure(7); doc.text("Top draggers", ML, y); y += 5.5;
      table([
        { h: "Stock", w: 44, val: function (r) { return r.sym; }, bold: true },
        { h: "By amount", w: 62, align: "right", val: function (r) { return M(r.pnl); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } },
        { h: "By percent", w: 68, align: "right", val: function (r) { return P(r.pnlPct); }, color: function (r) { return r.pnl >= 0 ? GAIN : LOSS; } }
      ], mk(byRs.filter(function (r) { return r.pnl < 0; }).slice(0, 5)), 5.6);
      para("Ranked by percent, the top of the list is " + (byPc[0] ? byPc[0].sym + " (" + P(byPc[0].pnlPct) + ")" : "—") +
        " and the bottom is " + (byPc.length ? byPc[byPc.length - 1].sym + " (" + P(byPc[byPc.length - 1].pnlPct) + ")" : "—") + ".", 9.5, INK, 2);
      var chartRows = byRs.slice(0, 8).concat(byRs.slice(-8)).filter(function (r, i, a) { return a.indexOf(r) === i; });
      var items = chartRows.map(function (r) { return { label: r.sym, value: hideAmt ? r.pnlPct : r.pnl }; });
      if (items.length) {
        setF("bold", 10.5, INK); ensure(7); doc.text("Profit / loss by stock", ML, y); y += 5;
        var hh = Math.max(24, items.length * 8.5);
        placeChart(hBarChart(items, hh, function (it) { return hideAmt ? P(it.value) : M(it.value); }), hh);
      }
      await tick();
    }

    /* ================= Risk ================= */
    if (secs.risk) {
      heading("Risk", "Worked out from the last year of daily prices, the same way as the app's Risk Metrics card.");
      var sr = data.series;
      if (!sr || !sr.rets || sr.rets.length < 20) {
        note("Not enough data — risk metrics need about a month of daily price history for the stocks you hold (the same rule the Insights page uses).");
      } else {
        var rets = sr.rets, brets = sr.brets;
        var mean = function (a) { return a.reduce(function (x, z) { return x + z; }, 0) / a.length; };
        var sd = function (a) { var m = mean(a); return Math.sqrt(a.reduce(function (x, z) { return x + Math.pow(z - m, 2); }, 0) / (a.length - 1)); };
        var vol = sd(rets) * Math.sqrt(252);
        var cov = rets.reduce(function (a, r, i) { return a + (r - mean(rets)) * (brets[i] - mean(brets)); }, 0) / (rets.length - 1);
        var beta = cov / Math.pow(sd(brets), 2);
        var eq = 1, peak = 1, mdd = 0;
        rets.forEach(function (r) { eq *= (1 + r); if (eq > peak) peak = eq; var dd = eq / peak - 1; if (dd < mdd) mdd = dd; });
        kv("Volatility (annualised)", (vol * 100).toFixed(1) + "%");
        kv("Maximum drawdown", (mdd * 100).toFixed(1) + "%", LOSS);
        kv("Beta vs NIFTY 50", isFinite(beta) ? beta.toFixed(2) : "—");
        kv("Concentration — top 3 holdings", topShare(3).toFixed(1) + "% of the portfolio");
        if (sr.excluded && sr.excluded.length) note("Note: " + sr.excluded.join(", ") + " left out of these figures — its price history could not be loaded.");
      }
      var near = [];
      d.rows.forEach(function (r) {
        var h = data.histMap[r.sym];
        if (!h || !h.meta || !h.meta.fiftyTwoWeekHigh || !h.meta.fiftyTwoWeekLow || r.ltp === null) return;
        var hi = h.meta.fiftyTwoWeekHigh, lo = h.meta.fiftyTwoWeekLow;
        var fromHi = (1 - r.ltp / hi) * 100, fromLo = (r.ltp / lo - 1) * 100;
        if (fromHi <= 5) near.push({ sym: r.sym, txt: "within " + fromHi.toFixed(1) + "% of its 52-week high (" + M2(hi) + ")" });
        else if (fromLo <= 5) near.push({ sym: r.sym, txt: "within " + fromLo.toFixed(1) + "% of its 52-week low (" + M2(lo) + ")" });
      });
      if (near.length) {
        setF("bold", 10.5, INK); ensure(7); doc.text("Near 52-week high / low", ML, y); y += 5.5;
        near.forEach(function (n) { para("•  " + n.sym + " — current price " + M2(d.rows.find(function (r) { return r.sym === n.sym; }).ltp) + ", " + n.txt + ".", 9.5, INK, 0.8); });
        y += 2;
      }
      await tick();
    }

    /* ================= Portfolio health ================= */
    if (secs.health) {
      heading("Portfolio Health");
      var gSum = wins.reduce(function (a, r) { return a + r.pnl; }, 0);
      var lSum = Math.abs(losses.reduce(function (a, r) { return a + r.pnl; }, 0));
      kv("Win rate", winRate + "% (" + wins.length + " of " + d.rows.length + " in profit)");
      kv("Profit factor", lSum > 0 ? (gSum / lSum).toFixed(2) : (gSum > 0 ? "No losses yet" : "—"));
      kv("Average gain (winning holdings)", wins.length ? M(gSum / wins.length) : "—");
      kv("Average loss (losing holdings)", losses.length ? M(-lSum / losses.length) : "—");
      kv("Holdings in loss", String(losses.length));
      var deep = d.rows.filter(function (r) { return r.pnlPct < -20; });
      kv("Holdings more than 20% below average buy", String(deep.length) + (deep.length ? " — " + deep.map(function (r) { return r.sym + " (" + P(r.pnlPct) + ")"; }).join(", ") : ""));
      await tick();
    }

    /* ================= Realised, dividends & tax ================= */
    if (secs.incomeTax) {
      heading("Realised P&L, Dividends & Tax", "Tax figures are estimates, worked out with the app's own Tax and Capital Gains workings.");
      var split = d.split || { stcg: 0, ltcg: 0, stcgFY: 0, ltcgFY: 0 };
      kv("Realised (booked) profit — all time", M(d.realisedTotal));
      kv("Dividends received — all time", M(d.divTotal));
      kv("Booked short-term gains — this financial year", M(split.stcgFY), split.stcgFY >= 0 ? GAIN : LOSS);
      kv("Booked long-term gains — this financial year", M(split.ltcgFY), split.ltcgFY >= 0 ? GAIN : LOSS);
      var bookedLtcg = Math.max(0, split.ltcgFY || 0);
      var exLeft = 125000 - Math.min(125000, bookedLtcg);
      kv("Tax-free LTCG room left this financial year", M(exLeft));
      var unrlStcgTax = Math.max(0, split.stcg || 0) * 0.20;
      var unrlLtcgTax = Math.max(0, (split.ltcg || 0) + bookedLtcg - 125000) * 0.125 * ((split.ltcg || 0) > 0 ? 1 : 0);
      kv("Estimated tax if all holdings were sold today", M(unrlStcgTax + unrlLtcgTax));
      try {
        var sales = folioFifo();
        var fys = [...new Set(sales.map(function (s2) { return fyOf(s2.sellDate); }))].sort().reverse();
        if (fys.length) {
          var fy = fys[0];
          var rowsFy = sales.filter(function (s2) { return fyOf(s2.sellDate) === fy; });
          var st = rowsFy.filter(function (r) { return r.term === "Short"; }).reduce(function (a, r) { return a + (r.gain || 0); }, 0);
          var lt = rowsFy.filter(function (r) { return r.term === "Long"; }).reduce(function (a, r) { return a + (r.gain || 0); }, 0);
          var cfg = (typeof folioProf === "function" && folioProf().taxCfg) || { stcg: 20, ltcg: 12.5, exempt: 125000 };
          var estTax = Math.max(0, st) * (cfg.stcg || 0) / 100 + Math.max(0, lt - (cfg.exempt || 0)) * (cfg.ltcg || 0) / 100;
          setF("bold", 10.5, INK); ensure(7); doc.text("Capital Gains Statement — " + fy + " (FIFO, as in the app)", ML, y); y += 5.5;
          kv("Sales recorded", String(rowsFy.length));
          kv("Short-term gains", M(st), st >= 0 ? GAIN : LOSS);
          kv("Long-term gains", M(lt), lt >= 0 ? GAIN : LOSS);
          kv("Estimated tax at your set rates (" + (cfg.stcg || 0) + "% / " + (cfg.ltcg || 0) + "%)", M(estTax));
        }
      } catch (e) { /* FIFO statement unavailable — the Tax-tab figures above still stand */ }
      note("Estimates only — not tax advice. Rates and the ₹1,25,000 long-term exemption are the ones the app uses; your real liability can differ (losses, surcharge and cess are not fully modelled).");
      await tick();
    }

    /* ================= Rebalancing & goals ================= */
    if (secs.goals) {
      var store = null, hv = null, goal = null;
      try { store = planStore(); hv = planHoldVals(); } catch (e) {}
      try { goal = (state.profile || {}).goal; } catch (e) {}
      var stockT = store ? Object.entries(store.stocks || {}).filter(function (e) { return Number(e[1]) > 0; }) : [];
      var secT = store ? Object.entries(store.sectors || {}).filter(function (e) { return Number(e[1]) > 0; }) : [];
      var hasGoal = goal && Number(goal.amount) > 0 && goal.date && hv && hv.total > 0;
      if ((stockT.length || secT.length) && hv && hv.total > 0 || hasGoal) {
        heading("Rebalancing & Goals");
        if (stockT.length || secT.length) {
          var mode = stockT.length ? "stocks" : "sectors";
          var items;
          if (mode === "stocks") items = hv.rows.map(function (r) { return { key: r.sym, cur: r.v / hv.total * 100, target: Number(store.stocks[r.sym]) || 0 }; });
          else { var mm = {}; hv.rows.forEach(function (r) { mm[r.sector] = (mm[r.sector] || 0) + r.v; }); items = Object.keys(mm).map(function (k) { return { key: k, cur: mm[k] / hv.total * 100, target: Number(store.sectors[k]) || 0 }; }); }
          setF("bold", 10.5, INK); ensure(7); doc.text("Current vs target allocation (by " + mode + ")", ML, y); y += 5.5;
          table([
            { h: mode === "stocks" ? "Stock" : "Sector", w: 62, val: function (r) { return r.key; }, bold: true },
            { h: "Current %", w: 36, align: "right", val: function (r) { return r.cur.toFixed(1); } },
            { h: "Target %", w: 36, align: "right", val: function (r) { return r.target ? r.target.toFixed(1) : "—"; } },
            { h: "Drift %", w: 40, align: "right", val: function (r) { return r.target ? (r.target - r.cur).toFixed(1) : "—"; }, color: function (r) { return Math.abs(r.target - r.cur) < 0.5 ? INK : GOLD; } }
          ], items, 5.6);
        }
        if (hasGoal) {
          var target = Number(goal.amount);
          var months = Math.max(1, Math.round((new Date(goal.date + "T00:00:00") - new Date()) / 2629800000));
          var years = months / 12;
          var pctDone = Math.min(100, hv.total / target * 100);
          var reqCagr = hv.total > 0 && target > hv.total ? (Math.pow(target / hv.total, 1 / years) - 1) * 100 : 0;
          setF("bold", 10.5, INK); ensure(7); doc.text("Goal tracker", ML, y); y += 5.5;
          kv("Current value", M(hv.total));
          kv("Goal", M(target) + " by " + dateLabel(goal.date));
          kv("Progress", pctDone.toFixed(1) + "%");
          kv("Required growth (CAGR)", target > hv.total ? reqCagr.toFixed(1) + "% per year" : "Reached");
        }
      }
      await tick();
    }

    /* ================= Things to review ================= */
    if (secs.review) {
      heading("Things to Review", "Simple rule-based flags from your own numbers. These are observations, not advice.");
      var flags = [];
      d.rows.forEach(function (r) {
        if (wt(r) > 25) flags.push(r.sym + " is " + wt(r).toFixed(1) + "% of the portfolio — above the 25% single-stock mark used for this check.");
        if (r.pnlPct < -30) flags.push(r.sym + " is down " + Math.abs(r.pnlPct).toFixed(1) + "% from your average buy price.");
        if (r.ltp === null) flags.push(r.sym + " has no current price in the app, so its value in this report uses your invested amount.");
      });
      var p1y = data.periods && data.periods["1Y"];
      if (p1y && p1y.niftyRet !== null) {
        d.rows.forEach(function (r) {
          var rp = p1y.rowPct[r.sym];
          if (rp !== null && rp !== undefined && rp < p1y.niftyRet) flags.push(r.sym + " returned " + P(rp) + " over the last year, against NIFTY 50's " + P(p1y.niftyRet) + " in the same window.");
        });
      }
      if (flags.length) flags.forEach(function (f) { para("•  " + f, 9.5, INK, 0.8); });
      else para("No flags from these checks today.", 9.5, INK, 1);
      y += 2;
      await tick();
    }

    /* ================= Advanced analytics (v110) =================
       Everything below reads data.ana — the same computed payload the
       Insights tab renders — so the figures match the screen exactly.
       anaIncome and anaTrades use their own native data paths (the
       dividend entries and folioFifo), exactly like the app does. */
    var anaP = data.ana || null;
    var anaR = anaP && anaP.result ? anaP.result : null;
    var anaBench = anaP && anaP.benchName ? anaP.benchName : "NIFTY 50";
    var ANA_MISSING = "Analysis not available — open the Insights tab once, or there is not enough price history yet.";
    var ANA_SHORT = "Needs at least 60 days of data — this section runs on at least 60 days of daily portfolio history.";
    function subHead(text) {
      setF("bold", 10.5, INK); ensure(7); doc.text(text, ML, y); y += 5.5;
    }
    /* daily-return histogram: plain vector bars (green up, red down) */
    function histChart(hist) {
      var bins = hist && hist.bins;
      if (!bins || !bins.length) return;
      var hMm = 38, plotH = hMm - 8;
      ensure(hMm + 3);
      var top = y;
      var maxC = 1;
      bins.forEach(function (b) { if (b.count > maxC) maxC = b.count; });
      var bw = CW / bins.length;
      bins.forEach(function (b, i) {
        var bh = Math.max(0.7, b.count / maxC * plotH);
        var mid = (b.from + b.to) / 2;
        if (mid >= 0) doc.setFillColor(GAIN[0], GAIN[1], GAIN[2]); else doc.setFillColor(LOSS[0], LOSS[1], LOSS[2]);
        doc.rect(ML + i * bw + 0.4, top + (plotH - bh), bw - 0.8, bh, "F");
      });
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.line(ML, top + plotH, ML + CW, top + plotH);
      setF("normal", 7.5, MUTED);
      doc.text(pct1(hist.min * 100), ML, top + plotH + 4.6);
      doc.text(pct1(hist.max * 100), ML + CW, top + plotH + 4.6, { align: "right" });
      y = top + hMm + 1;
    }
    /* Monte Carlo fan: vector column bands (5-95 light, 25-75 darker)
       plus a median polyline. Drawn whole — ensure() runs first, so the
       chart never splits across pages. band points are monthly steps. */
    function fanChart(band) {
      if (!band || band.length < 2) return;
      var hMm = 64, plotH = hMm - 13;
      var lo = Infinity, hi = -Infinity;
      band.forEach(function (p) { if (p.p5 < lo) lo = p.p5; if (p.p95 > hi) hi = p.p95; });
      if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return;
      var pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
      ensure(hMm + 3);
      var x0 = ML + 13, x1 = ML + CW, yTop = y, yBot = y + plotH;
      var X = function (i) { return x0 + i / (band.length - 1) * (x1 - x0); };
      var Y = function (v) { return yTop + (hi - v) / (hi - lo) * plotH; };
      var stepW = (x1 - x0) / (band.length - 1);
      function bandRects(topK, botK, fill) {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        band.forEach(function (p, i) {
          var t = Y(p[topK]), b = Y(p[botK]);
          doc.rect(X(i) - stepW / 2, t, stepW + 0.15, Math.max(0.2, b - t), "F");
        });
      }
      bandRects("p95", "p5", [219, 236, 219]);
      bandRects("p75", "p25", [172, 209, 172]);
      doc.setDrawColor(GAIN[0], GAIN[1], GAIN[2]); doc.setLineWidth(0.6);
      for (var fi = 1; fi < band.length; fi++) doc.line(X(fi - 1), Y(band[fi - 1].p50), X(fi), Y(band[fi].p50));
      doc.setLineWidth(0.3);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.line(x0, yBot, x1, yBot);
      var fmtAxis = function (v) { return hideAmt ? v.toFixed(2) + "×" : inrShort(d.value * v); };
      setF("normal", 7.5, MUTED);
      doc.text(fmtAxis(hi), x0 - 1.6, yTop + 2.6, { align: "right" });
      doc.text(fmtAxis(lo), x0 - 1.6, yBot, { align: "right" });
      [[0, "Now"], [12, "1Y"], [24, "2Y"], [36, "3Y"], [48, "4Y"], [60, "5Y"]].forEach(function (xl) {
        if (xl[0] >= band.length) return;
        doc.text(xl[1], X(xl[0]), yBot + 4.6, { align: xl[0] === 0 ? "left" : (xl[0] === band.length - 1 ? "right" : "center") });
      });
      var ly = yBot + 9.5;
      doc.setFillColor(219, 236, 219); doc.rect(ML, ly - 2.6, 5, 3, "F");
      setF("normal", 7.5, MUTED); doc.text("5th-95th range", ML + 6.5, ly);
      doc.setFillColor(172, 209, 172); doc.rect(ML + 38, ly - 2.6, 5, 3, "F");
      doc.text("25th-75th range", ML + 44.5, ly);
      doc.setDrawColor(GAIN[0], GAIN[1], GAIN[2]); doc.setLineWidth(0.6);
      doc.line(ML + 76, ly - 1.1, ML + 81, ly - 1.1); doc.setLineWidth(0.3);
      setF("normal", 7.5, MUTED); doc.text("Median", ML + 82.5, ly);
      y = yTop + hMm + 1;
    }

    /* ---------- Report card ---------- */
    if (secs.anaGrades) {
      heading("Report Card", "Rule-based grades from the advanced analytics — the same grades as the Insights tab.");
      if (!anaR) { note(ANA_MISSING); }
      else {
        kv("Data as of", dateLabel(anaR.asOf) + (anaR.points != null ? " · " + anaR.points + " trading days" : ""));
        kv("Benchmark", anaBench);
        kv("Risk-free rate", (anaP.rf != null && isFinite(anaP.rf)) ? Number(anaP.rf).toFixed(1) + "% per year" : "6.5% per year");
        y += 1;
        var rcG = anaR.reportCard || {};
        [["Returns", rcG.Returns], ["Risk Control", rcG.RiskControl], ["Diversification", rcG.Diversification], ["Consistency", rcG.Consistency], ["Momentum", rcG.Momentum]].forEach(function (e) {
          if (!e[1]) return;
          var g = e[1];
          kv(e[0], (g.grade || "—") + (g.score != null ? "  ·  " + Math.round(g.score) + " / 100" : ""), g.grade === "A" || g.grade === "B" ? GAIN : g.grade === "C" ? GOLD : g.grade === "D" ? LOSS : INK);
          if (g.reason) para(g.reason, 8.5, MUTED, 2);
        });
        var ccG = anaR.crossChecks || {};
        var bitsG = [];
        if (ccG.weightsSum != null) bitsG.push("Weights sum " + (Math.abs(ccG.weightsSum - 1) < 0.01 ? "100%" : (ccG.weightsSum * 100).toFixed(1) + "%"));
        if (ccG.riskContribSum != null) bitsG.push("Risk contributions sum " + (Math.abs(ccG.riskContribSum - 100) < 0.6 ? "100%" : ccG.riskContribSum.toFixed(1) + "%"));
        if (ccG.twrVsGiven) bitsG.push("Return chain verified against the value series: " + (ccG.twrVsGiven.ok ? "yes" : "no"));
        if (bitsG.length) note("Self-checks: " + bitsG.join(" · "));
        note("Grades come from fixed, published rules applied to your own numbers (the rules are in the appendix). They describe shape and behaviour — they are not buy or sell advice.");
      }
      await tick();
    }

    /* ---------- Returns — advanced ---------- */
    if (secs.anaReturns) {
      heading("Returns — Advanced", "Time-weighted returns chain the daily returns, so your deposits and withdrawals do not distort them.");
      if (!anaR) { note(ANA_MISSING); }
      else if (!anaR.enough || !anaR.returns) { note(ANA_SHORT); }
      else {
        var R = anaR.returns, roll = R.rolling || {};
        kv("Time-weighted return — whole window", pct1(R.twrTotal * 100));
        kv("Time-weighted return — per year", pct1(R.twrAnnualized * 100));
        kv("XIRR — your money (money-weighted)", xirrV === null ? "—" : pct1(xirrV * 100));
        kv("Rolling — 1 month", roll["1M"] == null ? "—" : pct1(roll["1M"] * 100));
        kv("Rolling — 3 months", roll["3M"] == null ? "—" : pct1(roll["3M"] * 100));
        kv("Rolling — 6 months", roll["6M"] == null ? "—" : pct1(roll["6M"] * 100));
        kv("Rolling — 1 year", roll["1Y"] == null ? "—" : pct1(roll["1Y"] * 100));
        if (R.calendarYears && R.calendarYears.length) {
          subHead("Calendar years");
          table([
            { h: "Year", w: 40, val: function (r) { return String(r.year); }, bold: true },
            { h: "Return", w: 62, align: "right", val: function (r) { return pct1(r.ret * 100); }, color: function (r) { return r.ret >= 0 ? GAIN : LOSS; } },
            { h: "Trading days", w: 80, align: "right", val: function (r) { return String(r.days); } }
          ], R.calendarYears, 5.6);
        }
        var bw = R.bestWorst || {};
        var bwRows = [];
        [["Best day", bw.day], ["Worst day", bw.worstDay], ["Best week (5 days)", bw.week], ["Worst week (5 days)", bw.worstWeek], ["Best month (21 days)", bw.month], ["Worst month (21 days)", bw.worstMonth]].forEach(function (e) {
          if (e[1]) bwRows.push({ l: e[0], ret: e[1].ret, dt: e[1].date || e[1].endDate });
        });
        if (bwRows.length) {
          subHead("Best & worst");
          table([
            { h: "Window", w: 64, val: function (r) { return r.l; }, bold: true },
            { h: "Return", w: 53, align: "right", val: function (r) { return pct1(r.ret * 100); }, color: function (r) { return r.ret >= 0 ? GAIN : LOSS; } },
            { h: "Date", w: 65, align: "right", val: function (r) { return dateLabel(r.dt); } }
          ], bwRows, 5.6);
        }
        var pm = R.positiveMonths || {};
        subHead("Consistency");
        kv("Positive months", pm.ratio == null ? "—" : pm.ratio.toFixed(0) + "% of " + (pm.monthsCounted || 0) + " months");
        kv("Green days", (pm.greenDays || 0) + " of " + (pm.totalDays || 0));
        kv("Best up streak", (pm.bestStreak || 0) + " days");
        kv("Current streak", ((pm.curStreak || 0) > 0 ? "+" : "") + (pm.curStreak || 0) + " days");
        var hist = R.histogram;
        if (hist && hist.bins && hist.bins.length) {
          subHead("Daily return distribution");
          histChart(hist);
          note("Worst day " + pct1(hist.min * 100) + " · Best day " + pct1(hist.max * 100) + " · Median day " + pct1(hist.median * 100) + " · Skew " + f2(hist.skew) + ". The bars count how many days fell in each return band.");
        }
      }
      await tick();
    }

    /* ---------- Risk — advanced ---------- */
    if (secs.anaRisk) {
      heading("Risk — Advanced", "From the last year of flow-adjusted daily returns, measured against " + anaBench + ".");
      if (!anaR) { note(ANA_MISSING); }
      else if (!anaR.enough || !anaR.risk) { note(ANA_SHORT); }
      else {
        var K = anaR.risk;
        var riskRows = [
          { l: "Volatility (annualised)", v: K.vol == null ? "—" : (K.vol * 100).toFixed(1) + "%" },
          { l: "Downside deviation (annualised)", v: K.downsideDev == null ? "—" : (K.downsideDev * 100).toFixed(1) + "%" },
          { l: "Sharpe ratio", v: f2(K.sharpe) },
          { l: "Sortino ratio", v: f2(K.sortino) },
          { l: "Calmar ratio", v: f2(K.calmar) },
          { l: "Beta vs " + anaBench, v: f2(K.beta) },
          { l: "Alpha (Jensen, per year)", v: K.alpha == null ? "—" : pct1(K.alpha * 100) },
          { l: "Correlation with " + anaBench, v: f2(K.corr) },
          { l: "R-squared", v: f2(K.r2) },
          { l: "Tracking error (annualised)", v: K.trackingError == null ? "—" : (K.trackingError * 100).toFixed(1) + "%" },
          { l: "Up-capture", v: K.upCapture == null ? "—" : K.upCapture.toFixed(0) + "%" },
          { l: "Down-capture", v: K.downCapture == null ? "—" : K.downCapture.toFixed(0) + "%" },
          { l: "VaR 95% — 1 day, historical", v: K.var95 == null ? "—" : K.var95.toFixed(2) + "%" + (hideAmt ? "" : "  (" + M(d.value * K.var95 / 100) + " of today's value)") },
          { l: "CVaR 95% — average of the worst 5% of days", v: K.cvar95 == null ? "—" : K.cvar95.toFixed(2) + "%" + (hideAmt ? "" : "  (" + M(d.value * K.cvar95 / 100) + " of today's value)") },
          { l: "Maximum drawdown", v: K.maxDD ? pct1(-K.maxDD.pct) : "—", c: LOSS },
          { l: "Maximum drawdown — peak to trough", v: K.maxDD && K.maxDD.peakDate ? dateLabel(K.maxDD.peakDate) + " to " + dateLabel(K.maxDD.troughDate) : "—" },
          { l: "Current drawdown", v: K.currentDD ? pct1(-K.currentDD.pct) : "—", c: LOSS },
          { l: "Days below the latest peak", v: K.currentDD ? String(K.currentDD.days) : "—" },
          { l: "Longest drawdown", v: K.longestDD ? K.longestDD.days + " trading days" : "—" },
          { l: "Longest drawdown — recovery", v: K.longestDD ? (K.longestDD.recovered ? "Recovered" + (K.longestDD.recoveryDays != null ? " in " + K.longestDD.recoveryDays + " days after the trough" : "") : "Not yet recovered") : "—" }
        ];
        table([
          { h: "Measure", w: 104, val: function (r) { return r.l; } },
          { h: "Value", w: 78, align: "right", val: function (r) { return r.v; }, color: function (r) { return r.c || INK; } }
        ], riskRows, 5.6);
        note("VaR and CVaR in this section are historical: they are read off your actual past daily returns, not fitted to a bell curve (a parametric estimate). The exact method is set out in the appendix.");
      }
      await tick();
    }

    /* ---------- Allocation & risk contribution ---------- */
    if (secs.anaAlloc) {
      heading("Allocation & Risk Contribution", "Concentration from today's weights; risk contribution from the daily covariance of your stocks.");
      if (!anaR) { note(ANA_MISSING); }
      else {
        var A = anaR.allocation || {};
        kv("Top 1 holding", A.top1 == null ? "—" : (A.top1 * 100).toFixed(1) + "%");
        kv("Top 3 holdings", A.top3 == null ? "—" : (A.top3 * 100).toFixed(1) + "%");
        kv("Top 5 holdings", A.top5 == null ? "—" : (A.top5 * 100).toFixed(1) + "%");
        kv("Herfindahl index (HHI)", A.hhi == null ? "—" : A.hhi.toFixed(3));
        kv("Effective number of stocks", A.effN == null ? "—" : A.effN.toFixed(1));
        kv("Diversification ratio", A.divRatio == null ? "—" : A.divRatio.toFixed(2));
        var rcA = A.riskContrib;
        if (rcA) {
          subHead("Weight vs risk contribution");
          var rcRows = Object.keys(rcA).map(function (sym) {
            var row = d.rows.find(function (r) { return r.sym === sym; });
            return { sym: sym, w: row ? wt(row) : 0, risk: rcA[sym] };
          }).sort(function (a, b) { return b.risk - a.risk; });
          var missingRc = d.rows.map(function (r) { return r.sym; }).filter(function (sym) { return !(sym in rcA); });
          missingRc.forEach(function (sym) {
            var row = d.rows.find(function (r) { return r.sym === sym; });
            rcRows.push({ sym: sym, w: row ? wt(row) : 0, risk: null });
          });
          table([
            { h: "Stock", w: 44, val: function (r) { return r.sym; }, bold: true },
            { h: "Weight %", w: 58, align: "right", val: function (r) { return r.w.toFixed(1); } },
            { h: "Share of risk %", w: 80, align: "right", val: function (r) { return r.risk == null ? "—" : r.risk.toFixed(1); } }
          ], rcRows, 5.6);
          if (missingRc.length) note("Risk shares are computed over the stocks with price history (" + missingRc.join(", ") + " excluded) and sum to 100%. The weight column is each stock's share of the whole portfolio.");
          else note("Risk shares sum to 100%. A stock can carry more risk than its weight when it swings harder, or moves together with the rest of the portfolio.");
        } else {
          note(anaR.enough ? "Risk contribution is not available — it needs at least 30 days on which all the included stocks traded." : ANA_SHORT);
        }
      }
      await tick();
    }

    /* ---------- Stock deep-dive ---------- */
    if (secs.anaStocks) {
      heading("Stock Deep-Dive", "Price-path metrics from free daily data for each holding — the same table as the Insights tab.");
      if (!anaR) { note(ANA_MISSING); }
      else {
        var stocksMap = anaR.stocks || {};
        var sdRows = sortedByVal.map(function (r) {
          var st = stocksMap[r.sym] || {};
          var flags = [];
          if (st.ma && st.ma.vs200 != null && st.ma.vs200 < 0) flags.push("Below 200-DMA");
          if (r.pnlPct < -30) flags.push("30%+ below your cost");
          if (st.rangePosPct != null && st.rangePosPct < 10) flags.push("Near 52-week low");
          if (st.vol != null && st.vol > 0.60) flags.push("High volatility");
          return { r: r, st: st, flags: flags };
        });
        table([
          { h: "Stock", w: 18, val: function (x) { return x.r.sym; }, bold: true },
          { h: "Price", w: 15, align: "right", val: function (x) { return x.r.ltp === null ? "—" : M2(x.r.ltp); } },
          { h: "Wt %", w: 10, align: "right", val: function (x) { return wt(x.r).toFixed(1); } },
          { h: "Mom 3M", w: 14, align: "right", val: function (x) { return x.st.mom && x.st.mom["3M"] != null ? pct1(x.st.mom["3M"] * 100) : "—"; }, color: function (x) { return x.st.mom && x.st.mom["3M"] != null ? (x.st.mom["3M"] >= 0 ? GAIN : LOSS) : INK; } },
          { h: "RSI", w: 8, align: "right", val: function (x) { return x.st.rsi14 == null ? "—" : x.st.rsi14.toFixed(0); } },
          { h: "Vol", w: 11, align: "right", val: function (x) { return x.st.vol == null ? "—" : (x.st.vol * 100).toFixed(0) + "%"; } },
          { h: "Beta", w: 10, align: "right", val: function (x) { return f2(x.st.beta); } },
          { h: "52W pos", w: 12, align: "right", val: function (x) { return x.st.rangePosPct == null ? "—" : x.st.rangePosPct.toFixed(0) + "%"; } },
          { h: "vs 50DMA", w: 15, align: "right", val: function (x) { return x.st.ma && x.st.ma.vs50 != null ? pct1(x.st.ma.vs50) : "—"; } },
          { h: "vs 200DMA", w: 16, align: "right", val: function (x) { return x.st.ma && x.st.ma.vs200 != null ? pct1(x.st.ma.vs200) : "—"; } },
          { h: "From cost", w: 14, align: "right", val: function (x) { return pct1(x.r.pnlPct); }, color: function (x) { return x.r.pnl >= 0 ? GAIN : LOSS; } },
          { h: "Flags", w: 39, val: function (x) { return x.flags.length ? x.flags.join("; ") : "—"; } }
        ], sdRows, 5.6);
        var flagged = sdRows.filter(function (x) { return x.flags.length; });
        if (flagged.length) {
          subHead("Worth reviewing — flags in full");
          flagged.forEach(function (x) { para("•  " + x.r.sym + " — " + x.flags.join("; ") + ".", 9.5, INK, 0.8); });
          y += 1.5;
          note("Flags are neutral, rule-based observations — never buy or sell advice. The rules: below the 200-day average; more than 30% below your average cost; near the 52-week low (bottom 10% of the range); unusually high volatility (above 60% a year).");
        }
        note("Not available in free data: PE, PB, ROE, market cap, debt, margins and dividend yield come from a fundamentals feed that the free data does not include, so they are not shown. Relative strength against sector indices is also not freely available; relative strength is measured against " + anaBench + " through beta and correlation (Risk — Advanced).");
      }
      await tick();
    }

    /* ---------- Income — dividends ---------- */
    if (secs.anaIncome) {
      heading("Income — Dividends", "From the dividend entries in your records and each stock's own payout history.");
      var divAll = d.divTotal || 0;
      var t12Div = null;
      try {
        if (typeof state !== "undefined" && state && state.txns) {
          var cutD = new Date(); cutD.setFullYear(cutD.getFullYear() - 1);
          var sum12 = 0;
          state.txns.forEach(function (t) { if (t.type === "DIV" && new Date(t.date) >= cutD) sum12 += Number(t.price) || 0; });
          t12Div = sum12;
        }
      } catch (e) { t12Div = null; }
      kv("Dividends received — all time", M(divAll));
      kv("Dividends received — last 12 months", t12Div === null ? "—" : M(t12Div));
      kv("Yield on cost — trailing 12 months", (t12Div !== null && d.invested > 0) ? (t12Div / d.invested * 100).toFixed(2) + "%" : "—");
      kv("Estimated dividends — next 12 months", (data.divEst === null || data.divEst === undefined) ? "—" : M(data.divEst));
      note("The estimate repeats each stock's payouts of the last 12 months on the shares you hold today — the Dividend Snowball method in the app. Companies can raise, cut or skip dividends, so treat it as a guide, not a promise. Exact upcoming ex-dates are not published in any free open feed, so they are not guessed here.");
      await tick();
    }

    /* ---------- Trades — statistics ---------- */
    if (secs.anaTrades) {
      heading("Trades — Statistics", "Closed trades matched first-in-first-out — the same matching as the Tax section.");
      var salesT = null;
      try { salesT = folioFifo().filter(function (s2) { return s2.gain !== null && s2.gain !== undefined; }); } catch (e) { salesT = null; }
      if (!salesT) { note("Trade statistics are not available right now."); }
      else if (!salesT.length) { note("No closed trades yet — sell something (fully or partly) and its statistics will appear here, matched first-in-first-out like the Tax section."); }
      else {
        var winsT = salesT.filter(function (s2) { return s2.gain > 0; });
        var lossT = salesT.filter(function (s2) { return s2.gain < 0; });
        var sumGain = function (arr) { return arr.reduce(function (x, s2) { return x + s2.gain; }, 0); };
        var gwT = sumGain(winsT), glT = Math.abs(sumGain(lossT)), realT = sumGain(salesT);
        var daysT = salesT.map(function (s2) { return s2.days; }).filter(function (x) { return typeof x === "number"; });
        var avgDaysT = daysT.length ? Math.round(daysT.reduce(function (a, x) { return a + x; }, 0) / daysT.length) : null;
        var bestT = salesT.slice().sort(function (a, b) { return b.gain - a.gain; })[0];
        var worstT = salesT.slice().sort(function (a, b) { return a.gain - b.gain; })[0];
        var avgDownT = null;
        try {
          if (typeof state !== "undefined" && state && state.txns && typeof effPrice === "function") {
            var posT = {}, cntD = 0;
            var txT = state.txns.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
            txT.forEach(function (t) {
              if (t.type === "BUY") {
                var p0 = posT[t.sym] || { q: 0, c: 0 };
                var pr = effPrice(t);
                if (p0.q > 0 && pr < p0.c / p0.q) cntD++;
                var q0 = Number(t.qty) || 0;
                posT[t.sym] = { q: p0.q + q0, c: p0.c + q0 * pr };
              } else if (t.type === "SELL") {
                var p1 = posT[t.sym];
                if (p1 && p1.q > 0) { var q1 = Math.min(p1.q, Number(t.qty) || 0); var av = p1.c / p1.q; posT[t.sym] = { q: p1.q - q1, c: p1.c - q1 * av }; }
              }
            });
            avgDownT = cntD;
          }
        } catch (e) { avgDownT = null; }
        kv("Closed trades", String(salesT.length));
        kv("Realised P&L — closed trades", M(realT), realT >= 0 ? GAIN : LOSS);
        kv("Win rate", (winsT.length / salesT.length * 100).toFixed(0) + "% (" + winsT.length + " of " + salesT.length + " trades)");
        kv("Average win", winsT.length ? M(gwT / winsT.length) : "—");
        kv("Average loss", lossT.length ? M(-glT / lossT.length) : "—");
        kv("Profit factor", glT > 0 ? (gwT / glT).toFixed(2) : (gwT > 0 ? "No losses yet" : "—"));
        kv("Average holding period", avgDaysT !== null ? avgDaysT + " days" : "—");
        kv("Best trade", bestT.sym + " — " + M(bestT.gain) + " (sold " + dateLabel(bestT.sellDate) + ")", GAIN);
        kv("Worst trade", worstT.sym + " — " + M(worstT.gain) + " (sold " + dateLabel(worstT.sellDate) + ")", LOSS);
        if (avgDownT !== null) kv("Average-down buys", String(avgDownT));
        note("Same first-in-first-out matching as the Tax section, so the realised total agrees with it. Dividends are income and are counted in the Income section, not here.");
      }
      await tick();
    }

    /* ---------- Scenarios ---------- */
    if (secs.anaScen) {
      heading("Scenarios", "What-if maths on your own history. A simulation, not a prediction.");
      if (!anaR) { note(ANA_MISSING); }
      else if (!anaR.enough || !anaR.scenarios) { note(ANA_SHORT); }
      else {
        var S = anaR.scenarios;
        if (S.stress && S.stress.length) {
          subHead("Stress test — estimate");
          table([
            { h: "If " + anaBench + " falls", w: 62, val: function (r) { return (r.shock * 100).toFixed(0) + "%"; }, bold: true },
            { h: "Estimated impact", w: 55, align: "right", val: function (r) { return pct1(r.impact * 100); }, color: function (r) { return r.impact >= 0 ? GAIN : LOSS; } },
            { h: "Value after", w: 65, align: "right", val: function (r) { return M(d.value * (1 + r.impact)); } }
          ], S.stress, 5.6);
          note("Built from each stock's beta. Coverage: " + (S.stressCoverage != null ? (S.stressCoverage * 100).toFixed(0) + "% of portfolio weight has a measurable beta." : "—") + " An estimate, not a forecast — real falls do not move in straight lines, and betas change.");
        }
        var mc = S.monteCarlo;
        if (mc && mc.bands) {
          subHead("Monte Carlo projection — a simulation, not a prediction");
          var fmtMult = function (mm) { return mm == null ? "—" : (hideAmt ? mm.toFixed(2) + "×" : M(d.value * mm)); };
          var mcRows = [1, 3, 5].map(function (yr) {
            var band = mc.bands[String(yr)];
            var end = band && band.length ? band[band.length - 1] : null;
            return { yr: yr, end: end };
          }).filter(function (r) { return r.end; });
          if (mcRows.length) {
            table([
              { h: "Horizon", w: 30, val: function (r) { return r.yr + (r.yr === 1 ? " year" : " years"); }, bold: true },
              { h: "5th %ile", w: 29, align: "right", val: function (r) { return fmtMult(r.end.p5); } },
              { h: "25th %ile", w: 29, align: "right", val: function (r) { return fmtMult(r.end.p25); } },
              { h: "Median", w: 34, align: "right", val: function (r) { return fmtMult(r.end.p50); }, bold: true },
              { h: "75th %ile", w: 30, align: "right", val: function (r) { return fmtMult(r.end.p75); } },
              { h: "95th %ile", w: 30, align: "right", val: function (r) { return fmtMult(r.end.p95); } }
            ], mcRows, 5.6);
          }
          fanChart(mc.bands["5"] || mc.bands["3"] || mc.bands["1"]);
          note("Across " + (mc.paths || 1000) + " simulated futures, built by reshuffling your own daily returns of the last year (bootstrap), starting from today's value. The bands are the 5th-95th and 25th-75th percentile ranges; the line is the median. A simulation, not a prediction.");
        }
      }
      await tick();
    }

    /* ---------- Methodology & formulas (appendix) ---------- */
    if (secs.methodology) {
      heading("Methodology & Formulas — Advanced Analytics", "How the advanced figures in this report are worked out, in plain language.");
      if (!anaR) { note(ANA_MISSING); }
      else {
        var rfTxt = (anaP.rf != null && isFinite(anaP.rf)) ? Number(anaP.rf).toFixed(1) + "%" : "6.5%";
        para("Basis: your actual holdings over the last year, rebuilt day by day from your transactions at daily closing prices — quantities as you held them on each day. Daily portfolio returns are flow-adjusted: r = (value today - money added today) / value yesterday - 1, so deposits and withdrawals never count as profit or loss. Annualisation uses 252 trading days. Benchmark: " + anaBench + ". Risk-free rate: " + rfTxt + " per year (the daily rate is the annual rate / 252), as set in the app. Data as of " + dateLabel(anaR.asOf) + (anaR.points != null ? ", " + anaR.points + " trading days" : "") + ". History-based figures need at least 60 days of returns; below that they are left out, while weight-based figures (concentration, the diversification grade) still compute.", 9.5, INK, 3);
        para("Time-weighted return (TWR): chain the daily returns — multiply (1 + r) over all days and subtract 1. Rolling returns use the last 21 returns (1M), 63 (3M), 126 (6M) and 252 (1Y), and are not shown when the window is longer than the available history. TWR annualised = (1 + TWR) raised to the power (252 / number of days), minus 1. Calendar-year returns chain the returns whose end date falls in that year. Best and worst weeks and months are rolling windows of 5 and 21 returns. XIRR is a different measure: money-weighted, respecting the dates of your actual buys and sells.", 9.5, INK, 3);
        para("Volatility = standard deviation of the daily returns x the square root of 252. Downside deviation = the square root of (the average over ALL days of the squared shortfall of each day's return below the daily risk-free rate) x the square root of 252. Sharpe ratio = (average daily return - daily risk-free rate) / standard deviation x the square root of 252. Sortino ratio = the same numerator / downside deviation (before annualising) x the square root of 252. Calmar ratio = TWR annualised / maximum drawdown.", 9.5, INK, 3);
        para("Beta = covariance of the portfolio's and the benchmark's daily returns / variance of the benchmark's returns. Jensen's alpha = ((average portfolio return - daily risk-free rate) - beta x (average benchmark return - daily risk-free rate)) x 252. Correlation is the Pearson correlation of the paired daily returns; R-squared is its square. Tracking error = standard deviation of (portfolio return - benchmark return) x the square root of 252. Up-capture = average portfolio return on the benchmark's up days / average benchmark return on those days x 100; down-capture is the same on down days.", 9.5, INK, 3);
        para("Historical VaR and CVaR (95%, 1 day): sort the daily returns from worst to best. The VaR return is the return at position floor(0.05 x number of days) in that sorted list, reported as a positive loss percent. CVaR is the average of all returns at or beyond that position — the average day in the worst 5%. Because the boundary is one actual past day, VaR can occasionally print as a small negative number: that means the day at the 95% boundary was itself a small gain.", 9.5, INK, 3);
        para("Drawdowns are measured on a wealth index chained from the daily returns. Maximum drawdown is the largest peak-to-trough fall. Current drawdown is the fall from the most recent peak to the last day, with the days spent below that peak. The longest drawdown is the longest peak-to-recovery stretch in trading days; recovery is the first day the index is back at or above the episode's peak.", 9.5, INK, 3);
        para("Herfindahl index (HHI) = the sum of the squared weights of all holdings; effective number of stocks = 1 / HHI. Top 1 / 3 / 5 are the summed weights of the largest holdings. Diversification ratio = (weight-averaged volatility of the individual stocks) / portfolio volatility. Risk contribution of a stock = weight x (covariance matrix x weights, for that stock) / portfolio variance x 100, using the covariance of daily returns over the days all included stocks traded; stocks without enough history are excluded and the remaining weights renormalised, so the contributions sum to exactly 100. The correlation matrix uses pairwise daily returns and needs at least 30 shared trading days per pair.", 9.5, INK, 3);
        para("Per-stock figures: momentum is the close-to-close return over the last 21 / 63 / 126 / 252 of the stock's own trading days. A stock's position in its 52-week range = (last close - 52-week low) / (52-week high - 52-week low) x 100, over the last 252 closes. Moving averages are simple averages of the last 20 / 50 / 200 closes; 'vs 50DMA' is (last close / average - 1) x 100. RSI(14) uses Wilder's smoothing of gains and losses over 14 days. A stock's own beta, correlation and volatility use its day-aligned daily returns (at least 30) against the benchmark.", 9.5, INK, 3);
        para("Report card rules (fixed; scores clamped to 0-100; grades A from 75, B from 55, C from 35, else D). Returns: 50 + (TWR annualised - benchmark annualised) x 500. Risk control: 0.6 x clamped(100 - maximum drawdown % x 2.2) + 0.4 x clamped(110 - volatility % x 2.2), each part floored at 0. Diversification: 0.6 x clamped((effective number - 1) / 9 x 100) + 0.4 x clamped(100 - (largest holding's weight above 25%) x 200). Consistency: 0.6 x positive-month % + 0.4 x green-day %. Momentum: 30 points if the 3-month rolling return is positive, 30 if the 6-month is positive, 20 if the portfolio value is above its 50-day average and 20 if above its 200-day average.", 9.5, INK, 3);
        para("Stress test: for a benchmark fall of 10% or 20%, each stock is assumed to move by its own beta times the fall; the portfolio impact is the weight-averaged sum over the stocks that have a measurable beta (the covered share of the portfolio is printed with the table). Monte Carlo: " + ((anaR.scenarios && anaR.scenarios.monteCarlo && anaR.scenarios.monteCarlo.paths) || 1000) + " simulated futures (seeded, so the same data always gives the same result) are built by drawing your own past daily returns at random with replacement and compounding them for up to 1,260 trading days from today's value; any single day's growth factor is floored at zero. The reported bands are percentiles of those futures. A simulation, not a prediction.", 9.5, INK, 3);
        para("Not available in free data: price-to-earnings (PE), price-to-book (PB), return on equity (ROE), the fundamentals feed's market capitalisation, debt, profit margins and dividend yield; relative strength against sector indices; exact upcoming dividend ex-dates; and intraday prices. The free feed the app uses does not publish these to browser apps, so this report leaves them out rather than estimating them.", 9.5, INK, 3);
        para("The analysis figures in this report are the same computed values shown in the Insights tab.", 9.5, INK, 3);
      }
      await tick();
    }

    /* ================= Methodology & disclaimer ================= */
    newPage(false);
    heading("Methodology & Disclaimer");
    para("Data source: prices and daily price history come from the free Yahoo Finance chart feed the app uses. Prices are delayed (about 15 minutes) and history is daily closing prices for the last year. Figures are worked out on this device from your own entries — the same functions the app's screens use, so the totals here match your dashboard.", 9.5, INK, 3);
    para("XIRR: the annualised return of your dated cash flows (buys as money out, sells and dividends as money in, today's value as the final inflow), solved by the app's bisection method. It is shown only when the first cash flow is at least 7 days old.", 9.5, INK, 3);
    para("Period returns & alpha: for each window, the change in value of the quantities you hold today, at daily closing prices (the Insights page method). Alpha is the portfolio's percent return minus NIFTY 50's percent return over the same window.", 9.5, INK, 3);
    para("Volatility: the standard deviation of the portfolio's daily returns (adjusted so money you added or removed does not count as profit or loss), multiplied by the square root of 252 trading days. Beta: how strongly those daily returns move with NIFTY 50's — the covariance of the two return series divided by the variance of NIFTY's. Maximum drawdown: the worst peak-to-low fall on that same flow-adjusted curve. Risk figures need about a month of daily history, the same rule as the app.", 9.5, INK, 3);
    para("Profit factor: total gains on holdings in profit divided by total losses on holdings in loss, as on the Insights health card. Tax figures are estimates from the app's Tax tab and FIFO Capital Gains Statement (short-term 20%, long-term 12.5% above the ₹1,25,000 yearly exemption, unless you changed the rates in the app). They are not tax advice.", 9.5, INK, 3);
    para("52-week high/low figures are the values the price feed reports for each stock; 'near' in this report means within 5% of the high or the low.", 9.5, INK, 3);
    setF("bold", 10.5, INK); ensure(7);
    doc.text("For personal tracking only. Not investment advice.", ML, y); y += 7;
    para("This report is generated from your own records for your personal tracking and study. It is not investment, tax or legal advice, and nothing in it is a recommendation to buy or sell any security.", 9.5, MUTED, 2);

    /* ---------- brand logo (rasterised once) ----------
       jsPDF cannot embed SVG, so the Singh Caizen logo is drawn to an
       offscreen canvas once and stamped as a PNG in the pass below.
       Every page of this report is light (white), so the dark variant
       (assets/sc-logo-dark.svg, viewBox 639 x 392) is used throughout;
       the white variant would only be needed on a dark page, which
       this report never produces. Any failure leaves logoImg null and
       the report is built without the logo rather than broken. */
    var logoImg = null;
    try {
      var logoEl = await new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { rej(new Error("logo failed to load")); };
        im.src = "assets/sc-logo-dark.svg";
      });
      var logoCv = document.createElement("canvas");
      logoCv.width = 1278; logoCv.height = 784;
      var logoG = logoCv.getContext("2d");
      logoG.drawImage(logoEl, 0, 0, 1278, 784);
      logoImg = logoCv.toDataURL("image/png");
    } catch (e) { logoImg = null; }

    /* ---------- footers + logo (second pass) ---------- */
    var total = doc.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      if (logoImg) {
        var logoW = i === 1 ? 26 : 20;
        var logoH = logoW * 392 / 639;
        try { doc.addImage(logoImg, "PNG", PW - MR - logoW, i === 1 ? 3.2 : 2.8, logoW, logoH); } catch (e) { /* logo is decoration */ }
      }
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.line(ML, PH - 13, ML + CW, PH - 13);
      setF("normal", 7.5, MUTED);
      brandText("FOLIO by Singh Caizen", ML, PH - 8.5);
      doc.text(WEBSITE, ML + CW / 2, PH - 8.5, { align: "center" });
      doc.text("Page " + i + " of " + total, ML + CW, PH - 8.5, { align: "right" });
    }

    /* ---------- save: download, share-sheet fallback ---------- */
    progress("Saving your report...");
    var fname = "FOLIO-Portfolio-Report-" + todayStr() + ".pdf";
    var blob = doc.output("blob");
    var saved = false;
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 4000);
      saved = true;
    } catch (e) { saved = false; }
    if (!saved && navigator.canShare) {
      try {
        var file = new File([blob], fname, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "FOLIO Portfolio Report" }); saved = true; }
      } catch (e) { if (e && e.name === "AbortError") saved = true; }
    }
    if (!saved) throw new Error("the PDF was built but this device blocked the download.");
  }

  window.FolioReport = { open: open };
})();
