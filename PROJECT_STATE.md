---
last_synced_sha: 08e1573270d54c2c091c096b9901e59d8d442028
last_synced_at: 2026-08-14T14:18:58-0400
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js). HMAC sha256 password compare + loginLimiter 5/15min (pr-9c 0f54fde, not yet on main).
- Data pipeline: 11 Python scripts at repo root (added refresh_ll84.py on pr-9c). Outputs baked into public/*.json at deploy time.
- Risk engine: XGBoost + rule-based hybrid (`compute_diagnostic_risk` at update_enrichment_risk.py:71). Path C chain per system-v1.1.md §4.1.
- API: routes in api/server.js — auth, data, alerts, watchlist (in-memory), LLM (Anthropic→Groq→OpenRouter fallback), CSV export. On pr-9c: /api/predict/live + /api/predict/custom endpoints.
- Legacy UI (R1 shipped, PR #13 merged): frozen React 19 + Vite 8 + Tailwind under src/legacy/. Self-contained. AIAgent lives only here.
- New-build stub: src/App.jsx construction notice at `/`. React Router 7 in src/main.jsx. `/legacy` renders archived dashboard. Express SPA fallback in api/server.js.
- YoY deltas + LL97 + SHAP drivers in enrichment (PR #7 merged, now legacy).
- XGBoost predict endpoints + diagnostic tier filter in RiskTable (523597d).
- Security hardening: Helmet, rate-limit, input sanitization (36844c2).
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D10), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library.
- Fable design system: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c).
- Spec v1.1.1 §4.4 UNVAL→BT clarifier merged (PR #14).
- Prod deploy: NEW Railway URL https://coned-attrition-prediction-model-production.up.railway.app/legacy on Pedro's paid account. Password coned-steam-2026. Deployment protection removed. Old Mel account URL retired.

## In Flight
- PR #10 open (Ismael, PR-9b, head f5bfd17, APPROVED, MERGEABLE). Q7 append-only building_status_events (Postgres). Edwin approval-freshen note at docs/notes/2026-07-18_pr-10-approval-freshen.md; formal `gh pr review --approve` on f5bfd17 still owed. Merge blocked until ACTOR_HMAC_SECRET is set in new Railway env (f5bfd17 fail-fast guard). Advances R7 backbone.
- PR #11 open (Ismael, PR-9a, head 98a676a, APPROVED, MERGEABLE). model_meta.json + GET /api/model_meta + FAQ ml_risk answer. Edwin substantive review at docs/notes/2026-07-18_pr-11-rereview.md (APPROVE + 6 non-blocking observations). Formal `gh pr review --approve` on 98a676a still owed. Merge held by stated order (after PR #10). Advances R2, R3.
- PR #12 open (Ismael, PR-9c, head 93c90eb, MERGEABLE, no review yet). Lifted out of DRAFT. Now carries: W1/W4/W6 frontend + 7 new commits (security HMAC fix, refresh_ll84.py, steam_2024 fill for 1,002 buildings, full ML rebuild on CY2024 LL84 → XGBoost AUC 0.683, /api/predict/live+/custom endpoints, composite-score-primary framing flip, gitleaks allowlist). Scope expanded well beyond original W1/W4/W6. Needs Edwin re-review before merge. Merge order: after PR #11.
- Pedro M3 Score Cell chip: Edwin taking over the build (Pedro remains formally assigned on paper). Kickoff brief at docs/briefs/2026-07-17_pedro-m3-kickoff.md. Not started, no branch yet. Depends on PR #11 merge (score cell reads model_version).

## PRs awaiting review
- PR #10 (Ismael, PR-9b). Approval-freshen owed on f5bfd17. Merge blocked on ACTOR_HMAC_SECRET being live in Railway env.
- PR #11 (Ismael, PR-9a). Formal `gh pr review --approve` on 98a676a owed. Ismael still owes PR-body one-liner (`public/` → `data/`, O3).
- PR #12 (Ismael, PR-9c). No review filed at expanded head 93c90eb. Big scope: needs review before merge slot.

## Blocked
- PR #10 merge: needs ACTOR_HMAC_SECRET pasted into new Railway env by Pedro. Edwin generated secret and sent it; awaiting paste-confirm.
- PR #11 merge: gated behind PR #10 per stated order.
- PR #12 merge: gated behind PR #11 per stated order; also needs Edwin review of the 7 new commits.
- R5 (case-file header) blocks on R4 + R2; R4 unstarted, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs #11/#10.
- R7/R8: R7 backbone in PR #10 (approved, held); R7 watchlist migration owed; R8 unstarted, depends on R2 merge.
- M3 Score Cell (Edwin building) unblocks after PR #11 merges.

## Open Commitments
- 2026-08-14 | Edwin: prod smoke test on new Railway URL (login, `/`, `/legacy`, deep-link refresh). Promised in Slack, not confirmed done.
- 2026-08-14 | Edwin: formal `gh pr review --approve` on PR #10 f5bfd17 (audit-trail freshen). Owed.
- 2026-08-14 | Edwin: formal `gh pr review --approve` on PR #11 98a676a. Owed.
- 2026-08-14 | Edwin: sign-off on PR #11 3 copy fixes (validation_status, model_version, FAQ ml_risk). Owed.
- 2026-08-14 | Edwin: review PR #12 head 93c90eb — 7 new commits including major scope-expansion (CY2024 data refresh, ML rebuild AUC 0.683, risk framing flip, new predict endpoints). New commitment this /sync.
- 2026-08-14 | Edwin: answer Ismael's Zoom recording request. Owed.
- 2026-08-14 | Pedro: paste ACTOR_HMAC_SECRET into new Railway env. Blocks PR #10 merge. Unconfirmed.
- 2026-07-18 | Pedro (D10): link coned-dashboard to new Railway service on paid account, share URL. CONFIRMED via new URL above. Retired.
- 2026-07-18 | Mel (D10): migrate env vars to Pedro's new Railway service. Partially done (deploy is live). ACTOR_HMAC_SECRET still needed.
- 2026-07-16 | Ismael: R7 watchlist migration (Map → Postgres). Second half of M6. Still not in PR #10 or pr-9c. Unconfirmed.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Still unconfirmed.
- 2026-07-16 | Ismael (Slack): plans/ai_model_config.md 5-model panel review, config-out-of-public/, BullMQ, structured form UI. Still zero git footprint. Unconfirmed. Push or send.
- 2026-07-17 | Ismael: five D8 post-merge follow-ups for PR #10 (CHECK constraint drift, smoke tests /api/buildings/status/*, SERIAL → BIGSERIAL, bulk/single response-shape parity, DB_POOL_MAX ceiling). Deferred to post-merge cleanup PR.
- 2026-07-18 | Ismael (M0 follow-up): reconcile /api/health auth-guard drift with CLAUDE.md API-contract table. Unconfirmed.
- 2026-07-18 | Edwin (M0 follow-up): add `<Route path="*" element={<NotFound />} />` to src/main.jsx before M3 kicks off. Unconfirmed. Newly relevant now that Edwin owns M3.
- 2026-07-18 | Ismael: update PR #11 body `public/model_meta.json` → `data/model_meta.json` (O3 one-liner). Still not done.

## Current Risks
1. **Merge queue is one env-var away from unblocking.** ACTOR_HMAC_SECRET paste into Pedro's Railway → PR #10 merges → PR #11 merges → PR #12 review-and-merge. If Pedro doesn't paste soon, three PRs stack. If PR #10 merges before the paste, container crashes at startup per f5bfd17 fail-fast guard.
2. **PR #12 scope expansion.** Started as W1/W4/W6 frontend polish; now carries full ML rebuild with new AUC 0.683 (from 0.645), CY2024 LL84 refresh, new prediction endpoints, and a framing flip (composite becomes primary risk field, XGBoost demoted to "ML Signal"). Not reviewed at expanded head. Anything that ships as "M2 AUC delivery" needs to reconcile with PR #11's `model_meta.json` write path (Observation O1 M1 scope gap not yet resolved).
3. **Risk framing flip conflicts with system-v1.1.md.** aecde22 makes composite weighted score the primary `risk` field and demotes XGBoost to secondary. Panel consensus per Slack, but not yet spec-anchored in system-v1.1.md or DECISIONS. If this ships in PR #12, need to update spec + file a decision or the next reviewer trips on it.
4. **Edwin building M3 while Pedro is formal owner.** Paper-vs-reality mismatch. If Pedro re-engages, work collides. Owner update in ROADMAP owed or explicit handoff note in Slack.
5. Off-git commitments (Ismael Slack `plans/ai_model_config.md`): infrastructure track described with no repo footprint. Still zero git artifact.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
