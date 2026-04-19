# Phase 13 Responses Continuation Matrix Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L32 `mapping`：旧仓 continuity 回投口径到新仓 crate 的归属映射。
- L34-L38 `boundaries`：本批次明确不做的内容。
- L40-L43 `verification`：当前批次验证入口。

## 目标
完成 **responses shell continuity projection**，只锁三件事：

1. `/v1/responses` 壳层输出真实 `id`；
2. continuation 链上的 `previous_response_id` 能从 raw response / request 薄投影回来；
3. host 继续只复用 domain shell helper，不新增第二套 remap。

## 本批次最小范围
1. 参考旧仓真源：
   - `../routecodex/tests/sharedmodule/response-continuation-semantics.spec.ts`
2. 本批次只允许新增：
   - responses shell continuity shared helper
   - 对应 Rust 单测 / smoke / verify 脚本
3. 允许的输出：
   - `rcc-core-domain` 纯函数测试
   - `rcc-core-testkit` smoke 与自动化 gate

## continuity 回投口径 → 新仓 crate 归属
1. responses shell continuity
   - 真源归属：
     - `rcc-core-domain`：response id / previous_response_id / request_id 的薄投影
     - `rcc-core-testkit`：最小 smoke 聚合

## 本批次明确不做
1. 不新增第二套 host 出站 mapper。
2. 不把 continuation 语义搬进 host/provider/compat。
3. 不扩到 stream/SSE continuity 事件。
4. 不做 provider-specific stage2。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- 当前 Batch 02 入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
- 当前实现阶段入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh`
