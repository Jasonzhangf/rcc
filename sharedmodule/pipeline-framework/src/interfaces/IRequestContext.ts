/**
 * Request Context Interface
 * 请求上下文接口
 */

import { RequestContext, PipelineStage } from '../types/debug-types';

/**
 * Request Context Interface
 * 请求上下文接口
 */
export interface IRequestContext {
  /**
   * Get request ID
   * 获取请求ID
   */
  getRequestId(): string;

  /**
   * Get pipeline ID
   * 获取流水线ID
   */
  getPipelineId(): string;

  /**
   * Get session ID
   * 获取会话ID
   */
  getSessionId(): string | undefined;

  /**
   * Get start time
   * 获取开始时间
   */
  getStartTime(): number;

  /**
   * Get end time
   * 获取结束时间
   */
  getEndTime(): number | undefined;

  /**
   * Get duration
   * 获取持续时间
   */
  getDuration(): number | undefined;

  /**
   * Get provider name
   * 获取提供者名称
   */
  getProvider(): string;

  /**
   * Get model name
   * 获取模型名称
   */
  getModel(): string | undefined;

  /**
   * Get operation type
   * 获取操作类型
   */
  getOperation(): RequestContext['operation'];

  /**
   * Get all stages
   * 获取所有阶段
   */
  getStages(): PipelineStage[];

  /**
   * Get metadata
   * 获取元数据
   */
  getMetadata(): Record<string, any> | undefined;

  /**
   * Set session ID
   * 设置会话ID
   */
  setSessionId(sessionId: string): void;

  /**
   * Set end time
   * 设置结束时间
   */
  setEndTime(endTime: number): void;

  /**
   * Set model
   * 设置模型
   */
  setModel(model: string): void;

  /**
   * Set metadata
   * 设置元数据
   */
  setMetadata(metadata: Record<string, any>): void;

  /**
   * Add stage
   * 添加阶段
   */
  addStage(stage: PipelineStage): void;

  /**
   * Get stage by name
   * 根据名称获取阶段
   */
  getStage(stageName: string): PipelineStage | undefined;

  /**
   * Update stage
   * 更新阶段
   */
  updateStage(stageName: string, updates: Partial<PipelineStage>): void;

  /**
   * Get stage status
   * 获取阶段状态
   */
  getStageStatus(stageName: string): PipelineStage['status'] | undefined;

  /**
   * Is request completed
   * 请求是否完成
   */
  isCompleted(): boolean;

  /**
   * Is request failed
   * 请求是否失败
   */
  isFailed(): boolean;

  /**
   * Get failed stages
   * 获取失败阶段
   */
  getFailedStages(): PipelineStage[];

  /**
   * Get completed stages
   * 获取完成阶段
   */
  getCompletedStages(): PipelineStage[];

  /**
   * Get running stages
   * 获取运行中阶段
   */
  getRunningStages(): PipelineStage[];

  /**
   * Calculate stage duration
   * 计算阶段持续时间
   */
  getStageDuration(stageName: string): number | undefined;

  /**
   * Get total stage duration
   * 获取总阶段持续时间
   */
  getTotalStageDuration(): number;

  /**
   * Get context summary
   * 获取上下文摘要
   */
  getSummary(): {
    requestId: string;
    pipelineId: string;
    provider: string;
    operation: string;
    duration: number | undefined;
    totalStages: number;
    completedStages: number;
    failedStages: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
}