# Phase 07 Host Server Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的最小 host/server 闭环。
- L10-L17 `scope`：本批次允许进入实现的最小范围。
- L19-L27 `flow`：chat 请求如何穿过最小流水线。
- L29-L35 `boundaries`：本批次明确不做的内容。
- L37-L42 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-host` 的第三刀固定为：最小 chat 业务入口 `POST /chat`。这一批只解决“chat 风格 JSON 如何进入现有 Rust 流水线”，不提前做 auth、SSE 或 OpenAI-compatible 协议契约。

## 本批次最小范围
1. 目标文件规划：
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `rust/crates/rcc-core-host/src/main.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
2. 本批次只收一段新语义：
   - `POST /chat`
3. 允许的输入：
   - `POST /chat` body: `{"model":"gpt-5","messages":[...]}`
   - 可选 `operation` 字段；若不提供，默认按 `chat`
4. 允许的输出：
   - 结构化 JSON，包含：
     - `request.operation`
     - `request.payload`
     - `response.route.target_block`
     - `response.tool_plan.scheduled`
     - `response.provider_runtime`
     - `response.payload`
5. payload 规则：
   - `payload` 即整个 chat 请求体的 JSON 语义序列化结果
   - 这样 host 只做薄壳转发，不重建 chat 业务语义

## 请求流水线
```text
POST /chat
      │
      ▼
rcc-core-host (HTTP shell)
      │
      ▼
RequestEnvelope { operation: chat, payload: <whole body json> }
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
- 当前实现 gate：`bash scripts/verify_phase7_host_server_batch03.sh`
- 当前实现阶段证据：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- serve --addr 127.0.0.1:38082`
  - `curl -X POST http://127.0.0.1:38082/chat -d '{\"model\":\"gpt-5\",\"messages\":[{\"role\":\"user\",\"content\":\"继续执行\"}]}'`
