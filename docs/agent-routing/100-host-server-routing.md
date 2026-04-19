# Host Server Skeleton 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L15 `docs-map`：Phase 07A 相关文档与技能入口。
- L17-L29 `rules`：host/server skeleton 约束。
- L31-L34 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 `rcc-core-host` 从“只能打印 smoke summary”的最小壳，推进为“能启动最小 HTTP server 的 host shell”。这一阶段只解决入口可运行、HTTP 可观测、请求能走完整条 Rust 流水线，不提前做 OpenAI 兼容 API、auth、SSE、复杂配置或多进程部署。

## 文档与 skill 映射
1. `docs/PHASE_07_HOST_SERVER_WORKFLOW.md`
   - Phase 07A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_07_HOST_SERVER_BATCH_01.md`
   - 第一批最小闭环：CLI `smoke` / `serve` + `GET /healthz` + `POST /smoke`。
3. `docs/PHASE_07_HOST_SERVER_BATCH_02.md`
   - 第二批最小闭环：通用请求入口 `POST /requests`。
4. `docs/PHASE_07_HOST_SERVER_BATCH_03.md`
   - 第三批最小闭环：最小 chat 业务入口 `POST /chat`。
5. `docs/PHASE_07_HOST_SERVER_BATCH_04.md`
   - 第四批实现闭环：`POST /v1/responses` ingress server。
6. `docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
   - `/v1/responses` 当前批次的缺函数/缺 block 盘点真源。
7. `.agents/skills/rcc-host-server-skeleton/SKILL.md`
   - host/server skeleton 的可复用动作。
8. `docs/CRATE_BOUNDARIES.md`
   - 确认 host 只做 CLI / HTTP / config bootstrap，不承接业务真源。
9. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认三层结构、host 极薄、单 runtime/单进程约束。

## 规则
1. `host` 只允许做入口壳：CLI 参数解析、HTTP request/response 映射、process startup；不得复制 pipeline/router/servertool/provider 的业务语义。
2. HTTP 请求必须进入 `rcc-core-orchestrator`，再沿 `pipeline -> router -> servertool -> provider` 既有主链执行；host 不得私下拼装业务结果。
3. Batch 01 只允许新增：
   - CLI `smoke`
   - CLI `serve`
   - `GET /healthz`
   - `POST /smoke`
4. Batch 02 允许新增：
   - `POST /requests`
5. Batch 03 允许新增：
   - `POST /chat`
6. Batch 04 允许新增：
   - `POST /v1/responses`
7. 每个新入口批次都必须先做“缺函数 / 缺 block”盘点；缺就补，不缺继续接线。
8. Batch 01 明确不做：
    - OpenAI-compatible API
   - auth
   - SSE streaming
   - session persistence
   - 多端口 / 多进程 / 守护进程
   - provider pass-through 业务语义
9. 默认单进程内收敛；若无明确收益，不引入额外 runtime、sidecar、后台服务。
10. 包装尽量薄：host 只做 transport shell；JSON 结构、route/provider/tool 执行结果以现有 Rust 主链输出为准。
11. provider 仍严格只做 `transport / auth / runtime`；servertool 仍独立 block；router/pipeline 真源不回流 host。
12. CLI 解析优先手写最小逻辑，不为两三个子命令引入重量级框架。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase7_host_server.py`
- Batch 01 实现阶段：`bash scripts/verify_phase7_host_server_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase7_host_server_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase7_host_server_batch03.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase7_host_server_batch04.sh`
- Batch 04 缺口盘点真源：`docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
- CI：`.github/workflows/phase7-host-server.yml`
