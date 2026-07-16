# Roadmap Supplement — M0: Legacy separation + routing

**Emitted:** 2026-07-14
**Supplements:** `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` (Fable, 2026-07-13)
**Scope:** Pre-work not in Fable's roadmap. Establishes the boundary between the current build (kept as a demo hedge and archived reference) and the new workflow-focused build. Must land before M3 (Score cell into Rankings table) begins.
**Owner:** Pedro (frontend), coordination Edwin.

## Why this exists

Fable's `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` sequences new-build milestones (M1–M12). It does not scope preserving the existing build. That preservation is intentional operational discipline, not a design decision — the old dashboard travels with us as an unlinked hedge in case demo audiences (David, ConEd) expect a traditional portfolio view we haven't yet built the workflow-focused equivalent for. This supplement scopes that preservation as M0 so ownership, acceptance, and file discipline are explicit before Pedro starts M3.

## M0: Legacy separation + routing

- **What ships:** the current build preserved under `src/legacy/`, reachable at the `/legacy` route only, with import/style boundaries between legacy and new-build code. The AI chatbot (`src/components/AIAgent.jsx` + `/api/explain` endpoint) lives with the legacy tree; it is not re-integrated into the new build.
- **Depends on:** nothing. First milestone; must complete before M3 begins.
- **Owner:** Pedro.

### Acceptance criteria

1. **Route layout.** Router registers two entry points: `/` renders the new-build entry (initially a stub or the current app if the new build hasn't started; swaps to the workflow-focused shell as M3 lands). `/legacy` renders the archived dashboard.
2. **File layout.** Every component the new build will replace has been copied to `src/legacy/` with import paths fixed inside the legacy subtree. Legacy entry file is `src/legacy/App.jsx` (or equivalent), mounted at the `/legacy` route.
3. **Chatbot placement.** `src/components/AIAgent.jsx` copies to `src/legacy/components/AIAgent.jsx` and is rendered only from the legacy entry. New-build code does not import AIAgent.jsx from any path.
4. **Boundary discipline documented.** `CLAUDE.md` §Legacy contains the rules: no cross-imports (new-build files never import from `src/legacy/`; legacy files never import from `src/next/` or the new-build root), legacy files are frozen (no design updates, no new features), bug fixes on legacy allowed only when a break would embarrass a demo.
5. **No nav entry to `/legacy`.** The new build does not link to the legacy route from any surface. Access is URL-only. This preserves the hedge without diluting the workflow-focused story.
6. **Shared backend endpoints continue to work.** `/api/explain` (chatbot answer endpoint at `api/server.js:899`), the enrichment endpoints, and static file serving are unchanged. Both surfaces share the same server. M1's FAQ answer rewrite at `api/server.js:867` applies to both surfaces because the endpoint is shared.
7. **Deploy verification.** `/` and `/legacy` both render on Railway after the M0 deploy. A round-trip navigation test confirms neither route breaks the other.

### Graceful degradation

M0 does not degrade. It either ships or M3 does not start. If the file moves reveal a hidden coupling that resists clean separation, resolve the coupling before M3 rather than shipping a partial separation.

## Boundary rules (durable — will be restated in CLAUDE.md)

- **New-build files never import from `src/legacy/`.**
- **Legacy files never import from the new-build root or `src/next/`.**
- **Legacy files are frozen.** Bug fixes only when a break would embarrass a demo. No design updates, no new features, no dependency upgrades that force refactors.
- **The `/legacy` route stays unlinked.** No nav entry, no footer link, no discovery affordance from the new build.
- **Shared backend endpoints are treated as new-build-owned.** When Ismael changes an endpoint under M1/M6/M7, he does not need to preserve legacy behavior beyond what the M1 string rewrite already dictates. If a legacy surface breaks because a shared endpoint's contract evolved, we make a case-by-case judgment: patch legacy to match, or retire the affected legacy surface.

## Chatbot situation (summary)

The chatbot is a legacy feature. It does not appear in Fable's 5 specs and does not fit the new Voice ("AI embedded inside the primary object rather than beside it"). Two artifacts:

- **Frontend (`AIAgent.jsx`):** archived in `src/legacy/components/AIAgent.jsx`; rendered only from the legacy route.
- **Backend (`/api/explain` endpoint at `api/server.js:899` plus FAQ fallback at 860–888):** unchanged. M1's rewrite of the `ml_risk` FAQ answer (line 867) fixes the stale "GBM" reference and removes the L1-violating probability phrasing. That fix serves both surfaces because the endpoint is shared.

A future "ask about this building" contextual affordance inside the case-file (Spec 2) is a Round 2 design conversation with Fable, not part of this roadmap.

## Sequencing note

M0 is the first roadmap step. Nothing in `docs/ref/2026-07-16_ed_ref_fable-roadmap.md` depends on M0 by name, but M3 (Score cell into Rankings table) is where the new build begins to replace the current dashboard's components. Without M0, M3 would overwrite the current dashboard in place and lose the hedge. Do M0 first.

## What this supplement does not do

- It does not modify `docs/ref/2026-07-16_ed_ref_fable-roadmap.md`. Fable's milestones stand as written.
- It does not require Fable involvement. This is an operational decision documented for team alignment.
- It does not change the Voice, Registers, or Laws in `system-v1.1.md`. The legacy dashboard is an archive, not a register.
