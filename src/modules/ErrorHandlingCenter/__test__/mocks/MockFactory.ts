/**
 * Mock Factory for ErrorHandlingCenter Tests
 * Provides properly structured mock objects that match interface requirements
 */

import { 
  ModuleRegistration, 
  ResponseHandler, 
  ErrorContext, 
  ErrorResponse,
  ErrorHandlingConfig,
  ModuleSource,
  ErrorClassification,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability,
  HandlingResult,
  ResponseData,
  Action,
  ActionType,
  ActionStatus,
  ActionPriority,
  ModuleAnnotation,
  AnnotationType,
  RouteCondition
} from '../../../../interfaces/SharedTypes';

/**
 * Creates a complete ModuleRegistration mock with all required properties
 */
export function createMockModuleRegistration(overrides: Partial<ModuleRegistration> = {}): ModuleRegistration {
  const baseConfig: ErrorHandlingConfig = {
    enableBatchProcessing: true,
    enableMetrics: true,
    enableLogging: true,
    queueSize: 100,
    flushInterval: 5000
  };

  return {
    moduleId: 'test-module',
    moduleName: 'TestModule',
    moduleType: 'test',
    version: '1.0.0',
    config: baseConfig,
    capabilities: ['error-handling'],
    dependencies: [],
    metadata: {},
    errorPolicies: [],
    customRules: [],
    ...overrides
  };
}

/**
 * Creates a minimal ModuleRegistration mock with only required properties
 */
export function createMinimalModuleRegistration(overrides: Partial<ModuleRegistration> = {}): ModuleRegistration {
  return {
    moduleId: 'minimal-module',
    moduleName: 'MinimalModule',
    moduleType: 'minimal',
    version: '1.0.0',
    config: {},
    capabilities: ['basic-handling'],
    ...overrides
  };
}

/**
 * Creates a complete ResponseHandler mock with all required properties
 */
export function createMockResponseHandler(overrides: Partial<ResponseHandler> = {}): jest.Mocked<ResponseHandler> {
  const mockExecute = jest.fn<Promise<ErrorResponse>, [ErrorContext]>();
  
  // Setup default successful response
  mockExecute.mockResolvedValue(createMockErrorResponse());

  const baseHandler: ResponseHandler = {
    handleId: 'mock-handler',
    name: 'Mock Handler',
    priority: 1,
    isEnabled: true,
    conditions: [],
    execute: mockExecute,
    config: {}
  };

  const mergedHandler = { ...baseHandler, ...overrides };
  return mergedHandler as jest.Mocked<ResponseHandler>;
}

/**
 * Creates a complete ErrorContext mock with all required properties
 */
export function createMockErrorContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
  const baseSource: ModuleSource = {
    moduleId: 'test-module',
    moduleName: 'TestModule',
    version: '1.0.0',
    fileName: 'test-module.ts',
    lineNumber: 42
  };

  const baseClassification: ErrorClassification = {
    source: ErrorSource.MODULE,
    type: ErrorType.TECHNICAL,
    severity: ErrorSeverity.MEDIUM,
    impact: ErrorImpact.SINGLE_MODULE,
    recoverability: ErrorRecoverability.RECOVERABLE
  };

  const baseConfig: ErrorHandlingConfig = {
    enableBatchProcessing: true,
    enableMetrics: true,
    enableLogging: true
  };

  return {
    errorId: 'test-error-1',
    error: new Error('Test error'),
    timestamp: new Date(),
    source: baseSource,
    classification: baseClassification,
    data: {},
    config: baseConfig,
    ...overrides
  };
}

/**
 * Creates a complete ErrorResponse mock with all required properties
 */
export function createMockErrorResponse(overrides: Partial<ErrorResponse> = {}): ErrorResponse {
  const baseResult: HandlingResult = {
    status: 'success' as any,
    message: 'Error handled successfully',
    details: '',
    code: 'SUCCESS'
  };

  const baseData: ResponseData = {
    moduleName: 'TestModule',
    moduleId: 'test-module',
    response: {},
    config: {
      enableBatchProcessing: true,
      enableMetrics: true,
      enableLogging: true
    },
    metadata: { processed: true }
  };

  const baseAction: Action = {
    actionId: 'test-action',
    type: ActionType.LOG,
    target: 'system_logger',
    payload: {
      level: 'info',
      message: 'Test action'
    },
    priority: ActionPriority.MEDIUM,
    status: ActionStatus.COMPLETED,
    timestamp: new Date()
  };

  const baseAnnotation: ModuleAnnotation = {
    annotationId: 'test-annotation',
    moduleInfo: {},
    type: AnnotationType.INFO,
    content: 'Test annotation',
    createdAt: new Date(),
    createdBy: 'test-system',
    related: {}
  };

  return {
    responseId: 'test-response',
    errorId: 'test-error-1',
    result: baseResult,
    timestamp: new Date(),
    processingTime: 100,
    data: baseData,
    actions: [baseAction],
    annotations: [baseAnnotation],
    ...overrides
  };
}

/**
 * Creates a complete ErrorHandlingConfig mock with all required properties
 */
export function createMockErrorHandlingConfig(overrides: Partial<ErrorHandlingConfig> = {}): ErrorHandlingConfig {
  return {
    queueSize: 100,
    flushInterval: 5000,
    enableBatchProcessing: true,
    maxBatchSize: 50,
    enableCompression: false,
    enableMetrics: true,
    enableLogging: true,
    logLevel: 'info',
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTime: 60000,
      requestVolumeThreshold: 10
    },
    ...overrides
  };
}

/**
 * Creates a complete RouteCondition mock with all required properties
 */
export function createMockRouteCondition(overrides: Partial<RouteCondition> = {}): RouteCondition {
  return {
    moduleIds: ['test-module'],
    errorTypes: [ErrorType.TECHNICAL],
    severities: [ErrorSeverity.MEDIUM],
    priorities: [ActionPriority.MEDIUM],
    custom: {},
    ...overrides
  };
}

/**
 * Creates a batch of error contexts for testing batch operations
 */
export function createMockErrorContextBatch(count: number, baseOverrides: Partial<ErrorContext> = {}): ErrorContext[] {
  return Array.from({ length: count }, (_, i) => 
    createMockErrorContext({
      ...baseOverrides,
      errorId: `${baseOverrides.errorId || 'batch-error'}-${i}`,
      error: new Error(`Batch error ${i}`)
    })
  );
}

/**
 * Creates a custom response handler with specific behavior
 */
export function createCustomMockResponseHandler(
  responseGenerator: (errorContext: ErrorContext) => Promise<ErrorResponse>,
  overrides: Partial<ResponseHandler> = {}
): jest.Mocked<ResponseHandler> {
  const mockExecute = jest.fn<Promise<ErrorResponse>, [ErrorContext]>();
  mockExecute.mockImplementation(responseGenerator);

  return createMockResponseHandler({
    execute: mockExecute,
    ...overrides
  });
}

/**
 * Creates a failing response handler for error scenario testing
 */
export function createFailingMockResponseHandler(
  error: Error = new Error('Handler execution failed'),
  overrides: Partial<ResponseHandler> = {}
): jest.Mocked<ResponseHandler> {
  const mockExecute = jest.fn<Promise<ErrorResponse>, [ErrorContext]>();
  mockExecute.mockRejectedValue(error);

  return createMockResponseHandler({
    execute: mockExecute,
    ...overrides
  });
}