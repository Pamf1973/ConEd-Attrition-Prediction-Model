# Pedro — Frontend Build Brief

**From:** Edwin
**Date:** 2026-07-14
**Purpose:** Your milestone-by-milestone build brief for the ConEd Steam Attrition redesign integration. This file is the shim between the design system (`system-v1.1.md`), the roadmap (`docs/ref/2026-07-16_ed_ref_fable-roadmap.md` + `roadmap-supplement-m0.md`), and the codebase (`CLAUDE.md`). If you find a conflict between this brief and any of those three, the canonical docs win — flag it in Slack and I'll fix this brief.

**Read first, before touching code:**
- `CLAUDE.md` — repo layout, dev commands, API contract, file map, legacy discipline
- `system-v1.1.md` — laws (L, H, R, W, D, C, M), copy rules, components table
- `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` — full milestone list with dependencies
- `roadmap-supplement-m0.md` — M0 pre-work you own

Everything below quotes acceptance criteria verbatim from those docs. Where a rule number appears (L1, W3, §7 rule 8, etc.), the canonical text is in `system-v1.1.md` — do not paraphrase.

---

## Your milestones at a glance

| Milestone | What you ship | Depends on | Pair with |
|---|---|---|---|
| M0 | Legacy separation + `/legacy` routing | nothing | — |
| M3 | Score cell in Rankings table | M0 done; M1 for final chip copy | — |
| M4 | Case-file header (build) | M3, M1 | Edwin (copy strings) |
| M5 | Print stylesheet + PDF mechanics | M4, M1 | Edwin (lead) |
| M8 | Queue + modifier filter chips + Critical membership | M3, M6 for subtraction line | — |
| M9 | This Week landing assembly | M7, M8, M6, M1 | — |
| M11 | Queue aggregate view (toggle) | M8 stable in use | — |
| M12 | Compose UI | M9, M5, M1 | Edwin (lead) |

Do them in this order unless a canonical dependency slips.

---

## M0: Legacy separation + routing

**Full spec in `roadmap-supplement-m0.md`. Summary here for convenience.**

### What ships
Current build preserved under `src/legacy/` at the `/legacy` route. New-build entry at `/`. AIAgent.jsx archived to `src/legacy/components/`. Router introduced (does not exist today — see `CLAUDE.md` §Frontend architecture).

### Steps
1. Install a router. React Router DOM is the natural fit (already common in the ecosystem). Add to package.json.
2. Create `src/legacy/` and copy the components/pages the new build will replace. Fix import paths inside the legacy subtree.
3. Move `AIAgent.jsx` to `src/legacy/components/AIAgent.jsx` and any imports it depends on.
4. Create a `src/legacy/App.jsx` (or equivalent) that renders the archived tab-based dashboard exactly as it works today.
5. In `src/main.jsx` or a new `src/routes.jsx`, wire the router: `/` renders a new-build shell (a stub at first — becomes the workflow-focused shell as M3 lands), `/legacy` renders the legacy App.
6. Verify Vite dev server and production build both handle SPA routing. Add a fallback in `vite.config.js` if needed.

### Acceptance criteria (from `roadmap-supplement-m0.md`)

1. Router registers `/` (new build) and `/legacy` (archived dashboard).
2. Every component the new build will replace has been copied to `src/legacy/` with imports fixed inside the subtree.
3. `AIAgent.jsx` lives at `src/legacy/components/AIAgent.jsx` and is rendered only from the legacy entry. **New-build code never imports AIAgent.**
4. `CLAUDE.md` §Legacy dashboard discipline rules are respected (no cross-imports, legacy frozen, `/legacy` unlinked).
5. No nav entry to `/legacy` from the new build. URL access only.
6. Shared backend endpoints untouched — `/api/explain`, `/api/data/*`, static file serving all work for both surfaces.
7. Deploy verification: `/` and `/legacy` both render on Railway after M0 ships.

### Files you touch
- `package.json` (add `react-router-dom` or equivalent)
- `src/main.jsx` — router wiring
- `src/App.jsx` — becomes new-build shell (initially a stub; grows with M3+)
- `src/legacy/` — new subtree
- `src/legacy/App.jsx` — mirrors current App.jsx behavior
- `vite.config.js` — SPA fallback if needed

### Do not
- Do not merge legacy and new-build code paths anywhere.
- Do not add a link to `/legacy` from the new build.
- Do not modify AIAgent.jsx logic during the move — copy verbatim.

### Branch
`pedro/M0-legacy-separation`

---

## M1 dependency note (not yours)

