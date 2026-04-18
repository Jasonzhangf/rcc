# Phase 03 Pure Functions Batch 15

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十五批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L35 `scope`：本批次迁移范围。
- L37-L50 `behavior`：必须保持的行为。
- L52-L62 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 shared message-content text extractor pure helpers 到 `rcc-core-domain`，验证“`blocked-report.ts` 中被 `ai-followup.ts` 复用的 content/unknown text 提取 helper 可以单独沉为共享真源，而 blocked report parser 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/stop-message-auto/blocked-report.ts`
  - 复用信号：
    - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/stop-message-auto/ai-followup.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/message_content_text.rs`
  - `rust/crates/rcc-core-domain/src/blocked_report.rs`（改为复用共享 helper）
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 message content text 提取、captured message text 提取、unknown text 递归抽取与去重 join 这类无 I/O、无网络、无进程副作用的纯 helper；blocked report JSON parser 与 followup snapshot 业务语义继续留在各自外层模块。

## 本批次范围
### 包含
- `extract_text_from_message_content`
- `extract_captured_message_text`
- 最小 unknown text 递归抽取 helper
- 最小 dedupe/join helper
- Rust 单测

### 不包含
- blocked report JSON parser
- ai followup snapshot/sanitize
- bd/fs/path/spawn/system 壳

## 需要保持的行为
1. `extract_text_from_message_content`：
   - string content 直接 trim 返回；
   - array content 支持 string item；
   - object item 支持 `type=text/output_text/input_text/空 type` 时优先读 `text`；
   - 否则按 `content/value/input/arguments/args/patch/payload` 回退。
2. `extract_unknown_text`：
   - 递归深度上限为 `4`；
   - string/number/bool 可转文本；
   - object 按既定 priority keys 顺序递归；
   - array/object 最终都要去重并按 `\n` join。
3. `extract_captured_message_text`：
   - string message 直接 trim；
   - object message 依次尝试 `content/input/output/arguments`。
4. 输出保持纯函数语义，不引入 servertool/router/provider/host 依赖。
5. `blocked_report.rs` 必须改为复用共享 helper，不再自带重复实现。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_message_content_text.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
