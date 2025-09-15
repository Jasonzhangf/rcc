/**
 * Pipeline Stage Interface
 * 流水线阶段接口
 */

import { PipelineStage } from '../types/debug-types';

/**
 * Pipeline Stage Interface
 * 流水线阶段接口
 */
export interface IPipelineStage {
  /**
   * Get stage name
   * 获取阶段名称
   */
  getStageName(): string;

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
   * Get status
   * 获取状态
   */
  getStatus(): PipelineStage['status'];

  /**
   * Get error message
   * 获取错误消息
   */
  getError(): string | undefined;

  /**
   * Get stage data
   * 获取阶段数据
   */
  getData(): any;

  /**
   * Set start time
   * 设置开始时间
   */
  setStartTime(startTime: number): void;

  /**
   * Set end time
   * 设置结束时间
   */
  setEndTime(endTime: number): void;

  /**
   * Set status
   * 设置状态
   */
  setStatus(status: PipelineStage['status']): void;

  /**
   * Set error
   * 设置错误
   */
  setError(error: string): void;

  /**
   * Set data
   * 设置数据
   */
  setData(data: any): void;

  /**
   * Mark as started
   * 标记为已开始
   */
  markAsStarted(): void;

  /**
   * Mark as completed
   * 标记为已完成
   */
  markAsCompleted(data?: any): void;

  /**
   * Mark as failed
   * 标记为失败
   */
  markAsFailed(error: string): void;

  /**
   * Is completed
   * 是否完成
   */
  isCompleted(): boolean;

  /**
   * Is failed
   * 是否失败
   */
  isFailed(): boolean;

  /**
   * Is running
   * 是否运行中
   */
  isRunning(): boolean;

  /**
   * To object
   * 转换为对象
   */
  toObject(): PipelineStage;

  /**
   * Clone
   * 克隆
   */
  clone(): IPipelineStage;
}

/**
 * Pipeline Stage Factory Interface
 * 流水线阶段工厂接口
 */
export interface IPipelineStageFactory {
  /**
   * Create new stage
   * 创建新阶段
   */
  createStage(stageName: string): IPipelineStage;

  /**
   * Create stage with data
   * 创建带数据的阶段
   */
  createStageWithData(stageName: string, data: any): IPipelineStage;

  /**
   * Create stage from object
   * 从对象创建阶段
   */
  createStageFromObject(stageObject: PipelineStage): IPipelineStage;
}

/**
 * Pipeline Stage Manager Interface
 * 流水线阶段管理器接口
 */
export interface IPipelineStageManager {
  /**
   * Add stage
   * 添加阶段
   */
  addStage(stage: IPipelineStage): void;

  /**
   * Get stage
   * 获取阶段
   */
  getStage(stageName: string): IPipelineStage | undefined;

  /**
   * Remove stage
   * 移除阶段
   */
  removeStage(stageName: string): boolean;

  /**
   * Update stage
   * 更新阶段
   */
  updateStage(stageName: string, updates: Partial<IPipelineStage>): boolean;

  /**
   * Get all stages
   * 获取所有阶段
   */
  getAllStages(): IPipelineStage[];

  /**
   * Get stages by status
   * 根据状态获取阶段
   */
  getStagesByStatus(status: PipelineStage['status']): IPipelineStage[];

  /**
   * Get completed stages
   * 获取已完成阶段
   */
  getCompletedStages(): IPipelineStage[];

  /**
   * Get failed stages
   * 获取失败阶段
   */
  getFailedStages(): IPipelineStage[];

  /**
   * Get running stages
   * 获取运行中阶段
   */
  getRunningStages(): IPipelineStage[];

  /**
   * Clear all stages
   * 清除所有阶段
   */
  clearAllStages(): void;

  /**
   * Get stage statistics
   * 获取阶段统计
   */
  getStageStatistics(): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
}