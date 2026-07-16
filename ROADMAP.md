# Roadmap

Structured data, not prose. Every item has an ID, status, and dependency links. Modified only through /roadmap-adjust so changes cascade and get logged.

Statuses: planned | active | done | cut | superseded

Narrative source: `docs/ref/2026-07-16_fable-roadmap.md` (Fable, 2026-07-13) + `roadmap-supplement-m0.md`. Each R-item's scope names the milestone it covers ("covers M#"). Keep this file and the fable roadmap reconcilable — when a milestone changes, update both.

---

## R1: Legacy separation + routing
- status: planned
- owner: Pedro
- depends_on: none
- affects: R4
- scope: Copy the current build to `src/legacy/`, register `/legacy` route, freeze cross-imports. Chatbot artifacts (`AIAgent.jsx`, `/api/explain` FAQ) move with legacy. No nav entry to `/legacy`. Must complete before R4 begins. Covers M0.
- estimate:

## R2: model_meta rollout + stale-string retirement
- status: planned
- owner: Ismael, Edwin
- depends_on: none
- affects: R3, R4, R5, R6, R8, R10, R11, R13
- scope: `model_meta.json` written by `train_xgboost.py` and `update_enrichment_risk.py` (params-unchanged runs refresh `run_date` only); API serves it; `server.js:585` (model version) and `:867` (chatbot ml_risk answer) read from it. No hardcoded model strings remain. Ismael: object + wiring. Edwin: the rewritten chatbot answer copy (no probability/likelihood claim). Covers M1.
- estimate:

## R3: AUC rerun + freshness residual naming
- status: planned
- owner: Ismael
- depends_on: R2
- affects: none
- scope: 5-fold `cross_val_score` AUC + std written into model_meta on the locked XGBoost config (`colsample_bytree=1.0, learning_rate=0.1, max_depth=6, n_estimators=300, scale_pos_weight=18, subsample=0.8`); the ~5-row freshness residual named. Locks §7 rule 8 templated sentence and §4.5 chip copy. When this lands, AUC-line copy locks on R4, R5, R6, R10, R11, R13 (all of which ship interim copy until then). Covers M2.
- estimate:

## R4: Score cell into Rankings table
- status: planned
- owner: Pedro
- depends_on: R1
- affects: R5, R9
- scope: Spec 1 atom replaces current score column; percentile-of-ml_risk + `diagnostic_risk` binding; kills "100% High" wall and every percent sign on the model score. Buildable with interim chip copy if R2/R3 slip. Covers M3.
- estimate:

## R5: Case-file header
- status: planned
- owner: Pedro, Edwin
- depends_on: R4, R2
- affects: R6
- scope: Spec 2 replaces the BuildingPanel drawer — identity row, claim ledger, driver band, narrative frame (static), read-only status segment. Status segment stays read-only until R7. Pedro: build. Edwin: ledger and caveat copy strings. Covers M4.
- estimate:

## R6: Reasoning report
- status: planned
- owner: Edwin, Pedro
- depends_on: R5, R2
- affects: R13
- scope: Spec 3 as printable page + PDF via Puppeteer against a print stylesheet (one layout, two outputs). Grounded-template narrative with exhibit citations, exhibits A–D, method footer, signature block with DRAFT watermark. Every value matches the case file to the digit (R1 law). Edwin leads (content, template, exhibit copy). Pedro: print stylesheet + PDF mechanics. Covers M5.
- estimate:

## R7: Status events endpoint + watchlist migration
- status: planned
- owner: Ismael
- depends_on: none
- affects: R5, R9, R10
- scope: Append-only status events in Railway Postgres; `POST /api/buildings/:bbl/status` + hydration GET behind `requireAuth`; `/api/watchlist/save` and `/load` migrate to same table; in-memory Map at `server.js:314` retires. Runs parallel to R4–R6. Covers M6.
- estimate: ~2d

