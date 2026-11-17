/* ================= FOLIO SMART MONEY — PART 1 (data layer + main screens) =================
   Lazy module — loaded on first open via window.folioOpenSmartMoney() in
   features.js (same contract as tools.js / ptools.js / share.js).
   NOT in SW CORE. NOTHING in this module runs at app startup.

   DATA: static public files published by the Smart Money pipeline to the
   repo's `data` branch (see redesign-v2/SMARTMONEY-FEASIBILITY.md for the
   tested source verdicts and the file contract). The manifest.json is the
   single source of truth: every dataset carries a status
   (ok | partial | stale | unavailable) + asOf + source, and every block in
   this module renders straight from that status — a dataset whose source
   is walled (shareholding, bulk/block deals, insider trades, daily
   FII/DII) shows an honest "Data not available yet" state, with the full
   renderer written against the reserved contract schema so it lights up
   unchanged if the data ever arrives.

   PRIVACY: the only network fetches are those static files, and per-stock
   files are fetched ONLY for symbols the user holds, watches or opens.
   Every intersection with the user's portfolio (feed, overlap, matrix,
   alerts) is computed on-device from enriched(). Follow choices and
   alert settings live in state.profile.smartmoney (insX pattern — they
   ride the existing cloud doc / .folio vault). Nothing about the user's
   holdings ever leaves the device.

   HONESTY: bought/sold is always worded as INFERRED from the change
   between two monthly disclosures, with a "check corporate action" note
   where a split/bonus could explain a share-count jump. No advice
   wording anywhere; "Not investment advice" sits on the home + entity
   screens. */
