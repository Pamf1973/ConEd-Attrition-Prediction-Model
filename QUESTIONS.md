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
