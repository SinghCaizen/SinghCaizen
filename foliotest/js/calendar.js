/* ================= FOLIO CALENDAR (Phase 6G) =================
   Lazy module — loaded on first open via window.folioOpenCalendar()
   in features.js (same contract as tools.js / ptools.js / markethub.js
   / mutualfunds.js). NOT in SW CORE. Nothing runs at app startup.

   WHAT IT SHOWS — a month grid with three honest event kinds:
   - NSE market holidays, from the Market Hub's ONE embedded 2026
     holiday list, reached through window.folioNseHolidays() (the
     list is never duplicated here).
   - Ex-dividend dates and split / bonus dates for the stocks the
     user HOLDS or WATCHES, from the app's own fetchCorpActions()
     (features.js — the 24-hour-cached Yahoo chart-events feed that
     the Dashboard Corporate Actions panel and the PDF report use).
     No new endpoint, no scraping.
   - For held stocks, the expected dividend (announced ₹/share × the
     user's current quantity, the renderCorp() convention) is shown
     behind .ds-amt, the Privacy Mode hook — it is the user's money.
     Per-share amounts are public data and print plainly.

   WHAT IT NEVER SHOWS: company results / earnings dates. There is
   no free source for them in this app (the Dashboard events panel's
   results dates come from a different, window-limited feed and are
   not reused here), so the sheet footer says so in plain words
   instead of inventing dates.

   The .ics export is this sheet's own: the pre-existing
   folioEventsIcs() exports the Dashboard panel's evCalData (a fixed
   -7d..+62d window of held-stock events), which is a different event
   set from the calendar's, so the calendar builds its file from its
   own loaded events in the same VEVENT format, via folioDownload().

   Persisted settings (insX pattern — state.profile.calendar, riding
   the existing cloud doc / .folio vault via persist()):
     calendar.showHolidays  bool, default true
     calendar.showDivs      bool, default true (dividends + splits)

   Dates are placed by device-local calendar day, matching how the
   rest of the app formats these timestamps (fmtDate). */
