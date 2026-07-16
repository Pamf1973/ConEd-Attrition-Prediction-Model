# Fable · Round 1.1 Delta

**Date:** 2026-07-13
**Scope:** delta to `integration-check-round-1-response.md`, per the Round 1.1 prompt. Hardens or corrects; does not reissue. Section numbers below reference the Round 1 response.
**Method note:** the JSONs and server.js were verified directly, not read from the memo. Every count below was computed from the attached files. Three findings are new, meaning they were not in your memo and change decisions: the tier distribution is far more modifier-driven than "hybrid" suggests, the percentile ordinal compresses over a cliff-shaped score distribution, and the watchlist store is in-memory.

---

## 1. Path read: C, and the data makes it more C than your memo suggested

Path C is right, and Path A as originally drawn is dead on arrival. But the cross-tab of base tier (from the ML cutoffs) against final `diagnostic_risk` shows the hybrid is not "ML base with rule adjustments." It is closer to the reverse:

```
base High  -> final High     51
base Med   -> final High      6        base tiers (ml_risk cutoffs):
base Low   -> final High    176        High 57 · Medium 8 · Low 1,145
base Low   -> final Medium  482
base Med   -> final Med/Low   2        final tiers (non-Uncertain, 956):
base Low   -> final Low     239        High 233 · Medium 483 · Low 240

modifier-shifted rows: 665 of 956 (70%)
```

**Read the High row:** 182 of the 233 final-High buildings (78%) were promoted into it by modifiers, and 176 of those came from base Low, meaning ml_risk under 0.2 plus two independent flags. The tier system as shipped is model-seeded and modifier-driven, and the copy has to say so. Consequences for the Path C packet, all copy or vocabulary, no atom changes:

1. **Ledger column label** becomes "Tier · model base + trend/statute modifiers" (or team wording to that effect). "Transparent diagnostic rule" and "the method ConEd's own team uses" are retired from tier contexts.
2. **Exhibit D** describes the actual four-step chain verbatim (Uncertain gates, cutoffs 0.2/0.6, the four named modifiers at ±1, clamp), and adds one honest sentence the data now supports: "most High-tier assignments are produced by the modifier layer, which consists of directly checkable facts: an IQR outlier drop, accelerating decline, or statute over-cap status." That sentence is the defensibility win hiding inside this mess: 78% of the High tier is explainable in plain English without invoking the model at all.
3. **S2 divergence marker semantics change.** Originally it meant "two independent methods disagree." The tier is no longer independent of the score, and one-tier shifts are the norm (70%), so marking every base/final difference would mark most of the portfolio. New rule: the marker fires on **two-tier movement only**, which is exactly the base-Low-to-final-High class, population **176**. That also answers ledger #2: divergence is not a rare annotation, it is a first-class filterable class ("Modifier-promoted · 176"), and the queue filter chip already drawn in Spec 4 absorbs it. The marker's claim sentence becomes: "the model sees little resemblance to past churners; two independent flags promote it anyway."
4. **L2 amendment in system.md:** "color belongs to the defensible claim" survives with the defensible claim redefined as "a documented procedure with named, checkable modifiers," not "an ML-free method."
5. **Cell chip stays score-only** ("XGB v2 · UNVAL" per repo naming). The tier's provenance is a ledger-scale and methodology-page fact; the cell does not grow a second chip.

**Critical must be redefined, and the data hands us the definition.** Both Round 1 legs fail empirically: "rule tier High" is now 78% modifier-manufactured, and "top-decile ML rank" is meaningless because the 121st-ranked building has ml_risk 0.038 (see §2.3). Proposed v1.1, computed against current data:

