/**
 * Real-time Health Check System for RCC Pipeline
 * RCC流水线实时健康检查系统
 *
 * Provides comprehensive health monitoring, anomaly detection,
 * and proactive health management for the pipeline system.
 */

import {
  ErrorHandlingCenter,
  ErrorContext,
  ErrorSeverity
} from 'rcc-errorhandling';

import { v4 as uuidv4 } from 'uuid';

import {
  HealthStatus,
  Alert,
  ErrorEvent,
  ProviderErrorMetrics,
  ModuleErrorMetrics
} from './ErrorMonitoringInterfaces';

import { IModularPipelineExecutor } from '../../interfaces/ModularInterfaces';

/**
 * Health check configuration
 * 健康检查配置
 */
interface HealthCheckConfig {
  enabled: boolean;
  checkInterval: number;
  timeout: number;
  retryAttempts: number;
  thresholds: {
    errorRate: number; // errors per minute
    responseTime: number; // milliseconds
    availability: number; // percentage (0-100)
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
  };
  providers: string[];
  modules: string[];
  anomalyDetection: {
    enabled: boolean;
    sensitivity: number; // 0-1
    windowSize: number; // number of data points
    alertThreshold: number; // standard deviations
  };
}

/**
 * Health check result
 * 健康检查结果
 */
interface HealthCheckResult {
  checkId: string;
  timestamp: number;
  target: string;
  targetType: 'provider' | 'module' | 'system';
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  metrics: Record<string, number>;
  issues: string[];
  recommendations: string[];
  executionTime: number;
}

/**
 * Anomaly detection data point
 * 异常检测数据点
 */
interface AnomalyDataPoint {
  timestamp: number;
  value: number;
  metric: string;
  target: string;
}

/**
 * Health trend analysis
 * 健康趋势分析
 */
interface HealthTrend {
  metric: string;
  target: string;
  trend: 'improving' | 'stable' | 'declining';
  slope: number;
  confidence: number;
  prediction: {
    nextValue: number;
    nextStatus: 'healthy' | 'degraded' | 'unhealthy';
    timeWindow: number;
  };
}

/**
 * Health Check System Implementation
 * 健康检查系统实现
 */
export class HealthCheckSystem {
  private errorHandlingCenter: ErrorHandlingCenter;
  private pipelineExecutor?: IModularPipelineExecutor;
  private config: HealthCheckConfig;

  // Health check state
  private isRunning: boolean = false;
  private checkInterval?: NodeJS.Timeout;
  private lastCheckTime: number = 0;

  // Health data storage
  private healthHistory: HealthCheckResult[] = [];
  private currentHealth: Map<string, HealthStatus> = new Map();

  // Anomaly detection
  private anomalyData: Map<string, AnomalyDataPoint[]> = new Map();
  private anomalyAlerts: Map<string, Alert> = new Map();

  // Trend analysis
  private healthTrends: Map<string, HealthTrend> = new Map();

  constructor(
    errorHandlingCenter: ErrorHandlingCenter,
    pipelineExecutor?: IModularPipelineExecutor,
    config: HealthCheckConfig = {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      retryAttempts: 2,
      thresholds: {
        errorRate: 5, // 5 errors per minute
        responseTime: 5000, // 5 seconds
        availability: 95, // 95% availability
        memoryUsage: 80, // 80% memory usage
        cpuUsage: 70 // 70% CPU usage
      },
      providers: [],
      modules: [],
      anomalyDetection: {
        enabled: true,
        sensitivity: 0.7,
        windowSize: 20,
        alertThreshold: 2.5 // 2.5 standard deviations
      }
    }
  ) {
    this.errorHandlingCenter = errorHandlingCenter;
    this.pipelineExecutor = pipelineExecutor;
    this.config = config;

    this.initializeAnomalyDetection();
  }

  /**
   * Initialize anomaly detection
   * 初始化异常检测
   */
  private initializeAnomalyDetection(): void {
    if (!this.config.anomalyDetection.enabled) return;

    // Initialize anomaly data storage for each metric
    const metrics = ['error_rate', 'response_time', 'availability', 'memory_usage', 'cpu_usage'];
    const targets = [...this.config.providers, ...this.config.modules, 'system'];

    for (const target of targets) {
      for (const metric of metrics) {
        const key = `${target}:${metric}`;
        this.anomalyData.set(key, []);
      }
    }
  }

