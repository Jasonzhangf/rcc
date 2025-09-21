/**
 * Pipeline Tracker - Request ID and Pipeline Tracking System
 * 流水线跟踪器 - 请求ID和流水线跟踪系统
 */

import { PipelineBaseModule } from '../modules/PipelineBaseModule';
// Simple mock implementation for DebugCenter
class SimpleDebugCenter {
  constructor(config: any) {
    // Mock implementation
  }

  recordOperation(...args: any[]): void {
    // Mock implementation
  }

  recordPipelineStart(...args: any[]): void {
    // Mock implementation
  }

  recordPipelineEnd(...args: any[]): void {
    // Mock implementation
  }

  getPipelineEntries(...args: any[]): any[] {
    return [];
  }

  subscribe(...args: any[]): void {
    // Mock implementation
  }

  updateConfig(...args: any[]): void {
    // Mock implementation
  }

  async destroy(): Promise<void> {
    // Mock implementation
  }
}

// Type definitions for DebugCenter
interface DebugCenterType {
  recordOperation(...args: any[]): void;
  recordPipelineStart(...args: any[]): void;
  recordPipelineEnd(...args: any[]): void;
  getPipelineEntries(...args: any[]): any[];
  subscribe(...args: any[]): void;
  updateConfig(...args: any[]): void;
  destroy(): Promise<void>;
}

// Use mock if import fails
let DebugCenter: any;
try {
  DebugCenter = require('rcc-debugcenter').DebugCenter;
} catch {
  DebugCenter = SimpleDebugCenter;
}

// Type definitions
interface PipelinePosition {
  position: 'start' | 'middle' | 'end';
}

interface PipelineOperationType {
  type: string;
}
import { PipelineRequestContext, IRequestContext } from '../interfaces/IRequestContext';
import { IPipelineStage, IPipelineStageFactory, IPipelineStageManager } from '../interfaces/IPipelineStage';
import { PipelineIOEntry } from '../interfaces/IRequestContext';

/**
 * Request Context Implementation
 * 请求上下文实现
 */
class RequestContextImpl implements IRequestContext {
  private data: PipelineRequestContext;

  constructor(data: PipelineRequestContext) {
    this.data = { ...data };
  }

  getRequestId(): string {
    return this.data.requestId;
  }

  getPipelineId(): string {
    return this.data.pipelineId;
  }

  getSessionId(): string | undefined {
    return this.data.sessionId;
  }

  getStartTime(): number {
    return this.data.startTime;
  }

  getEndTime(): number | undefined {
    return this.data.endTime;
  }

  getDuration(): number | undefined {
    if (this.data.endTime) {
      return this.data.endTime - this.data.startTime;
    }
    return undefined;
  }

  getProvider(): string {
    return this.data.provider;
  }

  getModel(): string | undefined {
    return this.data.model;
  }

  getOperation(): string {
    return this.data.operation;
  }

  getStages(): any[] {
    return [...this.data.stages];
  }

  getMetadata(): Record<string, any> | undefined {
    return this.data.metadata ? { ...this.data.metadata } : undefined;
  }

  getStage(stageName: string): any | undefined {
    return this.data.stages.find(s => s.stage === stageName);
  }

  getStageStatus(stageName: string): any | undefined {
    const stage = this.getStage(stageName);
    return stage?.status;
  }

  addStage(stage: any): void {
    this.data.stages.push({ ...stage });
  }

  updateStage(stageName: string, updates: Partial<any>): void {
    const stage = this.getStage(stageName);
    if (stage) {
      Object.assign(stage, updates);
    }
  }

  isCompleted(): boolean {
    return this.data.endTime !== undefined;
  }

  isFailed(): boolean {
    return this.data.stages.some(s => s.status === 'failed');
  }

  getFailedStages(): any[] {
    return this.data.stages.filter(s => s.status === 'failed');
  }

  getCompletedStages(): any[] {
    return this.data.stages.filter(s => s.status === 'completed');
  }

  getRunningStages(): any[] {
    return this.data.stages.filter(s => s.status === 'running');
  }

