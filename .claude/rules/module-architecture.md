# Module Architecture Rules

This document defines the core architectural rules for module development in the RCC modular system.

## 🔴 CRITICAL: Mandatory Module Structure

### Rule 1.0: BaseModule Structure Pattern (MANDATORY)
- **Requirement**: ALL modules MUST follow the exact directory structure pattern established by BaseModule
- **Rationale**: Ensures consistency, testability, and maintainability across all modules
- **Penalty**: Automatic build failure - modules not following this pattern will not be accepted

#### **MANDATORY Directory Structure**
```
src/
├── modules/
│   └── [ModuleName]/
│       ├── README.md                    # ❌ REQUIRED: Module documentation
│       ├── __test__/                    # ❌ REQUIRED: Test directory
│       │   ├── [ModuleName].test.ts     # ❌ REQUIRED: Unit tests
│       │   ├── [ModuleName]Communication.test.ts  # ❌ REQUIRED: Communication tests
│       │   └── fixtures/                # ❌ REQUIRED: Test fixtures
│       │       └── test-data.ts
│       ├── constants/                   # ❌ REQUIRED: Constants directory
│       │   └── [ModuleName].constants.ts
│       ├── interfaces/                  # ❌ REQUIRED: Interfaces directory
│       │   ├── I[ModuleName].ts
│       │   ├── I[ModuleName]Input.ts
│       │   └── I[ModuleName]Output.ts
│       └── src/                         # ❌ REQUIRED: Source directory
│           └── [ModuleName].ts
├── core/
│   └── BaseModule/                      # ❌ REQUIRED: BaseModule (template structure)
│       ├── README.md
│       ├── __test__/
│       │   ├── BaseModule.test.ts
│       │   └── BaseModuleCommunication.test.ts
│       └── src/
│           └── BaseModule.ts
```

#### **MANDATORY Files Content Requirements**

**1. README.md Format (STRICT TEMPLATE)**
```markdown
# [ModuleName]

[Clear, concise description of module purpose and functionality]

## API

### Constructor
```typescript
constructor(info: ModuleInfo)
```
Creates a new instance of [ModuleName].

### Public Methods

#### [methodName]([params]): [returnType]
[Brief description of method functionality]
- [Parameter descriptions]
- [Return value description]
- [Error conditions]

[... all public methods ...]

### Protected Methods

#### [methodName]([params]): [returnType]
[Brief description of method functionality]
- [Internal usage notes]

[... all protected methods ...]

## Usage Example

```typescript
// Complete working example showing:
// 1. Module creation
// 2. Configuration
// 3. Initialization
// 4. Usage
// 5. Cleanup
```
```

**2. Test File Requirements**
```typescript
// ❌ REQUIRED: [ModuleName].test.ts
describe('[ModuleName]', () => {
  // ❌ REQUIRED: Basic functionality tests
  it('should create a module instance', () => { /* ... */ });
  
  // ❌ REQUIRED: Configuration tests
  it('should configure the module', () => { /* ... */ });
  
  // ❌ REQUIRED: Initialization tests
  it('should initialize properly', () => { /* ... */ });
  
  // ❌ REQUIRED: Connection management tests
  it('should add and get connections', () => { /* ... */ });
  
  // ❌ REQUIRED: Input validation tests
  it('should validate input data', () => { /* ... */ });
  
  // ❌ REQUIRED: Handshake tests
  it('should perform handshake', () => { /* ... */ });
});

// ❌ REQUIRED: [ModuleName]Communication.test.ts
describe('[ModuleName] Communication', () => {
  // ❌ REQUIRED: Data transfer tests
  it('should transfer data correctly', () => { /* ... */ });
  
  // ❌ REQUIRED: Data reception tests
  it('should receive data correctly', () => { /* ... */ });
  
  // ❌ REQUIRED: Communication error handling tests
  it('should handle communication errors', () => { /* ... */ });
});
```

**3. Constants File Requirements**
```typescript
// ❌ REQUIRED: [ModuleName].constants.ts
export const [MODULE_NAME]_CONSTANTS = {
  // ❌ REQUIRED: Module type
  MODULE_TYPE: '[module-type]',
  
  // ❌ REQUIRED: Default configuration
  DEFAULT_CONFIG: {
    timeout: 5000,
    maxRetries: 3,
    // ... other defaults
  },
  
  // ❌ REQUIRED: Validation rules
  VALIDATION_RULES: [
    {
      field: 'required-field',
      type: 'required',
      message: 'Field is required'
    }
    // ... other validation rules
  ],
  
  // ❌ REQUIRED: Error messages
  ERROR_MESSAGES: {
    INITIALIZATION_FAILED: 'Module initialization failed',
    VALIDATION_ERROR: 'Input validation failed',
    // ... other error messages
  },
  
  // ❌ REQUIRED: Status codes
  STATUS_CODES: {
    INITIALIZED: 'initialized',
    PROCESSING: 'processing',
    ERROR: 'error'
  }
};
```

