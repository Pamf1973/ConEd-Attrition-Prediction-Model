# Fable — Portfolio-level signals surface, modifier-aware reframing

**From:** Edwin
**Date:** 2026-07-13 (rewrite after Round 1.1 delta)
**Purpose:** The original version of this prompt asked whether the design system needs a sixth atom for aggregate SHAP across the High-tier population. Your Round 1.1 finding makes that question incoherent — an aggregate-SHAP-over-High surface is a nonsense claim against modifier-driven High tier. So the question changes shape rather than being retired. We still owe ConEd's intake ask (§1) a "list of significant predictive flags / signals" and Johan (§4) a "repeatable pattern-based approach." The design system doesn't currently have a home for either. This prompt asks what shape that home should take.

**Assumes you have in memory:** Round 1 response, Round 1.1 delta, `system.md`, the five HTML atoms, and the ASKS doc.

---

## Context updates since Round 1.1 delta (please read before responding)

Between Round 1.1 and this prompt, Ismael (backend/pipeline owner) signed off on all Path C items and returned two data corrections that touch this prompt's options.

- **Path C confirmed.** No code change to `compute_diagnostic_risk`. Ledger column wording locked as **"Tier · ML base + trend/statute modifiers"** (Ismael's tightening of your Round 1.1 proposal — shorter for header width; use the full "model base" form only in pitch contexts).
- **Critical v1.1 confirmed at 23 buildings.** Top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St.
- **LL97 correction for Exhibit D and any modifier-prevalence surface below.** Your Round 1.1 delta said LL97 over-cap is "feature #1 inside the model." That's true of the *penalty log*, not the boolean:
  - `ll97_over_2024` (boolean): **0.0000** feature importance (contributed nothing to XGBoost)
  - `ll97_penalty_2024_log` (dollar amount, log-scaled): **#1 at 0.2074 importance**

  The double-counting exclusion argument for Critical v1.1's modifier leg still holds — the boolean modifier is a rough proxy for the same statute pressure the log encodes richly inside the model. But **Exhibit D copy must reference `ll97_penalty_2024_log`, not `ll97_over_2024`,** or it will confuse anyone reading the feature importance table alongside the report. **If Option 1 (modifier prevalence) becomes an atom, its "LL97 pressure" bar should show penalty magnitude bands (e.g., "$50k–100k over cap"), not the over-cap boolean count** — the boolean is a poor summary of a variable the model treats as continuous.
- **No-adjacent-delta state count updated.** Ismael's count is 208 buildings, not 213. Freshness chip variant copy updates accordingly (four states sum to 1,205, with the remaining 5 in another edge state Ismael is confirming — for this prompt, treat "no adjacent-yr Δ" as ~208).
- **AUC rerun in progress this week.** Fresh CV AUC with std on chosen XGBoost config landing shortly; interim ledger copy ("validation rerun in progress") stands.
- **Data decoupling worked around, not delivered pre-demo.** Freshness chip sources the pipeline run date from `model_meta.json`'s `run_date` field. JSONs stay container-baked for the demo; full decoupling is a follow-up sprint. **Consequence for any surface below:** the "snapshot" or "population as of" annotation reads `model_meta.run_date`, not the deploy date — the discipline is preserved without the infrastructure.

Also relevant for Option 2 / Option 4 below: **Edwin intends to run a parallel pattern-mining research track eventually** (owner-cohort co-movement via ACRIS, permit precedence lag via DOB filings, LL97 threshold-crossing cohorts, cluster archetype patterns, geographic block clustering). This is Johan-framing work executable against the current public data — but it has been **deprioritized until after the redesign integration ships.** Do not scope Option 2 or Option 4 as though those outputs are arriving in this cycle. If either option involves the cohort-patterns material, scope it as a **methodology artifact** — a written companion piece with placeholders for pattern content — not as an atom rendering live-derived patterns. The research, when it runs, will backfill the artifact.

---

## Why prompt 02 was wrong as originally written

The original asked whether aggregate SHAP across the High-tier population belongs as a sixth atom. Your Round 1.1 delta established that:

1. Final High is 78% modifier-promoted from base Low (ml_risk < 0.2). Aggregating SHAP contributions across those 176 rows would surface features the model thinks push probability *down*, because that's what "base Low" means. The average would be dominated by rows the model does not think are churners.
2. The intake ask's language ("significant predictive flags") reads more naturally against the modifier layer than against SHAP means. Modifiers are directly checkable facts (IQR outlier, accelerating decline, statute over-cap); SHAP contributions are log-odds nudges from a model whose confident set is 57 buildings, not 233.
3. Johan's framing (owner cohorts, permit precedence, ownership transfers, LL97 threshold crossings) is pattern-mining, not SHAP aggregation, and the design system currently has no atoms that surface any of it.

So the original prompt collapsed two different questions ("do we need a portfolio-level surface?" and "should it be SHAP-based?") and answered them together with the wrong second half. Splitting them:

- Portfolio-level surface: probably yes, because two client asks (§1, §4) are unaddressed without one.
- SHAP-based: no, because the tier the surface would aggregate over is modifier-driven, not model-driven.

## The reshaped question

Given the modifier-driven finding, what portfolio-level surface actually satisfies §1 intake and §4 Johan? Three candidates, and the design-system consequences of each.

### Option 1 — Modifier prevalence surface

A view that answers "of the 233 High-tier buildings, X are flagged by IQR outlier, Y by accelerating decline, Z by ll97_over," and further breaks it down by which pairs of modifiers co-occur. Every row is a directly checkable fact. This is not SHAP, and it does not pretend to be causal. It is a rendering of the modifier layer at portfolio scale.

- **Register:** Workbench, inherits spine from landing and queue.
- **Data it needs:** already exists per row (`ml_drivers` for context, plus the modifier flags computed by `update_enrichment_risk.py`).
- **Honesty guarantee:** every count states its population (233) and its snapshot date. No causal verbs; "concentrated in" not "driven by."
- **What it does not satisfy:** Johan's ownership-transfer, permit-precedence, LL97-threshold-crossing patterns. Those are not modifiers.

### Option 2 — Cohort-patterns surface (Johan)

A view that surfaces owner cohorts (multiple BBLs under the same owner, one flagged), permit precedence (buildings with recent DOB filings), ownership transfers (recent deed events), LL97 threshold crossings (buildings moving from under-cap to over-cap between compliance periods). This is pattern-mining across the entire portfolio, not filtered to any tier.

- **Register:** Workbench.
- **Data it needs:** partially exists (`ll97_over_2024`, `ll97_over_2030`, `dob_jobs`, deed fields on enrichment). Owner-cohort grouping and permit-precedence sequencing are not derived today; they would enter Ismael's backlog as pipeline items.
- **Honesty guarantee:** each pattern names its source (LL97, DOB, ACRIS) and its temporal window.
- **What it does not satisfy:** the §1 language "list of significant predictive flags" is less directly answered — this is pattern surfacing, not a ranked signal list.

### Option 3 — Methodology-page artifact (not a design-system surface)

Neither of the above enters the atoms. Instead, both live in a written methodology deliverable — an appendix to the reasoning report, or a static page linked from the landing footer. §1's intake ask gets a permanent artifact (a written signal-taxonomy document that survives model versions), and §4's Johan framing becomes a written companion piece.

- **Register:** Report (editorial), a longer form than the per-building reasoning report.
- **Data it needs:** the numbers get regenerated per snapshot, but the surface is documentation, not a queryable view.
- **Honesty guarantee:** its provenance is the pipeline run stamp and a version label.
- **What it does not satisfy:** anything queryable at demo time. It is a defensible artifact for David and for Round 2 methodology review, not a workflow surface.

### Option 4 — Combination

Ship Option 1 as an atom (modifier prevalence lives inside the system, near the queue) and Option 2 as a methodology-page artifact (the pattern-mining work is presented as a written companion piece with periodic regeneration). Option 3 is retired as a standalone.

## What we want back

1. **Verdict.** Which of Options 1–4 does the system need? Or if none of them — if the honest answer is "the portfolio pulse plus one clarifying sentence on the landing satisfies §1's intake language and §4 belongs entirely in Round 2 methodology work" — say that.

2. **If atoms are involved (Options 1, 2, or 4):**
   - Which specific components (rows, chips, tiles) the surface needs. Reuse existing components where possible. If new components are needed, spec them minimally.
   - Which laws govern them (proposed law family).
   - Which section(s) of `system.md` change and how (Registers table, Components table, Laws index, Copy rules, Data honesty rules).
   - Any adjustments needed to the reasoning report (Spec 3) — for instance, does Exhibit D gain a "cohort-shared" callout when other buildings under the same owner are also flagged?

3. **If methodology artifacts are involved (Options 3 or 4):**
   - Outline (section headers) of what the artifact contains.
   - Cadence for regeneration.
   - Where it lives in the UI (footer link, "Methodology" page under the top nav, or attached to the reasoning report).

4. **Population and cutoff discipline.** Any counted claim must name its population and snapshot date verbatim. Aggregate SHAP is not recovered under any option — it fails the modifier-driven finding.

## Constraint

Same as before. Do not spec a surface because we asked. If Option 3 (methodology-page only) is the honest answer given that modifiers are directly checkable and would clutter the workbench, that's the answer. The tighter the system stays, the better.

## One narrower question if the answer is Option 1 or 4

If Modifier Prevalence becomes an atom, does it live as its own surface, or as a filter view of the landing queue? The queue already filters on Critical / High / Medium; a "Modifier: outlier" filter chip or "Modifier: accelerating decline" chip could produce the same insight without a new atom. Your read.
