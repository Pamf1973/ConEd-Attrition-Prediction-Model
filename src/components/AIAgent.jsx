import { useState, useRef } from "react";
import { queryBuildings, applyFilterSpec, summarizeResults, isExplainQuery, explainDashboard } from "../lib/groqFilter";
import { riskTier, signalMeta } from "../data/useBuildings";

const EXAMPLES_TECHNICAL = [
  { label: "How is the risk score calculated?",                           explain: true  },
  { label: "What is LL97 and how is the fine calculated?",               explain: true  },
  { label: "Explain the 5 building archetypes",                          explain: true  },
  { label: "What does peer score mean?",                                  explain: true  },
  { label: "How does the YoY scatter chart work?",                       explain: true  },
  { label: "High risk hotels with HVAC permits filed",                   explain: false },
  { label: "Office buildings over their LL97 limit with big steam drops",explain: false },
  { label: "Buildings facing more than $100k LL97 penalty in 2024",     explain: false },
];

const EXAMPLES_SIMPLE = [
  { label: "What is this dashboard and why does it exist?",              explain: true  },
  { label: "Explain attrition like I'm 5",                               explain: true  },
  { label: "What is steam heat in simple terms?",                        explain: true  },
  { label: "What does the risk score actually mean?",                    explain: true  },
  { label: "Explain LL97 simply",                                        explain: true  },
  { label: "What are the building archetypes in plain English?",         explain: true  },
  { label: "Why does a building get a high risk score?",                 explain: true  },
  { label: "What does it mean when a building churns?",                  explain: true  },
];

