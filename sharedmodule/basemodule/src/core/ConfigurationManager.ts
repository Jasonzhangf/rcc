import { DebugConfig } from './DebugLogger';

/**
 * Manages module configuration
 */
export class ConfigurationManager {
  private config: Record<string, any> = {};
  private debugConfig: DebugConfig;
  private moduleId: string;
  private debugCallback?: (level: string, message: string, data?: any, method?: string) => void;

  constructor(moduleId: string, debugCallback?: (level: string, message: string, data?: any, method?: string) => void) {
    this.moduleId = moduleId;
    this.debugCallback = debugCallback;

    // Initialize debug configuration with defaults
    this.debugConfig = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true,
      enableFileLogging: false,
      maxFileSize: 10485760, // 10MB
      maxLogFiles: 5
    };
  }

  /**
   * Sets the module configuration
   */
  public setConfiguration(config: Record<string, any>): void {
    this.config = { ...config };
    this.debug('debug', 'Module configuration set', config, 'setConfiguration');
  }

  /**
   * Gets the module configuration
   */
  public getConfiguration(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Gets a specific configuration value
   */
  public getConfigurationValue(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Sets a specific configuration value
   */
  public setConfigurationValue(key: string, value: any): void {
    this.config[key] = value;
    this.debug('debug', 'Configuration value set', { key, value }, 'setConfigurationValue');
  }

  /**
   * Merges configuration with existing configuration
   */
  public mergeConfiguration(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
    this.debug('debug', 'Configuration merged', config, 'mergeConfiguration');
  }

  /**
   * Sets the debug configuration
   */
  public setDebugConfig(config: Partial<DebugConfig>): void {
    this.debugConfig = { ...this.debugConfig, ...config };
    this.debug('debug', 'Debug configuration set', config, 'setDebugConfig');
  }

  /**
   * Gets the debug configuration
   */
  public getDebugConfig(): DebugConfig {
    return { ...this.debugConfig };
  }

  /**
   * Clears all configuration
   */
  public clearConfiguration(): void {
    this.config = {};
    this.debug('debug', 'Configuration cleared', {}, 'clearConfiguration');
  }

  /**
   * Checks if a configuration key exists
   */
  public hasConfigurationKey(key: string): boolean {
    return key in this.config;
  }

  /**
   * Gets all configuration keys
   */
  public getConfigurationKeys(): string[] {
    return Object.keys(this.config);
  }

  /**
   * Internal debug logging
   */
  private debug(level: string, message: string, data?: any, method?: string): void {
    if (this.debugCallback) {
      this.debugCallback(level, message, data, method);
    }
  }
}