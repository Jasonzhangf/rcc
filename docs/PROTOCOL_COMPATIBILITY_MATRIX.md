# Protocol Compatibility Matrix（Rust 主线真源版）

## 索引概要
- L1-L8 `purpose`：定义当前 Rust 主线的协议兼容矩阵与验收口径。
- L10-L18 `legend`：兼容等级定义。
- L20-L28 `ssot`：当前矩阵对应的 Rust 真源。
- L30-L48 `responses-outbound`：Responses 到其他协议的请求侧兼容结论。
- L50-L63 `continuation`：continuation sticky scope 口径。
- L65-L72 `response-path`：provider response -> canonical / client protocol 当前结论。
- L74-L80 `non-goals`：当前明确不承诺的内容。

## 目标
把 `../routecodex/docs/protocol-compatibility-matrix.md` 中与当前 Rust 主线已经落地的部分，收成新仓文档真源。

本文件只覆盖**当前已经实现并有 Rust 回归证据**的范围。

## 兼容等级定义
- `full`
  - 当前 Rust 主线可稳定映射，且语义不需要通过 audit 标为 lossy/dropped/unsupported。
- `lossy`
  - 能映射，但目标协议缺少完全等价表达；必须记入 protocol mapping audit。
- `dropped`
  - 主线能识别，但目标协议没有承载位；必须显式记入 audit。
- `unsupported`
  - 当前主线明确不支持该语义；不得伪装成 preserved。
- `internal-only`
  - 当前仅作为 provider/internal protocol 使用，不对外承诺完整 public client surface。

## 当前矩阵对应的 Rust 真源
1. audit bucket 真源：
   - `rcc-core-domain::build_responses_cross_protocol_audit`
2. continuation sticky scope 真源：
   - `rcc-core-domain::resolve_continuation_sticky_key`
3. compat outbound request shape 真源：
   - `rcc-core-domain::build_provider_request_carrier_from_canonical_outbound`
4. mainline regression 收口：
   - `rcc-core-testkit::run_phase12_batch01_regression_smoke`

## Responses -> 其他协议（请求侧）

| 字段/能力 | -> Anthropic | -> Gemini | 说明 |
|---|---|---|---|
| input/messages | `full` | `full` | 已有最小 request shape 回归 |
| system / developer instruction | `full` | `full` | Anthropic messages / Gemini systemInstruction 已有主线 |
| tools schema | `full` | `full` | tools 最小 schema 已有回归 |
| tool_choice | `preserved/full` | `preserved/full` | 通过 carrier metadata / audit sidecar 保持主线语义 |
| parallel_tool_calls | `dropped` | `dropped` | 目标协议无完全等价表达 |
| include | `dropped` | `dropped` | Responses 专属恢复语义 |
| store | `dropped` | `dropped` | Responses 专属恢复语义 |
| prompt_cache_key | `dropped` | `dropped` | 当前主线无等价承载位 |
| response_format | `unsupported` | `unsupported` | 当前主线不承诺等价 structured output |
| reasoning | `lossy` | `lossy` | Anthropic/Gemini 仅做近似映射 |
| previous_response_id / submit_tool_outputs continuation | `lossy` | `lossy` | 统一由 continuation / chat process fallback 承接 |

## Continuation Sticky Scope

| 语义 | 当前结论 | Rust 真源 |
|---|---|---|
| request_chain | `full` | `resolve_continuation_sticky_key` |
| session | `full` | `resolve_continuation_sticky_key` |
| conversation | `full` | `resolve_continuation_sticky_key` |
| request | `full` | `resolve_continuation_sticky_key` |
| legacy responses resume fallback | `lossy/legacy-fallback` | `resolve_continuation_sticky_key` |

## Response Path（当前主线）

| 方向 | 结论 | 说明 |
|---|---|---|
| provider -> canonical response | `full` | compat 已有最小响应规范化主线 |
| canonical -> responses shell | `full` | host/orchestrator 主线已可恢复 responses shell |
| canonical -> anthropic request | `full` | 当前只承诺 provider-facing request shape |
| canonical -> gemini request | `full` | 当前只承诺 provider-facing request shape |
| canonical -> gemini public client protocol | `internal-only` | 当前不对外承诺完整 client surface |

## 当前明确非目标
1. 不承诺 Gemini 完整 public client protocol。
2. 不把 anthropic tool alias fidelity 说成已 full close。
3. 不把 audit sidecar 写进真实 request body。
4. 不为矩阵测试复制第二套协议转换实现。
