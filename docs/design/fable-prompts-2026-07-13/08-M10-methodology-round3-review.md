# M10 Methodology — Round 3 review context

Companion to your round-2 review. Same format: blocks-lock and copy-change items you flagged, with what changed on each and what's still open.

Branch: `edwin/M10-methodology-page` · Commit: `7cbab0b` · File: `src/next/MethodologyPage.jsx`

---

## What I want from you

Confirm each round-2 item is closed. Flag anything new the changes introduced. If the M2 sub-block treatment works, this page can ship pending Ismael on B3.

---

## Round 2 items, addressed

### Blocks-lock

**B1 — M2 split.** Added a `RunFacts` sub-block component. Each run-clock count now lives inside a small bordered block with its own stamp reading "as of the 2026-07-15 scoring refresh · run clock." Definition prose stays under the section's model stamp. Applied to:

- §3: distribution facts (70% / 78% / 176) moved into a `RunFacts` block. Section prose kept above it explains that the system is model-seeded and modifier-driven.
- §5: population sentence ("23 buildings" + top-of-queue) moved into `RunFacts`. LL97 double-count paragraph stays under model stamp because 0.0000 / 0.2074 are model-version facts.
- §6: quasi-tie count (52 rows) moved into `RunFacts`; the definition (ml_risk ≥ 0.99 rows share a saturated score) stays under model. Freshness counts (422/321/208/254) moved into their own `RunFacts`; the four-state definition and the "why freshness is a state" reasoning stay under model.

Visual treatment kept subtle (thin left border, tiny label) so the run stamp reads as a footnote-weight annotation, not a competing headline.

**B2 — 54 vs 57 collision.** All "57 positive labels" and "57 confirmed drops" instances updated to "54 positive-labeled buildings" (§7.1) and "54 buildings" (§8). "Confirmed" retired everywhere the referent was labels; substituted "positive-labeled" or "labeled." §5's "n=57" (buildings above the 0.6 cutoff) preserved because it's a different 57 — count of the model's confident set, not label count — and the ambiguity dissolves once the label numbers everywhere else read 54.

**B3 — AUC one-call confirmation.** Cannot close without Ismael. Added an inline `TODO(edwin, awaiting Ismael)` under the §9 provenance block naming the exact ask: confirm the pair (mean 0.6833, std 0.0511) came from one `cross_val_score` run on the locked config, not a stitched figure. The TODO cites this as the outstanding B3 item.

### Copy-change

**C1 — §8 verb pass.**
- "captures external pressure" → "surfaces external pressure" (strengths line)
- "surfaces customer-specific usage anomalies before they are externally visible" → "surfaces customer-specific usage anomalies that are not yet externally visible" (drops the temporal claim we can't make on ConEd's behalf)
- "the shipped tool is honest about which one it takes" → "honest about the blend it runs" (removes the direct contradiction with the Path C blend paragraph below)
- "The ideal early-warning system runs both and triangulates" → "Target state: an early-warning system that runs both and triangulates. The shipped tool is one half of that pairing." (marks it as design stance, not a claim about the current system)

**C2 — §7 header.**
- "what this model cannot answer honestly today" → "what this model cannot yet answer, and why"
- Supersessions cross-ref reworded: "when a limitation is closed by a future model, its retirement is recorded in §8's supersessions block." Kept the sentence rather than cutting because §8's supersessions block is already the natural home for retired framings and this ties the two sections cleanly.

**C3 — §6 quasi-tie.** "six neighbors sit within noise of you" → "51 other rows sit within noise of that position." Register fix + arithmetic fix (52-row block = 51 other rows).

**C4 — §6 freshness data cause.** Added: "The data cause for the older states: many rows lack a '24 delta because `steam_2024` is null in LL84 for them (publication lag, not a pipeline failure), and the no-adjacent-year rows have non-consecutive reporting years so no adjacent-year delta is computable." Kept the "why freshness is a state" sentence you liked; the new sentence follows it.

