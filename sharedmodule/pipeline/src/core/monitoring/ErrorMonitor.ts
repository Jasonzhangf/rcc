/**
 * Error Monitoring and Metrics Collector Implementation
 * 错误监控和指标收集器实现
 *
 * Provides comprehensive error tracking, real-time monitoring,
 * and automated recovery capabilities for the RCC pipeline system.
 */

import {
  ErrorHandlingCenter,
  ErrorContext,
  ErrorSeverity,
  ErrorCategory
} from 'rcc-errorhandling';

import { v4 as uuidv4 } from 'uuid';

import {
  IErrorMonitor,
  ErrorEvent,
  SystemErrorMetrics,
  ProviderErrorMetrics,
  ModuleErrorMetrics,
  MonitoringConfig,
  HealthStatus,
  Alert,
  RecoveryPattern,
  RecoveryAction,
  StrategyContext,
  MonitoringEventHandlers
} from './ErrorMonitoringInterfaces';

import { StrategyManager } from '../strategies/StrategyManager';
import { IErrorHandlingStrategy } from '../strategies/StrategyInterfaces';

/**
 * Error Monitor Implementation
 * 错误监控器实现
 */
export class ErrorMonitor implements IErrorMonitor {
  private config: MonitoringConfig;
  private errorHandlingCenter: ErrorHandlingCenter;
  private strategyManager?: StrategyManager;
  private eventHandlers: MonitoringEventHandlers;

  // Data storage
  private errorEvents: Map<string, ErrorEvent> = new Map();
  private systemMetrics: SystemErrorMetrics;
  private providerMetrics: Map<string, ProviderErrorMetrics> = new Map();
  private moduleMetrics: Map<string, ModuleErrorMetrics> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private recoveryPatterns: Map<string, RecoveryPattern> = new Map();

  // Monitoring state
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  // Performance tracking
  private metricsUpdateTimestamp: number = 0;
  private lastHealthCheck: number = 0;

  constructor(
    errorHandlingCenter: ErrorHandlingCenter,
    strategyManager?: StrategyManager,
    eventHandlers: MonitoringEventHandlers = {}
  ) {
    this.errorHandlingCenter = errorHandlingCenter;
    this.strategyManager = strategyManager;
    this.eventHandlers = eventHandlers;

    this.initializeSystemMetrics();
    this.initializeDefaultRecoveryPatterns();
  }

