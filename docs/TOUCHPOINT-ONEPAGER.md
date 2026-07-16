# ConEd Steam Attrition · Touchpoint handout

**Date:** [FILL IN]
**Team:** Edwin Perez (design lead), Ismael Caraballo (backend), Pedro Martins (frontend)
**System doc:** `system-v1.1.md` v1.1 (2026-07-13)

---

## Where we are

Redesign is scoped. 12 milestones, all with acceptance criteria written. Legacy dashboard preserved as an unlinked hedge at `/legacy`. 5 spec atoms locked; system doc locks the voice, tokens, and laws.

**Shipped since last touchpoint:**
- LL97 dual-period gauges (2024 + 2030 emissions vs cap)
- SHAP driver panel on BuildingPanel (top-5 features per building)
- XGBoost predict endpoints behind auth
- Security hardening: O(1) enrichment lookup, atomic model writes

**Next 4 milestones:**
1. **M0** Legacy separation + `/legacy` routing (Pedro)
2. **M1** `model_meta.json` + retire hardcoded model strings (Ismael)
3. **M2** AUC rerun: 5-fold CV mean ± std on locked config (Ismael)
4. **M3** Score cell atom into the Rankings table (Pedro)

---

## The design frame (one paragraph)

Bloomberg Terminal that explains itself, workflow-first. The old dashboard shows a portfolio; the redesign shows the steam team's week. Every number carries its confidence: provenance chip, validation status, freshness state, coverage. The tier vocabulary is a hybrid — ML sets the base, three checkable modifiers can shift it up or down — and every surface names it that way.

---

## Response to your methodology alignment (Johan / Ildi)

| # | Item | What ships now | Round 2 |
|---|---|---|---|
| 1 | Per-customer weather-normalized regression | NYCHA 24-development regression as shipped exemplar; citywide HDD documented as known weakness | Blocked on billing-cycle data access |
| 2 | Diagnostic metrics suite (6 metrics) | ~2 of 6 partially present in case file (decline trend label, R² where present) | Blocked on item 1 |
| 3 | Uncertain tier aligned with regression fit | Fit-based gate where NYCHA regression exists (R² < 0.3); years-based gate elsewhere | Portfolio-wide fit-based gate when item 1 lands |
| 4 | Rule-based tier assignment with empirical thresholds | Hybrid tier (§4.1) on every surface; Exhibit D in the reasoning report | Fully learned tier explored |
| 5 | Positioning as complementary signals | Methodology page §8 and report method footer | Pattern-mining research track named as Round 2 engine |

Full analysis: `docs/ref/2026-07-16_methodology-alignment.md` in repo. Methodology page ships in M10.

---

## Critical v1.1 (composite queue state) — Ismael-verified against live data

```
Critical = ml_risk ≥ 0.6                        (the model's confident set, n=57)
       AND fresh '24 normalized delta present
       AND at least one trend modifier
           (IQR outlier in either delta period
            OR accelerating decline label)
```

**Population as of pipeline run 2026-07-01: 23 buildings.**
Top of queue: 660 Madison Ave · 200 E 42nd St · 58 W 58th St.

LL97 over-cap is deliberately excluded from the modifier leg — the log-scaled penalty is already feature #1 in the model (20% importance); the over-cap boolean carries 0 importance, so adding it as a modifier would double-count.

Requesting external sign-off (Ismael has signed internally).

---

## What we need from you

**David — six questions, any answer moves us forward:**
1. Critical v1.1 sign-off (23 buildings above)
2. Chip vocabulary — `XGB v1 · UNVAL`, `BT nn%`. Readable, or need spelling out?
3. Digest cadence, recipients, format preference (HTML + text, or text-only?)
4. Cooling-off window length after `Contacted` (days before that building can re-surface)
5. Territory gating — subsets per recipient, or everyone sees full portfolio?
6. Report review — DRAFT watermark (recommended) vs hard gate?

**Ildi — one question:**
7. Anything in the "Round 2" column above you'd want promoted to "now" — with the trade-off named?

Answers can be async — Slack, email, or reply to the meeting notes. Item numbers correspond to `system-v1.1.md` §10 open questions ledger items #5–10.

---

## Roadmap at a glance

| # | Milestone | Owner | Depends on |
|---|---|---|---|
| M0 | Legacy separation + `/legacy` routing | Pedro | — |
| M1 | `model_meta.json` + stale-string retirement | Ismael | — |
| M2 | AUC rerun + freshness residual naming | Ismael | M1 |
| M3 | Score cell into Rankings table | Pedro | M0; M1 for final chip copy |
| M4 | Case-file header | Pedro + Edwin | M3, M1 |
| M5 | Reasoning report (printable + PDF) | Edwin + Pedro | M4, M1 |
| M6 | Status events endpoint + watchlist migration | Ismael | (parallel) |
| M7 | Snapshot diffing → `events.json` | Ismael | M1 |
| M8 | Queue + modifier chips + Critical membership | Pedro | M3; M6 for arithmetic |
| M9 | This Week landing assembly | Pedro | M7, M8, M6, M1 |
| M10 | Methodology page | Edwin | M1 |
| M11 | Queue aggregate view (toggle) | Pedro | M8 |
| M12 | Weekly digest + compose flow | Edwin + Pedro | M9, M5, M1 |

Full roadmap with acceptance criteria: `docs/ref/2026-07-16_fable-roadmap.md` in repo.

---

## Contact

- **Design / content / methodology / David packet:** Edwin Perez · edwin.perez@pursuit.org
- **Backend, pipeline, models, deploy:** Ismael Caraballo · ismael.caraballo@pursuit.org
- **Frontend, atoms, workflow integration:** Pedro Martins · pedro.martins@gmail.com

Repo: github.com/ismaelcaraballo-afk/coned-dashboard
Live: [Railway URL]
