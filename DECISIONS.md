# Decisions

<!-- distill-watermark: none | never -->

Append-only decision log. The why lives here, exactly once. STATE_LOG and ROADMAP reference decisions by ID, never repeat rationale.

Format:

## D1 | YYYY-MM-DD | <decision title>
Context: <what forced the choice, one to two lines>
Decided: <what was chosen>
Rejected: <what was not chosen and the one-line reason, if useful>
Affects: <roadmap IDs, modules>

---

## D1 | 2026-07-16 | Adopt build-ops state management for this repo
Context: Project had grown to 13+ milestone docs with no shared snapshot, no dependency graph, and state tracked only in user-level auto-memory (prone to staleness and not visible to teammates).
Decided: Install build-ops state management (PROJECT_STATE.md, ROADMAP.md, DECISIONS.md, DISTILLED_GOALS.md, STATE_LOG.md, SESSION_JOURNAL.md, HANDOFF.md, docs/ library). Canonical project state lives in these files, not in the auto-memory system. Auto-memory entries now point at repo docs as source of truth rather than duplicating content.
Rejected: Continuing with auto-memory as canonical (too fragile, not team-visible, drifts 41+ days between updates without enforcement).
Affects: All R-items (dependency graph source), PROJECT_STATE.md (team sync surface).

## D2 | 2026-07-16 | PR-9 split via Path A (9a/9b/9c) instead of bundled merge (Path B)
Context: PR-9 bundled R2 + R3 + R7-partial backend with W1/W4/W6 frontend on RiskTable.jsx and BuildingPanel.jsx, which R4/R5 will replace after Pedro's R1 lands. A bundled merge would freeze workflow features in src/legacy/ and force R9 to reimplement contact/dismiss + queue arithmetic from scratch.
Decided: Split into three PRs. PR-9a = R2+R3 backend (merges after Edwin FAQ copy pass). PR-9b = R7 status events backbone + security fixes (mergeable immediately, independent of R1). PR-9c = W1/W4/W6 frontend (parked until R1 lands, then Ismael rebases against new-build components).
Rejected: Path B bundled merge. Cheaper to merge now but pays the cost later in duplicated queue logic and legacy-freeze of demo-useful features.
Affects: R2, R3, R7, R9 (queue reuse of W4 arithmetic), PR-9 open on ismaelcaraballo-afk/coned-dashboard.

## D3 | 2026-07-16 | Edwin R1 contingency: absorb M0 legacy separation if Pedro has not started by end of 2026-07-16
Context: R1 (M0 legacy separation, Pedro) is unstarted and unblocks all Fable milestones R4 through R13 plus the PR-9c rebase. Confidence in Pedro delivering tonight is uncertain. Delaying R1 delays everything downstream and increases PR-9 boundary risk.
Decided: Wait for Pedro until end of 2026-07-16. If he has not started by then, Edwin absorbs R1 solo. Requires editing Pedro's checkpoint brief on GitHub + adjusting the Slack message already sent. Pedro remains owner of R4 through R13 either way.
Rejected: Immediately reassign R1 to Edwin (loses Pedro's onramp to the Fable arc). Reassign R1+R4+R5 wholesale (too much load on Edwin; Pedro's frontend depth needed for design implementation work).
Affects: R1, R4 through R13 downstream sequencing, PR-9c rebase timing.

## D4 | 2026-07-16 | Cross-project workflow-layer designs live in ~/vault/workflow/; ConEd case study stays untracked in coned repo
Context: Session produced a workflow-layer note capturing patterns that generated the PR-9 review and Pedro checkpoint. Content mixed cross-project design principles with ConEd-specific evidence. Filing everything to the coned repo would leak ambient design work into a client-facing team surface; filing to vault alone would lose the case-study context.
Decided: Split. Design notes go to ~/vault/workflow/ (choreography-layer, pr-review-skill, teammate-brief-skill, work-commitments-tracker) and snapshot to atelier for git preservation. ConEd-specific case study stays as docs/notes/2026-07-16_workflow-layer-ideas.md, untracked in the coned repo (local file only).
Rejected: Push case study to coned repo (unnecessary team-facing surface). Delete case study entirely (loses "organized files are only half the job" lesson anchored to the incident that produced it).
Affects: Future PR reviews and teammate briefs across projects; atelier vault snapshot.

