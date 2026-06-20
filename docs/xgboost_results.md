# XGBoost Hyperparameter Search Results

## Dataset

| Metric | Value |
|---|---|
| Samples (labeled) | 1003 |
| Features | 12 |
| Positive (big_drop) | 54 (5.4%) |
| Negative (no_signal) | 949 (94.6%) |
| Excluded (mod_drop) | 207 |

## Comparison: GBM vs XGBoost

| Model | 5-Fold CV AUC | Parameters |
|---|---|---|
| GradientBoostingClassifier (original) | **0.6639 ± 0.1030** | n_estimators=300, lr=0.05, max_depth=4, subsample=0.8 |
| XGBoost (GridSearchCV) | **0.6833** | {"colsample_bytree": 1.0, "learning_rate": 0.1, "max_depth": 6, "n_estimators": 300, "scale_pos_weight": 18, "subsample": 0.8} |

## Best XGBoost Parameters

```json
{
  "colsample_bytree": 1.0,
  "learning_rate": 0.1,
  "max_depth": 6,
  "n_estimators": 300,
  "scale_pos_weight": 18,
  "subsample": 0.8
}
```

## Best XGBoost CV AUC: **0.6833**

## XGBoost Feature Importances

| Feature | Importance |
|---|---|
| ll97_penalty_2024_log | 0.2074 |
| energy_star | 0.1179 |
| log_ghg | 0.1002 |
| ll97_penalty_2030_log | 0.0947 |
| log_steam | 0.0841 |
| log_dob_jobs | 0.0827 |
| year_built | 0.0790 |
| peer_score | 0.0706 |
| steam_ghg_share | 0.0679 |
| cluster_id | 0.0530 |
| use_type_ord | 0.0425 |
| ll97_over_2024 | 0.0000 |

## GBM Feature Importances (original model, full training)

| Feature | Importance |
|---|---|
| steam_ghg_share | 0.1547 |
| log_ghg | 0.1522 |
| ll97_penalty_2030_log | 0.1339 |
| log_steam | 0.1159 |
| energy_star | 0.1030 |
| peer_score | 0.1024 |
| year_built | 0.0956 |
| ll97_penalty_2024_log | 0.0681 |
| log_dob_jobs | 0.0467 |
| cluster_id | 0.0148 |
| use_type_ord | 0.0110 |
| ll97_over_2024 | 0.0017 |

## Interpretation

- **Baseline AUC (no-skill):** 0.500
- **Original GBM:** 0.6639 ± 0.1030
- **XGBoost best:** 0.6833
- **Δ vs GBM:** +0.0195 (improvement)

## Notes

- Labels: big_drop (≥50% steam decline) = 1, no_signal = 0, mod_drop excluded
- Cross-validation: StratifiedKFold 5-fold, scoring='roc_auc'
- XGBoost uses scale_pos_weight to handle class imbalance
- Features scaled with StandardScaler before training
