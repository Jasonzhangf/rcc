# Docs 真源边界路由

## 索引概要
- L1-L7 `scope`：本路由覆盖范围。
- L9-L18 `docs-map`：各权威文档的职责边界。
- L20-L26 `ssot-rules`：文档真源约束。
- L28-L31 `entry`：建议入口顺序。

## 覆盖范围
适用于：流程定义、阶段门禁、技能边界、交付规范、测试验收规则的新增或修改。

## 权威文档分工
1. `docs/WORKFLOW_CLOSED_LOOP.md`
   - 总流程真源；定义阶段顺序、状态流转、何时允许进入实现。
2. `docs/SKILL_SYSTEM.md`
   - 定义 skills 放什么、不放什么、何时更新。
3. `docs/DELIVERY_WORKFLOW.md`
   - 定义单个任务从启动到交付的标准动作与产物。
4. `docs/TESTING_AND_ACCEPTANCE.md`
   - 定义测试层级、证据标准、CI 门禁与完成判据。
5. `docs/PHASE_02_SKELETON_PREP.md`
   - 作为下一阶段 Rust skeleton 闭环任务的示例入口。

## 真源规则
1. 流程总规则只写在 `WORKFLOW_CLOSED_LOOP.md`。
2. skills 的职责边界只写在 `SKILL_SYSTEM.md`。
3. 测试与验收规则只写在 `TESTING_AND_ACCEPTANCE.md`。
4. 其他文档引用真源，不复制整套规则。
5. 如果新增文档，必须说明其相对于现有真源的边界。

## 建议入口
先读 `WORKFLOW_CLOSED_LOOP.md`，再按需要进入其他文档。
