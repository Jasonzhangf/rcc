# Phase 05 Provider Block Batch 04

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L31 `scope`：本批次要实现的最小闭环。
- L33-L67 `in-out`：输入输出契约。
- L69-L80 `boundaries`：明确不做的范围。
- L82-L90 `verification`：测试与验收方式。

## 目标与来源
本批次继续沿着 provider transport 主链前进，但仍保持极薄：把 **streaming / SSE transport boundary** 收拢到 `rcc-core-provider`，只解决 provider 内部对 upstream SSE 的最小判定、request body 标记与 raw SSE carrier 包装，不提前进入 snapshot、normalizer、Host->Client bridge 或协议级 event 解释。

旧仓主要来源：
1. `../routecodex/src/providers/core/runtime/http-transport-provider.ts`
   - `wantsUpstreamSse`
   - `prepareSseRequestBody`
   - `wrapUpstreamSseResponse`
2. `../routecodex/src/providers/core/runtime/http-request-executor.ts`
   - `executeHttpRequestOnce` 中的 upstream SSE transport 分支
3. `../routecodex/src/providers/core/runtime/provider-response-postprocessor.ts`
   - `__sse_responses` carrier 保持语义
4. `../routecodex/src/providers/core/utils/http-client.ts`
   - `postStream` 的最小 transport boundary（只参考 SSE HTTP transport 行为，不搬完整 timeout 体系）

Rust 目标文件：
- `rust/crates/rcc-core-provider/src/sse_transport.rs`
- `rust/crates/rcc-core-provider/src/lib.rs`
- `rust/crates/rcc-core-testkit/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-provider` 提供最小 SSE 判定 API：
   - `resolve_wants_upstream_sse`
   - 只消费显式 `request.stream` / `request.metadata.stream` / `wants_sse`
2. 在 `rcc-core-provider` 提供最小 SSE request body prepare API：
   - `prepare_sse_request_body`
   - 当 wants_sse=true 时，把 request body 归一为 `stream=true`
3. 在 `rcc-core-provider` 提供最小 SSE response wrap API：
   - `wrap_upstream_sse_response`
   - 输出 canonical `__sse_responses` carrier
4. 在 `rcc-core-provider` 提供最小 SSE execute API：
   - `execute_sse_transport_request`
   - 以 Batch01 canonical request plan 为输入
   - 使用 raw HTTP transport 读取 `text/event-stream`
   - 返回 raw SSE carrier，不做 event 级解释
5. carrier 边界固定为：
   - `status`
   - `headers`
   - `body`
   - `content_type`
6. 资源约束：
   - 不引入独立进程、daemon、后台 worker、额外 async runtime
   - 不额外复制 HTTP execute/retry 业务壳

## 输入输出契约
### 输入 payload
```json
{
  "request": {
    "stream": true
  },
  "request_plan": {
    "method": "POST",
    "target_url": "https://api.example.com/v1/responses",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-example"
    },
    "body": {
      "model": "gpt-5",
      "input": "hello"
    },
    "timeout_ms": 60000
  }
}
```

### SSE 成功输出 payload
```json
{
  "ok": true,
  "__sse_responses": {
    "status": 200,
    "content_type": "text/event-stream",
    "headers": {
      "content-type": "text/event-stream"
    },
    "body": "event: message\ndata: {\"ok\":true}\n\n"
  },
  "attempts": 1
}
```

### 普通 helper 输出要求
```json
{
  "wants_sse": true,
  "body": {
    "model": "gpt-5",
    "input": "hello",
    "stream": true
  }
}
```

## 明确不做
1. 不做 SSE event parser / JSON delta normalize。
2. 不做 snapshot stream attach、telemetry、debug bundle。
3. 不做 Host -> Client SSE bridge。
4. 不做 Gemini/Qwen/Responses 专用 normalizer。
5. 不做 OAuth recovery、provider health、router failover。
6. 不做协议层 responses rebuild 或业务级流式语义解释。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
2. 实现阶段：`bash scripts/verify_phase5_provider_sse_transport.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - upstream SSE 判定主路径
   - SSE request body `stream=true` 归一
   - raw SSE response wrap 主路径
   - SSE execute 读取 `text/event-stream` 并返回 canonical `__sse_responses`
   - host smoke 仍保持可运行，且 host 不复制 SSE transport 语义
