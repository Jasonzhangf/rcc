# Phase 08 Responses Compat Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 responses 主线进入 compat 时的缺口盘点真源。
- L10-L26 `current-state`：当前已具备和仍缺失的结构。
- L28-L48 `missing-pieces`：当前批次必须补齐的最小 block / pure function。
- L50-L57 `non-goals`：当前批次明确不做的内容。
- L59-L64 `done-signal`：进入实现与完成批次的判据。

## 目标
在进入 `hub pipeline -> compat -> provider` 的最小实现前，先判断当前主线是否真的缺 block 和函数。缺就补最小真源；不缺就直接继续接线，避免把 compat 语义偷偷塞进 host、pipeline、provider 或 orchestrator。

## 当前状态
1. `rcc-core-host`
   - 已完成 `/v1/responses` ingress shell。
2. `rcc-core-router`
   - 已完成 virtual router skeleton，并在 orchestrator 中先于 pipeline 执行。
3. `rcc-core-pipeline`
   - 已完成 `inbound / chat process / outbound` skeleton。
4. `rcc-core-provider`
   - 已有 transport/auth/runtime 相关 helper 与 noop runtime。
   - 已明确只消费 `ProviderRequestCarrier`。
   - **缺口**：provider runtime 仍未提供 gemini 动态 endpoint / response normalize，这部分不能倒灌给 compat。
5. `rcc-core-orchestrator`
   - 已有 `router -> pipeline -> compat -> provider` 主链。
   - 已验证 gemini target 经过 compat 的最小 request projection。
6. `rcc-core-compat`
   - Batch 02 已补齐 crate 与最小 mapper。
   - Batch 03 已补齐 route handoff sidecar。
   - Batch 04 已补齐 gemini provider-family request projection。
   - **新缺口**：compat block 仍偏函数分支驱动，尚未完全收敛成薄骨骼 + spec 调用。
7. `rcc-core-domain`
   - 已有 compat carrier DTO、anthropic mapping、gemini mapping、audit sidecar metadata helper。
   - **新缺口**：anthropic/gemini provider-family request projection 虽会进入 **共享 projection engine + spec/JSON rules** 的 shared module，但仍需继续把 tool declaration / tool result field rules 从 helper 流程里抽薄。

## 当前批次最小缺口
1. 锁定 compat 收敛真源：`docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`。
2. 明确哪些 projection 必须继续留在代码：
   - projection executor
   - schema validation
   - audit sidecar builder
   - 显式错误边界
3. 明确哪些 projection 必须优先下沉成 spec/JSON：
   - 字段 rename / alias
   - enum 映射
   - allow/drop/lossy 规则
   - `contents / systemInstruction / functionDeclarations / functionResponse` 的静态 shape 投影
4. 新增 batch05 gate，证明：
   - 收敛设计已落盘
   - batch04 既有实现仍通过
   - 后续 compat 实现有唯一架构入口
5. 新增 batch06 gate，证明：
   - request-side shared projection module 已落盘
   - anthropic / gemini request projection 已接到 spec skeleton
   - 既有 request shape 与 audit sidecar 边界没有回归
6. 新增 batch07 gate，证明：
   - role rules 与 part kind rules 已进入 rule 层
   - request-side content/tool 静态规则不再散落在多个 helper 中
   - 既有 request shape 与 audit sidecar 边界没有回归
7. 新增 batch08 gate，证明：
   - tool declaration / tool result field rules 已进入 rule 层
   - request-side tool declaration / tool result 静态字段不再散落在多个 helper 中
   - 既有 request shape 与 audit sidecar 边界没有回归
8. audit sidecar 继续只投影到 `ProviderRequestCarrier.metadata`，不得进入 request body。

## 当前批次明确不做
1. 不重写现有 anthropic/gemini projection 实现。
2. 不做 gemini real execute endpoint 动态路径。
3. 不做 response normalize 全量 spec 化。
4. 不做 stream/SSE 事件级 projection。
5. 不把 continuation policy、tool governance、transport/auth/runtime 下放成 JSON。

## 进入实现 / 完成信号
1. docs 与 skill 已明确 compat 的位置、边界、最小输入输出与收敛目标。
2. 若发现缺 block 或缺 pure function，必须先补齐再接线。
3. `bash scripts/verify_phase8_compat_block_batch04.sh` 证明当前实现无回归。
4. `bash scripts/verify_phase8_compat_block_batch05.sh` 证明收敛设计与 gate 已闭环。
5. `bash scripts/verify_phase8_compat_block_batch06.sh` 证明 request-side spec skeleton 与实现闭环已通过。
6. `bash scripts/verify_phase8_compat_block_batch07.sh` 证明 content/tool rule extraction 与实现闭环已通过。
7. `bash scripts/verify_phase8_compat_block_batch08.sh` 证明 tool field rules extraction 与实现闭环已通过。
