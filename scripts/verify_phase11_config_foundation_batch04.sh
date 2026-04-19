#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase11_config_foundation.py
bash scripts/verify_phase11_config_foundation_batch03.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::from_config_exposes_runtime_router_selection -- --exact

RUNTIME_CONFIG="$(mktemp)"
RUNTIME_LOG="$(mktemp)"
RUNTIME_RESPONSE="$(mktemp)"
HOST_PID=""

cleanup() {
  if [ -n "$HOST_PID" ] && kill -0 "$HOST_PID" 2>/dev/null; then
    kill "$HOST_PID"
    wait "$HOST_PID" 2>/dev/null || true
  fi
  rm -f "$RUNTIME_CONFIG" "$RUNTIME_LOG" "$RUNTIME_RESPONSE"
}
trap cleanup EXIT

HOST_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"

cat >"$RUNTIME_CONFIG" <<EOF
{
  "host": {
    "server": {
      "addr": "127.0.0.1:${HOST_PORT}"
    }
  },
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "id": "default-primary",
          "targets": ["openai.primary.gpt-5"]
        }
      ],
      "multimodal": [
        {
          "targets": ["openai.vision.gpt-4o"]
        }
      ]
    }
  }
}
EOF

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$RUNTIME_CONFIG" serve >"$RUNTIME_LOG" 2>&1 &
HOST_PID=$!

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${HOST_PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.25
done

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","input":[{"type":"input_text","text":"继续执行"},{"type":"input_image","image_url":"file://whiteboard.png"}]}' \
  "http://127.0.0.1:${HOST_PORT}/v1/responses" >"$RUNTIME_RESPONSE"

python3 - "$RUNTIME_RESPONSE" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert response["route"]["target_block"] == "pipeline", response
assert response["route"]["selected_route"] == "multimodal", response
assert response["route"]["candidate_routes"] == ["multimodal", "default"], response
print("PHASE11_CONFIG_RUNTIME_ROUTER_VISIBLE: PASS")
PY

echo "PHASE11_CONFIG_RUNTIME_ROUTER_HANDOFF: PASS"
