# ConEd Steam Attrition Dashboard — Project Context & Decision Brief
**Date:** 2026-06-22
**Audience:** future Edwin, the rest of the team, and any AI agent picking this project up cold
**Local-only:** do not commit, do not push

This is a decision aid, not a chronological recap. Read top-to-bottom once for orientation; after that, jump to the section that matches the decision you're making.

---

## 1. What this project is

| | |
|---|---|
| **Name** | ConEd Steam Customer Drop-Off Predictor (working name: Driftwatch) |
| **Type** | Pursuit data-fellowship capstone for Con Edison's steam team |
| **Goal** | Flag steam customers at high risk of significant usage drop-off so the steam team can intervene and forecast more accurately |
| **Stack** | React 19 + Vite 8 (UI), Express 5 + Helmet + express-rate-limit (API), Tailwind 4, Recharts, Python data pipeline (k-means + GB classifier + SHAP) |
| **Repo root** | `/Users/Pursuit/Pursuit_Projects/coned-dashboard/` |
| **Active branch** | `main` — the `edwin/ll97-gauge-and-shap-drivers` branch merged sometime between Jun 13 and Jun 17 |
| **Dev command** | `npm run dev` (runs `node api/server.js` and `vite` concurrently) |
| **Data scope** | 1,210 NYC steam customers below 90th Street, 3 years of LL84 yearly data (2022–2024) |
| **Demo Day** | Wed 2026-06-24, 6 PM ET at Blackstone |
| **Team** | Pedro Martins (front end + project), Edwin Perez (product + analytics), Ismael Caraballo (data + ML); David Caiafa is the ConEd PM |

---

## 2. Index of local context docs

All paths relative to the repo root above. None of these are committed to git — they live only on local.

| File | What it covers | When to read |
|---|---|---|
| `BLACKSTONE_PRESENTER_GUIDE.md` | Stage prep: system explainer (data → ML → UI → workflow), per-component definitions, glossary, 22-question Q&A | Before any presentation rehearsal or stage walk-through |
| `CONED_METHODOLOGY_ALIGNMENT.md` | Gap analysis vs Ildi/Johan specs; per-customer HDD/CDD regression we don't have; effort estimate to converge | Before any conversation that touches model defensibility or ConEd-methodology comparison |
| `DEMO_TODAY_TACTICAL.md` | Tactical brief for the Jun 13 internal demo; **uses the older "client-targeting tool" framing** that we have since reverted to "drop-off predictor" | Reference only — historical context. Do not use its language directly. |
| `PIVOT_NEXT_WEEK_STRATEGIC.md` | Strategic brief for an archetype-landscape-forward redesign; describes a "drift-within-archetype" UI and a per-archetype churn rate that **may or may not have shipped** | Before deciding what to claim about the current UI; verify against live build |
| `SMOKE_TEST_REPORT_2026-06-13.md` | Programmatic test run from internal demo day; documents the original drift between docs and live build | Reference only — most flagged items have since been resolved in code, but the password-drift item still applies to `SMOKE_TEST.md` |
| `PROJECT_CONTEXT_2026-06-22.md` | This file | Right now |

Tracked at repo root (not local-only, listed for completeness): `README.md`, `SMOKE_TEST.md`, `NEO_TEST_SUITE.md`.

Untracked at repo root but not a doc: `analysis/` (CSVs for an early-warning-cohort workstream, plus `threshold_proximity_spike.py`).

---

## 3. Build state as of today

### 3a. What shipped between Jun 13 and Jun 22

| Commit theme | What changed |
|---|---|
| `feat: proactive alert engine` | Bell badge, banner, and alerts panel in the UI — the "alert engine already in place" Edwin's script references |
| `fix: hoist LLM keys + retry backoff for alert enrichment` | Server-side LLM enrichment of alerts now has retry logic |
| `feat: audit P0 + P1` | Click-to-filter charts, Toast, keyboard shortcuts, URL state, pagination, multi-sort, bulk select, trend chart, watchlist import/export, `/api/buildings` endpoint |
| `feat: server-side watchlist sync + TrendChart LL97 cap line` | Watch List persists server-side, not just localStorage |
| `fix: remove dead Uncertain tier — 100% ML coverage confirmed` | **Uncertain tier was intentionally removed as dead code.** 100% of buildings now get a confident tier. This closes the README/live drift the smoke test flagged, but it also removes one of the methodological alignment hooks with ConEd's framework. |
| `fix: pre-Blackstone security hardening + code quality fixes` | Pre-presentation cleanup |
| `fix: hallucination guards, cluster name correction, projected yoy deltas backfill` | Tightening on the LLM agent path |

