# Fable — Execution plan for prompts 02, 05, 03

**From:** Edwin
**Date:** 2026-07-13
**Purpose:** These three prompts are not independent — they cascade. This document tells you the order to execute them in and where to pause for a quick review before continuing. Sending them together with this framing so we don't end up with `system-v1.1.md` locked in before I've seen the portfolio-signals verdict, or with a roadmap sequenced against a `system-v1.1.md` I haven't confirmed reads right.

**Attached in this session (all three, in the order below):**
- `02-portfolio-signals-assessment.md` — portfolio-level signals surface, modifier-aware reframing
- `05-system-v1.1-reissue.md` — clean canonical `system-v1.1.md` folding in every adjustment
- `03-build-roadmap-request.md` — sequenced build plan for the three-person team

---

## Execution order

**Step 1 — Run prompt 02 (portfolio signals) first.**

Return your verdict (Option 1, 2, 3, or 4 — or "none of them, do this instead"), the reasoning, and the design-system consequences per the "What we want back" section of that prompt.

**→ CHECK-IN GATE A: Pause here.** Do not proceed to prompt 05 yet.

At this pause, send me:
- The verdict paragraph (2–4 sentences: which option, why, what it costs)
- If atoms are involved: the proposed atom name, its register, its law family
- If methodology-page only: the outline (section headers) and the cadence

I will reply with one of: "proceed," "adjust as follows and proceed," or "let's talk before you proceed." Wait for my reply before touching prompt 05.

**Step 2 — Run prompt 05 (system-v1.1 reissue) once I confirm at Gate A.**

Fold in the 02 verdict along with every other adjustment listed in prompt 05. Return the full `system-v1.1.md` document per its "What we want back" section.

**→ CHECK-IN GATE B: Pause here.** Do not proceed to prompt 03 yet.

At this pause, send me:
- The full `system-v1.1.md` document
- A change-summary (3–6 bullets: the substantive changes from v1.0, each traced to its source — Round 1, Round 1.1, Ismael Q1–Q10, or the 02 verdict)

I will reply with one of: "proceed," "adjust these sections and re-emit, then proceed," or "let's talk before you proceed." Wait for my reply before touching prompt 03.

**Step 3 — Run prompt 03 (build roadmap) once I confirm at Gate B.**

Sequence milestones with owners per the ownership split principle, acceptance criteria pointing at specific `system-v1.1.md` laws, and the methodology alignment section folded in per its "required inclusion" wording. Return `docs/ref/2026-07-16_ed_ref_fable-roadmap.md`.

No gate after Step 3 — we go straight from your roadmap into per-person build briefs that quote from `system-v1.1.md` and `docs/ref/2026-07-16_ed_ref_fable-roadmap.md`.

---

## Why the gates exist (context for you)

**Gate A** is the biggest one. Prompt 02's verdict has downstream implications for §2 (registers), §4 (vocabulary), §5 (components table), §6 (laws) of `system-v1.1.md`. If you return Option 4 vs Option 3, the doc looks meaningfully different. I want to see the verdict before you lock it into the canonical reference — not because I expect to override you, but because a course correction is cheaper at Gate A than after `system-v1.1.md` is written.

**Gate B** is a lighter check. `system-v1.1.md` becomes the source of truth every acceptance criterion in the roadmap points at. If a copy rule or a laws-index entry reads oddly, I'd rather catch it before the roadmap builds around it.

Both gates should be quick — you're not waiting on new information, you're waiting on a "proceed" confirmation.

---

## What we do not want

- The three prompts executed as a single batch without pausing. The gates are not optional.
- A gate check-in that is a full re-summary of the prompt's constraints. Just the verdict / doc + the change-summary.
- Any assumption that a downstream prompt overrides an upstream one. If prompt 03's methodology-alignment section conflicts with something in `system-v1.1.md`, treat that as a bug in one of the two and surface it at Gate B — don't silently reconcile.

## Constraint

If you disagree with the gate placement — for example, if you think Gate A should come after the atom's name is proposed rather than after the verdict, or if you think prompts 05 and 03 can be safely run together without Gate B — say so at Gate A and I'll re-scope. Better to argue the sequencing once than to run a bad sequence.
