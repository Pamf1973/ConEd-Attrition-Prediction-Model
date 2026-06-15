const SEVERITY_CFG = {
  critical: { label: "Critical", color: "#E87722", bg: "bg-[#E87722]/10", border: "border-[#E87722]/30", text: "text-[#E87722]" },
  high:     { label: "High",     color: "#ff4444", bg: "bg-red-800/10",   border: "border-red-600/30",   text: "text-red-300" },
  medium:   { label: "Medium",   color: "#ffaa00", bg: "bg-amber-800/10", border: "border-amber-600/30",  text: "text-amber-300" },
  low:      { label: "Low",      color: "#00cc88", bg: "bg-emerald-800/10",border: "border-emerald-600/30",text: "text-emerald-300" },
};

export default function ProactiveAlertSummary({ summary, onSelectSeverity }) {
  if (!summary) return null;
  const bands = ["critical", "high", "medium", "low"];
  const total = bands.reduce((s, b) => s + (summary[b] ?? 0), 0);

  return (
    <div className="bg-[#001748] border border-[#082244] rounded-lg p-3">
      <div className="text-xs font-bold text-slate-400 mb-2 tracking-wide uppercase">
        Proactive Alert Summary
      </div>
      <div className="flex gap-3">
        {bands.map(b => {
          const cfg = SEVERITY_CFG[b];
          const count = summary[b] ?? 0;
          return (
            <button
              key={b}
              onClick={() => onSelectSeverity?.(b)}
              className={`flex-1 rounded border ${cfg.border} ${cfg.bg} px-2.5 py-2 text-center transition-colors hover:opacity-80`}
            >
              <div className={`text-lg font-bold ${cfg.text}`}>{count}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{cfg.label}</div>
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-600 mt-2 text-center">
        {total} total active alerts across portfolio
      </div>
    </div>
  );
}