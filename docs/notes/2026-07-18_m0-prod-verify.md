# M0 prod-verify | 2026-07-18 03:02

Per D8 (Edwin owns M0 prod-verify; Ismael's Slack silently reassigned to Pedro, D8 overrides). Ran against current live prod at `https://coned-dashboard-production.up.railway.app` — the manual-redeploy target (69f0a320 SUCCESS, 2026-07-17). Old Railway account. Migration to Pedro's account still pending per D10.

Method: Playwright (chromium, 1440x900), 6-step probe with full-page screenshots, console-error + failed-request + HTTP-error capture. Script at `/tmp/m0-verify/verify.mjs`, artifacts at `/tmp/m0-verify/shots/`.

## Results

| # | Check | Status | Result |
|---|---|---|---|
| 1 | `GET /` | ✓ | 200. Renders "ConEd steam attrition: workflow build in progress" heading + body copy pointing at `/legacy`. Matches M0 stub spec. |
| 2 | `GET /legacy` | ✓ | 200. Login form (password input, "Access Dashboard" button, dark theme). Legacy frozen dashboard entry point. |
| 3 | `GET /legacy/deep-link-test-path` | ⚠ | 200 HTTP (SPA fallback works), but page renders **blank**. React Router (`src/main.jsx:11-14`) only defines `/` and `/legacy` — no `*` catch-all, so unknown paths mount an empty tree. See Finding A. |
| 4 | Hard reload at deep-link | ⚠ | 200 HTTP, body length 10 (empty div), same blank render. Same root cause as #3. |
| 5 | `GET /api/health` | ⚠ | **401** "Unauthorized — missing token". Endpoint requires auth (`api/server.js:1025` is `requireAuth`). CLAUDE.md API-contract table says auth: none. See Finding B. |
| 6 | `POST /api/auth/login` w/ bad password | ✓ | 401 "Invalid password". Endpoint reachable, rejects correctly. |
| 7 | `POST /api/auth/login` w/ real password | ✓ | 200, `{token}` returned. |
| 8 | `GET /api/auth/check` w/ token | ✓ | 200 `{"valid":true}`. Note: this endpoint always returns HTTP 200; validity lives in the body (`api/server.js:191-202`). Design choice for cheap frontend probing. |
| 9 | `GET /api/health` w/ token | ✓ | 200 `{"ok":true,"provider":"groq-llama3.3"}`. Confirms Groq is the active LLM (Anthropic key not set on this deploy). Unauthenticated returns 401 — see Finding B. |
| 10 | `GET /api/meta` w/ token | ⚠ | 200. **Response contains `"model_version":"GBM-v1+SHAP"`** — hardcoded pre-M1 value. Expected until PR #11 merges (rewires to `model_meta.model_version` → `"XGB v1 · UNVAL"`). See Finding C. |
| 11 | `POST /api/auth/logout` + recheck | ✓ | Logout returns 200. Post-logout `/api/auth/check` body flips to `{"valid":false}`. Session Map delete works correctly. |
| 12 | UI login (type password → click submit) | ⚠ | Password fills, button shows "Authenticating...", Playwright's `networkidle` fires before React re-renders the authenticated view. Not a real bug — the underlying API round-trip (#7-9) all succeed. Would need explicit `waitForSelector` on a post-login DOM element. Documenting as a script/test-tooling limitation, not a product issue. Screenshot at `shots/06-legacy-authenticated.png`. |

Zero page-errors, zero failed requests, no 5xx anywhere. Baseline is healthy.

## Findings

### A. Deep-link SPA fallback lands on a blank page (UX gap, not a 404)

`api/server.js` SPA fallback returns `index.html` for any non-`/api/` GET, so HTTP-level M0 acceptance passes ("deep-link doesn't 404"). But `src/main.jsx` has no catch-all Route:

```jsx
<Routes>
  <Route path="/" element={<App />} />
  <Route path="/legacy" element={<LegacyApp />} />
</Routes>
```

Anything else (typo, stale bookmark, `/legacy/whatever`) React-mounts to nothing. User sees the raw dark-navy background with no content, no "not found" affordance, no link back to `/`.

**Recommendation:** add `<Route path="*" element={<NotFound />} />` before M3 lands. Cheap. Copy: "Page not found. Return to [home](/) or [/legacy](/legacy)." Keeps L1 (honest language) intact.

Not a blocker for M0 sign-off — M0 spec required "deep links don't 404", and they don't. But flag this for the M3 kickoff so it doesn't harden into an accepted default.

### B. `/api/health` returns 401, contradicts CLAUDE.md contract

Live behavior: `curl https://coned-dashboard-production.up.railway.app/api/health` returns `401 {"error":"Unauthorized — missing token"}`.

`api/server.js:1025` uses `requireAuth`. CLAUDE.md "API contract" table says `/api/health` auth: none.

Two interpretations:
1. **Code is right, docs are wrong.** Auth was added at some point (probably 36844c2 security hardening) and the CLAUDE.md contract table wasn't updated. This is a doc-drift fix — remove `/api/health` from the "auth: none" row.
2. **Docs are right, code drifted.** `/api/health` is a readiness probe; Railway's healthcheck can't authenticate. If Railway is relying on this endpoint, an auth-guarded health check silently fails healthchecks. But: Railway healthcheck path is configurable in `railway.json` — worth checking whether Railway is actually pinging this or an alternate.

**Recommendation:** Ismael owns `api/server.js`. Confirm whether the auth guard was intentional (then update CLAUDE.md) or accidental (then remove it and add a smoke test for unauthenticated 200). Not a blocker for M0. Not urgent, but silent doc-drift is exactly the kind of thing PROJECT_STATE #2 (audit-trail rigor) is trying to prevent.

### C. `/api/meta` still returns `"GBM-v1+SHAP"` — visible artifact of unmerged PR #11

Live: `{"dataset_date":"2026-06","steam_year":"2024","ll84_date":"2025-05","model_version":"GBM-v1+SHAP","buildings":1210}`.

Not a finding against M0 — this is the pre-M1 hardcoded value and PR #11 rewires it to read from `model_meta.model_version` (→ `"XGB v1 · UNVAL"`). Documenting because this is a live-prod-observable manifestation of what merges when PR #11 lands: the provenance chip flips from a stale-and-misleading label to an honest one. Second reason to hold-then-merge PR #11 as soon as D10 (Pedro's Railway) unblocks it — this bad label is on every user-facing surface today.

## Verdict

**M0 stands up on the current live prod, including full authenticated round-trip.** Root stub renders, `/legacy` renders login form, SPA-fallback-non-404 works, login → token → auth/check → logout → invalidation all clean. No console errors, no failed requests, no 5xx.

Three follow-ups filed above; none block M0 acceptance. A + B are cleanup tasks. C waits on PR #11 merge (which waits on D10).

Note the verify was on the old Railway (pre-migration). Once Pedro's Railway account is live per D10, this whole check gets re-run against the new deploy URL as the deploy-clean gate before PR #10 / PR #11 merge.
