# FolioAnalytics — pure analytics engine for FOLIO by Singh Caizen

**Files**

| File | Purpose |
|---|---|
| `analytics.js` | The engine. Pure vanilla JS: no DOM, no fetch, no app globals, no imports. Exposes `FolioAnalytics.compute(input)` and `FolioAnalytics.selfTest()` on the page global (`window`/`self`) and via `module.exports` when present. |
| `analytics-worker.js` | Web Worker wrapper: `importScripts("analytics.js")`, computes on message, posts the result or `{error}`. |
| `ANALYTICS.md` | This document: contract, formulas, rules, self-test results. |

No existing app file is touched. The module is loaded lazily by the app or inside a
Web Worker; it never fetches data and never reads app state — everything arrives
as plain data and everything returned is JSON-serializable.

---

## 1. Basis (identical to the app)

- The app works on NIFTY trading days (~1 year window) and computes
  **flow-adjusted daily portfolio returns** `r = (V[i] − FLOW[i]) / V[i−1] − 1`
  (FLOW = external money in/out that day, buys positive, sells negative) and
  drops wild outliers.
- The engine takes those returns **ready-made** when supplied
  (`input.rets` / `input.brets`, aligned pairwise). When they are not supplied,
  it rebuilds them from `V` + `FLOW` with exactly that formula, dropping any day
  whose return is non-finite or `|r| > 0.5` (a >50% one-day move of a whole
  portfolio can only be a data error); benchmark returns for the same days come
  from `bench` closes, `bench[i]/bench[i−1] − 1`.
- Annualization uses **252 trading days** everywhere. Risk-free rate `rf` is an
  annual decimal (default `0.065`); daily risk-free `rfD = rf / 252`.
- **Minimum-data rule:** if the return chain has **< 60 points**, the result
  carries `enough: false` and `reason: "Needs at least 60 days of data"`, and
  portfolio history-dependent outputs (`returns`, `risk`, `corrMatrix`,
  `divRatio`, `riskContrib`, Monte Carlo, and the Returns / RiskControl /
  Consistency / Momentum grades) are `null`. Weight-only outputs (top weights,
  HHI, effective N, the Diversification grade) and per-stock price-path metrics
  (which stand on their own closes, with their own minimums) still compute.

## 2. Input contract

```js
FolioAnalytics.compute({
  dates:     ["2025-01-01", ...],        // day labels, aligned with V / FLOW / bench / symCloses / symValues
  V:         [ ... ],                    // portfolio value per day
  FLOW:      [ ... ],                    // external flow per day (buys +, sells −), applied that day
  bench:     [ ... ],                    // benchmark closes aligned with dates
  rets:      [ ... ],                    // OPTIONAL ready-made flow-adjusted portfolio returns
  brets:     [ ... ],                    // OPTIONAL benchmark returns, pairwise-aligned with rets
  retDates:  [ ... ],                    // OPTIONAL end date of each supplied return (else assumed: rets[k] ends on dates[k+1])
  symCloses: { SYM: [close|null, ...] }, // per-stock closes aligned with dates
  symValues: { SYM: [value, ...] },      // per-stock values (qty held × close); used only as a weights fallback
  weights:   { SYM: fraction },          // current weights; if absent, derived from the last symValues
  rf:        0.065,                      // annual risk-free rate, decimal (default 0.065)
  benchName: "NIFTY 50",                 // label used in report-card reasons
  paths:     1000,                       // Monte Carlo paths (default 1000, clamped 10..2000)
  seed:      42                          // Monte Carlo seed (default 42)
})
```

Dates may be `"YYYY-MM-DD"` strings, epoch ms, or `Date` objects; they are echoed
back unchanged in outputs. The input object is never mutated.

## 3. Output contract (summary)

