# Driftwatch Model — Plan Going Forward, Prepared for Fable Review
**Date:** 2026-07-13
**Author:** Edwin
**Purpose:** Give Fable enough context to critique our model direction. Includes the original ConEd ask (verbatim from the intake form), what we shipped at Blackstone, where our build lands against that ask, the dual-layer architecture we're planning to move to, and the questions we most want Fable's read on.

---

## 1. The ConEd ask — verbatim from the intake form

Source: `ConEd_intake_form.md`, project narrowed via David Caiafa's May 4, 2026 email (Gmail thread `19df4b4ffb9f15e1`).

### 1a. Project overview

> "A predictive analytics model that identifies **early-warning signals for steam customers likely to experience significant usage drops without warning**. Provides Con Edison's steam team with a proactive mechanism for adjusting forecasts and intervening before drop-offs cause downstream financial planning errors."

> "Sudden, unannounced reductions in customer steam usage cause meaningful forecasting errors. Predicting these drops in advance allows for better financial planning and resource management."

### 1b. Deliverables

- Trained ML model predicting steam customer drop-off risk
- Risk dashboard / visualization of high-probability drop-off customers
- List of significant predictive flags / signals
- Documentation of the underlying logic and accuracy benchmarks

### 1c. Success criterion (quantitative bar)

> "Accuracy benchmark: **identify at least 70% of major usage drops in back-tested data.**"

### 1d. Open questions ConEd explicitly asked us to explore

- Which usage behaviors are the strongest predictors (peak shifting vs. overall decline, seasonality patterns, etc.)?
- Can external market or economic data improve prediction accuracy?
- How should the model surface confidence levels so the steam team can prioritize follow-up?

### 1e. Reinforcing methodology guidance received later (post-intake)

**From Johan (ConEd, methodology owner):**
> "The focus is to develop a repeatable **pattern-based approach** that can be applied to current customers to identify potential lost business **earlier**."

Johan then handed us the recipe: per-customer linear regression `usage_per_billing_day ~ β_HDD·HDD + β_CDD·CDD + intercept`; adjust for weather; evaluate diagnostic metrics (YoY % variance, R², slope stability, slope-intercept sync, decline acceleration); apply empirically calibrated rule-based thresholds to label High/Medium/Low/Uncertain.

**From Ildi (ConEd, high-level framing):**
> "Specifically looking at year-over-year changes in customer consumption, normalized for temperature ... identifying statistical outliers in consumption changes and relating these to temperature normalization."

---

## 2. What we shipped at Blackstone — and why it was constraint-driven

Blackstone was a "make do with what we had" demo. Public data only. No ConEd billing data. Three-year annual LL84 window (2022–2024).

**Architecture:**
```
Public data (LL84, LL97, DOB, ACRIS, PLUTO) → K-means (5 archetypes)
    → XGBoost classifier (12 features) → SHAP drivers → React dashboard
```

**Model performance on record:**
- XGBoost CV AUC: **0.6833** (5-fold stratified)
- GBM baseline (pre-switch): 0.6639 ± 0.1030
- Positive class: 54 buildings with ≥50% YoY LL84 steam decline
- Negative class: 949 no-signal
- Excluded from training: 207 mod_drop (ambiguous middle)

