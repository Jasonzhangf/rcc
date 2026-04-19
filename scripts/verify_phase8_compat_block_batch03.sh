#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase6_router_block.py
python3 scripts/verify_phase8_compat_block.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-orchestrator -p rcc-core-provider -p rcc-core-host -p rcc-core-testkit
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::handle_hands_route_handoff_to_provider_runtime -- --exact
BASELINE_CONFIG="$(mktemp)"
rm -f "$BASELINE_CONFIG"
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" smoke
