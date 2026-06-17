#!/usr/bin/env python3
"""
Per-building OLS weather regression for NYCHA developments.

Reads:
  - steam-consumption.csv  (monthly steam, 24 NYCHA developments)
  - public/noaa_degree_days.json  (monthly HDD/CDD)

For each development, performs OLS: steam ~ HDD + CDD
and outputs β_HDD, β_CDD, intercept, R².

Also computes citywide average coefficients for fallback use
by the 1,186 buildings without monthly data.

Output: public/building_regression_results.json

Usage:
    /opt/homebrew/bin/python3.13 building_weather_regression.py
"""

import csv, json, os, sys
from pathlib import Path
from collections import defaultdict

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

PUBLIC_DIR = Path(__file__).parent / "public"
STEAM_CSV = Path(__file__).parent.parent / "coned-3d-map" / "data" / "steam-consumption.csv"
NOAA_JSON = PUBLIC_DIR / "noaa_degree_days.json"
OUTPUT_FILE = PUBLIC_DIR / "building_regression_results.json"


def load_steam_monthly(csv_path):
    """
    Load and aggregate monthly steam consumption per development.
    Returns dict: development_name -> {YYYY-MM: total_consumption_mlbs}
    """
    dev_monthly = defaultdict(lambda: defaultdict(float))

    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            dev = row["Development Name"].strip()
            month = row["Revenue Month"].strip()  # YYYY-MM
            try:
                consumption = float(row["Consumption (Mlbs)"])
            except (ValueError, KeyError):
                continue
            dev_monthly[dev][month] += consumption

    # Convert to regular dict
    result = {}
    for dev, months in dev_monthly.items():
        result[dev] = dict(months)

    return result


def load_noaa_monthly(noaa_path):
    """
    Load monthly HDD/CDD from NOAA JSON.
    Returns dict: YYYY-MM -> {hdd: float, cdd: float}
    """
    with open(noaa_path) as f:
        noaa = json.load(f)

    monthly = {}
    for year_str, year_data in noaa["years"].items():
        for month_str, mdata in year_data["months"].items():
            key = f"{year_str}-{int(month_str):02d}"
            monthly[key] = {
                "hdd": mdata["hdd"],
                "cdd": mdata["cdd"],
            }
    return monthly


def build_regression_dataset(dev_monthly, noaa_monthly):
    """
    For each development, build X (HDD, CDD) and y (steam consumption)
    for months that have both steam data and NOAA data.
    Returns dict: dev_name -> {X: ndarray, y: ndarray, months: list}
    """
    datasets = {}
    for dev, months in dev_monthly.items():
        X_list = []
        y_list = []
        month_keys = []
        for month_key in sorted(months):
            if month_key not in noaa_monthly:
                continue
            consumption = months[month_key]
            hdd = noaa_monthly[month_key]["hdd"]
            cdd = noaa_monthly[month_key]["cdd"]
            X_list.append([hdd, cdd])
            y_list.append(consumption)
            month_keys.append(month_key)

        if len(X_list) < 5:  # Need at least 5 data points for meaningful regression
            print(f"  WARNING: {dev} only has {len(X_list)} months — skipping regression")
            continue

        datasets[dev] = {
            "X": np.array(X_list, dtype=float),
            "y": np.array(y_list, dtype=float),
            "months": month_keys,
        }

    return datasets


def perform_regression(datasets):
    """
    Perform OLS regression for each development.
    Returns dict: dev_name -> {beta_hdd, beta_cdd, intercept, r2, n_observations}
    """
    results = {}
    all_betas_hdd = []
    all_betas_cdd = []
    all_intercepts = []

    for dev, ds in datasets.items():
        X = ds["X"]
        y = ds["y"]

        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)
        r2 = r2_score(y, y_pred)
        beta_hdd = model.coef_[0]
        beta_cdd = model.coef_[1]
        intercept = model.intercept_

        results[dev] = {
            "beta_hdd": round(beta_hdd, 6),
            "beta_cdd": round(beta_cdd, 6),
            "intercept": round(intercept, 4),
            "r2": round(r2, 4),
            "n_observations": len(y),
            "mean_consumption": round(float(np.mean(y)), 2),
        }

        all_betas_hdd.append(beta_hdd)
        all_betas_cdd.append(beta_cdd)
        all_intercepts.append(intercept)

        print(f"  {dev}: β_HDD={beta_hdd:.4f}, β_CDD={beta_cdd:.4f}, "
              f"intercept={intercept:.1f}, R²={r2:.3f} (n={len(y)})")

    # Compute citywide average coefficients
    citywide = {}
    if all_betas_hdd:
        citywide["avg_beta_hdd"] = round(float(np.mean(all_betas_hdd)), 6)
        citywide["avg_beta_cdd"] = round(float(np.mean(all_betas_cdd)), 6)
        citywide["avg_intercept"] = round(float(np.mean(all_intercepts)), 4)
        citywide["n_developments"] = len(all_betas_hdd)
        citywide["note"] = "Use for buildings without monthly data (1,186 buildings)"

    return results, citywide


def main():
    """Main entry point."""
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load data ────────────────────────────────────────────────────────
    print("Loading steam consumption data...")
    dev_monthly = load_steam_monthly(STEAM_CSV)
    print(f"  Found {len(dev_monthly)} developments")

    print("Loading NOAA degree days...")
    noaa_monthly = load_noaa_monthly(NOAA_JSON)
    print(f"  Found {len(noaa_monthly)} months of NOAA data")

    # ── Build regression datasets ────────────────────────────────────────
    print("Building regression datasets...")
    datasets = build_regression_dataset(dev_monthly, noaa_monthly)
    print(f"  Built datasets for {len(datasets)} developments")

    # ── Perform regression ───────────────────────────────────────────────
    print("\nPerforming OLS regression (steam ~ HDD + CDD)...")
    results, citywide = perform_regression(datasets)

    # ── Build output ─────────────────────────────────────────────────────
    output = {
        "model": "OLS: steam ~ HDD + CDD",
        "n_developments": len(results),
        "citywide_averages": citywide,
        "developments": results,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nWrote {OUTPUT_FILE}")
    print(f"  {len(results)} developments with regression results")
    if citywide:
        print(f"  Citywide avg β_HDD: {citywide['avg_beta_hdd']}")
        print(f"  Citywide avg β_CDD: {citywide['avg_beta_cdd']}")
        print(f"  Citywide avg intercept: {citywide['avg_intercept']}")

    # ── R² distribution summary ──────────────────────────────────────────
    r2_vals = [v["r2"] for v in results.values()]
    if r2_vals:
        print(f"\n  R² distribution: min={min(r2_vals):.3f}, "
              f"max={max(r2_vals):.3f}, "
              f"median={sorted(r2_vals)[len(r2_vals)//2]:.3f}")

    high_r2 = sum(1 for v in r2_vals if v >= 0.3)
    print(f"  Developments with R² >= 0.3: {high_r2}/{len(r2_vals)}")

    print("\nDone.")


if __name__ == "__main__":
    main()