# Driftwatch — Blackstone Build State
**Logged:** 2026-06-23
**Purpose:** Snapshot of the model and build as of the Blackstone presentation. What we uncovered in the pre-presentation analysis session, what was working, and what needs to improve for a more accurate and effective model.

---

## What the model actually is

Driftwatch is a two-layer system:

1. **K-means clustering** segments 1,210 NYC buildings (LL84 energy benchmarking enrollees that are also ConEd steam customers) into 5 archetypes based on building profile features.
2. **Gradient Boosting Classifier (GBM)** scores each building's probability of steam attrition — defined as a large, sustained decline in steam consumption.

The model was trained entirely on public data: LL84 benchmarking filings, DOB permit records, ACRIS deed transfers, PLUTO property data, and LL97 penalty estimates. No ConEd billing data was used.

---

## The two-number problem (know this cold)

There are two separate risk fields in the system. They are on different scales and produce nearly different lists.

| Field | Where it lives | What it is | Range |
|---|---|---|---|
| `risk` | `buildings.json` | Rescaled/calibrated transformation of the raw GBM output. **This is what the dashboard displays.** | 0.703 – 0.816 for High tier |
| `ml_risk` | `buildingEnrichment.json` | Raw GBM probability from `ll97_model.py`. Not shown in the UI. | 0.0005 – 0.992 |

**Why this matters:** Almost every "high 90s" number cited in working notes and the CSV exports refers to `ml_risk`. The dashboard's displayed `risk` field tops out at 81.6%. The two fields identify almost completely different buildings — only 1 building is in the High tier on both systems simultaneously.

---

## The 52 vs 59 discrepancy

The presentation script said "59 high-risk buildings." The live dashboard shows 52.

**Root cause:** The CSV export `coned-attrition-risk.csv` was labeled "Attrition Score" and used `ml_risk` as the score column. At an `ml_risk` threshold of 0.7, that produces 59 buildings. The dashboard applies the 0.7 threshold to the `risk` field, which produces 52.

**What to say:** 52. That matches what ConEd will see on screen during the demo. The 59 figure is from a different scoring system and can't be defended live without explaining the two-field distinction first.

---

## Current score distribution (dashboard `risk` field)

| Tier | Threshold | Count | % of portfolio |
|---|---|---|---|
| High | > 70% | **52** | 4.3% |
| Medium | 40–70% | **941** | 77.8% |
| Low | ≤ 40% | **217** | 17.9% |
| **Total** | | **1,210** | |

The 941-building Medium tier is too large to be an actionable outreach list. Rank-based targeting (top N by score) is more defensible than tier-based for that majority band.

---

## What the 52 high-risk buildings actually are

79% of the 52 High-tier buildings (41 of 52) are **multifamily residential** — luxury and post-war condos and co-ops. Examples: 432 Park Avenue, 15 Central Park West, 1 Central Park South, 56 Leonard Street.

The remaining 11: 5 offices, 2 K-12 schools, 1 retail, 1 hotel, 1 senior living community, and 1 hospital.

**The hospital (1283 York Avenue) is the single largest revenue building** in the High tier at an estimated $3.16M/year. It is either the model's most important true positive or its most important false positive. Worth flagging to David before the presentation.

**Why the multifamily concentration is defensible:** These are not stuck buildings. Luxury residential boards have capital. Post-war boilers are approaching end-of-life. LL97 2030 penalties are large enough to make the conversion math work. This is exactly the cohort you'd expect to convert.

---

## Training label (what "at risk" actually means in this model)

Positive class (y=1): **54 buildings with a "big_drop" signal** — defined as a ≥50% year-over-year decline in steam consumption in LL84 benchmarking data.

Negative class (y=0): **949 buildings with no steam signal** — stable or no measured decline.

Excluded from training: **207 "mod_drop" buildings** (partial signal, ambiguous — excluded to keep the training distinction clean).

The label source (`steam_signal_ord`) is explicitly excluded from the GBM feature set to avoid circularity. The 8 features the model uses are independent public signals: building age, floor area, Energy Star score, LL97 penalty exposure, DOB HVAC job count, peer score, HDD normalization ratio, and cluster assignment.

**What this means for the presentation:** When the model flags a building at high probability, it's saying: "This building's public footprint looks like the 54 buildings that already showed a 50%+ steam demand drop in LL84 data." It is not a real-time disconnect signal — it's a pattern match to late-stage churners as observed in annual benchmarking.

---

## The five building archetypes (k-means clustering)

| Cluster | Count | What it signals |
|---|---|---|
| Pre-War Active — Permit-Driven Churn | 269 | Old buildings actively filing HVAC permits. Physical conversion work already in DOB records. Highest urgency. |
| Large Commercial — Capital Mobilized | 263 | Big footprint, capital available, LL97 2030 penalty large enough to justify conversion math. |
| Low-Compliance Commercial — Quiet Attrition | 247 | Low Energy Star, under-compliant, drifting without visible permit activity. Harder to catch early. |
| Pre-War Stable — Low Signal | 242 | Old building profile but no detected drift signal. Monitor, don't prioritize. |
| Mid-Size Post-War — Moderate Signal | 189 | Medium everything — moderate penalty, moderate risk. Accounts for 40 of the 52 High-tier buildings. |

---

## Financial grounding

### Revenue at stake from the 52 High buildings

LL84 reports steam consumption in kBtu/year. ConEd bills in Mlb (thousand pounds of steam). Conversion: 1 kBtu approximately 1 lb of steam (latent heat approximation; real error range ±5–10%).

ConEd's SC-2 tariff runs approximately $24–28/Mlb all-in. Using $26/Mlb as midpoint:

