#!/usr/bin/env python3
"""
Train and save GBM + XGBoost attrition models to models/ dir.
Uses best known hyperparameters from xgboost_results.md (no grid search).
Also writes xgb_risk scores to public/buildingEnrichment.json.

Run: .ml_venv/bin/python3 save_models.py
"""
import json, os, sys
import numpy as np
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ll97_model import load_data, build_rows, make_labels, FEATURES

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("XGBoost not available — only GBM will be saved")

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
ENRICHMENT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "buildingEnrichment.json")

def main():
    print("Loading data...")
    buildings, enrichment, peer, signals, floor_area = load_data()
    rows = build_rows(buildings, enrichment, peer, signals, floor_area)
    labeled = make_labels(rows)

    X = np.array([[r[f] for f in FEATURES] for r, _ in labeled])
    y = np.array([lbl for _, lbl in labeled])
    print(f"  {X.shape[0]} labeled samples, {X.shape[1]} features")

    # ── GBM (baseline) ───────────────────────────────────────────────────────
    print("\nTraining GBM...")
    scaler_gbm = StandardScaler()
    X_sc = scaler_gbm.fit_transform(X)
    gbm = GradientBoostingClassifier(
        n_estimators=300, learning_rate=0.05,
        max_depth=4, subsample=0.8, random_state=42,
    )
    gbm.fit(X_sc, y)
    gbm_pipe = Pipeline([("scaler", scaler_gbm), ("clf", gbm)])
    gbm_path = os.path.join(MODELS_DIR, "gbm_attrition.pkl")
    joblib.dump(gbm_pipe, gbm_path)
    print(f"  Saved: {gbm_path}")

    # ── XGBoost (best params from grid search) ───────────────────────────────
    xgb_pipe = None
    if HAS_XGB:
        print("\nTraining XGBoost (best params)...")
        scaler_xgb = StandardScaler()
        X_sc_xgb = scaler_xgb.fit_transform(X)
        xgb_clf = xgb.XGBClassifier(
            colsample_bytree=1.0,
            learning_rate=0.1,
            max_depth=6,
            n_estimators=300,
            scale_pos_weight=18,
            subsample=0.8,
            random_state=42,
            verbosity=0,
            eval_metric="logloss",
        )
        xgb_clf.fit(X_sc_xgb, y)
        xgb_pipe = Pipeline([("scaler", scaler_xgb), ("clf", xgb_clf)])
        xgb_path = os.path.join(MODELS_DIR, "xgboost_attrition.pkl")
        joblib.dump(xgb_pipe, xgb_path)
        print(f"  Saved: {xgb_path}")

    # ── Score all 1,210 buildings → write xgb_risk to enrichment ─────────────
    print("\nScoring all buildings...")
    all_rows = build_rows(buildings, enrichment, peer, signals, floor_area)
    X_all = np.array([[r[f] for f in FEATURES] for r in all_rows])
    addresses = [r["address"] for r in all_rows]

    gbm_scores = gbm_pipe.predict_proba(X_all)[:, 1]
    xgb_scores = xgb_pipe.predict_proba(X_all)[:, 1] if xgb_pipe else gbm_scores

    with open(ENRICHMENT_PATH) as f:
        enrichment_data = json.load(f)

    updated = 0
    for addr, gbm_s, xgb_s in zip(addresses, gbm_scores, xgb_scores):
        if addr in enrichment_data:
            enrichment_data[addr]["xgb_risk"] = round(float(xgb_s), 4)
            enrichment_data[addr]["gbm_risk"] = round(float(gbm_s), 4)
            updated += 1

    with open(ENRICHMENT_PATH, "w") as f:
        json.dump(enrichment_data, f, separators=(",", ":"))

    print(f"  Updated {updated}/{len(all_rows)} buildings in buildingEnrichment.json")
    print(f"  XGBoost score range: {xgb_scores.min():.4f} – {xgb_scores.max():.4f}")
    print(f"  GBM score range:     {gbm_scores.min():.4f} – {gbm_scores.max():.4f}")
    print("\nDone.")

if __name__ == "__main__":
    main()
