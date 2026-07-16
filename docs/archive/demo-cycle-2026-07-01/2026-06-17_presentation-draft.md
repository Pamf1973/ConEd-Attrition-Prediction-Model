# Driftwatch — Blackstone Preview (June 17, 2026)

5-minute deck + script. Combined audience: Pursuit + cohort + ConEd team + possibly Blackstone (venue, not target audience).

Three speakers: Edwin, Pedro, Ismael. Roles intentionally omitted.

---

## Timing budget

| Slide | Speaker | Time | Running |
|---|---|---|---|
| 1. Cover | Edwin | 0:30 | 0:30 |
| 2. The team | Pedro | 0:30 | 1:00 |
| 3. What ConEd does + what we added | Ismael | 0:40 | 1:40 |
| 4. How we score each building | Edwin | 0:40 | 2:20 |
| 5. Live demo | Pedro + Edwin (handoff) | 1:45 | 4:05 |
| 6. What this changes | Ismael | 0:35 | 4:40 |
| 7. What's next + thank you | Edwin | 0:25 | 5:05 |

Speaker totals: Edwin ~2:15 · Pedro ~1:35 · Ismael ~1:15. Currently 5 sec over budget — trim options noted in conversation.

---

## Slide 1 — Cover

**On screen:**
- **Driftwatch** (giant)
- "Early-warning for steam customer drop-off"
- "for Con Edison Steam Operations"
- Three names along the bottom: Edwin Perez · Pedro Martins · Ismael Caraballo
- Pursuit mark + ConEd mark

**Edwin says (≈30 sec):**
> Good [morning/afternoon]. I'm Edwin, this is Pedro and Ismael. We built Driftwatch for Con Edison's steam retention team — a way to find which buildings are most likely to disconnect from district steam, before they actually do. What you'll see today is the first half of a two-part build. This half runs on public NYC data — that's what we could ship before any data-sharing agreement was signed. The second half, in August, folds in Con Edison's own billing data, so the model gets calibrated against verified disconnections.

---

## Slide 2 — The team

**On screen:**
- Eyebrow: "The team"
- Title: "Who built Driftwatch"
- Three large avatars in a row, each with name + one short line below. No titles.

| Pedro Martins | Edwin Perez | Ismael Caraballo |
|---|---|---|
| Built the table and filter system — the surface account managers actually use. | Built the building-by-building panel — what's driving each score and what's at stake. | Built the data pipeline and trained the attrition model on public NYC data. |

**Pedro says (≈30 sec):**
> The three of us came through Pursuit's data fellowship together. Over the last several weeks we worked directly with David Caiafa and the steam operations team at Con Edison to take what they already do internally and turn it into something account managers can use at their desks. Everything you're about to see was built from public NYC data — no Con Edison internal data has touched the model yet.

---

## Slide 3 — What ConEd does + what we added

**On screen:** two columns under a single headline, plus a footer strip below.

**Headline:** "Not a replacement. A complement."

| What Con Edison already does | What Driftwatch adds |
|---|---|
| Per-customer weather-normalized regression on **billing data** | Public-data screening layer using **LL84, DOB, ACRIS, PLUTO** |
| Fires when usage starts dropping in the bills | Fires from public signals **before** usage changes show up in billing |

**Footer strip (smaller, full-width below the columns):**
> Plus two things Con Edison's team asked for in our meetings: a one-look explanation for every score, and an alert system with an email line to operators.

**Ismael says (≈40 sec):**
> Con Edison already has an internal early-warning model. It runs per-customer weather-adjusted regression on their billing data, and it works. The catch — it can only fire once usage actually starts dropping in the bills. We built a layer that sits outside that. We use public New York City data: Local Law 84 emissions filings, Department of Buildings permits, deed records from ACRIS. The goal is to flag a building from those public signals before the disconnect ever reaches the billing pipeline. And in two of our meetings the team asked for two specific things — a one-look explanation for every score, and an alert system that can email operators directly. Both of those shaped what we built.

---

## Slide 4 — How we score each building (THE doctor analogy)

**On screen:** giant headline + three icons in a row.

**Headline:** "Like a pre-screening at the doctor's office."

**Three boxes:**
1. **SYMPTOMS** — 12 signals per building *(LL97 penalty exposure · Energy Star score · neighbors showing decline · HVAC permit filings · year built · steam demand size · ...)*
2. **READING** — a risk score, 0–100% *(model: gradient boosting, trained on 57 confirmed steam drops)*
3. **CALL** — account manager decides who to outreach

**Footer line:** "The system surfaces. The human decides."

**Edwin says (≈40 sec):**
> The way we think about this is a pre-screening at the doctor's office. We don't diagnose. What we do is look at twelve different signals for each of the 1,210 buildings — how big their Local Law 97 penalty is going to be, how energy-efficient they are, whether their neighbors are showing the same patterns, whether HVAC permits have been filed, how old the building is. Those signals get combined into one risk reading per building, between zero and one hundred percent. The account manager at Con Edison looks at the top of the list and decides who to call. The system surfaces. The human decides.

