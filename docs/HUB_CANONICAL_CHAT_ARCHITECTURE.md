# Hub Canonical Chat Architecture

## 索引概要
- L1-L8 `purpose`：定义 hub canonical 语义层与三层边界。
- L10-L29 `model`：canonical IR 的核心对象。
- L31-L52 `block-boundaries`：inbound / chat_process / outbound 与 compat/provider 的归属。
- L54-L66 `config-vs-code`：哪些能力可配置化，哪些必须留在 block code。
- L68-L76 `performance`：no-copy / minimal-copy 设计规则。

## 目标
把 hub 的中间语义真源固定为 **扩展 chat canonical IR**，使 `responses / chat / anthropic / gemini / 其它协议` 都先映射到同一层语义，再由 outbound + compat/provider 投影到目标协议。

## Canonical IR
1. `HubCanonicalRequest`
   - 顶层请求壳；承载 model、instructions、input、tools、metadata、stream hints、provider hints、continuation hints。
2. `HubCanonicalMessage`
   - 统一 message 结构；至少支持 `system / developer / user / assistant / tool`。
3. `HubCanonicalContentPart`
   - 统一 content parts；至少支持 `text / image / input_text / output_text / tool_call / tool_result / reasoning / refusal / vendor_extension`。
4. `HubCanonicalTool`
   - 统一工具定义；只表达语义，不绑定 provider transport。
5. `HubCanonicalToolCall`
   - 统一模型发起的 tool 调用。
6. `HubCanonicalToolResult`
   - 统一工具执行结果；必须能保留结构化 JSON，不强行压平为文本。
7. `HubCanonicalResponse`
   - 统一响应壳；既能承接 provider 成功结果，也能承接 stream/json 的归一输出。

## 三层职责
```text
编排层
  host / orchestrator
    -> 只负责装配、调用、错误透传

block 真源层
  router -> hub pipeline -> compat -> provider -> servertool

纯函数层
  domain shared functions / mapping ops / schema helpers / validators
```

## Hub 内部 block 边界
1. **hub.inbound**
   - 协议入站 payload -> `HubCanonicalRequest`
   - 做语义提升与最小 normalize
   - 不做 transport/auth/runtime
2. **hub.chat_process**
   - canonical 语义真源
   - 负责 tool / continuation / shared semantic policy / stateful fallback
   - 当 provider 原生 continuation 不可用时，在这里做 save/restore materialize
3. **hub.outbound**
   - `HubCanonical*` -> 目标出站 semantic carrier
   - 目标可能是 provider request semantic shell，或 client response semantic shell
4. **compat**
   - 位于 hub 后、provider 前
   - 只负责 canonical/provider carrier 的 shape mapping
   - 可大量复用 shared mapping ops + JSON/spec rules
5. **provider**
   - 只负责 `transport / auth / runtime`
   - 同时承接 provider-native continuation / save-restore（若该 provider 支持）
6. **host**
   - 第一性原则就是极薄
   - 只负责 HTTP/CLI entry、metadata 捕获、调用主链、回写结果

## Continuation ownership
1. provider 相同 + provider 支持原生 continuation
   - 优先走 provider/server side restore
   - hub.chat_process 不重复 materialize 全量上下文
2. provider 不支持，或跨 provider / 跨协议导致原生 continuation 失效
   - 回退到 `hub.chat_process` 做 canonical continuation restore
3. 该判定必须显式失败或显式分流，禁止静默 fallback。

## 哪些能力可配置，哪些必须写成 block truth
### 可配置化（JSON/spec-driven）
- 字段 rename / alias
- enum 映射
- content/tool 字段 shape 映射
- provider 特有字段 allowlist / drop list / lossy audit 表

### 必须留在代码里
- lifecycle 推进
- continuation policy
- stream branch
- tool governance / servertool boundary
- provider transport/auth/runtime
- 显式失败与错误分类

## 性能设计规则
1. 默认优先 borrowed view / projection / move，而不是 deep clone。
2. 共享 mapping ops 要支持最小复制；尽量把 clone 留到边界处。
3. debug snapshot / observability bundle 允许复制，但不得反向污染真实传输主链。
4. 不为了“统一接口”额外引入 daemon / sidecar / 多进程。
