# Configuration System Module API Documentation

## Overview

The Configuration System Module provides a comprehensive, BaseModule-based configuration management solution for the RCC framework. It consists of 5 interconnected modules that handle configuration loading, validation, persistence, web interface, and status line management.

## Module Architecture

```
ConfigLoaderModule → ConfigValidatorModule → ConfigPersistenceModule
                                    ↓
StatusLineModule ← ConfigUIModule ←┘
```

## API Base Paths

| Module | Base Path |
|--------|-----------|
| ConfigLoaderModule | `/api/configuration/loader` |
| ConfigValidatorModule | `/api/configuration/validator` |
| ConfigPersistenceModule | `/api/configuration/persistence` |
| ConfigUIModule | `/api/configuration/ui` |
| StatusLineModule | `/api/configuration/statusline` |

---

## ConfigLoaderModule API

**Base Path**: `/api/configuration/loader`  
**Description**: Configuration file loading, JSON5 parsing, and environment variable interpolation

### Endpoints

#### POST /load
**Description**: Loads configuration data from a file with JSON5 parsing and environment variable interpolation

**Parameters**:
- `filePath` (string, required): Path to the configuration file
- `options` (ConfigLoadOptions, optional): Load options including watch settings and validation level

**Returns**: `Promise<ConfigurationData>`

**Example**:
```typescript
const result = await configLoader.loadFromFile('/path/to/config.json5', {
  watchForChanges: true,
  validationLevel: 'comprehensive'
});
```

#### POST /watch
**Description**: Watch a configuration file for changes with automatic reload

**Parameters**:
- `filePath` (string, required): Path to the configuration file to watch
- `callback` (FileChangeCallback, required): Callback function to invoke on file changes

**Returns**: `void`

**Example**:
```typescript
configLoader.watchFile('/path/to/config.json5', (event) => {
  console.log(`File ${event.type}: ${event.filePath}`);
});
```

#### POST /interpolate
**Description**: Process environment variable interpolation in configuration data

**Parameters**:
- `config` (any, required): Configuration object to process
- `options` (EnvironmentInterpolationOptions, optional): Interpolation options

**Returns**: `Promise<any>`

**Example**:
```typescript
const interpolated = await configLoader.interpolateEnvironmentVariables({
  database: {
    host: "${DB_HOST}",
    port: "${DB_PORT}"
  }
});
```

#### POST /merge
**Description**: Merge multiple configuration objects using specified strategy

**Parameters**:
- `configs` (ConfigurationData[], required): Array of configuration objects to merge
- `options` (ConfigMergeOptions, optional): Merge strategy and options

**Returns**: `Promise<ConfigurationData>`

**Example**:
```typescript
const merged = await configLoader.mergeConfigurations([config1, config2], {
  strategy: MergeStrategy.MERGE_DEEP,
  conflictResolution: 'last-wins'
});
```

---

## ConfigValidatorModule API

**Base Path**: `/api/configuration/validator`  
**Description**: Multi-layer configuration validation with schema enforcement and custom validation rules

### Endpoints

#### POST /validate/complete
**Description**: Perform complete multi-layer validation of configuration data

**Parameters**:
- `config` (any, required): Configuration data to validate
- `options` (ValidationOptions, optional): Validation options and level

**Returns**: `Promise<ValidationResult>`

**Example**:
```typescript
const result = await configValidator.validateComplete(configData, {
  level: ValidationLevel.COMPREHENSIVE,
  stopOnFirstError: false
});
```

#### POST /validate/section
**Description**: Validate a specific section of configuration data

**Parameters**:
- `section` (string, required): Configuration section name
- `data` (any, required): Section data to validate

**Returns**: `Promise<ValidationResult>`

**Example**:
```typescript
const result = await configValidator.validateSection('providers', providersConfig);
```

#### POST /schemas
**Description**: Register a new configuration schema for validation

**Parameters**:
- `name` (string, required): Schema name identifier
- `schema` (ConfigSchema, required): Schema definition object

**Returns**: `void`

**Example**:
```typescript
configValidator.registerSchema('providerSchema', {
  name: 'Provider Configuration Schema',
  version: '1.0.0',
  properties: {
    name: { type: SchemaPropertyType.STRING, required: true },
    apiKey: { type: SchemaPropertyType.STRING, required: true }
  }
});
```

#### POST /validate/schema
**Description**: Validate configuration data against a specific registered schema

**Parameters**:
- `config` (any, required): Configuration data to validate
- `schemaName` (string, required): Name of registered schema to validate against

**Returns**: `Promise<ValidationResult>`

