#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase8_compat_block.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-orchestrator -p rcc-core-testkit
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::canonical_responses_path_projects_gemini_request_shape_through_compat -- --exact
