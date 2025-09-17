import { DebugModule } from '../src/DebugModule';
import { BaseModule, ModuleInfo } from '../src/BaseModule';

// Test class that extends BaseModule
class TestModule extends BaseModule {
  constructor(moduleInfo: ModuleInfo) {
    super(moduleInfo);
  }

  public async initialize(): Promise<void> {
    await super.initialize();
    this.logInfo('TestModule initialized');
  }

  public async receiveData(dataTransfer: any): Promise<void> {
    this.logInfo('TestModule received data', dataTransfer.data);
  }
}

describe('Debug System Integration Test', () => {
  let testModule: TestModule;

  beforeEach(() => {
    const moduleInfo: ModuleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'A test module',
      type: 'test',
    };
    testModule = new TestModule(moduleInfo);
  });

  test('should use integrated debug system', () => {
    // Enable two-phase debug
    testModule.enableTwoPhaseDebug('./test-debug-logs');

    // Test logging
    testModule.logInfo('Test message', { data: 'test' });

    // Get debug system
    const debugSystem = testModule.getTwoPhaseDebugSystem();
    expect(debugSystem).toBeInstanceOf(DebugModule);

    // Check that debug system is working
    const config = debugSystem.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.phase).toBe('systemstart');
  });

  test('should switch to port mode', () => {
    testModule.enableTwoPhaseDebug('./test-debug-logs');

    // Switch to port mode
    testModule.switchDebugToPortMode(3000);

    const debugSystem = testModule.getTwoPhaseDebugSystem();
    const config = debugSystem.getConfig();
    expect(config.phase).toBe('port');
    expect(config.port).toBe(3000);
  });

  test('should handle configuration updates', () => {
    testModule.enableTwoPhaseDebug('./test-debug-logs');

    const debugSystem = testModule.getTwoPhaseDebugSystem();

    // Update configuration
    debugSystem.updateBaseDirectory('./new-debug-logs');

    const config = debugSystem.getConfig();
    expect(config.baseDirectory).toBe('./new-debug-logs');
  });

  test('should maintain backward compatibility', () => {
    testModule.enableTwoPhaseDebug('./test-debug-logs');

    const debugSystem = testModule.getTwoPhaseDebugSystem();

    // Test legacy methods
    debugSystem.updateLogDirectory('./legacy-logs');
    expect(debugSystem.getLogDirectory()).toBe('./legacy-logs');

    // Test original logging methods
    debugSystem.info('Legacy test message');
    const logs = debugSystem.getLogs();
    expect(logs[logs.length - 1].message).toBe('Legacy test message');
  });
});
