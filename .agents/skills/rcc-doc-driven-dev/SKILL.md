---
name: rcc-doc-driven-dev
description: rcc-core 的文档先行 skill。用于保证未完成 docs 真源与边界定义前，不进入实现。
---

# RCC Doc Driven Dev

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 docs 先行门禁。

## Trigger Signals
- 准备开始新阶段或新模块。
- 需要修改流程规则、架构边界、交付顺序。
- 发现“实现方向已变，但文档还没更新”。

## Standard Actions
1. 先确认是否已有权威 docs 可承载本次改动。
2. 若没有，先新增 docs 真源，再继续。
3. 若已有，先更新 docs 边界与完成标准。
4. 再决定是否需要新增/更新 skill。
5. docs 与 skill 都齐备后，才进入实现。

## Acceptance Gate
- 当前任务的范围、边界、完成标准都已写入 docs。
- docs 与现有真源无冲突。
- 若涉及可复用流程，skill 已同步更新。

## Anti-Patterns
- 先写代码，后补文档。
- 在多个 docs 中重复抄同一套规则。
- 把一次性过程说明冒充长期真源。

## Boundaries
- 本 skill 只约束“先文档”，不定义具体测试做法。
- skills 规则边界以 `docs/SKILL_SYSTEM.md` 为准。
- 通用的改动最小化与验证驱动原则，交给全局 `coding-principals`。

## Sources Of Truth
- `docs/WORKFLOW_CLOSED_LOOP.md`
- `docs/SKILL_SYSTEM.md`
