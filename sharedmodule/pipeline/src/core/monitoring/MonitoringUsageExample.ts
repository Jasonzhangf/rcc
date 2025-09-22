/**
 * RCC Pipeline Monitoring System Usage Example
 * RCC流水线监控系统使用示例
 *
 * Demonstrates how to integrate and use the monitoring system
 * with the RCC pipeline architecture.
 */

import { ErrorHandlingCenter as ErrorHandlingCenterType } from 'rcc-errorhandling';

// Create a simple mock for demonstration purposes
class MockErrorHandlingCenter {
  handleError(error: any, options?: any): void {
    console.log('Mock error handling:', error);
  }
  async destroy(): Promise<void> {
    // Mock implementation
  }
}
import {
  ErrorContext,
  ErrorSeverity,
  ErrorCategory
} from './ErrorMonitoringInterfaces';

import {
  MonitoringIntegration,
  DEFAULT_INTEGRATION_CONFIG,
  ErrorEvent,
  StrategyContext
} from './index';

import { StrategyManager } from '../strategies/StrategyManager';
import { ModularPipelineExecutor } from '../ModularPipelineExecutor';

/**
 * Example monitoring system setup
 * 监控系统设置示例
 */
export class MonitoringSystemExample {
  private errorHandlingCenter: MockErrorHandlingCenter;
  private strategyManager?: StrategyManager;
  private pipelineExecutor?: ModularPipelineExecutor;
  private monitoringIntegration: MonitoringIntegration;

  constructor() {
    // Initialize error handling center
    this.errorHandlingCenter = new MockErrorHandlingCenter();

    // Create monitoring integration with custom configuration
    this.monitoringIntegration = new MonitoringIntegration(
      this.errorHandlingCenter,
      undefined, // strategyManager (optional)
      undefined, // pipelineExecutor (optional)
      {
        ...DEFAULT_INTEGRATION_CONFIG,
        errorMonitoring: {
          ...DEFAULT_INTEGRATION_CONFIG.errorMonitoring,
          collectionInterval: 15000, // 15 seconds
          alertThresholds: {
            errorRate: 3, // Lower threshold for alerts
            recoveryRate: 0.6,
            averageHandlingTime: 8000,
            consecutiveErrors: 2
          }
        },
        automatedRecovery: {
          ...DEFAULT_INTEGRATION_CONFIG.automatedRecovery,
          learningRate: 0.15, // Faster learning
          maxRecoveryAttempts: 4
        },
        healthCheck: {
          ...DEFAULT_INTEGRATION_CONFIG.healthCheck,
          checkInterval: 20000, // 20 seconds
          thresholds: {
            errorRate: 3,
            responseTime: 3000,
            availability: 97,
            memoryUsage: 75,
            cpuUsage: 65
          }
        },
        unifiedDashboard: {
          ...DEFAULT_INTEGRATION_CONFIG.unifiedDashboard,
          updateInterval: 5000 // 5 seconds
        },
        notifications: {
          ...DEFAULT_INTEGRATION_CONFIG.notifications,
          enabled: true,
          channels: ['webhook'],
          severityFilter: ['high', 'critical']
        }
      },
      {
        // Event handlers for monitoring events
        onErrorRecorded: this.handleErrorRecorded.bind(this),
        onHealthStatusChanged: this.handleHealthStatusChanged.bind(this),
        onAlertTriggered: this.handleAlertTriggered.bind(this),
        onRecoveryActionExecuted: this.handleRecoveryActionExecuted.bind(this),
        onDashboardUpdated: this.handleDashboardUpdated.bind(this)
      }
    );
  }

  /**
   * Initialize the monitoring system
   * 初始化监控系统
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing RCC Pipeline Monitoring System...');

    try {
      // Initialize the monitoring integration
      await this.monitoringIntegration.initialize();

      // Start monitoring
      await this.monitoringIntegration.start();

      console.log('✅ Monitoring system initialized and started successfully');

      // Demonstrate monitoring capabilities
      await this.demonstrateMonitoringCapabilities();

    } catch (error) {
      console.error('❌ Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  /**
   * Demonstrate monitoring capabilities
   * 演示监控功能
   */
  private async demonstrateMonitoringCapabilities(): Promise<void> {
    console.log('\n📊 Demonstrating monitoring capabilities...');

    // Simulate some error events
    await this.simulateErrorEvents();

    // Wait for monitoring to process
    await this.sleep(5000);

    // Show current dashboard data
    this.showDashboardData();

    // Show comprehensive report
    this.showComprehensiveReport();

    // Demonstrate data export
    this.demonstrateDataExport();
  }