(function () {
  "use strict";

  /* ---------- formatting: ride the app's helpers when present ---------- */
  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fmtInr(n) {
    try { if (typeof inr === "function") return inr(n); } catch (e) {}
    return Number.isFinite(n) ? "₹" + Math.round(n).toLocaleString("en-IN") : "—";
  }
  function fmtInr2(n) {
    try { if (typeof inr2 === "function") return inr2(n); } catch (e) {}
    return Number.isFinite(n) ? "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  }
  function prof() { try { return (typeof state !== "undefined" && state && state.profile) || {}; } catch (e) { return {}; } }
  function calSettings() {
    try {
      var p = (typeof state !== "undefined" && state && state.profile) || null;
      if (!p) return { showHolidays: true, showDivs: true };
      if (!p.calendar || typeof p.calendar !== "object") p.calendar = {};
      if (typeof p.calendar.showHolidays !== "boolean") p.calendar.showHolidays = true;
      if (typeof p.calendar.showDivs !== "boolean") p.calendar.showDivs = true;
      return p.calendar;
    } catch (e) { return { showHolidays: true, showDivs: true }; }
  }
  function calSave() { try { persist(); } catch (e) {} }

  /* ================= PURE LOGIC (window.FolioCalendarMath — harness-tested) =================
     Data-in / data-out only: no DOM, no fetch, no app state. */
  var M = {};
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  M.dateStr = function (y, m, d) { return y + "-" + pad2(m + 1) + "-" + pad2(d); };
  M.dateStrFromTs = function (ts) {
    var d = new Date(ts);
    if (!isFinite(d.getTime())) return null;
    return M.dateStr(d.getFullYear(), d.getMonth(), d.getDate());
  };
  M.addMonths = function (y, m, delta) {
    var t = y * 12 + m + delta;
    return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
  };
  /* Monday-first month grid. Returns the minimal whole weeks covering
     the month; cells outside the month carry inMonth:false with the
     neighbouring month's real dates (the UI renders them dimmed). */
  M.monthGrid = function (y, m) {
    var firstDow = (new Date(y, m, 1).getDay() + 6) % 7; /* Mon = 0 */
    var daysIn = new Date(y, m + 1, 0).getDate();
    var prev = M.addMonths(y, m, -1);
    var next = M.addMonths(y, m, 1);
    var daysPrev = new Date(prev.year, prev.month + 1, 0).getDate();
    var total = Math.ceil((firstDow + daysIn) / 7) * 7;
    var cells = [];
    for (var i = 0; i < total; i++) {
      var dayNum = i - firstDow + 1;
      if (dayNum < 1) cells.push({ dateStr: M.dateStr(prev.year, prev.month, daysPrev + dayNum), day: daysPrev + dayNum, inMonth: false });
      else if (dayNum > daysIn) cells.push({ dateStr: M.dateStr(next.year, next.month, dayNum - daysIn), day: dayNum - daysIn, inMonth: false });
      else cells.push({ dateStr: M.dateStr(y, m, dayNum), day: dayNum, inMonth: true });
    }
    return { year: y, month: m, cells: cells, weeks: total / 7 };
  };
  /* fetchCorpActions shape: { divs: [{ts, amount}], splits: [{ts, text}] }.
     qty = the user's current holding quantity, or null for watched-only. */
  M.eventsFromCorpActions = function (sym, ca, qty) {
    var out = [];
    if (!ca || typeof ca !== "object") return out;
    (ca.divs || []).forEach(function (dv) {
      if (!dv || !isFinite(dv.ts)) return;
      var ds = M.dateStrFromTs(dv.ts); if (!ds) return;
      var amt = Number(dv.amount);
      out.push({
        dateStr: ds, ts: dv.ts, sym: sym, type: "dividend",
        title: sym + " — Ex-dividend",
        perShare: isFinite(amt) ? amt : null,
        expected: (qty != null && isFinite(amt)) ? amt * qty : null,
        qty: qty != null ? qty : null
      });
    });
    (ca.splits || []).forEach(function (sp) {
      if (!sp || !isFinite(sp.ts)) return;
      var ds = M.dateStrFromTs(sp.ts); if (!ds) return;
      out.push({
        dateStr: ds, ts: sp.ts, sym: sym, type: "split",
        title: sym + " — Split / bonus",
        ratio: sp.text ? String(sp.text) : null,
        perShare: null, expected: null, qty: null
      });
    });
    return out;
  };
  M.holidayEvents = function (map) {
    var out = [];
    if (!map || typeof map !== "object") return out;
    Object.keys(map).forEach(function (ds) {
      var ts = Date.parse(ds + "T00:00:00");
      out.push({ dateStr: ds, ts: isFinite(ts) ? ts : 0, sym: "", type: "holiday", title: String(map[ds] || "Market holiday"), perShare: null, expected: null, qty: null });
    });
    return out;
  };
  M.sortEvents = function (events) {
    var rank = { holiday: 0, dividend: 1, split: 2 };
    return events.slice().sort(function (a, b) {
      if (a.ts !== b.ts) return a.ts - b.ts;
      var r = (rank[a.type] != null ? rank[a.type] : 9) - (rank[b.type] != null ? rank[b.type] : 9);
      if (r) return r;
      return String(a.sym).localeCompare(String(b.sym));
    });
  };
  M.groupByDay = function (events) {
    var map = {};
    (events || []).forEach(function (e) { if (e && e.dateStr) (map[e.dateStr] = map[e.dateStr] || []).push(e); });
    Object.keys(map).forEach(function (k) { map[k] = M.sortEvents(map[k]); });
    return map;
  };
  M.buildIcs = function (events, dtstamp) {
    var dt = function (ds) { return String(ds).replace(/-/g, ""); };
    var clean = function (s) { return String(s == null ? "" : s).replace(/[\r\n,;]/g, " "); };
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Folio//Calendar//EN"];
    M.sortEvents(events || []).forEach(function (e, i) {
      var summary = e.type === "holiday" ? ("NSE holiday — " + e.title)
        : (e.title + (e.type === "dividend" && e.perShare != null ? " · ₹" + e.perShare + "/share" : "") + (e.type === "split" && e.ratio ? " · " + e.ratio : ""));
      lines.push(["BEGIN:VEVENT",
        "UID:folio-cal-" + e.dateStr + "-" + (e.sym || "NSE") + "-" + e.type + "-" + i + "@singhcaizen",
        "DTSTAMP:" + dtstamp,
        "DTSTART;VALUE=DATE:" + dt(e.dateStr),
        "SUMMARY:" + clean(summary),
        "END:VEVENT"].join("\r\n"));
    });
    return lines.join("\r\n") + "\r\nEND:VCALENDAR";
  };
  window.FolioCalendarMath = M;

  /* ================= data ================= */
  function myUniverse() {
    var held = {}, order = [];
    try {
      var ch = (typeof computeHoldings === "function") ? computeHoldings() : null;
      ((ch && ch.holdings) || []).forEach(function (h) { if (h && h.sym && held[h.sym] == null) { held[h.sym] = Number(h.qty) || 0; order.push(h.sym); } });
    } catch (e) {}
    try {
      var w = (typeof state !== "undefined" && state && state.watch) || [];
      w.forEach(function (x) { if (x && x.sym && held[x.sym] == null) { held[x.sym] = null; order.push(x.sym); } });
    } catch (e) {}
    return { qty: held, syms: order };
  }
  async function collectEvents() {
    var uni = myUniverse();
    var holidays = {}, holidaysOk = false;
    try {
      if (typeof window.folioNseHolidays === "function") { holidays = (await window.folioNseHolidays()) || {}; holidaysOk = Object.keys(holidays).length > 0; }
    } catch (e) { holidays = {}; }
    var events = M.holidayEvents(holidays);
    var withEvents = 0;
    await Promise.all(uni.syms.map(async function (sym) {
      try {
        if (typeof fetchCorpActions !== "function") return;
        var ca = await fetchCorpActions(sym);
        var evs = M.eventsFromCorpActions(sym, ca, uni.qty[sym]);
        if (evs.length) withEvents++;
        events = events.concat(evs);
      } catch (e) { /* one stock's feed failing never takes the calendar down */ }
    }));
    return { events: M.sortEvents(events), total: uni.syms.length, withEvents: withEvents, holidaysOk: holidaysOk };
  }

  /* ================= sheet ================= */
  var sheetEl = null, loadToken = 0;
  var cur = null;            /* {year, month} being viewed */
  var selDate = null;        /* selected YYYY-MM-DD */
  var data = null;           /* last collectEvents() result */
  var loading = false;

  function visibleEvents() {
    if (!data) return [];
    var s = calSettings();
    return data.events.filter(function (e) {
      if (e.type === "holiday") return s.showHolidays;
      return s.showDivs;
    });
  }
  function monthLabel(y, m) { return new Date(y, m, 1).toLocaleString("en-IN", { month: "long", year: "numeric" }); }

  function buildSheet() {
    var m = document.createElement("div");
    m.id = "calendarSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Calendar");
    var s = calSettings();
    m.innerHTML = '<div class="modal-card cal-card">' +
      '<div class="cal-head"><h3>Calendar</h3>' +
      '<button type="button" class="icon-btn" id="calInfo" aria-label="What is this?">i</button>' +
      '<button type="button" class="icon-btn" id="calClose" aria-label="Close">✕</button></div>' +
      '<div class="cal-toggles" role="group" aria-label="Calendar layers">' +
      '<label class="cal-toggle"><input type="checkbox" id="calTogHol"' + (s.showHolidays ? " checked" : "") + '> Market holidays</label>' +
      '<label class="cal-toggle"><input type="checkbox" id="calTogDiv"' + (s.showDivs ? " checked" : "") + '> Dividends &amp; splits</label>' +
      "</div>" +
      '<div class="cal-nav"><button type="button" class="icon-btn" id="calPrev" aria-label="Previous month">‹</button>' +
      '<span class="cal-month" id="calMonthLab"></span>' +
      '<button type="button" class="mini-btn" id="calToday">Today</button>' +
      '<button type="button" class="icon-btn" id="calNext" aria-label="Next month">›</button></div>' +
      '<div id="calGridWrap"><div class="skel cal-skel"></div><div class="skel cal-skel"></div><div class="skel cal-skel"></div></div>' +
      '<div id="calDayList"></div>' +
      '<div class="cal-foot"><p class="price-meta" id="calLoadNote">Loading events…</p>' +
      '<p class="price-meta">Company results dates are not available in free data, so they are not shown here. Ex-dividend and split dates come from the free exchange feed Folio already uses; a company can change an announced date.</p>' +
      '<button type="button" class="mini-btn" id="calIcs">Export .ics</button></div>' +
      "</div>";
    document.body.appendChild(m);
    wire(m);
    return m;
  }

  function render() {
    if (!sheetEl || !cur) return;
    var lab = sheetEl.querySelector("#calMonthLab");
    if (lab) lab.textContent = monthLabel(cur.year, cur.month);
    var wrap = sheetEl.querySelector("#calGridWrap");
    var listEl = sheetEl.querySelector("#calDayList");
    if (loading || !data) {
      if (wrap) wrap.innerHTML = '<div class="skel cal-skel"></div><div class="skel cal-skel"></div><div class="skel cal-skel"></div>';
      if (listEl) listEl.innerHTML = "";
      return;
    }
    var evs = visibleEvents();
    var byDay = M.groupByDay(evs);
    var grid = M.monthGrid(cur.year, cur.month);
    var todayStr = M.dateStrFromTs(Date.now());
    var html = '<div class="cal-dow">' + ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(function (d) { return "<span>" + d + "</span>"; }).join("") + '</div><div class="cal-grid">';
    grid.cells.forEach(function (c) {
      var dayEvs = byDay[c.dateStr] || [];
      var dots = "";
      var seen = {};
      dayEvs.forEach(function (e) { if (!seen[e.type]) { seen[e.type] = 1; dots += '<i class="cal-dot ' + e.type + '"></i>'; } });
      html += '<button type="button" class="cal-day' + (c.inMonth ? "" : " out") + (c.dateStr === todayStr ? " today" : "") + (c.dateStr === selDate ? " sel" : "") + '" data-cal-day="' + c.dateStr + '" aria-label="' + c.dateStr + (dayEvs.length ? " — " + dayEvs.length + " event" + (dayEvs.length > 1 ? "s" : "") : "") + '">' +
        '<span class="cal-dnum">' + c.day + '</span><span class="cal-dots">' + dots + "</span></button>";
    });
    html += "</div>";
    var monthHas = evs.some(function (e) { var d = new Date(e.ts); return d.getFullYear() === cur.year && d.getMonth() === cur.month; });
    if (!monthHas) html += '<p class="empty-note cal-none">No events found in ' + escT(monthLabel(cur.year, cur.month)) + " from the free data.</p>";
    if (wrap) wrap.innerHTML = html;
    var note = sheetEl.querySelector("#calLoadNote");
    if (note) note.textContent = "Events found for " + data.withEvents + " of " + data.total + " stocks checked (your holdings + watchlist)" + (data.holidaysOk ? "" : " · market-holiday list could not be loaded this time") + ".";
    renderDayList(byDay);
  }
  function renderDayList(byDay) {
    var listEl = sheetEl && sheetEl.querySelector("#calDayList");
    if (!listEl) return;
    if (!selDate) { listEl.innerHTML = ""; return; }
    var evs = (byDay || M.groupByDay(visibleEvents()))[selDate] || [];
    var head = '<h4 class="cal-day-title">' + escT(new Date(selDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })) + "</h4>";
    if (!evs.length) { listEl.innerHTML = head + '<p class="empty-note">Nothing on this day.</p>'; return; }
    listEl.innerHTML = head + evs.map(function (e) {
      if (e.type === "holiday") return '<div class="event-row"><span class="news-chip">NSE</span><span class="event-text"><b>Market holiday</b> — ' + escT(e.title) + "</span></div>";
      if (e.type === "dividend") {
        var t = "<b>Ex-dividend</b>" + (e.perShare != null ? " · " + fmtInr2(e.perShare) + "/share" : "");
        if (e.expected != null && e.qty) t += ' · ≈ <span class="ds-amt">' + fmtInr(e.expected) + "</span> on your current " + e.qty + " shares";
        return '<div class="event-row"><span class="news-chip">' + escT(e.sym) + '</span><span class="event-text">' + t + "</span></div>";
      }
      return '<div class="event-row"><span class="news-chip">' + escT(e.sym) + '</span><span class="event-text"><b>Stock split / bonus</b>' + (e.ratio ? " · " + escT(e.ratio) : "") + "</span></div>";
    }).join("");
  }

  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#calClose")) { m.classList.add("hidden"); return; }
      if (t.closest("#calInfo")) {
        try { toast("Calendar: NSE market holidays, plus ex-dividend and split dates for stocks you hold or watch, from the free exchange feed. Expected dividends use your current share count. Information only."); } catch (err) {}
        return;
      }
      if (t.closest("#calPrev")) { cur = M.addMonths(cur.year, cur.month, -1); render(); return; }
      if (t.closest("#calNext")) { cur = M.addMonths(cur.year, cur.month, 1); render(); return; }
      if (t.closest("#calToday")) { var n = new Date(); cur = { year: n.getFullYear(), month: n.getMonth() }; selDate = M.dateStrFromTs(Date.now()); render(); return; }
      var day = t.closest("[data-cal-day]");
      if (day) { selDate = day.dataset.calDay; var d = new Date(selDate + "T00:00:00"); if (d.getFullYear() !== cur.year || d.getMonth() !== cur.month) cur = { year: d.getFullYear(), month: d.getMonth() }; render(); return; }
      if (t.closest("#calIcs")) {
        var evs = visibleEvents();
        if (!evs.length) { try { toast("No events to export yet"); } catch (err) {} return; }
        var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "Z");
        var ics = M.buildIcs(evs, stamp);
        try {
          if (typeof folioDownload === "function") folioDownload("folio-calendar.ics", ics, "text/calendar");
          else throw new Error("no downloader");
          toast("Calendar file downloaded — open it to add the events");
        } catch (err) {
          try {
            var blob = new Blob([ics], { type: "text/calendar" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = "folio-calendar.ics";
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            toast("Calendar file downloaded — open it to add the events");
          } catch (err2) { toast("Export failed on this browser."); }
        }
        return;
      }
    });
    m.addEventListener("change", function (e) {
      var t = e.target;
      if (!t.dataset) return;
      var s = calSettings();
      if (t.id === "calTogHol") { s.showHolidays = !!t.checked; calSave(); render(); }
      if (t.id === "calTogDiv") { s.showDivs = !!t.checked; calSave(); render(); }
    });
  }

  function openCal(opts) {
    opts = opts || {};
    if (!sheetEl) sheetEl = buildSheet();
    if (!cur) { var n = new Date(); cur = { year: n.getFullYear(), month: n.getMonth() }; selDate = M.dateStrFromTs(Date.now()); }
    if (opts.date) { var d = new Date(opts.date + "T00:00:00"); if (isFinite(d.getTime())) { cur = { year: d.getFullYear(), month: d.getMonth() }; selDate = opts.date; } }
    var s = calSettings();
    var th = sheetEl.querySelector("#calTogHol"); if (th) th.checked = !!s.showHolidays;
    var td = sheetEl.querySelector("#calTogDiv"); if (td) td.checked = !!s.showDivs;
    sheetEl.classList.remove("hidden");
    var tok = ++loadToken;
    loading = true; render();
    collectEvents().then(function (res) {
      if (tok !== loadToken) return;
      data = res; loading = false; render();
    }).catch(function () {
      if (tok !== loadToken) return;
      data = { events: [], total: 0, withEvents: 0, holidaysOk: false }; loading = false; render();
      var note = sheetEl.querySelector("#calLoadNote");
      if (note) note.textContent = "Events could not be loaded this time — close and reopen the calendar to retry.";
    });
  }

  window.FolioCalendar = { open: openCal };
})();
