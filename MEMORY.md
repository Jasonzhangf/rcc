# rcc-core Project Memory

## 架构决议
- 2026-04-17：Jason 明确要求 rcc-core 的后续 Rust 架构遵循三条约束：1）包装尽量薄，不做无意义重复包装；2）模块功能单一、边界不重合；3）控制 runtime 资源消耗，若无必要不要单独开进程。后续 skeleton / crate 设计、host 壳层和 servertool 方案都必须按这三条审查。
- 2026-04-17（架构拍板）：Jason 确认 rcc-core 的目标框架为 `编排层 → block 真源层 → 纯函数层`；servertool 必须独立成一级 block；provider 层严格只保留 transport/auth/runtime；host 从第一天开始保持极薄，默认不使用 TS 业务层，只做聚合。
- 2026-04-17（Phase 02 docs闭环）：Rust workspace 架构文档、crate 边界文档、skeleton workflow、rust skeleton skill、phase2 验证脚本与 CI 已建立；下一步直接进入 `rcc-core-2.5`，实现最小 Cargo workspace skeleton。
- 2026-04-17（Phase 02 skeleton闭环）：最小 Rust Cargo workspace 已建立，包含 domain/pipeline/router/servertool/provider/orchestrator/host/testkit 八个 crate；验证入口为 `bash scripts/verify_phase2_cargo_skeleton.sh`，当前默认单进程、单 runtime、host 极薄。
- 2026-04-17（Phase 03 batch01闭环）：已从旧 routecodex 迁移 `args-json` 到 `rcc-core-domain::args_json`，保持纯函数形态，无 I/O；新增 7 个 Rust 单测并通过 `bash scripts/verify_phase3_args_json.sh` 验证；Phase 02 skeleton 回归也已通过。
- 2026-04-17（Phase 03 batch02闭环）：已从旧 routecodex 迁移 `tools/exec-command/normalize.ts` 到 `rcc-core-domain::exec_command_normalize`，同时把最小 `repairFindMeta` 纯 helper 下沉到 domain；新增 batch02 文档、验证脚本 `bash scripts/verify_phase3_exec_command_normalize.sh`、6 个 Rust 单测，且 Phase 02 skeleton 回归继续通过。
- 2026-04-17（Phase 03 batch03闭环）：已从旧 routecodex 迁移 `tools/tool-description-utils.ts` 到 `rcc-core-domain::tool_description`；该批次把跨 filters / hub 复用的共享 helper 直接下沉 domain，并新增 `bash scripts/verify_phase3_tool_description.sh` 与 7 个 Rust 单测；Phase 02 skeleton 回归继续通过。
- 2026-04-17（Phase 03 batch04闭环）：已从旧 routecodex 迁移 `tools/apply-patch/structured/coercion.ts` 到 `rcc-core-domain::apply_patch_structured`，并带入最小 strict JSON parse helper 与 structured payload guard；新增 `bash scripts/verify_phase3_apply_patch_structured.sh` 与 8 个 Rust 单测；Phase 02 skeleton 回归继续通过。
- 2026-04-17（Phase 03 batch05闭环）：已从旧 routecodex 迁移 `request-tool-choice-policy.ts` 与 `response-finish-invariants.ts` 到 `rcc-core-domain::tool_protocol_invariants`；该批次把 filter 中的 request/response tool protocol invariants 先下沉为共享纯函数，并新增 `bash scripts/verify_phase3_tool_protocol_invariants.sh` 与 7 个 Rust 单测；Phase 02 skeleton 回归继续通过。
- 2026-04-17（Phase 03 batch06闭环）：已从旧 routecodex 迁移 `tools/tool-registry.ts` 中的共享 guard/helper 真源到 `rcc-core-domain::tool_registry_guards`；该批次只抽 allowed tool names / forbidden write detect / image path detect，不迁 `validateToolCall` 总开关与外部 validator 壳；新增 `bash scripts/verify_phase3_tool_registry_guards.sh` 与 8 个 Rust 单测，phase3 gate、domain 43 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch07闭环）：已从旧 routecodex 迁移 `filters/special/request-tool-list-filter.ts` 中的 MCP resource discovery 纯 helper 到 `rcc-core-domain::mcp_resource_discovery`；该批次只抽 output shape extractor / tool-message server 汇总 / empty-list detector，不迁日志、env、tool 注入与 filter apply 壳；新增 `bash scripts/verify_phase3_mcp_resource_discovery.sh` 与 5 个 Rust 单测，phase3 gate、domain 48 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch08闭环）：已从旧 routecodex 迁移 `tools/apply-patch/patch-text/looks-like-patch.ts` 与 `tool-governor-guards.ts` 中最小 apply-patch payload candidate 语义到 `rcc-core-domain::apply_patch_text`；该批次只抽 patch recognizer / candidate guard，不迁 patch normalize、validator、args-normalizer 与 tool-governor 壳；新增 `bash scripts/verify_phase3_apply_patch_text.sh` 与 6 个 Rust 单测，phase3 gate、domain 54 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch09闭环）：已从旧 routecodex 迁移 `servertool/stop-gateway-context.ts` 中的 stop gateway signal detector 到 `rcc-core-domain::stop_gateway`；该批次只抽 embedded marker 检测、tool-like output 检测与 chat/responses eligibility 判定，不迁 runtime metadata attach/read 壳；新增 `bash scripts/verify_phase3_stop_gateway.sh` 与 6 个 Rust 单测，phase3 gate、domain 60 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch10闭环）：已从旧 routecodex 迁移 `servertool/handlers/followup-message-trimmer.ts` 中的 followup message trimming core 到 `rcc-core-domain::followup_message_trim`；该批次只抽消息裁剪、tool adjacency 与 user anchor 保留逻辑，不迁 followup build/injection 壳；新增 `bash scripts/verify_phase3_followup_message_trim.sh` 与 6 个 Rust 单测，phase3 gate、domain 66 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch11闭环）：已从旧 routecodex 迁移 `servertool/handlers/stop-message-auto/blocked-report.ts` 中的消息文本提取与 blocked report 解析到 `rcc-core-domain::blocked_report`；该批次只抽 parser/normalizer，不迁 bd/fs/path/child_process 壳；新增 `bash scripts/verify_phase3_blocked_report.sh` 与 6 个 Rust 单测，phase3 gate、domain 72 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch12闭环）：已从旧 routecodex 迁移 `conversion/shared/marker-lifecycle.ts` 中的 marker syntax cleaner pure helpers 到 `rcc-core-domain::marker_lifecycle`；该批次只抽 text/content/messages 清洗与 `has_marker_syntax`，不迁 request/record bridge 壳；验证时发现空白压缩需严格对齐 TS 的 `replace(/[ \\t]+\\n/g, '\\n').replace(/\\n{3,}/g, '\\n\\n').trim()` 语义，已修正；新增 `bash scripts/verify_phase3_marker_lifecycle.sh` 与 6 个 Rust 单测，phase3 gate、domain 78 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch13闭环）：已从旧 routecodex 迁移 `router/virtual-router/routing-stop-message-state-codec.ts` 与 `servertool/handlers/stop-message-auto/routing-state.ts` 中重复的 stop-message state shared codec 到 `rcc-core-domain::stop_message_state`；该批次只抽 stage/ai mode normalize、max repeats resolve、history normalize、snapshot resolve 与 armed-state 判定，不迁 router/servertool 的 state create/clear/patch/native wrapper 壳；验证时补齐了 TS `Math.floor` 后应落整型 number 的细节；新增 `bash scripts/verify_phase3_stop_message_state.sh` 与 6 个 Rust 单测，phase3 gate、domain 84 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch14闭环）：已从旧 routecodex 迁移 `router/virtual-router/message-utils.ts` 到 `rcc-core-domain::message_utils`；该批次只抽 latest user/role 提取、message text 提取、keyword 检测、extended thinking keyword 检测与 media attachment signals，不迁 `features.ts` 聚合、token/native/router 外层壳；新增 `bash scripts/verify_phase3_message_utils.sh` 与 8 个 Rust 单测，phase3 gate、domain 92 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch15闭环）：已从旧 routecodex 迁移 `servertool/handlers/stop-message-auto/blocked-report.ts` 中被 `ai-followup.ts` 复用的 message content text helper 到 `rcc-core-domain::message_content_text`；该批次只抽 captured message text 提取、content text 提取、unknown text 递归抽取与 dedupe/join，不迁 blocked report parser 与 ai followup snapshot 业务语义；`blocked_report.rs` 已改为直接复用共享 helper，模块更薄；新增 `bash scripts/verify_phase3_message_content_text.sh` 与 3 个 Rust 单测，phase3 gate、domain 95 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch16闭环）：已从旧 routecodex 迁移 `router/virtual-router/tool-signals.ts` 到 `rcc-core-domain::tool_signals`；该批次只下沉 tool 声明检测、meaningful tool name 提取、assistant tool_call 分类与 shell-like command 读/写/搜索判定，不迁 `features.ts` 聚合与 routing 壳；实现中补齐了 `bash -lc/sh -c/zsh -c` 剥壳后的外层引号处理，并将 TS 中依赖 lookahead 的输出重定向检测改为 Rust 等价纯 helper；新增 `bash scripts/verify_phase3_tool_signals.sh` 与 6 个 Rust 单测，phase3 gate、domain 101 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch17闭环）：已从旧 routecodex 迁移 `router/virtual-router/context-weighted.ts` 到 `rcc-core-domain::context_weighted`；该批次只下沉 context-weighted 配置归一、effective safe window 计算与 context multiplier 纯数学 helper，不迁 profile resolve、pool 选择与 router 调度壳；验证时确认旧公式里 `slack` 会抵消 `reserve`，因此 `warnRatio` 非法回退到 `0.9` 时某些 case 结果应保持 `effectiveMax` 而非继续扣减；新增 `bash scripts/verify_phase3_context_weighted.sh` 与 5 个 Rust 单测，phase3 gate、domain 106 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch18闭环）：已从旧 routecodex 迁移 `router/virtual-router/health-weighted.ts` 到 `rcc-core-domain::health_weighted`；该批次只下沉 health-weighted 配置归一、time-decayed health multiplier 与 final weight 纯数学 helper，不迁 quota view 构造、pool 选择与 retry 编排壳；实现中保持了 `!lastErrorAtMs` 的旧语义，因此 `lastErrorAtMs=0` 仍直接视为未激活；新增 `bash scripts/verify_phase3_health_weighted.sh` 与 5 个 Rust 单测，phase3 gate、domain 111 tests、phase2 skeleton 回归均通过。
- 2026-04-17（Phase 03 batch19闭环）：已从旧 routecodex 迁移 `router/virtual-router/context-advisor.ts` 到 `rcc-core-domain::context_advisor`；该批次只下沉 context routing 配置归一、provider context limit fallback、safe/risky/overflow 分类与 usage snapshot 纯 helper，不迁 profile lookup callback 与 router route 编排壳；实现中把外部 lookup 改写成显式 provider limit 输入，同时保留缺失/非法 limit 时回退 `DEFAULT_MODEL_CONTEXT_TOKENS` 的旧语义；新增 `bash scripts/verify_phase3_context_advisor.sh` 与 5 个 Rust 单测，phase3 gate、domain 116 tests、phase2 skeleton 回归均通过。
- 2026-04-17（规则分层修正）：Jason 明确要求“通用开发规则上收至全局 `coding-principals` skill，本地 `.agents/skills/` 只保留 rcc-core 项目级约束”。后续新增规则时，先判断是否应进入全局 skill，再决定是否写入本地 skill。

