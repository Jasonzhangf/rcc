#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/100-host-server-routing.md',
    'docs/PHASE_07_HOST_SERVER_WORKFLOW.md',
    'docs/PHASE_07_HOST_SERVER_BATCH_01.md',
    'docs/PHASE_07_HOST_SERVER_BATCH_02.md',
    'docs/PHASE_07_HOST_SERVER_BATCH_03.md',
    'docs/PHASE_07_HOST_SERVER_BATCH_04.md',
    'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
    'scripts/verify_phase7_host_server_batch04.sh',
    '.agents/skills/rcc-host-server-skeleton/SKILL.md',
    '.github/workflows/phase7-host-server.yml',
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
        'docs/agent-routing/100-host-server-routing.md',
        '.agents/skills/rcc-host-server-skeleton/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '100-host-server-routing.md' not in entry:
        errors.append('00-entry-routing missing phase7 host server route')

    route = read('docs/agent-routing/100-host-server-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_07_HOST_SERVER_WORKFLOW.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_01.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_02.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_03.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_04.md',
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        '.agents/skills/rcc-host-server-skeleton/SKILL.md',
        'rcc-core-host',
        'GET /healthz',
        'POST /smoke',
        'POST /requests',
        'POST /chat',
        'POST /v1/responses',
        'python3 scripts/verify_phase7_host_server.py',
        'bash scripts/verify_phase7_host_server_batch01.sh',
        'bash scripts/verify_phase7_host_server_batch02.sh',
        'bash scripts/verify_phase7_host_server_batch03.sh',
        'bash scripts/verify_phase7_host_server_batch04.sh',
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        '.github/workflows/phase7-host-server.yml',
    ]:
        if marker not in route:
            errors.append(f'100-host-server-routing missing marker: {marker}')

    workflow = read('docs/PHASE_07_HOST_SERVER_WORKFLOW.md')
    for marker in [
        'rcc-core-host',
        'docs/PHASE_07_HOST_SERVER_BATCH_01.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_02.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_03.md',
        'docs/PHASE_07_HOST_SERVER_BATCH_04.md',
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        'CLI / HTTP / process startup',
        'GET /healthz',
        'POST /smoke',
        '/requests',
        '/chat',
        '/v1/responses',
        'python3 scripts/verify_phase7_host_server.py',
        'bash scripts/verify_phase7_host_server_batch01.sh',
        'bash scripts/verify_phase7_host_server_batch02.sh',
        'bash scripts/verify_phase7_host_server_batch03.sh',
        'bash scripts/verify_phase7_host_server_batch04.sh',
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        '.github/workflows/phase7-host-server.yml',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_07_HOST_SERVER_WORKFLOW missing marker: {marker}')

    batch = read('docs/PHASE_07_HOST_SERVER_BATCH_01.md')
    for marker in [
        'rust/crates/rcc-core-host/src/lib.rs',
        'rust/crates/rcc-core-host/src/main.rs',
        'rust/crates/rcc-core-orchestrator/src/lib.rs',
        'smoke` CLI',
        'serve` CLI',
        'GET /healthz',
        'POST /smoke',
        'rcc-core-orchestrator',
        'virtual router -> hub pipeline',
        'compat -> provider',
        'bash scripts/verify_phase7_host_server_batch01.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit',
    ]:
        if marker not in batch:
            errors.append(f'PHASE_07_HOST_SERVER_BATCH_01 missing marker: {marker}')

    batch02 = read('docs/PHASE_07_HOST_SERVER_BATCH_02.md')
    for marker in [
        'rust/crates/rcc-core-host/src/lib.rs',
        'rust/crates/rcc-core-host/src/main.rs',
        'rust/crates/rcc-core-orchestrator/src/lib.rs',
        'POST /requests',
        'tool.followup',
        'RequestEnvelope { operation, payload }',
        'virtual router -> hub pipeline',
        'compat -> provider',
        'bash scripts/verify_phase7_host_server_batch02.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_07_HOST_SERVER_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_07_HOST_SERVER_BATCH_03.md')
    for marker in [
        'rust/crates/rcc-core-host/src/lib.rs',
        'rust/crates/rcc-core-host/src/main.rs',
        'rust/crates/rcc-core-orchestrator/src/lib.rs',
        'POST /chat',
        'chat` body',
        'RequestEnvelope { operation: chat',
        'virtual router -> hub pipeline',
        'compat -> provider',
        'bash scripts/verify_phase7_host_server_batch03.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-host -p rcc-core-testkit',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_07_HOST_SERVER_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_07_HOST_SERVER_BATCH_04.md')
    for marker in [
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        'POST /v1/responses',
        'responses 入站 server 处理',
        '缺函数 / 缺 block',
        'rust/crates/rcc-core-domain/src/responses_ingress.rs',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-host -p rcc-core-testkit',
        'bash scripts/verify_phase7_host_server_batch04.sh',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_07_HOST_SERVER_BATCH_04 missing marker: {marker}')

    gap = read('docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md')
    for marker in [
        '## 索引概要',
        '当前可直接复用的部分',
        '当前批次必须先补的纯函数缺口',
        '当前批次必须先补的 block 缺口',
        '先看是否缺纯函数',
        '不允许因为缺口未补，而把 router/pipeline/provider 语义偷偷塞进 host',
    ]:
        if marker not in gap:
            errors.append(f'PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 07 host/server gate',
        'python3 scripts/verify_phase7_host_server.py',
        'bash scripts/verify_phase7_host_server_batch01.sh',
        'bash scripts/verify_phase7_host_server_batch02.sh',
        'bash scripts/verify_phase7_host_server_batch03.sh',
        'bash scripts/verify_phase7_host_server_batch04.sh',
        'docs/PHASE_07_RESPONSES_INGRESS_GAP_INVENTORY.md',
        'phase7 CI workflow',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    phase7_ci = read('.github/workflows/phase7-host-server.yml')
    if 'bash scripts/verify_phase7_host_server_batch04.sh' not in phase7_ci:
        errors.append('phase7-host-server workflow missing batch04 verification entry')

    skill = read('.agents/skills/rcc-host-server-skeleton/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-host-server-skeleton skill missing section: {marker}')

if errors:
    print('PHASE7_HOST_SERVER_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE7_HOST_SERVER_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
