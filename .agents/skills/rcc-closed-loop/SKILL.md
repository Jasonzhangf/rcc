---
name: rcc-closed-loop
description: rcc-core 的总闭环执行 skill。用于把 docs、skills、dev、test 串成一个可关闭的阶段闭环。
---

# RCC Closed Loop

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的阶段闭环约束。

## Trigger Signals
- 用户要求“先文档化，再开始实现”。
- 当前任务属于某个阶段的起始工作。
- 需要判断“这一阶段是否已经闭环完成”。

## Standard Actions
1. 先定位对应 docs 真源。
2. 检查是否已存在可复用 skill；没有则补齐 skill。
3. 只做当前阶段要求的最小实现。
4. 运行自动化验证。
5. 用证据更新任务状态，再进入下一阶段。

## Acceptance Gate
- docs 已落盘。
- skill 已落盘。
- 当前阶段最小实现已完成。
- 自动化验证已通过。
- 下一阶段入口已明确。

## Anti-Patterns
- 跳过 docs 直接实现。
- skills 没补就开始扩功能。
- 用口头解释代替验证。
- 当前阶段未闭环就提前推进下一阶段。

## Boundaries
- 本 skill 负责总顺序，不替代具体 docs 真源。
- 具体测试标准以 `docs/TESTING_AND_ACCEPTANCE.md` 为准。
- 通用的 review / simplicity / surgical changes / goal-driven validate 以全局 `coding-principals` 为准。

## Sources Of Truth
- `docs/WORKFLOW_CLOSED_LOOP.md`
- `docs/DELIVERY_WORKFLOW.md`
