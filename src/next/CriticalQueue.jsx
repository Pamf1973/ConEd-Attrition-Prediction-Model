import { useMemo, useState } from "react";
import ScoreCell from "./ScoreCell.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { computePercentileMap, toScoreCellProps, normalizeBbl } from "./caseFileAdapter.jsx";
import "./CriticalQueue.css";

// ── Critical v1.1 filter (Q3 sign-off) ───────────────────────────────────────

function isCritical(b) {
  return (
    typeof b.ml_risk === "number" && b.ml_risk >= 0.6 &&
    b.norm_delta_23_24 != null &&
    (b.outlier_23_24 || b.outlier_22_23 || b.decline_trend_label === "accelerating")
  );
}

function isOutlierDelta(b) {
  return !!(b.outlier_23_24 || b.outlier_22_23);
}

function isAccelerating(b) {
  return b.decline_trend_label === "accelerating";
}

// Modifier-promoted: ML base Low/Medium but rule tier High (the §4.1 DIVERGE population)
function isModifierPromoted(b) {
  return b.diagnostic_risk === "High" && typeof b.ml_risk === "number" && b.ml_risk < 0.6;
}

const CHIPS = [
  { key: "critical",          label: "Critical",          filter: isCritical },
  { key: "outlier",           label: "Outlier Δ",         filter: isOutlierDelta },
  { key: "accelerating",      label: "Accelerating",      filter: isAccelerating },
  { key: "modifier-promoted", label: "Modifier-promoted", filter: isModifierPromoted },
];

function formatMkBtu(steam) {
  if (!Number.isFinite(steam)) return "—";
  return (steam / 1_000_000).toFixed(1);
}

function formatMoney(n) {
  if (!Number.isFinite(n) || n === 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * M8: Queue + modifier filter chips + Critical membership.
 *
 * Receives the full merged buildings array from useBuildings.
 * Gracefully omits the M6 subtraction arithmetic when not available —
 * shows membership and chips only, and says so plainly.
 */
export default function CriticalQueue({ buildings, hasM6 = false }) {
  const [activeChip, setActiveChip] = useState("critical");

  const pctByKey = useMemo(() => computePercentileMap(buildings), [buildings]);

  const counts = useMemo(() =>
    Object.fromEntries(CHIPS.map((c) => [c.key, buildings.filter(c.filter).length])),
    [buildings]
  );

  const rows = useMemo(() => {
    const chip = CHIPS.find((c) => c.key === activeChip);
    const filtered = chip ? buildings.filter(chip.filter) : buildings;
    return filtered
      .slice()
      .sort((a, z) => (z.ml_risk ?? -1) - (a.ml_risk ?? -1));
  }, [buildings, activeChip]);

  const criticalCount = counts["critical"];
  const queueLabel = activeChip === "critical"
    ? `${criticalCount} Critical`
    : `${rows.length} ${CHIPS.find((c) => c.key === activeChip)?.label ?? ""}`;

  return (
    <div className="cq-scope cq-root">
      <div className="cq-header">
        <div className="cq-title-row">
          <h2 className="cq-title">Queue</h2>
          <span className="cq-count">{queueLabel}</span>
        </div>

        <div className="cq-chips" role="group" aria-label="Filter queue">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              className={`cq-chip${activeChip === chip.key ? " cq-chip--active" : ""}`}
              onClick={() => setActiveChip(chip.key)}
              aria-pressed={activeChip === chip.key}
            >
              {chip.label}
              <span className="cq-chip-count">{counts[chip.key]}</span>
            </button>
          ))}
        </div>

        {!hasM6 && (
          <p className="cq-m6-note">
            Subtraction arithmetic and carry-over ages ship with M6.
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="cq-empty">No buildings match this filter.</div>
      ) : (
        <div className="cq-bench">
          <table className="cq-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Score</th>
                <th>Trend</th>
                <th className="num">Steam (M kBtu)</th>
                <th className="num">LL97 '24</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const bbl  = normalizeBbl(b.bbl);
                const cell = toScoreCellProps(b, pctByKey);
                return (
                  <tr key={bbl ?? b.address} className={isCritical(b) ? "cq-row--critical" : ""}>
                    <td className="cq-addr">
                      {bbl
                        ? <a href={`/case-file/${bbl}`} className="cq-addr-link">{b.address}</a>
                        : b.address}
                    </td>
                    <td>
                      <ErrorBoundary label={`CriticalQueue:ScoreCell:${b.address}`} fallback={<span className="cq-err">—</span>}>
                        <ScoreCell {...cell} />
                      </ErrorBoundary>
                    </td>
                    <td className="cq-trend" data-trend={b.decline_trend_label ?? ""}>
                      {b.decline_trend_label ?? "—"}
                    </td>
                    <td className="num">{formatMkBtu(b.steam)}</td>
                    <td className="num">{formatMoney(b.ll97_penalty_2024)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
