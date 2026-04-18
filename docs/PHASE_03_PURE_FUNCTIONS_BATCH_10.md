# Phase 03 Pure Functions Batch 10

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 03 第十批迁移真源。
- L10-L18 `source-target`：旧仓来源与新仓目标。
- L20-L33 `scope`：本批次迁移范围。
- L35-L46 `behavior`：必须保持的行为。
- L48-L58 `tests`：测试与验收。

## 目标
从旧 `routecodex` 再迁一批 followup message trimming pure helper 到 `rcc-core-domain`，验证“servertool followup 历史裁剪逻辑也可以先下沉为共享纯函数，而 followup 注入/build 壳继续留在外层”。

## 旧仓来源与新仓目标
- 旧仓来源：
  - `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-message-trimmer.ts`
- 新仓目标：
  - `rust/crates/rcc-core-domain/src/followup_message_trim.rs`
  - `rust/crates/rcc-core-domain/src/lib.rs`（公开导出）
- 归属原因：本批次只保留消息数组裁剪、role 判定、tool adjacency 与 user anchor 保留等无 I/O、无网络、无进程副作用的纯变换逻辑，适合作为 followup trim 真源沉到 domain。

## 本批次范围
### 包含
- OpenAI-style message trimming 主逻辑。
- system/developer 保留策略。
- tool call / tool response adjacency 保留。
- user anchor 保留策略。
- Rust 单测。

### 不包含
- followup request build。
- servertool injection / followup orchestration。
- captured request / adapterContext 读写。
- provider/runtime 接线。

## 需要保持的行为
1. system/developer 消息必须始终保留。
2. 非 system 消息数量不超过阈值时，返回原始消息记录列表。
3. 若裁剪发生，只保留尾部 `max_non_system_messages` 的非 system 消息。
4. 若保留 tool response，必须补保留其前面的 assistant tool call，以及更前面的 user/tool anchor。
5. 若保留 assistant tool call，必须补保留其前面的 user/tool anchor，以及后续连续 tool response。
6. 若裁剪后第一个保留的非 system 不是 user，则优先补一个更早的 user anchor。
7. 输出保持原顺序，不引入 followup/runtime/servertool 状态。

## 测试与验收
### 文档/技能阶段
- `python3 scripts/verify_phase3_pure_functions.py`

### 实现阶段
- `bash scripts/verify_phase3_followup_message_trim.sh`

### 必须通过
- phase1 foundation verify
- phase2 architecture docs verify
- phase3 pure-functions docs/skill verify
- `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain`
