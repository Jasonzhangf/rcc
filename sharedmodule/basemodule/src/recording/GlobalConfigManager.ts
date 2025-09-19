import {
  GlobalRecordingConfig,
  BaseModuleRecordingConfig,
  ConfigUpdateResult,
  ConfigSyncResult,
  ConsistencyValidationResult,
  ConfigChangeCallback,
  ValidatedRecordingConfig
} from '../interfaces/Recording';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global configuration manager that ensures consistent configuration across modules
 */
export class GlobalConfigManager {
  private globalConfig: GlobalRecordingConfig;
  private configSubscribers: Map<string, ConfigChangeCallback> = new Map();
  private validationHistory: Map<string, ConsistencyValidationResult> = new Map();
  private consistencyInterval: NodeJS.Timeout | null = null;
  private moduleConfigs: Map<string, BaseModuleRecordingConfig> = new Map();

  constructor(baseConfig: BaseModuleRecordingConfig = {}) {
    this.globalConfig = this.initializeGlobalConfig(baseConfig);
    this.startConsistencyValidation();
  }

  // ========================================
  // Global Configuration Management
  // ========================================

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalRecordingConfig {
    return { ...this.globalConfig };
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfig(updates: Partial<GlobalRecordingConfig>): Promise<ConfigUpdateResult> {
    try {
      const oldConfig = { ...this.globalConfig };

      // Update configuration
      this.globalConfig = {
        ...this.globalConfig,
        ...updates,
        lastUpdated: Date.now()
      };

      // Generate new version
      this.globalConfig.configVersion = this.generateConfigVersion();

      // Validate consistency
      const validationResult = this.validateGlobalConsistency();
      if (!validationResult.valid) {
        this.globalConfig = oldConfig; // Rollback
        return {
          success: false,
          errors: validationResult.errors,
          requiresForce: true
        };
      }

      // Notify subscribers
      await this.notifySubscribers(this.globalConfig.baseConfig);

      return {
        success: true,
        configVersion: this.globalConfig.configVersion
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Register module configuration
   */
  registerModuleConfig(moduleId: string, config: BaseModuleRecordingConfig): ConfigUpdateResult {
    try {
      const validatedConfig = this.validateModuleConfig(config);
      if (!validatedConfig.isValid) {
        return {
          success: false,
          errors: validatedConfig.errors
        };
      }

      this.moduleConfigs.set(moduleId, config);

      // Update global overrides
      this.globalConfig.moduleOverrides.set(moduleId, config);

      // Update timestamp
      this.globalConfig.lastUpdated = Date.now();

      return {
        success: true,
        configVersion: this.globalConfig.configVersion
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Unregister module configuration
   */
  unregisterModuleConfig(moduleId: string): boolean {
    const removed = this.moduleConfigs.delete(moduleId);
    if (removed) {
      this.globalConfig.moduleOverrides.delete(moduleId);
      this.globalConfig.lastUpdated = Date.now();
    }
    return removed;
  }

  /**
   * Get module configuration
   */
  getModuleConfig(moduleId: string): BaseModuleRecordingConfig | undefined {
    return this.moduleConfigs.get(moduleId);
  }

  /**
   * Get all module configurations
   */
  getAllModuleConfigs(): Record<string, BaseModuleRecordingConfig> {
    const result: Record<string, BaseModuleRecordingConfig> = {};
    for (const [moduleId, config] of this.moduleConfigs.entries()) {
      result[moduleId] = { ...config };
    }
    return result;
  }

  // ========================================
  // Configuration Synchronization
  // ========================================

  /**
   * Synchronize configuration across modules
   */
  async syncConfiguration(moduleConfigs: Record<string, BaseModuleRecordingConfig>): Promise<ConfigSyncResult> {
    const moduleResults: Record<string, boolean> = {};

    for (const [moduleId, config] of Object.entries(moduleConfigs)) {
      try {
        const result = this.registerModuleConfig(moduleId, config);
        moduleResults[moduleId] = result.success;
      } catch (error) {
        moduleResults[moduleId] = false;
      }
    }

    // Notify all subscribers about the sync
    await this.notifySubscribers(this.globalConfig.baseConfig);

    return {
      success: Object.values(moduleResults).every(success => success),
      moduleResults
    };
  }

  /**
   * Force synchronization
   */
  async forceSync(): Promise<ConfigSyncResult> {
    const allConfigs = this.getAllModuleConfigs();
    return await this.syncConfiguration(allConfigs);
  }

  // ========================================
  // Configuration Validation
  // ========================================

  /**
   * Validate global configuration consistency
   */
  validateGlobalConsistency(): ConsistencyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check base configuration validity
    const baseValidation = this.validateModuleConfig(this.globalConfig.baseConfig);
    if (!baseValidation.isValid) {
      errors.push(...baseValidation.errors);
    }

    // Check module override consistency
    for (const [moduleId, config] of this.moduleConfigs.entries()) {
      const moduleValidation = this.validateModuleConfig(config);
      if (!moduleValidation.isValid) {
        errors.push(`Module ${moduleId}: ${moduleValidation.errors.join(', ')}`);
      }

      // Check compatibility with global base config
      const compatibilityResult = this.checkModuleCompatibility(config, this.globalConfig.baseConfig);
      if (!compatibilityResult.valid) {
        warnings.push(`Module ${moduleId}: ${compatibilityResult.warnings.join(', ')}`);
      }
    }

    // Check for conflicts between modules
    const conflictCheck = this.checkModuleConflicts();
    if (conflictCheck.conflicts.length > 0) {
      errors.push(...conflictCheck.conflicts);
    }

    // Store validation result
    const result: ConsistencyValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        modulesValidated: this.moduleConfigs.size,
        conflictsFound: conflictCheck.conflicts.length,
        lastChecked: Date.now()
      }
    };

    this.validationHistory.set(this.globalConfig.configVersion, result);

    return result;
  }

  /**
   * Validate module configuration
   */
  validateModuleConfig(config: BaseModuleRecordingConfig): ValidatedRecordingConfig {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (config.enabled === undefined) {
      warnings.push('Configuration does not specify enabled state');
    }

    // Check cycle configuration consistency
    if (config.cycle?.enabled && !config.basePath) {
      errors.push('Cycle recording requires basePath to be specified');
    }

    // Check error configuration consistency
    if (config.error?.enabled && !config.error.basePath) {
      warnings.push('Error recording enabled but no basePath specified');
    }

    // Check truncation configuration
    if (config.truncation?.enabled) {
      if (config.truncation.defaultMaxLength && config.truncation.defaultMaxLength <= 0) {
        errors.push('Truncation maxLength must be positive');
      }
    }

    return {
      ...config,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check module compatibility with global config
   */
  private checkModuleCompatibility(
    moduleConfig: BaseModuleRecordingConfig,
    globalBaseConfig: BaseModuleRecordingConfig
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check enabled state compatibility
    if (globalBaseConfig.enabled && !moduleConfig.enabled) {
      warnings.push('Module configuration disabled while global config is enabled');
    }

    // Check path compatibility
    if (globalBaseConfig.basePath && moduleConfig.basePath &&
        !moduleConfig.basePath.startsWith(globalBaseConfig.basePath)) {
      warnings.push('Module basePath is not within global basePath');
    }

    // Check truncation compatibility
    if (globalBaseConfig.truncation?.enabled && !moduleConfig.truncation?.enabled) {
      warnings.push('Global truncation enabled but module has truncation disabled');
    }

    return {
      valid: true, // Compatibility issues are warnings, not errors
      warnings
    };
  }

  /**
   * Check for conflicts between modules
   */
  private checkModuleConflicts(): { conflicts: string[] } {
    const conflicts: string[] = [];
    const moduleEntries = Array.from(this.moduleConfigs.entries());

    // Check for path conflicts
    const paths = new Map<string, string[]>();
    for (const [moduleId, config] of moduleEntries) {
      if (config.basePath) {
        if (!paths.has(config.basePath)) {
          paths.set(config.basePath, []);
        }
        paths.get(config.basePath)!.push(moduleId);
      }
    }

    for (const [path, modules] of paths.entries()) {
      if (modules.length > 1) {
        conflicts.push(`Path conflict: ${modules.join(', ')} all using path '${path}'`);
      }
    }

    return { conflicts };
  }

  // ========================================
  // Subscription Management
  // ========================================

  /**
   * Subscribe to configuration changes
   */
  subscribe(moduleId: string, callback: ConfigChangeCallback): void {
    this.configSubscribers.set(moduleId, callback);

    // Send current configuration immediately
    try {
      callback(this.globalConfig.baseConfig);
    } catch (error) {
      console.error(`[GlobalConfigManager] Error sending initial config to ${moduleId}:`, error);
    }
  }

  /**
   * Unsubscribe from configuration changes
   */
  unsubscribe(moduleId: string): boolean {
    return this.configSubscribers.delete(moduleId);
  }

  /**
   * Notify all subscribers of configuration changes
   */
  private async notifySubscribers(config: BaseModuleRecordingConfig): Promise<void> {
    const promises = Array.from(this.configSubscribers.entries()).map(async ([moduleId, callback]) => {
      try {
        await callback(config);
      } catch (error) {
        console.error(`[GlobalConfigManager] Error notifying ${moduleId} of config change:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // ========================================
  // Consistency Validation
  // ========================================

  /**
   * Start consistency validation interval
   */
  private startConsistencyValidation(): void {
    if (this.consistencyInterval) {
      clearInterval(this.consistencyInterval);
    }

    this.consistencyInterval = setInterval(() => {
      if (this.globalConfig.consistency.enforced) {
        const result = this.validateGlobalConsistency();
        if (!result.valid) {
          console.warn('[GlobalConfigManager] Consistency validation failed:', result.errors);
        }
      }
    }, this.globalConfig.consistency.validationInterval);
  }

  /**
   * Stop consistency validation
   */
  stopConsistencyValidation(): void {
    if (this.consistencyInterval) {
      clearInterval(this.consistencyInterval);
      this.consistencyInterval = null;
    }
  }

  /**
   * Get validation history
   */
  getValidationHistory(version?: string): ConsistencyValidationResult[] {
    if (version) {
      const result = this.validationHistory.get(version);
      return result ? [result] : [];
    }

    return Array.from(this.validationHistory.values());
  }

  /**
   * Get latest validation result
   */
  getLatestValidation(): ConsistencyValidationResult | undefined {
    const versions = Array.from(this.validationHistory.keys()).sort();
    if (versions.length === 0) return undefined;
    return this.validationHistory.get(versions[versions.length - 1]);
  }

  // ========================================
  // Configuration Export/Import
  // ========================================

  /**
   * Export configuration
   */
  exportConfiguration(): {
    globalConfig: GlobalRecordingConfig;
    moduleConfigs: Record<string, BaseModuleRecordingConfig>;
    exportTime: number;
    version: string;
  } {
    return {
      globalConfig: this.getGlobalConfig(),
      moduleConfigs: this.getAllModuleConfigs(),
      exportTime: Date.now(),
      version: this.globalConfig.configVersion
    };
  }

  /**
   * Import configuration
   */
  async importConfiguration(
    data: {
      globalConfig: GlobalRecordingConfig;
      moduleConfigs: Record<string, BaseModuleRecordingConfig>;
    },
    force = false
  ): Promise<ConfigUpdateResult> {
    try {
      // Import global config
      const globalResult = await this.updateGlobalConfig(data.globalConfig);
      if (!globalResult.success && !force) {
        return globalResult;
      }

      // Import module configs
      const syncResult = await this.syncConfiguration(data.moduleConfigs);
      if (!syncResult.success && !force) {
        return {
          success: false,
          errors: ['Module configuration synchronization failed']
        };
      }

      return {
        success: true,
        configVersion: this.globalConfig.configVersion
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  private initializeGlobalConfig(baseConfig: BaseModuleRecordingConfig): GlobalRecordingConfig {
    return {
      sessionId: uuidv4(),
      environment: process.env.NODE_ENV as any || 'development',
      version: '1.0.0',
      baseConfig,
      moduleOverrides: new Map(),
      configVersion: '1.0.0',
      lastUpdated: Date.now(),
      consistency: {
        enforced: true,
        validationInterval: 60000, // 1 minute
        allowedDeviations: []
      }
    };
  }

  private generateConfigVersion(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    moduleCount: number;
    subscriberCount: number;
    validationCount: number;
    lastValidation: ConsistencyValidationResult | undefined;
    configVersion: string;
    uptime: number;
  } {
    const latestValidation = this.getLatestValidation();
    const uptime = Date.now() - this.globalConfig.lastUpdated;

    return {
      moduleCount: this.moduleConfigs.size,
      subscriberCount: this.configSubscribers.size,
      validationCount: this.validationHistory.size,
      lastValidation: latestValidation,
      configVersion: this.globalConfig.configVersion,
      uptime
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopConsistencyValidation();
    this.configSubscribers.clear();
    this.moduleConfigs.clear();
    this.validationHistory.clear();
  }
}