  getStageDuration(stageName: string): number | undefined {
    const stage = this.getStage(stageName);
    if (stage && stage.endTime) {
      return stage.endTime - stage.startTime;
    }
    return undefined;
  }

  getTotalStageDuration(): number {
    return this.data.stages
      .filter(s => s.endTime)
      .reduce((total, stage) => total + (stage.endTime! - stage.startTime), 0);
  }

  getSummary() {
    const completedStages = this.getCompletedStages();
    const failedStages = this.getFailedStages();

    let status: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
    if (this.isCompleted()) {
      status = failedStages.length > 0 ? 'failed' : 'completed';
    } else if (this.data.stages.length > 0) {
      status = 'running';
    }

    return {
      requestId: this.data.requestId,
      pipelineId: this.data.pipelineId,
      provider: this.data.provider,
      operation: this.data.operation,
      duration: this.getDuration(),
      totalStages: this.data.stages.length,
      completedStages: completedStages.length,
      failedStages: failedStages.length,
      status
    };
  }

  toObject(): PipelineRequestContext {
    return { ...this.data };
  }

  clone(): IRequestContext {
    return new RequestContextImpl(this.toObject());
  }

  setSessionId(sessionId: string): void {
    this.data.sessionId = sessionId;
  }

  setEndTime(endTime: number): void {
    this.data.endTime = endTime;
  }

  setModel(model: string): void {
    this.data.model = model;
  }

  setMetadata(metadata: Record<string, any>): void {
    this.data.metadata = { ...metadata };
  }
}

/**
 * Pipeline Stage Implementation
 * 流水线阶段实现
 */
class PipelineStageImpl implements IPipelineStage {
  private data: any;

  constructor(data: any) {
    this.data = { ...data };
  }

  getStageName(): string {
    return this.data.stage;
  }

  getStartTime(): number {
    return this.data.startTime;
  }

  getEndTime(): number | undefined {
    return this.data.endTime;
  }

  getDuration(): number | undefined {
    if (this.data.endTime) {
      return this.data.endTime - this.data.startTime;
    }
    return undefined;
  }

  getStatus(): any {
    return this.data.status;
  }

  getError(): string | undefined {
    return this.data.error;
  }

  getData(): any {
    return this.data.data;
  }

  setStartTime(startTime: number): void {
    this.data.startTime = startTime;
  }

  setEndTime(endTime: number): void {
    this.data.endTime = endTime;
  }

  setStatus(status: any): void {
    this.data.status = status;
  }

  setError(error: string): void {
    this.data.error = error;
  }

  setData(data: any): void {
    this.data.data = data;
  }

  markAsStarted(): void {
    this.data.startTime = Date.now();
    this.data.status = 'running';
  }

  markAsCompleted(data?: any): void {
    this.data.endTime = Date.now();
    this.data.status = 'completed';
    if (data !== undefined) {
      this.data.data = data;
    }
  }

  markAsFailed(error: string): void {
    this.data.endTime = Date.now();
    this.data.status = 'failed';
    this.data.error = error;
  }

  isCompleted(): boolean {
    return this.data.status === 'completed';
  }

  isFailed(): boolean {
    return this.data.status === 'failed';
  }

  isRunning(): boolean {
    return this.data.status === 'running';
  }

  toObject(): any {
    return { ...this.data };
  }

  clone(): IPipelineStage {
    return new PipelineStageImpl(this.toObject());
  }
}

/**
 * Pipeline Stage Factory Implementation
 * 流水线阶段工厂实现
 */
class PipelineStageFactoryImpl implements IPipelineStageFactory {
  createStage(stageName: string): IPipelineStage {
    return new PipelineStageImpl({
      stage: stageName,
      startTime: Date.now(),
      status: 'pending'
    });
  }

  createStageWithData(stageName: string, data: any): IPipelineStage {
    return new PipelineStageImpl({
      stage: stageName,
      startTime: Date.now(),
      status: 'pending',
      data
    });
  }

