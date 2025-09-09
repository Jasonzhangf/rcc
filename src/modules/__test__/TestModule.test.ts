import { TestModule } from '../TestModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

/**
 * Unit tests for TestModule
 */
describe('TestModule', () => {
  let module: TestModule;
  let moduleInfo: ModuleInfo;
  
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
  });
  
  it('should process data successfully', async () => {
    await module.initialize();
    const result = await module.processData('Hello World');
    expect(result).toBe('Hello World');
  });
  
  it('should process data with uppercase option', async () => {
    await module.initialize();
    const result = await module.processData('Hello World', { uppercase: true });
    expect(result).toBe('HELLO WORLD');
  });
  
  it('should get current data', async () => {
    await module.initialize();
    await module.processData('Test Data');
    const data = module.getCurrentData();
    expect(data).toBe('Test Data');
  });
  
  it('should perform handshake', async () => {
    await module.initialize();
    const targetModule = new TestModule({
      id: 'target-1',
      type: 'test',
      name: 'Target Module',
      version: '1.0.0',
      description: 'Target test module for unit testing'
    });
    await targetModule.initialize();
    
    const result = await module.handshake(targetModule);
    expect(result).toBe(true);
  });
  
  it('should receive data', async () => {
    await module.initialize();
    const dataTransfer = {
      id: 'transfer-1',
      sourceConnectionId: 'source-1',
      targetConnectionId: 'test-1',
      data: { message: 'Hello', timestamp: Date.now() },
      timestamp: Date.now()
    };
    
    await expect(module.receiveData(dataTransfer)).resolves.not.toThrow();
  });
  
  it('should destroy resources properly', async () => {
    await module.initialize();
    await expect(module.destroy()).resolves.not.toThrow();
  });
});