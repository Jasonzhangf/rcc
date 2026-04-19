#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase14_host_provider_continuity_e2e.py
python3 scripts/verify_phase10_responses_provider_execute.py
python3 scripts/verify_phase13_responses_continuation_matrix.py
cargo test --manifest-path rust/Cargo.toml -p rcc-core-pipeline canonical_pipeline_materializes_route_aware_previous_response_id_for_cross_provider -- --exact
cargo test --manifest-path rust/Cargo.toml -p rcc-core-pipeline canonical_pipeline_returns_explicit_error_for_unknown_response_id_restore -- --exact
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

stop_pid() {
  local pid="$1"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    wait "$pid" 2>/dev/null || true
  fi
}

write_config() {
  local config_file="$1"
  local upstream_port="$2"
  cat >"$config_file" <<EOF
{
  "virtualrouter": {
    "providers": {
      "anthropic": {
        "enabled": true,
        "type": "anthropic",
        "baseURL": "http://127.0.0.1:${upstream_port}",
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
}

HIT_HOST_PORT="$(pick_port)"
HIT_UPSTREAM_PORT="$(pick_port)"
HIT_HOST_LOG="$(mktemp)"
HIT_UPSTREAM_LOG="$(mktemp)"
HIT_CONFIG_FILE="$(mktemp)"
HIT_CREATE_RESPONSE="$(mktemp)"
HIT_CONTINUE_RESPONSE="$(mktemp)"
HIT_CREATE_REQUEST="$(mktemp)"
HIT_CONTINUE_REQUEST="$(mktemp)"
HIT_HOST_PID=""
HIT_UPSTREAM_PID=""

MISS_HOST_PORT="$(pick_port)"
MISS_UPSTREAM_PORT="$(pick_port)"
MISS_HOST_LOG="$(mktemp)"
MISS_UPSTREAM_LOG="$(mktemp)"
MISS_CONFIG_FILE="$(mktemp)"
MISS_RESPONSE="$(mktemp)"
MISS_UPSTREAM_REQUEST="$(mktemp)"
MISS_HOST_PID=""
MISS_UPSTREAM_PID=""

cleanup() {
  stop_pid "$HIT_HOST_PID"
  stop_pid "$HIT_UPSTREAM_PID"
  stop_pid "$MISS_HOST_PID"
  stop_pid "$MISS_UPSTREAM_PID"
  rm -f \
    "$HIT_HOST_LOG" "$HIT_UPSTREAM_LOG" "$HIT_CONFIG_FILE" \
    "$HIT_CREATE_RESPONSE" "$HIT_CONTINUE_RESPONSE" "$HIT_CREATE_REQUEST" "$HIT_CONTINUE_REQUEST" \
    "$MISS_HOST_LOG" "$MISS_UPSTREAM_LOG" "$MISS_CONFIG_FILE" \
    "$MISS_RESPONSE" "$MISS_UPSTREAM_REQUEST"
}
trap cleanup EXIT

python3 -u - "$HIT_UPSTREAM_PORT" "$HIT_CREATE_REQUEST" "$HIT_CONTINUE_REQUEST" >"$HIT_UPSTREAM_LOG" 2>&1 <<'PY' &
import http.server
import json
import pathlib
import socketserver
import sys

port = int(sys.argv[1])
create_file = pathlib.Path(sys.argv[2])
continue_file = pathlib.Path(sys.argv[3])
request_count = 0

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global request_count
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length).decode()
        target = create_file if request_count == 0 else continue_file
        target.write_text(json.dumps({
            'path': self.path,
            'headers': dict(self.headers),
            'body': body,
        }))
        if request_count == 0:
            response_body = json.dumps({
                'id': 'msg_prev_1',
                'type': 'message',
                'role': 'assistant',
                'content': [
                    {'type': 'text', 'text': 'legacy-anthropic-previous-seed'}
                ],
                'stop_reason': 'end_turn'
            }).encode()
        else:
            response_body = json.dumps({
                'id': 'msg_prev_2',
                'type': 'message',
                'role': 'assistant',
                'content': [
                    {'type': 'text', 'text': 'legacy-anthropic-previous-hit'}
                ],
                'stop_reason': 'end_turn'
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
HIT_UPSTREAM_PID=$!

write_config "$HIT_CONFIG_FILE" "$HIT_UPSTREAM_PORT"

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$HIT_CONFIG_FILE" serve --addr "127.0.0.1:${HIT_HOST_PORT}" >"$HIT_HOST_LOG" 2>&1 &
HIT_HOST_PID=$!
wait_http_ready "http://127.0.0.1:${HIT_HOST_PORT}/healthz" "$HIT_HOST_LOG"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5","input":"查询股价"}' \
  "http://127.0.0.1:${HIT_HOST_PORT}/v1/responses" >"$HIT_CREATE_RESPONSE"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5","previous_response_id":"msg_prev_1","input":"继续跟进"}' \
  "http://127.0.0.1:${HIT_HOST_PORT}/v1/responses" >"$HIT_CONTINUE_RESPONSE"

python3 - "$HIT_CREATE_RESPONSE" "$HIT_CONTINUE_RESPONSE" "$HIT_CREATE_REQUEST" "$HIT_CONTINUE_REQUEST" <<'PY'
import json
import pathlib
import sys

create_response = json.loads(pathlib.Path(sys.argv[1]).read_text())
continue_response = json.loads(pathlib.Path(sys.argv[2]).read_text())
create_request = json.loads(pathlib.Path(sys.argv[3]).read_text())
continue_request = json.loads(pathlib.Path(sys.argv[4]).read_text())

assert create_response['object'] == 'response', create_response
assert create_response['status'] == 'completed', create_response
assert create_response['id'] == 'msg_prev_1', create_response
assert create_response['provider_runtime'] == 'transport-runtime', create_response
assert create_response['route']['target_block'] == 'pipeline', create_response
assert create_response['route']['selected_target'] == 'anthropic.claude-sonnet-4-5', create_response
assert create_response['output'][0]['content'][0]['text'] == 'legacy-anthropic-previous-seed', create_response

assert continue_response['object'] == 'response', continue_response
assert continue_response['status'] == 'completed', continue_response
assert continue_response['id'] == 'msg_prev_2', continue_response
assert continue_response['previous_response_id'] == 'msg_prev_1', continue_response
assert continue_response['provider_runtime'] == 'transport-runtime', continue_response
assert continue_response['route']['selected_target'] == 'anthropic.claude-sonnet-4-5', continue_response
assert continue_response['output'][0]['content'][0]['text'] == 'legacy-anthropic-previous-hit', continue_response

assert create_request['path'] == '/v1/messages', create_request
assert '"messages"' in create_request['body'], create_request
assert '查询股价' in create_request['body'], create_request
assert '"previous_response_id"' not in create_request['body'], create_request

assert continue_request['path'] == '/v1/messages', continue_request
assert '"messages"' in continue_request['body'], continue_request
assert 'legacy-anthropic-previous-seed' in continue_request['body'], continue_request
assert '继续跟进' in continue_request['body'], continue_request
assert '"previous_response_id"' not in continue_request['body'], continue_request
assert '"response_id"' not in continue_request['body'], continue_request
assert '"tool_outputs"' not in continue_request['body'], continue_request
PY

stop_pid "$HIT_HOST_PID"
HIT_HOST_PID=""
stop_pid "$HIT_UPSTREAM_PID"
HIT_UPSTREAM_PID=""

rm -f "$MISS_UPSTREAM_REQUEST"

python3 -u - "$MISS_UPSTREAM_PORT" "$MISS_UPSTREAM_REQUEST" >"$MISS_UPSTREAM_LOG" 2>&1 <<'PY' &
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
            'id': 'unexpected_upstream_hit',
            'type': 'message',
            'role': 'assistant',
            'content': [
                {'type': 'text', 'text': 'unexpected'}
            ],
            'stop_reason': 'end_turn'
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
MISS_UPSTREAM_PID=$!

write_config "$MISS_CONFIG_FILE" "$MISS_UPSTREAM_PORT"

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$MISS_CONFIG_FILE" serve --addr "127.0.0.1:${MISS_HOST_PORT}" >"$MISS_HOST_LOG" 2>&1 &
MISS_HOST_PID=$!
wait_http_ready "http://127.0.0.1:${MISS_HOST_PORT}/healthz" "$MISS_HOST_LOG"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5","previous_response_id":"msg_missing","input":"继续跟进"}' \
  "http://127.0.0.1:${MISS_HOST_PORT}/v1/responses" >"$MISS_RESPONSE"

python3 - "$MISS_RESPONSE" "$MISS_UPSTREAM_REQUEST" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
request_path = pathlib.Path(sys.argv[2])

assert response['object'] == 'response', response
assert response['status'] == 'failed', response
assert response['id'] == 'resp_skeleton', response
assert response['previous_response_id'] == 'msg_missing', response
assert response['provider_runtime'] == 'transport-runtime', response
assert response['route']['selected_target'] == 'anthropic.claude-sonnet-4-5', response
assert 'canonical chat_process failed' in response['output'][0]['content'][0]['text'], response
assert 'not found in pipeline store' in response['output'][0]['content'][0]['text'], response
assert not request_path.exists(), 'unexpected upstream execute on missing store path'
print('PHASE14_HOST_PROVIDER_CONTINUITY_E2E_BATCH03: PASS')
PY
