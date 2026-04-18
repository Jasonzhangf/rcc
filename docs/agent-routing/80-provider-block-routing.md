# Provider Block Migration 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L16 `docs-map`：Phase 05A 相关文档与技能入口。
- L18-L30 `rules`：provider block 真源迁移约束。
- L32-L35 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把 `rcc-core-provider` 从 skeleton noop runtime 升级为真正的 provider adapter 真源，但边界严格锁死在 `transport / auth / runtime`，不承接 route / tool / protocol 业务语义。

## 文档与 skill 映射
1. `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`
   - Phase 05A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md`
   - 第一批最小闭环：endpoint/baseURL + apikey/no-auth headers → canonical transport request plan。
3. `docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md`
   - 第二批最小闭环：canonical transport request plan → minimal HTTP execute + retry skeleton + normalized transport error。
4. `docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md`
   - 第三批最小闭环：runtime metadata attach-read + request preprocess 的最小 transport/runtime 投影。
5. `docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md`
   - 第四批最小闭环：streaming / SSE transport boundary。
6. `docs/PHASE_05_PROVIDER_BLOCK_REVIEW.md`
   - Phase 05A 的收口 review 真源，用于回答“provider 已经完成什么、边界锁死到哪里”。
7. `.agents/skills/rcc-provider-block-migration/SKILL.md`
   - provider block 迁移的可复用动作。
8. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-provider`。
9. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认三层结构、host/provider 薄边界与单 runtime 约束。

## 规则
1. `provider` 只允许保留 `transport / auth / runtime` 真源，不承接 route/tool/pipeline/servertool 业务语义。
2. host / orchestrator 只能薄装配 provider，不得复制 endpoint resolve、auth header build、HTTP retry 等 provider 语义。
3. 若某段逻辑无 I/O、无网络、无认证副作用，且可跨 provider 复用，应优先判断是否下沉 `rcc-core-domain`；否则保持在 `rcc-core-provider`。
4. 当前 Phase 05A 先做 **最小闭环切片**，不一次性搬完整个 TS provider family/runtime stack。
5. Batch 01 先固定：`base_url + endpoint + auth + timeout + body -> canonical transport request plan`，不提前做真实网络请求。
6. Batch 01 允许的 auth 只包含：
   - `apikey`
   - empty key 的 no-auth 模式
   不提前混入 oauth/device-flow/token refresh。
7. Batch 01 只接受显式 provider config / service defaults / runtime overrides 输入；不提前扩 provider family profile、virtual router health、provider cooldown。
8. endpoint/baseURL resolve、header build、timeout normalize、target URL assemble 仍属于 provider 真源，不得回流 host/servertool。
9. Batch 02 进入后，HTTP execute、retry、error classify 仍只允许围绕 canonical request plan 收口；不得顺手混入 runtime metadata、OAuth recovery、provider health 或 router failover。
10. provider 不解释 `reasoning.stop`、followup、tool governance、stop gateway 等字段；这些业务语义继续留在 servertool/domain。
11. 默认单 runtime 内收敛；若无明确收益，不新增独立 daemon、sidecar、后台服务。
12. 包装尽量薄：优先把 provider 输入归一到一个 canonical request plan，再由后续 batch 复用，不做重复包装层。
13. Batch 02 retry skeleton 默认保持单次尝试；只有显式提高 `max_attempts` 时，才允许对 `5xx` 做 retry 判定。
14. Batch 02 若需要 HTTP client，也必须保持极薄，不为了 transport execute 提前引入额外常驻 runtime 或多余 async 基础设施。
15. Batch 03 进入后，runtime metadata 仍只允许 attach/read + 最小 request preprocess 投影；不得顺手混入 session key resolve、tmux/conversation scope、followup/stopless 等业务解释。
16. Batch 03 允许投影到 request `metadata` 的字段仅限 `entryEndpoint` / `stream` / `clientHeaders` / `__origModel`；其余语义继续留在更上层或后续批次。
17. Batch 04 进入后，SSE 仍只允许停留在 upstream transport boundary：wants_sse 判定、request body 标记、raw SSE carrier wrap；不得顺手混入 snapshot attach、event normalize、Host bridge 或 protocol 语义解释。
18. streaming/SSE 只允许输出 canonical `__sse_responses` raw carrier；不得在 provider 内部提前做业务级 event 解释。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
- Batch 01 实现阶段：`bash scripts/verify_phase5_provider_transport_request_plan.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase5_provider_http_execute.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase5_provider_runtime_metadata.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase5_provider_sse_transport.sh`
- CI：`.github/workflows/phase5-provider-block.yml`
