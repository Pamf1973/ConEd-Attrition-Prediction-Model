# Phase 3 — UI: Dual-Tier Badge + Diagnostic Panel
**Owner:** TBD (frontend — Edwin's domain)  
**Effort:** ~1.5 days  
**Prereq:** Phase 2 data in buildingEnrichment.json

---

## Goal

Surface the new `diagnostic_tier` alongside the existing ML `cluster_risk` in the UI. When they agree, show one badge. When they disagree, show both with a "conflicting signals" indicator — which is itself informative.

---

## New UI Components

### 1. Dual-Tier Badge (BuildingPanel + Table)

Current: single colored pill from `cluster_risk` (K-means archetype label).  
New: two pills when diagnostic tier ≠ cluster tier.

```
[ ML: High ]  [ Diagnostic: Uncertain ]  ← conflicting — flag it
[ ML: High ]  [ Diagnostic: High ]        ← agreement — show one pill
```

Color coding:
- High: red
- Medium: amber  
- Low: green
- Uncertain: gray with question mark icon

### 2. BuildingPanel — Diagnostics Section

New collapsible section "Weather Regression" below the existing risk section:

```
┌─────────────────────────────────────────────────────┐
│  Weather Regression  [annual resolution — 3 pts]    │
│                                                     │
│  R²: 0.72  ·  β_HDD: 142.3  ·  β_CDD: -18.1       │
│  Decline trend: ACCELERATING  (-8.4%/yr²)           │
│  Slope-intercept sync: YES                          │
│                                                     │
│  ⚠ Diagnostic tier: HIGH                            │
│  (3 of 4 signals fired)                             │
└─────────────────────────────────────────────────────┘
```

Show `data_thin` or `r_squared_low` warnings inline.

### 3. YoY Scatter — Trend Coloring

Current: dots colored by cluster_risk.  
New: option to color by `diagnostic_tier` or `decline_class` (accelerating / decelerating / stable).

Add radio toggle:
```
Color by: [ML Risk]  [Diagnostic Tier]  [Decline Trend]
```

### 4. Filter Panel — Add Diagnostic Tier Filter

Existing: filter by cluster, risk tier, outlier-only.  
New: add "Diagnostic Tier" multi-select (High / Medium / Low / Uncertain).

### 5. Uncertain Tier Count in Summary Banner

Current banner shows "High: 58 | Med: 5 | Low: 1147" from ML risk.  
Add diagnostic banner row: "High: X | Med: X | Low: X | Uncertain: X (low R²)".

---

## Data Wiring

The enrichment record already reaches the frontend via `/api/data/enrichment`.  
New fields to read client-side:
- `diagnostic_tier`
- `r_squared`
- `beta_hdd`
- `decline_class`
- `trend_acceleration`
- `data_thin`
- `r_squared_low`

No API changes needed — just extend what `useBuildings.js` consumes from the enrichment merge.

---

## What "Conflicting Signals" Means — ConEd Talking Point

When ML says High but Diagnostic says Low (or vice versa):
- ML High + Diagnostic Low: External pressure (LL97 fines, permits) without usage anomaly yet. Classic early-warning case.
- ML Low + Diagnostic High: Usage anomalies not captured by building-level external signals. Customer-specific behavioral change.
- Both High: Strong signal. Highest confidence.
- Either Uncertain: Model doesn't trust its own output for this building — flag for manual review.

This is the "complementary signals" argument from the doc (Section 4) made visible in the UI.

---

## Acceptance Check

- BuildingPanel shows regression section for buildings with diagnostic data
- Dual badge visible when tiers disagree
- Uncertain buildings visible in filter and counted in summary
- `data_thin` / `r_squared_low` warnings render correctly
- Scatter plot tier toggle works without breaking existing ML-risk coloring
