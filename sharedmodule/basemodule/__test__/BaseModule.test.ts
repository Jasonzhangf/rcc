import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../src/interfaces/ModuleInfo';

describe('BaseModule', () => {
  let mockModuleInfo: ModuleInfo;
  let testModule: TestModule;

  class TestModule extends BaseModule {
    public async initialize(): Promise<void> {
      await super.initialize();
      this.logInfo('TestModule initialized');
    }

    public async receiveData(dataTransfer: any): Promise<void> {
      this.logInfo('TestModule received data', dataTransfer.data);
    }
  }

  beforeEach(() => {
    mockModuleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'A test module',
      type: 'test'
    };
    
    testModule = new TestModule(mockModuleInfo);
  });

  test('should create module with correct info', () => {
    const info = testModule.getInfo();
    expect(info).toEqual(mockModuleInfo);
  });

  test('should initialize correctly', async () => {
    await testModule.initialize();
    // Test module should be initialized
    expect(testModule.getInfo()).toEqual(mockModuleInfo);
  });

  test('should handle configuration', () => {
    const config = { setting1: 'value1', setting2: 42 };
    testModule.configure(config);
    
    const retrievedConfig = testModule.getConfig();
    expect(retrievedConfig).toEqual(config);
  });

  test('should throw error if configured after initialization', async () => {
    await testModule.initialize();
    
    expect(() => {
      testModule.configure({ setting: 'value' });
    }).toThrow('Cannot configure module after initialization');
  });

  test('should handle debug configuration', () => {
    const debugConfig = {
      enabled: false,
      level: 'error' as const,
      recordStack: false,
      maxLogEntries: 500,
      consoleOutput: false,
      trackDataFlow: false
    };
    
    testModule.setDebugConfig(debugConfig);
    const retrievedConfig = testModule.getDebugConfig();
    
    expect(retrievedConfig).toMatchObject(debugConfig);
  });

  test('should add and remove input connections', () => {
    const connection = {
      id: 'input-1',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    };
    
    testModule.addInputConnection(connection);
    const connections = testModule.getInputConnections();
    expect(connections).toContain(connection);
    
    testModule.removeInputConnection('input-1');
    const connectionsAfterRemove = testModule.getInputConnections();
    expect(connectionsAfterRemove).not.toContain(connection);
  });

  test('should add and remove output connections', () => {
    const connection = {
      id: 'output-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    };
    
    testModule.addOutputConnection(connection);
    const connections = testModule.getOutputConnections();
    expect(connections).toContain(connection);
    
    testModule.removeOutputConnection('output-1');
    const connectionsAfterRemove = testModule.getOutputConnections();
    expect(connectionsAfterRemove).not.toContain(connection);
  });

  test('should throw error for invalid connection types', () => {
    const invalidInputConnection = {
      id: 'invalid-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    };
    
    expect(() => {
      testModule.addInputConnection(invalidInputConnection);
    }).toThrow('Invalid connection type for input');
    
    const invalidOutputConnection = {
      id: 'invalid-2',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    };
    
    expect(() => {
      testModule.addOutputConnection(invalidOutputConnection);
    }).toThrow('Invalid connection type for output');
  });

  test('should validate input data', () => {
    testModule.configure({}); // Configure to allow testing
    
    // Add validation rules
    (testModule as any).validationRules = [
      {
        field: 'name',
        type: 'required' as const,
        message: 'Name is required'
      },
      {
        field: 'age',
        type: 'number' as const,
        message: 'Age must be a number'
      }
    ];
    
    const validData = { name: 'John', age: 30 };
    const invalidData = { age: 'thirty' };
    const missingData = { age: 30 };
    
    const validResult = (testModule as any).validateInput(validData);
    expect(validResult.isValid).toBe(true);
    
    const invalidResult = (testModule as any).validateInput(invalidData);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('Age must be a number');
    
    const missingResult = (testModule as any).validateInput(missingData);
    expect(missingResult.isValid).toBe(false);
    expect(missingResult.errors).toContain('Name is required');
  });

  test('should handle messages', async () => {
    await testModule.initialize();
    
    const message = {
      id: 'test-message',
      type: 'ping',
      source: 'test-sender',
      target: 'test-module',
      payload: {},
      timestamp: Date.now()
    };
    
    const response = await testModule.handleMessage(message);
    expect(response).toBeDefined();
    if (response && typeof response === 'object' && 'success' in response) {
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ pong: true, moduleId: 'test-module' });
    }
  });

  test('should destroy correctly', async () => {
    await testModule.initialize();
    
    // Add some test data
    testModule.addInputConnection({
      id: 'input-1',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    });
    
    testModule.addOutputConnection({
      id: 'output-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1'
    });
    
    await testModule.destroy();
    
    expect(testModule.getInputConnections()).toHaveLength(0);
    expect(testModule.getOutputConnections()).toHaveLength(0);
    expect(testModule.getDebugLogs()).toHaveLength(0);
  });
});