  createStageFromObject(stageObject: any): IPipelineStage {
    return new PipelineStageImpl(stageObject);
  }
}

/**
 * Pipeline Stage Manager Implementation
 * 流水线阶段管理器实现
 */
class PipelineStageManagerImpl implements IPipelineStageManager {
  private stages: Map<string, IPipelineStage> = new Map();
  private stageFactory: IPipelineStageFactory;

  constructor(stageFactory: IPipelineStageFactory) {
    this.stageFactory = stageFactory;
  }

  addStage(stage: IPipelineStage): void {
    this.stages.set(stage.getStageName(), stage);
  }

  getStage(stageName: string): IPipelineStage | undefined {
    return this.stages.get(stageName);
  }

  removeStage(stageName: string): boolean {
    return this.stages.delete(stageName);
  }

  updateStage(stageName: string, updates: Partial<IPipelineStage>): boolean {
    const stage = this.getStage(stageName);
    if (stage) {
      if (updates.getStageName && updates.getStageName() !== undefined) {
        const newStageName = updates.getStageName();
        this.stages.delete(stageName);
        this.stages.set(newStageName, stage);
      }
      return true;
    }
    return false;
  }

  getAllStages(): IPipelineStage[] {
    return Array.from(this.stages.values());
  }

  getStagesByStatus(status: any): IPipelineStage[] {
    return this.getAllStages().filter(stage => stage.getStatus() === status);
  }

  getCompletedStages(): IPipelineStage[] {
    return this.getStagesByStatus('completed');
  }

  getFailedStages(): IPipelineStage[] {
    return this.getStagesByStatus('failed');
  }

  getRunningStages(): IPipelineStage[] {
    return this.getStagesByStatus('running');
  }

  clearAllStages(): void {
    this.stages.clear();
  }

  getStageStatistics() {
    const stages = this.getAllStages();
    return {
      total: stages.length,
      completed: stages.filter(s => s.isCompleted()).length,
      failed: stages.filter(s => s.isFailed()).length,
      running: stages.filter(s => s.isRunning()).length,
      pending: stages.filter(s => s.getStatus() === 'pending').length
    };
  }
}

/**
 * Pipeline Tracker Main Class
 * 流水线跟踪器主类
 */
export class PipelineTracker extends PipelineBaseModule {
  protected debugCenter: DebugCenterType | null = null;

  /**
   * Set debug center for integration
   * 设置调试中心用于集成
   */
  public setDebugCenter(debugCenter: DebugCenterType): void {
    this.debugCenter = debugCenter;
  }

  /**
   * Get debug center instance
   * 获取调试中心实例
   */
  public getDebugCenter(): DebugCenterType | null {
    return this.debugCenter;
  }

  /**
   * Event listener for tracking events
   * 跟踪事件的事件监听器
   */
  public subscribe(event: string, callback: (data: any) => void): void {
    // Simple event listener implementation
    // In a real implementation, this would use an event emitter
    this.logInfo(`Event listener registered for: ${event}`, { event }, 'subscribe');
  }

