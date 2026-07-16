# Driftwatch · Presentation Script v3
**Date:** June 24, 2026
**Audience:** Blackstone — general investor audience
**Format:** Presentation (slides 1–8) + Live demo + Slide 9 close
**No Q&A**
**Speakers:** [A], [B], [C] — assign before Wednesday

---

## Total timing
~4:15 slides · ~1:30 demo · **~5:45 total**

---

## SLIDE 1 — COVER
`[Speaker A] (~0:15)`

Good [morning / afternoon]. We are presenting Driftwatch, a steam customer attrition predictor we built for Con Edison. The three of us went through Pursuit's AI-native data fellowship. We will walk you through what we built in about four minutes, then go live in the dashboard.

---

## SLIDE 2 — THE TEAM
`[Speaker B] (~0:20)`

That's us. Six weeks with David Caiafa's team at Con Edison Steam Operations. We came in with one theory about why buildings leave steam. The data pointed somewhere broader. What we built runs entirely on information any city makes public.

---

## SLIDE 3 — THE PROBLEM
`[Speaker B] (~0:30)`

Con Edison serves about nine million New Yorkers. Electric and gas customers are metered, so every one of them is watched continuously. Steam is different. Steam is wholesale. There are roughly 1,200 of Manhattan's largest steam customers — large residential co-ops and corporate towers. Nobody is continuously watching whether their usage is drifting. When one drops off steam, it throws off Con Edison's energy forecast. The overspend on generation lands as operational inefficiency. We built a way to surface who is drifting before it shows up in the numbers.

---

## SLIDE 4 — THE DATA BACKBONE
`[Speaker A] (~0:30)`

Everything Driftwatch knows about a building comes from public records. Two city laws are the foundation.

Local Law 84 requires every large building to publicly report its energy use and emissions each year. That is the disclosure law — it gives us consumption data, emissions, and Energy Star scores without touching Con Edison's systems.

Local Law 97 sets a carbon cap, with financial penalties that started in 2024 and tighten sharply in 2030. Buildings under that pressure are exactly the ones most likely to convert off steam.

*[Click — three additional sources appear]*

On top of those two laws we layer three more public sources. Building permits from the Department of Buildings show what capital work is actually happening — HVAC and mechanical permits are a strong signal that electrification is in progress. Deed records surface ownership changes, because new owners revisit energy contracts fast. And city property data gives us the structural facts: age, size, use type. Five sources. One picture per building.

---

## SLIDE 5 — WHAT DRIFTWATCH PRODUCES
`[Speaker A] (~0:20)`

Here is what comes out the other side. Driftwatch ranks all 1,210 of the steam buildings we track by attrition risk. The ones with the highest probability of leaving surface at the top. Each one is annotated with the signals that put it there — so an account manager does not just see a ranked list. They see exactly what drove it.

The high-risk tier has 52 buildings. That is where outreach begins.

---

## SLIDE 6 — HOW THE MODEL THINKS
`[Speaker B] (~0:25)`

The model does two things.

*[Click — first card appears]*

First, it groups similar buildings together. The technique is k-means clustering. Every one of the 1,210 buildings we track lands in one of five archetypes — groups that look alike and behave alike. A pre-war co-op on the Upper East Side drifts for completely different reasons than a midtown office tower.

*[Click — second card appears]*

Then it scores each building for the likelihood it drops off steam. The technique is gradient boosting. The input is twelve signals per building. The output is one risk score from zero to one hundred. Think of it like a doctor reading symptoms. It weighs many signals at once, it does not see the future, and it surfaces the patterns that warrant a closer look.

---

## SLIDE 7 — FROM SIGNALS TO SCORE
`[Speaker C] (~0:35)`

Here is how that runs in practice.

*[Click — features panel appears]*

Twelve signals feed into the classifier for every building. They fall into three categories: compliance pressure from LL97, building profile from property data, and activity signals from permit filings and consumption trends. The archetype from the clustering step feeds in as one of those twelve.

*[Click — score output appears]*

The classifier returns one score between zero and one hundred. High scores are buildings where the combination of signals — penalty exposure, capital activity, archetype, consumption trend — points toward a near-term conversion decision.

*[Click — SHAP drivers appear]*

For each building, the model surfaces the top five factors that drove its score, each showing how many points it moved the score up or down. That is how a relationship manager walks into a call already knowing what to say. Not just "this building is high risk" — but "it is high risk because its 2024 LL97 penalty is above two hundred thousand dollars and it just filed four HVAC permits in the last year."

*[Click — sample output card appears]*

Here is what that looks like in practice. Pre-War Active building, score of 87. The model explains itself.

---

## SLIDE 8 — WHAT THIS CHANGES
`[Speaker C] (~0:25)`

*[Click — 52 stat appears]*

52 buildings in the high-risk tier. That is where outreach starts Monday morning.

*[Click — $25M stat appears]*

Those 52 buildings represent roughly 25 million dollars in annual steam revenue. Retaining five of those accounts through proactive outreach preserves over a million dollars a year.

*[Click — 2 in 3 stat appears]*

The model ranks an at-risk building above a stable one about two times out of three, on public data alone.

*[Click — workflow panel appears]*

Each building comes out of the model with a score and the top five drivers behind it. Con Edison's team requested that scored reports go directly to account managers. By the time someone picks up the phone, they already know what drove the score and what to ask about. The model tells them who to call and why, before they dial.

---

## DEMO
`[One speaker drives the screen. One narrates.] (~1:30)`

**Low-risk building first.**
Open the dashboard. Zoom to the building. Let the data be readable before saying anything. Name the building. Explain the score in plain terms when the drawer opens. Walk through the top drivers. "Here is a building we are confident will stay on steam, and here is exactly why."

**Then the high-risk building.**
Name it. Zoom in. Explain the score. Walk through the top drivers — including which LL97 penalty figure and which permit activity flagged it. "Here is one Con Edison should be prepared to lose. These are the five signals driving it. Together they represent the kind of profile that has historically preceded a steam disconnection. The model flagged it. The relationship team can get ahead of it."

*Stay zoomed in. Do not pull back to the full board — once the whole map is visible the audience does not know where to look.*

---

## SLIDE 9 — CLOSE
`[Speaker A] (~0:15)`

Thank you. The next build folds in Con Edison's billing data and calibrates the ranking against verified disconnections. Today you saw the engine. What comes next is the system built around it.

---

## Speaker assignment (fill in before Wednesday)

| Slide | Content | Speaker |
|---|---|---|
| 1 | Cover | |
| 2 | The team | |
| 3 | The problem | |
| 4 | The data backbone | |
| 5 | What Driftwatch produces | |
| 6 | How the model thinks | |
| 7 | From signals to score | |
| 8 | What this changes | |
| Demo | Two buildings, cold | drives: / narrates: |
| 9 | Close | |
