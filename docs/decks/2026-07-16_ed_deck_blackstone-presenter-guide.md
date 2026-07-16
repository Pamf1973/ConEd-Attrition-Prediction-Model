# Blackstone Presenter Guide — Driftwatch
**Date:** 2026-06-17 (Blackstone preview)
**Companion to:** `DEMO_TODAY_TACTICAL.md` (written 2026-06-13 for the internal demo)
**Read this if:** you're on stage Wednesday and still building your mental model of how the system fits together.

This guide does two things: (1) walks each layer of the system in plain language so you can answer questions without bluffing, and (2) closes the loop on the four open items + the YoY cut from the tactical brief.

---

## 1. The system at a glance

Driftwatch is three layers stacked on top of public NYC data:

```
PUBLIC DATA  ──►  MACHINE LEARNING  ──►  DASHBOARD UI  ──►  RELATIONSHIP MANAGER
(LL84, LL97,      (clustering,           (Rankings,         (Watch List,
DOB, ACRIS,       classifier,            BuildingPanel,     outreach call)
PLUTO)            SHAP)                  Watch List)
```

The relationship manager is the **only human** in the loop. Everything upstream of them is a pre-screening tool: the system surfaces *who to look at and why*, then the RM decides who actually gets a call.

That pre-screening role is what makes this a **drop-off predictor** the steam team can act on — a ranked list of likely drop-offs, plus the drivers behind each rank.

---

## 2. The data layer

Each source contributes something different to the building's profile.

| Source | What it is | What we use it for |
|---|---|---|
| **LL84** (Local Law 84) | NYC's energy benchmarking disclosure. Every covered building reports annual energy use. | Site EUI, source EUI, Energy Star score, carbon emissions per square foot. The model's energy-intensity backbone. |
| **LL97** (Local Law 97) | NYC's carbon cap. Penalties started 2024, tighten in 2030. | Each building's carbon exposure: percent over the 2024 cap, percent over the 2030 cap. Feeds the LL97 gauges and one of the classifier features. |
| **DOB permits** | Department of Buildings filings — every permit a building pulls (HVAC, mechanical, alterations). | Captures "is this building investing in changes?" Heavy HVAC permitting often signals a building is preparing to electrify (i.e., leave steam). |
| **ACRIS** | NYC's deed and property-transaction registry. | Recent ownership changes. New owners often re-evaluate energy contracts. |
| **PLUTO** | Citywide property dataset (age, size, use, lot). | Structural facts about each building. Feeds clustering and the classifier. |

**Why public data only:** ConEd's billing data is private and slow to access. Public data lets us build today and calibrate against billing data in the August build.

---

## 3. The machine learning layer (three jobs, three outputs)

This is the slide Ismael owns. Three pieces, each doing a different job.

> ### What "feature" means in this model
>
> A **feature** is one measurable fact about a single building that the model uses as input. Each building becomes a row of features; the model reads that row and produces an output (an archetype label, a risk score, a driver explanation).
>
> Concrete examples from Driftwatch:
> - **Building age** — a raw fact pulled from PLUTO.
> - **Percent over the LL97 2024 cap** — derived by comparing LL84 emissions to the LL97 threshold.
> - **HVAC permits filed in the last 3 years** — a count from DOB data.
> - **Archetype tag** — the k-means output, used as a feature inside the classifier.
>
> Features can be raw (pulled straight from a source) or derived (computed from raw values). They can be numbers, counts, percentages, or categories. The model doesn't care what kind — it just needs every building's row to be filled in the same way.
>
> Two different parts of the pipeline use different feature sets:
> - **K-means** uses 4 features: building age, size, use type, LL84 energy intensity.
> - **Classifier** uses 12 features, including the k-means output and others.
>
> When the deck says "twelve features feed in," that means twelve specific facts about each building flow into the classifier.

### 3a. K-means clustering — *the lens*

**What it does:** Groups the 1,210 steam customers into 5 buckets ("archetypes") based on shared characteristics. Unsupervised — no labels needed, the algorithm finds the groups itself.

**Inputs:** building age, size, use type, LL84 energy intensity.

**Output:** Every building gets one archetype tag (one of five).

**Why 5?** A silhouette-score sweep (a standard k-means tuning method that measures how cleanly the clusters separate) picked 5 as the cleanest cut.

**The five archetype names:**
1. Pre-War Active
2. Mid-Size Post-War
3. Pre-War Stable
4. Large Commercial
5. Low-Compliance Residential

> Be ready to define each one in one sentence on stage. The names are descriptive but the room may want a sharper read on what shared traits put a building into "Pre-War Active" vs "Pre-War Stable." Sync with Ismael before Wednesday so all three of you describe them the same way.

