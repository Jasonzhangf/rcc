// 简单的模块通信测试
// 模拟从配置模块发送消息到错误处理中心

// 模拟基础模块类
class BaseModule {
  constructor(info) {
    this.info = info;
  }
  
  getInfo() {
    return this.info;
  }
}

// 简单的配置模块模拟
class SimpleConfigModule extends BaseModule {
  constructor(info) {
    super(info);
  }

  // 模拟发送错误消息到错误处理中心的方法
  reportError(errorData) {
    console.log('Config module reporting error:', errorData);
    
    // 模拟通过消息中心发送消息
    const message = {
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
    };
    
    // 直接调用错误处理模块
    if (global.errorHandler) {
      setTimeout(() => {
        global.errorHandler.receiveData({
          data: message.payload
        });
      }, 0);
    }
  }

  // 模拟配置加载错误
  loadConfigWithError() {
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
  constructor(info) {
    super(info);
  }

  receiveData(dataTransfer) {
    console.log('ErrorHandler received data:', dataTransfer.data);
    // 处理来自配置模块的错误消息
    if (dataTransfer.data.type === 'error_report') {
      console.log('Received error report from module:', dataTransfer.data.sourceModule);
      console.log('Error details:', dataTransfer.data.error);
    }
  }
}

// 测试函数
function testConfigToErrorHandler() {
  console.log('Testing configuration module to error handler communication...');
  
  try {
    // 创建模块实例
    const configModule = new SimpleConfigModule({
      id: 'config-001',
      name: 'Simple Configuration Module',
      version: '1.0.0',
      description: 'Simple configuration module for testing',
      type: 'config'
    });
    
    const errorHandlerModule = new SimpleErrorHandlerModule({
      id: 'error-handler-001',
      name: 'Error Handler',
      version: '1.0.0',
      description: 'Handles errors from other modules',
      type: 'error-handler'
    });
    
    // 设置全局错误处理模块
    global.errorHandler = errorHandlerModule;
    
    console.log('Modules created successfully');
    
    // 模拟从配置模块发送错误消息到错误处理中心
    console.log('Simulating error message from config module to error handler...');
    
    // 触发配置加载错误
    configModule.loadConfigWithError();
    
    // 等待异步处理完成
    setTimeout(() => {
      console.log('Test completed successfully!');
    }, 100);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 运行测试
testConfigToErrorHandler();