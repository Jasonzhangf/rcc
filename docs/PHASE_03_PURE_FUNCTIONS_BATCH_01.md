# Phase 03 Pure Functions Batch 01

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第一批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L29 `scope`：本批次迁移范围。
- L31-L43 `behavior`：必须保持的行为。
- L45-L53 `tests`：测试与验收。

## 目标
从旧 `routecodex` 迁移第一批纯函数逻辑到 `rcc-core-domain`，选择一个低依赖、可高信心验证的切片建立真实迁移闭环。

## 旧仓来源与新仓目标
- 旧仓来源：`../routecodex/sharedmodule/llmswitch-core/src/tools/args-json.ts`
- 新仓目标：`rust/crates/rcc-core-domain/src/args_json.rs`
- 归属原因：该逻辑是纯字符串/JSON 处理，无网络、无文件、无 runtime 副作用。

## 本批次范围
### 包含
- `parseToolArgsJson` 对应的 Rust 迁移
- 与其相关的 key 归一、arg_key/arg_value artifact 修复
- 候选 JSON 容器抽取
- Rust 单测

### 不包含
- tool governance 主链迁移
- provider/tool 业务语义迁移
- host/orchestrator 改造
- 非 args-json 的其它 TS 工具函数

## 需要保持的行为
1. 空输入返回空对象。
2. 合法 JSON 能直接解析。
3. `<arg_key>/<arg_value>` 类 artifact 能被修复。
4. object key 中的 XML/tag artifact 能归一化。
5. 原始文本中若包含首个 JSON 容器，允许抽取并解析。
6. 解析失败时返回空对象，而不是抛异常。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_args_json.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
