# Driftwatch — Pattern Recognition Findings & Presentation Defense

**Last updated:** 2026-06-22
**Purpose:** Pre-presentation analysis of model scores, distribution anomalies, and the public-data → ConEd data bridge argument. For Edwin's use; lives outside team repo.

---

## The two numbers in the system (know this cold)

There are two separate risk fields in the data. Confusing them under pressure is a real risk.

| Field | Where it lives | What it is | Range in current data |
|---|---|---|---|
| `risk` | `buildings.json` | Rescaled / calibrated transformation of the GBM output. This is what the dashboard displays. | 0.703 – 0.816 for High tier |
| `ml_risk` | `buildingEnrichment.json` | Raw GBM probability from `ll97_model.py`. Not currently displayed in the UI. | 0.0005 – 0.992 |

When you say "high 90s percentage score" — that's `ml_risk`. The top 60 buildings by raw GBM probability score 99.2%, 99.1%, 99.0% and so on. The dashboard doesn't surface these directly; the displayed `risk` field tops out at 81.6%.

---

## Current score distribution

| Tier | Threshold | Count | % of portfolio |
|---|---|---|---|
| High | > 70% | **52** | 4.3% |
| Medium | 40–70% | **941** | 77.8% |
| Low | ≤ 40% | **217** | 17.9% |
| **Total** | | **1,210** | |

### Two flags to address before presenting

**1. Presentation script says "59 high-risk buildings" — current data shows 52.**
The discrepancy likely stems from the `recommendedAction` boundary shift (0.5 → 0.4) in commit `222b89f`. Either update the script to 52, or anchor on `ml_risk > 0.5` which gives 60 buildings — the closer number.

**2. The old notes described a K-shape: 60 high / 9 medium / 1191 low. That's gone.**
Current distribution is nearly inverted — 77.8% of buildings land in Medium. This happened during the threshold + model updates in commit `222b89f`. Know which version ConEd saw previously, if any. The Medium blob at 941 buildings is too large to be an actionable outreach list — rank-based targeting (top N by score) is more defensible than tier-based for that majority band.

---

## The `ml_risk` vs `risk` divergence (critical to understand)

The raw GBM model says 60 buildings have **greater than 50% probability of churning**. Of those 60, **59 have a displayed `risk` below the 0.7 High threshold** — they show up as Medium in the dashboard, not High.

This is the `risk` ≠ `ml_risk` problem from the working notes, now quantified. The two fields are on completely different scales. If ConEd asks why a building with 98% `ml_risk` shows as Medium risk in the UI, have an answer ready.

**Sample high `ml_risk` buildings not in the High display tier:**

| Address | ml_risk | Cluster | LL97 2030 penalty |
|---|---|---|---|
| 415 E 68 ST | 99.2% | Pre-War Active — Permit-Driven Churn | $5,040,190 |
| 17 WEST 54TH STREET | 99.1% | Pre-War Active — Permit-Driven Churn | $322,484 |
| 115 EAST 57 STREET | 99.0% | Low-Compliance Commercial — Quiet Attrition | $319,041 |
| 200 EAST 42ND ST. | 98.9% | Low-Compliance Commercial — Quiet Attrition | $1,190,650 |
| 165 WEST END AVE. | 98.9% | Pre-War Active — Permit-Driven Churn | $155,200 |
| 660 MADISON AVE. | 98.9% | Pre-War Active — Permit-Driven Churn | $583,822 |
| 31 W 34 ST | 98.1% | Pre-War Active — Permit-Driven Churn | $17,277,958 |

---

## Defending the high-risk `ml_risk` figures

The 60 buildings with `ml_risk` > 50% are dominated by **Pre-War Active — Permit-Driven Churn** (the largest cluster among them). The pattern the model detected:

- Old buildings with active HVAC permit filings (boiler replacement, conversion work already in DOB records — public record of physical work in progress)
- Low or declining Energy Star scores
- Measurable steam demand drops in LL84 benchmarking
- LL97 2030 penalty exposure creating financial pressure to switch

The DOB permit signal is not a model artifact — it's observable physical work. That's the core defensible claim.

