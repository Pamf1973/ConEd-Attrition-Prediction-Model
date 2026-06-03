import { useState, useRef } from "react";
import { queryBuildings, applyFilterSpec } from "../lib/groqFilter";
import { riskTier, signalMeta } from "../data/useBuildings";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const EXAMPLES = [
  "High risk hotels with HVAC permits filed",
  "Office buildings over their LL97 limit with big steam drops",
  "Pre-war multifamily buildings with peer score above 50%",
  "Buildings facing more than $100k LL97 penalty in 2024",
  "Large commercial buildings sorted by LL97 penalty",
];

export default function AIAgent({ buildings, onSelect, selectedAddress }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(q) {
    const question = q ?? query;
    if (!question.trim()) return;
    if (!API_KEY) {
      setError("VITE_GROQ_API_KEY not set — add it to .env and restart the dev server.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setExplanation("");

    try {
      const spec    = await queryBuildings(question, API_KEY);
      const matched = applyFilterSpec(buildings, spec);
      setResults(matched);
      setExplanation(spec.explanation ?? "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExample(ex) {
    setQuery(ex);
    handleSubmit(ex);
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setExplanation("");
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Query bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Ask about the steam portfolio… e.g. high risk hotels with HVAC permits"
            className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold hover:bg-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "…" : "Ask"}
          </button>
          {results !== null && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Example queries */}
        {results === null && !loading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => handleExample(ex)}
                className="px-2.5 py-1 text-xs rounded-full border border-slate-700 text-slate-400 hover:border-orange-500/40 hover:text-orange-300 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm gap-3">
            <div className="w-4 h-4 border-2 border-orange-500/40 border-t-orange-400 rounded-full animate-spin" />
            Asking Llama 3.3…
          </div>
        )}

        {error && (
          <div className="m-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        {results !== null && !loading && (
          <>
            {/* Explanation + count */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-400 italic">{explanation}</p>
              <span className="text-xs text-slate-500 shrink-0">{results.length} buildings</span>
            </div>

            {results.length === 0 && (
              <div className="text-center text-slate-500 py-16 text-sm">
                No buildings match that query
              </div>
            )}

            {/* Results table */}
            {results.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr>
                    {["Address", "Attrition Score", "LL97 Penalty", "Steam (M kBtu)", "Signal", "DOB Jobs"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((b, i) => {
                    const tier   = riskTier(b.risk);
                    const sig    = signalMeta(b.signal);
                    const active = b.address === selectedAddress;
                    return (
                      <tr
                        key={b.address + i}
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
                        <td className="px-4 py-2.5 text-slate-400 text-center">
                          {b.dob_jobs ? <span className="px-2 py-0.5 rounded bg-slate-700 text-xs">{b.dob_jobs}</span> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Empty state */}
        {results === null && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
            <div className="text-4xl mb-4 opacity-20">⚡</div>
            <p className="text-slate-400 text-sm mb-1">Ask anything about the steam portfolio</p>
            <p className="text-slate-600 text-xs">Powered by Llama 3.3 70B via Groq</p>
          </div>
        )}
      </div>
    </div>
  );
}