  /**
   * Start health check system
   * 启动健康检查系统
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logInfo('Health check system disabled');
      return;
    }

    if (this.isRunning) {
      this.logWarn('Health check system is already running');
      return;
    }

    this.isRunning = true;

    // Start periodic health checks
    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);

    // Perform initial health check
    await this.performHealthChecks();

    this.logInfo('Health check system started', {
      checkInterval: this.config.checkInterval,
      providers: this.config.providers.length,
      modules: this.config.modules.length
    });
  }

  /**
   * Stop health check system
   * 停止健康检查系统
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.logInfo('Health check system stopped');
  }

  /**
   * Perform comprehensive health checks
   * 执行综合健康检查
   */
  private async performHealthChecks(): Promise<void> {
    const startTime = Date.now();
    const checkId = uuidv4();

    try {
      const results: HealthCheckResult[] = [];

      // Check system-level health
      const systemHealth = await this.checkSystemHealth(checkId);
      results.push(systemHealth);

      // Check provider health
      for (const providerId of this.config.providers) {
        try {
          const providerHealth = await this.checkProviderHealth(providerId, checkId);
          results.push(providerHealth);
        } catch (error) {
          this.logError(`Provider health check failed for ${providerId}`, { error });
          results.push(this.createFailedHealthCheck(providerId, 'provider', error));
        }
      }

      // Check module health
      for (const moduleId of this.config.modules) {
        try {
          const moduleHealth = await this.checkModuleHealth(moduleId, checkId);
          results.push(moduleHealth);
        } catch (error) {
          this.logError(`Module health check failed for ${moduleId}`, { error });
          results.push(this.createFailedHealthCheck(moduleId, 'module', error));
        }
      }

      // Process results
      await this.processHealthCheckResults(results);

      // Update anomaly detection
      if (this.config.anomalyDetection.enabled) {
        this.updateAnomalyDetection(results);
      }

      // Update trend analysis
      this.updateTrendAnalysis(results);

      // Store in history
      this.healthHistory.push(...results);

      // Limit history size
      if (this.healthHistory.length > 1000) {
        this.healthHistory = this.healthHistory.slice(-1000);
      }

      this.lastCheckTime = Date.now();

      this.logInfo('Health check cycle completed', {
        checkId,
        executionTime: Date.now() - startTime,
        checksPerformed: results.length,
        healthyChecks: results.filter(r => r.status === 'healthy').length
      });

    } catch (error) {
      this.logError('Health check cycle failed', { error });
    }
  }

  /**
   * Check system-level health
   * 检查系统级健康状态
   */
  private async checkSystemHealth(checkId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const target = 'system';
    const targetType = 'system' as const;

    const metrics: Record<string, number> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get system metrics (would integrate with system monitoring in real implementation)
      metrics.error_rate = await this.getSystemErrorRate();
      metrics.response_time = await this.getSystemResponseTime();
      metrics.availability = await this.getSystemAvailability();
      metrics.memory_usage = await this.getSystemMemoryUsage();
      metrics.cpu_usage = await this.getSystemCpuUsage();

      // Calculate health score
      const score = this.calculateHealthScore(metrics, this.config.thresholds);

      // Determine status
      const status = this.determineHealthStatus(score, metrics, this.config.thresholds);

      // Generate issues and recommendations
      const analysis = this.analyzeHealthIssues(metrics, this.config.thresholds);
      issues.push(...analysis.issues);
      recommendations.push(...analysis.recommendations);

      return {
        checkId,
        timestamp: Date.now(),
        target,
        targetType,
        status,
        score,
        metrics,
        issues,
        recommendations,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createFailedHealthCheck(target, targetType, error, checkId, startTime);
    }
  }

