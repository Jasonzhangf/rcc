# Skills 流程路由

## 索引概要
- L1-L6 `scope`：本路由负责的内容。
- L8-L18 `skill-map`：核心 skills 与用途。
- L20-L28 `rules`：skills 更新与调用规则。
- L30-L33 `entry`：推荐使用顺序。

## 覆盖范围
适用于：创建/更新本地 skills，或在执行任务时选择应读取的 skill。

## 核心 skills
1. `~/.codex/skills/coding-principals/SKILL.md`
   - 全局基础 skill；负责通用的 review / decide / execute / verify 方法论。
2. `.agents/skills/rcc-closed-loop/SKILL.md`
   - 总闭环执行 skill；负责把 docs、skill、dev、test 串成一条链。
3. `.agents/skills/rcc-doc-driven-dev/SKILL.md`
   - 文档先行 skill；负责“未定义真源不得实现”的门禁。
4. `.agents/skills/rcc-test-gate/SKILL.md`
   - 测试/验收 skill；负责验证脚本、CI 与证据标准。

## Skills 规则
1. 先用全局 `coding-principals` 处理通用开发原则，再用本地 skill 叠加 rcc-core 项目约束。
2. 本地 skill 只沉淀可复用动作、反模式、触发信号、边界条件。
3. 本地 skill 不承载项目长篇背景，不取代 docs 真源。
4. 若一个经验会跨多个任务/项目复用，优先进入全局 skill。
5. 技能更新必须同步检查 `docs/SKILL_SYSTEM.md` 的边界约束。
6. 任何后续模块任务，都要先判断是否已有全局或本地 skill 可复用，再决定是否新增 skill。

## 推荐使用顺序
先读全局 `coding-principals`，再按需要补读 `rcc-closed-loop`、`rcc-doc-driven-dev` 与 `rcc-test-gate`。
