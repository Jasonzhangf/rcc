# BaseModule Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the legacy `BaseModule` to the new refactored architecture. The migration is designed to be zero-impact with full backward compatibility.

## Quick Start

### For New Modules
Use the new `RefactoredBaseModule` directly:

```typescript
import { RefactoredBaseModule } from './core/RefactoredBaseModule';

class MyNewModule extends RefactoredBaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    // Your initialization code
  }
}
```

### For Existing Modules
Change the import and extend class:

```typescript
// Before
import { BaseModule } from './BaseModule';

class MyExistingModule extends BaseModule {
  // ... existing code
}

// After
import { RefactoredBaseModule } from './core/RefactoredBaseModule';

class MyExistingModule extends RefactoredBaseModule {
  // ... existing code (no changes needed)
}
```

## Detailed Migration Steps

### Step 1: Update Imports

```typescript
// Legacy import
import { BaseModule } from './BaseModule';

// New import
import { RefactoredBaseModule } from './core/RefactoredBaseModule';
```

### Step 2: Update Class Extension

```typescript
// Legacy
export class MyModule extends BaseModule {

// New
export class MyModule extends RefactoredBaseModule {
```

### Step 3: Verify Method Compatibility

All existing methods are fully compatible. Check for:

1. **Constructor calls** - No changes needed
2. **Method overrides** - No changes needed
3. **Method calls** - No changes needed

### Step 4: Test Your Module

Run your existing tests to ensure compatibility:

```bash
# Run existing tests
npm test

# Run specific module tests
npm test -- --grep "MyModule"
```

## Migration Scenarios

### Scenario 1: Simple Module
```typescript
// Before
class SimpleModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.logInfo('Simple module initialized');
  }
}

// After
class SimpleModule extends RefactoredBaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.logInfo('Simple module initialized'); // Same method call
  }
}
```

### Scenario 2: Module with Custom Connections
```typescript
// Before
class ConnectedModule extends BaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    this.addOutputConnection({
      id: 'output-1',
      type: 'output',
      targetModuleId: 'next-module'
    });
  }

  async processData(data: any): Promise<void> {
    await this.transferData(data);
  }
}

// After
class ConnectedModule extends RefactoredBaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    this.addOutputConnection({ // Same method call
      id: 'output-1',
      type: 'output',
      targetModuleId: 'next-module'
    });
  }

  async processData(data: any): Promise<void> {
    await this.transferData(data); // Same method call
  }
}
```

### Scenario 3: Module with Validation
```typescript
// Before
class ValidatingModule extends BaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    // Validation rules were handled internally
    // Now they're explicitly managed
  }

  protected validateInput(data: any): ValidationResult {
    // Custom validation logic
    return { isValid: true, errors: [], data };
  }
}

// After
class ValidatingModule extends RefactoredBaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    // Explicit validation rule management
    this.addValidationRule({
      field: 'requiredField',
      type: 'required',
      message: 'Required field is missing'
    });
  }

  protected validateInput(data: any): ValidationResult {
    // Use the validation manager
    const result = super.validateInput(data);

    // Add custom validation if needed
    if (data.customField && typeof data.customField !== 'string') {
      result.errors.push('Custom field must be a string');
      result.isValid = false;
    }

    return result;
  }
}
```

### Scenario 4: Module with Complex Debugging
```typescript
// Before
class DebugModule extends BaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    // Debug configuration was handled internally
    this.setDebugConfig({
      enabled: true,
      level: 'trace'
    });
  }

  async processData(data: any): Promise<void> {
    this.startIOTracking('process-data', data, 'processData');

    try {
      // Process data
      const result = await this.processInternal(data);
      this.endIOTracking('process-data', result);
    } catch (error) {
      this.endIOTracking('process-data', null, false, error.message);
      throw error;
    }
  }
}

// After
class DebugModule extends RefactoredBaseModule {
  async initialize(): Promise<void> {
    await super.initialize();

    // Debug configuration - same API
    this.setDebugConfig({
      enabled: true,
      level: 'trace'
    });
  }

  async processData(data: any): Promise<void> {
    this.startIOTracking('process-data', data, 'processData'); // Same method call

    try {
      // Process data
      const result = await this.processInternal(data);
      this.endIOTracking('process-data', result); // Same method call
    } catch (error) {
      this.endIOTracking('process-data', null, false, error.message); // Same method call
      throw error;
    }
  }
}
```

## Advanced Migration Options

### Option 1: Component-Based Architecture
For maximum flexibility, use individual components:

```typescript
import {
  BaseModuleCore,
  ConnectionManager,
  DebugLogger,
  MessageHandler,
  ValidationManager
} from './core';

class CustomModule extends BaseModuleCore {
  private connectionManager: ConnectionManager;
  private debugLogger: DebugLogger;
  private messageHandler: MessageHandler;
  private validationManager: ValidationManager;

  constructor(info: ModuleInfo) {
    super(info);

    // Only use components you need
    this.connectionManager = new ConnectionManager(info.id);
    this.debugLogger = new DebugLogger(info.id, info.name, info.version);
    this.messageHandler = new MessageHandler(info.id, this.debugLogger.debug.bind(this.debugLogger));
    this.validationManager = new ValidationManager(info.id, this.debugLogger.debug.bind(this.debugLogger));
  }

  // Custom implementation using only specific components
  async sendMessage(type: string, payload: any, target?: string): Promise<void> {
    await this.messageHandler.sendMessage(type, payload, target);
  }

  async validate(data: any): Promise<ValidationResult> {
    return this.validationManager.validateInput(data);
  }
}
```