## 2026-04-17 — Phase 03 Batch 20 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-state-codec.ts`
- Target: `rust/crates/rcc-core-domain/src/pre_command_state.rs`
- Kept semantics: serialize only trimmed non-empty `preCommandSource` / `preCommandScriptPath` plus finite `preCommandUpdatedAt`; deserialize only merges valid fields and never clears existing state on invalid input.
- Skill refined: thin state codec migration should only move trim / finite guard / merge semantics; parser/action/store/default resolve stay outside domain.
- Verification: `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_pre_command_state.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (121 tests passed).

## 2026-04-17 — Phase 03 Batch 21 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/clean.ts`
- Target: `rust/crates/rcc-core-domain/src/routing_instruction_clean.rs`
- Kept semantics: `stripCodeSegments` keeps empty-input behavior and removes fenced/inline code by replacing matches with spaces; `cleanMessagesFromRoutingInstructions` only rewrites string user content, trims after removing routing markers, and drops only user messages that become empty.
- Skill refined: routing/message clean helpers may only rewrite string user content; non-user or non-string content must pass through unchanged.
- Verification: `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_routing_instruction_clean.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (126 tests passed).

## 2026-04-17 — Phase 03 Batch 22 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-stop-message-state-codec.ts`（native 之外的 fallback/merge codec）
- Target: `rust/crates/rcc-core-domain/src/routing_stop_message_codec.rs`
- Kept semantics: reasoning-stop serialize merge only appends valid `reasoningStopMode` / `reasoningStopArmed` / trimmed `reasoningStopSummary` / rounded non-negative `reasoningStopUpdatedAt`; fallback patch keeps raw `stopMessageText` while using `trim()` only for emptiness checks, floors persisted repeats, clamps used count non-negative, reuses shared stop-message normalize/history semantics, and backfills default max repeats only when persisted repeats are absent.
- Skill refined: for native-backed codec, only migrate native-external fallback/merge state semantics; native capability/binding shell must stay outside domain.
- Verification: `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_routing_stop_message_codec.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (131 tests passed).

## 2026-04-17 — Phase 03 Batch 23 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-parser.ts`（token reader slice）
- Target: `rust/crates/rcc-core-domain/src/pre_command_token.rs`
- Kept semantics: empty body returns `None`; quoted body requires an unescaped matching closing quote and returns only the quoted span with `\" -> "` and `\' -> '` unescaped; unquoted body uses first-comma split plus trim, otherwise returns whole trimmed body.
- Skill refined: when parser file mixes env/default resolver with token reading, only move quoted-token reader / closing-quote scan / comma split core into domain.
- Verification: `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_pre_command_token.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (136 tests passed).

## 2026-04-17 — Phase 03 Batch 24 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-pre-command-parser.ts`（directive classify slice）
- Target: `rust/crates/rcc-core-domain/src/pre_command_directive.rs`
- Kept semantics: trimmed empty input returns `None`; bare `precommand` maps to default; only `precommand\s*:` prefix enters body parsing; body must be non-empty and reuse the shared token reader; `clear/off/none` map to clear, `on` maps to default, otherwise token becomes explicit.
- Skill refined: when parser outer shell still depends on resolver/env, continue splitting pure directive classify / keyword dispatch layer into domain, keep final instruction assembly outside.
- Verification: `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_pre_command_directive.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (141 tests passed).

## 2026-04-17 — Phase 03 Batch 25 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/routing-instructions/parse.ts`
- Target: `rust/crates/rcc-core-domain/src/routing_instruction_preprocess.rs`
- Kept semantics: `preprocess_routing_instructions` only slices instruction arrays after the **first** `clear` (matching old TS `findIndex + slice` behavior); `has_clear_instruction` and `has_stop_message_clear_instruction` only inspect instruction `type` fields and keep the native parse/messages shell outside domain.
- Skill refined: when a parse module mixes native/message shell with instruction-array helpers, only migrate the pure preprocess / flag-detect slice; before closeout, re-check whether list slicing semantics are first-match or last-match, and never infer it from the new implementation itself.
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_routing_instruction_preprocess.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (146 tests passed).

