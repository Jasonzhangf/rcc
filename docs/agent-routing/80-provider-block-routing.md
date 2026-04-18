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
3. `.agents/skills/rcc-provider-block-migration/SKILL.md`
   - provider block 迁移的可复用动作。
4. `docs/CRATE_BOUNDARIES.md`
   - 确认唯一真源 crate 仍是 `rcc-core-provider`。
5. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
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
9. HTTP execute、retry、error classify、streaming/SSE 属于后续批次；未进入对应 batch 前不得提前实现。
10. provider 不解释 `reasoning.stop`、followup、tool governance、stop gateway 等字段；这些业务语义继续留在 servertool/domain。
11. 默认单 runtime 内收敛；若无明确收益，不新增独立 daemon、sidecar、后台服务。
12. 包装尽量薄：优先把 provider 输入归一到一个 canonical request plan，再由后续 batch 复用，不做重复包装层。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase5_provider_block.py`
- CI：`.github/workflows/phase5-provider-block.yml`
- Batch 01 实现阶段验证脚本在进入实现时随 batch 一起落盘。
