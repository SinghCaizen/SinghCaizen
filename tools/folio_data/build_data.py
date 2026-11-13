#!/usr/bin/env python3
"""Folio free data pipeline (GitHub Actions, stdlib only).

Fetches, best-effort and independently:
  * daily candles (1y) for the symbols in portfolio/data/symbols.txt
    from Yahoo Finance's public chart API -> candles/<SYM>.json
  * basic fundamentals via Yahoo quoteSummary (cookie+crumb bootstrap)
    -> fundamentals.json   (only real fields; failures stay "unavailable")
  * NSE bulk/block deals (official NSE files/API), accumulated over
    runs into the last 60 days -> deals.json
  * FII/DII daily net flow from NSE's official API -> fii.json
  (On failure a family writes NO file, so the publisher leaves the
   previous file untouched and the app hides that part. The IPO list
   builder was removed: Folio no longer has an IPO section.)
Every family writes health info to health.json. Nothing is invented:
a source that fails produces NO data file for that family.
"""
import argparse, json, os, sys, time, urllib.parse, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

def fetch(url, headers=None, timeout=25):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def symbols():
    p = os.path.join("portfolio", "data", "symbols.txt")
    out = []
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            s = line.split("#")[0].strip().upper()
            if s:
                out.append(s)
    return out

def candles_for(sym):
    ysym = sym + ".NS"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ysym}?range=1y&interval=1d&events=div,split"
    try:
        raw = fetch(url)
        doc = json.loads(raw)
        res = (doc.get("chart", {}).get("result") or [None])[0]
        if not res:
            return sym, None
        ts = res.get("timestamp") or []
        q = (res.get("indicators", {}).get("quote") or [{}])[0]
        bars = []
        for i, t in enumerate(ts):
            o, h, l, c, v = q["open"][i], q["high"][i], q["low"][i], q["close"][i], q["volume"][i]
            if c is None:
                continue
            bars.append([int(t), o, h, l, c, v or 0])
        if len(bars) < 5:
            return sym, None
        meta = res.get("meta", {})
        ev = res.get("events", {})
        return sym, {"symbol": sym, "updatedAt": int(time.time() * 1000),
                     "meta": {"currency": meta.get("currency"), "regularMarketPrice": meta.get("regularMarketPrice"),
                              "fiftyTwoWeekHigh": meta.get("fiftyTwoWeekHigh"), "fiftyTwoWeekLow": meta.get("fiftyTwoWeekLow")},
                     "bars": bars, "divs": ev.get("dividends", {}), "splits": ev.get("splits", {})}
    except Exception as e:
        print(f"candles {sym}: {e}", file=sys.stderr)
        return sym, None

class Crumb:
    def __init__(self):
        self.cookie, self.crumb = "", None
        try:
            req = urllib.request.Request("https://fc.yahoo.com", headers=UA)
            try:
                urllib.request.urlopen(req, timeout=15)
            except urllib.error.HTTPError as e:
                self.cookie = e.headers.get("Set-Cookie", "") or ""
            raw = fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {"Cookie": self.cookie})
            self.crumb = raw.decode().strip()
        except Exception as e:
            print(f"crumb: {e}", file=sys.stderr)
    def get(self, sym):
        if not self.crumb:
            return None
        url = ("https://query2.finance.yahoo.com/v11/finance/quoteSummary/" + sym + ".NS"
               "?modules=assetProfile,defaultKeyStatistics,financialData,price"
               "&crumb=" + urllib.parse.quote(self.crumb))
        try:
            return json.loads(fetch(url, {"Cookie": self.cookie}))
        except Exception:
            return None

