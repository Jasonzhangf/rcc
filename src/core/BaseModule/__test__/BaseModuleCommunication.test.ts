import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';

/**
 * Integration test for BaseModule communication
 * This test verifies the handshake and data transfer between two BaseModule instances
 */
describe('BaseModule Communication', () => {
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
      
      // Transfer the data to connected modules
      await this['transferData'](data);
    }
    
    // Override abstract methods
    public async initialize(): Promise<void> {
      await super.initialize();
    }
    
    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
    }
  }
  
  class TestTargetModule extends BaseModule {
    constructor(info: ModuleInfo) {
      super(info);
    }
    
    // Override abstract methods
    public async initialize(): Promise<void> {
      await super.initialize();
    }
    
    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
      
      // Validate the received data
      this.validateReceivedData(dataTransfer.data);
    }
    
    /**
     * Validates received data
     * @param data - Received data
     */
    private validateReceivedData(data: any): void {
      if (typeof data.message !== 'string') {
        throw new Error('Message is not a string');
      }
      
      if (typeof data.timestamp !== 'number') {
        throw new Error('Timestamp is not a number');
      }
    }
  }
  
  let sender: TestSourceModule;
  let receiver: TestTargetModule;
  
  beforeEach(() => {
    // Create module instances
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
    
    sender = new TestSourceModule(senderInfo);
    receiver = new TestTargetModule(receiverInfo);
    
    // Add validation rules to sender
    (sender as any).validationRules = [
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
  });
  
  afterEach(async () => {
    await sender['destroy']();
    await receiver['destroy']();
  });
  
  it('should perform handshake between modules', async () => {
    // Initialize modules
    await sender.initialize();
    await receiver.initialize();
    
    // Perform handshake
    const handshakeResult = await sender['handshake'](receiver);
    
    // Verify handshake was successful
    expect(handshakeResult).toBe(true);
  });
  
  it('should transfer data between modules', async () => {
    // Initialize modules
    await sender.initialize();
    await receiver.initialize();
    
    // Create connection information
    const connection: ConnectionInfo = {
      id: 'connection-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    // Add connection to sender
    sender['addOutputConnection'](connection);
    
    // Modify transferData to directly call receiver's receiveData method
    const originalTransferData = sender['transferData'];
    sender['transferData'] = async function(data: any) {
      // Call the original transferData method to record sent data
      await originalTransferData.call(this, data);
      
      // Create a data transfer object
      const dataTransfer: DataTransfer = {
        id: `transfer-${Date.now()}`,
        sourceConnectionId: 'sender-1',
        targetConnectionId: 'receiver-1',
        data: data,
        timestamp: Date.now()
      };
      
      // Call receiver's receiveData method directly
      await receiver['receiveData'](dataTransfer);
    };
    
    // Send test data
    const testData = {
      message: 'Hello from sender module',
      timestamp: Date.now(),
      metadata: {
        test: true,
        sequence: 1
      }
    };
    
    await sender.sendData(testData);
    
    // Verify sent data
    const sentData = sender['getSentData']();
    expect(sentData).toHaveLength(1);
    
    // Verify receiver received data
    const receivedData = receiver['getReceivedData']();
    expect(receivedData).toHaveLength(1);
    
    // Validate data transfer
    const sentRecord = sentData[0];
    const receivedRecord = receivedData[0];
    
    // Check if data matches
    expect(sentRecord.data.message).toBe(receivedRecord.data.message);
    expect(sentRecord.data.timestamp).toBe(receivedRecord.data.timestamp);
  });
  
  it('should validate data during transfer', async () => {
    // Initialize modules
    await sender.initialize();
    await receiver.initialize();
    
    // Send invalid data (missing required fields)
    const invalidData = {
      message: 123, // Should be string
      timestamp: 'not-a-number' // Should be number
    };
    
    // Expect validation to fail
    await expect(sender.sendData(invalidData)).rejects.toThrow();
  });
});