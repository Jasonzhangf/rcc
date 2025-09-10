/**
 * Mock Factory for ErrorHandlingCenter Tests
 * Provides properly structured mock objects that match interface requirements
 */
import { ModuleRegistration, ResponseHandler, ErrorContext, ErrorResponse, ErrorHandlingConfig, RouteCondition } from '../../../../interfaces/SharedTypes';
/**
 * Creates a complete ModuleRegistration mock with all required properties
 */
export declare function createMockModuleRegistration(overrides?: Partial<ModuleRegistration>): ModuleRegistration;
/**
 * Creates a minimal ModuleRegistration mock with only required properties
 */
export declare function createMinimalModuleRegistration(overrides?: Partial<ModuleRegistration>): ModuleRegistration;
/**
 * Creates a complete ResponseHandler mock with all required properties
 */
export declare function createMockResponseHandler(overrides?: Partial<ResponseHandler>): jest.Mocked<ResponseHandler>;
/**
 * Creates a complete ErrorContext mock with all required properties
 */
export declare function createMockErrorContext(overrides?: Partial<ErrorContext>): ErrorContext;
/**
 * Creates a complete ErrorResponse mock with all required properties
 */
export declare function createMockErrorResponse(overrides?: Partial<ErrorResponse>): ErrorResponse;
/**
 * Creates a complete ErrorHandlingConfig mock with all required properties
 */
export declare function createMockErrorHandlingConfig(overrides?: Partial<ErrorHandlingConfig>): ErrorHandlingConfig;
/**
 * Creates a complete RouteCondition mock with all required properties
 */
export declare function createMockRouteCondition(overrides?: Partial<RouteCondition>): RouteCondition;
/**
 * Creates a batch of error contexts for testing batch operations
 */
export declare function createMockErrorContextBatch(count: number, baseOverrides?: Partial<ErrorContext>): ErrorContext[];
/**
 * Creates a custom response handler with specific behavior
 */
export declare function createCustomMockResponseHandler(responseGenerator: (errorContext: ErrorContext) => Promise<ErrorResponse>, overrides?: Partial<ResponseHandler>): jest.Mocked<ResponseHandler>;
/**
 * Creates a failing response handler for error scenario testing
 */
export declare function createFailingMockResponseHandler(error?: Error, overrides?: Partial<ResponseHandler>): jest.Mocked<ResponseHandler>;
