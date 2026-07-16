# ConEd Dashboard — Next Week Pivot · Strategic Brief
**Audience:** internal team + presentation-builder AI agent
**Target:** official ConEd presentation, week of 2026-06-15
**Constraint:** ~5 working days, full team focused, AI-accelerated. Achievable but tight.

---

## 0 · The pivot in one paragraph

Today's build is **LL97-forward**: the headline UI is dual-period carbon gauges and a SHAP risk explanation. David's guidance — backed by Johan's methodology spec and Ildi's per-customer framing — is to flip the hierarchy. The next iteration is **k-means-forward**: archetype is the lens, supervised ML is the engine that ranks within archetype, LL97 is one supporting signal among several, and the output is a **target-client list** for ConEd's relationship team rather than a compliance scoreboard. The pivot is a re-hierarchy, not a teardown — most of the engine stays; the framing, the navigation, and several panels change.

---

## 1 · What changes, what stays, what's new

### 1a · Stays (the engine is fine)

| Component | Why it stays |
|---|---|
| K-means clustering (5 named archetypes) | This is now the **lead**, not a hidden field. Already on all 1,210 buildings. |
| Gradient Boosting Classifier + SHAP TreeExplainer | Still the ranking engine. AUC ~0.65 is useful for tiering, not point estimates. |
| YoY analysis with citywide HDD multiplier | Coarse baseline. Stays as the population-level outlier flag. |
| LL97 dual-period gauges | **Demoted, not deleted.** Becomes a per-building detail inside BuildingPanel, not the headline. |
| WHY THIS SCORE card (SHAP drivers) | Now reads as "what's moving *this customer* away from its archetype baseline." |
| Watch List + CSV export | Recast as the **target client list**. Same UI, new framing. |
| AI Agent | Stays as an exploratory query layer. Move to a secondary tab. |
| Helmet / auth / rate-limit infra | No change. |

### 1b · Changes (re-hierarchy, language, demotion)

| Component | Before | After |
|---|---|---|
| Top-of-app framing | "ConEd Steam Attrition Dashboard · LL97 risk" | "ConEd Steam Customer Targeting · by archetype" |
| Default landing tab | Rankings table | **Archetype Landscape** (new — see §1c) |
| Rankings table headline columns | Address · YoY Δ · LL97 cap % · Risk | Address · **Archetype** · YoY Δ · Risk · LL97 cap % |
| BuildingPanel section order | LL97 gauges → WHY THIS SCORE → Peer/Portfolio | **Archetype badge + archetype context** → WHY THIS SCORE → YoY drift → LL97 gauges → Peer/Portfolio |
| Risk language | "Attrition risk" | "Drift-from-archetype risk" (or similar — TBD with team) |
| Tier set | High / Medium / Low (Uncertain missing) | High / Medium / Low / **Uncertain restored** (R² < 0.5 or < 3 yrs data) |
| Stats bar | "$81.9M in 2024 fines" | "5 archetypes · 1,210 customers · X% with elevated drift signal" |
| README first paragraph | LL97-forward | K-means + targeting-tool-forward; LL97 mentioned as one of several signals |

### 1c · New (built fresh this week)

