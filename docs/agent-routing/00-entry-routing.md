# rcc-core 路由入口（Phase 01+）

## 索引概要
- L1-L7 `purpose`：入口用途与适用范围。
- L9-L19 `route-table`：任务类型到真源文档/skill 的映射。
- L21-L27 `dispatch-order`：标准分发顺序。
- L29-L32 `update-rule`：新增规则时的归属原则。

## 目标
把阶段任务统一分发到“文档真源 → skill 流程 → 开发 → 测试”闭环里，避免边做边定规则。

## 分类分发表
1. 闭环总流程与阶段门禁 → `../WORKFLOW_CLOSED_LOOP.md`
2. 文档职责边界与真源归属 → `10-docs-ssot-routing.md`
3. skills 触发与沉淀方式 → `20-skill-workflow-routing.md`
4. 进入开发前的准备与交付顺序 → `30-dev-implementation-routing.md`
5. 验证脚本、验收与 CI → `40-test-ci-routing.md`
6. Rust skeleton 与 workspace 设计 → `50-rust-skeleton-routing.md`
7. Pure functions 批次迁移 → `60-pure-functions-routing.md`
8. Servertool block 真源迁移 → `70-servertool-block-routing.md`
9. Provider block 真源迁移 → `80-provider-block-routing.md`
10. Router block 真源迁移 → `90-router-block-routing.md`
11. Host/server skeleton → `100-host-server-routing.md`
12. Compat block 真源迁移 → `110-compat-block-routing.md`
13. Hub pipeline block 真源迁移 → `120-hub-pipeline-routing.md`
14. Responses 主线 provider execute integration → `130-responses-provider-execute-routing.md`
15. Config 两文件基础设施 → `140-config-foundation-routing.md`
16. 旧仓 responses continuation 深矩阵 → `160-responses-continuation-matrix-routing.md`
17. 本地闭环 skill 入口 → `../../.agents/skills/rcc-closed-loop/SKILL.md`

## 标准分发顺序
1. 先判定当前任务属于“定义规则 / 更新规则 / 按规则实现 / 按规则验收”。
2. 先读对应 docs 真源，不凭记忆直接实现。
3. 再读本地 skill，复用已沉淀动作。
4. 若任务跨多类，以 docs 真源为主、skill 为辅、验证脚本收口。

## 更新规则
- 新规则优先进入 docs；重复可复用的动作才进入 skills。
- AGENTS 与 routing 文档只保留入口和索引，不写大段流程。
