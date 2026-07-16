# ConEd Dashboard — Progress Tracker
**Started:** 2026-07-07
**Owner:** Edwin
**Purpose:** Rolling, editable snapshot of where the ConEd Steam Attrition (Driftwatch) build actually is, what's landed, what's open, what's blocking. Lives outside the team repo — this is Edwin's personal working index, not a team artifact.
**Cadence:** Update whenever a work item flips status or a new decision is made. Add a dated entry at the bottom of the Log section.

This is the first tracker doc. When a work item gets deep enough to warrant its own file, it gets its own sidecar and gets referenced here from the Open Work section.

---

## 1. Current state — 2026-07-07 synthesis

### The build in one paragraph

Driftwatch scores 1,210 Manhattan steam customers (LL84 filers below 90th Street) for attrition risk using a two-layer public-data pipeline: k-means clusters buildings into 5 archetypes, then an XGBoost classifier (upgraded from sklearn GBM in the June 25 push) ranks each building on 12 features. SHAP TreeExplainer writes per-building top-5 drivers into `buildingEnrichment.json` (`ml_drivers`). React 19 + Vite 8 dashboard consumes it. Live on Railway behind an auth layer. Blackstone presentation happened 2026-06-24; next milestone is a September ConEd meeting.

### Model performance on record

| Metric | Value | Source |
|---|---|---|
| XGBoost 5-fold CV AUC | **0.6833** | `docs/xgboost_results.md`, hyperparameter search |
| GBM baseline (pre-switch) | 0.6639 ± 0.1030 | Same source |
| AUC last recorded on production model | 0.672 ± 0.056 (v1.3) | Predates XGBoost switch — **needs rerun** |
| Positive class | 54 big_drop buildings | ≥50% YoY steam decline |
| Negative class | 949 no-signal | Stable / no measurable decline |
| Excluded | 207 mod_drop | Ambiguous middle — scored but not trained on |
| High-tier count (dashboard `risk` field) | 52 (was 58 in GBM era, 57 in XGBoost `ml_risk`) | Blackstone build state |

### The two-number problem — still live

Two risk fields, different scales, mostly disjoint high-tier lists:
- `risk` in `buildings.json` — rescaled/calibrated, displayed in UI, tops at 0.816
- `ml_risk` in `buildingEnrichment.json` — raw XGBoost output, 0.0002–0.9987

Only 1 building is in the High tier on both systems. Every "high-90s" number in exports refers to `ml_risk`, not the displayed `risk`. This is a known trap for stakeholder Q&A.

### Diagnostic risk tier — new since June

`update_enrichment_risk.py` produces a rule-based `diagnostic_risk` field alongside the ML score. Plus new fields on each enrichment record:
- `diagnostic_risk` — rule-based High/Medium/Low/Uncertain
- `decline_acceleration` — second-difference of YoY normalized deltas
- `decline_trend_label` — "accelerating" / "decelerating" / "stable" (⚠️ label may fire for +growth same as -decline; see open item)
- `n_years_data`
- `ml_drivers` — top 5 SHAP contributions

These fields ship but the UI reconciliation between `diagnostic_risk` and `ml_risk` is inconsistent (see 7 Times Square: `ml_risk`=0.0002 but `diagnostic_risk`=Medium).

### What Ismael landed in the June 25 push (21 commits)

- XGBoost migration (from sklearn GBM); `scale_pos_weight ≈ 17` replaces manual weight arrays
- SHAP drivers live and per-building
- Hotel LL97 cap corrected 0.01450 → 0.00987 (R-1 per §28-320.3.1(8))
- DiagnosticSection component in BuildingPanel
- TrendChart (recharts LineChart) with peer cluster median overlay + LL97 cap reference line — supersedes Edwin's YoY bar work
- ClusterExplorer component
- NOAA degree days pipeline (`noaa_degree_days.py`) — Phase 1 of the plans/ roadmap shipped
- Per-building weather regression (`building_weather_regression.py`) — Phase 2 partial
- Decline trend analysis (`decline_trend_analysis.py`)
- Loading skeletons for code-split components
- Railway deployment (Dockerfile, nixpacks.toml, railway.json)
- Security hardening (Helmet, express-rate-limit, auth)
- Smoke test scripts (`smoke_test.sh`, `smoke_test.py`, `api/smoke.test.js`)
- `docs/xgboost_results.md`, `plans/` directory with 7 planning docs

### Edwin's branch state (2026-07-01)

