import {
  BaseModuleRecordingConfig,
  ValidatedRecordingConfig,
  CycleRecordingConfig,
  ErrorRecordingConfig,
  FieldTruncationConfig,
  FileManagementConfig,
  GlobalRecordingConfig,
  ChainConfigValidationResult,
  GlobalConsistencyResult,
  ConsistencyValidationResult
} from '../interfaces/Recording';
import { UnderConstruction } from 'rcc-underconstruction';
const underConstruction = new UnderConstruction();

/**
 * Configuration validator that ensures all recording configurations are valid
 */
export class ConfigValidator {
  private validationRules: Map<string, (config: any) => string[]> = new Map();
  private currentConfig: BaseModuleRecordingConfig;

  constructor(config?: BaseModuleRecordingConfig) {
    this.currentConfig = config || {};
    this.initializeValidationRules();
  }

  // ========================================
  // Main Validation Methods
  // ========================================

  /**
   * Validate configuration with defaults (legacy method for backward compatibility)
   */
  validateConfig(config: BaseModuleRecordingConfig): BaseModuleRecordingConfig {
    const defaultBasePath = './recording-logs';

    // Basic validation with defaults
    const validatedConfig: BaseModuleRecordingConfig = {
      enabled: config.enabled ?? false,
      basePath: config.basePath || defaultBasePath,
      port: config.port,
      cycle: {
        enabled: config.cycle?.enabled ?? false,
        mode: config.cycle?.mode || 'single',
        basePath: config.cycle?.basePath || config.basePath || defaultBasePath,
        cycleDirTemplate: config.cycle?.cycleDirTemplate || 'cycles/${cycleId}',
        mainFileTemplate: config.cycle?.mainFileTemplate || 'main.${format}',
        summaryFileTemplate: config.cycle?.summaryFileTemplate || 'summary.json',
        format: config.cycle?.format || 'json',
        includeIndex: config.cycle?.includeIndex ?? true,
        includeTimestamp: config.cycle?.includeTimestamp ?? true,
        autoCreateDirectory: config.cycle?.autoCreateDirectory ?? true,
        autoCloseOnComplete: config.cycle?.autoCloseOnComplete ?? true,
        maxCyclesRetained: config.cycle?.maxCyclesRetained || 100
      },
      error: {
        enabled: config.error?.enabled ?? false,
        levels: config.error?.levels || ['error', 'fatal'],
        categories: config.error?.categories || ['system', 'processing'],
        basePath: config.error?.basePath || config.basePath || defaultBasePath,
        indexFileTemplate: config.error?.indexFileTemplate || 'errors/index.jsonl',
        detailFileTemplate: config.error?.detailFileTemplate || 'errors/${errorId}.json',
        summaryFileTemplate: config.error?.summaryFileTemplate || 'errors/summary.json',
        dailyDirTemplate: config.error?.dailyDirTemplate || 'errors/${date}',
        indexFormat: config.error?.indexFormat || 'jsonl',
        detailFormat: config.error?.detailFormat || 'json',
        autoRecoveryTracking: config.error?.autoRecoveryTracking ?? true,
        maxErrorsRetained: config.error?.maxErrorsRetained || 1000,
        enableStatistics: config.error?.enableStatistics ?? true
      },
      truncation: config.truncation,
      file: {
        autoCleanup: config.file?.autoCleanup ?? true,
        maxFileAge: config.file?.maxFileAge || 7 * 24 * 60 * 60 * 1000, // 7 days
        maxFileSize: config.file?.maxFileSize || 10 * 1024 * 1024, // 10MB
        atomicWrites: config.file?.atomicWrites ?? true,
        backupOnWrite: config.file?.backupOnWrite ?? true,
        compressionEnabled: config.file?.compressionEnabled ?? false
      }
    };

    // Validate configuration dependencies
    const validationResult = this.validateConfiguration(validatedConfig);
    if (validationResult) {
      throw new Error(validationResult);
    }

    return validatedConfig;
  }

  /**
   * Validate configuration and return first error (legacy method for backward compatibility)
   */
  validateConfiguration(config: BaseModuleRecordingConfig): string | null {
    const errors = this.validateTopLevelConfig(config);
    if (errors.length > 0) {
      return errors[0];
    }
    return null;
  }

  /**
   * Validate configuration consistency (legacy method for backward compatibility)
   */
  validateConfigurationConsistency(): ConsistencyValidationResult {
    // Feature: Configuration consistency validation
    underConstruction.callUnderConstructionFeature('configuration-consistency-validation', {
      caller: 'ConfigValidator.validateConfigurationConsistency',
      parameters: {
        validationScope: 'all-components',
        strictMode: true
      },
      purpose: 'Validate consistency across all recording configuration components'
    });
    return {
      valid: true,
      errors: [],
      warnings: [],
      details: {}
    };
  }

