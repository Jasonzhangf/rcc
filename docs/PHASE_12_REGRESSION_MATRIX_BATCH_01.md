# Phase 12 Regression Matrix Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L24 `scope`：本批次允许进入实现的最小范围。
- L26-L36 `mapping`：旧仓矩阵到新仓 crate 的归属映射。
- L38-L43 `boundaries`：本批次明确不做的内容。
- L45-L48 `verification`：当前批次验证入口。

## 目标
完成 **旧仓主线矩阵的第一批回归迁移**，只锁三件事：

1. `responses cross-protocol audit`
2. `routing-state / continuation scope`
3. `provider compat minimal samples`

## 本批次最小范围
1. 参考旧仓真源：
   - `../routecodex/tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
   - `../routecodex/tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
   - `../routecodex/tests/sharedmodule/provider-compat-tests.spec.ts`
   - `../routecodex/docs/protocol-compatibility-matrix.md`
2. 本批次只允许新增：
   - matrix inventory / mapping docs
   - 首批 Rust unit / integration 回归
   - 对应 verify 脚本和 CI 入口
3. 允许的输出：
   - crate 归属表
   - Rust regression tests / testkit smoke
   - 自动化验证脚本

## 旧仓矩阵 → 新仓 crate 归属
1. `responses-cross-protocol-audit-matrix`
   - 真源归属：
     - `rcc-core-domain`：audit bucket 与字段口径
     - `rcc-core-compat` / `rcc-core-orchestrator`：主线投影闭环
2. `routing-state-continuation-matrix`
   - 真源归属：
     - `rcc-core-domain`：continuation owner / sticky scope 纯函数
     - `rcc-core-router`：runtime route state 可见性（如需要）
3. `provider-compat-tests`
   - 真源归属：
     - `rcc-core-testkit`：最小样本存在性与主线 smoke
     - `rcc-core-compat`：anthropic / openai / gemini 主线 shape 已落地的最小存在断言

## 本批次明确不做
1. 不迁移旧仓所有 sharedmodule tests。
2. 不把 TS sample loader 直接照搬进 Rust。
3. 不新增第二套 canonical model 或第二套 audit schema。
4. 不为 matrix 迁移引入 daemon、fixture server 常驻进程或复杂快照系统。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase12_regression_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase12_regression_matrix_batch01.sh`
