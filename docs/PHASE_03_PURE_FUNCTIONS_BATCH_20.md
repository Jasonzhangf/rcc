# Phase 03 Pure Functions Batch 20

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十批迁移真源。
- L10-L19 `source-target`：旧仓来源与新仓目标。
- L21-L35 `scope`：本批次迁移范围。
- L37-L48 `behavior`：必须保持的行为。
- L50-L60 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router pre-command state codec pure helpers 到 `rcc-core-domain`，验证“字段级 trim + finite timestamp 的状态编解码可以先沉为共享纯函数，而 parser/action/store 壳继续留在 router 外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-state-codec.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/types.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/pre_command_state.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 `preCommandSource` / `preCommandScriptPath` / `preCommandUpdatedAt` 的字段级 trim、finite number guard、状态 merge 这类无 I/O、无网络、无进程副作用的纯 codec；pre-command parser、default script resolve、action/store patch 与 router 编排继续留在外层。

## 本批次范围
### 包含
- `serializePreCommandState` 对应的序列化语义
- `deserializePreCommandState` 对应的反序列化语义
- `preCommandSource` trim + 非空判断
- `preCommandScriptPath` trim + 非空判断
- `preCommandUpdatedAt` finite number 判断
- Rust 单测

### 不包含
- pre-command parser
- default script resolve
- `applyPreCommandInstruction` / clear action
- routing-state store / snapshot patch
- runtime/provider/host/servertool 依赖

## 需要保持的行为
1. `serialize` 只输出三类字段：trim 后非空的 `preCommandSource`、trim 后非空的 `preCommandScriptPath`、finite 的 `preCommandUpdatedAt`。
2. 空字符串、全空白字符串、非字符串值，都不能被写入序列化结果。
3. `preCommandUpdatedAt` 只要是 finite number 就保留；不额外 round、floor、clamp，也不限制正负。
4. `deserialize` 仅在输入字段有效时才覆盖目标 state；无效字段不得清空已有 state。
5. `deserialize` 对字符串字段必须先 trim，再决定是否写入。
6. 输出保持纯函数/纯 codec 语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_pre_command_state.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
