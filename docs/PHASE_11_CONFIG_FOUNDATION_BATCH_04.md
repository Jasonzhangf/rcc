# Phase 11 Config Foundation Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L34 `flow`：typed router bootstrap 进入运行时主链的正确位置。
- L36-L43 `boundaries`：本批次明确不做的内容。
- L45-L51 `verification`：当前批次验证入口。

## 目标
把 config foundation 的第四刀固定为：**typed router bootstrap 必须进入真实运行时主链，但 route selection 真源仍留在 `rcc-core-router`**。

1. `rcc-core-config` 继续只输出 `EffectiveConfig.router.bootstrap.routes`；
2. `rcc-core-orchestrator` 只做薄装配，把 bootstrap 交给 `RouterBlock`；
3. `rcc-core-router` 在 `select()` 中真实消费 bootstrap routes；
4. route 结果要在运行时响应里可见。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `rust/crates/rcc-core-domain/src/responses_ingress.rs`
   - `scripts/verify_phase11_config_foundation_batch04.sh`
2. 本批次只锁三段新语义：
   - config bootstrap -> runtime router handoff
   - `RouterBlock::select()` 返回最小 route selection 结果
   - host/responses shell 对 route result 的最小透出
3. 允许的输出：
   - `RouteDecision.target_block`
   - `RouteDecision.selected_route`
   - `RouteDecision.candidate_routes`
4. 当前批次最小实现结果：
   - `SkeletonApplication::from_config()` 装配 runtime router
   - config bootstrap 驱动真实请求的 route candidate / selected route
   - host `/requests` `/chat` `/v1/responses` 可返回 route result

## 正确流水线位置
```text
old/new config
  -> rcc-core-config
    -> EffectiveConfig.router.bootstrap
      -> rcc-core-orchestrator (thin handoff only)
        -> rcc-core-router::select()
          -> RouteDecision
```

## 本批次明确不做
1. 不做 sticky / failover / health / quota / cooldown。
2. 不做 provider registry runtime 注入。
3. 不做 config crate 反向依赖 router。
4. 不做多进程、watcher、daemon。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase11_config_foundation.py`
- 当前实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch04.sh`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::from_config_exposes_runtime_router_selection -- --exact`
