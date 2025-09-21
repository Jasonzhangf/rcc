/**
 * Monitoring Integration for RCC Pipeline
 * RCC流水线监控集成
 *
 * Integrates error monitoring, automated recovery, and health check systems
 * into a unified monitoring and management platform.
 */

import {
  ErrorHandlingCenter,
  ErrorContext,
  ErrorSeverity,
  ErrorCategory
} from 'rcc-errorhandling';

import { v4 as uuidv4 } from 'uuid';

import { ErrorMonitor, IErrorMonitor, MonitoringConfig } from './ErrorMonitor';
import { AutomatedRecoverySystem, AdaptiveRecoveryConfig } from './AutomatedRecoverySystem';
import { HealthCheckSystem, HealthCheckConfig } from './HealthCheckSystem';

import { StrategyManager } from '../strategies/StrategyManager';
import { IModularPipelineExecutor } from '../../interfaces/ModularInterfaces';
import { PipelineExecutionContext } from '../core/PipelineExecutionContext';

/**
 * Monitoring integration configuration
 * 监控集成配置
 */
interface MonitoringIntegrationConfig {
  errorMonitoring: MonitoringConfig;
  automatedRecovery: AdaptiveRecoveryConfig;
  healthCheck: HealthCheckConfig;
  unifiedDashboard: {
    enabled: boolean;
    port: number;
    updateInterval: number;
    retentionPeriod: number;
  };
  export: {
    enabled: boolean;
    formats: ('json' | 'csv' | 'prometheus')[];
    endpoints: string[];
  };
  notifications: {
    enabled: boolean;
    channels: ('webhook' | 'email' | 'slack')[];
    severityFilter: ErrorSeverity[];
  };
}

/**
 * Unified monitoring dashboard data
 * 统一监控仪表板数据
 */
interface UnifiedDashboardData {
  systemOverview: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    score: number;
    uptime: number;
    lastUpdated: number;
  };
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    recoveryRate: number;
    averageHandlingTime: number;
    topErrorTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  healthStatus: {
    providers: Array<{
      id: string;
      name: string;
      status: string;
      score: number;
    }>;
    modules: Array<{
      id: string;
      name: string;
      status: string;
      score: number;
    }>;
  };
  recovery: {
    activeSessions: number;
    totalSessions: number;
    successRate: number;
    averageRecoveryTime: number;
    topStrategies: Array<{
      strategy: string;
      effectiveness: number;
      usage: number;
    }>;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: ErrorSeverity;
    message: string;
    timestamp: number;
    resolved: boolean;
  }>;
  trends: {
    errorRate: Array<{ time: number; value: number }>;
    healthScore: Array<{ time: number; value: number }>;
    recoveryRate: Array<{ time: number; value: number }>;
  };
}

/**
 * Monitoring Integration Implementation
 * 监控集成实现
 */
export class MonitoringIntegration {
  private errorHandlingCenter: ErrorHandlingCenter;
  private strategyManager?: StrategyManager;
  private pipelineExecutor?: IModularPipelineExecutor;
  private config: MonitoringIntegrationConfig;

  // Core monitoring components
  private errorMonitor: IErrorMonitor;
  private automatedRecovery: AutomatedRecoverySystem;
  private healthCheckSystem: HealthCheckSystem;

  // Integration state
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private dashboardUpdateInterval?: NodeJS.Timeout;

  // Dashboard data cache
  private dashboardData: UnifiedDashboardData;
  private lastDashboardUpdate: number = 0;

  // Event handlers
  private eventHandlers: {
    onErrorRecorded?: (event: any) => void;
    onHealthStatusChanged?: (status: any) => void;
    onAlertTriggered?: (alert: any) => void;
    onRecoveryActionExecuted?: (action: any, result: any) => void;
    onDashboardUpdated?: (data: UnifiedDashboardData) => void;
  };

