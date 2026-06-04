# Project Scope — ConEd Steam Attrition Dashboard

**Team:** Pursuit Fellowship Data Team  
**Client:** Con Edison (ConEd) Steam Customer Retention  
**Last Updated:** 2026-06-03  

---

## 1. Project Overview

A web-based decision-support tool for Con Edison's steam customer retention team. The dashboard identifies which steam customers are most likely to disconnect — and why — using NYC public data, so account managers can prioritize outreach before a customer files a boiler permit.

---

## 2. Problem Statement

ConEd district steam serves approximately 1,260 buildings in Manhattan below 90th Street. Customers who switch to onsite boilers or heat pumps permanently reduce ConEd's steam revenue. Currently, account managers have no systematic way to identify at-risk accounts before disconnection occurs.

---

## 3. Proposed Solution

A data pipeline + dashboard that:
- Scores each building's attrition risk using an ML model trained on real observed steam demand drops
- Visualizes the 1,260-building customer portfolio on a 3D map with risk overlays
- Surfaces regulatory pressure (LL97 carbon penalties) as an attrition driver
- Clusters buildings into behavioral archetypes for segment-level strategy
- Enables natural language querying of the portfolio via AI (LLM filter spec)

---

## 4. In Scope

| Feature | Status |
|---|---|
| LL84-sourced steam/energy data (CY2022) for 1,260 buildings | Complete |
| K-means customer archetypes (5 clusters) | Complete |
| LL97 penalty calculator (2024 and 2030 caps) | Complete |
| Supervised attrition risk model (Gradient Boosting, AUC 0.645) | Complete |
| Attrition risk table with filtering and CSV export | Complete |
| Building detail panel (energy, LL97, archetype, risk score) | Complete |
| AI Agent tab — natural language query via Claude/Groq | Complete |
| Year-over-year steam trend sparklines (yearly.json) | In Progress |
| LL97 compliance stats bar (total buildings over cap, combined penalty) | In Progress |
| 3D map integration (coned-3d-map repo) | Separate repo — In Progress |

---

## 5. Out of Scope

- ConEd billing data or meter-level consumption (requires ConEd data sharing agreement)
- Predictive alerts or automated email notifications
- CRM integration
- Buildings outside Manhattan below 90th Street
- Non-steam energy products (electricity, gas accounts)

---

## 6. Data Sources

| Dataset | Source | Fields Used |
|---|---|---|
| LL84 Benchmarking (CY2022) | NYC Open Data `5zyy-y8am` | Steam kBtu, GHG emissions, floor area, Energy Star score |
| DOB NOW Permits | NYC Open Data `w9ak-ipjd` | HVAC/boiler permit count per building |
| ACRIS Deed Records | NYC Open Data `8h5j-fqxa` | Recent ownership transfers |
| MapPLUTO | NYC DCP | BBL, year built, lat/lon, use type |
| LL84 CY2023, CY2024 | NYC Open Data | Year-over-year trend |

All data is public. No ConEd proprietary data has been used in the current build.

---

## 7. Timeline

| Milestone | Target Date | Owner |
|---|---|---|
| MVP with public data (mock ConEd portfolio) | June 24, 2026 | Full team |
| In-person ConEd review meeting | Week of June 9, 2026 | David (logistics), full team |
| Data sharing agreement / ConEd data access | TBD (David + Johan + Ildi + Claire call) | David |
| Full build with real ConEd billing data | August 20, 2026 | Full team |
| Final presentation / Demo Day | TBD | Full team |

---

## 8. Success Criteria

### Technical Acceptance Criteria (June 24 MVP)

1. Dashboard loads 1,260 buildings with risk score, LL97 penalty, and archetype for every record
2. Attrition risk model achieves AUC ≥ 0.60 on cross-validated public data
3. AI Agent tab correctly translates ≥ 5 representative natural language queries into accurate filter specs
4. CSV export is free of formula injection vulnerabilities
5. No API keys exposed in client-side JavaScript bundle
6. All data is sourced from NYC Open Data (publicly verifiable)

### Business Acceptance Criteria (August 20 final build)

1. ConEd can match dashboard buildings to their internal accounts using BBL as the join key
2. Risk scores correlate with ConEd's known at-risk accounts at a rate ≥ 60%
3. LL97 penalty estimates are within 15% of ConEd's own compliance calculations
4. Account managers can filter and export a target list in under 2 minutes
5. Tool has been reviewed and approved by ConEd's data/compliance team

---

## 9. Team Roles

| Person | Role | Responsibilities |
|---|---|---|
| Ismael Caraballo | Lead / Data Engineer | ML models, data pipeline, backend API, architecture |
| Pedro (Pamf1973) | Frontend | LL97 stats bar, compliance filter dropdown, scope document |
| Edwin (edpursuing) | Frontend | Year-over-year sparklines, LL97 gauge, risk tooltip |
| Greg Devica | Pursuit Advisor | API key sponsorship, stakeholder liaison |
| David | PM / ConEd liaison | Meeting logistics, data sharing coordination |

---

## 10. Assumptions and Constraints

- ConEd billing data may not be available before the August 20 deadline; the tool must remain useful with public data alone
- API key (Claude Haiku) is rate-limited to 30 queries/minute; sufficient for demo use, not production scale
- The MacBook Air M4 (Pursuit loaner) used for development will be returned; project should be reproducible on any machine from the repo
- LL97 penalty calculations are estimates based on LL84-reported GHG and public intensity limits; they are not legal advice