**Why it matters on stage:** A pre-war co-op and a midtown office tower may have the same risk score, but they're drifting for completely different reasons. The archetype lens separates the populations so the explanation actually makes sense.

### 3b. Gradient boosting classifier — *the ranking*

**What it does:** Predicts each building's risk of meaningful year-over-year steam consumption decline. Supervised — trained on historical drift patterns.

**Inputs (12 features total):** LL97 carbon exposure, Energy Star score, building age, HVAC permit filings, neighbor patterns, steam demand size, archetype tag (yes — the k-means output is itself a feature), plus others.

> Get the full list of 12 from Ismael before Wednesday. If anyone asks "what are the 12 features?" you want to be able to name them.

**Output:** One risk score per building, 0–100.

**Accuracy:** AUC ~0.65 on stratified cross-validation. Plain-English version: *"about two times out of three the model gets the ranking right."* Useful for sorting, not for absolute probability — which is why the UI shows tiers, not point estimates.

**What "gradient boosting" actually means:** An ensemble method that builds many small decision trees in sequence, each correcting the previous one's mistakes. Strong on tabular data with mixed feature types — which is exactly what we have.

### 3c. SHAP — *the why*

**What it does:** Decomposes each building's risk score into the contributions of individual features. "This building's score is 73 — here's how each input pushed it up or down."

**Output:** Top 5 drivers per building, signed (red = pushed score up, gray = pulled it down).

**Why it matters on stage:** SHAP is what makes the model **explainable per-building, per-archetype**. Two buildings can have the same risk band and totally different driver mixes — that's the "model decides" line in David's reframing.

**Plain definition:** SHAP (Shapley Additive exPlanations) comes from game theory. It answers "how much did each player (feature) contribute to the outcome?" by simulating combinations of features and averaging the impact each one had.

### How the three layers stack

K-means groups → the classifier ranks within groups → SHAP explains the ranking. The archetype is **also** a feature in the classifier, so clustering doesn't just decorate the UI — it shapes the model's predictions directly.

---

## 4. The UI layer — what's on screen during the demo

| Surface | What it shows | Demo beat |
|---|---|---|
| **Rankings tab** | Full 1,210-row table. Every row tagged with archetype, sortable by risk. | Pedro opens here, filters by archetype, sorts by risk. |
| **BuildingPanel** | Sliding panel on the right when you click a row. Shows everything about one building. | Ismael's territory. |
| **LL97 gauges** (in panel) | Two semicircular gauges: percent over 2024 cap, percent over 2030 cap. | Ismael points at these briefly — "carbon exposure is one input." |
| **WHY THIS SCORE card** (in panel) | Top 5 SHAP drivers for this building, signed. | The core of Ismael's handoff. |
| **YoY Trends tab** | Histogram + scatter of weather-normalized year-over-year consumption changes. | **Cut from our demo.** Exists in the build; we don't visit it. See §7. |
| **Watch List tab** | Buildings the user has starred. Persists in localStorage. CSV export. | Pedro closes the demo here. |
| **AI Agent tab** | Natural-language query interface. | Parked — env-dependent. See §6c. |

---

## 5. The relationship-manager workflow (the "so what")

This is the workflow line David wants on stage: **filter → sort → save → export.**

1. **Filter** by archetype to narrow the population to a coherent group.
2. **Sort** by risk to surface the at-risk buildings within that group.
3. **Open** the top few and read the WHY THIS SCORE card to understand the drivers.
4. **Save** the ones worth calling to the Watch List.
5. **Export** the Watch List to CSV — or walk into Monday's meeting with it.

The Watch List is the deliverable. Everything upstream exists to produce it.

---

## 6. The four open items — what to decide and why

### 6a. Project name "Driftwatch"
Placeholder. If a better name surfaces by Tuesday, swap. Otherwise it stays. Risk of waiting: someone asks "why Driftwatch?" and the answer ("it watches for drift in steam consumption") needs to land cleanly without a beat of hesitation.

### 6b. Top archetype + #1 ranked building for the live demo
Need to know three things cold before walking on stage:
- Which archetype Pedro filters to (the brief assumes "Pre-War Active" — confirm).
- Which building Ismael opens (the brief assumes `1080 5th Ave` — high-risk reference).
- The contrast building for the archetype pivot (the brief assumes a Large Commercial building).

If we scan the list live looking for the right row, the demo stalls. Pick three buildings, memorize the names.

### 6c. AI Agent mention in Pedro's demo close
Pedro's current line: *"...exports a CSV, or asks the AI Agent in plain English."*

