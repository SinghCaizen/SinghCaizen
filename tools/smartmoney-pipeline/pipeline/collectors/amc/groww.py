"""Groww Mutual Fund adapter.

Discovery: https://growwmf.in/statutory-disclosure/portfolio is
server-rendered and links every monthly portfolio XLSX directly
(assets-netstorage.growwmf.in). We pick the "Monthly Portfolio" link whose
label matches the target month-end. Proven live 2026-11-16 for
Sep + Oct 2026.
"""
from __future__ import annotations

import re
import urllib.parse

from ...util import fetch
from .base import AMCAdapter, month_end_iso
from .generic_parse import parse_any

PAGE = "https://growwmf.in/statutory-disclosure/portfolio"
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


class GrowwAdapter(AMCAdapter):
    house_id = "groww"
    house_name = "Groww Mutual Fund"

    def discover(self, year: int, month: int) -> str | None:
        html = fetch(PAGE, timeout=60)
        import calendar
        last = calendar.monthrange(year, month)[1]
        mon = _MONTHS[month - 1]
        # Labels look like: Monthly Portfolio- Oct 31 2026.xlsx (spacing varies)
        pat = re.compile(
            r'href="([^"]*Monthly%20Portfolio[^"]*?' + mon +
            r'%20' + str(last) + r'(?:,)?%20' + str(year) + r'\.xlsx)"', re.I)
        m = pat.search(html)
        if m:
            return urllib.parse.unquote(m.group(1))
        # Fallback: any monthly link containing the month name + year
        pat2 = re.compile(r'href="([^"]*Monthly[^"]*?' + mon +
                          r'[^"]*?' + str(year) + r'\.xlsx)"', re.I)
        m = pat2.search(html)
        return urllib.parse.unquote(m.group(1)) if m else None

    def parse_file(self, path: str, year: int, month: int) -> list[dict]:
        return parse_any(path, self.house_id)
