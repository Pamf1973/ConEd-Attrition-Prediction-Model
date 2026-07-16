# Touchpoint deck — slide-by-slide with speaker notes

**Meeting:** ConEd touchpoint, [FILL IN: date]
**Audience:** David + Ildi + [others]
**Presenters:** Ismael + Pedro (Edwin unavailable — reach him on Slack for anything not in these notes)
**Format:** hybrid — this deck + `TOUCHPOINT-ONEPAGER.md` handout + the 4 design atoms open in a browser tab as backup

**Target:** 10 slides, ~20 min walkthrough + Q&A. Ismael and Pedro trade off; ownership tag on each slide.

**Before the meeting:**
- Print 3–5 copies of `TOUCHPOINT-ONEPAGER.md` (double-sided)
- Have the 4 atoms open in browser tabs: `fable-checkin-1-2026-07-12/this-week-landing.html`, `.../score-cell-anatomy.html`, `.../reasoning-report.html`, `.../weekly-digest-email.html`
- Have `system-v1.1.md` and `CONED_METHODOLOGY_ALIGNMENT.md` open in a second window in case Ildi asks for the source
- Ismael: know the Q4 rerun status (in progress / landed). Pedro: know M0 status (shipped / in flight).
- Edwin on Slack during the meeting for questions that go past what these notes cover.

---

## Slide 1 — Title

**Owner:** either
**Slide content:**
- Title: **ConEd Steam Attrition · Redesign Touchpoint**
- Subtitle: [FILL IN: date]
- Presenters: Ismael Caraballo, Pedro Martins
- Footer: Edwin Perez (design lead, unavailable today)

**Speaker notes:**
> "Thanks for the time. Edwin's on Slack today. We'll cover what shipped since last touchpoint, where the redesign is going, and end with a few questions for your input."

---

## Slide 2 — What shipped since last touchpoint

