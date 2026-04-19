# Phase 08 Compat Block Batch 08

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 08 的实现闭环。
- L10-L22 `scope`：本批次允许进入的最小 tool declaration / tool result field rules extraction 范围。
- L24-L33 `implementation`：request-side tool field rule layer 的最小抽取边界。
- L35-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
在 Batch 07 role / part kind rules 已进入 rule layer 的基础上，继续把 request-side 的 tool declaration / tool result 静态字段规则从流程代码里抽出来：

1. 提取 anthropic tool definition field rules；
2. 提取 gemini function declaration / functionCall / functionResponse field rules；
3. 保持 anthropic / gemini request projection 行为不变。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md`
   - `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `docs/agent-routing/110-compat-block-routing.md`
   - `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - `rust/crates/rcc-core-domain/src/compat_request_projection.rs`
   - `scripts/verify_phase8_compat_block.py`
   - `scripts/verify_phase8_compat_block_batch08.sh`
   - `.github/workflows/phase8-compat-block.yml`
2. 本批次只做：
   - tool declaration field rules extraction
   - tool call / tool result field alias rules extraction
   - request-side shared helper 继续抽薄
3. 当前批次最小实现结果：
   - anthropic `name/description/input_schema` 进入 rule 层
   - gemini `name/description/parameters`、`functionCall`、`functionResponse` 静态字段进入 rule 层
   - call id / name / arguments / content / input / parameters 等静态字段规则不再散落在多个 helper 里

## 最小实现边界
1. 当前批次只覆盖 request-side tool field rule layer。
2. 允许保留在代码中的内容：
   - projection dispatch
   - schema validation / explicit failure
   - audit sidecar builder
   - tool result name fallback / 非静态语义判断
3. rule layer 至少要覆盖：
   - anthropic tool definition 输出字段
   - gemini function declaration 输出字段
   - tool_call / function_call 的 call id / name / input / args 规则
   - tool_result / functionResponse 的 id / content / name 规则

## 本批次明确不做
1. 不做 response-side normalize 收敛。
2. 不做 continuation / lifecycle 配置化。
3. 不做 provider runtime 改造。
4. 不把 tool result name fallback 伪装成纯 JSON 配置。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前 batch07 实现入口：`bash scripts/verify_phase8_compat_block_batch07.sh`
- 当前 batch08 实现入口：`bash scripts/verify_phase8_compat_block_batch08.sh`
