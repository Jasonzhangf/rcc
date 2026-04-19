# Phase 09 Hub Pipeline Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的 docs-first 闭环范围。
- L10-L25 `scope`：Batch 03 锁定 response_id conversation store / restore 的最小边界。
- L27-L38 `deliverables`：本批次进入实现前必须具备的真源与代码目标。
- L40-L46 `verification`：Batch 03 文档与实现验证入口。

## 目标
在 Batch 02 的 inline `tool_outputs` fallback 基础上，继续补齐 **responses continuation 的最小有状态闭环**：

```text
responses create
  -> fallback provider response returns response_id + tool_call semantics
  -> hub.chat_process store capture/record
  -> responses submit_tool_outputs(response_id only)
  -> hub.chat_process restore/materialize
  -> compat
  -> fallback provider
```

本批次只做 **response_id keyed conversation store / restore**，不把 scope/session/conversation restore 一次性拉进来。

## 本批次锁定范围
1. **conversation store state**
   - state 真源留在 `rcc-core-pipeline`。
   - 仅允许 **single runtime 内内存态 store**；不新增 daemon、sidecar、独立进程或外部持久化。
2. **store pure helpers**
   - `rcc-core-domain` 负责：
     - request persisted fields 提取
     - provider response -> canonical assistant/tool-call history 提取
     - response_id resume / materialize 纯函数
3. **record / restore lifecycle**
   - create 请求在 provider-native continuation 不可用时，允许进入 fallback store 记录。
   - submit_tool_outputs 若只带 `response_id + tool_outputs`，必须先查 store，再在 `hub.chat_process` 做 restore/materialize。
4. **显式失败**
   - response_id 不存在、已过期、或 provider response 无法提供可恢复 continuation 真相时，必须显式失败。
   - 禁止静默跳过 store，禁止“猜测历史上下文”。
5. **边界**
   - compat 不负责对话存储。
   - provider 不负责 fallback store。
   - orchestrator 只负责薄装配 capture/record/restore 调用，不承接会话语义真源。
6. **本批次不做**
   - scope/session/conversation keyed restore
   - 外部持久化存储
   - anthropic 原生响应完整映射到 responses canonical response
   - 全量 cross-protocol continuation matrix

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_BATCH_03.md`
2. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
3. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
4. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-domain`
   - responses conversation entry pure helpers
   - provider response 中 `response_id / output / required_action` 的最小 restore 提取
2. `rcc-core-pipeline`
   - in-memory response_id conversation store
   - `record_response` / `resume_by_response_id` block truth
3. `rcc-core-orchestrator`
   - fallback provider path 上的最薄 record hook
   - submit_tool_outputs 时的最薄 restore hook
4. `tests`
   - 同一 app 实例内：
     - create -> record
     - submit_tool_outputs(response_id only) -> restore -> anthropic outbound
   - unknown response_id explicit failure

## 当前验证入口
- 文档/技能 gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- 基础回归：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- Batch 03 关闭前，至少要补 response_id restore 的 Rust 单测 + 集成回归。
