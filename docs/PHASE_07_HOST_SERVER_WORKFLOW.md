# Phase 07 Host Server Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 07A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L36 `minimum-scope`：当前阶段允许实现的最小 host/server 闭环。
- L38-L42 `verification`：验证与 CI 入口。
- L44-L49 `done`：本阶段完成判据。

## 目标
把 `rcc-core-host` 从 smoke-only 壳升级为“最小可运行 HTTP server skeleton”。先把外层入口跑通，再按流水线逐步挂更多业务能力；不在第一刀里补齐完整产品协议。

当前主线固定为：

```text
responses ingress server
  -> virtual router
  -> hub pipeline(inbound <> chat process <> outbound)
  -> provider
```

## 执行顺序
1. **Docs**
   - 先写/更新：
      - `docs/PHASE_07_HOST_SERVER_WORKFLOW.md`
      - `docs/PHASE_07_HOST_SERVER_BATCH_01.md`
      - `docs/PHASE_07_HOST_SERVER_BATCH_02.md`
      - `docs/PHASE_07_HOST_SERVER_BATCH_03.md`
      - `docs/PHASE_07_HOST_SERVER_BATCH_04.md`
      - `docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
      - `docs/agent-routing/100-host-server-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-host-server-skeleton/SKILL.md`
3. **Development**
   - 每个批次都必须先做“缺函数 / 缺 block”盘点：缺就补最小真源；不缺就继续接线实现。
4. **Test**
   - 先跑 `python3 scripts/verify_phase7_host_server.py`
   - 再跑 `bash scripts/verify_phase7_host_server_batch01.sh`
   - 再跑 `bash scripts/verify_phase7_host_server_batch02.sh`
   - 再跑 `bash scripts/verify_phase7_host_server_batch03.sh`
   - 再跑 `bash scripts/verify_phase7_host_server_batch04.sh`
5. **Close**
   - docs、skills、验证通过后，后续 batch 才允许继续加业务入口。

## 当前阶段最小实现范围
1. 目标 crate 固定为 `rust/crates/rcc-core-host`。
2. Phase 07A 的边界固定为：`CLI / HTTP / process startup`。
3. Batch 01：`smoke` / `serve` + `/healthz` / `/smoke`
   - 输入：CLI args、HTTP method/path、最小 JSON body。
   - 过程：
     - CLI 解析命令
     - `serve` 绑定地址并启动最小 HTTP server
     - `GET /healthz` 返回固定健康检查 JSON
     - `POST /smoke` 把请求映射为 `RequestEnvelope`
     - 请求进入 `rcc-core-orchestrator`，按当前 skeleton 主链执行；后续批次再推进到 `virtual router -> hub pipeline -> provider`
     - 输出结构化 JSON 响应
   - 输出：固定健康检查 JSON 与最小 smoke 响应 JSON。
4. 当前阶段明确不做：
   - OpenAI-compatible path
   - auth / api key
   - SSE / stream relay
   - 热更新配置
   - 多进程 / 守护进程 / sidecar
5. 默认优先保持 host 极薄、单进程、单 runtime（或无独立 runtime），不因“看起来框架化”而过度包装。
6. Batch 02 才允许把通用 `operation + payload` 显式暴露为 `/requests`，继续保持 host 只做 shell，不在 host 内承载业务 fallback。
7. Batch 03 才允许新增 `POST /chat` 这样的最小业务入口，但它仍必须只是 request shell，不能在 host 内长出 chat 真源。
8. Batch 04 固定入口端点选 `POST /v1/responses`，当前批次实现 **responses ingress server 处理**、最小 pure functions 与 responses-style shell serialize。
9. 只有当 `/v1/responses` 当前批次确实依赖某个新 block 时，才允许补最小 skeleton；若不依赖，则记录缺口并留到后续批次做 virtual router / hub pipeline / provider 演进。

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase7_host_server.py`

### Batch 01 实现阶段
- `bash scripts/verify_phase7_host_server_batch01.sh`
- 内部包含：phase1/phase2/phase7 docs verify + `cargo test -p rcc-core-host -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet -- smoke` + 启动 server 后校验 `/healthz` 与 `/smoke`

### Batch 02 实现阶段
- `bash scripts/verify_phase7_host_server_batch02.sh`
- 内部包含：phase1/phase2/phase7 docs verify + `cargo test -p rcc-core-host -p rcc-core-testkit` + 启动 server 后校验 `/healthz`、`/smoke` 与 `/requests`

### Batch 03 实现阶段
- `bash scripts/verify_phase7_host_server_batch03.sh`
- 内部包含：phase1/phase2/phase7 docs verify + `cargo test -p rcc-core-host -p rcc-core-testkit` + 启动 server 后校验 `/healthz`、`/smoke`、`/requests` 与 `/chat`

### Batch 04 实现阶段
- 当前实现闭环：`docs/PHASE_07_HOST_SERVER_BATCH_04.md`
- 当前缺口盘点真源：`docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
- 实现阶段入口：`bash scripts/verify_phase7_host_server_batch04.sh`
- 关键纯函数真源：`rust/crates/rcc-core-domain/src/responses_ingress.rs`
- 目标：把 `/v1/responses` ingress 放进 host，并以最小 pure functions + shell serialize 形式接入既有 Rust 主链

### 当前 CI 入口
- `.github/workflows/phase7-host-server.yml`

## 完成判据
1. Phase 07A docs 与 routing 完整。
2. host/server skeleton skill 已落盘。
3. phase7 verify 脚本与 CI 可自动收口文档/技能阶段。
4. `rcc-core-host` 已能启动最小 HTTP server，并把 `/smoke` 请求送入既有 Rust 流水线。
5. `POST /v1/responses` 已能通过 host ingress 进入既有 Rust 流水线，并返回最小 responses-style JSON shell。
6. 当前 batch 闭环通过后，才允许继续加下一条业务入口。
