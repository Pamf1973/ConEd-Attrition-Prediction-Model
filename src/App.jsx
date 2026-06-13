import { useState, useEffect, useCallback } from "react";
import { useBuildings } from "./data/useBuildings";
import RiskTable from "./components/RiskTable";
import BuildingPanel from "./components/BuildingPanel";
import AIAgent from "./components/AIAgent";
import Login from "./components/Login";
import YoYScatter from "./components/YoYScatter";
import RiskHistogram from "./components/RiskHistogram";
import Watchlist, { useWatchlist } from "./components/Watchlist";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("coned_token") || null);
  const { buildings, loading, error } = useBuildings(token);
  const [selected,    setSelected]    = useState(null);
  const [activeTab,   setActiveTab]   = useState("rankings");
  const { watchlist, toggle: toggleWatch, clear: clearWatch } = useWatchlist();

  const handleLogout = useCallback(() => {
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    sessionStorage.removeItem("coned_token");
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
    setSelected(prev => prev?.address === b.address ? null : b);
  }

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
            { id: "rankings",  label: "Attrition Rankings", enabled: true  },
            { id: "trends",    label: "YoY Trends",          enabled: true  },
            { id: "watchlist", label: `Watch List${watchlist.length ? ` (${watchlist.length})` : ""}`, enabled: true },
            { id: "agent",     label: "AI Agent",            enabled: true  },
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
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 rounded border border-[#0F3B7E] hover:border-red-500/40 text-[11px] font-bold text-slate-400 hover:text-red-400 bg-[#002469]/40 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

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
              />
            </div>
            {selected && (
              <div className="w-[380px] shrink-0 overflow-hidden">
                <BuildingPanel
                  building={selected}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "trends" && (
          <div className="flex-1 min-w-0 overflow-y-auto p-5 grid gap-5">
            <RiskHistogram buildings={buildings} />
            <YoYScatter buildings={buildings} />
          </div>
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
                <BuildingPanel building={selected} onClose={() => setSelected(null)} />
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
