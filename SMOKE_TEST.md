# ConEd Dashboard — Smoke Test

**Date:** 2026-06-12  
**Goal:** Verify all features work before the June 17 Blackstone preview

---

## Setup

```bash
cd coned-dashboard
npm install
npm run dev
```

Open: http://localhost:5173  
Password: `coned-steam-2026`

---

## Test Cases

### 0. Backend Health
- [ ] `curl http://localhost:3001/api/health` returns `{"ok":true}`

### 1. Login
- [ ] Page loads (not blank/white screen)
- [ ] Wrong password (e.g. `wrong`) → shows error text, does NOT log in
- [ ] Correct password → enters dashboard
- [ ] **Logout** button in header → returns to login screen
- [ ] Logging out and hitting Back in browser → shows login, not dashboard

### 2. Attrition Rankings tab (default view)
- [ ] Table loads with ~1,210 rows
- [ ] **★ icon** on every row — click turns yellow; click again gray
- [ ] Click row → side panel opens with building details
- [ ] Click same row again → panel closes
- [ ] Search bar filters by address
- [ ] **Tier filter** (All/High/Medium/Low/Uncertain) narrows table
- [ ] **Use type filter** — narrows by building use type
- [ ] **Archetype filter** — narrows by K-means cluster
- [ ] **Signal filter** — narrows by attrition signal
- [ ] **LL97 Compliance filter** — shows over/under LL97 cap
- [ ] **SC Class filter** — narrows by steam customer class
- [ ] **Outliers Only** toggle — narrows to flagged outliers
- [ ] **Demand range** min/max — filter by steam demand
- [ ] Sort by clicking column headers (ascending/descending toggle)
- [ ] **Export CSV** — file downloads with all columns
- [ ] Stats bar shows High/Med/Low/Uncertain/Total counts
- [ ] "Over LL97 cap" count and combined fine shown

### 3. Building Side Panel
- [ ] Click High-risk building → **Attrition Risk** score prominent
- [ ] **Steam trend chart** renders (not blank)
- [ ] **LL97 penalties**: 2024 and 2030 estimates
- [ ] **Cluster archetype** matches table
- [ ] **Signal breakdown** with colors
- [ ] **Peer score** vs portfolio score visible
- [ ] **SC class**, **EUI vs median**, **Energy Star**, **LL33 grade**, **Boiler fuel**
- [ ] **Deed info** (sale price, transfer date) shown if available
- [ ] Click Medium/Low risk — same structure, different values
- [ ] Panel width responsive (no overflow at ~1024px)

### 4. YoY Trends tab
- [ ] **Risk Histogram** loads — bar chart, 10 bins (0–10% through 90–100%)
- [ ] Bins colored: green (<40%), orange (40–70%), red (>70%)
- [ ] Hover bar → tooltip shows count + High/Med/Low breakdown
- [ ] Reference lines at 40% and 70% visible
- [ ] **YoY Scatter chart** loads below histogram
- [ ] Dots colored by cluster archetype (legend visible)
- [ ] Yellow dots (outliers — larger circles)
- [ ] "2024 HDD provisional" badge top-right of scatter
- [ ] Hover dot → tooltip: address, cluster, both deltas, outlier flag
- [ ] Bottom-left quadrant (sustained decline both years) has visible dots
- [ ] Display capped at ±150%

### 5. Watch List tab
- [ ] Tab initially shows `Watch List` (no count)
- [ ] Go to Rankings, click ★ on 3+ buildings
- [ ] Tab now shows `Watch List (3)`
- [ ] Click tab → saved buildings appear with same columns
- [ ] ★ in watchlist removes building (count decrements)
- [ ] Refresh page → watchlist survives (localStorage)
- [ ] **"Clear all" button** → empties all items, count → 0, shows empty state
- [ ] Switch back to Rankings — ★ icons still match saved state

### 6. AI Agent tab
- [ ] Tab loads with example query chips
- [ ] Click chip → runs query, results table appears
- [ ] Columns: Address, Attrition Score, LL97 Penalty, Steam, Signal, DOB Jobs
- [ ] **⚡ Insight line** appears ~1–2 seconds after table
- [ ] Custom query: `office buildings over LL97 limit` → replaces old results
- [ ] **Clear button** → returns to empty state with chips
- [ ] Nonsense query → empty results gracefully, no white screen

### 7. Error Handling
- [ ] Log out → redirected to login screen (not white)
- [ ] Kill backend (`kill $(lsof -ti:3001)`) → "Failed to load" + Retry button
- [ ] Restart backend, click Retry → dashboard recovers
- [ ] No white screens during any of the above steps
- [ ] DevTools Console: zero red errors during normal use

---

## What to Report

For each ❌ failure:
- Test case number
- What you saw vs. expected
- Browser console errors
- Network tab: failed requests + status codes

Drop in Slack `#coned-dashboard`.

---

## Known Limitations (not bugs)
- **2023→2024 delta labeled "provisional"** — 2024 HDD weather factor is estimated
- **~250 buildings show `—` in YoY column** — only 1 year of data
- **AI Agent insight takes ~2s** — second LLM call after table loads
- **Session lost on backend restart** — tokens in memory (fine for demo)
- **ML AUC = 0.645** — public data only; production model with billing data would be stronger