**Owner:** Ismael
**Slide content:**
- **Merged to `main`:**
  - LL97 dual-period gauges (2024 + 2030) on BuildingPanel (PR #7, 2026-07-02)
  - SHAP-driven "why this score" driver panel (top-5 features per building)
  - XGBoost predict endpoints + diagnostic tier filter in RiskTable
  - Security hardening: O(1) enrichment lookup, atomic model writes, XGBoost fallback guard
- **Design system:** `system-v1.1.md` v1.1 locked, 12-milestone roadmap scoped
- **Live at:** [Railway URL]

**Speaker notes:**
> "Three engineering ships. LL97 gauges show emissions vs cap at both compliance periods — 2024-to-2030 cliff visible. SHAP driver panel — every building shows its top 5 model features with directional arrows. XGBoost predict endpoint live behind auth."
>
> "Design side: system spec locked, 12-milestone roadmap scoped. Rest of the deck walks through it."

---

## Slide 3 — The redesign frame

**Owner:** Pedro
**Slide content:**
- **Voice:** "Bloomberg Terminal that explains itself"
- **One shift:** portfolio-scale dashboard → workflow-focused workbench
- **One law:** every number wears its confidence (provenance, validation status, freshness, coverage all first-class)
- **One structural move:** the tier is a documented hybrid — ML sets the base, three checkable modifiers shift it up or down, every surface says so

**Speaker notes:**
> "The current build shows a portfolio of buildings. The redesign shows the steam team's week. Same data, different center of gravity."
>
> "Every number wears its confidence — you see who trained the model, when the data was refreshed, and how many buildings support the claim. That's the direct answer to the '100% High' problem you raised last time."
>
> "The tier is not pure ML and not pure rule. It's a hybrid, and every surface names it that way — no silent reconciliation."

---

## Slide 4 — Atom 1: This Week landing

**Owner:** Pedro
**Slide content:**
- Screenshot of `this-week-landing.html` OR live open the file
- Callout labels on the screenshot:
  - Topbar: `Pipeline ran Jul 6, 06:00 · You reviewed Jun 30`
  - Delta feed with `PERMIT`, `TIER ^`, `DATA` event kinds
  - Portfolio pulse (bottom right)
  - The queue with **23 Critical**

**Speaker notes:**
> "What an analyst opens on Monday. Two time anchors at the top — when the pipeline ran, when you last touched the queue. Never relative time (Law W1)."
>
> "Delta feed names every event's trigger and what to do about it. Portfolio pulse is the only portfolio-scale number on the page — everything else is workflow-scale."
>
> "**23 Critical** — ML confidence plus fresh 2024 delta plus at least one trend modifier, all three legs. Top of queue: 660 Madison, 200 E 42nd, 58 W 58th. Ismael verified against live data. Sign-off is one of David's asks on Slide 9."

---

## Slide 5 — Atom 2: Score cell

**Owner:** Pedro
**Slide content:**
- Screenshot of `score-cell-anatomy.html` OR live open the file
- Callout labels:
  - Percentile ordinal ("96th") — no percent sign
  - Provenance chip: `XGB v1 · UNVAL`
  - Freshness chip: 4 states
  - Tier tick + tier word

**Speaker notes:**
> "Kills the '100% High' wall. 45 buildings all read 100% today — reality is they're tied at the top of the score distribution. This cell renders 'among the top 52 by model score' for the tie block and percentile ordinal for the rest. Never a percent sign (Law L1)."
>
> "AUC never lives on the chip — only on the case file and methodology page. Says `UNVAL` until we back-test against ConEd's disconnect records. That's your data — you tell us when it's available."
>
> "Freshness has four named states. Stale is the majority case; absence of fresh signal is a designed state, not a blank."

---

## Slide 6 — Atom 3: Case file + reasoning report

**Owner:** Pedro (with Ismael pitching in on Exhibit D)
**Slide content:**
- Screenshot of `reasoning-report.html` OR live open the file
- Callout labels:
  - Ledger middle column: "Tier · ML base + trend/statute modifiers"
  - Driver band (5 rows with real values)
  - Exhibit D: the §4.1 hybrid chain
  - Method footer: sourced from `model_meta.json`
  - Signature block + DRAFT watermark

**Speaker notes (Pedro):**
> "Click a Critical row, get a case file. Ledger not hero — three columns: queue position, tier with derivation, coverage. SHAP drivers move here as evidence with real-unit values."
>
> "The reasoning report is the printable version. One page argument, one page exhibits. Grayscale-safe. Tool doesn't ship anything without an analyst's signature (Law R5) — strongest defensibility we have."

**Speaker notes (Ismael on Exhibit D):**
> "Exhibit D is the tier chain verbatim. Base tier from ML cutoffs, three modifiers each shift one level, then clamp. One correction from our first analysis: `ll97_penalty_2024_log` is feature #1 at 20% importance; the over-cap boolean carries zero. Model consumes the dollar penalty richly; the boolean only appears as a ±1 modifier. No double counting."

---

## Slide 7 — Atom 4: Weekly digest

**Owner:** Pedro
**Slide content:**
- Screenshot of `weekly-digest-email.html` OR live open the file
- Callout labels:
  - Subject line carries the finding
  - Finding paragraph with inline Critical definition
  - Delta feed excerpt (top 5 events)
  - Plain-text twin (D6)
  - Footer with model version + methodology link

**Speaker notes:**
> "Monday morning email. Subject carries the finding (D1). Body complete without clicking (D2). Plain-text twin every draft (D6)."
>
> "Compose UI lets the analyst edit. Numbers injected from data, never freehand (C1). Send via mailto or clipboard — no SMTP from our side in v1."
>
> "Cadence, recipient list, format — three of David's asks on the next slide."

---

## Slide 8 — Methodology response (for Ildi specifically)

**Owner:** Ismael
**Slide content:**
- Title: **Response to ConEd methodology alignment (Johan / Ildi, 2026-06-17)**
- Table:

| Item | What ships now | Round 2 |
|---|---|---|
| 1. Per-customer weather-normalized regression | NYCHA 24-development regression (shipped exemplar); citywide HDD documented as known weakness | Blocked on billing-cycle data access |
| 2. Diagnostic metrics suite (6 metrics) | 2 of 6 partially present in case file (decline trend, R² where present) | Blocked on item 1 |
| 3. Uncertain tier aligned with regression fit | Partial: fit-based gate where NYCHA regression exists; years-based gate elsewhere | Portfolio-wide extension when item 1 lands |
| 4. Rule-based tier assignment | Hybrid tier with the chain named on every surface (§4.1 case file, Exhibit D report) | Fully learned tier explored |
| 5. Positioning as complementary signals | Ships now in methodology page §8 and report method footer | Pattern-mining research track named |

- Pointer: full methodology page ships in M10; `CONED_METHODOLOGY_ALIGNMENT.md` in repo has the full analysis; one-pager handout has the summary.

**Speaker notes:**
> "Ildi — this slide is for you. Your team's methodology alignment doc from June, our response item by item."
>
> "Item 1 is the honest gap. Citywide HDD instead of billing-day granularity — the NYCHA 24-development regression is a proof of method, portfolio-wide is deferred until we get billing-cycle access."
>
> "Item 4: your framework is a pure rule-based tier, ours is a hybrid. Rather than pretend they're the same, every surface names the chain — case file, methodology page, Exhibit D."
>
> "Items 2 and 3 partially converge now, fully when item 1 lands. Item 5 is the frame the whole design uses. Pattern-mining is the Round 2 engine."
>
> "Full methodology page ships in M10 — Edwin owns it. Handout has the summary; repo has the source."

---

## Slide 9 — What we need from you

**Owner:** split — David items to Ismael, chip vocab to Pedro
**Slide content (numbered questions with recommended answers):**

**For David:**
1. **Critical v1.1 sign-off** — the 23 buildings above; Ismael has signed internally. Yes/no?
2. **Chip vocabulary** — `XGB v1 · UNVAL`, `BT nn%`. Readable to your team, or need more literal copy?
3. **Digest cadence, recipients, format** — weekly? Who receives? HTML + text, or text-only?
4. **Cooling-off window** after `Contacted` — how many days before that building can re-surface?
5. **Territory gating** — do different recipients get different subsets, or the full portfolio?
6. **DRAFT watermark vs hard gate** — recommend watermark (drafts are legal to send, just marked). Yes?

**For Ildi:**
7. Any item on the previous slide you'd want reordered — anything Round 2 that you'd rather see now (with the trade-off named)?

**Speaker notes:**
> "Ismael: David, these six unblock the M12 digest, M7 event suppression, and R5 report finalize. Even three or four answers today or async this week moves things fast."
>
> "Pedro: on the chips — if `UNVAL` reads badly, we can spell it 'Unvalidated' at the cost of width. Preference?"
>
> "Ismael: Ildi — the last one is for you. Anything Round 2 that we should promote, we want to hear it."

---

## Slide 10 — Thanks + next touchpoint

**Owner:** either
**Slide content:**
- **What ships between now and next touchpoint:**
  - M0 legacy separation (if not done)
  - M1 `model_meta` + stale-string retirement
  - M2 AUC rerun with 5-fold CV mean ± std
  - M3 score cell atom into the Rankings table
- **Next touchpoint:** [FILL IN: date]
- **Contact:** Edwin (edwin.perez@pursuit.org), Ismael (ismael.caraballo@pursuit.org), Pedro (pedro.martins@gmail.com)

**Speaker notes:**
> "Between now and [next date], four milestones land: legacy preserved, one source of truth for model version and AUC, the AUC rerun with proper std, and the score cell atom in production. Handout has the deeper detail."
>
> "Thanks — questions?"

---

## Contingencies

### If David/Ildi ask a question neither of you can answer

Don't guess. Say: **"That's Edwin's — I'll get you the answer today."** Then Slack Edwin during the meeting or immediately after.

### If time runs short

Trim the atom walkthrough — one callout per atom instead of three. Never drop Slide 8 (methodology response — that's the whole reason Ildi is there).

### If an atom won't render on the projector

Fall back to the handout — it has key screenshots. Or share your screen from a browser tab; the atoms are pure HTML with no external dependencies.

### If Ildi challenges a technical claim you're not sure of

Two responses work:
- "That's covered in `system-v1.1.md` §[section] — happy to walk through after."
- "Ismael Caraballo signed off on this in Q3 of our backend brief — the calculation is verified against live data. If you want the walkthrough of how, I can share the SQL or Slack Edwin for a deeper answer."

### If David wants a demo of the live build

Show `/legacy` — that's the current shipped state. Do NOT show the atoms as if they're the current build. The atoms are the design contract, not the shipped state — say that plainly.

---

## Speaker load balance

Rough distribution:
- **Ismael:** slides 2, 6 (Exhibit D), 8, 9 (David items)
- **Pedro:** slides 3, 4, 5, 6, 7, 9 (chip vocab)
- **Both:** 1, 10, Q&A

Ismael carries the technical + methodology weight. Pedro carries the design + atoms + copy weight. Both take Q&A jointly.
