# Phase 06 Router Block Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L19 `scope`：本批次允许进入实现的最小范围。
- L21-L31 `flow`：runtime bootstrap route pools 进入 virtual router 的正确位置。
- L33-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-router` 的第四刀固定为：**runtime router 真实消费 bootstrap route pools，并返回最小 route result**。

1. `RouterBlock` 拥有最小 runtime routing pools；
2. `select()` 除 `target_block` 外，返回最小 route result；
3. route result 可以被 orchestrator/host 透传，但 route 真源仍只在 router block。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_06_ROUTER_BLOCK_BATCH_04.md`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `scripts/verify_phase6_router_batch04.sh`
2. 本批次只锁三段新语义：
   - runtime route pool consumption
   - minimal route result (`selected_route` / `candidate_routes`)
   - route result 主链透传
3. 允许的输出：
   - `RouteDecision.target_block`
   - `RouteDecision.selected_route`
   - `RouteDecision.candidate_routes`
4. 当前批次关键边界：
   - router 继续只做 route truth
   - orchestrator 只装配 router，不复制 selection
   - host 只透传 route result

## 正确流水线位置
```text
config/bootstrap routes
      │
      ▼
rcc-core-orchestrator
      │
      ▼
rcc-core-router::select()
      │
      ▼
RouteDecision
      │
      ▼
host / responses shell
```

## 本批次明确不做
1. 不做 provider failover / sticky / quota / cooldown。
2. 不做 provider registry-aware runtime route picking。
3. 不做 hub/provider 业务真源回流到 router 之外。
4. 不做多进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase6_router_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase6_router_batch04.sh`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router runtime_router_selects_route_from_bootstrap_pools -- --exact`
