# Phase 02 Skeleton Prep

## 索引概要
- L1-L8 `purpose`：本文件是下一阶段 Rust skeleton 闭环的入口示例。
- L10-L20 `phase-goal`：下一阶段目标。
- L22-L39 `closed-loop-template`：下一阶段仍须遵循的 docs/skills/dev/test 顺序。
- L41-L49 `deliverables`：下一阶段最小交付物。
- L51-L55 `entry`：执行前需回读的真源。

## 目标
为下一阶段“Rust skeleton 最小骨架闭环”提供统一模板，证明第一阶段产出的流程可以直接复用。

## 下一阶段目标
在不迁移业务功能的前提下，建立最小 Rust workspace/skeleton，形成后续模块迁移的基础主干。

## 架构 review 已确认的约束
1. **包装尽量薄**
   - host、adapter、ffi、bridge 只保留必要壳层；若一个包装层不提供边界隔离、协议适配或测试价值，就不创建。
2. **模块功能单一且不重合**
   - 每个 crate / module 只承载一个主职责；同一业务语义只能有一个权威模块，禁止 router / provider / pipeline 之间重复实现。
3. **控制 runtime 资源消耗**
   - 默认优先单进程、单 runtime、多模块协作；只有在隔离性、稳定性或性能收益被证明时，才允许独立进程。
4. **先骨架，后分支**
   - 第二阶段只建最小 workspace 与边界，不提前生成多余 daemon、worker、sidecar。

## 架构拍板结论
1. **三层结构确认**
   - 后续 Rust skeleton 与模块迁移统一采用：`编排层 → block 真源层 → 纯函数层`。
2. **ServerTool 独立成一级 block**
   - servertool 不再作为 provider 或 host 的附属逻辑，单独承载 clock / heartbeat / followup 等服务端工具语义。
3. **Provider 层职责锁死**
   - provider 层只允许 `transport / auth / runtime` 三类职责，不承载业务语义，不实现路由、工具治理或协议主语义。
4. **Host 从第一天开始保持极薄**
   - host 默认只做聚合与入口，不做业务语义；除非必要，不引入 TS 业务层，也不在 host 里重复包装具体模块。

## 下一阶段闭环模板
1. **Docs**
   - 先写 skeleton 架构文档：workspace、crate 分层、依赖方向、最小入口。
2. **Skills**
   - 补齐或新增 skeleton 开发 skill，沉淀 crate 建壳、依赖边界、验证动作。
3. **Development**
   - 只做最小骨架：workspace、空 crate、trait/接口占位、最小 smoke 入口。
4. **Test**
   - 增加 skeleton 验证脚本：`cargo check`、最小 smoke、结构检查。
5. **Close**
   - 只有 docs、skills、开发、测试证据齐全，才进入模块迁移阶段。

## 下一阶段最小交付物
- Rust workspace 结构文档
- skeleton 相关 skill
- 最小 Cargo workspace
- 一条 smoke 验证命令
- 不引入多余进程/daemon 的资源说明
- 下一阶段任务列表

## 执行前必读
1. `docs/WORKFLOW_CLOSED_LOOP.md`
2. `docs/SKILL_SYSTEM.md`
3. `docs/DELIVERY_WORKFLOW.md`
4. `docs/TESTING_AND_ACCEPTANCE.md`
5. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
6. `docs/CRATE_BOUNDARIES.md`
7. `docs/SKELETON_IMPLEMENTATION_WORKFLOW.md`
8. `.agents/skills/rcc-closed-loop/SKILL.md`
9. `.agents/skills/rcc-rust-skeleton/SKILL.md`
