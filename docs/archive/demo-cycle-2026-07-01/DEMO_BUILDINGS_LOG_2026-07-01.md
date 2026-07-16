# Demo Buildings Log — Driftwatch
**Date:** 2026-07-01
**Context:** September ConEd presentation prep. Two buildings locked for slide 7 and live demo.
**Author:** Edwin Perez

---

## 1. Current State of the Build

### What Driftwatch Is Right Now

Driftwatch is a three-layer system on top of public NYC data:

```
PUBLIC DATA ──► MACHINE LEARNING ──► DASHBOARD UI ──► RELATIONSHIP MANAGER
(LL84, LL97,    (k-means cluster-    (Rankings,       (Watch List,
DOB, ACRIS,     ing + XGBoost        BuildingPanel,   outreach call)
PLUTO)          classifier +         Watch List)
                SHAP drivers)
```

It scores 1,210 Manhattan steam buildings by attrition risk using a trained classifier. The output is a ranked list of likely drop-offs with per-building explanations of why each building was flagged.

### Model Architecture (Current as of 2026-07-01)

**Pipeline:**
1. `kmeans_model.py` — clusters 1,210 buildings into 5 archetypes using 7 features. Writes `cluster_id` and `cluster_name` to `buildingEnrichment.json`.
2. `ll97_model.py` — trains an `XGBClassifier` on 1,046 labeled buildings (57 confirmed churn, 989 no-signal). `cluster_id` is one of 12 input features. Outputs `ml_risk ∈ [0,1]` and SHAP-derived `ml_drivers` per building.
3. React dashboard — reads `buildings.json` and `buildingEnrichment.json`, surfaces rankings, BuildingPanel, Watch List.

**Model type:** `xgboost.XGBClassifier` — upgraded from `sklearn.ensemble.GradientBoostingClassifier`

**Hyperparameters (ll97_model.py:253–260):**
- `n_estimators = 300`
- `learning_rate = 0.1` (was 0.05 in GBM era)
- `max_depth = 6` (was 4)
- `subsample = 0.8`
- `scale_pos_weight = neg/pos ≈ 17` (replaces manual sample weight arrays)

**12 features (ll97_model.py:82–90):**
`log_steam`, `year_built`, `log_ghg`, `log_dob_jobs`, `peer_score`, `energy_star`, `use_type_ord`, `cluster_id`, `ll97_penalty_2024_log`, `ll97_penalty_2030_log`, `ll97_over_2024`, `steam_ghg_share`

**Validation:** 5-fold stratified K-fold, metric = ROC-AUC, printed at runtime. Last recorded AUC: **0.672 ± 0.056** (v1.3, pre-XGBoost switch — XGBoost may have shifted this; rerun `ll97_model.py` and record the new number before the September presentation).

**Class imbalance:** `scale_pos_weight = round(989/57) ≈ 17` applied natively by XGBoost.

**SHAP:** Live. `shap.TreeExplainer` runs on the full feature matrix after training. Per-building top 5 SHAP contributions written to `enrichment["ml_drivers"]` as `{feature, contribution, value}` objects. The dashboard's "WHY THIS SCORE" panel reads directly from this field.

### New Fields in buildingEnrichment.json (Not in Earlier Notes)

Fields added since the June conversation that matter for the demo:

| Field | What it is |
|---|---|
| `ml_drivers` | Top 5 SHAP contributions per building (feature, contribution magnitude, raw value) |
| `diagnostic_risk` | Rule-based tier from steam trend analysis, separate from ML score |
| `decline_acceleration` | Rate of change of the YoY decline (positive = accelerating decline, negative = decelerating) |
| `decline_trend_label` | "accelerating" / "decelerating" / "stable" |
| `n_years_data` | How many years of steam data the building has |

**These are new and material.** They are not in the original notes file (`coned-dashboard-NOTES.md`). `diagnostic_risk` and `ml_drivers` especially matter for the demo narrative and should be understood before presenting.

### What Changed Since the June 13–17 Conversations

