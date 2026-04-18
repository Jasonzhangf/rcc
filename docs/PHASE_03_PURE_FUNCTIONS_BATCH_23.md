# Phase 03 Pure Functions Batch 23

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二十三批迁移真源。
- L10-L20 `source-target`：旧仓来源与新仓目标。
- L22-L35 `scope`：本批次迁移范围。
- L37-L49 `behavior`：必须保持的行为。
- L51-L61 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router pre-command parser 的最小 token reader pure helper 到 `rcc-core-domain`，验证“依赖 env/default script/file resolver 的 parser 外层可以继续留在 router，而 quoted token reader 本体先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-parser.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/pre_command_token.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 body token read、quoted token closing-quote scan、escape unescape 与 comma-split 这类无 I/O、无网络、无进程副作用的纯 parser helper；default script resolve、path normalize、router instruction 生成继续留在外层。

## 本批次范围
### 包含
- `readPreCommandToken` 对应语义
- quoted closing-quote scan
- escaped quote unescape
- unquoted comma split
- Rust 单测

### 不包含
- `parsePreCommandInstruction`
- `resolveDefaultScriptRef`
- `resolvePreCommandScriptPath`
- router/runtime/provider/host/servertool 依赖

## 需要保持的行为
1. 空 body 返回 `None`。
2. 若首字符是单引号或双引号，必须找到对应未转义 closing quote；未找到则返回 `None`。
3. quoted token 返回首尾引号内的内容，并执行旧语义的 `\" -> "` 与 `\' -> '` 替换。
4. unquoted body 若存在逗号，只取第一个逗号前的部分并 `trim()`。
5. unquoted body 若不存在逗号，则返回整体 `trim()` 结果。
6. 输出保持纯 parser helper 语义，不引入 env/default-script/file-resolver。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_pre_command_token.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
