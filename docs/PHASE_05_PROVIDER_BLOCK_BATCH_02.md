# Phase 05 Provider Block Batch 02

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L33 `scope`：本批次要实现的最小闭环。
- L35-L68 `in-out`：输入输出契约。
- L70-L80 `boundaries`：明确不做的范围。
- L82-L90 `verification`：测试与验收方式。

## 目标与来源
本批次继续沿着 provider transport 主链前进，但仍保持极薄：把 **canonical transport request plan -> 最小 HTTP execute + retry skeleton + normalized transport error** 收拢到 `rcc-core-provider`，先打通单一同步主链，不提前扩 runtime metadata、OAuth recovery、SSE 或 provider health。

旧仓主要来源：
1. `../routecodex/src/providers/core/runtime/http-request-executor.ts`
   - `execute`
   - `prepareHttpRequest`
   - `executeHttpRequestWithRetries`
2. `../routecodex/src/providers/core/runtime/provider-http-executor-utils.ts`
   - `getProviderHttpRetryLimit`
   - `shouldRetryProviderHttpError`
   - `delayBeforeProviderHttpRetry`
   - `normalizeProviderHttpError`
3. `../routecodex/src/providers/core/runtime/http-transport-provider.ts`
   - `createRequestExecutorDeps`
   - provider transport execute 装配边界

Rust 目标文件：
- `rust/crates/rcc-core-provider/src/http_execute.rs`
- `rust/crates/rcc-core-provider/src/http_retry.rs`
- `rust/crates/rcc-core-provider/src/lib.rs`
- `rust/crates/rcc-core-testkit/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-provider` 提供最小 HTTP execute API：
   - 输入 canonical transport request plan
   - 执行单次 HTTP 请求
   - 输出 canonical transport execute result
2. 在 `rcc-core-provider` 提供最小 retry policy helper：
   - `max_attempts`
   - `should_retry`
   - `delay_ms`
3. retry 默认保持旧仓 provider 边界：
   - 默认 `max_attempts = 1`
   - 只有显式提高上限时，才允许对 `5xx` 做 retry 判定
   - 不把 router failover / cooldown / provider health 混入 provider execute
4. 在 `rcc-core-provider` 提供最小 error normalize：
   - transport / timeout / http status 失败都统一输出 canonical error shape
   - 若存在 HTTP 状态码，需稳定生成 `HTTP_<status>` code
5. response 主链先只收：
   - `status`
   - `headers`
   - `body`
   - `attempts`
6. 资源约束：
   - 默认单进程、单 runtime 内收敛
   - 不因本批次单独引入 daemon、sidecar、后台 worker
   - 若需要 HTTP client，优先复用单一轻量 client，不做多余包装层

## 输入输出契约
### 输入 payload
```json
{
  "request_plan": {
    "method": "POST",
    "target_url": "https://api.example.com/v1/chat/completions",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-example"
    },
    "body": {
      "model": "gpt-5",
      "messages": []
    },
    "timeout_ms": 60000
  },
  "retry": {
    "max_attempts": 1
  }
}
```

### 成功输出 payload
```json
{
  "ok": true,
  "status": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "id": "resp_123",
    "choices": []
  },
  "attempts": 1
}
```

### 失败输出 payload
```json
{
  "ok": false,
  "error": {
    "kind": "http_status",
    "status": 502,
    "code": "HTTP_502",
    "message": "bad gateway",
    "retryable": false
  },
  "attempts": 1
}
```

## 明确不做
1. 不做 OAuth recovery / token refresh / device-flow。
2. 不做 runtime metadata attach/read。
3. 不做 SSE / streaming response wrap。
4. 不做 provider health manager / cooldown / virtual router failover。
5. 不做 snapshot telemetry / debug bundle 体系迁移。
6. 不做 protocol conversion、tool governance、servertool 业务解释。
7. 不因 HTTP execute 提前引入额外 async daemon、后台常驻服务或多余 runtime 进程。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
2. 实现阶段：`bash scripts/verify_phase5_provider_http_execute.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - 单次 request plan 执行成功
   - `max_attempts=1` 时不重试
   - `5xx + max_attempts>1` 时 retry 判定成立
   - timeout / transport / http status 错误都能稳定 normalize
   - host smoke 仍保持可运行，且 host 不复制 provider execute/retry 语义
