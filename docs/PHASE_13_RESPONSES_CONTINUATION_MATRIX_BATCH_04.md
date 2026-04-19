# Phase 13 Responses Continuation Matrix Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L18 `scope`：本批次允许进入实现的最小范围。
- L20-L27 `unified-gate`：统一入口的职责边界。
- L29-L33 `boundaries`：本批次明确不做的内容。
- L35-L38 `verification`：当前批次验证入口。

## 目标
完成 **Phase 13 matrix 聚合 gate / 短路径统一回归入口**：

1. 本地一条命令收口 batch01~03；
2. CI 复用同一统一入口；
3. 聚合层保持极薄，不复制任何业务断言。

## 本批次最小范围
1. 新增：
   - `docs/PHASE_13_RESPONSES_CONTINUATION_MATRIX_BATCH_04.md`
   - `scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
2. 本批次只做：
   - 聚合 batch01~03 gate
   - 暴露统一短路径入口
   - 让 CI 可直接复用

## 统一入口职责
1. 先跑 docs gate。
2. 再顺序跑：
   - `batch01`
   - `batch02`
   - `batch03`
3. 任何一个 gate 失败，聚合入口必须显式失败。
4. 聚合入口不拥有自己的业务断言，只拥有执行顺序。

## 本批次明确不做
1. 不新增第四套 regression 断言。
2. 不重写 batch01~03 逻辑。
3. 不为聚合入口新增后台进程或缓存层。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase13_responses_continuation_matrix.py`
- 当前实现阶段入口：`bash scripts/verify_phase13_responses_continuation_matrix_batch04.sh`
