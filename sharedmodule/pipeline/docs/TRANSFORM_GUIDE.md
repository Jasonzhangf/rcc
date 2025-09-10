# Transform Table Creation Guide

## Overview

Transform tables are configuration-driven mappings that enable protocol conversion and field transformation without requiring code changes. This guide explains how to create and manage transform tables for the RCC Pipeline system.

## Transform Table Concepts

### What are Transform Tables?

Transform tables define how data should be mapped between different protocols. They specify:
- **Field mappings**: Which fields correspond between protocols
- **Data transformations**: How to convert data types and values
- **Validation rules**: Constraints and requirements for fields
- **Error handling**: How to handle missing or invalid data

### Benefits of Transform Tables

- **Configuration-driven**: No code changes required for new mappings
- **Reusable**: Can be shared across different pipeline instances
- **Versionable**: Changes can be tracked and rolled back
- **Testable**: Mappings can be tested independently
- **Documentable**: Self-documenting configuration structure

## Transform Table Structure

### Basic Structure

```typescript
interface TransformTable {
  version: string;
  description: string;
  protocols: {
    input: SupportedProtocol;
    output: SupportedProtocol;
  };
  
  requestMappings: TransformMappings;
  responseMappings: TransformMappings;
  errorMappings?: TransformMappings;
  validation?: ValidationRules;
}
```

### Transform Mapping Types

Transform mappings support several types of field transformations:

#### 1. Simple Field Mapping

```typescript
{
  "model": "model"              // Direct field copy
}
```

#### 2. Nested Field Mapping

```typescript
{
  "user.id": "user_id",         // Extract nested field
  "config.timeout": "timeout"   // Map to nested field
}
```

#### 3. Function-based Transformation

```typescript
{
  "model": {
    field: "model",
    transform: (value: string) => {
      const mapping = {
        'claude-3-sonnet': 'claude-3-sonnet-20240229',
        'claude-3-opus': 'claude-3-opus-20240229'
      };
      return mapping[value] || value;
    }
  }
}
```

#### 4. Conditional Transformation

```typescript
{
  "max_tokens": {
    field: "max_tokens",
    condition: (value: number) => value > 0 && value <= 100000,
    defaultValue: 4096
  }
}
```

#### 5. Array Transformation

```typescript
{
  "messages": {
    field: "messages",
    transform: (messages: any[]) => {
      return messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    }
  }
}
```

## Creating Transform Tables

### Step 1: Define Protocol Information

Specify the source and target protocols:

```typescript
const anthropicToOpenAICodec: TransformTable = {
  version: '1.0.0',
  description: 'Anthropic to OpenAI protocol conversion for CodeC requests',
  protocols: {
    input: 'anthropic',
    output: 'openai'
  },
  // ... mappings
};
```

### Step 2: Define Request Mappings

Map how input requests should be transformed:

```typescript
requestMappings: {
  // Direct field mappings
  'model': 'model',
  'max_tokens': 'max_tokens',
  
  // Function-based value mapping
  'model': {
    field: 'model',
    transform: (value: string) => {
      const mapping = {
        'claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
        'claude-3-opus-20240229': 'claude-3-opus-20240229',
        'claude-3-haiku-20240307': 'claude-3-haiku-20240307'
      };
      return mapping[value] || value;
    }
  },
  
  // Array transformation
  'messages': {
    field: 'messages',
    transform: (messages: Message[]) => {
      return messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    }
  },
  
  // Conditional field with default
  'stop_sequences': {
    field: 'stop',
    condition: (value: string[]) => value && value.length > 0,
    defaultValue: null
  },
  
  // Field renaming and nesting
  'temperature': {
    field: 'temperature',
    transform: (value: number) => Math.max(0.0, Math.min(2.0, value))
  }
}
```

### Step 3: Define Response Mappings

Map how responses should be transformed back to the original protocol:

```typescript
responseMappings: {
  // Direct field mappings
  'content': 'content',
  'role': 'role',
  'model': 'model',
  
  // Nested field mappings
  'usage.prompt_tokens': 'usage.prompt_tokens',
  'usage.completion_tokens': 'usage.completion_tokens',
  
  // Array transformation for choices
  'choices': {
    field: 'content',
    transform: (choices: Choice[]) => {
      if (choices && choices.length > 0) {
        return choices[0].message.content;
      }
      return '';
    }
  },
  
  // Error response normalization
  'error': {
    field: 'error',
    transform: (error: any) => {
      return {
        type: error.type || 'api_error',
        message: error.message || 'Unknown error',
        code: error.code || 'unknown_error'
      };
    }
  }
}
```

### Step 4: Error Mappings (Optional)

Define how errors should be transformed:

```typescript
errorMappings: {
  // Map different error types
  'rate_limit_error': 'rate_limit_exceeded',
  'authentication_error': 'invalid_api_key',
  'not_found_error': 'model_not_found',
  
  // Field-specific error handling
  'invalid_model': {
    field: 'error',
    transform: (error: any) => ({
      type: 'invalid_model',
      message: `Invalid model: ${error.model}`,
      available_models: error.available_models || []
    })
  }
}
```

