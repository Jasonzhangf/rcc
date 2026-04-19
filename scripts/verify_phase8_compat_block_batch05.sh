#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase8_compat_block.py
bash scripts/verify_phase8_compat_block_batch04.sh
test -f docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md

echo "PHASE8_COMPAT_BLOCK_BATCH05: PASS"