  constructor(
    errorHandlingCenter: ErrorHandlingCenter,
    strategyManager?: StrategyManager,
    pipelineExecutor?: IModularPipelineExecutor,
    config: MonitoringIntegrationConfig,
    eventHandlers: typeof MonitoringIntegration.prototype.eventHandlers = {}
  ) {
    this.errorHandlingCenter = errorHandlingCenter;
    this.strategyManager = strategyManager;
    this.pipelineExecutor = pipelineExecutor;
    this.config = config;
    this.eventHandlers = eventHandlers;

    // Initialize monitoring components
    this.errorMonitor = new ErrorMonitor(
      errorHandlingCenter,
      strategyManager,
      {
        onErrorRecorded: this.handleErrorRecorded.bind(this),
        onHealthStatusChanged: this.handleHealthStatusChanged.bind(this),
        onAlertTriggered: this.handleAlertTriggered.bind(this),
        onRecoveryActionExecuted: this.handleRecoveryActionExecuted.bind(this),
        onMetricsUpdated: this.handleMetricsUpdated.bind(this)
      }
    );

    this.automatedRecovery = new AutomatedRecoverySystem(
      errorHandlingCenter,
      strategyManager,
      config.automatedRecovery
    );

    this.healthCheckSystem = new HealthCheckSystem(
      errorHandlingCenter,
      pipelineExecutor,
      config.healthCheck
    );

    // Initialize dashboard data
    this.initializeDashboardData();
  }

  /**
   * Initialize dashboard data
   * 初始化仪表板数据
   */
  private initializeDashboardData(): void {
    this.dashboardData = {
      systemOverview: {
        status: 'healthy',
        score: 100,
        uptime: Date.now(),
        lastUpdated: Date.now()
      },
      errorMetrics: {
        totalErrors: 0,
        errorRate: 0,
        recoveryRate: 0,
        averageHandlingTime: 0,
        topErrorTypes: []
      },
      healthStatus: {
        providers: [],
        modules: []
      },
      recovery: {
        activeSessions: 0,
        totalSessions: 0,
        successRate: 0,
        averageRecoveryTime: 0,
        topStrategies: []
      },
      alerts: [],
      trends: {
        errorRate: [],
        healthScore: [],
        recoveryRate: []
      }
    };
  }

  /**
   * Initialize the monitoring integration
   * 初始化监控集成
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logWarn('Monitoring integration is already initialized');
      return;
    }

    try {
      // Initialize error monitoring
      await this.errorMonitor.initialize(this.config.errorMonitoring);

      // Initialize automated recovery
      await this.automatedRecovery.start();

      // Initialize health check system
      await this.healthCheckSystem.start();

      // Setup dashboard updates
      if (this.config.unifiedDashboard.enabled) {
        this.startDashboardUpdates();
      }

      this.isInitialized = true;
      this.logInfo('Monitoring integration initialized successfully');

    } catch (error) {
      this.logError('Failed to initialize monitoring integration', { error });
      throw error;
    }
  }

  /**
   * Start monitoring integration
   * 启动监控集成
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Monitoring integration must be initialized first');
    }

    if (this.isRunning) {
      this.logWarn('Monitoring integration is already running');
      return;
    }

    try {
      // Start error monitoring
      await this.errorMonitor.startMonitoring();

      // Automated recovery is already started during initialization

      // Health check system is already started during initialization

      this.isRunning = true;
      this.logInfo('Monitoring integration started successfully');

      // Perform initial dashboard update
      await this.updateDashboard();

    } catch (error) {
      this.logError('Failed to start monitoring integration', { error });
      throw error;
    }
  }

  /**
   * Stop monitoring integration
   * 停止监控集成
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop error monitoring
      await this.errorMonitor.stopMonitoring();

      // Stop automated recovery
      await this.automatedRecovery.stop();

      // Stop health check system
      await this.healthCheckSystem.stop();

      // Stop dashboard updates
      if (this.dashboardUpdateInterval) {
        clearInterval(this.dashboardUpdateInterval);
        this.dashboardUpdateInterval = undefined;
      }

      this.isRunning = false;
      this.logInfo('Monitoring integration stopped successfully');

    } catch (error) {
      this.logError('Failed to stop monitoring integration', { error });
      throw error;
    }
  }

  /**
   * Start dashboard updates
   * 启动仪表板更新
   */
  private startDashboardUpdates(): void {
    this.dashboardUpdateInterval = setInterval(async () => {
      try {
        await this.updateDashboard();
      } catch (error) {
        this.logError('Dashboard update failed', { error });
      }
    }, this.config.unifiedDashboard.updateInterval);

    this.logInfo('Dashboard updates started', {
      interval: this.config.unifiedDashboard.updateInterval
    });
  }

