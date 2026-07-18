---
last_synced_sha: 669c27be050c67d042b7080a89b7cd62300be1aa
last_synced_at: 2026-07-17 22:50
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
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D8), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library
- Fable design system landed: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c)
- Docs tree reorganized + backfilled; CONVENTIONS refined (817058b, 0cd8c73)
- QUESTIONS.md scaffold + CLAUDE.md vault pointer landed (d707fc2)
- PR-9 review, D2/D3/D4/D5 filed (59585a8, eb90849, f04cf25, dc0cfb4, 1c8a197)
- Pedro M3 kickoff delta doc replaces SUPERSEDED checkpoint per D6 (669c27b)

## In Flight
<!-- Actively being worked. Owner + roadmap ID per line. -->
- Edwin: v1.1.1 spec clarifier + D7 session on branch `edwin/system-v1.1.1-unval-clarifier`; PR #14 open. §4.4 UNVAL→BT gate paragraph (back-testing against ConEd disconnect records, not CV completion). D7 files "ranking not likelihood" reframe. Also indexes ConEd intake form + DOCS_INDEX length rule for grep-double-duty. Working-tree: unstaged mods to DECISIONS.md + PROJECT_STATE.md; untracked docs/notes/2026-07-17_pr-10-review.md (PR #10 approve verdict artifact).
- PR #10 open (Ismael, PR-9b, branch ismael/pr-9b-status-events). Q7 append-only building_status_events (Postgres api/db.js). Approved by Edwin 2026-07-18 02:41 UTC via review body (D8 verdict: approve with six follow-ups filed). Mergeable now, no deps. Advances R7 backbone. R7 watchlist migration still deferred.
- PR #11 open (Ismael, PR-9a, branch ismael/pr-9a-model-meta). model_meta.json + GET /api/model_meta + FAQ ml_risk answer rewritten. Edwin commented 2026-07-17 with three coupled fixes: (a) validation_status "validated" → "unvalidated" (b) model_version "XGB v1" → "XGB v1 · UNVAL" (c) FAQ getAnswer rewrite per §7 rule 8/9 + §8 rule 1/2. Blocks on Ismael applying fixes. Advances R2, R3.
- PR #12 draft (Ismael, PR-9c, branch ismael/pr-9c-frontend-workflow). W1/W4/W6 frontend on legacy files. Mergeable=CONFLICTING after main advanced. Ismael rebases against new-build components once he's ready. R1 dependency now cleared.
- spike/threshold-proximity branch: status unknown — investigate before merge or discard.

## PRs awaiting review
<!-- Open PRs where the user is a requested or implied reviewer. -->
- PR #10 (Ismael, PR-9b). Edwin APPROVED 2026-07-18 02:41 UTC. Six post-merge follow-ups filed (see D8 + docs/notes/2026-07-17_pr-10-review.md). Ismael merges when ready.
- PR #11 (Ismael, PR-9a). Awaiting Ismael to apply Edwin's three coupled fixes (validation_status, model_version suffix, FAQ getAnswer rewrite). Unblocks Pedro's M3 provenance chip. PR body still references `public/model_meta.json` but file moved to `data/`.
- PR #12 (Ismael, PR-9c, DRAFT). Parked; rebase against new-build components needed. R1 has landed (44dd42c) so dependency is now resolved; ball is in Ismael's court.
- PR #14 (Edwin, v1.1.1 clarifier). Open on branch `edwin/system-v1.1.1-unval-clarifier`, mergeable. No formal reviewer requested. Docs+spec only.

## Blocked
<!-- What is stuck and on what. -->
- R3 (AUC) shipped in PR #11; still "planned" in ROADMAP until merge.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs #11/#10.
- R7/R8: R7 backbone in PR #10 (approved, awaiting Ismael merge); watchlist migration owed; R8 unstarted, depends on R2 merge.
- Pedro M3 (score cell) picks up now that R1 has landed on origin/main; kickoff delta at docs/briefs/2026-07-17_pedro-m3-kickoff.md.
- Pedro branch not yet opened; awaiting kickoff.

