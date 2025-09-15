import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationRegistry } from '../../core/NodeImplementationRegistry';
import { SelectionCriteria } from '../../core/SelectionCriteria';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';

/**
 * Compatibility Framework Configuration
 */
export interface CompatibilityFrameworkConfig {
  /** Mapping strategy */
  mappingStrategy: 'field-mapping' | 'schema-transformation' | 'generic';
  /** Source format/type */
  sourceFormat: string;
  /** Target format/type */
  targetFormat: string;
  /** Preferred implementation ID (optional) */
  preferredImplementation?: string;
  /** Framework-specific settings */
  framework?: {
    /** Enable implementation auto-discovery */
    autoDiscovery?: boolean;
    /** Fallback to default implementation if preferred fails */
    fallbackToDefault?: boolean;
    /** Implementation selection timeout */
    selectionTimeout?: number;
  };
}

/**
 * Compatibility Framework - Manages compatibility and schema transformation implementations
 */
export class CompatibilityFramework extends BasePipelineModule {
  protected override config: CompatibilityFrameworkConfig = {} as CompatibilityFrameworkConfig;
  private registry: NodeImplementationRegistry;
  private selectedImplementation: NodeImplementationInfo | null = null;
  private implementationInstance: BasePipelineModule | null = null;

  constructor(info: ModuleInfo) {
    super(info);
    this.registry = NodeImplementationRegistry.getInstance();
    this.logInfo('CompatibilityFramework initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Compatibility Framework
   * @param config - Framework configuration
   */
  override async configure(config: CompatibilityFrameworkConfig): Promise<void> {
    this.logInfo('Configuring CompatibilityFramework', config, 'configure');
    
    this.config = config;
    
    // Select and initialize implementation
    await this.selectImplementation();
    
    await super.configure(config);
    this.logInfo('CompatibilityFramework configured successfully', {
      mappingStrategy: config.mappingStrategy,
      sourceFormat: config.sourceFormat,
      targetFormat: config.targetFormat,
      selectedImplementation: this.selectedImplementation?.id
    }, 'configure');
  }

  /**
   * Process request through selected implementation
   * @param request - Input request data
   * @returns Promise<any> - Compatibility-processed request data
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing CompatibilityFramework request', {
      mappingStrategy: this.config?.mappingStrategy,
      sourceFormat: this.config?.sourceFormat,
      targetFormat: this.config?.targetFormat,
      implementation: this.selectedImplementation?.id,
      requestSize: JSON.stringify(request).length
    });
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'compatibility-input', 'previous-module');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('CompatibilityFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.process(request);
      
      // Log output data at output port
      this.logOutputPort(result, 'compatibility-output', 'next-module');
      
      this.debug('debug', 'CompatibilityFramework request processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'process');
      
      return result;
    } catch (error) {
      this.error('Error processing request in Compatibility Framework', { 
        error: error as Error, 
        implementation: this.selectedImplementation?.id 
      }, 'process');
      throw error;
    }
  }

  /**
   * Process response through selected implementation
   * @param response - Input response data
   * @returns Promise<any> - Compatibility-processed response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing CompatibilityFramework response', {
      mappingStrategy: this.config?.mappingStrategy,
      sourceFormat: this.config?.sourceFormat,
      targetFormat: this.config?.targetFormat,
      implementation: this.selectedImplementation?.id,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'compatibility-response-input', 'previous-module');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('CompatibilityFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.processResponse(response);
      
      // Log output data at output port
      this.logOutputPort(result, 'compatibility-response-output', 'next-module');
      
      this.debug('debug', 'CompatibilityFramework response processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'processResponse');
      
      return result;
    } catch (error) {
      this.error('Error processing response in Compatibility Framework', { 
        error: error as Error, 
        implementation: this.selectedImplementation?.id 
      }, 'processResponse');
      throw error;
    }
  }

  /**
   * Select the best implementation based on configuration
   */
  private async selectImplementation(): Promise<void> {
    this.logInfo('Selecting Compatibility implementation', {
      mappingStrategy: this.config.mappingStrategy,
      sourceFormat: this.config.sourceFormat,
      targetFormat: this.config.targetFormat,
      preferredImplementation: this.config.preferredImplementation
    }, 'selectImplementation');
    
    const criteria: SelectionCriteria = {
      nodeType: 'compatibility',
      requirements: [this.config.mappingStrategy],
      preferences: this.config.preferredImplementation ? {
        implementationId: this.config.preferredImplementation
      } : undefined,
      context: {
        mappingStrategy: this.config.mappingStrategy,
        sourceFormat: this.config.sourceFormat,
        targetFormat: this.config.targetFormat
      }
    };
    
    // Select implementation from registry
    this.selectedImplementation = this.registry.selectImplementation('compatibility', criteria);
    
    if (!this.selectedImplementation) {
      throw new Error(`No suitable Compatibility implementation found for criteria: ${JSON.stringify(criteria)}`);
    }
    
    this.logInfo('Selected Compatibility implementation', {
      id: this.selectedImplementation.id,
      name: this.selectedImplementation.name,
      version: this.selectedImplementation.version
    }, 'selectImplementation');
    
    // Create implementation instance
    await this.createImplementationInstance();
  }

  /**
   * Create an instance of the selected implementation
   */
  private async createImplementationInstance(): Promise<void> {
    if (!this.selectedImplementation) {
      throw new Error('No implementation selected');
    }
    
    try {
      // Create module info for the implementation
      const implModuleInfo: ModuleInfo = {
        id: `${this.moduleId}-${this.selectedImplementation.id}`,
        name: `${this.moduleName}-${this.selectedImplementation.name}`,
        version: this.selectedImplementation.version,
        description: this.selectedImplementation.description,
        dependencies: this.selectedImplementation.dependencies || [],
        config: {
          ...this.config,
          // Pass framework-specific configuration to implementation
          frameworkMode: true,
          frameworkParentId: this.moduleId
        }
      };
      
      // Instantiate the implementation
      this.implementationInstance = new this.selectedImplementation.moduleClass(implModuleInfo);
      
      // Configure the implementation
      await this.implementationInstance.configure(this.config);
      
      this.logInfo('Implementation instance created and configured', {
        implementation: this.selectedImplementation.id,
        moduleInfo: implModuleInfo
      }, 'createImplementationInstance');
      
    } catch (error) {
      this.error('Error creating implementation instance', { 
        error: error as Error, 
        implementation: this.selectedImplementation?.id 
      }, 'createImplementationInstance');
      throw error;
    }
  }

  /**
   * Get information about the selected implementation
   */
  getImplementationInfo(): NodeImplementationInfo | null {
    return this.selectedImplementation;
  }

  /**
   * Get available implementations for this framework
   */
  getAvailableImplementations(): NodeImplementationInfo[] {
    return this.registry.getImplementations('compatibility');
  }

  /**
   * Check if the framework is properly configured
   */
  isConfigured(): boolean {
    return !!this.config && !!this.selectedImplementation && !!this.implementationInstance;
  }

  /**
   * Get framework statistics
   */
  getStatistics() {
    return {
      configured: this.isConfigured(),
      selectedImplementation: this.selectedImplementation?.id,
      availableImplementations: this.getAvailableImplementations().length,
      mappingStrategy: this.config?.mappingStrategy,
      sourceFormat: this.config?.sourceFormat,
      targetFormat: this.config?.targetFormat
    };
  }
}