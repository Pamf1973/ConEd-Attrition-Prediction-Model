import { riskTier, signalMeta, recommendedAction } from "../data/useBuildings";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// d.value from ml_drivers is the MODEL-SPACE feature value (log or log1p transformed).
// These formatters invert the transform so the displayed number matches the real-world unit.
const fmt$ = (n) => `$${Math.round(n).toLocaleString()}`;
const DRIVER_FORMATS = {
  // math.log(steam_kBtu) → exp → kBtu → ÷1e6 = M kBtu
  log_steam:             v => ({ label: "Steam demand",        formatted: `${(Math.exp(v) / 1e6).toFixed(1)} M kBtu` }),
  // math.log1p(ghg_MT) → expm1 = MT CO₂e
  log_ghg:               v => ({ label: "Total emissions",     formatted: `${Math.round(Math.expm1(v)).toLocaleString()} MT CO₂e` }),
  // math.log1p(dob_count) → expm1 = filing count
  log_dob_jobs:          v => ({ label: "DOB filings",         formatted: String(Math.round(Math.expm1(v))) }),
  // math.log1p(penalty_$) → expm1 = dollars
  ll97_penalty_2024_log: v => ({ label: "LL97 2024 penalty",   formatted: Math.expm1(v) > 0 ? fmt$(Math.expm1(v)) : "Compliant" }),
  ll97_penalty_2030_log: v => ({ label: "LL97 2030 penalty",   formatted: Math.expm1(v) > 0 ? fmt$(Math.expm1(v)) : "Compliant" }),
  // raw (not log-transformed)
  ll97_over_2024:        v => ({ label: "Over 2024 cap",       formatted: v ? "Yes" : "No" }),
  year_built:            v => ({ label: "Year built",          formatted: String(Math.round(v)) }),
  energy_star:           v => ({ label: "Energy Star",         formatted: `${Math.round(v)} / 100` }),
  peer_score:            v => ({ label: "Peer attrition zone", formatted: `${Math.round(v * 100)}%` }),
  use_type_ord:          v => ({ label: "Use-type risk",       formatted: `${v} / 4` }),
  cluster_id:            v => ({ label: "Customer archetype",  formatted: `Cluster ${Math.round(v)}` }),
  steam_ghg_share:       v => ({ label: "Steam GHG share",     formatted: `${Math.round(v * 100)}%` }),
};

