// IServerForwarder 接口 - 纯HTTP请求转发契约

import { ClientRequest, ClientResponse } from '../types/ServerTypes';

/**
 * 服务器转发接口 - 纯转发，不路由，不决策
 *
 * 职责单一化:
 * - 接收客户端请求
 * - 转发给调度器
 * - 返回调度器响应
 *
 * **绝不分析、选择、路由或修改请求内容**
 */
export interface IServerForwarder {
  /**
   * 纯转发HTTP请求给调度器
   * @param request 客户端请求
   * @returns 调度器的响应
   * @throws 当调度器不可用或执行失败时抛出简单错误
   */
  forwardRequest(request: ClientRequest): Promise<ClientResponse>;

  /**
   * 设置调度器管理器 - 这是唯一的依赖
   * @param schedulerManager 调度器管理器实例
   */
  setSchedulerManager(schedulerManager: any): void;
}