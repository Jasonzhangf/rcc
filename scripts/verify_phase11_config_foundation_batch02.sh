#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase11_config_foundation.py
bash scripts/verify_phase11_config_foundation_batch01.sh
cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-host
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator \
  tests::from_config_projects_legacy_anthropic_provider_to_canonical_transport_request -- --exact

LEGACY_CONFIG="$(mktemp)"
UPSTREAM_LOG="$(mktemp)"
RESPONSES_FILE="$(mktemp)"
HOST_LOG="$(mktemp)"
UPSTREAM_PID=""
HOST_PID=""

cleanup() {
  if [ -n "$HOST_PID" ] && kill -0 "$HOST_PID" 2>/dev/null; then
    kill "$HOST_PID"
    wait "$HOST_PID" 2>/dev/null || true
  fi
  if [ -n "$UPSTREAM_PID" ] && kill -0 "$UPSTREAM_PID" 2>/dev/null; then
    kill "$UPSTREAM_PID"
    wait "$UPSTREAM_PID" 2>/dev/null || true
  fi
  rm -f "$LEGACY_CONFIG" "$UPSTREAM_LOG" "$RESPONSES_FILE" "$HOST_LOG"
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

cat >"$LEGACY_CONFIG" <<EOF
{
  "httpserver": {
    "host": "127.0.0.1",
    "port": ${HOST_PORT}
  },
  "virtualrouter": {
    "providers": {
      "alpha": {
        "enabled": true,
        "type": "responses",
        "baseURL": "http://127.0.0.1:${UPSTREAM_PORT}/alpha",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-alpha"
        }
      },
      "beta": {
        "enabled": true,
        "type": "openai",
        "baseURL": "http://127.0.0.1:${UPSTREAM_PORT}",
        "auth": {
          "type": "apikey",
          "apiKey": "\${BETA_PHASE11_KEY:-sk-beta}",
          "headerName": "x-api-key"
        }
      }
    },
    "routing": {
      "default": [
        {
          "targets": ["beta.gpt-5"]
        }
      ]
    }
  }
}
EOF

python3 - "$UPSTREAM_PORT" "$UPSTREAM_LOG" <<'PY' &
import json
import pathlib
import socket
import sys

port = int(sys.argv[1])
log_path = pathlib.Path(sys.argv[2])
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
headers_raw, _, rest = request.partition(b'\r\n\r\n')
headers_text = headers_raw.decode('utf-8', errors='ignore')
headers = {}
content_length = 0
for line in headers_text.split('\r\n')[1:]:
    if ':' not in line:
        continue
    name, value = line.split(':', 1)
    headers[name.strip().lower()] = value.strip()
    if name.strip().lower() == 'content-length':
        content_length = int(value.strip())
while len(rest) < content_length:
    chunk = conn.recv(4096)
    if not chunk:
        break
    rest += chunk
body_text = rest.decode('utf-8', errors='ignore')
log_path.write_text(json.dumps({
    "request_line": headers_text.split('\r\n')[0],
    "headers": headers,
    "body": json.loads(body_text or '{}')
}), encoding='utf-8')
body = json.dumps({"text": "phase11-legacy-provider"})
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

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$LEGACY_CONFIG" serve >"$HOST_LOG" 2>&1 &
HOST_PID=$!

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${HOST_PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.25
done

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","input":"继续执行"}' \
  "http://127.0.0.1:${HOST_PORT}/v1/responses" >"$RESPONSES_FILE"

python3 - "$RESPONSES_FILE" "$UPSTREAM_LOG" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
upstream = json.loads(pathlib.Path(sys.argv[2]).read_text())

assert response['object'] == 'response', response
assert response['status'] == 'completed', response
assert response['provider_runtime'] == 'transport-runtime', response
assert response['output'][0]['content'][0]['text'] == 'phase11-legacy-provider', response

assert upstream['request_line'].startswith('POST /responses '), upstream
assert upstream['headers']['x-api-key'] == 'sk-beta', upstream
assert upstream['body']['model'] == 'gpt-5', upstream
assert upstream['body']['input'] == '继续执行', upstream
print('PHASE11_CONFIG_LEGACY_PROVIDER_PROJECTION: PASS')
PY
