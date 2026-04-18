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
3. `.agents/skills/rcc-router-block-migration/SKILL.md`
   - router block 迁移的可复用动作。
4. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-router`。
5. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
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
7. provider 仍只做 `transport / auth / runtime`，不得回收 router 的 route selection / health-quota 语义。
8. servertool 仍只做 followup / stop / clock 等 server-side tool 真源，不回收 router 的 route semantics。
9. 默认单 runtime 内收敛；若无明确收益，不新增独立 daemon、sidecar、后台服务。
10. 包装尽量薄：优先把 router 输入归一到一个 canonical route selection input，再由后续 batch 复用，不做重复包装层。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase6_router_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase6_router_batch01.sh`
- CI：`.github/workflows/phase6-router-block.yml`
