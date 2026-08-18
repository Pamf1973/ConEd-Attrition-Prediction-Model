# Presentation notes

Running log of details, framings, and open questions to surface (or handle) in the client presentation. Append-only; each entry dated. When something moves from "note" to "decided," update PROJECT_STATE / STATE_LOG and cite here.

---

## 2026-08-18 — LL97 penalty bands: why round-number edges, not quantile edges

**Where this shows up in the demo:** the M11 aggregate view on the queue. Whenever we show LL97 exposure at portfolio or filtered-set scale, buildings are bucketed into five bands: Under 2030 cap · $1–50k · $50k–250k · $250k–1M · $1M+.

**Why the edges are fixed round numbers, not quantiles of the current data:**

Two ways to draw the cuts —
- **Round-number edges** (what we did): the cuts are fixed at human-memorable dollar values that map to statute-exposure semantics. $50k is a plausible warning threshold, $1M is executive-escalation territory. The cuts never move between pipeline runs.
- **Quantile edges** (the alternative): cuts drawn at percentiles of the current distribution. Buckets always look balanced. The dollar value of each cut is recomputed each run from whatever data is present.

Quantile edges are the right tool for one-time exploratory analysis. They're the wrong tool for a surface people will see every week asking "did anything change?" because the buckets redraw themselves each run — Week 1's "middle band" and Week 2's "middle band" wear the same label but hold different populations, and any WoW comparison across them is comparing two different things. Round-number edges let bucket migration become real information: if the $50k–$250k band moves from 245 to 240 buildings, that's a real, comparable 5-building delta.

A subtler point: quantile bands are self-erasing. If real portfolio exposure trends down across a year, quantile bands will hide it — by construction, ~20% of the set always lands in each bucket. Round-number bands surface real trends as bucket migration.

**How to frame it if asked:** "The bands are pegged to dollar thresholds, not to percentiles of whatever this quarter's data looks like. That's what makes week-over-week readings honest. If exposure genuinely shifts, the bands show it. If we were using quantiles, they'd redraw themselves each run and hide the movement." References `system-v1.1.md` §4.6 (canonical constant + provenance).

**Anti-defense (things not to say):** don't argue "quantile bands are less accurate." They're not less accurate for exploration. They're the wrong tool for **weekly reads on a stable population**. Frame is about purpose, not correctness.

**Related:** ties to M1's "population + snapshot discipline" — every claim anchored to a stable population definition and a specific snapshot. Moving buckets violate that.

---

## 2026-08-18 — Week-over-week: audit before the demo, reframe the surface

**The risk:** we've built several surfaces that trade on "week over week" framing — pulse WoW deltas, events feed (M7), digest (M12). ConEd's own team told us the model output on their client data won't move much week-to-week (or even month-to-month) because the underlying features are annual/slow-moving: LL84 CY filings are once a year, LL97 caps are statutory, decline trends aggregate multiple years, XGBoost is deterministic on fixed features. If we present WoW as "here's what the model changed its mind about this week," we will look off-target — because on real data, the model doesn't change its mind week-to-week.

**The reframe (from Ed, prompted by Ildi):** what actually moves weekly is not the model, it's **the reconciliation loop.** Account managers work through the Critical queue, place calls, hear answers back from building operators. Those answers are the weekly signal — and Ildi has directly asked whether AM call outcomes could feed back into the model to improve accuracy. That's a human-in-the-loop labeling pipeline, not built yet, but the shape is clear.

**Which framing this points at:** week-over-week is tracking **workflow throughput and reconciliation outcomes**, not model oscillation. "14 buildings contacted this week, 3 confirmed active leak, 2 dismissed as false positive, 1 remediated" — that's the weekly story. The model is the stable backdrop that lets AMs actually work through the queue without re-triaging every Monday. Slow-moving model = feature, not weakness, in a client-relationship workflow.

**What we don't know yet (audit these before the demo):**

1. **What does M7's `events.json` actually diff between runs?** Need to open the pipeline hook and look. If it's diffing model scores → events feed will be near-empty on real data and we'll look off-target. If it's diffing status events + new-data-arrivals + retrain markers → it's already telling the right story and we just need to talk about it that way.
2. **What does the pulse's "WoW deltas" component actually compute?** Same question. Is the delta on tier counts (will be near-zero on stable inputs) or on workflow state (moves every week)?
3. **Does the M12 digest currently frame the week as "model movement" or "workflow movement"?** If the former, we should adjust copy before the demo. If the latter, we're already telling the right story.

