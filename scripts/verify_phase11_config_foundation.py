#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    'docs/agent-routing/140-config-foundation-routing.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md',
    'docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md',
    '.agents/skills/rcc-config-foundation/SKILL.md',
    '.github/workflows/phase11-config-foundation.yml',
    'rust/crates/rcc-core-config/Cargo.toml',
    'rust/crates/rcc-core-config/config.json',
    'rust/crates/rcc-core-config/system.config.json',
    'rust/crates/rcc-core-config/src/lib.rs',
    'scripts/verify_phase11_config_foundation_batch01.sh',
    'scripts/verify_phase11_config_foundation_batch02.sh',
    'scripts/verify_phase11_config_foundation_batch03.sh',
    'scripts/verify_phase11_config_foundation_batch04.sh',
    'scripts/verify_phase11_config_foundation_batch05.sh',
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
        'docs/agent-routing/140-config-foundation-routing.md',
        '.agents/skills/rcc-config-foundation/SKILL.md',
    ]:
        if marker not in agents:
            errors.append(f'AGENTS missing marker: {marker}')

    entry = read('docs/agent-routing/00-entry-routing.md')
    if '140-config-foundation-routing.md' not in entry:
        errors.append('00-entry-routing missing phase11 config foundation route')

    route = read('docs/agent-routing/140-config-foundation-routing.md')
    for marker in [
        '## 索引概要',
        'docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md',
        'docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md',
        '.agents/skills/rcc-config-foundation/SKILL.md',
        'config.json',
        'system config',
        'python3 scripts/verify_phase11_config_foundation.py',
        '.github/workflows/phase11-config-foundation.yml',
    ]:
        if marker not in route:
            errors.append(f'140-config-foundation-routing missing marker: {marker}')

    workflow = read('docs/PHASE_11_CONFIG_FOUNDATION_WORKFLOW.md')
    for marker in [
        'rcc-core-config',
        'config.json',
        'system config',
        'python3 scripts/verify_phase11_config_foundation.py',
        'bash scripts/verify_phase11_config_foundation_batch01.sh',
        'bash scripts/verify_phase11_config_foundation_batch02.sh',
        'bash scripts/verify_phase11_config_foundation_batch03.sh',
        'bash scripts/verify_phase11_config_foundation_batch04.sh',
        'bash scripts/verify_phase11_config_foundation_batch05.sh',
        '.github/workflows/phase11-config-foundation.yml',
    ]:
        if marker not in workflow:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_WORKFLOW missing marker: {marker}')

    batch = read('docs/PHASE_11_CONFIG_FOUNDATION_BATCH_01.md')
    for marker in [
        'rust/crates/rcc-core-config/config.json',
        'rust/crates/rcc-core-config/system.config.json',
        'rust/crates/rcc-core-config/src/lib.rs',
        'SkeletonApplication::from_config',
        'DEFAULT_ADDR',
        'DEFAULT_OPERATION',
        'bash scripts/verify_phase11_config_foundation_batch01.sh',
    ]:
        if marker not in batch:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_BATCH_01 missing marker: {marker}')

    batch02 = read('docs/PHASE_11_CONFIG_FOUNDATION_BATCH_02.md')
    for marker in [
        'virtualrouter.providers',
        'default route 首 target',
        'provider.runtime.transport',
        '${OPENAI_API_KEY}',
        'bash scripts/verify_phase11_config_foundation_batch02.sh',
    ]:
        if marker not in batch02:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_BATCH_02 missing marker: {marker}')

    batch03 = read('docs/PHASE_11_CONFIG_FOUNDATION_BATCH_03.md')
    for marker in [
        'virtualrouter.routing',
        'routingPolicyGroups + activeRoutingPolicyGroup',
        'EffectiveConfig.router.bootstrap.routes',
        'bash scripts/verify_phase11_config_foundation_batch03.sh',
    ]:
        if marker not in batch03:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_BATCH_03 missing marker: {marker}')

    batch04 = read('docs/PHASE_11_CONFIG_FOUNDATION_BATCH_04.md')
    for marker in [
        'typed router bootstrap',
        'RouteDecision.selected_route',
        'RouteDecision.candidate_routes',
        'bash scripts/verify_phase11_config_foundation_batch04.sh',
    ]:
        if marker not in batch04:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_BATCH_04 missing marker: {marker}')

    batch05 = read('docs/PHASE_11_CONFIG_FOUNDATION_BATCH_05.md')
    for marker in [
        'typed provider runtime registry bootstrap',
        'EffectiveConfig.provider.runtime.registry.transports',
        'bash scripts/verify_phase11_config_foundation_batch05.sh',
    ]:
        if marker not in batch05:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_BATCH_05 missing marker: {marker}')

    gap = read('docs/PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY.md')
    for marker in [
        'rcc-core-config crate',
        'DEFAULT_ADDR',
        'DEFAULT_OPERATION',
        'system default + user override merge',
        'httpserver.host/port',
        'virtualrouter.routing',
    ]:
        if marker not in gap:
            errors.append(f'PHASE_11_CONFIG_FOUNDATION_GAP_INVENTORY missing marker: {marker}')

    testing = read('docs/TESTING_AND_ACCEPTANCE.md')
    for marker in [
        'Phase 11 config foundation gate',
        'python3 scripts/verify_phase11_config_foundation.py',
        'bash scripts/verify_phase11_config_foundation_batch01.sh',
        'bash scripts/verify_phase11_config_foundation_batch02.sh',
        'bash scripts/verify_phase11_config_foundation_batch03.sh',
        'bash scripts/verify_phase11_config_foundation_batch04.sh',
        'bash scripts/verify_phase11_config_foundation_batch05.sh',
    ]:
        if marker not in testing:
            errors.append(f'TESTING_AND_ACCEPTANCE missing marker: {marker}')

    architecture = read('docs/RUST_WORKSPACE_ARCHITECTURE.md')
    for marker in [
        'rcc-core-config',
        'host -> config / orchestrator',
    ]:
        if marker not in architecture:
            errors.append(f'RUST_WORKSPACE_ARCHITECTURE missing marker: {marker}')

    boundaries = read('docs/CRATE_BOUNDARIES.md')
    for marker in [
        '`rcc-core-config`',
        'config path resolution / merge 真源只能在 `rcc-core-config`',
    ]:
        if marker not in boundaries:
            errors.append(f'CRATE_BOUNDARIES missing marker: {marker}')

    skill = read('.agents/skills/rcc-config-foundation/SKILL.md')
    for marker in SKILL_REQUIRED_MARKERS:
        if marker not in skill:
            errors.append(f'rcc-config-foundation skill missing section: {marker}')

    config_rs = read('rust/crates/rcc-core-config/src/lib.rs')
    for marker in [
        'pub fn load_config',
        'normalize_legacy_httpserver',
        'normalize_legacy_virtualrouter_provider_runtime',
        'normalize_legacy_virtualrouter_router_bootstrap',
        'resolve_env_placeholders',
        'pub struct EffectiveConfig',
        'pub struct RouterBootstrapConfig',
        'pub enum ProviderRuntimeKind',
        'pub struct ProviderRuntimeRegistryConfig',
    ]:
        if marker not in config_rs:
            errors.append(f'rcc-core-config/src/lib.rs missing marker: {marker}')

    host_rs = read('rust/crates/rcc-core-host/src/lib.rs')
    for marker in [
        'load_host_config',
        'parse_cli_args',
        'smoke_summary_with_config',
        'SkeletonApplication::from_config',
    ]:
        if marker not in host_rs:
            errors.append(f'rcc-core-host/src/lib.rs missing marker: {marker}')

    orchestrator_rs = read('rust/crates/rcc-core-orchestrator/src/lib.rs')
    for marker in [
        'batch03_config_router_bootstrap_feeds_router_candidates',
        'routing_pools_from_bootstrap',
        'from_config_exposes_runtime_router_selection',
    ]:
        if marker not in orchestrator_rs:
            errors.append(f'rcc-core-orchestrator/src/lib.rs missing marker: {marker}')

    phase11_ci = read('.github/workflows/phase11-config-foundation.yml')
    if 'bash scripts/verify_phase11_config_foundation_batch05.sh' not in phase11_ci:
        errors.append('phase11-config-foundation workflow missing batch05 verification entry')

if errors:
    print('PHASE11_CONFIG_FOUNDATION_VERIFY: FAIL')
    for item in errors:
        print(f'- {item}')
    sys.exit(1)

print('PHASE11_CONFIG_FOUNDATION_VERIFY: PASS')
for item in checks:
    print(f'- {item}')
