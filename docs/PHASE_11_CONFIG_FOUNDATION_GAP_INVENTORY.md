# Phase 11 Config Foundation Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件记录进入 Phase 11A 前的 config 缺口。
- L10-L20 `existing-state`：当前真实状态。
- L22-L39 `gaps`：需要补齐的缺口。
- L41-L45 `batch01-target`：Batch 01 的收口目标。

## 目标
在进入 config foundation 实现前，先盘点当前主线缺什么 block、缺什么函数、缺什么验证入口，避免把 config 需求散落到 host/orchestrator/provider。

## 当前真实状态
1. 当前主线已形成：
   - `responses ingress server -> virtual router -> hub pipeline -> compat -> provider`
2. 当前真实 provider 主线已支持：
   - `NoopProviderRuntime`
   - `TransportProviderRuntime`
3. 当前 config 真源尚不存在：
   - 没有 `rcc-core-config crate`
   - 没有两文件 config loader
   - 没有 system default + user override merge
4. 当前 host 仍保留硬编码默认值：
   - `DEFAULT_ADDR`
   - `DEFAULT_OPERATION`
   - `DEFAULT_PAYLOAD`
   - `DEFAULT_CHAT_OPERATION`
5. 当前 old provider config 仍未接线：
   - `virtualrouter.providers` 尚未投影到新 `provider.runtime.transport`
   - old provider 仍不能直接驱动新 Rust provider execute

## 当前缺口
1. **缺 block：config foundation crate**
   - 需要一个独立 `rcc-core-config` crate 承载路径解析、两文件加载、merge 与 typed config。
2. **缺函数：user config path resolve**
   - 需要从旧仓迁入：
     - `RCC_HOME` / `ROUTECODEX_USER_DIR` / `ROUTECODEX_HOME` 风格用户目录解析
     - 显式 `--config` / 环境变量 / 默认 `~/.rcc/config.json` 的优先级
     - 当前旧 `httpserver.host/port` 到新 `host.server.addr` 的最小归一
3. **缺函数：bundled config 读取**
   - 需要最小 `config.json` bundled user template
   - 需要内部 `system config`
4. **缺函数：两文件 merge**
   - 需要 system default -> user override 的单向 merge
   - 需要 typed effective config，避免 host/orchestrator 再手搓 JSON
5. **缺接线：host / orchestrator config bootstrap**
   - host 需要移除当前硬编码默认值
   - orchestrator 需要从 config 选择 `noop` / `transport` runtime
6. **缺 projection：legacy provider config**
   - 缺 `virtualrouter.providers` inline provider -> `provider.runtime.transport` 的最小映射
   - 缺 legacy provider 选择规则（单 provider / default route 首 target）
   - 缺 `${ENV}` / `${ENV:-default}` 占位符的最小解析
7. **缺 projection：legacy routing bootstrap**
   - 缺 `virtualrouter.routing` -> 新 router bootstrap view 的最小映射
   - 缺 `virtualrouter.routingPolicyGroups + activeRoutingPolicyGroup` 的 active group 薄投影
   - 缺 route tier 的 typed bootstrap 结构与最小顺序保真
8. **缺验证**
   - 缺 Phase 11 docs gate
   - 缺 Batch 01 verify 脚本
   - 缺 Batch 02 verify 脚本
   - 缺 Batch 03 verify 脚本
   - 缺 phase11 CI workflow

## Batch 01 收口目标
1. 新增 `rcc-core-config` crate 与两份 config 文件。
2. host 通过 config 读取默认 addr / smoke / chat / service_name。
3. orchestrator 通过 config 驱动 `NoopProviderRuntime` / `TransportProviderRuntime`。
4. `bash scripts/verify_phase11_config_foundation_batch01.sh` 能自动证明：
   - docs/skills 完整
   - config crate 单测通过
   - host smoke 在 bundled config 下可运行
   - 显式 user config override 生效

## Batch 02 收口目标
1. old inline `virtualrouter.providers` 能最小投影到新 `provider.runtime.transport`。
2. 旧 provider 仍只作为 config 输入；真实 execute 继续只跑新 `rcc-core-provider`。
3. `bash scripts/verify_phase11_config_foundation_batch02.sh` 能自动证明：
   - old provider config 可驱动 transport runtime
   - env placeholder 可解析
   - `/v1/responses` 或 `/v1/messages` 真实 transport path 可返回结果

## Batch 03 收口目标
1. `virtualrouter.routing` 能最小投影到 typed router bootstrap view。
2. `routingPolicyGroups + activeRoutingPolicyGroup` 能只取 active routing 并投影到同一 typed view。
3. config crate 仍只输出 bootstrap data，不拥有 router 选择语义。
4. `bash scripts/verify_phase11_config_foundation_batch03.sh` 能自动证明：
   - legacy routing projection 成功
   - active routing policy group projection 成功
   - projected router bootstrap 可被新 Rust router helper 消费

## Batch 04 收口目标
1. `EffectiveConfig.router.bootstrap` 能进入运行时 `RouterBlock`。
2. `RouterBlock::select()` 在真实请求主链中可读到 bootstrap routes。
3. route 结果在运行时响应中可见，但 router 真源仍留在 `rcc-core-router`。
4. `bash scripts/verify_phase11_config_foundation_batch04.sh` 能自动证明：
   - runtime router 真实消费 config bootstrap
   - `/requests` 或 `/v1/responses` 返回 route candidate / selected route
   - host/orchestrator 未手搓第二套 routing 逻辑

## Batch 05 收口目标
1. active routing 中引用到的 legacy provider targets 能投影到 typed provider runtime registry bootstrap。
2. config crate 仍只输出 bootstrap data，不执行 selected_target -> runtime bind。
3. `bash scripts/verify_phase11_config_foundation_batch05.sh` 能自动证明：
   - legacy active routing targets 成功进入 `provider.runtime.registry.transports`
   - from-config 真实主链可消费 registry bootstrap
   - host/orchestrator 未手搓第二套 provider registry projection
   - 若 runtime registry 已能分辨 target provider family，canonical 主线优先消费该 bootstrap truth，而不是继续靠 heuristic
