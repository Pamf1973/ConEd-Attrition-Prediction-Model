#!/usr/bin/env python3
"""
LL97 Penalty + Supervised Attrition Model

Reads:
  public/buildings.json                              (address, ghg, use, steam, yr)
  public/buildingEnrichment.json                     (eui, dob_jobs, energy_star, peer_score, cluster_*)
  ../coned-3d-map/data/steam-buildings.csv           (floor_area)
  ../coned-3d-map/data/ml_features/steam_trend_signals.json  (signal, hdd_pct)
  ../coned-3d-map/data/ml_features/peer_scores.json          (peer_score)

Writes:
  public/buildingEnrichment.json  (adds ll97_penalty_2024, ll97_penalty_2030,
                                        ll97_over_2024, ll97_over_2030, ml_risk)

Run: /opt/homebrew/bin/python3.13 ll97_model.py
"""

import csv, json, math, os, sys
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report

# ── Paths ─────────────────────────────────────────────────────────────────────
BUILDINGS_JSON     = "public/buildings.json"
ENRICHMENT_JSON    = "public/buildingEnrichment.json"
STEAM_CSV          = "../coned-3d-map/data/steam-buildings.csv"
TREND_SIGNALS_JSON = "../coned-3d-map/data/ml_features/steam_trend_signals.json"
PEER_SCORES_JSON   = "../coned-3d-map/data/ml_features/peer_scores.json"

# ── LL97 intensity limits (metric tons CO₂e / ft² / year) ────────────────────
# Source: NYC Local Law 97 of 2019, Table 2
LL97_LIMITS = {
    # (phase_1_2024, phase_2_2030)
    "Office":                                           (0.00846, 0.00453),
    "Financial Office":                                 (0.00846, 0.00453),
    "Medical Office":                                   (0.00846, 0.00453),
    "Laboratory":                                       (0.00846, 0.00453),
    "Other - Technology/Science":                       (0.00846, 0.00453),
    "Multifamily Housing":                              (0.00675, 0.00400),
    "Residence Hall/Dormitory":                         (0.00675, 0.00400),
    "Hotel":                                            (0.01450, 0.00700),
    "Retail Store":                                     (0.00846, 0.00403),
    "Supermarket/Grocery Store":                        (0.00846, 0.00403),
    "K-12 School":                                      (0.00846, 0.00453),
    "College/University":                               (0.00846, 0.00453),
    "Hospital (General Medical & Surgical)":            (0.02381, 0.00840),
    "Other - Specialty Hospital":                       (0.02381, 0.00840),
    "Urgent Care/Clinic/Other Outpatient":              (0.02381, 0.00840),
    "Performing Arts":                                  (0.01074, 0.00420),
    "Museum":                                           (0.01074, 0.00420),
    "Worship Facility":                                 (0.01074, 0.00420),
    "Other":                                            (0.00846, 0.00453),
}
LL97_DEFAULT = (0.00846, 0.00453)   # fallback → occupancy B
LL97_PENALTY_PER_TON = 268          # USD per MT CO₂e over limit

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

FEATURES = [
    "log_steam", "year_built", "log_ghg",
    "log_dob_jobs", "peer_score", "energy_star",
    "use_type_ord", "cluster_id",
    "ll97_penalty_2024_log", "ll97_penalty_2030_log",
    "ll97_over_2024",
    "steam_ghg_share",
    # steam_signal_ord excluded — it IS the label source
]

# NYC ConEd district steam emission factor (EPA eGRID / NYC LL84 Technical Guidance)
# 66.8 kg CO₂e per MMBtu = 6.68e-5 MT CO₂e per kBtu
STEAM_EMISSION_FACTOR = 6.68e-5


# ── Loaders ───────────────────────────────────────────────────────────────────

def load_data():
    with open(BUILDINGS_JSON) as f:
        buildings = json.load(f)

    with open(ENRICHMENT_JSON) as f:
        enrichment = {k.upper(): v for k, v in json.load(f).items()}

    with open(PEER_SCORES_JSON) as f:
        peer = {k.upper(): float(v or 0) for k, v in json.load(f).items()}

    with open(TREND_SIGNALS_JSON) as f:
        signals = {s["address"].upper(): s for s in json.load(f)}

    floor_area = {}
    with open(STEAM_CSV, newline="") as f:
        for row in csv.DictReader(f):
            raw = row.get("Property GFA - Self-Reported (ft²)", "")
            try:
                floor_area[row["Address 1"].upper()] = float(raw.replace(",", ""))
            except (ValueError, AttributeError):
                pass

    return buildings, enrichment, peer, signals, floor_area


# ── LL97 penalty computation ──────────────────────────────────────────────────

