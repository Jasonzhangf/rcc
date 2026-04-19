#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh

cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain continuation_semantics
cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit phase13_batch02_responses_continuation_semantics_smoke

echo "PHASE13_RESPONSES_CONTINUATION_MATRIX_BATCH02: PASS"
