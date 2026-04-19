# Testing And Acceptance

## 索引概要
- L1-L8 `purpose`：本文件定义第一阶段及后续沿用的验证原则。
- L10-L22 `layers`：测试层级。
- L24-L37 `evidence`：证据标准。
- L39-L47 `phase1`：第一阶段的最小测试要求。
- L49-L54 `ci`：CI 自动化约束。

## 目标
定义“什么叫验证完成”，并把第一阶段的闭环测试沉淀成后续阶段可复用的验收标准。

## 测试层级
1. **Layer 0：存在性检查**
   - 目标文件、目录、入口脚本必须存在。
2. **Layer 1：结构检查**
   - 文档和 skills 必须满足固定结构要求。
3. **Layer 2：引用链检查**
   - AGENTS → routing → docs/skills → 下一阶段示例 必须闭合。
4. **Layer 3：自动化执行**
   - 统一由脚本执行，CI 复用同一入口。

## 证据标准
1. 必须有可复现命令。
2. 必须有机器可判断的成功/失败结果。
3. 错误必须指出缺失项或结构问题。
4. 无自动化证据的人工描述不算验收通过。

## 第一阶段最小测试要求
- 本地运行：`python3 scripts/verify_phase1_foundation.py`
- 检查对象：
  - `AGENTS.md`
  - `docs/agent-routing/*`
  - `docs/WORKFLOW_CLOSED_LOOP.md`
  - `docs/SKILL_SYSTEM.md`
  - `docs/DELIVERY_WORKFLOW.md`
  - `docs/TESTING_AND_ACCEPTANCE.md`
  - `docs/PHASE_02_SKELETON_PREP.md`
  - `.agents/skills/*/SKILL.md`
  - `.github/workflows/phase1-foundation.yml`

## Phase 02 文档/技能 gate
- 本地运行：`python3 scripts/verify_phase2_architecture_docs.py`
- 检查对象：Rust workspace 架构文档、crate 边界文档、skeleton workflow、rust skeleton skill、phase2 CI workflow。

## Phase 02 skeleton 实现 gate
- 本地运行：`bash scripts/verify_phase2_cargo_skeleton.sh`
- 检查对象：Rust workspace、最小 crates、testkit smoke test、host smoke run。

## 近期最小可跑路径 gate
- 本地运行：`bash scripts/verify_phase2_cargo_skeleton.sh`
- 作用：仓库整理、初始化提交、日常快速回归时的最小统一入口。
- 检查对象：phase2 docs gate、workspace `cargo check`、`rcc-core-testkit` smoke、`rcc-core-host` smoke run。

## Phase 03 pure-functions gate
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
- 检查对象：Phase 03 路由、batch 文档、pure-functions migration skill、domain crate Rust 单测。


## Phase 04 servertool block gate
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
- 检查对象：Phase 04 路由、workflow/batch 文档、servertool block migration skill、servertool crate Rust 单测、testkit smoke、host smoke。


## Phase 05 provider block gate
- 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase5_provider_transport_request_plan.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase5_provider_http_execute.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase5_provider_runtime_metadata.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase5_provider_sse_transport.sh`
- 检查对象：Phase 05 路由、workflow/batch 文档、provider block migration skill、provider crate Rust 单测、testkit smoke、host smoke、phase5 CI workflow。

## Phase 06 router block gate
- 文档/技能阶段：`python3 scripts/verify_phase6_router_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase6_router_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase6_router_batch02.sh`
- Batch 03 文档/实现入口：`docs/PHASE_06_ROUTER_BLOCK_BATCH_03.md`
- Batch 03 实现阶段：`bash scripts/verify_phase6_router_batch03.sh`
- Batch 04 文档/实现入口：`docs/PHASE_06_ROUTER_BLOCK_BATCH_04.md`
- Batch 04 实现阶段：`bash scripts/verify_phase6_router_batch04.sh`
- Batch 05 文档/实现入口：`docs/PHASE_06_ROUTER_BLOCK_BATCH_05.md`
- Batch 05 实现阶段：`bash scripts/verify_phase6_router_batch05.sh`
- 检查对象：Phase 06 路由、workflow/batch 文档、`docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`、`rust/crates/rcc-core-domain/src/router_selection_input.rs`、router block migration skill、runtime route pool consumption、selected target handoff、domain/router/orchestrator/compat/provider/host crate Rust 单测、testkit smoke、host smoke、phase6 CI workflow。

## Phase 07 host/server gate
- 文档/技能阶段：`python3 scripts/verify_phase7_host_server.py`
- Batch 01 实现阶段：`bash scripts/verify_phase7_host_server_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase7_host_server_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase7_host_server_batch03.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase7_host_server_batch04.sh`
- 检查对象：Phase 07 路由、workflow/batch 文档、`docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`、`rust/crates/rcc-core-domain/src/responses_ingress.rs`、host server skeleton skill、domain/host crate Rust 单测、testkit smoke、host smoke CLI、host HTTP `/healthz` + `/smoke` + `/requests` + `/chat` + `/v1/responses`、phase7 CI workflow。

## Phase 08 compat block gate
- 文档/技能阶段：`python3 scripts/verify_phase8_compat_block.py`
- Batch 02 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md`
- Batch 02 实现阶段：`bash scripts/verify_phase8_compat_block_batch02.sh`
- Batch 03 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md`
- Batch 03 实现阶段：`bash scripts/verify_phase8_compat_block_batch03.sh`
- Batch 04 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md`
- Batch 04 实现阶段：`bash scripts/verify_phase8_compat_block_batch04.sh`
- Batch 05 文档/收敛入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md`
- Batch 05 收敛阶段：`bash scripts/verify_phase8_compat_block_batch05.sh`
- Batch 06 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md`
- Batch 06 实现阶段：`bash scripts/verify_phase8_compat_block_batch06.sh`
- Batch 07 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md`
- Batch 07 实现阶段：`bash scripts/verify_phase8_compat_block_batch07.sh`
- Batch 08 文档/实现入口：`docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md`
- Batch 08 实现阶段：`bash scripts/verify_phase8_compat_block_batch08.sh`
- 检查对象：Phase 08 路由、workflow/batch 文档、`docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`、`docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`、compat block migration skill、compat 位于 hub 后/provider 前的边界、route handoff sidecar、gemini provider-family request projection、compat config convergence、request-side spec skeleton、content/tool rule extraction、tool declaration / tool result field rules extraction、payload invariance、phase8 CI workflow。

## Phase 09 hub pipeline gate
- 文档/技能阶段：`python3 scripts/verify_phase9_hub_pipeline.py`
- 审计真源：`docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
- 架构真源：`docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
- Batch 01 文档/实现入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_01.md`
- Batch 01 实现阶段：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- Batch 02 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
- Batch 03 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_03.md`
- Batch 04 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_04.md`
- Batch 05 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_05.md`
- Batch 05 实现阶段：`bash scripts/verify_phase9_hub_pipeline_batch05.sh`
- Batch 06 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_06.md`
- Batch 06 实现阶段：`bash scripts/verify_phase9_hub_pipeline_batch06.sh`
- Batch 07 文档入口：`docs/PHASE_09_HUB_PIPELINE_BATCH_07.md`
- Batch 07 实现阶段：`bash scripts/verify_phase9_hub_pipeline_batch07.sh`
- 检查对象：Phase 09 路由、workflow/batch 文档、`docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`、hub pipeline block migration skill、phase9 docs gate、no-copy/minimal-copy 规则、provider-first continuation ownership、response_id keyed restore 边界、fallback provider response normalize 边界、cross-protocol audit sidecar 只进 carrier metadata 不进 request body、旧仓 matrix regression 对齐计划。


