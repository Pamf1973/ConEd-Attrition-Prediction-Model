#!/usr/bin/env python3
"""
Rule-based risk tiering + Uncertain tier update.

Reads:
  - public/buildingEnrichment.json   (1,210 buildings, existing fields)
  - public/yoy_deltas.json           (norm_deltas, outlier flags)
  - public/building_regression_results.json  (β_HDD, β_CDD, R² per NYCHA dev)
  - public/decline_trend_results.json        (acceleration, trend labels)

Computes per-building:
  - diagnostic_risk         (Low / Medium / High / Uncertain)
  - decline_acceleration    (float or null)
  - decline_trend_label     (accelerating / decelerating / stable)
  - uncertain_reason        (string or null)
  - n_years_data            (int: 0, 1, 2, 3)

Rule logic:
  1. UNCERTAIN if:
     - n_years_data < 2 (not enough data to evaluate)
     - NYCHA development with R² < 0.3 (unreliable regression fit)
  2. BASE TIER from ml_risk: < 0.2 → Low, 0.2–0.6 → Medium, > 0.6 → High
  3. MODIFIERS (each shifts one tier level):
     - accelerating decline       → +1 tier
     - outlier in either period   → +1 tier
     - ll97_over_2024 or 2030     → +1 tier
     - decelerating (improving)   → -1 tier
  4. CLAMP to [Low, Medium, High]

Writes updated buildingEnrichment.json (preserving all existing fields).

Usage:
    /opt/homebrew/bin/python3.13 update_enrichment_risk.py
"""

import json, datetime
from pathlib import Path

PUBLIC_DIR = Path(__file__).parent / "public"
ENRICHMENT_PATH   = PUBLIC_DIR / "buildingEnrichment.json"
YOY_DELTAS_PATH   = PUBLIC_DIR / "yoy_deltas.json"
REGRESSION_PATH   = PUBLIC_DIR / "building_regression_results.json"
DECLINE_TREND_PATH = PUBLIC_DIR / "decline_trend_results.json"

# Tier order for applying modifiers
TIER_ORDER = ["Low", "Medium", "High"]
TIER_LEVEL = {t: i for i, t in enumerate(TIER_ORDER)}  # 0=Low, 1=Medium, 2=High

# NYCHA development names from regression results
# (used to look up per-building R²)
NYCHA_DEVS = None  # populated from regression results


def load_json(path):
    with open(path) as f:
        return json.load(f)


def get_n_years_data(yoy_entry):
    """Count years with steam data from yoy_deltas entry."""
    count = 0
    if yoy_entry.get("steam_2022") is not None:
        count += 1
    if yoy_entry.get("steam_2023") is not None:
        count += 1
    if yoy_entry.get("steam_2024") is not None:
        count += 1
    return count


def compute_diagnostic_risk(ml_risk, n_years, is_outlier, is_accelerating,
                             is_decelerating, ll97_over_2024, ll97_over_2030,
                             is_nycha_with_low_r2):
    """
    Apply ConEd-style rule-based risk tiering.
    
    Returns: (risk_tier, uncertain_reason)
    """
    # ── Uncertain checks (take priority) ──────────────────────────────────
    if n_years < 2:
        return "Uncertain", f"Insufficient data: only {n_years} year(s) of steam data"

    if is_nycha_with_low_r2:
        return "Uncertain", "NYCHA development with R² < 0.3 (unreliable regression fit)"

    # ── Base tier from ML risk ────────────────────────────────────────────
    if ml_risk is None or ml_risk < 0:
        return "Uncertain", "Missing ml_risk score"
    elif ml_risk < 0.2:
        base_idx = 0  # Low
    elif ml_risk < 0.6:
        base_idx = 1  # Medium
    else:
        base_idx = 2  # High

    # ── Apply modifiers ──────────────────────────────────────────────────
    modifier = 0
    if is_outlier:
        modifier += 1
    if is_accelerating:
        modifier += 1
    if is_decelerating:
        modifier -= 1
    if ll97_over_2024 or ll97_over_2030:
        modifier += 1

    final_idx = max(0, min(2, base_idx + modifier))
    return TIER_ORDER[final_idx], None


