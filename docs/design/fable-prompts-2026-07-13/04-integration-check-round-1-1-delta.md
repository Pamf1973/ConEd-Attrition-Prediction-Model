# Fable — Round 1.1 delta

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** The four attachments you flagged as missing are attached now. Below are direct answers to V1–V6 from the code and data, plus one finding that changes the Section 1 binding decision materially. Please fold into a Round 1.1 delta rather than reissuing the full check.

**Attachments (finally):**
- `docs/model-technical-spec.md`
- `docs/xgboost_results.md`
- `public/buildings.json` (base data, 1,210 rows)
- `public/buildingEnrichment.json` (enrichment layer, 1,210 rows — this is where `ml_risk`, `diagnostic_risk`, `ml_drivers` live)
- `public/yoy_deltas.json` (delta data)
- `update_enrichment_risk.py` (the code that assigns `diagnostic_risk`)
- `api/server.js` and `src/data/useBuildings.js` (the two surfaces of the `ml_risk` vs `risk` fallback)

---

## Known drift to disregard (please read first)

Two sources of noise in the attachments and one branch situation to flag before you dig in. None of these are things we want you to solve — they exist so you don't spend cycles reconciling apparent contradictions that we already know about.

1. **`docs/model-technical-spec.md` is stale.** It's Version 1.3, dated 2026-06-05, and predates the XGBoost switch by five commits. It describes the model as `GradientBoostingClassifier` at AUC 0.672. **Ignore it wherever it conflicts with `docs/xgboost_results.md`.** That second file (dated 2026-07-01, matching the current code) is the source of truth: XGBoost, 5-fold CV AUC 0.6833, hyperparameters as listed there. A rewrite of the spec doc is a pending task, not a review deliverable.

2. **`api/server.js` has two stale model-name strings** at `line 585` (`model_version: "GBM-v1+SHAP"`) and `line 867` (chatbot answer describing the model as a "GBM"). The commit that fixed model names elsewhere (`c4c6292`) missed these. Treat them as known drift; the provenance-chip and chatbot-copy findings in Round 1 already prescribe the fix.

3. **Two unmerged feature branches (`edwin/ll97-gauge-and-shap-drivers`, `edwin/ll33-and-steam-yoy-viz`) exist but are intentionally not on `main`.** Their contents (LL97 dual-period gauges, SHAP-driven driver display, LL33 grades, YoY steam viz) are structurally covered at a higher level of abstraction by the atoms you already designed — Exhibit A (SHAP top-5), Exhibit C (LL97 arithmetic), the `ll33` field on enrichment, and Exhibit B (steam trend). The redesign supersedes the branches; we are not merging them. Review against `main` as-is.

---

## Section-1-shifting finding: diagnostic_risk is not a rule-based tier

The single biggest correction to Round 1. Your Path A assumed `diagnostic_risk` was a rule-based tier that could bind the tier word honestly. **It isn't.** From `update_enrichment_risk.py:71`, `compute_diagnostic_risk()` is a **hybrid**:

```
1. Uncertain gates (n_years < 2  or  NYCHA low-R²  or  ml_risk missing)
2. Base tier ← ML probability cutoff (< 0.2 Low, < 0.6 Medium, ≥ 0.6 High)
3. Rule-based modifiers (±1 tier): IQR outlier, accelerating decline, decelerating decline, LL97 over cap
4. Final tier ← clamp(base + modifier, [Low, High])
```

So the tier word is **ML-derived at its base**, with rule-based modifiers on top. Calling it "the transparent diagnostic rule" is only partly honest — the transparent part is the modifier layer; the base tier is the same ML probability cutoff that Path A was supposed to escape.

This creates a third path we did not consider in Round 1:

- **Path A (as originally described):** bind tier word to `diagnostic_risk`. This is *more honest than the status quo* (because the modifiers are transparent) but still not the pure rule-based tier the spec language implies. If we take this path, the report's Exhibit D copy needs to describe the actual hybrid, not the rule-based idealization. That's a bigger copy change than Round 1 assumed.
- **Path B (interim S0):** unchanged — score cell drops the tier word, ships percentile + provenance + freshness only.
- **Path C (new):** bind tier word to `diagnostic_risk` **and** rewrite the surrounding copy to name the hybrid honestly. Something like "Tier from steam-trend modifiers on ML probability" rather than "diagnostic rule." Report Exhibit D describes the four-step chain above verbatim. Score-cell provenance chip carries `hybrid v1` or similar rather than a "rule" claim.

