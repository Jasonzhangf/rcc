import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationRegistry } from '../../core/NodeImplementationRegistry';
import { SelectionCriteria } from '../../core/SelectionCriteria';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';

/**
 * LLM Switch Framework Configuration
 */
export interface LLMSwitchFrameworkConfig {
  /** Input protocol type */
  inputProtocol: string;
  /** Output protocol type */
  outputProtocol: string;
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
 * LLM Switch Framework - Manages LLM protocol conversion implementations
 */
export class LLMSwitchFramework extends BasePipelineModule {
  protected override config: LLMSwitchFrameworkConfig = {} as LLMSwitchFrameworkConfig;
  private registry: NodeImplementationRegistry;
  private selectedImplementation: NodeImplementationInfo | null = null;
  private implementationInstance: BasePipelineModule | null = null;

  constructor(info: ModuleInfo) {
    super(info);
    this.registry = NodeImplementationRegistry.getInstance();
    this.logInfo('LLMSwitchFramework initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the LLM Switch Framework
   * @param config - Framework configuration
   */
  override async configure(config: LLMSwitchFrameworkConfig): Promise<void> {
    this.logInfo('Configuring LLMSwitchFramework', config, 'configure');
    
    this.config = config;
    
    // Select and initialize implementation
    await this.selectImplementation();
    
    await super.configure(config);
    this.logInfo('LLMSwitchFramework configured successfully', {
      inputProtocol: config.inputProtocol,
      outputProtocol: config.outputProtocol,
      selectedImplementation: this.selectedImplementation?.id
    }, 'configure');
  }

  /**
   * Process request through selected implementation
   * @param request - Input request in source protocol format
   * @returns Promise<any> - Transformed request in target protocol format
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing LLMSwitchFramework request', {
      inputProtocol: this.config?.inputProtocol,
      outputProtocol: this.config?.outputProtocol,
      implementation: this.selectedImplementation?.id,
      requestSize: JSON.stringify(request).length
    });
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'request-input', 'external');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('LLMSwitchFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.process(request);
      
      // Log output data at output port
      this.logOutputPort(result, 'request-output', 'next-module');
      
      this.debug('debug', 'LLMSwitchFramework request processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'process');
      
      return result;
    } catch (error) {
      this.error('Error processing request in LLM Switch Framework', { 
        error: error as Error, 
        implementation: this.selectedImplementation?.id 
      }, 'process');
      throw error;
    }
  }

  /**
   * Process response through selected implementation
   * @param response - Response in target protocol format
   * @returns Promise<any> - Transformed response in source protocol format
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing LLMSwitchFramework response', {
      inputProtocol: this.config?.inputProtocol,
      outputProtocol: this.config?.outputProtocol,
      implementation: this.selectedImplementation?.id,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'response-input', 'next-module');
      
      // Validate configuration
      if (!this.config || !this.implementationInstance) {
        throw new Error('LLMSwitchFramework not properly configured');
      }
      
      // Process through selected implementation
      const result = await this.implementationInstance.processResponse(response);
      
      // Log output data at output port
      this.logOutputPort(result, 'response-output', 'external');
      
      this.debug('debug', 'LLMSwitchFramework response processing complete', {
        implementation: this.selectedImplementation?.id,
        processingTime: Date.now() - startTime
      }, 'processResponse');
      
      return result;
    } catch (error) {
      this.error('Error processing response in LLM Switch Framework', { 
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
    this.logInfo('Selecting LLM Switch implementation', {
      inputProtocol: this.config.inputProtocol,
      outputProtocol: this.config.outputProtocol,
      preferredImplementation: this.config.preferredImplementation
    }, 'selectImplementation');
    
    const criteria: SelectionCriteria = {
      nodeType: 'llmswitch',
      inputProtocol: this.config.inputProtocol,
      outputProtocol: this.config.outputProtocol,
      preferences: this.config.preferredImplementation ? {
        implementationId: this.config.preferredImplementation
      } : undefined,
      context: {
        inputProtocol: this.config.inputProtocol,
        targetProtocol: this.config.outputProtocol
      }
    };
    
    // Select implementation from registry
    this.selectedImplementation = this.registry.selectImplementation('llmswitch', criteria);
    
    if (!this.selectedImplementation) {
      throw new Error(`No suitable LLM Switch implementation found for criteria: ${JSON.stringify(criteria)}`);
    }
    
    this.logInfo('Selected LLM Switch implementation', {
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
    return this.registry.getImplementations('llmswitch');
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
      inputProtocol: this.config?.inputProtocol,
      outputProtocol: this.config?.outputProtocol
    };
  }
}