def compute_ll97(ghg, floor_sqft, use_type):
    lim_24, lim_30 = LL97_LIMITS.get(use_type, LL97_DEFAULT)
    cap_24 = floor_sqft * lim_24
    cap_30 = floor_sqft * lim_30
    excess_24 = max(0.0, ghg - cap_24)
    excess_30 = max(0.0, ghg - cap_30)
    return {
        "ll97_penalty_2024": round(excess_24 * LL97_PENALTY_PER_TON),
        "ll97_penalty_2030": round(excess_30 * LL97_PENALTY_PER_TON),
        "ll97_over_2024":    int(excess_24 > 0),
        "ll97_over_2030":    int(excess_30 > 0),
        "ll97_cap_2024":     round(cap_24, 1),
        "ll97_cap_2030":     round(cap_30, 1),
    }


# ── Feature matrix ────────────────────────────────────────────────────────────

def build_rows(buildings, enrichment, peer, signals, floor_area):
    rows, skipped = [], 0
    global_median_estar = 50.0

    # Compute group medians for energy star imputation
    estar_by_type = {}
    for b in buildings:
        e = enrichment.get(b["address"].upper(), {})
        es = e.get("energy_star")
        if es and isinstance(es, (int, float)) and es > 0:
            estar_by_type.setdefault(b.get("use", ""), []).append(float(es))
    type_medians = {ut: float(np.median(v)) for ut, v in estar_by_type.items()}

    for b in buildings:
        steam = b.get("steam", 0)
        ghg   = b.get("ghg")
        yr    = b.get("yr")
        use   = b.get("use", "")
        addr  = b.get("address", "").upper()

        if not steam or steam <= 0 or ghg is None or not yr:
            skipped += 1
            continue

        fa = floor_area.get(addr)
        if not fa or fa <= 0:
            skipped += 1
            continue

        e         = enrichment.get(addr, {})
        dob       = float(e.get("dob_jobs") or 0)
        peer_s    = float(peer.get(addr, 0) or 0)
        cluster   = int(e.get("cluster_id", -1))
        estar_raw = e.get("energy_star")
        estar     = float(estar_raw) if estar_raw and isinstance(estar_raw, (int, float)) and estar_raw > 0 \
                    else type_medians.get(use, global_median_estar)

        ll97      = compute_ll97(ghg, fa, use)
        sig_raw   = signals.get(addr, {}).get("signal", "none")
        sig_ord   = 2 if sig_raw == "big_drop" else 1 if sig_raw == "mod_drop" else 0

        # Fraction of total GHG attributable to steam — addresses Edwin's causal gap:
        # LL97 pressure only points at steam if steam IS the dominant emissions source.
        steam_ghg = steam * STEAM_EMISSION_FACTOR  # MT CO₂e from steam
        steam_ghg_share = min(steam_ghg / ghg, 1.0) if ghg > 0 else 0.0

        rows.append({
            "address":              addr,
            "log_steam":            math.log(steam),
            "year_built":           float(yr),
            "log_ghg":              math.log1p(ghg),
            "log_dob_jobs":         math.log1p(dob),
            "peer_score":           peer_s,
            "energy_star":          estar,
            "use_type_ord":         float(USE_TYPE_RISK.get(use, 2)),
            "cluster_id":           float(max(cluster, 0)),
            "ll97_penalty_2024_log": math.log1p(ll97["ll97_penalty_2024"]),
            "ll97_penalty_2030_log": math.log1p(ll97["ll97_penalty_2030"]),
            "ll97_over_2024":       float(ll97["ll97_over_2024"]),
            "steam_ghg_share":      steam_ghg_share,
            "steam_signal_ord":     float(sig_ord),
            # raw outputs for enrichment write
            "ll97_penalty_2024":    ll97["ll97_penalty_2024"],
            "ll97_penalty_2030":    ll97["ll97_penalty_2030"],
            "ll97_over_2024_raw":   ll97["ll97_over_2024"],
            "ll97_over_2030_raw":   ll97["ll97_over_2030"],
            "ll97_cap_2024":        ll97["ll97_cap_2024"],
            "ll97_cap_2030":        ll97["ll97_cap_2030"],
            "floor_sqft":           fa,
        })

    print(f"Feature matrix: {len(rows)} buildings ({skipped} skipped)")
    return rows


# ── Real labels from observed steam behavior ──────────────────────────────────
# y=1: big_drop (≥50% steam demand decline — confirmed behavioral churn signal)
# y=0: no signal at all (building shows no measured decline)
# excluded: mod_drop buildings (partial signal — ambiguous, excluded from training)

