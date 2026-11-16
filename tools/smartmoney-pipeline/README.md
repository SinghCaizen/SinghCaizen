# Smart Money data pipeline — build report

**Status: built and dry-run-proven locally, 2026-11-16. Nothing has been
pushed to GitHub.** The app was not touched. Go-live needs only the
owner steps in [OWNER-STEPS.md](OWNER-STEPS.md).

The pipeline implements the contract in
`~/workspace/redesign-v2/SMARTMONEY-FEASIBILITY.md`: static JSON files
under `portfolio/data/smartmoney/` on a `data` branch, a `manifest.json`
whose per-dataset status (`ok` / `partial` / `stale` / `unavailable`)
drives the app's honest empty states, and a two-job GitHub Actions
schedule (daily + monthly).

## What was built

```
smartmoney-pipeline/
├── pipeline/
│   ├── runner.py            # jobs daily/monthly/all; manifest written LAST;
│   │                        # a failed fetch never overwrites a good file
│   ├── util.py              # fetch (retries, browser UA, URL quoting), IST
│   │                        # timestamps, atomic JSON writes, month helpers
│   ├── derive.py            # two monthly snapshots -> per-stock change
│   │                        # classes, house activity, leaderboards
│   └── collectors/
│       ├── navall.py        # AMFI NAVAll.txt -> nav.json + houses map;
│       │                    # + AMFI disclosure-directory scrape
│       ├── mfapi_enrich.py  # mfapi.in cross-checks (see below)
│       ├── bhav.py          # BSE UDiFF bhavcopy -> bhav-lite.json
│       ├── nsdl_fii.py      # NSDL FPI trade-wise archive -> monthly FII
│       ├── mf_monthly.py    # adapter registry + per-house blocker notes
│       └── amc/
│           ├── base.py          # shared row schema, debt filter, helpers
│           ├── generic_parse.py # SEBI-format spreadsheet parser (XLSX/CSV/
│           │                    # ZIP; fuzzy headers; equity/debt sections)
│           ├── groww.py  dsp.py  helios.py   # working adapters
│           ├── nippon.py samco.py            # investigated, NOT registered
│           │                                 # (documented blockers)
├── workflow/smartmoney-data.yml  # ready to paste (see OWNER-STEPS.md)
├── OWNER-STEPS.md                # the owner's exact clicks
├── requirements.txt              # openpyxl==3.1.2; everything else stdlib
└── out/                          # the dry-run output (real data)
```

Run it the way Actions will:

```bash
pip install -r requirements.txt
python -m pipeline.runner --root <output-dir> --job all --workdir <tmp-dir>
# jobs: daily (NAV, houses, bhav, NSDL check) | monthly (AMC adapters)
#       all   (both; monthly bootstraps the previous month if needed)
```

## Coverage — mutual-fund holdings

**3 of 56 AMCs adapted and proven end-to-end** (both Sep and Oct 2026
unless noted). Every other large house was investigated; the blocker for
each is recorded in `pipeline/collectors/mf_monthly.py` and surfaced per
house in `houses.json` (`mfHoldings: "not-yet-adapted"` + `mfNote`).

