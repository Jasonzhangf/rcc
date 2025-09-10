import { BaseModule } from '../BaseModule';
import { 
  ModuleInfo, 
  ErrorContext, 
  ErrorResponse, 
  ResponseHandler,
  ModuleRegistration
} from '../interfaces/SharedTypes';

/**
 * 测试模块 - 用于验证错误处理回调函数
 * 支持推荐的消息注册和函数注册方式
 */
export class ErrorHandlingTestModule extends BaseModule {
  private errorHandlerRegistry: Map<string, (error: ErrorContext) => Promise<ErrorResponse>> = new Map();
  private messageHandlers: Map<string, (message: any) => Promise<any>> = new Map();
  private errorCount: number = 0;
  private handledErrors: ErrorContext[] = [];
  private responses: ErrorResponse[] = [];

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'error-handling-test-module',
      type: 'test',
      name: 'ErrorHandlingTestModule',
      version: '1.0.0',
      description: 'Test module for error handling callback validation',
      metadata: {
        capabilities: ['error-handling', 'message-processing', 'callback-validation']
      }
    };

    super(moduleInfo);
  }

  /**
   * 模块初始化
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // 注册默认的错误处理器
    this.registerDefaultErrorHandlers();
    
    // 注册默认的消息处理器
    this.registerDefaultMessageHandlers();
    
    this.logInfo('ErrorHandlingTestModule initialized with default handlers');
  }

  /**
   * 注册默认的错误处理器
   */
  private registerDefaultErrorHandlers(): void {
    // 推荐方式1：通过函数注册错误处理器
    this.registerErrorHandler('validation-error', this.handleValidationError.bind(this));
    this.registerErrorHandler('network-error', this.handleNetworkError.bind(this));
    this.registerErrorHandler('business-error', this.handleBusinessError.bind(this));
    this.registerErrorHandler('system-error', this.handleSystemError.bind(this));
    
    // 推荐方式2：通用错误处理器
    this.registerErrorHandler('default', this.handleDefaultError.bind(this));
  }

  /**
   * 注册默认的消息处理器
   */
  private registerDefaultMessageHandlers(): void {
    // 推荐方式1：通过消息类型注册处理器
    this.registerMessageHandler('ping', this.handlePingMessage.bind(this));
    this.registerMessageHandler('error-test', this.handleErrorMessage.bind(this));
    this.registerMessageHandler('batch-error-test', this.handleBatchErrorMessage.bind(this));
    this.registerMessageHandler('status-query', this.handleStatusQuery.bind(this));
  }

  /**
   * 推荐的函数注册方式：注册错误处理器
   * @param errorType - 错误类型
   * @param handler - 错误处理函数
   */
  public registerErrorHandler(errorType: string, handler: (error: ErrorContext) => Promise<ErrorResponse>): void {
    this.errorHandlerRegistry.set(errorType, handler);
    this.logInfo(`Error handler registered for type: ${errorType}`);
  }

  /**
   * 推荐的消息注册方式：注册消息处理器
   * @param messageType - 消息类型
   * @param handler - 消息处理函数
   */
  public registerMessageHandler(messageType: string, handler: (message: any) => Promise<any>): void {
    this.messageHandlers.set(messageType, handler);
    this.logInfo(`Message handler registered for type: ${messageType}`);
  }

  /**
   * 创建模块注册信息（推荐方式）
   */
  public createModuleRegistration(): ModuleRegistration {
    return {
      moduleId: this.info.id,
      moduleName: this.info.name,
      moduleType: this.info.type,
      version: '1.0.0',
      config: {
        enableLogging: true,
        enableMetrics: true
      },
      capabilities: ['error-handling', 'message-processing', 'callback-validation'],
      responseHandler: this.createResponseHandler()
    };
  }

  /**
   * 创建响应处理器（推荐方式）
   */
  private createResponseHandler(): ResponseHandler {
    return {
      handleId: `${this.info.id}-handler`,
      name: `${this.info.name} Response Handler`,
      priority: 100,
      isEnabled: true,
      conditions: [],
      execute: async (error: ErrorContext): Promise<ErrorResponse> => {
        return this.handleError(error);
      }
    };
  }

  /**
   * 主要的错误处理入口点
   * @param error - 错误上下文
   */
  public async handleError(error: ErrorContext): Promise<ErrorResponse> {
    const startTime = Date.now();
    this.errorCount++;
    this.handledErrors.push(error);

    try {
      // 根据错误类型选择处理器
      const errorType = this.determineErrorType(error);
      const handler = this.errorHandlerRegistry.get(errorType) || this.errorHandlerRegistry.get('default');
      
      if (!handler) {
        throw new Error(`No handler found for error type: ${errorType}`);
      }

      // 执行错误处理
      const response = await handler(error);
      
      // 记录响应
      this.responses.push(response);
      
      // 添加处理时间
      const processingTime = Date.now() - startTime;
      
      this.logInfo(`Error processed successfully: ${error.errorId}, type: ${errorType}, time: ${processingTime}ms`);
      
      return {
        ...response,
        processingTime
      };
    } catch (handlingError) {
      this.error(`Failed to handle error ${error.errorId}: ${(handlingError as Error).message}`);
      
      // 返回错误响应
      return {
        responseId: `error_${error.errorId}_${Date.now()}`,
        errorId: error.errorId,
        result: {
          status: 'error' as any,
          message: 'Error handling failed',
          details: (handlingError as Error).message,
          code: 'HANDLING_FAILED'
        },
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        data: {
          moduleName: this.info.name,
          moduleId: this.info.id,
          response: { message: 'Error handling failed' },
          config: error.config,
          metadata: { 
            originalError: error.error,
            handlingError: (handlingError as Error).message
          }
        },
        actions: [],
        annotations: []
      };
    }
  }

  /**
   * 阻塞式错误处理
   * @param error - 错误上下文
   */
  public async handleErrorBlocking(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Processing error in blocking mode: ${error.errorId}`);
    return this.handleError(error);
  }

  /**
   * 非阻塞式错误处理
   * @param error - 错误上下文
   * @param callback - 回调函数
   */
  public handleErrorNonBlocking(error: ErrorContext, callback?: (response: ErrorResponse) => void): void {
    this.logInfo(`Processing error in non-blocking mode: ${error.errorId}`);
    
    // 立即返回部分响应
    if (callback) {
      const partialResponse: ErrorResponse = {
        responseId: `async_${error.errorId}_${Date.now()}`,
        errorId: error.errorId,
        result: {
          status: 'partial' as any,
          message: 'Error queued for async processing',
          details: 'Error has been queued and will be processed asynchronously',
          code: 'ASYNC_QUEUED'
        },
        timestamp: new Date(),
        processingTime: 0,
        data: {
          moduleName: this.info.name,
          moduleId: this.info.id,
          response: { message: 'Async processing response' },
          config: error.config,
          metadata: { asyncQueued: true }
        },
        actions: [],
        annotations: []
      };
      
      callback(partialResponse);
    }
    
    // 异步处理
    this.handleError(error).then(response => {
      this.logInfo(`Async error processing completed: ${error.errorId}`);
      
      // 如果有回调，调用最终响应
      if (callback) {
        callback(response);
      }
    }).catch(asyncError => {
      this.error(`Async error processing failed: ${error.errorId}, error: ${(asyncError as Error).message}`);
      
      // 如果有回调，调用错误响应
      if (callback) {
        const errorResponse: ErrorResponse = {
          responseId: `async_error_${error.errorId}_${Date.now()}`,
          errorId: error.errorId,
          result: {
            status: 'error' as any,
            message: 'Async processing failed',
            details: asyncError.message,
            code: 'ASYNC_PROCESSING_FAILED'
          },
          timestamp: new Date(),
          processingTime: 0,
          data: {
            moduleName: this.info.name,
            moduleId: this.info.id,
            response: { message: 'Async processing failed' },
            config: error.config,
            metadata: { asyncError: (asyncError as Error).message }
          },
          actions: [],
          annotations: []
        };
        
        callback(errorResponse);
      }
    });
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(error: ErrorContext): string {
    const errorMessage = error.error.message.toLowerCase();

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'validation-error';
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'network-error';
    } else if (errorMessage.includes('business') || errorMessage.includes('logic')) {
      return 'business-error';
    } else if (errorMessage.includes('system') || errorMessage.includes('internal')) {
      return 'system-error';
    } else {
      return 'default';
    }
  }

  // 错误处理器实现
  private async handleValidationError(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Handling validation error: ${error.errorId}`);
    
    return {
      responseId: `validation_${error.errorId}_${Date.now()}`,
      errorId: error.errorId,
      result: {
        status: 'success' as any,
        message: 'Validation error handled successfully',
        details: `Validation failed: ${error.error.message}`,
        code: 'VALIDATION_HANDLED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: this.info.name,
        moduleId: this.info.id,
        response: { message: 'Validation error resolved' },
        config: error.config,
        metadata: { 
          errorType: 'validation',
          suggestedFix: 'Check input parameters and try again'
        }
      },
      actions: [],
      annotations: []
    };
  }

  private async handleNetworkError(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Handling network error: ${error.errorId}`);
    
    return {
      responseId: `network_${error.errorId}_${Date.now()}`,
      errorId: error.errorId,
      result: {
        status: 'success' as any,
        message: 'Network error handled successfully',
        details: `Network issue: ${error.error.message}`,
        code: 'NETWORK_HANDLED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: this.info.name,
        moduleId: this.info.id,
        response: { message: 'Network error resolved with retry' },
        config: error.config,
        metadata: { 
          errorType: 'network',
          retryCount: 3,
          retryDelay: 1000
        }
      },
      actions: [],
      annotations: []
    };
  }

  private async handleBusinessError(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Handling business error: ${error.errorId}`);
    
    return {
      responseId: `business_${error.errorId}_${Date.now()}`,
      errorId: error.errorId,
      result: {
        status: 'success' as any,
        message: 'Business logic error handled successfully',
        details: `Business rule violation: ${error.error.message}`,
        code: 'BUSINESS_HANDLED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: this.info.name,
        moduleId: this.info.id,
        response: { message: 'Business logic error resolved' },
        config: error.config,
        metadata: { 
          errorType: 'business',
          businessRule: 'Order processing validation'
        }
      },
      actions: [],
      annotations: []
    };
  }

  private async handleSystemError(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Handling system error: ${error.errorId}`);
    
    return {
      responseId: `system_${error.errorId}_${Date.now()}`,
      errorId: error.errorId,
      result: {
        status: 'success' as any,
        message: 'System error handled successfully',
        details: `System issue: ${error.error.message}`,
        code: 'SYSTEM_HANDLED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: this.info.name,
        moduleId: this.info.id,
        response: { message: 'System error resolved' },
        config: error.config,
        metadata: { 
          errorType: 'system',
          systemComponent: 'Database connection pool'
        }
      },
      actions: [],
      annotations: []
    };
  }

  private async handleDefaultError(error: ErrorContext): Promise<ErrorResponse> {
    this.logInfo(`Handling default error: ${error.errorId}`);
    
    return {
      responseId: `default_${error.errorId}_${Date.now()}`,
      errorId: error.errorId,
      result: {
        status: 'success' as any,
        message: 'Default error handling completed',
        details: `Unknown error: ${error.error.message}`,
        code: 'DEFAULT_HANDLED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: this.info.name,
        moduleId: this.info.id,
        response: { message: 'Error processed with default handler' },
        config: error.config,
        metadata: { 
          errorType: 'unknown',
          handlerUsed: 'default'
        }
      },
      actions: [],
      annotations: []
    };
  }

  // 消息处理器实现
  private async handlePingMessage(message: any): Promise<any> {
    this.logInfo(`Received ping message: ${message.id}`);
    
    return {
      type: 'pong',
      originalId: message.id,
      timestamp: new Date(),
      moduleId: this.info.id,
      status: 'healthy'
    };
  }

  private async handleErrorMessage(message: any): Promise<any> {
    this.logInfo(`Received error test message: ${message.id}`);
    
    // 创建测试错误
    const testError: ErrorContext = {
      errorId: `test_${message.id}_${Date.now()}`,
      error: new Error(message.error.message || 'Test error'),
      source: {
        moduleId: this.info.id,
        moduleName: this.info.name,
        version: '1.0.0'
      },
      timestamp: new Date(),
      classification: {
        source: 'system' as any,
        type: 'technical' as any,
        severity: 'medium' as any,
        impact: 'single_module' as any,
        recoverability: 'recoverable' as any
      },
      data: {},
      config: message.config || {}
    };

    // 处理错误
    const response = await this.handleError(testError);
    
    return {
      type: 'error-response',
      originalId: message.id,
      errorId: testError.errorId,
      response,
      timestamp: new Date()
    };
  }

  private async handleBatchErrorMessage(message: any): Promise<any> {
    this.logInfo(`Received batch error test message: ${message.id}`);
    
    const responses: ErrorResponse[] = [];
    
    // 批量处理错误
    for (const errorData of message.errors || []) {
      const testError: ErrorContext = {
        errorId: `batch_${errorData.id}_${Date.now()}`,
        error: new Error(errorData.message || 'Batch test error'),
        source: {
          moduleId: this.info.id,
          moduleName: this.info.name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: errorData.config || {}
      };

      const response = await this.handleError(testError);
      responses.push(response);
    }
    
    return {
      type: 'batch-error-response',
      originalId: message.id,
      responses,
      count: responses.length,
      timestamp: new Date()
    };
  }

  private async handleStatusQuery(message: any): Promise<any> {
    this.logInfo(`Received status query message: ${message.id}`);
    
    return {
      type: 'status-response',
      originalId: message.id,
      moduleId: this.info.id,
      status: {
        errorCount: this.errorCount,
        handledErrors: this.handledErrors.length,
        responseCount: this.responses.length,
        registeredHandlers: this.errorHandlerRegistry.size,
        registeredMessageHandlers: this.messageHandlers.size,
        uptime: Date.now() - this.getInitializationTime()
      },
      timestamp: new Date()
    };
  }

  /**
   * 获取初始化时间
   */
  private getInitializationTime(): number {
    // 简化实现，实际应该记录真实的初始化时间
    return Date.now() - 10000; // 假设10秒前初始化
  }

  /**
   * 处理消息（BaseModule接口实现）
   */
  public async handleMessage(message: any): Promise<any> {
    const messageType = message.type || 'unknown';
    const handler = this.messageHandlers.get(messageType);
    
    if (!handler) {
      this.warn(`No handler found for message type: ${messageType}`);
      return {
        type: 'error',
        originalId: message.id,
        error: `Unknown message type: ${messageType}`,
        timestamp: new Date()
      };
    }

    try {
      return await handler(message);
    } catch (error) {
      this.error(`Failed to handle message ${message.id}: ${(error as Error).message}`);
      return {
        type: 'error',
        originalId: message.id,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取模块统计信息
   */
  public getStatistics() {
    return {
      errorCount: this.errorCount,
      handledErrors: this.handledErrors.length,
      responseCount: this.responses.length,
      registeredErrorHandlers: this.errorHandlerRegistry.size,
      registeredMessageHandlers: this.messageHandlers.size,
      recentErrors: this.handledErrors.slice(-5), // 最近5个错误
      recentResponses: this.responses.slice(-5) // 最近5个响应
    };
  }

  /**
   * 重置统计信息
   */
  public resetStatistics(): void {
    this.errorCount = 0;
    this.handledErrors = [];
    this.responses = [];
    this.logInfo('Module statistics reset');
  }
}