# Phase 03 Pure Functions Batch 03

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第三批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L45 `behavior`：必须保持的行为。
- L47-L57 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批共享纯 helper 到 `rcc-core-domain`，这次选择 `tool-description-utils`，验证“跨 filters / hub 复用的共享描述函数，应该直接下沉 domain，而不是在各 block 重复复制”的闭环。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/tool-description-utils.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/tool_description.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：该切片只做字符串归一、工具别名判定、工具声明扫描、描述文本拼装，无网络、无文件、无 runtime 副作用，且已被 filters 与 hub remap 多处共享消费。

## 本批次范围
### 包含
- `normalizeToolName` 对应的 Rust 迁移。
- `isShellToolName` 对应的 Rust 迁移。
- `hasApplyPatchToolDeclared` 对应的 Rust 迁移。
- `buildShellDescription` 对应的 Rust 迁移。
- `appendApplyPatchReminder` 对应的 Rust 迁移。
- 必要的内部 helper：tool entry 名称提取。
- Rust 单测。

### 不包含
- `request-tools-normalize.ts` 过滤器本体迁移。
- hub remap / servertool 业务流程迁移。
- servertool 中本地重复的 normalize helper 收敛。
- tool schema 重写、tool governance、provider 语义迁移。

## 需要保持的行为
1. tool name 归一后必须 `trim + lowercase`。
2. shell-like alias 仍视为同一工具族：`shell / shell_command / exec_command / bash`。
3. 仅当 tools 数组中声明了 `apply_patch` 时，`hasApplyPatchToolDeclared` 才返回 true。
4. shell 描述文本必须稳定包含 workdir 约束；若声明了 `apply_patch`，还必须追加 apply_patch 提醒。
5. `appendApplyPatchReminder` 若原描述已包含 `apply_patch`，不得重复追加。
6. 输出保持纯函数语义，不注入 filters / hub / servertool 业务状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_tool_description.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
