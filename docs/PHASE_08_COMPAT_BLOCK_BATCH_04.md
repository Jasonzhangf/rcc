# Phase 08 Compat Block Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L22 `scope`：本批次允许进入实现的最小 gemini compat 范围。
- L24-L33 `flow`：gemini compat 在主流水线中的正确位置。
- L35-L41 `boundaries`：本批次明确不做的内容。
- L43-L49 `verification`：当前批次验证入口。

## 目标
在已完成 Batch 03 route handoff sidecar 的前提下，把 `responses -> canonical -> gemini-chat` 的最小 compat projection 真正落地：

1. compat 为 `target_provider_id=gemini` 提供最小 provider-facing request body；
2. gemini protocol mapping 真源仍留在 compat/domain，不回流 provider runtime；
3. audit sidecar 仍只进 `ProviderRequestCarrier.metadata`，不进入真实 request body。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md`
   - `docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md`
   - `docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
   - `docs/agent-routing/110-compat-block-routing.md`
   - `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - `rust/crates/rcc-core-domain/src/compat_mapping.rs`
   - `rust/crates/rcc-core-domain/src/lib.rs`
   - `rust/crates/rcc-core-compat/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-testkit/src/lib.rs`
   - `scripts/verify_phase8_compat_block.py`
   - `scripts/verify_phase8_compat_block_batch04.sh`
2. 本批次只锁四段新语义：
   - `system/developer -> systemInstruction`
   - `user/assistant -> contents`
   - `tools -> functionDeclarations`
   - `tool_results -> functionResponse`
3. 允许的输入：
   - hub pipeline outbound 后的 canonical request
   - route handoff sidecar
   - Batch 07 已存在的 protocol mapping audit sidecar
4. 允许的输出：
   - `ProviderRequestCarrier.operation = gemini-chat`
   - gemini request body：`contents / systemInstruction / tools`
   - `ProviderRequestCarrier.metadata.protocol_mapping_audit`
5. 当前批次最小实现结果：
   - compat gemini request mapper
   - orchestrator 经 `router -> pipeline -> compat -> provider` 主链把 gemini carrier 交给 provider runtime
   - testkit/orchestrator 最小 smoke 证明 body shape 与 metadata sidecar 边界

## 正确流水线位置
```text
responses ingress server
  -> virtual router
  -> hub pipeline
       inbound <> chat process <> outbound
  -> compat(gemini request projection)
  -> provider
```

## 本批次明确不做
1. 不做 gemini real execute endpoint 动态路径拼接。
2. 不做 gemini provider response -> canonical response normalize。
3. 不做 stream/SSE event 级 projection。
4. 不做 provider runtime 读取 `protocol_mapping_audit`。
5. 不把 request metadata 或 audit sidecar 写进 gemini request body。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase8_compat_block_batch04.sh`
- 当前缺口盘点真源：`docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-compat -p rcc-core-orchestrator -p rcc-core-testkit`
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-orchestrator tests::canonical_responses_path_projects_gemini_request_shape_through_compat -- --exact`