## D5 | 2026-07-16 | R1 contingency (D3) triggered — Edwin absorbs M0 legacy separation
Context: D3 set end-of-2026-07-16 as the deadline for Pedro to start R1. As of 21:49 sync, no Pedro branch exists on any remote and no commits since 2026-07-14. Waiting further compounds delay on every downstream Fable milestone (R4–R13) and on the PR-9c rebase. Pedro is not off the arc — he stays owner of R4 through R13, where his frontend depth is needed.
Decided: Fire D3. Edwin opens branch `edwin/M0-legacy-separation` and executes R1 per `roadmap-supplement-m0.md`. Pedro's checkpoint brief marked SUPERSEDED with a header note pointing him at R4 for his next entry point. Slack message to Pedro/team is Edwin's manual follow-up (not automated). Pedro remains owner of R4–R13.
Rejected: Extend Pedro's deadline (delays entire downstream Fable arc). Reassign R1+R4+R5 to Edwin wholesale (overload; loses Pedro's frontend depth on the design implementation milestones).
Affects: R1 (owner: Pedro → Edwin), R4–R13 (owner still Pedro, unblock timing now depends on Edwin's R1 pace), PR-9c rebase (still waits on R1, source now different).

## D6 | 2026-07-17 | Repurpose SUPERSEDED Pedro checkpoint as fresh M3 kickoff delta
Context: The 2026-07-16 Pedro checkpoint was marked SUPERSEDED after D5 fired, with a banner header telling Pedro to ignore the "start R1 now" line. Pedro is a fluency-sensitive audience; a read-with-warning doc creates a load he must actively remember to discount every read. Two paths considered: delete outright, or rewrite as a fresh delta targeting the actual next task (M3 score cell).
Decided: Delete `docs/briefs/2026-07-16_pedro-checkpoint.md`, write `docs/briefs/2026-07-17_pedro-m3-kickoff.md` as a clean delta on top of the 2026-07-13 milestone brief. Delta covers PR-9 split status, model_meta mock pattern to avoid PR-11 dependency, exact new-build vs legacy code boundaries, setup checklist, ping-Edwin trigger list. Same file swap in DOCS_INDEX.
Rejected: Keep the SUPERSEDED doc as-is (fluency trap). Delete without replacement (loses the delta scaffolding value; forces Pedro back into the full 2026-07-13 brief cold).
Affects: `docs/briefs/2026-07-17_pedro-m3-kickoff.md` (new), `DOCS_INDEX.md`, teammate-brief-skill pattern (evidence that delta docs need refresh not warning banners when facts shift).

## D7 | 2026-07-17 | ml_risk framed as "ranking" not "likelihood" in v1.1 copy, coupled to model-deepening deferral
Context: ConEd intake (docs/ref/2026-05-04_coned-intake-form.md) asked for "high-probability drop-off" flagging with ≥70% back-tested recall on major usage drops. What we shipped is XGBoost with CV AUC 0.68 on a ≥50%-LL84-decline label — pairwise ranking accuracy, not calibrated probability, and not against the intake's early-warning benchmark. The dual-layer model plan (docs/briefs/2026-07-13_model-plan-for-fable.md §4 + plans/phase2_*/phase3_ui_dual_tier.md) is deferred pending ConEd disconnect records (blocked on the data-sharing arrangement). This cycle lifts the workflow/UI first; model deepening returns after and unlocks the intake's original phrasing honestly. Filing note: the DOCS_INDEX summary line for the intake runs longer than the ref/ section average on purpose — it does grep double-duty as both the founding-scope-doc pointer and the source-of-reframed-phrasing pointer. Both are load-bearing for future model and copy work; a formulaic short line would force a separate note elsewhere to carry the reframing history. This is the reference case for the DOCS_INDEX "intentional grep double-duty" exception clause added the same session.
Decided: Every v1.1 surface reframes ml_risk as a ranking, not a probability. Vocabulary: "per-building ranking," "orders buildings by attrition signal," "base input to the diagnostic tier." Never "likelihood," "probability," "% chance." Quality claim uses §7 rule 8 template ("ranks a true churner above a non-churner {auc_pct}% of the time"). Client's intake-form phrasing is preserved as the return goal, not the current claim. Chip stays "XGB v1 · UNVAL" until back-testing lands ("XGB v2 · BT nn%" per §4.4). Applies to FAQ ml_risk answer, score cell, case-file ledger, methodology page, digest — every surface where ml_risk is asserted.
Rejected: Mirror client's intake vocabulary as-shipped (overpromises epistemic weight of 0.68 CV AUC on a ≥50%-decline label; L1 violation). Defer the redesign until model deepening lands (loses six weeks of workflow lift the client can use in the interim).
Affects: R2 (ml_risk FAQ), R4 (score cell), R5 (case-file header ledger), R6 (report), R10 (landing), R11 (methodology page), R13 (digest); system-v1.1.md §1/§7 rule 8-9/§8 rule 1-2/§10 ledger #20; PR #11 FAQ copy pass.

## D8 | 2026-07-17 | Post-Railway-redeploy verification split by ownership
Context: Railway auto-deploy has been silently failing since 2026-06-30 13:17 ET; three commits from two owners are stuck in the backlog (523597d + 36844c2 Ismael, 44dd42c Edwin). Default framing was Edwin runs a single verify pass against prod after redeploy, since Task #2 was already Edwin's. Alternative surfaced: verify by author, since the builder catches surface-behavior anomalies faster on their own code.
Decided: Split the post-redeploy verify by ownership. Ismael verifies his shipped features (XGBoost predict endpoints + diagnostic tier filter in RiskTable; Helmet CSP, rate-limit, input sanitization headers/behavior). Edwin verifies M0 (/ new-build stub, /legacy archived dashboard, deep-link refresh survives, login round-trip). Slack ping to Ismael includes this split explicitly. Task #2 stays with Edwin but scope narrows to M0 only.
Rejected: Edwin verifies everything (loses builder-side pattern recognition on the security and XGBoost surfaces; also compresses one person's plate for no reason). Skip verification of Ismael's features (they have been unshipped for 18 days; first hit against prod is high-signal, worth confirming).
Affects: Task #2 scope, Ismael Open Commitment (adds verify step to redeploy commitment), Slack ping shape.

## D9 | 2026-07-17 | Discard local branch spike/threshold-proximity
Context: Local-only branch (no remote counterpart) last touched 2026-06-03 by Ismael. Tip commit 222b89f "Add Uncertain tier, LL97 stats, signal filters, sparklines, SC segment CSV" predates the entire Fable design cycle and M0 legacy separation — 44 days stale, 67,898 lines behind main. Investigated whether any code was salvageable. Findings: (a) build_comparison_csv.py, docs/project-{scope,requirements,schedule}.md, signal filter, Uncertain tier / isUncertain, and ll97_model.py (now 420 lines on main vs spike's 330) all already landed on main via later commits or independent reimplementations; (b) two features never ported — SteamSparkline component (~48 lines, BuildingPanel.jsx) and LL97 stats bar (~30 lines, RiskTable.jsx). Both use pre-Fable Tailwind hex colors and inline styles; neither would drop into main cleanly and would need re-implementation against system-v1.1.md tokens if the pattern is next needed. Recovery: commit SHA 222b89f preserved in reflog for 90 days (until ~2026-10-15); recover via `git branch <name> 222b89f` or `git fsck --lost-found`.
Decided: Discard the branch (`git branch -D spike/threshold-proximity`). Design intent captured in this D-entry; code not worth carrying. Sparkline pattern is a candidate concept for M4 (case-file header) — future builder should reference this D-entry.
Rejected: Keep as reference branch (rots further, confuses future sessions, reflog preserves the commit anyway). Cherry-pick sparkline or stats bar to main (pre-Fable styling; would be rebuilt against system-v1.1.md tokens from scratch when the pattern is next needed).
Affects: Task #4 closed. M4 case-file header (Pedro) — sparkline pattern candidate; concept lives here rather than as a QUESTIONS entry.

## D10 | 2026-07-18 | Move prod deploys to Pedro's Railway account
Context: 13 deploys stuck at NEEDS_APPROVAL on the current Railway account since 2026-07-14 (deployment protection enabled at project level). Ismael manually approved via API but flagged the workflow as unsustainable. On 2026-07-18 Ismael executed a manual `railway redeploy --from-source --yes` → deploy 69f0a320 SUCCESS, unblocking the 18-day backlog (Pedro's M0, 523597d XGBoost predicts, 36844c2 security hardening). Prod is currently live and stable on the old account. Pedro's Railway account is a paid plan with no deployment protection, so merges to main would auto-deploy again without manual approval.
Decided: Migrate prod deploys to Pedro's Railway account. Pedro links coned-dashboard repo to a new Railway service and shares deploy URL. Mel migrates env vars (DASHBOARD_PASSWORD, GROQ_API_KEY, OPENROUTER_API_KEY, NODE_ENV, SKIP_ENRICHMENT) to the new service. Edwin holds PR #10 and PR #11 merges until the new Railway is live so the first merge deploys clean. Ismael adds ACTOR_HMAC_SECRET to the new Railway env before PR #10 can merge (random fallback silently destroys audit history across redeploys per f5bfd17 startup guard).
Rejected: Disable deployment protection on the old account (removes the immediate gate but keeps the manual-approval workflow as latent risk; the underlying reliability issue is the account's protection posture and manual friction, both structural). Continue manual redeploys per merge on the old account (unsustainable per Ismael 2026-07-17 23:51 Slack; every push carries NEEDS_APPROVAL friction).
Affects: Task #5 CLOSED (Ismael Railway diagnosis + manual redeploy done). PROJECT_STATE Risk #1 (Railway auto-deploy stall) supersedes to Risk #1' (migration in flight; deploy-clean discipline gates PR #10/#11). PR #10 merge blocked on new Railway env with ACTOR_HMAC_SECRET set. PR #11 merge blocked on new Railway service being live. D8 verify split still applies — Edwin verifies M0 on current live prod (Ismael's Slack assignment of M0 verify to Pedro overridden silently per D8; no ping-back).

## D11 | 2026-08-15 | Reject composite-risk-as-primary flip; keep composite as secondary field
Context: Commit aecde22 on ismael/pr-9c-frontend-workflow (2026-07-28) flipped the primary UI `risk` field from `ml_risk` (XGBoost) to a client-side composite weighted score across eight signals (ll97_penalty, steam_decline, energy_star_inv, eui, ll97_over, dob_jobs_inv, ml_risk, ghg), relabeled the primary display from "Attrition Risk" to "Composite Risk Score" across BuildingPanel / RiskTable / RiskHistogram, and mirrored the change into src/legacy/data/useBuildings.js. Commit message cites "panel consensus" with no D-entry, no spec update, and no cross-reference to system-v1.1.md or Pedro's M3 kickoff. Review pass against redesign docs found the framing question already resolved on the opposite side: M3 spec binds primary display to percentile-of-ml_risk + diagnostic_risk (fable-roadmap.md line 29, pedro-m3-kickoff.md lines 38-41); §7 rule 7 says the legacy `risk` heuristic "never renders as a headline number"; §8 rule 1 says ml_risk is a ranking with percentile display; D7 established every v1.1 surface reframes ml_risk as a ranking, not demotes it. Steelman for the flip (UNVAL defensibility, weak AUC 0.683, /api/predict/custom weight-tuning UX) is legitimate design input but was not filed as an alternative before the code shipped. Legacy modification also violates the frozen-legacy rule in CLAUDE.md and roadmap-supplement-m0.md.
Decided: Revert the primary-binding and labeling changes from aecde22 on PR #12. Restore `risk = ml_risk` (strict revert to pre-aecde22 binding; M3-spec percentile binding lands in M3 work, not smuggled into PR #12). Restore "Attrition Risk" language on BuildingPanel section header, RiskTable "Attrition Score" column, RiskHistogram subtitle. Fully revert src/legacy/data/useBuildings.js changes — legacy is frozen. Keep the composite compute infrastructure in src/data/useBuildings.js exposed as a secondary field `composite_risk` (not written into `risk`); it is real work with future use for filter/queue logic and the /api/predict/custom weight-tuning surface. The DECISIONS.md entry now exists so this question is not silently re-litigated in a future commit; any future proposal to promote composite to primary must file its own D-entry against this one.
Rejected: (a) Bless the flip and update docs (Option A) — would require rewriting M3 acceptance criteria, §7 rule 7, §8 rule 1, and D7 mid-cycle; the flip is a material redesign choice, not a polish, and the panel consensus was not documented at design time. (b) Revert the entire commit including composite compute (Option B strict) — throws away useful infrastructure the /api/predict/custom endpoint needs downstream. (c) Merge as-is with a follow-up D-entry (Option D) — normalizes shipping architecturally significant changes without decision anchors, and drift compounds across teammates.
Affects: PR #12 (needs surgical revert before merge). system-v1.1.md §7 rule 7 and §8 rule 1 (reaffirmed, no change). D7 (reaffirmed). M3 kickoff brief (unchanged). aecde22 (partial revert required). Composite score infrastructure preserved as `composite_risk` field for R11 methodology surfaces and future weight-tuning UX. Convention reinforced: architectural changes to primary display bindings require a filed D-entry before merging, not after.

## D12 | 2026-08-17 | Make db init non-fatal outside production (option C over Docker or eyeball-only)
Context: After PR #18 (regex fix) landed, `npm run dev` still crashed at `[db] FATAL: schema init failed:` because `initSchema()` in api/server.js calls `process.exit(1)` unconditionally. No local Postgres running. Blocks M4 container eyeball and any future frontend contributor without a DB. Three options considered: (A) eyeball M4 preview route only, defer container verification; (B) stand up Docker Postgres locally; (C) file a small PR gating the hard-fail on NODE_ENV=production so dev logs a warning and boots anyway.
Decided: Option C. Filed as PR #19. Production behavior unchanged (still exits 1). In dev, warns and starts the server; status endpoints 500 per-request, which CaseFileContainer already handles via its warn banner.
Rejected: (A) leaves the container unverified against real data and pushes the problem forward; (B) adds ops burden every frontend contributor pays forever to solve a dev-only problem.
Affects: api/server.js (initSchema call site, lines 1466-1479). Sets convention that dev-only environmental blockers should be gated on NODE_ENV rather than mandated as setup. Container eyeball unblocked once #19 merges (or via local branch checkout in the interim).

## D13 | 2026-08-17 | M4 container ships read-only against status endpoint; POST wiring deferred
Context: M4 container adapter (edwin/M4-case-file-container, b737df0) wires the case-file header to real data through `/api/data/*` + `/api/model_meta` + `GET /api/buildings/:bbl/status`. Question was whether to also wire the status segment as an interactive writer (POST /api/buildings/:bbl/status) inside this PR or defer.
Decided: Ship read-only. Status segment renders the 6 states from the latest event but does not accept input. POST wiring lands as a separate follow-up PR.
Rejected: Bundling POST into the M4 container PR — scope creep, would gate M4 review on a second surface (write UX + optimistic update behavior + toast/error patterns) that has no design anchor in Fable spec 2 yet.
Affects: edwin/M4-case-file-container. Follow-up PR to be filed after M4 lands. Does not affect the M6 backend contract, which is already Postgres-backed on main.

## D14 | 2026-08-17 | M5 puppeteer variant: full bundled chromium over @sparticuz/chromium
Context: /api/report/:bbl.pdf needs a browser to render /report/:bbl. Two candidates: full puppeteer (bundled chromium, zero config, ~170MB image add + system libs) vs puppeteer-core + @sparticuz/chromium (Lambda-oriented, mechanical wiring, smaller cold-start).
Decided: Ship full puppeteer as runtime dep. Isolated all Puppeteer usage in api/pdf.js so a future swap is one-file if Railway image size bites.
Rejected: puppeteer-core + @sparticuz/chromium — designed for serverless size limits that do not apply to Railway's long-running container; wiring overhead not justified without evidence of a problem.
Affects: api/pdf.js, Dockerfile (chromium system deps), package.json. Graceful degradation per roadmap §M5 covers the worst case (browser print-to-PDF of /report/:bbl).

## D15 | 2026-08-17 | M5 temp adapter to avoid stacking on M4
Context: R1 requires the report to be a projection of the M4 case-file header, ideally by consuming the same adapter. But M4 (#21) is still in review and stacking M5 on it would gate M5 review on M4 review, and force re-rebase on M4 iterations.
Decided: Ship src/next/reportAdapter.js as a temp local adapter mirroring caseFileAdapter.jsx shape. TODO(M4-merge) marker in place. Swap import + delete temp when #21 lands, at which point R1 becomes a code-level guarantee rather than a mirrored derivation.
Rejected: (a) stacking on M4 branches — review coupling; (b) waiting for M4 to merge before scaffolding M5 — burns the session, blocks parallelism.
Affects: src/next/reportAdapter.js (deletable), src/next/ReportPage.jsx (import swap). PR #24 body flags the deviation.

## D16 | 2026-08-17 | Defer R5 review-confirmed flow (removes DRAFT watermark) to after M6
Context: R5 requires "a human signs it" + DRAFT watermark until review confirmed. Ismael owns M6 (status events endpoint), which is the natural home for a "reviewed" state.
Decided: Ship DRAFT watermark hardcoded on. Review-confirmed flow deferred to a follow-up PR once M6 status vocabulary is live.
Rejected: Building an ad-hoc review flag now — would duplicate what M6 will provide and risk migration churn.
Affects: src/next/ReportPage.jsx (signature.draft = true always). Not blocking M5 acceptance; flagged in PR #24 body.
