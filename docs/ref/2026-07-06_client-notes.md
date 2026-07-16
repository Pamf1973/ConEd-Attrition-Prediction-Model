# ConEd Steam Attrition Dashboard — Client Notes

**Purpose:** Anchor the design in what the client actually said. Every quote here is theirs; everything else is context we added.

**Discipline:** Client words are blockquotes with speaker and date. Non-quote text is our context — kept brief, clearly separate. When in doubt about whether a phrase came from them or from us, cut it or move it to a project doc.

**Local-only:** This is `local-only`. Do not commit to the team repo — David and ConEd have not agreed to have their words version-controlled where their broader team can see.

**Populated:** 2026-07-06 by Edwin, from `PROJECT_CONTEXT_2026-06-22.md`, `docs/notes/2026-06-03_working-notes.md`, and `CONED_METHODOLOGY_ALIGNMENT.md`. Some dates are approximate — flagged where uncertain.

---

## 1. Client identification & cadence

| | |
|---|---|
| **Client organization** | Con Edison — Steam Operations |
| **Primary contact** | David Caiafa — VP / PM for Steam Operations |
| **Other stakeholders** | Ildi (high-level framing owner); Johan (methodology owner); Sho Ohata (previously handled data-sharing arrangement for a Bidgely engagement — potential template for NDA/data access) |
| **Contact cadence** | Irregular. Scoping calls in early June 2026 (two on 2026-06-03), in-person review scheduled for week of 2026-06-09, methodology deep-dive offered by David but not yet scheduled |
| **Next scheduled touchpoint** | Blackstone final presentation 2026-06-24; post-demo cadence TBD |
| **Relationship status** | Pursuit capstone engagement. NDA between Pursuit and ConEd is **not yet established** — David flagged this. Data access to ConEd internal billing records is gated on that NDA. |

---

## 2. Original brief (as delivered)

Source: ConEd intake form for the Pursuit data-fellowship capstone. Referenced in `PROJECT_CONTEXT_2026-06-22.md` §5.

> "Steam Customer Drop-Off Predictor — trained ML model + risk dashboard + significant predictive flags + documentation. Benchmark: identify ≥70% of major drops in back-testing." — ConEd intake form, early 2026 (exact date not captured)

Context: this is the official assignment language. The tool's positioning as a "drop-off predictor" — not a "client-targeting tool" or "opportunity dashboard" — traces to this brief. When our internal framing drifted to alternatives in mid-June (see `DEMO_TODAY_TACTICAL.md`), David pushed us back to this original language.

---

## 3. Follow-up conversations (chronological)

Newest at bottom.

### Ildi — high-level framing message (date not captured; referenced in `CONED_METHODOLOGY_ALIGNMENT.md` §1a)

Format: written message. Attendees: Ildi (ConEd) → Pursuit team.

> "Specifically looking at year-over-year changes in customer consumption, normalized for temperature. The team has data for approximately 1,200 customers below 96th Street in NYC, with four years of yearly consumption data. [She] recommended identifying statistical outliers in consumption changes and relating these to temperature normalization, as significant deviations could indicate meaningful patterns or events." — Ildi, ConEd, date not captured

Context added:
- Ildi's framing sets a lower methodological bar than Johan's — statistical outlier identification on temperature-normalized YoY, rather than per-customer HDD/CDD regression
- Our current build is aligned with Ildi's framing (IQR outlier detection + citywide HDD multiplier) but not with Johan's
- We have 3 years of yearly data, not 4 — worth noting to Ildi when we sync

### Johan — detailed methodology spec (date not captured; referenced in `CONED_METHODOLOGY_ALIGNMENT.md` §1b)

Format: written message. Attendees: Johan (ConEd) → Pursuit team.

> "We use each customer's historical billed usage and apply back-testing to develop an identification framework. Because weather is the primary driver of month-to-month usage variation, we first remove weather effects by calculating weather-normalized usage at the customer level. We do this by fitting a linear regression where the dependent variable is usage per billing day and the independent variables are actual heating degree days per billing day and actual cooling degree days per billing day. The regression yields an HDD slope, a CDD slope, and an intercept.
>
> We then translate deviations from normal degree days into usage … heating adjustment is based on (NHDD − AHDD) times the HDD slope, and cooling adjustment similarly … Finally, weather-normalized usage is computed as actual usage plus the heating and cooling adjustments.
>
> With weather-normalized usage in hand, we evaluate a set of diagnostic metrics (including rolling-window metrics), such as year-over-year percent variance in weather-normalized usage, current weather-normalized usage versus full-usage status, model fit (R²), HDD slope stability, synchronized changes between the HDD slope and intercept, and the decline trend (accelerating versus decelerating). Using these metrics and empirically calibrated thresholds, we label customers as high, medium, low, or uncertain risk before they actually stop using." — Johan, ConEd, date not captured

