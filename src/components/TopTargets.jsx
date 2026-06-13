import { useMemo } from "react";
import { riskTier } from "../data/useBuildings";

export default function TopTargets({ buildings, onSelect, token: _token }) {
  const top25 = useMemo(() => {
    return [...buildings]
      .filter(b => b.ll97_penalty_2030 != null)
      .sort((a, b) => (b.ll97_penalty_2030 ?? 0) - (a.ll97_penalty_2030 ?? 0))
      .slice(0, 25);
  }, [buildings]);

  function fmtPenalty(v) {
    if (v == null) return "—";
    if (v <= 0) return <span className="text-green-600 text-xs">✓</span>;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
    return `$${v}`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#082244] bg-[#001748] shrink-0">
        <h2 className="text-sm font-semibold text-slate-200">
          Top 25 Buildings by 2030 LL97 Exposure
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ranked by projected 2030 LL97 penalty — highest dollar exposure first
        </p>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#001748] z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Use Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">2024 Penalty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">2030 Penalty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">Risk %</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Cluster</th>
            </tr>
          </thead>
          <tbody>
            {top25.map((b, i) => {
              const tier = riskTier(b.risk);
              return (
                <tr
                  key={`${b.address}_${i}`}
                  onClick={() => onSelect(b.address)}
                  className={`border-b border-[#082244]/60 cursor-pointer transition-colors ${
                    i % 2 === 0
                      ? "bg-[#001748]/30 hover:bg-[#002469]/50"
                      : "hover:bg-[#002469]/50"
                  }`}
                >
                  <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">{b.address}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[160px] truncate">{b.use ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap">
                    {fmtPenalty(b.ll97_penalty_2024)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-[#E87722]">
                    {fmtPenalty(b.ll97_penalty_2030)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span
                      className="text-xs font-bold"
                      style={{ color: tier.color }}
                    >
                      {Number.isFinite(b.risk) ? Math.round(b.risk * 100) + "%" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[200px] truncate">
                    {b.cluster_name ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {top25.length === 0 && (
          <div className="text-center text-slate-500 py-16">No buildings with 2030 LL97 data</div>
        )}
      </div>
    </div>
  );
}
