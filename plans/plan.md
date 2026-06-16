# Proactive Alert Engine — ConEd Dashboard

## Goal
Build a proactive alert system that monitors buildings for risk threshold crossings, LL97 exposure milestones, watchlist changes, and steam drop signals — then pushes advisory notifications to the dashboard without anyone having to ask.

## Approach

**In-memory alert engine (no DB, no new deps).** The server computes alerts at startup and on a 5-minute refresh timer. The frontend polls `/api/alerts` every 60s. Alerts are dismissible per-session. Each alert can carry an LLM-generated advisory (1-2 sentence action recommendation) computed asynchronously.

**Three layers:**
1. **Server alert engine** — compute alerts + generate advisories via existing LLM pipeline
2. **Alert API** — GET /api/alerts, POST /api/alerts/dismiss, GET /api/alerts/summary
3. **Frontend UI** — alert badge in header nav, AlertBanner for critical alerts, AlertsPanel full list

## Alert Types to Compute
| Type | Condition | Severity |
|------|-----------|----------|
| `extreme_risk` | building.risk ≥ 0.90 | critical |
| `high_risk` | building.risk 0.70–0.89 | warning |
| `ll97_exposure` | building.ll97_penalty_2024 > $200K | warning |
| `steam_drop` | Year-over-year steam decline for watchlist building | info |
| `portfolio_milestone` | Total LL97 exposure crosses $X threshold | info |

## Files to Create/Modify

### New Files
- `src/components/AlertBanner.jsx` — Critical alert strip shown below header
- `src/components/AlertsPanel.jsx` — Full alerts list view, accessible via alert badge click

### Modified Files
- `api/server.js` — Add alert engine, /api/alerts endpoint, /api/alerts/dismiss
- `src/App.jsx` — Integrate AlertBanner, polling, alert badge in nav

## Subtasks
1. **api/server.js — Add alert engine** (compute at startup + every 5min, store in-memory Map keyed by session token, generate alerts for: extreme_risk, high_risk, ll97_exposure, portfolio_milestone)
2. **api/server.js — Add `/api/alerts`** GET endpoint (return active alerts for session, accept `?since=` param. Also generate advisory text via LLM for critical alerts)
3. **api/server.js — Add `POST /api/alerts/dismiss`** endpoint (dismiss by alert id, per session)
4. **src/components/AlertBanner.jsx** — Banner component showing most critical active alert with dismiss button, dark themed
5. **src/components/AlertsPanel.jsx** — Full alerts list panel with severity icons, timestamps, dismiss buttons
6. **src/App.jsx — Integrate AlertBanner + polling** — Add polling interval, alert state, pass to AlertBanner, add bell icon badge in nav

## Deliverables
| File | Description |
|------|-------------|
| `api/server.js` | Alert engine + 2 new endpoints |
| `src/components/AlertBanner.jsx` | Critical alert strip UI |
| `src/components/AlertsPanel.jsx` | Full alerts list panel |
| `src/App.jsx` | Polling + badge integration |

## Evaluation Criteria
- Server computes ≥4 alert types at startup (extreme_risk, high_risk, ll97_exposure, portfolio_milestone)
- GET /api/alerts returns JSON array with id, type, severity, message, timestamp, dismissed fields
- POST /api/alerts/dismiss sets dismissed=true, subsequent GET excludes dismissed
- AlertBanner shows the most critical active alert below the header
- Clicking alert badge opens AlertsPanel with full list
- No new npm dependencies added
- Frontend compiles cleanly (Vite build 0 errors)