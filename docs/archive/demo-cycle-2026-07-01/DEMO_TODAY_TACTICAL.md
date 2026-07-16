# ConEd Demo — Today (2026-06-13) · Tactical Brief
**Audience:** internal team + presentation-builder AI agent
**Build state:** `edwin/ll97-gauge-and-shap-drivers` (PR #7) on top of `main` @ `5cacb07`
**Constraint:** demo is today; the official ConEd presentation is next week. We do **not** rebuild for today — we re-narrate.

---

## 0 · The situation in one paragraph

The build we are demoing today is LL97-forward: dual-period carbon gauges and a SHAP-driven "WHY THIS SCORE" card are the headline UI. David's most recent guidance is the opposite: lead with **k-means archetypes**, demote LL97 penalties, position the dashboard as a **client-targeting tool** rather than a compliance scoreboard. We can't ship a new build in a day, but the k-means infrastructure is already in the data (every one of the 1,210 buildings has a `cluster_id`, archetypes are named, and `cluster_archetype` is already a SHAP driver inside the WHY THIS SCORE card). **The gap is narrative, not technical.** Today's job is to re-narrate the existing UI around the archetype story so the room hears the k-means message even though the pixels still emphasize LL97.

---

## 1 · David's reframing (verbatim talking points)

These are the lines that should anchor the opening and any methodology Q&A. Use them as written or close to it.

| Theme | Line to deliver |
|---|---|
| Why steam is different | "Steam is wholesale, not retail — ~1,200 customers, not continuously monitored. That changes what 'attrition risk' even means." |
| Why archetypes matter | "A pre-war co-op on the Upper East Side churns for completely different reasons than a Midtown office tower. Lumping them into one risk score hides the signal." |
| What the dashboard is for | "This isn't a compliance dashboard. It's a **client-targeting tool** — it tells the relationship team who to talk to and why." |
| Why LL97 isn't the headline | "LL97 penalties are one signal among many. For some archetypes they dominate; for others they barely matter. The model decides per-building." |
| What ConEd should do with it | "Filter by archetype, sort by risk, export the watch list. That's the workflow." |

---

## 2 · 8-beat demo flow

Optimized to **lead with archetypes** even though the homepage still leads with the Rankings table. The host's verbal frame does the reordering work.

| # | Beat | What's on screen | What the host says | Why this beat |
|---|---|---|---|---|
| 1 | Open with the framing | Login screen → Rankings table | David's "steam is different" hook + "this is a client-targeting tool" | Sets expectation that this is **not** a compliance dashboard before anyone sees a carbon gauge |
| 2 | Show the population | Rankings table, full 1,210 rows | "1,210 steam customers, every one tagged with a building archetype from our k-means clustering" | Plants the archetype flag early |
| 3 | Demonstrate archetype filter | Filter / search by archetype name (e.g. "Pre-War Active") | "Five archetypes — pre-war active, mid-size post-war, pre-war stable, large commercial, low-compliance residential. This is the lens." | Makes k-means visible without new UI |
| 4 | Open a building → LL97 + SHAP | BuildingPanel with gauges + WHY THIS SCORE | "Here's where it gets per-customer. Carbon exposure is one input; the SHAP drivers show what's actually moving the risk score for *this* building in *this* archetype." | LL97 is now a **supporting** beat, not the headline |
| 5 | Contrast two archetypes | Open one pre-war co-op, then one large commercial | "Same risk tier, completely different driver mix. That's why the archetype lens matters." | Demonstrates k-means is doing real work inside the model |
| 6 | YoY Trends → outliers | YoY Trends tab, scatter + histogram | "Year-over-year movement, weather-normalized. The yellow dots are outliers — buildings whose consumption pattern broke from their archetype." | Plants the **drift-within-archetype** idea David and Johan both pointed at |
| 7 | Watch List = target client list | Watch List tab with 3-5 starred buildings | "This is what the relationship team would walk into a Monday meeting with — a working target list." | Lands the "client-targeting tool" framing |
| 8 | Close with the gap | Back to Rankings | "Next iteration leads with the archetype landscape, surfaces per-archetype churn rates, and layers ConEd's own diagnostic framework on top. Today you're seeing the engine; next week you'll see the dashboard built around it." | Signals the next-week pivot is intentional, not a scramble |

---

## 3 · Soft-pedal vs lean-into

| Lean **into** | Soft-pedal |
|---|---|
| K-means archetypes (5 named clusters, every building tagged) | LL97 penalty totals ($81.9M etc.) |
| SHAP drivers as **per-building, per-archetype** explanation | Tier counts (High / Medium / Low) — the Uncertain tier vanished in the live build |
| Watch List as a target-client deliverable | "Compliance scoreboard" framing |
| YoY weather-normalization (citywide HDD multiplier) | Claims that we match ConEd's internal methodology — we don't, and Johan's spec confirms it |
| The AI Agent as an exploratory query layer (if local env is fixed by demo time) | The AI Agent if the local `.env` still has no `ANTHROPIC_API_KEY` / `GROQ_API_KEY` — skip the tab |

---

## 4 · Methodology Q&A — pre-baked answers

These are the questions most likely to come from anyone who's seen Johan's or Ildi's notes. Answer crisply; do not over-claim.

| Question | Answer |
|---|---|
| "Are you running per-customer HDD/CDD regressions like we do?" | "Not yet. Our YoY layer uses a citywide HDD multiplier; the per-customer regression with HDD/CDD slopes and billing-day adjustment is the next-week build. We have the public LL84 data to approximate it." |
| "How are you handling weather normalization?" | "Citywide degree-day factor applied to each building's YoY delta. Coarser than your per-customer slope, but it lets us flag outliers at the population level." |
| "How do you decide 'uncertain'?" | "Honest answer: the current build's Uncertain tier is empty — that's a regression we'll restore. The next version uses R² < 0.5 or fewer than 3 years of data as the uncertainty gate, mirroring your low-confidence classification." |
| "Why a classifier instead of a diagnostic framework?" | "They're complementary. The classifier surfaces who to look at; your diagnostic metrics explain *why* that customer is drifting. Next iteration layers both." |
| "What does the model predict?" | "Likelihood of meaningful YoY consumption decline relative to the archetype baseline. It's not a churn prediction in the customer-leaves sense; it's an early-warning signal for relationship engagement." |
| "Why these five archetypes?" | "K-means on building age, size, use type, and LL84 energy intensity. Five came out of the silhouette-score sweep. Open to revisiting cluster count if it stops matching how your team thinks about the portfolio." |
| "How confident are you in the risk scores?" | "AUC ~0.65 on stratified CV — useful for ranking, not for absolute probability. We present tiers, not point estimates, for that reason." |

---

## 5 · Pre-demo smoke check (run within 30 min of the demo)

- [ ] `npm run dev` starts cleanly, no es-toolkit error in console
- [ ] Login works with the password in local `.env` (not the one in `SMOKE_TEST.md` — that's stale)
- [ ] Rankings tab loads 1,210 rows
- [ ] YoY Trends tab renders both histogram and scatter
- [ ] BuildingPanel opens cleanly on `1080 5th Ave` (high-risk reference) and `936 5th Ave` (mid reference)
- [ ] LL97 gauges show 105%/177% on `1080 5th Ave`
- [ ] WHY THIS SCORE card renders 5 rows, humanized labels (`Steam demand`, not `log_steam`)
- [ ] Watch List survives a page refresh (localStorage)
- [ ] Decide AI Agent: in or out, based on `.env` LLM key

---

## 6 · Optional 1–2 hour surgical tweaks (only if there's time)

These are the smallest possible changes that make the verbal reframing land harder. Skip any that aren't safe.

| Tweak | Effort | Impact | Risk |
|---|---|---|---|
| Add archetype badge to **top** of BuildingPanel (above LL97 section) | ~30 min | High — every building now visibly leads with archetype | Low — additive UI, no logic change |
| README first sentence: replace LL97-forward phrasing with "k-means archetype-driven client-targeting tool for ConEd Steam" | ~5 min | Medium — anyone reading the repo gets the new frame | Zero |
| Stats bar at top of Rankings: replace "$81.9M in 2024 fines" with "5 archetypes · 1,210 customers · X% over LL97 2024 cap" | ~15 min | Medium — demotes the dollar figure as the headline number | Low |
| Color the Rankings row left border by archetype | ~20 min | Medium — archetype becomes visible at a glance | Low — purely visual |

**Recommendation:** do the archetype badge in BuildingPanel and the README sentence. Skip the rest unless the team has bandwidth.

---

## 7 · What we explicitly are **not** doing today

- Not restoring the Uncertain tier (next week)
- Not building per-customer HDD/CDD regression (next week)
- Not adding the archetype landscape view (next week)
- Not computing per-archetype churn rates (next week)
- Not reshooting any of the screenshots in the README
- Not changing the model
- Not editing `SMOKE_TEST.md` to fix the password drift (separate cleanup)

---

## 8 · One-line summary for the AI agent building slides

> Build the deck around the 8-beat flow in §2. The opening slide should be David's "steam is wholesale, not retail" line; the closing slide should be the Watch List as a target-client deliverable. LL97 gauges appear in the middle as a per-building drill-down, not as the headline. Use the methodology Q&A table in §4 as appendix slides — we'll need them if anyone asks.
