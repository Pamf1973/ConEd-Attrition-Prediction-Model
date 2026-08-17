# AI-Driven Model Configuration — Plan

**Author:** Ismael  
**Date:** 2026-07-16  
**Status:** Planning — panel review complete 2026-07-16  

## Summary

Allow users to reconfigure the ML pipeline (model type, reference temperature, hyperparams, feature toggles, label threshold) through natural language in the dashboard chatbot. AI interprets the intent, produces a validated JSON diff, user confirms, server applies config and triggers a retrain, dashboard reflects updated scores.

---

## Tunable Parameters

| Parameter | Current Value | Example Command |
|---|---|---|
| Model type | XGBoost | *"switch to Random Forest"* |
| Reference temperature (HDD base) | 65°F | *"use 60°F as the base temp"* |
| Positive label threshold | ≥50% steam decline | *"only flag buildings with 60%+ drop"* |
| n_estimators | 300 | *"increase tree count to 500"* |
| scale_pos_weight | 18 | *"rebalance for fewer false positives"* |
| max_depth | 6 | *"reduce overfitting, depth 4"* |
| Feature toggles | all on | *"remove DOB permits from the model"* |
| CV folds | 5 | *"run 10-fold CV instead"* |

---

## Architecture

### Layer 1 — Intent Parser (LLM)

New endpoint `POST /api/model-config/parse` — takes free-text command, sends to Groq/OpenRouter with strict system prompt, returns a validated JSON diff only. The LLM never writes files directly.

```json
{
  "change": "reference_temp",
  "from": 65,
  "to": 60,
  "rationale": "User requested 60°F HDD base"
}
```

Allowed fields and value ranges are whitelisted server-side. If the LLM returns anything outside the whitelist, the request is rejected before it touches any file.

### Layer 2 — Config Store (`model_config.json`)

New file in `/public/` (like `model_meta.json` but writable at runtime):

```json
{
  "model_type": "xgboost",
  "reference_temp_f": 65,
  "label_threshold_pct": 50,
  "hyperparams": {
    "n_estimators": 300,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 1.0,
    "scale_pos_weight": 18
  },
  "feature_mask": [
    "ll97_penalty_2024_log",
    "steam_kbtu_log",
    "ll97_over_2024",
    "ghg_intensity",
    "peer_score",
    "ll97_penalty_2030_log",
    "cluster",
    "steam_ghg_share",
    "energy_star_score",
    "year_built",
    "dob_jobs_24mo",
    "use_type_ordinal"
  ],
  "last_modified_by": "ai_chat",
  "last_modified_at": "2026-07-16T00:00:00Z"
}
```

### Layer 3 — Retrain Trigger

`POST /api/model-config/apply` — server validates the diff, writes `model_config.json`, then shells out to:

```
python3 train_xgboost.py --config public/model_config.json
```

Results are async. Frontend polls `GET /api/model_meta` every 10s until `run_date` changes. Retrain rate-limited to 1 per 5 minutes.

### Layer 4 — Config Change Log (Postgres)

Reuse the append-only pattern from Q7 (`building_status_events`). New table `model_config_events`:

```sql
CREATE TABLE model_config_events (
  id         SERIAL PRIMARY KEY,
  diff       JSONB NOT NULL,
  actor      TEXT NOT NULL,        -- sha256 pseudonym (same as status events)
  rationale  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Every apply writes a row. Full audit trail, never updates, never deletes.

---

## UI Flow

```
User types: "change reference temp to 60°F"
     ↓
Chatbot shows preview:
  "I'll update HDD base temperature: 65°F → 60°F
   This affects weather normalization for all steam readings.
   [Apply] [Cancel]"
     ↓ user clicks Apply
POST /api/model-config/apply
Server writes model_config.json → shells out to train_xgboost.py
     ↓
Header banner: "Model retraining... (~2 min)"
Frontend polls GET /api/model_meta every 10s
     ↓
