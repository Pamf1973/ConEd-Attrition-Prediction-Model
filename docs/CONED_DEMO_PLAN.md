# ConEd Demo Plan — presenting the redesign without a shipped build

**From:** Edwin
**Date:** 2026-07-14
**Purpose:** how to present the Fable redesign at the September ConEd session when the build is mid-integration.

The problem: the build is not shippable end-to-end by the session. What we do have: (1) the current dashboard live on Railway, (2) five high-fidelity design atoms from Fable in HTML, (3) the design system doc (`system-v1.1.md`) and roadmap, (4) a real dataset with 1,210+ buildings and computed Critical membership (23 buildings) that anchors any story.

**The frame that wins:** we do not apologize for the atoms-only state. We reframe it as *design system rigor*. "We built the atoms first, integrated them second — that's how a design system that ConEd will maintain for years gets built." This is true, and it's what Fable would say in her voice.

**The audience matters.** Two personas in the room:
- **David (ConEd business owner):** wants confidence the workflow is real, the numbers are honest, and the tool will actually help the steam team.
- **Johan / Ildi (ConEd technical):** wants methodological rigor, honest limitations, and a defensible position on why we do what they don't (yearly HDD instead of per-customer regressions, hybrid tier instead of pure ML, etc.).

The demo has to satisfy both without pandering to either.

---

## The 4-part demo (target: 25–30 min + Q&A)

### Part 1 — Live legacy dashboard (5 min)

**What to show:** the current build at `<your-railway-url>/legacy` (post-M0) or `/` (pre-M0). Log in, load the ranked table, click into a building, show the SHAP driver panel, show the LL97 gauges.

**What to say:** "This is the engineering baseline that's live today. Data pipeline runs weekly, LL84 and DOB data land automatically, 1,210 buildings are ranked. What you're going to see next is not a mockup — it's the workflow layer that sits on top of this baseline."

**Why open here:** proves the pipeline works, the auth is real, deployment is production-grade. Establishes credibility before the atoms show up.

**Do:**
- Anchor on a specific building — recommend **660 Madison Ave** (top of Critical queue). Continues into every subsequent section.
- Show the SHAP drivers panel. That's Edwin's shipped work; it directly seeds the Spec 2 driver band.

**Don't:**
- Don't apologize for how it looks. It looks like the current build — the point is that it works.
- Don't dwell. Five minutes, then pivot.

---

### Part 2 — Atom walkthrough (the workflow story, 12 min)

**Format:** open `fable-checkin-1-2026-07-12/*.html` files in a browser, walk through in workflow order. This IS the analyst's week, laid out one atom at a time.

**Order and talking points:**

1. **`this-week-landing.html` (Spec 4) — 4 min.**
   "This is what an analyst opens on Monday morning. Two anchors at the top: `run_date` (when the pipeline last ran) and last-review marker (when this analyst last touched the queue). No relative time — no 'two hours ago,' just vintage. That's Law W1 from the design system."
   - Point at the topbar: `Pipeline ran Jul 6, 06:00 · You reviewed Jun 30`
   - Point at the delta feed: "Every event names its trigger. `PERMIT · 660 Madison · +2 boiler jobs since last run · consequence: check LL33 grade drift.` That's Law W2."
   - Point at the portfolio pulse: "One aggregation, quietest treatment on the page. This is where portfolio-scale numbers live and only here."
   - Point at the queue: "**23 Critical.** Computed live from the model plus two independent trend signals plus fresh-year data. Definition in a moment."

2. **`score-cell-anatomy.html` (Spec 1) — 3 min.**
   "This is the atom that dies the '100% High' wall. The old version showed 45 buildings all at 100% risk — that reads like the model can't tell them apart. In truth, they're tied in a quasi-tie block at the top of the score distribution. So this cell renders 'among the top 52 by model score' for those rows, and percentile ordinal ('96th') for everyone else. Never a percent sign on the model score. Law L1."
   - Point at the provenance chip: `XGB v1 · UNVAL`. "The chip never carries a numeric AUC. That number lives in exactly two places, the case file and the methodology page. And it says UNVAL until we back-test against ConEd's actual disconnect records — you tell us when that data becomes available."
   - Point at the freshness chip states: "Four states. Fresh Δ '24, latest Δ '23 only, no adjacent-year Δ, and Uncertain. Absence of fresh signal is a designed state. Law L5. Stale is the majority state — we treat it that way."

