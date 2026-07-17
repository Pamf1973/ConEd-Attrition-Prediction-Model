---
last_synced_sha: f04cf25aed0d2158a2abb398b9cbce543a5dc6e4
last_synced_at: 2026-07-16 21:49
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
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D4), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library (bc1700c)
- Fable design system landed: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c)
- Docs tree reorganized + backfilled: 25 loose docs filed into docs/{ref,briefs,design,archive}; CONVENTIONS refined (817058b, 0cd8c73)
- QUESTIONS.md scaffold + CLAUDE.md vault pointer landed (d707fc2)
- PR-9 review + Pedro checkpoint intaken; D2/D3/D4 filed (59585a8, eb90849, f04cf25)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- R1 (Edwin, owner-rerouted via D5). Branch edwin/M0-legacy-separation not yet opened. Scope per roadmap-supplement-m0.md: React Router, /legacy route, file moves to src/legacy/, boundary rules per CLAUDE.md §Legacy. Unblocks R4–R13 (Pedro) and PR-9c rebase (Ismael).
- PR #10 open (Ismael, PR-9b, branch ismael/pr-9b-status-events). Q7 append-only building_status_events (Postgres api/db.js, sha256 actor pseudonym, timingSafeEqual hash-both-sides fix, per-endpoint rate limiters). +396/-12. Status: mergeable now, no deps. Advances R7 backbone. Watchlist migration still deferred.
- PR #11 open (Ismael, PR-9a, branch ismael/pr-9a-model-meta). data/model_meta.json (cv_auc 0.6833 ± 0.0511, cv_kfold 5, n_positive 54, validated) + GET /api/model_meta (60s TTL) + FAQ ml_risk answer rewritten as getAnswer(). +60/-3. Status: blocks on Edwin FAQ copy pass. Advances R2, R3.
- PR #12 draft (Ismael, PR-9c, branch ismael/pr-9c-frontend-workflow). W1/W4/W6 frontend on legacy files. +280/-53. Status: PARKED until R1 (now Edwin's). Ismael rebases against new-build components post-R1.
- PR-9c rebase (W1/W4/W6 to new-build components) awaits R1 land.
- spike/threshold-proximity branch: status unknown — investigate before merge or discard (per CLAUDE.md)

## PRs awaiting review
<!-- Open PRs where the user is a requested or implied reviewer. -->
- PR #10 (Ismael, PR-9b). Body requests Edwin + Pedro review. No formal GH review request assigned. Mergeable now — decide whether to review or merge on trust.
- PR #11 (Ismael, PR-9a). Awaiting Edwin FAQ copy pass on ml_risk answer before merge. Unblocks Pedro's M3 score cell provenance chip.
- PR #12 (Ismael, PR-9c, DRAFT). Parked; no review needed until Pedro R1 lands and Ismael rebases.

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC) shipped in PR #11; still "planned" in ROADMAP until merge.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs #11/#10.
- R7/R8 (status events + snapshot diffing) — R7 backbone in PR #10 (mergeable now), watchlist migration still owed; R8 unstarted, depends on R2 merge.
- All UI Fable milestones (R4–R13) await R1 (owner rerouted to Edwin per D5, 2026-07-16 21:59). Branch edwin/M0-legacy-separation not yet opened; Pedro picks up at R4 once R1 lands.

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
<!-- Format: - YYYY-MM-DD | Who: commitment. Expected by ~date. Unconfirmed. -->
- 2026-07-16 | Edwin: FAQ copy pass on Ismael's rewritten ml_risk answer. Reference by symbol — `getAnswer('ml_risk')` inside PR-11's rewritten answer block in `api/server.js`. (Prior line-number pointers stale — see Risk #1; both CLAUDE.md and HANDOFF need reconciling to symbolic references.) Unblocks PR-11 (PR-9a) merge. Expected this week. Unconfirmed.
- 2026-07-16 | Edwin: R1 (M0 legacy separation) solo, per D5. Open branch edwin/M0-legacy-separation; execute per roadmap-supplement-m0.md. Send Slack update to team announcing owner reroute (manual). Expected within days. Unconfirmed — not yet started.
- 2026-07-16 | Ismael: R7 watchlist migration (in-memory Map in `api/server.js` `watchlistStore` — retires to Postgres). Second half of M6, not in PR #10 diff. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Ismael internally signed. Unconfirmed.
- 2026-07-16 | Edwin: reconcile FAQ line-number pointers in `CLAUDE.md` (§Key files map M1 row, §Legacy chatbot situation) and `HANDOFF.md` — replace `:867` / `:976` bare line numbers with symbolic references (`getAnswer('ml_risk')`, `/api/meta` handler). Lesson filed at ~/vault/workflow/durable-references-in-docs.md. Expected same session as FAQ copy pass. Unconfirmed.
- 2026-07-16 | Edwin: post Path A comment on PR-9 thread (draft in review doc "Suggested comment" section). Since PR #9 is now closed and #10/#11/#12 exist, this may be moot — reconcile whether the comment intent belongs on the split PRs. Unconfirmed.

## Current Risks
<!-- Max 5. -->
1. FAQ line-number drift (docs): CLAUDE.md `server.js:867`, HANDOFF `server.js:976`, actual on main `:870`. Two stale pointers to the same target from two different failure modes (snapshot rot + cross-branch confusion). Lesson filed at ~/vault/workflow/durable-references-in-docs.md. Docs still need the actual reconciling edit (replace bare line numbers with symbolic refs).
2. R1 execution risk (Edwin, rerouted via D5): Edwin now solo on R1 + FAQ copy + line-number reconciling + R14 signoff + a Pedro/team Slack update, on top of R10 (M10 methodology page). Load higher than pre-D5; watch for slippage on any of these.
3. PR-9c rot risk: draft PR held open as placeholder awaiting R1. Every day R1 slips, PR-9c stales against main and rebase debt grows. Watch weekly.
4. spike/threshold-proximity branch: unknown state, unknown owner. If mergeable it risks rotting; if it conflicts with Fable specs it needs explicit cut decision.
5. JSONs container-baked with no CI: any data refresh requires a full Railway redeploy. Model_meta.json in PR-11 lives in `data/` (not `public/`) — same baking constraint, but at least behind auth via `/api/model_meta`.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
