"""Nippon India Mutual Fund adapter.

Discovery: the downloads page
(https://mf.nipponindiaim.com/investor-service/downloads/
factsheet-portfolio-and-other-disclosures) links monthly bundles named
"Weblink-file-<Month>-<Year>.zip" (September's is
"Weblink-Files-for-Upload-September-2026.zip"). The ZIP holds the month's
per-scheme portfolio workbooks.
"""
from __future__ import annotations

import re

from ...util import fetch
from .base import AMCAdapter
from .generic_parse import parse_any

PAGE = ("https://mf.nipponindiaim.com/investor-service/downloads/"
        "factsheet-portfolio-and-other-disclosures")
BASE = "https://mf.nipponindiaim.com"
_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"]


class NipponAdapter(AMCAdapter):
    house_id = "nippon-india"
    house_name = "Nippon India Mutual Fund"

    def discover(self, year: int, month: int) -> str | None:
        html = fetch(PAGE, timeout=60)
        links = re.findall(r'href="([^"]+\.zip)"', html, re.I)
        mon = _MONTHS[month - 1]
        for link in links:
            low = link.lower()
            if "weblink" in low and mon.lower() in low \
                    and str(year) in low:
                return link if link.startswith("http") else BASE + link
        return None

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        return parse_any(path, self.house_id)