**4. Interface Requirements**
```typescript
// ❌ REQUIRED: I[ModuleName].ts
export interface I[ModuleName] {
  // ❌ REQUIRED: Core module interface
  [methodSignature]: [returnType];
}

// ❌ REQUIRED: I[ModuleName]Input.ts
export interface I[ModuleName]Input {
  // ❌ REQUIRED: Input data structure
  [field]: [type];
}

// ❌ REQUIRED: I[ModuleName]Output.ts
export interface I[ModuleName]Output {
  // ❌ REQUIRED: Output data structure
  [field]: [type];
}
```

## Base Class Inheritance Requirements

### Rule 1.1: Mandatory BaseModule Inheritance
- **Requirement**: All modules MUST inherit from `BaseModule`
- **Rationale**: Ensures consistent module lifecycle, connection management, and validation capabilities
- **Implementation**: Module class declaration must extend BaseModule

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  // Module implementation
}

// ❌ Violation
export class MyModule {
  // This bypasses all architectural benefits
}
```

### Rule 1.2: Constructor Pattern
- **Requirement**: All modules MUST pass `ModuleInfo` to parent constructor
- **Rationale**: Ensures proper module initialization and metadata handling
- **Implementation**: Call `super(info)` as first statement in constructor

```typescript
// ✅ Correct Implementation
constructor(info: ModuleInfo) {
  super(info); // Always call parent constructor first
  // Additional initialization
}

// ❌ Violation
constructor(info: ModuleInfo) {
  // Missing super(info) call
  this.info = info; // Direct assignment bypass
}
```

### Rule 1.3: Static Factory Method
- **Requirement**: All modules MUST use the static `createInstance()` method from BaseModule
- **Rationale**: Ensures static compilation with dynamic instantiation pattern
- **Implementation**: Use inherited `createInstance()` for module creation

```typescript
// ✅ Correct Implementation
const module = MyModule.createInstance(moduleInfo);

// ❌ Violation
const module = new MyModule(moduleInfo); // Direct instantiation
```

## Module Registration and Lifecycle Management

### Rule 2.1: Mandatory Registration
- **Requirement**: All module types MUST be registered with `ModuleRegistry`
- **Rationale**: Enables centralized module management and routing
- **Implementation**: Register module type before creating instances

```typescript
// ✅ Correct Implementation
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('my-module', MyModule);

// ❌ Violation
// Direct instantiation without registration
const module = new MyModule(moduleInfo);
```

### Rule 2.2: Complete Lifecycle Implementation
- **Requirement**: All modules MUST implement the complete lifecycle pattern
- **Rationale**: Ensures proper resource management and connection cleanup
- **Implementation**: Implement `initialize()`, `destroy()`, and `handshake()` methods

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  public async initialize(): Promise<void> {
    await super.initialize();
    // Module-specific initialization
  }
  
  public async destroy(): Promise<void> {
    // Module-specific cleanup
    await super.destroy();
  }
  
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    const baseResult = await super.handshake(targetModule);
    // Module-specific handshake logic
    return baseResult && moduleSpecificHandshake;
  }
}

// ❌ Violation
export class MyModule extends BaseModule {
  // Missing lifecycle method implementations
}
```

### Rule 2.3: Module Information Integrity
- **Requirement**: All modules MUST maintain valid `ModuleInfo` throughout lifecycle
- **Rationale**: Ensures proper module identification and metadata management
- **Implementation**: Use `getInfo()` method for read-only access

```typescript
// ✅ Correct Implementation
public getInfo(): ModuleInfo {
  return { ...this.info }; // Return copy to prevent modification
}

// ❌ Violation
public getInfo(): ModuleInfo {
  return this.info; // Direct reference allows external modification
}
```

## Module Categorization and Type System

### Rule 3.1: Type System Compliance
- **Requirement**: All modules MUST implement proper TypeScript typing
- **Rationale**: Enables compile-time type checking and better developer experience
- **Implementation**: Define interfaces for all module inputs and outputs

