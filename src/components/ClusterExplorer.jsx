import { useMemo } from "react";
import { riskTier } from "../data/useBuildings";

export default function ClusterExplorer({ buildings, onSelect }) {
  const clusterStats = useMemo(() => {
    // Group buildings by cluster_id (1-5)
    const groups = {};
    for (const b of buildings) {
      const cid = b.cluster_id;
      if (cid == null) continue;
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(b);
    }

    const result = [];
    for (let cid = 1; cid <= 5; cid++) {
      const group = groups[cid] ?? [];
      if (group.length === 0) continue;

      // Compute stats
      const avgSteam = group.reduce((s, b) => s + (b.steam ?? 0), 0) / group.length;
      const avgRisk  = group.reduce((s, b) => s + (b.risk ?? 0), 0) / group.length;

      // Top 3 use types by count
      const useCounts = {};
      for (const b of group) {
        const use = b.use || "Unknown";
        useCounts[use] = (useCounts[use] || 0) + 1;
      }
      const topUses = Object.entries(useCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([use]) => use);

      result.push({
        cluster_id: cid,
        cluster_name: group[0].cluster_name ?? `Cluster ${cid}`,
        cluster_risk: group[0].cluster_risk ?? null,
        buildings: group.length,
        avgSteam,
        avgRisk,
        topUses,
      });
    }

    // Sort by cluster_id
    result.sort((a, b) => a.cluster_id - b.cluster_id);
    return result;
  }, [buildings]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#082244] bg-[#001748] shrink-0">
        <h2 className="text-sm font-semibold text-slate-200">
          Building Archetypes — K-Means Clusters (K=5)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          All 5 clusters derived from steam demand, risk score, use type, and building characteristics
        </p>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#001748] z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Cluster Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Risk Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Buildings</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">Avg Steam (M kBtu)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244]">Top Uses</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#082244] whitespace-nowrap">Avg Risk</th>
            </tr>
          </thead>
          <tbody>
            {clusterStats.map((c, i) => {
              const tier = riskTier(c.avgRisk);
              return (
                <tr
                  key={c.cluster_id}
                  onClick={() => {
                    // Filter buildings by cluster and select first one — or pass cluster info
                    // Simple approach: set cluster filter via calling onSelect with a building
                    // For now, clicking a cluster does nothing special since we don't have cluster filter callback
                    // But onSelect opens the BuildingPanel for the first building in this cluster
                    const firstMatch = buildings.find(b => b.cluster_id === c.cluster_id);
                    if (firstMatch) onSelect(firstMatch);
                  }}
                  className={`border-b border-[#082244]/60 cursor-pointer transition-colors ${
                    i % 2 === 0
                      ? "bg-[#001748]/30 hover:bg-[#002469]/50"
                      : "hover:bg-[#002469]/50"
                  }`}
                >
                  <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">{c.cluster_name}</td>
                  <td className="px-4 py-2.5">
                    {c.cluster_risk != null ? (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ color: tier.color, background: tier.bg }}
                      >
                        {c.cluster_risk}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ color: tier.color, background: tier.bg }}
                      >
                        {tier.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 font-semibold">{c.buildings.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate-300 font-mono">
                    {c.avgSteam > 0
                      ? (c.avgSteam / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[240px]">
                    <div className="flex flex-wrap gap-1">
                      {c.topUses.map(u => (
                        <span key={u} className="px-1.5 py-0.5 rounded bg-[#002469] border border-[#0F3B7E]/40 text-slate-400">
                          {u}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="text-xs font-bold" style={{ color: tier.color }}>
                      {Number.isFinite(c.avgRisk) ? Math.round(c.avgRisk * 100) + "%" : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clusterStats.length === 0 && (
          <div className="text-center text-slate-500 py-16">No cluster data available</div>
        )}
      </div>
    </div>
  );
}