// RequestForwarder 组件 - 纯HTTP请求转发器
// 架构: "纯转发，不决策" 原则

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ClientRequest, ClientResponse } from '../types/ServerTypes';

/**
 * RequestForwarder - 纯请求转发组件
 * 职责: 接收HTTP请求 → 转发给调度器 → 返回调度器响应
 * **绝不做任何模型选择、路由分析或智能判断**
 */
export class RequestForwarder extends BaseModule {
  private schedulerManager: any | null = null;
  private virtualModelSchedulerManager: any | null = null;

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'RequestForwarder',
      name: 'Request Forwarder',
      version: '3.0.0',
      description: 'Pure HTTP request forwarder - no routing, no model selection',
      type: 'component',
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);
    this.schedulerManager = null;
    this.virtualModelSchedulerManager = null;
  }

  /**
   * 纯转发: 接收请求 → 转发给调度器 → 返回响应
   * **绝不做任何决策或分析**
   */
  public async forwardRequest(request: ClientRequest): Promise<ClientResponse> {
    const requestId = request.clientId || `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.log('Forwarding request to scheduler', {
      method: 'forwardRequest',
      requestId,
      path: request.path
    });

    try {
      if (!this.virtualModelSchedulerManager) {
        throw new Error('Virtual model scheduler manager not available');
      }

      // 直接调用虚拟模型调度器的handleRequest方法
      this.log('Calling virtual model scheduler handleRequest', {
        method: 'forwardRequest',
        requestId,
        schedulerType: typeof this.virtualModelSchedulerManager,
        hasHandleRequest: typeof this.virtualModelSchedulerManager.handleRequest === 'function',
        schedulerKeys: Object.keys(this.virtualModelSchedulerManager || {}),
        schedulerPrototypeKeys: Object.getPrototypeOf(this.virtualModelSchedulerManager || {}),
        isInitialized: this.virtualModelSchedulerManager.isInitialized,
        constructorName: this.virtualModelSchedulerManager.constructor?.name
      });

      // 检查调度器是否已初始化
      if (!this.virtualModelSchedulerManager.isInitialized) {
        throw new Error('Virtual model scheduler manager not initialized');
      }

      // 转换ClientRequest为VirtualModelSchedulerManager期望的格式
      const adaptedRequest = this.adaptClientRequest(request);

      // 调用handleRequest方法
      const schedulerResponse = await this.virtualModelSchedulerManager.handleRequest(adaptedRequest);

      // 转换响应格式
      const response = this.adaptSchedulerResponse(schedulerResponse, request);

      this.log('Request forwarded successfully', {
        method: 'forwardRequest',
        requestId,
        statusCode: response.status || 200,
        schedulerType: 'virtual-model'
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('Request forwarding failed', {
        method: 'forwardRequest',
        requestId,
        error: errorMessage,
        schedulerType: 'virtual-model'
      });

      throw new Error(`Scheduler execution failed: ${errorMessage}`);
    }
  }

  /**
   * 设置调度器管理器 - 这是唯一的依赖
   */
  public setSchedulerManager(schedulerManager: any): void {
    this.schedulerManager = schedulerManager;
  }

  /**
   * 设置虚拟模型调度器管理器 - 连接pipeline虚拟模型路由系统
   */
  public setVirtualModelSchedulerManager(schedulerManager: any): void {
    this.virtualModelSchedulerManager = schedulerManager;
    this.log('Virtual model scheduler manager connected to forwarder');
  }

  /**
   * 清理调度器连接
   */
  public override async destroy(): Promise<void> {
    this.schedulerManager = null;
    this.virtualModelSchedulerManager = null;
    await super.destroy();
  }

  /**
   * 适配ClientRequest为虚拟模型调度器期望的格式
   */
  private adaptClientRequest(clientRequest: ClientRequest): any {
    return {
      // 基本字段映射
      id: clientRequest.id,
      method: clientRequest.method,
      path: clientRequest.path,
      headers: clientRequest.headers,
      body: clientRequest.body,
      query: clientRequest.query,
      timestamp: clientRequest.timestamp,
      clientId: clientRequest.clientId,

      // 虚拟模型调度器需要的字段
      type: this.getRequestType(clientRequest),
      stream: this.isStreamingRequest(clientRequest),
      virtualModel: this.extractVirtualModel(clientRequest),

      // 保留原始请求引用
      originalRequest: clientRequest
    };
  }

  /**
   * 适配虚拟模型调度器响应为ClientResponse格式
   */
  private adaptSchedulerResponse(schedulerResponse: any, originalRequest: ClientRequest): ClientResponse {
    const responseId = originalRequest.id || `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const processingTime = Date.now() - originalRequest.timestamp;

    // 处理不同类型的响应格式，确保总是返回有效的ClientResponse
    let body: any;
    let status: number = 200;
    let headers: any = {};
    let error: any = undefined;

    if (schedulerResponse && typeof schedulerResponse === 'object') {
      // 标准响应格式
      body = schedulerResponse.body || schedulerResponse.content || schedulerResponse.data || schedulerResponse;
      status = schedulerResponse.status || 200;
      headers = schedulerResponse.headers || {};
      error = schedulerResponse.error;
    } else if (schedulerResponse !== null && schedulerResponse !== undefined) {
      // 原始响应（字符串、数字等）
      body = schedulerResponse;
    } else {
      // 空响应
      body = { message: 'Request processed successfully' };
    }

    // 确保body始终是对象格式
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // 如果不是JSON，保持原样
      }
    }

    return {
      id: responseId,
      status,
      headers,
      body,
      timestamp: Date.now(),
      processingTime,
      error,
      requestId: originalRequest.clientId || originalRequest.id
    };
  }

  /**
   * 确定请求类型
   */
  private getRequestType(request: ClientRequest): string {
    if (request.path.includes('/v1/messages')) {
      return 'chat';
    }
    if (request.path.includes('/status')) {
      return 'health_check';
    }
    return 'chat';
  }

  /**
   * 判断是否为流式请求
   */
  private isStreamingRequest(request: ClientRequest): boolean {
    return request.headers?.['stream'] === 'true' ||
           request.query?.['stream'] === 'true' ||
           request.body?.stream === true;
  }

  /**
   * 提取虚拟模型信息
   */
  private extractVirtualModel(request: ClientRequest): string {
    // 从路径、查询参数或请求体中提取虚拟模型信息
    if (request.path.includes('/v1/')) {
      const pathParts = request.path.split('/');
      if (pathParts.length >= 4 && pathParts[1] === 'v1') {
        return pathParts[3] || 'default';
      }
    }

    // 从查询参数提取
    if (request.query?.['model']) {
      return request.query['model'];
    }

    // 从请求体提取
    if (request.body?.model) {
      return request.body.model;
    }

    // 默认返回default
    return 'default';
  }
}