- `edwin/ll97-gauge-and-shap-drivers` (PR #7) — rebased onto main, force-pushed, 41/41 tests pass. **Waiting on Ismael to merge.**
- `edwin/ll33-and-steam-yoy-viz` — closed as superseded (LL33 grades already in main; YoY bars replaced by Ismael's TrendChart)

### Demo buildings locked for September

| Role | Building | ml_risk | LL97 2024 | LL97 2030 | Notes |
|---|---|---|---|---|---|
| High-risk anchor | 200 East 42nd Street | 0.9987 | $785,751 | $1,190,650 | Cluster 4. `big_drop` signal, −66% HDD-normalized YoY, decelerating |
| Low-risk anchor | 7 Times Square | 0.0002 | $0 | $0 | Cluster 4. Steam growing, but `diagnostic_risk`=Medium ⚠ |

Both in Cluster 4 (Low-Compliance Commercial — Quiet Attrition) — same archetype, opposite trajectories. Feature: not a bug.

---

## 2. Where the plans/ roadmap actually stands

Status of each Jul 1 plan doc:

| Plan | Status | Notes |
|---|---|---|
| `plans/plan.md` (Proactive Alert Engine) | ✅ Shipped | Bell badge + banner + panel live per June 22 project-context doc |
| `plans/improvements.md` | ✅ Mostly shipped | Skeletons, vendor chunking, XGBoost integration all landed. LLM fallback FAQ — status unverified. |
| `plans/optimization_plan.md` | ✅ Shipped | Reflected in smoke test results (timeout, cache, AbortController, retry-after) |
| `plans/phase1_noaa_pipeline.md` | ✅ Shipped | `noaa_degree_days.py` exists; need to verify JSON output present |
| `plans/phase2_methodology_alignment.md` | 🟡 Partial | `building_weather_regression.py`, `decline_trend_analysis.py`, `update_enrichment_risk.py` all exist. UI wiring per §6 — needs audit |
| `plans/phase2_per_building_regression.md` | 🟡 Partial | 24 NYCHA developments regressed; 1,186 remaining on citywide factors. Diagnostic tier live, R² surface — needs audit |
| `plans/phase3_ui_dual_tier.md` | 🔲 Not yet | Dual-badge / conflict indicator not confirmed in UI. This is where the 7 Times Square `diagnostic_risk`=Medium tension lives |
| `plans/kmeans_refocus.md` | 🟡 Partial | ClusterExplorer shipped; but LL97 sections were NOT removed from BuildingPanel (they're still central to the story for stakeholders). Treat this plan as superseded/paused — do not execute as written |

---

## 3. Open work — pre-September priority list

Numbered per `DEMO_BUILDINGS_LOG_2026-07-01.md` §5. Owners and status added.

### Must-do before September presentation

| # | Item | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Rerun `ll97_model.py`, record the real current AUC | Ismael (or Edwin) | 🔲 | 0.672 predates XGBoost switch. Real number is unknown. Blocks any "our AUC is X" claim on stage. |
| 2 | Resolve `diagnostic_risk` vs `ml_risk` inconsistency for 7 Times Square | Edwin | 🔲 | Inspect `decline_trend_label` logic — likely firing "accelerating" for +growth same as -decline. |
| 3 | Confirm HDD-normalized YoY bar rendering for 200 E 42nd | Edwin | 🔲 | Raw 2022→2023 went up; HDD-normalized shows −66%. Need to check what the panel actually paints in the live build. |
| 4 | Reconcile high-risk count (52 vs 58 vs 57) on the September slide | Edwin | 🔲 | Pick the current XGBoost `ml_risk` > 0.7 number (57 per smoke test), lock it, don't change without updating this doc. |

### High-value September additions

| # | Item | Owner | Status | Notes |
|---|---|---|---|---|
| 5 | Add Johan per-customer regression comparison slide | Edwin | 🔲 | One-slide alignment: what ConEd does vs what we do vs what each catches. Highest-credibility slide we can add. |
| 6 | Validate on 57 confirmed churners — show ranking distribution | Edwin + Ismael | 🔲 | Most direct validation story we have with public data. Show that the 57 known-churn buildings cluster at top of ranking in cross-validation. |
| 7 | HDD-normalize YoY bars throughout dashboard | Frontend | 🔲 | Tier 1 item #1 from June roadmap. Ismael's TrendChart may already handle this — verify vs. anywhere else in UI that still shows raw. |
| 8 | Surface `decline_trend_label` prominently in BuildingPanel | Edwin | 🔲 | More intuitive for non-technical audience than a probability. Field exists — just needs UI. |
| 9 | Add reconciliation caption where `diagnostic_risk` ≠ `ml_risk` tier | Edwin | 🔲 | "ML score and trend signal diverge — manual review recommended." Feeds directly into Phase 3 UI plan. |
| 10 | Per-building reasoning report (PDF or printable HTML) | TBD | 🔲 | Explicit June ConEd ask (David/Ildi/Johan). Turns demo into product. Blocked by scope contradiction with `docs/project-scope.md` — see §4. |

---

## 4. Known contradictions / blockers

### The Scope Contradiction (unresolved from June)

`docs/project-scope.md` explicitly lists as **out of scope**:
- "Predictive alerts or automated email notifications"
- "CRM integration"

ConEd's June calls explicitly asked for:
- Per-building reasoning report (PDF)
- Email agent for account manager digests
- Feedback loop capturing manager responses

Not resolved as of latest update. Needs to be raised at the next team sync before the September build lock. Decision needed: are these Phase 2.5 items, Phase 3 items, or officially deferred?

### The Two-Number Problem (persistent)

`risk` vs `ml_risk` in the UI vs. exports. If anyone in the September room references a specific CSV export number, you need the one-sentence explanation ready. See §1 for numbers.

### Trend label direction bug (candidate)

7 Times Square is labeled "accelerating" for steam growth (positive `decline_acceleration = +11.47`). If the logic doesn't distinguish acceleration-of-decline from acceleration-of-growth, the field name is misleading. Item #2 above.

---

## 5. Document index (source-of-truth files)

Most authoritative → least. Everything below is on local disk only unless flagged committed.

**Post-Blackstone snapshot & demo prep**
- `docs/archive/demo-cycle-2026-07-01/2026-06-23_blackstone-build-state.md` (2026-06-23) — model + build state going into Blackstone
- `coned-dashboard/DEMO_BUILDINGS_LOG_2026-07-01.md` (committed) — locked demo buildings + methodology critique + September checklist
- `docs/notes/2026-07-01_ismael_build-update.md` — the 21-commit merge summary + PR #7 status

**Living context**
- `coned-dashboard/PROJECT_CONTEXT_2026-06-22.md` (committed) — full decision brief for anyone picking this project up cold
- `docs/notes/2026-06-03_working-notes.md` — original working notes, still authoritative for methodology critique but predates XGBoost switch
- `docs/notes/2026-06-22_pattern-findings.md`, `docs/notes/2026-06-23_story-timeline.md`, `docs/research/2026-06-04_threshold-proximity-analysis.md` — analytical sidecars from June

**Planning docs (all `coned-dashboard/plans/`, 2026-07-01)**
- `plan.md` — proactive alert engine (shipped)
- `improvements.md` — 5-item improvement bundle (mostly shipped)
- `optimization_plan.md` — 4 pipeline fixes (shipped)
- `phase1_noaa_pipeline.md` — NOAA HDD/CDD pipeline (shipped)
- `phase2_methodology_alignment.md` — full methodology bundle (partial)
- `phase2_per_building_regression.md` — per-building regression math + tier assignment (partial)
- `phase3_ui_dual_tier.md` — dual-badge UI (not yet)
- `kmeans_refocus.md` — LL97 removal plan (superseded, do not execute)

**Team-facing docs (`coned-dashboard/docs/`, committed)**
- `xgboost_results.md` — hyperparameter search results
- `model-technical-spec.md`, `PRD.md`, `project-scope.md`, `project-schedule.md`, `project-requirements.md`

**Presentation assets**
- `docs/archive/demo-cycle-2026-07-01/2026-06-23_presentation-final.html` (v6, delivered), scripts v2/v3 alongside
- `docs/briefs/2026-07-06_design-brief.md`, `docs/ref/2026-07-06_client-notes.md`, `docs/briefs/2026-07-06_fable-context-brief.md`, `docs/briefs/2026-06-23_deck-brief.md` — presentation planning materials

---

## 6. Update log

Append newest at bottom. Each entry: date, what changed, what's newly-open.

### 2026-07-07 — Tracker created
- Read the Jul 1 batch (plans/, DEMO_BUILDINGS_LOG, ISMAEL-UPDATE, xgboost_results) and the Jun 22 PROJECT_CONTEXT + Jun 23 BLACKSTONE-BUILD-STATE.
- Synthesized current state into §1–3. Phase 1 shipped. Phase 2 partial. Phase 3 not yet. Kmeans refocus superseded.
- No new work started. Open items enumerated in §3; blockers in §4.
- Ismael has not yet merged PR #7 as of the last local check (Jul 1).

### 2026-07-13 — Model-plan-for-Fable brief + Blackstone-prep-asks sidecars added
- Read `ConEd_intake_form.md` (verbatim). Compared build against intake ask. Two structural gaps beyond the Johan-methodology gap: (a) no back-test report against the ≥70% major-drops recall bar (we report CV AUC 0.683 which is not the same claim), (b) our positive training class is buildings that already dropped — the model is a retrospective profile-matcher, not the early-warning system the intake asks for.
- Created `docs/briefs/2026-07-13_model-plan-for-fable.md` — self-contained brief for Fable review: intake ask, current build, gap analysis, dual-layer plan (A: Johan diagnostic / B: external-pressure classifier / C: reconciliation UI), pattern-surfacing options, 10 sharpened questions.
- Created `docs/archive/demo-cycle-2026-07-01/2026-07-13_blackstone-prep-asks.md` — clean shareable checklist of what David / ConEd asked for at the pre-Blackstone Pursuit staff room meeting, structured for divide-and-conquer with Pedro and Ismael for tomorrow. Note: no direct transcript of the 2026-06-22 meeting exists in the docs; reconstructed from David-guidance quotes in `CLIENT-NOTES`, `BLACKSTONE_PRESENTER_GUIDE`, and `PROJECT_CONTEXT_2026-06-22`. Flagged for team confirmation.
- Also flagging: a stray `CLAUDE.md` in `/Users/Pursuit/Downloads/` contains FreshDirect grocery-app instructions and got surfaced through a system reminder during this session. Not related to ConEd. Recommend deleting or moving it so it doesn't get pulled in again.

## 7. Model plan going forward — for Fable review

Full detail lives in `docs/briefs/2026-07-13_model-plan-for-fable.md`. Recap here so this tracker stays a complete index.

### The structural gap Blackstone had to skirt

The intake form asked for **early-warning signals — before drops occur**, benchmarked at ≥70% recall in back-testing. Blackstone shipped a **retrospective profile-matcher** trained on buildings whose ≥50% LL84 drop already appeared in the public filing. The positive class = buildings that already dropped. We are not, structurally, answering the question ConEd asked.

### The dual-layer target architecture

- **Layer A — Johan-style per-customer diagnostic.** Per-building HDD+CDD regression → additive weather normalization → diagnostic metrics (R², slope stability, decline acceleration) → rule-based tier with Uncertain when R² < 0.5 or n_years < 3.
- **Layer B — External-pressure classifier (existing XGBoost, reframed).** Same 12 features, positioned as an *external-pressure* detector (LL97, DOB, ACRIS, peer patterns), not as a churn predictor.
- **Layer C — Reconciliation UI.** Agreement → single badge. Disagreement → "conflicting signals, manual review." The 7 Times Square case (ml_risk 0.0002 next to diagnostic_risk Medium) is exactly the shape this is meant to handle.

### Pattern-surfacing options we've barely pushed on

- Owner-cohort attrition share (ACRIS)
- Permit-activity precedence (HVAC filings leading attrition by N months)
- Ownership transfer as a triggering event
- LL97 threshold-crossing events
- Peer-block co-occurrence density (properly renamed and framed)

### Sharpening pressure

1. Label quality is the biggest lever. Real early warning needs ConEd disconnect records.
2. Yearly per-customer regression is 1–2 degrees of freedom — statistically thin.
3. We have not run the ≥70% recall back-test the intake asked for.
4. We have not surfaced patterns as an artifact — SHAP per building exists, portfolio-level "top signals" does not.
5. The two-number problem is a symptom of missing Layer C.

### The core Fable questions

- Is dual-signal + reconciliation the right shape, or should we collapse to one layer?
- Given the retrospective label, what's the case for unsupervised / anomaly-based approaches on the 209 discarded `mod_drop` buildings?
- Should the top-level artifact be a ranked list of *buildings* or a ranked list of *patterns*?
- If we can't hit the ≥70% back-test bar, what's the most honest reframe that still lands?
- Two focused weeks before September — Layer A, pattern surfacing, back-test report, or something else?

Full 10-question list in the Fable brief.
