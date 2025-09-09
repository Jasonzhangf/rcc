import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule } from '../../../interfaces/Validation';
import { Message, MessageResponse } from '../../../interfaces/Message';
import { IDebugModule } from '../../../modules/debug/interfaces/IDebugModule';
import { DebugModule } from '../../../modules/debug/src/DebugModule';

/**
 * Unit tests for BaseModule
 */
describe('BaseModule', () => {
  let module: BaseModule;
  let moduleInfo: ModuleInfo;
  
  // Mock module class for testing
  class TestModule extends BaseModule {
    constructor(info: ModuleInfo) {
      super(info);
      // Add some validation rules for testing
      this.validationRules = [
        { field: 'name', type: 'required', message: 'Name is required' },
        { field: 'age', type: 'number', message: 'Age must be a number' },
        { field: 'email', type: 'string', message: 'Email must be a string' }
      ];
    }
    
    // Override abstract methods
    public async initialize(): Promise<void> {
      await super.initialize();
    }
    
    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
    }
    
    // Expose protected methods for testing
    public validateInputPublic(data: any) {
      return this.validateInput(data);
    }
    
    public async transferDataPublic(data: any, targetConnectionId?: string): Promise<void> {
      return this.transferData(data, targetConnectionId);
    }
    
    public sendMessagePublic(type: string, payload: any, target?: string): void {
      this.sendMessage(type, payload, target);
    }
    
    public async sendRequestPublic(type: string, payload: any, target: string, timeout?: number): Promise<MessageResponse> {
      return this.sendRequest(type, payload, target, timeout);
    }
    
    public sendRequestAsyncPublic(type: string, payload: any, target: string, callback: (response: MessageResponse) => void, timeout?: number): void {
      this.sendRequestAsync(type, payload, target, callback, timeout);
    }
    
    public broadcastMessagePublic(type: string, payload: any): void {
      this.broadcastMessage(type, payload);
    }
    
    public getSentDataPublic(): any[] {
      return this.getSentData();
    }
    
    public getReceivedDataPublic(): any[] {
      return this.getReceivedData();
    }
  }
  
  beforeEach(() => {
    moduleInfo = {
      id: 'test-1',
      type: 'test',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module for unit testing'
    };
    
    module = new TestModule(moduleInfo);
  });
  
  afterEach(async () => {
    await module.destroy();
  });
  
  // 1. 模块配置和初始化测试
  it('should create a module instance', () => {
    expect(module).toBeInstanceOf(TestModule);
    expect(module.getInfo().id).toBe('test-1');
  });
  
  it('should configure the module', () => {
    const config = { maxRetries: 3, timeout: 5000 };
    module.configure(config);
    expect(module.getConfig()).toEqual(config);
  });
  
  it('should not allow configuration after initialization', async () => {
    await module.initialize();
    expect(() => module.configure({})).toThrow('Cannot configure module after initialization');
  });
  
  it('should initialize successfully', async () => {
    await expect(module.initialize()).resolves.not.toThrow();
    expect((module as any).initialized).toBe(true);
  });
  
  it('should warn when initializing without configuration', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await module.initialize();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Module test-1 is being initialized without configuration');
    consoleWarnSpy.mockRestore();
  });
  
  it('should not warn when initializing with configuration', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    module.configure({ test: true });
    await module.initialize();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
  
  // 2. 连接管理测试
  it('should add and get connections', () => {
    const inputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'input',
      status: 'pending'
    };
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addInputConnection(inputConnection);
    module.addOutputConnection(outputConnection);
    
    expect(module.getInputConnections()).toHaveLength(1);
    expect(module.getOutputConnections()).toHaveLength(1);
    expect(module.getInputConnections()[0]).toEqual(inputConnection);
    expect(module.getOutputConnections()[0]).toEqual(outputConnection);
  });
  
  it('should remove connections', () => {
    const inputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'input',
      status: 'pending'
    };
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addInputConnection(inputConnection);
    module.addOutputConnection(outputConnection);
    
    expect(module.getInputConnections()).toHaveLength(1);
    expect(module.getOutputConnections()).toHaveLength(1);
    
    module.removeInputConnection('input-1');
    module.removeOutputConnection('output-1');
    
    expect(module.getInputConnections()).toHaveLength(0);
    expect(module.getOutputConnections()).toHaveLength(0);
  });
  
  it('should validate connection types', () => {
    const invalidInputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'output', // Invalid type for input connection
      status: 'pending'
    };
    
    const invalidOutputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'input', // Invalid type for output connection
      status: 'pending'
    };
    
    expect(() => module.addInputConnection(invalidInputConnection)).toThrow('Invalid connection type for input');
    expect(() => module.addOutputConnection(invalidOutputConnection)).toThrow('Invalid connection type for output');
  });
  
  // 3. 数据验证功能测试（validateInput方法）
  it('should validate input data successfully', () => {
    const validData = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com'
    };
    
    const result = (module as TestModule).validateInputPublic(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should fail validation when required field is missing', () => {
    const invalidData = {
      age: 30,
      email: 'john@example.com'
    };
    
    const result = (module as TestModule).validateInputPublic(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });
  
  it('should fail validation when field type is incorrect', () => {
    const invalidData = {
      name: 'John Doe',
      age: 'thirty', // Should be number
      email: 'john@example.com'
    };
    
    const result = (module as TestModule).validateInputPublic(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age must be a number');
  });
  
  it('should validate multiple fields with different types', () => {
    const invalidData = {
      name: 123, // Should be string
      age: 'thirty', // Should be number
      email: 123 // Should be string
    };
    
    const result = (module as TestModule).validateInputPublic(invalidData);
    expect(result.isValid).toBe(false);
    // Note: The 'required' validation for name field will not trigger because the field exists (even though it's the wrong type)
    // Only the type validations for age and email will fail
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Age must be a number');
    expect(result.errors).toContain('Email must be a string');
  });
  
  it('should validate object and array types', async () => {
    class TestModuleWithObjectArray extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { field: 'obj', type: 'object', message: 'Obj must be an object' },
          { field: 'arr', type: 'array', message: 'Arr must be an array' }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithObjectArray(moduleInfo);
    
    const validData = {
      obj: { key: 'value' },
      arr: [1, 2, 3]
    };
    
    const result = (testModule as any).validateInputPublic(validData);
    expect(result.isValid).toBe(true);
    
    const invalidData = {
      obj: 'not an object',
      arr: 'not an array'
    };
    
    const result2 = (testModule as any).validateInputPublic(invalidData);
    expect(result2.isValid).toBe(false);
    expect(result2.errors).toContain('Obj must be an object');
    expect(result2.errors).toContain('Arr must be an array');
    
    await testModule.destroy();
  });
  
  it('should validate with custom validation rules', async () => {
    class TestModuleWithCustomValidation extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { 
            field: 'email', 
            type: 'custom', 
            validator: (value: any) => typeof value === 'string' && value.includes('@'),
            message: 'Email must be valid'
          }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithCustomValidation(moduleInfo);
    
    const validData = {
      email: 'test@example.com'
    };
    
    const result = (testModule as any).validateInputPublic(validData);
    expect(result.isValid).toBe(true);
    
    const invalidData = {
      email: 'invalid-email'
    };
    
    const result2 = (testModule as any).validateInputPublic(invalidData);
    expect(result2.isValid).toBe(false);
    expect(result2.errors).toContain('Email must be valid');
    
    await testModule.destroy();
  });
  
  // 4. 数据传输功能测试（transferData方法）
  it('should transfer data to all output connections', async () => {
    const outputConnection1: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    const outputConnection2: ConnectionInfo = {
      id: 'output-2',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-2',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(outputConnection1);
    module.addOutputConnection(outputConnection2);
    
    const testData = { message: 'Hello World' };
    await (module as TestModule).transferDataPublic(testData);
    
    const sentData = (module as TestModule).getSentDataPublic();
    expect(sentData).toHaveLength(1);
    expect(sentData[0].data).toEqual(testData);
  });
  
  it('should transfer data to specific connection', async () => {
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(outputConnection);
    
    const testData = { message: 'Hello Specific Connection' };
    await (module as TestModule).transferDataPublic(testData, 'output-1');
    
    const sentData = (module as TestModule).getSentDataPublic();
    expect(sentData).toHaveLength(1);
    expect(sentData[0].data).toEqual(testData);
  });
  
  it('should throw error when transferring to non-existent connection', async () => {
    const testData = { message: 'Hello World' };
    await expect((module as TestModule).transferDataPublic(testData, 'non-existent')).rejects.toThrow("Output connection with ID 'non-existent' not found");
  });
  
  // 5. 数据接收功能测试（receiveData方法）
  it('should receive data successfully', async () => {
    const dataTransfer: DataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'Hello', timestamp: Date.now() },
      timestamp: Date.now()
    };
    
    await expect(module.receiveData(dataTransfer)).resolves.not.toThrow();
    
    const receivedData = (module as TestModule).getReceivedDataPublic();
    expect(receivedData).toHaveLength(1);
    expect(receivedData[0].data).toEqual(dataTransfer.data);
    expect(receivedData[0].source).toBe('source-1');
  });
  
  it('should receive multiple data transfers', async () => {
    const dataTransfer1: DataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'First message' },
      timestamp: Date.now()
    };
    
    const dataTransfer2: DataTransfer = {
      id: 'transfer-2',
      sourceConnectionId: 'source-2',
      targetConnectionId: 'test-1',
      data: { message: 'Second message' },
      timestamp: Date.now()
    };
    
    await module.receiveData(dataTransfer1);
    await module.receiveData(dataTransfer2);
    
    const receivedData = (module as TestModule).getReceivedDataPublic();
    expect(receivedData).toHaveLength(2);
    expect(receivedData[0].data).toEqual(dataTransfer1.data);
    expect(receivedData[1].data).toEqual(dataTransfer2.data);
  });
  
  // 6. 消息处理功能测试（handleMessage方法）
  it('should handle message without correlation ID', async () => {
    const message: Message = {
      id: 'msg-1',
      type: 'test',
      source: 'sender-1',
      payload: { data: 'test' },
      timestamp: Date.now()
    };
    
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await module.handleMessage(message);
    expect(result).toBeUndefined();
    // We can't easily test the exact log message because it's complex to match
    // Just verify that console.log was called
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
  
  it('should handle message with correlation ID', async () => {
    const message: Message = {
      id: 'msg-1',
      type: 'test',
      source: 'sender-1',
      correlationId: 'corr-1',
      payload: { data: 'test' },
      timestamp: Date.now()
    };
    
    const result = await module.handleMessage(message);
    expect(result).toBeDefined();
    expect((result as MessageResponse).success).toBe(true);
    expect((result as MessageResponse).messageId).toBe('msg-1');
    expect((result as MessageResponse).correlationId).toBe('corr-1');
  });
  
  // 7. 消息发送功能测试
  it('should send message', () => {
    // Mock the message center sendMessage method
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendMessage');
    (module as TestModule).sendMessagePublic('test_type', { data: 'test' }, 'target-1');
    expect(messageCenterSpy).toHaveBeenCalled();
    messageCenterSpy.mockRestore();
  });
  
  it('should broadcast message', () => {
    // Mock the message center broadcastMessage method
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'broadcastMessage');
    (module as TestModule).broadcastMessagePublic('test_type', { data: 'test' });
    expect(messageCenterSpy).toHaveBeenCalled();
    messageCenterSpy.mockRestore();
  });
  
  // 8. 握手功能测试
  it('should perform handshake', async () => {
    const targetModule = new TestModule({
      id: 'target-1',
      type: 'test',
      name: 'Target Module',
      version: '1.0.0',
      description: 'Target test module for unit testing'
    });
    
    const result = await module.handshake(targetModule);
    expect(result).toBe(true);
    
    await targetModule.destroy();
  });
  
  // 9. 资源清理功能测试（destroy方法）
  it('should destroy resources properly', async () => {
    // Add some connections and data
    const inputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'input',
      status: 'pending'
    };
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addInputConnection(inputConnection);
    module.addOutputConnection(outputConnection);
    module.configure({ test: true });
    await module.initialize();
    
    // Verify initial state
    expect(module.getInputConnections()).toHaveLength(1);
    expect(module.getOutputConnections()).toHaveLength(1);
    expect(module.getConfig()).toEqual({ test: true });
    
    // Destroy the module
    await expect(module.destroy()).resolves.not.toThrow();
    
    // Verify cleanup
    expect(module.getInputConnections()).toHaveLength(0);
    expect(module.getOutputConnections()).toHaveLength(0);
    expect(module.getConfig()).toEqual({});
    expect((module as any).initialized).toBe(false);
    expect((module as any).configured).toBe(false);
  });
  
  // 10. 错误处理和边界条件测试
  it('should handle edge cases in validation', async () => {
    class TestModuleWithAllTypes extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { field: 'requiredField', type: 'required', message: 'Required field is missing' },
          { field: 'stringField', type: 'string', message: 'String field is not a string' },
          { field: 'numberField', type: 'number', message: 'Number field is not a number' },
          { field: 'booleanField', type: 'boolean', message: 'Boolean field is not a boolean' },
          { field: 'objectField', type: 'object', message: 'Object field is not an object' },
          { field: 'arrayField', type: 'array', message: 'Array field is not an array' }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithAllTypes(moduleInfo);
    
    // Test with null and undefined values
    const testData = {
      requiredField: null,
      stringField: undefined,
      numberField: 'not a number',
      booleanField: 'not a boolean',
      objectField: 'not an object',
      arrayField: 'not an array'
    };
    
    const result = (testModule as any).validateInputPublic(testData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(6);
    
    await testModule.destroy();
  });
  
  // Additional tests to improve coverage
  it('should handle edge cases in validation with empty object', () => {
    const result = (module as TestModule).validateInputPublic({});
    expect(result.isValid).toBe(false);
    // All three validation rules will fail for an empty object
    expect(result.errors).toHaveLength(3);
    expect(result.errors).toContain('Name is required');
    expect(result.errors).toContain('Age must be a number');
    expect(result.errors).toContain('Email must be a string');
  });
  
  // Additional tests for branch coverage
  it('should handle validation with custom validator returning false', () => {
    class TestModuleWithCustomValidation extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { 
            field: 'email', 
            type: 'custom', 
            validator: (value: any) => false, // Always return false
            message: 'Custom validation failed'
          }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithCustomValidation(moduleInfo);
    
    const testData = {
      email: 'test@example.com'
    };
    
    const result = (testModule as any).validateInputPublic(testData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Custom validation failed');
    
    // Clean up
    testModule.destroy();
  });
  
  it('should handle validation with custom validator returning true', () => {
    class TestModuleWithCustomValidation extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { 
            field: 'email', 
            type: 'custom', 
            validator: (value: any) => true, // Always return true
            message: 'Custom validation failed'
          }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithCustomValidation(moduleInfo);
    
    const testData = {
      email: 'test@example.com'
    };
    
    const result = (testModule as any).validateInputPublic(testData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Clean up
    testModule.destroy();
  });
  
  it('should handle validation with null validator', () => {
    class TestModuleWithCustomValidation extends BaseModule {
      constructor(info: ModuleInfo) {
        super(info);
        this.validationRules = [
          { 
            field: 'email', 
            type: 'custom', 
            validator: null as any, // Null validator
            message: 'Custom validation failed'
          }
        ];
      }
      
      public async initialize(): Promise<void> {
        await super.initialize();
      }
      
      public async receiveData(dataTransfer: DataTransfer): Promise<void> {
        await super.receiveData(dataTransfer);
      }
      
      public validateInputPublic(data: any) {
        return this.validateInput(data);
      }
    }
    
    const testModule = new TestModuleWithCustomValidation(moduleInfo);
    
    const testData = {
      email: 'test@example.com'
    };
    
    const result = (testModule as any).validateInputPublic(testData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Clean up
    testModule.destroy();
  });
  
  it('should handle transferData with metadata', async () => {
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending',
      metadata: { priority: 'high' }
    };
    
    module.addOutputConnection(outputConnection);
    
    const testData = { message: 'Hello with metadata' };
    await (module as TestModule).transferDataPublic(testData);
    
    const sentData = (module as TestModule).getSentDataPublic();
    expect(sentData).toHaveLength(1);
  });
  
  it('should handle receiveData with metadata', async () => {
    const dataTransfer: DataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'Hello with metadata' },
      timestamp: Date.now(),
      metadata: { priority: 'high' }
    };
    
    await module.receiveData(dataTransfer);
    
    const receivedData = (module as TestModule).getReceivedDataPublic();
    expect(receivedData).toHaveLength(1);
    expect(receivedData[0].data).toEqual(dataTransfer.data);
  });
  
  it('should handle handshake with debug module', async () => {
    // Create a simple debug module with only the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const targetModule = new TestModule({
      id: 'target-1',
      type: 'test',
      name: 'Target Module',
      version: '1.0.0',
      description: 'Target test module for unit testing'
    });
    
    const result = await module.handshake(targetModule);
    expect(result).toBe(true);
    
    // Clean up
    await targetModule.destroy();
  });
  
  it('should handle initialize with debug module', async () => {
    // Create a new module for this test
    const newModule = new TestModule({
      id: 'test-2',
      type: 'test',
      name: 'Test Module 2',
      version: '1.0.0',
      description: 'Test module 2 for unit testing'
    });
    
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (newModule as any).setDebugModule(debugModule);
    
    await newModule.initialize();
    expect((newModule as any).initialized).toBe(true);
    
    // Clean up
    await newModule.destroy();
  });
  
  it('should handle addInputConnection with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const inputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'input',
      status: 'pending'
    };
    
    // This should not throw any errors
    expect(() => module.addInputConnection(inputConnection)).not.toThrow();
  });
  
  it('should handle addOutputConnection with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    // This should not throw any errors
    expect(() => module.addOutputConnection(outputConnection)).not.toThrow();
  });
  
  it('should handle removeInputConnection with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const inputConnection: ConnectionInfo = {
      id: 'input-1',
      sourceModuleId: 'sender-1',
      targetModuleId: 'test-1',
      type: 'input',
      status: 'pending'
    };
    
    module.addInputConnection(inputConnection);
    
    // This should not throw any errors
    expect(() => module.removeInputConnection('input-1')).not.toThrow();
  });
  
  it('should handle removeOutputConnection with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(outputConnection);
    
    // This should not throw any errors
    expect(() => module.removeOutputConnection('output-1')).not.toThrow();
  });
  
  it('should handle receiveData with debug module', async () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const dataTransfer: DataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'Hello' },
      timestamp: Date.now()
    };
    
    // This should not throw any errors
    await expect(module.receiveData(dataTransfer)).resolves.not.toThrow();
  });
  
  it('should handle transferData with debug module', async () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const outputConnection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(outputConnection);
    
    const testData = { message: 'Hello' };
    
    // This should not throw any errors
    await expect((module as TestModule).transferDataPublic(testData)).resolves.not.toThrow();
  });
  
  it('should handle handleMessage with debug module', async () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    const message: Message = {
      id: 'msg-1',
      type: 'test',
      source: 'sender-1',
      payload: { data: 'test' },
      timestamp: Date.now()
    };
    
    // This should not throw any errors
    await expect(module.handleMessage(message)).resolves.not.toThrow();
  });
  
  it('should handle onModuleRegistered with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    // This should not throw any errors
    expect(() => (module as any).onModuleRegistered('new-module')).not.toThrow();
  });
  
  it('should handle onModuleUnregistered with debug module', () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    // This should not throw any errors
    expect(() => (module as any).onModuleUnregistered('old-module')).not.toThrow();
  });
  
  it('should handle destroy with debug module', async () => {
    // Create a simple debug module with the methods we need for this test
    const debugModule = {
      log: (message: string) => {
        // Simple implementation that doesn't do anything
      },
      recordDataFlow: (sourceModuleId: string, targetModuleId: string, data: any) => {
        // Simple implementation that doesn't do anything
      },
      addModuleConnection: (moduleId: string, connectionType: 'input' | 'output') => {
        // Simple implementation that doesn't do anything
      },
      removeModuleConnection: (moduleId: string) => {
        // Simple implementation that doesn't do anything
      }
    };
    
    (module as any).setDebugModule(debugModule);
    
    // This should not throw any errors
    await expect(module.destroy()).resolves.not.toThrow();
  });

  // 11. Static factory method tests
  it('should create instance using static factory method', () => {
    const moduleInfo: ModuleInfo = {
      id: 'test-static-1',
      type: 'test',
      name: 'Test Static Module',
      version: '1.0.0',
      description: 'Test static module for unit testing'
    };
    
    const testModule = TestModule.createInstance(moduleInfo);
    expect(testModule).toBeInstanceOf(TestModule);
    expect(testModule.getInfo().id).toBe('test-static-1');
    
    // Clean up
    testModule.destroy();
  });

  // 12. sendRequest method tests
  it('should send request and receive response', async () => {
    // Mock the message center sendRequest method
    const mockResponse: MessageResponse = {
      messageId: 'response-1',
      correlationId: 'corr-1',
      success: true,
      data: { message: 'Response received' },
      timestamp: Date.now()
    };
    
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendRequest')
      .mockResolvedValue(mockResponse);
    
    const response = await (module as TestModule).sendRequestPublic('test_type', { data: 'test' }, 'target-1');
    
    expect(response).toEqual(mockResponse);
    expect(messageCenterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test_type',
        source: 'test-1',
        target: 'target-1',
        payload: { data: 'test' }
      }),
      undefined
    );
    
    messageCenterSpy.mockRestore();
  });

  it('should send request with timeout', async () => {
    // Mock the message center sendRequest method
    const mockResponse: MessageResponse = {
      messageId: 'response-1',
      correlationId: 'corr-1',
      success: true,
      data: { message: 'Response received' },
      timestamp: Date.now()
    };
    
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendRequest')
      .mockResolvedValue(mockResponse);
    
    const response = await (module as TestModule).sendRequestPublic('test_type', { data: 'test' }, 'target-1', 5000);
    
    expect(response).toEqual(mockResponse);
    expect(messageCenterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test_type',
        source: 'test-1',
        target: 'target-1',
        payload: { data: 'test' }
      }),
      5000
    );
    
    messageCenterSpy.mockRestore();
  });

  // 13. sendRequestAsync method tests
  it('should send request async with callback', () => {
    // Mock the message center sendRequestAsync method
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendRequestAsync');
    
    const mockCallback = jest.fn();
    
    (module as TestModule).sendRequestAsyncPublic('test_type', { data: 'test' }, 'target-1', mockCallback);
    
    expect(messageCenterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test_type',
        source: 'test-1',
        target: 'target-1',
        payload: { data: 'test' }
      }),
      mockCallback,
      undefined
    );
    
    messageCenterSpy.mockRestore();
  });

  it('should send request async with callback and timeout', () => {
    // Mock the message center sendRequestAsync method
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendRequestAsync');
    
    const mockCallback = jest.fn();
    
    (module as TestModule).sendRequestAsyncPublic('test_type', { data: 'test' }, 'target-1', mockCallback, 5000);
    
    expect(messageCenterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test_type',
        source: 'test-1',
        target: 'target-1',
        payload: { data: 'test' }
      }),
      mockCallback,
      5000
    );
    
    messageCenterSpy.mockRestore();
  });
});