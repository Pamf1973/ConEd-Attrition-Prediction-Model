# Phase 2: ConEd Methodology Alignment

## Goal
Align the steam consumption normalization and risk pipeline with ConEd's per-building weather normalization methodology — adding HDD/CDD regression, decline trend acceleration, rule-based risk tiering, and an Uncertain tier.

## Research Summary
- **NOAA NCEI CDO API v2**: Free access to historical degree days data (requires free API token). Endpoints support GHCND stations with daily data. NYC has multiple weather stations (Central Park, JFK, LGA).
- **Monthly steam data**: Available for 24 NYCHA developments (`steam-consumption.csv`, 6,558 rows, 2010-01 to 2025-09). 1,210 buildings in `yearly.json` have only annual data (3 years max: 2022-2024).
- **Current normalization**: Citywide multiplicative HDD factors (`HDD_FACTOR={2022:1.031, 2023:1.227, 2024:1.227}`) — no regression, no CDD.
- **ConEd alignment doc** specifies: additive adjustment model `adjusted = actual + (NHDD−AHDD)×β_HDD + (NCDD−ACDD)×β_CDD`, per-building R², slope stability, decline acceleration, rule-based risk labels, Uncertain tier.

## Approach

### Per-building regression feasibility
- **24 NYCHA developments** with monthly data: full ConEd-style regression possible (12+ data points per building per year → reliable β_HDD, β_CDD, R²)
- **1,186 remaining buildings** (annual-only): use NOAA-derived citywide HDD/CDD factors with improved accuracy (computed from actual weather data, not estimated). Per-building regression not statistically meaningful with 2-3 data points.

Build both paths into a unified pipeline.

## Subtasks

### 1. NOAA HDD/CDD pipeline (`noaa_degree_days.py`)
**Build**: Script that fetches NYC monthly HDD (base 65°F) and CDD (base 65°F) from NOAA NCEI CDO API for 2022-2025.
- Use NOAA CDO API v2 with the Central Park station (USW00094728 or GHCND:USW00094728)
- Fetch monthly GHCND data: `TMAX`, `TMIN`, heating/cooling degree days if available, or compute from daily temps
- Compute: monthly HDD = Σ(max(0, 65 - (Tmax+Tmin)/2)), monthly CDD = Σ(max(0, (Tmax+Tmin)/2 - 65))
- Output: `public/noaa_degree_days.json` with monthly + annual HDD and CDD totals per year
- Support two modes: API fetch (requires NOAA_TOKEN env var) and a pre-seeded fallback

**Output file**: `noaa_degree_days.py`, `public/noaa_degree_days.json`
**Verification**: run the script, confirm JSON has valid HDD/CDD values for 2022, 2023, 2024

### 2. Per-building yearly regression for NYCHA developments (`building_weather_regression.py`)
**Build**: Script that performs the ConEd-style additive adjustment regression for each NYCHA development:
- Load monthly steam consumption from `steam-consumption.csv`
- Aggregate to annual totals (calendar year)
- Perform OLS regression: `steam ~ HDD + CDD` per development (3 years of data + 12 months each = ~36 data points)
- Extract β_HDD, β_CDD, intercept, R² per development
- Compute normalized consumption: `adjusted = actual + (NHDD − AHDD)×β_HDD + (NCDD − ACDD)×β_CDD`
- Write results to `public/building_regression_results.json`

**Output file**: `building_weather_regression.py`, `public/building_regression_results.json`
**Verification**: run script, confirm JSON has β_HDD, β_CDD, R² for each development

### 3. Decline trend acceleration (`decline_trend_analysis.py`)
**Build**: Script that computes second-difference decline acceleration from available steam data:
- For buildings with 3 years (22, 23, 24): `acceleration = (Δ24_23 − Δ23_22)`
- For buildings with 2 years (22, 23): first-difference only, acceleration = null
- Classification: accelerating decline (acceleration < −5%), steady decline (negative but stable), improving (positive)
- Uses normalized deltas from `yoy_deltas.json`
- Output: flags written as part of the enrichment update