## 2026-04-17 — Phase 03 Batch 26 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/conversion/shared/reasoning-normalizer.ts`
- Target: `rust/crates/rcc-core-domain/src/reasoning_markup.rs`
- Kept semantics: `value_may_contain_reasoning_markup` keeps the old recursive scan semantics across strings / arrays / objects and matches reasoning markers case-insensitively; `strip_reasoning_transport_noise` removes `[Time/Date]:` transport-noise lines, trims leading/trailing `[thinking]` / `[思考]` wrappers, collapses 3+ consecutive newlines to 2, and returns the final trimmed text.
- Skill refined: when a normalizer file mixes native payload normalize shell with preflight helpers, only migrate recursive markup detect / transport-noise strip into domain; native payload patch stays outside, and detection recursion must be tested on nested array/object shapes instead of only flat strings.
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_reasoning_markup.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (151 tests passed).

## 2026-04-17 — Phase 03 Batch 27 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-sanitize.ts`
- Target: `rust/crates/rcc-core-domain/src/followup_sanitize.rs`
- Kept semantics: `sanitize_followup_text` keeps the old `unknown -> empty string` guard, strips stop-message markers, `[Time/Date]: ...` blocks, and `[Image omitted]`, trims spaces around newlines, collapses 3+ blank lines to 2, and `sanitize_followup_snapshot_text` stays an exact alias of the same sanitizer.
- Skill refined: when TS sanitizer depends on regex lookahead that Rust `regex` cannot express, do not hard-translate the pattern; rewrite it as an equivalent explicit scanner and lock the literal-boundary behavior with tests.
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_followup_sanitize.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (156 tests passed).

## 2026-04-17 — Phase 03 Batch 28 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
- Target: `rust/crates/rcc-core-domain/src/followup_request_utils.rs`
- Kept semantics: `resolve_followup_model` keeps the old fallback priority `assignedModelId -> modelId -> seedModel -> model -> originalModelId`; `extract_responses_top_level_parameters` preserves the allowlist plus `max_tokens -> max_output_tokens` back-compat mapping; `normalize_followup_parameters` removes inherited `stream` / `tool_choice`; `drop_tool_by_function_name` removes only matching named tools while keeping unnamed object tools and dropping invalid non-object entries.
- Skill refined: when a request-builder file mixes responses rebuild / injection orchestration with request-seed helpers, only migrate the fallback/normalize/filter helper slice; keep bridge/injection shells outside, and explicitly test field-priority order plus back-compat parameter mapping.
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_followup_request_utils.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (163 tests passed).

## 2026-04-18 — Phase 03 Batch 29 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`
- Target: `rust/crates/rcc-core-domain/src/followup_tool_compact.rs`
- Kept semantics: `compact_tool_content_value` preserves old string-vs-JSON stringification behavior, keeps the original text when within limit, and otherwise compacts with the same `keepHead=max(24,floor(maxChars*0.45))`, `keepTail=max(24,floor(maxChars*0.35))`, and `...[tool_output_compacted omitted=N]...` marker; `compact_tool_content_in_messages` only rewrites `tool` role messages and keeps the old `maxChars` fallback/clamp semantics (`invalid -> 1200`, minimum `64`).
- Skill refined: when request-builder logic only compacts tool outputs, keep exact head/tail ratio, max-char clamp, and tool-role-only rewrite boundary; do not pull followup payload assembly into domain.
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase3_pure_functions.py`, `bash scripts/verify_phase3_followup_tool_compact.sh`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain` (168 tests passed).


