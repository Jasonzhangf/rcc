# Router Block Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L15 `docs-map`：Phase 06A 相关文档与技能入口。
- L17-L29 `rules`：router block 真源迁移约束。
- L31-L33 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 `rcc-core-router` 从 skeleton `select()` 升级为真正的 router block 真源，但边界严格锁死在 `route selection / routing state / health-quota`，不承接 provider transport/auth/runtime，也不承接 servertool 业务语义。

## 文档与 skill 映射
1. `docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md`
   - Phase 06A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md`
   - 第一批最小闭环：route candidate normalization + routing state filter + instruction target。
3. `docs/PHASE_06_ROUTER_BLOCK_BATCH_02.md`
   - 第二批最小闭环：capability reorder + preferred-model reorder。
4. `docs/PHASE_06_ROUTER_BLOCK_BATCH_03.md`
   - 第三批实现闭环：responses ingress -> virtual router 最小选择闭环。
5. `docs/PHASE_06_ROUTER_BLOCK_BATCH_04.md`
   - 第四批实现闭环：runtime bootstrap route pools consumption + minimal route result。
6. `docs/PHASE_06_ROUTER_BLOCK_BATCH_05.md`
   - 第五批实现闭环：selected target handoff surfacing。
7. `docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
   - responses 主线进入 virtual router 时的缺函数/缺 block 盘点真源。
8. `.agents/skills/rcc-router-block-migration/SKILL.md`
   - router block 迁移的可复用动作。
9. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-router`。
10. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认三层结构、host/provider 薄边界与单 runtime 约束。

## 规则
1. `router` 只允许保留 `route selection / routing state / health-quota` 真源，不承接 transport/auth/runtime、tool governance、followup/stop 等业务语义。
2. host / orchestrator 只能薄装配 router，不得复制 route candidate build、state filter、health/quota 规则。
3. 若某段逻辑无 I/O、无网络、无持久化副作用，且可跨 router/servertool/provider 复用，应优先判断是否下沉 `rcc-core-domain`；否则保持在 `rcc-core-router`。
4. 当前 Phase 06A 先做 **最小闭环切片**，不一次性搬完整个 TS virtual-router engine。
5. Batch 01 先固定：`requested route + feature hints + routing state -> canonical route candidates / instruction target`，不提前做 cooldown、sticky pool、health manager、quota bucket 或 provider failover。
6. Batch 01 只允许处理：
   - route candidate normalization
   - routing state filter
   - instruction target resolve
   不提前混入 alias queue、tier load balancing、multistep fallback 或 provider health recover。
7. Batch 02 只允许处理：
   - capability reorder（如 `thinking` / `web_search`）
   - preferred-model reorder
   不提前混入 alias queue、sticky pool、health manager、quota bucket、cooldown、provider failover。
8. Batch 03 只允许先锁：
   - responses ingress 进入 virtual router 的 authoritative input gap
   - `select()` 从兼容壳升级到最小 authoritative shell 的缺口
   - 当前 `pipeline.prepare -> router.select` 顺序偏差的显式记录
   不提前混入 hub pipeline inbound/chat-process/outbound 或 provider route execution 细节。
9. Batch 04 只允许先锁：
   - runtime bootstrap route pools 进入 `RouterBlock`
   - `select()` 返回最小 route result
   - host/responses shell 只透传 route result
   不提前混入 sticky/failover/health/quota。
10. Batch 05 只允许先锁：
   - `selected_route -> selected_target` 的最小 resolve
   - route handoff 只出现在 `RouteDecision`
   - 下游 compat/provider 只消费 handoff，不复制 resolve 规则
11. provider 仍只做 `transport / auth / runtime`，不得回收 router 的 route selection / health-quota 语义。
12. servertool 仍只做 followup / stop / clock 等 server-side tool 真源，不回收 router 的 route semantics。
13. 默认单 runtime 内收敛；若无明确收益，不新增独立 daemon、sidecar、后台服务。
14. 包装尽量薄：优先把 router 输入归一到一个 canonical route selection input，再由后续 batch 复用，不做重复包装层。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase6_router_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase6_router_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase6_router_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase6_router_batch03.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase6_router_batch04.sh`
- Batch 05 实现阶段：`bash scripts/verify_phase6_router_batch05.sh`
- Batch 03 缺口盘点真源：`docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
- CI：`.github/workflows/phase6-router-block.yml`