  /**
   * Simulate error events for demonstration
   * 模拟错误事件用于演示
   */
  private async simulateErrorEvents(): Promise<void> {
    console.log('\n📝 Simulating error events...');

    const sampleErrors: ErrorEvent[] = [
      {
        errorId: '',
        timestamp: 0,
        errorType: 'TimeoutError',
        errorMessage: 'Request timeout after 5000ms',
        errorStack: 'TimeoutError: Request timeout\n    at Provider.execute',
        severity: 'high' as ErrorSeverity,
        category: 'timeout' as ErrorCategory,
        moduleId: 'qwen-provider',
        moduleName: 'Qwen Provider',
        component: 'request-executor',
        operationId: 'req-123',
        sessionId: 'session-456',
        pipelineStage: 'provider-execution',
        context: {
          providerId: 'qwen',
          endpoint: 'https://api.qwen.com/v1/chat/completions',
          requestPayload: { model: 'qwen-turbo', messages: [] }
        },
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 5200
      },
      {
        errorId: '',
        timestamp: 0,
        errorType: 'AuthenticationError',
        errorMessage: 'Invalid API key provided',
        errorStack: 'AuthenticationError: Invalid API key\n    at AuthValidator.validate',
        severity: 'high' as ErrorSeverity,
        category: 'authentication' as ErrorCategory,
        moduleId: 'iflow-provider',
        moduleName: 'IFlow Provider',
        component: 'auth-validator',
        operationId: 'req-124',
        sessionId: 'session-456',
        pipelineStage: 'authentication',
        context: {
          providerId: 'iflow',
          apiKey: '***masked***',
          timestamp: Date.now()
        },
        recoveryAttempted: false,
        recoverySuccessful: false,
        handlingTime: 1500
      },
      {
        errorId: '',
        timestamp: 0,
        errorType: 'RateLimitError',
        errorMessage: 'Rate limit exceeded: 429 Too Many Requests',
        errorStack: 'RateLimitError: Rate limit exceeded\n    at RateLimiter.check',
        severity: 'medium' as ErrorSeverity,
        category: 'network' as ErrorCategory,
        moduleId: 'qwen-provider',
        moduleName: 'Qwen Provider',
        component: 'rate-limiter',
        operationId: 'req-125',
        sessionId: 'session-457',
        pipelineStage: 'rate-limiting',
        context: {
          providerId: 'qwen',
          requestsPerMinute: 60,
          currentRequests: 65
        },
        recoveryAttempted: true,
        recoverySuccessful: true,
        strategyUsed: 'retry',
        handlingTime: 8000
      }
    ];

    // Record error events
    for (const error of sampleErrors) {
      await this.monitoringIntegration.recordError(error);
      console.log(`  📝 Recorded error: ${error.errorType} for ${error.moduleId}`);
      await this.sleep(1000); // Small delay between errors
    }

    console.log(`  ✅ Recorded ${sampleErrors.length} error events`);
  }