```typescript
// ✅ Correct Implementation
interface MyModuleInput {
  message: string;
  priority: number;
}

interface MyModuleOutput {
  response: string;
  timestamp: number;
}

export class MyModule extends BaseModule {
  public async processInput(input: MyModuleInput): Promise<MyModuleOutput> {
    // Type-safe processing
  }
}

// ❌ Violation
export class MyModule extends BaseModule {
  public async processInput(input: any): Promise<any> {
    // No type safety
  }
}
```

### Rule 3.2: Module Type Classification
- **Requirement**: All modules MUST have a unique and meaningful type identifier
- **Rationale**: Enables proper module categorization and registry lookup
- **Implementation**: Use descriptive, lowercase type identifiers

```typescript
// ✅ Correct Implementation
const moduleInfo: ModuleInfo = {
  id: 'message-processor-1',
  name: 'Message Processor',
  version: '1.0.0',
  description: 'Processes incoming messages',
  type: 'message-processor' // Descriptive type
};

// ❌ Violation
const moduleInfo: ModuleInfo = {
  // ...
  type: 'mod' // Too vague, not descriptive
};
```

### Rule 3.3: Interface Segregation
- **Requirement**: Module interfaces MUST be segregated by responsibility
- **Rationale**: Promotes single responsibility and reduces coupling
- **Implementation**: Create focused interfaces for specific functionalities

```typescript
// ✅ Correct Implementation
interface IMessageProcessor {
  processMessage(message: string): Promise<void>;
}

interface IConnectionManager {
  addConnection(connection: ConnectionInfo): void;
  removeConnection(connectionId: string): void;
}

// ❌ Violation
interface IModule {
  // Too many responsibilities
  processMessage(message: string): Promise<void>;
  addConnection(connection: ConnectionInfo): void;
  validateInput(data: any): ValidationResult;
  destroy(): Promise<void>;
}
```

## Interface Exposure and API Isolation Standards

### Rule 4.1: Selective Method Exposure
- **Requirement**: Only essential methods MUST be exposed through public API
- **Rationale**: Maintains clear boundaries and prevents unauthorized access
- **Implementation**: Use `ApiIsolation.createModuleInterface()` for controlled exposure

```typescript
// ✅ Correct Implementation
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processMessage', 'getStatus'], // Only essential methods
  properties: []
});

// ❌ Violation
// Direct module access exposes all methods
await module.anyMethod();
```

### Rule 4.2: Internal Method Protection
- **Requirement**: Internal implementation methods MUST be private or protected
- **Rationale**: Prevents unintended external access and maintains encapsulation
- **Implementation**: Use appropriate access modifiers

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  public processMessage(message: string): Promise<void> {
    // Public API method
  }
  
  protected validateMessage(message: string): boolean {
    // Internal method, accessible to subclasses
  }
  
  private internalProcessing(message: string): void {
    // Private method, only accessible within this class
  }
}

// ❌ Violation
export class MyModule extends BaseModule {
  public processMessage(message: string): Promise<void> {
    // Public API method
  }
  
  public internalProcessing(message: string): void {
    // Internal method should not be public
  }
}
```

### Rule 4.3: Property Access Control
- **Requirement**: Module state properties MUST have appropriate access control
- **Rationale**: Prevents unauthorized state modification and maintains data integrity
- **Implementation**: Use private/protected for state properties, getters for read-only access

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  private internalState: string = 'initial';
  public moduleStatus: string;
  
  public get state(): string {
    return this.internalState; // Read-only access
  }
  
  private set state(value: string) {
    this.internalState = value; // Private modification
  }
}

// ❌ Violation
export class MyModule extends BaseModule {
  public internalState: string = 'initial'; // Direct access allows modification
}
```

## Module Configuration and Initialization

### Rule 5.1: Configuration Validation
- **Requirement**: All configuration data MUST be validated using validation rules
- **Rationale**: Ensures module stability and prevents runtime errors
- **Implementation**: Configure validation rules in constructor

```typescript
// ✅ Correct Implementation
constructor(info: ModuleInfo) {
  super(info);
  this.validationRules = [
    {
      field: 'message',
      type: 'string',
      message: 'Message must be a string'
    },
    {
      field: 'priority',
      type: 'number',
      message: 'Priority must be a number'
    }
  ];
}

// ❌ Violation
constructor(info: ModuleInfo) {
  super(info);
  // No validation rules configured
}
```

### Rule 5.2: Initialization Sequence
- **Requirement**: Modules MUST follow proper initialization sequence
- **Rationale**: Ensures all dependencies are properly initialized
- **Implementation**: Call `super.initialize()` first, then module-specific init

