# Phase 08 Compat Block Batch 01

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 01 的最小 compat 闭环。
- L10-L17 `scope`：本批次允许进入实现的最小范围。
- L19-L26 `flow`：compat 在主流水线中的位置。
- L28-L34 `boundaries`：本批次明确不做的内容。
- L36-L40 `verification`：当前批次验证入口。

## 目标
把 `compat` 的第一刀固定为：canonical request/response 与 provider-facing carrier 的最小 shape mapping。先把位置和单一职责锁死，再继续加 responses/chat 的协议细节。

## 本批次最小范围
1. 计划目标文件：
   - `rust/crates/rcc-core-compat/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-provider/src/lib.rs`
2. 本批次只收两段语义：
   - request carrier mapping
   - response carrier mapping
3. 允许的输入：
   - canonical request（model / input / messages / stream / metadata）
   - provider response carrier（status / body / headers / raw stream carrier）
4. 允许的输出：
   - provider request carrier
   - canonical response

## 主流水线位置
```text
virtual router
      │
      ▼
hub pipeline
      │
      ▼
compat
      │
      ▼
provider
```

## 本批次明确不做
1. 不做 ingress endpoint ownership。
2. 不做 route policy 或 provider selection。
3. 不做 transport/auth/runtime。
4. 不做 full responses item schema、stream event normalize、tool projection matrix。
5. 不做 host/provider/orchestrator 里的 compat 复制实现。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase8_compat_block.py`
- 当前实现阶段入口后置到后续 batch；本批先不进入代码实现。