---

## Slide 5 — Live demo

**Title card:** "The product, live."

Then switch to live dashboard. Already logged in. No login on stage.

### Pedro leads (≈55 sec)

> *(Rankings tab open)* This is the full portfolio — 1,210 buildings, all on Con Edison district steam, all in Manhattan below 90th Street. Across the whole portfolio, the combined Local Law 97 exposure for 2024 alone is about $82 million a year in fines. *(click Top Targets)* If we narrow to the high-risk tier, that's 59 buildings. Those are the ones an account manager would start outreach on this quarter. *(click the #1 ranked building)*

### Handoff to Edwin (≈40 sec)

> *(panel slides open)* When you click a building, the panel shows you the why. *(point at WHY THIS SCORE card)* These are the top five reasons this building scored where it did. Red arrow up means that signal pushed the score higher. Gray arrow down means it pulled it lower. Below that — *(point at LL97 gauges)* — Local Law 97 compliance for 2024 and 2030. You can see the cliff: a lot of buildings that are barely compliant today blow past their cap in 2030. *(navigate to 1080 5th Ave)* And here's where the model earns its keep. This building has a huge LL97 penalty but our model says low risk, because steam isn't its dominant emissions source. We don't want the system to just rank by penalty size — we want it to make that distinction.

### Pedro closes the demo (≈10 sec)

> *(back to Rankings, save to Watchlist)* From here an account manager saves a target to their watchlist, exports a CSV for their team, or asks in plain English through the AI Agent tab.

---

## Slide 6 — What this changes

**On screen:** three giant numbers in a row.

| 59 | $82M | 100% |
|---|---|---|
| Top-priority retention candidates | Combined 2024 LL97 exposure across the portfolio | Coverage — every building has a risk score, an LL97 calculation, and a customer archetype |

**Footer (small, honest):**
> Public-data baseline · cross-validated AUC 0.67 — ranks an at-risk building above a stable one about two times out of three · the August build calibrates against verified disconnections in Con Edison's billing data, targeting 0.75–0.85.

**Ismael says (≈35 sec):**
> Anchoring in numbers: 1,210 buildings, 100 percent of them have a risk score, an LL97 exposure, and a customer archetype. Combined 2024 LL97 exposure across the portfolio is about $82 million a year. 59 of those buildings sit in the high-risk tier — that's where outreach starts. Honest framing: this is a ranking model, not a precision tool. It correctly ranks an at-risk building above a stable one about two out of three times, using only public data. The August build folds in Con Edison's billing data and calibrates the model against verified disconnections — we expect that ranking number to climb significantly.

---

## Slide 7 — What's next + thank you

**On screen:**
- **Headline:** "The August build"
- Three short lines:
  - Folds in Con Edison's billing data
  - Calibrates against verified disconnections
  - Email line ships on the alert engine already in place
- Big "Thank you" + repo / contact link

**Edwin says (≈25 sec):**
> What's next is the August build. Con Edison's billing data folds into the model, and the ranking gets calibrated against verified disconnections — the inside view joining the outside view we already have. The alert engine is already in place; the email line to operators ships on top of that. Thank you. Happy to take questions.

---

## Open items for Edwin to confirm

1. **AI Agent in the demo** — currently mentioned at the very end in one line, not run live. Keep it there, or cut the mention?
2. **$82M number** — pulled from the 2026-06-13 smoke test. Re-confirm before the 17th in case the data file refreshed.
3. **#1 ranked building address** — need to pull which building actually sits at the top of Top Targets so Edwin knows the address he's reading out loud.
4. **1080 Fifth Ave as the "model overrides LL97" counter-example** — confirmed from the smoke test (ml_risk = 0.003 with $91k 2030 penalty). Keep?
5. **"Driftwatch" name** — placeholder for now per your call; flag if/when it changes.
6. **Trim 5 sec from total runtime** — pick which option (or accept 5:05).
7. **Bios on Slide 2** — drafted with no titles. Each describes what was built. Replace if the framing feels off.

---

## Format / production notes

- Pursuit's HTML deck is the visual reference. Once you greenlight the copy, I can port it into that template (swap content, keep type/spacing/animation system).
- Type: their headline scale is `clamp(26px, 3.5vw, 52px)` — fine for a projected room. Body lead at `clamp(13px, 1.4vw, 19px)` is borderline small from the back. I'll bump to 20–24px floor when porting.
- Demo slot: pre-load the dashboard in a tab, already authenticated, on the Rankings view. Pre-pick the hero building so you don't have to scan. Backup: a static screenshot of the same flow in case the demo machine drops Wi-Fi.
- The AI Agent depends on a live API call — agreed earlier to keep it out of live demo. Currently mentioned in one closing line only.
