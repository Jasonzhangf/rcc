import * as fs from 'fs';
import * as path from 'path';
import JSON5 from 'json5';
import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule, ValidationResult } from '../../../interfaces/Validation';
import { 
  IConfigLoaderModule, 
  FileChangeCallback, 
  FileChangeEvent,
  ConfigLoadOptions,
  EnvironmentInterpolationOptions,
  ConfigMergeOptions,
  MergeStrategy,
  ConfigParseResult
} from '../interfaces/IConfigLoaderModule';
import { ConfigurationData } from '../interfaces/IConfigurationSystem';
import { CONFIG_LOADER_CONSTANTS } from '../constants/ConfigLoaderConstants';
import { CONFIGURATION_SYSTEM_CONSTANTS } from '../constants/ConfigurationSystem.constants';

/**
 * Configuration Loader Module
 * 
 * Implements JSON5 file loading, parsing, environment variable interpolation,
 * file watching, and configuration merging capabilities following BaseModule architecture.
 * 
 * Key Features:
 * - JSON5 configuration file parsing with error handling
 * - Environment variable interpolation (${VAR} and $VAR patterns)
 * - Real-time file watching with debounced change detection
 * - Multi-configuration merging with various strategies
 * - Comprehensive validation using BaseModule validation framework
 * - Type-safe operations with strict TypeScript compliance
 * 
 * @extends BaseModule
 * @implements IConfigLoaderModule
 */
export class ConfigLoaderModule extends BaseModule implements IConfigLoaderModule {
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private watchCallbacks: Map<string, FileChangeCallback[]> = new Map();
  private operationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private configCache: Map<string, { data: ConfigurationData; timestamp: number }> = new Map();
  private activeOperations: Set<string> = new Set();

  /**
   * Creates an instance of ConfigLoaderModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
    this.setupValidationRules();
  }

  /**
   * Static factory method to create an instance of ConfigLoaderModule
   * @param info - Module information
   * @returns Instance of ConfigLoaderModule
   */
  static createInstance(info: ModuleInfo): ConfigLoaderModule {
    return new ConfigLoaderModule(info);
  }

