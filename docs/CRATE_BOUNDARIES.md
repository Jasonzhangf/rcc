# Crate Boundaries

## 索引概要
- L1-L7 `purpose`：本文件定义各 crate 的职责边界。
- L9-L24 `crate-table`：crate 职责表。
- L26-L40 `non-overlap`：禁止重叠规则。
- L42-L55 `special-rules`：host/provider/servertool 的特别约束。
- L57-L61 `change-rule`：边界修改规则。

## 目标
确保每个 crate 只承担一个主职责，不在多个 crate 之间重复实现同一业务语义。

## Crate 职责表

| Crate | 主职责 | 可以包含 | 不可以包含 |
|---|---|---|---|
| `rcc-core-domain` | 纯函数与共享 DTO | schema、codec、validator、shared types | network、fs、runtime orchestration |
| `rcc-core-pipeline` | pipeline 真源 | stage logic、request/response process | provider transport、host startup |
| `rcc-core-router` | routing 真源 | selection、routing state、health/quota semantics | HTTP transport、tool orchestration |
| `rcc-core-servertool` | server-side tools 真源 | clock、heartbeat、followup、tool handlers | host startup、provider transport |
| `rcc-core-orchestrator` | request 编排 | 调度 blocks、组织 request lifecycle | 复制 blocks 的业务真源 |
| `rcc-core-provider` | provider adapter | transport、auth、runtime integration | route/tool/protocol 主语义 |
| `rcc-core-host` | 入口壳 | CLI、HTTP、config bootstrap | 业务真源、重复包装 |
| `rcc-core-testkit` | 测试支撑 | fixtures、harness、smoke/replay helper | 生产主路径逻辑 |

## 禁止重叠规则
1. route 语义只能在 `rcc-core-router`。
2. servertool 语义只能在 `rcc-core-servertool`。
3. pipeline 主链只能在 `rcc-core-pipeline`。
4. schema/parser/codec/shared DTO 只能在 `rcc-core-domain`。
5. provider 的 transport/auth/runtime 只能在 `rcc-core-provider`。
6. host 不得为“方便”而复制任一 block 的业务逻辑。

## 特别约束
### Host
- 只聚合，不发明业务规则。
- 默认不用 TS 业务层；若存在 TS，只能是薄壳桥接。

### Provider
- 只允许：transport / auth / runtime。
- 不允许：router policy、tool governance、continuation 真源、业务 fallback 逻辑。

### ServerTool
- 必须独立成一级 block。
- 不允许散落在 host/provider/pipeline 的边角位置被重复实现。

## 边界修改规则
1. 若一个职责需要跨两个 crate，共享部分应下沉到 `rcc-core-domain`。
2. 若出现重叠语义，必须指定唯一真源 crate，并从其他 crate 删除重复职责。