## 2026-04-18 — Phase 04A Batch 01 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`（最小 followup request 主链）
- Target: `rust/crates/rcc-core-servertool/src/followup.rs` + `rust/crates/rcc-core-servertool/src/lib.rs`
- Kept semantics: `rcc-core-servertool` 现在提供第一个真实 block API——从 captured seed + adapter context + followup text 构造 canonical chat-like followup request；内部复用 `sanitize_followup_text`、`trim_openai_messages_for_followup`、`compact_tool_content_in_messages`、`resolve_followup_model`、`normalize_followup_parameters`、`drop_tool_by_function_name`，而 `plan()` 只保留薄兼容壳来判断 followup request 是否可计划。
- Skill refined: block 迁移时，先让 `servertool` 提供一个真实 block API，再让 `plan()`/orchestrator 做薄调用；不要在兼容壳里复制 followup 语义，也不要把 provider-specific payload rebuild 提前带回 block。
- Verification: `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_followup_request.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`（同时脚本内已覆盖 phase1/phase2/phase3 gate、domain 168 tests、servertool 4 tests、testkit 2 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 02 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`（assistant/tool-output injection slice）
- Target: `rust/crates/rcc-core-servertool/src/followup.rs` + `rust/crates/rcc-core-servertool/src/lib.rs`
- Kept semantics: batch02 在 batch01 的 canonical followup request builder 上补了最小 injection：assistant message 优先取 `choices[0].message`，缺失时 fallback 到 `output_text -> { role: assistant, content }`；tool outputs 从 `tool_outputs[]` 生成 tool role messages，保留 `tool_call_id`，`name` 缺省为 `tool`，非字符串 content 按 JSON stringification；若请求注入且缺失数据，默认 fail fast，只有显式 `required=false` 才允许跳过；tool messages 注入后仍统一走 compact，再 append 最终 followup user text。
- Skill refined: followup injection 仍是 servertool block 真源，不得回流 host/provider/orchestrator；缺失 assistant/tool-output 时禁止静默 fallback，必须保留 required gate。
- Verification: `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_followup_injection.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`（同时脚本内已覆盖 phase1/phase2/phase3 gate、domain 168 tests、servertool 9 tests、testkit 3 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 03 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`（system / vision injection slice）
- Target: `rust/crates/rcc-core-servertool/src/followup.rs` + `rust/crates/rcc-core-servertool/src/followup/tests.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch03 在 batch02 followup builder 上补了 `inject_system_text` / `inject_vision_summary` 最小闭环；system text 会插入到首个非-system message 之前并保留已有 leading system messages；vision summary 会先在 array content 中把 image parts 替换为 `[Image omitted]` 并追加 `[Vision] ...`，若未命中则 fallback 到最后一条 user message（array 追加 text part，string 追加 `\n[Vision] ...`，其它 content 直接替换），仍无 user 时再新建 user message；固定顺序保持为 `trim -> system/vision injection -> assistant/tool-output injection -> compact -> final user text`。
- Skill refined: system/vision injection 仍属于 servertool block 真源，不能回流 host/provider；实现文件保持薄、测试拆到独立 `followup/tests.rs`，避免主实现文件膨胀。
- Verification: `python3 scripts/verify_phase4_servertool_block.py`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `bash scripts/verify_phase4_servertool_followup_system_vision.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 17 tests、testkit 4 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 04 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/followup-request-builder.ts`（tool governance slice） + `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`（`REASONING_STOP_TOOL_DEF`）
- Target: `rust/crates/rcc-core-servertool/src/followup.rs` + `rust/crates/rcc-core-servertool/src/followup/tool_governance.rs` + `rust/crates/rcc-core-servertool/src/followup/tests/batch01_03.rs` + `rust/crates/rcc-core-servertool/src/followup/tests/batch04.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch04 在 batch03 followup builder 上补了最小 tool governance：`ensure_standard_tools` 只在已有 tools 非空时生效，不会凭空造假工具面；当 `inject_system_text` / `followup_text` 含 `reasoning.stop` 或 `stopless`，或原工具集中已含 `reasoning.stop` 时，会补最小 `reasoning.stop` tool def；`force_tool_choice` 可写入或清除 `parameters.tool_choice`，且 function choice 会同步把 `parallel_tool_calls=false`；`append_tool_if_missing` 只在同名 function tool 缺失时追加，并支持无 tools 时新建 array。
- Skill refined: tool governance 仍是 servertool block 真源，provider 不能解释这些业务字段；为保持单文件门限与薄包装，tool governance helper 独立拆到 `followup/tool_governance.rs`，测试拆为 `batch01_03.rs` / `batch04.rs`，避免主实现和测试文件膨胀。
- Verification: `python3 scripts/verify_phase4_servertool_block.py`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `bash scripts/verify_phase4_servertool_followup_tool_governance.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 25 tests、testkit 5 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 05 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/stop-gateway-context.ts`（最小 stop gateway context resolve slice）
- Target: `rust/crates/rcc-core-servertool/src/stop_gateway.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch05 在不引入 runtime metadata bridge 的前提下，为 `rcc-core-servertool` 增加了最小 stop gateway block API：`resolve_stop_gateway_context(payload)` 先正常化显式 `stop_gateway_context`，非法时才 fallback 到 domain `inspect_stop_gateway_signal(base_response)`，输出统一 canonical snake_case context；`plan(tool.stop.gateway)` 只消费这个 canonical context 做薄分类，不复制 stop 判定逻辑，`eligible=true` -> `servertool.stop.gateway.eligible`，`source=none && reason=invalid_payload` 或 payload 缺失 -> `invalid`，其余 -> `blocked`。
- Skill refined: stop gateway block 迁移先只收 `显式 context 优先 + base_response fallback` 这一条真实主链；provider 仍只做 transport/auth/runtime，不把 runtime metadata attach/read 或 stop 自动编排提前带回 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_stop_gateway.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 35 tests、testkit 6 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 06 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop.ts`（reasoning.stop payload normalize / summary / tool_output slice） + `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`（`REASONING_STOP_TOOL_DEF`）
- Target: `rust/crates/rcc-core-servertool/src/reasoning_stop.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-servertool/src/followup/tool_governance.rs` + `rust/crates/rcc-core-servertool/src/followup/tests/batch04.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch06 为 `rcc-core-servertool` 增加了最小 reasoning.stop block API：`build_reasoning_stop_tool_output(payload)` 接收 `tool_call`，按旧仓别名规则归一参数并执行最小校验；成功时输出 `{ok:true,summary}` 的 canonical tool_output，失败时输出 `{ok:false,code,message}` 的 canonical tool_output；`plan(tool.reasoning.stop)` 只判断 block 是否能产出 tool_output，不复制 payload 校验逻辑，因此语义错误仍走 `valid` 路由，由 block 内 error tool_output 显式承载。与此同时，`REASONING_STOP_TOOL_DEF` 真源收回 `reasoning_stop.rs`，followup tool governance 改为薄复用同一份定义，避免重复壳层。
- Skill refined: reasoning.stop 迁移先只收 `tool_call -> normalize -> summary/error tool_output` 这一条真实主链；不要把 state arm、guard prompt、memory append、stop-message-auto 或 finalize engine 提前混进 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_reasoning_stop.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 47 tests、testkit 7 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 07 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`（summary normalize / arm slice）
- Target: `rust/crates/rcc-core-servertool/src/reasoning_stop.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop/tests.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch07 在不引入 sticky-session/runtime metadata 的前提下，为 `rcc-core-servertool` 增加了最小 reasoning.stop state arm block API：`build_reasoning_stop_state_patch(payload)` 优先读取显式 `summary`，空时才 fallback 到 batch06 canonical `tool_output.content` 里的 success summary；summary 保持旧仓 trim + 4000 字裁剪语义；输出通过 domain `merge_reasoning_stop_serialization` 生成 canonical patch（`reasoningStopArmed=true`、`reasoningStopSummary`、`reasoningStopUpdatedAt`）并保留 `base_state` 既有字段。`plan(tool.reasoning.stop.arm)` 只判断 patch 是否可生成，不复制 summary 解析逻辑。
- Skill refined: reasoning.stop state arm 迁移先只收 `summary/tool_output -> canonical patch` 这一条真实主链；不要把 sticky persistence、mode sync、clear/read、fail-count、guard 或 auto-loop 提前混进 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_reasoning_stop_state.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 53 tests、testkit 8 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 08 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`（`normalizeSummary` / `readReasoningStopState` / `clearReasoningStopState` 的显式 state object 切片）
- Target: `rust/crates/rcc-core-servertool/src/reasoning_stop/state_view.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop/tests.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch08 在不引入 sticky-session/runtime metadata 持久化的前提下，为 `rcc-core-servertool` 增加了最小 reasoning.stop state read/clear block API：`read_reasoning_stop_state_view(payload)` 只消费显式 `state` object，输出 canonical `{armed, summary, updated_at?}` 视图，并保持旧仓 trim + 4000 字裁剪 + `armed=true && summary 非空` + `updated_at=floor(max(0,n))` 语义；`build_clear_reasoning_stop_state_result(payload)` 只删除 `reasoningStopArmed` / `reasoningStopSummary` / `reasoningStopUpdatedAt` / `reasoningStopFailCount`，保留其它字段，若删除后对象为空则返回 `null`。`plan(tool.reasoning.stop.read)` 与 `plan(tool.reasoning.stop.clear)` 只做薄路由，不复制 read/clear 业务逻辑。
- Skill refined: reasoning.stop state read/clear 迁移先只收 `显式 state -> canonical view/result` 这一条真实主链；不要把 sticky persistence、mode sync、fail-count 读写、guard 或 auto-loop 提前混进 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 61 tests、testkit 10 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 09 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/servertool/handlers/reasoning-stop-state.ts`（`extractStoplessDirectiveModeFromText` / `stripStoplessDirectiveMarkersFromCapturedRequest` / `syncReasoningStopModeFromRequest` 的显式 request/state 切片）
- Target: `rust/crates/rcc-core-servertool/src/reasoning_stop/directive_mode.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop/tests.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch09 在不引入 sticky-session/runtime metadata 持久化的前提下，为 `rcc-core-servertool` 增加了最小 reasoning.stop mode sync block API：`build_reasoning_stop_mode_sync_result(payload)` 只消费显式 `captured` request、可选 `base_state` 与 `fallback_mode`；先按旧仓优先级读取 `reasoningStopDirectiveMode` / `__reasoningStopDirectiveMode`，否则从最后一个 user message 中解析最后一个合法 `<**stopless:on|off|endless**>` marker，并在无 stored mode 时把 `captured.messages` / `captured.input` 的 user content 中完整 `<**stopless:...**>` marker 统一剥离；最终输出 canonical `{mode, captured, state_patch?}`。当 directive mode 存在时，`state_patch` 基于 `base_state` 合并 `reasoningStopMode`；若 mode=`off`，同时清掉 `reasoningStopArmed` / `reasoningStopSummary` / `reasoningStopUpdatedAt`。`plan(tool.reasoning.stop.mode.sync)` 只做薄路由，不复制 mode parse/strip/sync 逻辑。
- Skill refined: reasoning.stop mode sync 迁移先只收 `显式 captured/base_state -> canonical mode result` 这一条真实主链；不要把 sticky persistence、runtime metadata、raw responses rebuild、fail-count 或 guard 提前混进 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 67 tests、testkit 11 tests、host smoke）。


## 2026-04-18 — Phase 04A Batch 10 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/sticky-session-store.ts`（`loadRoutingInstructionStateSync` / `saveRoutingInstructionStateSync` / `isPersistentKey` / `keyToFilename` / `resolveSessionFilepaths` / `atomicWriteFileSync` 的显式 sticky-key 持久化切片）
- Target: `rust/crates/rcc-core-servertool/src/reasoning_stop/sticky_store.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop.rs` + `rust/crates/rcc-core-servertool/src/lib.rs` + `rust/crates/rcc-core-servertool/src/reasoning_stop/tests.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`
- Kept semantics: batch10 在不引入 runtime metadata、全量 router state codec 或 async queue 的前提下，为 `rcc-core-servertool` 增加了最小 reasoning.stop sticky persistence block API：`save_reasoning_stop_sticky_state(payload)` 只消费显式 `sticky_key`、可选 `session_dir` 与 object/null `state`；`session:` / `conversation:` / `tmux:` 三类 key 保持旧仓 persistent-key 语义，文件名继续按 safe-id 规则把非法字符替换为 `_`；object state 以 `{\"version\":1,\"state\":...}` 做 sync 原子写入，null state 删除文件。`load_reasoning_stop_sticky_state(payload)` 只消费显式 `sticky_key` 与可选 `session_dir`，文件缺失时返回 canonical `{sticky_key,state:null}`，文件存在时同时接受 version envelope 与 bare object 两种形状。`plan(tool.reasoning.stop.sticky.save/load)` 只做薄路由，不复制 sticky store 逻辑。
- Skill refined: reasoning.stop sticky persistence 迁移先只收 `显式 sticky_key/state object -> sync save/load result` 这一条真实主链；不要把 runtime metadata、full router state codec、async queue、telemetry recover、fail-count 或 guard 提前混进 block。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-servertool -p rcc-core-testkit`, `python3 scripts/verify_phase4_servertool_block.py`, `bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh`（脚本内已覆盖 phase1/phase2/phase3/phase4 gate、domain 168 tests、servertool 73 tests、testkit 13 tests、host smoke）。


## 2026-04-18 — Repo baseline organized for initial publish
- Scope: 本次未新增重复脚本壳层，而是把现有 `scripts/verify_phase2_cargo_skeleton.sh` 明确定义为“近期最小可跑路径”统一入口；新增 `README.md` 与 `docs/SHORT_TERM_MINIMAL_PATH.md`，并在 routing / testing docs 中补齐入口映射。
- Decision: 为符合“包装尽量薄”，最小可跑 gate 直接复用 phase2 skeleton 现有验证链，不再额外套一层同义 wrapper；同时保留 `bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh` 作为当前更强基线验证。
- Cleanup: 补全 `.gitignore`（editor/python/rust/local runtime/task state），并清理 `rcc-core-servertool` 当前两个 Rust warning，确保提交前 baseline 干净。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `bash scripts/verify_phase2_cargo_skeleton.sh`, `bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh`。


## 2026-04-18 — Phase 05A provider block docs gate opened
- Decision: servertool phase4 已形成当前可推送基线后，下一大任务切到 provider block；但边界继续锁死在 `transport / auth / runtime`，不把 route/tool/protocol 业务语义带进 provider。
- Scope: 已落盘 `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`、`docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md`、`docs/agent-routing/80-provider-block-routing.md`、`.agents/skills/rcc-provider-block-migration/SKILL.md`、`scripts/verify_phase5_provider_block.py`、phase5 CI workflow。
- Batch01 boundary: 先只收 `base_url + endpoint + apikey/no-auth headers + timeout + body -> canonical transport request plan`，不提前做真实 HTTP、OAuth、runtime metadata、SSE 或 provider health。
- Verification: `python3 scripts/verify_phase5_provider_block.py`。


## 2026-04-18 — Phase 05A Batch 01 closed
- Source: `../routecodex/src/providers/core/runtime/runtime-endpoint-resolver.ts`（`resolveEffectiveBaseUrl` / `resolveEffectiveEndpoint`） + `../routecodex/src/providers/auth/apikey-auth.ts`（`buildHeaders` / no-auth） + `../routecodex/src/providers/core/runtime/provider-request-header-orchestrator.ts`（最小 `Content-Type` + auth header build 主链）。
- Target: `rust/crates/rcc-core-provider/src/transport_request_plan.rs` + `rust/crates/rcc-core-provider/src/auth_apikey.rs` + `rust/crates/rcc-core-provider/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs`.
- Kept semantics: batch01 为 `rcc-core-provider` 增加了最小 provider block API：`resolve_effective_base_url(payload)`、`resolve_effective_endpoint(payload)`、`build_apikey_headers(payload)`、`build_transport_request_plan(payload)`；只消费显式 provider/runtime/service config 与 `request_body`，输出 canonical transport request plan（`method/target_url/headers/body/timeout_ms`）。`Authorization` 默认 `Bearer <apiKey>`，自定义 header 直接写原值，空 key 允许 no-auth，`timeout_ms` 缺失或非法时回退 `60000`。
- Skill refined: provider batch01 先只收 `base_url + endpoint + apikey/no-auth headers + timeout + body -> canonical transport request plan` 这条真实主链；不要把真实 HTTP、OAuth、runtime metadata、SSE、provider health 或 route/tool 业务语义提前混进 provider。
- Verification: `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_transport_request_plan.sh`, `cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit`, `cargo run --manifest-path rust/Cargo.toml -p rcc-core-host --quiet`.


## 2026-04-18 — Phase 05A Batch 02 docs/skills gate closed
- Source: `../routecodex/src/providers/core/runtime/http-request-executor.ts` + `../routecodex/src/providers/core/runtime/provider-http-executor-utils.ts` + `../routecodex/src/providers/core/runtime/http-transport-provider.ts`（只锁最小 HTTP execute/retry skeleton 边界，不进入实现）。
- Scope: 已落盘 `docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md`，并同步更新 `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`、`docs/agent-routing/80-provider-block-routing.md`、`.agents/skills/rcc-provider-block-migration/SKILL.md`、`docs/TESTING_AND_ACCEPTANCE.md`、`scripts/verify_phase5_provider_block.py`。
- Locked boundary: batch02 先只收 `canonical transport request plan -> minimal HTTP execute + retry skeleton + normalized transport error`；默认 `max_attempts=1`，只有显式提高上限时才允许对 `5xx` 做 retry 判定；不提前混入 OAuth recovery、runtime metadata、SSE、provider health、virtual router failover、snapshot telemetry。
- Skill refined: provider HTTP execute 迁移必须继续保持薄包装和资源受控；若需要 client/依赖，优先单 runtime 内轻量收敛，不为了 transport execute 提前引入 daemon、sidecar、后台 worker 或多余 async 基础设施。
- Verification: `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_transport_request_plan.sh`.


## 2026-04-18 — Phase 05A Batch 02 closed
- Source: `../routecodex/src/providers/core/runtime/http-request-executor.ts` + `../routecodex/src/providers/core/runtime/provider-http-executor-utils.ts` + `../routecodex/src/providers/core/runtime/http-transport-provider.ts`（最小 HTTP execute / retry / error normalize slice）。
- Target: `rust/crates/rcc-core-provider/src/http_execute.rs` + `rust/crates/rcc-core-provider/src/http_retry.rs` + `rust/crates/rcc-core-provider/src/lib.rs` + `rust/crates/rcc-core-provider/Cargo.toml` + `rust/crates/rcc-core-testkit/src/lib.rs` + `scripts/verify_phase5_provider_http_execute.sh` + `.github/workflows/phase5-provider-block.yml`。
- Kept semantics: batch02 为 `rcc-core-provider` 增加了最小 provider transport execute API：`execute_transport_request(payload)` 消费 Batch01 的 canonical request plan，返回 canonical execute result 或 normalized transport error；`get_http_retry_limit` / `should_retry_http_error` / `resolve_http_retry_delay_ms` 保持 provider 层默认单次尝试、仅显式提高上限时对 `5xx` 做 retry 判定、delay 维持 `min(500*attempt, 2000)`；错误稳定归一为 `http_status` / `transport` / `timeout`，存在状态码时生成 `HTTP_<status>` code。
- Resource decision: 为保持单 runtime、薄包装和低资源占用，batch02 采用同步轻量 HTTP client（`ureq`）直接在 provider 内执行，不引入独立进程、后台 worker 或额外 async runtime；host/orchestrator 继续保持薄壳，没有复制 execute/retry 语义。
- Skill refined: provider HTTP execute 迁移先只闭合 `request plan -> execute -> retry helper -> normalized error` 主链；retry 仍是 transport 辅助，不等于 router failover，不把 OAuth recovery、runtime metadata、SSE、provider health 混进同一批。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_http_execute.sh`.


