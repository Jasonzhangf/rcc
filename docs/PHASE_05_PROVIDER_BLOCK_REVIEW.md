# Phase 05 Provider Block Review

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 05A 的收口 review 真源。
- L10-L21 `architecture`：本阶段落地后的 provider 架构结论。
- L23-L38 `delivered`：已完成的 4 个 batch 与对应真源。
- L40-L53 `boundaries`：本阶段明确不做、且继续锁死的边界。
- L55-L67 `evidence`：当前阶段验证与 CI 证据。
- L69-L77 `next`：建议的下一阶段入口。

## 目标
把 Phase 05A provider block 的已完成范围、模块边界、验证证据和下一步入口收口成单一 review 文档，避免后续阶段再次回头重新判定“provider 到底已经收了什么、还没收什么”。

## 架构结论
1. `rcc-core-provider` 已从 skeleton `NoopProviderRuntime` 升级为真正的 provider adapter 真源。
2. Phase 05A 继续严格遵守三层结构：
   - 编排层
   - block 真源层
   - 纯函数层
3. 在这三层中，provider 只占 **block 真源层**，且边界继续锁死为：
   - `transport`
   - `auth`
   - `runtime`
   - 也就是唯一允许的 provider 真源范围：`transport / auth / runtime`
4. `host` / `orchestrator` 仍保持极薄，只做聚合与调用，不复制 provider 语义。
5. 本阶段实现继续遵守“包装尽量薄、模块单一职责、资源受控”：
   - 没有额外 daemon / sidecar / 常驻 worker
   - 没有把 route/tool/protocol 业务语义带入 provider
   - 没有为了 streaming / retry / runtime metadata 引入第二套 runtime 壳层

## 已完成范围
### Batch 01：canonical transport request plan
- 真源：
  - `docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md`
  - `rust/crates/rcc-core-provider/src/transport_request_plan.rs`
  - `rust/crates/rcc-core-provider/src/auth_apikey.rs`
- 收口能力：
  - baseURL / endpoint resolve
  - apikey / no-auth headers
  - canonical transport request plan

### Batch 02：HTTP execute + retry skeleton
- 真源：
  - `docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md`
  - `rust/crates/rcc-core-provider/src/http_execute.rs`
  - `rust/crates/rcc-core-provider/src/http_retry.rs`
- 收口能力：
  - minimal HTTP execute
  - minimal retry helper
  - normalized transport / timeout / http_status error

### Batch 03：runtime metadata attach-read
- 真源：
  - `docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md`
  - `rust/crates/rcc-core-provider/src/runtime_metadata.rs`
  - `rust/crates/rcc-core-provider/src/request_preprocessor.rs`
- 收口能力：
  - runtime metadata attach / extract
  - request preprocess
  - `entryEndpoint` / `stream` / `clientHeaders` / `__origModel` 最小 metadata 投影

### Batch 04：streaming / SSE transport boundary
- 真源：
  - `docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md`
  - `rust/crates/rcc-core-provider/src/sse_transport.rs`
- 收口能力：
  - wants upstream SSE 判定
  - SSE request body `stream=true` 归一
  - raw `__sse_responses` carrier wrap
  - minimal upstream SSE execute

## 继续锁死的边界
1. provider 仍然 **不解释**：
   - followup
   - stop gateway
   - reasoning.stop
   - tool governance
   - route / pipeline / protocol 主语义
2. provider 仍然 **不承接**：
   - host -> client SSE bridge
   - snapshot attach / telemetry bundle
   - Gemini / Qwen / Responses 专用 streaming normalizer
   - router failover / provider health / cooldown
   - session / tmux / conversation scope 业务解释
3. 若后续逻辑被证明是纯函数，应继续回到 `rcc-core-domain`，不留在 provider。
4. 若后续需求开始解释业务级流式语义、router 语义、protocol conversion，则必须新开阶段，不可继续挤在 Phase 05A 内。

## 当前证据
### 文档/技能 gate
- `python3 scripts/verify_phase5_provider_block.py`

### 当前最强实现回归
- `bash scripts/verify_phase5_provider_sse_transport.sh`

### 当前结果
- `PHASE5_PROVIDER_BLOCK_VERIFY: PASS`
- `rcc-core-provider`: 30 tests passed
- `rcc-core-testkit`: 17 tests passed
- `rcc-core-host` smoke: passed
- phase5 CI 入口：
  - `.github/workflows/phase5-provider-block.yml`

## 下一步建议
1. 若继续扩 provider：
   - 必须新开 Phase 05B 或新的 provider epic
   - 先重新定义 docs / skills / test gate
2. 若转入其它 block：
   - 以本文件作为“provider 已完成边界”真源，不再回头重复判定
3. 若后续做架构 review：
   - 本文件优先回答“Phase 05A 已经完成什么”
   - batch 文档再回答“每一批具体怎么做的”
