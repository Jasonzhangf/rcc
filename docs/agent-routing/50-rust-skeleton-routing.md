# Rust Skeleton 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L18 `docs-map`：Rust skeleton 相关文档映射。
- L20-L29 `rules`：架构与实现约束。
- L31-L35 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：Rust workspace 骨架、crate 划分、host/provider/servertool 边界、最小 Cargo workspace 相关任务。

## 文档与 skill 映射
1. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - Rust workspace 的总架构、层次、依赖方向、资源约束。
2. `docs/CRATE_BOUNDARIES.md`
   - 每个 crate 的职责与禁止重叠边界。
3. `docs/SKELETON_IMPLEMENTATION_WORKFLOW.md`
   - 第二阶段从 docs 到 skill 到 dev 到 test 的具体执行顺序。
4. `docs/SHORT_TERM_MINIMAL_PATH.md`
   - 近期最小可跑目标、最短链路与最小验证入口。
5. `.agents/skills/rcc-rust-skeleton/SKILL.md`
   - Rust skeleton 的可复用执行动作。

## 规则
1. 统一采用：`编排层 → block 真源层 → 纯函数层`。
2. `servertool` 必须独立成一级 block，不挂在 host/provider 下偷做。
3. `provider` 只允许 `transport / auth / runtime`，不承载业务语义。
4. `host` 默认只做聚合与入口，保持极薄；除非必要，不引入 TS 业务层。
5. 默认单进程、单 runtime；没有明确收益不拆独立 daemon/worker。
6. 每个 crate 只保留一个主职责，禁止重复包装与重复语义实现。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase2_architecture_docs.py`
- skeleton 实现阶段：`bash scripts/verify_phase2_cargo_skeleton.sh`
- 近期最小可跑入口：`bash scripts/verify_phase2_cargo_skeleton.sh`
- CI：`.github/workflows/phase2-architecture-docs.yml` + `.github/workflows/phase2-cargo-skeleton.yml`