**C5 — §8 Uncertain-aligned.** "where a fit exists (NYCHA developments, R² < 0.3), we use it" → "where a per-building fit exists (the 24 NYCHA developments), we use its R² and gate Uncertain below 0.3." Fits exist for all 24; the gate fires below 0.3.

**C6 — LL97 double-count triplication.**
- §5 kept as the canonical statement (0.0000 vs 0.2074 arithmetic + decision + reasoning). Added a closing sentence explicitly claiming canonical status.
- §2 reduced to: "The over-cap boolean carries 0.0000 importance against it, which is why LL97 over-cap is excluded from the Critical modifier leg (canonical explanation in §5)." One clause + link. No arithmetic, no full reasoning.
- §7 has no LL97 mention (my old item 4 was cut in round 1). No further work needed.

**C7 — reconciliation note.** Now three paragraphs.
- Paragraph 1: what the two runs are and what they produced. "ml_risk values shown in the rankings" softened to "the tier and modifier assignments shown in the rankings and case files" and "same model, later scores" to "same model, later downstream computation" — safer since same `params_hash` on unchanged enrichment inputs yields identical scores. (Question for you: is that framing accurate, or would you prefer "the current rankings" as a fully neutral phrase?)
- Paragraph 2: which numbers trace to which run + explicit "The 07-01 date itself appears only in this note; §9's run stamp is the 07-15 refresh." Also names the new RunFacts sub-block treatment so a reader knows how to read the page.
- Paragraph 3: retirement condition (new `params_hash` = both clocks advance = note retired).