  /**
   * Update dashboard data
   * 更新仪表板数据
   */
  private async updateDashboard(): Promise<void> {
    const startTime = Date.now();

    try {
      // Get error metrics
      const errorMetrics = this.errorMonitor.getSystemMetrics();

      // Get health status
      const healthStatus = this.healthCheckSystem.getSystemHealthSummary();

      // Get recovery status
      const recoveryStatus = this.automatedRecovery.getStatus();

      // Get active alerts
      const alerts = [
        ...this.errorMonitor.getAlerts(),
        ...this.healthCheckSystem.getActiveAlerts()
      ];

      // Update dashboard data
      this.dashboardData.systemOverview = {
        status: healthStatus.overallStatus,
        score: healthStatus.overallScore,
        uptime: this.dashboardData.systemOverview.uptime,
        lastUpdated: Date.now()
      };

      this.dashboardData.errorMetrics = {
        totalErrors: errorMetrics.totalErrors,
        errorRate: this.calculateErrorRate(errorMetrics),
        recoveryRate: errorMetrics.overallRecoveryRate,
        averageHandlingTime: errorMetrics.averageHandlingTime,
        topErrorTypes: this.getTopErrorTypes(errorMetrics)
      };

      this.dashboardData.healthStatus = {
        providers: this.getProviderHealthStatus(),
        modules: this.getModuleHealthStatus()
      };

      this.dashboardData.recovery = {
        activeSessions: recoveryStatus.sessions.active,
        totalSessions: recoveryStatus.sessions.history,
        successRate: recoveryStatus.sessions.recentSuccessRate,
        averageRecoveryTime: this.calculateAverageRecoveryTime(),
        topStrategies: this.getTopRecoveryStrategies()
      };

      this.dashboardData.alerts = alerts.slice(-10).map(alert => ({
        id: alert.alertId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        resolved: alert.resolved
      }));

      // Update trends
      this.updateTrends();

      this.lastDashboardUpdate = Date.now();

      // Trigger dashboard updated event
      if (this.eventHandlers.onDashboardUpdated) {
        this.eventHandlers.onDashboardUpdated(this.dashboardData);
      }

      this.logInfo('Dashboard updated', {
        executionTime: Date.now() - startTime,
        totalErrors: errorMetrics.totalErrors,
        healthScore: healthStatus.overallScore
      });

    } catch (error) {
      this.logError('Dashboard update failed', { error });
    }
  }

  /**
   * Calculate error rate
   * 计算错误率
   */
  private calculateErrorRate(metrics: any): number {
    // Calculate errors per minute based on recent data
    const now = Date.now();
    const recentErrors = Object.values(metrics.errorsByTime as Record<string, number>)
      .filter((_, index, array) => {
        const timeKey = Object.keys(metrics.errorsByTime)[index];
        const time = new Date(timeKey).getTime();
        return now - time < 300000; // Last 5 minutes
      });

    return recentErrors.reduce((sum, count) => sum + count, 0) / 5; // errors per minute
  }

  /**
   * Get top error types
   * 获取主要错误类型
   */
  private getTopErrorTypes(metrics: any): Array<{
    type: string;
    count: number;
    percentage: number;
  }> {
    const errorTypes = metrics.errorsByType as Record<string, number>;
    const total = Object.values(errorTypes).reduce((sum, count) => sum + count, 0);

    return Object.entries(errorTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
  }

  /**
   * Get provider health status
   * 获取提供商健康状态
   */
  private getProviderHealthStatus(): Array<{
    id: string;
    name: string;
    status: string;
    score: number;
  }> {
    const healthStatus = this.healthCheckSystem.getCurrentHealth();
    const providerStatus: Array<{
      id: string;
      name: string;
      status: string;
      score: number;
    }> = [];

    for (const [target, status] of healthStatus) {
      if (target.includes('provider') || this.config.healthCheck.providers.includes(target)) {
        providerStatus.push({
          id: target,
          name: target,
          status: status.status,
          score: status.score
        });
      }
    }

    return providerStatus;
  }

  /**
   * Get module health status
   * 获取模块健康状态
   */
  private getModuleHealthStatus(): Array<{
    id: string;
    name: string;
    status: string;
    score: number;
  }> {
    const healthStatus = this.healthCheckSystem.getCurrentHealth();
    const moduleStatus: Array<{
      id: string;
      name: string;
      status: string;
      score: number;
    }> = [];

    for (const [target, status] of healthStatus) {
      if (target.includes('module') || this.config.healthCheck.modules.includes(target)) {
        moduleStatus.push({
          id: target,
          name: target,
          status: status.status,
          score: status.score
        });
      }
    }

    return moduleStatus;
  }

  /**
   * Calculate average recovery time
   * 计算平均恢复时间
   */
  private calculateAverageRecoveryTime(): number {
    // This would integrate with the automated recovery system
    return 5000; // Mock: 5 seconds average recovery time
  }

  /**
   * Get top recovery strategies
   * 获取主要恢复策略
   */
  private getTopRecoveryStrategies(): Array<{
    strategy: string;
    effectiveness: number;
    usage: number;
  }> {
    const report = this.automatedRecovery.getDetailedReport();

    return report.strategies
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5)
      .map(strategy => ({
        strategy: strategy.strategyName,
        effectiveness: strategy.effectiveness,
        usage: strategy.totalExecutions
      }));
  }

