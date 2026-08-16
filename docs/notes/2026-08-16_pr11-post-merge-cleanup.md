# Post-merge cleanup PR — PR #11 fallback drift

**Status**: staged, not opened. Fires the moment PR #11 lands on `main`.
**Trigger to open**: `git checkout main && git pull` shows the model_meta code from PR #11 present.
**Estimated size**: ~15 lines changed, single file (`api/server.js`), no tests to add.

---

## Problem

PR #11 introduced three sites where `cv_auc` (and one for `n_positive`) fall back to stale hardcoded numbers if `data/model_meta.json` is missing, corrupt, or the field is absent. The current values match the real ones today (`0.68` rounds from `0.6833`, `54` matches), so the drift is invisible on release day. It becomes visible the moment the model retrains and the real value shifts — at which point the fallback silently reports the old number to any user hitting a broken read.

This was flagged as non-blocking in the PR #11 approval; it's post-merge cleanup, not a merge blocker.

## Sites (line numbers as of pre-merge PR #11 diff — verify post-merge)

1. **Validator default** in `validateModelMeta` (approx server.js:30 in the added block):
   ```js
   cv_auc: safeNum(m.cv_auc, 0.68),
   ```
2. **Read-failure fallback object** in `getModelMeta` (approx server.js:51):
   ```js
   _modelMeta = { model_name: "XGBoost Classifier", model_version: "XGB v1 · UNVAL",
                  cv_auc: 0.68, cv_kfold: 5, n_positive: 54, validation_status: "unvalidated" };
   ```
3. **`getAnswer` belt-and-suspenders** (approx server.js:87):
   ```js
   const auc = Math.round((m.cv_auc ?? 0.68) * 100);
   ```

## Fix

All three drift sites default to `null`, and `getAnswer` emits the §7 rule 8 interim sentence when AUC is unavailable rather than fabricating a rounded number. Same treatment for `n_positive`: default to `null`, template omits the parenthetical when null.

### Proposed diff (final line numbers determined by merge)

**Site 1 — validator:**
```diff
-  cv_auc:           safeNum(m.cv_auc,            0.68),
+  cv_auc:           typeof m.cv_auc === "number" && isFinite(m.cv_auc) ? m.cv_auc : null,
-  n_positive:       safeNum(m.n_positive,        54),
+  n_positive:       typeof m.n_positive === "number" && isFinite(m.n_positive) ? m.n_positive : null,
```

**Site 2 — read-failure fallback:**
```diff
   _modelMeta = { model_name: "XGBoost Classifier", model_version: "XGB v1 · UNVAL",
-                 cv_auc: 0.68, cv_kfold: 5, n_positive: 54, validation_status: "unvalidated" };
+                 cv_auc: null, cv_kfold: 5, n_positive: null, validation_status: "unvalidated" };
```

**Site 3 — `getAnswer` template branches on null:**
```diff
-  const auc = Math.round((m.cv_auc ?? 0.68) * 100);
+  const auc = m.cv_auc != null ? Math.round(m.cv_auc * 100) : null;
   const validated = (m.validation_status ?? "unvalidated") !== "unvalidated";
```

Then inside the returned answer string, the AUC clause becomes conditional per §7 rule 8:
```js
// Rule 8 template with null-branch honesty.
const aucClause = auc != null && m.n_positive != null
  ? `ranks a true churner above a non-churner about ${auc}% of the time (${m.cv_kfold}-fold CV, ${m.n_positive} positive labels)`
  : `Validation rerun in progress`;
```

## PR body (ready to paste on open)

```
fix(M1): retire stale AUC/n_positive fallback literals

Post-merge cleanup for PR #11. The 0.68 / 54 fallbacks in
validateModelMeta, getModelMeta's read-failure object, and getAnswer's
belt-and-suspenders were correct on release day (0.68 rounds from
0.6833, 54 matches n_positive) but form a drift class — the moment
the model retrains, a broken read silently reports the old number.

Change: all three sites default to null. getAnswer branches on null and
emits the §7 rule 8 interim sentence ("Validation rerun in progress")
rather than fabricating a rounded number. Same treatment for
n_positive.

Non-behavioral when data/model_meta.json is healthy. Behavior change
only when the file is missing or the field is absent — in which case
the copy is honest instead of stale.

Spec anchors:
- system-v1.1.md §7 rule 8: AUC copy templated from model_meta.
  Interim: "Validation rerun in progress." Post-rerun: full template.
- §8 rule 2: validation_status rendered explicitly.

Flagged as non-blocking on PR #11 approval (2026-08-15).
```

## Ownership

Edwin. Branch name: `edwin/M1-fallback-cleanup`. Ships as its own PR against `main`, no dependencies. Would be low-risk-enough for Ismael to LGTM in one pass.
