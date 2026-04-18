# Skill System

## 索引概要
- L1-L8 `purpose`：本文件定义本地 skill 的职责边界。
- L10-L19 `boundaries`：哪些内容属于 skill，哪些不属于。
- L21-L35 `contract`：每个 skill 的固定结构。
- L37-L45 `update-policy`：何时新增或更新 skill。
- L47-L50 `anti-patterns`：禁止做法。

## 目标
让 `.agents/skills/` 成为“可复用流程动作”的沉淀层，而不是文档真源或过程流水账容器。

## 全局 / 本地分层
1. **全局 skills**
   - 承载跨项目通用方法论。
   - 例如：`~/.codex/skills/coding-principals/SKILL.md`
2. **本地 skills**
   - 只承载 rcc-core 项目特有的约束、边界、阶段门禁、crate/迁移规则。
3. **归属原则**
   - 若规则跨多个项目都成立，优先放入全局 skill。
   - 若规则只约束 rcc-core，才放入 `.agents/skills/`。

## Skills 职责边界
### 属于 skill 的内容
- 触发信号
- 标准动作
- 反模式
- 边界条件
- 与其他文档/skill 的调用顺序

### 不属于 skill 的内容
- 项目总体架构真源
- 长篇背景说明
- 单次任务的过程日志
- 需要频繁引用的权威规则正文

## 每个 skill 的固定结构
1. `name` / `description`
2. 适用场景或触发信号
3. 标准执行动作
4. 验收口径
5. 反模式
6. 边界条件
7. 关联 docs 真源

## 更新策略
1. 只有出现“可跨任务复用”的经验，才新增或更新 skill。
2. 若经验跨项目复用，先检查是否应上收至全局 `coding-principals` 或其它全局 skill。
3. 若规则只是当前阶段特有，优先写在 docs，而不是 skill。
4. 若更新 skill，必须同步检查是否需要修订相关 docs。
5. 若 skill 与 docs 冲突，以 docs 真源为准，并及时修订 skill。

## 反模式
- 把整份实施方案塞进 skill。
- 用 skill 取代 docs 真源。
- 把单次任务过程记录成 skill。
- 技能命名过大但没有明确动作边界。
