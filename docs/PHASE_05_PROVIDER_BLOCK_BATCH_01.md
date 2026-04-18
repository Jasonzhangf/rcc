# Phase 05 Provider Block Batch 01

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L28 `scope`：本批次要实现的最小闭环。
- L30-L63 `in-out`：输入输出契约。
- L65-L74 `boundaries`：明确不做的范围。
- L76-L83 `verification`：测试与验收方式。

## 目标与来源
本批次从旧仓 provider runtime 中先抽一条最薄、最稳定的 provider 主链：把 `endpoint/baseURL resolve + apikey/no-auth header build + target URL assemble` 收拢到 `rcc-core-provider`，形成一个不依赖真实 HTTP 的 canonical transport request plan。

旧仓主要来源：
1. `../routecodex/src/providers/core/runtime/runtime-endpoint-resolver.ts`
   - `resolveEffectiveBaseUrl`
   - `resolveEffectiveEndpoint`
2. `../routecodex/src/providers/auth/apikey-auth.ts`
   - `buildHeaders`
   - no-auth / authorization header 语义
3. `../routecodex/src/providers/core/runtime/provider-request-header-orchestrator.ts`
   - 最小 `Content-Type` + auth header build 主链（只收 apikey / no-auth）

Rust 目标文件：
- `rust/crates/rcc-core-provider/src/transport_request_plan.rs`
- `rust/crates/rcc-core-provider/src/auth_apikey.rs`
- `rust/crates/rcc-core-provider/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-provider` 提供最小 baseURL resolve API。
2. 在 `rcc-core-provider` 提供最小 endpoint resolve API。
3. 在 `rcc-core-provider` 提供最小 apikey/no-auth header build API。
4. 在 `rcc-core-provider` 提供最小 canonical transport request plan builder：
   - 输入 provider config + request body
   - 输出 canonical request plan
5. request plan 至少包含：
   - `method`
   - `target_url`
   - `headers`
   - `body`
   - `timeout_ms`
6. `Authorization` 头规则：
   - 默认 `Bearer <apiKey>`
   - 若显式 `header_name != Authorization`，则用自定义 header 写入原值
   - 空 key 允许返回 no-auth headers `{}`
7. `Content-Type: application/json` 由 provider transport plan 默认补齐。
8. `base_url + endpoint` 组装时统一去重多余 `/`，输出稳定 `target_url`。

## 输入输出契约
### 输入 payload
```json
{
  "provider": {
    "base_url": "https://api.example.com/v1",
    "endpoint": "/chat/completions",
    "timeout_ms": 60000,
    "auth": {
      "type": "apikey",
      "api_key": "sk-example",
      "header_name": "Authorization",
      "prefix": "Bearer"
    }
  },
  "request_body": {
    "model": "gpt-5",
    "messages": []
  }
}
```

### 输出 payload
```json
{
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
}
```

## 明确不做
1. 不做真实 HTTP 请求。
2. 不做 retry / backoff / error classify。
3. 不做 OAuth / device-flow / token refresh。
4. 不做 provider family profile / service profile 动态装载。
5. 不做 runtime metadata attach/read。
6. 不做 SSE / streaming transport。
7. 不做 protocol conversion、tool governance、servertool 业务解释。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
2. 实现阶段：进入 batch01 开发时再落盘对应验证脚本。
3. Rust 测试至少覆盖：
   - baseURL / endpoint 组装稳定
   - `Authorization` 默认 `Bearer` 头
   - 自定义 header 写入原值
   - 空 key 的 no-auth 头
   - canonical request plan 输出稳定
