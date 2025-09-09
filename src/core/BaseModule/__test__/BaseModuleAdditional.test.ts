import { BaseModule } from '../../BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { Message, MessageResponse } from '../../../interfaces/Message';

/**
 * Additional unit tests for BaseModule to improve coverage
 */
describe('BaseModule Additional Tests', () => {
  let module: BaseModule;
  let moduleInfo: ModuleInfo;
  
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
    
    // Expose protected methods for testing
    public setDebugConfigPublic(config: any) {
      (this as any).setDebugConfig(config);
    }
    
    public getDebugConfigPublic() {
      return (this as any).getDebugConfig();
    }
    
    public getDebugLogsPublic(level?: any, limit?: number) {
      return (this as any).getDebugLogs(level, limit);
    }
    
    public clearDebugLogsPublic() {
      (this as any).clearDebugLogs();
    }
    
    public debugPublic(level: any, message: string, data?: any, method?: string) {
      (this as any).debug(level, message, data, method);
    }
    
    public tracePublic(message: string, data?: any, method?: string) {
      (this as any).trace(message, data, method);
    }
    
    public logPublic(message: string, data?: any, method?: string) {
      (this as any).log(message, data, method);
    }
    
    public logInfoPublic(message: string, data?: any, method?: string) {
      (this as any).logInfo(message, data, method);
    }
    
    public warnPublic(message: string, data?: any, method?: string) {
      (this as any).warn(message, data, method);
    }
    
    public errorPublic(message: string, data?: any, method?: string) {
      (this as any).error(message, data, method);
    }
    
    public sendMessagePublic(
      type: string, 
      payload: any, 
      target?: string, 
      metadata?: Record<string, any>, 
      ttl?: number, 
      priority?: number
    ): void {
      (this as any).sendMessage(type, payload, target, metadata, ttl, priority);
    }
    
    public async sendRequestPublic(
      type: string,
      payload: any,
      target: string,
      timeout?: number,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): Promise<MessageResponse> {
      return (this as any).sendRequest(type, payload, target, timeout, metadata, ttl, priority);
    }
    
    public sendRequestAsyncPublic(
      type: string,
      payload: any,
      target: string,
      callback: (response: MessageResponse) => void,
      timeout?: number,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      (this as any).sendRequestAsync(type, payload, target, callback, timeout, metadata, ttl, priority);
    }
    
    public broadcastMessagePublic(
      type: string,
      payload: any,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      (this as any).broadcastMessage(type, payload, metadata, ttl, priority);
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
  
  // Debug configuration tests
  it('should set and get debug configuration', () => {
    const newConfig = {
      enabled: false,
      level: 'error' as const,
      recordStack: false,
      maxLogEntries: 500,
      consoleOutput: false,
      trackDataFlow: false
    };
    
    (module as TestModule).setDebugConfigPublic(newConfig);
    const config = (module as TestModule).getDebugConfigPublic();
    
    expect(config.enabled).toBe(false);
    expect(config.level).toBe('error');
    expect(config.recordStack).toBe(false);
    expect(config.maxLogEntries).toBe(500);
    expect(config.consoleOutput).toBe(false);
    expect(config.trackDataFlow).toBe(false);
  });
  
  // Debug logging tests
  it('should log debug messages', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (module as TestModule).debugPublic('debug', 'Debug message', { test: true }, 'testMethod');
    (module as TestModule).debugPublic('warn', 'Warning message', { test: true }, 'testMethod');
    (module as TestModule).debugPublic('error', 'Error message', { test: true }, 'testMethod');
    
    // Check that the specific messages were logged (not just any messages)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Debug message'),
      { test: true }
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning message'),
      { test: true }
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error message'),
      { test: true }
    );
    
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  it('should filter debug messages by level', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Set debug level to 'warn', so 'debug' messages should be filtered out
    (module as TestModule).setDebugConfigPublic({ level: 'warn' });
    (module as TestModule).debugPublic('debug', 'Debug message');
    
    // Check that debug message was not logged
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Debug message'),
      expect.anything()
    );
    
    // 'warn' messages should still be logged
    (module as TestModule).debugPublic('warn', 'Warning message');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning message'),
      expect.anything()
    );
    
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  it('should disable debug logging when disabled', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    (module as TestModule).setDebugConfigPublic({ enabled: false });
    (module as TestModule).debugPublic('debug', 'Debug message');
    (module as TestModule).debugPublic('warn', 'Warning message');
    
    // No messages should be logged when disabled
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Debug message'),
      expect.anything()
    );
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning message'),
      expect.anything()
    );
    
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  it('should limit debug log entries', () => {
    (module as TestModule).setDebugConfigPublic({ maxLogEntries: 2 });
    
    (module as TestModule).debugPublic('debug', 'Message 1');
    (module as TestModule).debugPublic('debug', 'Message 2');
    (module as TestModule).debugPublic('debug', 'Message 3');
    
    const logs = (module as TestModule).getDebugLogsPublic();
    expect(logs).toHaveLength(2);
  });
  
  it('should clear debug logs', () => {
    (module as TestModule).debugPublic('debug', 'Message 1');
    (module as TestModule).debugPublic('debug', 'Message 2');
    
    let logs = (module as TestModule).getDebugLogsPublic();
    expect(logs).toHaveLength(2);
    
    (module as TestModule).clearDebugLogsPublic();
    
    logs = (module as TestModule).getDebugLogsPublic();
    expect(logs).toHaveLength(0);
  });
  
  it('should filter debug logs by level', () => {
    (module as TestModule).debugPublic('debug', 'Debug message');
    (module as TestModule).debugPublic('warn', 'Warning message');
    (module as TestModule).debugPublic('error', 'Error message');
    
    const debugLogs = (module as TestModule).getDebugLogsPublic('debug');
    const warnLogs = (module as TestModule).getDebugLogsPublic('warn');
    const errorLogs = (module as TestModule).getDebugLogsPublic('error');
    
    expect(debugLogs).toHaveLength(1);
    expect(warnLogs).toHaveLength(1);
    expect(errorLogs).toHaveLength(1);
    
    expect(debugLogs[0].level).toBe('debug');
    expect(warnLogs[0].level).toBe('warn');
    expect(errorLogs[0].level).toBe('error');
  });
  
  it('should limit debug logs by count', () => {
    (module as TestModule).debugPublic('debug', 'Message 1');
    (module as TestModule).debugPublic('debug', 'Message 2');
    (module as TestModule).debugPublic('debug', 'Message 3');
    (module as TestModule).debugPublic('debug', 'Message 4');
    (module as TestModule).debugPublic('debug', 'Message 5');
    
    const logs = (module as TestModule).getDebugLogsPublic(undefined, 3);
    expect(logs).toHaveLength(3);
    expect(logs[0].message).toBe('Message 3');
    expect(logs[1].message).toBe('Message 4');
    expect(logs[2].message).toBe('Message 5');
  });
  
  // Convenience logging method tests
  it('should log trace messages', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (module as TestModule).tracePublic('Trace message', { test: true }, 'testMethod');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should log debug messages', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (module as TestModule).logPublic('Debug message', { test: true }, 'testMethod');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should log info messages', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (module as TestModule).logInfoPublic('Info message', { test: true }, 'testMethod');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should log warning messages', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    (module as TestModule).warnPublic('Warning message', { test: true }, 'testMethod');
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    consoleWarnSpy.mockRestore();
  });
  
  it('should log error messages', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (module as TestModule).errorPublic('Error message', { test: true }, 'testMethod');
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  // Message sending tests
  it('should send message', () => {
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'sendMessage');
    
    (module as TestModule).sendMessagePublic('test_type', { data: 'test' }, 'target-1');
    expect(messageCenterSpy).toHaveBeenCalled();
    
    messageCenterSpy.mockRestore();
  });
  
  it('should broadcast message', () => {
    const messageCenterSpy = jest.spyOn((module as any).messageCenter, 'broadcastMessage');
    
    (module as TestModule).broadcastMessagePublic('test_type', { data: 'test' });
    expect(messageCenterSpy).toHaveBeenCalled();
    
    messageCenterSpy.mockRestore();
  });
  
  // Handle message tests
  it('should handle ping message', async () => {
    const message: Message = {
      id: 'msg-1',
      type: 'ping',
      source: 'sender-1',
      payload: {},
      timestamp: Date.now(),
      correlationId: 'corr-1'
    };
    
    const result = await module.handleMessage(message);
    expect(result).toBeDefined();
    expect((result as MessageResponse).success).toBe(true);
    expect((result as MessageResponse).data).toEqual({ pong: true, moduleId: 'test-1' });
  });
  
  it('should handle unhandled message type', async () => {
    const message: Message = {
      id: 'msg-1',
      type: 'unknown_type',
      source: 'sender-1',
      payload: {},
      timestamp: Date.now(),
      correlationId: 'corr-1'
    };
    
    const result = await module.handleMessage(message);
    expect(result).toBeDefined();
    expect((result as MessageResponse).success).toBe(false);
    expect((result as MessageResponse).error).toContain('Unhandled message type: unknown_type');
  });
  
  // Module lifecycle event tests
  it('should handle module registration event', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    module.onModuleRegistered('new-module');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should handle module unregistration event', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    module.onModuleUnregistered('old-module');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  // Edge case tests
  it('should handle debug logging without data', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (module as TestModule).debugPublic('debug', 'Message without data');
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should handle debug logging without method', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (module as TestModule).debugPublic('debug', 'Message without method', { test: true });
    expect(consoleLogSpy).toHaveBeenCalled();
    
    consoleLogSpy.mockRestore();
  });
  
  it('should handle error logging with stack trace', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (module as TestModule).setDebugConfigPublic({ recordStack: true });
    (module as TestModule).debugPublic('error', 'Error with stack trace');
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});