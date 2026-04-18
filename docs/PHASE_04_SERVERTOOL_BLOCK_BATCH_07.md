# Phase 04 Servertool Block Batch 07

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L26 `scope`：本批次要实现的最小闭环。
- L28-L47 `in-out`：输入输出契约。
- L49-L56 `boundaries`：明确不做的范围。
- L58-L68 `verification`：测试与验收方式。

## 目标与来源
本批次从 `reasoning.stop tool_output` 继续推进到 `reasoning.stop state arm` 最小闭环：把旧仓 `reasoning-stop-state.ts` 中“summary 归一后写入 reasoning stop state”这段 servertool block 语义收拢到 `rcc-core-servertool`，但只做到 **state patch build**，不引入 sticky-session/runtime metadata 持久化。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `normalizeSummary`
   - `armReasoningStopState`
2. 已有 Rust batch06 输出：
   - `rust/crates/rcc-core-servertool/src/reasoning_stop.rs`
   - `build_reasoning_stop_tool_output`
3. 已迁入 domain 的 patch helper：
   - `rcc_core_domain::merge_reasoning_stop_serialization`
   - `rcc_core_domain::RoutingStopMessageState`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 state arm API：
   - `build_reasoning_stop_state_patch(payload)`
2. 输入最小固定为：
   - `summary`（可选）
   - `tool_output`（可选，优先级低于显式 `summary`）
   - `base_state`（可选）
   - `updated_at`（可选）
3. 处理语义：
   - 若显式 `summary` 存在且裁剪后非空，则直接使用
   - 否则解析 batch06 canonical `tool_output.content`
   - 仅当 `tool_output.content` 可解析且 `ok=true` 且包含 `summary` 时，允许 fallback
4. summary 归一规则：
   - trim
   - 空字符串视为无效
   - 最大长度 `4000`
5. 输出固定为 canonical state patch：
   - `reasoningStopArmed=true`
   - `reasoningStopSummary`
   - `reasoningStopUpdatedAt`
   - 以及 `base_state` 中已有字段
6. `updated_at`：
   - 若 payload 提供有限数字，则取 `floor(max(0,n))`
   - 否则使用当前时间戳毫秒数
7. `plan()` 只允许把 `tool.reasoning.stop.arm` 路由到这个 block API，不得复制 summary 解析与 patch merge 逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "tool_output": {
    "tool_call_id": "call_1",
    "name": "reasoning.stop",
    "content": "{\"ok\":true,\"summary\":\"用户任务目标: 完成 batch07\\n是否完成: 否\\n下一步: 补测试\"}"
  },
  "base_state": {
    "native": true
  },
  "updated_at": 123
}
```

### 输出要求
- 输出必须是统一 canonical routing-state patch；不得在 block 外再重复拼一份同语义 patch。
- 缺失有效 summary 时必须显式返回无结果，由调用方判定 invalid；不得静默伪造 armed state。
- 本批次只负责 patch build，不在 block 内做 sticky state 持久化。

## 明确不做
1. 不做 sticky-session-store 持久化。
2. 不做 runtime metadata attach/read。
3. 不做 `syncReasoningStopModeFromRequest`。
4. 不做 `clearReasoningStopState` / `readReasoningStopState`。
5. 不做 fail-count / guard-trigger 计数。
6. 不做 reasoning-stop-guard / stop-message-auto / memory append。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_state.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - 显式 `summary` 直接生成 patch
   - 显式空 summary 时 fallback 到 `tool_output.content`
   - `tool_output.content` 非 success summary 时 invalid
   - summary 超长时裁剪到 `4000`
   - `base_state` 字段被保留
   - `tool.reasoning.stop.arm` plan 只做薄路由
