# Pedro — M3 kickoff (2026-07-17)

**From:** Edwin
**Date:** 2026-07-17
**Purpose:** Fresh delta on top of your 2026-07-13 milestone brief. Your job right now is **M3 (Score cell into Rankings table)**. This file is what changed since your brief and exactly how to start. Read your full brief for the M3 acceptance criteria and copy rules; use this file as the setup guide.

---

## What changed since your 2026-07-13 brief

- **R1 (M0 legacy separation) is done.** I absorbed it solo after the deadline passed (D5). PR #13 is open: https://github.com/ismaelcaraballo-afk/coned-dashboard/pull/13. It will land on `main` shortly. Everything below assumes it's merged; rebase against `main` after it lands before you start.
- **Ismael's PR #9 got split into three focused PRs:**
  - **PR #10** (PR-9b, status events) — mergeable now.
  - **PR #11** (PR-9a, `model_meta.json` + `/api/model_meta`) — waiting on my FAQ copy pass. This is the endpoint your score cell's provenance chip will consume.
  - **PR #12** (PR-9c, W1/W4/W6 frontend) — parked. Ismael rebases against your M3 (score cell) and M4 (case-file header) components once they're on main.
- **Path C hybrid tier chain** signed off. **Critical v1.1** (n=23) signed off. Top of queue: 660 Madison Ave, 200 E 42nd St, 58 W 58th St — sanity-check against those three once you have score cells rendering.
- **AUC number is final:** `0.6833 ± 0.0511` (5-fold CV, 1003 labeled, 54 positive). You don't need it for M3 (it lands in M4 header + M5 report), but if you glance at Ismael's PR-11 that's where it comes from.

---

## M3: Score cell in Rankings table

**Acceptance criteria live in:** `docs/briefs/2026-07-13_pedro-frontend-build.md` (your full brief) and `system-v1.1.md` §Components → "Score cell (Spec 1)". Do not paraphrase — quote the criteria into your PR description verbatim.

**Design spec (open both):**
- `docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html` — Fable's Spec 1 atom
- `system-v1.1.md` §Components → Score cell + §4.5 (chip copy rules) + §7 rule 8 (AUC copy template)

---

### Where the code lives after R1

- **New-build root:** `src/App.jsx`. Currently a stub. Your score cell + the Rankings table container that hosts it land here (or in a new file under `src/components/` or `src/next/`, your call, but imported by `src/App.jsx`).
- **Legacy code:** `src/legacy/` — **do not edit**. That subtree is frozen. The current-build score column lives at `src/legacy/components/RiskTable.jsx`; you can reference it for what NOT to do (percent sign on the model score, "100% High" wall, etc.) but the new one is a new component under `src/`.
- **Data hook:** `src/data/useBuildings.js` (also currently only imported by legacy — copy it up to `src/data/` when you need it or refactor to shared). Do not import from `src/legacy/data/`.

### What the score cell needs from the API

1. **`percentile-of-ml_risk`** — computed client-side from the `ml_risk` field already in `/api/data/enrichment`. Nothing new here.
2. **`diagnostic_risk`** — already in `/api/data/enrichment` (values: `High`, `Medium`, `Low`, `Uncertain`).
3. **`model_version`** — from `GET /api/model_meta` (comes with PR #11). Until PR #11 merges, mock this endpoint locally and swap the fetch to real when it lands. The chip renders `model_version` as a string ("XGB v1 · UNVAL" or similar). **Never render a probability, never render a percent sign on the model score itself** (per system-v1.1.md L1).

### Interim chip copy (until PR #11 merges)

Ship the chip with placeholder text like `"model version pending"` bound to a `modelVersion` prop. When PR #11 merges, that same prop reads from `/api/model_meta`. This way you can open your PR and get a design review without being blocked on backend.

### The trap to avoid (from your full brief)

The current column renders `ml_risk * 100 + "%"` as a big number with a color band. That is the "two-number problem" — a probability being read as a percentage of some real thing. **The new score cell kills the percent sign on the model score.** Percentile framing only. Reread `system-v1.1.md` §4.5 for the exact rule.

---

## Setup checklist before you start coding

1. `git pull origin main` (after PR #13 merges)
2. `git checkout -b pedro/M3-score-cell` (branch convention per `CLAUDE.md`)
3. Open these four docs in tabs:
   - `docs/briefs/2026-07-13_pedro-frontend-build.md` (your full brief — jump to §M3)
   - `system-v1.1.md` (search for "Score cell")
   - `docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html` (Fable spec)
   - `CLAUDE.md` (repo layout, especially §Legacy discipline)
4. `npm install && npm run dev` — confirm the app runs on `/` (stub) and `/legacy` (old dashboard).

---

## What Edwin is handling this week

- FAQ copy pass on PR #11's `ml_risk` answer (unblocks PR #11 merge, unblocks your provenance chip going live)
- R11 (M10) methodology page prose — solo lane, won't collide with your work

## What Ismael is handling

- PR #10 merge (may already be in by the time you read this)
- PR #12 rebase, once your M3 + M4 components are on main
- R7 watchlist migration (the other half of M6) — not in any current PR

---

## Have open while you work

- `CLAUDE.md`
- `system-v1.1.md`
- `docs/briefs/2026-07-13_pedro-frontend-build.md`
- `docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html`

## Ping Edwin if

- A canonical doc contradicts another
- An acceptance criterion is ambiguous or you can't tell whether your build satisfies it
- You need the FAQ answer copy sooner than "this week" to unblock something
- Anything in this delta feels stale (I'll write a fresh one for M4)
