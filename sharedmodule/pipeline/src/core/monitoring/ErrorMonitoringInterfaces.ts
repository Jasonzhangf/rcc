/**
 * Error Monitoring and Metrics System for RCC Pipeline
 * RCC流水线错误监控和指标系统
 *
 * This module provides comprehensive error tracking, real-time monitoring,
 * and automated recovery mechanisms for the RCC pipeline system.
 */

import {
  ErrorHandlingCenter,
  ErrorContext,
  ErrorSeverity,
  ErrorCategory
} from 'rcc-errorhandling';

import { PipelineExecutionContext } from '../core/PipelineExecutionContext';
import { StrategyManagerMetrics, StrategyHealth } from './strategies/StrategyInterfaces';

/**
 * Error metrics collection interfaces
 * 错误指标收集接口
 */

/**
 * Error event with comprehensive metadata
 * 包含完整元数据的错误事件
 */
export interface ErrorEvent {
  errorId: string;
  timestamp: number;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  moduleId: string;
  moduleName: string;
  component: string;
  operationId?: string;
  sessionId?: string;
  pipelineStage?: string;
  context: Record<string, any>;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  strategyUsed?: string;
  handlingTime: number;
}

/**
 * Provider-specific error metrics
 * 提供商特定错误指标
 */
export interface ProviderErrorMetrics {
  providerId: string;
  providerName: string;
  totalErrors: number;
  errorTypes: Record<string, number>;
  errorCategories: Record<ErrorCategory, number>;
  errorSeverities: Record<ErrorSeverity, number>;
  recoveryRate: number;
  averageHandlingTime: number;
  lastErrorTime: number;
  consecutiveErrors: number;
  circuitBreakerTrips: number;
  retrySuccessRate: number;
  fallbackUsageCount: number;
}

/**
 * Module-specific error metrics
 * 模块特定错误指标
 */
export interface ModuleErrorMetrics {
  moduleId: string;
  moduleName: string;
  totalErrors: number;
  errorRate: number;
  averageProcessingTime: number;
  errorDistribution: Record<string, number>;
  recoverySuccessRate: number;
  lastErrorTimestamp: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  consecutiveFailures: number;
  strategyEffectiveness: Record<string, number>;
}

/**
 * System-wide error metrics
 * 系统级错误指标
 */
export interface SystemErrorMetrics {
  totalErrors: number;
  errorsByTime: Record<string, number>; // Hourly buckets
  errorsByType: Record<string, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  totalRecoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  overallRecoveryRate: number;
  averageHandlingTime: number;
  systemHealthScore: number;
  providerMetrics: Record<string, ProviderErrorMetrics>;
  moduleMetrics: Record<string, ModuleErrorMetrics>;
  lastUpdated: number;
}

/**
 * Real-time monitoring configuration
 * 实时监控配置
 */
export interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  alertThresholds: {
    errorRate: number; // errors per minute
    recoveryRate: number; // minimum recovery rate
    averageHandlingTime: number; // maximum handling time
    consecutiveErrors: number; // maximum consecutive errors
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    providers: string[];
  };
  notifications: {
    enabled: boolean;
    webhook?: string;
    emailConfig?: Record<string, any>;
    severityFilter: ErrorSeverity[];
  };
}

/**
 * Health status with detailed information
 * 健康状态详细信息
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  score: number; // 0-100
  timestamp: number;
  components: {
    providers: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      issues: string[];
    }>;
    modules: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      issues: string[];
    }>;
    strategies: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      effectiveness: number;
    }>;
  };
  summary: {
    totalProviders: number;
    healthyProviders: number;
    totalModules: number;
    healthyModules: number;
    activeAlerts: number;
    recommendations: string[];
  };
}

/**
 * Alert information
 * 警报信息
 */
export interface Alert {
  alertId: string;
  type: 'error_rate' | 'recovery_rate' | 'handling_time' | 'consecutive_errors' | 'health_check';
  severity: ErrorSeverity;
  timestamp: number;
  message: string;
  details: Record<string, any>;
  affectedComponents: string[];
  resolved: boolean;
  resolvedAt?: number;
  resolutionNotes?: string;
}

/**
 * Recovery pattern information
 * 恢复模式信息
 */
