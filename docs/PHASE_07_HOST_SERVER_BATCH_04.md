# Phase 07 Host Server Batch 04

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 04 的实现闭环。
- L10-L18 `scope`：本批次允许进入实现的最小范围。
- L20-L30 `flow`：`/v1/responses` ingress 的正确流水线位置。
- L32-L39 `boundaries`：本批次明确不做的内容。
- L41-L46 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-host` 的第四刀固定为：入口端点选 `POST /v1/responses`，并且这一步只先做 **responses 入站 server 处理**。当前批次已经把 ingress 跑通，并把缺失纯函数收敛到 `rcc-core-domain`；virtual router、hub pipeline(inbound <> chat process <> outbound)、provider 仍留给后续批次推进。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_07_HOST_SERVER_BATCH_04.md`
   - `docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-domain/src/responses_ingress.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `scripts/verify_phase7_host_server_batch04.sh`
2. 本批次只锁两段新语义：
   - `POST /v1/responses` ingress
   - ingress 实现前的缺函数 / 缺 block 盘点，以及最小缺口补齐
3. 允许的输入：
   - `POST /v1/responses` body: `{"model":"gpt-5","input":"继续执行"}`
4. 允许的输出：
   - 最小 responses-style JSON shell
   - 内部仍统一收敛到 canonical request/response
   - response shell 只暴露最小 `object/status/model/output/route/tool_plan/provider_runtime`
5. 本批次关键边界：
   - host 只做 ingress shell
   - 当前批次不在 host 内偷做 virtual router 真源
   - 当前批次不在 host 内偷做 hub pipeline 真源
   - provider 仍只做 transport/auth/runtime
   - 若缺纯函数或 block，先补最小真源；不缺则继续接 ingress

## 正确流水线
```text
POST /v1/responses
      │
      ▼
rcc-core-host (HTTP ingress shell)
      │
      ▼
minimal ingress normalization
      │
      ▼
（后续批次再继续）
virtual router
      │
      ▼
hub pipeline
  ├─ inbound
  ├─ chat process
  └─ outbound
      │
      ▼
provider
```

## 本批次明确不做
1. 不在本批次内宣称 virtual router 已完成。
2. 不在本批次内宣称 hub pipeline 已完成。
3. 不在 host 内伪造 inbound/chat process/outbound。
4. 不做 SSE / streaming / auth / 完整 response item schema。
5. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase7_host_server.py`
- 当前实现阶段入口：`bash scripts/verify_phase7_host_server_batch04.sh`
- 当前缺口盘点真源：`docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md`
- 关键实现文件：`rust/crates/rcc-core-domain/src/responses_ingress.rs`
- 当前批次最小 Rust 回归：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-host -p rcc-core-testkit`
