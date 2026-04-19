#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase11_config_foundation.py
bash scripts/verify_phase11_config_foundation_batch04.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-provider -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config tests::load_config_projects_legacy_provider_targets_into_runtime_registry -- --exact
