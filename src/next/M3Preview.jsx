import ScoreCell from "./ScoreCell.jsx";
import { SCORE_CELL_STATES } from "./scoreCellStates.js";
import "./M3Preview.css";

/**
 * M3 preview — renders the six Score cell states side-by-side on the
 * workbench canvas for design review. Unlinked from any nav; reachable
 * only at /m3-preview during M3 development.
 *
 * Not for production. Retire once ScoreCell lands in the Rankings container.
 */
export default function M3Preview() {
  return (
    <div className="sc-scope m3-preview">
      <header className="m3-header">
        <div className="m3-meta">
          <span>ConEd Steam Attrition · M3</span>
          <span>Score cell atom · state matrix</span>
          <span>Preview only · unlinked route</span>
        </div>
        <h1>Six states the data actually produces</h1>
        <p className="m3-lede">
          The atom, rendered from fixtures against{" "}
          <code>system-v1.1.md §Components</code> + Fable Spec 1. When PR #11
          lands, the provenance chip label sources from{" "}
          <code>/api/model_meta.model_version</code>; percentile and tier bind
          to the live Rankings container in a follow-up PR.
        </p>
      </header>

      <div className="m3-grid">
        {SCORE_CELL_STATES.map((s) => (
          <section key={s.id} className="m3-state">
            <div className="m3-bench">
              <ScoreCell {...s.props} />
            </div>
            <div className="m3-state-meta">
              <div className="m3-state-id">
                {s.id} · {s.name}
              </div>
              <div className="m3-state-pop">{s.population}</div>
              <p className="m3-state-claim">
                <strong>Defensible claim:</strong> {s.claim}
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
