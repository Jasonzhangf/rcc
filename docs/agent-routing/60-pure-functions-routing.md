# Pure Functions Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L17 `docs-map`：Phase 03 相关文档与技能入口。
- L19-L28 `rules`：纯函数迁移约束。
- L30-L34 `verification`：验证入口。

## 覆盖范围
适用于：从旧 routecodex 迁移纯函数、schema、codec、DTO、parser、validator 这类无 I/O 逻辑到 `rcc-core-domain`。

## 文档与 skill 映射
1. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_01.md`
   - 第一批迁移真源：`args-json.ts` → `rcc-core-domain::args_json`。
2. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_02.md`
   - 第二批迁移真源：`tools/exec-command/normalize.ts` → `rcc-core-domain::exec_command_normalize`。
3. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_03.md`
   - 第三批迁移真源：`tools/tool-description-utils.ts` → `rcc-core-domain::tool_description`。
4. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_04.md`
   - 第四批迁移真源：`tools/apply-patch/structured/coercion.ts` → `rcc-core-domain::apply_patch_structured`。
5. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_05.md`
   - 第五批迁移真源：`request-tool-choice-policy.ts` + `response-finish-invariants.ts` → `rcc-core-domain::tool_protocol_invariants`。
6. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_06.md`
   - 第六批迁移真源：`tools/tool-registry.ts` → `rcc-core-domain::tool_registry_guards`。
7. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_07.md`
   - 第七批迁移真源：`filters/special/request-tool-list-filter.ts` → `rcc-core-domain::mcp_resource_discovery`。
8. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_08.md`
   - 第八批迁移真源：`tools/apply-patch/patch-text/looks-like-patch.ts` + `tool-governor-guards.ts` 最小识别切片 → `rcc-core-domain::apply_patch_text`。
9. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_09.md`
   - 第九批迁移真源：`servertool/stop-gateway-context.ts` → `rcc-core-domain::stop_gateway`。
10. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_10.md`
   - 第十批迁移真源：`servertool/handlers/followup-message-trimmer.ts` → `rcc-core-domain::followup_message_trim`。
11. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_11.md`
   - 第十一批迁移真源：`servertool/handlers/stop-message-auto/blocked-report.ts` → `rcc-core-domain::blocked_report`。
12. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_12.md`
   - 第十二批迁移真源：`conversion/shared/marker-lifecycle.ts` → `rcc-core-domain::marker_lifecycle`。
13. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_13.md`
   - 第十三批迁移真源：`routing-stop-message-state-codec.ts` + `servertool/handlers/stop-message-auto/routing-state.ts` 共享 stop-message state codec 切片 → `rcc-core-domain::stop_message_state`。
14. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_14.md`
   - 第十四批迁移真源：`router/virtual-router/message-utils.ts` → `rcc-core-domain::message_utils`。
15. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_15.md`
   - 第十五批迁移真源：`servertool/handlers/stop-message-auto/blocked-report.ts` 中被 sibling 复用的 content text helper → `rcc-core-domain::message_content_text`。
16. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_16.md`
   - 第十六批迁移真源：`router/virtual-router/tool-signals.ts` → `rcc-core-domain::tool_signals`。
17. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_17.md`
   - 第十七批迁移真源：`router/virtual-router/context-weighted.ts` → `rcc-core-domain::context_weighted`。
18. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_18.md`
   - 第十八批迁移真源：`router/virtual-router/health-weighted.ts` → `rcc-core-domain::health_weighted`。
19. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_19.md`
   - 第十九批迁移真源：`router/virtual-router/context-advisor.ts` → `rcc-core-domain::context_advisor`。
20. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_20.md`
   - 第二十批迁移真源：`router/virtual-router/routing-pre-command-state-codec.ts` → `rcc-core-domain::pre_command_state`。
21. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_21.md`
   - 第二十一批迁移真源：`router/virtual-router/routing-instructions/clean.ts` → `rcc-core-domain::routing_instruction_clean`。
22. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_22.md`
   - 第二十二批迁移真源：`router/virtual-router/routing-stop-message-state-codec.ts` 剩余 fallback/merge codec → `rcc-core-domain::routing_stop_message_codec`。
23. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_23.md`
   - 第二十三批迁移真源：`router/virtual-router/routing-pre-command-parser.ts` 中 token reader 切片 → `rcc-core-domain::pre_command_token`。
24. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_24.md`
   - 第二十四批迁移真源：`router/virtual-router/routing-pre-command-parser.ts` 中 directive classify 切片 → `rcc-core-domain::pre_command_directive`。
25. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_25.md`
   - 第二十五批迁移真源：`router/virtual-router/routing-instructions/parse.ts` 中 preprocess/clear-detect 切片 → `rcc-core-domain::routing_instruction_preprocess`。
26. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_26.md`
   - 第二十六批迁移真源：`conversion/shared/reasoning-normalizer.ts` 中 reasoning markup detect / transport-noise strip 切片 → `rcc-core-domain::reasoning_markup`。
27. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_27.md`
   - 第二十七批迁移真源：`servertool/handlers/followup-sanitize.ts` 中 followup text sanitize 切片 → `rcc-core-domain::followup_sanitize`。
28. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_28.md`
   - 第二十八批迁移真源：`servertool/handlers/followup-request-builder.ts` 中 request-seed helper 切片 → `rcc-core-domain::followup_request_utils`。
29. `docs/PHASE_03_PURE_FUNCTIONS_BATCH_29.md`
   - 第二十九批迁移真源：`servertool/handlers/followup-request-builder.ts` 中 tool content compacting 切片 → `rcc-core-domain::followup_tool_compact`。
30. `.agents/skills/rcc-pure-functions-migration/SKILL.md`
   - pure-functions 迁移的可复用动作。
31. `docs/CRATE_BOUNDARIES.md`
   - 确认目标 crate 仍是 `rcc-core-domain`。
32. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认迁移后仍符合三层结构。

## 规则
1. 只迁无 I/O、无网络、无进程副作用逻辑。
2. 目标 crate 默认是 `rcc-core-domain`。
3. 若纯函数依赖旧仓 native helper，先抽最小共享纯 helper 到 domain，再迁主函数；不要把 native wrapper 一并带入。
4. 迁移目标必须有 Rust 单测，不以口头说明代替。
5. 不为了兼容旧结构而引入 TS 壳、daemon 或额外 runtime。

## 验证入口
- 文档/技能阶段：`python3 scripts/verify_phase3_pure_functions.py`
- Batch 01 实现阶段：`bash scripts/verify_phase3_args_json.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase3_exec_command_normalize.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase3_tool_description.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase3_apply_patch_structured.sh`
- Batch 05 实现阶段：`bash scripts/verify_phase3_tool_protocol_invariants.sh`
- Batch 06 实现阶段：`bash scripts/verify_phase3_tool_registry_guards.sh`
- Batch 07 实现阶段：`bash scripts/verify_phase3_mcp_resource_discovery.sh`
- Batch 08 实现阶段：`bash scripts/verify_phase3_apply_patch_text.sh`
- Batch 09 实现阶段：`bash scripts/verify_phase3_stop_gateway.sh`
- Batch 10 实现阶段：`bash scripts/verify_phase3_followup_message_trim.sh`
- Batch 11 实现阶段：`bash scripts/verify_phase3_blocked_report.sh`
- Batch 12 实现阶段：`bash scripts/verify_phase3_marker_lifecycle.sh`
- Batch 13 实现阶段：`bash scripts/verify_phase3_stop_message_state.sh`
- Batch 14 实现阶段：`bash scripts/verify_phase3_message_utils.sh`
- Batch 15 实现阶段：`bash scripts/verify_phase3_message_content_text.sh`
- Batch 16 实现阶段：`bash scripts/verify_phase3_tool_signals.sh`
- Batch 17 实现阶段：`bash scripts/verify_phase3_context_weighted.sh`
- Batch 18 实现阶段：`bash scripts/verify_phase3_health_weighted.sh`
- Batch 19 实现阶段：`bash scripts/verify_phase3_context_advisor.sh`
- Batch 20 实现阶段：`bash scripts/verify_phase3_pre_command_state.sh`
- Batch 21 实现阶段：`bash scripts/verify_phase3_routing_instruction_clean.sh`
- Batch 22 实现阶段：`bash scripts/verify_phase3_routing_stop_message_codec.sh`
- Batch 23 实现阶段：`bash scripts/verify_phase3_pre_command_token.sh`
- Batch 24 实现阶段：`bash scripts/verify_phase3_pre_command_directive.sh`
- Batch 25 实现阶段：`bash scripts/verify_phase3_routing_instruction_preprocess.sh`
- Batch 26 实现阶段：`bash scripts/verify_phase3_reasoning_markup.sh`
- Batch 27 实现阶段：`bash scripts/verify_phase3_followup_sanitize.sh`
- Batch 28 实现阶段：`bash scripts/verify_phase3_followup_request_utils.sh`
- Batch 29 实现阶段：`bash scripts/verify_phase3_followup_tool_compact.sh`