  /**
   * Check provider health
   * 检查提供商健康状态
   */
  private async checkProviderHealth(providerId: string, checkId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const target = providerId;
    const targetType = 'provider' as const;

    const metrics: Record<string, number> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Perform provider-specific health checks
      metrics.error_rate = await this.getProviderErrorRate(providerId);
      metrics.response_time = await this.getProviderResponseTime(providerId);
      metrics.availability = await this.getProviderAvailability(providerId);

      // Calculate health score
      const score = this.calculateProviderHealthScore(metrics, providerId);

      // Determine status
      const status = this.determineHealthStatus(score, metrics, this.config.thresholds);

      // Generate issues and recommendations
      const analysis = this.analyzeProviderHealthIssues(metrics, providerId);
      issues.push(...analysis.issues);
      recommendations.push(...analysis.recommendations);

      return {
        checkId,
        timestamp: Date.now(),
        target,
        targetType,
        status,
        score,
        metrics,
        issues,
        recommendations,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createFailedHealthCheck(target, targetType, error, checkId, startTime);
    }
  }

  /**
   * Check module health
   * 检查模块健康状态
   */
  private async checkModuleHealth(moduleId: string, checkId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const target = moduleId;
    const targetType = 'module' as const;

    const metrics: Record<string, number> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Perform module-specific health checks
      metrics.error_rate = await this.getModuleErrorRate(moduleId);
      metrics.response_time = await this.getModuleResponseTime(moduleId);
      metrics.memory_usage = await this.getModuleMemoryUsage(moduleId);

      // Calculate health score
      const score = this.calculateModuleHealthScore(metrics, moduleId);

      // Determine status
      const status = this.determineHealthStatus(score, metrics, this.config.thresholds);

      // Generate issues and recommendations
      const analysis = this.analyzeModuleHealthIssues(metrics, moduleId);
      issues.push(...analysis.issues);
      recommendations.push(...analysis.recommendations);

      return {
        checkId,
        timestamp: Date.now(),
        target,
        targetType,
        status,
        score,
        metrics,
        issues,
        recommendations,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createFailedHealthCheck(target, targetType, error, checkId, startTime);
    }
  }

  /**
   * Create failed health check result
   * 创建失败的健康检查结果
   */
  private createFailedHealthCheck(
    target: string,
    targetType: 'provider' | 'module' | 'system',
    error: any,
    checkId?: string,
    startTime?: number
  ): HealthCheckResult {
    return {
      checkId: checkId || uuidv4(),
      timestamp: Date.now(),
      target,
      targetType,
      status: 'unhealthy',
      score: 0,
      metrics: {},
      issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
      recommendations: ['Investigate health check failure and restore service'],
      executionTime: startTime ? Date.now() - startTime : 0
    };
  }

