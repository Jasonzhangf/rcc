#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'AGENTS.md',
    'docs/agent-routing/00-entry-routing.md',
    'docs/agent-routing/10-docs-ssot-routing.md',
    'docs/agent-routing/20-skill-workflow-routing.md',
    'docs/agent-routing/30-dev-implementation-routing.md',
    'docs/agent-routing/40-test-ci-routing.md',
    'docs/WORKFLOW_CLOSED_LOOP.md',
    'docs/SKILL_SYSTEM.md',
    'docs/DELIVERY_WORKFLOW.md',
    'docs/TESTING_AND_ACCEPTANCE.md',
    'docs/PHASE_02_SKELETON_PREP.md',
    '.agents/skills/rcc-closed-loop/SKILL.md',
    '.agents/skills/rcc-doc-driven-dev/SKILL.md',
    '.agents/skills/rcc-test-gate/SKILL.md',
    '.github/workflows/phase1-foundation.yml',
]

ROUTING_FILES = [
    'docs/agent-routing/00-entry-routing.md',
    'docs/agent-routing/10-docs-ssot-routing.md',
    'docs/agent-routing/20-skill-workflow-routing.md',
    'docs/agent-routing/30-dev-implementation-routing.md',
    'docs/agent-routing/40-test-ci-routing.md',
]

SKILL_FILES = [
    '.agents/skills/rcc-closed-loop/SKILL.md',
    '.agents/skills/rcc-doc-driven-dev/SKILL.md',
    '.agents/skills/rcc-test-gate/SKILL.md',
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
    for rel in ROUTING_FILES:
        if rel not in agents:
            errors.append(f'AGENTS missing route reference: {rel}')
    for rel in SKILL_FILES:
        if rel not in agents:
            errors.append(f'AGENTS missing skill reference: {rel}')

    for rel in ROUTING_FILES:
        content = read(rel)
        if '## 索引概要' not in content:
            errors.append(f'{rel} missing 索引概要')
        if '## ' not in content:
            errors.append(f'{rel} missing markdown sections')

    workflow = read('docs/WORKFLOW_CLOSED_LOOP.md')
    for marker in ['Define Docs', 'Define Skills', 'Implement Minimum Slice', 'Verify & Test', 'Close With Evidence']:
        if marker not in workflow:
            errors.append(f'WORKFLOW_CLOSED_LOOP missing marker: {marker}')

    phase2 = read('docs/PHASE_02_SKELETON_PREP.md')
    if 'docs/WORKFLOW_CLOSED_LOOP.md' not in phase2:
        errors.append('PHASE_02_SKELETON_PREP missing closed-loop reference')
    if '.agents/skills/rcc-closed-loop/SKILL.md' not in phase2:
        errors.append('PHASE_02_SKELETON_PREP missing skill reference')

    for rel in SKILL_FILES:
        content = read(rel)
        if '---' not in content.splitlines()[0]:
            errors.append(f'{rel} missing frontmatter start')
        for marker in SKILL_REQUIRED_MARKERS:
            if marker not in content:
                errors.append(f'{rel} missing section: {marker}')

if errors:
    print('PHASE1_FOUNDATION_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE1_FOUNDATION_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
