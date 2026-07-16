# Fable — Round 1 integration check

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** Diagnostic pass on the specs you already produced (`system.md` + the five HTML atoms) against the actual model. Before component build starts, we need to know where the frontend claims something the model can't back up.

**Attach to this prompt:**
- `coned-dashboard-BLACKSTONE-PREP-ASKS-FOR-TEAM.md` (domain context — the reconstructed list of what David and ConEd asked for)
- `docs/model-technical-spec.md`
- `docs/xgboost_results.md`
- The `data/buildings.json` schema (or a representative row) so you can see what fields exist and their coverage
- `src/pages/api/` or whatever surfaces the current `ml_risk` vs `risk` split — the two-field problem is one of the things we need you to look at

## What we're asking

Read the ASKS doc for domain context. Then walk each of your five specs (`system.md`, `score-cell-anatomy.html`, `reasoning-report.html`, `this-week-landing.html`, `weekly-digest-email.html`) against what the model actually produces today and answer:

1. **Where does the frontend claim something the model can't back up?** Specifically:
   - **Score cell.** We designed a percentile ordinal ("96th") + tier word + provenance chip. Does the current model output support this display? Is percentile even the right ordinal given cross-validated AUC 0.683 (which predates the XGBoost switch)? The AUC we quote publicly (0.672) is stale — we're rerunning. Should the provenance chip carry the model version, the AUC, or both?
   - **Reasoning report.** Exhibits A–D make specific claims: A shows the '23→'24 delta, B shows peer comparison, C shows LL97 arithmetic labeled "Not a model output," D shows SHAP top-5. Does Exhibit D's SHAP top-5 exist in the current output shape? Is peer comparison (B) computed today, or does it require Ismael's per-customer regression to be honest?
   - **Freshness chip.** "live · today" vs "stale · Q3 24" — the pipeline currently bakes JSONs into the container. What's the earliest survivable claim the chip can make until Ismael decouples data from deploy?
   - **Uncertain tier.** §64 of the ASKS doc says the Uncertain tier is defined in data but empty/not surfaced. Does the current build produce anything that would populate it, or is this a spec-first surface waiting for pipeline work?

2. **The `ml_risk` vs `risk` gap.** §79 of the ASKS doc flags that BuildingPanel doesn't surface `ml_risk` — displayed scores top out at 81.6%. Does the score-cell atom you designed resolve this by design, or does the divergence need its own component (S2 divergent state exists — is that enough)?

3. **Where would the reasoning report generate ungrounded prose?** §7 of `system.md` says "generated prose never contains ungrounded numbers." Given the current model output, is the cited-narrative slot on the report actually safe to auto-generate, or does it need a human-in-the-loop until we ship the Round 2 methodology work?

## What we want back

A punch list. For each spec, one section:

- **Spec:** [name]
- **Findings:** what claims the current model doesn't support, with severity (blocks-build / needs-copy-change / degrades-gracefully / okay)
- **Adjustments needed:** the concrete edit to the spec, either an S-state addition, a copy change, or a "wait for pipeline work" flag

At the end, one paragraph on whether any spec should be **held** until pipeline work lands, versus built now with a graceful-degradation state.

## Constraint

Do not redesign anything you don't have to. If a copy change or an S-state addition resolves the gap, prefer that. We're checking truthfulness, not iterating aesthetics.
