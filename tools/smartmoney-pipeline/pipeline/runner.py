"""Smart Money pipeline runner.

Usage:
    python -m pipeline.runner --root <output-dir> --job daily|monthly|all
                              [--workdir <dir>] [--month YYYY-MM]

Output dir layout follows the contract (it becomes
portfolio/data/smartmoney/ on the data branch):
    manifest.json  nav.json  houses.json  bhav-lite.json
    flows-fii-monthly.json  mf/stock/*.json  mf/house/*.json
    mf/leaderboards.json  _snapshots/<YYYY-MM>.json

Golden rule: a failed fetch NEVER overwrites a good file. Each dataset is
written only after a validated parse; on failure the previous file stays
and the manifest marks the dataset `stale` (or `unavailable` if no file
has ever been produced), with the error recorded.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from datetime import date

from . import derive as derive_mod
from .collectors import bhav, mfapi_enrich, navall, nsdl_fii
from .collectors import mf_monthly
from .util import ist_iso, month_key, prev_month, read_json, write_json_atomic

WALLED = {
    "shareholding": ("NSE/BSE shareholding API",
                     "Exchange APIs block datacenter IPs (Akamai 403, "
                     "verified 2026-11-16)"),
    "deals": ("NSE/BSE bulk & block deal API",
              "Exchange APIs block datacenter IPs (Akamai 403, "
              "verified 2026-11-16)"),
    "insider": ("NSE/BSE insider-trading API",
                "Exchange APIs block datacenter IPs (Akamai 403, "
                "verified 2026-11-16)"),
    "flowsDaily": ("NSE fiidiiTradeReact",
                   "Exchange APIs block datacenter IPs (Akamai 403, "
                   "verified 2026-11-16); NSDL monthly FII is the "
                   "labelled substitute (fiiMonthly)"),
}


class Run:
    def __init__(self, root: str, workdir: str):
        self.root = root
        self.workdir = workdir
        self.outcomes: dict[str, dict] = {}
        self.prev_manifest = {}
        p = os.path.join(root, "manifest.json")
        if os.path.exists(p):
            try:
                self.prev_manifest = read_json(p).get("datasets", {})
            except Exception:
                self.prev_manifest = {}
        os.makedirs(root, exist_ok=True)

    # -- outcome bookkeeping ------------------------------------------------
    def ok(self, key, as_of, source, **extra):
        self.outcomes[key] = {"status": "ok", "asOf": as_of,
                              "source": source, **extra}

    def partial(self, key, as_of, source, **extra):
        self.outcomes[key] = {"status": "partial", "asOf": as_of,
                              "source": source, **extra}

    _DATASET_FILES = {"nav": "nav.json", "bhavLite": "bhav-lite.json",
                      "fiiMonthly": "flows-fii-monthly.json",
                      "mfHoldings": "mf"}

    def failed(self, key, source, error):
        prev = self.prev_manifest.get(key, {})
        fname = self._DATASET_FILES.get(key)
        has_file = bool(fname) and os.path.exists(
            os.path.join(self.root, fname))
        self.outcomes[key] = {
            "status": "stale" if has_file else "unavailable",
            "asOf": prev.get("asOf") if has_file else None,
            "source": source,
            "note": f"Latest run failed: {error}"}

    # -- daily ---------------------------------------------------------------
    def job_daily(self):
        houses_map = None
        # NAV + houses (+ mfapi enrichment + AMFI disclosure directory)
        try:
            nav_doc, houses_map = navall.collect()
            enrich_stats = {}
            try:
                enrich_stats = mfapi_enrich.enrich(
                    houses_map, nav_doc["schemes"])
            except Exception as e:
                enrich_stats = {"error": str(e)[:120]}
            disc = {}
            try:
                disc = navall.amfi_directory()
            except Exception:
                disc = {}
            adapted = {a.house_id for a in mf_monthly.ADAPTERS}
            for hid, h in houses_map.items():
                if hid in adapted:
                    h["mfHoldings"] = "adapted"
                    if hid in mf_monthly.ADAPTER_NOTES:
                        h["mfNote"] = mf_monthly.ADAPTER_NOTES[hid]
                elif hid in mf_monthly.NOT_ADAPTED:
                    h["mfHoldings"] = "not-yet-adapted"
                    h["mfNote"] = mf_monthly.NOT_ADAPTED[hid]
                else:
                    h["mfHoldings"] = "not-yet-adapted"
                    h["mfNote"] = "No adapter yet; disclosure not " \
                                  "investigated in this pass"
                if disc.get(h["name"]):
                    h["disclosureUrl"] = disc[h["name"]]
            write_json_atomic(os.path.join(self.root, "nav.json"), nav_doc)
            houses_doc = {"asOf": nav_doc["asOf"], "source": navall.SOURCE,
                          "mfapiEnrichment": enrich_stats,
                          "houses": sorted(houses_map.values(),
                                           key=lambda h: -h["schemeCount"])}
            write_json_atomic(os.path.join(self.root, "houses.json"),
                              houses_doc)
            self.ok("nav", nav_doc["asOf"], navall.SOURCE,
                    note=f"{len(nav_doc['schemes'])} schemes, "
                         f"{len(houses_map)} houses")
        except Exception as e:
            self.failed("nav", navall.SOURCE, f"{type(e).__name__}: {e}")

        # Bhav-lite
        try:
            doc, _imap = bhav.collect()
            write_json_atomic(os.path.join(self.root, "bhav-lite.json"), doc)
            self.ok("bhavLite", doc["asOf"], bhav.SOURCE,
                    note=f"{len(doc['symbols'])} symbols")
        except Exception as e:
            self.failed("bhavLite", bhav.SOURCE,
                        f"{type(e).__name__}: {e}")

        # NSDL monthly FII (substitute series; newest months first, max 2
        # new aggregations per run — each is a ~50 MB workbook)
        try:
            flows_path = os.path.join(self.root, "flows-fii-monthly.json")
            have = {}
            if os.path.exists(flows_path):
                for r in read_json(flows_path).get("months", []):
                    have[r["month"]] = r
            index = nsdl_fii.list_months()
            missing = sorted((k for k in index
                              if month_key(*k) not in have), reverse=True)
            for (y, m) in missing[:2]:
                try:
                    row = nsdl_fii.collect_month(
                        y, m, os.path.join(self.workdir, "nsdl"))
                    have[row["month"]] = row
                except Exception:
                    continue  # one bad month must not sink the others
            if not have:
                raise ValueError("NSDL index yielded no months")
            doc = nsdl_fii.build_doc(list(have.values()))
            write_json_atomic(flows_path, doc)
            self.partial("fiiMonthly", doc["asOf"], nsdl_fii.SOURCE,
                         note=doc["note"])
        except Exception as e:
            self.failed("fiiMonthly", nsdl_fii.SOURCE,
                        f"{type(e).__name__}: {e}")
        return houses_map

    # -- monthly ---------------------------------------------------------------
    def _snapshot_path(self, y, m):
        return os.path.join(self.root, "_snapshots", month_key(y, m) + ".json")

    def _load_snapshot(self, y, m):
        p = self._snapshot_path(y, m)
        return read_json(p) if os.path.exists(p) else None

    def _collect_snapshot(self, y, m, prev_snap):
        rows, results = mf_monthly.collect_month(
            y, m, os.path.join(self.workdir, "amc"))
        houses_ok = [h for h, r in results.items() if r["status"] == "ok"]
        carried = []
        if prev_snap:
            prev_rows_by_house = {}
            for r in prev_snap["rows"]:
                prev_rows_by_house.setdefault(r["house"], []).append(r)
            for hid, r in results.items():
                if r["status"] != "ok" and hid in prev_rows_by_house:
                    rows.extend(prev_rows_by_house[hid])
                    carried.append(hid)
        snap = {"month": month_key(y, m), "housesOk": houses_ok,
                "housesCarriedForward": carried,
                "houseResults": results, "rows": rows}
        return snap

    def job_monthly(self, year, month):
        py, pm = prev_month(year, month)
        prev_snap = self._load_snapshot(py, pm)
        if prev_snap is None:
            # bootstrap: try to build the previous month first
            prev_snap = self._collect_snapshot(py, pm, None)
            if prev_snap["housesOk"]:
                write_json_atomic(self._snapshot_path(py, pm), prev_snap)
            else:
                prev_snap = None
        snap = self._collect_snapshot(year, month, prev_snap)
        if not snap["housesOk"]:
            self.failed("mfHoldings", "AMC monthly disclosures",
                        "all adapted houses failed: " +
                        json.dumps(snap["houseResults"])[:300])
            return
        write_json_atomic(self._snapshot_path(year, month), snap)

        # prices + symbol map for derive
        prices, isin_map = {}, {}
        bp = os.path.join(self.root, "bhav-lite.json")
        if os.path.exists(bp):
            bdoc = read_json(bp)
            prices = bdoc.get("symbols", {})
            isin_map = {v["isin"]: k for k, v in prices.items()}
        house_names = {}
        hp = os.path.join(self.root, "houses.json")
        if os.path.exists(hp):
            for h in read_json(hp).get("houses", []):
                house_names[h["id"]] = h["name"]

        prev_rows = prev_snap["rows"] if prev_snap else None
        prev_ok = set(prev_snap["housesOk"]) if prev_snap else set()
        if prev_rows is not None:
            # changes only for houses freshly collected in BOTH months
            prev_rows = [r for r in prev_rows
                         if r["house"] in prev_ok
                         and r["house"] in snap["housesOk"]]
            if not prev_rows:
                prev_rows = None
        baseline_houses = prev_ok & set(snap["housesOk"])
        stock_docs, house_docs, leaderboards = derive_mod.derive(
            snap["rows"], prev_rows, year, month, isin_map, prices,
            house_names, snap["housesOk"], prev_houses_ok=baseline_houses)

        mf_dir = os.path.join(self.root, "mf")
        stock_dir = os.path.join(mf_dir, "stock")
        house_dir = os.path.join(mf_dir, "house")
        for d in (stock_dir, house_dir):
            shutil.rmtree(d, ignore_errors=True)
            os.makedirs(d, exist_ok=True)
        for sym, doc in stock_docs.items():
            write_json_atomic(os.path.join(stock_dir, sym + ".json"), doc)
        for hid, doc in house_docs.items():
            write_json_atomic(os.path.join(house_dir, hid + ".json"), doc)
        if leaderboards is not None:
            write_json_atomic(os.path.join(mf_dir, "leaderboards.json"),
                              leaderboards)

        total_houses = 56
        hp_exists = os.path.exists(hp)
        if hp_exists:
            total_houses = len(read_json(hp).get("houses", [])) or 56
        failed_houses = [h for h, r in snap["houseResults"].items()
                         if r["status"] != "ok"]
        note_bits = []
        if failed_houses:
            note_bits.append("houses failed this run (previous data "
                             "kept): " + ", ".join(sorted(failed_houses)))
        if snap["housesCarriedForward"]:
            note_bits.append("carried forward unchanged: " +
                             ", ".join(sorted(snap["housesCarriedForward"])))
        if prev_rows is None:
            note_bits.append("no previous-month baseline yet — changes "
                             "start next month")
        from .collectors.amc.base import month_end_iso
        self.partial(
            "mfHoldings", month_end_iso(year, month),
            "AMC monthly disclosures",
            coverage=f"{len(snap['housesOk'])} of {total_houses} AMCs "
                     "adapted",
            note="; ".join(note_bits) if note_bits else None)

    # -- manifest ---------------------------------------------------------------
    def write_manifest(self):
        datasets = {}
        for key in ("nav", "bhavLite", "mfHoldings", "fiiMonthly"):
            if key in self.outcomes:
                datasets[key] = {k: v for k, v in self.outcomes[key].items()
                                 if v is not None}
            elif key in self.prev_manifest:
                datasets[key] = self.prev_manifest[key]
        for key, (source, note) in WALLED.items():
            datasets[key] = {"status": "unavailable", "source": source,
                             "note": note}
        manifest = {"version": 3, "generatedAt": ist_iso(),
                    "generatedAtNote": "IST (UTC+05:30)",
                    "datasets": datasets}
        write_json_atomic(os.path.join(self.root, "manifest.json"), manifest)
        return manifest


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--job", choices=["daily", "monthly", "all"],
                    default="all")
    ap.add_argument("--workdir", default=None)
    ap.add_argument("--month", default=None,
                    help="YYYY-MM for the monthly job (default: last "
                         "completed month)")
    args = ap.parse_args(argv)

    workdir = args.workdir or tempfile.mkdtemp(prefix="smartmoney-")
    run = Run(args.root, workdir)
    today = date.today()
    if args.job in ("daily", "all"):
        run.job_daily()
    if args.job in ("monthly", "all"):
        if args.month:
            y, m = (int(x) for x in args.month.split("-"))
        else:
            y, m = prev_month(today.year, today.month)
        run.job_monthly(y, m)
    manifest = run.write_manifest()
    print(json.dumps(manifest, indent=2))
    bad = [k for k, v in manifest["datasets"].items()
           if v["status"] in ("stale", "unavailable")
           and k not in WALLED]
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
