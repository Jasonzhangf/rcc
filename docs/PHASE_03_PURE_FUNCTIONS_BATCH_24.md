# Phase 03 Pure Functions Batch 24

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十四批迁移真源。
- L10-L21 `source-target`：旧仓来源与新仓目标。
- L23-L36 `scope`：本批次迁移范围。
- L38-L52 `behavior`：必须保持的行为。
- L54-L64 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router pre-command parser 的 directive classify pure helper 到 `rcc-core-domain`，验证“依赖 env/default script/file resolver 的装配壳继续留在 router，而 `precommand` 指令前缀识别、token normalize 与 default/clear/explicit 分类本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-parser.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/pre_command_directive.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 `precommand` 前缀识别、body token 读取、trim normalize、`clear/off/none/on` 分类与 explicit token 提取这类无 I/O、无网络、无进程副作用的纯 parser helper；default script env resolve、path normalize、RoutingInstruction 组装继续留在外层。

## 本批次范围
### 包含
- `precommand` / `precommand:` 前缀识别
- body token 读取（复用 batch23 helper）
- `default` / `clear` / `explicit` 指令分类
- Rust 单测

### 不包含
- `resolveDefaultScriptRef`
- `resolvePreCommandScriptPath`
- `RoutingInstruction` 组装
- router/runtime/provider/host/servertool 依赖

## 需要保持的行为
1. 输入经 `trim()` 后为空时返回 `None`。
2. 输入仅为 `precommand`（大小写不敏感）时，必须归类为 default 指令。
3. 若不匹配 `precommand\s*:` 前缀，则返回 `None`。
4. `precommand:` 后 body 为空时返回 `None`。
5. body token 需复用 batch23 的 token reader；token 为空时返回 `None`。
6. `clear/off/none`（大小写不敏感）必须归类为 clear；`on` 必须归类为 default；其他值归类为 explicit(token)。
7. 输出保持纯 parser helper 语义，不引入 env/default-script/file-resolver。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_pre_command_directive.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
