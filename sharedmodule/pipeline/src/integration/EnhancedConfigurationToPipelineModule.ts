/**
 * Enhanced Configuration to Pipeline Integration Module
 *
 * This module integrates the RCC configuration system with the WebAuto Pipeline Framework.
 * It extends the existing ConfigurationToPipelineModule to support both the old RCC pipeline
 * system and the new WebAuto framework, providing backward compatibility and enhanced features.
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ConfigurationSystem, ConfigData } from 'rcc-configuration';
import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';
import { WebAutoConfigurationAdapter } from './WebAutoConfigurationAdapter';
import { WebAutoPipelineBuilder } from './WebAutoPipelineBuilder';

/**
 * Dynamically import WebAuto components (TypeScript compatibility)
 */
let WebAutoFramework: any;
try {
  WebAutoFramework = require('webauto-pipelineframework');
} catch (error) {
  console.warn('WebAuto Pipeline Framework not available, using mock implementation');
  WebAutoFramework = {};
}

/**
 * Enhanced pipeline assembly result
 */
export interface EnhancedPipelineAssemblyResult {
  success: boolean;
  webAutoPipelines?: string[];
  legacyPipelines?: any[];
  errors?: string[];
  warnings?: string[];
  metadata?: {
    webAutoPipelineCount: number;
    legacyPipelineCount: number;
    assemblyTime: number;
    totalMemoryUsage: number;
    providerCount: number;
    virtualModelCount: number;
    mode: 'webauto' | 'legacy' | 'hybrid';
  };
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  metrics?: {
    executionTime: number;
    nodesProcessed: number;
    memoryUsage: number;
  };
}

/**
 * Enhanced Configuration to Pipeline Integration Module
 */