| Change | Old | New | Impact |
|---|---|---|---|
| Model algorithm | `GradientBoostingClassifier` | `XGBClassifier` | Faster training, native SHAP support, `scale_pos_weight` instead of manual weights |
| SHAP | Not in code | Live, per-building `ml_drivers` in enrichment | Dashboard now explains individual scores — big product improvement |
| `learning_rate` | 0.05 | 0.1 | More aggressive shrinkage; may have shifted scores slightly |
| `max_depth` | 4 | 6 | Deeper trees; more expressive but slightly higher overfit risk |
| Class imbalance method | Manual weight array | `scale_pos_weight` | Cleaner, equivalent effect |
| Hotel LL97 cap | 0.01450 | 0.00987 (fixed per §28-320.3.1(8)) | Corrects intensity limit for hotel buildings |
| Deployment | Local only | Railway (Dockerized) | Live URL exists for ConEd sharing |
| High-risk count | 58 (GBM era) | 57 (XGBoost era) | Model retrain shifted one building across the 0.7 threshold |
| AUC on record | 0.645 (v1.0) → 0.672 (v1.3) | Rerun needed for XGBoost | The 0.672 number predates the algorithm switch |

---

## 2. The Two Demo Buildings

### Why These Two

The goal was two buildings that tell a clean contrast story in a live demo: one the model is confident will fall off, one it is confident will stay. Selection criteria:

- ml_risk as extreme as possible in each direction
- Complete data (no null fields that break the dashboard UI)
- Three years of steam data (2022, 2023, 2024) present in `yearly.json`
- Recognizable or famous NYC address
- Clear LL97 story and permit activity visible in the panel
- No contradictions that require on-stage explanation

---

### HIGH-RISK LOCK: 200 East 42nd Street

**Internal key in data:** `200  EAST  42ND  ST.`

| Field | Value |
|---|---|
| ml_risk | **0.9987** |
| Risk tier | High |
| Archetype (cluster 4) | Low-Compliance Commercial — Quiet Attrition |
| Year built | 1956 |
| Use type | Office |
| Floor area | 384,432 sq ft |
| Energy Star | 77 |
| GHG | 6,184 metric tons |
| LL97 penalty 2024 | **$785,751** |
| LL97 penalty 2030 | **$1,190,650** |
| ll97_over_2024 | Yes |
| ll97_over_2030 | Yes |
| DOB permit jobs | 3 |
| Signal | big_drop |
| HDD-normalized YoY | −66% |
| steam_ghg_share | 0.552 (55% of GHG from steam) |
| decline_acceleration | −51.4 |
| decline_trend_label | **decelerating** |
| diagnostic_risk | High |
| n_years_data | 3 |
| Missing fields | None |

**SHAP top drivers (ml_drivers):**

| Feature | Contribution | Raw Value |
|---|---|---|
| ll97_penalty_2030_log | +2.58 | $1,190,650 |
| steam_ghg_share | +1.22 | 0.552 |
| energy_star | +1.21 | 77 |
| log_steam | −0.62 | (large raw volume) |
| log_ghg | −0.30 | 6,184 t |

**Why it was chosen:** Highest LL97 penalty exposure in the high-risk tier ($785K now, $1.19M by 2030). 55% of the building's carbon footprint is from steam. Confirmed big_drop signal with HDD-normalized YoY of −66%. Complete data across all three years. Midtown address. The model's near-certainty (0.9987) is justified by multiple reinforcing signals, not just one.

---

### LOW-RISK LOCK: 7 Times Square

| Field | Value |
|---|---|
| ml_risk | **0.0002** |
| Risk tier | Low |
| Archetype (cluster 4) | Low-Compliance Commercial — Quiet Attrition |
| Year built | Not in enrichment (post-2000 modern tower) |
| Use type | Office |
| Floor area | 1,184,834 sq ft |
| Energy Star | 82 |
| LL97 penalty 2024 | **$0** |
| LL97 penalty 2030 | **$0** |
| ll97_over_2024 | No |
| ll97_over_2030 | No |
| DOB permit jobs | 24 |
| Signal | None |
| HDD-normalized YoY | N/A |
| steam_ghg_share | 0.092 (9% of GHG from steam) |
| decline_acceleration | +11.47 |
| decline_trend_label | **accelerating** (steam growing) |
| diagnostic_risk | **Medium** |
| n_years_data | 3 |
| Missing fields | No `signal`, no `hdd_pct` (expected for a stable building) |

**SHAP top driver (from ml_drivers):**
- `log_dob_jobs` contribution: **−2.34** (pushes strongly toward low risk — high permit count on a modern building signals investment, not exit)

**Why it was chosen:** Iconic address. Near-zero ml_risk. Zero LL97 exposure in both compliance windows. Steam use is growing (not declining). Only 9% of its GHG comes from steam. The model's confidence is nearly total. Clean contrast to 200 East 42nd.

