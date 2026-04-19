# Phase 09 Hub Pipeline Audit

## 索引概要
- L1-L8 `purpose`：本文件记录旧仓 hub 主链审计结论，作为 Phase 09 Batch 02 的真源输入。
- L10-L23 `evidence`：旧仓入口、协议 client、bridge、continuation、回归矩阵证据。
- L25-L39 `conclusions`：hub canonical 语义层、shared mapping、provider-first continuation 结论。
- L41-L48 `rules`：本阶段必须执行的性能、状态与回归规则。

## 审计目标
用 `../routecodex` 的真实代码确认：`responses <> chat process <> provider` 这条主链在旧仓里的唯一真源到底在哪里，哪些能力应该迁入 Rust 的 `hub pipeline`，哪些仍应留在 compat/provider。

## 旧仓证据
1. **统一入口仍是 executePipeline**
   - 文件：
     - `../routecodex/src/server/handlers/responses-handler.ts`
     - `../routecodex/src/server/handlers/chat-handler.ts`
     - `../routecodex/src/server/handlers/messages-handler.ts`
   - 结论：不同入站协议最终都会整理成统一 pipeline 输入（`entryEndpoint / providerProtocol / body / metadata`），说明中间层应该是共享语义层，而不是每对协议单独互转。
2. **Anthropic client 复用 chat shared core，再做薄 patch**
   - 文件：
     - `../routecodex/src/client/openai/chat-protocol-client.ts`
     - `../routecodex/src/client/anthropic/anthropic-protocol-client.ts`
   - 结论：Anthropic path 并没有单独维护一整套 pipeline truth，而是在共享 chat request 构造上补 `tool_choice`、`metadata`、`anthropic-version`、`x-api-key` 等差异，这证明协议差异应优先沉到 shared mapping + 薄协议 patch。
3. **旧仓 bridge 已把 chat-like semantics 当中间真源**
   - 文件：`../routecodex/src/modules/llmswitch/bridge/native-exports.ts`
   - 关键函数：
     - `mapChatToolsToBridgeJson`
     - `injectMcpToolsForChatJson`
     - `injectMcpToolsForResponsesJson`
     - `buildAnthropicResponseFromChatJson`
   - 结论：tool 注入和 anthropic response 构造都已建立在共享 chat 语义之上，而不是协议对协议硬编码互转。
4. **responses continuation 已经是 provider/runtime 强相关能力**
   - 文件：
     - `../routecodex/src/modules/llmswitch/bridge/runtime-integrations.ts`
     - `../routecodex/src/providers/core/runtime/responses-provider.ts`
     - `../routecodex/src/server/handlers/responses-handler.ts`
   - 关键函数：
     - `resumeResponsesConversation`
     - `resumeLatestResponsesContinuationByScope`
     - `rebindResponsesConversationRequestId`
   - 结论：`submit_tool_outputs` / continuation restore / request_id rebind 不是单纯的协议字段映射，而是带状态、带 provider 能力判定的生命周期逻辑。
5. **旧仓已有较完备的业务回归矩阵**
   - 重点回归源：
     - `../routecodex/scripts/tests/anthropic-responses-roundtrip.mjs`
     - `../routecodex/tests/sharedmodule/real-sample-hub-io-compare.spec.ts`
     - `../routecodex/tests/sharedmodule/chat-process-roundtrip-integration.spec.ts`
     - `../routecodex/tests/sharedmodule/responses-submit-tool-outputs.spec.ts`
     - `../routecodex/tests/sharedmodule/responses-continuation-store.spec.ts`
     - `../routecodex/tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
     - `../routecodex/tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
     - `../routecodex/tests/server/handlers/handler-request-executor.unified-semantics.e2e.spec.ts`
     - `../routecodex/scripts/v2-consistency/run-consistency-test.mjs`
     - `../routecodex/scripts/v2-consistency/comprehensive-consistency-test.mjs`
   - 结论：Rust 新实现不应自创一套弱化版验收，而应逐步对齐这套矩阵。

## 审计结论
1. **Hub 中间真源应为扩展 chat canonical IR，而不是某个 provider wire format**
   - 需要在 Rust 中明确：`HubCanonicalRequest / Message / ContentPart / Tool / ToolCall / ToolResult / Response`。
2. **协议转换应拆成两层**
   - 第一层：共享 mapping ops / shared functions。
   - 第二层：协议 JSON/spec 驱动的字段映射规则。
   - 但生命周期、continuation policy、stream 分叉、显式失败语义不能只靠配置；它们仍是 block truth。
3. **Continuation ownership 必须 provider-first**
   - 如果入站 provider 与出站 provider 相同，且 provider 原生支持 save/restore / continuation，则优先在 provider/server 侧继续，不在 chat_process 重建上下文。
   - 若 provider 不支持，或跨 provider / 跨协议导致原生 continuation 失效，则退回 `hub.chat_process` 做语义级 continuation materialize / restore。
4. **性能规则：默认 no-copy / minimal-copy**
   - canonical lift、compat 映射、provider carrier 构造都要优先使用借用、投影、move、最小 clone。
   - 只有在 ownership 边界、持久化、快照、debug bundle、独立响应壳构造确实需要时才复制。
5. **第一条真实主链仍然固定**
   - `responses ingress -> virtual router -> hub(inbound <> chat_process <> outbound) -> compat -> provider(anthropic)`
   - compat 仍在 hub 后、provider 前；provider 仍只做 `transport / auth / runtime`。

## 本阶段硬规则
1. 不做协议对协议 pairwise 直转；统一先升到 canonical，再落到目标协议。
2. 不为“方便实现”提前把 continuation/store/mapping 塞回 host 或 provider 以外的错误边界。
3. 不允许通过裁剪真实 payload 换性能；性能优化只能来自 no-copy、薄包装、少中间层。
4. Rust hub 主线落地后，必须对齐旧仓矩阵测试，至少先覆盖 anthropic 主链、continuation、cross-protocol audit 三类回归。
