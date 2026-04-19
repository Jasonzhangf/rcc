# Host Provider Continuity E2E 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L19 `docs-map`：Phase 14A 相关文档与 skill 入口。
- L21-L34 `rules`：host/provider continuity 安装态迁移约束。
- L36-L39 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把已经在 domain / pipeline / orchestrator 内落好的 responses continuity 真源，推进到 **host 安装态 `/v1/responses` + real provider** 的真实端到端证据里。该阶段只做 **host 安装态 continuity E2E**，不重新定义 continuity store、不把业务语义搬回 host，也不把 transport/auth/runtime 扩回 compat。

## 文档与 skill 映射
1. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md`
   - Phase 14A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md`
   - 第一批实现闭环：host 安装态 anthropic create-turn continuity shell。
3. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md`
   - 第二批实现闭环：host 安装态 `submit_tool_outputs` response-id restore continuity。
4. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md`
   - 第三批实现闭环：host 安装态 ordinary `previous_response_id` fallback continuity + explicit failure。
5. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md`
   - 第四批实现闭环：统一 batch01~03 gate。
6. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md`
   - 第五批实现闭环：closeout 文档与最终 gate。
7. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md`
   - Phase 14A 的 closeout 真源与 backlog 出口。
8. `docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md`
   - host/provider continuity E2E 的缺口盘点真源。
9. `.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md`
   - host/provider continuity E2E 的可复用动作。
10. `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md`
   - provider real execute 与 host install 基线复用入口。
11. `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_WORKFLOW.md`
   - continuation shared helper / pipeline store 真源复用入口。
12. `docs/CRATE_BOUNDARIES.md`
   - 确认 host / compat / provider / pipeline 边界不回流。

## 规则
1. 本阶段只做安装态 E2E 证据，不新增第二套 continuity 真源。
2. host 仍只做 ingress shell；不得新增 conversation store、request restore、provider dispatch 逻辑。
3. compat 仍只做 hub 后 / provider 前的 shape mapping；不得在 compat 内新增 store 或 runtime bind。
4. provider 仍只负责 `transport / auth / runtime`；不得在 provider 内复制 continuity materialize。
5. continuation 共享真源继续留在：
   - pure helpers -> `rcc-core-domain`
   - response-id keyed restore / fallback materialize -> `rcc-core-pipeline`
   - host/provider 安装态证据 -> 本阶段 host/testkit/gate
6. 第一条安装态 continuity 主线固定选 **legacy anthropic provider**；因为它天然验证 fallback materialize，不需要 provider-native shortcut。
7. 真实 transport payload 语义不得因为 E2E 验证而被裁剪或改写；只允许增加 debug/observation 断言。
8. 缺 store entry 时必须显式失败；禁止静默降级继续请求。
9. 默认 minimal-copy：优先复用已有 shared helper 与 shell projection，不在 host/provider 重写 JSON mapper。
10. 默认单 runtime / 单进程；不用 daemon、sidecar、后台 worker。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
- Batch 01 实现阶段：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh`
- Batch 05 实现阶段：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase14-host-provider-continuity-e2e.yml`
