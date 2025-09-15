# Module Registration Compliance Requirements

## Overview

This document outlines the compliance requirements for module registration in the RCC framework. All modules must adhere to these requirements to ensure proper integration with the module registry and messaging system.

## Module Registration Process

### 1. Module Type Registration
Before creating module instances, the module type must be registered with the ModuleRegistry:

```typescript
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('my-module-type', MyModuleClass);
```

### 2. Module Instance Creation
Module instances are created through the registry, which ensures proper initialization:

```typescript
const moduleInfo: ModuleInfo = {
  id: 'unique-module-id',
  name: 'My Module',
  version: '1.0.0',
  description: 'A sample module',
  type: 'my-module-type'
};

const module = await registry.createModule<MyModuleClass>(moduleInfo);
```

## Compliance Requirements

### 1. BaseModule Inheritance
All modules MUST extend the BaseModule class:

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  // Module implementation
}

// ❌ Violation
export class MyModule {
  // Does not extend BaseModule
}
```

### 2. Constructor Implementation
Modules MUST properly implement the constructor and call the parent constructor:

```typescript
// ✅ Correct Implementation
constructor(info: ModuleInfo) {
  super(info);
  // Additional initialization
}

// ❌ Violation
constructor(info: ModuleInfo) {
  // Missing super(info) call
}
```

### 3. Static Factory Method
Modules MUST use the static factory method pattern inherited from BaseModule:

```typescript
// ✅ Correct Implementation
const module = MyModule.createInstance(moduleInfo);

// ❌ Violation
const module = new MyModule(moduleInfo);
```

### 4. Lifecycle Method Implementation
Modules MUST implement the required lifecycle methods:

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
```

### 5. Message Handler Implementation
Modules MUST implement the MessageHandler interface:

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    // Message handling logic
  }
  
  public onModuleRegistered(moduleId: string): void {
    // Handle module registration
  }
  
  public onModuleUnregistered(moduleId: string): void {
    // Handle module unregistration
  }
}
```

## Module Information Requirements

### 1. Unique Module ID
Each module instance MUST have a unique ID:

```typescript
const moduleInfo: ModuleInfo = {
  id: 'unique-module-id', // Must be unique across all modules
  name: 'My Module',
  version: '1.0.0',
  description: 'A sample module',
  type: 'my-module-type'
};
```

### 2. Descriptive Module Type
Module types MUST be descriptive and follow naming conventions:

```typescript
// ✅ Correct Implementation
type: 'message-processor'
type: 'data-validator'
type: 'file-handler'

// ❌ Violation
type: 'mod'
type: '123'
```

## Registration Validation

### 1. Type Registration Check
Before creating a module instance, verify the type is registered:

```typescript
// ✅ Correct Implementation
const registry = ModuleRegistry.getInstance();
if (registry.getModuleType('my-module-type')) {
  const module = await registry.createModule(moduleInfo);
} else {
  throw new Error('Module type not registered');
}
```

### 2. Module ID Uniqueness
Ensure module IDs are unique before registration:

```typescript
// ✅ Correct Implementation
const registry = ModuleRegistry.getInstance();
if (!registry.getModule('my-module-id')) {
  const module = await registry.createModule(moduleInfo);
} else {
  throw new Error('Module with this ID already exists');
}
```

## Error Handling

### 1. Registration Errors
Handle registration errors appropriately:

```typescript
try {
  const module = await registry.createModule(moduleInfo);
} catch (error) {
  if (error.message.includes('not registered')) {
    console.error('Module type is not registered');
  } else {
    console.error('Module creation failed:', error.message);
  }
}
```

### 2. Initialization Errors
Handle initialization errors during module creation:

```typescript
try {
  const module = await registry.createModule(moduleInfo);
} catch (error) {
  console.error('Module initialization failed:', error.message);
  // Perform cleanup if necessary
}
```

## Best Practices

### 1. Early Registration
Register module types early in the application lifecycle:

```typescript
// Register all module types at application startup
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('message-processor', MessageProcessorModule);
registry.registerModuleType('data-validator', DataValidatorModule);
registry.registerModuleType('file-handler', FileHandlerModule);
```

### 2. Proper Cleanup
Ensure modules are properly cleaned up when no longer needed:

```typescript
// Remove module when it's no longer needed
await registry.removeModule('my-module-id');
```

### 3. Configuration Before Initialization
Configure modules before initialization:

```typescript
const module = await registry.createModule(moduleInfo);
module.configure(config); // Configure before any operations
```

## Testing Requirements

### 1. Registration Tests
Test module registration and creation:

```typescript
describe('Module Registration', () => {
  it('should register module type', () => {
    const registry = ModuleRegistry.getInstance();
    registry.registerModuleType('test-module', TestModule);
    expect(registry.getModuleType('test-module')).toBeDefined();
  });
  
  it('should create module instance', async () => {
    const registry = ModuleRegistry.getInstance();
    const moduleInfo: ModuleInfo = {
      id: 'test-module-1',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module',
      type: 'test-module'
    };
    
    const module = await registry.createModule(moduleInfo);
    expect(module).toBeDefined();
    expect(module.getInfo().id).toBe('test-module-1');
  });
});
```

### 2. Lifecycle Tests
Test module lifecycle methods:

```typescript
describe('Module Lifecycle', () => {
  it('should initialize properly', async () => {
    const module = await registry.createModule(moduleInfo);
    expect(module.isInitialized()).toBe(true);
  });
  
  it('should destroy properly', async () => {
    const module = await registry.createModule(moduleInfo);
    await module.destroy();
    expect(module.isInitialized()).toBe(false);
  });
});
```

## Common Violations and Corrections

### 1. Bypassing Registry
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

### 2. Missing Lifecycle Implementation
**Violation**: Missing required lifecycle methods
```typescript
// ❌ Wrong
export class MyModule extends BaseModule {
  // Missing initialize, destroy, and handshake methods
}
```

**Correction**: Implement all required lifecycle methods
```typescript
// ✅ Correct
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
    return baseResult;
  }
}
```

### 3. Improper Error Handling
**Violation**: Not handling registration errors
```typescript
// ❌ Wrong
const module = await registry.createModule(moduleInfo);
```

**Correction**: Proper error handling
```typescript
// ✅ Correct
try {
  const module = await registry.createModule(moduleInfo);
} catch (error) {
  console.error('Module creation failed:', error.message);
}
```

## Compliance Verification

### 1. Automated Checks
The framework includes automated checks to verify compliance:

```typescript
// Structure validation
const isValid = validateModuleStructure(modulePath);
if (!isValid) {
  throw new Error('Module structure validation failed');
}

// Registration validation
const registry = ModuleRegistry.getInstance();
if (!registry.isModuleTypeRegistered('my-module-type')) {
  throw new Error('Module type not registered');
}
```

### 2. Manual Verification
Perform manual verification of:
- Module type registration
- Module instance creation
- Proper lifecycle implementation
- Message handler implementation
- Error handling

By following these compliance requirements, modules will integrate properly with the RCC framework and ensure a consistent, reliable system.