# Phase 03 Pure Functions Batch 05

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第五批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L45 `behavior`：必须保持的行为。
- L47-L57 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批协议归一 pure helper 到 `rcc-core-domain`，这次选择 tool request/response invariants，验证“filter 里的协议归一规则可以先沉成共享纯函数，外层 filter 只保留薄壳编排”的闭环。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/filters/special/request-tool-choice-policy.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/filters/special/response-finish-invariants.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/tool_protocol_invariants.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：该切片只做 JSON payload shape normalize，无网络、无文件、无 runtime 副作用，且属于 request/response protocol invariant 的共享真源。

## 本批次范围
### 包含
- request tool_choice policy 归一。
- response finish_reason/content invariants 归一。
- Rust 单测。

### 不包含
- filter class 壳迁移。
- filter pipeline 注册。
- provider / host / block 编排接线。
- 非 tool protocol invariants 的其它 filter。

## 需要保持的行为
1. request 中若 `tools` 存在且非空，并且 `tool_choice` 缺失或为 null，则归一为 `auto`。
2. request 中若 `tools` 为空，则删除 `tool_choice`。
3. response 中若存在 `message.tool_calls` 且非空，缺失的 `finish_reason` 归一为 `tool_calls`。
4. response 中若存在 `message.tool_calls` 且非空，`message.content` 归一为 `null`。
5. 若 `finish_reason` 已有值，不覆盖已有值。
6. 输出保持纯函数语义，不引入 filter/pipeline/runtime 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_tool_protocol_invariants.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
