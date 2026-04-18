# Phase 04 Servertool Block Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 04A 的总流程真源。
- L10-L22 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L24-L38 `minimum-scope`：当前阶段允许实现的最小 servertool 闭环。
- L40-L49 `verification`：验证与 CI 入口。
- L51-L57 `done`：本阶段完成判据。

## 目标
把 `rcc-core-servertool` 从 skeleton `plan()` 升级为真正的 block 真源，但仍坚持最小框架优先：先把 followup 主链做通，再按最小批次扩 assistant/tool-output injection、stop、clock 等分支。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md`
     - 当前 batch 文档（如 `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_01.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md` / `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md`）
     - `docs/agent-routing/70-servertool-block-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-servertool-block-migration/SKILL.md`
3. **Development**
   - 只做当前批次要求的最小 block 主链，不提前实现完整 TS servertool engine。
4. **Test**
   - 先跑 `python3 scripts/verify_phase4_servertool_block.py`
   - 再跑当前 batch 验证脚本与 Rust 测试。
5. **Close**
   - docs、skills、验证通过后，后续 batch 才允许继续展开。

## 当前阶段最小实现范围
1. 目标 crate 固定为 `rust/crates/rcc-core-servertool`。
2. Batch 01：canonical followup request builder
   - 输入：captured chat seed、adapter context、followup text、少量 block 选项。
   - 过程：`sanitize_followup_text` → `trim_openai_messages_for_followup` → `compact_tool_content_in_messages` → `resolve_followup_model` / `normalize_followup_parameters` / `drop_tool_by_function_name`。
3. Batch 02：minimal followup injection
   - 在 batch01 基础上追加：`extractAssistantMessageFromChatLike` / `buildToolMessagesFromToolOutputs` 的 block 级注入语义。
   - 固定顺序：trim captured messages → append assistant/tool messages → compact tool content → append sanitized followup user text。
4. Batch 03：system / vision injection
   - 在 batch02 基础上追加：`injectSystemTextIntoMessages` / `injectVisionSummaryIntoMessages` 的 block 级注入语义。
   - 固定顺序：trim captured messages → inject system text → inject vision summary → append assistant/tool messages → compact tool content → append sanitized followup user text。
5. Batch 04：tool governance
   - 在 batch03 基础上追加：`ensureStandardToolsIfMissing` / `force_tool_choice` / `append_tool_if_missing` 的 tools / parameters 改写语义。
   - 固定顺序：message 主链保持不变；tools / parameters 仅在收口阶段做最小治理，不提前扩 provider compat。
6. Batch 05：stop gateway block
   - 基于 domain `inspect_stop_gateway_signal`，在 block 内补显式 context 优先、否则 fallback inspect 的最小 stop gateway 语义。
   - `tool.stop.gateway` 只做薄路由，不提前扩 runtime metadata bridge、reasoning-stop guard 或 auto-loop。
7. Batch 06：reasoning.stop tool block
   - 基于 `reasoning-stop.ts` 的 payload normalize / summary / tool-output 主链，在 block 内补最小 reasoning.stop tool 处理语义。
   - `tool.reasoning.stop` 只做薄路由，不提前扩 state arm、guard、memory append 或 finalize engine。
8. Batch 07：reasoning.stop state arm
   - 基于 batch06 canonical tool_output，在 block 内补最小 reasoning stop state patch build。
   - `tool.reasoning.stop.arm` 只做薄路由，不提前扩 sticky persistence、mode sync、clear/read、guard。
9. Batch 08：reasoning.stop state read/clear
   - 基于显式 `state` object，在 block 内补最小 read view 与 clear result 语义。
   - `tool.reasoning.stop.read` / `tool.reasoning.stop.clear` 只做薄路由，不提前扩 sticky persistence、guard、mode sync。
10. Batch 09：reasoning.stop mode sync
   - 基于显式 `captured` request + `base_state`，在 block 内补最小 stopless directive mode sync 语义。
   - `tool.reasoning.stop.mode.sync` 只做薄路由，不提前扩 sticky persistence、runtime metadata、fail-count 或 guard。
11. Batch 10：reasoning.stop sticky persistence
   - 基于显式 `sticky_key` + `state` object，在 block 内补最小 save/load 持久化语义。
   - `tool.reasoning.stop.sticky.save` / `tool.reasoning.stop.sticky.load` 只做薄路由，不提前扩 runtime metadata、full router state codec、async queue 或 guard。
12. Batch 11：reasoning.stop fail-count
   - 基于显式 `sticky_key` + 既有 sticky persistence，在 block 内补最小 fail-count read/inc/reset 语义。
   - `tool.reasoning.stop.fail.read` / `tool.reasoning.stop.fail.inc` / `tool.reasoning.stop.fail.reset` 只做薄路由，不提前扩 guard-trigger、runtime metadata、full router state codec 或 async queue。
13. `plan()` 只能作为兼容薄壳，不得重新实现 followup/stop 语义。
14. 不引入独立进程、后台 daemon、provider 业务 fallback、TS 兼容业务壳。
15. 不提前实现 runtime metadata attach/read、reasoning-stop-guard、responses rebuild、完整 op engine 等非当前 batch 必须分支。

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase4_servertool_block.py`

### Batch 01 实现阶段
- `bash scripts/verify_phase4_servertool_followup_request.sh`

### Batch 02 实现阶段
- `bash scripts/verify_phase4_servertool_followup_injection.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 03 实现阶段
- `bash scripts/verify_phase4_servertool_followup_system_vision.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 04 实现阶段
- `bash scripts/verify_phase4_servertool_followup_tool_governance.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 05 实现阶段
- `bash scripts/verify_phase4_servertool_stop_gateway.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 06 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 07 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop_state.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 08 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 09 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 10 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 11 实现阶段
- `bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh`
- 内部包含：phase1/phase2/phase3/phase4 docs verify + `cargo test -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

## 完成判据
1. Phase 04A docs 与 routing 完整。
2. servertool block skill 已落盘。
3. `rcc-core-servertool` 已有真实 block API，而不是只剩 smoke plan。
4. phase4 verify 脚本与 CI 可自动收口。
5. 当前批次通过后，才允许继续扩 stop / clock / followup 其它注入分支。
