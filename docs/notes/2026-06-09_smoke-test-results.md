# ConEd Dashboard — Smoke Test Results

**Tester:** Edwin
**Date:** 2026-06-09
**Branch:** `main` @ `53c1555` ("fix: session Map cap + Slowloris timeout")
**Environment:** macOS, Node v22.20.0, fresh `npm install`, `.env` from `.env.example` with `DASHBOARD_PASSWORD=testpass123` (no LLM keys set — `provider: NO KEY SET`)

---

## TL;DR

All API-side checks pass. CSV + browser-side UI checks pending — will walk through those next. Three things worth flagging to you below.

---

## Setup notes

- `dotenv` was missing from `node_modules` after pulling `main` — needed an `npm install` since Pedro's PR added it. Worth a note in step 1 of the instructions ("`npm install` — re-run if you previously ran `npm run dev` from an older commit").
- Found two stale node processes from a previous dev session still holding ports 3001 + 5173 (running pre-auth code). Killed those before testing. Possible footgun for anyone with long-running terminals — adding a `lsof -i :3001 -i :5173` to step 2 might be worth it.

---

## Checklist results

### Auth — Login Screen

| Check | Result |
|---|---|
| Login screen appears before any data loads | 🟡 pending browser walkthrough |
| Empty password → "Please enter the password" | ✅ Frontend validates; backend also returns `400 {"error":"Password is required"}` |
| Wrong password → "Invalid password" | ✅ `POST /api/auth/login {password:"nope"}` → `401 {"error":"Invalid password"}` |
| Correct password (`testpass123`) → dashboard loads | ✅ Returns `200 {token: "<64-char hex>"}` |
| Logout button in toolbar after login | 🟡 pending browser |
| Logout returns to login screen + clears session | ✅ `POST /api/auth/logout` returns 200; re-using that token returns 401 |

### Data — Table

| Check | Result |
|---|---|
| Buildings table loads ~1,260 rows | ⚠ See finding #2 below — `/api/data/buildings` returns **1,210** rows (post-dedup), not 1,260. Worth updating the instructions. |
| Columns: Address, Archetype, **SC Class**, Attrition Score, LL97 Penalty, Steam | 🟡 pending browser; confirmed `sc_class` is derived in `useBuildings.js::estimateScClass()` and added to merged objects |
| SC Class shows `SC-2* (Annual Power)`, `SC-3* (Residential)`, etc. | 🟡 pending browser |
| Sortable headers | 🟡 pending browser |
| Search filters by address | 🟡 pending browser |

### Filters

| Check | Result |
|---|---|
| Risk tier / LL97 / SC Class / steam range / stats bar | 🟡 pending browser |

### Building Panel

| Check | Result |
|---|---|
| Click row → panel opens with all sections | 🟡 pending browser |
| Click same row → closes | 🟡 pending browser |

### CSV Export

| Check | Result |
|---|---|
| File downloads | 🟡 pending browser |
| SC Class column present | 🟡 pending browser — confirmed in code that `RiskTable.jsx` includes `sc_class` field via the merged data |
| No cell starts with `=/+/-/@` | ✅ verified in code: `RiskTable.jsx:99–103` regex `^[\s]*[=+\-@\t\r\n]` prefixes a single quote inside double-quoted cells |

### AI Agent Tab

| Check | Result |
|---|---|
| Tab visible, query input works | 🟡 pending browser |
| No API key → graceful error, not a crash | ✅ `POST /api/query` (with valid token, no LLM key) → `503 {"error":"No LLM API key configured — set ANTHROPIC_API_KEY or GROQ_API_KEY"}` |

### Security — quick checks

| Check | Result |
|---|---|
| Incognito tab → login screen, no bypass | 🟡 pending browser (session check + frontend route gate) |
| `fetch('/buildings.json')` → 403 | ⚠ **See finding #1.** On API port 3001 → 403 ✓. On Vite dev port 5173 → **200 with the full 236 KB file**. |
| `fetch('/api/data/buildings')` no token → 401 | ✅ Both directly (3001) and via Vite proxy (5173) |
| Token in `sessionStorage` (key `coned_token`), not `localStorage` | 🟡 pending browser |

### Additional API-side checks I ran (not in the original list, but worth knowing)

| Check | Result |
|---|---|
| Bogus token → 401 "invalid or expired session" | ✅ |
| Question >500 chars → 400 | ✅ |
| Request body >16 KB → **JSON** 413 (not HTML stack trace) | ✅ |
| Malformed JSON body → **JSON** 400 (not Express HTML page) | ✅ |
| Login rate limit kicks in by the 6th attempt in 15 min | ✅ Returns 429 |
| Server boots without `DASHBOARD_PASSWORD` → throws FATAL with clear message | ✅ `Error: FATAL: DASHBOARD_PASSWORD must be set in .env` |
| `/api/auth/check` on a dead token → `{valid:false}` 200 | ✅ |

None of the "flag as a bug" conditions in section 5 triggered.

---

## Findings / things to discuss

### 1. ⚠ Vite dev mode serves `/buildings.json` unprotected — smoke-test check #2 of "Security — quick checks" will fail in dev

The check says: *"In browser: `fetch('/buildings.json').then(r=>console.log(r.status))` in DevTools console → should log `403`."* On `http://localhost:5173` it returns **200** with the full 236 KB file. Vite serves `public/*` directly during dev; the Express `/buildings.json` 403 guard only fires when the frontend is served from `dist/` in production.

Two ways to resolve:
- **(a)** Add a footnote to the smoke-test doc: "This check is production-only; in dev Vite will return 200." Cleanest if we never deploy via `vite dev`.
- **(b)** Add a Vite proxy rewrite for `/buildings.json`, `/buildingEnrichment.json`, `/yearly.json` so dev mirrors prod behavior. Roughly:
  ```js
  // vite.config.js
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/buildings.json": "http://localhost:3001",
      "/buildingEnrichment.json": "http://localhost:3001",
      "/yearly.json": "http://localhost:3001",
    },
  },
  ```

Up to you. The production path is correctly locked — confirmed via curl on port 3001. This is purely a dev-environment / testing-script consistency issue.

### 2. ⚠ Building/enrichment count mismatch — 1,210 vs 1,247

After the dedup pass, `buildings.json` is now **1,210 unique addresses**, but `buildingEnrichment.json` still has **1,247 keyed entries**. The 37-entry overhang is enrichment that never joins a building. Two implications:

- The smoke-test instructions still say "table loads ~1,260 rows" — should probably read "~1,210."
- We may be running `ll97_model.py` / `kmeans_model.py` against the older 1,247-building input. Worth a final pass before the in-person meeting (this is on your Sprint 3 "Final data quality pass" task).

### 3. ℹ dotenv 17.x prints promo banners on every startup

```
[api] ◇ injected env (2) from .env // tip: ⌘ suppress logs { quiet: true }
[api] ◇ injected env (0) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
```

Harmless, but slightly noisy during a demo. One-line fix: `dotenv.config({ override: true, quiet: true })` in `api/server.js`.

---

## Open question for you

For finding #1 above — do you want me to ship the Vite proxy fix (option b) on a small PR, or just amend the smoke-test doc (option a)?

Everything else from your checklist is either ✅ on the API side or queued for the browser walkthrough — I'll send a follow-up if anything surprises me in the UI pass.
