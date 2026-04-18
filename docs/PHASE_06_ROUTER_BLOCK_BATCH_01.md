# Phase 06 Router Block Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的最小 router 闭环。
- L10-L18 `source`：旧仓对应真源切片。
- L20-L31 `scope`：本批次允许进入实现的最小范围。
- L33-L41 `boundaries`：本批次明确不做的内容。
- L43-L47 `verification`：当前批次在 docs 阶段的验证入口。

## 目标
把 `rcc-core-router` 的第一刀固定为：`route candidate normalization + routing state filter + instruction target`。这一批只回答“路由候选怎么被规范化、怎样被状态过滤、显式 target 怎样被解开”，不提前承担 health/quota/cooldown/sticky/failover。

## 旧仓真源切片
1. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/route-utils.ts`
2. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/routing-state-filter.ts`
3. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/instruction-target.ts`
4. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/key-parsing.ts`

## 本批次最小范围
1. 目标文件规划：
   - `rust/crates/rcc-core-router/src/route_candidates.rs`
   - `rust/crates/rcc-core-router/src/routing_state_filter.rs`
   - `rust/crates/rcc-core-router/src/instruction_target.rs`
   - `rust/crates/rcc-core-router/src/lib.rs`
2. 本批次只收三段语义：
   - `route candidate normalization`
   - `routing state filter`
   - `instruction target`
3. 允许的输入：
   - 显式 `requested_route`
   - 可选 `classification_candidates`
   - 显式 route pools
   - 显式 routing instruction state
   - 显式 provider registry view
4. 允许的输出：
   - canonical ordered route candidates
   - canonical instruction target result（`exact` / `filter`）
5. 若存在共享纯函数，应继续优先复用 `rcc-core-domain`，不要在 router 内复制 codec / parser / validator。

## 本批次明确不做
1. 不做 provider transport/auth/runtime。
2. 不做 servertool followup/stop/tool governance。
3. 不做 health manager、quota bucket、cooldown manager、sticky pool、tier load balancing。
4. 不做 provider failover、snapshot telemetry、protocol conversion。
5. 不做 host / orchestrator 额外包装层；兼容入口只允许薄调用壳。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase6_router_block.py`
- 当前实现 gate：`bash scripts/verify_phase6_router_batch01.sh`
- 当前实现阶段证据：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet`
