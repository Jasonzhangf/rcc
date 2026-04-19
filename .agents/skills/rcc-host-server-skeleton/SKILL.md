---
name: rcc-host-server-skeleton
description: rcc-core 的 host/server skeleton 开发 skill。用于把 rcc-core-host 从 smoke-only 壳推进为最小可运行 HTTP server，并保持 host 极薄。
---

# RCC Host Server Skeleton

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 host/server skeleton 约束。

## Trigger Signals
- 用户要求“先把 HTTP 服务器起起来”。
- 当前主线从 block 深挖切换为 outer shell / host 启动路径。
- 需要为后续业务流水线准备最小 HTTP 入口。

## Standard Actions
1. 先确认 Phase 07A docs/routing 已落盘。
2. 每个新入口批次都先做“缺函数 / 缺 block”盘点；缺就补最小真源，不缺就继续接线。
3. 保持 host 极薄，只做 CLI / HTTP / startup，不回收 block 业务语义。
4. 优先复用 `RequestEnvelope` 与 `SkeletonApplication`，避免在 host 重复拼装业务逻辑。
5. 第一刀先固定最小命令和最小 endpoint：`smoke`、`serve`、`/healthz`、`/smoke`。
6. 第二刀优先补通用请求入口 `/requests`，让现有 block 语义能经由 HTTP 进入流水线，而不是先做产品协议兼容层。
7. 第三刀再补最小业务入口，例如 `/chat`，但仍要保持 request shell 极薄，不在 host 内重建业务真源。
8. 第四刀若进入 `/v1/responses`，先只做 ingress shell；当前批次不在 host 内偷做 virtual router / hub pipeline / provider 真源。
9. 用显式 PID 启停 server，并用 curl/脚本验证端到端流水线。
10. 验证通过后，再决定下一条业务端点，不预先扩 scope。

## Acceptance Gate
- Phase 07A docs、routing、skill 已落盘。
- `rcc-core-host` 能启动最小 HTTP server。
- `/healthz` 与 `/smoke` 可自动化验证。
- host 没有复制 pipeline/router/servertool/provider 真源语义。

## Anti-Patterns
- 在 host 里写 router/servertool/provider 业务规则。
- 为两个子命令引入重量级 CLI/HTTP 框架而没有明确收益。
- 第一步就实现 OpenAI-compatible API、auth、SSE。
- 启停 server 时使用 broad kill。

## Boundaries
- 本 skill 只约束 host/server skeleton，不替代 router/provider/servertool 的阶段文档。
- provider 仍只负责 `transport / auth / runtime`。
- servertool 仍保持独立一级 block。
- 测试与证据标准以 `docs/TESTING_AND_ACCEPTANCE.md` 为准。

## Sources Of Truth
- `docs/agent-routing/100-host-server-routing.md`
- `docs/PHASE_07_HOST_SERVER_WORKFLOW.md`
- `docs/PHASE_07_HOST_SERVER_BATCH_01.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