def fundamentals(syms, health):
    out = {}
    crumb = Crumb()
    if not crumb.crumb:
        health["fundamentals"] = "crumb unavailable on this runner; left unavailable"
        return out
    ok = 0
    for sym in syms:
        doc = crumb.get(sym)
        if not doc:
            continue
        try:
            q = doc["quoteSummary"]["result"][0]
            ap, ks, fd, pr = q.get("assetProfile", {}), q.get("defaultKeyStatistics", {}), q.get("financialData", {}), q.get("price", {})
            def raw(x):
                return x.get("raw") if isinstance(x, dict) else None
            rec = {"pe": raw(ks.get("trailingPE")), "marketCap": raw(pr.get("marketCap")),
                   "roe": raw(fd.get("returnOnEquity")), "debtToEquity": raw(fd.get("debtToEquity")),
                   "profitMargin": raw(fd.get("profitMargins")), "revenueGrowth": raw(fd.get("revenueGrowth")),
                   "sector": ap.get("sector"), "industry": ap.get("industry")}
            rec = {k: v for k, v in rec.items() if v is not None}
            if rec:
                out[sym] = rec; ok += 1
        except Exception:
            pass
        time.sleep(0.15)
    health["fundamentals"] = f"{ok}/{len(syms)} symbols"
    return out


DATA_BRANCH_DEALS = "https://raw.githubusercontent.com/SinghCaizen/SinghCaizen/data/portfolio/data/deals.json"

def _nse_opener():
    op = urllib.request.build_opener()
    op.open(urllib.request.Request("https://www.nseindia.com", headers=UA), timeout=20).read()
    return op

def _parse_deals_csv(text, kind):
    import csv, io as _io
    rows = []
    try:
        rdr = csv.DictReader(_io.StringIO(text))
        for r in rdr:
            def g(*names):
                for n in names:
                    if n in r and r[n]:
                        return r[n]
                return ""
            sym = (g("Symbol", "SYMBOL") or "").strip().upper()
            client = (g("Client Name", "ClientName", "CLIENT NAME") or "").strip()
            side = (g("Buy / Sell", "Buy/Sell", "BUYSELL") or "").strip().upper()
            date = (g("Date", "DATE") or "").strip()
            try:
                qty = int(float((g("Quantity Traded", "Quantity", "QTY") or "0").replace(",", "")))
                price = float((g("Trade Price / Wght. Avg. Price", "Trade Price", "Price") or "0").replace(",", ""))
            except Exception:
                continue
            if not sym or not client or qty <= 0:
                continue
            d = None
            for fmt in ("%d-%b-%Y", "%d-%m-%Y"):
                try:
                    d = time.strftime("%Y-%m-%d", time.strptime(date, fmt)); break
                except Exception:
                    pass
            if not d:
                continue
            rows.append({"d": d, "sym": sym, "client": client, "side": "BUY" if side.startswith("B") else "SELL",
                         "qty": qty, "price": price, "kind": kind})
    except Exception:
        pass
    return rows

def deals(health):
    """Accumulate NSE bulk/block deals (today's official files + API),
    merged with the deals.json already on the data branch, last 60 days."""
    merged = {}
    try:
        prev = json.loads(fetch(DATA_BRANCH_DEALS, timeout=15))
        for r in prev.get("data", []):
            merged[(r["d"], r["sym"], r["client"], r["side"], r["qty"], r["price"])] = r
    except Exception:
        pass
    got = 0
    for kind, url in (("bulk", "https://archives.nseindia.com/content/equities/bulk.csv"),
                      ("block", "https://archives.nseindia.com/content/equities/block.csv")):
        try:
            rows = _parse_deals_csv(fetch(url, timeout=20).decode("utf-8", "replace"), kind)
            for r in rows:
                merged[(r["d"], r["sym"], r["client"], r["side"], r["qty"], r["price"])] = r
            got += len(rows)
        except Exception as e:
            print(f"deals {kind}: {e}", file=sys.stderr)
    if not got:
        try:
            op = _nse_opener()
            to = time.strftime("%d-%m-%Y"); frm = time.strftime("%d-%m-%Y", time.gmtime(time.time() - 7 * 86400))
            req = urllib.request.Request(f"https://www.nseindia.com/api/historical/bulk-deals?from={frm}&to={to}",
                                         headers={**UA, "Accept": "application/json"})
            doc = json.loads(op.open(req, timeout=25).read())
            for r in (doc if isinstance(doc, list) else doc.get("data", [])):
                try:
                    d = time.strftime("%Y-%m-%d", time.strptime((r.get("date") or "")[:11].strip(), "%d-%b-%Y"))
                    row = {"d": d, "sym": (r.get("symbol") or "").upper(), "client": r.get("clientName") or "",
                           "side": "BUY" if (r.get("buySell") or "").upper().startswith("B") else "SELL",
                           "qty": int(r.get("quantity") or 0), "price": float(r.get("price") or 0), "kind": "bulk"}
                    if row["sym"] and row["client"] and row["qty"]:
                        merged[(row["d"], row["sym"], row["client"], row["side"], row["qty"], row["price"])] = row
                        got += 1
                except Exception:
                    pass
        except Exception as e:
            print(f"deals api: {e}", file=sys.stderr)
    cutoff = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 60 * 86400))
    rows = sorted((r for r in merged.values() if r["d"] >= cutoff), key=lambda r: (r["d"], r["qty"] * r["price"]), reverse=True)
    health["deals"] = f"{len(rows)} rows accumulated ({got} new this run)"
    return rows or None

