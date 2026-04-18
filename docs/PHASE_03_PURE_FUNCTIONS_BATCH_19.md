# Phase 03 Pure Functions Batch 19

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十九批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L35 `scope`：本批次迁移范围。
- L37-L51 `behavior`：必须保持的行为。
- L53-L63 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router context-advisor pure helpers 到 `rcc-core-domain`，验证“context routing 配置归一、provider context limit fallback、safe/risky/overflow 分类逻辑可以先沉为共享纯函数，而 router 外层只保留 profile lookup 与 route 编排壳”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/context-advisor.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/context_advisor.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 warn ratio/hard limit 配置归一、provider context limit fallback、safe/risky/overflow 分类与 usage snapshot 计算这类无 I/O、无网络、无进程副作用的纯 helper；provider profile lookup、异常捕获壳与 router route 决策继续留在外层。

## 本批次范围
### 包含
- `DEFAULT_WARN_RATIO`
- `DEFAULT_MODEL_CONTEXT_TOKENS`
- `configure` 对应的配置归一语义
- `classify` 对应的分类语义
- usage snapshot 结构
- Rust 单测

### 不包含
- `ContextAdvisor` class 壳本身
- provider profile lookup callback
- router route 决策
- runtime/provider/host/servertool 依赖

## 需要保持的行为
1. `warnRatio` 默认值保持 `0.9`，并沿用 `clampWarnRatio`：非法值回退 `0.9`，有效值 clamp 到 `[0.1, 0.99]`。
2. `hardLimit` 只保留布尔配置归一，不把额外 route 语义带入 domain。
3. `estimatedTokens` 仅在 finite 且 `> 0` 时生效；否则归一为 `0`。
4. provider limit 缺失、非 finite、或 `<= 0` 时，必须回退 `DEFAULT_MODEL_CONTEXT_TOKENS=200000`。
5. ratio 计算保持旧规则：`ratio = normalizedTokens / limit`；当 `limit <= 0` 时 ratio 视为 `0`。
6. 分类规则保持：
   - `normalizedTokens === 0` 或 `ratio < warnRatio` → `safe`
   - `ratio < 1` → `risky`
   - 否则 → `overflow`
7. `allOverflow` 仅在 `safe` 与 `risky` 都为空且 `overflow` 非空时为 `true`。
8. 输出保持纯函数语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_context_advisor.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
