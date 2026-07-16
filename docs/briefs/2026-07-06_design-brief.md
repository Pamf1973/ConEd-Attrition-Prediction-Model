# ConEd Steam Attrition Dashboard — Design Brief

**Companion docs:**
- `docs/ref/2026-07-06_client-notes.md` — what the client actually said (source of truth for purpose)
- `docs/briefs/2026-07-06_fable-context-brief.md` — model + product context for external review
- `docs/notes/2026-06-03_working-notes.md` — working notes on methodology and roadmap

---

## 1. Voice (Step 1)

### References

- **Bloomberg Terminal** — professional workbench, monospace density, muted palette, respects the analyst's time and screen real estate
- **Linear** — command-bar restraint, discoverability, hierarchy through weight and opacity rather than color
- **Superhuman** — AI embedded inside the primary interaction (not a floating chatbot beside it), with a keyboard-first middle ground between click and type

### Anti-references

- **Datadog** — flashy metric walls, saturated color for its own sake
- **Vercel marketing** — polished, gradient-forward, sells rather than works
- **Notion / ClickUp** — friendly, playful, illustration-heavy — reads as "project view," not "decision support"
- **Generic chatbot dashboards** — floating helper widget in the corner, AI as a mode rather than a substrate

### Diagnosis of the current build

The current build reached for Bloomberg but imported its **assumption of shared expertise** without earning it. Two mismatches:

1. **Density without anchoring.** Bloomberg surrounds a P/E number with ticker, sector median, and historical range. Our build showed the number alone — no unit, no peer, no direction. Density without context is crowded, not professional.
2. **Workbench posture for a review + justification tool.** Bloomberg users act on price with the market as ground truth. ConEd analysts open the tool weekly and must justify recommendations to managers and account teams — with a model that has AUC 0.645 and no ground truth. Every recommendation needs its methodology alongside it, always visible, not buried in a tooltip.

Bloomberg was the right **instinct** (serious, dense, respects the analyst) but the wrong **application** (assumed expertise, no methodology surface, no discoverability).

### Synthesis (one sentence)

> **This feels like a Bloomberg Terminal that explains itself — the seriousness and monospace density of a professional workbench, the discoverability and command-bar restraint of Linear, and Superhuman's pattern of embedding AI inside the primary interaction rather than beside it. Every recommendation carries its methodology in the same view. Not a chatbot dashboard, not a Datadog metrics wall, not a Notion-friendly project view, not a marketing-polished Vercel surface.**

### Three dimensions this synthesis carries

1. **Bloomberg-anchored:** dense, serious, monospace numerics, muted palette — but every number gets its context (unit, peer, direction).
2. **Linear + Superhuman approach:** command bar for queries, buttons for the top 3–5 known Monday questions, AI embedded in the review flow — no floating helper.
3. **Methodology-visible spine:** recommendation, drivers (SHAP), and caveats coexist on the same surface, hierarchy communicated by weight and opacity.

---

## 2. Capability inventory (Step 2)

What the stack + data actually support today. Every design idea downstream must land against something in this section.

### Stack

- **Frontend:** React 19 + Vite 8, code-split via `React.lazy` with a session-storage reload dance to survive Railway chunk-hash changes.
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite`). Colors are **inline hex literals** scattered through components (`#030D1A`, `#001748`, `#082244`, `#0041A8`, `#E87722`) — there are no design tokens or CSS variables today. Any real system work needs to introduce tokens.
- **Charts:** Recharts 2.15 — currently used for a line chart in `BuildingPanel`, a histogram, and a scatter. Recharts is our chart primitive; anything more exotic (sparklines in tables, small multiples, custom axes) needs to be built with SVG.
- **API:** Express 5 with `helmet`, `express-rate-limit`, bearer-token session auth (100 req/min general, 20/min AI, dedicated login + export limiters).
- **LLM providers wired:** Anthropic + Groq + OpenRouter. Endpoints already present: `/api/query` (natural-language → FilterSpec, client-side applied), `/api/summarize`, `/api/explain`, `/api/alerts/proactive`, `/api/export/csv`, `/api/watchlist/*`, `/api/meta`.
- **Test surface:** Vitest + Testing Library + jsdom. Not a design constraint but means we can refactor components without flying blind.
- **Deploy target:** Railway single container (Node serves API + built Vite assets). No CDN in front today.

### Data (1,210 active steam customers)

Four JSON sources joined client-side by uppercased address key in `useBuildings.js`:

