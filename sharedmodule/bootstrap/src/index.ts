// Main entry point for RCC Bootstrap Service

export { BootstrapService } from './core/BootstrapService.js';
export type { IBootstrapService } from './interfaces/IBootstrapService.js';
export type { IServiceCoordinator } from './interfaces/IBootstrapService.js';
export type { IConfigManager } from './interfaces/IBootstrapService.js';
export type { IHealthMonitor } from './interfaces/IBootstrapService.js';

// Export types
export * from './types/BootstrapTypes.js';

// Re-export for convenience
export type {
  BootstrapConfig,
  ServiceConfig,
  ServiceStatus,
  SystemHealth,
  ServiceInstance,
  ServiceHealth,
  BootstrapState
} from './types/BootstrapTypes.js';