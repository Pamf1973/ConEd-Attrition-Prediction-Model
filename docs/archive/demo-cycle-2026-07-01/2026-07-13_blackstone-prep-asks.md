# David & ConEd — What They Asked For, and What We've Done

**Written by:** Edwin
**Date:** 2026-07-13
**For:** Pedro, Ismael
**Purpose:** Reconstructed list of what David and the ConEd team asked us for, most relevant to the in-person prep session at the Pursuit staff room (2026-06-22, two days before the Blackstone presentation). Consolidates asks from the intake form, David's PM-level guidance across the engagement, and the June 3 workflow-scoping calls with David. So we can divide and conquer for tomorrow.

**A caveat before you read:** I don't have a verbatim transcript from the 2026-06-22 staff-room session itself. This list is reconstructed from the docs we have — `CLIENT-NOTES`, `PROJECT_CONTEXT_2026-06-22`, `BLACKSTONE_PRESENTER_GUIDE`, `CONED_METHODOLOGY_ALIGNMENT`, and the ConEd intake form. If either of you remembers specific asks from that session that aren't below, flag them and I'll add them.

---

## 1. The core ask (from the ConEd intake form)

This is the official assignment language David has repeatedly pulled us back to when our framing drifted.

- [ ] **Trained ML model predicting steam customer drop-off risk** — Shipped. XGBoost classifier, 12 features, live in production.
- [ ] **Risk dashboard / visualization of high-probability drop-off customers** — Shipped. Rankings tab, BuildingPanel, Watch List, Alert engine.
- [ ] **List of significant predictive flags / signals** — Partial. Twelve features are documented in code and `xgboost_results.md`. SHAP top-5 per building is live. We do **not** have a portfolio-level artifact that says "here are the top signals across all high-risk buildings."
- [ ] **Documentation of underlying logic and accuracy benchmarks** — Partial. README, `docs/model-technical-spec.md`, `docs/xgboost_results.md` exist. The AUC we quote publicly (0.672) predates the XGBoost switch and needs a rerun.
- [ ] **Success benchmark: identify ≥70% of major usage drops in back-tested data** — Not answered. We report CV AUC 0.683 which is not the same claim. No dedicated back-test report at a threshold quantifying major-drop recall.

**Owner suggestion:** Ismael for the AUC rerun + back-test report. Edwin for the "top signals across portfolio" artifact. Pedro for the UI to surface it.

---

## 2. David's persistent PM-level framing (all through the engagement)

These are the reset moves David has made every time our internal framing drifted. Verbatim quotes are paraphrased where marked.

- [ ] **"Lead with K-means archetypes as the lens. Steam is wholesale, not retail."** — Landed in the deck (Slide 3 problem hook, Slide 5 ML structure).
- [ ] **"Pre-war co-op vs midtown tower — think about the archetypes."** — Landed in the archetype-first stack ordering (k-means → classifier → SHAP).
- [ ] **Honest framing over performance claims.** — David consistently pushed us away from overselling the classifier. Requires (a) the AUC number we cite matches the current model (see §1), and (b) we do not claim early-warning when the model is a profile-matcher on already-dropped buildings.
- [ ] **Reframe drift check: not a "sales opportunity" or "client targeting" tool.** — Landed in `PRESENTATION-SCRIPT-v3.md` and the reframing after `DEMO_TODAY_TACTICAL.md` drifted.

**Owner suggestion:** already reflected in current deck and script. Nothing new to divide unless we're re-cutting the deck for the September ConEd session.

---

## 3. Productization asks (from the June 3 workflow-scoping calls with David)

This is the most actionable client input we have on how the product should work. David spelled it out on two back-to-back calls on 2026-06-03. From `CLIENT-NOTES` §3, David-paraphrased:

