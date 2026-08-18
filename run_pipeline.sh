#!/usr/bin/env bash
# ConEd steam attrition pipeline runner
# Usage: ./run_pipeline.sh [--full]
#   default: ll97_model.py only (fast, ~10s)
#   --full:  also runs train_xgboost.py GridSearchCV (slow, ~2-5min)

set -euo pipefail

PYTHON="${PYTHON:-python3.12}"
DIR="$(cd "$(dirname "$0")" && pwd)"

log() { echo "[pipeline] $*"; }

cd "$DIR"

log "snapshot — capturing enrichment state before run"
"$PYTHON" generate_events.py --snapshot

log "ll97 model — LL97 penalties + ml_risk + outlier fields"
"$PYTHON" ll97_model.py

if [[ "${1:-}" == "--full" ]]; then
  log "xgboost — hyperparameter search + model_meta.json (slow)"
  "$PYTHON" train_xgboost.py
fi

log "emit — diffing enrichment, writing events.json"
"$PYTHON" generate_events.py --emit

log "done."
