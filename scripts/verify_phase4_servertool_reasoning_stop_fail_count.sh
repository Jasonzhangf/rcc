#!/usr/bin/env bash
set -euo pipefail

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase3_pure_functions.py
python3 scripts/verify_phase4_servertool_block.py
test -f rust/crates/rcc-core-servertool/src/reasoning_stop/fail_count.rs
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet
