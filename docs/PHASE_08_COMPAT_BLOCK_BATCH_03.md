# Phase 08 Compat Block Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L32 `flow`：route handoff 在 compat 中的正确位置。
- L34-L41 `boundaries`：本批次明确不做的内容。
- L43-L48 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 02 最小 compat 映射的前提下，把 `router -> compat -> provider carrier` 的最小 route handoff 真正落地：

1. compat 接收 router 已经决出的 route result；
2. compat 只把最小 handoff 投影到 provider carrier sidecar；
3. 真实 request body 不因 handoff 被改写，保持 payload 语义不变。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-domain/src/compat_mapping.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `rust/crates/rcc-core-compat/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `scripts/verify_phase8_compat_block_batch03.sh`
2. 本批次只锁三段新语义：
   - `RouteDecision -> provider route handoff`
   - provider carrier sidecar 承载 handoff
   - orchestrator 内 `router -> pipeline -> compat -> provider` 主链继续保持薄装配
3. 允许的输入：
   - router 已决出的 `RouteDecision`
   - hub pipeline outbound 后的 canonical request
4. 允许的输出：
   - `ProviderRequestCarrier.route`
   - 未被 route handoff 改写的 `ProviderRequestCarrier.body`
5. 当前批次最小实现结果：
   - compat route-aware request mapper
   - provider carrier 最小 route sidecar DTO
   - orchestrator handoff 接线

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat(route handoff sidecar)
  -> provider
```

## 本批次明确不做
1. 不做 route-to-runtime registry 绑定。
2. 不做 request body metadata 注入式 payload 改写。
3. 不做 provider 内重算 route/target。
4. 不做 streaming 事件级别投影。
5. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase8_compat_block_batch03.sh`
- 当前缺口盘点真源：`docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-orchestrator -p rcc-core-provider -p rcc-core-host -p rcc-core-testkit`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::handle_hands_route_handoff_to_provider_runtime -- --exact`
