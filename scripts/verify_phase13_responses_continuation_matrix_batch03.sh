#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh

cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain serialize_responses_shell_
cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit phase13_batch03_responses_shell_continuity_smoke

echo "PHASE13_RESPONSES_CONTINUATION_MATRIX_BATCH03: PASS"
