#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase8_compat_block.py
bash scripts/verify_phase8_compat_block_batch05.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain compat_request_projection::tests::request_projection_spec_selects_anthropic_and_gemini_targets -- --exact
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain compat_request_projection::tests::build_request_projection_for_target_keeps_anthropic_and_gemini_shapes_stable -- --exact

echo "PHASE8_COMPAT_BLOCK_BATCH06: PASS"
