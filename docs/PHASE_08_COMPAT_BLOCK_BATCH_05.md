# Phase 08 Compat Block Batch 05

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 05 的实现闭环。
- L10-L20 `scope`：本批次允许进入的最小 compat 收敛范围。
- L22-L34 `convergence`：compat 应如何收敛为薄骨骼 + 共享函数 + spec/JSON 规则。
- L36-L41 `boundaries`：本批次明确不做的内容。
- L43-L47 `verification`：当前批次验证入口。

## 目标
在 Batch 04 gemini request projection 已落地的前提下，定义 compat 的下一步收敛方向：

1. compat block 本身继续变薄；
2. 协议字段映射尽量下沉为共享 projection engine + spec/JSON 规则；
3. 只有真正不能配置化的 projection lifecycle / validation / error boundary 留在代码里。

## 本批次最小范围
1. 新增：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md`
   - `docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md`
   - `scripts/verify_phase8_compat_block_batch05.sh`
2. 本批次只做：
   - 锁定 compat 的“薄骨骼 + 配置”收敛目标
   - 明确哪些逻辑必须留代码，哪些必须下放成 spec/JSON
   - 锁定 `protocol_mapping_audit` 继续只进 `ProviderRequestCarrier.metadata`
   - 给后续 anthropic / gemini projection 收敛提供唯一设计入口
3. 本批次不提前改写现有 anthropic/gemini 业务实现；先锁 docs / skill / gate。

## Compat 收敛目标
1. `rcc-core-compat`
   - 只保留极薄 block：选择 target provider、加载 projection spec、调用共享执行器、返回 carrier。
2. `rcc-core-domain`
   - 保留 **shared projection engine**、schema validator、audit builder、最小错误分类。
3. `spec/JSON rules`
   - 承接字段 rename / alias
   - 承接 enum 映射
   - 承接 allow/drop/lossy/audit 规则
   - 承接 content/tool 的静态 shape 投影
4. compat 不得继续膨胀为 provider-family 大量硬编码集合；batch05 之后的新投影优先按 spec/JSON 收敛。

## 本批次明确不做
1. 不做 provider runtime 改造。
2. 不做 response normalize 全量 spec 化。
3. 不把 continuation policy、tool governance、transport/auth/runtime 下放成 JSON。
4. 不把 hub lifecycle 推进挪进 compat。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前 batch04 实现入口：`bash scripts/verify_phase8_compat_block_batch04.sh`
- 当前 batch05 收敛入口：`bash scripts/verify_phase8_compat_block_batch05.sh`

- 后续 request-side skeleton 入口：`bash scripts/verify_phase8_compat_block_batch06.sh`
- 后续 content/tool rule extraction 入口：`bash scripts/verify_phase8_compat_block_batch07.sh`
- 后续 tool field rules extraction 入口：`bash scripts/verify_phase8_compat_block_batch08.sh`
