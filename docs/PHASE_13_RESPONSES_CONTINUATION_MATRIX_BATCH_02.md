# Phase 13 Responses Continuation Matrix Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L34 `mapping`：旧仓 continuation semantics 真源到新仓 crate 的归属映射。
- L36-L40 `boundaries`：本批次明确不做的内容。
- L42-L45 `verification`：当前批次验证入口。

## 目标
完成 **responses continuation semantics 第一批迁移**，只锁三件事：

1. request-side unified continuation semantics lift；
2. response-side continuation semantics projection；
3. non-responses request semantics preserve。

## 本批次最小范围
1. 参考旧仓真源：
   - `../routecodex/tests/sharedmodule/request-continuation-semantics.spec.ts`
   - `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
2. 本批次只允许新增：
   - continuation semantics shared helper
   - 对应 Rust 单测 / smoke / verify 脚本
3. 允许的输出：
   - `rcc-core-domain` 纯函数测试
   - `rcc-core-testkit` smoke 与自动化 gate

## 旧仓 continuation semantics 真源 → 新仓 crate 归属
1. `request-continuation-semantics`
   - 真源归属：
     - `rcc-core-domain`：responses resume cleanup、sticky scope 统一口径、tool continuation projection
     - `rcc-core-testkit`：最小 smoke 聚合
2. `response-continuation-semantics`
   - 真源归属：
     - `rcc-core-domain`：responses required_action / previous_response_id 映射、non-responses request semantics preserve
     - `rcc-core-testkit`：最小 smoke 聚合

## 本批次明确不做
1. 不新增第二套 chat response mapper 框架。
2. 不把 continuation semantics 硬塞进 compat/provider/host 真源。
3. 不扩到 SSE / stream event 语义。
4. 不做 provider-specific stage2 语义。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- 当前 Batch 01 入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
- 当前实现阶段入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