Alongside the methodology, Johan stated the goal:

> "The focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier." — Johan, ConEd, date not captured

Context added:
- This is Johan giving us the recipe. It's the most detailed methodology guidance we've received from ConEd.
- Johan's "focus" framing is important: it appears in section 6 (anti-goals) below — he explicitly does NOT want us to clone their internal system.

### David Caiafa — PM-level guidance (ongoing through the engagement)

Format: multiple conversations. Attendees: David (ConEd PM) ↔ Pursuit team.

Recurring themes David has emphasized:

> "Lead with K-means archetypes as the lens. Steam is wholesale, not retail." — David Caiafa, mid-June 2026 (paraphrased from PROJECT_CONTEXT_2026-06-22.md §5 — verbatim quote not captured; treat with caution)

> "Pre-war co-op vs. midtown tower — think about the archetypes." — David Caiafa, mid-June 2026 (paraphrased; verbatim not captured)

Context added:
- David has been the "reset" voice pulling us back to the drop-off-predictor framing when internal team framing drifts
- His archetype-first framing shaped our K-means → classifier → SHAP stack ordering in the current build
- The "steam is wholesale, not retail" line means: ConEd doesn't send marketing to steam customers; account managers own strategic relationships and the tool needs to fit that model, not a consumer analytics model

### David Caiafa — workflow-scoping calls (2026-06-03)

Format: two calls back-to-back. Attendees: David + Pursuit team (Edwin present).

This is the strongest and most actionable client input we have on how the product should work. From `docs/notes/2026-06-03_working-notes.md`:

> "Documentation is extremely important. Being able to generate a report that clearly states how we came to the conclusion that a building is in danger of dropping off, this would need to be detailed and show the reasoning the model used to arrive at this conclusion. They also mentioned that having an agent that can email them to let them act on the information would be a useful function to have as well because then they could internally reach out to the client and gather more data on what is actually going on." — David Caiafa, ConEd, 2026-06-03 (paraphrased summary from our notes — attributed to David but not a verbatim quote; treat as a faithful representation, not the exact wording)

Context added:
- This is where the "per-building reasoning report" and "emailed digest" productization asks come from
- The reasoning should be **detailed enough** for a ConEd account manager to defend an outreach decision internally — this is why a PDF/HTML artifact matters
- The email agent is the mechanism to push signal to account managers so they can then internally reach out to the customer to gather more context

### David Caiafa — email on NDA / data access (approximately 2026-06-03, referenced in NOTES.md)

Format: email. Attendees: David → Pursuit team.

David flagged three things (paraphrased summary — verbatim not captured):
- He doesn't think there is currently an NDA between Pursuit and ConEd
- Sho Ohata previously helped structure a data-sharing arrangement for a Bidgely engagement — using anonymized account numbers and building info
- Suggested the Pursuit team ask Sho about that process as a potential template

Context added:
- This is the pathway for Phase 2 (August build with real billing data) — everything blocked behind ConEd customer data depends on resolving this NDA
- The "anonymized account numbers and building info" precedent is important: it's a proven pattern for how ConEd can share billing-adjacent data with an outside team

---

## 4. Current workflow (what they use today)

We have partial information about ConEd's internal state. Where quotes exist, they're cited. Where we're inferring, it's flagged.

**Internal systems (inferred from context — not directly stated by client):**
- **Bidgely** — customer usage analytics platform. Ildi/Johan's per-customer regression appears to run either in Bidgely or on data pulled from it.
- **SAP** — customer records, billing infrastructure.
- The internal early-warning system produces High / Medium / Low / **Uncertain** risk labels for customers via Johan's methodology (per-customer HDD/CDD regression + rule-based diagnostic thresholds).

