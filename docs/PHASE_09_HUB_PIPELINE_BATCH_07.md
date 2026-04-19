# Phase 09 Hub Pipeline Batch 07

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 07 的 docs-first 闭环范围。
- L10-L24 `scope`：Batch 07 锁定 protocol mapping audit sidecar 的最小接线边界。
- L26-L35 `deliverables`：本批次进入实现前必须具备的真源与代码目标。
- L37-L41 `verification`：Batch 07 文档与实现验证入口。

## 目标
把 Batch 06 的 pure-function audit truth，最小接到 canonical outbound / compat carrier 边界；
保持 audit 只作为 **sidecar 观测语义** 存在，不进入 provider runtime 业务、不进入 wire body。

本批次固定主线：

```text
responses request payload
  -> canonical outbound sidecar
  -> compat projects to ProviderRequestCarrier.metadata
  -> provider transport ignores audit sidecar for request body
```

## 本批次锁定范围
1. **audit sidecar 挂载位置**
   - 新 sidecar 挂在 `HubCanonicalOutboundRequest`。
   - sidecar 只承载 protocol mapping audit，不承载 provider runtime 状态。
2. **compat 投影边界**
   - compat 只把 audit 投影到 `ProviderRequestCarrier.metadata.protocol_mapping_audit`。
   - audit 不得进入 `ProviderRequestCarrier.body`，不得改写真实传输 payload 语义。
3. **orchestrator 装配边界**
   - orchestrator 只负责：根据 `target_provider_id` 选择 target protocol，并调用 pure-function audit helper 组装 sidecar。
   - 不把 audit 业务塞进 host/provider runtime。
4. **最小 target**
   - `responses -> anthropic`：必须完成 outbound carrier sidecar 接线与断言。
   - `responses -> gemini`：必须完成 sidecar 纯函数装配口径；若 compat target 仍未开放，保持显式边界，不做伪 projection。
5. **本批次不做**
   - provider runtime 消费 audit sidecar
   - transport 请求体透传 audit
   - gemini provider body mapping 真正落地
   - legacy audit mirror / sample replay 扩围

## 进入实现前必须具备的真源
1. `docs/PHASE_09_HUB_PIPELINE_BATCH_07.md`
2. `docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md`
3. `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
4. `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`

## 进入实现时的最小代码目标
1. `rcc-core-domain`
   - 为 `HubCanonicalOutboundRequest` 增加 audit sidecar。
   - 增加 audit sidecar -> provider metadata 的纯函数投影 helper。
2. `rcc-core-orchestrator`
   - 在 responses canonical 主线装配 audit sidecar，但只做装配，不承接 audit truth。
3. `rcc-core-testkit`
   - 新增 phase9 batch07 smoke，验证 carrier metadata 有 audit，request body 无 audit。
4. `scripts`
   - 新增 `scripts/verify_phase9_hub_pipeline_batch07.sh` 作为本批次唯一实现 gate。
5. `CI`
   - Phase 09 CI 默认复用 Batch 07 gate。

## 当前验证入口
- 文档/技能 gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- Batch 07 实现 gate：`bash scripts/verify_phase9_hub_pipeline_batch07.sh`
- Batch 07 关闭前，必须同时证明：
  - anthropic carrier metadata 已挂载 `protocol_mapping_audit`
  - provider request body 不含 `protocol_mapping_audit`
  - gemini sidecar 口径仍由 pure-function audit truth 驱动
