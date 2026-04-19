#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase12_regression_matrix.py
bash scripts/verify_phase12_regression_matrix_batch04.sh
test -f docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md

echo "PHASE12_REGRESSION_MATRIX_BATCH05: PASS"