- [ ] **Per-building reasoning report.** A generated artifact (PDF or printable HTML) per building, showing the model's reasoning in enough detail for a ConEd account manager to defend an outreach decision internally. Includes feature contributions, steam usage history, methodology footer, audit metadata. — **Not built.**
- [ ] **Email agent for proactive notification.** Periodic digest emails to account managers with top-N at-risk buildings in their territory, newly-triggered alerts (DOB permit filed, LL84 update, ownership transfer, LL97 threshold crossed), action buttons (mark contacted, confirmed at-risk, false positive). — **Not built.**
- [ ] **Feedback loop.** Every "mark contacted / confirmed / false positive" response becomes a labeled data point that feeds model retraining. — **Not built.**

**Blocking contradiction to flag internally:** `docs/project-scope.md` explicitly lists **as out-of-scope**:
> "Predictive alerts or automated email notifications"
> "CRM integration"

This directly contradicts David's June 3 asks. We need to decide before the September session: are these in scope for the August build, or do we tell David they're deferred?

**Owner suggestion:** Team decision — bring to next sync. If in scope, Pedro leads the report UI (per-building panel export), Ismael scopes the email infrastructure, Edwin owns the feedback-loop schema.

---

## 4. Methodology asks (from Ildi and Johan)

Ildi and Johan set the methodological bar that Blackstone punted on.

