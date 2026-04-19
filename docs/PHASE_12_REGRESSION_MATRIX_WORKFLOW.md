# Phase 12 Regression Matrix Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 12A 的总流程真源。
- L10-L19 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L21-L35 `minimum-scope`：当前阶段允许实现的最小回归矩阵闭环。
- L37-L42 `verification`：验证与 CI 入口。
- L44-L52 `done`：本阶段完成判据。

## 目标
把 `../routecodex` 中已经证明有效的主线矩阵测试，按当前 Rust 架构迁入 `rcc-core`：

1. 旧仓矩阵先被审计并分层；
2. 新仓回归矩阵只覆盖当前已经落地的主线；
3. 测试真源跟随 crate 边界，不制造第二套业务真源。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_12_REGRESSION_MATRIX_WORKFLOW.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_01.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`
     - `docs/PHASE_12_REGRESSION_MATRIX_GAP_INVENTORY.md`
     - `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
     - `docs/agent-routing/150-regression-matrix-routing.md`
2. **Skills**
   - 建立/更新：`.agents/skills/rcc-regression-matrix/SKILL.md`
3. **Development**
   - 先只做 Batch 01~05 要求的最小矩阵迁移与 closeout，不提前扩到 UI / daemon / auth / 非主线 provider。
4. **Test**
   - 先跑 `python3 scripts/verify_phase12_regression_matrix.py`
   - 进入实现批次后跑 `bash scripts/verify_phase12_regression_matrix_batch01.sh`
   - compatibility matrix 批次再跑 `bash scripts/verify_phase12_regression_matrix_batch02.sh`
   - provider compat sample 批次再跑 `bash scripts/verify_phase12_regression_matrix_batch03.sh`
   - unified regression 入口再跑 `bash scripts/verify_phase12_regression_matrix_batch04.sh`
   - closeout 入口再跑 `bash scripts/verify_phase12_regression_matrix_batch05.sh`
5. **Close**
   - docs、skills、实现与验证通过后，batch05 才允许关闭当前 Phase 12A。

## 当前阶段最小实现范围
1. 审计旧仓三类矩阵真源：
   - `tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
   - `tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
   - `tests/sharedmodule/provider-compat-tests.spec.ts`
2. Phase 12A Batch 01 只负责：
   - 明确每个旧仓矩阵断言该归属到哪个 Rust crate
   - 在新仓建立首批等价回归入口
   - 用 Rust tests / testkit smoke 验证当前主线没有回归
3. Phase 12A Batch 02 只负责：
   - 把旧仓 `protocol-compatibility-matrix.md` 收成新仓 docs 真源
   - 补 compatibility grade 的第二批 Rust regression
   - 让文档口径与 Rust audit / compat / continuation 回归收敛到同一入口
4. Phase 12A Batch 03 只负责：
   - 把旧仓 provider compat 样本基线最小本地化
   - 补本地 fixture existence / parse / apply_patch submit_tool_outputs regression
   - 保持样本只作为回归证据，不变成 runtime 依赖
5. Phase 12A Batch 04 只负责：
   - 聚合 batch01~03 的回归 gate
   - 提供单一短路径入口给本地与 CI
   - 保持聚合层极薄，不复制具体断言
6. Phase 12A Batch 05 只负责：
   - closeout 文档落盘
   - 聚合 batch04 与 closeout 文档存在性检查
   - 为 Phase 12A 提供最终关闭入口
7. 当前阶段不负责：
   - 前端 / CLI / daemon / auth / OAuth / session admin 矩阵
   - 非主线 provider 的深度 provider-specific matrix
   - 流式事件 golden sample 全量迁移

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase12_regression_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase12_regression_matrix_batch01.sh`
- compatibility matrix 批次入口：`bash scripts/verify_phase12_regression_matrix_batch02.sh`
- provider compat samples 批次入口：`bash scripts/verify_phase12_regression_matrix_batch03.sh`
- unified regression 入口：`bash scripts/verify_phase12_regression_matrix_batch04.sh`
- closeout 入口：`bash scripts/verify_phase12_regression_matrix_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase12-regression-matrix.yml`

## 完成判据
1. Phase 12A docs 与 routing 完整。
2. regression matrix skill 已落盘。
3. 旧仓首批矩阵已完成审计与 crate 归属表。
4. 新仓已存在首批 Rust 回归入口，覆盖 audit / continuation / provider compat 最小主线。
5. 新仓 `docs/PROTOCOL_COMPATIBILITY_MATRIX.md` 已成为 compatibility 等级真源。
6. 新仓最小 provider compat fixture baseline 已本地化。
7. 新仓已存在统一 regression 入口，覆盖 batch01~03。
8. 新仓已存在 batch05 closeout 入口，覆盖 batch04 + closeout 文档存在性。
9. phase12 verify 脚本与 CI 可自动收口当前批次。
