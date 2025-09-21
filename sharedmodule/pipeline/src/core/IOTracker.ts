/**
 * RCC Pipeline IO Tracker
 *
 * IO记录增强组件，提供详细的请求/响应跟踪、性能监控和调试信息收集
 */

import {
  IORecord,
  PipelineExecutionContext,
  DebugConfig,
  PerformanceMetrics
} from '../interfaces/ModularInterfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * 跟踪数据结构
 */
interface TrackingData {
  sessionId: string;
  requestId: string;
  startTime: number;
  ioRecords: IORecord[];
  performanceMetrics: PerformanceMetrics;
  debugData: Map<string, any>;
}

/**
 * IO记录过滤器
 */
interface IORecordFilter {
  sessionId?: string;
  requestId?: string;
  moduleId?: string;
  type?: IORecord['type'];
  timeRange?: {
    start: number;
    end: number;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
}

/**
 * 性能分析结果
 */
interface PerformanceAnalysis {
  totalProcessingTime: number;
  averageStepTime: number;
  bottleneckStep?: string;
  throughput: number;
  memoryUsage?: {
    peak: number;
    average: number;
  };
  networkLatency: {
    total: number;
    average: number;
  };
}

/**
 * IO跟踪器类
 */
export class IOTracker {
  private trackingData: Map<string, TrackingData> = new Map();
  private globalIORecords: IORecord[] = [];
  private debugConfig: DebugConfig;
  private maxGlobalRecords: number = 10000;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(debugConfig?: Partial<DebugConfig>) {
    this.debugConfig = {
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      enableSampling: false,
      sampleRate: 0.1,
      ...debugConfig
    };

    this.initializeMetricsCollection();
  }

  /**
   * 初始化指标收集
   */
  private initializeMetricsCollection(): void {
    if (this.debugConfig.enablePerformanceMonitoring) {
      this.metricsInterval = setInterval(() => {
        this.cleanupOldRecords();
      }, 60000); // 每分钟清理一次旧记录
    }
  }

  /**
   * 开始跟踪会话
   */
  startSession(sessionId: string, requestId?: string): string {
    const actualRequestId = requestId || uuidv4();
    const trackingData: TrackingData = {
      sessionId,
      requestId: actualRequestId,
      startTime: Date.now(),
      ioRecords: [],
      performanceMetrics: this.createInitialMetrics(),
      debugData: new Map()
    };

    this.trackingData.set(sessionId, trackingData);

    // 记录会话开始
    this.recordIO({
      sessionId,
      requestId: actualRequestId,
      moduleId: 'system',
      step: 'session_start',
      data: { sessionStart: true },
      size: 0,
      processingTime: 0,
      type: 'transformation' as const
    });

    return actualRequestId;
  }

  /**
   * 记录IO操作
   */
  recordIO(record: Omit<IORecord, 'id' | 'timestamp'>): string {
    if (!this.debugConfig.enableIOTracking) {
      return '';
    }

    // 抽样检查
    if (this.debugConfig.enableSampling && Math.random() > this.debugConfig.sampleRate) {
      return '';
    }

    const ioRecord: IORecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...record
    };

    // 添加到会话跟踪
    const trackingData = this.trackingData.get(record.sessionId);
    if (trackingData) {
      trackingData.ioRecords.push(ioRecord);
    }

    // 添加到全局记录
    this.globalIORecords.push(ioRecord);
    if (this.globalIORecords.length > this.maxGlobalRecords) {
      this.globalIORecords.shift();
    }

    // 更新性能指标
    this.updatePerformanceMetrics(ioRecord);

    return ioRecord.id;
  }

  /**
   * 跟踪步骤执行
   */
  trackStepExecution<T>(
    sessionId: string,
    requestId: string,
    moduleId: string,
    stepName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    return operation()
      .then(result => {
        const processingTime = Date.now() - startTime;

        this.recordIO({
          sessionId,
          requestId,
          moduleId,
          step: stepName,
          data: { success: true },
          size: JSON.stringify(result).length,
          processingTime,
          type: 'transformation' as const
        });

        return result;
      })
      .catch(error => {
        const processingTime = Date.now() - startTime;

        this.recordIO({
          sessionId,
          requestId,
          moduleId,
          step: stepName,
          data: { error: error.message },
          size: 0,
          processingTime,
          type: 'error' as const
        });

        throw error;
      });
  }

