# Servertool Block Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L17 `docs-map`：Phase 04A 相关文档与技能入口。
- L19-L29 `rules`：servertool block 真源迁移约束。
- L31-L36 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 `rcc-core-servertool` 从 skeleton 计划器升级为 block 真源，优先迁移 followup / stop / clock 这类 server-side tool 语义，并复用已下沉到 `rcc-core-domain` 的纯函数 helper。

## 文档与 skill 映射
1. `docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md`
   - Phase 04A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_01.md`
   - 第一批最小闭环：captured chat seed + followup text → canonical followup request。
3. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md`
   - 第二批最小闭环：assistant/tool-output injection → canonical followup request。
4. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md`
   - 第三批最小闭环：system/vision injection → canonical followup request。
5. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md`
   - 第四批最小闭环：tool governance → canonical followup request。
6. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md`
   - 第五批最小闭环：stop gateway block → canonical stop context。
7. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md`
   - 第六批最小闭环：reasoning.stop block → canonical tool_output。
8. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md`
   - 第七批最小闭环：reasoning.stop state arm → canonical state patch。
9. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md`
   - 第八批最小闭环：reasoning.stop state read/clear → canonical state view/result。
10. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md`
   - 第九批最小闭环：reasoning.stop mode sync → canonical mode result/state patch。
11. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md`
   - 第十批最小闭环：reasoning.stop sticky persistence → canonical sticky save/load result。
12. `docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md`
   - 第十一批最小闭环：reasoning.stop fail-count → canonical read/inc/reset result。
13. `.agents/skills/rcc-servertool-block-migration/SKILL.md`
   - servertool block 迁移的可复用动作。
14. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-servertool`。
15. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认三层结构、host/provider 薄边界与单 runtime 约束。

## 规则
1. `servertool` 必须保持一级 block 真源，不把 followup/stop/clock 语义散落回 host/provider/orchestrator。
2. block 只做必要编排，不复制 `rcc-core-domain` 已有纯函数实现。
3. 当前 Phase 04A 先做 **最小闭环切片**，不一次性搬完整个 TS servertool engine。
4. followup 系列批次先按：`captured seed -> message injection -> compact -> append user text -> tools/parameters governance -> canonical request` 固定顺序推进。
5. assistant message / tool-output message 注入仍属于 servertool block 真源，不得提前塞进 host/provider/orchestrator。
6. system / vision message injection 仍属于 servertool block 真源，不得提前塞进 provider/host。
7. `force_tool_choice` / `ensure_standard_tools` / `append_tool_if_missing` 仍属于 servertool block 真源，不得提前塞进 provider/host。
8. stop gateway context resolve 仍属于 servertool block 真源；runtime metadata attach/read 继续留在 provider/runtime 边界之外，不得提前带回 block。
9. reasoning.stop payload normalize / summary / tool_output 仍属于 servertool block 真源；state arm / guard / auto-loop 继续留在后续批次，不得在本批次提前混入。
10. reasoning.stop state arm patch build 仍属于 servertool block 真源；sticky persistence / mode sync / clear/read / guard 继续留在后续批次，不得在本批次提前混入。
11. reasoning.stop state read/clear 仍属于 servertool block 真源；sticky persistence / mode sync / fail-count / guard 继续留在后续批次，不得在本批次提前混入。
12. reasoning.stop mode sync 仍属于 servertool block 真源；sticky persistence / runtime metadata / raw responses rebuild / fail-count / guard 继续留在后续批次，不得在本批次提前混入。
13. reasoning.stop sticky persistence 仍属于 servertool block 真源；runtime metadata、full router state codec、async queue、telemetry recover、fail-count / guard 继续留在后续批次，不得在本批次提前混入。
14. reasoning.stop fail-count 仍属于 servertool block 真源；guard-trigger、runtime metadata、full router state codec、async queue、telemetry recover 继续留在后续批次，不得在本批次提前混入。
15. provider 仍只做 `transport / auth / runtime`，不承接 followup/stop 业务语义。
16. host 仍保持极薄，不新增 TS 业务桥或额外 daemon。
17. 若一个 block 语义需要跨多个 crate 复用，共享纯部分必须下沉 `rcc-core-domain`，其余真源保持在 `rcc-core-servertool`。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase4_servertool_followup_request.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase4_servertool_followup_injection.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase4_servertool_followup_system_vision.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase4_servertool_followup_tool_governance.sh`
- Batch 05 实现阶段：`bash scripts/verify_phase4_servertool_stop_gateway.sh`
- Batch 06 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop.sh`
- Batch 07 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_state.sh`
- Batch 08 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh`
- Batch 09 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh`
- Batch 10 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh`
- Batch 11 实现阶段：`bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh`
- CI：`.github/workflows/phase4-servertool-block.yml`
