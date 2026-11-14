# Folio — Bug Log

Written 2026-11-12 BEFORE the fix pass for the 8-task brief of the same day.
Backup of the pre-fix code: branch `backup-2026-11-12` (commit 0c14fa86).
Status key: OPEN = to fix in this pass · FIXED = fixed, awaiting verification ·
ENV = environment/platform behaviour, not an app-code bug.

## From the brief (Task 1)

1. **Stock popup header overlap** — OPEN. The price pill ("Price ₹… · −x% today")
   and the "Not in your portfolio" pill overlap the stock name/heading; the name
   under the symbol is misaligned. The head row has no flex-wrap/gap.
2. **Stock popup chart can stay an empty box** — OPEN. When every price proxy
   fails there is no terminal state inside the chart area (no message, no Retry).
3. **"About the Company" fallback reads like a bug** — OPEN. The fallback copy
   ("Full details … replace this card the moment the free feed answers") can be
   the permanent state because Yahoo's fundamentals endpoint is crumb-gated for
   browser apps (verified 2026-11-12: quoteSummary returns "Invalid Crumb").
   The card needs an honest "unavailable in the free feed" state, field by field.
4. **Watchlist sheet action row uneven** — OPEN. Remove from Watchlist / list
   dropdown / Copy to List buttons are uneven heights and wrap badly.
5. **Rebalancing rows overflow on phones** — OPEN. Rows run past the card edge,
   "Sell ₹…" is cut off, Target % inputs truncate, and the drift-bar track is
   invisible (only the white target tick shows) on the dark theme.
