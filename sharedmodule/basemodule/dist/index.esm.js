import { v4 } from 'uuid';
import { promises } from 'fs';
import { dirname, join } from 'path';

/**
 * Debug level enumeration
 */
var DebugLevel;
(function (DebugLevel) {
    DebugLevel[DebugLevel["ERROR"] = 0] = "ERROR";
    DebugLevel[DebugLevel["WARN"] = 1] = "WARN";
    DebugLevel[DebugLevel["INFO"] = 2] = "INFO";
    DebugLevel[DebugLevel["DEBUG"] = 3] = "DEBUG";
    DebugLevel[DebugLevel["TRACE"] = 4] = "TRACE";
})(DebugLevel || (DebugLevel = {}));

// Shared type definitions to avoid circular dependencies
// Enums
var ErrorSource;
(function (ErrorSource) {
    ErrorSource["MODULE"] = "module";
    ErrorSource["SYSTEM"] = "system";
    ErrorSource["EXTERNAL"] = "external";
    ErrorSource["NETWORK"] = "network";
    ErrorSource["UNKNOWN"] = "unknown";
})(ErrorSource || (ErrorSource = {}));
var ErrorType;
(function (ErrorType) {
    ErrorType["BUSINESS"] = "business";
    ErrorType["TECHNICAL"] = "technical";
    ErrorType["CONFIGURATION"] = "configuration";
    ErrorType["RESOURCE"] = "resource";
    ErrorType["DEPENDENCY"] = "dependency";
})(ErrorType || (ErrorType = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["CRITICAL"] = "critical";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["LOW"] = "low";
})(ErrorSeverity || (ErrorSeverity = {}));
var ErrorImpact;
(function (ErrorImpact) {
    ErrorImpact["SINGLE_MODULE"] = "single_module";
    ErrorImpact["MULTIPLE_MODULE"] = "multiple_module";
    ErrorImpact["SYSTEM_WIDE"] = "system_wide";
})(ErrorImpact || (ErrorImpact = {}));
var ErrorRecoverability;
(function (ErrorRecoverability) {
    ErrorRecoverability["RECOVERABLE"] = "recoverable";
    ErrorRecoverability["NON_RECOVERABLE"] = "non_recoverable";
    ErrorRecoverability["AUTO_RECOVERABLE"] = "auto_recoverable";
})(ErrorRecoverability || (ErrorRecoverability = {}));
var ResponseStatus;
(function (ResponseStatus) {
    ResponseStatus["PENDING"] = "pending";
    ResponseStatus["IN_PROGRESS"] = "in_progress";
    ResponseStatus["SUCCESS"] = "success";
    ResponseStatus["FAILURE"] = "failure";
    ResponseStatus["RETRY"] = "retry";
    ResponseStatus["FALLENBACK"] = "fallback";
    ResponseStatus["CANCELLED"] = "cancelled";
})(ResponseStatus || (ResponseStatus = {}));
var ResponseActionType;
(function (ResponseActionType) {
    ResponseActionType["RETRY"] = "retry";
    ResponseActionType["FALLBACK"] = "fallback";
    ResponseActionType["LOG"] = "log";
    ResponseActionType["NOTIFY"] = "notify";
    ResponseActionType["ISOLATE"] = "isolate";
    ResponseActionType["RESTART"] = "restart";
    ResponseActionType["CUSTOM"] = "custom";
})(ResponseActionType || (ResponseActionType = {}));
// ResponsePriority removed - use ActionPriority instead
var PolicyType;
(function (PolicyType) {
    PolicyType["RETRY"] = "retry";
    PolicyType["FALLBACK"] = "fallback";
    PolicyType["ISOLATION"] = "isolation";
    PolicyType["NOTIFICATION"] = "notification";
    PolicyType["CUSTOM"] = "custom";
})(PolicyType || (PolicyType = {}));
var RuleType;
(function (RuleType) {
    RuleType["ROUTING"] = "routing";
    RuleType["FILTERING"] = "filtering";
    RuleType["TRANSFORMATION"] = "transformation";
    RuleType["CUSTOM"] = "custom";
})(RuleType || (RuleType = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["EQUALS"] = "equals";
    ConditionOperator["NOT_EQUALS"] = "not_equals";
    ConditionOperator["CONTAINS"] = "contains";
    ConditionOperator["NOT_CONTAINS"] = "not_contains";
    ConditionOperator["GREATER_THAN"] = "greater_than";
    ConditionOperator["LESS_THAN"] = "less_than";
    ConditionOperator["IN"] = "in";
    ConditionOperator["NOT_IN"] = "not_in";
    ConditionOperator["REGEX"] = "regex";
    ConditionOperator["CUSTOM"] = "custom";
})(ConditionOperator || (ConditionOperator = {}));
var LogicalOperator;
(function (LogicalOperator) {
    LogicalOperator["AND"] = "and";
    LogicalOperator["OR"] = "or";
})(LogicalOperator || (LogicalOperator = {}));
var ActionType;
(function (ActionType) {
    ActionType["RETRY"] = "retry";
    ActionType["FALLBACK"] = "fallback";
    ActionType["LOG"] = "log";
    ActionType["NOTIFY"] = "notify";
    ActionType["ISOLATE"] = "isolate";
    ActionType["RESTART"] = "restart";
    ActionType["CUSTOM"] = "custom";
})(ActionType || (ActionType = {}));
var AnnotationType;
(function (AnnotationType) {
    AnnotationType["ERROR"] = "error";
    AnnotationType["WARNING"] = "warning";
    AnnotationType["INFO"] = "info";
    AnnotationType["DEBUG"] = "debug";
    AnnotationType["CUSTOM"] = "custom";
})(AnnotationType || (AnnotationType = {}));
var HandlingStatus;
(function (HandlingStatus) {
    HandlingStatus["SUCCESS"] = "success";
    HandlingStatus["FAILURE"] = "failure";
    HandlingStatus["PARTIAL"] = "partial";
    HandlingStatus["RETRY"] = "retry";
    HandlingStatus["FALLENBACK"] = "fallback";
})(HandlingStatus || (HandlingStatus = {}));
var ActionStatus;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "pending";
    ActionStatus["IN_PROGRESS"] = "in_progress";
    ActionStatus["COMPLETED"] = "completed";
    ActionStatus["FAILED"] = "failed";
    ActionStatus["CANCELLED"] = "cancelled";
})(ActionStatus || (ActionStatus = {}));
var ActionPriority;
(function (ActionPriority) {
    ActionPriority["CRITICAL"] = "critical";
    ActionPriority["HIGH"] = "high";
    ActionPriority["MEDIUM"] = "medium";
    ActionPriority["LOW"] = "low";
})(ActionPriority || (ActionPriority = {}));

/**
 * Core recording manager that coordinates all recording components
 */
