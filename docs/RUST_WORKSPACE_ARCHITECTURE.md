# Rust Workspace Architecture

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 02 的 Rust workspace 架构真源。
- L10-L24 `principles`：核心架构原则。
- L26-L48 `layers`：三层结构与外圈 adapter/host 的关系。
- L50-L82 `workspace-map`：建议 crate 组成。
- L84-L98 `dependency-rules`：依赖方向与禁止事项。
- L100-L112 `runtime-policy`：runtime 与资源控制原则。

## 目标
定义 `rcc-core` 的最小 Rust workspace 结构，为后续模块迁移提供统一骨架，并确保 host 薄、module 单一职责、runtime 资源受控。

## 核心原则
1. **Rust 为唯一业务语义真源**。
2. **三层结构固定**：`编排层 → block 真源层 → 纯函数层`。
3. **包装尽量薄**：不创建没有边界价值的 wrapper/bridge。
4. **模块单一职责**：crate 之间不重合、不偷长功能。
5. **servertool 独立一级 block**。
6. **provider 只做 `transport / auth / runtime`**。
7. **host 从第一天开始极薄**：只做入口、聚合、启动，不写业务语义。
8. **资源受控**：默认单进程、单 runtime、模块内聚；没有充分收益不拆独立进程。

## 分层结构

```text
CLI / HTTP / Config (host shell)
            │
            ▼
Orchestration 编排层
            │
            ▼
Blocks 真源层
  ├─ pipeline
  ├─ router
  └─ servertool
            │
            ▼
Pure Functions 纯函数层
  ├─ dto / schema
  ├─ parser / codec
  └─ normalizer / validator

外圈适配：provider transport/auth/runtime
```

### 1. 编排层
职责：
- request lifecycle
- stage orchestration
- 调用 pipeline/router/servertool/provider
- 把外部入口请求组织成内部调用链

不负责：
- 业务规则真源
- tool 语义真源
- provider 业务补丁

### 2. block 真源层
职责：
- `pipeline`：阶段处理主链
- `router`：目标选择、状态与策略语义
- `servertool`：clock/heartbeat/followup 等服务端工具语义

不负责：
- 具体 HTTP transport
- 入口启动壳
- 重复实现纯函数工具

### 3. 纯函数层
职责：
- DTO
- schema
- parser
- codec
- mapper
- validator
- state codec

特点：
- 无 I/O
- 无网络
- 无进程副作用
- 高可测性

### 4. 外圈 adapter
职责：
- provider transport
- auth
- runtime 适配

注意：
- adapter 不是第四层业务真源，只是外圈接口层。
- adapter 不能承载 router/tool/pipeline 业务语义。

## Workspace 建议组成

### `rcc-core-domain`
- 纯函数层
- 放 DTO、schema、parser、codec、validator、shared state codec

### `rcc-core-pipeline`
- block 真源层
- 放 pipeline 业务真源与阶段主链

### `rcc-core-router`
- block 真源层
- 放 routing、state、selection、health/quota 语义

### `rcc-core-servertool`
- block 真源层
- 放 clock、heartbeat、followup、server-side tools 语义

### `rcc-core-orchestrator`
- 编排层
- 负责把 pipeline/router/servertool/provider 串成 request lifecycle

### `rcc-core-provider`
- adapter 层
- 只放 transport/auth/runtime

### `rcc-core-host`
- 入口壳层
- CLI、HTTP、config bootstrap、process startup

### `rcc-core-testkit`
- 测试/回放层
- fixture loader、smoke harness、后续 replay/parity 支撑

## 依赖方向
```text
host -> orchestrator
orchestrator -> pipeline / router / servertool / provider / domain
pipeline -> domain
router -> domain
servertool -> domain
provider -> domain (仅共享 DTO/traits)
testkit -> all (test-only)
```

### 禁止事项
1. `host -> pipeline/router/servertool` 直接拼业务规则。
2. `provider -> pipeline/router/servertool` 反向依赖。
3. `servertool` 逻辑散落到 `host` 或 `provider`。
4. 在 TS 层或外部 bridge 里复制 Rust 语义。

## Runtime 与资源策略
1. 默认单进程、单 runtime。
2. servertool 默认在主 runtime 内协作执行，不单独拉 daemon。
3. 如需拆独立进程，必须证明隔离性/稳定性/性能收益，并单独文档化。
4. skeleton 阶段不引入 worker、sidecar、后台守护进程。