def main():
    # ── Load all inputs ───────────────────────────────────────────────────
    print("Loading data files...")
    enrichment  = load_json(ENRICHMENT_PATH)
    yoy_deltas  = load_json(YOY_DELTAS_PATH)
    decline_res = load_json(DECLINE_TREND_PATH)
    regression  = load_json(REGRESSION_PATH)

    print(f"  Enrichment:       {len(enrichment)} buildings")
    print(f"  YoY deltas:       {len(yoy_deltas)} buildings")
    print(f"  Decline trends:   {len(decline_res['buildings'])} buildings")
    print(f"  Regression devs:  {len(regression['developments'])} developments")

    # ── Build NYCHA R² lookup ─────────────────────────────────────────────
    # Regression results keyed by development name
    dev_r2 = {}
    for dev_name, dev_data in regression["developments"].items():
        dev_r2[dev_name] = dev_data["r2"]

    print(f"  NYCHA devs with R²: {len(dev_r2)}")

    # ── Process each building ─────────────────────────────────────────────
    risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Uncertain": 0}
    uncertain_reasons = {}
    n_years_dist = {}

    for address in enrichment:
        entry = enrichment[address]
        yoy = yoy_deltas.get(address, {})
        decline = decline_res["buildings"].get(address, {})

        # ── Gather signals ───────────────────────────────────────────────
        n_years = get_n_years_data(yoy)
        n_years_dist[n_years] = n_years_dist.get(n_years, 0) + 1

        ml_risk = entry.get("ml_risk")

        is_outlier = (
            yoy.get("outlier_22_23", False) or
            yoy.get("outlier_23_24", False)
        )

        decline_accel = decline.get("acceleration")
        decline_label = decline.get("decline_trend_label", "stable")

        is_accelerating = (decline_label == "accelerating")
        is_decelerating = (decline_label == "decelerating")

        ll97_over_2024 = entry.get("ll97_over_2024", False)
        ll97_over_2030 = entry.get("ll97_over_2030", False)

        # Check if this address matches a NYCHA development
        is_nycha_low_r2 = False
        matched_dev = None
        for dev_name in dev_r2:
            if dev_name in address.upper():
                matched_dev = dev_name
                if dev_r2[dev_name] < 0.3:
                    is_nycha_low_r2 = True
                break

        # ── Compute risk ─────────────────────────────────────────────────
        risk, uncertain_reason = compute_diagnostic_risk(
            ml_risk=ml_risk,
            n_years=n_years,
            is_outlier=is_outlier,
            is_accelerating=is_accelerating,
            is_decelerating=is_decelerating,
            ll97_over_2024=ll97_over_2024,
            ll97_over_2030=ll97_over_2030,
            is_nycha_with_low_r2=is_nycha_low_r2,
        )

        # ── Store fields ─────────────────────────────────────────────────
        entry["diagnostic_risk"]        = risk
        entry["decline_acceleration"]   = decline_accel
        entry["decline_trend_label"]    = decline_label
        entry["uncertain_reason"]       = uncertain_reason
        entry["n_years_data"]           = n_years

        # Store NYCHA regression stats if this building matched a development
        if matched_dev and matched_dev in regression["developments"]:
            dev_data = regression["developments"][matched_dev]
            entry["regression_r2"]       = round(dev_data["r2"], 4)
            entry["regression_beta_hdd"] = round(dev_data["beta_hdd"], 4)
            entry["regression_beta_cdd"] = round(dev_data["beta_cdd"], 4)
        else:
            entry.pop("regression_r2",       None)
            entry.pop("regression_beta_hdd", None)
            entry.pop("regression_beta_cdd", None)

        risk_counts[risk] = risk_counts.get(risk, 0) + 1
        if uncertain_reason is not None:
            uncertain_reasons[address] = uncertain_reason

    # ── Write updated enrichment ──────────────────────────────────────────
    with open(ENRICHMENT_PATH, "w") as f:
        json.dump(enrichment, f, indent=2)

    print(f"\nWrote {ENRICHMENT_PATH}")

    # ── Print summary ─────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"DIAGNOSTIC RISK DISTRIBUTION")
    print(f"{'='*60}")
    for tier in ["Low", "Medium", "High", "Uncertain"]:
        count = risk_counts.get(tier, 0)
        pct = count / len(enrichment) * 100
        print(f"  {tier:12s}: {count:5d} ({pct:5.1f}%)")

    print(f"\n  Total: {len(enrichment)} buildings")

    print(f"\n  N_YEARS_DATA DISTRIBUTION:")
    for ny in sorted(n_years_dist):
        print(f"    {ny} year(s): {n_years_dist[ny]} buildings")

    print(f"\n  UNCERTAIN BREAKDOWN:")
    print(f"    Total Uncertain: {len(uncertain_reasons)}")
    reasons = {}
    for addr, reason in uncertain_reasons.items():
        short = reason.split("(")[0].strip()
        reasons[short] = reasons.get(short, 0) + 1
    for reason, count in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"    {reason}: {count}")

    # Print sample Uncertain buildings
    if uncertain_reasons:
        print(f"\n  Sample Uncertain buildings:")
        for i, (addr, reason) in enumerate(uncertain_reasons.items()):
            if i >= 5:
                break
            print(f"    {addr[:50]:50s} → {reason}")

    # Validate diversity
    tier_count = sum(1 for v in risk_counts.values() if v > 0)
    if tier_count >= 4:
        print(f"\n  ✅ ALL 4 TIERS REPRESENTED — diversity check PASS")
    else:
        print(f"\n  ⚠️  Only {tier_count}/4 tiers populated — diversity check FAIL")

    if risk_counts.get("Uncertain", 0) >= 10:
        print(f"  ✅ UNCERTAIN COUNT >= 10 — threshold check PASS")
    else:
        print(f"  ⚠️  Only {risk_counts.get('Uncertain', 0)} Uncertain — threshold check FAIL")

    # Refresh run_date in data/model_meta.json (params-unchanged run)
    meta_path = Path(__file__).parent / "data" / "model_meta.json"
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        meta["run_date"] = datetime.date.today().isoformat()
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        print(f"[meta] refreshed run_date in {meta_path}")

    print("\nDone.")


if __name__ == "__main__":
    main()