## R8: Snapshot diffing → events.json
- status: planned
- owner: Ismael
- depends_on: R2
- affects: R10
- scope: Prev-file copy on the volume; end-of-run diff across `diagnostic_risk`, `ll97_over_2024/2030`, `dob_jobs`. Emits `events.json` in the §4.3 grammar with `model_meta.run_date` stamps. DIVERGE derives inline (no diff needed). Covers M7.
- estimate: ~1–2d

## R9: Queue + modifier filter chips + Critical membership
- status: planned
- owner: Pedro
- depends_on: R4
- affects: R10, R12, R13
- scope: Spec 4 queue component on the Rankings surface; Critical v1.1 membership computed from existing fields (matches Ismael Q3 filter — 23 buildings, top 660 Madison / 200 E 42nd / 58 W 58th); counted chips (Critical · 23, Outlier Δ, Accelerating, Modifier-promoted · 176); queue rows embed the R4 cell. R7 unlocks the W4 subtraction line and W5 carry-over ages; without it, the queue says so plainly. Covers M8.
- estimate:

## R10: This Week landing assembly
- status: planned
- owner: Pedro
- depends_on: R8, R9, R7, R2
- affects: R13
- scope: Spec 4 assembled — topbar anchors from `model_meta.run_date` (no relative time anywhere, W1), delta feed from `events.json` (W2 grammar), R9 queue, portfolio pulse, empty state. Pulse ships without WoW parentheticals until a second diffed run exists. Landing is shippable as topbar + queue + pulse if R8 slips (event-feed placeholder per R8 graceful-degradation note). Covers M9.
- estimate:

## R11: Methodology page
- status: planned
- owner: Edwin
- depends_on: R2
- affects: none
- scope: Nine-section page per §5; Report register; linked from landing footer + report method footer. Section 3 is the §4.1 chain verbatim; section 5 is the Critical definition with the 23; section 6 carries §8 rule 1; section 7 carries the four tech-spec limitations; section 8 implements complementary-signals positioning (methodology alignment item 5). Dual clocks per section (model-version vs run-date). Covers M10.
- estimate:

## R12: Queue aggregate view (toggle)
- status: planned
- owner: Pedro
- depends_on: R9
- affects: none
- scope: List | Aggregate toggle on the queue — count tiles, modifier co-occurrence pairs, LL97 penalty-magnitude bands over the filtered rowset. Header states filter expression + row count + run stamp. No portfolio-scale baseline appears inside the view (those live in the pulse and methodology page). Default is List. LL97 renders as penalty bands, never the boolean count. Covers M11.
- estimate:

## R13: Weekly digest + compose flow
- status: planned
- owner: Edwin, Pedro
- depends_on: R10, R6, R2
- affects: none
- scope: Spec 5 — compose from `events.json` + queue state; editable draft with locked number tokens (or ledger #14 textarea fallback with trust); mailto/clipboard send; plain-text twin ships with every draft. C1: numbers injected, never generated. C3: sends nothing itself. Finding paragraph restates the Critical definition inline. Edwin leads (content, templates, finding paragraph). Pedro: compose UI. Covers M12.
- estimate:

## R14: David packet (parallel non-build track)
- status: planned
- owner: Edwin
- depends_on: none
- affects: R8, R10, R13
- scope: One email/sync covering ledger items #5 (Critical v1.1 sign-off, with the computed 23), #6 (chip vocabulary legibility), #7 (digest cadence/recipients/format), #8 (cooling-off window), #9 (territory gating), #10 (DRAFT watermark vs hard gate). Item #8 gates TIER-down suppression copy in R8/R10; #7 gates R13 send framing; #5 gates presenting Critical externally (internally signed by Ismael Q3). Runs alongside R2–R6. Not a build milestone but tracked here because the copy decisions it produces block downstream items. Covers M-parallel-track.
- estimate:

<!--
Impact notes get appended under items by /roadmap-adjust:
> Impact 2026-07-15 from R3 expansion: integration surface grows. Re-estimate before starting. (D9)

Superseded scope moves to a Superseded subsection under the item. Nothing is deleted.
-->