(function () {
  "use strict";

  /* >>> THE data base — static pipeline files (data branch) <<< */
  var SM_BASE = "https://raw.githubusercontent.com/SinghCaizen/SinghCaizen/data/portfolio/data/smartmoney/";

  /* ---------- formatting: ride the app's helpers when present ---------- */
  function escT(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/[&<>\"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
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
    return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 1 : digits) + "%";
  }
  function fmtInt(n) { return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "—"; }
  function fmtShares(n) {
    if (!Number.isFinite(n)) return "—";
    var a = Math.abs(n);
    if (a >= 1e7) return (n / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr";
    if (a >= 1e5) return (n / 1e5).toFixed(2).replace(/\.?0+$/, "") + " L";
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(Math.round(n));
  }
  function fmtCr(n) { /* flows are published in ₹ crore */
    if (!Number.isFinite(n)) return "—";
    return (n < 0 ? "−₹" : "₹") + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) + " Cr";
  }
  function monthLabel(iso) {
    if (!iso) return "—";
    var m = String(iso).match(/^(\d{4})-(\d{2})/);
    if (!m) return String(iso);
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[parseInt(m[2], 10) - 1] + " " + m[1];
  }
  function dateLabel(iso) {
    if (!iso) return "—";
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso);
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return parseInt(m[3], 10) + " " + names[parseInt(m[2], 10) - 1] + " " + m[1];
  }
  function num(v) { var n = (typeof v === "number") ? v : parseFloat(v); return Number.isFinite(n) ? n : null; }
  function initials(name) {
    var w = String(name || "?").replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
    if (!w.length) return "?";
    return (w[0][0] + (w.length > 1 ? w[1][0] : "")).toUpperCase();
  }

  /* ---------- persistence (insX pattern: state.profile.smartmoney) ---------- */
  function smSettings() {
    try {
      var p = state.profile || (state.profile = {});
      if (!p.smartmoney || typeof p.smartmoney !== "object") p.smartmoney = {};
      var s = p.smartmoney;
      if (!Array.isArray(s.follows)) s.follows = [];
      if (!s.alerts || typeof s.alerts !== "object") s.alerts = {};
      var a = s.alerts;
      if (typeof a.mfChange !== "boolean") a.mfChange = false;
      if (!Number.isFinite(a.thresholdPct) || a.thresholdPct <= 0) a.thresholdPct = 5;
      if (typeof a.followMoves !== "boolean") a.followMoves = false;
      if (typeof a.deals !== "boolean") a.deals = false;
      if (typeof a.notify !== "boolean") a.notify = false;
      if (typeof s.chartOverlay !== "boolean") s.chartOverlay = false; /* Part 2: stock-chart "Institutional activity" toggle */
      return s;
    } catch (e) {
      return { follows: [], alerts: { mfChange: false, thresholdPct: 5, followMoves: false, deals: false, notify: false }, chartOverlay: false };
    }
  }
  function smSave() { try { persist(); } catch (e) {} }
  function isFollowed(houseId) { return smSettings().follows.indexOf(houseId) >= 0; }
  function setFollow(houseId, on) {
    var s = smSettings();
    var i = s.follows.indexOf(houseId);
    if (on && i < 0) s.follows.push(houseId);
    if (!on && i >= 0) s.follows.splice(i, 1);
    smSave();
  }

  /* ================= PURE LOGIC (window.FolioSmartMoneyMath — harness-tested) =================
     Everything in M is data-in / data-out: no DOM, no fetch, no app state.
     Normalisers are deliberately tolerant of key aliases so small pipeline
     emission differences do not break rendering; the feasibility
     contract's field names are the primary ones. */
  var M = {};

  M.DAILY_KEYS = { nav: 1, deals: 1, flowsDaily: 1 };
  M.DATASET_LABELS = {
    mfHoldings: "Mutual fund holdings (monthly)",
    nav: "Mutual fund NAV",
    fiiMonthly: "FII flows — monthly (NSDL)",
    shareholding: "Shareholding pattern",
    deals: "Bulk & block deals",
    insider: "Insider / promoter trades",
    flowsDaily: "Daily FII / DII flows"
  };

  M.classifyChange = function (shares, prevShares) {
    var s = num(shares), p = num(prevShares);
    if (s == null && p == null) return "unknown";
    if (s == null) s = 0;
    if (p == null) return s > 0 ? "new" : "unknown";
    if (p === 0 && s > 0) return "new";
    if (s === 0 && p > 0) return "exited";
    if (s > p) return "increased";
    if (s < p) return "reduced";
    if (s === p && s > 0) return "unchanged";
    return "unknown";
  };

  M.normManifest = function (raw) {
    var out = { version: null, generatedAt: null, datasets: {} };
    if (!raw || typeof raw !== "object") return out;
    out.version = (raw.version != null) ? raw.version : null;
    out.generatedAt = raw.generatedAt || raw.generated_at || null;
    var ds = raw.datasets || {};
    Object.keys(ds).forEach(function (k) {
      var d = ds[k] || {};
      out.datasets[k] = {
        status: String(d.status || "unavailable"),
        asOf: d.asOf || d.as_of || null,
        source: d.source || "",
        coverage: d.coverage || null,
        note: d.note || null
      };
    });
    return out;
  };

  /* The gate every block renders from. ok = data may be shown (status ok,
     partial or stale — stale still shows, with its notice). staleDaily =
     the brief's >3-day rule applied to daily-cadence datasets. */
  M.gate = function (manifest, key) {
    var none = { key: key, status: "unavailable", ok: false, asOf: null, source: "", coverage: null, note: null, staleDaily: false, published: false };
    if (!manifest || !manifest.datasets) return none;
    var d = manifest.datasets[key];
    if (!d) return none;
    var g = {
      key: key, status: d.status, ok: (d.status === "ok" || d.status === "partial" || d.status === "stale"),
      asOf: d.asOf, source: d.source, coverage: d.coverage, note: d.note,
      staleDaily: d.status === "stale", published: true
    };
    if (M.DAILY_KEYS[key] && d.asOf && (d.status === "ok" || d.status === "partial")) {
      var t = Date.parse(d.asOf + "T00:00:00Z");
      if (Number.isFinite(t) && (Date.now() - t) > 3 * 86400000) g.staleDaily = true;
    }
    return g;
  };

  function normSchemeRow(r) {
    if (!r || typeof r !== "object") return null;
    var shares = num(r.shares != null ? r.shares : r.qty);
    var prev = num(r.prevShares != null ? r.prevShares : (r.prev_shares != null ? r.prev_shares : r.prevQty));
    var change = r.change || r.changeClass || r.cls || null;
    if (!change || change === "unchanged") {
      var c = M.classifyChange(shares, prev);
      if (c !== "unknown") change = c;
    }
    return {
      scheme: String(r.scheme || r.schemeName || r.name || "Scheme"),
      house: String(r.house || r.houseId || ""),
      houseName: String(r.houseName || r.house_name || r.house || ""),
      shares: shares, prevShares: prev,
      change: change || "unknown",
      pctOfScheme: num(r.pctOfScheme != null ? r.pctOfScheme : (r.pct != null ? r.pct : r.pctOfNav)),
      valueLakh: num(r.marketValueLakh != null ? r.marketValueLakh : r.valueLakh),
      corpAction: !!(r.corpAction || r.corporateAction)
    };
  }

  M.normStockFile = function (raw, sym) {
    var out = { asOf: null, source: "", symbol: sym || (raw && raw.symbol) || "", name: (raw && raw.name) || "", schemes: [], history: null, mfPct: null };
    if (!raw || typeof raw !== "object") return out;
    out.asOf = raw.asOf || raw.as_of || null;
    out.source = raw.source || "";
    if (raw.name) out.name = String(raw.name);
    var rows = raw.schemes || raw.holders || raw.rows || [];
    if (Array.isArray(rows)) rows.forEach(function (r) { var n = normSchemeRow(r); if (n) out.schemes.push(n); });
    var hist = raw.history || raw.trend || null;
    if (Array.isArray(hist) && hist.length) {
      out.history = hist.map(function (h) {
        return {
          month: h.month || h.asOf || "",
          schemeCount: num(h.schemeCount != null ? h.schemeCount : (h.schemes != null ? h.schemes : h.count)),
          totalShares: num(h.totalShares != null ? h.totalShares : h.shares)
        };
      }).filter(function (h) { return h.month || h.schemeCount != null; });
    }
    out.mfPct = num(raw.mfPct != null ? raw.mfPct : (raw.mfHoldingPct != null ? raw.mfHoldingPct : raw.totalPct));
    return out;
  };

  M.stockTotals = function (file) {
    var t = { schemesNow: 0, schemesPrev: 0, housesNow: {}, sharesNow: 0, sharesPrev: 0, counts: { "new": 0, increased: 0, reduced: 0, exited: 0, unchanged: 0 } };
    if (!file || !file.schemes) return t;
    file.schemes.forEach(function (s) {
      var cur = (s.shares || 0) > 0;
      if (cur) { t.schemesNow++; t.sharesNow += s.shares; if (s.house) t.housesNow[s.house] = 1; }
      if ((s.prevShares || 0) > 0) { t.schemesPrev++; t.sharesPrev += s.prevShares; }
      if (t.counts[s.change] != null) t.counts[s.change]++;
    });
    t.housesNow = Object.keys(t.housesNow).length;
    return t;
  };

  /* Part 2: one-word direction of a stock's total MF position, from
     stockTotals() — used by the PDF summary table and share cards. */
  M.stockDirection = function (t) {
    if (!t) return "—";
    if (t.schemesPrev === 0 && t.schemesNow > 0) return "New entry";
    if (t.schemesNow === 0 && t.schemesPrev > 0) return "Exited";
    if (t.sharesPrev > 0) {
      var p = (t.sharesNow - t.sharesPrev) / t.sharesPrev * 100;
      if (p >= 0.5) return "Increased";
      if (p <= -0.5) return "Reduced";
      return "Little change";
    }
    return "—";
  };

  /* Part 2 (chart overlay): derive markers from a stock file's monthly
     history + optional deal rows, snapped onto real trading days.
     barDays = ascending ["YYYY-MM-DD"] strings of the chart's bars.
     A month counts as MATERIAL when total MF shares moved >= 2% month
     over month (entries/exits always count); when share counts are
     missing for both months, any scheme-count change counts. Returns
     [{time, kind: "mf"|"deal", cls}] sorted by time — features.js maps
     these onto the chart library's marker shapes/colours. */
  M.overlayMarkers = function (history, deals, barDays) {
    var out = [];
    if (!Array.isArray(barDays) || !barDays.length) return out;
    function lastOnOrBefore(day) {
      var hit = null;
      for (var i = 0; i < barDays.length; i++) { if (barDays[i] <= day) hit = barDays[i]; else break; }
      return hit;
    }
    function snapMonth(month) {
      if (!/^\d{4}-\d{2}$/.test(month || "")) return null;
      var inMonth = null;
      for (var i = 0; i < barDays.length; i++) if (barDays[i].slice(0, 7) === month) inMonth = barDays[i];
      if (inMonth) return inMonth;
      return lastOnOrBefore(month + "-31"); /* sparse bars (weekly/monthly ranges): nearest earlier bar */
    }
    function snapDay(day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return null;
      var hit = lastOnOrBefore(day);
      if (hit) return hit;
      return barDays.length && barDays[0] >= day ? barDays[0] : null;
    }
    if (Array.isArray(history)) {
      for (var i = 1; i < history.length; i++) {
        var prev = history[i - 1], cur = history[i], cls = null;
        if (!cur || !cur.month) continue;
        var ps = prev ? prev.totalShares : null, cs = cur.totalShares;
        if (ps != null && cs != null) {
          if (ps === 0 && cs > 0) cls = "new";
          else if (cs === 0 && ps > 0) cls = "exited";
          else if (ps > 0) {
            var pct = (cs - ps) / ps * 100;
            if (pct >= 2) cls = "increased";
            else if (pct <= -2) cls = "reduced";
          }
        } else {
          var pc = prev ? prev.schemeCount : null, cc = cur.schemeCount;
          if (pc != null && cc != null) {
            if (pc === 0 && cc > 0) cls = "new";
            else if (cc === 0 && pc > 0) cls = "exited";
            else if (cc > pc) cls = "increased";
            else if (cc < pc) cls = "reduced";
          }
        }
        if (!cls) continue;
        var day = snapMonth(cur.month);
        if (day) out.push({ time: day, kind: "mf", cls: cls });
      }
    }
    if (Array.isArray(deals)) {
      deals.forEach(function (d) {
        if (!d || !d.date) return;
        var day2 = snapDay(d.date);
        if (!day2) return;
        out.push({ time: day2, kind: "deal", cls: String(d.side || "").toUpperCase() === "SELL" ? "sell" : "buy" });
      });
    }
    out.sort(function (a, b) { return a.time < b.time ? -1 : (a.time > b.time ? 1 : 0); });
    return out;
  };

  M.normHouses = function (raw) {
    var list = [];
    if (!raw) return list;
    var src = raw.houses || raw;
    var push = function (h, idHint) {
      if (!h || typeof h !== "object") return;
      var id = String(h.id || h.houseId || idHint || "");
      if (!id) return;
      list.push({
        id: id,
        name: String(h.name || h.houseName || id),
        aliases: Array.isArray(h.aliases) ? h.aliases.map(String) : [],
        schemeCount: num(h.schemeCount != null ? h.schemeCount : h.schemes)
      });
    };
    if (Array.isArray(src)) src.forEach(function (h) { push(h); });
    else if (typeof src === "object") Object.keys(src).forEach(function (k) { push(src[k], k); });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return list;
  };

  M.normHouseFile = function (raw, id) {
    var out = {
      id: id || (raw && raw.house) || "", name: (raw && (raw.houseName || raw.name)) || "",
      asOf: (raw && (raw.asOf || raw.as_of)) || null, source: (raw && raw.source) || "",
      activity: { newEntries: [], exits: [], increases: [], decreases: [] },
      topHoldings: [], holdings: [], sectors: [], stakes: [], coverage: (raw && raw.coverage) || null
    };
    if (!raw || typeof raw !== "object") return out;
    var act = raw.activity || raw;
    var pick = function (o, keys) { for (var i = 0; i < keys.length; i++) if (Array.isArray(o[keys[i]])) return o[keys[i]]; return []; };
    var symRow = function (r) {
      if (!r || typeof r !== "object") return null;
      return {
        sym: String(r.sym || r.symbol || ""), name: String(r.name || r.stockName || ""),
        schemes: num(r.schemes != null ? r.schemes : r.schemeCount),
        valueLakh: num(r.marketValueLakh != null ? r.marketValueLakh : (r.valueLakh != null ? r.valueLakh : r.value)),
        pctOfScheme: num(r.pctOfScheme != null ? r.pctOfScheme : r.pct),
        pctOfStock: num(r.pctOfStock != null ? r.pctOfStock : (r.holdingPct != null ? r.holdingPct : r.stakePct)),
        industry: String(r.industry || r.sector || "")
      };
    };
    out.activity.newEntries = pick(act, ["newEntries", "new_entries", "entered"]).map(symRow).filter(Boolean);
    out.activity.exits = pick(act, ["exits", "soldOut", "sold_out"]).map(symRow).filter(Boolean);
    out.activity.increases = pick(act, ["increases", "increased", "topIncreases"]).map(symRow).filter(Boolean);
    out.activity.decreases = pick(act, ["decreases", "decreased", "reductions", "topDecreases"]).map(symRow).filter(Boolean);
    out.topHoldings = pick(raw, ["topHoldings", "top_holdings"]).map(symRow).filter(Boolean);
    out.holdings = pick(raw, ["holdings", "stocks"]).map(symRow).filter(Boolean);
    if (!out.holdings.length) out.holdings = out.topHoldings;
    var secs = pick(raw, ["sectors", "sectorSplit", "sector_allocation"]);
    out.sectors = secs.map(function (s) {
      if (!s || typeof s !== "object") return null;
      return { sector: String(s.sector || s.name || ""), pct: num(s.pct != null ? s.pct : s.weight), valueLakh: num(s.valueLakh != null ? s.valueLakh : s.marketValueLakh) };
    }).filter(Boolean);
    if (!out.sectors.length && out.holdings.length) {
      /* Derive a sector split from the holdings' industry tags when the
         pipeline did not publish one (weights by disclosed value). */
      var bySec = {}, tot = 0;
      out.holdings.forEach(function (h) {
        if (!h.industry || h.valueLakh == null) return;
        bySec[h.industry] = (bySec[h.industry] || 0) + h.valueLakh; tot += h.valueLakh;
      });
      if (tot > 0) out.sectors = Object.keys(bySec).map(function (k) { return { sector: k, pct: bySec[k] / tot * 100, valueLakh: bySec[k] }; })
        .sort(function (a, b) { return b.valueLakh - a.valueLakh; }).slice(0, 8);
    }
    out.stakes = pick(raw, ["stakes", "stakesAbove1"]).map(symRow).filter(function (r) { return r && (r.pctOfStock == null || r.pctOfStock >= 1); });
    if (!out.stakes.length) out.stakes = out.holdings.filter(function (h) { return h.pctOfStock != null && h.pctOfStock >= 1; });
    return out;
  };

  M.normLeaderboards = function (raw) {
    var out = { asOf: (raw && raw.asOf) || null, source: (raw && raw.source) || "", netBuys: [], netSells: [], newEntries: [], exits: [], accumulation: [] };
    if (!raw || typeof raw !== "object") return out;
    var pick = function (keys) { for (var i = 0; i < keys.length; i++) if (Array.isArray(raw[keys[i]])) return raw[keys[i]]; return []; };
    var row = function (r) {
      if (!r || typeof r !== "object") return null;
      return {
        sym: String(r.sym || r.symbol || ""), name: String(r.name || ""),
        valueCr: num(r.valueCr != null ? r.valueCr : (r.estValueCr != null ? r.estValueCr : (r.valueLakh != null ? r.valueLakh / 100 : (r.estValueLakh != null ? r.estValueLakh / 100 : null)))),
        count: num(r.count != null ? r.count : (r.entries != null ? r.entries : r.exits)),
        houses: num(r.houses != null ? r.houses : r.houseCount),
        schemes: num(r.schemes != null ? r.schemes : r.schemeCount),
        spark: Array.isArray(r.spark) ? r.spark.map(num).filter(function (v) { return v != null; }) : (Array.isArray(r.history) ? r.history.map(function (h) { return num(h && (h.schemes != null ? h.schemes : h.schemeCount)); }).filter(function (v) { return v != null; }) : null)
      };
    };
    out.netBuys = pick(["netBuys", "topBuys", "topNetBuys"]).map(row).filter(Boolean);
    out.netSells = pick(["netSells", "topSells", "topNetSells"]).map(row).filter(Boolean);
    out.newEntries = pick(["newEntries", "mostNewEntries"]).map(row).filter(Boolean);
    out.exits = pick(["exits", "mostExits"]).map(row).filter(Boolean);
    out.accumulation = pick(["accumulation", "accumulating", "multiFund"]).map(row).filter(Boolean);
    return out;
  };

  M.normFlows = function (raw) {
    var out = { asOf: (raw && raw.asOf) || null, source: (raw && raw.source) || "", months: [] };
    if (!raw || typeof raw !== "object") return out;
    var arr = raw.months || raw.series || raw.data || [];
    if (Array.isArray(arr)) {
      out.months = arr.map(function (m) {
        if (!m || typeof m !== "object") return null;
        var eq = (m.equity && typeof m.equity === "object") ? m.equity : m;
        return {
          month: String(m.month || m.period || m.date || ""),
          net: num(eq.net != null ? eq.net : (eq.equityNet != null ? eq.equityNet : m.fiiNet)),
          buy: num(eq.buy != null ? eq.buy : eq.grossBuy),
          sell: num(eq.sell != null ? eq.sell : eq.grossSell)
        };
      }).filter(function (m) { return m && m.month; });
      out.months.sort(function (a, b) { return a.month < b.month ? -1 : 1; });
    }
    return out;
  };

  /* Feed: one item per (held stock × fund house) with a change this month.
     filesBySym: {SYM: normStockFile}. follows: [houseId]. */
  M.buildFeed = function (mySyms, filesBySym, follows) {
    var items = [];
    (mySyms || []).forEach(function (sym) {
      var f = filesBySym && filesBySym[sym];
      if (!f || !f.schemes) return;
      var byHouse = {};
      f.schemes.forEach(function (s) {
        var hid = s.house || s.houseName || "?";
        var g = byHouse[hid] || (byHouse[hid] = {
          sym: sym, house: hid, houseName: s.houseName || hid,
          counts: { "new": 0, increased: 0, reduced: 0, exited: 0, unchanged: 0 },
          schemesNow: 0, schemesPrev: 0, sharesNow: 0, sharesPrev: 0, corpAction: false
        });
        if ((s.shares || 0) > 0) { g.schemesNow++; g.sharesNow += s.shares; }
        if ((s.prevShares || 0) > 0) { g.schemesPrev++; g.sharesPrev += s.prevShares; }
        if (g.counts[s.change] != null) g.counts[s.change]++;
        if (s.corpAction) g.corpAction = true;
      });
      Object.keys(byHouse).forEach(function (hid) {
        var g = byHouse[hid];
        var activity = g.counts["new"] + g.counts.increased + g.counts.reduced + g.counts.exited;
        if (!activity && g.sharesNow === g.sharesPrev) return;
        g.netShares = g.sharesNow - g.sharesPrev;
        g.netPct = g.sharesPrev > 0 ? g.netShares / g.sharesPrev * 100 : null;
        g.followed = (follows || []).indexOf(hid) >= 0;
        g.activity = activity;
        items.push(g);
      });
    });
    items.sort(function (a, b) {
      if (a.followed !== b.followed) return a.followed ? -1 : 1;
      var an = a.netPct == null ? 101 : Math.abs(a.netPct), bn = b.netPct == null ? 101 : Math.abs(b.netPct);
      if (bn !== an) return bn - an;
      return b.activity - a.activity;
    });
    return items;
  };

  /* Overlap of a fund house with MY portfolio, computed on-device.
     houseSyms: symbols the house holds (disclosed list). myRows: enriched()
     rows ({sym, cur}). Returns my ₹ in common stocks (the caller wraps it
     in the privacy class) + the share of my portfolio they represent. */
  M.overlap = function (houseSyms, myRows) {
    var set = {};
    (houseSyms || []).forEach(function (s) { if (s) set[String(s).toUpperCase()] = 1; });
    var total = 0, common = [];
    (myRows || []).forEach(function (r) {
      if (!r || !Number.isFinite(r.cur)) return;
      total += r.cur;
      if (set[String(r.sym).toUpperCase()]) common.push({ sym: r.sym, cur: r.cur, weight: 0 });
    });
    var value = common.reduce(function (a, c) { return a + c.cur; }, 0);
    common.forEach(function (c) { c.weight = total > 0 ? c.cur / total * 100 : 0; });
    common.sort(function (a, b) { return b.cur - a.cur; });
    return { value: value, pct: total > 0 ? value / total * 100 : 0, total: total, common: common };
  };

  /* Matrix cells: state per (my stock × house). */
  M.matrixCells = function (mySyms, houseIds, filesBySym) {
    var out = {};
    (mySyms || []).forEach(function (sym) {
      out[sym] = {};
      var f = filesBySym && filesBySym[sym];
      (houseIds || []).forEach(function (hid) { out[sym][hid] = "none"; });
      if (!f || !f.schemes) return;
      var byHouse = {};
      f.schemes.forEach(function (s) {
        var hid = s.house || s.houseName || "?";
        if (out[sym][hid] == null) return;
        var g = byHouse[hid] || (byHouse[hid] = { cur: 0, prev: 0, anyNew: false, allNew: true, anyExit: false });
        if ((s.shares || 0) > 0) { g.cur += s.shares; if (s.change !== "new") g.allNew = false; else g.anyNew = true; }
        if ((s.prevShares || 0) > 0) g.prev += s.prevShares;
        if (s.change === "exited") g.anyExit = true;
      });
      Object.keys(byHouse).forEach(function (hid) {
        var g = byHouse[hid];
        if (g.cur === 0 && g.prev > 0) out[sym][hid] = "exited";
        else if (g.cur === 0) out[sym][hid] = "none";
        else if (g.prev === 0 || (g.anyNew && g.allNew)) out[sym][hid] = "new";
        else if (g.cur > g.prev) out[sym][hid] = "increased";
        else if (g.cur < g.prev) out[sym][hid] = "reduced";
        else out[sym][hid] = "holds";
      });
    });
    return out;
  };

  /* Alert evaluation — cached data only, plain rules, dedupe keys. */
  M.evaluateAlerts = function (settings, ctx) {
    var out = [];
    if (!settings) return out;
    var feed = (ctx && ctx.feed) || [];
    var asOf = (ctx && ctx.asOf) || "";
    if (settings.mfChange) {
      feed.forEach(function (g) {
        if (g.netPct != null && Math.abs(g.netPct) >= settings.thresholdPct) {
          out.push({
            kind: "mfchange", sym: g.sym, house: g.house,
            key: "mfchange|" + g.sym + "|" + g.house + "|" + asOf,
            text: g.houseName + (g.netPct >= 0 ? " increased its " : " reduced its ") + g.sym + " holding by " + Math.abs(g.netPct).toFixed(1) + "% of shares (inferred from monthly disclosures)."
          });
        }
      });
    }
    if (settings.followMoves) {
      feed.forEach(function (g) {
        if (!g.followed) return;
        if (g.counts["new"] > 0) out.push({
          kind: "follow-new", sym: g.sym, house: g.house,
          key: "follownew|" + g.sym + "|" + g.house + "|" + asOf,
          text: "Followed house " + g.houseName + " entered " + g.sym + " with " + g.counts["new"] + " new scheme(s) last month (inferred from disclosures)."
        });
        if (g.counts.exited > 0 && g.schemesNow === 0) out.push({
          kind: "follow-exit", sym: g.sym, house: g.house,
          key: "followexit|" + g.sym + "|" + g.house + "|" + asOf,
          text: "Followed house " + g.houseName + " exited " + g.sym + " completely last month (inferred from disclosures)."
        });
      });
    }
    if (settings.deals && ctx && ctx.dealsAvailable && Array.isArray(ctx.dealHits)) {
      ctx.dealHits.forEach(function (h) {
        out.push({
          kind: "deal", sym: h.sym, house: "",
          key: "deal|" + h.sym + "|" + (h.date || asOf),
          text: "A bulk/block deal was reported in " + h.sym + (h.client ? " (" + h.client + ")" : "") + "."
        });
      });
    }
    return out;
  };

  window.FolioSmartMoneyMath = M;

  /* ================= DATA LAYER =================
     IndexedDB cache ("folio-smartmoney"), keyed by file path, every entry
     stamped with the manifest version it belongs to. First paint comes
     from cache; a changed manifest triggers background revalidation and
     the open screen re-renders — a failed fetch never blanks data that is
     already on screen. */
  var DB_NAME = "folio-smartmoney";
  var idbP = null;
  function idbOpen() {
    if (idbP) return idbP;
    idbP = new Promise(function (res) {
      try {
        var rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = function () { try { rq.result.createObjectStore("files"); } catch (e) {} };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return idbP;
  }
  function idbGet(key) {
    return idbOpen().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        try {
          var rq = db.transaction("files", "readonly").objectStore("files").get(key);
          rq.onsuccess = function () { res(rq.result || null); };
          rq.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  function idbPut(key, val) {
    return idbOpen().then(function (db) {
      if (!db) return;
      try { db.transaction("files", "readwrite").objectStore("files").put(val, key); } catch (e) {}
    });
  }

  function fetchJson(path, timeoutMs) {
    var attempt = function () {
      return new Promise(function (resolve, reject) {
        var ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var to = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error("timeout")); }, timeoutMs || 10000);
        fetch(SM_BASE + path, { cache: "no-cache", signal: ctl ? ctl.signal : undefined })
          .then(function (r) {
            clearTimeout(to);
            if (!r.ok) { var err = new Error("http " + r.status); err.status = r.status; reject(err); return; }
            r.json().then(resolve, reject);
          })
          .catch(function (e) { clearTimeout(to); reject(e); });
      });
    };
    return attempt().catch(function (e) {
      if (e && e.status === 404) throw e; /* a missing file is a fact, not a transient failure */
      return new Promise(function (res) { setTimeout(res, 700); }).then(attempt);
    });
  }

  var S = {
    manifest: null, manifestMv: null, manifestLoaded: false,
    houses: null, houseFiles: {}, stockFiles: {}, stockLoaded: {},
    leaderboards: null, flows: null, feed: null, feedSyms: [],
    alerts: [], alertsFeedAsOf: null,
    chip: "mine", screen: "home", navStack: [], entityId: null, compareId: null,
    feedShown: 60, houseQuery: "", sheetOpen: false
  };
  function mvOf(man) { return man ? String(man.version != null ? man.version : "") + "|" + String(man.generatedAt || "") : ""; }
  function currentMv() { return S.manifestMv || ""; }

  /* Manifest: cache-first paint, background refresh; resolves with the
     best manifest available (null = pipeline has not published yet). */
  function getManifest(onUpdate) {
    if (S.manifestLoaded && S.manifest) return Promise.resolve(S.manifest);
    return idbGet("manifest.json").then(function (ent) {
      if (ent && ent.data) {
        S.manifest = M.normManifest(ent.data); S.manifestMv = ent.mv || mvOf(S.manifest); S.manifestLoaded = true;
        refreshManifest(onUpdate);
        return S.manifest;
      }
      return refreshManifest(onUpdate).then(function () { S.manifestLoaded = true; return S.manifest; });
    }).catch(function () { S.manifestLoaded = true; return S.manifest; });
  }
  function refreshManifest(onUpdate) {
    return fetchJson("manifest.json", 8000).then(function (raw) {
      var nm = M.normManifest(raw), mv = mvOf(nm);
      var changed = mv !== S.manifestMv;
      S.manifest = nm; S.manifestMv = mv;
      idbPut("manifest.json", { mv: mv, t: Date.now(), data: raw });
      if (changed && onUpdate) onUpdate();
      return nm;
    }).catch(function () { return S.manifest; });
  }

  /* One dataset file: cache (keyed by manifest version) → network.
     Resolves {data, stale} — data is null when the file genuinely does
     not exist (404) and nothing is cached. */
  function loadData(path, onUpdate) {
    return idbGet(path).then(function (ent) {
      var mv = currentMv();
      if (ent && ("data" in ent)) {
        if (ent.mv !== mv) {
          fetchAndStore(path).then(function (fresh) { if (fresh !== undefined && onUpdate) onUpdate(); }).catch(function () {});
        }
        return { data: ent.data, stale: ent.mv !== mv };
      }
      return fetchAndStore(path).then(function (fresh) {
        return { data: fresh === undefined ? null : fresh, stale: false };
      });
    }).catch(function () { return { data: null, stale: false }; });
  }
  function fetchAndStore(path) {
    return fetchJson(path, 12000).then(function (raw) {
      idbPut(path, { mv: currentMv(), t: Date.now(), data: raw });
      return raw;
    }).catch(function (e) {
      if (e && e.status === 404) {
        /* The file genuinely does not exist for this manifest version —
           cache the fact so we do not refetch it on every open. */
        idbPut(path, { mv: currentMv(), t: Date.now(), data: null });
        return null;
      }
      return undefined; /* transient failure: callers fall back to cache */
    });
  }

  function loadStockFile(sym) {
    if (S.stockLoaded[sym]) return Promise.resolve(S.stockFiles[sym] || null);
    S.stockLoaded[sym] = 1;
    return loadData("mf/stock/" + encodeURIComponent(sym) + ".json", function () {
      delete S.stockLoaded[sym]; loadStockFile(sym).then(function () { rerender(); });
    }).then(function (r) {
      S.stockFiles[sym] = r.data ? M.normStockFile(r.data, sym) : null;
      return S.stockFiles[sym];
    });
  }
  function loadHouses() {
    if (S.houses) return Promise.resolve(S.houses);
    return loadData("houses.json", function () { S.houses = null; loadHouses().then(function () { rerender(); }); })
      .then(function (r) { S.houses = M.normHouses(r.data); return S.houses; });
  }
  function loadHouseFile(id) {
    if (S.houseFiles[id]) return Promise.resolve(S.houseFiles[id]);
    return loadData("mf/house/" + encodeURIComponent(id) + ".json", function () {
      delete S.houseFiles[id]; loadHouseFile(id).then(function () { rerender(); });
    }).then(function (r) {
      S.houseFiles[id] = r.data ? M.normHouseFile(r.data, id) : null;
      return S.houseFiles[id];
    });
  }
  function loadLeaderboards() {
    if (S.leaderboards) return Promise.resolve(S.leaderboards);
    return loadData("mf/leaderboards.json", function () { S.leaderboards = null; loadLeaderboards().then(function () { rerender(); }); })
      .then(function (r) { S.leaderboards = r.data ? M.normLeaderboards(r.data) : null; return S.leaderboards; });
  }
  function loadFlows() {
    if (S.flows) return Promise.resolve(S.flows);
    return loadData("flows-fii-monthly.json", function () { S.flows = null; loadFlows().then(function () { rerender(); }); })
      .then(function (r) { S.flows = r.data ? M.normFlows(r.data) : null; return S.flows; });
  }

  /* ---------- my universe (on-device only) ---------- */
  function myRows() { try { return enriched().rows || []; } catch (e) { return []; } }
  function heldSyms() { return myRows().map(function (r) { return r.sym; }); }
  function watchedSyms() {
    var set = {};
    try { (state.watch || []).forEach(function (w) { if (w && w.sym) set[w.sym] = 1; }); } catch (e) {}
    try {
      (state.watchlists || []).forEach(function (l) {
        (l.items || []).forEach(function (it) {
          var s = typeof it === "string" ? it : (it && (it.sym || it.symbol));
          if (s) set[s] = 1;
        });
      });
    } catch (e) {}
    return Object.keys(set);
  }
  function stockName(sym) {
    try {
      var rows = myRows();
      for (var i = 0; i < rows.length; i++) if (rows[i].sym === sym) return rows[i].name || sym;
    } catch (e) {}
    return sym;
  }

  /* ================= SHARED UI PIECES ================= */
  function asOfLine(gate, extra) {
    if (!gate || !gate.published) return '<p class="sm-asof">Data pipeline has not published yet.</p>';
    var bits = [];
    if (gate.asOf) bits.push("As of " + (gate.asOf.length <= 7 ? monthLabel(gate.asOf) : dateLabel(gate.asOf)));
    if (gate.source) bits.push(gate.source);
    if (extra) bits.push(extra);
    var stale = gate.staleDaily ? ' <span class="sm-stale">· Data looks stale (older than 3 days)</span>' : "";
    return '<p class="sm-asof">' + escT(bits.join(" · ")) + stale + "</p>";
  }
  function unavailableBox(label, gate, customNote) {
    var note = customNote || (gate && gate.note) || "This data comes from exchange feeds that are not available in free data yet. The section is ready and will fill in by itself if the data starts publishing.";
    var src = gate && gate.source ? '<p class="sm-asof">Source: ' + escT(gate.source) + "</p>" : "";
    return '<div class="sm-unavail"><div class="sm-unavail-t">Data not available yet</div>' +
      '<p>' + escT(label) + " — " + escT(note) + "</p>" + src + "</div>";
  }
  function badge(change) {
    var map = {
      "new": '<span class="sm-badge sm-b-new">New</span>',
      increased: '<span class="sm-badge sm-b-inc">Increased</span>',
      reduced: '<span class="sm-badge sm-b-red">Reduced</span>',
      exited: '<span class="sm-badge sm-b-exit">Exited</span>',
      unchanged: '<span class="sm-badge sm-b-flat">Unchanged</span>'
    };
    return map[change] || "";
  }
  function countsBadges(c) {
    var out = [];
    if (c["new"]) out.push('<span class="sm-badge sm-b-new">' + c["new"] + " New</span>");
    if (c.increased) out.push('<span class="sm-badge sm-b-inc">' + c.increased + " Increased</span>");
    if (c.reduced) out.push('<span class="sm-badge sm-b-red">' + c.reduced + " Reduced</span>");
    if (c.exited) out.push('<span class="sm-badge sm-b-exit">' + c.exited + " Exited</span>");
    return out.join(" ");
  }
  function sparkOf(values) {
    try { if (typeof sparkSvg === "function") return sparkSvg(values); } catch (e) {}
    return "";
  }
  /* Horizontal bar row (top holdings / sectors) — div bars, theme-safe. */
  function barRow(label, pct, rightText) {
    var w = Math.max(0, Math.min(100, pct || 0));
    return '<div class="sm-bar-row"><span class="sm-bar-lab">' + escT(label) + '</span>' +
      '<span class="sm-bar"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
      '<span class="sm-bar-val">' + escT(rightText) + "</span></div>";
  }
  /* Flows chart: monthly net bars + cumulative line, ₹ crore labels. */
  function flowsSvg(months) {
    var pts = months.filter(function (m) { return m.net != null; });
    if (pts.length < 2) return '<p class="empty-note">Not enough monthly data for a chart yet.</p>';
    var W = 680, H = 210, P = 10, base = H / 2;
    var maxAbs = 0, cum = 0, cums = [];
    pts.forEach(function (m) { maxAbs = Math.max(maxAbs, Math.abs(m.net)); cum += m.net; cums.push(cum); });
    var cumMax = Math.max.apply(null, cums.map(Math.abs).concat([1]));
    var bw = (W - 2 * P) / pts.length;
    var out = '<line x1="' + P + '" y1="' + base + '" x2="' + (W - P) + '" y2="' + base + '" stroke="var(--line)" stroke-width="1"/>';
    pts.forEach(function (m, i) {
      var h = maxAbs ? Math.abs(m.net) / maxAbs * (H / 2 - 26) : 0;
      var x = P + i * bw + bw * 0.18, w = bw * 0.64;
      var y = m.net >= 0 ? base - h : base;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="2" fill="' + (m.net >= 0 ? "var(--gain)" : "var(--loss)") + '" opacity="0.75"><title>' + escT(monthLabel(m.month)) + ": " + escT(fmtCr(m.net)) + "</title></rect>";
    });
    var line = cums.map(function (c, i) {
      var x = P + i * bw + bw / 2, y = base - (c / cumMax) * (H / 2 - 26);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
    out += '<path d="' + line + '" fill="none" stroke="var(--text)" stroke-width="2"/>';
    out += '<text x="' + P + '" y="14" fill="var(--muted)" font-size="12">Cumulative ' + escT(fmtCr(cum)) + "</text>";
    out += '<text x="' + P + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="12">' + escT(monthLabel(pts[0].month)) + " – " + escT(monthLabel(pts[pts.length - 1].month)) + " · bars = monthly net, line = cumulative</text>";
    return '<svg class="sm-chart" viewBox="0 0 ' + W + " " + H + '" role="img">' + out + "</svg>";
  }
  /* Ownership stacked bars (reserved shareholding schema). */
  function ownershipSvg(quarters) {
    if (!quarters || !quarters.length) return '<p class="empty-note">No shareholding history yet.</p>';
    var cats = [
      ["promoter", "Promoter", "var(--accent)"], ["fpi", "FPI", "#7c9eb2"], ["dii", "DII / MF", "#b28c7c"], ["public", "Public", "var(--panel-3)"]
    ];
    var rows = quarters.map(function (q) {
      var segs = cats.map(function (c) {
        var v = num(q[c[0]]);
        return v == null ? "" : '<i style="width:' + Math.max(0, Math.min(100, v)).toFixed(1) + '%;background:' + c[2] + '" title="' + c[1] + " " + v.toFixed(1) + '%"></i>';
      }).join("");
      return '<div class="sm-own-row"><span class="sm-own-q">' + escT(q.quarter || q.q || "") + '</span><span class="sm-own-bar">' + segs + "</span></div>";
    }).join("");
    var legend = cats.map(function (c) { return '<span class="sm-own-leg"><i style="background:' + c[2] + '"></i>' + c[1] + "</span>"; }).join("");
    return rows + '<div class="sm-own-legs">' + legend + "</div>";
  }

  /* ================= SHEET SCAFFOLD ================= */
  var sheetEl = null;
  function buildSheet() {
    var m = document.createElement("div");
    m.id = "smSheet"; m.className = "modal sheet-modal hidden";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Smart Money");
    m.innerHTML = '<div class="modal-card sm-card">' +
      '<div class="sm-head"><button type="button" class="icon-btn sm-back hidden" id="smBack" aria-label="Back"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>' +
      '<h3 id="smTitle">Smart Money</h3>' +
      '<button type="button" class="icon-btn" id="smGear" aria-label="Smart Money alerts and follows"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg></button>' +
      '<button type="button" class="icon-btn" id="smClose" aria-label="Close">✕</button></div>' +
      '<div class="sm-body" id="smBody">' +
      '<div class="sm-screen" data-screen="home" id="smHome"></div>' +
      '<div class="sm-screen hidden" data-screen="entity" id="smEntity"></div>' +
      '<div class="sm-screen hidden" data-screen="compare" id="smCompare"></div>' +
      '<div class="sm-screen hidden" data-screen="matrix" id="smMatrix"></div>' +
      '<div class="sm-screen hidden" data-screen="sources" id="smSources"></div>' +
      '<div class="sm-screen hidden" data-screen="settings" id="smSettingsScr"></div>' +
      "</div></div>";
    document.body.appendChild(m);
    wire(m);
    return m;
  }
  function showScreen(name) {
    if (!sheetEl) return;
    S.screen = name;
    sheetEl.querySelectorAll(".sm-screen").forEach(function (s) { s.classList.toggle("hidden", s.dataset.screen !== name); });
    sheetEl.querySelector("#smBack").classList.toggle("hidden", name === "home");
    sheetEl.querySelector("#smGear").classList.toggle("hidden", name === "settings");
    var titles = { home: "Smart Money", entity: "Fund House", compare: "Compare Houses", matrix: "Who Holds My Stocks", sources: "Data Sources & Credits", settings: "Smart Money Settings" };
    sheetEl.querySelector("#smTitle").textContent = titles[name] || "Smart Money";
    sheetEl.querySelector("#smBody").scrollTop = 0;
  }
  /* v130: every screen step owns ONE history entry (registered with
     the modal manager), so a Back press peels exactly one screen and
     never the whole sheet. subToks mirrors S.navStack's pushes. */
  var subToks = [];
  function pushSub() {
    if (window.folioSubPush) subToks.push(window.folioSubPush(sheetEl, function () { subToks.pop(); goBackVisual(); }));
  }
  function goScreen(name, arg) {
    if (S.screen !== name) { S.navStack.push(S.screen); pushSub(); }
    if (name === "entity") { S.entityId = arg; renderEntity(); }
    if (name === "compare") { renderCompare(); }
    if (name === "matrix") { renderMatrix(); }
    if (name === "sources") { renderSources(); }
    if (name === "settings") { renderSettings(); }
    showScreen(name);
  }
  function goBackVisual() {
    var prev = S.navStack.pop() || "home";
    if (prev === "entity" && S.entityId) { renderEntity(); }
    showScreen(prev);
  }
  function goBack() { /* the sheet's own back control: settle this step's history entry */
    var tok = subToks[subToks.length - 1];
    if (tok && window.folioSubSettle) window.folioSubSettle(tok);
    else { subToks.pop(); goBackVisual(); }
  }
  function rerender() {
    if (!sheetEl || !S.sheetOpen) return;
    if (S.screen === "home") renderHome();
    else if (S.screen === "entity") renderEntity();
    else if (S.screen === "compare") renderCompare();
    else if (S.screen === "matrix") renderMatrix();
    else if (S.screen === "sources") renderSources();
    else if (S.screen === "settings") renderSettings();
  }

  /* ================= HOME ================= */
  function gate(key) { return M.gate(S.manifest, key); }

  function coverageBanner() {
    if (!S.manifest) {
      return '<div class="sm-banner sm-banner-warn"><b>Smart Money data has not published yet.</b><br>' +
        "The pipeline that prepares these public files has not produced its first run, so every section below shows its empty state. Nothing here is estimated or filled in.</div>";
    }
    var live = [], off = [];
    Object.keys(M.DATASET_LABELS).forEach(function (k) {
      var g = gate(k);
      if (!g.published) return;
      if (g.ok) live.push(M.DATASET_LABELS[k] + (g.asOf ? " (" + (g.asOf.length <= 7 ? monthLabel(g.asOf) : dateLabel(g.asOf)) + ")" : "") + (g.status === "partial" && g.coverage ? " — " + g.coverage : ""));
      else off.push(M.DATASET_LABELS[k]);
    });
    var upd = S.manifest.generatedAt ? '<br><span class="sm-asof">Pipeline updated ' + escT(dateLabel(String(S.manifest.generatedAt).slice(0, 10))) + "</span>" : "";
    return '<div class="sm-banner"><b>Coverage</b> — live: ' + (live.length ? escT(live.join(" · ")) : "none yet") +
      (off.length ? '<br><span class="sm-muted">Not available yet: ' + escT(off.join(" · ")) + " (exchange feeds block the free pipeline — see Data Sources).</span>" : "") + upd + "</div>";
  }

  function summaryTiles() {
    var mf = gate("mfHoldings");
    var tiles = "";
    /* Tile 1 — MF activity in my stocks */
    if (!mf.ok) {
      tiles += tile("Mutual funds in your stocks", "Not available yet", mf.published ? "Monthly disclosure data has not published." : "Pipeline has not published yet.");
    } else if (!S.feed) {
      tiles += tile("Mutual funds in your stocks", "Loading…", "Reading the latest monthly disclosures.");
    } else {
      var netSchemes = 0, buyStocks = 0, sellStocks = 0, symSeen = {};
      S.feed.forEach(function (g) {
        netSchemes += (g.schemesNow - g.schemesPrev);
        if (!symSeen[g.sym]) { symSeen[g.sym] = 0; }
        symSeen[g.sym] += g.netShares;
      });
      Object.keys(symSeen).forEach(function (s) { if (symSeen[s] > 0) buyStocks++; else if (symSeen[s] < 0) sellStocks++; });
      tiles += tile("Mutual funds in your stocks",
        (netSchemes > 0 ? "+" : "") + netSchemes + " schemes (net)",
        buyStocks + " of your stocks saw net fund buying, " + sellStocks + " net selling — inferred from " + monthLabel(mf.asOf) + " disclosures.");
    }
    /* Tile 2 — deals */
    var dg = gate("deals");
    tiles += dg.ok
      ? tile("New deals (7 days)", "See Deals tab", "Bulk & block deals in your stocks.")
      : tile("New deals (7 days)", "Not available yet", "Exchange deal feeds are not available in free data.");
    /* Tile 3 — FPI QoQ */
    var sg = gate("shareholding");
    tiles += sg.ok
      ? tile("FPI holding change (QoQ)", "See a stock's Who Owns It tab", "Quarterly shareholding in your stocks.")
      : tile("FPI holding change (QoQ)", "Not available yet", "Shareholding data is not available in free data.");
    /* Tile 4 — freshness */
    var fresh = "—", freshSub = "Waiting for the first pipeline run.";
    if (S.manifest) {
      var parts = [];
      if (mf.asOf) parts.push("MF: " + monthLabel(mf.asOf));
      var nv = gate("nav"); if (nv.asOf) parts.push("NAV: " + dateLabel(nv.asOf));
      var fi = gate("fiiMonthly"); if (fi.asOf) parts.push("FII: " + monthLabel(fi.asOf));
      fresh = parts.length ? parts[0].split(": ")[1] : "—";
      freshSub = parts.join(" · ") || freshSub;
    }
    tiles += tile("Data freshness", fresh, freshSub);
    return '<div class="ds-stat-grid sm-tiles">' + tiles + "</div>";
    function tile(label, value, sub) {
      return '<div class="ds-stat"><div class="ds-stat__label">' + escT(label) + '</div><div class="ds-stat__value sm-tile-v">' + escT(value) + '</div><div class="ds-stat__sub">' + escT(sub) + "</div></div>";
    }
  }

  function alertsStrip() {
    if (!S.alerts.length) return "";
    var rows = S.alerts.slice(0, 5).map(function (a) {
      return '<div class="sm-alert-row"><span>' + escT(a.text) + "</span></div>";
    }).join("");
    return '<div class="sm-alerts"><div class="sm-alerts-t">Smart Money alerts' + (S.alerts.length > 5 ? " (" + S.alerts.length + ")" : "") + "</div>" + rows +
      (S.alerts.length > 5 ? '<p class="sm-asof">+ ' + (S.alerts.length - 5) + " more in Settings → Smart Money.</p>" : "") + "</div>";
  }

  var CHIPS = [
    ["mine", "My stocks"], ["market", "Market"], ["funds", "Funds"],
    ["deals", "Deals"], ["flows", "Flows"], ["insiders", "Insiders"]
  ];
  function chipBar() {
    return '<div class="sm-chips" role="tablist">' + CHIPS.map(function (c) {
      return '<button type="button" class="sm-chip' + (S.chip === c[0] ? " on" : "") + '" data-sm-chip="' + c[0] + '" role="tab" aria-selected="' + (S.chip === c[0]) + '">' + c[1] + "</button>";
    }).join("") + "</div>";
  }

  function feedHtml() {
    var mf = gate("mfHoldings");
    if (!mf.ok) return unavailableBox("Mutual fund changes in your stocks", mf);
    if (!S.feed) return '<div class="insx-skel"></div><div class="insx-skel"></div><p class="sm-asof">Loading monthly disclosures for your stocks…</p>';
    if (!heldSyms().length) return '<p class="empty-note">Add holdings first — this feed shows mutual fund moves in the stocks you hold.</p>';
    if (!S.feed.length) return '<p class="empty-note">No mutual fund changes in your stocks in the latest disclosure month (' + escT(monthLabel(mf.asOf)) + ").</p>" + asOfLine(mf);
    var rows = S.feed.slice(0, S.feedShown).map(function (g) {
      var dir = g.netShares > 0 ? "pos" : (g.netShares < 0 ? "neg" : "flat");
      var arrow = g.netShares > 0 ? "▲" : (g.netShares < 0 ? "▼" : "•");
      return '<button type="button" class="sm-feed-row" data-sm-stock="' + escT(g.sym) + '">' +
        '<span class="sm-feed-main"><span class="sm-feed-sym">' + escT(g.sym) + (g.followed ? ' <span class="sm-star" title="Followed house">★</span>' : "") + '</span>' +
        '<span class="sm-feed-house">' + escT(g.houseName) + " · " + g.schemesNow + " scheme" + (g.schemesNow === 1 ? "" : "s") + " holding</span>" +
        '<span class="sm-feed-badges">' + countsBadges(g.counts) + (g.corpAction ? ' <span class="sm-badge sm-b-warn">Check corporate action</span>' : "") + "</span></span>" +
        '<span class="sm-feed-net ' + dir + '">' + arrow + " " + escT(fmtShares(Math.abs(g.netShares))) + " sh" +
        (g.netPct != null ? '<small>' + escT(fmtPct(g.netPct)) + "</small>" : "") + "</span></button>";
    }).join("");
    var more = S.feed.length > S.feedShown ? '<button type="button" class="btn small sm-more" data-sm-more="feed">Show more (' + (S.feed.length - S.feedShown) + ")</button>" : "";
    return '<div class="sm-feed">' + rows + "</div>" + more +
      '<p class="sm-note">Bought / sold is <b>inferred</b> from the change between two monthly disclosures — a split or bonus can also change share counts, so verify before reading a big jump as buying. ' + escT(monthLabel(mf.asOf)) + " disclosures.</p>" +
      '<div class="sm-share-row">' + shareBtn("sm_portfolio", "Smart money in my portfolio") + "</div>" + asOfLine(mf);
  }

  function lbSection(title, rows, renderRow) {
    if (!rows || !rows.length) return "";
    return '<div class="sm-sec-t">' + escT(title) + '</div><div class="sm-lb">' + rows.slice(0, 8).map(renderRow).join("") + "</div>";
  }
  function marketHtml() {
    var mf = gate("mfHoldings");
    if (!mf.ok) return unavailableBox("Market-wide mutual fund leaderboards", mf);
    if (!S.leaderboards) return '<div class="insx-skel"></div><div class="insx-skel"></div><p class="sm-asof">Loading leaderboards…</p>';
    var lb = S.leaderboards;
    var valRow = function (r) {
      return '<div class="sm-lb-row"><span class="sm-lb-sym">' + escT(r.sym) + '</span><span class="sm-lb-name">' + escT(r.name || "") + '</span>' +
        (r.spark && r.spark.length > 1 ? '<span class="sm-lb-spark">' + sparkOf(r.spark) + "</span>" : "") +
        '<b>' + (r.valueCr != null ? escT(fmtCr(r.valueCr)) + " est." : "—") + "</b></div>";
    };
    var cntRow = function (r) {
      return '<div class="sm-lb-row"><span class="sm-lb-sym">' + escT(r.sym) + '</span><span class="sm-lb-name">' + escT(r.name || "") + '</span>' +
        (r.spark && r.spark.length > 1 ? '<span class="sm-lb-spark">' + sparkOf(r.spark) + "</span>" : "") +
        "<b>" + (r.count != null ? fmtInt(r.count) : (r.houses != null ? fmtInt(r.houses) + " houses" : "—")) + "</b></div>";
    };
    var html = lbSection("Top MF net buys — " + monthLabel(lb.asOf || mf.asOf), lb.netBuys, valRow) +
      lbSection("Top MF net sells — " + monthLabel(lb.asOf || mf.asOf), lb.netSells, valRow) +
      lbSection("Most new entries", lb.newEntries, cntRow) +
      lbSection("Most exits", lb.exits, cntRow) +
      lbSection("Funds accumulating together", lb.accumulation, function (r) {
        return '<div class="sm-lb-row"><span class="sm-lb-sym">' + escT(r.sym) + '</span><span class="sm-lb-name">' + escT(r.name || "") + '</span>' +
          (r.spark && r.spark.length > 1 ? '<span class="sm-lb-spark">' + sparkOf(r.spark) + "</span>" : "") +
          "<b>" + (r.houses != null ? fmtInt(r.houses) + " houses" : "—") + (r.schemes != null ? " · " + fmtInt(r.schemes) + " schemes" : "") + "</b></div>";
      });
    if (!html) html = '<p class="empty-note">Leaderboards are empty for the latest month.</p>';
    return html + '<p class="sm-note">Values are estimated from share-count changes × price and labelled as estimates. Inferred from monthly disclosures.</p>' +
      '<div class="sm-share-row">' + shareBtn("sm_leaderboard", "Top MF buys & sells") + shareBtn("sm_accum", "Funds accumulating") + "</div>" + asOfLine(mf);
  }

  function fundsHtml() {
    if (!S.houses) return '<div class="insx-skel"></div><p class="sm-asof">Loading fund houses…</p>';
    var q = S.houseQuery.trim().toLowerCase();
    var list = S.houses.filter(function (h) {
      if (!q) return true;
      if (h.name.toLowerCase().indexOf(q) >= 0) return true;
      return h.aliases.some(function (a) { return a.toLowerCase().indexOf(q) >= 0; });
    });
    var rows = list.slice(0, 80).map(function (h) {
      var fol = isFollowed(h.id);
      return '<div class="sm-house-row"><button type="button" class="sm-house-main" data-sm-house="' + escT(h.id) + '">' +
        '<span class="sm-avatar">' + escT(initials(h.name)) + '</span>' +
        '<span class="sm-house-txt"><span class="sm-house-name">' + escT(h.name) + (fol ? ' <span class="sm-star">★</span>' : "") + "</span>" +
        '<span class="sm-house-sub">' + (h.schemeCount != null ? fmtInt(h.schemeCount) + " schemes" : "") +
        (h.aliases.length > 1 ? " · also: " + escT(h.aliases.filter(function (a) { return a !== h.name; }).slice(0, 2).join(", ")) : "") + "</span></span>" +
        '<span class="sm-house-chev" aria-hidden="true">›</span></button>' +
        '<button type="button" class="sm-follow-btn' + (fol ? " on" : "") + '" data-sm-follow="' + escT(h.id) + '">' + (fol ? "Following" : "Follow") + "</button></div>";
    }).join("");
    return '<div class="sm-search"><input type="search" id="smHouseSearch" class="ds-input" placeholder="Search a fund house — Tata, SBI, BlackRock…" value="' + escT(S.houseQuery) + '" aria-label="Search fund houses"></div>' +
      (rows || '<p class="empty-note">No fund house matches that search.</p>') +
      (list.length > 80 ? '<p class="sm-asof">Showing the first 80 matches — keep typing to narrow down.</p>' : "") +
      asOfLine(gate("nav"));
  }

  function dealsHtml() {
    var dg = gate("deals");
    if (!dg.ok) return unavailableBox("Bulk & block deals", dg);
    return '<p class="empty-note">Deal data is marked live by the pipeline — open a stock\'s Who Owns It tab to see its deals.</p>' + asOfLine(dg);
  }
  function insidersHtml() {
    var ig = gate("insider");
    if (!ig.ok) return unavailableBox("Insider & promoter trades", ig, "Insider filings are published through exchange APIs that the free pipeline cannot reach today. When available, trades for your stocks will appear here and inside each stock's Who Owns It tab.");
    return '<p class="empty-note">Insider data is marked live by the pipeline — see each stock\'s Who Owns It tab.</p>' + asOfLine(ig);
  }

  function homeBodyHtml() {
    if (S.chip === "mine") return feedHtml();
    if (S.chip === "market") return marketHtml();
    if (S.chip === "funds") return fundsHtml();
    if (S.chip === "deals") return dealsHtml();
    if (S.chip === "flows") return flowsHtml();
    if (S.chip === "insiders") return insidersHtml();
    return "";
  }

  function renderHome() {
    var el = sheetEl && sheetEl.querySelector("#smHome");
    if (!el) return;
    el.innerHTML = coverageBanner() + alertsStrip() + summaryTiles() + chipBar() +
      '<div class="sm-chip-body">' + homeBodyHtml() + "</div>" +
      '<div class="sm-foot">' +
      '<button type="button" class="btn small" data-sm-goto="matrix">Who holds my stocks — matrix</button>' +
      '<button type="button" class="btn small" data-sm-goto="sources">Data sources & credits</button>' +
      '<p class="sm-note">Smart Money reads public monthly disclosures. It shows what big investors <b>did</b>, never what you should do. <b>Not investment advice.</b></p>' +
      "</div>";
    var search = el.querySelector("#smHouseSearch");
    if (search && S.chip === "funds") { /* keep caret behaviour simple: value restored by render */ }
  }

  /* Load everything the home needs, then paint. */
  function loadHomeData() {
    return getManifest(function () { /* manifest changed in background */
      S.feed = null; S.houses = null; S.leaderboards = null; S.flows = null;
      loadHomeData().then(function () { rerender(); });
    }).then(function (man) {
      var jobs = [];
      var mf = gate("mfHoldings");
      if (mf.ok) {
        var syms = heldSyms();
        jobs.push(Promise.all(syms.map(function (s) { return loadStockFile(s); })).then(function () {
          var bySym = {};
          syms.forEach(function (s) { if (S.stockFiles[s]) bySym[s] = S.stockFiles[s]; });
          S.feedSyms = syms;
          S.feed = M.buildFeed(syms, bySym, smSettings().follows);
          S.alertsFeedAsOf = mf.asOf;
          evaluateAlerts(false);
        }));
        jobs.push(loadLeaderboards());
      } else {
        S.feed = []; S.alerts = [];
      }
      jobs.push(loadHouses());
      jobs.push(loadFlows());
      return Promise.all(jobs);
    }).then(function () { rerender(); paintEntryMeta(); });
  }

  /* ================= FLOWS ================= */
  function flowsHtml() {
    var fg = gate("fiiMonthly");
    var dg = gate("flowsDaily");
    var html = '<div class="sm-sec-t">FII flows — monthly (NSDL)</div>';
    if (!fg.ok) {
      html += unavailableBox("FII monthly flows", fg, "NSDL publishes FII trade statistics monthly, with a lag. That file has not published yet.");
    } else if (!S.flows) {
      html += '<div class="insx-skel"></div><p class="sm-asof">Loading NSDL monthly flows…</p>';
    } else if (!S.flows.months.length) {
      html += '<p class="empty-note">No monthly flow rows yet.</p>';
    } else {
      var months = S.flows.months.slice(-24);
      html += flowsSvg(months);
      var last = months[months.length - 1];
      html += '<p class="sm-note">Latest: ' + escT(monthLabel(last.month)) + " net " + escT(fmtCr(last.net)) + " in equities. " +
        "These are <b>aggregates for the whole market</b>, FII only, published monthly by NSDL with a lag — not the daily tape.</p>" +
        '<div class="sm-share-row">' + shareBtn("sm_flows", "FII flows card") + "</div>" + asOfLine(fg);
    }
    html += '<div class="sm-sec-t">Daily FII / DII flows</div>' +
      (dg.ok ? '<p class="empty-note">Daily flow data is marked live by the pipeline.</p>' + asOfLine(dg)
             : unavailableBox("Daily FII / DII flows", dg, "The daily FII/DII numbers are published only on NSE's API, which blocks the free pipeline. Showing invented daily numbers would be worse than showing none."));
    html += '<div class="sm-sec-t">FPI sector-wise flows</div>' +
      unavailableBox("FPI sector-wise flows", dg, "NSDL's sector report sits behind a form-based flow that the free pipeline cannot fetch reliably yet.");
    return html;
  }

  /* ================= FUND HOUSE ENTITY ================= */
  function houseById(id) {
    var found = null;
    (S.houses || []).forEach(function (h) { if (h.id === id) found = h; });
    return found;
  }
  function followBtnHtml(id, big) {
    var fol = isFollowed(id);
    return '<button type="button" class="sm-follow-btn' + (fol ? " on" : "") + (big ? " sm-follow-big" : "") + '" data-sm-follow="' + escT(id) + '">' + (fol ? "★ Following" : "Follow") + "</button>";
  }
  function activityGroup(title, rows, cls) {
    if (!rows || !rows.length) return "";
    return '<div class="sm-sec-t">' + escT(title) + ' (' + rows.length + ')</div><div class="sm-act">' +
      rows.slice(0, 20).map(function (r) {
        return '<span class="sm-act-chip ' + cls + '">' + escT(r.sym) + (r.schemes != null ? " · " + fmtInt(r.schemes) + " sch" : "") + "</span>";
      }).join("") + "</div>";
  }
  function entityHtml(h, f) {
    var mf = gate("mfHoldings");
    var head = '<div class="sm-ent-head"><span class="sm-avatar sm-avatar-lg">' + escT(initials(h.name)) + "</span>" +
      '<div class="sm-ent-titles"><div class="sm-ent-name">' + escT(h.name) + "</div>" +
      '<div class="sm-house-sub">' + (h.schemeCount != null ? fmtInt(h.schemeCount) + " schemes in the AMFI list" : "") +
      (h.aliases.length > 1 ? " · also known as: " + escT(h.aliases.filter(function (a) { return a !== h.name; }).join(", ")) : "") + "</div></div>" +
      followBtnHtml(h.id, true) + "</div>";
    if (!mf.ok) return head + unavailableBox("This house's monthly activity", mf);
    if (!f) return head + '<div class="insx-skel"></div><div class="insx-skel"></div><p class="sm-asof">Loading this house\'s latest monthly disclosure…</p>';
    var html = head + asOfLine({ published: true, asOf: f.asOf || mf.asOf, source: f.source || mf.source, staleDaily: false });
    html += activityGroup("Bought / increased", f.activity.increases, "inc") +
      activityGroup("New entries", f.activity.newEntries, "new") +
      activityGroup("Reduced", f.activity.decreases, "red") +
      activityGroup("Sold out completely", f.activity.exits, "exit");
    if (!f.activity.increases.length && !f.activity.newEntries.length && !f.activity.decreases.length && !f.activity.exits.length) {
      html += '<p class="empty-note">No equity activity was parsed for this house in the latest month — either it had none, or its disclosure adapter is still being added (' + escT(mf.coverage || "partial coverage") + ").</p>";
    }
    if (f.topHoldings.length) {
      var maxV = Math.max.apply(null, f.topHoldings.map(function (r) { return r.valueLakh || 0; }).concat([1]));
      html += '<div class="sm-sec-t">Top holdings (by disclosed value)</div>' + f.topHoldings.slice(0, 10).map(function (r) {
        return barRow(r.sym + (r.name ? " — " + r.name : ""), (r.valueLakh || 0) / maxV * 100,
          r.valueLakh != null ? "₹" + (r.valueLakh / 100).toFixed(1) + " Cr" : (r.pctOfScheme != null ? r.pctOfScheme.toFixed(1) + "%" : "—"));
      }).join("");
    }
    if (f.sectors.length) {
      html += '<div class="sm-sec-t">Sector allocation</div>' + f.sectors.slice(0, 8).map(function (s) {
        return barRow(s.sector, s.pct || 0, s.pct != null ? s.pct.toFixed(1) + "%" : "—");
      }).join("");
    } else {
      html += '<div class="sm-sec-t">Sector allocation</div><p class="empty-note">Sector split is not in this house\'s free disclosure file yet.</p>';
    }
    /* Overlap with MY holdings — computed on-device. */
    var houseSyms = (f.holdings.length ? f.holdings : f.topHoldings).map(function (r) { return r.sym; });
    var ov = M.overlap(houseSyms, myRows());
    html += '<div class="sm-sec-t">Overlap with your portfolio</div>';
    if (!myRows().length) {
      html += '<p class="empty-note">Add holdings to see the overlap.</p>';
    } else if (!ov.common.length) {
      html += '<p class="empty-note">This house holds none of your stocks in its disclosed list.</p>';
    } else {
      html += '<p class="sm-overlap-line"><span class="ds-amt">' + escT(fmtInr(ov.value)) + "</span> of your portfolio (" + ov.pct.toFixed(1) + '%) sits in stocks this house also holds.</p>' +
        ov.common.slice(0, 10).map(function (c) {
          return '<div class="sm-lb-row"><span class="sm-lb-sym">' + escT(c.sym) + '</span><span class="sm-lb-name">your weight</span><b>' + c.weight.toFixed(1) + "%</b></div>";
        }).join("");
    }
    if (f.stakes.length) {
      html += '<div class="sm-sec-t">Stakes above 1% of a company</div>' + f.stakes.slice(0, 12).map(function (r) {
        return '<div class="sm-lb-row"><span class="sm-lb-sym">' + escT(r.sym) + '</span><span class="sm-lb-name">' + escT(r.name || "") + "</span><b>" + (r.pctOfStock != null ? r.pctOfStock.toFixed(2) + "%" : "—") + "</b></div>";
      }).join("");
    }
    var dg = gate("deals");
    html += '<div class="sm-sec-t">Deal history</div>' + (dg.ok ? '<p class="empty-note">No deals parsed for this house in the latest files.</p>' + asOfLine(dg) : unavailableBox("This house's bulk / block deals", dg));
    html += '<div class="sm-foot"><button type="button" class="btn small" data-sm-compare="' + escT(h.id) + '">Compare with another house</button>' +
      shareBtn("sm_fundact", "Fund activity card", null, h.id) +
      '<p class="sm-note">Activity is <b>inferred</b> from month-to-month disclosure changes. <b>Not investment advice.</b></p></div>';
    return html;
  }
  function renderEntity() {
    var el = sheetEl && sheetEl.querySelector("#smEntity");
    if (!el || !S.entityId) return;
    var h = houseById(S.entityId) || { id: S.entityId, name: S.entityId, aliases: [], schemeCount: null };
    el.innerHTML = entityHtml(h, S.houseFiles[S.entityId] || null);
    if (!S.houseFiles[S.entityId]) {
      loadHouseFile(S.entityId).then(function () { if (S.screen === "entity" && S.entityId) renderEntity(); });
    }
  }

  /* ================= COMPARE ================= */
  function compareCol(id) {
    var h = houseById(id) || { id: id, name: id, aliases: [], schemeCount: null };
    var f = S.houseFiles[id];
    if (!f) {
      loadHouseFile(id).then(function () { if (S.screen === "compare") renderCompare(); });
      return '<div class="sm-cmp-col"><div class="sm-ent-name">' + escT(h.name) + '</div><div class="insx-skel"></div></div>';
    }
    var a = f.activity;
    var houseSyms = (f.holdings.length ? f.holdings : f.topHoldings).map(function (r) { return r.sym; });
    var ov = M.overlap(houseSyms, myRows());
    var rows = [
      ["New entries", a.newEntries.length], ["Increased", a.increases.length],
      ["Reduced", a.decreases.length], ["Sold out", a.exits.length],
      ["Top holding", f.topHoldings.length ? f.topHoldings[0].sym : "—"],
      ["Overlap with you", ov.pct.toFixed(1) + "%"]
    ];
    return '<div class="sm-cmp-col"><div class="sm-ent-name">' + escT(h.name) + "</div>" +
      rows.map(function (r) { return '<div class="sm-cmp-row"><span>' + escT(r[0]) + "</span><b>" + escT(String(r[1])) + "</b></div>"; }).join("") +
      '<div class="sm-cmp-top">' + f.topHoldings.slice(0, 5).map(function (r) { return '<span class="sm-act-chip">' + escT(r.sym) + "</span>"; }).join("") + "</div></div>";
  }
  function renderCompare() {
    var el = sheetEl && sheetEl.querySelector("#smCompare");
    if (!el) return;
    var a = S.entityId, b = S.compareId;
    if (!b) {
      el.innerHTML = '<p class="sm-note">Compare <b>' + escT((houseById(a) || {}).name || a) + '</b> with another fund house:</p>' +
        '<div class="sm-search"><input type="search" id="smCmpSearch" class="ds-input" placeholder="Search a fund house…" value="' + escT(S.houseQuery) + '" aria-label="Search fund houses to compare"></div>' +
        (S.houses || []).filter(function (h) {
          if (h.id === a) return false;
          var q = S.houseQuery.trim().toLowerCase();
          return !q || h.name.toLowerCase().indexOf(q) >= 0 || h.aliases.some(function (x) { return x.toLowerCase().indexOf(q) >= 0; });
        }).slice(0, 40).map(function (h) {
          return '<button type="button" class="sm-lb-row sm-lb-btn" data-sm-cmp-pick="' + escT(h.id) + '"><span class="sm-avatar">' + escT(initials(h.name)) + '</span><span class="sm-lb-name">' + escT(h.name) + "</span></button>";
        }).join("");
      return;
    }
    el.innerHTML = '<div class="sm-cmp">' + compareCol(a) + compareCol(b) + "</div>" +
      '<p class="sm-note">Side by side from the same disclosure month. Activity is inferred from disclosure changes. Not investment advice.</p>';
  }

  /* ================= MATRIX ================= */
  var CELL = {
    holds: ["●", "var(--muted)", "Holds"],
    increased: ["▲", "var(--gain)", "Increased"],
    reduced: ["▼", "var(--loss)", "Reduced"],
    "new": ["✦", "var(--accent)", "New this month"],
    exited: ["✕", "var(--loss)", "Exited"],
    none: ["·", "var(--line)", "Does not hold"]
  };
  function renderMatrix() {
    var el = sheetEl && sheetEl.querySelector("#smMatrix");
    if (!el) return;
    var mf = gate("mfHoldings");
    if (!mf.ok) { el.innerHTML = unavailableBox("Who holds my stocks", mf); return; }
    var syms = heldSyms();
    if (!syms.length) { el.innerHTML = '<p class="empty-note">Add holdings first — the matrix maps your stocks against the fund houses that hold them.</p>'; return; }
    if (!S.feed) { el.innerHTML = '<div class="insx-skel"></div><p class="sm-asof">Loading…</p>'; return; }
    /* Top houses by coverage of MY stocks. */
    var cover = {};
    syms.forEach(function (s) {
      var f = S.stockFiles[s];
      if (!f) return;
      var seen = {};
      f.schemes.forEach(function (sc) { if ((sc.shares || 0) > 0 && sc.house) seen[sc.house] = 1; });
      Object.keys(seen).forEach(function (hid) { cover[hid] = (cover[hid] || 0) + 1; });
    });
    var houseIds = Object.keys(cover).sort(function (a, b) { return cover[b] - cover[a]; }).slice(0, 8);
    if (!houseIds.length) { el.innerHTML = '<p class="empty-note">No covered fund house holds your stocks in the latest disclosure month.</p>' + asOfLine(mf); return; }
    var cells = M.matrixCells(syms, houseIds, S.stockFiles);
    var head = '<tr><th class="sm-mx-corner">Stock</th>' + houseIds.map(function (hid) {
      var h = houseById(hid);
      return '<th><button type="button" class="sm-mx-h" data-sm-house="' + escT(hid) + '" title="' + escT(h ? h.name : hid) + '">' + escT(initials(h ? h.name : hid)) + "</button></th>";
    }).join("") + "</tr>";
    var body = syms.map(function (sym) {
      return "<tr><th class=\"sm-mx-sym\">" + escT(sym) + "</th>" + houseIds.map(function (hid) {
        var st = cells[sym][hid], c = CELL[st] || CELL.none;
        return '<td><button type="button" class="sm-mx-cell" data-sm-cell="' + escT(sym) + "|" + escT(hid) + "|" + st + '" style="color:' + c[1] + '" aria-label="' + escT(sym) + " — " + escT(c[2]) + '">' + c[0] + "</button></td>";
      }).join("") + "</tr>";
    }).join("");
    el.innerHTML = '<p class="sm-note">Rows are your stocks; columns are the fund houses holding most of them. Tap a house\'s initials to open it, or a cell for details.</p>' +
      '<div class="sm-mx-wrap"><table class="sm-mx"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
      '<div class="sm-mx-legend">' + Object.keys(CELL).map(function (k) { return '<span style="color:' + CELL[k][1] + '">' + CELL[k][0] + "</span> " + CELL[k][2]; }).join(" · ") + "</div>" +
      '<div id="smCellPop"></div>' +
      '<div class="sm-share-row">' + shareBtn("sm_portfolio", "Smart money in my portfolio") + "</div>" + asOfLine(mf);
  }
  function cellPopover(sym, hid, st) {
    var pop = sheetEl && sheetEl.querySelector("#smCellPop");
    if (!pop) return;
    var f = S.stockFiles[sym];
    var h = houseById(hid);
    var rows = f ? f.schemes.filter(function (s) { return (s.house || s.houseName) === hid; }) : [];
    var now = rows.reduce(function (a, s) { return a + ((s.shares || 0) > 0 ? 1 : 0); }, 0);
    var prev = rows.reduce(function (a, s) { return a + ((s.prevShares || 0) > 0 ? 1 : 0); }, 0);
    var net = rows.reduce(function (a, s) { return a + ((s.shares || 0) - (s.prevShares || 0)); }, 0);
    pop.innerHTML = '<div class="sm-pop"><div class="sm-pop-t">' + escT(sym) + " × " + escT(h ? h.name : hid) + ' <span class="sm-badge">' + escT((CELL[st] || CELL.none)[2]) + '</span></div>' +
      '<p>Schemes holding: ' + now + " (was " + prev + ") · net share change " + (net >= 0 ? "+" : "−") + escT(fmtShares(Math.abs(net))) + " — inferred from monthly disclosures.</p>" +
      '<button type="button" class="btn small" data-sm-house="' + escT(hid) + '">Open fund house</button> ' +
      '<button type="button" class="btn small" data-sm-pop-close="1">Close</button></div>';
    pop.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /* ================= DATA SOURCES & CREDITS ================= */
  var STATIC_SOURCES = [
    { name: "Yahoo Finance (delayed prices)", what: "Prices, charts and history across Folio", status: "Live in the app", asOf: null },
    { name: "Yahoo Finance — indices, currency & commodities", what: "Market Hub: Indian and world index levels, USD/INR, gold, silver, crude oil and bitcoin, plus the NIFTY 50 constituent prices behind the movers panel", status: "Live in the app", asOf: null },
    { name: "NSE holiday calendar (built-in list)", what: "Market Hub's India market open/closed line is worked out on your device from the IST clock, the weekday and a holiday list for 2026 stored in the app; regular hours are 9:15 AM – 3:30 PM IST", status: "Built into the app", asOf: null },
    { name: "AMFI — NAVAll.txt", key: "nav", what: "Mutual fund scheme list + daily NAV (official AMFI file)" },
    { name: "AMC monthly portfolio disclosures", key: "mfHoldings", what: "What each mutual fund scheme held at month-end (published by every AMC under SEBI rules)" },
    { name: "NSDL — FPI statistics", key: "fiiMonthly", what: "FII trade totals, monthly and lagged (official depository reports)" },
    { name: "mfapi.in (open API)", what: "Mutual Funds section: scheme search, NAV history, returns and past-SIP outcomes, from AMFI data; also the NAV history for the Smart Money mutual fund lookup", status: "Live in the app", asOf: null },
    { name: "NSE / BSE — shareholding pattern", key: "shareholding", what: "Promoter / FPI / DII / public split, named holders above 1%, pledge" },
    { name: "NSE / BSE — bulk & block deals", key: "deals", what: "Large reported trades, daily" },
    { name: "NSE / BSE — insider trading filings", key: "insider", what: "Promoter & insider buys and sells" },
    { name: "NSE — daily FII / DII", key: "flowsDaily", what: "Daily foreign & domestic institutional flows" }
  ];
  function sourcesHtml() {
    var rows = STATIC_SOURCES.map(function (s) {
      if (!s.key) {
        return '<div class="sm-src-row"><div class="sm-src-main"><b>' + escT(s.name) + '</b><span>' + escT(s.what) + '</span></div><span class="sm-badge sm-b-inc">' + escT(s.status) + "</span></div>";
      }
      var g = gate(s.key);
      var stTxt = !g.published ? "Not published yet" : (g.ok ? (g.status === "partial" ? "Partial" : (g.staleDaily ? "Stale" : "Live")) : "Unavailable");
      var stCls = !g.published ? "sm-b-flat" : (g.ok ? (g.staleDaily ? "sm-b-warn" : "sm-b-inc") : "sm-b-exit");
      var meta = [];
      if (g.asOf) meta.push("As of " + (g.asOf.length <= 7 ? monthLabel(g.asOf) : dateLabel(g.asOf)));
      if (g.coverage) meta.push(g.coverage);
      if (g.note) meta.push(g.note);
      return '<div class="sm-src-row"><div class="sm-src-main"><b>' + escT(s.name) + '</b><span>' + escT(s.what) + (meta.length ? " — " + escT(meta.join(" · ")) : "") + '</span></div><span class="sm-badge ' + stCls + '">' + stTxt + "</span></div>";
    }).join("");
    var upd = S.manifest && S.manifest.generatedAt ? '<p class="sm-asof">Pipeline last updated ' + escT(dateLabel(String(S.manifest.generatedAt).slice(0, 10))) + ".</p>" : '<p class="sm-asof">The pipeline has not published yet.</p>';
    return '<p class="sm-note">Folio is built only on free, official data. Exchange APIs currently block the free pipeline\'s servers, so a few datasets cannot be fetched at all — those are marked honestly instead of being filled with guesses.</p>' +
      rows + upd +
      '<div class="sm-sec-t">Your privacy</div><p class="sm-note">Smart Money files are public and static. Folio downloads a stock\'s file only when you hold, watch or open that stock, and does every comparison with your portfolio on this device. Your holdings, follows and alert choices never leave the device except inside your own encrypted Folio backup, like the rest of your settings.</p>';
  }
  function renderSources() {
    var el = sheetEl && sheetEl.querySelector("#smSources");
    if (el) el.innerHTML = sourcesHtml();
  }

  /* ================= SETTINGS (alerts + follows) ================= */
  function toggleRow(id, label, sub, on, disabled, note) {
    return '<label class="sm-set-row' + (disabled ? " sm-set-dis" : "") + '"><span class="sm-set-txt"><b>' + escT(label) + '</b><span>' + escT(sub) + (note ? ' <em>' + escT(note) + "</em>" : "") + '</span></span>' +
      '<span class="sm-switch"><input type="checkbox" data-sm-alert="' + id + '"' + (on ? " checked" : "") + (disabled ? " disabled" : "") + '><i></i></span></label>';
  }
  function renderSettings() {
    var el = sheetEl && sheetEl.querySelector("#smSettingsScr");
    if (!el) return;
    var s = smSettings(), a = s.alerts;
    var dg = gate("deals");
    var follows = s.follows.map(function (id) {
      var h = houseById(id);
      return '<div class="sm-lb-row"><span class="sm-avatar">' + escT(initials(h ? h.name : id)) + '</span><span class="sm-lb-name">' + escT(h ? h.name : id) + '</span><button type="button" class="sm-follow-btn on" data-sm-follow="' + escT(id) + '">Following</button></div>';
    }).join("");
    el.innerHTML =
      '<div class="sm-sec-t">Alerts — off by default</div>' +
      '<p class="sm-note">Alerts are worked out on this device from the downloaded disclosures when Folio opens. There is no server, so nothing can reach you while the app is closed.</p>' +
      toggleRow("mfChange", "Big MF holding change in my stocks", "A fund house's share count in a stock you hold moves by more than the threshold between two disclosures.", a.mfChange, false, "") +
      '<div class="sm-thr"><label for="smThr">Threshold</label><input type="number" id="smThr" class="ds-input" min="1" max="100" step="1" value="' + escT(String(a.thresholdPct)) + '"><span>% of the house\'s holding</span></div>' +
      toggleRow("followMoves", "Followed house enters or exits my stock", "A house you follow starts holding, or fully exits, a stock you hold.", a.followMoves, false, "") +
      toggleRow("deals", "Bulk / block deal in my stocks", "Needs the deals dataset.", a.deals, !dg.ok, dg.ok ? "" : "Data not available yet") +
      toggleRow("notify", "Browser notifications while Folio is open", "Uses the same permission as price alerts. Alerts always appear inside the app as well.", a.notify, false, "") +
      '<div class="sm-sec-t">Houses you follow</div>' +
      (follows || '<p class="empty-note">None yet — open the Funds tab and tap Follow on a house.</p>') +
      '<div class="sm-sec-t">Latest alerts</div>' +
      (S.alerts.length ? S.alerts.map(function (x) { return '<div class="sm-alert-row"><span>' + escT(x.text) + "</span></div>"; }).join("") : '<p class="empty-note">No alerts from the latest data.</p>');
  }

  /* ================= ALERTS ENGINE ================= */
  function evaluateAlerts(notify) {
    var s = smSettings();
    if (!S.feed) { S.alerts = []; return S.alerts; }
    S.alerts = M.evaluateAlerts(s.alerts, {
      feed: S.feed, follows: s.follows, asOf: S.alertsFeedAsOf || "",
      dealsAvailable: gate("deals").ok, dealHits: []
    });
    paintSignals();
    if (notify && s.alerts.notify && S.alerts.length) fireNotifications(S.alerts);
    return S.alerts;
  }
  function fireNotifications(alerts) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      var seen = {};
      try { seen = JSON.parse(localStorage.getItem("folio_sm_notified") || "{}"); } catch (e) {}
      var fresh = alerts.filter(function (a) { return !seen[a.key]; });
      fresh.slice(0, 3).forEach(function (a) {
        try { new Notification("Folio — Smart Money", { body: a.text, icon: "assets/folio-icon.svg" }); } catch (e) {}
        seen[a.key] = 1;
      });
      var keys = Object.keys(seen);
      if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(function (k) { delete seen[k]; });
      try { localStorage.setItem("folio_sm_notified", JSON.stringify(seen)); } catch (e) {}
    } catch (e) {}
  }
  /* Append the current alerts to the Insights Signals card (the features.js
     renderSignalsSync wrap calls this after every signals render). */
  function paintSignals() {
    try {
      var el = document.getElementById("insSignals");
      if (!el) return;
      var old = document.getElementById("smSigGroup");
      if (old) old.remove();
      if (!S.alerts.length) return;
      var div = document.createElement("div");
      div.className = "sig-group"; div.id = "smSigGroup";
      div.innerHTML = "<h4>Smart Money</h4>" + S.alerts.slice(0, 4).map(function (a) {
        return '<div class="insight-row"><span>' + escT(a.text) + '</span></div>';
      }).join("");
      el.appendChild(div);
    } catch (e) {}
  }
  /* Silent evaluation from CACHED data only (app-open idle path driven by
     the features.js hook; runs only when the user turned alerts on). */
  function evaluateCached(opts) {
    opts = opts || {};
    return getManifest(null).then(function () {
      var mf = gate("mfHoldings");
      if (!mf.ok) return [];
      var syms = heldSyms();
      return Promise.all(syms.map(function (s) { return loadStockFile(s); })).then(function () {
        var bySym = {};
        syms.forEach(function (s) { if (S.stockFiles[s]) bySym[s] = S.stockFiles[s]; });
        S.feed = M.buildFeed(syms, bySym, smSettings().follows);
        S.alertsFeedAsOf = mf.asOf;
        return evaluateAlerts(!!opts.notify);
      });
    }).catch(function () { return []; });
  }

  /* ================= STOCK TAB — "WHO OWNS IT" ================= */
  function ownersSummaryLine(sym, file, totals) {
    var mf = gate("mfHoldings");
    var when = monthLabel(file.asOf || mf.asOf);
    if (!totals.schemesNow && !totals.schemesPrev) return "No covered mutual fund scheme held " + sym + " at " + when + ".";
    var dir = totals.sharesNow > totals.sharesPrev ? "funds added on balance" : (totals.sharesNow < totals.sharesPrev ? "funds trimmed on balance" : "funds held steady");
    return totals.schemesNow + " scheme" + (totals.schemesNow === 1 ? "" : "s") + " from " + totals.housesNow + " fund house" + (totals.housesNow === 1 ? "" : "s") +
      " held " + sym + " at " + when + " (was " + totals.schemesPrev + " schemes) — " + dir + ". Inferred from monthly disclosures.";
  }
  function renderOwners(sym, pane) {
    if (!pane) return;
    pane.innerHTML = '<div class="insx-skel"></div><div class="insx-skel"></div><p class="sm-asof">Loading who owns ' + escT(sym) + "…</p>";
    getManifest(function () { renderOwners(sym, pane); }).then(function () {
      var mf = gate("mfHoldings");
      var sg = gate("shareholding"), ig = gate("insider"), dg = gate("deals");
      var html = "";
      if (!mf.ok) {
        html += unavailableBox("Mutual fund holders of " + sym, mf);
      } else {
        return loadStockFile(sym).then(function (file) {
          if (!file || (!file.schemes.length && !file.history)) {
            html += '<p class="empty-note">No mutual fund data for ' + escT(sym) + " yet — it may sit outside the covered universe (NIFTY 500 + BSE 500), or no covered fund held it in the latest month.</p>" + asOfLine(mf);
          } else {
            var totals = M.stockTotals(file);
            html += '<p class="sm-own-summary">' + escT(ownersSummaryLine(sym, file, totals)) + "</p>";
            if (file.history && file.history.length > 1) {
              var counts = file.history.map(function (h) { return h.schemeCount; }).filter(function (v) { return v != null; });
              if (counts.length > 1) {
                html += '<div class="sm-sec-t">Schemes holding this stock</div><div class="sm-trend">' + sparkOf(counts) +
                  '<span class="sm-asof">' + escT(monthLabel(file.history[0].month)) + " → " + escT(monthLabel(file.history[file.history.length - 1].month)) + " · now " + counts[counts.length - 1] + " schemes</span></div>";
              }
            }
            /* MF holders grouped by house */
            var byHouse = {};
            file.schemes.forEach(function (s) {
              var hid = s.house || s.houseName || "?";
              (byHouse[hid] = byHouse[hid] || { name: s.houseName || hid, rows: [] }).rows.push(s);
            });
            var houseIds = Object.keys(byHouse).sort(function (a, b) {
              var ta = byHouse[a].rows.reduce(function (x, s) { return x + (s.shares || 0); }, 0);
              var tb = byHouse[b].rows.reduce(function (x, s) { return x + (s.shares || 0); }, 0);
              return tb - ta;
            });
            html += '<div class="sm-sec-t">Mutual fund holders</div>' + houseIds.map(function (hid) {
              var g = byHouse[hid];
              var now = g.rows.reduce(function (x, s) { return x + (s.shares || 0); }, 0);
              var prev = g.rows.reduce(function (x, s) { return x + (s.prevShares || 0); }, 0);
              var net = now - prev;
              return '<div class="sm-holder"><button type="button" class="sm-holder-head" data-sm-house="' + escT(hid) + '">' +
                '<span class="sm-avatar">' + escT(initials(g.name)) + '</span><span class="sm-holder-name">' + escT(g.name) + "</span>" +
                '<span class="sm-holder-net ' + (net > 0 ? "pos" : (net < 0 ? "neg" : "flat")) + '">' + (net === 0 ? "steady" : (net > 0 ? "▲ " : "▼ ") + fmtShares(Math.abs(net)) + " sh") + "</span></button>" +
                g.rows.slice().sort(function (a, b) { return (b.shares || 0) - (a.shares || 0); }).map(function (s) {
                  return '<div class="sm-scheme-row"><span class="sm-scheme-name">' + escT(s.scheme) + "</span>" +
                    '<span class="sm-scheme-meta">' + (s.shares != null ? fmtShares(s.shares) + " sh" : "") +
                    (s.pctOfScheme != null ? " · " + s.pctOfScheme.toFixed(2) + "% of scheme" : "") + "</span>" +
                    badge(s.change) + (s.corpAction ? ' <span class="sm-badge sm-b-warn">Check corporate action</span>' : "") + "</div>";
                }).join("") + "</div>";
            }).join("");
            html += asOfLine(mf, "Inferred from monthly disclosures");
            html += '<div class="sm-share-row">' + shareBtn("sm_whoowns", "Who owns this stock", sym) + shareBtn("sm_trend", "Ownership trend", sym) + "</div>";
          }
          html += reservedSections(sym, sg, ig, dg);
          pane.innerHTML = html;
          fillReserved(sym, pane);
        });
      }
      html += reservedSections(sym, sg, ig, dg);
      pane.innerHTML = html;
      fillReserved(sym, pane);
    }).catch(function () {
      pane.innerHTML = '<p class="empty-note">Smart Money data could not be loaded right now.</p>';
    });
  }
  function reservedSections(sym, sg, ig, dg) {
    var html = '<div class="sm-sec-t">Ownership split — promoter / FPI / DII / public</div>';
    html += sg.ok
      ? '<div id="smOwnSplit-' + escT(sym) + '"><p class="sm-asof">Shareholding is marked live — loading…</p></div>'
      : unavailableBox("Quarterly shareholding for " + sym, sg);
    html += '<div class="sm-sec-t">Promoter pledge</div>';
    html += sg.ok ? '<div id="smPledge-' + escT(sym) + '"><p class="sm-asof">Pledge trend loads with the shareholding file.</p></div>' : unavailableBox("Promoter pledge trend for " + sym, sg);
    html += '<div class="sm-sec-t">Insider & promoter trades</div>';
    html += ig.ok ? '<div id="smInsider-' + escT(sym) + '"><p class="sm-asof">Loading…</p></div>' : unavailableBox("Insider trades in " + sym, ig);
    html += '<div class="sm-sec-t">Bulk & block deals</div>';
    html += dg.ok ? '<div id="smDeals-' + escT(sym) + '"><p class="sm-asof">Loading…</p></div>' : unavailableBox("Bulk & block deals in " + sym, dg);
    return html;
  }
  /* Reserved-schema renderers — written against the feasibility contract
     so the sections light up unchanged if the data ever publishes. */
  function renderShareholdingInto(sym, fileRaw, splitEl, pledgeEl) {
    if (!fileRaw) { if (splitEl) splitEl.innerHTML = '<p class="empty-note">No shareholding file for this stock yet.</p>'; return; }
    var quarters = (fileRaw.quarters || []).map(function (q) {
      return { quarter: q.quarter || q.q || "", promoter: num(q.promoter), fpi: num(q.fpi), dii: num(q.dii), mf: num(q.mf), public: num(q.public), pledge: num(q.pledge) };
    });
    if (splitEl) {
      var latest = quarters[quarters.length - 1] || {};
      var prev = quarters[quarters.length - 2] || {};
      var chips = [["Promoter", latest.promoter, prev.promoter], ["FPI", latest.fpi, prev.fpi], ["DII / MF", latest.dii != null ? latest.dii : latest.mf, prev.dii != null ? prev.dii : prev.mf], ["Public", latest.public, prev.public]]
        .filter(function (c) { return c[1] != null; })
        .map(function (c) {
          var d = (c[1] != null && c[2] != null) ? c[1] - c[2] : null;
          return '<span class="sm-own-chip">' + c[0] + " <b>" + c[1].toFixed(1) + "%</b>" + (d != null ? ' <span class="' + (d >= 0 ? "pos" : "neg") + '">' + fmtPct(d) + " QoQ</span>" : "") + "</span>";
        }).join("");
      splitEl.innerHTML = ownershipSvg(quarters) + '<div class="sm-own-chips">' + chips + "</div>" +
        ((fileRaw.holders || []).length ? '<div class="sm-sec-t">Named holders above 1%</div>' + fileRaw.holders.map(function (h) {
          return '<div class="sm-lb-row"><span class="sm-lb-name">' + escT(h.name || "") + "</span><b>" + (num(h.pct) != null ? num(h.pct).toFixed(2) + "%" : "—") + "</b></div>";
        }).join("") : "");
    }
    if (pledgeEl) {
      var pl = quarters.map(function (q) { return q.pledge; }).filter(function (v) { return v != null; });
      pledgeEl.innerHTML = pl.length ? '<div class="sm-trend">' + sparkOf(pl) + '<span class="sm-asof">Promoter pledge: ' + pl[pl.length - 1].toFixed(1) + "% of promoter holding (latest quarter)</span></div>" : '<p class="empty-note">No pledge data in the shareholding file.</p>';
    }
  }

  function findById(root, id) {
    var all = root.querySelectorAll("[id]");
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  /* When a reserved dataset is marked live by the manifest, fetch its
     per-stock file and paint it with the reserved-schema renderers. */
  function fillReserved(sym, pane) {
    var sg = gate("shareholding"), ig = gate("insider"), dg = gate("deals");
    if (sg.ok) {
      loadData("shareholding/" + encodeURIComponent(sym) + ".json", null).then(function (r) {
        renderShareholdingInto(sym, r.data,
          findById(pane, "smOwnSplit-" + sym), findById(pane, "smPledge-" + sym));
      }).catch(function () {});
    }
    if (ig.ok) {
      loadData("insider/" + encodeURIComponent(sym) + ".json", null).then(function (r) {
        var el = findById(pane, "smInsider-" + sym);
        if (!el) return;
        var trades = (r.data && (r.data.trades || r.data.rows)) || [];
        el.innerHTML = trades.length ? trades.slice(0, 20).map(function (t) {
          return '<div class="sm-lb-row"><span class="sm-lb-name">' + escT(t.person || t.name || "") + " · " + escT(t.category || "") + '</span><span>' + escT(t.type || t.transaction || "") + " " + fmtShares(num(t.qty)) + " sh" + (num(t.price) != null ? " @ " + fmtInr2(num(t.price)) : "") + '</span><span class="sm-asof">' + escT(dateLabel(t.date)) + "</span></div>";
        }).join("") : '<p class="empty-note">No insider trades in the latest file for this stock.</p>';
      }).catch(function () {});
    }
    if (dg.ok && dg.asOf) {
      loadData("deals/" + encodeURIComponent(dg.asOf) + ".json", null).then(function (r) {
        var el = findById(pane, "smDeals-" + sym);
        if (!el) return;
        var all = (r.data && (r.data.deals || r.data.rows)) || [];
        var mine = all.filter(function (d) { return String(d.sym || d.symbol || "") === sym; });
        el.innerHTML = mine.length ? mine.map(function (d) {
          return '<div class="sm-lb-row"><span class="sm-lb-name">' + escT(d.client || d.name || "") + '</span><span>' + escT(d.side || "") + " " + fmtShares(num(d.qty)) + " sh" + (num(d.price) != null ? " @ " + fmtInr2(num(d.price)) : "") + '</span><span class="sm-badge">' + escT(d.type || "bulk") + "</span>" +
            '<button type="button" class="sm-share-mini" data-sm-share="sm_deal" data-sm-sym="' + escT(sym) + '" data-sm-client="' + escT(d.client || d.name || "") + '" data-sm-side="' + escT(d.side || "") + '" data-sm-qty="' + (num(d.qty) != null ? num(d.qty) : "") + '" data-sm-price="' + (num(d.price) != null ? num(d.price) : "") + '" data-sm-date="' + escT(d.date || dg.asOf || "") + '" data-sm-dtype="' + escT(d.type || "bulk") + '">Share</button></div>';
        }).join("") : '<p class="empty-note">No bulk/block deals in this stock on the latest deal date (' + escT(dateLabel(dg.asOf)) + ").</p>";
      }).catch(function () {});
    }
  }

  /* ================= OPEN / WIRING ================= */
  function openSmartMoney(opts) {
    opts = opts || {};
    if (!sheetEl) sheetEl = buildSheet();
    S.sheetOpen = true;
    sheetEl.classList.remove("hidden");
    S.navStack = [];
    subToks = [];
    if (opts.screen === "sources") { getManifest(null).then(function () { goScreen("sources"); }); showScreen("home"); renderHome(); loadHomeData(); return; }
    showScreen("home");
    renderHome();
    loadHomeData();
  }
  function paintEntryMeta() {
    try {
      var el = document.getElementById("smEntryMeta");
      if (!el) return;
      if (!S.manifest) { el.textContent = "Data not available yet — the pipeline has not published."; return; }
      var mf = gate("mfHoldings");
      el.textContent = mf.ok
        ? "MF disclosures: " + monthLabel(mf.asOf) + (mf.coverage ? " · " + mf.coverage : "") + " · tap to explore"
        : "Some datasets are not available in free data yet — tap to see coverage.";
    } catch (e) {}
  }
  function wire(m) {
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#smClose")) { m.classList.add("hidden"); S.sheetOpen = false; return; }
      if (t.closest("#smBack")) { goBack(); return; }
      if (t.closest("#smGear")) { S.navStack.push(S.screen); pushSub(); renderSettings(); showScreen("settings"); return; }
      var chip = t.closest("[data-sm-chip]");
      if (chip) { S.chip = chip.dataset.smChip; S.feedShown = 60; renderHome(); return; }
      var more = t.closest("[data-sm-more]");
      if (more) { S.feedShown += 60; renderHome(); return; }
      var fol = t.closest("[data-sm-follow]");
      if (fol) {
        var id = fol.dataset.smFollow;
        setFollow(id, !isFollowed(id));
        if (S.feed) S.feed = M.buildFeed(S.feedSyms, S.stockFiles, smSettings().follows);
        evaluateAlerts(false);
        rerender();
        try { toast(isFollowed(id) ? "Following — its moves in your stocks will surface in the Smart Money feed." : "Unfollowed."); } catch (err) {}
        return;
      }
      var house = t.closest("[data-sm-house]");
      if (house) { goScreen("entity", house.dataset.smHouse); return; }
      var goto = t.closest("[data-sm-goto]");
      if (goto) { goScreen(goto.dataset.smGoto); return; }
      var cmp = t.closest("[data-sm-compare]");
      if (cmp) { S.compareId = null; S.houseQuery = ""; goScreen("compare"); return; }
      var pick = t.closest("[data-sm-cmp-pick]");
      if (pick) { S.compareId = pick.dataset.smCmpPick; renderCompare(); return; }
      var cell = t.closest("[data-sm-cell]");
      if (cell) { var parts = cell.dataset.smCell.split("|"); cellPopover(parts[0], parts[1], parts[2]); return; }
      if (t.closest("[data-sm-pop-close]")) { var pop = sheetEl.querySelector("#smCellPop"); if (pop) pop.innerHTML = ""; return; }
      var stk = t.closest("[data-sm-stock]");
      if (stk) {
        var sym = stk.dataset.smStock;
        m.classList.add("hidden"); S.sheetOpen = false;
        try { if (typeof openStock === "function") openStock(sym); } catch (err) {}
        return;
      }
    });
    m.addEventListener("input", function (e) {
      if (e.target.id === "smHouseSearch") {
        S.houseQuery = e.target.value;
        var pos = e.target.selectionStart;
        renderHome();
        var s2 = sheetEl.querySelector("#smHouseSearch");
        if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (err) {} }
        return;
      }
      if (e.target.id === "smCmpSearch") {
        S.houseQuery = e.target.value;
        var pos2 = e.target.selectionStart;
        renderCompare();
        var s3 = sheetEl.querySelector("#smCmpSearch");
        if (s3) { s3.focus(); try { s3.setSelectionRange(pos2, pos2); } catch (err) {} }
        return;
      }
    });
    m.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.smAlert) {
        var s = smSettings();
        var key = t.dataset.smAlert;
        if (key === "notify" && t.checked) {
          try {
            if ("Notification" in window && Notification.permission === "default") {
              Notification.requestPermission().then(function (p) {
                if (p !== "granted") { try { toast("Notifications are blocked in the browser settings — alerts will still show inside Folio."); } catch (err) {} }
              });
            } else if ("Notification" in window && Notification.permission === "denied") {
              try { toast("Notifications are blocked in the browser settings — alerts will still show inside Folio."); } catch (err) {}
            }
          } catch (err) {}
        }
        s.alerts[key] = t.checked;
        smSave();
        evaluateAlerts(false);
        renderSettings();
        return;
      }
      if (t.id === "smThr") {
        var v = parseFloat(t.value);
        if (Number.isFinite(v) && v > 0 && v <= 100) { smSettings().alerts.thresholdPct = v; smSave(); evaluateAlerts(false); }
        return;
      }
    });
  }

  /* ================= PART 2: SHARE BUTTONS + REPORT/SHARE/CHART DATA HOOKS =================
     Everything below REUSES the Part 1 loaders and cache — no second
     fetch path exists. The hooks resolve null (never throw) when the
     manifest or a dataset is unavailable, so report.js / share.js /
     the chart decorator can degrade to their honest states. */

  function shareBtn(type, label, sym, houseId) {
    return '<button type="button" class="btn small sm-share-btn" data-sm-share="' + type + '"' +
      (sym ? ' data-sm-sym="' + escT(sym) + '"' : "") +
      (houseId ? ' data-sm-house="' + escT(houseId) + '"' : "") + ">Share — " + escT(label) + "</button>";
  }
  /* One delegated listener for every Smart Money share button (home
     feed, leaderboards, flows, entity page, Who-Owns tab, matrix,
     per-deal rows). Opens the EXISTING share sheet pre-selected to the
     matching Smart Money type, with a context object. */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-sm-share]") : null;
    if (!b) return;
    var opts = { type: b.dataset.smShare };
    if (b.dataset.smSym) opts.symbol = b.dataset.smSym;
    var sm = {};
    if (b.dataset.smHouse) sm.houseId = b.dataset.smHouse;
    if (b.dataset.smSide) {
      sm.deal = {
        sym: b.dataset.smSym || "", client: b.dataset.smClient || "", side: b.dataset.smSide,
        qty: num(b.dataset.smQty), price: num(b.dataset.smPrice),
        date: b.dataset.smDate || "", type: b.dataset.smDtype || "bulk"
      };
    }
    if (Object.keys(sm).length) opts.sm = sm;
    if (typeof window.openShareSheet === "function") window.openShareSheet(opts);
  });

  /* Manifest gates only — the cheap check the report options sheet and
     the share type picker use to label/hide unavailable types. */
  function smGates() {
    return getManifest(null).then(function (man) {
      if (!man) return null;
      function g(k) { var x = M.gate(man, k); return { ok: x.ok, status: x.status, asOf: x.asOf, published: x.published }; }
      return {
        mf: g("mfHoldings"), fii: g("fiiMonthly"), deals: g("deals"), shareholding: g("shareholding"),
        generatedAt: man.generatedAt || null
      };
    }).catch(function () { return null; });
  }

  /* Chart overlay data for one stock: the MF monthly history plus —
     only when the deals dataset is live — that stock's deal rows from
     the latest deals file (the same file the Who-Owns tab reads). */
  function stockOverlayData(sym) {
    return getManifest(null).then(function (man) {
      if (!man) return null;
      var gm = M.gate(man, "mfHoldings"), gd = M.gate(man, "deals");
      var out = { mfAvailable: gm.ok, mfAsOf: gm.asOf, dealsAvailable: gd.ok, history: [], deals: null };
      var jobs = [];
      if (gm.ok) {
        jobs.push(loadStockFile(sym).then(function (f) { if (f) out.history = f.history || []; }));
      }
      if (gd.ok && gd.asOf) {
        jobs.push(loadData("deals/" + encodeURIComponent(gd.asOf) + ".json", null).then(function (r) {
          var all = (r.data && (r.data.deals || r.data.rows)) || [];
          out.deals = all.filter(function (d) { return String(d.sym || d.symbol || "") === sym; }).map(function (d) {
            return {
              date: d.date || gd.asOf, side: d.side || "", qty: num(d.qty), price: num(d.price),
              type: d.type || "bulk", client: d.client || d.name || ""
            };
          });
        }).catch(function () { out.deals = null; }));
      }
      return Promise.all(jobs).then(function () { return out; });
    }).catch(function () { return null; });
  }

  /* The report/share bundle: gates + everything the PDF section and
     the eight Smart Money share cards need, assembled from the same
     cached loaders the screens use. Per-file accessors stay attached
     so share cards can pull ONE stock/house file on demand (opened-
     stock discipline preserved — nothing extra is fetched). */
  function forReport() {
    return getManifest(null).then(function (man) {
      if (!man) return null;
      var gm = M.gate(man, "mfHoldings"), gf = M.gate(man, "fiiMonthly"),
          gd = M.gate(man, "deals"), gs = M.gate(man, "shareholding");
      var out = {
        generatedAt: man.generatedAt || null,
        mfAvailable: gm.ok, mfAsOf: gm.asOf, mfStatus: gm.status, mfCoverage: gm.coverage || null,
        fiiAvailable: gf.ok, fiiAsOf: gf.asOf,
        dealsAvailable: gd.ok, dealsAsOf: gd.asOf,
        shareholdingAvailable: gs.ok, shareholdingAsOf: gs.asOf,
        myStocks: [], feed: [], leaderboards: null, flows: null, houses: [], overlap: null,
        stockFile: function (sym) { return loadStockFile(sym); },
        houseFile: function (id) { return loadHouseFile(id); }
      };
      var jobs = [];
      if (gm.ok) {
        var syms = heldSyms();
        jobs.push(Promise.all(syms.map(function (s) { return loadStockFile(s); })).then(function () {
          var bySym = {}, rowBySym = {};
          myRows().forEach(function (r) { rowBySym[r.sym] = r; });
          var ovVal = 0, ovCount = 0, totVal = 0;
          syms.forEach(function (s) {
            var f = S.stockFiles[s];
            if (!f) return;
            bySym[s] = f;
            var t = M.stockTotals(f);
            var netPct = t.sharesPrev > 0 ? (t.sharesNow - t.sharesPrev) / t.sharesPrev * 100 : (t.sharesNow > 0 ? 100 : null);
            out.myStocks.push({
              sym: s, name: f.name || (rowBySym[s] && rowBySym[s].name) || "",
              houses: t.housesNow, schemesNow: t.schemesNow, schemesPrev: t.schemesPrev,
              mfPct: f.mfPct, sharesNow: t.sharesNow, sharesPrev: t.sharesPrev,
              netPct: netPct, direction: M.stockDirection(t), counts: t.counts, history: f.history || []
            });
            var r = rowBySym[s];
            if (r) {
              totVal += r.cur || 0;
              if (t.schemesNow > 0) { ovVal += r.cur || 0; ovCount++; }
            }
          });
          out.feed = M.buildFeed(syms, bySym, smSettings().follows);
          if (totVal > 0) out.overlap = { value: ovVal, pct: ovVal / totVal * 100, count: ovCount };
        }));
        jobs.push(loadLeaderboards().then(function (lb) { out.leaderboards = lb; }));
        jobs.push(loadHouses().then(function (h) { out.houses = h || []; }));
      }
      if (gf.ok) jobs.push(loadFlows().then(function (fl) { out.flows = fl; }));
      return Promise.all(jobs).then(function () { return out; });
    }).catch(function () { return null; });
  }

  window.FolioSmartMoney = {
    open: openSmartMoney,
    renderOwners: renderOwners,
    evaluateCached: evaluateCached,
    paintSignals: paintSignals,
    paintEntryMeta: paintEntryMeta,
    forReport: forReport,
    gates: smGates,
    stockOverlayData: stockOverlayData,
    _state: S
  };
})();
