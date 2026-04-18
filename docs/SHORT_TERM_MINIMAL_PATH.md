# Short Term Minimal Path

## 索引概要
- L1-L8 `purpose`：本文件定义近期最小可跑目标。
- L10-L24 `target`：当前短期目标与不做范围。
- L26-L46 `path`：最短可跑链路与各层职责。
- L48-L58 `verification`：唯一最小验证入口与证据。
- L60-L67 `next`：最小骨架跑通后的下一步。

## 目标
把 `rcc-core` 收敛到一个稳定、可重复运行、可提交的最小 Rust 骨架。

这个“最小”不是功能最少到只剩空 crate，而是保留一条真实可跑链路：
1. workspace 能通过静态检查；
2. testkit 能证明基础编排链路活着；
3. host 能作为极薄入口直接运行；
4. 不依赖额外 daemon / 常驻服务 / TS 业务壳层。

## 当前短期目标
### 要固定住
1. `host` 作为极薄入口可直接运行。
2. `orchestrator` 能装配最小应用。
3. `router/pipeline` 能提供稳定 smoke 路径。
4. `servertool` 保持独立一级 block，不回挂到 host/provider。
5. `provider` 只暴露 runtime adapter 语义，不掺入业务真相。
6. `domain` 继续作为纯函数真源承载后续迁移。

### 当前明确不做
1. 不追求一次性迁完旧仓全部能力。
2. 不为了“可跑”额外引入 TS bridge。
3. 不为了“看起来完整”新增无收益守护进程或子进程。
4. 不做重复包装脚手架；优先复用现有 `phase2` 验证入口。

## 最短可跑链路

```text
host(thin entry)
  -> orchestrator(assemble)
    -> router/pipeline(select target path)
      -> provider(noop runtime)
      -> servertool(independent block, tested by testkit)
      -> domain(pure functions truth)
```

这条路径的意义：
- **host 活着**：说明入口、依赖装配、最小 runtime 没断。
- **testkit 活着**：说明 workspace 内部最小编排链路没断。
- **servertool smoke 活着**：说明 block 真源已经能被最小编排消费。

## 最小验证入口

唯一入口：

```bash
bash scripts/verify_phase2_cargo_skeleton.sh
```

该命令已满足“薄包装”原则，不再额外新增重复 wrapper。

### 成功证据
1. `python3 scripts/verify_phase2_architecture_docs.py` 通过。
2. `cargo check --manifest-path rust/Cargo.toml` 通过。
3. `cargo test --manifest-path rust/Cargo.toml -p rcc-core-testkit` 通过。
4. `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet` 输出稳定 smoke 文本。

## 最小骨架跑通后的下一步
1. 保持这条最小路径持续为绿。
2. 在此基础上继续按批次推进 `servertool` 与 `domain` 的旧仓迁移。
3. 新批次进入实现前，仍必须先补 docs / skills / test gate。
