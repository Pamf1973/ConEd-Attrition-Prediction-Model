# ConEd Dashboard — Feature Implementation Plan

## Goal
Build 14 missing features on the ConEd Manhattan Steam Attrition Dashboard, organized in 3 tiers by impact and effort. All existing functionality must remain intact.

## Research Summary
Verified via grep across the entire codebase (all components, hooks, server, utils). The 14 features listed in subtasks do not exist in any form in the current source code. Existing SteamTrend is a simple 3-bar horizontal bar chart; the new TrendChart will replace it with a full Recharts line chart. No new npm dependencies needed — Recharts already installed.

## Approach
Build features in dependency order: infrastructure first (toast, hooks), then UI features (charts, table), then server endpoints. Each feature is self-contained in 1-3 files. All source changes are in `/Users/icaraballo/Documents/GitHub/coned-dashboard/src/` and `/Users/icaraballo/Documents/GitHub/coned-dashboard/api/server.js`.

## Subtasks

### Tier 0 — Foundation (build first, enables everything below)
1. **Toast notification system**
   - Create `src/components/Toast.jsx` — a lightweight, absolute-positioned notification component.
     - Props: `message` (string), `type` ("error"|"success"|"warning"|"info"), `onClose` (callback)
     - Auto-dismisses after 4 seconds via `useEffect` timer
     - Styled with dark theme matching the dashboard (bg-[#001748], border-[#0F3B7E])
     - Position: fixed top-right, z-50, slide-in animation
   - Export `showToast` helper that returns `{ toast, show }` using a simple callback pattern
   - Verify: import in a component, call `show("test", "info")`, see the toast render and auto-dismiss

2. **Utility hooks**
   - Create `src/hooks/useKeyboard.js` — keyboard shortcut hook
     - Accepts a map of `{ "key-combo": handlerFn }` (e.g., `"Escape": () => onClose()`)
     - Does NOT fire when `e.target` is INPUT/TEXTAREA/SELECT
     - Supports modifiers: `ctrl`, `shift`, `alt` via `ctrl+key` syntax
   - Create `src/hooks/useUrlState.js` — URL state persistence
     - Reads `window.location.search` on mount via `URLSearchParams`
     - Provides `get(key, default)` and `setParam(key, value)`
     - On `setParam`, calls `window.history.replaceState` (no page reload)
     - Handles removal when value equals default: `sp.delete(key)`
     - Listens to `popstate` for back/forward navigation
   - Verify: import both, no syntax errors

### Tier 1 — High Impact UI Features
3. **Click-to-filter from YoYScatter**
   - Add `onFilterCluster(clusterName)` and `onSelectBuilding(building)` props to `YoYScatter.jsx`
   - ScatterChart: add `onClick` to the chart that extracts the nearest data point
   - Scatter: add `onClick` handler on each point that calls `onSelectBuilding(payload)`
   - Update `App.jsx` tabs: when a scatter point is clicked, switch to "rankings" tab and apply cluster filter
   - Verify: Recharts Scatter supports `onClick`; click a dot → should navigate to rankings filtered by that cluster

4. **Click-to-filter from RiskHistogram**
   - Add `onFilterByRisk(min, max)` prop to `RiskHistogram.jsx`
   - BarChart: add `onClick={(data) => onFilterByRisk?.(data.activePayload?.[0]?.payload.min, data.activePayload?.[0]?.payload.max)}`
   - Update `App.jsx` to pass handler that sets risk min/max in RiskTable state and switches tab
   - Verify: BarChart supports onClick; click a bin → rankings filter set to that risk range

5. **Data freshness indicator**
   - In `App.jsx` header (next to building count), add a subtle `<span>` showing last data date
   - Use a configurable constant / inline date: "Data: Jun 13, 2026"
   - Behind it, call `GET /api/data/meta` if endpoint exists, otherwise use hardcoded date
   - After building it, verify it renders in the nav header; if stale for more than 30 days show amber dot

6. **Cross-field search**
   - In `RiskTable.jsx`, modify the search filter to span multiple fields:
     `b.address, b.use, b.cluster_name, b.sc_class, b.bbl` (if exists), `b.owner_name` (if exists)
   - Keep it text-only search (single input, multiple fields)
   - Verify: search "hotel" finds buildings where use="Hotel" AND buildings with "Hotel" in address

7. **CSV export loading/error states + timestamped filename**
   - Add `csvLoading` and `csvError` state to `RiskTable.jsx`
   - On CSV export click: set loading → `setTimeout(0)` to let UI render → generate blob → download
   - Filename includes date: `coned-attrition-risk-2026-06-14.csv`
   - Show loading spinner/text on the export button
   - On error: show toast with error message (using Toast component)
   - Same for `downloadPortfolioCSV` — add try/catch + error toast
   - Verify: click Export → button shows loading state briefly → file downloads with dated name

8. **Pagination**
   - Add `page` (1-based) and `pageSize` (default 50) state to `RiskTable.jsx`
   - Slice `filtered` array: `filtered.slice((page-1)*pageSize, page*pageSize)`
   - Show "Showing X-Y of Z" in the filter bar, with "← Prev" / "Next →" buttons
   - Disable Prev on page 1, Next when at last page
   - When filters change, reset to page 1
   - Verify: 1,210 buildings → 25 pages of 50; navigate through pages, filters reset page

9. **Multi-column sort**
   - Replace single `sortKey`/`sortDir` with `sortStack: [{key, dir}]` array
   - Click column: if already in stack → cycle desc→asc→remove; if new → add as secondary
   - Apply all sort criteria in order (stable sort)
   - Show sort indicators: `1▼` (primary desc), `2▲` (secondary asc) next to column headers
   - Verify: sort by risk desc, then LL97 penalty desc → buildings at same risk% sorted by penalty

10. **Watchlist import/export (JSON file)**
    - Add "Export" button to Watchlist component → downloads `coned-watchlist.json`
    - Add "Import" button → file picker → parse JSON → set watchlist state + localStorage
    - Verify: export watchlist → clear → import → watchlist restored

11. **Keyboard shortcuts**
    - In `App.jsx`, use `useKeyboard` hook to register:
      - Escape → close BuildingPanel (if open)
      - 1→5 → switch to tabs (rankings, trends, targets, watchlist, agent)
      - Ctrl+F → focus the RiskTable search input
      - j/k → if in rankings tab, highlight next/prev row
    - Verify: press 3 → switches to Top Targets tab; press Escape → panel closes

12. **Bulk select in RiskTable**
    - Add `selectedSet` state (Set of addresses) and checkbox column to RiskTable
    - Header checkbox: select all / deselect all visible (filtered) rows
    - Bulk action bar appears when `selectedSet.size > 0`:
      - "N selected" | "Add to Watchlist" | "Export Selected CSV" | "Clear"
    - "Add to Watchlist" calls `onWatch` for each selected address
    - Export Selected CSV generates CSV of only selected rows
    - Verify: select 5 rows → bulk bar appears → Add to Watchlist → watchlist shows 5 new entries

### Tier 2 — Higher Effort Features
13. **Server-side query API (`GET /api/buildings`)**
    - In `server.js`, add `GET /api/buildings` with query params:
      - `risk_min`, `risk_max` (0-1), `use`, `signal`, `ll97_over`, `cluster_name`
      - `sort_by` (risk, ll97_penalty_2024, steam), `sort_dir` (asc, desc)
      - `page`, `per_page` (def: 50, max: 200)
      - `search` (multi-field text search across address, use, cluster_name)
    - Returns: `{ buildings: [...], total: N, page: P, per_page: PP, total_pages: T }`
    - Protect with `requireAuth` middleware
    - Verify: `curl -H "Authorization: Bearer TOKEN" "http://localhost:3001/api/buildings?risk_min=0.7&page=1&per_page=10"` → returns 10 buildings with risk≥0.7, total count

14. **Historical Trend Chart in BuildingPanel**
    - Replace `SteamTrend` with a new `TrendChart` component in `BuildingPanel.jsx`
    - Uses Recharts `LineChart` / `ResponsiveContainer`
    - Series:
      1. Building steam (2022, 2023, 2024) — white bold line, circle dots
      2. Peer median steam (same use type × cluster) — dashed orange line (#E87722)
      3. LL97 cap line — dotted red line (derived from b.floor_sqft × use type × formula)
    - Annotations: DOB permit dots if dob_jobs>0
    - Legend with series names
    - XAxis: years, YAxis: kBtu with formatted ticks
    - Color: bg-[#1e293b], border-[#082244]
    - Verify: renders below Energy section; shows 3 trend lines; peer median is computed correctly

15. **Server-side watchlist sync endpoints**
    - In `server.js`, add:
      - `POST /api/watchlist/save` (body: `{ addresses: [...] }`) → stores per-session
      - `GET /api/watchlist/load` → returns `{ addresses: [...] }` for current session
    - Store in a `Map` scoped by session token: `watchlistByToken`
    - `useWatchlist` hook: on mount, try to load from server; on toggle, save to server
    - Fallback to localStorage if server unavailable
    - Verify: login → add a watchlist item → reload page → watchlist restored from server

## Deliverables
| File | Description |
|------|-------------|
| `src/components/Toast.jsx` | Toast notification component |
| `src/hooks/useKeyboard.js` | Keyboard shortcut hook |
| `src/hooks/useUrlState.js` | URL state persistence hook |
| `src/components/YoYScatter.jsx` | Updated with click-to-filter |
| `src/components/RiskHistogram.jsx` | Updated with click-to-filter |
| `src/components/RiskTable.jsx` | Updated: pagination, multi-sort, cross-field search, bulk select, CSV loading states |
| `src/components/Watchlist.jsx` | Updated: import/export JSON |
| `src/components/BuildingPanel.jsx` | Updated: TrendChart replaces SteamTrend |
| `src/data/useBuildings.js` | Updated: export peer median calculation |
| `src/App.jsx` | Updated: keyboard shortcuts, click-to-filter wiring, freshness indicator |
| `api/server.js` | Updated: GET /api/buildings, GET/POST /api/watchlist/* |
| `src/lib/groqFilter.js` | Updated if needed |

## Evaluation Criteria
- All 14 features build without syntax errors (verified via `npm run build` or compile check)
- Toast component renders and auto-dismisses
- Click on YoYScatter dot → navigates to rankings with cluster filter
- Click on RiskHistogram bin → navigates to rankings with risk range filter
- Search "hotel" finds buildings by use type AND address
- CSV export shows loading state and dated filename
- Pagination shows correct page counts, filters reset page
- Multi-column sort works (risk desc, then penalty desc)
- Watchlist import/export downloads/restores JSON
- Keyboard shortcuts work: keys 1-5 switch tabs, Escape closes panel
- Bulk select shows action bar, Add to Watchlist works, Export Selected works
- `GET /api/buildings?risk_min=0.7` returns filtered paginated results
- TrendChart renders with 3 series and correct peer median
- Watchlist save/load endpoints persist per session

## Notes
- No new npm dependencies required — all features use built-in browser APIs or existing Recharts
- All new hooks go in `src/hooks/` (create directory)
- Toast component goes in `src/components/`
- Server changes go in `api/server.js`
- All file paths are ABSOLUTE, rooted at `/Users/icaraballo/Documents/GitHub/coned-dashboard/`
- Watchlist import/export is plain JSON via FileReader and Blob download — no server needed for I/O