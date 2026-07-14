# Ismael's response to backend decisions brief

**From:** Ismael
**To:** Edwin
**Date:** 2026-07-13
**Re:** `ISMAEL-BRIEF-PATH-C-AND-BACKEND-DECISIONS-2026-07-13.md` Q1–Q10

## Q1 — Path C sign-off
**Yes, Path C.** Independently ran the cross-tab against live data: 176 base-Low → final-High, 78.1% of final-High modifier-promoted, modifier-shifted rate 69.7% of non-Uncertain. Numbers match. The "rule-based" framing was always wrong to ship. **No code change to `compute_diagnostic_risk`.**

## Q2 — Ledger column wording
Tightens Edwin's version: **"Tier · ML base + trend/statute modifiers"** (shorter for header width). Full version fine for pitch contexts. Lock whichever fits spec width.

## Q3 — Critical v1.1 sign-off
**Yes.** Ran the filter:
```
ml_risk ≥ 0.6 AND norm_delta_23_24 IS NOT NULL
  AND (outlier_23_24 OR outlier_22_23 OR decline_trend_label == "accelerating")
```
Result: **23 buildings confirmed.** Top of queue: **660 Madison Ave, 200 E 42nd St, 58 W 58th St.**

**LL97 correction on the brief:** Edwin said `ll97_over_2024` is "feature #1 inside the model." Wrong. In the XGBoost run:
- `ll97_over_2024` (boolean): **0.0000** feature importance (contributed nothing)
- `ll97_penalty_2024_log` (dollar amount): **#1 at 0.2074**

Double-counting exclusion argument still holds, but **Exhibit D should reference the penalty log, not the cap boolean,** or it confuses anyone reading the feature importance table.

## Q4 — AUC rerun scope
**Yes,** can produce clean 5-fold CV AUC with std on chosen config:
`colsample_bytree=1.0, learning_rate=0.1, max_depth=6, n_estimators=300, scale_pos_weight=18, subsample=0.8`

Dataset: 1,003 labeled, 54 positive (5.4%), 5-fold stratified. The 0.6833 in `xgboost_results.md` is a GridSearchCV best with no std — correct to flag as mildly optimistic. Will rerun with `cross_val_score` on chosen config, report mean ± std. **ETA: this week.** Ship with "rerun in progress" copy until number lands.

## Q5 — `model_meta` object
All fields producible. Confirmed values from current run:
- `n_labeled: 1003`
- `n_positive: 54`
- `cv_kfold: 5`
- `label_definition: "≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023"`
- `params_hash`: can compute SHA of best params JSON
- `commit`: HEAD for now; will tag pipeline runs going forward
- `cv_auc / cv_std`: pending rerun (Q4)

**Naming: snake_case,** matching existing API response style. `model_meta.json` written at end of every `train_xgboost.py` run AND every `update_enrichment_risk.py` run (model params unchanged → fresh `run_date` only).

## Q6 — Snapshot diffing → `events.json`
Scope: **medium, ~1–2 days.** Plan: before each pipeline run, copy current `buildingEnrichment.json` to `buildingEnrichment_prev.json` on same volume. End of run, diff by address key across `diagnostic_risk`, `ll97_over_2024/2030`, `dob_jobs`, emit events list. **DIVERGE events (base-Low → final-High promotions) derive from current run without diffing** — base tier computed inline. N-1 file stored on Railway volume alongside current file.

## Q7 — Append-only status events endpoint
Scope: **medium, ~2 days.** **Postgres** — already on Railway Postgres, no reason to introduce SQLite. Schema as proposed is fine. `actor` = session token acceptable for now; can alias to name later. **Also retires the in-memory watchlist Map at `server.js:314`,** which doesn't survive restarts. `/api/watchlist/save` and `/api/watchlist/load` become migration targets to this same table.

## Q8 — Data decoupled from deploy
Scope: **moderate (~2 days), highest operational risk** of the three gates. **Recommendation: work around with copy for the demo, ship decoupled path in follow-up sprint.**

The freshness chip can honestly name the pipeline run date by reading `run_date` from `model_meta.json` (written per run), **even if the JSON files are still in the container.** Full decoupling — JSONs on volume, API reads at request time — is the right end state but doesn't need to block the demo.

## Q9 — '22→'24 adjacent-gap delta
Count: **208 buildings** with `steam_2022` and `steam_2024` but no `steam_2023`. (Brief said 213 — small discrepancy, likely filter boundary difference.) **Explicitly deferred to Round 2.** Uncertain gate passes them through (n_years == 2) so they're not broken — they just produce no delta. `norm_delta_22_24` as a two-year normalized figure is a clean addition; added to Round 2 pipeline scope.

## Q10 — `server.js:585` + `:867` fixes
**Bundle with `model_meta` rollout.** Once `model_meta.json` is live, `server.js` reads `model_version` from there and neither string is hardcoded anymore. Fixing `:585` now without fixing the source creates another drift cycle. Chatbot answer at `:867` needs full rewrite, not just a string swap — bundle is cleaner.

## What unblocks Pedro immediately
Q1 (Path C) ✓ and Q3 (Critical v1.1) ✓ signed off. Q2 wording above. Q4 rerun in progress. **Pedro can start Spec 1 (score cell) and Spec 2 (case-file header) now with "rerun in progress" copy on the AUC.**