  /**
   * Handle system messages including 'module_registered'
   * 处理系统消息，包括'module_registered'
   */
  async handleMessage(message: any): Promise<any> {
    if (!message || !message.type) {
      this.warn('Received invalid message', { message }, 'handleMessage');
      return { success: false, error: 'Invalid message format' };
    }

    try {
      switch (message.type) {
        case 'module_registered':
          // Handle module registration messages
          this.logInfo('Module registered', {
            moduleId: message.moduleId,
            moduleName: message.moduleName,
            moduleType: message.moduleType
          }, 'handleMessage');

          // Record module registration in debug center if available
          if (this.debugCenter) {
            this.debugCenter.recordOperation(
              'system',
              this.info.id,
              `module-registered-${message.moduleId}`,
              {
                moduleId: message.moduleId,
                moduleName: message.moduleName,
                moduleType: message.moduleType,
                timestamp: Date.now()
              },
              undefined,
              'handleMessage',
              true,
              undefined,
              'middle'
            );
          }

          return { success: true, message: `Module ${message.moduleName} registered successfully` };

        case 'pipeline_started':
          // Handle pipeline start messages
          this.logInfo('Pipeline started', {
            pipelineId: message.pipelineId,
            virtualModelId: message.virtualModelId
          }, 'handleMessage');

          return { success: true, message: 'Pipeline start recorded' };

        case 'pipeline_completed':
          // Handle pipeline completion messages
          this.logInfo('Pipeline completed', {
            pipelineId: message.pipelineId,
            executionTime: message.executionTime,
            success: message.success
          }, 'handleMessage');

          return { success: true, message: 'Pipeline completion recorded' };

        case 'request_started':
          // Handle request start messages
          this.logInfo('Request started', {
            requestId: message.requestId,
            sessionId: message.sessionId,
            provider: message.provider
          }, 'handleMessage');

          return { success: true, message: 'Request start recorded' };

        case 'request_completed':
          // Handle request completion messages
          this.logInfo('Request completed', {
            requestId: message.requestId,
            executionTime: message.executionTime,
            success: message.success
          }, 'handleMessage');

          return { success: true, message: 'Request completion recorded' };

        default:
          // For unknown message types, just log them
          this.debug('debug', 'Received unhandled message type', {
            type: message.type,
            data: message
          }, 'handleMessage');

          return { success: true, message: `Message type ${message.type} acknowledged` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('Error handling message', {
        messageType: message.type,
        error: errorMessage
      }, 'handleMessage');

      return {
        success: false,
        error: errorMessage,
        message: `Failed to handle message type: ${message.type}`
      };
    }
  }

  /**
   * Legacy on method for backward compatibility
   * @deprecated Use subscribe instead
   */
  public on(event: string, callback: (data: any) => void): void {
    this.subscribe(event, callback);
  }
  private activeRequests: Map<string, IRequestContext> = new Map();
  private stageFactory: IPipelineStageFactory;
  private stageManager: IPipelineStageManager;

  constructor() {
    const config = {
      id: 'pipeline-tracker',
      name: 'Pipeline Tracker',
      version: '1.0.0',
      description: 'Pipeline request tracking and stage management system',
      type: 'tracker' as const,
      enableTwoPhaseDebug: true,
      enableIOTracking: true,
      debugBaseDirectory: '~/.rcc/debug-logs'
    };

    super(config);

    this.stageFactory = new PipelineStageFactoryImpl();
    this.stageManager = new PipelineStageManagerImpl(this.stageFactory);

    this.logInfo('Pipeline tracker initialized', {}, 'constructor');
  }

  /**
   * Create new request context with I/O tracking
   * 创建新的请求上下文并启用I/O跟踪
   */
  createRequestContext(
    provider: string,
    operation: 'chat' | 'streamChat' | 'healthCheck',
    metadata?: Record<string, any>
  ): IRequestContext {
    const contextData: PipelineRequestContext = {
      requestId: this.generateRequestId(),
      pipelineId: this.generatePipelineId(),
      startTime: Date.now(),
      provider,
      operation,
      stages: [],
      metadata
    };

    const context = new RequestContextImpl(contextData);
    this.activeRequests.set(context.getRequestId(), context);

    // Start I/O tracking if enabled
    if (this.debugCenter) {
      this.debugCenter.recordPipelineStart(
        contextData.requestId,
        contextData.pipelineId,
        `Pipeline: ${provider} ${operation}`,
        { provider, operation, metadata },
        { method: 'createRequestContext' }
      );
    }

    this.logInfo('Request context created', {
      requestId: contextData.requestId,
      provider,
      operation
    }, 'createRequestContext');

    return context;
  }

  /**
   * Get request context by ID
   * 根据ID获取请求上下文
   */
  getRequestContext(requestId: string): IRequestContext | undefined {
    return this.activeRequests.get(requestId);
  }

  /**
   * Add pipeline stage with I/O tracking
   * 添加流水线阶段并记录I/O
   */
  addStage(requestId: string, stageName: string): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stage = this.stageFactory.createStage(stageName);
      stage.markAsStarted();
      context.addStage(stage.toObject());
      this.stageManager.addStage(stage);

      // Record stage operation in I/O tracking
      if (this.debugCenter) {
        this.debugCenter.recordOperation(
          context.getPipelineId(),
          this.info.id,
          `${requestId}-${stageName}`,
          { stageName, action: 'start' },
          undefined,
          'addStage',
          true,
          undefined,
          'middle'
        );
      }

      this.logInfo('Pipeline stage added', {
        requestId,
        stageName,
        status: 'started'
      }, 'addStage');
    }
  }

