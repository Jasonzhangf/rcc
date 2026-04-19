# Phase 07 Host Server Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的最小 host/server 闭环。
- L10-L16 `scope`：本批次允许进入实现的最小范围。
- L18-L25 `flow`：请求如何穿过最小流水线。
- L27-L34 `boundaries`：本批次明确不做的内容。
- L36-L41 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-host` 的第一刀固定为：最小 CLI + 最小 HTTP server。先验证“服务能起来、健康检查能看、`/smoke` 能从 host 进 orchestrator 再回 JSON”，再继续往上挂更多业务端点。

## 本批次最小范围
1. 目标文件规划：
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `rust/crates/rcc-core-host/src/main.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
2. 本批次只收四段语义：
   - `smoke` CLI
   - `serve` CLI
   - `GET /healthz`
   - `POST /smoke`
3. 允许的输入：
   - `rcc-core-host smoke`
   - `rcc-core-host serve --addr 127.0.0.1:PORT`
   - `POST /smoke` body: `{"operation":"smoke","payload":"phase7"}`
4. 允许的输出：
   - 文本 smoke summary
   - `{"status":"ok"}` 风格 health JSON
   - 包含 `route/tool_plan/provider_runtime/payload` 的 smoke JSON

## 请求流水线
```text
CLI / HTTP request
        │
        ▼
rcc-core-host (thin shell)
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
JSON / text response
```

## 本批次明确不做
1. 不做 OpenAI-compatible `/v1/*` 接口。
2. 不做 auth、api key、multi-tenant 配置。
3. 不做 SSE / streaming。
4. 不做 session persistence、job queue、后台守护进程。
5. 不做 provider transport pass-through 或 host 内业务 fallback。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase7_host_server.py`
- 当前实现 gate：`bash scripts/verify_phase7_host_server_batch01.sh`
- 当前实现阶段证据：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- smoke`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- serve --addr 127.0.0.1:38080`
  - `curl http://127.0.0.1:38080/healthz`
  - `curl -X POST http://127.0.0.1:38080/smoke -d '{"operation":"smoke","payload":"phase7-batch01"}'`
