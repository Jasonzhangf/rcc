/**
 * Log Entry Factory - Create Log Entry Objects
 * 日志条目工厂 - 创建日志条目对象
 */

import {
  RequestResponseLog,
  ErrorLog,
  SystemLog,
  PerformanceMetrics,
  LogEntry
} from '../types/debug-types';
import {
  IRequestResponseLogEntry,
  IErrorLogEntry,
  ISystemLogEntry,
  IPerformanceMetrics,
  ILogEntryFactory
} from '../interfaces/ILogEntries';

/**
 * Request Response Log Entry Implementation
 * 请求响应日志条目实现
 */
class RequestResponseLogEntryImpl implements IRequestResponseLogEntry {
  private data: RequestResponseLog;

  constructor(data: RequestResponseLog) {
    this.data = { ...data };
  }

  getRequestId(): string {
    return this.data.requestId;
  }

  getPipelineId(): string {
    return this.data.pipelineId;
  }

  getTimestamp(): number {
    return this.data.timestamp;
  }

  getProvider(): string {
    return this.data.provider;
  }

  getOperation(): string {
    return this.data.operation;
  }

  getRequest(): RequestResponseLog['request'] {
    return { ...this.data.request };
  }

  getResponse(): RequestResponseLog['response'] {
    return { ...this.data.response };
  }

  getDuration(): number {
    return this.data.duration;
  }

  isSuccessful(): boolean {
    return this.data.success;
  }

  getError(): string | undefined {
    return this.data.error;
  }

  getStages(): RequestResponseLog['stages'] {
    return [...this.data.stages];
  }

  setRequest(request: RequestResponseLog['request']): void {
    this.data.request = { ...request };
  }

  setResponse(response: RequestResponseLog['response']): void {
    this.data.response = { ...response };
  }

  setDuration(duration: number): void {
    this.data.duration = duration;
  }

  setError(error: string): void {
    this.data.error = error;
  }

  addStage(stage: RequestResponseLog['stages'][0]): void {
    this.data.stages.push({ ...stage });
  }

  toObject(): RequestResponseLog {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): IRequestResponseLogEntry {
    return new RequestResponseLogEntryImpl(this.toObject());
  }
}

/**
 * System Log Entry Implementation
 * 系统日志条目实现
 */
class SystemLogEntryImpl implements ISystemLogEntry {
  private data: SystemLog;

  constructor(data: SystemLog) {
    this.data = { ...data };
  }

  getLevel(): SystemLog['level'] {
    return this.data.level;
  }

  getMessage(): string {
    return this.data.message;
  }

  getTimestamp(): number {
    return this.data.timestamp;
  }

  getRequestId(): string | undefined {
    return this.data.requestId;
  }

  getProvider(): string | undefined {
    return this.data.provider;
  }

  getOperation(): string | undefined {
    return this.data.operation;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.data.metadata ? { ...this.data.metadata } : undefined;
  }

  setLevel(level: SystemLog['level']): void {
    this.data.level = level;
  }

  setMessage(message: string): void {
    this.data.message = message;
  }

  setRequestId(requestId: string): void {
    this.data.requestId = requestId;
  }

  setProvider(provider: string): void {
    this.data.provider = provider;
  }

  setOperation(operation: string): void {
    this.data.operation = operation;
  }

  setMetadata(metadata: Record<string, any>): void {
    this.data.metadata = { ...metadata };
  }

  toObject(): SystemLog {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): ISystemLogEntry {
    return new SystemLogEntryImpl(this.toObject());
  }
}

/**
 * Performance Metrics Implementation
 * 性能指标实现
 */
class PerformanceMetricsImpl implements IPerformanceMetrics {
  private data: PerformanceMetrics;

  constructor(data: PerformanceMetrics) {
    this.data = { ...data };
  }

  getRequestId(): string {
    return this.data.requestId;
  }

  getPipelineId(): string {
    return this.data.pipelineId;
  }

  getProvider(): string {
    return this.data.provider;
  }

  getOperation(): string {
    return this.data.operation;
  }

  getTotalDuration(): number {
    return this.data.totalDuration;
  }

  getValidationDuration(): number | undefined {
    return this.data.validationDuration;
  }

  getMappingDuration(): number | undefined {
    return this.data.mappingDuration;
  }

  getExecutionDuration(): number | undefined {
    return this.data.executionDuration;
  }

  getResponseDuration(): number | undefined {
    return this.data.responseDuration;
  }

  getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    return this.data.memoryUsage ? { ...this.data.memoryUsage } : undefined;
  }

  isSuccessful(): boolean {
    return this.data.success;
  }

  getError(): string | undefined {
    return this.data.error;
  }

  getStagePerformance(): PerformanceMetrics['stagePerformance'] {
    return { ...this.data.stagePerformance };
  }

  setTotalDuration(duration: number): void {
    this.data.totalDuration = duration;
  }

  setValidationDuration(duration: number): void {
    this.data.validationDuration = duration;
  }

  setMappingDuration(duration: number): void {
    this.data.mappingDuration = duration;
  }

  setExecutionDuration(duration: number): void {
    this.data.executionDuration = duration;
  }

  setResponseDuration(duration: number): void {
    this.data.responseDuration = duration;
  }

  setMemoryUsage(memoryUsage: PerformanceMetrics['memoryUsage']): void {
    this.data.memoryUsage = memoryUsage ? { ...memoryUsage } : undefined;
  }

  setSuccess(success: boolean): void {
    this.data.success = success;
  }

  setError(error: string): void {
    this.data.error = error;
  }

  setStagePerformance(performance: PerformanceMetrics['stagePerformance']): void {
    this.data.stagePerformance = { ...performance };
  }

  addStagePerformance(stageName: string, performance: PerformanceMetrics['stagePerformance'][string]): void {
    if (!this.data.stagePerformance) {
      this.data.stagePerformance = {};
    }
    this.data.stagePerformance[stageName] = { ...performance };
  }

  getStagePerformanceByName(stageName: string): PerformanceMetrics['stagePerformance'][string] | undefined {
    return this.data.stagePerformance?.[stageName];
  }

  toObject(): PerformanceMetrics {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): IPerformanceMetrics {
    return new PerformanceMetricsImpl(this.toObject());
  }
}

/**
 * Error Log Entry Implementation
 * 错误日志条目实现
 */
class ErrorLogEntryImpl implements IErrorLogEntry {
  private data: ErrorLog;

  constructor(data: ErrorLog) {
    this.data = { ...data };
  }

  getRequestId(): string {
    return this.data.requestId;
  }

  getPipelineId(): string {
    return this.data.pipelineId;
  }

  getTimestamp(): number {
    return this.data.timestamp;
  }

  getProvider(): string {
    return this.data.provider;
  }

  getOperation(): string {
    return this.data.operation;
  }

  getError(): ErrorLog['error'] {
    return { ...this.data.error };
  }

  getRequest(): ErrorLog['request'] {
    return { ...this.data.request };
  }

  getFailedStage(): string | undefined {
    return this.data.failedStage;
  }

  getStages(): ErrorLog['stages'] {
    return [...this.data.stages];
  }

  getDebugInfo(): Record<string, any> | undefined {
    return this.data.debugInfo ? { ...this.data.debugInfo } : undefined;
  }

  setError(error: ErrorLog['error']): void {
    this.data.error = { ...error };
  }

  setRequest(request: ErrorLog['request']): void {
    this.data.request = { ...request };
  }

  setFailedStage(stage: string): void {
    this.data.failedStage = stage;
  }

  setDebugInfo(debugInfo: Record<string, any>): void {
    this.data.debugInfo = { ...debugInfo };
  }

  addStage(stage: ErrorLog['stages'][0]): void {
    this.data.stages.push({ ...stage });
  }

  toObject(): ErrorLog {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): IErrorLogEntry {
    return new ErrorLogEntryImpl(this.toObject());
  }
}

/**
 * Log Entry Factory Implementation
 * 日志条目工厂实现
 */
export class LogEntryFactory implements ILogEntryFactory {
  /**
   * Create request-response log entry
   * 创建请求-响应日志条目
   */
  createRequestResponseLogEntry(data: RequestResponseLog): IRequestResponseLogEntry {
    return new RequestResponseLogEntryImpl(data);
  }

  /**
   * Create error log entry
   * 创建错误日志条目
   */
  createErrorLogEntry(data: ErrorLog): IErrorLogEntry {
    return new ErrorLogEntryImpl(data);
  }

  /**
   * Create system log entry
   * 创建系统日志条目
   */
  createSystemLogEntry(data: SystemLog): ISystemLogEntry {
    return new SystemLogEntryImpl(data);
  }

  /**
   * Create performance metrics
   * 创建性能指标
   */
  createPerformanceMetrics(data: PerformanceMetrics): IPerformanceMetrics {
    return new PerformanceMetricsImpl(data);
  }

