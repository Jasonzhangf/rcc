/**
 * RCC - Refactored Claude Code Router
 * TypeScript Declaration File for Main Entry Module
 */

import { DebugCenterModule } from 'rcc-debugcenter';

declare global {
  var debugCenter: DebugCenterModule;
  var systemStartSessionId: string;
}
export * from './config';

export {
  stopCommand,
  codeCommand,
  restartCommand,
  CLI_TYPES
} from './index';

export const defaultCLIConfig: {
  name: string;
  version: string;
  description: string;
  commandDiscovery: {
    commandDirs: string[];
    modulePatterns: string[];
    autoLoad: boolean;
    watchForChanges: boolean;
  };
  defaultCommand: string;
  configuration: {
    configFiles: string[];
    validation: {
      enabled: boolean;
      strict: boolean;
      autoFix: boolean;
    };
    migration: {
      enabled: boolean;
      backup: boolean;
      autoFix: boolean;
    };
    watchConfig: boolean;
    configReloadInterval: number;
  };
  initializeConfiguration(configPath?: string): Promise<{
    success: boolean;
    configManager: any;
    config: any;
  }>;
  validateConfiguration(configPath?: string): Promise<{
    valid: boolean;
    validation?: any;
    error?: Error;
  }>;
  migrateConfiguration(options: {
    sourcePath?: string;
    targetPath?: string;
    backup?: boolean;
  }): Promise<any>;
};

export const configUtils: {
  findConfigFile(): string | null;
  loadAndValidateConfig(configPath?: string): Promise<{
    success: boolean;
    configManager?: any;
    config?: any;
    validation?: any;
    error?: Error;
  }>;
  configFromEnvironment(): Partial<any>;
};

export default {
  ...defaultCLIConfig,
  commands: {
    stop: typeof stopCommand;
    code: typeof codeCommand;
    restart: typeof restartCommand;
  };
  types: typeof CLI_TYPES;
  configUtils: typeof configUtils;
  createConfigManager: typeof createConfigManager;
  createValidator: typeof createValidator;
  createMigrator: typeof createMigrator;
};