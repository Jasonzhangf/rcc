#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/70-servertool-block-routing.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_01.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md',
    'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md',
    '.agents/skills/rcc-servertool-block-migration/SKILL.md',
    '.github/workflows/phase4-servertool-block.yml',
]

errors: list[str] = []
checks: list[str] = []


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')

for rel in REQUIRED_FILES:
    path = ROOT / rel
    if not path.exists():
        errors.append(f'missing file: {rel}')
    else:
        checks.append(f'found {rel}')

if not errors:
    agents = read('AGENTS.md')
    for marker in ['docs/agent-routing/70-servertool-block-routing.md', '.agents/skills/rcc-servertool-block-migration/SKILL.md']:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '70-servertool-block-routing.md' not in entry:
        errors.append('00-entry-routing missing phase4 servertool block route')

    route = read('docs/agent-routing/70-servertool-block-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_01.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md',
        '.agents/skills/rcc-servertool-block-migration/SKILL.md',
        'python3 scripts/verify_phase4_servertool_block.py',
        'bash scripts/verify_phase4_servertool_followup_request.sh',
        'bash scripts/verify_phase4_servertool_followup_injection.sh',
        'bash scripts/verify_phase4_servertool_followup_system_vision.sh',
        'bash scripts/verify_phase4_servertool_followup_tool_governance.sh',
        'bash scripts/verify_phase4_servertool_stop_gateway.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh',
    ]:
        if marker not in route:
            errors.append(f'70-servertool-block-routing missing marker: {marker}')

    workflow = read('docs/PHASE_04_SERVERTOOL_BLOCK_WORKFLOW.md')
    for marker in [
        'rcc-core-servertool',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md',
        'docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md',
        'python3 scripts/verify_phase4_servertool_block.py',
        'bash scripts/verify_phase4_servertool_followup_injection.sh',
        'bash scripts/verify_phase4_servertool_followup_system_vision.sh',
        'bash scripts/verify_phase4_servertool_followup_tool_governance.sh',
        'bash scripts/verify_phase4_servertool_stop_gateway.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_WORKFLOW missing marker: {marker}')

    batch02 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_02.md')
    for marker in [
        'extractAssistantMessageFromChatLike',
        'buildToolMessagesFromToolOutputs',
        'rust/crates/rcc-core-servertool/src/followup.rs',
        'canonical chat-like request',
        'bash scripts/verify_phase4_servertool_followup_injection.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_03.md')
    for marker in [
        'injectSystemTextIntoMessages',
        'injectVisionSummaryIntoMessages',
        'rust/crates/rcc-core-servertool/src/followup.rs',
        'canonical chat-like request',
        'bash scripts/verify_phase4_servertool_followup_system_vision.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_04.md')
    for marker in [
        'ensureStandardToolsIfMissing',
        'force_tool_choice',
        'append_tool_if_missing',
        'REASONING_STOP_TOOL_DEF',
        'rust/crates/rcc-core-servertool/src/followup.rs',
        'bash scripts/verify_phase4_servertool_followup_tool_governance.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_04 missing marker: {marker}')

    batch05 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_05.md')
    for marker in [
        'stop-gateway-context.ts',
        'inspect_stop_gateway_signal',
        'resolve_stop_gateway_context',
        'rust/crates/rcc-core-servertool/src/stop_gateway.rs',
        'bash scripts/verify_phase4_servertool_stop_gateway.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch05:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_05 missing marker: {marker}')

    batch06 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_06.md')
    for marker in [
        'reasoning-stop.ts',
        'reasoning-stop-state.ts',
        'build_reasoning_stop_tool_output',
        'REASONING_STOP_TOOL_DEF',
        'rust/crates/rcc-core-servertool/src/reasoning_stop.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch06:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_06 missing marker: {marker}')

    batch07 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_07.md')
    for marker in [
        'reasoning-stop-state.ts',
        'build_reasoning_stop_state_patch',
        'merge_reasoning_stop_serialization',
        'RoutingStopMessageState',
        'rust/crates/rcc-core-servertool/src/reasoning_stop.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch07:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_07 missing marker: {marker}')

    batch08 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_08.md')
    for marker in [
        'reasoning-stop-state.ts',
        'read_reasoning_stop_state_view',
        'build_clear_reasoning_stop_state_result',
        'rust/crates/rcc-core-servertool/src/reasoning_stop/state_view.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch08:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_08 missing marker: {marker}')

    batch09 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_09.md')
    for marker in [
        'reasoning-stop-state.ts',
        'build_reasoning_stop_mode_sync_result',
        'rust/crates/rcc-core-servertool/src/reasoning_stop/directive_mode.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch09:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_09 missing marker: {marker}')

    batch10 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_10.md')
    for marker in [
        'sticky-session-store.ts',
        'save_reasoning_stop_sticky_state',
        'load_reasoning_stop_sticky_state',
        'rust/crates/rcc-core-servertool/src/reasoning_stop/sticky_store.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch10:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_10 missing marker: {marker}')

    batch11 = read('docs/PHASE_04_SERVERTOOL_BLOCK_BATCH_11.md')
    for marker in [
        'reasoning-stop-state.ts',
        'read_reasoning_stop_fail_count',
        'increment_reasoning_stop_fail_count',
        'reset_reasoning_stop_fail_count',
        'rust/crates/rcc-core-servertool/src/reasoning_stop/fail_count.rs',
        'bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-servertool -p rcc-core-testkit',
    ]:
        if marker not in batch11:
            errors.append(f'PHASE_04_SERVERTOOL_BLOCK_BATCH_11 missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 04 servertool block gate',
        'python3 scripts/verify_phase4_servertool_block.py',
        'bash scripts/verify_phase4_servertool_followup_request.sh',
        'bash scripts/verify_phase4_servertool_followup_injection.sh',
        'bash scripts/verify_phase4_servertool_followup_system_vision.sh',
        'bash scripts/verify_phase4_servertool_followup_tool_governance.sh',
        'bash scripts/verify_phase4_servertool_stop_gateway.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_state_read_clear.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_mode_sync.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_sticky_persistence.sh',
        'bash scripts/verify_phase4_servertool_reasoning_stop_fail_count.sh',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    skill = read('.agents/skills/rcc-servertool-block-migration/SKILL.md')
    for marker in ['## Trigger Signals', '## Standard Actions', '## Acceptance Gate', '## Anti-Patterns', '## Boundaries', '## Sources Of Truth']:
        if marker not in skill:
            errors.append(f'rcc-servertool-block-migration missing section: {marker}')

if errors:
    print('PHASE4_SERVERTOOL_BLOCK_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE4_SERVERTOOL_BLOCK_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
