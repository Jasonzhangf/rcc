/**
 * Configuration Manager for RCC CLI Framework
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { CLIFrameworkConfig } from '../interfaces/ICLIFramework';
import fs from 'fs';
import path from 'path';

export class ConfigManager extends BaseModule {
  private cliConfig: CLIFrameworkConfig | null = null;
  private configPath: string | null = null;

  constructor(_framework: any, configPath?: string) {
    const moduleInfo: ModuleInfo = {
      id: 'ConfigManager',
      name: 'Configuration Manager',
      version: '1.0.0',
      description: 'Configuration management for CLI framework',
      type: 'config',

      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);
    this.configPath = configPath || null;
  }

  async load(): Promise<CLIFrameworkConfig> {
    this.log('Loading CLI framework configuration...');

    try {
      // Find configuration file
      const configFile = this.findConfigFile();
      
      if (!configFile) {
        this.warn('No configuration file found, using defaults');
        this.cliConfig = this.getDefaultConfig();
        return this.cliConfig;
      }

      this.log(`Loading configuration from: ${configFile}`);
      
      // Read and parse configuration
      const configContent = fs.readFileSync(configFile, 'utf8');
      const parsedConfig = JSON.parse(configContent);
      
      // Validate and merge with defaults
      this.cliConfig = this.validateAndMergeConfig(parsedConfig);
      
      this.log('Configuration loaded successfully');
      return this.cliConfig;

    } catch (error) {
      this.error(`Failed to load configuration: ${(error as Error).message}`);
      this.warn('Using default configuration');
      this.cliConfig = this.getDefaultConfig();
      return this.cliConfig;
    }
  }

  async save(config: CLIFrameworkConfig): Promise<void> {
    if (!this.configPath) {
      throw new Error('No configuration file path specified');
    }

    try {
      const configContent = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configContent, 'utf8');
      this.cliConfig = config;
      this.log(`Configuration saved to: ${this.configPath}`);
    } catch (error) {
      this.error(`Failed to save configuration: ${(error as Error).message}`);
      throw error;
    }
  }

  getConfig(): Record<string, any> {
    return this.cliConfig || {};
  }

  getCLIConfig(): CLIFrameworkConfig | null {
    return this.cliConfig;
  }

  private findConfigFile(): string | null {
    // Priority order for config file lookup
    const possiblePaths = [
      this.configPath,
      './rcc-cli.config.json',
      './cli.config.json',
      './config/cli.json',
      path.join(process.cwd(), 'rcc-cli.config.json'),
      path.join(process.cwd(), 'cli.config.json')
    ].filter(Boolean) as string[];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return path.resolve(configPath);
      }
    }

    return null;
  }

  private validateAndMergeConfig(userConfig: any): CLIFrameworkConfig {
    const defaultConfig = this.getDefaultConfig();
    
    // Basic validation
    if (!userConfig || typeof userConfig !== 'object') {
      throw new Error('Configuration must be a valid JSON object');
    }

    // Merge configurations (user config overrides defaults)
    const mergedConfig: CLIFrameworkConfig = {
      framework: {
        ...defaultConfig.framework,
        ...userConfig.framework
      },
      modules: {
        ...defaultConfig.modules,
        ...userConfig.modules
      },
      logging: {
        ...defaultConfig.logging,
        ...userConfig.logging
      },
      defaults: {
        ...defaultConfig.defaults,
        ...userConfig.defaults
      },
      environment: {
        ...defaultConfig.environment,
        ...userConfig.environment
      }
    };

    // Validate required fields
    if (!mergedConfig.framework.name) {
      throw new Error('Framework name is required in configuration');
    }

    if (!mergedConfig.framework.version) {
      throw new Error('Framework version is required in configuration');
    }

    if (!mergedConfig.modules.paths || !Array.isArray(mergedConfig.modules.paths)) {
      throw new Error('Module paths must be specified as an array');
    }

    return mergedConfig;
  }

  private getDefaultConfig(): CLIFrameworkConfig {
    return {
      framework: {
        name: 'rcc-cli',
        version: '1.0.0',
        description: 'RCC CLI Framework'
      },
      modules: {
        paths: ['./cli-commands/*/src/*Module.js'],
        autoLoad: true,
        watchMode: false,
        priority: {}
      },
      logging: {
        level: 'info',
        console: true
      },
      defaults: {
        protocol: 'anthropic',
        port: 5506
      },
      environment: {}
    };
  }

  async reload(): Promise<CLIFrameworkConfig> {
    this.log('Reloading configuration...');
    return await this.load();
  }

  updateConfig(updates: Partial<CLIFrameworkConfig>): void {
    if (!this.cliConfig) {
      throw new Error('No configuration loaded');
    }

    // Deep merge updates
    this.cliConfig = {
      ...this.cliConfig,
      framework: { ...this.cliConfig.framework, ...updates.framework },
      modules: { ...this.cliConfig.modules, ...updates.modules },
      logging: { ...this.cliConfig.logging, ...updates.logging },
      defaults: { ...this.cliConfig.defaults, ...updates.defaults },
      environment: { ...this.cliConfig.environment, ...updates.environment }
    };

    this.log('Configuration updated');
  }
}