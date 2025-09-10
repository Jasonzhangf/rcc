# Pipeline Configuration Output Documentation

## Overview

This document provides detailed information about the pipeline configuration output files that can be used by other modules in the system. These configurations define how the pipeline system routes requests, processes data, and manages resources.

## Configuration Files

### 1. CompletePipelineConfigOutput.json

This file contains the complete pipeline assembly table configuration.

**Location**: `sharedmodule/pipeline/src/CompletePipelineConfigOutput.json`

**Key Sections**:

#### Metadata
- `version`: Configuration version (string)
- `createdAt`: Creation timestamp (ISO format)
- `updatedAt`: Last update timestamp (ISO format)
- `description`: Configuration description
- `author`: Configuration author

#### Routing Rules
Defines how incoming requests are routed to specific pipelines:
- `ruleId`: Unique identifier for the rule
- `name`: Human-readable rule name
- `priority`: Rule priority (lower numbers = higher priority)
- `conditions`: Array of conditions that must be met
- `pipelineSelection`: How to select the target pipeline

#### Pipeline Templates
Pre-defined pipeline configurations:
- `templateId`: Unique identifier
- `baseConfig`: Basic pipeline settings
- `moduleAssembly`: Module configuration and connections
- `executionStrategy`: How modules are executed

#### Module Registry
Available modules that can be used in pipelines:
- `moduleId`: Unique identifier
- `type`: Module type (protocol-adapter, model-selector, etc.)
- `capabilities`: What the module can do
- `configSchema`: Valid configuration options

### 2. CompleteSchedulerConfigOutput.json

This file contains the scheduler configuration for managing pipeline execution.

**Location**: `sharedmodule/pipeline/src/CompleteSchedulerConfigOutput.json`

**Key Sections**:

#### Load Balancing
- `strategy`: Load balancing algorithm (weighted, roundrobin, etc.)
- `strategyConfig`: Strategy-specific configuration
- `failover`: How to handle failures

#### Health Check
- `strategy`: Health check approach (active, passive, hybrid)
- `intervals`: How often to perform checks
- `thresholds`: What constitutes healthy/unhealthy

#### Error Handling
- `strategies`: Different approaches for different error types
- `blacklist`: How to handle problematic instances
- `reporting`: Error reporting configuration

#### Performance
- `concurrency`: Concurrency settings
- `timeouts`: Various timeout values
- `caching`: Caching configuration
- `rateLimiting`: Request rate limiting

#### Monitoring
- `metrics`: What to measure and how
- `logging`: Logging configuration
- `tracing`: Request tracing settings
- `alerts`: Alerting configuration

#### Security
- `authentication`: How to authenticate requests
- `authorization`: Access control configuration
- `encryption`: Data encryption settings

## Usage in Other Modules

### Importing Configuration

To use these configurations in other modules:

```typescript
// Using the TypeScript export
import { COMPLETE_ASSEMBLY_TABLE_CONFIG, COMPLETE_SCHEDULER_CONFIG } from '../sharedmodule/pipeline/src/CompletePipelineConfig';

// Or reading the JSON directly
import assemblyConfig from '../sharedmodule/pipeline/src/CompletePipelineConfigOutput.json';
import schedulerConfig from '../sharedmodule/pipeline/src/CompleteSchedulerConfigOutput.json';
```

### Accessing Configuration Data

#### Get Pipeline Templates
```typescript
const chatTemplate = COMPLETE_ASSEMBLY_TABLE_CONFIG.pipelineTemplates.find(
  template => template.templateId === 'llm-chat-primary'
);
```

#### Get Routing Rules
```typescript
const chatRoutingRule = COMPLETE_ASSEMBLY_TABLE_CONFIG.routingRules.find(
  rule => rule.ruleId === 'llm-chat-routing'
);
```

#### Get Module Information
```typescript
const switchModule = COMPLETE_ASSEMBLY_TABLE_CONFIG.moduleRegistry.find(
  module => module.moduleId === 'llm-switch-module'
);
```

#### Get Load Balancing Weights
```typescript
const weights = COMPLETE_SCHEDULER_CONFIG.loadBalancing.strategyConfig?.weighted?.weights;
```

## Configuration Validation

A validation report is also provided to ensure configuration correctness:

### ConfigurationValidationReport.json

**Location**: `sharedmodule/pipeline/src/ConfigurationValidationReport.json`

**Contents**:
- Validation results for assembly table
- Validation results for scheduler configuration
- Cross-reference validation
- Summary with overall validity status

## Best Practices for Using These Configurations

1. **Always check validation results** before using configurations in production
2. **Cache configurations** rather than reading from files repeatedly
3. **Use type-safe access** through the TypeScript exports when possible
4. **Handle missing configurations** gracefully with defaults
5. **Monitor for configuration changes** in long-running applications

## Extending Configurations

If you need to extend these configurations for your module:

1. Create a new configuration file that imports the base configuration
2. Add your module-specific settings
3. Validate the extended configuration
4. Export for use by other modules

Example:
```typescript
import baseConfig from './CompletePipelineConfig';

export const myModuleConfig = {
  ...baseConfig,
  myCustomSettings: {
    // Your module-specific configuration
  }
};
```

## Updating Configurations

When updating configurations:

1. Ensure all required fields are present
2. Validate weights sum to 100 for weighted strategies
3. Check that referenced pipeline IDs exist
4. Update timestamps in metadata
5. Validate with the configuration validator
6. Update the validation report

## Support

For questions about these configurations, contact the Pipeline System team or check the main documentation in `COMPLETE_PIPELINE_CONFIG_REQUIREMENTS.md`.