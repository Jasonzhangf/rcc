# Phase 10 Responses Provider Execute Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 responses 主线进入真实 provider execute 时的缺口盘点真源。
- L10-L20 `current-state`：当前已具备和仍缺失的结构。
- L22-L30 `missing-pieces`：本批次必须补齐的最小 block / function。
- L32-L37 `non-goals`：当前批次明确不做的内容。
- L39-L43 `done-signal`：进入实现与完成批次的判据。

## 目标
在进入真实 provider execute 主线 integration 前，先判断当前主线是否真的缺 block 和函数。缺就补最小真源；不缺就继续接线，避免把 transport/auth/runtime 语义偷偷塞进 compat、host 或 orchestrator。

## 当前状态
1. `rcc-core-provider`
   - 已完成 transport request plan、HTTP execute、runtime metadata、SSE transport 的 block 真源。
   - **缺口**：当前顶层 mainline runtime 仍是 `NoopProviderRuntime`，没有真实 transport execute runtime。
2. `rcc-core-orchestrator`
   - 已完成 `router -> pipeline -> compat -> provider` 主链。
   - **缺口**：provider runtime 仍固定为 noop，缺少最薄注入能力。
3. `rcc-core-compat`
   - 已完成 canonical request/response <-> provider carrier mapping。
   - **新缺口**：router 的最小 route result 尚未进入 provider runtime 可消费的 carrier sidecar。
4. `rcc-core-host`
   - 已完成 `/v1/responses` ingress shell。
   - **新缺口**：缺少一条安装态 `/v1/responses` 命中 selected_target runtime registry 的端到端证据。
5. `rcc-core-testkit`
   - 已有 provider block smoke 与 mainline smoke。
   - **缺口**：缺少一条 responses 主线真实 HTTP execute smoke。

## 本批次最小缺口
1. 在 `rcc-core-provider` 新增一个最薄 `TransportProviderRuntime`，复用现有 provider block 能力。
2. 在 `rcc-core-orchestrator` 提供最薄 provider runtime 注入能力。
3. 在 `rcc-core-testkit` 增加一条基于本地 HTTP fixture 的 responses 主线 real execute smoke。
4. 在 phase10 gate 中收口 docs / skills / integration tests。
5. 补齐 route handoff provider contract，并证明 transport payload 未被 handoff 改写。
6. 补齐 selected_target -> provider runtime registry bind，并确保 miss 时显式失败。
7. 补齐 host `/v1/responses` 安装态 selected_target hit/miss 闭环证据。
8. 补齐 canonical 主线的 target provider family truth：若 typed config/runtime registry bootstrap 已可分辨目标协议族，优先消费该真源，不再继续依赖 target 名称或 model 前缀猜测。

## 当前批次明确不做
1. 不做 host 运行时配置系统。
2. 不做 streaming / SSE 主线 integration。
3. 不做多 provider 动态选择。
4. 不做 provider health / failover / cooldown。
5. 不把 route handoff 注入真实 request body。
6. 不在 orchestrator/compat 内复制 runtime registry bind。
7. 不把 host ingress shell 扩展成 provider 调度层。

## 进入实现 / 完成信号
1. docs 与 skill 已明确 phase10 主线 integration 的位置、边界、最小输入输出。
2. 若发现缺 block 或缺 pure function，必须先补齐再接线。
3. `bash scripts/verify_phase10_responses_provider_execute_batch02.sh` 通过，才算 route handoff sidecar 批次闭环。
4. `bash scripts/verify_phase10_responses_provider_execute_batch03.sh` 通过，才算 target bind 批次闭环。
5. `bash scripts/verify_phase10_responses_provider_execute_batch04.sh` 通过，才算 host 安装态 `/v1/responses` 闭环。
6. 若 selected target 已存在 registry/bootstrap 真源，则 canonical outbound target provider family 必须优先消费该 bootstrap truth；heuristic 只能作为非 config 场景兜底。
