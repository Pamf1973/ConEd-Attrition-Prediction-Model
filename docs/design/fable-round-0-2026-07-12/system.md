# ConEd Steam Attrition · Design System

Version 0.1 · 2026-07-06
Extracted from the atom series: Spec 1 (score cell), Spec 2 (case-file header), Spec 3 (reasoning report), Spec 4 (This Week landing), Spec 5 (weekly digest).
This file is the single source of truth for tokens, vocabulary, laws, and copy rules. If a spec and this file disagree, fix one of them in the same commit.

---

## 1. Voice

Bloomberg Terminal that explains itself, with one amendment learned in critique: **every number wears its confidence.** The seriousness and monospace density of a professional workbench, the button-first discoverability a weekly-cadence analyst actually needs, and AI embedded inside the primary object rather than beside it. Every recommendation carries its methodology in the same view, and every score displays its epistemic state: provenance, validation status, freshness, and coverage are first-class visual citizens, not implementation details.

The register presumption to guard against: terminal aesthetics telegraph measured fact. Our headline number is an unvalidated ranking. The design's job is to be persuasive about the workflow and honest about the model, at the same time, in the same view.

---

## 2. Registers

One system, three registers. The spine is shared; the rhythm changes.

| | Workbench | Report | Email |
|---|---|---|---|
| Surface | Landing, table, case file | Reasoning report (PDF/print) | Weekly digest (Outlook) |
| Stock | `--canvas` dark | White | White |
| Fonts | Space Grotesk / Inter / IBM Plex Mono | Same three families | Arial / Courier New (email-safe cousins) |
| Density | Dense, 44px cells | ~66ch measure, wide leading | Single column, 600px |
| Severity encoding | Word + weight + ramp color | Word + weight; color as accent, grayscale-safe | Word + weight only; color may vanish |
| Images/charts | Full | Static SVG exhibits | None, ever. Link instead |
| Interaction | Full | Superscript exhibit letters replace links | Links deepen, never complete |

**Shared spine (never diverges):** numeric formatting, tabular figures, percentile-never-percent, tier vocabulary, the Critical definition, provenance labels, driver ordering, caveat wording, and every actual value. The report and digest are projections of the workbench, never second sources.

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
- Ranks: "#4 of 1,210". Ties: "tied w/ 2" inline; large tie counts move to the inspector.
- Dates: vintage-first ("LL84 2025-05", "run Jul 6, 06:00"). Relative time is banned.

---

## 4. Vocabulary

### 4.1 Tiers and Critical

Diagnostic rule yields exactly: **High / Medium / Low / Uncertain.**

**Critical is not a fifth tier.** It is a composite queue state, defined as a conjunction:

> Critical = rule tier High AND fresh '24 normalized delta present AND top-decile ML rank.

All three must hold. Lose any leg and it demotes to High. Consequences: staleness auto-demotes; the definition sizes the Monday queue by construction; entering/leaving Critical is a nameable event ("third condition newly met"). The definition is printed on the methodology page and restated inline in any artifact whose reader may not have seen that page (report finding band, digest finding paragraph).

### 4.2 Workflow states

`Unreviewed -> In review -> Contacted -> Confirmed at-risk / False positive / Dismissed`

- Contacted: timestamped; suppresses re-queueing for the cooling-off window (length TBD, David).
- Confirmed / False positive: become training labels for the next model version.
- Dismissed: requires a stated reason.
- Storage: append-only events keyed by BBL (see Laws, write path). Current state = latest event.

### 4.3 Event kinds (delta feed)

`TIER ^/v · PERMIT · DATA · STATUS · DIVERGE · MODEL`

One grammar: subject, verb, evidence, consequence. No event without a named trigger. DATA and DIVERGE events aggregate to one line per batch. MODEL is reserved for version/validation changes (Phase 2).

### 4.4 Provenance chips

```
GBM v1 · UNVAL      current: unvalidated ranking model
GBM v2 · BT 74%     Phase 2: back-tested against ConEd disconnect records
                    (filled chip treatment; the number is back-test recall
                    against the >=70% intake benchmark)
LEGACY HEURISTIC    fallback rows without ml_risk; value slot shows "est."
```

The AUC translation, verbatim wherever it appears: "ranks a true churner above a non-churner about 65% of the time." Consistency of the caveat is what makes it credible.

### 4.5 Freshness chips

Always name the vintage of the newest normalized delta: `Δ '24 −34%` (solid) or `Δ '23 only` (dashed, muted). Absence of fresh signal is a designed state, never a dash, because it is the majority case (~65% of portfolio).

---

## 5. Components

| Component | Defined in | Notes |
|---|---|---|
| Score cell | Spec 1 | The atom. 196 to 232px, two rows, tick + percentile + tier + chips. Six states: concordant-fresh, divergent, stale, uncertain, legacy, verified. |
| Severity tick | Spec 1 | 3px bar; 5px for Critical; dashed for Uncertain. Only place ramp color appears in a row. |
| Chip | Spec 1 | Mono 9/caps, 1px border. Dashed variant = stale/weak. Filled variant = verified. |
| Claim ledger | Spec 2 | Three columns: queue position, rule tier with threshold math, coverage. Header of the case file; restyled as the report finding band. |
| Driver row | Spec 2 | Rank, plain-language feature, real-world value with unit, diverging bar (direction by position, filled up / low-opacity down; outlined down in print), signed contribution. |
| Narrative slot | Spec 2 | Dashed frame, provenance line, review status, dotted-underline citations resolving to on-page claims. Becomes superscript exhibit letters in print. |
| Status segment | Spec 2 | Six workflow states, always visible on the case file, filterable everywhere. |
| Event row | Spec 4 | Kind tag, sentence with evidence, action link. |
| Queue row | Spec 4 | Score cell + address + one-line top driver + carry-over age + open link. |
| Portfolio pulse | Spec 4 | The only aggregation. Stacked tier bar + WoW deltas + coverage + vintages. Quietest treatment on the page. |
| Report sheet | Spec 3 | Page-one argument: header block, finding band, cited narrative, exhibits A to D, method-in-brief, signature block. |
| Digest email | Spec 5 | Outlook-safe projection of the landing. Typographic only. |

