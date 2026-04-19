# Phase 10 Responses Provider Execute Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L20 `scope`：本批次允许进入实现的最小范围。
- L22-L31 `flow`：真实 provider execute 在 responses 主线中的正确位置。
- L33-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
把 responses 主线最后一段从“compat -> noop provider”推进到“compat -> real transport execute provider”。当前批次只做最小、可测、可复用的主线 integration：

1. 新增一个可注入的 transport provider runtime；
2. 复用现有 `rcc-core-provider` 的 `build_transport_request_plan` + `execute_transport_request`；
3. 用 testkit 本地 HTTP server 打通一条真实 responses 主线路径；
4. 保持 host 默认路径与现有 smoke 不破坏。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md`
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-provider/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase10_responses_provider_execute_batch01.sh`
2. 本批次只锁三段新语义：
   - `ProviderRequestCarrier -> transport request plan`
   - `transport request plan -> real HTTP execute`
   - `provider execute result -> ProviderResponseCarrier -> compat canonical response`
3. 允许的输入：
   - responses canonical request
   - 静态 provider runtime config
   - 本地 HTTP upstream fixture
4. 允许的输出：
   - provider runtime 真实返回的 `ProviderResponseCarrier`
   - responses 主线最终 canonical output text
5. 当前批次最小实现结果：
   - `TransportProviderRuntime`
   - `SkeletonApplication::with_provider_runtime`
   - responses mainline real execute smoke

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat
  -> provider(real execute)
```

## 本批次明确不做
1. 不做 host 级运行时配置系统。
2. 不做 streaming / SSE mainline execute。
3. 不做多 provider runtime registry。
4. 不做 router -> provider runtime 动态绑定。
5. 不做额外 daemon、sidecar、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 当前实现阶段入口：`bash scripts/verify_phase10_responses_provider_execute_batch01.sh`
- 当前缺口盘点真源：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-testkit -p rcc-core-host`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- smoke`
