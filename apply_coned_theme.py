#!/usr/bin/env python3
"""
Apply ConEd brand color theme to the dashboard.

ConEd palette (from official branding):
  Primary navy (deepest bg)  : #030D1A
  Surface (header/cards)     : #001748
  Elevated (inputs/panels)   : #002469
  Active/selected            : #0041A8
  Border dark                : #082244
  Border light               : #0F3B7E
  Brand orange               : #E87722
"""
import re, os, sys

FILES = [
    "src/App.jsx",
    "src/index.css",
    "src/components/AIAgent.jsx",
    "src/components/BuildingPanel.jsx",
    "src/components/ErrorBoundary.jsx",
    "src/components/Login.jsx",
    "src/components/RiskHistogram.jsx",
    "src/components/RiskTable.jsx",
    "src/components/Watchlist.jsx",
    "src/components/YoYScatter.jsx",
]

# Order matters: longer/more-specific patterns before shorter ones
REPLACEMENTS = [
    # ── Backgrounds (opacity variants first) ────────────────────────────────
    ("bg-slate-950/60",  "bg-[#030D1A]/60"),
    ("bg-slate-950",     "bg-[#030D1A]"),
    ("bg-slate-900/60",  "bg-[#001748]/60"),
    ("bg-slate-900/50",  "bg-[#001748]/50"),
    ("bg-slate-900/30",  "bg-[#001748]/30"),
    ("bg-slate-900",     "bg-[#001748]"),
    ("bg-slate-800/50",  "bg-[#002469]/50"),
    ("bg-slate-800/40",  "bg-[#002469]/40"),
    ("bg-slate-800",     "bg-[#002469]"),
    ("bg-slate-700/50",  "bg-[#0041A8]/50"),
    ("bg-slate-700",     "bg-[#0041A8]"),

    # ── Hover backgrounds ────────────────────────────────────────────────────
    ("hover:bg-slate-800/50",  "hover:bg-[#002469]/50"),
    ("hover:bg-slate-800",     "hover:bg-[#002469]"),
    ("hover:bg-slate-700",     "hover:bg-[#0041A8]"),

    # ── Borders (opacity variants first) ────────────────────────────────────
    ("border-slate-800/80",  "border-[#082244]/80"),
    ("border-slate-800/60",  "border-[#082244]/60"),
    ("border-slate-800/40",  "border-[#082244]/40"),
    ("border-slate-800",     "border-[#082244]"),
    ("border-slate-700",     "border-[#0F3B7E]"),
    ("border-slate-500",     "border-[#2A6FBF]"),

    # ── Focus borders ────────────────────────────────────────────────────────
    ("focus:border-slate-500",  "focus:border-[#2A6FBF]"),

    # ── Hover borders ────────────────────────────────────────────────────────
    ("hover:border-slate-600",  "hover:border-[#1A5AAA]"),

    # ── Dividers ─────────────────────────────────────────────────────────────
    ("bg-slate-700 mx",  "bg-[#0F3B7E] mx"),   # the vertical px divider in header

    # ── Brand accent: ConEd orange ────────────────────────────────────────────
    ("text-orange-400",       "text-[#E87722]"),
    ("text-orange-500",       "text-[#E87722]"),   # AI agent prompt color
    ("hover:text-orange-300", "hover:text-[#F09040]"),
    ("text-orange-300",       "text-[#F09040]"),
    ("text-orange-200",       "text-[#F5B070]"),

    # ── Login gradient: update to ConEd brand ────────────────────────────────
    ("from-orange-500",  "from-[#E87722]"),
    ("from-orange-400",  "from-[#E87722]"),
    ("to-amber-600",     "to-[#003087]"),
    ("to-amber-500",     "to-[#003087]"),

    # ── Login violet accent → ConEd blue accent ───────────────────────────────
    ("bg-violet-600/10",  "bg-[#003087]/20"),

    # ── AI agent orange border accents (keep distinguishable) ─────────────────
    ("border-orange-500/40",        "border-[#E87722]/40"),
    ("hover:border-orange-500/40",  "hover:border-[#E87722]/40"),
    ("focus:border-orange-500/60",  "focus:border-[#E87722]/60"),
    ("ring-orange-500/40",          "ring-[#E87722]/40"),
    ("ring-orange-500/20",          "ring-[#E87722]/20"),
    ("hover:bg-orange-500/30",      "hover:bg-[#E87722]/30"),
]

BASE = os.path.dirname(__file__)
changed = 0

for rel in FILES:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {rel}")
        continue
    with open(path) as f:
        src = f.read()
    result = src
    for old, new in REPLACEMENTS:
        result = result.replace(old, new)
    if result != src:
        with open(path, "w") as f:
            f.write(result)
        diffs = sum(1 for o, n in REPLACEMENTS if o in src)
        print(f"  ✓ {rel}  ({diffs} pattern hits)")
        changed += 1
    else:
        print(f"  · {rel}  (no changes)")

print(f"\nDone — {changed} files updated.")
