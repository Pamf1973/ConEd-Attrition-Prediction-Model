# Edwin — Domain / Composition Brief (self)

**From:** Edwin (for future-me and anyone reading over my shoulder)
**Date:** 2026-07-14
**Purpose:** My milestone-by-milestone brief. Ismael owns backend; Pedro owns frontend. I own domain content, copy, the report, the methodology page, the digest, and the David packet. This file is the shim between my head, `system-v1.1.md`, `docs/ref/2026-07-16_fable-roadmap.md`, and the codebase (`CLAUDE.md`).

**Read first, before writing anything:**
- `system-v1.1.md` — voice, laws, copy rules (§7 rules 8/9 especially), §4.1 hybrid chain, §5 components table
- `docs/ref/2026-07-16_fable-roadmap.md` — full milestone list; my ownership is M1 (paired), M4 (paired, Pedro leads), M5 (I lead), M10 (I own), M12 (I lead), plus the David packet
- `docs/ref/2026-07-16_methodology-alignment.md` — Johan/Ildi five items, feeds M10 §8
- `docs/ref/2026-07-13_ismael-q1-q10-response.md` — Q1–Q10, the ground truth for numbers
- `CLAUDE.md` — repo layout, file map, legacy discipline

Everything below quotes acceptance criteria verbatim from those docs. Where a rule number appears (L1, W3, §7 rule 8, M1-family, etc.), the canonical text is in `system-v1.1.md` — do not paraphrase.

---

## My milestones at a glance

| Milestone | What I ship | Depends on | Pair with |
|---|---|---|---|
| M1 | Chatbot answer rewrite copy (for `server.js:867`) | nothing | Ismael (wires it) |
| M4 | Ledger + caveat copy strings | M3, M1 | Pedro (build lead) |
| M5 | Report content, template, exhibit copy (**I lead**) | M4, M1 | Pedro (print stylesheet + PDF) |
| M10 | Methodology page — nine sections | M1 (§2 importances, §9 stamps) | — (I lead, self-contained) |
| M12 | Digest content, templates, finding paragraph (**I lead**) | M9, M5, M1 | Pedro (compose UI) |
| David packet | Ledger items #5–10 answered by David | parallel to M1–M5 | Ismael Q3 signed off internally on #5 |

Do them roughly in this order. **M1 first — the chatbot copy is small but it's the single L1 violation still shipping.** M10 can start anytime after M1 lands (content authoring doesn't block on Pedro). M4/M5 copy needs to be ready when Pedro reaches those milestones — don't be the bottleneck. M12 waits for M9.

---

## M1 (paired with Ismael): chatbot answer rewrite

**Spec source:** `system-v1.1.md` §7 rules 8/9, L1, ledger #20; `docs/ref/2026-07-13_ismael-q1-q10-response.md` Q10.

### What I ship

The rewritten FAQ answer that Ismael pastes into `api/server.js:867`. This is the answer the chatbot returns when a user asks about `ml_risk`. **This is a full rewrite, not a string swap** (per Ismael Q10) — the existing answer references "GBM" (stale) and uses probability phrasing (violates L1).

### Requirements the rewrite must satisfy

- **L1:** no probability, no likelihood, no "81% chance" phrasing. `ml_risk` is a ranking, not a probability. Percentile ordinal is the only legal frame.
- **§7 rule 8:** any AUC reference is templated from `model_meta.cv_auc`. Interim: "validation rerun in progress." Post-M2: `"ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)."`
- **§7 rule 9:** model version reference is `model_meta.model_version` templated, never hardcoded. No "GBM" string anywhere.
- **§4.1:** if the answer touches the tier at all, name the hybrid honestly — "the tier is a hybrid: ML base plus named modifiers." Do not sell it as an ML-free rule.
- **Voice (§1):** persuasive about the workflow, honest about the model, in the same sentence.
- **Copy rules:** no em dashes, no relative timestamps, no filler tricolons.

### Drafting note

The chatbot is legacy per `roadmap-supplement-m0.md` — but the endpoint is shared. Writing this answer well matters because it renders in the demo hedge and because it's the one production string still violating L1. Draft it, hand it to Ismael, verify he pastes verbatim.

### Files I touch

