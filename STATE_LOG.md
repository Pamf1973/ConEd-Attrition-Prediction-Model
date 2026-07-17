# State Log

Append-only. Never edit or delete entries. Written by /sync (git batches), /note (verbal), /roadmap-adjust (plan changes). Compacted by /compact-log after 45 days.

Entry format:
```
YYYY-MM-DD HH:MM | <sha_range | verbal (who) | roadmap> | Terse description. Roadmap IDs. Decision IDs.
```

Examples:
```
2026-07-14 16:05 | verbal (call: Ed, Ismael, Pedro) | Pedro defers auth to next sprint. Affects R6.
2026-07-15 09:12 | a1b2c3..f9e8d7 | Ismael: pipeline refactor landed, 3 modules. Advances R3. Confirms verbal 2026-07-14. New dep: joblib.
2026-07-15 10:40 | roadmap | R3 expanded. Impact notes added to R5, R7. See D9.
```

---

## 2026-07-16 09:29 sync
- bc1700c | Edwin Perez: build-ops scaffold installed (PROJECT_STATE, ROADMAP R1–R14, DECISIONS D1, DISTILLED_GOALS, STATE_LOG, DOCS_INDEX, CONVENTIONS.md, docs/ library). Fable roadmap moved to docs/ref/. Design profile declared. No R-item code advanced; this is tracking infrastructure.
- PRs open: #9 (ismael/monday-workflow) — W1/W4/W6 Monday workflow features by ismaelcaraballo-afk; updated 2026-07-15.
- Roadmap advanced: none (bc1700c is docs/infra only)
- Drift flags: PR #9 implements W1/W4/W6 laws (queue arithmetic, pipeline timestamp, QuickFilters) against legacy components (RiskTable.jsx, App.jsx, BuildingPanel.jsx) using localStorage — this is pre-M6 workaround territory; R7 scopes Postgres migration. Branch name (monday-workflow) is not milestone-tagged per CLAUDE.md convention. PR owner is Ismael but scope overlaps R9/R10 (Pedro-owned). Needs Edwin review before merge to confirm legacy-vs-new-build boundary compliance.

