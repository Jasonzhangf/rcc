import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleSource, 
  ErrorClassification, 
  ErrorHandlingConfig,
  ErrorType,
  ErrorSeverity,
  ErrorSource,
  ErrorImpact,
  ErrorRecoverability,
  PolicyType,
  ResponseStatus,
  ActionType
} from '../types/ErrorHandlingCenter.types';

// Test module sources
export const TEST_MODULE_SOURCES: ModuleSource[] = [
  {
    moduleId: 'test-module-1',
    moduleName: 'TestModule1',
    version: '1.0.0',
    fileName: 'TestModule1.ts',
    lineNumber: 42
  },
  {
    moduleId: 'test-module-2',
    moduleName: 'TestModule2',
    version: '2.1.0',
    fileName: 'TestModule2.ts',
    lineNumber: 128
  },
  {
    moduleId: 'api-module',
    moduleName: 'ApiModule',
    version: '1.5.3',
    fileName: 'ApiModule.ts',
    lineNumber: 256
  }
];

// Test error classifications
export const TEST_ERROR_CLASSIFICATIONS: ErrorClassification[] = [
  {
    source: ErrorSource.MODULE,
    type: ErrorType.TECHNICAL,
    severity: ErrorSeverity.HIGH,
    impact: ErrorImpact.SINGLE_MODULE,
    recoverability: ErrorRecoverability.RECOVERABLE
  },
  {
    source: ErrorSource.NETWORK,
    type: ErrorType.BUSINESS,
    severity: ErrorSeverity.CRITICAL,
    impact: ErrorImpact.SYSTEM_WIDE,
    recoverability: ErrorRecoverability.NON_RECOVERABLE
  },
  {
    source: ErrorSource.EXTERNAL,
    type: ErrorType.RESOURCE,
    severity: ErrorSeverity.MEDIUM,
    impact: ErrorImpact.MULTIPLE_MODULE,
    recoverability: ErrorRecoverability.AUTO_RECOVERABLE
  }
];

// Test error handling configs
export const TEST_ERROR_HANDLING_CONFIGS: ErrorHandlingConfig[] = [
  {
    queueSize: 100,
    flushInterval: 5000,
    enableBatchProcessing: true,
    maxBatchSize: 10,
    enableMetrics: true,
    enableLogging: true,
    logLevel: 'debug',
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTime: 60000,
      requestVolumeThreshold: 20
    }
  },
  {
    queueSize: 50,
    flushInterval: 2000,
    enableBatchProcessing: false,
    enableMetrics: false,
    enableLogging: true,
    logLevel: 'error'
  }
];

// Test error contexts
export const createTestErrorContext = (
  moduleId: string = 'test-module-1',
  errorType: ErrorType = ErrorType.TECHNICAL,
  severity: ErrorSeverity = ErrorSeverity.HIGH
): ErrorContext => {
  const moduleSource = TEST_MODULE_SOURCES.find(source => source.moduleId === moduleId) || TEST_MODULE_SOURCES[0];
  
  return {
    errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    error: new Error(`Test error for ${moduleId}`),
    timestamp: new Date(),
    source: moduleSource,
    classification: {
      source: ErrorSource.MODULE,
      type: errorType,
      severity: severity,
      impact: ErrorImpact.SINGLE_MODULE,
      recoverability: ErrorRecoverability.RECOVERABLE
    },
    data: {
      test: true,
      metadata: {
        requestId: 'test-request-123',
        userId: 'test-user-456'
      }
    },
    config: TEST_ERROR_HANDLING_CONFIGS[0]
  };
};

// Test error responses
export const createTestErrorResponse = (
  errorId: string,
  status: ResponseStatus = ResponseStatus.SUCCESS
): ErrorResponse => {
  return {
    responseId: `response-${errorId}`,
    errorId: errorId,
    result: {
      status: status as any,
      message: 'Test error response',
      details: 'This is a test error response',
      code: 'TEST_ERROR'
    },
    timestamp: new Date(),
    processingTime: 100,
    data: {
      moduleName: 'TestModule1',
      moduleId: 'test-module-1',
      response: {
        message: 'Test response data'
      },
      config: TEST_ERROR_HANDLING_CONFIGS[0],
      metadata: {
        test: true
      }
    },
    actions: [
      {
        actionId: `action-${errorId}`,
        type: ActionType.LOG,
        target: 'test-logger',
        payload: {
          level: 'info',
          message: 'Test action executed'
        },
        priority: 'medium' as any,
        status: 'completed' as any,
        timestamp: new Date()
      }
    ],
    annotations: []
  };
};

