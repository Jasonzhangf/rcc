# Phase 08 Compat Block Batch 06

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 06 的实现闭环。
- L10-L22 `scope`：本批次允许进入的最小 request-side spec skeleton 范围。
- L24-L33 `implementation`：shared projection engine 的最小抽取边界。
- L35-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
开始把 compat 的 request-side projection 从硬编码大函数里抽成第一层 shared skeleton：

1. 新增 shared request projection module；
2. 引入 provider-family request projection spec；
3. 先把 anthropic / gemini request-side projection 接到 spec skeleton，但保持现有行为不变。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md`
   - `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `docs/agent-routing/110-compat-block-routing.md`
   - `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - `rust/crates/rcc-core-domain/src/compat_request_projection.rs`
   - `rust/crates/rcc-core-domain/src/compat_mapping.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `scripts/verify_phase8_compat_block.py`
   - `scripts/verify_phase8_compat_block_batch06.sh`
2. 本批次只做：
   - request-side projection spec skeleton
   - shared projection engine 的第一层 dispatch
   - anthropic / gemini request projection 改走新 skeleton 薄壳
3. 当前批次最小实现结果：
   - compat_mapping 不再直接承载全部 request-side provider-family 细节
   - request-side shared projection 真源进入独立 domain module
   - 现有 anthropic / gemini compat 行为与测试结果保持不变

## 最小实现边界
1. request-side skeleton 只覆盖：
   - top-level field rules
   - system/developer projection
   - messages/contents projection
   - tools/tool_results projection
2. 当前批次不要求：
   - response-side normalize spec 化
   - audit builder 重写
   - provider runtime 改造
3. 允许保留在代码中的内容：
   - projection executor / dispatch
   - schema validation / explicit failure
   - request-side静态 shape helper

## 本批次明确不做
1. 不做 response-side normalize 收敛。
2. 不做 continuation / lifecycle 配置化。
3. 不做 provider transport/auth/runtime 改造。
4. 不一次性把所有 provider-family 投影改完。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前 batch05 收敛入口：`bash scripts/verify_phase8_compat_block_batch05.sh`
- 当前 batch06 实现入口：`bash scripts/verify_phase8_compat_block_batch06.sh`
