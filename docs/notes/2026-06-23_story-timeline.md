# Driftwatch · Story Timeline & Narrative Audit
**For:** Edwin, Pedro, Ismael — internal use only
**Based on:** v5 deck + Script v3
**Audience this is written for:** Blackstone — non-technical, financial

---

## The arc in one line per slide

| # | Slide | One-sentence job |
|---|---|---|
| 1 | Cover | Name the thing and set the room's expectations |
| 2 | Team | Earn trust and plant a discovery hook |
| 3 | Problem | Make the audience care about something they've never thought about |
| 4 | Data backbone | Show how you see what ConEd can't |
| 5 | What Driftwatch produces | Show the output before the process — ground them in the deliverable |
| 6 | How the model thinks | Explain what's underneath, in plain terms |
| 7 | From signals to score | Make it concrete: here's what a single building's output looks like |
| 8 | What this changes | Translate "it works" into "here's what it's worth" |
| Demo | Live | Show two buildings; let the tool speak for itself |
| 9 | Close | Set up the next chapter |

---

## Slide-by-slide handoff analysis

---

### SLIDE 1 → SLIDE 2
**Cover → Team**

What slide 1 gives the audience:
- A product name (Driftwatch)
- A description ("steam customer attrition predictor")
- A time commitment (~4 minutes then live)

What slide 2 does with it:
- Introduces the three people
- Plants the discovery narrative: *"We came in with one theory. The data pointed somewhere broader."*
- Closes on: *"What we built runs entirely on information any city makes public."*

**Handoff assessment: STRONG**

The last line of slide 2 is a clean setup for slide 4. It does two things: it tells you the tool exists without ConEd's internal data (important for defensibility) and it primes you to wonder "what kind of public information?"

**One thing to watch:** The hook — *"we came in with one theory"* — is the best storytelling line in the whole deck. It implies discovery, intellectual honesty, a pivot. But the answer to "what was the theory?" never comes. The deck implies it was LL97 pressure (the original hypothesis), but nobody says it out loud. If nobody resolves it, it's a hook with no payoff.

> **Suggested fix — add one sentence somewhere between slides 2 and 4:**
> *"We started with the carbon penalty law. Turned out that was one signal of eight. The fuller picture is why buildings actually leave."*

---

### SLIDE 2 → SLIDE 3
**Team → Problem**

Slide 2 ends on: *"What we built runs entirely on information any city makes public."*
Slide 3 opens on: *"Con Edison serves about nine million New Yorkers."*

**Handoff assessment: ADEQUATE**

The jump from "public information" to ConEd's customer scale isn't jarring. The audience follows it. But these two sentences are doing completely separate work — the first is about your method, the second is about ConEd's scope. There's no explicit bridge.

The problem slide itself is strong. It builds correctly: big number (9M) → exception (steam is different) → specific count (1,200) → the gap (nobody watching) → consequence (forecast breaks) → thesis line ("We built a way to surface who is drifting before it shows up in the numbers").

That thesis line at the end of slide 3 is the best sentence in the verbal script. It's the moment the audience finally understands the *purpose* of the tool. It should land hard.

