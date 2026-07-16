# Threshold-Proximity Cohort — Feature Exploration Notes

Personal scratchpad for the threshold-proximity feasibility spike. Lives outside the team repo. Companion to the main `docs/notes/2026-06-03_working-notes.md`. Last updated 2026-06-04.

---

## Origin & concept

**The idea (from the cohort-rework discussion):** group buildings by how close they are to the point where conversion economics flip, where that proximity is a composite of (a) LL97 penalty ramp position — how steep their compliance cost curve is getting — and (b) repair-pressure proxy from DOB — frequency and type of patching activity suggesting equipment near end-of-life. A building near the flip point on *both* axes is the most likely to convert.

**Why this is conceptually different from existing peer / portfolio cohorts:**

- `peer_score` (geographic) groups by physical proximity — assumes neighbors influence each other
- `owner_portfolio` (proposed) groups by ownership — assumes shared decision-maker drives shared decisions
- **Threshold-proximity groups by decision-economics co-location** — assumes buildings facing similar conversion math will arrive at similar conclusions, regardless of geography or ownership

**What we were trying to discover:** does a sensible cohort of high-pressure, low-activity buildings actually exist in our data, and is it meaningfully different from what the existing model already flags?

**Status going into the spike:** the concept had not been mentioned anywhere in the repo, documentation, or wireframes. We confirmed this via grep across `threshold`, `proximity`, `cohort`, `economics`, `payback`, `breakeven`, `crossover`, `tipping`, `flip`, `repair pressure`, `aging boiler`, `maintenance cost`, `capex`. Zero substantive hits. This was net-new ground.

---

## Iteration 1 — Initial feasibility check

### What we built

Single file: `analysis/threshold_proximity_spike.py`. Reads only `public/buildings.json` and `public/buildingEnrichment.json`. Writes only into `analysis/`. Branch: `spike/threshold-proximity` (no merge).

Design:
- **Step 0:** Verify the address join works, since enrichment has no BBL and buildings.json addresses are messy/mixed-case/mixed-ordinal-style
- **Step 1:** Conversion Pressure Score (CPS) with three percentile-normalized components: penalty_intensity (pen2030/sqft), penalty_acceleration (pen2030 − pen2024), equipment_age (current_year − yr). Explicit named weights: 0.4/0.4/0.2
- **Step 2:** Action stage from `dob_jobs`, percentile-rank normalized
- **Step 3:** Cohort = top quartile CPS × bottom quartile action_stage
- **Step 4:** Verdict including overlap with existing risk field

Initial defaults: top-25% CPS, bottom-25% action_stage, normalization via percentile rank (chosen over min-max because penalty fields are right-skewed and min-max would compress 90%+ of the portfolio to near zero).

### What we found

**Step 0 — Join:** 100% match rate (1,260 / 1,260). Address normalization (uppercase + numeric-ordinal → spelled-out + AVE/AVENUE / ST/STREET / BLVD/BOULEVARD etc.) was sufficient. Discovered enrichment has no BBL field, so address was the only viable join key. 6 normalized-key collisions flagged for later investigation.

**Step 1 — CPS distribution:** mean 0.500, median 0.519, range 0.121–0.982. Spread is broad and roughly symmetric — no K-shape, no degenerate clustering. The three-component composite produced a workable continuous distribution.

**Step 2 — Action stage:** raw `dob_jobs` median = 8, p75 = 23, max = 427. Heavily right-skewed with a long tail of frequent filers (likely big institutional campuses).

**Step 3 — Cohort:** 150 buildings (~12% of portfolio).

**Step 4 — Sanity check on top 15:** mostly pre-war buildings (1878–1917) — old hospitals (101 East 77th St, 1894), Columbia University area ("116 Street", 1910), Fifth Avenue residences (1000 5th Ave, 1878), pre-war Wall Street (11 Wall St, 1904), pre-war commercial (530 W57th St, 1937).

**Overlap with existing High tier (risk > 0.7, n=55):**
- Intersection with our 150-building cohort: 10
- 140 of 150 are NEW (93.3%) — exactly the "catching what the existing model misses" outcome the concept predicted

### Direct answers to iteration-1 asks

| Ask | Answer |
|---|---|
| Match rate ≥ 85%? | 100.0% — clean |
| BBL available in enrichment? | No — address-only join |
| Cohort size in the "tens" range? | 150 — wider than hoped, but workable |
| Top 15 look plausible? | Yes — pre-war institutional buildings with big LL97 ramps |
| Disjoint from existing model? | 93.3% NEW |
| Signal worth building into a feature? | Yes, with major caveats (see below) |

### Discoveries (beyond the asks)

