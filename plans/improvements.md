# ConEd Dashboard — All Improvements

## Goal
Implement 5 improvements on the dashboard: (1) Loading skeletons for all code-split components, (2) Graceful LLM error fallback with FAQ + stale-cache, (3) XGBoost model integration into the dashboard, (4) Vendor chunking for recharts, (5) Data freshness badge enhancement.

## Research Summary
- All Suspense boundaries use `"Loading..."` text — need shape-matched skeletons
- LLM explain endpoint already has 15-min in-memory cache, returns 502 on LLM failure
- XGBoost AUROC 0.6833 vs GBM 0.6639, but model is never saved/deployed — only a markdown report
- vite.config.js has no `manualChunks` — recharts bundled across multiple chunks
- Data freshness badge already exists ("Data: Jun 2026") — minor color-code enhancement

## Approach
Implement each improvement as a self-contained subtask with verification. Lightest items first (skeletons, chunking, freshness), then deeper changes (LLM fallback, XGBoost).

## Subtasks

### 1. Loading Skeletons
Create `src/components/Skeleton.jsx` with reusable skeleton shapes (table rows, sidebar panel, chart area, card, alert bar, list items). Replace all 10 Suspense fallback `"Loading..."` divs with appropriate skeleton component.

Expected output: `src/components/Skeleton.jsx` created, `src/App.jsx` updated with 10 skeleton variants.
Verify: `npm run build` succeeds.

### 2. Vendor Chunking (Recharts)
Edit `vite.config.js` — add `build.rollupOptions.output.manualChunks` to split `recharts` into `vendor-recharts.js`.
Also check if `d3` sub-deps leak into component chunks — if so, add them to vendor as well.

Expected output: `vite.config.js` updated. Verify: `npm run build` produces `vendor-recharts` chunk, assets listable.

### 3. Data Freshness Badge Enhancement
The header already shows `Data: Jun 2026 · Steam: 2024 · LL84: May 2025` (hardcoded string). Enhance with:
- A dot indicator: 🟢 (green for <6mo, yellow for 6-12mo, red for >12mo)
- Make the data date derive from a config object or JSON meta file for easier updates
- Add a hover tooltip with more detail: "Data snapshot: Jun 2026 · Pull date: 2026-06-26 · LL84 compliance deadline: May 2025"

Expected output: Updated `src/App.jsx` header badge with color dot + tooltip. Verify: `npm run build` succeeds.

### 4. LLM Explain Graceful Fallback
Backend changes (`api/server.js`):
- Keep stale cache entries beyond 15 min (set a longer max age like 24h)
- On LLM failure: if stale cache exists for that question → serve it with a `stale: true` flag
- If no stale cache → serve from a pre-computed FAQ JSON file
- Create `api/prompts/explainFaq.json` with 15-20 common Q&A pairs pre-answered using the EXPLAIN_PROMPT format

Frontend changes (`src/lib/groqFilter.js` + `src/components/AIAgent.jsx`):
- `explainDashboard()`: if response has `stale: true`, show a subtle "(cached)" badge
- If response is from FAQ, show "(pre-computed)" indicator
- Frontend error state: if error is returned, still show the FAQ answer as fallback if available

Expected output: `api/prompts/explainFaq.json` created, `api/server.js` updated with stale-cache + FAQ fallback, frontend updated to show indicators.
Verify: `node --check api/server.js` passes, `npm run build` passes.

### 5. XGBoost Model Integration
Backend:
- Edit `train_xgboost.py` to: save the best XGBoost model as `models/xgboost_attrition.pkl` using joblib, save the GBM model for comparison as `models/gbm_attrition.pkl`
- Re-run `train_xgboost.py` to generate the saved model files
- Add `/api/predict/xgboost` endpoint in `server.js` that loads the XGBoost model and returns risk scores for any buildings posted in the request body
- Optionally: add an endpoint `/api/predict/compare` that returns both GBM and XGBoost risk scores side-by-side for a building

Frontend (optional, if time permits):
- In AIAgent.jsx or BuildingPanel.jsx, add an option to show XGBoost-based risk score alongside GBM

Expected output: `models/xgboost_attrition.pkl` created, `api/server.js` with new endpoints, XGBoost training re-run.
Verify: Start server, `POST /api/predict/xgboost` returns valid risk scores.

## Deliverables
| File Path | Description |
|-----------|-------------|
| src/components/Skeleton.jsx | Reusable skeleton shapes |
| src/App.jsx | Updated with 10 skeleton variants |
| vite.config.js | Updated with manualChunks for recharts |
| api/prompts/explainFaq.json | Pre-computed FAQ Q&A pairs |
| api/server.js | Updated with stale-cache and FAQ fallback |
| src/lib/groqFilter.js | Updated to handle stale/FAQ flags |
| src/components/AIAgent.jsx | Updated with fallback indicators |
| models/xgboost_attrition.pkl | Trained XGBoost model |
| api/server.js | New /api/predict/xgboost endpoint |

## Evaluation Criteria
- `npm run build` passes with all changes
- `node --check api/server.js` passes
- Server starts and returns explain answers from FAQ when LLM is unavailable
- XGBoost endpoint returns valid risk predictions for buildings
- Suspense fallbacks show shape-matched skeletons instead of "Loading..." text