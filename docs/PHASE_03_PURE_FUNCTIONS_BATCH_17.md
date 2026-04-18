# Phase 03 Pure Functions Batch 17

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十七批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L34 `scope`：本批次迁移范围。
- L36-L47 `behavior`：必须保持的行为。
- L49-L59 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router context-weighted pure helpers 到 `rcc-core-domain`，验证“context 加权配置归一、effective safe window 计算、context multiplier 纯数学逻辑可以先沉为共享纯函数，而 router 外层只保留 profile 解析与调度壳”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/context-weighted.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/context_weighted.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 context-weighted 配置归一、effective safe window 计算、context multiplier 计算这类无 I/O、无网络、无进程副作用的纯 helper；provider profile resolve、pool 调度、router 决策壳继续留在外层。

## 本批次范围
### 包含
- `DEFAULT_CONTEXT_WEIGHTED_CONFIG`
- `resolveContextWeightedConfig`
- `computeEffectiveSafeWindowTokens`
- `computeContextMultiplier`
- Rust 单测

### 不包含
- router pool 选择与 load-balancer 编排
- provider profile 解析
- request route 决策本体
- runtime / native / provider 依赖

## 需要保持的行为
1. `resolveContextWeightedConfig` 仍保持旧默认值：`enabled=false`、`clientCapTokens=200000`、`gamma=1`、`maxMultiplier=2`。
2. `clientCapTokens` 仅在正数且 finite 时生效，并保持 `Math.floor` 语义。
3. `gamma` 仅在正数且 finite 时生效；非法值回退默认值。
4. `maxMultiplier` 仅在 `>= 1` 且 finite 时生效；非法值回退默认值。
5. `computeEffectiveSafeWindowTokens` 保持旧公式：
   - `effectiveMax = min(modelMaxTokens, clientCapTokens)`
   - `reserve = ceil(effectiveMax * (1 - warnRatio))`
   - `slack = max(0, modelMaxTokens - clientCapTokens)`
   - `reserveEff = max(0, reserve - slack)`
   - `return max(1, effectiveMax - reserveEff)`
6. `warnRatio` 仅在 `(0,1)` 且 finite 时生效，否则回退 `0.9`。
7. `computeContextMultiplier` 保持旧规则：`ratio = ref / cur`，再对 `max(1, ratio)` 做 `pow(gamma)`，最后受 `maxMultiplier` 上限约束；输出不得低于 `1`。
8. 输出保持纯函数语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_context_weighted.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
