#!/usr/bin/env python3
"""
Year-over-year steam consumption delta + outlier analysis.
Uses NOAA-derived HDD/CDD normalization factors.

Reads:  public/yearly.json              (steam_2022 / 2023 / 2024 per address)
        public/noaa_degree_days.json    (HDD/CDD factors from NOAA)
Writes: public/yoy_deltas.json          (per-building deltas, normalized deltas, outlier flags)
        public/yoy_summary.json         (population statistics, outlier counts)

HDD normalization factors from NOAA Central Park station:
  normalized = actual × (normal_HDD / actual_HDD)
  where normal_HDD = 30-year average (1991-2020)

Run:    /opt/homebrew/bin/python3.13 yoy_analysis.py
        /opt/homebrew/bin/python3.13 yoy_analysis.py --noaa-path public/noaa_degree_days.json
"""

import json, os, statistics, argparse
from pathlib import Path

YEARLY_JSON   = "public/yearly.json"
OUT_DELTAS    = "public/yoy_deltas.json"
OUT_SUMMARY   = "public/yoy_summary.json"
NOAA_JSON     = "public/noaa_degree_days.json"


def load_noaa_factors(noaa_path):
    """
    Load HDD and CDD factors from NOAA degree days JSON.
    Returns: (hdd_factors dict, cdd_factors dict, is_2024_provisional bool)
    """
    with open(noaa_path) as f:
        noaa = json.load(f)

    normal_hdd = noaa["normal_annual"]["hdd"]
    normal_cdd = noaa["normal_annual"]["cdd"]

    hdd_factors = {}
    cdd_factors = {}
    is_2024_provisional = False

    for year_str, year_data in noaa["years"].items():
        year = int(year_str)
        actual_hdd = year_data["annual_hdd"]
        actual_cdd = year_data["annual_cdd"]

        hdd_factors[year] = round(normal_hdd / actual_hdd, 4) if actual_hdd > 0 else 1.0
        cdd_factors[year] = round(normal_cdd / actual_cdd, 4) if actual_cdd > 0 else 1.0

        # Check if the year data is marked as complete
        if not year_data.get("complete_year", True):
            if year == 2024:
                is_2024_provisional = True
            elif year == 2025:
                pass  # partial year is expected

    return hdd_factors, cdd_factors, is_2024_provisional


def normalize_steam(raw_steam, year, hdd_factors, cdd_factors):
    """
    Apply HDD normalization: normalized = raw × (normal_HDD / actual_HDD)
    If no factor, return raw value.
    """
    if raw_steam is None:
        return None
    f = hdd_factors.get(year)
    if f is None:
        return raw_steam
    return raw_steam * f


def pct_change(old, new):
    if old is None or new is None or old == 0:
        return None
    return round((new - old) / old * 100, 2)


