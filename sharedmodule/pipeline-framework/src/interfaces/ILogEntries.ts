/**
 * Log Entries Interface
 * 日志条目接口
 */

import {
  RequestResponseLog,
  ErrorLog,
  SystemLog,
  PerformanceMetrics,
  LogEntry
} from '../types/debug-types';

/**
 * Request-Response Log Entry Interface
 * 请求-响应日志条目接口
 */
export interface IRequestResponseLogEntry {
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
   * Get timestamp
   * 获取时间戳
   */
  getTimestamp(): number;

  /**
   * Get provider name
   * 获取提供者名称
   */
  getProvider(): string;

  /**
   * Get operation type
   * 获取操作类型
   */
  getOperation(): string;

  /**
   * Get request data
   * 获取请求数据
   */
  getRequest(): RequestResponseLog['request'];

  /**
   * Get response data
   * 获取响应数据
   */
  getResponse(): RequestResponseLog['response'];

  /**
   * Get duration
   * 获取持续时间
   */
  getDuration(): number;

  /**
   * Is successful
   * 是否成功
   */
  isSuccessful(): boolean;

  /**
   * Get error message
   * 获取错误消息
   */
  getError(): string | undefined;

  /**
   * Get pipeline stages
   * 获取流水线阶段
   */
  getStages(): RequestResponseLog['stages'];

  /**
   * Set request data
   * 设置请求数据
   */
  setRequest(request: RequestResponseLog['request']): void;

  /**
   * Set response data
   * 设置响应数据
   */
  setResponse(response: RequestResponseLog['response']): void;

  /**
   * Set duration
   * 设置持续时间
   */
  setDuration(duration: number): void;

  /**
   * Set error
   * 设置错误
   */
  setError(error: string): void;

  /**
   * Add stage
   * 添加阶段
   */
  addStage(stage: RequestResponseLog['stages'][0]): void;

  /**
   * To object
   * 转换为对象
   */
  toObject(): RequestResponseLog;

  /**
   * To JSON
   * 转换为JSON
   */
  toJSON(): string;

  /**
   * Clone
   * 克隆
   */
  clone(): IRequestResponseLogEntry;
}

/**
 * Error Log Entry Interface
 * 错误日志条目接口
 */
export interface IErrorLogEntry {
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
   * Get timestamp
   * 获取时间戳
   */
  getTimestamp(): number;

  /**
   * Get provider name
   * 获取提供者名称
   */
  getProvider(): string;

  /**
   * Get operation type
   * 获取操作类型
   */
  getOperation(): string;

  /**
   * Get error details
   * 获取错误详情
   */
  getError(): ErrorLog['error'];

  /**
   * Get request data
   * 获取请求数据
   */
  getRequest(): ErrorLog['request'];

  /**
   * Get failed stage
   * 获取失败阶段
   */
  getFailedStage(): string | undefined;

  /**
   * Get pipeline stages
   * 获取流水线阶段
   */
  getStages(): ErrorLog['stages'];

  /**
   * Get debug info
   * 获取调试信息
   */
  getDebugInfo(): Record<string, any> | undefined;

  /**
   * Set error details
   * 设置错误详情
   */
  setError(error: ErrorLog['error']): void;

  /**
   * Set request data
   * 设置请求数据
   */
  setRequest(request: ErrorLog['request']): void;

  /**
   * Set failed stage
   * 设置失败阶段
   */
  setFailedStage(stage: string): void;

  /**
   * Set debug info
   * 设置调试信息
   */
  setDebugInfo(debugInfo: Record<string, any>): void;

  /**
   * Add stage
   * 添加阶段
   */
  addStage(stage: ErrorLog['stages'][0]): void;

  /**
   * To object
   * 转换为对象
   */
  toObject(): ErrorLog;

  /**
   * To JSON
   * 转换为JSON
   */
  toJSON(): string;

  /**
   * Clone
   * 克隆
   */
  clone(): IErrorLogEntry;
}

/**
 * System Log Entry Interface
 * 系统日志条目接口
 */
export interface ISystemLogEntry {
  /**
   * Get log level
   * 获取日志级别
   */
  getLevel(): SystemLog['level'];

  /**
   * Get message
   * 获取消息
   */
  getMessage(): string;

  /**
   * Get timestamp
   * 获取时间戳
   */
  getTimestamp(): number;

  /**
   * Get request ID
   * 获取请求ID
   */
  getRequestId(): string | undefined;

  /**
   * Get provider name
   * 获取提供者名称
   */
  getProvider(): string | undefined;

  /**
   * Get operation type
   * 获取操作类型
   */
  getOperation(): string | undefined;

  /**
   * Get metadata
   * 获取元数据
   */
  getMetadata(): Record<string, any> | undefined;

  /**
   * Set level
   * 设置级别
   */
  setLevel(level: SystemLog['level']): void;

  /**
   * Set message
   * 设置消息
   */
  setMessage(message: string): void;

  /**
   * Set request ID
   * 设置请求ID
   */
  setRequestId(requestId: string): void;

  /**
   * Set provider name
   * 设置提供者名称
   */
  setProvider(provider: string): void;

  /**
   * Set operation type
   * 设置操作类型
   */
  setOperation(operation: string): void;

