# Distilled Goals

One page, no more. This is what /goal-check quick audits against. If it does not fit here, it belongs in PRD_TDD.md.

## Core objective
Ship a workflow-focused ConEd dashboard for the September David session that turns steam-attrition modeling into an honest, actionable case-file the analyst can defend to ConEd — replacing the current 100%-High wall with tiered, freshness-stamped decisions.

## Success metric
<!-- TODO: define. Candidate framing: the September session earns a "yes, keep building" from David, and the top-of-queue Critical 23 read as decisions the analyst can act on today. -->

## Non-negotiables
<!-- TODO: expand. Seed constraints below are pulled from system-v1.1.md laws; confirm before treating as fixed. -->
- Epistemic honesty (system-v1.1.md L1): scores render as portfolio percentiles, never as probabilities. Color encodes rule-tier claims only, never the ML percentile.
- Every model-touching surface reads model version and freshness from `model_meta.json`; no hardcoded strings (§7 rules 8/9).
- Two clocks, always: `model_meta.model_version` for model-version facts, `model_meta.run_date` for run-date facts. No relative time anywhere on the landing (W1).
- Legacy dashboard preserved as an unlinked demo hedge behind `/legacy`; new build never imports from `src/legacy/` and vice versa.
- No causal verbs on tier language or methodology copy — complementary-signals framing only.

## Scope boundaries
- Not shipping: portfolio-wide per-customer weather-normalized usage regression (Round 2; blocked on ConEd billing-day data and Ismael's feasibility read).
- Not shipping: Johan-style rule-based diagnostic tier as a second independent method (Round 2; blocked on the diagnostic metrics suite).
- Not shipping: contextual "ask about this building" chatbot inside Spec 2 (future Round 2 conversation with Fable).
- Not shipping: automated per-run methodology-table regeneration (manual + honest stamps until automation exists).
- Not shipping: dates/deadlines on milestones — dependency and readiness only, per Fable's ordering principle.

## Known tensions
- Label vs goal tension: XGBoost trains on late-stage departures (≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023) but the product promises early warning; methodology page section 8 states this honestly.
- Data freshness vs deploy cadence: JSONs are container-baked (data decoupling deferred per Ismael Q8); workaround is that `model_meta.run_date` reads honestly per run.
- David-audience trust vs demo readiness: the top-visibility "100% High" repair (R4) matters more than the more impressive case-file header (R5) if only two milestones fit before the September session.
- Complementary-signals positioning vs the alignment doc's dual-tier disagreement badge: shipped DIVERGE class is intra-hybrid, not two independent methods; the real dual-tier flag is Round 2.
