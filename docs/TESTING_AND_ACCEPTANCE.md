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
- 检查对象：Phase 06 路由、workflow/batch 文档、router block migration skill、router crate Rust 单测、testkit smoke、host smoke、phase6 CI workflow。

## CI 约束
1. CI 与本地共用一个验证入口。
2. CI 失败即视为闭环未完成。
3. 后续阶段新增测试时，也必须优先复用现有验证入口或显式扩展它。
