# Model Technical Specification
# ConEd Steam Attrition Dashboard — Phase 1

**Version:** 1.3  
**Last Updated:** 2026-06-05  
**AUC:** 0.672 (5-fold stratified CV)  

---

## 1. Problem Statement

ConEd district steam serves approximately 1,260 buildings in Manhattan below 90th Street. When a customer installs an onsite boiler or heat pump and disconnects from steam, that revenue loss is permanent. The goal of this model is to identify which accounts are most likely to disconnect before they file a DOB permit — enabling targeted retention outreach.

---

## 2. Model Architecture

**Algorithm:** Gradient Boosting Classifier (`sklearn.ensemble.GradientBoostingClassifier`)

| Hyperparameter | Value | Rationale |
|---|---|---|
| `n_estimators` | 300 | Sufficient depth without overfitting on 1,046 labeled rows |
| `learning_rate` | 0.05 | Conservative shrinkage to reduce variance |
| `max_depth` | 4 | Limits tree complexity for sparse positive class |
| `subsample` | 0.8 | Stochastic gradient boosting — reduces variance |
| `random_state` | 42 | Reproducibility |
| Class weighting | Manual balanced | `w_pos = n/(2*pos)`, `w_neg = n/(2*neg)` to handle 5.4% minority class |

**Preprocessing:** `StandardScaler` inside a `Pipeline` (prevents CV fold leakage)  
**Cross-validation:** `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`

---

## 3. Training Labels

Labels are derived from **real observed steam demand behavior** — not synthetic proxies.

| Label | Count | Definition |
|---|---|---|
| **Positive (y=1)** | 57 | Buildings with ≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023 filing |
| **Negative (y=0)** | 989 | Buildings with no steam demand signal in either filing year |
| **Excluded** | 209 | Buildings with 5–49% decline (mod_drop) — label ambiguous, model predicts these |

**Total training set:** 1,046 labeled buildings  
**Positive rate:** 5.4%

### Weather Normalization (Labels)
Steam demand drops are adjusted for heating degree days (HDD) before thresholding:
```
hdd_adjusted_pct = raw_pct × (HDD_baseline / HDD_reporting_year)
```
Annual HDD ratios: 2023 = 1.227 (warm year), 2022 = 1.031  
**Known limitation:** This is a city-wide ratio, not a per-building regression. ConEd's internal model uses per-building HDD/CDD regression with billing day adjustment — more precise. Our labels carry some residual weather noise.

---

## 4. Feature Set

| # | Feature | Importance | Description |
|---|---|---|---|
| 1 | `energy_star` | 18.5% | Energy Star score (1–100). Imputed from use-type median if missing |
| 2 | `log_ghg` | 12.4% | Log of total GHG emissions (MT CO₂e, LL84 CY2022) |
| 3 | `steam_ghg_share` | 11.9% | Steam's fraction of total GHG: `(steam_kBtu × 4.493e-5) / ghg_total` |
| 4 | `ll97_penalty_2030_log` | 10.8% | Log of projected 2030–2034 LL97 annual fine (USD) |
| 5 | `log_steam` | 10.5% | Log of annual steam demand (kBtu, LL84 CY2022) |
| 6 | `peer_score` | 10.2% | Fraction of buildings in spatial cluster also showing attrition signals |
| 7 | `year_built` | 9.2% | Year of construction (PLUTO) |
| 8 | `log_dob_jobs` | 7.4% | Log of HVAC/boiler permit filings at DOB NOW |
| 9 | `ll97_penalty_2024_log` | 6.0% | Log of 2024–2029 LL97 annual fine (USD) |
| 10 | `use_type_ord` | 2.0% | Use-type attrition risk ordinal (Office=4, Hotel=3, Multifamily=2, Hospital=1) |
| 11 | `cluster_id` | 1.2% | K-means cluster assignment (0–4) |
| 12 | `ll97_over_2024` | 0.01% | Binary: 1 if building exceeds 2024 LL97 emissions cap |

### Feature Notes

**`steam_ghg_share` (added v1.2):**  
Addresses the causal validity gap identified in review: LL97 penalty pressure is only an attrition signal if steam is actually the building's dominant emissions source. A building can comply with LL97 via envelope upgrades, controls, or RECs without touching steam. This feature conditions the LL97 signal on steam's actual share of emissions.

Emission factor: **4.493e-5 MT CO₂e/kBtu** (NYC DOB Chapter 103 Rules, LL97 regulatory coefficient). This differs from the EPA eGRID value (6.68e-5) — the LL97 binding value is used for consistency with the compliance framework.

**`peer_score`:**  
Contemporaneous spatial signal — fraction of nearby buildings also showing attrition signals in the same reporting period. **Known limitation:** Not a lagged leading indicator. Captures geographic co-movement but does not establish temporal causality (neighbors leaving → target will follow).

---

## 5. Evaluation

| Metric | Value | Notes |
|---|---|---|
| 5-fold stratified CV AUC | **0.672 ± 0.056** | Correct methodology (Pipeline + StratifiedKFold) |
| Interpretation | Model ranks a churner above a non-churner 67.2% of the time | Baseline (random) = 0.50 |

### AUC Progression

| Version | AUC | Change |
|---|---|---|
| v1.0 — original heuristic features | 0.645 | Baseline |
| v1.1 — non-stratified CV (incorrect) | 0.645 | No change — prior CV happened to be conservative |
| v1.2 — + `steam_ghg_share` (LL97 causal fix) | 0.660 | +0.015 |
| v1.3 — Pipeline CV + StratifiedKFold + correct emission factor | **0.672** | +0.012 |

**Note on CV methodology change:** Fixing the scaling leakage (scaler now fit per fold via Pipeline) and using StratifiedKFold did not deflate the AUC — it increased slightly. This means the original estimate was already conservative, not optimistic. The current 0.672 is a more trustworthy estimate.

---

## 6. Portfolio Distribution

| Tier | Count | Risk Threshold |
|---|---|---|
| High | 58 | ml_risk > 0.70 |
| Medium | 8 | 0.40 < ml_risk ≤ 0.70 |
| Low | 1,144 | ml_risk ≤ 0.40 |
| Uncertain | ~50 | No ML output (missing features at training time) |

---

## 7. Known Limitations

### 7.1 Weather Normalization Gap
ConEd's internal model uses per-building HDD/CDD linear regression with billing day adjustment. Our labels use a single annual city-wide HDD ratio. Some of the 57 positive labels may be partially weather-driven rather than behavioral. Best estimate: affects 5–15% of training labels.

### 7.2 Causal Validity Gap (Partially Addressed)
`steam_ghg_share` addresses the "LL97 pressure ≠ steam conversion" gap but does not resolve:
- **Building-type feasibility:** Large hospitals and institutional buildings may not be able to convert (process steam for sterilization, scale of distribution systems). These buildings may receive inflated risk scores.
- **Alternative compliance pathways:** Envelope upgrades, controls, or RECs all satisfy LL97 without steam reduction. The model cannot distinguish these pathways from actual attrition intent.

### 7.3 No Temporal Holdout
All labeled data comes from the same LL84 data vintage as the features (CY2022/2023). A fully rigorous evaluation would train on pre-2022 behavior and predict 2023 disconnections. We cannot do this until we have multiple years of ConEd billing history.

### 7.4 Peer Score Contemporaneity
`peer_score` reflects neighbors' attrition signals from the same reporting period — not a lagged leading indicator. It may capture simultaneous neighborhood-level decisions rather than predictive signal.

---

## 8. Data Pipeline

```
LL84 CY2022 (NYC Open Data)
  └── steam demand, GHG, floor area, Energy Star, use type
      ↓
MapPLUTO (NYC DCP)
  └── year built, BBL, lat/lon
      ↓
DOB NOW Permits (NYC Open Data)
  └── HVAC/boiler filing count per building
      ↓
[kmeans_model.py] → cluster_id, cluster_name (5 archetypes)
      ↓
[ll97_model.py]
  ├── compute_ll97() → penalty_2024, penalty_2030, over_2024
  ├── steam_ghg_share = (steam × 4.493e-5) / ghg
  ├── build_rows() → 12-feature matrix
  ├── StratifiedKFold CV → AUC 0.672
  └── predict_all() → ml_risk [0,1] for all 1,260 buildings
      ↓
[ll33_grades.py] → LL33 letter grade from Energy Star
      ↓
public/buildingEnrichment.json
  └── ml_risk, ll97_*, steam_ghg_share, ll33, cluster_*, eui, dob_jobs
```

---

## 9. Phase 2 Model Plan (With ConEd Data)

When ConEd provides billing data via BBL join:

1. **Replace HDD normalization:** Per-building HDD/CDD regression matching ConEd's own methodology. Cleaner labels, potentially higher AUC.
2. **Add actual SC class:** Tariff class (SC-1 through SC-5) is the strongest single predictor. SC-5 buildings are high-risk by contract definition.
3. **Add billing trend features:** Month-over-month demand slope, R² of regression fit, HDD slope stability — the same diagnostic metrics ConEd uses internally.
4. **Temporal holdout validation:** Train on pre-2023 behavior, evaluate on 2024 disconnections.
5. **Retrain labels:** Use ConEd's verified disconnection records as ground truth rather than LL84-inferred demand drops.

Expected AUC with ConEd data: **0.75–0.85** (estimate based on feature quality improvement).
