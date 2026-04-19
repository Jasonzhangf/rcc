#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase13_responses_continuation_matrix.py

cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain
cargo test --manifest-path rust/Cargo.toml -p rcc-core-pipeline canonical_pipeline_
cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit phase13_batch01_responses_continuation_smoke

echo "PHASE13_RESPONSES_CONTINUATION_MATRIX_BATCH01: PASS"
