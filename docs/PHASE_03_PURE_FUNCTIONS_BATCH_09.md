# Phase 03 Pure Functions Batch 09

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第九批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L32 `scope`：本批次迁移范围。
- L34-L45 `behavior`：必须保持的行为。
- L47-L57 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 stop gateway signal detector pure helper 到 `rcc-core-domain`，验证“servertool 文件里的 runtime metadata attach/read 壳可以留在外层，而 stop signal inspect 本体可以先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/stop-gateway-context.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/stop_gateway.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 stop finish_reason / responses status / tool-like output / embedded marker 等纯协议判定逻辑，无 I/O、无网络、无进程副作用，适合作为共享真源沉到 domain。

## 本批次范围
### 包含
- embedded tool marker 检测。
- chat/responses stop gateway signal 判定。
- tool-like output 检测。
- 最小 eligibility helper。
- Rust 单测。

### 不包含
- runtime metadata attach/read。
- adapterContext bridge。
- servertool followup 编排。
- 非 stop gateway 的其它 servertool 状态逻辑。

## 需要保持的行为
1. 非对象 payload 返回：
   - `observed=false`
   - `eligible=false`
   - `source=none`
   - `reason=invalid_payload`
2. chat payload 中：
   - 只处理 `finish_reason=stop|length`
   - 若 message 含 embedded tool markers，则 `eligible=false`
   - 若已有 `tool_calls`，则 `eligible=false`
   - 否则 `eligible=true`
3. responses payload 中：
   - 若 `status` 存在且不是 `completed`，返回 `observed=false`
   - 若 `output` 中含 tool-like output，返回 `eligible=false`
   - 若存在 `required_action`，返回 `eligible=false`
   - 否则 completed/no-status-completed 输出返回 `eligible=true`
4. `hasToolLikeOutput` 需识别：
   - `tool_call`
   - `tool_use`
   - `function_call`
   - 任意包含 `tool` 的 type
5. 输出保持纯函数语义，不引入 metadata/runtime/servertool 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_stop_gateway.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
