# Phase 09 Hub Pipeline Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的实现闭环。
- L10-L18 `scope`：本批次允许进入实现的最小范围。
- L20-L29 `flow`：hub pipeline 在 responses 主线中的正确位置。
- L31-L38 `boundaries`：本批次明确不做的内容。
- L40-L43 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-pipeline` 的第一刀固定为：**responses 主线下的 hub pipeline skeleton**。当前批次已经完成最小实现：

1. `rcc-core-domain` 已补 hub pipeline skeleton 纯函数；
2. `rcc-core-pipeline` 已形成 `inbound / chat process / outbound` 三段最小 skeleton；
3. compat 与 provider 仍保持在 pipeline 之外，没有被提前混入。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_09_HUB_PIPELINE_BATCH_01.md`
   - `docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-domain/src/hub_pipeline_skeleton.rs`
   - `rust/crates/rcc-core-pipeline/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase9_hub_pipeline_batch01.sh`
2. 本批次只锁两段新语义：
   - hub pipeline 当前缺函数 / 缺 block 盘点与最小补齐
   - inbound / chat process / outbound skeleton 的最小边界定义与实现
3. 允许的输入：
   - 经 virtual router 选择后的最小 canonical request
4. 允许的输出：
   - 当前阶段只允许锁定 hub pipeline skeleton contract
   - 不允许输出 provider-specific 或 compat-specific shape
5. 当前批次最小实现结果：
   - `PipelineBlock::inbound`
   - `PipelineBlock::chat_process`
   - `PipelineBlock::outbound`
   - `PipelineBlock::prepare`

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat
  -> provider
```

## 本批次明确不做
1. 不在本批次内宣称 inbound / chat process / outbound 已完成。
2. 不在 pipeline 内偷做 compat shape mapping。
3. 不在 pipeline 内偷做 provider transport/auth/runtime。
4. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase9_hub_pipeline.py`
- 当前实现阶段入口：`bash scripts/verify_phase9_hub_pipeline_batch01.sh`
- 当前缺口盘点真源：`docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-pipeline -p rcc-core-orchestrator -p rcc-core-host -p rcc-core-testkit`
