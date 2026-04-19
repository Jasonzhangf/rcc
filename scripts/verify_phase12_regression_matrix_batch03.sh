#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/verify_phase12_regression_matrix.py

test -f fixtures/mock-provider/_registry/index.json
test -f fixtures/mock-provider/openai-responses.submit_tool_outputs/mock.apply_patch.toolloop/toolloop/20251208/000002/001/request.json
test -f fixtures/mock-provider/anthropic-messages/glm-anthropic.default.glm-4.6/glm-4.6/20251211/131154/001/request.json
test -f fixtures/mock-provider/openai-chat/glm.default.gpt-5.1-codex/gpt-5.1-codex/20251211/130247/001/request.json

cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit phase12_batch03_provider_compat_samples_smoke

echo "PHASE12_REGRESSION_MATRIX_BATCH03: PASS"
