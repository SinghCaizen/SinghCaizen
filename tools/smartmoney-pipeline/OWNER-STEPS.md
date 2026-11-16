# Owner steps — switch on the Smart Money data pipeline

The pipeline code itself Noor will push to the repo (folder
`tools/smartmoney-pipeline/` on the `main` branch — normal files, no
special permission needed). Three things only YOU can do, because
GitHub does not let Noor's connection create branches or workflow
files. Total time: about 10 minutes.

Repo for all steps: **SinghCaizen/SinghCaizen**
(https://github.com/SinghCaizen/SinghCaizen)

---

## Step 1 — Create the `data` branch

1. Open the repo link above. You land on the **Code** tab.
2. Just above the file list, on the left, there is a small button that
   says **`main`** with a branch icon. Click it.
3. A box opens with a search field at the top ("Find or create a
   branch…"). Type exactly: `data`
4. Under the search field a line appears:
   **Create branch: data from 'main'**. Click it.
5. You should now see the button say **`data`** and the page reload —
   the branch exists. (Switch back to `main` afterwards using the same
   button; day-to-day you stay on `main`.)

## Step 2 — Add the workflow file (on `main`)

1. On the repo's **Code** tab, first make sure the branch button says
   **`main`** (switch if it says `data`).
2. Click **Add file** (top-right of the file list) → **Create new file**.
3. In the file-name box, type exactly:
   `.github/workflows/smartmoney-data.yml`
   (GitHub will automatically turn the slashes into folders as you type.)
4. Paste the full content of the workflow file — Noor will give you the
   exact text in chat (it is also saved as `workflow/smartmoney-data.yml`
   in the pipeline folder). Paste it into the big editor box.
5. Click the green **Commit changes…** button (top-right), leave the
   message as-is, and click **Commit changes** again to confirm.
6. You should land on the new file's page inside
   `.github/workflows/`. That is the file in place.

## Step 3 — Allow the workflow to write (one setting)

1. Click the repo's **Settings** tab (top row; if you don't see it,
   click the **⋯** menu at the right end of the tab row).
2. In the left sidebar, click **Actions** → **General**.
3. Scroll to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Click **Save**.
   (On the same page, the top section "Actions permissions" should say
   "Allow all actions and reusable workflows" — it does by default;
   leave it as it is.)

## Step 4 — Run it once by hand (seeds all the data)

1. Click the repo's **Actions** tab.
2. In the left sidebar you should see **Smart Money data pipeline**.
   Click it. (If it is not listed, the workflow file from Step 2 is not
   on `main` yet — recheck Step 2.)
3. Click the **Run workflow** button (right side, above the runs list).
4. A small panel opens: leave **Branch: main**, set **Which job to
   run** = `all`, leave the month box empty, and click the green
   **Run workflow** button.
5. Refresh after ~10 seconds: a run appears at the top of the list with
   a spinning yellow icon. It takes roughly **5–30 minutes** (the NSDL
   files are large).
6. Done = a green ✓ next to the run, and inside it both jobs
   (**daily** and **monthly**) show green.
   - If a job shows a red ✗: open the run → click the job → the failed
     step is marked red. Send Noor the step name (a screenshot is
     perfect) — the data itself is safe either way; a failed run never
     deletes good data.

## Step 5 — Check the data arrived (optional, 1 minute)

1. Back on the **Code** tab, switch the branch button to **`data`**.
2. Open the folders: **portfolio → data → smartmoney**.
3. You should see `manifest.json`, `nav.json`, `houses.json`,
   `bhav-lite.json`, `flows-fii-monthly.json` and a folder `mf`.
   Click `manifest.json` — every dataset lists its status
   (`ok` / `partial` / `stale` / `unavailable`) and its date.

## After that — it runs itself

- **Daily** (Mon–Fri, ~7:05 pm IST): NAVs, fund houses, prices, and a
  check for a new NSDL monthly FII file.
- **Monthly** (8th–12th of each month): mutual-fund portfolio files
  from the fund houses that publish them as spreadsheets.
- To run the monthly job by hand any time: repeat Step 4 with
  **Which job to run** = `monthly` (you can also type a month like
  `2026-09` in the month box to rebuild an older month).

One honest note: the NSDL monthly FII series currently ends at
**March 2025** (NSDL has not extended its static archive). The app
labels it exactly that way — monthly, lagged, FII only — and the daily
job keeps checking for new files.