- **Orphan enrichment fields:** the value-fields list includes `boiler_fuel`, `deed_amt`, `deed_date`, `hdd_pct`, `portfolio_score`, `signal` — not all documented in the spec
- **43 enrichment keys with no buildings.json match** — all appear to be above 96th Street (Columbia / Harlem residential), residual from a broader enrichment pass

### Load-bearing issues iteration 1 surfaced but didn't fix

1. **Missing-data confound:** 337 buildings had missing `dob_jobs`. Percentile-rank logic returned `None` for them, then defaulted to `action_stage = 0.0`, which dumped all 337 into the "low activity" pool by construction. The cohort was biased toward "data didn't join" buildings, not necessarily "no permits" buildings.
2. **Duplicate "530 W57th St"** appeared twice in the top 15 with identical values — suggested either source duplicates or join collisions, neither investigated yet
3. **Malformed address "116 Street"** — likely Columbia University main campus, not a single building. Address quality issues visible even at the top of the cohort
4. **`dob_jobs == 0` count was zero** in the raw data — every building either had >0 permits or was missing. This was visible in iteration 1's output but its significance wasn't recognized until iteration 2

---

## Iteration 2 — Fix the confound and defend the cohort

### What we built

Added three new steps to the same file:
- **Step C (duplicate audit + dedupe):** runs before tier-splitting. Reports raw address duplicates, normalization collisions, effective join cardinality, and dedupes via keep-first per normalized address
- **Step A (DOB diagnostics):** explicit counts on the corrected dataset, sensitivity analysis of low-activity rule at N=0, N=1, N=2
- **Step B (three-tier split):** Early-Warning (high CPS + known low activity), Data-Gap Review (high CPS + missing dob_jobs), Already-In-Flight (high CPS + high activity, excluded from EW)
- **Step D (corrected verdict):** top-15 listings and overlap statistics at all three N values, plus Tier 2 separately

Tunable constants at the top of the file: `CURRENT_YEAR`, `W_INTENSITY`, `W_ACCELERATION`, `W_AGE`, `CPS_PCTILE_THRESHOLD`, `LOW_ACTIVITY_N`.

### What we found

**Step C — Duplicate audit:**
- 46 raw-address duplicates in buildings.json (95 total rows). Examples: "111 Broadway" ×3, "115 Broadway" ×3 (where two of the three are "115 Broadway" with one having a double space, sharing identical BBL 1000500001 — confirmed source duplicate, not a normalization artifact)
- 7 normalization collisions: e.g., "115  Broadway" vs "115 Broadway", "215 Lexington Ave" vs "215 Lexington Avenue", "365 5th Avenue" vs "365 Fifth Ave"
- **91.4% clean one-to-one matches** (1,152 / 1,260). The remaining 108 rows are in many-to-one groups
- After keep-first dedupe: 1,260 → 1,204 rows
- The iteration-1 "530 W57th St" duplicate is a real source duplicate in buildings.json

**Step A — DOB diagnostics on the deduped data:**

| dob_jobs state | Count | % |
|---|---:|---:|
| > 0 | 882 | 73.3% |
| **== 0** | **0** | **0.0%** |
| missing | 322 | 26.7% |

**The dataset cannot represent "this building has zero permits."** The field is binary in practice: positive count or missing. Iteration 1's strict early-warning concept ("known zero activity") is definitionally unobservable.

**Step B — Tier split (CPS cutoff 0.688 = top 25%, n = 301 high-pressure):**

| Tier | Definition | Size |
|---|---|---:|
| Tier 1 (N=0) | dob_jobs known AND ≤ 0 | 0 |
| Tier 1 (N=1) | dob_jobs known AND ≤ 1 | 25 |
| Tier 1 (N=2) | dob_jobs known AND ≤ 2 | 46 |
| Tier 2 Data-Gap Review | dob_jobs missing | 89 |
| Tier 3 Already-In-Flight | dob_jobs > N | 212 (excluded) |

**Step D — Overlap with existing High tier (52 buildings with risk > 0.7 after dedupe):**

| Tier | Intersection | % NEW |
|---|---:|---:|
| Tier 1 (N=1) | 0 | 100.0% |
| Tier 1 (N=2) | 3 | 93.5% |
| Tier 2 Data-Gap | 3 | 96.6% |

All three tier risk-field distributions cluster at median ~0.50 — these are buildings the existing model files in its Medium/Low buckets.

### Direct answers to iteration-2 asks

