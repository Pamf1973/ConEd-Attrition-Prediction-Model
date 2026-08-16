# PR #10 approval-freshen at head f5bfd17 | 2026-07-18 05:29

**Branch:** `ismael/pr-9b-status-events` on `ismaelcaraballo-afk/coned-dashboard`
**Approved SHA:** `646f88a` (Edwin, 2026-07-18 02:41 UTC per prior /sync)
**Current head:** `f5bfd17f3db287309f2258fde63c9e138665f5d8`
**State:** OPEN · MERGEABLE · CLEAN · reviewDecision=APPROVED (attached to stale 646f88a)
**Post-approval delta:** 2 commits, 102 lines changed (`api/db.js` +46/-20, `api/server.js` +24/-12)

The approval-freshen question: two commits landed after Edwin's 2026-07-18 02:41 UTC APPROVED review. GitHub keeps the approval attached to `646f88a`, but the head is now `f5bfd17`. Options were (a) formal re-approve on new head, (b) leave stale approval and comment "trust merged", (c) request full re-review as if unapproved.

This note documents the decision: **(a) formal re-approve on `f5bfd17`.** Reasoning + fix-by-fix assessment below.

## Post-approval commits

### bf03f84 — first panel-review pass (10 fixes)

1. **`initSchema` transaction wrap** — CREATE TABLE now in an explicit BEGIN/COMMIT with ROLLBACK on failure. Prevents half-created state if two Railway deploys race on startup. Indexes moved outside the tx (CREATE INDEX CONCURRENTLY cannot run inside a transaction). ✓ Correct.
2. **`VALID_STATUSES` DDL-injection guard** — regex assertion at module load that each status value matches `/^[A-Za-z ()-]+$/`. Defense-in-depth: the values are string-interpolated into CHECK constraint DDL, so a future contributor adding e.g. `"Foo'; DROP TABLE ..."` gets a startup-time throw. Safe pattern for the current values ("Contacted", "In Discussion", "Dismissed", etc.). ✓
3. **`getBulkCurrentStatus` LATERAL rewrite** — replaces `DISTINCT ON (bbl) ORDER BY bbl, created_at DESC` with `unnest($1) CROSS JOIN LATERAL (SELECT ... LIMIT 1)`. Forces per-BBL index scan bounded by LIMIT 1 instead of the full sort over the WHERE-matched rows. Correct pattern for the seqscan-DoS mitigation. Query planner should now hit `idx_bse_bbl_ts` per BBL. ✓
4. **Bulk cap 2000 → 500** — reasonable, client can chunk. ✓
5. **`actorTag` throw on missing/non-string token** — was silently producing an HMAC of `undefined`, corrupting audit trail. Explicit `throw new Error("actorTag: missing session token")` upstream is cleaner than downstream phantom-entry cleanup. ✓
6. **`sanitizeNote` regex expansion** — added CR (`\x0d`), NEL (`\x85`), soft hyphen (`\xad`), U+200B–200D (zero-width/ZWJ), U+2028/2029 (line-terminator log-splitters). Thorough coverage of the log-injection surface. Note the comment expansion also documents which chars are intentionally kept (tab, LF). ✓
7. **Pagination `limit=0` fix** — old `parseInt(...) || 100` silently coerced `0` to `100`. Now `Number.isFinite(rawLimit) && rawLimit >= 1 ? rawLimit : 100`. Semantically the same client-facing behavior (invalid → 100) but honest about the coercion. ✓
8. **Dead `getCurrentStatus` export removed** — unused, latent misuse risk. ✓ (Note: re-added in f5bfd17 for the offset>0 fix. Net state is correct; flip-flop across the two commits is a minor audit smell but not a code issue.)
9. **`db.js` TLS TODO** — `rejectUnauthorized: false` documented as known limitation, wants a `DATABASE_CA_CERT` env var with Railway's CA bundle. ✓ documentation of tech debt.
10. **`server.js` import cleanup** — matched the export removal. Reverted in f5bfd17 alongside the export re-add.

### f5bfd17 — second panel-review pass (5 fixes)

