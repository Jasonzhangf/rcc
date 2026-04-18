---
name: rcc-rust-skeleton
description: rcc-core 的 Rust skeleton 开发 skill。用于按既定三层结构与边界创建最小 workspace 骨架，并保持 host 薄、provider 纯 adapter、servertool 独立。
---

# RCC Rust Skeleton

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 Rust 分层与边界约束。

## Trigger Signals
- 开始 Phase 02 的 Rust workspace/skeleton 工作。
- 需要创建或调整 crate 结构。
- 需要判断某段逻辑属于 host / orchestrator / block / domain / provider 哪一层。

## Standard Actions
1. 先读：`docs/RUST_WORKSPACE_ARCHITECTURE.md`。
2. 再读：`docs/CRATE_BOUNDARIES.md`。
3. 确认当前改动属于哪一个 crate 的单一职责。
4. 默认优先下沉纯函数，再落 block，再接编排，再接 host。
5. 保证 servertool 独立，不把其逻辑塞回 host/provider。
6. 保证 provider 只实现 transport/auth/runtime。
7. 保证 host 只做聚合和入口。
8. 默认单 runtime 内完成，不新增多余进程。
9. 先跑 `python3 scripts/verify_phase2_architecture_docs.py`。
10. 再跑 `bash scripts/verify_phase2_cargo_skeleton.sh`。

## Acceptance Gate
- crate 边界明确且无重叠。
- servertool 独立一级 block。
- provider 不承载业务语义。
- host 仍保持极薄。
- 无新增无意义 wrapper 或多余进程。

## Anti-Patterns
- 先写 host/TS 壳，再倒推业务结构。
- 把 route/tool/pipeline 语义塞进 provider。
- 为了方便把 servertool 挂回 host。
- 把共享逻辑复制到多个 crate。
- skeleton 阶段就拆 daemon/worker。

## Boundaries
- 本 skill 只负责 skeleton 结构与边界动作，不取代架构真源文档。
- 若 crate 边界变更，必须先修改 docs，再继续实现。

## Sources Of Truth
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/SKELETON_IMPLEMENTATION_WORKFLOW.md`
