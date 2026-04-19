# Phase 14 Host Provider Continuity E2E Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 14A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L39 `minimum-scope`：当前阶段允许实现的最小 continuity 安装态闭环。
- L41-L47 `verification`：验证与 CI 入口。
- L49-L58 `done`：本阶段完成判据。

## 目标
把已经在 domain / pipeline / orchestrator 内落好的 continuity 真源，推进到 **host 安装态 `/v1/responses` + real provider** 的端到端证据里：

1. host 继续只做 ingress shell；
2. compat 继续只做 hub 后、provider 前的 shape mapping；
3. provider 继续只做 `transport / auth / runtime`；
4. continuity 仍以 Phase 13 的 shared helper + pipeline store 为真源；
5. 第一条安装态真实 continuity 主线先选 **legacy anthropic provider**，因为它天然走 chat-process fallback，更能验证我们现在的骨架是否闭合。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md`
     - `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md`
     - `docs/agent-routing/170-host-provider-continuity-e2e-routing.md`
2. **Skills**
   - 建立/更新：`.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md`
3. **Development**
   - Batch 01：打通 host 安装态 anthropic create-turn continuity shell。
   - Batch 02：打通 host 安装态 `submit_tool_outputs` response-id restore continuity。
   - Batch 03：打通 host 安装态 ordinary `previous_response_id` fallback continuity，并补 explicit failure。
   - Batch 04：只做 batch01~03 unified gate，不新增新业务断言。
   - Batch 05：只做 closeout 文档与最终 gate，不新增新业务语义。
4. **Test**
   - 先跑 `python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
   - Batch 01：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
   - 后续实现批次再逐批补 gate。
5. **Close**
   - docs、skills、实现与验证通过后，对应 batch 才允许关闭。
   - host 安装态 continuity 证据必须来自真实 HTTP server + 真实 provider request 观察，而不是只看 unit/testkit 内部对象。

## 当前阶段最小实现范围
1. 主链固定为：
```text
POST /v1/responses
  -> rcc-core-host ingress shell
  -> rcc-core-orchestrator
  -> rcc-core-router
  -> rcc-core-pipeline
       inbound <> chat process <> outbound
  -> rcc-core-compat
  -> rcc-core-provider
  -> anthropic upstream fixture
```
2. Phase 14A Batch 01 只负责：
   - host 安装态第一跳 anthropic create-turn 命中真实 upstream
   - `requires_action` / `id` / `provider_runtime` / route 侧带在 responses shell 中可见
   - host 不新增第二套 continuity store 或 mapper
3. Phase 14A Batch 02 只负责：
   - host 安装态 `submit_tool_outputs` 通过 `response_id` 恢复 conversation store
   - anthropic provider request 只看到 materialized canonical messages，不看到 `response_id`/`tool_outputs` 泄漏
   - 响应最终回到 completed shell
4. Phase 14A Batch 03 只负责：
   - host 安装态 ordinary `previous_response_id` 走 chat-process fallback materialize
   - response store miss 时显式失败，不静默清空 continuity 继续请求
   - shell continuity 字段与 failed status 保持可观测
5. Phase 14A Batch 04 / 05 只负责：
   - 统一 batch01~03 gate
   - closeout 文档与最终 gate 收口
6. 当前阶段明确不做：
   - SSE / streaming continuity
   - provider-native openai/responses delta continuation 安装态矩阵
   - 第二套 host/provider conversation store
   - health/failover/cooldown/daemon/sidecar

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase14-host-provider-continuity-e2e.yml`
- 后续实现批次入口由 batch02~05 文档定义，再逐批补脚本。

## 完成判据
1. Phase 14A workflow / batch / gap inventory / routing 已完整落盘。
2. host/provider continuity E2E skill 已落盘。
3. Phase 14 docs gate 与 CI 已可自动收口。
4. batch01~03 的 continuity 主线、失败路径、host shell 观测点已在文档中冻结边界。
5. 下一步实现可以直接按 batch 进入，不再重复讨论 ownership。