Two options:
- **Keep:** signals the system has an exploratory query layer. Risk: someone asks for a live demo and we can't run it.
- **Cut:** removes the risk. Loses a feature we built.

Recommendation: **keep the mention, prepare a one-line dodge** — *"we're not running it live today, the API key isn't loaded in this environment"* — if asked.

### 6d. Headshots
Done. All three photos are in `presentation-assets/` and wired into the team slide.

---

## 7. The YoY cut — what we lost, what to say if asked

The tactical brief routes through the **YoY Trends tab** to plant two ideas:
- **Year-over-year consumption movement** — has this building's usage actually shifted?
- **Weather normalization** — applied so a cold winter doesn't masquerade as drift.

We cut that tab from the demo to fit the ~1:30 demo window across three handoffs. Two prepared answers if it comes up:

**If someone asks "how do you tell drift from a cold winter?":**
> "We apply a citywide heating-degree-day multiplier to each building's YoY consumption change, which catches population-level outliers. A per-customer regression with HDD/CDD slopes is the August build."

**If someone asks "do you actually look at consumption history?":**
> "Yes — there's a YoY Trends tab in the dashboard with weather-normalized scatter and a histogram. We're not visiting it today to keep the demo tight, but it's where the drift-within-archetype view lives."

Both answers are in the §4 Q&A of the tactical brief. Worth re-reading once before Wednesday.

---

## 8. Glossary (when in doubt, fall back to these)

| Term | Definition |
|---|---|
| **Archetype** | One of five labels every building gets from the k-means clustering. The "lens" for everything downstream. |
| **AUC** | Area Under the Curve. A score between 0 and 1 measuring how well a model ranks. 0.5 = random, 1.0 = perfect. We're at ~0.65 — useful for sorting. |
| **Classifier** | A model that assigns a score (here, risk 0–100) based on input features. Ours is gradient boosting. |
| **Cross-validation** | A way to test a model on data it didn't train on. "Stratified" means the test splits preserve the proportion of high-risk vs low-risk buildings. |
| **EUI** | Energy Use Intensity — energy per square foot per year. Site EUI is at the meter; source EUI accounts for upstream losses. |
| **Feature** | A single measurable fact about a building that the model uses as input. Can be raw (building age) or derived (percent over LL97 cap). See §3 callout for the full explainer. |
| **Gradient boosting** | An ensemble method that trains many small decision trees in sequence, each correcting prior errors. |
| **HDD / CDD** | Heating Degree Days / Cooling Degree Days. A measure of how cold or hot a period was relative to a baseline. Used for weather normalization. |
| **K-means** | An unsupervised clustering algorithm. You pick K (the number of groups), it finds K natural groupings in your data. |
| **LL84** | Local Law 84 — NYC's energy benchmarking disclosure. |
| **LL97** | Local Law 97 — NYC's carbon cap with penalties tightening in 2024 and 2030. |
| **Pre-screening** | The framing for Driftwatch: the system narrows the field, the human decides who to actually contact. |
| **Risk score** | The classifier's output for a single building. 0–100. Used for ranking, not as a literal probability. |
| **SHAP** | Shapley Additive exPlanations. Decomposes a model's output into per-feature contributions. Powers the "WHY THIS SCORE" card. |
| **Silhouette score** | A measure of how cleanly clusters separate. Higher = cleaner separation. Used to pick K = 5. |
| **Steam** | ConEd's wholesale district heating service. ~1,200 customers citywide (vs millions for electric/gas). |
| **Watch List** | The Driftwatch deliverable. Saved buildings, persists in localStorage, CSV export. |

---

## 9. Q&A — questions to be ready for

Grouped by category. Lead with the **short answer** (one sentence on stage). The italicized line underneath is the why or the backup fact — only pull it in if pressed.

### Methodology

**Q. Why k-means? Why not a different clustering method?**
> K-means is well-understood, easy to explain, and stable on tabular data. We tested with a silhouette-score sweep across k = 2 through 10 and k = 5 won. Open to revisiting if a different clustering method fits how the team thinks about the portfolio.

**Q. Why these five archetypes?**
> The k-means algorithm found them, given building age, size, use type, and LL84 energy intensity as inputs. The silhouette score picked k = 5 as the cleanest split. We named them after the dominant traits in each cluster.

**Q. Why a classifier instead of a diagnostic framework?**
> They're complementary. The classifier surfaces *who* to look at; a diagnostic framework explains *why* a specific customer is drifting. The August build layers both.

**Q. What exactly does the model predict?**
> Likelihood of meaningful year-over-year steam consumption decline relative to the archetype baseline. It's an early-warning signal for relationship engagement, not a literal "this customer will leave."

