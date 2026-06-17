#!/usr/bin/env python3
"""
Decline trend acceleration analysis.

Computes second-difference acceleration from YoY normalized deltas:
  acceleration = norm_delta_23_24 − norm_delta_22_23

For buildings with only 2 years of data: n_years_data = 2, acceleration = null

Classification:
  - 'accelerating': acceleration > 5%  (decline speeding up)
  - 'decelerating': acceleration < -5% (decline slowing down / improving)
  - 'stable': -5% <= acceleration <= 5%

Reads: public/yoy_deltas.json
Outputs: acceleration and trend label per building (as a dict/JSON)

Usage:
    /opt/homebrew/bin/python3.13 decline_trend_analysis.py
    /opt/homebrew/bin/python3.13 decline_trend_analysis.py --output public/decline_trend_results.json
"""

import json
import sys
import argparse
from pathlib import Path

PUBLIC_DIR = Path(__file__).parent / "public"
YOY_DELTAS = PUBLIC_DIR / "yoy_deltas.json"


def compute_acceleration(d22_23, d23_24):
    """Compute second-difference acceleration. Positive = speeding up decline."""
    if d22_23 is None or d23_24 is None:
        return None
    return round(d23_24 - d22_23, 4)


def classify_trend(acceleration, n_years):
    """
    Classify decline trend label.
    
    Args:
        acceleration: second-difference acceleration value (or None)
        n_years: number of years of data (2 or 3)
    
    Returns:
        str: 'accelerating', 'decelerating', or 'stable'
    """
    if n_years < 3 or acceleration is None:
        return "stable"  # insufficient data to determine trend
    if acceleration > 5.0:
        return "accelerating"
    elif acceleration < -5.0:
        return "decelerating"
    else:
        return "stable"


def main():
    parser = argparse.ArgumentParser(description="Compute decline trend acceleration from YoY deltas")
    parser.add_argument("--output", "-o",
                        default=str(PUBLIC_DIR / "decline_trend_results.json"),
                        help="Output JSON path")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Load YoY deltas ───────────────────────────────────────────────────
    with open(YOY_DELTAS) as f:
        yoy = json.load(f)

    print(f"Loaded {len(yoy)} buildings from {YOY_DELTAS}")

    # ── Compute acceleration per building ─────────────────────────────────
    results = {}
    accel_values = []
    count_3yr = 0
    count_2yr = 0

    for addr, d in yoy.items():
        d22_23 = d.get("norm_delta_22_23")
        d23_24 = d.get("norm_delta_23_24")

        # Determine n_years_data
        has_22 = d.get("steam_2022") is not None
        has_23 = d.get("steam_2023") is not None
        has_24 = d.get("steam_2024") is not None
        n_years = sum([has_22, has_23, has_24])

        acceleration = compute_acceleration(d22_23, d23_24)
        trend_label = classify_trend(acceleration, n_years)

        entry = {
            "norm_delta_22_23": d22_23,
            "norm_delta_23_24": d23_24,
            "acceleration": acceleration,
            "decline_trend_label": trend_label,
            "n_years_data": n_years,
        }

        if n_years >= 3 and acceleration is not None:
            count_3yr += 1
            accel_values.append(acceleration)
        elif n_years == 2:
            count_2yr += 1

        results[addr] = entry

    # ── Write output ──────────────────────────────────────────────────────
    output = {
        "description": "Decline trend acceleration (second-difference of norm_deltas)",
        "method": "acceleration = norm_delta_23_24 - norm_delta_22_23",
        "classification": {
            "accelerating": "acceleration > 5% (decline speeding up)",
            "decelerating": "acceleration < -5% (decline slowing down / improving)",
            "stable": "acceleration between -5% and 5%",
        },
        "summary": {
            "total_buildings": len(results),
            "buildings_3yr": count_3yr,
            "buildings_2yr": count_2yr,
        },
        "buildings": results,
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {output_path}")

    # ── Print summary ─────────────────────────────────────────────────────
    if accel_values:
        print(f"\nDecline trend acceleration summary:")
        print(f"  Buildings with 3 years of data: {count_3yr}")
        print(f"  Buildings with 2 years of data: {count_2yr}")
        print(f"  Acceleration range: {min(accel_values):.2f}% to {max(accel_values):.2f}%")
        print(f"  Mean acceleration: {sum(accel_values)/len(accel_values):.2f}%")
        print(f"  Median acceleration: {sorted(accel_values)[len(accel_values)//2]:.2f}%")

    # Trend label counts
    labels = {}
    for r in results.values():
        lbl = r["decline_trend_label"]
        labels[lbl] = labels.get(lbl, 0) + 1

    print(f"\nTrend label distribution:")
    for lbl in ["accelerating", "stable", "decelerating"]:
        count = labels.get(lbl, 0)
        pct = count / len(results) * 100
        print(f"  {lbl}: {count} ({pct:.1f}%)")

    # Spot check a few
    print(f"\nSample entries (first 3):")
    for i, (addr, r) in enumerate(results.items()):
        if i >= 3:
            break
        print(f"  {addr}: Δ22→23={r['norm_delta_22_23']}, Δ23→24={r['norm_delta_23_24']}, "
              f"accel={r['acceleration']}, label={r['decline_trend_label']}, yrs={r['n_years_data']}")

    print("\nDone.")


if __name__ == "__main__":
    main()