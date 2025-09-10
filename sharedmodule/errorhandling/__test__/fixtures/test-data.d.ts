import { ErrorContext, ErrorResponse, ModuleSource, ErrorClassification, ErrorHandlingConfig, ErrorType, ErrorSeverity, ResponseStatus } from '../../../../interfaces/SharedTypes';
export declare const TEST_MODULE_SOURCES: ModuleSource[];
export declare const TEST_ERROR_CLASSIFICATIONS: ErrorClassification[];
export declare const TEST_ERROR_HANDLING_CONFIGS: ErrorHandlingConfig[];
export declare const createTestErrorContext: (moduleId?: string, errorType?: ErrorType, severity?: ErrorSeverity) => ErrorContext;
export declare const createTestErrorResponse: (errorId: string, status?: ResponseStatus) => ErrorResponse;
export declare const TEST_POLICIES: ({
    policyId: string;
    name: string;
    policyType: any;
    type: any;
    conditions: {
        severities: any[];
    }[];
    actions: never[];
    enabled: boolean;
    priority: number;
    config: {
        retryConfig: {
            maxRetries: number;
            delay: number;
            backoffMultiplier: number;
            maxDelay: number;
            retryableErrors: string[];
        };
        fallbackConfig?: undefined;
    };
} | {
    policyId: string;
    name: string;
    policyType: any;
    type: any;
    conditions: {
        custom: {
            isUnderConstruction: boolean;
        };
    }[];
    actions: never[];
    enabled: boolean;
    priority: number;
    config: {
        fallbackConfig: {
            enabled: boolean;
            fallbackResponse: {
                message: string;
                code: string;
            };
            timeout: number;
            healthCheck: boolean;
        };
        retryConfig?: undefined;
    };
})[];
export declare const TEST_ROUTING_RULES: ({
    ruleId: string;
    name: string;
    priority: number;
    condition: {
        severities: any[];
        errorTypes?: undefined;
    };
    handler: null;
    enabled: boolean;
} | {
    ruleId: string;
    name: string;
    priority: number;
    condition: {
        errorTypes: any[];
        severities?: undefined;
    };
    handler: null;
    enabled: boolean;
})[];
export declare const TEST_TEMPLATES: ({
    templateId: string;
    name: string;
    templateType: string;
    content: string;
    variables: {};
    enabled: boolean;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    category: string;
    conditions: never[];
    result: {
        status: string;
        message: string;
        details: string;
        code: string;
    };
    data: {
        response: {
            message: string;
            code: string;
        };
        metadata: {
            templateUsed: string;
            processedAt: string;
            severity?: undefined;
            requiresImmediateAttention?: undefined;
        };
    };
    cacheable: boolean;
    cacheTimeout: number;
    actions: {
        actionId: string;
        type: string;
        target: string;
        payload: {
            level: string;
            message: string;
            module: string;
        };
        priority: any;
        status: any;
        timestamp: string;
    }[];
    annotations: never[];
} | {
    templateId: string;
    name: string;
    templateType: string;
    content: string;
    variables: {};
    enabled: boolean;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    category: string;
    conditions: {
        field: string;
        value: string;
        operator: string;
    }[];
    result: {
        status: string;
        message: string;
        details: string;
        code: string;
    };
    data: {
        response: {
            message: string;
            code: string;
        };
        metadata: {
            templateUsed: string;
            severity: string;
            requiresImmediateAttention: boolean;
            processedAt?: undefined;
        };
    };
    cacheable: boolean;
    cacheTimeout: number;
    actions: {
        actionId: string;
        type: string;
        target: string;
        payload: {
            level: string;
            message: string;
            module: string;
        };
        priority: any;
        status: any;
        timestamp: string;
    }[];
    annotations: never[];
})[];
export declare const MOCK_ACTION_HANDLER: jest.Mock<any, any, any>;
export declare const MOCK_RESPONSE_HANDLER: jest.Mock<any, any, any>;