  /**
   * Set metadata
   * 设置元数据
   */
  setMetadata(metadata: Record<string, any>): void;

  /**
   * To object
   * 转换为对象
   */
  toObject(): SystemLog;

  /**
   * To JSON
   * 转换为JSON
   */
  toJSON(): string;

  /**
   * Clone
   * 克隆
   */
  clone(): ISystemLogEntry;
}

/**
 * Performance Metrics Interface
 * 性能指标接口
 */
export interface IPerformanceMetrics {
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
   * Get provider name
   * 获取提供者名称
   */
  getProvider(): string;

  /**
   * Get operation type
   * 获取操作类型
   */
  getOperation(): string;

  /**
   * Get total duration
   * 获取总持续时间
   */
  getTotalDuration(): number;

  /**
   * Get validation duration
   * 获取验证持续时间
   */
  getValidationDuration(): number | undefined;

  /**
   * Get mapping duration
   * 获取映射持续时间
   */
  getMappingDuration(): number | undefined;

  /**
   * Get execution duration
   * 获取执行持续时间
   */
  getExecutionDuration(): number | undefined;

  /**
   * Get response duration
   * 获取响应持续时间
   */
  getResponseDuration(): number | undefined;

  /**
   * Get memory usage
   * 获取内存使用情况
   */
  getMemoryUsage(): PerformanceMetrics['memoryUsage'];

  /**
   * Is successful
   * 是否成功
   */
  isSuccessful(): boolean;

  /**
   * Get error message
   * 获取错误消息
   */
  getError(): string | undefined;

  /**
   * Get stage performance
   * 获取阶段性能
   */
  getStagePerformance(): PerformanceMetrics['stagePerformance'];

  /**
   * Set total duration
   * 设置总持续时间
   */
  setTotalDuration(duration: number): void;

  /**
   * Set validation duration
   * 设置验证持续时间
   */
  setValidationDuration(duration: number): void;

  /**
   * Set mapping duration
   * 设置映射持续时间
   */
  setMappingDuration(duration: number): void;

  /**
   * Set execution duration
   * 设置执行持续时间
   */
  setExecutionDuration(duration: number): void;

  /**
   * Set response duration
   * 设置响应持续时间
   */
  setResponseDuration(duration: number): void;

  /**
   * Set memory usage
   * 设置内存使用情况
   */
  setMemoryUsage(memoryUsage: PerformanceMetrics['memoryUsage']): void;

  /**
   * Set success status
   * 设置成功状态
   */
  setSuccess(success: boolean): void;

  /**
   * Set error message
   * 设置错误消息
   */
  setError(error: string): void;

  /**
   * Set stage performance
   * 设置阶段性能
   */
  setStagePerformance(performance: PerformanceMetrics['stagePerformance']): void;

  /**
   * Add stage performance
   * 添加阶段性能
   */
  addStagePerformance(stageName: string, performance: PerformanceMetrics['stagePerformance'][string]): void;

  /**
   * Get stage performance by name
   * 根据名称获取阶段性能
   */
  getStagePerformanceByName(stageName: string): PerformanceMetrics['stagePerformance'][string] | undefined;

  /**
   * To object
   * 转换为对象
   */
  toObject(): PerformanceMetrics;

  /**
   * To JSON
   * 转换为JSON
   */
  toJSON(): string;

  /**
   * Clone
   * 克隆
   */
  clone(): IPerformanceMetrics;
}

/**
 * Log Entry Factory Interface
 * 日志条目工厂接口
 */
export interface ILogEntryFactory {
  /**
   * Create request-response log entry
   * 创建请求-响应日志条目
   */
  createRequestResponseLogEntry(data: RequestResponseLog): IRequestResponseLogEntry;

  /**
   * Create error log entry
   * 创建错误日志条目
   */
  createErrorLogEntry(data: ErrorLog): IErrorLogEntry;

  /**
   * Create system log entry
   * 创建系统日志条目
   */
  createSystemLogEntry(data: SystemLog): ISystemLogEntry;

  /**
   * Create performance metrics
   * 创建性能指标
   */
  createPerformanceMetrics(data: PerformanceMetrics): IPerformanceMetrics;

  /**
   * Create log entry from object
   * 从对象创建日志条目
   */
  createLogEntryFromObject(data: LogEntry):
    IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics;
}

/**
 * Log Entry Validator Interface
 * 日志条目验证器接口
 */
export interface ILogEntryValidator {
  /**
   * Validate request-response log entry
   * 验证请求-响应日志条目
   */
  validateRequestResponseLog(entry: RequestResponseLog): boolean;

  /**
   * Validate error log entry
   * 验证错误日志条目
   */
  validateErrorLog(entry: ErrorLog): boolean;

  /**
   * Validate system log entry
   * 验证系统日志条目
   */
  validateSystemLog(entry: SystemLog): boolean;

  /**
   * Validate performance metrics
   * 验证性能指标
   */
  validatePerformanceMetrics(metrics: PerformanceMetrics): boolean;

  /**
   * Validate log entry
   * 验证日志条目
   */
  validateLogEntry(entry: LogEntry): boolean;

  /**
   * Get validation errors
   * 获取验证错误
   */
  getValidationErrors(entry: LogEntry): string[];
}