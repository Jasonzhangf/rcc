# Phase 03 Pure Functions Batch 13

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十三批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L37 `scope`：本批次迁移范围。
- L39-L52 `behavior`：必须保持的行为。
- L54-L64 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 stop-message state shared codec pure helpers 到 `rcc-core-domain`，验证“router/servertool 共同依赖的 stop-message 模式归一、最大轮次解析、snapshot 归一可以先沉为共享纯函数，而 state create/clear/patch 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-stop-message-state-codec.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/stop-message-auto/routing-state.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/stop_message_state.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 stop-message 的 mode normalize、max repeats resolve、history entry normalize、snapshot resolve 这类无 I/O、无网络、无进程副作用的纯 codec/helper；router state 的创建、清空、原地 patch 仍属于外层 block 壳，不进入 domain。

## 本批次范围
### 包含
- `DEFAULT_STOP_MESSAGE_MAX_REPEATS`
- stage mode 归一
- ai mode 归一
- max repeats 解析
- ai history entries 归一
- armed state 判断
- snapshot 归一
- Rust 单测

### 不包含
- `serializeStopMessageState`
- `deserializeStopMessageState`
- `createStopMessageState`
- `clearStopMessageState`
- router/servertool 的 state 原地 patch、snapshot 回写、native wrapper

## 需要保持的行为
1. stage mode 只允许 `on/off/auto`，其余值返回空。
2. ai mode 只允许 `on/off`，其余值返回空。
3. max repeats：
   - 输入为正数时，取 `floor(value)`。
   - 当值无效且 stage mode 为 `on/auto` 时，回落到 `DEFAULT_STOP_MESSAGE_MAX_REPEATS`。
   - 当 stage mode 为 `off` 或空时，返回 `0`。
4. snapshot 归一时：
   - `stopMessageText` 为空或 `maxRepeats <= 0` 时返回空。
   - `stageMode === off` 时返回空。
   - `aiMode` 缺失时默认 `on`。
5. history entries 只保留有限白名单字段，并做 trim / floor / slice(-8)。
6. armed state 判断只依赖 text + normalized stage mode + resolved max repeats，不引入 runtime 状态。
7. 输出保持纯函数语义，不引入 router/servertool/provider/host 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_stop_message_state.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
