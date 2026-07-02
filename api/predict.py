#!/usr/bin/env python3
"""
Prediction helper called by server.js via child_process.
Reads JSON from stdin: { "features": [...], "model": "xgboost"|"gbm"|"both" }
Writes JSON to stdout: { "xgb_risk": float, "gbm_risk": float }

Features must be in FEATURES order (from ll97_model.py):
  log_steam, year_built, log_ghg, log_dob_jobs, peer_score, energy_star,
  use_type_ord, cluster_id, ll97_penalty_2024_log, ll97_penalty_2030_log,
  ll97_over_2024, steam_ghg_share
"""
import json, sys, os
import numpy as np
import joblib

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

def load_model(name):
    path = os.path.join(MODELS_DIR, f"{name}_attrition.pkl")
    return joblib.load(path)

def main():
    try:
        payload = json.load(sys.stdin)
        features = np.array([payload["features"]], dtype=float)
        model_req = payload.get("model", "both")

        result = {}

        if model_req in ("xgboost", "both"):
            xgb_pipe = load_model("xgboost")
            result["xgb_risk"] = round(float(xgb_pipe.predict_proba(features)[0, 1]), 4)

        if model_req in ("gbm", "both"):
            gbm_pipe = load_model("gbm")
            result["gbm_risk"] = round(float(gbm_pipe.predict_proba(features)[0, 1]), 4)

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
