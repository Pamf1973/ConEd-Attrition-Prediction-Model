import { useState, useMemo } from "react";
import { riskTier, signalMeta, isUncertain } from "../data/useBuildings";

const COLS = [
  { key: "address",           label: "Address",        sortable: true  },
  { key: "cluster_name",      label: "Archetype",       sortable: true  },
  { key: "sc_class",          label: "SC Class",        sortable: true  },
  { key: "risk",              label: "Attrition Score", sortable: true  },
  { key: "ll97_penalty_2024", label: "LL97 Penalty",    sortable: true  },
  { key: "steam",             label: "Steam (M kBtu)",  sortable: true  },
  { key: "norm_delta_23_24",  label: "YoY Δ (norm)",    sortable: true  },
  { key: "signal",            label: "Top Signal",      sortable: false },
  { key: "dob_jobs",          label: "DOB HVAC Jobs",   sortable: true  },
];

const USE_TYPES = [
  "Office", "Multifamily Housing", "Hotel", "K-12 School",
  "College/University", "Hospital (General Medical & Surgical)",
  "Other", "Retail Store",
];

export default function RiskTable({ buildings, onSelect, selectedAddress, watchlist = [], onWatch }) {
  const [sortKey,       setSortKey]       = useState("risk");
  const [sortDir,       setSortDir]       = useState("desc");
  const [tierFilter,    setTierFilter]    = useState("All");
  const [typeFilter,    setTypeFilter]    = useState("All");
  const [clusterFilter, setClusterFilter] = useState("All");
  const [signalFilter,  setSignalFilter]  = useState("All");
  const [ll97Filter,    setLl97Filter]    = useState("All");
  const [scFilter,      setScFilter]      = useState("All");
  const [outlierFilter, setOutlierFilter] = useState("All");
  const [demandMin,     setDemandMin]     = useState("");
  const [demandMax,     setDemandMax]     = useState("");
  const [search,        setSearch]        = useState("");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let rows = buildings;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(b => (b.address?.toLowerCase() ?? "").includes(q));
    }

    if (tierFilter !== "All") {
      if (tierFilter === "Uncertain") {
        rows = rows.filter(b => isUncertain(b));
      } else {
        rows = rows.filter(b => !isUncertain(b) && riskTier(b.risk).label === tierFilter);
      }
    }

    if (typeFilter !== "All") {
      rows = rows.filter(b => b.use === typeFilter);
    }

    if (clusterFilter !== "All") {
      rows = rows.filter(b => b.cluster_name === clusterFilter);
    }

    if (signalFilter === "Big Drop") {
      rows = rows.filter(b => b.signal === "big_drop");
    } else if (signalFilter === "Mod Drop") {
      rows = rows.filter(b => b.signal === "mod_drop");
    } else if (signalFilter === "No Signal") {
      rows = rows.filter(b => !b.signal);
    }

    if (ll97Filter === "Over Limit") {
      rows = rows.filter(b => b.ll97_over_2024 === 1);
    } else if (ll97Filter === "Compliant") {
      rows = rows.filter(b => b.ll97_over_2024 === 0);
    }

    if (scFilter !== "All") {
      rows = rows.filter(b => b.sc_class === scFilter);
    }

    if (outlierFilter === "Outliers Only") {
      rows = rows.filter(b => b.outlier_23_24 || b.outlier_22_23);
    } else if (outlierFilter === "Non-Outliers") {
      rows = rows.filter(b => !b.outlier_23_24 && !b.outlier_22_23);
    }

    const min = parseFloat(demandMin);
    const max = parseFloat(demandMax);
    if (!isNaN(min)) rows = rows.filter(b => b.steam >= min * 1e6);
    if (!isNaN(max)) rows = rows.filter(b => b.steam <= max * 1e6);

    return [...rows].sort((a, b) => {
      const rawA = a[sortKey]; const rawB = b[sortKey];
      // Push nulls/undefined to the end regardless of sort direction
      if (rawA == null && rawB == null) return 0;
      if (rawA == null) return 1;
      if (rawB == null) return -1;
      let av = typeof rawA === "string" ? rawA.toLowerCase() : rawA;
      let bv = typeof rawB === "string" ? rawB.toLowerCase() : rawB;
      if (av < bv) return sortDir === "asc" ? -1 :  1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [buildings, search, tierFilter, typeFilter, clusterFilter, signalFilter, ll97Filter, scFilter, outlierFilter, demandMin, demandMax, sortKey, sortDir]);

  function exportCSV() {
    // Wrap in quotes and neutralise CSV formula injection (=, +, -, @, tab, CR at start)
    const cell = v => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /^[\s]*[=+\-@\t\r\n]/.test(s) ? `"'${s}"` : `"${s}"`;
    };
    const header = ["Address","Type","SC Class","Attrition Score","LL97 Penalty 2024","LL97 Penalty 2030","Steam (M kBtu)","YoY Delta 23-24 (norm)","YoY Delta 22-23 (norm)","Outlier","Signal","DOB HVAC Jobs","Last Sale"].join(",");
    const rows = filtered.map(b => [
      cell(b.address),
      cell(b.use),
      cell(b.sc_class),
      Number.isFinite(b.risk) ? (b.risk * 100).toFixed(1) + "%" : "",
      b.ll97_penalty_2024 ?? "",
      b.ll97_penalty_2030 ?? "",
      b.steam != null ? (b.steam / 1e6).toFixed(1) : "",
      b.norm_delta_23_24 != null ? b.norm_delta_23_24.toFixed(1) + "%" : "",
      b.norm_delta_22_23 != null ? b.norm_delta_22_23.toFixed(1) + "%" : "",
      (b.outlier_23_24 || b.outlier_22_23) ? "YES" : "",
      cell(b.signal),
      b.dob_jobs ?? 0,
      cell(b.deed_date),
    ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "coned-attrition-risk.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const high         = filtered.filter(b => !isUncertain(b) && b.risk > 0.7).length;
  const medium       = filtered.filter(b => !isUncertain(b) && b.risk > 0.4 && b.risk <= 0.7).length;
  const low          = filtered.filter(b => !isUncertain(b) && Number.isFinite(b.risk) && b.risk <= 0.4).length;
  const uncertain    = filtered.filter(b => isUncertain(b)).length;
  const overCap      = filtered.filter(b => b.ll97_over_2024 === 1).length;
  const totalPenalty = filtered.reduce((sum, b) => sum + (b.ll97_penalty_2024 || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 border-b border-slate-800 items-center">
        {[
          { label: "High Attrition", count: high,             color: "#ef4444" },
          { label: "Med Attrition",  count: medium,           color: "#f97316" },
          { label: "Low Attrition",  count: low,              color: "#22c55e" },
          { label: "Uncertain",      count: uncertain,        color: "#a78bfa" },
          { label: "Total",          count: buildings.length, color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}

        {/* LL97 divider */}
        <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block" />

        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: overCap > 0 ? "#ef4444" : "#22c55e" }}>{overCap}</div>
          <div className="text-xs text-slate-500">Over LL97 Cap</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: totalPenalty > 5_000_000 ? "#ef4444" : totalPenalty > 0 ? "#f97316" : "#22c55e" }}>
            {totalPenalty >= 1_000_000
              ? `$${(totalPenalty / 1_000_000).toFixed(1)}M`
              : totalPenalty > 0
                ? `$${Math.round(totalPenalty / 1_000)}k`
                : "$0"}
          </div>
          <div className="text-xs text-slate-500">Combined Fine</div>
        </div>

        <div className="ml-auto flex items-center">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-slate-800 bg-slate-900/50">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search address…"
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 w-48"
        />
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
          <option>Uncertain</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option>All</option>
          {USE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select
          value={clusterFilter}
          onChange={e => setClusterFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none max-w-[220px]"
        >
          <option value="All">All Archetypes</option>
          <option>Pre-War Active — Permit-Driven Churn</option>
          <option>Pre-War Stable — Low Signal</option>
          <option>Large Commercial — Capital Mobilized</option>
          <option>Low-Compliance Commercial — Quiet Attrition</option>
          <option>Mid-Size Post-War — Moderate Signal</option>
        </select>
        <select
          value={signalFilter}
          onChange={e => setSignalFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option value="All">All Signals</option>
          <option value="Big Drop">Big Drop (≥50%)</option>
          <option value="Mod Drop">Mod Drop</option>
          <option value="No Signal">No Signal</option>
        </select>
        <select
          value={ll97Filter}
          onChange={e => setLl97Filter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option value="All">All LL97</option>
          <option value="Over Limit">Over Limit</option>
          <option value="Compliant">Compliant</option>
        </select>
        <select
          value={scFilter}
          onChange={e => setScFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option value="All">All SC Classes</option>
          <option value="SC-1* (Small Commercial)">SC-1* (Small Commercial)</option>
          <option value="SC-2* (Annual Power)">SC-2* (Annual Power)</option>
          <option value="SC-3* (Residential)">SC-3* (Residential)</option>
          <option value="SC-4* (Dual-Supply — est.)">SC-4* (Dual-Supply — est.)</option>
          <option value="SC-5* (Negotiated — est.)">SC-5* (Negotiated — est.)</option>
        </select>
        <select
          value={outlierFilter}
          onChange={e => setOutlierFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
        >
          <option value="All">All YoY</option>
          <option value="Outliers Only">Outliers Only</option>
          <option value="Non-Outliers">Non-Outliers</option>
        </select>
        <input
          value={demandMin}
          onChange={e => setDemandMin(e.target.value)}
          placeholder="Min M kBtu"
          type="number"
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none w-28"
        />
        <input
          value={demandMax}
          onChange={e => setDemandMax(e.target.value)}
          placeholder="Max M kBtu"
          type="number"
          className="px-3 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none w-28"
        />
        <span className="ml-auto text-xs text-slate-500 self-center">
          {filtered.length} buildings
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-slate-200 select-none" : ""}`}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
              {onWatch && (
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800" />
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => {
              const tier   = riskTier(b.risk);
              const sig    = signalMeta(b.signal);
              const active = b.address === selectedAddress;
              return (
                <tr
                  key={`${b.address}_${b.bbl}_${i}`}
                  onClick={() => onSelect(b)}
                  className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                    active
                      ? "bg-slate-700/50"
                      : i % 2 === 0
                        ? "bg-slate-900/30 hover:bg-slate-800/50"
                        : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">{b.address}</td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    {b.cluster_name ? (
                      <div>
                        <div className="text-xs text-slate-300 truncate">{b.cluster_name}</div>
                        <div className="text-xs mt-0.5"
                          style={{ color: b.cluster_risk === "High" ? "#ef4444" : b.cluster_risk === "Medium" ? "#f97316" : "#22c55e" }}>
                          {b.cluster_risk} risk archetype
                        </div>
                      </div>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {b.sc_class ? (
                      <span className="text-xs text-slate-300">{b.sc_class}</span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {isUncertain(b) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 rounded-sm" style={{ background: "#a78bfa", opacity: 0.85 }} />
                        <span className="font-bold" style={{ color: "#a78bfa" }}>
                          {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "#a78bfa", background: "#2e1065" }}>
                          Uncertain
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 rounded-sm" style={{ background: tier.color, opacity: 0.85 }} />
                        <span className="font-bold" style={{ color: tier.color }}>
                          {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: tier.color, background: tier.bg }}>
                          {tier.label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {b.ll97_penalty_2024 != null ? (
                      b.ll97_penalty_2024 > 0 ? (
                        <span className="text-xs font-semibold"
                          style={{ color: b.ll97_penalty_2024 > 100_000 ? "#ef4444" : "#f97316" }}>
                          ${b.ll97_penalty_2024 >= 1_000_000
                            ? (b.ll97_penalty_2024 / 1_000_000).toFixed(1) + "M"
                            : b.ll97_penalty_2024 >= 1_000
                              ? Math.round(b.ll97_penalty_2024 / 1_000) + "k"
                              : b.ll97_penalty_2024}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">✓</span>
                      )
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {b.steam != null ? (b.steam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {(() => {
                      const delta = b.norm_delta_23_24 ?? b.norm_delta_22_23;
                      const isOutlier = b.outlier_23_24 || b.outlier_22_23;
                      const period = b.norm_delta_23_24 != null ? "23→24" : b.norm_delta_22_23 != null ? "22→23" : null;
                      if (delta == null) return <span className="text-slate-600">—</span>;
                      const color = delta <= -20 ? "#ef4444" : delta <= -5 ? "#f97316" : delta >= 15 ? "#22c55e" : "#94a3b8";
                      return (
                        <span className="flex items-center justify-end gap-1">
                          {isOutlier && (
                            <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-yellow-900 text-yellow-300">!</span>
                          )}
                          <span style={{ color }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                          </span>
                          <span className="text-slate-600 text-[10px]">{period}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2.5">
                    {b.signal ? (
                      <span className="text-xs font-semibold" style={{ color: sig.color }}>
                        {sig.label}
                        {b.hdd_pct != null && (
                          <span className="ml-1 font-normal opacity-75">
                            {b.hdd_pct > 0 ? "+" : ""}{b.hdd_pct}%
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-center">
                    {b.dob_jobs ? (
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-xs">{b.dob_jobs}</span>
                    ) : "—"}
                  </td>
                  {onWatch && (
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); onWatch(b.address); }}
                        className={`text-base transition-colors ${watchlist.includes(b.address) ? "text-yellow-400" : "text-slate-700 hover:text-yellow-500"}`}
                        title={watchlist.includes(b.address) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        ★
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-16">No buildings match filters</div>
        )}
      </div>
    </div>
  );
}