**Ildi's ask — active learning loop:** feeding AM call outcomes back into the training signal. Not built. Methodological questions to think through before we commit to it: (a) confirmation bias in which buildings AMs choose to call; (b) how to represent "yes it's declining" vs "no false positive" as training labels alongside the LL84-derived label; (c) cadence — do we retrain every N labels, or on a schedule. Position for the demo: **"the next unlock we'd propose, and the shape it would take"** — honest, gives ConEd something to react to, and the fastest way to see if they'd fund it. Don't overclaim it's built.

**How to frame it if asked "how often does the model change?":** "The model itself is stable — that's a design property for this workflow, not an oversight. What we track weekly is what your team learns from working the queue: who got called, what came back, what got confirmed or dismissed. That reconciliation stream is what moves week-to-week, and it's also the training signal for improving the model over time. Ildi flagged this to us as the direction to grow into."

**Actions (pre-demo):**
- [x] Read M7 pipeline hook and confirm what `events.json` actually diffs.
- [x] Read `computePulse` and confirm what its WoW deltas measure.
- [ ] Read M12 digest copy and check the frame ("model movement" vs "workflow movement"). Deferred: digest lives on PR #29, not this branch.
- [ ] Plumb M6 status events into events.json (see audit findings below).
- [ ] Draft a slide or paragraph positioning the AM-feedback loop as the next unlock (Ildi's ask).

---

## 2026-08-18 — WoW audit findings (Phase 1)

Audit of the three surfaces that trade on "week over week" framing.

**`generate_events.py` (M7 pipeline diff), 6 event kinds:**
- `TIER_UP` / `TIER_DOWN` — `diagnostic_risk` transitions. **Rarely fire on stable inputs** — rule tier + modifiers don't move without new outlier flags or trend label flips.
- `PERMIT` — `dob_jobs` count increased. **Genuinely weekly** (DOB filings roll in continuously).
- `DIVERGE` — newly modifier-promoted. Same stability issue as TIER events.
- `DATA` — aggregate scan summary; always emitted; copy is honest when nothing crossed a threshold (`"nothing crossed a threshold"`).

**`computePulse` (portfolio pulse):** shows current tier counts only. **Does not compute WoW deltas today.** Fable spec (§5) calls for "stacked tier bar + WoW deltas + coverage + vintages"; only the current-count tiles are built. No immediate misrepresentation, but a future WoW delta layer here would need the reconciliation-loop framing baked in.

**M12 digest:** lives on PR #29, not this branch. Audit deferred until it lands or against that branch.

**Key gap identified:** `ThisWeekPage.jsx` `KIND_META` table registers `STATUS` and `MODEL` event kinds — the UI is prepared to render them — but `generate_events.py` never emits either. `STATUS` is exactly Ildi's reconciliation-loop signal (contacted / dismissed / confirmed) and M6 already lands status events into Postgres. The workflow layer is in the database but doesn't surface in the "Since last run" feed. `MODEL` would be retrain markers, also unemitted.

**Framing conclusion:** we're **not** currently overclaiming WoW model movement. The events feed is honest when nothing changed; the pulse doesn't do deltas at all; PERMIT is a real weekly signal. The problem is that the story we *should* be telling (reconciliation-loop signal week-over-week) doesn't have data plumbed to tell it. This is a build gap, not a copy problem.

**Recommendation:** the durable fix is to add a status-events reader to `generate_events.py` that emits `STATUS` events into events.json alongside PERMIT/TIER/DATA. Then the feed reads as workflow signal by default — "3 contacted this week, 1 confirmed, 2 dismissed, 2 permits landed" — and the presentation framing follows naturally from what the surface actually shows. Sizing: probably a day of Ismael's time (he owns M6 status events) + a small pipeline change. Should be discussed with him before the demo but doesn't need to ship before it — for the demo we can frame this as "here's what runs today, and here's the reconciliation view we'd extend it into." Ildi's larger AM-feedback-loop ask (feed outcomes back into labeling) sits one level above this and stays positioned as "the next unlock."

**Fable ask (if any):** none right now. The Phase 1 audit shows this is a data-plumbing gap, not a copy gap. If we build the status-events emission and it changes how the "Since last run" feed reads, Fable should review the event grammar at that point — but that's a Phase 2 conversation with something concrete to react to.

---

## 2026-08-18 — Status events plumbed into events.json (WoW reframe, built)

**What shipped:** `api/mergeStatusEvents.mjs` runs after `generate_events.py --emit` in `run_pipeline.sh`. Queries `building_status_events` since `prev_run_date`, dedupes to latest per BBL, emits `STATUS` events into events.json ahead of the existing PERMIT/TIER/DATA events. Address lookup via enrichment file; falls back to `BBL <n>` when unknown. Overflow beyond 20 individual events rolls into one aggregate line. Graceful: skips silently if `DATABASE_URL` unset, DB unreachable, or no rows since prev run. 6 tests, all green.

**Where it shows up:** the "Since last run" feed on `/this-week`. STATUS events use the existing `KIND_META.STATUS` slot. On a real week the feed now reads roughly:
> **Status** · 1 W 34TH ST — moved to Contacted · by edwin · 2 days ago · Open case file
> **Status** · 200 E 42ND ST — moved to Dismissed · by ismael · 4 days ago · Open case file
> **Permit** · … (unchanged)
> **Data** · 1,210 buildings scanned · nothing crossed a threshold (or whatever)

**How to speak about it on stage (script prompt):**

Opening frame (30 seconds, when introducing "Since last run"):
> "One thing to be honest about — the underlying model is stable week to week. That's a feature, not an oversight. If your queue re-shuffled every Monday, your account managers couldn't work through it. So what you see moving in this feed isn't the model changing its mind — it's your team's activity against the queue, plus new data as it lands. Contacts, confirmations, dismissals, new permits. That's the weekly signal, and it also becomes the training data for the model over time — which is what Ildi flagged to us as the next unlock."

If asked "does the model change week-to-week?":
> "Not much on your data — the features it reads are annual (LL84) or slower. That stability is deliberate. What moves is workflow reconciliation. Your team calls, hears back, updates status. Those transitions are what the feed tracks and what would eventually feed back into labeling."

If asked "so what's the point of a weekly view if the model doesn't change?":
> "The weekly view is for your team's work, not the model's oscillation. It shows: who did what against the queue, what came back, what new data landed. Think of it as a reconciliation ledger — visible progress on the buildings the model already flagged, not a stream of new model verdicts."

If asked "will this improve the model?" (Ildi's ask, positioning it as roadmap):
> "That's the direction. Right now the training label is 'weather-normalized decline in CY2022 or CY2023.' If we add 'account manager confirmed at-risk' as a positive label and 'dismissed as false positive' as a negative, we get supervised feedback on exactly the buildings we called out. Ildi surfaced this direction to us and we've scoped it as the next unlock after the current milestone set."

**What NOT to say on stage:**
- Don't call the model "predictive" or "forecasting." M3 rule: no causal verbs. Say "flags," "identifies," "surfaces."
- Don't imply the model retrains weekly. It doesn't. Say the model is stable and the workflow layer is what moves.
- Don't overclaim the AM-feedback loop is built. It's positioned as the next unlock. Position, don't ship in the demo.

**Files touched:**
- `api/mergeStatusEvents.mjs` — new. Exports pure `buildStatusEvents(rows, bblToAddress)` for tests; script `main()` for pipeline invocation.
- `run_pipeline.sh` — new `merge` step after `emit`.
- `src/test/mergeStatusEvents.test.js` — 6 tests: dedupe, address lookup, evidence formatting, overflow aggregation.

**Open items:**
- [ ] Verify on Railway once `DATABASE_URL` is set that the script actually queries and merges. Right now it's tested pure-function; end-to-end runs need the DB to be reachable.
- [ ] Once demo data has a few real status events, screenshot the feed for the deck — this is the visual proof of the reframe.
- [ ] Ildi ask: draft one slide positioning the AM-feedback loop as "next unlock." Not code — deck content.
