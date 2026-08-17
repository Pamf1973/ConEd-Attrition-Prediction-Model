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

## Q1 | open | owner: Ismael | subject: pipeline
Asked 2026-08-17. When does `ml_drivers` (SHAP top-N per building) get emitted into `buildingEnrichment.json`? Surfaced in PR #21 review: `buildDrivers` reads `building.ml_drivers` which enrichment doesn't produce yet, so the M4 CaseFileHeader drivers band renders empty against live data.
Resolves: M4 drivers band populates with real data. Natural fit alongside M2 AUC rerun in `train_xgboost.py`.
