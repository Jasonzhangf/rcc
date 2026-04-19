# Phase 12 Regression Matrix Closeout

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 12A 的 closeout 真源。
- L10-L22 `migrated`：当前已迁入的新仓矩阵真源。
- L24-L42 `remaining`：部分覆盖 / 尚未迁入的旧仓矩阵清单。
- L44-L48 `out-of-scope`：明确不属于当前阶段的范围。
- L50-L56 `done`：Phase 12A 完成标准与后续入口。

## 目标
给 Phase 12A 做阶段性关闭说明：

1. 哪些旧仓矩阵已经迁入并有新仓验证入口；
2. 哪些矩阵仍在 backlog，但不阻塞当前阶段关闭；
3. 当前阶段为什么可以在 batch05 收口。

## 已迁入旧仓矩阵真源
1. `../routecodex/tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
   - 新仓落点：
     - `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
     - `rcc-core-domain::build_responses_cross_protocol_audit`
     - `rcc-core-testkit::run_phase9_batch06_audit_matrix_smoke`
2. `../routecodex/tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
   - 新仓落点：
     - `rust/crates/rcc-core-domain/src/continuation_sticky_key.rs`
     - `resolve_continuation_sticky_key`
     - Phase 12 batch01 / batch02 regression
3. `../routecodex/tests/sharedmodule/provider-compat-tests.spec.ts`
   - 新仓落点：
     - `fixtures/mock-provider/`
     - `rcc-core-testkit::run_phase12_batch03_provider_compat_samples_smoke`
4. `../routecodex/docs/protocol-compatibility-matrix.md`
   - 新仓落点：
     - `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
     - Phase 12 batch02 regression
5. Phase 12A 统一回归入口
   - `bash scripts/verify_phase12_regression_matrix_batch04.sh`
   - 收口 batch01~03 gate，供本地与 CI 复用。

## 部分覆盖 / 尚未迁入矩阵
1. provider compat 深化：
   - `tests/sharedmodule/provider-compat-anthropic.spec.ts`
   - `tests/sharedmodule/provider-compat-gemini.spec.ts`
2. responses continuation / state 细化：
   - `tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - `tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - `tests/sharedmodule/responses-continuation-store.spec.ts`
   - `tests/sharedmodule/response-continuation-semantics.spec.ts`
   - `tests/sharedmodule/request-continuation-semantics.spec.ts`
3. responses semantic / transparency 细化：
   - `tests/sharedmodule/responses-cross-protocol-reasoning-mapping.spec.ts`
   - `tests/sharedmodule/responses-field-transparency.spec.ts`
   - `tests/sharedmodule/responses-prompt-cache-cross-protocol.spec.ts`
4. provider-specific semantic stage2：
   - `tests/sharedmodule/anthropic-semantics-stage2.spec.ts`
   - `tests/sharedmodule/gemini-semantics-stage2.spec.ts`
   - `tests/sharedmodule/openai-chat-semantics-stage2.spec.ts`
5. hub / router / stream 深化：
   - `tests/sharedmodule/hub-pipeline-router-metadata.spec.ts`
   - `tests/sharedmodule/hub-pipeline-heavy-input-fastpath.spec.ts`
   - `tests/sharedmodule/chat-sse-usage-roundtrip.spec.ts`
   - `tests/sharedmodule/native-required-exports-sse-stream.spec.ts`
   - `tests/sharedmodule/virtual-router-*.spec.ts`
6. 这些矩阵未迁入的原因：
   - 不是当前 Phase 12A 的最小主线
   - 依赖更深的 provider-specific 或 stream-specific 真源
   - 应在后续阶段按 block/domain 真源继续拆批迁移，而不是在 closeout 批次扩 scope

## 非当前阶段目标
1. frontend / CLI / daemon / auth / OAuth / session admin 矩阵。
2. 大体积 sample replay / streaming golden sample 全量迁移。
3. 为测试目的新增第二套 mock runtime 或协议转换实现。

## Phase 12A 完成标准
1. docs / routing / skill / gap inventory 已完整落盘。
2. batch01~03 主线矩阵已迁入并各自有 gate。
3. batch04 已提供统一入口。
4. batch05 已提供 closeout gate，并明确 backlog 与 out-of-scope。
5. 现阶段后续入口：
   - anthropic / gemini 更深 provider compat 回归
   - responses continuation 更深矩阵
   - hub / router / stream 相关矩阵按 block 真源继续迁移
