# Skeleton Implementation Workflow

## 索引概要
- L1-L7 `purpose`：本文件定义 Phase 02 的实施顺序。
- L9-L23 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L25-L39 `minimum-dev-scope`：最小 skeleton 实现范围。
- L41-L50 `verification`：验证入口。
- L52-L57 `done`：本阶段完成判据。

## 目标
把第二阶段的 Rust skeleton 任务固定成标准闭环，避免一上来就把 Cargo workspace 长成旧项目式的混合体。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/RUST_WORKSPACE_ARCHITECTURE.md`
     - `docs/CRATE_BOUNDARIES.md`
     - `docs/SKELETON_IMPLEMENTATION_WORKFLOW.md`
2. **Skills**
   - 建立或更新：`.agents/skills/rcc-rust-skeleton/SKILL.md`
3. **Development**
   - 只做最小 Cargo workspace 与最小 crate 占位，不提前加入业务实现。
4. **Test**
   - 跑 `python3 scripts/verify_phase2_architecture_docs.py`
   - 进入实现阶段后再补 `cargo check` / smoke
5. **Close**
   - docs、skills、验证通过后，Cargo skeleton 实现任务才允许开始。

## 最小 skeleton 实现范围
1. `rust/Cargo.toml`
2. `rust/crates/` 下的最小 crate 目录
3. 每个 crate 的空 `Cargo.toml` 与最小 `lib.rs`/`main.rs`
4. 不引入额外 daemon、worker、sidecar
5. 不引入 TS 业务层桥接

## 验证入口
### 当前文档/技能阶段
- `python3 scripts/verify_phase2_architecture_docs.py`

### 后续实现阶段
- `bash scripts/verify_phase2_cargo_skeleton.sh`
- 内部包含：`cargo check` + `cargo test -p rcc-core-testkit` + `cargo run -p rcc-core-host --quiet`

## 完成判据
1. 架构与边界文档完整。
2. skeleton skill 已落盘。
3. 验证脚本与 CI 可检查 phase2 文档/skills。
4. Cargo skeleton 实现任务已解除 blocker，可以开始做最小 workspace。
