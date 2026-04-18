# Phase 03 Pure Functions Batch 28

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十八批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L34 `scope`：本批次迁移范围。
- L36-L50 `behavior`：必须保持的行为。
- L52-L62 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 servertool followup request builder 内的 pure helpers 到 `rcc-core-domain`，验证“captured seed rebuild / responses bridge / servertool injection 编排壳继续留在外层，而 followup model resolve、top-level parameter extract、parameter normalize、tool filter 本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/followup_request_utils.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 request seed helper 中的 model fallback resolve、Responses top-level parameter extract、followup parameter normalize、tool filter 这类无 I/O、无网络、无进程副作用的纯 helper；captured seed rebuild、responses/chat bridge、vision/system injection、tool message compaction 与 servertool orchestration 壳继续留在外层。

## 本批次范围
### 包含
- `resolveFollowupModel`
- `extractResponsesTopLevelParameters`
- `normalizeFollowupParameters`
- `dropToolByFunctionName`
- Rust 单测

### 不包含
- `extractCapturedChatSeed`
- responses/chat bridge rebuild
- tool output message build
- vision/system injection
- servertool orchestration/runtime 壳

## 需要保持的行为
1. `resolve_followup_model` 在 `adapterContext` 非对象时，必须只回退到 trimmed `seedModel`。
2. `resolve_followup_model` 在 `adapterContext` 为对象时，必须按 `assignedModelId -> modelId -> seedModel -> model -> originalModelId` 顺序取第一个非空字符串。
3. `extract_responses_top_level_parameters` 只允许提取白名单字段。
4. 当 `max_output_tokens` 缺失但 `max_tokens` 存在时，`extract_responses_top_level_parameters` 必须补一份 `max_output_tokens = max_tokens`。
5. `normalize_followup_parameters` 对非对象输入必须返回 `None`。
6. `normalize_followup_parameters` 必须删除 `stream` 与 `tool_choice`，保留其他字段；若删除后为空则返回 `None`。
7. `drop_tool_by_function_name` 对空白 `dropName` 必须返回原 tools 副本。
8. `drop_tool_by_function_name` 必须删除 `function.name === dropName` 的 tool；缺失 `function.name` 的条目必须保留；非对象条目必须丢弃。
9. 输出保持 pure helper 语义，不引入 servertool bridge/orchestration/runtime 壳。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_followup_request_utils.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