- **`buildings.json`** (207 KB) — 1,210 rows. Fields: `address`, `bbl`, `lat`, `lon`, `steam` (kBtu, 2024), `gas`, `ghg`, `yr` (year built), `use` (property type), `risk` (legacy heuristic).
- **`buildingEnrichment.json`** (1.1 MB) — the meat. Every field's coverage across the 1,210 rows:

  | Field | Coverage | Notes |
  |---|---|---|
  | `ml_risk` | 100% | Gradient boosting score, 0–1 |
  | `ml_drivers` | 100% | Top-5 SHAP: `{feature, contribution, value}` |
  | `cluster_id` / `cluster_name` | 100% | 5 archetypes, roughly balanced (189–269 each) |
  | `diagnostic_risk` | 100% | High 19% / Med 40% / Low 20% / Uncertain 21% |
  | `ll97_penalty_2024/2030` | 100% | Dollars, computed from GHG cap |
  | `dob_jobs` | 100% | DOB job filing count |
  | `n_years_data` | 100% | 1–3 |
  | `decline_trend_label` | 100% | stable / declining / accelerating |
  | `peer_score` | 87% | Attrition zone percentile |
  | `energy_star` | 70% | 0–100 |
  | `ll33` | 70% | Letter grade |
  | `eui` | 47% | kBtu/sqft |

- **`yoy_deltas.json`** (475 KB) — HDD-normalized YoY changes. **The uncomfortable coverage story:** `norm_delta_22_23` covers 743/1,210 buildings (61%); `norm_delta_23_24` covers only 422/1,210 (**35%**). Two thirds of the customer set have no fresh trend signal. This is the honesty the UI must carry — most rows are "we can't tell you what changed this year."
- **`yearly.json`** (86 KB) — raw steam values by year for the LineChart.
- **`decline_trend_results.json`** (227 KB) — trend labels; already merged into enrichment.

### Derived at read time

- `sc_class` — Service Class estimated via a rule in `useBuildings.js` (SC-1 through SC-5, all suffixed `*` = estimated). This is inferred, not authoritative.
- `signal` — `big_drop` / `mod_drop` — YoY signal band.
- `has_ml_risk` — falsy means the row falls back to the legacy heuristic; the UI needs to visibly distinguish these.

### Component surface today

15 components, 2,735 lines. Notable:

- `RiskTable.jsx` (630 lines) — the primary view. Search, sort, filters, row selection, watchlist toggle.
- `BuildingPanel.jsx` (399 lines) — right-side detail. **Already implements the methodology-transparency spine** we need: SHAP driver rows with inverted log/log1p formatters mapping feature → real-world unit (`log_ghg` → MT CO₂e, `ll97_penalty_2030_log` → dollars). This is the design pattern to generalize, not throw away.
- `AIAgent.jsx` (385 lines) — the natural-language + example-button pattern already exists. Two modes (`filter` / `explain`), simple-mode toggle, curated example queries. The Superhuman-style command bar we're aiming for is a **refactor of what's there**, not a new build.
- `ClusterExplorer.jsx`, `YoYScatter.jsx`, `RiskHistogram.jsx` — the exploration views.

### Constraints for the redesign

- **Auth model:** bearer token in `sessionStorage`. Any new endpoint needs the same `requireAuth` gate.
- **Refresh cadence:** buildings/enrichment are static JSONs baked into the container. Alerts poll every 60s. Not real-time — a weekly review cadence, which fits the analyst's Monday-morning workflow.
- **Build size:** currently code-split per tab. Adding heavy libs (e.g., d3, mapbox) blows budgets; SVG-native is preferred.
- **Ground truth we don't have:** no attrition labels. AUC 0.645. `ml_risk` is a ranking, not a probability. The UI has to communicate this without hedging into uselessness.
- **What the "buttons vs. type" pattern can lean on:** the `/api/query` endpoint already returns a FilterSpec that gets applied client-side. Buttons for the top 3–5 Monday queries can route through the same endpoint with a canned prompt — no separate code path needed.

### Design-idea → capability check

