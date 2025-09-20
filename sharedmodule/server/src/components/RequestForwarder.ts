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

    // **优先级逻辑**: 优先使用虚拟模型调度器，回退到普通调度器
    let targetScheduler = this.virtualModelSchedulerManager || this.schedulerManager;

    if (!targetScheduler) {
      throw new Error('No scheduler available for request forwarding');
    }

    try {
      let response;

      if (this.virtualModelSchedulerManager) {
        // 使用虚拟模型调度器
        this.log('Using virtual model scheduler', {
          method: 'forwardRequest',
          requestId
        });
        response = await this.virtualModelSchedulerManager.handleRequest(request);
      } else {
        // 回退到普通调度器
        this.log('Using fallback scheduler', {
          method: 'forwardRequest',
          requestId
        });
        response = await targetScheduler.executeRequest(request);
      }

      this.log('Request forwarded successfully', {
        method: 'forwardRequest',
        requestId,
        statusCode: response.status,
        schedulerType: this.virtualModelSchedulerManager ? 'virtual-model' : 'fallback'
      });

      return response;

    } catch (error) {
      // **简单包装错误** - 不做复杂错误恢复
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('Request forwarding failed', {
        method: 'forwardRequest',
        requestId,
        error: errorMessage,
        schedulerType: this.virtualModelSchedulerManager ? 'virtual-model' : 'fallback'
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
}