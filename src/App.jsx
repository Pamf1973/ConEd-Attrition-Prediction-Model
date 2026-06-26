import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useBuildings, riskTier } from "./data/useBuildings";
import { useKeyboard } from "./hooks/useKeyboard";
import Login from "./components/Login";
import ErrorBoundary from "./components/ErrorBoundary";
import { useWatchlist } from "./components/Watchlist";

// When Railway redeploys, old chunk filenames disappear. Any cached HTML that
// still references old hashes will get a 404 on dynamic import. Force a
// one-time reload per tab session to pick up the new HTML + new asset manifest.
// - On success: clear the flag so a future deployment also gets one retry.
// - On first failure: set flag, reload, return a never-settling promise so
//   React stays in Suspense (no ErrorBoundary flash) until navigation completes.
// - On second failure (flag already set): reject so ErrorBoundary shows an error.
const lazyWithReload = (importer) =>
  lazy(() =>
    importer()
      .then((mod) => {
        sessionStorage.removeItem("chunk_reload_attempted");
        return mod;
      })
      .catch((e) => {
        if (!sessionStorage.getItem("chunk_reload_attempted")) {
          sessionStorage.setItem("chunk_reload_attempted", "1");
          window.location.reload();
          return new Promise(() => {}); // stay in Suspense until page reloads
        }
        return Promise.reject(e);
      })
  );

