# Configuration Parser Enhancement Documentation

## Overview
This document provides documentation for the enhanced `ConfigParser` class features added to the RCC Configuration module.

## New Features

### Preprocessing Options Interface
The `PreprocessingOptions` interface allows fine-grained control over preprocessing behavior:

```typescript
interface PreprocessingOptions {
  /** Enable environment variable substitution */
  substituteEnvVars?: boolean;        // Default: true
  /** Enable template processing */
  processTemplates?: boolean;         // Default: true
  /** Enable data validation */
  validateData?: boolean;             // Default: true
  /** Target locale for translation */
  targetLocale?: string;              // Default: undefined
  /** Custom processor functions */
  customProcessors?: Function[];      // Default: []
  /** Enable caching */
  enableCaching?: boolean;            // Default: true
}
```

### New Public Methods

#### parseConfigFromFile(configPath: string, options?: PreprocessingOptions): Promise<ConfigData>
Reads and parses configuration directly from a file with optional preprocessing.

**Example Usage:**
```typescript
const parser = new ConfigParser();
await parser.initialize();

// Basic usage
const config = await parser.parseConfigFromFile('./config.json');

// With custom options
const config = await parser.parseConfigFromFile('./config.json', {
  substituteEnvVars: true,
  processTemplates: true,
  validateData: true
});
```

#### preprocessConfig(rawData: any, options?: PreprocessingOptions): Promise<any>
Applies preprocessing to raw configuration data without file reading.

**Example Usage:**
```typescript
const rawData = {
  endpoint: "${API_ENDPOINT}",
  models: {
    "default": {
      name: "{{MODEL_NAME}}"
    }
  }
};

const processedData = await parser.preprocessConfig(rawData, {
  substituteEnvVars: true,
  processTemplates: true
});
```

#### translateConfig(config: ConfigData, locale?: string): Promise<ConfigData>
Provides framework for configuration translation (placeholder implementation).

**Example Usage:**
```typescript
const config = await parser.parseConfigFromFile('./config.json');
const translatedConfig = await parser.translateConfig(config, 'zh-CN');
```

## Preprocessing Capabilities

### Environment Variable Substitution
Supports `${ENV_VAR}` syntax for replacing placeholders with environment variable values.

**Example:**
```json
{
  "providers": {
    "openai": {
      "endpoint": "${OPENAI_API_ENDPOINT}",
      "auth": {
        "keys": ["${OPENAI_API_KEY}"]
      }
    }
  }
}
```

### Template Processing
Supports `{{variable}}` syntax for simple template interpolation.

**Example:**
```json
{
  "models": {
    "default": {
      "name": "{{DEFAULT_MODEL_NAME}}",
      "contextLength": {{DEFAULT_CONTEXT_LENGTH}}
    }
  }
}
```

### Data Validation
Validates configuration structure including:
- Required fields verification
- Provider and model configuration validation
- Virtual model target validation
- Type checking for configuration values

## File Format Support
- JSON format (primary support)
- Extensible for additional formats

## Error Handling
The enhanced ConfigParser provides comprehensive error handling:
- Detailed file operation error messages
- Specific validation error reporting
- Graceful degradation when optional features fail
- Warning logs for non-critical issues

## Backward Compatibility
All existing functionality remains unchanged:
- `parseConfig(rawData: any)` method works as before
- No breaking changes to public API
- Existing configuration files continue to work
- All integration points remain functional

## Integration with ConfigurationModule
The enhanced ConfigParser can be used with the ConfigurationModule:

```typescript
const configModule = new ConfigurationModule();
await configModule.initialize();

// Use enhanced parsing with preprocessing
const config = await configModule.getConfigParser().parseConfigFromFile('./config.json');
```

## Performance Considerations
- Efficient recursive processing algorithms
- Minimal memory footprint
- Async/await pattern for non-blocking operations
- Proper resource cleanup in destroy method

## Future Enhancements
Planned improvements include:
- YAML format support
- Advanced template processing
- Full translation implementation
- Caching mechanisms
- Performance optimization for large configurations