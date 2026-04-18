# Phase 04 Servertool Block Batch 01

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L24 `scope`：本批次要实现的最小闭环。
- L26-L38 `in-out`：输入输出契约。
- L40-L48 `boundaries`：明确不做的范围。
- L50-L56 `verification`：测试与验收方式。

## 目标与来源
本批次只做一个最小闭环：把旧仓 followup request builder 中已经具备纯函数基础的主链，收拢为 `rcc-core-servertool` 的第一个 block 真源 API。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
2. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-sanitize.ts`
3. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-message-trimmer.ts`
4. 已迁入 `rcc-core-domain` 的相关 helper：
   - `followup_sanitize`
   - `followup_message_trim`
   - `followup_request_utils`
   - `followup_tool_compact`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/followup.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供一个 block 级 followup request builder。
2. 输入最小固定为：
   - `captured.model/messages/tools/parameters`
   - `adapter_context`
   - `followup_text`
   - `max_non_system_messages`
   - `tool_content_max_chars`
   - `drop_tool_name`（可选）
3. 输出固定为 canonical chat-like request：
   - `model`
   - `messages`
   - `tools?`
   - `parameters?`
4. `plan()` 只允许调用这个 builder 决定 followup 是否可计划，不得复制其逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "captured": {
    "model": "gpt-5",
    "messages": [],
    "tools": [],
    "parameters": {}
  },
  "adapter_context": {},
  "followup_text": "继续执行",
  "max_non_system_messages": 16,
  "tool_content_max_chars": 1200,
  "drop_tool_name": "reasoning.stop"
}
```

### 处理语义
1. model：使用 `resolve_followup_model`。
2. messages：先 trim，再 compact，最后 append sanitized followup user text。
3. tools：原样继承，可选按 `drop_tool_name` 过滤。
4. parameters：继承 captured parameters，并使用 `normalize_followup_parameters` 清除不该继承的 hint。

### 输出要求
- 输出必须是可再次进入 chat-process 的 canonical payload；不得在 block 内转成 provider-specific `/v1/responses` 或其它协议形状。

## 明确不做
1. 不做 `chatResponse` assistant/tool-output 注入。
2. 不做 `inject_system_text` / `inject_vision_summary` / `force_tool_choice` / `ensure_standard_tools`。
3. 不做 responses payload rebuild。
4. 不做完整 servertool engine、clock task store、stop-message loop。
5. 不做 host/provider/orchestrator 额外包装层。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_followup_request.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - model 选择
   - text sanitize
   - message trim + tool compact
   - tool drop
   - parameter normalize
   - invalid payload fail fast
   - orchestrator smoke 到 servertool route
