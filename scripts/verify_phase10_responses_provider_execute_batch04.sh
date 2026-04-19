#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_phase10_responses_provider_execute.py
bash scripts/verify_phase10_responses_provider_execute_batch03.sh

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

SUCCESS_UPSTREAM_PORT="$(pick_port)"
SUCCESS_HOST_PORT="$(pick_port)"
FAIL_HOST_PORT="$(pick_port)"

SUCCESS_UPSTREAM_LOG="$(mktemp)"
SUCCESS_HOST_LOG="$(mktemp)"
FAIL_HOST_LOG="$(mktemp)"
SUCCESS_CONFIG="$(mktemp)"
FAIL_CONFIG="$(mktemp)"
SUCCESS_RESPONSE="$(mktemp)"
FAIL_RESPONSE="$(mktemp)"

SUCCESS_UPSTREAM_PID=""
SUCCESS_HOST_PID=""
FAIL_HOST_PID=""

cleanup() {
  for pid_var in SUCCESS_UPSTREAM_PID SUCCESS_HOST_PID FAIL_HOST_PID; do
    pid="${!pid_var}"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      wait "$pid" 2>/dev/null || true
    fi
  done
  rm -f \
    "$SUCCESS_UPSTREAM_LOG" \
    "$SUCCESS_HOST_LOG" \
    "$FAIL_HOST_LOG" \
    "$SUCCESS_CONFIG" \
    "$FAIL_CONFIG" \
    "$SUCCESS_RESPONSE" \
    "$FAIL_RESPONSE"
}
trap cleanup EXIT

python3 -u - "$SUCCESS_UPSTREAM_PORT" >"$SUCCESS_UPSTREAM_LOG" 2>&1 <<'PY' &
import http.server
import json
import socketserver
import sys

port = int(sys.argv[1])

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        _ = self.rfile.read(length)
        body = json.dumps({"text": "selected-target-hit"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return

with socketserver.TCPServer(("127.0.0.1", port), Handler) as server:
    server.handle_request()
PY
SUCCESS_UPSTREAM_PID=$!

cat >"$SUCCESS_CONFIG" <<EOF
{
  "host": {
    "server": {
      "addr": "127.0.0.1:${SUCCESS_HOST_PORT}"
    }
  },
  "provider": {
    "runtime": {
      "kind": "transport",
      "transport": {
        "base_url": "http://127.0.0.1:9"
      },
      "registry": {
        "transports": {
          "beta.vision.gpt-4o": {
            "base_url": "http://127.0.0.1:${SUCCESS_UPSTREAM_PORT}"
          }
        }
      }
    }
  },
  "virtualrouter": {
    "routing": {
      "default": [
        {
          "targets": ["alpha.gpt-5"]
        }
      ],
      "multimodal": [
        {
          "targets": ["beta.vision.gpt-4o"]
        }
      ]
    }
  }
}
EOF

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$SUCCESS_CONFIG" serve >"$SUCCESS_HOST_LOG" 2>&1 &
SUCCESS_HOST_PID=$!
wait_http_ready "http://127.0.0.1:${SUCCESS_HOST_PORT}/healthz" "$SUCCESS_HOST_LOG"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","input":[{"type":"input_text","text":"继续执行"},{"type":"input_image","image_url":"file://whiteboard.png"}]}' \
  "http://127.0.0.1:${SUCCESS_HOST_PORT}/v1/responses" >"$SUCCESS_RESPONSE"

python3 - "$SUCCESS_RESPONSE" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert response["object"] == "response", response
assert response["status"] == "completed", response
assert response["provider_runtime"] == "transport-runtime", response
assert response["route"]["target_block"] == "pipeline", response
assert response["route"]["selected_route"] == "multimodal", response
assert response["route"]["selected_target"] == "beta.vision.gpt-4o", response
assert response["output"][0]["content"][0]["text"] == "selected-target-hit", response
print("PHASE10_RESPONSES_PROVIDER_EXECUTE_HOST_SELECTED_TARGET: PASS")
PY

kill "$SUCCESS_HOST_PID"
wait "$SUCCESS_HOST_PID" 2>/dev/null || true
SUCCESS_HOST_PID=""

cat >"$FAIL_CONFIG" <<EOF
{
  "host": {
    "server": {
      "addr": "127.0.0.1:${FAIL_HOST_PORT}"
    }
  },
  "provider": {
    "runtime": {
      "kind": "transport",
      "transport": {
        "base_url": "http://127.0.0.1:9"
      },
      "registry": {
        "transports": {
          "alpha.gpt-5": {
            "base_url": "http://127.0.0.1:9"
          }
        }
      }
    }
  },
  "router": {
    "bootstrap": {
      "routes": {
        "multimodal": [
          {
            "id": "multimodal-primary",
            "targets": ["beta.vision.gpt-4o"],
            "priority": 10
          }
        ]
      }
    }
  }
}
EOF

cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config "$FAIL_CONFIG" serve >"$FAIL_HOST_LOG" 2>&1 &
FAIL_HOST_PID=$!
wait_http_ready "http://127.0.0.1:${FAIL_HOST_PORT}/healthz" "$FAIL_HOST_LOG"

curl --silent --fail -X POST \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5","input":[{"type":"input_text","text":"继续执行"},{"type":"input_image","image_url":"file://whiteboard.png"}]}' \
  "http://127.0.0.1:${FAIL_HOST_PORT}/v1/responses" >"$FAIL_RESPONSE"

python3 - "$FAIL_RESPONSE" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert response["object"] == "response", response
assert response["status"] == "failed", response
assert response["provider_runtime"] == "transport-runtime", response
assert response["route"]["selected_target"] == "beta.vision.gpt-4o", response
assert "not configured" in response["output"][0]["content"][0]["text"], response
print("PHASE10_RESPONSES_PROVIDER_EXECUTE_HOST_MISSING_TARGET: PASS")
PY
