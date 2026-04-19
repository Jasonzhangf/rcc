# Phase 10 Responses Provider Execute Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L32 `flow`：selected_target 进入 provider runtime registry 的正确位置。
- L34-L41 `boundaries`：本批次明确不做的内容。
- L43-L48 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 02 route handoff sidecar 的前提下，把 `selected_target -> provider runtime registry` 的最小绑定真正落地：

1. provider runtime registry 接收 `ProviderRequestCarrier.route.selected_target`；
2. 命中 target 时执行对应 transport runtime；
3. target 缺失时显式失败，不做静默 fallback。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md`
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-provider/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase10_responses_provider_execute_batch03.sh`
2. 本批次只锁三段新语义：
   - selected_target -> runtime registry lookup
   - lookup hit -> concrete transport runtime execute
   - lookup miss -> explicit provider failure
3. 允许的输入：
   - `ProviderRequestCarrier.route.selected_target`
   - config/bootstrap 或显式注入得到的 runtime registry
4. 允许的输出：
   - 命中的 transport runtime 响应
   - target 缺失时的显式失败响应
5. 当前批次最小实现结果：
   - provider runtime registry
   - from-config selected_target bind
   - missing target explicit failure smoke

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat(route handoff sidecar)
  -> provider(runtime registry bind by selected_target)
```

## 本批次明确不做
1. 不做 health / failover / cooldown / quota bind。
2. 不做 request payload 语义改写。
3. 不做多协议族矩阵。
4. 不做 daemon、sidecar、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 当前实现阶段入口：`bash scripts/verify_phase10_responses_provider_execute_batch03.sh`
- 当前缺口盘点真源：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-config -p rcc-core-compat -p rcc-core-domain -p rcc-core-testkit -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::from_config_binds_selected_target_to_runtime_registry -- --exact`