```js
{
  enough, points /* chain length */, asOf /* last date */, reason /* null or the 60-day message */,
  returns:  { rolling, calendarYears, bestWorst, positiveMonths, histogram, twrTotal, twrAnnualized } | null,
  risk:     { vol, downsideDev, sharpe, sortino, calmar, maxDD, currentDD, longestDD,
              var95, cvar95, beta, alpha, corr, r2, trackingError, upCapture, downCapture, benchAnn } | null,
  allocation: { top1, top3, top5, hhi, effN, corrMatrix: {syms, matrix} | null,
                divRatio, riskContrib: {SYM: pct} | null },
  stocks:   { SYM: { twrStock, annStock, vol, beta, corr, mom, hi52, lo52, distHiPct,
                     distLoPct, rangePosPct, ma: {d20, d50, d200, vs20, vs50, vs200},
                     rsi14, maxDDStock } },
  scenarios:{ stress: [{shock, impact}] | null, stressCoverage, monteCarlo | null },
  reportCard: { Returns, RiskControl, Diversification, Consistency, Momentum }, // each {grade, score, reason}
  crossChecks: { weightsSum, riskContribSum, twrVsGiven: { fromRets, fromVF, ok } }
}
```

**Guarantees:** no `NaN`, `undefined`, or `Infinity` ever appears (every division
is guarded and a final sanitize pass converts non-finite numbers to `null`).
`null` always means "not computable from the data given" — the UI should render
it as *"Not available in free data"* or the 60-day message, never as 0.

### Units

| Quantity | Unit |
|---|---|
| Returns (rolling, calendar, TWR, momentum, stock TWR), vol, downsideDev, trackingError, alpha, stress impact | decimal fraction (0.05 = 5%) |
| `*Pct` fields, `maxDD.pct`, `currentDD.pct`, VaR/CVaR, risk contributions, capture ratios, positive-month `ratio` | **percent** (5 = 5%; risk contributions sum to 100) |
| Sharpe, Sortino, Calmar, beta, corr, R², HHI, effN, divRatio | unitless |
| Weights, top1/3/5 | fractions of the portfolio |

## 4. Formulas

Notation: `r[i]` = flow-adjusted daily portfolio returns (the chain, length `n`),
`b[i]` = benchmark returns paired with `r[i]`, `rfD = rf/252`, `mean`/`sd` are the
sample mean / sample standard deviation (denominator `n−1`).

### 4.1 Returns

- **Rolling TWR** (windows 1M = 21, 3M = 63, 6M = 126, 1Y = 252 returns):
  `Π (1 + r[i]) − 1` over the last `w` returns. **Strict:** `null` when `n < w`
  (no partial windows, no relabelling).
- **Calendar-year TWR:** `Π (1 + r[i]) − 1` over returns whose **end date** falls
  in that year; `days` = number of returns chained.
- **Best/worst day:** max/min single `r[i]` with its end date. **Week/month:**
  max/min of the chained product over every rolling window of 5 / 21 returns,
  reported with the window's end date.
- **Positive months:** returns grouped by end-date calendar month, chained per
  month; `ratio` = % of counted months with a positive product; `monthsCounted`.
  `bestStreak` = longest run of consecutive days with `r > 0`; `curStreak` =
  signed length of the current run (+ green / − red, 0 if the last day was flat);
  `greenDays` = count of `r > 0`; `totalDays` = `n`.
- **Histogram:** 12 equal-width bins across `[min r, max r]` (last bin includes
  the max), plus `mean`, `median`, and **sample skewness** (adjusted
  Fisher–Pearson): `g1 = sqrt(n(n−1)) / (n−2) × m3 / m2^1.5` with `m2`, `m3` the
  2nd/3rd central moments.
- **TWR total:** `Π (1 + r[i]) − 1` over the whole chain.
  **TWR annualised:** `(1 + twrTotal)^(252/n) − 1`.

### 4.2 Risk

- **Volatility:** `sd(r) × sqrt(252)`.
- **Downside deviation:** `sqrt( Σ min(r[i] − rfD, 0)² / n ) × sqrt(252)`
  (target = daily risk-free; all days in the denominator).
- **Sharpe:** `(mean(r) − rfD) / sd(r) × sqrt(252)`; `null` when `sd(r) = 0`.
- **Sortino:** `(mean(r) − rfD) / downsideDaily × sqrt(252)`, where
  `downsideDaily` is the un-annualised downside deviation above.