### Option 2: Hybrid Approach
Mix legacy and new components during transition:

```typescript
import { BaseModule } from './BaseModule';
import { DebugLogger } from './core/DebugLogger';

class HybridModule extends BaseModule {
  private debugLogger: DebugLogger;

  constructor(info: ModuleInfo) {
    super(info);
    this.debugLogger = new DebugLogger(info.id, info.name, info.version);
  }

  // Use new debug logger while keeping other legacy functionality
  protected logInfo(message: string, data?: any, method?: string): void {
    this.debugLogger.logInfo(message, data, method);
  }

  // Keep other legacy methods
  protected log(message: string, data?: any, method?: string): void {
    super.log(message, data, method); // Legacy method
  }
}
```

## Testing Migration

### Unit Tests
Existing unit tests should work without changes:

```typescript
// Test code - no changes needed
const module = new MyModule(moduleInfo);
await module.initialize();

expect(module.getInfo()).toEqual(moduleInfo);
expect(module.isInitialized()).toBe(true);
```

### Integration Tests
Verify component interactions:

```typescript
// Test component interaction
const module = new RefactoredBaseModule(moduleInfo);
await module.initialize();

// Test that components work together
module.setDebugConfig({ enabled: false });
expect(module.getDebugConfig().enabled).toBe(false);

module.addValidationRule({
  field: 'test',
  type: 'required',
  message: 'Test field is required'
});

const result = module.validateInput({});
expect(result.isValid).toBe(false);
```

### Performance Tests
Verify performance characteristics:

```typescript
// Performance testing
const iterations = 1000;
const start = Date.now();

for (let i = 0; i < iterations; i++) {
  const module = new RefactoredBaseModule(moduleInfo);
  await module.initialize();
  await module.destroy();
}

const duration = Date.now() - start;
console.log(`Average time per iteration: ${duration / iterations}ms`);
```

## Troubleshooting

### Common Issues

#### Issue 1: Import Errors
```typescript
// Error: Cannot find module './core/RefactoredBaseModule'
// Solution: Check file paths and build configuration
import { RefactoredBaseModule } from './core/RefactoredBaseModule';
```

#### Issue 2: Method Not Found
```typescript
// Error: this.methodName is not a function
// Solution: Verify method exists in both legacy and new versions
// All BaseModule methods should be available in RefactoredBaseModule
```

#### Issue 3: TypeScript Errors
```typescript
// Error: Type 'RefactoredBaseModule' is not assignable to type 'BaseModule'
// Solution: Use type assertion or update type definitions
const module = new MyModule(info) as BaseModule;
```

### Debug Mode
Enable detailed logging to track migration issues:

```typescript
const module = new RefactoredBaseModule(moduleInfo);
module.setDebugConfig({
  enabled: true,
  level: 'trace',
  consoleOutput: true
});

await module.initialize();
```

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Revert to `BaseModule`
   ```typescript
   // Change back
   import { BaseModule } from './BaseModule';
   class MyModule extends BaseModule { ... }
   ```

2. **Partial Rollback**: Use specific components
   ```typescript
   // Use only the components that work
   import { DebugLogger } from './core/DebugLogger';

   class MyModule extends BaseModule {
     private debugLogger = new DebugLogger(this.info.id, this.info.name, this.info.version);
   }
   ```

3. **Gradual Migration**: Migrate one method at a time
   ```typescript
   class MyModule extends BaseModule {
     async initialize(): Promise<void> {
       // Use new debug logging
       this.debugLogger.logInfo('Initializing');

       // Keep other legacy functionality
       await super.initialize();
     }
   }
   ```

## Best Practices

### During Migration
1. **Test Early**: Run tests after each change
2. **Monitor Performance**: Compare before/after performance
3. **Document Changes**: Keep track of what was changed
4. **Communicate**: Inform team members about migration progress

### Post-Migration
1. **Cleanup**: Remove unused legacy code
2. **Optimize**: Take advantage of new architecture
3. **Documentation**: Update internal documentation
4. **Training**: Train team on new architecture

## Conclusion

The migration to the refactored BaseModule architecture is designed to be:

- **Zero Impact**: No breaking changes to existing code
- **Incremental**: Can be done module by module
- **Reversible**: Easy to roll back if issues arise
- **Beneficial**: Immediate improvements in maintainability

The key is to test thoroughly and migrate at a comfortable pace while taking advantage of the new architecture's benefits.

## Support

If you encounter issues during migration:

1. Check this guide for common solutions
2. Review the refactoring documentation
3. Test with the migration test suite
4. Contact the development team for assistance

Remember: The goal is to improve code quality without disrupting existing functionality.