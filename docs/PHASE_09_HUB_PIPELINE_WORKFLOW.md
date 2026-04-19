# Phase 09 Hub Pipeline Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 09A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L41 `minimum-scope`：当前阶段允许实现的最小 hub pipeline 闭环与下一批目标。
- L43-L50 `rules`：Phase 09A 必须保持的性能、状态与边界规则。
- L52-L58 `verification`：验证与 CI 入口。
- L60-L65 `done`：本阶段当前完成判据。

## 目标
把 `rcc-core-pipeline` 从当前 skeleton 升级为真正的 **hub pipeline** 真源，但仍坚持最小框架优先：先把 `inbound / chat process / outbound` 骨架与边界锁稳，再按最小批次推进具体语义。

当前主线固定为：

```text
responses ingress server
  -> virtual router
  -> hub pipeline(inbound <> chat process <> outbound)
  -> compat
  -> provider
```

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
     - `docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
     - `docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_01.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_03.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_04.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_05.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_06.md`
     - `docs/PHASE_09_HUB_PIPELINE_BATCH_07.md`
     - `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
     - `docs/agent-routing/120-hub-pipeline-routing.md`
2. **Skills**
   - 更新：`.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`
3. **Development**
   - 每个新入口批次都必须先做“缺函数 / 缺 block”盘点：缺就补最小真源；不缺就继续接线。
   - Batch 01 已完成 skeleton；Batch 02 进入 canonical IR / mapping ops / continuation split；Batch 03 进入 response_id keyed conversation store / restore；Batch 04 进入 fallback provider response normalize；Batch 05 进入旧仓 matrix regression 的最小 Rust 对齐；Batch 06 进入 cross-protocol audit matrix 的最小 Rust 对齐；Batch 07 进入 audit sidecar wiring 的最小边界接线。
4. **Test**
   - 先跑 `python3 scripts/verify_phase9_hub_pipeline.py`
   - 再跑 `bash scripts/verify_phase9_hub_pipeline_batch01.sh`
   - Batch 02 进入实现后，新增 matrix regression gate，并对齐旧仓 hub/continuation/cross-protocol 核心矩阵。
5. **Close**
   - docs、skills、验证通过后，后续 batch 才允许继续进入 hub pipeline 实现。

## 当前阶段最小实现范围
1. 目标 crate 固定为 `rust/crates/rcc-core-pipeline`，共享纯函数继续优先下沉 `rcc-core-domain`。
2. Phase 09A 的 block 边界固定为：`inbound / chat process / outbound`。
3. Batch 01 已经完成：
   - responses ingress 进入 hub pipeline 的缺函数 / 缺 block 已最小收口；
   - hub pipeline skeleton 已具备 `inbound / chat process / outbound` 三段薄边界；
   - compat 仍位于 hub 后、provider 前，当前批次未提前实现。
4. Batch 02 进入实现前必须锁定：
   - hub canonical chat IR
   - shared mapping ops + JSON/spec-driven protocol mapping
   - responses continuation 的 provider-first ownership split
   - `responses -> canonical -> anthropic` 第一条真实语义主链
5. Batch 03 进入实现前必须锁定：
   - response_id keyed fallback conversation store
   - provider response -> canonical continuation history 最小提取
   - submit_tool_outputs(response_id only) restore/materialize 闭环
6. Batch 04 进入实现前必须锁定：
   - anthropic provider response -> canonical response normalize
   - fallback store record 改吃 canonical response truth
   - tool_use -> required_action / function_call 最小闭环
7. Batch 05 进入实现前必须锁定：
   - old仓 matrix tests 的最小 Rust 对齐
   - synthetic payload 驱动的 anthropic roundtrip / continuation / hub I/O compare
   - gate 不依赖 HOME 外部 sample 目录
8. Batch 06 进入实现前必须锁定：
   - cross-protocol audit matrix 最小 Rust 对齐
   - responses -> anthropic/gemini 的 dropped / lossy / unsupported / preserved audit
   - audit 仍保持 pure-function truth，不回流 host/orchestrator/provider
9. Batch 07 进入实现前必须锁定：
   - audit sidecar 挂在 canonical outbound，而不是 host/provider runtime
   - compat 只把 audit 投影到 `ProviderRequestCarrier.metadata`
   - provider transport request body 不携带 `protocol_mapping_audit`
   - gemini target 仍以 pure-function audit truth 收口，未开放 compat target 前不得伪造 body mapping
10. 当前阶段明确不做：
   - provider 以外的 transport/auth/runtime
   - compat 以外的 provider shape mapping
   - route selection / routing state
   - servertool followup / stop / clock
11. 默认保持 pipeline 单一职责，不为了“看起来完整”把 compat/provider/router 语义塞进 pipeline。

## Phase 09A 硬规则
1. **不做 pairwise protocol conversion**：统一先升到 canonical，再投影到目标协议。
2. **默认 no-copy / minimal-copy**：除非 ownership、持久化、快照或独立响应壳必须，否则不做多余 clone/deep copy。
3. **Continuation provider-first**：provider 相同且 provider 原生支持 continuation 时，在 provider/server 侧继续；仅在 provider 不支持时，才回退给 `hub.chat_process`。
4. **compat 位置锁死**：compat 仍然位于 hub 后、provider 前，只做 shape mapping。
5. **matrix regression 对齐旧仓**：Rust 新实现不得绕开旧仓核心回归矩阵。

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase9_hub_pipeline.py`

### Batch 01 / Batch 05 / Batch 06 / Batch 07 实现阶段
- `bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- `bash scripts/verify_phase9_hub_pipeline_batch05.sh`
- `bash scripts/verify_phase9_hub_pipeline_batch06.sh`
- `bash scripts/verify_phase9_hub_pipeline_batch07.sh`
- 内部包含：phase1/phase2/phase9 docs verify + `cargo test -p rcc-core-domain -p rcc-core-pipeline -p rcc-core-orchestrator -p rcc-core-testkit`

### 当前 CI 入口
- `.github/workflows/phase9-hub-pipeline.yml`

## 完成判据
1. Phase 09A docs、routing 与 skill 已包含 hub audit、canonical architecture、Batch 02 / Batch 03 / Batch 04 / Batch 05 / Batch 06 / Batch 07 边界。
2. Phase 09A 已锁定 no-copy、provider-first continuation、matrix regression、audit-sidecar-not-in-body 四条新规则。
3. phase9 verify 脚本与 CI 可自动收口文档/技能阶段。
4. 当前 batch 的唯一主链仍然是 `responses -> router -> hub -> compat -> provider`，没有与 router/compat/provider/servertool 重叠。
5. Batch 07 只补 canonical outbound audit sidecar 最小接线，不扩大 provider/runtime 语义边界。
