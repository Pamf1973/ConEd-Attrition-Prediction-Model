# ConEd Steam Attrition Dashboard

A decision-support tool for Con Edison's steam customer retention team. Built by the Pursuit Fellowship data team using NYC public data (LL84 benchmarking, DOB permits, ACRIS deed records, PLUTO).

**Live data:** 1,260 Manhattan buildings below 90th Street currently on ConEd district steam.

---

## What It Does

The dashboard helps ConEd account managers identify which steam customers are most likely to disconnect — and why — so outreach can happen before the customer files a permit.

Each building gets:
- An **ML attrition risk score** (0–100%) from a supervised model trained on real observed steam demand drops
- An **LL97 annual penalty estimate** showing how much the building owes under NYC's carbon law
- A **customer archetype** from unsupervised K-means clustering
- Signals from DOB permit filings, deed transfers, and peer behavior

---

## The Model Stack

### Layer 1 — K-Means Customer Archetypes
Groups buildings into 5 behavioral profiles using 7 public features (building size, age, GHG emissions, energy efficiency, permit activity, peer pressure, use type). No labeled data needed.

| Cluster | Archetype | Risk |
|---|---|---|
| 0 | Pre-War Active — Permit-Driven Churn | High |
| 1 | Mid-Size Post-War — Moderate Signal | Medium |
| 2 | Pre-War Stable — Low Signal | Low |
| 3 | Large Commercial — Capital Mobilized | Medium |
| 4 | Low-Compliance Commercial — Quiet Attrition | High |

Run: `python3 kmeans_model.py`

### Layer 2 — LL97 Penalty Calculator
Computes the annual dollar fine each building faces under NYC Local Law 97 of 2019:

```
Penalty = max(0, Actual GHG − (Floor Area × Intensity Limit)) × $268/ton CO₂e
```

Intensity limits vary by use type and tighten again in 2030. A building facing a $500k/year fine has strong financial motivation to switch away from steam.

### Layer 3 — Supervised Attrition Model (Gradient Boosting)
Trained on **real observed behavior** — not synthetic labels:

- **Positive (churn):** 57 buildings with confirmed ≥50% measured steam demand drop
- **Negative (staying):** 989 buildings with no demand signal
- **Excluded from training:** 209 buildings with moderate drops (predicted by the model)

**Cross-validated AUC: 0.645** — the model correctly ranks a churner above a non-churner 64.5% of the time using public data alone.

**Top predictive features:**

| Feature | Importance |
|---|---|
| Energy Star score | 19% |
| GHG emissions intensity | 14% |
| Peer score (neighbors leaving) | 13% |
| Building steam demand size | 13% |
| LL97 2030 penalty | 11% |
| Year built | 11% |
| DOB permit activity | 9% |
| LL97 2024 penalty | 6% |

Run: `python3 ll97_model.py`

### The K-Shaped Distribution
The model finds very little middle ground: **59 High risk / 6 Medium / 1,145 Low**. This reflects the real customer landscape — buildings either have converging signals (LL97 pressure + neighbors leaving + HVAC permits filed) and are heading out, or they have none of those and are staying. The retention strategy should focus on the high-risk cohort. All 1,210 buildings are ML-scored (100% coverage — no buildings fall back to legacy heuristic).

### Weather Normalization + Diagnostic Risk Fields

The dashboard now aligns with ConEd's early-warning methodology using **NOAA-degree-day normalization** and **rule-based diagnostic risk tiering**:

#### Weather Normalization
NOAA Central Park (USW00094728) heating and cooling degree days drive normalization:
- `noaa_degree_days.py` fetches monthly HDD/CDD via NOAA CDO API (or uses hardcoded historical fallback)
- Per-building OLS regression for 24 NYCHA developments with monthly steam data: `steam ~ HDD + CDD` (17/24 have sufficient data, median R² = 0.597)
- Citywide HDD/CDD factors for the remaining 1,186 buildings derived from NOAA 30-year normal

#### Diagnostic Risk Fields
Each building now carries five new diagnostic fields in `buildingEnrichment.json`:

| Field | Description | Values |
|---|---|---|
| `diagnostic_risk` | Rule-based risk tier combining ML attrition risk, decline acceleration, and data sufficiency | Low / Medium / High / Uncertain |
| `decline_trend_label` | Direction of year-over-year steam demand change | accelerating / decelerating / stable |
| `decline_acceleration` | Second-difference of normalized steam deltas (23_24 − 22_23) | Float or null |
| `n_years_data` | Number of years with available steam data | 1, 2, or 3 |
| `uncertain_reason` | Explanation when diagnostic_risk is Uncertain | String or null |

**Tiering rules:**
- `n_years_data < 2` → **Uncertain** (254 buildings)
- Norm delta 23_24 < –30% → **High** (242)
- Norm delta 23_24 –30% to –10% → **Medium** (475)
- Norm delta 23_24 ≥ –10% → **Low** (239)

#### NOAA_TOKEN Environment Variable
Set `NOAA_TOKEN` in your `.env` file to enable live NOAA API data fetching (optional):
```
NOAA_TOKEN=your_token_here
```
Get a free token at https://www.ncdc.noaa.gov/cdo-web/token. If unset, the pipeline falls back to hardcoded Central Park historical degree-day data.

---

## Data Sources

| Dataset | Source | Used For |
|---|---|---|
| LL84 Benchmarking (CY2022) | NYC Open Data `5zyy-y8am` | Steam demand, GHG, floor area, Energy Star |
| DOB NOW Permits | NYC Open Data `w9ak-ipjd` | HVAC/boiler filing activity |
| ACRIS Deed Records | NYC Open Data `8h5j-fqxa` | Ownership transfers, sale price |
| PLUTO | NYC Open Data `64uk-42yjl` | Year built, BBL, geocoordinates |
| Steam trend signals | Computed from LL84 multi-year | Year-over-year demand change, HDD-normalized |
| Peer scores | Computed from spatial clustering | % of nearby buildings showing attrition |

All data is public. No ConEd internal billing data is used.

---

## Running Locally

```bash
npm install
npm run dev
```

### Rebuilding the enrichment data

Run these scripts in order when source data updates:

```bash
# 1. K-means archetypes
python3 kmeans_model.py

# 2. LL97 penalties + supervised attrition model
python3 ll97_model.py
```

Both scripts write to `public/buildingEnrichment.json` atomically (via `.tmp` + replace). The dashboard reads this file at load time.

---

## Project Structure

```
coned-dashboard/
├── public/
│   ├── buildings.json          # 1,260 buildings (address, BBL, steam, GHG, lat/lon, risk)
│   └── buildingEnrichment.json # Enrichment: LL97, ml_risk, cluster, EUI, DOB, deeds
├── src/
│   ├── components/
│   │   ├── RiskTable.jsx       # Main sortable/filterable building table
│   │   └── BuildingPanel.jsx   # Side panel — full building detail view
│   └── data/
│       └── useBuildings.js     # Data hook + riskTier / signalMeta helpers
├── kmeans_model.py             # Layer 1: unsupervised clustering
└── ll97_model.py               # Layer 2–3: LL97 penalties + supervised model
```

---

## Team

Built at [Pursuit Fellowship](https://pursuit.org) as a data engineering and ML capstone project.

- **Ismael Caraballo** — data pipeline, ML model, architecture
- **Pedro** — dashboard UI, table filters
- **Edwin** — building panel, data visualizations

> This tool is for decision-support only. Risk scores are derived from public data and are not a validated production classifier. All LL97 penalty estimates are approximations based on self-reported LL84 data.
