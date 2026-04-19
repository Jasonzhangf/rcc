# Phase 11 Config Foundation Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L33 `flow`：两文件 config 在主链中的正确位置。
- L35-L42 `boundaries`：本批次明确不做的内容。
- L44-L49 `verification`：当前批次验证入口。

## 目标
把 config system 的第一刀固定为：**最小两文件加载 + host/orchestrator 接线**。当前批次只做最小、可测、可复用的 foundation：

1. 新增 `rcc-core-config` crate；
2. 复用旧仓的路径解析思想：显式路径优先，其次环境变量，再次默认 `~/.rcc/config.json`；
3. system config 承载语义默认值，user `config.json` 只承载最小 override；
4. host 默认 smoke / serve / chat 相关默认值改为 config 驱动，并兼容旧 `httpserver.host/port -> host.server.addr` 的最小归一；
5. orchestrator 允许按 config 选择最小 provider runtime（noop / transport）。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md`
   - `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-config/Cargo.toml`
   - `rust/crates/rcc-core-config/config.json`
   - `rust/crates/rcc-core-config/system.config.json`
   - `rust/crates/rcc-core-config/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `scripts/verify_phase11_config_foundation_batch01.sh`
2. 本批次只锁四段新语义：
   - user config path resolve
   - system default + user override merge
   - host default runtime/addr/request defaults config 化
   - orchestrator bootstrap runtime selection
3. 允许的输入：
   - 缺省无用户配置文件
   - 显式 `--config <path>`
   - 环境变量 `RCC_HOME` / `ROUTECODEX_USER_DIR` / `ROUTECODEX_HOME` / `RCC4_CONFIG_PATH` / `ROUTECODEX_CONFIG` / `ROUTECODEX_CONFIG_PATH`
4. 允许的输出：
   - typed effective config
   - config 驱动的 host smoke / serve 行为
   - config 驱动的 minimal provider runtime bootstrap
5. 当前批次最小实现结果：
   - `rcc-core-config`
   - `SkeletonApplication::from_config`
   - host 不再使用 `DEFAULT_ADDR` / `DEFAULT_OPERATION` / `DEFAULT_PAYLOAD` / `DEFAULT_CHAT_OPERATION` 这组硬编码常量

## 正确流水线位置
```text
CLI / HTTP
  -> host(thin shell)
    -> config bootstrap
      -> orchestrator bootstrap
        -> virtual router
        -> hub pipeline
        -> compat
        -> provider
```

## 本批次明确不做
1. 不做 config admin endpoint。
2. 不做 config 热重载、watcher、后台同步线程。
3. 不做 virtual router routingPolicyGroups materialize。
4. 不做 provider family profile loader。
5. 不做额外 daemon、sidecar、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase11_config_foundation.py`
- 当前实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch01.sh`
- 当前缺口盘点真源：`docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-host`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- smoke`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config <temp-config> smoke`
