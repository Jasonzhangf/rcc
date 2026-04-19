# Phase 08 Compat Block Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 08A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L42 `minimum-scope`：当前阶段允许实现的最小 compat 闭环。
- L44-L49 `verification`：验证与 CI 入口。
- L51-L58 `done`：本阶段完成判据。

## 目标
把 compat 从“容易被误放到 ingress 或 provider 的模糊职责”固定为独立适配边界：位于 hub pipeline 后、provider 前，负责 canonical request/response 与 provider-facing carrier 的 shape mapping。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md`
     - `docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md`
     - `docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`
     - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
     - `docs/agent-routing/110-compat-block-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-compat-block-migration/SKILL.md`
3. **Development**
   - Batch 01 只锁边界；Batch 02 才允许进入最小 compat skeleton 实现。
   - Batch 03 进入 route handoff sidecar。
   - Batch 04 进入 gemini provider-family request projection，但不提前扩到 provider runtime/response normalize。
   - Batch 05 进入 compat 的 spec-driven convergence 设计闭环，后续实现批次必须优先按“薄骨骼 + shared engine + spec/JSON”继续推进。
   - Batch 06 进入 request-side spec skeleton：把 anthropic / gemini request projection 抽成 shared projection module + provider-family spec。
   - Batch 07 进入 content/tool rule extraction：把 role rules 与 part kind rules 从 helper 流程中继续抽到 rule 层。
   - Batch 08 进入 tool field rules extraction：把 tool declaration / tool result 的静态字段规则从 helper 流程中继续抽到 rule 层。
4. **Test**
   - 先跑 `python3 scripts/verify_phase8_compat_block.py`
   - 进入实现批次后跑 `bash scripts/verify_phase8_compat_block_batch02.sh`
   - route handoff 批次再跑 `bash scripts/verify_phase8_compat_block_batch03.sh`
   - gemini compat 批次再跑 `bash scripts/verify_phase8_compat_block_batch04.sh`
   - convergence 批次再跑 `bash scripts/verify_phase8_compat_block_batch05.sh`
   - request-side spec skeleton 批次再跑 `bash scripts/verify_phase8_compat_block_batch06.sh`
   - content/tool rule extraction 批次再跑 `bash scripts/verify_phase8_compat_block_batch07.sh`
   - tool field rules extraction 批次再跑 `bash scripts/verify_phase8_compat_block_batch08.sh`
5. **Close**
   - docs、skills、实现与验证通过后，后续 batch 才允许继续展开 compat 实现。

## 当前阶段最小实现范围
1. 目标边界固定为：`hub pipeline -> compat -> provider`。
2. Phase 08A 的 compat 只负责：
   - canonical request -> provider request carrier
   - provider response carrier -> canonical response
   - route handoff -> provider carrier sidecar
   - provider-family request projection（例如 anthropic / gemini）
3. Batch 01 只负责锁边界；Batch 02 负责最小代码闭环；Batch 03 负责 route handoff sidecar；Batch 04 负责 gemini request projection；Batch 05 负责收敛架构真源与后续实现约束；Batch 06 负责 request-side spec skeleton；Batch 07 负责 content/tool rule extraction；Batch 08 负责 tool field rules extraction。
4. Batch 01 / Batch 02 / Batch 03 / Batch 04 / Batch 05 / Batch 06 / Batch 07 / Batch 08 都不负责：
   - ingress endpoint ownership
   - route selection
   - servertool 业务真源
   - transport/auth/runtime
5. 当前阶段先锁最小 carrier：
   - request side：model / input / messages / stream / metadata
   - response side：status / output / required_action / raw carrier
6. Batch 04 进入实现前必须锁定：
   - `system/developer -> systemInstruction`
   - `user/assistant -> contents`
   - `tools -> functionDeclarations`
   - `tool_results -> functionResponse`
   - `protocol_mapping_audit` 仍只进 `ProviderRequestCarrier.metadata`
7. Batch 05 进入实现前必须锁定：
   - compat block 继续变薄，不积累 provider-family 大分支
   - 共享 projection engine 继续留在 `rcc-core-domain`
   - 可静态表达的协议映射优先下沉成 spec/JSON 规则
   - lifecycle / continuation / tool governance / transport 不得伪装成配置化
8. Batch 06 进入实现前必须锁定：
   - 新增 `compat_request_projection` 作为 request-side shared projection module
   - anthropic / gemini request projection 改走 shared spec skeleton
   - 现有 request shape、audit sidecar 边界与回归测试结果保持不变
9. Batch 07 进入实现前必须锁定：
   - provider-family role rules 进入 rule 层
   - text / tool_call / tool_result 等 part kind 进入 rule 层
   - 现有 anthropic / gemini request projection 输出保持不变
10. Batch 08 进入实现前必须锁定：
   - anthropic tool definition fields 进入 rule 层
   - gemini function declaration / functionCall / functionResponse fields 进入 rule 层
   - 现有 anthropic / gemini request projection 输出保持不变
11. 当前阶段明确不做：
   - gemini real execute endpoint 动态路径
   - gemini response normalize
   - SSE / stream compat rebuild

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase8_compat_block.py`
- 当前 CI 入口：`.github/workflows/phase8-compat-block.yml`
- 当前实现入口：`bash scripts/verify_phase8_compat_block_batch02.sh`
- route handoff 入口：`bash scripts/verify_phase8_compat_block_batch03.sh`
- gemini compat 入口：`bash scripts/verify_phase8_compat_block_batch04.sh`
- convergence 入口：`bash scripts/verify_phase8_compat_block_batch05.sh`
- request-side spec skeleton 入口：`bash scripts/verify_phase8_compat_block_batch06.sh`
- content/tool rule extraction 入口：`bash scripts/verify_phase8_compat_block_batch07.sh`
- tool field rules extraction 入口：`bash scripts/verify_phase8_compat_block_batch08.sh`

## 完成判据
1. Phase 08A docs 与 routing 完整。
2. compat block skill 已落盘。
3. phase8 verify 脚本与 CI 可自动收口文档/技能阶段。
4. Batch 02 的最小 compat crate / mapper / 接线已落盘。
5. Batch 03 的 route handoff sidecar 已落盘，且未改写真实 request payload。
6. Batch 04 的 gemini compat request projection 已落盘，且未把 gemini 语义塞进 provider runtime。
7. Batch 05 已锁定 compat config convergence 真源，后续实现必须按“薄骨骼 + shared engine + spec/JSON”收敛。
8. Batch 06 已锁定并实现 request-side spec skeleton，compat request projection 已抽成第一层 shared module。
9. Batch 07 已锁定并实现 content/tool rule extraction，静态 role/part rules 已从流程 helper 继续抽薄。
10. Batch 08 已锁定并实现 tool field rules extraction，静态 tool declaration / tool result field rules 已从流程 helper 继续抽薄。
11. compat 的位置、职责与 host/router/pipeline/provider 的边界已被文档锁定。
