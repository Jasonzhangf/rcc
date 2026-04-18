# rcc-core

`rcc-core` 是对 `../routecodex` 的 Rust 重构骨架仓。当前阶段目标不是一次性追平旧仓全部功能，而是先把 **最小可跑骨架** 固定住，再按批次把 block 真源和纯函数逐步迁入。

## 当前架构

```text
编排层
  host -> orchestrator -> router/pipeline

block 真源层
  servertool
  provider

纯函数层
  domain
```

### 约束
- 统一三层：`编排层 -> block 真源层 -> 纯函数层`
- `servertool` 独立为一级 block
- `provider` 只承载 `transport / auth / runtime`
- `host` 保持极薄，只做入口与聚合
- 默认单 runtime，不无意义新增独立进程/守护进程

## Workspace 结构

- `rust/crates/rcc-core-host`：极薄入口
- `rust/crates/rcc-core-orchestrator`：编排层装配
- `rust/crates/rcc-core-router`：路由分发
- `rust/crates/rcc-core-pipeline`：编排辅助路径
- `rust/crates/rcc-core-servertool`：server-side tool block 真源
- `rust/crates/rcc-core-provider`：transport/auth/runtime 适配
- `rust/crates/rcc-core-domain`：纯函数、schema、codec、validator
- `rust/crates/rcc-core-testkit`：workspace smoke / 最小回归测试工具箱

## 近期最小可跑目标

先固定一个最小闭环：

1. Rust workspace 可 `cargo check`
2. `rcc-core-testkit` smoke 测试通过
3. `rcc-core-host` 可以直接运行并输出稳定 smoke 结果

这条最短路径的真源文档见：`docs/SHORT_TERM_MINIMAL_PATH.md`。

## 最小运行入口

直接运行：

```bash
bash scripts/verify_phase2_cargo_skeleton.sh
```

这个入口会执行：

1. `python3 scripts/verify_phase2_architecture_docs.py`
2. `cargo check --manifest-path rust/Cargo.toml`
3. `cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit`
4. `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet`

## 当前更强验证入口

如果要验证当前已落地的 servertool block 基线，可运行：

```bash
bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh
```

它会在最小骨架之外，再验证 Phase 04A 当前 servertool block 基线。

## 文档入口

- `AGENTS.md`：项目入口与硬护栏
- `docs/WORKFLOW_CLOSED_LOOP.md`：闭环总真源
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`：Rust workspace 总架构
- `docs/CRATE_BOUNDARIES.md`：crate 边界
- `docs/SHORT_TERM_MINIMAL_PATH.md`：近期最小可跑目标
- `docs/TESTING_AND_ACCEPTANCE.md`：验证与 CI 真源
