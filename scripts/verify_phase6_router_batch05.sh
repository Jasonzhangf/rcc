#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase6_router_block.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-compat -p rcc-core-provider -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-router tests::runtime_router_selects_target_from_bootstrap_pools -- --exact
BASELINE_CONFIG="$(mktemp)"
rm -f "$BASELINE_CONFIG"
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" smoke
