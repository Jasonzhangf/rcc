# Phase 04 Servertool Block Batch 05

## 索引概要
- L1-L9 `target`：本批次目标与旧仓来源。
- L11-L28 `scope`：本批次要实现的最小闭环。
- L30-L48 `in-out`：输入输出契约。
- L50-L58 `boundaries`：明确不做的范围。
- L60-L68 `verification`：测试与验收方式。

## 目标与来源
本批次从 followup 分支切到 `stop gateway` 最小闭环：把旧仓 `stop-gateway-context.ts` 中“显式 gateway context 优先，否则 fallback 到 inspect”这段 servertool block 语义收拢到 `rcc-core-servertool`，继续保持 host/provider/orchestrator 极薄。

旧仓主要来源：
1. `../routecodex/sharedmodule/llmswitch-core/src/servertool/stop-gateway-context.ts`
   - `inspectStopGatewaySignal`
   - `resolveStopGatewayContext`
   - `isStopEligibleForServerTool`
2. 已迁入 `rcc-core-domain` 的纯函数：
   - `inspect_stop_gateway_signal`
   - `is_stop_eligible_for_server_tool`
   - `StopGatewayContext`

Rust 目标文件：
- `rust/crates/rcc-core-servertool/src/stop_gateway.rs`
- `rust/crates/rcc-core-servertool/src/lib.rs`

## 本批次闭环范围
### 要做
1. 在 `rcc-core-servertool` 提供 block 级 stop gateway API：
   - `resolve_stop_gateway_context(payload)`
2. 输入最小固定为：
   - `base_response`
   - `stop_gateway_context`（可选）
3. 处理语义：
   - 若 `stop_gateway_context` 存在且能正常化，则直接使用它
   - 否则 fallback 到 `inspect_stop_gateway_signal(base_response)`
4. 输出固定为 canonical context：
   - `observed`
   - `eligible`
   - `source`
   - `reason`
   - `choice_index?`
   - `has_tool_calls?`
5. `plan()` 只允许把 `tool.stop.gateway` 路由到这个 block API，不得复制 stop 判定逻辑。

## 输入输出契约
### 输入 payload 形状
```json
{
  "base_response": {
    "choices": [
      {
        "finish_reason": "stop",
        "message": { "content": "done" }
      }
    ]
  },
  "stop_gateway_context": {
    "observed": true,
    "eligible": false,
    "source": "chat",
    "reason": "cached_context",
    "choice_index": 0,
    "has_tool_calls": true
  }
}
```

### 输出要求
- 输出必须是 servertool block 内部统一的 canonical context；不得在 block 内读取 provider runtime metadata，也不得回流 provider/host 再解释这段语义。
- `stop_gateway_context` 若格式非法，必须显式 fallback 到 `base_response` 判定，不做静默假成功。

## 明确不做
1. 不做 runtime metadata attach/read。
2. 不做 reasoning-stop-guard engine。
3. 不做 stop-message-auto / clock-auto / followup orchestration。
4. 不做 host/provider/orchestrator 额外包装层。
5. 不做新的 daemon/sidecar/runtime 进程。

## 验证与验收
1. 文档/技能阶段：`python3 scripts/verify_phase4_servertool_block.py`
2. 实现阶段：`bash scripts/verify_phase4_servertool_stop_gateway.sh`
3. 主测试命令：`cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit`
4. Rust 测试至少覆盖：
   - 显式 `stop_gateway_context` 覆盖 base 判定
   - 非法 context fallback 到 domain inspect
   - chat stop 无 tool calls 时 eligible=true
   - chat tool calls / embedded markers 时 eligible=false
   - responses required_action 时 eligible=false
   - `tool.stop.gateway` plan 只做薄路由，不复制判定逻辑