| Metric | Value |
|---|---|
| 52 High-tier buildings | ~$26.8M/yr in estimated steam revenue |
| Safe range to cite | $24.8M–$28.9M/yr |
| What to say for Blackstone | "roughly $25 million per year" (conservative, defensible) |
| Median steam customer | ~$195,000/yr |
| Portfolio average | ~$430,000/yr (skewed high — LL84 only covers buildings above 25,000 sq ft) |
| ConEd's own published average | ~$294,000/yr across ~1,700 customers |

**Do not say "$27M" as a point estimate** without being prepared to defend the tariff assumption. The $24.8M–$28.9M range is more honest and still lands hard.

### Lifetime value argument

At a 7% discount rate over 20 years, $195K/yr = approximately $2 million in lifetime revenue per median building. This is the sharpest financial argument for an investor audience — they think in NPV.

### The overproduction mechanism (David's framing)

When a steam customer drops without warning, ConEd has already committed fuel to produce steam for that building. That steam is wasted. The forecast model runs on historical baselines that don't account for attrition in progress, so each surprise disconnection compounds the error in future cycles. In a regulated utility, that overspend eventually passes to rate payers. This is why the problem has a public-interest dimension, not just a revenue dimension.

---

## Model performance — honest assessment

| Dimension | Grade | Notes |
|---|---|---|
| Feature selection | B+ | Solid hypotheses, reasonable signal weights |
| Label quality | C | ≥50% drop catches late-stage churners, not early warning |
| Model performance | C+ | AUC 0.645 — weak ranking signal, floor of "useful" |
| Validation rigor | C | Cross-validated but no external ground truth |
| Methodology vs. ConEd internal | C− | Structurally constrained by public data |
| Honesty about limitations | A− | Framing is genuinely candid |

**AUC 0.645** means the model ranks a truly at-risk building above a stable one about two times out of three when comparing a random pair. Weak for a precision classifier. Useful as a prioritized outreach ranking.

**For the room:** "We're not saying they will disconnect. We're saying their public footprint looks the same as buildings that already did."

---

## What needs to improve for an accurate, effective model

### Label quality (biggest lever)

Current positive class = buildings that already showed a 50%+ LL84 steam drop — a late-stage signal observed 1–2 years after the physical conversion decision was made. Real early warning requires:

- **Actual disconnect records from ConEd** with precise dates
- This would let us label buildings at the point of commitment, not after the annual benchmarking catches the drop
- Expected AUC improvement: from ~0.645 toward 0.75–0.85 with real labels

### Weather normalization (per-customer)

Current system uses one citywide HDD ratio for all 1,210 buildings. This introduces noise: a building that heated less one winter might show a "drop" that's just a warmer season, not attrition.

ConEd billing data would allow a per-customer linear regression: HDD slope + CDD slope + intercept per building. This is standard energy regression practice and would dramatically reduce false signals.

### Monthly resolution vs. annual

LL84 is an annual disclosure. ConEd catches billing drift in real time. Moving to per-customer monthly billing data would let the model detect a trend in months, not years.

### Missing features

- **CDD (cooling degree days)** normalization: steam absorption chillers matter for commercial buildings. Currently ignored.
- **Occupancy data**: vacancy changes drive demand changes but aren't visible in public records.
- **Actual tariff class per building**: current model estimates SC class from building profile. ConEd knows the actual class. SC-5 customers (negotiated, high volume, active permits) deserve separate attention.
- **Peer attrition in the same cluster**: if two pre-war co-ops in the same neighborhood converted last year, the third is more likely to follow. This network effect isn't in the current model.

### Validation gap

Currently unanswerable: "Of the 52 High buildings Driftwatch flags, how many actually disconnected in the next 12 months?" Without ConEd disconnect records, there is no ground truth to measure against. This is the most important gap for a production deployment.

---

## Phase 2 — what ConEd data unlocks

| Capability | Current (Phase 1) | With ConEd data (Phase 2) |
|---|---|---|
| Weather normalization | One citywide HDD ratio | Per-customer HDD + CDD regression |
| Temporal resolution | Annual LL84 filing | Month-over-month billing trend |
| Training labels | 54 LL84 big-drop proxies | Real disconnect records with exact dates |
| Precision measurement | Not measurable | Calculable against verified disconnections |
| Forecast error signal | Estimated from LL84 | Derived from actual billing variance |

The architecture doesn't change. Clustering, GBM, SHAP explanations, building panel — same structure. The training data and weather normalization get dramatically richer.

---

## Three fixes needed before the Blackstone demo

1. **Reconcile "59 vs 52"** — presentation script still says 59; update to 52 (matches what's on screen during demo).
2. **Explain `ml_risk` vs `risk` if asked** — the building panel doesn't surface `ml_risk`; have a crisp one-sentence answer for why displayed scores top out at 81.6% if ConEd sees a different number elsewhere.
3. **Confirm the hospital (1283 York Avenue)** with David before presenting — it's the largest revenue building in the High tier and either the best true positive or the most consequential false positive.

---

## What this build demonstrates to ConEd

On public data alone, before any billing access:

- 1,210 steam customers segmented into five meaningfully different risk archetypes
- A scoring model that ranks at-risk buildings correctly about two times out of three
- Per-building SHAP explanations showing which factors are driving the score
- A dashboard that lets account managers filter, sort, and investigate individual buildings
- A financial grounding ($25M+/yr) that makes the retention argument concrete

The value proposition is not "this model is precise." It is: "With your billing data, we can make this precise. This is what we built in the time we had. Here is what it becomes once you open the door."
