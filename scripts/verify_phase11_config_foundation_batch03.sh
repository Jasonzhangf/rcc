#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase11_config_foundation.py
bash scripts/verify_phase11_config_foundation_batch02.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-router -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::batch03_config_router_bootstrap_feeds_router_candidates -- --exact
echo "PHASE11_CONFIG_ROUTER_BOOTSTRAP: PASS"
