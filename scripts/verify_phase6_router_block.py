#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/90-router-block-routing.md',
    'docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md',
    'docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md',
    '.agents/skills/rcc-router-block-migration/SKILL.md',
    '.github/workflows/phase6-router-block.yml',
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
        'docs/agent-routing/90-router-block-routing.md',
        '.agents/skills/rcc-router-block-migration/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '90-router-block-routing.md' not in entry:
        errors.append('00-entry-routing missing phase6 router block route')

    route = read('docs/agent-routing/90-router-block-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md',
        'docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md',
        '.agents/skills/rcc-router-block-migration/SKILL.md',
        'rcc-core-router',
        'route selection / routing state / health-quota',
        'python3 scripts/verify_phase6_router_block.py',
        'bash scripts/verify_phase6_router_batch01.sh',
        '.github/workflows/phase6-router-block.yml',
    ]:
        if marker not in route:
            errors.append(f'90-router-block-routing missing marker: {marker}')

    workflow = read('docs/PHASE_06_ROUTER_BLOCK_WORKFLOW.md')
    for marker in [
        'rcc-core-router',
        'docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md',
        'route candidate normalization / routing state filter / instruction target',
        'python3 scripts/verify_phase6_router_block.py',
        'bash scripts/verify_phase6_router_batch01.sh',
        '.github/workflows/phase6-router-block.yml',
        'health/quota/cooldown',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_06_ROUTER_BLOCK_WORKFLOW missing marker: {marker}')

    batch01 = read('docs/PHASE_06_ROUTER_BLOCK_BATCH_01.md')
    for marker in [
        'engine-selection/route-utils.ts',
        'engine-selection/routing-state-filter.ts',
        'engine-selection/instruction-target.ts',
        'engine-selection/key-parsing.ts',
        'rust/crates/rcc-core-router/src/route_candidates.rs',
        'rust/crates/rcc-core-router/src/routing_state_filter.rs',
        'rust/crates/rcc-core-router/src/instruction_target.rs',
        'route candidate normalization',
        'routing state filter',
        'instruction target',
        'python3 scripts/verify_phase6_router_block.py',
        'bash scripts/verify_phase6_router_batch01.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-router -p rcc-core-testkit',
    ]:
        if marker not in batch01:
            errors.append(f'PHASE_06_ROUTER_BLOCK_BATCH_01 missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 06 router block gate',
        'python3 scripts/verify_phase6_router_block.py',
        'bash scripts/verify_phase6_router_batch01.sh',
        'phase6 CI workflow',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    skill = read('.agents/skills/rcc-router-block-migration/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-router-block-migration skill missing section: {marker}')

if errors:
    print('PHASE6_ROUTER_BLOCK_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE6_ROUTER_BLOCK_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