| If we want to… | Do we have the data / stack? |
|---|---|
| Show "why this score" for any row | Yes — `ml_drivers` at 100% coverage |
| Show "what changed last year" | Only for 35% of buildings — treat as first-class UI state |
| Rank buildings by risk | Yes — `ml_risk` at 100% |
| Cluster-first navigation | Yes — 5 archetypes, 100% coverage |
| Cross-year YoY trend chart | Only for buildings with ≥2 years — check `n_years_data` |
| Command-bar natural-language filter | Yes — `/api/query` already returns FilterSpec |
| Quick-action buttons routed through the same NL layer | Yes — same endpoint, canned prompts |
| Persistent methodology surface | Yes — `ml_drivers` + `n_years_data` + `uncertain_reason` + `diagnostic_risk` all present |
| Map view (lat/lon in data) | Data yes — no map lib in bundle; would need to add or defer to sister `coned-3d-map` project |
| Sparklines in table rows | `yearly.json` present — need to hand-roll SVG (Recharts too heavy in a cell) |
| Confidence indicator per recommendation | Partial — no per-row confidence today; can derive from `n_years_data` + `uncertain_reason` |
| CSV export of any filter | Yes — `/api/export/csv` exists |
| Email-report generation (ConEd ask) | **Not yet built** — no endpoint, would need new backend work |


---

## 3. Design research (Step 3)

Returned by the design-researcher pass. Bloomberg / Linear / Superhuman are already on the reference list from Step 1 and were excluded here so the five below stretch the tradition rather than repeat it.

### 3.1 Five references

**1. Palantir Foundry — operational analytics workbench for enterprise decisions**
URL: https://www.palantir.com/platforms/foundry/
What it does right: Every recommendation surfaces its lineage — the "Object View" pins entity metadata, contributing datasets, and analyst annotations in the same frame as the ranked list, so an operator justifying a call has provenance one glance away. Typography weight (not size or color) drives hierarchy inside dense tables, and the "Actions" panel embeds decisions (assign, flag, send-to-workflow) into the object rather than into a separate console.
What NOT to copy: The chrome-heavy sidebar taxonomy and enterprise iconography — feels bureaucratic, would drown a weekly-cadence analyst.

**2. Retool — internal-tool primitives for operator interfaces**
URL: https://retool.com/products/retool
What it does right: The "table + inspector" pattern (list on left, full record with editable fields and audit trail on right) is exactly the "which building / why / what do I say" split. Dense monospace-adjacent tabular numerics, muted grays with a single accent reserved for state changes, and inline action buttons scoped to a row rather than global toolbars.
What NOT to copy: The drag-and-drop builder aesthetic bleeding into shipped apps (grid gaps, generic card wrappers).

**3. TradingView — chart-first analytical terminal for retail and pro traders**
URL: https://www.tradingview.com/chart/
What it does right: Every number on screen is anchored — direction arrow, delta since prior period, unit, and comparison peer sit inline with the value. The command bar (Ctrl+K) is the primary navigation for a 10,000+ instrument universe — same order of magnitude as 1,210 buildings. Dark neutral canvas with reserved semantic color (red/green only for direction, never decoration).
What NOT to copy: The maximalist multi-pane layout — too many simultaneously-live streams for a weekly review tool.

**4. Are.na — editorial, monospace-forward knowledge tool (challenge pick)**
URL: https://www.are.na
What it does right: Proves that mono-type + generous whitespace + a single neutral palette can feel serious and considered without going dark-Bloomberg. Hierarchy comes entirely from position and weight; no card shadows, no accent gradients. Useful counterpoint: the reasoning-report artifact ConEd wants (defendable, readable, printable) leans more editorial than terminal.
What NOT to copy: Its browsing-mode looseness — no decision surface, no ranking, no state.

**5. Boeing 787 EICAS / flight deck engine-monitoring page — physical decision-support instrument**
URLs: https://www.boeing.com/commercial/787/by-design/flight-deck · https://skybrary.aero/articles/engine-indicating-and-crew-alerting-system-eicas
What it does right: Persistent methodology visible on the primary surface — every parameter shows current value, target band, and out-of-band alert simultaneously, so a pilot never has to leave the display to justify an action. Color is rationed brutally (amber = caution, red = warning, everything else neutral). Hierarchy is by position, not decoration.
What NOT to copy: The alarm-driven interaction model — analysts aren't in a cockpit; a weekly review is not an emergency.

### 3.2 Three anti-references

**1. Salesforce Sales Cloud — CRM opportunity dashboard**
URL: https://www.salesforce.com/sales/analytics/
Why it fails: Frames every entity as a pipeline opportunity with a close-date and dollar value — exactly the "sales opportunity" framing David explicitly ruled out ("steam is wholesale, not retail"). Card grids, decorative gradients, and hero KPI tiles crowd out the methodology layer that has to stay visible.

**2. Domo — executive BI dashboard**
URL: https://www.domo.com/product
Why it fails: Optimized for executive scanning, not analyst justification — huge KPI numbers with no unit anchoring, no peer comparison, no methodology footprint. The "one accent color used for everything" pattern collapses the risk signal into the same visual weight as filters and chrome.