**C8 — small things.**
- §7 heading parallel: "Known limitations (the tech-spec four)" → "Model limitations (tech-spec §7)". Secondary block now just "Data limitations." Two blocks name their scope in parallel.
- §4 denominator: prevalence denominator explicitly named as the 956 non-Uncertain rows (modifiers don't apply to Uncertain); cross-cutting counts use the 1,210 total. Each table below will state its denominator once per the added guidance.
- §9 "Model: xgboost" vs test-fixture "XGBoost Classifier" — this is a doc consistency thing, not code. The page renders `{modelMeta.model_name}` verbatim. Whatever `model_meta.json` actually says on main is what ships; test fixtures don't touch it. Non-issue for the shipped page.

---

## Round 2 items, status

**Closed on this branch:** B1 (three sections split with RunFacts), B2 (all number collisions resolved, "confirmed" retired), C1 (all three verbs + target-state framing), C2, C3, C4, C5, C6, C7, C8.

**Open, awaiting Ismael:** B3 (one-call AUC confirmation, TODO in place at §9).

---

## New sub-block treatment (RunFacts) — visual & structural

Before you review the prose, one thing to check: the sub-block treatment I chose for B1. Each `RunFacts` block renders as:

```
┌─ AS OF THE 2026-07-15 SCORING REFRESH · RUN CLOCK
│
│  70% of non-Uncertain rows are modifier-shifted; 78% of final
│  High (182 of 233) is modifier-promoted, 176 of those from
│  base Low.
```

- Thin left border (2px, muted line color), light off-white background, small monospace uppercase label at top.
- Sits inline within a model-stamped section — doesn't break the section header, doesn't compete with the section's own stamp on the right.
- Same visual weight as `.mp-quote` and `.mp-todo`; feels like a caption or a footnote, not a nested section.

If you want a different treatment (e.g., inline dates on individual sentences rather than boxed sub-blocks; or moving the counts entirely into §4/§9 rather than sub-blocking them where they live now), say so — the choice was mine and it's easy to change.

---

## Full revised prose (extracted from the JSX)

### Header + lede

**Title:** Methodology

**Lede:**
> The register for the ConEd steam attrition tool. Each section carries its own stamp: what revises when the model changes, what regenerates when the pipeline runs, and what backfills when the research track lands. If a surface elsewhere in the tool asserts a claim, the definition lives here and the surface links back.

**Reconciliation note (leading block, before §1):**
> **Two dates on this page are not interchangeable.** The validation run on 2026-07-01 fit the current XGBoost configuration to 1,003 labeled buildings and produced the AUC reported in §9. The scoring refresh on 2026-07-15 reran the tiering pipeline against that same model configuration on the current enrichment, producing the tier and modifier assignments shown in the rankings and case files. Same model, later downstream computation.
>
> Label counts, positive counts, and AUC in this document trace to the 07-01 validation run; population totals, prevalence counts, and per-building tiers trace to the 07-15 scoring refresh. Every run-clock sub-block on the page carries its own "as of" label so a reader can tell which snapshot a number came from. The 07-01 date itself appears only in this note; §9's run stamp is the 07-15 refresh.
>
> When the model configuration itself changes — a rerun of `train_xgboost.py` that yields a new `params_hash` — both clocks advance together and this note is retired.

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

The single-highest-importance feature is the log-scaled LL97 penalty (`ll97_penalty_2024_log`). The over-cap boolean carries 0.0000 importance against it, which is why LL97 over-cap is excluded from the Critical modifier leg (canonical explanation in §5).

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

The system is model-seeded and modifier-driven. Definition lives under the model clock; the current-run distribution facts below live under the run clock because they regenerate on every scoring refresh.

**[RunFacts sub-block, as of 2026-07-15 · run clock]**
> 70% of non-Uncertain rows are modifier-shifted; 78% of final High (182 of 233) is modifier-promoted, 176 of those from base Low.

The ledger column label is **"Tier · ML base + trend/statute modifiers."**

---

### §4. Modifier prevalence and co-occurrence (per-run tables)
*Clock: run — stamp: 2026-07-15*

Modifier prevalence surfaces as counted filter chips on the queue and table. The count on a chip is the count of rows the chip opens; the two can never disagree because they are the same query. Every count in this section is named against its population — the natural denominator for modifier prevalence is the 956 non-Uncertain rows (modifiers don't apply to Uncertain); for cross-cutting counts (e.g., queue membership), the denominator is the 1,210 ranked buildings. Each table below states its denominator once.

*[TODO(edwin): populate the prevalence table from the 07-15 refresh; named against the 956 non-Uncertain rows; top-three co-occurrence pairs. LL97 pressure renders as penalty-magnitude bands.]*
*[TODO(edwin): per-run tables regenerate manually until automation exists.]*

---

### §5. Critical: the composite queue state
*Clock: model — stamp: XGB v1 · UNVAL*

Critical is not a fifth tier. It is a composite queue state, defined as a conjunction:

> Critical = ml_risk ≥ 0.6 (the model's confident set, n=57) AND fresh '24 normalized delta present AND at least one trend modifier (IQR outlier in either period OR accelerating decline).

**[RunFacts sub-block, as of 2026-07-15 · run clock]**
> Current population: **23 buildings**. Top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St.

LL97 over-cap is deliberately excluded from the modifier leg. The over-cap boolean carries 0.0000 feature importance while the log-scaled penalty is feature #1 at 0.2074, so the statute pressure is already encoded richly inside the model. The boolean would add double counting, not evidence. This is the canonical statement of the LL97 double-count decision; §2 references it in one line and does not repeat the arithmetic.

The defensible sentence: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year." Lose any leg and the row demotes. Entering or leaving Critical is a nameable event on the delta feed.

---

### §6. Reading the score: compression, quasi-tie, freshness
*Clock: model — stamp: XGB v1 · UNVAL*

**ml_risk is a ranking, not a probability.** Percentile display, no percent sign, no decimals, ties acknowledged. The distribution is strongly bimodal: below the ≥0.99 quasi-tie block, percentile gaps reflect very small score differences (§8 rule 1).

**Quasi-tie block.** Rows with ml_risk ≥ 0.99 share a saturated score; within that block, ordering is noise. The score cell in the rankings table still shows the row's percentile because that cell is a table primitive; at case-file scale, however, the rank line renders block membership instead of ordinal position for rows inside the quasi-tie (§6 law L6, v1.1 refinement).

**[RunFacts sub-block, as of 2026-07-15 · run clock]**
> The quasi-tie block currently holds 52 rows. "Ranked #7 of 1,210" implies a precision the model does not have when 51 other rows sit within noise of that position.

**Freshness states.** Four named states, always naming the vintage of the newest normalized delta: fresh (Δ '24), Δ '23 only, no adjacent-year Δ, Uncertain (handled by the tier). Freshness is a state, not a decoration, because the ranking of a row against no-signal peers can be defensible while the same ranking against fresh-signal peers is not; the state tells the reader which comparison they are looking at. Absence of fresh signal is a designed state, never a bare dash. The data cause for the older states: many rows lack a '24 delta because `steam_2024` is null in LL84 for them (publication lag, not a pipeline failure), and the no-adjacent-year rows have non-consecutive reporting years so no adjacent-year delta is computable.

**[RunFacts sub-block, as of 2026-07-15 · run clock]**
> Fresh (Δ '24): 422 rows. Δ '23 only: 321 rows. No adjacent-year Δ: 208 rows. Uncertain: 254 rows. Roughly 5 rows sit in an unnamed edge state pending Ismael (ledger #22).

---

### §7. Model limitations (tech-spec §7)
*Clock: model — stamp: XGB v1 · UNVAL*

The four limitations below are the tech-spec §7 register (see `docs/model-technical-spec.md`). They describe what this model cannot yet answer, and why. Each limitation ships with the model version stamped above; when a limitation is closed by a future model, its retirement is recorded in §8's supersessions block.

1. **Weather normalization gap (§7.1).** ConEd's internal model uses per-building HDD/CDD linear regression with billing-day adjustment. Our labels use a single annual citywide HDD ratio. Some of the 54 positive-labeled buildings may be partially weather-driven rather than behavioral. Best estimate: affects 5 to 15% of training labels.
2. **Causal validity gap (§7.2, partially addressed).** `steam_ghg_share` addresses the "LL97 pressure ≠ steam conversion" gap but does not resolve two adjacent problems. Building-type feasibility: large hospitals and institutional buildings may not be able to convert (process steam for sterilization, scale of distribution systems) and may receive inflated risk scores. Alternative compliance pathways: envelope upgrades, controls, or RECs all satisfy LL97 without steam reduction, and the model cannot distinguish these pathways from actual attrition intent.
3. **No temporal holdout (§7.3).** All labeled data comes from the same LL84 vintage as the features (CY2022/2023). A fully rigorous evaluation would train on pre-2022 behavior and predict 2023 disconnections. We cannot do this until we have multiple years of ConEd billing history.
4. **Peer score contemporaneity (§7.4).** `peer_score` reflects neighbors' attrition signals from the same reporting period, not a lagged leading indicator. It may capture simultaneous neighborhood-level decisions rather than predictive signal.

#### Data limitations

These are not tech-spec §7 items but are load-bearing enough to name here:

1. **Small positive-label sample.** The classifier is trained on 54 positive-labeled buildings. Cross-validation AUC around 0.68 is a self-consistency check on the training universe, not a back-test against ConEd disconnect records. The provenance chip reads `UNVAL` until back-testing completes.
2. **Yearly resolution on the demand signal.** LL84 publishes annual consumption. Per-building slope estimates on 3 to 4 years of data carry 2 to 3 degrees of freedom. Legitimate but statistically thin; billing-day resolution requires ConEd internal data.

---

### §8. ConEd's framework and ours: complementary signals
*Clock: research — stamp: research track pending*

These aren't two flavors of the same idea. They're two epistemic stances, and the shipped tool is honest about the blend it runs.

#### ConEd's approach: diagnostic / detective work

Build a model of how this specific customer normally uses steam under any weather. Watch for deviations from that customer's own baseline. When several diagnostic signals fire together, label as risk. Like medical diagnosis: not "how does this patient compare to other patients" but "how does this patient compare to their own normal."

*Strengths:* customer-specific, transparent (labels carry the reason), handles "I don't know" naturally via low R². *Weaknesses:* needs long per-customer history, misses external drivers until they show up in usage, requires monthly billing data (yearly is statistically thin).

#### Our approach: classifier / pattern matcher

Take public signals about all buildings. Train on the buildings that historically left steam. For each current building, ask: how similar are this building's signals to the historical leavers? Like credit scoring: not "this borrower's own behavior" but "how this borrower compares to past defaulters."

*Strengths:* works from day one without per-customer history, surfaces external pressure (LL97, DOB permits, peer behavior), model inspectable via SHAP per-building drivers. *Weaknesses:* small positive-label sample (54 buildings), can't say "this customer's usage is anomalous for them," black box at the math layer.

#### Where they meet

ConEd's diagnostic approach surfaces customer-specific usage anomalies that are not yet externally visible, and customers whose own pattern is breaking down. Our classifier surfaces external pressure (LL97 fines, DOB permits) alongside customers in market conditions historically correlated with departure. These are **complementary signals**, not competing models. Target state: an early-warning system that runs both and triangulates. The shipped tool is one half of that pairing.

**The shipped chain is not a pure classifier.** Path C in §4.1 blends the ML base with trend and statute modifiers: the tier that reaches a case file is XGBoost's ranking shifted by IQR outliers, acceleration/deceleration, and LL97 posture. That blend already borrows from the diagnostic tradition on the modifier leg. The "classifier vs diagnostic" framing above describes intellectual lineage; the running system is a hybrid.

**Uncertain, aligned.** Our Uncertain tier already converges partially with Johan's fit-based definition. Where a per-building fit exists (the 24 NYCHA developments), we use its R² and gate Uncertain below 0.3. Where no per-building fit can exist on public data (fewer than 2 years, ml_risk missing), we use the coverage-based gate. Round 2 extends the fit-based gate portfolio-wide when per-building regressions land.

#### Supersessions

Two prior framings appear in older documents and should be read as retired, not applied to the shipped tool:

- The alignment doc's dual-tier **disagreement badge** is not the shipped `DIVERGE` class. `DIVERGE` is intra-hybrid: base vs modifiers within one method. True two-method disagreement (classifier vs diagnostic fit) waits on the Round 2 research engine.
- The **"81% probability" display language** from earlier spec drafts (§3d) is retired. Killed by law L1: ml_risk is a ranking, not a probability, and no surface presents it as one.

*[RESEARCH PENDING: pattern-mining approach for repeatable diagnostic labels — Johan's Round 2 research engine. Section backfills when that work runs.]*

---

### §9. Version and provenance
*Clock: run — stamp: 2026-07-15*

Rendered from `model_meta.json`:

- **Model:** whatever `model_meta.model_name` says at read time (currently `xgboost` in the meta file; the fixture in tests uses "XGBoost Classifier" — the shipped page renders the actual file).
- **Version:** `XGB v1 · UNVAL`
- **Validation status:** unvalidated — cross-validated on the training universe only; no back-test against ConEd disconnect records yet. Provenance chip reads UNVAL until that back-test lands.
- **AUC:** Ranks a true churner above a non-churner about 68% of the time (5-fold CV, 54 positive labels).
- **CV spread:** ±0.0511 across the 5 folds.
- **Label definition:** ≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023.
- **Training set:** 1,003 labeled buildings, 54 positive.
- **Params hash:** `d4b0279a7ba6`
- **Commit:** `9afa92b`
- **Pipeline run:** 2026-07-15 20:41 UTC

*[TODO(edwin, awaiting Ismael, blocks-lock B3): confirm the AUC pair (mean 0.6833, std 0.0511) came from a single `cross_val_score` run on the locked config, not a stitched figure. §9 is the provenance page and cannot present a stitched figure that the footer promises every surface must agree with.]*

---

### Footer

Definitions on this page are the single source of truth for the surfaces that reference them. If a claim on a case file, report, digest, or queue surface disagrees with this page, the surface is wrong.
