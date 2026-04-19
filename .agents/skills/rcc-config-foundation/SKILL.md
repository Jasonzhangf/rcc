---
name: rcc-config-foundation
description: rcc-core 的 config foundation skill。用于把旧仓 config system 重构为两文件 Rust 基础设施，并保持 host/orchestrator/provider 薄边界。
---

# RCC Config Foundation

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的两文件 config foundation 约束。

## Trigger Signals
- 用户要求“把 config 系统直接移植过来，重构好了用”。
- 需要建立用户 `config.json` + 内部 `system config` 两文件模型。
- 发现 host/provider 默认值仍写在 Rust 常量或散落在多个 crate。

## Standard Actions
1. 先读：`docs/agent-routing/140-config-foundation-routing.md`。
2. 再读：`docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md` 与当前 batch 文档。
3. 先判断逻辑归属：
   - 路径解析 / 两文件加载 / merge / typed config → `rcc-core-config`
   - runtime bootstrap 装配 → `rcc-core-orchestrator`
   - CLI / HTTP 入参与 config 注入 → `rcc-core-host`
   - transport/auth/runtime 真源 → `rcc-core-provider`
4. 先移除 host/orchestrator 内部的语义默认硬编码，再让 system config 承载这些默认值。
5. user config 只保留最小 override；不要把系统默认值再复制一份给用户。
6. 允许保留“找到 config 文件本身”的最小 bootstrap 常量，但必须文档化，不得偷偷扩展成第二套语义默认值。
7. Batch 02 若需要兼容旧 config，只允许在 `rcc-core-config` 里做薄 projection：旧配置是输入边界，不是执行真源。
8. legacy provider projection 只允许收：
   - inline `virtualrouter.providers`
   - 单 provider 或 default route 首 target 的最小 select hint
   - `baseURL/base_url`、`endpoint`、`auth(apikey|none)`、`timeout`
   - `${ENV}` / `${ENV:-default}` 的最小占位符解析
   - `type=anthropic` 时只允许增加最薄协议默认值：`/v1/messages`、`x-api-key`、`anthropic-version`
9. Batch 03 若需要兼容旧 routing，只允许在 `rcc-core-config` 里做薄 projection：
   - `virtualrouter.routing`
   - `virtualrouter.routingPolicyGroups + activeRoutingPolicyGroup`
   - 只产出 typed router bootstrap view，不在 config crate 里执行 route selection
10. route tier 只保留最小 bootstrap 字段：
   - `id`
   - `targets`
   - `priority`（无显式值时按声明顺序派生）
11. Batch 04 若把 bootstrap 接入运行时，只允许：
   - `rcc-core-config` 输出 typed bootstrap data
   - `rcc-core-orchestrator` 做薄装配
   - `rcc-core-router` 做真实 route selection / route decision
12. Batch 05 若进入 provider runtime registry，只允许：
   - `rcc-core-config` 输出 typed registry bootstrap data
   - `rcc-core-orchestrator` 做薄装配
   - `rcc-core-provider` 做真实 selected_target -> runtime bind
13. 若 runtime registry bootstrap 已能分辨 target provider family，优先把这份 truth 暴露给 canonical outbound projection；不要让 orchestrator 继续靠 target 名或 model family 猜协议族。
14. 验证脚本若要证明 bundled/system config 行为，必须显式传入一个**不存在的临时 config 路径**；不要隐式读取用户 HOME 下已有的 `~/.rcc/config.json`。
15. 变更后先跑 `python3 scripts/verify_phase11_config_foundation.py`，再跑当前 batch verify。

## Acceptance Gate
- `rcc-core-config` 成为唯一 config 真源。
- 只有两个配置源：用户 `config.json` 与内部 `system config`。
- host/orchestrator/provider 仍保持薄边界。
- 当前语义默认值已从 Rust 常量迁到 system config。
- legacy provider 若已接线，也必须只是 config projection；真实 execute 仍只走新 `rcc-core-provider`。
- legacy routing 若已接线，也必须只是 router bootstrap projection；真实 route selection 仍只走新 `rcc-core-router`。
- runtime 接线若已完成，也必须是 config data -> router 真源，不能在 orchestrator/host 复制 route 选择。
- phase11 docs gate 和当前 batch 验证通过。

## Anti-Patterns
- 在 host 里继续保留一套默认值常量。
- 在 provider 或 router 里各自偷偷解析 config 文件。
- 把 router policy / tool governance / transport execute 语义塞进 config crate。
- 让 config crate 直接依赖 router block 并拥有 route decision。
- 验证脚本直接吃用户本机 `~/.rcc/config.json`，导致本地状态污染验证结论。
- 为 config 引入 daemon、watcher、后台线程。
- 用 fallback 掩盖解析错误或 merge 错误。
- 让旧 TS provider runtime 和新 Rust provider runtime 双真源并存。

## Boundaries
- 本 skill 只负责 config foundation，不替代 Phase 11A docs 真源。
- 若某段逻辑已证明属于 provider transport/auth/runtime，应留在 `rcc-core-provider`，不要回流 config crate。
- 若某段逻辑已证明属于 router.select / routing state / capability reorder，应留在 `rcc-core-router`，不要回流 config crate。
- 若后续进入 router/provider 复杂 config 业务，应开新 batch，不在本批次提前展开。

## Sources Of Truth
- `docs/agent-routing/140-config-foundation-routing.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md`
- `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
- `docs/CRATE_BOUNDARIES.md`