  /**
   * 跟踪请求
   */
  trackRequest(
    sessionId: string,
    requestId: string,
    moduleId: string,
    requestData: any
  ): string {
    return this.recordIO({
      sessionId,
      requestId,
      moduleId,
      step: 'request',
      data: requestData,
      size: JSON.stringify(requestData).length,
      processingTime: 0,
      type: 'request' as const
    });
  }

  /**
   * 跟踪响应
   */
  trackResponse(
    sessionId: string,
    requestId: string,
    moduleId: string,
    responseData: any,
    requestTime: number
  ): string {
    const processingTime = Date.now() - requestTime;

    return this.recordIO({
      sessionId,
      requestId,
      moduleId,
      step: 'response',
      data: responseData,
      size: JSON.stringify(responseData).length,
      processingTime,
      type: 'response' as const
    });
  }

  /**
   * 添加调试数据
   */
  addDebugData(sessionId: string, key: string, value: any): void {
    const trackingData = this.trackingData.get(sessionId);
    if (trackingData) {
      trackingData.debugData.set(key, value);
    }
  }

  /**
   * 获取会话跟踪数据
   */
  getSessionData(sessionId: string): TrackingData | undefined {
    return this.trackingData.get(sessionId);
  }

  /**
   * 获取IO记录
   */
  getIORecords(filter?: IORecordFilter): IORecord[] {
    let records = [...this.globalIORecords];

    if (filter) {
      records = records.filter(record => {
        if (filter.sessionId && record.sessionId !== filter.sessionId) return false;
        if (filter.requestId && record.requestId !== filter.requestId) return false;
        if (filter.moduleId && record.moduleId !== filter.moduleId) return false;
        if (filter.type && record.type !== filter.type) return false;
        if (filter.timeRange) {
          if (record.timestamp < filter.timeRange.start || record.timestamp > filter.timeRange.end) {
            return false;
          }
        }
        if (filter.sizeRange) {
          if (record.size < filter.sizeRange.min || record.size > filter.sizeRange.max) {
            return false;
          }
        }
        return true;
      });
    }

    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取性能分析
   */
  getPerformanceAnalysis(sessionId?: string): PerformanceAnalysis {
    let records: IORecord[];

    if (sessionId) {
      const trackingData = this.trackingData.get(sessionId);
      records = trackingData?.ioRecords || [];
    } else {
      records = this.globalIORecords.slice(-1000); // 最近1000条记录
    }

    if (records.length === 0) {
      return {
        totalProcessingTime: 0,
        averageStepTime: 0,
        throughput: 0,
        networkLatency: { total: 0, average: 0 }
      };
    }

    const totalProcessingTime = records.reduce((sum, record) => sum + record.processingTime, 0);
    const averageStepTime = totalProcessingTime / records.length;

    // 找出瓶颈步骤
    const stepTimes = new Map<string, { total: number; count: number }>();
    records.forEach(record => {
      const stepKey = `${record.moduleId}.${record.step}`;
      const current = stepTimes.get(stepKey) || { total: 0, count: 0 };
      stepTimes.set(stepKey, {
        total: current.total + record.processingTime,
        count: current.count + 1
      });
    });

    let bottleneckStep: string | undefined;
    let maxAverageTime = 0;

    stepTimes.forEach((time, step) => {
      const averageTime = time.total / time.count;
      if (averageTime > maxAverageTime) {
        maxAverageTime = averageTime;
        bottleneckStep = step;
      }
    });

    // 计算吞吐量
    const timeSpan = (records[records.length - 1].timestamp - records[0].timestamp) / 1000; // 秒
    const throughput = timeSpan > 0 ? records.length / timeSpan : 0;

    // 计算网络延迟
    const networkRecords = records.filter(r => r.type === 'request' || r.type === 'response');
    const totalNetworkLatency = networkRecords.reduce((sum, r) => sum + r.processingTime, 0);
    const averageNetworkLatency = networkRecords.length > 0 ? totalNetworkLatency / networkRecords.length : 0;

    return {
      totalProcessingTime,
      averageStepTime,
      bottleneckStep,
      throughput,
      networkLatency: {
        total: totalNetworkLatency,
        average: averageNetworkLatency
      }
    };
  }

  /**
   * 生成调试报告
   */
  generateDebugReport(sessionId?: string): any {
    const report: any = {
      timestamp: Date.now(),
      summary: {
        totalSessions: this.trackingData.size,
        totalRecords: this.globalIORecords.length,
        activeSessions: Array.from(this.trackingData.values()).filter(d =>
          Date.now() - d.startTime < 3600000 // 1小时内的会话
        ).length
      }
    };

    if (sessionId) {
      const sessionData = this.getSessionData(sessionId);
      if (sessionData) {
        report.session = {
          sessionId,
          requestId: sessionData.requestId,
          startTime: sessionData.startTime,
          duration: Date.now() - sessionData.startTime,
          recordCount: sessionData.ioRecords.length,
          performanceAnalysis: this.getPerformanceAnalysis(sessionId),
          debugData: Object.fromEntries(sessionData.debugData)
        };
      }
    } else {
      report.global = {
        performanceAnalysis: this.getPerformanceAnalysis(),
        recentErrors: this.globalIORecords
          .filter(r => r.type === 'error')
          .slice(-10),
        topSlowSteps: this.getTopSlowSteps()
      };
    }

    return report;
  }

  /**
   * 获取最慢的步骤
   */
  private getTopSlowSteps(limit: number = 10): Array<{ step: string; averageTime: number; count: number }> {
    const stepStats = new Map<string, { totalTime: number; count: number }>();

    this.globalIORecords.forEach(record => {
      const stepKey = `${record.moduleId}.${record.step}`;
      const current = stepStats.get(stepKey) || { totalTime: 0, count: 0 };
      stepStats.set(stepKey, {
        totalTime: current.totalTime + record.processingTime,
        count: current.count + 1
      });
    });

    return Array.from(stepStats.entries())
      .map(([step, stats]) => ({
        step,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  /**
   * 创建初始性能指标
   */
  private createInitialMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      lastRequestTime: 0,
      providerStats: {},
      moduleStats: {}
    };
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(record: IORecord): void {
    // 更新模块统计
    const moduleId = record.moduleId;
    const trackingData = Array.from(this.trackingData.values()).find(d =>
      d.ioRecords.some(r => r.id === record.id)
    );

    if (trackingData) {
      const moduleStats = trackingData.performanceMetrics.moduleStats[moduleId] || {
        calls: 0,
        averageProcessingTime: 0,
        errors: 0
      };

      moduleStats.calls++;
      moduleStats.averageProcessingTime =
        (moduleStats.averageProcessingTime * (moduleStats.calls - 1) + record.processingTime) / moduleStats.calls;

      if (record.type === 'error') {
        moduleStats.errors++;
      }

      trackingData.performanceMetrics.moduleStats[moduleId] = moduleStats;
    }
  }

  /**
   * 清理旧记录
   */
  private cleanupOldRecords(): void {
    const oneHourAgo = Date.now() - 3600000;

    // 清理全局记录
    this.globalIORecords = this.globalIORecords.filter(record =>
      record.timestamp > oneHourAgo
    );

    // 清理会话数据
    for (const [sessionId, data] of this.trackingData) {
      if (data.startTime < oneHourAgo) {
        this.trackingData.delete(sessionId);
      }
    }
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string): void {
    const trackingData = this.trackingData.get(sessionId);
    if (trackingData) {
      // 记录会话结束
      this.recordIO({
        sessionId,
        requestId: trackingData.requestId,
        moduleId: 'system',
        step: 'session_end',
        data: {
          sessionEnd: true,
          duration: Date.now() - trackingData.startTime,
          totalRecords: trackingData.ioRecords.length
        },
        size: 0,
        processingTime: 0,
        type: 'transformation' as const
      });

      // 保留会话数据一段时间用于分析
      setTimeout(() => {
        this.trackingData.delete(sessionId);
      }, 3600000); // 1小时后删除
    }
  }

  /**
   * 销毁跟踪器
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.trackingData.clear();
    this.globalIORecords = [];
  }
}