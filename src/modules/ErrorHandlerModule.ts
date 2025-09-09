import { BaseModule } from '../core/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { Message, MessageResponse } from '../interfaces/Message';

/**
 * Error handler module for centralized error management
 */
export class ErrorHandlerModule extends BaseModule {
  private errorLog: any[] = [];
  private alertThreshold: number = 10; // Number of errors before alerting
  private alertRecipients: string[] = [];
  
  /**
   * Creates an instance of ErrorHandlerModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  /**
   * Static factory method to create an instance of ErrorHandlerModule
   * @param info - Module information
   * @returns Instance of ErrorHandlerModule
   */
  static createInstance<T extends ErrorHandlerModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T {
    return new this(info);
  }
  
  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`ErrorHandlerModule ${this.info.id} initialized`);
  }
  
  /**
   * Handle incoming messages
   * @param message - The incoming message
   * @returns Promise that resolves to a response or void
   */
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    console.log(`ErrorHandlerModule ${this.info.id} received message:`, message);
    
    // Handle specific message types
    switch (message.type) {
      case 'error_report':
        return this.handleErrorResponse(message);
      
      case 'warning_report':
        return this.handleWarningResponse(message);
        
      case 'error_threshold_alert':
        return this.handleThresholdAlert(message);
        
      default:
        console.warn(`ErrorHandlerModule ${this.info.id} received unknown message type: ${message.type}`);
    }
    
    // For request/response messages, we need to return a response
    if (message.correlationId) {
      return {
        messageId: message.id,
        correlationId: message.correlationId,
        success: true,
        data: { message: 'Error report received and processed' },
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Handle error response messages
   * @param message - Error report message
   * @returns Response message
   */
  private async handleErrorResponse(message: Message): Promise<MessageResponse> {
    const errorData = message.payload;
    
    // Log the error
    const errorEntry = {
      id: message.id,
      source: message.source,
      timestamp: message.timestamp,
      type: 'error',
      data: errorData,
      handled: false
    };
    
    this.errorLog.push(errorEntry);
    console.log(`ErrorHandlerModule: Logged error from ${message.source}`, errorData);
    
    // Check if we need to send an alert
    if (this.errorLog.length >= this.alertThreshold) {
      this.sendThresholdAlert();
    }
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { 
        message: 'Error logged successfully',
        logId: errorEntry.id
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Handle warning response messages
   * @param message - Warning report message
   * @returns Response message
   */
  private async handleWarningResponse(message: Message): Promise<MessageResponse> {
    const warningData = message.payload;
    
    // Log the warning
    const warningEntry = {
      id: message.id,
      source: message.source,
      timestamp: message.timestamp,
      type: 'warning',
      data: warningData,
      handled: false
    };
    
    this.errorLog.push(warningEntry);
    console.log(`ErrorHandlerModule: Logged warning from ${message.source}`, warningData);
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { 
        message: 'Warning logged successfully',
        logId: warningEntry.id
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Handle threshold alert messages
   * @param message - Threshold alert message
   * @returns Response message
   */
  private async handleThresholdAlert(message: Message): Promise<MessageResponse> {
    const alertData = message.payload;
    
    console.log(`ErrorHandlerModule: Received threshold alert`, alertData);
    
    // In a real implementation, you might send notifications to administrators
    // For now, we'll just log it
    this.errorLog.push({
      id: message.id,
      source: message.source,
      timestamp: message.timestamp,
      type: 'threshold_alert',
      data: alertData,
      handled: true
    });
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { message: 'Threshold alert received' },
      timestamp: Date.now()
    };
  }
  
  /**
   * Send threshold alert to configured recipients
   */
  private sendThresholdAlert(): void {
    const errorCount = this.errorLog.filter(entry => entry.type === 'error').length;
    
    this.sendMessage('error_threshold_alert', {
      errorCount: errorCount,
      threshold: this.alertThreshold,
      timestamp: Date.now(),
      message: `Error threshold of ${this.alertThreshold} errors reached`
    }, 'system_admin');
    
    console.log(`ErrorHandlerModule: Sent threshold alert for ${errorCount} errors`);
  }
  
  /**
   * Report an error to the error handler
   * @param errorData - Error data to report
   * @param target - Target error handler module ID
   */
  public reportError(errorData: any, target: string = 'error-handler'): void {
    this.sendMessage('error_report', errorData, target);
  }
  
  /**
   * Report a warning to the error handler
   * @param warningData - Warning data to report
   * @param target - Target error handler module ID
   */
  public reportWarning(warningData: any, target: string = 'error-handler'): void {
    this.sendMessage('warning_report', warningData, target);
  }
  
  /**
   * Get error log
   * @returns Array of error log entries
   */
  public getErrorLog(): any[] {
    return [...this.errorLog];
  }
  
  /**
   * Get error count
   * @returns Number of errors logged
   */
  public getErrorCount(): number {
    return this.errorLog.filter(entry => entry.type === 'error').length;
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    console.log(`ErrorHandlerModule ${this.info.id} destroyed`);
    this.errorLog = [];
    await super.destroy();
  }
  
  /**
   * Unit test for the error handler
   */
  public static async runUnitTest(): Promise<void> {
    console.log('Running ErrorHandlerModule unit test...');
    
    try {
      // Create module instances
      const errorHandlerInfo: ModuleInfo = {
        id: 'error-handler',
        type: 'error_handler',
        name: 'Error Handler Module',
        version: '1.0.0',
        description: 'Centralized error handling module'
      };
      
      const configModuleInfo: ModuleInfo = {
        id: 'config-module',
        type: 'configuration',
        name: 'Configuration Module',
        version: '1.0.0',
        description: 'Configuration processing module'
      };
      
      const errorHandler = ErrorHandlerModule.createInstance(errorHandlerInfo);
      const configModule = ErrorHandlerModule.createInstance(configModuleInfo); // Using same class for simplicity
      
      // Initialize modules
      await errorHandler.initialize();
      await configModule.initialize();
      
      // Test 1: Send an error report
      console.log('\n--- Test 1: Error report ---');
      configModule.reportError({
        code: 'CONFIG_LOAD_ERROR',
        message: 'Failed to load configuration file',
        file: '/path/to/config.json',
        timestamp: Date.now()
      }, 'error-handler');
      
      // Wait a bit for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const errorCount = errorHandler.getErrorCount();
      console.log('Error count:', errorCount);
      
      // Test 2: Send a warning report
      console.log('\n--- Test 2: Warning report ---');
      configModule.reportWarning({
        code: 'CONFIG_DEPRECATED',
        message: 'Configuration option is deprecated',
        option: 'oldOption',
        timestamp: Date.now()
      }, 'error-handler');
      
      // Wait a bit for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const totalLogs = errorHandler.getErrorLog().length;
      console.log('Total log entries:', totalLogs);
      
      // Clean up
      await errorHandler.destroy();
      await configModule.destroy();
      
      console.log('\nErrorHandlerModule unit test completed');
    } catch (error) {
      console.error('ErrorHandlerModule unit test failed:', error);
    }
  }
}