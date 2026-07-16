# Fable · Round 1 Integration Check · Response

**Date:** 2026-07-13
**Scope:** the five specs + system.md walked against what the model produces today, per the Round 1 prompt.
**Constraint honored:** no redesigns. Every gap below resolves with a binding decision, a copy change, an S-state addition, or a wait-for-pipeline flag.

---

## 0. Provisional-findings caveat

The prompt lists four attachments that did not arrive with it: `docs/model-technical-spec.md`, `docs/xgboost_results.md`, a representative `buildings.json` row, and the `src/pages/api` surface. This check runs on the ASKS doc plus the Fable brief and client notes from the design session. Findings are firm where the ASKS doc states the fact; the following need verification against the missing files before any of this hardens:

- V1. Exact semantics of the shipped `diagnostic_risk` field: what computation assigns it, what thresholds, what vintage of delta it consumes.
- V2. The SHAP output shape: per-building top-5 with raw feature values available for real-unit formatting, or contributions only.
- V3. Whether `n_years_data` (or an equivalent) exists per row, which is what would populate Uncertain.
- V4. The `risk` field's provenance (which heuristic, why the 81.6% ceiling) so the retirement note is accurate.
- V5. Whether the current peer-median line in the trend chart has any defined cohort, or is decorative.
- V6. Coverage numbers as of the current pipeline: is norm-delta coverage still ~35%?

Send those four files and I'll fold corrections into a Round 1.1 delta rather than reissuing this.

---

## 1. The finding that cuts across every spec

**The tier vocabulary is currently a costume.** The ASKS doc (§4) states that tier assignment today is an ML probability cutoff, not the rule-based method, while the specs' entire defensibility architecture (L2: color belongs to the defensible claim; the ledger's threshold math; report Exhibit D) presumes the tier word comes from the transparent diagnostic rule. A `diagnostic_risk` field has shipped, which may be the honest binding, but until V1 confirms what computes it, every surface that shows a tier word next to rule-method language is claiming a methodology that isn't what assigned the label.

This is the single highest-severity item in the check, it is a binding decision rather than a design change, and it forks cleanly:

- **Path A (preferred):** bind tier word, tick color, and Exhibit D to `diagnostic_risk`, once Ismael confirms its semantics and documents its thresholds. If its thresholds differ from the spec's illustrative ones (below −30% High, etc.), the spec copy updates to match reality, not the reverse.
- **Path B (interim, if A can't be verified this week):** ship the score cell in a documented **S0 "tier withheld"** state: percentile + provenance chip + freshness chip, no tier word, no ramp color. A cell that says less is truthful; a cell wearing rule vocabulary over an ML cutoff is the exact failure the redesign exists to kill.

Everything below assumes one of these paths is chosen before component build starts.

---

## 2. Punch list by spec

### Spec: score-cell-anatomy.html

**Findings:**

1. **Percentile ordinal: okay, and specifically right for this model.** Percentile claims ordering only, which is exactly what a ranker at CV AUC ~0.68 can support; a calibrated probability display could not be supported. The display is AUC-agnostic: it never lies, and it strengthens silently as the model improves. Keep it. (Answers the prompt's "is percentile even the right ordinal" directly: yes, because it is the only ordinal that makes no calibration claim.)
2. **Tier word: blocks-build until the Section 1 binding is decided.** As designed, the word and color assert the rule. Today's UI tiers are ML cutoffs. Path A or Path B, then build.
3. **Provenance chip contents: needs-copy-change.** Answer to the prompt's question: the chip carries **model version + validation status only, never the AUC.** Two reasons. First, both quotable numbers are stale right now (0.672 public predates the switch; 0.683 also predates it per the prompt), so any number in a chip is wrong on arrival. Second, an AUC in a chip repeated across 1,210 rows is 1,210 strings to update after Ismael's rerun. The AUC lives in exactly one place (the case-file ledger and methodology page), rendered from a single `model_meta` source of truth, so the rerun updates one value. Until the rerun lands, the ledger line reads "validation rerun in progress" instead of a number. Related: the chip's version string should follow the repo's actual naming after the XGBoost switch ("XGB v2 · UNVAL" or whatever convention Ismael blesses), replacing the spec's placeholder "GBM v1."
4. **Freshness chip: degrades-gracefully, and the spec already survives.** The prompt's "live · today" phrasing is drift; no spec ever claims live. The chip names the data vintage ("Δ '24," "Δ '23 only") and the topbar names the pipeline run date. Earliest survivable claim with container-baked JSONs: **the vintage of the newest delta plus the build/run date stamped into the JSON at pipeline time.** That stamp is a one-line ask to Ismael and requires no decoupling. "Live," "today," and relative time remain banned until data decouples from deploy, and even then the chip stays vintage-based.
5. **Uncertain tier (S4): okay as spec, unreachable as data.** Spec-first surface waiting for pipeline: nothing populates Uncertain today (ASKS §4). S4 stays in the spec unchanged; it simply cannot render until the pipeline emits the state (via `n_years_data` or the rule's own abstention). No dead-code risk, but add one line to the state table: "unreachable until pipeline emits Uncertain."
6. **`ml_risk` vs `risk` (prompt Q2): resolved by design, plus one migration note.** The atom displays exactly one model score: the percentile of `ml_risk`. The legacy `risk` field never renders as a headline number anywhere; its only legal appearance is the S5 fallback state ("est." + LEGACY chip) for rows where `ml_risk` is absent. The 81.6% ceiling disappears along with the percent sign, because the ceiling is an artifact of displaying the legacy heuristic as a percentage. S2 (divergent) covers ML-vs-rule disagreement, which is a different axis and is enough; no new component. **Migration note for Pedro:** RiskTable and BuildingPanel must switch their binding from `risk` to the percentile-of-`ml_risk`, and the crisp one-sentence answer for §5 of the ASKS doc becomes: "The old panel displayed a legacy heuristic capped by its own formula; the model's output is a ranking, which we now display as a portfolio percentile, so no ceiling applies."

**Adjustments needed:** choose Path A/B (binding decision, Ismael + team); chip copy to version+status, AUC removed to single-source ledger (copy change); add S0 interim state if Path B (S-state addition); one-line unreachability note on S4 (copy change); pipeline stamps run date into JSON (Ismael, trivial); binding migration note (Pedro).

---

### Spec: case-file-header.html

**Findings:**

1. **Driver band: okay.** SHAP top-5 per building is live (ASKS §1). Pending V2: confirm raw feature values ride along for the real-unit formatting (H4); if contributions arrive without values, the band ships with feature + direction + contribution and the value column waits for a pipeline field. Degrades gracefully either way.
2. **Ledger middle column (rule tier with threshold math): blocks-build in its fresh form for most rows.** Two reasons: the Section 1 binding, and coverage. If ~65% of rows lack a fresh delta, the column as drawn ("Δ '24 −66% vs −30% threshold") is renderable for roughly a third of the portfolio. **Adjustment (S-state addition, small):** the ledger column gets the same three variants the cell already has: fresh (as drawn), stale ("newest Δ is '23 vintage; tier from [method as bound]"), and withheld/uncertain. This is inheriting Spec 1's states upward, not new design.
3. **AUC sentence in the ledger: needs-copy-change.** The fixed sentence ("about 65% of the time") is now ungrounded on two counts: the number is stale, and it will change after the rerun. Replace with a template rendered from `model_meta` ("ranks a true churner above a non-churner about {auc_pct}% of the time"), and until the rerun: "validation rerun in progress; ranking order is the claim, not probability." The system.md rule that the caveat is verbatim-everywhere survives; it just becomes verbatim-from-one-source.
4. **Workflow status segment: degrades-gracefully.** No write path exists. Ship the segment read-only, all rows "Unreviewed," non-interactive, with the interaction gated on Pedro's endpoints. Do not fake local-only state; a status that vanishes on refresh is worse than a disabled control.
5. **Narrative slot: see report findings (same answer, prompt Q3).**

**Adjustments needed:** ledger column variants (S-state addition); AUC templating (copy change + one `model_meta` field, Ismael); status segment read-only until write path (build flag, Pedro).

---

### Spec: reasoning-report.html

First, a mapping correction so we're arguing about the same exhibits: in the spec as shipped, **A = SHAP drivers, B = steam trend with peer median and cap line, C = LL97 arithmetic, D = diagnostic rule method.** The prompt's description shuffled these; findings below use the spec's lettering.

**Findings:**

1. **Exhibit A (SHAP top-5): okay.** Live per ASKS §1, pending V2 on value formatting.
2. **Exhibit B (trend + peer + cap): the peer line is the ungrounded element.** Per-customer regression is not built, and no cohort definition is confirmed (V5; also open-questions ledger #13). **Adjustment (degrades-gracefully):** v1 of Exhibit B ships with two lines, this building and the LL97 cap-equivalent, and the peer median joins only when Ismael defines the cohort and the caption can name it. Cutting one line from a chart is not a redesign.
3. **Exhibit C (LL97 arithmetic): okay.** Deterministic, already labeled "not a model output." One open dependency that is a David question, not a build question: whether the $268/ton-over-cap framing matches how ConEd thinks about LL97 pressure (ASKS §6). Keep building; confirm framing at the touchpoint.
4. **Exhibit D (diagnostic rule method): blocks-build as written.** It describes a rule-based tiering that is not what assigns tiers today (Section 1). Under Path A it becomes true once bound and its threshold copy is corrected to the verified values. Under Path B it is withheld from the report until then. Under no path does it ship describing a method that didn't produce the label.
5. **Prompt Q3, the cited narrative: safe only as restricted templating with mandatory human review, and the spec already requires the review.** Grounded slots available today: rank/percentile, LL97 penalty, steam GHG share, emissions, EUI, Energy Star, permit counts. Slots NOT grounded for most rows: fresh delta (coverage), threshold claim (Section 1), peer stat (V5). **Adjustment (copy + build flag):** v1 narrative is deterministic templating over the grounded slots only, no free-form LLM prose, DRAFT watermark until the analyst confirms review (R5 as specified). The LLM pass on the narrative and the digest finding paragraph are Round 2 items, after the methodology work gives them more to truthfully say. The citation mechanic itself is what makes this safe: a template slot that has no source field simply cannot appear.
6. **Method footer: okay and load-bearing.** "Unvalidated" is not just honest, it is required: the intake's ≥70% back-test benchmark is unanswered (ASKS §1), so the footer's claim discipline is doing exactly the job David's honest-framing guidance asks for.

**Adjustments needed:** peer line deferred with caption rule (copy change); Exhibit D gated on Section 1 (binding decision); narrative locked to grounded-slot templating, LLM pass deferred to Round 2 (build flag); AUC in footer templated from `model_meta` (copy change).

---

### Spec: this-week-landing.html

**Findings:**

1. **Delta feed: blocks-build.** Requires run N−1 kept and diffed (events.json), which does not exist. No copy change rescues it; the feed's identity is the diff.
2. **Queue arithmetic: blocks-build on two dependencies.** "Critical" needs the rule-tier binding (Section 1) plus fresh-delta membership plus percentile; only the percentile is computable today. The subtraction ("− contacted − dismissed") needs the write path.
3. **High-risk count reconciliation (ASKS §5, the 52/57/58/59 problem) lands on this spec hardest.** W3/W4 make every count public and derivable, which is the cure, but it means the number must be locked (Ismael's task) before the pulse or queue math ships, or the dashboard will disagree with the deck in front of David.
4. **Portfolio pulse: degrades-gracefully.** Tier distribution is computable the moment the tier binding is decided; week-over-week deltas need N−1 and ship later as a progressive enhancement (render the counts, omit the "(+3 WoW)" parentheticals until diffing exists).
5. **Time anchoring: okay,** contingent only on the pipeline stamping its run date (same one-line ask as Spec 1, finding 4).

**Adjustments needed:** hold the delta feed and queue arithmetic behind diffing + write path + tier binding; pulse ships without WoW parentheticals (copy change); count locked before any aggregate renders (Ismael).

---

### Spec: weekly-digest-email.html

**Findings:**

1. **Entirely downstream: blocks-build by inheritance.** The digest is a projection of the landing (events.json, queue state, pulse); it has no independent data path by design, which is correct and means it simply waits.
2. **No spec changes needed.** The compose flow's v1 already sends nothing itself (mailto/clipboard), the plain-text twin makes David's format answer low-stakes, and the finding paragraph inherits the grounded-template restriction from the report findings above.
3. One touchpoint note: the digest's queue items restate the Critical definition inline; if Path B is where we sit at demo time, the digest cannot honestly ship at all, which is fine, because neither can its inputs.

**Adjustments needed:** none to the spec; sequencing only.

---

### system.md

**Findings and adjustments (all needs-copy-change):**

1. §4.4: the verbatim AUC sentence becomes a template rendered from a single `model_meta` source; add the interim "rerun in progress" copy. The consistency rule survives as consistency-from-one-source.
2. §4.4: provenance chip vocabulary updated to the repo's post-XGBoost version naming; add the explicit rule "the chip never carries a numeric AUC."
3. §8: add rule 7: "`risk` (legacy heuristic) never renders as a headline number; its only legal surface is the S5 fallback state."
4. §5 component table: note S4 unreachable until the pipeline emits Uncertain; add S0 (tier withheld) if Path B is taken; add the ledger-column fresh/stale/withheld variants.
5. §10 ledger additions: **#15 tier binding decision, Path A or B (owner: Ismael + team, blocks: everything with a tier word)**; **#16 lock the high-risk count and document why (owner: Ismael, blocks: pulse, queue, deck consistency)**; **#17 pipeline stamps run date + model_meta into JSON (owner: Ismael, trivial, blocks: freshness chip, topbar anchor, AUC templating)**.
6. §10 ledger #1 (coverage reconciliation) is now confirmed as the right first ask; it and #15 are the same conversation with Ismael.

---

## 3. Held vs. built now

Build now, in this order: **Spec 1** (the moment the tier binding is decided, even on Path B, since S0 still replaces the current "100% High" wall with something true), then **Spec 2** (read-only status, ledger variants, templated AUC line), then **Spec 3** as grounded-slot templating with the DRAFT watermark and a two-line Exhibit B. These three need zero new infrastructure beyond one pipeline stamp and one `model_meta` field, and together they are a demonstrable, truthful vertical slice for the touchpoint: cell in the table, case file, printable report. Hold **Spec 4** and **Spec 5** behind three named dependencies (snapshot diffing, the write path, and the tier binding), not because the specs are wrong but because their honesty guarantees (W2's named triggers, W4's public arithmetic, D2's completeness) are only as true as those inputs, and shipping them earlier would mean faking exactly the freshness and workflow facts the redesign exists to stop faking. This also revises the handoff's build order in one place: the report moves ahead of the landing, because it depends on nothing stateful while the landing depends on everything stateful.

One addition outside the punch-list format, flagged rather than designed per the constraint: the ASKS doc's unmet intake item, a portfolio-level "top signals across all high-risk buildings" artifact, has no home in the five specs. Its natural home is the methodology page or a pulse extension, and it should enter the ledger as #18 (owner: Edwin per the ASKS doc's own suggestion) rather than being improvised into an existing surface.