  /**
   * Validate complete recording configuration
   */
  validateRecordingConfig(config: BaseModuleRecordingConfig): ValidatedRecordingConfig {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate top-level configuration
    errors.push(...this.validateTopLevelConfig(config));

    // Validate sub-configurations if enabled
    if (config.cycle?.enabled) {
      errors.push(...this.validateCycleConfig(config.cycle));
    }

    if (config.error?.enabled) {
      errors.push(...this.validateErrorConfig(config.error));
    }

    if (config.truncation?.enabled) {
      errors.push(...this.validateTruncationConfig(config.truncation));
    }

    if (config.file) {
      errors.push(...this.validateFileConfig(config.file));
    }

    // Check cross-configuration dependencies
    errors.push(...this.validateConfigDependencies(config));

    return {
      ...config,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate global recording configuration
   */
  validateGlobalConfig(config: GlobalRecordingConfig): GlobalConsistencyResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate base configuration
    const baseValidation = this.validateRecordingConfig(config.baseConfig);
    if (!baseValidation.isValid) {
      errors.push(...baseValidation.errors);
    }

    // Validate module overrides
    for (const [moduleId, moduleConfig] of config.moduleOverrides.entries()) {
      const moduleValidation = this.validateRecordingConfig(moduleConfig);
      if (!moduleValidation.isValid) {
        errors.push(`Module ${moduleId}: ${moduleValidation.errors.join(', ')}`);
      }
    }

    // Validate consistency settings
    errors.push(...this.validateConsistencySettings(config.consistency));

    // Check version compatibility
    if (!this.isValidVersion(config.version)) {
      warnings.push(`Invalid version format: ${config.version}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        modulesValidated: config.moduleOverrides.size,
        baseConfigValid: baseValidation.isValid,
        consistencySettingsValid: errors.filter(e => e.includes('consistency')).length === 0
      }
    };
  }

  /**
   * Validate chain configuration (multiple related modules)
   */
  validateChainConfig(moduleConfigs: Record<string, BaseModuleRecordingConfig>): ChainConfigValidationResult {
    const moduleIssues: Record<string, string[]> = {};
    const globalErrors: string[] = [];
    const globalWarnings: string[] = [];

    // Validate each module individually
    for (const [moduleId, config] of Object.entries(moduleConfigs)) {
      const validation = this.validateRecordingConfig(config);
      if (!validation.isValid) {
        moduleIssues[moduleId] = validation.errors;
      }
      if (validation.warnings.length > 0) {
        if (!moduleIssues[moduleId]) {
          moduleIssues[moduleId] = [];
        }
        moduleIssues[moduleId].push(...validation.warnings);
      }
    }

    // Validate cross-module consistency
    const crossModuleIssues = this.validateCrossModuleConsistency(moduleConfigs);
    globalErrors.push(...crossModuleIssues.errors);
    globalWarnings.push(...crossModuleIssues.warnings);

    return {
      valid: globalErrors.length === 0 && Object.keys(moduleIssues).length === 0,
      errors: globalErrors,
      warnings: globalWarnings,
      moduleIssues
    };
  }

  // ========================================
  // Configuration Section Validators
  // ========================================

  private validateTopLevelConfig(config: BaseModuleRecordingConfig): string[] {
    const errors: string[] = [];

    // Check required fields
    if (config.enabled === undefined) {
      errors.push('enabled field is required');
    }

    if (config.enabled && !config.basePath) {
      errors.push('basePath is required when recording is enabled');
    }

    // Validate basePath format
    if (config.basePath) {
      errors.push(...this.validatePath(config.basePath, 'basePath'));
    }

    // Validate port if specified
    if (config.port !== undefined) {
      if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        errors.push('port must be an integer between 1 and 65535');
      }
    }

    return errors;
  }

  private validateCycleConfig(config: CycleRecordingConfig): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!config.mode || !['disabled', 'single', 'cyclic'].includes(config.mode)) {
      errors.push('cycle mode must be one of: disabled, single, cyclic');
    }

    // Validate path templates
    if (config.cycleDirTemplate) {
      errors.push(...this.validateTemplate(config.cycleDirTemplate, 'cycleDirTemplate'));
    }

    if (config.mainFileTemplate) {
      errors.push(...this.validateTemplate(config.mainFileTemplate, 'mainFileTemplate'));
    }

    // Validate format
    if (config.format && !['json', 'jsonl', 'csv'].includes(config.format)) {
      errors.push('cycle format must be one of: json, jsonl, csv');
    }

    // Validate numeric values
    if (config.maxCyclesRetained !== undefined && config.maxCyclesRetained < 1) {
      errors.push('maxCyclesRetained must be at least 1');
    }

    return errors;
  }

  private validateErrorConfig(config: ErrorRecordingConfig): string[] {
    const errors: string[] = [];

    // Validate levels
    if (config.levels) {
      const validLevels = ['trace', 'debug', 'info', 'warning', 'error', 'fatal'];
      const invalidLevels = config.levels.filter(level => !validLevels.includes(level));
      if (invalidLevels.length > 0) {
        errors.push(`Invalid error levels: ${invalidLevels.join(', ')}`);
      }
    }

    // Validate categories
    if (config.categories) {
      const validCategories = ['network', 'validation', 'processing', 'system', 'security', 'business'];
      const invalidCategories = config.categories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        errors.push(`Invalid error categories: ${invalidCategories.join(', ')}`);
      }
    }

    // Validate path templates
    if (config.indexFileTemplate) {
      errors.push(...this.validateTemplate(config.indexFileTemplate, 'indexFileTemplate'));
    }

    if (config.detailFileTemplate) {
      errors.push(...this.validateTemplate(config.detailFileTemplate, 'detailFileTemplate'));
    }

    // Validate formats
    if (config.indexFormat && !['jsonl', 'csv'].includes(config.indexFormat)) {
      errors.push('error indexFormat must be jsonl or csv');
    }

    if (config.detailFormat && !['json', 'pretty'].includes(config.detailFormat)) {
      errors.push('error detailFormat must be json or pretty');
    }

    // Validate numeric values
    if (config.maxErrorsRetained !== undefined && config.maxErrorsRetained < 1) {
      errors.push('maxErrorsRetained must be at least 1');
    }

    return errors;
  }

  private validateTruncationConfig(config: FieldTruncationConfig): string[] {
    const errors: string[] = [];

    // Validate default strategy
    if (config.defaultStrategy && !['truncate', 'replace', 'hide'].includes(config.defaultStrategy)) {
      errors.push('defaultStrategy must be one of: truncate, replace, hide');
    }

    // Validate default max length
    if (config.defaultMaxLength !== undefined && config.defaultMaxLength < 1) {
      errors.push('defaultMaxLength must be at least 1');
    }

    // Validate field rules
    if (config.fields) {
      for (let i = 0; i < config.fields.length; i++) {
        const rule = config.fields[i];
        errors.push(...this.validateFieldRule(rule, `fields[${i}]`));
      }
    }

    // Validate path patterns
    if (config.pathPatterns) {
      for (let i = 0; i < config.pathPatterns.length; i++) {
        const pattern = config.pathPatterns[i];
        errors.push(...this.validatePathPattern(pattern, `pathPatterns[${i}]`));
      }
    }

    // Validate array truncation limit
    if (config.arrayTruncateLimit !== undefined && config.arrayTruncateLimit < 1) {
      errors.push('arrayTruncateLimit must be at least 1');
    }

    return errors;
  }

  private validateFileConfig(config: FileManagementConfig): string[] {
    const errors: string[] = [];

    // Validate numeric values
    if (config.maxFileAge !== undefined && config.maxFileAge < 0) {
      errors.push('maxFileAge must be non-negative');
    }

    if (config.maxFileSize !== undefined && config.maxFileSize < 1) {
      errors.push('maxFileSize must be at least 1');
    }

    return errors;
  }

  // ========================================
  // Cross-Validation Methods
  // ========================================

  private validateConfigDependencies(config: BaseModuleRecordingConfig): string[] {
    const errors: string[] = [];

    // Check that cycle recording has proper base path
    if (config.cycle?.enabled && !config.basePath) {
      errors.push('Cycle recording requires basePath to be specified');
    }

    // Check that error recording has proper base path
    if (config.error?.enabled && !config.basePath) {
      errors.push('Error recording requires basePath to be specified');
    }

    // Check truncation dependencies
    if (config.truncation?.enabled && (!config.cycle?.enabled && !config.error?.enabled)) {
      errors.push('Truncation requires either cycle or error recording to be enabled');
    }

    return errors;
  }

  private validateCrossModuleConsistency(moduleConfigs: Record<string, BaseModuleRecordingConfig>): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const configs = Object.values(moduleConfigs);

    // Check for consistent enabled states
    const enabledStates = configs.map(c => c.enabled);
    if (new Set(enabledStates).size > 1) {
      warnings.push('Modules have inconsistent enabled states');
    }

    // Check for path conflicts
    const basePaths = configs.map(c => c.basePath).filter(Boolean);
    if (new Set(basePaths).size !== basePaths.length) {
      errors.push('Multiple modules are using the same basePath');
    }

    // Check for format consistency
    const cycleFormats = configs.map(c => c.cycle?.format).filter(Boolean);
    if (new Set(cycleFormats).size > 1) {
      warnings.push('Modules have inconsistent cycle recording formats');
    }

    // Check for port conflicts
    const ports = configs.map(c => c.port).filter(Boolean);
    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.push('Multiple modules are configured to use the same port');
    }

    return { errors, warnings };
  }

  private validateConsistencySettings(consistency: any): string[] {
    const errors: string[] = [];

    if (consistency.validationInterval !== undefined && consistency.validationInterval < 1000) {
      errors.push('validationInterval must be at least 1000ms');
    }

    if (consistency.allowedDeviations && !Array.isArray(consistency.allowedDeviations)) {
      errors.push('allowedDeviations must be an array');
    }

    return errors;
  }

  // ========================================
  // Helper Validators
  // ========================================

  private validatePath(path: string, fieldName: string): string[] {
    const errors: string[] = [];

    if (typeof path !== 'string' || path.trim() === '') {
      errors.push(`${fieldName} must be a non-empty string`);
      return errors;
    }

    // Check for invalid characters
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    if (invalidChars.some(char => path.includes(char))) {
      errors.push(`${fieldName} contains invalid characters: ${invalidChars.join(', ')}`);
    }

    // Check path length
    if (path.length > 260) {
      errors.push(`${fieldName} is too long (max 260 characters)`);
    }

    return errors;
  }

  private validateTemplate(template: string, fieldName: string): string[] {
    const errors: string[] = [];

    if (typeof template !== 'string' || template.trim() === '') {
      errors.push(`${fieldName} must be a non-empty string`);
      return errors;
    }

    // Check for invalid template variables
    const invalidVariables = template.match(/\$\{([^}]+)\}/g);
    if (invalidVariables) {
      const validVariables = ['cycleId', 'requestId', 'sessionId', 'timestamp', 'date', 'time', 'format', 'type', 'index', 'errorId'];
      const invalidVars = invalidVariables.filter(v => {
        const varName = v.replace(/[${}]/g, '');
        return !validVariables.includes(varName);
      });

      if (invalidVars.length > 0) {
        errors.push(`${fieldName} contains invalid template variables: ${invalidVars.join(', ')}`);
      }
    }

    return errors;
  }

  private validateFieldRule(rule: any, fieldPath: string): string[] {
    const errors: string[] = [];

    if (!rule.fieldPath || typeof rule.fieldPath !== 'string') {
      errors.push(`${fieldPath}.fieldPath is required and must be a string`);
    }

    if (rule.strategy && !['truncate', 'replace', 'hide'].includes(rule.strategy)) {
      errors.push(`${fieldPath}.strategy must be one of: truncate, replace, hide`);
    }

    if (rule.maxLength !== undefined && rule.maxLength < 1) {
      errors.push(`${fieldPath}.maxLength must be at least 1`);
    }

    if (rule.priority !== undefined && (!Number.isInteger(rule.priority) || rule.priority < 0)) {
      errors.push(`${fieldPath}.priority must be a non-negative integer`);
    }

    return errors;
  }

  private validatePathPattern(pattern: any, fieldPath: string): string[] {
    const errors: string[] = [];

    if (!pattern.pattern || typeof pattern.pattern !== 'string') {
      errors.push(`${fieldPath}.pattern is required and must be a string`);
    }

    if (pattern.condition && !['always', 'if_long', 'if_nested'].includes(pattern.condition)) {
      errors.push(`${fieldPath}.condition must be one of: always, if_long, if_nested`);
    }

    if (pattern.strategy && !['truncate', 'replace', 'hide'].includes(pattern.strategy)) {
      errors.push(`${fieldPath}.strategy must be one of: truncate, replace, hide`);
    }

    if (pattern.maxLength !== undefined && pattern.maxLength < 1) {
      errors.push(`${fieldPath}.maxLength must be at least 1`);
    }

    return errors;
  }

  private isValidVersion(version: string): boolean {
    // Simple version validation (semantic versioning pattern)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
    return versionRegex.test(version);
  }

  // ========================================
  // Validation Rules Management
  // ========================================

  private initializeValidationRules(): void {
    // Add custom validation rules if needed
    this.validationRules.set('customPathRule', (config: any) => {
      const errors: string[] = [];
      // Custom validation logic
      return errors;
    });
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(name: string, rule: (config: any) => string[]): void {
    this.validationRules.set(name, rule);
  }

  /**
   * Remove custom validation rule
   */
  removeValidationRule(name: string): boolean {
    return this.validationRules.delete(name);
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): Array<{ name: string; description: string }> {
    return Array.from(this.validationRules.keys()).map(name => ({
      name,
      description: `Custom validation rule: ${name}`
    }));
  }
}