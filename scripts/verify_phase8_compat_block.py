#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/110-compat-block-routing.md',
    'docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md',
    'docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md',
    'docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md',
    'docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md',
    '.agents/skills/rcc-compat-block-migration/SKILL.md',
    '.github/workflows/phase8-compat-block.yml',
    'scripts/verify_phase8_compat_block_batch04.sh',
    'scripts/verify_phase8_compat_block_batch05.sh',
    'scripts/verify_phase8_compat_block_batch06.sh',
    'scripts/verify_phase8_compat_block_batch07.sh',
    'scripts/verify_phase8_compat_block_batch08.sh',
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
        'docs/agent-routing/110-compat-block-routing.md',
        '.agents/skills/rcc-compat-block-migration/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '110-compat-block-routing.md' not in entry:
        errors.append('00-entry-routing missing phase8 compat block route')

    route = read('docs/agent-routing/110-compat-block-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md',
        'docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md',
        'docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md',
        '.agents/skills/rcc-compat-block-migration/SKILL.md',
        'hub 后、provider 前',
        'canonical request/response',
        'gemini',
        '薄骨骼 + shared projection engine + spec/JSON rules',
        'python3 scripts/verify_phase8_compat_block.py',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'bash scripts/verify_phase8_compat_block_batch08.sh',
        '.github/workflows/phase8-compat-block.yml',
    ]:
        if marker not in route:
            errors.append(f'110-compat-block-routing missing marker: {marker}')

    workflow = read('docs/PHASE_08_COMPAT_BLOCK_WORKFLOW.md')
    for marker in [
        'hub pipeline -> compat -> provider',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_01.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_02.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_03.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_04.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_06.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_07.md',
        'docs/PHASE_08_COMPAT_BLOCK_BATCH_08.md',
        'docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md',
        'canonical request -> provider request carrier',
        'provider response carrier -> canonical response',
        'route handoff -> provider carrier sidecar',
        'provider-family request projection',
        '薄骨骼 + shared engine + spec/JSON',
        'request-side spec skeleton',
        'content/tool rule extraction',
        'tool field rules extraction',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'bash scripts/verify_phase8_compat_block_batch08.sh',
        '.github/workflows/phase8-compat-block.yml',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_08_COMPAT_BLOCK_WORKFLOW missing marker: {marker}')

    batch05 = read('docs/PHASE_08_COMPAT_BLOCK_BATCH_05.md')
    for marker in [
        'spec/JSON',
        'shared projection engine',
        'rcc-core-compat',
        'rcc-core-domain',
        'ProviderRequestCarrier.metadata',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'bash scripts/verify_phase8_compat_block_batch08.sh',
    ]:
        if marker not in batch05:
            errors.append(f'PHASE_08_COMPAT_BLOCK_BATCH_05 missing marker: {marker}')

    convergence = read('docs/PHASE_08_COMPAT_CONFIG_CONVERGENCE.md')
    for marker in [
        'thin compat block',
        'shared projection engine',
        'protocol spec / JSON rules',
        '哪些必须留在代码',
        '哪些必须优先下放成 spec/JSON',
        'projection executor',
        'schema validation',
        'audit sidecar builder',
    ]:
        if marker not in convergence:
            errors.append(f'PHASE_08_COMPAT_CONFIG_CONVERGENCE missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 08 compat block gate',
        'python3 scripts/verify_phase8_compat_block.py',
        'bash scripts/verify_phase8_compat_block_batch03.sh',
        'bash scripts/verify_phase8_compat_block_batch04.sh',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'compat config convergence',
        'phase8 CI workflow',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    gap = read('docs/PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY.md')
    for marker in [
        '薄骨骼 + spec 调用',
        '共享 projection engine + spec/JSON rules',
        'ProviderRequestCarrier.metadata',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'bash scripts/verify_phase8_compat_block_batch08.sh',
    ]:
        if marker not in gap:
            errors.append(f'PHASE_08_RESPONSES_COMPAT_GAP_INVENTORY missing marker: {marker}')

    skill = read('.agents/skills/rcc-compat-block-migration/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-compat-block-migration skill missing section: {marker}')

    phase8_ci = read('.github/workflows/phase8-compat-block.yml')
    for marker in [
        'bash scripts/verify_phase8_compat_block_batch04.sh',
        'bash scripts/verify_phase8_compat_block_batch05.sh',
        'bash scripts/verify_phase8_compat_block_batch06.sh',
        'bash scripts/verify_phase8_compat_block_batch07.sh',
        'bash scripts/verify_phase8_compat_block_batch08.sh',
    ]:
        if marker not in phase8_ci:
            errors.append(f'phase8-compat-block workflow missing marker: {marker}')

if errors:
    print('PHASE8_COMPAT_BLOCK_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE8_COMPAT_BLOCK_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
