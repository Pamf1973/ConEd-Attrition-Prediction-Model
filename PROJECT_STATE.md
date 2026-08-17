---
last_synced_sha: 0dd926ce1bd800b471aab652dcd11e9fa1842d4e
last_synced_at: 2026-08-17T14:15-0400
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js). SHA-256 hash-both-sides comparison + loginLimiter 5/15min.
- Data pipeline: 12 Python scripts at repo root (refresh_ll84.py CY2024 puller on main). Outputs baked into public/*.json at deploy time.
- Risk engine: XGBoost + rule-based hybrid (`compute_diagnostic_risk` at update_enrichment_risk.py). Path C chain per system-v1.1.md §4.1. Post-CY2024 rebuild: AUC 0.683 (57 High / 5 Med / 1148 Low ml_risk; 245 High / 600 Med / 290 Low / 75 Uncertain diagnostic).
- Composite weighted score present as secondary field only; XGBoost `ml_risk` remains primary rank per D11, M3 spec, §7 rule 7, §8 rule 1, D7.
- API on main: auth, data, alerts, watchlist (in-memory), LLM fallback chain, CSV export, /api/predict/live, /api/predict/custom, /api/predict/xgboost, /api/predict/compare (all four now read cv_auc from model_meta, null-when-unavailable per b1efee2), /api/model_meta (auth-gated, 60s TTL), /api/buildings/:bbl/status POST+GET (Postgres append-only), /api/watchlist/* still in-memory.
- model_meta.json live on main at data/model_meta.json: cv_auc 0.6833, cv_std 0.0511, cv_kfold 5, n_positive 54, n_labeled 1003, model_version "XGB v1 · UNVAL", validation_status "unvalidated". /api/meta sources model_version from it. FAQ ml_risk getAnswer() interpolates m.model_version + m.validation_status per §7 rule 8/9. All three fallback sites default to null (PR #17); predict endpoints extended (b1efee2).
- Postgres status-events backbone on main: api/db.js, initSchema in tx + CREATE INDEX CONCURRENTLY, ACTOR_HMAC_SECRET fail-fast in prod, statusReadLimiter 60/min + pagination cap 500, DISTINCT ON via CROSS JOIN LATERAL, sanitizeNote null-guard, regex Unicode-escape fix for Node 22 parse (PR #18).
- plans/ai_model_config.md landed on main via b1efee2 (5-model panel, config-out-of-public/, BullMQ, structured form UI). 199 lines. Panel-reviewed 2026-07-16; Ismael 32-day off-git commitment RESOLVED.
- Legacy UI (R1): frozen React 19 + Vite 8 + Tailwind under src/legacy/. Self-contained. AIAgent lives only here.
- New-build stub: src/App.jsx construction notice at `/`. React Router 7 in src/main.jsx. `/legacy` renders archived dashboard. Express SPA fallback.
- Frontend workflow features on main: W1 pipeline timestamp, W4 queue arithmetic, W6 QuickFilters. Mirrored into src/legacy/. useWorkflow hook, djb2 hash localStorage key.
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D13), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library.
- Fable design system: system-v1.1.1 (§4.4 UNVAL→BT clarifier), five spec HTML atoms, per-person build briefs.
- Prod deploy: NEW Railway URL https://coned-attrition-prediction-model-production.up.railway.app/legacy on Pedro's paid account. Password coned-steam-2026. M0 prod-verify PASSED 2026-08-15. ACTOR_HMAC_SECRET pasted 2026-08-16.

## In Flight
- PR #19 open (Edwin, OPEN, MERGEABLE, opened 2026-08-17 18:04 UTC). fix(dev) initSchema() non-fatal outside production. Dev warns and boots; prod still exits 1. Anchors D12. Awaits Ismael review. Unblocks any frontend contributor without local Postgres.
- PR #17 MERGED 2026-08-17 17:11 UTC (Ismael). AUC fallback literals nulled. Follow-up b1efee2 (Ismael, same day) extended the fix to /api/predict/xgboost and /api/predict/compare response bodies.
- PR #15 open (Edwin, OPEN — flipped out of DRAFT — MERGEABLE). M3 score cell atom + /m3-preview. One-line fix pushed b45a232 (dead ternary removed per Ismael's design-pass). Awaits Ismael merge. Advances R4.
- PR #16 open (Edwin, OPEN, approved as-is, MERGEABLE). M3 rankings container + /rankings. Stacked on #15; auto-rebase on #15 merge. Advances R4 container half.
- M4 case-file header BUILT + REBASED + PUSHED but NO PRs yet: origin/edwin/M4-case-file-atom (a117630, base=main) + origin/edwin/M4-case-file-container (b737df0, base=atom). Container is read-only against status GET (POST wiring deferred per D13). Pending Edwin browser eyeball → open as DRAFT PRs → flip to OPEN after #15/#16/#19 land. Advances R5.
- M10 methodology page first draft: origin/edwin/M10-methodology (commit e4516a9) exists as WIP with 550 insertions. Sections 1/3/5/6/7 drafted; 2/4/8/9 placeholders. No PR opened yet. Edwin authoring lane.

## PRs awaiting review
- PR #15 (Edwin, M3 atom, OPEN). Awaits Ismael merge.
- PR #16 (Edwin, M3 container, OPEN, approved). Awaits #15 merge → auto-rebase → Ismael merge.
- PR #19 (Edwin, dev-db-non-fatal, OPEN). Awaits Ismael review.

## Blocked
- PR #16 rebase-to-main: gated behind PR #15 merge (mechanical only; auto-flip).
- M4 PR flow: gated on Edwin browser eyeball. Then draft PRs (atom→main, container→atom). Flip to OPEN after #15/#16/#19 land.
- R10 (This Week landing) blocks on R7 watchlist half + R8 + R9. R8/R9 unstarted.
- R7 watchlist migration second half owed by Ismael.

## Open Commitments
- 2026-08-17 | Edwin: eyeball M4 atom + container in browser, then open two DRAFT PRs (atom→main, container→atom). Per handoff 2026-08-17.
- 2026-08-17 | Edwin: after #15/#16/#19 land, flip M4 PRs to OPEN and invite Ismael as reviewer.
- 2026-08-17 | Ismael: merge PR #15 (unblocks #16), merge PR #16, review PR #19. Per handoff Ismael's 10:56 Slack: "Fix the one line on #15 and both are good to merge." Fix pushed b45a232; awaits action.
- 2026-08-14 | Edwin: answer Ismael's Zoom recording request. Committed 2026-08-16 to answer this week. 4 days elapsed.
- 2026-08-16 | Edwin: Sunday touchpoint time reply to Pedro + Ismael (Ed offered 10 AM ET). Today IS Sunday 2026-08-17.
- 2026-07-17 | Ismael: five D8 post-merge follow-ups for PR #10 (CHECK constraint drift, smoke tests /api/buildings/status/*, SERIAL → BIGSERIAL, bulk/single response-shape parity, DB_POOL_MAX ceiling). Actionable since PR #10 merged.
- 2026-07-16 | Ismael: R7 watchlist migration (Map → Postgres). Second half of M6. 33 days, still no PR.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). 33 days.
- 2026-07-18 | Edwin (M0 follow-up): add `<Route path="*" element={<NotFound />} />` to src/main.jsx. Not a blocker.

## Retired this sync
- 2026-07-16 | Ismael: plans/ai_model_config.md commit — LANDED via b1efee2 (bundled with predict-endpoint AUC fix).
- 2026-08-17 | Edwin: PR #17 M1-fallback-cleanup — MERGED via 5013390.
- 2026-08-17 | Ismael: M3 design-pass on PR #15/#16 — DELIVERED (one-line fix requested, #16 approved).
- 2026-08-16 | Edwin: send Ismael check-in drafts — mostly moot (ai_model_config landed; R7 watchlist conversation active per handoff).

## Current Risks
1. **M4 branches sitting on origin without PRs.** Two branches pushed today, no PR flow yet. Handoff says eyeball first, then draft PRs, then flip after #15/#16/#19 land. Track if branches sit >48h without PR flow.
2. **PR queue backlog on Ismael.** Three Edwin PRs (#15, #16, #19) all await Ismael. Merge chain is #15→#16 (auto) plus independent #19. Sunday touchpoint is the moment to unblock verbally.
3. **Sunday touchpoint time still unresolved.** Ed offered 10 AM ET on 2026-08-16; today IS Sunday. Every hour without reply narrows the window.
4. **Ismael D8 post-merge follow-ups (5 items) still open.** PR #10 merged 2026-08-16; window has been open 24h. Track drift if these accumulate.
5. **M10 methodology branch pushed WIP without PR.** No review invited (Edwin's authoring lane). Prose ready for Ed's authoring pass; not review-ready.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