### Step 5: Validation Rules (Optional)

Define validation constraints for fields:

```typescript
validation: {
  // Required fields
  required: ['model', 'messages'],
  
  // Field type validation
  types: {
    'model': 'string',
    'max_tokens': 'number',
    'messages': 'array'
  },
  
  // Value constraints
  ranges: {
    'max_tokens': { min: 1, max: 200000 },
    'temperature': { min: 0.0, max: 2.0 }
  },
  
  // Custom validation functions
  custom: {
    'model': (value: string) => {
      const validModels = [
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
      ];
      return validModels.includes(value);
    }
  }
}
```

## Complete Transform Table Example

### Anthropic to OpenAI Complete Transform Table

```typescript
const anthropicToOpenAI: TransformTable = {
  version: '1.0.0',
  description: 'Complete Anthropic to OpenAI protocol conversion',
  protocols: {
    input: 'anthropic',
    output: 'openai'
  },
  
  requestMappings: {
    // Core field mappings
    'model': {
      field: 'model',
      transform: (value: string) => {
        const mapping = {
          'claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
          'claude-3-opus-20240229': 'claude-3-opus-20240229',
          'claude-3-haiku-20240307': 'claude-3-haiku-20240307'
        };
        return mapping[value] || value;
      }
    },
    'max_tokens': 'max_tokens',
    
    // Message transformation
    'messages': {
      field: 'messages',
      transform: (messages: Message[]) => {
        return messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));
      }
    },
    
    // Optional field mapping
    'temperature': {
      field: 'temperature',
      condition: (value: number) => value !== undefined && value !== null,
      defaultValue: 0.7
    },
    
    'top_p': {
      field: 'top_p',
      condition: (value: number) => value !== undefined && value !== null,
      defaultValue: 1.0
    },
    
    'stop_sequences': {
      field: 'stop',
      condition: (value: string[]) => value && value.length > 0,
      defaultValue: null
    },
    
    // Anthropic-specific to OpenAI mapping
    'stream': {
      field: 'stream',
      condition: (value: boolean) => value !== undefined,
      defaultValue: false
    }
  },
  
  responseMappings: {
    // Core response mapping
    'choices[0].message.content': 'content',
    'choices[0].message.role': 'role',
    'model': 'model',
    
    // Usage statistics
    'usage.prompt_tokens': 'usage.prompt_tokens',
    'usage.completion_tokens': 'usage.completion_tokens',
    'usage.total_tokens': 'usage.total_tokens',
    
    // Array field handling
    'choices': {
      field: 'choices',
      transform: (choices: Choice[]) => {
        return choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content
          },
          finish_reason: choice.finish_reason
        }));
      }
    },
    
    // Error response normalization
    'error': {
      field: 'error',
      transform: (error: any) => {
        return {
          type: error.type || 'api_error',
          message: error.message || 'Unknown error',
          code: error.code || 'unknown_error',
          param: error.param || null
        };
      }
    }
  },
  
  errorMappings: {
    'rate_limit_error': 'rate_limit_exceeded',
    'invalid_request_error': 'invalid_request',
    'authentication_error': 'authentication_failed',
    'not_found_error': 'model_not_found',
    'overloaded_error': 'service_unavailable'
  },
  
  validation: {
    required: ['model', 'messages'],
    types: {
      'model': 'string',
      'max_tokens': 'number',
      'messages': 'array',
      'temperature': 'number'
    },
    ranges: {
      'max_tokens': { min: 1, max: 200000 },
      'temperature': { min: 0.0, max: 2.0 },
      'top_p': { min: 0.0, max: 1.0 }
    },
    custom: {
      'model': (value: string) => {
        const validModels = [
          'claude-3-sonnet-20240229',
          'claude-3-opus-20240229',
          'claude-3-haiku-20240307'
        ];
        return validModels.includes(value);
      },
      'messages': (messages: any[]) => {
        return Array.isArray(messages) && messages.length > 0;
      }
    }
  }
};
```

## Advanced Transform Patterns

### 1. Conditional Field Mapping

```typescript
{
  'system_prompt': {
    field: 'messages',
    transform: (value: string, context: TransformContext) => {
      // Add system message as first message if present
      if (value && value.trim()) {
        return [
          { role: 'system', content: value },
          ...context.original.messages
        ];
      }
      return context.original.messages;
    }
  }
}
```

### 2. Multi-field Aggregation

```typescript
{
  'tools': {
    field: 'functions',
    transform: (tools: Tool[], context: TransformContext) => {
      // Convert tools format to functions format
      return tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }));
    }
  }
}
```

### 3. Validation and Default Values

```typescript
{
  'temperature': {
    field: 'temperature',
    transform: (value: number) => {
      // Clamp temperature to valid range
      return Math.max(0.0, Math.min(2.0, value));
    },
    defaultValue: 1.0,
    condition: (value: number) => typeof value === 'number'
  }
}
```

