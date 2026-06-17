import { useState, useEffect, useCallback } from "react";
import { riskTier, signalMeta } from "../data/useBuildings";

const STORAGE_KEY = "coned_watchlist";

export function useWatchlist(token) {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  // Load from server on mount (localStorage fallback)
  useEffect(() => {
    if (!token) return;
    fetch("/api/watchlist/load", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // Skip overwrite if server returns empty and localStorage already has entries
        if (data && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setWatchlist(data.addresses);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.addresses));
        }
      })
      .catch(() => {
        // Server unavailable — keep localStorage data
      });
  }, [token]);

  // Persist to both localStorage and server — useCallback keeps token current
  const persist = useCallback((addresses) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    if (token) {
      fetch("/api/watchlist/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ addresses }),
      }).catch(err => console.warn("[watchlist] server save failed:", err.message));
    }
  }, [token]);

  function toggle(address) {
    setWatchlist(prev => {
      const next = prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address];
      persist(next);
      return next;
    });
  }

  function clear() {
    persist([]);
    setWatchlist([]);
  }

  return { watchlist, toggle, clear };
}

export default function Watchlist({ buildings, watchlist, onToggle, onClear, onSelect, selectedAddress }) {
  const watched = buildings.filter(b => watchlist.includes(b.address));

  function exportWatchlist() {
    const blob = new Blob(
      [JSON.stringify(watched.map(b => b.address), null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coned-watchlist.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importWatchlist(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const addresses = JSON.parse(evt.target.result);
        if (!Array.isArray(addresses)) return;
        addresses.forEach(addr => {
          const b = buildings.find(bld => bld.address === addr);
          if (b && !watched.find(w => w.address === addr)) onToggle(b.address);
        });
      } catch { /* ignore invalid JSON */ }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = "";
  }

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
      <div className="px-5 py-3 border-b border-[#082244] bg-[#001748]/60 flex items-center justify-between">
        <span className="text-sm text-slate-300 font-semibold">{watched.length} saved buildings</span>
        <div className="flex items-center gap-2">
          <button
            onClick={exportWatchlist}
            className="px-2 py-1 text-xs rounded border border-[#0F3B7E] text-slate-400 hover:text-slate-200 hover:bg-[#002469] transition-colors"
          >
            Export
          </button>
          <label className="px-2 py-1 text-xs rounded border border-[#0F3B7E] text-slate-400 hover:text-slate-200 hover:bg-[#002469] transition-colors cursor-pointer">
            Import
            <input type="file" accept=".json" className="hidden" onChange={importWatchlist} />
          </label>
          <button
            onClick={onClear ?? (() => {})}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#001748] z-10">
            <tr>
              {["Address", "Attrition Score", "Cluster", "Steam (M kBtu)", "Signal", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">
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
                  className={`border-b border-[#082244]/60 cursor-pointer transition-colors ${
                    active ? "bg-[#0041A8]/50" : i % 2 === 0 ? "bg-[#001748]/30 hover:bg-[#002469]/50" : "hover:bg-[#002469]/50"
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
                  <td className="px-4 py-2.5">
                    {b.cluster_name
                      ? <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-[#002469] border border-[#0F3B7E] text-slate-300">{b.cluster_name}</span>
                      : <span className="text-slate-600">—</span>}
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
