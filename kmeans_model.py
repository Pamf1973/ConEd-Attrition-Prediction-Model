#!/usr/bin/env python3
"""
K-Means clustering model for ConEd steam customer attrition dashboard.

Reads:  public/buildings.json + public/buildingEnrichment.json
        ../coned-3d-map/data/ml_features/peer_scores.json
        ../coned-3d-map/data/ml_features/steam_trend_signals.json

Writes: public/buildingEnrichment.json  (adds cluster_id, cluster_name, cluster_risk)
        cluster_profiles.json           (per-cluster summary for inspection)

Run:    python3 kmeans_model.py
"""

import json, math, sys
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.decomposition import PCA

# ── Paths ─────────────────────────────────────────────────────────────────────
BUILDINGS_JSON      = "public/buildings.json"
ENRICHMENT_JSON     = "public/buildingEnrichment.json"
PEER_SCORES_JSON    = "../coned-3d-map/data/ml_features/peer_scores.json"
TREND_SIGNALS_JSON  = "../coned-3d-map/data/ml_features/steam_trend_signals.json"
CLUSTER_PROFILES    = "cluster_profiles.json"

# ── Use-type attrition-risk ordinal ──────────────────────────────────────────
# Higher = more likely to electrify under LL97
USE_TYPE_RISK = {
    "Office":                                           4,
    "Financial Office":                                 4,
    "Hotel":                                            3,
    "Retail Store":                                     3,
    "Repair Services (Vehicle, Shoe, Locksmith, etc.)": 3,
    "Multifamily Housing":                              2,
    "Residence Hall/Dormitory":                         2,
    "College/University":                               2,
    "Medical Office":                                   2,
    "Urgent Care/Clinic/Other Outpatient":              2,
    "Performing Arts":                                  2,
    "Worship Facility":                                 2,
    "Museum":                                           1,
    "K-12 School":                                      1,
    "Hospital (General Medical & Surgical)":            1,
    "Other - Specialty Hospital":                       1,
    "Laboratory":                                       1,
    "Other - Technology/Science":                       1,
}

# ── Cluster archetype definitions (set after reviewing K-selection output) ────
# Keyed by cluster_id (int). Update these after running the K-selection loop.
ARCHETYPES = {
    0: {"name": "Pre-War Active — Permit-Driven Churn",       "risk": "High"},
    1: {"name": "Mid-Size Post-War — Moderate Signal",        "risk": "Medium"},
    2: {"name": "Pre-War Stable — Low Signal",                "risk": "Low"},
    3: {"name": "Large Commercial — Capital Mobilized",       "risk": "Medium"},
    4: {"name": "Low-Compliance Commercial — Quiet Attrition",  "risk": "High"},
}

# ── K to use (set after reviewing elbow/silhouette output) ───────────────────
K_FINAL = 5


def load_data():
    with open(BUILDINGS_JSON) as f:
        buildings = json.load(f)
    with open(ENRICHMENT_JSON) as f:
        # Normalize all enrichment keys to uppercase for consistent joining
        enrichment = {k.upper(): v for k, v in json.load(f).items()}
    with open(PEER_SCORES_JSON) as f:
        # Normalize peer score keys to uppercase
        peer = {k.upper(): v for k, v in json.load(f).items()}
    with open(TREND_SIGNALS_JSON) as f:
        signals = {s["address"].upper(): s for s in json.load(f)}
    return buildings, enrichment, peer, signals


def build_feature_matrix(buildings, enrichment, peer, signals):
    rows = []
    skipped = 0

    # Gather energy_star values by use_type for group-median imputation
    estar_by_type = {}
    for b in buildings:
        e = enrichment.get(b["address"].upper(), {})
        es = e.get("energy_star")
        use = b.get("use", "")
        if es and isinstance(es, (int, float)) and es > 0:
            estar_by_type.setdefault(use, []).append(es)
    type_medians = {ut: float(np.median(vals)) for ut, vals in estar_by_type.items()}
    global_median_estar = float(np.median([v for vals in estar_by_type.values() for v in vals]))

    for b in buildings:
        steam = b.get("steam", 0)
        ghg   = b.get("ghg")
        yr    = b.get("yr")
        addr  = b.get("address", "").upper()
        use   = b.get("use", "")

        # Drop rows with invalid core values
        if not steam or steam <= 0:
            skipped += 1
            continue
        if ghg is None:
            skipped += 1
            continue
        if not yr:
            skipped += 1
            continue

        e = enrichment.get(addr, {})
        dob_raw   = e.get("dob_jobs")
        dob       = float(dob_raw) if dob_raw is not None else 0.0
        peer_s    = float(peer.get(addr, 0) or 0)

        estar_raw = e.get("energy_star")
        if estar_raw and isinstance(estar_raw, (int, float)) and estar_raw > 0:
            estar = float(estar_raw)
        else:
            estar = type_medians.get(use, global_median_estar)

        use_ord   = float(USE_TYPE_RISK.get(use, 2))
        sig       = signals.get(addr.upper(), {}).get("signal", "none")

        rows.append({
            "address":         addr,
            "log_steam":       math.log(steam),
            "year_built":      float(yr),
            "log_ghg":         math.log1p(ghg),
            "log_dob_jobs":    math.log1p(dob),
            "peer_score":      peer_s,
            "energy_star":     estar,
            "use_type_ord":    use_ord,
            # descriptor columns (not used in clustering)
            "steam_raw":       steam,
            "ghg_raw":         ghg,
            "dob_raw":         dob,
            "use_type":        use,
            "signal":          sig,
        })

    print(f"Built feature matrix: {len(rows)} buildings ({skipped} skipped)")
    return rows


