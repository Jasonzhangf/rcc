# Phase 03 Pure Functions Batch 18

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十八批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L34 `scope`：本批次迁移范围。
- L36-L49 `behavior`：必须保持的行为。
- L51-L61 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router health-weighted pure helpers 到 `rcc-core-domain`，验证“health 加权配置归一、time-decayed error multiplier、最终 weight 计算可以先沉为共享纯函数，而 router 外层只保留 quota view 收集、pool 选择与 retry 编排壳”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/health-weighted.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/health_weighted.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 health-weighted 配置归一、health multiplier 计算、health weight 计算这类无 I/O、无网络、无进程副作用的纯 helper；quota view 获取、router pool 排序、retry 偏好与调度壳继续留在外层。

## 本批次范围
### 包含
- `DEFAULT_HEALTH_WEIGHTED_CONFIG`
- `resolveHealthWeightedConfig`
- `computeHealthMultiplier`
- `computeHealthWeight`
- Rust 单测

### 不包含
- quota view 构造
- router pool 选择与 retry 编排
- provider runtime / transport / auth
- request route 决策本体

## 需要保持的行为
1. `resolveHealthWeightedConfig` 仍保持旧默认值：`enabled=false`、`baseWeight=100`、`minMultiplier=0.5`、`beta=0.1`、`halfLifeMs=600000`、`recoverToBestOnRetry=true`。
2. `baseWeight` 仅在正数且 finite 时生效，并保持 `Math.floor` 语义。
3. `minMultiplier` 仅在正数且 finite 时生效，并保持 `Math.min(1, raw)` 语义；不额外抬高到默认下限。
4. `beta` 仅在 `>= 0` 且 finite 时生效；非法值回退默认值。
5. `halfLifeMs` 仅在正数且 finite 时生效，并保持 `Math.floor` 语义。
6. `recoverToBestOnRetry` 保持 nullish-coalescing 语义：只有 `null/undefined` 时回退默认值。
7. `computeHealthMultiplier` 保持旧规则：
   - `entry` 为空时直接返回 `1`
   - `lastErrorAtMs` 非 finite 时视为 `null`
   - `consecutiveErrorCount` 仅在正数且 finite 时生效，并保持 `Math.floor` 语义
   - 若 `!lastErrorAtMs` 或 `consecutiveErrorCount <= 0`，直接返回 `1`
   - `elapsedMs = max(0, nowMs - lastErrorAtMs)`
   - `decay = exp((-ln(2) * elapsedMs) / halfLifeMs)`
   - `effectiveErrors = consecutiveErrorCount * decay`
   - `raw = 1 - beta * effectiveErrors`
   - 输出为 `max(minMultiplier, min(1, raw))`
8. `computeHealthWeight` 保持旧规则：`weight = max(1, round(baseWeight * multiplier))`。
9. 输出保持纯函数语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_health_weighted.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
