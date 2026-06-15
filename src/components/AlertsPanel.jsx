const SEVERITY_META = {
  critical: { icon: "🔴", label: "Critical", bg: "bg-[#E87722]/10", border: "border-[#E87722]/30", text: "text-[#E87722]" },
  high:     { icon: "🟠", label: "High",     bg: "bg-red-800/10",   border: "border-red-600/30",   text: "text-red-300" },
  medium:   { icon: "🟡", label: "Medium",   bg: "bg-amber-800/10", border: "border-amber-600/30",  text: "text-amber-300" },
  low:      { icon: "🔵", label: "Low",      bg: "bg-emerald-800/10",border: "border-emerald-600/30",text: "text-emerald-300" },
};

function formatTime(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// Pure list — no modal/backdrop. App.jsx owns the overlay and header.
export default function AlertsPanel({ alerts, onDismiss }) {
  const active = (alerts ?? []).filter(a => !a.dismissed);

  if (active.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">No active alerts</div>
    );
  }

  const SEV_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...active].sort((a, b) => {
    const sa = SEV_ORDER[a.severity] ?? 0;
    const sb = SEV_ORDER[b.severity] ?? 0;
    if (sa !== sb) return sb - sa;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="px-4 py-3 space-y-2">
      {sorted.map(alert => {
        const meta = SEVERITY_META[alert.severity] ?? SEVERITY_META.low;
        return (
          <div key={alert.id} className={`rounded border ${meta.border} ${meta.bg} p-3`}>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5 shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${meta.text}`}>{alert.message}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{formatTime(alert.timestamp)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{alert.detail}</p>
                {alert.recommendation && (
                  <p className="text-[11px] text-[#E87722]/80 mt-1 italic">{alert.recommendation}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss?.(alert.id)}
                className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-200 hover:bg-[#0F3B7E]/50 transition-colors border border-[#0F3B7E]/30"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
