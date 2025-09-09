import { BaseModule } from '../core/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';
import { ValidationRule } from '../interfaces/Validation';

/**
 * Example module implementation
 * Demonstrates how to extend BaseModule
 */
export class ExampleModule extends BaseModule {
  /**
   * Example internal property (not exposed through API)
   */
  private internalState: string = 'initial';
  
  /**
   * Module ID (exposed for API access)
   */
  private moduleId: string;
  
  /**
   * Creates an instance of ExampleModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
    this.moduleId = info.id;
    // Add example validation rules
    this.validationRules = [
      {
        field: 'message',
        type: 'string',
        message: 'Message must be a string'
      },
      {
        field: 'timestamp',
        type: 'number',
        message: 'Timestamp must be a number'
      }
    ];
  }
  
  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`ExampleModule ${this.info.id} initialized`);
  }
  
  /**
   * Performs handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    const result = await super.handshake(targetModule);
    if (result) {
      console.log(`Handshake successful between ${this.info.id} and ${targetModule.getInfo().id}`);
    }
    return result;
  }
  
  /**
   * Transfers data to connected modules
   * @param data - Data to transfer
   * @param targetConnectionId - Optional target connection ID
   */
  protected async transferData(data: any, targetConnectionId?: string): Promise<void> {
    await super.transferData(data, targetConnectionId);
    console.log(`Transferring data from ${this.info.id}`);
  }
  
  /**
   * Receives data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    console.log(`Module ${this.info.id} received data:`, dataTransfer.data);
    
    // Process the received data
    this.processReceivedData(dataTransfer.data);
  }
  
  /**
   * Example public method that can be exposed through API
   * @param message - Message to process
   */
  public async processMessage(message: string): Promise<void> {
    console.log(`Processing message: ${message}`);
    this.internalState = 'processing';
    
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.internalState = 'processed';
  }
  
  /**
   * Example public method that can be exposed through API
   * @returns Current status
   */
  public getStatus(): string {
    return `Module ${this.moduleId} status: ${this.internalState}`;
  }
  
  /**
   * Processes received data
   * This is an internal method not exposed through API
   * @param data - Data to process
   */
  private processReceivedData(data: any): void {
    // Internal processing logic
    console.log(`Internal processing of data in ${this.info.id}`);
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    console.log(`ExampleModule ${this.info.id} destroyed`);
    await super.destroy();
  }
}