# Phase 12 Regression Matrix Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件记录旧仓矩阵迁入前的缺口。
- L10-L20 `source-audit`：当前已识别的旧仓矩阵真源。
- L22-L35 `gaps`：需要补齐的缺口。
- L37-L53 `targets`：各批次收口目标。

## 目标
在进入旧仓矩阵迁移前，先明确：

1. 哪些旧仓测试是真正的主线矩阵真源；
2. 哪些语义在新仓已经实现；
3. 哪些只是缺验证入口，而不是缺业务代码。

## 当前已识别旧仓真源
1. `../routecodex/tests/sharedmodule/responses-cross-protocol-audit-matrix.spec.ts`
   - 真源：responses -> anthropic/gemini 的 `dropped / unsupported / lossy` audit 口径。
2. `../routecodex/tests/sharedmodule/routing-state-continuation-matrix.spec.ts`
   - 真源：continuation sticky scope 的 request/session/conversation/request_chain 口径。
3. `../routecodex/tests/sharedmodule/provider-compat-tests.spec.ts`
   - 真源：主协议样本存在性与 submit_tool_outputs 样本基线。
4. `../routecodex/docs/protocol-compatibility-matrix.md`
   - 真源：跨协议兼容等级的文字口径。

## 当前缺口
1. 更深的 provider-specific compat matrix 还没迁入。
2. responses continuation / state / transparency 的细化矩阵还没迁入。
3. hub / router / stream 的扩展矩阵还没按 block 真源拆批迁移。
4. 需要一个 closeout 文档，明确哪些缺口不阻塞当前阶段关闭。

## Batch 01 收口目标
1. docs / skill / verify 先落盘。
2. 明确旧仓三类矩阵到新仓 crate 的归属。
3. 建立首批 Rust 回归入口。
4. `bash scripts/verify_phase12_regression_matrix_batch01.sh` 能自动证明：
   - docs/skills 完整
   - 相关 Rust tests 通过
   - 新仓主线 matrix 语义与旧仓口径一致

## Batch 02 收口目标
1. 新增 `docs/PROTOCOL_COMPATIBILITY_MATRIX.md`，承接旧仓 compatibility 等级口径。
2. 新增 `docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md` 与 batch02 gate。
3. 建立第二批 Rust regression，证明：
   - responses -> anthropic/gemini 的 `dropped / unsupported / lossy / preserved`
   - continuation sticky scope 的 `request_chain / session`
   - compat mainline 仍保留 anthropic/gemini 的最小 full-path shape
4. `bash scripts/verify_phase12_regression_matrix_batch02.sh` 能自动证明：
   - compatibility matrix docs 已落盘
   - 相关 Rust tests 通过
   - 文档口径与当前主线实现一致

## Batch 03 收口目标
1. 新增本地 `fixtures/mock-provider/` 最小样本基线。
2. 新增 `docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md` 与 batch03 gate。
3. 建立第三批 Rust regression，证明：
   - `openai-responses.submit_tool_outputs` 样本存在且含 `apply_patch:*` tool_call_id
   - `anthropic-messages` 样本存在并可解析
   - `openai-chat` 样本存在并可解析
4. `bash scripts/verify_phase12_regression_matrix_batch03.sh` 能自动证明：
   - 本地 fixtures 已落盘
   - 相关 Rust tests 通过
   - 新仓 provider compat 样本基线不再依赖旧仓路径

## Batch 04 收口目标
1. 新增 `docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md` 与 unified gate。
2. 提供单一短路径入口，聚合 batch01~03。
3. `bash scripts/verify_phase12_regression_matrix_batch04.sh` 能自动证明：
   - docs/skills/fixtures 完整
   - batch01~03 gate 全部通过
   - CI 与本地可复用同一统一入口

## Batch 05 收口目标
1. 新增 `docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md` 与 `docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md`。
2. 新增最终 closeout gate，复用 batch04 并校验 closeout 文档存在。
3. `bash scripts/verify_phase12_regression_matrix_batch05.sh` 能自动证明：
   - batch04 gate 通过
   - closeout 文档已落盘
   - 当前 backlog / out-of-scope 已明确，不阻塞 Phase 12A 关闭