**Example**:
```typescript
const result = await configValidator.validateAgainstSchema(
  providerConfig, 
  'providerSchema'
);
```

---

## ConfigPersistenceModule API

**Base Path**: `/api/configuration/persistence`  
**Description**: Atomic configuration persistence with backup management and rollback capabilities

### Endpoints

#### POST /save
**Description**: Atomically save configuration data with backup creation

**Parameters**:
- `config` (ConfigurationData, required): Configuration data to save
- `options` (SaveOptions, optional): Save options including backup settings

**Returns**: `Promise<boolean>`

**Example**:
```typescript
const success = await configPersistence.saveConfiguration(configData, {
  createBackup: true,
  validateBeforeSave: true,
  atomicWrite: true
});
```

#### POST /backup
**Description**: Create a backup of current configuration

**Parameters**:
- `config` (ConfigurationData, required): Configuration data to backup
- `metadata` (Record<string, any>, optional): Backup metadata

**Returns**: `Promise<string>` (backup ID)

**Example**:
```typescript
const backupId = await configPersistence.createBackup(configData, {
  description: 'Pre-migration backup',
  tag: 'v1.0.0'
});
```

#### POST /restore
**Description**: Restore configuration from a specific backup

**Parameters**:
- `backupId` (string, required): Backup identifier to restore from

**Returns**: `Promise<ConfigurationData>`

**Example**:
```typescript
const restored = await configPersistence.restoreFromBackup('backup_20231201_123456');
```

#### GET /backups
**Description**: List all available configuration backups

**Parameters**: None

**Returns**: `Promise<BackupInfo[]>`

**Example**:
```typescript
const backups = await configPersistence.listBackups();
backups.forEach(backup => {
  console.log(`${backup.id}: ${backup.description} (${backup.timestamp})`);
});
```

#### POST /export
**Description**: Export configuration in specified format

**Parameters**:
- `config` (ConfigurationData, required): Configuration data to export
- `format` (ExportFormat, required): Export format (JSON, YAML, TOML, etc.)

**Returns**: `Promise<string>`

**Example**:
```typescript
const yamlConfig = await configPersistence.exportConfiguration(
  configData, 
  ExportFormat.YAML
);
```

---

## ConfigUIModule API

**Base Path**: `/api/configuration/ui`  
**Description**: Web-based configuration management interface with real-time updates

### Endpoints

#### POST /server/start
**Description**: Start the embedded web server for configuration UI

**Parameters**:
- `port` (number, optional): Port number for web server (default: 3000)

**Returns**: `Promise<void>`

**Example**:
```typescript
await configUI.startWebServer(8080);
```

#### POST /server/stop
**Description**: Stop the embedded web server

**Parameters**: None

**Returns**: `Promise<void>`

**Example**:
```typescript
await configUI.stopWebServer();
```

#### POST /request
**Description**: Process configuration requests from web UI

**Parameters**:
- `request` (UIConfigurationRequest, required): UI configuration request object

**Returns**: `Promise<UIConfigurationResponse>`

**Example**:
```typescript
const response = await configUI.handleConfigurationRequest({
  action: UIAction.UPDATE,
  section: 'providers',
  data: newProviderConfig,
  sessionId: 'session_123'
});
```

#### POST /broadcast
**Description**: Broadcast configuration changes to all connected clients

**Parameters**:
- `update` (ConfigurationData, required): Updated configuration data

**Returns**: `Promise<void>`

**Example**:
```typescript
await configUI.broadcastConfigurationUpdate(updatedConfig);
```

#### POST /browser/open
**Description**: Open web browser to configuration UI

**Parameters**:
- `url` (string, optional): Custom URL to open

**Returns**: `Promise<void>`

**Example**:
```typescript
await configUI.openBrowser('http://localhost:3000/configuration');
```

#### POST /theme
**Description**: Set UI theme configuration

**Parameters**:
- `theme` (UITheme, required): UI theme configuration

**Returns**: `void`

**Example**:
```typescript
configUI.setUITheme({
  name: 'dark',
  colors: {
    primary: '#007acc',
    background: '#1e1e1e'
  }
});
```

---

## StatusLineModule API

**Base Path**: `/api/configuration/statusline`  
**Description**: Status line configuration and theme management with real-time preview

### Endpoints

#### POST /theme
**Description**: Set status line theme configuration

**Parameters**:
- `theme` (StatusLineTheme, required): Status line theme configuration

**Returns**: `Promise<void>`

**Example**:
```typescript
await statusLine.setTheme({
  name: 'powerline',
  colors: {
    background: '#005f87',
    foreground: '#ffffff'
  },
  separators: {
    left: '',
    right: ''
  }
});
```

