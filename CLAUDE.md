# CLAUDE.md

This file provides comprehensive guidance to Claude Code when working with code in this repository. This project implements a strict modular governance system with comprehensive rules for architecture, security, and development practices.

## Project Overview

This is a modular TypeScript project called "rcc" that implements a plug-in architecture system with comprehensive governance. The core feature is a module registry that manages dynamic module registration, creation, and API isolation with strict adherence to architectural principles and development standards.

### Governance Framework

This project follows a comprehensive governance framework defined in the `.claude/` directory:

#### Core Architecture Rules
- **[Module Architecture Rules](.claude/rules/module-architecture.md)**: Base class inheritance, registration, lifecycle management, and MANDATORY structure patterns
- **[API Isolation and Security Rules](.claude/rules/api-isolation.md)**: Proxy-based access control, security boundaries, anti-hardcoding policies
- **[Inter-Module Communication Standards](.claude/rules/inter-module-communication.md)**: Connection protocols, data transfer, handshakes
- **[Type Safety and Validation Rules](.claude/rules/type-safety.md)**: TypeScript strict mode, validation standards, error handling
- **[Development and Deployment Rules](.claude/rules/development-deployment.md)**: CI/CD, testing, documentation, deployment standards
- **[Directory Structure Rules](.claude/rules/directory-structure.md)**: Complete directory organization and testing architecture

#### Modular Publishing Framework
- **[Modular Publishing Governance](.claude/rules/modular-publishing-governance.md)**: Master governance framework for independent npm module publishing
- **[Modular Publishing Strategy](.claude/rules/modular-publishing-strategy.md)**: Comprehensive strategy for Configuration submodule publishing
- **[Dependency Management](.claude/rules/dependency-management.md)**: Inter-module dependency management and version compatibility
- **[Testing Requirements](.claude/rules/testing-requirements.md)**: Comprehensive testing requirements for module publishing
- **[Publishing Workflow](.claude/rules/publishing-workflow.md)**: Automated publishing pipeline and quality gates

#### Configuration Management
- **[Configuration Management](.claude/config.yml)**: Automated validation, quality gates, security settings

## Key Architecture Components

### Core Module System (`src/core/`)
- **BaseModule**: Abstract base class providing foundational functionality for all modules
  - Manages input/output connections using Maps for efficient lookup
  - Implements validation rules with type checking (required, string, number, boolean, object, array, custom)
  - Provides handshake protocol for inter-module communication
  - Uses static factory pattern for dynamic instantiation while maintaining type safety

### Module Registry (`src/registry/`)
- **ModuleRegistry**: Singleton pattern for centralized module management
  - Maintains two Maps: one for instances, one for type constructors
  - Supports type-safe module creation with async initialization
  - Provides CRUD operations and filtering by module type
  - Ensures proper cleanup through destroy() methods

### Interface Definitions (`src/interfaces/`)
- **ModuleInfo**: Defines module metadata structure (id, name, version, description, type, metadata)
- **Connection**: Handles inter-module connections with input/output typing
- **Validation**: Comprehensive validation framework with extensible rule system

### API Isolation (`src/utils/`)
- **ApiIsolation**: Implements proxy-based security to restrict module access
  - Creates restrictive interfaces exposing only specified methods/properties
  - Uses ES6 Proxy to intercept all property access and method calls
  - Prevents direct property modification while allowing internal access
  - Maintains type safety through generic TypeScript typing

## Development Commands

```bash
# Development
npm run dev          # Run in development mode with ts-node
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JavaScript from dist/

# Testing
npm test             # Currently shows "Error: no test specified" - needs implementation
```

## Module Implementation Pattern

New modules must:
1. Extend `BaseModule` class
2. Implement required abstract methods (initialize, receiveData, etc.)
3. Define validation rules if needed
4. Register with `ModuleRegistry` using `registerModuleType()`
5. Create instances through `registry.createModule()` for proper initialization

## API Isolation Usage

Modules should expose restricted interfaces using `ApiIsolation.createModuleInterface()`:
```typescript
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['publicMethod1', 'publicMethod2'],
  properties: ['readOnlyProperty']
});
```

## TypeScript Configuration

- Target: ES2020 with CommonJS modules
- Strict mode enabled with full type checking
- Decorators supported (experimentalDecorators: true)
- Declaration maps and source maps generated
- Output directory: `./dist/`

## Module Lifecycle

1. **Registration**: Module types registered with registry
2. **Creation**: Instances created via registry with async initialization
3. **Connection**: Input/output connections established
4. **Operation**: Data transfer and validation
5. **Cleanup**: Resources released through destroy() method