1. **`GET /api/buildings/:bbl/status` current-status independence** — bug fix. Old code used `history[0]` as `current`. If client requested `offset=100`, `history[0]` is event #100, not the actual current status. Now `getCurrentStatus(bbl)` is called separately via `Promise.all` alongside `getStatusHistory`. Correct fix; the parallel dispatch avoids serialization latency. ✓
2. **Offset upper cap 100_000** — old code accepted any `Number.isFinite` offset, so `?offset=9999999999` was a full-table-scan DoS. `Math.min(..., 100_000)` bounds it. Reasonable ceiling for an append-only audit table. ✓
3. **`ACTOR_HMAC_SECRET` startup-fatal in production** — this is the important one. Without a persistent secret, the fallback (`randomBytes(32).toString("hex")`) is regenerated per process. On every Railway redeploy, the actor pseudonyms recomputed from the same session tokens now hash to different values → historical audit trail attribution silently breaks. The `throw` at startup forces the misconfiguration to surface immediately rather than after audit history is corrupted. ✓ Aligns with D10 commitment (Ismael to set ACTOR_HMAC_SECRET on Pedro's new Railway env before merge).
4. **`getCurrentStatus` export re-added** — needed for the offset-independence fix in #1. ✓
5. **`getCurrentStatus` import restored** — matched. ✓

## Assessment

**Character of the delta:** 100% defensive hardening. Zero API-contract changes. Zero new features. Zero intended-behavior changes. The two post-approval commits tighten existing behavior along five axes:
- DoS-surface reduction (offset cap, bulk cap, LATERAL query planning)
- Bug fix (offset>0 returning current:null)
- Fail-fast misconfiguration (ACTOR_HMAC_SECRET, actorTag guard, VALID_STATUSES DDL assertion)
- Audit-trail integrity (HMAC secret required, phantom entries blocked, CRLF/NEL/ZWSP scrubbing)
- Concurrency safety (transaction wrap, CONCURRENTLY indexes)

Every fix is defensible. Every fix has a plausible attack or failure mode it prevents. Nothing is speculative or gold-plating.

**Why formal re-approval and not trust-merge:**

1. **Volume.** 102 lines / 15 fixes is enough that "APPROVED on stale SHA" leaves a misleading audit trail. Anyone looking at PR #10 in six months sees an approval and no signal that half the security hardening happened after it.
2. **The changes have actually been reviewed.** We're going through them fix-by-fix in this note. That's a review, not a trust-merge. Might as well have GitHub reflect it.
3. **Precedent.** This is the first PR in the project where post-approval commits materially altered scope. The rule should be: post-approval commits with material scope get re-reviewed, not trust-merged. Establish it here.
4. **D10 sequencing benefit.** Formal re-approve on f5bfd17 gives Ismael a clean merge-when-ready state. When D10 clears (Pedro's Railway up, Mel's env vars migrated, ACTOR_HMAC_SECRET set), Ismael can merge without any pending-review-response ambiguity.

## Merge preconditions (hard blockers)

Before this PR can safely merge, the D10 chain must complete:

1. **Pedro:** link coned-dashboard to a new Railway service on his account, share deploy URL
2. **Mel:** migrate env vars (DASHBOARD_PASSWORD, GROQ_API_KEY, OPENROUTER_API_KEY, NODE_ENV, SKIP_ENRICHMENT)
3. **Ismael:** add `ACTOR_HMAC_SECRET` to new Railway env

If PR #10 merges before #3 completes, the deployed container crashes at startup (per the `throw new Error("FATAL: ACTOR_HMAC_SECRET must be set in production")` guard added in f5bfd17). This is intentional — fail-fast on misconfiguration is preferable to silently corrupting audit trails — but it means merge and env-var must ship together.

## Six D8 post-merge follow-ups still outstanding

From `docs/notes/2026-07-17_pr-10-review.md` §Suggested follow-ups. One retired by f5bfd17 (ACTOR_HMAC_SECRET-required-in-prod on the code side; env-var side now scoped to Pedro's new Railway per D10). Remaining five:

1. CHECK constraint drift monitoring
2. Smoke tests for `/api/buildings/status/*` routes
3. SERIAL → BIGSERIAL for the `id` column (long-horizon overflow)
4. Bulk/single shape parity (bulk returns `{bbl: {status, actor, created_at}}`, single returns `{current: {...}, history: [...], limit, offset}` — divergent shapes)
5. DB_POOL_MAX ceiling to prevent env-driven overallocation

None block merge; all can land in a post-merge cleanup PR.

## Verdict

**APPROVE at f5bfd17.** Formal re-approval, not trust-merge. Merge held on D10 chain; when unblocked, Ismael can merge as-is. Six D8 follow-ups tracked as post-merge work.

**Action items:**
- Formal re-approve on `f5bfd17` via `gh pr review 10 --approve --body "..."` — pointer to this note
- No changes requested; the PR is merge-ready modulo D10

**Cross-refs:**
- Prior review: `docs/notes/2026-07-17_pr-10-review.md`
- Sibling review: `docs/notes/2026-07-18_pr-11-rereview.md` (M0 verify Finding B related — Ismael's provenance-gating heuristic touches both PRs)
- Merge sequencing decision: D10 in `DECISIONS.md`
