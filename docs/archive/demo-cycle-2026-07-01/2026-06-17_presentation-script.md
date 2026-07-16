# Driftwatch — Blackstone Preview Script

**Date:** June 17, 2026
**Runtime:** ~5:15
**Speakers:** Edwin Perez · Pedro Martins · Ismael Caraballo

**Speaker totals:** Edwin ~1:30 · Pedro ~2:00 · Ismael ~1:45

---

## Slide 1 — Cover

**Speaker:** Edwin (~0:20)

> Good [morning/afternoon]. I'm Edwin. We're building a steam customer drop-off predictor for Con Edison — an early-warning system for the steam team. We're calling it Driftwatch. Pedro and Ismael are with me. We'll walk you through it in five minutes.

---

## Slide 2 — The Team

**Speaker:** Pedro (~0:20)

> That's the three of us. Pursuit data fellowship cohort. We've spent the last several weeks working alongside David Caiafa and the steam operations team at Con Edison. Here's what each of us picked up along the way.

**Slide elements (from Pursuit's format):**

| Pedro Martins | Edwin Perez | Ismael Caraballo |
|---|---|---|
| Front End & Project Lead | Product & Analytics Lead | Data & ML Lead |
| Learned to lead delivery and ship a working dashboard end-to-end. | Learned to translate model output into a screen relationship managers actually trust. | Learned to build a production ML pipeline on public data and explain it to non-engineers. |

*(Avatars: initials placeholder — swap in headshots if available before Wednesday)*

---

## Slide 3 — The Problem

**Speaker:** Pedro (~0:50)

> Con Edison serves about nine million New Yorkers. Electric, gas, and steam. With electric and gas you have a meter, you're monitored continuously, and you're not going to stop using the service. Steam is different. Steam is wholesale, not retail. There are only around 1,200 steam customers in the entire city, and they're not individuals — they're large residential co-ops and corporate towers. Nobody is continuously monitoring whether their usage is drifting. When one of them drops, it's significant: it throws off Con Edison's energy forecast, which means overspend on generation. That overspend hits the everyday ratepayer. So we built a way to surface who's drifting before the drift hits the bill.

---

## Slide 4 — Our Approach + The Journey + The Laws

**Speaker:** Edwin (~0:50)

> Here's the journey we took. Our first instinct was that Local Law 97 — the city's carbon cap, with penalties starting in 2024 and tightening hard in 2030 — would be the trigger pushing customers off steam. After working with David's team we landed somewhere else. LL97 is one signal in a much bigger picture. A pre-war co-op on the Upper East Side is drifting for completely different reasons than a midtown office tower. Lumping them together hides the signal. So Driftwatch is the drop-off predictor we set out to build — LL97 is one signal among twelve, with the explanation rendered per-building, per-archetype. The public-data backbone is two laws. **Local Law 84**, the city's energy benchmarking disclosure, which gives us emissions and Energy Star scores. **Local Law 97**, the carbon cap. On top of those, Department of Buildings permits, ACRIS deed records, and PLUTO property data.

---

## Slide 5 — The Machine Learning

**Speaker:** Ismael (~0:50)

> Two machine learning layers. First is **k-means clustering**. We grouped the 1,210 steam customers into five building archetypes: Pre-War Active, Mid-Size Post-War, Pre-War Stable, Large Commercial, and Low-Compliance Residential. Every building gets one archetype tag. Second is a **gradient boosting classifier**. Twelve features feed in for each building — LL97 carbon exposure, Energy Star score, building age, HVAC permit filings, neighbor patterns, steam demand size — and the model returns one risk score between zero and one hundred. On top of that we layered **SHAP**, so we can surface the top five drivers for every individual building and show whether each one pushed the score up or down. The explanation is per-building, per-archetype. Think of it as a pre-screening — the system surfaces who to look at, and the relationship manager decides who to call.

---

## Slide 6 — Live Demo

**Total:** ~1:30

### Pedro leads (~0:40)

> *(Rankings tab open)* The full portfolio — 1,210 steam customers, every one tagged with a building archetype from our k-means clustering. *(open archetype filter)* Five archetypes. This is the lens. *(filter to one archetype, e.g., Pre-War Active)* Watch how the population narrows. These are buildings with shared characteristics — age, size, use type, energy intensity. *(sort by risk, click the top building in this archetype)*

### Handoff to Ismael (~0:30)

> *(panel slides open)* Open a building and the panel shows the why. *(point at WHY THIS SCORE)* Top five drivers, signed — red arrows pushed the score up, gray arrows pulled it down. Because the drivers are per-building and per-archetype, the same risk band can look completely different across two archetypes. *(navigate from the pre-war co-op to a Large Commercial building at the same risk tier)* Same risk band, different driver mix entirely. The archetype lens is doing real work inside the model. *(point at LL97 gauges briefly)* Carbon exposure is one input — for some buildings it dominates the score, for others it barely matters. The model decides.

### Pedro closes the demo (~0:10)

> *(back to Rankings, save a few buildings to Watch List)* From here a relationship manager saves targets to their Watch List, exports a CSV, or asks the AI Agent in plain English. The Watch List is what their team would walk into a Monday meeting with.

---

## Slide 7 — What This Changes

**Speaker:** Ismael (~0:25)

> 1,210 customers. Five archetypes. Every customer with a risk score and a driver mix. 59 buildings sit in the high-risk tier — that's where outreach starts. On public data alone the model gets the ranking right about two times out of three. The August build calibrates that ranking against Con Edison's billing data and verified disconnections.

---

## Slide 8 — What's Next + Thank You

**Speaker:** Edwin (~0:20)

> That's Driftwatch. The August build folds in Con Edison's billing data, calibrates the ranking against verified disconnections, and ships the email line on top of the alert engine already in place. Today you saw the engine. August is the dashboard built around it. Thank you.

---

## Speaker totals
- **Edwin:** ~1:30 (Cover · Approach+Journey+Laws · Close)
- **Pedro:** ~2:00 (Team · Problem · Demo lead · Demo close)
- **Ismael:** ~1:45 (Machine Learning · Demo handoff · Impact)
- **Total:** ~5:15

---

## Role titles — needs your sign-off
- **Pedro Martins:** Front End & Project Lead
- **Edwin Perez:** Product & Analytics Lead
- **Ismael Caraballo:** Data & ML Lead

## Open items still parked
1. **Project name** — "Driftwatch" placeholder. Confirm before Wednesday or swap.
2. **Top archetype + #1 ranked building** — Edwin/Pedro should know the exact name they're opening live, so the demo doesn't stall on a scan.
3. **Counter-example** — keep 1080 5th Ave as the "model overrides LL97" example, or pick a different Large Commercial building from current data?
4. **AI Agent in demo** — mentioned in Pedro's closing line; live demo of it stays out (no API key in local env per tactical brief). Keep the mention or cut?
5. **Headshots** — swap into team avatars if available; otherwise initials.