### 4. Array Index Mapping

```typescript
{
  'choices[0].message.content': 'content',
  'choices[0].finish_reason': 'finish_reason',
  'choices[0].index': 'index'
}
```

## Transform Context

Transform functions receive a context object with additional information:

```typescript
interface TransformContext {
  original: any;              // Original data object
  currentPath: string;         // Current field path
  protocol: string;            // Target protocol
  transformTable: TransformTable;
  metadata?: Record<string, any>;  // Additional metadata
}
```

### Example with Context Usage

```typescript
{
  'messages': {
    field: 'messages',
    transform: (messages: any[], context: TransformContext) => {
      // Access protocol information
      console.log(`Transforming to ${context.protocol}`);
      
      // Access original request data
      const hasSystemMessage = context.original.system_prompt;
      
      // Transform messages based on context
      return messages.map((msg, index) => ({
        role: msg.role,
        content: msg.content,
        // Add metadata if available
        metadata: {
          index,
          protocol: context.protocol,
          timestamp: Date.now()
        }
      }));
    }
  }
}
```

## TestingTransform Tables

### Unit Testing Transformations

```typescript
import { TransformExecutor } from '../src/transformers/TransformExecutor';

describe('Anthropic to OpenAI Transformations', () => {
  const transformTable = anthropicToOpenAI;
  const executor = new TransformExecutor(transformTable);
  
  test('should transform request correctly', () => {
    const input = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    };
    
    const result = executor.transformRequest(input);
    
    expect(result.model).toBe('claude-3-sonnet-20240229');
    expect(result.max_tokens).toBe(1000);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
  });
  
  test('should transform response correctly', () => {
    const input = {
      choices: [{
        message: {
          role: 'assistant',
          content: 'Hello there!'
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20
      }
    };
    
    const result = executor.transformResponse(input);
    
    expect(result.content).toBe('Hello there!');
    expect(result.role).toBe('assistant');
    expect(result.usage.prompt_tokens).toBe(10);
  });
  
  test('should apply validation', () => {
    const input = {
      // Missing required 'model' field
      max_tokens: 1000,
      messages: []
    };
    
    expect(() => {
      executor.validateRequest(input);
    }).toThrow('Required fields missing: model');
  });
});
```

## Best Practices

### 1. Naming Conventions

- Use descriptive names for transform tables
- Include protocol names in the identifier
- Use semantic versioning

```typescript
// Good
const anthropicToOpenAICodec_v1 = {
  version: '1.0.0',
  description: 'Anthropic to OpenAI for CodeC protocol v1'
};

// Avoid
const transform = {
  version: '1.0.0',
  description: 'Transform data'
};
```

### 2. Error Handling

- Provide meaningful error messages
- Include context information
- Handle edge cases gracefully

```typescript
{
  'model': {
    field: 'model',
    transform: (value: string) => {
      const mapping = { /* ... */ };
      const result = mapping[value];
      
      if (!result) {
        throw new Error(`Unknown model: ${value}. Valid models: ${Object.keys(mapping).join(', ')}`);
      }
      
      return result;
    }
  }
}
```

### 3. Performance Considerations

- Cache repeated transformations
- Avoid complex logic in hot paths
- Use simple transformations where possible

```typescript
// Cache-friendly
const modelMap = {
  'claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
  'claude-3-opus-20240229': 'claude-3-opus-20240229'
};

{
  'model': {
    field: 'model',
    transform: (value: string) => modelMap[value] || value
  }
}
```

### 4. Documentation

- Document all transformations
- Include examples in descriptions
- Note any special cases

```typescript
const transformTable = {
  version: '1.0.0',
  description: `
    Converts Anthropic Messages API format to OpenAI Chat Completions format.
    
    Special handling:
    - Model names are mapped to their OpenAI equivalents
    - Role names are standardized (user/assistant only)
    - Messages array is transformed to OpenAI format
    
    Example:
    Input: { model: 'claude-3-sonnet-20240229', messages: [{ role: 'user', content: 'Hello' }] }
    Output: { model: 'claude-3-sonnet-20240229', messages: [{ role: 'user', content: 'Hello' }] }
  `
  // ...
};
```

## Troubleshooting

### Common Issues

1. **Field Not Found**: Check field paths and nesting
2. **Type Errors**: Ensure proper type checking in transformations
3. **Missing Mappings**: Add validation rules to catch missing fields
4. **Infinite Loops**: Avoid circular references in transformations

### Debugging Tips

1. Use logging in transform functions
2. Test transformations incrementally
3. Validate both directions (request/response)
4. Use the TransformContext for debugging

```typescript
{
  'model': {
    field: 'model',
    transform: (value: string, context: TransformContext) => {
      console.log(`Transforming model: ${value} for ${context.protocol}`);
      // ... transformation logic
    }
  }
}
```

This guide provides comprehensive coverage of transform table creation, from basic mappings to advanced patterns. Transform tables are a powerful feature that enables flexible protocol conversion without code changes.