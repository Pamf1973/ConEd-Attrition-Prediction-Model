import { useState } from "react";
import { useBuildings } from "./data/useBuildings";
import RiskTable from "./components/RiskTable";
import BuildingPanel from "./components/BuildingPanel";
import AIAgent from "./components/AIAgent";

export default function App() {
  const { buildings, loading, error } = useBuildings();
  const [selected,    setSelected]    = useState(null);
  const [activeTab,   setActiveTab]   = useState("rankings");

  function handleSelect(b) {
    setSelected(prev => prev?.address === b.address ? null : b);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-30">⚡</div>
          Loading building data…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        <div className="text-center">
          <div className="text-2xl mb-3 text-red-500">Failed to load</div>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-950">
      {/* Top nav */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div>
          <span className="text-xs font-bold text-orange-400 tracking-widest">CONED</span>
          <h1 className="text-sm font-bold text-slate-100 leading-tight">Steam Operations — Attrition Intelligence</h1>
        </div>
        <div className="w-px h-8 bg-slate-700 mx-1" />
        <nav className="flex gap-1">
          {[
            { id: "rankings", label: "Attrition Rankings", enabled: true  },
            { id: "forecast", label: "Load Forecast",       enabled: false },
            { id: "watchlist",label: "Watch List",          enabled: false },
            { id: "agent",    label: "AI Agent",            enabled: true  },
          ].map(tab => (
            <button
              key={tab.id}
              disabled={!tab.enabled}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-700 text-slate-100"
                  : tab.enabled
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-slate-600 cursor-not-allowed"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-500">
            Phase 1 · Decision-Support Ranking
          </span>
          <span className="text-xs text-slate-600">
            {buildings.length.toLocaleString()} active steam customers
          </span>
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

        {activeTab === "agent" && (
          <>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${selected ? "max-w-[calc(100%-380px)]" : ""}`}>
              <AIAgent
                buildings={buildings}
                onSelect={handleSelect}
                selectedAddress={selected?.address}
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
  );
}