// Test policies
export const TEST_POLICIES = [
  {
    policyId: 'retry-policy-1',
    name: 'DefaultRetryPolicy',
    policyType: PolicyType.RETRY,
    type: PolicyType.RETRY,
    conditions: [
      {
        severities: [ErrorSeverity.HIGH]
      }
    ],
    actions: [],
    enabled: true,
    priority: 70,
    config: {
      retryConfig: {
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
        retryableErrors: [
          'NETWORK_ERROR',
          'TIMEOUT_ERROR',
          'TEMPORARY_ERROR'
        ]
      }
    }
  },
  {
    policyId: 'fallback-policy-1',
    name: 'DefaultFallbackPolicy',
    policyType: PolicyType.FALLBACK,
    type: PolicyType.FALLBACK,
    conditions: [
      {
        custom: {
          isUnderConstruction: true
        }
      }
    ],
    actions: [],
    enabled: true,
    priority: 80,
    config: {
      fallbackConfig: {
        enabled: true,
        fallbackResponse: {
          message: 'Service temporarily unavailable',
          code: 'FALLBACK_RESPONSE'
        },
        timeout: 5000,
        healthCheck: true
      }
    }
  }
];

// Test routing rules
export const TEST_ROUTING_RULES = [
  {
    ruleId: 'critical-errors',
    name: 'CriticalErrorsRule',
    priority: 100,
    condition: {
      severities: [ErrorSeverity.CRITICAL]
    },
    handler: null, // Will be set in tests
    enabled: true
  },
  {
    ruleId: 'technical-errors',
    name: 'TechnicalErrorsRule',
    priority: 70,
    condition: {
      errorTypes: [ErrorType.TECHNICAL]
    },
    handler: null, // Will be set in tests
    enabled: true
  }
];

// Test templates
export const TEST_TEMPLATES = [
  {
    templateId: 'default',
    name: 'DefaultResponseTemplate',
    templateType: 'response',
    content: 'Default error response template',
    variables: {},
    enabled: true,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    category: 'default',
    conditions: [],
    result: {
      status: 'success',
      message: 'Error processed successfully',
      details: 'The error has been handled by the system',
      code: 'DEFAULT_RESPONSE'
    },
    data: {
      response: {
        message: 'The error has been logged and will be processed',
        code: 'DEFAULT_ERROR_RESPONSE'
      },
      metadata: {
        templateUsed: 'default',
        processedAt: '{{timestamp}}'
      }
    },
    cacheable: true,
    cacheTimeout: 300000,
    actions: [
      {
        actionId: 'log_error',
        type: 'log',
        target: 'system_logger',
        payload: {
          level: 'error',
          message: '{{error.message}}',
          module: '{{source.moduleName}}'
        },
        priority: 'medium' as any,
        status: 'pending' as any,
        timestamp: '{{timestamp}}'
      }
    ],
    annotations: []
  },
  {
    templateId: 'critical',
    name: 'CriticalErrorTemplate',
    templateType: 'response',
    content: 'Template for critical errors',
    variables: {},
    enabled: true,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    category: 'error',
    conditions: [
      { field: 'severity', value: 'critical', operator: 'equals' }
    ],
    result: {
      status: 'failure',
      message: 'Critical error occurred',
      details: 'A critical error has been detected and requires immediate attention',
      code: 'CRITICAL_ERROR'
    },
    data: {
      response: {
        message: 'A critical error has occurred. The system may be unstable.',
        code: 'CRITICAL_SYSTEM_ERROR'
      },
      metadata: {
        templateUsed: 'critical',
        severity: 'critical',
        requiresImmediateAttention: true
      }
    },
    cacheable: false,
    cacheTimeout: 0,
    actions: [
      {
        actionId: 'alert_critical_error',
        type: 'notify',
        target: 'critical_alert',
        payload: {
          level: 'critical',
          message: '{{error.message}}',
          module: '{{source.moduleName}}'
        },
        priority: 'critical' as any,
        status: 'pending' as any,
        timestamp: '{{timestamp}}'
      }
    ],
    annotations: []
  }
];

export const MOCK_ACTION_HANDLER = jest.fn();
export const MOCK_RESPONSE_HANDLER = jest.fn();