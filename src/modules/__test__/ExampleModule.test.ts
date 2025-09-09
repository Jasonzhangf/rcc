import { ExampleModule } from '../ExampleModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

/**
 * Unit tests for ExampleModule
 */
describe('ExampleModule', () => {
  let module: ExampleModule;
  let moduleInfo: ModuleInfo;
  
  beforeEach(() => {
    moduleInfo = {
      id: 'example-1',
      type: 'example',
      name: 'Example Module',
      version: '1.0.0',
      description: 'Example module for unit testing'
    };
    
    module = new ExampleModule(moduleInfo);
  });
  
  afterEach(async () => {
    await module.destroy();
  });
  
  it('should create a module instance', () => {
    expect(module).toBeInstanceOf(ExampleModule);
    expect(module.getInfo().id).toBe('example-1');
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
  
  it('should process message successfully', async () => {
    await module.initialize();
    await expect(module.processMessage('Hello World')).resolves.not.toThrow();
  });
  
  it('should get status', async () => {
    await module.initialize();
    const status = module.getStatus();
    expect(status).toContain('Module example-1 status:');
  });
  
  it('should perform handshake', async () => {
    await module.initialize();
    const targetModule = new ExampleModule({
      id: 'target-1',
      type: 'example',
      name: 'Target Module',
      version: '1.0.0',
      description: 'Target example module for unit testing'
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
      targetConnectionId: 'example-1',
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