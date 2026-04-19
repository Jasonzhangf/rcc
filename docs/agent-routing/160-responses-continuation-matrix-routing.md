# Responses Continuation Matrix 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L19 `docs-map`：Phase 13A 相关文档与 skill 入口。
- L21-L35 `rules`：responses continuation 深矩阵迁移约束。
- L37-L42 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：审计 `../routecodex` 旧仓 `responses continuation / submit_tool_outputs / route-aware continuation / conversation store` 真源，把它们按当前 Rust 三层结构迁入 `rcc-core`。该阶段只做 **response-id keyed continuation 主线深化 + closeout 收口**，不引入第二套 conversation store、也不把 continuation 业务重新散落到 host / compat / provider。

## 文档与 skill 映射
1. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`
   - Phase 13A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_01.md`
   - 第一批实现闭环：submit_tool_outputs deeper matrix、route-aware native delta / cross-provider materialize、conversation store deepen regression。
3. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_02.md`
   - 第二批实现闭环：request-side unified continuation semantics、response-side continuation semantics projection、non-responses request semantics preserve。
4. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_03.md`
   - 第三批实现闭环：responses shell continuity projection、request/raw response continuity 字段回投、host 薄壳复用验证。
5. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md`
   - 第四批实现闭环：统一 batch01~03 gate，不新增新断言。
6. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_05.md`
   - 第五批实现闭环：closeout 文档与最终 gate。
7. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_CLOSEOUT.md`
   - Phase 13A 已迁入 / 未迁入 / out-of-scope / done criteria 真源。
8. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_GAP_INVENTORY.md`
   - 当前 continuation 深矩阵缺口盘点真源。
9. `.agents/skills/rcc-responses-continuation-matrix/SKILL.md`
   - responses continuation 深矩阵迁移的可复用动作。
10. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
   - hub pipeline continuation ownership 与 no-copy 规则复用入口。
11. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
   - provider-native continuation ownership 的主线路径复用入口。
12. `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`
   - Phase 13A 的 backlog 来源真源。
13. `docs/CRATE_BOUNDARIES.md`
   - 确认 continuation shared helper / block / smoke 的 crate 归属。

## 规则
1. 先审计旧仓 continuation 真源，再决定 Rust 归属；不得直接照搬 TS store/helper。
2. 本阶段 continuation 只允许按三层拆分：
   - shared pure semantic / projection helper -> `rcc-core-domain`
   - response-id keyed restore / route-aware ownership -> `rcc-core-pipeline`
   - smoke / regression aggregation -> `rcc-core-testkit`
3. response-id keyed continuation 只认当前主线：
   - same-provider + native support -> provider-native，优先投影 delta input
   - cross-provider 或 native unavailable -> chat-process fallback，物化 full input
   - submit_tool_outputs restore 仍走 response-id keyed store，不得回退到 request-id 绑定壳层
4. compat 仍只做 hub 后 / provider 前的 shape mapping；不得把 continuation store 搬进 compat。
5. provider 仍只负责 `transport / auth / runtime`；不得在 provider 内复制 continuation materialize。
6. host 仍保持极薄；不得在 host 里新增 conversation cache、后台线程或守护进程。
7. continuation fallback 若缺少必要 store entry，必须显式失败；禁止静默降级或伪造 full input。
8. 默认 minimal-copy：能基于已有 canonical message slice 做投影，就不要重复编码/解码 JSON。
9. Batch 01 只做非 streaming 主线；不提前扩到 SSE / stream event replay / provider-specific stage2。
10. Batch 02 只允许把统一 continuation semantics 收到 domain shared helper；不得因为语义回归把第二套 chat envelope / response mapper 框架搬回 Rust 主链。
11. Batch 03 只允许把 continuity 字段回投到 `serialize_responses_shell`；不得把 host 变成第二套 remap/runtime 层。
12. Batch 04 / 05 只允许做 gate 顺序与 closeout 文档收口；不得借 closeout 再扩业务实现。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- Batch 01 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh`
- Batch 04 统一入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
- Batch 05 closeout 入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase13-responses-continuation-matrix.yml`
