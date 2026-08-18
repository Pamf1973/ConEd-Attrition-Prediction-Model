import { useState, useEffect, useMemo } from "react";
import { useBuildings } from "../data/useBuildings.js";
import { useEvents } from "../data/useEvents.js";
import CriticalQueue from "./CriticalQueue.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./ThisWeekPage.css";

// ── Critical membership filter (mirrors CriticalQueue) ────────────────────

function isCritical(b) {
  return (
    typeof b.ml_risk === "number" && b.ml_risk >= 0.6 &&
    b.norm_delta_23_24 != null &&
    (b.outlier_23_24 || b.outlier_22_23 || b.decline_trend_label === "accelerating")
  );
}

// ── Portfolio pulse aggregation ───────────────────────────────────────────

function computePulse(buildings) {
  let critical = 0, high = 0, medium = 0, low = 0, uncertain = 0;
  for (const b of buildings) {
    const dr = b.diagnostic_risk;
    if (isCritical(b))       critical++;
    else if (dr === "High")   high++;
    else if (dr === "Medium") medium++;
    else if (dr === "Low")    low++;
    else                      uncertain++;
  }
  return { critical, high, medium, low, uncertain, total: buildings.length };
}

// ── Date formatting ───────────────────────────────────────────────────────

function fmtRunDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    timeZone: "UTC",
  });
}

// ── Event kind display ────────────────────────────────────────────────────

const KIND_META = {
  TIER_UP:   { label: "Tier ↑", cls: "tw-kind--up"   },
  TIER_DOWN: { label: "Tier ↓", cls: "tw-kind--down" },
  PERMIT:    { label: "Permit", cls: ""               },
  DATA:      { label: "Data",   cls: ""               },
  DIVERGE:   { label: "Diverge",cls: ""               },
  STATUS:    { label: "Status", cls: ""               },
  MODEL:     { label: "Model",  cls: "tw-kind--model" },
};

function EventRow({ event }) {
  const meta = KIND_META[event.kind] ?? { label: event.kind, cls: "" };
  return (
    <div className="tw-event">
      <span className={`tw-kind ${meta.cls}`}>{meta.label}</span>
      <span className="tw-body">
        <strong>{event.subject}</strong>
        {" — "}
        {event.verb}
        {event.evidence && (
          <span className="tw-evidence"> · {event.evidence}</span>
        )}
      </span>
      {event.consequence && (
        <span className="tw-action">{event.consequence}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function ThisWeekPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );

  useEffect(() => {
    const onStorage = () => setToken(sessionStorage.getItem("coned_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { buildings, loading: bldgLoading, error: bldgError } = useBuildings(token);
  const { events: eventsData, loading: evtLoading }            = useEvents(token);

  const pulse = useMemo(() => computePulse(buildings), [buildings]);

  const runDate     = eventsData?.run_date     ?? null;
  const firstRun    = eventsData?.first_run    ?? true;
  const feedEvents  = useMemo(() => {
    if (!eventsData?.events) return [];
    // Filter out the plain DATA "quiet" event from the visible feed
    // if it has no affected count — DATA+quiet is informational only.
    return eventsData.events.filter(
      (e) => !(e.kind === "DATA" && e.consequence === null)
    );
  }, [eventsData]);

  return (
    <div className="sc-scope tw-page">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <header className="tw-topbar">
        <div className="tw-topbar-inner">
          <div className="tw-topbar-left">
            <span className="tw-eyebrow">ConEd Steam Attrition · M9</span>
            <h1 className="tw-page-title">This Week</h1>
          </div>
          <div className="tw-anchors">
            <div className="tw-anchor">
              <span className="tw-anchor-label">Pipeline run</span>
              <span className="tw-anchor-val">{fmtRunDate(runDate)}</span>
            </div>
          </div>
        </div>
      </header>

      {!token && (
        <div className="tw-gate">
          Sign in at <a href="/legacy">/legacy</a> first.
        </div>
      )}

      {token && (
        <div className="tw-body-inner">
          {/* ── Delta feed ─────────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Since last run</span>
              {!evtLoading && eventsData && (
                <span className="tw-section-count">
                  {feedEvents.length} event{feedEvents.length !== 1 ? "s" : ""} · {eventsData.events?.find(e => e.kind === "DATA")?.subject ?? "—"} scanned
                </span>
              )}
            </div>

            {evtLoading && <div className="tw-placeholder">Loading events…</div>}

            {!evtLoading && (firstRun || feedEvents.length === 0) && (
              <div className="tw-placeholder">
                Event feed begins with the first diffed pipeline run. Nothing to show yet.
              </div>
            )}

            {!evtLoading && !firstRun && feedEvents.length > 0 && (
              <div className="tw-feed">
                {feedEvents.map((e, i) => (
                  <ErrorBoundary key={i} fallback={null}>
                    <EventRow event={e} />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </section>

          {/* ── Queue (M8) ─────────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Your queue this week</span>
              <span className="tw-section-count">sorted by rank within Critical, then High</span>
            </div>

            {bldgLoading && <div className="tw-placeholder">Loading buildings…</div>}
            {bldgError && (
              <div className="tw-placeholder tw-placeholder--err">
                {bldgError === "UNAUTHORIZED"
                  ? <><a href="/legacy">Log in again</a> — session expired.</>
                  : `Failed to load buildings: ${bldgError}`}
              </div>
            )}
            {!bldgLoading && !bldgError && (
              <ErrorBoundary label="CriticalQueue" fallback={<div className="tw-placeholder tw-placeholder--err">Queue failed to render.</div>}>
                <CriticalQueue buildings={buildings} hasM6={false} />
              </ErrorBoundary>
            )}
          </section>

          {/* ── Portfolio pulse ────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Portfolio pulse</span>
              <span className="tw-section-count">{pulse.total.toLocaleString()} buildings · run {fmtRunDate(runDate)}</span>
            </div>

            {bldgLoading
              ? <div className="tw-placeholder">Loading…</div>
              : (
                <div className="tw-pulse">
                  <PulseTile label="Critical" value={pulse.critical} tier="high" />
                  <PulseTile label="High"     value={pulse.high}     tier="high" />
                  <PulseTile label="Medium"   value={pulse.medium}   tier="med" />
                  <PulseTile label="Low"      value={pulse.low}      tier="low" />
                  <PulseTile label="Uncertain" value={pulse.uncertain} tier="unc" />
                </div>
              )
            }
          </section>
        </div>
      )}
    </div>
  );
}

function PulseTile({ label, value, tier }) {
  return (
    <div className={`tw-pulse-tile tw-pulse-tile--${tier}`}>
      <span className="tw-pulse-val">{value.toLocaleString()}</span>
      <span className="tw-pulse-label">{label}</span>
    </div>
  );
}