  /**
   * Complete pipeline stage with I/O tracking
   * 完成流水线阶段并记录I/O
   */
  completeStage(requestId: string, stageName: string, data?: any): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stage = this.stageManager.getStage(stageName);
      if (stage) {
        stage.markAsCompleted(data);
        context.updateStage(stageName, stage.toObject());

        // Record stage completion in I/O tracking
        if (this.debugCenter) {
          this.debugCenter.recordOperation(
            context.getPipelineId(),
            this.info.id,
            `${requestId}-${stageName}`,
            { stageName, action: 'complete' },
            { data },
            'completeStage',
            true,
            undefined,
            'middle'
          );
        }

        this.logInfo('Pipeline stage completed', {
          requestId,
          stageName,
          duration: stage.getDuration()
        }, 'completeStage');
      }
    }
  }

  /**
   * Mark stage as failed with I/O tracking
   * 标记阶段为失败并记录I/O
   */
  failStage(requestId: string, stageName: string, error: string): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stage = this.stageManager.getStage(stageName);
      if (stage) {
        stage.markAsFailed(error);
        context.updateStage(stageName, stage.toObject());

        // Record stage failure in I/O tracking
        if (this.debugCenter) {
          this.debugCenter.recordOperation(
            context.getPipelineId(),
            this.info.id,
            `${requestId}-${stageName}`,
            { stageName, action: 'fail' },
            undefined,
            'failStage',
            false,
            error,
            'middle'
          );
        }

        this.logInfo('Pipeline stage failed', {
          requestId,
          stageName,
          error
        }, 'failStage');
      }
    }
  }

  /**
   * Complete request context with I/O tracking
   * 完成请求上下文并记录I/O
   */
  completeRequest(requestId: string): IRequestContext | undefined {
    const context = this.activeRequests.get(requestId);
    if (context) {
      context.setEndTime(Date.now());

      // Record pipeline completion in I/O tracking
      if (this.debugCenter) {
        this.debugCenter.recordPipelineEnd(
          context.getRequestId(),
          context.getPipelineId(),
          `Pipeline: ${context.getPipelineId()}`,
          { duration: context.getDuration(), stages: context.getStages() },
          !context.isFailed(),
          context.isFailed() ? 'Pipeline failed' : undefined,
          { method: 'completeRequest' }
        );
      }

      this.activeRequests.delete(requestId);

      this.logInfo('Request context completed', {
        requestId,
        duration: context.getDuration(),
        success: !context.isFailed()
      }, 'completeRequest');

      return context;
    }
    return undefined;
  }

  /**
   * Get all active requests
   * 获取所有活动请求
   */
  getActiveRequests(): IRequestContext[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get request statistics
   * 获取请求统计
   */
  getRequestStatistics() {
    const activeRequests = this.getActiveRequests();
    return {
      activeRequests: activeRequests.length,
      totalStages: activeRequests.reduce((total, req) => total + req.getStages().length, 0),
      completedStages: activeRequests.reduce((total, req) => total + req.getCompletedStages().length, 0),
      failedStages: activeRequests.reduce((total, req) => total + req.getFailedStages().length, 0),
      runningStages: activeRequests.reduce((total, req) => total + req.getRunningStages().length, 0)
    };
  }

  /**
   * Clear all active requests
   * 清除所有活动请求
   */
  clearAllRequests(): void {
    this.activeRequests.clear();
    this.stageManager.clearAllStages();
    this.logInfo('All requests cleared', {}, 'clearAllRequests');
  }

  /**
   * Generate unique request ID
   * 生成唯一请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique pipeline ID
   * 生成唯一流水线ID
   */
  private generatePipelineId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stage factory
   * 获取阶段工厂
   */
  getStageFactory(): IPipelineStageFactory {
    return this.stageFactory;
  }

  /**
   * Get stage manager
   * 获取阶段管理器
   */
  getStageManager(): IPipelineStageManager {
    return this.stageManager;
  }

  /**
   * Create context for pipeline execution (compatibility method)
   * 创建流水线执行上下文（兼容性方法）
   */
  createContext(
    moduleInfo: any,
    stage: string,
    request?: any,
    options?: any
  ): any {
    const requestId = this.generateRequestId();
    const context = this.createRequestContext(
      moduleInfo.providerName || 'unknown',
      'chat' as any,
      { moduleInfo, stage, request, options }
    );

    // Add stage information
    this.addStage(requestId, stage);

    return {
      executionId: requestId,
      requestId: requestId,
      traceId: context.getPipelineId(),
      stage: stage,
      module: moduleInfo,
      timing: {
        startTime: Date.now(),
        stageTimings: new Map()
      },
      request: request,
      metadata: options?.metadata || {},
      parent: options?.parentContext
    };
  }

  /**
   * Record request (compatibility method)
   * 记录请求（兼容性方法）
   */
  async recordRequest(context: any, request: any, stage: string): Promise<void> {
    if (this.debugCenter) {
      this.debugCenter.recordOperation(
        context.traceId,
        context.module?.moduleId || 'unknown',
        `${context.executionId}-request`,
        { stage, request },
        undefined,
        'recordRequest',
        true,
        undefined,
        'middle'
      );
    }
  }

  /**
   * Record response (compatibility method)
   * 记录响应（兼容性方法）
   */
  async recordResponse(context: any, response: any, stage: string): Promise<void> {
    if (this.debugCenter) {
      this.debugCenter.recordOperation(
        context.traceId,
        context.module?.moduleId || 'unknown',
        `${context.executionId}-response`,
        { stage, response },
        undefined,
        'recordResponse',
        true,
        undefined,
        'middle'
      );
    }
  }

  /**
   * Complete context (compatibility method)
   * 完成上下文（兼容性方法）
   */
  completeContext(context: any, response?: any, error?: any): void {
    const requestId = context.executionId || context.requestId;
    this.completeRequest(requestId);
  }

  /**
   * Get execution statistics (compatibility method)
   * 获取执行统计（兼容性方法）
   */
  getStatistics(): any {
    return this.getRequestStatistics();
  }

  /**
   * Get active contexts (compatibility method)
   * 获取活动上下文（兼容性方法）
   */
  getActiveContexts(): any[] {
    return this.getActiveRequests();
  }

  /**
   * Get active trace chains (compatibility method)
   * 获取活动跟踪链（兼容性方法）
   */
  getActiveTraceChains(): any[] {
    return this.getActiveRequests().map(req => ({
      traceId: req.getPipelineId(),
      requests: [req]
    }));
  }

  /**
   * Sanitize data for logging (compatibility method)
   * 清理数据用于日志记录（兼容性方法）
   */
  sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get configuration (compatibility method)
   * 获取配置（兼容性方法）
   */
  getConfig(): any {
    return {
      enabled: this.pipelineConfig.enableIOTracking || false,
      maxActiveTraces: 1000,
      traceRetentionTime: 300000,
      enableChainTracking: true,
      enableMetrics: this.pipelineConfig.enableIOTracking || false,
      maxContextDepth: 10,
      samplingRate: 1.0,
      enableRealTimeMonitoring: true
    };
  }

  /**
   * Update configuration (compatibility method)
   * 更新配置（兼容性方法）
   */
  updateConfig(newConfig: any): void {
    this.updatePipelineConfig({
      enableIOTracking: newConfig.enabled
    });
  }
}