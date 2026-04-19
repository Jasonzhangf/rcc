---
name: rcc-hub-pipeline-block-migration
description: rcc-core 的 hub pipeline block 真源迁移 skill。用于把 inbound / chat process / outbound 生命周期推进语义收拢到 rcc-core-pipeline，并保持 host/router/compat/provider 极薄。
---

# RCC Hub Pipeline Block Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 hub pipeline 真源迁移约束。

## Trigger Signals
- 进入 Phase 09A hub pipeline 迁移。
- 需要判断某段 request lifecycle / stage advance 逻辑应留在 pipeline、下沉 domain，还是保持 orchestrator 薄壳。
- 需要把 inbound / chat process / outbound 真源收拢到 `rcc-core-pipeline`。
- 需要为 `responses -> canonical -> anthropic provider` 主线准备 shared mapping / continuation 迁移。

## Standard Actions
1. 先读：`docs/agent-routing/120-hub-pipeline-routing.md`。
2. 再读：
   - `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
   - `docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
   - `docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
   - 当前 batch 文档
3. 先判断逻辑归属：
   - 纯函数 / shared mapping ops → `rcc-core-domain`
   - hub pipeline 业务真源 → `rcc-core-pipeline`
   - 生命周期编排 → `rcc-core-orchestrator`
   - route selection / routing state → `rcc-core-router`
   - shape mapping → `compat`
   - transport/auth/runtime + provider-native continuation → `rcc-core-provider`
4. 默认不做 pairwise protocol conversion；统一先升到 canonical，再投影到目标协议。
5. 默认 no-copy / minimal-copy；只有 ownership、持久化、快照或独立响应壳确实需要时才 clone。
6. responses continuation 一律先判定 provider-native 能力：
   - 同 provider 且 provider 支持 continuation → 在 provider/server 侧继续
   - 否则 → `hub.chat_process` 做 materialize / restore fallback
7. 只在 `rcc-core-pipeline` 放必要 stage truth，不重复实现 domain helper，也不把 compat/provider truth 拉进 pipeline。
8. 第一条真实主链先锁 `responses -> canonical -> anthropic`，让一条链真正闭环，再扩其它协议分支。
9. 进入回归时，优先对齐旧仓矩阵测试：anthropic roundtrip、continuation / submit_tool_outputs、hub I/O compare、cross-protocol audit。
10. 当 canonical 主线已补齐时，优先把编排层默认入口切到 canonical，再移除已覆盖的旧 `prepare/map_request` 调用；旧函数仅保留给未迁移分支。
11. Batch 02 继续只做最小 continuation 闭环：优先支持 inline `tool_outputs` fallback materialize；若缺少可恢复的 tool-call 上文，必须显式失败，禁止静默猜测或把 restore 逻辑塞进 compat/provider。
12. Batch 03 若进入 response_id restore，store state 仍留在 `rcc-core-pipeline`，纯提取/恢复 helpers 下沉 `rcc-core-domain`；默认只做单 runtime 内 in-memory store，不引入额外进程或外部持久化。
13. Batch 04 若进入 fallback provider response normalize，response shape truth 仍留在 compat/domain；pipeline store 只消费 canonical response，禁止直接读取 provider wire body。
14. Batch 05 若进入旧仓 matrix regression，对齐目标优先收敛为 synthetic payload 驱动的 Rust matrix smoke；先锁 anthropic roundtrip / continuation / hub I/O compare，禁止依赖外部 sample 目录才能通过 gate。
15. Batch 06 若进入 cross-protocol audit matrix，audit truth 仍留在 domain pure functions；先锁 anthropic/gemini 两个 target 的 dropped / lossy / unsupported / preserved 最小字段矩阵，禁止把 audit 状态塞进 host/orchestrator/provider runtime。
16. Batch 07 若进入 audit sidecar wiring，sidecar 只能挂在 canonical outbound / compat carrier metadata；禁止把 `protocol_mapping_audit` 写进 provider request body，禁止借机把 gemini body mapping 或 provider runtime 语义提前塞进 compat/provider。

## Acceptance Gate
- hub pipeline 业务真源留在 `rcc-core-pipeline`。
- 共享纯逻辑与 shared mapping 未回流 block，仍复用 `rcc-core-domain`。
- host/router/compat/provider/orchestrator 仍保持极薄。
- continuation ownership 已显式区分 provider-native 与 chat_process fallback。
- protocol mapping audit 若已接线，只存在于 canonical outbound / provider carrier metadata sidecar，不进入真实 request body。
- 当前 batch 边界明确，未越界引入额外 runtime/process 负担。
- phase9 docs gate 通过，并且后续实现承诺对齐旧仓核心矩阵回归。

## Anti-Patterns
- 把 hub pipeline 语义塞回 host、router、compat、provider 或 orchestrator。
- 在 orchestrator/host 里复制 inbound/chat-process/outbound 业务规则。
- 一次性搬完整个旧仓 hub pipeline，导致 scope 爆炸。
- 为了兼容旧仓引入 TS 业务桥、sidecar、daemon。
- 通过 deep copy、payload 裁剪或静默降级伪造“协议已对齐”或“性能已优化”。

## Boundaries
- 本 skill 只负责 hub pipeline 真源迁移，不替代 Phase 09A docs 真源。
- 若逻辑已证明是纯函数，应回到 domain，不继续留在 block。
- 若需求涉及 compat 或 provider transport/auth/runtime，回到对应边界文档处理。
- 若需求涉及旧仓测试移植，测试入口与 CI 收口仍以 `docs/TESTING_AND_ACCEPTANCE.md` 为准。

## Sources Of Truth
- `docs/agent-routing/120-hub-pipeline-routing.md`
- `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
- `docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
- `docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
- `docs/PHASE_09_HUB_PIPELINE_BATCH_01.md`
- `docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
