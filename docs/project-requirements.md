# Project Requirements — ConEd Steam Attrition Dashboard

**Team:** Pursuit Fellowship Data Team  
**Client:** Con Edison  
**Last Updated:** 2026-06-03  

---

## Functional Requirements

### FR-1 — Building Data Display
- The system shall display all 1,260 Manhattan steam customer buildings
- Each building record shall include: address, BBL, building type, floor area, year built, steam demand (kBtu), attrition risk score (0–100%), attrition tier (High/Medium/Low), and customer archetype
- Data shall reflect LL84 Calendar Year 2022 filings (the most recent complete year)

### FR-2 — Attrition Risk Scoring
- The system shall compute an ML-based attrition risk score for every building using a Gradient Boosting Classifier
- The model shall be trained exclusively on real observed steam demand drops (≥50% decline = positive label)
- Cross-validated AUC shall be reported in the README and must be ≥ 0.60
- Risk tiers: High > 0.70, Medium 0.40–0.70, Low < 0.40

### FR-3 — LL97 Compliance Calculator
- The system shall compute annual LL97 penalty estimates for 2024 and 2030 cap tiers
- Penalty formula: `max(0, actual_GHG − (floor_sqft × intensity_limit)) × $268`
- Intensity limits shall vary by use type per the LL97 statute
- Each building shall display compliance status (over cap / compliant) and dollar penalty

### FR-4 — Filtering and Sorting
- The Attrition Rankings table shall support filtering by: risk tier, building use type, attrition signal, LL97 compliance status, customer archetype
- The table shall support sorting by: risk score, LL97 penalty, steam demand, DOB permit count
- All filters shall be combinable (AND logic)

### FR-5 — Building Detail Panel
- Clicking any building shall open a side panel with full detail
- Panel shall include: address, archetype, LL97 compliance section (2024/2030 penalty, compliance status), energy section (steam demand, GHG, floor area), ML risk score with explanation, year-over-year steam trend (when data available)

### FR-6 — CSV Export
- The table shall export all visible rows as a CSV file
- Export shall include all displayed columns plus BBL and lat/lon
- CSV shall be sanitized against formula injection (cells starting with =, +, -, @, tab, newline)

### FR-7 — AI Agent Tab
- The system shall provide a natural language query interface backed by an LLM (Claude Haiku or Groq Llama 3.3)
- Queries shall be translated into a structured filter spec server-side (API key never exposed to browser)
- The system shall accept queries up to 500 characters
- Rate limit: 30 queries/minute per IP
- The system shall display an English explanation of the applied filters alongside results

### FR-8 — Year-Over-Year Trends
- For buildings with multi-year LL84 data (CY2022/2023/2024), the system shall display a steam demand sparkline in the Building Detail Panel
- Source: `public/yearly.json` (1,210 buildings, up to 3 years each)

### FR-9 — 3D Map (Separate Repo)
- The 3D map visualization is maintained in the `coned-3d-map` repository
- The dashboard and map share the same underlying data files (buildings.json, buildingEnrichment.json)
- Map integration is tracked separately and is not a blocker for the June 24 MVP

---

## Non-Functional Requirements

### NFR-1 — Security
- No API keys shall be present in any client-side JavaScript bundle
- All LLM API calls shall be proxied through the Express backend
- LLM input shall be validated (type check, length limit) before forwarding
- LLM output shall be validated against a whitelist schema before use

### NFR-2 — Data Transparency
- All data sources shall be publicly available and cited in the README
- The model's AUC and training methodology shall be documented
- The tool shall not claim to use ConEd proprietary data unless a data sharing agreement is in place

### NFR-3 — Reproducibility
- The full ML pipeline shall be reproducible from the public repo with `pip install -r requirements.txt`
- The frontend shall build from the repo with `npm install && npm run build`
- A `.env.example` shall document all required environment variables

### NFR-4 — Performance
- Initial page load (1,260 buildings) shall complete in under 3 seconds on a typical broadband connection
- Table filtering and sorting shall be client-side (no server round-trips)
- LLM query response shall complete in under 10 seconds

### NFR-5 — Access Control (Pre-ConEd Sharing)
- Before sharing the live URL with ConEd, the tool shall be deployed behind a password or auth layer
- The current public deployment should not expose ConEd account intelligence without auth

---

## Data Requirements

### DR-1 — BBL as Primary Key
- Every building record shall include its BBL (Borough-Block-Lot) identifier
- BBL is the primary field ConEd will use to match our records against their internal account database

### DR-2 — Data Freshness
- The system shall clearly label the data year (Calendar Year 2022) in all exports and the UI
- When LL84 2023 or 2024 data is used, it shall be labeled accordingly

### DR-3 — ConEd Data Integration (Phase 2)
- When ConEd billing data becomes available, it shall be joinable to existing records via BBL
- The risk model shall be retrained with ConEd-verified attrition labels (known disconnections)
- This is a Phase 2 requirement contingent on data sharing agreement execution
