# Phase 03 Pure Functions Batch 08

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第八批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L32 `scope`：本批次迁移范围。
- L34-L43 `behavior`：必须保持的行为。
- L45-L55 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 apply-patch text recognizer pure helper 到 `rcc-core-domain`，验证“庞大的 patch normalize/validator 流程可以先不动，只把最前置的 patch 文本识别 guard 下沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/apply-patch/patch-text/looks-like-patch.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/conversion/shared/tool-governor-guards.ts`（仅最小 `isApplyPatchPayloadCandidate` 语义）
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/apply_patch_text.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 apply-patch 文本识别与 candidate 判定等无 I/O、无网络、无进程副作用的 patch-text guard，适合作为共享真源沉到 domain。

## 本批次范围
### 包含
- patch 文本识别：internal patch / GNU unified diff / hunk header 检测。
- apply_patch payload candidate 判定。
- Rust 单测。

### 不包含
- patch normalize 主流程。
- apply-patch validator 主逻辑。
- args-normalizer。
- tool-governor rewrite / blocked args / notice 注入壳。

## 需要保持的行为
1. `looksLikePatch` 对空输入或全空白输入返回 false。
2. `looksLikePatch` 必须识别以下 patch 信号：
   - `*** Begin Patch`
   - `*** Update/Add/Create/Delete File:`
   - `diff --git`
   - `@@` / `+++ ` / `--- `
3. `isApplyPatchPayloadCandidate` 只接受非空字符串。
4. `isApplyPatchPayloadCandidate` 只接受 trim 后以以下前缀开头的文本：
   - `*** Begin Patch`
   - `*** Update File:`
   - `*** Add File:`
   - `*** Delete File:`
   - `--- a/`
   - `--- `
5. 输出保持纯函数语义，不引入 validator/runtime/tool-governor 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_apply_patch_text.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
