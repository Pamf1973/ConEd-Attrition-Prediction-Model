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
