# Phase 03 Pure Functions Batch 29

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十九批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L34 `scope`：本批次迁移范围。
- L36-L50 `behavior`：必须保持的行为。
- L52-L62 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 servertool followup request builder 内的 tool output compacting pure helpers 到 `rcc-core-domain`，验证“followup payload build / ops orchestration 壳继续留在外层，而 tool content compact value / tool-message compact 本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/followup_tool_compact.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 tool content stringification、长度压缩与 tool-role message content rewrite 这类无 I/O、无网络、无进程副作用的纯 helper；followup payload build、ops orchestration、system/vision injection 壳继续留在外层。

## 本批次范围
### 包含
- `compactToolContentValue`
- `compactToolContentInMessages`
- Rust 单测

### 不包含
- followup payload build
- ops orchestration
- system / vision injection
- tool append / request assemble 壳

## 需要保持的行为
1. `compact_tool_content_value` 若文本长度未超过 `maxChars`，必须返回原文本。
2. `compact_tool_content_value` 对非字符串输入必须先转为 JSON 字符串语义后再做压缩。
3. `compact_tool_content_value` 超长时必须保留 head/tail，并插入 `...[tool_output_compacted omitted=N]...` 标记。
4. `compact_tool_content_value` 的 `keepHead` 必须为 `max(24, floor(maxChars * 0.45))`。
5. `compact_tool_content_value` 的 `keepTail` 必须为 `max(24, floor(maxChars * 0.35))`。
6. `compact_tool_content_in_messages` 必须只改写 `role === "tool"` 的消息内容。
7. `compact_tool_content_in_messages` 对 `maxChars` 非法值必须回退到 `1200`；对过小值必须抬到至少 `64`。
8. 输出保持 pure helper 语义，不引入 servertool orchestration/runtime 壳。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_followup_tool_compact.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
