# Ismael — Backend Build Brief

**From:** Edwin
**Date:** 2026-07-14
**Purpose:** Your milestone-by-milestone build brief for the ConEd Steam Attrition redesign integration. This file is the shim between your Q1–Q10 sign-offs (`ISMAEL-RESPONSE-2026-07-13.md`), the design system (`system-v1.1.md`), the roadmap (`roadmap.md` + `roadmap-supplement-m0.md`), and the codebase (`CLAUDE.md`). If you find a conflict between this brief and any of those docs, the canonical docs win — flag it in Slack and I'll fix this brief.

**Read first, before touching code:**
- `CLAUDE.md` — repo layout, dev commands, API contract, data pipeline, environment vars
- `system-v1.1.md` — §4.1 (hybrid chain), §4.4/§4.5 (chips), §9 (architecture notes), M-family laws
- `roadmap.md` — full milestone list with dependencies
- `roadmap-supplement-m0.md` — M0 sets up the routing split; you do not own M0 but M1/M6/M7 endpoints must stay compatible with both `/` and `/legacy` per its rules
- `ISMAEL-RESPONSE-2026-07-13.md` — your own Q1–Q10 answers; the roadmap's acceptance criteria assume these

Everything below quotes acceptance criteria verbatim from those docs. Where a rule number appears (L1, W3, §7 rule 8, etc.), the canonical text is in `system-v1.1.md` — do not paraphrase.

---

## Your milestones at a glance

| Milestone | What you ship | Depends on | Pair with |
|---|---|---|---|
| M1 | `model_meta.json` object + wiring; `server.js:585`/`:867` retirement | nothing | Edwin (chatbot answer copy) |
| M2 | AUC rerun (5-fold CV, std); freshness residual named | M1 | — |
| M6 | Postgres status events table + endpoints; watchlist migration | nothing technical (parallels M3–M5) | — |
| M7 | Snapshot diffing → `events.json` | M1 (run stamps) | — |

Do them roughly in this order. **M1 is the cross-cutting first move** — it unblocks Pedro's chip copy, ledger AUC line, freshness anchors, and both footers. M6 and M7 can run parallel to M3–M5 once M1 is out.

---

## M1: `model_meta` rollout + stale-string retirement

**Spec sources:** `system-v1.1.md` §9 (fields), §7 rules 8/9 (consumers), §4.4 (provenance chips); `ISMAEL-RESPONSE-2026-07-13.md` Q5 + Q10; `roadmap.md` M1.

### What ships

Three things in one milestone, deliberately bundled per your Q10:

1. **`model_meta.json`** written by both pipeline scripts (`train_xgboost.py`, `update_enrichment_risk.py`). Params-unchanged runs refresh `run_date` only.
2. **`/api/meta` reads model info from `model_meta.json`**, not from a hardcoded string. This retires the drift class that produced the stale "GBM" reference at `api/server.js:585`.
3. **`/api/explain` FAQ answer at `api/server.js:867` fully rewritten** (not string-swapped) to remove the L1-violating probability phrasing for `ml_risk`. Edwin owns the copy. You wire it.

### Acceptance criteria (from `roadmap.md` M1, verbatim)

