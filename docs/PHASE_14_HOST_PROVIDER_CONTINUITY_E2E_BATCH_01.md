# Phase 14 Host Provider Continuity E2E Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L21 `scope`：本批次允许进入实现的最小范围。
- L23-L31 `flow`：host 安装态 anthropic create-turn continuity 的正确位置。
- L33-L38 `boundaries`：本批次明确不做的内容。
- L40-L43 `verification`：当前批次验证入口。

## 目标
把 **host 安装态 `/v1/responses` -> anthropic provider create-turn** 先打成最小真实 continuity 闭环：

1. 真实 upstream 返回 `tool_use / requires_action`；
2. host responses shell 薄投影出 `id` / `required_action` / `provider_runtime`；
3. 安装态证据证明 continuity 第一跳真的被记录，而不是只在 orchestrator 单测里通过。

## 本批次最小范围
1. 参考已有真源：
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only`
   - `rust/crates/rcc-core-domain/src/responses_ingress.rs`
   - `rust/crates/rcc-core-pipeline/src/lib.rs`
2. 本批次只允许新增：
   - host install E2E fixture / smoke
   - create-turn shell continuity 断言
   - 对应 verify gate
3. 目标文件规划：
   - `scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
   - `.github/workflows/phase14-host-provider-continuity-e2e.yml`
4. 允许的输出：
   - `status == requires_action`
   - `id != null`
   - `required_action.submit_tool_outputs.tool_calls[*]`
   - `provider_runtime == transport-runtime`
   - route / selected_target 可观测

## 正确流水线位置
```text
POST /v1/responses(create turn)
  -> host ingress shell
  -> orchestrator/router/pipeline/compat/provider
  -> anthropic upstream returns tool_use
  -> host shell projects id + required_action
```

## 本批次明确不做
1. 不做 `submit_tool_outputs` 第二跳。
2. 不做 ordinary `previous_response_id` continuity。
3. 不在 host 内新增 conversation store 或 response cache。
4. 不做 SSE / streaming / auth layer。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase14_host_provider_continuity_e2e.py`
- 当前实现阶段入口：`bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
