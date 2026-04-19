---
name: rcc-host-provider-continuity-e2e
description: host/provider 安装态 continuity E2E skill。用于把已存在的 responses continuation 真源推进到 host `/v1/responses` + real provider 的端到端证据里，同时保持 host/compat/provider 极薄。
---

# RCC Host Provider Continuity E2E

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 Phase 14A host/provider continuity 安装态约束。

## Trigger Signals
- 用户要求继续推进 host 安装态 `/v1/responses` continuity。
- Phase 10 provider execute 与 Phase 13 continuation matrix 已闭环，需要把它们提升到 install E2E。
- 需要判断 continuity 安装态断言应该放 host、testkit、orchestrator 还是 provider。

## Standard Actions
1. 先读：`docs/agent-routing/170-host-provider-continuity-e2e-routing.md`。
2. 再读：`docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md`、当前 batch 文档、gap inventory。
3. 先确认现有真源归属：
   - shell continuity projection / request-response semantics → `rcc-core-domain`
   - response-id keyed restore / fallback materialize → `rcc-core-pipeline`
   - host `/v1/responses` ingress shell → `rcc-core-host`
   - transport/auth/runtime → `rcc-core-provider`
4. 只补安装态缺口；若 domain/pipeline/orchestrator 已有真源，就不要再复制一套 host/provider 逻辑。
5. 第一条真实 continuity 主线固定先走 legacy anthropic provider，优先证明 fallback materialize 与 response-id restore。
6. host 只能做 HTTP shell 与响应观测；不要在 host 内长出 conversation store、restore、route bind、provider mapper。
7. provider request payload 必须保持语义等价；只允许在测试里观测，不允许为了 E2E 断言改协议 shape。
8. 缺 store entry 时必须显式失败；不要在安装态路径静默吞掉 continuity 信号。
9. docs 阶段先跑 `python3 scripts/verify_phase14_host_provider_continuity_e2e.py`；进入实现后再逐批补 gate。
10. Batch 04 / 05 只做 unified gate / closeout，不借机扩 provider/runtime 新业务。

## Acceptance Gate
- Phase 14A docs / routing / skill 已完整落盘。
- host/provider continuity E2E 的 crate ownership 已冻结。
- anthropic continuity 安装态第一条主线已明确为 fallback materialize + response-id restore。
- docs gate 与 CI 已可自动收口。

## Anti-Patterns
- 在 host 里新增第二套 continuity store。
- 在 provider 里复制 response-id restore / message materialize。
- 为了 E2E 通过而改写真实 provider payload 语义。
- store miss 时静默继续请求。
- 借 continuity E2E 批次顺手扩 streaming / daemon / sidecar。

## Boundaries
- 本 skill 只负责 host/provider continuity 安装态 E2E，不替代 Phase 10 provider execute 或 Phase 13 continuation 真源。
- 若发现逻辑应继续留在 domain/pipeline/provider block，则回到原真源，不在 E2E 层增壳。
- streaming / SSE / provider-native delta continuity install matrix 不在本批次范围内。

## Sources Of Truth
- `docs/agent-routing/170-host-provider-continuity-e2e-routing.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md`
- `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md`
- `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`
- `rust/crates/rcc-core-orchestrator/src/lib.rs`
