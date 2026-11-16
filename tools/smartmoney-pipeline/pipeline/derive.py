"""Derive step: turn two monthly snapshots into the contract's mf/ files.

Change classes are INFERRED from the difference between two monthly
disclosures — they are not trade data. Every emitted file says so, in the
brief's own honesty terms: a split or bonus inflates the share count and
can look like buying, so the basis note tells the app to flag
"check corporate action" where a change is large.
"""
from __future__ import annotations

from collections import Counter, defaultdict

from .collectors.amc.base import month_end_iso

SOURCE = "AMC monthly portfolio disclosures"


def _key(r):
    return (r["house"], r["schemeName"], r["isin"])


def _change_class(cur, prev):
    if prev is None:
        return "new"
    if cur is None:
        return "exited"
    if cur > prev:
        return "increased"
    if cur < prev:
        return "reduced"
    return "unchanged"


def derive(cur_rows, prev_rows, year, month, isin_map, prices,
           house_names, adapted_houses, prev_houses_ok=None):
    """prices: {symbol: {close,...}} from bhav-lite.
    prev_houses_ok: houses that were freshly collected in the previous
    month too. Houses without a previous-month baseline (first month an
    adapter ran) get NO change classes — their holdings are new to this
    pipeline's data, which is not the same as a new position.
    Returns (stock_docs, house_docs, leaderboards_doc)."""
    as_of = month_end_iso(year, month)
    has_prev = prev_rows is not None
    if prev_houses_ok is None:
        prev_houses_ok = {r["house"] for r in (prev_rows or [])}
    cur_by_key = {_key(r): r for r in cur_rows}
    prev_by_key = {_key(r): r for r in prev_rows} if has_prev else {}

    if has_prev:
        basis = ("Changes INFERRED from the difference between the "
                 f"{_prev_label(year, month)} and {as_of} monthly "
                 "disclosures; not trade data. Share splits / bonuses "
                 "increase share counts without any buying — check "
                 "corporate actions before reading a large increase as "
                 "accumulation.")
    else:
        basis = ("First month collected by this pipeline — no previous "
                 "disclosure on file, so no month-over-month changes yet.")

    # ---- per-stock files -------------------------------------------------
    isins = {r["isin"] for r in cur_rows} | {r["isin"] for r in (prev_rows or [])}
    stock_docs = {}
    # aggregate per-ISIN share deltas for leaderboards
    delta_by_isin: dict[str, float] = defaultdict(float)
    new_by_isin: Counter = Counter()
    exit_by_isin: Counter = Counter()
    inc_schemes_by_isin: dict[str, set] = defaultdict(set)

    for isin in isins:
        sym = isin_map.get(isin)
        if not sym:
            continue  # not in the bhavcopy universe (unlisted / odd ISIN)
        cur_h = [r for r in cur_rows if r["isin"] == isin]
        prev_h = { _key(r): r for r in (prev_rows or []) if r["isin"] == isin }
        holders = []
        tot_now = tot_prev = 0.0
        for r in cur_h:
            prev = prev_h.pop(_key(r), None)
            baseline_ok = has_prev and r["house"] in prev_houses_ok
            prev_shares = prev["shares"] if (prev and baseline_ok) else None
            cls = _change_class(r["shares"], prev_shares) \
                if baseline_ok else None
            tot_now += r["shares"]
            if prev and baseline_ok:
                tot_prev += prev["shares"]
            if baseline_ok:
                d = r["shares"] - (prev_shares or 0)
                delta_by_isin[isin] += d
                if cls == "new":
                    new_by_isin[isin] += 1
                    inc_schemes_by_isin[isin].add(_key(r))
                elif cls == "increased":
                    inc_schemes_by_isin[isin].add(_key(r))
            holders.append({
                "scheme": r["schemeName"], "house": r["house"],
                "houseName": house_names.get(r["house"], r["house"]),
                "shares": r["shares"], "pctOfScheme": r["pctOfScheme"],
                "marketValueLakh": r["marketValueLakh"],
                "prevShares": prev_shares, "changeClass": cls,
            })
        for prev in prev_h.values():  # exited holders
            if prev["house"] not in prev_houses_ok:
                continue
            tot_prev += prev["shares"]
            if has_prev:
                delta_by_isin[isin] -= prev["shares"]
                exit_by_isin[isin] += 1
            holders.append({
                "scheme": prev["schemeName"], "house": prev["house"],
                "houseName": house_names.get(prev["house"], prev["house"]),
                "shares": 0, "pctOfScheme": 0, "marketValueLakh": 0,
                "prevShares": prev["shares"], "changeClass": "exited",
            })
        holders.sort(key=lambda h: -(h["marketValueLakh"] or 0))
        name = (cur_h[0]["stockName"] if cur_h else
                (list(prev_h.values())[0]["stockName"] if prev_h else sym))
        n_prev_schemes = None
        if has_prev:
            n_prev_schemes = len({(r["house"], r["schemeName"])
                                  for r in (prev_rows or [])
                                  if r["isin"] == isin})
        stock_docs[sym] = {
            "symbol": sym, "isin": isin, "name": name, "asOf": as_of,
            "source": SOURCE, "changeBasis": basis,
            "holders": holders,
            "totals": {
                "schemesNow": len(cur_h),
                "schemesPrev": n_prev_schemes,
                "totalSharesNow": tot_now,
                "totalSharesPrev": tot_prev if has_prev else None,
                "netShareChange": (tot_now - tot_prev) if has_prev else None,
                "totalValueLakh": sum(h["marketValueLakh"] or 0
                                      for h in holders),
            },
        }

    # ---- per-house files ---------------------------------------------------
    house_docs = {}
    for hid in adapted_houses:
        h_cur = [r for r in cur_rows if r["house"] == hid]
        if not h_cur:
            continue
        by_isin: dict[str, dict] = {}
        for r in h_cur:
            agg = by_isin.setdefault(r["isin"], {
                "isin": r["isin"], "symbol": isin_map.get(r["isin"]),
                "name": r["stockName"], "shares": 0.0,
                "valueLakh": 0.0, "schemes": set()})
            agg["shares"] += r["shares"]
            agg["valueLakh"] += r["marketValueLakh"] or 0
            agg["schemes"].add(r["schemeName"])
        top_holdings = sorted(by_isin.values(),
                              key=lambda a: -a["valueLakh"])[:20]
        for t in top_holdings:
            t["schemes"] = len(t["schemes"])
        sector: dict[str, float] = defaultdict(float)
        total_val = 0.0
        for r in h_cur:
            v = r["marketValueLakh"] or 0
            sector[r["industry"] or "Unknown"] += v
            total_val += v
        sector_split = [{"industry": k,
                         "pctOfEquityValue": round(v / total_val * 100, 2)
                         if total_val else None}
                        for k, v in sorted(sector.items(),
                                           key=lambda kv: -kv[1])[:12]]
        activity = None
        if has_prev and hid in prev_houses_ok:
            h_prev = {_key(r): r for r in prev_rows if r["house"] == hid}
            new_e, exits = [], []
            inc, dec = [], []
            for r in h_cur:
                prev = h_prev.pop(_key(r), None)
                if prev is None:
                    new_e.append({"scheme": r["schemeName"],
                                  "symbol": isin_map.get(r["isin"]),
                                  "isin": r["isin"]})
                else:
                    d = r["shares"] - prev["shares"]
                    if d > 0:
                        inc.append((r, d))
                    elif d < 0:
                        dec.append((r, d))
            for prev in h_prev.values():
                exits.append({"scheme": prev["schemeName"],
                              "symbol": isin_map.get(prev["isin"]),
                              "isin": prev["isin"]})

            def _rank(pairs):
                out = []
                for r, d in pairs:
                    sym = isin_map.get(r["isin"])
                    close = (prices.get(sym) or {}).get("close") \
                        if sym else None
                    out.append({
                        "scheme": r["schemeName"], "symbol": sym,
                        "isin": r["isin"], "shareChange": d,
                        "estValueChangeCr": round(d * close / 1e7, 2)
                        if close else None})
                out.sort(key=lambda x: -abs(x["shareChange"]))
                return out[:15]

            activity = {"newEntries": new_e[:50], "exits": exits[:50],
                        "topIncreases": _rank(inc), "topDecreases": _rank(dec)}
        house_docs[hid] = {
            "houseId": hid, "name": house_names.get(hid, hid),
            "asOf": as_of, "source": SOURCE,
            "schemesReporting": len({r["schemeName"] for r in h_cur}),
            "stocksHeld": len(by_isin),
            "topHoldings": top_holdings, "sectorSplit": sector_split,
            "activity": activity,
        }

    # ---- leaderboards -------------------------------------------------------
    leaderboards = None
    if has_prev:
        def _est(isin):
            sym = isin_map.get(isin)
            close = (prices.get(sym) or {}).get("close") if sym else None
            d = delta_by_isin.get(isin, 0.0)
            return {"symbol": sym, "isin": isin,
                    "netShareChange": d,
                    "estValueChangeCr": round(d * close / 1e7, 2)
                    if close else None}

        ranked = sorted(delta_by_isin.items(), key=lambda kv: kv[1])
        buys = [_est(i) for i, d in reversed(ranked) if d > 0][:15]
        sells = [_est(i) for i, d in ranked if d < 0][:15]
        leaderboards = {
            "asOf": as_of, "source": SOURCE,
            "basis": "Net share change across adapted houses x latest "
                     "BSE close = ESTIMATED value change. " + basis,
            "netBuys": buys, "netSells": sells,
            "mostNewEntries": [{"symbol": isin_map.get(i), "isin": i,
                                "newSchemes": c}
                               for i, c in new_by_isin.most_common(15)],
            "mostExits": [{"symbol": isin_map.get(i), "isin": i,
                           "exitedSchemes": c}
                          for i, c in exit_by_isin.most_common(15)],
            "accumulation": [
                {"symbol": isin_map.get(i), "isin": i,
                 "schemesIncreasing": len(s),
                 "netShareChange": delta_by_isin[i]}
                for i, s in inc_schemes_by_isin.items()
                if len(s) >= 3 and delta_by_isin[i] > 0],
        }
        leaderboards["accumulation"].sort(
            key=lambda a: -a["schemesIncreasing"])
        leaderboards["accumulation"] = leaderboards["accumulation"][:15]

    return stock_docs, house_docs, leaderboards


def _prev_label(year, month):
    from .util import prev_month
    py, pm = prev_month(year, month)
    return month_end_iso(py, pm)
