/* ================= FOLIO LEARN (Phase 6J) =================
   Lazy module — loaded on first open via window.folioOpenLearn()
   in features.js (same contract as tools.js / ptools.js /
   markethub.js / mutualfunds.js / calendar.js). NOT in SW CORE.
   Nothing runs at app startup, and the module makes NO network
   calls — every entry below is static, on-device text.

   WHAT IT IS: a searchable, plain-English glossary of the words
   Folio itself uses, extending the existing "Know Your Numbers"
   glossary (#helpModal, GLOSSARY in features.js — untouched).
   One voice, no conflicting definitions:
   - Terms Know Your Numbers already covers carry a "See also:
     Know Your Numbers" line and a button at the top of the sheet
     opens that glossary; the short meanings here are condensed
     from the same texts.
   - Terms the Insights "i" explainers define (INSX_INFO in
     features.js) mirror those explainers' own wording.
   - Every entry is information only. Nothing here is advice,
     and no entry tells the reader what to buy, sell or hold. */
(function () {
  "use strict";

  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  /* ================= CONTENT (pure data — harness-tested) =================
     Each entry: term (the word as Folio prints it), meaning (one
     or two plain sentences), where (where the reader sees it in
     Folio), kyn = true when Know Your Numbers covers the same
     term (the entry then points there instead of competing). */
  var ENTRIES = [
    { term: "XIRR", meaning: "Your true yearly rate of return. It respects the dates of every buy and sell — money invested earlier counts for more than money invested yesterday.", where: "Home stat card, and each stock's row in Insights → Holdings Scorecard.", kyn: true },
    { term: "CAGR", meaning: "The steady yearly growth rate that would take a starting value to an ending value over the years between them — it smooths the ups and downs into one per-year number.", where: "Insights → Holdings Scorecard, and scheme returns in More → Mutual Funds (1 year and longer).", kyn: false },
    { term: "Invested, Current Value & P&L", meaning: "Invested is the total cost of the shares you still hold. Current Value is what those shares are worth at the latest price. The difference is your unrealised profit or loss — it becomes real (realised) only when you sell.", where: "Home stat cards and every holding card.", kyn: true },
    { term: "Volatility", meaning: "How much your portfolio's value swings up and down in a year, in percent. Higher means bigger swings.", where: "Insights → Risk Metrics and the Risk — Advanced panel.", kyn: false },
    { term: "Drawdown", meaning: "The biggest fall from a peak to the low that followed it, in your portfolio's value history. It shows the worst ride you would have sat through.", where: "Insights → Risk Metrics and Underwater — Drawdown.", kyn: false },
    { term: "Sharpe Ratio", meaning: "Return earned per unit of total swing risk, after subtracting the risk-free rate. Above 1 is generally considered good; below 0 means the swings were not rewarded.", where: "Insights → Risk Metrics and Risk — Advanced.", kyn: false },
    { term: "Sortino Ratio", meaning: "Like Sharpe, but only harmful (downward) swings count as risk — upside jumps are ignored, because falling prices are what hurt.", where: "Insights → Risk — Advanced.", kyn: false },
    { term: "Beta", meaning: "How strongly your portfolio moves with NIFTY 50. Beta 1.0 moves with the market, 1.2 moves about 20% more, 0.8 moves about 20% less.", where: "Insights → Risk Metrics, Risk — Advanced and the Stock Deep-Dive table.", kyn: false },
    { term: "Alpha", meaning: "How much your return beat (or trailed) the benchmark's return over the same period — what your stock picking added or cost versus simply holding the index.", where: "Insights → Period Performance and Same Money in NIFTY; a stock page's alpha chip compares one stock with NIFTY.", kyn: false },
    { term: "Value at Risk (VaR)", meaning: "On a bad day — roughly the worst 1 day in 20 — your portfolio could fall by about this much, based on its recent daily swings. It is an estimate, not a promise.", where: "Insights → Risk — Advanced (1-day, 95%).", kyn: false },
    { term: "Correlation", meaning: "How similarly two stocks move day to day, from −1 (opposite) to +1 (identical). If most of your stocks move together, a market fall hits everything at once.", where: "Insights → Correlation Matrix.", kyn: false },
    { term: "Concentration", meaning: "How much of your money sits in your biggest stocks and sectors. The effective number of stocks turns your weights into one number — 10 equal stocks give 10; one giant stock pulls it towards 1.", where: "Insights → Concentration and Allocation & Concentration.", kyn: false },
    { term: "Return Contribution", meaning: "The profit or loss each stock has added in total — sale proceeds, plus what the remaining shares are worth today, plus dividends, minus everything you paid (charges included).", where: "Insights → Return Contribution.", kyn: false },
    { term: "Realised vs Unrealised P&L", meaning: "Realised profit is locked in by sales (FIFO, charges included). Unrealised is the paper profit or loss on shares you still hold, at today's prices.", where: "Insights → Realized vs Unrealized P&L, and the Trade Journal in History.", kyn: false },
    { term: "STCG & LTCG", meaning: "Shares sold within 12 months of buying give Short-Term Capital Gains (STCG), taxed at 20%. Held longer, gains are Long-Term (LTCG), taxed at 12.5% — and the first ₹1,25,000 of LTCG in a financial year is tax-free. Estimates only — not tax advice.", where: "Home → Tax panel and the Capital Gains Statement.", kyn: true },
    { term: "Large / Mid / Small Cap", meaning: "Company size classes from the NSE index lists. Large Cap = the NIFTY 100, India's biggest companies — usually steadier. Mid Cap = the next 150. Small Cap = the next 250 and beyond — often faster-moving, both up and down.", where: "Home → Allocation (By Market Cap) and Market Cap Classification in Insights.", kyn: true },
    { term: "Ex-Dividend Date", meaning: "The first day a stock trades without the right to its announced dividend. Buy before the ex-dividend date and the dividend comes to you; buy on or after it and it goes to the seller.", where: "Home → Corporate Actions and Upcoming Events, and More → Calendar.", kyn: false },
    { term: "Split & Bonus", meaning: "A split divides each share into more shares (for example, 1 share becomes 5) — the total value of your holding is unchanged at that moment; only the share count and the per-share price change. A bonus gives extra shares in a ratio (for example 1:1 doubles your count).", where: "Home → Corporate Actions, each stock's page, and More → Calendar.", kyn: false },
    { term: "Dividend Yield on Cost", meaning: "Dividends received divided by what you paid for the shares — the income return on your own buying price, not on today's price.", where: "Insights → Holdings Scorecard and the Income panel.", kyn: false },
    { term: "NAV (Net Asset Value)", meaning: "A mutual fund scheme's value per unit: everything the scheme owns, after its costs, divided by its units. It is published once a day after markets close.", where: "More → Mutual Funds — scheme pages, returns and past SIP outcomes.", kyn: false },
    { term: "SIP", meaning: "A fixed amount invested into a mutual fund scheme on a regular schedule (usually monthly). Each instalment buys units at that day's NAV, so more units are bought when prices are lower.", where: "More → Mutual Funds (past SIP outcome) and Calculators & Tools (SIP calculator).", kyn: false },
    { term: "P/E Ratio", meaning: "Price divided by earnings per share — how much investors pay for each rupee of a company's yearly profit. Folio does not show P/E: it is not available in free data (the free feed Folio uses does not publish it reliably), so the number is left out rather than guessed.", where: "Named on stock pages and in Insights notes as not available in free data.", kyn: false }
  ];

  /* Pure search: case-insensitive substring over term + meaning +
     where. Empty query returns every entry, in listed order. */
  function filterEntries(q) {
    var needle = String(q == null ? "" : q).trim().toLowerCase();
    if (!needle) return ENTRIES.slice();
    return ENTRIES.filter(function (e) {
      return (e.term + " " + e.meaning + " " + e.where).toLowerCase().indexOf(needle) >= 0;
    });
  }

  /* ================= SHEET (v89-adopted, Phase 5 pattern) ================= */
  var sheetEl = null;

  function entryHtml(e) {
    return '<div class="learn-term"><h4>' + escT(e.term) + "</h4><p>" + escT(e.meaning) + "</p>" +
      '<p class="learn-where">Where in Folio: ' + escT(e.where) + "</p>" +
      (e.kyn ? '<p class="learn-kyn">See also: Insights → Know Your Numbers (footer and More → Help open the full glossary).</p>' : "") +
      "</div>";
  }

  function renderList() {
    if (!sheetEl) return;
    var inp = sheetEl.querySelector("#learnSearch");
    var list = sheetEl.querySelector("#learnList");
    if (!list) return;
    var found = filterEntries(inp ? inp.value : "");
    list.innerHTML = found.length
      ? found.map(entryHtml).join("")
      : '<p class="empty-note">No term matches that search. Try a shorter word — for example “risk”, “dividend” or “return”.</p>';
  }

  function buildSheet() {
    var m = document.createElement("div");
    m.id = "learnSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Learn");
    m.innerHTML = '<div class="modal-card learn-card">' +
      '<div class="learn-head"><h3>Learn</h3>' +
      '<button type="button" class="icon-btn" id="learnInfo" aria-label="About Learn">i</button>' +
      '<button type="button" class="icon-btn" id="learnClose" aria-label="Close">✕</button></div>' +
      '<p class="learn-intro">Plain-English meanings of the words Folio uses, and where each one appears in the app. Information only — nothing here is advice.</p>' +
      '<button type="button" class="mini-btn" id="learnKyn">Open Know Your Numbers — the full glossary</button>' +
      '<input type="search" id="learnSearch" class="learn-search" placeholder="Search a term — try “beta” or “dividend”…" aria-label="Search the glossary">' +
      '<div id="learnList" class="learn-list"></div>' +
      "</div>";
    document.body.appendChild(m);
    m.querySelector("#learnClose").addEventListener("click", function () { m.classList.add("hidden"); });
    m.querySelector("#learnInfo").addEventListener("click", function () {
      try { if (typeof toast === "function") toast("Learn explains Folio's own words in plain English. For the longer glossary, open Know Your Numbers."); } catch (e) {}
    });
    m.querySelector("#learnKyn").addEventListener("click", function () {
      m.classList.add("hidden");
      try { if (typeof openHelp === "function") openHelp("all"); } catch (e) {}
    });
    var inp = m.querySelector("#learnSearch");
    if (inp) inp.addEventListener("input", renderList);
    return m;
  }

  function openLearn(opts) {
    opts = opts || {};
    if (!sheetEl) sheetEl = buildSheet();
    var inp = sheetEl.querySelector("#learnSearch");
    if (inp) inp.value = opts.term ? String(opts.term) : "";
    renderList();
    sheetEl.classList.remove("hidden");
    if (opts.term && inp) { try { inp.focus(); } catch (e) {} }
  }

  window.FolioLearn = { open: openLearn, ENTRIES: ENTRIES, filterEntries: filterEntries };
})();
