#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase12_regression_matrix.py

cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain continuation_sticky_key
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain responses_cross_protocol_audit_records
cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit phase12_batch01_regression_smoke

echo "PHASE12_REGRESSION_MATRIX_BATCH01: PASS"
