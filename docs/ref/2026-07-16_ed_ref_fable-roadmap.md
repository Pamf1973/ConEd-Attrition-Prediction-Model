# ConEd Steam Attrition · Build Roadmap

**Emitted:** 2026-07-13
**Canonical references:** `system-v1.1.md` (all law and rule citations below), the five spec HTML atoms, `ISMAEL-RESPONSE-2026-07-13.md` (Q-scopes), `CONED_METHODOLOGY_ALIGNMENT.md` (methodology section source).
**Anchor deadline:** September ConEd session. Milestones and dependencies only, no dates.
**Team:** Ismael (pipeline/backend), Pedro (frontend atoms + workbench composition), Edwin (domain composition, report/methodology content, David-facing follow-ups).

Ordering principle: dependency and acceptance-criteria readiness, per the Round 1 verdict as revised by Round 1.1 (report moves ahead of the landing because it depends on nothing stateful; the queue splits out of the landing because Critical membership is computable today).

---

## Milestones

### M1: model_meta rollout + stale-string retirement
- **What ships:** `model_meta.json` written by both pipeline scripts; API serves it; server.js:585 and :867 read from it (chatbot answer fully rewritten, not string-swapped).
- **Depends on:** nothing. First milestone because it is the cross-cutting dependency for chip copy, ledger AUC line, freshness anchors, and both footers.
- **Owner:** Ismael (object + wiring), Edwin (the rewritten chatbot answer copy).
- **Acceptance criteria:** `model_meta.json` contains the twelve §9 fields in snake_case, written by `train_xgboost.py` and `update_enrichment_risk.py` (params-unchanged runs refresh `run_date` only). No hardcoded model-name or AUC string remains in server.js (§7 rule 9: "model version copy sources from `model_meta.model_version`, never hardcoded"). The chatbot answer contains no probability/likelihood claim for ml_risk (L1; ledger #20). AUC fields may be null pending M2; every consumer renders §7 rule 8 interim copy ("validation rerun in progress") when null.
- **Graceful degradation:** none needed; the object ships with null cv_auc/cv_std and real everything else.

### M2: AUC rerun + freshness residual naming
- **What ships:** clean 5-fold CV AUC with std on the locked XGBoost config, written into model_meta; the ~5-row freshness edge state named (ledger #22).
- **Depends on:** M1 (the fields it fills).
- **Owner:** Ismael.
- **Acceptance criteria:** `cv_auc` and `cv_std` populated from `cross_val_score` on the chosen config, not a GridSearchCV best; §7 rule 8 template renders end-to-end ("ranks a true churner above a non-churner about {auc_pct}% of the time ({cv_kfold}-fold CV, {n_positive} positive labels)"). The four freshness states plus the named residual sum to 1,210 (W4 sum discipline); §4.5 chip copy locks.
- **Graceful degradation:** interim copy stands indefinitely; nothing downstream blocks, only the templated sentence waits.

### M3: Score cell into the Rankings table
- **What ships:** Spec 1 atom replacing the current score column; binding migrated from `risk`/`riskTier()` to percentile-of-ml_risk plus `diagnostic_risk`; the "100% High" wall and all percent signs on the model score die here.
- **Depends on:** none for start (Ismael Q-note: buildable now with interim copy); M1 for final chip strings.
- **Owner:** Pedro.
- **Acceptance criteria:** L1 (no percent sign on the score, percentile ordinal), L2 as amended (tick and tier word from `diagnostic_risk`, ML percentile never colors), L4 (chip = `model_meta.model_version` + validation status, never a numeric AUC per §4.4), L5/§4.5 (four freshness chip states render, including "no adjacent-yr Δ"), L3 as amended (divergence marker on two-tier promotions only). S4 renders for the 254 Uncertain rows with `uncertain_reason` copy; S5 present but flagged unreachable. Legacy `risk` renders nowhere as a headline number (§7 rule 7).
- **Graceful degradation:** ships with interim chip copy if M1 slips; freshness chip copy carries "~208" style counts until M2 locks them.

### M4: Case-file header
- **What ships:** Spec 2 replacing the BuildingPanel drawer: identity row, claim ledger, driver band, narrative slot (static frame), read-only status segment.
- **Depends on:** M3 (states and chips), M1 (ledger AUC line).
- **Owner:** Pedro (build), Edwin (ledger and caveat copy strings).
- **Acceptance criteria:** H1 to H4 as specced; ledger middle column labeled "Tier · ML base + trend/statute modifiers" with the §4.1 chain summarized (H2); three fresh-column variants render (§5 claim ledger note); AUC line templated per §7 rule 8 verbatim; quasi-tie rendering per L6 refinement ("among the top 52 by model score" inside the block). Driver band shows real-unit values from `ml_drivers` with the non-causal `peer_score` label; diagnostic fields that exist ship in the coverage column (decline trend label, regression R² where present). Status segment renders read-only (no fake local state) until M6.
- **Graceful degradation:** narrative slot ships as a designed empty frame ("drafting arrives with the report milestone"); status segment stays read-only.

### M5: Reasoning report
- **What ships:** Spec 3 as a printable page and PDF: finding band, grounded-template narrative with exhibit citations, exhibits A to D, method footer, signature block with DRAFT watermark.
- **Depends on:** M4 (R1: the report is a projection of the header), M1 (footer facts). Forces the ledger #12 decision inside the milestone; recommendation stands: Puppeteer against a print stylesheet of the report page, one layout, two outputs.
- **Owner:** Edwin (content, template, exhibit copy), Pedro (print stylesheet + PDF mechanics). Pair with Edwin as lead.
- **Acceptance criteria:** R1 (every value matches the case file to the digit), R2, R3 (grayscale pass on a b/w print), R4, R5 (Prepared-by + Reviewed fields; DRAFT watermark until review confirmed). Exhibit D describes the §4.1 hybrid chain verbatim and references `ll97_penalty_2024_log` as the model-side encoding, the boolean only as the modifier. Exhibit B renders two lines (building + cap-equivalent), no peer line (ledger #13 open). Narrative is deterministic templating over grounded slots only, no free-form LLM prose; every number cites an exhibit. Method footer links the methodology page with its version stamp and renders §7 rules 8/9 fields.
- **Graceful degradation:** if PDF mechanics slip, the print-stylesheet HTML page is the deliverable (browser print-to-PDF), with the pipeline milestone carried forward.

### M6: Status events endpoint + watchlist migration
- **What ships:** append-only status events in Railway Postgres, POST /api/buildings/:bbl/status + hydration GET behind requireAuth; /api/watchlist/save and /load migrate to the same table; the in-memory Map at server.js:314 retires.
- **Depends on:** nothing technical; runs parallel to M3 to M5. Per Ismael Q7, ~2 days.
- **Owner:** Ismael.
- **Acceptance criteria:** schema per §9 (bbl, status, actor, note, timestamp; current state = latest event); actor = session token with a documented alias path to names; watchlist survives a restart and a redeploy; §4.2 vocabulary enforced server-side (Dismissed requires a reason). Copy nowhere pretends per-analyst identity exists (§9).
- **Graceful degradation:** if it slips, M4's segment stays read-only and M8 ships membership without subtraction; nothing else blocks.

### M7: Snapshot diffing → events.json
- **What ships:** prev-file copy on the volume, end-of-run diff across `diagnostic_risk`, `ll97_over_2024/2030`, `dob_jobs`, emitting events.json in the §4.3 grammar. DIVERGE derives inline (no diff needed).
- **Depends on:** M1 (run stamps on events). Per Ismael Q6, ~1 to 2 days.
- **Owner:** Ismael.
- **Acceptance criteria:** every event carries subject, verb, evidence, consequence fields (W2: "no event without a named trigger"); batch kinds (DATA, DIVERGE) aggregate to one entry with counts; TIER events name which condition changed; events carry the `model_meta.run_date` of the run that produced them (W1).
- **Graceful degradation:** landing (M9) ships without the feed, rendering the designed placeholder ("event feed begins with the first diffed run"), per the M4 explicit-placeholder principle.

### M8: Queue + modifier filter chips + Critical membership
- **What ships:** the Spec 4 queue as a component on the Rankings surface: Critical v1.1 membership computed client- or API-side from existing fields, counted filter chips per §4.6 (Critical · 23, Outlier Δ, Accelerating, Modifier-promoted · 176), queue rows embedding the M3 cell.
- **Depends on:** M3 (cell), M6 for the subtraction and carry-over only.
- **Owner:** Pedro.
- **Acceptance criteria:** Critical membership matches Ismael's Q3 filter exactly (verified against the 23, top of queue 660 Madison, 200 E 42nd, 58 W 58th); chip counts equal the rows the chip opens (§4.6, W3); with M6 present, W4 arithmetic renders in public ("23 Critical − n contacted − n dismissed = n to review") and W5 carry-over age renders per row.
- **Graceful degradation:** without M6, the queue shows membership and chips only, no subtraction line, no carry-over ages, and says so plainly.

### M9: This Week landing assembly
- **What ships:** Spec 4 assembled: topbar anchors, delta feed from events.json, the M8 queue, portfolio pulse, empty state.
- **Depends on:** M7 (feed), M8 (queue), M6 (arithmetic), M1 (run_date anchor).
- **Owner:** Pedro.
- **Acceptance criteria:** W1 (both time anchors from `model_meta.run_date` and the last-review marker; no relative time anywhere), W2 (feed renders the event grammar), W3 as amended (pulse is the only portfolio-scale aggregation), W4, W6 (buttons/chips primary, ⌘K secondary). Pulse ships without WoW parentheticals until a second diffed run exists.
- **Graceful degradation:** feed placeholder per M7 note; queue degradation per M8; the landing is shippable as topbar + queue + pulse and reads honestly in that state.

### M10: Methodology page
- **What ships:** the nine-section page per §5, Report register, linked from landing footer, provenance chips, and report method footer.
- **Depends on:** M1 (section 2 importances and section 9 stamps from model_meta); content-ready otherwise.
- **Owner:** Edwin.
- **Acceptance criteria:** M1 to M5 laws hold (named populations with snapshots, dual stamps for model-version vs run-date facts, no causal verbs, explicit "research pending" placeholders in section 8, definitions live here and surfaces link). Section 3 is the §4.1 chain verbatim; section 5 is the Critical definition with the 23; section 6 carries the §8 rule 1 compression sentence; section 7 carries the four tech-spec limitations; section 8 implements methodology item 5 (complementary signals) per the alignment doc §4. Two clocks stamped per section.
- **Graceful degradation:** section 4's per-run tables regenerate manually per pipeline run until automation exists; stamps make that honest.

### M11: Queue aggregate view (toggle)
- **What ships:** List | Aggregate toggle on the queue: count tiles, modifier co-occurrence pairs, LL97 penalty-magnitude bands over the filtered rowset.
- **Depends on:** M8. Sequenced after the queue is stable in use.
- **Owner:** Pedro.
- **Acceptance criteria:** W3 as amended, verbatim: every figure derives from exactly the visible rows; header states filter expression, row count, run stamp; no portfolio-scale baseline appears inside the view. M1/M3 hold (population = the stated filter; no causal verbs). LL97 renders as penalty bands, never the boolean count (§4.6). Default view is List.
- **Graceful degradation:** it is itself the enhancement; slipping costs nothing upstream.

### M12: Weekly digest + compose flow
- **What ships:** Spec 5: compose from events.json + queue state, editable draft with locked number tokens (or the documented textarea fallback per ledger #14), mailto/clipboard send, plain-text twin.
- **Depends on:** M9 (its inputs), M5 (report links that survive: report IDs live), M1 (footer).
- **Owner:** Edwin (content, templates, finding paragraph), Pedro (compose UI). Pair with Edwin as lead.
- **Acceptance criteria:** D1 to D6 as specced; C1 numbers injected never generated; C3 sends nothing itself; the finding paragraph restates the Critical definition inline (§4.1); footer renders §7 rules 8/9 fields; the plain-text twin ships with every draft.
- **Graceful degradation:** ledger #14 fallback (plain textarea with trust) is acceptable for v1 and documented as such.

---

## Parallel non-build track: the David packet
Owner Edwin, runs alongside M1 to M5. One email/sync covering open ledger items #5 (Critical v1.1 sign-off, with the computed 23), #6 (chip vocabulary legibility), #7 (digest cadence/recipients/format), #8 (cooling-off window), #9 (territory gating), #10 (DRAFT watermark vs hard gate). Blocking relationships: #8 gates the TIER-down suppression copy in M7/M9; #7 gates M12's send framing; #5 gates presenting Critical externally (internally signed by Ismael Q3). None of these block starting any milestone above.

---

## Methodology alignment (required section)

Status correction first: the alignment doc is dated 2026-06-17 and three of its gaps have since closed. Uncertain is no longer empty (254 rows, gated on years and NYCHA R², per `update_enrichment_risk.py`); decline-trend acceleration is computed and stored; NYCHA per-building regressions (β_HDD, β_CDD, R²) are persisted for 24 developments, with NOAA HDD/CDD ingestion shipped. The five items, placed per the prompt's three bins:

**1. Per-customer weather-normalized usage regression.** Explicit Round 2 deferral for the portfolio, on two honest grounds: billing-day resolution needs ConEd billing data (no billing dates exist in public data), and the yearly approximation is 2 to 3 degrees of freedom, which Ismael has scoped as a feasibility read only, not implementation. What ships now: methodology page section 8 documents the citywide-HDD method, its known weakness, the NYCHA 24-development regression as the shipped exemplar of the target method, and what unblocks each resolution level. Unblocked by: Ismael's feasibility read (already on his plate), then the NDA/billing pathway (David packet item, ledger-adjacent).

**2. Diagnostic metrics suite (6 metrics).** Split placement. Build now, inside M4: surface the fields that already exist per building (decline trend label, decline acceleration, regression R² where present) in the case-file coverage column; this costs no pipeline work. Methodology-page content, inside M10: the six-metric table with per-metric status, honestly showing roughly 2 of 6 partially present. Round 2 deferral: full-usage baseline, HDD slope stability, slope-intercept sync, portfolio-wide R², all of which depend on item 1's regression layer.

**3. Uncertain tier aligned with regression fit.** Partially converged already, and the divergence is now a deliberate, explained choice: our Uncertain gates include Johan's fit-based meaning where a fit exists (NYCHA R² < 0.3) and use the years-based gate where no per-building fit can exist on public data. M10 section 8 states exactly this. Round 2 extends the fit-based gate portfolio-wide when item 1 lands.

**4. Rule-based tier assignment with empirical thresholds.** No Johan-style diagnostic tier is built alongside in this roadmap; that is an explicit Round 2 deferral, since it depends on item 2's metrics, and the alignment doc's own ~5-to-6-day estimate was deprioritized in favor of the redesign integration. What ships now is Path C honesty about our hybrid (system-v1.1 §4.1 on every tier surface, Exhibit D in M5). One supersession to state rather than silently reconcile, per the execution plan's instruction: the alignment doc §8(g) recommends a dual-tier disagreement badge; our shipped DIVERGE class is not that (it is intra-hybrid: base vs modifiers within one method). The true two-independent-methods flag becomes possible only when the Johan-style tier exists in Round 2, and M10 section 8 says so explicitly. Also superseded: §3d's "81% probability" display language, killed by L1.

**5. Positioning as complementary signals.** Ships now, as content, in two places: M10 section 8 (the alignment doc's §4 comparison, written as the two-stances/where-they-meet argument, with explicit research-pending placeholders for the pattern-mining material) and M5's method footer framing. This is Johan's "repeatable pattern-based approach" answered at the positioning level pre-demo, with the pattern-mining research track named as the Round 2 engine behind it.

---

## Fallback: two milestones for a next-week David demo

**M1 and M3.** The score cell in the Rankings table is the single highest-visibility truth repair in the redesign: it deletes the wall of "100% High," puts the hybrid tier word and freshness state on every row, and is the surface David sees first when anyone opens the app. model_meta is half a day of Ismael's time and makes M3's chips, anchors, and the retired GBM strings true rather than stubbed, which matters precisely because the demo audience includes the person who has consistently pulled the team back to honest framing. M4 is the more impressive milestone, but it cannot honestly be called done without M1's templated ledger line and it embeds M3 anyway; if the week goes well, it is the natural third. Everything else degrades gracefully by design: the old drawer stays temporarily behind a truthful table, and the demo narrative is "the atom is live, the surfaces that inherit it are next."
