import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

const CLUSTER_COLORS = {
  "Pre-War Active — Permit-Driven Churn":       "#ef4444",
  "Mid-Size Post-War — Moderate Signal":         "#f97316",
  "Pre-War Stable — Low Signal":                 "#22c55e",
  "Large Commercial — Capital Mobilized":        "#3b82f6",
  "Low-Compliance Commercial — Quiet Attrition":  "#a855f7",
  "Unknown": "#64748b",
};

function CustomDot(props) {
  const { cx, cy, payload } = props;
  const isOutlier = payload.outlier_22_23 || payload.outlier_23_24;
  const color = CLUSTER_COLORS[payload.cluster_name] ?? CLUSTER_COLORS.Unknown;
  return (
    <circle
      cx={cx} cy={cy}
      r={isOutlier ? 6 : 3}
      fill={isOutlier ? "#fbbf24" : color}
      stroke={isOutlier ? "#d97706" : color}
      strokeWidth={isOutlier ? 1.5 : 0}
      opacity={isOutlier ? 1 : 0.6}
    />
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const b = payload[0]?.payload;
  if (!b) return null;
  return (
    <div className="bg-[#001748] border border-[#0F3B7E] rounded p-3 text-xs max-w-xs shadow-xl">
      <div className="font-semibold text-slate-100 mb-1">{b.address}</div>
      <div className="text-slate-400">{b.cluster_name ?? "—"}</div>
      <div className="mt-1.5 space-y-0.5">
        <div>
          <span className="text-slate-500">22→23 Δ: </span>
          <span className={b.norm_delta_22_23 < -10 ? "text-red-400" : "text-slate-200"}>
            {b.norm_delta_22_23 != null ? `${b.norm_delta_22_23 > 0 ? "+" : ""}${b.norm_delta_22_23.toFixed(1)}%` : "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-500">23→24 Δ: </span>
          <span className={b.norm_delta_23_24 < -10 ? "text-red-400" : "text-slate-200"}>
            {b.norm_delta_23_24 != null ? `${b.norm_delta_23_24 > 0 ? "+" : ""}${b.norm_delta_23_24.toFixed(1)}%` : "—"}
          </span>
          {b.hdd_2024_provisional && (
            <span className="ml-1 text-yellow-500 opacity-75">*prov.</span>
          )}
        </div>
        {(b.outlier_22_23 || b.outlier_23_24) && (
          <div className="text-yellow-400 font-semibold mt-1">⚠ Statistical outlier</div>
        )}
      </div>
    </div>
  );
}

export default function YoYScatter({ buildings }) {
  // Include both real both-delta buildings AND projected ones (cluster-median imputed)
  const bothPeriods = buildings.filter(
    b => b.norm_delta_22_23 != null && b.norm_delta_23_24 != null
  );

  // Cap display range so extreme outliers don't crush the main cluster
  const CAP = 150;
  const data = bothPeriods.map(b => ({
    ...b,
    x: Math.max(-CAP, Math.min(CAP, b.norm_delta_22_23)),
    y: Math.max(-CAP, Math.min(CAP, b.norm_delta_23_24)),
  }));

  const projectedCount = data.filter(b => b.norm_delta_23_24_projected).length;
  const outlierCount = data.filter(b => b.outlier_22_23 || b.outlier_23_24).length;

  // Group by cluster for separate Scatter series (Legend)
  const byCluster = {};
  for (const b of data) {
    const key = b.cluster_name ?? "Unknown";
    (byCluster[key] ??= []).push(b);
  }

  return (
    <div className="bg-[#001748] border border-[#082244] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-slate-100 font-semibold text-sm">
            Steam Consumption Δ — Year over Year
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            HDD-normalized · {data.length} buildings with both periods ·{" "}
            <span className="text-yellow-400">{outlierCount} outliers (IQR 1.5×)</span>
          </p>
        </div>
        <div className="text-[10px] text-yellow-600 bg-yellow-950 border border-yellow-900 rounded px-2 py-1">
          2024 HDD provisional
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#082244" />
          <XAxis
            type="number" dataKey="x"
            domain={[-CAP, CAP]}
            tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`}
            tick={{ fill: "#4A7AAA", fontSize: 11 }}
            label={{ value: "2022→2023 Δ (norm %)", position: "insideBottom", offset: -12, fill: "#4A7AAA", fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y"
            domain={[-CAP, CAP]}
            tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`}
            tick={{ fill: "#4A7AAA", fontSize: 11 }}
            label={{ value: "2023→2024 Δ (norm %)", angle: -90, position: "insideLeft", offset: 12, fill: "#4A7AAA", fontSize: 11 }}
          />
          <ReferenceLine x={0} stroke="#0F3B7E" strokeWidth={1} />
          <ReferenceLine y={0} stroke="#0F3B7E" strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={v => <span style={{ color: CLUSTER_COLORS[v] ?? "#94a3b8" }}>{v}</span>}
          />
          {Object.entries(byCluster).map(([clusterName, pts]) => (
            <Scatter
              key={clusterName}
              name={clusterName}
              data={pts}
              shape={<CustomDot />}
              fill={CLUSTER_COLORS[clusterName] ?? CLUSTER_COLORS.Unknown}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      <p className="text-slate-600 text-[10px] mt-2">
        Bottom-left quadrant = sustained decline both periods (highest attrition signal).
        Yellow dots = IQR outliers. Display capped at ±{CAP}%.
      </p>
    </div>
  );
}
