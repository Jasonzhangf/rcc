import { BaseModule } from '../core/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { Message, MessageResponse } from '../interfaces/Message';

/**
 * Test module for demonstrating the messaging system
 */
export class MessagingTestModule extends BaseModule {
  // Override the static createInstance method to fix TypeScript inheritance issue
  static createInstance<T extends MessagingTestModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T {
    return new this(info);
  }
  private receivedMessages: Message[] = [];
  private receivedResponses: MessageResponse[] = [];
  
  /**
   * Creates an instance of MessagingTestModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  /**
   * Static factory method to create an instance of MessagingTestModule
   * @param info - Module information
   * @returns Instance of MessagingTestModule
   */
  static createInstance(info: ModuleInfo): MessagingTestModule {
    return new MessagingTestModule(info);
  }
  
  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`MessagingTestModule ${this.info.id} initialized`);
  }
  
  /**
   * Handle incoming messages
   * @param message - The incoming message
   * @returns Promise that resolves to a response or void
   */
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    // Store the received message
    this.receivedMessages.push(message);
    
    console.log(`MessagingTestModule ${this.info.id} received message:`, message);
    
    // Handle specific message types
    switch (message.type) {
      case 'test_request':
        // Respond to test requests
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { 
            message: 'Test response',
            originalPayload: message.payload,
            timestamp: Date.now()
          },
          timestamp: Date.now()
        };
      
      case 'test_notification':
        // Handle notifications
        console.log(`MessagingTestModule ${this.info.id} received notification:`, message.payload);
        break;
        
      default:
        // Handle unknown message types
        console.warn(`MessagingTestModule ${this.info.id} received unknown message type: ${message.type}`);
    }
    
    // For request/response messages, we need to return a response
    if (message.correlationId) {
      return {
        messageId: message.id,
        correlationId: message.correlationId,
        success: true,
        data: { message: 'Message received and processed' },
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Send a test message
   * @param target - Target module ID
   * @param payload - Message payload
   */
  public sendTestMessage(target: string, payload: any): void {
    this.sendMessage('test_message', payload, target);
  }
  
  /**
   * Send a test request and wait for response (blocking)
   * @param target - Target module ID
   * @param payload - Message payload
   * @returns Promise that resolves to the response
   */
  public async sendTestRequest(target: string, payload: any): Promise<MessageResponse> {
    return this.sendRequest('test_request', payload, target);
  }
  
  /**
   * Send a test request with callback (non-blocking)
   * @param target - Target module ID
   * @param payload - Message payload
   * @param callback - Callback function for response
   */
  public sendTestRequestAsync(
    target: string, 
    payload: any, 
    callback: (response: MessageResponse) => void
  ): void {
    this.sendRequestAsync('test_request', payload, target, callback);
  }
  
  /**
   * Broadcast a test message
   * @param payload - Message payload
   */
  public broadcastTestMessage(payload: any): void {
    this.broadcastMessage('test_notification', payload);
  }
  
  /**
   * Get received messages
   * @returns Array of received messages
   */
  public getReceivedMessages(): Message[] {
    return [...this.receivedMessages];
  }
  
  /**
   * Get received responses
   * @returns Array of received responses
   */
  public getReceivedResponses(): MessageResponse[] {
    return [...this.receivedResponses];
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    console.log(`MessagingTestModule ${this.info.id} destroyed`);
    this.receivedMessages = [];
    this.receivedResponses = [];
    await super.destroy();
  }
  
  /**
   * Unit test for the messaging system
   */
  public static async runUnitTest(): Promise<void> {
    console.log('Running MessagingTestModule unit test...');
    
    try {
      // Create module instances
      const module1Info: ModuleInfo = {
        id: 'messaging-test-1',
        type: 'messaging_test',
        name: 'Messaging Test Module 1',
        version: '1.0.0',
        description: 'First messaging test module for unit testing'
      };
      
      const module2Info: ModuleInfo = {
        id: 'messaging-test-2',
        type: 'messaging_test',
        name: 'Messaging Test Module 2',
        version: '1.0.0',
        description: 'Second messaging test module for unit testing'
      };
      
      const module1 = MessagingTestModule.createInstance(module1Info);
      const module2 = MessagingTestModule.createInstance(module2Info);
      
      // Initialize modules
      await module1.initialize();
      await module2.initialize();
      
      // Test 1: Send a one-way message
      console.log('\n--- Test 1: One-way message ---');
      module1.sendTestMessage('messaging-test-2', { 
        text: 'Hello from module 1',
        timestamp: Date.now()
      });
      
      // Wait a bit for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const module2Messages = module2.getReceivedMessages();
      console.log('Module 2 received messages:', module2Messages.length);
      
      // Test 2: Send a request and wait for response (blocking)
      console.log('\n--- Test 2: Blocking request ---');
      try {
        const response = await module1.sendTestRequest('messaging-test-2', {
          command: 'echo',
          data: 'Hello, response test!'
        });
        console.log('Received response:', response);
        console.log('Response success:', response.success);
      } catch (error) {
        console.error('Request failed:', error);
      }
      
      // Test 3: Send a request with callback (non-blocking)
      console.log('\n--- Test 3: Non-blocking request ---');
      module1.sendTestRequestAsync('messaging-test-2', {
        command: 'async_echo',
        data: 'Hello, async test!'
      }, (response) => {
        console.log('Received async response:', response);
        console.log('Async response success:', response.success);
      });
      
      // Wait for async response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test 4: Broadcast message
      console.log('\n--- Test 4: Broadcast message ---');
      module1.broadcastTestMessage({
        notification: 'This is a broadcast message',
        timestamp: Date.now()
      });
      
      // Wait for broadcast processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      await module1.destroy();
      await module2.destroy();
      
      console.log('\nMessagingTestModule unit test completed');
    } catch (error) {
      console.error('MessagingTestModule unit test failed:', error);
    }
  }
}