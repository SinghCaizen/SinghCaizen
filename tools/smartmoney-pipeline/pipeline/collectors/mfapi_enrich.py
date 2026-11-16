"""Enrichment: mfapi.in (open API) cross-checks for the house map.

What mfapi actually contributes (measured, not assumed):
1. Its scheme index (GET /mf) is an independent listing of AMFI scheme
   codes — we report how many NAVAll codes it covers.
2. Its per-scheme meta.fund_house is an independent house naming — we
   sample up to 3 schemes per house and, where mfapi's house string
   differs from AMFI's AMC name, add it to the house's alias list, and
   count agreements. The primary scheme->house map stays AMFI's (NAVAll
   sections); mfapi never overrides it.
"""
from __future__ import annotations

import json
import time

from ..util import fetch

API = "https://api.mfapi.in/mf"
SOURCE = "mfapi.in"


def enrich(houses: dict, schemes: list[dict], per_house: int = 3) -> dict:
    stats = {"checkedSchemes": 0, "agreements": 0,
             "aliasesAdded": {}, "mfapiSchemeCount": None,
             "navallCodesInMfapi": None}
    try:
        listing = json.loads(fetch(API, timeout=60))
        mfapi_codes = {row["schemeCode"] for row in listing}
        stats["mfapiSchemeCount"] = len(mfapi_codes)
        stats["navallCodesInMfapi"] = sum(
            1 for s in schemes if s["code"] in mfapi_codes)
    except Exception:
        return stats  # enrichment is best-effort; NAVAll stands alone

    by_house: dict[str, list[int]] = {}
    for s in schemes:
        by_house.setdefault(s["house"], []).append(s["code"])
    for hid, codes in by_house.items():
        house = houses.get(hid)
        if house is None:
            continue
        for code in codes[:per_house]:
            try:
                doc = json.loads(fetch(f"{API}/{code}", timeout=30))
            except Exception:
                continue
            fh = (doc.get("meta") or {}).get("fund_house")
            if not fh:
                continue
            stats["checkedSchemes"] += 1
            if fh.strip().lower() == house["name"].strip().lower():
                stats["agreements"] += 1
            elif fh not in house["aliases"]:
                house["aliases"].append(fh)
                house["aliases"].sort()
                stats["aliasesAdded"].setdefault(hid, []).append(fh)
            time.sleep(0.1)
    return stats
