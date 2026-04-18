#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/80-provider-block-routing.md',
    'docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md',
    'docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md',
    '.agents/skills/rcc-provider-block-migration/SKILL.md',
    '.github/workflows/phase5-provider-block.yml',
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
        'docs/agent-routing/80-provider-block-routing.md',
        '.agents/skills/rcc-provider-block-migration/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '80-provider-block-routing.md' not in entry:
        errors.append('00-entry-routing missing phase5 provider block route')

    route = read('docs/agent-routing/80-provider-block-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md',
        '.agents/skills/rcc-provider-block-migration/SKILL.md',
        'transport / auth / runtime',
        'python3 scripts/verify_phase5_provider_block.py',
        '.github/workflows/phase5-provider-block.yml',
    ]:
        if marker not in route:
            errors.append(f'80-provider-block-routing missing marker: {marker}')

    workflow = read('docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md')
    for marker in [
        'rcc-core-provider',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md',
        'python3 scripts/verify_phase5_provider_block.py',
        'transport request plan',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_WORKFLOW missing marker: {marker}')

    batch01 = read('docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md')
    for marker in [
        'runtime-endpoint-resolver.ts',
        'apikey-auth.ts',
        'provider-request-header-orchestrator.ts',
        'rust/crates/rcc-core-provider/src/transport_request_plan.rs',
        'rust/crates/rcc-core-provider/src/auth_apikey.rs',
        'canonical transport request plan',
        'python3 scripts/verify_phase5_provider_block.py',
    ]:
        if marker not in batch01:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_BATCH_01 missing marker: {marker}')

    skill = read('.agents/skills/rcc-provider-block-migration/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-provider-block-migration skill missing section: {marker}')

if errors:
    print('PHASE5_PROVIDER_BLOCK_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE5_PROVIDER_BLOCK_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
