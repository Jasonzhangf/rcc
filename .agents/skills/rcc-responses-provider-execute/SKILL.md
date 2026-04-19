---
name: rcc-responses-provider-execute
description: responses 主线 provider execute integration skill。用于把 compat 后的 provider carrier 接到最小真实 transport execute 路径，同时保持 compat/host/orchestrator 薄边界。
---

# RCC Responses Provider Execute

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 responses 主线 provider execute integration 约束。

## Trigger Signals
- 用户要求继续推进 responses 主线到真实 provider execute。
- compat 已落位，但 provider 仍停留在 noop mainline。
- 需要判断真实 execute integration 应放在 provider、orchestrator 还是 host。

## Standard Actions
1. 先读：`docs/agent-routing/130-responses-provider-execute-routing.md`。
2. 再读：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`、当前 batch 文档，以及 `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`。
3. 先判断逻辑归属：
   - canonical request/response <-> provider carrier → compat
   - transport request plan / auth / http execute → provider
   - runtime injection / lifecycle wiring → orchestrator
   - ingress shell / host CLI / HTTP route → host
4. 只在 provider 内新增最薄 real execute runtime；不要把 transport plan / http execute 回流 compat 或 host。
5. host 默认路径先保持稳定，真实 execute integration 先通过 testkit / orchestrator 主线收口。
6. 变更后先跑 `python3 scripts/verify_phase10_responses_provider_execute.py`；进入实现批次后再跑 `bash scripts/verify_phase10_responses_provider_execute_batch01.sh`。
7. 若默认 host smoke 仍需稳定，优先通过 orchestrator provider runtime 注入做主线 real execute；不要先把 host 默认路径改成 real transport。
8. 本地 HTTP fixture 必须读完整个 request body，再回响应；否则并行测试下容易出现偶发断链假红。
9. 若进入 route handoff 批次，只允许让 provider runtime 接收 `ProviderRequestCarrier.route` 侧带信息；不得因此改写真实 transport payload。
10. 若进入 target bind 批次，只允许让 provider runtime registry 在 provider 边界内做 `selected_target` lookup；miss 必须显式失败。
11. 若进入 host 安装态批次，只允许把 `/v1/responses` 当作 ingress shell 验证入口；不要把 runtime bind 回流到 host。
12. 若 canonical outbound 已需要知道目标 provider family，优先消费 typed config/runtime registry bootstrap；target 名或 model family 只能做非 config 场景的兜底 heuristic。

## Acceptance Gate
- provider real execute integration 的位置和边界已落盘。
- compat/host/orchestrator 没有复制 provider transport/auth/runtime 真源。
- 当前 batch 范围明确，没有提前混入 streaming、多 provider、host config 系统。
- phase10 docs gate 与 batch01 实现 gate 通过。

## Anti-Patterns
- 把 transport request plan / http execute 塞回 compat。
- 把 provider runtime config 系统直接扩散到 host 主路径。
- 在 orchestrator 内复制 provider execute 语义。
- 为了 real execute integration 提前引入多 provider registry、daemon、sidecar。

## Boundaries
- 本 skill 只负责 responses 主线 provider execute integration，不替代 Phase 05 provider block 真源。
- 若逻辑已证明属于 provider block 真源，应继续留在 `rcc-core-provider`。
- 若逻辑属于 canonical shape mapping，应回到 compat，不继续留在 provider integration 层。

## Sources Of Truth
- `docs/agent-routing/130-responses-provider-execute-routing.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
- `docs/PHASE_05_PROVIDER_BLOCK_REVIEW.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
- `docs/CRATE_BOUNDARIES.md`