## Security Considerations

- All module interactions go through API isolation proxies
- Internal methods are protected from external access
- Property modifications are restricted to internal operations
- Validation occurs before processing input data
- Security boundaries are enforced at multiple levels

## Module Development Requirements

### 🔴 CRITICAL: Mandatory Module Structure
All modules MUST follow the EXACT BaseModule structure pattern (AUTOMATIC BUILD FAILURE if not followed):

```
src/modules/[ModuleName]/
├── README.md                    # ❌ REQUIRED: Complete API documentation
├── __test__/                    # ❌ REQUIRED: Test directory
│   ├── [ModuleName].test.ts     # ❌ REQUIRED: Unit tests (all required cases)
│   ├── [ModuleName]Communication.test.ts  # ❌ REQUIRED: Communication tests
│   └── fixtures/                # ❌ REQUIRED: Test fixtures
│       └── test-data.ts
├── constants/                   # ❌ REQUIRED: Constants directory (NO HARDCODING)
│   └── [ModuleName].constants.ts
├── interfaces/                  # ❌ REQUIRED: Interfaces directory
│   ├── I[ModuleName].ts
│   ├── I[ModuleName]Input.ts
│   └── I[ModuleName]Output.ts
└── src/                         # ❌ REQUIRED: Source directory
    └── [ModuleName].ts
```

#### **MANDATORY Content Requirements**
- **README.md**: Complete API documentation with all required sections
- **Constants file**: All configuration values - NO HARDCODING ALLOWED
- **Test files**: 100% test coverage with all required test cases
- **Interfaces**: Proper TypeScript interfaces for all I/O
- **Source file**: Must extend BaseModule with complete lifecycle

### Anti-Hardcoding Policy
**STRICTLY PROHIBITED**: All hardcoded values must be replaced with constants:
```typescript
// ✅ CORRECT: Use constants file
import { EXAMPLE_MODULE_CONSTANTS } from './constants/ExampleModuleConstants';
const timeout = EXAMPLE_MODULE_CONSTANTS.DEFAULT_TIMEOUT_MS;

// ❌ VIOLATION: Hardcoded values
const timeout = 5000; // FORBIDDEN
```

### Documentation Requirements
- Every module MUST have a comprehensive README.md
- All API interfaces MUST be documented in the central API registry
- Complete changelog and version history required

### Testing Requirements (MANDATORY)
- **100% test coverage mandatory** - No exceptions
- **Complete test suite**: Unit tests, integration tests, E2E tests
- **Required test categories**:
  - Module lifecycle tests (creation, initialization, destruction)
  - Communication tests (data transfer, handshakes)
  - API isolation tests (access control, security)
  - Error handling tests (validation, recovery)
  - Performance tests (benchmarks, thresholds)
- **Test structure**: Fixed test files with required test cases
- **Quality gates**: 100% coverage, no security issues, no linting errors

### Complete Testing Architecture

#### **Unit Tests** (`tests/unit/`)
- Individual component testing
- Mock objects and fixtures
- Type safety validation
- Performance benchmarking

#### **Integration Tests** (`tests/integration/`)
- Module lifecycle integration
- Registry integration testing
- API isolation validation
- Communication protocol testing
- Security integration tests

#### **E2E Tests** (`tests/e2e/`)
- Complete system flow testing
- Multi-module communication
- Performance and scalability
- Security validation
- Error handling and recovery

#### **Test Infrastructure**
- Centralized test configuration
- Automated fixture management
- Performance monitoring
- Coverage reporting
- Quality gate validation

### CI/CD Requirements (MANDATORY)
- **Multi-stage pipeline**: Development → Testing → Staging → Production
- **Automated validation**: Structure, anti-hardcoding, documentation, security
- **Comprehensive testing**: Unit, integration, E2E, performance, security
- **Quality gates**: 100% test coverage, no security issues, no linting errors
- **Automated deployment**: Version control, rollback capability, health checks
- **Monitoring**: Performance metrics, security alerts, error tracking

## Development Workflow

### 1. Module Development
1. Create module following standard structure
2. Implement constants (NO HARDCODING)
3. Write comprehensive README.md
4. Implement complete test suite
5. Register module type in registry

### 2. Compliance Validation (MANDATORY)
1. **Structure validation**: `npm run validate:module-structure` (must pass)
2. **Anti-hardcoding check**: `npm run validate:no-hardcoding` (must pass)
3. **Code quality**: `npm run lint && npm run format:check` (must pass)
4. **Test execution**: `npm test` (100% coverage mandatory)
5. **Documentation verification**: `npm run docs:check` (must pass)
6. **Security scanning**: `npm run security:scan` (must pass)
7. **Performance validation**: `npm run performance:test` (must pass thresholds)

