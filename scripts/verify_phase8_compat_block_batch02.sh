#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase8_compat_block.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-host -p rcc-core-testkit
BASELINE_CONFIG="$(mktemp)"
rm -f "$BASELINE_CONFIG"
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" smoke