def main():
    parser = argparse.ArgumentParser(description="YoY steam consumption analysis with NOAA normalization")
    parser.add_argument("--noaa-path", default=NOAA_JSON,
                        help=f"Path to NOAA degree days JSON (default: {NOAA_JSON})")
    args = parser.parse_args()

    # ── Load NOAA factors ─────────────────────────────────────────────────
    hdd_factors, cdd_factors, is_2024_provisional = load_noaa_factors(args.noaa_path)

    print("NOAA HDD normalization factors:")
    for yr in sorted(hdd_factors):
        cdd = cdd_factors.get(yr)
        prov = " (provisional)" if (yr == 2024 and is_2024_provisional) else ""
        print(f"  {yr}: HDD factor={hdd_factors[yr]}, CDD factor={cdd}{prov}")
    if is_2024_provisional:
        print("  NOTE: 2024 factor is provisional (no complete_year flag)")

    with open(YEARLY_JSON) as f:
        yearly = json.load(f)

    rows = []
    for addr, d in yearly.items():
        s22 = d.get("steam_2022")
        s23 = d.get("steam_2023")
        s24 = d.get("steam_2024")

        n22 = normalize_steam(s22, 2022, hdd_factors, cdd_factors)
        n23 = normalize_steam(s23, 2023, hdd_factors, cdd_factors)
        n24 = normalize_steam(s24, 2024, hdd_factors, cdd_factors)

        raw_delta_22_23   = pct_change(s22, s23)
        raw_delta_23_24   = pct_change(s23, s24)
        norm_delta_22_23  = pct_change(n22, n23)
        norm_delta_23_24  = pct_change(n23, n24)

        rows.append({
            "address":          addr,
            "steam_2022":       s22,
            "steam_2023":       s23,
            "steam_2024":       s24,
            "norm_2022":        round(n22, 2) if n22 is not None else None,
            "norm_2023":        round(n23, 2) if n23 is not None else None,
            "norm_2024":        round(n24, 2) if n24 is not None else None,
            "raw_delta_22_23":  raw_delta_22_23,
            "raw_delta_23_24":  raw_delta_23_24,
            "norm_delta_22_23": norm_delta_22_23,
            "norm_delta_23_24": norm_delta_23_24,
            "hdd_2024_provisional": is_2024_provisional,
        })

    # ── Population statistics + IQR outlier flagging (robust to skewed distribution) ──
    for period, col in [("22_23", "norm_delta_22_23"), ("23_24", "norm_delta_23_24")]:
        vals = [r[col] for r in rows if r[col] is not None]
        if not vals:
            continue
        vals_sorted = sorted(vals)
        n = len(vals_sorted)
        q1 = vals_sorted[n // 4]
        q3 = vals_sorted[3 * n // 4]
        iqr = q3 - q1
        fence_lo = q1 - 1.5 * iqr
        fence_hi = q3 + 1.5 * iqr

        for r in rows:
            v = r[col]
            r[f"outlier_{period}"] = (v < fence_lo or v > fence_hi) if v is not None else False

    # ── Write per-building output (keyed by address, same structure as yearly.json) ──
    out = {r["address"]: {k: v for k, v in r.items() if k != "address"} for r in rows}
    tmp = OUT_DELTAS + ".tmp"
    with open(tmp, "w") as f:
        json.dump(out, f, indent=2)
    os.replace(tmp, OUT_DELTAS)
    print(f"Wrote {OUT_DELTAS}  ({len(out)} buildings)")

    # ── Summary stats ─────────────────────────────────────────────────────────
    def period_stats(col, out_col):
        vals = [r[col] for r in rows if r[col] is not None]
        if not vals:
            return {}
        vals_s = sorted(vals)
        n = len(vals_s)
        return {
            "n":            n,
            "mean":         round(statistics.mean(vals), 2),
            "median":       round(statistics.median(vals), 2),
            "stdev":        round(statistics.stdev(vals), 2) if n > 1 else 0,
            "p10":          round(vals_s[n // 10], 2),
            "p90":          round(vals_s[9 * n // 10], 2),
            "outlier_count": sum(1 for r in rows if r.get(f"outlier_{out_col}")),
        }

    summary = {
        "hdd_factors": hdd_factors,
        "cdd_factors": cdd_factors,
        "hdd_2024_provisional": is_2024_provisional,
        "outlier_method": "IQR 1.5x",
        "period_22_23": period_stats("norm_delta_22_23", "22_23"),
        "period_23_24": period_stats("norm_delta_23_24", "23_24"),
    }
    with open(OUT_SUMMARY, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"Wrote {OUT_SUMMARY}")

    # ── Console report ────────────────────────────────────────────────────────
    for period_key, label in [("period_22_23", "2022→2023"), ("period_23_24", "2023→2024")]:
        s = summary[period_key]
        if not s:
            print(f"\n{label}: insufficient data")
            continue
        print(f"\n{label} (HDD-normalized where available):")
        print(f"  Buildings: {s['n']}  |  Mean Δ: {s['mean']:+.1f}%  |  Median Δ: {s['median']:+.1f}%")
        print(f"  Stdev: {s['stdev']:.1f}%  |  P10: {s['p10']:+.1f}%  |  P90: {s['p90']:+.1f}%")
        print(f"  Outliers (IQR 1.5×): {s['outlier_count']}")

    print("\nDone. Next: wire public/yoy_deltas.json into useBuildings.js and visualize.")


if __name__ == "__main__":
    main()
