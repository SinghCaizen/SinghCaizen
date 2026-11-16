"""Samco Mutual Fund adapter.

Discovery: https://www.samcomf.com/StatutoryDisclosure links per-scheme
files under /amc-document-download/ named
"IN_MF_Portfolio_Monthly_Fortnightly_<Scheme>_<DDMMYYYY>_<id>.xlsx".
The month-end file is the one whose date stamp is the last day of the
target month (fortnightly files carry mid-month stamps).
"""
from __future__ import annotations

import calendar
import re
import urllib.parse

from ...util import fetch
from .base import AMCAdapter
from .generic_parse import parse_any

PAGE = "https://www.samcomf.com/StatutoryDisclosure"
BASE = "https://www.samcomf.com"


def _scheme_from_filename(url: str) -> str:
    name = urllib.parse.unquote(url.rsplit("/", 1)[-1])
    m = re.search(r"Fortnightly_(.+?)_\d{8}_", name)
    if m:
        return m.group(1).replace("-", " ").replace("_", " ").strip()
    return name


class SamcoAdapter(AMCAdapter):
    house_id = "samco"
    house_name = "Samco Mutual Fund"

    def discover(self, year: int, month: int) -> list[str] | None:
        html = fetch(PAGE, timeout=90)
        links = re.findall(r'href="([^"]+\.xlsx)"', html, re.I)
        last = calendar.monthrange(year, month)[1]
        stamp = f"{last:02d}{month:02d}{year}"
        out = []
        for link in links:
            dec = urllib.parse.unquote(link)
            if "Portfolio" not in dec or "Monthly" not in dec:
                continue
            if f"_{stamp}_" not in dec:
                continue
            out.append(link if link.startswith("http") else BASE + link)
        return out or None

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        return parse_any(path, self.house_id)

    def scheme_hint(self, url: str) -> str:
        return _scheme_from_filename(url)
