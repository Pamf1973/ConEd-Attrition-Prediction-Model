# Kickstarter — team message

**Purpose:** the message Edwin sends to Pedro + Ismael (Slack / group DM / email) to actually start the redesign build. Keep it under a screen. Everything they need to know beyond this message lives in their brief.

---

## The message (paste this)

Hey Pedro, Ismael —

The redesign is scoped. Docs just landed on `main`:

- **`CLAUDE.md`** — engineering reference for the whole repo
- **`docs/ref/2026-07-16_ed_ref_fable-roadmap.md`** — M1 through M12 milestones (Fable, 2026-07-13)
- **`roadmap-supplement-m0.md`** — M0 (legacy separation + `/legacy` routing), the pre-work
- **`system-v1.1.md`** — the design system: voice, tokens, laws, copy rules
- **`PEDRO-BRIEF-FRONTEND-BUILD.md`** — Pedro, this is your read
- **`ISMAEL-BRIEF-BACKEND-BUILD.md`** — Ismael, this is your read

Read your brief before touching code. It quotes acceptance criteria verbatim from `docs/ref/2026-07-16_ed_ref_fable-roadmap.md`, points at the exact files you'll touch, and flags what NOT to do. If a canonical doc contradicts your brief, the canonical doc wins — Slack me and I'll patch the brief.

**Kickoff assignments:**

- **Ismael → M1:** ship `model_meta.json` + retire the stale strings at `server.js:585` and `:867`. This is the cross-cutting first move — Pedro's chip copy, ledger AUC line, freshness anchors, and both footers all wait on you. Your Q1–Q10 answers already scoped this; the brief just maps them to files. I'll hand you the rewritten chatbot answer for line 867 within a day of you starting — do not paraphrase it, paste verbatim.
- **Pedro → M0:** legacy separation. Copy the current build into `src/legacy/`, wire the router so `/` is the new build (stub for now) and `/legacy` is the archived dashboard. AIAgent.jsx goes to legacy. Full spec in `roadmap-supplement-m0.md`. Once M0 lands, start M3 (score cell) with interim chip copy — you don't have to wait on M1.

You can start in parallel. M0 doesn't block M1 and vice versa.

**Branch convention:** `<owner>/M<n>-<slug>` (e.g., `ismael/M1-model-meta`, `pedro/M0-legacy-separation`). One PR per milestone. PR description lists which acceptance criteria are met + which laws (L1, W3, etc.) are respected. Details in your brief.

**Pairing:** M4, M5, M12 are paired (Pedro build + Edwin copy); M1 chatbot answer is paired (Ismael wires + Edwin drafts). I'll open small copy-PRs to match yours; you'll paste from those verbatim.

**David packet** is on my side, running parallel. It covers open ledger items #5–10 (chip vocabulary, digest cadence, cooling-off window, DRAFT watermark, etc.). None of these block your first milestone.

**Check-in cadence:** 15-min sync when either of you hits an acceptance criterion that reads ambiguous, or when a canonical doc contradicts itself. Otherwise, PRs speak for themselves.

Ping me before merging anything that touches `/api/explain`, `/api/watchlist/*`, or `/api/data/*` — those are shared with the legacy surface per M0 rules and I want a quick eyes-on before it ships.

Let's go.

— Edwin

---

## Notes on using this message

- Send it in the shared team channel (or start one), not DMs — Ismael and Pedro need to see each other's dependencies.
- Pin it. Reference it when either person surfaces "what am I supposed to be doing?"
- If either replies with clarifying questions before starting, capture the answers in this file's response section or amend the brief directly — do not answer once verbally and let it evaporate.
- The 15-min cadence is a floor, not a ceiling. If M1 lands the same day M0 lands, sync then.
- The parallel-start claim (M0 and M1 don't block each other) is only true because Pedro can ship M0 with a stub at `/` and start M3 with interim chip copy. If either milestone hits a real blocker, sequencing changes.
