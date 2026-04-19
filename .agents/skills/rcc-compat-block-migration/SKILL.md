---
name: rcc-compat-block-migration
description: rcc-core 的 compat block 真源迁移 skill。用于把 hub 后、provider 前的 request/response shape mapping 收拢到 compat 边界，并保持 host/router/pipeline/provider 极薄。
---

# RCC Compat Block Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 compat block 迁移约束。

## Trigger Signals
- 用户明确指出 compat 在 hub 后、provider 前。
- 需要定义 `/v1/responses` 一类入口对应的 compat 真源位置。
- 需要判断某段协议/shape mapping 应留在 compat、host 还是 provider。
- 需要把 compat 收敛成“薄骨骼 + shared projection engine + spec/JSON rules”。
- 需要把 request-side projection 从大函数抽成 shared module + provider-family spec。
- 需要继续把 content/tool 静态规则收进 rule 层。
- 需要继续把 tool declaration / tool result 的静态字段规则收进 rule 层。

## Standard Actions
1. 先读：`docs/agent-routing/110-compat-block-routing.md`。
2. 再读：`docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`、当前 batch 文档，以及 `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`。
3. 若进入收敛批次，再读：`docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`。
4. 先判断逻辑归属：
   - ingress shell / HTTP path -> host
   - route selection -> router
   - lifecycle push / stage advance -> pipeline(orchestrator)
   - canonical request/response <-> provider carrier -> compat
   - transport/auth/runtime -> provider
5. 严格保持 compat 在 hub 后、provider 前；不让 compat 回流 ingress，也不让 provider 回收 compat shape mapping。
6. 第一批先只锁最小 carrier，不一次性搬完整 responses/chat compatibility matrix。
7. 变更后先跑 `python3 scripts/verify_phase8_compat_block.py`；进入实现批次后再跑对应 batch gate。
8. 若 provider 顶层还直接接收 `RequestEnvelope`，说明 compat 尚未真正落位；应先切成 provider carrier interface，再继续接线。
9. 若进入 route handoff 批次，只允许把 router 已决出的 handoff 投影到 provider carrier sidecar；不得把 handoff 写回真实 request payload。
10. 若进入 provider-family projection 批次（如 gemini），`contents / systemInstruction / functionDeclarations / functionResponse` 真源必须留在 compat/domain；provider runtime 不得反向接管协议 shape，也不得把 audit sidecar 写进 request body。
11. 若进入 config convergence 批次：
   - compat block 自身继续变薄
   - 通用 projection executor / validator / audit helper 留在 `rcc-core-domain`
   - 静态字段映射优先下沉成 spec/JSON rules
   - lifecycle / continuation / tool governance / transport 不得做成配置化假象
12. 若进入 request-side spec skeleton 批次：
   - 先抽 shared projection module，再让 anthropic / gemini request projection 接入
   - 先保持行为不变，再继续下沉规则
   - request-side 与 response-side 收敛分批推进，避免一次性爆 scope
13. 若进入 content/tool rule extraction 批次：
   - 先抽 provider-family role rules
   - 再抽 text/tool_call/tool_result 等 part kind rules
   - 保持 request projection 输出完全不变，再继续推进下一层 spec 化
14. 若进入 tool field rules extraction 批次：
   - 先抽 anthropic tool definition field rules
   - 再抽 gemini function declaration / functionCall / functionResponse field rules
   - 保持 request projection 输出完全不变，再继续推进下一层 spec 化

## Acceptance Gate
- compat 的位置和边界已落盘。
- host/router/pipeline/provider 没有复制 compat 真源。
- 当前 batch 范围明确，没有提前混入 transport 或 ingress 语义。
- batch05 已明确 compat 收敛目标与 code-vs-config 边界。
- batch06 已明确 request-side spec skeleton 与 shared module 边界。
- batch07 已明确 content/tool rule extraction 边界。
- batch08 已明确 tool declaration / tool result field rules extraction 边界。
- phase8 docs gate 与当前 batch 实现 gate 通过。

## Anti-Patterns
- 把 compat 挪进 host ingress。
- 让 router 决定协议端点或 provider request shape。
- 让 provider 承担 canonical request/response mapping。
- 让 provider 顶层继续直接消费 canonical `RequestEnvelope`，导致 compat 只剩空壳。
- 一次性搬完整 compatibility stack，导致 scope 爆炸。
- 为了“全配置化”把 continuation / lifecycle / tool governance 塞进 JSON。
- 还没抽 shared skeleton 就继续往 compat_mapping 大函数里追加 provider-family 分支。
- role/part kind 明明是静态规则，却继续散落在多个 helper 里。

## Boundaries
- 本 skill 只负责 compat block 真源迁移，不替代 Phase 08A docs 真源。
- 若逻辑已证明属于 transport/auth/runtime，应回到 provider。
- 若逻辑属于 ingress path 或 response shell，应回到 host。
- 若逻辑属于纯静态字段映射，优先抽成 shared ops + spec/JSON，而不是继续堆 if/else。

## Sources Of Truth
- `docs/agent-routing/110-compat-block-routing.md`
- `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md`
- `docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md`
- `docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`
- `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
