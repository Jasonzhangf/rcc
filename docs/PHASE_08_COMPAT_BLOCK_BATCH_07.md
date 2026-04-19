# Phase 08 Compat Block Batch 07

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 07 的实现闭环。
- L10-L22 `scope`：本批次允许进入的最小 content/tool rule extraction 范围。
- L24-L33 `implementation`：request-side rule layer 的最小抽取边界。
- L35-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
在 Batch 06 request-side spec skeleton 基础上，继续把 request-side 的 content/tool 静态规则从流程代码里抽出来：

1. 提取 provider-family 的 system/message role rules；
2. 提取 content/tool part kind rules；
3. 保持 anthropic / gemini request projection 行为不变。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md`
   - `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `docs/agent-routing/110-compat-block-routing.md`
   - `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - `rust/crates/rcc-core-domain/src/compat_request_projection.rs`
   - `scripts/verify_phase8_compat_block.py`
   - `scripts/verify_phase8_compat_block_batch07.sh`
2. 本批次只做：
   - content/tool rule extraction
   - role rule extraction
   - part kind rule extraction
3. 当前批次最小实现结果：
   - provider-family role rules 不再散落在多个 helper 里
   - text / tool_call / tool_result 等静态 part kind 进入 rule 层
   - anthropic / gemini request projection 回归结果保持不变

## 最小实现边界
1. 当前批次只覆盖 request-side rule layer。
2. 允许保留在代码中的内容：
   - projection dispatch
   - schema validation / explicit failure
   - provider-family 非静态 shape helper
3. rule layer 至少要覆盖：
   - system/developer 识别
   - user/assistant/tool role 归一
   - text/tool_call/tool_result part 分类

## 本批次明确不做
1. 不做 response-side normalize 收敛。
2. 不做 continuation / lifecycle 配置化。
3. 不做 provider runtime 改造。
4. 不把所有 helper 一次性重写成纯 JSON 解释器。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前 batch06 实现入口：`bash scripts/verify_phase8_compat_block_batch06.sh`
- 当前 batch07 实现入口：`bash scripts/verify_phase8_compat_block_batch07.sh`