M1 is Ismael's + Edwin's. It ships `model_meta.json` and rewires `server.js:585` and `:867`. Your M3 through M12 render copy templated from `model_meta` per `system-v1.1.md` §7 rules 8 and 9. **You can start M3 before M1 lands** — Fable's M3 explicitly allows interim chip copy that swaps to `model_meta`-templated strings when M1 ships. When you see a chip or ledger line that will be templated, hardcode a `"validation rerun in progress"` interim string per rule 8 and mark it with `// M1: templated from model_meta.model_version` comment.

---

## M3: Score cell into the Rankings table

**Spec source:** `system-v1.1.md` §5 Components (Score cell row); the Spec 1 HTML atom in `fable-checkin-1-2026-07-12/`. Read the HTML atom before coding — it is the canonical visual reference.

### What ships
The Spec 1 atom replaces the current score column in the Rankings table. Binding migrates from `risk`/`riskTier()` (in `src/data/useBuildings.js`) to `percentile-of-ml_risk` + `diagnostic_risk`. The "100% High" wall dies here. All percent signs on the model score die here.

### Acceptance criteria (from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M3, verbatim)

- **L1** (no percent sign on the score, percentile ordinal).
- **L2 as amended** (tick and tier word from `diagnostic_risk`; ML percentile never colors).
- **L3 as amended** (divergence marker fires on two-tier promotions only — base Low to final High, n=176).
- **L4** (chip = `model_meta.model_version` + validation status, never a numeric AUC per §4.4).
- **L5 / §4.5** (four freshness chip states render: `Δ '24 -34%` solid, `Δ '23 only` dashed muted, `no adjacent-yr Δ` dashed muted, Uncertain handled by the tier). Chip copy locks after M2's residual naming.
- **L6 refinement:** case-file scale renders "among the top 52 by model score" inside the quasi-tie block (≥0.99 ml_risk, 52 rows); percentile ordinal stays for cells outside the block. In the table (row scale), rank display is fine.
- **S4** (Uncertain state) renders for the 254 rows using `uncertain_reason` and `n_years_data`. This is a *change* from Round 0 where S4 was "unreachable."
- **S5** (legacy heuristic) is present in the component but flagged "unreachable against current data." Never a headline number (§7 rule 7).
- **Legacy `risk` field** renders nowhere as a headline number.

### Six states of the score cell (from Spec 1)

The cell has six states, all of which the component must handle:

1. **Concordant fresh** — ml_risk high, diagnostic_risk high, fresh Δ'24. The unremarkable case.
2. **Divergent** — base Low → final High promotion (two-tier). Marker fires.
3. **Stale** — no fresh Δ'24, latest is '23 or non-consecutive.
4. **Uncertain** — S4, from Uncertain gates (`n_years_data < 2`, NYCHA R² < 0.3, missing ml_risk). Bind to `uncertain_reason` for the copy.
5. **Legacy** — S5, ml_risk missing entirely. Flagged unreachable but the component supports it. Value slot shows "est."
6. **Verified** — filled chip variant (Phase 2, when XGB v2 back-tested lands).

### Fields you consume (from `buildingEnrichment.json`)

- `ml_risk` (float 0–1, 100% coverage today) → compute percentile ordinal
- `diagnostic_risk` (string: "High"/"Medium"/"Low"/"Uncertain") → tier word + tick color
- `n_years_data` (int) → Uncertain gate
- `uncertain_reason` (string) → S4 copy
- `ml_drivers` (list of 5 {feature, contribution, value}) → not rendered in score cell; used in M4
- Modifier flags (`outlier_23_24`, `outlier_22_23`, `decline_trend_label`, `ll97_over_2024`, `ll97_over_2030`) → freshness/modifier chip inputs
- `norm_delta_23_24`, `norm_delta_22_23` → freshness state derivation

### Files you touch
- New: `src/components/ScoreCell.jsx` (or `src/next/components/ScoreCell.jsx` — pick one convention and stick with it)
- Modify: the RiskTable replacement component that renders rows — call it `src/components/RankingsTable.jsx` in the new build

### Do not
- Do not render `risk` (legacy heuristic) as a headline anywhere.
- Do not put a numeric AUC in the provenance chip (§4.4).
- Do not fake precision inside the quasi-tie block (L6).

### Branch
`pedro/M3-score-cell`

