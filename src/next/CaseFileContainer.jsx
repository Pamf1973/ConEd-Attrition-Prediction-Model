import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import CaseFileHeader from "./CaseFileHeader.jsx";
import StatusWriter from "./StatusWriter.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { buildCaseFileProps, computePercentileMap, normalizeBbl } from "./caseFileAdapter.jsx";
import "./CaseFileContainer.css";

/**
 * M4 container harness — /case-file/:bbl.
 *
 * Renders CaseFileHeader (from the atom PR) against real building data,
 * live /api/model_meta, and current /api/buildings/:bbl/status.
 *
 * Same session-token pattern as the M3 rankings container. Auth UI lives
 * in /legacy until M9 lands the workflow-native login surface.
 */
export default function CaseFileContainer() {
  const { bbl: urlBbl } = useParams();
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );
  const [modelMeta, setModelMeta] = useState(null);
  const [modelMetaErr, setModelMetaErr] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [statusErr, setStatusErr] = useState(null);

  // sessionStorage is per-tab — storage event only fires for localStorage (cross-tab).
  // Token is read correctly on mount; re-login navigates to /legacy which sets it there.

  const { buildings, loading, error } = useBuildings(token);

  // Fetch /api/model_meta once per token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch((e) => { if (!cancelled) setModelMetaErr(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  // Find building by matching normalized BBL against the URL BBL
  const building = useMemo(() => {
    if (!urlBbl || buildings.length === 0) return null;
    return buildings.find((b) => normalizeBbl(b.bbl) === urlBbl) ?? null;
  }, [buildings, urlBbl]);

  // Fetch current status for this BBL (falls back to Unreviewed on 404/error)
  useEffect(() => {
    if (!token || !urlBbl) return;
    let cancelled = false;
    setCurrentStatus(null);
    setStatusErr(null);
    fetch(`/api/buildings/${urlBbl}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setCurrentStatus(data.current ?? null); })
      .catch((e) => { if (!cancelled) setStatusErr(e.message); });
    return () => { cancelled = true; };
  }, [token, urlBbl]);

  const pctMap = useMemo(
    () => (buildings.length > 0 ? computePercentileMap(buildings) : null),
    [buildings]
  );

  const props = useMemo(() => {
    if (!building || !pctMap) return null;
    return buildCaseFileProps({ building, modelMeta, currentStatus, pctMap });
  }, [building, pctMap, modelMeta, currentStatus]);

  return (
    <div className="cfc-page">
      <header className="cfc-header">
        <div className="cfc-meta">
          <span>ConEd Steam Attrition · M4</span>
          <span>Case-file container · in situ</span>
          <span>Preview build</span>
        </div>
        <h1>Case file</h1>
        <p className="cfc-lede">
          Live wiring of the Spec 2 atom against building data,{" "}
          <code>/api/model_meta</code> (provenance + AUC line per §7 rule 8),
          and <code>/api/buildings/:bbl/status</code>. Narrative slot ships
          as the designed empty frame; drafting arrives with the report
          milestone (M5).
        </p>
      </header>

      {!token && (
        <div className="cfc-empty">
          Sign in at <a href="/legacy">/legacy</a> first — this route
          reads that session. Standalone auth arrives with M9.
        </div>
      )}

      {token && loading && <div className="cfc-empty">Loading buildings…</div>}

      {token && error && (
        <div className="cfc-empty cfc-empty--error">
          {error === "UNAUTHORIZED"
            ? <>Session expired. <a href="/legacy">Log in again.</a></>
            : `Failed to load: ${error}`}
        </div>
      )}

      {token && !loading && !error && !building && (
        <div className="cfc-empty">
          No building found for BBL <code>{urlBbl}</code>. Try one of these:
          {buildings.slice(0, 5).map((b) => {
            const bbl = normalizeBbl(b.bbl);
            return bbl ? (
              <div key={b.address} className="cfc-example">
                <a href={`/case-file/${bbl}`}>{b.address} · {bbl}</a>
              </div>
            ) : null;
          })}
        </div>
      )}

      {token && props && (
        <>
          {modelMetaErr && (
            <div className="cfc-warn">
              model_meta fetch failed: {modelMetaErr} — provenance line shows fallback copy.
            </div>
          )}
          {statusErr && (
            <div className="cfc-warn">
              status fetch failed: {statusErr} — defaulting to Unreviewed.
            </div>
          )}
          <ErrorBoundary
            label={`CaseFileHeader:${urlBbl}`}
            fallback={
              <div className="cfc-warn">
                Case file failed to render for BBL {urlBbl} — record is malformed. Check console for details.
              </div>
            }
          >
            <CaseFileHeader {...props} />
          </ErrorBoundary>
          <StatusWriter
            bbl={urlBbl}
            currentStatus={currentStatus}
            token={token}
            onSaved={(newStatus) => setCurrentStatus(newStatus)}
          />
        </>
      )}
    </div>
  );
}