**Framing for the room:**

> "The raw GBM assigns 60 buildings a probability above 50%. These are buildings where the combination of age, Energy Star score, LL97 2030 penalty exposure, HVAC permit filings, and peer attrition all line up in the same direction as the 54 buildings we trained on that already showed confirmed large steam drops. We're not saying they will disconnect — we're saying their public footprint looks the same as buildings that already did. AUC 0.645 means we get the ranking right about two times in three. Weak for a precision classifier; useful for a prioritized outreach list."

---

## The cluster archetypes are the pattern recognition story

The **k-means clustering** is the methodology finding ConEd wants to hear about. You discovered from public data alone that these 1,210 buildings are not one homogeneous population. Five meaningfully different archetypes:

| Cluster | Count | What it means |
|---|---|---|
| Pre-War Active — Permit-Driven Churn | 269 | Old buildings actively filing HVAC permits. Physical conversion work already in progress. Highest urgency. |
| Large Commercial — Capital Mobilized | 263 | Big footprint, capital available, LL97 2030 penalty large enough to justify conversion math. |
| Low-Compliance Commercial — Quiet Attrition | 247 | Low Energy Star, under-compliant, drifting without visible permit activity. Harder to catch early. |
| Pre-War Stable — Low Signal | 242 | Old building profile but no detected drift signal. Monitor, don't prioritize. |
| Mid-Size Post-War — Moderate Signal | 189 | Medium everything — moderate penalty, moderate risk, the most common High-tier building in current data (40 of 52 High buildings). |

**The key insight:** A pre-war co-op on the Upper East Side is drifting for completely different reasons than a midtown office tower. Lumping them together hides the signal. The archetype lens lets account managers bring the right conversation to the right customer.

---

## Closing the gap: public data → ConEd billing data

### What Phase 1 (public data) gives us

- Annual LL84 benchmarking: once a year, self-reported, 2022/2023/2024 coverage
- DOB permit filings: work already started (a lagging signal, but observable)
- ACRIS deed transfers: ownership changes already recorded
- Energy Star scores and LL97 penalty estimates
- Citywide HDD normalization: one ratio for all of Manhattan (crude, but documented)

### What Phase 2 (ConEd billing data) unlocks

| Capability | Why it matters |
|---|---|
| Per-customer monthly billing | Run per-customer linear regression: HDD slope + CDD slope + intercept per building. Currently one citywide ratio. |
| Month-over-month trend detection | ConEd catches drift before annual LL84 filing ever appears. We catch it a year later. |
| Real disconnect records as training labels | Our current positive class (≥50% LL84 drop) fires after the building largely left. Real disconnect dates give us the earlier signal. |
| True precision/recall measurement | With disconnect records: "of 52 High buildings flagged, how many actually disconnected in 12 months?" Currently unanswerable. |
| CDD normalization | Steam absorption chillers matter for commercial buildings. Currently ignored. |

### The bridge framing for ConEd

> "Phase 1 is external screening — reading the building's public footprint before any bloodwork. Phase 2 folds in the bloodwork: ConEd's billing records let us fit a per-customer weather model, catch month-level drift instead of year-level, and calibrate our scores against verified disconnections. The architecture doesn't change — clustering, GBM classifier, SHAP explanations, building panel. The training data and weather normalization get dramatically richer. We expect AUC to climb from 0.645 toward 0.75–0.85 once we're training on real disconnect labels rather than LL84 proxy drops."

---

## Model scorecard (honest, keep internal)

| Dimension | Grade | Notes |
|---|---|---|
| Feature selection | B+ | Solid hypotheses, reasonable weights |
| Label quality | C | ≥50% drop catches late-stage churners, not early warning |
| Model performance | C+ | AUC 0.645 — weak ranking signal, floor of "useful" |
| Validation rigor | C | Cross-validated but no external ground truth |
| Methodology vs. ConEd internal | C− | Structurally constrained by public data |
| Code transparency | C+ | `ll97_model.py` now in repo; `risk` vs `ml_risk` still undocumented in UI |
| Honesty about limitations | A− | Framing is genuinely candid |

