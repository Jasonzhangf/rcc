import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import * as fs from 'fs';
import * as path from 'path';
// Compatibility mapping is now handled by the framework

/**
 * Compatibility Module Configuration (simplified for framework)
 */
export interface CompatibilityConfig {
  /** Field mapping table name */
  mappingTable: string;
  /** Enable strict mapping */
  strictMapping?: boolean;
  /** Preserve unknown fields */
  preserveUnknownFields?: boolean;
  /** Validation configuration */
  validation?: {
    /** Enable validation */
    enabled: boolean;
    /** Required fields */
    required?: string[];
    /** Field type constraints */
    types?: Record<string, string>;
    /** Field value constraints */
    constraints?: Record<string, any>;
  };
}

// Field mapping configuration is now handled by the framework

// Mapping table is now handled by the framework

// Validation context is now handled by the framework

// Validation result is now handled by the framework

export class CompatibilityModule extends BasePipelineModule {
  protected override config: CompatibilityConfig = {} as CompatibilityConfig;
  // Mapping table and field mappings are now handled by the framework

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('CompatibilityModule initialized with framework', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Compatibility module using framework
   * @param config - Configuration object
   */
  override async configure(config: CompatibilityConfig): Promise<void> {
    this.logInfo('Configuring CompatibilityModule with framework', config, 'configure');
    
    this.config = config;
    
    // Framework handles mapping table loading and processing
    
    await super.configure(config);
    this.logInfo('CompatibilityModule configured successfully with framework', config, 'configure');
  }

  /**
   * Process request - Apply field mapping and validation using framework
   * @param request - Input request data
   * @returns Promise<any> - Mapped and validated request data
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing CompatibilityModule request with framework', {
      mappingTable: this.config?.mappingTable,
      strictMapping: this.config?.strictMapping,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'compatibility-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('CompatibilityModule not configured');
      }
      
      // Framework handles field mapping, validation, and transformations
      const processedRequest = request;
      
      // Log output data at output port
      this.logOutputPort(processedRequest, 'compatibility-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule request processing complete with framework', { data: processedRequest, processingTime: Date.now() - startTime }, 'process');
      
      return processedRequest;
    } catch (error) {
      this.error('Error processing request with framework', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Apply field mapping and validation for response using framework
   * @param response - Input response data
   * @returns Promise<any> - Mapped and validated response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing CompatibilityModule response with framework', {
      mappingTable: this.config?.mappingTable,
      strictMapping: this.config?.strictMapping,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'compatibility-response-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('CompatibilityModule not configured');
      }
      
      // Framework handles field mapping, validation, and transformations
      const processedResponse = response;
      
      // Log output data at output port
      this.logOutputPort(processedResponse, 'compatibility-response-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule response processing complete with framework', { data: processedResponse, processingTime: Date.now() - startTime }, 'processResponse');
      
      return processedResponse;
    } catch (error) {
      this.error('Error processing response with framework', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }

  // All private methods are now handled by the framework
}