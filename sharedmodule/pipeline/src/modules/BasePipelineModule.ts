import { UnifiedPipelineBaseModule, PipelineModuleConfig } from './PipelineBaseModule';
import { ModuleInfo, ValidationRule } from 'rcc-basemodule';

/**
 * Abstract base class for all pipeline modules
 * Extends BaseModule with pipeline-specific functionality
 */
export abstract class BasePipelineModule extends UnifiedPipelineBaseModule {
  protected validationRules: ValidationRule[] = [];

  constructor(info: ModuleInfo) {
    // Convert ModuleInfo to PipelineModuleConfig for the unified base class
    const pipelineConfig: PipelineModuleConfig = {
      id: info.id,
      name: info.name,
      version: info.version || '1.0.0',
      description: info.description || 'Pipeline module',
      type: info.type as any || 'pipeline'
    };

    super(pipelineConfig);
    this.logInfo(`BasePipelineModule initialized: ${info.name}`);
  }

  /**
   * Process method - Core interface for all pipeline modules
   * This is a blocking interface that processes requests and returns responses
   * @param request - Input request data
   * @returns Promise<any> - Processed response data
   */
  abstract process(request: any): Promise<any>;

  
  /**
   * Process response method - Handle response processing
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  abstract processResponse?(response: any): Promise<any>;

  
  /**
   * Log input data at input port
   * @param data - Input data
   * @param port - Input port name
   * @param source - Source module
   */
  protected logInputPort(data: any, port: string, source?: string): void {
    this.debug('info', `Input port data received: ${port} from ${source || 'unknown'}`, undefined, 'logInputPort');
  }

  /**
   * Log output data at output port
   * @param data - Output data
   * @param port - Output port name
   * @param target - Target module
   */
  protected logOutputPort(data: any, port: string, target?: string): void {
    this.debug('info', `Output port data sent: ${port} to ${target || 'unknown'}`, undefined, 'logOutputPort');
  }

  /**
   * Generate unique request ID
   * @returns string - Unique request identifier
   */
  protected generateRequestId(): string {
    return `${this.moduleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate input data with required fields
   * @param data - Data to validate
   * @param requiredFields - Required field names
   * @throws Error if validation fails
   */
  protected validateInputWithFields(data: any, requiredFields: string[]): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input data: expected object');
    }
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Connect to another module
   * @param targetModule - Target module to connect to
   */
  connect(targetModule: BasePipelineModule): void {
    this.debug('info', `Connecting to module: ${targetModule.getName()}`, undefined, 'connect');
    // Add connection logic here
  }

  /**
   * Disconnect from another module
   * @param targetModule - Target module to disconnect from
   */
  disconnect(targetModule: BasePipelineModule): void {
    this.debug('info', `Disconnecting from module: ${targetModule.getName()}`, undefined, 'disconnect');
    // Add disconnection logic here
  }

  /**
   * Get module health status
   * @returns Object containing health information
   */
  getHealth(): { status: string; uptime: number; lastCheck: number } {
    return {
      status: 'healthy',
      uptime: Date.now() - (this as any).startTime || Date.now(),
      lastCheck: Date.now()
    };
  }

  }