FEATURES = ["log_steam", "year_built", "log_ghg", "log_dob_jobs",
            "peer_score", "energy_star", "use_type_ord"]


def k_selection(X_scaled):
    print("\nK-selection results:")
    print(f"{'K':>4}  {'Inertia':>12}  {'Silhouette':>12}  {'Calinski-H':>12}")
    print("-" * 48)
    results = {}
    for k in range(2, 11):
        km = KMeans(n_clusters=k, n_init=20, max_iter=500, random_state=42)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        ch  = calinski_harabasz_score(X_scaled, labels)
        results[k] = {"inertia": km.inertia_, "silhouette": sil, "calinski_harabasz": ch}
        print(f"{k:>4}  {km.inertia_:>12.1f}  {sil:>12.4f}  {ch:>12.1f}")
    return results


def fit_final(X_scaled, rows, k):
    km = KMeans(n_clusters=k, n_init=20, max_iter=500, random_state=42)
    labels = km.fit_predict(X_scaled)
    for i, row in enumerate(rows):
        row["cluster_id"] = int(labels[i])
    print(f"\nFitted K={k}: {dict(zip(*np.unique(labels, return_counts=True)))}")
    return km, labels


def build_profiles(rows, k):
    profiles = {i: {f: [] for f in FEATURES + ["steam_raw", "dob_raw", "signal"]}
                for i in range(k)}
    for row in rows:
        c = row["cluster_id"]
        for f in FEATURES + ["steam_raw", "dob_raw"]:
            profiles[c][f].append(row.get(f, 0))
        profiles[c]["signal"].append(row.get("signal", "none"))

    summary = {}
    for c, data in profiles.items():
        big_drops = sum(1 for s in data["signal"] if s == "big_drop")
        mod_drops = sum(1 for s in data["signal"] if s == "mod_drop")
        n = len(data["log_steam"])
        if n == 0:
            summary[c] = {"n": 0, "error": "empty cluster"}
            continue
        summary[c] = {
            "n":                  n,
            "mean_steam_M_kBtu":  round(float(np.mean(data["steam_raw"])) / 1e6, 1),
            "mean_year_built":    round(float(np.mean(data["year_built"])), 0),
            "mean_ghg":           round(float(np.exp(np.mean(data["log_ghg"])) - 1), 1),
            "mean_dob_jobs":      round(float(np.mean(data["dob_raw"])), 1),
            "mean_peer_score":    round(float(np.mean(data["peer_score"])), 3),
            "mean_energy_star":   round(float(np.mean(data["energy_star"])), 1),
            "mean_use_type_ord":  round(float(np.mean(data["use_type_ord"])), 2),
            "pct_big_drop":       round(100 * big_drops / n, 1),
            "pct_mod_drop":       round(100 * mod_drops / n, 1),
            "archetype":          ARCHETYPES.get(c, {}).get("name", "Pending review"),
            "risk":               ARCHETYPES.get(c, {}).get("risk", "Unknown"),
        }
    return summary


def update_enrichment(enrichment, rows):
    # enrichment keys are uppercase (normalized on load); addr in rows is also uppercase
    for row in rows:
        addr = row["address"]  # already uppercase
        if addr not in enrichment:
            enrichment[addr] = {}
        enrichment[addr]["cluster_id"]   = row["cluster_id"]
        enrichment[addr]["cluster_name"] = ARCHETYPES.get(row["cluster_id"], {}).get("name", "Pending review")
        enrichment[addr]["cluster_risk"] = ARCHETYPES.get(row["cluster_id"], {}).get("risk", "Unknown")


def main():
    buildings, enrichment, peer, signals = load_data()
    rows = build_feature_matrix(buildings, enrichment, peer, signals)

    X = np.array([[row[f] for f in FEATURES] for row in rows])
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-selection loop — review output and set K_FINAL above
    k_results = k_selection(X_scaled)

    # Fit final model
    km, labels = fit_final(X_scaled, rows, K_FINAL)

    # Build per-cluster profile table
    profiles = build_profiles(rows, K_FINAL)

    print("\nCluster profiles (review to assign ARCHETYPES above):")
    print(f"{'Cluster':>8}  {'N':>5}  {'Avg Steam M':>12}  {'Avg Yr':>7}  {'Avg DOB':>8}  {'Avg ES':>7}  {'BigDrop%':>9}  {'UseOrd':>7}")
    print("-" * 80)
    for c, p in sorted(profiles.items()):
        print(f"{c:>8}  {p['n']:>5}  {p['mean_steam_M_kBtu']:>12.1f}  "
              f"{p['mean_year_built']:>7.0f}  {p['mean_dob_jobs']:>8.1f}  "
              f"{p['mean_energy_star']:>7.1f}  {p['pct_big_drop']:>8.1f}%  "
              f"{p['mean_use_type_ord']:>7.2f}")

    # Write cluster_profiles.json for review
    with open(CLUSTER_PROFILES, "w") as f:
        json.dump(profiles, f, indent=2)
    print(f"\nWrote {CLUSTER_PROFILES}")

    # Update buildingEnrichment.json — atomic write to avoid corruption on crash
    update_enrichment(enrichment, rows)
    tmp = ENRICHMENT_JSON + ".tmp"
    with open(tmp, "w") as f:
        json.dump(enrichment, f)
    import os
    os.replace(tmp, ENRICHMENT_JSON)
    print(f"Updated {ENRICHMENT_JSON} with cluster fields")
    print("\nNext step: review cluster profiles above, assign archetype names")
    print("in the ARCHETYPES dict at the top of this file, then re-run.")


if __name__ == "__main__":
    main()