- No code. I ship a text block. Ismael pastes it into `api/server.js:867`.
- Consider adding a comment near the line: `// M1: sourced from Edwin, templated on model_meta per §7 rules 8/9`

### Branch

`edwin/M1-chatbot-answer` (a docs branch with the copy block, referenced in Ismael's PR; or hand off inline in Slack)

---

## M4 (paired, Pedro leads): ledger + caveat copy

**Spec source:** `system-v1.1.md` §5 (claim ledger, driver row, narrative slot), §4.1, §7 rules 8/9; `docs/ref/2026-07-16_fable-roadmap.md` M4.

### What I ship

The strings that fill Pedro's case-file header component. Pedro owns the component structure; I own every string that appears in it.

### Strings I write

**Claim ledger middle column** — full three-row block, per §5 claim ledger note:

- Row 1 (header): **"Tier · ML base + trend/statute modifiers"** (locked per Ismael Q2, `system-v1.1.md` §4.1)
- Row 2 (chain summary, per building): dynamic template — see §Chain template below
- Row 3 (AUC line): §7 rule 8 template, interim "validation rerun in progress" until M2 lands

**Chain template (per building), assembled from record fields:**

```
"{base_tier} → {modifier_stack} → {final_tier}"
where:
  base_tier = "Low" if ml_risk < 0.2, "Medium" if 0.2 ≤ ml_risk < 0.6, "High" if ≥ 0.6
  modifier_stack = comma-joined list of active modifiers (each ±1):
    "outlier Δ '23–'24" (if outlier_23_24)
    "outlier Δ '22–'23" (if outlier_22_23)
    "accelerating decline" (if decline_trend_label == "accelerating")
    "decelerating decline" (if decline_trend_label == "decelerating")  # -1
    "LL97 over-cap 2024" (if ll97_over_2024)
    "LL97 over-cap 2030" (if ll97_over_2030)
  final_tier = diagnostic_risk (already computed, unchanged code per Q1)
```

Example rendered: `"Low → outlier Δ '23–'24, LL97 over-cap 2024 → High"`

**Coverage column strings (per §5 claim ledger, three fresh-column variants):**

- Variant A: `"Δ '24: {norm_delta_23_24}%  ·  fresh"` — solid chip, `norm_delta_23_24` present
- Variant B: `"Δ '23 only: {norm_delta_22_23}%  ·  latest '23"` — dashed chip, no `norm_delta_23_24`
- Variant C: `"no adjacent-yr Δ  ·  '22 and '24 present"` — dashed chip, non-consecutive
- Variant D (S4 Uncertain): rendered via `uncertain_reason` field — no template from me, bind to the field

**Diagnostic add-ons (coverage column, when present):**
- Decline trend label: `"decline trend: {decline_trend_label}"` (only render if not null)
- NYCHA R² (only when `building_regression_results.json` has this BBL): `"NYCHA regression R² = {r2_value}"`
- `peer_score` label (non-causal, locked per §5 driver row): `"share of cluster showing attrition signals, same period"`

**Quasi-tie block string (L6 refinement):**
When `ml_risk ≥ 0.99` (52 rows), the identity block reads:
`"among the top 52 by model score"` — not "#4 of 1,210."
Outside the block, percentile ordinal is fine: `"{percentile}th by model score"`.

**Narrative slot placeholder (M4 empty state):**
`"Drafting arrives with the report milestone."` — one line, in the dashed frame, mono 10/500 muted. Provenance line renders `model_meta.model_version` + `validation_status`. Do not put anything else in the slot until M5.

**Status segment (read-only) labels:**
Per §4.2 vocabulary: `Unreviewed`, `In review`, `Contacted`, `Confirmed at-risk`, `False positive`, `Dismissed`. Sentence case. Read-only chip treatment until M6 endpoint ships. **No affordance suggests interactivity.** Add caption below the segment: `"Status writes arrive with the workflow endpoint."`

### Do not

- Do not paraphrase §4.1. Every tier surface uses the hybrid chain verbatim per row 1 of the ledger.
- Do not label `peer_score` causally. It is a cluster-membership statistic. `"share of cluster showing attrition signals, same period"` — locked.
- Do not write a caveat longer than one sentence (§7 copy rule).
- Do not use "rule-based," "transparent diagnostic rule," or "the method ConEd's own team uses" in any tier context (§4.1 retired phrases).

### Files I touch

- No code. I ship a copy sheet: `docs/copy/M4-case-file-header-copy.md` (or a table in Slack — but write it down, don't stay verbal).

### Branch

`edwin/M4-case-file-copy` (paired PR with `pedro/M4-case-file-header`)

---

## M5 (I lead): reasoning report

**Spec source:** `system-v1.1.md` §5 report sheet row, Spec 3 HTML atom, §7 rules 8/9, §4.1, R1-R5 laws; `docs/ref/2026-07-16_fable-roadmap.md` M5.

### What I ship (content lead)

Everything that renders on the report page. Pedro owns the print stylesheet and PDF mechanics. I own the argument.

**The report has:**
- Finding band (top)
- Grounded-template narrative with exhibit citations
- Exhibits A–D
- Method footer
- Signature block with DRAFT watermark

### Acceptance criteria (from `docs/ref/2026-07-16_fable-roadmap.md` M5, verbatim)

- **R1** — every value matches the case file to the digit. If the case file says `Δ '24 -34%`, the report says `Δ '24 -34%`. Not "roughly 34%," not "about a third."
- **R2** — page one is the argument, page two is exhibits only. Pedro's print stylesheet enforces the break; I structure the content so it naturally lands that way.
- **R3** — grayscale-safe. Every claim survives black-and-white print. I stress-test this by removing color from my content mentally before shipping.
- **R4** — caveats travel with claims. If I write "the model puts this in the top 5%", the caveat about validation status is in the next sentence, not a footnote.
- **R5** — Prepared-by + Reviewed fields; DRAFT watermark until review confirmed.
- **Exhibit D describes the §4.1 hybrid chain verbatim** and references `ll97_penalty_2024_log` as the model-side encoding, the boolean **only** as the modifier (per Ismael Q3's LL97 correction).
- **Exhibit B renders two lines** (building + cap-equivalent), no peer line (ledger #13 open).
- **Narrative is deterministic templating over grounded slots only, no free-form LLM prose.** Every number cites an exhibit.
- **Method footer links the methodology page** with its version stamp and renders §7 rules 8/9 fields.

### Finding band (top of page one)

Structure (one paragraph, ~3 sentences):

1. Subject: address + BBL. Claim: `diagnostic_risk` tier + the compressed chain from M4's ledger. Number: percentile ordinal (or "among the top 52" if in quasi-tie block).
2. Evidence: the strongest modifier that fired, with its real-unit value from `ml_drivers`.
3. Consequence: recommended next action (from `recommendedAction` in `useBuildings.js`).

**The Critical definition restates inline** if this building is Critical (per §4.1: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year"). Otherwise the definition lives only on the methodology page.

### Exhibits (page two)

- **Exhibit A: Score & tier trace.** Table of building's scores across model runs (once we have history — Phase 2). For now: single row, current run. `ml_risk`, `diagnostic_risk`, base tier, modifiers fired. Cite this from finding band claim #1.
- **Exhibit B: Steam usage vs cap-equivalent, two-year window.** Two lines: building's actual steam, LL97 cap threshold (as steam-equivalent). No peer cohort line — ledger #13 is still open. **This is a static SVG, not an interactive chart** (Report register: images/charts are static per §2 registers table).
- **Exhibit C: Driver contributions.** Table of `ml_drivers` (top 5) with plain-language labels, real-unit values, signed contributions. Same rows as case-file driver band, restyled for print. Cite this from finding band evidence sentence.
- **Exhibit D: The hybrid chain (§4.1 verbatim).** Table showing: base tier from `ml_risk` cutoff, modifiers with checkable data, final clamped tier. **Names `ll97_penalty_2024_log` as feature #1 in importance (0.2074) and calls out that the over-cap boolean carries 0.0000 importance** — so the boolean is used only as a ±1 modifier, not as evidence of statute pressure inside the model.

### Method footer

Two blocks:

**Block 1 (model provenance, §7 rule 9):**
```
Model: {model_meta.model_version}  ·  Validation: {model_meta.validation_status}
Trained on {model_meta.n_labeled} labeled buildings ({model_meta.n_positive} positive).
{§7 rule 8 sentence, templated from model_meta.cv_auc}
```

**Block 2 (link + version stamp):**
```
Methodology: see /methodology (version {model_meta.model_version}, last generated {model_meta.run_date}).
```

### Narrative template (grounded)

Free-form LLM prose is banned in the report. The narrative is a deterministic template with grounded slots. Slot inventory:

```
{ADDRESS} at {IDENTITY_ROW_DETAILS} — {TIER_WORD} tier as of {RUN_DATE}.
{BASE_TIER_SLOT}. {MODIFIERS_ACTIVE_SLOT}. {FRESHNESS_SLOT}.
{DIVERGENCE_CALLOUT if two-tier promotion else ""}
{TOP_DRIVER_SLOT with value + contribution + exhibit cite}
{CRITICAL_MEMBERSHIP_SLOT if in Critical else ""}
{RECOMMENDED_ACTION_SLOT}
```

Each slot has a fixed template with numbers injected from data. **Never generate a number in prose that wasn't injected.** (§7 copy rule; C1 later applies to digest too.)

### Signature block

```
Prepared by: {analyst_name}    Prepared: {timestamp}
Reviewed by: {reviewer_name}   Reviewed: {timestamp or "pending"}
DRAFT (watermark) — remains until Reviewed field populates
```

Ledger #10 open: DRAFT watermark vs hard gate. **Recommendation:** watermark, not hard gate. The report is legal to send in DRAFT state; it just carries the visual mark. Confirmed via David packet (see below).

### Files I touch

- New: `docs/copy/M5-report-content-template.md` — full copy sheet with slots, exhibit tables, method footer strings
- New: `docs/copy/M5-narrative-template.md` — slot inventory + templates for each slot
- Pedro creates: `src/pages/ReportPage.jsx`, `src/styles/report-print.css`, optional `api/pdf.js`

### Do not

- Do not write free-form LLM prose anywhere in the report.
- Do not caption Exhibit B with a peer cohort until ledger #13 closes.
- Do not fake precision. Percentile ordinal outside quasi-tie block; "among the top 52 by model score" inside it.
- Do not use color to encode severity in the report — grayscale-safe (R3). Word + weight only.
- Do not link out from the report except to the methodology page and the case file.

### Branch

`edwin/M5-report-content` (paired PR with `pedro/M5-report-print-stylesheet`)

---

## M10 (I own): methodology page

**Spec source:** `system-v1.1.md` §5 methodology page row, M1-M5 laws (portfolio-scale), §4.1, §4.5, §4.6, §7, `docs/ref/2026-07-16_methodology-alignment.md` §4; `docs/ref/2026-07-16_fable-roadmap.md` M10.

### What I ship

Nine-section page, Report register, editorial and printable. Linked from the landing footer, provenance chips, and report method footer. **No one else touches this.** I author the content; Pedro drops it into a component (or MDX file — pick a format and stick with it).

### Acceptance criteria (from `docs/ref/2026-07-16_fable-roadmap.md` M10, verbatim)

- M1 to M5 laws hold: named populations with snapshots, dual stamps for model-version vs run-date facts, no causal verbs, explicit "research pending" placeholders in §8, definitions live here and surfaces link.
- §3 is the §4.1 chain verbatim.
- §5 is the Critical definition with the 23 buildings.
- §6 carries the §8 rule 1 compression sentence (bimodal distribution + quasi-tie block).
- §7 carries the four tech-spec limitations.
- §8 implements methodology item 5 (complementary signals) per `docs/ref/2026-07-16_methodology-alignment.md` §4.
- Two clocks stamped per section: sections 2/5/7 revise per model version; 4/9 regenerate per pipeline run; 8 backfills when the research track runs. Each section carries its own stamp.

### Nine sections

**§1 — What the tool claims and doesn't.**
One paragraph. The tool is a ranked list of buildings by attrition risk. It is not a probability estimator, not a causal model, not a validated production system. Its role is triage: helping the ConEd steam team decide which buildings to review this week.

**§2 — Signal taxonomy: 12 features with importances from `model_meta`.**
Table of features + importances + plain-language labels. Feature #1 is `ll97_penalty_2024_log` (0.2074), then descend by importance. Regenerates per model version. Version stamp: `model_meta.model_version`.

**§3 — The tier chain.**
The §4.1 hybrid chain verbatim, no rewording:
> Uncertain gates first (fewer than 2 years, NYCHA R² < 0.3, missing ml_risk). Then base tier from ML cutoffs (< 0.2 Low, 0.2–0.6 Medium, ≥ 0.6 High). Then ±1 modifiers (IQR outlier either delta period +1; accelerating decline +1; decelerating decline −1; LL97 over-cap 2024 or 2030 +1). Clamp to [Low, High].

Distribution facts: 70% of non-Uncertain rows are modifier-shifted; 78% of final High (182 of 233) is modifier-promoted, 176 of those from base Low.

Version stamp: `model_meta.model_version`.

**§4 — Modifier prevalence and co-occurrence with penalty-magnitude bands.**
Per-modifier counts, co-occurrence pairs, LL97 rendered as penalty-magnitude bands (dollar ranges from `ll97_penalty_2024_log`), never the over-cap boolean count (§4.6). Regenerates per pipeline run. Run stamp: `model_meta.run_date`.

**§5 — The Critical definition (with the 23).**
Verbatim from §4.1:
> Critical = ml_risk ≥ 0.6 (the model's confident set, n=57) AND fresh '24 normalized delta present AND at least one trend modifier (IQR outlier in either period OR accelerating decline).

Named population: **23 buildings as of pipeline run 2026-07-01. Top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St.** LL97 excluded from the modifier leg deliberately (per Ismael Q3: boolean carries 0.0000 importance; the log-scaled penalty is feature #1 at 0.2074, so statute pressure is already inside the model; the boolean adds double counting).

The defensible sentence: "the model puts it with past churners, its actual usage trend independently corroborates, and the signal is from this year." Lose any leg and it demotes.

Version stamp: `model_meta.model_version`. Run stamp: `model_meta.run_date` (population count re-derives per run).

**§6 — Reading the score: compression, quasi-tie block, freshness states.**
- The distribution is strongly bimodal. Below the ≥0.99 quasi-tie block, percentile gaps reflect very small score differences. This is the §8 rule 1 compression sentence.
- The quasi-tie block: 52 rows at `ml_risk ≥ 0.99`. At case-file scale, we render "among the top 52 by model score" instead of a rank; percentile ordinal returns outside the block.
- Freshness states (§4.5, four states + residual): Δ '24 fresh (422), Δ '23 only (321), no adjacent-yr Δ (~208), Uncertain (254), residual (~5 pending M2 naming). Sums to 1,210.

Version stamp: `model_meta.model_version` (bimodality is a model property).

**§7 — Known limitations (four tech-spec limitations).**
1. **Label noise.** Positives are LL84 self-reports; a "churner" here is defined by a threshold, not by ConEd's actual disconnect records. Back-testing against those records is Phase 2 (v2).
2. **Weather normalization is citywide, not per-building.** We use NYC Central Park HDD/CDD, not per-building degree days. Johan/Ildi's methodology item 1 addresses this at ConEd — we ship it explicitly deferred (§8).
3. **Yearly resolution has only 2–3 degrees of freedom per building** for weather regression, which is why we ship the NYCHA 24-development regression as a proof of the target method, not portfolio-wide.
4. **The tier is hybrid, not learned.** Modifiers are stacked as ±1 shifts, not weighted. We accept this trade because the modifiers are directly checkable; but a fully learned tier is a Round 2 exploration.

Version stamp: `model_meta.model_version`.

**§8 — The ConEd framework and ours: complementary signals.**
This is the alignment doc's §4 comparison, written as the two-stances/where-they-meet argument. Follow `docs/ref/2026-07-16_methodology-alignment.md` §4 for the five methodology items:

1. **Per-customer weather-normalized usage regression** — Round 2 deferral. Ship: acknowledgment that our citywide HDD is the known weakness; NYCHA 24-development regression as the shipped exemplar of the target method; what unblocks each resolution level (Ismael feasibility read → NDA/billing pathway from David).
2. **Diagnostic metrics suite (6 metrics)** — partial ship. Case-file coverage column surfaces the fields that already exist (decline trend label, decline acceleration, regression R² where present). Full-usage baseline, HDD slope stability, slope-intercept sync, portfolio-wide R² all depend on item 1 landing. Table of "6 metrics × status" showing ~2 of 6 partially present.
3. **Uncertain tier aligned with regression fit** — partially converged. Our Uncertain gates include Johan's fit-based meaning where fit exists (NYCHA R² < 0.3) and years-based gate where no per-building fit can exist on public data. Round 2 extends fit-based gate portfolio-wide when item 1 lands.
4. **Rule-based tier assignment with empirical thresholds** — Round 2 deferral. We ship Path C honesty about our hybrid (§4.1 on every tier surface, Exhibit D in M5). One supersession to name: `docs/ref/2026-07-16_methodology-alignment.md` §8(g)'s dual-tier disagreement badge is not our DIVERGE class (DIVERGE is intra-hybrid: base vs modifiers within one method). True two-independent-methods disagreement becomes possible only when the Johan-style tier exists in Round 2. Also superseded: §3d's "81% probability" display language, killed by L1.
5. **Positioning as complementary signals** — ships now, as content, here and in M5's method footer. This is Johan's "repeatable pattern-based approach" answered at the positioning level pre-demo; the pattern-mining research track is named as the Round 2 engine behind it.

**Explicit "research pending" placeholders** per M4 law wherever an item isn't shipped. No empty charts. No invented examples.

Backfills when the research track runs. Stamp: "Last backfilled: {date or 'research pending'}."

**§9 — Version and provenance block.**
Full `model_meta.json` object rendered as a key-value table, plus:
- Repo commit hash
- Deploy date
- Last pipeline run
- Report register version (`system-v1.1.md` version)

Regenerates per pipeline run. Run stamp: `model_meta.run_date`.

### Do not

- Do not use causal verbs at portfolio scale ("driven by", "caused by"). "Concentrated in" is fine (M3).
- Do not restate the Critical definition on any surface other than the report finding band and digest finding paragraph (M5 law: definitions live here; surfaces link).
- Do not omit a section stamp. Every section has one, per the two-clocks discipline.
- Do not soften the tier-is-hybrid claim. §4.1 verbatim.
- Do not mix model-version facts and run-date facts in the same sentence without both stamps (M2 law).

### Files I touch

- New: `src/pages/Methodology.jsx` **or** `docs/methodology.mdx` — pick MDX if we're comfortable with it in this stack, else a React component with content authored in JSX. Pedro helps with the wiring, not the content.
- New: `docs/copy/M10-methodology-page-content.md` — my authoring workspace; production form lives in the component/MDX above

### Branch

`edwin/M10-methodology-page`

---

## M12 (I lead): weekly digest

**Spec source:** `system-v1.1.md` §5 digest email row, Spec 5 HTML atom, D1-D6 laws, C1-C3 compose laws, §7 copy rules; `docs/ref/2026-07-16_fable-roadmap.md` M12.

### What I ship (content lead)

Everything that renders in the digest. Pedro owns the compose UI. I own the templates, the finding paragraph, and the send framing.

### Acceptance criteria (from `docs/ref/2026-07-16_fable-roadmap.md` M12, verbatim)

- D1 to D6 as specced.
- C1 numbers injected, never generated.
- C3 sends nothing itself (mailto/clipboard v1).
- The finding paragraph restates the Critical definition inline (§4.1).
- Footer renders §7 rules 8/9 fields.
- The plain-text twin ships with every draft (D6).

### The digest structure (per Spec 5)

1. **Subject line** — carries the finding (D1). Template:
   ```
   Steam attrition, run {run_date_short}: {n_critical} Critical, {n_tier_up} tiered up, {n_permit_events} permits
   ```
   Example: `Steam attrition, run Jul 6: 23 Critical, 4 tiered up, 12 permits`
2. **Finding paragraph** — first paragraph of body. Structure:
   - Sentence 1: named population + count + snapshot (M1). "As of pipeline run {run_date}, {n_critical} buildings are Critical: {Critical definition inline}."
   - Sentence 2: what changed since last digest. Sourced from `events.json` diff since previous digest.
   - Sentence 3: recommended action, one clause per Critical building above a size threshold; otherwise "See queue for full list."
3. **Delta feed excerpt** — top 5 events by severity, in the §4.3 grammar. Sourced from `events.json`. Each event is one line: `{kind} · {subject} · {verb} · {evidence}`.
4. **Queue excerpt** — top 3 Critical rows, one line each: `{address} · {tier chain summary} · {top driver} · link`. Links go to case file (which survives redeploys per §9).
5. **Footer** — §7 rules 8/9 fields templated from `model_meta.json`. Also carries link to methodology page.
6. **Plain-text twin** — same content, no HTML. Ships with every draft (D6).

### The finding paragraph (canonical template)

```
As of pipeline run {model_meta.run_date_short}, {n_critical} buildings are Critical:
model score ≥ 0.6, a fresh '24 normalized delta, and at least one trend modifier
(IQR outlier in either delta period or accelerating decline). Since the last digest,
{n_events_since_last} events crossed a threshold, including {top_event_kind_batch}.
{recommended_action_sentence}.
```

Restates the Critical definition inline because the digest reader may not have seen the methodology page (M5 law).

### D-family compliance

- **D1** — subject carries the finding, above.
- **D2** — complete without clicking. The digest reads honestly without opening the app.
- **D3** — built like 2004. Outlook-safe HTML: single column, 600px, Arial + Courier New. No web fonts. No CSS grid. No JS.
- **D4** — color never carries meaning. Grayscale-safe. Word + weight only.
- **D5** — drafted, then owned. Every draft has a "Prepared by" line; the analyst edits, then sends.
- **D6** — plain-text twin always ships. Copy is the same; formatting stripped.

### C-family compliance

- **C1** — numbers injected. Every `{slot}` above is filled from data. Free-form typing of numbers is not allowed. Ledger #14 open on locked-token editing spike.
- **C2** — edit is locked-token editing. Pedro's compose UI; if the spike fails, plain textarea is acceptable and documented.
- **C3** — send minimally. `mailto:` or clipboard, v1. No SMTP.

### The Compose flow (Pedro owns UI; I own strings)

The analyst opens the compose view, sees the draft (from templates above), edits prose, clicks "Copy to clipboard" or "Open in mail app." Nothing sends from our server.

### Ledger #14 fallback

If Pedro's locked-token spike fails, plain textarea with trust is acceptable for v1. The documentation says so plainly ("editing is unconstrained in v1; token discipline restored in v2").

### Files I touch

- New: `docs/copy/M12-digest-content-template.md` — full templates for subject, finding, feed lines, queue lines, footer, plain-text twin
- Pedro creates: `src/pages/Digest.jsx`, `src/components/ComposeEditor.jsx`

### Do not

- Do not use color to encode severity in the digest (D4). Word + weight only.
- Do not link to anything except the case file, methodology page, and report — all internal.
- Do not use em dashes in the finding paragraph or subject line.
- Do not generate a number in prose that wasn't injected (§7 copy rule; C1).
- Do not skip the plain-text twin (D6).

### Branch

`edwin/M12-digest-content` (paired PR with `pedro/M12-compose-ui`)

---

## Parallel non-build track: the David packet

**Spec source:** `docs/ref/2026-07-16_fable-roadmap.md` §Parallel non-build track; `system-v1.1.md` §10 (open questions ledger).

Runs alongside M1–M5. One email or sync with David covering **open ledger items #5–10.** None of these block starting any milestone above; but #7 gates M12 send framing and #8 gates M7/M9 TIER-down suppression copy.

### The six items

| # | Question | What I need from David | Blocks |
|---|---|---|---|
| 5 | Critical v1.1 sign-off | External sign-off that the 23 buildings is the right computed set (Ismael Q3 signed internally) | Presenting Critical externally |
| 6 | Chip vocabulary legibility (UNVAL, BT %) | Yes/no on the compact chip strings | Provenance chips in client-facing artifacts |
| 7 | Digest cadence, recipients, format preference | Weekly? Who? HTML + text? Just text? | M12 send framing |
| 8 | Cooling-off window length after Contacted | Number of days | M7/M9 TIER-down event suppression copy |
| 9 | Territory gating for reports and digest | Are reports filtered by borough/region for different recipients? | Distribution architecture (later) |
| 10 | Report review enforcement (DRAFT watermark vs hard gate) | Which one? | Report finalize flow (R5) |

**Recommendation from my side:** DRAFT watermark, not hard gate. The report is legal to send in DRAFT state; it just carries the visual mark. But this is David's call.

### The packet format

One email or Slack post. Not five separate messages. Each item numbered, each stated as: **(a) what we've computed / recommended, (b) the specific question for David, (c) what the answer unblocks.**

### Timing

Send during M1 or M2 — while Ismael is heads-down on the object and rerun. Don't wait until M3 starts, because #6 and #10 have real UI implications and I want to give Pedro answers before he ships those atoms in production form.

### Files I touch

- New: `docs/david-packet.md` — draft the packet content here, then send it
- New: `docs/david-packet-responses.md` — capture David's answers when they come back; each answer amends `system-v1.1.md` ledger and possibly other docs

### Branch

None. This is a documentation and communication track, not a code track. Update `system-v1.1.md` §10 statuses as items resolve.

---

## Branch & PR flow (durable)

- Branch: `edwin/M<n>-<slug>` per milestone I own content for. Copy sheets live in `docs/copy/`.
- Paired PRs (M4 with Pedro, M5 with Pedro, M12 with Pedro, M1 with Ismael) — my PR is small (copy-only), Pedro's or Ismael's PR references mine and pastes strings verbatim.
- **Never `--no-verify`** on commits or `--force` on push.
- If a copy sheet changes after Pedro/Ismael has pasted from it, ping them — do not silently update the doc and hope they notice.

---

## What NOT to do (durable)

- Do not violate L1 anywhere. `ml_risk` is percentile ordinal, never probability, never percent sign.
- Do not use "rule-based," "transparent diagnostic rule," or "the method ConEd's own team uses" in any tier context (§4.1 retired phrases).
- Do not use em dashes in product copy. Periods, commas, restructure. Middle dot for inherited em dashes (cluster names).
- Do not use relative timestamps ("2 hours ago"). Vintage or analyst-anchor only (§7).
- Do not free-form-generate prose that contains a number that wasn't injected (§7).
- Do not caption Exhibit B with a peer cohort until ledger #13 resolves.
- Do not mix model-version facts and run-date facts in the same sentence without both stamps (M2 law).
- Do not use causal verbs at portfolio scale (M3 law).
- Do not restate the Critical definition on surfaces other than the report finding band, digest finding paragraph, and methodology page (M5 law).
- Do not touch code paths owned by Pedro (`src/components/*` in the new build) or Ismael (`api/*`) without pairing.

---

## Cross-references quick index

| Need | Look in |
|---|---|
| Tier vocabulary + hybrid chain | `system-v1.1.md` §4.1 |
| AUC template | `system-v1.1.md` §7 rule 8 |
| Model version template | `system-v1.1.md` §7 rule 9 |
| Critical definition (verbatim) | `system-v1.1.md` §4.1 |
| Freshness state names | `system-v1.1.md` §4.5 |
| M-family portfolio-scale laws | `system-v1.1.md` §6 |
| Chatbot answer scope | `docs/ref/2026-07-13_ismael-q1-q10-response.md` Q10 |
| Methodology item mapping | `docs/ref/2026-07-16_methodology-alignment.md` §4 |
| Legacy discipline | `roadmap-supplement-m0.md`; `CLAUDE.md` §Legacy |
| Report format & PDF plumbing | `docs/briefs/2026-07-13_pedro-frontend-build.md` M5 |
| model_meta full schema | `docs/briefs/2026-07-13_ismael-backend-build.md` M1; `CLAUDE.md` §Pipeline |

---

## Ping myself if

- David hasn't responded to the packet within the first M1/M2 stretch — nudge, don't wait.
- Ismael's AUC rerun produces a number that reads badly ("about 55% of the time" — technically L1-compliant but persuasively weak). We plan the copy around it before it lands, not after.
- The 1,260 vs 1,210 building count discrepancy (flagged in Ismael's brief) resolves as anything other than "filter difference, name it." If it's a real total change, every count string in every doc needs updating.
- Fable proposes a Round 2 addition that lands mid-milestone (chatbot-inside-case-file, dual-tier badge, etc.). Batch and hold until this cycle ships; don't scope-creep.