> **Critical = ml_risk ≥ 0.6 (the model's own confident set, n=57) AND a fresh '24 delta AND at least one trend modifier (IQR outlier or accelerating decline).**

Population today: **23 buildings** (660 Madison, 222 E 59th, 40 W 57th, 80 Maiden Lane, 215 E 58th among them). The ll97_over flag is deliberately excluded from the modifier leg: it is quasi-static, it is already feature #1 inside the model (double counting), and including it changes the count by exactly one (24 vs 23) while weakening the sentence. The defensible sentence becomes: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year." Three legs, all checkable, sized at 23, which is a Monday queue. Side effect: ml_risk ≥ 0.6 yields exactly **57**, which resolves ledger #16's count reconciliation in favor of 57 as the current model's number; document the other counts (52/58/59) as prior model/label vintages.

---

## 2. Changes to Round 1 spec-level adjustments

### 2.1 S4 Uncertain: unreachable → live, and it joins the build-now slice
Round 1 guessed Uncertain was unpopulated; wrong. 254 rows render it today, all reason-coded ("Insufficient data: only 1 year(s)"), and `uncertain_reason` plus `n_years_data` exist per row, so the S4 chip copy binds to real fields as drawn. The Uncertain gates also include two states the spec should name in its data notes: NYCHA low-R² and missing ml_risk (the latter currently empty). Severity moves from wait-for-pipeline to **okay, build now**.

### 2.2 S5 legacy fallback: confirmed dead code, keep as insurance
`ml_risk` is 100% populated; the `?? b.risk` fallback in both server.js:267 and useBuildings.js cannot fire. Legacy `risk` ceiling verified at exactly **0.816** (formula cap, min 0.085), which confirms the migration one-liner. S5 stays in the spec flagged "unreachable against current data."

### 2.3 Percentile: Round 1's verdict needs a correction, not a reversal
The distribution is a cliff, and the memo's own numbers understate it. Verified rank profile:

```
rank 1: 0.9987   rank 52: 0.9905   rank 57: 0.7869   rank 58: 0.5159
rank 66: 0.1870  rank 121: 0.0380  rank 242: 0.0120  rank 605: 0.0018
```

Two consequences, both handled with copy and one L6 refinement, no redesign:
- **The quasi-tie block.** Only 2 rows tie at the exact max, but 52 rows sit at ≥ 0.99; ordering inside that block is noise. L6 refinement: at case-file scale, rows in the block render "among the top 52 by model score," not "#4 of 1,210." The Spec 2 and Spec 3 specimens' "#4 · tied w/ 2" line updates accordingly.
- **Compression below the cliff.** "90th percentile" describes a 0.038 score. Percentile remains the honest ordinal (it claims ordering, nothing else), but the methodology page gains one sentence: the distribution is strongly bimodal, and percentile gaps below roughly the 95th reflect very small score differences. Under Path C this is self-correcting on the surface itself: a "90th · Low" cell is the correct, expected render, and the tier word is what carries severity. Round 1's answer to "is percentile the right ordinal" stands, with this footnote attached.

### 2.4 Freshness: four states, not three, with verified counts
Your V6 proposed three variants. The data has four: **fresh Δ'24 (422) · latest Δ'23 (321) · years non-consecutive, no Δ possible (213) · Uncertain (254).** Sums to 1,210. The 213 are all the (steam_2022, steam_2024) pattern, two years of data but no adjacent pair, so they pass the Uncertain gate yet carry no delta and no trend modifiers. Chip copy for the new state: "no adjacent-yr Δ" in the stale (dashed) treatment. This is one chip variant, not a new S-state; the cell layout is untouched. Flag for Ismael's backlog, not this round: a '22→'24 two-year normalized delta is computable for those 213 and would collapse the state.

### 2.5 SHAP driver band: degrades-gracefully → okay
`ml_drivers` verified as five `{feature, contribution, value}` dicts with raw values present (energy_star −3.63 at value 10.0, peer_score −2.41 at value 0.073). H4's real-unit formatting needs no pipeline work. Two copy notes: contributions are signed log-odds-scale numbers, so the band shows them as signed magnitudes without claiming units; and `peer_score`'s plain-language label should be non-causal per the tech spec's §7.4 ("share of cluster showing attrition signals, same period"), not "neighbors leaving."

### 2.6 Two additions from reading server.js
- **Watchlist is an in-memory Map keyed by session token** (server.js:314, LRU-capped at 500). It does not survive a restart, let alone a redeploy. Round 1's suspicion confirmed; the Spec 2 write-path store absorbs watchlist as its first migration, and this enters the ledger (#19).
- **server.js:867 has a second problem beyond the stale "GBM" name:** the chatbot answer calls ml_risk "a prediction (0–1) of how likely a building is to reduce or cancel steam service." That is a calibration claim the model cannot support and the exact language L1 exists to kill. The copy fix for the stale strings should fix the likelihood phrasing in the same commit (#20).

---

## 3. Peer line: confirmed, stands as written
`peer_score` is a scalar (cluster attrition fraction) and no cohort trend series exists anywhere in the JSONs. Exhibit B ships v1 with two lines (this building + cap-equivalent); the peer median joins when a cohort is defined and the caption can name it. The scalar is already surfaced honestly as driver #6 in the band, which is its only legitimate appearance for now.

## 4. AUC templating and provenance chip, updated by the two docs

1. **Source of truth confirmed:** xgboost_results.md, XGBoost, 5-fold CV AUC 0.6833. The chip decision (version + status, never the AUC) is not just confirmed but proven by the paper trail: the quotable number changed twice in five weeks (0.672 → 0.6639 corrected → 0.6833), and the training set moved under it (1,046 labeled/57 positive in the stale spec vs 1,003/54 in the XGBoost run). A number in a chip would have been wrong three times.
2. **One caution to fold into Ismael's rerun spec:** 0.6833 is a GridSearchCV best score with no reported fold std (the GBM's was ± 0.1030, which is enormous). A grid-search best is mildly optimistic by selection; the rerun should report the chosen config's CV AUC with std on a clean run, and the templated sentence should round to two decimals and carry the label count: "ranks a true churner above a non-churner about 68% of the time (5-fold CV, 54 positive labels)." No number ships in any surface until that rerun lands; the interim ledger copy from Round 1 ("validation rerun in progress") stands.
3. **model_meta fields for the pipeline stamp (extends Round 1's #17):** `model_name, params_hash or commit, cv_auc, cv_std, n_labeled, n_positive, label_definition, run_date`. One object, written by the pipeline, read by ledger, report footer, digest footer, and the chatbot answer.
4. **Label framing:** the stale spec's "not synthetic proxies" line is half right and the distinction matters for copy: labels are real observed demand drops, but demand drop is itself a proxy for disconnection. The shipped phrase stays "demand-drop labels, unvalidated against disconnect records," which honors both halves. The stale spec's §7 limitations (weather noise in 5 to 15% of labels, feasibility gap for hospitals, no temporal holdout, peer contemporaneity) are ready-made methodology-page copy and should survive the spec rewrite.
5. Known-drift items (spec doc staleness, server.js:585/867) acknowledged; no cycles spent reconciling, per your instruction, beyond the new likelihood-phrasing finding in §2.6.

---

## 5. Net effect on the build-now slice and the ledger

The build-now slice from Round 1 §3 **grows**: Spec 1 now ships with S4 live and four freshness chip variants; Spec 2's driver band is fully grounded; the Path C copy packet replaces the Path A/B fork everywhere. The hold list is unchanged (Spec 4's feed and arithmetic, Spec 5) with one improvement: Critical v1.1 is computable today from existing fields, so the queue's membership logic can be built and verified against the 23 now, even while the subtraction ("− contacted − dismissed") still waits on the write path.

Ledger updates: **#2 answered** (divergence class = two-tier promotions, n=176, becomes a filter chip). **#3 answered** (2 exact ties; 52-row quasi-tie block; L6 refinement above). **#5 revised** (David sign-off now on Critical v1.1 as defined here, with the computed 23). **#15 resolved** (Path C). **#16 resolved** (57 is the current model's count; document vintage of the others). **#17 extended** (model_meta field list above). New: **#19** watchlist migrates into the write-path store (Pedro). **#20** server.js:867 likelihood phrasing fixed alongside the name strings (Pedro, same commit). **#21** optional pipeline item: '22→'24 adjacent-gap delta for the 213 non-consecutive rows (Ismael, collapses a chip state when done).