| Ask | Answer |
|---|---|
| Confirm raw DOB counts | dob_jobs > 0: 882; == 0: **0**; missing: 322 |
| Replace percentile-rank with known-value rule? | Done. Missing is its own category, never folded in |
| Show low-activity counts at N=0/1/2 | 0 / 99 / 177 across full portfolio; 0 / 25 / 46 within high-pressure pool |
| Find duplicates and diagnose cause | 46 source duplicates (some with identical BBLs — confirmed real source dups) + 7 normalization collisions |
| Effective one-to-one join quality | 91.4% (1,152 / 1,260) |
| Dedupe strategy | Keep-first per normalized address — 56 rows discarded |
| Tier 1 size after fix | 0 at N=0, 25 at N=1, 46 at N=2 |
| Tier 1 overlap with existing High (recomputed) | 100% NEW at N=1, 93.5% NEW at N=2 |
| Tier 2 size | 89 |
| Defensible cohort worth building? | Yes with three explicit caveats (see verdict) |

### Discoveries (beyond the asks)

- **31 W 34 St** at N=2: 1912 office with **$17.3M projected 2030 LL97 penalty** and only 2 permits filed. That's a single-building outlier facing massive compliance pressure with thin documented activity
- **Tier 2 dominated by big institutional campuses**: Columbia U ("116 Street"), hospitals at 64th/77th/2nd Ave, large Wall Street financial offices. The pattern suggests Tier 2 is heavily contaminated by join failures on complex address structures, not by genuinely inactive buildings
- **Risk-field clustering at ~0.50** across all tiers — confirms the existing model is leaving these buildings in an ambiguous middle band where threshold-proximity has the most room to add signal
- **Source duplicates with identical BBLs** ("115  Broadway" / "115 Broadway") prove the data quality issue is upstream of any analysis, not introduced by our normalization

### Verdict (the honest one-paragraph read from iteration 2)

The threshold-proximity concept produces meaningful signal — the corrected cohorts at N=1 (25 buildings, 100% disjoint from existing High tier) and Tier 2 (89 buildings, 96.6% disjoint) are nearly fully orthogonal to the existing model, exactly what the concept claimed. But iteration 2 also revealed that the strict early-warning definition (CPS-high AND known-zero-activity) is **not directly testable in the current data** because `dob_jobs == 0` does not exist as a value. The cohort is defensible as a documented feature with three explicit caveats: (1) we ship the "≤1 permit" or "≤2 permits" version and call it "very low activity," not "zero activity"; (2) Tier 2 ships as a separate, clearly-labeled "needs manual review" output, never folded into early warning; (3) the team raises with Ismael whether the upstream pipeline can emit explicit `dob_jobs: 0` for confirmed-zero buildings.

---

## What this spike proves and doesn't prove

### Proves
- Threshold-proximity produces a meaningful, mostly-disjoint signal from the existing risk model
- A sensible cohort exists in the "tens of buildings" range (25 at N=1, 46 at N=2) once the confound is fixed
- The CPS construction (penalty intensity × penalty acceleration × equipment age, percentile-normalized, weighted 0.4/0.4/0.2) produces a workable continuous distribution rather than a degenerate K-shape
- The top buildings in the cohort look genuinely plausible on inspection — pre-war Manhattan institutional / commercial buildings facing real LL97 exposure
- The existing model is leaving these buildings in a Medium/Low band where additional signal has room to operate

### Doesn't prove
- That these buildings will actually convert (no validation against ConEd disconnect records — same blocker as the main model)
- That the chosen weights (0.4/0.4/0.2) are optimal — they're reasonable defaults, not derived
- That the data quality is good enough for production. Three real issues surfaced:
  - dob_jobs cannot express zero
  - 46 source-address duplicates with some BBL collisions
  - Tier 2 likely contaminated by address-join failures on complex institutional campuses
- That outreach on these buildings would yield retention (downstream validation question, out of scope)
- That the cohort is robust to threshold choices — we tested N ∈ {0, 1, 2} but not sensitivity to CPS cutoff or weight perturbations

---

## Path from spike → documented feature

Tracking what would need to happen if the team agrees this is worth productizing.

### Required upstream (Ismael's pipeline)
1. **Emit `dob_jobs: 0` explicitly** for buildings where the DOB join was attempted and returned no rows — distinguish from buildings where the join was not attempted or failed for a technical reason
2. **Resolve source duplicates in buildings.json** or document the multi-BBL / multi-record pattern as a known feature, so downstream scoring can collapse correctly
3. **Document the DOB query parameters**: date range, permit types included, active-vs-all filter — so we know what "no permits found" actually means

