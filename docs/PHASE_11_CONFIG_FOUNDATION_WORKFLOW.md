# Phase 11 Config Foundation Workflow

## 索引概要
- L1-L8 `purpose`：本文件是 Phase 11A 的总流程真源。
- L10-L19 `sequence`：从 docs 到 skill 到 dev 到 test 的执行顺序。
- L21-L34 `minimum-scope`：当前阶段允许实现的最小 config 闭环。
- L36-L40 `verification`：验证与 CI 入口。
- L42-L47 `done`：本阶段完成判据。

## 目标
把旧仓 config system 按当前 Rust 三层架构重构迁入 `rcc-core`，先建立**两文件 config foundation**：
1. 用户最小配置：`config.json`
2. 系统内部默认配置：`system config`

本阶段只解决加载、merge、typed 暴露与 host/orchestrator 最小接线，不提前回收 virtual router/provider family 的完整业务配置。

## 执行顺序
1. **Docs**
   - 先写/更新：
     - `docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md`
     - `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
     - `docs/agent-routing/140-config-foundation-routing.md`
     - `docs/RUST_WORKSPACE_ARCHITECTURE.md`
     - `docs/CRATE_BOUNDARIES.md`
2. **Skills**
   - 建立：`.agents/skills/rcc-config-foundation/SKILL.md`
3. **Development**
   - 只做当前批次要求的最小 config scaffold，不提前做 config admin API、热重载、provider profile materialize。
4. **Test**
   - 先跑 `python3 scripts/verify_phase11_config_foundation.py`
   - Batch 01 跑 `bash scripts/verify_phase11_config_foundation_batch01.sh`
   - Batch 02 跑 `bash scripts/verify_phase11_config_foundation_batch02.sh`
   - Batch 03 跑 `bash scripts/verify_phase11_config_foundation_batch03.sh`
   - Batch 04 跑 `bash scripts/verify_phase11_config_foundation_batch04.sh`
   - Batch 05 跑 `bash scripts/verify_phase11_config_foundation_batch05.sh`
5. **Close**
   - docs、skills、实现与验证通过后，后续 batch 才允许继续展开更深的 provider/router config 业务。

## 当前阶段最小实现范围
1. 新增 `rcc-core-config` crate，作为 config 真源。
2. 只允许两个配置文件语义：
   - `config.json`：面向用户的最小 override
   - `system config`：内部默认值
3. Phase 11A Batch 01 只负责：
   - 端到端路径解析：显式路径 -> 环境变量 -> 默认 `~/.rcc/config.json`
   - system default + user override 的单向 merge
   - typed effective config 暴露
   - host/orchestrator 把当前硬编码默认值改为 config 驱动
4. Phase 11A Batch 02 只负责：
   - 旧 `virtualrouter.providers` inline provider 配置投影
   - 最小 legacy provider select hint（单 provider 或 default route 首 target）
   - legacy provider -> 新 `provider.runtime.transport` bootstrap projection
   - 保持旧配置只是输入边界，新 `rcc-core-provider` 仍是唯一执行真源
5. Phase 11A Batch 03 只负责：
   - 旧 `virtualrouter.routing` / `routingPolicyGroups + activeRoutingPolicyGroup`
   - 投影到 typed router bootstrap view
   - 保持 config 只做 bootstrap data，不在 config crate 内执行 router 选择
6. Phase 11A Batch 04 只负责：
   - 把 `EffectiveConfig.router.bootstrap` 接到运行时 `RouterBlock`
   - 让 bootstrap routing 在真实请求主链中可见
   - 保持 route selection 真源仍在 `rcc-core-router`
7. Phase 11A Batch 05 只负责：
   - 把 active routing 中引用到的 legacy provider 投影到 typed provider runtime registry bootstrap
   - 保持 config 只输出 registry bootstrap data，不在 config crate 内执行 runtime 选择
   - 让 orchestrator/provider 能从 typed bootstrap 做 selected_target -> runtime bind
8. 当前阶段不负责：
   - config admin HTTP API
   - 文件热重载 / watcher
   - virtual router group / policy 的完整 materialize（Batch 03/04 只取 active routing）
   - `~/.rcc/provider/*/config.v2.json` provider dir loader
   - 多 provider runtime registry
   - 额外 daemon、sidecar、后台 worker

## 验证入口
- 当前文档/技能阶段：`python3 scripts/verify_phase11_config_foundation.py`
- Batch 01 实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch01.sh`
- Batch 02 实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch02.sh`
- Batch 03 实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch03.sh`
- Batch 04 实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch04.sh`
- Batch 05 实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase11-config-foundation.yml`

## 完成判据
1. Phase 11A docs 与 routing 完整。
2. config foundation skill 已落盘。
3. `rcc-core-config` 两文件加载、merge、typed 暴露已落盘。
4. host/orchestrator 不再依赖当前那组 host 默认硬编码常量。
5. legacy `virtualrouter.providers` 已能最小投影到新 provider bootstrap。
6. legacy routing 已能最小投影到新 router bootstrap view。
7. runtime router 已真实消费 `EffectiveConfig.router.bootstrap`。
8. provider runtime registry bootstrap 已可从 config 输出，并供下游做 selected_target bind。
9. phase11 verify 脚本与 CI 可自动收口当前批次。
