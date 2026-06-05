import { riskTier, signalMeta, recommendedAction, isUncertain } from "../data/useBuildings";

function SteamTrend({ building }) {
  const pts = [
    { yr: "2022", v: building.steam_2022 },
    { yr: "2023", v: building.steam_2023 },
    { yr: "2024", v: building.steam_2024 },
  ].filter(p => p.v != null);

  if (pts.length < 2) return null;

  const first = pts[0].v;
  const last  = pts[pts.length - 1].v;
  const pct   = first ? Math.round(((last - first) / first) * 100) : 0;
  const color = pct <= -20 ? "#ef4444" : pct <= -5 ? "#f97316" : pct >= 5 ? "#22c55e" : "#94a3b8";
  const maxV  = Math.max(...pts.map(p => p.v));

  const label = pct <= -20 ? "Sharp drop — possible disconnect underway"
              : pct <= -5  ? "Moderate decline in steam demand"
              : pct >= 5   ? "Demand increasing"
              :               "Stable demand";

  return (
    <div className="rounded-lg p-3 mt-1 mb-2" style={{ background: "#1e293b" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">STEAM USAGE — YEAR OVER YEAR</span>
        <span className="text-sm font-bold" style={{ color }}>
          {pct > 0 ? "+" : ""}{pct}%
        </span>
      </div>
      <div className="space-y-1.5">
        {pts.map(p => (
          <div key={p.yr} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-10">{p.yr}</span>
            <div className="flex-1 h-3 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${maxV ? (p.v / maxV) * 100 : 0}%`,
                  background: p.yr === String(pts[pts.length - 1].yr) ? color : "#475569",
                }}
              />
            </div>
            <span className="text-xs text-slate-300 w-16 text-right">
              {(p.v / 1e6).toFixed(1)}M
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600 mt-2">{label}</p>
    </div>
  );
}

const EUI_MEDIANS = {
  Office:                              27.5,
  "Multifamily Housing":               46.4,
  Hotel:                               40.0,
  "K-12 School":                       32.0,
  "College/University":                35.0,
  "Hospital (General Medical & Surgical)": 60.0,
};

function Row({ label, value, color, note }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-800/60">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-right" style={{ color: color ?? "#e2e8f0" }}>
        {value}
        {note && <span className="block text-xs font-normal text-slate-500">{note}</span>}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1">{title}</div>
      {children}
    </div>
  );
}

export default function BuildingPanel({ building, onClose }) {
  if (!building) return null;

  const b      = building;
  const tier   = riskTier(b.risk);
  const sig    = signalMeta(b.signal);
  const action = recommendedAction(b.risk, b.signal);

  const euiMedian = EUI_MEDIANS[b.use] ?? EUI_MEDIANS["Office"];
  const euiDelta  = b.eui != null ? Math.round(((b.eui - euiMedian) / euiMedian) * 100) : null;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-100 leading-snug">{b.address}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{b.use ?? "Unknown type"} · Built {b.yr ?? "—"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none mt-0.5 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Action badge */}
        <div className="mt-3">
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ color: action.color, background: action.bg, border: `1px solid ${action.color}40` }}
          >
            {action.label}
          </span>
        </div>
      </div>

      <div className="px-5 pb-8 flex-1">
        {/* Attrition risk score */}
        <Section title="Attrition Risk">
          <div className="flex items-end gap-3 py-3">
            <span className="text-5xl font-black" style={{ color: tier.color }}>
              {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
            </span>
            <div className="mb-1.5">
              <span
                className="text-sm font-bold px-2 py-0.5 rounded"
                style={{ color: tier.color, background: tier.bg }}
              >
                {tier.label} Risk
              </span>
            </div>
          </div>

          {/* Signal breakdown */}
          {b.signal && (
            <div className="rounded-lg p-3 mt-1" style={{ background: "#1e293b" }}>
              <div className="text-xs text-slate-500 mb-2">TOP SIGNAL</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: sig.color }}>{sig.label}</span>
                {b.hdd_pct != null && (
                  <span className="text-sm font-semibold text-slate-300">
                    {b.hdd_pct > 0 ? "+" : ""}{b.hdd_pct}% YoY (HDD-normalized)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Peer + portfolio signals */}
          {(Number.isFinite(b.peer_score) && b.peer_score > 0) && (
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-slate-500">Peer Attrition Zone</span>
              <span className="font-semibold" style={{ color: b.peer_score >= 0.6 ? "#f87171" : b.peer_score >= 0.3 ? "#fb923c" : "#94a3b8" }}>
                {Math.round(b.peer_score * 100)}% cluster density
              </span>
            </div>
          )}
          {(Number.isFinite(b.portfolio_score) && b.portfolio_score > 0) && (
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-slate-500">Owner Portfolio</span>
              <span className="font-semibold" style={{ color: b.portfolio_score >= 0.75 ? "#f87171" : b.portfolio_score >= 0.4 ? "#fb923c" : "#facc15" }}>
                {Math.round(b.portfolio_score * 100)}% already converted
              </span>
            </div>
          )}

          {isUncertain(b) ? (
            <div className="mt-3 px-3 py-2 rounded-lg text-xs leading-relaxed" style={{ background: "#1e1a2e", color: "#a78bfa", border: "1px solid #4c1d95" }}>
              Uncertain — score uses legacy heuristic (building excluded from ML training due to missing features). ConEd classifies similar cases as "Uncertain" pending better data.
            </div>
          ) : (
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Phase 1 decision-support ranking · Public signal model · Not a validated production classifier
            </p>
          )}
        </Section>

        {/* Cluster archetype */}
        {b.cluster_name && (
          <Section title="Customer Archetype">
            <div className="rounded-lg p-3 mt-1" style={{ background: "#1e293b" }}>
              <div className="text-sm font-bold text-slate-100">{b.cluster_name}</div>
              <div className="text-xs text-slate-500 mt-1">
                Cluster {b.cluster_id} · K-means unsupervised model (K=5)
              </div>
            </div>
          </Section>
        )}

        {/* LL97 Compliance */}
        {(b.ll97_penalty_2024 != null || b.ll97_penalty_2030 != null) && (
          <Section title="LL97 Carbon Compliance">
            <div className="rounded-lg p-3 mt-1 space-y-2" style={{ background: "#1e293b" }}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">2024–2029 Annual Penalty</span>
                <span className="text-sm font-bold"
                  style={{ color: b.ll97_penalty_2024 > 100_000 ? "#ef4444" : b.ll97_penalty_2024 > 0 ? "#f97316" : "#22c55e" }}>
                  {b.ll97_penalty_2024 > 0
                    ? `$${b.ll97_penalty_2024.toLocaleString()}`
                    : "✓ Compliant"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">2030–2034 Annual Penalty</span>
                <span className="text-sm font-bold"
                  style={{ color: b.ll97_penalty_2030 > 100_000 ? "#ef4444" : b.ll97_penalty_2030 > 0 ? "#f97316" : "#22c55e" }}>
                  {b.ll97_penalty_2030 > 0
                    ? `$${b.ll97_penalty_2030.toLocaleString()}`
                    : "✓ Compliant"}
                </span>
              </div>
              {b.ll97_penalty_2024 > 0 && (
                <p className="text-xs text-slate-600 pt-1">
                  Based on {b.floor_sqft?.toLocaleString()} ft² · $268/MT CO₂e over limit · LL97 of 2019
                </p>
              )}
            </div>
            {b.ml_risk != null && (
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-slate-500">ML Attrition Score</span>
                <span className="font-semibold"
                  style={{ color: b.ml_risk > 0.7 ? "#ef4444" : b.ml_risk > 0.4 ? "#f97316" : "#94a3b8" }}>
                  {Math.round(b.ml_risk * 100)}%
                </span>
              </div>
            )}
          </Section>
        )}

        {/* Energy & demand */}
        <Section title="Energy & Demand">
          <Row label="Steam Demand"  value={b.steam != null ? `${(b.steam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} M kBtu` : null} />
          <SteamTrend building={b} />
          <Row
            label="Steam EUI"
            value={b.eui != null ? `${b.eui} kBtu/ft²` : null}
            color={euiDelta != null ? (euiDelta > 20 ? "#f97316" : euiDelta < -20 ? "#22c55e" : "#94a3b8") : null}
            note={euiDelta != null ? `${euiDelta > 0 ? "+" : ""}${euiDelta}% vs type median (${euiMedian})` : null}
          />
          <Row label="Energy Star"   value={b.energy_star != null ? `${b.energy_star} / 100` : null}
               color={b.energy_star != null ? (b.energy_star >= 75 ? "#22c55e" : b.energy_star >= 50 ? "#eab308" : "#ef4444") : null} />
          <Row label="LL33 Grade"    value={b.ll33 || null}
               color={b.ll33 === "A" || b.ll33 === "B" ? "#22c55e" : b.ll33 === "C" ? "#eab308" : "#ef4444"} />
          <Row label="Boiler Fuel"   value={b.boiler_fuel || null} />
        </Section>

        {/* DOB activity */}
        <Section title="DOB Activity">
          <Row
            label="HVAC / Boiler Jobs"
            value={b.dob_jobs ? `${b.dob_jobs} filing${b.dob_jobs > 1 ? "s" : ""}` : null}
            color={b.dob_jobs >= 3 ? "#f87171" : b.dob_jobs >= 1 ? "#fb923c" : null}
          />
          {(!b.dob_jobs) && (
            <p className="text-sm text-slate-600 py-2">No recent HVAC filings on record</p>
          )}
        </Section>

        {/* Ownership */}
        <Section title="Ownership">
          <Row
            label="Last Sale"
            value={b.deed_date ? b.deed_date.slice(0, 10) : null}
            color="#a78bfa"
          />
          <Row
            label="Sale Price"
            value={b.deed_amt != null ? `$${b.deed_amt}M` : null}
            color="#a78bfa"
          />
          {(!b.deed_date) && (
            <p className="text-sm text-slate-600 py-2">No recent deed transfer on record</p>
          )}
        </Section>

        {/* Building info */}
        <Section title="Building Info">
          <Row label="Use Type"     value={b.use || null} />
          <Row label="Year Built"   value={b.yr  || null} />
          <Row label="Gas Demand"   value={b.gas  != null ? `${b.gas?.toLocaleString()} k therms` : null} />
          <Row label="GHG Emissions" value={b.ghg != null ? `${b.ghg?.toLocaleString()} MT CO₂e` : null} />
        </Section>
      </div>
    </div>
  );
}