### PR description template
```
Ships M3: Score cell into the Rankings table.

Acceptance criteria met (docs/ref/2026-07-16_ed_ref_fable-roadmap.md M3):
- [x] L1 — no percent sign on model score; percentile ordinal
- [x] L2 amended — tick/tier from diagnostic_risk; percentile never colors
- [x] L3 amended — DIVERGE marker on two-tier promotions only
- [x] L4 — provenance chip from model_meta.model_version (interim: "XGB v1 · UNVAL")
- [x] L5 / §4.5 — four freshness states render
- [x] L6 refinement — quasi-tie block renders block membership at case-file scale
- [x] S4 renders for 254 Uncertain rows
- [x] S5 unreachable-flagged, never a headline
- [x] §7 rule 7 — legacy `risk` never rendered as headline

Deviations: <none / or list>
Interim copy pending M1: <list any templated strings hardcoded>
```

---

## M4: Case-file header (build)

**Spec source:** `system-v1.1.md` §5 Components (Claim ledger, Driver row, Narrative slot, Status segment rows) + Spec 2 HTML atom.

**Pair with Edwin** — Edwin owns the ledger and caveat copy strings. You own the component structure, layout, interaction, and wiring.

### What ships
Replaces `src/components/BuildingPanel.jsx` in the new-build routes. Case-file header contains:
- Identity row (address at Space Grotesk display size)
- Claim ledger (three columns: queue position, tier with chain, coverage — H2)
- Driver band (five driver rows with real-unit values from `ml_drivers`)
- Narrative slot (dashed frame; static in M4, drafting arrives in M5)
- Read-only status segment (six workflow states visible but not interactive until M6)

### Acceptance criteria (from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M4, verbatim)

- **H1** — a ledger, not a hero. No giant score treatment.
- **H2** — every claim shows its math. Ledger middle column labeled **"Tier · ML base + trend/statute modifiers"** with the §4.1 chain summarized underneath.
- **H3** — direction by position, not color. Driver bars use position (up/down) as primary encoding; color secondary.
- **H4** — values over abstractions. Driver row shows real-unit values (`ml_drivers[n].value` with unit) plus signed contribution.
- **Three fresh-column variants render** (from §5 claim ledger note): `Δ '24`, `Δ '23 only`, `no adjacent-yr Δ`.
- **AUC line templated per §7 rule 8** verbatim (interim: "validation rerun in progress"; post-M2: full sentence).
- **L6 refinement inside the block:** "among the top 52 by model score" — not "#4 of 1,210".
- **Driver band grounded:** `ml_drivers` carries raw values; contributions rendered as signed magnitudes without unit claims; `peer_score` label reads "share of cluster showing attrition signals, same period" (non-causal, per §5 Driver row note).
- **Diagnostic fields ship where they exist:** decline trend label, regression R² (NYCHA only). These land in the coverage column of the ledger.
- **Status segment read-only until M6.** Do not fake local state. Render as visible but not interactive.

### Fields you consume
Everything M3 consumes plus:
- `ml_drivers` — five entries, each `{feature, contribution, value}`. Render feature as plain-language label (Edwin provides mapping); value with unit; signed contribution as diverging bar.
- `decline_trend_label` (string: "accelerating"/"decelerating"/"stable"/null)
- Regression R² (in `building_regression_results.json` for NYCHA only)
- `peer_score` (float, if present)

### Narrative slot (M4 scope)
Dashed frame with placeholder copy Edwin provides. Provenance line renders `model_meta.model_version` + review status. Dotted-underline citations resolve to on-page claims once M5 lands.

### Files you touch
- New: `src/components/CaseFileHeader.jsx` (or `src/next/`)
- New: `src/components/ClaimLedger.jsx`, `src/components/DriverRow.jsx`, `src/components/NarrativeSlot.jsx`, `src/components/StatusSegment.jsx`
- Retire: `src/components/BuildingPanel.jsx` from the new-build routes (stays in `src/legacy/` per M0)

### Do not
- Do not make the status segment interactive in M4. It ships read-only.
- Do not free-form generate narrative prose in M4 — the narrative slot is a designed empty frame with Edwin's copy.
- Do not label the driver row's `peer_score` causally.

### Branch
`pedro/M4-case-file-header`

---

## M5: Print stylesheet + PDF mechanics (pair, Edwin leads)

**Spec source:** `system-v1.1.md` §5 Report sheet row + Spec 3 HTML atom.

You own the print stylesheet and PDF plumbing. Edwin owns content, template, and exhibit copy.

### What ships
The reasoning report as a printable HTML page + PDF. One layout, two outputs (browser print + Puppeteer server-side render, per Fable M5 recommendation).

### Your acceptance criteria (technical portion)

- **R3 grayscale-safe.** Every color choice must survive black-and-white print. Verify with a b/w print test before submitting PR.
- **R2** — page one is the argument, page two is exhibits only. Use CSS `@page` rules and `page-break-*` to enforce.
- **Puppeteer or fallback.** Recommendation stands per Fable M5: Puppeteer against print stylesheet, one HTML page yields both preview and PDF. If Puppeteer install is blocked on Railway or adds >100 MB, fall back to browser print-to-PDF and mark the pipeline milestone deferred.
- **Print stylesheet at `src/styles/report-print.css`** or via a scoped Tailwind class layer.
- **PDF endpoint** (if Puppeteer ships): `GET /api/reports/:reportId.pdf` behind `requireAuth`, streams the PDF, caches for 24h.

### Files you touch
- New: `src/pages/ReportPage.jsx` (renders the report HTML)
- New: `src/styles/report-print.css` (print-only stylesheet)
- New: `api/pdf.js` (Puppeteer wrapper) if pursuing that path
- Modify: `api/server.js` if adding a `/api/reports/:reportId.pdf` route

### Branch
`pedro/M5-report-print-stylesheet` (paired PR with `edwin/M5-report-content`)

---

## M8: Queue + modifier filter chips + Critical membership

**Spec source:** `system-v1.1.md` §4.6 Modifier chips + §5 Queue row + Spec 4 HTML atom.

### What ships
The Spec 4 queue as a component on the Rankings surface. Critical v1.1 membership computed from existing fields (client-side is fine; can move to API later). Counted filter chips per §4.6.

### Acceptance criteria (from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M8, verbatim)

- **Critical membership** matches Ismael's Q3 filter exactly:
  ```
  ml_risk ≥ 0.6 AND norm_delta_23_24 IS NOT NULL
    AND (outlier_23_24 OR outlier_22_23 OR decline_trend_label == "accelerating")
  ```
  Verify against the 23 buildings; top of queue: **660 Madison Ave, 200 E 42nd St, 58 W 58th St**.
- **Chip counts equal the rows the chip opens** (§4.6, W3). This is the whole point — never let them disagree.
- **Modifier chips:** `Outlier Δ · n`, `Accelerating · n`, `Modifier-promoted · 176`, `Critical · 23`.
- **With M6 present**, W4 arithmetic renders in public: `"23 Critical − n contacted − n dismissed = n to review"`. **Without M6**, ship membership and chips only, no subtraction line, no carry-over ages, and say so plainly ("Contacted / dismissed state lands with the write path").
- **Queue rows embed the M3 score cell.**

### Fields you consume
All of M3's fields plus modifier flags (already listed).

### Files you touch
- New: `src/components/Queue.jsx`
- New: `src/components/ModifierChip.jsx` (reuses Spec 4 chipbtn component)
- Modify: `src/data/useBuildings.js` — add memoized selectors for Critical membership + modifier counts

### Branch
`pedro/M8-queue-modifier-chips`

---

## M9: This Week landing assembly

**Spec source:** `system-v1.1.md` §5 Portfolio pulse + Event row + Spec 4 HTML atom.

### What ships
Spec 4 assembled: topbar (with `model_meta.run_date` anchor and last-review marker), delta feed from `events.json`, the M8 queue, portfolio pulse (only portfolio-scale aggregation), empty state.

### Acceptance criteria (from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M9, verbatim)

- **W1** — both time anchors from `model_meta.run_date` and the last-review marker. No relative time.
- **W2** — feed renders the event grammar (kind tag, subject, verb, evidence, action link).
- **W3 as amended** — pulse is the only portfolio-scale aggregation. The queue aggregate view (M11) is a render mode, not a second aggregation.
- **W4** — the queue does its arithmetic in public.
- **W6** — buttons/chips primary, ⌘K (command bar) secondary.
- **Pulse ships without WoW parentheticals** until a second diffed run exists. Explicit placeholder ("First diffed run: awaiting second snapshot" or similar).

### Empty state
The landing must read honestly without `events.json`. If M7 slips, render the designed placeholder per `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M7 graceful degradation.

### Files you touch
- New: `src/pages/ThisWeek.jsx`
- New: `src/components/Topbar.jsx`, `src/components/DeltaFeed.jsx`, `src/components/PortfolioPulse.jsx`
- Modify: routing to make `/` (new build) render ThisWeek

### Branch
`pedro/M9-this-week-landing`

---

## M11: Queue aggregate view (toggle)

**Spec source:** `system-v1.1.md` §5 Queue aggregate view + Gate A note 3.

### What ships
List | Aggregate toggle on the queue. When Aggregate is selected, the queue renders as count tiles, modifier co-occurrence pairs, and LL97 penalty-magnitude bands — **all computed over the currently filtered rowset**, never the population.

### Acceptance criteria (from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` M11 + `system-v1.1.md` §5)

