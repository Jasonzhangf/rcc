# Responses Provider Execute 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L16 `docs-map`：Phase 10A 相关文档与技能入口。
- L18-L29 `rules`：responses 主线 provider execute integration 约束。
- L31-L34 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：沿当前主线 `responses ingress server -> virtual router -> hub pipeline -> compat -> provider`，把 provider 从 noop mainline 接到最小真实 transport execute 路径。该阶段只做 **主线 integration**，不重新定义 provider block 真源，也不把 transport/auth/runtime 语义带回 compat、host 或 orchestrator。

## 文档与 skill 映射
1. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
   - Phase 10A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md`
   - 第一批实现闭环：静态 provider runtime + transport request plan + real HTTP execute 的主线接线。
3. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md`
   - 第二批实现闭环：provider runtime contract 接受 route handoff sidecar，transport payload 保持不变。
4. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md`
   - 第三批实现闭环：selected_target -> concrete provider runtime bind。
5. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md`
   - 第四批实现闭环：host `/v1/responses` 安装态命中 selected_target runtime registry。
6. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
   - responses 主线进入真实 provider execute 前的缺函数 / 缺 block 盘点真源。
7. `.agents/skills/rcc-responses-provider-execute/SKILL.md`
   - responses 主线 provider execute integration 的可复用动作。
8. `docs/PHASE_05_PROVIDER_BLOCK_REVIEW.md`
   - provider block 已完成真源与边界复用入口。
9. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认 `host -> virtual router -> hub pipeline -> compat -> provider` 主链位置。
10. `docs/CRATE_BOUNDARIES.md`
   - 确认 provider 仍只拥有 `transport / auth / runtime`，compat 仍只拥有 shape mapping。

## 规则
1. 本阶段只做主线 integration：复用现有 provider block 能力，把 responses 主线接到真实 provider execute；不重做 provider batch 1-4 真源。
2. compat 仍只负责 canonical request/response <-> provider carrier mapping；不得开始 build target_url、auth headers、retry policy。
3. provider 仍只负责 `transport / auth / runtime`；真实 execute 逻辑继续留在 `rcc-core-provider`。
4. orchestrator 只允许新增最薄装配：允许 provider runtime 注入或切换，但不得复制 transport request plan / http execute 语义。
5. host 默认仍保持极薄、默认 smoke 路径仍可继续使用 noop runtime；真实 execute integration 先通过 testkit / orchestrator 主线闭环验证。
6. Batch 01 先只做非 streaming `/v1/responses` 主线；不提前混入 SSE mainline、host runtime config 系统、多 provider routing profile。
7. Batch 02 若进入 route handoff，只允许让 provider runtime 接收 carrier sidecar；transport payload 必须保持语义不变。
8. Batch 03 若进入 target bind，只允许 provider runtime registry 做 selected_target lookup；miss 必须显式失败，不得静默 fallback。
9. Batch 04 若进入 host 安装态验证，只允许 host 继续做 ingress shell；selected_target bind 真源仍只能在 provider。
10. 默认单 runtime、单进程收敛；不引入 daemon、sidecar、后台 worker。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 实现阶段：`bash scripts/verify_phase10_responses_provider_execute_batch01.sh`
- route handoff integration：`bash scripts/verify_phase10_responses_provider_execute_batch02.sh`
- target runtime bind：`bash scripts/verify_phase10_responses_provider_execute_batch03.sh`
- host install E2E：`bash scripts/verify_phase10_responses_provider_execute_batch04.sh`
- 当前 CI 入口：`.github/workflows/phase10-responses-provider-execute.yml`
