# Phase 04 Servertool Block Batch 06

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L30 `scope`：本批次要实现的最小闭环。
- L32-L53 `in-out`：输入输出契约。
- L55-L62 `boundaries`：明确不做的范围。
- L64-L74 `verification`：测试与验收方式。

## 目标与来源
本批次从 `stop gateway` 继续推进到 `reasoning.stop` 最小闭环：先把旧仓 `reasoning-stop.ts` 里“tool_call 参数归一 + 校验 + summary + tool_output”这条 servertool block 主链收拢到 `rcc-core-servertool`，同时把 `reasoning-stop-state.ts` 里的 `REASONING_STOP_TOOL_DEF` 真源归到同一模块，继续保持 host/provider/orchestrator 极薄。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop.ts`
   - `normalizeReasoningStopPayload`
   - `buildSummary`
   - `appendToolOutput`
2. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `REASONING_STOP_TOOL_DEF`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`
- `rust/crates/rcc-core-servertool/src/followup/tool_governance.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 reasoning.stop API：
   - `build_reasoning_stop_tool_output(payload)`
2. 输入最小固定为：
   - `tool_call`
3. 处理语义：
   - 只接受 `name=reasoning.stop`
   - 解析 `arguments` JSON，并支持旧仓同义字段别名归一：
     - `task_goal | taskGoal | goal`
     - `is_completed | isCompleted | completed`
     - `stop_reason | stopReason | reason_type | reasonType`
     - `completion_evidence | completionEvidence | evidence`
     - `cannot_complete_reason | cannotCompleteReason | reason`
     - `blocking_evidence | blockingEvidence | block_evidence`
     - `attempts_exhausted | attemptsExhausted | all_attempts_exhausted | allAttemptsExhausted`
     - `next_step | nextStep | next_steps | nextSteps | plan_next_step | next_plan`
     - `user_input_required | userInputRequired`
     - `user_question | userQuestion | question_for_user | questionForUser`
     - `learning | experience | insight | lesson | lesson_learned`
4. 最小校验规则保持与旧仓一致：
   - `task_goal` 必填
   - `is_completed` 必填且必须是 boolean
   - `is_completed=true` 时必须有 `completion_evidence`
   - `is_completed=true` 时禁止 `user_input_required=true`
   - `is_completed=false && user_input_required=true` 时必须有 `cannot_complete_reason` + `user_question`
   - `is_completed=false` 时，若既无 `next_step` 又无 `cannot_complete_reason`，直接报错
   - `is_completed=false && cannot_complete_reason` 且无 `next_step` 时，必须有 `attempts_exhausted=true` + `blocking_evidence`
5. 输出固定为 canonical tool_output：
   - `tool_call_id`
   - `name`
   - `content`（JSON string）
6. 成功 content 形状：
```json
{"ok":true,"summary":"用户任务目标: ..."}
```
7. 失败 content 形状：
```json
{"ok":false,"code":"TASK_GOAL_REQUIRED","message":"reasoning.stop requires task_goal."}
```
8. `REASONING_STOP_TOOL_DEF` 真源迁到 `reasoning_stop.rs`，`followup/tool_governance.rs` 只做薄复用。
9. `plan()` 只允许把 `tool.reasoning.stop` 路由到这个 block API，不得复制 payload 校验逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "tool_call": {
    "id": "call_reasoning_stop_1",
    "name": "reasoning.stop",
    "arguments": "{\"task_goal\":\"完成 batch06\",\"is_completed\":false,\"next_step\":\"补测试\"}"
  }
}
```

### 输出要求
- block 输出必须是统一 canonical tool_output；不得在 block 外再拼第二份相同语义。
- 成功/失败都必须显式返回 tool_output content，不做静默吞错。
- 本批次只构建 tool_output，不在 block 内做 state arm、runtime metadata 写入或 auto-continue。

## 明确不做
1. 不做 `armReasoningStopState`。
2. 不做 sticky-session-store / runtime metadata attach/read。
3. 不做 reasoning-stop-guard。
4. 不做 memory appender / stop-message-auto / clock-auto。
5. 不做 chatResponse append/finalize engine。
6. 不做 host/provider/orchestrator 额外包装层。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - `task_goal` 缺失时报 `TASK_GOAL_REQUIRED`
   - `is_completed=true` 且无 `completion_evidence` 报错
   - `is_completed=false` 且仅有 `next_step` 时成功
   - `user_input_required=true` 时强制 `cannot_complete_reason + user_question`
   - `cannot_complete_reason` 且无 `next_step` 时强制 `attempts_exhausted=true + blocking_evidence`
   - `tool.reasoning.stop` plan 只做薄路由
   - followup tool governance 继续复用同一份 `reasoning.stop` tool def
