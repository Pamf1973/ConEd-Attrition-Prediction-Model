# Phase 1 — NOAA HDD/CDD Pipeline
**Owner:** TBD  
**Effort:** ~0.5 day  
**Prereq:** None — standalone Python script

---

## Goal

Replace the citywide `HDD_FACTOR` lookup in `yoy_analysis.py` with per-building actual heating/cooling degree-day data from NOAA, enabling proper additive weather adjustment per the Johan spec.

---

## What We Need From NOAA

| Dataset | Source | What to Pull |
|---|---|---|
| Daily HDD + CDD, 2021–2024 | NOAA NCEI (Central Park station: USC00305801 or GHCND:USW00094728) | Annual totals per calendar year |
| 30-year normal HDD + CDD | NOAA 1991–2020 Climate Normals | Single "normal year" reference |

All free via NOAA NCEI API (no key needed for standard access, or free NCEI token).

---

## Implementation Steps

### 1. `fetch_noaa_hdd.py`

```python
# Hits NOAA NCEI CDO API for Central Park daily temps
# Station: GHCND:USW00094728 (Central Park, NY)
# Pulls TMAX, TMIN for 2021-01-01 to 2024-12-31
# Computes daily HDD = max(0, 65 - avg_temp), CDD = max(0, avg_temp - 65)
# Aggregates to annual totals
# Writes: public/hdd_cdd_annual.json
#   { "2022": {"ahdd": 4312, "acdd": 1204},
#     "2023": {"ahdd": 3950, "acdd": 1387},
#     "2024": {"ahdd": 4100, "acdd": 1290},
#     "normal": {"nhdd": 4490, "ncdd": 1150} }  ← 30-yr normals
```

**Output file:** `public/hdd_cdd_annual.json`

### 2. Update `yoy_analysis.py`

Replace:
```python
HDD_FACTOR = {2022: 1.031, 2023: 1.227, 2024: 1.227}
normalized = raw_steam * HDD_FACTOR[year]
```

With: load `hdd_cdd_annual.json` and use AHDD/NHDD ratio for normalization.  
For now keep multiplicative form; Phase 2 adds the full additive model.

```python
# Interim: ratio-based using real NOAA values instead of hardcoded estimates
norm_factor[year] = NHDD / AHDD[year]
```

### 3. Add CDD to the model (even citywide)

Currently: zero CDD contribution. In NYC, summer cooling loads affect steam via absorption chillers in some buildings. Add `CDD_FACTOR` alongside `HDD_FACTOR`.

---

## Output

`public/hdd_cdd_annual.json` with actual HDD/CDD per year + 30-yr normals.  
`yoy_analysis.py` updated to use real NOAA data instead of hardcoded estimates.  
`public/yoy_deltas.json` regenerated with real-data normalization.

---

## Acceptance Check

```bash
python3 fetch_noaa_hdd.py  # writes hdd_cdd_annual.json
python3 yoy_analysis.py    # reads it, rewrites yoy_deltas.json
# yoy_summary.json should show updated hdd_factors with real values
```
