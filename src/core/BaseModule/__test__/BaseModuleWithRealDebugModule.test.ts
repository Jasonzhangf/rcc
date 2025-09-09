import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { DebugModule } from '../../../modules/debug/src/DebugModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test for BaseModule with real DebugModule
 * This test verifies that BaseModule works correctly with a real DebugModule instance
 */
describe('BaseModule with Real DebugModule', () => {
  let module: BaseModule;
  let debugModule: DebugModule;
  let moduleInfo: ModuleInfo;
  let debugInfo: ModuleInfo;
  
  // Mock module class for testing
  class TestModule extends BaseModule {
    constructor(info: ModuleInfo) {
      super(info);
    }
    
    // Override abstract methods
    public async initialize(): Promise<void> {
      await super.initialize();
    }
    
    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
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
    
    debugInfo = {
      id: 'debug-1',
      type: 'debug',
      name: 'Debug Module',
      version: '1.0.0',
      description: 'Debug module for logging and debugging'
    };
    
    module = new TestModule(moduleInfo);
    debugModule = DebugModule.createInstance(debugInfo);
  });
  
  afterEach(async () => {
    await module.destroy();
    await debugModule.destroy();
    
    // Clean up log files
    const logDir = './logs';
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });
  
  it('should work with real DebugModule instance', async () => {
    // Configure debug module
    debugModule.configure({
      consoleOutput: true,
      rootDir: './logs',
      customFolderName: 'test-folder',
      fileLogging: true,
      logLevel: 1, // INFO level
      recordDataFlow: true,
      recordCallStack: true,
      maxLogFiles: 5
    });
    
    // Initialize debug module
    await debugModule.initialize();
    
    // Set debug module for test module
    (module as any).setDebugModule(debugModule);
    
    // Initialize test module
    await module.initialize();
    
    // Verify initialization worked
    expect((module as any).initialized).toBe(true);
    
    // Add a connection
    const connection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(connection);
    
    // Verify connection was added
    expect(module.getOutputConnections()).toHaveLength(1);
    
    // Remove connection
    module.removeOutputConnection('output-1');
    
    // Verify connection was removed
    expect(module.getOutputConnections()).toHaveLength(0);
    
    // Check that debug logs were created
    const logs = debugModule.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    
    // Verify some expected log messages
    const logMessages = logs.map(log => log.message);
    expect(logMessages).toContain(`Module ${moduleInfo.id} initialized`);
    expect(logMessages).toContain(`Added output connection output-1 to module ${moduleInfo.id}`);
    expect(logMessages).toContain(`Removed output connection output-1 from module ${moduleInfo.id}`);
  });
  
  it('should handle data flow recording with real DebugModule', async () => {
    // Configure debug module
    debugModule.configure({
      consoleOutput: true,
      rootDir: './logs',
      customFolderName: 'dataflow-test',
      fileLogging: true,
      logLevel: 0, // DEBUG level
      recordDataFlow: true,
      recordCallStack: true,
      maxLogFiles: 5
    });
    
    // Initialize debug module
    await debugModule.initialize();
    
    // Set debug module for test module
    (module as any).setDebugModule(debugModule);
    
    // Initialize test module
    await module.initialize();
    
    // Create connection
    const connection: ConnectionInfo = {
      id: 'output-1',
      sourceModuleId: 'test-1',
      targetModuleId: 'receiver-1',
      type: 'output',
      status: 'pending'
    };
    
    module.addOutputConnection(connection);
    
    // Simulate receiving data
    const dataTransfer: DataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'Hello World', timestamp: Date.now() },
      timestamp: Date.now()
    };
    
    await module.receiveData(dataTransfer);
    
    // Check that debug logs were created
    const logs = debugModule.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    
    // Verify data flow was recorded
    const dataFlowLogs = logs.filter(log => log.message.includes('Data flow'));
    expect(dataFlowLogs.length).toBeGreaterThan(0);
  });
  
  it('should handle handshake with real DebugModule', async () => {
    // Configure debug module
    debugModule.configure({
      consoleOutput: true,
      rootDir: './logs',
      customFolderName: 'handshake-test',
      fileLogging: true,
      logLevel: 1, // INFO level
      recordDataFlow: true,
      recordCallStack: true,
      maxLogFiles: 5
    });
    
    // Initialize debug module
    await debugModule.initialize();
    
    // Set debug module for test module
    (module as any).setDebugModule(debugModule);
    
    // Initialize test module
    await module.initialize();
    
    // Create another test module for handshake
    const targetModuleInfo: ModuleInfo = {
      id: 'target-1',
      type: 'test',
      name: 'Target Test Module',
      version: '1.0.0',
      description: 'Target test module for handshake testing'
    };
    
    const targetModule = new TestModule(targetModuleInfo);
    
    // Set debug module for target module
    (targetModule as any).setDebugModule(debugModule);
    
    // Initialize target module
    await targetModule.initialize();
    
    // Perform handshake
    const result = await module.handshake(targetModule);
    
    // Verify handshake was successful
    expect(result).toBe(true);
    
    // Check that debug logs were created
    const logs = debugModule.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    
    // Verify handshake was logged
    const logMessages = logs.map(log => log.message);
    expect(logMessages).toContain(`Handshake performed between ${moduleInfo.id} and ${targetModuleInfo.id}`);
    
    // Clean up target module
    await targetModule.destroy();
  });
});