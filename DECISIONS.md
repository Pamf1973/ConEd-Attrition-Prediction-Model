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
