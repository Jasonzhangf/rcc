# Phase 08 Compat Config Convergence

## 索引概要
- L1-L8 `purpose`：本文件定义 compat 的收敛架构真源。
- L10-L21 `target-shape`：compat 的目标形态。
- L23-L38 `code-vs-config`：哪些必须留在代码，哪些必须优先下放成 spec/JSON。
- L40-L52 `execution-model`：共享执行器与协议 spec 的执行方式。
- L54-L63 `migration-order`：后续收敛批次顺序。
- L65-L70 `anti-patterns`：明确禁止的做法。

## 目标
把 compat 收敛为：

```text
thin compat block
  -> shared projection engine
  -> protocol spec / JSON rules
  -> provider request/response carrier
```

也就是说：
- compat 要尽量薄；
- 通用字段投影逻辑要共享；
- 真正的协议差异尽量写成数据规则，而不是复制一套又一套硬编码 mapper。

## 目标形态
1. `rcc-core-compat`
   - 只做 block 装配
   - 只负责 target provider 决策后的 projection 调用
   - 不承载 provider-family 业务语义细节
2. `rcc-core-domain`
   - 提供 projection engine
   - 提供 schema / validator / audit helper
   - 提供 content/tool 的共享映射函数
3. protocol spec / JSON rules
   - 每个 provider family 一份 request/response projection 规则
   - 规则只表达字段与 shape，不表达 runtime 行为
4. `rcc-core-provider`
   - 继续只做 transport / auth / runtime
   - 不反向接管 shape projection

## 哪些必须留在代码，哪些必须优先下放成 spec/JSON
### 必须留在代码里
1. projection executor / dispatch。
2. schema validation / explicit failure。
3. audit sidecar builder。
4. request/response 的状态型边界处理。
5. 与 lifecycle 强相关的逻辑：
   - continuation ownership
   - tool governance boundary
   - stream branch
   - transport/auth/runtime

### 必须优先下放成 spec/JSON
1. 字段 rename / alias。
2. enum 映射。
3. allowlist / droplist。
4. lossy / dropped / unsupported audit 声明。
5. content part 的静态字段投影。
6. tools / tool_results 的静态 shape 投影。

## 执行模型
```text
HubCanonicalOutboundRequest
  -> compat block
    -> select protocol spec
    -> shared projection engine
      -> shared content/tool ops
      -> audit builder
    -> ProviderRequestCarrier
```

### 最小执行步骤
1. compat block 读取 `target_provider_id`。
2. 根据 provider family 选择 projection spec。
3. 共享 projection engine 按规则执行字段投影。
4. 共享 audit builder 生成 `protocol_mapping_audit` sidecar。
5. compat block 返回 carrier；provider 只消费 carrier。

## 推荐迁移顺序
1. 第一批：抽 request-side spec
   - anthropic messages request
   - gemini chat request
2. 第二批：抽 content/tool 通用投影规则
3. 第三批：抽 response-side normalize spec（仅静态 shape，非状态型逻辑）
4. 第四批：把旧的硬编码 provider-family 投影逐步收缩为 spec 调用薄壳

## 反模式
1. 在 compat block 里继续累积 provider-family if/else 大分支。
2. 为了“全配置化”把 continuation / lifecycle 也塞进 JSON。
3. provider runtime 重新实现一遍 request/response shape mapping。
4. host/pipeline/orchestrator 再包一层 protocol projection 壳。
