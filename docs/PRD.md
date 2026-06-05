# Product Requirements Document
# ConEd Steam Attrition Intelligence Dashboard

**Version:** 1.0  
**Date:** 2026-06-05  
**Author:** Pursuit Fellowship Data Team  
**Status:** Phase 1 — MVP (target June 24, 2026)

---

## 1. Executive Summary

Con Edison's district steam system serves approximately 1,260 commercial and residential buildings in Manhattan below 90th Street. When a customer installs an onsite boiler and disconnects, that revenue stream is permanently lost. Currently there is no systematic way to identify at-risk accounts before the customer files a Department of Buildings permit.

This dashboard provides ConEd's retention team with an ML-powered early warning system built entirely from NYC public data. Phase 1 surfaces which accounts are most likely to disconnect — and why — so outreach can happen before the decision is made.

---

## 2. Users

### Primary: ConEd Account Manager
- Manages a portfolio of steam customers in Manhattan
- Needs to know which accounts require a retention call this quarter
- Works from account lists, not maps or dashboards currently
- Thinks in ConEd tariff classes (SC-1 through SC-5), not LL84 use types
- Key workflow: identify high-risk accounts → schedule outreach → log retention activity

### Secondary: ConEd Steam Operations Leadership
- Needs portfolio-level visibility: how many accounts at risk, what's the combined revenue exposure
- Wants to see LL97 compliance pressure as a forward-looking retention indicator
- Presenting to VP/C-suite: needs clean summary numbers (60 high-risk buildings, $86.8M in combined LL97 fines)

### Phase 2 User: ConEd Data / Analytics Team
- Will validate model outputs against internal billing records
- Will provide data for model retraining under the data sharing agreement
- Primary matching key: BBL (Borough-Block-Lot)

---

## 3. Problem Statement

### Current State
ConEd uses an internal early-warning model based on monthly billing data with per-building HDD/CDD weather regression. It produces Low/Medium/High/Uncertain tiers. However:
- The model requires internal billing data unavailable to third parties
- No external visibility into which buildings are in which tier
- No integration with public signals (LL97 compliance, DOB permit activity, peer behavior)
- Account managers receive a list, not an explanation

### Desired State
A dashboard that:
1. Surfaces the same risk tiers ConEd already uses (High/Medium/Low/Uncertain)
2. Shows *why* a building is at risk — which signals are driving the score
3. Integrates public regulatory pressure (LL97 fines) as a forward-looking signal
4. Allows account managers to filter and export target lists in under 2 minutes
5. Improves materially when ConEd billing data is added (Phase 2)

---

## 4. Goals and Non-Goals

### Goals — Phase 1 (June 24, 2026)
- Identify the top 60 high-risk accounts from public data alone
- Surface LL97 compliance pressure as a retention-relevant signal
- Enable account managers to filter by risk tier, use type, and regulatory status
- Produce a BBL-keyed comparison CSV that ConEd can match to internal accounts
- Align tier language with ConEd's internal classification (High/Medium/Low/Uncertain)

### Goals — Phase 2 (August 20, 2026)
- Retrain model with ConEd-verified disconnection labels
- Add actual SC tariff class as a model feature (strongest single predictor)
- Match LL97 penalty estimates to ConEd's own compliance calculations
- Deploy behind auth with ConEd team access

### Non-Goals
- Full-portfolio steam usage forecasting (requires internal billing data, explicitly out of scope per ConEd)
- CRM integration or automated account alerts
- Buildings outside Manhattan below 90th Street
- Non-steam energy products

---

## 5. Features

### 5.1 Attrition Rankings Table
**Priority:** P0  
The primary view. 1,260 buildings sorted by attrition risk score.

**Filters:**
- Risk tier (High / Medium / Low / Uncertain)
- Building use type (8 LL84 categories)
- Customer archetype (5 K-means clusters)
- Demand signal (Big Drop ≥50% / Mod Drop / No Signal)
- LL97 compliance (All / Over Cap / Compliant)
- Steam demand range (min/max M kBtu)
- Address search

**Stats bar (live-updating with filters):**
- High / Medium / Low / Uncertain counts
- Buildings over LL97 cap
- Combined LL97 annual fine

**Sorting:** All columns sortable. Default: risk descending.

**CSV Export:** One-click export of visible rows with BBL, risk score, LL97 penalties, SC segment estimate.

### 5.2 Building Detail Panel
**Priority:** P0  
Slide-out panel on row click. Shows the full story behind a building's score.

**Sections:**
- Attrition Risk (large %, tier badge, Uncertain explanation if applicable)
- Top Signal (Big Drop with HDD-normalized % change, Mod Drop, or no signal)
- Peer Attrition Zone (% of cluster neighbors showing signals)
- Customer Archetype (K-means cluster name + description)
- LL97 Carbon Compliance (2024 penalty, 2030 penalty, visual gauge vs. cap)
- Energy & Demand (steam trend bar chart 2022/2023/2024, steam EUI, Energy Star score, LL33 grade)
- DOB Activity (HVAC/boiler filing count)
- Ownership (last deed transfer, sale price if available)

