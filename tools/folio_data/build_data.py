#!/usr/bin/env python3
"""Folio free data pipeline (GitHub Actions, stdlib only).

Fetches, best-effort and independently:
  * daily candles (1y) for the symbols in portfolio/data/symbols.txt
    from Yahoo Finance's public chart API -> candles/<SYM>.json
  * basic fundamentals via Yahoo quoteSummary (cookie+crumb bootstrap)
    -> fundamentals.json   (only real fields; failures stay "unavailable")
  * the current IPO list from NSE's public endpoints -> ipo.json
    (on failure the previous file is left untouched by the publisher,
    because this script simply does not write one)
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

def ipo_list(health):
    """NSE public IPO endpoints; returns rows in the app's catalog shape or None."""
    try:
        opener = urllib.request.build_opener()
        opener.open(urllib.request.Request("https://www.nseindia.com", headers=UA), timeout=20).read()
        req = urllib.request.Request("https://www.nseindia.com/api/ipo", headers={**UA, "Accept": "application/json"})
        doc = json.loads(opener.open(req, timeout=25).read())
        rows = doc if isinstance(doc, list) else doc.get("data", [])
        out = []
        for r in rows:
            name = r.get("companyName") or r.get("symbol") or ""
            if not name:
                continue
            out.append({"name": name, "symbol": r.get("symbol"), "status": "upcoming",
                        "open": r.get("issueStartDate"), "close": r.get("issueEndDate"),
                        "listing": r.get("listingDate"), "source": "NSE"})
        health["ipo"] = f"{len(out)} rows from NSE"
        return out or None
    except Exception as e:
        health["ipo"] = f"NSE fetch failed ({e}); previous ipo.json kept"
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
    rows = ipo_list(health)
    if rows:
        with open(os.path.join(args.out, "ipo.json"), "w", encoding="utf-8") as f:
            json.dump({"updatedAt": health["generatedAt"], "data": rows}, f, separators=(",", ":"))
    with open(os.path.join(args.out, "health.json"), "w", encoding="utf-8") as f:
        json.dump(health, f, indent=1)
    print(json.dumps(health, indent=1))

if __name__ == "__main__":
    main()