**3. Datadog APM dashboards**
URL: https://www.datadoghq.com/product/platform/
Why it fails: Real-time metric wall optimized for on-call incident response, not weekly deliberation. Every panel screams for attention with saturated color, cramming twenty simultaneously-live series onto one screen. Analysts here need one thing at a time with context, not twenty things with none.

### 3.3 Current conventions in analyst / decision-support tools

- **Left nav rail + top action bar.** Prevalence: ~90%. **Invert.** Analyst has one job per session; a persistent nav rail is dead pixels. Use a command bar (Ctrl+K) and top-N tabs for the three Monday questions instead.
- **Hero KPI tiles at top of dashboard.** Prevalence: ~80%. **Ignore.** ConEd's analyst is not scanning aggregates; they're triaging 1,210 rows. Lead with the ranked list, not summary tiles.
- **Filter chips above the data grid.** Prevalence: ~85%. **Adopt.** But scope them to the three questions (What changed / Who to call / Defensible signals) — not to every column.
- **Row-click opens right-side inspector panel.** Prevalence: ~60%. **Adopt.** This is the natural home for methodology, drivers, and the draft outreach email — the "explains itself" spine.
- **Dark theme with saturated accent (teal/violet).** Prevalence: ~70% in "AI analytics." **Invert.** Go neutral (light or muted dark) with one reserved accent for the risk signal only. Saturation is a trust-killer here.
- **Chatbot pane docked to the right or bottom.** Prevalence: rising fast (~50% of 2025+ analytics tools). **Ignore.** AI belongs embedded in the row (Superhuman pattern) — draft the reasoning report inline, don't open a chat.

### 3.4 Three "generic AI dashboard" features to avoid

1. **Dark navy #0A0E27 canvas with rounded-2xl cards, subtle glassmorphism blur, and a teal/violet gradient accent used on primary buttons, active nav items, and the hero KPI number simultaneously.** This is the ChatGPT-prompt default for "AI analytics dashboard" and reads as generic before an analyst reads a word.
2. **Hero KPI stack: `1,210` in 48px extra-bold, `Total Buildings` in 11px uppercase gray letter-spacing-widest label beneath it, centered in a card with equal padding all sides, and a green `+3.2%` pill next to it with no reference period, no unit, and no comparison peer.** Every number needs anchoring; decorative KPIs actively teach the analyst to distrust the tool.
3. **A right-docked "Ask AI about this data" chat drawer with a gradient send button, suggested-prompt chips ("Summarize risks", "Explain this building"), and a typing indicator.** The AI should draft the reasoning report inline in the row inspector, not live in a sidecar chat that requires the analyst to re-specify context they already have on screen.

### 3.5 One-sentence research summary

*"The design should feel more like a **Palantir Foundry object view fused with a TradingView terminal and printed on Are.na editorial stock** than like a **Salesforce pipeline dashboard**, adopt the **row-click-to-inspector pattern** but invert the **left nav rail and hero KPI tile conventions**, and deliberately avoid the **dark-navy-plus-teal-accent-plus-right-docked-chatbot** default that a naive AI prompt would produce."*

---

## 4. Anti-reference (Step 4)

A concrete prose description of what a naive AI prompt for "modern dashboard for a Con Edison steam attrition prediction model" would produce. We are explicitly NOT building this. Every element is written pixel-specific so we can point at it and reject it.

### The generic version, described

**Canvas.** Dark navy #0A0E27 with subtle radial gradient darkening toward the corners. Cards on top are `#0F1633` with `rounded-2xl` corners, a 1px `#1E2A4A` border, and a faint glassmorphism blur behind them. Body font Inter, `text-slate-300`, all card content centered-aligned with equal padding on all sides.

**Top nav.** Fixed 64px-tall bar. Left: a `⚡` emoji in a teal circle next to "ConEd Steam AI" in gradient text (teal-to-violet). Center: pill-shaped tabs with the active tab in solid teal — "Dashboard", "Buildings", "Analytics", "Insights", "Settings" — no hierarchy between them, no keyboard hints. Right: an avatar bubble, a bell with an unnecessary red dot, and a gradient "Upgrade Plan" button that would have no meaning in this context but that the prompt drafts anyway.

