import { ModuleRegistry } from '../src/registry/ModuleRegistry';
import { ModuleInfo } from '../src/interfaces/ModuleInfo';
import { BaseModule } from '../src/core/BaseModule';

// 简单的配置模块模拟
class SimpleConfigModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  public async initialize(): Promise<void> {
    await super.initialize();
    console.log('SimpleConfigModule initialized');
  }

  // 模拟发送错误消息到错误处理中心的方法
  protected reportError(errorData: any): void {
    console.log('Config module reporting error:', errorData);
    
    // 在实际实现中，这会通过消息中心发送消息
    // 这里我们直接模拟发送到错误处理模块
    const messageCenter = (global as any).messageCenter;
    if (messageCenter) {
      messageCenter.sendMessage({
        id: 'error-report-' + Date.now(),
        type: 'error_report',
        source: this.info.id,
        target: 'error-handler',
        payload: {
          sourceModule: this.info.id,
          error: errorData,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    }
  }

  // 模拟配置加载错误
  public async loadConfigWithError(): Promise<void> {
    console.log('Attempting to load configuration (will fail)...');
    
    // 模拟一个配置加载错误
    const errorData = {
      code: 'CONFIG_LOAD_ERROR',
      message: 'Failed to load configuration file',
      filePath: '/nonexistent/config.json',
      timestamp: Date.now()
    };
    
    // 报告错误到错误处理中心
    this.reportError(errorData);
  }
}

// 简单的错误处理中心模拟模块
class SimpleErrorHandlerModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }

  public async initialize(): Promise<void> {
    await super.initialize();
    console.log('SimpleErrorHandlerModule initialized');
  }

  public async receiveData(dataTransfer: any): Promise<void> {
    console.log('ErrorHandler received data:', dataTransfer.data);
    // 处理来自配置模块的错误消息
    if (dataTransfer.data.type === 'error_report') {
      console.log('Received error report from module:', dataTransfer.data.sourceModule);
      console.log('Error details:', dataTransfer.data.error);
    }
  }
}

// 模拟消息中心
class MockMessageCenter {
  private handlers: Map<string, any> = new Map();

  public registerModule(moduleId: string, handler: any): void {
    this.handlers.set(moduleId, handler);
    console.log(`Module ${moduleId} registered with MessageCenter`);
  }

  public sendMessage(message: any): void {
    console.log('MessageCenter sending message:', message);
    
    if (message.target) {
      const targetHandler = this.handlers.get(message.target);
      if (targetHandler && targetHandler.receiveData) {
        // 模拟异步处理
        setTimeout(() => {
          targetHandler.receiveData({
            data: message.payload
          });
        }, 0);
      }
    }
  }
}

async function testConfigToErrorHandler() {
  console.log('Testing configuration module to error handler communication...');
  
  try {
    // 创建模拟消息中心并设置为全局变量
    const messageCenter = new MockMessageCenter();
    (global as any).messageCenter = messageCenter;
    
    // 获取模块注册表实例
    const registry = ModuleRegistry.getInstance();
    
    // 注册模块类型
    registry.registerModuleType('config', SimpleConfigModule);
    registry.registerModuleType('error-handler', SimpleErrorHandlerModule);
    
    // 创建模块信息
    const configModuleInfo: ModuleInfo = {
      id: 'config-001',
      name: 'Simple Configuration Module',
      version: '1.0.0',
      description: 'Simple configuration module for testing',
      type: 'config'
    };
    
    const errorHandlerInfo: ModuleInfo = {
      id: 'error-handler-001',
      name: 'Error Handler',
      version: '1.0.0',
      description: 'Handles errors from other modules',
      type: 'error-handler'
    };
    
    // 创建模块实例
    const configModule = await registry.createModule<SimpleConfigModule>(configModuleInfo);
    const errorHandlerModule = await registry.createModule<SimpleErrorHandlerModule>(errorHandlerInfo);
    
    console.log('Modules created successfully');
    
    // 注册模块到消息中心
    messageCenter.registerModule(configModuleInfo.id, configModule);
    messageCenter.registerModule(errorHandlerInfo.id, errorHandlerModule);
    
    // 模拟从配置模块发送错误消息到错误处理中心
    console.log('Simulating error message from config module to error handler...');
    
    // 触发配置加载错误
    await configModule.loadConfigWithError();
    
    // 等待异步处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 运行测试
testConfigToErrorHandler().catch(console.error);