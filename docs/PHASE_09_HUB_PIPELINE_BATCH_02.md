# Phase 09 Hub Pipeline Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的 docs-first 闭环范围。
- L10-L24 `scope`：Batch 02 要锁死的 canonical / mapping / continuation 边界。
- L26-L38 `deliverables`：本批次进入实现前必须先有的真源与代码骨架目标。
- L40-L49 `verification`：Batch 02 的文档与后续实现验证入口。

## 目标
在 Batch 01 skeleton 的基础上，把下一批真正要实现的 hub 主线锁死为：

```text
responses inbound
  -> hub canonical chat IR
  -> chat_process continuation policy
  -> outbound semantic carrier
  -> compat
  -> anthropic provider
```

本批次先做 **docs / skill / gate**，不提前宣称语义已经实现完。

## 本批次锁定范围
1. **canonical IR**
   - 在 `rcc-core-domain` 定义 hub 的共享 request/message/content/tool/response 结构。
2. **shared mapping ops**
   - 把字段 rename、enum_map、array_map、content/tool projection 等共享操作下沉为纯函数。
   - 真正的协议差异尽量通过 JSON/spec 规则装配，不在 hub/provider/host 重复写逻辑。
3. **continuation ownership**
   - provider-native continuation first；若不可用，再由 `hub.chat_process` 做 fallback。
   - 本批次 fallback 只覆盖 **inline 已物化上下文 + tool_outputs** 的最小闭环；
     conversation store 的 save/restore 真正持久化能力留到后续批次，不提前塞进 compat/provider/host。
4. **最小业务主链**
   - 第一条真实语义主链固定为 `responses -> canonical -> anthropic`。
5. **性能要求**
   - 默认 no-copy / minimal-copy；禁止无意义 JSON deep copy。
6. **回归要求**
   - 进入实现后，Rust 验收必须逐步对齐旧仓 matrix tests；这里的 `old仓 matrix tests` 至少覆盖：
     - anthropic responses roundtrip
     - responses continuation / submit_tool_outputs
     - real-sample hub I/O compare
     - cross-protocol audit matrix

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_AUDIT.md`
2. `docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md`
3. `docs/PHASE_09_HUB_PIPELINE_BATCH_02.md`
4. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
5. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-domain`
   - canonical IR
   - shared mapping ops
   - continuation capability selector / policy helper
2. `rcc-core-pipeline`
   - authoritative inbound semantic lift
   - authoritative chat_process continuation split
   - authoritative outbound semantic projection
   - Batch 02 最小闭环：对 inline `tool_outputs` 做 fallback materialize；缺失上文时显式失败，不做静默猜测
3. `rcc-core-compat`
   - 仅消费 canonical outbound carrier，不回收 hub truth
4. `rcc-core-provider`
   - 仅消费 compat/provider carrier，并暴露 provider-native continuation capability

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- 当前基础实现回归：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- Batch 02 进入实现后，必须新增与旧仓矩阵对齐的 regression gate，再允许关闭批次。