  /**
   * Create log entry from object
   * 从对象创建日志条目
   */
  createLogEntryFromObject(data: LogEntry):
    IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics {

    // Check type and create appropriate entry
    if ('error' in data && 'request' in data && 'failedStage' in data) {
      return this.createErrorLogEntry(data as ErrorLog);
    } else if ('level' in data && 'message' in data) {
      return this.createSystemLogEntry(data as SystemLog);
    } else if ('totalDuration' in data && 'stagePerformance' in data) {
      return this.createPerformanceMetrics(data as PerformanceMetrics);
    } else if ('request' in data && 'response' in data) {
      return this.createRequestResponseLogEntry(data as RequestResponseLog);
    }

    throw new Error(`Unknown log entry type: ${JSON.stringify(data)}`);
  }

  /**
   * Create minimal request-response log entry
   * 创建最小请求-响应日志条目
   */
  createMinimalRequestResponseLog(
    requestId: string,
    pipelineId: string,
    provider: string,
    operation: string,
    request: any,
    response: any,
    duration: number
  ): IRequestResponseLogEntry {
    const data: RequestResponseLog = {
      requestId,
      pipelineId,
      timestamp: Date.now(),
      provider,
      operation,
      request: { body: request },
      response: { status: 200, body: response },
      duration,
      success: true,
      stages: []
    };

    return this.createRequestResponseLogEntry(data);
  }

  /**
   * Create minimal error log entry
   * 创建最小错误日志条目
   */
  createMinimalErrorLog(
    requestId: string,
    pipelineId: string,
    provider: string,
    operation: string,
    error: Error | string,
    request?: any
  ): IErrorLogEntry {
    const data: ErrorLog = {
      requestId,
      pipelineId,
      timestamp: Date.now(),
      provider,
      operation,
      error: typeof error === 'string'
        ? { message: error, type: 'Error' }
        : { message: error.message, stack: error.stack, type: error.constructor.name },
      request: request ? { body: request } : { body: null },
      stages: []
    };

    return this.createErrorLogEntry(data);
  }

  /**
   * Create minimal system log entry
   * 创建最小系统日志条目
   */
  createMinimalSystemLog(
    level: SystemLog['level'],
    message: string,
    provider?: string,
    operation?: string
  ): ISystemLogEntry {
    const data: SystemLog = {
      level,
      message,
      timestamp: Date.now(),
      provider,
      operation
    };

    return this.createSystemLogEntry(data);
  }

  /**
   * Create minimal performance metrics
   * 创建最小性能指标
   */
  createMinimalPerformanceMetrics(
    requestId: string,
    pipelineId: string,
    provider: string,
    operation: string,
    totalDuration: number,
    success: boolean
  ): IPerformanceMetrics {
    const data: PerformanceMetrics = {
      requestId,
      pipelineId,
      provider,
      operation,
      totalDuration,
      success,
      stagePerformance: {}
    };

    return this.createPerformanceMetrics(data);
  }

  /**
   * Create batch of log entries
   * 创建批量日志条目
   */
  createBatchLogEntries<T extends LogEntry>(
    entries: T[],
    type: 'request-response' | 'error' | 'system' | 'performance'
  ): Array<IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics> {
    return entries.map(entry => {
      switch (type) {
        case 'request-response':
          return this.createRequestResponseLogEntry(entry as RequestResponseLog);
        case 'error':
          return this.createErrorLogEntry(entry as ErrorLog);
        case 'system':
          return this.createSystemLogEntry(entry as SystemLog);
        case 'performance':
          return this.createPerformanceMetrics(entry as PerformanceMetrics);
        default:
          throw new Error(`Unknown log entry type: ${type}`);
      }
    });
  }

  /**
   * Clone log entry
   * 克隆日志条目
   */
  cloneLogEntry(entry: IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics):
    IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics {
    return entry.clone();
  }

  /**
   * Convert log entry to JSON
   * 将日志条目转换为JSON
   */
  logEntryToJSON(entry: IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics): string {
    return entry.toJSON();
  }

  /**
   * Convert JSON to log entry
   * 将JSON转换为日志条目
   */
  jsonToLogEntry(json: string): IRequestResponseLogEntry | IErrorLogEntry | ISystemLogEntry | IPerformanceMetrics {
    try {
      const data = JSON.parse(json);
      return this.createLogEntryFromObject(data);
    } catch (error) {
      throw new Error(`Failed to parse JSON log entry: ${error}`);
    }
  }
}