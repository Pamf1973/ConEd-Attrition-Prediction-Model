import "./CaseFileHeader.css";

/**
 * CaseFileHeader — the M4 atom (Spec 2).
 *
 * Contract: system-v1.1.md §Components (Claim ledger, Driver row, Narrative
 * slot, Status segment) + §7 rules 8–9, laws H1–H5 (+ inherited L1–L6).
 * Visual reference: docs/ref/2026-07-16_fable-case-file-header.html.
 *
 * L1 enforced: ledger.queue.percentile is a formatted string ("99th", "est.");
 * unknown tier throws; unknown status throws.
 *
 * Data fetching is out of scope for the atom. The container PR (M4-container)
 * wires props from the building record + /api/model_meta + /api/buildings/:bbl/status.
 */

const TIERS = new Set(["Low", "Medium", "High", "Critical", "Uncertain"]);
const STATUSES = [
  "Unreviewed",
  "In review",
  "Contacted",
  "Confirmed at-risk",
  "False positive",
  "Dismissed",
];
const STATUS_SET = new Set(STATUSES);
const tierWord = {
  Low: "cf-word--low",
  Medium: "cf-word--med",
  High: "cf-word--high",
  Critical: "cf-word--crit",
  Uncertain: "cf-word--uncertain",
};
const tierTick = {
  Low: "cf-tick--low",
  Medium: "cf-tick--med",
  High: "cf-tick--high",
  Critical: "cf-tick--crit",
  Uncertain: "cf-tick--uncertain",
};

export default function CaseFileHeader({
  identity,   // { address, meta: [string], cluster, right: [ReactNode] }
  ledger,     // { queue: {percentile, sub, provenance}, tier: {tier, sub}, coverage: {big, unit?, sub} }
  drivers,    // [{ rank, name, value, direction: 'up'|'down', barPct, contrib }]
  narrative,  // { source, drafted, status, body } | null  (null → designed empty frame)
  status,     // one of STATUSES — read-only in this PR
}) {
  if (!TIERS.has(ledger.tier.tier)) {
    throw new Error(`CaseFileHeader: unknown tier "${ledger.tier.tier}"`);
  }
  if (!STATUS_SET.has(status)) {
    throw new Error(`CaseFileHeader: unknown status "${status}"`);
  }

  return (
    <div className="cf-scope">
      <div className="cf-casefile">
        <div className="cf-id-row">
          <div className="cf-id-left">
            <h3 className="cf-address">{identity.address}</h3>
            <div className="cf-id-meta">
              {identity.meta.flatMap((seg, i) => {
                const nodes = [<span key={`m-${i}`}>{seg}</span>];
                if (i < identity.meta.length - 1) {
                  nodes.push(<span key={`s-${i}`} className="cf-sep">|</span>);
                }
                return nodes;
              })}
              {identity.cluster && (
                <span className="cf-cluster-chip">{identity.cluster}</span>
              )}
            </div>
          </div>
          <div className="cf-id-right">
            {identity.right.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        <div className="cf-ledger">
          <div className="cf-claim-col">
            <div className="cf-claim-label">Queue position · ML ranking</div>
            <div className="cf-claim-main">
              <span className="cf-claim-big">{ledger.queue.percentile}</span>
              <span className="cf-claim-sub">{ledger.queue.sub}</span>
            </div>
            <div className="cf-claim-sub">{ledger.queue.provenance}</div>
          </div>
          <div className="cf-claim-col">
            <div className="cf-claim-label">Tier · ML base + trend/statute modifiers</div>
            <div className="cf-claim-main">
              <span className={`cf-tick-inline ${tierTick[ledger.tier.tier]}`} />
              <span className={`cf-claim-word ${tierWord[ledger.tier.tier]}`}>
                {ledger.tier.tier}
              </span>
            </div>
            <div className="cf-claim-sub">{ledger.tier.sub}</div>
          </div>
          <div className="cf-claim-col">
            <div className="cf-claim-label">Coverage · What we can see</div>
            <div className="cf-claim-main">
              <span className="cf-claim-big">
                {ledger.coverage.big}
                {ledger.coverage.unit && (
                  <span className="cf-claim-unit"> {ledger.coverage.unit}</span>
                )}
              </span>
            </div>
            <div className="cf-claim-sub">{ledger.coverage.sub}</div>
          </div>
        </div>

        <div className="cf-drivers">
          <div className="cf-drivers-title">
            <span>Why this rank · SHAP contributions</span>
            <span>← pushes down  ·  pushes up →</span>
          </div>
          {drivers.map((d) => (
            <div className="cf-driver" key={d.rank}>
              <span className="cf-d-rank">{d.rank}</span>
              <span className="cf-d-name">{d.name}</span>
              <span className="cf-d-val">{d.value}</span>
              <span className="cf-d-bar">
                <span className="cf-d-axis" />
                <span
                  className={`cf-d-fill cf-d-fill--${d.direction}`}
                  style={{ width: `${d.barPct}%` }}
                />
              </span>
              <span
                className={`cf-d-contrib ${d.direction === "up" ? "cf-d-contrib--up" : ""}`}
              >
                {d.contrib}
              </span>
            </div>
          ))}
        </div>

        {narrative ? (
          <div className="cf-narrative">
            <div className="cf-narr-head">
              <span className="cf-narr-label">Narrative · {narrative.status}</span>
              <span className="cf-narr-prov">
                Source: <b>{narrative.source}</b> · drafted {narrative.drafted}
              </span>
            </div>
            <div className="cf-narr-body">{narrative.body}</div>
            <div className="cf-narr-foot">
              <span>Every underlined value links to its source claim above</span>
            </div>
          </div>
        ) : (
          <div className="cf-narrative cf-narrative--empty">
            <div className="cf-narr-head">
              <span className="cf-narr-label">Narrative</span>
              <span className="cf-narr-prov">drafting arrives with the report milestone</span>
            </div>
          </div>
        )}

        <div className="cf-actions">
          <div className="cf-status-seg" role="group" aria-label="Workflow status">
            {STATUSES.map((s) => (
              <span key={s} className={s === status ? "cf-status--active" : ""}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