## Phase 10 responses provider execute gate
- 文档/技能阶段：`python3 scripts/verify_phase10_responses_provider_execute.py`
- Batch 01 文档/实现入口：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md`
- Batch 01 实现阶段：`bash scripts/verify_phase10_responses_provider_execute_batch01.sh`
- Batch 02 文档/实现入口：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md`
- Batch 02 实现阶段：`bash scripts/verify_phase10_responses_provider_execute_batch02.sh`
- Batch 03 文档/实现入口：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md`
- Batch 03 实现阶段：`bash scripts/verify_phase10_responses_provider_execute_batch03.sh`
- Batch 04 文档/实现入口：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md`
- Batch 04 实现阶段：`bash scripts/verify_phase10_responses_provider_execute_batch04.sh`
- 检查对象：Phase 10 路由、workflow/batch 文档、`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`、responses provider execute skill、orchestrator/provider/testkit/host 的最小主线集成验证、provider runtime route handoff contract、payload invariance、selected_target runtime bind、explicit missing-target failure、host `/v1/responses` 安装态 selected-target hit/miss、phase10 CI workflow。

## Phase 11 config foundation gate
- 文档/技能阶段：`python3 scripts/verify_phase11_config_foundation.py`
- Batch 01 文档/实现入口：`docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md`
- Batch 01 实现阶段：`bash scripts/verify_phase11_config_foundation_batch01.sh`
- Batch 02 文档/实现入口：`docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md`
- Batch 02 实现阶段：`bash scripts/verify_phase11_config_foundation_batch02.sh`
- Batch 03 文档/实现入口：`docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md`
- Batch 03 实现阶段：`bash scripts/verify_phase11_config_foundation_batch03.sh`
- Batch 04 文档/实现入口：`docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md`
- Batch 04 实现阶段：`bash scripts/verify_phase11_config_foundation_batch04.sh`
- Batch 05 文档/实现入口：`docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md`
- Batch 05 实现阶段：`bash scripts/verify_phase11_config_foundation_batch05.sh`
- 检查对象：Phase 11 路由、workflow/batch 文档、`docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`、config foundation skill、`rcc-core-config` 两文件加载与 merge、legacy inline provider projection、legacy routing bootstrap projection、provider runtime registry bootstrap projection、runtime router bootstrap handoff、host/orchestrator 的 config 接线、phase11 CI workflow。

## Phase 13 responses continuation matrix gate
- 文档/技能阶段：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- Batch 01 文档/实现入口：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_01.md`
- Batch 01 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch01.sh`
- Batch 02 文档/实现入口：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_02.md`
- Batch 02 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch02.sh`
- Batch 03 文档/实现入口：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_03.md`
- Batch 03 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch03.sh`
- Batch 04 文档/实现入口：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md`
- Batch 04 实现阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
- Batch 05 文档/收敛入口：`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_05.md`
- Batch 05 收敛阶段：`bash scripts/verify_phase13_responses_continuation_matrix_batch05.sh`
- 检查对象：Phase 13 路由、workflow/batch/closeout 文档、`docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_GAP_INVENTORY.md`、responses continuation matrix skill、`rcc-core-domain` 的 response-id keyed continuation projection/shared helpers、request/response continuation semantics helper、responses shell continuity projection、`rcc-core-pipeline` 的 route-aware native delta / cross-provider materialize、`rcc-core-testkit` smoke、phase13 CI workflow。

## CI 约束
1. CI 与本地共用一个验证入口。
2. CI 失败即视为闭环未完成。
3. 后续阶段新增测试时，也必须优先复用现有验证入口或显式扩展它。
