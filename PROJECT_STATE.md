---
last_synced_sha: 20a5876f33669daebc414f5309ed930c73d922f0
last_synced_at: 2026-08-17T10:12-0400
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js). SHA-256 hash-both-sides comparison + loginLimiter 5/15min (landed on main via PR #12 merge, conflict-resolved to main's SHA-256 approach over pr-9c HMAC).
- Data pipeline: 12 Python scripts at repo root (refresh_ll84.py CY2024 puller now on main). Outputs baked into public/*.json at deploy time.
- Risk engine: XGBoost + rule-based hybrid (`compute_diagnostic_risk` at update_enrichment_risk.py). Path C chain per system-v1.1.md §4.1. Post-CY2024 rebuild: AUC 0.683 (57 High / 5 Med / 1148 Low ml_risk; 245 High / 600 Med / 290 Low / 75 Uncertain diagnostic).
- Composite weighted score present as secondary field only; XGBoost `ml_risk` remains primary rank per D11, M3 spec, §7 rule 7, §8 rule 1, D7.
- API on main: auth, data, alerts, watchlist (in-memory), LLM fallback chain, CSV export, /api/predict/live, /api/predict/custom, /api/model_meta (auth-gated, 60s TTL), /api/buildings/:bbl/status POST+GET (Postgres append-only), /api/watchlist/* still in-memory.
- model_meta.json live on main at data/model_meta.json: cv_auc 0.6833, cv_std 0.0511, cv_kfold 5, n_positive 54, n_labeled 1003, model_version "XGB v1 · UNVAL", validation_status "unvalidated". /api/meta sources model_version from it (GBM-v1+SHAP retired). FAQ ml_risk getAnswer() interpolates m.model_version + m.validation_status per §7 rule 8/9.
- Postgres status-events backbone on main (R7 half): api/db.js (+140), initSchema in tx + CREATE INDEX CONCURRENTLY, ACTOR_HMAC_SECRET fail-fast in prod, statusReadLimiter 60/min + pagination cap 500, offset upper-bound 100k, DISTINCT ON via CROSS JOIN LATERAL, sanitizeNote null-guard (5a6520a).
- Legacy UI (R1 shipped PR #13): frozen React 19 + Vite 8 + Tailwind under src/legacy/. Self-contained. AIAgent lives only here.
- New-build stub: src/App.jsx construction notice at `/`. React Router 7 in src/main.jsx. `/legacy` renders archived dashboard. Express SPA fallback.
- Frontend workflow features on main (via PR #12): W1 pipeline timestamp, W4 queue arithmetic, W6 QuickFilters. Mirrored into src/legacy/ post-M0 rebase. useWorkflow hook, djb2 hash localStorage key, UTC date math.
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D11), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library.
- Fable design system: system-v1.1.1 (§4.4 UNVAL→BT clarifier via PR #14), five spec HTML atoms, per-person build briefs.
- Prod deploy: NEW Railway URL https://coned-attrition-prediction-model-production.up.railway.app/legacy on Pedro's paid account. Password coned-steam-2026. M0 prod-verify PASSED 2026-08-15 (D8 closed). ACTOR_HMAC_SECRET pasted 2026-08-16 00:04, verified 16:17.

## In Flight
- PR #17 open (Edwin, OPEN, MERGEABLE, opened 2026-08-17 05:03 UTC). fix(M1) retire stale AUC/n_positive fallback literals. Three sites nulled (validateModelMeta default, getModelMeta read-failure fallback, getAnswer template `?? 0.68`); getAnswer branches on null and emits §7 rule 8 interim sentence. Single-file, non-behavioral on healthy model_meta path. Tests 41/41. Awaits Ismael LGTM.
- PR #15 open (Edwin, DRAFT, MERGEABLE). M3 score cell atom + preview route at /m3-preview. src/next/ScoreCell.{jsx,css} + 6 fixtures per §03 State Matrix. Independent of merge chain. Advances R4.
- PR #16 open (Edwin, DRAFT, MERGEABLE). M3 rankings container at /rankings, stacked on #15 (base=edwin/M3-score-cell). scoreCellAdapter with percentile map, tier, divergence per L3 v1.1, S5 fallback, §4.5 freshness. Provenance chip hardcoded "XGB v1 · UNVAL" with TODO(post-#11) marker now obsolete (endpoint live). Base auto-flips to main when #15 merges. Advances R4 container half.
- M10 methodology page first draft: origin/edwin/M10-methodology (commit e4516a9) exists as WIP with 550 insertions. Sections 1/3/5/6/7 drafted from system-v1.1.md + methodology-alignment; sections 2/4/8/9 labeled placeholders. No PR opened yet. Owned by Edwin, authoring lane.

## PRs awaiting review
- PR #17 (Edwin, M1 fallback-cleanup, OPEN). Awaits Ismael LGTM. Ed to invite.
- PR #15 (Edwin, M3 atom, DRAFT). Self-ownable; design-pass invite to Ismael pending Ed decision.
- PR #16 (Edwin, M3 container, DRAFT). Self-ownable; base auto-flips to main when #15 merges.

## Blocked
- PR #16 rebase-to-main: gated behind PR #15 merge (mechanical only; auto-flip).
- R5 (case-file header, M4): unblocked by R2 landing. Fresh-context session recommended; wire against real /api/model_meta.
- R10 (This Week landing) blocks on R7 watchlist half + R8 + R9. R8/R9 unstarted.
- R7 watchlist migration second half owed by Ismael.

## Open Commitments
- 2026-08-14 | Edwin: answer Ismael's Zoom recording request. Committed 2026-08-16 to answer this week. 3 days elapsed.
- 2026-08-16 | Edwin: send Ismael check-in drafts (R7 watchlist status, plans/ai_model_config.md status). Drafts at docs/notes/2026-08-16_ismael-checkins-drafts.md. Prior /sync noted "post-6PM ET tonight" — still unsent as of 2026-08-17 10:12.
- 2026-08-16 | Edwin: Sunday touchpoint time reply to Pedro + Ismael (Ed offered 10 AM ET). Today is Sunday 2026-08-17.
- 2026-08-16 | Edwin: design-pass invite to Ismael on PRs #15/#16 when ready to flip DRAFT → OPEN. Ismael offered on 2026-08-16 call.
- 2026-07-17 | Ismael: five D8 post-merge follow-ups for PR #10 (CHECK constraint drift, smoke tests /api/buildings/status/*, SERIAL → BIGSERIAL, bulk/single response-shape parity, DB_POOL_MAX ceiling). Now actionable — PR #10 merged.
- 2026-07-16 | Ismael: R7 watchlist migration (Map → Postgres). Second half of M6. 32 days, still no PR.
- 2026-07-16 | Ismael (Slack): plans/ai_model_config.md (5-model panel, config-out-of-public/, BullMQ, structured form UI). Zero git footprint 32+ days.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). 32 days.
- 2026-07-18 | Edwin (M0 follow-up): add `<Route path="*" element={<NotFound />} />` to src/main.jsx. M3 kicked off without it. Not a blocker.
- 2026-08-16 | Pedro + Ismael: confirm Sunday touchpoint time (Ed offered 10 AM ET). Today is Sunday.

## Current Risks
1. **Ismael check-ins unsent past deadline.** Drafts staged 2026-08-16 for "post-6 PM ET tonight" delivery; still unsent 2026-08-17 morning. Tomorrow's asymmetry (Ismael active on merge/panel work, Ed drafts ready) is the exact window they were sized for. Send today.
2. **PR #15/#16 stack Edwin-only.** No teammate review requested; drafts still DRAFT. Ismael offered design-pass on the 2026-08-16 call. Risk of design-review skip on the atom before the container consumes it. Sunday touchpoint reply is the natural moment to invite him.
3. **Off-git commitments (Ismael Slack `plans/ai_model_config.md`, R7 watchlist migration): 32 days zero git footprint. Check-in drafts staged; send today.
4. **M10 methodology branch pushed WIP without PR.** No review invited (Edwin's authoring lane). Risk of drift if not returned to. Prose ready for Ed's authoring pass; not review-ready.
5. **D8 post-merge follow-ups (5 items) now actionable on Ismael.** PR #10 merged 2026-08-16 19:05; the follow-up PR window opens now. Track drift if these accumulate.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
