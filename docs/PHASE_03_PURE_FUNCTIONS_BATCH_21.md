# Phase 03 Pure Functions Batch 21

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十一批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L34 `scope`：本批次迁移范围。
- L36-L47 `behavior`：必须保持的行为。
- L49-L59 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router routing-instruction message clean pure helpers 到 `rcc-core-domain`，验证“消息级 marker clean 与 code-segment strip 可以先沉为共享纯函数，而 routing parse/native semantics 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/clean.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/types.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/routing_instruction_clean.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 fenced/inline code strip、user string message marker clean、empty-after-clean user message filter 这类无 I/O、无网络、无进程副作用的纯 helper；routing parse、native semantics、instruction extract 与 router 编排继续留在外层。

## 本批次范围
### 包含
- `stripCodeSegments` 对应的纯文本清洗语义
- `cleanMessagesFromRoutingInstructions` 对应的消息清洗语义
- routing instruction marker global pattern 对应的匹配语义
- Rust 单测

### 不包含
- `parseRoutingInstructions`
- native routing semantics
- clear/stopMessage instruction extract
- router/runtime/provider/host/servertool 依赖

## 需要保持的行为
1. `stripCodeSegments` 在空字符串输入时返回空字符串。
2. `stripCodeSegments` 必须移除 fenced code block：```...``` 与 `~~~...~~~`，并把命中片段替换为空格。
3. `stripCodeSegments` 必须移除 inline code `` `...` ``，并把命中片段替换为空格。
4. `cleanMessagesFromRoutingInstructions` 只处理 `role === 'user'` 且 `content` 为字符串的消息；其他消息保持原样。
5. user string message 的 `content` 必须按 routing marker pattern 全局清除，再 `trim()`。
6. user string message 若清洗后为空，必须从结果中移除；其他消息不得因此被误删。
7. 输出保持纯函数语义，不引入 routing parse/native/provider/runtime 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_routing_instruction_clean.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
