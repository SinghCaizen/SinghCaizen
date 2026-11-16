"""Per-AMC monthly portfolio adapter interface.

An adapter knows how to (a) discover the download URL of a house's monthly
portfolio file for a given month-end, and (b) turn the downloaded file into
normalised holding rows:

    {house, schemeName, isin, stockName, industry,
     shares (float), pctOfScheme (percent, e.g. 8.8), marketValueLakh}

Only listed-equity rows are emitted (ISIN starts with INE, instrument is a
share, not a bond/unit). Discovery returning None means "no static file
found for that month" — the runner then keeps the house's previous files
and names it in the coverage note. Nothing here ever fabricates a row.
"""
from __future__ import annotations

import calendar
import re


class AMCAdapter:
    house_id: str = ""          # slug, must match houses.json ids
    house_name: str = ""

    def discover(self, year: int, month: int) -> str | list[str] | None:
        """URL (or list of URLs, for houses that publish one file per
        scheme) of the portfolio disclosure for the month ending
        year-month. None = no static file found for that month."""
        raise NotImplementedError

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        raise NotImplementedError


def month_end_iso(year: int, month: int) -> str:
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-{last:02d}"


_RATING_RE = re.compile(
    r"\b(CRISIL|ICRA|CARE|IND|FITCH|BRICKWORK)\b|\bAAA\b|\bAA\+?\b|\bA1\+?\b|"
    r"\bBBB\b|\bSDL\b|\bT-Bill\b|Certificate of Deposit|Commercial Paper|"
    r"Sovereign|\bSO\b", re.I)


def looks_like_debt(name: str, industry: str | None) -> bool:
    """Heuristic filter so only equity shares survive: bonds carry a coupon
    '%' in the name or a credit rating in the industry/rating column."""
    if "%" in (name or ""):
        return True
    if industry and _RATING_RE.search(industry):
        return True
    low = (name or "").lower()
    for kw in ("debenture", "bond", "ncd", "treasury bill", "g-sec",
               "government securities", "certificate of deposit",
               "commercial paper", "pass through certificate"):
        if kw in low:
            return True
    return False


ISIN_RE = re.compile(r"^INE[A-Z0-9]{9}$")


def to_float(v) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", "").replace("%", "").strip()
    if s in ("", "-", "NA", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None
