"""Collector: AMFI NAVAll.txt -> nav.json (scheme master + latest NAV)
and houses.json (fund-house identity + alias map).

Source: https://www.amfiindia.com/spages/NAVAll.txt (official AMFI file,
updated every business day). Format: category header lines
("Open Ended Schemes(...)"), then an AMC name line, then semicolon rows:
Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;
Plan;Option;Net Asset Value;Date
"""
from __future__ import annotations

import re

from ..util import fetch, slugify_house

NAVALL_URL = "https://www.amfiindia.com/spages/NAVAll.txt"
SOURCE = "AMFI NAVAll.txt"

# Well-known short names / abbreviations used for the alias table.
EXTRA_ALIASES = {
    "sbi": ["SBI MF"],
    "hdfc": ["HDFC MF"],
    "icici-prudential": ["ICICI Pru", "ICICI Prudential MF"],
    "nippon-india": ["Nippon", "Nippon India MF", "Reliance Mutual Fund (old)"],
    "aditya-birla-sun-life": ["ABSL", "Aditya Birla MF", "Birla Sun Life (old)"],
    "parag-parikh": ["PPFAS", "Parag Parikh MF"],
    "baroda-bnp-paribas": ["Baroda BNP", "BNP Paribas MF (old)"],
    "mahindra-manulife": ["Mahindra MF"],
    "pgim-india": ["PGIM", "DHFL Pramerica (old)"],
    "lic": ["LIC MF"],
    "idbi": ["IDBI MF"],
    "360-one": ["IIFL Mutual Fund (old)"],
    "bank-of-india": ["BOI AXA (old)"],
    "hsbc": ["HSBC MF", "L&T Mutual Fund (merged)"],
}


def parse_navall(text: str):
    """Returns (schemes, houses) where schemes is a list of dicts and houses
    maps houseId -> {id, name, aliases, schemeCount}."""
    schemes = []
    houses: dict[str, dict] = {}
    category = None
    amc_name = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if ";" not in line:
            if "Schemes(" in line or "Schemes (" in line:
                category = line
            elif line.lower().startswith("scheme code"):
                continue
            else:
                amc_name = line
            continue
        parts = [p.strip() for p in line.split(";")]
        if len(parts) < 8 or not parts[0].isdigit():
            continue
        if amc_name is None:
            continue
        hid = slugify_house(amc_name)
        if hid not in houses:
            aliases = [amc_name]
            if not amc_name.lower().endswith("mutual fund"):
                aliases.append(amc_name + " Mutual Fund")
            aliases += EXTRA_ALIASES.get(hid, [])
            houses[hid] = {"id": hid, "name": amc_name,
                           "aliases": sorted(set(aliases)), "schemeCount": 0}
        houses[hid]["schemeCount"] += 1
        isin = parts[1] if parts[1] not in ("", "-") else (
            parts[2] if parts[2] not in ("", "-") else None)
        try:
            nav = float(parts[6])
        except ValueError:
            nav = None
        schemes.append({
            "code": int(parts[0]),
            "name": parts[3],
            "house": hid,
            "houseName": amc_name,
            "category": category,
            "plan": parts[4],
            "option": parts[5],
            "isin": isin,
            "nav": nav,
            "date": parts[7],
        })
    return schemes, houses


AMFI_PD_URL = "https://www.amfiindia.com/online-center/portfolio-disclosure"


def amfi_directory() -> dict:
    """AMFI's portfolio-disclosure page embeds, for every AMC, the URL of
    that AMC's own monthly portfolio disclosure page. Returns
    {mf_name: disclosure_url}. Best-effort metadata for houses.json."""
    html = fetch(AMFI_PD_URL, timeout=60)
    s = html
    for _ in range(4):
        s2 = s.replace('\\"', '"').replace("\\\\", "\\")
        if s2 == s:
            break
        s = s2
    pairs = re.findall(
        r'"mf_name"\s*:\s*"([^"]+)".{0,2000}?'
        r'"amc_monthly_portfolio_disclosure"\s*:\s*"(https?://[^"]*)"',
        s, flags=re.S)
    return {name: url.replace("\\/", "/").replace("\\u0026", "&")
            for name, url in pairs}


def collect():
    """Returns (nav_doc, houses_map). Raises FetchError on failure; the
    caller validates row counts before anything is written."""
    text = fetch(NAVALL_URL, timeout=60)
    schemes, houses = parse_navall(text)
    if len(schemes) < 10000:
        raise ValueError(f"NAVAll sanity check failed: only {len(schemes)} "
                         "scheme rows parsed (expected >= 10000)")
    # asOf = the freshest NAV date present, normalised to ISO.
    dates = [s["date"] for s in schemes if s["date"]]
    as_of_raw = max(dates, key=lambda d: _date_key(d)) if dates else None
    as_of = _iso_date(as_of_raw) if as_of_raw else None
    nav_doc = {"asOf": as_of, "source": SOURCE, "schemes": schemes}
    return nav_doc, houses


def _date_key(d: str):
    m = re.match(r"(\d{2})-(\w{3})-(\d{4})", d)
    months = {m: i + 1 for i, m in enumerate(
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}
    if not m:
        return (0, 0, 0)
    return (int(m.group(3)), months.get(m.group(2), 0), int(m.group(1)))


def _iso_date(d: str):
    y, mo, da = _date_key(d)
    return f"{y:04d}-{mo:02d}-{da:02d}" if y else d
