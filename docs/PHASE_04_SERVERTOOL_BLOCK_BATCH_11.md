# Phase 04 Servertool Block Batch 11

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L28 `scope`：本批次要实现的最小闭环。
- L30-L69 `in-out`：输入输出契约。
- L71-L79 `boundaries`：明确不做的范围。
- L81-L91 `verification`：测试与验收方式。

## 目标与来源
本批次从 `reasoning.stop sticky persistence` 继续推进到 `fail-count` 最小闭环：把旧仓 `reasoning-stop-state.ts` 中“读取 / 增加 / 重置 reasoning stop fail count”这三段 servertool 语义，收拢到 `rcc-core-servertool`，并复用 batch10 的显式 sticky persistence 能力完成最小持久化闭环。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`
   - `readReasoningStopFailCount`
   - `incrementReasoningStopFailCount`
   - `resetReasoningStopFailCount`
2. 已有 Rust batch10 输出：
   - `save_reasoning_stop_sticky_state`
   - `load_reasoning_stop_sticky_state`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/reasoning_stop/fail_count.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 fail-count read API：
   - `read_reasoning_stop_fail_count(payload)`
2. 在 `rcc-core-servertool` 提供 block 级 fail-count increment API：
   - `increment_reasoning_stop_fail_count(payload)`
3. 在 `rcc-core-servertool` 提供 block 级 fail-count reset API：
   - `reset_reasoning_stop_fail_count(payload)`
4. 输入最小固定为：
   - `sticky_key`
   - `session_dir`（仅显式 override，用于测试或明确指定目录）
5. read 语义：
   - 文件缺失 / 未设置字段时返回 `count=0`
   - 仅接受 finite number，按 `floor(max(0,n))`
6. increment 语义：
   - 读取当前 sticky state
   - `reasoningStopFailCount += 1`
   - 保存回 sticky state
   - 返回 canonical `{count}`
7. reset 语义：
   - 从 sticky state 中移除 `reasoningStopFailCount`
   - 若移除后 state 为空，则删除文件
   - 返回 canonical `{count:0}`
8. `plan()` 只允许把：
   - `tool.reasoning.stop.fail.read`
   - `tool.reasoning.stop.fail.inc`
   - `tool.reasoning.stop.fail.reset`
   路由到对应 block API，不得复制 fail-count 业务逻辑。

## 输入输出契约
### read/inc/reset 输入 payload
```json
{
  "sticky_key": "session:demo-1",
  "session_dir": "/tmp/rcc-batch11"
}
```

### read 输出
```json
{
  "count": 0
}
```

### inc 输出
```json
{
  "count": 1
}
```

### reset 输出
```json
{
  "count": 0
}
```

## 明确不做
1. 不做 guard-trigger count。
2. 不做 runtime metadata attach/read。
3. 不做 full router state codec 迁移。
4. 不做 async queue / telemetry recover。
5. 不做 reasoning-stop-guard / stop-message-auto / memory append。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - 缺失文件时 read 返回 `0`
   - inc 后再次 read 返回递增值
   - reset 后 read 返回 `0`
   - 非法 `sticky_key` 返回 invalid
   - `tool.reasoning.stop.fail.read` / `inc` / `reset` plan 只做薄路由
