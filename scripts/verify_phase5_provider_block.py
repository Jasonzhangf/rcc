#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/80-provider-block-routing.md',
    'docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md',
    'docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md',
    'docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md',
    'docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md',
    'docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md',
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
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md',
        '.agents/skills/rcc-provider-block-migration/SKILL.md',
        'transport / auth / runtime',
        'python3 scripts/verify_phase5_provider_block.py',
        '.github/workflows/phase5-provider-block.yml',
        'bash scripts/verify_phase5_provider_transport_request_plan.sh',
        'bash scripts/verify_phase5_provider_http_execute.sh',
        'bash scripts/verify_phase5_provider_runtime_metadata.sh',
    ]:
        if marker not in route:
            errors.append(f'80-provider-block-routing missing marker: {marker}')

    workflow = read('docs/PHASE_05_PROVIDER_BLOCK_WORKFLOW.md')
    for marker in [
        'rcc-core-provider',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_01.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md',
        'docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md',
        'Batch 02：HTTP execute + retry skeleton',
        'Batch 03：runtime metadata / context attach-read',
        'Batch 04：streaming/SSE transport boundary',
        'python3 scripts/verify_phase5_provider_block.py',
        'bash scripts/verify_phase5_provider_transport_request_plan.sh',
        'bash scripts/verify_phase5_provider_http_execute.sh',
        'bash scripts/verify_phase5_provider_runtime_metadata.sh',
        'bash scripts/verify_phase5_provider_sse_transport.sh',
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
        'bash scripts/verify_phase5_provider_transport_request_plan.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit',
    ]:
        if marker not in batch01:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_BATCH_01 missing marker: {marker}')

    batch02 = read('docs/PHASE_05_PROVIDER_BLOCK_BATCH_02.md')
    for marker in [
        'http-request-executor.ts',
        'provider-http-executor-utils.ts',
        'http-transport-provider.ts',
        'rust/crates/rcc-core-provider/src/http_execute.rs',
        'rust/crates/rcc-core-provider/src/http_retry.rs',
        'canonical transport request plan',
        'normalized transport error',
        'bash scripts/verify_phase5_provider_http_execute.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_05_PROVIDER_BLOCK_BATCH_03.md')
    for marker in [
        'provider-runtime-metadata.ts',
        'provider-request-preprocessor.ts',
        'provider-payload-utils.ts',
        'base-provider-runtime-helpers.ts',
        'rust/crates/rcc-core-provider/src/runtime_metadata.rs',
        'rust/crates/rcc-core-provider/src/request_preprocessor.rs',
        'runtime metadata attach-read',
        'bash scripts/verify_phase5_provider_runtime_metadata.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_05_PROVIDER_BLOCK_BATCH_04.md')
    for marker in [
        'http-transport-provider.ts',
        'http-request-executor.ts',
        'provider-response-postprocessor.ts',
        'http-client.ts',
        'rust/crates/rcc-core-provider/src/sse_transport.rs',
        'streaming / SSE transport boundary',
        '__sse_responses',
        'bash scripts/verify_phase5_provider_sse_transport.sh',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-provider -p rcc-core-testkit',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_05_PROVIDER_BLOCK_BATCH_04 missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 05 provider block gate',
        'python3 scripts/verify_phase5_provider_block.py',
        'bash scripts/verify_phase5_provider_transport_request_plan.sh',
        'bash scripts/verify_phase5_provider_http_execute.sh',
        'bash scripts/verify_phase5_provider_runtime_metadata.sh',
        'bash scripts/verify_phase5_provider_sse_transport.sh',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

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
