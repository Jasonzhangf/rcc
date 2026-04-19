# Phase 11 Config Foundation Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L35 `flow`：legacy routing bootstrap 在主链中的正确位置。
- L37-L45 `boundaries`：本批次明确不做的内容。
- L47-L53 `verification`：当前批次验证入口。

## 目标
把 config system 的第三刀固定为：**旧 routing config 只作为输入边界，投影为新 Rust router 的 bootstrap data**。当前批次只做最小、可测、可复用的 projection：

1. 保留旧 `.rcc/config.json` 的 `virtualrouter.routing` 形状；
2. 最小支持 `virtualrouter.routingPolicyGroups + activeRoutingPolicyGroup`；
3. 只在 `rcc-core-config` 内做 typed router bootstrap view；
4. `rcc-core-router` 继续是 route selection 的唯一真源。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md`
   - `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-config/src/lib.rs`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `scripts/verify_phase11_config_foundation_batch03.sh`
2. 本批次只锁三段新语义：
   - legacy `virtualrouter.routing` -> typed router bootstrap view
   - active `routingPolicyGroups + activeRoutingPolicyGroup` -> 同一 bootstrap view
   - projected bootstrap 可被新 Rust router helper 消费
3. 允许的输入：
   - `virtualrouter.routing`
   - `virtualrouter.routingPolicyGroups`
   - `virtualrouter.activeRoutingPolicyGroup`
   - 可选 route tier 字段：`id` / `targets` / `priority`
4. 允许的输出：
   - `EffectiveConfig.router.bootstrap.routes`
   - route key -> tier list 的 typed bootstrap
5. 当前批次最小实现结果：
   - `normalize_legacy_virtualrouter_router_bootstrap`
   - active routing policy group select
   - route tier 顺序保真与 typed projection

## 正确流水线位置
```text
old .rcc/config.json
  -> rcc-core-config (thin routing projection only)
    -> EffectiveConfig.router.bootstrap
      -> rcc-core-router (唯一 route selection 真源)
```

## 本批次明确不做
1. 不做完整 virtual router policy materialize。
2. 不做 load-balancing weights / sticky / failover / quota / cooldown。
3. 不做 config crate 直接调用 `router.select()`。
4. 不做 provider registry / runtime registry 的完整 bootstrap。
5. 不做 TS routing runtime 复用或双真源并存。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase11_config_foundation.py`
- 当前实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch03.sh`
- 当前缺口盘点真源：`docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::batch03_config_router_bootstrap_feeds_router_candidates -- --exact`
