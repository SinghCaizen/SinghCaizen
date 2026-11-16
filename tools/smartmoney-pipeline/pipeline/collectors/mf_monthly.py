"""Monthly MF holdings collector: runs every adapted AMC adapter for a
target month and returns normalised rows plus a per-house result map.

A house whose discovery finds nothing, whose download fails, or whose file
parses to zero rows is reported as failed for that month — the caller then
keeps the house's previous output and names it in the coverage note.
Rows are never fabricated: only what the files actually contain.
"""
from __future__ import annotations

import os

from ..util import fetch
from .amc.base import AMCAdapter
from .amc.dsp import DSPAdapter
from .amc.groww import GrowwAdapter
from .amc.helios import HeliosAdapter

# Houses with a working adapter, proven in the 2026-11-16 dry run.
# (Samco's adapter exists in amc/samco.py but is NOT registered: the only
# month-end file its statutory page embeds is the Overnight Fund's, which
# holds no equity — see NOT_ADAPTED.)
ADAPTERS: list[AMCAdapter] = [
    GrowwAdapter(),
    DSPAdapter(),
    HeliosAdapter(),
]

# Houses investigated in this pass but NOT adapted, with the reason.
# (Full evidence per house is in README.md's coverage table.)
NOT_ADAPTED = {
    "icici-prudential": "Disclosure page is a JS app; no static file links in HTML",
    "nippon-india": "Monthly Weblink ZIP contains only >1%-weight extracts (no ISIN / quantity); full portfolio not published as a static spreadsheet",
    "uti": "Consolidated disclosure page is JS-driven; no static file links in HTML",
    "kotak-mahindra": "Downloads page is JS-driven; no static file links in HTML",
    "hdfc": "Monthly portfolio page fails to load from datacenter IPs / JS-driven",
    "sbi": "Portfolios page is JS-driven; no static file links in HTML",
    "bandhan": "Disclosures page errors from datacenter IPs",
    "aditya-birla-sun-life": "Portfolio page is JS-driven; no static file links in HTML",
    "tata": "Schemes page carries no static portfolio spreadsheets",
    "axis": "Statutory page is JS-driven; documents load via site XHR API",
    "franklin-templeton": "Reports page is a JS app shell",
    "edelweiss": "Statutory page returns 403 from datacenter IPs",
    "hsbc": "Information library page fails to load from datacenter IPs",
    "baroda-bnp-paribas": "Monthly portfolio page links no portfolio spreadsheets",
    "invesco": "Literature page fails to load from datacenter IPs",
    "motilal-oswal": "Scheme portfolio page is JS-driven; no static file links in HTML",
    "pgim-india": "Monthly portfolio page is JS-driven; no static file links in HTML",
    "jm-financial": "Portfolio disclosure page is a JS app shell",
    "union": "Monthly portfolio page unreachable from datacenter IPs",
    "quant": "Statutory disclosures return 403 from datacenter IPs",
    "bank-of-india": "Investor corner page is JS-driven; no static file links in HTML",
    "canara-robeco": "Scheme portfolio page loads documents via site XHR API",
    "ppfas": "Disclosure page exposes only stale (2018) static links; current files are JS-served / PDF",
    "zerodha-case": "Disclosures page publishes top-10 holdings and dashboards, not the full monthly portfolio spreadsheet",
    "navi": "Downloads page returns 403 from datacenter IPs",
    "whiteoak-capital": "Scheme portfolios page is JS-driven; no static file links in HTML",
    "quantum": "Combined portfolio is an HTML view, not a downloadable spreadsheet",
    "mirae-asset": "Downloads/portfolio page is JS-driven; no static file links in HTML",
    "samco": "Statutory page embeds only the Overnight Fund's month-end file (no equity); other schemes sit behind the site document browser",
}

# Caveats for adapted houses, surfaced in houses.json / the manifest note.
ADAPTER_NOTES = {
    "helios": "Adapter reads the disclosure page, which lists current-month "
              "files only; prior-month baselines come from the pipeline's "
              "own snapshots",
}


def collect_month(year: int, month: int, workdir: str):
    """Returns (rows, house_results) where house_results maps
    houseId -> {status: 'ok'|'failed', rows: int, schemes: int,
                error: str|None, files: int}."""
    rows: list[dict] = []
    results: dict[str, dict] = {}
    for adapter in ADAPTERS:
        hid = adapter.house_id
        try:
            found = adapter.discover(year, month)
            if not found:
                results[hid] = {"status": "failed", "rows": 0, "schemes": 0,
                                "files": 0,
                                "error": "discovery found no file for month"}
                continue
            urls = found if isinstance(found, list) else [found]
            house_rows: list[dict] = []
            for i, url in enumerate(urls):
                data = fetch(url, timeout=180, binary=True)
                ext = os.path.splitext(url.split("?")[0])[1] or ".bin"
                path = os.path.join(
                    workdir, f"{hid}-{year}-{month:02d}-{i}{ext}")
                os.makedirs(workdir, exist_ok=True)
                with open(path, "wb") as f:
                    f.write(data)
                hint = adapter.scheme_hint(url) \
                    if hasattr(adapter, "scheme_hint") else None
                if hint:
                    from .amc.generic_parse import parse_any
                    house_rows.extend(parse_any(path, hid, hint))
                else:
                    house_rows.extend(adapter.parse_file(path, year, month))
            if not house_rows:
                results[hid] = {"status": "failed", "rows": 0, "schemes": 0,
                                "files": len(urls),
                                "error": "files parsed to zero equity rows"}
                continue
            rows.extend(house_rows)
            results[hid] = {
                "status": "ok", "rows": len(house_rows),
                "schemes": len({r["schemeName"] for r in house_rows}),
                "files": len(urls), "error": None}
        except Exception as e:  # one bad house must not sink the month
            results[hid] = {"status": "failed", "rows": 0, "schemes": 0,
                            "files": 0,
                            "error": f"{type(e).__name__}: {str(e)[:200]}"}
    return rows, results
