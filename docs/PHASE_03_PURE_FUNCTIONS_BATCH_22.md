# Phase 03 Pure Functions Batch 22

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十二批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L36 `scope`：本批次迁移范围。
- L38-L53 `behavior`：必须保持的行为。
- L55-L65 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router stop-message state codec 的 fallback/merge pure helpers 到 `rcc-core-domain`，验证“native bridge 外围剩余的 reasoning-stop serialize merge、fallback patch apply、max-repeats ensure 语义也可以下沉为共享纯函数，而 native binding 与 router/store 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-stop-message-state-codec.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/routing_stop_message_codec.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 native bridge 之外的 reasoning-stop serialize merge、fallback deserialize patch、reasoning stop mode normalize、stopMessage mode max-repeats ensure 这类无 I/O、无网络、无进程副作用的纯 codec；native binding、本地 load、router/store/action 编排继续留在外层。

## 本批次范围
### 包含
- reasoning stop serialize merge
- fallback deserialize patch apply
- reasoning stop mode normalize
- `ensureStopMessageModeMaxRepeats` 对应语义
- Rust 单测

### 不包含
- `serializeStopMessageStateWithNative`
- `deserializeStopMessageStateWithNative`
- native binding / capability fail 逻辑
- router store / state snapshot / action 壳

## 需要保持的行为
1. serialize merge 只追加四类 reasoning 字段：合法的 `reasoningStopMode`、布尔 `reasoningStopArmed`、trim 后非空的 `reasoningStopSummary`、finite 且 `Math.max(0, Math.round(...))` 的 `reasoningStopUpdatedAt`。
2. fallback patch 对 `stopMessageSource` 必须 trim 后写入；对 `stopMessageText` 则保持旧语义：只用 `trim()` 判断非空，但写入原字符串本身。
3. `stopMessageMaxRepeats` 在 patch 中存在且 finite 时必须 `Math.floor` 写入；若 patch 中不存在该字段，则需在 `stageMode=on/auto` 时通过 `ensure` 补默认值 `10`。
4. `stopMessageUsed` 必须 `Math.max(0, Math.floor(...))`；`stopMessageUpdatedAt` / `stopMessageLastUsedAt` 只要求 finite 即保留。
5. `stopMessageStageMode` / `stopMessageAiMode` 必须复用共享 normalize 语义；`stopMessageAiHistory` 必须复用共享 history normalize，并且只有归一后非空才覆盖 state。
6. `reasoningStopMode` 仅接受 `on/off/endless`；`reasoningStopSummary` 要 trim 后写入；`reasoningStopUpdatedAt` 仍保持 `Math.max(0, Math.round(...))`。
7. 输出保持纯函数/纯 codec 语义，不引入 native/router/runtime/provider 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_routing_stop_message_codec.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
