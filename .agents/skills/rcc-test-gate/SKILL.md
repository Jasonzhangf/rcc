---
name: rcc-test-gate
description: rcc-core 的测试与验收 gate skill。用于定义自动化验证入口、证据标准与 CI 收口方式。
---

# RCC Test Gate

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的验证收口规则。

## Trigger Signals
- 当前阶段已完成 docs/skills/实现，需要判断是否可关闭。
- 需要新增或更新验证脚本、CI workflow、验收规则。
- 需要把人工判断收口成自动化证据。

## Standard Actions
1. 为当前阶段定义唯一验证入口。
2. 让本地验证与 CI 复用同一命令或同一脚本。
3. 让错误输出显式指出缺失项。
4. 用验证结果决定任务是否能关闭。

## Acceptance Gate
- 存在唯一自动化验证入口。
- 本地验证已通过。
- CI 能复用同一入口。
- 报告中包含命令、结果、缺口或成功证据。

## Anti-Patterns
- 只做人工检查，不给自动化入口。
- 本地与 CI 走两套验证逻辑。
- 测试失败但仍关闭任务。

## Boundaries
- 本 skill 只负责测试/验收收口，不替代 docs 真源。
- 若测试规则变化，需要同步更新 `docs/TESTING_AND_ACCEPTANCE.md`。
- 通用的 success criteria / evidence-first 原则，交给全局 `coding-principals`。

## Sources Of Truth
- `docs/TESTING_AND_ACCEPTANCE.md`
- `docs/DELIVERY_WORKFLOW.md`