  /**
   * Show current dashboard data
   * 显示当前仪表板数据
   */
  private showDashboardData(): void {
    console.log('\n📊 Current Dashboard Data:');
    console.log('='.repeat(60));

    const dashboard = this.monitoringIntegration.getDashboardData();

    // System Overview
    console.log('\n🖥️  System Overview:');
    console.log(`   Status: ${dashboard.systemOverview.status.toUpperCase()}`);
    console.log(`   Health Score: ${dashboard.systemOverview.score.toFixed(1)}/100`);
    console.log(`   Uptime: ${this.formatUptime(dashboard.systemOverview.uptime)}`);
    console.log(`   Last Updated: ${new Date(dashboard.systemOverview.lastUpdated).toLocaleString()}`);

    // Error Metrics
    console.log('\n📈 Error Metrics:');
    console.log(`   Total Errors: ${dashboard.errorMetrics.totalErrors}`);
    console.log(`   Error Rate: ${dashboard.errorMetrics.errorRate.toFixed(2)}/min`);
    console.log(`   Recovery Rate: ${(dashboard.errorMetrics.recoveryRate * 100).toFixed(1)}%`);
    console.log(`   Avg Handling Time: ${dashboard.errorMetrics.averageHandlingTime.toFixed(0)}ms`);

    if (dashboard.errorMetrics.topErrorTypes.length > 0) {
      console.log('\n   Top Error Types:');
      dashboard.errorMetrics.topErrorTypes.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error.type}: ${error.count} (${error.percentage.toFixed(1)}%)`);
      });
    }

    // Health Status
    console.log('\n💚 Health Status:');
    console.log(`   Providers (${dashboard.healthStatus.providers.length}):`);
    dashboard.healthStatus.providers.forEach(provider => {
      const status = provider.status === 'healthy' ? '✅' : provider.status === 'degraded' ? '⚠️' : '❌';
      console.log(`     ${status} ${provider.name}: ${provider.score.toFixed(1)}/100`);
    });

    console.log(`   Modules (${dashboard.healthStatus.modules.length}):`);
    dashboard.healthStatus.modules.forEach(module => {
      const status = module.status === 'healthy' ? '✅' : module.status === 'degraded' ? '⚠️' : '❌';
      console.log(`     ${status} ${module.name}: ${module.score.toFixed(1)}/100`);
    });

    // Recovery Status
    console.log('\n🔄 Recovery Status:');
    console.log(`   Active Sessions: ${dashboard.recovery.activeSessions}`);
    console.log(`   Total Sessions: ${dashboard.recovery.totalSessions}`);
    console.log(`   Success Rate: ${(dashboard.recovery.successRate * 100).toFixed(1)}%`);
    console.log(`   Avg Recovery Time: ${dashboard.recovery.averageRecoveryTime.toFixed(0)}ms`);

    if (dashboard.recovery.topStrategies.length > 0) {
      console.log('\n   Top Recovery Strategies:');
      dashboard.recovery.topStrategies.forEach((strategy, index) => {
        console.log(`     ${index + 1}. ${strategy.strategy}: ${(strategy.effectiveness * 100).toFixed(1)}% effective (${strategy.usage} uses)`);
      });
    }

    // Active Alerts
    console.log('\n🚨 Active Alerts:');
    const activeAlerts = dashboard.alerts.filter(alert => !alert.resolved);
    if (activeAlerts.length > 0) {
      activeAlerts.forEach((alert, index) => {
        const severity = alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : '🟡';
        console.log(`     ${severity} ${alert.type}: ${alert.message}`);
      });
    } else {
      console.log('   ✅ No active alerts');
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Show comprehensive report
   * 显示综合报告
   */
  private showComprehensiveReport(): void {
    console.log('\n📋 Comprehensive Monitoring Report:');
    console.log('='.repeat(60));

    const report = this.monitoringIntegration.getComprehensiveReport();

    console.log(`\n📊 Report Generated: ${new Date(report.generatedAt).toLocaleString()}`);

    // System Overview
    console.log('\n🖥️  System Overview:');
    console.log(`   Status: ${report.systemOverview.overallStatus.toUpperCase()}`);
    console.log(`   Health Score: ${report.systemOverview.overallScore.toFixed(1)}/100`);
    console.log(`   Healthy Providers: ${report.systemOverview.components.healthyProviders}/${report.systemOverview.components.totalProviders}`);
    console.log(`   Healthy Modules: ${report.systemOverview.components.healthyModules}/${report.systemOverview.components.totalModules}`);
    console.log(`   Active Alerts: ${report.systemOverview.components.activeAlerts}`);

    // Error Metrics Summary
    console.log('\n📈 Error Metrics Summary:');
    console.log(`   Total Errors: ${report.errorMetrics.totalErrors}`);
    console.log(`   Overall Recovery Rate: ${(report.errorMetrics.overallRecoveryRate * 100).toFixed(1)}%`);
    console.log(`   Average Handling Time: ${report.errorMetrics.averageHandlingTime.toFixed(0)}ms`);

    // Recovery Status Summary
    console.log('\n🔄 Recovery Status Summary:');
    const recoveryStatus = report.recoveryStatus.systemStatus;
    console.log(`   System Active: ${recoveryStatus.isActive ? '✅' : '❌'}`);
    console.log(`   Pattern Count: ${recoveryStatus.patterns.total}`);
    console.log(`   Pattern Success Rate: ${(recoveryStatus.patterns.averageSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Recent Session Success Rate: ${(recoveryStatus.sessions.recentSuccessRate * 100).toFixed(1)}%`);

    // Alerts Summary
    console.log('\n🚨 Alerts Summary:');
    console.log(`   Total Alerts: ${report.alerts.length}`);
    const criticalAlerts = report.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = report.alerts.filter(a => a.severity === 'high').length;
    console.log(`   Critical: ${criticalAlerts}, High: ${highAlerts}`);

    // Recommendations
    console.log('\n💡 System Recommendations:');
    if (report.recommendations.length > 0) {
      report.recommendations.forEach((recommendation, index) => {
        console.log(`   ${index + 1}. ${recommendation}`);
      });
    } else {
      console.log('   ✅ No recommendations at this time');
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Demonstrate data export capabilities
   * 演示数据导出功能
   */
  private demonstrateDataExport(): void {
    console.log('\n📤 Data Export Demonstration:');
    console.log('='.repeat(40));

    // Export as JSON
    try {
      const jsonData = this.monitoringIntegration.exportData('json');
      console.log('\n📋 JSON Export (first 200 chars):');
      console.log(jsonData.substring(0, 200) + '...');
    } catch (error) {
      console.log('❌ JSON export failed:', error);
    }

    // Export as CSV
    try {
      const csvData = this.monitoringIntegration.exportData('csv');
      console.log('\n📊 CSV Export:');
      console.log(csvData);
    } catch (error) {
      console.log('❌ CSV export failed:', error);
    }

    // Export as Prometheus
    try {
      const prometheusData = this.monitoringIntegration.exportData('prometheus');
      console.log('\n📈 Prometheus Export:');
      console.log(prometheusData);
    } catch (error) {
      console.log('❌ Prometheus export failed:', error);
    }

    console.log('\n' + '='.repeat(40));
  }

  /**
   * Event handler implementations
   * 事件处理器实现
   */

  private handleErrorRecorded(event: any): void {
    console.log(`\n📝 Error Recorded Event:`);
    console.log(`   Error ID: ${event.errorId}`);
    console.log(`   Type: ${event.errorType}`);
    console.log(`   Module: ${event.moduleId}`);
    console.log(`   Severity: ${event.severity}`);
    console.log(`   Recovery Attempted: ${event.recoveryAttempted}`);
  }

  private handleHealthStatusChanged(status: any): void {
    console.log(`\n💚 Health Status Changed:`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Score: ${status.score}`);
    console.log(`   Components: ${status.components.providers.length} providers, ${status.components.modules.length} modules`);
  }

  private handleAlertTriggered(alert: any): void {
    console.log(`\n🚨 Alert Triggered:`);
    console.log(`   Alert ID: ${alert.alertId}`);
    console.log(`   Type: ${alert.type}`);
    console.log(`   Severity: ${alert.severity}`);
    console.log(`   Message: ${alert.message}`);
  }

  private handleRecoveryActionExecuted(action: any, result: any): void {
    console.log(`\n🔄 Recovery Action Executed:`);
    console.log(`   Action ID: ${action.actionId}`);
    console.log(`   Type: ${action.type}`);
    console.log(`   Target: ${action.target}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Execution Time: ${result.executionTime}ms`);
  }

  private handleDashboardUpdated(data: any): void {
    console.log(`\n📊 Dashboard Updated:`);
    console.log(`   System Status: ${data.systemOverview.status}`);
    console.log(`   Health Score: ${data.systemOverview.score}`);
    console.log(`   Total Errors: ${data.errorMetrics.totalErrors}`);
    console.log(`   Active Alerts: ${data.alerts.filter(a => !a.resolved).length}`);
  }

  /**
   * Utility functions
   */

  private formatUptime(timestamp: number): string {
    const uptime = Date.now() - timestamp;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  public sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the monitoring system
   * 停止监控系统
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping monitoring system...');
    await this.monitoringIntegration.stop();
    console.log('✅ Monitoring system stopped');
  }

  /**
   * Get system status
   * 获取系统状态
   */
  getSystemStatus(): any {
    return this.monitoringIntegration.getSystemStatus();
  }
}

/**
 * Example usage function
 * 使用示例函数
 */
export async function runMonitoringExample(): Promise<void> {
  console.log('🚀 Starting RCC Pipeline Monitoring System Example\n');

  const monitoringExample = new MonitoringSystemExample();

  try {
    // Initialize and start monitoring
    await monitoringExample.initialize();

    // Let it run for a while to collect data
    console.log('\n⏳ Running monitoring system for 30 seconds...');
    await monitoringExample.sleep(30000);

    // Show final status
    console.log('\n📊 Final System Status:');
    const status = monitoringExample.getSystemStatus();
    console.log(JSON.stringify(status, null, 2));

  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    // Clean up
    await monitoringExample.stop();
    console.log('\n✅ Monitoring example completed');
  }
}

// Export for external use
export { MonitoringSystemExample as default };

// Run example if this file is executed directly
if (require.main === module) {
  runMonitoringExample().catch(console.error);
}