### Required dashboard work (Edwin's scope, if it lands)
1. New "Conversion Pressure" section in `BuildingPanel.jsx` — show the three component scores (intensity, acceleration, age) and the composite CPS
2. Three-tier badge: Early-Warning (green border? blue?), Data-Gap Review (gray/uncertain styling), Already-In-Flight (no badge — already on someone's radar)
3. Methodology footer disclosing the N-choice, the dob_jobs=0 caveat, and what Tier 2 means
4. Filter chip in RiskTable for "threshold-proximity flagged" — Pedro's territory

### Required documentation
1. Public methodology note matching the existing README "Weather Normalization — Known Limitation" pattern
2. Per-tier explanation for account managers (what does each tier mean, what's the recommended action)
3. Caveats: not validated, not weather-adjusted, depends on permit data quality

---

## On `dob_jobs == 0`: could missing actually NOT equal zero?

**Short answer: yes, almost certainly.** This is the most important nuance to flag, because it changes what the cohort actually means.

When we see `dob_jobs` missing for a building, that could mean any of the following — and we have no way to distinguish them from the data alone:

1. **The DOB-permits join genuinely failed.** Building exists in PLUTO / LL84, but the DOB permits dataset can't match it. Possible causes:
   - Address-string mismatch the normalization didn't catch (especially for complex institutional addresses like "Columbia University" or "Rockefeller Center")
   - Multi-BBL building where the DOB query was run on a different parcel than buildings.json captured
   - Different building-identifier convention between datasets (DOB job filings use BIN, not BBL — if the BBL→BIN mapping has gaps, permits go missing)

   For these buildings, "missing" means "we don't know" — not "zero." The building may have lots of permits we just can't see. **This is the worst-case interpretation because it makes "low activity" cohorts include genuinely active buildings.**

2. **Time-range mismatch.** If the DOB query only pulls recent permits (say, last 5 years), a building that filed permits 6 years ago shows missing — but its historical activity may be substantial. Was a date filter applied upstream? We don't know without asking Ismael.

3. **Permit-type filter.** If the pipeline filters to HVAC/boiler permits specifically, a building doing major non-HVAC work (interior, facade, structural) shows missing despite being actively renovated. Active renovation activity is a useful proxy for capital availability even if it's not steam-system work specifically.

4. **DOB NOW vs. legacy BIS.** NYC's DOB NOW system launched around 2018–2019. If the query only pulls DOB NOW data, anything filed under the legacy BIS system pre-2018 is invisible. An old building that hasn't had work since 2017 looks identical to one that never had any.

5. **Active vs. all-permits filter.** Some queries filter to approved/issued permits only, excluding withdrawn, pending, or revoked. A building with several pending permits in the queue would show as missing.

6. **Building demolished or fundamentally repurposed.** The building was demolished, converted to a different use, or otherwise no longer exists in a form that would receive permits. This is rare for the Manhattan steam-customer set but possible.

7. **Genuine inactivity.** The building has truly filed no DOB permits in the queried scope. **This is the case we want to identify — but it's likely the smallest slice of the 322 missing-data buildings.**

**What the spike data suggests about the mix:**

Looking at the top 15 of Tier 2:
- 101 East 77th St (1894 hospital, 873k sqft)
- 1000 5th Ave (1878, 2.4M sqft)
- "116 Street" (1910 College/University, **6.9M sqft** — clearly Columbia campus)
- 1275 York Ave (1940 specialty hospital, 1.4M sqft)
- 530 W57th St (1937 office, 466k sqft) — the iteration-1 duplicate
- 11 Wall St (1904 financial office, 335k sqft)

These are exactly the buildings where address-join failure is most likely:
- Massive institutional campuses with no single canonical street address
- Buildings with multi-BBL parcels
- Pre-WWI commercial buildings on Wall Street with complex ownership / addressing histories

**Realistic Tier 2 breakdown (educated guess, not derived from data):**

- ~50–70% are address-join failures masquerading as "low activity" — i.e., these buildings ARE active, we just can't see their permits
- ~20–30% may be genuinely lower-than-average activity but not zero
- ~5–10% may be truly inactive (rare in Manhattan; even sleepy buildings usually have facade or elevator work)
- ~5% may be demolished / repurposed / data-quality outliers

**Practical implication for the feature:**

Tier 2 (Data-Gap Review) shouldn't be marketed as "candidates for early-warning outreach." It should be marketed as **"we have a visibility gap on these buildings — recommend checking the DOB NOW website directly to confirm whether they're truly inactive or whether our join missed something."** That's a fundamentally different (and weaker) deliverable than Tier 1, even though Tier 2 is larger.

**The Ismael question that would unlock the strict definition:**

> "When the DOB-permits enrichment can't find any matching permits for a building, does the pipeline write `dob_jobs: 0` or leave the field absent? And what's the upstream query — date range, permit types, BIN-vs-BBL join key?"

If he says "leave absent" → we're conflating two cases and need to fix it upstream.

If he says "write 0" → but we observed zero buildings with dob_jobs == 0 in 1,204 rows, which is implausible for a 1,260-building Manhattan portfolio over any reasonable time window. That would suggest the query is finding *something* for every building it joins to, and "missing" really does mean "join failed."

Either way, the answer changes how we should present Tier 2 to ConEd account managers.

---

## Reflection — causal validity gap

The spike answered "does a cohort of high-pressure, low-activity buildings exist mathematically?" It did NOT answer "would these buildings actually drop steam if they took action?" Those are different questions and conflating them inflated the apparent value of the spike result.

### Three failure modes in the feature's causal logic

**1. Building type may rule out steam conversion entirely.**

ConEd has already told us large institutional buildings are unlikely to drop steam outright — the load is too big, the alternative systems are operationally complex, and the redundancy/reliability story for hospitals and universities is hard to recreate without steam. They explicitly said they're not as worried about that segment. Yet **Tier 2 in our spike is dominated by exactly those buildings**: Columbia University ("116 Street", 6.9M sqft), 101 East 77th St hospital, 1275 York Ave hospital, 1000 5th Ave, 11 Wall Street. If ConEd has already triaged this segment out, our headline finding is flagging buildings ConEd doesn't act on. Tier 2's apparent value drops sharply once this filter is applied.

**2. LL97 compliance is NOT equivalent to steam conversion.**

A building has multiple legal paths to escape LL97 penalty exposure, and steam conversion is only one of them:

- Switch heat source from steam to electric heat pumps  ← what ConEd cares about (steam loss)
- Switch from steam to onsite gas boilers  ← also what ConEd cares about (steam loss)
- Envelope upgrades (windows, insulation, air sealing) — reduce demand without touching steam
- Controls + commissioning — same fuel, much less of it
- Beneficial electrification of non-steam loads (cooking, DHW, ventilation) — improves carbon math, doesn't touch steam
- Renewable energy procurement, RECs, offsets — paper compliance, building unchanged
- Pay the penalty if it's cheaper than the capex — rational choice for some owners

Our Conversion Pressure Score treats "facing big LL97 penalty" as a proxy for "likely to drop steam." It is actually a proxy for "facing pressure to *do something*." The "something" might not involve steam at all, and we have no signal in the model that distinguishes between these pathways.

**3. We don't know if steam is the actual culprit for the building's carbon exposure.**

A building's LL97 penalty comes from total site/source carbon emissions. Steam contributes, but so do electricity, gas, and other fuels. For a building where steam is a small share of total carbon footprint, **conversion is the worst lever to pull** — high capex, small compliance benefit. For a building where steam dominates, conversion is genuinely on the table. The current model doesn't compute or display steam's share of a building's LL97 exposure, so it can't distinguish "steam is the problem" from "steam is incidental." This is not a threshold-proximity bug specifically — it's a hole in the whole risk model.

### The Boston / Veolia natural experiment

Boston is the cleanest external validation available:

- Boston has **Veolia district steam** in downtown — direct analog to ConEd's steam network
- Boston has **BERDO 2.0** (Building Emissions Reduction and Disclosure Ordinance, carbon-standard version passed 2021) — direct analog to LL97
- BERDO has been in effect long enough to see how building owners actually responded
- The hypothesis we'd test: when Boston commercial buildings faced BERDO compliance pressure, did Veolia customers convert off steam at meaningful rates, or did they comply via envelope upgrades, controls, renewables procurement, RECs?
  - If Veolia's customer base shrank meaningfully → the conversion-pathway hypothesis holds, and threshold-proximity has real predictive validity for the ConEd use case
  - If Veolia's base barely changed and customers complied via non-steam pathways → the whole premise of "decarbonization pressure predicts steam dropoff" is weak, and threshold-proximity is solving the wrong problem

Other regulatory comparisons exist but are less direct: DC's BEPS, Denver's Energize Denver, Washington State's CETA. None pair district steam with a carbon-cap ordinance the way Boston does. **Boston is the one comparison worth investing research time in.**

### What this means for the spike's headline result

The mathematical finding ("25 buildings at N=1, 100% disjoint from existing High tier; 89 Tier-2 buildings, 96.6% disjoint") is still true. But its *meaning* changed:

- **Before reflection:** "We've found 25 buildings the existing model misses that are likely conversion candidates"
- **After reflection:** "We've found 25 buildings that face penalty pressure, are not visibly mid-renovation, and aren't already flagged by the existing model — whether any meaningful fraction will actually drop steam is an open question we cannot answer from this data"

The gap between those two statements is the work that hasn't been done. Until it's closed, threshold-proximity cannot be defended as a predictive feature — only as a "buildings worth a closer look" prioritization aid, which is a much weaker claim.

### The bigger reflection beyond threshold-proximity

This causal-validity gap is **not unique to our spike**. It runs through the entire `ll97_penalty_2030` → risk pipeline that Ismael's gradient-boosting model uses. If high LL97 exposure doesn't actually predict steam dropoff in practice, then `ll97_penalty_2030` shouldn't be a feature carrying 11% importance in the model — or it should be conditioned on steam-share-of-emissions and conversion-feasibility variables that we don't currently compute. The whole risk model may be inflating the apparent role of LL97 in driving the disconnects we observe. Worth flagging at the team sync as a model-wide concern, not just a threshold-proximity concern.

---

## ▶︎ Suggested actions from the reflection ◀︎

> The following are the concrete next moves implied by the reflection above. None of these have been done yet. Listed roughly in order of leverage-per-effort, not chronologically.

### Research (low effort, high information value)

1. **Boston / Veolia + BERDO research pass** — 2-3 hour focused research task. Questions to answer:
   - How many buildings has Veolia lost since BERDO 2.0 took effect?
   - Of buildings that complied with BERDO, what compliance pathway did they pick (conversion vs. efficiency vs. RECs vs. payment)?
   - Are there published case studies of Boston commercial buildings making this decision?
   - Is there any BERDO data showing the elasticity of district steam churn to carbon-cap pressure?
   - This single question is the most decisive piece of evidence we could collect — confirms or kills the threshold-proximity premise

### Sponsor / ConEd validation (low effort, depends on access)

2. **Raise at next ConEd touchpoint:** "When customers face LL97 pressure, what do they actually do? Is steam conversion the typical response or a rare one?" — the question we should have asked before building the spike
3. **Explicit confirmation on institutional building segment:** "Are large hospitals, universities, financial-district pre-war buildings effectively off the table for steam-dropoff regardless of LL97 pressure? If so, what's the right size/use-type cutoff?"
4. **Ask David for any internal ConEd analysis** of conversion-pathway distribution among their actual disconnects — he may already have this and just hasn't shared

### Model improvements (medium effort, high impact regardless of threshold-proximity's fate)

5. **Add steam-share-of-emissions as a feature** — computable from existing LL84 data (steam kBtu × steam emission factor / total emissions). High-leverage improvement to the whole model, not just our spike. Distinguishes "steam is the problem" from "steam is incidental"
6. **Add conversion-feasibility downweighting by building type** — institutional/medical/large-load buildings get a feasibility coefficient below 1.0 applied to the conversion-pressure signal. Requires use-type → feasibility mapping (could start as a hand-coded table, refined with ConEd input)
7. **Compute cheapest compliance pathway** per building where possible — this is harder and may require assumptions about capex vs. penalty, but even a crude version (energy efficiency capex estimate, RECs market rate, penalty schedule) would let us flag when conversion is NOT the rational choice

### Documentation / framing (trivial effort, prevents repeating this mistake)

8. **Update the threshold-proximity feature framing** if/when it ships — explicitly NOT a "likely conversion candidate" cohort, only a "warrants closer look" cohort, until the causal chain is validated
9. **Add a model-wide methodology disclosure** acknowledging that `ll97_penalty_2030` is a pressure proxy, not a steam-conversion predictor, until conversion-pathway evidence is collected
10. **Raise at next team sync:** the causal-validity gap is a model-wide issue, not just a threshold-proximity issue — Ismael should know

### What to NOT do until the research lands

- Do NOT merge `spike/threshold-proximity` to main
- Do NOT add a "Conversion Pressure" panel to BuildingPanel.jsx
- Do NOT include threshold-proximity in the in-person ConEd meeting next week (presenting an unvalidated causal claim to the sponsor risks credibility on the rest of the work)
- Do NOT update `docs/project-scope.md` or `docs/project-requirements.md` with threshold-proximity references until at least the Boston research is done

---

## Decisions log (this spike only)

| Date | Decision | Why |
|---|---|---|
| 2026-06-04 | Spike scoped to single file, read-only on public/, no merge | User explicitly framed as throwaway feasibility check |
| 2026-06-04 | Percentile-rank chosen over min-max for CPS components | Penalty fields heavily right-skewed; min-max would compress 90%+ to near zero |
| 2026-06-04 | Weights 0.4/0.4/0.2 (intensity/acceleration/age) | Reasonable defaults per spec; not derived. Made explicit and tunable at top of file |
| 2026-06-04 | Iteration 1 cohort = top 25% CPS × bottom 25% action_stage | Quartile defaults gave 150-building cohort — workable but wider than "tens" |
| 2026-06-04 | Iteration 2 dropped percentile-rank action_stage, replaced with explicit known-value rule | Iteration 1's percentile rank treated missing as zero, contaminating cohort |
| 2026-06-04 | Iteration 2 split output into three tiers, never mixing missing-data with low-activity | Honest separation; Tier 2 is its own deliverable, not a false-positive risk on Tier 1 |
| 2026-06-04 | Dedupe via keep-first per normalized address | Spike convenience; production must resolve multi-BBL / source-dup properly |
| 2026-06-04 | At N=0 cohort empty by data design — flagged as upstream data limitation, not analysis failure | dob_jobs cannot represent zero in the current pipeline |

---

## Files produced

All under `analysis/` in the team repo on the `spike/threshold-proximity` branch:

- `threshold_proximity_spike.py` — full script with steps 0, C, 1, A, B, D
- `cps_components.csv` — 1,204 deduped buildings with component scores
- `early_warning_tier1_N0.csv` — empty (data-design limitation)
- `early_warning_tier1_N1.csv` — 25 rows
- `early_warning_tier1_N2.csv` — 46 rows
- `early_warning_tier1.csv` — canonical, currently N=0; change `LOW_ACTIVITY_N` constant to switch
- `data_gap_review.csv` — 89 rows

---

## Boston pass — initial findings & provisional conclusion (not done yet)

Companion research brief: `/Users/Pursuit/Downloads/boston-berdo-research-brief.md`. Full report: `/Users/Pursuit/Pursuit_Projects/docs/research/2026-06-04_web_boston-berdo-research.md` (217 lines, 25KB, source-tagged).

### What we asked Boston to tell us
Whether carbon-mandate pressure on building owners (BERDO 2.0) drives district-steam customers to disconnect, or whether they comply through other pathways that leave steam intact. Boston pairs Veolia/Vicinity district steam with BERDO the same way ConEd pairs district steam with LL97 — closest available natural experiment.

### What Boston actually showed us
1. **BERDO is a real LL97 analog.** Comparable cap-and-penalty structure ($234/ton ACP vs LL97's $268/ton), similar building coverage, similar deadlines. The comparison is structurally sound.
2. **Named cases all point toward staying on steam, not leaving.** Emerson College and IQHQ signed up for *more* steam via Vicinity's eSteam product. Mass General is exploring heat pumps but hasn't disconnected. No publicly named Boston building has dropped district steam to comply with BERDO. Trade press (POWER, NEREJ, Banker & Tradesman) treats district energy as an *easier* compliance path, not a liability.
3. **Vicinity offers eSteam** — a BERDO-recognized zero-emission steam product. Covered customers comply by buying the new product. ConEd has no equivalent product offering today.
4. **The experiment has barely run.** BERDO 2.0's first compliance period was CY2025; first emissions reports are due Aug 2026 (extended). What we have is *leading indicators*, not measured outcomes. The real disconnect signal — if any — shows up in the 2026–2028 window.

### Data availability used to reach the verdict — and the gap that matters
This is important to be honest about:

- **What the researcher found:** structural BERDO/LL97 comparison, Vicinity press releases and corporate strategy, named case studies (Emerson, IQHQ, MGH, BMC), trade-press compliance-pathway analysis, ACEEE/RMI policy framings, NEREJ practitioner commentary, IDEA industry sessions, ConEd's own April 2024 NYS DPS filing.
- **What the researcher could not find — and explicitly tagged Unknown:**
  - Vicinity's net Boston customer count or steam volume change since BERDO 2021 (Q2 — no public year-over-year disconnect tracker)
  - Any named Boston building that publicly dropped steam to comply with BERDO (Q3)
  - Quantitative split of compliance pathways being chosen (Q4 — first filings not due until Aug 2026)
  - Small-commercial Boston steam customer behavior (Q5 — coverage is institutional-heavy)
- **So the "non-disconnect" verdict is *absence of evidence*, not *evidence of absence*.** Trade press isn't writing about Boston steam disconnections. That could be because they're not happening, or because they aren't newsworthy, or because Vicinity isn't disclosing churn, or because pre-2025 disconnects predate BERDO attribution.

### Confounder that breaks the natural experiment (your point 1 critique, accepted)
> "If ConEd currently doesn't have the equivalent of Vicinity then are we not speculating that there is no sign that the carbon pressure leads to a disconnect as a natural response?"

Correct. The Boston case has two simultaneous "treatments":
- BERDO carbon pressure (also present in NYC as LL97)
- An attractive on-network compliance pathway (eSteam) — **not** currently present in NYC

What Boston actually demonstrates is "**when a green-steam product exists, BPS-pressured buildings prefer it to disconnection**." It does *not* demonstrate "BPS pressure doesn't drive disconnect" in the abstract — because the no-green-steam counterfactual is exactly what we'd need to test, and Boston doesn't provide it. NYC under LL97 with no ConEd green-steam product is closer to that counterfactual than Boston is.

My earlier headline ("Boston suggests the BPS-pressure → disconnect mechanism is weak") **overclaimed**. The honest version is:
- Boston shows an *alternative pathway* exists when the utility provides one
- Boston does not show what BPS pressure does in the absence of that pathway
- And we don't have measurement of Boston disconnect rates anyway

### What the data says about how ConEd actually labels risk (your point 3 question, checked)
Direct inspection of `public/buildings.json` (1,260 rows) against `public/buildingEnrichment.json`:

- The **displayed `risk`** field is not produced by `ll97_model.py`. `ll97_model.py` produces `ml_risk` (a supervised gradient-boosting score). Correlation between displayed `risk` and `ml_risk` is essentially zero (r = −0.006). Two different scoring systems.
- The displayed `risk`'s source script is still not in this repo. We can only characterize it by inspection of the values.
- **Linear correlation of displayed `risk` with single features (1,260 buildings):**
  - `year_built`: r = 0.452 (strongest single-feature signal; positive — newer buildings are higher-risk)
  - `ll97_penalty_2030`: r = 0.105
  - `ghg`: r = 0.044
  - `ml_risk`: r = −0.006
- **Band-level pattern (which a Pearson r underweights when distributions are skewed):**
  - High-risk (>0.7): n=55, mean year built 1994 (median 1999), mean LL97 2030 penalty $360k (median $231k)
  - Low-risk (≤0.4): n=225, mean year built 1927 (median 1927), mean LL97 2030 penalty $39k (median $0)
  - High-risk buildings carry ~10× the median LL97 exposure of low-risk buildings — so LL97 *is* doing meaningful discrimination at the band level, even if the linear correlation is modest.

**Honest answer to "is carbon pressure currently the primary mode by which we label risk?":** We can't be definitive without the source script, but inspection suggests it is **one of several inputs, not the dominant single signal**. Year-built is the strongest single-feature correlate. LL97 exposure separates the bands meaningfully (10× median penalty difference between High and Low) but does not dominate the score on its own. So the implication "downweight LL97 in the model" from my earlier headline was directed at the wrong target — the *supervised* model (`ml_risk`) is what would need that downweighting, and `ml_risk` isn't even the score the UI displays today.

### Provisional conclusion (this exploration is not finished)
Three claims that are honest given current evidence:

1. **The threshold-proximity feature's causal premise is unsupported by Boston — but also not falsified by Boston.** Boston's "stay on steam" pattern is confounded by the existence of eSteam, which ConEd customers don't have. The right verdict is "we still don't know whether LL97 pressure → disconnect for ConEd customers," not "the mechanism is weak."
2. **The most useful next data is ConEd's own customer-level disconnect history joined to LL97 exposure.** Boston cannot settle this. Only NYC outcome data can. Sho's NDA pathway (referenced in main project notes) is the right channel.
3. **The displayed `risk` field is not a pure carbon-pressure model anyway.** It's a multi-input score where year-built dominates the linear signal and LL97 contributes meaningfully at the band level. The earlier "downweight `ll97_penalty_2030`" framing was directed at `ml_risk` (the supervised model), not at the UI's `risk` — those are two different scores with near-zero correlation between them. The bigger question — what *is* the displayed risk formula, and who can defend it? — was already flagged in the main project notes as a structural repo gap and is unchanged by this pass.

### What this section is NOT
- Not a kill-decision on threshold-proximity. The premise is unconfirmed, not disproved.
- Not a recommendation to change the model today. Both the supervised model and the displayed score need their own audits before any feature-weight changes.
- Not a final word — this is an interim conclusion. The next round of evidence (ConEd disconnect data ask, or Boston's first BERDO compliance filings in Aug 2026) would change it.

### Open threads from this pass to pick up later
- Ask David at next ConEd touchpoint: can we get anonymized customer-level disconnect history joined to LL97 exposure? Boston cannot settle the causal question; only NYC outcome data can.
- Ask David: does ConEd have, or plan, a BERDO/LL97-recognized low-carbon steam product analogous to Vicinity's eSteam? If so, the entire threshold-proximity / penalty-pressure framing changes — pressure routes back to the utility, not to disconnection.
- Find the script that produces displayed `risk`. Until that exists in this repo (or is at least documented), we can't defend or modify it.
- Re-run this exploration once the first BERDO compliance filings publish (late 2026/2027), when Boston will actually have measured outcomes instead of leading indicators.
