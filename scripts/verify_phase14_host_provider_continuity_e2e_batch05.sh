#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase14_host_provider_continuity_e2e.py
bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh
test -f docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md

echo "PHASE14_HOST_PROVIDER_CONTINUITY_E2E_BATCH05: PASS"
