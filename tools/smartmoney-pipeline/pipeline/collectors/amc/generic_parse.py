"""Generic parser for the SEBI monthly-portfolio disclosure format.

Most AMCs publish either (a) one sheet per scheme, or (b) one sheet with a
stacked block per scheme. Both share the same column family:
ISIN | Name of Instrument | Industry/Rating | Quantity |
Market Value | % to NAV. This module detects header rows by fuzzy column
names and reads whatever layout surrounds them. Per-AMC quirks are handled
by the adapter modules, not here.
"""
from __future__ import annotations

import csv
import io
import os
import re
import zipfile

import openpyxl

from .base import ISIN_RE, looks_like_debt, to_float

_HDR_ISIN = re.compile(r"\bISIN\b", re.I)
_HDR_NAME = re.compile(r"name of (the )?(instrument|security|company)|instrument name", re.I)
_HDR_INDUSTRY = re.compile(r"industry|rating|sector", re.I)
_HDR_QTY = re.compile(r"quantity|no\.? of shares|number of shares|^shares$", re.I)
_HDR_MV = re.compile(r"market value|market\s*/\s*fair value", re.I)
_HDR_PCT = re.compile(r"%\s*(to|of)?\s*(net assets|nav|aum)|%\s*to\s*net", re.I)


def _header_map(cells):
    """cells: list of raw cell values. Returns column map or None."""
    texts = [str(c).strip() if c is not None else "" for c in cells]
    colmap = {}
    for i, t in enumerate(texts):
        if not t:
            continue
        if _HDR_ISIN.search(t) and "isin" not in colmap:
            colmap["isin"] = i
        elif _HDR_NAME.search(t) and "name" not in colmap:
            colmap["name"] = i
        elif _HDR_INDUSTRY.search(t) and "industry" not in colmap:
            colmap["industry"] = i
        elif _HDR_QTY.search(t) and "qty" not in colmap:
            colmap["qty"] = i
        elif _HDR_MV.search(t) and "mv" not in colmap:
            colmap["mv"] = i
        elif ("%" in t and _HDR_PCT.search(t)) and "pct" not in colmap:
            colmap["pct"] = i
    if "isin" in colmap and "qty" in colmap and ("name" in colmap):
        if "pct" not in colmap:  # last resort: any other % column
            for i, t in enumerate(texts):
                if "%" in t and i not in colmap.values():
                    colmap["pct"] = i
                    break
        return colmap
    return None


_SCHEME_HINT = re.compile(r"fund|scheme|portfolio|\betf\b|index", re.I)
_NOT_SCHEME = re.compile(
    r"portfolio as on|monthly portfolio|statutory|disclosure|annexure|"
    r"notes?:|source:|isin|name of", re.I)


def _scheme_name_above(rows, hdr_idx, fallback_sheet):
    """Look upwards from a header row for the scheme title cell."""
    for j in range(hdr_idx - 1, max(hdr_idx - 8, -1), -1):
        for c in rows[j]:
            if c is None:
                continue
            s = str(c).strip()
            if len(s) < 8 or _NOT_SCHEME.search(s):
                continue
            if _SCHEME_HINT.search(s):
                # strip leading codes like 'IB01-' / 'A1.'
                s = re.sub(r"^[A-Z]{0,4}\d{0,3}\s*[-.:]\s*", "", s)
                return s.strip()
    return fallback_sheet


def _clean_hint(hint: str) -> str:
    """Per-scheme filenames make poor scheme names ('helios flexi cap
    fund monthly portfolio as on 31st october 2026'). Strip the
    boilerplate suffixes; title-case when the hint is all lowercase."""
    s = re.sub(r"\s+monthly portfolio.*$", "", hint, flags=re.I)
    s = re.sub(r"\s+as on.*$", "", s, flags=re.I)
    s = s.strip(" -_")
    if s and s == s.lower():
        s = s.title()
    return s


def _parse_rows(rows, house_id, sheet_name, scheme_hint=None):
    """rows: list of row tuples from one sheet. Returns normalised rows."""
    if scheme_hint:
        scheme_hint = _clean_hint(scheme_hint)
    out = []
    colmap = None
    scheme = None
    section_equity = None  # None = no section headers seen yet
    pending = []            # (rowdict) collected before pct convention known
    for idx, row in enumerate(rows):
        cells = list(row)
        texts = [str(c).strip() if c is not None else "" for c in cells]
        joined = " ".join(texts)
        hm = _header_map(cells)
        if hm:
            colmap = hm
            # A caller-supplied hint (per-scheme files: the filename is
            # authoritative) beats in-sheet title hunting.
            scheme = scheme_hint or _scheme_name_above(rows, idx, sheet_name)
            continue
        if re.search(r"equity\s*&\s*equity related|equity shares", joined, re.I) \
                and len(joined) < 120:
            section_equity = True
            continue
        if re.search(r"debt\s*&\s*debt related|money market instruments|"
                     r"debt securities", joined, re.I) and len(joined) < 120:
            section_equity = False
            continue
        if colmap is None or scheme is None:
            continue
        gi = colmap["isin"]
        if gi >= len(cells) or cells[gi] is None:
            continue
        isin = str(cells[gi]).strip().upper()
        if not ISIN_RE.match(isin):
            continue
        name = ""
        if "name" in colmap and colmap["name"] < len(cells) \
                and cells[colmap["name"]] is not None:
            name = str(cells[colmap["name"]]).strip()
        industry = None
        if "industry" in colmap and colmap["industry"] < len(cells) \
                and cells[colmap["industry"]] is not None:
            industry = str(cells[colmap["industry"]]).strip()
        if section_equity is False:
            continue
        if looks_like_debt(name, industry):
            continue
        qty = to_float(cells[colmap["qty"]]) if colmap["qty"] < len(cells) else None
        if qty is None or qty == 0:
            continue
        mv = to_float(cells[colmap["mv"]]) if "mv" in colmap \
            and colmap["mv"] < len(cells) else None
        pct = to_float(cells[colmap["pct"]]) if "pct" in colmap \
            and colmap["pct"] < len(cells) else None
        pending.append({
            "house": house_id, "schemeName": scheme, "isin": isin,
            "stockName": name, "industry": industry, "shares": qty,
            "pctRaw": pct, "marketValueLakh": mv,
        })
    if pending:
        raws = [p["pctRaw"] for p in pending if p["pctRaw"] is not None]
        as_fraction = bool(raws) and max(raws) <= 1.5
        for p in pending:
            pct = p.pop("pctRaw")
            p["pctOfScheme"] = round(pct * 100, 4) if (pct is not None and as_fraction) \
                else (round(pct, 4) if pct is not None else None)
            out.append(p)
    return out


def parse_xlsx(path: str, house_id: str, scheme_hint=None) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        rows = [tuple(r) for r in ws.iter_rows(values_only=True)]
        out.extend(_parse_rows(rows, house_id, ws.title, scheme_hint))
    wb.close()
    return out


def parse_csv_text(text: str, house_id: str, scheme_hint=None) -> list[dict]:
    rows = [tuple(r) for r in csv.reader(io.StringIO(text))]
    return _parse_rows(rows, house_id, "csv", scheme_hint)


def parse_any(path: str, house_id: str, scheme_hint=None) -> list[dict]:
    """Dispatch on file type. ZIPs may bundle several workbooks (e.g.
    Nippon's monthly bundle, DSP's month-end pack) — every spreadsheet
    inside is parsed and the rows concatenated; unparseable members are
    skipped, never fatal, as long as some rows come out."""
    low = path.lower()
    if low.endswith(".zip"):
        out = []
        with zipfile.ZipFile(path) as z:
            names = [n for n in z.namelist()
                     if n.lower().endswith((".xlsx", ".xlsm", ".csv"))
                     and not n.startswith("__MACOSX")]
            if not names:
                raise ValueError(f"ZIP {path} contains no spreadsheet")
            for inner in names:
                data = z.read(inner)
                tmp = path + ".inner" + os.path.splitext(inner)[1]
                with open(tmp, "wb") as f:
                    f.write(data)
                try:
                    out.extend(parse_any(tmp, house_id, scheme_hint))
                except Exception:
                    continue
                finally:
                    os.remove(tmp)
        return out
    if low.endswith((".xlsx", ".xlsm")):
        return parse_xlsx(path, house_id, scheme_hint)
    if low.endswith(".csv"):
        with open(path, encoding="utf-8", errors="replace") as f:
            return parse_csv_text(f.read(), house_id, scheme_hint)
    raise ValueError(f"Unsupported portfolio file type: {path}")