class RecordingManager {
    constructor(config = {}) {
        this.globalConfig = null;
        this.activeRequests = new Map();
        this.activeCycles = new Map();
        this.errorRecords = new Map();
        this.configChangeCallbacks = new Set();
        this.truncationStats = new Map();
        this.config = this.validateConfig(config);
        this.initializeGlobalConfig();
    }
    // ========================================
    // Configuration Management
    // ========================================
    /**
     * Update recording configuration
     */
    async updateConfig(newConfig, force = false) {
        try {
            const oldConfig = { ...this.config };
            // Validate configuration before applying
            const validationError = this.validateConfiguration({ ...this.config, ...newConfig });
            if (validationError && !force) {
                return {
                    success: false,
                    errors: [validationError],
                    requiresForce: true
                };
            }
            this.config = this.validateConfig({ ...this.config, ...newConfig });
            // Validate consistency
            const consistencyResult = this.validateConfigurationConsistency();
            if (!consistencyResult.valid && !force) {
                return {
                    success: false,
                    errors: consistencyResult.errors,
                    requiresForce: true
                };
            }
            // Update global config if needed
            if (newConfig.globalConfig) {
                this.globalConfig = {
                    ...this.globalConfig,
                    ...newConfig.globalConfig
                };
            }
            // Notify all callbacks
            await this.notifyConfigChange(this.config);
            return {
                success: true,
                configVersion: this.globalConfig?.configVersion
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
    /**
     * Synchronize configuration across modules
     */
    async syncConfiguration(moduleConfigs) {
        const moduleResults = {};
        for (const [moduleId, config] of Object.entries(moduleConfigs)) {
            try {
                const result = await this.updateConfig(config, true);
                moduleResults[moduleId] = result.success;
            }
            catch (error) {
                moduleResults[moduleId] = false;
            }
        }
        return {
            success: Object.values(moduleResults).every(success => success),
            moduleResults
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get global configuration
     */
    getGlobalConfig() {
        return this.globalConfig ? { ...this.globalConfig } : null;
    }
    // ========================================
    // Request Context Management
    // ========================================
    /**
     * Create new request context
     */
    createRequestContext(options = {}) {
        const requestId = options.inheritContext || v4();
        const sessionId = this.globalConfig?.sessionId || v4();
        const traceId = v4();
        const chainId = options.inheritContext ? this.getRequestContext(options.inheritContext)?.chainId || v4() : v4();
        let context;
        if (options.inheritContext && this.activeRequests.has(options.inheritContext)) {
            // Inherit from existing context
            const existing = this.activeRequests.get(options.inheritContext);
            context = {
                ...existing,
                currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                moduleStack: [...existing.moduleStack, this.extractModuleName(options.customConfig?.module) || 'unknown']
            };
        }
        else {
            // Create new context
            const basePath = this.resolveBasePath(options.customConfig);
            context = {
                requestId,
                sessionId,
                traceId,
                chainId,
                startModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                startTime: Date.now(),
                basePath,
                currentPath: basePath,
                pathHistory: [],
                configSnapshot: this.createConfigSnapshot(options.customConfig),
                sharedData: new Map(),
                status: 'active',
                currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                moduleStack: [this.extractModuleName(options.customConfig?.module) || 'unknown']
            };
        }
        this.activeRequests.set(requestId, context);
        return context;
    }
    /**
     * Get request context
     */
    getRequestContext(requestId) {
        return this.activeRequests.get(requestId);
    }
    /**
     * Update request context
     */
    updateRequestContext(requestId, updates) {
        const context = this.activeRequests.get(requestId);
        if (!context)
            return false;
        // Store original path for history tracking
        const originalPath = context.currentPath;
        // Apply updates
        Object.assign(context, updates);
        // Update path history if path changed
        if (updates.currentPath && updates.currentPath !== originalPath) {
            context.pathHistory.push({
                moduleId: updates.currentModule || context.currentModule,
                path: updates.currentPath,
                timestamp: Date.now()
            });
        }
        return true;
    }
    /**
     * Complete request context
     */
    completeRequestContext(requestId, status = 'completed') {
        const context = this.activeRequests.get(requestId);
        if (!context)
            return false;
        context.status = status;
        context.moduleStack = context.moduleStack.filter(module => module !== context.currentModule);
        // Generate trace report
        const report = this.generateTraceReport(context);
        this.saveTraceReport(report);
        this.activeRequests.delete(requestId);
        return true;
    }
    // ========================================
    // Cycle Recording Management
    // ========================================
    /**
     * Start cycle recording
     */
    startCycleRecording(requestId, operation, module) {
        if (!this.config.cycle?.enabled)
            return null;
        const context = this.getRequestContext(requestId);
        if (!context)
            return null;
        const cycleId = v4();
        const basePath = this.resolveCyclePath(context, cycleId);
        const format = this.config.cycle.format || 'json';
        const handle = {
            cycleId,
            operation,
            startTime: Date.now(),
            module,
            basePath,
            format
        };
        this.activeCycles.set(cycleId, handle);
        // Create initial cycle record
        this.recordCycleEvent(handle, {
            index: 0,
            type: 'start',
            module,
            operation,
            timestamp: Date.now(),
            cycleId,
            traceId: context.traceId,
            requestId
        });
        return handle;
    }
    /**
     * Record cycle event
     */
    recordCycleEvent(handle, event) {
        if (!this.config.cycle?.enabled)
            return false;
        try {
            // Apply field truncation if enabled
            let eventData = { ...event };
            if (this.config.truncation?.enabled) {
                eventData = this.truncateFields(eventData, 'cycle');
            }
            // Save to file based on format
            const filePath = this.resolveCycleFilePath(handle, event.type);
            this.writeCycleRecord(filePath, eventData, handle.format);
            return true;
        }
        catch (error) {
            this.logError('Failed to record cycle event', error);
            return false;
        }
    }
    /**
     * End cycle recording
     */
    endCycleRecording(handle, result, error) {
        if (!this.activeCycles.has(handle.cycleId))
            return false;
        try {
            const context = handle.requestId ? this.getRequestContext(handle.requestId) : undefined;
            this.recordCycleEvent(handle, {
                index: -1,
                type: 'end',
                module: handle.module,
                operation: handle.operation,
                result,
                error,
                timestamp: Date.now(),
                cycleId: handle.cycleId,
                traceId: context?.traceId,
                requestId: handle.requestId
            });
            // Generate summary
            this.generateCycleSummary(handle);
            this.activeCycles.delete(handle.cycleId);
            return true;
        }
        catch (error) {
            this.logError('Failed to end cycle recording', error);
            return false;
        }
    }
    // ========================================
    // Error Recording Management
    // ========================================
    /**
     * Record error
     */
    recordError(errorData) {
        if (!this.config.error?.enabled)
            return '';
        const errorId = v4();
        this.findRequestContext(errorData.cycleId);
        const record = {
            errorId,
            cycleId: errorData.cycleId,
            module: errorData.context?.module || 'unknown',
            category: errorData.category || 'system',
            level: errorData.level || 'error',
            timestamp: Date.now(),
            message: typeof errorData.error === 'string' ? errorData.error : errorData.error.message,
            stack: typeof errorData.error === 'object' ? errorData.error.stack : undefined,
            context: errorData.context,
            operation: errorData.operation,
            recoverable: errorData.recoverable ?? true,
            resolved: false,
            filePath: this.resolveErrorPath(errorId)
        };
        this.errorRecords.set(errorId, record);
        this.writeErrorRecord(record);
        return errorId;
    }
    /**
     * Get error records
     */
    getErrorRecords(filters) {
        let records = Array.from(this.errorRecords.values());
        if (filters) {
            records = records.filter(record => {
                if (filters.level && !filters.level.includes(record.level))
                    return false;
                if (filters.category && !filters.category.includes(record.category))
                    return false;
                if (filters.module && record.module !== filters.module)
                    return false;
                if (filters.resolved !== undefined && record.resolved !== filters.resolved)
                    return false;
                if (filters.timeRange) {
                    if (record.timestamp < filters.timeRange.start || record.timestamp > filters.timeRange.end)
                        return false;
                }
                if (filters.operation && record.operation !== filters.operation)
                    return false;
                return true;
            });
        }
        return records.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Resolve error
     */
    resolveError(errorId, resolution) {
        const record = this.errorRecords.get(errorId);
        if (!record)
            return false;
        record.resolved = true;
        record.resolution = resolution;
        this.writeErrorRecord(record);
        return true;
    }
    // ========================================
    // Field Truncation Management
    // ========================================
    /**
     * Truncate fields in data object
     */
    truncateFields(data, context) {
        if (!this.config.truncation?.enabled)
            return data;
        const truncationConfig = this.config.truncation;
        const stats = {
            totalProcessed: 0,
            totalTruncated: 0,
            totalReplaced: 0,
            totalHidden: 0,
            fieldStats: new Map()
        };
        const result = this.truncateFieldsRecursive(data, '', truncationConfig, stats, context);
        // Update truncation statistics
        this.updateTruncationStats(stats);
        return result;
    }
    /**
     * Get truncation statistics
     */
    getTruncationStats() {
        const totalProcessed = this.truncationStats.get('totalProcessed') || 0;
        const totalTruncated = this.truncationStats.get('totalTruncated') || 0;
        const totalReplaced = this.truncationStats.get('totalReplaced') || 0;
        const totalHidden = this.truncationStats.get('totalHidden') || 0;
        return {
            totalProcessed,
            totalTruncated,
            totalReplaced,
            totalHidden,
            savingsPercentage: totalProcessed > 0 ? ((totalTruncated + totalReplaced + totalHidden) / totalProcessed) * 100 : 0,
            fieldDetails: [] // TODO: Implement field details tracking
        };
    }
    // ========================================
    // Helper Methods
    // ========================================
    validateConfig(config) {
        const defaultBasePath = './recording-logs';
        // Basic validation
        const validatedConfig = {
            enabled: config.enabled ?? false,
            basePath: config.basePath || defaultBasePath,
            port: config.port,
            cycle: {
                enabled: config.cycle?.enabled ?? false,
                mode: config.cycle?.mode || 'single',
                basePath: config.cycle?.basePath || config.basePath || defaultBasePath,
                cycleDirTemplate: config.cycle?.cycleDirTemplate || 'cycles/${cycleId}',
                mainFileTemplate: config.cycle?.mainFileTemplate || 'main.${format}',
                summaryFileTemplate: config.cycle?.summaryFileTemplate || 'summary.json',
                format: config.cycle?.format || 'json',
                includeIndex: config.cycle?.includeIndex ?? true,
                includeTimestamp: config.cycle?.includeTimestamp ?? true,
                autoCreateDirectory: config.cycle?.autoCreateDirectory ?? true,
                autoCloseOnComplete: config.cycle?.autoCloseOnComplete ?? true,
                maxCyclesRetained: config.cycle?.maxCyclesRetained || 100
            },
            error: {
                enabled: config.error?.enabled ?? false,
                levels: config.error?.levels || ['error', 'fatal'],
                categories: config.error?.categories || ['system', 'processing'],
                basePath: config.error?.basePath || config.basePath || defaultBasePath,
                indexFileTemplate: config.error?.indexFileTemplate || 'errors/index.jsonl',
                detailFileTemplate: config.error?.detailFileTemplate || 'errors/${errorId}.json',
                summaryFileTemplate: config.error?.summaryFileTemplate || 'errors/summary.json',
                dailyDirTemplate: config.error?.dailyDirTemplate || 'errors/${date}',
                indexFormat: config.error?.indexFormat || 'jsonl',
                detailFormat: config.error?.detailFormat || 'json',
                autoRecoveryTracking: config.error?.autoRecoveryTracking ?? true,
                maxErrorsRetained: config.error?.maxErrorsRetained || 1000,
                enableStatistics: config.error?.enableStatistics ?? true
            },
            truncation: config.truncation,
            file: {
                autoCleanup: config.file?.autoCleanup ?? true,
                maxFileAge: config.file?.maxFileAge || 7 * 24 * 60 * 60 * 1000, // 7 days
                maxFileSize: config.file?.maxFileSize || 10 * 1024 * 1024, // 10MB
                atomicWrites: config.file?.atomicWrites ?? true,
                backupOnWrite: config.file?.backupOnWrite ?? true,
                compressionEnabled: config.file?.compressionEnabled ?? false
            }
        };
        // Validate configuration dependencies
        if (validatedConfig.cycle?.enabled && !validatedConfig.cycle?.basePath) {
            throw new Error('Cycle recording requires basePath to be specified');
        }
        return validatedConfig;
    }
    initializeGlobalConfig() {
        this.globalConfig = {
            sessionId: v4(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            baseConfig: this.config,
            moduleOverrides: new Map(),
            configVersion: '1.0.0',
            lastUpdated: Date.now(),
            consistency: {
                enforced: true,
                validationInterval: 60000, // 1 minute
                allowedDeviations: []
            }
        };
    }
    createConfigSnapshot(customConfig) {
        return {
            enabled: customConfig?.enabled ?? this.config.enabled ?? false,
            basePath: customConfig?.basePath ?? this.config.basePath ?? '',
            port: customConfig?.port ?? this.config.port,
            cycleConfig: customConfig?.cycle ?? (this.config.cycle || {}),
            errorConfig: customConfig?.error ?? (this.config.error || {}),
            truncationConfig: customConfig?.truncation ?? (this.config.truncation || {}),
            timestamp: Date.now()
        };
    }
    resolveBasePath(customConfig) {
        const basePath = customConfig?.basePath || this.config.basePath || './recording-logs';
        return this.resolvePathTemplate(basePath, {});
    }
    resolveCyclePath(context, cycleId) {
        const template = this.config.cycle?.cycleDirTemplate || 'cycles/${cycleId}';
        const variables = {
            cycleId,
            requestId: context.requestId,
            sessionId: context.sessionId,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolveCycleFilePath(handle, type) {
        const template = this.config.cycle?.mainFileTemplate || 'main.${format}';
        const variables = {
            cycleId: handle.cycleId,
            format: handle.format,
            type,
            timestamp: Date.now()
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolveErrorPath(errorId) {
        const template = this.config.error?.detailFileTemplate || 'errors/${errorId}.json';
        const variables = {
            errorId,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolvePathTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
        }
        return result;
    }
    validateConfiguration(config) {
        // Check for specific validation failures
        if (config.cycle?.enabled === true && !config.cycle?.basePath) {
            return 'Cycle recording enabled but basePath is required';
        }
        return null;
    }
    validateConfigurationConsistency() {
        // TODO: Implement consistency validation
        return {
            valid: true,
            errors: [],
            warnings: [],
            details: {}
        };
    }
    async notifyConfigChange(config) {
        const promises = Array.from(this.configChangeCallbacks).map(callback => {
            try {
                return callback(config);
            }
            catch (error) {
                this.logError('Config change callback error', error);
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }
    findRequestContext(cycleId) {
        if (!cycleId)
            return undefined;
        for (const context of Array.from(this.activeRequests.values())) {
            if (context.sharedData.has(`cycle_${cycleId}`)) {
                return context;
            }
        }
        return undefined;
    }
    generateTraceReport(context) {
        // TODO: Implement trace report generation
        return {
            traceId: context.traceId,
            requestId: context.requestId,
            sessionId: context.sessionId,
            chainId: context.chainId,
            duration: Date.now() - context.startTime,
            startModule: context.startModule,
            moduleStack: context.moduleStack,
            pathHistory: context.pathHistory,
            status: context.status,
            summary: 'Trace report generated',
            performance: {
                totalDuration: Date.now() - context.startTime,
                moduleTimings: {},
                pathChanges: context.pathHistory.length
            },
            errors: []
        };
    }
    saveTraceReport(report) {
        // TODO: Implement trace report saving
    }
    writeCycleRecord(filePath, data, format) {
        // TODO: Implement cycle record writing
    }
    generateCycleSummary(handle) {
        // TODO: Implement cycle summary generation
    }
    writeErrorRecord(record) {
        // TODO: Implement error record writing
    }
    truncateFieldsRecursive(data, path, config, stats, context) {
        if (!this.config.truncation?.enabled) {
            return data;
        }
        stats.totalProcessed++;
        // Handle primitive types
        if (typeof data !== 'object' || data === null) {
            if (typeof data === 'string' && data.length > this.config.truncation.defaultMaxLength) {
                stats.totalTruncated++;
                return data.substring(0, this.config.truncation.defaultMaxLength) + '...';
            }
            return data;
        }
        // Handle arrays
        if (Array.isArray(data)) {
            if (!this.config.truncation.truncateArrays) {
                return data;
            }
            const newArray = [];
            const limit = Math.min(data.length, this.config.truncation.arrayTruncateLimit);
            for (let i = 0; i < limit; i++) {
                newArray.push(this.truncateFieldsRecursive(data[i], `${path}.${i}`, config, stats, context));
            }
            if (data.length > limit) {
                newArray.push(`[Array truncated from ${data.length} to ${limit} elements]`);
                stats.totalTruncated++;
            }
            return newArray;
        }
        // Handle objects
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const fieldPath = path ? `${path}.${key}` : key;
            result[key] = this.truncateFieldsRecursive(value, fieldPath, config, stats, context);
        }
        return result;
    }
    updateTruncationStats(stats) {
        this.truncationStats.set('totalProcessed', (this.truncationStats.get('totalProcessed') || 0) + stats.totalProcessed);
        this.truncationStats.set('totalTruncated', (this.truncationStats.get('totalTruncated') || 0) + stats.totalTruncated);
        this.truncationStats.set('totalReplaced', (this.truncationStats.get('totalReplaced') || 0) + stats.totalReplaced);
        this.truncationStats.set('totalHidden', (this.truncationStats.get('totalHidden') || 0) + stats.totalHidden);
    }
    extractModuleName(module) {
        if (!module)
            return undefined;
        if (typeof module === 'string')
            return module;
        return module.enabled ? 'module-config' : 'unknown';
    }
    logError(message, error) {
        console.error(`[RecordingManager] ${message}:`, error);
    }
}

/**
 * Circular recording component that manages request-response cycle recording
 */
class CycleRecorder {
    constructor(config, truncationConfig) {
        this.activeCycles = new Map();
        this.cycleRecords = new Map();
        this.truncationConfig = null;
        this.config = this.validateConfig(config);
        this.truncationConfig = truncationConfig || null;
    }
    // ========================================
    // Cycle Management
    // ========================================
    /**
     * Start a new recording cycle
     */
    async startCycle(operation, module, options = {}) {
        const cycleId = v4();
        const startTime = Date.now();
        const basePath = options.basePath || this.resolveCycleBasePath(cycleId, options);
        const handle = {
            cycleId,
            operation,
            startTime,
            module,
            basePath,
            format: options.customConfig?.format || this.config.format || 'json'
        };
        const cycleInfo = {
            cycleId,
            operation,
            module,
            startTime,
            status: 'active',
            recordCount: 0,
            basePath,
            format: handle.format
        };
        this.activeCycles.set(cycleId, cycleInfo);
        this.cycleRecords.set(cycleId, []);
        // Create start record
        await this.recordCycleEvent(handle, {
            index: 0,
            type: 'start',
            module,
            operation,
            timestamp: startTime,
            cycleId,
            traceId: options.requestId,
            requestId: options.requestId
        });
        // Ensure directory exists
        await this.ensureDirectoryExists(basePath);
        return handle;
    }
    /**
     * Record a cycle event
     */
    async recordCycleEvent(handle, event) {
        if (!this.activeCycles.has(handle.cycleId)) {
            return false;
        }
        try {
            // Apply field truncation if enabled
            let processedEvent = { ...event };
            if (this.truncationConfig?.enabled) {
                processedEvent = this.truncateFields(processedEvent);
            }
            const record = {
                ...processedEvent,
                data: processedEvent.data,
                result: processedEvent.result
            };
            // Add to memory cache
            const records = this.cycleRecords.get(handle.cycleId) || [];
            records.push(record);
            this.cycleRecords.set(handle.cycleId, records);
            // Update cycle info
            const cycleInfo = this.activeCycles.get(handle.cycleId);
            cycleInfo.recordCount++;
            // Write to file based on configuration
            await this.writeCycleRecord(handle, record);
            return true;
        }
        catch (error) {
            console.error(`[CycleRecorder] Failed to record cycle event:`, error);
            return false;
        }
    }
    /**
     * End a recording cycle
     */
    async endCycle(handle, result, error) {
        if (!this.activeCycles.has(handle.cycleId)) {
            return false;
        }
        try {
            const cycleInfo = this.activeCycles.get(handle.cycleId);
            cycleInfo.endTime = Date.now();
            cycleInfo.status = error ? 'error' : 'completed';
            // Create end record
            await this.recordCycleEvent(handle, {
                index: -1,
                type: 'end',
                module: handle.module,
                operation: handle.operation,
                result,
                error,
                timestamp: Date.now(),
                cycleId: handle.cycleId
            });
            // Generate summary if enabled
            if (this.config.includeIndex) {
                await this.generateCycleSummary(handle);
            }
            // Clean up if auto-close is enabled
            if (this.config.autoCloseOnComplete) {
                await this.closeCycle(handle.cycleId);
            }
            return true;
        }
        catch (error) {
            console.error(`[CycleRecorder] Failed to end cycle:`, error);
            return false;
        }
    }
    /**
     * Get cycle information
     */
    getCycleInfo(cycleId) {
        return this.activeCycles.get(cycleId);
    }
    /**
     * Get all active cycles
     */
    getActiveCycles() {
        return Array.from(this.activeCycles.values());
    }
    /**
     * Get cycle records
     */
    getCycleRecords(cycleId) {
        return this.cycleRecords.get(cycleId) || [];
    }
    /**
     * Close and clean up a cycle
     */
    async closeCycle(cycleId) {
        if (!this.activeCycles.has(cycleId)) {
            return false;
        }
        try {
            // Apply cleanup policies
            await this.applyCleanupPolicies(cycleId);
            this.activeCycles.delete(cycleId);
            this.cycleRecords.delete(cycleId);
            return true;
        }
        catch (error) {
            console.error(`[CycleRecorder] Failed to close cycle:`, error);
            return false;
        }
    }
    /**
     * Close all active cycles
     */
    async closeAllCycles() {
        const cycleIds = Array.from(this.activeCycles.keys());
        for (const cycleId of cycleIds) {
            await this.closeCycle(cycleId);
        }
    }
    // ========================================
    // Statistics and Reporting
    // ========================================
    /**
     * Get cycle statistics
     */
    getCycleStatistics(cycleId) {
        const records = this.cycleRecords.get(cycleId);
        const info = this.activeCycles.get(cycleId);
        if (!records || !info) {
            return null;
        }
        const totalRecords = records.length;
        const duration = info.endTime ? info.endTime - info.startTime : Date.now() - info.startTime;
        const averageRecordInterval = totalRecords > 1 ? duration / (totalRecords - 1) : 0;
        const recordTypes = records.reduce((acc, record) => {
            acc[record.type] = (acc[record.type] || 0) + 1;
            return acc;
        }, {});
        const errorCount = records.filter(record => record.error).length;
        return {
            totalRecords,
            duration,
            averageRecordInterval,
            recordTypes,
            errorCount
        };
    }
    /**
     * Get all cycle statistics
     */
    getAllCycleStatistics() {
        const result = {};
        for (const cycleId of this.activeCycles.keys()) {
            const stats = this.getCycleStatistics(cycleId);
            if (stats) {
                result[cycleId] = stats;
            }
        }
        return result;
    }
    // ========================================
    // Configuration Management
    // ========================================
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = this.validateConfig({ ...this.config, ...newConfig });
    }
    /**
     * Update truncation configuration
     */
    updateTruncationConfig(truncationConfig) {
        this.truncationConfig = truncationConfig;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ========================================
    // Helper Methods
    // ========================================
    validateConfig(config) {
        return {
            enabled: config.enabled ?? false,
            mode: config.mode || 'single',
            basePath: config.basePath || './cycle-logs',
            cycleDirTemplate: config.cycleDirTemplate || 'cycles/${cycleId}',
            mainFileTemplate: config.mainFileTemplate || 'main.${format}',
            summaryFileTemplate: config.summaryFileTemplate || 'summary.json',
            format: config.format || 'json',
            includeIndex: config.includeIndex ?? true,
            includeTimestamp: config.includeTimestamp ?? true,
            autoCreateDirectory: config.autoCreateDirectory ?? true,
            autoCloseOnComplete: config.autoCloseOnComplete ?? true,
            maxCyclesRetained: config.maxCyclesRetained || 100
        };
    }
    resolveCycleBasePath(cycleId, options = {}) {
        const template = options.customConfig?.cycleDirTemplate || this.config.cycleDirTemplate || '';
        const variables = {
            cycleId,
            requestId: options.requestId || '',
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toISOString().split('T')[1].split('.')[0]
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolvePathTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
        }
        return result;
    }
    async ensureDirectoryExists(path) {
        if (this.config.autoCreateDirectory) {
            try {
                await promises.mkdir(dirname(path), { recursive: true });
            }
            catch (error) {
                // Directory already exists or permission error
                console.warn(`[CycleRecorder] Failed to create directory ${dirname(path)}:`, error);
            }
        }
    }
    async writeCycleRecord(handle, record) {
        const filePath = this.resolveRecordFilePath(handle, record);
        const content = this.formatRecordContent(record, handle.format);
        try {
            if (handle.format === 'jsonl') {
                await promises.appendFile(filePath, content + '\n');
            }
            else {
                await promises.appendFile(filePath, content + ',\n');
            }
        }
        catch (error) {
            console.error(`[CycleRecorder] Failed to write record to ${filePath}:`, error);
            throw error;
        }
    }
    resolveRecordFilePath(handle, record) {
        const template = this.config.mainFileTemplate || '';
        const variables = {
            cycleId: handle.cycleId,
            format: handle.format,
            type: record.type,
            index: record.index,
            timestamp: record.timestamp,
            date: new Date(record.timestamp).toISOString().split('T')[0]
        };
        const fileName = this.resolvePathTemplate(template, variables);
        return join(handle.basePath, fileName);
    }
    formatRecordContent(record, format) {
        const content = {
            index: record.index,
            type: record.type,
            module: record.module,
            operation: record.operation,
            phase: record.phase,
            data: record.data,
            result: record.result,
            error: record.error,
            timestamp: this.config.includeTimestamp ? record.timestamp : undefined,
            cycleId: record.cycleId,
            traceId: record.traceId,
            requestId: record.requestId
        };
        // Remove undefined values
        Object.keys(content).forEach(key => {
            if (content[key] === undefined) {
                delete content[key];
            }
        });
        return JSON.stringify(content);
    }
    async generateCycleSummary(handle) {
        this.cycleRecords.get(handle.cycleId) || [];
        const stats = this.getCycleStatistics(handle.cycleId);
        if (!stats)
            return;
        const summary = {
            cycleId: handle.cycleId,
            operation: handle.operation,
            module: handle.module,
            startTime: handle.startTime,
            endTime: Date.now(),
            duration: stats.duration,
            status: this.activeCycles.get(handle.cycleId)?.status || 'completed',
            totalRecords: stats.totalRecords,
            averageRecordInterval: stats.averageRecordInterval,
            recordTypes: stats.recordTypes,
            errorCount: stats.errorCount,
            config: this.config
        };
        const summaryPath = join(handle.basePath, this.config.summaryFileTemplate || '');
        const resolvedPath = this.resolvePathTemplate(summaryPath, {
            cycleId: handle.cycleId,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        });
        try {
            await promises.writeFile(resolvedPath, JSON.stringify(summary, null, 2));
        }
        catch (error) {
            console.error(`[CycleRecorder] Failed to write cycle summary:`, error);
        }
    }
    async applyCleanupPolicies(cycleId) {
        // TODO: Implement cleanup policies based on maxCyclesRetained
        // This would involve cleaning up old cycle directories
    }
    truncateFields(data) {
        if (!this.truncationConfig || !this.truncationConfig.enabled) {
            return data;
        }
        // TODO: Implement field truncation logic
        // This would recursively traverse the data object and apply truncation rules
        return data;
    }
}

/**
 * Error recording component that manages error tracking and recovery
 */
class ErrorRecorder {
    constructor(config) {
        this.errorRecords = new Map();
        this.errorIndex = new Map(); // date -> errorIds
        this.recoveryTracking = new Map();
        this.config = this.validateConfig(config);
    }
    // ========================================
    // Error Recording
    // ========================================
    /**
     * Record an error
     */
    async recordError(errorData) {
        const errorId = v4();
        const timestamp = Date.now();
        const record = {
            errorId,
            cycleId: errorData.cycleId,
            module: errorData.context?.module || 'unknown',
            category: errorData.category || 'system',
            level: errorData.level || 'error',
            timestamp,
            message: typeof errorData.error === 'string' ? errorData.error : errorData.error.message,
            stack: typeof errorData.error === 'object' ? errorData.error.stack : undefined,
            context: errorData.context,
            operation: errorData.operation,
            recoverable: errorData.recoverable ?? true,
            resolved: false,
            filePath: this.resolveErrorFilePath(errorId, timestamp)
        };
        // Validate against configuration filters
        if (!this.shouldRecordError(record)) {
            return errorId;
        }
        this.errorRecords.set(errorId, record);
        // Update index
        this.updateErrorIndex(errorId, timestamp);
        // Write to file
        await this.writeErrorRecord(record);
        // Track recovery if enabled
        if (this.config.autoRecoveryTracking && record.recoverable) {
            this.trackRecovery(errorId);
        }
        // Check cleanup policies
        await this.applyCleanupPolicies();
        return errorId;
    }
    /**
     * Get error record by ID
     */
    getError(errorId) {
        return this.errorRecords.get(errorId);
    }
    /**
     * Get errors with filters
     */
    getErrors(filters) {
        let errors = Array.from(this.errorRecords.values());
        if (filters) {
            errors = errors.filter(error => this.matchesFilters(error, filters));
        }
        return errors.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Get errors by category
     */
    getErrorsByCategory(category) {
        return this.getErrors({ category: [category] });
    }
    /**
     * Get errors by level
     */
    getErrorsByLevel(level) {
        return this.getErrors({ level: [level] });
    }
    /**
     * Get errors by module
     */
    getErrorsByModule(module) {
        return this.getErrors({ module });
    }
    // ========================================
    // Error Resolution
    // ========================================
    /**
     * Mark error as resolved
     */
    async resolveError(errorId, resolution) {
        const record = this.errorRecords.get(errorId);
        if (!record) {
            return false;
        }
        record.resolved = true;
        record.resolution = resolution;
        // Update file
        await this.writeErrorRecord(record);
        // Remove from recovery tracking
        this.recoveryTracking.delete(errorId);
        return true;
    }
    /**
     * Mark error as unresolved
     */
    async unresolveError(errorId) {
        const record = this.errorRecords.get(errorId);
        if (!record) {
            return false;
        }
        record.resolved = false;
        record.resolution = undefined;
        // Update file
        await this.writeErrorRecord(record);
        // Add back to recovery tracking if recoverable
        if (record.recoverable) {
            this.trackRecovery(errorId);
        }
        return true;
    }
    /**
     * Get unresolved errors
     */
    getUnresolvedErrors() {
        return this.getErrors({ resolved: false });
    }
    /**
     * Get resolved errors
     */
    getResolvedErrors() {
        return this.getErrors({ resolved: true });
    }
    // ========================================
    // Recovery Tracking
    // ========================================
    /**
     * Track recovery attempt
     */
    trackRecoveryAttempt(errorId, success) {
        const tracking = this.recoveryTracking.get(errorId);
        if (!tracking) {
            return;
        }
        tracking.attempts++;
        tracking.lastAttempt = Date.now();
        if (success) {
            // Auto-resolve on successful recovery
            this.resolveError(errorId, `Auto-resolved after ${tracking.attempts} recovery attempts`);
        }
    }
    /**
     * Get recovery tracking info
     */
    getRecoveryTracking(errorId) {
        return this.recoveryTracking.get(errorId);
    }
    /**
     * Get all errors needing recovery
     */
    getErrorsNeedingRecovery() {
        return this.getUnresolvedErrors().filter(error => error.recoverable);
    }
    // ========================================
    // Statistics and Analysis
    // ========================================
    /**
     * Get error statistics
     */
    getErrorStatistics(timeRange) {
        let errors = Array.from(this.errorRecords.values());
        if (timeRange) {
            errors = errors.filter(error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end);
        }
        const totalErrors = errors.length;
        const errorsByLevel = this.groupBy(errors, 'level');
        const errorsByCategory = this.groupBy(errors, 'category');
        const errorsByModule = this.groupBy(errors, 'module');
        const resolvedCount = errors.filter(error => error.resolved).length;
        const unresolvedCount = totalErrors - resolvedCount;
        const recoveryRate = totalErrors > 0 ? resolvedCount / totalErrors : 0;
        return {
            totalErrors,
            errorsByLevel,
            errorsByCategory,
            errorsByModule,
            resolvedCount,
            unresolvedCount,
            recoveryRate
        };
    }
    /**
     * Get error trend data
     */
    getErrorTrend(timeRange, intervalMs = 3600000) {
        const points = [];
        const errors = Array.from(this.errorRecords.values()).filter(error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end);
        for (let time = timeRange.start; time <= timeRange.end; time += intervalMs) {
            const intervalEnd = time + intervalMs;
            const intervalErrors = errors.filter(error => error.timestamp >= time && error.timestamp < intervalEnd);
            const errorCount = intervalErrors.length;
            const resolvedCount = intervalErrors.filter(error => error.resolved).length;
            const errorRate = intervalErrors.length > 0 ? resolvedCount / intervalErrors.length : 0;
            points.push({
                timestamp: time,
                errorCount,
                resolvedCount,
                errorRate
            });
        }
        return points;
    }
    /**
     * Get error summary
     */
    getErrorSummary() {
        const totalErrors = this.errorRecords.size;
        const unresolvedErrors = this.getUnresolvedErrors().length;
        const criticalErrors = this.getErrorsByLevel('fatal').length;
        const recentErrors = this.getErrors().slice(0, 10);
        const categoryCounts = this.groupBy(Array.from(this.errorRecords.values()), 'category');
        const topErrorCategories = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            totalErrors,
            unresolvedErrors,
            criticalErrors,
            recentErrors,
            topErrorCategories
        };
    }
    // ========================================
    // File Management
    // ========================================
    /**
     * Write error record to file
     */
    async writeErrorRecord(record) {
        try {
            if (!record.filePath) {
                console.error(`[ErrorRecorder] Error record has no file path:`, record);
                return;
            }
            await promises.mkdir(dirname(record.filePath), { recursive: true });
            await promises.writeFile(record.filePath, JSON.stringify(record, null, 2));
        }
        catch (error) {
            console.error(`[ErrorRecorder] Failed to write error record:`, error);
        }
    }
    /**
     * Write error index to file
     */
    async writeErrorIndex() {
        if (!this.config.enableStatistics) {
            return;
        }
        try {
            const indexPath = this.resolveIndexPath();
            const indexData = Array.from(this.errorIndex.entries()).map(([date, errorIds]) => ({
                date,
                errorIds,
                count: errorIds.length
            }));
            await promises.mkdir(dirname(indexPath), { recursive: true });
            await promises.writeFile(indexPath, JSON.stringify(indexData, null, 2));
        }
        catch (error) {
            console.error(`[ErrorRecorder] Failed to write error index:`, error);
        }
    }
    /**
     * Load error records from files
     */
    async loadErrorRecords() {
        // TODO: Implement loading from persisted files
        // This would scan the error directory and load existing error records
    }
    /**
     * Cleanup old error records
     */
    async applyCleanupPolicies() {
        if (this.config.maxErrorsRetained === undefined) {
            return;
        }
        const errors = Array.from(this.errorRecords.values())
            .sort((a, b) => b.timestamp - a.timestamp);
        if (errors.length > this.config.maxErrorsRetained) {
            const toRemove = errors.slice(this.config.maxErrorsRetained);
            for (const error of toRemove) {
                this.errorRecords.delete(error.errorId);
                this.recoveryTracking.delete(error.errorId);
                // Remove from file system
                try {
                    if (error.filePath) {
                        await promises.unlink(error.filePath);
                    }
                }
                catch (err) {
                    // File might not exist or permission error
                    console.warn(`[ErrorRecorder] Failed to delete error file:`, err);
                }
            }
        }
    }
    // ========================================
    // Configuration Management
    // ========================================
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = this.validateConfig({ ...this.config, ...newConfig });
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ========================================
    // Helper Methods
    // ========================================
    validateConfig(config) {
        return {
            enabled: config.enabled ?? false,
            levels: config.levels || ['error', 'fatal'],
            categories: config.categories || ['system', 'processing'],
            basePath: config.basePath || './error-logs',
            indexFileTemplate: config.indexFileTemplate || 'errors/index.jsonl',
            detailFileTemplate: config.detailFileTemplate || 'errors/${errorId}.json',
            summaryFileTemplate: config.summaryFileTemplate || 'errors/summary.json',
            dailyDirTemplate: config.dailyDirTemplate || 'errors/${date}',
            indexFormat: config.indexFormat || 'jsonl',
            detailFormat: config.detailFormat || 'json',
            autoRecoveryTracking: config.autoRecoveryTracking ?? true,
            maxErrorsRetained: config.maxErrorsRetained || 1000,
            enableStatistics: config.enableStatistics ?? true
        };
    }
    shouldRecordError(record) {
        // Check level filter
        if (this.config.levels && !this.config.levels.includes(record.level)) {
            return false;
        }
        // Check category filter
        if (this.config.categories && !this.config.categories.includes(record.category)) {
            return false;
        }
        return true;
    }
    matchesFilters(error, filters) {
        if (filters.level && !filters.level.includes(error.level)) {
            return false;
        }
        if (filters.category && !filters.category.includes(error.category)) {
            return false;
        }
        if (filters.module && error.module !== filters.module) {
            return false;
        }
        if (filters.resolved !== undefined && error.resolved !== filters.resolved) {
            return false;
        }
        if (filters.timeRange) {
            if (error.timestamp < filters.timeRange.start || error.timestamp > filters.timeRange.end) {
                return false;
            }
        }
        if (filters.operation && error.operation !== filters.operation) {
            return false;
        }
        return true;
    }
    resolveErrorFilePath(errorId, timestamp) {
        const template = this.config.detailFileTemplate || '';
        const variables = {
            errorId,
            timestamp,
            date: new Date(timestamp).toISOString().split('T')[0],
            time: new Date(timestamp).toISOString().split('T')[1].split('.')[0]
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolveIndexPath() {
        const template = this.config.indexFileTemplate || '';
        const variables = {
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toISOString().split('T')[1].split('.')[0]
        };
        return this.resolvePathTemplate(template, variables);
    }
    resolvePathTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
        }
        return result;
    }
    updateErrorIndex(errorId, timestamp) {
        const date = new Date(timestamp).toISOString().split('T')[0];
        if (!this.errorIndex.has(date)) {
            this.errorIndex.set(date, []);
        }
        this.errorIndex.get(date).push(errorId);
        // Write updated index
        this.writeErrorIndex();
    }
    trackRecovery(errorId) {
        this.recoveryTracking.set(errorId, {
            attempts: 0,
            lastAttempt: Date.now()
        });
    }
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const groupKey = String(item[key]);
            groups[groupKey] = (groups[groupKey] || 0) + 1;
            return groups;
        }, {});
    }
}

/**
 * Field truncation component that handles data size optimization
 */
class FieldTruncator {
    constructor(config) {
        this.config = this.validateConfig(config);
        this.statistics = this.initializeStatistics();
    }
    // ========================================
    // Main Truncation Interface
    // ========================================
    /**
     * Truncate fields in data object
     */
    truncateFields(data, context) {
        if (!this.config.enabled) {
            return data;
        }
        const truncationContext = typeof context === 'string' ? { operation: context } : (context || {});
        const stats = {
            totalProcessed: 0,
            totalTruncated: 0,
            totalReplaced: 0,
            totalHidden: 0,
            fieldStats: new Map(),
            averageSavings: 0
        };
        const result = this.truncateFieldsRecursive(data, '', stats, truncationContext);
        // Update statistics
        this.updateStatistics(stats);
        return result;
    }
    /**
     * Truncate a specific field by path
     */
    truncateFieldByPath(data, fieldPath, context) {
        if (!this.config.enabled) {
            return data;
        }
        const pathParts = fieldPath.split('.');
        let current = data;
        let key = '';
        // Navigate to the field
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current || typeof current !== 'object') {
                return data;
            }
            key = pathParts[i];
            current = current[key];
        }
        if (!current || typeof current !== 'object') {
            return data;
        }
        const finalKey = pathParts[pathParts.length - 1];
        if (!(finalKey in current)) {
            return data;
        }
        // Apply truncation to the specific field
        const fieldValue = current[finalKey];
        const truncatedValue = this.truncateValue(fieldValue, fieldPath, context || {});
        if (truncatedValue !== fieldValue) {
            current[finalKey] = truncatedValue;
        }
        return data;
    }
    /**
     * Get truncation statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }
    /**
     * Get truncation report
     */
    getReport() {
        const totalProcessed = this.statistics.totalProcessed;
        const totalTruncated = this.statistics.totalTruncated;
        const totalReplaced = this.statistics.totalReplaced;
        const totalHidden = this.statistics.totalHidden;
        const fieldDetails = Array.from(this.statistics.fieldStats.entries()).map(([field, stats]) => ({
            field,
            processed: stats.processed,
            truncated: stats.truncated,
            replaced: stats.replaced,
            hidden: stats.hidden
        }));
        return {
            totalProcessed,
            totalTruncated,
            totalReplaced,
            totalHidden,
            savingsPercentage: totalProcessed > 0 ? ((totalTruncated + totalReplaced + totalHidden) / totalProcessed) * 100 : 0,
            fieldDetails
        };
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = this.initializeStatistics();
    }
    // ========================================
    // Configuration Management
    // ========================================
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = this.validateConfig({ ...this.config, ...newConfig });
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Add field truncation rule
     */
    addFieldRule(rule) {
        if (!this.config.fields) {
            this.config.fields = [];
        }
        // Remove existing rule for the same field path
        this.config.fields = this.config.fields.filter(f => f.fieldPath !== rule.fieldPath);
        this.config.fields.push(rule);
    }
    /**
     * Remove field truncation rule
     */
    removeFieldRule(fieldPath) {
        if (!this.config.fields) {
            return false;
        }
        const initialLength = this.config.fields.length;
        this.config.fields = this.config.fields.filter(f => f.fieldPath !== fieldPath);
        return this.config.fields.length < initialLength;
    }
    /**
     * Add path pattern rule
     */
    addPathPatternRule(rule) {
        if (!this.config.pathPatterns) {
            this.config.pathPatterns = [];
        }
        // Remove existing rule for the same pattern
        this.config.pathPatterns = this.config.pathPatterns.filter(p => p.pattern !== rule.pattern);
        this.config.pathPatterns.push(rule);
    }
    /**
     * Remove path pattern rule
     */
    removePathPatternRule(pattern) {
        if (!this.config.pathPatterns) {
            return false;
        }
        const initialLength = this.config.pathPatterns.length;
        this.config.pathPatterns = this.config.pathPatterns.filter(p => p.pattern !== pattern);
        return this.config.pathPatterns.length < initialLength;
    }
    // ========================================
    // Helper Methods
    // ========================================
    validateConfig(config) {
        return {
            enabled: config.enabled ?? false,
            defaultStrategy: config.defaultStrategy || 'truncate',
            defaultMaxLength: config.defaultMaxLength || 1000,
            defaultReplacementText: config.defaultReplacementText || '[...]',
            fields: config.fields || [],
            pathPatterns: config.pathPatterns || [],
            excludedFields: config.excludedFields || [],
            preserveStructure: config.preserveStructure ?? true,
            truncateArrays: config.truncateArrays ?? true,
            arrayTruncateLimit: config.arrayTruncateLimit || 100,
            recursiveTruncation: config.recursiveTruncation ?? true
        };
    }
    initializeStatistics() {
        return {
            totalProcessed: 0,
            totalTruncated: 0,
            totalReplaced: 0,
            totalHidden: 0,
            fieldStats: new Map(),
            averageSavings: 0
        };
    }
    truncateFieldsRecursive(data, currentPath, stats, context) {
        if (data === null || data === undefined) {
            return data;
        }
        stats.totalProcessed++;
        // Handle primitive types
        if (typeof data !== 'object') {
            return this.truncateValue(data, currentPath, context);
        }
        // Handle arrays
        if (Array.isArray(data)) {
            return this.truncateArray(data, currentPath, stats, context);
        }
        // Handle objects
        return this.truncateObject(data, currentPath, stats, context);
    }
    truncateArray(array, currentPath, stats, context) {
        if (!this.config.truncateArrays) {
            return array;
        }
        // Apply array length truncation
        let result = array;
        if (array.length > this.config.arrayTruncateLimit) {
            const originalLength = array.length;
            result = array.slice(0, this.config.arrayTruncateLimit);
            // Add truncation indicator
            if (this.config.preserveStructure) {
                result.push(`[Array truncated from ${originalLength} to ${result.length} elements]`);
            }
            this.updateFieldStats(currentPath, stats, 'truncated', 1);
            stats.totalTruncated++;
        }
        // Process array elements
        if (this.config.recursiveTruncation) {
            result = result.map((item, index) => {
                const elementPath = currentPath ? `${currentPath}.${index}` : String(index);
                return this.truncateFieldsRecursive(item, elementPath, stats, context);
            });
        }
        return result;
    }
    truncateObject(obj, currentPath, stats, context) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const fieldPath = currentPath ? `${currentPath}.${key}` : key;
            // Skip excluded fields
            if (this.isFieldExcluded(fieldPath)) {
                result[key] = value;
                continue;
            }
            // Check if field matches any specific rule
            const rule = this.findFieldRule(fieldPath);
            if (rule) {
                result[key] = this.applyFieldRule(value, fieldPath, rule, stats, context);
                continue;
            }
            // Check if field matches any path pattern
            const patternRule = this.findPathPatternRule(fieldPath);
            if (patternRule && this.shouldApplyPathPattern(fieldPath, value, patternRule)) {
                result[key] = this.applyPathPatternRule(value, fieldPath, patternRule, stats, context);
                continue;
            }
            // Apply default truncation
            result[key] = this.truncateFieldsRecursive(value, fieldPath, stats, context);
        }
        return result;
    }
    truncateValue(value, fieldPath, context) {
        if (typeof value !== 'string') {
            return value;
        }
        // Check if value needs truncation
        const maxLength = this.getFieldMaxLength(fieldPath);
        if (value.length <= maxLength) {
            return value;
        }
        const strategy = this.getFieldTruncationStrategy(fieldPath);
        const replacementText = this.getFieldReplacementText(fieldPath);
        switch (strategy) {
            case 'truncate':
                return value.substring(0, maxLength) + '...';
            case 'replace':
                return replacementText;
            case 'hide':
                return '[HIDDEN]';
            default:
                return value;
        }
    }
    isFieldExcluded(fieldPath) {
        return this.config.excludedFields?.includes(fieldPath) || false;
    }
    findFieldRule(fieldPath) {
        return this.config.fields?.find(rule => rule.fieldPath === fieldPath);
    }
    findPathPatternRule(fieldPath) {
        return this.config.pathPatterns?.find(rule => this.pathMatchesPattern(fieldPath, rule.pattern));
    }
    shouldApplyPathPattern(fieldPath, value, rule) {
        if (!rule.condition || rule.condition === 'always') {
            return true;
        }
        if (rule.condition === 'if_long' && typeof value === 'string') {
            return value.length > (rule.maxLength || this.config.defaultMaxLength);
        }
        if (rule.condition === 'if_nested') {
            return fieldPath.split('.').length > 3; // Arbitrary nested threshold
        }
        return true;
    }
    pathMatchesPattern(path, pattern) {
        // Convert pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }
    applyFieldRule(value, fieldPath, rule, stats, context) {
        // Check condition if provided
        if (rule.condition && !rule.condition(value, context)) {
            return value;
        }
        const strategy = rule.strategy || this.config.defaultStrategy;
        const maxLength = rule.maxLength || this.config.defaultMaxLength;
        const replacementText = rule.replacementText || this.config.defaultReplacementText;
        return this.applyTruncation(value, fieldPath, strategy, maxLength, replacementText, stats);
    }
    applyPathPatternRule(value, fieldPath, rule, stats, context) {
        const strategy = rule.strategy || this.config.defaultStrategy;
        const maxLength = rule.maxLength || this.config.defaultMaxLength;
        const replacementText = rule.replacementText || this.config.defaultReplacementText;
        return this.applyTruncation(value, fieldPath, strategy, maxLength, replacementText, stats);
    }
    applyTruncation(value, fieldPath, strategy, maxLength, replacementText, stats) {
        if (typeof value !== 'string') {
            return value;
        }
        if (value.length <= maxLength) {
            return value;
        }
        let result;
        let actionType;
        switch (strategy) {
            case 'truncate':
                result = value.substring(0, maxLength) + '...';
                actionType = 'totalTruncated';
                break;
            case 'replace':
                result = replacementText;
                actionType = 'totalReplaced';
                break;
            case 'hide':
                result = '[HIDDEN]';
                actionType = 'totalHidden';
                break;
            default:
                return value;
        }
        // Update statistics
        this.updateFieldStats(fieldPath, stats, actionType.replace('total', '').toLowerCase(), 1);
        stats[actionType]++;
        return result;
    }
    getFieldMaxLength(fieldPath) {
        const rule = this.findFieldRule(fieldPath);
        if (rule && rule.maxLength) {
            return rule.maxLength;
        }
        const patternRule = this.findPathPatternRule(fieldPath);
        if (patternRule && patternRule.maxLength) {
            return patternRule.maxLength;
        }
        return this.config.defaultMaxLength;
    }
    getFieldTruncationStrategy(fieldPath) {
        const rule = this.findFieldRule(fieldPath);
        if (rule && rule.strategy) {
            return rule.strategy;
        }
        const patternRule = this.findPathPatternRule(fieldPath);
        if (patternRule && patternRule.strategy) {
            return patternRule.strategy;
        }
        return this.config.defaultStrategy;
    }
    getFieldReplacementText(fieldPath) {
        const rule = this.findFieldRule(fieldPath);
        if (rule && rule.replacementText) {
            return rule.replacementText;
        }
        const patternRule = this.findPathPatternRule(fieldPath);
        if (patternRule && patternRule.replacementText) {
            return patternRule.replacementText;
        }
        return this.config.defaultReplacementText;
    }
    updateFieldStats(fieldPath, stats, actionType, count) {
        if (!stats.fieldStats.has(fieldPath)) {
            stats.fieldStats.set(fieldPath, {
                processed: 0,
                truncated: 0,
                replaced: 0,
                hidden: 0
            });
        }
        const fieldStats = stats.fieldStats.get(fieldPath);
        fieldStats[actionType] += count;
    }
    updateStatistics(stats) {
        this.statistics.totalProcessed += stats.totalProcessed;
        this.statistics.totalTruncated += stats.totalTruncated;
        this.statistics.totalReplaced += stats.totalReplaced;
        this.statistics.totalHidden += stats.totalHidden;
        // Merge field statistics
        for (const [field, fieldStats] of stats.fieldStats.entries()) {
            if (!this.statistics.fieldStats.has(field)) {
                this.statistics.fieldStats.set(field, { ...fieldStats });
            }
            else {
                const existing = this.statistics.fieldStats.get(field);
                existing.processed += fieldStats.processed;
                existing.truncated += fieldStats.truncated;
                existing.replaced += fieldStats.replaced;
                existing.hidden += fieldStats.hidden;
            }
        }
        // Update average savings
        const totalActions = this.statistics.totalTruncated + this.statistics.totalReplaced + this.statistics.totalHidden;
        this.statistics.averageSavings = totalActions > 0 ?
            (this.statistics.totalTruncated + this.statistics.totalReplaced + this.statistics.totalHidden) / this.statistics.totalProcessed : 0;
    }
}

/**
 * Request context manager that handles cross-module chain tracking
 */
class RequestContextManager {
    constructor() {
        this.activeContexts = new Map();
        this.contextHistory = new Map();
        this.chainBreakpoints = new Map();
        this.moduleContexts = new Map(); // moduleId -> contextIds
        this.globalSessionId = v4();
    }
    // ========================================
    // Context Creation and Management
    // ========================================
    /**
     * Create new request context
     */
    createContext(options = {}) {
        const requestId = v4();
        const sessionId = this.globalSessionId;
        const traceId = v4();
        const chainId = options.inheritContext ?
            (this.activeContexts.get(options.inheritContext)?.chainId || v4()) :
            v4();
        let context;
        if (options.inheritContext && this.activeContexts.has(options.inheritContext)) {
            // Inherit from existing context
            const existing = this.activeContexts.get(options.inheritContext);
            context = {
                ...existing,
                requestId,
                currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                moduleStack: [...existing.moduleStack, this.extractModuleName(options.customConfig?.module) || 'unknown'],
                configSnapshot: this.createConfigSnapshot(options.customConfig || existing.configSnapshot)
            };
        }
        else {
            // Create new context
            const basePath = this.resolveBasePath(options.customConfig);
            context = {
                requestId,
                sessionId,
                traceId,
                chainId,
                startModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                startTime: Date.now(),
                basePath,
                currentPath: basePath,
                pathHistory: [],
                configSnapshot: this.createConfigSnapshot(options.customConfig),
                sharedData: new Map(),
                status: 'active',
                currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
                moduleStack: [this.extractModuleName(options.customConfig?.module) || 'unknown']
            };
        }
        this.activeContexts.set(requestId, context);
        // Register with module contexts
        const moduleId = context.currentModule;
        if (!this.moduleContexts.has(moduleId)) {
            this.moduleContexts.set(moduleId, []);
        }
        this.moduleContexts.get(moduleId).push(requestId);
        return context;
    }
    /**
     * Get request context
     */
    getContext(requestId) {
        return this.activeContexts.get(requestId);
    }
    /**
     * Update request context
     */
    updateContext(requestId, updates) {
        const context = this.activeContexts.get(requestId);
        if (!context)
            return false;
        // Detect path changes and record in history
        if (updates.currentPath && updates.currentPath !== context.currentPath) {
            context.pathHistory.push({
                moduleId: updates.currentModule || context.currentModule,
                path: updates.currentPath,
                timestamp: Date.now()
            });
            // Check for chain breakpoints due to path changes
            this.detectChainBreakpoint(context, 'path_change', `Path changed from ${context.currentPath} to ${updates.currentPath}`);
        }
        // Update context
        Object.assign(context, updates);
        // Update module registration if module changed
        if (updates.currentModule && updates.currentModule !== context.currentModule) {
            this.updateModuleRegistration(context.requestId, context.currentModule, updates.currentModule);
        }
        return true;
    }
    /**
     * Complete request context
     */
    completeContext(requestId, status = 'completed') {
        const context = this.activeContexts.get(requestId);
        if (!context)
            return false;
        context.status = status;
        // Generate trace report
        this.generateTraceReport(context);
        // Move to history
        if (!this.contextHistory.has(context.sessionId)) {
            this.contextHistory.set(context.sessionId, []);
        }
        this.contextHistory.get(context.sessionId).push(context);
        // Remove from active contexts
        this.activeContexts.delete(requestId);
        // Remove from module contexts
        this.removeFromModuleContexts(requestId, context.currentModule);
        return true;
    }
    /**
     * Get all active contexts
     */
    getActiveContexts() {
        return Array.from(this.activeContexts.values());
    }
    /**
     * Get contexts by session
     */
    getContextsBySession(sessionId) {
        const active = Array.from(this.activeContexts.values()).filter(ctx => ctx.sessionId === sessionId);
        const history = this.contextHistory.get(sessionId) || [];
        return [...active, ...history];
    }
    /**
     * Get contexts by module
     */
    getContextsByModule(moduleId) {
        const contextIds = this.moduleContexts.get(moduleId) || [];
        return contextIds.map(id => this.activeContexts.get(id)).filter(Boolean);
    }
    // ========================================
    // Chain Management
    // ========================================
    /**
     * Get chain status
     */
    getChainStatus(chainId) {
        const contexts = Array.from(this.activeContexts.values()).filter(ctx => ctx.chainId === chainId);
        if (contexts.length === 0)
            return undefined;
        const primaryContext = contexts[0];
        const duration = Date.now() - primaryContext.startTime;
        return {
            traceId: primaryContext.traceId,
            requestId: primaryContext.requestId,
            currentModule: primaryContext.currentModule,
            moduleStack: primaryContext.moduleStack,
            pathHistory: primaryContext.pathHistory,
            status: primaryContext.status,
            duration
        };
    }
    /**
     * Detect chain breakpoint
     */
    detectChainBreakpoint(context, reason, details) {
        const breakpoint = {
            timestamp: Date.now(),
            reason,
            details,
            repairAttempted: false
        };
        this.chainBreakpoints.set(context.chainId, breakpoint);
        // Attempt auto-repair if needed
        this.attemptChainRepair(context, reason);
    }
    /**
     * Attempt chain repair
     */
    attemptChainRepair(context, reason) {
        const breakpoint = this.chainBreakpoints.get(context.chainId);
        if (!breakpoint || breakpoint.repairAttempted)
            return;
        breakpoint.repairAttempted = true;
        // Simple repair strategies
        switch (reason) {
            case 'path_change':
                // Add path change to shared data for tracking
                context.sharedData.set('path_change_repair', {
                    timestamp: Date.now(),
                    oldPath: context.pathHistory[context.pathHistory.length - 2]?.path,
                    newPath: context.currentPath
                });
                break;
            case 'module_timeout':
                // Extend timeout and retry
                context.sharedData.set('timeout_repair', {
                    timestamp: Date.now(),
                    extendedTimeout: true
                });
                break;
            default:
                // Log breakpoint for manual intervention
                context.sharedData.set('breakpoint_logged', {
                    timestamp: Date.now(),
                    reason,
                    requiresManualIntervention: true
                });
        }
    }
    /**
     * Get chain breakpoints
     */
    getChainBreakpoints(chainId) {
        if (chainId) {
            const breakpoint = this.chainBreakpoints.get(chainId);
            return breakpoint ? [{
                    chainId,
                    timestamp: breakpoint.timestamp,
                    reason: breakpoint.reason,
                    details: breakpoint.details,
                    repairAttempted: breakpoint.repairAttempted
                }] : [];
        }
        return Array.from(this.chainBreakpoints.entries()).map(([chainId, breakpoint]) => ({
            chainId,
            timestamp: breakpoint.timestamp,
            reason: breakpoint.reason,
            details: breakpoint.details,
            repairAttempted: breakpoint.repairAttempted
        }));
    }
    /**
     * Clear chain breakpoints
     */
    clearChainBreakpoints(chainId) {
        if (chainId) {
            this.chainBreakpoints.delete(chainId);
        }
        else {
            this.chainBreakpoints.clear();
        }
    }
    // ========================================
    // Shared Data Management
    // ========================================
    /**
     * Set shared data
     */
    setSharedData(requestId, key, value) {
        const context = this.activeContexts.get(requestId);
        if (!context)
            return false;
        context.sharedData.set(key, value);
        return true;
    }
    /**
     * Get shared data
     */
    getSharedData(requestId, key) {
        const context = this.activeContexts.get(requestId);
        return context?.sharedData.get(key);
    }
    /**
     * Get all shared data
     */
    getAllSharedData(requestId) {
        const context = this.activeContexts.get(requestId);
        return context?.sharedData;
    }
    /**
     * Share data across chain
     */
    shareDataAcrossChain(chainId, key, value) {
        const contexts = Array.from(this.activeContexts.values()).filter(ctx => ctx.chainId === chainId);
        let count = 0;
        for (const context of contexts) {
            context.sharedData.set(key, value);
            count++;
        }
        return count;
    }
    // ========================================
    // Trace Reporting
    // ========================================
    /**
     * Generate trace report
     */
    generateTraceReport(context) {
        const duration = Date.now() - context.startTime;
        const moduleTimings = this.calculateModuleTimings(context);
        const errors = this.extractErrors(context);
        return {
            traceId: context.traceId,
            requestId: context.requestId,
            sessionId: context.sessionId,
            chainId: context.chainId,
            duration,
            startModule: context.startModule,
            moduleStack: context.moduleStack,
            pathHistory: context.pathHistory,
            status: context.status,
            summary: this.generateTraceSummary(context),
            performance: {
                totalDuration: duration,
                moduleTimings,
                pathChanges: context.pathHistory.length
            },
            errors
        };
    }
    /**
     * Get trace reports for session
     */
    getTraceReports(sessionId) {
        const targetSessionId = sessionId || this.globalSessionId;
        const contexts = this.getContextsBySession(targetSessionId);
        return contexts
            .filter(ctx => ctx.status !== 'active') // Only completed contexts
            .map(ctx => this.generateTraceReport(ctx));
    }
    // ========================================
    // Module Management
    // ========================================
    /**
     * Update module registration
     */
    updateModuleRegistration(requestId, oldModule, newModule) {
        // Remove from old module
        this.removeFromModuleContexts(requestId, oldModule);
        // Add to new module
        if (!this.moduleContexts.has(newModule)) {
            this.moduleContexts.set(newModule, []);
        }
        this.moduleContexts.get(newModule).push(requestId);
    }
    /**
     * Remove from module contexts
     */
    removeFromModuleContexts(requestId, moduleId) {
        const contextIds = this.moduleContexts.get(moduleId);
        if (contextIds) {
            const index = contextIds.indexOf(requestId);
            if (index > -1) {
                contextIds.splice(index, 1);
            }
        }
    }
    /**
     * Get active modules
     */
    getActiveModules() {
        return Array.from(this.moduleContexts.keys()).filter(moduleId => {
            const contextIds = this.moduleContexts.get(moduleId);
            return contextIds && contextIds.length > 0;
        });
    }
    /**
     * Get module context count
     */
    getModuleContextCount(moduleId) {
        return this.moduleContexts.get(moduleId)?.length || 0;
    }
    // ========================================
    // Helper Methods
    // ========================================
    createConfigSnapshot(customConfig) {
        // This would be populated with actual config data
        return {
            enabled: customConfig?.enabled ?? false,
            basePath: customConfig?.basePath || './recording-logs',
            port: customConfig?.port,
            cycleConfig: customConfig?.cycle || {},
            errorConfig: customConfig?.error || {},
            truncationConfig: customConfig?.truncation || {},
            timestamp: Date.now()
        };
    }
    resolveBasePath(customConfig) {
        return customConfig?.basePath || './recording-logs';
    }
    calculateModuleTimings(context) {
        // Simple module timing calculation based on path history
        const timings = {};
        const pathChanges = context.pathHistory;
        for (let i = 0; i < pathChanges.length; i++) {
            const current = pathChanges[i];
            const next = pathChanges[i + 1];
            if (next) {
                const duration = next.timestamp - current.timestamp;
                timings[current.moduleId] = (timings[current.moduleId] || 0) + duration;
            }
        }
        return timings;
    }
    extractErrors(context) {
        const errors = [];
        // Extract errors from shared data
        for (const [key, value] of Array.from(context.sharedData.entries())) {
            if (key.startsWith('error_') && typeof value === 'object') {
                errors.push({
                    moduleId: value.moduleId || 'unknown',
                    error: value.message || String(value),
                    timestamp: value.timestamp || Date.now()
                });
            }
        }
        return errors;
    }
    generateTraceSummary(context) {
        const pathChanges = context.pathHistory.length;
        const moduleCount = new Set(context.moduleStack).size;
        const duration = Date.now() - context.startTime;
        return `Trace completed: ${moduleCount} modules, ${pathChanges} path changes, ${duration}ms duration`;
    }
    /**
     * Cleanup old contexts
     */
    cleanup(maxAge = 24 * 60 * 60 * 1000) {
        const cutoffTime = Date.now() - maxAge;
        let cleanedCount = 0;
        // Clean history
        for (const [sessionId, contexts] of Array.from(this.contextHistory.entries())) {
            const filtered = contexts.filter((ctx) => ctx.startTime > cutoffTime);
            if (filtered.length !== contexts.length) {
                this.contextHistory.set(sessionId, filtered);
                cleanedCount += contexts.length - filtered.length;
            }
        }
        // Clean breakpoints
        for (const [chainId, breakpoint] of Array.from(this.chainBreakpoints.entries())) {
            if (breakpoint.timestamp < cutoffTime) {
                this.chainBreakpoints.delete(chainId);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * Get statistics
     */
    getStatistics() {
        return {
            activeContexts: this.activeContexts.size,
            totalContexts: this.activeContexts.size + Array.from(this.contextHistory.values()).reduce((sum, ctxs) => sum + ctxs.length, 0),
            chainBreakpoints: this.chainBreakpoints.size,
            activeModules: this.getActiveModules().length,
            sessionCount: this.contextHistory.size + 1 // +1 for current session
        };
    }
    extractModuleName(module) {
        if (!module)
            return undefined;
        if (typeof module === 'string')
            return module;
        return module.enabled ? 'module-config' : 'unknown';
    }
}

/**
 * Global configuration manager that ensures consistent configuration across modules
 */
class GlobalConfigManager {
    constructor(baseConfig = {}) {
        this.configSubscribers = new Map();
        this.validationHistory = new Map();
        this.consistencyInterval = null;
        this.moduleConfigs = new Map();
        this.globalConfig = this.initializeGlobalConfig(baseConfig);
        this.startConsistencyValidation();
    }
    // ========================================
    // Global Configuration Management
    // ========================================
    /**
     * Get global configuration
     */
    getGlobalConfig() {
        return { ...this.globalConfig };
    }
    /**
     * Update global configuration
     */
    async updateGlobalConfig(updates) {
        try {
            const oldConfig = { ...this.globalConfig };
            // Update configuration
            this.globalConfig = {
                ...this.globalConfig,
                ...updates,
                lastUpdated: Date.now()
            };
            // Generate new version
            this.globalConfig.configVersion = this.generateConfigVersion();
            // Validate consistency
            const validationResult = this.validateGlobalConsistency();
            if (!validationResult.valid) {
                this.globalConfig = oldConfig; // Rollback
                return {
                    success: false,
                    errors: validationResult.errors,
                    requiresForce: true
                };
            }
            // Notify subscribers
            await this.notifySubscribers(this.globalConfig.baseConfig);
            return {
                success: true,
                configVersion: this.globalConfig.configVersion
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
    /**
     * Register module configuration
     */
    registerModuleConfig(moduleId, config) {
        try {
            const validatedConfig = this.validateModuleConfig(config);
            if (!validatedConfig.isValid) {
                return {
                    success: false,
                    errors: validatedConfig.errors
                };
            }
            this.moduleConfigs.set(moduleId, config);
            // Update global overrides
            this.globalConfig.moduleOverrides.set(moduleId, config);
            // Update timestamp
            this.globalConfig.lastUpdated = Date.now();
            return {
                success: true,
                configVersion: this.globalConfig.configVersion
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
    /**
     * Unregister module configuration
     */
    unregisterModuleConfig(moduleId) {
        const removed = this.moduleConfigs.delete(moduleId);
        if (removed) {
            this.globalConfig.moduleOverrides.delete(moduleId);
            this.globalConfig.lastUpdated = Date.now();
        }
        return removed;
    }
    /**
     * Get module configuration
     */
    getModuleConfig(moduleId) {
        return this.moduleConfigs.get(moduleId);
    }
    /**
     * Get all module configurations
     */
    getAllModuleConfigs() {
        const result = {};
        for (const [moduleId, config] of this.moduleConfigs.entries()) {
            result[moduleId] = { ...config };
        }
        return result;
    }
    // ========================================
    // Configuration Synchronization
    // ========================================
    /**
     * Synchronize configuration across modules
     */
    async syncConfiguration(moduleConfigs) {
        const moduleResults = {};
        for (const [moduleId, config] of Object.entries(moduleConfigs)) {
            try {
                const result = this.registerModuleConfig(moduleId, config);
                moduleResults[moduleId] = result.success;
            }
            catch (error) {
                moduleResults[moduleId] = false;
            }
        }
        // Notify all subscribers about the sync
        await this.notifySubscribers(this.globalConfig.baseConfig);
        return {
            success: Object.values(moduleResults).every(success => success),
            moduleResults
        };
    }
    /**
     * Force synchronization
     */
    async forceSync() {
        const allConfigs = this.getAllModuleConfigs();
        return await this.syncConfiguration(allConfigs);
    }
    // ========================================
    // Configuration Validation
    // ========================================
    /**
     * Validate global configuration consistency
     */
    validateGlobalConsistency() {
        const errors = [];
        const warnings = [];
        // Check base configuration validity
        const baseValidation = this.validateModuleConfig(this.globalConfig.baseConfig);
        if (!baseValidation.isValid) {
            errors.push(...baseValidation.errors);
        }
        // Check module override consistency
        for (const [moduleId, config] of this.moduleConfigs.entries()) {
            const moduleValidation = this.validateModuleConfig(config);
            if (!moduleValidation.isValid) {
                errors.push(`Module ${moduleId}: ${moduleValidation.errors.join(', ')}`);
            }
            // Check compatibility with global base config
            const compatibilityResult = this.checkModuleCompatibility(config, this.globalConfig.baseConfig);
            if (!compatibilityResult.valid) {
                warnings.push(`Module ${moduleId}: ${compatibilityResult.warnings.join(', ')}`);
            }
        }
        // Check for conflicts between modules
        const conflictCheck = this.checkModuleConflicts();
        if (conflictCheck.conflicts.length > 0) {
            errors.push(...conflictCheck.conflicts);
        }
        // Store validation result
        const result = {
            valid: errors.length === 0,
            errors,
            warnings,
            details: {
                modulesValidated: this.moduleConfigs.size,
                conflictsFound: conflictCheck.conflicts.length,
                lastChecked: Date.now()
            }
        };
        this.validationHistory.set(this.globalConfig.configVersion, result);
        return result;
    }
    /**
     * Validate module configuration
     */
    validateModuleConfig(config) {
        const errors = [];
        const warnings = [];
        // Check required fields
        if (config.enabled === undefined) {
            warnings.push('Configuration does not specify enabled state');
        }
        // Check cycle configuration consistency
        if (config.cycle?.enabled && !config.basePath) {
            errors.push('Cycle recording requires basePath to be specified');
        }
        // Check error configuration consistency
        if (config.error?.enabled && !config.error.basePath) {
            warnings.push('Error recording enabled but no basePath specified');
        }
        // Check truncation configuration
        if (config.truncation?.enabled) {
            if (config.truncation.defaultMaxLength && config.truncation.defaultMaxLength <= 0) {
                errors.push('Truncation maxLength must be positive');
            }
        }
        return {
            ...config,
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Check module compatibility with global config
     */
    checkModuleCompatibility(moduleConfig, globalBaseConfig) {
        const warnings = [];
        // Check enabled state compatibility
        if (globalBaseConfig.enabled && !moduleConfig.enabled) {
            warnings.push('Module configuration disabled while global config is enabled');
        }
        // Check path compatibility
        if (globalBaseConfig.basePath && moduleConfig.basePath &&
            !moduleConfig.basePath.startsWith(globalBaseConfig.basePath)) {
            warnings.push('Module basePath is not within global basePath');
        }
        // Check truncation compatibility
        if (globalBaseConfig.truncation?.enabled && !moduleConfig.truncation?.enabled) {
            warnings.push('Global truncation enabled but module has truncation disabled');
        }
        return {
            valid: true, // Compatibility issues are warnings, not errors
            warnings
        };
    }
    /**
     * Check for conflicts between modules
     */
    checkModuleConflicts() {
        const conflicts = [];
        const moduleEntries = Array.from(this.moduleConfigs.entries());
        // Check for path conflicts
        const paths = new Map();
        for (const [moduleId, config] of moduleEntries) {
            if (config.basePath) {
                if (!paths.has(config.basePath)) {
                    paths.set(config.basePath, []);
                }
                paths.get(config.basePath).push(moduleId);
            }
        }
        for (const [path, modules] of paths.entries()) {
            if (modules.length > 1) {
                conflicts.push(`Path conflict: ${modules.join(', ')} all using path '${path}'`);
            }
        }
        return { conflicts };
    }
    // ========================================
    // Subscription Management
    // ========================================
    /**
     * Subscribe to configuration changes
     */
    subscribe(moduleId, callback) {
        this.configSubscribers.set(moduleId, callback);
        // Send current configuration immediately
        try {
            callback(this.globalConfig.baseConfig);
        }
        catch (error) {
            console.error(`[GlobalConfigManager] Error sending initial config to ${moduleId}:`, error);
        }
    }
    /**
     * Unsubscribe from configuration changes
     */
    unsubscribe(moduleId) {
        return this.configSubscribers.delete(moduleId);
    }
    /**
     * Notify all subscribers of configuration changes
     */
    async notifySubscribers(config) {
        const promises = Array.from(this.configSubscribers.entries()).map(async ([moduleId, callback]) => {
            try {
                await callback(config);
            }
            catch (error) {
                console.error(`[GlobalConfigManager] Error notifying ${moduleId} of config change:`, error);
            }
        });
        await Promise.allSettled(promises);
    }
    // ========================================
    // Consistency Validation
    // ========================================
    /**
     * Start consistency validation interval
     */
    startConsistencyValidation() {
        if (this.consistencyInterval) {
            clearInterval(this.consistencyInterval);
        }
        this.consistencyInterval = setInterval(() => {
            if (this.globalConfig.consistency.enforced) {
                const result = this.validateGlobalConsistency();
                if (!result.valid) {
                    console.warn('[GlobalConfigManager] Consistency validation failed:', result.errors);
                }
            }
        }, this.globalConfig.consistency.validationInterval);
    }
    /**
     * Stop consistency validation
     */
    stopConsistencyValidation() {
        if (this.consistencyInterval) {
            clearInterval(this.consistencyInterval);
            this.consistencyInterval = null;
        }
    }
    /**
     * Get validation history
     */
    getValidationHistory(version) {
        if (version) {
            const result = this.validationHistory.get(version);
            return result ? [result] : [];
        }
        return Array.from(this.validationHistory.values());
    }
    /**
     * Get latest validation result
     */
    getLatestValidation() {
        const versions = Array.from(this.validationHistory.keys()).sort();
        if (versions.length === 0)
            return undefined;
        return this.validationHistory.get(versions[versions.length - 1]);
    }
    // ========================================
    // Configuration Export/Import
    // ========================================
    /**
     * Export configuration
     */
    exportConfiguration() {
        return {
            globalConfig: this.getGlobalConfig(),
            moduleConfigs: this.getAllModuleConfigs(),
            exportTime: Date.now(),
            version: this.globalConfig.configVersion
        };
    }
    /**
     * Import configuration
     */
    async importConfiguration(data, force = false) {
        try {
            // Import global config
            const globalResult = await this.updateGlobalConfig(data.globalConfig);
            if (!globalResult.success && !force) {
                return globalResult;
            }
            // Import module configs
            const syncResult = await this.syncConfiguration(data.moduleConfigs);
            if (!syncResult.success && !force) {
                return {
                    success: false,
                    errors: ['Module configuration synchronization failed']
                };
            }
            return {
                success: true,
                configVersion: this.globalConfig.configVersion
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
    // ========================================
    // Helper Methods
    // ========================================
    initializeGlobalConfig(baseConfig) {
        return {
            sessionId: v4(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            baseConfig,
            moduleOverrides: new Map(),
            configVersion: '1.0.0',
            lastUpdated: Date.now(),
            consistency: {
                enforced: true,
                validationInterval: 60000, // 1 minute
                allowedDeviations: []
            }
        };
    }
    generateConfigVersion() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const latestValidation = this.getLatestValidation();
        const uptime = Date.now() - this.globalConfig.lastUpdated;
        return {
            moduleCount: this.moduleConfigs.size,
            subscriberCount: this.configSubscribers.size,
            validationCount: this.validationHistory.size,
            lastValidation: latestValidation,
            configVersion: this.globalConfig.configVersion,
            uptime
        };
    }
    /**
     * Cleanup
     */
    destroy() {
        this.stopConsistencyValidation();
        this.configSubscribers.clear();
        this.moduleConfigs.clear();
        this.validationHistory.clear();
    }
}

/**
 * Configuration validator that ensures all recording configurations are valid
 */
class ConfigValidator {
    constructor() {
        this.validationRules = new Map();
        this.initializeValidationRules();
    }
    // ========================================
    // Main Validation Methods
    // ========================================
    /**
     * Validate complete recording configuration
     */
    validateRecordingConfig(config) {
        const errors = [];
        const warnings = [];
        // Validate top-level configuration
        errors.push(...this.validateTopLevelConfig(config));
        // Validate sub-configurations if enabled
        if (config.cycle?.enabled) {
            errors.push(...this.validateCycleConfig(config.cycle));
        }
        if (config.error?.enabled) {
            errors.push(...this.validateErrorConfig(config.error));
        }
        if (config.truncation?.enabled) {
            errors.push(...this.validateTruncationConfig(config.truncation));
        }
        if (config.file) {
            errors.push(...this.validateFileConfig(config.file));
        }
        // Check cross-configuration dependencies
        errors.push(...this.validateConfigDependencies(config));
        return {
            ...config,
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Validate global recording configuration
     */
    validateGlobalConfig(config) {
        const errors = [];
        const warnings = [];
        // Validate base configuration
        const baseValidation = this.validateRecordingConfig(config.baseConfig);
        if (!baseValidation.isValid) {
            errors.push(...baseValidation.errors);
        }
        // Validate module overrides
        for (const [moduleId, moduleConfig] of config.moduleOverrides.entries()) {
            const moduleValidation = this.validateRecordingConfig(moduleConfig);
            if (!moduleValidation.isValid) {
                errors.push(`Module ${moduleId}: ${moduleValidation.errors.join(', ')}`);
            }
        }
        // Validate consistency settings
        errors.push(...this.validateConsistencySettings(config.consistency));
        // Check version compatibility
        if (!this.isValidVersion(config.version)) {
            warnings.push(`Invalid version format: ${config.version}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details: {
                modulesValidated: config.moduleOverrides.size,
                baseConfigValid: baseValidation.isValid,
                consistencySettingsValid: errors.filter(e => e.includes('consistency')).length === 0
            }
        };
    }
    /**
     * Validate chain configuration (multiple related modules)
     */
    validateChainConfig(moduleConfigs) {
        const moduleIssues = {};
        const globalErrors = [];
        const globalWarnings = [];
        // Validate each module individually
        for (const [moduleId, config] of Object.entries(moduleConfigs)) {
            const validation = this.validateRecordingConfig(config);
            if (!validation.isValid) {
                moduleIssues[moduleId] = validation.errors;
            }
            if (validation.warnings.length > 0) {
                if (!moduleIssues[moduleId]) {
                    moduleIssues[moduleId] = [];
                }
                moduleIssues[moduleId].push(...validation.warnings);
            }
        }
        // Validate cross-module consistency
        const crossModuleIssues = this.validateCrossModuleConsistency(moduleConfigs);
        globalErrors.push(...crossModuleIssues.errors);
        globalWarnings.push(...crossModuleIssues.warnings);
        return {
            valid: globalErrors.length === 0 && Object.keys(moduleIssues).length === 0,
            errors: globalErrors,
            warnings: globalWarnings,
            moduleIssues
        };
    }
    // ========================================
    // Configuration Section Validators
    // ========================================
    validateTopLevelConfig(config) {
        const errors = [];
        // Check required fields
        if (config.enabled === undefined) {
            errors.push('enabled field is required');
        }
        if (config.enabled && !config.basePath) {
            errors.push('basePath is required when recording is enabled');
        }
        // Validate basePath format
        if (config.basePath) {
            errors.push(...this.validatePath(config.basePath, 'basePath'));
        }
        // Validate port if specified
        if (config.port !== undefined) {
            if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
                errors.push('port must be an integer between 1 and 65535');
            }
        }
        return errors;
    }
    validateCycleConfig(config) {
        const errors = [];
        // Check required fields
        if (!config.mode || !['disabled', 'single', 'cyclic'].includes(config.mode)) {
            errors.push('cycle mode must be one of: disabled, single, cyclic');
        }
        // Validate path templates
        if (config.cycleDirTemplate) {
            errors.push(...this.validateTemplate(config.cycleDirTemplate, 'cycleDirTemplate'));
        }
        if (config.mainFileTemplate) {
            errors.push(...this.validateTemplate(config.mainFileTemplate, 'mainFileTemplate'));
        }
        // Validate format
        if (config.format && !['json', 'jsonl', 'csv'].includes(config.format)) {
            errors.push('cycle format must be one of: json, jsonl, csv');
        }
        // Validate numeric values
        if (config.maxCyclesRetained !== undefined && config.maxCyclesRetained < 1) {
            errors.push('maxCyclesRetained must be at least 1');
        }
        return errors;
    }
    validateErrorConfig(config) {
        const errors = [];
        // Validate levels
        if (config.levels) {
            const validLevels = ['trace', 'debug', 'info', 'warning', 'error', 'fatal'];
            const invalidLevels = config.levels.filter(level => !validLevels.includes(level));
            if (invalidLevels.length > 0) {
                errors.push(`Invalid error levels: ${invalidLevels.join(', ')}`);
            }
        }
        // Validate categories
        if (config.categories) {
            const validCategories = ['network', 'validation', 'processing', 'system', 'security', 'business'];
            const invalidCategories = config.categories.filter(cat => !validCategories.includes(cat));
            if (invalidCategories.length > 0) {
                errors.push(`Invalid error categories: ${invalidCategories.join(', ')}`);
            }
        }
        // Validate path templates
        if (config.indexFileTemplate) {
            errors.push(...this.validateTemplate(config.indexFileTemplate, 'indexFileTemplate'));
        }
        if (config.detailFileTemplate) {
            errors.push(...this.validateTemplate(config.detailFileTemplate, 'detailFileTemplate'));
        }
        // Validate formats
        if (config.indexFormat && !['jsonl', 'csv'].includes(config.indexFormat)) {
            errors.push('error indexFormat must be jsonl or csv');
        }
        if (config.detailFormat && !['json', 'pretty'].includes(config.detailFormat)) {
            errors.push('error detailFormat must be json or pretty');
        }
        // Validate numeric values
        if (config.maxErrorsRetained !== undefined && config.maxErrorsRetained < 1) {
            errors.push('maxErrorsRetained must be at least 1');
        }
        return errors;
    }
    validateTruncationConfig(config) {
        const errors = [];
        // Validate default strategy
        if (config.defaultStrategy && !['truncate', 'replace', 'hide'].includes(config.defaultStrategy)) {
            errors.push('defaultStrategy must be one of: truncate, replace, hide');
        }
        // Validate default max length
        if (config.defaultMaxLength !== undefined && config.defaultMaxLength < 1) {
            errors.push('defaultMaxLength must be at least 1');
        }
        // Validate field rules
        if (config.fields) {
            for (let i = 0; i < config.fields.length; i++) {
                const rule = config.fields[i];
                errors.push(...this.validateFieldRule(rule, `fields[${i}]`));
            }
        }
        // Validate path patterns
        if (config.pathPatterns) {
            for (let i = 0; i < config.pathPatterns.length; i++) {
                const pattern = config.pathPatterns[i];
                errors.push(...this.validatePathPattern(pattern, `pathPatterns[${i}]`));
            }
        }
        // Validate array truncation limit
        if (config.arrayTruncateLimit !== undefined && config.arrayTruncateLimit < 1) {
            errors.push('arrayTruncateLimit must be at least 1');
        }
        return errors;
    }
    validateFileConfig(config) {
        const errors = [];
        // Validate numeric values
        if (config.maxFileAge !== undefined && config.maxFileAge < 0) {
            errors.push('maxFileAge must be non-negative');
        }
        if (config.maxFileSize !== undefined && config.maxFileSize < 1) {
            errors.push('maxFileSize must be at least 1');
        }
        return errors;
    }
    // ========================================
    // Cross-Validation Methods
    // ========================================
    validateConfigDependencies(config) {
        const errors = [];
        // Check that cycle recording has proper base path
        if (config.cycle?.enabled && !config.basePath) {
            errors.push('Cycle recording requires basePath to be specified');
        }
        // Check that error recording has proper base path
        if (config.error?.enabled && !config.basePath) {
            errors.push('Error recording requires basePath to be specified');
        }
        // Check truncation dependencies
        if (config.truncation?.enabled && (!config.cycle?.enabled && !config.error?.enabled)) {
            errors.push('Truncation requires either cycle or error recording to be enabled');
        }
        return errors;
    }
    validateCrossModuleConsistency(moduleConfigs) {
        const errors = [];
        const warnings = [];
        const configs = Object.values(moduleConfigs);
        // Check for consistent enabled states
        const enabledStates = configs.map(c => c.enabled);
        if (new Set(enabledStates).size > 1) {
            warnings.push('Modules have inconsistent enabled states');
        }
        // Check for path conflicts
        const basePaths = configs.map(c => c.basePath).filter(Boolean);
        if (new Set(basePaths).size !== basePaths.length) {
            errors.push('Multiple modules are using the same basePath');
        }
        // Check for format consistency
        const cycleFormats = configs.map(c => c.cycle?.format).filter(Boolean);
        if (new Set(cycleFormats).size > 1) {
            warnings.push('Modules have inconsistent cycle recording formats');
        }
        // Check for port conflicts
        const ports = configs.map(c => c.port).filter(Boolean);
        const uniquePorts = new Set(ports);
        if (uniquePorts.size !== ports.length) {
            errors.push('Multiple modules are configured to use the same port');
        }
        return { errors, warnings };
    }
    validateConsistencySettings(consistency) {
        const errors = [];
        if (consistency.validationInterval !== undefined && consistency.validationInterval < 1000) {
            errors.push('validationInterval must be at least 1000ms');
        }
        if (consistency.allowedDeviations && !Array.isArray(consistency.allowedDeviations)) {
            errors.push('allowedDeviations must be an array');
        }
        return errors;
    }
    // ========================================
    // Helper Validators
    // ========================================
    validatePath(path, fieldName) {
        const errors = [];
        if (typeof path !== 'string' || path.trim() === '') {
            errors.push(`${fieldName} must be a non-empty string`);
            return errors;
        }
        // Check for invalid characters
        const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
        if (invalidChars.some(char => path.includes(char))) {
            errors.push(`${fieldName} contains invalid characters: ${invalidChars.join(', ')}`);
        }
        // Check path length
        if (path.length > 260) {
            errors.push(`${fieldName} is too long (max 260 characters)`);
        }
        return errors;
    }
    validateTemplate(template, fieldName) {
        const errors = [];
        if (typeof template !== 'string' || template.trim() === '') {
            errors.push(`${fieldName} must be a non-empty string`);
            return errors;
        }
        // Check for invalid template variables
        const invalidVariables = template.match(/\$\{([^}]+)\}/g);
        if (invalidVariables) {
            const validVariables = ['cycleId', 'requestId', 'sessionId', 'timestamp', 'date', 'time', 'format', 'type', 'index', 'errorId'];
            const invalidVars = invalidVariables.filter(v => {
                const varName = v.replace(/[${}]/g, '');
                return !validVariables.includes(varName);
            });
            if (invalidVars.length > 0) {
                errors.push(`${fieldName} contains invalid template variables: ${invalidVars.join(', ')}`);
            }
        }
        return errors;
    }
    validateFieldRule(rule, fieldPath) {
        const errors = [];
        if (!rule.fieldPath || typeof rule.fieldPath !== 'string') {
            errors.push(`${fieldPath}.fieldPath is required and must be a string`);
        }
        if (rule.strategy && !['truncate', 'replace', 'hide'].includes(rule.strategy)) {
            errors.push(`${fieldPath}.strategy must be one of: truncate, replace, hide`);
        }
        if (rule.maxLength !== undefined && rule.maxLength < 1) {
            errors.push(`${fieldPath}.maxLength must be at least 1`);
        }
        if (rule.priority !== undefined && (!Number.isInteger(rule.priority) || rule.priority < 0)) {
            errors.push(`${fieldPath}.priority must be a non-negative integer`);
        }
        return errors;
    }
    validatePathPattern(pattern, fieldPath) {
        const errors = [];
        if (!pattern.pattern || typeof pattern.pattern !== 'string') {
            errors.push(`${fieldPath}.pattern is required and must be a string`);
        }
        if (pattern.condition && !['always', 'if_long', 'if_nested'].includes(pattern.condition)) {
            errors.push(`${fieldPath}.condition must be one of: always, if_long, if_nested`);
        }
        if (pattern.strategy && !['truncate', 'replace', 'hide'].includes(pattern.strategy)) {
            errors.push(`${fieldPath}.strategy must be one of: truncate, replace, hide`);
        }
        if (pattern.maxLength !== undefined && pattern.maxLength < 1) {
            errors.push(`${fieldPath}.maxLength must be at least 1`);
        }
        return errors;
    }
    isValidVersion(version) {
        // Simple version validation (semantic versioning pattern)
        const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
        return versionRegex.test(version);
    }
    // ========================================
    // Validation Rules Management
    // ========================================
    initializeValidationRules() {
        // Add custom validation rules if needed
        this.validationRules.set('customPathRule', (config) => {
            const errors = [];
            // Custom validation logic
            return errors;
        });
    }
    /**
     * Add custom validation rule
     */
    addValidationRule(name, rule) {
        this.validationRules.set(name, rule);
    }
    /**
     * Remove custom validation rule
     */
    removeValidationRule(name) {
        return this.validationRules.delete(name);
    }
    /**
     * Get all validation rules
     */
    getValidationRules() {
        return Array.from(this.validationRules.keys()).map(name => ({
            name,
            description: `Custom validation rule: ${name}`
        }));
    }
}

/**
 * Path resolver that handles template-based path resolution with variable substitution
 */
class PathResolver {
    constructor() {
        this.globalVariables = new Map();
        this.customTemplates = new Map();
        this.initializeGlobalVariables();
    }
    // ========================================
    // Template Resolution Methods
    // ========================================
    /**
     * Resolve a path template with variables
     */
    resolveTemplate(template, variables = {}) {
        if (!template || typeof template !== 'string') {
            return template || '';
        }
        let result = template;
        // Apply global variables first
        for (const [key, value] of this.globalVariables.entries()) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        }
        // Apply custom templates
        for (const [key, value] of this.customTemplates.entries()) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        }
        // Apply provided variables
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
        }
        // Apply built-in functions
        result = this.applyBuiltInFunctions(result);
        // Clean up unresolved variables
        result = result.replace(/\$\{[^}]+\}/g, '');
        return result;
    }
    /**
     * Resolve cycle recording path
     */
    resolveCyclePath(config, variables) {
        const basePath = config.basePath || './cycle-logs';
        const template = config.cycleDirTemplate || 'cycles/${cycleId}';
        const extendedVariables = {
            ...variables,
            date: new Date(variables.timestamp).toISOString().split('T')[0],
            time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
            timestamp: variables.timestamp,
            year: new Date(variables.timestamp).getFullYear(),
            month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
            day: String(new Date(variables.timestamp).getDate()).padStart(2, '0'),
            hour: String(new Date(variables.timestamp).getHours()).padStart(2, '0'),
            minute: String(new Date(variables.timestamp).getMinutes()).padStart(2, '0'),
            second: String(new Date(variables.timestamp).getSeconds()).padStart(2, '0'),
            millisecond: String(new Date(variables.timestamp).getMilliseconds()).padStart(3, '0')
        };
        const resolvedPath = this.resolveTemplate(template, extendedVariables);
        // Combine with base path
        return this.joinPaths(basePath, resolvedPath);
    }
    /**
     * Resolve error recording path
     */
    resolveErrorPath(config, variables) {
        const basePath = config.basePath || './error-logs';
        const template = config.detailFileTemplate || 'errors/${errorId}.json';
        const extendedVariables = {
            ...variables,
            date: new Date(variables.timestamp).toISOString().split('T')[0],
            time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
            timestamp: variables.timestamp,
            year: new Date(variables.timestamp).getFullYear(),
            month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
            day: String(new Date(variables.timestamp).getDate()).padStart(2, '0'),
            hour: String(new Date(variables.timestamp).getHours()).padStart(2, '0'),
            minute: String(new Date(variables.timestamp).getMinutes()).padStart(2, '0'),
            second: String(new Date(variables.timestamp).getSeconds()).padStart(2, '0'),
            level: variables.level || 'unknown',
            category: variables.category || 'system'
        };
        const resolvedPath = this.resolveTemplate(template, extendedVariables);
        // Combine with base path
        return this.joinPaths(basePath, resolvedPath);
    }
    /**
     * Resolve complete file path for cycle recording
     */
    resolveCycleFilePath(config, variables) {
        const cyclePath = this.resolveCyclePath(config, variables);
        const fileTemplate = config.mainFileTemplate || 'main.${format}';
        const fileVariables = {
            ...variables,
            date: new Date(variables.timestamp).toISOString().split('T')[0],
            time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
            paddedIndex: String(variables.index).padStart(6, '0'),
            fileType: variables.type,
            extension: this.getFormatExtension(variables.format)
        };
        const fileName = this.resolveTemplate(fileTemplate, fileVariables);
        return this.joinPaths(cyclePath, fileName);
    }
    /**
     * Resolve error index file path
     */
    resolveErrorIndexPath(config, variables) {
        const basePath = config.basePath || './error-logs';
        const template = config.indexFileTemplate || 'errors/index.jsonl';
        const extendedVariables = {
            ...variables,
            date: variables.date || new Date(variables.timestamp).toISOString().split('T')[0],
            time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
            timestamp: variables.timestamp,
            year: new Date(variables.timestamp).getFullYear(),
            month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
            day: String(new Date(variables.timestamp).getDate()).padStart(2, '0')
        };
        const resolvedPath = this.resolveTemplate(template, extendedVariables);
        // Combine with base path
        return this.joinPaths(basePath, resolvedPath);
    }
    // ========================================
    // Variable Management
    // ========================================
    /**
     * Set global variable
     */
    setGlobalVariable(name, value) {
        this.globalVariables.set(name, value);
    }
    /**
     * Get global variable
     */
    getGlobalVariable(name) {
        return this.globalVariables.get(name);
    }
    /**
     * Remove global variable
     */
    removeGlobalVariable(name) {
        return this.globalVariables.delete(name);
    }
    /**
     * Get all global variables
     */
    getGlobalVariables() {
        const result = {};
        for (const [key, value] of this.globalVariables.entries()) {
            result[key] = value;
        }
        return result;
    }
    /**
     * Set custom template
     */
    setCustomTemplate(name, template) {
        this.customTemplates.set(name, template);
    }
    /**
     * Get custom template
     */
    getCustomTemplate(name) {
        return this.customTemplates.get(name);
    }
    /**
     * Remove custom template
     */
    removeCustomTemplate(name) {
        return this.customTemplates.delete(name);
    }
    /**
     * Get all custom templates
     */
    getCustomTemplates() {
        const result = {};
        for (const [key, value] of this.customTemplates.entries()) {
            result[key] = value;
        }
        return result;
    }
    // ========================================
    // Path Validation and Normalization
    // ========================================
    /**
     * Validate path template
     */
    validateTemplate(template) {
        const errors = [];
        const variables = [];
        if (!template || typeof template !== 'string') {
            errors.push('Template must be a non-empty string');
            return { valid: false, errors, variables };
        }
        // Extract variables
        const variableMatches = template.match(/\$\{([^}]+)\}/g);
        if (variableMatches) {
            for (const match of variableMatches) {
                const variableName = match.replace(/[${}]/g, '');
                variables.push(variableName);
                // Validate variable name
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
                    errors.push(`Invalid variable name: ${variableName}`);
                }
            }
        }
        // Check for recursive templates
        if (template.includes('${${')) {
            errors.push('Template contains recursive variable references');
        }
        // Check for malformed templates
        if (template.includes('${') && !template.includes('}')) {
            errors.push('Template contains unclosed variable reference');
        }
        return {
            valid: errors.length === 0,
            errors,
            variables
        };
    }
    /**
     * Normalize path
     */
    normalizePath(path) {
        // Replace backslashes with forward slashes
        path = path.replace(/\\/g, '/');
        // Remove redundant slashes
        path = path.replace(/\/+/g, '/');
        // Remove leading/trailing slashes (unless it's root)
        if (path.length > 1) {
            path = path.replace(/^\/+|\/+$/g, '');
        }
        return path;
    }
    /**
     * Join path segments
     */
    joinPaths(...segments) {
        const nonEmptySegments = segments.filter(segment => segment && segment.trim() !== '');
        return this.normalizePath(nonEmptySegments.join('/'));
    }
    /**
     * Get absolute path
     */
    getAbsolutePath(relativePath, basePath = process.cwd()) {
        if (this.isAbsolutePath(relativePath)) {
            return this.normalizePath(relativePath);
        }
        return this.joinPaths(basePath, relativePath);
    }
    /**
     * Check if path is absolute
     */
    isAbsolutePath(path) {
        return path.startsWith('/') || /^[A-Za-z]:/.test(path);
    }
    // ========================================
    // Utility Methods
    // ========================================
    /**
     * Extract variables from template
     */
    extractVariables(template) {
        if (!template)
            return [];
        const matches = template.match(/\$\{([^}]+)\}/g);
        if (!matches)
            return [];
        return matches.map(match => match.replace(/[${}]/g, '')).filter(Boolean);
    }
    /**
     * Check if template contains variable
     */
    containsVariable(template, variable) {
        if (!template || !variable)
            return false;
        const regex = new RegExp(`\\$\\{${variable}\\}`, 'g');
        return regex.test(template);
    }
    /**
     * Get format extension
     */
    getFormatExtension(format) {
        switch (format.toLowerCase()) {
            case 'json':
                return 'json';
            case 'jsonl':
                return 'jsonl';
            case 'csv':
                return 'csv';
            case 'txt':
                return 'txt';
            case 'log':
                return 'log';
            default:
                return format;
        }
    }
    /**
     * Apply built-in functions
     */
    applyBuiltInFunctions(template) {
        // Date functions
        template = template.replace(/\$\{date:([^}]+)\}/g, (match, format) => {
            return this.formatDate(new Date(), format);
        });
        // Timestamp functions
        template = template.replace(/\$\{timestamp:([^}]+)\}/g, (match, format) => {
            return this.formatTimestamp(Date.now(), format);
        });
        // Random functions
        template = template.replace(/\$\{random:([^}]+)\}/g, (match, length) => {
            return this.generateRandomString(parseInt(length) || 8);
        });
        // UUID functions
        template = template.replace(/\$\{uuid\}/g, () => {
            return this.generateUUID();
        });
        return template;
    }
    /**
     * Format date
     */
    formatDate(date, format) {
        const replacements = {
            'YYYY': String(date.getFullYear()),
            'YY': String(date.getFullYear()).slice(-2),
            'MM': String(date.getMonth() + 1).padStart(2, '0'),
            'DD': String(date.getDate()).padStart(2, '0'),
            'HH': String(date.getHours()).padStart(2, '0'),
            'mm': String(date.getMinutes()).padStart(2, '0'),
            'ss': String(date.getSeconds()).padStart(2, '0'),
            'SSS': String(date.getMilliseconds()).padStart(3, '0')
        };
        let result = format;
        for (const [key, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(key, 'g'), value);
        }
        return result;
    }
    /**
     * Format timestamp
     */
    formatTimestamp(timestamp, format) {
        return this.formatDate(new Date(timestamp), format);
    }
    /**
     * Generate random string
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Generate UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Initialize global variables
     */
    initializeGlobalVariables() {
        const now = new Date();
        this.globalVariables.set('hostname', process.env.HOSTNAME || 'localhost');
        this.globalVariables.set('pid', String(process.pid));
        this.globalVariables.set('platform', process.platform);
        this.globalVariables.set('arch', process.arch);
        this.globalVariables.set('nodeVersion', process.version);
        this.globalVariables.set('username', process.env.USER || 'unknown');
        this.globalVariables.set('cwd', process.cwd());
        this.globalVariables.set('tempDir', process.env.TMPDIR || '/tmp');
        this.globalVariables.set('homeDir', process.env.HOME || '/home/user');
        // Date/time variables
        this.globalVariables.set('currentYear', String(now.getFullYear()));
        this.globalVariables.set('currentMonth', String(now.getMonth() + 1).padStart(2, '0'));
        this.globalVariables.set('currentDay', String(now.getDate()).padStart(2, '0'));
        this.globalVariables.set('currentHour', String(now.getHours()).padStart(2, '0'));
        this.globalVariables.set('currentMinute', String(now.getMinutes()).padStart(2, '0'));
        this.globalVariables.set('currentSecond', String(now.getSeconds()).padStart(2, '0'));
        this.globalVariables.set('currentDate', now.toISOString().split('T')[0]);
        this.globalVariables.set('currentTime', now.toISOString().split('T')[1].split('.')[0]);
        this.globalVariables.set('currentTimestamp', String(now.getTime()));
    }
    /**
     * Get supported variables
     */
    getSupportedVariables() {
        return [
            {
                category: 'Global Variables',
                variables: [
                    { name: 'hostname', description: 'System hostname' },
                    { name: 'pid', description: 'Process ID' },
                    { name: 'platform', description: 'Operating system platform' },
                    { name: 'arch', description: 'System architecture' },
                    { name: 'nodeVersion', description: 'Node.js version' },
                    { name: 'username', description: 'Current username' },
                    { name: 'cwd', description: 'Current working directory' },
                    { name: 'tempDir', description: 'Temporary directory' },
                    { name: 'homeDir', description: 'User home directory' }
                ]
            },
            {
                category: 'Date/Time Variables',
                variables: [
                    { name: 'currentYear', description: 'Current year (4 digits)' },
                    { name: 'currentMonth', description: 'Current month (2 digits)' },
                    { name: 'currentDay', description: 'Current day (2 digits)' },
                    { name: 'currentHour', description: 'Current hour (2 digits)' },
                    { name: 'currentMinute', description: 'Current minute (2 digits)' },
                    { name: 'currentSecond', description: 'Current second (2 digits)' },
                    { name: 'currentDate', description: 'Current date (YYYY-MM-DD)' },
                    { name: 'currentTime', description: 'Current time (HH:MM:SS)' },
                    { name: 'currentTimestamp', description: 'Current timestamp in milliseconds' }
                ]
            },
            {
                category: 'Context Variables',
                variables: [
                    { name: 'cycleId', description: 'Cycle identifier' },
                    { name: 'requestId', description: 'Request identifier' },
                    { name: 'sessionId', description: 'Session identifier' },
                    { name: 'traceId', description: 'Trace identifier' },
                    { name: 'errorId', description: 'Error identifier' },
                    { name: 'timestamp', description: 'Event timestamp' },
                    { name: 'date', description: 'Event date (YYYY-MM-DD)' },
                    { name: 'time', description: 'Event time (HH:MM:SS)' },
                    { name: 'format', description: 'File format' },
                    { name: 'type', description: 'Event type' },
                    { name: 'index', description: 'Event index' },
                    { name: 'level', description: 'Error level' },
                    { name: 'category', description: 'Error category' }
                ]
            },
            {
                category: 'Built-in Functions',
                variables: [
                    { name: 'date:format', description: 'Format current date with custom format' },
                    { name: 'timestamp:format', description: 'Format timestamp with custom format' },
                    { name: 'random:length', description: 'Generate random string of specified length' },
                    { name: 'uuid', description: 'Generate UUID' }
                ]
            }
        ];
    }
}

/**
 * Message center for module communication
 */
class MessageCenter {
    /**
     * Private constructor for singleton pattern
     */
    constructor() {
        this.modules = new Map(); // Map of module IDs to module instances
        this.pendingRequests = new Map();
        // Statistics tracking
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: 0,
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: Date.now(),
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
    /**
     * Get the singleton instance of MessageCenter
     * @returns MessageCenter instance
     */
    static getInstance() {
        if (!MessageCenter.instance) {
            MessageCenter.instance = new MessageCenter();
        }
        return MessageCenter.instance;
    }
    /**
     * Register a module with the message center
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    registerModule(moduleId, moduleInstance) {
        this.modules.set(moduleId, moduleInstance);
        this.stats.registeredModules = this.modules.size;
        // Notify other modules about new registration
        setImmediate(() => {
            this.broadcastMessage({
                id: v4(),
                type: 'module_registered',
                source: 'MessageCenter',
                payload: { moduleId },
                timestamp: Date.now(),
            });
        });
    }
    /**
     * Unregister a module from the message center
     * @param moduleId - Module ID
     */
    unregisterModule(moduleId) {
        this.modules.delete(moduleId);
        this.stats.registeredModules = this.modules.size;
        // Clean up any pending requests for this module
        for (const [correlationId, request] of this.pendingRequests.entries()) {
            // In a real implementation, you might want to check if this request was to/from the unregistered module
            // For simplicity, we're just cleaning up all pending requests when any module is unregistered
            clearTimeout(request.timeoutId);
            this.pendingRequests.delete(correlationId);
        }
        // Notify other modules about unregistration
        setImmediate(() => {
            this.broadcastMessage({
                id: v4(),
                type: 'module_unregistered',
                source: 'MessageCenter',
                payload: { moduleId },
                timestamp: Date.now(),
            });
        });
    }
    /**
     * Send a one-way message
     * @param message - Message to send
     */
    sendMessage(message) {
        this.stats.totalMessages++;
        setImmediate(() => {
            this.processMessage(message).catch((error) => {
                console.error(`Error processing message ${message.id}:`, error);
                this.stats.messagesFailed++;
            });
        });
    }
    /**
     * Broadcast a message to all modules
     * @param message - Message to broadcast
     */
    broadcastMessage(message) {
        this.stats.totalMessages++;
        setImmediate(() => {
            // Send to all registered modules
            for (const [moduleId, moduleInstance] of this.modules.entries()) {
                if (moduleId !== message.source) {
                    // Don't send back to sender
                    this.deliverMessage(message, moduleInstance).catch((error) => {
                        console.error(`Error delivering broadcast message to ${moduleId}:`, error);
                        this.stats.messagesFailed++;
                    });
                }
            }
        });
    }
    /**
     * Send a request and wait for response
     * @param message - Request message
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to the response
     */
    sendRequest(message, timeout = 30000) {
        this.stats.totalRequests++;
        this.stats.activeRequests++;
        return new Promise((resolve, reject) => {
            if (!message.correlationId) {
                message.correlationId = v4();
            }
            // Set up timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(message.correlationId);
                this.stats.activeRequests--;
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            // Store pending request
            this.pendingRequests.set(message.correlationId, { resolve, reject, timeoutId });
            // Send the message
            this.sendMessage(message);
        });
    }
    /**
     * Send a request with callback (non-blocking)
     * @param message - Request message
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     */
    sendRequestAsync(message, callback, timeout = 30000) {
        this.stats.totalRequests++;
        this.stats.activeRequests++;
        if (!message.correlationId) {
            message.correlationId = v4();
        }
        // Set up timeout
        const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(message.correlationId);
            this.stats.activeRequests--;
            callback({
                messageId: message.id,
                correlationId: message.correlationId || '',
                success: false,
                error: `Request timeout after ${timeout}ms`,
                timestamp: Date.now(),
            });
        }, timeout);
        // Store pending request
        this.pendingRequests.set(message.correlationId, {
            resolve: (response) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(message.correlationId);
                this.stats.activeRequests--;
                callback(response);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(message.correlationId);
                this.stats.activeRequests--;
                callback({
                    messageId: message.id,
                    correlationId: message.correlationId || '',
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: Date.now(),
                });
            },
            timeoutId,
        });
        // Send the message
        this.sendMessage(message);
    }
    /**
     * Process an incoming message
     * @param message - Message to process
     */
    async processMessage(message) {
        try {
            // Check for TTL expiration
            if (message.ttl && Date.now() - message.timestamp > message.ttl) {
                throw new Error('Message TTL expired');
            }
            if (message.target) {
                // Targeted message
                const targetModule = this.modules.get(message.target);
                if (!targetModule) {
                    throw new Error(`Target module ${message.target} not found`);
                }
                await this.deliverMessage(message, targetModule);
            }
            else {
                // Broadcast message
                this.broadcastMessage(message);
            }
        }
        catch (error) {
            this.stats.messagesFailed++;
            // If this was a request, send error response
            if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
                const request = this.pendingRequests.get(message.correlationId);
                clearTimeout(request.timeoutId);
                request.reject(error);
                this.pendingRequests.delete(message.correlationId);
                this.stats.activeRequests--;
            }
            else {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
    }
    /**
     * Deliver a message to a specific module
     * @param message - Message to deliver
     * @param moduleInstance - Target module instance
     */
    async deliverMessage(message, moduleInstance) {
        const startTime = Date.now();
        if (typeof moduleInstance.handleMessage === 'function') {
            const response = await moduleInstance.handleMessage(message);
            this.stats.messagesDelivered++;
            // If this was a request with a correlation ID, send response back
            if (message.correlationId && response && this.pendingRequests.has(message.correlationId)) {
                const request = this.pendingRequests.get(message.correlationId);
                const responseTime = Date.now() - startTime;
                this.responseTimes.push(responseTime);
                if (this.responseTimes.length > 1000) {
                    this.responseTimes = this.responseTimes.slice(-100); // Keep only last 100
                }
                clearTimeout(request.timeoutId);
                request.resolve(response);
                this.pendingRequests.delete(message.correlationId);
                this.stats.activeRequests--;
            }
        }
    }
    /**
     * Get message center statistics
     * @returns Statistics object
     */
    getStats() {
        const avgResponseTime = this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;
        return {
            ...this.stats,
            averageResponseTime: Math.round(avgResponseTime),
            uptime: Date.now() - this.startTime,
        };
    }
    /**
     * Reset message center statistics
     */
    resetStats() {
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: this.modules.size,
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: Date.now(),
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
}

/**
 * Debug Event Bus - 事件驱动的调试通信总线
 * Event-driven debug communication bus
 *
 * Note: This is now a compatibility layer that re-exports from rcc-debugcenter
 * For new development, import DebugEventBus directly from 'rcc-debugcenter'
 */
class DebugEventBus {
    constructor() {
        this.subscribers = new Map();
        this.eventQueue = [];
        this.maxQueueSize = 10000;
    }
    static getInstance() {
        if (!DebugEventBus.instance) {
            DebugEventBus.instance = new DebugEventBus();
        }
        return DebugEventBus.instance;
    }
    /**
     * Publish a debug event
     * @param event - Debug event to publish
     */
    publish(event) {
        // Add to queue for debugging
        if (this.eventQueue.length >= this.maxQueueSize) {
            this.eventQueue.shift(); // Remove oldest event
        }
        this.eventQueue.push(event);
        // Notify subscribers
        const subscribers = this.subscribers.get(event.type) || [];
        const allSubscribers = this.subscribers.get('*') || [];
        // Notify type-specific subscribers
        subscribers.forEach(callback => {
            try {
                callback(event);
            }
            catch (error) {
                console.error('Error in debug event subscriber:', error);
            }
        });
        // Notify wildcard subscribers
        allSubscribers.forEach(callback => {
            try {
                callback(event);
            }
            catch (error) {
                console.error('Error in debug event subscriber:', error);
            }
        });
    }
    /**
     * Subscribe to debug events
     * @param eventType - Event type to subscribe to ('*' for all events)
     * @param callback - Callback function
     */
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType).push(callback);
    }
    /**
     * Unsubscribe from debug events
     * @param eventType - Event type to unsubscribe from
     * @param callback - Callback function to remove
     */
    unsubscribe(eventType, callback) {
        const subscribers = this.subscribers.get(eventType);
        if (subscribers) {
            const index = subscribers.indexOf(callback);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }
    /**
     * Get recent events from the queue
     * @param limit - Maximum number of events to return
     * @param type - Optional event type filter
     */
    getRecentEvents(limit = 100, type) {
        let events = [...this.eventQueue];
        if (type) {
            events = events.filter(event => event.type === type);
        }
        return events.slice(-limit);
    }
    /**
     * Clear the event queue and subscribers
     */
    clear() {
        this.eventQueue = [];
        this.subscribers.clear();
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueSize: this.eventQueue.length,
            subscriberCount: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
            eventTypes: Array.from(this.subscribers.keys()),
            maxQueueSize: this.maxQueueSize
        };
    }
    /**
     * Set maximum queue size
     * @param size - Maximum queue size
     */
    setMaxQueueSize(size) {
        this.maxQueueSize = Math.max(100, size);
        // Trim queue if necessary
        if (this.eventQueue.length > this.maxQueueSize) {
            this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
        }
    }
}

/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, validation, debug, and messaging
 */
class BaseModule {
    /**
     * Creates an instance of BaseModule
     * @param info - Module information
     */
    constructor(info) {
        /**
         * Input connections
         */
        this.inputConnections = new Map();
        /**
         * Output connections
         */
        this.outputConnections = new Map();
        /**
         * Validation rules for input data
         */
        this.validationRules = [];
        /**
         * Whether the module is initialized
         */
        this.initialized = false;
        /**
         * Configuration data for the module
         */
        this.config = {};
        /**
         * Whether the module is configured
         */
        this.configured = false;
        /**
         * Debug log entries
         */
        this.debugLogs = [];
        /**
         * Pending message requests
         */
        this.pendingRequests = new Map();
        this.info = info;
        this.messageCenter = MessageCenter.getInstance();
        // Initialize debug configuration with defaults
        this.debugConfig = {
            enabled: true,
            level: 'debug',
            recordStack: true,
            maxLogEntries: 1000,
            consoleOutput: true,
            trackDataFlow: true,
            enableFileLogging: false,
            maxFileSize: 10485760, // 10MB
            maxLogFiles: 5
        };
        // Initialize debug event bus
        this.eventBus = DebugEventBus.getInstance();
    }
    /**
     * Static factory method to create an instance of the module
     * This ensures static compilation with dynamic instantiation
     * @param info - Module information
     * @returns Instance of the module
     */
    static createInstance(info) {
        return new this(info);
    }
    /**
     * Sets the debug configuration
     * @param config - Debug configuration
     */
    setDebugConfig(config) {
        this.debugConfig = { ...this.debugConfig, ...config };
    }
    /**
     * Sets the pipeline position for this module
     * @param position - Pipeline position
     */
    setPipelinePosition(position) {
        this.pipelinePosition = position;
        this.debugConfig.pipelinePosition = position;
    }
    /**
     * Sets the current session ID for pipeline operations
     * @param sessionId - Session ID
     */
    setCurrentSession(sessionId) {
        this.currentSessionId = sessionId;
    }
    /**
     * Gets the current debug configuration
     * @returns Debug configuration
     */
    getDebugConfig() {
        return { ...this.debugConfig };
    }
    /**
     * Start a pipeline session
     * @param sessionId - Session ID
     * @param pipelineConfig - Pipeline configuration
     */
    startPipelineSession(sessionId, pipelineConfig) {
        this.currentSessionId = sessionId;
        const event = {
            sessionId,
            moduleId: this.info.id,
            operationId: 'session_start',
            timestamp: Date.now(),
            type: 'start',
            position: this.pipelinePosition || 'middle',
            data: {
                pipelineConfig,
                moduleInfo: {
                    id: this.info.id,
                    name: this.info.name,
                    version: this.info.version
                }
            }
        };
        this.eventBus.publish(event);
        // Log locally for backward compatibility
        this.logInfo('Pipeline session started', {
            sessionId,
            pipelinePosition: this.pipelinePosition
        }, 'startPipelineSession');
    }
    /**
     * End a pipeline session
     * @param sessionId - Session ID
     * @param success - Whether session was successful
     */
    endPipelineSession(sessionId, success = true) {
        const event = {
            sessionId,
            moduleId: this.info.id,
            operationId: 'session_end',
            timestamp: Date.now(),
            type: success ? 'end' : 'error',
            position: this.pipelinePosition || 'middle',
            data: {
                success,
                moduleInfo: {
                    id: this.info.id,
                    name: this.info.name,
                    version: this.info.version
                }
            }
        };
        this.eventBus.publish(event);
        this.currentSessionId = undefined;
        // Log locally for backward compatibility
        this.logInfo('Pipeline session ended', {
            sessionId,
            success,
            pipelinePosition: this.pipelinePosition
        }, 'endPipelineSession');
    }
    /**
     * Logs a debug message
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    debug(level, message, data, method) {
        // Check if debug is enabled and level is appropriate
        if (!this.debugConfig.enabled)
            return;
        const levelOrder = ['trace', 'debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levelOrder.indexOf(this.debugConfig.level);
        const messageLevelIndex = levelOrder.indexOf(level);
        if (messageLevelIndex < currentLevelIndex)
            return;
        // Create log entry
        const logEntry = {
            timestamp: Date.now(),
            level,
            message,
            moduleId: this.info.id,
            method
        };
        // Add data if provided
        if (data !== undefined) {
            logEntry.data = data;
        }
        // Record stack trace if enabled
        if (this.debugConfig.recordStack && level === 'error') {
            try {
                throw new Error('Stack trace');
            }
            catch (e) {
                if (e instanceof Error) {
                    logEntry.stack = e.stack || undefined;
                }
            }
        }
        // Add to logs
        this.debugLogs.push(logEntry);
        // Trim logs if necessary
        if (this.debugLogs.length > this.debugConfig.maxLogEntries) {
            this.debugLogs = this.debugLogs.slice(-this.debugConfig.maxLogEntries);
        }
        // Output to console if enabled
        if (this.debugConfig.consoleOutput) {
            const timestamp = new Date(logEntry.timestamp).toISOString();
            const prefix = `[${timestamp}] [${this.info.id}] [${level.toUpperCase()}]${method ? ` [${method}]` : ''}`;
            switch (level) {
                case 'trace':
                case 'debug':
                case 'info':
                    console.log(`${prefix} ${message}`, data || '');
                    break;
                case 'warn':
                    console.warn(`${prefix} ${message}`, data || '');
                    break;
                case 'error':
                    console.error(`${prefix} ${message}`, data || '');
                    break;
            }
        }
    }
    /**
     * Logs a trace message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    trace(message, data, method) {
        this.debug('trace', message, data, method);
    }
    /**
     * Logs a debug message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    log(message, data, method) {
        this.debug('debug', message, data, method);
    }
    /**
     * Logs an info message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    logInfo(message, data, method) {
        this.debug('info', message, data, method);
    }
    /**
     * Logs a warning message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    warn(message, data, method) {
        this.debug('warn', message, data, method);
    }
    /**
     * Logs an error message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    error(message, data, method) {
        this.debug('error', message, data, method);
    }
    /**
     * Gets debug logs
     * @param level - Optional filter by log level
     * @param limit - Optional limit on number of entries returned
     * @returns Array of debug log entries
     */
    getDebugLogs(level, limit) {
        let logs = [...this.debugLogs];
        // Filter by level if specified
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        // Limit results if specified
        if (limit && limit > 0) {
            logs = logs.slice(-limit);
        }
        return logs;
    }
    /**
     * Clears debug logs
     */
    clearDebugLogs() {
        this.debugLogs = [];
    }
    /**
     * Configures the module with initialization data
     * This method should be called before initialize()
     * @param config - Configuration data for the module
     */
    configure(config) {
        if (this.initialized) {
            throw new Error('Cannot configure module after initialization');
        }
        this.config = { ...config };
        this.configured = true;
        // Log configuration
        this.debug('debug', 'Module configured', config, 'configure');
    }
    /**
     * Gets the module information
     * @returns Module information
     */
    getInfo() {
        return { ...this.info };
    }
    /**
     * Gets the module configuration
     * @returns Module configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Initializes the module
     * This method should be overridden by subclasses
     */
    async initialize() {
        if (!this.configured) {
            console.warn(`Module ${this.info.id} is being initialized without configuration`);
        }
        // Register with message center
        this.messageCenter.registerModule(this.info.id, this);
        // Base initialization logic
        this.initialized = true;
        // Log initialization
        this.logInfo('Module initialized', { configured: this.configured }, 'initialize');
    }
    /**
     * Adds an input connection
     * @param connection - Connection information
     */
    addInputConnection(connection) {
        if (connection.type !== 'input') {
            throw new Error('Invalid connection type for input');
        }
        this.inputConnections.set(connection.id, connection);
    }
    /**
     * Adds an output connection
     * @param connection - Connection information
     */
    addOutputConnection(connection) {
        if (connection.type !== 'output') {
            throw new Error('Invalid connection type for output');
        }
        this.outputConnections.set(connection.id, connection);
    }
    /**
     * Removes an input connection
     * @param connectionId - Connection ID
     */
    removeInputConnection(connectionId) {
        this.inputConnections.delete(connectionId);
    }
    /**
     * Removes an output connection
     * @param connectionId - Connection ID
     */
    removeOutputConnection(connectionId) {
        this.outputConnections.delete(connectionId);
    }
    /**
     * Gets all input connections
     * @returns Array of input connections
     */
    getInputConnections() {
        return Array.from(this.inputConnections.values());
    }
    /**
     * Gets all output connections
     * @returns Array of output connections
     */
    getOutputConnections() {
        return Array.from(this.outputConnections.values());
    }
    /**
     * Validates input data against validation rules
     * @param data - Data to validate
     * @returns Validation result
     */
    validateInput(data) {
        const errors = [];
        for (const rule of this.validationRules) {
            const value = data[rule.field];
            switch (rule.type) {
                case 'required':
                    if (value === undefined || value === null) {
                        errors.push(rule.message);
                    }
                    break;
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(rule.message);
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number') {
                        errors.push(rule.message);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(rule.message);
                    }
                    break;
                case 'object':
                    if (typeof value !== 'object' || value === null) {
                        errors.push(rule.message);
                    }
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(rule.message);
                    }
                    break;
                case 'custom':
                    if (rule.validator && !rule.validator(value)) {
                        errors.push(rule.message);
                    }
                    break;
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            data
        };
    }
    /**
     * Performs handshake with another module
     * @param targetModule - Target module to handshake with
     * @returns Whether handshake was successful
     */
    async handshake(targetModule) {
        // Base handshake implementation
        // This should be overridden by subclasses for specific handshake logic
        const result = true;
        // Log handshake
        this.debug('debug', 'Handshake performed', { targetModule: targetModule.getInfo().id }, 'handshake');
        return result;
    }
    /**
     * Transfers data to connected modules
     * @param data - Data to transfer
     * @param targetConnectionId - Optional target connection ID
     */
    async transferData(data, targetConnectionId) {
        // Get target connections
        let targetConnections;
        if (targetConnectionId) {
            // If a specific connection ID is provided, use it
            const connection = this.outputConnections.get(targetConnectionId);
            if (!connection) {
                throw new Error(`Output connection with ID '${targetConnectionId}' not found`);
            }
            targetConnections = [connection];
        }
        else {
            // Otherwise, use all output connections
            targetConnections = Array.from(this.outputConnections.values());
        }
        // Create data transfer objects for each target connection
        const transfers = targetConnections.map(connection => ({
            id: `${this.info.id}-${connection.id}-${Date.now()}`,
            sourceConnectionId: connection.id,
            targetConnectionId: connection.targetModuleId,
            data,
            timestamp: Date.now(),
            metadata: connection.metadata
        }));
        // Send data to each target module
        for (const transfer of transfers) {
            // In a real implementation, you would send the data to the target module
            // For now, we'll just log the transfer
            console.log(`Transferring data from module ${this.info.id} to connection ${transfer.targetConnectionId}:`, data);
            // Log data transfer if tracking is enabled
            if (this.debugConfig.trackDataFlow) {
                this.debug('debug', 'Data transferred', transfer, 'transferData');
            }
        }
    }
    /**
     * Receives data from connected modules
     * This method should be overridden by subclasses
     * @param dataTransfer - Data transfer information
     */
    async receiveData(dataTransfer) {
        // Base receive data implementation
        // This should be overridden by subclasses for specific receive logic
        console.log(`Module ${this.info.id} received data:`, dataTransfer.data);
        // Log data reception if tracking is enabled
        if (this.debugConfig.trackDataFlow) {
            this.debug('debug', 'Data received', dataTransfer, 'receiveData');
        }
    }
    /**
     * Cleans up resources and connections
     */
    async destroy() {
        // Log destruction before clearing logs
        this.logInfo('Module destroyed', {}, 'destroy');
        // Clean up connections
        this.inputConnections.clear();
        this.outputConnections.clear();
        this.initialized = false;
        this.configured = false;
        this.config = {};
        // Unregister from message center
        this.messageCenter.unregisterModule(this.info.id);
        // Clear debug logs
        this.clearDebugLogs();
        // Clear pending requests
        this.pendingRequests.clear();
    }
    /**
     * Send a one-way message (fire and forget)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID (optional for broadcasts)
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    sendMessage(type, payload, target, metadata, ttl, priority) {
        const message = {
            id: v4(),
            type,
            source: this.info.id,
            target,
            payload,
            timestamp: Date.now(),
            metadata,
            ttl,
            priority
        };
        try {
            if (target) {
                this.messageCenter.sendMessage(message);
                this.debug('debug', 'Message sent', { type, target }, 'sendMessage');
            }
            else {
                this.messageCenter.broadcastMessage(message);
                this.debug('debug', 'Message broadcast', { type }, 'sendMessage');
            }
        }
        catch (error) {
            this.debug('error', 'Failed to send message', { error: error.message }, 'sendMessage');
            throw error;
        }
    }
    /**
     * Send a message and wait for response (blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     * @returns Promise that resolves to the response
     */
    async sendRequest(type, payload, target, timeout = 30000, metadata, ttl, priority) {
        const message = {
            id: v4(),
            type,
            source: this.info.id,
            target,
            payload,
            timestamp: Date.now(),
            correlationId: v4(),
            metadata,
            ttl,
            priority
        };
        try {
            this.debug('debug', 'Sending request', { type, target }, 'sendRequest');
            const response = await this.messageCenter.sendRequest(message, timeout);
            this.debug('debug', 'Received response', { type, target, success: response.success }, 'sendRequest');
            return response;
        }
        catch (error) {
            this.debug('error', 'Request failed', { type, target, error: error.message }, 'sendRequest');
            throw error;
        }
    }
    /**
     * Send a message with callback for response (non-blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    sendRequestAsync(type, payload, target, callback, timeout = 30000, metadata, ttl, priority) {
        const message = {
            id: v4(),
            type,
            source: this.info.id,
            target,
            payload,
            timestamp: Date.now(),
            correlationId: v4(),
            metadata,
            ttl,
            priority
        };
        try {
            this.debug('debug', 'Sending async request', { type, target }, 'sendRequestAsync');
            this.messageCenter.sendRequestAsync(message, (response) => {
                this.debug('debug', 'Received async response', { type, target, success: response.success }, 'sendRequestAsync');
                callback(response);
            }, timeout);
        }
        catch (error) {
            this.debug('error', 'Async request failed', { type, target, error: error.message }, 'sendRequestAsync');
            throw error;
        }
    }
    /**
     * Broadcast a message to all modules
     * @param type - Message type
     * @param payload - Message payload
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    broadcastMessage(type, payload, metadata, ttl, priority) {
        this.sendMessage(type, payload, undefined, metadata, ttl, priority);
    }
    /**
     * Handle incoming messages
     * This method should be overridden by subclasses
     * @param message - The incoming message
     * @returns Promise that resolves to a response or void
     */
    async handleMessage(message) {
        this.debug('debug', 'Handling message', { type: message.type, source: message.source }, 'handleMessage');
        // Base message handling implementation
        // This should be overridden by subclasses for specific message handling logic
        switch (message.type) {
            case 'ping':
                return {
                    messageId: message.id,
                    correlationId: message.correlationId || '',
                    success: true,
                    data: { pong: true, moduleId: this.info.id },
                    timestamp: Date.now()
                };
            default:
                this.debug('warn', 'Unhandled message type', { type: message.type }, 'handleMessage');
                return {
                    messageId: message.id,
                    correlationId: message.correlationId || '',
                    success: false,
                    error: `Unhandled message type: ${message.type}`,
                    timestamp: Date.now()
                };
        }
    }
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was registered
     */
    onModuleRegistered(moduleId) {
        this.logInfo('Module registered', { moduleId }, 'onModuleRegistered');
    }
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was unregistered
     */
    onModuleUnregistered(moduleId) {
        this.logInfo('Module unregistered', { moduleId }, 'onModuleUnregistered');
    }
    // ========================================
    // I/O Tracking Methods
    // ========================================
    /**
     * Record an I/O operation start
     * @param operationId - Unique identifier for the operation
     * @param input - Input data
     * @param method - Method name that performed the operation
     */
    startIOTracking(operationId, input, method) {
        if (!this.currentSessionId || !this.debugConfig.enabled)
            return;
        const event = {
            sessionId: this.currentSessionId,
            moduleId: this.info.id,
            operationId,
            timestamp: Date.now(),
            type: 'start',
            position: this.pipelinePosition || 'middle',
            data: {
                input,
                method,
                pipelinePosition: this.pipelinePosition,
                moduleInfo: {
                    id: this.info.id,
                    name: this.info.name,
                    version: this.info.version
                }
            }
        };
        this.eventBus.publish(event);
        // Log locally for backward compatibility
        this.debug('debug', `I/O tracking started: ${operationId}`, {
            sessionId: this.currentSessionId,
            input: this.debugConfig.trackDataFlow ? input : '[INPUT_DATA]',
            method
        }, 'startIOTracking');
    }
    /**
     * Record an I/O operation end
     * @param operationId - Unique identifier for the operation
     * @param output - Output data
     * @param success - Whether the operation was successful
     * @param error - Error message if operation failed
     */
    endIOTracking(operationId, output, success = true, error) {
        if (!this.currentSessionId || !this.debugConfig.enabled)
            return;
        const event = {
            sessionId: this.currentSessionId,
            moduleId: this.info.id,
            operationId,
            timestamp: Date.now(),
            type: success ? 'end' : 'error',
            position: this.pipelinePosition || 'middle',
            data: {
                output,
                success,
                error,
                pipelinePosition: this.pipelinePosition,
                moduleInfo: {
                    id: this.info.id,
                    name: this.info.name,
                    version: this.info.version
                }
            }
        };
        this.eventBus.publish(event);
        // Log locally for backward compatibility
        this.debug('debug', `I/O tracking ended: ${operationId}`, {
            sessionId: this.currentSessionId,
            output: this.debugConfig.trackDataFlow ? output : '[OUTPUT_DATA]',
            success,
            error
        }, 'endIOTracking');
    }
}

export { ActionPriority, ActionStatus, ActionType, AnnotationType, BaseModule, ConditionOperator, ConfigValidator, ConfigValidator as ConfigurationValidation, CycleRecorder, CycleRecorder as CycleRecording, DebugEventBus, DebugLevel, ErrorImpact, ErrorRecorder, ErrorRecorder as ErrorRecording, ErrorRecoverability, ErrorSeverity, ErrorSource, ErrorType, FieldTruncator as FieldTruncation, FieldTruncator, GlobalConfigManager, GlobalConfigManager as GlobalConfiguration, HandlingStatus, LogicalOperator, MessageCenter, PathResolver as PathResolution, PathResolver, PolicyType, RecordingManager, RequestContextManager, RequestContextManager as RequestContextTracking, ResponseActionType, ResponseStatus, RuleType };
//# sourceMappingURL=index.esm.js.map
