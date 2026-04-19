# Config Foundation 路由

## 索引概要
- L1-L7 `scope`：本路由覆盖的任务范围。
- L9-L17 `docs-map`：Phase 11A 相关文档与技能入口。
- L19-L31 `rules`：两文件 config foundation 约束。
- L33-L36 `verification`：验证与 CI 入口。

## 覆盖范围
适用于：把旧仓 config 系统按 Rust 架构重构迁入 `rcc-core`，先建立**两文件**基础设施：用户最小 `config.json` + 内部 `system config`。该阶段只做 config foundation，不把 router/provider/servertool 业务语义塞进 config，也不重开 TS 壳层。

## 文档与 skill 映射
1. `docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md`
   - Phase 11A 的总流程、最小实现顺序与闭环判据。
2. `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md`
   - 第一批实现闭环：路径解析、两文件 merge、host/orchestrator 最小接线。
3. `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md`
   - 第二批实现闭环：legacy inline provider config projection 到新 provider bootstrap。
4. `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md`
   - 第三批实现闭环：legacy routing / active routing policy group projection 到新 router bootstrap。
5. `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md`
   - 第四批实现闭环：把 typed router bootstrap 接到运行时 `RouterBlock` 主链。
6. `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md`
   - 第五批实现闭环：legacy provider targets -> typed provider runtime registry bootstrap。
7. `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
   - 当前 config 基础设施缺口盘点真源。
7. `.agents/skills/rcc-config-foundation/SKILL.md`
   - config foundation 的可复用动作。
8. `docs/RUST_WORKSPACE_ARCHITECTURE.md`
   - 确认 `rcc-core-config` 属于 bootstrap/foundation，而不是业务 block。
9. `docs/CRATE_BOUNDARIES.md`
   - 确认 config 只拥有路径解析、两文件加载、merge，不拥有业务语义。

## 规则
1. 只允许两个配置源：
   - 用户最小配置：`config.json`
   - 系统默认配置：`system config`（内部使用，不暴露给用户）
2. 语义默认值必须放入 `system config`；不得继续把 host/provider 的语义默认值硬编码在 Rust 常量里。
3. 允许保留**最小 bootstrap 常量**用于“找到 config 文件本身”（如默认用户目录与文件名）；这不算业务语义默认值，但必须文档化。
4. config crate 只负责：
   - 路径解析
   - 两文件加载
   - system default -> user override 单向 merge
   - typed effective config 暴露
   - legacy config 到 typed bootstrap view 的薄 projection（provider/runtime、router bootstrap）
5. config crate 不负责：
   - virtual router policy 的完整 materialize
   - router.select 的运行期决策
   - provider transport execute
   - host/servertool 业务 fallback
   - TS provider runtime 或旧 runtime 复用
6. Batch 05 若进入 provider runtime registry，只允许投影 bootstrap data；selected_target -> runtime bind 仍必须留在 orchestrator/provider。
7. host 必须保持极薄：只加载 resolved config，再交给 orchestrator/provider bootstrap；不得在 host 里手搓第二套 merge 或默认值。
8. 默认单进程、单 runtime；本阶段不引入 config daemon、watcher、后台刷新线程。

## 验证与 CI
- 文档/技能阶段：`python3 scripts/verify_phase11_config_foundation.py`
- Batch 01 实现阶段：`bash scripts/verify_phase11_config_foundation_batch01.sh`
- Batch 02 实现阶段：`bash scripts/verify_phase11_config_foundation_batch02.sh`
- Batch 03 实现阶段：`bash scripts/verify_phase11_config_foundation_batch03.sh`
- Batch 04 实现阶段：`bash scripts/verify_phase11_config_foundation_batch04.sh`
- Batch 05 实现阶段：`bash scripts/verify_phase11_config_foundation_batch05.sh`
- 当前 CI 入口：`.github/workflows/phase11-config-foundation.yml`
