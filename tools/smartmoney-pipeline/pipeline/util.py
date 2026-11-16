"""Shared helpers for the Smart Money pipeline.

Stdlib only. Everything network-related goes through fetch() so retries and
timeouts behave the same for every collector.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def now_ist() -> datetime:
    return datetime.now(IST)


def ist_iso(dt: datetime | None = None) -> str:
    """ISO-8601 timestamp in IST, e.g. 2026-11-16T07:48:04+05:30."""
    return (dt or now_ist()).astimezone(IST).isoformat(timespec="seconds")


class FetchError(Exception):
    pass


def _quote_url(url: str) -> str:
    """AMC file URLs routinely contain literal spaces (e.g. Groww's
    'Monthly Portfolio- Oct 31 2026.xlsx'); urllib refuses those, so
    percent-encode path and query before opening."""
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parts.path, safe="/%")
    query = urllib.parse.quote(parts.query, safe="=&%+")
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, path, query, parts.fragment))


def fetch(url: str, timeout: int = 30, retries: int = 3,
          headers: dict | None = None, binary: bool = False):
    """GET with retries. Returns bytes if binary else str (utf-8, lossy)."""
    url = _quote_url(url)
    hdrs = {"User-Agent": UA, "Accept": "*/*"}
    if headers:
        hdrs.update(headers)
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            return data if binary else data.decode("utf-8", errors="replace")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
                ConnectionError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
    raise FetchError(f"GET {url} failed after {retries} tries: {last_err}")


def write_json_atomic(path: str, obj) -> int:
    """Write JSON via a temp file + rename so a crash never leaves a
    half-written data file. Returns byte size."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)
    return os.path.getsize(path)


def read_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def slugify_house(name: str) -> str:
    """'ICICI Prudential Mutual Fund' -> 'icici-prudential'."""
    s = name.strip()
    s = re.sub(r"\bMutual Fund\b", "", s, flags=re.I)
    s = re.sub(r"\bMF\b", "", s)
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def prev_month(year: int, month: int) -> tuple[int, int]:
    return (year - 1, 12) if month == 1 else (year, month - 1)
