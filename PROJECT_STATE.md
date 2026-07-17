---
last_synced_sha: dc0cfb4eb84a8e9d519f17226e769c9b815ff050
last_synced_at: 2026-07-17 15:29
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
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D5), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library
- Fable design system landed: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c)
- Docs tree reorganized + backfilled; CONVENTIONS refined (817058b, 0cd8c73)
- QUESTIONS.md scaffold + CLAUDE.md vault pointer landed (d707fc2)
- PR-9 review, Pedro checkpoint, D2/D3/D4/D5 filed (59585a8, eb90849, f04cf25, dc0cfb4)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- R1 (Edwin, per D5). Local branch `edwin/M0-legacy-separation` opened, no commits yet, no upstream. Scope per roadmap-supplement-m0.md: React Router, /legacy route, file moves to src/legacy/, boundary rules per CLAUDE.md §Legacy. Unblocks R4–R13 (Pedro) and PR-9c rebase (Ismael).
- PR #10 open (Ismael, PR-9b, branch ismael/pr-9b-status-events). Q7 append-only building_status_events (Postgres api/db.js). Second commit 646f88a hardens: trust-proxy back to NODE_ENV production/TRUST_PROXY, statusReadLimiter 60/min + LIMIT/OFFSET pagination on GET, actorTag HMAC with ACTOR_HMAC_SECRET, BBL_RE tightened to `/^[1-5]\d{9}$/`, DB_POOL_MAX bounds check. Total +396/-12 + +48/-19. Mergeable now, no deps. Advances R7 backbone. R7 watchlist migration still deferred.
- PR #11 open (Ismael, PR-9a, branch ismael/pr-9a-model-meta). model_meta.json (cv_auc 0.6833 ± 0.0511, cv_kfold 5, n_positive 54, validated) + GET /api/model_meta + FAQ ml_risk answer rewritten as getAnswer(). Second commit d574773 MOVES the file from `public/` to `data/` (C-1: was web-accessible bypassing auth), adds 60s TTL cache refresh, validateModelMeta() numeric sanitizer, console.error on catch, matchFAQ() → getAnswer() plumbing, Cache-Control 3600 → 60. Total +60/-3 + +42/-8. Blocks on Edwin FAQ copy pass. Advances R2, R3.
- PR #12 draft (Ismael, PR-9c, branch ismael/pr-9c-frontend-workflow). W1/W4/W6 frontend on legacy files. Second commit b678cb1 fixes: useEffect clobber (Effect 2 was overwriting Effect 1's load, lastReview showed 'today' when a prior value existed), djb2 hash localStorage key suffix (replacing raw JWT), queue arithmetic double-subtraction via union not sum, clearWorkflow removes lastReviewKey, formatLastReview null for negative diffDays. Total +280/-53 + +32/-16. Still PARKED until R1. Ismael rebases against new-build components post-R1.
- spike/threshold-proximity branch: status unknown — investigate before merge or discard.

## PRs awaiting review
<!-- Open PRs where the user is a requested or implied reviewer. -->
- PR #10 (Ismael, PR-9b). Body requests Edwin + Pedro review. No formal GH review request assigned. Mergeable now — decide review-or-merge-on-trust.
- PR #11 (Ismael, PR-9a). Awaiting Edwin FAQ copy pass on ml_risk answer before merge. Unblocks Pedro's M3 score cell provenance chip. Note: PR body still references `public/model_meta.json` but the commit moved it to `data/`; ask Ismael to update the body.
- PR #12 (Ismael, PR-9c, DRAFT). Parked; no review needed until R1 lands and Ismael rebases.

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC) shipped in PR #11; still "planned" in ROADMAP until merge.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs #11/#10.
- R7/R8: R7 backbone in PR #10 (mergeable), watchlist migration owed; R8 unstarted, depends on R2 merge.
- All UI Fable milestones (R4–R13) await R1 (Edwin per D5). Branch `edwin/M0-legacy-separation` empty. Pedro picks up at R4 once R1 lands.

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
- 2026-07-16 | Edwin: FAQ copy pass on Ismael's rewritten ml_risk answer. Reference by symbol — `getAnswer('ml_risk')` inside PR-11's rewritten answer block in `api/server.js`. Unblocks PR-11 (PR-9a) merge. Expected this week. Unconfirmed.
- 2026-07-16 | Edwin: R1 (M0 legacy separation) solo, per D5. Branch `edwin/M0-legacy-separation` opened locally, zero commits. Slack update to team owed (manual). 1 day past D5 fire. Expected within days. Unconfirmed.
- 2026-07-16 | Ismael: R7 watchlist migration (in-memory `watchlistStore` Map → Postgres). Second half of M6, not in PR #10 diff. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Ismael internally signed. Unconfirmed.
- 2026-07-16 | Edwin: reconcile FAQ line-number pointers in `CLAUDE.md` and `HANDOFF.md` — replace `:867` / `:976` bare line numbers with symbolic references (`getAnswer('ml_risk')`, `/api/meta` handler). Lesson at ~/vault/workflow/durable-references-in-docs.md. Expected same session as FAQ copy pass. Unconfirmed.
- 2026-07-16 | Ismael (implied, via Slack): `plans/ai_model_config.md` — 5-model panel review, config-out-of-public/, BullMQ job queue, structured form UI for v1. Zero git footprint on any remote branch. Likely local-only. Push or send doc so it can be intaken. Unconfirmed.

## Current Risks
<!-- Max 5. -->
1. R1 execution risk (Edwin, per D5): Edwin solo on R1 + FAQ copy + line-number reconciling + R14 signoff + Pedro/team Slack update, on top of R11 (methodology page). Branch opened but zero commits 1 day in. Watch for slippage.
2. FAQ line-number drift (docs): CLAUDE.md `server.js:867`, HANDOFF `server.js:976`, actual on main `:870`. PR-11 will move the block to ~907-913. Docs still need the reconciling edit (replace bare line numbers with symbolic refs).
3. PR-9c rot risk: draft PR held open as placeholder awaiting R1. Every day R1 slips, rebase debt grows. Watch weekly.
4. PR #11 body drift: description says `public/model_meta.json` but commit moved it to `data/`. Confuses reviewers; not a merge blocker. Ask Ismael to update body.
5. Off-git commitments (Ismael Slack `plans/ai_model_config.md`): infrastructure track described in Slack with no repo footprint. If Ismael starts building against it without pushing the plan, we lose auditability. Prompt him to push the doc.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
