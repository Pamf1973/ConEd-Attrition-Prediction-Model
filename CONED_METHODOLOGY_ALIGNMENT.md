# ConEd Methodology Alignment — Team Discussion Doc
**Date:** 2026-06-17
**Author:** Edwin (data viz / building panel) + analysis pass
**Audience:** Pursuit ConEd team (Ismael, Pedro, Edwin) + David (PM)
**Purpose:** Consolidate the ConEd feedback we have from Ildi and Johan, map it against what's actually in our build, and propose what to address before the next ConEd interaction.

---

## 0. Context from ConEd (set the framing before reading the gaps)

ConEd has been explicit that **they want us to do our own thing** and see what we come up with — they are not asking us to clone their internal early-warning system. Johan stated the goal directly: *"the focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier."*

What this means for us:
- We do **not** need to replicate their methodology end-to-end
- We **do** need to demonstrate that the **core of their approach — careful weather normalization of usage data so the signal we look at is clean — is present in our build**
- Where we diverge, the divergence should be a deliberate choice we can explain, not a gap we couldn't see

This document is a gap analysis against that bar.

---

## 1. What ConEd told us — two messages

### 1a. Ildi (high-level framing)

> Specifically looking at year-over-year changes in customer consumption, normalized for temperature. The team has data for approximately 1,200 customers below 96th Street in NYC, with four years of yearly consumption data. Ildi recommended identifying statistical outliers in consumption changes and relating these to temperature normalization, as significant deviations could indicate meaningful patterns or events.

### 1b. Johan (detailed methodology spec)

> We use each customer's historical billed usage and apply back-testing to develop an identification framework. Because weather is the primary driver of month-to-month usage variation, we first remove weather effects by calculating weather-normalized usage at the customer level. We do this by fitting a linear regression where the dependent variable is usage per billing day and the independent variables are actual heating degree days per billing day and actual cooling degree days per billing day. The regression yields an HDD slope, a CDD slope, and an intercept.
>
> We then translate deviations from normal degree days into usage … heating adjustment is based on (NHDD − AHDD) times the HDD slope, and cooling adjustment similarly … Finally, weather-normalized usage is computed as actual usage plus the heating and cooling adjustments.
>
> With weather-normalized usage in hand, we evaluate a set of diagnostic metrics (including rolling-window metrics), such as year-over-year percent variance in weather-normalized usage, current weather-normalized usage versus full-usage status, model fit (R²), HDD slope stability, synchronized changes between the HDD slope and intercept, and the decline trend (accelerating versus decelerating). Using these metrics and empirically calibrated thresholds, we label customers as high, medium, low, or uncertain risk before they actually stop using.

Johan is essentially giving us the recipe.

---

## 2. Where we are vs Ildi's framing

| Element | Ildi (ConEd) | Our build today |
|---|---|---|
| Customer set | ~1,200 below 96th Street | **1,210** below 90th Street |
| Years of yearly data | **4 years** | **3 years** (2022, 2023, 2024 — 2024 partial / `None` for many buildings) |
| YoY consumption deltas | Yes | Yes — `raw_delta_22_23`, `raw_delta_23_24` per building |
| Temperature normalization | Yes (per-customer) | Yes — citywide HDD multiplier only |
| Statistical outlier identification | Yes | **Yes — IQR 1.5× fences** (93 + 64 outlier buildings flagged) |
| Outliers surfaced in UI | (internal) | "Outliers Only" filter + yellow dots in YoY scatter |

**Net:** the YoY outlier layer is methodologically aligned. The weakness is the normalization method underneath it.

---

## 3. Where we are vs Johan's methodology spec

### 3a. Per-customer weather-normalized usage regression

> *"linear regression where the dependent variable is usage per billing day and the independent variables are actual HDD/CDD per billing day. The regression yields an HDD slope, a CDD slope, and an intercept."*

**Our build:** ❌ **Not implemented.**
- `yoy_analysis.py` uses a citywide `HDD_FACTOR` lookup applied uniformly to all 1,210 buildings:
  ```python
  HDD_FACTOR = {2022: 1.031, 2023: 1.227, 2024: 1.227}
  normalized = raw_steam × HDD_FACTOR[year]
  ```
- No per-building regression, no slopes, no intercept, **no CDD at all**

### 3b. Adjustments (heating / cooling / billing)

> *"heating adjustment = (NHDD − AHDD) × HDD slope … cooling adjustment similarly … billing adjustment = (reference billing days − actual billing days) × intercept … weather-normalized usage = actual + heating + cooling + billing adjustments"*

