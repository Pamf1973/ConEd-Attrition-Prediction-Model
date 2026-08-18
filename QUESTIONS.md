# Open Questions

Things we need answered or checked, organized by subject, culled by resolution, never by deletion. Written by /questions and /note. Reconciled by /sync (did landed work answer anything), audited by /goal-check (did the plan make anything moot), surfaced by /brief (who needs asking).

Entry format:
```
## Q7 | open | owner: David | subject: data access
Asked 2026-07-16. Does Steam Ops have meter-level consumption history pre-2018, or only billing aggregates?
Resolves: R2 archetype features, blocks D-decision on feature set.
```

On resolution, status changes and the answer is appended, entry stays:
```
## Q7 | resolved 2026-07-22 | owner: David | subject: data access
...
Answer: billing aggregates only pre-2018. Led to D14. 
```

Statuses: open | resolved <date> | moot <date> (with one line on why it stopped mattering)

---

## Q1 | resolved 2026-08-17 | owner: Ismael | subject: pipeline / ml_drivers
Asked 2026-08-17. `ml_drivers` field not yet emitted to `buildingEnrichment.json` — drivers band in M4 CaseFileHeader renders empty until pipeline lands it. Surfaced by Ismael in PR #21 review 2026-08-17. Natural fit alongside M2 AUC rerun in `train_xgboost.py` (SHAP top-N).
Resolves: M4 drivers band rendering; unblocks methodology §2 feature-importances table via `model_meta.feature_importances`.
Answer: Ismael's session wrap 2026-08-17 (`cc62ace`). `train_xgboost.py` now computes SHAP top-5 for all buildings after GridSearch and writes `ml_risk` + `ml_drivers` into `buildingEnrichment.json`; M4 drivers band will populate on next training run. Verified in code same day: enrichment already carries `ml_drivers` structured as `[{feature, contribution, value}]` — matches `buildDrivers()` in `src/next/caseFileAdapter.jsx:202`. `model_meta.feature_importances` remains a separate pending item (importances are computed at `train_xgboost.py:194` but not written to the meta output at line 340).

## Q2 | resolved 2026-08-17 | owner: Ismael | subject: methodology / AUC provenance
Asked 2026-08-17 (Fable round 2 B3). Did the AUC pair in `model_meta.json` (mean 0.6833, std 0.0511) come from a single `cross_val_score` run on the locked XGBoost config, or is the mean from GridSearchCV best-estimator and the std computed separately (a stitched figure)? Methodology §9 is the provenance surface; footer promises every surface agrees with it.
Resolves: M10 methodology page §9 provenance block; unblocks M10 PR open.
Answer: Ismael 2026-08-17. Single dedicated 5-fold `cross_val_score` run on the locked config (colsample_bytree=1.0, lr=0.1, max_depth=6, n_estimators=300, scale_pos_weight=18, subsample=0.8), documented verbatim in commit `0979412` (M2). Same 5 splits → mean and std internally consistent. Not stitched. §9 can present as a single cross-validated estimate, no caveat needed.

## Q3 | resolved 2026-08-17 | owner: Ismael | subject: methodology / 07-15 refresh scope
Asked 2026-08-17 (Fable round 3 C7 caveat). When `update_enrichment_risk.py` reran on 07-15, were enrichment inputs (yoy flags, decline labels, LL97 posture, DOB counts) unchanged from the 07-01 snapshot, or did it pull fresh source rows? Same `params_hash` on unchanged inputs = identical ml_risk (only tiers/modifiers change); fresh inputs = ml_risk values also changed for affected rows. Methodology reconciliation note wording depends on the answer.
Resolves: M10 reconciliation note in `MethodologyPage.jsx` (leading `.mp-note` block).
Answer: Ismael 2026-08-17. First case is correct. Enrichment source files (`yoy_deltas.json`, `decline_trend_results.json`, `building_regression_results.json`) were all at their 06-17 state on 07-15; the 07-28 data refresh had not landed yet. 07-15 rerun read unchanged inputs; `params_hash` unchanged; ml_risk values identical; only tier and modifier recomputation ran. Reconciliation note "same model, later downstream computation" stands as written.

## Q4 | open | owner: Ismael | subject: pipeline / model_meta
Asked 2026-08-17. `model_meta.feature_importances` not yet written. `train_xgboost.py:194` computes importances but the meta output at line 340 does not include them. Spun off from Q1's resolution note (ml_drivers landed via `cc62ace`, but the meta-level importances write is a separate item).
Resolves: M10 methodology §2 feature-importances table (currently rendered from `ml_drivers` per-building; a global importances table sourced from `model_meta` would let §2 present model-level ranking without picking a representative building).

## Q5 | open | owner: Edwin (verify against Pedro's Railway) | subject: prod deploy / env
Asked 2026-08-18. Pedro confirmed verbally (Slack 12:27/12:33) that Postgres is attached and an Anthropic LLM key is set on his Railway service. Not yet eyeballed directly on the Railway dashboard. Concrete env vars to confirm present before merging #31/#32: `DATABASE_URL` (Postgres, live), `ANTHROPIC_API_KEY` (and/or `GROQ_API_KEY` / `OPENROUTER_API_KEY` fallbacks), `DASHBOARD_PASSWORD`, `ACTOR_HMAC_SECRET`, `NODE_ENV=production`. Without `DATABASE_URL`, /api/buildings/:bbl/status 500s (per D12); without `ACTOR_HMAC_SECRET`, prod exits 1 (per D10 note). Without LLM keys, legacy `/api/explain` fails — not on the new-build demo path but still a hole.
Resolves: nothing blocks on this alone, but a clean first post-#31 deploy for the Wednesday demo does. Get eyes on the Railway env vars via Pedro screen-share or Members access if it becomes possible.
