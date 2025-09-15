/**
 * RCC Pipeline系统配置示例
 * 这些示例展示了实际使用中的配置格式
 */
export declare const simplePipelineAssemblyConfig: {
    version: string;
    metadata: {
        description: string;
        author: string;
    };
    routingRules: {
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
            };
        };
    }[];
    pipelineTemplates: {
        templateId: string;
        name: string;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
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
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
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
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                    };
                    startupOrder: number;
                    required: boolean;
                };
                execution: {
                    timeout: number;
                };
            })[];
            connections: {
                from: string;
                to: string;
                type: string;
            }[];
        };
    }[];
    moduleRegistry: ({
        moduleId: string;
        name: string;
        version: string;
        type: string;
        capabilities: string[];
        configSchema: {
            type: string;
            properties: {
                inputProtocol: {
                    type: string;
                };
                outputProtocol: {
                    type: string;
                };
                enableFieldMapping: {
                    type: string;
                };
                strategy?: undefined;
                models?: undefined;
            };
            required: string[];
        };
    } | {
        moduleId: string;
        name: string;
        version: string;
        type: string;
        capabilities: string[];
        configSchema: {
            type: string;
            properties: {
                strategy: {
                    type: string;
                };
                models: {
                    type: string;
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
            };
            required: string[];
        };
    })[];
};
export declare const simpleSchedulerConfig: {
    schedulerId: string;
    name: string;
    version: string;
    loadBalancing: {
        strategy: string;
        weights: {
            "llm-chat-primary": number;
            "llm-chat-backup": number;
        };
        healthCheck: {
            enabled: boolean;
            interval: number;
            timeout: number;
            endpoint: string;
            healthyThreshold: number;
            unhealthyThreshold: number;
        };
        failover: {
            enabled: boolean;
            maxRetries: number;
            retryDelay: number;
            backoffMultiplier: number;
            enableCircuitBreaker: boolean;
            circuitBreaker: {
                failureThreshold: number;
                recoveryTime: number;
                requestVolumeThreshold: number;
            };
        };
    };
    errorHandling: {
        strategies: {
            unrecoverableErrors: {
                action: string;
                switchToNextAvailable: boolean;
                logLevel: string;
            };
            recoverableErrors: {
                action: string;
                blacklistDuration: number;
                maxRetryAttempts: number;
                exponentialBackoff: boolean;
            };
            authenticationErrors: {
                action: string;
                maintenanceDuration: number;
            };
            rateLimitErrors: {
                action: string;
                maxRetries: number;
                backoffMultiplier: number;
            };
        };
        blacklist: {
            enabled: boolean;
            maxEntries: number;
            defaultDuration: number;
            maxDuration: number;
            cleanupInterval: number;
        };
    };
    performance: {
        maxConcurrentRequests: number;
        defaultTimeout: number;
        enableCircuitBreaker: boolean;
    };
    monitoring: {
        enabled: boolean;
        metricsCollectionInterval: number;
        healthCheckInterval: number;
        logLevel: string;
    };
};
export declare function createEnvironmentConfig(env: 'development' | 'production' | 'testing'): {
    pipelineAssembly: {
        version: string;
        metadata: {
            description: string;
            author: string;
        };
        routingRules: {
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
                };
            };
        }[];
        pipelineTemplates: {
            templateId: string;
            name: string;
            baseConfig: {
                timeout: number;
                maxConcurrentRequests: number;
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
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
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
                            inputProtocol?: undefined;
                            outputProtocol?: undefined;
                            enableFieldMapping?: undefined;
                        };
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                    };
                })[];
                connections: {
                    from: string;
                    to: string;
                    type: string;
                }[];
            };
        }[];
        moduleRegistry: ({
            moduleId: string;
            name: string;
            version: string;
            type: string;
            capabilities: string[];
            configSchema: {
                type: string;
                properties: {
                    inputProtocol: {
                        type: string;
                    };
                    outputProtocol: {
                        type: string;
                    };
                    enableFieldMapping: {
                        type: string;
                    };
                    strategy?: undefined;
                    models?: undefined;
                };
                required: string[];
            };
        } | {
            moduleId: string;
            name: string;
            version: string;
            type: string;
            capabilities: string[];
            configSchema: {
                type: string;
                properties: {
                    strategy: {
                        type: string;
                    };
                    models: {
                        type: string;
                    };
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                };
                required: string[];
            };
        })[];
    };
    schedulerConfig: {
        schedulerId: string;
        name: string;
        version: string;
        loadBalancing: {
            strategy: string;
            weights: {
                "llm-chat-primary": number;
                "llm-chat-backup": number;
            };
            healthCheck: {
                enabled: boolean;
                interval: number;
                timeout: number;
                endpoint: string;
                healthyThreshold: number;
                unhealthyThreshold: number;
            };
            failover: {
                enabled: boolean;
                maxRetries: number;
                retryDelay: number;
                backoffMultiplier: number;
                enableCircuitBreaker: boolean;
                circuitBreaker: {
                    failureThreshold: number;
                    recoveryTime: number;
                    requestVolumeThreshold: number;
                };
            };
        };
        errorHandling: {
            strategies: {
                unrecoverableErrors: {
                    action: string;
                    switchToNextAvailable: boolean;
                    logLevel: string;
                };
                recoverableErrors: {
                    action: string;
                    blacklistDuration: number;
                    maxRetryAttempts: number;
                    exponentialBackoff: boolean;
                };
                authenticationErrors: {
                    action: string;
                    maintenanceDuration: number;
                };
                rateLimitErrors: {
                    action: string;
                    maxRetries: number;
                    backoffMultiplier: number;
                };
            };
            blacklist: {
                enabled: boolean;
                maxEntries: number;
                defaultDuration: number;
                maxDuration: number;
                cleanupInterval: number;
            };
        };
        performance: {
            maxConcurrentRequests: number;
            defaultTimeout: number;
            enableCircuitBreaker: boolean;
        };
        monitoring: {
            enabled: boolean;
            metricsCollectionInterval: number;
            healthCheckInterval: number;
            logLevel: string;
        };
    };
};
export declare function validatePipelineAssemblyConfig(config: any): {
    isValid: boolean;
    errors: string[];
};
export declare function validateSchedulerConfig(config: any): {
    isValid: boolean;
    errors: string[];
};
export declare const PipelineConfigExamples: {
    simplePipelineAssemblyConfig: {
        version: string;
        metadata: {
            description: string;
            author: string;
        };
        routingRules: {
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
                };
            };
        }[];
        pipelineTemplates: {
            templateId: string;
            name: string;
            baseConfig: {
                timeout: number;
                maxConcurrentRequests: number;
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
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
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
                            inputProtocol?: undefined;
                            outputProtocol?: undefined;
                            enableFieldMapping?: undefined;
                        };
                        startupOrder: number;
                        required: boolean;
                    };
                    execution: {
                        timeout: number;
                    };
                })[];
                connections: {
                    from: string;
                    to: string;
                    type: string;
                }[];
            };
        }[];
        moduleRegistry: ({
            moduleId: string;
            name: string;
            version: string;
            type: string;
            capabilities: string[];
            configSchema: {
                type: string;
                properties: {
                    inputProtocol: {
                        type: string;
                    };
                    outputProtocol: {
                        type: string;
                    };
                    enableFieldMapping: {
                        type: string;
                    };
                    strategy?: undefined;
                    models?: undefined;
                };
                required: string[];
            };
        } | {
            moduleId: string;
            name: string;
            version: string;
            type: string;
            capabilities: string[];
            configSchema: {
                type: string;
                properties: {
                    strategy: {
                        type: string;
                    };
                    models: {
                        type: string;
                    };
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                };
                required: string[];
            };
        })[];
    };
    simpleSchedulerConfig: {
        schedulerId: string;
        name: string;
        version: string;
        loadBalancing: {
            strategy: string;
            weights: {
                "llm-chat-primary": number;
                "llm-chat-backup": number;
            };
            healthCheck: {
                enabled: boolean;
                interval: number;
                timeout: number;
                endpoint: string;
                healthyThreshold: number;
                unhealthyThreshold: number;
            };
            failover: {
                enabled: boolean;
                maxRetries: number;
                retryDelay: number;
                backoffMultiplier: number;
                enableCircuitBreaker: boolean;
                circuitBreaker: {
                    failureThreshold: number;
                    recoveryTime: number;
                    requestVolumeThreshold: number;
                };
            };
        };
        errorHandling: {
            strategies: {
                unrecoverableErrors: {
                    action: string;
                    switchToNextAvailable: boolean;
                    logLevel: string;
                };
                recoverableErrors: {
                    action: string;
                    blacklistDuration: number;
                    maxRetryAttempts: number;
                    exponentialBackoff: boolean;
                };
                authenticationErrors: {
                    action: string;
                    maintenanceDuration: number;
                };
                rateLimitErrors: {
                    action: string;
                    maxRetries: number;
                    backoffMultiplier: number;
                };
            };
            blacklist: {
                enabled: boolean;
                maxEntries: number;
                defaultDuration: number;
                maxDuration: number;
                cleanupInterval: number;
            };
        };
        performance: {
            maxConcurrentRequests: number;
            defaultTimeout: number;
            enableCircuitBreaker: boolean;
        };
        monitoring: {
            enabled: boolean;
            metricsCollectionInterval: number;
            healthCheckInterval: number;
            logLevel: string;
        };
    };
    createEnvironmentConfig: typeof createEnvironmentConfig;
    validatePipelineAssemblyConfig: typeof validatePipelineAssemblyConfig;
    validateSchedulerConfig: typeof validateSchedulerConfig;
};
//# sourceMappingURL=SimpleConfigurationExamples.d.ts.map