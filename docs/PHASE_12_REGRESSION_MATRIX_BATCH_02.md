# Phase 12 Regression Matrix Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L34 `truth`：compatibility matrix 文档真源与 Rust 断言的对应关系。
- L36-L40 `boundaries`：本批次明确不做的内容。
- L42-L45 `verification`：当前批次验证入口。

## 目标
完成 **protocol compatibility matrix 真源** 的新仓落盘，并补第二批 Rust regression，让文档口径与当前主线实现对齐。

## 本批次最小范围
1. 新增：
   - `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`
   - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md`
   - `scripts/verify_phase12_regression_matrix_batch02.sh`
2. 本批次只锁三类语义：
   - responses -> anthropic/gemini 的 compatibility 等级口径
   - continuation sticky scope 的矩阵口径
   - compat mainline 的 anthropic/gemini 最小 full-path shape
3. 允许的实现：
   - docs 真源
   - domain / compat / testkit regression
   - CI gate

## 文档真源 ↔ Rust 断言
1. `dropped / unsupported / lossy / preserved`
   - `rcc-core-domain::build_responses_cross_protocol_audit`
2. `request_chain / session / conversation / request`
   - `rcc-core-domain::resolve_continuation_sticky_key`
3. anthropic / gemini 最小 full-path request shape
   - `rcc-core-domain::build_provider_request_carrier_from_canonical_outbound`
   - `rcc-core-testkit` regression smoke

## 本批次明确不做
1. 不承诺 Gemini public client protocol。
2. 不迁移 anthropic tool alias fidelity 的完整恢复链。
3. 不补 streaming golden sample 全量矩阵。
4. 不新增第二套 protocol mapping 实现。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase12_regression_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase12_regression_matrix_batch02.sh`
