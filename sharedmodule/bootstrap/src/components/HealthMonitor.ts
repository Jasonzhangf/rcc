// Health Monitor Component for Bootstrap Service

import { ServiceHealth } from '../types/BootstrapTypes';

/**
 * Health Monitor tracks and manages service health status
 * Provides health check capabilities and system health aggregation
 */
export class HealthMonitor {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();
  
  /**
   * Register health check for a service
   */
  registerHealthCheck(serviceId: string, healthCheck: () => Promise<boolean>): void {
    console.log(`Registering health check for service: ${serviceId}`);
    this.healthChecks.set(serviceId, healthCheck);
  }
  
  /**
   * Perform health check for a specific service
   */
  async checkServiceHealth(serviceId: string): Promise<boolean> {
    const healthCheck = this.healthChecks.get(serviceId);
    if (!healthCheck) {
      throw new Error(`No health check registered for service: ${serviceId}`);
    }
    
    try {
      const isHealthy = await healthCheck();
      this.updateHealthStatus(serviceId, isHealthy);
      return isHealthy;
    } catch (error) {
      this.updateHealthStatus(serviceId, false, error);
      return false;
    }
  }
  
  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<ServiceHealth> {
    console.log('Getting system health status');
    // Implementation would aggregate all service health statuses
    return {
      status: 'healthy',
      checks: {},
      timestamp: Date.now()
    };
  }
  
  /**
   * Start periodic health monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    console.log(`Starting health monitoring with interval: ${intervalMs}ms`);
    // Implementation would start periodic health checks
  }
  
  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    console.log('Stopping health monitoring');
    // Implementation would stop periodic health checks
  }
  
  /**
   * Get health status for all services
   */
  getAllHealthStatus(): Record<string, ServiceHealth> {
    const result: Record<string, ServiceHealth> = {};
    this.healthStatus.forEach((status, serviceId) => {
      result[serviceId] = status;
    });
    return result;
  }
  
  /**
   * Update health status for a service
   */
  private updateHealthStatus(serviceId: string, isHealthy: boolean, error?: any): void {
    const currentStatus = this.healthStatus.get(serviceId) || {
      status: 'unknown',
      checks: {},
      timestamp: Date.now()
    };
    
    currentStatus.checks[serviceId] = isHealthy;
    currentStatus.timestamp = Date.now();
    
    if (error) {
      currentStatus.errors = currentStatus.errors || [];
      currentStatus.errors.push(error instanceof Error ? error.message : String(error));
    }
    
    this.healthStatus.set(serviceId, currentStatus);
  }
}