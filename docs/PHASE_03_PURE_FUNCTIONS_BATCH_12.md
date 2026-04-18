# Phase 03 Pure Functions Batch 12

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十二批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L47 `behavior`：必须保持的行为。
- L49-L59 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 marker lifecycle cleaner pure helper 到 `rcc-core-domain`，验证“marker syntax 的 text/content/messages 清洗可以先沉为共享纯函数，而 request/record bridge 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/conversion/shared/marker-lifecycle.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/marker_lifecycle.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 marker syntax 的文本扫描、marker 提取、content/messages 清洗等无 I/O、无网络、无进程副作用的纯变换逻辑，适合作为共享真源沉到 domain。

## 本批次范围
### 包含
- marker syntax 文本剥离。
- marker match 结构。
- string / part-array content 清洗。
- messages 批量清洗。
- `has_marker_syntax`。
- Rust 单测。

### 不包含
- request bridge。
- in-place record 清洗。
- semantics/responses/context 外层桥接。

## 需要保持的行为
1. 若文本不含 `<**`，直接返回原文与空 markers。
2. marker 识别必须支持：
   - 正常闭合 `<** ... **>`
   - 未闭合但在换行处结束的 marker
3. 输出文本必须进行空白压缩：
   - 去掉行尾空格
   - 连续空行压缩
   - trim 首尾
4. content 为 string 时，返回清洗后的 string。
5. content 为数组时，需支持：
   - string part
   - object part 的 `text`
   - object part 的 `content`
6. messages 清洗只改命中的 message，未命中的 message 保持引用语义等价。
7. 输出保持纯函数语义，不引入 request/runtime/bridge 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_marker_lifecycle.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
