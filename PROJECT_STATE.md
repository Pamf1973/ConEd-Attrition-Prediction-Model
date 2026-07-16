---
last_synced_sha: bc1700c7d089a59c935d5a702fae1aa0c868b46f
last_synced_at: 2026-07-16 09:29
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
<!-- What exists and works. One line per module/capability. -->
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js)
- Data pipeline: 10 Python scripts at repo root; outputs baked into public/*.json at deploy time
- Risk engine: XGBoost + rule-based hybrid (`compute_diagnostic_risk` at update_enrichment_risk.py:71); Path C chain per system-v1.1.md §4.1
- API: all routes in api/server.js — auth, data, alerts, watchlist (in-memory), LLM (Anthropic→Groq→OpenRouter fallback), CSV export
- Legacy UI: React 19 + Vite 8 + Tailwind — RiskTable, BuildingPanel, Watchlist, AIAgent, proactive alerts
- YoY deltas + LL97 + SHAP drivers in enrichment (PR #7 merged, now legacy)
- XGBoost predict endpoints + diagnostic tier filter in RiskTable (523597d)
- Security hardening: Helmet, rate-limit, input sanitization (36844c2)
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS, STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library (bc1700c)
- Fable design system landed: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- PR #9 (ismaelcaraballo-afk, branch: ismael/monday-workflow): W1 pipeline timestamp, W4 queue arithmetic, W6 QuickFilters against legacy components — review pending. Overlaps R9/R10 territory. See Drift Flags.
- spike/threshold-proximity branch: status unknown — investigate before merge or discard (per CLAUDE.md)

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC rerun) blocks on R2 (model_meta object); R2 not yet started
- R5 (case-file header) blocks on R4 + R2; neither started
- R10 (This Week landing) blocks on R7, R8, R9, R2 — all planned, none active
- R7/R8 (status events + snapshot diffing) depend on R2; R2 not yet started
- All UI Fable milestones (R4–R13) await R1 (Pedro: legacy separation); R1 not yet started

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
<!-- Format: - YYYY-MM-DD | Who: commitment. Expected by ~date. Unconfirmed. -->
- No verbal commitments captured yet. Use /note to log any call agreements.

## Current Risks
<!-- Max 5. -->
1. PR #9 boundary risk: Ismael's monday-workflow PR applies Fable W-laws to legacy components (RiskTable/App.jsx) using localStorage. If merged before M0 (R1 legacy separation), the new build inherits entangled state or the PR creates a fork divergence. Edwin must review against legacy-vs-new-build boundary rules before merge.
2. R1 unstarted (Pedro): every Fable milestone (R4–R13) is blocked until legacy separation ships. Pedro has no active branch.
3. R2 unstarted (Ismael + Edwin): model_meta.json is the cross-cutting dependency for chip copy, AUC lines, freshness anchors, and both footers — 11 downstream R-items wait on it. No branch open.
4. spike/threshold-proximity branch: unknown state, unknown owner. If it contains mergeable work it risks rotting; if it conflicts with Fable specs it needs explicit cut decision.
5. JSONs container-baked with no CI: any data refresh requires a full Railway redeploy. Until M8 data-decoupling scopes further, stale data risk grows with each week of no pipeline run.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
