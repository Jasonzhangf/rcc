# Phase 09 Responses Hub Pipeline Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 responses 主线进入 hub pipeline 时的缺口盘点真源。
- L10-L19 `reused`：当前可直接复用的 block / 函数。
- L21-L33 `missing-functions`：Batch 02 进入实现前必须先补的纯函数缺口。
- L35-L47 `missing-blocks`：Batch 02 进入实现前必须先补的 block 缺口。
- L49-L55 `regression-gap`：旧仓矩阵回归对齐缺口。
- L57-L61 `rule`：缺口驱动的实施规则。

## 目标
在进入 `virtual router -> hub pipeline -> compat -> provider` 的真实语义实现前，先判断当前主线是否真的缺 block 和函数。缺就补最小真源；不缺就直接继续接线，避免把 hub pipeline 语义偷偷塞进 router、compat、provider 或 host。

## 当前可直接复用的部分
1. `rcc-core-host`
   - 已有 `POST /v1/responses` 的最小 ingress shell。
2. `rcc-core-router`
   - 已有 responses 主线下的最小 authoritative select shell。
3. `rcc-core-pipeline`
   - 已有 `inbound / chat process / outbound` skeleton，可作为 Batch 02 真源承接点。
4. `rcc-core-domain`
   - 已有 `hub_pipeline_skeleton` 纯函数，可作为 canonical IR 前的临时承接点。
5. `rcc-core-provider`
   - 已有 runtime registry、selected target runtime bind、最小 execute/sse/runtime metadata 基础设施。

## Batch 02 必须先补的纯函数缺口
1. **hub canonical IR**
   - 目标位置：`rcc-core-domain`
   - 需求：定义 request/message/content/tool/tool-result/response 的共享语义结构。
2. **shared mapping ops**
   - 目标位置：`rcc-core-domain`
   - 需求：字段 rename / enum_map / array_map / content/tool projection / audit 记录；默认 no-copy / minimal-copy。
3. **continuation capability selector**
   - 目标位置：`rcc-core-domain`
   - 需求：根据 provider identity + capability + entry endpoint 判定是 provider-native continuation 还是 chat_process fallback。
4. **protocol audit helpers**
   - 目标位置：`rcc-core-domain`
   - 需求：对齐旧仓 `responses-cross-protocol-audit-matrix` 的 dropped / unsupported / lossy 审计辅助结构。

## Batch 02 必须先补的 block 缺口
1. **hub inbound semantic lift**
   - 目标位置：`rcc-core-pipeline`
   - 需求：把 responses payload 提升成 canonical request，而不是继续停留在 `operation/payload` 字符串壳。
2. **hub chat_process continuation split**
   - 目标位置：`rcc-core-pipeline`
   - 需求：显式分流 `provider-native continue` 与 `chat_process materialize/restore`。
   - Batch 02 最小闭环只要求支持 inline `tool_outputs` materialize；真正 conversation store restore 记为后续缺口。
3. **hub outbound semantic projection**
   - 目标位置：`rcc-core-pipeline`
   - 需求：把 canonical 语义投影到 compat/provider 可消费的 carrier，且不越界做 compat/provider truth。
4. **provider capability exposure**
   - 目标位置：`rcc-core-provider`
   - 需求：仅暴露 provider 是否支持 native continuation / save-restore，不承接 hub semantic mapping。

## Batch 02 明确保留缺口
1. submit_tool_outputs 若仅携带 `response_id + tool_outputs`、但未携带可物化的 tool-call 上下文，本批次必须显式失败。
2. responses conversation store 的持久化 capture / resume / restore 仍是后续批次缺口，不允许先塞进 compat/provider/host。
3. 非 anthropic 的 cross-provider continuation matrix 仍留后续批次，不在本批次扩大范围。

## Batch 03 必须先补的纯函数缺口
1. **responses conversation entry helpers**
   - 目标位置：`rcc-core-domain`
   - 需求：提取 persisted request truth、追加 provider response 的 assistant/tool-call history、按 response_id 恢复 submit_tool_outputs 请求。
2. **provider response continuation extractors**
   - 目标位置：`rcc-core-domain`
   - 需求：从最小 responses-like `id / output / required_action` 提取可恢复 continuation 语义；若 continuation 信号存在但缺 `response_id`，必须显式失败。

## Batch 03 必须先补的 block 缺口
1. **response_id conversation store**
   - 目标位置：`rcc-core-pipeline`
   - 需求：维护单 runtime 内 response_id -> conversation entry 的最小内存索引。
2. **fallback record/restore hooks**
   - 目标位置：`rcc-core-pipeline`
   - 需求：在 fallback provider path 上记录 create 响应；submit_tool_outputs 时通过 response_id 恢复历史，再 materialize tool_results。

## Batch 03 明确保留缺口
1. session/conversation scope keyed restore 仍是后续批次，不在本批次实现。
2. 外部持久化、磁盘存储、跨进程共享 store 不在本批次实现。
3. anthropic 原生响应到 responses canonical response 的完整 normalize 仍是后续批次。

