#!/usr/bin/env bash
set -euo pipefail

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase9_hub_pipeline.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-pipeline -p rcc-core-orchestrator -p rcc-core-testkit
