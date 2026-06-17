# Phase 2 — Per-Building Weather Regression + Diagnostic Metrics
**Owner:** TBD  
**Effort:** ~2 days  
**Prereq:** Phase 1 (real NOAA HDD/CDD values)

---

## Goal

Implement a per-building regression approximation of Johan's framework using 3–4 yearly data points. Statistically thin but honest — labeled clearly in the UI. Produces β_HDD, R², decline trend, and a rule-based diagnostic risk tier including Uncertain.

---

## The Math (yearly approximation)

Johan's full model requires monthly billing data. We have annual totals only. The approximation:

**Regression per building (OLS, 3–4 observations):**
```
steam_per_day_y = β_HDD × HDD_y + β_CDD × CDD_y + intercept
```
Where:
- `steam_per_day_y` = annual steam / 365 (or actual billing days if available)
- `HDD_y` = actual HDD for year y (from Phase 1)
- `CDD_y` = actual CDD for year y (from Phase 1)
- Years: 2021, 2022, 2023, 2024 (4 points if we have 2021 data, else 3)

**Weather-normalized usage (additive, per Johan):**
```
adjustment_heat_y = (NHDD - AHDD_y) × β_HDD
adjustment_cool_y = (NCDD - ACDD_y) × β_CDD
norm_steam_y = actual_steam_y + adjustment_heat_y + adjustment_cool_y
```

---

## Diagnostic Metrics to Compute

| Metric | Computation | Field name |
|---|---|---|
| β_HDD slope | OLS coefficient | `beta_hdd` |
| β_CDD slope | OLS coefficient | `beta_cdd` |
| Intercept | OLS intercept | `regression_intercept` |
| R² (model fit) | sklearn or numpy | `r_squared` |
| HDD slope stability | stdev(β_HDD across rolling 2-yr windows) | `slope_stability` |
| Slope-intercept sync | sign(Δβ_HDD) == sign(Δintercept) across periods | `slope_intercept_sync` |
| Decline trend | norm_delta_23_24 - norm_delta_22_23 (second difference) | `trend_acceleration` |
| Decline direction | neg trend + acceleration = worsening | `decline_class` |

---

## Implementation Steps

### 1. `per_building_regression.py`

New script. Reads `public/yearly.json` + `public/hdd_cdd_annual.json`. For each building:
- Runs numpy OLS (no sklearn needed: `np.linalg.lstsq`)
- Computes all 8 diagnostic metrics above
- Flags `data_thin = True` when < 3 complete years
- Flags `r_squared_low = True` when R² < 0.50

Writes: `public/building_diagnostics.json`
```json
{
  "1000 10TH AVE": {
    "beta_hdd": 142.3,
    "beta_cdd": -18.1,
    "regression_intercept": 4200.0,
    "r_squared": 0.72,
    "slope_stability": 0.08,
    "slope_intercept_sync": true,
    "trend_acceleration": -8.4,
    "decline_class": "accelerating",
    "data_thin": false,
    "r_squared_low": false
  }
}
```

### 2. Rule-Based Diagnostic Tier Assignment

Replace ML probability cutoffs with empirically calibrated rules (Johan's approach):

```python
def assign_diagnostic_tier(b):
    # Uncertain: poor model fit or insufficient data
    if b["r_squared_low"] or b["data_thin"]:
        return "Uncertain"
    # High: large decline, accelerating, synchronized degradation
    if (b["trend_acceleration"] < -5 and
        b["norm_delta_23_24"] < -15 and
        b["slope_intercept_sync"]):
        return "High"
    # Medium: moderate decline or single signal
    if b["norm_delta_23_24"] < -10 or b["trend_acceleration"] < -3:
        return "Medium"
    return "Low"
```

Thresholds are starting points — calibrate empirically against the 57 known-churn buildings.

### 3. Merge into `buildingEnrichment.json`

Update `ll97_model.py` (or a new merge script) to join `building_diagnostics.json` into the enrichment file per building.

New fields on each enrichment record:
- `beta_hdd`, `r_squared`, `slope_stability`, `decline_class`, `trend_acceleration`
- `diagnostic_tier` (High / Medium / Low / Uncertain)
- `data_thin`, `r_squared_low`

### 4. Restore Meaningful Uncertain Tier

Uncertain = `r_squared < 0.5 OR data_thin = True`.  
Target: ~100–200 buildings (those with < 3 years or poor fit) moved from Low → Uncertain.  
This is honest — we shouldn't claim confidence we don't have.

---

## Statistical Caveats to Document Clearly

- 3–4 data points for a 2-variable regression = 1–2 degrees of freedom. R² will be inflated.
- Label all diagnostic outputs with `"data_resolution": "annual"` so ConEd can't confuse this with monthly billing-data quality.
- β_HDD at annual resolution is ~5–10× noisier than at monthly resolution.

---

## Output

`public/building_diagnostics.json` — per-building regression + diagnostics  
`public/buildingEnrichment.json` — updated with `diagnostic_tier`, `r_squared`, `beta_hdd`, etc.

---

## Acceptance Check

```python
import json
with open("public/buildingEnrichment.json") as f: data = json.load(f)
tiers = {}
for b in data.values():
    t = b.get("diagnostic_tier", "missing")
    tiers[t] = tiers.get(t, 0) + 1
print(tiers)
# Expected: Uncertain > 0, High + Med + Low sum to ~1000-1100
```
