# Phase 13 Responses Continuation Matrix Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 13A 的总流程真源。
- L10-L21 `sequence`：从 docs 到 skill 到 dev 到 test 到 closeout 的执行顺序。
- L23-L39 `minimum-scope`：当前阶段允许实现的最小 continuation 深矩阵闭环。
- L41-L47 `verification`：验证与 CI 入口。
- L49-L61 `done`：本阶段完成判据。

## 目标
把 `../routecodex` 已验证过的 responses continuation 深矩阵，收敛到当前 Rust 主链：

1. response-id keyed conversation store 继续作为唯一状态真源；
2. same-provider native continuation 只做最薄 delta projection；
3. cross-provider / native unavailable continuation 只在 chat process 物化 full input；
4. submit_tool_outputs / ordinary continuation 共用同一批 shared helper，而不是各写一套流程；
5. 阶段 closeout 只做统一 gate 与 backlog 归档，不新增第二套业务断言。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_01.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_02.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_03.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_05.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_CLOSEOUT.md`
     - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_GAP_INVENTORY.md`
     - `docs/agent-routing/160-responses-continuation-matrix-routing.md`
2. **Skills**
   - 建立/更新：`.agents/skills/rcc-responses-continuation-matrix/SKILL.md`
3. **Development**
   - Batch 01：补 response-id keyed continuation shared helper + route-aware pipeline regression。
   - Batch 02：补 request/response continuation semantics shared helper。
   - Batch 03：补 responses shell continuity projection。
   - Batch 04：只做 batch01~03 的 unified gate，不新增业务断言。
   - Batch 05：只做 closeout 文档与最终 gate，不新增业务逻辑。
4. **Test**
   - 先跑 `python3 scripts/verify_phase13_responses_continuation_matrix.py`
   - Batch 01：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
   - Batch 02：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
   - Batch 03：`bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh`
   - Batch 04：`bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
   - Batch 05：`bash scripts/verify_phase13_responses_continuation_matrix_batch05.sh`
5. **Close**
   - docs、skills、实现与验证通过后，对应 batch 才允许关闭。
   - 最终关闭以 batch05 gate + closeout 文档为准。

## 当前阶段最小实现范围
1. 审计旧仓真源：
   - `tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - `tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - `tests/sharedmodule/responses-continuation-store.spec.ts`
   - `tests/sharedmodule/request-continuation-semantics.spec.ts`
   - `tests/sharedmodule/response-continuation-semantics.spec.ts`
2. Phase 13A Batch 01 只负责：
   - 把 ordinary continuation 与 submit_tool_outputs 的 response-id keyed projection helper 收到 `rcc-core-domain`
   - 把 provider-native delta / cross-provider full-input materialize 收到 `rcc-core-pipeline`
   - 建立 `rcc-core-testkit` smoke，证明主线 continuation 深矩阵已闭环
3. Phase 13A Batch 02 只负责：
   - 把 request-side unified continuation semantics lift 收到 `rcc-core-domain`
   - 把 response-side continuation semantics projection 收到 `rcc-core-domain`
   - 建立 `rcc-core-testkit` smoke，证明 request/response continuation semantics 已闭环
4. Phase 13A Batch 03 只负责：
   - 把 responses shell continuity projection 接到 `rcc-core-domain::serialize_responses_shell`
   - 保持 host 极薄，只复用 domain shell helper
   - 建立 `rcc-core-testkit` smoke，证明 `/v1/responses` 出站 continuity 字段已闭环
5. Phase 13A Batch 04 / 05 只负责：
   - 统一 batch01~03 gate
   - closeout 文档与最终 gate 收口
6. 当前阶段明确不做：
   - SSE / stream continuation
   - provider-specific semantic stage2
   - request/response semantic 全量协议映射文档化
   - 第二套 request-id rebind store 或 daemon/cache 服务

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- Batch 01 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh`
- Batch 04 统一入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
- Batch 05 closeout 入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase13-responses-continuation-matrix.yml`

## 完成判据
1. Phase 13A workflow / batch / gap inventory / routing 已完整落盘。
2. responses continuation matrix skill 已落盘。
3. `rcc-core-domain` 已有 response-id keyed continuation projection shared helper。
4. `rcc-core-pipeline` 已有 route-aware native delta 与 cross-provider materialize 主线回归。
5. `rcc-core-testkit` 已有 Phase 13 Batch 01 smoke。
6. `rcc-core-domain` 已有 request/response continuation semantics shared helper。
7. `rcc-core-testkit` 已有 Phase 13 Batch 02 smoke。
8. `rcc-core-domain` 已有 responses shell continuity projection。
9. `rcc-core-testkit` 已有 Phase 13 Batch 03 smoke。
10. batch04 已提供统一入口。
11. batch05 已提供 closeout gate，并明确 backlog 与 out-of-scope。
12. phase13 verify 脚本与 CI 可以自动收口当前阶段。