**One thing to watch:** The word "drifting" is doing a lot of work in this deck (it's in the product name, the problem statement, the thesis). That's intentional and effective, but make sure the speaker leans into it — don't rush past "before it shows up in the numbers."

---

### SLIDE 3 → SLIDE 4
**Problem → Data Backbone**

Slide 3 ends on: *"We built a way to surface who is drifting before it shows up in the numbers."*
Slide 4 opens on: *"Everything Driftwatch knows about a building comes from public records."*

**Handoff assessment: WEAK — MISSING BRIDGE**

This is the most important gap in the current script.

The problem says: no one is watching these buildings. ConEd can't individually monitor 1,200 steam customers the way they monitor electric and gas.

The data backbone says: here are 5 public sources.

What nobody says is: **why** public data solves the problem that billing data can't. ConEd *has* billing data on these buildings. The audience's natural question is: "why don't they just watch their own billing?" The answer is that annual LL84 benchmarking data, permit filings, and ownership transfers happen on a different timeline than billing — they fire *before* the drift shows up in the bill. That's the whole value proposition.

Without this bridge, the audience assumes public data is just a workaround for not having access to ConEd's systems. It's actually the point.

> **Suggested bridge line — first sentence of slide 4:**
> *"ConEd has billing data on every one of these buildings. The problem is that by the time drift shows in the bill, the decision has already been made. We found signals that fire earlier — and every one of them is public."*

---

### SLIDE 4 → SLIDE 5
**Data Backbone → What Driftwatch Produces**

Slide 4 ends on: *"Five sources. One picture per building."*
Slide 5 opens on: *"Here is what comes out the other side."*

**Handoff assessment: STRONG**

"Five sources go in → here's what comes out the other side" is a clean logical handoff. The "other side" phrasing explicitly references what came before. This works.

The watchlist is the right visual for this moment — it shows real building names the audience may recognize (432 Park Ave, 15 Central Park West, 1 Central Park South). That specificity builds trust before the methodology slides.

**One thing to watch:** The slide says "an account manager does not just see a ranked list." This is the first time the audience hears "account manager." They don't know who that is in ConEd's context. For a Blackstone room, one orienting phrase helps:

> *"ConEd's relationship managers — the people responsible for keeping these accounts — don't just see a number. They see exactly what drove it."*

---

### SLIDE 5 → SLIDE 6
**What Driftwatch Produces → How the Model Thinks**

Slide 5 ends on: *"The high-risk tier has 52 buildings. That is where outreach begins."*
Slide 6 opens on: *"The model does two things."*

**Handoff assessment: WEAK — MISSING RECONNECTION**

The audience just saw the output (a ranked watchlist with 432 Park Ave at the top). Now they're being asked to learn how it was made. For a Blackstone room, this is the point where you risk losing the thread — they're thinking about 432 Park Ave, and you're talking about k-means clustering.

The transition needs to acknowledge the tension. Something like:

> *"That list you just saw — those aren't guesses. Here's what's actually under each number."*

Or more directly: reference one building from the watchlist when explaining the methodology. "A pre-war co-op on the Upper East Side drifts for different reasons than a midtown office tower" (which is in the current script) is good, but it's abstract. Saying "a building like 15 Central Park West drifts for different reasons than 30 Rockefeller Plaza" is more specific and keeps the audience anchored to what they just saw.

---

### SLIDE 6 → SLIDE 7
**How the Model Thinks → From Signals to Score**

Slide 6 ends on: *"It weighs many signals at once, it does not see the future, and it surfaces the patterns that warrant a closer look."*
Slide 7 opens on: *"Here is how that runs in practice."*

**Handoff assessment: ADEQUATE, WITH A STRUCTURAL RISK**

The handoff is logical — concept → concrete example. But slides 6 and 7 are a **two-slide methodology tunnel**. Between the watchlist (slide 5) and the impact stats (slide 8), there are no stakes, no building names, no dollar figures. The audience is in abstraction for the longest consecutive stretch in the presentation.

This works if the audience is engaged. It fails if they've started to drift, because there's nothing to pull them back — no anchor to why this matters — until slide 8.

The safest fix is to **close slide 7 with the explicit connective tissue** to slide 8. Currently slide 7 ends with: *"Pre-War Active building, score of 87. The model explains itself."* That line is good but it's about the method. Add one sentence after it:

> *"That is what Con Edison's account team reads before picking up the phone. Which brings us to what it's actually worth."*

This collapses the gap between methodology and impact and tells the audience where they're going next.

**One thing to watch:** The SHAP sample output shows *"Pre-War Active building"* — a generic archetype label — after slide 5 showed real addresses (432 Park Ave, 15 CPW). This is a step backward in specificity. The sample output would land harder with a real building name. Consider: *"15 Central Park West, score 87"* with the same five drivers. The audience will remember the name from slide 5 and the connection will click.

---

### SLIDE 7 → SLIDE 8
**From Signals to Score → What This Changes**

Slide 7 ends on: *"Pre-War Active building, score of 87. The model explains itself."*
Slide 8 opens on the step-reveal of stats: 52 → $25M → 2 in 3 → workflow

**Handoff assessment: STRONG IF THE BRIDGE LINE IS ADDED**

If you add the connective sentence at the end of slide 7 (above), this transition becomes the sharpest in the deck: concrete output → financial stakes → workflow. The step-reveal on slide 8 (stats appear one at a time) gives the speaker room to let each number land before moving on.

**One thing to watch on the "2 in 3" stat:** Even with the visual qualifier treatment we added to the deck, the spoken script currently presents "2 in 3" in the same breath and cadence as 52 and $25M. It shouldn't be. The delivery should feel different — slower, matter-of-fact, honest rather than triumphant:

> *"The model ranks an at-risk building above a stable one about two times out of three — on public data alone. Con Edison's billing layer adds precision on top of that. Our job is to get the right buildings into the conversation before the conversation is too late."*

That last sentence reframes the AUC qualification as a setup for human judgment, not a concession about model weakness.

---

### SLIDE 8 → DEMO
**What This Changes → Live Demo**

Slide 8 ends on: *"The model tells them who to call and why, before they dial."*
Demo slide opens with: *"Let's go live."* + two preview items.

**Handoff assessment: STRONG**

This is the best transition in the deck. Slide 8 describes what account managers receive. The demo shows it actually happening. The preview items on the demo slide ("a building we're confident stays on steam" / "a building ConEd should be prepared to lose") tell the audience exactly what they're about to watch, so they can evaluate what they see instead of just following along.

**One thing to watch for the demo itself:** The script says *"let the data be readable before saying anything."* That is the right instinct. The temptation is to narrate the moment you zoom in. Resist. Let the audience read the address, see the score, register it — then speak. Silence for 3–4 seconds while the building panel loads is fine. It's dramatic.

---

### DEMO → CLOSE
**Live Demo → Close**

Demo ends. Close opens on: *"Thank you. The next build folds in Con Edison's billing data..."*

**Handoff assessment: STRONG**

The close does exactly what it should: name what's real now, name what's coming, end on a forward-looking line (*"Today you saw the engine. What comes next is the system built around it."*).

The phrase "the system built around it" is intentionally opaque — it gestures at the email digest, the feedback loop, the account-manager workflow ConEd asked for, without getting into those details in front of a Blackstone audience. Right call.

---

## The three gaps that need to close before Wednesday

These are listed in priority order — fix them in this order if you're short on time.

### Gap 1 · The missing bridge at slide 4 (CRITICAL)
**The problem:** The deck goes from "no one is watching these buildings" directly to "here are 5 public sources." Nobody explains why public data solves a problem ConEd already has billing data for.

**Fix:** One sentence at the top of slide 4's spoken script:
> *"ConEd has billing data on all of these buildings. The problem is that by the time drift shows in the bill, the capital decision is already locked in. These five public sources fire earlier."*

---

### Gap 2 · The reconnection at slide 6/7 exit (HIGH)
**The problem:** The deck spends 2 consecutive slides on methodology with no reference to the buildings, the stakes, or the people involved. The audience can float away here.

**Fix:** One sentence at the end of slide 7's spoken script:
> *"That is what a ConEd account manager reads before picking up the phone. Which brings us to what it's actually worth."*

---

### Gap 3 · The unresolved discovery hook (MODERATE)
**The problem:** Slide 2 says "we came in with one theory." Nothing in the deck ever names that theory or the pivot. It's a narrative promise that goes unfulfilled.

**Fix:** One sentence, anywhere between slide 2 and slide 4 — or worked into the data backbone script:
> *"Our first instinct was that the carbon penalty law was the trigger. LL97 is one signal of eight. The fuller picture turned out to be about what the building is, what it's been doing, and who owns it now."*

---

## What the audience leaves knowing

Based on the current script and deck, a Blackstone audience who pays attention will exit with:

| Fact | Confidence they'll retain it |
|---|---|
| ~1,200 steam customers, not individually monitored | HIGH — hero stat slide, early, clear |
| The tool predicts who leaves before it shows in billing | HIGH — the thesis line lands |
| Public data only (no ConEd billing access needed) | HIGH — mentioned twice |
| 52 high-risk buildings | HIGH — repeated twice (slides 5 and 8) |
| ~$25M revenue at risk in those 52 | HIGH — delivered as a standalone stat |
| Each building gets an explanation, not just a score | HIGH — the SHAP output makes this concrete |
| Account managers receive scored reports before calls | MEDIUM — workflow panel is late and dense |
| The model ranks correctly about 2/3 of the time | LOW/MEDIUM — easy to miss or misread as weak |
| What's coming in August | HIGH — close is clean and forward-looking |

The one thing they should leave with that they may not: **why public data fires before billing data.** That's the core of the value proposition and it's currently implied, not stated.

---

## What the audience will see in the demo

The deck currently sets up:
1. A low-risk building (stable — they'll see a low score and muted drivers)
2. A high-risk building (ConEd should be prepared to lose — high score, strong LL97 and permit signals)

What they do NOT know yet:
- What the map looks like before a building is selected
- That the building panel has multiple data layers (LL97, steam history, archetype, permits)
- What "scoring 87" looks like in practice vs. "scoring 14"

The demo setup is lean — that's mostly correct. But the narrating speaker should explicitly say, **while the low-risk building is on screen:**

> *"This is what a stable building looks like. Score of 14. The drivers are quiet — no recent permits, LL97 exposure is low, steam use steady. This is one ConEd doesn't need to call."*

Then, transitioning to the high-risk building:

> *"Now here's the other kind."*

That setup/contrast structure is implicit in the script but should be treated as a deliberate rhetorical beat — not just two buildings, but a before/after that makes the tool's value unmistakable.

---

*Last updated: 2026-06-23 — Edwin / pre-presentation audit*