**Q. How are you handling weather normalization?**
> A citywide heating-degree-day multiplier applied to each building's YoY consumption change. It's coarser than a per-customer regression, but it lets us flag population-level outliers. Per-customer HDD/CDD regression is the August build.

**Q. Are you running per-customer HDD/CDD regressions like ConEd does?**
> Not yet. The public LL84 data supports it, and that's the August build. Today's YoY layer uses the citywide multiplier.

### Model performance

**Q. How accurate is the model?**
> AUC around 0.65 on stratified cross-validation. Plain English: about two out of three times, the model gets the ranking right between any high-risk and low-risk building. Useful for sorting, which is why the UI shows tiers instead of point estimates.

**Q. What's the false-positive rate?**
> We don't quote a single number because the tradeoff depends on how aggressively the relationship team wants to spend outreach time. The model produces a ranked list; the team picks how deep into the list to call. The Watch List is the throttle.

**Q. How do you decide a building is "uncertain"?**
> The current build's Uncertain tier is empty — that's a regression we're restoring. The next version uses R² < 0.5 or fewer than 3 years of data as the uncertainty gate.

**Q. What happens for brand-new customers with no history?**
> They land in their archetype based on building characteristics, but they get an uncertainty flag because the time series is too short for a reliable risk score. The model abstains rather than guessing.

**Q. What if a building you flagged actually grew their steam use?**
> That's a false positive, and the August build will tell us the rate. Today the model is calibrated against public-data signals only; once we layer ConEd's billing data, the false-positive rate becomes measurable and tunable.

### Business and use

**Q. So what does the relationship manager actually do with this?**
> Filter by archetype, sort by risk, open the top buildings, read the WHY THIS SCORE card, save the worth-calling ones to the Watch List, export. The Watch List is what they walk into Monday's meeting with.

**Q. What's the business impact?**
> When a steam customer drops, it throws off the energy forecast, which means overspend on generation, which hits the ratepayer. Catching drift early means smaller forecast errors and earlier intervention. The August build calibrates the actual dollar-equivalent savings against verified disconnections.

**Q. Did you talk to the relationship managers themselves?**
> We worked closely with David Caiafa, who runs the relationship team. The workflow we built — filter, sort, Watch List, export — came from what he said his team would actually use. Direct sit-downs with individual RMs is on the August roadmap.

**Q. How does this connect to ConEd's existing tools?**
> Today it's a standalone tool that runs on public data. The August build folds in ConEd's billing data and is designed to sit alongside the existing diagnostic framework, not replace it. The classifier surfaces who to look at; the existing tools explain the diagnosis.

**Q. Could this work for other utilities or other markets?**
> The architecture is generic: public benchmarking + clustering + classifier + per-record explanations. Plug in different public data sources and it works for any utility with a finite, identifiable customer base. Steam happens to be a clean first case because the customer count is small.

### Process and team

**Q. Why public data only?**
> ConEd's billing data is private and slow to access. Public data let us build the engine today; calibrating it against billing data is the August build.

**Q. What was the hardest part?**
> Reframing. The initial build was LL97-forward — carbon penalties as the headline. David's guidance pushed us back to the official ask: a drop-off predictor where LL97 is one signal among twelve, with archetypes as the per-building explanation lens. The architecture mostly survived; the framing had to be rebuilt.

**Q. How did you split the work?**
> Pedro led front-end and project delivery. Edwin led product and analytics. Ismael led data and ML. The team slide covers it.

### Tricky / pushback

**Q. Isn't this just a dashboard?**
> The dashboard is the surface. The engine underneath is a clustering model, a risk classifier, and a per-building explanation layer that runs on five public NYC data sources. The dashboard makes it usable; the ML is what makes it different from a spreadsheet.

**Q. Why not just sort by LL97 exposure?**
> LL97 dominates for some buildings and barely matters for others. Sorting by it alone would over-rank buildings with high carbon exposure but stable consumption, and under-rank buildings drifting for non-carbon reasons. The model's job is to weight all twelve features per building, per archetype.

**Q. Can you show the AI Agent?**
> Not in this environment — the API key isn't loaded. It's an exploratory query layer that lets a user ask the dataset questions in plain English. Happy to walk through it offline.

**Q. Why "Driftwatch"?**
> It watches for drift in steam consumption — the early signal before a customer actually drops. The name is a placeholder; we're open to alternatives.

**Q. What's stopping ConEd from building this internally?**
> Nothing — and that's part of the point. The architecture is documented, the data sources are public, the August build is designed to hand over cleanly. Driftwatch is meant to be useful, not proprietary.

---

If a question lands sideways during Q&A, work back to one of the three pieces — data, model, UI — and define it. You don't need to be perfect; you need to be coherent.
