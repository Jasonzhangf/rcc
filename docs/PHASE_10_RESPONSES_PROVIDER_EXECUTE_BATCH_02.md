# Phase 10 Responses Provider Execute Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L20 `scope`：本批次允许进入实现的最小范围。
- L22-L31 `flow`：route handoff 进入 provider runtime 的正确位置。
- L33-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 01 真实 transport execute 主线的前提下，把 `router -> compat -> provider runtime` 的最小 route handoff 接到 provider 输入契约里，同时保持 **provider 仍只做 transport/auth/runtime**：

1. provider runtime 接收 `ProviderRequestCarrier.route`；
2. transport runtime 当前只接受 handoff，不据此改写真实 request payload；
3. orchestrator / testkit 有一条闭环验证，证明 handoff 已到 provider runtime。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md`
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-provider/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase10_responses_provider_execute_batch02.sh`
2. 本批次只锁三段新语义：
   - provider runtime contract 接受 route handoff sidecar
   - transport runtime 保持 payload 不改写
   - transport payload 保持不变
   - orchestrator/testkit 闭环验证 route handoff 已进入 provider runtime
3. 允许的输入：
   - compat 产出的 `ProviderRequestCarrier.route`
   - Batch 01 已存在的静态 provider runtime config
4. 允许的输出：
   - provider runtime 可读到的 route handoff
   - 不含 route sidecar 污染的 transport request body
5. 当前批次最小实现结果：
   - provider route-aware carrier contract
   - route handoff integration smoke
   - payload invariance 回归

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat(route handoff sidecar)
  -> provider(runtime contract accepts handoff, transport payload unchanged)
```

## 本批次明确不做
1. 不做 route-to-runtime registry 执行绑定。
2. 不做 request body model 重写。
3. 不做 provider failover / cooldown / quota。
4. 不做 SSE / streaming mainline 扩张。
5. 不做额外 daemon、sidecar、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 当前实现阶段入口：`bash scripts/verify_phase10_responses_provider_execute_batch02.sh`
- 当前缺口盘点真源：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-compat -p rcc-core-domain -p rcc-core-testkit -p rcc-core-host`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::handle_hands_route_handoff_to_provider_runtime -- --exact`
