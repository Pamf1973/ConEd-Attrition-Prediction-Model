import { useState, useMemo, useEffect, useCallback } from "react";
import { riskTier, signalMeta } from "../data/useBuildings";

function buildCols() {
  return [
    { key: "address",           label: "Address",         sortable: true  },
    { key: "cluster_name",      label: "Cluster",         sortable: true  },
    { key: "sc_class",          label: "SC Class",        sortable: true  },
    { key: "risk",              label: "Attrition Score", sortable: true  },
    { key: "steam",             label: "Steam (M kBtu)",  sortable: true  },
    { key: "norm_delta_23_24",  label: "YoY Δ (norm)",    sortable: true  },
    { key: "signal",            label: "Top Signal",      sortable: false },
  ];
}

const USE_TYPES = [
  "Office", "Multifamily Housing", "Hotel", "K-12 School",
  "College/University", "Hospital (General Medical & Surgical)",
  "Other", "Retail Store",
];

export default function RiskTable({ buildings, onSelect, selectedAddress, watchlist = [], onWatch, token, clusterFilter: initialClusterFilter, riskMin: initialRiskMin, riskMax: initialRiskMax, searchInputRef }) {
  const [sortStack,      setSortStack]     = useState([{ key: "risk", dir: "desc" }]);
  const [tierFilter,     setTierFilter]    = useState("All");
  const [typeFilter,     setTypeFilter]    = useState("All");
  const [clusterFilter,  setClusterFilter] = useState("All");
  const [signalFilter,   setSignalFilter]  = useState("All");
  const [ll97Filter,     setLl97Filter]    = useState("All");
  const [scFilter,       setScFilter]      = useState("All");
  const [outlierFilter,  setOutlierFilter] = useState("All");
  const [demandMin,      setDemandMin]     = useState("");
  const [demandMax,      setDemandMax]     = useState("");
  const [search,         setSearch]        = useState("");
  const [chartRiskMin,   setChartRiskMin]  = useState(null);
  const [chartRiskMax,   setChartRiskMax]  = useState(null);
  const [csvLoading,     setCsvLoading]    = useState(false);
  const [csvError,       setCsvError]      = useState(null);
  const [page,           setPage]          = useState(1);
  const [pageSize,       setPageSize]      = useState(50);
  const [selectedSet,    setSelectedSet]   = useState(new Set());

  const resetFilters = useCallback(() => {
    setPage(1);
    setSelectedSet(new Set());
  }, []);

  // Sync cluster filter driven by YoY Scatter chart click
  useEffect(() => {
    if (initialClusterFilter != null) setClusterFilter(initialClusterFilter);
  }, [initialClusterFilter]);

  // Sync risk range driven by Risk Histogram bar click
  useEffect(() => {
    setChartRiskMin(initialRiskMin ?? null);
    setChartRiskMax(initialRiskMax ?? null);
  }, [initialRiskMin, initialRiskMax]);

  function handleSort(key) {
    setSortStack(prev => {
      const existing = prev.find(s => s.key === key);
      if (existing) {
        if (existing.dir === "desc") {
          return prev.map(s => s.key === key ? { ...s, dir: "asc" } : s);
        } else {
          return prev.filter(s => s.key !== key);
        }
      } else {
        return [...prev, { key, dir: "desc" }];
      }
    });
    resetFilters();
  }

  function toggleSelect(address) {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }

  function toggleSelectAll(filteredRows) {
    if (selectedSet.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedSet(new Set());
    } else {
      setSelectedSet(new Set(filteredRows.map(b => b.address)));
    }
  }

  const filtered = useMemo(() => {
    let rows = buildings;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(b => {
        const fields = [b.address, b.use, b.cluster_name, b.sc_class, b.bbl];
        return fields.some(f => (f ?? "").toLowerCase().includes(q));
      });
    }

    if (tierFilter !== "All") {
      rows = rows.filter(b => riskTier(b.risk).label === tierFilter);
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

    // Chart-driven risk range (from histogram bar click)
    if (chartRiskMin != null) rows = rows.filter(b => Number.isFinite(b.risk) && b.risk >= chartRiskMin);
    if (chartRiskMax != null) rows = rows.filter(b => Number.isFinite(b.risk) && b.risk <  chartRiskMax);

    const min = parseFloat(demandMin);
    const max = parseFloat(demandMax);
    if (!isNaN(min)) rows = rows.filter(b => b.steam >= min * 1e6);
    if (!isNaN(max)) rows = rows.filter(b => b.steam <= max * 1e6);

    // Multi-column sort
    return [...rows].sort((a, b) => {
      for (const { key, dir } of sortStack) {
        const rawA = a[key]; const rawB = b[key];
        if (rawA == null && rawB == null) continue;
        if (rawA == null) return 1;
        if (rawB == null) return -1;
        let av = typeof rawA === "string" ? rawA.toLowerCase() : rawA;
        let bv = typeof rawB === "string" ? rawB.toLowerCase() : rawB;
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [buildings, search, tierFilter, typeFilter, clusterFilter, signalFilter, ll97Filter, scFilter, outlierFilter, demandMin, demandMax, chartRiskMin, chartRiskMax, sortStack]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const pageRows = filtered.slice(startIdx, endIdx);

  function exportCSV(rows) {
    setCsvLoading(true);
    setCsvError(null);
    try {
      const cell = v => {
        const s = String(v ?? "").replace(/"/g, '""');
        return /^[\s]*[=+\-@\t\r\n]/.test(s) ? `"'${s}"` : `"${s}"`;
      };
      const header = ["Address","Type","SC Class","Attrition Score","Cluster","Steam (M kBtu)","YoY Delta 23-24 (norm)","YoY Delta 22-23 (norm)","Outlier","Signal","Last Sale"].join(",");
      const csvRows = rows.map(b => [
        cell(b.address),
        cell(b.use),
        cell(b.sc_class),
        Number.isFinite(b.risk) ? (b.risk * 100).toFixed(1) + "%" : "",
        cell(b.cluster_name),
        b.steam != null ? (b.steam / 1e6).toFixed(1) : "",
        b.norm_delta_23_24 != null ? b.norm_delta_23_24.toFixed(1) + "%" : "",
        b.norm_delta_22_23 != null ? b.norm_delta_22_23.toFixed(1) + "%" : "",
        (b.outlier_23_24 || b.outlier_22_23) ? "YES" : "",
        cell(b.signal),
        cell(b.deed_date),
      ].join(","));
      const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `coned-attrition-risk-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCsvError(`Export failed — ${err.message}`);
      setTimeout(() => setCsvError(null), 5000);
    } finally {
      setCsvLoading(false);
    }
  }

  const COLS = buildCols();

  const high   = filtered.filter(b => b.risk > 0.7).length;
  const medium = filtered.filter(b => b.risk > 0.4 && b.risk <= 0.7).length;
  const low    = filtered.filter(b => Number.isFinite(b.risk) && b.risk <= 0.4).length;

  async function downloadPortfolioCSV() {
    if (!token) return;
    setCsvLoading(true);
    setCsvError(null);
    try {
      const res = await fetch("/api/export/csv", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `coned-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCsvError(`Portfolio export failed — ${err.message}`);
      setTimeout(() => setCsvError(null), 5000);
    } finally {
      setCsvLoading(false);
    }
  }

  function handleAddSelectedToWatchlist() {
    if (!onWatch) return;
    selectedSet.forEach(addr => onWatch(addr));
    setSelectedSet(new Set());
  }

  function handleExportSelectedCSV() {
    const selected = filtered.filter(b => selectedSet.has(b.address));
    if (selected.length === 0) return;
    exportCSV(selected);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 border-b border-[#082244] items-center">
        {[
          { label: "High Attrition", count: high,             color: "#ef4444" },
          { label: "Med Attrition",  count: medium,           color: "#f97316" },
          { label: "Low Attrition",  count: low,              color: "#22c55e" },
          { label: "Total",          count: buildings.length, color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {csvError && (
            <span className="text-xs text-red-400">{csvError}</span>
          )}
          <button
            onClick={() => exportCSV(filtered)}
            disabled={csvLoading}
            className={`px-3 py-1.5 text-xs rounded border border-[#0F3B7E] text-slate-300 transition-colors ${csvLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#002469]"}`}
          >
            {csvLoading ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Exporting…
              </span>
            ) : "Export CSV"}
          </button>
          {token && (
            <button
              onClick={downloadPortfolioCSV}
              disabled={csvLoading}
              className={`px-3 py-1.5 text-xs rounded border border-[#0F3B7E] text-slate-300 transition-colors ${csvLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#002469]"}`}
            >
              {csvLoading ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Exporting…
                </span>
              ) : "⬇ CSV"}
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedSet.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0041A8]/20 border-b border-[#0F3B7E]">
          <span className="text-sm text-slate-300 font-semibold">{selectedSet.size} selected</span>
          <div className="w-px h-5 bg-[#0F3B7E]" />
          {onWatch && (
            <button
              onClick={handleAddSelectedToWatchlist}
              className="px-2.5 py-1 text-xs rounded bg-[#002469] border border-[#0F3B7E] text-slate-300 hover:bg-[#0041A8] transition-colors"
            >
              + Add to Watchlist
            </button>
          )}
          <button
            onClick={handleExportSelectedCSV}
            className="px-2.5 py-1 text-xs rounded bg-[#002469] border border-[#0F3B7E] text-slate-300 hover:bg-[#0041A8] transition-colors"
          >
            Export Selected CSV
          </button>
          <button
            onClick={() => setSelectedSet(new Set())}
            className="px-2.5 py-1 text-xs rounded bg-[#002469] border border-[#0F3B7E] text-slate-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-[#082244] bg-[#001748]/50">
        <input
          ref={searchInputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); resetFilters(); }}
          placeholder="Search address, use, BBL…"
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2A6FBF] w-48"
        />
        <select
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
        >
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
        >
          <option>All</option>
          {USE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select
          value={clusterFilter}
          onChange={e => { setClusterFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none max-w-[220px]"
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
          onChange={e => { setSignalFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
        >
          <option value="All">All Signals</option>
          <option value="Big Drop">Big Drop (≥50%)</option>
          <option value="Mod Drop">Mod Drop</option>
          <option value="No Signal">No Signal</option>
        </select>
        <select
          value={ll97Filter}
          onChange={e => { setLl97Filter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
        >
          <option value="All">All LL97</option>
          <option value="Over Limit">Over Limit</option>
          <option value="Compliant">Compliant</option>
        </select>
        <select
          value={scFilter}
          onChange={e => { setScFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
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
          onChange={e => { setOutlierFilter(e.target.value); resetFilters(); }}
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
        >
          <option value="All">All YoY</option>
          <option value="Outliers Only">Outliers Only</option>
          <option value="Non-Outliers">Non-Outliers</option>
        </select>
        <input
          value={demandMin}
          onChange={e => { setDemandMin(e.target.value); resetFilters(); }}
          placeholder="Min M kBtu"
          type="number"
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 placeholder-slate-500 focus:outline-none w-28"
        />
        <input
          value={demandMax}
          onChange={e => { setDemandMax(e.target.value); resetFilters(); }}
          placeholder="Max M kBtu"
          type="number"
          className="px-3 py-1.5 text-sm rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 placeholder-slate-500 focus:outline-none w-28"
        />
        <span className="ml-auto text-xs text-slate-500 self-center">
          {filtered.length} buildings
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#001748] z-10">
            <tr>
              {/* Checkbox column */}
              {(onWatch) && (
                <th className="px-1 py-3 text-center border-b border-[#082244] w-8">
                  <input
                    type="checkbox"
                    checked={selectedSet.size === filtered.length && filtered.length > 0}
                    onChange={() => toggleSelectAll(filtered)}
                    className="accent-[#0041A8] cursor-pointer"
                  />
                </th>
              )}
              {COLS.map(col => {
                const sortEntry = sortStack.find(s => s.key === col.key);
                const sortIdx = sortEntry ? sortStack.indexOf(sortEntry) + 1 : null;
                return (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-slate-200 select-none" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>
                        {col.label}
                        {sortEntry && (
                          <span className="ml-1 text-[11px] opacity-80">
                            {sortIdx}{sortEntry.dir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                    </span>
                  </th>
                );
              })}
              {onWatch && (
                <th className="px-2 py-3 text-center border-b border-[#082244] w-8">
                  <span className="text-slate-600 text-xs">★</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((b, i) => {
              const tier = riskTier(b.risk);
              const sig  = signalMeta(b.signal);
              const active = b.address === selectedAddress;
              const watched = watchlist.includes(b.address);
              return (
                <tr
                  key={`${b.address}_${i}`}
                  onClick={() => onSelect(b)}
                  className={`border-b border-[#082244]/60 cursor-pointer transition-colors ${
                    active ? "bg-[#0041A8]/50" : watched ? "bg-[#E87722]/10" : i % 2 === 0 ? "bg-[#001748]/30 hover:bg-[#002469]/50" : "hover:bg-[#002469]/50"
                  }`}
                >
                  {/* Checkbox */}
                  {(onWatch) && (
                    <td className="px-1 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(b.address)}
                        onChange={() => toggleSelect(b.address)}
                        className="accent-[#0041A8] cursor-pointer"
                      />
                    </td>
                  )}
                  {COLS.map(col => {
                    if (col.key === "address") {
                      return (
                        <td key={col.key} className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">
                          {b.address}
                        </td>
                      );
                    }
                    if (col.key === "cluster_name") {
                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          {b.cluster_name ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-[#002469] border border-[#0F3B7E] text-slate-300 max-w-[200px] truncate">
                              {b.cluster_name}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "risk") {
                      return (
                        <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-5 rounded-sm" style={{ background: tier.color, opacity: 0.85 }} />
                            <span className="font-bold" style={{ color: tier.color }}>
                              {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ color: tier.color, background: tier.bg }}
                            >
                              {tier.label}
                            </span>
                          </div>
                        </td>
                      );
                    }
                    if (col.key === "steam") {
                      return (
                        <td key={col.key} className="px-4 py-2.5 text-slate-300 font-mono">
                          {b.steam != null
                            ? (b.steam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : "—"}
                        </td>
                      );
                    }
                    if (col.key === "norm_delta_23_24") {
                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          {b.norm_delta_23_24 != null ? (
                            <span style={{ color: b.norm_delta_23_24 < -15 ? "#ef4444" : b.norm_delta_23_24 < -5 ? "#f97316" : "#94a3b8" }}>
                              {b.norm_delta_23_24 > 0 ? "+" : ""}{b.norm_delta_23_24.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "signal") {
                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          {b.signal ? (
                            <span className="text-xs font-semibold" style={{ color: sig.color }}>
                              {sig.label}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "sc_class") {
                      return (
                        <td key={col.key} className="px-4 py-2.5 text-xs text-slate-400 max-w-[160px] truncate">
                          {b.sc_class ?? "—"}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="px-4 py-2.5 text-slate-300">
                        {b[col.key] ?? "—"}
                      </td>
                    );
                  })}
                  {/* Watchlist star */}
                  {onWatch && (
                    <td className="px-2 py-2.5 text-center" onClick={e => { e.stopPropagation(); onWatch(b.address); }}>
                      <span className={`cursor-pointer text-sm transition-colors ${watched ? "text-[#E87722]" : "text-slate-600 hover:text-slate-400"}`}>
                        {watched ? "★" : "☆"}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#082244] bg-[#001748] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {filtered.length > 0
              ? `${startIdx + 1}–${endIdx} of ${filtered.length}`
              : "0 buildings"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 text-xs rounded bg-[#002469] border border-[#0F3B7E] text-slate-200 focus:outline-none"
          >
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-2.5 py-1 text-xs rounded border border-[#0F3B7E] text-slate-400 hover:bg-[#002469] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-2.5 py-1 text-xs rounded border border-[#0F3B7E] text-slate-400 hover:bg-[#002469] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}