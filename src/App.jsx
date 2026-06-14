import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useBuildings } from "./data/useBuildings";
import { useKeyboard } from "./hooks/useKeyboard";
import RiskTable from "./components/RiskTable";
import BuildingPanel from "./components/BuildingPanel";
import AIAgent from "./components/AIAgent";
import Login from "./components/Login";
import YoYScatter from "./components/YoYScatter";
import RiskHistogram from "./components/RiskHistogram";
import Watchlist, { useWatchlist } from "./components/Watchlist";
import ErrorBoundary from "./components/ErrorBoundary";
import TopTargets from "./components/TopTargets";

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("coned_token") || null);
  const { buildings, loading, error } = useBuildings(token);
  const [selected,    setSelected]    = useState(null);
  const [activeTab,   setActiveTab]   = useState("rankings");
  const { watchlist, toggle: toggleWatch, clear: clearWatch } = useWatchlist();
  const [clusterFilter, setClusterFilter] = useState("All");
  const [riskMin, setRiskMin] = useState(null);
  const [riskMax, setRiskMax] = useState(null);
  const searchInputRef = useRef(null);

  const handleLogout = useCallback(() => {
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    sessionStorage.removeItem("coned_token");
    localStorage.removeItem("coned_watchlist");
    setToken(null);
    setSelected(null);
  }, [token]);

  useEffect(() => {
    if (error === "UNAUTHORIZED") {
      const t = setTimeout(() => {
        handleLogout();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [error, handleLogout]);

  function handleLogin(newToken) {
    sessionStorage.setItem("coned_token", newToken);
    setToken(newToken);
  }

  function handleSelect(b) {
    // Accept either a building object or an address string (from TopTargets)
    if (typeof b === "string") {
      const found = buildings.find(bld => bld.address === b);
      if (found) setSelected(prev => prev?.address === found.address ? null : found);
      return;
    }
    setSelected(prev => prev?.address === b.address ? null : b);
  }

  useKeyboard({
    "Escape":  () => setSelected(null),
    "1":       () => setActiveTab("rankings"),
    "2":       () => setActiveTab("trends"),
    "3":       () => setActiveTab("targets"),
    "4":       () => setActiveTab("watchlist"),
    "5":       () => setActiveTab("agent"),
    "ctrl+f":  () => {
      setActiveTab("rankings");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    },
  }, [setSelected, setActiveTab]);

  function handleScatterFilterCluster(clusterName) {
    setClusterFilter(clusterName);
    setActiveTab("rankings");
  }

  function handleScatterSelect(building) {
    handleSelect(building);
    setActiveTab("rankings");
  }

  function handleHistogramFilter(min, max) {
    setRiskMin(min);
    setRiskMax(max);
    setActiveTab("rankings");
  }

  const bannerStats = useMemo(() => {
    const total2024   = buildings.reduce((s, b) => s + (b.ll97_penalty_2024 || 0), 0);
    const total2030   = buildings.reduce((s, b) => s + (b.ll97_penalty_2030 || 0), 0);
    const over2024    = buildings.filter(b => (b.ll97_penalty_2024 ?? 0) > 0).length;
    const over2030    = buildings.filter(b => (b.ll97_penalty_2030 ?? 0) > 0).length;
    const extremeRisk = buildings.filter(b => (b.risk ?? 0) >= 0.90).length;
    const pctIncrease = total2024 > 0 ? Math.round(((total2030 - total2024) / total2024) * 100) : 0;
    const fmt = v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v > 0 ? `$${Math.round(v / 1000)}k` : "$0";
    return { total2024, total2030, over2024, over2030, extremeRisk, pctIncrease, fmt };
  }, [buildings]);

  // Render Login if no token
  if (!token) {
    return <ErrorBoundary><Login onLogin={handleLogin} /></ErrorBoundary>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm bg-[#030D1A]">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-30">⚡</div>
          Loading building data…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm bg-[#030D1A]">
        <div className="text-center">
          <div className="text-2xl mb-3 text-red-500">Failed to load</div>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-[#002469] border border-[#0F3B7E] text-slate-300 hover:bg-[#0041A8] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-dvh bg-[#030D1A]">
      {/* Top nav */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-[#082244] bg-[#001748] shrink-0">
        <div>
          <span className="text-xs font-bold text-[#E87722] tracking-widest">CONED</span>
          <h1 className="text-sm font-bold text-slate-100 leading-tight">Steam Operations — Attrition Intelligence</h1>
        </div>
        <div className="w-px h-8 bg-[#0041A8] mx-1" />
        <nav className="flex gap-1">
          {[
            { id: "rankings",    label: "Attrition Rankings", enabled: true },
            { id: "trends",      label: "YoY Trends",          enabled: true },
            { id: "targets",     label: "🎯 Top Targets",      enabled: true },
            { id: "watchlist",   label: `Watch List${watchlist.length ? ` (${watchlist.length})` : ""}`, enabled: true },
            { id: "agent",       label: "AI Agent",            enabled: true },
          ].map(tab => (
            <button
              key={tab.id}
              disabled={!tab.enabled}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#0041A8] text-slate-100"
                  : tab.enabled
                    ? "text-slate-400 hover:text-slate-200 hover:bg-[#002469]"
                    : "text-slate-600 cursor-not-allowed"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs px-2 py-0.5 rounded border border-[#0F3B7E] text-slate-500">
            Phase 1 · Decision-Support Ranking
          </span>
          <span className="text-xs text-slate-600">
            {buildings.length.toLocaleString()} active steam customers
          </span>
          <span className="text-xs text-slate-500/70">
            Data: Jun 2026 · Steam: 2024 · LL84: May 2025
          </span>
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 rounded border border-[#0F3B7E] hover:border-red-500/40 text-[11px] font-bold text-slate-400 hover:text-red-400 bg-[#002469]/40 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Portfolio Dollar Exposure Banner */}
      <div className="grid grid-cols-4 gap-px border-b border-[#082244] bg-[#082244] shrink-0">
        {[
          {
            value: bannerStats.fmt(bannerStats.total2024),
            label: "2024 LL97 Exposure",
            sub:   `${bannerStats.over2024.toLocaleString()} buildings over cap`,
            orange: false,
          },
          {
            value: bannerStats.fmt(bannerStats.total2030),
            label: "2030 LL97 Exposure",
            sub:   `${bannerStats.over2030.toLocaleString()} buildings over cap`,
            orange: true,
          },
          {
            value: `${bannerStats.pctIncrease}%`,
            label: "Penalty Increase →2030",
            sub:   "cap tightens significantly",
            orange: false,
          },
          {
            value: bannerStats.extremeRisk.toLocaleString(),
            label: "Extreme Risk Accounts",
            sub:   "score ≥ 90%",
            orange: false,
          },
        ].map((card, i) => (
          <div key={i} className="bg-[#001748] px-4 py-2.5 flex flex-col gap-0.5">
            <div className={`text-xl font-bold leading-tight ${card.orange ? "text-[#E87722]" : "text-slate-100"}`}>
              {card.value}
            </div>
            <div className="text-xs font-medium text-slate-300">{card.label}</div>
            <div className={`text-[11px] ${card.orange ? "text-[#E87722]/70" : "text-slate-500"}`}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {activeTab === "rankings" && (
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <RiskTable
                buildings={buildings}
                onSelect={handleSelect}
                selectedAddress={selected?.address}
                watchlist={watchlist}
                onWatch={toggleWatch}
                token={token}
                clusterFilter={clusterFilter}
                riskMin={riskMin}
                riskMax={riskMax}
                searchInputRef={searchInputRef}
              />
            </div>
            {selected && (
              <div className="w-[380px] shrink-0 overflow-hidden">
                <BuildingPanel
                  building={selected}
                  onClose={() => setSelected(null)}
                  allBuildings={buildings}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "trends" && (
          <div className="flex-1 min-w-0 overflow-y-auto p-5 grid gap-5">
            <RiskHistogram buildings={buildings} onFilterByRisk={handleHistogramFilter} />
            <YoYScatter buildings={buildings} onFilterCluster={handleScatterFilterCluster} onSelectBuilding={handleScatterSelect} />
          </div>
        )}

        {activeTab === "targets" && (
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <TopTargets
                buildings={buildings}
                onSelect={handleSelect}
                token={token}
              />
            </div>
            {selected && (
              <div className="w-[380px] shrink-0 overflow-hidden">
                <BuildingPanel building={selected} onClose={() => setSelected(null)} allBuildings={buildings} />
              </div>
            )}
          </>
        )}

        {activeTab === "watchlist" && (
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <Watchlist
                buildings={buildings}
                watchlist={watchlist}
                onToggle={toggleWatch}
                onClear={clearWatch}
                onSelect={handleSelect}
                selectedAddress={selected?.address}
              />
            </div>
            {selected && (
              <div className="w-[380px] shrink-0 overflow-hidden">
                <BuildingPanel building={selected} onClose={() => setSelected(null)} allBuildings={buildings} />
              </div>
            )}
          </>
        )}

        {activeTab === "agent" && (
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <AIAgent
                buildings={buildings}
                onSelect={handleSelect}
                selectedAddress={selected?.address}
                token={token}
              />
            </div>
            {selected && (
              <div className="w-[380px] shrink-0 overflow-hidden">
                <BuildingPanel
                  building={selected}
                  onClose={() => setSelected(null)}
                  allBuildings={buildings}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