---

## 6. Laws (index)

Score cell (Spec 1):
- L1 The model score never wears a percent sign.
- L2 Color belongs to the defensible claim.
- L3 Divergence is marked, not hidden.
- L4 Provenance is a versioned claim.
- L5 Absence of signal is a designed state.
- L6 Precision is never faked.

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
- W3 One aggregation, and it agrees with the queue.
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

---

## 7. Copy rules

- No em dashes anywhere in product copy. Use periods, commas, or restructure. Data strings inherited with em dashes (cluster names) render with a middle dot instead.
- Severity words are the encoding; write them so they survive alone in grayscale or plain text.
- Caveats are one sentence, specific, and adjacent to the claim they qualify. Never a legal paragraph, never a footnote.
- Relative timestamps are banned. Vintage or analyst-anchor only.
- Empty states state the evidence ("Pipeline ran Jul 6, 06:00. Nothing crossed a threshold.") and the carry-over. No apology, no sparkle.
- The digest finding paragraph is written in the project's recap style: specific, direct, output-oriented, light warmth, no filler tricolons.
- Generated prose never contains a number that wasn't injected from data.

---

## 8. Data honesty rules (summary)

1. ml_risk is a ranking. Percentile display, no percent sign, no decimals, ties acknowledged.
2. Provenance chip on every score. Model + validation status. "Unvalidated" is written out until Phase 2 back-testing says otherwise.
3. Rule tier is the defensible claim; it gets the color and the word. Its threshold math is shown wherever the tier is asserted at case-file scale or beyond.
4. Freshness always rendered; stale is the designed majority state.
5. The LL97 penalty is statute arithmetic and is labeled "not a model output." It is the strongest claim in the product; present it accordingly.
6. The strongest defensibility feature is a human signature. Reports and digests are drafted by the system and owned by the analyst.

---

## 9. Architecture notes the design depends on

- **Write path:** append-only status events keyed by BBL, in a real store (Postgres or SQLite on a volume), POST /api/buildings/:bbl/status behind requireAuth. First stateful feature; forces the persistence decision. Actor identity is a shared token today; copy must not pretend per-analyst identity exists until it does.
- **Snapshot diffing:** the delta feed requires keeping pipeline run N−1 and diffing at the end of the pipeline, emitting events.json. Owner: Ismael.
- **Data decoupled from deploy:** prerequisite for any on-demand refresh. JSONs move from baked-into-container to a volume or DB the API reads at request time. Until then, "data current as of run X" is the honest UI and refresh means redeploy.
- **Cadence:** design is cadence-agnostic (the analyst anchor absorbs any run frequency). Recommended: scheduled weekly run now; daily permit ingestion later; monthly billing cycle becomes the heartbeat in Phase 2.
- **Report persistence:** report IDs (RR-YYYY-NNNN) and BBL-keyed routes must survive redeploys. Emails are forever; the URLs in them must be too.

---

## 10. Open questions ledger

| # | Question | Owner | Blocks |
|---|---|---|---|
| 1 | Coverage reconciliation: diagnostic_risk at 100% vs norm_delta_23_24 at 35%. What vintage feeds most tiers? | Ismael | Freshness chip, tier honesty |
| 2 | Divergent (S2) population size | Ismael | Divergence marker vs dedicated filter; DIVERGE event batching |
| 3 | Tie counts at the top of the ranking | Ismael | Tie display threshold (L6) |
| 4 | Snapshot diffing home (pipeline vs API) | Ismael | Delta feed, events.json |
| 5 | Critical definition sign-off (as specified in 4.1) | David | Queue, alerts, report finding band |
| 6 | Chip vocabulary legibility (UNVAL, BT %) | David | Provenance chips in client-facing artifacts |
| 7 | Digest cadence, recipients, format preference | David | Digest ship; D6 makes format low-stakes |
| 8 | Cooling-off window length after Contacted | David | Queue suppression, TIER-down events |
| 9 | Territory gating for reports and digest | David | Distribution, later |
| 10 | Report review enforcement: DRAFT watermark (recommended) vs hard gate | Team | Report finalize flow (R5) |
| 11 | Write path scope and store choice | Pedro | Workflow states, W5, "last review" anchor |
| 12 | PDF generation: Puppeteer against print stylesheet (recommended) vs PDF lib | Pedro/Ismael | Report shipping |
| 13 | Peer-median cohort definition for Exhibit B and case-file chart | Ismael | Chart captions, must match across registers |
| 14 | Locked-token editing spike for digest compose | Team | C2; fallback is plain textarea |

---

*Maintenance rule: any new surface starts by declaring which register it belongs to and which laws it inherits, and adds laws only for what is genuinely new. If a proposed element violates a law, the law wins until this file is amended deliberately.*
