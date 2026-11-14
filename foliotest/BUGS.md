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