export default function AIAgent({ buildings, onSelect, selectedAddress, token }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState(null);
  const [explanation, setExplanation] = useState("");
  const [insight,     setInsight]     = useState("");
  const [explainAnswer, setExplainAnswer] = useState(null);
  const [mode,        setMode]        = useState("filter"); // "filter" | "explain"
  const [simpleMode,  setSimpleMode]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(q) {
    const question = q ?? query;
    if (!question.trim()) return;
    // Always clear both modes before starting — prevents stale state bleed
    setLoading(true);
    setError(null);
    setResults(null);
    setExplanation("");
    setInsight("");
    setExplainAnswer(null);
    setMode("filter");

    const explaining = isExplainQuery(question);
    setMode(explaining ? "explain" : "filter");

    try {
      if (explaining) {
        const prefixed = simpleMode ? `[SIMPLE MODE] ${question}` : question;
        const answer = await explainDashboard(prefixed, token);
        setExplainAnswer(answer);
      } else {
        const spec    = await queryBuildings(question, token);
        const matched = applyFilterSpec(buildings, spec);
        setResults(matched);
        setExplanation(spec.explanation ?? "");
        summarizeResults(question, matched, token).then(s => s && setInsight(s));
      }
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
    setInsight("");
    setExplainAnswer(null);
    setError(null);
    setMode("filter");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Query bar */}
      <div className="p-4 border-b border-[#082244] bg-[#001748]/60">
        {/* Mode toggle row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Explain mode:</span>
          <button
            onClick={() => setSimpleMode(false)}
            className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors border ${
              !simpleMode
                ? "bg-[#0041A8] border-[#0041A8] text-white"
                : "border-[#0F3B7E] text-slate-500 hover:text-slate-300"
            }`}
          >
            🎓 Technical
          </button>
          <button
            onClick={() => setSimpleMode(true)}
            className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors border ${
              simpleMode
                ? "bg-[#E87722] border-[#E87722] text-white"
                : "border-[#0F3B7E] text-slate-500 hover:text-slate-300"
            }`}
          >
            🧒 Simple / ELI5
          </button>
          {simpleMode && (
            <span className="text-[10px] text-[#E87722] italic">
              — explanations will use plain language and analogies
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder={simpleMode ? "Ask anything — I'll explain it simply…" : "Ask about the portfolio or how the dashboard works…"}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-[#002469] border border-[#0F3B7E] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#E87722]/60 transition-colors"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-lg bg-orange-500/20 border border-[#E87722]/40 text-[#F09040] text-sm font-semibold hover:bg-[#E87722]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "…" : "Ask"}
          </button>
          {(results !== null || explainAnswer) && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 rounded-lg border border-[#0F3B7E] text-slate-400 text-sm hover:bg-[#002469] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Example queries */}
        {results === null && !explainAnswer && !loading && (
          <div className="mt-3">
            <div className="text-[10px] text-slate-600 mb-1.5 uppercase tracking-wider">
              {simpleMode ? "🧒 Simple questions — click to ask" : "💡 Explain · 🔍 Filter"}
            </div>
            <div className="flex flex-wrap gap-2">
              {(simpleMode ? EXAMPLES_SIMPLE : EXAMPLES_TECHNICAL).map(ex => (
                <button
                  key={ex.label}
                  onClick={() => handleExample(ex.label)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    simpleMode
                      ? "border-[#E87722]/30 text-[#E87722]/70 hover:border-[#E87722] hover:text-[#E87722]"
                      : ex.explain
                        ? "border-[#0F3B7E] text-[#7AAAD0] hover:border-[#E87722]/40 hover:text-[#F09040]"
                        : "border-[#082244] text-slate-500 hover:border-[#0F3B7E] hover:text-slate-300"
                  }`}
                >
                  {simpleMode ? "🧒 " : ex.explain ? "💡 " : "🔍 "}{ex.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm gap-3">
            <div className="w-4 h-4 border-2 border-[#E87722]/40 border-t-orange-400 rounded-full animate-spin" />
            Thinking…
          </div>
        )}

        {error && (
          <div className="m-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Explain answer — prose response */}
        {explainAnswer && !loading && (
          <div className="m-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#E87722] font-bold text-xs tracking-widest uppercase">⚡ Dashboard Intelligence</span>
              <div className="flex-1 h-px bg-[#082244]" />
              <button
                onClick={handleClear}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="bg-[#001748] border border-[#0F3B7E] rounded-xl p-5">
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {explainAnswer}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[10px] text-slate-600">Follow-up:</span>
              {(simpleMode ? [
                "Explain attrition like I'm 5",
                "Why would a building leave ConEd?",
                "What happens if a building has a high risk score?",
                "Explain LL97 simply",
                "What are the 5 archetypes in plain English?",
              ] : [
                "How is the risk score calculated?",
                "What are the 5 archetypes?",
                "How is the LL97 fine calculated?",
                "What does EUI mean?",
                "Explain the YoY scatter chart",
              ]).map(q => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); handleSubmit(q); }}
                  className="px-2 py-0.5 text-[10px] rounded-full border border-[#082244] text-slate-600 hover:border-[#0F3B7E] hover:text-slate-400 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {results !== null && !loading && (
          <>
            {/* Explanation + count */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-400 italic">{explanation}</p>
              <span className="text-xs text-slate-500 shrink-0">{results.length} buildings</span>
            </div>

            {/* NL insight */}
            {insight ? (
              <div className="mx-4 mb-3 px-4 py-2.5 rounded-lg bg-orange-950/40 border border-orange-800/30 text-sm text-[#F5B070]">
                <span className="text-[#E87722] font-semibold mr-2">⚡ Insight:</span>
                {insight}
              </div>
            ) : results.length > 0 && (
              <div className="mx-4 mb-3 px-4 py-2 rounded-lg bg-[#002469]/40 border border-[#0F3B7E]/30 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3 h-3 border border-[#E87722]/40 border-t-orange-400 rounded-full animate-spin shrink-0" />
                Generating insight…
              </div>
            )}

            {results.length === 0 && (
              <div className="text-center text-slate-500 py-16 text-sm">
                No buildings match that query
              </div>
            )}

            {/* Results table */}
            {results.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-[#001748] z-10">
                  <tr>
                    {["Address", "Attrition Score", "LL97 Penalty", "Steam (M kBtu)", "Signal", "DOB Jobs"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">
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
                          {b.dob_jobs ? <span className="px-2 py-0.5 rounded bg-[#0041A8] text-xs">{b.dob_jobs}</span> : "—"}
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
        {results === null && !explainAnswer && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
            <div className="text-4xl mb-4 opacity-20">⚡</div>
            {simpleMode ? (
              <>
                <p className="text-[#E87722]/70 text-sm mb-1 font-medium">Simple Mode — ask anything, no jargon</p>
                <p className="text-slate-600 text-xs">Try: "What is this dashboard?" or "Explain attrition like I'm 5"</p>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-1">Ask anything — filter buildings or ask how the dashboard works</p>
                <p className="text-slate-600 text-xs">💡 Explain mode · 🔍 Filter mode · powered by Groq / Claude Haiku</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
