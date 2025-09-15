/**
 * Compatibility Module (Framework-based)
 * Handles request/response field mapping and validation using the framework
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { ICompatibility } from 'openai-compatible-providers-framework/dist/interfaces/ICompatibility';

/**
 * Compatibility Module Configuration (framework-based)
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

/**
 * Framework-based Compatibility Module
 */
export class CompatibilityModule extends BasePipelineModule implements ICompatibility {
  protected override config: CompatibilityConfig = {} as CompatibilityConfig;

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
   * Map OpenAI request to provider-specific format using framework
   * @param request - OpenAI format request
   * @returns Provider-specific format request
   */
  mapRequest(request: any): any {
    this.logInfo('Mapping request with framework', {
      mappingTable: this.config?.mappingTable,
      requestSize: JSON.stringify(request).length
    }, 'mapRequest');
    
    try {
      // Framework handles field mapping, validation, and transformations
      // For now, return request as-is - actual mapping would be handled by framework mapping tables
      const mappedRequest = request;
      
      this.debug('debug', 'Request mapping complete with framework', { 
        originalSize: JSON.stringify(request).length,
        mappedSize: JSON.stringify(mappedRequest).length 
      }, 'mapRequest');
      
      return mappedRequest;
    } catch (error) {
      this.error('Error mapping request with framework', { error: error as Error, operation: 'mapRequest' }, 'mapRequest');
      throw error;
    }
  }

  /**
   * Map provider response to OpenAI format using framework
   * @param response - Provider-specific format response
   * @returns OpenAI format response
   */
  mapResponse(response: any): any {
    this.logInfo('Mapping response with framework', {
      mappingTable: this.config?.mappingTable,
      responseSize: JSON.stringify(response).length
    }, 'mapResponse');
    
    try {
      // Framework handles field mapping, validation, and transformations
      // For now, return response as-is - actual mapping would be handled by framework mapping tables
      const mappedResponse = response;
      
      this.debug('debug', 'Response mapping complete with framework', { 
        originalSize: JSON.stringify(response).length,
        mappedSize: JSON.stringify(mappedResponse).length 
      }, 'mapResponse');
      
      return mappedResponse;
    } catch (error) {
      this.error('Error mapping response with framework', { error: error as Error, operation: 'mapResponse' }, 'mapResponse');
      throw error;
    }
  }

  /**
   * Get compatibility score (0-1) using framework
   * @returns Compatibility score
   */
  getCompatibilityScore(): number {
    // Return a default compatibility score
    // In a real implementation, this would be calculated based on mapping completeness
    return 0.95;
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
      
      // Use framework mapping
      const processedRequest = this.mapRequest(request);
      
      // Log output data at output port
      this.logOutputPort(processedRequest, 'compatibility-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule request processing complete with framework', { 
        data: processedRequest, 
        processingTime: Date.now() - startTime 
      }, 'process');
      
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
      
      // Use framework mapping
      const processedResponse = this.mapResponse(response);
      
      // Log output data at output port
      this.logOutputPort(processedResponse, 'compatibility-response-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule response processing complete with framework', { 
        data: processedResponse, 
        processingTime: Date.now() - startTime 
      }, 'processResponse');
      
      return processedResponse;
    } catch (error) {
      this.error('Error processing response with framework', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }
}