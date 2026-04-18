---
name: rcc-servertool-block-migration
description: rcc-core 的 servertool block 真源迁移 skill。用于把 followup/stop/clock 等 server-side tool 语义收拢到 rcc-core-servertool，并保持 host/provider/orchestrator 极薄。
---

# RCC Servertool Block Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 servertool block 真源迁移约束。

## Trigger Signals
- 进入 Phase 04A servertool block 迁移。
- 需要判断某段 servertool 逻辑应留在 block、下沉 domain，还是保持 orchestrator 薄壳。
- 需要把 followup / stop / clock 的业务真源从旧 TS 或 skeleton 壳迁到 `rcc-core-servertool`。

## Standard Actions
1. 先读：`docs/agent-routing/70-servertool-block-routing.md`。
2. 再读：`docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md` 与当前 batch 文档。
3. 先判断逻辑归属：
   - 纯函数 → `rcc-core-domain`
   - servertool 业务真源 → `rcc-core-servertool`
   - 生命周期编排 → `rcc-core-orchestrator`
   - transport/auth/runtime → `rcc-core-provider`
4. 只在 `rcc-core-servertool` 放必要业务编排，不重复实现 domain helper。
5. 若 `plan()`/host/orchestrator 需要兼容入口，只保留薄调用壳，不复制 followup/stop/clock 语义。
6. 第一批先锁单一主链，先让一个 block API 真实可用，再扩展分支能力。
7. 若扩 followup injection / governance / stop：
   - batch02 只在 block 内追加 assistant/tool-output message 注入，并保持 required-missing fail fast；
   - batch03 继续只在 block 内追加 system/vision message injection，并保持 message 改写顺序固定；
   - batch04 再在 block 内追加 tool governance（`force_tool_choice` / `ensure_standard_tools` / `append_tool_if_missing`），并保持 provider 不解释这些业务字段；
   - batch05 再在 block 内追加 stop gateway context resolve，并坚持“显式 context 优先，缺失时 fallback 到 domain inspect”，不要把 runtime metadata bridge 带回 block。
   - batch06 再在 block 内追加 reasoning.stop tool payload normalize / summary / tool_output builder，并把 `REASONING_STOP_TOOL_DEF` 收回同一模块；不要把 state arm、guard 或 memory append 提前混进 block。
   - batch07 再在 block 内追加 reasoning.stop state patch build，并坚持“显式 summary 优先，否则 fallback 到 batch06 canonical tool_output”；不要把 sticky persistence、mode sync、clear/read 或 guard 提前混进 block。
   - batch08 再在 block 内追加 reasoning.stop state read/clear，并坚持“只对显式 state object 工作”；不要把 sticky persistence、fail-count、mode sync 或 guard 提前混进 block。
   - batch09 再在 block 内追加 reasoning.stop mode sync，并坚持“只对显式 captured/base_state 工作”；不要把 sticky persistence、runtime metadata、raw responses rebuild、fail-count 或 guard 提前混进 block。
   - batch10 再在 block 内追加 reasoning.stop sticky persistence，并坚持“只对显式 sticky_key/state object 工作”；不要把 runtime metadata、full router state codec、async queue、telemetry recover、fail-count 或 guard 提前混进 block。
   - batch11 再在 block 内追加 reasoning.stop fail-count，并坚持“只对显式 sticky_key 工作，并复用 batch10 sticky store 真源”；不要把 guard-trigger、runtime metadata、full router state codec、async queue 或 telemetry recover 提前混进 block。
   - 不要把 provider-specific payload rebuild、完整 compat/tool governance、reasoning-stop guard 或 response bridge 混进 block。
8. 变更后先跑 `python3 scripts/verify_phase4_servertool_block.py`，再跑当前 batch 验证脚本。

## Acceptance Gate
- servertool 业务真源留在 `rcc-core-servertool`。
- 共享纯逻辑未回流 block，仍复用 `rcc-core-domain`。
- host/provider/orchestrator 仍保持极薄。
- batch 验证脚本和相关 Rust 测试通过。

## Anti-Patterns
- 把 block 语义塞回 provider 或 host。
- 在 `plan()` 或 orchestrator 里复制 followup builder 逻辑。
- 一次性搬完整个 servertool engine，导致 scope 爆炸。
- 为了兼容旧仓而引入 TS 业务桥、sidecar、daemon。
- 把 assistant/tool-output injection 做成 provider 语义或静默缺失 fallback。

## Boundaries
- 本 skill 只负责 servertool block 真源迁移，不替代 Phase 04A docs 真源。
- 若逻辑已证明是纯函数，应回到 domain，不继续留在 block。
- 若需求涉及 provider transport/auth/runtime，回到 provider 边界文档处理。

## Sources Of Truth
- `docs/agent-routing/70-servertool-block-routing.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_01.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md`
- `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md`
- `docs/CRATE_BOUNDARIES.md`