- [ ] **Weather-normalized YoY consumption analysis with statistical outlier identification** *(Ildi's framing).* — Partial. We have IQR outlier flags + citywide HDD multiplier. This is aligned with Ildi's bar but weaker than Johan's.
- [ ] **Per-customer HDD + CDD regression** *(Johan's spec).* — **Not built.** Citywide multiplier only. No CDD anywhere. `noaa_degree_days.py` shipped (Phase 1 of the plans/ roadmap); per-building regression only built for the 24 NYCHA developments where monthly data exists.
- [ ] **Diagnostic metrics suite (R², slope stability, slope-intercept sync, decline-trend acceleration)** *(Johan's spec).* — Partial. `decline_acceleration` and `decline_trend_label` fields shipped. `diagnostic_risk` field shipped. R² and slope stability not surfaced.
- [ ] **High / Medium / Low / Uncertain tier via rule-based thresholds** *(Johan's spec).* — Tier vocabulary matches. Uncertain tier is defined in data but empty / not surfaced in the UI. Assignment method is ML probability cutoff, not rule-based on diagnostic metrics.
- [ ] **"Repeatable pattern-based approach"** *(Johan's stated goal).* — This is the framing we should be shipping toward. Individual building scores are what we have; portfolio-level pattern surfacing (owner cohorts, permit precedence, ownership transfers, LL97 threshold crossings) is what Johan's language points at, and none of it is built.

**Owner suggestion:** Ismael owns the pipeline work (per-customer regression extension, R² / slope stability fields, rule-based tier assignment). Edwin owns the pattern-surfacing brief. Pedro owns the UI to expose diagnostic metrics and the Uncertain tier.

---

## 5. Pre-Blackstone (2026-06-22) meeting — reconstructed asks

These are the items where `PROJECT_CONTEXT_2026-06-22.md` (dated the day of the staff-room session) and `BLACKSTONE_PRESENTER_GUIDE.md` (dated the week before) suggest David's guidance was actively shaping the demo prep. Best-effort reconstruction — please correct or add.

- [ ] **The workflow line for the demo: filter → sort → save → export.** — Confirmed in `BLACKSTONE_PRESENTER_GUIDE.md` §5 ("This is the workflow line David wants on stage"). Landed in Pedro's demo closer.
- [ ] **Contrast demo building for the archetype pivot.** — `PROJECT_CONTEXT_2026-06-22.md` §7 flags this as an open thread. "Recommended: 432 Park Avenue (high risk, modern luxury, contrast to 1080 Fifth Ave Carnegie Hill pre-war)." Confirm with Ismael what was actually opened live.
- [ ] **Confirm the hospital (1283 York Avenue) with David before presenting.** — Largest revenue building in the High tier at ~$3.16M/yr. Either the best true positive or the most consequential false positive. Flagged in `BLACKSTONE-BUILD-STATE` §3 fixes. Was this raised with David at the 6/22 session? If yes, what did he say?
- [ ] **Reconcile the 52 vs 59 vs 58 vs 57 high-risk count.** — Different scoring paths produce different numbers. The demo screen showed 52; the CSV export said 59; the current XGBoost produces 57. Which number was locked at the 6/22 session for the deck?
- [ ] **Explain `ml_risk` vs `risk` if asked.** — The BuildingPanel does not surface `ml_risk`. Have a crisp one-sentence answer for why displayed scores top out at 81.6%.
- [ ] **`Driftwatch` name confirmation.** — Listed as open in `PROJECT_CONTEXT_2026-06-22.md` §7. Assume confirmed by demo day.
- [ ] **AI Agent fate in demo close.** — Kept with a "not running live, API key isn't loaded" dodge (per `BLACKSTONE_PRESENTER_GUIDE.md` §6c). Confirm that landed cleanly.

**Owner suggestion:** Edwin drafts the missing answers where they're not yet documented. Pedro and Ismael verify what actually happened in the room vs. what the pre-prep docs recommended.

---

## 6. Open questions for David that were not resolved before Blackstone

From `CLIENT-NOTES` §7. These are still open going into September and are worth raising at the next ConEd touchpoint if we don't get to them ourselves first.

- [ ] **NDA / data-sharing pathway.** Can Pursuit route through Sho Ohata as ConEd did for the Bidgely engagement? What does the anonymization process look like? Everything Phase 2 (real billing data) is blocked on this.
- [ ] **Methodology deep-dive with David.** He offered a walkthrough of prior prediction attempts. Not scheduled. Worth doing before we invest the ~5–6 days on Johan's framework.
- [ ] **LL97 penalty framing consistency.** Is our LL97 penalty calculation (LL84 self-reported GHG × $268/ton over cap) how ConEd thinks about LL97 pressure on customers?
- [ ] **Account manager → territory mapping.** For the email agent, who owns which buildings?
- [ ] **Email digest cadence and format.** Weekly? Daily for high-priority? Outlook plain-text vs HTML vs PDF attachment?
- [ ] **Territory-level access control on PDF reports.** Is the whole dataset visible to everyone at ConEd who has access, or gated by territory?
- [ ] **Which methodology label to lead with in the UI.** ML classifier tier, diagnostic rule-based tier, or both side-by-side?

**Owner suggestion:** Edwin owns the David-facing follow-up. Ismael contributes technical clarifications where needed.

---

## 7. Suggested divide-and-conquer for tomorrow

Rough cut. Push back if the shape is wrong.

### Edwin
- Draft the AUC-rerun spec so Ismael can execute it (what number to publish, on which cross-validation slice, using which threshold)
- Write the "top signals across the portfolio" artifact — SHAP importances aggregated across the High-tier population
- Own the David-facing follow-up on §6 open questions

### Ismael
- Rerun `ll97_model.py` end-to-end and record the current XGBoost AUC. Update `xgboost_results.md`.
- Confirm what the current build actually shows for the demo buildings (200 East 42nd, 7 Times Square) — HDD-normalized YoY bars vs raw
- Reconcile the high-risk count (52 vs 57 vs 58 vs 59). Pick one, document why.
- Scope the yearly-approximation Johan regression for the 1,186 non-NYCHA buildings — feasibility read, not implementation

### Pedro
- Verify the workflow line (filter → sort → save → export) still lands cleanly in the current build
- Surface the `Uncertain` tier in the RiskTable filter and the BuildingPanel badge
- Reconciliation caption in the BuildingPanel when `diagnostic_risk` ≠ `ml_risk` tier ("ML score and trend signal diverge — manual review recommended")

### As a team, before or after the tomorrow session
- Resolve the `docs/project-scope.md` contradiction with David's productization asks (reasoning report, email agent, feedback loop). Are these in the August build, deferred, or officially descoped?
- Decide which of the two demo buildings (or a new pair) is our September anchor

---

*This document reconstructs from written sources; if either of you recalls specific asks from David at the 2026-06-22 staff-room session that aren't here, flag them and I'll fold them in.*