We'd like your read on which of these paths the design system can support without redesigning the atoms. Our instinct is Path C, because Path A shipped as-drawn would trip the same defensibility problem Round 1 was trying to fix.

---

## V1 — diagnostic_risk semantics

- **Source:** `update_enrichment_risk.py:71`, function `compute_diagnostic_risk`
- **Coverage:** 100% (1,210/1,210 buildings)
- **Distribution:** Medium 483 (40%), Uncertain 254 (21%), Low 240 (20%), High 233 (19%)
- **Thresholds:** ML probability cutoffs 0.2 / 0.6 for the base tier, then ±1 tier modifiers
- **Delta vintage consumed:** the modifiers use `is_outlier` (IQR flag over 22→23 and 23→24 deltas) and `is_accelerating` / `is_decelerating` from decline trend analysis. So the modifier layer *does* incorporate '24 data where present, but the base tier does not.

## V2 — SHAP output shape (ml_drivers)

- **Shape:** list of 5 dicts per building, each `{feature, contribution, value}`
- **Raw values ARE included** (see sample in the enrichment file, row `1080 FIFTH AVE`: `energy_star: -3.6304 · value 10.0`). Report Exhibit A can format in real units without additional pipeline work.
- **Sign convention:** contributions are signed (positive pushes probability up).

## V3 — n_years_data

- **Exists per row.** Values: 1 (254 rows), 2 (531 rows), 3 (425 rows).
- **Uncertain tier is populated,** not unreachable. Round 1's guess was wrong: 254 buildings currently render as `diagnostic_risk == "Uncertain"`, all with `uncertain_reason == "Insufficient data: only 1 year(s) of steam data"`. S4 in your score-cell states is renderable today.

## V4 — legacy `risk` field provenance

- **Where:** base `buildings.json`, 0–1 range, sample value 0.525 for `1000 10th AVE`.
- **What computes it:** a pre-XGBoost heuristic that predates the current model. It's the field that produces the 81.6% ceiling you asked about — the ceiling is not a display artifact of percent formatting, it is the actual cap of the legacy formula.
- **Fallback logic:** `server.js:267` and `useBuildings.js:108-113` both do `risk: e.ml_risk ?? b.risk` — enrichment `ml_risk` overrides base `risk` when present. Since `ml_risk` is 100% populated, the fallback path is currently dead code. Your S5 fallback state can be kept in the spec as insurance but cannot fire against the current data.
- **Stale copy warning:** `api/server.js:867` describes the model as a **"GBM (Gradient Boosting Machine)"** in the chatbot answer. Per the ASKS doc §1, the model is XGBoost. That copy needs to change wherever the provenance chip pulls model-name text.

## V5 — peer-median line cohort

- **Field on enrichment:** `peer_score` (a scalar per building, e.g. 0.073), which is the K-means-cluster attrition rate. **Not a trend line.**
- **No trend-line data exists** for a peer-median cohort in the JSONs. Your Round 1 guess (peer line is likely decorative or ungrounded) is correct.
- **Adjustment stands:** ship Exhibit B v1 with two lines only (this building + LL97 cap-equivalent), peer line joins after Ismael's per-customer regression defines a cohort.

## V6 — coverage numbers as of the current pipeline

- **norm_delta_23_24:** 422/1,210 populated (**34.9%**) in `yoy_deltas.json`. ASKS memo's ~35% figure was right.
- **norm_delta_22_23:** 743/1,210 populated (**61.4%**). More rows have '22→'23 than '23→'24.
- **Cause of missing '24 deltas:** `steam_2024 == null` for those buildings — they're missing 2024 consumption entirely, not just the derived delta.
- **Implication for ledger fresh/stale variants:** you may want three fresh-column variants rather than two, keyed by which delta is the newest available. "Δ '24 fresh," "Δ '23 latest," "no delta / one year of data" — the last collapses into Uncertain and is already handled there.

---

## What we want back

A **Round 1.1 delta document,** not a reissue. Just:

1. Your read on Path A vs Path B vs Path C given the hybrid finding
2. Any changes to Round 1's spec-level adjustments now that Uncertain is populated and SHAP has raw values
3. Confirmation that the peer-line finding stands as written
4. Anything in `docs/model-technical-spec.md` or `docs/xgboost_results.md` that changes the AUC-templating or provenance-chip decisions

## Constraint

Same as Round 1: no redesigns. This delta hardens or corrects existing findings.