## Batch 04 必须先补的纯函数缺口
1. **anthropic response normalize helpers**
   - 目标位置：`rcc-core-domain`
   - 需求：把 anthropic `id / content / stop_reason` 提升为 canonical `response_id / status / output / required_action`。
2. **canonical response record adapter**
   - 目标位置：`rcc-core-domain`
   - 需求：让 conversation record helper 明确消费 canonical response，而不是 provider raw wire body。

## Batch 04 必须先补的 block 缺口
1. **fallback record uses canonical response**
   - 目标位置：`rcc-core-orchestrator`
   - 需求：provider execute 后先做 compat response normalize，再把 canonical response 交给 pipeline store。

## Batch 04 明确保留缺口
1. anthropic SSE response normalize 留后续批次。
2. 其它 provider response normalize 留后续批次。
3. 完整 reasoning/multimodal response mapping 留后续批次。

## Batch 05 必须先补的纯函数缺口
1. **roundtrip semantic compare helpers**
   - 目标位置：`rcc-core-domain` 或测试局部 helper
   - 需求：基于 `text / tool name / arguments / response_id / required_action` 做语义对比，而不是 byte-level payload 对比。

## Batch 05 必须先补的 block / test 缺口
1. **phase9 matrix smoke**
   - 目标位置：`rcc-core-testkit`
   - 需求：在不依赖外部 sample 目录的前提下，覆盖 `responses -> anthropic -> canonical -> restore` 最小闭环。
2. **phase9 batch gate**
   - 目标位置：`scripts`
   - 需求：把旧仓 matrix tests 的最小 Rust 对齐收口为单一 gate，供本地与 CI 复用。

## Batch 05 明确保留缺口
1. 真实 codex sample 目录重放留后续批次。
2. cross-protocol audit 全量矩阵留后续批次。
3. `v2-consistency` 全量 Rust 替代留后续批次。

## Batch 06 必须先补的纯函数缺口
1. **responses cross-protocol audit helper**
   - 目标位置：`rcc-core-domain`
   - 需求：对 `openai-responses -> anthropic-messages / gemini-chat` 生成 dropped / lossy / unsupported / preserved audit。
2. **audit compare helpers**
   - 目标位置：`rcc-core-domain` 或测试局部 helper
   - 需求：按 field/disposition/reason/source/target 做最小比较，避免 byte-level 比较。

## Batch 06 必须先补的 block / test 缺口
1. **phase9 audit matrix smoke**
   - 目标位置：`rcc-core-testkit`
   - 需求：synthetic payload 驱动 anthropic/gemini 最小 audit matrix 闭环。
2. **phase9 batch06 gate**
   - 目标位置：`scripts`
   - 需求：把 cross-protocol audit matrix 收口为单一 gate，供本地与 CI 复用。

## Batch 06 明确保留缺口
1. legacy audit mirror 留后续批次。
2. runtime executor 注入 audit semantics 留后续批次。
3. 全量 cross-provider sample replay 留后续批次。

## Batch 07 必须先补的纯函数缺口
1. **audit sidecar metadata projection helper**
   - 目标位置：`rcc-core-domain`
   - 需求：把 `ProtocolMappingAudit` 稳定投影到 `ProviderRequestCarrier.metadata`，但不写入 request body。
2. **target protocol selector for audit wiring**
   - 目标位置：`rcc-core-domain` 或 orchestrator 局部 helper
   - 需求：仅根据 target provider family 选择 audit target protocol，禁止把 provider runtime 细节带进 audit truth。

## Batch 07 必须先补的 block 缺口
1. **canonical outbound audit sidecar**
   - 目标位置：`rcc-core-pipeline` / `rcc-core-domain` 边界结构
   - 需求：让 outbound carrier 能携带 audit sidecar，而不污染 request 共享语义主体。
2. **orchestrator audit assembly hook**
   - 目标位置：`rcc-core-orchestrator`
   - 需求：在 responses canonical 主线出站前装配 audit sidecar；compat 只消费 sidecar 并投影到 metadata。

## Batch 07 明确保留缺口
1. gemini compat body mapping 留后续批次，不在本批次伪造 transport payload。
2. provider runtime/transport 消费 audit 留后续批次。
3. SSE / stream audit sidecar 留后续批次。

## 旧仓矩阵回归缺口
1. 尚未建立 Rust 对齐版的 anthropic responses roundtrip 回归。
2. 尚未建立 Rust 对齐版的 responses continuation / submit_tool_outputs 回归。
3. 尚未建立 Rust 对齐版的 hub I/O compare 与 cross-protocol audit matrix 回归。
4. 尚未建立旧仓 `v2-consistency` 脚本对应的 Rust 阶段性 consistency gate。

## 缺口驱动实施规则
1. 先看是否缺纯函数；缺就先补到适合的位置，优先 `rcc-core-domain`。
2. 再看是否缺 block；只有当前批次真的依赖该 block 才补最小真源。
3. 若当前批次不依赖该 block，则明确记录为后续批次缺口，不提前实现。
4. 不允许因为缺口未补，而把 pipeline/compat/provider 语义偷偷塞进 router、host 或 orchestrator。
5. 不允许通过 payload 裁剪或深拷贝来伪造“语义已打通”或“性能已优化”。
