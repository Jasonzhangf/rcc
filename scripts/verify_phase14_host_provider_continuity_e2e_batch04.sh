#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase14_host_provider_continuity_e2e.py
bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh
bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh
bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh

echo "PHASE14_HOST_PROVIDER_CONTINUITY_E2E_BATCH04: PASS"