def fii_dii(health):
    """FII/DII daily net flow from NSE's official API; None on any failure."""
    try:
        op = _nse_opener()
        req = urllib.request.Request("https://www.nseindia.com/api/fiidiiTradeReact", headers={**UA, "Accept": "application/json"})
        doc = json.loads(op.open(req, timeout=25).read())
        by_date = {}
        for r in (doc if isinstance(doc, list) else []):
            try:
                d = time.strftime("%Y-%m-%d", time.strptime((r.get("date") or "").strip(), "%d-%b-%Y"))
            except Exception:
                continue
            cat = (r.get("category") or "").upper()
            net = r.get("netValue")
            if net is None:
                continue
            slot = by_date.setdefault(d, {})
            if "FII" in cat: slot["fiiNet"] = float(net)
            elif "DII" in cat: slot["diiNet"] = float(net)
        rows = [{"date": d, **v} for d, v in sorted(by_date.items()) if "fiiNet" in v or "diiNet" in v]
        health["fii_dii"] = f"{len(rows)} days from NSE"
        return rows or None
    except Exception as e:
        health["fii_dii"] = f"NSE fetch failed ({e}); app hides FII/DII"
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    os.makedirs(os.path.join(args.out, "candles"), exist_ok=True)
    health = {"generatedAt": int(time.time() * 1000)}
    syms = symbols()
    health["symbols"] = len(syms)
    ok = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        for sym, data in ex.map(candles_for, syms):
            if data:
                with open(os.path.join(args.out, "candles", sym + ".json"), "w", encoding="utf-8") as f:
                    json.dump(data, f, separators=(",", ":"))
                ok += 1
    health["candles"] = f"{ok}/{len(syms)} symbols"
    fund = fundamentals(syms, health)
    if fund:
        with open(os.path.join(args.out, "fundamentals.json"), "w", encoding="utf-8") as f:
            json.dump({"updatedAt": health["generatedAt"], "data": fund}, f, separators=(",", ":"))
    drows = deals(health)
    if drows:
        with open(os.path.join(args.out, "deals.json"), "w", encoding="utf-8") as f:
            json.dump({"updatedAt": health["generatedAt"], "data": drows}, f, separators=(",", ":"))
    frows = fii_dii(health)
    if frows:
        with open(os.path.join(args.out, "fii.json"), "w", encoding="utf-8") as f:
            json.dump({"updatedAt": health["generatedAt"], "data": frows}, f, separators=(",", ":"))
    with open(os.path.join(args.out, "health.json"), "w", encoding="utf-8") as f:
        json.dump(health, f, indent=1)
    print(json.dumps(health, indent=1))

if __name__ == "__main__":
    main()
