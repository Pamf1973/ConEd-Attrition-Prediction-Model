import { useState } from "react";
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

const DIAG_COLORS = {
  High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e", Uncertain: "#9ca3af",
};
const TREND_COLORS = {
  accelerating: "#ef4444", decelerating: "#22c55e", stable: "#64748b",
};

function dotColor(payload, colorMode) {
  if (colorMode === "diagnostic") return DIAG_COLORS[payload.diagnostic_risk] ?? "#64748b";
  if (colorMode === "trend")      return TREND_COLORS[payload.decline_trend_label] ?? TREND_COLORS.stable;
  return CLUSTER_COLORS[payload.cluster_name] ?? CLUSTER_COLORS.Unknown;
}

function CustomDot(props) {
  const { cx, cy, payload, colorMode } = props;
  const isOutlier = payload.outlier_22_23 || payload.outlier_23_24;
  const color = dotColor(payload, colorMode);
  return (
    <circle
      cx={cx} cy={cy}
      r={isOutlier ? 6 : 3}
      fill={isOutlier && colorMode === "cluster" ? "#fbbf24" : color}
      stroke={isOutlier && colorMode === "cluster" ? "#d97706" : color}
      strokeWidth={isOutlier && colorMode === "cluster" ? 1.5 : 0}
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

const COLOR_MODES = [
  { id: "cluster",    label: "ML Cluster" },
  { id: "diagnostic", label: "Diagnostic Tier" },
  { id: "trend",      label: "Decline Trend" },
];

export default function YoYScatter({ buildings, onFilterCluster, onSelectBuilding }) {
  const [colorMode, setColorMode] = useState("cluster");

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

  const outlierCount = data.filter(b => b.outlier_22_23 || b.outlier_23_24).length;

  // Group by cluster for separate Scatter series (Legend)
  const byCluster = {};
  for (const b of data) {
    const key = b.cluster_name ?? "Unknown";
    (byCluster[key] ??= []).push(b);
  }

  return (
    <div className="bg-[#001748] border border-[#082244] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="text-slate-100 font-semibold text-sm">
            Steam Consumption Δ — Year over Year
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            HDD-normalized · {data.length} buildings with both periods ·{" "}
            <span className="text-yellow-400">{outlierCount} outliers (IQR 1.5×)</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Color-by toggle */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 mr-1">Color by:</span>
            {COLOR_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setColorMode(m.id)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  colorMode === m.id
                    ? "border-[#E87722] text-[#E87722] bg-[#002469]"
                    : "border-[#0F3B7E] text-slate-500 hover:text-slate-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-yellow-600 bg-yellow-950 border border-yellow-900 rounded px-2 py-1">
            2024 HDD provisional
          </div>
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
          {colorMode === "cluster" && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => {
                const color = CLUSTER_COLORS[v] ?? "#94a3b8";
                return (
                  <span
                    style={{ color, cursor: onFilterCluster ? "pointer" : "default" }}
                    onClick={() => onFilterCluster?.(v)}
                    title={onFilterCluster ? `Filter by ${v}` : v}
                  >
                    {v}
                  </span>
                );
              }}
            />
          )}
          {Object.entries(byCluster).map(([clusterName, pts]) => (
            <Scatter
              key={clusterName}
              name={clusterName}
              data={pts}
              shape={<CustomDot colorMode={colorMode} />}
              fill={CLUSTER_COLORS[clusterName] ?? CLUSTER_COLORS.Unknown}
              onClick={(pointData) => {
                if (pointData?.payload) {
                  onSelectBuilding?.(pointData.payload);
                }
              }}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Static legend for non-cluster color modes */}
      {colorMode === "diagnostic" && (
        <div className="flex gap-3 mt-2 flex-wrap">
          {Object.entries(DIAG_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}
      {colorMode === "trend" && (
        <div className="flex gap-3 mt-2 flex-wrap">
          {Object.entries(TREND_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-slate-600 text-[10px] mt-2">
        Bottom-left quadrant = sustained decline both periods (highest attrition signal).
        {colorMode === "cluster" && " Yellow dots = IQR outliers."} Display capped at ±{CAP}%.
      </p>
    </div>
  );
}
