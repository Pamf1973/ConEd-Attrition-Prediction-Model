# Driftwatch · Presentation Script v2
**Date:** June 24, 2026  
**Audience:** Blackstone — general investor audience  
**Format:** Presentation (slides 1–9) + Live demo + Slide 10 close  
**No Q&A**  
**Speakers:** [A], [B], [C] — assign before Wednesday

---

## Total timing
~5:30 slides · ~1:30 demo · **~7:00 total**

---

## SLIDE 1 — COVER
`[Speaker A] (~0:15)`

Good [morning / afternoon]. We are presenting Driftwatch, a steam customer drop-off predictor we built for Con Edison. The three of us went through Pursuit's data fellowship. We'll walk you through what we built in about five minutes, then go live in the dashboard.

---

## SLIDE 2 — THE TEAM
`[Speaker B] (~0:15)`

That's us. We spent the last several weeks working directly with David Caiafa and the steam operations team at Con Edison.

---

## SLIDE 3 — THE PROBLEM
`[Speaker B] (~0:35)`

Con Edison serves about nine million New Yorkers. Electric and gas customers are metered, so every one of them is watched continuously. Steam is different. Steam is wholesale. There are only about 1,200 steam customers in the entire city — large residential co-ops and corporate towers, not individual accounts. Nobody is continuously watching whether their usage is drifting. When one drops off steam, it throws off Con Edison's energy forecast. The overspend on generation lands as operational inefficiency. We built a way to surface who is drifting before it shows up in the numbers.

---

## SLIDE 4 — THE JOURNEY
`[Speaker A] (~0:20)`

Here is how the build evolved.

Our first instinct was that Local Law 97 — the city's carbon cap — would be the trigger. Buildings facing large penalties would be the ones switching off steam.

*[Click — Compliance Pressure group appears]*

After working with David's team we found that carbon pressure is real, but it is one of three categories of signal. These five — the LL97 penalty, the compliance threshold, GHG emissions, the 2030 forward penalty, and what fraction of a building's emissions comes from steam — those are the compliance signals.

*[Click — Building Profile group appears]*

But building profile matters just as much. How old is it, what is it used for, does it have a good Energy Star score, and crucially, which archetype did it cluster into.

*[Click — Activity Signals group appears + score output]*

Then the activity signals: how much steam the building actually consumes, how efficient it is relative to its peers, and whether they have filed recent HVAC or boiler permits — which is a strong signal that capital is moving toward electrification.

Together, twelve signals feed the model and come out the other side as a single risk score. A pre-war co-op on the Upper East Side drifts for completely different reasons than a midtown office tower. The twelve signals let the model weight each building on its own terms.

---

## SLIDE 5 — LOCAL LAWS, THE CONCEPT
`[Speaker A] (~0:25)`

Two city laws sit underneath all of this. Local Law 84 requires every covered building to publicly report its energy use and emissions each year. That is the disclosure law. Local Law 97 sets a carbon cap, with financial penalties that started in 2024 and tighten sharply in 2030. That is the penalty law. Together they give us a public, annual window into every covered building in the city — without needing any data from Con Edison.

---

## SLIDE 6 — LOCAL LAWS, HOW WE USED THEM
`[Speaker A] (~0:25)`

Here is how Driftwatch turns those laws into signals. Local Law 84 gives us each building's energy use, emissions, and Energy Star score. Local Law 97 gives us the carbon cap exposure and the forward-looking penalty schedule. On top of those we layer three more public sources: building permits from the Department of Buildings show what capital work is happening, deed records surface ownership changes, and city property data fills in the structural facts. Five sources. One picture per building.

---

## SLIDE 7 — HOW THE MODEL THINKS
`[Speaker A] (~0:30)`

How the model works, in plain terms.

First, we grouped similar buildings together. The technique is k-means clustering. The output is five building archetypes — groups of buildings that look alike and behave alike.

Then we scored each building for the likelihood it drops off steam. The technique is gradient boosting. The output is a single risk score from zero to one hundred.

Think of it like a doctor reading symptoms. It weighs many signals at once. It does not see the future. It surfaces the patterns that warrant a closer look. That is all it is doing — and that is enough to produce a ranked watchlist.

---

## SLIDE 8 — HOW WE BUILT IT
`[Speaker C] (~0:35)`

Here is how that runs in the build.

Every one of the 1,210 steam customers lands in one of five archetypes: Pre-War Active, Large Commercial, Low-Compliance Commercial, Pre-War Stable, and Mid-Size Post-War. Those are not just labels. The model uses the archetype itself as one of the twelve features when computing the risk score.

Twelve features total feed the classifier — you can see them all here. The model returns one score between zero and one hundred. For each building we surface the top five drivers behind that score, signed positive or negative. That is how a relationship manager walks into a call already knowing what to say. Not just "this building is high risk" — but "it is high risk because its 2024 LL97 penalty is above two hundred thousand dollars and it just filed four HVAC permits in the last year."

*[Transition to demo]*

We are going to go live now. Two buildings, one low-risk, one high-risk, walked cold.

---

## DEMO
`[One speaker drives the screen. One narrates.] (~1:30)`

**Low-risk building first.**
Open the dashboard. Zoom to the building. Let the data be readable before saying anything. Name the building. Explain the score in plain terms when the drawer opens. Walk through the top drivers. "Here is a building we are confident will stay on steam, and here is exactly why."

**Then the high-risk building.**
Name it. Zoom in. Explain the score. Walk through the top drivers. "Here is one Con Edison should be prepared to lose. These are the five signals driving it. The model flagged it. The relationship team can get ahead of it."

*Stay zoomed in. Do not pull back to the full board — once the whole map is visible the audience does not know where to look.*

---

## SLIDE 9 — WHAT THIS CHANGES
`[Speaker C] (~0:20)`

52 buildings sit in the high-risk tier. That is where outreach starts Monday morning. The model ranks an at-risk building above a stable one about two times out of three — on public data alone.

Each building comes out of the model with a score and the top five drivers behind it. Con Edison's team requested that those scored reports be emailed directly to account managers. So by the time someone picks up the phone, they already know what drove the score and what to ask about.

---

## SLIDE 10 — WHAT'S NEXT + THANK YOU
`[Speaker A] (~0:15)`

The August build folds in Con Edison's billing data, calibrates the ranking against verified disconnections, and ships the email alert on top of the engine already in place. Today you saw the engine. August is the dashboard built around it.

Thank you.

---

## Speaker assignment (fill in before Wednesday)

| Slide | Content | Speaker |
|---|---|---|
| 1 | Cover | |
| 2 | The team | |
| 3 | The problem | |
| 4 | The journey | |
| 5 | Local laws — concept | |
| 6 | Local laws — implementation | |
| 7 | How the model thinks | |
| 8 | How we built it | |
| Demo | Two buildings, cold | drives: / narrates: |
| 9 | What this changes | |
| 10 | What's next + thank you | |