def make_labels(rows):
    labeled = []
    for r in rows:
        sig = r["steam_signal_ord"]
        if sig == 2:           # big_drop
            labeled.append((r, 1))
        elif sig == 0:         # no signal
            labeled.append((r, 0))
        # sig == 1 (mod_drop) → excluded from training, model predicts them

    pos = sum(1 for _, y in labeled if y == 1)
    neg = sum(1 for _, y in labeled if y == 0)
    print(f"Labeled: {len(labeled)} ({pos} confirmed churn, {neg} no-signal) | "
          f"Excluded (mod_drop): {len(rows) - len(labeled)}")
    return labeled


# ── Model training ────────────────────────────────────────────────────────────

def _class_weights(y):
    pos = sum(y)
    neg = len(y) - pos
    w_pos = len(y) / (2 * pos)
    w_neg = len(y) / (2 * neg)
    return np.array([w_pos if yi == 1 else w_neg for yi in y])


def train(labeled_rows):
    X = np.array([[r[f] for f in FEATURES] for r, _ in labeled_rows])
    y = np.array([lbl for _, lbl in labeled_rows])

    scaler = StandardScaler()
    X_sc   = scaler.fit_transform(X)

    clf = GradientBoostingClassifier(
        n_estimators=300, learning_rate=0.05,
        max_depth=4, subsample=0.8,
        random_state=42,
    )

    cv_scores = cross_val_score(clf, X_sc, y, cv=5, scoring="roc_auc")
    print(f"5-fold CV AUC: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    sample_w = _class_weights(y)
    clf.fit(X_sc, y, sample_weight=sample_w)

    importances = sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1])
    print("\nFeature importances:")
    for feat, imp in importances:
        print(f"  {feat:<30} {imp:.4f}")

    return clf, scaler


# ── Predict all buildings ─────────────────────────────────────────────────────

def predict_all(clf, scaler, rows):
    X = np.array([[r[f] for f in FEATURES] for r in rows])
    X_sc = scaler.transform(X)
    probs = clf.predict_proba(X_sc)[:, 1]
    return probs


# ── Write enrichment ──────────────────────────────────────────────────────────

def update_enrichment(enrichment, rows, probs):
    for row, prob in zip(rows, probs):
        addr = row["address"]
        if addr not in enrichment:
            enrichment[addr] = {}
        enrichment[addr]["ll97_penalty_2024"] = row["ll97_penalty_2024"]
        enrichment[addr]["ll97_penalty_2030"] = row["ll97_penalty_2030"]
        enrichment[addr]["ll97_over_2024"]    = row["ll97_over_2024_raw"]
        enrichment[addr]["ll97_over_2030"]    = row["ll97_over_2030_raw"]
        enrichment[addr]["ll97_cap_2024"]     = row["ll97_cap_2024"]
        enrichment[addr]["ll97_cap_2030"]     = row["ll97_cap_2030"]
        enrichment[addr]["floor_sqft"]        = int(row["floor_sqft"])
        enrichment[addr]["steam_ghg_share"]   = round(row["steam_ghg_share"], 3)
        enrichment[addr]["ml_risk"]           = round(float(prob), 4)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    buildings, enrichment, peer, signals, floor_area = load_data()
    rows = build_rows(buildings, enrichment, peer, signals, floor_area)

    labeled = make_labels(rows)
    if len(labeled) < 50:
        sys.exit("Too few labeled examples — check thresholds")

    clf, scaler = train(labeled)
    probs = predict_all(clf, scaler, rows)

    # Summary stats
    high   = sum(1 for p in probs if p > 0.7)
    medium = sum(1 for p in probs if 0.4 < p <= 0.7)
    low    = sum(1 for p in probs if p <= 0.4)
    print(f"\nml_risk distribution → High: {high}  Medium: {medium}  Low: {low}")

    # Top 10 highest risk
    ranked = sorted(zip(rows, probs), key=lambda x: -x[1])
    print("\nTop 10 attrition risk (ml_risk):")
    print(f"  {'Address':<45} {'ml_risk':>8}  {'LL97 2024':>12}  {'Signal'}")
    print("  " + "-" * 80)
    for r, p in ranked[:10]:
        sig = "big_drop" if r["steam_signal_ord"] == 2 else "mod_drop" if r["steam_signal_ord"] == 1 else "—"
        print(f"  {r['address']:<45} {p:>8.3f}  ${r['ll97_penalty_2024']:>10,}  {sig}")

    update_enrichment(enrichment, rows, probs)

    tmp = ENRICHMENT_JSON + ".tmp"
    with open(tmp, "w") as f:
        json.dump(enrichment, f)
    os.replace(tmp, ENRICHMENT_JSON)
    print(f"\nWrote {ENRICHMENT_JSON} — {len(rows)} buildings updated with LL97 + ml_risk")


if __name__ == "__main__":
    main()
