/**
 * RCC Pipeline Monitoring and Metrics System
 * RCC流水线监控和指标系统
 *
 * Comprehensive error monitoring, automated recovery, and health check system
 * for the RCC pipeline architecture.
 */

// Core interfaces and types
export * from './ErrorMonitoringInterfaces';

// Main monitoring components
export { ErrorMonitor, IErrorMonitor } from './ErrorMonitor';
export { AutomatedRecoverySystem } from './AutomatedRecoverySystem';
export { HealthCheckSystem } from './HealthCheckSystem';

// Integration layer
export { MonitoringIntegration } from './MonitoringIntegration';

// Configuration types
export type {
  MonitoringConfig,
  AdaptiveRecoveryConfig,
  HealthCheckConfig,
  MonitoringIntegrationConfig
} from './ErrorMonitoringInterfaces';

// Default configurations
export const DEFAULT_MONITORING_CONFIG = {
  enabled: true,
  collectionInterval: 30000, // 30 seconds
  retentionPeriod: 86400000, // 24 hours
  alertThresholds: {
    errorRate: 5, // errors per minute
    recoveryRate: 0.5, // minimum recovery rate
    averageHandlingTime: 10000, // maximum handling time
    consecutiveErrors: 3 // maximum consecutive errors
  },
  healthCheck: {
    enabled: true,
    interval: 60000, // 1 minute
    timeout: 10000, // 10 seconds
    providers: [],
    modules: []
  },
  notifications: {
    enabled: false,
    severityFilter: ['high', 'critical']
  }
};

export const DEFAULT_RECOVERY_CONFIG = {
  enabled: true,
  learningRate: 0.1,
  minConfidenceThreshold: 0.6,
  maxRecoveryAttempts: 5,
  adaptiveTimeout: true,
  performanceTracking: true,
  patternEvolution: true,
  selfHealing: true
};

export const DEFAULT_HEALTH_CHECK_CONFIG = {
  enabled: true,
  checkInterval: 30000, // 30 seconds
  timeout: 10000, // 10 seconds
  retryAttempts: 2,
  thresholds: {
    errorRate: 5, // errors per minute
    responseTime: 5000, // milliseconds
    availability: 95, // percentage (0-100)
    memoryUsage: 80, // percentage
    cpuUsage: 70 // percentage
  },
  providers: [],
  modules: [],
  anomalyDetection: {
    enabled: true,
    sensitivity: 0.7,
    windowSize: 20,
    alertThreshold: 2.5
  }
};

export const DEFAULT_INTEGRATION_CONFIG = {
  errorMonitoring: DEFAULT_MONITORING_CONFIG,
  automatedRecovery: DEFAULT_RECOVERY_CONFIG,
  healthCheck: DEFAULT_HEALTH_CHECK_CONFIG,
  unifiedDashboard: {
    enabled: true,
    port: 3001,
    updateInterval: 10000, // 10 seconds
    retentionPeriod: 86400000 // 24 hours
  },
  export: {
    enabled: true,
    formats: ['json', 'prometheus'] as const,
    endpoints: []
  },
  notifications: {
    enabled: false,
    channels: ['webhook'] as const,
    severityFilter: ['high', 'critical']
  }
};

// Factory functions
export function createErrorMonitor(
  errorHandlingCenter: any,
  strategyManager?: any,
  config = DEFAULT_MONITORING_CONFIG
): ErrorMonitor {
  return new ErrorMonitor(errorHandlingCenter, strategyManager, config);
}

export function createAutomatedRecoverySystem(
  errorHandlingCenter: any,
  strategyManager?: any,
  config = DEFAULT_RECOVERY_CONFIG
): AutomatedRecoverySystem {
  return new AutomatedRecoverySystem(errorHandlingCenter, strategyManager, config);
}

export function createHealthCheckSystem(
  errorHandlingCenter: any,
  pipelineExecutor?: any,
  config = DEFAULT_HEALTH_CHECK_CONFIG
): HealthCheckSystem {
  return new HealthCheckSystem(errorHandlingCenter, pipelineExecutor, config);
}

export function createMonitoringIntegration(
  errorHandlingCenter: any,
  strategyManager?: any,
  pipelineExecutor?: any,
  config = DEFAULT_INTEGRATION_CONFIG
): MonitoringIntegration {
  return new MonitoringIntegration(
    errorHandlingCenter,
    strategyManager,
    pipelineExecutor,
    config
  );
}

// Version information
export const MONITORING_SYSTEM_VERSION = '1.0.0';
export const MONITORING_SYSTEM_NAME = 'RCC Pipeline Monitoring System';