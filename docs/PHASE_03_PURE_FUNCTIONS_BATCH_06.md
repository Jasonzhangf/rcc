# Phase 03 Pure Functions Batch 06

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第六批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L44 `behavior`：必须保持的行为。
- L46-L56 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 tool-registry 共享 pure helper 到 `rcc-core-domain`，验证“一个混合 validator/dispatch 的注册表文件里，也可以只抽共享 guard 真源下沉 domain，而把总开关和外部校验壳继续留在 block/adapter 层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/tools/tool-registry.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/tool_registry_guards.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 tool registry 里无 I/O、无网络、无进程副作用的共享 guard/helper，适合作为 registry policy 真源沉到 domain。

## 本批次范围
### 包含
- allowed tool names 真源。
- tool name allowlist 判定。
- forbidden write redirection / heredoc / in-place edit / tee 检测。
- image path 扩展名检测。
- Rust 单测。

### 不包含
- `validateToolCall` 总 switch。
- `parseToolArgsJson`、`validateExecCommandArgs`、`validateApplyPatchArgs` 等外部 validator 调度。
- shell / update_plan / MCP payload normalize 壳。
- provider / host / block 编排接线。

## 需要保持的行为
1. allowed tool names 必须保持与旧仓 `getAllowedToolNames()` 一致。
2. 对 shell script 的 forbidden write 检测必须覆盖：
   - `>` / `>>` 重定向写入
   - `<<` / `<<<` heredoc / here-string
   - `sed -i`
   - `ed -s`
   - `tee`
3. forbidden write 检测需大小写不敏感。
4. image path 检测只接受非空字符串路径，扩展名集合必须覆盖 `png/jpg/jpeg/gif/webp/bmp/svg/tif/tiff/ico/heic/jxl`。
5. 输出保持纯函数语义，不引入 registry validator/runtime 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_tool_registry_guards.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