---

## 3. Critique of the Demo Building Choices

### The high-risk building's story has a tension

The top SHAP driver for 200 East 42nd is `ll97_penalty_2030_log` (+2.58), not the steam decline signal itself. The model is saying: *this building has enormous LL97 financial pressure and a high steam GHG share, therefore it is likely to want off steam.* That is a plausible economic argument, not a behavioral observation.

At the same time, the building does have a confirmed `big_drop` signal (−66% HDD-normalized). But the `decline_trend_label` is **"decelerating"** with `decline_acceleration = −51.4`. The rate of decline is slowing down. The building may have stabilized after a big drop rather than continuing to exit. The model still flags it at 0.9987 because the static features (LL97 exposure, steam GHG share, energy star) are strong — but the dynamic trend is not "accelerating toward exit." A ConEd account manager reading the full panel would see that nuance.

**On stage, this means:** do not say "this building is actively in the process of disconnecting." The correct language is "this building has the profile most associated with eventual disconnection — the LL97 pressure is large, more than half its carbon is from steam, and it has already shown a documented demand decline." That is a defensible, honest framing.

### The low-risk building has a diagnostic tension

7 Times Square has `ml_risk = 0.0002` (essentially zero) but `diagnostic_risk = "Medium"`. These two fields represent different things — `ml_risk` is the trained classifier, `diagnostic_risk` is a rule-based tier from the steam trend analysis — but side by side in the panel they look contradictory. If David or another ConEd stakeholder asks "why does it say medium risk in one place and 0.02% in another," you need an answer.

The answer is: the diagnostic risk reflects recent steam trend patterns (in this case `decline_acceleration = +11.47`, meaning steam is growing, which the label "accelerating" refers to acceleration in the positive direction). The medium diagnostic tier may be a labeling issue where "accelerating" is being treated as a flag regardless of direction. This is worth inspecting in the code before September.

The 24 DOB jobs also looks alarming for a "stable" building but the SHAP explanation makes it legible: `log_dob_jobs` is the top negative driver (−2.34), meaning the model learned that heavy permit activity at this building type reduces risk, not raises it. Large modern buildings with many DOB filings are investing, not preparing to exit. If this gets questioned on stage, you can say that directly.

### Both buildings are in Cluster 4

Both 200 East 42nd and 7 Times Square land in Cluster 4 (Low-Compliance Commercial — Quiet Attrition). This is not a mistake — the k-means archetype describes the building type (large commercial office stock, significant steam and GHG footprint), not the churn outcome. The GBM's other 11 features then separate the risky buildings from the stable ones within that type. You can use this as a demonstration of model sophistication: same archetype, completely opposite trajectories.

---

## 4. Critique of the Methodology — Does the Model Actually Answer the Question?

The question ConEd cares about is: **which buildings are likely to fall off as steam customers before they do so?**

The model does not answer that question. It answers a related but different one.

**The core problem:** Every building in the positive training class (the 57 "churners") had already shown a ≥50% weather-normalized steam decline by the time the label was assigned. The drop happened first. The model then learned what those buildings looked like in their public profile — LL97 exposure, Energy Star score, permit activity, building age — and it applies that pattern to flag current buildings that look similar. That is profile-matching against confirmed past churners. It is not predicting a future decision before any signal appears.

ConEd's internal method (per Johan) catches changes month-to-month using per-customer billing regression — it fires before the annual LL84 filing would ever show the decline. Our model fires on buildings that match the footprint of buildings where the decline already happened and was already reported in a public filing. These are not equivalent. Ours is a profile-matching tool, not a forward-looking behavior model.