  /**
   * Calculate health score
   * 计算健康分数
   */
  private calculateHealthScore(metrics: Record<string, number>, thresholds: any): number {
    let score = 100;

    // Error rate impact
    if (metrics.error_rate > thresholds.errorRate) {
      score -= Math.min(30, (metrics.error_rate - thresholds.errorRate) * 5);
    }

    // Response time impact
    if (metrics.response_time > thresholds.responseTime) {
      score -= Math.min(25, (metrics.response_time - thresholds.responseTime) / 100);
    }

    // Availability impact
    if (metrics.availability < thresholds.availability) {
      score -= Math.min(30, (thresholds.availability - metrics.availability) * 2);
    }

    // Memory usage impact
    if (metrics.memory_usage > thresholds.memoryUsage) {
      score -= Math.min(15, (metrics.memory_usage - thresholds.memoryUsage) * 0.5);
    }

    // CPU usage impact
    if (metrics.cpu_usage > thresholds.cpuUsage) {
      score -= Math.min(10, (metrics.cpu_usage - thresholds.cpu_usage) * 0.3);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate provider health score
   * 计算提供商健康分数
   */
  private calculateProviderHealthScore(metrics: Record<string, number>, providerId: string): number {
    let score = 100;

    // Provider-specific scoring
    if (metrics.error_rate > this.config.thresholds.errorRate) {
      score -= Math.min(40, (metrics.error_rate - this.config.thresholds.errorRate) * 8);
    }

    if (metrics.response_time > this.config.thresholds.responseTime) {
      score -= Math.min(35, (metrics.response_time - this.config.thresholds.responseTime) / 50);
    }

    if (metrics.availability < this.config.thresholds.availability) {
      score -= Math.min(25, (this.config.thresholds.availability - metrics.availability) * 2.5);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate module health score
   * 计算模块健康分数
   */
  private calculateModuleHealthScore(metrics: Record<string, number>, moduleId: string): number {
    let score = 100;

    // Module-specific scoring
    if (metrics.error_rate > this.config.thresholds.errorRate) {
      score -= Math.min(35, (metrics.error_rate - this.config.thresholds.errorRate) * 7);
    }

    if (metrics.response_time > this.config.thresholds.responseTime) {
      score -= Math.min(30, (metrics.response_time - this.config.thresholds.responseTime) / 75);
    }

    if (metrics.memory_usage > this.config.thresholds.memoryUsage) {
      score -= Math.min(20, (metrics.memory_usage - this.config.thresholds.memoryUsage) * 0.7);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine health status
   * 确定健康状态
   */
  private determineHealthStatus(
    score: number,
    metrics: Record<string, number>,
    thresholds: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (score >= 80) {
      return 'healthy';
    } else if (score >= 50) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Analyze health issues
   * 分析健康问题
   */
  private analyzeHealthIssues(metrics: Record<string, number>, thresholds: any): {
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Error rate analysis
    if (metrics.error_rate > thresholds.errorRate) {
      issues.push(`High error rate: ${metrics.error_rate.toFixed(2)} errors/min (threshold: ${thresholds.errorRate})`);
      recommendations.push('Investigate error patterns and implement fixes');
    }

    // Response time analysis
    if (metrics.response_time > thresholds.responseTime) {
      issues.push(`High response time: ${metrics.response_time.toFixed(0)}ms (threshold: ${thresholds.responseTime}ms)`);
      recommendations.push('Optimize performance and consider scaling');
    }

    // Availability analysis
    if (metrics.availability < thresholds.availability) {
      issues.push(`Low availability: ${metrics.availability.toFixed(1)}% (threshold: ${thresholds.availability}%)`);
      recommendations.push('Improve service reliability and implement redundancy');
    }

    // Memory usage analysis
    if (metrics.memory_usage > thresholds.memoryUsage) {
      issues.push(`High memory usage: ${metrics.memory_usage.toFixed(1)}% (threshold: ${thresholds.memoryUsage}%)`);
      recommendations.push('Investigate memory leaks and optimize resource usage');
    }

    // CPU usage analysis
    if (metrics.cpu_usage > thresholds.cpuUsage) {
      issues.push(`High CPU usage: ${metrics.cpu_usage.toFixed(1)}% (threshold: ${thresholds.cpuUsage}%)`);
      recommendations.push('Optimize code efficiency and consider load balancing');
    }

    return { issues, recommendations };
  }

  /**
   * Analyze provider health issues
   * 分析提供商健康问题
   */
  private analyzeProviderHealthIssues(metrics: Record<string, number>, providerId: string): {
    issues: string[];
    recommendations: string[];
  } {
    const { issues, recommendations } = this.analyzeHealthIssues(metrics, this.config.thresholds);

    // Provider-specific recommendations
    if (metrics.error_rate > this.config.thresholds.errorRate * 2) {
      recommendations.push(`Consider rotating API keys or contacting ${providerId} support`);
    }

    if (metrics.availability < 90) {
      recommendations.push(`Enable failover to alternative providers for ${providerId}`);
    }

    return { issues, recommendations };
  }

  /**
   * Analyze module health issues
   * 分析模块健康问题
   */
  private analyzeModuleHealthIssues(metrics: Record<string, number>, moduleId: string): {
    issues: string[];
    recommendations: string[];
  } {
    const { issues, recommendations } = this.analyzeHealthIssues(metrics, this.config.thresholds);

    // Module-specific recommendations
    if (metrics.error_rate > this.config.thresholds.errorRate * 1.5) {
      recommendations.push(`Review ${moduleId} error handling and validation logic`);
    }

    if (metrics.memory_usage > this.config.thresholds.memoryUsage * 1.2) {
      recommendations.push(`Restart ${moduleId} module to clear memory leaks`);
    }

    return { issues, recommendations };
  }

  /**
   * Process health check results
   * 处理健康检查结果
   */
  private async processHealthCheckResults(results: HealthCheckResult[]): Promise<void> {
    for (const result of results) {
      // Update current health status
      this.updateCurrentHealth(result);

      // Create alerts for unhealthy components
      if (result.status === 'unhealthy') {
        this.createHealthAlert(result);
      }

      // Log significant health changes
      this.logHealthResult(result);
    }
  }

  /**
   * Update current health status
   * 更新当前健康状态
   */
  private updateCurrentHealth(result: HealthCheckResult): void {
    const healthStatus: HealthStatus = {
      status: result.status,
      score: result.score,
      timestamp: result.timestamp,
      components: {
        providers: {},
        modules: {},
        strategies: {}
      },
      summary: {
        totalProviders: this.config.providers.length,
        healthyProviders: 0,
        totalModules: this.config.modules.length,
        healthyModules: 0,
        activeAlerts: 0,
        recommendations: result.recommendations
      }
    };

    this.currentHealth.set(result.target, healthStatus);
  }

  /**
   * Create health alert
   * 创建健康警报
   */
  private createHealthAlert(result: HealthCheckResult): void {
    const alertId = uuidv4();
    const severity = result.score < 30 ? 'critical' as ErrorSeverity : 'high' as ErrorSeverity;

    const alert: Alert = {
      alertId,
      type: 'health_check',
      severity,
      timestamp: result.timestamp,
      message: `${result.targetType} ${result.target} is ${result.status} (score: ${result.score})`,
      details: {
        target: result.target,
        targetType: result.targetType,
        healthScore: result.score,
        issues: result.issues,
        metrics: result.metrics
      },
      affectedComponents: [result.target],
      resolved: false
    };

    this.anomalyAlerts.set(alertId, alert);

    this.logAlertCreated(alert);
  }

  /**
   * Update anomaly detection
   * 更新异常检测
   */
  private updateAnomalyDetection(results: HealthCheckResult[]): void {
    if (!this.config.anomalyDetection.enabled) return;

    for (const result of results) {
      for (const [metric, value] of Object.entries(result.metrics)) {
        const key = `${result.target}:${metric}`;
        const dataPoints = this.anomalyData.get(key) || [];

        // Add new data point
        dataPoints.push({
          timestamp: result.timestamp,
          value,
          metric,
          target: result.target
        });

        // Maintain window size
        if (dataPoints.length > this.config.anomalyDetection.windowSize) {
          dataPoints.shift();
        }

        this.anomalyData.set(key, dataPoints);

        // Check for anomalies
        this.detectAnomalies(key, dataPoints, result);
      }
    }
  }

  /**
   * Detect anomalies in data
   * 在数据中检测异常
   */
  private detectAnomalies(key: string, dataPoints: AnomalyDataPoint[], context: HealthCheckResult): void {
    if (dataPoints.length < 10) return; // Need sufficient data

    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const latestValue = values[values.length - 1];
    const zScore = Math.abs((latestValue - mean) / stdDev);

    if (zScore > this.config.anomalyDetection.alertThreshold) {
      this.createAnomalyAlert(key, latestValue, mean, stdDev, zScore, context);
    }
  }

  /**
   * Create anomaly alert
   * 创建异常警报
   */
  private createAnomalyAlert(
    key: string,
    currentValue: number,
    mean: number,
    stdDev: number,
    zScore: number,
    context: HealthCheckResult
  ): void {
    const alertId = uuidv4();
    const [target, metric] = key.split(':');

    const alert: Alert = {
      alertId,
      type: 'anomaly_detection',
      severity: zScore > 4 ? 'critical' as ErrorSeverity : 'high' as ErrorSeverity,
      timestamp: Date.now(),
      message: `Anomaly detected in ${metric} for ${target}: ${currentValue.toFixed(2)} (Z-score: ${zScore.toFixed(2)})`,
      details: {
        target,
        metric,
        currentValue,
        expectedValue: mean,
        standardDeviation: stdDev,
        zScore,
        threshold: this.config.anomalyDetection.alertThreshold
      },
      affectedComponents: [target],
      resolved: false
    };

    this.anomalyAlerts.set(alertId, alert);

    this.logAnomalyDetected(alert);
  }

  /**
   * Update trend analysis
   * 更新趋势分析
   */
  private updateTrendAnalysis(results: HealthCheckResult[]): void {
    for (const result of results) {
      for (const [metric, value] of Object.entries(result.metrics)) {
        const key = `${result.target}:${metric}`;
        this.updateMetricTrend(key, value, result);
      }
    }
  }

  /**
   * Update metric trend
   * 更新指标趋势
   */
  private updateMetricTrend(key: string, currentValue: number, context: HealthCheckResult): void {
    // Get historical data for this metric
    const historicalData = this.healthHistory
      .filter(r => r.target === context.target)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-20); // Last 20 data points

    if (historicalData.length < 5) return; // Need sufficient history

    const values = historicalData.map(r => r.metrics[key.split(':')[1]] || 0);
    const timeStamps = historicalData.map(r => r.timestamp);

    // Calculate linear regression for trend
    const trend = this.calculateLinearTrend(timeStamps, values);

    const trendAnalysis: HealthTrend = {
      metric: key.split(':')[1],
      target: context.target,
      trend: this.classifyTrend(trend.slope),
      slope: trend.slope,
      confidence: Math.abs(trend.correlation),
      prediction: {
        nextValue: this.predictNextValue(values, trend.slope),
        nextStatus: this.predictHealthStatus(currentValue, trend.slope),
        timeWindow: this.config.checkInterval
      }
    };

    this.healthTrends.set(key, trendAnalysis);
  }

  /**
   * Calculate linear trend
   * 计算线性趋势
   */
  private calculateLinearTrend(x: number[], y: number[]): { slope: number; correlation: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope, correlation };
  }

  /**
   * Classify trend
   * 分类趋势
   */
  private classifyTrend(slope: number): 'improving' | 'stable' | 'declining' {
    if (Math.abs(slope) < 0.1) return 'stable';
    return slope > 0 ? 'improving' : 'declining';
  }

  /**
   * Predict next value
   * 预测下一个值
   */
  private predictNextValue(values: number[], slope: number): number {
    return values[values.length - 1] + slope;
  }

  /**
   * Predict health status
   * 预测健康状态
   */
  private predictHealthStatus(currentValue: number, slope: number): 'healthy' | 'degraded' | 'unhealthy' {
    const nextValue = currentValue + slope * 5; // Predict 5 intervals ahead

    if (nextValue >= 80) return 'healthy';
    if (nextValue >= 50) return 'degraded';
    return 'unhealthy';
  }

  // System metric getters (mock implementations)
  private async getSystemErrorRate(): Promise<number> {
    // This would integrate with error monitoring system
    return Math.random() * 2; // Mock: 0-2 errors per minute
  }

  private async getSystemResponseTime(): Promise<number> {
    // This would measure actual system response time
    return Math.random() * 2000 + 500; // Mock: 500-2500ms
  }

  private async getSystemAvailability(): Promise<number> {
    // This would calculate actual system availability
    return 95 + Math.random() * 4; // Mock: 95-99%
  }

  private async getSystemMemoryUsage(): Promise<number> {
    // This would get actual memory usage
    return Math.random() * 30 + 40; // Mock: 40-70%
  }

  private async getSystemCpuUsage(): Promise<number> {
    // This would get actual CPU usage
    return Math.random() * 40 + 20; // Mock: 20-60%
  }

  // Provider metric getters (mock implementations)
  private async getProviderErrorRate(providerId: string): Promise<number> {
    // This would get actual provider error rate
    return Math.random() * 3; // Mock: 0-3 errors per minute
  }

  private async getProviderResponseTime(providerId: string): Promise<number> {
    // This would measure actual provider response time
    return Math.random() * 3000 + 1000; // Mock: 1000-4000ms
  }

  private async getProviderAvailability(providerId: string): Promise<number> {
    // This would calculate actual provider availability
    return 90 + Math.random() * 8; // Mock: 90-98%
  }

  // Module metric getters (mock implementations)
  private async getModuleErrorRate(moduleId: string): Promise<number> {
    // This would get actual module error rate
    return Math.random() * 2.5; // Mock: 0-2.5 errors per minute
  }

  private async getModuleResponseTime(moduleId: string): Promise<number> {
    // This would measure actual module response time
    return Math.random() * 1500 + 500; // Mock: 500-2000ms
  }

  private async getModuleMemoryUsage(moduleId: string): Promise<number> {
    // This would get actual module memory usage
    return Math.random() * 40 + 30; // Mock: 30-70%
  }

  // Public API methods
  /**
   * Get current health status
   * 获取当前健康状态
   */
  getCurrentHealth(): Map<string, HealthStatus> {
    return new Map(this.currentHealth);
  }

  /**
   * Get health history
   * 获取健康历史
   */
  getHealthHistory(timeRange?: { startTime: number; endTime: number }): HealthCheckResult[] {
    if (!timeRange) {
      return [...this.healthHistory];
    }

    return this.healthHistory.filter(
      result => result.timestamp >= timeRange.startTime && result.timestamp <= timeRange.endTime
    );
  }

  /**
   * Get active alerts
   * 获取活跃警报
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.anomalyAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get health trends
   * 获取健康趋势
   */
  getHealthTrends(): Map<string, HealthTrend> {
    return new Map(this.healthTrends);
  }

  /**
   * Get system health summary
   * 获取系统健康摘要
   */
  getSystemHealthSummary(): {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    overallScore: number;
    components: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
    activeAlerts: number;
    lastCheckTime: number;
    recommendations: string[];
  } {
    const healthStatuses = Array.from(this.currentHealth.values());
    const overallScore = healthStatuses.reduce((sum, status) => sum + status.score, 0) / healthStatuses.length;

    const components = {
      total: healthStatuses.length,
      healthy: healthStatuses.filter(s => s.status === 'healthy').length,
      degraded: healthStatuses.filter(s => s.status === 'degraded').length,
      unhealthy: healthStatuses.filter(s => s.status === 'unhealthy').length
    };

    const overallStatus = overallScore >= 80 ? 'healthy' :
                         overallScore >= 50 ? 'degraded' : 'unhealthy';

    const recommendations = this.generateSystemRecommendations(healthStatuses);

    return {
      overallStatus,
      overallScore,
      components,
      activeAlerts: this.getActiveAlerts().length,
      lastCheckTime: this.lastCheckTime,
      recommendations
    };
  }

  /**
   * Generate system recommendations
   * 生成系统建议
   */
  private generateSystemRecommendations(healthStatuses: HealthStatus[]): string[] {
    const recommendations: string[] = [];

    const unhealthyComponents = healthStatuses.filter(s => s.status === 'unhealthy');
    const degradedComponents = healthStatuses.filter(s => s.status === 'degraded');

    if (unhealthyComponents.length > 0) {
      recommendations.push(`${unhealthyComponents.length} components are unhealthy and require immediate attention`);
    }

    if (degradedComponents.length > 0) {
      recommendations.push(`${degradedComponents.length} components are degraded and should be monitored`);
    }

    const avgScore = healthStatuses.reduce((sum, s) => sum + s.score, 0) / healthStatuses.length;
    if (avgScore < 70) {
      recommendations.push('Overall system health is below optimal levels. Consider comprehensive maintenance');
    }

    return recommendations;
  }

  /**
   * Force immediate health check
   * 强制立即健康检查
   */
  async forceHealthCheck(): Promise<HealthCheckResult[]> {
    const startTime = Date.now();
    await this.performHealthChecks();
    const executionTime = Date.now() - startTime;

    this.logInfo('Forced health check completed', { executionTime });

    return this.healthHistory.slice(-this.config.providers.length - this.config.modules.length - 1);
  }

  /**
   * Log helper methods
   */
  private logInfo(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'health-check',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_info', data }
    });
  }

  private logWarn(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'health-check',
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_warn', data }
    });
  }

  private logError(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'health-check',
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_error', data }
    });
  }

  private logHealthResult(result: HealthCheckResult): void {
    if (result.status === 'unhealthy') {
      this.logError(`Unhealthy component detected: ${result.target}`, {
        score: result.score,
        issues: result.issues,
        metrics: result.metrics
      });
    } else if (result.status === 'degraded') {
      this.logWarn(`Degraded component detected: ${result.target}`, {
        score: result.score,
        issues: result.issues
      });
    } else {
      this.logInfo(`Healthy component: ${result.target}`, {
        score: result.score,
        metrics: result.metrics
      });
    }
  }

  private logAlertCreated(alert: Alert): void {
    this.logError(`Health alert created: ${alert.type}`, {
      alertId: alert.alertId,
      severity: alert.severity,
      target: alert.details.target,
      message: alert.message
    });
  }

  private logAnomalyDetected(alert: Alert): void {
    this.logError(`Anomaly detected: ${alert.details.metric}`, {
      alertId: alert.alertId,
      target: alert.details.target,
      currentValue: alert.details.currentValue,
      expectedValue: alert.details.expectedValue,
      zScore: alert.details.zScore
    });
  }
}