3. **The case-file header (Spec 2, described inline) — 2 min.**
   Since there's no standalone atom file, describe it against the reasoning-report atom (which projects it): "When you click into a Critical row, you get a case file. Ledger, not hero. Three columns: your queue position, the tier with its full derivation chain, and coverage. **Middle column reads 'Tier · ML base + trend/statute modifiers.'** Every claim shows its math. This is where the SHAP drivers you just saw in the legacy panel move — same data, structured as evidence rather than a chart. Law H1."

4. **`reasoning-report.html` (Spec 3) — 3 min.**
   "This is what you send to your operations team. One page argument, one page exhibits. Grayscale-safe by construction — print it, scan it, still readable. Every value on this page appears on the case file first — Law R1. Every claim carries its caveat in the next sentence — Law R4. And a human signs it. The tool doesn't ship anything without your name on it. That's the strongest defensibility feature we have — Law R5."
   - Point at Exhibit D: "The hybrid tier chain, verbatim. This says exactly how the tier was computed. `ll97_penalty_2024_log` is feature #1 in the model at 0.2074 importance — the over-cap boolean carries zero importance. That's why the model consumes the penalty log richly and the boolean only shows up as a ±1 modifier. This is exactly the kind of transparency Johan asked for."
   - Point at Exhibit B: "Two lines: building steam vs LL97 cap-equivalent. We're not showing peer buildings until we define the peer cohort with you."
   - Point at the method footer: "AUC line, model version, link to methodology page. Everything sourced from `model_meta.json` — one file, one truth, versioned per run."

---

### Part 3 — Methodology page + honesty artifacts (5 min)

**What to show:** a static build of the M10 methodology page. Even if the site build isn't integrated, I can author sections 1–9 as a printable static HTML page **before the session** and open it in a browser.

**What to say (this is the Johan/Ildi part):**

"Section 7 lists the four known limitations of the model. Section 8 answers the alignment doc directly — the five methodology items your team documented. We ship item 5 (positioning as complementary signals) now, and we mark items 1 and 4 as explicit Round 2 deferrals with the reasons. Item 2, the six-metric diagnostic suite, ships partially in the case file and completes in Round 2 when item 1 lands."

"Item 1 — per-customer weather-normalized regression — is the honest gap. We use citywide HDD because we don't have your billing-day granularity in public data. The NYCHA 24-development regression on the page is a proof of the target method. Item 1 completes when we get the billing-cycle pathway from your side."

**Why this section closes the technical audience:**
- Names limitations upfront (label noise, citywide weather, 2–3 degrees of freedom, hybrid-not-learned tier)
- Names what unblocks each item
- Two clocks: sections regenerate per model version vs. per pipeline run — every stamped separately (Law M2)

**Do:**
- Have this static HTML on your laptop, ready to open. Don't paste text into a slide — show the actual page.
- Reference the alignment doc by name: `docs/ref/2026-07-16_methodology-alignment.md`. "Your team wrote this in June. Here's our response, item by item."

**Don't:**
- Don't defend the citywide HDD choice. Just say "this is the known weakness, item 1 addresses it, we ship it deferred pending billing-cycle access."

---

### Part 4 — Roadmap + what David does next (3 min)

**What to show:** a single slide (or the top of `docs/ref/2026-07-16_fable-roadmap.md`) with the milestone list.

**What to say:**

"M0 is done — legacy dashboard is preserved at `/legacy` as a hedge. M1 is `model_meta` rollout — one source of truth for model version and AUC, ships this week. M2 is the AUC rerun — ~clean 5-fold CV number lands with std. M3 through M9 land the atoms as production surfaces. M10 is the methodology page you just saw. M11 is a queue aggregate toggle for portfolio-scale exploration. M12 is the weekly digest — the atom you're about to see."

