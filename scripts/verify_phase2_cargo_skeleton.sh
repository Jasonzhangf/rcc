#!/usr/bin/env bash
set -euo pipefail

python3 scripts/verify_phase2_architecture_docs.py
cargo check --manifest-path rust/Cargo.toml
cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet
