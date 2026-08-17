# M10 Methodology — Round 2 review context

Companion to the round-1 review you did on this page. Everything below is what changed since then, plus the full revised prose.

Branch: `edwin/M10-methodology-page` · Commit: `a24bf5c` · File: `src/next/MethodologyPage.jsx`

---

## What I want from you

Same format as round 1. Two buckets:

1. **Blocks-lock** — anything I still got wrong on substance, structure, or a M-family / L-family law from `system-v1.1.md`. These I fix before this page ships.
2. **Copy-change** — anything at the sentence / word level that a careful reader would trip on. These I fix in a second pass.

If a round-1 item is now sufficiently addressed, name it explicitly so I can close it. If it's *partly* addressed, say what's missing.

---

## What changed since round 1

**Blocks-lock items you flagged, now addressed:**

- **§7 rewritten.** Replaced my four with the tech-spec §7.1–7.4 verbatim in substance: weather normalization gap, causal validity gap (with both sub-bullets — building-type feasibility and alternative compliance pathways), no temporal holdout, peer score contemporaneity. Kept my old items 1 and 2 (small positive sample, yearly LL84 resolution) as a secondary "Data limitations" block under an h3. Cut my old items 3 (which duplicated 7.1) and 4 (LL97 double-count belongs in §5, not §7).

- **Two-run reconciliation.** Added as a leading `.mp-note` block right after the lede, before §1. Explains the 07-01 validation run vs 07-15 scoring refresh split, states which numbers on the page trace to which run, and names the condition under which the note is retired (new `params_hash`). Chose this placement over "between §2 and §3" because it's a how-to-read-the-stamps note and belongs with the intro, not shoved into the section flow.

- **§6 L6 factual fix.** Score cell in the rankings table keeps percentile (it's a table primitive). What changes at case-file scale for quasi-tie rows is the rank line — it renders block membership ("in the top block") instead of ordinal position ("#7 of 1,210"). Added the reasoning: "Ranked #7 of 1,210 implies a precision the model does not have when six neighbors sit within noise of you."

**Copy-change items you flagged, now addressed:**

- **§1** — added intended reader (Steam Ops analyst preparing weekly triage) + cadence (weekly review + event-driven follow-ups). Added the UNVAL chip sentence with the reason it still says UNVAL.
- **§2** — cited `docs/model-technical-spec.md §4` as the source for the 12-feature list. Consistency: the pending-item TODO now names the *real* gap (`model_meta.feature_importances` computed at `train_xgboost.py:194` but not written to the meta output at line 340; separate from the ml_drivers item which Ismael just landed).
- **§3** — cut the "(full form 'model base' acceptable in pitch contexts only)" parenthetical.
- **§4** — added named-population discipline ("N of the 1,210 ranked buildings, never a bare number") and pinned the TODO to the 07-15 scoring refresh so counts trace correctly.
- **§5** — reworded "Population as of pipeline run 2026-07-01: 23 buildings" so it references the 07-15 refresh + reconciliation note instead of stamping a stale-looking date on the current population.
- **§6** — added the "why" behind freshness states: the ranking of a row against no-signal peers can be defensible while the same ranking against fresh-signal peers is not; the state tells the reader which comparison they are looking at.
- **§8** — verb pass (catches → surfaces where the causal load was heavy). Added a "shipped chain is not a pure classifier" paragraph acknowledging Path C blend: the tier that reaches a case file is XGBoost's ranking shifted by trend and statute modifiers, so the diagnostic/classifier framing above describes lineage while the running system is a hybrid. Promoted the supersessions TODO into a real h3 block with the two bullets (DIVERGE ≠ dual-tier disagreement badge; "81% probability" retired by L1).
- **§9** — `ProvenanceBlock` now renders `cv_std` when present ("CV spread: ±0.0511 across the 5 folds") and expands `validation_status: "unvalidated"` into a full sentence explaining what unvalidated means and why the chip still says UNVAL.

---

## Full revised prose (extracted from the JSX)

### Header + lede

**Title:** Methodology

**Lede:**
> The register for the ConEd steam attrition tool. Each section carries its own stamp: what revises when the model changes, what regenerates when the pipeline runs, and what backfills when the research track lands. If a surface elsewhere in the tool asserts a claim, the definition lives here and the surface links back.

**Reconciliation note (leading block, before §1):**
> **Two dates on this page are not interchangeable.** The validation run on 2026-07-01 fit the current XGBoost configuration to 1,003 labeled buildings and produced the AUC reported in §9. The scoring refresh on 2026-07-15 reran the tiering pipeline against that same model configuration on the current enrichment, producing the ml_risk values shown in the rankings and case files. Same model, later scores. Label counts, positive counts, and AUC in this document trace to the 07-01 validation run; population totals and per-building tiers trace to the 07-15 scoring refresh. When the model configuration itself changes — a rerun of `train_xgboost.py` that yields a new `params_hash` — both clocks advance together and this note is retired.

---

### §1. What the tool claims, and what it doesn't
*Clock: model — stamp: XGB v1 · UNVAL*

This tool ranks buildings by steam-attrition risk and surfaces the reasons behind each ranking so an analyst can decide whether to engage. It does not forecast disconnect dates, allocate territory, or generate customer outreach on its own. Every ranking carries a provenance chip and a validation status; today that chip reads `UNVAL` because the classifier has not yet been back-tested against ConEd disconnect records (§7).

The intended reader is a Steam Ops analyst preparing weekly triage. The intended cadence is a weekly review of the queue plus event-driven follow-ups when the delta feed names a change worth attention.

The tool is a workbench, not an autopilot. The strongest defensibility feature is a human signature: reports and digests are drafted by the system and owned by the analyst who sends them (§8 rule 6).

---

### §2. Signal taxonomy: the 12 features and their importances
*Clock: model — stamp: XGB v1 · UNVAL*

The XGBoost model consumes 12 features derived from public data: LL84 energy disclosures, LL97 penalty arithmetic, DOB permit counts, NYCHA per-development weather regressions where they exist, NOAA Central Park weather normals. The full feature list and each feature's derivation live in `docs/model-technical-spec.md` §4. Feature importances render from `model_meta.feature_importances` so this section stays honest across model revisions.

*[FeatureImportances table — renders when meta emits the array; pending block shown otherwise.]*

The single-highest-importance feature is the log-scaled LL97 penalty (`ll97_penalty_2024_log`). The over-cap boolean carries near-zero importance because the log-scaled penalty already encodes statute pressure richly; presenting the boolean as an additional modifier would double-count. This is why LL97 over-cap is excluded from the Critical modifier leg (§5).

*[TODO: pending `model_meta.feature_importances` write, then add top-3 plain-language glosses.]*

---

### §3. The tier chain (system-v1.1 §4.1 verbatim)
*Clock: model — stamp: XGB v1 · UNVAL*

The tier vocabulary is exactly: **High / Medium / Low / Uncertain.**

The tier is a hybrid, and every surface says so. Assignment chain, per `compute_diagnostic_risk` in `update_enrichment_risk.py`:

1. **Uncertain gates take priority.** Fewer than 2 years of steam data, NYCHA development with regression R² below 0.3, or missing ml_risk.
2. **Base tier from ML probability cutoffs.** Below 0.2 Low, 0.2 to 0.6 Medium, 0.6 and above High.
3. **Modifiers, each shifting one tier level.** IQR outlier in either delta period +1, accelerating decline +1, decelerating decline −1, LL97 over-cap (2024 or 2030) +1.
4. **Clamp to [Low, High].**

Distribution facts the copy must not hide: 70% of non-Uncertain rows are modifier-shifted; 78% of final High (182 of 233) is modifier-promoted, 176 of those from base Low. The system is model-seeded and modifier-driven.

The ledger column label is **"Tier · ML base + trend/statute modifiers."**

---

### §4. Modifier prevalence and co-occurrence (per-run tables)
*Clock: run — stamp: 2026-07-15 (07-15 scoring refresh)*

Modifier prevalence surfaces as counted filter chips on the queue and table. The count on a chip is the count of rows the chip opens; the two can never disagree because they are the same query. Every count in this section is named against the population it describes — "N of the 1,210 ranked buildings," never a bare number.

*[TODO(edwin): populate the prevalence table from the 07-15 refresh; top-three co-occurrence pairs. LL97 pressure renders as penalty-magnitude bands, never over-cap boolean count.]*
*[TODO(edwin): per-run tables regenerate manually until automation exists; stamp above makes that honest.]*

---

### §5. Critical: the composite queue state
*Clock: model — stamp: XGB v1 · UNVAL*

Critical is not a fifth tier. It is a composite queue state, defined as a conjunction:

> Critical = ml_risk ≥ 0.6 (the model's confident set, n=57) AND fresh '24 normalized delta present AND at least one trend modifier (IQR outlier in either period OR accelerating decline).

Current population: **23 buildings** (per the 2026-07-15 scoring refresh; see the reconciliation note above). Top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St.

LL97 over-cap is deliberately excluded from the modifier leg: the boolean carries 0.0000 feature importance while the log-scaled penalty is feature #1 at 0.2074, so the statute pressure is already encoded richly inside the model. The boolean would add double counting, not evidence.

The defensible sentence: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year." Lose any leg and the row demotes. Entering or leaving Critical is a nameable event on the delta feed.

---

### §6. Reading the score: compression, quasi-tie, freshness
*Clock: model — stamp: XGB v1 · UNVAL*

**ml_risk is a ranking, not a probability.** Percentile display, no percent sign, no decimals, ties acknowledged. The distribution is strongly bimodal: below the ≥0.99 quasi-tie block, percentile gaps reflect very small score differences (§8 rule 1).

**Quasi-tie block.** The top 52 rows share ml_risk ≥ 0.99. Within the block, ordering is noise. The score cell in the rankings table still shows the row's percentile because that cell is a table primitive; at case-file scale, however, the rank line renders block membership instead of ordinal position for rows inside the quasi-tie (§6 law L6, v1.1 refinement). "Ranked #7 of 1,210" implies a precision the model does not have when six neighbors sit within noise of you.

**Freshness states.** Four named states, always naming the vintage of the newest normalized delta: fresh (Δ '24, 422 rows), Δ '23 only (321 rows), no adjacent-year Δ (208 rows), Uncertain (254 rows, handled by the tier). Freshness is a state, not a decoration, because the ranking of a row against no-signal peers can be defensible while the same ranking against fresh-signal peers is not; the state tells the reader which comparison they are looking at. Absence of fresh signal is a designed state, never a bare dash. Roughly 5 rows sit in an unnamed edge state pending Ismael (ledger #22).

---

### §7. Known limitations (the tech-spec four)
*Clock: model — stamp: XGB v1 · UNVAL*

The four limitations below are the tech-spec §7 register (see `docs/model-technical-spec.md`). They describe what this model cannot answer honestly today. Each limitation ships with the model version stamped above; when a limitation is closed, it moves to the supersessions block in §8.

1. **Weather normalization gap (§7.1).** ConEd's internal model uses per-building HDD/CDD linear regression with billing-day adjustment. Our labels use a single annual citywide HDD ratio. Some of the 57 positive labels may be partially weather-driven rather than behavioral. Best estimate: affects 5 to 15% of training labels.
2. **Causal validity gap (§7.2, partially addressed).** `steam_ghg_share` addresses the "LL97 pressure ≠ steam conversion" gap but does not resolve two adjacent problems. Building-type feasibility: large hospitals and institutional buildings may not be able to convert (process steam for sterilization, scale of distribution systems) and may receive inflated risk scores. Alternative compliance pathways: envelope upgrades, controls, or RECs all satisfy LL97 without steam reduction, and the model cannot distinguish these pathways from actual attrition intent.
3. **No temporal holdout (§7.3).** All labeled data comes from the same LL84 vintage as the features (CY2022/2023). A fully rigorous evaluation would train on pre-2022 behavior and predict 2023 disconnections. We cannot do this until we have multiple years of ConEd billing history.
4. **Peer score contemporaneity (§7.4).** `peer_score` reflects neighbors' attrition signals from the same reporting period, not a lagged leading indicator. It may capture simultaneous neighborhood-level decisions rather than predictive signal.

#### Data limitations (secondary)

These are not tech-spec §7 items but are load-bearing enough to name here:

1. **Small positive-label sample.** The classifier is trained on 54 confirmed steam-demand drops. Cross-validation AUC around 0.68 is a self-consistency check on the training universe, not a back-test against ConEd disconnect records. The provenance chip reads `UNVAL` until back-testing completes.
2. **Yearly resolution on the demand signal.** LL84 publishes annual consumption. Per-building slope estimates on 3 to 4 years of data carry 2 to 3 degrees of freedom. Legitimate but statistically thin; billing-day resolution requires ConEd internal data.

---

### §8. ConEd's framework and ours: complementary signals
*Clock: research — stamp: research track pending*

These aren't two flavors of the same idea. They're two epistemic stances, and the shipped tool is honest about which one it takes.

#### ConEd's approach: diagnostic / detective work

Build a model of how this specific customer normally uses steam under any weather. Watch for deviations from that customer's own baseline. When several diagnostic signals fire together, label as risk. Like medical diagnosis: not "how does this patient compare to other patients" but "how does this patient compare to their own normal."

*Strengths:* customer-specific, transparent (labels carry the reason), handles "I don't know" naturally via low R². *Weaknesses:* needs long per-customer history, misses external drivers until they show up in usage, requires monthly billing data (yearly is statistically thin).

#### Our approach: classifier / pattern matcher

Take public signals about all buildings. Train on the buildings that historically left steam. For each current building, ask: how similar are this building's signals to the historical leavers? Like credit scoring: not "this borrower's own behavior" but "how this borrower compares to past defaulters."

*Strengths:* works from day one without per-customer history, captures external pressure (LL97, DOB permits, peer behavior), model inspectable via SHAP per-building drivers. *Weaknesses:* small positive sample (57 confirmed drops), can't say "this customer's usage is anomalous for them," black box at the math layer.

#### Where they meet

ConEd's diagnostic approach surfaces customer-specific usage anomalies before they are externally visible, and customers whose own pattern is breaking down. Our classifier surfaces external pressure (LL97 fines, DOB permits) alongside customers in market conditions historically correlated with departure. These are **complementary signals**, not competing models. The ideal early-warning system runs both and triangulates.

**The shipped chain is not a pure classifier.** Path C in §4.1 blends the ML base with trend and statute modifiers: the tier that reaches a case file is XGBoost's ranking shifted by IQR outliers, acceleration/deceleration, and LL97 posture. That blend already borrows from the diagnostic tradition on the modifier leg. The "classifier vs diagnostic" framing above describes intellectual lineage; the running system is a hybrid.

**Uncertain, aligned.** Our Uncertain tier already converges partially with Johan's fit-based definition. Where a fit exists (NYCHA developments, R² < 0.3), we use it. Where no per-building fit can exist on public data (fewer than 2 years, ml_risk missing), we use the coverage-based gate. Round 2 extends the fit-based gate portfolio-wide when per-building regressions land.

#### Supersessions

Two prior framings appear in older documents and should be read as retired, not applied to the shipped tool:

- The alignment doc's dual-tier **disagreement badge** is not the shipped `DIVERGE` class. `DIVERGE` is intra-hybrid: base vs modifiers within one method. True two-method disagreement (classifier vs diagnostic fit) waits on the Round 2 research engine.
- The **"81% probability" display language** from earlier spec drafts (§3d) is retired. Killed by law L1: ml_risk is a ranking, not a probability, and no surface presents it as one.

*[RESEARCH PENDING: pattern-mining approach for repeatable diagnostic labels — Johan's Round 2 research engine. Section backfills when that work runs.]*

---

### §9. Version and provenance
*Clock: run — stamp: 2026-07-15*

Rendered from `model_meta.json`:

- **Model:** `xgboost`
- **Version:** `XGB v1 · UNVAL`
- **Validation status:** unvalidated — cross-validated on the training universe only; no back-test against ConEd disconnect records yet. Provenance chip reads UNVAL until that back-test lands.
- **AUC:** Ranks a true churner above a non-churner about 68% of the time (5-fold CV, 54 positive labels).
- **CV spread:** ±0.0511 across the 5 folds.
- **Label definition:** ≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023.
- **Training set:** 1,003 labeled buildings, 54 positive.
- **Params hash:** `d4b0279a7ba6`
- **Commit:** `9afa92b`
- **Pipeline run:** 2026-07-15 20:41 UTC

---

### Footer

Definitions on this page are the single source of truth for the surfaces that reference them. If a claim on a case file, report, digest, or queue surface disagrees with this page, the surface is wrong.
