---
name: rcc-regression-matrix
description: rcc-core 的旧仓矩阵回归迁移 skill。用于审计 ../routecodex 的主线矩阵测试，并把 audit / continuation / provider compat 的首批回归迁入新 Rust 真源。
---

# RCC Regression Matrix

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充旧仓矩阵回归迁移约束。

## Trigger Signals
- 用户要求把旧仓矩阵测试迁入新仓做回归。
- 当前主线骨架已经打通，需要开始做业务回归证据。
- 需要判断某个旧仓 matrix 应归属 domain / block / orchestration 哪一层。
- 需要给当前 phase 做 closeout / backlog / out-of-scope 收口。

## Standard Actions
1. 先读：`docs/agent-routing/150-regression-matrix-routing.md`。
2. 再读：`docs/PHASE_12_REGRESSION_MATRIX_WORKFLOW.md`、当前 batch 文档、gap inventory。
3. 若进入 compatibility matrix 批次，再读：`docs/PROTOCOL_COMPATIBILITY_MATRIX.md`。
4. 若进入 provider compat 样本批次，再读：`docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md`。
5. 若进入 unified gate 批次，再读：`docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md`。
6. 若进入 closeout 批次，再读：`docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md` 与 `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`。
7. 先审计旧仓真源文件，再做 crate 归属：
   - pure semantic / audit bucket / continuation scope → `rcc-core-domain`
   - compat shape mapping mainline → `rcc-core-compat`
   - orchestration / smoke / sample presence → `rcc-core-orchestrator` / `rcc-core-testkit`
8. compatibility 等级文档只写当前已实现主线；不能提前承诺还没落地的 public protocol surface。
9. provider compat 样本只保留最小 fixture 与 registry；不得把旧仓大体积样本整包搬进来。
10. unified gate 只能复用已有 batch gate，不得复制断言。
11. closeout gate 只能复用 batch04 与 closeout 文档存在性检查，不得扩成新实现批次。
12. 旧仓 TS shape 不得原样照搬；先抽成 Rust 可验证语义。
13. 若新仓业务已实现，只缺验证入口，则只补 tests / smoke，不补第二套实现。
14. 变更后先跑 `python3 scripts/verify_phase12_regression_matrix.py`，进入实现批次后再跑对应 batch gate。

## Acceptance Gate
- 旧仓矩阵真源与新仓 crate 归属已落盘。
- 当前批次范围明确，只覆盖已打通主线。
- 新仓回归入口不复制业务语义。
- batch05 closeout 已明确 migrated / backlog / out-of-scope。
- phase12 docs gate 与当前 batch gate 通过。

## Anti-Patterns
- 把旧仓 Jest/TS helper 整包搬进 Rust。
- 为了通过 matrix 去修改真实 payload 语义。
- 在错误层补“测试专用逻辑”。
- 一次性迁移所有旧仓 tests，导致 scope 爆炸。
- 在 closeout 文档里把 backlog 写成“已支持”。

## Boundaries
- 本 skill 只负责 regression matrix 迁移，不替代 compat / pipeline / provider 真源。
- 若某断言证明属于 provider transport/auth/runtime，应留在 provider。
- 若某断言证明属于 chat semantic / audit / continuation，应回到 domain/compat。

## Sources Of Truth
- `docs/agent-routing/150-regression-matrix-routing.md`
- `docs/PHASE_12_REGRESSION_MATRIX_WORKFLOW.md`
- `docs/PHASE_12_REGRESSION_MATRIX_BATCH_01.md`
- `docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md`
- `docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md`
- `docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md`
- `docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md`
- `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`
- `docs/PHASE_12_REGRESSION_MATRIX_GAP_INVENTORY.md`
- `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
- `../routecodex/tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
- `../routecodex/tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
- `../routecodex/tests/sharedmodule/provider-compat-tests.spec.ts`
- `../routecodex/docs/protocol-compatibility-matrix.md`
