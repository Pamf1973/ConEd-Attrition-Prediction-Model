import "./MethodologyPage.css";

/**
 * M10 Methodology page — Report register, printable, editorial.
 *
 * Nine-section structure per system-v1.1.md §Components (Methodology page)
 * + ROADMAP R11 + docs/ref/2026-07-16_methodology-alignment.md §3.
 *
 * Two clocks per §Components:
 *   - Sections 2/5/7 revise per model version
 *   - Sections 4/9 regenerate per pipeline run
 *   - Section 8 backfills when the research track runs
 *   - Each section carries its own stamp
 *
 * FIRST DRAFT. Prose to be reviewed and rewritten by Edwin. Sections that
 * require live values from model_meta (2, 4, 9) are stubbed with the
 * explicit "regenerates from ..." labels the spec permits.
 */
export default function MethodologyPage() {
  return (
    <div className="mp-scope mp-page">
      <article className="mp-inner">

        <header className="mp-header">
          <div className="mp-meta">
            <span>ConEd Steam Attrition</span>
            <span>Methodology</span>
            <span>v1.1 · UNVAL</span>
          </div>
          <h1 className="mp-title">
            What this tool does, and how to read it.
          </h1>
          <p className="mp-lede">
            A ranking of the ConEd steam portfolio by modeled attrition risk,
            layered with a transparent diagnostic tier and a set of named
            modifiers. Everything a reader needs to interpret a claim in the
            product should be resolvable here.
          </p>
        </header>

        {/* ── 1. What the tool claims and doesn't ───────────────────── */}
        <section className="mp-section" id="s1">
          <div className="mp-section-eyebrow">01 · Claims and non-claims</div>
          <h2>What this tool claims, and what it doesn't.</h2>

          <p><strong>Claims.</strong></p>
          <ul>
            <li>
              A per-building ranking (<code>ml_risk</code>) that orders the
              portfolio by pattern-similarity to buildings that have declined
              at least 50% in weather-normalized steam demand across the
              LL84 CY2022 or CY2023 vintages.
            </li>
            <li>
              A diagnostic tier (<code>diagnostic_risk</code>) applied per
              row: High, Medium, Low, or Uncertain, derived from the ML
              ranking layered with named, checkable modifiers (§03).
            </li>
            <li>
              A statute-arithmetic penalty (LL97 2024 and 2030) computed
              directly from the building's floor area and use type. This
              is not a model output.
            </li>
          </ul>

          <p><strong>Non-claims.</strong></p>
          <ul>
            <li>
              This is not a calibrated probability. The score does not read
              as "an X% chance of leaving the steam system." It reads as
              "position in a ranking, layered with a defensible tier."
            </li>
            <li>
              This is not validated against ConEd disconnect records.
              Cross-validation is a self-consistency check on the training
              universe; it does not clear the "unvalidated" status. That
              status flips only when back-testing against ConEd's own
              records is complete.
            </li>
            <li>
              This is not causal. A high-ranked building is not asserted to
              be leaving because of any particular feature. Feature
              contributions (§02) describe the model's reasoning, not the
              building's.
            </li>
          </ul>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>This revision:</strong> XGB v1 · UNVAL</span>
          </div>
        </section>

        {/* ── 2. Signal taxonomy ────────────────────────────────────── */}
        <section className="mp-section" id="s2">
          <div className="mp-section-eyebrow">02 · Signal taxonomy</div>
          <h2>The twelve features the model reads, and how much each one matters.</h2>

          <p>
            Feature importances are read from <code>model_meta.json</code>
            at pipeline-run time. The table renders the ranked list with
            plain-language definitions and units.
          </p>

          <div className="mp-placeholder">
            <span className="mp-placeholder-label">Regenerates per model version</span>
            Feature-importance table sourced from <code>model_meta.feature_importances</code>
            once the M2 rerun writes them. Anchor prose (per-feature definitions,
            unit rendering rules) authored inline here; the ordering and magnitudes
            come from the file.
          </div>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>This revision:</strong> pending M2 rerun</span>
          </div>
        </section>

        {/* ── 3. The tier chain ─────────────────────────────────────── */}
        <section className="mp-section" id="s3">
          <div className="mp-section-eyebrow">03 · The tier chain</div>
          <h2>How the diagnostic tier is assigned.</h2>

          <p>
            The tier is a hybrid: an ML base rank layered with named,
            checkable modifiers. Assignment order, per
            <code>compute_diagnostic_risk</code>:
          </p>

          <ol>
            <li>
              <strong>Uncertain gates take priority.</strong> A row is set
              Uncertain if it has fewer than two years of steam data, or is
              a NYCHA development whose weather regression R² is below 0.3,
              or is missing a model score entirely.
            </li>
            <li>
              <strong>Base tier from the model score.</strong> Below 0.2 is
              base Low; 0.2 to 0.6 is base Medium; 0.6 and above is base High.
            </li>
            <li>
              <strong>Modifiers, each shifting the tier by one level.</strong>
              An IQR outlier in either normalized delta period shifts up by
              one. An accelerating decline shifts up by one. A decelerating
              decline shifts down by one. An LL97 over-cap flag, for either
              2024 or 2030, shifts up by one.
            </li>
            <li>
              <strong>Clamp to the range [Low, High].</strong>
            </li>
          </ol>

          <p>
            <strong>The system is model-seeded and modifier-driven.</strong>{" "}
            70% of non-Uncertain rows are modifier-shifted. 78% of final
            High rows are modifier-promoted, with 176 of those promoted
            from base Low. The tier column label reflects this everywhere
            it appears: "Tier · ML base + trend/statute modifiers."
          </p>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>Reference:</strong> system-v1.1.md §4.1</span>
          </div>
        </section>

        {/* ── 4. Modifier prevalence and co-occurrence ──────────────── */}
        <section className="mp-section" id="s4">
          <div className="mp-section-eyebrow">04 · Modifier prevalence</div>
          <h2>Which modifiers fire, how often, and where they overlap.</h2>

          <p>
            Modifier counts and co-occurrence pairs regenerate at each
            pipeline run. LL97 pressure is rendered as penalty-magnitude
            bands (dollar ranges from the penalty log), never as an
            over-cap boolean count.
          </p>

          <div className="mp-placeholder">
            <span className="mp-placeholder-label">Regenerates per pipeline run</span>
            Modifier-prevalence table, co-occurrence pairs, and LL97
            penalty-magnitude bands. Sourced from the current pipeline
            snapshot; timestamp anchors from <code>model_meta.run_date</code>.
          </div>

          <div className="mp-stamp">
            <span><strong>Regenerates with:</strong> pipeline run</span>
            <span><strong>This snapshot:</strong> pending live wire-up</span>
          </div>
        </section>

        {/* ── 5. The Critical definition ────────────────────────────── */}
        <section className="mp-section" id="s5">
          <div className="mp-section-eyebrow">05 · Critical</div>
          <h2>What "Critical" means in this product.</h2>

          <p>
            Critical is not a fifth tier. It is a composite queue state,
            defined as a conjunction of three facts:
          </p>

          <ol>
            <li>
              The model score is 0.6 or above (the model's confident set,
              n=57 buildings).
            </li>
            <li>
              A fresh 2024 normalized delta is present (the row has
              LL84 CY2024 data, weather-normalized).
            </li>
            <li>
              At least one trend modifier applies (an IQR outlier in either
              delta period, or an accelerating decline).
            </li>
          </ol>

          <p>
            As of the 2026-07-01 pipeline run, twenty-three buildings meet
            all three conditions. The top of that queue is 660 Madison
            Avenue, 200 East 42nd Street, and 58 West 58th Street.
          </p>

          <p>
            <strong>LL97 over-cap is deliberately excluded from the modifier
            leg.</strong> The over-cap boolean carries a feature-importance
            of 0.0000 inside the model; the log-scaled penalty is the model's
            highest-importance feature at 0.2074. Statute pressure is
            already encoded richly on the model side. Adding the boolean to
            the Critical conjunction would double-count, not add evidence.
          </p>

          <p>
            <strong>The defensible sentence.</strong> "The model places this
            building with past churners, its actual usage trend independently
            corroborates, and the signal is from this year." Lose any of the
            three legs and the row demotes out of Critical. Entering or
            leaving Critical is a nameable event.
          </p>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>Reference:</strong> system-v1.1.md §4.1</span>
          </div>
        </section>

        {/* ── 6. Reading the score ──────────────────────────────────── */}
        <section className="mp-section" id="s6">
          <div className="mp-section-eyebrow">06 · Reading the score</div>
          <h2>Compression, ties, freshness, uncertainty.</h2>

          <p>
            <strong>The score is a ranking, not a probability.</strong> It
            renders as a portfolio percentile ("96th"), never with a
            percent sign. The percent sign is reserved for measured
            quantities, like a weather-normalized year-over-year change.
          </p>

          <p>
            <strong>The distribution is bimodal.</strong> Fifty-two
            buildings sit inside a saturated quasi-tie block at raw score
            0.99 or above. Within that block, ordering is noise; the
            case-file surface renders "among the top 52 by model score"
            rather than "#4 of 1,210." The queue still shows the percentile
            per row; the fine-grained rank does not.
          </p>

          <p>
            <strong>Freshness is always rendered.</strong> Stale is the
            designed majority state, not an error. Four freshness states
            are named, always by the vintage of the newest normalized
            delta: fresh Δ '24 (422 rows), Δ '23 only (321 rows), no
            adjacent-year Δ (~208 rows), and Uncertain (254 rows, handled
            by the tier).
          </p>

          <p>
            <strong>Uncertain is a designed state.</strong> When the tier
            reads Uncertain, the transparent method is honestly abstaining:
            not enough history, or a NYCHA regression with too little
            explanatory power. The percentile still orders the queue, but
            the tier word says the rule cannot speak. Anything asserted
            about an Uncertain row comes from the model alone at v1
            confidence.
          </p>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>Reference:</strong> system-v1.1.md §8, §4.5</span>
          </div>
        </section>

        {/* ── 7. Known limitations ──────────────────────────────────── */}
        <section className="mp-section" id="s7">
          <div className="mp-section-eyebrow">07 · Known limitations</div>
          <h2>Four things this build cannot do today.</h2>

          <ol>
            <li>
              <strong>No back-testing against ConEd disconnect records.</strong>
              Cross-validation on the training universe is a self-consistency
              check, not a validation. Until back-testing against ConEd's
              actual disconnect history is complete, the provenance chip
              reads UNVAL and the tier is defended by the modifier chain,
              not the model score alone.
            </li>
            <li>
              <strong>No per-customer usage regression.</strong> The tool
              currently uses a citywide HDD multiplier for weather
              normalization, not a per-building regression fit. Buildings
              with unusually strong cooling loads, occupancy-driven
              patterns, or non-thermal steam demand are normalized less
              accurately than they should be. A per-building regression
              module is scoped for a future phase.
            </li>
            <li>
              <strong>No billing-cycle adjustments.</strong> LL84 data is
              annual and calendar-aligned. Buildings whose billing cycles
              or fiscal years shift mid-period may show delta artifacts
              that are not real demand changes. This affects a minority of
              the portfolio but is not currently modeled.
            </li>
            <li>
              <strong>No live data refresh.</strong> The dataset is baked
              into the deployment container at build time. Freshness anchors
              read from <code>model_meta.run_date</code>, which is written
              per pipeline run, so the copy is honest about vintage; but a
              data update requires a redeploy.
            </li>
          </ol>

          <div className="mp-stamp">
            <span><strong>Revises with:</strong> model version</span>
            <span><strong>Reference:</strong> tech-spec §7</span>
          </div>
        </section>

        {/* ── 8. The ConEd framework and ours ───────────────────────── */}
        <section className="mp-section" id="s8">
          <div className="mp-section-eyebrow">08 · Complementary signals</div>
          <h2>How this tool sits alongside ConEd's own methodology.</h2>

          <p>
            ConEd's field team, per the Johan specification, works from
            five diagnostic signals: per-customer weather-normalized usage
            regression, heating and cooling adjustments, a diagnostic
            metrics suite, calibrated High/Medium/Low/Uncertain thresholds,
            and a review overlay for judgment. That is diagnostic work: a
            transparent per-account audit.
          </p>

          <p>
            This tool is a pattern-matcher across the public LL84 portfolio.
            It sees what ConEd's team cannot see across accounts at once
            (portfolio-scale ranking, cohort effects, LL97 pressure) and
            does not see what a per-account audit sees (billing anomalies,
            equipment condition, customer contact history). The two are
            complementary, not competing.
          </p>

          <p>
            The five Johan signals, mapped to what this tool contributes
            and where the gaps remain:
          </p>

          <div className="mp-placeholder">
            <span className="mp-placeholder-label">Research pending</span>
            Per-signal complementary-mapping table. Backfills when the
            per-building regression research track lands. Until then, this
            section states the mapping intent and leaves each row explicit
            about where our current build has coverage, partial coverage,
            or no coverage.
          </div>

          <div className="mp-stamp">
            <span><strong>Backfills with:</strong> research track</span>
            <span><strong>Reference:</strong> docs/ref/2026-07-16_methodology-alignment.md</span>
          </div>
        </section>

        {/* ── 9. Version and provenance ─────────────────────────────── */}
        <section className="mp-section" id="s9">
          <div className="mp-section-eyebrow">09 · Version and provenance</div>
          <h2>What ran, when, on what.</h2>

          <div className="mp-placeholder">
            <span className="mp-placeholder-label">Regenerates per pipeline run</span>
            Renders <code>model_meta.model_version</code>,{" "}
            <code>model_meta.run_date</code>, <code>params_hash</code>,{" "}
            <code>commit</code>, <code>validation_status</code>, the
            label definition, and the CV summary line per §7 rule 8.
            Requires the /api/model_meta endpoint from PR #11.
          </div>

          <div className="mp-stamp">
            <span><strong>Regenerates with:</strong> pipeline run</span>
            <span><strong>This snapshot:</strong> pending live wire-up</span>
          </div>
        </section>

      </article>
    </div>
  );
}