## 2026-04-18 — Phase 05A Batch 03 docs/skills gate closed
- Source: `../routecodex/src/providers/core/runtime/provider-runtime-metadata.ts` + `../routecodex/src/providers/core/runtime/provider-request-preprocessor.ts` + `../routecodex/src/providers/core/runtime/transport/provider-payload-utils.ts` + `../routecodex/src/providers/core/runtime/base-provider-runtime-helpers.ts`（只锁最小 runtime metadata attach-read / preprocess 边界，不进入实现）。
- Scope: 已落盘 `docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md`，并同步更新 `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`、`docs/agent-routing/80-provider-block-routing.md`、`.agents/skills/rcc-provider-block-migration/SKILL.md`、`docs/TESTING_AND_ACCEPTANCE.md`、`scripts/verify_phase5_provider_block.py`。
- Locked boundary: batch03 先只收 `runtime metadata attach-read + request preprocess 的最小 metadata 投影`；provider 只允许 attach/read carrier，并只投影 `entryEndpoint` / `stream` / `clientHeaders` / `__origModel`；不提前混入 tmux/session/conversation/followup/stopless、sticky scope、response metadata enrich、provider family profile、runtime detector 或 protocol conversion。
- Skill refined: provider runtime metadata 迁移必须继续保持薄包装和资源受控；provider 只负责 transport/runtime 级 carrier 附着与读取，不负责解释更上层业务字段，也不为此引入新进程、daemon、后台 worker 或额外常驻 runtime。
- Verification: `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_http_execute.sh`.


