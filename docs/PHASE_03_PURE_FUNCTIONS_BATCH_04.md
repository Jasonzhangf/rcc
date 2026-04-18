# Phase 03 Pure Functions Batch 04

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第四批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L34 `scope`：本批次迁移范围。
- L36-L46 `behavior`：必须保持的行为。
- L48-L58 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 apply-patch 纯 parser/coercion helper 到 `rcc-core-domain`，这次选择 structured payload coercion，验证“apply-patch 的输入归一纯逻辑可以先下沉 domain，而不把 patch 执行、fuzzy-match、validator 主流程一起带入”的闭环。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/apply-patch/structured/coercion.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/apply-patch/json/parse-loose.ts`（仅取 strict `tryParseJson`）
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/apply-patch/structured.ts`（仅取最小 `isStructuredApplyPatchPayload` guard）
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/apply_patch_structured.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：该切片只做 JSON 解析、字段别名归一、structured payload coercion，无网络、无文件、无 runtime 副作用，且属于 parser/coercion 真源。

## 本批次范围
### 包含
- `coerceStructuredPayload` 对应的 Rust 迁移。
- 最小 strict JSON parse helper。
- 最小 structured payload guard。
- top-level `file/path/filepath/filename/target` alias 解析。
- `instructions/changes/edits/operations/ops` 中 JSON string changes 的解包。
- single-change payload 构造。
- Rust 单测。

### 不包含
- `buildStructuredPatch` 执行与 patch 拼装。
- fuzzy-match、patch normalize、patch-text 相关逻辑。
- apply-patch validator 主流程。
- apply-patch block / orchestrator / host 改造。

## 需要保持的行为
1. 已经是 structured payload 时，若顶层存在可推断 file 且 payload 自身未设置 file，允许补入 top-level file。
2. 顶层 `target` 只有在 `changes` 数组存在且非空时，才可视作 file path。
3. `changes/instructions/edits/operations/ops` 中的 JSON string 若能 strict parse 出合法 changes，必须归一成 structured payload。
4. `changes` 为空数组时返回空结果，而不是伪造 payload。
5. single-change 形态必须保留 `kind/lines/target/anchor/use_anchor_indent/file` 等字段语义。
6. 不引入 patch 执行、副作用或 validator 业务状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_apply_patch_structured.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
