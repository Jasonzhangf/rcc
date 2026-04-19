# Phase 09 Hub Pipeline Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的 docs-first 闭环范围。
- L10-L24 `scope`：Batch 04 锁定 fallback provider response -> canonical response 的最小边界。
- L26-L35 `deliverables`：本批次进入实现前必须具备的真源与代码目标。
- L37-L43 `verification`：Batch 04 文档与实现验证入口。

## 目标
把 fallback provider 的真实响应先收敛成 canonical response，再供 hub/chat_process store 记录使用。

本批次固定主线：

```text
anthropic provider response
  -> compat response normalize
  -> canonical response(id/status/output/required_action)
  -> pipeline conversation record
  -> responses submit_tool_outputs restore
```

## 本批次锁定范围
1. **response normalize 归属**
   - provider response -> canonical response 真源留在 `compat` / `rcc-core-domain::compat_mapping`。
   - pipeline 只消费 canonical response，不解析 anthropic wire body。
2. **最小 anthropic response normalize**
   - 至少支持：
     - `id`
     - `content[].text`
     - `content[].tool_use`
     - `stop_reason = tool_use`
   - 产出 canonical：
     - `response_id`
     - `status`
     - `output`
     - `required_action.submit_tool_outputs.tool_calls`
3. **store record 输入**
   - Batch 04 后，fallback store record 必须基于 canonical response。
   - pipeline store 只吃 canonical response。
   - 不允许 store helper 直接依赖 anthropic 原始 wire shape。
4. **显式失败**
   - 若 provider response 出现 continuation/tool_use 信号，但映射后缺 response_id，必须显式失败。
5. **本批次不做**
   - anthropic SSE response normalize
   - gemini/openai 其它 provider response normalize 扩展
   - 完整 output 多模态/图片/思维链映射

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_BATCH_04.md`
2. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
3. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
4. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-domain::compat_mapping`
   - anthropic provider response -> canonical response normalize
2. `rcc-core-compat`
   - 继续只做薄调用，不承接额外业务语义
3. `rcc-core-orchestrator`
   - fallback store record 改吃 canonical response，而不是 provider raw body
4. `tests`
   - anthropic native tool_use response -> canonical required_action
   - anthropic native text response -> canonical completed output
   - create(response anthropic native) -> store record -> submit_tool_outputs(response_id only) 恢复闭环

## 当前验证入口
- 文档/技能 gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- 基础回归：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- Batch 04 关闭前，至少要补 compat + orchestrator 的 anthropic native response normalize 回归。