| New component | What it does | Effort | Risk |
|---|---|---|---|
| **Archetype Landscape view** (new default tab) | Five archetype cards, each showing: count, mean intensity, mean LL97 exposure, **estimated archetype churn rate**, top 5 highest-risk buildings in the archetype | ~1 day UI + ~0.5 day data wiring | Medium — depends on churn rate being defensible (see §3 risks) |
| **Per-archetype churn rate** computation | Backend: for each archetype, what fraction of buildings show sustained YoY decline outliers? | ~0.5 day | Medium — small N per archetype, need confidence intervals |
| **Archetype badge** in BuildingPanel header | Top of panel: colored badge with archetype name + 1-line definition | ~0.5 day | Low |
| **Drift-within-archetype layer** (Johan's methodology) | Per-building approximation of HDD/CDD slope, intercept, R², slope stability — using public LL84 data | ~3 days backend + ~1 day UI | High — biggest workstream; see §2 |
| **Target Client List** export | Same as Watch List, but with archetype, drift drivers, suggested talking points columns | ~0.5 day | Low |
| **Uncertain tier** restoration | Buildings with R² < 0.5 or < 3 yrs LL84 data get a purple badge; excluded from ranking but visible | ~0.5 day | Low — was working before, now missing |

---

## 2 · The Johan diagnostic framework as "drift-within-archetype"

Johan's spec was the per-customer regression `usage_per_billing_day = β_HDD × HDD_per_billing_day + β_CDD × CDD_per_billing_day + intercept` plus adjustments (heating, cooling, billing-day) and diagnostic metrics (R², HDD slope stability, slope-intercept synchronization, decline trend acceleration).

In the next-week build, this becomes a **layer**, not the headline. The k-means archetype is what the customer-targeting team filters on; the diagnostic framework explains **why a specific customer inside an archetype is drifting**.

### 2a · Public-data approximation

| Johan metric | Public-data approximation | Confidence |
|---|---|---|
| Per-customer β_HDD, β_CDD | Annual LL84 site EUI vs annual HDD/CDD totals from NOAA Central Park, regressed across 3 yrs | Medium — annual granularity not monthly |
| Intercept | Regression intercept from same model | Medium |
| Billing-day adjustment | Skipped — LL84 is calendar-year, no billing periods | N/A |
| R² | Standard regression output | High |
| HDD slope stability | β_HDD year-on-year variance (only 3 yrs, so this is weak) | **Low** — flag as exploratory |
| Slope-intercept synchronization | Cross-check direction of β change vs intercept change | Medium |
| Decline trend acceleration | Δ(YoY delta) — second derivative of consumption | High |

### 2b · Where it surfaces in the UI

| Surface | What appears |
|---|---|
| BuildingPanel → new "Drift signals" section (below LL97) | R², β_HDD, β_CDD, trend acceleration. Each with a colored severity dot. |
| Archetype Landscape card | Mean R² for the archetype + count of low-R² (uncertain) members |
| YoY Trends tab | Replace generic scatter with **archetype-faceted** scatter — one mini-chart per archetype |

---

## 3 · Risks & open questions

| Risk | Mitigation |
|---|---|
| **Per-archetype churn rate has small N** (some archetypes <100 buildings) — confidence intervals will be wide | Show CI on the landscape card; for archetypes with N < 50, label as "directional" |
| **Cluster stability** — if we tweak features, archetype assignments shift, and any narrative about "Archetype X has 20% drift" breaks | Freeze the cluster model before the deck is built; commit the cluster output as a versioned artifact |
| **Public-data regression is annual, not monthly** — weaker than Johan's billing-period model | Explicitly label as "annual approximation"; position as "directional, not diagnostic-grade" |
| **Uncertain tier restoration** may change the headline tier counts again | Recompute the README stats post-restoration; don't lock copy until the data settles |
| **Scope creep** — every new view invites "while we're at it…" | Hard freeze on §1c list. Anything else is post-presentation. |
| **AI Agent local env** still needs LLM key | Either provision a key for demo, or pull the AI Agent tab from the demo path |

---

## 4 · Workstream breakdown (~5 working days)

### 4a · Backend / data (~5–6 days, parallelizable)

| Task | Effort | Owner candidate |
|---|---|---|
| Per-building regression on LL84 (β_HDD, β_CDD, intercept, R²) | 1.5 days | Data person |
| Per-archetype churn rate + CI | 0.5 day | Data person |
| Restore Uncertain tier logic | 0.5 day | Data person |
| Refresh cluster model + freeze artifact | 0.5 day | Data person |
| Drift-within-archetype scoring layer | 1 day | Data person |
| Wire new fields into `enrichment.json` | 0.5 day | Data person |
| Population-level diagnostic summary for archetype landscape | 0.5 day | Data person |

### 4b · UI (~3–4 days, parallelizable)

| Task | Effort | Owner candidate |
|---|---|---|
| Archetype Landscape view (new default tab) | 1.5 days | Edwin |
| BuildingPanel reorder + archetype badge | 0.5 day | Edwin |
| New "Drift signals" section in BuildingPanel | 0.5 day | Edwin |
| Rankings table column reorder + archetype column | 0.25 day | Edwin |
| Stats bar rewrite | 0.25 day | Edwin |
| YoY Trends archetype-faceted scatter | 0.5 day | Edwin |
| Target Client List export columns | 0.25 day | Edwin |
| README + framing copy rewrite | 0.25 day | Anyone |

### 4c · Critical path

```
freeze cluster → per-building regression → archetype churn rate → Archetype Landscape view
                                                                ↓
                                                     enrichment.json refresh
                                                                ↓
                                                     BuildingPanel new sections
```

UI can mock data for the first two days while the data layer catches up, then swap to live values.

---

## 5 · Demo narrative for next week (target end-state)

| # | Beat | What's on screen |
|---|---|---|
| 1 | Open with archetype landscape | New default tab: 5 archetype cards |
| 2 | Click into an archetype | Filtered Rankings table, only that archetype |
| 3 | Open a high-risk customer in that archetype | BuildingPanel with archetype badge top → WHY THIS SCORE → drift signals → LL97 (now demoted) |
| 4 | Contrast: same risk tier, different archetype | Two-customer comparison |
| 5 | YoY Trends archetype-faceted scatter | Drift patterns differ by archetype |
| 6 | Build a target client list | Add to Watch List, export with archetype + drift-driver columns |
| 7 | Methodology slide | "K-means lens + supervised ranking + drift diagnostics (HDD/CDD regression on LL84)" |
| 8 | Close on the workflow | "Monday morning: relationship team opens the export, sees who to call, knows why" |

---

## 6 · Coordination points with the team

| Decision needed | Who | By when |
|---|---|---|
| Final cluster count (stick with 5 or sweep again?) | Data lead | Day 1 |
| Risk language: "attrition" vs "drift-from-archetype" vs other | Whole team | Day 1 |
| Whether to surface Johan's diagnostic metrics as raw numbers or as severity dots only | Edwin + data lead | Day 2 |
| Whether the AI Agent tab survives into the demo path | Whole team | Day 4 |
| Final headline stats for the new stats bar | Whole team | Day 4 |

---

## 7 · What this pivot does **not** claim

- Does **not** claim parity with ConEd's internal methodology. We're approximating Johan's framework on public data; the deck should label it as such.
- Does **not** claim per-customer monthly granularity. LL84 is annual; this is a coarser instrument by design.
- Does **not** discard LL97 — it remains a per-building signal inside the panel, just demoted from the headline.
- Does **not** retrain the model from scratch. The classifier and SHAP layer remain as-is; only the **framing** and the **archetype-aware presentation** change.

---

## 8 · One-line summary for the AI agent building slides

> Build the next-week deck around the §5 narrative: archetype landscape → archetype filter → per-customer drift → target client export. The methodology slide should show three layers stacked: k-means lens (top, lead), supervised ranking with SHAP (middle), drift diagnostics from HDD/CDD regression (bottom, supporting). LL97 appears only as one of several per-building signals, never on a summary slide. The closing slide is the **Monday-morning workflow**, not a compliance metric.