## Open Commitments
<!-- Verbal agreements not yet confirmed by landed code. -->
- 2026-07-16 | Ismael: R7 watchlist migration (in-memory `watchlistStore` Map → Postgres). Second half of M6, not in PR #10 diff. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Ismael internally signed. Unconfirmed.
- 2026-07-16 | Edwin: reconcile FAQ line-number pointers in `CLAUDE.md` and `HANDOFF.md` — replace bare line numbers with symbolic references (`getAnswer('ml_risk')`, `/api/meta` handler). Note: CLAUDE.md already updated in 44dd42c per §Frontend architecture; HANDOFF.md still owed. Partially confirmed.
- 2026-07-16 | Ismael (implied, via Slack): `plans/ai_model_config.md` — 5-model panel review, config-out-of-public/, BullMQ job queue, structured form UI for v1. Zero git footprint. Push or send doc so it can be intaken. Unconfirmed.
- 2026-07-17 | Ismael: diagnose why Railway auto-deploy has been silently failing since 2026-06-30 13:17 ET (bundle last-modified matches commit `9319eb3`; nothing since shipped). Trigger a manual redeploy to ship the 18-day backlog (523597d XGBoost predicts, 36844c2 security hardening, 44dd42c PR #13 M0 routing). Post-redeploy verify split by ownership per D8: Ismael verifies XGBoost + security surfaces; Edwin verifies M0 (/ stub, /legacy, deep-link refresh, login round-trip). Unconfirmed.
- 2026-07-17 | Ismael: address six PR #10 review follow-ups per D8 approve-with-follow-ups verdict. Full list at `docs/notes/2026-07-17_pr-10-review.md` §Suggested follow-ups (CHECK constraint drift, smoke tests, SERIAL → BIGSERIAL, ACTOR_HMAC_SECRET required in prod, bulk/single shape parity, DB_POOL_MAX ceiling). Non-blocking, no correctness bugs; batched for a follow-up PR. Unconfirmed.
- 2026-07-17 | Ismael: apply three coupled fixes to PR #11 per Edwin's review comment (validation_status → "unvalidated", model_version → "XGB v1 · UNVAL", FAQ getAnswer rewrite per §7 rule 8/9 + §8 rule 1/2 with hybrid-tier framing). Update PR body path reference. Unblocks PR-11 merge. Unconfirmed.

## Current Risks
<!-- Max 5. -->
1. **Railway auto-deploy stalled since 2026-06-30 13:17 ET.** Prod bundle `last-modified` header matches commit `9319eb3` (LL97 cap fix); nothing since has shipped. 18+ days of unshipped work: `523597d` (XGBoost predict endpoints), `36844c2` (security hardening — Helmet CSP, rate-limit, input sanitization), `44dd42c` (M0 legacy separation + routing), `669c27b` (M3 kickoff doc). `/legacy` returns 404 in prod; `/` still serves pre-M0 build. Ismael owns Railway integration. Needs redeploy trigger + root-cause on why auto-deploy silently broke. Ownership-split verify per D8.
2. PR-9c rebase debt: draft PR held open as placeholder. R1 has now landed on main (44dd42c) so the last dependency is cleared; every day this stays deferred, rebase debt grows against a moving new-build root.
3. PR #11 body drift: description says `public/model_meta.json` but commit moved it to `data/`. Confuses reviewers; not a merge blocker. Ask Ismael to update body when applying the three coupled fixes.
4. Off-git commitments (Ismael Slack `plans/ai_model_config.md`): infrastructure track described in Slack with no repo footprint. If Ismael starts building against it without pushing the plan, we lose auditability. Prompt him to push.
5. Edwin working-tree carries unstaged mods to DECISIONS.md and PROJECT_STATE.md plus untracked PR #10 review notes. Not lost — sitting on `edwin/system-v1.1.1-unval-clarifier`. Ship or park before switching branches.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
