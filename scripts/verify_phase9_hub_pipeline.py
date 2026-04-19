#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/120-hub-pipeline-routing.md',
    'docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md',
    'docs/PHASE_09_HUB_PIPELINE_AUDIT.md',
    'docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_01.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_02.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_03.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_04.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_05.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_06.md',
    'docs/PHASE_09_HUB_PIPELINE_BATCH_07.md',
    'docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md',
    'scripts/verify_phase9_hub_pipeline_batch01.sh',
    'scripts/verify_phase9_hub_pipeline_batch05.sh',
    'scripts/verify_phase9_hub_pipeline_batch06.sh',
    'scripts/verify_phase9_hub_pipeline_batch07.sh',
    '.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md',
    '.github/workflows/phase9-hub-pipeline.yml',
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
        'docs/agent-routing/120-hub-pipeline-routing.md',
        '.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '120-hub-pipeline-routing.md' not in entry:
        errors.append('00-entry-routing missing phase9 hub pipeline route')

    route = read('docs/agent-routing/120-hub-pipeline-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md',
        'docs/PHASE_09_HUB_PIPELINE_AUDIT.md',
        'docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_01.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_02.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_03.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_04.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_05.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_06.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_07.md',
        'docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md',
        '.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md',
        'rcc-core-pipeline',
        'inbound / chat process / outbound',
        'python3 scripts/verify_phase9_hub_pipeline.py',
        'bash scripts/verify_phase9_hub_pipeline_batch01.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch05.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch06.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch07.sh',
        '.github/workflows/phase9-hub-pipeline.yml',
    ]:
        if marker not in route:
            errors.append(f'120-hub-pipeline-routing missing marker: {marker}')

    workflow = read('docs/PHASE_09_HUB_PIPELINE_WORKFLOW.md')
    for marker in [
        'rcc-core-pipeline',
        'docs/PHASE_09_HUB_PIPELINE_AUDIT.md',
        'docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_01.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_02.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_03.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_04.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_05.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_06.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_07.md',
        'docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md',
        'responses ingress server',
        'hub pipeline(inbound <> chat process <> outbound)',
        'provider-first continuation',
        'matrix regression',
        'audit sidecar',
        'python3 scripts/verify_phase9_hub_pipeline.py',
        'bash scripts/verify_phase9_hub_pipeline_batch01.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch05.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch06.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch07.sh',
        '.github/workflows/phase9-hub-pipeline.yml',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_09_HUB_PIPELINE_WORKFLOW missing marker: {marker}')

    audit = read('docs/PHASE_09_HUB_PIPELINE_AUDIT.md')
    for marker in [
        '../routecodex/src/server/handlers/responses-handler.ts',
        '../routecodex/src/client/anthropic/anthropic-protocol-client.ts',
        '../routecodex/src/modules/llmswitch/bridge/native-exports.ts',
        'resumeResponsesConversation',
        'responses-continuation-store.spec.ts',
        'anthropic-responses-roundtrip.mjs',
        'provider-first',
        'no-copy',
    ]:
        if marker not in audit:
            errors.append(f'PHASE_09_HUB_PIPELINE_AUDIT missing marker: {marker}')

    architecture = read('docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md')
    for marker in [
        'HubCanonicalRequest',
        'HubCanonicalMessage',
        'HubCanonicalContentPart',
        'hub.chat_process',
        'provider 相同 + provider 支持原生 continuation',
        'JSON/spec-driven',
        'no-copy / minimal-copy',
    ]:
        if marker not in architecture:
            errors.append(f'HUB_CANONICAL_CHAT_ARCHITECTURE missing marker: {marker}')

    batch01 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_01.md')
    for marker in [
        'docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md',
        'rust/crates/rcc-core-domain/src/hub_pipeline_skeleton.rs',
        'rust/crates/rcc-core-pipeline/src/lib.rs',
        'scripts/verify_phase9_hub_pipeline_batch01.sh',
        'hub pipeline skeleton',
        'inbound / chat process / outbound',
        'python3 scripts/verify_phase9_hub_pipeline.py',
        'cargo test --manifest-path rust/Cargo.toml -p rcc-core-domain -p rcc-core-pipeline -p rcc-core-orchestrator -p rcc-core-host -p rcc-core-testkit',
    ]:
        if marker not in batch01:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_01 missing marker: {marker}')

    batch02 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_02.md')
    for marker in [
        'hub canonical chat IR',
        'shared mapping ops',
        'provider-native continuation first',
        'responses -> canonical -> anthropic',
        'old仓 matrix tests',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_03.md')
    for marker in [
        'response_id keyed conversation store / restore',
        'single runtime 内内存态 store',
        'response_id + tool_outputs',
        '显式失败',
        'rcc-core-pipeline',
        'rcc-core-domain',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_04.md')
    for marker in [
        'fallback provider response -> canonical response',
        'anthropic provider response',
        'response_id',
        'required_action.submit_tool_outputs.tool_calls',
        'pipeline store 只吃 canonical response',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_04 missing marker: {marker}')

    batch05 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_05.md')
    for marker in [
        'old仓 matrix tests',
        'anthropic responses roundtrip',
        'responses continuation / submit_tool_outputs',
        'hub I/O compare',
        'synthetic payload',
        'scripts/verify_phase9_hub_pipeline_batch05.sh',
    ]:
        if marker not in batch05:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_05 missing marker: {marker}')

    batch06 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_06.md')
    for marker in [
        'cross-protocol audit matrix',
        'anthropic-messages',
        'gemini-chat',
        'dropped',
        'lossy',
        'unsupported',
        'preserved',
        'bash scripts/verify_phase9_hub_pipeline_batch06.sh',
    ]:
        if marker not in batch06:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_06 missing marker: {marker}')

    batch07 = read('docs/PHASE_09_HUB_PIPELINE_BATCH_07.md')
    for marker in [
        'audit sidecar',
        'HubCanonicalOutboundRequest',
        'ProviderRequestCarrier.metadata',
        'protocol_mapping_audit',
        'responses -> anthropic',
        'responses -> gemini',
        'ProviderRequestCarrier.body',
        'bash scripts/verify_phase9_hub_pipeline_batch07.sh',
    ]:
        if marker not in batch07:
            errors.append(f'PHASE_09_HUB_PIPELINE_BATCH_07 missing marker: {marker}')

    gap = read('docs/PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY.md')
    for marker in [
        '## 索引概要',
        '当前可直接复用的部分',
        'Batch 02 必须先补的纯函数缺口',
        'Batch 02 必须先补的 block 缺口',
        'Batch 07 必须先补的纯函数缺口',
        'Batch 07 必须先补的 block 缺口',
        'Batch 07 明确保留缺口',
        '旧仓矩阵回归缺口',
        'hub canonical IR',
        'provider capability exposure',
        '不允许因为缺口未补，而把 pipeline/compat/provider 语义偷偷塞进 router、host 或 orchestrator',
    ]:
        if marker not in gap:
            errors.append(f'PHASE_09_RESPONSES_HUB_PIPELINE_GAP_INVENTORY missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 09 hub pipeline gate',
        'python3 scripts/verify_phase9_hub_pipeline.py',
        'docs/PHASE_09_HUB_PIPELINE_AUDIT.md',
        'docs/HUB_CANONICAL_CHAT_ARCHITECTURE.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_01.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_02.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_03.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_04.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_05.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_06.md',
        'docs/PHASE_09_HUB_PIPELINE_BATCH_07.md',
        'bash scripts/verify_phase9_hub_pipeline_batch01.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch05.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch06.sh',
        'bash scripts/verify_phase9_hub_pipeline_batch07.sh',
        'provider-first continuation ownership',
        'matrix regression 对齐计划',
        'phase9 docs gate',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    phase9_ci = read('.github/workflows/phase9-hub-pipeline.yml')
    if 'bash scripts/verify_phase9_hub_pipeline_batch07.sh' not in phase9_ci:
        errors.append('phase9-hub-pipeline workflow missing batch07 verification entry')

    skill = read('.agents/skills/rcc-hub-pipeline-block-migration/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-hub-pipeline-block-migration skill missing section: {marker}')

if errors:
    print('PHASE9_HUB_PIPELINE_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE9_HUB_PIPELINE_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
