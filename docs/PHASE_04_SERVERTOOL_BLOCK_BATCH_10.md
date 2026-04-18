# Phase 04 Servertool Block Batch 10

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L29 `scope`：本批次要实现的最小闭环。
- L31-L74 `in-out`：输入输出契约。
- L76-L84 `boundaries`：明确不做的范围。
- L86-L96 `verification`：测试与验收方式。

## 目标与来源
本批次从 `reasoning.stop mode sync` 继续推进到 `sticky persistence` 最小闭环：把旧仓 `sticky-session-store.ts` 中“按显式 sticky key 读取/写入 routing state 文件”的最小持久化语义，收拢到 `rcc-core-servertool`，但只针对显式传入的 `sticky_key` 与 `state` object 工作，不引入 runtime metadata、全量 router state codec 或异步队列。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/sticky-session-store.ts`
   - `loadRoutingInstructionStateSync`
   - `saveRoutingInstructionStateSync`
   - `isPersistentKey`
   - `keyToFilename`
   - `resolveSessionFilepaths`
   - `atomicWriteFileSync`
2. 已有 Rust batch07~09 输出：
   - `build_reasoning_stop_state_patch`
   - `read_reasoning_stop_state_view`
   - `build_clear_reasoning_stop_state_result`
   - `build_reasoning_stop_mode_sync_result`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop/sticky_store.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 sticky save API：
   - `save_reasoning_stop_sticky_state(payload)`
2. 在 `rcc-core-servertool` 提供 block 级 sticky load API：
   - `load_reasoning_stop_sticky_state(payload)`
3. 输入最小固定为：
   - `sticky_key`
   - `state`（save 时）
   - `session_dir`（仅显式 override，用于测试或明确指定目录）
4. sticky key 语义：
   - 仅接受前缀：
     - `session:`
     - `conversation:`
     - `tmux:`
   - 文件名继续走 safe-id 规则：
     - 非 `[a-zA-Z0-9_.-]` 统一替换成 `_`
5. 路径语义：
   - 若显式传入 `session_dir`，直接用它作为当前批次持久化目录
   - 否则：
     - `tmux:` -> `ROUTECODEX_SESSION_DIR` 或 `~/.rcc/sessions`
     - `session:` / `conversation:` -> `~/.rcc/state/routing`
6. save 语义：
   - `state` 为 object 时，按：
```json
{"version":1,"state":{...}}
```
     做 sync 原子写入
   - `state=null` 时删除文件
7. load 语义：
   - 文件不存在时返回 `state: null`
   - 文件存在时支持两种形状：
     - version envelope：`{"version":1,"state":{...}}`
     - bare object：`{...}`
   - 输出统一 canonical：
```json
{"sticky_key":"...","state":{...}|null}
```
8. `plan()` 只允许把：
   - `tool.reasoning.stop.sticky.save`
   - `tool.reasoning.stop.sticky.load`
   路由到对应 block API，不得复制 sticky store 逻辑。

## 输入输出契约
### save 输入 payload
```json
{
  "sticky_key": "session:demo-1",
  "session_dir": "/tmp/rcc-batch10",
  "state": {
    "reasoningStopMode": "endless",
    "reasoningStopArmed": true,
    "reasoningStopSummary": "用户任务目标: 完成 batch10"
  }
}
```

### save 输出
```json
{
  "sticky_key": "session:demo-1",
  "state": {
    "reasoningStopMode": "endless",
    "reasoningStopArmed": true,
    "reasoningStopSummary": "用户任务目标: 完成 batch10"
  }
}
```

### load 输入 payload
```json
{
  "sticky_key": "session:demo-1",
  "session_dir": "/tmp/rcc-batch10"
}
```

### load 输出
```json
{
  "sticky_key": "session:demo-1",
  "state": {
    "reasoningStopMode": "endless",
    "reasoningStopArmed": true,
    "reasoningStopSummary": "用户任务目标: 完成 batch10"
  }
}
```

## 明确不做
1. 不做 runtime metadata attach/read。
2. 不做全量 `RoutingInstructionState` codec 迁移。
3. 不做 async write queue。
4. 不做 provider error reporting / telemetry recover。
5. 不做 reasoning-stop-guard / stop-message-auto / memory append。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - save 后 load 回读同一 state
   - `state=null` 时删除文件，后续 load 返回 `null`
   - bare object 文件可被 load
   - 非法 `sticky_key` 返回 invalid
   - `tool.reasoning.stop.sticky.save` / `tool.reasoning.stop.sticky.load` plan 只做薄路由
