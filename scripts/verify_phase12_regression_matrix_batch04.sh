#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase12_regression_matrix.py
bash scripts/verify_phase12_regression_matrix_batch01.sh
bash scripts/verify_phase12_regression_matrix_batch02.sh
bash scripts/verify_phase12_regression_matrix_batch03.sh

echo "PHASE12_REGRESSION_MATRIX_BATCH04: PASS"
