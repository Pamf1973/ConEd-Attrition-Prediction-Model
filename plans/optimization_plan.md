# ConEd Dashboard — Optimization Plan

## Goal
Fix the 4 highest-impact issues found during pipeline audit: explain timeout, missing caching, missing request cancellation, and login UX.

## Improvements

### 1. Fix `/api/explain` timeout (🔴 Bug)
- `callClaude()` defaults to 10s timeout but `/api/explain` sends 600-line EXPLAIN_PROMPT
- **Fix:** Pass 25s timeout to `callClaude` in `/api/explain`, 15s in `/api/summarize`
- **File:** `api/server.js` lines ~996-997, ~721-722

### 2. Add in-memory `/api/explain` cache (🟡 Cost)
- Simple Map<string, {answer, timestamp}> with 15-min TTL
- Same question from any session returns cached answer — saves $ on identical questions
- **File:** `api/server.js` before `/api/explain` route

### 3. Add AbortController to AIAgent (🟡 UX)
- Rapid clicks on example buttons fire parallel requests with no cancellation
- old request keeps running even after user clicks a different query
- **Fix:** Use AbortController + ref to abort previous in-flight request on new submit
- **File:** `src/components/AIAgent.jsx`

### 4. Add rate limit countdown to Login (🟢 UX)
- When rate-limited, show "Try again in ~X minutes" with remaining time from retry-after
- **Fix:** Parse `Retry-After` header or estimate from message
- **File:** `src/components/Login.jsx`

## Files Changed
- `api/server.js` — 3 edits: timeout params, cache, cache setup
- `src/components/AIAgent.jsx` — 1 edit: AbortController + abort logic
- `src/components/Login.jsx` — 1 edit: parse retry-after display