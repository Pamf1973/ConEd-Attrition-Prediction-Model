const BUTTONS = [
  {
    label: "🔴 High Risk",
    apply: () => ({ tierFilter: "High",    signalFilter: "All",      ll97Filter: "All"        }),
  },
  {
    label: "📉 Big Drop",
    apply: () => ({ tierFilter: "All",     signalFilter: "Big Drop", ll97Filter: "All"        }),
  },
  {
    label: "⚠️ LL97 Over Limit",
    apply: () => ({ tierFilter: "All",     signalFilter: "All",      ll97Filter: "Over Limit" }),
  },
  {
    label: "🔴📉 Critical + Signal",
    apply: () => ({ tierFilter: "High",    signalFilter: "Big Drop", ll97Filter: "All"        }),
  },
  {
    label: "🏢 Large Buildings",
    apply: () => ({ tierFilter: "All",     signalFilter: "All",      ll97Filter: "All",  demandMin: "50" }),
  },
  {
    label: "Clear",
    apply: () => ({ tierFilter: "All",     signalFilter: "All",      ll97Filter: "All",  demandMin: "" }),
    clear: true,
  },
];

export default function QuickFilters({ onApply }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#082244] bg-[#001020]/60 shrink-0 flex-wrap">
      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mr-1">Quick</span>
      {BUTTONS.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onApply(btn.apply())}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
            btn.clear
              ? "border-slate-700/40 text-slate-600 hover:text-slate-400 hover:border-slate-500/60"
              : "border-[#0F3B7E]/60 text-slate-400 hover:text-slate-100 hover:bg-[#002469] hover:border-[#0041A8]"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
