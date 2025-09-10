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
export { ErrorInterfaceGateway } from './src/components/ErrorInterfaceGateway';
export { ErrorQueueManager } from './src/components/ErrorQueueManager';
export { ResponseRouterEngine } from './src/components/ResponseRouterEngine';
export { ErrorClassifier } from './src/components/ErrorClassifier';
export { ResponseExecutor } from './src/components/ResponseExecutor';
export { ResponseTemplateManager } from './src/components/ResponseTemplateManager';
export { ModuleRegistryManager } from './src/components/ModuleRegistryManager';
export { PolicyEngine } from './src/components/PolicyEngine';
export { IErrorHandlingCenter } from './interfaces/IErrorHandlingCenter.interface';
export { ErrorHandlingCenterConstants } from './constants/ErrorHandlingCenter.constants';
export type { ErrorContext, ErrorResponse, ModuleRegistration, ResponseHandler, ErrorClassification, ModuleSource, ErrorHandlingConfig, HandlingResult, ResponseData, Action, ModuleAnnotation, RoutingRule, Template, ResponseTemplate, ErrorQueueManager as ErrorQueueManagerInterface, ResponseRouterEngine as ResponseRouterEngineInterface, ErrorClassifier as ErrorClassifierInterface } from '../SharedTypes';
export declare const ErrorHandlingCenterVersion = "1.0.0";
declare const _default: {
    ErrorInterfaceGateway: any;
    ErrorQueueManager: any;
    ResponseRouterEngine: any;
    ErrorClassifier: any;
    ResponseExecutor: any;
    ResponseTemplateManager: any;
    ModuleRegistryManager: any;
    PolicyEngine: any;
    IErrorHandlingCenter: any;
    ErrorHandlingCenterConstants: any;
    version: string;
};
export default _default;