  /**
   * Initializes the module with proper configuration and validation setup
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    try {
      await super.initialize();
      
      // Validate module configuration
      const configValidation = this.validateModuleConfig();
      if (!configValidation.isValid) {
        throw new Error(`Module configuration validation failed: ${configValidation.errors.join(', ')}`);
      }

      // Set up cleanup handlers
      process.on('SIGINT', () => this.cleanup());
      process.on('SIGTERM', () => this.cleanup());

      console.log(`${CONFIG_LOADER_CONSTANTS.MODULE_NAME} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize ConfigLoaderModule: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads configuration from a JSON5 file with comprehensive error handling
   * @param filePath - Path to the configuration file
   * @param options - Load options for customization
   * @returns Promise resolving to ConfigurationData
   * @throws Error if file loading or parsing fails
   */
  public async loadFromFile(filePath: string, options: ConfigLoadOptions = {}): Promise<ConfigurationData> {
    const operationId = this.generateOperationId();
    
    try {
      // Validate operation limits
      await this.validateOperationLimits(operationId);
      
      // Validate file path
      this.validateFilePath(filePath);
      
      // Check cache if enabled
      const cachedConfig = this.getCachedConfig(filePath);
      if (cachedConfig && !options.watchForChanges) {
        return cachedConfig;
      }

      const mergedOptions = { ...CONFIG_LOADER_CONSTANTS.DEFAULT_VALUES.LOAD_OPTIONS, ...options };
      const startTime = Date.now();

      // Set operation timeout
      this.setOperationTimeout(operationId, mergedOptions.timeout);

      // Read file with encoding and size validation
      const fileStats = await fs.promises.stat(filePath);
      this.validateFileSize(fileStats.size);

      const fileContent = await fs.promises.readFile(filePath, { encoding: mergedOptions.encoding });
      
      // Parse JSON5 content
      const parseResult = this.parseJson5Content(fileContent, filePath);
      if (!parseResult.success) {
        const errorData = {
          code: 'CONFIG_PARSE_ERROR',
          message: `${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.PARSE_ERROR}: ${parseResult.errors.map(e => e.message).join(', ')}`,
          filePath: filePath,
          errors: parseResult.errors,
          timestamp: Date.now()
        };
        
        // Report error to error handler
        this.reportError(errorData);
        
        throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.PARSE_ERROR}: ${parseResult.errors.map(e => e.message).join(', ')}`);
      }

      // Interpolate environment variables
      const interpolatedData = await this.interpolateEnvironmentVariables(
        parseResult.data,
        {
          ...CONFIG_LOADER_CONSTANTS.DEFAULT_VALUES.INTERPOLATION_OPTIONS,
          defaultValues: mergedOptions.environmentOverrides
        }
      );

      // Create configuration data structure
      const configData: ConfigurationData = {
        raw: fileContent,
        parsed: interpolatedData,
        validated: false,
        warnings: parseResult.warnings,
        metadata: {
          filePath: path.resolve(filePath),
          fileSize: fileStats.size,
          lastModified: fileStats.mtime.getTime(),
          version: CONFIG_LOADER_CONSTANTS.MODULE_VERSION,
          environmentVariables: parseResult.metadata.environmentVariablesFound,
          loadTime: Date.now() - startTime
        }
      };

      // Cache the configuration if enabled
      if (mergedOptions.cacheResults) {
        this.cacheConfig(filePath, configData);
      }

      // Clean up operation
      this.clearOperationTimeout(operationId);
      this.activeOperations.delete(operationId);

      return configData;

    } catch (error) {
      // Clean up operation on error
      this.clearOperationTimeout(operationId);
      this.activeOperations.delete(operationId);
      
      // Report error to error handler
      const errorData = {
        code: 'CONFIG_LOAD_ERROR',
        message: error instanceof Error ? error.message : String(error),
        filePath: filePath,
        timestamp: Date.now()
      };
      
      this.reportError(errorData);

      throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.LOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sets up file watching for configuration changes with debouncing
   * @param filePath - Path to the file to watch
   * @param callback - Callback function for file change events
   * @throws Error if file watching setup fails
   */
  public watchFile(filePath: string, callback: FileChangeCallback): void {
    try {
      this.validateFilePath(filePath);
      
      const resolvedPath = path.resolve(filePath);
      
      // Add callback to the list for this file
      if (!this.watchCallbacks.has(resolvedPath)) {
        this.watchCallbacks.set(resolvedPath, []);
      }
      this.watchCallbacks.get(resolvedPath)!.push(callback);

      // Set up watcher if not already watching this file
      if (!this.fileWatchers.has(resolvedPath)) {
        const watcher = fs.watch(
          resolvedPath,
          CONFIG_LOADER_CONSTANTS.WATCH_OPTIONS,
          this.createDebouncedWatchHandler(resolvedPath)
        );

        watcher.on('error', (error) => {
          console.error(`File watcher error for ${resolvedPath}: ${error.message}`);
          this.stopWatching(resolvedPath);
        });

        this.fileWatchers.set(resolvedPath, watcher);
        console.log(`${CONFIG_LOADER_CONSTANTS.SUCCESS_MESSAGES.WATCH_STARTED}: ${resolvedPath}`);
      }
    } catch (error) {
      throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.WATCH_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stops watching a specific file
   * @param filePath - Path to the file to stop watching
   */
  public stopWatching(filePath: string): void {
    const resolvedPath = path.resolve(filePath);
    
    const watcher = this.fileWatchers.get(resolvedPath);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(resolvedPath);
    }
    
    this.watchCallbacks.delete(resolvedPath);
    console.log(`${CONFIG_LOADER_CONSTANTS.SUCCESS_MESSAGES.WATCH_STOPPED}: ${resolvedPath}`);
  }

  /**
   * Interpolates environment variables in configuration data
   * @param config - Configuration object to process
   * @param options - Interpolation options
   * @returns Promise resolving to processed configuration
   * @throws Error if interpolation fails or circular references detected
   */
  public async interpolateEnvironmentVariables(
    config: any,
    options: EnvironmentInterpolationOptions = {}
  ): Promise<any> {
    const mergedOptions = { ...CONFIG_LOADER_CONSTANTS.DEFAULT_VALUES.INTERPOLATION_OPTIONS, ...options };
    const processed = new Set<string>();
    
    try {
      return await this.processEnvironmentVariables(config, mergedOptions, processed, 0);
    } catch (error) {
      throw new Error(`Environment variable interpolation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates environment variables in configuration
   * @param config - Configuration object to validate
   * @returns Promise resolving to array of missing variable names
   */
  public async validateEnvironmentVariables(config: any): Promise<string[]> {
    const missingVariables: string[] = [];
    const envVarPattern = CONFIG_LOADER_CONSTANTS.ENV_VAR_PATTERNS.DOLLAR_BRACE;
    
    const checkObject = (obj: any, path: string = ''): void => {
      if (typeof obj === 'string') {
        let match;
        envVarPattern.lastIndex = 0;
        while ((match = envVarPattern.exec(obj)) !== null) {
          const varName = match[1];
          if (!(varName in process.env) && !missingVariables.includes(varName)) {
            missingVariables.push(varName);
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          checkObject(value, path ? `${path}.${key}` : key);
        }
      }
    };

    checkObject(config);
    return missingVariables;
  }

  /**
   * Merges multiple configuration objects using specified strategy
   * @param configs - Array of configuration data to merge
   * @param options - Merge options
   * @returns Promise resolving to merged configuration data
   * @throws Error if merging fails
   */
  public async mergeConfigurations(
    configs: ConfigurationData[],
    options: ConfigMergeOptions = CONFIG_LOADER_CONSTANTS.DEFAULT_VALUES.MERGE_OPTIONS
  ): Promise<ConfigurationData> {
    if (configs.length === 0) {
      throw new Error('No configurations provided for merging');
    }

    if (configs.length === 1) {
      return configs[0];
    }

    try {
      const mergedParsed = this.mergeObjects(configs.map(c => c.parsed), options);
      const mergedRaw = configs.map(c => c.raw).join('\n\n// --- Merged Configuration ---\n\n');
      
      // Combine metadata
      const combinedMetadata = {
        filePath: configs.map(c => c.metadata.filePath).join(', '),
        fileSize: configs.reduce((sum, c) => sum + c.metadata.fileSize, 0),
        lastModified: Math.max(...configs.map(c => c.metadata.lastModified)),
        version: CONFIG_LOADER_CONSTANTS.MODULE_VERSION,
        environmentVariables: [...new Set(configs.flatMap(c => c.metadata.environmentVariables))],
        loadTime: Date.now()
      };

      const mergedConfig: ConfigurationData = {
        raw: mergedRaw,
        parsed: mergedParsed,
        validated: configs.every(c => c.validated),
        errors: configs.flatMap(c => c.errors || []),
        warnings: configs.flatMap(c => c.warnings || []),
        metadata: combinedMetadata
      };

      console.log(`${CONFIG_LOADER_CONSTANTS.SUCCESS_MESSAGES.CONFIG_MERGED}: ${configs.length} configurations`);
      return mergedConfig;

    } catch (error) {
      throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.MERGE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Receives data from connected modules and processes accordingly
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    try {
      const validation = this.validateInput(dataTransfer.data);
      if (!validation.isValid) {
        console.error(`Invalid input data: ${validation.errors.join(', ')}`);
        return;
      }

      // Process different types of incoming data
      switch (dataTransfer.data.type) {
        case 'load-request':
          await this.handleLoadRequest(dataTransfer.data);
          break;
        case 'watch-request':
          await this.handleWatchRequest(dataTransfer.data);
          break;
        case 'merge-request':
          await this.handleMergeRequest(dataTransfer.data);
          break;
        default:
          console.warn(`Unknown data type received: ${dataTransfer.data.type}`);
      }
    } catch (error) {
      console.error(`Error processing received data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Performs handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    try {
      // Perform config loader specific handshake validation
      const targetInfo = targetModule.getInfo();
      
      // Check if target module is compatible
      const compatibleTypes = ['config-validator', 'config-persistence', 'status-line'];
      if (!compatibleTypes.includes(targetInfo.type)) {
        console.warn(`Handshake warning: Module type '${targetInfo.type}' may not be fully compatible`);
      }

      return await super.handshake(targetModule);
    } catch (error) {
      console.error(`Handshake failed with module ${targetModule.getInfo().id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    await this.cleanup();
    await super.destroy();
  }

  // Private helper methods

  /**
   * Sets up validation rules for the module
   */
  private setupValidationRules(): void {
    this.validationRules = [
      {
        field: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.FILE_PATH.FIELD,
        type: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.FILE_PATH.TYPE as any,
        message: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.FILE_PATH.MESSAGE
      },
      {
        field: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.CONFIG_DATA.FIELD,
        type: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.CONFIG_DATA.TYPE as any,
        message: CONFIG_LOADER_CONSTANTS.VALIDATION_RULES.CONFIG_DATA.MESSAGE
      }
    ];
  }

  /**
   * Validates module configuration
   */
  private validateModuleConfig(): ValidationResult {
    const requiredConfig = ['moduleId', 'moduleType'];
    const errors: string[] = [];
    
    for (const key of requiredConfig) {
      if (!(key in this.config)) {
        errors.push(`Missing required configuration: ${key}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: this.config
    };
  }

  /**
   * Validates file path format and accessibility
   */
  private validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    if (!CONFIG_LOADER_CONSTANTS.REGEX_PATTERNS.VALID_FILE_PATH.test(filePath)) {
      throw new Error('Invalid file path format');
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: ${resolvedPath}`);
    }
  }

  /**
   * Validates file size against limits
   */
  private validateFileSize(size: number): void {
    if (size > CONFIG_LOADER_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.FILE_TOO_LARGE}: ${size} bytes > ${CONFIG_LOADER_CONSTANTS.MAX_FILE_SIZE_BYTES} bytes`);
    }
  }

  /**
   * Parses JSON5 content with comprehensive error handling
   */
  private parseJson5Content(content: string, filePath: string): ConfigParseResult {
    const startTime = Date.now();
    const result: ConfigParseResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {
        parseTime: 0,
        fileSize: Buffer.byteLength(content, 'utf8'),
        encoding: 'utf8',
        environmentVariablesFound: [],
        syntaxFeatures: []
      }
    };

    try {
      // Remove comments for environment variable detection
      const cleanContent = content.replace(CONFIG_LOADER_CONSTANTS.REGEX_PATTERNS.JSON5_COMMENT, '');
      
      // Detect environment variables
      const envVars = new Set<string>();
      let match;
      
      CONFIG_LOADER_CONSTANTS.ENV_VAR_PATTERNS.DOLLAR_BRACE.lastIndex = 0;
      while ((match = CONFIG_LOADER_CONSTANTS.ENV_VAR_PATTERNS.DOLLAR_BRACE.exec(cleanContent)) !== null) {
        envVars.add(match[1]);
      }
      
      result.metadata.environmentVariablesFound = Array.from(envVars);

      // Parse JSON5
      result.data = JSON5.parse(content);
      result.success = true;

    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : String(error),
        code: 'PARSE_ERROR',
        severity: 'error'
      });
    }

    result.metadata.parseTime = Date.now() - startTime;
    return result;
  }

  /**
   * Processes environment variables recursively with circular reference detection
   */
  private async processEnvironmentVariables(
    obj: any,
    options: EnvironmentInterpolationOptions,
    processed: Set<string>,
    depth: number
  ): Promise<any> {
    if (depth > CONFIG_LOADER_CONSTANTS.ENV_VAR_MAX_RECURSION_DEPTH) {
      throw new Error(CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.ENV_VAR_CIRCULAR_REFERENCE);
    }

    if (typeof obj === 'string') {
      return this.interpolateStringValue(obj, options, processed, depth);
    } else if (Array.isArray(obj)) {
      return Promise.all(
        obj.map(item => this.processEnvironmentVariables(item, options, processed, depth + 1))
      );
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.processEnvironmentVariables(value, options, processed, depth + 1);
      }
      return result;
    }

    return obj;
  }

  /**
   * Interpolates environment variables in a string value
   */
  private interpolateStringValue(
    value: string,
    options: EnvironmentInterpolationOptions,
    processed: Set<string>,
    depth: number
  ): string {
    let result = value;

    // Process ${VAR} pattern
    result = result.replace(CONFIG_LOADER_CONSTANTS.ENV_VAR_PATTERNS.DOLLAR_BRACE, (match, varName) => {
      return this.getEnvironmentVariableValue(varName, options, processed);
    });

    // Process $VAR pattern
    result = result.replace(CONFIG_LOADER_CONSTANTS.ENV_VAR_PATTERNS.DOLLAR_DIRECT, (match, varName) => {
      // Only replace if not followed by alphanumeric character (to avoid partial matches)
      const nextChar = value[value.indexOf(match) + match.length];
      if (nextChar && /[A-Za-z0-9_]/.test(nextChar)) {
        return match;
      }
      return this.getEnvironmentVariableValue(varName, options, processed);
    });

    return result;
  }

  /**
   * Gets environment variable value with options handling
   */
  private getEnvironmentVariableValue(
    varName: string,
    options: EnvironmentInterpolationOptions,
    processed: Set<string>
  ): string {
    if (processed.has(varName)) {
      throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.ENV_VAR_CIRCULAR_REFERENCE}: ${varName}`);
    }

    // Check allowed variables list
    if (options.allowedVariables && !options.allowedVariables.includes(varName)) {
      if (options.throwOnMissing) {
        throw new Error(`Environment variable '${varName}' is not in allowed list`);
      }
      return `\${${varName}}`;
    }

    // Get value from environment or defaults
    let value = process.env[varName] || options.defaultValues?.[varName];

    if (value === undefined) {
      if (options.throwOnMissing) {
        throw new Error(`${CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.ENV_VAR_NOT_FOUND}: ${varName}`);
      }
      return `\${${varName}}`;
    }

    // Sanitize value if requested
    if (options.sanitizeValues) {
      value = this.sanitizeEnvironmentValue(value);
    }

    return value;
  }

  /**
   * Sanitizes environment variable values
   */
  private sanitizeEnvironmentValue(value: string): string {
    // Remove potentially dangerous characters and patterns
    return value
      .replace(/[<>\"'&]/g, '')
      .replace(/\$\(/g, '')
      .replace(/`/g, '')
      .trim();
  }

  /**
   * Merges objects based on strategy
   */
  private mergeObjects(objects: any[], options: ConfigMergeOptions): any {
    if (objects.length === 0) return {};
    if (objects.length === 1) return objects[0];

    let result = objects[0];

    for (let i = 1; i < objects.length; i++) {
      result = this.mergeTwo(result, objects[i], options, 0);
    }

    return result;
  }

  /**
   * Merges two objects based on strategy
   */
  private mergeTwo(target: any, source: any, options: ConfigMergeOptions, depth: number): any {
    if (depth > CONFIG_LOADER_CONSTANTS.MAX_MERGE_DEPTH) {
      throw new Error('Maximum merge depth exceeded');
    }

    if (source === null || source === undefined) {
      return target;
    }

    if (target === null || target === undefined) {
      return source;
    }

    switch (options.strategy) {
      case MergeStrategy.REPLACE:
        return source;

      case MergeStrategy.MERGE_SHALLOW:
        if (typeof target === 'object' && typeof source === 'object' && !Array.isArray(target) && !Array.isArray(source)) {
          return { ...target, ...source };
        }
        return source;

      case MergeStrategy.MERGE_DEEP:
        return this.deepMerge(target, source, options, depth);

      case MergeStrategy.CUSTOM:
        if (options.customMerger) {
          return options.customMerger(target, source, '');
        }
        return this.deepMerge(target, source, options, depth);

      default:
        return this.deepMerge(target, source, options, depth);
    }
  }

  /**
   * Performs deep merge of objects
   */
  private deepMerge(target: any, source: any, options: ConfigMergeOptions, depth: number): any {
    if (Array.isArray(target) && Array.isArray(source)) {
      switch (options.arrayHandling) {
        case 'replace':
          return source;
        case 'concat':
          return [...target, ...source];
        case 'merge':
          const maxLength = Math.max(target.length, source.length);
          const result = [];
          for (let i = 0; i < maxLength; i++) {
            if (i < source.length) {
              result[i] = i < target.length 
                ? this.mergeTwo(target[i], source[i], options, depth + 1)
                : source[i];
            } else {
              result[i] = target[i];
            }
          }
          return result;
        default:
          return source;
      }
    }

    if (typeof target === 'object' && typeof source === 'object' && 
        target !== null && source !== null && 
        !Array.isArray(target) && !Array.isArray(source)) {
      
      const result = { ...target };
      
      for (const [key, value] of Object.entries(source)) {
        if (key in result) {
          if (options.conflictResolution === 'error') {
            throw new Error(`Merge conflict for key: ${key}`);
          } else if (options.conflictResolution === 'first-wins') {
            continue; // Keep target value
          }
          // 'last-wins' or default behavior
          result[key] = this.mergeTwo(result[key], value, options, depth + 1);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    }

    return source;
  }

  /**
   * Creates debounced file change handler
   */
  private createDebouncedWatchHandler(filePath: string): (eventType: string, filename: string | null) => void {
    let timeout: NodeJS.Timeout;
    
    return (eventType: string, filename: string | null) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.handleWatchEvent(filePath, eventType, filename);
      }, CONFIG_LOADER_CONSTANTS.DEFAULT_WATCH_DEBOUNCE_MS);
    };
  }

  /**
   * Handles file watch events
   */
  private handleWatchEvent(filePath: string, eventType: string, filename: string | null): void {
    const callbacks = this.watchCallbacks.get(filePath);
    if (!callbacks) return;

    const event: FileChangeEvent = {
      type: this.mapWatchEventType(eventType),
      filePath,
      timestamp: Date.now()
    };

    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in file watch callback: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Maps native file system events to our event types
   */
  private mapWatchEventType(eventType: string): FileChangeEvent['type'] {
    switch (eventType.toLowerCase()) {
      case 'change':
        return 'modified';
      case 'rename':
        return 'renamed';
      default:
        return 'modified';
    }
  }

  /**
   * Handles file change events and reloads configuration
   */
  private async handleFileChange(event: FileChangeEvent, originalConfig: ConfigurationData): Promise<void> {
    try {
      if (event.type === 'modified') {
        const reloadedConfig = await this.loadFromFile(event.filePath);
        await this.transferConfigurationData(reloadedConfig);
      }
    } catch (error) {
      console.error(`Error handling file change: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfers configuration data to connected modules
   */
  private async transferConfigurationData(configData: ConfigurationData): Promise<void> {
    await this.transferData({
      type: CONFIG_LOADER_CONSTANTS.DATA_TRANSFER_TYPES.CONFIG_DATA,
      data: configData,
      timestamp: Date.now()
    });
  }

  /**
   * Transfers error data to connected modules
   */
  private async transferErrorData(errorData: any): Promise<void> {
    await this.transferData({
      type: CONFIG_LOADER_CONSTANTS.DATA_TRANSFER_TYPES.ERROR_EVENT,
      data: errorData,
      timestamp: Date.now()
    });
  }

  /**
   * Generates unique operation ID
   */
  private generateOperationId(): string {
    return `${CONFIG_LOADER_CONSTANTS.MODULE_TYPE}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validates operation limits
   */
  private async validateOperationLimits(operationId: string): Promise<void> {
    if (this.activeOperations.size >= CONFIG_LOADER_CONSTANTS.MAX_CONCURRENT_OPERATIONS) {
      throw new Error(CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.MAX_OPERATIONS_EXCEEDED);
    }
    this.activeOperations.add(operationId);
  }

  /**
   * Sets operation timeout
   */
  private setOperationTimeout(operationId: string, timeoutMs: number): void {
    const timeout = setTimeout(() => {
      this.cleanupOperation(operationId);
      throw new Error(CONFIG_LOADER_CONSTANTS.ERROR_MESSAGES.TIMEOUT_EXCEEDED);
    }, timeoutMs);
    
    this.operationTimeouts.set(operationId, timeout);
  }

  /**
   * Cleans up operation resources
   */
  private cleanupOperation(operationId: string): void {
    this.activeOperations.delete(operationId);
    
    const timeout = this.operationTimeouts.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      this.operationTimeouts.delete(operationId);
    }
  }

  /**
   * Gets cached configuration if available and valid
   */
  private getCachedConfig(filePath: string): ConfigurationData | null {
    const cached = this.configCache.get(path.resolve(filePath));
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CONFIG_LOADER_CONSTANTS.CACHE_TTL_MS) {
      this.configCache.delete(path.resolve(filePath));
      return null;
    }

    return cached.data;
  }

  /**
   * Caches configuration data
   */
  private cacheConfig(filePath: string, configData: ConfigurationData): void {
    // Implement LRU cache behavior
    if (this.configCache.size >= CONFIG_LOADER_CONSTANTS.MAX_CACHED_CONFIGS) {
      const oldestKey = this.configCache.keys().next().value;
      this.configCache.delete(oldestKey);
    }

    this.configCache.set(path.resolve(filePath), {
      data: configData,
      timestamp: Date.now()
    });
  }

  /**
   * Handles load requests from other modules
   */
  private async handleLoadRequest(data: any): Promise<void> {
    try {
      const { filePath, options } = data;
      const configData = await this.loadFromFile(filePath, options);
      await this.transferConfigurationData(configData);
    } catch (error) {
      await this.transferErrorData({
        type: 'load-error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handles watch requests from other modules
   */
  private async handleWatchRequest(data: any): Promise<void> {
    try {
      const { filePath, enable } = data;
      if (enable) {
        this.watchFile(filePath, (event) => {
          this.transferData({
            type: CONFIG_LOADER_CONSTANTS.DATA_TRANSFER_TYPES.FILE_CHANGE_EVENT,
            data: event,
            timestamp: Date.now()
          });
        });
      } else {
        this.stopWatching(filePath);
      }
    } catch (error) {
      await this.transferErrorData({
        type: 'watch-error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handles merge requests from other modules
   */
  private async handleMergeRequest(data: any): Promise<void> {
    try {
      const { configs, options } = data;
      const mergedConfig = await this.mergeConfigurations(configs, options);
      await this.transferConfigurationData(mergedConfig);
    } catch (error) {
      await this.transferErrorData({
        type: 'merge-error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Performs comprehensive cleanup of resources
   */
  private async cleanup(): Promise<void> {
    // Stop all file watchers
    for (const [filePath, watcher] of this.fileWatchers) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`Error closing watcher for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.fileWatchers.clear();
    this.watchCallbacks.clear();

    // Clear all timeouts
    for (const timeout of this.operationTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.operationTimeouts.clear();

    // Clear active operations
    this.activeOperations.clear();

    // Clear cache
    this.configCache.clear();

    console.log('ConfigLoaderModule cleanup completed');
  }

  /**
   * Report an error to the error handler module
   * @param errorData - Error data to report
   */
  private reportError(errorData: any): void {
    try {
      this.sendMessage('error_report', {
        sourceModule: this.info.id,
        error: errorData,
        timestamp: Date.now()
      }, 'error-handler');
    } catch (error) {
      console.error('Failed to report error to error handler:', error);
    }
  }

  /**
   * Gets the module information
   * @returns Module information
   */
  public get getModuleInfo(): ModuleInfo {
    return { ...this.info };
  }
  
  /**
   * Gets the module configuration
   * @returns Module configuration
   */
  public get moduleConfig(): Record<string, any> {
    return { ...this.config };
  }
}

// Default export
export default ConfigLoaderModule;