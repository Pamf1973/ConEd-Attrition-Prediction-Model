# Project Schedule — ConEd Steam Attrition Dashboard

**Team:** Pursuit Fellowship Data Team  
**Client:** Con Edison  
**Last Updated:** 2026-06-03  

---

## Phase Overview

| Phase | Period | Goal |
|---|---|---|
| Phase 1 — MVP (Public Data) | Now → June 24, 2026 | Working dashboard with all public-data features |
| Phase 2 — ConEd Data Integration | July → August 20, 2026 | Retrain model with real billing data, ConEd-verified output |

---

## Phase 1 — Sprint Breakdown

### Sprint 1: Core Features (complete by June 10)

| Task | Owner | Status |
|---|---|---|
| ML attrition model (Gradient Boosting, AUC ≥ 0.60) | Ismael | ✅ Complete (AUC 0.645) |
| LL97 penalty calculator (2024 + 2030) | Ismael | ✅ Complete |
| K-means customer archetypes (5 clusters) | Ismael | ✅ Complete |
| Attrition Rankings table with filtering | Ismael | ✅ Complete |
| Building Detail Panel (energy, LL97, archetype) | Ismael | ✅ Complete |
| AI Agent tab — natural language query | Ismael | ✅ Complete |
| Backend API proxy (API key security) | Ismael | ✅ Complete |
| CSV export (injection-safe) | Ismael | ✅ Complete |
| yearly.json — multi-year steam trend data | Ismael | ✅ Complete |
| In-person ConEd review meeting | David (logistics) | 📅 Week of June 9 |

### Sprint 2: Team Features (complete by June 17)

| Task | Owner | Status |
|---|---|---|
| LL97 compliance stats bar (# over cap, combined penalty total) | Pedro | 🔲 Not started |
| LL97 compliance filter dropdown in RiskTable | Pedro | 🔲 Not started |
| Year-over-year sparkline in BuildingPanel | Edwin | 🔲 Not started |
| LL97 compliance gauge (visual) | Edwin | 🔲 Not started |
| ML risk score tooltip (hover explanation) | Edwin | 🔲 Not started |
| Project scope document (section 7 + success criteria) | Pedro + Ismael | ✅ Complete |
| Project requirements document | Ismael | ✅ Complete |
| Project schedule document | Ismael | ✅ Complete |

### Sprint 3: Polish + Demo Prep (June 17 → June 24)

| Task | Owner | Status |
|---|---|---|
| Auth / password layer before sharing URL with ConEd | Ismael | 🔲 Not started |
| Data comparison CSV for ConEd account team | Ismael | 🔲 Not started |
| 3D map integration (coned-3d-map) | Ismael | 🔲 In progress (separate repo) |
| Final data quality pass (BBL completeness, coordinate check) | Ismael | 🔲 Not started |
| Demo script and walkthrough notes | Full team | 🔲 Not started |
| MVP presentation to Greg + Pursuit leadership | Full team | 📅 5:30 PM checkpoint call |

---

## Phase 2 — ConEd Data Integration (July–August)

| Task | Owner | Target |
|---|---|---|
| Data sharing agreement signed | David + ConEd legal | TBD |
| ConEd billing data received (BBL-keyed) | David + Johan/Ildi/Claire | TBD |
| Join ConEd account data to public dataset via BBL | Ismael | Within 1 week of data receipt |
| Retrain attrition model with verified churn labels | Ismael | Within 2 weeks of data receipt |
| Update LL97 penalty estimates using ConEd actual GHG readings | Ismael | Within 2 weeks of data receipt |
| Stakeholder review of updated model | Full team + ConEd | TBD |
| Final build deployment | Ismael | August 20, 2026 |

---

## Key Dates

| Date | Event |
|---|---|
| June 9 week | In-person ConEd meeting (David handling sign-in) |
| June 24, 2026 | **MVP deadline — full public-data dashboard** |
| TBD (July) | ConEd data sharing call (David + Johan + Ildi + Claire) |
| August 20, 2026 | **Final build with real ConEd data** |

---

## Open Action Items from Checkpoint Meeting

| Action | Owner | Due |
|---|---|---|
| Fix section 7 of scope + add timeline + acceptance criteria | Pedro + Ismael | ✅ Done |
| Schedule data questions meeting with Johan, Ildi, Claire | David | ASAP |
| Confirm in-person meeting logistics + sign-in | David | Before June 9 |
| Add auth/password before sharing live URL with ConEd | Ismael | Before in-person meeting |
| Rotate Greg's API key (was shared in chat) | Greg | ASAP |
| GitHub Issues: Pedro (Issue #2) and Edwin (Issue #3) | Ismael | ✅ Done |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ConEd data sharing agreement delayed | Medium | High | Dashboard remains useful with public data alone; model retrain is Phase 2 |
| LL84 2023/2024 data not yet available for all buildings | Low | Low | yearly.json covers 1,210 of 1,260 buildings; gaps clearly labeled |
| API key rate limit exceeded during demo | Low | Medium | 30 req/min limit; demo uses pre-queried results as backup |
| MacBook Air returned before project completes | Medium | Low | Repo is fully reproducible; migrate to Mac mini M4 |
| ConEd requests features outside current scope | Medium | Medium | Document in issues; defer to Phase 2 unless trivial |