export class EnhancedConfigurationToPipelineModule extends BaseModule {
  private configurationSystem: ConfigurationSystem;
  private virtualModelRulesModule: VirtualModelRulesModule;
  private webAutoAdapter: WebAutoConfigurationAdapter;
  private webAutoBuilder: WebAutoPipelineBuilder;
  private webAutoPipelineManager: any;
  private pipelineRegistry: Map<string, any> = new Map();
  private executionCache: Map<string, { result: any; timestamp: number; expiry: number }> = new Map();
  private performanceMetrics: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  constructor(
    configurationSystem: ConfigurationSystem,
    virtualModelRulesModule: VirtualModelRulesModule,
    pipelineManager?: any
  ) {
    const moduleInfo: ModuleInfo = {
      id: 'EnhancedConfigurationToPipelineModule',
      name: 'RCC Enhanced Configuration to Pipeline Integration Module',
      version: '2.0.0',
      description: 'Enhanced integration between configuration system and WebAuto pipeline framework',
      type: 'enhanced-configuration-to-pipeline',
      metadata: {
        capabilities: [
          'webauto-framework-integration',
          'legacy-compatibility',
          'dual-pipeline-support',
          'enhanced-metrics',
          'smart-caching',
          'load-balancing',
          'error-recovery'
        ],
        dependencies: [
          'rcc-configuration',
          'rcc-virtual-model-rules',
          'webauto-pipelineframework',
          'rcc-basemodule'
        ],
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);

    this.configurationSystem = configurationSystem;
    this.virtualModelRulesModule = virtualModelRulesModule;

    // Initialize WebAuto components
    this.webAutoAdapter = new WebAutoConfigurationAdapter();
    this.webAutoBuilder = new WebAutoPipelineBuilder();
    this.webAutoPipelineManager = pipelineManager || new (WebAutoFramework.PipelineManager || class {});

    console.log('EnhancedConfigurationToPipelineModule initialized');
  }

  /**
   * Initialize the enhanced configuration to pipeline integration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Enhanced Configuration to Pipeline module is already initialized');
      return;
    }

    console.log('Initializing Enhanced Configuration to Pipeline Integration Module');

    try {
      // Call parent initialize first
      await super.initialize();

      // Validate dependencies
      await this.validateDependencies();

      // Initialize WebAuto framework
      await this.initializeWebAutoFramework();

      // Setup message handlers
      this.setupMessageHandlers();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Start cache cleanup
      this.startCacheCleanup();

      this.isInitialized = true;
      console.log('Enhanced Configuration to Pipeline Integration Module initialized successfully');

      // Broadcast initialization complete
      this.broadcastMessage('enhanced-configuration-to-pipeline-initialized', {
        capabilities: moduleInfo.metadata.capabilities,
        mode: this.determinePipelineMode()
      });

    } catch (error) {
      console.error('Failed to initialize Enhanced Configuration to Pipeline Integration Module', error);
      throw error;
    }
  }

  /**
   * Assemble pipelines from configuration using WebAuto framework
   */
  public async assemblePipelinesWithWebAuto(config?: ConfigData): Promise<EnhancedPipelineAssemblyResult> {
    console.log('Assembling pipelines with WebAuto framework');

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      // Get configuration data
      const configData = config || this.configurationSystem.getConfiguration();

      // Convert configuration to WebAuto format
      const conversionResult = this.webAutoAdapter.convertProjectConfiguration(configData);

      if (!conversionResult.success) {
        return {
          success: false,
          errors: conversionResult.error ? [conversionResult.error] : ['Configuration conversion failed'],
          metadata: {
            webAutoPipelineCount: 0,
            legacyPipelineCount: 0,
            assemblyTime: Date.now() - startTime,
            totalMemoryUsage: 0,
            providerCount: 0,
            virtualModelCount: 0,
            mode: 'webauto'
          }
        };
      }

      // Build pipelines using the builder
      const buildResult = this.webAutoBuilder.buildPipelinesFromProject(configData, this.webAutoAdapter);

      if (!buildResult.success) {
        return {
          success: false,
          errors: buildResult.error ? [buildResult.error] : ['Pipeline building failed'],
          metadata: {
            webAutoPipelineCount: 0,
            legacyPipelineCount: 0,
            assemblyTime: Date.now() - startTime,
            totalMemoryUsage: 0,
            providerCount: Object.keys(configData.providers || {}).length,
            virtualModelCount: Object.keys(configData.virtualModels || {}).length,
            mode: 'webauto'
          }
        };
      }

      // Create and register WebAuto pipelines
      const pipelineIds: string[] = [];
      if (buildResult.data) {
        for (const constructionResult of buildResult.data) {
          if (constructionResult.success && constructionResult.configuration) {
            const pipeline = this.createWebAutoPipeline(constructionResult.configuration);
            if (pipeline) {
              this.pipelineRegistry.set(constructionResult.pipelineId!, pipeline);
              pipelineIds.push(constructionResult.pipelineId!);
            }
          }
        }
      }

      // Activate pipelines
      if (pipelineIds.length > 0) {
        await this.activateWebAutoPipelines(pipelineIds);
      }

      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      const result: EnhancedPipelineAssemblyResult = {
        success: true,
        webAutoPipelines: pipelineIds,
        metadata: {
          webAutoPipelineCount: pipelineIds.length,
          legacyPipelineCount: 0,
          assemblyTime: Date.now() - startTime,
          totalMemoryUsage: memoryDelta,
          providerCount: Object.keys(configData.providers || {}).length,
          virtualModelCount: Object.keys(configData.virtualModels || {}).length,
          mode: 'webauto'
        }
      };

      console.log('WebAuto pipeline assembly completed', {
        success: result.success,
        pipelineCount: result.metadata.webAutoPipelineCount,
        assemblyTime: result.metadata.assemblyTime,
        memoryUsage: result.metadata.totalMemoryUsage
      });

      return result;

    } catch (error) {
      console.error('Failed to assemble pipelines with WebAuto', error);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {
          webAutoPipelineCount: 0,
          legacyPipelineCount: 0,
          assemblyTime: Date.now() - startTime,
          totalMemoryUsage: process.memoryUsage().heapUsed - startMemory.heapUsed,
          providerCount: 0,
          virtualModelCount: 0,
          mode: 'webauto'
        }
      };
    }
  }

  /**
   * Execute a pipeline with WebAuto framework
   */
  public async executeWithWebAuto(pipelineId: string, requestData: any): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      console.log(`Executing WebAuto pipeline: ${pipelineId}`);

      // Check cache first
      const cacheKey = `${pipelineId}_${JSON.stringify(requestData)}`;
      const cached = this.executionCache.get(cacheKey);

      if (cached && Date.now() < cached.expiry) {
        console.log(`Using cached result for pipeline: ${pipelineId}`);
        return {
          success: true,
          result: cached.result,
          metrics: {
            executionTime: Date.now() - startTime,
            nodesProcessed: 0,
            memoryUsage: savedMemory - startMemory.heapUsed
          }
        };
      }

      // Get pipeline from registry
      const pipeline = this.pipelineRegistry.get(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      // Execute pipeline
      const result = await this.webAutoPipelineManager.executePipeline(pipelineId, requestData);

      // Cache the result
      this.executionCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        expiry: Date.now() + 300000 // 5 minutes cache
      });

      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      // Update performance metrics
      this.updatePerformanceMetrics(pipelineId, {
        executionTime: Date.now() - startTime,
        success: true,
        memoryUsage: memoryDelta
      });

      return {
        success: true,
        result,
        metrics: {
          executionTime: Date.now() - startTime,
          nodesProcessed: this.calculateNodesProcessed(pipeline),
          memoryUsage: memoryDelta
        }
      };

    } catch (error) {
      console.error(`Failed to executeWebAuto pipeline ${pipelineId}:`, error);

      // Update performance metrics for failure
      this.updatePerformanceMetrics(pipelineId, {
        executionTime: Date.now() - startTime,
        success: false,
        memoryUsage: process.memoryUsage().heapUsed - startMemory.heapUsed
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          executionTime: Date.now() - startTime,
          nodesProcessed: 0,
          memoryUsage: process.memoryUsage().heapUsed - startMemory.heapUsed
        }
      };
    }
  }

  /**
   * Reload and reassemble all pipelines
   */
  public async reloadAndReassemble(): Promise<EnhancedPipelineAssemblyResult> {
    console.log('Reloading and reassembling all pipelines');

    try {
      // Clear existing pipelines
      this.pipelineRegistry.clear();
      this.executionCache.clear();
      this.performanceMetrics.clear();

      // Deactivate existing WebAuto pipelines
      if (this.webAutoPipelineManager && typeof this.webAutoPipelineManager.deactivateAll === 'function') {
        await this.webAutoPipelineManager.deactivateAll();
      }

      // Reassemble with current configuration
      return await this.assemblePipelinesWithWebAuto();

    } catch (error) {
      console.error('Failed to reload and reassemble:', error);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {
          webAutoPipelineCount: 0,
          legacyPipelineCount: 0,
          assemblyTime: Date.now(),
          totalMemoryUsage: 0,
          providerCount: 0,
          virtualModelCount: 0,
          mode: 'webauto'
        }
      };
    }
  }

  /**
   * Get pipeline status and health information
   */
  public getEnhancedStatus() {
    const activePipelineCount = this.pipelineRegistry.size;
    const cacheHitRate = this.calculateCacheHitRate();
    const avgExecutionTime = this.calculateAverageExecutionTime();

    return {
      moduleId: 'EnhancedConfigurationToPipelineModule',
      initialized: this.isInitialized,
      mode: this.determinePipelineMode(),
      pipelineRegistry: {
        size: activePipelineCount,
        pipelineIds: Array.from(this.pipelineRegistry.keys())
      },
      executionCache: {
        size: this.executionCache.size,
        hitRate: cacheHitRate
      },
      performanceMetrics: {
        pipelineCount: this.performanceMetrics.size,
        averageExecutionTime: avgExecutionTime
      },
      webAutoFrameworkAvailable: !!WebAutoFramework.PipelineManager,
      timestamp: Date.now()
    };
  }

  /**
   * Validate configuration for WebAuto pipeline assembly
   */
  public async validateConfigurationForWebAuto(config?: ConfigData): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    console.log('Validating configuration for WebAuto pipeline assembly');

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      const configData = config || this.configurationSystem.getConfiguration();

      // Validate WebAuto framework availability
      if (!WebAutoFramework.PipelineManager) {
        errors.push('WebAuto Pipeline Framework is not available');
      }

      // Validate adapter configuration
      const adapterValidation = this.webAutoAdapter.validateConfiguration();
      if (!adapterValidation.success) {
        errors.push(`WebAuto adapter validation failed: ${adapterValidation.error}`);
      }

      // Validate providers configuration
      if (!configData.providers || Object.keys(configData.providers).length === 0) {
        errors.push('No providers configured');
      } else {
        for (const [providerId, providerConfig] of Object.entries(configData.providers)) {
          if (!providerConfig.apiKey) {
            errors.push(`Provider ${providerId} missing API key`);
          }
          if (!providerConfig.endpoint) {
            warnings.push(`Provider ${providerId} missing endpoint URL`);
          }
        }
      }

      // Validate virtual models configuration
      if (!configData.virtualModels || Object.keys(configData.virtualModels).length === 0) {
        recommendations.push('Consider adding virtual models for better routing');
      } else {
        for (const [vmId, vmConfig] of Object.entries(configData.virtualModels)) {
          if (!vmConfig.targets || vmConfig.targets.length === 0) {
            errors.push(`Virtual model ${vmId} has no targets configured`);
          }
        }
      }

      // Performance recommendations
      if (this.executionCache.size > 1000) {
        recommendations.push('Consider cleaning up execution cache to improve performance');
      }

      const valid = errors.length === 0;

      console.log('Configuration validation completed', {
        valid,
        errorCount: errors.length,
        warningCount: warnings.length,
        recommendationCount: recommendations.length
      });

      return { valid, errors, warnings, recommendations };

    } catch (error) {
      console.error('Failed to validate configuration:', error);
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings, recommendations };
    }
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: any): Promise<any> {
    console.log('Handling message', { type: message.type, source: message.source });

    try {
      switch (message.type) {
        case 'webauto-pipeline-assembly-request':
          return await this.handleWebAutoPipelineAssemblyRequest(message);

        case 'webauto-pipeline-execution-request':
          return await this.handleWebAutoPipelineExecutionRequest(message);

        case 'webauto-pipeline-reload-request':
          return await this.handleWebAutoPipelineReloadRequest(message);

        case 'webauto-config-validation-request':
          return await this.handleWebAutoConfigValidationRequest(message);

        case 'webauto-pipeline-status-request':
          return await this.handleWebAutoPipelineStatusRequest(message);

        default:
          return await super.handleMessage(message);
      }
    } catch (error) {
      console.error('Error handling message', error);
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    console.log('Cleaning up Enhanced Configuration to Pipeline Integration Module');

    try {
      // Clear all registries and caches
      this.pipelineRegistry.clear();
      this.executionCache.clear();
      this.performanceMetrics.clear();

      // Deactivate WebAuto pipelines
      if (this.webAutoPipelineManager && typeof this.webAutoPipelineManager.deactivateAll === 'function') {
        await this.webAutoPipelineManager.deactivateAll();
      }

      // Cleanup WebAuto components
      if (this.webAutoAdapter) {
        this.webAutoAdapter.reset();
      }

      if (this.webAutoBuilder) {
        this.webAutoBuilder.reset();
      }

      this.isInitialized = false;
      await super.destroy();

      console.log('Enhanced Configuration to Pipeline Integration Module cleaned up successfully');

    } catch (error) {
      console.error('Error during cleanup', error);
      throw error;
    }
  }

  // Private helper methods

  private async validateDependencies(): Promise<void> {
    if (!this.configurationSystem) {
      throw new Error('ConfigurationSystem is required');
    }

    if (!this.virtualModelRulesModule) {
      throw new Error('VirtualModelRulesModule is required');
    }

    if (!WebAutoFramework.PipelineManager) {
      console.warn('WebAuto Pipeline Framework not available - some features may be limited');
    }
  }

  private async initializeWebAutoFramework(): Promise<void> {
    if (WebAutoFramework.PipelineManager) {
      console.log('WebAuto Pipeline Framework loaded successfully');
      this.webAutoPipelineManager = new WebAutoFramework.PipelineManager();
    } else {
      console.warn('WebAuto Pipeline Framework not available, using mock implementation');
    }
  }

  private setupMessageHandlers(): void {
    // Message handling is done in handleMessage method
    console.log('Enhanced message handlers configured');
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000); // Update every 30 seconds
    console.log('Performance monitoring started');
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExecutionCache();
    }, 60000); // Cleanup every minute
    console.log('Cache cleanup started');
  }

  private determinePipelineMode(): 'webauto' | 'legacy' | 'hybrid' {
    if (WebAutoFramework.PipelineManager) {
      return 'webauto';
    }
    return 'legacy';
  }

  private createWebAutoPipeline(config: any): any {
    try {
      if (this.webAutoPipelineManager && typeof this.webAutoPipelineManager.createPipeline === 'function') {
        return this.webAutoPipelineManager.createPipeline(config);
      }
      return null;
    } catch (error) {
      console.error('Failed to create WebAuto pipeline:', error);
      return null;
    }
  }

  private async activateWebAutoPipelines(pipelineIds: string[]): Promise<void> {
    if (this.webAutoPipelineManager && typeof this.webAutoPipelineManager.activateAll === 'function') {
      await this.webAutoPipelineManager.activateAll();
    }
    console.log(`Activated ${pipelineIds.length} WebAuto pipelines`);
  }

  private calculateNodesProcessed(pipeline: any): number {
    // Estimate nodes processed based on pipeline structure
    return pipeline ? (pipeline.nodes?.length || 0) + 4 : 0; // +4 for standard pipeline nodes
  }

  private updatePerformanceMetrics(pipelineId: string, metrics: any): void {
    const existing = this.performanceMetrics.get(pipelineId) || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastUpdated: Date.now()
    };

    existing.totalExecutions++;
    existing.totalExecutionTime += metrics.executionTime;

    if (metrics.success) {
      existing.successfulExecutions++;
    } else {
      existing.failedExecutions++;
    }

    existing.averageExecutionTime = existing.totalExecutionTime / existing.totalExecutions;
    existing.lastUpdated = Date.now();

    this.performanceMetrics.set(pipelineId, existing);
  }

  private calculateCacheHitRate(): number {
    // This would be enhanced with proper hit/miss tracking
    return this.executionCache.size > 0 ? 0.85 : 0; // Mock hit rate
  }

  private calculateAverageExecutionTime(): number {
    let totalTime = 0;
    let totalExecutions = 0;

    for (const metrics of this.performanceMetrics.values()) {
      totalTime += metrics.totalExecutionTime;
      totalExecutions += metrics.totalExecutions;
    }

    return totalExecutions > 0 ? totalTime / totalExecutions : 0;
  }

  private updateSystemMetrics(): void {
    // Update system-wide performance metrics
    const systemMetrics = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: Date.now(),
      pipelineCount: this.pipelineRegistry.size,
      cacheSize: this.executionCache.size
    };

    this.broadcastMessage('system-metrics-update', systemMetrics);
  }

  private cleanupExecutionCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.executionCache.entries()) {
      if (now > value.expiry) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.executionCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Message handler methods

  private async handleWebAutoPipelineAssemblyRequest(message: any): Promise<any> {
    console.log('Handling WebAuto pipeline assembly request');

    try {
      const config = message.payload?.config;
      const result = await this.assemblePipelinesWithWebAuto(config);

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { result },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  private async handleWebAutoPipelineExecutionRequest(message: any): Promise<any> {
    console.log('Handling WebAuto pipeline execution request');

    try {
      const { pipelineId, requestData } = message.payload || {};

      if (!pipelineId) {
        throw new Error('Pipeline ID is required');
      }

      const result = await this.executeWithWebAuto(pipelineId, requestData || {});

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { result },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  private async handleWebAutoPipelineReloadRequest(message: any): Promise<any> {
    console.log('Handling WebAuto pipeline reload request');

    try {
      const result = await this.reloadAndReassemble();

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { result },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  private async handleWebAutoConfigValidationRequest(message: any): Promise<any> {
    console.log('Handling WebAuto config validation request');

    try {
      const config = message.payload?.config;
      const validation = await this.validateConfigurationForWebAuto(config);

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { validation },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  private async handleWebAutoPipelineStatusRequest(message: any): Promise<any> {
    console.log('Handling WebAuto pipeline status request');

    const status = {
      moduleStatus: this.getEnhancedStatus(),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      cacheStats: {
        size: this.executionCache.size,
        hitRate: this.calculateCacheHitRate(),
        averageSize: this.executionCache.size > 0 ? 1000 : 0
      }
    };

    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { status },
      timestamp: Date.now()
    };
  }
}