| House | Schemes (NAVAll) | Adapter result in dry run |
|---|---|---|
| Groww | 217 | ✅ Oct: 3,167 holding rows / 41 schemes · Sep: 3,149 rows (server-rendered page, direct XLSX links) |
| DSP | 361 | ✅ Oct: 3,469 rows / 56 schemes · Sep: 3,442 rows (page links month-end ZIPs directly) |
| Helios | ~30 | ✅ Oct only: 426 rows / 7 schemes reporting (per-scheme XLSX in WordPress uploads; the site links only the latest month, so Helios has no Sep baseline yet — its change fields are null, and the baseline builds from this pipeline's own snapshots from next month) |
| Nippon India | 1,870 | ❌ Its monthly "Weblink" ZIP contains only >1%-weight extracts (no ISIN, no quantity). Full portfolio is not published as a static spreadsheet. |
| Samco | small | ❌ Statutory page embeds only the Overnight Fund's file (no equity); other schemes sit behind the site's document browser. |
| ICICI Prudential, UTI, Kotak, SBI, Aditya Birla Sun Life, Axis, Motilal Oswal, PGIM India, Bank of India, WhiteOak, Mirae Asset, Tata, Franklin Templeton, JM Financial, Baroda BNP Paribas | — | ❌ Disclosure pages are JS apps / XHR-driven; no static spreadsheet links exist in the HTML to download (11+ houses, each verified by fetching the page). |
| Edelweiss, Quant, Navi, Bandhan, HSBC, Invesco, HDFC, Union | — | ❌ Page errors / 403 from datacenter IPs. |
| PPFAS (Parag Parikh) | — | ❌ Page exposes only stale 2018 static links; current files are JS-served/PDF. |
| Zerodha | — | ❌ Publishes top-10 holdings and dashboards only, not the full portfolio spreadsheet. |
| Quantum | — | ❌ Combined portfolio is an HTML view, not a downloadable file. |

29 houses carry an individually investigated blocker note; the remaining
24 (smallest by scheme count) are marked not-yet-adapted with a generic
note. No PDF parsers were written (per the brief); the JS-driven houses
are the realistic next step (their XHR endpoints), not PDFs.

**Totals from adapted houses:** Oct 2026 snapshot = 7,062 holding rows
across 104 schemes → **866 stock files** (`mf/stock/`), 3 house files,
and leaderboards. DSP alone: 56 schemes, 610 stocks held, top sector
Banks at 22.9% of equity value.

## Dry-run evidence

Runs performed in this sandbox (Python 3.12.3, openpyxl 3.1.2):

1. **Full run** (`--job all`, empty workdir): exit 0 in ~9 min.
2. **Monthly re-runs** after two parser fixes the dry run itself caught
   (below).
3. **Fresh-root seeding run** (`--job all` into an empty output dir —
   exactly the first Actions run): exit 0, reproduced every number.
4. **Failure test**: with collectors forced to raise, the previous
   `nav.json` was byte-identical afterwards and the manifest marked the
   dataset `stale` with the error and the last good `asOf` — the
   never-overwrite guarantee works.

### Output inventory (`out/`, 12 MB total)

| File | Size | Records |
|---|---|---|
| `manifest.json` | 1,334 B | 8 datasets (see below) |
| `nav.json` | 4,011,206 B | 14,455 schemes, asOf 2026-11-15 |
| `houses.json` | 16,270 B | 56 houses + mfapi stats + disclosure URLs |
| `bhav-lite.json` | 677,037 B | 5,141 symbols, asOf 2026-11-13 |
| `flows-fii-monthly.json` | 510 B | Feb + Mar 2025 (archive's newest) |
| `mf/stock/*.json` | — | 866 files |
| `mf/house/*.json` | — | dsp, groww, helios |
| `mf/leaderboards.json` | 6,542 B | net buys/sells, new entries, exits, accumulation |
| `_snapshots/2026-09.json` | 1,421,622 B | 6,591 rows (Groww + DSP) |
| `_snapshots/2026-10.json` | 1,515,219 B | 7,062 rows (Groww + DSP + Helios) |

### Manifest (from the dry run)

| Dataset | Status | asOf | Note |
|---|---|---|---|
| nav | ok | 2026-11-15 | 14,455 schemes, 56 houses |
| bhavLite | ok | 2026-11-13 | 5,141 symbols |
| mfHoldings | partial | 2026-10-31 | 3 of 56 AMCs adapted |
| fiiMonthly | partial | 2025-03-31 | NSDL archive ends Mar 2025 (labelled in file + manifest) |
| shareholding | unavailable | — | Exchange APIs block datacenter IPs (Akamai 403) |
| deals | unavailable | — | same |
| insider | unavailable | — | same |
| flowsDaily | unavailable | — | same; NSDL monthly is the labelled substitute |

### Spot-check — RELIANCE (INE002A01018), `out/mf/stock/RELIANCE.json`

Totals across adapted houses: **34 schemes hold it now (30 last month),
32,432,068 shares vs 19,912,100 → net +12,519,968 shares; disclosed
value ₹377,801 lakh (≈ ₹3,778 crore).** Selected holder rows
(shares now ← shares in Sep 2026 disclosure; class INFERRED):

| Scheme | Shares | Prev | Class |
|---|---|---|---|
| DSP Large & Mid Cap Fund | 5,405,681 | — | new |
| DSP ELSS Tax Saver Fund | 4,733,806 | 3,722,421 | increased |
| DSP India T.I.G.E.R. Fund | 3,396,656 | 3,388,108 | increased |
| DSP Arbitrage Fund | 2,913,000 | 2,619,500 | increased |
| DSP MSCI India ETF | 2,256,786 | 1,187 | increased |
| Helios Flexi Cap Fund | 1,442,818 | — | *(no baseline — Helios' first month)* |
| DSP Multi Asset Allocation Fund | 1,358,024 | 1,358,024 | unchanged |
| Groww Nifty EV & New Age Automotive ETF | 94,555 | 93,291 | increased |
| Groww Large Cap Fund | 28,277 | 19,277 | increased |
| Groww ELSS Tax Saver Fund | 13,814 | 19,988 | reduced |
| DSP Value Fund | 0 | 3,000 | exited |

Leaderboards behave sensibly on the same data: top estimated net buy
HDFCBANK (+16.6M shares ≈ ₹1,333 cr at BSE close, Groww+DSP only —
labelled estimated), and the accumulation board has HDFCBANK increased
by 26 schemes, INFY and AXISBANK by 23 each.

### NSDL FII (flows-fii-monthly.json)

Aggregated by streaming the official monthly workbooks (Mar 2025 alone
is 438,345 trades; the sheet XML is ~500 MB, parsed with `iterparse`,
running sums only). Buy/sell buckets follow SEBI's Master Circular for
Custodians, Annexure F transaction codes; equity instruments only;
values converted from the files' ₹ to ₹ crore:

| Month | Equity buy (₹ cr) | Equity sell (₹ cr) | Net (₹ cr) |
|---|---|---|---|
| 2025-02 | 274,904.25 | 326,580.27 | **−51,676.02** |
| 2025-03 | 310,659.74 | 306,808.50 | **+3,851.25** |

### What mfapi.in actually contributed

- Its scheme index independently covers **all 14,455** NAVAll scheme
  codes (mfapi lists 38,052 entries including plan variants).
- Sampled 167 schemes (up to 3 per house): **163 exact house-name
  agreements** with AMFI's mapping; the differing strings were added as
  informational aliases in `houses.json` ("BOI AXA Mutual Fund" for Bank
  of India; two legacy strings under IL&FS IDF, one of which —
  "ICICI Prudential Mutual Fund" — looks like an mfapi-side quirk).
- The scheme→house map itself stays AMFI's; mfapi never overrides it.

### Bugs the dry run caught (and the fixes)

1. Groww's file URLs contain literal spaces — `urllib` rejects them
   (curl had not). `util.fetch` now percent-encodes path/query for
   every fetch.
2. Groww sheet titles like `IB23-Groww Nifty EV & New Age Automotive
   ETF` were missed by the scheme-title detector (no "Fund" in the
   name), degrading scheme names to sheet codes ("EE", "2E"). Detector
   now also accepts ETF/Index titles and strips `IBxx-` prefixes;
   Helios filename-derived names are cleaned of "monthly portfolio as
   on…" boilerplate. Without this, month-over-month matching would
   have produced false new/exited pairs — after the fix, e.g. the Groww
   EV ETF correctly matches 93,291 → 94,555 shares as *increased*.

## Marked unavailable — and why

Per the owner's decision, the walled datasets stay in the contract with
reserved schemas; nothing was faked or scraped from a forbidden source:

- **shareholding, deals (bulk/block), insider, flowsDaily** —
  `status: "unavailable"`, reason recorded in the manifest:
  "Exchange APIs block datacenter IPs (Akamai 403, verified
  2026-11-16)". GitHub Actions runners are the same IP class, so no
  collector for these exists in code at all — only the manifest entries.
- **fiiMonthly is a partial substitute, never a stand-in**: NSDL's
  static trade-wise archive **ends at March 2025** (verified against
  the official index of 191 monthly ZIPs). The file and manifest label
  it "monthly, lagged, FII only", and the daily job keeps checking the
  index so new months are picked up if NSDL ever resumes publishing.

## Contract deviations (with reasons)

1. **Manifest timestamps are IST** (`2026-11-16T08:16:47+05:30`, with a
   `generatedAtNote`), not the `Z` form in the contract's example —
   per the build instruction for this pipeline.
2. **`mfHoldings.asOf` is the disclosure month-end** (2026-10-31), not
   the 1st — the date the data describes.
3. **Stock files are keyed by BSE symbol** (from the bhavcopy ISIN map;
   mostly identical to NSE symbols). Every stock file also carries its
   ISIN, so the app can join on either.
4. **`bhav-lite.json` has no delivery-% column** — BSE's UDiFF bhavcopy
   does not publish one (already noted in the feasibility study).
5. **Helios enters with one month only** (its site links just the
   latest month) — change fields are null rather than fabricated, per
   the honesty rules; from the next monthly run its baseline is the
   pipeline's own snapshot.
6. **Leaderboard ₹ values are estimates by design** (share change ×
   latest BSE close) and are labelled `estValueChangeCr` with the basis
   written into the file; per-stock totals use the disclosures' own
   market values, which are real.

## Go-live

Owner actions are in [OWNER-STEPS.md](OWNER-STEPS.md): create the
`data` branch, paste `workflow/smartmoney-data.yml` into
`.github/workflows/` on `main`, set Actions workflow permissions to
read/write, and run the workflow once by hand (job = `all`) to seed.
The pipeline code must also be present on `main` under
`tools/smartmoney-pipeline/` (a normal code push — deliberately not
done in this local-only build pass).
