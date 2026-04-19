# Phase 12 Regression Matrix Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小范围。
- L24-L31 `fixtures`：本地 fixtures 与 Rust 断言的对应关系。
- L33-L37 `boundaries`：本批次明确不做的内容。
- L39-L42 `verification`：当前批次验证入口。

## 目标
完成 **provider compat 样本基线** 的新仓本地化，让最小样本回归不再依赖 `../routecodex`。

## 本批次最小范围
1. 新增：
   - `docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md`
   - `fixtures/mock-provider/`
   - `scripts/verify_phase12_regression_matrix_batch03.sh`
2. 本批次只锁三类样本：
   - `openai-responses.submit_tool_outputs`
   - `anthropic-messages`
   - `openai-chat`
3. 允许的实现：
   - 本地 fixture
   - `rcc-core-testkit` sample regression
   - CI gate

## 本地 fixtures ↔ Rust 断言
1. submit_tool_outputs 中存在 `apply_patch:*` tool_call_id
   - `rcc-core-testkit` sample smoke
2. anthropic-messages 样本存在且 request/response 可解析
   - `rcc-core-testkit` sample smoke
3. openai-chat 样本存在且 request/response 可解析
   - `rcc-core-testkit` sample smoke

## 本批次明确不做
1. 不迁移旧仓所有 mock-provider 样本。
2. 不把 fixtures 接入运行时 provider execute。
3. 不做 sample replay engine。
4. 不引入额外进程、daemon、snapshot server。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase12_regression_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase12_regression_matrix_batch03.sh`
