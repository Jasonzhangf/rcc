# Phase 07 Responses Ingress Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 `/v1/responses` 当前批次的缺口盘点真源。
- L10-L18 `reused`：当前可直接复用的 block / 函数。
- L20-L31 `missing-functions`：当前批次必须先补的纯函数缺口。
- L33-L42 `missing-blocks`：当前批次必须先补的 block 缺口与可延后项。
- L44-L48 `rule`：缺口驱动的实施规则。

## 目标
在进入 `/v1/responses` ingress 实现前，先判断当前主线是否真的缺 block 和函数。缺就补最小真源；不缺就直接继续接线，避免在 host 内偷长业务语义或重复包装。

## 当前可直接复用的部分
1. `rcc-core-host`
   - 已有 `serve` / `/healthz` / `/smoke` / `/requests` / `/chat` 的最小 HTTP shell。
2. `rcc-core-orchestrator`
   - 已有 `handle(RequestEnvelope)` 的统一入口。
3. `rcc-core-pipeline`
   - 已有最小 `prepare()` skeleton，可作为后续 hub pipeline 演进前的临时承接点。
4. `rcc-core-router`
   - 已有最小 `select()` shell，可作为后续 virtual router 演进前的临时承接点。
5. `rcc-core-provider`
   - 已有 `NoopProviderRuntime` 与 transport/auth/runtime 相关最小能力。

## 当前批次必须先补的纯函数缺口
1. **responses 入站 normalize**
   - 输入：`POST /v1/responses` body
   - 输出：最小 canonical request 形状
   - 作用：避免 host 里散落多段手写字段提取。
2. **responses 最小响应 shell serialize**
   - 输入：当前最小 canonical response / smoke result
   - 输出：最小 responses-style JSON
   - 作用：让 `/v1/responses` 的 response shape 可测试、可复用。
3. **可选 routing hint 提取 helper**
   - 仅当 `/v1/responses` 第一批需要显式 route hint 时再补；若当前不需要，不提前实现。

## 当前批次必须先补的 block 缺口
1. **当前批次不强制新增 block**
   - `/v1/responses` 第一批先做 ingress server 处理，允许暂时复用已有 `orchestrator -> pipeline/router/provider` skeleton 主链。
2. **明确缺失但延后到后续批次的 block**
   - `virtual router` authoritative input block
   - `hub pipeline` 的 `inbound`
   - `hub pipeline` 的 `chat process`
   - `hub pipeline` 的 `outbound`
3. **规则**
   - 这些 block 的缺失在当前批次被记录为“后续真源缺口”，但不允许通过在 host 内补业务逻辑来伪造完成。

## 缺口驱动实施规则
1. 先看是否缺纯函数；缺就先补到适合的位置，优先 `rcc-core-domain`。
2. 再看是否缺 block；只有当当前批次真的依赖该 block 才补最小 skeleton。
3. 若当前批次不依赖该 block，则明确记录为后续批次缺口，不提前实现。
4. 不允许因为缺口未补，而把 router/pipeline/provider 语义偷偷塞进 host。

## 当前批次收口结果
1. 已补齐纯函数真源：`rust/crates/rcc-core-domain/src/responses_ingress.rs`
   - `normalize_responses_ingress_body`
   - `build_responses_request_envelope`
   - `serialize_responses_shell`
2. 当前批次仍未新增独立 block；`virtual router` 与 `hub pipeline` 的 authoritative block 继续留在后续批次。
3. 当前实现验收入口：`bash scripts/verify_phase7_host_server_batch04.sh`
