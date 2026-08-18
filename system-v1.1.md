# ConEd Steam Attrition · Design System

**Version:** 1.1  **Emitted:** 2026-07-13  **Supersedes:** v1.0 (2026-07-12)
Extracted from the atom series: Spec 1 (score cell), Spec 2 (case-file header), Spec 3 (reasoning report), Spec 4 (This Week landing), Spec 5 (weekly digest), plus the methodology page and queue aggregate view added in v1.1.
This file is the single source of truth for tokens, vocabulary, laws, and copy rules. If a spec and this file disagree, fix one of them in the same commit.

---

## 1. Voice

Bloomberg Terminal that explains itself, with one amendment learned in critique: **every number wears its confidence.** The seriousness and monospace density of a professional workbench, the button-first discoverability a weekly-cadence analyst actually needs, and AI embedded inside the primary object rather than beside it. Every recommendation carries its methodology in the same view, and every score displays its epistemic state: provenance, validation status, freshness, and coverage are first-class visual citizens, not implementation details.

The register presumption to guard against: terminal aesthetics telegraph measured fact. Our headline number is an unvalidated ranking. The design's job is to be persuasive about the workflow and honest about the model, at the same time, in the same view.

Path C is this principle's first structural expression: the tier is a hybrid because the data forced it, and the copy says so rather than dressing it as a rule.

*v1.1: added the Path C sentence; source: prompt 05 §1, Round 1.1 §1.*

---

## 2. Registers

One system, three registers. The spine is shared; the rhythm changes.

| | Workbench | Report | Email |
|---|---|---|---|
| Surface | Landing, table, case file, queue aggregate view | Reasoning report (PDF/print) · Methodology page | Weekly digest (Outlook) |
| Stock | `--canvas` dark | White | White |
| Fonts | Space Grotesk / Inter / IBM Plex Mono | Same three families | Arial / Courier New (email-safe cousins) |
| Density | Dense, 44px cells | ~66ch measure, wide leading | Single column, 600px |
| Severity encoding | Word + weight + ramp color | Word + weight; color as accent, grayscale-safe | Word + weight only; color may vanish |
| Images/charts | Full | Static SVG exhibits | None, ever. Link instead |
| Interaction | Full | Superscript exhibit letters replace links | Links deepen, never complete |

**Shared spine (never diverges):** numeric formatting, tabular figures, percentile-never-percent, tier vocabulary, the Critical definition, provenance labels, driver ordering, caveat wording, and every actual value. The report and digest are projections of the workbench, never second sources.

*v1.1: added methodology page (Report register) and queue aggregate view (Workbench, a queue render mode, not a new surface); source: 02 verdict, Gate A note 3.*

---

## 3. Tokens

### 3.1 Color

Severity ramp. Data only. Nothing else may use these hues.

```
--low:        #4C8A68
--med:        #D19A3D
--high:       #E05545
--crit:       #C22B1F   (tick widens 3px -> 5px)
--uncertain:  #7A828D   (tick renders dashed)
```

Workbench neutrals.

```
--canvas:         #0C0F13
--canvas-raised:  #12161C
--bench-line:     #232A33
--bench-text:     #E6E8EB
--bench-muted:    #8A919C
```

Report/email stock.

```
paper (spec docs): #F8F8F6    sheet (report): #FFFFFF
ink: #17181A / #1A1B1E        ink-muted: #6C6F75 / #75787E
hairline: #DDDDD8             email link blue: #1A56A0
```

Action accent. Actions only, never data, at most one per surface.

```
--action: #E87722   (ConEd orange; primary action per surface:
                     table = Generate report is NOT primary there,
                     case file = Generate reasoning report,
                     landing = Compose weekly digest)
```

### 3.2 Type

```
Space Grotesk  display only. Page titles, building addresses at case-file scale.
               Ties to the existing ConEd deck identity.
Inter          body, addresses in rows, prose.
IBM Plex Mono  all numerics, chips, eyebrows, event evidence, claim subs.
               font-variant-numeric: tabular-nums always.
Email fallbacks: Arial (prose), Courier New (numerics).
```

Key sizes: cell percentile 16/600 mono; tier word 10/600 caps +0.09em; chips 9/500 caps; eyebrows 9.5 to 11 caps +0.11em; claim-big 26/600 mono.

