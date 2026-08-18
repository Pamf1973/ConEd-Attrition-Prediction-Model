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

Run: python ll97_model.py
"""

import csv, json, math, os, sys
import numpy as np
import shap
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold

# ── Paths ─────────────────────────────────────────────────────────────────────
BUILDINGS_JSON     = "public/buildings.json"
ENRICHMENT_JSON    = "public/buildingEnrichment.json"
YOY_DELTAS_JSON    = "public/yoy_deltas.json"
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

# NYC district steam emission factor per NYC DOB LL97 Technical Guidance (Chapter 103 Rules)
# 0.00004493 MT CO₂e per kBtu — the LL97-specific coefficient used in NYC compliance calculations
# Note: EPA eGRID cites ~6.68e-5 (higher); LL97 uses 4.493e-5 as the binding regulatory value
STEAM_EMISSION_FACTOR = 4.493e-5


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

    with open(YOY_DELTAS_JSON) as f:
        yoy = {k.upper(): v for k, v in json.load(f).items()}

    return buildings, enrichment, peer, signals, floor_area, yoy


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

def build_rows(buildings, enrichment, peer, signals, floor_area, yoy=None):
    rows, skipped = [], 0
    if yoy is None:
        yoy = {}
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
        yoy_e     = yoy.get(addr, {})
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
            # yoy delta fields — used for M8 Critical membership filter
            "norm_delta_23_24":     yoy_e.get("norm_delta_23_24"),
            "outlier_23_24":        yoy_e.get("outlier_23_24"),
            "outlier_22_23":        yoy_e.get("outlier_22_23"),
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

def train(labeled_rows):
    X = np.array([[r[f] for f in FEATURES] for r, _ in labeled_rows])
    y = np.array([label for _, label in labeled_rows])

    pos = int(y.sum())
    neg = len(y) - pos
    spw = round(neg / pos) if pos > 0 else 1
    print(f"Class balance: {neg} neg / {pos} pos → scale_pos_weight={spw}")

    clf = xgb.XGBClassifier(
        n_estimators=300,
        learning_rate=0.1,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=1.0,
        scale_pos_weight=spw,
        random_state=42,
        eval_metric="logloss",
        verbosity=0,
    )

    # CV uses Pipeline to prevent scaler fit-leakage across folds
    pipe_cv = Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(pipe_cv, X, y, cv=skf, scoring="roc_auc")
    print(f"5-fold stratified CV AUC: {scores.mean():.3f} ± {scores.std():.3f}")

    # Final fit on full data with standalone scaler (needed for SHAP's TreeExplainer)
    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X)
    clf.fit(X_sc, y)

    # Feature importances (MDI gain)
    importances = sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1])
    print("\nFeature importances:")
    for feat, imp in importances:
        print(f"  {feat:<35} {imp:.4f}")

    return clf, scaler


# ── Predict all buildings ─────────────────────────────────────────────────────

def predict_all(clf, scaler, rows):
    X = np.array([[r[f] for f in FEATURES] for r in rows])
    X_sc = scaler.transform(X)
    probs = clf.predict_proba(X_sc)[:, 1]

    explainer = shap.TreeExplainer(clf)
    shap_values = explainer.shap_values(X_sc)
    # shap.TreeExplainer for XGBClassifier returns an ndarray (not a list);
    # this guard is a forward-compatibility shim for classifiers like RandomForestClassifier
    # that return [neg_class_array, pos_class_array]. Index 1 = positive class in that case.
    if isinstance(shap_values, list):
        shap_values = shap_values[1]

    drivers = []
    for i, row in enumerate(rows):
        sv = shap_values[i]
        top5 = sorted(
            [{"feature": FEATURES[j], "contribution": round(float(sv[j]), 4), "value": row[FEATURES[j]]}
             for j in range(len(FEATURES))],
            key=lambda x: -abs(x["contribution"])
        )[:5]
        drivers.append(top5)

    return probs, drivers


# ── Per-building SHAP drivers ─────────────────────────────────────────────────
# TreeExplainer returns log-odds contributions for the positive class.
# Sign: positive pushes toward attrition, negative pulls away.

def _natural_value(row, feature):
    # Map model features back to the building's value in its natural unit
    # (un-log where applicable) so the JSON carries human-readable numbers.
    if feature == "log_steam":              return round(math.exp(row["log_steam"]) / 1e6, 2)   # M kBtu
    if feature == "log_ghg":                return round(math.expm1(row["log_ghg"]), 1)         # MT CO₂e
    if feature == "log_dob_jobs":           return int(round(math.expm1(row["log_dob_jobs"])))  # count
    if feature == "ll97_penalty_2024_log":  return row["ll97_penalty_2024"]
    if feature == "ll97_penalty_2030_log":  return row["ll97_penalty_2030"]
    if feature == "ll97_over_2024":         return int(row["ll97_over_2024"])
    if feature == "year_built":             return int(row["year_built"])
    if feature == "energy_star":            return round(row["energy_star"], 1)
    if feature == "peer_score":             return round(row["peer_score"], 3)
    if feature == "use_type_ord":           return int(row["use_type_ord"])
    if feature == "cluster_id":             return int(row["cluster_id"])
    if feature == "steam_ghg_share":        return round(row["steam_ghg_share"], 3)
    return row.get(feature)


def compute_shap_drivers(clf, scaler, rows, top_n=5):
    X = np.array([[r[f] for f in FEATURES] for r in rows])
    X_sc = scaler.transform(X)
    explainer   = shap.TreeExplainer(clf)
    shap_values = explainer.shap_values(X_sc)
    # For binary GBC, shap_values is a 2D array of shape (n, n_features).
    # If a 3D array shape (n, n_features, 2) is returned, take the positive-class slice.
    if shap_values.ndim == 3:
        shap_values = shap_values[:, :, 1]

    drivers_per_building = []
    for i, row in enumerate(rows):
        contribs = shap_values[i]
        ranked   = sorted(enumerate(contribs), key=lambda x: -abs(x[1]))[:top_n]
        drivers  = [
            {
                "feature":      FEATURES[idx],
                "contribution": round(float(contribs[idx]), 4),
                "value":        _natural_value(row, FEATURES[idx]),
            }
            for idx, _ in ranked
        ]
        drivers_per_building.append(drivers)

    print(f"SHAP drivers computed for {len(drivers_per_building)} buildings (top {top_n} each)")
    return drivers_per_building


# ── Write enrichment ──────────────────────────────────────────────────────────

def update_enrichment(enrichment, rows, probs, drivers):
    for row, prob, top5 in zip(rows, probs, drivers):
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
        enrichment[addr]["ml_risk"]            = round(float(prob), 4)
        enrichment[addr]["ml_drivers"]         = top5
        # yoy delta fields for M8 Critical membership (null-safe: absent if yoy not loaded)
        if row.get("norm_delta_23_24") is not None:
            enrichment[addr]["norm_delta_23_24"] = round(float(row["norm_delta_23_24"]), 4)
            enrichment[addr]["outlier_23_24"]    = bool(row["outlier_23_24"])
            enrichment[addr]["outlier_22_23"]    = bool(row["outlier_22_23"])


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    buildings, enrichment, peer, signals, floor_area, yoy = load_data()
    rows = build_rows(buildings, enrichment, peer, signals, floor_area, yoy)

    labeled = make_labels(rows)
    if len(labeled) < 50:
        sys.exit("Too few labeled examples — check thresholds")

    clf, scaler = train(labeled)
    probs, drivers = predict_all(clf, scaler, rows)

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

    update_enrichment(enrichment, rows, probs, drivers)

    tmp = ENRICHMENT_JSON + ".tmp"
    with open(tmp, "w") as f:
        json.dump(enrichment, f)
    os.replace(tmp, ENRICHMENT_JSON)
    print(f"\nWrote {ENRICHMENT_JSON} — {len(rows)} buildings updated with LL97 + ml_risk")


if __name__ == "__main__":
    main()
