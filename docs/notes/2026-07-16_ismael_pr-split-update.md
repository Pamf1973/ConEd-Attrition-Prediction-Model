# Ismael — PR split + security-hardening update

**Origin:** Slack, #coned-dashboard channel
**Sent:** 2026-07-16 (evening)
**Intaken:** 2026-07-17
**Related:**
- `docs/notes/2026-07-16_ismael-pr9-message.md` — earlier same-day update announcing PR #9 before it split
- `docs/notes/2026-07-16_pr-9-review.md` — Edwin's review + Path A decision (D2)
- `DECISIONS.md` D2 (PR-9 Path A adopted), D3 (Edwin R1 contingency, since fired as D5)

---

## Message (verbatim)

> **#coned-dashboard** — Ismael update 2026-07-16
>
> **PRs split + security-hardened ✅**
>
> PR #9 (monday-workflow bundle) is closed and replaced by three focused PRs:
>
> **PR #10** — Q7 append-only status events + security hardening
> `ismael/pr-9b-status-events` · **Ready to merge**
> - Postgres `building_status_events` table, DISTINCT ON history, bulk endpoint
> - Panel review (5 agents) applied: trust proxy fix, GET rate limiter + pagination, actorTag switched to HMAC, BBL regex tightened to boroughs 1–5, pool max NaN guard
>
> **PR #11** — M1+M2 model_meta backend
> `ismael/pr-9a-model-meta` · **Blocked on Edwin FAQ copy pass**
> - `data/model_meta.json` (moved out of `public/` — was auth bypass), `GET /api/model_meta` endpoint, retires GBM strings
> - Panel fixes: 60s TTL cache refresh, schema validation (no NaN in FAQ), error logging, FAQ answer converted to getter so retrains reflect live
>
> **PR #12** — W1/W4/W6 frontend workflow features
> `ismael/pr-9c-frontend-workflow` · **Draft — parked until Pedro's M0**
> - Pipeline timestamp, queue arithmetic, quick filter buttons, per-user localStorage workflow state
> - Panel fixes: useEffect clobber fixed (lastReview now loads prior session correctly), JWT replaced with hash as localStorage key, queue double-subtraction fixed (union not sum)
>
> **Also landed today:**
> - AI model config plan written + 5-model panel review → `plans/ai_model_config.md`
> - Panel confirmed: use BullMQ job queue, move config out of `public/`, structured form UI for v1 (not NLP), defer model type switching to v2
>
> @Edwin — PR #10 is clean, no blockers your side. PR #11 unblocks as soon as your FAQ copy is ready.
> @Pedro — PR #12 stays draft until your M0 lands. Rebase target will be your new-build components.

---

## Reconciliation notes

- **Pedro reference is stale.** The `@Pedro — PR #12 stays draft until your M0 lands` line was written before D5 fired 2026-07-16 21:59. R1 (M0) is now Edwin's per D5, not Pedro's. PR #12 rebase target unchanged: whichever new-build components land after R1.
- **PR #11 body drift.** Slack correctly describes `data/model_meta.json`; PR #11 body on GitHub still references `public/`. Ask Ismael to update.
- **`plans/ai_model_config.md` — zero git footprint.** Grep across all remote branches + local tree returns nothing. Filed as an Open Commitment in PROJECT_STATE; Ismael to push the doc.
- **Panel-review outputs.** The "5 agents" per-PR review is Ismael's local pre-push QA loop; no artifact in the repo. If the review outputs are worth preserving, they'd land as their own intake (Ismael's call).

## Commit anchors (added post-sync)

- PR #10 second commit: `646f88a`
- PR #11 second commit: `d574773` (this is the one that moves `model_meta.json`)
- PR #12 second commit: `b678cb1`
