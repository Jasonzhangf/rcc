# Compat Block Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L18 `docs-map`：Phase 08A 相关文档与技能入口。
- L20-L34 `rules`：compat block 真源迁移约束。
- L36-L41 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 hub pipeline 与 provider 之间的协议/shape mapping 收拢到独立 compat 边界。compat 的位置固定为 **hub 后、provider 前**；它不是 ingress，不拥有 transport/auth/runtime，也不接管 router/pipeline/servertool 真源。

## 文档与 skill 映射
1. `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - Phase 08A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md`
   - 第一批 docs 锁边界：compat 的位置与最小 shape mapping 范围。
3. `docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md`
   - 第一批实现闭环：compat crate、carrier mapper、orchestrator 接线。
4. `docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md`
   - 第二批实现闭环：router route handoff -> provider carrier sidecar。
5. `docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md`
   - 第三批实现闭环：gemini provider-family request projection。
6. `docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md`
   - 第四批收敛闭环：compat spec-driven convergence 设计与 gate。
7. `docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md`
   - 第五批实现闭环：request-side spec skeleton 与 shared projection module。
8. `docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md`
   - 第六批实现闭环：content/tool rule extraction。
9. `docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md`
   - 第七批实现闭环：tool declaration / tool result field rules extraction。
10. `docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`
   - compat 薄骨骼 + shared projection engine + spec/JSON rules 的架构真源。
11. `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - responses 主线进入 compat 前的缺函数 / 缺 block 盘点真源。
12. `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - compat block 迁移的可复用动作。
13. `docs/CRATE_BOUNDARIES.md`
   - 确认 compat 位于 hub 后、provider 前，不拥有 ingress。
14. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认 `host -> virtual router -> hub pipeline -> compat -> provider` 主链位置。

## 规则
1. compat 固定在 hub 后、provider 前；不得挪进 host ingress，也不得塞进 provider transport。
2. compat 只允许保留 canonical request/response 与 provider-facing carrier 的 shape mapping，不承接 route policy、tool governance、transport/auth/runtime。
3. host 只做 ingress shell；router 只做 route selection；hub pipeline 只做生命周期推进；provider 只做 transport/auth/runtime。
4. 当前 Phase 08A 先做最小闭环切片，不一次性搬完整个旧仓 responses/chat compatibility stack。
5. Batch 01 先固定：canonical request -> provider request carrier；provider response carrier -> canonical response。
6. Batch 03 只允许把 router 已决出的 handoff 投影到 provider carrier sidecar；不允许改写真实 request payload。
7. Batch 04 若进入 provider-family request projection，gemini `contents/systemInstruction/tools/functionResponse` 真源必须留在 compat/domain；provider runtime 不得反向接管这些 shape。
8. Batch 05 起 compat 必须继续收敛为：**薄骨骼 + shared projection engine + spec/JSON rules**。
9. Batch 06 起 request-side provider-family projection 必须优先走 shared projection module + provider-family spec；不得继续把新规则直接堆进 compat_mapping 大函数。
10. Batch 07 起静态 content/tool 规则也必须优先收进 rule 层；不得继续把 role/part kind 识别散落在多个 helper 里。
11. Batch 08 起 tool declaration / tool result 的静态字段规则也必须优先收进 rule 层；不得继续把字段 alias 与输出字段名散落在多个 helper 里。
12. spec/JSON 只允许承接静态字段与 audit 规则；continuation、lifecycle、tool governance、transport/auth/runtime 不得伪装成配置化。
13. 默认单 runtime 内收敛；若无明确收益，不新增独立 daemon、sidecar、后台服务。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase8_compat_block.py`
- 实现阶段：`bash scripts/verify_phase8_compat_block_batch02.sh`
- route handoff 阶段：`bash scripts/verify_phase8_compat_block_batch03.sh`
- gemini compat 阶段：`bash scripts/verify_phase8_compat_block_batch04.sh`
- convergence 阶段：`bash scripts/verify_phase8_compat_block_batch05.sh`
- request-side spec skeleton 阶段：`bash scripts/verify_phase8_compat_block_batch06.sh`
- content/tool rule extraction 阶段：`bash scripts/verify_phase8_compat_block_batch07.sh`
- tool field rules extraction 阶段：`bash scripts/verify_phase8_compat_block_batch08.sh`
- 当前 CI 入口：`.github/workflows/phase8-compat-block.yml`
