# Phase 03 Pure Functions Batch 11

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十一批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L47 `behavior`：必须保持的行为。
- L49-L59 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 blocked-report parser pure helper 到 `rcc-core-domain`，验证“stop-message-auto 文件里的建单/bd/fs/spawn 壳可以留在外层，而消息文本提取与 blocked JSON 报告解析可以先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/stop-message-auto/blocked-report.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/blocked_report.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留消息文本提取、JSON code block/object 提取、blocked report normalize 等无 I/O、无网络、无进程副作用的解析逻辑，适合作为共享真源沉到 domain。

## 本批次范围
### 包含
- 从 messages 提取候选文本。
- 从内容块中提取文本。
- 从文本中提取 blocked JSON 报告。
- blocked report normalize / evidence normalize。
- Rust 单测。

### 不包含
- bd issue 创建。
- working directory 解析。
- issue title / description / acceptance 构造。
- fs / path / child_process 壳。

## 需要保持的行为
1. `extract_blocked_report_from_messages` 只扫描尾部有限条消息。
2. 文本提取需支持：
   - message.content
   - message.input
   - message.output
   - message.arguments
3. 内容块提取需支持：
   - string 项
   - `{ type: text|output_text|input_text, text }`
   - fallback `content/value/input/arguments/args/patch/payload`
4. blocked report 解析需支持：
   - 原始 JSON 文本
   - ```json code block
   - 文本中的平衡 JSON object
5. normalize 后的 report 必须要求：
   - `type=blocked`
   - 存在 `summary`
   - 存在 `blocker`
6. 输出保持纯函数语义，不引入 bd/fs/process 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_blocked_report.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
