/**
 * RCC CLI Framework Main Entry Point
 */

// Core exports
export { CLIFramework } from './core/CLIFramework';
export { CommandRegistry } from './core/CommandRegistry';
export { ModuleLoader } from './core/ModuleLoader';
export { ConfigManager } from './core/ConfigManager';

// Interface exports
export type { ICommand, CommandContext, CommandOption, CommandFlag, CommandExecutionResult } from './interfaces/ICommand';
export type { ICommandModule, CommandModuleMetadata, CommandModuleConfig, ModuleStatus, ModuleLoadResult } from './interfaces/ICommandModule';
export type { ICLIFramework, CLIFrameworkOptions, CLIFrameworkConfig } from './interfaces/ICLIFramework';

// Import types for local use
import { CLIFramework } from './core/CLIFramework';
import { CLIFrameworkOptions, CLIFrameworkConfig } from './interfaces/ICLIFramework';

// Utility exports
export { ArgumentParser } from './utils/ArgumentParser';
export { Logger } from './utils/Logger';
export { ProcessManager } from './utils/ProcessManager';

// Re-export BaseModule for convenience
export { BaseModule, ModuleInfo } from 'rcc-basemodule';

/**
 * Create a new CLI Framework instance
 */
export function createCLIFramework(options: CLIFrameworkOptions): CLIFramework {
  return new CLIFramework(options);
}

/**
 * Framework version
 */
export const VERSION = '0.1.0';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Partial<CLIFrameworkConfig> = {
  framework: {
    name: 'rcc-cli',
    version: VERSION
  },
  modules: {
    paths: ['./src/cli-commands/*/src/*Module.js'],
    autoLoad: true,
    watchMode: false
  },
  logging: {
    level: 'info',
    console: true
  },
  defaults: {
    protocol: 'anthropic',
    port: 5506
  }
};