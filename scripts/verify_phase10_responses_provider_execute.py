#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/130-responses-provider-execute-routing.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md',
    'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md',
    '.agents/skills/rcc-responses-provider-execute/SKILL.md',
    '.github/workflows/phase10-responses-provider-execute.yml',
    'scripts/verify_phase10_responses_provider_execute_batch04.sh',
]

SKILL_REQUIRED_MARKERS = [
    '## Trigger Signals',
    '## Standard Actions',
    '## Acceptance Gate',
    '## Anti-Patterns',
    '## Boundaries',
    '## Sources Of Truth',
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
    for marker in [
        'docs/agent-routing/130-responses-provider-execute-routing.md',
        '.agents/skills/rcc-responses-provider-execute/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '130-responses-provider-execute-routing.md' not in entry:
        errors.append('00-entry-routing missing phase10 responses provider execute route')

    route = read('docs/agent-routing/130-responses-provider-execute-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md',
        '.agents/skills/rcc-responses-provider-execute/SKILL.md',
        'compat -> provider',
        'python3 scripts/verify_phase10_responses_provider_execute.py',
        '.github/workflows/phase10-responses-provider-execute.yml',
    ]:
        if marker not in route:
            errors.append(f'130-responses-provider-execute-routing missing marker: {marker}')

    workflow = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW.md')
    for marker in [
        'responses ingress server -> virtual router -> hub pipeline -> compat -> provider',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md',
        'docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md',
        'python3 scripts/verify_phase10_responses_provider_execute.py',
        'bash scripts/verify_phase10_responses_provider_execute_batch01.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch02.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch03.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch04.sh',
        '.github/workflows/phase10-responses-provider-execute.yml',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_WORKFLOW missing marker: {marker}')

    batch = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01.md')
    for marker in [
        'TransportProviderRuntime',
        'SkeletonApplication::with_provider_runtime',
        'provider(real execute)',
        'rust/crates/rcc-core-provider/src/lib.rs',
        'rust/crates/rcc-core-orchestrator/src/lib.rs',
        'rust/crates/rcc-core-testkit/src/lib.rs',
        'bash scripts/verify_phase10_responses_provider_execute_batch01.sh',
    ]:
        if marker not in batch:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_01 missing marker: {marker}')

    batch02 = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02.md')
    for marker in [
        'ProviderRequestCarrier.route',
        'transport payload 保持不变',
        'provider runtime contract',
        'bash scripts/verify_phase10_responses_provider_execute_batch02.sh',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03.md')
    for marker in [
        'selected_target -> runtime registry lookup',
        'explicit provider failure',
        'bash scripts/verify_phase10_responses_provider_execute_batch03.sh',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04.md')
    for marker in [
        'host `/v1/responses`',
        'selected_target runtime registry',
        'bash scripts/verify_phase10_responses_provider_execute_batch04.sh',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_BATCH_04 missing marker: {marker}')

    gap = read('docs/PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY.md')
    for marker in [
        'NoopProviderRuntime',
        'TransportProviderRuntime',
        'responses 主线真实 HTTP execute smoke',
        'bash scripts/verify_phase10_responses_provider_execute_batch02.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch04.sh',
    ]:
        if marker not in gap:
            errors.append(f'PHASE_10_RESPONSES_PROVIDER_EXECUTE_GAP_INVENTORY missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 10 responses provider execute gate',
        'python3 scripts/verify_phase10_responses_provider_execute.py',
        'bash scripts/verify_phase10_responses_provider_execute_batch01.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch02.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch03.sh',
        'bash scripts/verify_phase10_responses_provider_execute_batch04.sh',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    skill = read('.agents/skills/rcc-responses-provider-execute/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-responses-provider-execute skill missing section: {marker}')

    phase10_ci = read('.github/workflows/phase10-responses-provider-execute.yml')
    if 'bash scripts/verify_phase10_responses_provider_execute_batch04.sh' not in phase10_ci:
        errors.append('phase10-responses-provider-execute workflow missing batch04 verification entry')

if errors:
    print('PHASE10_RESPONSES_PROVIDER_EXECUTE_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE10_RESPONSES_PROVIDER_EXECUTE_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
