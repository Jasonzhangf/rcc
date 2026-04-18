# Phase 05 Provider Block Batch 03

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L33 `scope`：本批次要实现的最小闭环。
- L35-L69 `in-out`：输入输出契约。
- L71-L82 `boundaries`：明确不做的范围。
- L84-L92 `verification`：测试与验收方式。

## 目标与来源
本批次继续沿着 provider runtime 主链前进，但仍保持极薄：把 **runtime metadata attach-read + request preprocess 的最小 transport/runtime 语义** 收拢到 `rcc-core-provider`，只解决 provider 内部如何附着、读取和最小投影 runtime metadata，不提前进入 servertool / router / session-state 业务解释。

旧仓主要来源：
1. `../routecodex/src/providers/core/runtime/provider-runtime-metadata.ts`
   - `attachProviderRuntimeMetadata`
   - `extractProviderRuntimeMetadata`
2. `../routecodex/src/providers/core/runtime/provider-request-preprocessor.ts`
   - `ProviderRequestPreprocessor.preprocess`
3. `../routecodex/src/providers/core/runtime/transport/provider-payload-utils.ts`
   - `extractEntryEndpointFromPayload`
   - `extractEntryEndpointFromRuntime`
   - `normalizeClientHeaders`
   - `getClientRequestIdFromContext`
4. `../routecodex/src/providers/core/runtime/base-provider-runtime-helpers.ts`
   - `createProviderContext`
   - `reattachRuntimeMetadata`

Rust 目标文件：
- `rust/crates/rcc-core-provider/src/runtime_metadata.rs`
- `rust/crates/rcc-core-provider/src/request_preprocessor.rs`
- `rust/crates/rcc-core-provider/src/lib.rs`
- `rust/crates/rcc-core-testkit/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-provider` 提供最小 runtime metadata attach API：
   - 输入：显式 request payload + runtime metadata object
   - 语义：provider-private metadata carrier attach / merge
2. 在 `rcc-core-provider` 提供最小 runtime metadata read API：
   - 从 provider-private carrier 中读回 runtime metadata
   - 对 attach 前已存在 carrier 保持 merge 语义
3. 在 `rcc-core-provider` 提供最小 request preprocess API：
   - attach runtime metadata
   - normalize inbound `clientHeaders`
   - 把最小 transport 需要的 metadata 投影到 request `metadata`
4. 本批次允许投影到 request `metadata` 的字段仅限：
   - `entryEndpoint`
   - `stream`
   - `clientHeaders`
   - `__origModel`
5. 在 `rcc-core-provider` 提供最小 read helper：
   - `extract_entry_endpoint`
   - `extract_client_request_id`
   - `normalize_client_headers`
6. 归属边界：
   - provider 只 attach/read 这些 runtime metadata
   - 不解释 tmux/session/conversation/followup/stopless 等业务语义
   - 不把 runtime metadata bridge 回流 host/orchestrator/servertool

## 输入输出契约
### 输入 payload
```json
{
  "request": {
    "model": "gpt-5",
    "stream": true,
    "metadata": {
      "entryEndpoint": "/v1/responses",
      "clientHeaders": {
        "x-trace-id": "trace-1"
      }
    }
  },
  "runtime_metadata": {
    "requestId": "req-1",
    "providerKey": "openai",
    "providerType": "openai",
    "metadata": {
      "clientRequestId": "client-1",
      "clientHeaders": {
        "x-trace-id": "trace-2",
        "x-client": "codex"
      }
    }
  }
}
```

### 处理后 request 语义
```json
{
  "model": "gpt-5",
  "stream": true,
  "metadata": {
    "entryEndpoint": "/v1/responses",
    "stream": true,
    "clientHeaders": {
      "x-trace-id": "trace-1",
      "x-client": "codex"
    },
    "__origModel": "gpt-5"
  }
}
```

### 读取输出要求
```json
{
  "runtime_metadata": {
    "requestId": "req-1",
    "providerKey": "openai",
    "providerType": "openai",
    "metadata": {
      "clientRequestId": "client-1",
      "clientHeaders": {
        "x-trace-id": "trace-1",
        "x-client": "codex"
      }
    }
  },
  "entry_endpoint": "/v1/responses",
  "client_request_id": "client-1"
}
```

## 明确不做
1. 不做 servertool / clock / followup / stop-message 业务字段解释。
2. 不做 sticky session / conversation scope / tmux session key 解析。
3. 不做 provider family profile、runtime detector、protocol conversion。
4. 不做 response metadata enrich、usage aggregation、snapshot telemetry 体系迁移。
5. 不做 OAuth recovery、provider health、router failover。
6. 不因 runtime metadata attach-read 引入新进程、daemon、后台 worker 或额外常驻 runtime。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
2. 实现阶段：`bash scripts/verify_phase5_provider_runtime_metadata.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - runtime metadata attach + extract 主路径
   - attach 时已有 metadata carrier 的 merge 语义
   - request `metadata.clientHeaders` 优先于 runtime metadata 的同名 headers
   - preprocess 只投影允许的最小字段，不扩业务语义
   - host smoke 仍保持可运行，且 host 不复制 runtime metadata attach-read 语义
