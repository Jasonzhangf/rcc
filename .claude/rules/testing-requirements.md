# RCC Testing Requirements for Module Publishing

## Overview

This document defines comprehensive testing requirements for RCC module publishing, ensuring each module meets quality standards for independent npm publication.

## Testing Architecture

### Testing Pyramid for RCC Modules
```
                    ┌─────────────────┐
                    │   E2E Tests     │  ←── Consumer Integration
                    │   (10% of tests)│
                ┌───┴─────────────────┴───┐
                │   Integration Tests     │  ←── Module Interactions
                │   (30% of tests)       │
            ┌───┴─────────────────────────┴───┐
            │      Unit Tests                 │  ←── Individual Functions
            │      (60% of tests)            │
        ┌───┴─────────────────────────────────┴───┐
        │         Static Analysis                 │  ←── Code Quality
        │         (Linting, Type Checking)       │
        └─────────────────────────────────────────┘
```

## Module-Specific Testing Requirements

### 1. ConfigManager Testing Requirements

#### Unit Tests (Target: 100% Coverage)
```typescript
describe('ConfigManager Unit Tests', () => {
  describe('loadConfig', () => {
    test('should load valid configuration file', async () => {
      // Test implementation
    });
    
    test('should handle missing configuration file', async () => {
      // Test implementation
    });
    
    test('should validate configuration schema', async () => {
      // Test implementation
    });
    
    test('should handle corrupted JSON files', async () => {
      // Test implementation
    });
  });
  
  describe('saveConfig', () => {
    test('should save configuration with proper formatting', async () => {
      // Test implementation
    });
    
    test('should create backup before saving', async () => {
      // Test implementation
    });
    
    test('should handle filesystem permission errors', async () => {
      // Test implementation
    });
  });
  
  describe('createBackup', () => {
    test('should create timestamped backup file', async () => {
      // Test implementation
    });
    
    test('should maintain backup history', async () => {
      // Test implementation
    });
    
    test('should cleanup old backups', async () => {
      // Test implementation
    });
  });
  
  describe('validateConfig', () => {
    test('should validate complete configuration structure', () => {
      // Test implementation
    });
    
    test('should identify missing required fields', () => {
      // Test implementation
    });
    
    test('should validate data types', () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests
```typescript
describe('ConfigManager Integration Tests', () => {
  test('should integrate with file system operations', async () => {
    // Test real file system operations
  });
  
  test('should handle concurrent access scenarios', async () => {
    // Test multiple instances accessing same config
  });
  
  test('should work with different operating systems', async () => {
    // Test cross-platform compatibility
  });
  
  test('should integrate with backup rotation policies', async () => {
    // Test backup management integration
  });
});
```

### 2. ProvidersManager Testing Requirements

#### Unit Tests (Target: 100% Coverage)
```typescript
describe('ProvidersManager Unit Tests', () => {
  describe('addProvider', () => {
    test('should add valid provider configuration', async () => {
      // Test implementation
    });
    
    test('should validate provider data structure', async () => {
      // Test implementation
    });
    
    test('should prevent duplicate provider names', async () => {
      // Test implementation
    });
    
    test('should handle invalid API URLs', async () => {
      // Test implementation
    });
  });
  
  describe('testProvider', () => {
    test('should test OpenAI provider connectivity', async () => {
      // Test implementation with mocked HTTP
    });
    
    test('should test Anthropic provider connectivity', async () => {
      // Test implementation with mocked HTTP
    });
    
    test('should test Gemini provider connectivity', async () => {
      // Test implementation with mocked HTTP
    });
    
    test('should handle network timeouts', async () => {
      // Test implementation
    });
    
    test('should handle authentication failures', async () => {
      // Test implementation
    });
  });
  
  describe('getProviderModels', () => {
    test('should fetch and parse OpenAI models', async () => {
      // Test implementation
    });
    
    test('should handle API endpoints that don\'t support model listing', async () => {
      // Test implementation
    });
    
    test('should update provider model cache', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests
```typescript
describe('ProvidersManager Integration Tests', () => {
  test('should integrate with ConfigManager for persistence', async () => {
    // Test provider operations persist to config
  });
  
  test('should handle real API responses', async () => {
    // Test with actual API endpoints (using test keys)
  });
  
  test('should integrate with ApiRouter for HTTP handling', async () => {
    // Test HTTP endpoint integration
  });
});
```

### 3. ModelsManager Testing Requirements

#### Unit Tests (Target: 100% Coverage)
```typescript
describe('ModelsManager Unit Tests', () => {
  describe('discoverModels', () => {
    test('should discover models from provider APIs', async () => {
      // Test implementation
    });
    
    test('should handle model discovery failures', async () => {
      // Test implementation
    });
    
    test('should validate discovered model structures', async () => {
      // Test implementation
    });
  });
  
  describe('validateModel', () => {
    test('should validate model accessibility', async () => {
      // Test implementation
    });
    
    test('should verify model response format', async () => {
      // Test implementation
    });
    
    test('should handle model validation timeouts', async () => {
      // Test implementation
    });
  });
  
  describe('detectTokenLimits', () => {
    test('should detect model token limits incrementally', async () => {
      // Test implementation
    });
    
    test('should handle models without token limit endpoints', async () => {
      // Test implementation
    });
    
    test('should cache detected token limits', async () => {
      // Test implementation
    });
  });
});
```

### 4. BlacklistManager Testing Requirements

#### Unit Tests (Target: 100% Coverage)
```typescript
describe('BlacklistManager Unit Tests', () => {
  describe('addToBlacklist', () => {
    test('should add model to blacklist with reason', async () => {
      // Test implementation
    });
    
    test('should prevent duplicate blacklist entries', async () => {
      // Test implementation
    });
    
    test('should validate blacklist entry structure', async () => {
      // Test implementation
    });
  });
  
  describe('removeFromBlacklist', () => {
    test('should remove model from blacklist', async () => {
      // Test implementation
    });
    
    test('should handle non-existent blacklist entries', async () => {
      // Test implementation
    });
    
    test('should restore original model configuration', async () => {
      // Test implementation
    });
  });
  
  describe('isModelBlacklisted', () => {
    test('should check if model is blacklisted', () => {
      // Test implementation
    });
    
    test('should handle model ID variations', () => {
      // Test implementation
    });
    
    test('should consider provider-specific blacklists', () => {
      // Test implementation
    });
  });
});
```

### 5. PoolManager Testing Requirements

#### Unit Tests (Target: 100% Coverage)
```typescript
describe('PoolManager Unit Tests', () => {
  describe('addToPool', () => {
    test('should add provider-model combination to pool', async () => {
      // Test implementation
    });
    
    test('should prevent duplicate pool entries', async () => {
      // Test implementation
    });
    
    test('should validate pool entry requirements', async () => {
      // Test implementation
    });
  });
  
  describe('removeFromPool', () => {
    test('should remove provider-model from pool', async () => {
      // Test implementation
    });
    
    test('should handle non-existent pool entries', async () => {
      // Test implementation
    });
    
    test('should maintain pool integrity', async () => {
      // Test implementation
    });
  });
  
  describe('getPoolStatus', () => {
    test('should return current pool configuration', () => {
      // Test implementation
    });
    
    test('should include health status of pool members', async () => {
      // Test implementation
    });
    
    test('should calculate pool utilization metrics', () => {
      // Test implementation
    });
  });
});
```

## Cross-Module Integration Tests

### Inter-Module Communication Tests
```typescript
describe('Cross-Module Integration Tests', () => {
  describe('ProvidersManager + ConfigManager', () => {
    test('should persist provider changes to configuration', async () => {
      const configManager = new ConfigManager(configInfo);
      const providersManager = new ProvidersManager(providerInfo);
      
      await providersManager.initialize(configManager);
      
      const newProvider = {
        name: 'Test Provider',
        protocol: 'openai',
        api_base_url: 'https://api.example.com',
        api_key: ['test-key'],
        auth_type: 'api_key',
        models: []
      };
      
      await providersManager.addProvider(newProvider);
      
      const savedConfig = await configManager.loadConfig();
      expect(savedConfig.providers).toContainEqual(
        expect.objectContaining({ name: 'Test Provider' })
      );
    });
  });
  
  describe('ModelsManager + ProvidersManager', () => {
    test('should discover and validate models across providers', async () => {
      // Test model discovery integration
    });
    
    test('should update model configurations consistently', async () => {
      // Test model update propagation
    });
  });
  
  describe('BlacklistManager + PoolManager', () => {
    test('should remove blacklisted models from pool', async () => {
      // Test blacklist-pool coordination
    });
    
    test('should prevent blacklisted models from entering pool', async () => {
      // Test blacklist-pool validation
    });
  });
});
```

## End-to-End Testing Scenarios

### Consumer Integration Tests
```typescript
describe('E2E Consumer Integration Tests', () => {
  describe('Complete Configuration Workflow', () => {
    test('should handle full provider lifecycle', async () => {
      // 1. Install modules
      const configManager = new ConfigManager(configInfo);
      const providersManager = new ProvidersManager(providerInfo);
      const modelsManager = new ModelsManager(modelInfo);
      
      // 2. Initialize system
      await configManager.initialize();
      await providersManager.initialize(configManager);
      await modelsManager.initialize(configManager);
      
      // 3. Add provider
      const provider = await providersManager.addProvider(testProviderData);
      expect(provider.success).toBe(true);
      
      // 4. Discover models
      const models = await modelsManager.discoverModels(provider.data.id);
      expect(models.success).toBe(true);
      expect(models.data.models.length).toBeGreaterThan(0);
      
      // 5. Validate model
      const validation = await modelsManager.validateModel(
        provider.data.id, 
        models.data.models[0].id
      );
      expect(validation.success).toBe(true);
      
      // 6. Add to pool
      const poolResult = await poolManager.addToPool({
        providerId: provider.data.id,
        modelId: models.data.models[0].id
      });
      expect(poolResult.success).toBe(true);
      
      // 7. Verify persistence
      const finalConfig = await configManager.loadConfig();
      expect(finalConfig.providers.length).toBe(1);
      expect(finalConfig.provider_pool.length).toBe(1);
    });
  });
  
  describe('Error Handling Scenarios', () => {
    test('should handle cascading failures gracefully', async () => {
      // Test system resilience to failures
    });
    
    test('should maintain data consistency during errors', async () => {
      // Test data integrity during error conditions
    });
  });
  
  describe('Performance Scenarios', () => {
    test('should handle large-scale configurations', async () => {
      // Test with 100+ providers, 1000+ models
    });
    
    test('should maintain response times under load', async () => {
      // Test performance benchmarks
    });
  });
});
```

## Testing Infrastructure

### 1. Test Configuration

#### Jest Configuration for Module Testing
```typescript
// jest.config.js for each module
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__test__'],
  testMatch: [
    '**/__test__/**/*.test.ts',
    '**/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__test__/**',
    '!src/**/interfaces/**'
  ],
  coverageReporters: [
    'html',
    'text',
    'text-summary',
    'json-summary',
    'lcov'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/__test__/setup.ts'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
```

#### Test Setup Configuration
```typescript
// __test__/setup.ts
import { TestUtilities } from '@rcc/test-utilities';

beforeAll(async () => {
  // Initialize test environment
  await TestUtilities.initializeTestEnvironment();
});

afterAll(async () => {
  // Cleanup test environment
  await TestUtilities.cleanupTestEnvironment();
});

beforeEach(() => {
  // Reset test state
  TestUtilities.resetTestState();
});

afterEach(async () => {
  // Cleanup after each test
  await TestUtilities.cleanupAfterTest();
});
```

### 2. Test Utilities and Fixtures

#### Shared Test Utilities
```typescript
// @rcc/test-utilities
export class TestUtilities {
  static createMockConfigManager(): IConfigManager {
    return {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      createBackup: jest.fn(),
      restoreFromBackup: jest.fn(),
      validateConfig: jest.fn(),
      getConfigPath: jest.fn()
    };
  }
  
  static createTestConfigData(): IConfigData {
    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      providers: [],
      routes: [],
      global_config: {
        load_balancing: 'round-robin',
        rate_limiting: {
          enabled: false,
          requests_per_minute: 60
        }
      },
      model_blacklist: [],
      provider_pool: []
    };
  }
  
  static createTestProvider(overrides?: Partial<IProvider>): IProvider {
    return {
      id: 'test-provider-1',
      name: 'Test Provider',
      protocol: 'openai',
      api_base_url: 'https://api.test.com',
      api_key: ['test-key'],
      auth_type: 'api_key',
      models: [],
      ...overrides
    };
  }
  
  static mockHttpResponse(statusCode: number, data: any) {
    // Mock HTTP response implementation
  }
  
  static async waitForAsyncOperations(): Promise<void> {
    // Wait for all pending async operations
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

#### Test Fixtures
```typescript
// __test__/fixtures/test-data.ts
export const TEST_FIXTURES = {
  validConfig: {
    // Complete valid configuration
  },
  
  invalidConfig: {
    // Invalid configuration for error testing
  },
  
  testProviders: [
    {
      id: 'openai-test',
      name: 'OpenAI Test',
      protocol: 'openai',
      // ... other properties
    },
    {
      id: 'anthropic-test',
      name: 'Anthropic Test',
      protocol: 'anthropic',
      // ... other properties
    }
  ],
  
  apiResponses: {
    openaiModels: {
      // Mock OpenAI models API response
    },
    anthropicError: {
      // Mock Anthropic error response
    }
  }
};
```

### 3. Performance Testing

#### Performance Benchmarks
```typescript
describe('Performance Tests', () => {
  test('ConfigManager.loadConfig should complete within 100ms', async () => {
    const startTime = Date.now();
    await configManager.loadConfig();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100);
  });
  
  test('ProvidersManager should handle 50 concurrent requests', async () => {
    const promises = Array(50).fill(null).map(() => 
      providersManager.getProviders()
    );
    
    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000);
  });
  
  test('System should handle large configurations efficiently', async () => {
    // Test with 100 providers, 1000 models
    const largeConfig = TestUtilities.createLargeConfiguration();
    
    const startTime = Date.now();
    await configManager.saveConfig(largeConfig);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000);
  });
});
```

### 4. Security Testing

#### Security Test Suite
```typescript
describe('Security Tests', () => {
  test('should sanitize user input', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const result = providersManager.validateProviderData({
      name: maliciousInput,
      // ... other properties
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });
  
  test('should prevent API key leakage in logs', async () => {
    const logSpy = jest.spyOn(console, 'log');
    
    await providersManager.testProvider('test-provider', {
      api_key: 'secret-key-12345',
      testAllKeys: false
    });
    
    const logCalls = logSpy.mock.calls.flat();
    const hasFullKey = logCalls.some(call => 
      typeof call === 'string' && call.includes('secret-key-12345')
    );
    
    expect(hasFullKey).toBe(false);
  });
  
  test('should validate API endpoints for SSRF protection', () => {
    const maliciousUrls = [
      'http://localhost:3000',
      'http://169.254.169.254',
      'file:///etc/passwd'
    ];
    
    maliciousUrls.forEach(url => {
      const result = providersManager.validateProviderData({
        api_base_url: url,
        // ... other properties
      });
      
      expect(result.valid).toBe(false);
    });
  });
});
```

## Testing Automation and CI/CD

### 1. Automated Testing Pipeline

#### GitHub Actions Workflow
```yaml
name: Module Testing Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 21.x]
        module: [config-manager, providers-manager, models-manager, blacklist-manager, pool-manager]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
      working-directory: packages/${{ matrix.module }}
    
    - name: Run unit tests
      run: npm run test:unit
      working-directory: packages/${{ matrix.module }}
    
    - name: Run integration tests
      run: npm run test:integration
      working-directory: packages/${{ matrix.module }}
    
    - name: Run security tests
      run: npm run test:security
      working-directory: packages/${{ matrix.module }}
    
    - name: Generate coverage report
      run: npm run test:coverage
      working-directory: packages/${{ matrix.module }}
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: packages/${{ matrix.module }}/coverage/lcov.info
        flags: ${{ matrix.module }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'
    
    - name: Install all dependencies
      run: npm run install:all
    
    - name: Build all modules
      run: npm run build:all
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run performance tests
      run: npm run test:performance
```

### 2. Quality Gates

#### Pre-Publishing Quality Gates
```typescript
const QUALITY_GATES = {
  testing: {
    unitCoverage: 100,
    integrationCoverage: 95,
    e2eCoverage: 90,
    performanceBaseline: 'maintained',
    securityTests: 'passing'
  },
  
  codeQuality: {
    linting: 'zero-errors',
    typeChecking: 'strict-passing',
    vulnerabilities: 'zero-high-critical'
  },
  
  documentation: {
    apiDocs: 'complete',
    testDocs: 'complete',
    examples: 'working'
  }
};
```

This comprehensive testing strategy ensures that each RCC module meets the highest quality standards before independent npm publication, maintaining the architectural integrity and reliability expected from the RCC framework.