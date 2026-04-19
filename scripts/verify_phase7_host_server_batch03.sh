#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase7_host_server.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit
BASELINE_CONFIG="$(mktemp)"
rm -f "$BASELINE_CONFIG"
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" smoke

PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"

LOG_FILE="$(mktemp)"
HEALTH_FILE="$(mktemp)"
SMOKE_FILE="$(mktemp)"
REQUEST_FILE="$(mktemp)"
CHAT_FILE="$(mktemp)"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE" "$HEALTH_FILE" "$SMOKE_FILE" "$REQUEST_FILE" "$CHAT_FILE"
}
trap cleanup EXIT

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" serve --addr "127.0.0.1:${PORT}" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${PORT}/healthz" >"$HEALTH_FILE"; then
    break
  fi
  sleep 0.25
done

if ! [ -s "$HEALTH_FILE" ]; then
  echo "phase7 host server did not become ready" >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
fi

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"operation":"smoke","payload":"phase7-batch03"}' \
  "http://127.0.0.1:${PORT}/smoke" >"$SMOKE_FILE"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"operation":"tool.followup","payload":{"captured":{"model":"gpt-5","messages":[]},"followup_text":"继续执行"}}' \
  "http://127.0.0.1:${PORT}/requests" >"$REQUEST_FILE"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","messages":[{"role":"user","content":"继续执行"}]}' \
  "http://127.0.0.1:${PORT}/chat" >"$CHAT_FILE"

python3 - "$HEALTH_FILE" "$SMOKE_FILE" "$REQUEST_FILE" "$CHAT_FILE" <<'PY'
import json
import pathlib
import sys

health = json.loads(pathlib.Path(sys.argv[1]).read_text())
smoke = json.loads(pathlib.Path(sys.argv[2]).read_text())
request = json.loads(pathlib.Path(sys.argv[3]).read_text())
chat = json.loads(pathlib.Path(sys.argv[4]).read_text())

assert health['status'] == 'ok', health
assert health['service'] == 'rcc-core-host', health

assert smoke['ok'] is True, smoke
assert smoke['request']['operation'] == 'smoke', smoke
assert smoke['request']['payload'] == 'phase7-batch03', smoke
assert smoke['response']['route']['target_block'] == 'pipeline', smoke
assert smoke['response']['provider_runtime'] == 'noop-runtime', smoke
assert smoke['response']['tool_plan']['scheduled'] == [], smoke
assert 'phase7-batch03' in smoke['response']['payload'], smoke

assert request['ok'] is True, request
assert request['request']['operation'] == 'tool.followup', request
assert request['request']['payload']['captured']['model'] == 'gpt-5', request
assert request['request']['payload']['followup_text'] == '继续执行', request
assert request['response']['route']['target_block'] == 'servertool', request
assert request['response']['provider_runtime'] == 'noop-runtime', request
assert request['response']['tool_plan']['scheduled'] == ['servertool.followup.request'], request
assert 'tool.followup' in request['response']['payload'], request

assert chat['ok'] is True, chat
assert chat['request']['operation'] == 'chat', chat
assert chat['request']['payload']['model'] == 'gpt-5', chat
assert chat['request']['payload']['messages'][0]['role'] == 'user', chat
assert chat['response']['route']['target_block'] == 'pipeline', chat
assert chat['response']['provider_runtime'] == 'noop-runtime', chat
assert chat['response']['tool_plan']['scheduled'] == [], chat
assert 'operation=chat' in chat['response']['payload'], chat
print('PHASE7_HOST_SERVER_BATCH03_HTTP: PASS')
PY
