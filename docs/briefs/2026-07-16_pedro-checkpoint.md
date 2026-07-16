# Pedro — checkpoint (2026-07-16)

**From:** Edwin · **Date:** 2026-07-16
**Purpose:** Quick delta on top of your full milestone brief (`docs/briefs/2026-07-13_pedro-frontend-build.md`). Read that first if it's been a while; this note is what's changed and what to do next.

---

## What's new since your brief (3 days)

**Ismael shipped R2 + R3 + R7 backend in PR #9** (branch `ismael/monday-workflow`, from fork):

- **`public/model_meta.json`** now exists — populated with real model provenance. Single source of truth for `model_version`, `cv_auc`, `cv_std`, `n_positive`, `run_date`, `validation_status`.
- **`GET /api/model_meta`** live, auth-gated. This is what your **M3 score cell chip** consumes for L4 (provenance chip renders `model_version`, never a numeric AUC).
- **R3 AUC delivered: `0.6833 ± 0.0511`** (5-fold CV, 1003 labeled, 54 positive). This is the exact number that lands in your **M4 case-file header ledger** and **M5 report footer** via the §7 rule 8 templated sentence.
- **Status events Postgres backbone shipped** (`api/db.js`, `POST/GET /api/buildings/:bbl/status`, bulk endpoint). Means your **M4 status segment** can eventually go from read-only mock to real, once Ismael finishes the watchlist migration half of M6.

**Path C** (hybrid tier chain) signed off by Ismael. **Critical v1.1** (n=23) signed off — top of queue: **660 Madison Ave, 200 E 42nd St, 58 W 58th St**. Verify against these when you build M8.

**PR #9 W-law frontend is parked** waiting for your R1 to land, then Ismael rebases against your new-build components. His W1/W4/W6 features live on `RiskTable.jsx` and `BuildingPanel.jsx` today, which are the exact files your R4/R5 will replace. So the sooner R1 ships, the sooner Ismael can rebase cleanly instead of duplicating queue arithmetic.

---

## Your immediate next actions

1. **Start R1 (M0) now.** Legacy separation + `/legacy` routing. Full spec in your brief §M0 and in `roadmap-supplement-m0.md`. All Fable milestones downstream (R4–R13) block on this. Also unblocks PR #9 W-law rebase.
2. **When R1 lands → R4 (M3) score cell.** You can start this without waiting on Edwin's FAQ copy pass (which is what's blocking Ismael's R2 merge) — your score cell only consumes `model_meta.model_version` and (for future case-file work) `cv_auc`, both of which are already in the JSON.
3. **R5–R12 sequencing unchanged.** They still depend on R4 (or R2 in a few cases).

---

## What Edwin is handling this week

- FAQ copy pass on Ismael's R2 rewrite (unblocks the M1 backend merge)
- R11 (M10) methodology page prose — solo lane, won't collide with your work

## What Ismael is handling

- Splitting PR #9 into three PRs (Path A):
  - PR-9a: R2 + R3 backend (blocks on Edwin's FAQ copy)
  - PR-9b: R7 backbone + security fixes (mergeable now)
  - PR-9c: W1/W4/W6 frontend — parked, rebases against your new-build after R1
- R7 watchlist migration (the other half of M6, not in current PR)

---

## Have open while you work

- `CLAUDE.md`
- `system-v1.1.md`
- `docs/briefs/2026-07-13_pedro-frontend-build.md` (your full milestone brief)
- `roadmap-supplement-m0.md` (R1 detail)

Ping Edwin if a canonical doc contradicts another, an acceptance criterion is ambiguous, or Puppeteer install blows up on Railway. Fable does not answer implementation questions.
