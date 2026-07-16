# Driftwatch Deck — Financial & Framing Brief
**For:** the deck-building agent
**From:** Edwin (via analysis session 2026-06-23)
**Status:** SUGGESTIONS ONLY — do not implement any of the below without Edwin confirming which items to use and how. Present these as options with reasoning. Edwin will make the final call on every number and line of copy before anything goes into the deck.

---

## Context

This brief comes out of a deep-dive session on the Driftwatch model data, the 52 high-risk buildings, and how to ground the presentation financially. The audience is Blackstone — non-technical, financial, unfamiliar with steam utility economics. Almost no one in the room will know what LL97 or HDD normalization means.

The existing deck revision brief (driftwatch-deck-revision-brief.md) governs visual and structural decisions. This brief is additive — it covers what the numbers should be and how to frame the problem financially and factually.

---

## 1. The problem framing — use David's own words

David Caiafa (ConEd Steam Operations) opened the Driftwatch intro with this framing. It should anchor the Problem slide. This is a direct quote from his transcript:

> "If a customer stops usage, it's significant, it impacts the amount of energy that ConEd forecasts to create, and it can result in overspend in how much ConEd buys the power and steam generation plants. That impacts the everyday rate payer, and that impacts these large companies."

**Suggested slide sentence (derived from David's framing, not verbatim — confirm with Edwin):**
> "ConEd monitors 9 million electric and gas customers continuously. Their 1,200 steam customers aren't monitored the same way — and when one drops, the missed forecast hits every rate payer."

**Why this works for Blackstone:** It connects an obscure utility problem to something universally understood (your electricity bill). It also establishes that the problem has a public-interest dimension, not just a revenue dimension.

Edwin needs to decide: does he want to use this framing on the Problem slide, and if so, does he want to use the suggested sentence above or go back to David's exact words?

---

## 2. What the 52 high-risk buildings actually are

This is important context for defending the model output. Before deciding how to present this, Edwin needs to know:

**79% of the 52 high-risk buildings (41 of 52) are Multifamily Housing** — luxury and post-war residential condos and co-ops. Examples: 432 Park Avenue, 15 Central Park West, 1 Central Park South, 56 Leonard Street. These are not museums or universities. They are exactly the buildings most likely to convert: wealthy boards with capital, post-war boilers approaching end-of-life, high LL97 2030 exposure.

**Remaining 11:** 5 offices, 2 K-12 schools, 1 retail, 1 hotel, 1 senior living community, and **1 hospital (1283 York Avenue)**.

The hospital is the single largest revenue building in the entire high-risk tier at an estimated $3.16M/year. It is either the model's most important true positive, or its most important false positive — worth flagging to David before the presentation.

The 2 K-12 schools are small ($55K and $143K/year) — below the noise floor for a revenue argument.

**Suggested framing for the demo (for Edwin to decide):**
When opening a high-risk building on stage, note that the majority are post-war luxury residential — buildings with the capital, the regulatory pressure, and the boiler replacement timeline to make conversion a live decision right now. This preempts the question "are these buildings really at risk?" with a factual answer.

---

## 3. Financial figures — ranges and what to say for Blackstone

### The $27M figure
The 52 high-risk buildings represent an estimated **$24.8M to $28.9M per year** in steam revenue, based on LL84 steam consumption data converted to Mlb using the 1 kBtu ≈ 1 lb steam approximation and ConEd's approximate SC-2 tariff rate of $24–28/Mlb.

**For Blackstone:** Say **"roughly $25 million per year"** — conservative, defensible, round. Alternatively say "$25 to $27 million" if you want to show the range.

Do NOT say "$27 million" as a point estimate in the room unless you're prepared to defend the exact rate assumption. The range is more honest and still lands hard.

**Edwin needs to decide:** Does he want the point estimate ($27M) or the range ($25M–$27M)?

### Per-contract value
The median steam customer in the 1,210-building dataset represents approximately **$195,000/year** in estimated revenue (based on median steam consumption of ~7,498 Mlb/yr at $26/Mlb).

ConEd's published annual reports suggest approximately $294,000/year average across their full ~1,700-customer base. Our LL84 portfolio average is ~$430,000/year because LL84 only covers buildings above 25,000 sq ft — the larger end of the customer base by definition.

**For Blackstone:** The per-contract number is powerful for the "so what" frame. Suggested sentence:
> "The median steam contract is worth roughly $200,000 a year. A building that disconnects doesn't come back — it's a 20-year loss. One retained account at that level is worth approximately $2 million in lifetime revenue."

**Edwin needs to decide:** Does he want to use the $200K/year median figure, the $430K portfolio average, or anchor on the $27M aggregate instead? These are three different choices with different risk levels.

### The lifetime value argument
At a 7% discount rate over 20 years, $195K/year = approximately **$2 million in lifetime revenue per median building**. This is the sharpest financial argument for a Blackstone room — investors think in NPV, not annual revenue.

Edwin needs to decide if he wants to include the lifetime value calculation, and if so whether to show the math or just say "roughly $2 million per account."

---

## 4. The overproduction cost argument

From the PRD and David's transcript: when a steam customer drops off without warning, ConEd has already committed fuel to produce steam for that building. That steam is wasted. The forecast model runs on historical baselines that don't account for attrition in progress, so each surprise disconnection compounds the error in future forecast cycles.

**For Blackstone:** This is the second reason the problem matters, after lost revenue. Suggested framing:
> "It's not just the revenue. ConEd burns fuel to make steam in advance based on forecasts. When a customer drops without warning, that steam was already produced. The missed forecast hits the operational budget — and in a regulated utility, that overspend eventually passes to rate payers."

**For ConEd (not Blackstone):** The ratepayer framing is stronger. David uses it explicitly. Operational efficiency is the language ConEd's operations team cares about.

Edwin needs to decide: for the Blackstone deck, does he want to include the overproduction argument as a second beat, or just lead with lost revenue and irreversibility?

---

## 5. The irreversibility argument (strongest closer)

From the PRD: "Once a building owner commits capital to a replacement heating system, re-acquisition of that steam load is not practically achievable." ConEd's steam network is not adding new connections.

**Suggested framing for the "What This Changes" slide:**
> "Steam attrition is permanent. ConEd's network isn't adding new connections. A building that disconnects this year doesn't come back. Driftwatch gives account managers the lead time to intervene before the capital decision is made."

This is clean, factual (pending Perplexity research confirming the no-new-connections point), and lands hard in a financial room.

Edwin needs to decide: is the no-new-connections claim verified enough to put on a slide at Blackstone? A Perplexity research task has been scoped (see below) to confirm this before the presentation.

---

## 6. Pending research (Perplexity)

Before using the irreversibility claim or the $/Mlb rate assumption in the presentation, the following should be verified:

1. **Is ConEd's steam network closed to new connections?** Needs a public source — annual report, PSC filing, or documented statement.
2. **What is the verifiable $/Mlb rate for SC-2 customers?** The $26/Mlb estimate needs a public tariff reference (P.S.C. No. 4) to be fully defensible.
3. **Are there documented examples of large buildings converting off ConEd steam?** Real examples validate the problem statement.

Edwin is planning to run this research via Perplexity. The results should feed back into this brief before any of the financial figures are finalized for the deck.

---

## 7. Numbers NOT to use for Blackstone

- **The ratepayer framing as a headline** — accurate but reads as a regulatory/civic argument. Save for ConEd-facing conversations.
- **AUC 0.645** — too technical for this room. The plain-English version ("ranks an at-risk building above a stable one about two times out of three on public data alone") is fine. The raw number is not.
- **"59 buildings"** — the current data shows 52, not 59. Reconcile before presenting.
- **The $430K portfolio average** — it's higher than the true ConEd average and requires explanation. Use the $200K median or the $27M aggregate instead.
- **ml_risk scores in the 90s** — these are the raw GBM probabilities from a field not displayed in the dashboard. Do not reference them without explaining the two-field distinction first. This creates more questions than it answers in a non-technical room.

---

## 8. Summary: the financial story in priority order for Blackstone

These are the suggested beats, in order of impact for this audience. Edwin decides which to use:

1. **The problem scale:** "1,200 steam customers. Not monitored the way electric and gas customers are. When one drops, the forecast breaks and rate payers absorb it." (David's framing)
2. **Revenue at stake:** "The 52 buildings Driftwatch flags as high risk represent roughly $25 million per year in steam revenue."
3. **Irreversibility:** "Steam attrition is permanent. The network isn't adding new connections. A 20-year loss per account."
4. **Per-contract anchor:** "Roughly $200K a year per median account — approximately $2 million in lifetime revenue."
5. **The tool's value proposition:** "Driftwatch gives account managers the lead time to intervene before the capital decision is locked in. After that, there's nothing to negotiate."

Do not use all five in the same breath. Edwin should pick two or three and cut the rest.
