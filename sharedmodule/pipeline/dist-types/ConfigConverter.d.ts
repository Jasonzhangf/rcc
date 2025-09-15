/**
 * 基于现有 ~/.rcc/config.json 的Pipeline配置转换器
 * 将现有配置转换为Pipeline系统所需的格式
 */
export declare function extractProvidersFromConfig(config: any): any;
export declare function extractVirtualRoutesAsTemplates(config: any): {
    templateId: string;
    name: any;
    description: any;
    baseConfig: {
        timeout: number;
        maxConcurrentRequests: number;
        retryPolicy: {
            maxRetries: number;
            baseDelay: number;
            maxDelay: number;
        };
    };
    moduleAssembly: {
        moduleInstances: ({
            instanceId: string;
            moduleId: string;
            name: string;
            initialization: {
                config: {
                    authType: string;
                    validateTokens: boolean;
                    tokenRefreshEnabled: boolean;
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                    strategy?: undefined;
                    routeCategory?: undefined;
                    fallbackEnabled?: undefined;
                };
                startupOrder: number;
                required: boolean;
            };
        } | {
            instanceId: string;
            moduleId: string;
            name: string;
            initialization: {
                config: {
                    inputProtocol: string;
                    outputProtocol: string;
                    enableFieldMapping: boolean;
                    authType?: undefined;
                    validateTokens?: undefined;
                    tokenRefreshEnabled?: undefined;
                    strategy?: undefined;
                    routeCategory?: undefined;
                    fallbackEnabled?: undefined;
                };
                startupOrder: number;
                required: boolean;
            };
        } | {
            instanceId: string;
            moduleId: string;
            name: string;
            initialization: {
                config: {
                    strategy: string;
                    routeCategory: string;
                    fallbackEnabled: boolean;
                    authType?: undefined;
                    validateTokens?: undefined;
                    tokenRefreshEnabled?: undefined;
                    inputProtocol?: undefined;
                    outputProtocol?: undefined;
                    enableFieldMapping?: undefined;
                };
                startupOrder: number;
                required: boolean;
            };
        })[];
        connections: {
            from: string;
            to: string;
            type: string;
        }[];
    };
}[];
export declare function extractRoutingRulesFromConfig(config: any): any[];
export declare function createSchedulerConfigFromConfig(config: any): {
    schedulerId: string;
    name: string;
    version: string;
    loadBalancing: {
        strategy: any;
        weights: Record<string, number>;
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
            existingBlacklist: any;
        };
    };
    performance: {
        maxConcurrentRequests: number;
        defaultTimeout: number;
        enableCircuitBreaker: boolean;
        rateLimiting: any;
    };
    monitoring: {
        enabled: boolean;
        metricsCollectionInterval: number;
        healthCheckInterval: number;
        logLevel: string;
    };
};
export declare function createOAuth2Config(): {
    enabled: boolean;
    providers: {
        google: {
            authUrl: string;
            tokenUrl: string;
            clientId: string;
            clientSecret: string;
            scopes: string[];
            redirectUri: string;
        };
        github: {
            authUrl: string;
            tokenUrl: string;
            clientId: string;
            clientSecret: string;
            scopes: string[];
            redirectUri: string;
        };
        microsoft: {
            authUrl: string;
            tokenUrl: string;
            clientId: string;
            clientSecret: string;
            scopes: string[];
            redirectUri: string;
        };
    };
    tokenManagement: {
        accessTokenExpiry: number;
        refreshTokenExpiry: number;
        automaticRefresh: boolean;
        refreshBuffer: number;
    };
};
export declare function convertConfigToPipelineFormat(config: any): {
    version: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        description: string;
        author: string;
    };
    routingRules: any[];
    pipelineTemplates: {
        templateId: string;
        name: any;
        description: any;
        baseConfig: {
            timeout: number;
            maxConcurrentRequests: number;
            retryPolicy: {
                maxRetries: number;
                baseDelay: number;
                maxDelay: number;
            };
        };
        moduleAssembly: {
            moduleInstances: ({
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        authType: string;
                        validateTokens: boolean;
                        tokenRefreshEnabled: boolean;
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                        strategy?: undefined;
                        routeCategory?: undefined;
                        fallbackEnabled?: undefined;
                    };
                    startupOrder: number;
                    required: boolean;
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        inputProtocol: string;
                        outputProtocol: string;
                        enableFieldMapping: boolean;
                        authType?: undefined;
                        validateTokens?: undefined;
                        tokenRefreshEnabled?: undefined;
                        strategy?: undefined;
                        routeCategory?: undefined;
                        fallbackEnabled?: undefined;
                    };
                    startupOrder: number;
                    required: boolean;
                };
            } | {
                instanceId: string;
                moduleId: string;
                name: string;
                initialization: {
                    config: {
                        strategy: string;
                        routeCategory: string;
                        fallbackEnabled: boolean;
                        authType?: undefined;
                        validateTokens?: undefined;
                        tokenRefreshEnabled?: undefined;
                        inputProtocol?: undefined;
                        outputProtocol?: undefined;
                        enableFieldMapping?: undefined;
                    };
                    startupOrder: number;
                    required: boolean;
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
                authType: {
                    type: string;
                    enum: string[];
                };
                validateTokens: {
                    type: string;
                };
                tokenRefreshEnabled: {
                    type: string;
                };
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
                strategy?: undefined;
                routeCategory?: undefined;
                fallbackEnabled?: undefined;
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
                inputProtocol: {
                    type: string;
                };
                outputProtocol: {
                    type: string;
                };
                enableFieldMapping: {
                    type: string;
                };
                authType?: undefined;
                validateTokens?: undefined;
                tokenRefreshEnabled?: undefined;
                strategy?: undefined;
                routeCategory?: undefined;
                fallbackEnabled?: undefined;
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
                    enum: string[];
                };
                routeCategory: {
                    type: string;
                };
                fallbackEnabled: {
                    type: string;
                };
                authType?: undefined;
                validateTokens?: undefined;
                tokenRefreshEnabled?: undefined;
                inputProtocol?: undefined;
                outputProtocol?: undefined;
                enableFieldMapping?: undefined;
            };
            required: string[];
        };
    })[];
    oauth2Config: {
        enabled: boolean;
        providers: {
            google: {
                authUrl: string;
                tokenUrl: string;
                clientId: string;
                clientSecret: string;
                scopes: string[];
                redirectUri: string;
            };
            github: {
                authUrl: string;
                tokenUrl: string;
                clientId: string;
                clientSecret: string;
                scopes: string[];
                redirectUri: string;
            };
            microsoft: {
                authUrl: string;
                tokenUrl: string;
                clientId: string;
                clientSecret: string;
                scopes: string[];
                redirectUri: string;
            };
        };
        tokenManagement: {
            accessTokenExpiry: number;
            refreshTokenExpiry: number;
            automaticRefresh: boolean;
            refreshBuffer: number;
        };
    };
    schedulerConfig: {
        schedulerId: string;
        name: string;
        version: string;
        loadBalancing: {
            strategy: any;
            weights: Record<string, number>;
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
                existingBlacklist: any;
            };
        };
        performance: {
            maxConcurrentRequests: number;
            defaultTimeout: number;
            enableCircuitBreaker: boolean;
            rateLimiting: any;
        };
        monitoring: {
            enabled: boolean;
            metricsCollectionInterval: number;
            healthCheckInterval: number;
            logLevel: string;
        };
    };
};
export declare function validateConvertedConfig(config: any): {
    isValid: boolean;
    errors: string[];
};
//# sourceMappingURL=ConfigConverter.d.ts.map