- `model_meta.json` contains the twelve §9 fields in snake_case, written by `train_xgboost.py` and `update_enrichment_risk.py` (params-unchanged runs refresh `run_date` only).
- No hardcoded model-name or AUC string remains in `server.js` (§7 rule 9: "model version copy sources from `model_meta.model_version`, never hardcoded").
- The chatbot answer contains no probability/likelihood claim for `ml_risk` (L1; ledger #20).
- AUC fields may be null pending M2; every consumer renders §7 rule 8 interim copy ("validation rerun in progress") when null.

### The `model_meta.json` object (locked)

From `ISMAEL-RESPONSE-2026-07-13.md` Q5, `system-v1.1.md` §9, and confirmed with you:

```json
{
  "model_name": "xgboost",
  "model_version": "XGB v1 · UNVAL",
  "params_hash": "<sha256 of best params JSON>",
  "commit": "<git HEAD sha>",
  "cv_auc": null,
  "cv_std": null,
  "cv_kfold": 5,
  "n_labeled": 1003,
  "n_positive": 54,
  "label_definition": "≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023",
  "run_date": "2026-07-01T06:00:00Z",
  "validation_status": "unvalidated"
}
```

Snake_case matches your existing API response style (per your Q5). `cv_auc` / `cv_std` populate in M2.

### Files you touch

- `train_xgboost.py` — write `model_meta.json` at end of every run
- `update_enrichment_risk.py` — write `model_meta.json` on params-unchanged runs (refresh `run_date` only; recompute `params_hash` and confirm it matches; if it doesn't, do a full write)
- `api/server.js:585` — replace hardcoded model version with a read from `model_meta.json`
- `api/server.js:867` — replace the FAQ answer verbatim with Edwin's rewrite (see §Copy strings from Edwin below)
- `api/server.js` `/api/meta` handler — return `model_meta` fields on the response
- `public/model_meta.json` — a version of this ships to production alongside enrichment; treated the same as the other pipeline outputs

### Copy strings from Edwin (referenced, not written by you)

- The rewritten `/api/explain` FAQ answer for `ml_risk` at `server.js:867` — Edwin drafts, you paste. He is following §7 rule 8 (AUC template) and §7 rule 9 (model version source) and L1 (no percent sign, no probability phrasing on `ml_risk`).
- The interim "validation rerun in progress" copy is not yours to author — it comes directly from `system-v1.1.md` §7 rule 8.

### Do not

- Do not write a `cv_auc` value at M1. The rerun is M2. Ship null.
- Do not paraphrase Edwin's chatbot answer rewrite. Paste it verbatim.
- Do not touch `/api/data/*` endpoints in M1 — those stay stable through M6.
- Do not remove the `/api/explain` endpoint — it's shared with legacy per `roadmap-supplement-m0.md`.

### Branch

`ismael/M1-model-meta`

### PR description template

```
Ships M1: model_meta rollout + stale-string retirement.

Acceptance criteria met (roadmap.md M1):
- [x] model_meta.json contains 12 §9 fields, snake_case, written by both pipeline scripts
- [x] server.js:585 sources model version from model_meta (no hardcoded string)
- [x] server.js:867 chatbot answer rewritten (Edwin copy pasted verbatim); no L1 violation
- [x] AUC fields null pending M2; all consumers render §7 rule 8 interim copy

Fields consumed by frontend surfaces (Pedro to verify):
- model_meta.model_version → provenance chips (§4.4)
- model_meta.cv_auc + cv_std + cv_kfold + n_positive → §7 rule 8 template
- model_meta.run_date → topbar + freshness anchor (§9)
- model_meta.validation_status → chip suffix

Deviations: <none / or list>
```

---

## M2: AUC rerun + freshness residual naming

**Spec sources:** `ISMAEL-RESPONSE-2026-07-13.md` Q4 + Q9 (freshness residual is #22); `roadmap.md` M2; `system-v1.1.md` §4.5, §7 rule 8, ledger #22.

### What ships

Two things:

1. **Clean 5-fold CV AUC** with std on the locked XGBoost config, written into `model_meta.cv_auc` and `cv_std`.
2. **The ~5-row freshness edge state named** (ledger #22). This is the residual between the four freshness states (Δ '24 fresh: 422; Δ '23 only: 321; no adjacent-yr Δ: ~208; Uncertain: 254) and the total 1,210. They currently sum to 1,205; five rows are in an unnamed edge state. Look at what those rows have in common and name the state honestly.

### Acceptance criteria (from `roadmap.md` M2, verbatim)

- `cv_auc` and `cv_std` populated from `cross_val_score` on the chosen config, not a GridSearchCV best.
- §7 rule 8 template renders end-to-end: `"ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)."`
- The four freshness states plus the named residual sum to 1,210 (W4 sum discipline).
- §4.5 chip copy locks after the naming.

### Locked XGBoost config (from Q4)

```python
XGBClassifier(
    colsample_bytree=1.0,
    learning_rate=0.1,
    max_depth=6,
    n_estimators=300,
    scale_pos_weight=18,
    subsample=0.8,
)
```

Dataset: **1,003 labeled, 54 positive (5.4%).** Use `sklearn.model_selection.cross_val_score` with `StratifiedKFold(n_splits=5, shuffle=True, random_state=<pick and record>)`. Report mean and std. Record the random seed in `params_hash` scope so re-runs are reproducible.

### Files you touch

- `train_xgboost.py` — add the `cross_val_score` runner; write results to `model_meta.json`
- `update_enrichment_risk.py` — inspect the ~5 residual rows, name the state (a new value in the freshness state field, whatever you call it), regenerate `buildingEnrichment.json` so the state renders per row
- No frontend changes from you; Pedro consumes the new state and copy templates from `model_meta`

### Do not

- Do not use `GridSearchCV.best_score_` — Fable explicitly called the 0.6833 in `xgboost_results.md` optimistic. Fresh `cross_val_score` on the chosen config only.
- Do not name the residual state with model-abstraction language ("edge case", "unclassified"). Name it for the checkable fact that produced it — that's why we're looking at those 5 rows. §4.5 discipline: freshness states are all named for verifiable data conditions.
- Do not lock chip copy until the residual is named and the state sums equal 1,210.

### Branch

`ismael/M2-auc-rerun-freshness-residual`

---

## M6: Status events endpoint + watchlist migration

**Spec sources:** `ISMAEL-RESPONSE-2026-07-13.md` Q7; `system-v1.1.md` §9 (write path), §4.2 (workflow states); `roadmap.md` M6.

### What ships

Append-only status events keyed by BBL, on **Railway Postgres** (per your Q7 recommendation — no reason to introduce SQLite). Two endpoints. Watchlist migration.

1. **`POST /api/buildings/:bbl/status`** — append a status event.
2. **`GET /api/buildings/:bbl/status`** — hydrate; current state = latest event.
3. **`/api/watchlist/save` and `/api/watchlist/load` migrate to the same table.** The in-memory `watchlistStore` Map at `api/server.js:314` retires.

### Acceptance criteria (from `roadmap.md` M6, verbatim)

- Schema per §9 (`bbl`, `status`, `actor`, `note`, `timestamp`; current state = latest event).
- `actor` = session token with a documented alias path to names.
- Watchlist survives a restart and a redeploy.
- §4.2 vocabulary enforced server-side (`Dismissed` requires a `reason`; `Contacted` timestamped and suppresses re-queueing for cooling-off window).
- Copy nowhere pretends per-analyst identity exists (§9).

### Postgres schema (proposed — confirm before coding)

```sql
CREATE TABLE building_status_events (
  id           BIGSERIAL PRIMARY KEY,
  bbl          TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN (
                 'unreviewed', 'in_review', 'contacted',
                 'confirmed_at_risk', 'false_positive', 'dismissed',
                 'watchlisted'
               )),
  actor        TEXT NOT NULL,           -- session token today; alias to name later
  note         TEXT,                    -- required if status = 'dismissed'
  reason       TEXT,                    -- required if status = 'dismissed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_events_bbl_created ON building_status_events (bbl, created_at DESC);
```

Current state per BBL = `SELECT DISTINCT ON (bbl) * FROM building_status_events ORDER BY bbl, created_at DESC`.

- `watchlisted` is a status like any other; watchlist load = "buildings where latest event.status = 'watchlisted'". This is why `/api/watchlist/save` and `/load` migrate cleanly to the same table.
- `Dismissed` server-side check: reject the write if `reason` is null.

### Vocabulary enforcement (from §4.2)

Legal transitions and requirements:
- Any → `unreviewed` — no gate
- `unreviewed` → `in_review` — no gate
- `in_review` → `contacted` — no gate; `created_at` becomes the cooling-off anchor
- `contacted` → `confirmed_at_risk` / `false_positive` — no gate; these become training labels next model version
- Any → `dismissed` — **requires `reason`** (server rejects otherwise)
- Any → `watchlisted` — no gate

Cooling-off window length (post-Contacted) is TBD from David (open ledger #8). Do not enforce the window server-side yet — just persist `Contacted` events with `created_at` so a client-side or later server-side filter can compute suppression.

### Files you touch

- New: `api/db.js` — Postgres client (use `pg` npm package; `DATABASE_URL` env var per Railway convention)
- New: `api/migrations/001_building_status_events.sql` — schema migration script
- Modify: `api/server.js` — add the two endpoints; retire `watchlistStore` Map at `:314`; rewrite `/api/watchlist/save` and `/load` to hit Postgres
- Modify: `.env.example` — add `DATABASE_URL`
- Modify: `Dockerfile` / `railway.json` if any startup order requires the DB to be reachable before the API accepts requests

### Do not

- Do not use SQLite. Your Q7 explicitly rules it out — Railway Postgres is available.
- Do not introduce an ORM. Direct SQL via `pg` is fine and matches the codebase's low-dependency style.
- Do not have the server enforce cooling-off suppression until David gives us the window length.
- Do not have `actor` render as anything but the session token in copy — §9 says "copy must not pretend per-analyst identity exists until it does."

### Branch

`ismael/M6-status-events`

---

## M7: Snapshot diffing → `events.json`

**Spec sources:** `ISMAEL-RESPONSE-2026-07-13.md` Q6; `system-v1.1.md` §4.3 (event kinds), §9 (snapshot diffing); `roadmap.md` M7.

### What ships

Prev-file copy on the Railway volume, end-of-run diff, `events.json` emitted in the §4.3 grammar. DIVERGE derives inline from the current run (no diffing needed for it).

### Acceptance criteria (from `roadmap.md` M7, verbatim)

- Every event carries subject, verb, evidence, consequence fields (W2: "no event without a named trigger").
- Batch kinds (`DATA`, `DIVERGE`) aggregate to one entry with counts.
- `TIER` events name which condition changed.
- Events carry the `model_meta.run_date` of the run that produced them (W1).

### The `events.json` grammar

Each event object:

```json
{
  "kind": "TIER_UP" | "TIER_DOWN" | "PERMIT" | "DATA" | "STATUS" | "DIVERGE" | "MODEL",
  "subject": "<BBL or address>" | "<batch>",
  "verb": "<what happened, one clause>",
  "evidence": {
    "before": "<prev value or state>",
    "after": "<current value or state>",
    "field": "<field name that changed>"
  },
  "consequence": "<what the analyst does next, one clause>",
  "run_date": "<from model_meta.run_date>",
  "count": <int, only for batch kinds DATA and DIVERGE>
}
```

### Event kinds (from §4.3)

- **TIER ^** (tier up): `diagnostic_risk` moved from a lower tier to a higher tier. Name the modifier that fired.
- **TIER v** (tier down): opposite direction. If it happened during a cooling-off window post-Contacted, suppress per open ledger #8 (Edwin will confirm suppression rules with David).
- **PERMIT**: `dob_jobs` count changed for a BBL. Evidence carries permit count before/after.
- **DATA**: a batch event. New LL84 / DOF / DOB data landed. Aggregates to one entry with `count`.
- **STATUS**: an analyst status write happened between runs (`in_review`, `contacted`, `dismissed`, etc.). Sourced from `building_status_events` table.
- **DIVERGE**: base-Low → final-High promotion. Derives inline from current run only (base tier computed from `ml_risk` cutoffs). Aggregates to one entry with `count` for the batch. **No prev-file needed for DIVERGE.**
- **MODEL**: reserved for Phase 2 version/validation changes. Do not emit in M7.

### Diffing mechanism (from your Q6)

```
Before pipeline run:
  cp buildingEnrichment.json buildingEnrichment_prev.json  # on Railway volume

At end of pipeline run:
  diff buildingEnrichment.json against buildingEnrichment_prev.json by address key
  fields: diagnostic_risk, ll97_over_2024, ll97_over_2030, dob_jobs
  emit events.json with model_meta.run_date stamp on every event
```

`events.json` writes to `public/events.json` and is served via `/api/events` (new endpoint, behind `requireAuth`).

### Files you touch

- Modify: whichever script is the pipeline entrypoint (or add a new `snapshot_diff.py` that runs at end of pipeline). It shells out `cp buildingEnrichment.json buildingEnrichment_prev.json` before the run and produces `events.json` after.
- New: `public/events.json` — pipeline output
- New: `api/server.js` `/api/events` handler — reads `public/events.json`, behind `requireAuth`
- Railway volume mount: confirm `buildingEnrichment_prev.json` lives on the persistent volume, not in the container-baked layer

### Do not

- Do not diff `ml_risk` directly — it moves on every model run; the meaningful signal is `diagnostic_risk` (post-modifier) shifting.
- Do not aggregate `TIER` events. They must be per-BBL so the queue can attach them to specific rows.
- Do not emit `MODEL` events yet. Reserved for Phase 2.
- Do not run the diff if there's no prev-file (first pipeline run after this ships): emit a designed placeholder event (`"kind": "DATA", "verb": "First diffed run: awaiting second snapshot"`) so the landing has something honest to render per M9's graceful degradation.

### Branch

`ismael/M7-snapshot-diffing`

---

## Cross-cutting notes

### The 1,260 vs 1,210 building count discrepancy

`buildingEnrichment.json` in this repo contains **1,260 buildings**. Every spec, every count, every M-family law citation in `system-v1.1.md` assumes **1,210**. Fable derived the counts from the last coverage table she saw, which may have been an older `buildings.json`.

**Please verify before M2's freshness residual work:**
- Is 1,260 the current total? If so, the four freshness states (422 + 321 + 208 + 254 = 1,205) plus the ~5 residual = 1,210 does not equal 1,260. Something moved, and the design docs need updating.
- Is 1,210 filtered by a criterion (steam-served only, LL84 only, etc.) and 1,260 the unfiltered total? If so, name the filter — that's the "population" per M1.

Flag your finding in Slack before M2 lands; if it's a filter difference we amend `system-v1.1.md` and Pedro's chip counts.

### The `/api/explain` endpoint stays shared

Per `roadmap-supplement-m0.md`, `/api/explain` at `api/server.js:899` serves both the new build (which does not import AIAgent) and the legacy `/legacy` route (which does). Your M1 rewrite of the FAQ answer at line 867 is intentionally shared — both surfaces get the fix. Do not fork the endpoint.

### The `/api/watchlist/*` endpoints stay compatible during M6

M0 already shipped: legacy dashboard at `/legacy` uses `/api/watchlist/save` and `/load`. When you migrate those to Postgres in M6, **preserve the request/response shapes** so legacy keeps working. If a shape change is unavoidable, patch the legacy code in the same PR to match; the boundary rule allows targeted legacy patches when a shared endpoint's contract evolves.

### Environment variables you may need to add

- `DATABASE_URL` — Railway Postgres connection (M6)
- No new LLM keys needed
- `NOAA_TOKEN` stays optional (already handled)

Update `.env.example` when you add anything.

### Testing

Every endpoint you add should get a smoke test in `api/smoke.test.js`. Minimum coverage:
- Auth required (returns 401 without Bearer token)
- Happy path returns 200 with expected shape
- Bad input rejected (400 for malformed body, 404 for unknown BBL, etc.)

Component tests are Pedro's problem. You focus on API contract.

---

## Branch & PR flow (durable)

- Branch: `ismael/M<n>-<slug>` per milestone. One PR per milestone where possible.
- PR description **must list** which acceptance criteria are met (quote each or ✓ each) and which `system-v1.1.md` laws or §9 clauses the change respects.
- **Never `--no-verify`** on commits or `--force` on push. Investigate hook failures.
- Push to `main` deploys to Railway automatically. Verify `/api/health` returns 200 post-deploy; smoke-test `/api/meta` after M1, `/api/buildings/:bbl/status` after M6, `/api/events` after M7.

---

## What NOT to do (durable)

- Do not hardcode model version, AUC, or any string that `model_meta.json` should be the source of truth for (§7 rules 8/9).
- Do not add `ml_risk` percent-formatting anywhere on any response payload (L1). The API returns raw floats; frontend renders percentiles.
- Do not remove or rename existing `/api/data/*` endpoints — Pedro's `useBuildings` hook consumes them and legacy consumes them too.
- Do not expose `public/*.json` via `express.static`. They must stay 403 unless behind `requireAuth` (see `CLAUDE.md` §Data protection).
- Do not introduce SQLite or an ORM.
- Do not skip writing a smoke test for a new endpoint.
- Do not add features not in the roadmap. If you see something you think should be built, Slack me — don't scope creep the PR.

---

## Cross-references quick index

| Need | Look in |
|---|---|
| Full API contract | `CLAUDE.md` §Backend architecture |
| Data pipeline script map | `CLAUDE.md` §Data pipeline |
| `model_meta.json` full schema | This file §M1; `ISMAEL-RESPONSE-2026-07-13.md` Q5; `system-v1.1.md` §9 |
| Exact XGBoost config for M2 | `ISMAEL-RESPONSE-2026-07-13.md` Q4 |
| Postgres schema (proposed) | This file §M6 |
| Event grammar | `system-v1.1.md` §4.3; this file §M7 |
| Copy strings for chatbot rewrite | Edwin (his brief §M1) |
| Legacy discipline (shared endpoints) | `roadmap-supplement-m0.md`; `CLAUDE.md` §Legacy |

---

## Ping me if

- A canonical doc contradicts another canonical doc.
- The 1,260 vs 1,210 count discrepancy resolves as anything other than "filter difference, name it."
- Postgres schema needs a field the §9 spec didn't anticipate.
- Puppeteer install decision comes up (Pedro's M5) and Railway env constraints matter.
- The AUC rerun produces something Fable's design copy doesn't accommodate (e.g., a low AUC we need to word carefully).

Fable does not answer implementation questions. I do.
