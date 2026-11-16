"""Helios Mutual Fund adapter.

Discovery: https://www.heliosmf.in/portfolio-disclosure/ is a WordPress
page linking per-scheme XLSX files under /wp-content/uploads/, named like
"Helios-<Scheme>-Monthly-Portfolio-as-on-31st-October-2026.xlsx".
We collect every Monthly (not Fortnightly) file for the target month-end.
"""
from __future__ import annotations

import calendar
import re
import urllib.parse

from ...util import fetch
from .base import AMCAdapter
from .generic_parse import parse_any

PAGE = "https://www.heliosmf.in/portfolio-disclosure/"
BASE = "https://www.heliosmf.in"
_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"]


def _scheme_from_filename(url: str) -> str:
    name = urllib.parse.unquote(url.rsplit("/", 1)[-1])
    name = re.sub(r"\.xlsx$", "", name, flags=re.I)
    name = re.sub(r"^Helios[- ]", "", name)
    name = re.sub(r"[- ]Monthly-Portfolio.*$", "", name)
    return name.replace("-", " ").strip()


class HeliosAdapter(AMCAdapter):
    house_id = "helios"
    house_name = "Helios Mutual Fund"

    def discover(self, year: int, month: int) -> list[str] | None:
        html = fetch(PAGE, timeout=60)
        links = re.findall(r'href="([^"]+\.xlsx)"', html, re.I)
        last = calendar.monthrange(year, month)[1]
        mon = _MONTHS[month - 1]
        out = []
        for link in links:
            dec = urllib.parse.unquote(link)
            low = dec.lower()
            if "monthly" not in low or "fortnightly" in low:
                continue
            if mon.lower() not in low or str(year) not in low:
                continue
            if f"{last}" not in dec:
                continue
            out.append(link if link.startswith("http") else BASE + link)
        return out or None

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        return parse_any(path, self.house_id)

    def scheme_hint(self, url: str) -> str:
        return _scheme_from_filename(url)
