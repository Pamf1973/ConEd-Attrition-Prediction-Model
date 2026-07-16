---
title: ConEd Steam Attrition Dashboard — Redesign Brief for Fable 5
purpose: Give an outside collaborator (Fable 5) full context to help redesign the frontend
audience: Fable 5, working alongside Edwin Perez
date: 2026-07-06
status: Living document — the current build is real, the redesign is what we're planning together
---

# What this document is

Fable — you're helping us redesign the frontend of a working product. This brief covers everything you need to know before touching the design: what the product does, who the analyst is, what data the product has, what the ML model can and can't do, what the current UI got right and wrong, and what the redesign is aiming for. It is deliberately self-contained; you shouldn't need to read the rest of the repo to get oriented.

Nothing here is proprietary — the product uses only public NYC data — but treat this doc as internal working notes, not something to share broadly.

---

# 1. The assignment (one paragraph)

Con Edison ("ConEd") supplies district steam to about 1,600 customers in Manhattan below 90th Street — old high-rises, hospitals, university buildings, luxury apartment towers. Customers have been leaving the steam system (converting to electric heat pumps, standalone boilers, etc.) as NYC's carbon law (Local Law 97 of 2019) forces buildings to decarbonize. ConEd's steam operations team wants to identify customers likely to drop off **before they file a disconnect permit**, so they can intervene with an outreach conversation — offer efficiency programs, understand the customer's plans, or plan for the loss on their side.

Pursuit Fellowship's data team built a decision-support tool for ConEd's steam operations team. The tool is a **web dashboard** backed by a **Python ML pipeline** that scores each building for attrition risk and surfaces the reasoning behind the score. The Pursuit team is Edwin Perez (product + visualization, that's who you're working with), Pedro Martins (front end + project), Ismael Caraballo (data + ML). The ConEd sponsor is David Caiafa, VP of Steam Operations.

---

# 2. Who the user is (this is who we're designing for)

**Primary user: a ConEd steam operations analyst.**