```typescript
// ✅ Correct Implementation
public async initialize(): Promise<void> {
  await super.initialize(); // Always call parent first
  // Module-specific initialization
  await this.setupValidators();
  await this.initializeConnections();
}

// ❌ Violation
public async initialize(): Promise<void> {
  // Module-specific initialization first
  await this.setupValidators();
  await super.initialize(); // Wrong order
}
```

## Connection Management Standards

### Rule 6.1: Connection Validation
- **Requirement**: All connections MUST be validated before establishment
- **Rationale**: Prevents invalid connections and ensures data flow integrity
- **Implementation**: Validate connection info before adding

```typescript
// ✅ Correct Implementation
public addInputConnection(connection: ConnectionInfo): void {
  if (!this.validateConnection(connection)) {
    throw new Error(`Invalid connection: ${connection.id}`);
  }
  if (connection.type !== 'input') {
    throw new Error('Invalid connection type for input');
  }
  this.inputConnections.set(connection.id, connection);
}

// ❌ Violation
public addInputConnection(connection: ConnectionInfo): void {
  // No validation, direct assignment
  this.inputConnections.set(connection.id, connection);
}
```

### Rule 6.2: Connection Lifecycle
- **Requirement**: All connections MUST be properly managed throughout module lifecycle
- **Rationale**: Prevents memory leaks and ensures clean shutdown
- **Implementation**: Clear connections in destroy method

```typescript
// ✅ Correct Implementation
public async destroy(): Promise<void> {
  // Clear all connections
  this.inputConnections.clear();
  this.outputConnections.clear();
  this.initialized = false;
  await super.destroy();
}

// ❌ Violation
public async destroy(): Promise<void> {
  // Missing connection cleanup
  this.initialized = false;
}
```

## Violation Examples and Corrections

### Common Violation Pattern 1: Bypassing Registry
**Violation**: Direct module instantiation without registration
```typescript
// ❌ Wrong
const module = new MyModule(moduleInfo);
```
**Correction**: Use registry pattern
```typescript
// ✅ Correct
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('my-module', MyModule);
const module = await registry.createModule<MyModule>(moduleInfo);
```

### Common Violation Pattern 2: Missing API Isolation
**Violation**: Direct module access exposes all methods
```typescript
// ❌ Wrong
await module.internalProcessing(data);
```
**Correction**: Use API isolation
```typescript
// ✅ Correct
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processData'], // Only safe methods
  properties: []
});
await moduleApi.processData(data);
```

### Common Violation Pattern 3: Improper Lifecycle
**Violation**: Missing proper initialization sequence
```typescript
// ❌ Wrong
public async initialize(): Promise<void> {
  this.setupConnections();
  this.initialized = true;
}
```
**Correction**: Complete lifecycle implementation
```typescript
// ✅ Correct
public async initialize(): Promise<void> {
  await super.initialize();
  this.setupConnections();
  this.setupValidators();
  this.initialized = true;
}
```

## Module Structure Validation Requirements

### Rule 7.0: Automated Structure Validation
- **Requirement**: All modules MUST pass automated structure validation
- **Rationale**: Ensures compliance with the mandatory structure pattern
- **Implementation**: Automated CI/CD validation checks

#### **Structure Validation Checklist**
```
✅ Directory Structure:
  ├─ src/modules/[ModuleName]/
  │  ├─ README.md (content validated)
  │  ├─ __test__/
  │  │  ├─ [ModuleName].test.ts (all required tests)
  │  │  ├─ [ModuleName]Communication.test.ts
  │  │  └─ fixtures/test-data.ts
  │  ├─ constants/[ModuleName].constants.ts (all required sections)
  │  ├─ interfaces/
  │  │  ├─ I[ModuleName].ts
  │  │  ├─ I[ModuleName]Input.ts
  │  │  └─ I[ModuleName]Output.ts
  │  └─ src/[ModuleName].ts
  └─ core/BaseModule/ (reference structure)

✅ Content Validation:
  ├─ README.md: Contains all required sections
  ├─ Test files: All required test cases present
  ├─ Constants: All required constants defined
  ├─ Interfaces: All required interfaces properly typed
  └─ Source: Proper inheritance from BaseModule
```

### Rule 7.1: Module Structure Compliance
- **Requirement**: Modules MUST be tested for structural compliance before build
- **Rationale**: Prevents non-compliant modules from entering the build pipeline
- **Implementation**: Pre-build validation step

```typescript
// ❌ REQUIRED: Structure validation check
// This must pass before any module is considered complete
const structureValidation = validateModuleStructure(modulePath);
if (!structureValidation.isValid) {
  throw new Error(`Module structure validation failed: ${structureValidation.errors.join(', ')}`);
}
```

