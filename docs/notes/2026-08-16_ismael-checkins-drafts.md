# Ismael check-in drafts — 2026-08-16

Two async messages to Ismael. Reviewed and sent by Edwin (channel of choice: Slack DM, GitHub PR comment, or issue — Ed's call). Not sent by the assistant.

Timing: send post-6 PM ET (out of class) or after tonight's 7 PM call.

---

## 1. R7 watchlist migration — status check

**Context**: PR #10 ships the status-events half of R7 (Postgres append-only table, `POST/GET /api/buildings/:bbl/status`). ROADMAP.md R7 also covers the watchlist migration leg: retiring the in-memory `watchlistStore` Map at `api/server.js:314` and moving `/api/watchlist/save` and `/load` to the same table. PR #10's diff confirms the watchlist leg isn't in it. R7 has been at "planned" for 3+ weeks without a separate PR surfacing.

**Ask**: is R7 watchlist migration still on your plate, or has the plan shifted? Not blocking anything urgent — legacy watchlist still works in-memory — but useful to know before I plan M9's This Week landing composition, since the landing surfaces watchlist state.

**Draft message** (edit register to taste):

> Hey — quick R7 check-in. PR #10 ships the status-events half, and the ROADMAP has the watchlist migration in the same R7 line (retire `watchlistStore` Map at server.js:314, move `/api/watchlist/save` and `/load` to the same Postgres table). That leg hasn't surfaced in a PR yet. Still on your plate? Not urgent — in-memory works — but I need to know whether to plan M9 assuming Postgres-backed watchlist or the current session-scoped Map.

---

## 2. `plans/ai_model_config.md` — status check

**Context**: This file was referenced as an in-flight plan doc ~2 weeks ago but never appeared in `plans/`. Current contents of `plans/`: improvements.md, kmeans_refocus.md, optimization_plan.md, phase1_noaa_pipeline.md, phase2_methodology_alignment.md, phase2_per_building_regression.md, phase3_ui_dual_tier.md, plan.md. No `ai_model_config.md`.

**Ask**: is this doc still coming, superseded by another doc, or scope that got absorbed elsewhere? If it's dead, retire the reference. If it's alive, would be good to have it before M3 container review — the AI model config is likely to touch how `/api/predict/custom` weights are exposed, which affects the score cell's chip vocabulary at some point downstream.

**Draft message** (edit register to taste):

> Second small one — `plans/ai_model_config.md` came up ~2 weeks ago but hasn't landed. Not in `plans/` today. Still coming, absorbed into another doc, or dead? If dead, no problem, just want to close the loop so I stop mentally tracking it.

---

## Sending guidance

- Bundle both in one Slack DM if channel-of-record is Slack. Two separate short messages read better than one long one.
- If GitHub: comment on PR #10 for the R7 one (visible to the merge chain reviewers), and file a lightweight issue for `ai_model_config.md` (or drop into Slack — no PR anchor for it).
- Neither is urgent. Answers can wait till post-merge tomorrow.
