import stopCommand from './commands/stop';
import codeCommand from './commands/code';
import restartCommand from './commands/restart';
import * as CLI_TYPES from './types/cli-types';

// Import unified configuration system
import {
  createConfigManager,
  createValidator,
  createMigrator,
  UnifiedConfigManager,
  ConfigValidator,
  ConfigMigrator,
  type UnifiedConfig,
  type ConfigValidationResult,
  type MigrationResult,
} from './config';

export { stopCommand, codeCommand, restartCommand, CLI_TYPES };

export {
  createConfigManager,
  createValidator,
  createMigrator,
  UnifiedConfigManager,
  ConfigValidator,
  ConfigMigrator,
  type UnifiedConfig,
  type ConfigValidationResult,
  type MigrationResult,
};

// Default CLI engine configuration with unified configuration support
export const defaultCLIConfig = {
  name: 'rcc',
  version: '1.0.0',
  description: 'RCC Command Line Interface Framework with Unified Configuration',
  commandDiscovery: {
    commandDirs: [
      // Built-in commands
      import.meta.url + '/commands',
      // Project-specific commands
      process.cwd() + '/commands',
      process.cwd() + '/src/commands',
    ],
    modulePatterns: ['rcc-command-*', '@rcc/command-*'],
    autoLoad: true,
    watchForChanges: process.env.NODE_ENV === 'development',
  },
  defaultCommand: 'help',
  configuration: {
    // Default configuration file locations
    configFiles: [
      './rcc-config.json',
      './rcc-config.local.json',
      '~/.rcc-config.json',
      '/etc/rcc/rcc-config.json',
    ],
    // Configuration validation settings
    validation: {
      enabled: true,
      strict: process.env.NODE_ENV === 'production',
      autoFix: true,
    },
    // Migration settings
    migration: {
      enabled: true,
      backup: true,
      autoFix: true,
    },
    // Configuration monitoring
    watchConfig: process.env.NODE_ENV === 'development',
    configReloadInterval: 5000,
  },

  // Configuration initialization helper
  initializeConfiguration: async function (configPath?: string) {
    try {
      const configManager = createConfigManager(configPath);
      await configManager.loadConfig();

      console.log('✅ Configuration loaded successfully');
      return {
        success: true,
        configManager,
        config: configManager.getConfig(),
      };
    } catch (error) {
      console.warn('⚠️ Failed to load configuration:', error);

      // Try to create default configuration
      try {
        const validator = createValidator();
        const defaultConfig = validator.createConfigTemplate({
          environment: (process.env.NODE_ENV as any) || 'development',
        });

        console.log('📝 Creating default configuration...');
        return {
          success: true,
          configManager: createConfigManager(),
          config: defaultConfig,
        };
      } catch (createError) {
        console.error('❌ Configuration initialization failed');
        throw createError;
      }
    }
  },

  // Configuration validation helper
  validateConfiguration: async function (configPath?: string) {
    try {
      const validator = createValidator();
      const validation = await validator.validateConfigFile(configPath || './rcc-config.json');

      if (validation.valid) {
        console.log('✅ Configuration is valid');
        return { valid: true, validation };
      } else {
        console.warn('⚠️ Configuration validation issues found');
        return { valid: false, validation };
      }
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      return { valid: false, error };
    }
  },

  // Migration support
  migrateConfiguration: async function (options: {
    sourcePath?: string;
    targetPath?: string;
    backup?: boolean;
  }) {
    try {
      const migrator = createMigrator({
        backup: options.backup !== false,
        autoFixErrors: true,
        generateReport: true,
      });

      const result = await migrator.migrateConfigFile(
        options.sourcePath || './rcc-config.json',
        options.targetPath
      );

      if (result.success) {
        console.log('✅ Configuration migration completed');
        console.log(`   From: ${result.originalPath}`);
        console.log(`   To: ${result.newPath}`);
        if (result.backupPath) {
          console.log(`   Backup: ${result.backupPath}`);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Configuration migration failed:', error);
      throw error;
    }
  },
};

// Configuration management utilities
export const configUtils = {
  /**
   * Find configuration file in standard locations
   */
  findConfigFile: function (): string | null {
    const configPaths = [
      './rcc-config.json',
      './rcc-config.local.json',
      '~/.rcc-config.json',
      path.join(process.env.HOME || '', '.rcc-config.json'),
      '/etc/rcc/rcc-config.json',
    ];

    for (const configPath of configPaths) {
      const expandedPath = configPath.startsWith('~')
        ? path.join(process.env.HOME || '', configPath.slice(1))
        : path.resolve(configPath);

      try {
        if (fs.existsSync(expandedPath)) {
          return expandedPath;
        }
      } catch {
        continue;
      }
    }

    return null;
  },

  /**
   * Load and validate configuration
   */
  loadAndValidateConfig: async function (configPath?: string): Promise<{
    success: boolean;
    configManager?: UnifiedConfigManager;
    config?: UnifiedConfig;
    validation?: ConfigValidationResult;
    error?: Error;
  }> {
    try {
      const actualPath = configPath || this.findConfigFile();
      if (!actualPath) {
        throw new Error('No configuration file found');
      }

      const configManager = createConfigManager(actualPath);
      await configManager.loadConfig();

      const config = configManager.getConfig();

      // Validate configuration
      const validation = await configManager.validateConfig();

      return {
        success: true,
        configManager,
        config,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  /**
   * Create configuration from environment variables
   */
  configFromEnvironment: function (): Partial<UnifiedConfig> {
    const config: Partial<UnifiedConfig> = {
      rcc: {},
      modules: {},
      pipeline: {},
      global: {},
    };

    // Server configuration
    if (process.env.RCC_PORT) {
      config.rcc!.port = parseInt(process.env.RCC_PORT);
    }

    if (process.env.RCC_SERVER_PORT) {
      config.rcc!.server = {
        port: parseInt(process.env.RCC_SERVER_PORT),
        host: process.env.RCC_SERVER_HOST || '0.0.0.0',
      };
    }

    // Environment
    if (process.env.NODE_ENV) {
      config.global!.environment = process.env.NODE_ENV as any;
    }

    // Debug mode
    if (process.env.RCC_DEBUG) {
      config.rcc!.debugging = {
        enabled: process.env.RCC_DEBUG.toLowerCase() === 'true',
      };
    }

    return config;
  },
};

// Import path utilities
import * as path from 'path';
import * as fs from 'fs';

export default {
  ...defaultCLIConfig,
  commands: {
    stop: stopCommand,
    code: codeCommand,
    restart: restartCommand,
  },
  types: CLI_TYPES,
  configUtils,
  createConfigManager,
  createValidator,
  createMigrator,
};
