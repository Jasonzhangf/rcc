# Phase 06 Router Block Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 06A 的总流程真源。
- L10-L20 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L22-L39 `minimum-scope`：当前阶段允许实现的最小 router 闭环。
- L41-L48 `verification`：验证与 CI 入口。
- L50-L56 `done`：本阶段完成判据。

## 目标
把 `rcc-core-router` 从 skeleton `select()` 升级为真正的 router block 真源，但仍坚持最小框架优先：先把 `route candidate normalization / routing state filter / instruction target` 主链定稳，再按最小批次扩 capability reorder、alias/sticky、health/quota/cooldown。

当前主线固定为：

```text
responses ingress server
  -> virtual router
  -> hub pipeline(inbound <> chat process <> outbound)
  -> provider
```

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md`
     - `docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md`
     - `docs/PHASE_06_ROUTER_BLOCK_BATCH_02.md`
     - `docs/PHASE_06_ROUTER_BLOCK_BATCH_03.md`
     - `docs/PHASE_06_ROUTER_BLOCK_BATCH_04.md`
     - `docs/PHASE_06_ROUTER_BLOCK_BATCH_05.md`
     - `docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
     - `docs/agent-routing/90-router-block-routing.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-router-block-migration/SKILL.md`
3. **Development**
   - 每个新入口批次都必须先做“缺函数 / 缺 block”盘点：缺就补最小真源；不缺就继续接线。
   - 只做当前批次要求的最小 router 主链，不提前实现完整 TS virtual-router engine。
4. **Test**
   - 先跑 `python3 scripts/verify_phase6_router_block.py`
   - 再跑 `bash scripts/verify_phase6_router_batch01.sh`
   - 再跑 `bash scripts/verify_phase6_router_batch02.sh`
   - 再跑 `bash scripts/verify_phase6_router_batch03.sh`
   - 再跑 `bash scripts/verify_phase6_router_batch04.sh`
   - 再跑 `bash scripts/verify_phase6_router_batch05.sh`
5. **Close**
   - docs、skills、验证通过后，后续 batch 才允许继续展开。

## 当前阶段最小实现范围
1. 目标 crate 固定为 `rust/crates/rcc-core-router`。
2. Phase 06A 的边界固定为：`route selection / routing state / health-quota`。
3. Batch 01：canonical route candidate normalization / routing state filter / instruction target
   - 输入：显式 `requested_route`、可选 `classification_candidates`、显式 route pools、显式 routing instruction state、显式 provider registry view。
   - 过程：
     - normalize route alias 与 `DEFAULT_ROUTE` fallback
     - build canonical route candidates
     - apply routing state filter（allowed / disabled providers、disabled keys、disabled models）
     - resolve explicit instruction target 到 `exact` / `filter` 模式
   - 输出：canonical route candidates 或 canonical instruction target result。
   - 边界保持极薄：
     - 不做 provider transport/auth/runtime
     - 不做 servertool followup/stop/tool governance
     - 不做 host/orchestrator 额外包装层
4. 后续批次才允许继续扩：
   - Batch 02：capability reorder / preferred-model reorder
   - Batch 03：responses ingress -> virtual router 最小选择闭环
   - Batch 04：runtime bootstrap route consumption + minimal route result surfacing
   - Batch 05：selected target handoff surfacing
   - alias / sticky queue
   - health/quota/cooldown
   - tier selection / fallback / analytics
5. 不引入独立进程、后台 daemon、provider 业务 fallback、TS 兼容业务壳。
6. Batch 03 已把最小顺序修正到：
   - `responses ingress -> virtual router -> pipeline.prepare -> provider`
   - 其中 `pipeline.prepare` 仍只是 hub pipeline 的临时 skeleton，不代表 inbound/chat-process/outbound 已完成。

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase6_router_block.py`

### Batch 01 实现阶段
- `bash scripts/verify_phase6_router_batch01.sh`
- 内部包含：phase1/phase2/phase6 docs verify + `cargo test -p rcc-core-router -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 02 实现阶段
- `bash scripts/verify_phase6_router_batch02.sh`
- 内部包含：phase1/phase2/phase6 docs verify + `cargo test -p rcc-core-router -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

### Batch 03 实现阶段
- 当前实现闭环：`docs/PHASE_06_ROUTER_BLOCK_BATCH_03.md`
- 当前缺口盘点真源：`docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
- 实现阶段入口：`bash scripts/verify_phase6_router_batch03.sh`
- 关键纯函数真源：`rust/crates/rcc-core-domain/src/router_selection_input.rs`
- 目标：让 responses/chat/request 能先进入 virtual router 的 authoritative input/select shell，再进入后续 pipeline skeleton

### Batch 04 实现阶段
- 当前实现闭环：`docs/PHASE_06_ROUTER_BLOCK_BATCH_04.md`
- 实现阶段入口：`bash scripts/verify_phase6_router_batch04.sh`
- 目标：让 runtime router 真实消费 config/bootstrap route pools，并把最小 route result 暴露给主链响应

### Batch 05 实现阶段
- 当前实现闭环：`docs/PHASE_06_ROUTER_BLOCK_BATCH_05.md`
- 实现阶段入口：`bash scripts/verify_phase6_router_batch05.sh`
- 目标：让 runtime router 在不复制 provider/runtime 语义的前提下，暴露最小 `selected_target` handoff 给 downstream compat/provider carrier

### 当前 CI 入口
- `.github/workflows/phase6-router-block.yml`

## 完成判据
1. Phase 06A docs 与 routing 完整。
2. router block skill 已落盘。
3. phase6 verify 脚本与 CI 可自动收口文档/技能阶段。
4. 当前 batch 的唯一最小主链已经被文档锁定，没有与 provider/servertool/host 重叠。
5. 当前 docs gate 通过后，才允许继续进入 router 实现。
6. Batch 03 已以最小方式把 router 顺序提前到 pipeline 前，并且未把 hub/provider 真源提前塞进 router 之外的层。
7. Batch 04 已把 runtime bootstrap route pools 接到 `RouterBlock::select()`，且未把 route 真源移出 `rcc-core-router`。
8. Batch 05 已补齐 `selected_target` 最小 handoff，且未把 target 选择语义移出 `rcc-core-router`。
