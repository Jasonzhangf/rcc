#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase14_host_provider_continuity_e2e.py
python3 scripts/verify_phase10_responses_provider_execute.py
python3 scripts/verify_phase13_responses_continuation_matrix.py

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
CREATE_RESPONSE="$(mktemp)"
SUBMIT_RESPONSE="$(mktemp)"
UPSTREAM_CREATE_REQUEST="$(mktemp)"
UPSTREAM_SUBMIT_REQUEST="$(mktemp)"
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
  rm -f "$HOST_LOG" "$UPSTREAM_LOG" "$CONFIG_FILE" "$CREATE_RESPONSE" "$SUBMIT_RESPONSE" "$UPSTREAM_CREATE_REQUEST" "$UPSTREAM_SUBMIT_REQUEST"
}
trap cleanup EXIT

python3 -u - "$UPSTREAM_PORT" "$UPSTREAM_CREATE_REQUEST" "$UPSTREAM_SUBMIT_REQUEST" >"$UPSTREAM_LOG" 2>&1 <<'PY' &
import http.server
import json
import pathlib
import socketserver
import sys

port = int(sys.argv[1])
create_file = pathlib.Path(sys.argv[2])
submit_file = pathlib.Path(sys.argv[3])
request_count = 0

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global request_count
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length).decode()
        target = create_file if request_count == 0 else submit_file
        target.write_text(json.dumps({
            'path': self.path,
            'headers': dict(self.headers),
            'body': body,
        }))
        if request_count == 0:
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
        else:
            response_body = json.dumps({
                'text': 'legacy-anthropic-restored-hit'
            }).encode()
        request_count += 1
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def log_message(self, format, *args):
        return

with socketserver.TCPServer(('127.0.0.1', port), Handler) as server:
    server.handle_request()
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
  "http://127.0.0.1:${HOST_PORT}/v1/responses" >"$CREATE_RESPONSE"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5","response_id":"msg_restore_1","tool_outputs":[{"tool_call_id":"call_lookup_price","output":"AAPL: 189.10"}]}' \
  "http://127.0.0.1:${HOST_PORT}/v1/responses" >"$SUBMIT_RESPONSE"

python3 - "$CREATE_RESPONSE" "$SUBMIT_RESPONSE" "$UPSTREAM_CREATE_REQUEST" "$UPSTREAM_SUBMIT_REQUEST" <<'PY'
import json
import pathlib
import sys

create_response = json.loads(pathlib.Path(sys.argv[1]).read_text())
submit_response = json.loads(pathlib.Path(sys.argv[2]).read_text())
create_request = json.loads(pathlib.Path(sys.argv[3]).read_text())
submit_request = json.loads(pathlib.Path(sys.argv[4]).read_text())
submit_headers = {k.lower(): v for k, v in submit_request['headers'].items()}

assert create_response['object'] == 'response', create_response
assert create_response['status'] == 'requires_action', create_response
assert create_response['id'] == 'msg_restore_1', create_response
assert create_response['provider_runtime'] == 'transport-runtime', create_response
assert create_response['required_action']['submit_tool_outputs']['tool_calls'][0]['tool_call_id'] == 'call_lookup_price', create_response

assert submit_response['object'] == 'response', submit_response
assert submit_response['status'] == 'completed', submit_response
assert submit_response['provider_runtime'] == 'transport-runtime', submit_response
assert submit_response['output'][0]['content'][0]['text'] == 'legacy-anthropic-restored-hit', submit_response
assert submit_response['route']['selected_target'] == 'anthropic.claude-sonnet-4-5', submit_response

assert create_request['path'] == '/v1/messages', create_request
assert '\"messages\"' in create_request['body'], create_request
assert '查询股价' in create_request['body'], create_request

assert submit_request['path'] == '/v1/messages', submit_request
assert 'x-api-key' in submit_headers, submit_request
assert 'anthropic-version' in submit_headers, submit_request
assert '\"tool_use\"' in submit_request['body'], submit_request
assert '\"tool_result\"' in submit_request['body'], submit_request
assert '\"response_id\"' not in submit_request['body'], submit_request
assert '\"tool_outputs\"' not in submit_request['body'], submit_request
print('PHASE14_HOST_PROVIDER_CONTINUITY_E2E_BATCH02: PASS')
PY
