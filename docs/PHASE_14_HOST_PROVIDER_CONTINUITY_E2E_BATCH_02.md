# Phase 14 Host Provider Continuity E2E Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L33 `flow`：host 安装态 `submit_tool_outputs` continuity 的正确位置。
- L35-L40 `boundaries`：本批次明确不做的内容。
- L42-L45 `verification`：当前批次验证入口。

## 目标
把 **host 安装态 `submit_tool_outputs` -> response-id keyed restore -> anthropic fallback materialize** 打通：

1. 第二跳只认 `response_id` 真源；
2. provider request 看到的是 materialized canonical messages；
3. provider request 不得泄漏 `response_id` / `tool_outputs` 原始 shape；
4. host shell 最终回到 completed。

## 本批次最小范围
1. 参考已有真源：
   - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
   - `rust/crates/rcc-core-pipeline/src/lib.rs`
   - `from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only`
2. 本批次只允许新增：
   - host install E2E 两跳 fixture
   - response-id restore 断言
   - provider request invariance 断言
   - 对应 verify gate
3. 允许的输出：
   - 第一步 `status == requires_action`
   - 第二步 `status == completed`
   - provider request 含 `tool_use + tool_result`
   - provider request 不含 `response_id` / `tool_outputs`

## 正确流水线位置
```text
create turn -> response store remember(response_id)
submit_tool_outputs(response_id)
  -> pipeline restore by response_id
  -> chat-process fallback materialize
  -> compat anthropic messages mapping
  -> provider execute
```

## 本批次明确不做
1. 不做 ordinary `previous_response_id` continuity。
2. 不新增 request-id rebind 或第二套 store。
3. 不把 restore 逻辑搬进 host / compat / provider。
4. 不做 streaming / SSE。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
- 当前实现入口：`docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md`
