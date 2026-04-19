#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase8_compat_block.py
python3 scripts/verify_phase10_responses_provider_execute.py
python3 scripts/verify_phase11_config_foundation.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-config -p rcc-core-compat -p rcc-core-domain -p rcc-core-testkit -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::from_config_binds_selected_target_to_runtime_registry -- --exact
