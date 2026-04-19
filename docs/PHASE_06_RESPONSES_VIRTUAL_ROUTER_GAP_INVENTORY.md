# Phase 06 Responses Virtual Router Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 responses 主线进入 virtual router 时的缺口盘点真源。
- L10-L20 `reused`：当前可直接复用的 block / 函数。
- L22-L34 `missing-functions`：当前批次必须先补的纯函数缺口。
- L36-L50 `missing-blocks`：当前批次必须先补的 block 缺口与顺序缺口。
- L52-L56 `rule`：缺口驱动的实施规则。

## 目标
在进入 `responses ingress -> virtual router` 的最小实现前，先判断当前主线是否真的缺 block 和函数。缺就补最小真源；不缺就直接继续接线，避免把 virtual router 语义偷偷塞进 host、provider、servertool 或 orchestrator。

## 当前可直接复用的部分
1. `rcc-core-host`
   - 已有 `POST /v1/responses` 的最小 ingress shell。
2. `rcc-core-domain`
   - 已有 `responses_ingress`：
     - `normalize_responses_ingress_body`
     - `build_responses_request_envelope`
     - `serialize_responses_shell`
   - 已有 router 侧可复用的纯 helpers：
     - `message_utils`
     - `tool_signals`
     - `context_weighted`
     - `health_weighted`
     - `context_advisor`
3. `rcc-core-router`
   - 已有 Batch 01/02 最小真源：
     - `build_route_candidates`
     - `filter_candidates_by_routing_state`
     - `resolve_instruction_target`
     - `reorder_for_capability`
     - `reorder_for_preferred_model`
4. `rcc-core-orchestrator`
   - 已有 `handle(RequestEnvelope)` 的统一装配入口。
5. `rcc-core-pipeline`
   - 已有 `prepare()` skeleton，可继续作为后续 hub pipeline 演进前的临时承接点。
6. `rcc-core-provider`
   - 已有 noop runtime，可作为后续主线尾部的临时承接点。

## 当前批次必须先补的纯函数缺口
1. **router payload decode / normalize**
   - 已补到：`rust/crates/rcc-core-domain/src/router_selection_input.rs::normalize_router_request_payload`
2. **responses/chat/request 统一的 route hint 提取 helper**
   - 已补到：`rust/crates/rcc-core-domain/src/router_selection_input.rs::extract_router_request_hints`
3. **最小 request feature extract helper**
   - 已补到：`rust/crates/rcc-core-domain/src/router_selection_input.rs::extract_router_request_hints`
   - 当前最小输出已覆盖：
     - `requested_route`
     - `classification_candidates`
     - `explicit_target_block`
     - `has_image_attachment`
     - `has_video_attachment`
     - `has_remote_video_attachment`

## 当前批次必须先补的 block 缺口
1. **virtual router authoritative input block**
   - 已补到：`rust/crates/rcc-core-router/src/lib.rs::build_select_input`
   - 当前最小 authoritative 输入为：
     - `operation`
     - `explicit_target_block`
     - `requested_route`
     - `classification_candidates`
     - `RouteFeatures`
2. **virtual router authoritative select shell**
   - 已补到：`rust/crates/rcc-core-router/src/lib.rs::select`
   - 当前最小规则：
     - 先尊重显式 `target_block`
     - 再按 `tool.` / `clock.` 前缀归到 `servertool`
     - 其余归到 `pipeline`
3. **顺序缺口：orchestrator 当前仍是 pipeline 在前**
   - 已修正为：`router.select(&request) -> pipeline.prepare(request)`
   - 当前仍未完成的是 hub pipeline 真源本身，而不是 router 前置顺序。
4. **当前批次明确延后的 block**
   - hub pipeline `inbound`
   - hub pipeline `chat process`
   - hub pipeline `outbound`
   - provider route-to-runtime 细化
5. **当前新增最小 handoff 缺口**
   - router 虽已给出 `selected_route`，但 provider downstream 真正可消费的 target 还未暴露。
   - 应先补到 router 真源侧：`selected_route -> selected_target`
   - 不允许因为这个缺口，而在 compat/provider/orchestrator 里重算 target。

## 缺口驱动实施规则
1. 先看是否缺纯函数；缺就先补到适合的位置，优先 `rcc-core-domain`。
2. 再看是否缺 block；只有当当前批次真的依赖该 block 才补最小 skeleton。
3. 若当前批次不依赖该 block，则明确记录为后续批次缺口，不提前实现。
4. 不允许因为缺口未补，而把 router/pipeline/provider 语义偷偷塞进 host 或 orchestrator。

## 当前批次收口结果
1. 已补齐纯函数真源：`rust/crates/rcc-core-domain/src/router_selection_input.rs`
2. 已补齐 router authoritative input/select 壳：`rust/crates/rcc-core-router/src/lib.rs`
3. 已修正 router 在 pipeline 前的最小顺序：`rust/crates/rcc-core-orchestrator/src/lib.rs`
4. 当前实现验收入口：`bash scripts/verify_phase6_router_batch03.sh`
