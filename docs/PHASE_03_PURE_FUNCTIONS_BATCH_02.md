# Phase 03 Pure Functions Batch 02

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第二批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L46 `behavior`：必须保持的行为。
- L48-L58 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批纯函数逻辑到 `rcc-core-domain`，这次选择 `exec-command` 的参数归一切片，验证“共享纯 helper + 单一职责 module + Rust 单测收口”的闭环。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/exec-command/normalize.ts`
  - `../routecodex/sharedmodule/llmswitch-core/src/conversion/shared/tooling.ts`（仅取最小 `repairFindMeta` 纯语义）
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/exec_command_normalize.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：该切片只做参数形状修复、字段别名归一、`find` 命令 meta 修复，无网络、无文件、无 runtime 副作用。

## 本批次范围
### 包含
- `normalizeExecCommandArgs` 对应的 Rust 迁移。
- compat / canonical 两种 schema mode。
- `cmd/command/toon/script` 命令候选解析与数组 join。
- `workdir/cwd/workDir`、`timeout_ms/timeoutMs`、`sandbox_permissions/with_escalated_permissions`、`max_output_tokens/max_tokens`、`yield_time_ms/yield_ms/wait_ms` 等别名归一。
- 最小 `repairFindMeta` 纯 helper（只保留 `find -exec ... ;` 与括号转义语义）。
- Rust 单测。

### 不包含
- `validator.ts` 的 policy / fs / os / path 逻辑。
- tool governor、provider、host、orchestrator 改造。
- `packShellArgs`、`splitCommandString` 等其它 shell helper。
- 非 `exec-command normalize` 的其它工具函数。

## 需要保持的行为
1. compat 模式允许解包 `input` / `arguments` 嵌套参数对象。
2. canonical 模式只接受 canonical 字段，不读取别名与嵌套包装。
3. 找不到有效 `cmd` 时返回 `missing_cmd`，同时返回去掉 `toon` 后的原始 normalized base。
4. `cmd` 结果必须经过 `repairFindMeta` 修复。
5. 兼容字段别名必须归一为 canonical 输出字段。
6. 输出只保留归一后的必要字段，不复制无关业务语义。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_exec_command_normalize.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