**Weather normalization method:** single citywide HDD multiplier applied uniformly to all 1,210 buildings. No per-customer regression. No CDD. Additive per-customer weather-normalization (Johan's recipe) is not implemented.

**Uncertain tier:** empty in the live build. `diagnostic_risk` field exists in the data (with `Uncertain` values) but the UI does not consistently surface it.

---

## 3. Does our build answer the intake form's question? Honest read.

| Intake ask | Our current build | Answers it? |
|---|---|---|
| Trained ML model | XGBoost classifier, 12 features, SHAP-explained | ✅ Ships |
| Risk dashboard | React SPA — Rankings, BuildingPanel, Watch List, Alert engine, ClusterExplorer | ✅ Ships |
| List of significant predictive flags | 12 features documented; SHAP top-5 per building live in `ml_drivers` | 🟡 Present in code, not surfaced as a headline "top signals across the portfolio" artifact |
| Documentation of logic + accuracy | README, `docs/xgboost_results.md`, `docs/model-technical-spec.md` | 🟡 AUC on record (0.672) predates XGBoost switch — needs rerun |
| **≥70% of major drops in back-testing** | Cross-validation AUC 0.683; no dedicated back-test report at a threshold that quantifies major-drop recall | ❌ **Not answered as stated** |
| Peak shifting / seasonality patterns as predictors | Not analyzed — LL84 is annual only | ❌ Structurally blocked without monthly/billing data |
| External market/economic data improving prediction | LL97 exposure, DOB permits, ACRIS transfers are all external — they are among the strongest features (LL97 2024 penalty log = 20.7% XGB feature importance) | ✅ Answered strongly |
| Confidence levels for prioritization | Tier bands (High/Med/Low) + SHAP drivers per building; Uncertain tier defined but not surfaced | 🟡 Partial |
| **"Early-warning signals" for drops "before they occur"** | Model was trained on buildings whose ≥50% drop **already appeared in the annual LL84 filing** — a lagging, retrospective label | ❌ **Structural mismatch with the ask** |

**The core structural gap:** Our positive training class is buildings that *already dropped*. The classifier learns "what does a building whose profile matches those that dropped look like?" — a **profile-matching / retrospective pattern-matcher**, not a leading indicator. Johan explicitly asked for "identify potential lost business **earlier**" — meaning before the LL84 filing catches the decline. Our current architecture cannot do that on public data alone.

We are shipping the deliverables list. We are **not** meeting the spirit of the question. This is what needs to sharpen.

---

## 4. The plan going forward — dual-layer, dual-signal architecture

Sketch drawn from `CONED_METHODOLOGY_ALIGNMENT.md` and `plans/phase2_*` + `plans/phase3_ui_dual_tier.md`. Nothing here is committed to code beyond the partial pieces flagged in §5.

### Layer A — Johan-style per-customer diagnostic *(the ConEd methodology in our build)*

For each building, fit:
```
steam_per_day = β_HDD · HDD + β_CDD · CDD + intercept
```

Compute additive weather-normalized usage:
```
adjusted = actual + (NHDD − AHDD)·β_HDD + (NCDD − ACDD)·β_CDD
```

Diagnostic metrics per building: R², HDD slope stability, slope-intercept sync, decline-trend acceleration, YoY % variance of the normalized usage.

Rule-based tier assignment (High / Medium / Low / **Uncertain**), where Uncertain fires when R² < 0.5 or n_years < 3.

**Public-data feasibility:** yearly approximation only for 1,186 of 1,210 buildings (3–4 data points, 1–2 degrees of freedom — statistically thin, labeled accordingly). The 24 NYCHA developments have monthly data and get a real regression. Full billing-day resolution requires the NDA/data-sharing arrangement.

**Answers: "is this customer's own baseline breaking down?"** — the diagnostic / detective view.

### Layer B — External-pressure classifier *(what we already have, reframed)*

Same XGBoost. Same 12 features. But reframed in language and UI as *external-pressure detection* — LL97 compliance exposure, DOB permit activity, ACRIS ownership transfers, peer-block co-occurrence — not as a churn predictor.

**Answers: "is this customer's regulatory / permit / peer environment starting to look like buildings that historically left?"**

### Layer C — Reconciliation UI

When A and B agree → single confident badge.
When A and B disagree → flag "conflicting signals — manual review," and expose why.

The disagreement itself is a decision-support signal. From the July 1 demo audit: 7 Times Square shows `ml_risk` = 0.0002 but `diagnostic_risk` = Medium. That's exactly the case that needs Layer C. Today the UI shows both numbers with no reconciliation.

### Pattern-surfacing beyond individual scores

ConEd said "pattern-based approach." Options we've barely pushed on:

- **Owner-cohort attrition share** — buildings owned by the same LLC/REIT convert in batches (shared capital plan, shared LL97 strategy). Buildable from ACRIS grantor/grantee data. Detailed sketch in `docs/notes/2026-06-03_working-notes.md` §520.
- **Permit-activity precedence** — does an HVAC filing *precede* attrition by N months? Currently `log_dob_jobs` is a static feature; no lag analysis.
- **Ownership transfer as a triggering event** — new owners re-evaluate energy contracts. ACRIS is public.
- **LL97 threshold-crossing events** — buildings crossing the 2024 cap vs. buildings already over. The event, not the level.
- **Peer-block co-occurrence density** — the current `peer_score` field, but honestly named and honestly framed (see the rename argument in NOTES §520).

---

## 5. What's shipped toward the plan (as of 2026-07-13)

- ✅ **NOAA HDD/CDD pipeline** (`noaa_degree_days.py`) — Phase 1
- 🟡 **Per-building weather regression** — shipped for 24 NYCHA developments; 1,186 remaining on citywide factors
- 🟡 **`diagnostic_risk`**, **`decline_acceleration`**, **`decline_trend_label`** fields live in enrichment data
- 🟡 **`decline_trend_label` direction bug** — appears to flag "accelerating" for +growth same as -decline (7 Times Square case); needs code inspection
- 🔲 **Dual-tier reconciliation UI** — the Phase 3 plan — not built
- 🔲 **Uncertain tier surfacing in UI** — data exists, UI does not consistently show it
- 🔲 **Owner-cohort attrition share** — not built; ACRIS is available
- 🔲 **Permit-activity precedence / lag analysis** — not built
- 🔲 **Back-test report against the ≥70% recall bar from the intake form** — not built

---

## 6. Where the sharpening pressure lives

1. **Label quality is the single biggest lever.** Our positive class = ≥50% LL84 drop = late-stage / already gone. The intake form asks for early warning. Real early warning requires ConEd disconnect records with dates — expected AUC lift from 0.68 → 0.75–0.85.
2. **Per-customer regression at yearly resolution is 1–2 degrees of freedom.** Honest, but statistically thin. Ship crude with clear labeling, or hold Layer A until the data-sharing agreement lands?
3. **We haven't run the back-test the intake form asked for.** ≥70% recall on major drops is a specific measurable bar. We report CV AUC 0.683. Those are not the same claim.
4. **We have not surfaced patterns as an artifact.** ConEd asked for "a list of significant predictive flags / signals" — we have SHAP per building but no portfolio-level "these are the top 5 signals across all high-risk buildings" output.
5. **The two-number problem is a symptom.** `risk` vs `ml_risk` diverge with only 1-building overlap in the High tier. Layer C is the fix — but only if we build it.

---

## 7. Questions for Fable

### On the model architecture

1. Is the dual-signal architecture (Johan-style diagnostic + external-pressure classifier + reconciliation) the right shape, or should we collapse to one layer?
2. Given the retrospective label problem (positive class = already dropped), what's the case for unsupervised / anomaly-based approaches on the 209 `mod_drop` middle band we currently discard from training?
3. Is a yearly-resolution per-customer regression with 3–4 data points defensible in front of a utility SME, or does the statistical thinness undermine the credibility of Layer A?

### On patterns vs scores

4. ConEd's language is "pattern-based approach." Which of the pattern-level signals we haven't pushed on (owner cohorts, permit precedence, ownership transfers, LL97 threshold-crossings) is most likely to survive scrutiny as a *leading* rather than concurrent indicator?
5. Should the top-level UI artifact for ConEd be a ranked list of buildings, or a ranked list of *patterns* (with the buildings underneath as evidence)?

### On the accuracy story

6. The intake form specifies ≥70% recall on major drops in back-testing. We report CV AUC 0.683. What is the shortest path to a defensible back-test report against that specific bar?
7. Given no external ground truth (no ConEd disconnect records), is there value in constructing a synthetic hold-out — training on 40 of the 57 known churners and validating on the other 17 — as our best public-data proxy for "back-testing"?

### On honesty framing

8. Our AUC lift from 0.66 GBM → 0.68 XGBoost is small (0.02). Does that gap justify the XGBoost switch given the added complexity? Would a simpler, more transparent model (logistic regression, decision tree, or rule-based) trade accuracy for defensibility in a way that better serves a utility SME audience?
9. If we can't hit the ≥70% back-test bar, what's the most honest reframe of the tool that still lands?

### On what to build next

10. If we had two focused weeks before the September ConEd meeting, would you spend it on Layer A (Johan's methodology in code), pattern-surfacing (owner cohorts + precedence), the back-test report, or something else entirely?

---

## 8. Reference material for Fable

Core docs to skim if useful:
- `ConEd_intake_form.md` — the original ask (verbatim quotes above)
- `docs/ref/2026-07-06_client-notes.md` — every ConEd quote we have, sourced
- `coned-dashboard/CONED_METHODOLOGY_ALIGNMENT.md` — full gap analysis vs Johan's methodology
- `coned-dashboard/DEMO_BUILDINGS_LOG_2026-07-01.md` — current model architecture + demo building critique
- `docs/archive/demo-cycle-2026-07-01/2026-06-23_blackstone-build-state.md` — model performance and financial grounding
- `coned-dashboard/plans/` — the phase 1/2/3 plans, most partially executed
- `docs/notes/2026-07-13_progress-tracker.md` — current work status
