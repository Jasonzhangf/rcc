# Phase 06 Router Block Batch 05

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 05 的实现闭环。
- L10-L19 `scope`：本批次允许进入实现的最小范围。
- L21-L31 `flow`：selected target handoff 的正确位置。
- L33-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-router` 的第五刀固定为：**在 route 真源仍只留在 router 的前提下，补齐最小 `selected_target` handoff**。

1. `RouterBlock::select()` 在已有 `selected_route` 基础上，继续给出最小 `selected_target`；
2. target 解析仍由 router 真源负责，不回流 compat / provider / orchestrator；
3. 下游只消费 handoff，不复制 target 选择规则。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_06_ROUTER_BLOCK_BATCH_05.md`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-router/src/route_candidates.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `rust/crates/rcc-core-domain/src/responses_ingress.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `scripts/verify_phase6_router_batch05.sh`
2. 本批次只锁三段新语义：
   - selected target resolve
   - `RouteDecision.selected_target`
   - route result 主链透传
3. 允许的输出：
   - `RouteDecision.target_block`
   - `RouteDecision.selected_route`
   - `RouteDecision.selected_target`
   - `RouteDecision.candidate_routes`
4. 当前批次关键边界：
   - router 继续只做 route truth
   - compat/provider 只接 handoff，不复制 target resolve
   - host/responses shell 只透传 route result

## 正确流水线位置
```text
config/bootstrap routes
      │
      ▼
rcc-core-router::select()
      │
      ▼
RouteDecision.selected_target
      │
      ▼
compat/provider carrier handoff（下游只消费）
```

## 本批次明确不做
1. 不做 provider runtime registry 或 route-to-runtime 执行绑定。
2. 不做 tier failover / sticky / quota / cooldown。
3. 不做 compat/provider 内部的 target 重算。
4. 不做多进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase6_router_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase6_router_batch05.sh`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-compat -p rcc-core-provider -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router tests::runtime_router_selects_target_from_bootstrap_pools -- --exact`
