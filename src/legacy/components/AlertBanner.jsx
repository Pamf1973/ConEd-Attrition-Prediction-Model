const SEVERITY_CONFIG = {
  critical: { bg: "bg-[#E87722]/15", border: "border-[#E87722]/40", icon: "🔴", text: "text-[#E87722]" },
  high:     { bg: "bg-red-800/20",   border: "border-red-600/40", icon: "🟠", text: "text-red-300" },
  medium:   { bg: "bg-amber-800/20", border: "border-amber-600/40", icon: "🟡", text: "text-amber-300" },
  low:      { bg: "bg-emerald-900/20", border: "border-emerald-700/40", icon: "🔵", text: "text-emerald-300" },
};

export default function AlertBanner({ alerts, onDismiss }) {
  // Find the single most critical undismissed alert
  const active = (alerts ?? []).filter(a => !a.dismissed);
  if (active.length === 0) return null;

  // Pick highest severity (critical > high > medium > low), then most recent
  const SEV_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
  const top = active.reduce((a, b) => {
    const sa = SEV_ORDER[a.severity] ?? 0;
    const sb = SEV_ORDER[b.severity] ?? 0;
    if (sa !== sb) return sa > sb ? a : b;
    return new Date(a.timestamp) > new Date(b.timestamp) ? a : b;
  });

  const cfg = SEVERITY_CONFIG[top.severity] ?? SEVERITY_CONFIG.low;

  return (
    <div className={`flex items-center gap-3 px-5 py-2 border-b ${cfg.bg} ${cfg.border}`}>
      <span className="text-sm">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${cfg.text} truncate`}>
          {top.message}
        </p>
        {top.recommendation && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{top.recommendation}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss?.(top.id)}
        className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-[#0F3B7E]/50 transition-colors border border-[#0F3B7E]/30"
        title="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}