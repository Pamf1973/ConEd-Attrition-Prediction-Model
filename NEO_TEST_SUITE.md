# Neo Test Suite — 20-Question Regression Script

**Purpose:** Verify the ConEd Dashboard AI knows its numbers, formulas, model stats, and data edge-cases cold — and that input validation UX works correctly.

**How to use:**
1. Make sure the dashboard is running (`npm run dev` or `npm run dev:api && npm run dev:ui` in separate terminals)
2. Log in at `http://localhost:5173` (password: `coned-steam-2026`)
3. Open the **AI Chat Box** (bottom-right AI agent)
4. Type each question **exactly as shown**, read the answer, and mark ✅ or ❌
5. For questions 12–14, watch the **input validation UX** (red/amber hints in the chat input area before the request fires)

---

## Section 1 — Investor / Blackstone Analyst (Q1–7)
*Domain: financial exposure, model mechanics, data quality*

| # | Question | Expected Key Points | ✅ / ❌ |
|---|----------|-------------------|---------|
| 1 | **Total LL97 exposure 2024 + 2030?** | $81.9M (2024) / $270.9M (2030), 231% increase, 165 → 830 buildings | ☐ |
| 2 | **How much does LL97 grow?** | $189M increase story, Phase 2 mechanics explained (stricter caps post-2030 trigger massive expansion of non-compliant buildings) | ☐ |
| 3 | **Which building types attrition most?** | Offices first — cap rates 0.00846→0.00453, Cluster 4 (Post-War Commercial) evidence | ☐ |
| 4 | **Model reliability / AUC?** | AUC 0.645, explains why bimodal (54 × ≥90% + 1,076 × <10%) is still actionable | ☐ |
| 5 | **Data freshness?** | June 2026 snapshot, 2024 steam data, May 2025 LL84 deadline — latest available | ☐ |
| 6 | **321 missing 2024 buildings — worry?** | Worth monitoring, not a crisis — clean prior years but missing 2024 LL84, may be non-compliant filers, GBM blindspot noted | ☐ |
| 7 | **GBM math — loss function + boosting?** | Deviance / cross-entropy loss, F₀ = 0 initialization for binary, pseudo-residuals, shrinkage λ | ☐ |

---

## Section 2 — ELI5 / Actionability (Q8–11)
*Domain: plain-English explanations, actionable playbooks, data caveats*

| # | Question | Expected Key Points | ✅ / ❌ |
|---|----------|-------------------|---------|
| 8 | **[SIMPLE MODE] Explain the risk score** | Pizza delivery / Netflix / gym membership analogy — clean, no jargon, relatable metaphor | ☐ |
| 9 | **Building at 0.95 — next steps?** | 5-step playbook: ① outreach ② timeline conversation ③ LL97 fine analysis ④ permit strategy ⑤ peer score context | ☐ |
| 10 | **213 skip-year buildings?** | 2022 + 2024 data on file, 2023 gap, possible reasons (missed LL84, ownership change, lot merge/split, renovation) — flags for manual validation | ☐ |
| 11 | **Selection bias in training labels?** | 3 named biases: ① survivorship bias ② binary label bluntness ③ self-report noise | ☐ |

---

## Section 3 — Input Validation UX (Q12–14)
*Domain: test the client-layer validation by typing directly in the AI chat box*

> ⚠️ **Important:** These questions trigger validation **before** the request is sent to the server. Watch the chat input area:
> - **`qq4`** / **`hi`** — no vowel, or too short (< 3 chars) → `isValidQuery` returns false → **red error box**: *"That doesn't look like a valid question. Try asking about risk scores, LL97, steam usage, or a specific building type."*
> - **`yes`** — `isConversationalReply` matches → **amber hint box**: *"Each question starts fresh — I don't remember what came before. Ask a full question like 'What is LL97?' or 'Show high risk hotels'."*
>
> After seeing the client validation, the server-side fallback kicks in for direct API calls (graceful error handling).

| # | Input | Client-Layer UX | Expected Server Fallback | ✅ / ❌ |
|---|-------|-----------------|------------------------|---------|
| 12 | **qq4** | 🔴 Red error box — `isValidQuery` fails (no vowels, not a domain acronym) | AI redirects gracefully with example questions | ☐ |
| 13 | **yes** | 🟡 Amber hint box — `isConversationalReply` matches | AI invites a real question without confusion | ☐ |
| 14 | **hi** | 🔴 Red error box — `isValidQuery` fails (length < 3) | Friendly onboarding response ("Welcome to the ConEd Dashboard…") | ☐ |

---

## Section 4 — Technical Deep-Dive (Q15–20)
*Domain: model internals, features, formulas, data limitations*

| # | Question | Expected Key Points | ✅ / ❌ |
|---|----------|-------------------|---------|
| 15 | **5 clusters + descriptions?** | All 5 named correctly with risk levels and counts — Cluster 0 (Pre-War Active / Permit-Driven Churn), 1 (Modern Stable), 2 (Low-Risk), 3 (Steam-Dependent), 4 (Post-War Commercial) | ☐ |
| 16 | **SHAP values + feature ranking?** | 12 features ranked, LL97 penalty (log) ~22% top, steam log ~17%, LL97 over limit ~13% | ☐ |
| 17 | **3 biggest data holes (skeptic mode)?** | ① 782-building sample (small) ② selection bias (only buildings that submitted LL84) ③ binary label bluntness (attrited vs. not — no nuance) | ☐ |
| 18 | **LL97 formula + hospital walkthrough?** | GHG = steam_kBtu × 4.493e-5, cap calculation per sq ft, fine = max(0, GHG − cap) × $268 | ☐ |
| 19 | **Peer score definition + formula?** | z-score formula, EUI per sq ft per year, negative = more efficient than peers | ☐ |
| 20 | **Why K=5 not K=3 or K=7?** | Silhouette scores table: K=3 → 0.28, K=5 → 0.31, K=7 → 0.27. K=5 wins on silhouette + interpretability | ☐ |

---

## Results Summary

| Section | # Questions | ✅ Pass | ❌ Fail |
|---------|------------|--------|--------|
| Investor / Blackstone Analyst | 7 | ☐ | ☐ |
| ELI5 / Actionability | 4 | ☐ | ☐ |
| Input Validation UX | 3 | ☐ | ☐ |
| Technical Deep-Dive | 6 | ☐ | ☐ |
| **Total** | **20** | **☐** | **☐** |

**Run date:** _______________  
**Tester:** _________________  
**Status:** ☐ ALL 20 GREEN / ☐ NEEDS REVIEW

---

*Reference: `api/server.js` — POST `/api/explain` endpoint. The system prompt contains all expected answers embedded in the context window.*