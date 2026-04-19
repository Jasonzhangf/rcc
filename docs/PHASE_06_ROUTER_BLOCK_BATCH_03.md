# Phase 06 Router Block Batch 03

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 03 的实现闭环。
- L10-L18 `scope`：本批次允许进入实现的最小范围。
- L20-L30 `flow`：responses ingress 进入 virtual router 的正确位置。
- L32-L40 `boundaries`：本批次明确不做的内容。
- L42-L47 `verification`：当前批次验证入口。

## 目标
把 `rcc-core-router` 的第三刀固定为：**responses ingress -> virtual router 最小选择闭环**。当前批次已经完成最小实现：

1. `rcc-core-domain` 已补 router 选择输入纯函数；
2. `rcc-core-router::select()` 已不再是单纯 `operation.contains("tool")` 兼容壳；
3. `rcc-core-orchestrator` 已把 router 选择顺序提前到 pipeline.prepare 之前。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_06_ROUTER_BLOCK_BATCH_03.md`
   - `docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-domain/src/router_selection_input.rs`
   - `rust/crates/rcc-core-router/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `scripts/verify_phase6_router_batch03.sh`
2. 本批次只锁两段新语义：
   - responses/chat/request 统一 router 选择输入
   - virtual router 最小 authoritative select shell
3. 允许的输入：
   - `RequestEnvelope { operation: "responses", payload: "{\"model\":\"gpt-5\",\"input\":\"继续执行\"}" }`
   - 以及与之等价的 `/chat` / `/requests` 最小 canonical request
4. 允许的输出：
   - 当前阶段只允许锁定最小 selection contract
   - `RouteDecision { target_block }`
   - 不允许把 hub pipeline / provider 的后续语义提前写进 router
5. 本批次关键边界：
   - router 只负责 route selection / routing state / instruction target / capability reorder
   - provider 仍只做 transport / auth / runtime
   - host 仍只做 ingress shell
   - 缺失纯函数已补到 `rcc-core-domain`
   - authoritative input/select 壳已补到 `rcc-core-router`

## 正确流水线位置
```text
POST /v1/responses
      │
      ▼
rcc-core-host (HTTP ingress shell)
      │
      ▼
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

当前批次收口后：
- `rcc-core-orchestrator` 已改为先 `router.select(&request)`，再 `pipeline.prepare(request)`；
- 这一步只修正到 **virtual router 在 hub pipeline 前**；
- hub pipeline 的 `inbound / chat process / outbound` 真源仍留给后续批次。

## 本批次明确不做
1. 不在本批次内宣称 hub pipeline 已完成。
2. 不在本批次内宣称 provider route target 已完成。
3. 不做 sticky pool、alias queue、health/quota/cooldown、failover。
4. 不做完整 responses feature matrix、protocol compat、streaming 路由。
5. 不做多进程、守护进程、后台 worker。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase6_router_block.py`
- 当前实现阶段入口：`bash scripts/verify_phase6_router_batch03.sh`
- 当前缺口盘点真源：`docs/PHASE_06_RESPONSES_VIRTUAL_ROUTER_GAP_INVENTORY.md`
- 关键实现文件：`rust/crates/rcc-core-domain/src/router_selection_input.rs`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-router -p rcc-core-orchestrator -p rcc-core-host -p rcc-core-testkit`