**Output file**: `decline_trend_analysis.py` (sourced by the enrichment updater)
**Verification**: verify acceleration values are correctly computed and classified

### 4. Rule-based risk tiering + Uncertain tier update (`update_enrichment_risk.py`)
**Build**: Script that computes a combined risk tier from multiple diagnostic signals:
- **Current ML risk** (from GBM): ml_risk < 0.2 = Low, 0.2-0.6 = Medium, > 0.6 = High
- **Decline trend acceleration**: accelerating decline → +1 tier, improving → −1 tier
- **YoY outlier flag**: outlier in either period → +1 tier
- **LL97 penalty**: over_2024 or over_2030 → +1 tier
- **Uncertain tier**: buildings with < 2 years steam data OR R² < 0.3 (for NYCHA developments) → Uncertain
- Combined rule produces final `diagnostic_risk` field: "Low", "Medium", "High", "Uncertain"
- Update `ml_risk` field in `buildingEnrichment.json` with combined score
- Adds new fields: `diagnostic_risk`, `uncertain_reason`, `decline_acceleration`, `decline_trend_label`, `n_years_data`

**Output file**: `update_enrichment_risk.py`
**Verification**: run script, check that Uncertain buildings exist, check that acceleration flags are set

### 5. Update YoY analysis with proper NOAA HDD/CDD factors (`yoy_analysis.py` update)
**Build**: Modify `yoy_analysis.py` to:
- Load NOAA degree days from `public/noaa_degree_days.json`
- Compute proper normalization: `normalized = raw × (NHDD / AHDD)` where NHDD = normal-year HDD (30-year average) and AHDD = actual-year HDD
- Add CDD normalization: `normalized_cdd = raw / (1 + β_CDD × (ACDD − NCDD) / actual)` — more approximate for annual data
- Replace hardcoded `HDD_FACTOR` dict with computed factors

**Output file**: edited `yoy_analysis.py`
**Verification**: run the updated script, compare new normalization factors against old

### 6. Integrate into dashboard frontend (`useBuildings.js` update)
**Build**: Wire the new fields from `buildingEnrichment.json` into the frontend:
- Read `diagnostic_risk` and render the badge in the building detail panel
- Show decline acceleration label in the trend section
- Display Uncertain badge with reason tooltip

**Output file**: edited `src/components/*`
**Verification**: smoke test the dashboard with an Uncertain building selected

## Deliverables
| File Path | Description |
|-----------|-------------|
| `noaa_degree_days.py` | NOAA HDD/CDD data pipeline |
| `public/noaa_degree_days.json` | Computed HDD/CDD values |
| `building_weather_regression.py` | Per-building regression for NYCHA developments |
| `public/building_regression_results.json` | Regression results (β_HDD, β_CDD, R² per building) |
| `decline_trend_analysis.py` | Second-difference acceleration computation |
| `update_enrichment_risk.py` | Rule-based risk tiering + Uncertain tier updater |
| `yoy_analysis.py` (modified) | Uses NOAA-derived HDD/CDD factors |
| `buildingEnrichment.json` (updated) | New fields: diagnostic_risk, decline_acceleration, n_years_data, uncertain_reason |

## Evaluation Criteria
- NOAA HDD/CDD script produces valid values for 2022-2025 Central Park station
- Regression script produces R² values for NYCHA developments
- At least 10 buildings classified as "Uncertain" (buildings with < 2 years data)
- Decline acceleration computed for all buildings with 3 years of data
- Combined risk tier shows diversity across Low/Medium/High/Uncertain
- Dashboard renders the new fields without breaking existing functionality

## Notes
- NOAA API requires a free token from https://www.ncdc.noaa.gov/cdo-web/token — set as `NOAA_TOKEN` env var. Script has a hardcoded fallback with Central Park HDD values.
- The per-building regression uses monthly data from the 24 NYCHA developments only; the remaining 1,186 buildings use citywide factors derived from NOAA data
- Decline acceleration is computed from annual norm_deltas (not monthly), so it's a second-difference of normalized percentages
- All enrichment updates write to buildingEnrichment.json, which is what the frontend reads