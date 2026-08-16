---
last_synced_sha: 5d76657ec929ce3811f27a11986a81ffa93c50c7
last_synced_at: 2026-08-16T18:32-0400
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
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D11), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library.
- Fable design system: system-v1.1.md, five spec HTML atoms, per-person build briefs (184f23c).
- Spec v1.1.1 §4.4 UNVAL→BT clarifier merged (PR #14).
- Prod deploy: NEW Railway URL https://coned-attrition-prediction-model-production.up.railway.app/legacy on Pedro's paid account. Password coned-steam-2026. M0 prod-verify PASSED 2026-08-15 (D8 closed).
- D11 filed 2026-08-15: reject aecde22 composite-primary flip on PR #12. Composite stays secondary; XGBoost `ml_risk` remains primary rank per M3 spec, §7 rule 7, §8 rule 1, D7.

## In Flight
- PR #15 open (Edwin, DRAFT, MERGEABLE). M3 score cell atom + preview route at /m3-preview. src/next/ScoreCell.{jsx,css} + 6 fixtures per §03 State Matrix. Independent of #10→#11→#12 chain. Advances R4.
- PR #16 open (Edwin, DRAFT, MERGEABLE). M3 rankings container at /rankings, stacked on #15 (base=edwin/M3-score-cell). scoreCellAdapter with percentile map, tier, divergence per L3 v1.1, S5 fallback, §4.5 freshness. Provenance chip hardcoded "XGB v1 · UNVAL" with TODO(post-#11). Advances R4 container half.
- PR #10 open (Ismael, PR-9b, head f5bfd17, APPROVED, MERGEABLE). Q7 append-only building_status_events (Postgres). Pedro confirmed ACTOR_HMAC_SECRET pasted to Railway 2026-08-16 00:04; prod verified 2026-08-16 16:17. Merge awaits Ismael running the chain (in class until 6 PM ET). Advances R7 backbone.
- PR #11 open (Ismael, PR-9a, head 98a676a, APPROVED, MERGEABLE). model_meta.json + GET /api/model_meta + FAQ ml_risk answer. All 3 copy fixes verified. PR body corrected to `data/model_meta.json`. Merge held behind PR #10 per stated order. Advances R2, R3.
- PR #12 open (Ismael, PR-9c, head 1627643, APPROVED, MERGEABLE). D11 partial revert landed as 388a466 (composite_risk secondary, `src/legacy/` reverted, `/api/health` auth fixed, labels restored). Ismael added two follow-up passes: `1e51a3f` (panel security/code review — /api/health leak, safeWeights, composite formula gating, DiagnosticSection ML: label suppress) and `1627643` (child.stdin EPIPE handler in /api/predict/live). Also carries: W1/W4/W6 frontend + security HMAC + refresh_ll84.py + CY2024 LL84 fill (1,002 buildings) + full ML rebuild AUC 0.683 + /api/predict/live+/custom + gitleaks allowlist. Merge order: after PR #11.
- M10 methodology page first draft: origin/edwin/M10-methodology exists, WIP pushed. No PR opened yet.
- edwin/M1-fallback-cleanup pre-staged (docs/notes/2026-08-16_pr11-post-merge-cleanup.md): removes 0.68/54 literals in validateModelMeta / getModelMeta / getAnswer once PR #11 lands.

## PRs awaiting review
- PR #10 (Ismael, PR-9b). APPROVED f5bfd17. Awaits Ismael's merge action post-6 PM ET.
- PR #11 (Ismael, PR-9a). APPROVED 98a676a. Body corrected. Awaits merge after #10.
- PR #12 (Ismael, PR-9c). APPROVED 1627643 after D11 revert (388a466) + two panel passes. Awaits merge after #11.
- PR #15 (Edwin, M3 atom, DRAFT). Self-ownable; no reviewer yet.
- PR #16 (Edwin, M3 container, DRAFT). Self-ownable; no reviewer yet. Base auto-flips to main when #15 merges.

## Blocked
- PR #10 merge: awaits Ismael running the chain post-6 PM ET (in class until then). All prerequisites clear.
- PR #11 merge: gated behind PR #10 per stated order.
- PR #12 merge: gated behind PR #11.
- PR #16 rebase-to-main: gated behind PR #15 merge.
- R5 (case-file header) blocks on R4 + R2; R4 in PRs #15/#16, R2 in unmerged PR #11.
- R10 (This Week landing) blocks on R7, R8, R9, R2 — R8/R9/R10 unstarted; R2/R7 in unmerged PRs.
- R7 watchlist migration owed (second half of M6); R8 unstarted, depends on R2 merge.
- M1 fallback-cleanup PR: blocked on PR #11 merge (trigger commit).

## Open Commitments
- 2026-08-14 | Edwin: answer Ismael's Zoom recording request. Committed 2026-08-16 to answer this week.
- 2026-08-16 | Edwin: send Ismael check-in drafts (R7 watchlist status, plans/ai_model_config.md status) post-6 PM ET tonight. Drafts at docs/notes/2026-08-16_ismael-checkins-drafts.md.
- 2026-08-16 | Edwin: file edwin/M1-fallback-cleanup PR the moment PR #11 lands (staged at docs/notes/2026-08-16_pr11-post-merge-cleanup.md).
- 2026-08-16 | Ismael: run the merge chain (#10 → #11 → #12) post-6 PM ET.
- 2026-08-16 | Pedro + Ismael: confirm Sunday touchpoint time (Ed offered 10 AM ET).
- 2026-07-16 | Ismael: R7 watchlist migration (Map → Postgres). Second half of M6. Not in PR #10 or pr-9c. Check-in staged.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). Still unconfirmed.
- 2026-07-16 | Ismael (Slack): plans/ai_model_config.md (5-model panel, config-out-of-public/, BullMQ, structured form UI). Zero git footprint 30+ days. Check-in staged.
- 2026-07-17 | Ismael: five D8 post-merge follow-ups for PR #10 (CHECK constraint drift, smoke tests /api/buildings/status/*, SERIAL → BIGSERIAL, bulk/single response-shape parity, DB_POOL_MAX ceiling). Deferred to post-merge cleanup PR.
- 2026-07-18 | Edwin (M0 follow-up): add `<Route path="*" element={<NotFound />} />` to src/main.jsx before M3 kicks off. Note: M3 kicked off anyway via PR #15/#16 without this. Still owed; not a blocker.

## Current Risks
1. **Merge chain lands tonight or slips a day.** All prerequisites clear (Pedro's env var live, all three PRs APPROVED, D11 revert applied). Ismael runs the chain post-6 PM ET. If Ismael's window slips, PRs #15/#16 also stack behind waiting for #11 (post-#11 cleanup PR is staged).
2. **PR #15/#16 stack is Edwin-only.** No teammate review requested; drafts flip to open under solo review discipline. Risk of design-review skip on the atom before the container consumes it. Pull Fable or Ismael in before flipping DRAFT → OPEN if the moment allows.
3. Off-git commitments (Ismael Slack `plans/ai_model_config.md`, R7 watchlist migration): infrastructure track described with no repo footprint 30+ days. Check-in drafts staged; send tonight.
4. **M10 methodology branch pushed WIP without PR.** No review invited (intentional — Edwin's authoring lane). Risk of drift if not returned to. Owned by Edwin.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