run_date changes → dashboard refreshes scores + model_meta card updates
```

---

## Guard Rails

- LLM output validated against whitelist before any file write — no prompt injection path to exec
- `reference_temp_f` must be 50–75 (int), `label_threshold_pct` must be 30–80 (int), etc.
- Append-only config change log — every change is auditable
- "Reset to defaults" always available (`POST /api/model-config/reset`)
- Retrain rate-limited: 1 per 5 min per session, 5 per day global
- Only authenticated users can trigger retrains (same bearer token gate as status endpoints)
- Shell-out to Python uses `subprocess.run` with a fixed arg list — no shell=True, no user input in args

---

## Scope Estimate

| Piece | Size | Estimate |
|---|---|---|
| `POST /api/model-config/parse` intent endpoint | Small | 1 day |
| `model_config.json` schema + server read | Small | 0.5 day |
| `train_xgboost.py` reads config file | Small | 0.5 day |
| `POST /api/model-config/apply` + retrain shell-out | Medium | 1 day |
| Frontend confirm flow + polling | Medium | 1 day |
| `model_config_events` Postgres table | Small | 0.5 day |
| "Reset to defaults" endpoint + button | Small | 0.5 day |

**Total: ~5 days.** No blockers — can start any sprint.

---

## Open Questions for Panel Review

1. Is shelling out to `train_xgboost.py` from the Express server safe enough, or should this go through a job queue (e.g. Railway cron / BullMQ)?
2. Should `model_config.json` be on the Railway volume (persistent) or in the repo (version-controlled but static at deploy)?
3. Is the LLM intent parser necessary, or should we use a structured form UI instead and skip the NLP layer entirely?
4. Should model type switching (XGBoost → RF → LogReg) be in scope for v1 or deferred to v2?
5. Any injection vectors in the diff → file write path we're missing?

---

## Panel Review — 2026-07-16 (GPT-5.3, Gemini-3-flash, DeepSeek-R1, Grok, Claude-Haiku)

### Q1 answered: Use BullMQ — unanimous
Direct shell-out from Express risks event loop blocking, HTTP timeouts, orphaned processes, and race conditions. Use BullMQ + Redis worker with bounded concurrency.

### Q2 answered: Postgres table or persistent volume — unanimous
`model_config.json` in `/public/` is a critical flaw — web-accessible, writable at runtime, no atomic writes, corrupt on mid-write crash. Move to `/configs/` (non-web-accessible) on a persistent Railway volume, or store revisions as Postgres rows. Serve via `GET /api/model-config` only.

### Q3 answered: Structured form for v1 — Gemini recommendation adopted
LLM intent parser eliminates the injection surface entirely. Skip NLP for v1, use a validated form UI. Add NLP as a v2 enhancement once the config/retrain plumbing is proven stable.

### Q4 answered: Defer model switching to v2
XGBoost → RF → LogReg requires different preprocessing, feature schemas, and hyperparameter namespaces. Too risky for v1.

### Q5 answered: `feature_mask` is the main vector
LLM-controlled strings in `feature_mask` written to config, then consumed by `train_xgboost.py`. If the script does dynamic imports or `getattr` on feature names, it becomes an RCE surface. Audit `train_xgboost.py` before wiring this.

### Additional findings

**🔴 Critical**
- Config in `/public/` — move immediately (see Q2)
- No file locking — `fcntl.flock` (Python) or Postgres advisory lock required before any file write
- Shell-out retrain from Express — replace with BullMQ (see Q1)

**🟡 Medium**
- `rationale` field must use `json.dump` for serialization — never string-concatenate into JSON (XSS + corruption risk)
- Rate limiting must be Redis-backed to survive restarts; in-memory limits reset on Railway redeploy
- `scale_pos_weight` and other numeric params need explicit range whitelists (e.g. 1–100) — OOM risk if unchecked

**🟢 Confirmed safe**
- `subprocess.run(["python3", "train_xgboost.py", "--config", path], shell=False)` — safe IF no variables interpolated into the list
- JSONB storage in Postgres for `model_config_events.diff` — Postgres handles escaping