- **Drawdowns** are computed on the unitized wealth index `W` chained from `r`
  (`W[0] = 1`):
  - `maxDD.pct` = largest `(1 − W[trough] / W[peak]) × 100`, with the peak and
    trough dates.
  - `currentDD` = `(1 − W[last] / W[running peak]) × 100`, the date of that
    peak, and the trading days since it.
  - `longestDD` = the longest peak→recovery episode in trading days
    (recovery = first day wealth is back at/above the episode's peak level);
    `recovered` false if still open at the end, and `recoveryDays` =
    trough→recovery days (`null` when unrecovered).
- **Calmar:** `twrAnnualized / |maxDD|` (maxDD as a fraction).
- **VaR95 / CVaR95 (1-day, historical):** sort `r` ascending;
  `idx = floor(0.05 × n)`; VaR return = `sorted[idx]`; CVaR return = mean of
  `sorted[0..idx]` (the tail at-or-beyond the VaR point). Reported as
  **positive percent loss**: `VaR = −(VaR return) × 100`. A negative VaR value
  means the 95% boundary itself was a gain day (see the note in §7).
- **Beta:** `cov(r, b) / var(b)` on the paired subset.
  **Jensen's alpha (annualised):** `((mean(r) − rfD) − beta × (mean(b) − rfD)) × 252`.
  **Correlation:** Pearson on the paired subset. **R²** = corr².
- **Tracking error:** `sd(r − b) × sqrt(252)` on the paired subset.
- **Up-capture:** `mean(r on days b > 0) / mean(b on days b > 0) × 100`;
  **down-capture:** the same over days `b < 0`. `null` when a side has no days
  or a zero denominator.
- `benchAnn` (also returned, used by the report card): benchmark TWR over the
  paired subset, annualised like the portfolio TWR.

### 4.3 Allocation & concentration

- **top1 / top3 / top5:** sums of the largest current weights (fractions).
- **HHI:** `Σ wᵢ²`. **Effective number of stocks:** `1 / HHI`.
- **Correlation matrix:** pairwise Pearson correlation of per-stock daily
  returns. A stock's daily return exists only when closes on adjacent trading
  days are both present. A pair needs **≥ 30 shared days**, else the entry is
  `null` (diagonal is 1 when the stock itself has ≥ 30 returns, else `null`).
- **Diversification ratio:** `(Σ wᵢσᵢ) / σp` — weights renormalised over the
  stocks that have a computable vol (≥ 30 day-aligned returns); `σp` is the
  portfolio volatility from §4.2.
- **Risk contributions:** with the covariance matrix `Σ` of stock returns on the
  days where **all** included stocks have a return (listwise; needs ≥ 30 such
  days) and current weights `w` renormalised over the included stocks:
  `RCᵢ = wᵢ × (Σw)ᵢ / (wᵀΣw) × 100` (percent of portfolio variance, in vol
  terms). Values are rounded to 2 decimals and the rounding difference is
  adjusted onto the largest contributor, so they **sum to exactly 100**.
  `null` when the covariance-implied portfolio variance is 0 or data is short.

### 4.4 Per-stock metrics (`stocks[SYM]`)

Price-path metrics use the stock's own usable closes in order; day-aligned
statistics use only adjacent-day returns (see §4.3 note).

- **twrStock:** `Π (1 + own daily returns) − 1` over the stock's available
  window. **annStock:** `(1 + twrStock)^(252/m) − 1`, `m` = number of own
  returns; `null` when `m < 60`.
- **vol:** `sd(day-aligned returns) × sqrt(252)`, needs ≥ 30 returns.
- **beta / corr vs benchmark:** OLS / Pearson on day-aligned pairs vs the
  benchmark's same-day returns, needs ≥ 30 pairs.
- **Momentum** (`1M/3M/6M/1Y` = 21/63/126/252 own returns):
  `close[last] / close[last − w] − 1`; `null` when the window exceeds the data.
- **52-week:** `hi52` / `lo52` = max/min of the last 252 usable closes;
  `distHiPct = (last/hi − 1) × 100` (≤ 0), `distLoPct = (last/lo − 1) × 100`
  (≥ 0), `rangePosPct = (last − lo) / (hi − lo) × 100`.
- **Moving averages:** `d20/d50/d200` = mean of the last 20/50/200 usable closes
  (`d200` is `null` with fewer than 200 closes); `vs*` = `(last/MA − 1) × 100`.
- **RSI(14):** Wilder's method — first averages are the simple means of the
  first 14 close changes, then smoothed `avg = (avg×13 + current) / 14`;
  `RSI = 100 − 100/(1 + avgGain/avgLoss)`; 100 when there are no losses, 50
  when perfectly flat; `null` with fewer than 15 closes.
- **maxDDStock:** the §4.2 drawdown engine on the stock's own closes (percent).
- **`ddFromCost` is deliberately absent** — it needs the average cost, which
  this engine does not receive; the UI adds it.

### 4.5 Scenarios

- **Stress test:** portfolio beta over covered stocks `βcov = Σ wᵢβᵢ` (raw
  current weights, stocks without a beta contribute 0). For a benchmark shock
  `s` (−10%, −20%): `impact = s × βcov` (fraction). `stressCoverage` = share of
  total weight that has a beta. This is a beta-based **estimate**, and the UI
  must label it as such.
- **Monte Carlo:** bootstrap — resample the chain returns with replacement
  (a one-day factor is floored at 0) and compound for 1260 trading days,
  recording the wealth multiple every 21 days. `paths` from input (default
  1000, clamped 10..2000). Percentile bands (type-7 linear interpolation) are
  reported for the 1, 3 and 5 year horizons at steps 0, 21, …, 252×years, as
  **multiples of the start value (start = 1.0)** so the result is
  currency-free. Randomness comes from a seeded **mulberry32** PRNG
  (`input.seed`, default 42), so identical input → identical output. This is a
  simulation, not a prediction.

### 4.6 Report card — exact rule table

Scores are integers 0..100 (clamped, rounded). Grades: **A ≥ 75, B ≥ 55,
C ≥ 35, else D.** Every `reason` is one neutral sentence built from the actual
numbers — never advice. When a grade cannot be computed, `grade` and `score`
are `null` and `reason` says why (`"Needs at least 60 days of data"` or
`"Not available in free data"`).

| Grade | Score rule | Reason cites |
|---|---|---|
| Returns | `50 + (twrAnn − benchAnn) × 500` (i.e. ±10% excess ⇒ 0/100) | annualised return vs benchmark over the window |
| RiskControl | `0.6 × clamp(100 − maxDD% × 2.2) + 0.4 × clamp(110 − vol% × 2.2)` | max drawdown %, annualised vol % |
| Diversification | `0.6 × clamp((effN − 1)/9 × 100) + 0.4 × clamp(100 − max(0, top1 − 0.25) × 200)` | effective N, largest holding % |
| Consistency | `0.6 × positive-month ratio% + 0.4 × green-day share%` | both percentages |
| Momentum | 30 if rolling 3M > 0, + 30 if rolling 6M > 0, + 20 if last V > its 50-day MA, + 20 if last V > its 200-day MA (a missing component scores 0) | 3M/6M returns, MA positions |

Notes: the Momentum MA position uses the raw portfolio value series `V` (as
specified); external flows can move `V` independently of performance, so this
component is a level check, not a return check. Diversification is computed
even when history is short; the other four grades are `null` under the 60-day
rule.

### 4.7 Cross-checks

- `weightsSum` — raw sum of the supplied (or derived) weights; ≈ 1 expected.
- `riskContribSum` — sum of the risk contributions; exactly 100 when computable.
- `twrVsGiven.fromRets` — TWR chained from the return chain;
  `fromVF` — the same window TWR recomputed independently from `V` and `FLOW`;
  `ok` when `|fromRets − fromVF| ≤ 0.005 + 0.01 × |fromVF|`. A false `ok`
  flags an inconsistency between the app's return chain and its value/flow
  series (e.g. an outlier the app dropped), and should be surfaced, not hidden.

## 5. Minimum-data thresholds (one place)

| Rule | Threshold |
|---|---|
| Portfolio history sections (`enough`) | chain ≥ 60 returns |
| Rolling window / stock momentum window | window ≤ available returns (strict) |
| Stock `annStock` | ≥ 60 own returns |
| Stock vol / beta / corr; corr-matrix pairs; div-ratio vols | ≥ 30 (paired) returns |
| Risk contributions | ≥ 30 days where all included stocks have returns, and `enough` |
| RSI(14) | ≥ 15 closes |
| MA200 | ≥ 200 closes |

## 6. Worker protocol

```js
// analytics-worker.js
importScripts("analytics.js");
```

- **IN:** the `compute()` input object directly. An optional `_id` field is
  ignored by the engine and echoed back for request/response correlation.
  `{ cmd: "selfTest", _id }` runs the self-test instead.
- **OUT (success):** the `compute()` result object (plus `_id` when one was sent).
- **OUT (failure):** `{ error: "message" }` (plus `_id` when one was sent).

Heavy work (correlation matrix, Monte Carlo) belongs in the worker; `compute()`
itself is synchronous and allocation-free of DOM/network, so it is equally safe
on the main thread for small inputs.

## 7. Self-test results

`FolioAnalytics.selfTest()` — synthetic cases with known answers, run under
Node against the shipped file. **22 / 22 assertions pass.**

| # | Assertion | Got | Want |
|---|---|---|---|
| 1a | constant +1%/day series (from V): twrTotal = 1.01¹⁰⁰ − 1 | 1.7048138294215294 | 1.7048138294215285 |
| 1b | constant series: vol ≈ 0 | 0 | 0 |
| 1c | constant series: Sharpe is null (zero-stdev guard) | null | null |
| 2 | alternating +2%/−1%: vol = sample sd × √252 | 0.23931721056523958 | 0.2393172105652397 |
| 3a | stock = 2× benchmark: beta | 2.0000000000000004 | 2 |
| 3b | corr | 0.9999999999999997 | 1 |
| 3c | alpha (rf = 0) | −1.5e−15 | 0 |
| 3d | R² | 0.9999999999999993 | 1 |
| 4a | V = [100,120,60,90,130]: maxDD | 50 | 50 |
| 4b | currentDD after recovery | 0 | 0 |
| 4c | longestDD days (peak→recovery) | 3 | 3 |
| 4d | longestDD recovered | true | true |
| 4e | recoveryDays (trough→back-at-peak) | 2 | 2 |
| 5a | VaR95 index rule, single −5% day in 100 (see note) | −0.1 | −0.1 |
| 5b | CVaR95, single −5% day in 100 | 0.75 | 0.75 |
| 5c | VaR95 with a populated 5% tail (ten −5% days) | 5 | 5 |
| 5d | CVaR95 with a populated 5% tail | 5 | 5 |
| 6a | weights {.5, .3, .2}: HHI | 0.38 | 0.38 |
| 6b | effN | 2.6315789473684212 | 2.6315789473684212 |
| 6c | enough = false with no history; weights still compute | false | false |
| 7 | Monte Carlo, same seed → identical year-1 p50 | 1.6551449930488193 | 1.6551449930488193 |
| 8 | risk contributions sum (3-stock shared-factor synthetic) | 100 | 100 ± 0.5 |

Notes on individual cases:

- **Case 4** exercises the drawdown engine directly: `compute()` correctly
  gates the risk section behind the 60-day rule, so a 4-return input returns
  `risk: null` by design.
- **Case 5 — read this.** The index rule is implemented exactly as specified:
  sort ascending, `idx = floor(0.05 × n)`. On the specified series (one −5% day
  and ninety-nine +0.1% days, n = 100), `idx = 5` lands on the **6th smallest**
  return, which is +0.1% — the single bad day sits *inside* the 5% tail but the
  boundary observation is a gain, so the rule honestly yields VaR95 = −0.1
  (i.e. "at the 95% boundary the day was a 0.1% gain") while CVaR95 = 0.75%
  averages the whole tail including the −5% day. When the tail is populated at
  the boundary (case 5c/5d, ten −5% days), the same rule yields exactly 5%.
  The self-test therefore asserts the rule's true values on both series rather
  than an approximate 5% on the first. If the product definition of VaR95
  changes (e.g. worst-in-tail), only `varCvar()` in `analytics.js` needs to
  change.

## 8. Performance (measured, Node, this machine)

| Workload | Time |
|---|---|
| Full compute, 12 stocks × 252 days, Monte Carlo 1000 paths | ~80 ms |
| Full compute, 40 stocks × 252 days (40×40 correlation matrix, listwise covariance), Monte Carlo 2000 paths × 1260 steps | ~200 ms |

Both are far inside a worker's budget; startup is unaffected because the module
is loaded lazily / off-thread. The only super-linear work is the necessary
`O(stocks² × days)` correlation matrix and `O(paths × 1260)` Monte Carlo.

## 9. Deliberate exclusions

- **`ddFromCost`** (drawdown from average cost): needs average cost per stock,
  which is not part of this engine's input — the UI adds it.
- **Fundamentals** (PE, PB, ROE, margins, …): not computed here; the app
  already fetches what free data allows and shows "Not available in free data"
  where it does not. This engine consumes prices/values only.
- **`symValues`** is accepted (it is part of the app's data) but used only as
  the weights fallback described in §2.
