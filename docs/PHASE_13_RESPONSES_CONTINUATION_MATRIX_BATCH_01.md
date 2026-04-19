# Phase 13 Responses Continuation Matrix Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L23 `scope`：本批次允许进入实现的最小范围。
- L25-L35 `mapping`：旧仓 continuation 真源到新仓 crate 的归属映射。
- L37-L41 `boundaries`：本批次明确不做的内容。
- L43-L46 `verification`：当前批次验证入口。

## 目标
完成 **responses continuation 深矩阵第一批迁移**，只锁三件事：

1. `submit_tool_outputs` response-id keyed restore 更深回归；
2. `route-aware previous_response_id` 的 same-provider native delta / cross-provider materialize；
3. `responses conversation store` 的 shared projection helper 回归。

## 本批次最小范围
1. 参考旧仓真源：
   - `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
   - `../routecodex/tests/sharedmodule/route-aware-responses-continuation.spec.ts`
   - `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
2. 本批次只允许新增：
   - continuation projection shared helper
   - route-aware pipeline regression
   - 对应 smoke / verify 脚本 / CI 入口
3. 允许的输出：
   - `rcc-core-domain` 纯函数测试
   - `rcc-core-pipeline` block regression
   - `rcc-core-testkit` smoke 与自动化 gate

## 旧仓 continuation 真源 → 新仓 crate 归属
1. `responses-submit-tool-outputs`
   - 真源归属：
     - `rcc-core-domain`：response-id keyed restore / tool result projection helper
     - `rcc-core-pipeline`：submit_tool_outputs store restore 主链
2. `route-aware-responses-continuation`
   - 真源归属：
     - `rcc-core-domain`：delta / full-input projection helper
     - `rcc-core-pipeline`：same-provider native delta / cross-provider materialize
3. `responses-continuation-store`
   - 真源归属：
     - `rcc-core-domain`：conversation entry、response-id match、prefix-vs-delta projection
     - `rcc-core-testkit`：最小 smoke 聚合

## 本批次明确不做
1. 不迁移 request-id rebind 壳层。
2. 不引入 session/conversation 双索引 store。
3. 不把 continuation semantics 文档扩成新协议层。
4. 不为测试新增后台常驻进程、缓存服务或第二套 provider runtime。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
