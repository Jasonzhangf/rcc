# Phase 03 Pure Functions Batch 27

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十七批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L34 `scope`：本批次迁移范围。
- L36-L48 `behavior`：必须保持的行为。
- L50-L60 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 servertool followup text sanitize pure helpers 到 `rcc-core-domain`，验证“servertool followup/ai-followup 编排壳继续留在外层，而 followup 文本清洗本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-sanitize.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/followup_sanitize.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 stop-message marker / time tag / image omitted 清洗与空白折叠这类无 I/O、无网络、无进程副作用的 followup 文本纯 helper；servertool followup build、auto continue、snapshot orchestration 壳继续留在外层。

## 本批次范围
### 包含
- `sanitizeFollowupText`
- `sanitizeFollowupSnapshotText`
- Rust 单测

### 不包含
- servertool engine
- stop-message auto orchestration
- ai-followup snapshot build
- tmux/fs/process/runtime 壳

## 需要保持的行为
1. `sanitize_followup_text` 对非字符串输入必须返回空字符串。
2. `sanitize_followup_text` 对空白字符串输入必须返回空字符串。
3. `sanitize_followup_text` 必须移除 stop-message marker：`<** ... **>`。
4. `sanitize_followup_text` 必须移除 `[Time/Date]: ...` 时间标签块。
5. `sanitize_followup_text` 必须移除 `[Image omitted]` 占位文本。
6. `sanitize_followup_text` 必须清理换行前后的多余空格，并把 3 个及以上连续换行折叠为 2 个。
7. `sanitize_followup_snapshot_text` 必须保持与 `sanitize_followup_text` 完全一致的语义。
8. 输出保持 pure helper 语义，不引入 servertool orchestration/runtime 壳。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_followup_sanitize.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