#### POST /config
**Description**: Update status line configuration with validation

**Parameters**:
- `config` (StatusLineConfig, required): Status line configuration

**Returns**: `Promise<ValidationResult>`

**Example**:
```typescript
const result = await statusLine.updateConfiguration({
  position: 'bottom',
  height: 24,
  components: ['mode', 'file', 'position', 'encoding']
});
```

#### GET /preview
**Description**: Generate real-time preview of status line configuration

**Parameters**:
- `config` (StatusLineConfig, optional): Configuration to preview

**Returns**: `Promise<StatusLinePreview>`

**Example**:
```typescript
const preview = await statusLine.getPreview(customConfig);
console.log(preview.html); // Generated HTML
console.log(preview.css);  // Generated CSS
```

#### POST /export
**Description**: Export status line theme in specified format

**Parameters**:
- `theme` (StatusLineTheme, required): Theme to export
- `format` (ExportFormat, required): Export format (JSON, YAML, CSS)

**Returns**: `Promise<string>`

**Example**:
```typescript
const cssTheme = await statusLine.exportTheme(theme, ExportFormat.CSS);
```

#### POST /import
**Description**: Import status line theme from file or data

**Parameters**:
- `data` (string, required): Theme data to import
- `format` (ImportFormat, required): Data format (JSON, YAML, CSS)

**Returns**: `Promise<StatusLineTheme>`

**Example**:
```typescript
const theme = await statusLine.importTheme(themeData, ImportFormat.JSON);
```

---

## Common Data Types

### ConfigurationData
```typescript
interface ConfigurationData {
  raw: any;                    // Original file content
  parsed: any;                 // Parsed JSON5 data
  validated: boolean;          // Validation status
  errors?: ValidationError[];  // Validation errors
  warnings?: string[];         // Warning messages
  metadata: ConfigMetadata;    // Configuration metadata
}
```

### ValidationResult
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}
```

### ConfigLoadOptions
```typescript
interface ConfigLoadOptions {
  watchForChanges?: boolean;
  environmentOverrides?: Record<string, string>;
  validationLevel?: 'basic' | 'strict' | 'comprehensive';
  encoding?: BufferEncoding;
  timeout?: number;
}
```

### UIConfigurationRequest
```typescript
interface UIConfigurationRequest {
  action: UIAction;
  section?: string;
  data?: any;
  sessionId: string;
  timestamp: number;
  options?: UIRequestOptions;
}
```

### StatusLineTheme
```typescript
interface StatusLineTheme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent?: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
  };
  separators?: {
    left: string;
    right: string;
  };
}
```

## Error Handling

All API endpoints return standardized error responses:

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}
```

Common error codes:
- `CONFIG_NOT_FOUND`: Configuration file not found
- `PARSE_ERROR`: JSON5 parsing failed
- `VALIDATION_FAILED`: Configuration validation failed
- `SAVE_FAILED`: Configuration save operation failed
- `MODULE_NOT_INITIALIZED`: Module not properly initialized

## Authentication and Security

- All API endpoints require valid session authentication
- Input validation is performed on all parameters
- File system access is restricted to configured directories
- Environment variable access follows security policies
- WebSocket connections use secure protocols

## Performance Considerations

- Configuration loading supports caching with configurable TTL
- Validation results are cached to improve performance
- File watching uses efficient debouncing to prevent excessive updates
- WebSocket connections are pooled for optimal resource usage
- Large configuration files are processed asynchronously

## Integration Examples

### Complete Configuration Workflow
```typescript
// 1. Load configuration
const configData = await configLoader.loadFromFile('/path/to/config.json5');

// 2. Validate configuration
const validationResult = await configValidator.validateComplete(configData.parsed);

if (validationResult.isValid) {
  // 3. Save validated configuration
  await configPersistence.saveConfiguration(configData);
  
  // 4. Update UI
  await configUI.broadcastConfigurationUpdate(configData);
  
  // 5. Update status line
  await statusLine.updateConfiguration(configData.parsed.statusLine);
} else {
  console.error('Validation failed:', validationResult.errors);
}
```

### Real-time Configuration Updates
```typescript
// Watch for file changes
configLoader.watchFile('/path/to/config.json5', async (event) => {
  if (event.type === 'modified') {
    const newConfig = await configLoader.loadFromFile(event.filePath);
    const validation = await configValidator.validateComplete(newConfig.parsed);
    
    if (validation.isValid) {
      await configUI.broadcastConfigurationUpdate(newConfig);
    }
  }
});
```

This comprehensive API documentation provides all the information needed to integrate with and use the Configuration System Module effectively within the RCC framework.