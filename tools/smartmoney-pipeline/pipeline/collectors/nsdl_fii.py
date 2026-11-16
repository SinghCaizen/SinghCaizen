"""Collector: NSDL FPI trade-wise static archive -> flows-fii-monthly.json.

Source: https://www.fpi.nsdl.co.in/web/StaticReports/FIITradeWise2008/
        FIITradeWise2008.htm — index of monthly ZIPs, each holding one
        workbook (<mon>-<yyyy>.xlsx) with EVERY FPI trade of the month
        (~440k rows, ~500 MB of sheet XML). We stream it: the sheet XML is
        parsed with iterparse and only running sums are kept.

IMPORTANT, verified 2026-11-16: the archive's newest month is
**March 2025** — the static series has not been extended since. The file
we emit is therefore a lagged, FII-only, monthly substitute (exactly the
labelling the feasibility study demands), never a daily-flows stand-in.

Buy/sell classification uses SEBI's Master Circular for Custodians,
Annexure F (Nature of Transaction codes) and the circular's own Daily
Transaction Summary grouping:
  purchases = 01, 02, 03, 05, 06, 14, 16
    (01 secondary-market purchase, 02 primary-market purchase,
     03 preferential allotment, 05 rights purchase, 06 conversion, ...)
  sales     = 04, 08, 09, 10, 11, 13
    (04 secondary-market sale, ...)
  excluded  = 07, 12, 15 (receipts / transfers / other non-market moves)
Only rows whose instrument type marks them as equity (…_EQ) are summed.
Values are the files' own VALUE (in Rs), converted to Rs crore.
"""
from __future__ import annotations

import os
import re
import zipfile
import xml.etree.ElementTree as ET

from ..util import fetch

INDEX_URL = ("https://www.fpi.nsdl.co.in/web/StaticReports/"
             "FIITradeWise2008/FIITradeWise2008.htm")
SOURCE = "NSDL FPI trade-wise statistics (monthly, lagged, FII only)"

BUY_CODES = {"01", "02", "03", "05", "06", "14", "16"}
SELL_CODES = {"04", "08", "09", "10", "11", "13"}

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def list_months() -> dict[tuple[int, int], str]:
    """(year, month) -> zip URL, from the official index page."""
    html = fetch(INDEX_URL, timeout=60)
    out = {}
    months = {m: i + 1 for i, m in enumerate(
        ["jan", "feb", "mar", "apr", "may", "jun",
         "jul", "aug", "sep", "oct", "nov", "dec"])}
    for href in re.findall(r'href="([^"]+\.zip)"', html, re.I):
        name = href.rsplit("/", 1)[-1].lower()
        m = re.match(r"([a-z]{3})_(\d{4})\.zip", name) or \
            re.match(r"(\d{4})_(\d{1,2})\.zip", name)
        if not m:
            continue
        if m.group(1).isalpha():
            key = (int(m.group(2)), months[m.group(1)])
        else:
            key = (int(m.group(1)), int(m.group(2)))
        out[key] = href if href.startswith("http") else \
            "https://www.fpi.nsdl.co.in/web/StaticReports/" + href.lstrip("./")
    return out


def _cell_text(c) -> str:
    t = c.get("t")
    if t == "inlineStr":
        is_el = c.find(f"{_NS}is")
        if is_el is None:
            return ""
        return "".join(n.text or "" for n in is_el.iter(f"{_NS}t"))
    v = c.find(f"{_NS}v")
    return v.text if v is not None and v.text is not None else ""


def aggregate_workbook(xlsx_path: str) -> dict:
    """Stream-sum one monthly workbook. Returns totals in Rs crore."""
    buy = sell = 0.0
    rows = 0
    unknown_codes: dict[str, int] = {}
    with zipfile.ZipFile(xlsx_path) as z:
        sheet = next(n for n in z.namelist()
                     if n.startswith("xl/worksheets/sheet"))
        with z.open(sheet) as fh:
            context = ET.iterparse(fh, events=("end",))
            for _event, elem in context:
                if elem.tag != f"{_NS}row":
                    continue
                rows += 1
                if rows > 1:  # row 1 is the header
                    vals = {}
                    for c in elem.findall(f"{_NS}c"):
                        ref = c.get("r", "")
                        col = re.match(r"([A-Z]+)", ref)
                        if col and col.group(1) in ("J", "O", "P"):
                            vals[col.group(1)] = _cell_text(c)
                    instr = vals.get("P", "")
                    if "_EQ" in instr:
                        code = vals.get("J", "").strip().zfill(2)
                        try:
                            value = float(vals.get("O", "") or 0)
                        except ValueError:
                            value = 0.0
                        if code in BUY_CODES:
                            buy += value
                        elif code in SELL_CODES:
                            sell += value
                        elif code:
                            unknown_codes[code] = \
                                unknown_codes.get(code, 0) + 1
                elem.clear()
    cr = 1e7
    return {"equityBuyCr": round(buy / cr, 2),
            "equitySellCr": round(sell / cr, 2),
            "equityNetCr": round((buy - sell) / cr, 2),
            "rowsProcessed": rows - 1,
            "unknownTrTypeRows": unknown_codes}


def collect_month(year: int, month: int, workdir: str,
                  months_index: dict | None = None) -> dict:
    """Download (or reuse) one month's ZIP and aggregate it.
    Returns a flows row: {month, equityBuyCr, equitySellCr, equityNetCr}."""
    months_index = months_index or list_months()
    url = months_index.get((year, month))
    if not url:
        raise ValueError(f"NSDL index has no ZIP for {year}-{month:02d}")
    os.makedirs(workdir, exist_ok=True)
    zip_path = os.path.join(workdir, f"nsdl-{year}-{month:02d}.zip")
    if not os.path.exists(zip_path):
        data = fetch(url, timeout=1800, binary=True)
        with open(zip_path, "wb") as f:
            f.write(data)
    xlsx_path = os.path.join(workdir, f"nsdl-{year}-{month:02d}.xlsx")
    if not os.path.exists(xlsx_path):
        with zipfile.ZipFile(zip_path) as z:
            inner = next(n for n in z.namelist() if n.endswith(".xlsx"))
            with z.open(inner) as src, open(xlsx_path, "wb") as dst:
                while True:
                    chunk = src.read(1 << 20)
                    if not chunk:
                        break
                    dst.write(chunk)
    agg = aggregate_workbook(xlsx_path)
    return {"month": f"{year:04d}-{month:02d}", **agg}


def build_doc(month_rows: list[dict]) -> dict:
    month_rows = sorted(month_rows, key=lambda r: r["month"])
    latest = month_rows[-1]["month"] if month_rows else None
    return {
        "asOf": (latest + "-31") if latest else None,
        "source": SOURCE,
        "granularity": "monthly",
        "label": "FII only, monthly, as reported by NSDL (lagged). "
                 "Not daily FII/DII flows.",
        "note": "NSDL's static trade-wise archive ends at March 2025; "
                "no newer official static file was found on 2026-11-16.",
        "months": [{k: r[k] for k in
                    ("month", "equityBuyCr", "equitySellCr", "equityNetCr")}
                   for r in month_rows],
    }
