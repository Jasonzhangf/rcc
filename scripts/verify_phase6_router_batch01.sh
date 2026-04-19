#!/usr/bin/env bash
set -euo pipefail
HOST_BUNDLED_CONFIG_PATH="$(mktemp)"
rm -f "$HOST_BUNDLED_CONFIG_PATH"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase6_router_block.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-testkit
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$HOST_BUNDLED_CONFIG_PATH"
