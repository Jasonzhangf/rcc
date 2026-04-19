# Hub Pipeline Block Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L18 `docs-map`：Phase 09A 相关文档与技能入口。
- L20-L34 `rules`：hub pipeline 真源迁移约束。
- L36-L40 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 `rcc-core-pipeline` 从当前 skeleton 推进为真正的 **hub pipeline** 真源，但边界严格锁死在 `inbound / chat process / outbound` 生命周期推进；不承接 provider transport/auth/runtime，也不承接 compat 的协议/shape mapping 真源。

## 文档与 skill 映射
1. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
   - Phase 09A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
   - 旧仓 hub/source 审计结论。
3. `docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
   - canonical IR、三层结构与 continuation ownership 真源。
4. `docs/PHASE_09_HUB_PIPELINE_BATCH_01.md`
   - 第一批实现闭环：responses 主线下的 hub pipeline skeleton。
5. `docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
   - 第二批 docs-first 闭环：canonical IR / mapping ops / continuation split。
6. `docs/PHASE_09_HUB_PIPELINE_BATCH_03.md`
   - 第三批 docs-first 闭环：response_id keyed conversation store / restore。
7. `docs/PHASE_09_HUB_PIPELINE_BATCH_04.md`
   - 第四批 docs-first 闭环：fallback provider response -> canonical response normalize。
8. `docs/PHASE_09_HUB_PIPELINE_BATCH_05.md`
   - 第五批 docs-first 闭环：旧仓 matrix regression 最小 Rust 对齐。
9. `docs/PHASE_09_HUB_PIPELINE_BATCH_06.md`
   - 第六批 docs-first 闭环：cross-protocol audit matrix 最小 Rust 对齐。
10. `docs/PHASE_09_HUB_PIPELINE_BATCH_07.md`
   - 第七批 docs-first 闭环：audit sidecar wiring 最小边界接线。
11. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
   - responses 主线进入 hub pipeline 时的缺函数/缺 block 盘点真源。
12. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`
   - hub pipeline 迁移的可复用动作。
13. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-pipeline`。
14. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认 `virtual router -> hub pipeline -> compat -> provider` 主链位置。

## 规则
1. `pipeline` 只允许保留 `inbound / chat process / outbound` 真源，不承接 transport/auth/runtime、protocol compat、tool governance、route selection。
2. hub 中间真源必须是 canonical chat IR，不允许直接把 provider wire format 当共享语义层。
3. 协议差异优先收敛为 `shared mapping ops + JSON/spec-driven mapping rules`；生命周期、continuation、stream、显式失败语义仍留在 block code。
4. host / router / orchestrator 只能薄装配 pipeline，不得复制 inbound/chat-process/outbound 业务语义。
5. 若某段逻辑无 I/O、无网络、无持久化副作用，且可跨 pipeline/router/servertool/provider 复用，应优先判断是否下沉 `rcc-core-domain`；否则保持在 `rcc-core-pipeline`。
6. continuation 必须 provider-first：provider 相同且支持原生 continuation 时，在 provider/server 侧继续；否则才回退到 `hub.chat_process`。
7. 默认单 runtime 内收敛，且默认 no-copy / minimal-copy；若无明确收益，不新增独立 daemon、sidecar、后台服务，也不做无意义 deep copy。
8. Phase 09A 进入实现后，必须对齐旧仓 matrix regression，至少覆盖 anthropic 主线、continuation、cross-protocol audit 三类回归。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase9_hub_pipeline.py`
- Batch 01 实现阶段：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- Batch 02 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
- Batch 03 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_03.md`
- Batch 04 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_04.md`
- Batch 05 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_05.md`
- Batch 06 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_06.md`
- Batch 07 边界真源：`docs/PHASE_09_HUB_PIPELINE_BATCH_07.md`
- 缺口盘点真源：`docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
- Batch 05 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch05.sh`
- Batch 06 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch06.sh`
- Batch 07 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch07.sh`
- CI：`.github/workflows/phase9-hub-pipeline.yml`
