# Fable — Reissue system.md as v1.1

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** Emit `system-v1.1.md` folding in every adjustment from Round 1, Round 1.1 delta, and Ismael's Q1–Q10 sign-off. The current `system.md` in `fable-checkin-1-2026-07-12/` is v1.0. Rather than have three of us build against a doc littered with "per Round 1.1 §5, replace…" annotations, we'd rather have one clean canonical reference to point Pedro at.

**Send after prompt 02 (portfolio signals) so its verdict can be folded in too.** If prompt 02 returns Option 1 or Option 4 with a new atom, the reissue includes that atom's law family, components, and register assignment. If prompt 02 returns Option 3 (methodology-artifact only), the reissue includes the methodology page as a component but not a new atom.

**Assumes you have in memory:** the original `system.md` (v1.0), your Round 1 response, your Round 1.1 delta, this prompt's prompt 02 answer, `docs/ref/2026-07-13_ismael-q1-q10-response.md` (Edwin will attach), and `docs/briefs/2026-07-13_ismael-path-c-decisions.md` (attached for cross-reference).

---

## What we want back

One document: `system-v1.1.md`. Same structure as v1.0 (§1 Voice, §2 Registers, §3 Tokens, §4 Vocabulary, §5 Components, §6 Laws index, §7 Copy rules, §8 Data honesty rules, §9 Architecture notes, §10 Open questions ledger).

Constraints:
- **Nothing invented from scratch.** Every change traces to a Round 1 finding, a Round 1.1 delta finding, an Ismael answer, or a prompt 02 verdict.
- **Callouts inside the doc where you made a substantive change** (a single italicized line at the end of the affected section: "*v1.1: replaced ml_free rule-based tier framing with Path C hybrid naming; source: Round 1.1 §1.*"). Keeps the audit trail readable without cluttering the body.
- **Version-stamped:** `**Version:** 1.1  **Emitted:** 2026-07-13  **Supersedes:** v1.0 (2026-07-12)` at the top.

## Specific changes to fold in

Not exhaustive — call your own judgment where a downstream implication changes copy elsewhere. Anchor changes below.

### §1 Voice
- Keep the v1.0 amendment ("every number wears its confidence"). Add one sentence acknowledging Path C is the design system's first structural expression of this — the tier is a hybrid because the data forced it, and the copy says so.

### §2 Registers
- If prompt 02 adds a modifier-prevalence or cohort-patterns atom, add its register assignment (likely Workbench).

### §3 Tokens
- No changes anticipated. Confirm no numeric token needs to move if any counted labels change.

### §4 Vocabulary
- **Tier language: replace all "rule-based" / "diagnostic rule" tier references with Path C hybrid framing.** Ledger column reads **"Tier · ML base + trend/statute modifiers"** (Ismael's tightening).
- **Provenance chip vocabulary:** version + validation status only, never a numeric AUC. Repo naming: **"XGB v1 · UNVAL"** (Ismael's post-XGBoost convention). AUC lives at case-file-header ledger and methodology-page footer, sourced from `model_meta.cv_auc`. Add explicit rule: "the chip never carries a numeric AUC."
- **Critical redefined per Round 1.1 §1:** `ml_risk ≥ 0.6 AND fresh '24 delta AND (IQR outlier OR accelerating decline)`. Population as of pipeline run 2026-07-01: **23 buildings**. Note LL97 over_cap deliberately excluded (double-counting; the log-scaled penalty is feature #1 inside the model).
- **Divergence marker (S2 semantics):** fires only on two-tier promotions (base-Low to final-High class, currently 176). Not every base/final mismatch — that would fire on 70% of rows.
- **Freshness chip: four states, not three.** Add "no adjacent-yr Δ" state, ~208 buildings per Ismael's count.

### §5 Components
- **Score cell:** S4 (Uncertain) marked renderable-today, no longer "unreachable." S5 (legacy fallback) stays flagged "unreachable against current data" (100% `ml_risk` coverage).
- **Case-file header ledger:** three variants for the fresh column (fresh Δ'24, latest Δ'23, no adjacent-yr Δ). Modifier-promoted filter chip added (176 population).
- **Score cell rank display at case-file scale:** the top 52 rows all sit at ≥0.99 ml_risk (52-row quasi-tie block). L6 refinement: within the block, render "among the top 52 by model score" not "#4 of 1,210." Percentile ordinal stays for cells outside the block.
- **If prompt 02 returns Option 1 or Option 4:** add the new atom(s) to this table with a proposed name.

### §6 Laws index
- **L2 amendment:** "color belongs to the defensible claim" survives with the defensible claim redefined as "a documented procedure with named, checkable modifiers," not "an ML-free method."
- **L6 refinement** for the quasi-tie block (above).
- **If prompt 02 adds an atom,** propose its law family (Fable's judgment — P1–P5 or similar).

### §7 Copy rules
- Add rule 7: "`risk` (legacy heuristic) never renders as a headline number; its only legal surface is the S5 fallback state."
- Add rule 8: **AUC copy is templated from `model_meta`**, single source of truth. Interim: "validation rerun in progress." Post-rerun: "ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)." Ismael delivering this week.
- Add rule 9: **model version copy sources from `model_meta.model_version`**, never hardcoded. Removes the drift class that produced the stale "GBM" strings.

### §8 Data honesty rules
- The percentile-compression clarification from Round 1.1 §2.3: below the ≥0.99 quasi-tie block, percentile gaps reflect very small score differences (distribution is strongly bimodal). Single methodology-page sentence, not a per-surface caveat.

### §9 Architecture notes
- **`model_meta.json` object added** as the pipeline-produced single source of truth. Fields per Ismael's Q5: `model_name, model_version, params_hash, commit, cv_auc, cv_std, cv_kfold, n_labeled, n_positive, label_definition, run_date, validation_status`. Written by `train_xgboost.py` and `update_enrichment_risk.py`, read by API and all UI surfaces.
- **Snapshot diffing** produces `events.json` per Ismael's Q6 (1–2 day scope).
- **Append-only status events endpoint** per Ismael's Q7 (~2 day scope, Postgres).
- **Data-decoupling workaround:** freshness chip pipeline stamp reads `model_meta.run_date`, which is written per run even while JSONs stay container-baked. Full decoupling deferred to follow-up sprint; the discipline is preserved without the infrastructure.

### §10 Open questions ledger
Fold in Round 1.1 delta's closures and additions:
- #1 (coverage reconciliation): confirmed as first ask; same conversation as #15
- #2: answered — divergence class = two-tier promotions, n=176, filter chip
- #3: answered — 52-row quasi-tie block; L6 refinement
- #5: revised — David sign-off on Critical v1.1 as defined (23 buildings)
- #15: resolved — Path C
- #16: resolved — 57 is the current model's High count (base tier); document 52/58/59 as prior vintages
- #17: extended — `model_meta` field list confirmed
- #19 new (Round 1.1): watchlist migrates into write-path store (Pedro, absorbed by Q7)
- #20 new (Round 1.1): `server.js:867` likelihood phrasing fixed alongside model-name strings (Pedro, bundled with `model_meta` rollout per Ismael's Q10)
- #21 new (Round 1.1): `norm_delta_22_24` two-year normalized delta for the 208 non-consecutive rows, Round 2 (Ismael's Q9)
- Add whatever prompt 02 opens or closes.

## Constraint

Do not rewrite for aesthetic improvement. Every change traces to a source. If a section is unchanged from v1.0, keep it verbatim; the audit-trail line at the end of each section handles the versioning discipline.