**Overall positioning:** Weak-but-defensible as a ranking aid for prioritized outreach. Not a precision classifier.

---

## Financial grounding — what one steam contract is worth

### The method

LL84 reports steam consumption in **kBtu/year**. ConEd bills in **Mlb (thousand pounds of steam)**. Conversion: 1 lb steam ≈ 1,000 BTU latent heat, so 1 kBtu ≈ 1 lb, meaning `kBtu / 1,000 ≈ Mlb`. ConEd's published SC-2 tariff (large commercial annual power, the dominant class for this portfolio) runs approximately **$24–28/Mlb** all-in including commodity, demand, and fixed charges. Using $26/Mlb as a midpoint estimate produces the following:

| Metric | Value |
|---|---|
| Median steam customer (LL84 data) | 7,498 Mlb/yr |
| **Estimated annual revenue, median building** | **~$195,000/yr** |
| Average across our 1,210-building portfolio | ~$430,000/yr |
| ConEd total steam revenue (public annual report) | ~$500M/yr from ~1,700 customers → ~$294K avg per customer |
| **52 high-risk buildings (displayed tier)** | **~$26.8M/yr in steam revenue at risk** |
| 60 GBM-flagged buildings (ml_risk > 50%) | ~$65M/yr in steam revenue at risk |

Our LL84 portfolio skews larger than ConEd's full 1,700-customer base (LL84 only requires benchmarking above a size threshold), which is why our average is higher than the ConEd-wide average.

### Caveats to know before you say the number out loud

- **Conversion is approximate.** 1 kBtu ≈ 1 lb of steam is the saturated-steam latent-heat approximation. Real conversion varies by steam pressure and temperature. Error range: ±5–10%.
- **$26/Mlb is a rough tariff midpoint.** SC-3 (residential) runs slightly higher; SC-5 (negotiated large commercial) may be lower. We don't know each building's actual tariff code — the CSV export marks them all as estimated (`*`).
- **Revenue ≠ margin.** ConEd's generation and distribution costs mean not all of this flows to the bottom line. The revenue number is the right framing for a retention argument ("this much stops coming in the door"), not a profit argument.
- **These are single-year figures.** A steam customer that disconnects is gone for the lifetime of their HVAC replacement — typically 15–25 years. The true NPV of one lost customer at $195K/yr over 20 years at a 7% discount rate is **roughly $2 million in lifetime revenue per median building.**

### The one-sentence version for the presentation

> "The median steam customer in our dataset represents approximately $195,000 in annual revenue. The 52 buildings Driftwatch flags as high-risk account for an estimated $27 million per year — and a disconnection isn't a one-year loss, it's a 20-year loss."

Or shorter, if you need a single anchor:

> "One retained steam contract is worth roughly $200K a year. If Driftwatch helps retain five, it pays for itself many times over."

### SC class distribution across the portfolio (estimated from public data)

| SC Class | Estimated count | Profile |
|---|---|---|
| SC-1 (Small commercial) | 292 | Low steam demand, simple rate |
| SC-2 (Large commercial / annual power) | 140 | Year-round demand, no backup signals |
| SC-3 (Residential multifamily) | 429 | Largest segment — co-ops, rentals |
| SC-4 (Dual-supply / backup) | 307 | Has backup infrastructure installed |
| SC-5 (Negotiated — large + active permits) | 42 | Highest conversion risk; already mobilizing |

SC-5 buildings are worth calling out specifically: they have both the steam volume and the active permit activity (≥2 DOB HVAC jobs) to justify ConEd's senior account attention.

---

## Three things to fix before presenting

1. **Reconcile "59 vs 52" high-risk count** — check which commit changed it; update presentation script or anchor on `ml_risk > 0.5` (60 buildings).
2. **Decide how to talk about `ml_risk`** — it has buildings in the 90s and is in the enrichment JSON. Either surface it in the panel or have a crisp explanation of the scaling difference.
3. **Address the medium-risk blob** — 941 buildings in Medium is not a usable outreach list. Frame rank-based targeting (top N) as the practical workflow, not tier-based.
