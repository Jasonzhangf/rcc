#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase13_responses_continuation_matrix.py
bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh
bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh
bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh

echo "PHASE13_RESPONSES_CONTINUATION_MATRIX_BATCH04: PASS"
