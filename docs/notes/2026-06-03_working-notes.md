# ConEd Dashboard — Working Notes

Personal scratchpad for Edwin × Claude sessions on the ConEd Steam Attrition project. Lives outside the team repo so the team never sees this.

Last updated: 2026-06-03 (consolidated improvement roadmap + ConEd workflow integration after team calls)

---

## Project state

**Team:** Ismael (data pipeline + ML), Pedro (table filters / UI), Edwin (building panel + visualizations)
**Sponsor:** David Caiafa, ConEd Steam Operations
**Phase:** 1 (Attrition Rankings) shipped; Phase 2 (Load Forecast, Watch List, AI Agent) in progress
**Repo:** `github.com/ismaelcaraballo-afk/coned-dashboard` (shared) — working off feature branches
**Current branch:** `edwin/ll33-and-steam-yoy-viz` (PR #4 open)

---

## What we've shipped on this branch

- `ll33_grades.py` — derives NYC LL33 letter grades (A/B/C/D) from existing Energy Star scores in `buildingEnrichment.json`. 849/1247 buildings now have grades (68% coverage).
- BuildingPanel YoY steam visualization — bar comparison of `steam_2022` vs `steam_2023` with a color-coded delta and narrative label. ⚠️ NOT HDD-normalized — see "Known gaps" below.
- `useBuildings.js` now loads `yearly.json` alongside enrichment with graceful fallback.

---

## Known gaps & things to fix

### 1. Our YoY visualization is not weather-normalized
- The bars use raw `steam_2022` vs `steam_2023` from LL84
- The signal box one row above shows the HDD-normalized number (`hdd_pct`)
- Side by side, the user sees two different "YoY change" numbers for the same building
- Fix options:
  - (a) Label bars as "raw, not weather-adjusted" — quick caveat
  - (b) Replace bars with the existing `hdd_pct` value (only 21% coverage)
  - (c) Show both — raw bars + corrected delta — most defensible at demo

**Empirical evidence — 211 buildings where raw YoY and `hdd_pct` could both be computed:**

| Address | Raw YoY | `hdd_pct` | Gap |
|---|---|---|---|
| 1-3 East 42nd St | −29% | **+4%** | 33pp — sign flipped |
| 10 East 70th St | −37% | **+3%** | 40pp — sign flipped |
| 100 Central Park South | −23% | **+1%** | 24pp — sign flipped |
| 1 Park Avenue | **+12%** | **−20%** | 32pp — sign flipped, hidden decline |
| 1 East 53rd St | −55% | −34% | 21pp — same direction, magnitude shrunk |

**Aggregate:** mean |gap| = **21 percentage points**, median |gap| = **16pp**, only **3/211** within 0.5pp.

This is both (a) empirical proof that the upstream pipeline IS doing meaningful weather normalization (so README's claim verified) and (b) proof that our bars can show dramatically different numbers than the signal box right above them — including buildings where the sign flips entirely.

### 2. Headline `risk` field has no traceable formula in our repo
- `buildings.json` ships with a `risk` value per building, displayed as the headline percentage
- No script that produces `risk` is in this repo. `kmeans_model.py` does NOT write it. `ll97_model.py` (referenced in commit messages) is not checked in.
- Probable home: Ismael's sibling repo `coned-3d-map` or his local-only scripts
- Bus-factor problem: nobody on the team (other than Ismael) can defend or regenerate the headline number

### 3. `risk` ≠ `ml_risk`
- `buildingEnrichment.json` has an `ml_risk` field (raw GBM probability per `ll97_model.py`) that is completely unused in the UI and uncorrelated with displayed `risk`
- Two ML-derived fields, the team only ships one of them — the other lives as orphan data
- Need to ask Ismael: which is "the model"? Why both?

**Empirical evidence — 3 sample buildings:**

| Address | `risk` (displayed) | `ml_risk` (unused) | Ratio |
|---|---|---|---|
| 1080 FIFTH AVE | 0.662 | 0.0045 | ~147× |
| 936 FIFTH AVENUE | 0.39 | 0.0079 | ~49× |
| 1120 AVE OF THE AMERICAS | 0.438 | 0.0816 | ~5× |

Out of **1,210 matched pairs, zero were identical** (within 1e-6). Different processes, not the same number reformatted. `ml_risk` reads like raw GBM probabilities (tiny because 5.4% positive base rate); `risk` is rescaled/calibrated/transformed by something not in this repo.

### 4. ConEd's methodology is much richer than ours (see "Improvement opportunities")

### 5. Risk tier assignment is by absolute threshold, not rank
- High > 0.7, Medium 0.4–0.7, Low ≤ 0.4
- Produces the K-shaped distribution (60/9/1191) that the README mentions
- Not necessarily wrong, but rank-based might be more useful for prioritized outreach if the model's absolute calibration is questionable

### 6. The 989 "Low" buildings include both genuinely stable customers AND buildings with no signal observed yet
- No "uncertain" bucket in the UI — false-confidence problem
- ConEd explicitly uses "uncertain" as a fourth risk label; we should too

---

## Improvement opportunities (informed by David Caiafa's methodology description)

ConEd's internal method (paraphrased):
- Per-customer **linear regression**: usage/day ~ HDD/day + CDD/day → produces HDD slope, CDD slope, intercept
- Weather-normalized usage = actual + heating adjustment + cooling adjustment + billing adjustment
- Multiple diagnostic metrics: YoY %, model R², HDD slope stability, slope/intercept synchronized changes, decline acceleration
- Risk labels: High / Medium / Low / Uncertain

### What we COULD ship within public-data constraints

| Improvement | Effort | Notes |
|---|---|---|
| Add **CDD normalization** to upstream signal pipeline | Med — requires Ismael to modify pipeline | Steam absorption chillers in commercial buildings mean cooling matters; we currently ignore it |
| **Per-use-type HDD sensitivity** (proxy for per-customer regression) | Med | Group buildings by use type or vintage, fit one HDD slope per group instead of one for the whole city |
| Add **decline-acceleration feature** to the supervised model | Low — we have 2022/2023/2024 yearly | Whether the YoY decline is speeding up or slowing down is one of ConEd's diagnostic metrics |
| Add **"Uncertain"** risk bucket in UI | Low | Explicit fourth tier for buildings without enough signal to classify either way |
| Add **HDD-normalized YoY** to the dashboard | Low–Med | Pull NOAA Central Park HDD, recompute the YoY bars we just shipped |
| Display **2023→2024 comparison** where data exists | Trivial | 638 buildings have `steam_2024` and we're not showing it |

### What we CANNOT ship without ConEd customer data (NDA gated)

- **Per-customer billing-period regression** — needs monthly bills, we have annual LL84
- **Billing-day adjustment** — moot for annual data
- **True back-testing on observed churners** — we trained on 57 buildings that already showed ≥50% drop in public benchmarking; ConEd has actual disconnect records we don't
- **Customer-level early warning** in the way ConEd does it — they catch changes month-over-month; we catch them year-over-year

### How to position this for the sponsor

> "We've built an external, public-data complement to ConEd's internal customer-level regression. Different data layer, different cadence (annual LL84 vs monthly bills), same conceptual goal — flag candidates before they file the disconnect permit. Methodology gaps we can close: CDD, decline acceleration, per-use-type weather sensitivity, uncertain-tier labeling. Methodology gaps that are structural: per-customer regression at billing-period granularity."

---

## Blocked until customer data unlocks

David's email referenced:
- An NDA conversation (he doesn't think there's one with Pursuit yet)
- Sho Ohata previously helped with a similar Bidgely request — anonymized account numbers and building info
- Suggested we ask Sho about that process

Items blocked behind NDA + data access:
- Per-customer regression (needs billing-period usage)
- Validation of our `risk` ranking against actual ConEd disconnect records
- Replacement of public-data churn proxies (≥50% LL84 drop) with real churn labels

---

## Open questions

### For Ismael
1. Where does the `risk` field in `buildings.json` get computed? What script, what formula? Want to be able to defend the headline number to David.
2. What's the difference between `risk` and `ml_risk`? Why both? Why is `ml_risk` unused?
3. Can the upstream pipeline expose per-year HDD-normalized steam (not just the categorical `signal`) so the panel can show normalized bars?
4. Is the upstream HDD source NOAA Central Park, or something else? At what spatial granularity?
5. Could you check `ll97_model.py` into the dashboard repo or document its formula somewhere in the README? Currently it's a black box from the dashboard's perspective.

### For David / ConEd
1. Confirm the NDA / data-access process — should we route through Sho Ohata as he did for Bidgely?
2. Schedule the meeting he offered to walk through prior prediction attempts and what worked vs. didn't
3. Is the LL97 penalty calculation we're using (using LL84 self-reported GHG × $268/ton over cap) consistent with how ConEd thinks about LL97 pressure on customers?

---

## Consolidated improvement roadmap

All feasible improvements identified across this conversation, prioritized. Items marked ⓘ originated from David Caiafa's methodology description; items marked ⚐ originated from today's two ConEd workflow calls; everything else came from our codebase review.

### Tier 1 — Honesty patches (low effort, ship before any demo)

| # | Improvement | Effort | Why it matters |
|---|---|---|---|
| 1 | Label our YoY bars as "raw, not weather-adjusted" OR replace with `hdd_pct` where available | Trivial | Currently bars contradict the signal box above them by up to 40pp; risks misleading account managers |
| 2 | Show 2023→2024 comparison where data exists (638 buildings) | Trivial | Most recent year buried in `yearly.json`, currently invisible |
| 3 | Add an explicit "Uncertain" risk bucket in UI ⓘ | Low | 989 "Low" buildings currently mix genuinely-stable customers with no-signal-observed buildings — false-confidence problem |
| 4 | Surface model methodology + disclosures in a panel footer or "About" view | Low | Today's calls emphasized documentation; presenting an opaque score is unacceptable |

### Tier 2 — Methodology improvements within public-data constraints

| # | Improvement | Effort | Why it matters |
|---|---|---|---|
| 5 | Add **HDD-normalized YoY** to dashboard via NOAA Central Park HDD data | Low–Med | Closes the raw-vs-corrected inconsistency at source |
| 6 | Add **CDD normalization** to upstream signal pipeline ⓘ | Med (Ismael's territory) | Steam absorption chillers mean cooling matters for commercial buildings |
| 7 | **Per-use-type HDD sensitivity** (proxy for per-customer regression) ⓘ | Med | Glass office tower and pre-war masonry don't share weather response; one global divisor is crude |
| 8 | Add **decline-acceleration** as a model feature ⓘ | Low (data exists: 2022/2023/2024) | One of ConEd's diagnostic metrics — is the YoY decline speeding up or stabilizing? |
| 9 | Add **slope stability** and **R² of normalized usage fit** as features ⓘ | Med | More of ConEd's diagnostic metric set |
| 10 | Expose per-year HDD-normalized steam from upstream pipeline (not just categorical signal) | Med (Ismael) | Currently only have one signal field, not per-year trajectory |

### Tier 3 — Decision-support / productization

| # | Improvement | Effort | Why it matters |
|---|---|---|---|
| 11 | **Per-building reasoning report** — generated PDF/HTML showing exactly why a building was flagged ⚐ | Med | ConEd explicitly asked for this in today's calls. See Productization section below for full spec. |
| 12 | **Email agent** that proactively notifies account managers about flagged buildings with rationale ⚐ | Med | ConEd explicitly asked. Enables internal client outreach to gather context. |
| 13 | **Feedback loop** — account managers mark "contacted / confirmed at-risk / false positive" → those labels feed back to model retraining ⚐ | Med | Required if we ever want true precision/recall measurement |
| 14 | **Rank-based tier assignment** as alternative or supplement to threshold | Low | Threshold produces K-shape (60/9/1191); rank produces top-N which may match outreach capacity better |

### Tier 4 — Unblocked only after ConEd customer data agreement

| # | Improvement | Why blocked |
|---|---|---|
| 15 | Per-customer billing-period regression (HDD slope, CDD slope, intercept) | Requires monthly bills — we have annual LL84 only |
| 16 | Validation against real disconnect records | NDA-gated. David hinted Sho Ohata's Bidgely arrangement may be the template (anonymized account/building info). |
| 17 | Replace ≥50% drop public-data churn proxy with actual churn labels | Same NDA blocker |
| 18 | Billing-day adjustment | Moot until billing-period data is available |

---

## Consolidated error / fix list

Everything broken, missing, or methodologically suspect — surfaced over this conversation.

### Code / data integrity

1. ⚠️ **Our YoY visualization is not HDD-normalized** while the signal box right above it is — same building shows two different "YoY %" numbers, sometimes with opposite signs (1 Park Ave: +12% raw vs −20% normalized)
2. ⚠️ **`ll97_model.py` is not checked into the repo** — the script that produces the headline `risk` score lives only in Ismael's local environment or `coned-3d-map`. Bus-factor + audit-trail problem.
3. ⚠️ **`risk` ≠ `ml_risk`** — two ML-derived fields in the data, only one displayed, transformation between them undocumented. Across 1,210 matched pairs, zero are identical.
4. ⚠️ **`steam_2024` data exists for 638 buildings but is never displayed** — the panel only shows 2022 vs 2023
5. ⚠️ **Risk tier assignment uses absolute thresholds (0.7, 0.4)** that may not match outreach team's capacity for top-N prioritization
6. ⚠️ **No "Uncertain" bucket** — 989 "Low" buildings include both stable customers and buildings with no signal observed yet
7. ⚠️ **`signal` and `hdd_pct` only at 21% coverage** (266/1247) — most buildings have no normalized signal
8. ⚠️ **`deed_date`/`deed_amt` panel fields exist** but data coverage is 3–5% — mostly empty rows
9. ⚠️ **`boiler_fuel` panel field at 17% coverage** — sparse and not surfaced anywhere in filters

### Methodology issues

10. ⚠️ **Training label catches late-stage churn, not early warning.** ≥50% drop = customer has basically left already. David's whole pitch is "before they file the disconnect permit" — our positive class fires after the disconnect is already in flight.
11. ⚠️ **209 moderate-drop buildings are excluded from training** — exactly the borderline cases most useful for early intervention; model never sees them
12. ⚠️ **"57 confirmed all score high" is partially tautological** if those 57 are training data. Defensible only with strict held-out cross-validation positives, methodology of which is unknown.
13. ⚠️ **"K-shape matches ConEd attrition" is unvalidated** — no actual ConEd attrition rate to anchor against
14. ⚠️ **AUC 0.645 is at floor of "useful"** — better than random, much weaker than typical decision-support classifiers
15. ⚠️ **No CDD normalization** anywhere in pipeline — steam absorption chillers ignored
16. ⚠️ **No per-customer weather regression** — uniform citywide HDD divisor; ConEd uses per-customer slopes
17. ⚠️ **HDD source and granularity undocumented** — likely Central Park station applied uniformly, but never confirmed; microclimate effects unaccounted for
18. ⚠️ **No model fit diagnostics** — no R², no slope stability, no acceleration features that ConEd uses internally

### Open questions that remain

- For Ismael: where does `risk` actually get computed? Why both `risk` and `ml_risk`? What's the upstream HDD method? Can `ll97_model.py` be checked in?
- For David: confirm NDA / Sho Ohata data-access pathway; schedule the methodology deep-dive he offered

---

## Productization & ConEd workflow integration

Based on today's two calls with ConEd. Their explicit needs:

> *"Documentation is extremely important. Being able to generate a report that clearly states how we came to the conclusion that a building is in danger of dropping off, this would need to be detailed and show the reasoning the model used to arrive at this conclusion. They also mentioned that having an agent that can email them to let them act on the information would be a useful function to have as well because then they could internally reach out to the client and gather more data on what is actually going on."*

This pivots the tool from a **read-only dashboard** to a **workflow-embedded decision support system**. Three concrete deliverables.

### 1. Per-building reasoning report (the "why was this building flagged" doc)

**Format:** Generated PDF or printable HTML, one per building, on-demand from the panel.

**Required sections:**
- **Header:** Building address, BBL, use type, year built, owner (if known), report generation date
- **Headline:** Risk score (0–100%), risk tier, recommended action, customer archetype
- **Plain-language narrative** ("Why this building was flagged"): 2–3 paragraphs in natural language explaining the model's reasoning, generated by Claude Haiku via the existing `/api/query` backend pattern. Should reference the specific feature values for THIS building (not generic boilerplate).
- **Feature contribution table:** Each of the 8 model features with: this building's value, the cohort median, the relative position (e.g., "top 12% of buildings for LL97 2030 exposure"), and an indicator of whether it pushed the score up or down. SHAP-style if feasible; importance-weighted otherwise.
- **Steam usage history:** Multi-year chart (2022 → 2024 where available) with both raw AND HDD-normalized lines
- **Signal events:** Any `big_drop`/`mod_drop` flags, DOB permit history, ACRIS ownership transfers, with timestamps
- **Peer context:** "This building is in cluster X (Post-War Multifamily — LL97 Pressure). N% of buildings in that cluster have shown attrition signals."
- **LL97 financial exposure:** 2024 + 2030 penalty estimates with explanatory note
- **Methodology footer:** Brief disclosure of model type (gradient boosting), AUC (0.645), data sources, known limitations (not weather-adjusted at customer level, not validated against ConEd disconnect records, etc.)
- **Audit metadata:** Report version, model version hash, data file timestamps — so account managers can defend the decision later

**Why this matters:** Account managers can't defend an outreach decision internally if all they have is a black-box score. The reasoning report becomes the artifact they attach to their CRM notes / internal memos justifying the outreach. It also doubles as the audit trail when (not if) someone asks "why did we contact this customer?"

### 2. Email agent for proactive notification

**Behavior:** Periodic (weekly?) digest emails to ConEd account managers with the top N at-risk buildings in their assigned territory, plus newly-triggered alerts (DOB permit filed, LL84 update showing large drop, ownership transfer, LL97 threshold crossed).

**Email structure:**
- **Subject:** Concise — e.g., "ConEd Steam: 4 new high-risk buildings flagged this week"
- **Body, per building:**
  - Building address + cluster archetype
  - One-line rationale (auto-generated narrative)
  - 2–3 specific signals that triggered ("LL97 2030 penalty: $340k; HVAC permit filed Apr 14; Energy Star dropped from 67 → 41 YoY")
  - Link back to the building's panel + reasoning report in the dashboard
  - Action buttons: "Mark contacted", "Confirmed at-risk", "False positive — dismiss"
- **Summary footer:** Total buildings under watch, weekly trend, link to full dashboard

**Required infrastructure:**
- Email sending service (SendGrid, AWS SES, or Postmark)
- Account manager → territory mapping (who's assigned which buildings)
- State storage for "what's been sent to whom" + feedback responses
- Cron/scheduler for the weekly digest cadence
- The existing `api/server.js` backend is the natural home for this — extend it with email endpoints

**Why this matters:** Right now the tool requires the account manager to log in and look. The email agent inverts that — the system pushes signal *to them* and they only engage when there's something worth engaging with. That matches how busy operations staff actually work.

### 3. Feedback loop (the missing piece neither call explicitly named but follows from both)

Every "Mark contacted" / "Confirmed at-risk" / "False positive" response from the email agent is a labeled data point we can use to:
- Measure the model's real-world precision over time
- Retrain with stronger labels (especially the false-positives — currently we have ZERO confirmed false-positive labels)
- Improve the feature weighting once we have enough confirmations to do gradient updates

This is the only path to legitimate precision/recall measurement without ConEd handing over disconnect records.

### 4. How this fits ConEd's existing decision process

From David and the team's descriptions:
- ConEd already has an internal early-warning system using per-customer regression
- Our tool is **external/public-data screening**, not a replacement
- Account managers cross-reference our flags against their internal billing data
- Our value proposition: surface candidates *earlier than billing data would*, using public footprint (LL97 pressure, DOB filings, ownership transfers, neighborhood pattern) that may show up before steam usage changes appear in billing

**Decision workflow we should support:**
```
Our dashboard flags building → email digest hits account manager →
manager opens reasoning report → cross-references with internal billing →
either dismisses (false positive feedback) or initiates client outreach →
manager logs outcome in our system (or via email response) →
outcome feeds back to next model retrain
```

This loop is what makes us useful instead of just being a one-off visualization.

### Open positioning questions to resolve before scoping the productization work

- Email cadence: weekly? daily for high-priority only? configurable?
- Territory routing: who is each account manager responsible for? Do we have that map yet?
- Authentication / access control: PDF reports may contain LL97 penalty estimates that are aggregations of public data but still sensitive in combination — does ConEd want auth in front of the dashboard?
- Brand & visual treatment: should reports be ConEd-branded, Pursuit-branded, both, neither?
- Hosting: where does this live in production? ConEd intranet? Public web? Pursuit-hosted with VPN access?

---

## Ismael's response on model methodology (2026-06-03)

**What he confirmed (matches README, internally consistent):**

- **Training data:**
  - Positives: 57 buildings with confirmed ≥50% YoY steam drop (real observed behavior)
  - Negatives: 989 buildings with no measurable demand signal
- **Features and weights:**
  - Energy Star score (19%)
  - GHG emissions intensity (14%)
  - Peer pressure — nearby buildings showing decline (13%)
  - Steam demand size (13%)
  - LL97 2030 penalty (11%)
  - Year built (11%)
  - DOB HVAC permit activity (9%)
  - LL97 2024 penalty (6%)
- **Performance:** AUC 0.645 cross-validated
- **Honest framing he provided:** No precision/recall available without ConEd disconnect records. The 57 confirmed big-drop buildings all score high. The K-shaped distribution (60 high / 9 medium / 1191 low) matches expected ConEd attrition rate.

**What his response did NOT address (open questions remain):**

1. Where does the script that produces `risk` actually live? (still no pointer)
2. Why are `risk` and `ml_risk` different fields with uncorrelated values?
3. What's the exact HDD normalization method upstream? (per-customer regression? citywide ratio?)

## Risk assessment scorecard

| Dimension | Grade | Notes |
|---|---|---|
| Feature selection | B+ | Solid hypotheses, reasonable weights |
| Label quality | C | Real signals, but ≥50% drop catches late-stage churners, not early warning |
| Model performance | C+ | AUC 0.645 = weak ranking signal (0.6–0.65 floor of "useful") |
| Validation rigor | C | Cross-validated but no external ground truth |
| Methodology vs. ConEd internal | C− | Substantially less sophisticated; structurally constrained by public data |
| Code transparency | D | Headline-number-producing script not in repo |
| Honesty about limitations | A− | Ismael's framing is genuinely candid |

**Overall:** Weak-but-defensible if positioned correctly. Strong enough to be a useful ranking aid in a prioritized outreach list; nowhere near strong enough to be sold as a predictive classifier.

**Sharp critique points worth raising at the team sync:**

1. **"≥50% drop" label = late-stage detection, not early warning.** A customer who has lost half their steam load has already largely left. David's pitch is "before they file the disconnect permit." Our positive class is buildings where the disconnect is already in flight. The model learns "what does a building that already largely churned look like," then we apply it to currently-stable buildings hoping the same features predict *future* churn. The AUC number doesn't validate that leap.

2. **The 209 excluded "moderate drop" buildings are the most actionable cases.** Standard semi-supervised choice but lossy — model never learns the borderline pattern, exactly the pattern most useful for early intervention.

3. **"57 score high" is partially tautological if those 57 are training data.** Defensible only if held-out cross-validation positives consistently rank in top quintile across all folds. K-fold setup details unknown.

4. **"K-shape matches ConEd attrition rate" is unvalidated.** We don't actually have ConEd's published attrition rate to anchor against. It's a plausibility argument dressed up as validation.

## Positioning for David / sponsor demo

The honest framing:

> "We've built an external, public-data screening layer with weak-but-non-zero predictive signal (AUC 0.645), intended to surface candidates for human review — not a replacement for your internal early-warning system. We catch buildings where public footprint (LL84/DOB/ACRIS/PLUTO) shows the same pattern as historical big-drop buildings. Methodology gaps we can close: CDD normalization, decline acceleration as a feature, per-use-type weather sensitivity, an explicit Uncertain risk tier. Methodology gaps that are structural until we get customer data: per-customer billing-period regression, real disconnect-record validation."

---

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-06-02 | Work off shared team repo, not Edwin's fork | Faster team feedback loop than fork-and-PR |
| 2026-06-02 | LL33 grades derived from existing Energy Star data, not fetched from NYC Open Data API | Same data, simpler, no API key, idempotent |
| 2026-06-02 | YoY viz ships with raw LL84 numbers, not HDD-normalized | First-cut — to be revisited after CCD/HDD discussion with team |
| 2026-06-03 | Personal notes file kept outside team repo | Avoids polluting team's .gitignore |
| 2026-06-03 | Logged Ismael's model methodology + scorecard + sharp critique points | For future-Edwin and pre-demo prep with David |
| 2026-06-03 | Consolidated improvement roadmap (18 items across 4 tiers) and error list (18 items across code/methodology/open questions) | Pre-demo planning visibility |
| 2026-06-03 | Productization pivot: per-building reasoning reports + email agent + feedback loop became explicit ConEd requirements (today's two calls) | Reframes tool from dashboard to workflow-embedded decision support |
| 2026-06-03 | YoY viz Tier 1 fix path = option (b): consume pipeline-normalized values where coverage exists (266/1247), gracefully hide where not | Ships honest weather-adjusted numbers instead of relabeling raw bars; waits on Ismael only where coverage doesn't exist |
| 2026-06-03 | CDD normalization scoped to upstream pipeline, not panel | Joint HDD+CDD fit must happen on the daily/monthly data we don't have in this repo; panel just consumes the field once produced |
| 2026-06-03 | Improvements + errors lists revised after Ismael Q&A | `risk`/`ml_risk` semantics were inverted in earlier notes; `big_drop` labels not HDD-adjusted; `peer_score` has concurrent leakage; CV is non-stratified; HDD adjustment is achievable via citywide factor, not blocked on Ismael |
| 2026-06-03 | Tier 1 #1 fix is closer to (b-full) than (b-lite) | Citywide `hdd_factor` from `steam_trend_signals.json` lets us compute normalized per-year values ourselves — no pipeline dependency |
| 2026-06-03 | Pulled origin/main; commits 4222db2 + 222b89f bring major shipments | Uncertain tier, ll97_model.py, SteamSparkline, RiskTable filters, scope/requirements/schedule docs all landed. PR #4 now conflicts in BuildingPanel.jsx. |
| 2026-06-03 | Identified scope-doc vs. ConEd-asks contradiction | `docs/project-scope.md` explicitly out-of-scopes "automated email notifications" and "CRM integration" — direct contradiction with today's Tier 3 productization asks from ConEd. Needs team sync before in-person meeting week of June 9. |
| 2026-06-03 | peer_score reframe: rename to `cohort_attrition_share`, add owner-cohort variant, reframe as outreach prompt | Original spec sent to Ismael included owner-cohort dimension; geographic-only is the cropped version. Current naming + framing implies forecast capability the field can't support. Honest reframe + ACRIS-based owner extension recovers the original intent. |
| 2026-06-03 | Owner-cohort variant staged as v1/v2/v3 with honest data-quality + outreach-reality caveats | ACRIS owner names are messy (LLC fragmentation, name variants, institutional generics) — realistic exact-match coverage is 15–25%, fuzzy + address-of-record 30–40%, JustFix integration 50–60%. Field value also concentrated in ConEd's strategic-account slice where key account managers can act on portfolio signals; long-tail buildings lack the relationship infrastructure to convert the signal into outreach. Staged scoping prevents overselling the field's reach. |

---

## Refined improvement roadmap — after option (b) decision (2026-06-03), updated with Ismael's Q&A

This section captures the refined cut after (a) committing to option (b) for Tier 1 item #1 and (b) Ismael's Q&A which corrected several premises and surfaced new methodology gaps.

**Tier 1 #1 (the active work, kept here for completeness — not counted in numbered list below):** YoY steam bars in BuildingPanel are raw, not weather-adjusted. Replace with HDD-normalized values using the citywide `hdd_factor` already available in `steam_trend_signals.json` (1.031 for 2022, 1.227 for 2023, 2024 factor TBD). Adjustment is citywide HDD ratio, not per-building regression — label clearly. Where raw steam data is missing, hide the bars and surface a "weather-adjusted not available" note instead of silently dropping.

### Proposed improvements (excluding Tier 1 #1 YoY bars)

**Tier 1 — honesty patches (panel/viz side, our scope):**
1. ⚠️ PARTIAL — Show 2023→2024 comparison. **Ismael shipped SteamSparkline in commit 222b89f using 2022/2023/2024 from yearly.json**, but it's raw, not weather-adjusted. The data-coverage extension is done; the HDD layer is still open (collapses into Tier 1 #1).
2. ✅ SHIPPED — Uncertain risk bucket. Commit 222b89f added `isUncertain(b)` helper in `useBuildings.js`, purple Uncertain tier in `RiskTable.jsx`, and "Uncertain — score uses legacy heuristic" callout in `BuildingPanel.jsx`.
3. PARTIAL — Methodology footer. README now has a "Weather Normalization — Known Limitation" section disclosing the citywide HDD factor approach and weather contamination. **In-panel disclosure is still missing** — the README is for developers, not account managers reading the panel.
4. Surface coverage warnings inline — when no `steam_trend_signals` entry exists, say "no signal-tier label assigned" instead of silently hiding. HDD-normalized YoY% should still display from the citywide factor where raw steam data exists.
5. ✅ SHIPPED (for Uncertain only) — `risk` / `ml_risk` fallback visible. Uncertain badge in panel explicitly says "score uses legacy heuristic (building excluded from ML training due to missing features)". The 50 fallback buildings are now visually distinguished.

**Tier 2 — methodology (mostly Ismael's pipeline, raise at sync):**
6. Add CDD normalization to upstream signal pipeline (joint HDD+CDD regression). Panel will consume `cdd_pct` or combined field once produced.
7. Per-use-type HDD sensitivity as a proxy for per-customer regression.
8. Decline-acceleration as a model feature (we have 3 years of yearly data).
9. Slope stability / slope-intercept synchronization diagnostics (mirrors ConEd internal).
10. Extend `steam_trend_signals.json` coverage past 266 buildings — investigate why ~80% of buildings have no trend signal record, even where raw steam data exists.
11. Better validation reporting than headline AUC (precision@K, calibration curve).
12. Recompute `big_drop` / `mod_drop` labels on `hdd_pct_change`, not raw `pct_change`. Current labels are weather-contaminated — ~10–15% of apparent decline on 2023 cohort is the warm year. Retrain model on relabeled set.
13. Switch CV from random 5-fold to stratified 5-fold. With 5.4% positive class, random folds may produce uneven balance; AUC variance is hiding behind that.
14. Add temporal CV split where LL84 vintage depth allows (train on pre-2022 buildings, predict 2023). Current CV has feature/label vintage overlap.
15. **Rework `peer_score` — rename + extend, not just lag.** See "Conceptual rework: cohort_attrition_share" section below. Three changes bundled: (a) rename `peer_score` → `cohort_attrition_share` so the field name doesn't imply forecast capability it doesn't have, (b) extend beyond geographic neighbors to add an **owner-portfolio cohort** variant using ACRIS deed data already in the pipeline (this was the original intent in the spec sent to Ismael — geographic-only is the cropped version), (c) reframe the methodology disclosure: this is an *outreach prioritization signal* for human follow-up, not a forecast feature. Lagging the geographic version is a smaller follow-on win, not the main fix.
16. Calibrate the 0.7 / 0.4 tier thresholds against a held-out cohort or read them off the bimodal distribution gap explicitly (Youden, F1, or distribution-anchored). Current thresholds are eyeballed round numbers.

**Tier 3 — productization (today's ConEd asks):**
17. Per-building reasoning report (PDF/HTML) — feature contributions, narrative via Claude Haiku through existing `/api/query`, methodology footer, audit metadata.
18. Email agent — weekly digest to account managers, top-N at-risk in their territory, action buttons.
19. Feedback loop — manager responses become labeled data points.
20. Territory → manager mapping (infra prerequisite for #18).

**Tier 4 — blocked behind ConEd customer data NDA:**
21. Pursue Sho Ohata / Bidgely-style anonymized arrangement for customer-level billing.
22. Real precision/recall measurement against disconnect records.
23. Per-customer regression alignment with internal early-warning system.
24. Confusion matrix vs. actual disconnects.

### Errors / fixes (excluding Tier 1 #1 YoY bars)

**Code & data integrity:**
1. The displayed `risk` field for 50 buildings is hardcoded static data in `coned-3d-map/src/data/realData.js` (sibling repo). No generation script exists; the original heuristic formula is lost to history. Documented now via Ismael's Q&A but should be reflected in repo README.
2. ✅ FIXED — `ll97_model.py` now checked in (commit 222b89f, 330 lines). Includes LL97 penalty calculator with statute-derived intensity limits, plus the Gradient Boosting attrition classifier. The `ml_risk` lineage is no longer a black box.
3. PARTIAL — `ml_risk` / `risk` fallback is now visually disclosed for Uncertain buildings (✅ Tier 1 #5 shipped). Still open: cleaner imputation for the 50 fallback rows so they get an ML score too.
4. `steam_trend_signals.json` only has entries for 266/1247 buildings. The 21% gap is signal-tier labels, NOT HDD-adjustability — the citywide HDD factors apply to any building with raw steam data. Worth documenting the distinction.
5. Upstream sibling repo `coned-3d-map` referenced by `kmeans_model.py` lines 25–26 AND `ll97_model.py` (uses `steam-buildings.csv`, `steam_trend_signals.json`, `peer_scores.json` from the sibling) but not co-located — clone/symlink convention should be in README. README docs now mention the dependency in passing but don't give setup instructions.
6. `steam_2024` covers only 638 buildings vs `steam_2023`'s 743 — coverage is *shrinking* year-over-year, undocumented.
7. EUI medians hardcoded in `BuildingPanel.jsx` lines 3–10 — should be data-driven or at minimum sourced/dated.
8. ✅ PARTIAL — Data lineage now in README (README.md describes model layers and field origins). Still missing: per-field "where did this come from, when was it refreshed" table.

**Methodology:**
9. Risk threshold tiers (0.7 / 0.4) — round numbers, not from a Youden / F1 / calibrated cutoff. Defensible against the bimodal distribution but not derived from it. Document or recalibrate. *(Note: `recommendedAction` boundary aligned from 0.5 → 0.4 in commit 222b89f to match tier boundary.)*
10. AUC 0.645 is weak (close to random) and not surfaced anywhere in UI — users see "risk" with no confidence signal. README now discloses AUC for developers; in-panel disclosure still missing.
11. 209 "ambiguous" buildings excluded from training but predicted on at inference — classic selection bias, not addressed.
12. ✅ FIXED — Uncertain output category shipped in commit 222b89f (purple tier, `isUncertain` helper, in-panel disclosure).
13. No per-customer regression or proxy for slope stability.
14. No decline-acceleration feature despite having 3 years of data.
15. System prompt in `api/server.js` line 27 describes `risk` as "ML attrition probability" — accurate for 96% of rows but doesn't disclose the 4% heuristic fallback or the K-shape / 0.08 mean.
16. No CDD term anywhere in the normalization pipeline.
17. No display of prediction confidence, calibration, or "why this score" rationale (the reasoning-report ask directly addresses this).
18. `big_drop` / `mod_drop` labels are assigned on raw `pct_change`, not `hdd_pct_change`. ~10–15% of apparent decline on 2023 cohort is weather. Training labels are weather-contaminated. README discloses this limitation publicly but doesn't fix it.
19. CV is non-stratified random 5-fold despite 5.4% class imbalance. AUC variance across folds is hiding behind this.
20. No temporal CV split: features (LL84 CY2022) and 2022-vintage labels share data vintage.
21. `peer_score` is mislabeled and mis-scoped, not just temporally flawed. It's geographic-only (the spec sent to Ismael also included owner-portfolio cohorts — that part was dropped) and it's framed/named as if it were a predictive feature. The honest framing is "outreach prioritization signal: where on the map is attrition happening concurrently, so an account manager knows which neighbors to call." The methodology critique only bites when the dashboard or model presents it as a forecast input. Fix is naming + extension to owner-cohort + framing disclosure (see improvement #15). Lagging is a secondary follow-up to validate forward-prediction potential, not the main fix.

---

## Repo state snapshot after 2026-06-03 main pull

**New commits on `origin/main` since our branch was cut:**
- `4222db2` Fix .env loading in server — override inherited shell env vars (Greg's project key now takes precedence over shell-inherited keys).
- `222b89f` Add Uncertain tier, LL97 stats, signal filters, sparklines, SC segment CSV (large multi-file shipment).

**Files Ismael shipped in 222b89f:**
- `ll97_model.py` (NEW, 330 lines) — LL97 penalty calc + Gradient Boosting attrition model. This is the script that writes `ml_risk`. Reads from sibling `coned-3d-map/data/`.
- `build_comparison_csv.py` (NEW, 233 lines) — generates `~/Desktop/coned-data-comparison.csv` with BBL + estimated SC tariff class (SC-1 to SC-5, all marked with `*` as estimates) for ConEd's match against billing records.
- `docs/project-scope.md` (NEW) — in-scope / out-of-scope, timeline, success criteria, team roles.
- `docs/project-requirements.md` (NEW) — FR/NFR/DR catalog.
- `docs/project-schedule.md` (NEW) — sprint breakdown, open action items, risk register.
- `README.md` — Uncertain tier explanation, Weather Normalization gap disclosure.
- `src/components/BuildingPanel.jsx` (+104 lines) — SteamSparkline, LL97 Compliance section, Uncertain badge.
- `src/components/RiskTable.jsx` (+128/-37) — Uncertain tier filter, signal filter, LL97 filter, LL97 stats bar.
- `src/components/AIAgent.jsx` (+4 lines) — provider label fix, 10s AbortSignal timeout.
- `src/data/useBuildings.js` (+35 lines) — `has_ml_risk` flag, `isUncertain` helper, risk clamping in `riskTier`, `recommendedAction` threshold aligned to 0.4.
- `api/server.js` (+7 lines) — dotenv loading fix.

**Direct conflict with our PR #4:** Ismael removed our YoY bars (`s2022/s2023/yoyPct` block) and replaced with `SteamSparkline` component. Our PR's BuildingPanel changes are now stale. LL33 grade work is unaffected.

**Sprint 2 tasks officially assigned to Edwin (per `docs/project-schedule.md` + GitHub Issue #3):**
- ✅ Year-over-year sparkline (Ismael shipped it himself in 222b89f)
- 🔲 LL97 compliance gauge — horizontal progress bar in LL97 section: `b.ghg` vs `b.ll97_cap_2024`, green-if-under / red-if-over
- 🔲 `ml_risk` explanation tooltip — hover on score: "trained on observed steam demand drops (57 confirmed cases, AUC 0.645)"

**Critical dates:**
- **Week of 2026-06-09** — In-person ConEd review meeting (David handling logistics). Auth/password layer needed before sharing live URL.
- **2026-06-24** — MVP deadline, full public-data dashboard
- **2026-08-20** — Final build with ConEd billing data (gated on data sharing agreement)

**Key constraint surfaced:** `project-schedule.md` lists "Auth / password layer before sharing URL with ConEd" as Sprint 3 Not-Started (Ismael's task). This is blocking the in-person meeting next week.

## Gap: today's ConEd productization asks are NOT in the official docs

I grepped the entire repo for `reasoning`, `email agent`, `PDF`, `digest`, `feedback loop`, `notification`, `alert`, `per-building report`, `account manager`. Findings:

- **`docs/project-scope.md` Section 5 ("Out of Scope") explicitly lists:**
  - "Predictive alerts or automated email notifications"
  - "CRM integration"
  - These directly contradict today's ConEd asks (email agent + workflow-embedded decision support).
- **No mention of "reasoning report", "PDF generation", "feedback loop", or "manager response capture"** in any doc.
- **`wireframe-forecast-watchlist.html` exists** at repo root — a wireframe for a "Watch List" tab with an in-app alert feed (DOB permit, ownership transfer, LL84 update, LL97 threshold triggers). This is the *closest* existing artifact to the email-agent concept but it's (a) in-app, not email, (b) a wireframe, not implemented, and (c) doesn't include the PDF-report or feedback-loop elements.

**Interpretation:** The 2026-06-03 docs were either written before today's two ConEd calls or written without absorbing them. Either way, there is now a documented contradiction: the official scope says "no email notifications, no CRM integration" while ConEd's stated ask is exactly that.

**What this means for our work:**
- Tier 3 productization items (per-building reasoning report, email agent, feedback loop, territory→manager mapping) are NOT acknowledged by the team's official scope/requirements docs.
- This needs to be raised at the next team sync — *before* June 24 MVP, ideally before the in-person ConEd meeting next week — so scope can be amended or the team can explicitly defer these to a Phase 2.5 / Phase 3.
- If David is in the in-person meeting and ConEd asks "where's the reasoning report we discussed?" the team will be caught out unless this is resolved.

**Decisions needed:**
- Are Tier 3 items in scope for June 24 MVP, in scope for August 20 final build, or deferred to a separate Phase 3?
- If in scope: scope.md needs amendment, schedule needs new sprint allocations, requirements doc needs FR-10+ items.
- If deferred: who tells ConEd, and when?

---

## Conceptual rework: peer_score → cohort_attrition_share

**Context.** The current `peer_score` field is a geographic-only, contemporaneous fraction of nearby buildings showing attrition signals. It sits at 13% feature importance in the GBM model and is currently presented as if it were a predictive feature. That framing has two problems and one historical wrinkle worth recording.

**The historical wrinkle.** Edwin's original spec sent to Ismael included an **owner-portfolio cohort** dimension — buildings owned by the same LLC / management company / REIT tend to make conversion decisions in batches because they share capital plans, contractors, and LL97 strategy. What shipped is the geographic-cohort slice only. The portfolio dimension was cropped from the implementation; the geographic slice alone is the weaker proxy for what the field was meant to capture.

**The two problems with the field as-shipped:**

1. **Mis-framed as predictive.** A contemporaneous geographic peer_score measures "is attrition happening in this cluster right now?" It does *not* validate that neighbor churn precedes target churn. The model's training and CV never tested time-precedence, so the 13% importance shouldn't be read as a leading indicator.
2. **Mis-named.** "peer_score" implies a ranking or risk number, which it isn't. It's a co-occurrence density measurement. The naming bakes in a forecast claim the field can't support.

**Honest reframe of what the field is actually for.** The contemporaneous geographic version IS operationally useful — just not as an autonomous predictor. It's a prompt for human outreach: *"three of your customers on this block are showing signals; the other six aren't. Maybe call the six."* That's an actionable cluster, and it justifies the old-fashioned early-warning method — pick up the phone, ask the customer what's going on, gather the data the model can't see. ConEd's account managers are the early-warning system. Our job is to point their phones at the right blocks (and owners).

**Proposed renaming and structure.**

Primary: rename `peer_score` → `cohort_attrition_share`. The name says what the value measures (the share of a cohort showing attrition signals) without claiming forecast capability. Subtypes fall out naturally:

- `geographic_cohort_attrition_share` — current implementation, fraction of geographic neighbors with attrition signals. Reframed as an outreach trigger, not a forecast input.
- `owner_cohort_attrition_share` — new, fraction of an owner's portfolio with attrition signals. Buildable from ACRIS deed data already in the pipeline. This is the original-spec dimension that was cropped.

UI label proposal: "Cluster activity" or "Cohort attrition share" — explicitly framed as an outreach prompt, not a risk number. On the building panel, show both subtypes side-by-side where data exists, with a one-line plain-English caption per cluster ("3 of 6 buildings owned by ACME Realty LLC are showing big_drop signals").

**Why owner-cohort is the higher-value extension.** Geographic proximity is a *proxy* for what we actually care about: common decision-makers. Owner-level cohort signal is closer to the causal mechanism:

- Same owner = same capital plan, same boiler RFP, same compliance analysis covering multiple properties
- One owner converting Building A is a stronger signal about Buildings B, C, D in the same portfolio than about Buildings X, Y, Z three doors down with a different owner
- ACRIS data is public — no NDA gate, no ConEd billing data required
- Conversion-cascade alerts become possible: "Owner X just sold/converted a steam building → here are the N other steam buildings Owner X still owns"

**Implementation sketch (not for me to build solo — Ismael's pipeline territory):**

1. Build an ownership index from ACRIS grantor/grantee data already touched by the pipeline. Output: `owner_id` field on each building, plus a `building_count` per owner.
2. Compute `owner_cohort_attrition_share` = (buildings owned by same `owner_id` with `signal in (big_drop, mod_drop)`) / (total buildings owned by same `owner_id`). Threshold for "owner exists" should be ≥2 buildings.
3. Optionally compute lagged versions for both subtypes once multi-year `steam_trend_signals.json` depth allows.
4. Surface both fields in BuildingPanel under a "Cluster Activity" section. Suppress when cohort size is too small for the share to be meaningful.

**What this is NOT.** It's not a new ML feature pipeline (though the owner-cohort variant *could* be added to the GBM later, with proper lagging to avoid the same leakage critique). It's first a **display + naming + framing fix**, second an **operational outreach signal**, and third a *potential* model-feature improvement only after we've validated it doesn't repeat the contemporaneous-leakage pattern.

**What to raise at the next team sync.**

- Rename `peer_score` → `cohort_attrition_share` (or pick another name; flag this as a naming decision needed)
- Add owner-cohort variant as a Tier 2 work item, owned by Ismael since it touches the data pipeline
- Reframe the README's feature-importance table caveat: "13% importance reflects concurrent geographic co-movement, not a validated leading indicator. Used in the dashboard as an outreach-prioritization signal, not as a standalone forecast feature."
- Acknowledge openly: the original spec included owner-cohort and that part was cropped during implementation — no blame, just record the gap so the rebuild brings the full concept back.

### Honest assessment: owner-cohort data quality & ConEd outreach reality

Before scoping the owner-cohort variant as a work item, two reality checks worth recording so we don't oversell what's achievable or what ConEd can do with it.

**Data-quality reality — ACRIS owner names are messy.**

The listed owner on a NYC deed is rarely a clean "one human, one portfolio" mapping. Expect roughly this breakdown:

- **Shell LLCs per property.** Many Manhattan owners use a separate LLC per building ("123 East 42nd LLC", "125 East 42nd LLC"). Same beneficial owner, different ACRIS strings. Naive grouping by `owner_name` will see them as unrelated.
- **Generic / institutional names.** "Trustee", "Estate of", religious / nonprofit institutional names, large management companies that act on behalf of many actual owners.
- **Name variants for the same entity.** "ACME REALTY LLC" vs "ACME REALTY, LLC" vs "ACME RLTY LLC" — string-matching alone will miss real portfolios.
- **Address-of-record overlap.** Sometimes a shared address-of-record on the deed is a better grouping signal than the owner name itself.
- **Owner-of-record vs decision-maker drift.** Title may sit with a family trust while operational decisions sit with the asset manager — neither is in ACRIS in a clean form.

Realistic coverage estimates if we try to build `owner_cohort_attrition_share`:

| Approach | Estimated portfolio detection rate | Notes |
|---|---|---|
| Exact `owner_name` string match | 15–25% of buildings land in a multi-building cohort | Underestimates real portfolios because of LLC fragmentation |
| Fuzzy match + address-of-record | 30–40% | Recovers most string-variant cases |
| Integrate JustFix "Who Owns What" beneficial-owner data | 50–60% | JustFix has done the LLC-unmasking work for residential; commercial coverage weaker |
| With a contracted data vendor (RealCapitalAnalytics, etc.) | 70%+ | Out of scope for the capstone |

**What this means for the field's value.** Even at the 30–40% range, the cohort signal is meaningful *for the buildings where it does fire* — those are the ones where we can credibly say "this is a portfolio decision pattern, not a single-building event." For the remaining 60–70%, the field is simply absent (not wrong), which is more honest than the geographic-only proxy that always fires regardless of whether geographic neighbors share any real decision linkage.

**ConEd outreach reality — who actually gets called.**

The portfolio signal only translates into value if ConEd can act on it. Two-track reality:

- **Building owner is usually NOT the day-to-day steam contact.** That's the property manager / building engineer / billing AP clerk. They handle "the boiler is acting up", not "should we convert off steam".
- **Building owner / asset manager / sustainability director IS the conversion decision-maker.** Capital plans, LL97 compliance strategy, and decarbonization commitments live at that level. A portfolio attrition signal speaks to *this* audience, not the operational contact.
- These are two different humans inside the same customer organization, and ConEd's account team has to maintain both relationships to be effective.

How this maps to ConEd's account structure:

- **Major / strategic customers (top of the risk table):** ConEd typically has a named **key account manager** whose explicit job is the executive-level relationship. They either already know the asset manager / sustainability director / VP of facilities at the parent entity, or they have the institutional seniority and motivation to develop that contact. For these customers, the portfolio signal is a directly usable escalation trigger — the relationship to act on it already exists or is straightforward to build.
- **Smaller / non-strategic customers (long tail of the risk table):** Many of the ~1,260 buildings don't get a named account manager — they're pooled into general business-customer support, which often only has property-manager / billing-level contact info. For these, the portfolio signal is a hint that ConEd *should develop* a strategic relationship that doesn't currently exist. That's slower, harder, and depends on ConEd's internal willingness to invest BD effort.

**What this means for how we position the field.** The portfolio signal is most actionable for the strategic-account slice of the customer base. For the rest, it's longer-horizon intelligence — "this owner is worth knowing strategically" — not "make a call this week." The dashboard's job stays the same in both cases: surface the pattern, name the parent entity where we can identify it, and let ConEd's account team decide whether the relationship work is worth the investment. We do not pretend to know who to call. The relationship work (figuring out who at ACME Holdings to email) is ConEd's account team's job; we provide the trigger and the cohort breakdown.

**Scoping recommendation — v1 / v2 / v3.**

Given both the data-quality and outreach realities, a staged build is more honest than committing to a "portfolio attrition rate" field upfront:

- **v1 (achievable now, low effort):** Display `geographic_cohort_attrition_share` reframed and renamed. Honest framing: "outreach prioritization signal." No claim of forecast capability. UI caption: "N of M buildings within X blocks are showing attrition signals."
- **v2 (pipeline work, Ismael's territory):** Add `owner_cohort_attrition_share` from ACRIS exact-match + address-of-record grouping. Expect 30–40% coverage. Suppress display where cohort size < 2 or where owner is institutional/generic. UI caption names the owner string explicitly: "3 of 6 buildings listed under ACME REALTY LLC show attrition signals." Document the coverage gap directly in the panel.
- **v3 (stretch, may not happen in capstone):** Integrate JustFix or comparable beneficial-owner unmasking to push coverage past 50%. Adds a "linked LLCs" disclosure: "ACME REALTY LLC is linked to 3 other shell LLCs covering 9 additional buildings, of which 4 show attrition signals."

**Honest disclosure to ship alongside the field:** "Portfolio cohort detection covers approximately N% of buildings in this dataset. For the remainder, the listed owner is either a per-property shell LLC, an institutional/generic name, or not present in our matching dictionary. Absence of a portfolio signal does not mean the building has no portfolio context — it means we cannot confidently identify one from public data."

**What to raise at the next team sync (additions to the list above):**

- Confirm v1/v2/v3 scoping before treating the owner-cohort variant as a shippable feature
- Decide whether JustFix integration is in scope for August 20 build or deferred
- Acknowledge that the field's value is concentrated in the strategic-account slice — discuss with David whether ConEd's account structure can actually act on it for the long-tail buildings, and whether that affects how prominently we surface it
