# Phase 08 Compat Block Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L32 `flow`：compat 在 responses 主线中的正确位置。
- L34-L41 `boundaries`：本批次明确不做的内容。
- L43-L48 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 01 docs 锁边界的前提下，把 `rcc-core-compat` 的第一批最小实现真正落地：

1. 新增独立 `rcc-core-compat` crate；
2. 通过共享纯函数把 canonical request/response 与 provider-facing carrier 的最小 shape mapping 固定下来；
3. 把当前主线接成：`responses ingress server -> virtual router -> hub pipeline -> compat -> provider`；
4. 不把 compat 真源塞回 host/router/pipeline/provider。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-domain/src/compat_mapping.rs`
   - `rust/crates/rcc-core-compat/src/lib.rs`
   - `rust/crates/rcc-core-provider/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase8_compat_block_batch02.sh`
2. 本批次只锁三段新语义：
   - canonical request -> provider request carrier
   - provider response carrier -> canonical response
   - orchestrator 内 `pipeline -> compat -> provider` 的最小接线
3. 允许的输入：
   - hub pipeline outbound 后的 canonical request
   - provider noop runtime 返回的最小 provider response carrier
4. 允许的输出：
   - provider request carrier
   - canonical response（最小 `status / output / required_action / raw carrier`）
5. 当前批次最小实现结果：
   - `CompatBlock::map_request`
   - `CompatBlock::map_response`
   - `ProviderRuntime::execute` 改为只接 provider carrier
   - `SkeletonApplication::handle` 接通 compat 与 provider

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat
  -> provider
```

## 本批次明确不做
1. 不做 SSE event rebuild。
2. 不做多 provider 协议族矩阵。
3. 不做 full responses item schema。
4. 不做 transport/auth/runtime 之外的 provider 语义扩张。
5. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase8_compat_block_batch02.sh`
- 当前缺口盘点真源：`docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-host -p rcc-core-testkit`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- smoke`
