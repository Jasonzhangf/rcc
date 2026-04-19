# Regression Matrix 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L17 `docs-map`：Phase 12A 相关文档与 skill 入口。
- L19-L31 `rules`：旧仓矩阵回归迁移约束。
- L33-L37 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：审计 `../routecodex` 旧仓的协议兼容 / continuation / audit / provider compat 等矩阵测试，把它们按当前 Rust 三层结构迁入 `rcc-core`。该阶段只做 **矩阵真源与回归 harness 收口**，不在 host/provider/router 里复制第二套业务逻辑。

## 文档与 skill 映射
1. `docs/PHASE_12_REGRESSION_MATRIX_WORKFLOW.md`
   - Phase 12A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_12_REGRESSION_MATRIX_BATCH_01.md`
   - 第一批实现闭环：旧仓矩阵审计、分层归属、首批 Rust 回归集合。
3. `docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md`
   - 第二批实现闭环：protocol compatibility matrix 真源落盘与 compatibility-grade regression。
4. `docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md`
   - 第三批实现闭环：provider compat 本地样本基线与 sample regression。
5. `docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md`
   - 第四批实现闭环：matrix 聚合 gate 与统一回归入口。
6. `docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md`
   - 第五批实现闭环：Phase 12A closeout gate 与最终收口入口。
7. `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`
   - 已迁入 / backlog / out-of-scope 的阶段关闭真源。
8. `docs/PHASE_12_REGRESSION_MATRIX_GAP_INVENTORY.md`
   - 旧仓矩阵到新仓回归的缺口盘点真源。
9. `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
   - 新仓协议兼容等级、audit 口径、主线路径的文档真源。
10. `.agents/skills/rcc-regression-matrix/SKILL.md`
   - 旧仓矩阵回归迁移的可复用动作。
11. `fixtures/mock-provider/`
   - 新仓本地 provider compat 样本基线。
12. `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - compat matrix 相关真源边界复用入口。
13. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
   - hub inbound / chat process / outbound matrix 相关边界复用入口。
14. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
   - provider execute mainline matrix 相关边界复用入口。
15. `docs/CRATE_BOUNDARIES.md`
   - 确认 matrix 测试按 crate 真源归属，不把断言散落到错误层。

## 规则
1. 先审计旧仓矩阵，再决定迁移批次；不得先写一套“猜测版”新矩阵。
2. 回归矩阵必须按三层归属拆分：
   - pure/domain 断言 -> `rcc-core-domain`
   - block 边界断言 -> 对应 block crate
   - orchestration / end-to-end 断言 -> `rcc-core-orchestrator` / `rcc-core-testkit` / `rcc-core-host`
3. 只迁移当前已落地主线相关矩阵：
   - responses cross-protocol audit
   - provider compat 最小样本存在性
   - routing-state / continuation scope
4. 旧仓矩阵若依赖 TS 内部对象结构，迁移时必须先抽成 Rust 可验证语义，不得照搬 TS shape。
5. regression harness 只验证“语义等价 / audit 口径 / continuation scope / payload 不改写”；不得引入第二套协议转换实现。
6. 当前阶段不做：
   - 前端/UI matrix
   - daemon/session admin matrix
   - OAuth/provider auth matrix
   - 非主线 provider 专属矩阵
7. Batch 02 若进入 compatibility matrix 文档真源，只允许落当前已实现主线：
   - responses -> anthropic/gemini audit 等级
   - continuation sticky scope
   - provider response -> canonical / responses mainline
8. compatibility 等级文档是说明真源，不得变成第二套实现；真正语义仍由 domain/compat/pipeline/provider 真源负责。
9. Batch 03 若进入 provider compat 样本基线，只允许本地保留最小 fixture：
   - `openai-responses.submit_tool_outputs`
   - `anthropic-messages`
   - `openai-chat`
10. 样本 fixture 只做回归基线，不做第二套 mock provider runtime。
11. Batch 04 若进入 unified gate，只允许复用已有 batch01~03 gate；不要再写第三套聚合逻辑或复制断言。
12. Batch 05 若进入 closeout gate，只允许复用 batch04 与 closeout 文档存在性检查；不得把 backlog 假装成已实现能力。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase12_regression_matrix.py`
- 实现阶段：`bash scripts/verify_phase12_regression_matrix_batch01.sh`
- compatibility matrix batch：`bash scripts/verify_phase12_regression_matrix_batch02.sh`
- provider compat samples batch：`bash scripts/verify_phase12_regression_matrix_batch03.sh`
- unified regression entry：`bash scripts/verify_phase12_regression_matrix_batch04.sh`
- closeout entry：`bash scripts/verify_phase12_regression_matrix_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase12-regression-matrix.yml`
