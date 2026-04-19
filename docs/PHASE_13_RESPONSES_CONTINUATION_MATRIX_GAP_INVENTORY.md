# Phase 13 Responses Continuation Matrix Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件记录 Phase 13A 进入实现前的 continuation 缺口。
- L10-L20 `source-audit`：当前已识别的旧仓 continuation 真源。
- L22-L31 `gaps`：需要补齐的缺口。
- L33-L39 `targets`：Batch 01 收口目标。

## 目标
在进入 responses continuation 深矩阵迁移前，先明确：

1. 哪些旧仓 continuation tests 是当前主线真源；
2. 新仓已经具备哪些基础能力；
3. 当前还缺的是 shared helper、route-aware pipeline 回归，还是 smoke 入口。

## 当前已识别旧仓真源
1. `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - 真源：submit_tool_outputs 的 response-id keyed restore、structured tool result 保真、conversation state resume。
2. `../routecodex/tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - 真源：same-provider native continuation 与 cross-provider local materialize 的 route-aware 分流。
3. `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
   - 真源：response-id/session scope 下的 restore / materialize 口径。
4. `../routecodex/tests/sharedmodule/request-continuation-semantics.spec.ts`
   - 真源：inbound continuation 统一语义 lift、responses resume cleanup、session/conversation/request_chain sticky scope。
5. `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
   - 真源：response-side continuation semantics、responses required_action / previous_response_id 映射、非 responses request semantics 透传。

## 当前缺口
1. 新仓 `rcc-core-pipeline` 还缺 ordinary `previous_response_id` continuation 的 route-aware store projection。
2. 新仓 `rcc-core-domain` 还缺统一的 delta/full-input projection helper，submit_tool_outputs 与 ordinary continuation 还未共用这类函数。
3. 新仓 `rcc-core-testkit` 还缺聚合 Phase 13 深矩阵 smoke 入口。
4. 需要单独的 phase13 docs gate / batch01 gate / CI 入口，避免把新回归塞回已 closeout 的 Phase 12。
5. 新仓还缺 request/response continuation semantics shared helper，当前 continuation state 只存在 owner 与 store 层，没有统一 semantics 真源。
6. 新仓 `/v1/responses` 壳层还没把 continuation 相关字段从 request/raw provider response 投影回对外响应。

## Batch 01 收口目标
1. docs / skill / verify 先落盘。
2. 建立 response-id keyed continuation projection shared helper。
3. 建立 same-provider native delta / cross-provider materialize 的 pipeline regression。
4. `bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh` 能自动证明：
   - docs / skills 完整
   - 相关 Rust tests 通过
   - Phase 13 smoke 已覆盖 submit_tool_outputs + route-aware continuation 主线

## Batch 02 收口目标
1. 新增 `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_02.md` 与 batch02 gate。
2. 建立 request-side unified continuation semantics lift。
3. 建立 response-side continuation semantics projection。
4. `bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh` 能自动证明：
   - docs / skills 完整
   - 相关 Rust tests 通过
   - Phase 13 smoke 已覆盖 request + response continuation semantics 主线

## Batch 03 收口目标
1. 新增 `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_03.md` 与 batch03 gate。
2. 建立 responses shell continuity projection。
3. 保证 host 继续只复用 domain shell helper，不新长业务壳。
4. `bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh` 能自动证明：
   - docs / skills 完整
   - 相关 Rust tests 通过
   - Phase 13 smoke 已覆盖 response id / previous_response_id / request_id 的最小 continuity projection


## Batch 04 收口目标
1. 新增 `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md` 与 batch04 gate。
2. 聚合执行 batch01~03，不新增第四套断言。
3. `bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh` 能自动证明：
   - docs / skills 完整
   - batch01~03 主线 gate 已统一收口

## Batch 05 收口目标
1. 新增 `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_05.md`、closeout 文档与 batch05 gate。
2. closeout 明确写出 migrated / remaining / out-of-scope / done criteria。
3. `bash scripts/verify_phase13_responses_continuation_matrix_batch05.sh` 能自动证明：
   - docs / skills 完整
   - batch04 unified gate 通过
   - closeout 文档存在
