# Phase 03 Pure Functions Batch 26

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十六批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L34 `scope`：本批次迁移范围。
- L36-L48 `behavior`：必须保持的行为。
- L50-L60 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 conversion/shared reasoning normalizer 外围的 pure helpers 到 `rcc-core-domain`，验证“native payload normalize 壳继续留在外层，而 reasoning markup 递归探测与 transport-noise strip 本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/conversion/shared/reasoning-normalizer.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/reasoning_markup.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 reasoning markup 递归探测与 reasoning transport-noise strip 这类无 I/O、无网络、无进程副作用的纯 helper；chat/responses/gemini/anthropic/openai 的 native normalize 壳继续留在 conversion/router 外层。

## 本批次范围
### 包含
- `valueMayContainReasoningMarkup`
- `stripReasoningTransportNoise`
- Rust 单测

### 不包含
- `normalizeReasoningInChatPayload`
- `normalizeReasoningInResponsesPayload`
- `normalizeReasoningInGeminiPayload`
- `normalizeReasoningInAnthropicPayload`
- `normalizeReasoningInOpenAIPayload`
- native binding / payload patch / conversion pipeline 壳

## 需要保持的行为
1. `valueMayContainReasoningMarkup` 对字符串必须大小写不敏感地检测 reasoning marker。
2. `valueMayContainReasoningMarkup` 对数组与对象必须递归扫描；任一子值命中即返回 `true`。
3. `valueMayContainReasoningMarkup` 对 `null`、布尔、数字、空对象、无 marker 文本必须返回 `false`。
4. `stripReasoningTransportNoise` 必须移除以 `[Time/Date]:` 开头的 transport noise 行。
5. `stripReasoningTransportNoise` 必须移除首尾 `[thinking]...[/thinking]` 或 `[思考]...[/思考]` wrapper。
6. `stripReasoningTransportNoise` 必须把连续三个及以上换行折叠为两个换行，并最终 `trim()`。
7. 输出保持 pure helper 语义，不引入 native normalize/payload mutation/conversion pipeline 壳。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_reasoning_markup.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
