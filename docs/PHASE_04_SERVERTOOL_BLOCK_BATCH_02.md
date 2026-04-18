# Phase 04 Servertool Block Batch 02

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L26 `scope`：本批次要实现的最小闭环。
- L28-L45 `in-out`：输入输出契约。
- L47-L55 `boundaries`：明确不做的范围。
- L57-L65 `verification`：测试与验收方式。

## 目标与来源
本批次继续 followup 分支，但只补最小 injection 闭环：把旧仓 followup request builder 中 assistant message / tool-output message 注入语义，收拢到 `rcc-core-servertool`，继续保持 canonical chat-like payload 输出。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
   - `extractAssistantMessageFromChatLike`
   - `buildToolMessagesFromToolOutputs`
   - `append_assistant_message`
   - `append_tool_messages_from_tool_outputs`
2. Batch 01 已落到 Rust 的 followup builder：
   - `rust/crates/rcc-core-servertool/src/followup.rs`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/followup.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 batch01 builder 上增加可选 injection：
   - `append_assistant_message`
   - `append_tool_messages_from_tool_outputs`
2. 注入输入新增：
   - `chat_response`
   - `append_assistant_message`
   - `append_tool_messages_from_tool_outputs`
3. 注入语义：
   - assistant：优先 `choices[0].message`，否则 fallback 到 `output_text -> { role: assistant, content }`
   - tool outputs：从 `tool_outputs[]` 生成 `role=tool` message，保留 `tool_call_id`，`name` 默认 `tool`
4. required 语义必须保留：
   - 若请求注入且缺失对应数据，默认 fail fast
   - 只有显式 `required=false` 时才允许跳过

## 输入输出契约
### 新增输入 payload 形状
```json
{
  "captured": { "model": "gpt-5", "messages": [], "tools": [] },
  "adapter_context": {},
  "chat_response": {
    "choices": [{ "message": { "role": "assistant", "content": "tool done" } }],
    "tool_outputs": [{ "tool_call_id": "call-1", "name": "lookup", "content": { "ok": true } }]
  },
  "append_assistant_message": true,
  "append_tool_messages_from_tool_outputs": { "required": true },
  "followup_text": "继续执行"
}
```

### 处理顺序
1. trim captured messages
2. optional append assistant message
3. optional append tool output messages
4. compact all tool role messages
5. append sanitized followup user text
6. 输出 canonical chat-like request

### 输出要求
- 输出仍必须是可再次进入 chat-process 的 canonical payload；不得在 block 内转成 provider-specific `/v1/responses` 或其它协议形状。

## 明确不做
1. 不做 `inject_system_text` / `inject_vision_summary` / `force_tool_choice` / `ensure_standard_tools`。
2. 不做 responses payload rebuild。
3. 不做完整 servertool engine、clock task store、stop-message loop。
4. 不做 host/provider/orchestrator 额外包装层。
5. 不做新的 daemon/sidecar/runtime 进程。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_followup_injection.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - assistant message 注入主路径
   - `output_text` fallback
   - tool_outputs 注入主路径
   - `required=true` 缺失时 fail fast
   - `required=false` 缺失时允许跳过
   - 注入后的 tool content compact 仍生效