- **W3 as amended:** every figure derives from exactly the visible rows.
- **Header states** filter expression, row count, run stamp.
- **No portfolio-scale baseline** appears inside the view.
- **M1 / M3 hold:** population = the stated filter; no causal verbs.
- **LL97 renders as penalty bands**, never the boolean count (§4.6).
- **Default view is List.**

### Files you touch
- Modify: `src/components/Queue.jsx` — add toggle
- New: `src/components/QueueAggregateView.jsx`

### Branch
`pedro/M11-queue-aggregate-view`

---

## M12: Compose UI (pair, Edwin leads)

**Spec source:** `system-v1.1.md` §5 Digest email + Spec 5 HTML atom + §6 D1-D6, C1-C3.

You own the compose UI. Edwin owns content, templates, and the finding paragraph.

### Your acceptance criteria (UI portion)

- **C1** — numbers injected, never generated. Locked token pattern per ledger #14 (fallback is plain textarea with trust — acceptable for v1 and must be documented as such).
- **C2** — edit is locked-token editing. Use a spike per ledger #14; if the spike fails, ship plain textarea.
- **C3** — send minimally: mailto/clipboard v1, no SMTP.
- **D6** — plain-text twin ships with every draft.

### Files you touch
- New: `src/pages/Digest.jsx`
- New: `src/components/ComposeEditor.jsx`

### Branch
`pedro/M12-compose-ui` (paired PR with `edwin/M12-digest-content`)

---

## Branch & PR flow (durable)

- Branch: `pedro/M<n>-<slug>` per milestone. One PR per milestone where possible.
- PR description **must list** which acceptance criteria are met (quote each or ✓ each), which laws are respected, and any deviations with justification.
- **Never `--no-verify`** on commits or `--force` on push. Investigate hook failures.
- Push to `main` deploys to Railway automatically. Verify `/` and `/legacy` both render post-deploy.

---

## What NOT to do (durable)

- Don't invent copy strings that aren't templated from `model_meta.json` (rule 8, rule 9). Interim strings are fine, but mark them with a comment.
- Don't change tier vocabulary (§4). "High/Medium/Low/Uncertain" are the only tier words. Never introduce "rule-based" or "diagnostic rule" language.
- Don't touch backend files (`api/*`) without pairing with Ismael.
- Don't import from `src/legacy/` in new-build code (M0 boundary rule).
- Don't render `risk` (legacy heuristic) as a headline number (§7 rule 7).
- Don't put numeric AUC in a chip (§4.4). AUC lives in ledger + methodology page footer only.
- Don't use relative timestamps ("2 hours ago"). Vintage or analyst-anchor only (§7 rule).
- Don't use em dashes in product copy. Periods, commas, restructure. Middle dot for inherited em dashes (cluster names).
- Don't add features not in the roadmap. If you see something you think should be built, Slack me — don't scope creep the PR.

---

## Cross-references quick index

| Need | Look in |
|---|---|
| API contract (which endpoints exist) | `CLAUDE.md` §Backend architecture |
| Which fields are on each building | `buildingEnrichment.json`; `CLAUDE.md` §Data pipeline |
| Exact copy for AUC line | `system-v1.1.md` §7 rule 8 |
| Exact tier vocabulary + hybrid chain | `system-v1.1.md` §4.1 |
| Score cell six states | `system-v1.1.md` §5 Score cell row + Spec 1 HTML |
| Modifier chip vocabulary | `system-v1.1.md` §4.6 |
| Freshness chip states | `system-v1.1.md` §4.5 |
| Provenance chip vocabulary | `system-v1.1.md` §4.4 |
| M6 Postgres schema | `system-v1.1.md` §9 + `ISMAEL-RESPONSE-2026-07-13.md` Q7 |
| Legacy discipline | `CLAUDE.md` §Legacy; `roadmap-supplement-m0.md` |

---

## Ping me if

- A canonical doc contradicts another canonical doc.
- An acceptance criterion is ambiguous.
- You find a field on a building record that this brief didn't list but seems relevant.
- Puppeteer install blows up on Railway (M5 fallback decision).
- The chipbtn component in the existing codebase doesn't match Spec 4's visual — flag it, don't invent a new one silently.

Fable does not answer implementation questions. I do.
