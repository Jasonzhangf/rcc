# Phase 03 Pure Functions Batch 25

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十五批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L34 `scope`：本批次迁移范围。
- L36-L48 `behavior`：必须保持的行为。
- L50-L60 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router routing-instructions parse 外围的 preprocess pure helpers 到 `rcc-core-domain`，验证“native parse(messages -> instructions) 壳继续留在外层，而 instruction array 上的 clear 截断与 clear flag 检测本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/parse.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/routing_instruction_preprocess.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 instruction array 上的 clear 截断、clear flag 检测、stopMessageClear flag 检测这类无 I/O、无网络、无进程副作用的纯 helper；messages -> instructions 的 native parse 壳继续留在 router 外层。

## 本批次范围
### 包含
- clear 之后切片
- clear flag 检测
- stopMessageClear flag 检测
- Rust 单测

### 不包含
- `parseRoutingInstructionsWithNative`
- messages 输入壳
- router/runtime/provider/host/servertool 依赖

## 需要保持的行为
1. 输入 instruction 列表为空时，preprocess 返回空列表。
2. 若列表中不存在 `type === "clear"`，preprocess 必须返回原列表副本。
3. 若存在 `clear`，preprocess 必须从第一个 `clear` 之后开始保留。
4. `has_clear_instruction` 只在至少一个 instruction 的 `type` 为 `clear` 时返回 `true`。
5. `has_stop_message_clear_instruction` 只在至少一个 instruction 的 `type` 为 `stopMessageClear` 时返回 `true`。
6. 输出保持纯 instruction-array helper 语义，不引入 native parse/messages/router 壳。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_routing_instruction_preprocess.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
