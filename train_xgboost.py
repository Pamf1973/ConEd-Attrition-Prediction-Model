#!/usr/bin/env python3
"""
XGBoost Hyperparameter Search for Steam Attrition Model
Compares GridSearchCV XGBClassifier with the original GradientBoostingClassifier.

Run: .ml_venv/bin/python3.13 train_xgboost.py
"""

import json, os, sys, hashlib, subprocess, datetime
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

# ── Import model building functions from ll97_model.py ───────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ll97_model import load_data, build_rows, make_labels, FEATURES, compute_shap_drivers, update_enrichment

try:
    import shap as _shap_mod
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

# ── XGBoost (optional — graceful fallback if import fails) ───────────────────
try:
    import xgboost as xgb
    from sklearn.model_selection import GridSearchCV
    HAS_XGB = True
    print(f"XGBoost version: {xgb.__version__}")
except ImportError as e:
    HAS_XGB = False
    print(f"XGBoost not available: {e}")


def format_auc(val, std=None):
    """Format AUC ± std for display."""
    if std is not None:
        return f"{val:.4f} ± {std:.4f}"
    return f"{val:.4f}"


def train_gbm(X, y):
    """Train the original GradientBoosting model for comparison."""
    clf = GradientBoostingClassifier(
        n_estimators=300, learning_rate=0.05,
        max_depth=4, subsample=0.8,
        random_state=42,
    )
    pipe = Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(pipe, X, y, cv=skf, scoring="roc_auc")
    return scores.mean(), scores.std(), pipe


def compute_scale_pos_weight(y):
    """Compute scale_pos_weight = neg_count / pos_count for XGBoost."""
    pos = int(np.sum(y))
    neg = int(len(y) - pos)
    return neg / pos