### Development Tools and Automation

#### **Build Tools**
- `npm run build`: Compile TypeScript to dist/
- `npm run dev`: Development mode with hot reload
- `npm run start`: Run compiled application

#### **Validation Tools**
- `npm run validate:all`: Run all validation checks
- `npm run validate:structure`: Validate directory structure
- `npm run validate:module`: Validate specific module
- `npm run validate:constants`: Validate no hardcoded values

#### **Testing Tools**
- `npm test`: Run complete test suite
- `npm run test:unit`: Run unit tests only
- `npm run test:integration`: Run integration tests only
- `npm run test:e2e`: Run E2E tests only
- `npm run test:performance`: Run performance benchmarks
- `npm run test:coverage`: Generate coverage report

#### **Code Quality Tools**
- `npm run lint`: ESLint validation
- `npm run format`: Prettier formatting
- `npm run typecheck`: TypeScript type checking
- `npm run security:audit`: Security vulnerability scan

#### **Documentation Tools**
- `npm run docs:generate`: Generate API documentation
- `npm run docs:validate`: Validate documentation completeness
- `npm run docs:serve`: Serve documentation locally

#### **Deployment Tools**
- `npm run deploy:staging`: Deploy to staging environment
- `npm run deploy:production`: Deploy to production
- `npm run rollback`: Rollback to previous version

### 3. CI/CD Pipeline
1. Automated checks on every commit
2. Comprehensive testing across Node.js versions
3. Security scanning and vulnerability assessment
4. Performance benchmarking
5. E2E testing
6. Automated deployment for main branch

### 4. Deployment Requirements
1. All quality gates must pass
2. Security audit must be clean
3. Performance benchmarks established
4. Complete documentation updated
5. Version following semantic versioning

## Key Governance Principles

### 1. Modular Independence
- Each module is self-contained with clear boundaries
- Static compilation, dynamic instantiation
- Strict API isolation with proxy-based security

### 2. Type Safety First
- TypeScript strict mode enforced
- 100% type coverage required
- Comprehensive validation framework

### 3. Security by Design
- API isolation proxies for all external access
- Strict anti-hardcoding policies
- Security scanning at multiple levels

### 4. Quality Automation
- Automated rule enforcement
- Comprehensive CI/CD pipeline
- Quality gates and performance monitoring

### 5. Documentation-Driven
- Module README mandatory
- API interface documentation central
- Changelog and version tracking

## 🔴 ENFORCEMENT POLICY

### Automated Rule Enforcement
All governance rules are automatically enforced through:

#### **Pre-commit Hooks**
- Block commits if structure validation fails
- Prevent hardcoded values from being committed
- Require 100% test coverage
- Enforce code formatting and linting

#### **CI/CD Pipeline**
- **Critical violations**: Immediate build failure
- **Major violations**: Requires manual review and approval
- **Minor violations**: Warning only but logged for tracking

#### **Quality Gates (MANDATORY)**
```typescript
const QUALITY_GATES = {
  testCoverage: 100,        // 100% coverage - no exceptions
  structureValid: true,     // Must follow BaseModule pattern
  noHardcoded: true,       // Strict anti-hardcoding policy
  documentationComplete: true, // Complete API documentation
  securityScan: 'pass',    // Must pass security scanning
  performance: 'pass',     // Must meet performance thresholds
  lintErrors: 0,           // No linting errors allowed
  typeErrors: 0            // No TypeScript errors allowed
};
```

#### **Violation Categories**
- **❌ CRITICAL**: Build failure (missing structure, incomplete tests, no documentation)
- **⚠️ MAJOR**: Review required (partial compliance, edge cases)
- **💡 MINOR**: Warning only (formatting, optional improvements)

### Mandatory Directory Structure
The complete directory structure is defined in `[.claude/rules/directory-structure.md](.claude/rules/directory-structure.md)`. All directories and files marked with `❌ REQUIRED` must exist and follow the specified patterns.

### Module Development Template
All modules must be developed using the BaseModule template structure, which includes:
- Complete directory structure with all required directories
- Comprehensive API documentation
- 100% test coverage with required test cases
- Strict anti-hardcoding compliance
- Proper interface definitions
- Complete lifecycle implementation

---

**🚨 CRITICAL**: All development MUST follow the governance rules listed in `.claude/rules/`. Any violations will result in immediate build failure. All modules must follow the exact BaseModule structure pattern and pass all automated validation checks. The system enforces strict compliance through automated tools and CI/CD pipelines.