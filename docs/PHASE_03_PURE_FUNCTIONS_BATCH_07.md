# Phase 03 Pure Functions Batch 07

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第七批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L45 `behavior`：必须保持的行为。
- L47-L57 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 MCP resource discovery pure helper 到 `rcc-core-domain`，验证“filter 文件里的日志/env/tool 注入壳可以留在外层，而协议 shape 提取与空结果判定可以先沉为共享纯函数”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/filters/special/request-tool-list-filter.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/mcp_resource_discovery.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 MCP resource response shape 提取与空列表检测等无 I/O、无网络、无进程副作用的协议 helper，适合作为共享真源沉到 domain。

## 本批次范围
### 包含
- 从 MCP output 中提取 server labels。
- 从 tool messages 中汇总 MCP server labels。
- 检测 list_mcp_resources 空结果或 resources/list unsupported 信号。
- Rust 单测。

### 不包含
- 非阻塞日志与 error format。
- `process.env` 配置读取。
- tool schema 构造与 description 拼接。
- `ensureFunctionTool` / `removeToolByName`。
- `RequestToolListFilter.apply` 主流程与 block 编排。

## 需要保持的行为
1. output 为数组时：
   - string 项直接作为 server label 候选；
   - object 项读取 `server`。
2. output 为对象时：
   - 读取 `servers[]`
   - 读取 `resources[].server` 与 `resources[].source.server`
   - 读取 `resourceTemplates[].server` 与 `resourceTemplates[].source.server`
3. 只接受非空字符串 server label，并保持出现顺序。
4. `collectServersFromMessages` 只信任 role=`tool` 的消息。
5. `collectServersFromMessages` 优先识别 `rcc.tool.v1` envelope 中 `tool.name=list_mcp_resources` 的 `result.output`。
6. `detectEmptyMcpListFromMessages` 需要识别：
   - 纯文本中的 `-32601` 或 `method not found`
   - envelope/raw payload 中空 `resources` / 空 `servers`
   - `error.code=-32601` 或 `error.message` 含 `method not found`
7. 输出保持纯函数语义，不引入 env/log/filter/runtime 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_mcp_resource_discovery.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
