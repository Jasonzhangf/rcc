---
name: rcc-responses-continuation-matrix
description: responses continuation 深矩阵迁移 skill。用于把 submit_tool_outputs / route-aware previous_response_id / conversation store 真源收拢到 domain + pipeline + testkit。
---

# RCC Responses Continuation Matrix

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 Phase 13A continuation 深矩阵迁移约束。

## Trigger Signals
- 用户要求继续推进旧仓 responses continuation 回归。
- Phase 12 closeout 后，需要继续补 `submit_tool_outputs` / `route-aware continuation` / `conversation store` 深矩阵。
- 需要判断 continuation 逻辑应该放 shared helper、pipeline block 还是 smoke 聚合层。
- 需要对 Phase 13 做统一 gate / closeout 收口。

## Standard Actions
1. 先读：`docs/agent-routing/160-responses-continuation-matrix-routing.md`。
2. 再读：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`、当前 batch 文档、gap inventory。
3. 先审计旧仓真源：
   - `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - `../routecodex/tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
   - `../routecodex/tests/sharedmodule/request-continuation-semantics.spec.ts`
   - `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
4. 再做 crate 归属：
   - response-id match / delta-vs-full projection / continuation helper → `rcc-core-domain`
   - route-aware owner apply / store lookup / explicit failure → `rcc-core-pipeline`
   - smoke aggregation → `rcc-core-testkit`
5. 只补当前主线缺口；若已有实现，只补 tests / smoke / gate，不补第二套逻辑。
6. route-aware ordinary continuation 必须优先复用 shared projection helper；禁止 submit_tool_outputs 和 previous_response_id 各自复制一套 prefix/delta 判断。
7. same-provider native continuation 允许 opportunistic delta projection；cross-provider / native unavailable continuation 缺 store entry 必须显式失败。
8. 变更后先跑 `python3 scripts/verify_phase13_responses_continuation_matrix.py`，进入实现后再跑 batch01 gate。
9. 若进入 continuation semantics 批次，再跑 batch02 gate；仅允许补 shared helper 与 smoke，不把 host/provider 变厚。
10. 若进入 responses shell continuity 批次，只允许在 domain shell helper 做字段回投；host 只能复用，不能长出第二套 outbound mapper。
11. 若进入 closeout 批次，batch04 只做顺序聚合；batch05 只做 closeout 文档 + 最终 gate。
12. closeout 文档必须明确 migrated / remaining / out-of-scope / done criteria，不得伪装成新实现真源。

## Acceptance Gate
- Phase 13A docs / routing / skill 已完整落盘。
- response-id keyed continuation shared helper 已进入 `rcc-core-domain`。
- route-aware pipeline regression 已进入 `rcc-core-pipeline`。
- continuation semantics shared helper 已进入 `rcc-core-domain`。
- responses shell continuity projection 已进入 `rcc-core-domain::serialize_responses_shell`。
- Phase 13 unified gate / closeout gate 已进入 `scripts/` / CI / closeout docs。

## Anti-Patterns
- 把 continuation store 重新散落到 host / compat / provider。
- 因为 route-aware 回归而新增 request-id rebind 壳层。
- 缺 store entry 时静默清掉 `previous_response_id` 继续请求。
- 为了通过回归复制一套消息转换实现。
- 借 closeout 批次顺手扩 provider/runtime 新业务。

## Boundaries
- 本 skill 只负责 continuation 深矩阵迁移，不替代 Phase 09 hub pipeline、Phase 10 provider execute 的原始真源。
- streaming / SSE / provider-specific stage2 不在本批次范围内。
- provider 仍只负责 `transport / auth / runtime`，不会接管 continuation materialize。

## Sources Of Truth
- `docs/agent-routing/160-responses-continuation-matrix-routing.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_01.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_02.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_03.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_05.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_CLOSEOUT.md`
- `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_GAP_INVENTORY.md`
- `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`
- `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
- `../routecodex/tests/sharedmodule/route-aware-responses-continuation.spec.ts`
- `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
- `../routecodex/tests/sharedmodule/request-continuation-semantics.spec.ts`
- `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