Test suite: **20/20 passing** as of last commit.

### 3b. Presentation materials state

| Asset | Path | State |
|---|---|---|
| Deck | `/Users/Pursuit/pursuit_projects/coned-dashboard-PRESENTATION.html` | 8 slides; light theme + teal; team photos integrated; "drop-off predictor" framing throughout |
| Script | `/Users/Pursuit/pursuit_projects/coned-dashboard-PRESENTATION-SCRIPT.md` | Reframed to drop-off predictor; ~5:15 runtime; Edwin/Pedro/Ismael speaker splits set |
| Presenter guide | `/Users/Pursuit/Pursuit_Projects/coned-dashboard/BLACKSTONE_PRESENTER_GUIDE.md` | Same folder as this doc |

### 3c. Dev environment & process status

| Item | Status |
|---|---|
| `npm run dev` | Not externally verified this session; runs API + Vite concurrently per `package.json` |
| `es-toolkit` console error from Jun 13 smoke check | Not in `package.json` dependencies, likely resolved |
| Port conflicts | None known |
| `.env` LLM key for AI Agent | Status unknown; presence determines whether AI Agent demo is viable |

### 3d. What has *not* been inspected this session

- Whether the **Archetype Landscape view** from `PIVOT_NEXT_WEEK_STRATEGIC.md` actually shipped (commits don't clearly name it)
- Whether **per-building HDD/CDD regression** from `CONED_METHODOLOGY_ALIGNMENT.md` was built (commits don't suggest it was)
- Whether the **README drift** flagged in the smoke test report (1,260 vs 1,210 buildings, AUC 0.645 vs 0.652, 50 vs 0 Uncertain) has been reconciled — the Uncertain piece definitely changed in code, but README copy may still claim the old numbers
- Whether `SMOKE_TEST.md` password matches the local `.env`
- Visual confirmation of the deck rendering after the photo + reframing edits

---

## 4. Methodology understanding

### 4a. Our build

| Layer | What it does | Inputs | Output |
|---|---|---|---|
| K-means clustering | Group customers into 5 archetypes (the lens) | Building age, size, use type, LL84 energy intensity (4 features) | One archetype tag per building |
| Gradient boosting classifier | Rank each building by drop-off risk | 12 features including LL97 carbon exposure, Energy Star, age, HVAC permits, neighbor patterns, steam demand, archetype tag (others TBD with Ismael) | Risk score 0–100 |
| SHAP TreeExplainer | Decompose each score into per-feature contributions | Trained classifier + per-building feature vector | Top 5 signed drivers per building |
| YoY analysis | Flag year-over-year consumption outliers | LL84 yearly aggregates + citywide HDD multiplier | IQR 1.5× outlier flags + colored UI dots |

Accuracy: AUC ~0.65 on stratified cross-validation. UI shows tiers, not point probabilities.

### 4b. ConEd's approach (per Johan's spec)

| Layer | What it does |
|---|---|
| Per-customer linear regression | `usage_per_billing_day ~ β_HDD × HDD + β_CDD × CDD + intercept`, fit per customer on billing-period data |
| Adjustments | Heating, cooling, and billing-day adjustments produce weather-normalized usage |
| Diagnostic metrics | YoY % variance in normalized usage; current vs full-usage status; R²; HDD slope stability; HDD slope ↔ intercept synchronization; decline-trend acceleration |
| Rule-based labeling | Empirically calibrated thresholds → High / Medium / Low / **Uncertain** |

### 4c. The conceptual gap

These are not two flavors of the same model — they are two epistemic stances.

| ConEd's approach | Our approach |
|---|---|
| **Diagnostic / detective.** "How does *this customer* compare to their own baseline?" | **Classifier / pattern matcher.** "How does this customer compare to historical leavers?" |
| Customer-specific baseline drift signals | External pressure signals (LL97, DOB, peer behavior) |
| Transparent rule labels | ML probability + SHAP post-hoc |
| Needs long per-customer history | Works from day one without per-customer history |
| Naturally handles "uncertain" via low R² | Needed an explicit Uncertain tier — recently removed as dead code |

ConEd's stated position (Johan): they want us to do our own thing AND demonstrate clean weather normalization. We have the first; the second is the open methodological hole. See `CONED_METHODOLOGY_ALIGNMENT.md` for the full punch list.

---

## 5. Stakeholder guidance received

| Source | Guidance | Implication for the deck |
|---|---|---|
| **ConEd intake form** (official assignment) | "Steam Customer Drop-Off Predictor" — trained ML model + risk dashboard + significant predictive flags + documentation. Benchmark: identify ≥70% of major drops in back-testing. | Anchor framing on this language. Avoid claims of parity with their internal methodology. |
| **David Caiafa** (PM) | Lead with k-means archetypes as the lens; "steam is wholesale, not retail"; pre-war co-op vs midtown tower analogy; strong work could open further opportunities | Slide 3 problem hook + Slide 5 ML structure are built around this |
| **Ildi** (high-level framing) | YoY consumption changes normalized for temperature; statistical outlier detection; 1,200 customers below 96th St, 4 years of data | We have IQR outlier detection + citywide HDD multiplier; we have 3 years not 4 |
| **Johan** (detailed methodology spec) | Per-customer HDD/CDD regression + 6 diagnostic metrics + 4-tier labeling. *"The focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier."* | We diverge from his recipe; we should be ready to explain the divergence as a deliberate choice and name the August-build calibration path |

---

## 6. Presentation angle decision matrix

Three viable angles for the Wednesday presentation. Current deck is built around Angle A.

### Angle A — Drop-off predictor as built *(current direction)*

| Aspect | Detail |
|---|---|
| **Core narrative** | "We're building a steam customer drop-off predictor for Con Edison — an early-warning system the steam team can act on. Archetypes are the lens, the classifier is the ranking, SHAP is the explanation." |
| **What it commits us to** | Defending the supervised classifier as the prediction engine; archetypes as the lens, not the headline; public data as the v1 input; archetypes-explain-why story |
| **Evidence in current build** | 12-feature GB classifier shipped, SHAP drivers in WHY THIS SCORE card, 5 named archetypes on all 1,210 buildings, 59 high-risk surfaced, alert engine live |
| **Alignment with David** | **Strong** — matches the "drop-off predictor" reset he pushed us back toward |
| **Alignment with Johan** | Moderate — we don't have his per-customer regression; we hand-wave with the citywide HDD multiplier |
| **Alignment with intake form** | **Strong** — matches the official assignment language directly |
| **Vulnerability** | "How is your normalization per-customer?" — we have to admit it isn't |

### Angle B — Complementary pre-screening engine to ConEd's diagnostic framework

| Aspect | Detail |
|---|---|
| **Core narrative** | "We built an external-data pre-screening engine that complements ConEd's customer-specific diagnostic framework. Different data layer, different cadence, same goal — catch customers before they file the disconnect permit." |
| **What it commits us to** | Explicitly acknowledging methodology gaps; positioning as parallel/complementary not replacement; defending the dual-signal triangulation story |
| **Evidence in current build** | Same engine as Angle A, plus the gap analysis in `CONED_METHODOLOGY_ALIGNMENT.md` and the positioning quote in its §4 |
| **Alignment with David** | Good — fits his "honest framing" guidance and the August-build trajectory |
| **Alignment with Johan** | **Strong** — directly addresses the methodology asymmetry he flagged |
| **Alignment with intake form** | Good — defensible interpretation of "what would be useful to ConEd" |
| **Vulnerability** | Risks sounding like we're hedging; the room may want to see the diagnostic framework itself, not a complementarity claim |

### Angle C — Public-data ML pipeline as proof-of-concept; August is the calibration

| Aspect | Detail |
|---|---|
| **Core narrative** | "We built the engine on public data. The architecture is portable; the August build calibrates against billing data and validates against verified disconnections." |
| **What it commits us to** | Emphasizing the engineering story; softening any near-term performance claims; leaning on what's reproducible |
| **Evidence in current build** | Full ML pipeline, ingestion, 1,210 buildings, modular architecture, alert engine, dashboard, API |
| **Alignment with David** | Moderate — undersells what we already deliver |
| **Alignment with Johan** | Good — fully honest about per-customer regression gap |
| **Alignment with intake form** | Moderate — pivots from "delivered tool" toward "demonstrated pipeline" |
| **Vulnerability** | Reads as deferral; loses the "today" punch |

### Recommendation

Lead with **Angle A**. Keep **Angle B**'s complementarity messaging cocked for technical Q&A — if Johan or anyone of his profile is in the room, pivot to it. **Angle C** is the fallback if the room becomes skeptical about absolute performance.

---

## 7. Open threads

Priority order. Numbers in parentheses are rough effort estimates.

| # | Thread | Owner | Effort |
|---|---|---|---|
| 1 | Get verified 12-feature list from Ismael (Q&A will ask) | Edwin → Ismael | 10 min |
| 2 | Confirm contrast demo building — recommended: 432 Park Avenue (high risk, modern luxury, contrast to 1080 Fifth Ave Carnegie Hill pre-war) | Edwin + Ismael | 15 min |
| 3 | Reconcile README drift — buildings count, AUC, **Uncertain count now structurally 0** (intentional, not a regression) | Anyone | 30 min |
| 4 | Update `SMOKE_TEST.md` password to match local `.env` | Anyone | 5 min |
| 5 | Decide AI Agent fate in demo close — keep mention with dodge, or cut entirely | Pedro + Edwin | 5 min |
| 6 | Confirm "Driftwatch" project name or swap | Whole team | 5 min |
| 7 | Sync one-sentence archetype definitions across all three speakers | Ismael owns; all read | 20 min |
| 8 | Annotate `DEMO_TODAY_TACTICAL.md` with a header noting it predates the drop-off-predictor reframing | Anyone | 5 min |
| 9 | Verify whether anything from `PIVOT_NEXT_WEEK_STRATEGIC.md` shipped (Archetype Landscape view? per-building regression?) before claiming it on stage | Edwin | 30 min |
| 10 | Visual confirmation of Slide 2 team photo rendering in browser | Edwin | 2 min |

---

## 8. One-line brief for an AI agent picking up this project

> ConEd Steam Customer Drop-Off Predictor capstone for Pursuit — React 19 + Vite 8 frontend, Express 5 API, Python ML pipeline (k-means 5 archetypes + 12-feature gradient boosting classifier + SHAP drivers) over 1,210 NYC steam customers below 90th Street using public LL84/LL97/DOB/ACRIS/PLUTO data; presenting at Blackstone 2026-06-24 with three speakers (Pedro front-end+project, Edwin product+analytics, Ismael data+ML) under the official "drop-off predictor" framing (not the earlier "client-targeting tool" reframing visible in `DEMO_TODAY_TACTICAL.md`); the supervised classifier ranks usefully (AUC ~0.65) but does not replicate Con Edison's per-customer HDD/CDD regression spec from Johan — that gap is the central honest-framing decision the presentation has to make, with three viable angles (drop-off predictor as built, complementary pre-screening engine, public-data PoC) detailed in §6 of `PROJECT_CONTEXT_2026-06-22.md`; the deck is at `/Users/Pursuit/pursuit_projects/coned-dashboard-PRESENTATION.html`, the script at `coned-dashboard-PRESENTATION-SCRIPT.md` in the same folder, and the per-section stage prep + 22-question Q&A is in `BLACKSTONE_PRESENTER_GUIDE.md` alongside this file.

---

*Local-only. Living document — update as state changes.*
