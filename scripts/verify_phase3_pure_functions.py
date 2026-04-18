#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/60-pure-functions-routing.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_01.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_02.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_03.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_04.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_05.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_06.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_07.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_08.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_09.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_10.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_11.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_12.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_13.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_14.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_15.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_16.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_17.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_18.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_19.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_20.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_21.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_22.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_23.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_24.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_25.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_26.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_27.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_28.md',
    'docs/PHASE_03_PURE_FUNCTIONS_BATCH_29.md',
    '.agents/skills/rcc-pure-functions-migration/SKILL.md',
    '.github/workflows/phase3-pure-functions.yml',
]

errors: list[str] = []
checks: list[str] = []

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')

for rel in REQUIRED_FILES:
    p = ROOT / rel
    if not p.exists():
        errors.append(f'missing file: {rel}')
    else:
        checks.append(f'found {rel}')

if not errors:
    agents = read('AGENTS.md')
    for marker in ['docs/agent-routing/60-pure-functions-routing.md', '.agents/skills/rcc-pure-functions-migration/SKILL.md']:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '60-pure-functions-routing.md' not in entry:
        errors.append('00-entry-routing missing phase3 pure-functions route')

    route = read('docs/agent-routing/60-pure-functions-routing.md')
    for marker in ['## 索引概要', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_01.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_02.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_03.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_04.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_05.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_06.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_07.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_08.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_09.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_10.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_11.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_12.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_13.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_14.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_15.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_16.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_17.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_18.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_19.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_20.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_21.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_22.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_23.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_24.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_25.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_26.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_27.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_28.md', 'docs/PHASE_03_PURE_FUNCTIONS_BATCH_29.md', '.agents/skills/rcc-pure-functions-migration/SKILL.md', 'bash scripts/verify_phase3_exec_command_normalize.sh', 'bash scripts/verify_phase3_tool_description.sh', 'bash scripts/verify_phase3_apply_patch_structured.sh', 'bash scripts/verify_phase3_tool_protocol_invariants.sh', 'bash scripts/verify_phase3_tool_registry_guards.sh', 'bash scripts/verify_phase3_mcp_resource_discovery.sh', 'bash scripts/verify_phase3_apply_patch_text.sh', 'bash scripts/verify_phase3_stop_gateway.sh', 'bash scripts/verify_phase3_followup_message_trim.sh', 'bash scripts/verify_phase3_blocked_report.sh', 'bash scripts/verify_phase3_marker_lifecycle.sh', 'bash scripts/verify_phase3_stop_message_state.sh', 'bash scripts/verify_phase3_message_utils.sh', 'bash scripts/verify_phase3_message_content_text.sh', 'bash scripts/verify_phase3_tool_signals.sh', 'bash scripts/verify_phase3_context_weighted.sh', 'bash scripts/verify_phase3_health_weighted.sh', 'bash scripts/verify_phase3_context_advisor.sh', 'bash scripts/verify_phase3_pre_command_state.sh', 'bash scripts/verify_phase3_routing_instruction_clean.sh', 'bash scripts/verify_phase3_routing_stop_message_codec.sh', 'bash scripts/verify_phase3_pre_command_token.sh', 'bash scripts/verify_phase3_pre_command_directive.sh', 'bash scripts/verify_phase3_routing_instruction_preprocess.sh', 'bash scripts/verify_phase3_reasoning_markup.sh', 'bash scripts/verify_phase3_followup_sanitize.sh', 'bash scripts/verify_phase3_followup_request_utils.sh', 'bash scripts/verify_phase3_followup_tool_compact.sh']:
        if marker not in route:
            errors.append(f'60-pure-functions-routing missing marker: {marker}')

    phase3 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_01.md')
    for marker in ['args-json.ts', 'rcc-core-domain/src/args_json.rs', 'bash scripts/verify_phase3_args_json.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_01 missing marker: {marker}')

    phase3_batch02 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_02.md')
    for marker in ['normalize.ts', 'tooling.ts', 'rcc-core-domain/src/exec_command_normalize.rs', 'bash scripts/verify_phase3_exec_command_normalize.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch02:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_02 missing marker: {marker}')

    phase3_batch03 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_03.md')
    for marker in ['tool-description-utils.ts', 'rcc-core-domain/src/tool_description.rs', 'bash scripts/verify_phase3_tool_description.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch03:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_03 missing marker: {marker}')

    phase3_batch04 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_04.md')
    for marker in ['structured/coercion.ts', 'json/parse-loose.ts', 'structured.ts', 'rcc-core-domain/src/apply_patch_structured.rs', 'bash scripts/verify_phase3_apply_patch_structured.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch04:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_04 missing marker: {marker}')

    phase3_batch05 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_05.md')
    for marker in ['request-tool-choice-policy.ts', 'response-finish-invariants.ts', 'rcc-core-domain/src/tool_protocol_invariants.rs', 'bash scripts/verify_phase3_tool_protocol_invariants.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch05:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_05 missing marker: {marker}')

    phase3_batch06 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_06.md')
    for marker in ['tool-registry.ts', 'rcc-core-domain/src/tool_registry_guards.rs', 'bash scripts/verify_phase3_tool_registry_guards.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch06:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_06 missing marker: {marker}')

    phase3_batch07 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_07.md')
    for marker in ['request-tool-list-filter.ts', 'rcc-core-domain/src/mcp_resource_discovery.rs', 'bash scripts/verify_phase3_mcp_resource_discovery.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch07:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_07 missing marker: {marker}')

    phase3_batch08 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_08.md')
    for marker in ['looks-like-patch.ts', 'tool-governor-guards.ts', 'rcc-core-domain/src/apply_patch_text.rs', 'bash scripts/verify_phase3_apply_patch_text.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch08:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_08 missing marker: {marker}')

    phase3_batch09 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_09.md')
    for marker in ['stop-gateway-context.ts', 'rcc-core-domain/src/stop_gateway.rs', 'bash scripts/verify_phase3_stop_gateway.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch09:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_09 missing marker: {marker}')

    phase3_batch10 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_10.md')
    for marker in ['followup-message-trimmer.ts', 'rcc-core-domain/src/followup_message_trim.rs', 'bash scripts/verify_phase3_followup_message_trim.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch10:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_10 missing marker: {marker}')

    phase3_batch11 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_11.md')
    for marker in ['blocked-report.ts', 'rcc-core-domain/src/blocked_report.rs', 'bash scripts/verify_phase3_blocked_report.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch11:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_11 missing marker: {marker}')

    phase3_batch12 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_12.md')
    for marker in ['marker-lifecycle.ts', 'rcc-core-domain/src/marker_lifecycle.rs', 'bash scripts/verify_phase3_marker_lifecycle.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch12:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_12 missing marker: {marker}')

    phase3_batch13 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_13.md')
    for marker in ['routing-stop-message-state-codec.ts', 'stop-message-auto/routing-state.ts', 'rcc-core-domain/src/stop_message_state.rs', 'bash scripts/verify_phase3_stop_message_state.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch13:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_13 missing marker: {marker}')

    phase3_batch14 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_14.md')
    for marker in ['message-utils.ts', 'rcc-core-domain/src/message_utils.rs', 'bash scripts/verify_phase3_message_utils.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch14:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_14 missing marker: {marker}')

    phase3_batch15 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_15.md')
    for marker in ['blocked-report.ts', 'ai-followup.ts', 'rcc-core-domain/src/message_content_text.rs', 'bash scripts/verify_phase3_message_content_text.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch15:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_15 missing marker: {marker}')

    phase3_batch16 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_16.md')
    for marker in ['tool-signals.ts', 'rcc-core-domain/src/tool_signals.rs', 'bash scripts/verify_phase3_tool_signals.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch16:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_16 missing marker: {marker}')

    phase3_batch17 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_17.md')
    for marker in ['context-weighted.ts', 'rcc-core-domain/src/context_weighted.rs', 'bash scripts/verify_phase3_context_weighted.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch17:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_17 missing marker: {marker}')

    phase3_batch18 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_18.md')
    for marker in ['health-weighted.ts', 'rcc-core-domain/src/health_weighted.rs', 'bash scripts/verify_phase3_health_weighted.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch18:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_18 missing marker: {marker}')

    phase3_batch19 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_19.md')
    for marker in ['context-advisor.ts', 'rcc-core-domain/src/context_advisor.rs', 'bash scripts/verify_phase3_context_advisor.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch19:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_19 missing marker: {marker}')

    phase3_batch20 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_20.md')
    for marker in ['routing-pre-command-state-codec.ts', 'routing-instructions/types.ts', 'rcc-core-domain/src/pre_command_state.rs', 'bash scripts/verify_phase3_pre_command_state.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch20:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_20 missing marker: {marker}')

    phase3_batch21 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_21.md')
    for marker in ['routing-instructions/clean.ts', 'routing-instructions/types.ts', 'rcc-core-domain/src/routing_instruction_clean.rs', 'bash scripts/verify_phase3_routing_instruction_clean.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch21:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_21 missing marker: {marker}')

    phase3_batch22 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_22.md')
    for marker in ['routing-stop-message-state-codec.ts', 'rcc-core-domain/src/routing_stop_message_codec.rs', 'bash scripts/verify_phase3_routing_stop_message_codec.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch22:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_22 missing marker: {marker}')

    phase3_batch23 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_23.md')
    for marker in ['routing-pre-command-parser.ts', 'rcc-core-domain/src/pre_command_token.rs', 'bash scripts/verify_phase3_pre_command_token.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch23:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_23 missing marker: {marker}')

    phase3_batch24 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_24.md')
    for marker in ['routing-pre-command-parser.ts', 'rcc-core-domain/src/pre_command_directive.rs', 'bash scripts/verify_phase3_pre_command_directive.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch24:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_24 missing marker: {marker}')

    phase3_batch25 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_25.md')
    for marker in ['routing-instructions/parse.ts', 'rcc-core-domain/src/routing_instruction_preprocess.rs', 'bash scripts/verify_phase3_routing_instruction_preprocess.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch25:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_25 missing marker: {marker}')

    phase3_batch26 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_26.md')
    for marker in ['conversion/shared/reasoning-normalizer.ts', 'rcc-core-domain/src/reasoning_markup.rs', 'bash scripts/verify_phase3_reasoning_markup.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch26:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_26 missing marker: {marker}')

    phase3_batch27 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_27.md')
    for marker in ['servertool/handlers/followup-sanitize.ts', 'rcc-core-domain/src/followup_sanitize.rs', 'bash scripts/verify_phase3_followup_sanitize.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch27:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_27 missing marker: {marker}')

    phase3_batch28 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_28.md')
    for marker in ['servertool/handlers/followup-request-builder.ts', 'rcc-core-domain/src/followup_request_utils.rs', 'bash scripts/verify_phase3_followup_request_utils.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch28:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_28 missing marker: {marker}')

    phase3_batch29 = read('docs/PHASE_03_PURE_FUNCTIONS_BATCH_29.md')
    for marker in ['servertool/handlers/followup-request-builder.ts', 'rcc-core-domain/src/followup_tool_compact.rs', 'bash scripts/verify_phase3_followup_tool_compact.sh', 'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain']:
        if marker not in phase3_batch29:
            errors.append(f'PHASE_03_PURE_FUNCTIONS_BATCH_29 missing marker: {marker}')

    skill = read('.agents/skills/rcc-pure-functions-migration/SKILL.md')
    for marker in ['## Trigger Signals', '## Standard Actions', '## Acceptance Gate', '## Anti-Patterns', '## Boundaries', '## Sources Of Truth']:
        if marker not in skill:
            errors.append(f'rcc-pure-functions-migration missing section: {marker}')

if errors:
    print('PHASE3_PURE_FUNCTIONS_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE3_PURE_FUNCTIONS_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