  /**
   * Update trends
   * 更新趋势
   */
  private updateTrends(): void {
    const now = Date.now();

    // Add current data points to trends
    this.dashboardData.trends.errorRate.push({
      time: now,
      value: this.dashboardData.errorMetrics.errorRate
    });

    this.dashboardData.trends.healthScore.push({
      time: now,
      value: this.dashboardData.systemOverview.score
    });

    this.dashboardData.trends.recoveryRate.push({
      time: now,
      value: this.dashboardData.recovery.successRate
    });

    // Limit trend data points
    const maxTrendPoints = 50;
    ['errorRate', 'healthScore', 'recoveryRate'].forEach(trend => {
      if (this.dashboardData.trends[trend as keyof typeof this.dashboardData.trends].length > maxTrendPoints) {
        this.dashboardData.trends[trend as keyof typeof this.dashboardData.trends] =
          this.dashboardData.trends[trend as keyof typeof this.dashboardData.trends].slice(-maxTrendPoints);
      }
    });
  }

  /**
   * Handle error recorded event
   * 处理错误记录事件
   */
  private async handleErrorRecorded(event: any): Promise<void> {
    this.logInfo('Error recorded by monitoring system', {
      errorId: event.errorId,
      errorType: event.errorType,
      moduleId: event.moduleId
    });

    // Check if automated recovery should be triggered
    if (this.config.automatedRecovery.enabled && event.recoveryAttempted === false) {
      await this.triggerAutomatedRecovery(event);
    }

    // Trigger external event handler
    if (this.eventHandlers.onErrorRecorded) {
      this.eventHandlers.onErrorRecorded(event);
    }
  }

  /**
   * Handle health status changed event
   * 处理健康状态变更事件
   */
  private handleHealthStatusChanged(status: any): void {
    this.logInfo('Health status changed', {
      status: status.status,
      score: status.score,
      timestamp: status.timestamp
    });

    // Update dashboard immediately on significant health changes
    if (status.status === 'unhealthy' || status.score < 50) {
      this.updateDashboard().catch(error => {
        this.logError('Failed to update dashboard on health status change', { error });
      });
    }

    // Trigger external event handler
    if (this.eventHandlers.onHealthStatusChanged) {
      this.eventHandlers.onHealthStatusChanged(status);
    }
  }

  /**
   * Handle alert triggered event
   * 处理警报触发事件
   */
  private handleAlertTriggered(alert: any): void {
    this.logError('Alert triggered by monitoring system', {
      alertId: alert.alertId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });

    // Send notifications if configured
    if (this.config.notifications.enabled) {
      this.sendNotification(alert);
    }

    // Trigger external event handler
    if (this.eventHandlers.onAlertTriggered) {
      this.eventHandlers.onAlertTriggered(alert);
    }
  }

  /**
   * Handle recovery action executed event
   * 处理恢复操作执行事件
   */
  private handleRecoveryActionExecuted(action: any, result: any): void {
    this.logInfo('Recovery action executed', {
      actionId: action.actionId,
      type: action.type,
      success: result.success,
      executionTime: result.executionTime
    });

    // Trigger external event handler
    if (this.eventHandlers.onRecoveryActionExecuted) {
      this.eventHandlers.onRecoveryActionExecuted(action, result);
    }
  }

  /**
   * Handle metrics updated event
   * 处理指标更新事件
   */
  private handleMetricsUpdated(metrics: any): void {
    // Update dashboard data periodically
    if (Date.now() - this.lastDashboardUpdate > this.config.unifiedDashboard.updateInterval) {
      this.updateDashboard().catch(error => {
        this.logError('Failed to update dashboard on metrics update', { error });
      });
    }
  }

