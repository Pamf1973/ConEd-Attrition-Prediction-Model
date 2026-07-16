# Fable — Build roadmap request

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** With `system-v1.1.md` (prompt 05) as canonical, the atoms specced, and the portfolio-signals verdict in (prompt 02), we need a sequenced build plan so three people can divide the work without stepping on each other or building against a moving spec. The roadmap is the shared reference every per-person build brief will quote from — congruence starts here.

**Send this after prompt 05 (system-v1.1 reissue) and prompt 02 (portfolio signals).** It depends on both.

**Attach:**
- `system-v1.1.md` (from prompt 05) and any adjusted / added HTML specs from prompts 01, 02
- `docs/ref/2026-07-16_methodology-alignment.md` — the ConEd methodology gap analysis (Ildi + Johan asks, per-customer weather normalization, diagnostic metrics suite). This is the source for the methodology alignment section below.
- `docs/ref/2026-07-13_ismael-q1-q10-response.md` — for Ismael's scoped backend milestones (Q6 events.json, Q7 status events endpoint, Q8 data-decoupling workaround)

## Context

Three-person team, September ConEd session as the anchor deadline:

- **Ismael** — pipeline / backend. Owns snapshot diffing → `events.json`, append-only status events keyed by BBL, data decoupled from deploy (JSONs onto a Railway volume the API reads at request time), AUC rerun on the current XGBoost.
- **Pedro** — frontend atoms + workbench composition. Strong on component-level React work, Tailwind, dense layouts.
- **Edwin** — domain-heavy composition (report content, email prose, methodology-facing surfaces), David-facing follow-ups, aggregate signals artifact if we build it.

## What we're asking

Produce a `docs/ref/2026-07-16_fable-roadmap.md` that sequences the build.

**Format for each milestone:**

- **M[n]:** [name]
- **What ships:** the surface / capability / atom in one line
- **Depends on:** which prior milestones or pipeline work must be done first
- **Owner:** Edwin / Pedro / Ismael / pair — **assign with the split principle below in mind** (Pedro gets the frontend-atomic pieces with the tightest specs; Ismael gets the pipeline/backend milestones per his Q1–Q10 scopes; Edwin gets domain-heavy composition, report content, methodology-page writing, David-facing follow-ups).
- **Acceptance criteria:** 3–5 lines. What has to be true for this milestone to be called done. **Point at the specific law(s) in `system-v1.1.md`** that the artifact must obey, and quote the exact system-v1.1 section if the milestone's copy is templated (e.g., §7 rule 8 for AUC copy, §7 rule 9 for model-version copy).
- **Graceful degradation:** if a dependency slips, what does this milestone show instead? (E.g., landing without `events.json` — does it render an empty state that reads honestly, or is it held?)

**Ownership split principle** (informs owner assignment above):
- **Pedro** — component-level atom implementations against a locked spec (score cell, case-file header ledger, workbench composition). Assign him the milestones with the tightest visual/interaction spec and least domain nuance, so he can move fast and push to GitHub without waiting on domain clarification.
- **Ismael** — backend/pipeline: `model_meta` object rollout, `events.json` snapshot diffing (Q6), append-only status events endpoint + watchlist migration (Q7), data-decoupling workaround via `model_meta.run_date` (Q8), AUC rerun (Q4). Scopes already agreed in `docs/ref/2026-07-13_ismael-q1-q10-response.md`.
- **Edwin** — reasoning report content, methodology-page writing, David-facing follow-ups, portfolio-signals surface content (if verdict from 02 is Option 1 or 4), copy rules 7/8/9 templated strings.

If a milestone doesn't fit cleanly under one owner, assign a pair with a lead — don't leave shared ownership implicit.

## Sequencing hints (not prescriptive)

- The score cell (Spec 1) is the atom every other surface embeds. It probably ships first.
- The landing page (Spec 4) depends on `events.json` — Ismael's snapshot diffing (~1–2 day scope per Q6). If diffing slips, the landing needs a degraded state or has to wait.
- The reasoning report (Spec 3) is composable from static data — it can ship early and independently.
- The email digest (Spec 5) depends on the compose flow (C1/C2/C3) working end-to-end, which depends on report IDs being survivable, which depends on data-decoupling workaround via `model_meta.run_date` (per Q8, not full decoupling).
- The queue and workflow states depend on Ismael's append-only status events endpoint (~2 day scope per Q7, Postgres). This also retires the in-memory watchlist Map at `server.js:314`.
- The portfolio-signals surface (if verdict is Option 1 or 4 from prompt 02) probably ships late, after individual scoring is stable.
- The `model_meta` object rollout is a cross-cutting dependency: score cell chip copy, case-file header AUC copy, `server.js:585` and `:867` model-name strings all read from it. Ship it as its own early milestone (Ismael), unblocks Pedro's copy work.

