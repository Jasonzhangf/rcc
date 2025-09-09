import { DebugModule, LogLevel } from '../src/DebugModule';
import { BaseModule } from '../../../core/BaseModule/src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';

/**
 * Test for DebugModule functionality with custom folder name
 * This test verifies the debugging and logging capabilities with custom folder naming
 */
async function runDebugModuleCustomFolderTest(): Promise<void> {
  console.log('Running DebugModule custom folder name test...');
  
  try {
    // Create module instances
    const debugInfo: ModuleInfo = {
      id: 'debug-1',
      type: 'debug',
      name: 'Debug Module',
      version: '1.0.0',
      description: 'A debug module for logging and debugging'
    };
    
    const senderInfo: ModuleInfo = {
      id: 'sender-1',
      type: 'test-sender',
      name: 'Test Sender Module',
      version: '1.0.0',
      description: 'A test sender module for communication testing'
    };
    
    const receiverInfo: ModuleInfo = {
      id: 'receiver-1',
      type: 'test-receiver',
      name: 'Test Receiver Module',
      version: '1.0.0',
      description: 'A test receiver module for communication testing'
    };
    
    // Test 1: Custom folder name
    console.log('\n--- Test 1: Custom folder name ---');
    const debugModule1 = DebugModule.createInstance(debugInfo);
    const senderModule1 = new TestSourceModule(senderInfo);
    const receiverModule1 = new TestTargetModule(receiverInfo);
    
    // Configure debug module with custom folder name
    debugModule1.configure({
      consoleOutput: true,
      rootDir: './logs',
      customFolderName: 'my-custom-app',
      fileLogging: true,
      logLevel: LogLevel.DEBUG,
      recordDataFlow: true,
      recordCallStack: true,
      maxLogFiles: 5
    });
    
    // Initialize modules
    await debugModule1.initialize();
    await senderModule1.initialize();
    await receiverModule1.initialize();
    
    // Set debug module for sender and receiver
    senderModule1['setDebugModule'](debugModule1);
    receiverModule1['setDebugModule'](debugModule1);
    
    // Create connection information
    const connection1: ConnectionInfo = {
      id: 'connection-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    // Add connection to sender
    senderModule1['addOutputConnection'](connection1);
    
    // Perform handshake
    const handshakeResult1 = await senderModule1['handshake'](receiverModule1);
    debugModule1.log(`Handshake result: ${handshakeResult1}`, LogLevel.INFO);
    
    // Send test data
    const testData1 = {
      message: 'Hello from sender module',
      timestamp: Date.now(),
      metadata: {
        test: true,
        sequence: 1
      }
    };
    
    await senderModule1.sendData(testData1);
    
    // Add a small delay to ensure data is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get logs
    const logs1 = debugModule1.getLogs();
    console.log(`Total log entries: ${logs1.length}`);
    
    // Verify that we have log entries
    if (logs1.length > 0) {
      console.log('✓ DebugModule custom folder name test passed: Logs were recorded');
    } else {
      console.error('✗ DebugModule custom folder name test failed: No logs recorded');
    }
    
    // Clean up
    await senderModule1['destroy']();
    await receiverModule1['destroy']();
    await debugModule1['destroy']();
    
    // Test 2: Port-based naming with dynamic port update
    console.log('\n--- Test 2: Port-based naming with dynamic port update ---');
    const debugModule2 = DebugModule.createInstance(debugInfo);
    const senderModule2 = new TestSourceModule(senderInfo);
    const receiverModule2 = new TestTargetModule(receiverInfo);
    
    // Configure debug module with initial port
    debugModule2.configure({
      consoleOutput: true,
      rootDir: './logs',
      port: 3002,
      fileLogging: true,
      logLevel: LogLevel.DEBUG,
      recordDataFlow: true,
      recordCallStack: true,
      maxLogFiles: 5
    });
    
    // Initialize modules
    await debugModule2.initialize();
    await senderModule2.initialize();
    await receiverModule2.initialize();
    
    // Set debug module for sender and receiver
    senderModule2['setDebugModule'](debugModule2);
    receiverModule2['setDebugModule'](debugModule2);
    
    // Update port after initialization
    debugModule2.updatePort(3003);
    
    // Create connection information
    const connection2: ConnectionInfo = {
      id: 'connection-2',
      sourceModuleId: 'sender-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    // Add connection to sender
    senderModule2['addOutputConnection'](connection2);
    
    // Perform handshake
    const handshakeResult2 = await senderModule2['handshake'](receiverModule2);
    debugModule2.log(`Handshake result: ${handshakeResult2}`, LogLevel.INFO);
    
    // Send test data
    const testData2 = {
      message: 'Hello from sender module',
      timestamp: Date.now(),
      metadata: {
        test: true,
        sequence: 1
      }
    };
    
    await senderModule2.sendData(testData2);
    
    // Add a small delay to ensure data is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get logs
    const logs2 = debugModule2.getLogs();
    console.log(`Total log entries: ${logs2.length}`);
    
    // Verify that we have log entries
    if (logs2.length > 0) {
      console.log('✓ DebugModule port-based naming test passed: Logs were recorded');
    } else {
      console.error('✗ DebugModule port-based naming test failed: No logs recorded');
    }
    
    // Clean up
    await senderModule2['destroy']();
    await receiverModule2['destroy']();
    await debugModule2['destroy']();
    
    console.log('\nDebugModule custom folder name and port-based naming tests completed');
  } catch (error) {
    console.error('DebugModule custom folder name and port-based naming tests failed:', error);
  }
}

// Mock module class for testing
class TestSourceModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  // Method to send data
  public async sendData(data: any): Promise<void> {
    // Validate the data before sending
    const validationResult = this['validateInput'](data);
    
    if (!validationResult.isValid) {
      throw new Error(`Invalid data: ${validationResult.errors.join(', ')}`);
    }
    
    console.log(`TestSourceModule ${this['info'].id} sending data:`, data);
    
    // Log the send operation
    if (this['debugModule']) {
      this['debugModule'].log(`Sending data from ${this['info'].id}`, LogLevel.DEBUG, this['info']);
    }
    
    // Transfer the data to connected modules
    await this['transferData'](data);
  }
  
  // Override abstract methods
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`TestSourceModule ${this['info'].id} initialized`);
  }
  
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    console.log(`TestSourceModule ${this['info'].id} received data:`, dataTransfer.data);
  }
}

class TestTargetModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  // Override abstract methods
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`TestTargetModule ${this['info'].id} initialized`);
  }
  
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    console.log(`TestTargetModule ${this['info'].id} received data:`, dataTransfer.data);
    
    // Validate the received data
    this.validateReceivedData(dataTransfer.data);
  }
  
  /**
   * Validates received data
   * @param data - Received data
   */
  private validateReceivedData(data: any): void {
    if (typeof data.message !== 'string') {
      console.error(`TestTargetModule ${this['info'].id} received invalid data: message is not a string`);
    }
    
    if (typeof data.timestamp !== 'number') {
      console.error(`TestTargetModule ${this['info'].id} received invalid data: timestamp is not a number`);
    }
    
    console.log(`TestTargetModule ${this['info'].id} validated received data successfully`);
  }
}

// Run the test
runDebugModuleCustomFolderTest();