### Rule 7.2: File Naming Conventions
- **Requirement**: All files MUST follow strict naming conventions
- **Rationale**: Ensures consistency and automatic discovery
- **Implementation**: Automated name validation

```typescript
// ✅ Correct naming patterns
'ModuleName.ts'              // Source file
'ModuleName.test.ts'         // Unit tests
'ModuleNameCommunication.test.ts'  // Communication tests
'ModuleName.constants.ts'    // Constants
'IModuleName.ts'             // Main interface
'IModuleNameInput.ts'        // Input interface
'IModuleNameOutput.ts'       // Output interface
```

### Rule 7.3: Documentation Completeness
- **Requirement**: All modules MUST have complete API documentation
- **Rationale**: Ensures maintainability and developer productivity
- **Implementation**: Automated documentation validation

```typescript
// ❌ REQUIRED: Documentation validation checklist
const documentationValidation = validateDocumentation(modulePath);
const requiredSections = [
  'API Documentation',
  'Constructor',
  'Public Methods',
  'Protected Methods',
  'Usage Example'
];

if (!documentationValidation.hasAllSections) {
  throw new Error('Module documentation is incomplete');
}
```

## Module Development Workflow Requirements

### Rule 8.0: Development Process Compliance
- **Requirement**: All module development MUST follow the established workflow
- **Rationale**: Ensures quality and consistency
- **Implementation**: Automated workflow validation

#### **MANDATORY Development Steps**
```
1. ✅ Create directory structure (all required directories)
2. ✅ Create interfaces file (all required interfaces)
3. ✅ Create constants file (all required constants)
4. ✅ Create source file (extend BaseModule)
5. ✅ Create README.md (complete API documentation)
6. ✅ Create unit tests (all required test cases)
7. ✅ Create communication tests (all communication scenarios)
8. ✅ Create test fixtures (test data)
9. ✅ Run structure validation (must pass)
10. ✅ Run all tests (100% coverage mandatory)
11. ✅ Run linting (no errors)
12. ✅ Run type checking (no errors)
13. ✅ Submit for review (automated validation)
```

### Rule 8.1: Quality Gates
- **Requirement**: All modules MUST pass all quality gates
- **Rationale**: Ensures production-ready code quality
- **Implementation**: Automated quality validation

```typescript
// ❌ REQUIRED: Quality gate validation
const qualityGates = {
  testCoverage: 100,          // 100% test coverage mandatory
  lintErrors: 0,              // No linting errors
  typeErrors: 0,              // No TypeScript errors
  structureValid: true,       // Structure must be valid
  documentationComplete: true, // Documentation must be complete
  securityScan: 'pass'        // Security scan must pass
};

if (!passQualityGates(qualityGates)) {
  throw new Error('Module failed quality gates');
}
```

### Rule 8.2: Anti-Patterns Detection
- **Requirement**: All modules MUST be scanned for anti-patterns
- **Rationale**: Prevents common architectural mistakes
- **Implementation**: Automated anti-pattern detection

```typescript
// ❌ PROHIBITED: Anti-patterns that will cause build failure
const antiPatterns = [
  'Direct property access without getters',
  'Hardcoded values in source code',
  'Missing error handling',
  'Incomplete lifecycle implementation',
  'Public methods that should be protected/private',
  'Missing API isolation',
  'Bypassing registry creation',
  'Incomplete test coverage',
  'Missing documentation'
];
```

## Violation Enforcement

### Rule 9.0: Automated Enforcement
- **Requirement**: All rules MUST be automatically enforced
- **Rationale**: Removes human error and ensures compliance
- **Implementation**: CI/CD pipeline validation

#### **Enforcement Mechanisms**
1. **Pre-commit hooks**: Block commits if rules are violated
2. **CI/CD validation**: Fail builds if requirements are not met
3. **Automated reporting**: Generate violation reports
4. **Quality gates**: Prevent deployment if standards are not met

### Rule 9.1: Violation Categories
- **Critical**: Build failure (missing structure, incomplete tests, no documentation)
- **Major**: Review required (partial tests, missing constants)
- **Minor**: Warning only (minor formatting issues)

#### **Critical Violations (Build Failure)**
```typescript
const criticalViolations = [
  'Missing required directory structure',
  'Missing required test files',
  'Missing API documentation',
  'Missing constants file',
  'Missing interface definitions',
  'Not extending BaseModule',
  'Less than 100% test coverage',
  'TypeScript errors present',
  'Linting errors present'
];
```

These rules ensure consistent, maintainable, and secure module development within the RCC modular architecture system. Enforcement is automated and violations result in immediate build failure to ensure compliance.