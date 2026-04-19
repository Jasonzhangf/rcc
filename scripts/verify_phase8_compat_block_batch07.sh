#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase8_compat_block.py
bash scripts/verify_phase8_compat_block_batch06.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain compat_request_projection::tests::request_projection_role_rules_cover_anthropic_and_gemini -- --exact
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain compat_request_projection::tests::request_projection_part_kind_rules_cover_text_and_tool_variants -- --exact

echo "PHASE8_COMPAT_BLOCK_BATCH07: PASS"