## 2026-07-16 19:00 sync
- 2026-07-16 10:47 | 817058b | Edwin: Fable-cycle docs reorganized into docs/{ref,briefs,design,archive}. 4 person briefs, methodology-alignment, Ismael Q1-Q10, Fable prompts, round-0/round-1 atoms, case-file header (Spec 2) intaken. Deck cycle archived. CONVENTIONS.md rules updated (origin omitted when Ed; type omitted when folder implies). Docs-only, no R-item code.
- 2026-07-16 11:21 | 0cd8c73 | Edwin: 25 loose pre-Fable-cycle docs backfilled into docs/ tree. Briefs, research, notes, ref, demo-cycle archive. Docs-only.
- 2026-07-16 12:15 | d707fc2 | Edwin: QUESTIONS.md scaffold added (empty, format from questions-deck-addon skill). CLAUDE.md vault pointer line added (agents grep ~/vault before re-asking Ed about preferences). Docs-only.
- 2026-07-16 | pr | PR #9 still open (ismaelcaraballo-afk fork, branch ismael/monday-workflow). Updated 2026-07-15 23:17. 4 commits bundled: 9afa92b (W1/W4/W6 frontend), 886b242 (M1+M2 model_meta.json + /api/model_meta + FAQ rewrite, AUC 0.6833 ± 0.0511), e6de184 (M6 Postgres api/db.js + status endpoints + bulk), c86abb5 (3-agent security panel: sha256 actor pseudonym, timingSafeEqual length-oracle fix, DB CHECK constraint, rate limiters). No formal reviewers assigned via GitHub; PR body and Ismael's message explicitly request Edwin + Pedro review. Claims cover R2, R3, R7-partial (watchlist migration deferred), W1/W4/W6 frontend against legacy files.
- 2026-07-16 | verbal (Edwin) | Path A chosen for PR #9: split into PR-9a (R2+R3 backend, blocks on Edwin FAQ copy pass), PR-9b (R7 backbone + security, mergeable now), PR-9c (W1/W4/W6 frontend, park until R1 lands, then rebase). Full review at docs/notes/2026-07-16_pr-9-review.md. Ismael raw message at docs/notes/2026-07-16_ismael-pr9-message.md. R2/R3/R7 remain planned in ROADMAP until merge; claims-in-open-PR only.
- 2026-07-16 | notes | New docs untracked in working tree: docs/notes/2026-07-16_pr-9-review.md (review artifact), docs/notes/2026-07-16_ismael-pr9-message.md (Ismael verbatim), docs/notes/2026-07-16_workflow-layer-ideas.md (choreography-layer design capture, /pr-review and /teammate-brief skill sketches), docs/briefs/2026-07-16_pedro-checkpoint.md (Edwin delta brief pointing Pedro to start R1 now).
- 2026-07-16 | verbal (Ismael via PR#9 message) | Q1-Q10 reply sent to Edwin: Path C hybrid chain signed off; Critical v1.1 (n=23) signed off internally; top-of-queue 660 Madison / 200 E 42nd / 58 W 58th. Relates R14 packet item #5 (external David sign-off still owed). Not yet intaken as a separate doc.
- Ahead/behind: local main == origin/main (0/0). No incoming remote commits on main. PR #9 lives on fork ismaelcaraballo-afk/coned-dashboard, unmerged.
- Roadmap advanced: none merged. R2/R3/R7 have shipped code in unmerged PR #9 (Path A split pending).
- Drift flags: (1) PR #9 boundary risk unchanged from prior sync — frontend W-laws land on files R4/R5 will replace. (2) Path A split not yet executed by Ismael; PR still bundled. (3) R14 item #5 external sign-off (David) owed by Edwin.

## 2026-07-16 21:49 sync
- 2026-07-16 19:50 | 59585a8 | Edwin: PR-9 review intake, Ismael's message filed, Pedro checkpoint brief. PROJECT_STATE + STATE_LOG refreshed. Docs-only.
- 2026-07-16 19:58 | eb90849 | Edwin: PR-9 review topology fix (ismaelcaraballo-afk is team base repo, not fork of nonexistent edpursuing). Pedro R1 deadline tonight tracked. Edwin R1 contingency tracked.
- 2026-07-16 21:46 | f04cf25 | Edwin: DECISIONS D2 (PR-9 Path A), D3 (Edwin R1 contingency), D4 (workflow design vault split) filed. Docs-only.
- 2026-07-17 00:09 | pr | PR #9 CLOSED by Ismael. Path A executed: three replacement PRs opened on ismaelcaraballo-afk (same-repo branches, not fork). Confirms verbal 2026-07-16 (Edwin Path A). Confirms commitment 2026-07-16 (Ismael Path A split). See D2.
- 2026-07-17 00:09 | pr | PR #10 opened by Ismael: PR-9b, branch ismael/pr-9b-status-events. Q7 append-only building_status_events (Postgres, api/db.js). Status = mergeable now, no deps. +396/-12. Includes panel security findings (BBL regex, sha256 actor pseudonym, sanitizeNote NFC, timingSafeEqual hash-to-32-byte fix, initSchema fatal, per-endpoint rate limiters). Advances R7 backbone. R7 watchlist migration still deferred (Ismael commitment). No formal GH review assigned; PR body requests Edwin + Pedro review.
- 2026-07-17 00:09 | pr | PR #11 opened by Ismael: PR-9a, branch ismael/pr-9a-model-meta. Adds data/model_meta.json (cv_auc 0.6833, cv_std 0.0511, cv_kfold 5, n_positive 54, validated). Adds GET /api/model_meta (auth-gated, 60s TTL). Retires GBM strings. FAQ ml_risk answer rewritten as getAnswer() using model_meta values. +60/-3. Status = blocked on Edwin FAQ copy pass. Advances R2, R3.
- 2026-07-17 00:09 | pr | PR #12 opened by Ismael as DRAFT: PR-9c, branch ismael/pr-9c-frontend-workflow. W1 timestamp, W4 queue arithmetic, W6 QuickFilters. +280/-53. Status = PARKED until Pedro R1. Ismael rebases against new-build components post-R1. Advances nothing yet.
- Ahead/behind: local main == origin/main (0/0). No incoming commits on origin/main. Three new remote branches: origin/ismael/pr-9a-model-meta, origin/ismael/pr-9b-status-events, origin/ismael/pr-9c-frontend-workflow.
- Roadmap advanced: PR-9 closed, split executed. R2, R3, R7-partial now in open per-PR review posture (still "planned" in ROADMAP until merge; PR-9b = R7 backbone, PR-9a = R2+R3, PR-9c = W-laws parked).
- Drift flags: (1) HANDOFF.md claims FAQ ml_risk answer at server.js:976; actual current line is 870 (verified via grep). CLAUDE.md says 867 (also off by 3, but closer). Neither pointer is exact; both need reconciliation. PR-11 diff shows the modified block will sit around line 907-913 post-merge. (2) Pedro R1 deadline 2026-07-16 tonight — no commits by Pedro on any branch since 2026-07-14. Contingency D3 window closes end of day. (3) PR-9c "PARKED" is unusual — draft PR left open as a placeholder for rebase; risk of rot if R1 slips past a week.
- Confirmed commitments: Ismael Path A split (2026-07-16, D2) — PRs #10/#11/#12 opened. Remains: Ismael FAQ copy pass on PR-9a (Edwin-owed), R7 watchlist migration (Ismael-owed), R1 (Pedro).
- Stale commitments: Pedro R1 start by end 2026-07-16 (day-of, no evidence in git log). Edwin R1 contingency window closes with it.