**What we can and cannot claim:**
- Can claim: "Our model identifies Manhattan steam buildings whose public profile most closely matches those that have shown confirmed steam demand decline in recent LL84 filings."
- Cannot claim: "The model predicts when a building will disconnect."
- Cannot claim: "These buildings are preparing to leave." (They may be. The model doesn't confirm it.)

**The honest positioning:** Our tool is a public-data pre-screen that surfaces building profiles worth a human look — not a replacement for ConEd's internal early-warning system. The value is in prioritizing the relationship manager's attention before any billing signal appears.

---

## 5. What Needs to Be Added or Improved Before September

### Must-do before the presentation

**1. Rerun ll97_model.py and record the current AUC**
The 0.672 figure is from the pre-XGBoost GBM era. The model was switched to XGBoost with changed hyperparameters (`max_depth 4→6`, `learning_rate 0.05→0.1`). The real current AUC is unknown. You need this number to speak accurately about model performance. Run the script, record the output, update the deck.

**2. Resolve the diagnostic_risk / ml_risk tension**
Inspect what produces `diagnostic_risk`. Find where the label "Medium" is assigned for 7 Times Square despite stable or growing steam. If "accelerating" in `decline_trend_label` is being flagged regardless of direction (steam growing vs. declining), the field is mislabeled and will confuse anyone who reads the panel carefully.

**3. Confirm the YoY bar rendering for 200 East 42nd**
Raw steam went up year-over-year (2022→2023), but the HDD-normalized signal is −66%. If the dashboard is showing raw bars, the audience will see upward bars next to a "big drop" label. This was a known Tier 1 issue from June. Confirm whether the HDD normalization fix shipped in the current build and what the panel actually renders.

**4. Verify the high-risk count for the slide**
The older deck said 52. The GBM era had 58. The current XGBoost model shows 57. Pick the number that reflects the current build, update the slide, and do not change it again before September without updating both the slide and this document.

### High-value improvements for September

**5. Add the Johan per-customer regression comparison**
Johan gave a detailed methodology spec. A one-slide alignment showing "here is what ConEd does, here is what we do, here is what each approach catches" is one of the most credible things that can go in the September deck. It demonstrates you understand the domain, not just the code.

**6. Validate on the 57 confirmed churners**
The 57 buildings in the positive training class are known. Pull their scores from the current model. Show the distribution: if the model truly learned the pattern, they should cluster at the top of the ranking even in cross-validation. This is the most direct validation story you have with public data.

**7. HDD-normalize the YoY bars throughout**
The citywide HDD factors exist in `steam_trend_signals.json`. Applying them removes the raw-vs-normalized contradiction from the panel. This was Tier 1 item #1 from the June improvement roadmap and has not shipped.

**8. Surface `decline_trend_label` prominently in the panel**
"Accelerating" vs "decelerating" is a more intuitive signal for a non-technical ConEd audience than a probability score. A building with an accelerating decline is a different kind of urgent than one where the decline is plateauing. This field exists in the data — it just needs to be visible in the UI.

**9. Add an "uncertain" explanation to buildings with `diagnostic_risk ≠ ml_risk`**
Where the rule-based and ML tiers disagree, surface a one-line explanation in the panel rather than showing two conflicting numbers. Something like: "ML score and trend signal diverge — manual review recommended."

**10. Build the per-building reasoning report**
This was the explicit ask from the June ConEd calls (David, Ildi, Johan). A generated PDF or printable HTML showing why a building was flagged, with the feature contributions, steam history, and a methodology footer. This is what an account manager needs to defend an outreach decision internally. It is also what turns a demo into a product.

---

## 6. Demo Locks — Final Record

| Role | Building | ml_risk | LL97 2024 | LL97 2030 | Signal | Trend | Complete Data |
|---|---|---|---|---|---|---|---|
| High-risk | 200 East 42nd St | 0.9987 | $785,751 | $1,190,650 | big_drop (−66% HDD) | decelerating | Yes |
| Low-risk | 7 Times Square | 0.0002 | $0 | $0 | None | accelerating (growing) | Yes |

These are locked. Do not swap buildings for the September presentation without updating this document, the slide deck, and verifying the new building's data completeness end-to-end in the live dashboard.

---

## 7. Things to Know That Are Not in the Code

- The 209 `mod_drop` buildings are **excluded from training** but the model still scores them. They are the ambiguous middle — not confirmed churners, not stable. They are the most useful cases for targeted outreach and the ones we cannot confidently classify.
- The `peer_score` field measures geographic co-occurrence of attrition signals, not causal precedence. It was the weakest justified feature in the original design and the one most vulnerable to a "is this circular?" question. Be ready to answer that `peer_score` is a concurrent density measure, not a lagging or leading predictor.
- `ml_risk` is the output of the XGBoost classifier. `diagnostic_risk` is a separate rule-based classification from the steam trend analysis. They use different inputs and will not always agree. Neither overrides the other — they are two independent perspectives on the same building.
- No external validation exists. The model has never been tested against ConEd's actual disconnect records. Everything is validated against the 57 public-data churners that were also used for training (via cross-validation). Real precision and recall at the account level is unknown until ConEd shares billing data.
