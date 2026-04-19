# Phase 11 Config Foundation Batch 02

## 索引概要
- L1-L8 `purpose`：本文件定义 Batch 02 的实现闭环。
- L10-L23 `scope`：本批次允许进入实现的最小范围。
- L25-L35 `flow`：legacy provider config 在主链中的正确位置。
- L37-L45 `boundaries`：本批次明确不做的内容。
- L47-L52 `verification`：当前批次验证入口。

## 目标
把 config system 的第二刀固定为：**旧 `virtualrouter.providers` 作为输入边界，对接新 Rust provider 真源**。当前批次只做最小、可测、可复用的 projection：

1. 保留旧 `.rcc/config.json` inline provider 形状；
2. 只在 `rcc-core-config` 内做薄 projection，不在 host/orchestrator/provider 里复制旧配置解释逻辑；
3. 把 legacy provider 映射为新 `provider.runtime.transport` bootstrap config；
4. host/orchestrator 继续只消费 typed effective config。

## 本批次最小范围
1. 目标文件规划：
   - `docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md`
   - `docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
   - `rust/crates/rcc-core-config/src/lib.rs`
   - `rust/crates/rcc-core-orchestrator/src/lib.rs`
   - `rust/crates/rcc-core-host/src/lib.rs`
   - `scripts/verify_phase11_config_foundation_batch02.sh`
2. 本批次只锁四段新语义：
   - legacy inline provider select hint（单 provider / default route 首 target）
   - legacy provider `baseURL/auth/type/timeout/endpoint` projection
   - 环境变量占位符的最小解析（如 `${OPENAI_API_KEY}` / `${OPENAI_API_KEY:-}`）
   - old provider config -> new `provider.runtime.transport` bootstrap
3. 允许的输入：
   - `virtualrouter.providers`
   - 可选 `virtualrouter.routing.default[0].targets[0]` 作为最小 provider select hint
   - `type=openai|openai-standard|responses|anthropic`
   - `auth.type=apikey|none`
4. 允许的输出：
   - 新 `EffectiveConfig.provider.runtime`
   - host/orchestrator 可直接驱动 `TransportProviderRuntime`
5. 当前批次最小实现结果：
   - `normalize_legacy_virtualrouter_provider_runtime`
   - legacy provider env placeholder resolve
   - old inline provider config 驱动 `/v1/responses` 或 `/v1/messages` transport execute

## 正确流水线位置
```text
old .rcc/config.json
  -> rcc-core-config (thin projection only)
    -> EffectiveConfig.provider.runtime
      -> rcc-core-orchestrator
        -> rcc-core-provider (唯一执行真源)
```

## 本批次明确不做
1. 不做 legacy routing policy 的完整 materialize。
2. 不做 `~/.rcc/provider/*/config.v2.json` provider dir loader。
3. 不做 OAuth family / cookie auth / token file provider projection。
4. 不做多 provider runtime registry 或 failover。
5. 不做 TS provider runtime 回调或双真源并存。

## 当前验证入口
- 当前 docs / skills gate：`python3 scripts/verify_phase11_config_foundation.py`
- 当前实现阶段入口：`bash scripts/verify_phase11_config_foundation_batch02.sh`
- 当前缺口盘点真源：`docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md`
- 当前批次最小 Rust 回归：
  - `cargo test --manifest-path rust/Cargo.toml -p rcc-core-config -p rcc-core-orchestrator -p rcc-core-host`
  - `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet -- --config <legacy-config> serve`
