# Phase 07 Host Server Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的最小 host/server 闭环。
- L10-L17 `scope`：本批次允许进入实现的最小范围。
- L19-L26 `flow`：通用请求如何穿过最小流水线。
- L28-L34 `boundaries`：本批次明确不做的内容。
- L36-L42 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-host` 的第二刀固定为：最小通用请求入口 `POST /requests`。这一批只解决“HTTP 如何把显式 `operation + payload` 送进现有 Rust 流水线”，不提前做 OpenAI-compatible 业务协议。

## 本批次最小范围
1. 目标文件规划：
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `rust/crates/rcc-core-host/src/main.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
2. 本批次只收一段新语义：
   - `POST /requests`
3. 允许的输入：
   - `POST /requests` body:
     - `{"operation":"tool.followup","payload":{"captured":{"model":"gpt-5","messages":[]},"followup_text":"继续执行"}}`
     - `{"operation":"smoke","payload":"phase7-batch02"}`
4. 允许的输出：
   - 结构化 JSON，包含：
     - `request.operation`
     - `request.payload`
     - `response.route.target_block`
     - `response.tool_plan.scheduled`
     - `response.provider_runtime`
     - `response.payload`
5. payload 规则：
   - 若 `payload` 是字符串，按原值进入 `RequestEnvelope.payload`
   - 若 `payload` 是 object / array / number / bool / null，按 JSON 语义等价序列化后进入 `RequestEnvelope.payload`

## 请求流水线
```text
POST /requests
      │
      ▼
rcc-core-host (HTTP shell)
      │
      ▼
RequestEnvelope { operation, payload }
      │
      ▼
rcc-core-orchestrator
      │
      ▼
virtual router -> hub pipeline
                  ├─ servertool（按需）
                  ▼
                compat -> provider
      │
      ▼
JSON response
```

## 本批次明确不做
1. 不做 OpenAI-compatible `/v1/chat/completions`。
2. 不做 auth、api key、tenant 配置。
3. 不做 SSE / streaming。
4. 不做 host 内业务 fallback 或多级协议兼容。
5. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase7_host_server.py`
- 当前实现 gate：`bash scripts/verify_phase7_host_server_batch02.sh`
- 当前实现阶段证据：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- serve --addr 127.0.0.1:38081`
  - `curl -X POST http://127.0.0.1:38081/requests -d '{"operation":"tool.followup","payload":{"captured":{"model":"gpt-5","messages":[]},"followup_text":"继续执行"}}'`