Use these as inputs, not answers. If your read of the dependency graph is different, follow your own read.

## Methodology alignment — required inclusion in the roadmap

ConEd (Ildi + Johan) asked us to demonstrate that the **core of their approach — careful weather normalization of usage data — is present in our build.** Johan's exact framing: *"a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier."* This is not optional context — it must show up in the roadmap either as concrete milestones, as methodology-page content, or as explicitly deferred Round 2 items. Do not silently drop it.

**The five methodology items** (source: `docs/ref/2026-07-16_methodology-alignment.md` §3 and §7):

1. **Per-customer weather-normalized usage regression** — HDD slope, CDD slope, intercept per building. Currently: citywide HDD multiplier only, no CDD anywhere. At yearly resolution this is statistically thin (2–3 df) but computable. At billing-day resolution it requires the ConEd billing data that has not landed.
2. **Diagnostic metrics suite** — YoY % variance in normalized usage, current-vs-full-usage baseline, model fit (R²), HDD slope stability, synchronized slope-intercept changes, decline trend acceleration. Currently: 1 of 6 partially present (norm_delta_23_24 exists but normalized via citywide multiplier).
3. **Uncertain tier aligned with regression fit** — Johan's Uncertain means "regression fit too poor to trust." Ours currently means "not enough years of data." These should be reconciled or the divergence should be a deliberate, explained choice.
4. **Rule-based tier assignment with empirical thresholds** — Johan labels H/M/L/Uncertain from diagnostic metrics; we label from XGBoost probability + modifiers. Path C's honesty in `system-v1.1.md` acknowledges the hybrid; the roadmap needs to say whether we're building any of Johan's diagnostic-metric-based labels alongside (as a second tier column, or as report-page content), or whether that is Round 2.
5. **Positioning as complementary signals, not a clone** — the report and any methodology page should frame our supervised classifier + Johan's diagnostic framework as two independent signals that triangulate. Where they agree = confident; where they disagree = human review flag. This is the most defensible product story.

**How to fold these in.** For each item, place it as:
- A **build milestone** (M[n]) with owner and acceptance criteria, if it can ship pre-demo, OR
- **Methodology-page content** to be written alongside build milestones, if it is documentation rather than surface, OR
- An **explicit Round 2 deferral** with a note about what unblocks it (typically: ConEd billing data arrival, or the parallel pattern-mining research track).

**Constraint on this section.** Do not invent capacity we don't have. If the honest read is that item 1 needs the ConEd billing data and item 2 needs item 1, defer them cleanly and say what would unblock them. The methodology page is a legitimate home for "here is Johan's framework, here is our public-data implementation of the parts we can defensibly build, here is what needs the billing data." That page is a milestone.

**The tier vocabulary in `system-v1.1.md` §4 already carries Path C's honesty about ours being hybrid.** The methodology page extends that honesty to the ConEd-framework layer.

## What we do not want

- A Gantt chart or time estimates. Milestones and dependencies, not dates.
- Any milestone that assumes a spec you have not seen. If a surface hasn't been spec'd, don't include it.
- Reordering the specs based on aesthetic preference. Order them by dependency and acceptance-criteria readiness.

## What we want at the end

One paragraph: **"If we had to ship a working demo for David next week with only two milestones done, which two?"** That paragraph is the fallback plan.

## Deferred / explicitly out of scope for this roadmap

Do not include these — they are Round 2 or parallel tracks. Naming them here so you know they exist and don't accidentally scope them in:

- **Edwin's pattern-mining research track** (owner-cohort co-movement via ACRIS, permit precedence lag via DOB filings, LL97 threshold-crossing cohorts, cluster archetype patterns, geographic block clustering) — deprioritized until after the redesign integration ships. Feeds Option 2 or 4 content later.
- **Full data-decoupling** (JSONs on Railway volume, API reads at request time) — Q8 confirmed as follow-up sprint. Roadmap uses the `model_meta.run_date` workaround.
- **`norm_delta_22_24`** two-year normalized delta for the 208 no-adjacent-yr Δ buildings — Q9 Round 2.
- **Billing-day-resolution per-customer regression** — needs ConEd's actual billing data. Yearly-resolution version may or may not fit in this roadmap; that's your call per the methodology alignment section above.