def run_xgboost_grid_search(X, y):
    """Run GridSearchCV with XGBClassifier."""
    pos = int(np.sum(y))
    neg = int(len(y) - pos)
    scale_pos = neg / pos
    print(f"Class balance: {pos} positive, {neg} negative (scale_pos_weight={scale_pos:.2f})")

    # ── XGBoost with scaled data ────────────────────────────────────────────
    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X)

    # ── Define the full parameter grid ──────────────────────────────────────
    param_grid = {
        "n_estimators":      [100, 200, 300, 500],
        "max_depth":         [3, 4, 6, 8],
        "learning_rate":     [0.01, 0.05, 0.1],
        "subsample":         [0.7, 0.8, 1.0],
        "colsample_bytree":  [0.7, 0.8, 1.0],
        "min_child_weight":  [1, 3, 5],
        "scale_pos_weight":  [1, round(scale_pos)],
    }
    n_full = 1
    for v in param_grid.values():
        n_full *= len(v)
    print(f"\nFull grid size: {n_full:,} combinations")

    # ── Use smaller grid if full grid is too large ──────────────────────────
    if n_full > 200:
        print("Full grid exceeds 200 combinations — using reduced grid")
        param_grid = {
            "n_estimators":      [200, 300],
            "max_depth":         [4, 6],
            "learning_rate":     [0.05, 0.1],
            "subsample":         [0.8, 1.0],
            "colsample_bytree":  [0.8, 1.0],
            "scale_pos_weight":  [1, round(scale_pos)],
        }

    n_reduced = 1
    for v in param_grid.values():
        n_reduced *= len(v)
    print(f"Search grid: {n_reduced:,} combinations × 5 folds = {n_reduced * 5:,} fits")

    xgb_clf = xgb.XGBClassifier(
        random_state=42,
        verbosity=0,
        use_label_encoder=False,
        eval_metric="logloss",
        n_jobs=-1,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    gs = GridSearchCV(
        estimator=xgb_clf,
        param_grid=param_grid,
        scoring="roc_auc",
        cv=cv,
        n_jobs=-1,
        verbose=1,
    )

    gs.fit(X_sc, y)

    return gs, scaler, scale_pos


def main():
    print("=" * 70)
    print("  XGBoost Hyperparameter Search — Steam Attrition Model")
    print("=" * 70)

    # ── Load data ────────────────────────────────────────────────────────────
    print("\n[1/5] Loading data...")
    buildings, enrichment, peer, signals, floor_area, yoy = load_data()

    print("\n[2/5] Building feature matrix...")
    rows = build_rows(buildings, enrichment, peer, signals, floor_area, yoy)

    print("\n[3/5] Making labels (big_drop=1, no_signal=0, exclude mod_drop)...")
    labeled = make_labels(rows)

    X = np.array([[r[f] for f in FEATURES] for r, _ in labeled])
    y = np.array([lbl for _, lbl in labeled])

    pos_count = int(np.sum(y))
    neg_count = int(len(y) - pos_count)
    print(f"Feature matrix: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Labels: {pos_count} positive (churn), {neg_count} negative (no signal)")
    print(f"    => baseline AUC (no-skill): 0.500")

    results = {
        "n_samples":     X.shape[0],
        "n_features":    X.shape[1],
        "pos_count":     pos_count,
        "neg_count":     neg_count,
        "features":      FEATURES,
    }

    # ── Original GBM baseline ────────────────────────────────────────────────
    print("\n[4/5] Training original GradientBoosting baseline...")
    gbm_mean, gbm_std, gbm_pipe = train_gbm(X, y)
    gbm_result = f"{gbm_mean:.4f} ± {gbm_std:.4f}"
    print(f"  GBM 5-fold CV AUC: {gbm_result}")
    results["gbm_cv_auc_mean"] = round(gbm_mean, 4)
    results["gbm_cv_auc_std"]  = round(gbm_std, 4)

    # ── XGBoost GridSearch ───────────────────────────────────────────────────
    print("\n[5/5] Running XGBoost GridSearchCV...")
    if not HAS_XGB:
        print("  SKIPPED: XGBoost not available")
        results["xgboost"] = {"status": "skipped", "reason": "XGBoost not installed"}
    else:
        gs, scaler, scale_pos = run_xgboost_grid_search(X, y)

        best_params = gs.best_params_
        best_score = gs.best_score_

        print(f"\n  Best CV AUC: {best_score:.4f}")
        print(f"  Best params:")
        for k, v in sorted(best_params.items()):
            print(f"    {k}: {v}")

        results["xgboost"] = {
            "status":            "completed",
            "best_cv_auc":       round(best_score, 4),
            "best_params":       best_params,
            "scale_pos_weight":  round(scale_pos, 2),
        }

        # ── Feature importances from best estimator ─────────────────────────
        best_xgb = gs.best_estimator_
        importances = sorted(
            zip(FEATURES, best_xgb.feature_importances_),
            key=lambda x: -x[1],
        )
        print(f"\n  Feature importances (XGBoost best):")
        results["xgboost"]["feature_importances"] = []
        for feat, imp in importances:
            print(f"    {feat:<30} {imp:.4f}")
            results["xgboost"]["feature_importances"].append({
                "feature": feat, "importance": round(imp, 4)
            })

        # ── Re-fit GBM on scaled data for fair full-training comparison ────
        print(f"\n  Training final GBM on full data for comparison...")
        scaler_gbm = StandardScaler()
        X_sc_gbm = scaler_gbm.fit_transform(X)
        gbm_final = GradientBoostingClassifier(
            n_estimators=300, learning_rate=0.05,
            max_depth=4, subsample=0.8,
            random_state=42,
        )
        gbm_final.fit(X_sc_gbm, y)
        gbm_importances = sorted(
            zip(FEATURES, gbm_final.feature_importances_),
            key=lambda x: -x[1],
        )
        results["gbm_feature_importances"] = []
        print(f"    GBM feature importances:")
        for feat, imp in gbm_importances:
            print(f"      {feat:<30} {imp:.4f}")
            results["gbm_feature_importances"].append({
                "feature": feat, "importance": round(imp, 4)
            })

    # ── Write results to docs/xgboost_results.md ────────────────────────────
    print("\n" + "=" * 70)
    print("  Writing results to docs/xgboost_results.md...")

    pos_pct = pos_count / len(y) * 100
    neg_pct = neg_count / len(y) * 100

    md = f"""# XGBoost Hyperparameter Search Results

## Dataset

| Metric | Value |
|---|---|
| Samples (labeled) | {X.shape[0]} |
| Features | {X.shape[1]} |
| Positive (big_drop) | {pos_count} ({pos_pct:.1f}%) |
| Negative (no_signal) | {neg_count} ({neg_pct:.1f}%) |
| Excluded (mod_drop) | {len(rows) - len(labeled)} |

## Comparison: GBM vs XGBoost

| Model | 5-Fold CV AUC | Parameters |
|---|---|---|
| GradientBoostingClassifier (original) | **{gbm_result}** | n_estimators=300, lr=0.05, max_depth=4, subsample=0.8 |
"""
    if HAS_XGB and results["xgboost"]["status"] == "completed":
        md += f"""| XGBoost (GridSearchCV) | **{best_score:.4f}** | {json.dumps(best_params)} |
"""

    if HAS_XGB and results["xgboost"]["status"] == "completed":
        md += f"""
## Best XGBoost Parameters

```json
{json.dumps(best_params, indent=2)}
```

## Best XGBoost CV AUC: **{best_score:.4f}**

## XGBoost Feature Importances

| Feature | Importance |
|---|---|
"""
        for fi in results["xgboost"]["feature_importances"]:
            md += f"""| {fi["feature"]} | {fi["importance"]:.4f} |
"""

    md += """
## GBM Feature Importances (original model, full training)

| Feature | Importance |
|---|---|
"""
    for fi in results.get("gbm_feature_importances", []):
        md += f"""| {fi["feature"]} | {fi["importance"]:.4f} |
"""

    md += f"""
## Interpretation

- **Baseline AUC (no-skill):** 0.500
- **Original GBM:** {gbm_result}
"""
    if HAS_XGB and results["xgboost"]["status"] == "completed":
        delta = best_score - gbm_mean
        direction = "improvement" if delta > 0 else "decrease"
        md += f"""- **XGBoost best:** {best_score:.4f}
- **Δ vs GBM:** {delta:+.4f} ({direction})
"""

    md += """
## Notes

- Labels: big_drop (≥50% steam decline) = 1, no_signal = 0, mod_drop excluded
- Cross-validation: StratifiedKFold 5-fold, scoring='roc_auc'
- XGBoost uses scale_pos_weight to handle class imbalance
- Features scaled with StandardScaler before training
"""

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "xgboost_results.md")
    with open(out_path, "w") as f:
        f.write(md)
    print(f"  Written: {out_path}")

    # ── Write data/model_meta.json ───────────────────────────────────────────
    if HAS_XGB and results["xgboost"]["status"] == "completed":
        cv_std = float(gs.cv_results_["std_test_score"][gs.best_index_])
        params_hash = hashlib.sha256(
            json.dumps(best_params, sort_keys=True).encode()
        ).hexdigest()[:12]
        try:
            commit = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True,
                cwd=os.path.dirname(os.path.abspath(__file__)),
            ).stdout.strip()
        except Exception:
            commit = ""
        meta = {
            "model_name":       "XGBoost Classifier",
            "model_version":    "XGB v1 · UNVAL",
            "params_hash":      params_hash,
            "commit":           commit,
            "cv_auc":           round(best_score, 4),
            "cv_std":           round(cv_std, 4),
            "cv_kfold":         5,
            "n_labeled":        X.shape[0],
            "n_positive":       pos_count,
            "run_date":         datetime.date.today().isoformat(),
            "label_definition": "big_drop (≥50% steam decline, 2yr window) = 1, no_signal = 0, mod_drop excluded",
            "validation_status": "unvalidated",
        }
        meta_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "model_meta.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        print(f"  Written: {meta_path}")

    # ── SHAP ml_drivers + enrichment write ──────────────────────────────────
    if HAS_XGB and results["xgboost"]["status"] == "completed":
        if not HAS_SHAP:
            print("\n  [shap] package not found — skipping ml_drivers write (pip install shap)")
        else:
            print("\n  Computing SHAP drivers for all buildings (this uses ALL rows, not just labeled)...")
            # predict_proba on ALL rows so ml_risk covers unlabeled buildings too
            X_all = np.array([[r[f] for f in FEATURES] for r in rows])
            X_all_sc = scaler.transform(X_all)
            probs_all = gs.best_estimator_.predict_proba(X_all_sc)[:, 1]

            drivers_all = compute_shap_drivers(gs.best_estimator_, scaler, rows, top_n=5)

            enrichment_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "buildingEnrichment.json")
            with open(enrichment_path) as f:
                enrichment_data = json.load(f)

            update_enrichment(enrichment_data, rows, probs_all, drivers_all)

            tmp_path = enrichment_path + ".tmp"
            try:
                with open(tmp_path, "w") as f:
                    json.dump(enrichment_data, f, indent=2)
                os.replace(tmp_path, enrichment_path)
            except Exception:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                raise

            print(f"  ml_risk + ml_drivers written for {len(rows)} buildings → {enrichment_path}")
            if rows:
                sample_addr = rows[0]["address"]
                sample_d = enrichment_data.get(sample_addr, {}).get("ml_drivers", [])
                if sample_d:
                    print(f"  Sample ({sample_addr}): top driver = {sample_d[0]['feature']} (contrib={sample_d[0]['contribution']:+.4f})")

    print("=" * 70)

    # ── Quick console summary ────────────────────────────────────────────────
    print(f"\n            {'GBM':>12}  {'XGBoost':>12}")
    print(f"  AUC      {gbm_mean:>10.4f}  {best_score if HAS_XGB else 0:>10.4f}  {'(best)' if HAS_XGB else '(N/A)'}")
    print()


if __name__ == "__main__":
    main()
