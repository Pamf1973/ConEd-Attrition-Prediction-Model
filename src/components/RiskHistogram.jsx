import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

function buildBins(buildings) {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 10}%`,
    min: i / 10,
    max: (i + 1) / 10,
    count: 0,
    high: 0,
    medium: 0,
    low: 0,
  }));

  for (const b of buildings) {
    if (!Number.isFinite(b.risk)) continue;
    const idx = Math.min(9, Math.floor(b.risk * 10));
    bins[idx].count++;
    if (b.risk > 0.7)      bins[idx].high++;
    else if (b.risk > 0.4) bins[idx].medium++;
    else                   bins[idx].low++;
  }
  return bins;
}

function binColor(bin) {
  if (bin.min >= 0.7) return "#ef4444";
  if (bin.min >= 0.4) return "#f97316";
  return "#22c55e";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-[#001748] border border-[#0F3B7E] rounded p-3 text-xs shadow-xl">
      <div className="font-semibold text-slate-200 mb-1">{label}</div>
      <div className="text-slate-400">{d.count} buildings</div>
      {d.high > 0   && <div className="text-red-400">High risk: {d.high}</div>}
      {d.medium > 0 && <div className="text-[#E87722]">Medium: {d.medium}</div>}
      {d.low > 0    && <div className="text-green-400">Low: {d.low}</div>}
    </div>
  );
}

export default function RiskHistogram({ buildings, onFilterByRisk }) {
  const scored = buildings.filter(b => Number.isFinite(b.risk) && b.risk != null);
  const bins   = buildBins(scored);

  const high   = scored.filter(b => b.risk > 0.7).length;
  const medium = scored.filter(b => b.risk > 0.4 && b.risk <= 0.7).length;
  const low    = scored.filter(b => b.risk <= 0.4).length;

  return (
    <div className="bg-[#001748] border border-[#082244] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-slate-100 font-semibold text-sm">Composite Risk Distribution</h3>
          <p className="text-slate-500 text-xs mt-0.5">{scored.length} buildings scored</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-red-400"><span className="font-bold">{high}</span> High</span>
          <span className="text-[#E87722]"><span className="font-bold">{medium}</span> Medium</span>
          <span className="text-green-400"><span className="font-bold">{low}</span> Low</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={bins}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          style={onFilterByRisk ? { cursor: "pointer" } : undefined}
          onClick={onFilterByRisk ? (data) => {
            const bin = data?.activePayload?.[0]?.payload;
            if (bin) onFilterByRisk(bin.min, bin.max);
          } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false} tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b" }} />
          <ReferenceLine x="40–50%" stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine x="70–80%" stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} cursor={onFilterByRisk ? "pointer" : "default"}>
            {bins.map((bin, i) => (
              <Cell
                key={i}
                fill={binColor(bin)}
                opacity={0.8}
                onClick={onFilterByRisk ? () => onFilterByRisk(bin.min, bin.max) : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-slate-600 text-[10px] mt-1">
        Dashed lines at 40% (Medium threshold) and 70% (High threshold)
      </p>
    </div>
  );
}
