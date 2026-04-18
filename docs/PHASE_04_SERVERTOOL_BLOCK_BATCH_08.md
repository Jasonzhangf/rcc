# Phase 04 Servertool Block Batch 08

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L27 `scope`：本批次要实现的最小闭环。
- L29-L52 `in-out`：输入输出契约。
- L54-L60 `boundaries`：明确不做的范围。
- L62-L72 `verification`：测试与验收方式。

## 目标与来源
本批次从 `reasoning.stop state arm` 继续推进到 `state read/clear` 最小闭环：把旧仓 `reasoning-stop-state.ts` 中“读取 reasoning stop state 视图”和“清空 reasoning stop state 字段”这两段 servertool block 语义收拢到 `rcc-core-servertool`，但只针对显式传入的 `state` object 工作，不引入 sticky-session/runtime metadata 持久化。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `readReasoningStopState`
   - `clearReasoningStopState`
   - `normalizeSummary`
2. 已有 Rust batch07 输出：
   - `build_reasoning_stop_state_patch`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop/state_view.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 state read API：
   - `read_reasoning_stop_state_view(payload)`
2. 在 `rcc-core-servertool` 提供 block 级 state clear API：
   - `build_clear_reasoning_stop_state_result(payload)`
3. 输入最小固定为：
   - `state`
4. read 语义：
   - `summary` 继续走 trim + 最长 `4000`
   - `armed = reasoningStopArmed === true && summary 非空`
   - `updated_at` 仅接受有限数字并做 `floor(max(0,n))`
   - 无有效 state 时返回：
```json
{"armed":false,"summary":""}
```
5. clear 语义：
   - 删除：
     - `reasoningStopArmed`
     - `reasoningStopSummary`
     - `reasoningStopUpdatedAt`
     - `reasoningStopFailCount`
   - 其余字段保留
   - 若删除后对象为空，返回 `null`
6. `plan()` 只允许把：
   - `tool.reasoning.stop.read`
   - `tool.reasoning.stop.clear`
   路由到对应 block API，不得复制 read/clear 逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "state": {
    "reasoningStopArmed": true,
    "reasoningStopSummary": "  用户任务目标: 完成 batch08  ",
    "reasoningStopUpdatedAt": 9.8,
    "native": true
  }
}
```

### 输出要求
- read 输出固定为 canonical view：
```json
{
  "armed": true,
  "summary": "用户任务目标: 完成 batch08",
  "updated_at": 9
}
```
- clear 输出为：
  - 保留其它字段的 object；或
  - `null`
- 本批次只做 object read/clear，不做 sticky 持久化、副作用或 runtime metadata。

## 明确不做
1. 不做 sticky-session-store 持久化。
2. 不做 runtime metadata attach/read。
3. 不做 `syncReasoningStopModeFromRequest`。
4. 不做 fail-count/guard-trigger 的读写闭环。
5. 不做 reasoning-stop-guard / stop-message-auto / memory append。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - 读取有效 state view
   - 空 state 返回默认 view
   - clear 后保留非 reasoning 字段
   - 仅 reasoning 字段时 clear 返回 `null`
   - `tool.reasoning.stop.read` / `tool.reasoning.stop.clear` plan 只做薄路由
