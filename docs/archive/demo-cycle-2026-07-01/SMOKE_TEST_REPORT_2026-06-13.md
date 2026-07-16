# ConEd Dashboard — Programmatic Smoke Test Report
**Date:** 2026-06-13
**Build:** `edwin/ll97-gauge-and-shap-drivers` (PR #7) on top of `main` @ `5cacb07`
**Scope:** API, auth, data integrity, security headers, §7 reference-building math
**Not covered:** visual rendering, click/hover interactions, browser-side state (run manually via `SMOKE_TEST.md` §§1–6 + local §7 addendum)

---

## ✅ Passing checks

| Check | Result |
|---|---|
| Dev URL loads | HTTP 200 |
| Login: wrong password | HTTP 401 `Invalid password` |
| Login: correct password | HTTP 200, 64-char crypto token |
| Login rate limit | Trips at attempt 2 → 429 (defends `/api/auth/login`) |
| `/api/auth/check` valid token | `{valid: true}` |
| `/api/auth/check` no token | `{valid: false}` |
| Data endpoint without token | HTTP 401 `Unauthorized — missing token` |
| Data endpoint with bad token | HTTP 401 `invalid or expired session` |
| `buildings.json` count | **1,210** |
| `enrichment.json` count | **1,210** |
| `yearly.json` count | **1,210** |
| `yoy-deltas` count | **1,210** |
| `ml_drivers` coverage | **1,210 / 1,210 (100%)** |
| `ll97_cap_2024` coverage | **1,210 / 1,210** |
| `ll97_cap_2030` coverage | **1,210 / 1,210** |
| `/api/query` rejects empty input | HTTP 400 |
| `/api/query` rejects 501-char input | HTTP 400 |
| Helmet headers on API | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy all present |

---

## 🎯 §7 reference-building gauge math — exact match

| Building | 2024 % | 2030 % | Expected | Match |
|---|---|---|---|---|
| 1080 Fifth Ave | 105% | 177% | 105 / 177 | ✅ |
| 936 Fifth Ave  | 64%  | 108% | 64 / 108  | ✅ |
| 1120 Ave of the Americas (= "1120 6th Ave") | 57% | 106% | 57 / 106 | ✅ |

---

## 📊 Sample SHAP drivers — 1080 Fifth Ave (ml_risk = 0.003)

Bottom-of-rankings low-risk building. All five drivers lean ↓ — model correctly does **not** treat a $91k LL97 2030 penalty as a churn indicator on its own.

```
energy_star          ↓ contrib -3.08  value 10
peer_score           ↓ contrib -1.08  value 0.07
log_ghg              ↓ contrib -0.99  value 780 MT CO₂e
ll97_penalty_2030    ↓ contrib -0.43  value $91,120
year_built           ↓ contrib -0.38  value 1961
```

Demonstrates the model is not a rebadged LL97 calculator.

---

## ⚠️ Drift findings (docs vs live build)

| Item | Docs | Live | Severity |
|---|---|---|---|
| Smoke-test password | `coned-steam-2026` (SMOKE_TEST.md) | Different value in local `.env` | **High** — testers can't log in by following the doc |
| High tier count | 58 (Issue #2 + README) | **59** | Low |
| Medium tier count | 8 (Issue #2) | **6** | Low |
| Uncertain tier count | 50 (README) | **0** | **High** — purple tier appears eliminated; §7 "Uncertain card hides gracefully" is untestable; ConEd-alignment narrative in README is now inaccurate |
| Over 2024 cap | 166 (Issue #2) | **165** | Low |
| Combined 2024 fine | $82.0M | **$81.9M** | Matches |

---

## Recommended actions

1. **Update `SMOKE_TEST.md`** to match the current local `.env` password, or document how testers should source it (e.g. from team Slack rather than hardcoded in the file).
2. **Investigate the Uncertain tier**:
   - Live build has 0 buildings in the Uncertain tier, but README still claims 50.
   - Either a regression in the model pipeline (now scoring buildings that previously couldn't be scored) or an intentional removal that the docs haven't caught up to.
   - The ConEd-alignment story for Uncertain (matching their low-R² classification) is one of the named talking points in the README — worth deciding whether to restore it or to update the README narrative.
