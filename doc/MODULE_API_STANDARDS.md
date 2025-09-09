# Module API Standards

## Overview

Each module in the RCC framework should declare its public API interface in a standardized JSON format. All module API declarations are registered in a central registry at the project level.

## Standard Location

The module API registry is located at:
```
.claude/module-api-registry.json
```

## JSON Structure

The module API registry follows this structure:

```json
{
  "module_apis": {
    "ModuleName": {
      "module": {
        "name": "ModuleName",
        "description": "Brief description of the module",
        "version": "1.0.0",
        "basePath": "/api/modulename"
      },
      "endpoints": [
        {
          "name": "methodName",
          "description": "Brief description of what this method does",
          "method": "GET|POST|PUT|DELETE",
          "path": "/methodname",
          "parameters": [
            {
              "name": "parameterName",
              "type": "string",
              "description": "Description of the parameter"
            }
          ],
          "returnType": "void",
          "access": "public"
        }
      ]
    }
  }
}
```

## Fields Explanation

### Module Object
- `name`: The name of the module
- `description`: A brief description of the module's purpose
- `version`: The API version (semantic versioning)
- `basePath`: The base API path for this module

### Endpoint Objects
- `name`: The method name
- `description`: A brief description of what the method does
- `method`: The HTTP method that would be used if this were a REST API
- `path`: The endpoint path relative to the basePath
- `parameters`: Array of parameter objects
- `returnType`: The return type of the method
- `access`: Access level (public, protected, private)

### Parameter Objects
- `name`: The parameter name
- `type`: The parameter type (TypeScript type)
- `description`: A brief description of the parameter

## Benefits

1. **Clear Contracts**: Explicitly defined APIs make it clear what each module exposes
2. **Documentation**: Standardized format enables automated documentation generation
3. **Tooling**: Enables automated tooling for API validation and testing
4. **Consistency**: All modules follow the same API declaration pattern
5. **Versioning**: API versions can be tracked independently of implementation
6. **Centralized Management**: All module APIs are registered in one place

## Template

When adding a new module to the registry, use this structure as a template:

```json
"NewModule": {
  "module": {
    "name": "NewModule",
    "description": "Brief description of the module",
    "version": "1.0.0",
    "basePath": "/api/newmodule"
  },
  "endpoints": [
    {
      "name": "methodName",
      "description": "Brief description of what this method does",
      "method": "GET",
      "path": "/methodname",
      "parameters": [],
      "returnType": "void",
      "access": "public"
    }
  ]
}
```

## Examples

See the existing modules in the registry:
- `BaseModule`: Core base module functionality
- `ExampleModule`: Example implementation
- `DebugModule`: Debug and logging functionality

## Validation

Use the validation script to ensure the module API registry is correctly formatted:
```bash
npm run validate:api-registry
```