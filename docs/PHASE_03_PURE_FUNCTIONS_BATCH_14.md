# Phase 03 Pure Functions Batch 14

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十四批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L34 `scope`：本批次迁移范围。
- L36-L49 `behavior`：必须保持的行为。
- L51-L61 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 router message feature-support pure helpers 到 `rcc-core-domain`，验证“message role/text 提取、keyword 检测、media attachment 信号识别可以先沉为共享纯函数，而 routing feature 聚合壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/message-utils.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/message_utils.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留 latest role/user message 提取、message content text 提取、keyword 检测、media attachment signal 判定等无 I/O、无网络、无进程副作用的纯 helper；`features.ts` 中的 routing feature 聚合与 native 调用继续留在外层。

## 本批次范围
### 包含
- latest user message 定位
- latest message role 提取
- message text 提取
- keyword 检测
- extended thinking keyword 检测
- media attachment signals 识别
- `detect_image_attachment`
- Rust 单测

### 不包含
- `features.ts` 聚合逻辑
- antigravity / token-estimator / native 调用
- router metadata 与 request feature 壳

## 需要保持的行为
1. `get_latest_user_message_index` 必须从后往前找最后一个 `role=user`。
2. `get_latest_message_role` 只返回最后一条消息的非空 trimmed role。
3. `extract_message_text`：
   - string content 命中时返回原字符串语义；
   - array content 支持 string part 与 object part 的 `text/content`；
   - array part 最终按 `\n` join 后 trim。
4. `detect_keyword` 保持旧语义：仅做 `text.includes(keyword.toLowerCase())` 检查，不额外 lower-case 输入。
5. `detect_extended_thinking_keyword` 保持旧关键词集合与命中语义。
6. media signals：
   - string content 中的 image/video JSON 片段也要识别；
   - `data:/file:/blob:` 视为本地；
   - `localhost`、`.local`、私网 IP、环回 IP 不算 remote public；
   - 只在有可解析 media url 时置 `hasAnyMedia`。
7. 输出保持纯函数语义，不引入 router/provider/host/servertool 依赖。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_message_utils.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