### 3.3 Numeric formatting

- Model score: portfolio percentile, ordinal form ("96th"). Never a percent sign. Never decimals.
- Percent sign is reserved for measured quantities: YoY deltas, coverage, GHG share.
- Money: full digits with commas ("$1,190,650"), never abbreviated in reports; "M kBtu" style units in dense tables.
- Ranks: "#4 of 1,210". Ties: "tied w/ 2" inline; large tie counts move to the inspector. Within the quasi-tie block, see L6 refinement (§6) and §5 score cell notes.
- Dates: vintage-first ("LL84 2025-05", "run Jul 6, 06:00"). Relative time is banned.

*v1.1: no token movement; rank/tie line cross-references the L6 quasi-tie refinement; source: Round 1.1 §2.3.*

---

## 4. Vocabulary

### 4.1 Tiers, the hybrid chain, and Critical

The tier vocabulary is exactly: **High / Medium / Low / Uncertain.**

**The tier is a hybrid, and every surface says so.** Assignment chain, per `compute_diagnostic_risk` (no code change under Path C):

1. Uncertain gates take priority: fewer than 2 years of steam data, NYCHA development with regression R² below 0.3, or missing ml_risk.
2. Base tier from ML probability cutoffs: below 0.2 Low, 0.2 to 0.6 Medium, 0.6 and above High.
3. Modifiers, each shifting one tier level: IQR outlier in either delta period +1, accelerating decline +1, decelerating decline −1, LL97 over-cap (2024 or 2030) +1.
4. Clamp to [Low, High].

Distribution facts the copy must not hide: 70% of non-Uncertain rows are modifier-shifted; 78% of final High (182 of 233) is modifier-promoted, 176 of those from base Low. The system is model-seeded and modifier-driven. The retired phrases are "rule-based tier," "transparent diagnostic rule," and "the method ConEd's own team uses" in tier contexts. The ledger column label is **"Tier · ML base + trend/statute modifiers"** (full form "model base" acceptable in pitch contexts only).

**Critical is not a fifth tier.** It is a composite queue state, defined as a conjunction:

> Critical = ml_risk ≥ 0.6 (the model's confident set, n=57) AND fresh '24 normalized delta present AND at least one trend modifier (IQR outlier in either period OR accelerating decline).

Population as of pipeline run 2026-07-01: **23 buildings** (top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St). LL97 over-cap is deliberately excluded from the modifier leg: the boolean carries 0.0000 feature importance while the log-scaled penalty is feature #1 at 0.2074, so the statute pressure is already encoded richly inside the model and the boolean adds double counting, not evidence. The defensible sentence: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year." Lose any leg and it demotes. Entering/leaving Critical is a nameable event. The definition is printed on the methodology page and restated inline in any artifact whose reader may not have seen that page (report finding band, digest finding paragraph).

*v1.1: replaced ml-free rule-based tier framing with the Path C hybrid chain and distribution facts; Critical redefined and computed; ledger label locked; LL97 boolean/log correction applied; sources: Round 1.1 §1, Ismael Q1/Q2/Q3, 02 prompt context.*

### 4.2 Workflow states

`Unreviewed -> In review -> Contacted -> Confirmed at-risk / False positive / Dismissed`

- Contacted: timestamped; suppresses re-queueing for the cooling-off window (length TBD, David).
- Confirmed / False positive: become training labels for the next model version.
- Dismissed: requires a stated reason.
- Storage: append-only events keyed by BBL (see §9, write path). Current state = latest event.

### 4.3 Event kinds (delta feed)

`TIER ^/v · PERMIT · DATA · STATUS · DIVERGE · MODEL`

One grammar: subject, verb, evidence, consequence. No event without a named trigger. DATA and DIVERGE events aggregate to one line per batch. **DIVERGE fires on a row becoming a two-tier promotion (base Low to final High), not on every base/final mismatch; it derives inline from the current run (base tier computed from ml_risk cutoffs), so it needs no snapshot diffing.** MODEL is reserved for version/validation changes (Phase 2).

*v1.1: DIVERGE semantics narrowed to two-tier promotions and marked diffing-free; sources: Round 1.1 §1.3, Ismael Q6.*

### 4.4 Provenance chips

```
XGB v1 · UNVAL      current: unvalidated ranking model (repo naming per Ismael)
XGB v2 · BT nn%     Phase 2: back-tested against ConEd disconnect records
                    (filled chip treatment; the number is back-test recall
                    against the >=70% intake benchmark)
LEGACY HEURISTIC    fallback rows without ml_risk; value slot shows "est."
                    (unreachable against current data; see §5 score cell)
```

**The chip never carries a numeric AUC.** The AUC appears in exactly two places, the case-file-header ledger and the methodology-page footer, and is always rendered from `model_meta.cv_auc` per §7 rule 8. Model-version text everywhere sources from `model_meta.model_version` per §7 rule 9.

**Transition from UNVAL to BT is not automatic on any internal metric.** The chip moves from `XGB v1 · UNVAL` to `XGB v2 · BT nn%` only after back-testing against ConEd disconnect records completes. Cross-validation AUC is a self-consistency check on the training universe and does not clear UNVAL; `model_meta.cv_auc` populating is not the trigger. Same discipline governs `model_meta.validation_status`: `"validated"` is set only when the back-test lands, not when the CV rerun does. Until then the field reads `"unvalidated"` and the chip carries `UNVAL`. This gates both fields together so §7 rule 9 and §8 rule 2 stay coherent at render time.

*v1.1: chip naming updated to XGB convention; verbatim AUC sentence replaced by the templated single-source rule; explicit no-AUC-in-chip rule added; sources: Round 1.1 §4, Ismael Q4/Q5, prompt 05 §4. v1.1.1: UNVAL→BT transition gate clarified after PR #11 review surfaced a read where CV completion was taken as validation (DECISIONS D7 fallout).*

### 4.5 Freshness chips

Four states, always naming the vintage of the newest normalized delta. Counts as of run 2026-07-01:

```
Δ '24 −34%          solid          fresh, 422 rows
Δ '23 only          dashed, muted  latest is '23 vintage, 321 rows
no adjacent-yr Δ    dashed, muted  years non-consecutive ('22 and '24 only), ~208 rows
(Uncertain)         dashed tick    handled by the tier, 254 rows
```

Absence of fresh signal is a designed state, never a bare dash, because stale is the majority case. A residual of ~5 rows is in an unnamed edge state pending Ismael (#22); chip copy does not lock until the four states plus residual sum to 1,210. Round 2 item #21 (`norm_delta_22_24`) collapses the no-adjacent-yr state when it lands.

*v1.1: three states became four with verified counts; residual flagged; sources: Round 1.1 §2.4, Ismael Q9, Gate A note 2.*

### 4.6 Modifier chips (queue and table filters)

Modifier prevalence surfaces as counted filter chips, named only for directly checkable facts, never model abstractions: `Outlier Δ · n`, `Accelerating · n`, `Modifier-promoted · 176`, `Critical · 23`. The count on a chip is the count of rows the chip opens; the two can never disagree because they are the same query. LL97 pressure, when surfaced at portfolio scale, renders as penalty-magnitude bands (dollar ranges from the penalty log), never as the over-cap boolean count.

**LL97 penalty bands (2030 caps) — canonical constant.** Any surface rendering LL97 pressure at portfolio or filtered-set scale draws the same five bands from one place: **Under 2030 cap · $1–50k · $50k–250k · $250k–1M · $1M+**. The field is `ll97_penalty_2030` (not 2024). The zero bucket is labeled "Under 2030 cap," not "$0," because the state — under statute — is what the band names; a computed $0 would be misread as "we computed and got zero." Consumers: queue aggregate view (§5), methodology page §4, future report exhibits. Implementation: `src/data/ll97Bands.js` exports the edges and `bandOf(penalty)`; no surface may inline its own edges.

*Provenance (v1.1, 2026-08-18):* Fable's §4.6 rule that LL97 must render as magnitude bands and never as the over-cap boolean is the origin of this constant — the design consultation that made codifying edges necessary. The specific edges were selected by Edwin against the current enrichment file rather than eyeballed: over 956 non-Uncertain rows on `ll97_penalty_2030`, the distribution is 300 / 228 / 245 / 135 / 48, with p50 ≈ $89k landing inside the middle band and p90 ≈ $645k inside the fourth — no empty band, no band swallowing the set. The same edges against `ll97_penalty_2024` collapse to 833/956 (87%) in the zero bucket because 2024 caps are loose; that's why the field is 2030. Round-number edges are chosen over quantile edges deliberately: quantiles redraw themselves on every pipeline run and make week-over-week comparison meaningless, which would violate M1's population-and-snapshot discipline. This matters because the aggregate view is where the analyst's mental model of statute exposure gets built — the $1M+ band (48 rows, 5%) is the "this conversation is now about statute exposure" tier, and its thinness has to be real, not an artifact of moving cuts.

*v1.1: new subsection; source: 02 verdict, Ismael Q3 LL97 correction; band constant + provenance added 2026-08-18 (Edwin, Fable §4.6 rule).*

---

## 5. Components

| Component | Defined in | Notes |
|---|---|---|
| Score cell | Spec 1 | The atom. 196 to 232px, two rows, tick + percentile + tier + chips. Six states: concordant-fresh, divergent, stale, uncertain, legacy, verified. **v1.1: S4 Uncertain is renderable today (254 rows, reason-coded, binds to `uncertain_reason` and `n_years_data`). S5 legacy stays flagged "unreachable against current data" (ml_risk 100% coverage). At case-file scale, rows in the ≥0.99 quasi-tie block (52 rows) render "among the top 52 by model score," not "#4 of 1,210"; percentile ordinal stays for cells outside the block.** |
| Severity tick | Spec 1 | 3px bar; 5px for Critical; dashed for Uncertain. Only place ramp color appears in a row. |
| Chip | Spec 1 | Mono 9/caps, 1px border. Dashed variant = stale/weak. Filled variant = verified. |
| Claim ledger | Spec 2 | Three columns: queue position, tier with its chain, coverage. Header of the case file; restyled as the report finding band. **v1.1: middle column labeled "Tier · ML base + trend/statute modifiers"; three variants for the fresh column (fresh Δ'24, latest Δ'23, no adjacent-yr Δ); AUC line templated per §7 rule 8.** |
| Driver row | Spec 2 | Rank, plain-language feature, real-world value with unit, diverging bar (direction by position, filled up / low-opacity down; outlined down in print), signed contribution. **v1.1: fully grounded (`ml_drivers` carries raw values); contributions shown as signed magnitudes without unit claims; `peer_score` label is non-causal ("share of cluster showing attrition signals, same period").** |
| Narrative slot | Spec 2 | Dashed frame, provenance line, review status, dotted-underline citations resolving to on-page claims. Becomes superscript exhibit letters in print. |
| Status segment | Spec 2 | Six workflow states, always visible on the case file, filterable everywhere. Read-only until the Q7 endpoint ships. |
| Modifier filter chips | Spec 4 + v1.1 | The 02 verdict's prevalence surface: counted chips per §4.6 on queue and table. Reuses the Spec 4 chipbtn component. Governed by W3/W4/M1/M3. |
| Queue aggregate view | v1.1 (Gate A note 3) | Toggle on the queue: List \| Aggregate. Renders the currently filtered rowset as count tiles, modifier co-occurrence pairs, and LL97 penalty-magnitude bands. Pure function of the visible rows; header states the active filter expression, row count, and run stamp; never displays a portfolio-scale baseline (those live in the pulse and methodology page). Default is List. Governed by W3 (as amended), W4, M1, M3. Milestone-worthy for the roadmap, sequenced after the queue ships. |
| Event row | Spec 4 | Kind tag, sentence with evidence, action link. |
| Queue row | Spec 4 | Score cell + address + one-line top driver + carry-over age + open link. |
| Portfolio pulse | Spec 4 | The only portfolio-scale aggregation. Stacked tier bar + WoW deltas + coverage + vintages. Quietest treatment on the page. |
| Report sheet | Spec 3 | Page-one argument: header block, finding band, cited narrative, exhibits A to D, method-in-brief, signature block. **v1.1: Exhibit D describes the §4.1 hybrid chain verbatim and references `ll97_penalty_2024_log` as the model-side encoding (the over-cap boolean is described only as the modifier); no cohort-shared callout (pattern research deferred); Exhibit B ships two lines (building + cap-equivalent) until a peer cohort is defined; method footer links the methodology page with its version stamp.** |
| Methodology page | v1.1 (02 verdict) | Report register, editorial, printable, linked from the landing footer, provenance chips, and report method footer. Nine sections: (1) what the tool claims and doesn't, (2) signal taxonomy: 12 features with importances from model_meta, (3) the tier chain, (4) modifier prevalence and co-occurrence with penalty-magnitude bands, (5) the Critical definition, (6) reading the score: compression, quasi-tie block, freshness states, (7) known limitations (tech-spec §7 four), (8) the ConEd framework and ours: Johan's five items as complementary signals with explicit "research pending" placeholders, (9) version and provenance block. Two clocks: sections 2/5/7 revise per model version; 4/9 regenerate per pipeline run; 8 backfills when the research track runs. Each section carries its own stamp. |
| Digest email | Spec 5 | Outlook-safe projection of the landing. Typographic only. |

*v1.1: substantive notes added to score cell, claim ledger, driver row, status segment, report sheet; three components added (modifier filter chips, queue aggregate view, methodology page); sources: Round 1.1 §2, Ismael Q3/Q7, 02 verdict, Gate A notes 1 and 3.*

---

## 6. Laws (index)

Score cell (Spec 1):
- L1 The model score never wears a percent sign.
- L2 Color belongs to the defensible claim. *v1.1 amendment: the defensible claim is redefined as "a documented procedure with named, checkable modifiers," not "an ML-free method."*
- L3 Divergence is marked, not hidden. *v1.1 amendment: the marker fires on two-tier promotions only (base Low to final High, n=176); one-tier shifts are routine and unmarked.*
- L4 Provenance is a versioned claim.
- L5 Absence of signal is a designed state.
- L6 Precision is never faked. *v1.1 refinement: within the ≥0.99 quasi-tie block (52 rows), ordering is noise; case-file scale renders block membership, not rank.*

Case-file header (Spec 2):
- H1 A ledger, not a hero.
- H2 Every claim shows its math.
- H3 Direction by position, not color.
- H4 Values over abstractions.
- H5 Generated text is labeled, cited, and editable.

Reasoning report (Spec 3):
- R1 Nothing appears here that isn't on the case file.
- R2 One page is the argument; page two is exhibits only.
- R3 Grayscale-safe by construction.
- R4 Caveats travel with claims.
- R5 A human signs it.

This Week landing (Spec 4):
- W1 Time is anchored to the pipeline and the analyst, never the clock.
- W2 No event without a named trigger.
- W3 One aggregation, and it agrees with the queue. *v1.1 amendment: the pulse remains the only portfolio-scale aggregation. The queue aggregate view is a render mode of the filtered rowset, not a second aggregation: every figure derives from exactly the visible rows, the header states the filter expression, row count, and run stamp, and portfolio-scale baselines never appear inside it.*
- W4 The queue does its arithmetic in public.
- W5 The week carries over.
- W6 Buttons first, command bar second.

Weekly digest (Spec 5):
- D1 The subject line carries the finding.
- D2 Complete without clicking.
- D3 Built like it's 2004.
- D4 Color never carries meaning.
- D5 Drafted, then owned.
- D6 A plain-text twin always ships.

Compose flow (Spec 5): C1 Draft (numbers injected, never generated) · C2 Edit (locked tokens) · C3 Send minimally (mailto/clipboard v1, no SMTP).

Portfolio-scale claims (methodology page, aggregate views, any counted claim at population scale) (v1.1):
- M1 Every count names its population and snapshot verbatim.
- M2 Model-version facts and run-date facts carry different provenance stamps and never share a sentence without both stamps.
- M3 No causal verbs at portfolio scale ("concentrated in," never "driven by").
- M4 Placeholders are explicit ("research pending"), never empty charts or invented examples.
- M5 The page is the single home of definitions; surfaces link rather than restate, except where a spec already mandates inline restatement (report finding band, digest finding paragraph).

*v1.1: L2/L3/L6 amended, W3 amended, M family added; sources: Round 1.1 §1/§2.3, 02 verdict, Gate A notes 1 and 3.*

---

## 7. Copy rules

- No em dashes anywhere in product copy. Use periods, commas, or restructure. Data strings inherited with em dashes (cluster names) render with a middle dot instead.
- Severity words are the encoding; write them so they survive alone in grayscale or plain text.
- Caveats are one sentence, specific, and adjacent to the claim they qualify. Never a legal paragraph, never a footnote.
- Relative timestamps are banned. Vintage or analyst-anchor only.
- Empty states state the evidence ("Pipeline ran Jul 6, 06:00. Nothing crossed a threshold.") and the carry-over. No apology, no sparkle.
- The digest finding paragraph is written in the project's recap style: specific, direct, output-oriented, light warmth, no filler tricolons.
- Generated prose never contains a number that wasn't injected from data.
- Rule 7: `risk` (legacy heuristic) never renders as a headline number; its only legal surface is the S5 fallback state.
- Rule 8: AUC copy is templated from `model_meta`, single source of truth. Interim: "validation rerun in progress." Post-rerun: "ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)."
- Rule 9: model version copy sources from `model_meta.model_version`, never hardcoded. Removes the drift class that produced the stale "GBM" strings at server.js:585 and :867.

*v1.1: rules 7, 8, 9 added; sources: Round 1.1 §2.2/§4, Ismael Q4/Q5/Q10.*

---

## 8. Data honesty rules (summary)

1. ml_risk is a ranking. Percentile display, no percent sign, no decimals, ties acknowledged. The distribution is strongly bimodal: below the ≥0.99 quasi-tie block, percentile gaps reflect very small score differences. This is stated once, on the methodology page, not as a per-surface caveat.
2. Provenance chip on every score. Model + validation status, never a numeric AUC. "Unvalidated" is written out until back-testing against ConEd disconnect records completes (§4.4); cross-validation does not clear this state.
3. The tier is the defensible claim as a documented procedure: ML base plus named, checkable modifiers. It gets the color and the word, and its chain is shown wherever the tier is asserted at case-file scale or beyond.
4. Freshness always rendered; stale is the designed majority state, in four named states (§4.5).
5. The LL97 penalty is statute arithmetic and is labeled "not a model output." It is the strongest claim in the product; present it accordingly. At portfolio scale, LL97 pressure renders as penalty-magnitude bands, never the boolean count.
6. The strongest defensibility feature is a human signature. Reports and digests are drafted by the system and owned by the analyst.
7. Portfolio-scale claims obey the M family (§6): named populations, dual stamps, no causal verbs, explicit placeholders.

*v1.1: rule 1 gained the compression sentence, rule 3 reworded to the hybrid, rule 4 cross-references four states, rule 5 gained the bands clause, rule 7 added; sources: Round 1.1 §1/§2.3/§2.4, Ismael Q3, 02 verdict.*

---

## 9. Architecture notes the design depends on

- **`model_meta.json`:** pipeline-produced single source of truth, snake_case, written at the end of every `train_xgboost.py` run and every `update_enrichment_risk.py` run (unchanged params refresh `run_date` only). Fields: `model_name, model_version, params_hash, commit, cv_auc, cv_std, cv_kfold, n_labeled, n_positive, label_definition, run_date, validation_status`. Confirmed current values: n_labeled 1003, n_positive 54, cv_kfold 5, label_definition "≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023"; cv_auc/cv_std pending the Q4 rerun. Read by the API and every UI surface via §7 rules 8 and 9.
- **Write path:** append-only status events keyed by BBL, in **Postgres on Railway** (Ismael Q7, ~2 days), POST /api/buildings/:bbl/status behind requireAuth; `actor` = session token for now, aliasable to a name later. Current state = latest event. **This endpoint also retires the in-memory watchlist Map at server.js:314; /api/watchlist/save and /load migrate to the same table.** Copy must not pretend per-analyst identity exists until it does.
- **Snapshot diffing:** before each pipeline run, current `buildingEnrichment.json` copies to `buildingEnrichment_prev.json` on the same volume; end of run, diff by address key across `diagnostic_risk`, `ll97_over_2024/2030`, `dob_jobs`, emitting `events.json` (Ismael Q6, ~1 to 2 days). DIVERGE events derive inline from the current run and need no diffing.
- **Data decoupled from deploy:** deferred to a follow-up sprint (Ismael Q8, highest operational risk). Demo workaround: the freshness chip and topbar anchor read `model_meta.run_date`, written per run even while JSONs stay container-baked. The discipline is preserved without the infrastructure; refresh still means redeploy until decoupling lands.
- **Cadence:** design is cadence-agnostic (the analyst anchor absorbs any run frequency). Recommended: scheduled weekly run now; daily permit ingestion later; monthly billing cycle becomes the heartbeat in Phase 2.
- **Report persistence:** report IDs (RR-YYYY-NNNN) and BBL-keyed routes must survive redeploys. Emails are forever; the URLs in them must be too.

*v1.1: model_meta object specified with confirmed values; write path locked to Postgres and absorbs watchlist; diffing mechanism per Q6; decoupling deferred with the run_date workaround; sources: Ismael Q5/Q6/Q7/Q8, Round 1.1 §2.6.*

---

## 10. Open questions ledger

| # | Question | Owner | Status | Blocks |
|---|---|---|---|---|
| 1 | Coverage reconciliation: what vintage feeds most tiers | Ismael | Resolved: base tier is vintage-free (ml_risk); modifiers consume '22/'23/'24 flags where present; freshness states carry the vintage (Round 1.1 §2.4, Path C) | — |
| 2 | Divergent (S2) population size | Ismael | Resolved: two-tier promotions, n=176, filter chip (Round 1.1 §1.3) | — |
| 3 | Tie counts at the top of the ranking | Ismael | Resolved: 2 exact ties; 52-row quasi-tie block; L6 refinement (Round 1.1 §2.3) | — |
| 4 | Snapshot diffing home | Ismael | Scoped: pipeline-side, prev-file on volume, ~1 to 2 days (Q6); open until built | Delta feed, events.json |
| 5 | Critical definition sign-off | David | Revised: sign-off requested on v1.1 as defined in §4.1 (23 buildings); Ismael has signed off (Q3) | Queue, alerts, report finding band |
| 6 | Chip vocabulary legibility (UNVAL, BT %) | David | Open | Provenance chips in client-facing artifacts |
| 7 | Digest cadence, recipients, format preference | David | Open | Digest ship; D6 makes format low-stakes |
| 8 | Cooling-off window length after Contacted | David | Open | Queue suppression, TIER-down events |
| 9 | Territory gating for reports and digest | David | Open | Distribution, later |
| 10 | Report review enforcement: DRAFT watermark (recommended) vs hard gate | Team | Open | Report finalize flow (R5) |
| 11 | Write path scope and store choice | Pedro | Resolved: Postgres, append-only, ~2 days, absorbs watchlist (Q7) | Workflow states, W5, last-review anchor |
| 12 | PDF generation: Puppeteer against print stylesheet (recommended) vs PDF lib | Pedro/Ismael | Open | Report shipping |
| 13 | Peer-median cohort definition for Exhibit B and case-file chart | Ismael | Open; Exhibit B ships two lines until defined | Chart captions, cross-register match |
| 14 | Locked-token editing spike for digest compose | Team | Open; fallback is plain textarea | C2 |
| 15 | Tier binding decision (Path A/B/C) | Team | Resolved: Path C, no code change (Q1) | — |
| 16 | High-risk count reconciliation (52/57/58/59) | Ismael | Resolved: 57 is the current model's base-High count; others documented as prior vintages (Round 1.1 §1) | — |
| 17 | Pipeline stamps run date + model_meta | Ismael | Resolved: field list confirmed, snake_case, dual writers (Q5) | — |
| 18 | Portfolio top-signals artifact home | Edwin | Resolved: modifier filter chips + methodology page §2/§4 (02 verdict) | — |
| 19 | Watchlist persistence | Pedro | Absorbed by #11/Q7 endpoint | — |
| 20 | server.js:867 likelihood phrasing + :585 model name | Pedro | Scoped: bundled with model_meta rollout, full chatbot-answer rewrite (Q10, §7 rule 9) | — |
| 21 | `norm_delta_22_24` for the ~208 non-consecutive rows | Ismael | Deferred: Round 2 (Q9); collapses a freshness state when done | — |
| 22 | Freshness residual: ~5 rows in an unnamed edge state (four states sum to 1,205) | Ismael | Open: name it before chip copy locks; rides with the Q4 AUC rerun this week | Freshness chip copy lock, W4 sum discipline |

*v1.1: ledger reconciled; statuses added; #15 to #22 folded in; sources: Round 1.1 §5, Ismael Q1 to Q10, 02 verdict, Gate A note 2.*

---

*Maintenance rule: any new surface starts by declaring which register it belongs to and which laws it inherits, and adds laws only for what is genuinely new. If a proposed element violates a law, the law wins until this file is amended deliberately.*
