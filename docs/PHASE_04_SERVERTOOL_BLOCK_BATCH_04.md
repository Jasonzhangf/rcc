# Phase 04 Servertool Block Batch 04

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L30 `scope`：本批次要实现的最小闭环。
- L32-L57 `in-out`：输入输出契约。
- L59-L67 `boundaries`：明确不做的范围。
- L69-L77 `verification`：测试与验收方式。

## 目标与来源
本批次继续 followup 分支，但只补 `tool governance` 最小闭环：把旧仓 followup request builder 中 `ensureStandardToolsIfMissing` / `force_tool_choice` / `append_tool_if_missing` 的 tools / parameters 改写语义，收拢到 `rcc-core-servertool`，继续保持 canonical chat-like payload 输出。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
   - `ensureStandardToolsIfMissing`
   - `force_tool_choice`
   - `append_tool_if_missing`
2. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `REASONING_STOP_TOOL_DEF`
3. Batch 01 / 02 / 03 已落到 Rust 的 followup builder：
   - `rust/crates/rcc-core-servertool/src/followup.rs`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/followup.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 batch03 builder 上增加可选 tool governance：
   - `ensure_standard_tools`
   - `force_tool_choice`
   - `append_tool_if_missing`
2. `ensure_standard_tools` 语义：
   - 只在已有 tools 非空时处理；若没有 tools，必须保持空，不得合成假工具面
   - 若启用且判定需要 `reasoning.stop`，且当前 tools 中缺失，则追加最小 `REASONING_STOP_TOOL_DEF`
   - 需要 `reasoning.stop` 的最小判定固定为：
     - `inject_system_text` 或 `followup_text` 文本包含 `reasoning.stop` / `stopless`
     - 或原始 tools 中已经有 `reasoning.stop`
3. `force_tool_choice` 语义：
   - 允许把 `parameters.tool_choice` 强制设为给定值
   - 若值是 `type=function` object，则同时把 `parallel_tool_calls=false`
   - 显式 `clear=true` 时删除 `parameters.tool_choice`
4. `append_tool_if_missing` 语义：
   - 若给定 `tool_name` 与 `tool_definition`，且当前 tools 中不存在同名 function tool，则追加
   - 若当前 tools 缺失，则新建 tools array 后追加
   - 若参数非法，则忽略，不报假成功
5. 本批固定顺序：
   - trim captured messages
   - system / vision injection
   - assistant / tool-output injection
   - compact tool content
   - append sanitized followup user text
   - normalize tools / parameters，并执行 tool governance

## 输入输出契约
### 新增输入 payload 形状
```json
{
  "captured": {
    "model": "gpt-5",
    "messages": [],
    "tools": [{ "type": "function", "function": { "name": "lookup" } }],
    "parameters": { "parallel_tool_calls": true }
  },
  "ensure_standard_tools": true,
  "force_tool_choice": {
    "value": { "type": "function", "function": { "name": "lookup" } }
  },
  "append_tool_if_missing": {
    "tool_name": "reasoning.stop",
    "tool_definition": { "type": "function", "function": { "name": "reasoning.stop" } }
  },
  "inject_system_text": { "text": "继续使用 stopless 模式" },
  "followup_text": "继续执行"
}
```

### 输出要求
- 输出仍必须是可再次进入 chat-process 的 canonical chat-like request；不得在 block 内转成 provider-specific `/v1/responses` 或其它协议形状。
- `host / provider / orchestrator` 不得复制这段 tool governance 语义。
- provider 仍只允许 `transport / auth / runtime`，不能承接这些业务字段解释。

## 明确不做
1. 不做 `replace_tools` / `preserve_tools` / 完整 op engine。
2. 不做 provider compat / standard-tools 全家桶治理。
3. 不做 responses payload rebuild。
4. 不做完整 servertool engine、clock task store、stop-message loop。
5. 不做 host/provider/orchestrator 额外包装层。
6. 不做新的 daemon/sidecar/runtime 进程。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_followup_tool_governance.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - `ensure_standard_tools` 在 tools 为空时保持空
   - `ensure_standard_tools` 在 stopless / reasoning.stop 提示下追加 `reasoning.stop`
   - 不重复追加已有 `reasoning.stop`
   - `force_tool_choice` 写入 `parameters.tool_choice`
   - function tool choice 会把 `parallel_tool_calls=false`
   - `force_tool_choice.clear=true` 删除 `tool_choice`
   - `append_tool_if_missing` 只在缺失时追加，并支持 tools 缺失时新建
