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
   missing or too short print "Not enough data" or are skipped.        */
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
    ["review", "Things to review"]
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

  /* ================= options sheet ================= */
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
      '<p class="auth-note" style="margin:.6rem 0 .2rem"><b>Customize sections</b></p>' +
      SECTIONS.map(function (s) {
        return '<label style="display:flex;align-items:center;gap:10px;padding:5px 0;cursor:pointer">' +
          '<input type="checkbox" class="rep-sec" data-sec="' + s[0] + '" checked style="width:19px;height:19px;flex:0 0 auto"> ' + s[1] + "</label>";
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
    setProgress("", false);
    sheetEl.classList.remove("hidden");
  }

  async function onDownload() {
    if (busy) return;
    var hideAmt = !!sheetEl.querySelector("#repHideAmt").checked;
    var secs = {};
    sheetEl.querySelectorAll(".rep-sec").forEach(function (c) { secs[c.dataset.sec] = !!c.checked; });
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
    return { d: d, series: series, histMap: histMap, niftyHist: niftyHist, periods: periods };
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
    function setF(style, size, color) {
      doc.setFont("FolioSans", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    }
    function newPage(first) {
      if (!first) doc.addPage();
      y = 14;
      if (!first) {
        setF("normal", 7.5, FAINT);
        doc.text("FOLIO by Singh Caizen — Portfolio Report", ML, 9);
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
        });
        y += 5.4;
      }
      drawHead();
      doc.setFillColor(247, 243, 234);
      rows.forEach(function (r, ri) {
        if (y + rowH > BOT) { newPage(false); drawHead(); }
        if (ri % 2 === 0) doc.rect(ML, y - 3.4, CW, rowH, "F");
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
      var labelW = 118, valW = 150, barX = labelW, barW = W - labelW - valW;
      var bh = Math.min(30, (H - 8) / items.length), gap = (H - 8 - bh * items.length) / Math.max(1, items.length - 1 || 1);
      g.font = "600 17px 'Public Sans', system-ui, sans-serif";
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
      g.font = "500 15px 'Public Sans', system-ui, sans-serif"; g.fillStyle = "#6b6b6b";
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
      g.fillStyle = "#9a9a9a"; g.fillRect(W - 268, 2, 22, 4);
      g.fillStyle = "#6b6b6b"; g.textAlign = "left"; g.fillText("Invested", W - 240, 8);
      g.fillStyle = "#b8912a"; g.fillRect(W - 148, 2, 22, 4);
      g.fillStyle = "#6b6b6b"; g.fillText("Value", W - 120, 8);
      g.textAlign = "center"; g.fillStyle = "#6b6b6b";
      [0, Math.floor((axis.length - 1) / 2), axis.length - 1].forEach(function (i) { g.fillText(axis[i] || "", X(i), H - 6); });
      return c.cv;
    }

    /* ================= PAGE 1: cover + summary ================= */
    newPage(true);
    try {
      var iconBlob = await (await fetch("assets/icon-512.png")).blob();
      var iconUrl = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(iconBlob); });
      doc.addImage(iconUrl, "PNG", ML, y, 15, 15);
    } catch (e) { /* icon is decoration — branding text below carries it */ }
    setF("bold", 17, INK);
    doc.text("FOLIO by Singh Caizen", ML + 19, y + 6.5);
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

    /* ---------- footers (second pass) ---------- */
    var total = doc.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.line(ML, PH - 13, ML + CW, PH - 13);
      setF("normal", 7.5, MUTED);
      doc.text("FOLIO by Singh Caizen", ML, PH - 8.5);
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