**Our build:** ❌ **Not implemented.**
- Multiplicative normalization instead of additive adjustment model
- No CDD adjustment
- No billing-day adjustment (we don't even have billing-period dates — LL84 is annual aggregates)

### 3c. Diagnostic metrics suite

| Metric | In our build? | Gap detail |
|---|---|---|
| YoY % variance in weather-normalized usage | ✅ Partial | `norm_delta_22_23`, `norm_delta_23_24` exist — but normalized via citywide multiplier, not per-customer regression |
| Current weather-normalized usage vs full-usage status | ❌ | No baseline "full-usage" reference computed per building |
| Model fit (R²) | ❌ | No regression fit, so no R² |
| HDD slope stability | ❌ | No slope exists |
| Synchronized changes between HDD slope and intercept | ❌ | No slope, no intercept |
| Decline trend (accelerating vs decelerating) | ❌ | We flag IQR outliers on individual periods; we don't compute trend curvature |

**Net: 1 of 6 diagnostic metrics partially present.**

### 3d. Risk labeling — High / Medium / Low / Uncertain via empirically calibrated thresholds

| Element | ConEd | Our build |
|---|---|---|
| Tier set | High / Medium / Low / Uncertain | ✅ Same tier vocabulary |
| Assignment method | Empirically calibrated thresholds on diagnostic metrics | ❌ Supervised Gradient Boosting probability (>0.70 = High, 0.40–0.70 = Medium, <0.40 = Low) |
| Uncertain meaning | Buildings where regression fit too poor to trust (low R²) | ❌ Live build has **0** buildings in Uncertain tier (smoke test confirmed) — README says 50, data says 0 |
| Transparency | Rule-based; the metric that tripped is the explanation | ⚠️ ML black box with SHAP post-hoc explanations |

---

## 4. The conceptual difference — why these two approaches *are* different things

These aren't two flavors of the same idea. They are two different epistemic stances.

### ConEd's approach: diagnostic / detective work

> Build a model of how *this specific customer* normally uses steam under any weather. Watch for deviations from that customer's own baseline. When several diagnostic signals fire together, label as risk.

Like medical diagnosis. Not "how does this patient compare to other patients" — "how does this patient compare to their own normal." When the model says *elevated R² instability + declining trend + slope-intercept divergence*, that's a diagnosis you can point at.

| Strengths | Weaknesses |
|---|---|
| Customer-specific | Needs long per-customer history to build a baseline |
| Transparent (labels carry the reason) | Misses external drivers (regulatory pressure, market-wide events) until they show up in usage |
| Naturally handles "I don't know" via low R² | Requires monthly / billing-period data — yearly is statistically thin |

### Our approach: classifier / pattern matcher

> Take public signals about all buildings. Train a model on the buildings that historically left steam. For each current building, ask: how similar are this building's signals to the historical leavers?

Like credit scoring. Not "this borrower's own behavior" — "how this borrower compares to past defaulters."

| Strengths | Weaknesses |
|---|---|
| Works from day one without per-customer history | Trained on a small sample (57 confirmed drops) |
| Captures external pressure (LL97, DOB permits, peer behavior) | Can't say "this customer's usage is anomalous for them" |
| Model inspectable via SHAP per-building drivers | Black box at the math layer |

### Where they meet

| ConEd's diagnostic approach catches | Our classifier catches |
|---|---|
| Customer-specific usage anomalies before they're externally visible | External pressure (LL97 fines, DOB permits) before usage drops |
| Customers whose own pattern is breaking down | Customers in market conditions historically correlated with departure |
| "This building is acting weird" | "Buildings like this one tend to leave" |

These are **complementary signals**, not competing models. The ideal early-warning system runs both and triangulates.

---

## 5. What we'd need to address — public-data feasibility

Element-by-element on what we could actually build without ConEd internal billing data:

| Gap | Public-data feasibility | Why |
|---|---|---|
| Per-building HDD/CDD/intercept regression at **billing-day** resolution | ❌ | Requires monthly consumption. LL84 publishes annual only. ENERGY STAR Portfolio Manager has monthly for ~20–30% of buildings (voluntary, mostly private). |
| Per-building HDD slope at **yearly** resolution | ⚠️ Possible but statistically thin | 3–4 years × 1–2 coefficients = 2–3 degrees of freedom. Marginal but legitimate if labeled clearly. |
| Heating adjustment formula | ✅ | NOAA NCEI publishes daily HDD/CDD for Central Park free. Normal HDD (30-year average) also public. |
| Cooling adjustment | ✅ | Same data source — we currently don't use it at all |
| Billing-day adjustment | ❌ | No billing dates in public data |
| YoY % variance in normalized usage | ✅ Already have | Swap normalization method when we upgrade it |
| Model fit (R²) per building | ⚠️ Yearly approximation | Low statistical power with 3–4 points but computable |
| HDD slope stability | ⚠️ Yearly approximation | Compare β_HDD across rolling windows — crude with yearly data |
| Synchronized slope-intercept changes | ⚠️ Yearly approximation | Same constraint |
| Decline trend acceleration | ✅ | Year-2 delta minus year-1 delta = second-difference signal |
| Rule-based labeling with empirical thresholds | ✅ | Just code — replaces ML probability cutoff with metric thresholds |
| Restore meaningful Uncertain tier | ✅ | Defined as R² < threshold OR < 3 years of data |

**Net:** with public data alone we can build a **crude version** of Johan's framework — yearly granularity instead of monthly, HDD-only at first (then CDD), statistically thin per-building regressions. Methodologically aligned, operationally weaker, honestly labeled.

---

## 6. Effort estimate — what it takes to converge

Order-of-magnitude estimate for a public-data implementation of Johan's framework, layered alongside our existing supervised ML model:

| Workstream | Effort | Output |
|---|---|---|
| NOAA HDD/CDD pipeline + 30-yr normals | 0.5 day | Daily / annual HDD + CDD for Central Park station |
| Per-building yearly regression + diagnostic metrics | 1 day | β_HDD, β_CDD, R², slope stability, decline acceleration persisted per building |
| Rule-based threshold calibration | 1 day | Empirical thresholds for High / Medium / Low / Uncertain |
| Uncertain tier restoration (R² < 0.5 OR < 3 yrs data) | 0.5 day | Brings live Uncertain count from 0 → meaningful population |
| BuildingPanel surfacing of diagnostic metrics | 1 day | R², β_HDD, decline trend visible per building |
| Dual-tier badge + "method" label in UI | 0.5 day | Show both ML and diagnostic tier when they disagree |
| Validation + reconciliation report | 1 day | Compare new diagnostic tiers against current ML tiers; flag disagreements |

**Total: ~5–6 focused days.** Doable before the next ConEd touchpoint if we decide to invest.

---

## 7. What we're missing in our current build — the punch list

Concrete items to discuss as a team:

1. **No per-building weather normalization** — citywide multiplier only. The core of what Ildi and Johan both flagged.
2. **No CDD anywhere** — we only normalize for heating. Misses cooling-load buildings (some hospitals, large commercial with absorption chillers).
3. **No diagnostic metrics framework** — we have 1 of Johan's 6 metrics, partially.
4. **Uncertain tier is empty in the live build** — README claims 50 buildings; data shows 0. Either a regression to investigate or a doc update to make.
5. **No transparent labeling** — current tier comes from an ML probability cutoff. ConEd's vocabulary is rule-based on diagnostic metrics; ours says "81% probability" with SHAP drivers underneath. Different conversation.
6. **3 years of data vs their 4** — LL84 publication lag. Worth noting in any ConEd communication so they know our window is one year shorter.
7. **No reference "full-usage" baseline per customer** — needed for "current vs full-usage status" metric.

---

## 8. Recommended actions for the team

Prioritized:

### Priority 1 — Address before next ConEd touchpoint

- **(a) Build the diagnostic framework with public-data approximations** (Section 6 estimate: ~5–6 days). Implement per-building yearly regression, the 6 diagnostic metrics (in their approximated forms), CDD inclusion, rule-based threshold labeling, and Uncertain tier restoration.
- **(b) Decide the framing for ConEd**: "Here is our public-data implementation of the core of your methodology, layered alongside our supervised ML model that captures external regulatory pressure." Two parallel scores per customer, both visible in the UI.

### Priority 2 — Fix existing drift discovered during smoke test (separate from methodology work)

- **(c) Update `SMOKE_TEST.md` password** — current value in the doc doesn't match `.env`.
- **(d) Reconcile README claims with live build** — README says 1,260 buildings (live is 1,210), AUC 0.645 (live run is 0.652), 50 Uncertain (live is 0). README needs a pass.
- **(e) Investigate Uncertain tier disappearance** — is it a regression in the pipeline (model now scoring buildings that previously couldn't be scored), or was it intentionally removed without updating docs? Either restore or update README.

### Priority 3 — Position our approach as complementary, not competing

- **(f) Frame the supervised ML model as a parallel signal** — not a replacement for ConEd's framework. Document explicitly that the two layers catch different things (see Section 4).
- **(g) Build the dual-tier UI** — when the diagnostic framework and the supervised classifier disagree, surface that as a flag for human review. That's the most defensible product story for ConEd: "we built two independent signals, here's where they agree, here's where they don't, that's where you should look."

### Priority 4 — Phase 2 readiness (post data-sharing agreement)

- **(h) Pipeline rewrite plan** — once monthly billing data arrives, the diagnostic framework upgrades from yearly approximation to billing-day resolution. Sketch the migration before the data lands so we can move fast.

---

## 9. Open questions for team discussion

1. Do we invest the ~5–6 days on the diagnostic framework now, or hold for the data-sharing agreement and ship cleanly later?
2. If we build it, do we run both scoring methods in parallel in the UI, or pick one as primary?
3. How do we frame our position with ConEd on the next call — "here is your methodology in our build" vs "here are two complementary signals"?
4. Who owns this work? The framework spans pipeline (Ismael's territory) and UI surfacing (Edwin / Pedro).
5. Do we want to fix the existing drift (SMOKE_TEST password, README counts, Uncertain tier) before or as part of the methodology work?

---

*This document is local-only — not pushed to the repo. Living draft for team discussion.*
