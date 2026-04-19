# Phase 14 Host Provider Continuity E2E Gap Inventory

## 索引概要
- L1-L8 `purpose`：本文件定义 host/provider 安装态 continuity E2E 的缺口盘点真源。
- L10-L21 `current-state`：当前已具备和仍缺失的结构。
- L23-L31 `minimum-gaps`：本阶段必须补齐的最小 block / evidence。
- L33-L38 `non-goals`：当前阶段明确不做的内容。
- L40-L45 `done-signal`：进入实现与完成批次的判据。

## 目标
在进入 host/provider continuity 安装态实现前，先判断当前主线到底缺什么：缺 block / 缺函数 / 缺端到端证据 / 还是只缺 gate。缺就补最小真源；不缺就继续接线，避免把 continuity 再次散落到 host / compat / provider。

## 当前状态
1. `rcc-core-domain`
   - 已完成 response-id keyed continuation helper、request/response continuation semantics、responses shell continuity projection。
2. `rcc-core-pipeline`
   - 已完成 same-provider native / cross-provider fallback continuity owner、response-id store restore、explicit missing-store failure。
3. `rcc-core-orchestrator`
   - 已有 legacy anthropic from-config continuity 真源单测：
     - create-turn legacy anthropic execute
     - `submit_tool_outputs` fallback materialize
     - `from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only`
     - `response_id` keyed restore
4. `rcc-core-host`
   - 已完成 `/v1/responses` ingress shell 与 selected_target hit/miss 安装态验证。
   - **缺口**：还没有一条 host 安装态 anthropic continuity 两跳/三跳真实证据。
5. `rcc-core-testkit`
   - 已有 Phase 13 continuation smoke。
   - **缺口**：还没有安装态 HTTP server + anthropic upstream continuity 专用 smoke / harness。
6. docs / skills / CI
   - **缺口**：当前还没有 Phase 14A 的 workflow / routing / skill / verify / CI 真源。

## 本阶段最小缺口
1. 新建 Phase 14A docs / routing / skill / docs gate / CI。
2. 补一条 host 安装态 anthropic create-turn continuity 证据链。
3. 补一条 host 安装态 `submit_tool_outputs` response-id restore 证据链。
4. 补一条 host 安装态 ordinary `previous_response_id` fallback continuity + missing-store explicit failure 证据链。
5. 统一收口 batch gate 与 closeout 路线，避免临时脚本散落。

## 当前阶段明确不做
1. 不做 SSE / streaming continuity 安装态矩阵。
2. 不做 openai/responses provider-native delta continuity 安装态矩阵。
3. 不做第二套 response store / request-id rebind store。
4. 不做 host-side provider 调度层、后台 cache、daemon、sidecar。
5. 不做 provider health / failover / cooldown / quota。

## 进入实现 / 完成信号
1. docs 与 skill 已明确 host/provider continuity E2E 的位置、边界、最小输入输出。
2. 若发现缺 block 或缺 shared helper，必须先补真源再接线。
3. Batch 01 完成时，要能证明 create-turn `requires_action` + shell continuity 字段真实可见。
4. Batch 02 完成时，要能证明 `submit_tool_outputs` 只认 `response_id`，provider request 不泄漏原始 shape。
5. Batch 03 完成时，要能证明 ordinary `previous_response_id` fallback materialize 与 missing-store explicit failure。
6. Batch 04 / 05 完成时，要能一条命令收口本阶段并给出 closeout 真源。
