# Phase 06 Router Block Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的最小 router 闭环。
- L10-L17 `source`：旧仓对应真源切片。
- L19-L31 `scope`：本批次允许进入实现的最小范围。
- L33-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-router` 的第二刀固定为：`capability reorder + preferred-model reorder`。这一批只回答“已有候选路由怎样因为 capability 或 preferred model 重新排序”，不提前承担 sticky / alias / health / quota / cooldown / failover。

## 旧仓真源切片
1. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/route-utils.ts`
2. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/provider-registry.ts`

## 本批次最小范围
1. 目标文件规划：
   - `rust/crates/rcc-core-router/src/route_candidates.rs`
   - `rust/crates/rcc-core-router/src/routing_state_filter.rs`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
2. 本批次只收两段语义：
   - `capability reorder`
   - `preferred-model reorder`
3. 允许的输入：
   - canonical ordered route candidates
   - 显式 capability（如 `thinking` / `web_search`）
   - 显式 preferred model id
   - 显式 route pools
   - 显式 provider registry minimal view
4. 允许的输出：
   - reordered canonical route candidates
5. provider registry 继续只允许以显式最小 view 进入 router：
   - `provider_id`
   - `key_alias`
   - `runtime_index`
   - `model_id`
   - `model_capabilities`

## 本批次明确不做
1. 不做 alias queue、sticky pool、sticky lease。
2. 不做 health manager、quota bucket、cooldown manager。
3. 不做 tier load balancing、fallback analytics、provider failover。
4. 不做 provider transport/auth/runtime。
5. 不做 host / orchestrator 额外包装层。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase6_router_block.py`
- 当前实现 gate：`bash scripts/verify_phase6_router_batch02.sh`
- 当前实现阶段证据：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet`
