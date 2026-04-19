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
6. **compat 在 hub 后、provider 前**：只做 canonical request/response 与 provider-facing carrier 的 shape mapping，不拥有 ingress。
7. **provider 只做 `transport / auth / runtime`**。
8. **host 从第一天开始极薄**：只做入口、聚合、启动，不写业务语义。
9. **资源受控**：默认单进程、单 runtime、模块内聚；没有充分收益不拆独立进程。

## 分层结构

```text
CLI / HTTP (host shell)
            │
            ▼
Config bootstrap crate
            │
            ▼
Orchestrator 薄编排壳
            │
            ▼
Virtual Router block
            │
            ▼
Hub Pipeline block
     ├─ servertool block（按需）
     ▼
Compat adapter
            │
            ▼
Provider adapter
            │
            ▼
Upstream runtime / transport

底座共享：Pure Functions 纯函数层
  ├─ dto / schema
  ├─ parser / codec
  └─ normalizer / validator
```

### 1. 编排层
职责：
- request lifecycle
- stage orchestration
- 组织 `host -> virtual router -> hub pipeline -> compat -> provider` 主链
- 把外部入口请求组织成内部调用链

不负责：
- 业务规则真源
- tool 语义真源
- compat / provider 业务补丁

### 2. block 真源层
职责：
- `router`：virtual router，负责目标选择、状态与策略语义
- `pipeline`：hub pipeline，负责阶段推进与主链收口
- `servertool`：clock/heartbeat/followup 等服务端工具语义

不负责：
- 入口启动壳
- provider transport/auth/runtime
- compat ingress ownership
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
- compat request/response shape mapping
- provider transport
- auth
- runtime 适配

注意：
- adapter 不是第四层业务真源，只是外圈接口层。
- compat 位于 **hub 后、provider 前**，不拥有 ingress，也不回收 router/hub 真源。
- provider 不能承载 router/tool/pipeline/compat 业务语义。

## Workspace 建议组成

### `rcc-core-domain`
- 纯函数层
- 放 DTO、schema、parser、codec、validator、shared state codec

### `rcc-core-config`
- foundation / bootstrap 层
- 放两文件 config 加载、路径解析、system default + user config merge、runtime home 布局默认值
- 可承载 legacy provider / routing 的薄 bootstrap projection，但不承载 route/provider 运行期决策
- 不承载 router/pipeline/provider/servertool 业务语义

### `rcc-core-pipeline`
- block 真源层
- 放 hub pipeline 业务真源与阶段主链

### `rcc-core-router`
- block 真源层
- 放 virtual router 的 routing、state、selection、health/quota 语义

### `rcc-core-servertool`
- block 真源层
- 放 clock、heartbeat、followup、server-side tools 语义

### `rcc-core-compat`（计划中的下一阶段 crate）
- adapter 层
- 放 hub pipeline 与 provider 之间的协议/shape mapping
- 不拥有 ingress，不承载 transport/auth/runtime

### `rcc-core-orchestrator`
- 编排层
- 负责把 router/pipeline/servertool/compat/provider 串成 request lifecycle

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
host -> config / orchestrator
orchestrator -> config / router / pipeline / servertool / compat / provider / domain
pipeline -> domain
router -> domain
servertool -> domain
compat -> domain
provider -> domain (仅共享 DTO/traits)
testkit -> all (test-only)
```

### 禁止事项
1. `host -> pipeline/router/servertool` 直接拼业务规则。
2. `compat` 进入 ingress 层，或在 `host` 内复制 compat 真源。
3. `provider -> pipeline/router/servertool/compat` 反向依赖。
4. `servertool` 逻辑散落到 `host` 或 `provider`。
5. 在 TS 层或外部 bridge 里复制 Rust 语义。
6. `config` 不得实现 router/provider/servertool 业务语义；只负责加载、解析、merge 与 bootstrap data。

## Runtime 与资源策略
1. 默认单进程、单 runtime。
2. servertool 默认在主 runtime 内协作执行，不单独拉 daemon。
3. 如需拆独立进程，必须证明隔离性/稳定性/性能收益，并单独文档化。
4. skeleton 阶段不引入 worker、sidecar、后台守护进程。
