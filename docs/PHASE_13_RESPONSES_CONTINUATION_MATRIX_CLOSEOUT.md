# Phase 13 Responses Continuation Matrix Closeout

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 13A 的 closeout 真源。
- L10-L29 `migrated`：当前已迁入的新仓矩阵真源。
- L31-L54 `remaining`：部分覆盖 / 尚未迁入的旧仓矩阵清单。
- L56-L60 `out-of-scope`：明确不属于当前阶段的范围。
- L62-L69 `done`：Phase 13A 完成标准与后续入口。

## 目标
给 Phase 13A 做阶段性关闭说明：

1. 哪些旧仓 continuation 矩阵已经迁入并有新仓验证入口；
2. 哪些 continuity/semantic/backlog 仍未迁入，但不阻塞当前阶段关闭；
3. 当前阶段为什么可以在 batch05 收口。

## 已迁入旧仓矩阵真源
1. `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
     - `project_responses_native_continuation`
     - `materialize_responses_continuation_from_entry`
     - `rust/crates/rcc-core-pipeline/src/lib.rs`
     - `rcc-core-testkit::run_phase13_batch01_responses_continuation_smoke`
2. `../routecodex/tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
     - `rust/crates/rcc-core-pipeline/src/lib.rs`
     - `rcc-core-testkit::run_phase13_batch01_responses_continuation_smoke`
3. `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
     - `rust/crates/rcc-core-pipeline/src/lib.rs`
     - `rcc-core-testkit::run_phase13_batch01_responses_continuation_smoke`
4. `../routecodex/tests/sharedmodule/request-continuation-semantics.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/continuation_semantics.rs`
     - `lift_request_continuation_semantics`
     - `take_responses_resume_state`
     - `rcc-core-testkit::run_phase13_batch02_responses_continuation_semantics_smoke`
5. `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/continuation_semantics.rs`
     - `project_response_continuation_semantics`
     - `project_responses_shell_continuation`
     - `rust/crates/rcc-core-domain/src/responses_ingress.rs`
     - `serialize_responses_shell`
     - `rcc-core-testkit::run_phase13_batch02_responses_continuation_semantics_smoke`
     - `rcc-core-testkit::run_phase13_batch03_responses_shell_continuity_smoke`
6. Phase 13A 统一回归入口
   - `bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
   - 收口 batch01~03 gate，供本地与 CI 复用。

## 部分覆盖 / 尚未迁入矩阵
1. request continuation deeper hooks：
   - `tests/sharedmodule/request-continuation-semantics.spec.ts` 中更深 stage-level hook / lifecycle 细化仍未单独迁批。
2. response continuation deeper provider mapping：
   - `tests/sharedmodule/response-continuation-semantics.spec.ts` 中非 responses provider-specific mapper 全量迁移仍未完成。
3. streaming / SSE continuity：
   - `tests/sharedmodule/chat-sse-usage-roundtrip.spec.ts`
   - `tests/sharedmodule/native-required-exports-sse-stream.spec.ts`
4. provider-specific semantic stage2：
   - `tests/sharedmodule/anthropic-semantics-stage2.spec.ts`
   - `tests/sharedmodule/gemini-semantics-stage2.spec.ts`
   - `tests/sharedmodule/openai-chat-semantics-stage2.spec.ts`
5. host/install real E2E continuity assert：
   - 当前已有 shell continuity 回投与 testkit smoke；安装态 continuity 端到端断言仍应在后续 host/provider 阶段单独阶段化。
6. 这些矩阵未迁入的原因：
   - 不是当前 Phase 13A 的最小主线
   - 依赖更深的 provider-specific 或 stream-specific 真源
   - 应在后续阶段按 block/domain 真源继续拆批迁移，而不是在 closeout 批次扩 scope

## 非当前阶段目标
1. frontend / CLI / daemon / session admin continuity 矩阵。
2. SSE / streaming golden sample 全量迁移。
3. provider-specific stage2 continuity/runtime 语义闭环。
4. 为测试目的新增第二套 mapper/runtime/mock 系统。

## Phase 13A 完成标准
1. docs / routing / skill / gap inventory 已完整落盘。
2. batch01~03 主线 continuation matrix 已迁入并各自有 gate。
3. batch04 已提供统一入口。
4. batch05 已提供 closeout gate，并明确 backlog 与 out-of-scope。
5. 现阶段后续入口：
   - request/response continuation 更深 semantics 细化
   - SSE / stream continuity 矩阵
   - provider-specific stage2 语义矩阵
   - host/provider 安装态 continuity E2E 回归
