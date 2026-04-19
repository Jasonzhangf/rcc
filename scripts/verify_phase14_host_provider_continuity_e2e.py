#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED = [
    'docs/agent-routing/170-host-provider-continuity-e2e-routing.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md',
    'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md',
    '.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md',
    '.github/workflows/phase14-host-provider-continuity-e2e.yml',
    'scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh',
    'scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh',
    'scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh',
    'scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh',
    'scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh',
]

SKILL_MARKERS = [
    '## Trigger Signals',
    '## Standard Actions',
    '## Acceptance Gate',
    '## Anti-Patterns',
    '## Boundaries',
    '## Sources Of Truth',
]

errors = []
checks = []

for rel in REQUIRED:
    path = ROOT / rel
    if path.exists():
        checks.append(f'found {rel}')
    else:
        errors.append(f'missing file: {rel}')

if not errors:
    agents = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
    for marker in [
        'docs/agent-routing/170-host-provider-continuity-e2e-routing.md',
        '.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = (ROOT / 'docs/agent-routing/00-entry-routing.md').read_text(encoding='utf-8')
    if '170-host-provider-continuity-e2e-routing.md' not in entry:
        errors.append('00-entry-routing missing phase14 route')

    route = (ROOT / 'docs/agent-routing/170-host-provider-continuity-e2e-routing.md').read_text(encoding='utf-8')
    for marker in [
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md',
        '.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md',
        'legacy anthropic provider',
        'python3 scripts/verify_phase14_host_provider_continuity_e2e.py',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh',
        '.github/workflows/phase14-host-provider-continuity-e2e.yml',
    ]:
        if marker not in route:
            errors.append(f'phase14 routing missing marker: {marker}')

    workflow = (ROOT / 'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_WORKFLOW.md').read_text(encoding='utf-8')
    for marker in [
        'host 安装态 `/v1/responses` + real provider',
        'legacy anthropic provider',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md',
        'python3 scripts/verify_phase14_host_provider_continuity_e2e.py',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh',
        '.github/workflows/phase14-host-provider-continuity-e2e.yml',
    ]:
        if marker not in workflow:
            errors.append(f'phase14 workflow missing marker: {marker}')

    gap = (ROOT / 'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_GAP_INVENTORY.md').read_text(encoding='utf-8')
    for marker in [
        'from_config_projects_legacy_anthropic_restores_submit_tool_outputs_by_response_id_only',
        'host 安装态 anthropic continuity 两跳/三跳真实证据',
        'host 安装态 `submit_tool_outputs` response-id restore 证据链',
        'host 安装态 ordinary `previous_response_id` fallback continuity + missing-store explicit failure 证据链',
    ]:
        if marker not in gap:
            errors.append(f'phase14 gap inventory missing marker: {marker}')

    testing = (ROOT / 'docs/TESTING_AND_ACCEPTANCE.md').read_text(encoding='utf-8')
    for marker in [
        'Phase 14 host/provider continuity E2E gate',
        'python3 scripts/verify_phase14_host_provider_continuity_e2e.py',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_01.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_02.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_03.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_04.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_BATCH_05.md',
        'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch01.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch02.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch03.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh',
        'bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh',
        '.github/workflows/phase14-host-provider-continuity-e2e.yml',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    closeout = (ROOT / 'docs/PHASE_14_HOST_PROVIDER_CONTINUITY_E2E_CLOSEOUT.md').read_text(encoding='utf-8')
    for marker in [
        '已迁入安装态 continuity 真源',
        '部分覆盖 / 尚未迁入矩阵',
        '非当前阶段目标',
        'Phase 14A 完成标准',
        'scripts/verify_phase14_host_provider_continuity_e2e_batch04.sh',
    ]:
        if marker not in closeout:
            errors.append(f'phase14 closeout missing marker: {marker}')

    phase14_ci = (ROOT / '.github/workflows/phase14-host-provider-continuity-e2e.yml').read_text(encoding='utf-8')
    if 'bash scripts/verify_phase14_host_provider_continuity_e2e_batch05.sh' not in phase14_ci:
        errors.append('phase14-host-provider-continuity-e2e workflow missing batch05 verification entry')

    skill = (ROOT / '.agents/skills/rcc-host-provider-continuity-e2e/SKILL.md').read_text(encoding='utf-8')
    for marker in SKILL_MARKERS:
        if marker not in skill:
            errors.append(f'phase14 skill missing section: {marker}')

if errors:
    print('PHASE14_HOST_PROVIDER_CONTINUITY_E2E_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE14_HOST_PROVIDER_CONTINUITY_E2E_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
