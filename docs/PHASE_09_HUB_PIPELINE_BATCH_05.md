# Phase 09 Hub Pipeline Batch 05

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 05 的 docs-first 闭环范围。
- L10-L23 `scope`：Batch 05 锁定旧仓 matrix regression 的最小 Rust 对齐范围。
- L25-L34 `deliverables`：本批次进入实现前必须具备的真源与代码目标。
- L36-L40 `verification`：Batch 05 文档与实现验证入口。

## 目标
把旧仓 Phase 09 相关的核心矩阵回归，先以 **最小 Rust 样例矩阵** 的方式接进新骨架。

本批次固定主线：

```text
responses request
  -> hub canonical
  -> anthropic outbound request
  -> anthropic native tool_use response
  -> canonical response
  -> response_id restore submit_tool_outputs
  -> anthropic outbound request
```

## 本批次锁定范围
1. **旧仓 matrix tests / old仓 matrix tests 最小 Rust 对齐**
   - 至少覆盖：
     - anthropic responses roundtrip
     - responses continuation / submit_tool_outputs
     - hub I/O compare 最小样例
2. **比较基准**
   - 只比较 canonical 语义与关键投影字段：
     - 文本语义
     - tool call `name + arguments`
     - `response_id`
     - `required_action.submit_tool_outputs.tool_calls`
   - 不做 byte-level payload 完全一致性比较。
3. **样例来源**
   - 本批次优先使用 repo 内 synthetic payload，禁止依赖用户 HOME 或外部 codex samples 才能通过。
4. **边界**
   - matrix regression 仍然服务于 `responses -> canonical -> anthropic` 主线。
   - 不在本批次扩展 gemini/openai-chat/openai-responses native 全矩阵。
5. **本批次不做**
   - 真实 sample 目录扫描
   - anthropic SSE 回放矩阵
   - cross-protocol audit 全量矩阵
   - `v2-consistency` 全量替代

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_BATCH_05.md`
2. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
3. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
4. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-testkit`
   - 新增 phase9 batch05 matrix smoke，覆盖 create -> normalize -> store -> restore -> submit 闭环。
2. `rcc-core-domain`
   - 补最小 roundtrip / semantic compare 单测，验证 anthropic tool_use normalize 后的关键语义不漂移。
3. `scripts`
   - 新增 `scripts/verify_phase9_hub_pipeline_batch05.sh` 作为本批次唯一实现 gate。
4. `CI`
   - Phase 09 CI 默认复用 Batch 05 gate。

## 当前验证入口
- 文档/技能 gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- Batch 05 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch05.sh`
- Batch 05 关闭前，必须具备旧仓 matrix tests 的最小 Rust 对齐证据，且不依赖外部 sample 目录。
