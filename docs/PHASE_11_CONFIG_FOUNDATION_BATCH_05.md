# Phase 11 Config Foundation Batch 05

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 05 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L35 `flow`：typed provider runtime registry bootstrap 进入运行时主链的正确位置。
- L37-L44 `boundaries`：本批次明确不做的内容。
- L46-L52 `verification`：当前批次验证入口。

## 目标
把 config foundation 的第五刀固定为：**legacy inline provider + active routing targets 必须能投影为 typed provider runtime registry bootstrap，但 runtime 选择真源仍不在 config crate**。

1. `rcc-core-config` 继续只输出 typed bootstrap data；
2. active routing 中引用到的 target 能投影到 `EffectiveConfig.provider.runtime.registry`；
3. `rcc-core-orchestrator` / `rcc-core-provider` 只消费 typed bootstrap，不把 registry projection 回流 config 之外。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md`
   - `rust/crates/rcc-core-config/src/lib.rs`
   - `rust/crates/rcc-core-config/system.config.json`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `scripts/verify_phase11_config_foundation_batch05.sh`
2. 本批次只锁三段新语义：
   - legacy `virtualrouter.providers` + active routing target -> typed registry bootstrap
   - `EffectiveConfig.provider.runtime.registry.transports`
   - runtime 主链可消费 registry bootstrap，但 config 不执行 runtime select
   - registry bootstrap 可额外暴露最薄 target provider family hint，供 canonical outbound projection 消费
3. 允许的输出：
   - `ProviderRuntimeConfig.transport`
   - `ProviderRuntimeConfig.registry.transports`
4. 当前批次最小实现结果：
   - typed runtime registry config 结构
   - legacy active-target registry projection
   - from-config 主链可读 registry bootstrap
   - canonical 主线可从 registry bootstrap 读取 target provider family truth，而不是继续猜测

## 正确流水线位置
```text
old/new config
  -> rcc-core-config
    -> EffectiveConfig.provider.runtime.registry
      -> rcc-core-orchestrator (thin handoff only)
        -> rcc-core-provider runtime registry
```

## 本批次明确不做
1. 不做 config crate 内 runtime 选择。
2. 不做 provider dir loader。
3. 不做 health / failover / cooldown / quota registry 语义。
4. 不做 watcher、daemon、多进程。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase11_config_foundation.py`
- 当前实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch05.sh`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-provider -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config tests::load_config_projects_legacy_provider_targets_into_runtime_registry -- --exact`