6. **Bottom nav covers page content** — OPEN. Scrollable views and modals lack
   bottom padding of nav height + safe-area + 16px (Goal Tracker's "Assumed
   return" field hides behind the dock).
7. **"Demo mode is ON" banner can be wrong** — OPEN. The login screen can claim
   the Firebase keys are missing when the config IS present but the SDK script
   is slow/blocked, and in that case the copy misleads. (Verified: real keys are
   in js/firebase-config.js since 2026-11-11; cloud sign-up/login work.)

## Found by testing (E2E passes, 2026-11-12)

8. **Terms popup can reappear after being accepted** — OPEN. Two elements share
   id="termsModal" (the first-run terms and the footer legal modal), so show/
   hide can hit the wrong node; acceptance is also only stored in the synced
   profile, which a stale cloud read can roll back.
9. **Batch buy+sell of the same stock is rejected** — OPEN. Saving one batch
   that buys and then sells the same stock fails with "You hold only 0 shares"
   because sell validation counts only previously saved holdings, not buys in
   the same batch.
10. **Profit Factor shows "∞"** — OPEN (older Insights panel). With no losing
    trades the ratio is infinite; it should read "— / No losses yet".
11. **Risk/return cards could show impossible numbers** — FIXED in v61
    (2026-11-12), pending re-verification. Symbols whose price history failed
    to load let their buy cash-flows into the return math without their value,
    producing volatility >1000% and drawdown below −100%. The series now uses
    one consistent universe of symbols with usable history and says which
    symbols were left out.
12. **Holding drawer "Live Status" can sit on "Loading status…"** — OPEN. When
    all proxies are unreachable the line never reaches an error state.
13. **Info "i" popups hid behind the bottom dock** — FIXED in v61 (centered
    popup). Pending re-verification.

## Structural (from the brief, Tasks 2–7)

14. **IPO lists lean on a built-in catalog with old seeds** — OPEN (Task 4).
    Date-driven status exists (v49), but the list rules differ from spec:
    Closed shows latest 10 (spec: 20 + "Show older"), no year filter, and the
    default view is not Open + Upcoming.
15. **Footer shows on every tab** — OPEN (Task 6: dashboard only).
16. **Insights renders ~25 heavy sections eagerly** — OPEN (Task 7). Only the
    newest cards are viewport-lazy; older panels compute on first view open.
17. **Refresh keeps running when the tab is hidden** — OPEN (Task 7).

## Found by the combined E2E (2026-11-12 evening, builds v58–v60)

21. **Cross-account contamination / rollback risk in cloud sync** — FIXED in v68.
    A new account in the same browser could see the previous account's trades,
    and trades could vanish after re-login. Mechanism: the in-memory state is
    global while the account (and its Firestore doc) switches instantly, so a
    save scheduled in the gap could write one account's state into another's
    document; snapshot echoes could also roll the in-memory state back to an
    older cloud copy, discarding fresh local edits. Fix: saves are frozen from
    the moment auth changes until enterApp installs the new account's state;
    each debounced write re-checks the account + document it was scheduled
    for; snapshots older than the last applied cloud timestamp are ignored;
    and if local edits are newer than an incoming snapshot, the local state
    wins and is re-pushed.
22. **Auto-lock could fire during automation-style activity** — HARDENED in
    v68. The inactivity timer now also resets on scroll, wheel and pointer
    movement, not only clicks/keys/touches.
23. **What-If calculator prefilled a raw float price** (12.979999…) — FIXED in
    v68 (prefill rounds to 2 decimals).
24. **Holdings 52-week label could clip at the card edge** — FIXED in v68
    (sparkline row wraps; the range bar keeps a minimum width).
25. **Market Pulse had no fallback** when the 1-month index fetch failed —
    v68 retries each index on the 5-day range before showing the empty note.
26. **Goal Tracker date field fought the tester** — NOT REPRODUCED as an app
    bug: the repeated Terms modal (bug 8, fixed in v65) kept re-rendering the
    page and scrambling the half-typed date. Re-test on the current build.

## Environment, not app bugs

18. **GitHub Pages can serve a stale build for hours** — ENV. Observed
    2026-11-11/12 (one edge served a build ~6h old; different edges served
    different builds at the same time). Mitigations in app: versioned asset
    URLs (?v=) and a network-first service worker (v64). A hard refresh or
    reopening the page is the user-side cure.
19. **Browser favicon cache** — ENV. Some browsers keep showing a generic
    globe after the icon changed; clearing the site's data fixes it. The site
    ships both an SVG icon and an embedded PNG favicon.
20. **Test-network data slowness** — ENV. The automated test network blocks or
    slow-walks most external hosts (price proxies, CDNs), so charts/prices can
    look broken in tests while working on a normal phone connection.
27. **Encryption wizard never came back after "Later"** — FIXED in v76.
    The deferral was stored for the session and the per-account "already
    offered" flag was never cleared on logout, so a user who tapped Later
    was never offered encryption again and had no manual path in. Now every
    fresh login re-offers it, and My Profile → Security has a permanent
    Vault Encryption row (Set up / Unlock / Re-link password).
28. **Unlock silently did nothing** — FIXED in v78. The vault opened
    (unwrap succeeded) but the final decryption check used the account
    identity from the live session object, which is still empty at
    login-time decryption, while encryption had used the account email —
    the check failed and the app quietly fell back to the unlock box with
    no error. The document's own identity is now stored with the vault
    and used for every encrypt/decrypt. Verified end-to-end 2026-11-12
    (setup, password auto-unlock, wrong-code rejection, seed unlock,
    clean account deletion).
29. **Screen rebuilt itself while the user was editing** — FIXED in v79.
    Price refresh re-rendered the whole app after every 4 symbols, and
    every cloud echo re-rendered too, so forms kept dying mid-edit. An
    editing shield now defers background renders while a popup is open
    or a field is being typed in, and applies them when the user is
    free. Same fix round: the holding card's mini chart had no fixed
    size and scaled to fill the card — now locked to its real 84x24.

## v89 audit round (2026-11-14) — full-app audit: 51 findings (32 layout/CSS, 8 core JS, 11 features)
30. Insights risk score / gauge / stock-sheet volatility printed literal "NaN" when any holding's price history contained a 0 close: log returns guarded only the previous close in 3 copies (loadInsScores, quantStats, fillSheetCorp). Fixed: both closes must be > 0; headline return also null-guarded at zero endpoints.
31. Editing a SELL entry could never save: validation ran against holdings that already excluded that sell (the edit removal happens after validation). Fixed: single-row edits count the original sell back in.
32. No Android back-button handling anywhere except the stock sheet: back exited the app with any other popup open, and stale stock-sheet history entries swallowed later presses. Fixed: central v89 modal manager — popstate closes the topmost popup first, then returns to Dashboard; per-open pushes tracked in one stack.
33. A failed first Firestore snapshot left a signed-in user stuck on the login screen forever (error was console-only). Fixed: clear message + Retry button on the auth screen.
34. Cloud save failures were console-only. Fixed: throttled toast tells the user the change did not save.
35. TA chart: when the real fetch failed, fabricated "synthetic preview" candles kept being analysed as if real, under a chip claiming real history was loading. Fixed: 3 retries, then the verdict area shows an honest error + Retry; no analysis is presented from preview bars.
36. FIFO capital gains silently dropped sales with no matching BUY lots (e.g. imported holdings). Fixed: listed as flagged "No buy record" rows, excluded from totals (buy price unknown), CSV export guarded against the nulls.
37. Deals module could print "₹NaN Cr": fmtCr had no finite guard and pipeline rows were used unvalidated. Fixed: fmtCr returns "—", rows validated at load.
38. Dashboard "Spotted deals" filter was dead code (`|| true`), so the "on my stocks" card showed deals for stocks not held. Fixed.
39. Compare Stocks 52W position printed "NaN% of range" when 52W high == low. Fixed: position only computed when high > low (same guard added to the watchlist 52W bar).
40. features.js fmtDate had lost app.js's falsy fallback — empty dates rendered "Invalid Date". Fixed: "—" for falsy/unparseable.
41. Duplicate 60-second interval updated the market pill twice a minute. Removed. The 1-second dock poller also ran while logged out; now gated on currentUser.
42. Watchlist price alerts could fire on a stale previous-session cached price and consume the day's one allowed firing. Fixed: alerts only evaluate prices refreshed within 20 minutes.
43. The Task A skeleton watchdog never covered the Insights analytics cards (they use .insx-skel, not .skel), and their error state had no Retry. Fixed: selector extended; error cards get a Retry button that reloads the series.
44. Every popup stretched full-width on desktop: a v44 !important lock (width/max-width 100%) overrode all card widths (460px default, 620px txn, 980px wide). Fixed in the v89 modal block: 460px default, txn 680px, wide min(980px,100%); phones get bottom sheets (max 85dvh).
45. viewport meta lacked viewport-fit=cover while the status bar is black-translucent — every safe-area-inset rule was inert and the sticky topbar could slide under the notch in the installed PWA. Fixed: viewport-fit=cover + topbar top inset; dock bottom inset restored in the final cascade (a later `bottom:14px !important` had overridden the inset rule).
46. Tap targets below 44px across ~24 controls (modal ✕ buttons were ~33×28, dashboard collapse 32px — a regression of the v65 fix, segments, chips, tabs, watchlist actions, etc.). Fixed via a v89 hit-area block (visual design untouched; exceptions: chart zoom buttons and calendar cells at 40px, the settings checkbox at 26px).
47. Toast hid behind/overlapped the bottom dock's tap zone on phones and a second toast was cut off by the first toast's hide timer. Fixed: toast sits above the dock on ≤768px; the timer resets on every toast; toasts can carry an Undo button.
48. Stock-sheet results table was clipped by the sheet's overflow-x:hidden (no scroll wrapper). Fixed: #stockResults scrolls horizontally; table min-width 520px.
49. A ₹0 dividend entry passed validation and saved a meaningless "₹0 received" row. Fixed: dividend amount must be > 0, with a specific message.
50. Toast timer, watchlist-row openStock guard (its twin call was already guarded), inputmode="decimal" added to qty/price/charges/alert/what-if inputs, news meta line no longer clips at 360px, big-deal value no longer clips (min-width 180→120px), desktop top nav strip now centers with the 1380px main column.

## v91 round (2026-11-14) — A/B/C profiling audit (read-only subagent, findings verified in code) + @singhcaizen social fill
51. Watchlist sparkline's last dot clipped on three edges: generator padding P=2 < dot radius 2.2 (+1.6 stroke) in a 100×30 viewBox, worsened by preserveAspectRatio="none" and row overflow:hidden. Fixed P=4. Same edge-clip fixed in hero (120), Market Pulse (74) and holdings (84) sparklines — x now maps into [1, W−1].
52. Watchlist rows with no chart rendered a literal empty string in a reserved 58–64px column — no loading state, no failure state. Fixed: three-state cell (shimmer while first fetch runs / "No chart data" / retry button that refetches the symbol); priced rows with an empty spark now borrow the cached history series.
53. Every 60s tick rebuilt all four views (dashboard+holdings+watchlist+history) via renderAll, each a full innerHTML rebuild with the whole portfolio math recomputed per view and per decorator wrap — the main lag source, plus entrance animations (cards/donut/bars) replaying every minute. Fixed: ticks re-render only the visible view (renderAfterPrices), views render on switch, entrance animations gated to first paint (body.folio-ready).
54. Search inputs fired per keystroke: suggestions re-rendered synchronously and launched up to 5 fetchOne calls, each racing 6 proxy routes (~30 requests per keystroke); holdings/cmdk/scorecard/deals searches also undebounced. Fixed: 200–250ms debounce on all five.
55. Perpetual pollers: the 1s dock poller scanned the whole document every second (now skips when the view is unchanged or the tab is hidden), the skeleton watchdog ran in background tabs (now gated), the System Health line rewrote itself every 2s with Profile closed (now gated to Profile open).
56. Watchlist fallback re-parsed a full 1-year localStorage series per row per render — the parse result was never written back to the in-memory histCache. Fixed: write-back, once per session. Long lists: content-visibility:auto on watchlist rows and holdings cards.
57. No global error boundary existed anywhere. Added: error + unhandledrejection listeners (inline, in <head>) showing a dismissible "Something went wrong — your data is safe" banner with Reload. The two console.warn calls that fired in normal offline use (cloud save failure, snapshot error) removed — both already surface as a toast/message. Missing .catch added on the 52W-bar fetchMaster promise. crores() now rejects NaN (typeof check let it through to "₹NaN Cr").
58. QR library (qrcode.min.js, only used by 2FA setup) loaded eagerly on every app open. Now lazy: ensureQrLib() injects it on first QR draw; drawQr's existing try/catch covers load failure (manual key still shown).
59. Native title tooltips remained on watchlist controls (star, remove, alert bell, +Add, list New/Rename/Delete) — all converted to aria-labels. Informational title spans (calendar days, 52W range, new-dot) deliberately kept: they are hover info text, not controls.
Deliberately NOT reworked (disclosed to LILA): aborting losing proxy routes mid-race (debounce + caching removed most waste; routes are time-boxed), true windowed list virtualization (content-visibility covers personal-scale lists), Lightweight Charts stays preloaded (vendored local file, no network cost).

## v93–v94 (2026-11-14) — LILA's strict phase spec; ROOT CAUSE of the dead More button
60. THE BIG ONE: features.js threw `ReferenceError: sxRenderTab is not defined` at line ~4938 during initial script evaluation. A Phase-7 wrap (`const _sxRenderTabP7 = sxRenderTab; sxRenderTab = async ...`) referenced a helper that never existed — the company sheet's real tab function is `sxSetTab`. The throw silently killed EVERYTHING registered after that line: the More-sheet click handler, the v89 modal manager, the social renderers, and every v90–v92 module — while earlier-registered code (bottom nav, dashboard) kept working, which is why only More looked dead through v89–v92. Found by live diagnosis: a demo-mode test copy (foliotest/) + an instrumented error banner that printed the actual error and line. The v91 global error boundary is what finally surfaced it. Fixed: the wrap now guards `typeof sxSetTab === "function"` and enhances via the real function; p7EnhanceOverview got a once-per-sheet dataset guard. Verified live on the test copy: no banner, More opens, all close methods work.
61. Sheet card overflowed ABOVE the desktop viewport (no max-height outside the phone media query) carrying the close control off-screen; the close control was also a text "Close" mini-button, not an X. Fixed: max-height:85dvh + overflow-y:auto at all widths, sticky sheet head, real 44px circular ✕ button (.sheet-x).
62. Sheet social row could be lost to parse-time state; it is now ALSO filled at open time (fillSheetSocials in the More-open path, same SOCIAL_LINKS config and circular .soc-btn markup as the footer).
Phase 2 (v94): losing routes in every price/history/chart race are now aborted when a winner lands (fetchTO/fetchT controller registries + finally-abort); all search debounces set to the specified 300ms; the last console.warn (Firebase init failure) removed — zero console errors/warnings in normal use.
Phase 3 (v94): manifest name/short_name = FOLIO, icon entries at 192/512 + maskable (existing SVG logo; PNG binaries cannot pass the UTF-8 snapshot push channel — disclosed to LILA); SW update toast ("Update available, tap to reload", controllerchange-guarded); offline banner text set to "You are offline, showing last saved data"; Install App row in the More sheet (beforeinstallprompt-driven, hidden when standalone/unsupported, iOS gets a Share → Add to Home Screen sheet). Existing SW strategy (network-first shell, versioned cache, no private-data caching) deliberately kept.
Cleanup note: foliotest/index.html deleted via delete_file; the folder's remaining inert code files (same public code as the app, no data) still sit in the repo tree — per-file deletion needs one approval call each; disclosed to LILA in the v94 report.
63. Enter/Go-submitted login hung on "Please wait…" forever (found by the Phase-4 test, 2026-11-14): the editing shield's uiBusy() counted the sign-in form's own focused password field as "user is editing", so enterApp deferred the entry until the field lost focus — clicking the button blurs the field first, which is why clicks worked and Enter did not. Root fix in app.js: fields inside #authView/#gateView are never "busy". Same trap would have hit the 2FA gate's Enter submit.
64. Dashboard tab filter missed the Market Pulse panel (Phase-2 test): the panel is created asynchronously after the first filter pass, so it stayed visible under every tab. pulseLoad now re-applies the tab filter right after inserting the panel.
65. Error banner could appear for benign browser noise (Phase-3 hardening): the boundary now keeps a diagnostics list (last 20, shown/copyable in Report Issue, attached to sent reports), and the banner itself fires only for a real crash — never for ResizeObserver warnings, AbortError/cancelled requests, failed optional fetches, extension errors, detail-free "Script error.", or service-worker/cache errors; at most once per distinct error per session, auto-dismisses in 8s, and never over the sign-in, gate or another popup.
67. About dialog's X button did nothing: a capture-phase document click listener for the stock sheet stole EVERY [data-close-modal] click (stopPropagation) and called the stock close function, and the About dialog had no close listener of its own. The thief is now scoped to clicks inside #stockModal only, and #aboutClose has a dedicated listener. (Found by the v97 layout test rounds, 2026-11-14)
