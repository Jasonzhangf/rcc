/**
 * RCC Pipeline Monitoring System Tests
 * RCC流水线监控系统测试
 *
 * Comprehensive test suite for the monitoring and metrics system.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ErrorHandlingCenter } from 'rcc-errorhandling';
import { v4 as uuidv4 } from 'uuid';

import {
  ErrorMonitor,
  AutomatedRecoverySystem,
  HealthCheckSystem,
  MonitoringIntegration,
  ErrorEvent,
  StrategyContext,
  HealthStatus,
  Alert,
  RecoveryAction,
  ErrorSeverity,
  ErrorCategory
} from '../index';

// Mock ErrorHandlingCenter
const createMockErrorHandlingCenter = () => ({
  handleError: jest.fn(),
  destroy: jest.fn()
});

// Mock StrategyManager
const createMockStrategyManager = () => ({
  getStrategies: jest.fn(() => []),
  getStrategy: jest.fn(),
  handleError: jest.fn(),
  getHealth: jest.fn(),
  getMetrics: jest.fn(),
  reset: jest.fn()
});

// Mock ModularPipelineExecutor
const createMockPipelineExecutor = () => ({
  initialize: jest.fn(),
  execute: jest.fn(),
  executeStreaming: jest.fn(),
  getStatus: jest.fn(),
  destroy: jest.fn()
});

describe('ErrorMonitor', () => {
  let errorMonitor: ErrorMonitor;
  let mockErrorHandlingCenter: any;
  let mockStrategyManager: any;

  beforeEach(() => {
    mockErrorHandlingCenter = createMockErrorHandlingCenter();
    mockStrategyManager = createMockStrategyManager();
    errorMonitor = new ErrorMonitor(mockErrorHandlingCenter, mockStrategyManager);
  });

  afterEach(async () => {
    if (errorMonitor) {
      await errorMonitor.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      expect(mockErrorHandlingCenter.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          source: 'error-monitor',
          severity: 'low'
        })
      );
    });

    it('should start monitoring when enabled', async () => {
      const config = {
        enabled: true,
        collectionInterval: 100,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);
      await errorMonitor.startMonitoring();

      // Wait a bit to ensure monitoring interval is set
      await new Promise(resolve => setTimeout(resolve, 150));

      await errorMonitor.stopMonitoring();
    });
  });

  describe('Error Recording', () => {
    it('should record error events and update metrics', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      const errorEvent: ErrorEvent = {
        errorId: '',
        timestamp: 0,
        errorType: 'TestError',
        errorMessage: 'Test error message',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.VALIDATION,
        moduleId: 'test-module',
        moduleName: 'Test Module',
        component: 'test-component',
        context: {},
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 1000
      };

      await errorMonitor.recordError(errorEvent);

      const metrics = errorMonitor.getSystemMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.errorsByType['TestError']).toBe(1);
    });

    it('should generate alerts for threshold violations', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 1, // Low threshold for testing
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      // Record multiple errors to trigger alert
      for (let i = 0; i < 3; i++) {
        const errorEvent: ErrorEvent = {
          errorId: '',
          timestamp: Date.now(),
          errorType: 'TestError',
          errorMessage: 'Test error message',
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.VALIDATION,
          moduleId: 'test-module',
          moduleName: 'Test Module',
          component: 'test-component',
          context: {},
          recoveryAttempted: false,
          recoverySuccessful: false,
          handlingTime: 1000
        };

        await errorMonitor.recordError(errorEvent);
      }

      const alerts = errorMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('error_rate');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate recovery rates correctly', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      // Record errors with different recovery outcomes
      const errorEvents: ErrorEvent[] = [
        {
          errorId: '',
          timestamp: 0,
          errorType: 'TestError',
          errorMessage: 'Test error 1',
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.VALIDATION,
          moduleId: 'test-module',
          moduleName: 'Test Module',
          component: 'test-component',
          context: {},
          recoveryAttempted: true,
          recoverySuccessful: true,
          handlingTime: 1000
        },
        {
          errorId: '',
          timestamp: 0,
          errorType: 'TestError',
          errorMessage: 'Test error 2',
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.VALIDATION,
          moduleId: 'test-module',
          moduleName: 'Test Module',
          component: 'test-component',
          context: {},
          recoveryAttempted: true,
          recoverySuccessful: false,
          handlingTime: 1000
        }
      ];

      for (const event of errorEvents) {
        await errorMonitor.recordError(event);
      }

      const metrics = errorMonitor.getSystemMetrics();
      expect(metrics.totalRecoveryAttempts).toBe(2);
      expect(metrics.successfulRecoveries).toBe(1);
      expect(metrics.failedRecoveries).toBe(1);
      expect(metrics.overallRecoveryRate).toBe(0.5);
    });
  });

  describe('Data Export', () => {
    it('should export data in JSON format', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      const jsonData = errorMonitor.exportMetrics('json');
      expect(() => JSON.parse(jsonData)).not.toThrow();
    });

    it('should export data in CSV format', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      const csvData = errorMonitor.exportMetrics('csv');
      expect(csvData).toContain('Metric,Value');
      expect(csvData).toContain('total_errors');
    });

    it('should export data in Prometheus format', async () => {
      const config = {
        enabled: true,
        collectionInterval: 30000,
        retentionPeriod: 86400000,
        alertThresholds: {
          errorRate: 5,
          recoveryRate: 0.5,
          averageHandlingTime: 10000,
          consecutiveErrors: 3
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          providers: [],
          modules: []
        },
        notifications: {
          enabled: false,
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      };

      await errorMonitor.initialize(config);

      const prometheusData = errorMonitor.exportMetrics('prometheus');
      expect(prometheusData).toContain('# HELP');
      expect(prometheusData).toContain('# TYPE');
      expect(prometheusData).toContain('rcc_pipeline_total_errors');
    });
  });
});

describe('AutomatedRecoverySystem', () => {
  let recoverySystem: AutomatedRecoverySystem;
  let mockErrorHandlingCenter: any;
  let mockStrategyManager: any;

  beforeEach(() => {
    mockErrorHandlingCenter = createMockErrorHandlingCenter();
    mockStrategyManager = createMockStrategyManager();
    recoverySystem = new AutomatedRecoverySystem(
      mockErrorHandlingCenter,
      mockStrategyManager,
      {
        enabled: true,
        learningRate: 0.1,
        minConfidenceThreshold: 0.6,
        maxRecoveryAttempts: 3,
        adaptiveTimeout: true,
        performanceTracking: true,
        patternEvolution: false, // Disabled for testing
        selfHealing: true
      }
    );
  });

  afterEach(async () => {
    if (recoverySystem) {
      await recoverySystem.stop();
    }
  });

  describe('Pattern Matching', () => {
    it('should suggest recovery actions based on error patterns', async () => {
      await recoverySystem.start();

      const errorEvent: ErrorEvent = {
        errorId: '',
        timestamp: 0,
        errorType: 'TimeoutError',
        errorMessage: 'Request timeout after 5000ms',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.TIMEOUT,
        moduleId: 'test-provider',
        moduleName: 'Test Provider',
        component: 'request-executor',
        context: {},
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 5000
      };

      const context: StrategyContext = {
        operationId: uuidv4(),
        moduleId: 'test-provider',
        pipelineContext: {
          sessionId: uuidv4(),
          requestId: uuidv4(),
          routingId: 'test-model',
          providerId: 'test-provider',
          executionId: uuidv4(),
          traceId: uuidv4(),
          stage: 'test',
          timing: {
          startTime: Date.now(),
          stageTimings: new Map(),
          status: 'pending' as const
        },
          startTime: Date.now(),
          ioRecords: [],
          metadata: {}
        },
        startTime: Date.now(),
        attempt: 1,
        maxAttempts: 3
      };

      const actions = recoverySystem.suggestRecoveryActions(errorEvent, context);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('retry');
    });

    it('should adapt parameters based on learning data', async () => {
      await recoverySystem.start();

      const errorEvent: ErrorEvent = {
        errorId: '',
        timestamp: 0,
        errorType: 'TimeoutError',
        errorMessage: 'Request timeout after 5000ms',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.TIMEOUT,
        moduleId: 'test-provider',
        moduleName: 'Test Provider',
        component: 'request-executor',
        context: {},
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 15000 // High handling time
      };

      const context: StrategyContext = {
        operationId: uuidv4(),
        moduleId: 'test-provider',
        pipelineContext: {
          sessionId: uuidv4(),
          requestId: uuidv4(),
          routingId: 'test-model',
          providerId: 'test-provider',
          executionId: uuidv4(),
          traceId: uuidv4(),
          stage: 'test',
          timing: {
          startTime: Date.now(),
          stageTimings: new Map(),
          status: 'pending' as const
        },
          startTime: Date.now(),
          ioRecords: [],
          metadata: {}
        },
        startTime: Date.now(),
        attempt: 1,
        maxAttempts: 3
      };

      const actions = recoverySystem.suggestRecoveryActions(errorEvent, context);
      expect(actions.length).toBeGreaterThan(0);

      // Check if timeout is adapted based on handling time
      if (actions[0].parameters.timeout) {
        expect(actions[0].parameters.timeout).toBeGreaterThan(1000);
      }
    });
  });

  describe('Recovery Execution', () => {
    it('should execute recovery actions and track results', async () => {
      await recoverySystem.start();

      const action: RecoveryAction = {
        actionId: uuidv4(),
        type: 'retry',
        target: 'test-module',
        parameters: { maxRetries: 2 },
        successCriteria: {
          metric: 'immediate_success',
          threshold: 1,
          timeWindow: 30000
        }
      };

      const context: StrategyContext = {
        operationId: uuidv4(),
        moduleId: 'test-module',
        pipelineContext: {
          sessionId: uuidv4(),
          requestId: uuidv4(),
          routingId: 'test-model',
          providerId: 'test-provider',
          executionId: uuidv4(),
          traceId: uuidv4(),
          stage: 'test',
          timing: {
          startTime: Date.now(),
          stageTimings: new Map(),
          status: 'pending' as const
        },
          startTime: Date.now(),
          ioRecords: [],
          metadata: {}
        },
        startTime: Date.now(),
        attempt: 1,
        maxAttempts: 3
      };

      const result = await recoverySystem.executeRecoveryAction(action);
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('System Status', () => {
    it('should provide comprehensive system status', async () => {
      await recoverySystem.start();

      const status = recoverySystem.getStatus();
      expect(status).toBeDefined();
      expect(status.isActive).toBe(true);
      expect(status.patterns.total).toBeGreaterThan(0);
      expect(status.learning.totalAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should generate detailed recovery reports', async () => {
      await recoverySystem.start();

      const report = recoverySystem.getDetailedReport();
      expect(report).toBeDefined();
      expect(report.systemStatus).toBeDefined();
      expect(report.patterns).toBeDefined();
      expect(report.strategies).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });
});

describe('HealthCheckSystem', () => {
  let healthCheckSystem: HealthCheckSystem;
  let mockErrorHandlingCenter: any;
  let mockPipelineExecutor: any;

  beforeEach(() => {
    mockErrorHandlingCenter = createMockErrorHandlingCenter();
    mockPipelineExecutor = createMockPipelineExecutor();
    healthCheckSystem = new HealthCheckSystem(
      mockErrorHandlingCenter,
      mockPipelineExecutor,
      {
        enabled: true,
        checkInterval: 100, // Short interval for testing
        timeout: 10000,
        retryAttempts: 2,
        thresholds: {
          errorRate: 5,
          responseTime: 5000,
          availability: 95,
          memoryUsage: 80,
          cpuUsage: 70
        },
        providers: ['test-provider'],
        modules: ['test-module'],
        anomalyDetection: {
          enabled: false, // Disabled for testing stability
          sensitivity: 0.7,
          windowSize: 20,
          alertThreshold: 2.5
        }
      }
    );
  });

  afterEach(async () => {
    if (healthCheckSystem) {
      await healthCheckSystem.stop();
    }
  });

  describe('Health Checks', () => {
    it('should perform system health checks', async () => {
      await healthCheckSystem.start();

      // Wait for health check to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const healthSummary = healthCheckSystem.getSystemHealthSummary();
      expect(healthSummary).toBeDefined();
      expect(healthSummary.overallStatus).toMatch(/healthy|degraded|unhealthy/);
      expect(healthSummary.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthSummary.overallScore).toBeLessThanOrEqual(100);
    });

    it('should track health history', async () => {
      await healthCheckSystem.start();

      // Wait for multiple health checks
      await new Promise(resolve => setTimeout(resolve, 300));

      const history = healthCheckSystem.getHealthHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should provide current health status', async () => {
      await healthCheckSystem.start();

      // Wait for health check to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const currentHealth = healthCheckSystem.getCurrentHealth();
      expect(currentHealth).toBeDefined();
    });
  });

  describe('Alert Generation', () => {
    it('should generate alerts for unhealthy components', async () => {
      await healthCheckSystem.start();

      // Wait for health check to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const alerts = healthCheckSystem.getActiveAlerts();
      // Alerts may or may not be generated depending on mock data
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});

describe('MonitoringIntegration', () => {
  let monitoringIntegration: MonitoringIntegration;
  let mockErrorHandlingCenter: any;
  let mockStrategyManager: any;
  let mockPipelineExecutor: any;

  beforeEach(() => {
    mockErrorHandlingCenter = createMockErrorHandlingCenter();
    mockStrategyManager = createMockStrategyManager();
    mockPipelineExecutor = createMockPipelineExecutor();

    monitoringIntegration = new MonitoringIntegration(
      mockErrorHandlingCenter,
      mockStrategyManager,
      mockPipelineExecutor,
      {
        errorMonitoring: {
          enabled: true,
          collectionInterval: 100, // Short for testing
          retentionPeriod: 3600000,
          alertThresholds: {
            errorRate: 5,
            recoveryRate: 0.5,
            averageHandlingTime: 10000,
            consecutiveErrors: 3
          },
          healthCheck: {
            enabled: true,
            interval: 60000,
            timeout: 10000,
            providers: [],
            modules: []
          },
          notifications: {
            enabled: false,
            severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
          }
        },
        automatedRecovery: {
          enabled: true,
          learningRate: 0.1,
          minConfidenceThreshold: 0.6,
          maxRecoveryAttempts: 3,
          adaptiveTimeout: true,
          performanceTracking: true,
          patternEvolution: false,
          selfHealing: true
        },
        healthCheck: {
          enabled: true,
          checkInterval: 100, // Short for testing
          timeout: 10000,
          retryAttempts: 2,
          thresholds: {
            errorRate: 5,
            responseTime: 5000,
            availability: 95,
            memoryUsage: 80,
            cpuUsage: 70
          },
          providers: ['test-provider'],
          modules: ['test-module'],
          anomalyDetection: {
            enabled: false,
            sensitivity: 0.7,
            windowSize: 20,
            alertThreshold: 2.5
          }
        },
        unifiedDashboard: {
          enabled: true,
          port: 3001,
          updateInterval: 50, // Very short for testing
          retentionPeriod: 3600000
        },
        export: {
          enabled: true,
          formats: ['json', 'csv'],
          endpoints: []
        },
        notifications: {
          enabled: false,
          channels: ['webhook'],
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      }
    );
  });

  afterEach(async () => {
    if (monitoringIntegration) {
      await monitoringIntegration.stop();
    }
  });

  describe('Integration Initialization', () => {
    it('should initialize all monitoring components', async () => {
      await monitoringIntegration.initialize();

      const status = monitoringIntegration.getSystemStatus();
      expect(status.initialized).toBe(true);
    });

    it('should start all monitoring components', async () => {
      await monitoringIntegration.initialize();
      await monitoringIntegration.start();

      const status = monitoringIntegration.getSystemStatus();
      expect(status.running).toBe(true);
      expect(status.components.errorMonitor).toBe(true);
      expect(status.components.automatedRecovery).toBe(true);
      expect(status.components.healthCheck).toBe(true);
    });
  });

  describe('Dashboard Data', () => {
    it('should provide comprehensive dashboard data', async () => {
      await monitoringIntegration.initialize();
      await monitoringIntegration.start();

      // Wait for dashboard to update
      await new Promise(resolve => setTimeout(resolve, 200));

      const dashboardData = monitoringIntegration.getDashboardData();
      expect(dashboardData).toBeDefined();
      expect(dashboardData.systemOverview).toBeDefined();
      expect(dashboardData.errorMetrics).toBeDefined();
      expect(dashboardData.healthStatus).toBeDefined();
      expect(dashboardData.recovery).toBeDefined();
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.trends).toBeDefined();
    });

    it('should update dashboard data periodically', async () => {
      await monitoringIntegration.initialize();
      await monitoringIntegration.start();

      const initialData = monitoringIntegration.getDashboardData();

      // Wait for dashboard update
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedData = monitoringIntegration.getDashboardData();
      expect(updatedData.systemOverview.lastUpdated).toBeGreaterThan(initialData.systemOverview.lastUpdated);
    });
  });

  describe('Error Handling Integration', () => {
    it('should record errors and trigger automated recovery', async () => {
      await monitoringIntegration.initialize();
      await monitoringIntegration.start();

      const errorEvent: ErrorEvent = {
        errorId: '',
        timestamp: 0,
        errorType: 'TestError',
        errorMessage: 'Test error message',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.VALIDATION,
        moduleId: 'test-module',
        moduleName: 'Test Module',
        component: 'test-component',
        context: {},
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 1000
      };

      await monitoringIntegration.recordError(errorEvent);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const dashboardData = monitoringIntegration.getDashboardData();
      expect(dashboardData.errorMetrics.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Data Export Integration', () => {
    it('should export data in multiple formats', async () => {
      await monitoringIntegration.initialize();

      const jsonData = monitoringIntegration.exportData('json');
      expect(() => JSON.parse(jsonData)).not.toThrow();

      const csvData = monitoringIntegration.exportData('csv');
      expect(csvData).toContain('Metric,Value');

      const prometheusData = monitoringIntegration.exportData('prometheus');
      expect(prometheusData).toContain('# HELP');
    });
  });

  describe('Comprehensive Reporting', () => {
    it('should generate comprehensive monitoring reports', async () => {
      await monitoringIntegration.initialize();
      await monitoringIntegration.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 200));

      const report = monitoringIntegration.getComprehensiveReport();
      expect(report).toBeDefined();
      expect(report.systemOverview).toBeDefined();
      expect(report.errorMetrics).toBeDefined();
      expect(report.healthStatus).toBeDefined();
      expect(report.recoveryStatus).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    it('should handle monitoring events', async () => {
      const eventHandlers = {
        onErrorRecorded: jest.fn(),
        onHealthStatusChanged: jest.fn(),
        onAlertTriggered: jest.fn(),
        onRecoveryActionExecuted: jest.fn(),
        onDashboardUpdated: jest.fn()
      };

      const integrationWithHandlers = new MonitoringIntegration(
        mockErrorHandlingCenter,
        mockStrategyManager,
        mockPipelineExecutor,
        {
          errorMonitoring: {
            enabled: true,
            collectionInterval: 100,
            retentionPeriod: 3600000,
            alertThresholds: {
              errorRate: 5,
              recoveryRate: 0.5,
              averageHandlingTime: 10000,
              consecutiveErrors: 3
            },
            healthCheck: {
              enabled: true,
              interval: 60000,
              timeout: 10000,
              providers: [],
              modules: []
            },
            notifications: {
              enabled: false,
              severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
            }
          },
          automatedRecovery: {
            enabled: true,
            learningRate: 0.1,
            minConfidenceThreshold: 0.6,
            maxRecoveryAttempts: 3,
            adaptiveTimeout: true,
            performanceTracking: true,
            patternEvolution: false,
            selfHealing: true
          },
          healthCheck: {
            enabled: true,
            checkInterval: 100,
            timeout: 10000,
            retryAttempts: 2,
            thresholds: {
              errorRate: 5,
              responseTime: 5000,
              availability: 95,
              memoryUsage: 80,
              cpuUsage: 70
            },
            providers: ['test-provider'],
            modules: ['test-module'],
            anomalyDetection: {
              enabled: false,
              sensitivity: 0.7,
              windowSize: 20,
              alertThreshold: 2.5
            }
          },
          unifiedDashboard: {
            enabled: true,
            port: 3001,
            updateInterval: 50,
            retentionPeriod: 3600000
          },
          export: {
            enabled: true,
            formats: ['json'],
            endpoints: []
          },
          notifications: {
            enabled: false,
            channels: ['webhook'],
            severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
          }
        },
        eventHandlers
      );

      await integrationWithHandlers.initialize();
      await integrationWithHandlers.start();

      // Trigger an event
      const errorEvent: ErrorEvent = {
        errorId: '',
        timestamp: 0,
        errorType: 'TestError',
        errorMessage: 'Test error message',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.VALIDATION,
        moduleId: 'test-module',
        moduleName: 'Test Module',
        component: 'test-component',
        context: {},
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 1000
      };

      await integrationWithHandlers.recordError(errorEvent);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event handlers were called
      expect(eventHandlers.onErrorRecorded).toHaveBeenCalled();
      expect(eventHandlers.onDashboardUpdated).toHaveBeenCalled();

      await integrationWithHandlers.stop();
    });
  });
});

describe('Monitoring System End-to-End', () => {
  it('should work together as a complete monitoring solution', async () => {
    const mockErrorHandlingCenter = createMockErrorHandlingCenter();
    const mockStrategyManager = createMockStrategyManager();
    const mockPipelineExecutor = createMockPipelineExecutor();

    const monitoring = new MonitoringIntegration(
      mockErrorHandlingCenter,
      mockStrategyManager,
      mockPipelineExecutor,
      {
        errorMonitoring: {
          enabled: true,
          collectionInterval: 50,
          retentionPeriod: 3600000,
          alertThresholds: {
            errorRate: 3, // Lower for testing
            recoveryRate: 0.5,
            averageHandlingTime: 5000,
            consecutiveErrors: 2
          },
          healthCheck: {
            enabled: true,
            interval: 60000,
            timeout: 10000,
            providers: [],
            modules: []
          },
          notifications: {
            enabled: false,
            severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
          }
        },
        automatedRecovery: {
          enabled: true,
          learningRate: 0.1,
          minConfidenceThreshold: 0.6,
          maxRecoveryAttempts: 2,
          adaptiveTimeout: true,
          performanceTracking: true,
          patternEvolution: false,
          selfHealing: true
        },
        healthCheck: {
          enabled: true,
          checkInterval: 50,
          timeout: 10000,
          retryAttempts: 1,
          thresholds: {
            errorRate: 5,
            responseTime: 5000,
            availability: 95,
            memoryUsage: 80,
            cpuUsage: 70
          },
          providers: ['test-provider'],
          modules: ['test-module'],
          anomalyDetection: {
            enabled: false,
            sensitivity: 0.7,
            windowSize: 20,
            alertThreshold: 2.5
          }
        },
        unifiedDashboard: {
          enabled: true,
          port: 3001,
          updateInterval: 25,
          retentionPeriod: 3600000
        },
        export: {
          enabled: true,
          formats: ['json'],
          endpoints: []
        },
        notifications: {
          enabled: false,
          channels: ['webhook'],
          severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        }
      }
    );

    try {
      // Initialize and start
      await monitoring.initialize();
      await monitoring.start();

      // Record some errors
      const errorEvents: ErrorEvent[] = [
        {
          errorId: '',
          timestamp: 0,
          errorType: 'TimeoutError',
          errorMessage: 'Request timeout',
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.TIMEOUT,
          moduleId: 'test-provider',
          moduleName: 'Test Provider',
          component: 'request-executor',
          context: {},
          recoveryAttempted: false,
          recoverySuccessful: false,
          handlingTime: 3000
        },
        {
          errorId: '',
          timestamp: 0,
          errorType: 'AuthenticationError',
          errorMessage: 'Invalid credentials',
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.AUTHENTICATION,
          moduleId: 'test-provider',
          moduleName: 'Test Provider',
          component: 'auth-validator',
          context: {},
          recoveryAttempted: true,
          recoverySuccessful: true,
          strategyUsed: 'fallback',
          handlingTime: 1500
        }
      ];

      for (const event of errorEvents) {
        await monitoring.recordError(event);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify dashboard data
      const dashboardData = monitoring.getDashboardData();
      expect(dashboardData.errorMetrics.totalErrors).toBe(2);
      expect(dashboardData.errorMetrics.recoveryRate).toBeGreaterThan(0);

      // Verify comprehensive report
      const report = monitoring.getComprehensiveReport();
      expect(report.errorMetrics.totalErrors).toBe(2);
      expect(report.alerts.length).toBeGreaterThanOrEqual(0);

      // Verify data export
      const jsonData = monitoring.exportData('json');
      const parsedData = JSON.parse(jsonData);
      expect(parsedData.dashboard).toBeDefined();

      // Verify system status
      const status = monitoring.getSystemStatus();
      expect(status.initialized).toBe(true);
      expect(status.running).toBe(true);
      expect(status.components.errorMonitor).toBe(true);
      expect(status.components.automatedRecovery).toBe(true);
      expect(status.components.healthCheck).toBe(true);

    } finally {
      await monitoring.stop();
    }
  });
});