export interface RecoveryPattern {
  patternId: string;
  errorType: string;
  errorPattern: RegExp;
  successRate: number;
  recommendedStrategy: string;
  strategyParameters: Record<string, any>;
  confidence: number;
  lastUsed: number;
  usageCount: number;
}

/**
 * Automated recovery action
 * 自动恢复操作
 */
export interface RecoveryAction {
  actionId: string;
  type: 'retry' | 'fallback' | 'circuit_breaker_reset' | 'config_adjustment' | 'provider_switch';
  target: string; // moduleId or providerId
  parameters: Record<string, any>;
  successCriteria: {
    metric: string;
    threshold: number;
    timeWindow: number;
  };
  rollbackPlan?: string;
}

/**
 * Error monitoring and metrics collector interface
 * 错误监控和指标收集器接口
 */
export interface IErrorMonitor {
  /**
   * Initialize the error monitor
   * 初始化错误监控器
   */
  initialize(config: MonitoringConfig): Promise<void>;

  /**
   * Record an error event
   * 记录错误事件
   */
  recordError(event: ErrorEvent): Promise<void>;

  /**
   * Get current system metrics
   * 获取当前系统指标
   */
  getSystemMetrics(): SystemErrorMetrics;

  /**
   * Get provider-specific metrics
   * 获取提供商特定指标
   */
  getProviderMetrics(providerId: string): ProviderErrorMetrics | undefined;

  /**
   * Get module-specific metrics
   * 获取模块特定指标
   */
  getModuleMetrics(moduleId: string): ModuleErrorMetrics | undefined;

  /**
   * Get current health status
   * 获取当前健康状态
   */
  getHealthStatus(): HealthStatus;

  /**
   * Get active alerts
   * 获取活跃警报
   */
  getAlerts(): Alert[];

  /**
   * Get recovery patterns
   * 获取恢复模式
   */
  getRecoveryPatterns(): RecoveryPattern[];

  /**
   * Suggest recovery actions based on error patterns
   * 基于错误模式建议恢复操作
   */
  suggestRecoveryActions(error: Error, context: StrategyContext): RecoveryAction[];

  /**
   * Execute automated recovery action
   * 执行自动恢复操作
   */
  executeRecoveryAction(action: RecoveryAction): Promise<{
    success: boolean;
    result: any;
    executionTime: number;
  }>;

  /**
   * Start real-time monitoring
   * 启动实时监控
   */
  startMonitoring(): Promise<void>;

  /**
   * Stop monitoring
   * 停止监控
   */
  stopMonitoring(): Promise<void>;

  /**
   * Generate monitoring report
   * 生成监控报告
   */
  generateReport(timeRange: {
    startTime: number;
    endTime: number;
  }): {
    metrics: SystemErrorMetrics;
    alerts: Alert[];
    healthTrend: HealthStatus[];
    recommendations: string[];
  };

  /**
   * Export metrics data
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): string;

  /**
   * Cleanup old data
   * 清理旧数据
   */
  cleanup(): Promise<void>;

  /**
   * Destroy the monitor
   * 销毁监控器
   */
  destroy(): Promise<void>;
}

/**
 * Strategy context for recovery actions
 * 恢复操作的策略上下文
 */
export interface StrategyContext {
  operationId: string;
  moduleId: string;
  pipelineContext: PipelineExecutionContext;
  startTime: number;
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  strategyData?: Record<string, any>;
}

/**
 * Event handlers for monitoring
 * 监控事件处理器
 */
export interface MonitoringEventHandlers {
  onErrorRecorded?: (event: ErrorEvent) => void;
  onHealthStatusChanged?: (status: HealthStatus) => void;
  onAlertTriggered?: (alert: Alert) => void;
  onRecoveryActionExecuted?: (action: RecoveryAction, result: any) => void;
  onMetricsUpdated?: (metrics: SystemErrorMetrics) => void;
}

/**
 * Export monitoring interfaces for external use
 * 导出监控接口供外部使用
 */
export {
  ErrorEvent,
  ProviderErrorMetrics,
  ModuleErrorMetrics,
  SystemErrorMetrics,
  MonitoringConfig,
  HealthStatus,
  Alert,
  RecoveryPattern,
  RecoveryAction,
  IErrorMonitor,
  StrategyContext,
  MonitoringEventHandlers
};