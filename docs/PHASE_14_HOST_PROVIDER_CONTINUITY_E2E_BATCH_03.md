# Phase 14 Host Provider Continuity E2E Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L35 `flow`：ordinary `previous_response_id` continuity 与 explicit failure 的正确位置。
- L37-L42 `boundaries`：本批次明确不做的内容。
- L44-L48 `verification`：当前批次验证入口。

## 目标
把 **host 安装态 ordinary `previous_response_id` continuity** 和 **store miss 显式失败** 收口：

1. anthropic 链路继续走 chat-process fallback materialize；
2. provider request 看到 materialized messages，而不是原始 `previous_response_id`；
3. 若 store miss，host 响应必须显式 `failed`，不得静默继续请求；
4. shell continuity 字段要保持可观测。

## 本批次最小范围
1. 参考已有真源：
   - `rust/crates/rcc-core-pipeline/src/lib.rs`
   - `canonical_pipeline_materializes_route_aware_previous_response_id_for_cross_provider`
   - `canonical_pipeline_returns_explicit_error_for_unknown_response_id_restore`
   - `rust/crates/rcc-core-domain/src/continuation_semantics.rs`
2. 本批次只允许新增：
   - host install E2E ordinary continuation fixture
   - fallback materialize provider request 断言
   - store miss explicit failure 断言
   - 对应 verify gate
3. 允许的输出：
   - 命中 store：`status == completed` 或 `requires_action`
   - provider request 不含原始 `previous_response_id`
   - miss store：`status == failed`
   - 响应体含明确 failure message
4. 只补最小断言，不新增第二套 store、sidecar 或 runtime。

## 正确流水线位置
```text
POST /v1/responses(previous_response_id)
  -> pipeline response-id keyed restore
  -> chat-process fallback materialize
  -> compat/provider execute
  -> host shell projects continuity / failure status
```

## 本批次明确不做
1. 不做 openai/responses provider-native delta continuity 安装态矩阵。
2. 不做多 provider install matrix。
3. 不做 host-side retry / daemon / background cache。
4. 不新增第二套 shell mapper。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
- 当前实现 gate：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh`
