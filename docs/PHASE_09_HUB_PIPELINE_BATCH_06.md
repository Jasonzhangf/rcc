# Phase 09 Hub Pipeline Batch 06

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 06 的 docs-first 闭环范围。
- L10-L24 `scope`：Batch 06 锁定 cross-protocol audit matrix 的最小 Rust 边界。
- L26-L35 `deliverables`：本批次进入实现前必须具备的真源与代码目标。
- L37-L41 `verification`：Batch 06 文档与实现验证入口。

## 目标
把旧仓 `responses cross-protocol dropped/lossy audit matrix` 的最小语义，落成 Rust 纯函数真源与最小 smoke gate。

本批次固定主线：

```text
responses request payload
  -> canonical/shared audit helper
  -> target protocol audit matrix
  -> dropped / lossy / unsupported / preserved evidence
```

## 本批次锁定范围
1. **cross-protocol audit matrix 最小 Rust 对齐**
   - 至少覆盖：
     - `anthropic-messages`
     - `gemini-chat`
2. **最小字段矩阵**
   - dropped：
     - `prompt_cache_key`
     - `parallel_tool_calls`
     - `service_tier`
     - `truncation`
     - `include`
     - `store`
   - lossy：
     - `reasoning`
   - unsupported：
     - `response_format`
   - preserved：
     - `tool_choice`
3. **边界**
   - Batch 06 只做 audit helper 与回归 gate。
   - 不在本批次把 audit 强塞进 host/orchestrator/provider runtime。
4. **比较口径**
   - 只要求：
     - field
     - disposition
     - reason
     - source/target protocol
   - 不做 legacy mirror、不做完整 chat semantics 结构重放。
5. **本批次不做**
   - protocolMapping legacy mirror
   - runtime executor 透传 audit bundle
   - 全量 cross-provider sample replay

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_BATCH_06.md`
2. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
3. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
4. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-domain`
   - 新增 responses cross-protocol audit helper，作为纯函数真源。
2. `rcc-core-testkit`
   - 新增 phase9 batch06 audit matrix smoke。
3. `scripts`
   - 新增 `scripts/verify_phase9_hub_pipeline_batch06.sh` 作为本批次唯一实现 gate。
4. `CI`
   - Phase 09 CI 默认复用 Batch 06 gate。

## 当前验证入口
- 文档/技能 gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- Batch 06 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch06.sh`
- Batch 06 关闭前，必须有 anthropic/gemini 两个 target protocol 的最小 audit matrix 证据。
