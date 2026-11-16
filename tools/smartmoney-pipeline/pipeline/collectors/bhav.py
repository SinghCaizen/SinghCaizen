"""Collector: BSE UDiFF daily bhavcopy -> bhav-lite.json.

Source: https://www.bseindia.com/download/BhavCopy/Equity/
        BhavCopy_BSE_CM_0_0_0_<YYYYMMDD>_F_0000.csv  (official BSE file)

Emits per-symbol close / previous close / day change / volume, and —
critically for the MF derive step — the ISIN -> symbol map. Note: the
UDiFF bhavcopy has NO delivery-quantity column, so no delivery % is
emitted (the feasibility study verified this).
"""
from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from ..util import FetchError, fetch

SOURCE = "BSE UDiFF bhavcopy"
_URL = ("https://www.bseindia.com/download/BhavCopy/Equity/"
        "BhavCopy_BSE_CM_0_0_0_{yyyymmdd}_F_0000.csv")


def _parse(text: str):
    symbols = {}
    isin_map = {}
    rdr = csv.DictReader(io.StringIO(text))
    for row in rdr:
        if row.get("Sgmt") != "CM" or row.get("FinInstrmTp") != "STK":
            continue
        sym = (row.get("TckrSymb") or "").strip()
        isin = (row.get("ISIN") or "").strip()
        if not sym or not isin:
            continue
        try:
            close = float(row["ClsPric"])
            prev = float(row["PrvsClsgPric"])
            vol = int(float(row["TtlTradgVol"]))
        except (KeyError, ValueError):
            continue
        symbols[sym] = {
            "close": close, "prevClose": prev,
            "changePct": round((close - prev) / prev * 100, 2) if prev else None,
            "volume": vol, "isin": isin,
            "name": (row.get("FinInstrmNm") or "").strip(),
        }
        isin_map[isin] = sym
    return symbols, isin_map


def collect(today: date | None = None):
    """Walks back up to 7 days to the most recent trading day's file.
    Returns (doc, isin_map)."""
    today = today or date.today()
    last_err = None
    for back in range(0, 8):
        d = today - timedelta(days=back)
        url = _URL.format(yyyymmdd=d.strftime("%Y%m%d"))
        try:
            text = fetch(url, timeout=60, retries=2)
        except FetchError as e:
            last_err = e
            continue
        symbols, isin_map = _parse(text)
        if len(symbols) < 4000:
            last_err = ValueError(
                f"bhavcopy {d} parsed only {len(symbols)} symbols")
            continue
        doc = {"asOf": d.isoformat(), "source": SOURCE, "symbols": symbols}
        return doc, isin_map
    raise FetchError(f"No usable bhavcopy in the last 7 days: {last_err}")
