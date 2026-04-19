# Phase 10 Responses Provider Execute Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L34 `flow`：host `/v1/responses` 安装态主链的正确位置。
- L36-L43 `boundaries`：本批次明确不做的内容。
- L45-L51 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 03 selected_target runtime bind 的前提下，把 **host 安装态 `/v1/responses` 主链** 真正打通：

1. host `/v1/responses` 继续只做 ingress shell；
2. 真实请求经 `router -> pipeline -> compat -> provider runtime registry` 命中 selected target；
3. selected target 缺失时，host 响应必须保留显式失败状态，不做静默 fallback。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md`
   - `docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
   - `scripts/verify_phase10_responses_provider_execute_batch04.sh`
   - `.github/workflows/phase10-responses-provider-execute.yml`
2. 本批次只锁三段新语义：
   - host `/v1/responses` 安装态命中 selected_target runtime registry
   - selected_target 命中后返回真实 upstream 响应
   - selected_target 缺失时 `/v1/responses` 返回显式 failed status
3. 允许的输入：
   - host `serve`
   - `POST /v1/responses`
   - config/bootstrap 驱动的 router + provider runtime registry
4. 允许的输出：
   - host responses-style JSON shell
   - `route.selected_target`
   - `provider_runtime == transport-runtime`
   - 缺失 target 时 `status == failed`
5. 当前批次最小实现结果：
   - 安装态 host `/v1/responses` 命中真实 selected target upstream
   - host `/v1/responses` 显式透出 missing-target failed status

## 正确流水线位置
```text
POST /v1/responses
  -> rcc-core-host ingress shell
  -> rcc-core-orchestrator
  -> rcc-core-router
  -> rcc-core-pipeline
  -> rcc-core-compat
  -> rcc-core-provider(runtime registry bind by selected_target)
  -> upstream transport runtime
```

## 本批次明确不做
1. 不在 host 内复制 provider/runtime bind 语义。
2. 不做 SSE / streaming / host-side retry / auth layer。
3. 不做 health / failover / cooldown / quota。
4. 不做 daemon、sidecar、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase10_responses_provider_execute.py`
- 当前实现阶段入口：`bash scripts/verify_phase10_responses_provider_execute_batch04.sh`
- 当前缺口盘点真源：`docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-orchestrator -p rcc-core-config -p rcc-core-compat -p rcc-core-domain -p rcc-core-testkit -p rcc-core-host`
