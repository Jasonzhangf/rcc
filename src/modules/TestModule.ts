import { BaseModule } from '../core/BaseModule/src/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';

/**
 * Test module for demonstrating API standards
 * This module shows how to properly document and expose public methods
 */
export class TestModule extends BaseModule {
  private testData: string = '';
  
  /**
   * Creates an instance of TestModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  /**
   * Initializes the test module
   * Sets up initial state and configuration
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`TestModule ${this.info.id} initialized`);
  }
  
  /**
   * Processes test data
   * @param data - The data to process
   * @param options - Processing options
   * @returns Processed result
   */
  public async processData(data: string, options?: { uppercase: boolean }): Promise<string> {
    this.testData = data;
    if (options?.uppercase) {
      return data.toUpperCase();
    }
    return data;
  }
  
  /**
   * Gets the current test data
   * @returns Current test data
   */
  public getCurrentData(): string {
    return this.testData;
  }
  
  /**
   * Performs a test handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    const result = await super.handshake(targetModule);
    console.log(`Handshake with ${targetModule.getInfo().id}: ${result}`);
    return result;
  }
  
  /**
   * Receives data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    console.log(`TestModule received data:`, dataTransfer.data);
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    console.log(`TestModule ${this.info.id} destroyed`);
    await super.destroy();
  }
}