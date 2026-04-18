---
name: rcc-router-block-migration
description: rcc-core 的 router block 真源迁移 skill。用于把 route selection / routing state / health-quota 语义收拢到 rcc-core-router，并保持 host/provider/servertool/orchestrator 极薄。
---

# RCC Router Block Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 router block 真源迁移约束。

## Trigger Signals
- 进入 Phase 06A router block 迁移。
- 需要判断某段 route / selection / routing-state 逻辑应留在 block、下沉 domain，还是保持 orchestrator 薄壳。
- 需要把 route selection / routing state / health-quota 真源从旧 TS 或 skeleton 壳迁到 `rcc-core-router`。

## Standard Actions
1. 先读：`docs/agent-routing/90-router-block-routing.md`。
2. 再读：`docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md` 与当前 batch 文档。
3. 先判断逻辑归属：
   - 纯函数 → `rcc-core-domain`
   - router 业务真源 → `rcc-core-router`
   - 生命周期编排 → `rcc-core-orchestrator`
   - transport/auth/runtime → `rcc-core-provider`
   - followup/stop/clock → `rcc-core-servertool`
4. 只在 `rcc-core-router` 放必要 route truth，不重复实现 domain helper。
5. 若 host/orchestrator 需要兼容入口，只保留薄调用壳，不复制 route selection / routing state / health-quota 语义。
6. 第一批先锁单一主链，先让一个 router API 真实可用，再扩展分支能力。
7. Batch 01 先只收：
   - route candidate normalization
   - routing state filter
   - instruction target
   不提前混入 capability reorder、alias queue、sticky pool、health/quota/cooldown、provider failover。
8. 变更后先跑 `python3 scripts/verify_phase6_router_block.py`，再进入当前 batch 的实现验证。

## Acceptance Gate
- router 业务真源留在 `rcc-core-router`。
- 共享纯逻辑未回流 block，仍复用 `rcc-core-domain`。
- host/provider/servertool/orchestrator 仍保持极薄。
- 当前 batch 边界明确，未越界引入额外 runtime/process 负担。
- phase6 docs gate 和当前 batch 验证通过。

## Anti-Patterns
- 把 router 语义塞回 provider、servertool、host 或 orchestrator。
- 在 orchestrator/host 里复制 route candidate build 或 routing state filter。
- 一次性搬完整个 virtual-router engine，导致 scope 爆炸。
- 为了兼容旧仓引入 TS 业务桥、sidecar、daemon。
- 在还没进入对应 batch 时提前实现 sticky pool、cooldown、quota bucket、provider failover。

## Boundaries
- 本 skill 只负责 router block 真源迁移，不替代 Phase 06A docs 真源。
- 若逻辑已证明是纯函数，应回到 domain，不继续留在 block。
- 若需求涉及 provider transport/auth/runtime 或 servertool 业务语义，回到对应边界文档处理。

## Sources Of Truth
- `docs/agent-routing/90-router-block-routing.md`
- `docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md`
- `docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