  /**
   * Initialize system metrics
   * 初始化系统指标
   */
  private initializeSystemMetrics(): void {
    this.systemMetrics = {
      totalErrors: 0,
      errorsByTime: {},
      errorsByType: {},
      errorsByCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.AUTHENTICATION]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.PROVIDER]: 0,
        [ErrorCategory.SYSTEM]: 0
      },
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      overallRecoveryRate: 0,
      averageHandlingTime: 0,
      systemHealthScore: 100,
      providerMetrics: {},
      moduleMetrics: {},
      lastUpdated: Date.now()
    };
  }

  /**
   * Initialize default recovery patterns
   * 初始化默认恢复模式
   */
  private initializeDefaultRecoveryPatterns(): void {
    const defaultPatterns: RecoveryPattern[] = [
      {
        patternId: 'network-timeout',
        errorType: 'TimeoutError',
        errorPattern: /timeout|network.*error|connection.*failed/i,
        successRate: 0.8,
        recommendedStrategy: 'retry',
        strategyParameters: { maxRetries: 3, backoffMultiplier: 2 },
        confidence: 0.9,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'auth-failure',
        errorType: 'AuthenticationError',
        errorPattern: /unauthorized|authentication.*failed|invalid.*token/i,
        successRate: 0.7,
        recommendedStrategy: 'fallback',
        strategyParameters: { action: 'token_refresh' },
        confidence: 0.85,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'provider-overload',
        errorType: 'ProviderError',
        errorPattern: /rate.*limit|too.*many.*requests|server.*overload/i,
        successRate: 0.6,
        recommendedStrategy: 'circuit_breaker',
        strategyParameters: { failureThreshold: 5, recoveryTimeout: 60000 },
        confidence: 0.8,
        lastUsed: 0,
        usageCount: 0
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.recoveryPatterns.set(pattern.patternId, pattern);
    });
  }

  /**
   * Initialize the error monitor
   * 初始化错误监控器
   */
  async initialize(config: MonitoringConfig): Promise<void> {
    this.config = config;

    if (config.enabled) {
      await this.startMonitoring();
    }

    this.logInfo('Error monitor initialized', {
      enabled: config.enabled,
      collectionInterval: config.collectionInterval,
      retentionPeriod: config.retentionPeriod
    });
  }

  /**
   * Record an error event
   * 记录错误事件
   */
  async recordError(event: ErrorEvent): Promise<void> {
    const eventId = uuidv4();
    const errorEvent: ErrorEvent = {
      ...event,
      errorId: eventId,
      timestamp: Date.now()
    };

    // Store error event
    this.errorEvents.set(eventId, errorEvent);

    // Update system metrics
    this.updateSystemMetrics(errorEvent);

    // Update provider metrics if applicable
    if (event.moduleId.includes('provider') || event.context.providerId) {
      this.updateProviderMetrics(errorEvent);
    }

    // Update module metrics
    this.updateModuleMetrics(errorEvent);

    // Check for alert conditions
    this.checkAlertConditions(errorEvent);

    // Log the error event
    this.logErrorRecorded(errorEvent);

    // Trigger event handler
    if (this.eventHandlers.onErrorRecorded) {
      this.eventHandlers.onErrorRecorded(errorEvent);
    }

    // Cleanup old events
    this.cleanupOldEvents();
  }

  /**
   * Update system metrics with new error event
   * 使用新错误事件更新系统指标
   */
  private updateSystemMetrics(event: ErrorEvent): void {
    const now = Date.now();
    const hourBucket = new Date(now).toISOString().slice(0, 13); // YYYY-MM-DDTHH

    this.systemMetrics.totalErrors++;
    this.systemMetrics.lastUpdated = now;

    // Update time-based error count
    this.systemMetrics.errorsByTime[hourBucket] = (this.systemMetrics.errorsByTime[hourBucket] || 0) + 1;

    // Update error type distribution
    this.systemMetrics.errorsByType[event.errorType] = (this.systemMetrics.errorsByType[event.errorType] || 0) + 1;

    // Update error category
    this.systemMetrics.errorsByCategory[event.category] = (this.systemMetrics.errorsByCategory[event.category] || 0) + 1;

    // Update error severity
    this.systemMetrics.errorsBySeverity[event.severity] = (this.systemMetrics.errorsBySeverity[event.severity] || 0) + 1;

    // Update recovery statistics
    if (event.recoveryAttempted) {
      this.systemMetrics.totalRecoveryAttempts++;
      if (event.recoverySuccessful) {
        this.systemMetrics.successfulRecoveries++;
      } else {
        this.systemMetrics.failedRecoveries++;
      }
    }

    // Update recovery rate
    if (this.systemMetrics.totalRecoveryAttempts > 0) {
      this.systemMetrics.overallRecoveryRate =
        this.systemMetrics.successfulRecoveries / this.systemMetrics.totalRecoveryAttempts;
    }

    // Update average handling time
    if (event.handlingTime > 0) {
      this.systemMetrics.averageHandlingTime = this.calculateMovingAverage(
        this.systemMetrics.averageHandlingTime,
        event.handlingTime,
        this.systemMetrics.totalErrors
      );
    }

    // Update system health score
    this.updateSystemHealthScore();
  }

  /**
   * Update provider metrics
   * 更新提供商指标
   */
  private updateProviderMetrics(event: ErrorEvent): void {
    const providerId = event.context.providerId || event.moduleId;
    let metrics = this.providerMetrics.get(providerId);

    if (!metrics) {
      metrics = this.createProviderMetrics(providerId, event.moduleName);
      this.providerMetrics.set(providerId, metrics);
    }

    metrics.totalErrors++;
    metrics.lastErrorTime = event.timestamp;
    metrics.errorTypes[event.errorType] = (metrics.errorTypes[event.errorType] || 0) + 1;
    metrics.errorCategories[event.category] = (metrics.errorCategories[event.category] || 0) + 1;
    metrics.errorSeverities[event.severity] = (metrics.errorSeverities[event.severity] || 0) + 1;

    // Update recovery statistics
    if (event.recoveryAttempted) {
      metrics.recoveryRate = event.recoverySuccessful ?
        (metrics.recoveryRate * (metrics.totalErrors - 1) + 1) / metrics.totalErrors :
        (metrics.recoveryRate * (metrics.totalErrors - 1)) / metrics.totalErrors;
    }

    // Update average handling time
    if (event.handlingTime > 0) {
      metrics.averageHandlingTime = this.calculateMovingAverage(
        metrics.averageHandlingTime,
        event.handlingTime,
        metrics.totalErrors
      );
    }

    // Update consecutive errors counter
    if (event.timestamp - metrics.lastErrorTime < 60000) { // Within 1 minute
      metrics.consecutiveErrors++;
    } else {
      metrics.consecutiveErrors = 1;
    }

    // Update provider-specific metrics based on strategy
    if (event.strategyUsed === 'retry' && event.recoverySuccessful) {
      metrics.retrySuccessRate = (metrics.retrySuccessRate * (metrics.totalErrors - 1) + 1) / metrics.totalErrors;
    }

    if (event.strategyUsed === 'fallback') {
      metrics.fallbackUsageCount++;
    }

    this.systemMetrics.providerMetrics[providerId] = metrics;
  }

  /**
   * Update module metrics
   * 更新模块指标
   */
  private updateModuleMetrics(event: ErrorEvent): void {
    let metrics = this.moduleMetrics.get(event.moduleId);

    if (!metrics) {
      metrics = this.createModuleMetrics(event.moduleId, event.moduleName);
      this.moduleMetrics.set(event.moduleId, metrics);
    }

    metrics.totalErrors++;
    metrics.lastErrorTimestamp = event.timestamp;
    metrics.errorDistribution[event.errorType] = (metrics.errorDistribution[event.errorType] || 0) + 1;

    // Calculate error rate (errors per minute based on time since module start)
    const timeSinceStart = event.timestamp - (metrics.lastErrorTimestamp - 60000); // Approximate
    metrics.errorRate = timeSinceStart > 0 ? (metrics.totalErrors / (timeSinceStart / 60000)) : 0;

    // Update recovery success rate
    if (event.recoveryAttempted) {
      metrics.recoverySuccessRate = event.recoverySuccessful ?
        (metrics.recoverySuccessRate * (metrics.totalErrors - 1) + 1) / metrics.totalErrors :
        (metrics.recoverySuccessRate * (metrics.totalErrors - 1)) / metrics.totalErrors;
    }

    // Update strategy effectiveness
    if (event.strategyUsed) {
      metrics.strategyEffectiveness[event.strategyUsed] = event.recoverySuccessful ?
        (metrics.strategyEffectiveness[event.strategyUsed] || 0) + 1 :
        (metrics.strategyEffectiveness[event.strategyUsed] || 0);
    }

    // Update consecutive failures
    if (event.timestamp - metrics.lastErrorTimestamp < 30000) { // Within 30 seconds
      metrics.consecutiveFailures++;
    } else {
      metrics.consecutiveFailures = 1;
    }

    // Update health status
    metrics.healthStatus = this.calculateModuleHealthStatus(metrics);

    this.systemMetrics.moduleMetrics[event.moduleId] = metrics;
  }

  /**
   * Create provider metrics
   * 创建提供商指标
   */
  private createProviderMetrics(providerId: string, providerName: string): ProviderErrorMetrics {
    return {
      providerId,
      providerName,
      totalErrors: 0,
      errorTypes: {},
      errorCategories: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.AUTHENTICATION]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.PROVIDER]: 0,
        [ErrorCategory.SYSTEM]: 0
      },
      errorSeverities: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      recoveryRate: 0,
      averageHandlingTime: 0,
      lastErrorTime: 0,
      consecutiveErrors: 0,
      circuitBreakerTrips: 0,
      retrySuccessRate: 0,
      fallbackUsageCount: 0
    };
  }

  /**
   * Create module metrics
   * 创建模块指标
   */
  private createModuleMetrics(moduleId: string, moduleName: string): ModuleErrorMetrics {
    return {
      moduleId,
      moduleName,
      totalErrors: 0,
      errorRate: 0,
      averageProcessingTime: 0,
      errorDistribution: {},
      recoverySuccessRate: 0,
      lastErrorTimestamp: 0,
      healthStatus: 'healthy',
      consecutiveFailures: 0,
      strategyEffectiveness: {}
    };
  }

  /**
   * Calculate moving average
   * 计算移动平均
   */
  private calculateMovingAverage(current: number, newValue: number, count: number): number {
    if (count <= 1) return newValue;
    return (current * (count - 1) + newValue) / count;
  }

  /**
   * Update system health score
   * 更新系统健康分数
   */
  private updateSystemHealthScore(): void {
    let score = 100;

    // Deduct points for errors
    const errorDeduction = Math.min(30, this.systemMetrics.totalErrors * 0.5);
    score -= errorDeduction;

    // Deduct points for low recovery rate
    if (this.systemMetrics.totalRecoveryAttempts > 0) {
      const recoveryPenalty = (1 - this.systemMetrics.overallRecoveryRate) * 20;
      score -= recoveryPenalty;
    }

    // Deduct points for high handling time
    if (this.systemMetrics.averageHandlingTime > 5000) {
      score -= Math.min(15, (this.systemMetrics.averageHandlingTime - 5000) / 1000);
    }

    // Consider provider health
    const providerHealths = Object.values(this.systemMetrics.providerMetrics).map(p =>
      p.consecutiveErrors < 3 ? 1 : Math.max(0, 1 - p.consecutiveErrors * 0.1)
    );

    if (providerHealths.length > 0) {
      const avgProviderHealth = providerHealths.reduce((a, b) => a + b, 0) / providerHealths.length;
      score *= avgProviderHealth;
    }

    this.systemMetrics.systemHealthScore = Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate module health status
   * 计算模块健康状态
   */
  private calculateModuleHealthStatus(metrics: ModuleErrorMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.consecutiveFailures >= 5) return 'unhealthy';
    if (metrics.consecutiveFailures >= 3 || metrics.errorRate > 10) return 'degraded';
    return 'healthy';
  }

  /**
   * Check alert conditions
   * 检查警报条件
   */
  private checkAlertConditions(event: ErrorEvent): void {
    const now = Date.now();
    const thresholds = this.config.alertThresholds;

    // Check error rate threshold
    const recentErrors = Array.from(this.errorEvents.values())
      .filter(e => now - e.timestamp < 60000); // Last minute

    if (recentErrors.length >= thresholds.errorRate) {
      this.createAlert('error_rate', ErrorSeverity.HIGH,
        `High error rate detected: ${recentErrors.length} errors in the last minute`, {
        errorCount: recentErrors.length,
        threshold: thresholds.errorRate,
        timeWindow: 60000
      });
    }

    // Check consecutive errors
    if (event.consecutiveErrors >= thresholds.consecutiveErrors) {
      this.createAlert('consecutive_errors', ErrorSeverity.HIGH,
        `Consecutive errors detected: ${event.consecutiveErrors} errors from ${event.moduleId}`, {
        consecutiveErrors: event.consecutiveErrors,
        moduleId: event.moduleId,
        threshold: thresholds.consecutiveErrors
      });
    }

    // Check handling time
    if (event.handlingTime > thresholds.averageHandlingTime) {
      this.createAlert('handling_time', ErrorSeverity.MEDIUM,
        `High error handling time detected: ${event.handlingTime}ms for ${event.moduleId}`, {
        handlingTime: event.handlingTime,
        moduleId: event.moduleId,
        threshold: thresholds.averageHandlingTime
      });
    }
  }

  /**
   * Create an alert
   * 创建警报
   */
  private createAlert(type: Alert['type'], severity: ErrorSeverity, message: string, details: Record<string, any>): void {
    const alertId = uuidv4();
    const alert: Alert = {
      alertId,
      type,
      severity,
      timestamp: Date.now(),
      message,
      details,
      affectedComponents: details.moduleId ? [details.moduleId] : [],
      resolved: false
    };

    this.alerts.set(alertId, alert);

    // Log alert creation
    this.logAlertCreated(alert);

    // Send notification if configured
    if (this.config.notifications.enabled && this.config.notifications.severityFilter.includes(severity)) {
      this.sendNotification(alert);
    }
  }

  /**
   * Get current system metrics
   * 获取当前系统指标
   */
  getSystemMetrics(): SystemErrorMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get provider-specific metrics
   * 获取提供商特定指标
   */
  getProviderMetrics(providerId: string): ProviderErrorMetrics | undefined {
    return this.providerMetrics.get(providerId);
  }

  /**
   * Get module-specific metrics
   * 获取模块特定指标
   */
  getModuleMetrics(moduleId: string): ModuleErrorMetrics | undefined {
    return this.moduleMetrics.get(moduleId);
  }

  /**
   * Get current health status
   * 获取当前健康状态
   */
  getHealthStatus(): HealthStatus {
    const now = Date.now();
    const healthStatus: HealthStatus = {
      status: 'healthy',
      score: this.systemMetrics.systemHealthScore,
      timestamp: now,
      components: {
        providers: {},
        modules: {},
        strategies: {}
      },
      summary: {
        totalProviders: this.providerMetrics.size,
        healthyProviders: 0,
        totalModules: this.moduleMetrics.size,
        healthyModules: 0,
        activeAlerts: 0,
        recommendations: []
      }
    };

    // Determine overall status
    if (healthStatus.score >= 80) {
      healthStatus.status = 'healthy';
    } else if (healthStatus.score >= 50) {
      healthStatus.status = 'degraded';
    } else {
      healthStatus.status = 'unhealthy';
    }

    // Provider health
    for (const [providerId, metrics] of this.providerMetrics) {
      const providerScore = this.calculateProviderHealthScore(metrics);
      const status = providerScore >= 80 ? 'healthy' : providerScore >= 50 ? 'degraded' : 'unhealthy';

      healthStatus.components.providers[providerId] = {
        status,
        score: providerScore,
        issues: this.getProviderIssues(metrics)
      };

      if (status === 'healthy') {
        healthStatus.summary.healthyProviders++;
      }
    }

    // Module health
    for (const [moduleId, metrics] of this.moduleMetrics) {
      const moduleScore = this.calculateModuleHealthScore(metrics);
      const status = metrics.healthStatus;

      healthStatus.components.modules[moduleId] = {
        status,
        score: moduleScore,
        issues: this.getModuleIssues(metrics)
      };

      if (status === 'healthy') {
        healthStatus.summary.healthyModules++;
      }
    }

    // Strategy health (if strategy manager is available)
    if (this.strategyManager) {
      const strategies = this.strategyManager.getStrategies();
      for (const strategy of strategies) {
        const health = strategy.getHealth();
        const metrics = strategy.getMetrics();

        healthStatus.components.strategies[strategy.name] = {
          status: health.status,
          score: health.successRate * 100,
          effectiveness: metrics.successRate
        };
      }
    }

    // Count active alerts
    healthStatus.summary.activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved).length;

    // Generate recommendations
    healthStatus.summary.recommendations = this.generateHealthRecommendations(healthStatus);

    return healthStatus;
  }

  /**
   * Calculate provider health score
   * 计算提供商健康分数
   */
  private calculateProviderHealthScore(metrics: ProviderErrorMetrics): number {
    let score = 100;

    // Deduct for consecutive errors
    score -= Math.min(30, metrics.consecutiveErrors * 5);

    // Deduct for low recovery rate
    score -= (1 - metrics.recoveryRate) * 20;

    // Deduct for high handling time
    if (metrics.averageHandlingTime > 5000) {
      score -= Math.min(20, (metrics.averageHandlingTime - 5000) / 500);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate module health score
   * 计算模块健康分数
   */
  private calculateModuleHealthScore(metrics: ModuleErrorMetrics): number {
    let score = 100;

    // Deduct for consecutive failures
    score -= Math.min(40, metrics.consecutiveFailures * 8);

    // Deduct for high error rate
    score -= Math.min(30, metrics.errorRate * 2);

    // Deduct for low recovery success rate
    score -= (1 - metrics.recoverySuccessRate) * 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get provider issues
   * 获取提供商问题
   */
  private getProviderIssues(metrics: ProviderErrorMetrics): string[] {
    const issues: string[] = [];

    if (metrics.consecutiveErrors >= 3) {
      issues.push(`High consecutive errors: ${metrics.consecutiveErrors}`);
    }

    if (metrics.recoveryRate < 0.5) {
      issues.push(`Low recovery rate: ${(metrics.recoveryRate * 100).toFixed(1)}%`);
    }

    if (metrics.averageHandlingTime > 10000) {
      issues.push(`High average handling time: ${metrics.averageHandlingTime}ms`);
    }

    return issues;
  }

  /**
   * Get module issues
   * 获取模块问题
   */
  private getModuleIssues(metrics: ModuleErrorMetrics): string[] {
    const issues: string[] = [];

    if (metrics.consecutiveFailures >= 3) {
      issues.push(`High consecutive failures: ${metrics.consecutiveFailures}`);
    }

    if (metrics.errorRate > 5) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(1)} errors/min`);
    }

    if (metrics.recoverySuccessRate < 0.6) {
      issues.push(`Low recovery success rate: ${(metrics.recoverySuccessRate * 100).toFixed(1)}%`);
    }

    return issues;
  }

  /**
   * Generate health recommendations
   * 生成健康建议
   */
  private generateHealthRecommendations(healthStatus: HealthStatus): string[] {
    const recommendations: string[] = [];

    if (healthStatus.score < 50) {
      recommendations.push('System health is critical. Immediate attention required.');
    }

    // Provider recommendations
    const unhealthyProviders = Object.entries(healthStatus.components.providers)
      .filter(([_, health]) => health.status === 'unhealthy');

    if (unhealthyProviders.length > 0) {
      recommendations.push(`${unhealthyProviders.length} providers are unhealthy. Consider investigation.`);
    }

    // Module recommendations
    const unhealthyModules = Object.entries(healthStatus.components.modules)
      .filter(([_, health]) => health.status === 'unhealthy');

    if (unhealthyModules.length > 0) {
      recommendations.push(`${unhealthyModules.length} modules are unhealthy. Review error patterns.`);
    }

    // Strategy recommendations
    const ineffectiveStrategies = Object.entries(healthStatus.components.strategies)
      .filter(([_, strategy]) => strategy.effectiveness < 0.5);

    if (ineffectiveStrategies.length > 0) {
      recommendations.push(`${ineffectiveStrategies.length} strategies have low effectiveness. Consider tuning.`);
    }

    return recommendations;
  }

  /**
   * Get active alerts
   * 获取活跃警报
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get recovery patterns
   * 获取恢复模式
   */
  getRecoveryPatterns(): RecoveryPattern[] {
    return Array.from(this.recoveryPatterns.values());
  }

  /**
   * Suggest recovery actions based on error patterns
   * 基于错误模式建议恢复操作
   */
  suggestRecoveryActions(error: Error, context: StrategyContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const errorMessage = error.message.toLowerCase();

    // Find matching recovery patterns
    for (const pattern of this.recoveryPatterns.values()) {
      if (pattern.errorPattern.test(errorMessage)) {
        const action: RecoveryAction = {
          actionId: uuidv4(),
          type: pattern.recommendedStrategy as RecoveryAction['type'],
          target: context.moduleId,
          parameters: pattern.strategyParameters,
          successCriteria: {
            metric: 'error_rate',
            threshold: 2, // errors per minute
            timeWindow: 300000 // 5 minutes
          }
        };

        actions.push(action);

        // Update pattern usage
        pattern.lastUsed = Date.now();
        pattern.usageCount++;
      }
    }

    // Add default actions if no patterns match
    if (actions.length === 0) {
      actions.push({
        actionId: uuidv4(),
        type: 'retry',
        target: context.moduleId,
        parameters: { maxRetries: 2, delay: 1000 },
        successCriteria: {
          metric: 'recovery_rate',
          threshold: 0.7,
          timeWindow: 300000
        }
      });
    }

    return actions;
  }

  /**
   * Execute automated recovery action
   * 执行自动恢复操作
   */
  async executeRecoveryAction(action: RecoveryAction): Promise<{
    success: boolean;
    result: any;
    executionTime: number;
  }> {
    const startTime = Date.now();

    try {
      let result: any = {};

      // Execute based on action type
      switch (action.type) {
        case 'retry':
          result = await this.executeRetryAction(action);
          break;
        case 'fallback':
          result = await this.executeFallbackAction(action);
          break;
        case 'circuit_breaker_reset':
          result = await this.executeCircuitBreakerReset(action);
          break;
        case 'config_adjustment':
          result = await this.executeConfigAdjustment(action);
          break;
        case 'provider_switch':
          result = await this.executeProviderSwitch(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      const executionTime = Date.now() - startTime;

      // Log recovery action execution
      this.logRecoveryActionExecuted(action, result, executionTime);

      // Trigger event handler
      if (this.eventHandlers.onRecoveryActionExecuted) {
        this.eventHandlers.onRecoveryActionExecuted(action, result);
      }

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logError('Recovery action execution failed', {
        actionId: action.actionId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return {
        success: false,
        result: null,
        executionTime
      };
    }
  }

  /**
   * Execute retry action
   * 执行重试操作
   */
  private async executeRetryAction(action: RecoveryAction): Promise<any> {
    // This would integrate with the strategy manager to execute retry
    // For now, return a mock result
    return {
      action: 'retry_executed',
      target: action.target,
      parameters: action.parameters,
      timestamp: Date.now()
    };
  }

  /**
   * Execute fallback action
   * 执行降级操作
   */
  private async executeFallbackAction(action: RecoveryAction): Promise<any> {
    // This would integrate with the strategy manager to execute fallback
    return {
      action: 'fallback_executed',
      target: action.target,
      parameters: action.parameters,
      timestamp: Date.now()
    };
  }

  /**
   * Execute circuit breaker reset
   * 执行熔断器重置
   */
  private async executeCircuitBreakerReset(action: RecoveryAction): Promise<any> {
    // This would reset circuit breaker state for the target
    return {
      action: 'circuit_breaker_reset',
      target: action.target,
      timestamp: Date.now()
    };
  }

  /**
   * Execute configuration adjustment
   * 执行配置调整
   */
  private async executeConfigAdjustment(action: RecoveryAction): Promise<any> {
    // This would adjust configuration parameters
    return {
      action: 'config_adjusted',
      target: action.target,
      parameters: action.parameters,
      timestamp: Date.now()
    };
  }

  /**
   * Execute provider switch
   * 执行提供商切换
   */
  private async executeProviderSwitch(action: RecoveryAction): Promise<any> {
    // This would switch to an alternative provider
    return {
      action: 'provider_switched',
      target: action.target,
      parameters: action.parameters,
      timestamp: Date.now()
    };
  }

  /**
   * Start real-time monitoring
   * 启动实时监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logWarn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;

    // Start metrics collection interval
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);

    // Start health check interval if enabled
    if (this.config.healthCheck.enabled) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, this.config.healthCheck.interval);
    }

    this.logInfo('Real-time monitoring started', {
      collectionInterval: this.config.collectionInterval,
      healthCheckInterval: this.config.healthCheck.interval
    });
  }

  /**
   * Stop monitoring
   * 停止监控
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.logInfo('Real-time monitoring stopped');
  }

  /**
   * Collect metrics periodically
   * 定期收集指标
   */
  private collectMetrics(): void {
    // Update metrics timestamp
    this.metricsUpdateTimestamp = Date.now();

    // Trigger metrics updated event
    if (this.eventHandlers.onMetricsUpdated) {
      this.eventHandlers.onMetricsUpdated(this.getSystemMetrics());
    }
  }

  /**
   * Perform health checks
   * 执行健康检查
   */
  private async performHealthChecks(): Promise<void> {
    const healthStatus = this.getHealthStatus();

    // Check if health status has changed significantly
    if (healthStatus.timestamp - this.lastHealthCheck > this.config.healthCheck.interval) {
      this.lastHealthCheck = healthStatus.timestamp;

      // Trigger health status changed event
      if (this.eventHandlers.onHealthStatusChanged) {
        this.eventHandlers.onHealthStatusChanged(healthStatus);
      }

      // Check for critical health conditions
      if (healthStatus.status === 'unhealthy' || healthStatus.score < 30) {
        this.createAlert('health_check', ErrorSeverity.CRITICAL,
          `Critical system health detected: score ${healthStatus.score}`, {
          healthScore: healthStatus.score,
          status: healthStatus.status
        });
      }
    }
  }

  /**
   * Generate monitoring report
   * 生成监控报告
   */
  generateReport(timeRange: { startTime: number; endTime: number }): {
    metrics: SystemErrorMetrics;
    alerts: Alert[];
    healthTrend: HealthStatus[];
    recommendations: string[];
  } {
    // Filter events within time range
    const filteredEvents = Array.from(this.errorEvents.values())
      .filter(e => e.timestamp >= timeRange.startTime && e.timestamp <= timeRange.endTime);

    // Filter alerts within time range
    const filteredAlerts = Array.from(this.alerts.values())
      .filter(a => a.timestamp >= timeRange.startTime && a.timestamp <= timeRange.endTime);

    // Generate health trend (simplified - would need historical data in real implementation)
    const healthTrend = [this.getHealthStatus()];

    // Generate recommendations based on report data
    const recommendations = this.generateReportRecommendations(filteredEvents, filteredAlerts);

    return {
      metrics: this.getSystemMetrics(),
      alerts: filteredAlerts,
      healthTrend,
      recommendations
    };
  }

  /**
   * Generate report recommendations
   * 生成报告建议
   */
  private generateReportRecommendations(events: ErrorEvent[], alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    // Analyze error patterns
    const errorTypes = events.reduce((acc, event) => {
      acc[event.errorType] = (acc[event.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrorType = Object.entries(errorTypes)
      .sort(([,a], [,b]) => b - a)[0];

    if (topErrorType && topErrorType[1] > 5) {
      recommendations.push(`High frequency of ${topErrorType[0]} errors detected. Consider implementing targeted fixes.`);
    }

    // Analyze alert patterns
    const alertTypes = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (alertTypes.error_rate > 3) {
      recommendations.push('Frequent error rate alerts detected. Consider scaling resources or optimizing performance.');
    }

    if (alertTypes.consecutive_errors > 2) {
      recommendations.push('Consecutive error alerts indicate potential cascading failures. Review error handling strategies.');
    }

    return recommendations;
  }

  /**
   * Export metrics data
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): string {
    const metrics = this.getSystemMetrics();

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2);

      case 'csv':
        return this.exportMetricsAsCsv(metrics);

      case 'prometheus':
        return this.exportMetricsAsPrometheus(metrics);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export metrics as CSV
   * 导出为CSV格式
   */
  private exportMetricsAsCsv(metrics: SystemErrorMetrics): string {
    const lines = [
      'Metric,Value',
      `total_errors,${metrics.totalErrors}`,
      `recovery_rate,${metrics.overallRecoveryRate}`,
      `average_handling_time,${metrics.averageHandlingTime}`,
      `system_health_score,${metrics.systemHealthScore}`,
      ''
    ];

    // Add error type distribution
    lines.push('Error Type,Count');
    for (const [type, count] of Object.entries(metrics.errorsByType)) {
      lines.push(`${type},${count}`);
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as Prometheus format
   * 导出为Prometheus格式
   */
  private exportMetricsAsPrometheus(metrics: SystemErrorMetrics): string {
    const lines = [
      '# HELP rcc_pipeline_total_errors Total number of errors in the pipeline',
      '# TYPE rcc_pipeline_total_errors counter',
      `rcc_pipeline_total_errors ${metrics.totalErrors}`,
      '',
      '# HELP rcc_pipeline_recovery_rate Overall recovery rate for errors',
      '# TYPE rcc_pipeline_recovery_rate gauge',
      `rcc_pipeline_recovery_rate ${metrics.overallRecoveryRate}`,
      '',
      '# HELP rcc_pipeline_average_handling_time Average error handling time in milliseconds',
      '# TYPE rcc_pipeline_average_handling_time gauge',
      `rcc_pipeline_average_handling_time ${metrics.averageHandlingTime}`,
      '',
      '# HELP rcc_pipeline_system_health_score Overall system health score (0-100)',
      '# TYPE rcc_pipeline_system_health_score gauge',
      `rcc_pipeline_system_health_score ${metrics.systemHealthScore}`
    ];

    return lines.join('\n');
  }

  /**
   * Cleanup old data
   * 清理旧数据
   */
  async cleanup(): Promise<void> {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    // Clean old error events
    for (const [eventId, event] of this.errorEvents) {
      if (event.timestamp < cutoffTime) {
        this.errorEvents.delete(eventId);
      }
    }

    // Clean old resolved alerts
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }

    this.logInfo('Cleaned up old monitoring data', {
      cutoffTime,
      remainingEvents: this.errorEvents.size,
      remainingAlerts: this.alerts.size
    });
  }

  /**
   * Cleanup old events (called during error recording)
   * 清理旧事件（在错误记录期间调用）
   */
  private cleanupOldEvents(): void {
    if (this.errorEvents.size > 10000) { // Keep last 10,000 events
      const eventsArray = Array.from(this.errorEvents.values())
        .sort((a, b) => b.timestamp - a.timestamp);

      const eventsToKeep = eventsArray.slice(0, 10000);
      this.errorEvents.clear();

      for (const event of eventsToKeep) {
        this.errorEvents.set(event.errorId, event);
      }
    }
  }

  /**
   * Destroy the monitor
   * 销毁监控器
   */
  async destroy(): Promise<void> {
    await this.stopMonitoring();

    // Clear all data
    this.errorEvents.clear();
    this.providerMetrics.clear();
    this.moduleMetrics.clear();
    this.alerts.clear();
    this.recoveryPatterns.clear();

    this.logInfo('Error monitor destroyed');
  }

  /**
   * Log helper methods
   */
  private logInfo(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'error-monitor',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_info', data }
    });
  }

  private logWarn(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'error-monitor',
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_warn', data }
    });
  }

  private logError(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'error-monitor',
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_error', data }
    });
  }

  private logErrorRecorded(event: ErrorEvent): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Error recorded: ${event.errorType}`),
      source: 'error-monitor',
      severity: event.severity,
      timestamp: event.timestamp,
      context: {
        action: 'error_recorded',
        errorId: event.errorId,
        moduleId: event.moduleId,
        recoveryAttempted: event.recoveryAttempted,
        recoverySuccessful: event.recoverySuccessful
      }
    });
  }

  private logAlertCreated(alert: Alert): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Alert created: ${alert.type}`),
      source: 'error-monitor',
      severity: alert.severity,
      timestamp: alert.timestamp,
      context: {
        action: 'alert_created',
        alertId: alert.alertId,
        type: alert.type,
        message: alert.message
      }
    });
  }

  private logRecoveryActionExecuted(action: RecoveryAction, result: any, executionTime: number): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Recovery action executed: ${action.type}`),
      source: 'error-monitor',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'recovery_action_executed',
        actionId: action.actionId,
        type: action.type,
        target: action.target,
        success: true,
        executionTime
      }
    });
  }

  private sendNotification(alert: Alert): void {
    // This would integrate with external notification systems
    // For now, just log the notification attempt
    this.logInfo('Notification sent', {
      alertId: alert.alertId,
      type: alert.type,
      severity: alert.severity,
      config: this.config.notifications
    });
  }
}