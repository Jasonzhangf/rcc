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

    // **极简逻辑**: 有调度器就转发，没有就失败
    if (!this.schedulerManager) {
      throw new Error('Scheduler not available for request forwarding');
    }

    try {
      // **纯转发给调度器** - 调度器做所有智能决策
      const response = await this.schedulerManager.executeRequest(request);

      this.log('Request forwarded successfully', {
        method: 'forwardRequest',
        requestId,
        statusCode: response.status
      });

      return response;

    } catch (error) {
      // **简单包装错误** - 不做复杂错误恢复
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('Request forwarding failed', {
        method: 'forwardRequest',
        requestId,
        error: errorMessage
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
   * 清理调度器连接
   */
  public override async destroy(): Promise<void> {
    this.schedulerManager = null;
    await super.destroy();
  }
}