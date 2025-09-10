export declare const ERROR_HANDLING_CENTER_VERSION = "1.0.0";
export declare const ERROR_HANDLING_CENTER_NAME = "ErrorHandlingCenter";
export declare const DEFAULT_QUEUE_SIZE = 1000;
export declare const MAX_QUEUE_SIZE = 10000;
export declare const QUEUE_FLUSH_INTERVAL = 5000;
export declare const ERROR_HANDLING_MODES: {
    readonly BLOCKING: "blocking";
    readonly NON_BLOCKING: "non-blocking";
    readonly BATCH: "batch";
};
export declare const ERROR_SEVERITY_LEVELS: {
    readonly CRITICAL: "critical";
    readonly HIGH: "high";
    readonly MEDIUM: "medium";
    readonly LOW: "low";
};
export declare const ERROR_TYPES: {
    readonly BUSINESS: "business";
    readonly TECHNICAL: "technical";
    readonly CONFIGURATION: "configuration";
    readonly RESOURCE: "resource";
    readonly NETWORK: "network";
    readonly DEPENDENCY: "dependency";
};
export declare const ERROR_SOURCES: {
    readonly MODULE: "module";
    readonly SYSTEM: "system";
    readonly EXTERNAL: "external";
    readonly UNKNOWN: "unknown";
};
export declare const RESPONSE_TYPES: {
    readonly IGNORE: "ignore";
    readonly LOG: "log";
    readonly RETRY: "retry";
    readonly FALLBACK: "fallback";
    readonly CIRCUIT_BREAK: "circuit_break";
    readonly NOTIFICATION: "notification";
};
export declare const DEFAULT_ERROR_HANDLING_CONFIG: {
    queueSize: number;
    flushInterval: number;
    enableBatchProcessing: boolean;
    maxBatchSize: number;
    enableCompression: boolean;
    enableMetrics: boolean;
    enableLogging: boolean;
    logLevel: string;
    retryPolicy: {
        maxRetries: number;
        retryDelay: number;
        backoffMultiplier: number;
        maxRetryDelay: number;
    };
    circuitBreaker: {
        failureThreshold: number;
        recoveryTime: number;
        requestVolumeThreshold: number;
    };
};
export declare const ERROR_HANDLING_CENTER_CONSTANTS: {
    VERSION: string;
    NAME: string;
    DEFAULT_QUEUE_SIZE: number;
    MAX_QUEUE_SIZE: number;
    QUEUE_FLUSH_INTERVAL: number;
    ERROR_HANDLING_MODES: {
        readonly BLOCKING: "blocking";
        readonly NON_BLOCKING: "non-blocking";
        readonly BATCH: "batch";
    };
    ERROR_SEVERITY_LEVELS: {
        readonly CRITICAL: "critical";
        readonly HIGH: "high";
        readonly MEDIUM: "medium";
        readonly LOW: "low";
    };
    ERROR_TYPES: {
        readonly BUSINESS: "business";
        readonly TECHNICAL: "technical";
        readonly CONFIGURATION: "configuration";
        readonly RESOURCE: "resource";
        readonly NETWORK: "network";
        readonly DEPENDENCY: "dependency";
    };
    ERROR_SOURCES: {
        readonly MODULE: "module";
        readonly SYSTEM: "system";
        readonly EXTERNAL: "external";
        readonly UNKNOWN: "unknown";
    };
    RESPONSE_TYPES: {
        readonly IGNORE: "ignore";
        readonly LOG: "log";
        readonly RETRY: "retry";
        readonly FALLBACK: "fallback";
        readonly CIRCUIT_BREAK: "circuit_break";
        readonly NOTIFICATION: "notification";
    };
    DEFAULT_ERROR_HANDLING_CONFIG: {
        queueSize: number;
        flushInterval: number;
        enableBatchProcessing: boolean;
        maxBatchSize: number;
        enableCompression: boolean;
        enableMetrics: boolean;
        enableLogging: boolean;
        logLevel: string;
        retryPolicy: {
            maxRetries: number;
            retryDelay: number;
            backoffMultiplier: number;
            maxRetryDelay: number;
        };
        circuitBreaker: {
            failureThreshold: number;
            recoveryTime: number;
            requestVolumeThreshold: number;
        };
    };
};