"[Show `weekly-digest-email.html`.] Every Monday, this arrives in the inbox of whoever's on the distribution list. Subject line carries the finding. Body is complete without clicking — that's Law D2. Plain-text twin ships with every draft — Law D6. The compose UI lets the analyst edit and send from mailto or clipboard. No SMTP on our side in v1."

**Ask David for:**
- Sign-off on Critical v1.1 (the 23) — Ismael has signed internally
- Digest cadence, recipients, format preference — this gates M12's send framing
- Cooling-off window length after Contacted — this gates M7 TIER-down suppression
- DRAFT watermark vs hard gate on reports — recommend watermark

These are ledger items #5–10, in `system-v1.1.md` §10. Send the David packet during the demo, not before or after.

---

## What to prepare before the session

### Two days out (Wave 1)
- Confirm `/legacy` route works on Railway (M0 must have shipped)
- Open all 4 atom HTMLs in a browser once; verify they render clean on a projector
- Print `reasoning-report.html` in b/w on a laser printer — verify R3 grayscale claim holds
- Read this doc out loud once, time it — 25 min is the target

### One day out (Wave 2)
- Author the static methodology page HTML (~2 hours if you already have §1–§9 outlined)
- Confirm 660 Madison Ave data still ranks top of Critical queue (Ismael can spot-check)
- Have `docs/ref/2026-07-16_methodology-alignment.md` open in a second tab — Johan may quote from it

### Day of (Wave 3)
- Bring your own laptop, own network dongle
- Have the David packet drafted (`docs/david-packet.md`) so you can send it during the session or immediately after
- Bring a physical printout of the reasoning-report atom — passable substitute for a PDF if the browser render blows up

---

## What not to do

- **Do not build a slide deck that reproduces the atoms as screenshots.** Open the actual HTMLs. Screenshots lose fidelity and read as decks; atoms read as software.
- **Do not claim the build ships by the session.** It doesn't. The claim is "the atoms are the design contract, the build integrates them milestone by milestone, M0 and M1 are already done."
- **Do not use week-based framing** ("we'll ship this in 6 weeks"). Use milestones. Say "M3 lands next" not "next week."
- **Do not defend the model score cell as a probability** if pressed. It ranks. It doesn't estimate probability. Fall back to Law L1 every time.
- **Do not skip the methodology page section** even if you're running short on time. This is what closes the technical audience.

---

## If time runs short (contingency)

Drop **Part 4 roadmap** first (5→3 min becomes 5→0). Everything else is load-bearing.

If you're really compressed, drop the case-file description in Part 2 — the reasoning-report atom projects it, and you can call that out inline.

Never drop the methodology page section. That's the Johan/Ildi handshake.

---

## Q&A anticipated

- **"Why not use our regression method?"** — "We do at NYCHA scale, 24 developments. Portfolio-wide is Round 2 because we need billing-cycle data. See methodology §8 item 1."
- **"Is the AUC 0.68 good enough?"** — "AUC is a ranking metric. It says the model puts a true churner above a non-churner about 68% of the time. It's a triage aid, not a decision system — the analyst confirms. That's why the tier vocabulary reads 'Uncertain' when data doesn't support a call. Ismael is rerunning with 5-fold CV to report mean ± std this week."
- **"How do you handle new buildings coming online?"** — "Uncertain tier by default until 2 years of steam data plus a fit above R² 0.3 exists. That's §4.1 hybrid chain, first gate."
- **"When can we see this live?"** — "M3 lands the score cell into the Rankings surface next; that's the first visible atom to land in production. M9 assembles the landing. Full timeline in `docs/ref/2026-07-16_fable-roadmap.md`. Nothing here is speculative — every milestone has acceptance criteria written down."
- **"What about the buildings that show up as false positives?"** — "That's Law R5 — a human signs the report. The tool doesn't confirm attrition, it triages. Confirmed / False positive statuses become training labels for the next model version. That's the feedback loop."

---

## Post-session

- Send the David packet within 24 hours if it wasn't sent during
- File any comments/asks from Johan / Ildi as amendments to `docs/ref/2026-07-16_methodology-alignment.md` and open questions in `system-v1.1.md` §10
- Update `docs/ref/2026-07-16_fable-roadmap.md` if any milestone re-scopes based on the conversation
