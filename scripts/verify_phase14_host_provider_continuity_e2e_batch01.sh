#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase14_host_provider_continuity_e2e.py
python3 scripts/verify_phase10_responses_provider_execute.py
python3 scripts/verify_phase13_responses_continuation_matrix.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain serialize_responses_shell_projects_continuity_from_raw_response_body -- --exact
cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only -- --exact

pick_port() {
  python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
}

wait_http_ready() {
  local url="$1"
  local log_file="$2"
  for _ in $(seq 1 40); do
    if curl --silent --fail "$url" >/dev/null; then
      return 0
    fi
    sleep 0.25
  done
  echo "host server did not become ready: $url" >&2
  cat "$log_file" >&2 || true
  return 1
}

HOST_PORT="$(pick_port)"
UPSTREAM_PORT="$(pick_port)"
HOST_LOG="$(mktemp)"
UPSTREAM_LOG="$(mktemp)"
CONFIG_FILE="$(mktemp)"
RESPONSE_FILE="$(mktemp)"
REQUEST_FILE="$(mktemp)"
HOST_PID=""
UPSTREAM_PID=""

cleanup() {
  for pid_var in HOST_PID UPSTREAM_PID; do
    pid="${!pid_var}"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      wait "$pid" 2>/dev/null || true
    fi
  done
  rm -f "$HOST_LOG" "$UPSTREAM_LOG" "$CONFIG_FILE" "$RESPONSE_FILE" "$REQUEST_FILE"
}
trap cleanup EXIT

python3 -u - "$UPSTREAM_PORT" "$REQUEST_FILE" >"$UPSTREAM_LOG" 2>&1 <<'PY' &
import http.server
import json
import pathlib
import socketserver
import sys

port = int(sys.argv[1])
request_file = pathlib.Path(sys.argv[2])

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length).decode()
        request_file.write_text(json.dumps({
            'path': self.path,
            'headers': dict(self.headers),
            'body': body,
        }))
        response_body = json.dumps({
            'id': 'msg_restore_1',
            'type': 'message',
            'role': 'assistant',
            'content': [
                {'type': 'text', 'text': '我来查询股价'},
                {'type': 'tool_use', 'id': 'call_lookup_price', 'name': 'lookup_price', 'input': {'ticker': 'AAPL'}}
            ],
            'stop_reason': 'tool_use'
        }).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def log_message(self, format, *args):
        return

with socketserver.TCPServer(('127.0.0.1', port), Handler) as server:
    server.handle_request()
PY
UPSTREAM_PID=$!

cat >"$CONFIG_FILE" <<EOF
{
  "virtualrouter": {
    "providers": {
      "anthropic": {
        "enabled": true,
        "type": "anthropic",
        "baseURL": "http://127.0.0.1:${UPSTREAM_PORT}",
        "auth": {
          "type": "apikey",
          "apiKey": "sk-anthropic"
        }
      }
    },
    "routing": {
      "default": [
        {
          "targets": ["anthropic.claude-sonnet-4-5"]
        }
      ]
    }
  }
}
EOF

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$CONFIG_FILE" serve --addr "127.0.0.1:${HOST_PORT}" >"$HOST_LOG" 2>&1 &
HOST_PID=$!
wait_http_ready "http://127.0.0.1:${HOST_PORT}/healthz" "$HOST_LOG"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5","input":"查询股价"}' \
  "http://127.0.0.1:${HOST_PORT}/v1/responses" >"$RESPONSE_FILE"

python3 - "$RESPONSE_FILE" "$REQUEST_FILE" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
request = json.loads(pathlib.Path(sys.argv[2]).read_text())
headers = {k.lower(): v for k, v in request['headers'].items()}

assert response['object'] == 'response', response
assert response['status'] == 'requires_action', response
assert response['id'] == 'msg_restore_1', response
assert response['provider_runtime'] == 'transport-runtime', response
assert response['route']['target_block'] == 'pipeline', response
assert response['route']['selected_target'] == 'anthropic.claude-sonnet-4-5', response
assert response['required_action']['submit_tool_outputs']['tool_calls'][0]['tool_call_id'] == 'call_lookup_price', response
assert response['required_action']['submit_tool_outputs']['tool_calls'][0]['name'] == 'lookup_price', response
assert response['output'][0]['content'][0]['text'] == '我来查询股价', response

assert request['path'] == '/v1/messages', request
assert 'x-api-key' in headers, request
assert 'anthropic-version' in headers, request
assert '\"messages\"' in request['body'], request
assert '查询股价' in request['body'], request
assert '\"input\"' not in request['body'], request
print('PHASE14_HOST_PROVIDER_CONTINUITY_E2E_BATCH01: PASS')
PY
