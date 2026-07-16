# Ismael — PR #9 announcement message

Delivered 2026-07-16. Verbatim.

---

**PR #9 open for review** → https://github.com/ismaelcaraballo-afk/coned-dashboard/pull/9
branch: `ismael/monday-workflow`

**what's in it:**

**W1/W4/W6 — Monday workflow features**
- W1: pipeline timestamp in the header (dataset date · steam year · LL84 date · last review)
- W4: queue arithmetic in the stats bar — Critical − contacted − dismissed = to review (persists per user in localStorage)
- W6: quick filter buttons strip — High Risk, Big Drop, LL97 Over Limit, Critical+Signal, Large Buildings, Clear
- contact/dismiss toggles on each table row

**M1 — model_meta.json + retire hardcoded GBM strings**
- `public/model_meta.json` is now the single source of truth for model provenance
- new `GET /api/model_meta` endpoint (auth-gated) — Pedro can wire this into the score cell/header ledger
- `/api/meta` now reads `model_version` from model_meta instead of a hardcoded string
- chatbot FAQ rewritten: XGBoost description, templated AUC sentence, removed the GBM calibration claim

**M2 — AUC rerun complete**
- ran 5-fold CV on the locked XGBoost config (not GridSearchCV best — proper cross_val_score with std)
- result: **AUC 0.6833 ± 0.0511** (1003 labeled, 54 positive, 5-fold stratified)
- this is the number that lands in the case-file header ledger and report footer

**also sent Edwin the Q1–Q10 reply doc** — Path C signed off, Critical v1.1 (n=23) signed off, AUC rerun delivered

**needs from team:**
- Edwin / Pedro: review PR #9
- Pedro: M0 (legacy routing) and M3 (Score Cell atom in Rankings table) are next on your side
