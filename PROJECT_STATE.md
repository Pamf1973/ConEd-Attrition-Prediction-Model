---
last_synced_sha: d707fc2faffe9a2d4ed4668dbda3fea673d07bae
last_synced_at: 2026-07-16 19:00
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
- Docs tree reorganized + backfilled: 25 loose docs filed into docs/{ref,briefs,design,archive}; CONVENTIONS refined (817058b, 0cd8c73)
- QUESTIONS.md scaffold + CLAUDE.md vault pointer landed (d707fc2)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- PR #9 open on fork ismaelcaraballo-afk (branch `ismael/monday-workflow`, updated 2026-07-15 23:17). Bundles R2 (model_meta.json + /api/model_meta + FAQ rewrite), R3 (AUC 0.6833 ± 0.0511, 5-fold CV), R7-partial (api/db.js + status events endpoints; watchlist migration deferred), W1/W4/W6 frontend on legacy files. Awaits Edwin FAQ copy pass, awaits Ismael to execute Path A split. Review at docs/notes/2026-07-16_pr-9-review.md.
- spike/threshold-proximity branch: status unknown — investigate before merge or discard (per CLAUDE.md)

## PRs awaiting review
<!-- Open PRs where the user is a requested or implied reviewer. -->
- PR #9 (Ismael, fork). Edwin + Pedro named as reviewers in Ismael's message. No formal GitHub review request assigned. Path A split awaited before per-PR sign-off.

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC rerun) shipped in PR #9; still "planned" in ROADMAP until merge.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PR.
- R7/R8 (status events + snapshot diffing) depend on R2; R7-partial in PR #9 (backbone only, watchlist migration owed).
- All UI Fable milestones (R4–R13) await R1 (Pedro: legacy separation); R1 not yet started. Pedro checkpoint filed 2026-07-16 telling him to start now.

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
<!-- Format: - YYYY-MM-DD | Who: commitment. Expected by ~date. Unconfirmed. -->
- 2026-07-16 | Edwin: FAQ copy pass on Ismael's rewritten ml_risk answer (server.js:867 area, R2 scope split). Unblocks PR-9a merge. Expected this week. Unconfirmed.
- 2026-07-16 | Ismael: split PR #9 into three PRs per Path A (PR-9a R2+R3 backend, PR-9b R7 backbone + security, PR-9c W1/W4/W6 frontend parked). Expected this week. Unconfirmed.
- 2026-07-16 | Ismael: R7 watchlist migration (in-memory Map at server.js:314 retires to Postgres). Second half of M6, not in PR #9 diff. Unconfirmed.
- 2026-07-16 | Pedro: start R1 (M0 legacy separation) per checkpoint brief at docs/briefs/2026-07-16_pedro-checkpoint.md. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Ismael internally signed. Unconfirmed.

## Current Risks
<!-- Max 5. -->
1. PR #9 boundary risk: W1/W4/W6 frontend lives on RiskTable.jsx / App.jsx / BuildingPanel.jsx — the exact files R4/R5 will replace after R1. Path A splits this into PR-9c parked-until-R1-rebase. If Path A isn't executed and PR #9 merges bundled, those features get frozen in src/legacy/ at R1 and R9 must reimplement contact/dismiss + queue arithmetic from scratch.
2. R1 unstarted (Pedro): every Fable milestone (R4–R13) blocked until legacy separation ships. Checkpoint brief sent 2026-07-16. No branch open yet.
3. R2/R3/R7 status ambiguity: code shipped in unmerged PR. Downstream planners (R4/R5/R6/R8/R10/R11/R13) still block until merge, not until code exists. Path A split accelerates partial unblocking (R7 backbone mergeable immediately, R2+R3 after Edwin copy pass).
4. spike/threshold-proximity branch: unknown state, unknown owner. If mergeable it risks rotting; if it conflicts with Fable specs it needs explicit cut decision.
5. JSONs container-baked with no CI: any data refresh requires a full Railway redeploy. M1's model_meta.json now sourced from a file but freshness still deploy-gated until M8 data-decoupling scopes further.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
