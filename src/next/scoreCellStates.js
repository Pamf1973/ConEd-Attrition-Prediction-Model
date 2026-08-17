/**
 * Score cell state fixtures — one per §03 State Matrix entry in
 * docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html.
 *
 * Provenance-chip labels use the v1.1 XGB vocabulary (§4.4), not the
 * Round 0 GBM strings the anatomy HTML shows. When PR #11 merges,
 * the label sources from /api/model_meta.model_version.
 */

const XGB_UNVAL = { label: "XGB v1 · UNVAL" };
const XGB_BT = { label: "XGB v2 · BT 74%", verified: true };
const LEGACY = { label: "Legacy heuristic", stale: true };

export const SCORE_CELL_STATES = [
  {
    id: "S1",
    name: "Concordant, fresh",
    population: "Subset of the 422 buildings with a '24 delta",
    claim:
      "Top of the ranking, and the transparent weather-normalized rule independently flags it. Freshest signal we have.",
    props: {
      percentile: "99th",
      tier: "Critical",
      provenance: XGB_UNVAL,
      freshness: { label: "Δ '24 −41%" },
    },
  },
  {
    id: "S2",
    name: "Divergent",
    population: "n=176 (two-tier promotions, base Low → final High)",
    claim:
      "The model sees something the billing trend doesn't yet. Worth a look, not yet worth a call. Check the SHAP drivers before deciding.",
    props: {
      percentile: "97th",
      tier: "Low",
      diverged: true,
      provenance: XGB_UNVAL,
      freshness: { label: "Δ '24 −6%" },
    },
  },
  {
    id: "S3",
    name: "Stale signal",
    population: "~321 rows · latest is '23 vintage · designed majority state",
    claim:
      "Ranked high on fundamentals, but our newest trend read is a year old. Treat the trend as unknown, not as stable.",
    props: {
      percentile: "92nd",
      tier: "Medium",
      provenance: XGB_UNVAL,
      freshness: { label: "Δ '23 only", stale: true },
    },
  },
  {
    id: "S4",
    name: "Uncertain",
    population: "254 buildings · n_years_data < 2 or missing ml_risk",
    claim:
      "We don't have enough history for the transparent method. Anything we say here comes from the model alone, at v1 confidence.",
    props: {
      percentile: "88th",
      tier: "Uncertain",
      provenance: XGB_UNVAL,
      freshness: { label: "1 yr data", stale: true },
    },
  },
  {
    id: "S5",
    name: "Legacy fallback",
    population:
      "Rows where has_ml_risk is falsy · unreachable against current data (ml_risk 100% coverage)",
    claim:
      "Screening heuristic only. Do not cite this tier in an outreach memo.",
    props: {
      percentile: "est.",
      tier: "Medium",
      provenance: LEGACY,
      freshness: null,
    },
  },
  {
    id: "S6",
    name: "Verified (Phase 2, designed now)",
    population: "Future state · requires ConEd disconnect records behind the NDA",
    claim:
      "This model catches 74% of major drops in back-testing on ConEd's own records.",
    props: {
      percentile: "99th",
      tier: "High",
      provenance: XGB_BT,
      freshness: { label: "Δ '25 −28%" },
    },
  },
];