const RiskTable           = lazyWithReload(() => import("./components/RiskTable"));
const BuildingPanel       = lazyWithReload(() => import("./components/BuildingPanel"));
const AIAgent             = lazyWithReload(() => import("./components/AIAgent"));
const YoYScatter          = lazyWithReload(() => import("./components/YoYScatter"));
const RiskHistogram       = lazyWithReload(() => import("./components/RiskHistogram"));
const Watchlist           = lazyWithReload(() => import("./components/Watchlist"));
const ClusterExplorer     = lazyWithReload(() => import("./components/ClusterExplorer"));
const AlertBanner         = lazyWithReload(() => import("./components/AlertBanner"));
const AlertsPanel         = lazyWithReload(() => import("./components/AlertsPanel"));
const ProactiveAlertSummary = lazyWithReload(() => import("./components/ProactiveAlertSummary"));

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("coned_token") || null);
  const { buildings, loading, error } = useBuildings(token);
  const [selected,    setSelected]    = useState(null);
  const [activeTab,   setActiveTab]   = useState("rankings");
  const { watchlist, toggle: toggleWatch, clear: clearWatch } = useWatchlist(token);
  const [clusterFilter, setClusterFilter] = useState("All");
  const [riskMin, setRiskMin] = useState(null);
  const [riskMax, setRiskMax] = useState(null);
  const searchInputRef = useRef(null);

  // ── Alert state ──────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/alerts/proactive", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        if (data.summary) setSummary(data.summary);
      }
    } catch {
      // silently ignore — polling will retry
    }
  }, [token]);

  // Initial fetch when token available, then poll every 60s
  useEffect(() => {
    if (!token) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [token, fetchAlerts]);

  const dismissAlert = useCallback(async (alertId) => {
    if (!token) return;
    try {
      await fetch("/api/alerts/proactive/dismiss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alert_id: alertId }),
      });
      // Optimistic removal from local state
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, dismissed: true } : a));
    } catch {
      // re-fetch on next poll
    }
  }, [token]);

  const activeAlertCount = useMemo(() => alerts.filter(a => !a.dismissed).length, [alerts]);

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
    // Accept either a building object or an address string (from ClusterExplorer)
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

  const clusterStats = useMemo(() => {
    const clusters = {};
    for (const b of buildings) {
      const name = b.cluster_name ?? "Unlabeled";
      if (!clusters[name]) clusters[name] = { name, count: 0, riskSum: 0, riskCount: 0 };
      clusters[name].count++;
      if (Number.isFinite(b.risk)) { clusters[name].riskSum += b.risk; clusters[name].riskCount++; }
    }
    return Object.values(clusters).map(c => ({
      ...c,
      avgRisk: c.riskCount > 0 ? c.riskSum / c.riskCount : 0,
    })).sort((a, b) => b.count - a.count);
  }, [buildings]);

  const diagnosticStats = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0, Uncertain: 0 };
    for (const b of buildings) {
      const dr = b.diagnostic_risk;
      if (dr && dr in counts) counts[dr]++;
    }
    return counts;
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
            { id: "targets",     label: "📊 Clusters",          enabled: true },
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
          {/* Alert bell badge */}
          <button
            onClick={() => setShowAlertsPanel(true)}
            className={`relative px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              activeAlertCount > 0
                ? "text-orange-400 bg-[#002469]/60 border border-orange-700/40 hover:bg-[#003080]"
                : "text-slate-500 bg-[#002469]/30 border border-[#0F3B7E]/30 hover:bg-[#002469]/60"
            }`}
            title={activeAlertCount > 0 ? `${activeAlertCount} active alert(s)` : "No active alerts"}
          >
            🔔
            {activeAlertCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-lg shadow-red-900/50">
                {activeAlertCount > 99 ? "99+" : activeAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="px-2.5 py-1 rounded border border-[#0F3B7E] hover:border-red-500/40 text-[11px] font-bold text-slate-400 hover:text-red-400 bg-[#002469]/40 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Alert Banner — shows most critical active alert */}
      {activeAlertCount > 0 && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
          <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
        </Suspense>
      )}

      {/* Cluster Stats Banner */}
      <div className="grid grid-cols-5 gap-px border-b border-[#082244] bg-[#082244] shrink-0">
        {clusterStats.map((c, i) => {
          const tier = riskTier(c.avgRisk);
          return (
            <div key={i} className="bg-[#001748] px-4 py-2.5 flex flex-col gap-0.5">
              <div className="text-sm font-bold text-slate-100 leading-tight truncate">{c.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold" style={{ color: tier.color }}>{c.count}</span>
                <span className="text-[11px] text-slate-500">buildings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: tier.color, background: tier.bg }}
                >
                  {Math.round(c.avgRisk * 100)}%
                </span>
                <span className="text-[11px] text-slate-500">{tier.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostic Tier Summary Bar */}
      {diagnosticStats.High + diagnosticStats.Medium + diagnosticStats.Low + diagnosticStats.Uncertain > 0 && (
        <div className="flex items-center gap-4 px-5 py-1.5 border-b border-[#082244] bg-[#001748]/60 shrink-0 text-[11px]">
          <span className="text-slate-600 font-semibold uppercase tracking-widest text-[9px]">Diagnostic</span>
          <span style={{ color: "#ef4444" }}>High: <b>{diagnosticStats.High}</b></span>
          <span style={{ color: "#f59e0b" }}>Med: <b>{diagnosticStats.Medium}</b></span>
          <span style={{ color: "#22c55e" }}>Low: <b>{diagnosticStats.Low}</b></span>
          <span style={{ color: "#9ca3af" }}>Uncertain: <b>{diagnosticStats.Uncertain}</b></span>
          <span className="text-slate-600 ml-auto">weather-normalized rule-based tier</span>
        </div>
      )}

      {/* Proactive Alert Summary */}
      {summary && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
          <div className="border-b border-[#082244] shrink-0">
            <div className="px-5 py-2">
              <ProactiveAlertSummary summary={summary} />
            </div>
          </div>
        </Suspense>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {activeTab === "rankings" && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
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
          </Suspense>
        )}

        {activeTab === "trends" && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
          <div className="flex-1 min-w-0 overflow-y-auto p-5 grid gap-5">
            <RiskHistogram buildings={buildings} onFilterByRisk={handleHistogramFilter} />
            <YoYScatter buildings={buildings} onFilterCluster={handleScatterFilterCluster} onSelectBuilding={handleScatterSelect} />
          </div>
          </Suspense>
        )}

        {activeTab === "targets" && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <ClusterExplorer
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
          </Suspense>
        )}

        {activeTab === "watchlist" && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
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
          </Suspense>
        )}

        {activeTab === "agent" && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
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
          </Suspense>
        )}
      </div>

      {/* Alerts Panel Overlay */}
      {showAlertsPanel && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowAlertsPanel(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-[420px] z-50 shadow-2xl shadow-black/50 overflow-y-auto bg-[#030D1A] border-l border-[#0F3B7E]/50">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#082244] bg-[#001748] sticky top-0 z-10">
              <h2 className="text-sm font-bold text-slate-100">🔔 Active Alerts</h2>
              <button
                onClick={() => setShowAlertsPanel(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none px-1"
                title="Close"
              >
                ✕
              </button>
            </div>
            <AlertsPanel alerts={alerts} onDismiss={dismissAlert} />
          </div>
        </>
        </Suspense>
      )}
    </div>
    </ErrorBoundary>
  );
}
