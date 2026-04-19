#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase1_foundation.py
python3 scripts/verify_phase2_architecture_docs.py
python3 scripts/verify_phase7_host_server.py
python3 scripts/verify_phase10_responses_provider_execute.py
python3 scripts/verify_phase11_config_foundation.py
bash scripts/verify_phase7_host_server_batch04.sh
bash scripts/verify_phase10_responses_provider_execute_batch01.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-host
BASELINE_CONFIG="$(mktemp)"
rm -f "$BASELINE_CONFIG"
cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$BASELINE_CONFIG" smoke

SMOKE_CONFIG="$(mktemp)"
HOST_CONFIG="$(mktemp)"
TRANSPORT_CONFIG="$(mktemp)"
SMOKE_LOG="$(mktemp)"
HOST_LOG="$(mktemp)"
TRANSPORT_HOST_LOG="$(mktemp)"
UPSTREAM_LOG="$(mktemp)"
HOST_HEALTH="$(mktemp)"
HOST_SMOKE="$(mktemp)"
RESPONSES_FILE="$(mktemp)"
HOST_PID=""
TRANSPORT_HOST_PID=""
UPSTREAM_PID=""

cleanup() {
  if [ -n "$HOST_PID" ] && kill -0 "$HOST_PID" 2>/dev/null; then
    kill "$HOST_PID"
    wait "$HOST_PID" 2>/dev/null || true
  fi
  if [ -n "$TRANSPORT_HOST_PID" ] && kill -0 "$TRANSPORT_HOST_PID" 2>/dev/null; then
    kill "$TRANSPORT_HOST_PID"
    wait "$TRANSPORT_HOST_PID" 2>/dev/null || true
  fi
  if [ -n "$UPSTREAM_PID" ] && kill -0 "$UPSTREAM_PID" 2>/dev/null; then
    kill "$UPSTREAM_PID"
    wait "$UPSTREAM_PID" 2>/dev/null || true
  fi
  rm -f "$BASELINE_CONFIG" "$SMOKE_CONFIG" "$HOST_CONFIG" "$TRANSPORT_CONFIG" \
    "$SMOKE_LOG" "$HOST_LOG" "$TRANSPORT_HOST_LOG" "$UPSTREAM_LOG" \
    "$HOST_HEALTH" "$HOST_SMOKE" "$RESPONSES_FILE"
}
trap cleanup EXIT

HOST_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"

UPSTREAM_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"

TRANSPORT_HOST_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"

cat >"$SMOKE_CONFIG" <<EOF
{
  "host": {
    "defaults": {
      "smoke": {
        "payload": "phase11-user-override"
      }
    }
  }
}
EOF

cat >"$HOST_CONFIG" <<EOF
{
  "host": {
    "server": {
      "addr": "127.0.0.1:${HOST_PORT}"
    },
    "defaults": {
      "smoke": {
        "payload": "phase11-host-config"
      }
    }
  }
}
EOF

cat >"$TRANSPORT_CONFIG" <<EOF
{
  "host": {
    "server": {
      "addr": "127.0.0.1:${TRANSPORT_HOST_PORT}"
    }
  },
  "provider": {
    "runtime": {
      "kind": "transport",
      "transport": {
        "base_url": "http://127.0.0.1:${UPSTREAM_PORT}"
      }
    }
  }
}
EOF

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$SMOKE_CONFIG" smoke >"$SMOKE_LOG"

python3 - "$SMOKE_LOG" <<'PY'
import pathlib
import sys

summary = pathlib.Path(sys.argv[1]).read_text().strip()
assert 'host=thin' in summary, summary
assert 'runtime=noop-runtime' in summary, summary
assert 'phase11-user-override' in summary, summary
print('PHASE11_CONFIG_SMOKE_OVERRIDE: PASS')
PY

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$HOST_CONFIG" serve >"$HOST_LOG" 2>&1 &
HOST_PID=$!

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${HOST_PORT}/healthz" >"$HOST_HEALTH"; then
    break
  fi
  sleep 0.25
done

if ! [ -s "$HOST_HEALTH" ]; then
  echo "phase11 host(config) server did not become ready" >&2
  cat "$HOST_LOG" >&2 || true
  exit 1
fi

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{}' \
  "http://127.0.0.1:${HOST_PORT}/smoke" >"$HOST_SMOKE"

python3 - "$HOST_HEALTH" "$HOST_SMOKE" <<'PY'
import json
import pathlib
import sys

health = json.loads(pathlib.Path(sys.argv[1]).read_text())
smoke = json.loads(pathlib.Path(sys.argv[2]).read_text())

assert health['status'] == 'ok', health
assert health['service'] == 'rcc-core-host', health
assert smoke['ok'] is True, smoke
assert smoke['request']['operation'] == 'smoke', smoke
assert smoke['request']['payload'] == 'phase11-host-config', smoke
assert smoke['response']['provider_runtime'] == 'noop-runtime', smoke
assert 'phase11-host-config' in smoke['response']['payload'], smoke
print('PHASE11_CONFIG_HOST_ADDR_AND_SMOKE: PASS')
PY

python3 - "$UPSTREAM_PORT" >"$UPSTREAM_LOG" 2>&1 <<'PY' &
import json
import socket
import sys

port = int(sys.argv[1])
listener = socket.socket()
listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listener.bind(('127.0.0.1', port))
listener.listen(1)
conn, _ = listener.accept()
request = b''
while b'\r\n\r\n' not in request:
    chunk = conn.recv(4096)
    if not chunk:
        break
    request += chunk
headers, _, rest = request.partition(b'\r\n\r\n')
content_length = 0
for line in headers.decode('utf-8', errors='ignore').split('\r\n'):
    if ':' not in line:
        continue
    name, value = line.split(':', 1)
    if name.strip().lower() == 'content-length':
        content_length = int(value.strip())
while len(rest) < content_length:
    chunk = conn.recv(4096)
    if not chunk:
        break
    rest += chunk
body = json.dumps({"text": "phase11-transport-runtime"})
response = (
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json\r\n"
    f"Content-Length: {len(body)}\r\n"
    "\r\n"
    f"{body}"
)
conn.sendall(response.encode('utf-8'))
conn.close()
listener.close()
PY
UPSTREAM_PID=$!

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$TRANSPORT_CONFIG" serve >"$TRANSPORT_HOST_LOG" 2>&1 &
TRANSPORT_HOST_PID=$!

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${TRANSPORT_HOST_PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.25
done

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","input":"继续执行"}' \
  "http://127.0.0.1:${TRANSPORT_HOST_PORT}/v1/responses" >"$RESPONSES_FILE"

python3 - "$RESPONSES_FILE" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert response['object'] == 'response', response
assert response['status'] == 'completed', response
assert response['provider_runtime'] == 'transport-runtime', response
assert response['output'][0]['content'][0]['text'] == 'phase11-transport-runtime', response
print('PHASE11_CONFIG_TRANSPORT_HOST: PASS')
PY
