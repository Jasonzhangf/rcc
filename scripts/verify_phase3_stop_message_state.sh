#!/usr/bin/env bash
set -euo pipefail

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase3_pure_functions.py
test -f rust/crates/rcc-core-domain/src/stop_message_state.rs
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain
