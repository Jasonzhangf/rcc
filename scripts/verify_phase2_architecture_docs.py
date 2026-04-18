#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/50-rust-skeleton-routing.md',
    'docs/RUST_WORKSPACE_ARCHITECTURE.md',
    'docs/CRATE_BOUNDARIES.md',
    'docs/SKELETON_IMPLEMENTATION_WORKFLOW.md',
    '.agents/skills/rcc-rust-skeleton/SKILL.md',
    '.github/workflows/phase2-architecture-docs.yml',
]

REQUIRED_AGENTS_REFS = [
    'docs/agent-routing/50-rust-skeleton-routing.md',
    '.agents/skills/rcc-rust-skeleton/SKILL.md',
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
    p = ROOT / rel
    if not p.exists():
        errors.append(f'missing file: {rel}')
    else:
        checks.append(f'found {rel}')

if not errors:
    agents = read('AGENTS.md')
    for rel in REQUIRED_AGENTS_REFS:
        if rel not in agents:
            errors.append(f'AGENTS missing reference: {rel}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '50-rust-skeleton-routing.md' not in entry:
        errors.append('00-entry-routing missing rust skeleton route')

    route = read('docs/agent-routing/50-rust-skeleton-routing.md')
    for marker in ['## 索引概要', 'docs/RUST_WORKSPACE_ARCHITECTURE.md', 'docs/CRATE_BOUNDARIES.md', '.agents/skills/rcc-rust-skeleton/SKILL.md']:
        if marker not in route:
            errors.append(f'50-rust-skeleton-routing missing marker: {marker}')

    arch = read('docs/RUST_WORKSPACE_ARCHITECTURE.md')
    for marker in ['编排层 → block 真源层 → 纯函数层', 'rcc-core-orchestrator', 'rcc-core-servertool', 'transport / auth / runtime', '单进程、单 runtime']:
        if marker not in arch:
            errors.append(f'RUST_WORKSPACE_ARCHITECTURE missing marker: {marker}')

    bounds = read('docs/CRATE_BOUNDARIES.md')
    for marker in ['rcc-core-provider', 'rcc-core-host', 'rcc-core-servertool', '禁止重叠规则', '只允许：transport / auth / runtime']:
        if marker not in bounds:
            errors.append(f'CRATE_BOUNDARIES missing marker: {marker}')

    workflow = read('docs/SKELETON_IMPLEMENTATION_WORKFLOW.md')
    for marker in ['docs/RUST_WORKSPACE_ARCHITECTURE.md', '.agents/skills/rcc-rust-skeleton/SKILL.md', 'python3 scripts/verify_phase2_architecture_docs.py', 'Cargo skeleton 实现任务']:
        if marker not in workflow:
            errors.append(f'SKELETON_IMPLEMENTATION_WORKFLOW missing marker: {marker}')

    skill = read('.agents/skills/rcc-rust-skeleton/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-rust-skeleton skill missing section: {marker}')

    phase2 = read('docs/PHASE_02_SKELETON_PREP.md')
    for marker in ['docs/RUST_WORKSPACE_ARCHITECTURE.md', 'docs/CRATE_BOUNDARIES.md', '.agents/skills/rcc-rust-skeleton/SKILL.md']:
        if marker not in phase2:
            errors.append(f'PHASE_02_SKELETON_PREP missing marker: {marker}')

if errors:
    print('PHASE2_ARCHITECTURE_DOCS_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE2_ARCHITECTURE_DOCS_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
