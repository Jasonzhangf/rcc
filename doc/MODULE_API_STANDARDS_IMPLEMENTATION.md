# Module API Standards Implementation Guide

## Overview

This document explains how to implement and use the module API standards in your RCC modules. All module APIs are registered in a central registry rather than individual module directories.

## 1. Module API Registry

All module APIs are registered in a single file at:
```
.claude/module-api-registry.json
```

## 2. Adding a New Module to the Registry

When creating a new module, add its API declaration to the registry:

### Structure
```json
{
  "module_apis": {
    "YourModule": {
      "module": {
        "name": "YourModule",
        "description": "Brief description of your module",
        "version": "1.0.0",
        "basePath": "/api/yourmodule"
      },
      "endpoints": [
        {
          "name": "doSomething",
          "description": "Performs a specific action",
          "method": "POST",
          "path": "/something",
          "parameters": [
            {
              "name": "input",
              "type": "string",
              "description": "Input parameter"
            }
          ],
          "returnType": "Promise<string>",
          "access": "public"
        }
      ]
    }
  }
}
```

## 3. Example Implementation

Here's how to implement a module that follows the API standards:

### Module Structure
```
src/modules/YourModule/
├── src/
│   └── YourModule.ts
├── __test__/
│   └── YourModule.test.ts
└── README.md
```

### Implementation
```typescript
import { BaseModule } from '../../core/BaseModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

export class YourModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  /**
   * Performs a specific action
   * @param input - Input parameter
   * @returns Result of the action
   */
  public async doSomething(input: string): Promise<string> {
    // Implementation here
    return `Processed: ${input}`;
  }
}
```

### API Registration
Add the module to `.claude/module-api-registry.json`:
```json
{
  "module_apis": {
    "YourModule": {
      "module": {
        "name": "YourModule",
        "description": "Your custom module that does something",
        "version": "1.0.0",
        "basePath": "/api/yourmodule"
      },
      "endpoints": [
        {
          "name": "doSomething",
          "description": "Performs a specific action",
          "method": "POST",
          "path": "/something",
          "parameters": [
            {
              "name": "input",
              "type": "string",
              "description": "Input parameter to process"
            }
          ],
          "returnType": "Promise<string>",
          "access": "public"
        }
      ]
    }
  }
}
```

## 4. Benefits of Centralized API Registry

### Single Source of Truth
All module APIs are documented in one place, making it easy to discover and understand the system.

### Consistent Management
Centralized registry ensures consistent API documentation across all modules.

### Easy Validation
Single validation script can check all module APIs at once.

### Tool Integration
Enables tooling that can work with the entire system's APIs.

## 5. Validation

Use the validation script to ensure your module API registry is correctly formatted:
```bash
npm run validate:api-registry
```

Or directly:
```bash
node scripts/validate-module-api-registry.js
```

## 6. Best Practices

1. **Keep descriptions clear and concise**
2. **Use semantic versioning for API changes**
3. **Document all public methods**
4. **Update the registry when implementation changes**
5. **Validate the registry regularly**
6. **Follow the existing patterns in the registry**
7. **Use consistent naming conventions**
8. **Include meaningful examples in descriptions**

## 7. Registry Maintenance

### Adding New Modules
1. Implement the module following BaseModule patterns
2. Add the module's API to the registry
3. Validate the registry
4. Update documentation if needed

### Updating Existing Modules
1. Modify the module implementation
2. Update the API declaration in the registry
3. Validate the registry
4. Ensure backward compatibility when possible

### Removing Modules
1. Remove the module implementation
2. Remove the module's API from the registry
3. Validate the registry
4. Update dependent modules if needed