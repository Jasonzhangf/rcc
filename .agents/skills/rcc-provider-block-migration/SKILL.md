---
name: rcc-provider-block-migration
description: rcc-core 的 provider block 真源迁移 skill。用于把 transport/auth/runtime 语义收拢到 rcc-core-provider，并保持 host/orchestrator/servertool 极薄。
---

# RCC Provider Block Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 provider block 真源迁移约束。

## Trigger Signals
- 进入 Phase 05A provider block 迁移。
- 需要判断某段逻辑应留在 provider、下沉 domain，还是保持 host/orchestrator 薄壳。
- 需要把旧 TS 中的 transport / auth / runtime 语义迁到 `rcc-core-provider`。

## Standard Actions
1. 先读：`docs/agent-routing/80-provider-block-routing.md`。
2. 再读：`docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md` 与当前 batch 文档。
3. 先判断逻辑归属：
   - 纯函数 → `rcc-core-domain`
   - provider transport/auth/runtime 真源 → `rcc-core-provider`
   - 生命周期编排 → `rcc-core-orchestrator`
   - server-side tool 业务真源 → `rcc-core-servertool`
4. 只在 `rcc-core-provider` 放必要 adapter 真源，不把 route/tool/protocol 主语义带进来。
5. 若 host/orchestrator 需要兼容入口，只保留薄调用壳，不复制 endpoint resolve、auth header build、HTTP execute 语义。
6. 第一批先锁单一主链，先让一个 provider API 真实可测，再扩分支能力。
7. Batch 01 先只收：baseURL resolve、endpoint resolve、apikey/no-auth headers、canonical transport request plan；不要把真实 HTTP、OAuth、retry、SSE 提前混进来。
8. 变更后先跑 `python3 scripts/verify_phase5_provider_block.py`，再进入当前 batch 验证。

## Acceptance Gate
- provider 真源留在 `rcc-core-provider`。
- 共享纯逻辑未回流 provider，仍复用 `rcc-core-domain`。
- host/orchestrator/servertool 仍保持极薄。
- phase5 docs gate 和当前 batch 验证通过。

## Anti-Patterns
- 把 provider 语义塞回 host 或 orchestrator。
- 在 provider 内解释 followup/stop/tool governance/protocol 业务语义。
- 一次性搬完整个 provider runtime family stack，导致 scope 爆炸。
- 为了兼容旧仓引入 TS 业务桥、sidecar、daemon。
- 在还没进入对应 batch 时提前实现 OAuth、SSE、retry、provider health manager。

## Boundaries
- 本 skill 只负责 provider block 真源迁移，不替代 Phase 05A docs 真源。
- 若逻辑已证明是纯函数，应回到 domain，不继续留在 provider。
- 若需求涉及 server-side tool 语义，回到 servertool 边界文档处理。

## Sources Of Truth
- `docs/agent-routing/80-provider-block-routing.md`
- `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`
- `docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
