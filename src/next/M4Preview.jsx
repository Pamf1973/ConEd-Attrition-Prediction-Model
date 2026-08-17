import CaseFileHeader from "./CaseFileHeader.jsx";
import { CASE_FILE_STATES } from "./caseFileStates.jsx";
import "./M4Preview.css";

/**
 * M4 preview — renders the four Case-file header fixtures stacked on
 * the workbench canvas for design review. Unlinked from any nav;
 * reachable only at /m4-preview during M4 development.
 *
 * Not for production. Retires once CaseFileHeader lands in the
 * container PR (/case-file/:bbl) wired to real data.
 */
export default function M4Preview() {
  return (
    <div className="m4-preview">
      <header className="m4-header">
        <div className="m4-meta">
          <span>ConEd Steam Attrition · M4</span>
          <span>Case-file header atom · ledger variants</span>
          <span>Preview only · unlinked route</span>
        </div>
        <h1>The header, at four of its states</h1>
        <p className="m4-lede">
          The atom, rendered from fixtures against{" "}
          <code>system-v1.1.md §Components</code> (Claim ledger, Driver row,
          Narrative slot, Status segment) + laws H1–H5. AUC line templated per
          §7 rule 8 with real <code>data/model_meta.json</code> values (cv_auc
          0.6833, 5-fold CV, 54 positive labels). The container PR wires this
          same atom to <code>/api/model_meta</code> and{" "}
          <code>/api/buildings/:bbl/status</code>.
        </p>
      </header>

      <div className="m4-stack">
        {CASE_FILE_STATES.map((s) => (
          <section key={s.id} className="m4-state">
            <div className="m4-state-meta">
              <div className="m4-state-id">
                {s.id} · {s.name}
              </div>
              <p className="m4-state-scenario">{s.scenario}</p>
            </div>
            <CaseFileHeader {...s.props} />
          </section>
        ))}
      </div>
    </div>
  );
}
