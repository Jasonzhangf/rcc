# Phase 04 Servertool Block Batch 09

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L30 `scope`：本批次要实现的最小闭环。
- L32-L71 `in-out`：输入输出契约。
- L73-L81 `boundaries`：明确不做的范围。
- L83-L93 `verification`：测试与验收方式。

## 目标与来源
本批次从 `reasoning.stop state read/clear` 继续推进到 `mode sync` 最小闭环：把旧仓 `reasoning-stop-state.ts` 中 stopless directive mode 解析 / 清洗 / state patch sync 的最小 block 语义收拢到 `rcc-core-servertool`，但只针对显式传入的 `captured` request 与 `base_state` object 工作，不引入 sticky-session/runtime metadata 持久化。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `extractStoplessDirectiveModeFromText`
   - `stripStoplessDirectiveMarkersFromText`
   - `stripStoplessDirectiveMarkersFromCapturedRequest`
   - `extractStoplessDirectiveModeFromAdapterContext`
   - `syncReasoningStopModeFromRequest`
2. 已有 Rust 能力：
   - `rcc-core-domain::normalize_reasoning_stop_mode`
   - `rcc-core-domain::merge_reasoning_stop_serialization`
   - `rcc-core-domain::get_latest_user_message_index`
   - `rcc-core-domain::extract_message_text`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop/directive_mode.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 mode sync API：
   - `build_reasoning_stop_mode_sync_result(payload)`
2. 输入最小固定为：
   - `captured`
   - `base_state`
   - `fallback_mode`
3. stored directive mode 语义：
   - 先读 `captured.reasoningStopDirectiveMode` / `captured.__reasoningStopDirectiveMode`
   - 再读 payload 顶层同名字段
   - 若已存在合法 mode，则直接采用它，不再解析 inline marker，也不改写 `captured`
4. inline directive 语义：
   - 只从 `captured.messages` 的**最后一个 user message**里取文本
   - 读取最后一个合法 `<**stopless:on|off|endless**>` marker
   - 无论 marker 是否合法，只要匹配 `<**stopless:...**>` 完整形状，都要从 `captured.messages` / `captured.input` 的 user content 中剥离
5. final mode 语义：
   - 若存在 directive mode，取 directive mode
   - 否则取 `base_state.reasoningStopMode`
   - 再否则取 `fallback_mode`，默认 `off`
6. state patch 语义：
   - 仅在存在 directive mode 时产出 `state_patch`
   - `state_patch` 基于 `base_state` 合并 `reasoningStopMode`
   - 若 mode=`off`，还要清掉：
     - `reasoningStopArmed`
     - `reasoningStopSummary`
     - `reasoningStopUpdatedAt`
7. `plan()` 只允许把：
   - `tool.reasoning.stop.mode.sync`
   路由到对应 block API，不得复制 mode parse/strip/sync 逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "captured": {
    "messages": [
      { "role": "user", "content": "请继续处理 <**stopless:endless**>" }
    ]
  },
  "base_state": {
    "reasoningStopMode": "off",
    "native": true
  },
  "fallback_mode": "off"
}
```

### 输出要求
- 返回 canonical result：
```json
{
  "mode": "endless",
  "captured": {
    "messages": [
      { "role": "user", "content": "请继续处理" }
    ]
  },
  "state_patch": {
    "reasoningStopMode": "endless",
    "native": true
  }
}
```

### 关键边界
- 若只存在 persisted/base/fallback mode，没有 directive mode：
  - 仍返回 `mode`
  - `captured` 保持当前 canonical 形状
  - 不产出 `state_patch`
- 若 directive mode=`off`：
  - `state_patch` 必须清掉 `reasoningStopArmed` / `reasoningStopSummary` / `reasoningStopUpdatedAt`
- 本批次只做显式 request/state object sync，不做 sticky 持久化、副作用或 runtime metadata。

## 明确不做
1. 不做 sticky-session-store 持久化。
2. 不做 runtime metadata attach/read。
3. 不做 raw responses payload rebuild。
4. 不做 fail-count / guard-trigger 的读写闭环。
5. 不做 reasoning-stop-guard / stop-message-auto / memory append。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - inline directive mode 解析与 marker strip
   - stored directive mode 优先且不 strip
   - 无 directive 时 fallback 到 base_state / fallback_mode
   - `off` mode 生成清理过的 `state_patch`
   - `tool.reasoning.stop.mode.sync` plan 只做薄路由
