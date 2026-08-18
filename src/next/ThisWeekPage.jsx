import { useEffect, useMemo, useState } from "react";
import { useBuildings } from "../data/useBuildings.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./ThisWeekPage.css";

/**
 * M9 — This Week landing (Fable Spec 4).
 *
 * Composes the three bands the analyst expects on Monday: a delta feed of
 * named events (W2), a critical-work queue with arithmetic in public (W4),
 * and one portfolio pulse (W3). Time anchors come from model_meta.run_date
 * (W1). WoW parentheticals stay out until the second diffed run exists.
 *
 * Real: topbar anchors, portfolio pulse tier counts from useBuildings.
 * Placeholder: delta feed (waits on M7 events.json), queue (waits on
 * M8 CriticalQueue component from Ismael's lane).
 */
export default function ThisWeekPage() {
  return (
    <ErrorBoundary
      label="ThisWeekPage"
      fallback={
        <div className="tw-error">
          This Week failed to render. Check console for stack.
        </div>
      }
    >
      <ThisWeekPageInner />
    </ErrorBoundary>
  );
}

function ThisWeekPageInner() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );
  const [modelMeta, setModelMeta] = useState(null);
  const [modelMetaErr, setModelMetaErr] = useState(null);

  useEffect(() => {
    const onStorage = () => setToken(sessionStorage.getItem("coned_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { buildings, loading, error } = useBuildings(token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch((e) => { if (!cancelled) setModelMetaErr(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  const pulse = useMemo(() => computePulse(buildings), [buildings]);
  const runAnchor = formatRunDate(modelMeta?.run_date);
  const modelVersion = modelMeta?.model_version || "XGB v1 · UNVAL";

  return (
    <div className="tw-page">
      <header className="tw-header">
        <div className="tw-meta">
          <span>ConEd Steam Attrition · M9</span>
          <span>This Week landing · in situ</span>
          <span>Preview build</span>
        </div>
        <h1>This Week</h1>
        <p className="tw-lede">
          The Monday landing per Fable Spec 4. Three bands in the order the
          analyst thinks: a delta feed of named events, a queue with its
          arithmetic shown, and one portfolio pulse. Delta feed and queue
          render placeholders until the M7 <code>events.json</code> pipeline
          and M8 <code>CriticalQueue</code> component ship.
        </p>
      </header>

      {!token && (
        <div className="tw-empty">
          Sign in at <a href="/legacy">/legacy</a> first — this route reads
          that session. Standalone auth arrives with the M9 topbar work.
        </div>
      )}

      {token && loading && <div className="tw-empty">Loading buildings…</div>}

      {token && error && (
        <div className="tw-empty tw-empty--error">
          {error === "UNAUTHORIZED"
            ? <>Session expired. <a href="/legacy">Log in again.</a></>
            : `Failed to load: ${error}`}
        </div>
      )}

      {token && !loading && !error && (
        <div className="tw-bench">
          <div className="tw-landing">
            {/* TOP BAR */}
            <div className="tw-topbar">
              <div className="tw-topbar-left">
                <h3>This Week</h3>
                <div className="tw-anchor">
                  Pipeline run <b>{runAnchor}</b>
                  {" · "}
                  <span title="Per-analyst review anchor lands with M6 status events">
                    last-review anchor pending
                  </span>
                </div>
              </div>
              <div className="tw-topbar-right">
                <div className="tw-cmd">
                  <span>Ask or filter…</span>
                  <kbd>⌘K</kbd>
                </div>
                <button className="tw-btn" disabled>Portfolio</button>
                <button className="tw-btn tw-btn--primary" disabled>
                  Compose weekly digest
                </button>
              </div>
            </div>

            {/* BAND 1: DELTA FEED */}
            <div className="tw-band-label">
              <span>Since your last review</span>
              <span className="tw-count">
                {buildings.length.toLocaleString()} buildings scanned
              </span>
            </div>
            <div className="tw-empty-band">
              <div className="tw-empty-e1">
                Delta feed pending M7 events pipeline.
              </div>
              <div className="tw-empty-e2">
                A quiet week is a real result. Copy per Fable:
                &ldquo;Nothing crossed a threshold since your last review.&rdquo;
                Names events land once <code>events.json</code> is diffed
                run-over-run.
              </div>
            </div>

            {/* BAND 2: QUEUE */}
            <div className="tw-band-label">
              <span>Your queue this week</span>
              <span className="tw-count">
                {pulse.critical} Critical · {pulse.high} High
              </span>
            </div>
            <div className="tw-empty-band">
              <div className="tw-empty-e1">
                Critical queue pending M8 (Ismael).
              </div>
              <div className="tw-empty-e2">
                Arithmetic-in-public shape per W4:
                {" "}<code>N Critical − contacted − dismissed = to review</code>.
                Rows are Spec 1 score cells; filter chips route through
                <code> /api/query</code> canned FilterSpecs.
              </div>
            </div>

            {/* BAND 3: PULSE (real) */}
            <div className="tw-band-label">
              <span>Portfolio pulse</span>
              <span className="tw-count">the only summary on this page</span>
            </div>
            <div className="tw-pulse">
              <div className="tw-pulse-bar" role="img" aria-label="Portfolio tier distribution">
                {pulse.total > 0 ? (
                  <>
                    <i className="tw-seg tw-seg--high"  style={{ width: pct(pulse.high, pulse.total) }} />
                    <i className="tw-seg tw-seg--med"   style={{ width: pct(pulse.medium, pulse.total) }} />
                    <i className="tw-seg tw-seg--low"   style={{ width: pct(pulse.low, pulse.total) }} />
                    <i className="tw-seg tw-seg--unc"   style={{ width: pct(pulse.uncertain, pulse.total) }} />
                  </>
                ) : (
                  <i className="tw-seg tw-seg--empty" style={{ width: "100%" }} />
                )}
              </div>
              <div className="tw-pulse-stats">
                High <b>{pulse.high}</b> · Med <b>{pulse.medium}</b> ·
                {" "}Low <b>{pulse.low}</b> · Uncertain <b>{pulse.uncertain}</b>
                <br />
                Critical <b>{pulse.critical}</b> · portfolio <b>{pulse.total}</b>
                {" "}buildings
              </div>
              <div className="tw-pulse-vint">
                Pipeline {runAnchor}
                <br />
                {modelVersion}
              </div>
            </div>

            <p className="tw-note">
              Week-over-week parentheticals ship with the second diffed
              pipeline run (M7). Until then the pulse states position, not
              motion — per M9 acceptance criteria.
            </p>
          </div>

          {modelMetaErr && (
            <div className="tw-warn">
              model_meta fetch failed: {modelMetaErr} — anchor uses fallback copy.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function computePulse(buildings) {
  const out = { total: buildings.length, high: 0, medium: 0, low: 0, uncertain: 0, critical: 0 };
  for (const b of buildings) {
    const t = b.diagnostic_risk;
    if (t === "High") out.high++;
    else if (t === "Medium") out.medium++;
    else if (t === "Low") out.low++;
    else out.uncertain++;
    if ((b.ml_risk ?? 0) >= 0.9 && t === "High") out.critical++;
  }
  return out;
}

function pct(n, total) {
  if (!total) return "0%";
  return `${(100 * n / total).toFixed(1)}%`;
}

function formatRunDate(iso) {
  if (!iso) return "date pending";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date pending";
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hh}:${mm} UTC`;
}
