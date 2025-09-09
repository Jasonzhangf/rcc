import { ModuleRegistry } from '../src/registry/ModuleRegistry';
import { ModuleInfo } from '../src/interfaces/ModuleInfo';
import { ConfigLoaderModule } from '../src/modules/Configuration/src/ConfigLoaderModule';
import { BaseModule } from '../src/core/BaseModule';

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

async function testConfigToErrorHandler() {
  console.log('Testing configuration module to error handler communication...');
  
  try {
    // 获取模块注册表实例
    const registry = ModuleRegistry.getInstance();
    
    // 注册模块类型
    registry.registerModuleType('config-loader', ConfigLoaderModule);
    registry.registerModuleType('error-handler', SimpleErrorHandlerModule);
    
    // 创建模块信息
    const configModuleInfo: ModuleInfo = {
      id: 'config-loader-001',
      name: 'Configuration Loader',
      version: '1.0.0',
      description: 'Loads and parses configuration files',
      type: 'config-loader'
    };
    
    const errorHandlerInfo: ModuleInfo = {
      id: 'error-handler-001',
      name: 'Error Handler',
      version: '1.0.0',
      description: 'Handles errors from other modules',
      type: 'error-handler'
    };
    
    // 创建模块实例
    const configModule = await registry.createModule<ConfigLoaderModule>(configModuleInfo);
    const errorHandlerModule = await registry.createModule<SimpleErrorHandlerModule>(errorHandlerInfo);
    
    console.log('Modules created successfully');
    
    // 建立连接（模拟）
    // 在实际实现中，这会通过BaseModule的连接机制完成
    
    // 模拟从配置模块发送错误消息到错误处理中心
    console.log('Simulating error message from config module to error handler...');
    
    // 创建一个模拟的错误报告
    const errorReport = {
      type: 'error_report',
      sourceModule: configModuleInfo.id,
      error: {
        code: 'TEST_ERROR',
        message: 'This is a test error message',
        filePath: '/test/path/config.json',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
    
    // 发送错误报告到错误处理模块
    await errorHandlerModule.receiveData({
      data: errorReport
    });
    
    console.log('Test completed successfully!');
    
    // 清理模块
    await registry.removeModule(configModuleInfo.id);
    await registry.removeModule(errorHandlerInfo.id);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 运行测试
testConfigToErrorHandler().catch(console.error);