  /**
   * Trigger automated recovery for error event
   * 为错误事件触发自动恢复
   */
  private async triggerAutomatedRecovery(errorEvent: any): Promise<void> {
    try {
      // Create strategy context
      const context = {
        operationId: uuidv4(),
        moduleId: errorEvent.moduleId,
        pipelineContext: errorEvent.context || {},
        startTime: Date.now(),
        attempt: 1,
        maxAttempts: 3,
        strategyData: {}
      };

      // Execute automated recovery
      const recoveryResult = await this.automatedRecovery.handleErrorWithRecovery(errorEvent, context);

      this.logInfo('Automated recovery executed', {
        errorId: errorEvent.errorId,
        recovered: recoveryResult.recovered,
        executionTime: recoveryResult.executionTime,
        actionsCount: recoveryResult.actions.length
      });

      // Update error event with recovery information
      if (recoveryResult.recovered) {
        // This would update the original error event with recovery details
        this.logInfo('Error successfully recovered', {
          errorId: errorEvent.errorId,
          sessionId: recoveryResult.sessionId,
          finalResult: recoveryResult.finalResult
        });
      }

    } catch (error) {
      this.logError('Automated recovery failed', {
        errorId: errorEvent.errorId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send notification for alert
   * 发送警报通知
   */
  private sendNotification(alert: any): void {
    if (!this.config.notifications.enabled) return;

    const severityFilter = this.config.notifications.severityFilter;
    if (!severityFilter.includes(alert.severity)) return;

    this.logInfo('Sending notification for alert', {
      alertId: alert.alertId,
      type: alert.type,
      severity: alert.severity,
      channels: this.config.notifications.channels
    });

    // This would integrate with external notification systems
    // For now, just log the notification attempt
  }

  // Public API methods
  /**
   * Get current dashboard data
   * 获取当前仪表板数据
   */
  getDashboardData(): UnifiedDashboardData {
    return { ...this.dashboardData };
  }

  /**
   * Get comprehensive monitoring report
   * 获取综合监控报告
   */
  getComprehensiveReport(timeRange?: {
    startTime: number;
    endTime: number;
  }): {
    systemOverview: any;
    errorMetrics: any;
    healthStatus: any;
    recoveryStatus: any;
    alerts: any[];
    trends: any;
    recommendations: string[];
    generatedAt: number;
  } {
    const now = Date.now();
    const defaultTimeRange = {
      startTime: now - 86400000, // Last 24 hours
      endTime: now
    };

    const reportTimeRange = timeRange || defaultTimeRange;

    return {
      systemOverview: this.healthCheckSystem.getSystemHealthSummary(),
      errorMetrics: this.errorMonitor.getSystemMetrics(),
      healthStatus: this.healthCheckSystem.getCurrentHealth(),
      recoveryStatus: this.automatedRecovery.getDetailedReport(),
      alerts: [
        ...this.errorMonitor.getAlerts(),
        ...this.healthCheckSystem.getActiveAlerts()
      ].filter(alert =>
        alert.timestamp >= reportTimeRange.startTime &&
        alert.timestamp <= reportTimeRange.endTime
      ),
      trends: this.healthCheckSystem.getHealthTrends(),
      recommendations: this.generateSystemRecommendations(),
      generatedAt: now
    };
  }

  /**
   * Generate system recommendations
   * 生成系统建议
   */
  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];

    // Error-based recommendations
    const errorMetrics = this.errorMonitor.getSystemMetrics();
    if (errorMetrics.totalErrors > 100) {
      recommendations.push('High error volume detected. Review error patterns and implement preventive measures.');
    }

    if (errorMetrics.overallRecoveryRate < 0.7) {
      recommendations.push('Low recovery rate detected. Tune recovery strategies and add more fallback options.');
    }

    // Health-based recommendations
    const healthSummary = this.healthCheckSystem.getSystemHealthSummary();
    if (healthSummary.overallScore < 70) {
      recommendations.push('System health is degraded. Perform comprehensive system maintenance.');
    }

    if (healthSummary.components.unhealthy > 0) {
      recommendations.push(`${healthSummary.components.unhealthy} components are unhealthy. Prioritize their recovery.`);
    }

    // Recovery-based recommendations
    const recoveryStatus = this.automatedRecovery.getStatus();
    if (recoveryStatus.sessions.recentSuccessRate < 0.6) {
      recommendations.push('Recovery success rate is low. Review and optimize recovery strategies.');
    }

    return recommendations;
  }

  /**
   * Export monitoring data
   * 导出监控数据
   */
  exportData(format: 'json' | 'csv' | 'prometheus'): string {
    switch (format) {
      case 'json':
        return JSON.stringify({
          dashboard: this.dashboardData,
          timestamp: Date.now(),
          version: '1.0.0'
        }, null, 2);

      case 'csv':
        return this.exportAsCsv();

      case 'prometheus':
        return this.exportAsPrometheus();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as CSV
   * 导出为CSV格式
   */
  private exportAsCsv(): string {
    const lines = [
      'Metric,Value,Timestamp',
      `total_errors,${this.dashboardData.errorMetrics.totalErrors},${Date.now()}`,
      `error_rate,${this.dashboardData.errorMetrics.errorRate},${Date.now()}`,
      `recovery_rate,${this.dashboardData.errorMetrics.recoveryRate},${Date.now()}`,
      `health_score,${this.dashboardData.systemOverview.score},${Date.now()}`,
      `active_alerts,${this.dashboardData.alerts.filter(a => !a.resolved).length},${Date.now()}`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Export as Prometheus format
   * 导出为Prometheus格式
   */
  private exportAsPrometheus(): string {
    const lines = [
      '# HELP rcc_monitoring_total_errors Total number of errors',
      '# TYPE rcc_monitoring_total_errors counter',
      `rcc_monitoring_total_errors ${this.dashboardData.errorMetrics.totalErrors}`,
      '',
      '# HELP rcc_monitoring_error_rate Current error rate per minute',
      '# TYPE rcc_monitoring_error_rate gauge',
      `rcc_monitoring_error_rate ${this.dashboardData.errorMetrics.errorRate}`,
      '',
      '# HELP rcc_monitoring_recovery_rate Overall recovery rate',
      '# TYPE rcc_monitoring_recovery_rate gauge',
      `rcc_monitoring_recovery_rate ${this.dashboardData.errorMetrics.recoveryRate}`,
      '',
      '# HELP rcc_monitoring_health_score System health score (0-100)',
      '# TYPE rcc_monitoring_health_score gauge',
      `rcc_monitoring_health_score ${this.dashboardData.systemOverview.score}`,
      '',
      '# HELP rcc_monitoring_active_alerts Number of active alerts',
      '# TYPE rcc_monitoring_active_alerts gauge',
      `rcc_monitoring_active_alerts ${this.dashboardData.alerts.filter(a => !a.resolved).length}`
    ];

    return lines.join('\n');
  }

  /**
   * Force health check
   * 强制健康检查
   */
  async forceHealthCheck(): Promise<any> {
    return await this.healthCheckSystem.forceHealthCheck();
  }

  /**
   * Record custom error event
   * 记录自定义错误事件
   */
  async recordError(event: any): Promise<void> {
    return await this.errorMonitor.recordError(event);
  }

  /**
   * Get monitoring system status
   * 获取监控系统状态
   */
  getSystemStatus(): {
    initialized: boolean;
    running: boolean;
    components: {
      errorMonitor: boolean;
      automatedRecovery: boolean;
      healthCheck: boolean;
      dashboard: boolean;
    };
    uptime: number;
    lastUpdate: number;
  } {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      components: {
        errorMonitor: this.errorMonitor !== undefined,
        automatedRecovery: this.automatedRecovery !== undefined,
        healthCheck: this.healthCheckSystem !== undefined,
        dashboard: this.config.unifiedDashboard.enabled
      },
      uptime: this.dashboardData.systemOverview.uptime,
      lastUpdate: this.lastDashboardUpdate
    };
  }

  /**
   * Destroy monitoring integration
   * 销毁监控集成
   */
  async destroy(): Promise<void> {
    await this.stop();

    if (this.errorMonitor) {
      await this.errorMonitor.destroy();
    }

    if (this.automatedRecovery) {
      await this.automatedRecovery.stop();
    }

    if (this.healthCheckSystem) {
      await this.healthCheckSystem.stop();
    }

    this.logInfo('Monitoring integration destroyed');
  }

  /**
   * Log helper methods
   */
  private logInfo(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'monitoring-integration',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_info', data }
    });
  }

  private logWarn(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'monitoring-integration',
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_warn', data }
    });
  }

  private logError(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'monitoring-integration',
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_error', data }
    });
  }
}