### 5.3 AI Agent Tab
**Priority:** P1  
Natural language query interface for ConEd account managers who prefer search over filters.

**Examples:**
- "High risk hotels with HVAC permits filed"
- "Office buildings over their LL97 limit with big steam drops"
- "Buildings facing more than $100k LL97 penalty in 2024"

**Implementation:** User query → backend proxy → Claude Haiku (structured JSON filter spec) → applied client-side.  
**Rate limit:** 30 queries/minute per IP.  
**Security:** API key server-side only, never in browser bundle.

### 5.4 Year-over-Year Steam Trend
**Priority:** P1  
Horizontal bar chart in Building Detail Panel showing steam demand for available years (2022/2023/2024). Color-coded by trend direction. Context label ("Sharp drop — possible disconnect underway", "Stable demand", etc.).

### 5.5 LL33 Energy Grades
**Priority:** P2  
Letter grade (A/B/C/D) derived from Energy Star score per NYC Local Law 33. Shown in Building Detail Panel. 849 of 1,247 buildings have coverage.

---

## 6. Risk Score Definition

**`ml_risk`** (0–1): Output of Gradient Boosting Classifier trained on 57 confirmed steam demand drops (≥50% HDD-normalized decline) vs. 989 no-signal buildings.

| Tier | Threshold | Count | Description |
|---|---|---|---|
| High | > 0.70 | 58 | Converging signals — LL97 pressure, DOB permits, peer attrition, demand decline |
| Medium | 0.40–0.70 | 8 | Early signals present, monitor |
| Low | < 0.40 | 1,144 | No significant signals |
| Uncertain | N/A | ~50 | Insufficient data for ML model (fallback to legacy heuristic) |

**Model performance:** Cross-validated AUC 0.672 ± 0.056 using public data only.  
**Model limitation:** AUC reflects public data ceiling. ConEd billing data (Phase 2) is expected to push AUC to 0.75–0.85.

---

## 7. Data Sources

| Dataset | Source | Refresh |
|---|---|---|
| LL84 Benchmarking | NYC Open Data `5zyy-y8am` | Annual (CY2022 current) |
| DOB NOW Permits | NYC Open Data `w9ak-ipjd` | Quarterly |
| MapPLUTO | NYC DCP | Annual |
| LL84 CY2023/2024 (trend) | NYC Open Data | Annual |
| ConEd billing data | Via data sharing agreement | TBD — Phase 2 |

All Phase 1 data is public and verifiable. No ConEd proprietary data has been used.

---

## 8. Success Criteria

### Phase 1 — Technical (June 24, 2026)
- [ ] Dashboard loads 1,260 buildings with risk score, LL97 penalty, and archetype for every record
- [ ] ML model AUC ≥ 0.65 on cross-validated public data *(current: 0.672)*
- [ ] AI Agent correctly translates ≥ 5 representative queries into accurate filter specs
- [ ] CSV export free of formula injection, all 1,260 rows have BBL
- [ ] No API keys in client-side JavaScript bundle
- [ ] Deployed behind auth before sharing URL with ConEd

### Phase 2 — Business (August 20, 2026)
- [ ] ConEd can match ≥ 90% of dashboard buildings to internal accounts via BBL
- [ ] Risk scores correlate with ConEd's known at-risk accounts at ≥ 60%
- [ ] LL97 penalty estimates within 15% of ConEd's own compliance calculations
- [ ] Account manager can filter and export a target list in under 2 minutes
- [ ] Tool reviewed and approved by ConEd data/compliance team

---

## 9. Timeline

| Milestone | Date | Owner |
|---|---|---|
| In-person ConEd review meeting | June 9, 2026 | David (logistics) |
| Auth layer deployed | Before June 9 | Pedro |
| MVP — public data build complete | June 24, 2026 | Full team |
| Data sharing call (ConEd + Pursuit) | TBD July | David |
| ConEd billing data received | TBD | ConEd |
| Phase 2 — full build with ConEd data | August 20, 2026 | Full team |

---

## 10. Open Questions

| Question | Owner | Status |
|---|---|---|
| NDA / data sharing process — what did Sho Ohata do for Bidgely? | David | Pending |
| Will SC tariff class be shared as part of billing data? | David / Ildi | Pending |
| Is ConEd's internal AUC for their own model available for comparison? | Johan/Ildi | Meeting agenda |
| What account count qualifies as "high risk" in ConEd's current system? | Johan/Ildi | Meeting agenda |
| Will LL97 penalty estimates need to match DOB's official calculations? | Ismael | Phase 2 |

---

## 11. Dependencies

- **Auth layer** (Pedro) — blocker for sharing live URL with ConEd
- **Data sharing agreement** (David + legal) — blocker for Phase 2 model retraining
- **NYC LL84 CY2024 release** — needed for full 3-year trend data (currently 418/1,260 buildings have all 3 years)
- **Greg Devica API key** — Claude Haiku key for AI Agent tab; rotate after project
