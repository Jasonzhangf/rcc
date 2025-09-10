/**
 * ErrorHandlingCenter - A comprehensive error handling and response management system
 * 
 * This module provides a centralized error handling system with the following components:
 * - ErrorInterfaceGateway: Main entry point for external error requests
 * - ErrorQueueManager: Manages error queue and priority processing
 * - ResponseRouterEngine: Routes errors to appropriate handlers
 * - ErrorClassifier: Classifies errors by type and severity
 * - ResponseExecutor: Executes error response actions
 * - ResponseTemplateManager: Manages response templates
 * - ModuleRegistryManager: Manages module registration
 * - PolicyEngine: Enforces error handling policies
 */

// Main components
export { ErrorInterfaceGateway } from './src/components/ErrorInterfaceGateway';
export { ErrorQueueManager } from './src/components/ErrorQueueManager';
export { ResponseRouterEngine } from './src/components/ResponseRouterEngine';
export { ErrorClassifier } from './src/components/ErrorClassifier';
export { ResponseExecutor } from './src/components/ResponseExecutor';
export { ResponseTemplateManager } from './src/components/ResponseTemplateManager';
export { ModuleRegistryManager } from './src/components/ModuleRegistryManager';
export { PolicyEngine } from './src/components/PolicyEngine';

// Interfaces
export { IErrorHandlingCenter } from './interfaces/IErrorHandlingCenter.interface';

// Constants
export { ErrorHandlingCenterConstants } from './constants/ErrorHandlingCenter.constants';

// Types (re-export from SharedTypes)
export type {
  ErrorContext,
  ErrorResponse,
  ModuleRegistration,
  ResponseHandler,
  ErrorClassification,
  ModuleSource,
  ErrorHandlingConfig,
  HandlingResult,
  ResponseData,
  Action,
  ModuleAnnotation,
  RoutingRule,
  Template,
  ResponseTemplate,
  ErrorQueueManager as ErrorQueueManagerInterface,
  ResponseRouterEngine as ResponseRouterEngineInterface,
  ErrorClassifier as ErrorClassifierInterface
} from '../SharedTypes';

// Version info
export const ErrorHandlingCenterVersion = '1.0.0';

// Default export
export default {
  ErrorInterfaceGateway,
  ErrorQueueManager,
  ResponseRouterEngine,
  ErrorClassifier,
  ResponseExecutor,
  ResponseTemplateManager,
  ModuleRegistryManager,
  PolicyEngine,
  IErrorHandlingCenter,
  ErrorHandlingCenterConstants,
  version: ErrorHandlingCenterVersion
};