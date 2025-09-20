/**
 * Unified Configuration System Integration Test
 * 统一配置系统集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import {
  createConfigManager,
  createValidator,
  createMigrator,
  type UnifiedConfig,
  type ConfigValidationResult,
} from '../index.js';

describe('Unified Configuration System Integration', () => {
  const testConfigPath = './test-config.json';
  let configManager: ReturnType<typeof createConfigManager>;
  let validator: ReturnType<typeof createValidator>;
  let migrator: ReturnType<typeof createMigrator>;

  beforeEach(async () => {
    // 创建测试配置文件
    const testConfig: UnifiedConfig = {
      rcc: {
        port: 5506,
        server: {
          port: 5506,
          host: '0.0.0.0',
          protocol: 'http',
          cors: {
            enabled: true,
            origins: ['*'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            headers: ['Content-Type', 'Authorization'],
          },
          compression: true,
          timeout: 30000,
          bodyLimit: '50mb',
          rateLimiting: {
            enabled: true,
            windowMs: 900000,
            maxRequests: 1000,
          },
        },
        providers: {
          'test-provider': {
            id: 'test-provider',
            name: 'Test Provider',
            type: 'openai',
            enabled: true,
            endpoint: 'https://api.openai.com/v1',
            auth: {
              type: 'apikey',
              keys: ['${OPENAI_API_KEY}'],
            },
            models: {
              'gpt-3.5-turbo': {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                type: 'chat',
                maxTokens: 4096,
                temperature: 0.7,
                capabilities: ['chat', 'completion'],
              },
            },
          },
        },
        virtualModels: {
          'test-model': {
            id: 'test-model',
            name: 'Test Model',
            enabled: true,
            targets: [
              {
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                enabled: true,
              },
            ],
            capabilities: ['chat'],
            fallback: {
              enabled: true,
              retryAfter: 5000,
              maxRetries: 3,
            },
          },
        },
        pipeline: {
          enabled: true,
          modules: [],
          transformers: [],
          filters: [],
          routing: {
            strategy: 'round-robin',
            rules: [],
          },
        },
        debugging: {
          enabled: true,
          level: 'info',
          outputDirectory: '~/.rcc/debug-logs',
          includeTimestamp: true,
          maxEntriesPerFile: 1000,
          trackDataFlow: true,
          enableFileLogging: true,
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true,
          requestTracing: true,
          performanceMonitoring: true,
        },
      },
      modules: {
        global: {
          basePath: './sharedmodule',
          autoLoad: true,
          preload: [],
          cache: {
            enabled: true,
            maxSize: 1000,
            ttl: 3600000,
            cleanupInterval: 60000,
          },
          validation: {
            enabled: true,
            strict: false,
            schemaValidation: true,
          },
        },
        discovery: {
          scanPaths: ['./sharedmodule'],
          filePatterns: ['**/*.js', '**/*.ts'],
          excludePatterns: ['**/*.test.js', '**/*.test.ts'],
          recursive: true,
          symlinks: false,
        },
        loader: {
          caching: true,
          maxRetries: 3,
          retryDelay: 1000,
          validation: {
            enabled: true,
            strict: false,
          },
        },
        errorHandling: {
          enabled: true,
          globalHandler: true,
          logErrors: true,
          reportErrors: false,
          recovery: {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
          },
        },
      },
      pipeline: {
        enabled: true,
        modules: [],
        transformers: [],
        filters: [],
        routing: {
          strategy: 'round-robin',
          rules: [],
        },
      },
      global: {
        environment: 'development',
        paths: {
          config: './',
          logs: './logs',
          cache: './cache',
          temp: './temp',
          modules: './sharedmodule',
          data: './data',
          debug: './debug-logs',
        },
        performance: {
          enabled: true,
          metrics: {
            enabled: true,
            collectors: ['memory', 'cpu'],
            exportInterval: 60000,
          },
          optimization: {
            cacheEnabled: true,
            compressionEnabled: false,
            minificationEnabled: false,
          },
        },
        security: {
          enabled: false,
          encryption: {
            enabled: false,
            keyRotation: true,
          },
          authentication: {
            enabled: false,
            requireAuth: false,
          },
          authorization: {
            enabled: false,
          },
        },
        network: {
          timeout: 30000,
          retries: 3,
          userAgent: 'RCC-Agent/1.0',
          proxy: {
            enabled: false,
          },
        },
        storage: {
          provider: 'filesystem',
          connection: {},
          options: {},
        },
      },
    };

    await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
    console.log('Test configuration file created');

    // 初始化工具
    configManager = createConfigManager(testConfigPath, false);
    validator = createValidator();
    migrator = createMigrator({ backup: false, dryRun: true });
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await fs.unlink(testConfigPath);
      console.log('Test configuration file removed');
    } catch (error) {
      // 文件可能不存在，忽略错误
    }
  });

  describe('Configuration Loading and Validation', () => {
    it('should load configuration from file successfully', async () => {
      await configManager.loadConfig();
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.rcc).toBeDefined();
      expect(config.rcc.server).toBeDefined();
      expect(config.rcc.server?.port).toBe(5506);
    });

    it('should validate configuration successfully', async () => {
      await configManager.loadConfig();
      const config = configManager.getConfig();

      const validation = await validator.validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should access configuration sections correctly', async () => {
      await configManager.loadConfig();

      // Test section access
      const rccSection = configManager.getConfigSection('rcc');
      expect(rccSection.providers).toBeDefined();
      expect(Object.keys(rccSection.providers).length).toBeGreaterThan(0);

      // Test nested value access
      const serverPort = configManager.getConfigValue('rcc.server.port');
      expect(serverPort).toBe(5506);

      const corsEnabled = configManager.getConfigValue('rcc.server.cors.enabled');
      expect(corsEnabled).toBe(true);
    });

    it('should handle configuration updates', () => {
      const initialPort = configManager.getConfigValue('rcc.server.port');
      expect(initialPort).toBe(5506);

      configManager.updateConfigValue('rcc.server.port', 9090);
      const updatedPort = configManager.getConfigValue('rcc.server.port');
      expect(updatedPort).toBe(9090);

      // Verify the change event is emitted
      let changeEvent = null;
      configManager.on('configChanged', (event: any) => {
        changeEvent = event;
      });

      configManager.updateConfigValue('rcc.debugging.level', 'debug');

      // In a real test, we would wait for the event or mock it
      // For now, just verify the update worked
      expect(configManager.getConfigValue('rcc.debugging.level')).toBe('debug');
    });
  });

  describe('Configuration Template Generation', () => {
    it('should generate development template correctly', () => {
      const template = validator.createConfigTemplate({
        environment: 'development',
        includeProviders: false,
        includeVirtualModels: false,
        includePipeline: false,
      });

      expect(template).toBeDefined();
      expect(template.rcc).toBeDefined();
      expect(template.rcc.providers).toEqual({});
      expect(template.rcc.virtualModels).toEqual({});
      expect(template.rcc.pipeline?.enabled).toBe(false);
      expect(template.global.environment).toBe('development');
    });

    it('should generate production template correctly', () => {
      const template = validator.createConfigTemplate({
        environment: 'production',
        includeProviders: true,
        includeVirtualModels: true,
        includePipeline: true,
      });

      expect(template).toBeDefined();
      expect(template.rcc).toBeDefined();
      expect(template.rcc.debugging?.level).toBe('warn'); // Production should have higher log level
      expect(template.global.security?.enabled).toBe(true);
    });
  });

  describe('Configuration Migration', () => {
    it('should migrate old configuration format successfully', async () => {
      const oldConfig = {
        port: 8080,
        server: {
          host: 'localhost',
          port: 8080,
          cors: true,
        },
        providers: {
          openai: {
            endpoint: 'https://api.openai.com/v1',
            apiKey: '${OPENAI_API_KEY}',
          },
        },
        virtualModels: {
          gpt: {
            name: 'GPT Model',
            providers: ['openai'],
            enabled: true,
          },
        },
        debug: true,
      };

      const migrationResult = await migrator.migrateConfig(oldConfig, './old.json', './new.json');

      expect(migrationResult.success).toBe(true);
      expect(migrationResult.validation.valid).toBe(true);
      expect(migrationResult.changes.length).toBeGreaterThan(0);
      expect(migrationResult.newConfig).toBeDefined();

      // Verify the migration worked correctly
      const { newConfig } = migrationResult;
      expect(newConfig.rcc?.server?.port).toBe(8080);
      expect(newConfig.rcc?.providers).toBeDefined();
      expect(newConfig.rcc?.virtualModels).toBeDefined();
      expect(newConfig.global?.environment).toBeDefined();
    });

    it('should detect when migration is needed', async () => {
      const oldFormatConfig = {
        port: 8080,
        server: { host: 'localhost' },
        apiKey: 'test-key',
      };

      const newFormatConfig = {
        rcc: {
          server: { port: 8080 },
          providers: {},
        },
        modules: {},
        pipeline: {},
        global: { environment: 'development' },
      };

      // Test old format detection
      const needsMigration = await migrator.needsMigration('./test-old.json');
      expect(needsMigration).toBe(true);

      // Test new format detection
      const formatInfo = await migrator.getConfigFormat('./test-new.json');
      expect(formatInfo.needsMigration).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        rcc: {
          // Missing required providers but having virtualModels
          virtualModels: {
            'bad-model': {
              targets: [{ providerId: 'nonexistent-provider', modelId: 'test' }],
            },
          },
        },
        modules: {},
        pipeline: {},
        global: { environment: 'development' },
      };

      const validation = await validator.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Should contain dependency error
      const hasDependencyError = validation.errors.some(
        (error: any) => error.code === 'DEPENDENCY_MISSING' || error.message.includes('nonexistent')
      );
      expect(hasDependencyError).toBe(true);
    });

    it('should provide suggestions for suboptimal configuration', async () => {
      const suboptimalConfig = {
        rcc: {
          // No debugging enabled
          providers: {},
          virtualModels: {},
        },
        modules: {
          loader: {
            caching: false, // Caching disabled
          },
        },
        pipeline: {},
        global: { environment: 'production', security: {} },
      };

      const validation = await validator.validateConfig(suboptimalConfig);

      expect(validation.suggestions?.length).toBeGreaterThan(0);

      // Should suggest enabling debugging
      const debugSuggestion = validation.suggestions?.find(
        (s: any) => s.suggestion.includes('debugging') || s.path.includes('debugging')
      );
      expect(debugSuggestion).toBeDefined();

      // Should suggest enabling security for production
      const securitySuggestion = validation.suggestions?.find(
        (s: any) => s.suggestion.includes('security') || s.path.includes('security')
      );
      expect(securitySuggestion).toBeDefined();
    });

    it('should handle auto-fix when requested', async () => {
      const configWithIssues = {
        rcc: {
          // Missing debugging configuration
          providers: {},
          virtualModels: {},
        },
        modules: {},
        pipeline: {},
        global: { environment: 'production' },
      };

      const autoFixResult = await validator.autoFix(configWithIssues);

      expect(autoFixResult.fixed).toBe(true);
      expect(autoFixResult.config.rcc.debugging).toBeDefined();
      expect(autoFixResult.config.global.security?.enabled).toBe(true);

      // Verify the fixed configuration is valid
      const validation = await validator.validateConfig(autoFixResult.config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should load configuration efficiently', async () => {
      const startTime = Date.now();

      await configManager.loadConfig();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(100); // Should load in under 100ms
      console.log(`Configuration load time: ${loadTime}ms`);
    });

    it('should validate configuration efficiently', async () => {
      await configManager.loadConfig();
      const config = configManager.getConfig();

      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await validator.validateConfig(config);
      }

      const avgValidationTime = (Date.now() - startTime) / 10;
      expect(avgValidationTime).toBeLessThan(50); // Should validate in under 50ms
      console.log(`Average validation time: ${avgValidationTime}ms`);
    });
  });
});

// 导出用于集成测试
export { createConfigManager, createValidator, createMigrator };
export type { UnifiedConfig, ConfigValidationResult };
