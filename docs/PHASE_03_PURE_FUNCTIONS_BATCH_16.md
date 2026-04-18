# Phase 03 Pure Functions Batch 16

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十六批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L36 `scope`：本批次迁移范围。
- L38-L52 `behavior`：必须保持的行为。
- L54-L64 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router tool signal pure helpers 到 `rcc-core-domain`，验证“tool 声明检测、tool_call 分类、shell-like command 读写搜索判定可以先沉为共享纯函数，而 routing feature 聚合壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/tool-signals.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/tool_signals.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 tool name/description 提取、web/coding/vision tool 检测、meaningful tool names 提取、assistant tool_call 分类与 shell-like command 分类等无 I/O、无网络、无进程副作用的纯 helper；`features.ts` 中的 request feature 聚合与 metadata 壳继续留在 router 外层。

## 本批次范围
### 包含
- `detectVisionTool`
- `detectCodingTool`
- `detectWebTool`
- `detectWebSearchToolDeclared`
- `extractMeaningfulDeclaredToolNames`
- `chooseHigherPriorityToolCategory`
- `detectLastAssistantToolCategory`
- `classifyToolCallForReport`
- shell-like command 分类辅助函数
- Rust 单测

### 不包含
- `features.ts` 聚合逻辑
- token estimator / antigravity / metadata 壳
- request route 决策本体

## 需要保持的行为
1. vision/coding/web tool 检测仍基于 tool name/description 的字符串规则，不引入外部 schema。
2. `detectWebSearchToolDeclared` 只把 `web_search/web-search/websearch` 这类规范名识别为显式 web_search 声明。
3. `extractMeaningfulDeclaredToolNames` 只返回有 canonical name 的原始 tool name。
4. tool category 优先级保持：
   - `websearch > write > search > read > other`
5. shell-like command 分类保持旧规则：
   - heredoc 直接视为 `write`
   - `sed -i`、`perl -pi`、重定向写入等视为 `write`
   - `cat/head/tail/...` 视为 `read`
   - `rg/grep/find/git grep/bd search/...` 视为 `search`
6. `detectLastAssistantToolCategory` 必须从后往前扫描最后一个存在 tool_calls 的 assistant message。
7. 输出保持纯函数语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_tool_signals.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
