"""DSP Mutual Fund adapter.

Discovery: the mandatory-disclosure page
(https://www.dspim.com/about-us/mandatory-disclosure/portfolio-disclosures)
is server-rendered and links every month-end portfolio ZIP directly.
We pick the month-end (not fortnightly / half-yearly / debt-only) ZIP whose
name carries the target month + year.
"""
from __future__ import annotations

import re
import urllib.parse

from ...util import fetch
from .base import AMCAdapter
from .generic_parse import parse_any

PAGE = ("https://www.dspim.com/about-us/mandatory-disclosure/"
        "portfolio-disclosures")
_MONTHS = ["january", "february", "march", "april", "may", "june", "july",
           "august", "september", "october", "november", "december"]


class DSPAdapter(AMCAdapter):
    house_id = "dsp"
    house_name = "DSP Mutual Fund"

    def discover(self, year: int, month: int) -> str | None:
        html = fetch(PAGE, timeout=60)
        links = re.findall(r'href="([^"]+\.zip)"', html, re.I)
        mon = _MONTHS[month - 1]
        best = None
        for link in links:
            low = urllib.parse.unquote(link).lower()
            if "portfolio" not in low:
                continue
            if "fortnight" in low or "half" in low or "debt" in low:
                continue
            if not ("monthend" in low or "month_end" in low
                    or "month-end" in low or "month end" in low):
                continue
            if mon in low and str(year) in low:
                best = link if not link.startswith("http") else link
                break
        if best and best.startswith("/"):
            best = "https://www.dspim.com" + best
        return best

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        return parse_any(path, self.house_id)