- Sits at ConEd, not at Pursuit. Not the sponsor, not an engineer, not a data scientist.
- Their Monday morning job: figure out which 5–25 steam customers this week are the highest priority for an outreach conversation
- Cross-references our dashboard against ConEd's internal billing system (Bidgely + SAP)
- Talks to account managers (some customers have a named ConEd account manager; smaller customers don't)
- May write short internal memos justifying an outreach; may need artifacts (a PDF, an email) to attach to CRM notes
- Not going to sit and read a 40-metric dashboard — they need the tool to sequence the work

**They open the app to answer three questions, in this order:**

1. **What changed since last time?** Who's newly critical, who filed a permit, who crossed a threshold.
2. **Who do I call this week?** A ranked, filterable, workflow-aware queue.
3. **What do I say to them?** A per-building case file that lets them prep for the call in 3–5 minutes.

Everything in the redesign should serve one of those three questions first, and every other capability second.

**Secondary users** (do not design around, but don't break):
- David Caiafa and ConEd leadership — they'll see this in demos and want the "portfolio-level" view (how many at risk overall, aggregated trend)
- The Pursuit team ourselves — we demo this to Blackstone and Pursuit stakeholders
- Long-tail: eventually key account managers who cover strategic customers

---

# 3. What the product currently does (the working build)

The current dashboard is a **React 19 + Vite 8** frontend calling an **Express 5 + Node** API, deployed on Railway. It has these routes/views:

| Route | What it does |
|---|---|
| **Attrition Rankings** (main table) | Sortable, filterable table of all 1,210 buildings with attrition score, cluster, tariff class, YoY change, top signal |
| **Building Panel** (right-side drawer) | Detail view for one building — headline risk score, "why this score" SHAP drivers, LL97 penalties, steam trend chart, ownership, permits |
| **YoY Trends** | Bar/line chart view of year-over-year steam demand across the portfolio |
| **Clusters** | Landscape view of the 5 K-means archetypes with population counts |
| **Watch List** | Manually curated list of buildings the analyst is monitoring |
| **AI Agent** | Free-form chat interface — analyst can ask Claude Haiku questions about buildings; grounded in the enrichment data |
| **Proactive Alerts** | Bell icon with a slide-out feed of buildings that crossed a threshold, with a timestamp |

The dashboard is **read-only for most surfaces** — the analyst can favorite (star), export CSV, add to Watch List. No workflow state (no "contacted," "dismissed," "in outreach"), no assignment, no notes, no scheduled email reports.

---

# 4. The data skeleton (real field names)

The frontend loads three main JSON files at boot. Everything the UI shows comes from one of these three (plus the SHAP drivers array baked into `buildingEnrichment.json`).

### 4a. `buildings.json` — the master list, one entry per building

```jsonc
{
  "address": "1000 5th Ave",              // Street address, sometimes with commas
  "bbl": "1-01111-0001",                  // NYC borough-block-lot ID (unique)
  "lat": 40.779393,                       // Geocoded from PLUTO
  "lon": -73.963409,
  "steam": 228092084.7,                   // Most recent year steam demand (kBtu)
  "gas": 73648.28,                        // Most recent year gas demand (kBtu, informational)
  "ghg": 31694.5,                         // Annual GHG emissions (MT CO2e)
  "yr": 1878,                             // Year built
  "use": "Other",                         // Primary use category (LL84 taxonomy)
  "risk": 0.481                           // Headline ML attrition risk (0.0 to 1.0)
}
```

1,210 buildings. All Manhattan below 90th Street. All actively on ConEd steam.

### 4b. `buildingEnrichment.json` — everything else, keyed by uppercase address

```jsonc
{
  "1080 FIFTH AVE": {
    // Compliance & building fundamentals
    "eui": 70.4,                          // Site energy use intensity (kBtu/sqft)
    "ll33": "D",                          // LL33 letter grade (A/B/C/D/F)
    "energy_star": 10,                    // 1-100, higher = more efficient
    "floor_sqft": 110000,

    // LL97 (NYC's carbon law) exposure
    "ll97_cap_2024": 742.5,               // Annual GHG cap for the 2024-2029 period
    "ll97_cap_2030": 440.0,               // Tighter cap for 2030+
    "ll97_penalty_2024": 10050,           // Estimated annual $ penalty at current emissions
    "ll97_penalty_2030": 91120,           // Estimated $ penalty in 2030
    "ll97_over_2024": 1,                  // 1 if over cap, 0 if under
    "ll97_over_2030": 1,

    // K-means cluster (customer archetype)
    "cluster_id": 1,
    "cluster_name": "Mid-Size Post-War — Moderate Signal",
    "cluster_risk": "Medium",             // High/Medium/Low tag on the whole cluster

    // Attrition ML output
    "ml_risk": 0.0004,                    // Raw gradient boosting probability
    "ml_drivers": [                       // SHAP contributions, ranked by |value|
      {"feature": "energy_star",     "contribution": -3.63, "value": 10.0},
      {"feature": "peer_score",      "contribution": -2.41, "value": 0.073},
      {"feature": "log_ghg",         "contribution": -1.75, "value": 6.66},
      {"feature": "year_built",      "contribution": -0.67, "value": 1961.0},
      {"feature": "ll97_penalty_2030_log", "contribution": -0.61, "value": 11.42}
    ],

    // Weather-normalized diagnostic tier (ConEd-aligned methodology)
    "diagnostic_risk": "Medium",          // High / Medium / Low / Uncertain
    "decline_trend_label": "stable",      // accelerating / decelerating / stable
    "decline_acceleration": null,
    "uncertain_reason": null,
    "n_years_data": 2,

    // Peer & permit signals
    "peer_score": 0.073,                  // Share of geographic neighbors showing attrition
    "dob_jobs": 0,                        // Count of recent DOB HVAC/boiler permits
    "log_dob_jobs": 0.0,

    // Steam share of building emissions
    "steam_ghg_share": 0.501              // Fraction of GHG attributable to steam
  }
}
```

**Coverage note:** `eui`, `energy_star`, `ll33`, `peer_score` are ~100% covered. `diagnostic_risk` is 100%. `decline_acceleration` requires 3 years of data (only 422 of 1,210 buildings). `ml_risk` is 100% covered.

### 4c. `yoy_deltas.json` — weather-normalized YoY change

```jsonc
{
  "1 CENTRAL PARK SOUTH": {
    "steam_2022": 43283115,           // Raw kBtu, LL84 reported
    "steam_2023": 41431096,
    "steam_2024": 44879798,
    "norm_2022": 43209533.7,          // HDD-normalized to Central Park 30-year average
    "norm_2023": 42827323.94,
    "norm_2024": 46158872.24,
    "raw_delta_22_23": -4.28,         // Percent change, raw
    "raw_delta_23_24": 8.32,
    "norm_delta_22_23": -0.88,        // Percent change, weather-normalized
    "norm_delta_23_24": 7.78,
    "outlier_22_23": false,           // 1.5x IQR outlier flag
    "outlier_23_24": false,
    "hdd_2024_provisional": false     // True if 2024 HDD data is not yet final
  }
}
```

### 4d. Other files (used less, but exist)

- `yearly.json` — raw steam by year, no normalization
- `building_regression_results.json` — per-building HDD/CDD regression for 24 NYCHA buildings with monthly data (this is the small subset where we have ConEd-methodology-grade normalization)
- `noaa_degree_days.json` — Central Park HDD/CDD reference data
- `decline_trend_results.json` — the decline acceleration methodology + per-building values

---

# 5. The ML stack (what the model can and can't tell you)

Three layers. It's important the redesign doesn't oversell any of these — the analyst will lose trust in the tool if we imply certainty we don't have.

### Layer 1 — K-means clustering (unsupervised)

Groups the 1,210 buildings into 5 **customer archetypes** based on age, size, use type, and energy intensity. Every building gets exactly one cluster. The clusters have names and a coarse High/Medium/Low risk label.

| Cluster | Name | Population | Coarse risk |
|---|---|---|---|
| 0 | Pre-War Active — Permit-Driven Churn | 269 | High |
| 1 | Mid-Size Post-War — Moderate Signal | 189 | Medium |
| 2 | Pre-War Stable — Low Signal | 242 | Low |
| 3 | Large Commercial — Capital Mobilized | 263 | Medium |
| 4 | Low-Compliance Commercial — Quiet Attrition | 247 | High |

**What clusters are for:** a lens for the analyst. "The building I'm looking at is in the Pre-War Active cluster, which typically shows permit-driven churn — I should check DOB filings."

**What clusters are NOT for:** the primary risk signal. A cluster label is not a prediction.

### Layer 2 — LL97 penalty calculator (deterministic)

For each building, computes annual dollar penalty under NYC Local Law 97:

```
penalty = max(0, actual_GHG - floor_area × intensity_limit) × $268/ton CO2e
```

Two versions: `ll97_penalty_2024` (current period 2024–2029) and `ll97_penalty_2030` (tighter caps kick in). This is not a model — it's a mechanical calculation from the statute. The intensity limits are pulled from the LL97 rules by building use type.

Some buildings face six-figure or seven-figure annual penalties. That is a strong reason to convert off steam.

### Layer 3 — Gradient boosting attrition classifier (supervised)

The headline `risk` and `ml_risk` fields come from this model.

**Training data:**
- **Positive class (churners):** 57 buildings with observed ≥50% steam demand drop between LL84 filings
- **Negative class (stayers):** 989 buildings with no measurable demand signal
- **Excluded from training:** 209 buildings with moderate drops (predicted on but not learned from)

**Features (8 total, in order of importance):**
1. Energy Star score (19%)
2. GHG emissions intensity (14%)
3. Peer score — nearby buildings showing decline (13%)
4. Steam demand size (13%)
5. LL97 2030 penalty (11%)
6. Year built (11%)
7. DOB permit activity (9%)
8. LL97 2024 penalty (6%)

**Performance:** AUC 0.645 on cross-validated data. This is a **weak-but-non-random ranking signal.** It correctly ranks a real churner above a non-churner about 64.5% of the time. It is not a validated production classifier.

**What SHAP tells you:** for any individual building, we can decompose the score into per-feature contributions and tell the analyst which signals pushed the score up or down. This is what the "WHY THIS SCORE" panel shows.

### Layer 4 — Weather-normalized diagnostic tier (rule-based)

**This is the layer that most closely matches ConEd's own internal methodology.** It uses per-building or citywide HDD/CDD normalization to compute weather-adjusted YoY steam change, then applies rule-based tiering:

- `n_years_data < 2` → **Uncertain** (254 buildings)
- Normalized delta 23→24 < −30% → **High** (233 buildings)
- Normalized delta 23→24 between −30% and −10% → **Medium** (483)
- Normalized delta 23→24 ≥ −10% → **Low** (240)

This is the `diagnostic_risk` field. It's a defensible, transparent tier — no black box, no ML — and it's the number we should lean on when talking to ConEd about methodology alignment.

### Honest limitations Fable 5 should know

- The ML model was trained on buildings that had **already dropped ≥50%** — the positive class is late-stage churn, not early warning. Model performance on early-stage attrition is unmeasured.
- We have no ground truth. We can't tell you our precision or recall on real disconnects — ConEd hasn't shared those records yet.
- Weather normalization is citywide (Central Park HDD), not per-customer. ConEd's internal method uses per-customer HDD+CDD regression on billing-period data.
- Peer score is geographic contemporaneous co-occurrence, not a validated leading indicator.
- 57 positive-class training examples is small.

The redesign should surface **confidence and provenance** honestly. If a building's score is High because of the ML model at AUC 0.645, the analyst deserves to see that qualifier. If it's High because of the diagnostic rule (which is transparent), that's a stronger claim and should read differently.

---

# 6. What ConEd asked for that we haven't shipped

David Caiafa and the ConEd team gave us specific product asks during workflow-scoping calls that the current UI does NOT address. The redesign should incorporate these.

1. **Per-building "reasoning report"** — a printable PDF/HTML per building showing why the model flagged it, in plain language. This is the artifact the analyst attaches to CRM notes when they justify an outreach. Should include the SHAP drivers, the LL97 exposure, the peer context, and a written narrative generated by an LLM. The narrative should cite specific values for THIS building, not boilerplate.
2. **Emailed weekly digest** — a scheduled email sent to each analyst/account manager with the top-N buildings in their territory that need attention this week. Should include enough detail to skim without opening the dashboard.
3. **Feedback loop** — the analyst should be able to mark a building "contacted," "confirmed at-risk," or "false positive." These labels become future training data.
4. **Familiar export formats** — CSV, Excel, PDF. ConEd analysts work in Outlook and Excel. If they can move a report into a spreadsheet or attach it to an email, they will use it. If they can only export a bare CSV, they mostly won't.

---

# 7. What the current UI got wrong (why we're redesigning)

The current dashboard is a functional read-only console that shows every field the model produces. It has these problems:

1. **No "what changed" surface.** The analyst sees the same static snapshot every Monday. No delta feed, no "new since your last visit."
2. **No workflow state.** No contacted / dismissed / assigned tracking. The analyst has to remember where they left off.
3. **Four different aggregations of the risk cohort at the top of the screen**, none agreeing with each other (5 archetype tiles, a diagnostic strip, an alert summary, and a KPI row). This creates cognitive overhead before the analyst can start work.
4. **No focal point.** Every band on the screen has the same visual weight. There's no dominant element the analyst's eye lands on.
5. **The Building Panel is a right-side drawer at ~400px wide.** Too cramped to be the workspace it should be. Charts inside it are cropped and one (steam trend) is visibly broken.
6. **Color has no discipline.** Orange/red/purple/yellow/teal all in play, each meaning different things in different contexts.
7. **Alerts don't describe events.** Every entry says "Critical Severity 100% · 16m ago." Nothing tells the analyst what actually triggered THIS alert vs. any other.
8. **No emailed reports, no per-building PDF, no workflow-state artifacts.** The only export is a bare CSV button.
9. **No map view.** The peer signal is geographic, ConEd territories are geographic, but there's no spatial UI.
10. **No single-building timeline.** The panel shows current state but not the history — permits, ownership changes, YoY drops on one time axis.

---

# 8. Redesign scope and constraints

**The core reframe:** shape the UI around the analyst's week, not around the model's output.

**Proposed information architecture (this is what we're designing together):**

- **This Week** (landing) — delta feed, my queue, portfolio pulse, "compose weekly digest" CTA
- **Portfolio** (browse) — table/map/cluster views, workflow-state columns, saved segments
- **Building Case File** (promoted from the drawer) — full-page workspace with narrative, timeline, chart, cohort, action bar
- **Reports & Export** — weekly digest composer, per-building PDF, scoped CSV/XLSX export

**Design principles for you (Fable):**

- **Rhythm, not uniformity.** Different bands should have different densities. A workbench area feels different from a summary area.
- **One severity ramp.** Green → amber → red → deep red. Every risk-communicating element uses this ramp. Actions use a separate accent. Everything else is neutral.
- **Show confidence.** When we display a score, we should also show the layer it came from (ML gradient boosting AUC 0.645, or transparent diagnostic rule) so the analyst can weight it appropriately.
- **The analyst reads by squinting.** Typography hierarchy should hold up when the analyst is scanning quickly. Weight + opacity + tracking, not just size.
- **Density modes.** "Workbench" for daily use, tight and information-dense. "Presentation" for demos and screen-sharing, looser and more legible from a distance.
- **Explicit workflow state.** Every building has a status: unreviewed / in review / contacted / confirmed at-risk / false positive / dismissed. Status is visible and filterable.
- **Every export is one click plus one scope choice.** The analyst should never wonder how to get data out.

**Constraints:**

- React 19 + Vite 8 + Tailwind 4 stack. Component library is homegrown (small).
- Deployed on Railway, behind a password gate (basic auth) until we have real SSO. Don't design for anon access.
- Data refresh is not real-time. The dashboard reads static JSON files updated when Ismael's pipeline runs. That's OK — the analyst doesn't need sub-minute freshness — but "16m ago" timestamps should reflect the actual pipeline run.
- The team is 3 people and the ConEd sponsor demo is a recurring pressure. We can redesign ambitiously but the implementation must be feasible for one front-end (Edwin) to build over a few weeks.
- The tool is decision-support, not authoritative. All strings and UI should reinforce that it's a screening layer for human judgment, not a black-box verdict.

---

# 9. What we're asking you (Fable) to do

You'll be helping Edwin think through:

1. The **overall information architecture** — do the four proposed views hold up, or is there a better shape?
2. The **This Week landing** — this is the first-thing-you-see surface and it doesn't exist yet
3. The **Building Case File** — the workspace that today is a cramped drawer
4. The **weekly digest email** — the format ConEd will actually receive
5. The **per-building PDF/HTML report** — the artifact the analyst attaches to CRM notes
6. The **visual language reset** — severity ramp, typography, spacing rhythm, density modes

Come with opinions. Push back on anything in this brief. Ask about anything that's unclear. If a proposed pattern feels defaulted, propose the crafted version.

The current build is not sacred. If a whole section should be replaced or removed, say so. If you want to see specific files (component code, existing CSS) before proposing, ask and Edwin will pull them.

---

# 10. One-liner brief for context-limited tools

> A React web dashboard for ConEd steam operations analysts that scores 1,210 Manhattan steam customers for attrition risk using a K-means archetype cluster, a rule-based diagnostic tier from HDD-normalized YoY steam demand, and a gradient boosting classifier (AUC 0.645, 8 features, SHAP drivers per building) — with LL97 penalty exposure computed from the statute; being redesigned to shape the UI around the analyst's weekly workflow (what changed → who to call → what to say) instead of the model's output, and to ship the emailed digest + per-building reasoning PDF that ConEd explicitly asked for and the current build doesn't have.
