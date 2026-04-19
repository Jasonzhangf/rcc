# rcc-core Project AGENTS（Routing Edition）

## 索引概要
- L1-L8 `purpose`：项目 AGENTS 仅保留入口、硬护栏、路径索引。
- L10-L18 `hard-guards`：第一阶段不可违背的项目底线。
- L20-L31 `route-map`：按文档/skill/开发/测试分流。
- L33-L40 `execution-flow`：标准执行顺序。
- L42-L45 `maintenance`：维护方式。

## 项目硬护栏（Hard Guards）
1. **先文档，后实现**：未完成 docs 真源、skill、测试验收定义前，不进入实现。
2. **先验证，后结论**：无文件、脚本或测试证据，不宣称完成。
3. **AGENTS 只做路由**：复杂流程下沉到 `docs/` 与 `.agents/skills/`。
4. **禁止静默失败**：闭环检查必须显式失败并返回缺口。
5. **禁止 broad kill**：禁用 `pkill` / `killall` / `kill $(...)` / `xargs kill`。
6. **非授权不破坏**：删除、回滚、迁移、发布类动作需明确授权。
7. **单一真源**：流程规则以 `docs/WORKFLOW_CLOSED_LOOP.md` 为总真源；skills 只沉淀可复用动作。
8. **阶段门禁**：任何后续 Rust 重构任务都必须经过“docs → skills → dev → test”闭环。
9. **包装尽量薄**：host / adapter / bridge 只做必要包装，禁止无意义重复壳层。
10. **模块单一职责**：模块能力必须单一且不重叠，禁止跨模块重复语义。
11. **资源受控**：默认单 runtime 内收敛；若无明确收益，不新增独立进程、守护进程或额外常驻服务。

## 分类路由（路径 + 作用）
1. 入口总览：`docs/agent-routing/00-entry-routing.md`
   - 作用：选择本次任务的主路径。
2. docs 真源：`docs/agent-routing/10-docs-ssot-routing.md`
   - 作用：定义哪些规则写进 docs，以及各文档边界。
3. skills 流程：`docs/agent-routing/20-skill-workflow-routing.md`
   - 作用：定义 skill 触发条件、职责边界、调用顺序。
4. 开发闭环：`docs/agent-routing/30-dev-implementation-routing.md`
   - 作用：定义进入实现前的前置条件与开发顺序。
5. 测试/CI：`docs/agent-routing/40-test-ci-routing.md`
   - 作用：定义验证脚本、验收、CI 自动化主路径。
6. Rust skeleton：`docs/agent-routing/50-rust-skeleton-routing.md`
   - 作用：定义 Rust workspace、crate 边界、skeleton 技术闭环。
7. Pure functions migration：`docs/agent-routing/60-pure-functions-routing.md`
   - 作用：定义 domain 纯函数迁移批次与验证闭环。
8. Servertool block migration：`docs/agent-routing/70-servertool-block-routing.md`
   - 作用：定义 Phase 04A servertool block 真源迁移、批次和验证闭环。
9. Provider block migration：`docs/agent-routing/80-provider-block-routing.md`
   - 作用：定义 Phase 05A provider block 真源迁移、批次和验证闭环。
10. Router block migration：`docs/agent-routing/90-router-block-routing.md`
   - 作用：定义 Phase 06A router block 真源迁移、批次和验证闭环。
11. Host/server skeleton：`docs/agent-routing/100-host-server-routing.md`
   - 作用：定义 Phase 07A 最小 host CLI / HTTP server 骨架、批次和验证闭环。
12. Compat block migration：`docs/agent-routing/110-compat-block-routing.md`
   - 作用：定义 Phase 08A compat block 真源迁移、批次和验证闭环。
13. Hub pipeline block migration：`docs/agent-routing/120-hub-pipeline-routing.md`
   - 作用：定义 Phase 09A hub pipeline(inbound / chat process / outbound) 真源迁移、批次和验证闭环。
14. Responses provider execute：`docs/agent-routing/130-responses-provider-execute-routing.md`
   - 作用：定义 Phase 10A responses 主线 provider real execute integration、批次和验证闭环。
15. Config foundation：`docs/agent-routing/140-config-foundation-routing.md`
   - 作用：定义 Phase 11A 两文件 config foundation、批次和验证闭环。
16. Regression matrix：`docs/agent-routing/150-regression-matrix-routing.md`
   - 作用：定义 Phase 12A 旧仓矩阵回归迁移、批次和验证闭环。
17. Responses continuation matrix：`docs/agent-routing/160-responses-continuation-matrix-routing.md`
   - 作用：定义 Phase 13A responses continuation 深矩阵迁移、批次和验证闭环。
18. 本地 skills：
   - `.agents/skills/rcc-closed-loop/SKILL.md`
   - `.agents/skills/rcc-doc-driven-dev/SKILL.md`
   - `.agents/skills/rcc-test-gate/SKILL.md`
   - `.agents/skills/rcc-rust-skeleton/SKILL.md`
   - `.agents/skills/rcc-pure-functions-migration/SKILL.md`
   - `.agents/skills/rcc-servertool-block-migration/SKILL.md`
   - `.agents/skills/rcc-provider-block-migration/SKILL.md`
   - `.agents/skills/rcc-router-block-migration/SKILL.md`
   - `.agents/skills/rcc-host-server-skeleton/SKILL.md`
   - `.agents/skills/rcc-compat-block-migration/SKILL.md`
   - `.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md`
   - `.agents/skills/rcc-responses-provider-execute/SKILL.md`
   - `.agents/skills/rcc-config-foundation/SKILL.md`
   - `.agents/skills/rcc-regression-matrix/SKILL.md`
   - `.agents/skills/rcc-responses-continuation-matrix/SKILL.md`

## 标准执行顺序
1. 读本文件，确认硬护栏与路由入口。
2. 读 `docs/agent-routing/00-entry-routing.md`，选出当前任务主路径。
3. 进入对应 docs 真源，再打开关联 skill。
4. 先补 docs，再补 skills，再做最小实现，再跑测试与验收。
5. 用脚本或测试生成证据后，才更新任务状态。
6. 汇报必须包含：变更文件、验证命令、结果、下一步。

## 维护方式
- 本文件保持短小，只保留入口与护栏。
- 长流程写到 `docs/`；可复用动作写到 `.agents/skills/`。
- 新规则先判断归属：AGENTS / docs / skills / scripts，禁止重复抄写。
