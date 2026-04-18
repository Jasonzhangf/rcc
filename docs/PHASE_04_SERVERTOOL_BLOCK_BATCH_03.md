# Phase 04 Servertool Block Batch 03

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L28 `scope`：本批次要实现的最小闭环。
- L30-L49 `in-out`：输入输出契约。
- L51-L59 `boundaries`：明确不做的范围。
- L61-L69 `verification`：测试与验收方式。

## 目标与来源
本批次继续 followup 分支，但只补 `system / vision injection` 最小闭环：把旧仓 followup request builder 中 `injectSystemTextIntoMessages` / `injectVisionSummaryIntoMessages` 的 message 改写语义，收拢到 `rcc-core-servertool`，继续保持 canonical chat-like payload 输出。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
   - `injectSystemTextIntoMessages`
   - `injectVisionSummaryIntoMessages`
   - `inject_system_text`
   - `inject_vision_summary`
2. Batch 01 / 02 已落到 Rust 的 followup builder：
   - `rust/crates/rcc-core-servertool/src/followup.rs`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/followup.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 batch02 builder 上增加可选 message injection：
   - `inject_system_text`
   - `inject_vision_summary`
2. 注入输入新增：
   - `inject_system_text: "..."` 或 `{ "text": "..." }`
   - `inject_vision_summary: "..."` 或 `{ "summary": "..." }`
3. `inject_system_text` 语义：
   - 在第一条非 `system` message 之前插入新的 `system` message
   - 保留已有的多个 leading system messages
   - blank text 直接忽略
4. `inject_vision_summary` 语义：
   - 若某条 message 的 `content` 是 array，且存在 `type` 包含 `image` 的 part：
     - 把该 image part 替换成 `{ "type": "text", "text": "[Image omitted]" }`
     - 在同一个 content array 末尾追加 `{ "type": "text", "text": "[Vision] <summary>" }`
   - 若没有发生 image-part 替换：fallback 到最后一条 `user` message
     - array content：追加 `[Vision] ...` text part
     - string content：追加 `\n[Vision] ...`
     - 其它 content：直接替换成 `[Vision] ...`
   - 若仍没有 `user` message：新建 `{ "role": "user", "content": "[Vision] ..." }`
5. 处理顺序固定为：
   - trim captured messages
   - inject system text
   - inject vision summary
   - append assistant/tool-output messages
   - compact tool content
   - append sanitized followup user text

## 输入输出契约
### 新增输入 payload 形状
```json
{
  "captured": { "model": "gpt-5", "messages": [] },
  "inject_system_text": { "text": "继续使用 stopless 模式" },
  "inject_vision_summary": { "summary": "用户上传的是一张白板照片" },
  "chat_response": {
    "choices": [{ "message": { "role": "assistant", "content": "done" } }],
    "tool_outputs": [{ "tool_call_id": "call-1", "content": { "ok": true } }]
  },
  "append_assistant_message": true,
  "append_tool_messages_from_tool_outputs": true,
  "followup_text": "继续执行"
}
```

### 输出要求
- 输出仍必须是可再次进入 chat-process 的 canonical chat-like request；不得在 block 内转成 provider-specific `/v1/responses` 或其它协议形状。
- `host / provider / orchestrator` 不得复制这段 message injection 语义。

## 明确不做
1. 不做 `force_tool_choice` / `ensure_standard_tools` / `append_tool_if_missing`。
2. 不做 responses payload rebuild。
3. 不做完整 servertool engine、clock task store、stop-message loop。
4. 不做 host/provider/orchestrator 额外包装层。
5. 不做新的 daemon/sidecar/runtime 进程。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_followup_system_vision.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - leading system messages 后插入新的 system message
   - blank system text 忽略
   - image part -> `[Image omitted]` + `[Vision] ...`
   - last-user string/array fallback
   - no-user fallback 新建 user message
   - 与 assistant/tool-output injection、tool compact 的顺序协同