**Hero KPI strip.** Four evenly-spaced cards across the top of the landing view:
- `1,210` — "Total Buildings" — extra-bold 48px number, tiny uppercase gray letter-spaced label beneath. No unit anchor, no peer, no timeframe.
- `73%` — "Model Accuracy" — same treatment. Number is decorative, not truthful (AUC 0.645 doesn't translate to "73% accuracy").
- `$2.4M` — "Total LL97 Exposure" — same treatment. Impressive-looking, actionable to no one.
- `↑ 12%` — "Attrition Risk Trend" — green pill, no reference period, no explanation of what the 12% is measured against.

**Main content.** A three-column grid of `rounded-2xl` cards on a dark navy background — a doughnut chart of "Buildings by Risk Level" with a bright teal → violet → orange gradient, a horizontal bar chart of "Top 10 At-Risk Buildings" with the same gradient, and a leaflet map with red-purple heat blobs and no legend. Every card has the same shadow, the same padding, the same header treatment. Nothing dominates because the visual grammar refuses to let anything dominate.

**Ranked list.** A `Buildings` sub-page with a table where every column is centered, alternating row stripes in `#131A38`, and a "status" pill in every row (red/amber/green) that carries the same visual weight as the address. The only "why" available is a `View Details →` link in the last column. Numbers are proportional-width digits so `1,210` and `72,800` don't align vertically. No unit next to any value.

**Row detail.** A modal that pops over the list with a big fade backdrop. Inside: a hero header with the address in 32px extra-bold, a big teal "Risk Score: 82%" ring, three tabs — Overview / Metrics / History — and a bright "Ask AI 🤖" button in the top-right that opens a chat drawer.

**AI surface.** A right-docked drawer titled "AI Assistant." Suggested prompt chips at the top: "Summarize this building", "Explain the risk score", "Compare to peers". A typing indicator with three dots. Send button in the same teal → violet gradient. Every response comes back as prose in a bubble, with no way to promote a chat answer into the row inspector where it would actually be useful.

**Chart treatment.** All charts are Recharts defaults with a bright rainbow palette. Tooltips are Recharts' default black-with-white-text and appear on hover. Legends are always shown, even when redundant. Axes are unlabeled because the prompt didn't think about units.

**Copy.** Chirpy and vague. Empty state on the watchlist reads "No buildings yet! ✨ Add your first building to get started." Loading states say "Analyzing your data...". Error states say "Something went wrong 😕. Please try again."

### Why this fails for the ConEd brief

- **Hero KPIs teach the analyst to distrust the tool.** `73%` and `$2.4M` sit in the same visual language as a marketing site. The analyst has to defend model calls to managers — a decorative accuracy figure that doesn't correspond to the real AUC actively poisons that defense.
- **The row → modal → chat pattern breaks the justification workflow.** The analyst has to click three times (row, tab, ask-AI) to get from "this building is at risk" to "here is why I'd tell a manager." A row-click-to-inspector with SHAP + caveats visible on open is one click.
- **Chatbot as sidecar means context has to be re-specified.** The analyst is already looking at 240 Central Park South; a chat drawer that asks them to re-name it in prose is a step backward.
- **Density masquerading as breathability.** Three-column cards with equal padding pretend the analyst is browsing. They are not — they are triaging 1,210 rows. A ranked list dominates the screen or the tool doesn't work.
- **Rainbow palette collapses signal.** Teal, violet, orange, green, and red all used decoratively means red as risk carries no more weight than green as "background chrome." The signal that most matters is the one most easily lost.
- **Copy tone insults the user.** "Analyzing your data ✨" is written for someone shopping software. The analyst is a professional inside a utility. Copy has to sound like a colleague, not a marketing intern.
- **No methodology surface anywhere.** Nowhere on this generic version does the AUC, the coverage gap (35% of buildings missing 23→24 delta), the SC-class caveat, or the `n_years_data` caveat appear. The tool that ConEd asked for makes those visible; this one hides them.

### What we are NOT building — one sentence

*A dark-navy, rounded-card, gradient-accented, chatbot-in-a-drawer, hero-KPI-strip AI dashboard whose visual grammar treats every element as equally important and whose copy tone treats the analyst as a shopper.*

---

## 5. Design system extraction (Step 5)

*See `system.md` once produced.*

---

## 6. Wireframes (Step 6)

*To be populated.*

---

## 7. Component build (Step 7)

*To be populated.*

---

## 8. Audit (Step 8)

*To be populated.*

---

## Fable check-in log

- **Check-in #1 (voice gate, after Step 3):** pending
- **Check-in #2 (structure gate, after Step 6):** pending
- **Check-in #3 (treatment gate, after Step 7):** pending
