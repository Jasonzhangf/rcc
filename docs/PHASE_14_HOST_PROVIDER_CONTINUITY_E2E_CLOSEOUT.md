# Phase 14 Host Provider Continuity E2E Closeout

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 14A 的 closeout 真源。
- L10-L27 `migrated`：当前已迁入的安装态 continuity 真源。
- L29-L49 `remaining`：部分覆盖 / 尚未迁入的 continuity 安装态矩阵。
- L51-L56 `out-of-scope`：明确不属于当前阶段的范围。
- L58-L65 `done`：Phase 14A 完成标准与后续入口。

## 目标
给 Phase 14A 做阶段性关闭说明：

1. 哪些 host/provider 安装态 continuity 主线已经迁入并有真实 gate；
2. 哪些 continuity install matrix 仍在 backlog，但不阻塞当前阶段关闭；
3. 当前阶段为什么可以在 batch05 收口。

## 已迁入安装态 continuity 真源
1. host 安装态 anthropic create-turn continuity shell
   - 新仓落点：
     - `scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh`
     - `rust/crates/rcc-core-host/src/lib.rs`
     - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - 已证明：
     - `/v1/responses` create-turn 命中真实 upstream
     - `requires_action / id / required_action / provider_runtime / route` 在 shell 可观测
     - anthropic request 看到 canonical `messages`，不泄漏原始 `input` shape
2. host 安装态 `submit_tool_outputs` response-id restore continuity
   - 新仓落点：
     - `scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh`
     - `rust/crates/rcc-core-pipeline/src/lib.rs`
     - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
   - 已证明：
     - `response_id` keyed restore 命中 pipeline store
     - anthropic request 只看到 materialized `tool_use + tool_result`
     - transport payload 不泄漏 `response_id` / `tool_outputs`
3. host 安装态 ordinary `previous_response_id` fallback continuity + explicit failure
   - 新仓落点：
     - `scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh`
     - `rust/crates/rcc-core-pipeline/src/lib.rs`
     - `rust/crates/rcc-core-domain/src/responses_conversation.rs`
   - 已证明：
     - ordinary `previous_response_id` 命中 fallback materialize
     - anthropic request 看到 full messages，不泄漏 `previous_response_id`
     - store miss 时 host 返回显式 `failed`
     - miss path 不会继续调用 upstream
4. Phase 14A 统一安装态回归入口
   - `bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh`
   - 收口 batch01~03 gate，供本地与 CI 复用。

## 部分覆盖 / 尚未迁入矩阵
1. provider-native openai/responses delta continuation install matrix：
   - same-provider native delta 的安装态真实 upstream 还未单独迁批。
2. SSE / streaming continuity install matrix：
   - `/v1/responses` stream / SSE continuity 尚未进入 Phase 14A。
3. multi-provider install matrix：
   - anthropic 之外的 gemini / openai 安装态 continuity E2E 尚未逐个收口。
4. provider-specific stage2 continuity assert：
   - 更深 provider semantic / runtime-specific continuity 行为尚未在安装态矩阵中展开。
5. 这些矩阵未迁入的原因：
   - 不是当前 Phase 14A 的最小主线
   - 依赖更深的 provider-native / stream-specific 真源
   - 应在后续阶段按 block/domain/provider 真源继续拆批迁移，而不是在 closeout 批次扩 scope

## 非当前阶段目标
1. 第二套 host/provider conversation store。
2. daemon / sidecar / background worker continuity 机制。
3. health/failover/cooldown/quota continuity install matrix。
4. 为测试目的改写真实 transport payload 语义。

## Phase 14A 完成标准
1. docs / routing / skill / gap inventory 已完整落盘。
2. batch01~03 安装态 continuity 主线已迁入并各自有 gate。
3. batch04 已提供统一入口。
4. batch05 已提供 closeout gate，并明确 backlog 与 out-of-scope。
5. 现阶段后续入口：
   - provider-native openai/responses continuity install E2E
   - SSE / streaming continuity install matrix
   - multi-provider continuity install matrix
   - provider-specific stage2 continuity/runtime 语义回归
