# Ismael — decisions we need before the frontend redesign build starts

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** Comprehensive brief on the frontend redesign work Pedro and I have been running with Fable (Anthropic's design agent) since 2026-07-12, the findings that came out of two rounds of integration checks against your code and data, and the decisions we need from you before component build starts. This document is self-contained — you should be able to hand the whole thing to your LLM and get a useful reasoning pass on the questions in §8.

---

## 1. TL;DR — the four decisions we need from you

1. **Path C sign-off on `compute_diagnostic_risk`.** Fable's read of the code (`update_enrichment_risk.py:71-108`) is that the tier system as shipped is model-seeded and modifier-driven — 78% of final-High buildings were promoted into it by modifiers, and 176 of those came from base-Low (ml_risk < 0.2). Fable's recommendation is to keep the code as-is and rewrite the surrounding UI copy to name the hybrid honestly ("Tier · model base + trend/statute modifiers"). We need you to confirm this is the direction you want to defend, or push back with an alternative.
2. **AUC rerun scope.** The AUC we quote publicly (0.672) predates the XGBoost switch. `xgboost_results.md` reports 0.6833 but that's a GridSearchCV best with no fold std. We need a fresh CV number on the chosen config with std and the label count, and a decision on what units land in the UI.
3. **`model_meta` object.** Fable proposed a JSON object your pipeline writes once per run, that everything else on the frontend reads from. Field list is in §5. We need you to confirm it's producible and either accept or adjust the fields.
4. **Pipeline plumbing gates.** Three items block chunks of the frontend from shipping: snapshot diffing → `events.json`, append-only status events, and data decoupled from deploy. We need a scope check on all three so we can sequence Pedro's component build against your delivery estimates.

Details below. The immediate frontend work Pedro will start is Spec 1 (score cell), Spec 2 (case-file header), and Spec 3 (reasoning report). Those three do not depend on decisions 3 and 4 — they depend on decision 1 (Path C copy) and decision 2 (the AUC number to display). Decisions 3 and 4 gate Spec 4 (landing) and Spec 5 (email digest).

---

## 2. Context: what Fable is and where we are in the workflow

**Fable** is Anthropic's design agent, accessed through claude.ai. We are running an 8-step redesign workflow with it. Steps 0–4 (client anchor, voice, capability inventory, design research, anti-reference) were completed by 2026-07-11. On 2026-07-12 Fable produced a design system: `system.md` plus five HTML specs (score cell atom, case-file header, per-building reasoning report, this-week landing page, weekly digest email). This is the redesign that will replace the current BuildingPanel, RiskTable, watchlist page, and CSV export flow.

On 2026-07-13 we ran two rounds of integration checks against your code and data — asking Fable to review what its designs claim against what the model actually produces. Those two rounds are in `fable-checkin-2-2026-07-13/`. This brief distills the resulting findings that require your input.

**What this redesign does not change on your side:** the model itself, the enrichment pipeline structure, the LL97 penalty calculation, the K-means clustering, the SHAP driver extraction. Everything in `update_enrichment_risk.py`, `train_xgboost.py`, `kmeans_model.py`, `ll97_model.py` continues to run. What changes is the UI on top and one JSON contract (`model_meta`, discussed in §5).

**Voice note for context.** The redesign frames the tool as "a Bloomberg Terminal that explains itself, where every number wears its confidence." Concretely: no calibration claims the model can't support, no relative timestamps, no ungrounded prose, every counted claim states its population and snapshot date. The Path C decision below is the biggest test of this discipline.

---

## 3. The Path C decision on `compute_diagnostic_risk`

### 3.1 What we found in your code

The function at `update_enrichment_risk.py:71-108` currently does:

```
1. Uncertain gates:
   - n_years < 2 → "Uncertain", "Insufficient data..."
   - is_nycha_with_low_r2 → "Uncertain", "NYCHA development with R² < 0.3..."
   - ml_risk is None or < 0 → "Uncertain", "Missing ml_risk score"

2. Base tier from ML probability cutoffs:
   - ml_risk < 0.2 → base_idx = 0 (Low)
   - ml_risk < 0.6 → base_idx = 1 (Medium)
   - ml_risk >= 0.6 → base_idx = 2 (High)

3. Rule-based modifiers (±1 tier each):
   - is_outlier → +1
   - is_accelerating → +1
   - is_decelerating → -1
   - ll97_over_2024 OR ll97_over_2030 → +1

4. Clamp final_idx to [0, 2] and return TIER_ORDER[final_idx]
```

### 3.2 What Fable computed against the actual data

Fable ran the cross-tab of base tier (from step 2, without applying step 1 gates) against final `diagnostic_risk`:

| Base tier      | → Final High | → Final Medium | → Final Low |
|----------------|-------------:|---------------:|------------:|
| Base High (57) |          51 |              — |           — |
| Base Med (8)   |           6 |              1 |           1 |
| Base Low (1,145) |       176 |            482 |         239 |

- 665 of 956 non-Uncertain buildings (70%) are modifier-shifted
- 182 of 233 final-High (78%) were promoted into High by modifiers
- 176 of those 182 came from base Low (ml_risk < 0.2 plus net +2 modifiers)

Uncertain distribution: 254 rows, all `uncertain_reason == "Insufficient data: only 1 year(s) of steam data"`.

Verified against the enrichment file directly. The arithmetic checks out.

### 3.3 Why this matters for the frontend

The original design of the reasoning report and the score cell described the tier word as coming from "the transparent diagnostic rule" — implying rule-based, ml-free, checkable-by-hand. Given the cross-tab above, that framing is false. The tier is not rule-based; it is model-seeded with rule-based modifiers on top.

Three paths were considered:

- **Path A (bind tier to `diagnostic_risk`, keep the "rule-based" framing):** dead. The framing is empirically wrong.
- **Path B (interim S0 state — cell drops the tier word, ships percentile + provenance + freshness only, ml_risk 0–1 no longer as a %):** honest but timid, and it withholds information that ConEd account managers need.
- **Path C (bind tier to `diagnostic_risk`, rewrite copy to name the hybrid honestly):** Fable's recommendation.

### 3.4 What Path C means in practice

Concretely, if Path C:

- **No code change to `compute_diagnostic_risk`.** The function stays as it is.
- **Ledger column on the case-file header changes label** from "Tier · diagnostic rule" to "Tier · model base + trend/statute modifiers" (or your preferred wording).
- **Exhibit D on the reasoning report** describes the four-step chain in §3.1 verbatim, plus one sentence Fable proposes and the data supports: "most High-tier assignments are produced by the modifier layer, which consists of directly checkable facts — an IQR outlier drop, accelerating decline, or statute over-cap status." Because 78% of High-tier is modifier-promoted, this sentence is *the defensibility win hiding inside the whole finding*. Account managers can defend the tier assignment against a manager without invoking the model at all.
- **Divergence marker (S2 state on the score cell)** changes semantics: instead of "any base/final mismatch" (which would fire on 70% of rows), it fires only on **two-tier promotions** — the 176-row base-Low-to-final-High class. That becomes a first-class filter chip on the landing queue: "Modifier-promoted (176)."
- **"Critical" is redefined.** Not "rule-tier High" and not "top-decile ML rank" — both fail empirically. New v1.1 definition, computed against current data: `ml_risk ≥ 0.6 AND fresh '24 delta AND (IQR outlier OR accelerating decline)`. Population **23 buildings** today. LL97 over_cap is excluded because it is feature #1 inside the model (double-counting). This gives ConEd account managers a real Monday queue — 23 buildings that the model is confident about, whose usage trend independently corroborates, from this year's data.

### 3.5 The alternative if you reject Path C

If you want tier assignment to be genuinely rule-based (Path A revived), the code needs to change: `compute_diagnostic_risk` becomes a pure rule based on Johan's diagnostic metrics (weather-normalized YoY, decline acceleration, R² thresholds, slope stability, LL97 pressure) without ml_risk as an input. This is nontrivial work and would push the frontend redesign back until it's shipped. It also removes the current model's ordering discipline from the tier layer, which may weaken the sentence Path C's Exhibit D can defend.

Our default recommendation is Path C. If you push back and want to rewrite the function, we adjust the roadmap accordingly.

### 3.6 What we need from you on Path C

- Confirm Path C is the direction, or propose an alternative.
- If Path C: confirm the ledger column label wording you're comfortable defending in front of David.
- If Path C: confirm Critical v1.1 (`ml_risk ≥ 0.6 AND fresh '24 delta AND (IQR outlier OR accelerating decline)`, n=23) is the right operational definition. This will be a David sign-off item as well; we want your read first.

---

## 4. AUC rerun scope

### 4.1 What's on the frontend today

The current build has three AUC-adjacent claims in the wild:

- `docs/model-technical-spec.md` v1.3 (2026-06-05): AUC 0.672, describes model as `GradientBoostingClassifier`. This is stale — predates the XGBoost switch.
- `docs/xgboost_results.md` (2026-07-01): AUC 0.6833 from `GridSearchCV` best score. GBM comparison shown at 0.6639 ± 0.1030.
- `api/server.js:585`: `model_version: "GBM-v1+SHAP"` (stale)
- `api/server.js:867`: chatbot answer describes model as GBM and calls ml_risk "a prediction (0–1) of how likely a building is to reduce or cancel steam service" (this is a calibration claim the model doesn't support — same voice violation Path C exists to fix)

### 4.2 What Fable wants the frontend to say

The score cell chip carries model version + validation status only, never a numeric AUC. The AUC lives in exactly one place (case-file header ledger and methodology-page footer), sourced from a single `model_meta` object.

Interim UI copy until the rerun lands: "validation rerun in progress; ranking order is the claim, not probability."

Post-rerun templated sentence: "ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)." Example: "ranks a true churner above a non-churner about 68% of the time (5-fold CV, 54 positive labels)."

### 4.3 Discipline items Fable flagged for the rerun

- 0.6833 is a `GridSearchCV` best score with no reported fold std. That's mildly optimistic by selection. Rerun on the chosen config (best `{colsample_bytree, learning_rate, max_depth, n_estimators, scale_pos_weight, subsample}` from `xgboost_results.md`), report the CV AUC with std explicitly.
- Round to two decimals in UI copy.
- Include positive-label count in the templated sentence so the reader can weigh confidence.

### 4.4 What we need from you on the rerun

- Confirm you can produce a clean CV AUC with std on the chosen XGBoost config.
- Confirm the positive-label count for the templated sentence (54 per current file; verify).
- Confirm the k-fold value (5-fold per current file; verify).
- Timeline estimate. This gates one templated sentence but does not block the atoms — they ship with the "rerun in progress" copy first.

---

## 5. The `model_meta` object

### 5.1 Purpose

Every frontend surface that mentions the model — provenance chip on the score cell, case-file header ledger, reasoning report footer, weekly digest footer, chatbot answer — currently either has a hardcoded string or reaches into different places. This creates drift (the GBM strings in `server.js` are exactly this drift). Fable's fix: your pipeline writes one JSON object at the end of the run, the API serves it, and every UI surface reads from it. Updating the model updates one field, not fifteen strings.

### 5.2 Proposed fields

```json
{
  "model_name": "XGBoost Classifier",
  "model_version": "XGB v1",
  "params_hash": "<sha of best_params from GridSearchCV>",
  "commit": "<git commit sha of the training run>",
  "cv_auc": 0.68,
  "cv_std": 0.09,
  "cv_kfold": 5,
  "n_labeled": 1003,
  "n_positive": 54,
  "label_definition": "≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023",
  "run_date": "2026-07-01T12:05:00Z",
  "validation_status": "unvalidated"
}
```

### 5.3 Where it lives

Written to `public/model_meta.json` (or wherever your pipeline writes JSONs), served through the API at `GET /api/model_meta`, read by React on mount and cached. No per-request compute.

### 5.4 What we need from you on this

- Confirm the fields are all producible from your pipeline. If any require work that doesn't already exist, flag it.
- Confirm the field naming convention (snake_case as above, or camelCase to match the API's response style — your call).
- Confirm this becomes part of the pipeline's normal run (regenerated whenever you rerun `train_xgboost.py` or `update_enrichment_risk.py`).

---

## 6. Pipeline plumbing gates

Three items block Spec 4 (landing page) and Spec 5 (email digest) from shipping. These are the reasons the redesign build order puts landing/email last. Rough estimates and scope-check questions below.

### 6.1 Snapshot diffing → `events.json`

**What it needs to do:** at the end of your pipeline run, diff the current `buildingEnrichment.json` against the previous run and emit a list of named events. Event types Fable's design assumes:

- `TIER↑` / `TIER↓` (diagnostic_risk changed)
- `PERMIT` (dob_jobs incremented)
- `DATA` (a data source refresh, e.g., new LL84 filing)
- `STATUS` (workflow state changed — depends on §6.2)
- `DIVERGE` (base-Low-to-final-High promotion happened this run)
- `MODEL` (model retrained; version bumped)

**Format:** one JSON file with a list of events, each event having `{bbl, event_type, from, to, timestamp, source}`.

**Why the frontend needs it:** the landing page's delta feed is literally a render of this file. No diffing, no feed. Without this, the landing page has to ship with an empty state that reads honestly ("no events since first snapshot") until you deliver.

**What we need:** scope estimate and whether you want to keep run N-1 in the repo/on the volume or elsewhere.

### 6.2 Append-only status events endpoint

**What it needs to do:** persist workflow state changes on individual buildings. Users mark buildings as `Unreviewed → In review → Contacted → Confirmed at-risk / False positive / Dismissed`. Each mark writes an event to a table keyed by BBL, with timestamp and user (session token is fine).

**Storage:** Postgres or SQLite on the Railway volume. Append-only — never overwrite, always add a new event. Reading the current state means reading the latest event per BBL.

**Endpoint:** `POST /api/buildings/:bbl/status` behind `requireAuth`. Body: `{status, note?, actor}`. Response: the persisted event.

**Why the frontend needs it:** the queue arithmetic on the landing page ("23 Critical − 6 contacted − 2 dismissed = 15 to review") requires this to persist across page reloads. Also, the feedback loop David asked for is exactly this: the "mark false positive" click has to survive and be queryable, or the feedback loop is theatre.

**Related:** the current watchlist is an in-memory Map at `api/server.js:314`, LRU-capped at 500, session-keyed. It does not survive a restart. Fable's design absorbs the watchlist into this same write-path store as its first migration. So this endpoint replaces the in-memory Map as well.

**What we need:** scope estimate, DB choice (Postgres vs SQLite), and confirmation on the schema (below).

**Proposed schema:**
```
building_status_events
  id           serial PK
  bbl          text  (indexed)
  status       text  (enum-like: Unreviewed, In review, Contacted, Confirmed at-risk, False positive, Dismissed)
  note         text  (optional)
  actor        text  (session token or user identifier)
  created_at   timestamp
```

### 6.3 Data decoupled from deploy

**What it needs to do:** move `public/buildings.json`, `public/buildingEnrichment.json`, `public/yoy_deltas.json`, `public/model_meta.json` from being baked into the container to living on the Railway volume (or in Postgres). The API reads at request time.

**Why the frontend needs it:** Fable's freshness chip claims a data vintage ("Δ '24" or "Δ '23 latest") and a pipeline run date. With JSONs baked into the container, the effective "data date" is the deploy date, which is dishonest — the container may be running old data three days after the pipeline rerun.

**Consequence if this ships:** the freshness chip carries the real pipeline run date, and on-demand refresh becomes possible without a redeploy.

**Consequence if this doesn't ship:** the chip has to name the deploy date honestly ("build 2026-07-01, run same day"), which works but is less accurate.

**What we need:** scope estimate. This is the item most likely to slip and be worked around with copy.

### 6.4 Optional item: `'22→'24` adjacent-gap delta

Not blocking anything, but flagged as a nice-to-have. 213 buildings have `steam_2022` and `steam_2024` but no `steam_2023` — they pass the Uncertain gate (`n_years == 2`) but produce no delta with the current adjacent-year logic. A `norm_delta_22_24` computed as a two-year normalized delta would collapse those 213 into one of the two "has-a-delta" freshness states.

**What we need:** whether this is scoped for a future pipeline run or explicitly deferred to Round 2.

---

## 7. Concrete code items outside the pipeline

Two small commits Pedro will make against `main` once you've confirmed direction:

- `api/server.js:585`: `model_version: "GBM-v1+SHAP"` → `"XGB v1"` (sourced from `model_meta.model_version` once §5 lands)
- `api/server.js:867`: chatbot answer rewritten to describe XGBoost and remove the "how likely a building is to reduce or cancel steam service" language (calibration claim)

Do you want these to happen before you rerun training, or bundled with the `model_meta` rollout so it's one commit? Our default: bundle.

---

## 8. Questions we need answered from you

Please respond in whatever format is easiest. If you're feeding this to your LLM, ask it to give you a structured answer along these lines:

1. Path C sign-off on `compute_diagnostic_risk`. Y/N. If N, sketch the alternative and estimated scope.
2. Ledger column wording you'd defend to David for the tier ("Tier · model base + trend/statute modifiers" or your version).
3. Critical v1.1 definition sign-off (`ml_risk ≥ 0.6 AND fresh '24 delta AND (IQR outlier OR accelerating decline)`, n=23). Y/N. If N, propose an alternative.
4. AUC rerun scope: can you produce clean CV AUC + std on the chosen XGBoost config? Rough ETA.
5. `model_meta` object: fields all producible? Anything to add or drop? Naming convention (snake vs camel).
6. Snapshot diffing → `events.json`: scope estimate, storage choice for run N-1.
7. Append-only status events endpoint: scope estimate, DB choice (Postgres vs SQLite on Railway volume), schema OK as proposed.
8. Data decoupled from deploy: scope estimate, likely to be worked around with copy or actually ship.
9. `'22→'24` adjacent-gap delta: scope for a future run or explicitly deferred.
10. `server.js:585` + `:867` fixes: bundle with `model_meta` rollout or separate commit now?

## 9. What we do with your answers

- Path C sign-off (Q1) plus ledger column wording (Q2) unblocks Pedro to start Spec 1 (score cell) and Spec 2 (case-file header). This is the first component build of the redesign.
- Critical v1.1 sign-off (Q3) unblocks Spec 3 (reasoning report) and the Critical filter chip on the landing queue.
- AUC rerun scope (Q4) unblocks the templated sentence on the case-file header and report footer. Ships with "rerun in progress" copy until you deliver.
- `model_meta` fields (Q5) unblocks the provenance chip design and the pipeline scoping to produce the object. Pedro will hardcode a v0 stub until your first real emit.
- Pipeline gates (Q6–Q8) set the sequence for Spec 4 (landing) and Spec 5 (email digest). If two of three slip, Fable's degraded states cover for us at the demo but the digest cannot ship at all until Q6 and Q7 are done.
- `'22→'24` delta (Q9) is scope-planning only; doesn't gate the build.
- Server.js fixes (Q10) is a coordination question so we don't double-commit.

Once you send the answers back, Edwin will fold them into Fable's roadmap prompt (prompt 03 in the `fable-prompts-2026-07-13/` folder), and Fable will emit `docs/ref/2026-07-16_fable-roadmap.md` with sequenced milestones, dependencies, and acceptance criteria. That is the document Pedro builds from.

---

## 10. Files to look at if you want to verify anything I've written

- `update_enrichment_risk.py:71-108` — `compute_diagnostic_risk` function (§3.1)
- `public/buildingEnrichment.json` — the enrichment file, 1,210 rows, where `ml_risk`, `diagnostic_risk`, `ml_drivers`, `n_years_data`, `uncertain_reason` all live
- `public/yoy_deltas.json` — the delta file, 1,210 rows, where `norm_delta_22_23`, `norm_delta_23_24` live (34.9% coverage on '24 delta)
- `api/server.js:267` — the `ml_risk ?? risk` fallback (currently dead code because ml_risk is 100% populated)
- `api/server.js:314` — the in-memory watchlist Map (§6.2)
- `api/server.js:585` and `:867` — the stale GBM strings (§7)
- `docs/xgboost_results.md` — source of truth for the current model (§4.1)
- `docs/model-technical-spec.md` — **stale**, describes the pre-XGBoost model, do not use as source of truth for anything (§4.1)
- `fable-checkin-1-2026-07-12/system.md` — Fable's design system document
- `fable-checkin-2-2026-07-13/integration-check-round-1-response.md` — Fable's first pass integration check
- `fable-checkin-2-2026-07-13/integration-check-round-1-1-delta-response.md` — Fable's follow-up delta after we sent it the actual code and data (this is where the modifier-driven finding lives)
- `docs/archive/demo-cycle-2026-07-01/2026-07-13_blackstone-prep-asks.md` — the ASKS doc; §1, §4, §5, §6 are the most relevant sections for the decisions above

If your LLM asks for context on the design vocabulary (score cell, provenance chip, freshness chip, S-states L1–L6, ledger, atom, register), the source of truth is `fable-checkin-1-2026-07-12/system.md`.
