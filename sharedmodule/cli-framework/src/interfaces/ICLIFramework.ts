/**
 * CLI Framework Interface
 */

import { ICommand } from './ICommand';
import { ICommandModule } from './ICommandModule';

export interface CLIFrameworkOptions {
  /**
   * Framework name
   */
  name: string;
  
  /**
   * Framework version
   */
  version: string;
  
  /**
   * Configuration file path
   */
  configPath?: string;
  
  /**
   * Module search paths
   */
  modulePaths: string[];
  
  /**
   * Project root directory
   */
  projectRoot: string;
  
  /**
   * Enable development mode
   */
  devMode?: boolean;
  
  /**
   * Enable module hot reload
   */
  hotReload?: boolean;
  
  /**
   * Logger configuration
   */
  logger?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
    console?: boolean;
  };
}

export interface CLIFrameworkConfig {
  framework: {
    name: string;
    version: string;
    description?: string;
  };
  modules: {
    paths: string[];
    autoLoad: boolean;
    watchMode: boolean;
    priority?: Record<string, number>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
    console?: boolean;
  };
  defaults?: Record<string, any>;
  environment?: Record<string, any>;
}

export interface ICLIFramework {
  /**
   * Initialize the CLI framework
   */
  initialize(): Promise<void>;
  
  /**
   * Register a command module
   */
  registerModule(module: ICommandModule): Promise<void>;
  
  /**
   * Unregister a command module
   */
  unregisterModule(moduleName: string): Promise<void>;
  
  /**
   * Get a command by name
   */
  getCommand(name: string): ICommand | undefined;
  
  /**
   * Get all registered commands
   */
  getCommands(): Map<string, ICommand>;
  
  /**
   * Execute a command
   */
  execute(args: string[]): Promise<void>;
  
  /**
   * Show help for all commands or specific command
   */
  showHelp(commandName?: string): void;
  
  /**
   * Get framework configuration
   */
  getConfig(): CLIFrameworkConfig;
  
  /**
   * Reload modules (for development)
   */
  reloadModules(): Promise<void>;
  
  /**
   * Shutdown the framework
   */
  shutdown(): Promise<void>;
}