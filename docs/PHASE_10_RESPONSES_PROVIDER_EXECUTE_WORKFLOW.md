# Phase 10 Responses Provider Execute Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 10A 的总流程真源。
- L10-L19 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L21-L35 `minimum-scope`：当前阶段允许实现的最小主线闭环。
- L37-L41 `verification`：验证与 CI 入口。
- L43-L48 `done`：本阶段完成判据。

## 目标
在已完成 responses ingress、virtual router、hub pipeline、compat 最小闭环的基础上，把主线末端的 provider 从 noop runtime 推进到 **最小真实 transport execute**。这一阶段只解决主线接线，不回收 provider block / compat block 的既有真源边界。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md`
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md`
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md`
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md`
     - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
     - `docs/agent-routing/130-responses-provider-execute-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-responses-provider-execute/SKILL.md`
3. **Development**
   - 只做当前批次要求的最小主线 integration，不提前引入 host config 系统、多 provider runtime family 或 streaming 主线。
4. **Test**
   - 先跑 `python3 scripts/verify_phase10_responses_provider_execute.py`
   - 进入实现批次后跑 `bash scripts/verify_phase10_responses_provider_execute_batch01.sh`
   - route handoff integration 再跑 `bash scripts/verify_phase10_responses_provider_execute_batch02.sh`
   - target runtime bind 再跑 `bash scripts/verify_phase10_responses_provider_execute_batch03.sh`
   - host install E2E 再跑 `bash scripts/verify_phase10_responses_provider_execute_batch04.sh`
5. **Close**
   - docs、skills、实现与验证通过后，后续 batch 才允许继续展开 provider 主线能力。

## 当前阶段最小实现范围
1. 主链固定为：`responses ingress server -> virtual router -> hub pipeline -> compat -> provider`。
2. Phase 10A Batch 01 只负责：
   - provider runtime 顶层把 compat carrier 接到真实 transport request plan + HTTP execute 主链
   - orchestrator 支持最薄 provider runtime 注入
   - testkit 补一个真实 HTTP execute 的 responses 主线 smoke
3. Phase 10A Batch 02 只负责：
   - provider runtime contract 接受 compat sidecar route handoff
   - transport runtime 保持 payload 语义不变，不因 route handoff 改写 request body
   - orchestrator/testkit 提供一条 handoff 到 provider runtime 的闭环验证
4. Phase 10A Batch 03 只负责：
   - selected_target 进入 provider runtime registry bind
   - provider runtime registry 命中具体 transport runtime
   - target 缺失时显式失败，不做静默 fallback
5. Phase 10A Batch 04 只负责：
   - host `/v1/responses` 安装态命中 selected_target runtime registry
   - host 安装态验证真实 upstream hit 与 missing-target explicit failure
5. 当前阶段不负责：
   - host 级 provider config 系统
   - SSE / streaming 主线 integration
   - 多 provider / route-to-runtime 动态绑定
   - provider health / cooldown / failover
5. 当前批次允许的最小输入：
   - compat 产出的 `ProviderRequestCarrier`
   - 静态 provider runtime config（base_url / endpoint / auth / timeout）
6. 当前批次允许的最小输出：
   - compat 可消费的 `ProviderResponseCarrier`
   - responses 主线最终 canonical response

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 当前实现阶段入口：`bash scripts/verify_phase10_responses_provider_execute_batch01.sh`
- route handoff integration 入口：`bash scripts/verify_phase10_responses_provider_execute_batch02.sh`
- target runtime bind 入口：`bash scripts/verify_phase10_responses_provider_execute_batch03.sh`
- host install E2E 入口：`bash scripts/verify_phase10_responses_provider_execute_batch04.sh`
- 当前 CI 入口：`.github/workflows/phase10-responses-provider-execute.yml`

## 完成判据
1. Phase 10A docs 与 routing 完整。
2. responses provider execute skill 已落盘。
3. 主线真实 provider runtime integration 已落盘，但 host / compat / orchestrator 仍保持薄边界。
4. route handoff contract 已进入 provider runtime 输入，但未改写真实 transport payload。
5. selected_target 已能绑定到具体 provider runtime，且 target 缺失显式失败。
6. host `/v1/responses` 安装态已可命中 selected_target runtime registry，并显式暴露 missing-target failed status。
7. phase10 verify 脚本与 CI 可自动收口当前批次。