**Account manager structure (inferred + partially stated):**
- Strategic / major customers have a named ConEd **key account manager** whose job is the executive-level relationship (asset manager, sustainability director, VP of facilities)
- Smaller / non-strategic customers are pooled into general business-customer support — often only property-manager or billing-level contact info
- The building owner is usually NOT the day-to-day steam contact (that's the property manager / building engineer / billing clerk) — the owner-level decision-maker (asset manager, sustainability director) is a separate contact who ConEd's account team may or may not have a relationship with

**Their own words about the current state:**

> "the focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier" — Johan, ConEd, date not captured

Implication: they already have an approach (Johan's regression + rule-based tiers), but they want something **complementary** that identifies customers **earlier** — i.e., before the internal billing signal would fire.

**Friction points (inferred from asks):**
- No easy artifact for justifying outreach internally — hence the "detailed reasoning report" ask
- No push-notification path to account managers — hence the "email agent" ask
- Public-data signals (LL97 pressure, DOB permits, ownership transfers) may show up before internal billing signals — this is the specific gap our tool is being asked to fill

---

## 5. Stated success criteria (their words)

**Quantitative bar (from intake form):**

> "Benchmark: identify ≥70% of major drops in back-testing." — ConEd intake form, early 2026

**Qualitative bars:**

> "Documentation is extremely important. Being able to generate a report that clearly states how we came to the conclusion that a building is in danger of dropping off, this would need to be detailed and show the reasoning the model used to arrive at this conclusion." — David Caiafa, 2026-06-03 (paraphrased)

> "having an agent that can email them to let them act on the information would be a useful function to have as well because then they could internally reach out to the client and gather more data on what is actually going on." — David Caiafa, 2026-06-03 (paraphrased)

> "the focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier" — Johan, ConEd, date not captured

Synthesized (our reading of theirs — flagged as our synthesis):
- **Detects earlier** than their internal billing-based system does
- **Explains itself** enough that an account manager can defend an outreach decision internally
- **Reaches account managers** through push (email), not just a dashboard they have to check
- **Repeatable pattern-based approach** — not a one-off analysis

---

## 6. Anti-goals (what they've explicitly said they DON'T want)

The most important anti-goal is stated by Johan and reinforced across our internal notes:

> "ConEd has been explicit that they want us to do our own thing and see what we come up with — they are not asking us to clone their internal early-warning system." — synthesized from Johan's messaging in `CONED_METHODOLOGY_ALIGNMENT.md` §0 (this is our team's paraphrase; the verbatim quote closest to it is Johan's "the focus is to develop a repeatable pattern-based approach that can be applied to current customers to identify potential lost business earlier")

Context: this rules out multiple design candidates —
- **Don't build a UI that mirrors Bidgely.** The value is complementarity, not replication.
- **Don't lean the entire methodology story on per-customer HDD/CDD regression** (which we can't do without their billing data anyway) — instead, demonstrate that the core of their approach (careful weather normalization) is present in ours.
- **Don't oversell our per-customer story.** We use citywide HDD; ConEd knows this. Honesty about the divergence is required.

**Implied anti-goals from David's framing** (paraphrased, not verbatim — treat as directional):
- Don't lead with the classifier as if it were a validated production system. Its AUC is weak (0.645) and David has consistently emphasized honest framing.
- Don't frame this as a "sales opportunity" or "client targeting" tool. Steam is wholesale, not retail; that language undersells the operational-monitoring nature of the ask.

---

## 7. Open questions for them

- [ ] **NDA / data-sharing pathway.** Can Pursuit route through Sho Ohata as ConEd did for Bidgely? What does the anonymization process look like? *(Ask David; timing: before Phase 2 August build.)*
- [ ] **Methodology deep-dive with David.** He offered to walk through prior prediction attempts and what worked vs. didn't. Not yet scheduled. *(Ask David; timing: before we invest the ~5–6 days on Johan's framework, per `CONED_METHODOLOGY_ALIGNMENT.md` §6.)*
- [ ] **LL97 penalty framing.** Is the way we compute LL97 penalty (LL84 self-reported GHG × $268/ton over cap) consistent with how ConEd thinks about LL97 pressure on customers? *(Ask David; timing: before demo day.)*
- [ ] **Account manager → territory mapping.** For the email-agent productization ask, who owns which buildings? Do we have that map, or does ConEd? *(Ask David; timing: before scoping the email agent.)*
- [ ] **Email cadence and format preferences.** Weekly? Daily for high-priority? What format do account managers actually read (Outlook plain-text, HTML, PDF attachment)? *(Ask David; timing: before designing the email digest.)*
- [ ] **Territory-level access control.** Should PDF reports be gated by account manager territory, or is the whole dataset visible to everyone at ConEd who has access? *(Ask David; timing: before shipping reports.)*
- [ ] **Which methodology label to lead with in the UI.** ML classifier tier, diagnostic rule-based tier, or both side-by-side? *(Ask David + Johan; timing: before finalizing the redesign.)*

---

*Living document. Update after every ConEd interaction. If the last section-3 entry is more than 4 weeks old, refresh before making major design decisions.*