## 2026-04-18 — Phase 05A Batch 03 closed
- Source: `../routecodex/src/providers/core/runtime/provider-runtime-metadata.ts` + `../routecodex/src/providers/core/runtime/provider-request-preprocessor.ts` + `../routecodex/src/providers/core/runtime/transport/provider-payload-utils.ts` + `../routecodex/src/providers/core/runtime/base-provider-runtime-helpers.ts`（最小 runtime metadata attach-read / preprocess slice）。
- Target: `rust/crates/rcc-core-provider/src/runtime_metadata.rs` + `rust/crates/rcc-core-provider/src/request_preprocessor.rs` + `rust/crates/rcc-core-provider/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs` + `scripts/verify_phase5_provider_runtime_metadata.sh` + `.github/workflows/phase5-provider-block.yml`。
- Kept semantics: batch03 为 `rcc-core-provider` 增加了最小 runtime metadata API：`attach_provider_runtime_metadata(payload)`、`extract_provider_runtime_metadata(payload)`、`extract_entry_endpoint(payload)`、`extract_client_request_id(payload)`、`normalize_client_headers(payload)`、`preprocess_provider_request(payload)`；provider 只处理 attach/read carrier 与 request preprocess，且只投影 `entryEndpoint` / `stream` / `clientHeaders` / `__origModel` 这四类 transport/runtime 需要的 metadata，`request.metadata.clientHeaders` 优先于 runtime metadata 同名 headers。
- Resource decision: 为保持 payload 语义和 host/provider 薄边界，batch03 没有把 runtime metadata 混进真实 transport body，也没有引入新进程、daemon、后台 worker 或额外 runtime；attach/read 只在 provider 内部 envelope 闭环。
- Skill refined: runtime metadata 迁移先只闭合 `attach -> preprocess -> read helper` 主链；provider 不解释 tmux/session/conversation/followup/stopless 等业务语义，也不把 session key/sticky scope/runtime detector 混进同一批。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_runtime_metadata.sh`.


## 2026-04-18 — Phase 05A Batch 04 docs/skills gate closed
- Source: `../routecodex/src/providers/core/runtime/http-transport-provider.ts` + `../routecodex/src/providers/core/runtime/http-request-executor.ts` + `../routecodex/src/providers/core/runtime/provider-response-postprocessor.ts` + `../routecodex/src/providers/core/utils/http-client.ts`（只锁最小 upstream SSE transport boundary，不进入 snapshot/normalizer/host bridge）。
- Scope: 已落盘 `docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md`，并同步更新 `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`、`docs/agent-routing/80-provider-block-routing.md`、`.agents/skills/rcc-provider-block-migration/SKILL.md`、`docs/TESTING_AND_ACCEPTANCE.md`、`scripts/verify_phase5_provider_block.py`。
- Locked boundary: batch04 先只收 `wants upstream SSE -> request body stream=true -> raw SSE carrier wrap`；provider 只输出 canonical `__sse_responses` raw carrier，不提前混入 snapshot attach、event normalizer、Host->Client bridge、Gemini/Qwen/Responses 专用协议语义。
- Skill refined: SSE 迁移必须继续保持薄包装和资源受控；provider 只负责 upstream transport boundary，不负责业务级流式语义解释，也不为此引入独立进程、daemon、后台 worker 或额外 runtime。
- Verification: `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_runtime_metadata.sh`.


## 2026-04-18 — Phase 05A Batch 04 closed
- Source: `../routecodex/src/providers/core/runtime/http-transport-provider.ts` + `../routecodex/src/providers/core/runtime/http-request-executor.ts` + `../routecodex/src/providers/core/runtime/provider-response-postprocessor.ts` + `../routecodex/src/providers/core/utils/http-client.ts`（最小 upstream SSE transport slice）。
- Target: `rust/crates/rcc-core-provider/src/sse_transport.rs` + `rust/crates/rcc-core-provider/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs` + `scripts/verify_phase5_provider_sse_transport.sh` + `.github/workflows/phase5-provider-block.yml`。
- Kept semantics: batch04 为 `rcc-core-provider` 增加了最小 SSE transport API：`resolve_wants_upstream_sse(payload)`、`prepare_sse_request_body(payload)`、`wrap_upstream_sse_response(payload)`、`execute_sse_transport_request(payload)`；provider 只根据显式 `request.stream` / `request.metadata.stream` / `wants_sse` 判定是否走 upstream SSE，把 request body 归一为 `stream=true`，并把上游 `text/event-stream` 原始返回包装成 canonical `__sse_responses { status, headers, content_type, body }` raw carrier，不做 event 级解释。
- Resource decision: 为保持单 runtime 与薄包装，batch04 继续复用同步轻量 HTTP client（`ureq`）读取 raw SSE body，不引入 snapshot attach、event normalizer、Host bridge、独立进程或额外 async runtime；host/orchestrator 仍然保持极薄，没有复制 streaming transport 语义。
- Skill refined: SSE 迁移先只闭合 `resolve wants_sse -> mark request body -> execute raw SSE -> wrap carrier` 主链；provider 不解释业务级 streaming semantics，也不把协议层 responses/gemini/qwen 专用处理混进同一批。
- Verification: `cargo fmt --manifest-path rust/Cargo.toml --all`, `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_sse_transport.sh`.

## 2026-04-18 — Phase 05A review doc closed
- Scope: 已补齐 `docs/PHASE_05_PROVIDER_BLOCK_REVIEW.md`，并同步更新 `docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md`、`docs/agent-routing/80-provider-block-routing.md`、`scripts/verify_phase5_provider_block.py`，把 Phase 05A 已完成范围、锁死边界、验证入口与下一步建议收口为单一 review 真源。
- Locked conclusion: provider 在 Phase 05A 内的唯一真源范围继续固定为 `transport / auth / runtime`；host/orchestrator 继续保持极薄，不复制 provider 语义，不新增 daemon/sidecar/额外 runtime。
- Reusable rule: 当一个阶段已完成多批迁移后，必须补一份 review 真源回答“已经完成什么/明确不做什么/下一步从哪开始”，避免后续阶段反复回头重新判定边界。
- Verification: `python3 scripts/verify_phase5_provider_block.py`, `bash scripts/verify_phase5_provider_sse_transport.sh`.

## 2026-04-18 — Phase 06A router block docs gate opened
- Decision: 在 Phase 05A provider review 收口后，下一大任务切到 `rcc-core-router`；原因是 router 仍停留在 skeleton `select()`，而 domain 已经沉淀了多批 router 相关纯函数，适合进入 block 真源迁移。
- Scope: 已落盘 `docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md`、`docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md`、`docs/agent-routing/90-router-block-routing.md`、`.agents/skills/rcc-router-block-migration/SKILL.md`、`scripts/verify_phase6_router_block.py`、phase6 CI workflow，并同步更新 `AGENTS.md`、`docs/agent-routing/00-entry-routing.md`、`docs/TESTING_AND_ACCEPTANCE.md`。
- Locked boundary: router 在 Phase 06A 内的唯一真源范围固定为 `route selection / routing state / health-quota`；host/orchestrator 继续保持极薄，provider 继续只做 `transport / auth / runtime`，servertool 继续只做 followup/stop/clock。
- Batch01 boundary: 先只收 `route candidate normalization + routing state filter + instruction target`，不提前混入 alias queue、sticky pool、health/quota/cooldown、provider failover。
- Verification: `python3 scripts/verify_phase1_foundation.py`, `python3 scripts/verify_phase2_architecture_docs.py`, `python3 scripts/verify_phase5_provider_block.py`, `python3 scripts/verify_phase6_router_block.py`.

## 2026-04-18 — Phase 06A Batch 01 closed
- Source: `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/route-utils.ts` + `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/routing-state-filter.ts` + `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/instruction-target.ts` + `../routecodex/sharedmodule/llmswitch-core/src/router/virtual-router/engine-selection/key-parsing.ts`。
- Target: `rust/crates/rcc-core-router/src/route_candidates.rs` + `rust/crates/rcc-core-router/src/routing_state_filter.rs` + `rust/crates/rcc-core-router/src/instruction_target.rs` + `rust/crates/rcc-core-router/src/lib.rs` + `rust/crates/rcc-core-testkit/src/lib.rs` + `scripts/verify_phase6_router_batch01.sh`。
- Kept semantics: Batch01 在不引入 alias queue、sticky pool、health/quota/cooldown、provider failover 的前提下，为 `rcc-core-router` 增加了最小 router block API：`build_route_candidates(payload)`、`filter_candidates_by_routing_state(routes, state, routing, provider_registry)`、`resolve_instruction_target(target, provider_registry)`；provider registry 只以显式最小 view 进入 router（`provider_id / key_alias / runtime_index / model_id`），不拖入完整 provider runtime/auth/transport 配置。
- Skill refined: router batch01 迁移先只闭合 `route candidate normalization -> routing state filter -> instruction target` 主链；不要把 capability reorder、alias queue、sticky pool、health/quota/cooldown、provider failover 提前混进 block。
- Verification: `cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-testkit`, `bash scripts/verify_phase6_router_batch01.sh`。