function MLDrivers({ drivers }) {
  if (!drivers || drivers.length === 0) return null;
  return (
    <div className="rounded-lg p-3 mt-2" style={{ background: "#1E293B" }}>
      <div className="text-xs text-slate-500 mb-2">WHY THIS SCORE</div>
      <div className="space-y-1.5">
        {drivers.map((d, i) => {
          const up  = d.contribution > 0;
          const fmt = DRIVER_FORMATS[d.feature]?.(d.value) ?? { label: d.feature, formatted: String(d.value) };
          return (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <span style={{ color: up ? "#EF4444" : "#64748B" }} className="font-bold w-3">
                  {up ? "↑" : "↓"}
                </span>
                <span className="text-slate-400">{fmt.label}</span>
              </span>
              <span className="text-slate-300 font-medium tabular-nums">{fmt.formatted}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
        Top 5 model drivers (SHAP) · ↑ pushes risk higher · ↓ pulls it lower
      </p>
    </div>
  );
}

const DIAG_COLORS = {
  High:      { color: "#ef4444", bg: "#450a0a" },
  Medium:    { color: "#f59e0b", bg: "#451a03" },
  Low:       { color: "#22c55e", bg: "#052e16" },
  Uncertain: { color: "#9ca3af", bg: "#1e293b" },
};

function DiagnosticSection({ building }) {
  const { diagnostic_risk, decline_trend_label, decline_acceleration, n_years_data, uncertain_reason, risk } = building;
  if (!diagnostic_risk) return null;

  const dc = DIAG_COLORS[diagnostic_risk] ?? DIAG_COLORS.Uncertain;

  // Derive ML tier label using same thresholds as riskTier()
  const mlLabel = Number.isFinite(risk)
    ? (risk > 0.7 ? "High" : risk > 0.4 ? "Medium" : "Low")
    : null;
  const conflict = mlLabel && mlLabel !== diagnostic_risk && diagnostic_risk !== "Uncertain";

  const accelFmt = decline_acceleration != null
    ? `${decline_acceleration > 0 ? "+" : ""}${decline_acceleration.toFixed(1)}%/yr²`
    : null;

  return (
    <div className="mt-5">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1">
        Diagnostic Tier
      </div>
      <div className="rounded-lg p-3 mt-1" style={{ background: "#1e293b" }}>
        {/* Tier badge + optional conflict indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ color: dc.color, background: dc.bg, border: `1px solid ${dc.color}40` }}
          >
            {diagnostic_risk === "Uncertain" ? "? Uncertain" : diagnostic_risk}
          </span>
          {conflict && (
            <span className="text-[10px] text-slate-500">
              ML: {mlLabel} · Diagnostic: {diagnostic_risk}
            </span>
          )}
        </div>

        {/* Data years */}
        <div className="mt-2 text-xs text-slate-500">
          {n_years_data} yr{n_years_data !== 1 ? "s" : ""} of steam data
          {n_years_data < 3 && " · limited history"}
        </div>

        {/* Decline trend */}
        {decline_trend_label && decline_trend_label !== "stable" && (
          <div
            className="mt-1.5 text-xs font-semibold"
            style={{ color: decline_trend_label === "accelerating" ? "#ef4444" : "#22c55e" }}
          >
            {decline_trend_label === "accelerating" ? "↓ Accelerating decline" : "↑ Decelerating (improving)"}
            {accelFmt && <span className="font-normal text-slate-500 ml-1">({accelFmt})</span>}
          </div>
        )}

        {/* Uncertain reason */}
        {diagnostic_risk === "Uncertain" && uncertain_reason && (
          <div className="mt-1.5 text-[11px] text-slate-500 leading-snug">{uncertain_reason}</div>
        )}

        {/* Conflict explanation */}
        {conflict && (
          <div className="mt-2 text-[10px] text-slate-500 leading-snug border-t border-[#082244] pt-2">
            {mlLabel === "Low" && diagnostic_risk === "High"
              ? "Usage anomalies not captured by ML external signals — watch manually."
              : mlLabel === "High" && diagnostic_risk === "Low"
              ? "External pressure (LL97/permits) without usage anomaly yet — early-warning case."
              : "Conflicting signals — review both ML score and diagnostic modifiers."}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendChart({ building, allBuildings }) {
  const years = [2022, 2023, 2024];
  const steamKeys = { 2022: "steam_2022", 2023: "steam_2023", 2024: "steam_2024" };

  // Peer median: same use type AND cluster
  const peers = (allBuildings ?? []).filter(
    b => b.use === building.use && b.cluster_name === building.cluster_name && b.address !== building.address
  );

  const peerMedian = (year) => {
    const vals = peers.map(b => b[steamKeys[year]]).filter(v => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  };

  // LL97 cap in MT CO₂e → convert to steam kBtu using GHG = steam_kBtu × 4.493e-5
  const ll97CapSteam = (year) => {
    const capKey = year === 2024 || year === 2025 ? "ll97_cap_2024" : "ll97_cap_2030";
    const capMt = building[capKey];
    if (capMt == null) return null;
    return capMt / 4.493e-5;
  };

  const data = years.map(yr => ({
    year: yr,
    building:    building[steamKeys[yr]] ?? null,
    peerMedian:  peerMedian(yr),
    ll97Cap:     ll97CapSteam(yr),
  })).filter(d => d.building != null);

  if (data.length < 2) return null;

  const hasCapData = data.some(d => d.ll97Cap != null);
  const fmt = v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : String(v);

  return (
    <div className="mt-3">
      <div className="text-xs text-slate-500 mb-1">Steam Trend (kBtu) — Peer Benchmark{hasCapData ? " & LL97 Cap" : ""}</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ background: "#001748", border: "1px solid #0F3B7E", borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v, name) => [fmt(v) + " kBtu", name]}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
          <Line type="monotone" dataKey="building" name="This building" stroke="#ffffff" strokeWidth={2} dot={{ r: 3, fill: "#ffffff" }} />
          <Line type="monotone" dataKey="peerMedian" name="Peer median" stroke="#E87722" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          {hasCapData && <Line type="monotone" dataKey="ll97Cap" name="LL97 cap" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const DRIVER_FORMATS = {
  log_steam:             v => ({ label: "Steam demand",        formatted: `${v} M kBtu` }),
  log_ghg:               v => ({ label: "Total emissions",     formatted: `${v?.toLocaleString()} MT CO₂e` }),
  log_dob_jobs:          v => ({ label: "DOB filings",         formatted: String(v) }),
  ll97_penalty_2024_log: v => ({ label: "LL97 2024 penalty",   formatted: v > 0 ? `$${v.toLocaleString()}` : "Compliant" }),
  ll97_penalty_2030_log: v => ({ label: "LL97 2030 penalty",   formatted: v > 0 ? `$${v.toLocaleString()}` : "Compliant" }),
  ll97_over_2024:        v => ({ label: "Over 2024 cap",       formatted: v ? "Yes" : "No" }),
  year_built:            v => ({ label: "Year built",          formatted: String(v) }),
  energy_star:           v => ({ label: "Energy Star",         formatted: `${v} / 100` }),
  peer_score:            v => ({ label: "Peer attrition zone", formatted: `${Math.round(v * 100)}%` }),
  use_type_ord:          v => ({ label: "Use-type risk",       formatted: `${v} / 4` }),
  cluster_id:            v => ({ label: "Customer archetype",  formatted: `Cluster ${v}` }),
  steam_ghg_share:       v => ({ label: "Steam GHG share",     formatted: `${Math.round(v * 100)}%` }),
};

function MLDrivers({ drivers }) {
  if (!drivers || drivers.length === 0) return null;

  return (
    <div className="rounded-lg p-3 mt-2" style={{ background: "#1e293b" }}>
      <div className="text-xs text-slate-500 mb-2">WHY THIS SCORE</div>
      <div className="space-y-1.5">
        {drivers.map((d, i) => {
          const up    = d.contribution > 0;
          const arrow = up ? "↑" : "↓";
          const color = up ? "#ef4444" : "#64748b";
          const fmt   = DRIVER_FORMATS[d.feature]?.(d.value) ?? { label: d.feature, formatted: String(d.value) };
          return (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <span style={{ color }} className="font-bold w-3">{arrow}</span>
                <span className="text-slate-400">{fmt.label}</span>
              </span>
              <span className="text-slate-300 font-medium tabular-nums">{fmt.formatted}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
        Top 5 model drivers (SHAP) · ↑ pushes risk higher · ↓ pulls it lower
      </p>
    </div>
  );
}

function LL97Gauge({ emissions, cap, periodLabel }) {
  if (emissions == null || cap == null || cap <= 0) return null;
  const ratio   = emissions / cap;
  const pct     = Math.round(ratio * 100);
  const fillPct = Math.min(ratio * 50, 100);
  const color   = ratio <= 1 ? "#22c55e" : ratio <= 1.5 ? "#f97316" : "#ef4444";

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between items-baseline text-xs mb-1">
        <span className="text-slate-500">
          {periodLabel} cap · {Math.round(cap).toLocaleString()} MT CO₂e
        </span>
        <span className="font-bold" style={{ color }}>{pct}% of cap</span>
      </div>
      <div className="relative h-2.5 bg-slate-800 rounded overflow-hidden">
        <div className="h-full" style={{ width: `${fillPct}%`, background: color }} />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: "50%", background: "#64748b" }}
          aria-label="LL97 cap line"
        />
      </div>
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
    <div className="flex justify-between items-start gap-4 py-2 border-b border-[#082244]/60">
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

export default function BuildingPanel({ building, onClose, allBuildings }) {
  if (!building) return null;

  const b      = building;
  const tier   = riskTier(b.risk);
  const sig    = signalMeta(b.signal);
  const action = recommendedAction(b.risk, b.signal);

  const euiMedian = EUI_MEDIANS[b.use] ?? EUI_MEDIANS["Office"];
  const euiDelta  = b.eui != null ? Math.round(((b.eui - euiMedian) / euiMedian) * 100) : null;

  // Compute cluster size from allBuildings
  const clusterSize = allBuildings ? allBuildings.filter(x => x.cluster_id === b.cluster_id).length : null;

  return (
    <div className="flex flex-col h-full bg-[#001748] border-l border-[#082244] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#001748] border-b border-[#082244] px-5 pt-5 pb-4">
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

          <MLDrivers drivers={b.ml_drivers} />

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

          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            Phase 1 decision-support ranking · Public signal model · Not a validated production classifier
          </p>
        </Section>

        <DiagnosticSection building={b} />

        {/* Cluster archetype */}
        {b.cluster_name && (
          <Section title="Customer Archetype">
            <div className="rounded-lg p-3 mt-1" style={{ background: "#1e293b" }}>
              <div className="text-sm font-bold text-slate-100">{b.cluster_name}</div>
              <div className="text-xs text-slate-500 mt-1">
                Cluster {b.cluster_id} · K-means unsupervised model (K=5)
              </div>
              {b.cluster_risk != null && (
                <div className="text-xs text-slate-400 mt-1">
                  Risk level: {b.cluster_risk}
                </div>
              )}
              {clusterSize != null && (
                <div className="text-xs text-slate-400 mt-1">
                  {clusterSize.toLocaleString()} buildings in this cluster · {
                    clusterSize >= 300 ? "largest cluster by population" :
                    clusterSize >= 200 ? "major cluster segment" :
                    clusterSize >= 100 ? "mid-size cluster" :
                    "smallest cluster"
                  }
                </div>
              )}
            </div>
          </Section>
        )}

        {/* LL97 Compliance */}
        {(b.ll97_penalty_2024 != null || b.ll97_penalty_2030 != null) && (
          <Section title="LL97 Carbon Compliance">
            <div className="rounded-lg p-3 mt-1 space-y-2" style={{ background: "#1e293b" }}>
              {b.ghg != null && (b.ll97_cap_2024 != null || b.ll97_cap_2030 != null) && (
                <div className="pb-2 border-b border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">
                    Emissions vs Cap · {Math.round(b.ghg).toLocaleString()} MT CO₂e current
                  </div>
                  <LL97Gauge emissions={b.ghg} cap={b.ll97_cap_2024} periodLabel="2024" />
                  <LL97Gauge emissions={b.ghg} cap={b.ll97_cap_2030} periodLabel="2030" />
                </div>
              )}
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
          </Section>
        )}

        {/* Energy & demand */}
        <Section title="Energy & Demand">
          <Row label="SC Class"      value={b.sc_class || null} />
          <Row label="Steam Demand"  value={b.steam != null ? `${(b.steam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} M kBtu` : null} />
          <TrendChart building={b} allBuildings={allBuildings} />
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