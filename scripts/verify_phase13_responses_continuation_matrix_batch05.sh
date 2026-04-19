#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase13_responses_continuation_matrix.py
bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh
test -f docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_CLOSEOUT.md

echo "PHASE13_RESPONSES_CONTINUATION_MATRIX_BATCH05: PASS"
