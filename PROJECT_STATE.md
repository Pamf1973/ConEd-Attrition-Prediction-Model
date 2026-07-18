---
last_synced_sha: 637a78e64b55e5149c74f322bd03bb2cc830872a
last_synced_at: 2026-07-18 02:13
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
<!-- What exists and works. One line per module/capability. -->
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js)
- Data pipeline: 10 Python scripts at repo root; outputs baked into public/*.json at deploy time
- Risk engine: XGBoost + rule-based hybrid (`compute_diagnostic_risk` at update_enrichment_risk.py:71); Path C chain per system-v1.1.md §4.1
- API: all routes in api/server.js — auth, data, alerts, watchlist (in-memory), LLM (Anthropic→Groq→OpenRouter fallback), CSV export
- Legacy UI (R1 shipped, PR #13 merged 44dd42c): frozen React 19 + Vite 8 + Tailwind runtime under `src/legacy/` — App.jsx, components/, data/, hooks/, lib/ all self-contained; imports rewritten; AIAgent lives only here
- New-build stub: `src/App.jsx` construction notice at `/`; React Router 7 mounted in `src/main.jsx`; `/legacy` renders archived dashboard; Express SPA fallback in api/server.js
- YoY deltas + LL97 + SHAP drivers in enrichment (PR #7 merged, now legacy)
- XGBoost predict endpoints + diagnostic tier filter in RiskTable (523597d)
- Security hardening: Helmet, rate-limit, input sanitization (36844c2)
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D9), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library
- Fable design system landed: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c)
- Spec v1.1.1 §4.4 UNVAL→BT clarifier merged (PR #14, 25aa8a4) — back-testing against ConEd disconnect records, not CV completion
- ConEd intake form (2026-05-04) indexed as founding scope doc; DOCS_INDEX Length rule added (91e3e39)
- Docs tree reorganized + backfilled; CONVENTIONS refined (817058b, 0cd8c73)
- QUESTIONS.md scaffold + CLAUDE.md vault pointer landed (d707fc2)
- PR-9 review, D2/D3/D4/D5 filed (59585a8, eb90849, f04cf25, dc0cfb4, 1c8a197)
- Pedro M3 kickoff delta doc replaces SUPERSEDED checkpoint per D6 (669c27b)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- PR #10 open (Ismael, PR-9b, branch ismael/pr-9b-status-events, head f5bfd17). Q7 append-only building_status_events (Postgres api/db.js). **Edwin approval-freshen note filed 2026-07-18 05:29** at `docs/notes/2026-07-18_pr-10-approval-freshen.md` — verdict APPROVE at f5bfd17, formal re-approve pending. Post-approval delta (102 lines, 15 fixes across api/db.js + api/server.js) is 100% defensive hardening; zero API-contract changes. Formal `gh pr review --approve` on f5bfd17 owed to freshen the GitHub audit trail. Merge itself held on D10 chain. Advances R7 backbone. R7 watchlist migration still deferred.
- PR #11 open (Ismael, PR-9a, branch ismael/pr-9a-model-meta, head 98a676a). model_meta.json + GET /api/model_meta + FAQ ml_risk answer. **Edwin substantive re-review filed 2026-07-18 03:34** at `docs/notes/2026-07-18_pr-11-rereview.md` — verdict APPROVE with 6 non-blocking observations. All 8 requested fixes (3 coupled + 5 panel findings) land correctly. FAQ copy passes §7-rule-8/9 + §8-rule-1/2/3 line-by-line. 6 observations: O1 M1 pipeline write-path not implemented (scope gap vs CLAUDE.md), O2 no smoke tests, O3 PR body still says `public/model_meta.json` (actual: `data/`), O4 `validated` boolean tolerates non-canonical values, O5 cached ref not frozen, O6 new `/api/model_meta` route contradicts CLAUDE.md M1 "no new route." Formal `gh pr review --approve` owed on 98a676a to lift reviewDecision from empty. Merge held on D10. Advances R2, R3.
- PR #12 draft (Ismael, PR-9c, branch ismael/pr-9c-frontend-workflow, head b34479a). W1/W4/W6 frontend on legacy files. mergeable=MERGEABLE. Rebase debt CLEARED — commit b34479a mirrors useWorkflow/QuickFilters/RiskTable/App.jsx into src/legacy/. Two prior commits (685dca7, 3f12ff3) applied panel-review + CRITICAL/HIGH/MED/LOW security fixes (handleQuickFilter React 19 batching fix, 64-bit hash, XSS guards, MAX_SET_SIZE, UTC date math). Title still tagged [PARKED] — draft status not yet lifted.

## PRs awaiting review
<!-- Open PRs where the user is a requested or implied reviewer. -->
- PR #10 (Ismael, PR-9b). Edwin approval-freshen review complete (2026-07-18 05:29). Verdict APPROVE at f5bfd17. Formal `gh pr review --approve` on new head owed. Merge D10-gated. Five of six D8 post-merge follow-ups still outstanding (ACTOR_HMAC_SECRET-required-in-prod retired by f5bfd17 code + D10 config).
- PR #11 (Ismael, PR-9a). Edwin substantive re-review complete (2026-07-18 03:34). Verdict APPROVE at 98a676a with 6 non-blocking observations (O1–O6 in review note). Formal `gh pr review --approve` owed. Merge D10-gated. Ismael to update PR body (O3 — one-line fix, `public/` → `data/`).
- PR #12 (Ismael, PR-9c, DRAFT). Not in this session's review batch — nothing new since last kick, Ismael not asking for merge. Ball still on Ismael to lift [PARKED] tag / draft status.

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC) shipped in PR #11 head; still "planned" in ROADMAP until merge.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs #11/#10.
- R7/R8: R7 backbone in PR #10 (approved on stale SHA, head advanced twice); R7 watchlist migration owed; R8 unstarted, depends on R2 merge.
- Pedro M3 (score cell) unblocks after PR #11 merges (score cell reads `model_version` for provenance chip). Pedro branch not yet opened; kickoff at docs/briefs/2026-07-17_pedro-m3-kickoff.md.

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
- 2026-07-16 | Ismael: R7 watchlist migration (in-memory `watchlistStore` Map → Postgres). Second half of M6, not in PR #10 diff. Not touched in PR #10 follow-up commits either. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Ismael internally signed. Unconfirmed.
- 2026-07-16 | Ismael (implied, via Slack): `plans/ai_model_config.md` — 5-model panel review, config-out-of-public/, BullMQ job queue, structured form UI for v1. Zero git footprint. Push or send doc so it can be intaken. Unconfirmed.
- 2026-07-17 | Ismael: Railway diagnosis + manual redeploy — **CONFIRMED via 2026-07-18 verbal**: root cause NEEDS_APPROVAL gate since 2026-07-14, manual `railway redeploy --from-source --yes` shipped deploy 69f0a320 SUCCESS, 18-day backlog live on prod. Retires and supersedes into D10 migration plan.
- 2026-07-17 | Ismael: address six PR #10 review follow-ups per D8 approve-with-follow-ups verdict. Full list at `docs/notes/2026-07-17_pr-10-review.md` §Suggested follow-ups. ACTOR_HMAC_SECRET-required-in-prod landed in f5bfd17 (code) and is now scoped to new Railway env per D10 (config); the other five (CHECK constraint drift, smoke tests, SERIAL → BIGSERIAL, bulk/single shape parity, DB_POOL_MAX ceiling) remain. Partial-progress.
- 2026-07-18 | Edwin: re-review PR #10 post-approval commits (bf03f84, f5bfd17). **CONFIRMED 2026-07-18 05:29** — APPROVE at f5bfd17. Formal `gh pr review --approve` on new head still owed (audit-trail freshen). Merge held on D10.
- 2026-07-18 | Edwin: review PR #11 head 98a676a (three coupled fixes + 5 panel findings). **CONFIRMED 2026-07-18 03:34** — APPROVE with 6 non-blocking observations. Formal `gh pr review --approve` on 98a676a still owed. Merge held on D10. Ismael owes PR-body one-liner (O3: `public/` → `data/`).
- 2026-07-18 | Pedro (D10): link coned-dashboard repo to a new Railway service on his account (paid plan, no deployment protection), share deploy URL. Unblocks the PR #10 / PR #11 merge queue. Unconfirmed.
- 2026-07-18 | Mel (D10): migrate env vars (DASHBOARD_PASSWORD, GROQ_API_KEY, OPENROUTER_API_KEY, NODE_ENV, SKIP_ENRICHMENT) to Pedro's new Railway service once it is up. Unconfirmed.
- 2026-07-18 | Edwin (D10): hold PR #10 and PR #11 merges until Pedro's Railway is set up, so first merge deploys clean to the new account. Unconfirmed (in force until D10 migration completes).
- 2026-07-18 | Ismael (D10): add ACTOR_HMAC_SECRET to new Railway env before PR #10 can merge (audit-trail protection). Unconfirmed.
- 2026-07-18 | Edwin (D8, silent): verify M0 on current live prod (`/`, `/legacy`, deep-link refresh, login round-trip). Ismael's 2026-07-18 00:15 Slack assigned this to Pedro; D8 overrides silently, no ping-back. **CONFIRMED 2026-07-18 03:07** — Playwright round-trip clean, M0 accepted. Three follow-ups (blank deep-link, /api/health auth drift, /api/meta pre-M1 hardcode) filed in `docs/notes/2026-07-18_m0-prod-verify.md`. None block M0.
- 2026-07-18 | Ismael (M0 follow-up): reconcile `/api/health` auth-guard drift — either update CLAUDE.md API-contract table (if intentional) or remove the requireAuth + add smoke test (if accidental). Also confirms nothing else in Railway's healthcheck config points at this endpoint. Unconfirmed. New commitment this verify.
- 2026-07-18 | Edwin (M0 follow-up): add `<Route path="*" element={<NotFound />} />` to `src/main.jsx` before M3 kicks off, so deep-link SPA fallback lands somewhere legible instead of a blank div. Unconfirmed. New commitment this verify.

## Current Risks
<!-- Max 5. -->
1. **Railway migration in flight per D10.** Prior stall resolved 2026-07-18 via manual `railway redeploy --from-source --yes` (deploy 69f0a320 SUCCESS); 18-day backlog is now live (Pedro's M0, 523597d XGBoost predicts, 36844c2 security hardening). Migration to Pedro's Railway account (paid plan, no deployment protection) underway. Deploy-clean discipline in force: PR #10 and PR #11 merges held until Pedro's new service is up and Mel's env-var migration lands with ACTOR_HMAC_SECRET set. Edwin's D8 M0 prod-verify RETIRED 2026-07-18 03:07 — Playwright round-trip clean, three non-blocking follow-ups filed.
2. PR #10 approval-on-stale-SHA drift RETIRED 2026-07-18 05:29. Edwin re-reviewed the full 646f88a..f5bfd17 delta (102 lines, 15 fixes across 2 commits) and filed approval-freshen note; formal `gh pr review --approve` on f5bfd17 owed to close the GitHub-side audit trail. Precedent established: post-approval commits with material scope get formally re-reviewed, not trust-merged. Rule filed for future PR-review workflow.
3. PR #11 body drift: description still says `public/model_meta.json` but file lives at `data/`. Carried over from prior /sync; not fixed in the 98a676a commit that applied Edwin's fixes. Reviewer trip hazard.
4. Off-git commitments (Ismael Slack `plans/ai_model_config.md`): infrastructure track described in Slack with no repo footprint. If Ismael starts building against it without pushing the plan, we lose auditability. Prompt him to push.
5. State-log two-writers pattern (~/vault/workflow/state-log-two-writers.md): candidate #5 ("meta-work rides on real-work commits") — criterion 3 test finally comes due this session. End-of-session bundled commit folds all held diffs (STATE_LOG appends across 2 /sync + 3 review/verify entries, PROJECT_STATE updates, DECISIONS D10, SESSION_JOURNAL checkpoint) alongside new real-work files (M0 verify note, both PR review notes). If the fold lands clean with no orphaned entries or duplicate SHA claims on next /sync, criterion 3 passes and the pattern moves from "candidate" to "adopted." If not, candidate #5 fails and we need candidate #6.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
