# ConEd Dashboard — Smoke Test
**Tester:** Pedro / Edwin  
**Date:** 2026-06-10  
**Goal:** Verify all new features before the June 17 Blackstone preview

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

### 1. Login
- [ ] Page loads (not blank/white screen)
- [ ] Wrong password → shows error, does NOT log in
- [ ] Correct password → enters dashboard

---

### 2. Attrition Rankings tab (default view)
- [ ] Table loads with buildings (should show ~1,210 rows)
- [ ] **YoY Δ column** visible — shows % values like `+5.2%` or `-18.4%`
- [ ] **Outlier badge** — some rows show a yellow `!` badge next to the delta
- [ ] **★ icon** on every row — click one → star turns yellow
- [ ] Clicking a row → side panel opens with building details
- [ ] Clicking same row again → panel closes
- [ ] Search bar filters by address
- [ ] **Outliers Only** filter (new dropdown) → table narrows to flagged buildings only
- [ ] Sort by clicking column headers (YoY Δ should sort)
- [ ] Export CSV → file downloads with delta + outlier columns included

---

### 3. YoY Trends tab (NEW)
- [ ] Tab is clickable (not grayed out)
- [ ] **Risk Histogram** loads — bar chart with green/orange/red bins
- [ ] Histogram shows correct counts (High / Medium / Low in top-right corner)
- [ ] Hover over a bar → tooltip shows building count + tier breakdown
- [ ] **YoY Scatter chart** loads below histogram
- [ ] Scatter shows dots colored by cluster archetype
- [ ] Yellow dots visible (outliers)
- [ ] "2024 HDD provisional" warning badge visible top-right of scatter
- [ ] Hover over a dot → tooltip shows address, both period deltas, outlier flag if applicable
- [ ] Bottom-left quadrant (sustained decline both years) should have visible cluster of dots

---

### 4. Watch List tab (NEW)
- [ ] Tab shows `Watch List` (no count yet)
- [ ] Go back to Rankings, click ★ on 3+ buildings
- [ ] Watch List tab now shows `Watch List (3)` in nav
- [ ] Click Watch List tab → saved buildings appear in table
- [ ] ★ button in watchlist removes building
- [ ] Refresh page → watchlist survives (localStorage)
- [ ] "Clear all" button → empties watchlist

---

### 5. AI Agent tab
- [ ] Tab loads
- [ ] Type: `high risk hotels with HVAC permits` → click Ask
- [ ] Results table appears
- [ ] **⚡ Insight line** appears above table (e.g. "There are 8 high-risk hotels totaling…")
  - Note: insight loads ~2 seconds after the table — this is expected
- [ ] Try a second query: `office buildings over LL97 limit` → new results replace old
- [ ] Clear button → returns to empty state

---

### 6. Error handling
- [ ] Log out → redirected to login screen
- [ ] No white screens encountered during any of the above steps

---

## What to Report Back

For each ❌ failure, note:
- Which test case number
- What you saw vs. what was expected
- Browser console errors (open DevTools → Console tab, paste any red errors)

Drop findings in Slack `#coned-dashboard` thread.

---

## Known Limitations (not bugs)
- 2023→2024 delta is labeled "provisional" — 2024 HDD weather factor is estimated
- ~250 buildings show `—` in the YoY column (only 1 year of data available for them)
- AI Agent insight takes ~2s to appear — it's a second LLM call, fires after the table loads
