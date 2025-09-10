/**
 * Complete pipeline system configuration
 * This file exports the complete configuration for the pipeline system
 */
export declare const COMPLETE_ASSEMBLY_TABLE_CONFIG: {
    version: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        description: string;
        author: string;
    };
    routingRules: ({
        ruleId: string;
        name: string;
        priority: number;
        enabled: boolean;
        conditions: {
            field: string;
            operator: string;
            value: string;
        }[];
        pipelineSelection: {
            strategy: string;
            weights: {
                "llm-chat-primary": number;
                "llm-chat-backup": number;
                "llm-completion-primary"?: undefined;
                "llm-completion-backup"?: undefined;
            };
        };
        moduleFilters: never[];
        dynamicConfig: {
            enableAdaptiveRouting: boolean;
            performanceThresholds: {
                maxResponseTime: number;
                minSuccessRate: number;
                maxErrorRate: number;
            };
        };
    } | {
        ruleId: string;
        name: string;
        priority: number;
        enabled: boolean;
        conditions: {
            field: string;
            operator: string;
            value: string;
        }[];
        pipelineSelection: {
            strategy: string;
            weights: {
                "llm-completion-primary": number;
                "llm-completion-backup": number;
                "llm-chat-primary"?: undefined;
                "llm-chat-backup"?: undefined;
            };
        };
        moduleFilters: never[];
        dynamicConfig: {
            enableAdaptiveRouting: boolean;
            performanceThresholds: {
                maxResponseTime: number;
                minSuccessRate: number;
                maxErrorRate: number;
            };
        };
    })[];
    pipelineTemplates: ({
        templateId: string;
        name: string;
        description: string;
        version: string;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
            priority: number;
            enabled: boolean;
        };
        moduleAssembly: {
            moduleInstances: ({
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        inputProtocol: string;
                        outputProtocol: string;
                        enableFieldMapping: boolean;
                        customMappings: {
                            model: string;
                            messages: string;
                        };
                        strategy?: undefined;
                        models?: undefined;
                        fallbackModels?: undefined;
                        format?: undefined;
                        enableStreaming?: undefined;
                        includeUsage?: undefined;
                    };
                    dependencies: never[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy: {
                        maxRetries: number;
                        baseDelay: number;
                        maxDelay: number;
                        backoffMultiplier: number;
                        jitter: boolean;
                    };
                    circuitBreaker: {
                        failureThreshold: number;
                        recoveryTime: number;
                        requestVolumeThreshold: number;
                        timeout: number;
                    };
                    healthCheck: {
                        enabled: boolean;
                        interval: number;
                        timeout: number;
                    };
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        strategy: string;
                        models: {
                            "gpt-4": {
                                cost: number;
                                priority: number;
                            };
                            "claude-3": {
                                cost: number;
                                priority: number;
                            };
                        };
                        fallbackModels: string[];
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                        customMappings?: undefined;
                        format?: undefined;
                        enableStreaming?: undefined;
                        includeUsage?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy: {
                        maxRetries: number;
                        baseDelay: number;
                        maxDelay: number;
                        backoffMultiplier: number;
                        jitter: boolean;
                    };
                    circuitBreaker: {
                        failureThreshold: number;
                        recoveryTime: number;
                        requestVolumeThreshold: number;
                        timeout: number;
                    };
                    healthCheck?: undefined;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        format: string;
                        enableStreaming: boolean;
                        includeUsage: boolean;
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                        customMappings?: undefined;
                        strategy?: undefined;
                        models?: undefined;
                        fallbackModels?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy?: undefined;
                    circuitBreaker?: undefined;
                    healthCheck?: undefined;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            })[];
            connections: {
                id: string;
                from: string;
                to: string;
                type: string;
                dataMapping: {
                    sourcePath: string;
                    targetPath: string;
                    required: boolean;
                };
            }[];
            dataMappings: {
                sourcePath: string;
                targetPath: string;
                required: boolean;
            }[];
            conditions: never[];
        };
        executionStrategy: {
            mode: string;
            timeout: number;
            retryPolicy: {
                maxRetries: number;
                baseDelay: number;
                maxDelay: number;
                backoffMultiplier: number;
                jitter: boolean;
            };
        };
        dataFlow: {
            inputSchema: {
                type: string;
                properties: {
                    model: {
                        type: string;
                    };
                    messages: {
                        type: string;
                    };
                    prompt?: undefined;
                };
                required: string[];
            };
            outputSchema: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    choices: {
                        type: string;
                    };
                    usage: {
                        type: string;
                    };
                };
            };
            validation: {
                enabled: boolean;
                strict: boolean;
            };
        };
    } | {
        templateId: string;
        name: string;
        description: string;
        version: string;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
            priority: number;
            enabled: boolean;
        };
        moduleAssembly: {
            moduleInstances: ({
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        inputProtocol: string;
                        outputProtocol: string;
                        enableFieldMapping: boolean;
                        strategy?: undefined;
                        models?: undefined;
                    };
                    dependencies: never[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        strategy: string;
                        models: {
                            "gpt-3.5-turbo": {
                                latency: number;
                                priority: number;
                            };
                            "llama-2": {
                                latency: number;
                                priority: number;
                            };
                        };
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            })[];
            connections: {
                id: string;
                from: string;
                to: string;
                type: string;
            }[];
            dataMappings: {
                sourcePath: string;
                targetPath: string;
                required: boolean;
            }[];
            conditions: never[];
        };
        executionStrategy: {
            mode: string;
            timeout: number;
            retryPolicy?: undefined;
        };
        dataFlow: {
            inputSchema: {
                type: string;
                properties: {
                    model: {
                        type: string;
                    };
                    prompt: {
                        type: string;
                    };
                    messages?: undefined;
                };
                required: string[];
            };
            outputSchema: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    choices: {
                        type: string;
                    };
                    usage?: undefined;
                };
            };
            validation: {
                enabled: boolean;
                strict: boolean;
            };
        };
    })[];
    moduleRegistry: ({
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                inputProtocol: {
                    type: string;
                    enum: string[];
                };
                outputProtocol: {
                    type: string;
                    enum: string[];
                };
                enableFieldMapping: {
                    type: string;
                };
                customMappings: {
                    type: string;
                };
                strategy?: undefined;
                models?: undefined;
                fallbackModels?: undefined;
                format?: undefined;
                enableStreaming?: undefined;
                includeUsage?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies: never[];
        };
        tags: string[];
        metadata: {
            supportedProtocols: string[];
            supportedStrategies?: undefined;
        };
    } | {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                strategy: {
                    type: string;
                    enum: string[];
                };
                models: {
                    type: string;
                };
                fallbackModels: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
                customMappings?: undefined;
                format?: undefined;
                enableStreaming?: undefined;
                includeUsage?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies?: undefined;
        };
        tags: string[];
        metadata: {
            supportedStrategies: string[];
            supportedProtocols?: undefined;
        };
    } | {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                format: {
                    type: string;
                };
                enableStreaming: {
                    type: string;
                };
                includeUsage: {
                    type: string;
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
                customMappings?: undefined;
                strategy?: undefined;
                models?: undefined;
                fallbackModels?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies?: undefined;
        };
        tags: string[];
        metadata: {
            supportedProtocols?: undefined;
            supportedStrategies?: undefined;
        };
    })[];
    assemblyStrategies: ({
        strategyId: string;
        name: string;
        description: string;
        algorithm: string;
        config: {
            performanceMetrics: string[];
            weighting: {
                latency: number;
                errorRate: number;
                throughput: number;
            };
            costMetrics?: undefined;
            optimizationTarget?: undefined;
        };
        selectionCriteria: {
            performance: boolean;
            cost: boolean;
            reliability: boolean;
        };
    } | {
        strategyId: string;
        name: string;
        description: string;
        algorithm: string;
        config: {
            costMetrics: string[];
            optimizationTarget: string;
            performanceMetrics?: undefined;
            weighting?: undefined;
        };
        selectionCriteria: {
            performance: boolean;
            cost: boolean;
            reliability: boolean;
        };
    })[];
};
export declare const COMPLETE_SCHEDULER_CONFIG: {
    basic: {
        schedulerId: string;
        name: string;
        version: string;
        description: string;
    };
    loadBalancing: {
        strategy: string;
        strategyConfig: {
            weighted: {
                weights: {
                    "llm-chat-primary": number;
                    "llm-chat-backup": number;
                    "llm-completion-primary": number;
                    "llm-completion-backup": number;
                };
                enableDynamicWeightAdjustment: boolean;
                weightAdjustmentInterval: number;
            };
        };
        failover: {
            enabled: boolean;
            maxRetries: number;
            retryDelay: number;
            backoffMultiplier: number;
            enableCircuitBreaker: boolean;
        };
    };
    healthCheck: {
        strategy: string;
        intervals: {
            activeCheckInterval: number;
            passiveCheckInterval: number;
            fullCheckInterval: number;
        };
        checks: {
            basic: {
                enabled: boolean;
                timeout: number;
                endpoint: string;
            };
            detailed: {
                enabled: boolean;
                timeout: number;
                includeMetrics: boolean;
                includeDependencies: boolean;
            };
            custom: {
                enabled: boolean;
                checkFunction: string;
                parameters: {};
            };
        };
        thresholds: {
            healthyThreshold: number;
            unhealthyThreshold: number;
            degradationThreshold: number;
        };
        recovery: {
            autoRecovery: boolean;
            recoveryStrategies: {
                strategyId: string;
                name: string;
                conditions: {
                    field: string;
                    operator: string;
                    value: number;
                }[];
                actions: {
                    type: string;
                    parameters: {
                        graceful: boolean;
                    };
                    timeout: number;
                }[];
                priority: number;
            }[];
            maxRecoveryAttempts: number;
        };
    };
    errorHandling: {
        errorClassification: {
            enableAutomaticClassification: boolean;
            customClassifiers: {
                name: string;
                errorCodeRanges: number[];
                classificationRules: {
                    field: string;
                    operator: string;
                    value: number;
                    classification: {
                        category: string;
                        severity: string;
                        recoverability: string;
                    };
                }[];
                action: string;
            }[];
        };
        strategies: {
            unrecoverableErrors: {
                action: string;
                notificationEnabled: boolean;
                logLevel: string;
            };
            recoverableErrors: {
                action: string;
                maxRetryAttempts: number;
                blacklistDuration: number;
                exponentialBackoff: boolean;
            };
            authenticationErrors: {
                action: string;
                maintenanceDuration: number;
                credentialRefreshFunction: string;
            };
            networkErrors: {
                action: string;
                maxRetryAttempts: number;
                backoffMultiplier: number;
                bufferSize: number;
            };
        };
        blacklist: {
            enabled: boolean;
            maxEntries: number;
            defaultDuration: number;
            maxDuration: number;
            cleanupInterval: number;
            autoExpiry: boolean;
        };
        reporting: {
            enableDetailedReporting: boolean;
            reportInterval: number;
            includeStackTraces: boolean;
            includeContext: boolean;
            customReporters: string[];
        };
    };
    performance: {
        concurrency: {
            maxConcurrentRequests: number;
            maxConcurrentRequestsPerPipeline: number;
            queueSize: number;
            enablePriorityQueue: boolean;
        };
        timeouts: {
            defaultTimeout: number;
            executionTimeout: number;
            idleTimeout: number;
            startupTimeout: number;
            shutdownTimeout: number;
        };
        caching: {
            enabled: boolean;
            strategy: string;
            maxSize: number;
            ttl: number;
        };
        rateLimiting: {
            enabled: boolean;
            strategy: string;
            requestsPerSecond: number;
            burstSize: number;
        };
    };
    monitoring: {
        metrics: {
            enabled: boolean;
            collectionInterval: number;
            metrics: ({
                name: string;
                type: string;
                description: string;
                labels: {
                    pipeline: string;
                    status: string;
                };
                buckets?: undefined;
            } | {
                name: string;
                type: string;
                description: string;
                labels: {
                    pipeline: string;
                    status?: undefined;
                };
                buckets: number[];
            })[];
            aggregation: {
                enabled: boolean;
                interval: number;
                functions: string[];
            };
        };
        logging: {
            level: string;
            format: string;
            outputs: ({
                type: string;
                config: {
                    path?: undefined;
                    rotation?: undefined;
                };
                level: string;
            } | {
                type: string;
                config: {
                    path: string;
                    rotation: string;
                };
                level: string;
            })[];
            sampling: {
                enabled: boolean;
                rate: number;
            };
        };
        tracing: {
            enabled: boolean;
            samplingRate: number;
            includePayloads: boolean;
            customSpans: string[];
        };
        alerts: {
            enabled: boolean;
            rules: {
                ruleId: string;
                name: string;
                condition: string;
                threshold: number;
                duration: number;
                severity: string;
                channels: string[];
            }[];
            channels: ({
                channelId: string;
                name: string;
                type: string;
                config: {
                    webhookUrl: string;
                    channel: string;
                    smtpServer?: undefined;
                    port?: undefined;
                    recipients?: undefined;
                };
                enabled: boolean;
            } | {
                channelId: string;
                name: string;
                type: string;
                config: {
                    smtpServer: string;
                    port: number;
                    recipients: string[];
                    webhookUrl?: undefined;
                    channel?: undefined;
                };
                enabled: boolean;
            })[];
        };
    };
    security: {
        authentication: {
            enabled: boolean;
            method: string;
            config: {
                issuer: string;
                audience: string;
                expiration: number;
            };
        };
        authorization: {
            enabled: boolean;
            roles: string[];
            permissions: {
                admin: string[];
                user: string[];
                guest: string[];
            };
        };
        encryption: {
            enabled: boolean;
            algorithm: string;
            keyRotationInterval: number;
        };
        rateLimiting: {
            enabled: boolean;
            requestsPerMinute: number;
            burstSize: number;
        };
    };
};
export declare const CONFIGURATION_VALIDATION_REPORT: {
    assemblyTableValidation: {
        isValid: boolean;
        errors: never[];
        warnings: {
            field: string;
            message: string;
            suggestion: string;
        }[];
        recommendations: never[];
    };
    schedulerConfigValidation: {
        isValid: boolean;
        errors: never[];
        warnings: never[];
        recommendations: {
            field: string;
            current: number;
            recommended: number;
            reason: string;
            impact: string;
        }[];
    };
    crossReferenceValidation: {
        isValid: boolean;
        errors: never[];
        warnings: never[];
        recommendations: never[];
    };
    summary: {
        overallValid: boolean;
        totalErrors: number;
        totalWarnings: number;
        totalRecommendations: number;
        validationTimestamp: string;
    };
};
export type { PipelineAssemblyTable, PipelineSchedulerConfig, CompleteConfigValidationResult } from './PipelineCompleteConfig';
export declare class PipelineConfigUtils {
    /**
     * Get a pipeline template by ID
     */
    static getPipelineTemplate(templateId: string): {
        templateId: string;
        name: string;
        description: string;
        version: string;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
            priority: number;
            enabled: boolean;
        };
        moduleAssembly: {
            moduleInstances: ({
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        inputProtocol: string;
                        outputProtocol: string;
                        enableFieldMapping: boolean;
                        customMappings: {
                            model: string;
                            messages: string;
                        };
                        strategy?: undefined;
                        models?: undefined;
                        fallbackModels?: undefined;
                        format?: undefined;
                        enableStreaming?: undefined;
                        includeUsage?: undefined;
                    };
                    dependencies: never[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy: {
                        maxRetries: number;
                        baseDelay: number;
                        maxDelay: number;
                        backoffMultiplier: number;
                        jitter: boolean;
                    };
                    circuitBreaker: {
                        failureThreshold: number;
                        recoveryTime: number;
                        requestVolumeThreshold: number;
                        timeout: number;
                    };
                    healthCheck: {
                        enabled: boolean;
                        interval: number;
                        timeout: number;
                    };
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        strategy: string;
                        models: {
                            "gpt-4": {
                                cost: number;
                                priority: number;
                            };
                            "claude-3": {
                                cost: number;
                                priority: number;
                            };
                        };
                        fallbackModels: string[];
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                        customMappings?: undefined;
                        format?: undefined;
                        enableStreaming?: undefined;
                        includeUsage?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy: {
                        maxRetries: number;
                        baseDelay: number;
                        maxDelay: number;
                        backoffMultiplier: number;
                        jitter: boolean;
                    };
                    circuitBreaker: {
                        failureThreshold: number;
                        recoveryTime: number;
                        requestVolumeThreshold: number;
                        timeout: number;
                    };
                    healthCheck?: undefined;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        format: string;
                        enableStreaming: boolean;
                        includeUsage: boolean;
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                        customMappings?: undefined;
                        strategy?: undefined;
                        models?: undefined;
                        fallbackModels?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                    retryPolicy?: undefined;
                    circuitBreaker?: undefined;
                    healthCheck?: undefined;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            })[];
            connections: {
                id: string;
                from: string;
                to: string;
                type: string;
                dataMapping: {
                    sourcePath: string;
                    targetPath: string;
                    required: boolean;
                };
            }[];
            dataMappings: {
                sourcePath: string;
                targetPath: string;
                required: boolean;
            }[];
            conditions: never[];
        };
        executionStrategy: {
            mode: string;
            timeout: number;
            retryPolicy: {
                maxRetries: number;
                baseDelay: number;
                maxDelay: number;
                backoffMultiplier: number;
                jitter: boolean;
            };
        };
        dataFlow: {
            inputSchema: {
                type: string;
                properties: {
                    model: {
                        type: string;
                    };
                    messages: {
                        type: string;
                    };
                    prompt?: undefined;
                };
                required: string[];
            };
            outputSchema: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    choices: {
                        type: string;
                    };
                    usage: {
                        type: string;
                    };
                };
            };
            validation: {
                enabled: boolean;
                strict: boolean;
            };
        };
    } | {
        templateId: string;
        name: string;
        description: string;
        version: string;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
            priority: number;
            enabled: boolean;
        };
        moduleAssembly: {
            moduleInstances: ({
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        inputProtocol: string;
                        outputProtocol: string;
                        enableFieldMapping: boolean;
                        strategy?: undefined;
                        models?: undefined;
                    };
                    dependencies: never[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        strategy: string;
                        models: {
                            "gpt-3.5-turbo": {
                                latency: number;
                                priority: number;
                            };
                            "llama-2": {
                                latency: number;
                                priority: number;
                            };
                        };
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                    };
                    dependencies: string[];
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                };
                conditions: {
                    enableConditions: never[];
                    skipConditions: never[];
                };
            })[];
            connections: {
                id: string;
                from: string;
                to: string;
                type: string;
            }[];
            dataMappings: {
                sourcePath: string;
                targetPath: string;
                required: boolean;
            }[];
            conditions: never[];
        };
        executionStrategy: {
            mode: string;
            timeout: number;
            retryPolicy?: undefined;
        };
        dataFlow: {
            inputSchema: {
                type: string;
                properties: {
                    model: {
                        type: string;
                    };
                    prompt: {
                        type: string;
                    };
                    messages?: undefined;
                };
                required: string[];
            };
            outputSchema: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    choices: {
                        type: string;
                    };
                    usage?: undefined;
                };
            };
            validation: {
                enabled: boolean;
                strict: boolean;
            };
        };
    } | undefined;
    /**
     * Get a routing rule by ID
     */
    static getRoutingRule(ruleId: string): {
        ruleId: string;
        name: string;
        priority: number;
        enabled: boolean;
        conditions: {
            field: string;
            operator: string;
            value: string;
        }[];
        pipelineSelection: {
            strategy: string;
            weights: {
                "llm-chat-primary": number;
                "llm-chat-backup": number;
                "llm-completion-primary"?: undefined;
                "llm-completion-backup"?: undefined;
            };
        };
        moduleFilters: never[];
        dynamicConfig: {
            enableAdaptiveRouting: boolean;
            performanceThresholds: {
                maxResponseTime: number;
                minSuccessRate: number;
                maxErrorRate: number;
            };
        };
    } | {
        ruleId: string;
        name: string;
        priority: number;
        enabled: boolean;
        conditions: {
            field: string;
            operator: string;
            value: string;
        }[];
        pipelineSelection: {
            strategy: string;
            weights: {
                "llm-completion-primary": number;
                "llm-completion-backup": number;
                "llm-chat-primary"?: undefined;
                "llm-chat-backup"?: undefined;
            };
        };
        moduleFilters: never[];
        dynamicConfig: {
            enableAdaptiveRouting: boolean;
            performanceThresholds: {
                maxResponseTime: number;
                minSuccessRate: number;
                maxErrorRate: number;
            };
        };
    } | undefined;
    /**
     * Get a module from registry by ID
     */
    static getModuleFromRegistry(moduleId: string): {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                inputProtocol: {
                    type: string;
                    enum: string[];
                };
                outputProtocol: {
                    type: string;
                    enum: string[];
                };
                enableFieldMapping: {
                    type: string;
                };
                customMappings: {
                    type: string;
                };
                strategy?: undefined;
                models?: undefined;
                fallbackModels?: undefined;
                format?: undefined;
                enableStreaming?: undefined;
                includeUsage?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies: never[];
        };
        tags: string[];
        metadata: {
            supportedProtocols: string[];
            supportedStrategies?: undefined;
        };
    } | {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                strategy: {
                    type: string;
                    enum: string[];
                };
                models: {
                    type: string;
                };
                fallbackModels: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
                customMappings?: undefined;
                format?: undefined;
                enableStreaming?: undefined;
                includeUsage?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies?: undefined;
        };
        tags: string[];
        metadata: {
            supportedStrategies: string[];
            supportedProtocols?: undefined;
        };
    } | {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        description: string;
        capabilities: string[];
        dependencies: never[];
        configSchema: {
            type: string;
            properties: {
                format: {
                    type: string;
                };
                enableStreaming: {
                    type: string;
                };
                includeUsage: {
                    type: string;
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
                customMappings?: undefined;
                strategy?: undefined;
                models?: undefined;
                fallbackModels?: undefined;
            };
            required: string[];
        };
        initializationConfig: {
            setupFunction: string;
            validationFunction: string;
            dependencies?: undefined;
        };
        tags: string[];
        metadata: {
            supportedProtocols?: undefined;
            supportedStrategies?: undefined;
        };
    } | undefined;
    /**
     * Get pipeline weights from scheduler config
     */
    static getPipelineWeights(): {};
    /**
     * Check if configuration is valid
     */
    static isConfigurationValid(): boolean;
    /**
     * Get configuration validation summary
     */
    static getValidationSummary(): {
        overallValid: boolean;
        totalErrors: number;
        totalWarnings: number;
        totalRecommendations: number;
        validationTimestamp: string;
    };
}
export declare const COMPLETE_PIPELINE_CONFIG: {
    assemblyTable: {
        version: string;
        metadata: {
            createdAt: string;
            updatedAt: string;
            description: string;
            author: string;
        };
        routingRules: ({
            ruleId: string;
            name: string;
            priority: number;
            enabled: boolean;
            conditions: {
                field: string;
                operator: string;
                value: string;
            }[];
            pipelineSelection: {
                strategy: string;
                weights: {
                    "llm-chat-primary": number;
                    "llm-chat-backup": number;
                    "llm-completion-primary"?: undefined;
                    "llm-completion-backup"?: undefined;
                };
            };
            moduleFilters: never[];
            dynamicConfig: {
                enableAdaptiveRouting: boolean;
                performanceThresholds: {
                    maxResponseTime: number;
                    minSuccessRate: number;
                    maxErrorRate: number;
                };
            };
        } | {
            ruleId: string;
            name: string;
            priority: number;
            enabled: boolean;
            conditions: {
                field: string;
                operator: string;
                value: string;
            }[];
            pipelineSelection: {
                strategy: string;
                weights: {
                    "llm-completion-primary": number;
                    "llm-completion-backup": number;
                    "llm-chat-primary"?: undefined;
                    "llm-chat-backup"?: undefined;
                };
            };
            moduleFilters: never[];
            dynamicConfig: {
                enableAdaptiveRouting: boolean;
                performanceThresholds: {
                    maxResponseTime: number;
                    minSuccessRate: number;
                    maxErrorRate: number;
                };
            };
        })[];
        pipelineTemplates: ({
            templateId: string;
            name: string;
            description: string;
            version: string;
            baseConfig: {
                timeout: number;
                maxConcurrentRequests: number;
                priority: number;
                enabled: boolean;
            };
            moduleAssembly: {
                moduleInstances: ({
                    instanceId: string;
                    moduleId: string;
                    name: string;
                    initialization: {
                        config: {
                            inputProtocol: string;
                            outputProtocol: string;
                            enableFieldMapping: boolean;
                            customMappings: {
                                model: string;
                                messages: string;
                            };
                            strategy?: undefined;
                            models?: undefined;
                            fallbackModels?: undefined;
                            format?: undefined;
                            enableStreaming?: undefined;
                            includeUsage?: undefined;
                        };
                        dependencies: never[];
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                        retryPolicy: {
                            maxRetries: number;
                            baseDelay: number;
                            maxDelay: number;
                            backoffMultiplier: number;
                            jitter: boolean;
                        };
                        circuitBreaker: {
                            failureThreshold: number;
                            recoveryTime: number;
                            requestVolumeThreshold: number;
                            timeout: number;
                        };
                        healthCheck: {
                            enabled: boolean;
                            interval: number;
                            timeout: number;
                        };
                    };
                    conditions: {
                        enableConditions: never[];
                        skipConditions: never[];
                    };
                } | {
                    instanceId: string;
                    moduleId: string;
                    name: string;
                    initialization: {
                        config: {
                            strategy: string;
                            models: {
                                "gpt-4": {
                                    cost: number;
                                    priority: number;
                                };
                                "claude-3": {
                                    cost: number;
                                    priority: number;
                                };
                            };
                            fallbackModels: string[];
                            inputProtocol?: undefined;
                            outputProtocol?: undefined;
                            enableFieldMapping?: undefined;
                            customMappings?: undefined;
                            format?: undefined;
                            enableStreaming?: undefined;
                            includeUsage?: undefined;
                        };
                        dependencies: string[];
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                        retryPolicy: {
                            maxRetries: number;
                            baseDelay: number;
                            maxDelay: number;
                            backoffMultiplier: number;
                            jitter: boolean;
                        };
                        circuitBreaker: {
                            failureThreshold: number;
                            recoveryTime: number;
                            requestVolumeThreshold: number;
                            timeout: number;
                        };
                        healthCheck?: undefined;
                    };
                    conditions: {
                        enableConditions: never[];
                        skipConditions: never[];
                    };
                } | {
                    instanceId: string;
                    moduleId: string;
                    name: string;
                    initialization: {
                        config: {
                            format: string;
                            enableStreaming: boolean;
                            includeUsage: boolean;
                            inputProtocol?: undefined;
                            outputProtocol?: undefined;
                            enableFieldMapping?: undefined;
                            customMappings?: undefined;
                            strategy?: undefined;
                            models?: undefined;
                            fallbackModels?: undefined;
                        };
                        dependencies: string[];
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                        retryPolicy?: undefined;
                        circuitBreaker?: undefined;
                        healthCheck?: undefined;
                    };
                    conditions: {
                        enableConditions: never[];
                        skipConditions: never[];
                    };
                })[];
                connections: {
                    id: string;
                    from: string;
                    to: string;
                    type: string;
                    dataMapping: {
                        sourcePath: string;
                        targetPath: string;
                        required: boolean;
                    };
                }[];
                dataMappings: {
                    sourcePath: string;
                    targetPath: string;
                    required: boolean;
                }[];
                conditions: never[];
            };
            executionStrategy: {
                mode: string;
                timeout: number;
                retryPolicy: {
                    maxRetries: number;
                    baseDelay: number;
                    maxDelay: number;
                    backoffMultiplier: number;
                    jitter: boolean;
                };
            };
            dataFlow: {
                inputSchema: {
                    type: string;
                    properties: {
                        model: {
                            type: string;
                        };
                        messages: {
                            type: string;
                        };
                        prompt?: undefined;
                    };
                    required: string[];
                };
                outputSchema: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        choices: {
                            type: string;
                        };
                        usage: {
                            type: string;
                        };
                    };
                };
                validation: {
                    enabled: boolean;
                    strict: boolean;
                };
            };
        } | {
            templateId: string;
            name: string;
            description: string;
            version: string;
            baseConfig: {
                timeout: number;
                maxConcurrentRequests: number;
                priority: number;
                enabled: boolean;
            };
            moduleAssembly: {
                moduleInstances: ({
                    instanceId: string;
                    moduleId: string;
                    name: string;
                    initialization: {
                        config: {
                            inputProtocol: string;
                            outputProtocol: string;
                            enableFieldMapping: boolean;
                            strategy?: undefined;
                            models?: undefined;
                        };
                        dependencies: never[];
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                    };
                    conditions: {
                        enableConditions: never[];
                        skipConditions: never[];
                    };
                } | {
                    instanceId: string;
                    moduleId: string;
                    name: string;
                    initialization: {
                        config: {
                            strategy: string;
                            models: {
                                "gpt-3.5-turbo": {
                                    latency: number;
                                    priority: number;
                                };
                                "llama-2": {
                                    latency: number;
                                    priority: number;
                                };
                            };
                            inputProtocol?: undefined;
                            outputProtocol?: undefined;
                            enableFieldMapping?: undefined;
                        };
                        dependencies: string[];
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                    };
                    conditions: {
                        enableConditions: never[];
                        skipConditions: never[];
                    };
                })[];
                connections: {
                    id: string;
                    from: string;
                    to: string;
                    type: string;
                }[];
                dataMappings: {
                    sourcePath: string;
                    targetPath: string;
                    required: boolean;
                }[];
                conditions: never[];
            };
            executionStrategy: {
                mode: string;
                timeout: number;
                retryPolicy?: undefined;
            };
            dataFlow: {
                inputSchema: {
                    type: string;
                    properties: {
                        model: {
                            type: string;
                        };
                        prompt: {
                            type: string;
                        };
                        messages?: undefined;
                    };
                    required: string[];
                };
                outputSchema: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        choices: {
                            type: string;
                        };
                        usage?: undefined;
                    };
                };
                validation: {
                    enabled: boolean;
                    strict: boolean;
                };
            };
        })[];
        moduleRegistry: ({
            moduleId: string;
            name: string;
            version: string;
            type: string;
            description: string;
            capabilities: string[];
            dependencies: never[];
            configSchema: {
                type: string;
                properties: {
                    inputProtocol: {
                        type: string;
                        enum: string[];
                    };
                    outputProtocol: {
                        type: string;
                        enum: string[];
                    };
                    enableFieldMapping: {
                        type: string;
                    };
                    customMappings: {
                        type: string;
                    };
                    strategy?: undefined;
                    models?: undefined;
                    fallbackModels?: undefined;
                    format?: undefined;
                    enableStreaming?: undefined;
                    includeUsage?: undefined;
                };
                required: string[];
            };
            initializationConfig: {
                setupFunction: string;
                validationFunction: string;
                dependencies: never[];
            };
            tags: string[];
            metadata: {
                supportedProtocols: string[];
                supportedStrategies?: undefined;
            };
        } | {
            moduleId: string;
            name: string;
            version: string;
            type: string;
            description: string;
            capabilities: string[];
            dependencies: never[];
            configSchema: {
                type: string;
                properties: {
                    strategy: {
                        type: string;
                        enum: string[];
                    };
                    models: {
                        type: string;
                    };
                    fallbackModels: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                    customMappings?: undefined;
                    format?: undefined;
                    enableStreaming?: undefined;
                    includeUsage?: undefined;
                };
                required: string[];
            };
            initializationConfig: {
                setupFunction: string;
                validationFunction: string;
                dependencies?: undefined;
            };
            tags: string[];
            metadata: {
                supportedStrategies: string[];
                supportedProtocols?: undefined;
            };
        } | {
            moduleId: string;
            name: string;
            version: string;
            type: string;
            description: string;
            capabilities: string[];
            dependencies: never[];
            configSchema: {
                type: string;
                properties: {
                    format: {
                        type: string;
                    };
                    enableStreaming: {
                        type: string;
                    };
                    includeUsage: {
                        type: string;
                    };
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                    customMappings?: undefined;
                    strategy?: undefined;
                    models?: undefined;
                    fallbackModels?: undefined;
                };
                required: string[];
            };
            initializationConfig: {
                setupFunction: string;
                validationFunction: string;
                dependencies?: undefined;
            };
            tags: string[];
            metadata: {
                supportedProtocols?: undefined;
                supportedStrategies?: undefined;
            };
        })[];
        assemblyStrategies: ({
            strategyId: string;
            name: string;
            description: string;
            algorithm: string;
            config: {
                performanceMetrics: string[];
                weighting: {
                    latency: number;
                    errorRate: number;
                    throughput: number;
                };
                costMetrics?: undefined;
                optimizationTarget?: undefined;
            };
            selectionCriteria: {
                performance: boolean;
                cost: boolean;
                reliability: boolean;
            };
        } | {
            strategyId: string;
            name: string;
            description: string;
            algorithm: string;
            config: {
                costMetrics: string[];
                optimizationTarget: string;
                performanceMetrics?: undefined;
                weighting?: undefined;
            };
            selectionCriteria: {
                performance: boolean;
                cost: boolean;
                reliability: boolean;
            };
        })[];
    };
    scheduler: {
        basic: {
            schedulerId: string;
            name: string;
            version: string;
            description: string;
        };
        loadBalancing: {
            strategy: string;
            strategyConfig: {
                weighted: {
                    weights: {
                        "llm-chat-primary": number;
                        "llm-chat-backup": number;
                        "llm-completion-primary": number;
                        "llm-completion-backup": number;
                    };
                    enableDynamicWeightAdjustment: boolean;
                    weightAdjustmentInterval: number;
                };
            };
            failover: {
                enabled: boolean;
                maxRetries: number;
                retryDelay: number;
                backoffMultiplier: number;
                enableCircuitBreaker: boolean;
            };
        };
        healthCheck: {
            strategy: string;
            intervals: {
                activeCheckInterval: number;
                passiveCheckInterval: number;
                fullCheckInterval: number;
            };
            checks: {
                basic: {
                    enabled: boolean;
                    timeout: number;
                    endpoint: string;
                };
                detailed: {
                    enabled: boolean;
                    timeout: number;
                    includeMetrics: boolean;
                    includeDependencies: boolean;
                };
                custom: {
                    enabled: boolean;
                    checkFunction: string;
                    parameters: {};
                };
            };
            thresholds: {
                healthyThreshold: number;
                unhealthyThreshold: number;
                degradationThreshold: number;
            };
            recovery: {
                autoRecovery: boolean;
                recoveryStrategies: {
                    strategyId: string;
                    name: string;
                    conditions: {
                        field: string;
                        operator: string;
                        value: number;
                    }[];
                    actions: {
                        type: string;
                        parameters: {
                            graceful: boolean;
                        };
                        timeout: number;
                    }[];
                    priority: number;
                }[];
                maxRecoveryAttempts: number;
            };
        };
        errorHandling: {
            errorClassification: {
                enableAutomaticClassification: boolean;
                customClassifiers: {
                    name: string;
                    errorCodeRanges: number[];
                    classificationRules: {
                        field: string;
                        operator: string;
                        value: number;
                        classification: {
                            category: string;
                            severity: string;
                            recoverability: string;
                        };
                    }[];
                    action: string;
                }[];
            };
            strategies: {
                unrecoverableErrors: {
                    action: string;
                    notificationEnabled: boolean;
                    logLevel: string;
                };
                recoverableErrors: {
                    action: string;
                    maxRetryAttempts: number;
                    blacklistDuration: number;
                    exponentialBackoff: boolean;
                };
                authenticationErrors: {
                    action: string;
                    maintenanceDuration: number;
                    credentialRefreshFunction: string;
                };
                networkErrors: {
                    action: string;
                    maxRetryAttempts: number;
                    backoffMultiplier: number;
                    bufferSize: number;
                };
            };
            blacklist: {
                enabled: boolean;
                maxEntries: number;
                defaultDuration: number;
                maxDuration: number;
                cleanupInterval: number;
                autoExpiry: boolean;
            };
            reporting: {
                enableDetailedReporting: boolean;
                reportInterval: number;
                includeStackTraces: boolean;
                includeContext: boolean;
                customReporters: string[];
            };
        };
        performance: {
            concurrency: {
                maxConcurrentRequests: number;
                maxConcurrentRequestsPerPipeline: number;
                queueSize: number;
                enablePriorityQueue: boolean;
            };
            timeouts: {
                defaultTimeout: number;
                executionTimeout: number;
                idleTimeout: number;
                startupTimeout: number;
                shutdownTimeout: number;
            };
            caching: {
                enabled: boolean;
                strategy: string;
                maxSize: number;
                ttl: number;
            };
            rateLimiting: {
                enabled: boolean;
                strategy: string;
                requestsPerSecond: number;
                burstSize: number;
            };
        };
        monitoring: {
            metrics: {
                enabled: boolean;
                collectionInterval: number;
                metrics: ({
                    name: string;
                    type: string;
                    description: string;
                    labels: {
                        pipeline: string;
                        status: string;
                    };
                    buckets?: undefined;
                } | {
                    name: string;
                    type: string;
                    description: string;
                    labels: {
                        pipeline: string;
                        status?: undefined;
                    };
                    buckets: number[];
                })[];
                aggregation: {
                    enabled: boolean;
                    interval: number;
                    functions: string[];
                };
            };
            logging: {
                level: string;
                format: string;
                outputs: ({
                    type: string;
                    config: {
                        path?: undefined;
                        rotation?: undefined;
                    };
                    level: string;
                } | {
                    type: string;
                    config: {
                        path: string;
                        rotation: string;
                    };
                    level: string;
                })[];
                sampling: {
                    enabled: boolean;
                    rate: number;
                };
            };
            tracing: {
                enabled: boolean;
                samplingRate: number;
                includePayloads: boolean;
                customSpans: string[];
            };
            alerts: {
                enabled: boolean;
                rules: {
                    ruleId: string;
                    name: string;
                    condition: string;
                    threshold: number;
                    duration: number;
                    severity: string;
                    channels: string[];
                }[];
                channels: ({
                    channelId: string;
                    name: string;
                    type: string;
                    config: {
                        webhookUrl: string;
                        channel: string;
                        smtpServer?: undefined;
                        port?: undefined;
                        recipients?: undefined;
                    };
                    enabled: boolean;
                } | {
                    channelId: string;
                    name: string;
                    type: string;
                    config: {
                        smtpServer: string;
                        port: number;
                        recipients: string[];
                        webhookUrl?: undefined;
                        channel?: undefined;
                    };
                    enabled: boolean;
                })[];
            };
        };
        security: {
            authentication: {
                enabled: boolean;
                method: string;
                config: {
                    issuer: string;
                    audience: string;
                    expiration: number;
                };
            };
            authorization: {
                enabled: boolean;
                roles: string[];
                permissions: {
                    admin: string[];
                    user: string[];
                    guest: string[];
                };
            };
            encryption: {
                enabled: boolean;
                algorithm: string;
                keyRotationInterval: number;
            };
            rateLimiting: {
                enabled: boolean;
                requestsPerMinute: number;
                burstSize: number;
            };
        };
    };
    validationReport: {
        assemblyTableValidation: {
            isValid: boolean;
            errors: never[];
            warnings: {
                field: string;
                message: string;
                suggestion: string;
            }[];
            recommendations: never[];
        };
        schedulerConfigValidation: {
            isValid: boolean;
            errors: never[];
            warnings: never[];
            recommendations: {
                field: string;
                current: number;
                recommended: number;
                reason: string;
                impact: string;
            }[];
        };
        crossReferenceValidation: {
            isValid: boolean;
            errors: never[];
            warnings: never[];
            recommendations: never[];
        };
        summary: {
            overallValid: boolean;
            totalErrors: number;
            totalWarnings: number;
            totalRecommendations: number;
            validationTimestamp: string;
        };
    };
};
export default COMPLETE_PIPELINE_CONFIG;
