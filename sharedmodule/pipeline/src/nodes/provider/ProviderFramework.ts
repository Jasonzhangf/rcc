import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationRegistry } from '../../core/NodeImplementationRegistry';
import { SelectionCriteria } from '../../core/SelectionCriteria';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';

/**
 * Provider Framework Configuration
 */
export interface ProviderFrameworkConfig {
  /** Provider type (openai, gemini, qwen, etc.) */
  providerType: string;
  /** API endpoint */
  endpoint: string;
  /** Authentication type */
  authType: 'api_key' | 'oauth2' | 'jwt' | 'custom' | 'qwen';
  /** Model name (optional) */
  model?: string;
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
 * Provider Framework - Manages provider implementations for different AI services
 */
export class ProviderFramework extends BasePipelineModule {
  protected override config: ProviderFrameworkConfig = {} as ProviderFrameworkConfig;
  private registry: NodeImplementationRegistry;
  private selectedImplementation: NodeImplementationInfo | null = null;
  private implementationInstance: BasePipelineModule | null = null;

  constructor(info: ModuleInfo) {
    super(info);
    this.registry = NodeImplementationRegistry.getInstance();
    this.logInfo('ProviderFramework initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Provider Framework
   * @param config - Framework configuration
   */
  override async configure(config: ProviderFrameworkConfig): Promise<void> {
    this.logInfo('Configuring ProviderFramework', config, 'configure');
    
    this.config = config;
    
    // Select and initialize implementation
    await this.selectImplementation();
    
    await super.configure(config);
    this.logInfo('ProviderFramework configured successfully', {
      providerType: config.providerType,
      endpoint: config.endpoint,
      authType: config.authType,
      selectedImplementation: this.selectedImplementation?.id
    }, 'configure');
  }

  /**
   * Process request through selected implementation
   * @param request - Input request data
   * @returns Promise<any> - Provider response
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing ProviderFramework request', {
      providerType: this.config?.providerType,
      endpoint: this.config?.endpoint,
      authType: this.config?.authType,
      implementation: this.selectedImplementation?.id,
      requestSize: JSON.stringify(request).length
    });
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'provider-input', 'previous-module');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('ProviderFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.process(request);
      
      // Log output data at output port
      this.logOutputPort(result, 'provider-output', 'external');
      
      this.debug('debug', 'ProviderFramework request processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'process');
      
      return result;
    } catch (error) {
      this.error('Error processing request in Provider Framework', { 
        error: error as Error, 
        implementation: this.selectedImplementation?.id 
      }, 'process');
      throw error;
    }
  }

  /**
   * Process response through selected implementation
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing ProviderFramework response', {
      providerType: this.config?.providerType,
      authType: this.config?.authType,
      implementation: this.selectedImplementation?.id,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'provider-response-input', 'external');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('ProviderFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.processResponse(response);
      
      // Log output data at output port
      this.logOutputPort(result, 'provider-response-output', 'next-module');
      
      this.debug('debug', 'ProviderFramework response processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'processResponse');
      
      return result;
    } catch (error) {
      this.error('Error processing response in Provider Framework', { 
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
    this.logInfo('Selecting Provider implementation', {
      providerType: this.config.providerType,
      authType: this.config.authType,
      preferredImplementation: this.config.preferredImplementation
    }, 'selectImplementation');
    
    const criteria: SelectionCriteria = {
      nodeType: 'provider',
      requirements: [this.config.providerType, this.config.authType],
      preferences: this.config.preferredImplementation ? {
        implementationId: this.config.preferredImplementation
      } : undefined,
      context: {
        providerType: this.config.providerType,
        authType: this.config.authType,
        endpoint: this.config.endpoint,
        model: this.config.model
      }
    };
    
    // Select implementation from registry
    this.selectedImplementation = this.registry.selectImplementation('provider', criteria);
    
    if (!this.selectedImplementation) {
      throw new Error(`No suitable Provider implementation found for criteria: ${JSON.stringify(criteria)}`);
    }
    
    this.logInfo('Selected Provider implementation', {
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
    return this.registry.getImplementations('provider');
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
      providerType: this.config?.providerType,
      authType: this.config?.authType,
      endpoint: this.config?.endpoint
    };
  }
}