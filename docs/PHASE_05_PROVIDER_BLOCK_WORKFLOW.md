# Phase 05 Provider Block Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 05A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L49 `minimum-scope`：当前阶段允许实现的最小 provider 闭环。
- L51-L65 `verification`：验证与 CI 入口。
- L67-L72 `done`：本阶段完成判据。

## 目标
把 `rcc-core-provider` 从 skeleton `NoopProviderRuntime` 升级为真正的 provider adapter 真源，但仍坚持最小框架优先：先把 `transport request plan` 主链做通，再按最小批次扩 HTTP execute、runtime metadata、streaming/SSE 等分支。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`
     - 当前 batch 文档（如 `docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md` / `docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md` / `docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md` / `docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md`）
     - `docs/agent-routing/80-provider-block-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-provider-block-migration/SKILL.md`
3. **Development**
   - 只做当前批次要求的最小 provider 主链，不提前实现完整 TS provider/runtime family stack。
4. **Test**
   - 先跑 `python3 scripts/verify_phase5_provider_block.py`
   - 再进入当前 batch 的实现验证。
5. **Close**
   - docs、skills、验证通过后，后续 batch 才允许继续展开。

## 当前阶段最小实现范围
1. 目标 crate 固定为 `rust/crates/rcc-core-provider`。
2. Batch 01：canonical transport request plan
   - 输入：显式 provider config、可选 runtime overrides、service default baseURL/endpoint、request body。
   - 过程：
     - resolve effective baseURL
     - resolve effective endpoint
     - build apikey / no-auth headers
     - normalize timeout
     - assemble canonical target URL 与 request plan
   - 输出：canonical transport request plan；仍不做真实 HTTP execute。
3. Batch 02：HTTP execute + retry skeleton
   - 输入：Batch 01 的 canonical transport request plan、显式 retry config。
   - 过程：
     - execute one HTTP request from canonical request plan
     - apply minimal retry policy helper
     - normalize transport / timeout / http status errors
   - 输出：canonical transport execute result 或 canonical transport error result。
   - 默认 retry 边界保持极薄：
     - 默认 `max_attempts = 1`
     - 只有显式提高上限时才允许 `5xx` retry 判定
     - 不把 virtual router failover / provider health / cooldown 混入 provider
4. Batch 03：runtime metadata / context attach-read
   - 输入：显式 request payload、显式 runtime metadata object。
   - 过程：
     - attach / merge provider runtime metadata carrier
     - preprocess request metadata projection
     - read entry endpoint / client request id / normalized client headers
   - 输出：processed request + readable runtime metadata view。
   - 边界保持极薄：
     - provider 只 attach/read runtime metadata
     - 不解释 tmux/session/conversation/followup/stopless 等业务语义
     - 不把 runtime metadata bridge 回流 host/orchestrator/servertool
5. Batch 04：streaming/SSE transport boundary
   - 输入：显式 request stream flag、Batch 01 canonical request plan。
   - 过程：
     - resolve wants upstream SSE
     - prepare SSE request body
     - execute raw SSE transport
     - wrap canonical `__sse_responses` carrier
   - 输出：raw SSE carrier result。
   - 边界保持极薄：
     - 只处理 upstream SSE transport boundary
     - 不做 snapshot attach、event normalize、Host bridge
     - 不解释 protocol / business streaming semantics
6. `rcc-core-provider` 不承接 followup/stop/tool governance/protocol conversion 主语义。
7. `rcc-core-host` / `rcc-core-orchestrator` 只保留薄调用壳，不复制 provider 逻辑。
8. 不引入独立进程、后台 daemon、provider 业务 fallback、TS 兼容业务壳。
9. 不提前实现 OAuth lifecycle、token refresh、provider health manager、virtual router cooldown、provider family profile。
10. Batch 04 也不提前引入 snapshot telemetry migration、Gemini/Qwen/Responses SSE normalizer、Host->Client SSE bridge。

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase5_provider_block.py`

### Batch 01 实现阶段
- `bash scripts/verify_phase5_provider_transport_request_plan.sh`
- 内部包含：phase1/phase2/phase5 docs verify + `cargo test -p rcc-core-provider -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 02 实现阶段
- `bash scripts/verify_phase5_provider_http_execute.sh`
- 内部包含：phase1/phase2/phase5 docs verify + `cargo test -p rcc-core-provider -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 03 实现阶段
- `bash scripts/verify_phase5_provider_runtime_metadata.sh`
- 内部包含：phase1/phase2/phase5 docs verify + `cargo test -p rcc-core-provider -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 04 实现阶段
- `bash scripts/verify_phase5_provider_sse_transport.sh`
- 内部包含：phase1/phase2/phase5 docs verify + `cargo test -p rcc-core-provider -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

## 完成判据
1. Phase 05A docs 与 routing 完整。
2. provider block skill 已落盘。
3. `rcc-core-provider` 的边界与第一批最小主链已经锁定。
4. phase5 verify 脚本与 CI 可自动收口文档/技能阶段。
5. 当前批次通过后，才允许继续扩 HTTP execute / runtime metadata / SSE transport 分支。
