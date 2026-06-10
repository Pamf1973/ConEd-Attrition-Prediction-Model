import { useState, useEffect } from "react";
import { riskTier, signalMeta } from "../data/useBuildings";

const STORAGE_KEY = "coned_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  function toggle(address) {
    setWatchlist(prev => {
      const next = prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setWatchlist([]);
  }

  return { watchlist, toggle, clear };
}

export default function Watchlist({ buildings, watchlist, onToggle, onSelect, selectedAddress }) {
  const watched = buildings.filter(b => watchlist.includes(b.address));

  if (watchlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
        <div className="text-4xl mb-4 opacity-20">★</div>
        <p className="text-slate-400 text-sm mb-1">No buildings saved yet</p>
        <p className="text-slate-600 text-xs">Click the ★ icon next to any building in Attrition Rankings to save it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <span className="text-sm text-slate-300 font-semibold">{watched.length} saved buildings</span>
        <button
          onClick={onToggle.clear ?? (() => {})}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              {["Address", "Attrition Score", "LL97 Penalty", "Steam (M kBtu)", "Signal", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {watched.map((b, i) => {
              const tier   = riskTier(b.risk);
              const sig    = signalMeta(b.signal);
              const active = b.address === selectedAddress;
              return (
                <tr
                  key={b.address}
                  onClick={() => onSelect(b)}
                  className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                    active ? "bg-slate-700/50" : i % 2 === 0 ? "bg-slate-900/30 hover:bg-slate-800/50" : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">{b.address}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-sm" style={{ background: tier.color, opacity: 0.85 }} />
                      <span className="font-bold" style={{ color: tier.color }}>
                        {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: tier.color, background: tier.bg }}>
                        {tier.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {b.ll97_penalty_2024 != null ? (
                      b.ll97_penalty_2024 > 0 ? (
                        <span className="text-xs font-semibold" style={{ color: b.ll97_penalty_2024 > 100_000 ? "#ef4444" : "#f97316" }}>
                          ${b.ll97_penalty_2024 >= 1_000_000
                            ? (b.ll97_penalty_2024 / 1_000_000).toFixed(1) + "M"
                            : Math.round(b.ll97_penalty_2024 / 1_000) + "k"}
                        </span>
                      ) : <span className="text-xs text-green-600">✓</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {b.steam != null ? (b.steam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {b.signal
                      ? <span className="text-xs font-semibold" style={{ color: sig.color }}>{sig.label}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(b.address); }}
                      className="text-yellow-400 hover:text-slate-400 transition-colors text-base"
                      title="Remove from watchlist"
                    >
                      ★
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
