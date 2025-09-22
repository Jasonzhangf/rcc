import { v4 } from 'uuid';
import { promises } from 'fs';
import { dirname, join } from 'path';

// Shared type definitions to avoid circular dependencies
// Enums
var ErrorSource$2;
(function (ErrorSource) {
    ErrorSource["MODULE"] = "module";
    ErrorSource["SYSTEM"] = "system";
    ErrorSource["EXTERNAL"] = "external";
    ErrorSource["NETWORK"] = "network";
    ErrorSource["UNKNOWN"] = "unknown";
})(ErrorSource$2 || (ErrorSource$2 = {}));
var ErrorType$2;
(function (ErrorType) {
    ErrorType["BUSINESS"] = "business";
    ErrorType["TECHNICAL"] = "technical";
    ErrorType["CONFIGURATION"] = "configuration";
    ErrorType["RESOURCE"] = "resource";
    ErrorType["DEPENDENCY"] = "dependency";
})(ErrorType$2 || (ErrorType$2 = {}));
var ErrorSeverity$2;
(function (ErrorSeverity) {
    ErrorSeverity["CRITICAL"] = "critical";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["LOW"] = "low";
})(ErrorSeverity$2 || (ErrorSeverity$2 = {}));
var ErrorImpact$2;
(function (ErrorImpact) {
    ErrorImpact["SINGLE_MODULE"] = "single_module";
    ErrorImpact["MULTIPLE_MODULE"] = "multiple_module";
    ErrorImpact["SYSTEM_WIDE"] = "system_wide";
})(ErrorImpact$2 || (ErrorImpact$2 = {}));
var ErrorRecoverability$2;
(function (ErrorRecoverability) {
    ErrorRecoverability["RECOVERABLE"] = "recoverable";
    ErrorRecoverability["NON_RECOVERABLE"] = "non_recoverable";
    ErrorRecoverability["AUTO_RECOVERABLE"] = "auto_recoverable";
})(ErrorRecoverability$2 || (ErrorRecoverability$2 = {}));
var ResponseStatus$2;
(function (ResponseStatus) {
    ResponseStatus["PENDING"] = "pending";
    ResponseStatus["IN_PROGRESS"] = "in_progress";
    ResponseStatus["SUCCESS"] = "success";
    ResponseStatus["FAILURE"] = "failure";
    ResponseStatus["RETRY"] = "retry";
    ResponseStatus["FALLENBACK"] = "fallback";
    ResponseStatus["CANCELLED"] = "cancelled";
})(ResponseStatus$2 || (ResponseStatus$2 = {}));
var ResponseActionType$2;
(function (ResponseActionType) {
    ResponseActionType["RETRY"] = "retry";
    ResponseActionType["FALLBACK"] = "fallback";
    ResponseActionType["LOG"] = "log";
    ResponseActionType["NOTIFY"] = "notify";
    ResponseActionType["ISOLATE"] = "isolate";
    ResponseActionType["RESTART"] = "restart";
    ResponseActionType["CUSTOM"] = "custom";
})(ResponseActionType$2 || (ResponseActionType$2 = {}));
// ResponsePriority removed - use ActionPriority instead
var PolicyType$2;
(function (PolicyType) {
    PolicyType["RETRY"] = "retry";
    PolicyType["FALLBACK"] = "fallback";
    PolicyType["ISOLATION"] = "isolation";
    PolicyType["NOTIFICATION"] = "notification";
    PolicyType["CUSTOM"] = "custom";
})(PolicyType$2 || (PolicyType$2 = {}));
var RuleType$2;
(function (RuleType) {
    RuleType["ROUTING"] = "routing";
    RuleType["FILTERING"] = "filtering";
    RuleType["TRANSFORMATION"] = "transformation";
    RuleType["CUSTOM"] = "custom";
})(RuleType$2 || (RuleType$2 = {}));
var ConditionOperator$2;
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
})(ConditionOperator$2 || (ConditionOperator$2 = {}));
var LogicalOperator$2;
(function (LogicalOperator) {
    LogicalOperator["AND"] = "and";
    LogicalOperator["OR"] = "or";
})(LogicalOperator$2 || (LogicalOperator$2 = {}));
var ActionType$2;
(function (ActionType) {
    ActionType["RETRY"] = "retry";
    ActionType["FALLBACK"] = "fallback";
    ActionType["LOG"] = "log";
    ActionType["NOTIFY"] = "notify";
    ActionType["ISOLATE"] = "isolate";
    ActionType["RESTART"] = "restart";
    ActionType["CUSTOM"] = "custom";
})(ActionType$2 || (ActionType$2 = {}));
var AnnotationType$2;
(function (AnnotationType) {
    AnnotationType["ERROR"] = "error";
    AnnotationType["WARNING"] = "warning";
    AnnotationType["INFO"] = "info";
    AnnotationType["DEBUG"] = "debug";
    AnnotationType["CUSTOM"] = "custom";
})(AnnotationType$2 || (AnnotationType$2 = {}));
var HandlingStatus$2;
(function (HandlingStatus) {
    HandlingStatus["SUCCESS"] = "success";
    HandlingStatus["FAILURE"] = "failure";
    HandlingStatus["PARTIAL"] = "partial";
    HandlingStatus["RETRY"] = "retry";
    HandlingStatus["FALLENBACK"] = "fallback";
})(HandlingStatus$2 || (HandlingStatus$2 = {}));
var ActionStatus$2;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "pending";
    ActionStatus["IN_PROGRESS"] = "in_progress";
    ActionStatus["COMPLETED"] = "completed";
    ActionStatus["FAILED"] = "failed";
    ActionStatus["CANCELLED"] = "cancelled";
})(ActionStatus$2 || (ActionStatus$2 = {}));
var ActionPriority$2;
(function (ActionPriority) {
    ActionPriority["CRITICAL"] = "critical";
    ActionPriority["HIGH"] = "high";
    ActionPriority["MEDIUM"] = "medium";
    ActionPriority["LOW"] = "low";
})(ActionPriority$2 || (ActionPriority$2 = {}));

// Shared type definitions to avoid circular dependencies
// Enums
var ErrorSource$1;
(function (ErrorSource) {
    ErrorSource["MODULE"] = "module";
    ErrorSource["SYSTEM"] = "system";
    ErrorSource["EXTERNAL"] = "external";
    ErrorSource["NETWORK"] = "network";
    ErrorSource["UNKNOWN"] = "unknown";
})(ErrorSource$1 || (ErrorSource$1 = {}));
var ErrorType$1;
(function (ErrorType) {
    ErrorType["BUSINESS"] = "business";
    ErrorType["TECHNICAL"] = "technical";
    ErrorType["CONFIGURATION"] = "configuration";
    ErrorType["RESOURCE"] = "resource";
    ErrorType["DEPENDENCY"] = "dependency";
})(ErrorType$1 || (ErrorType$1 = {}));
var ErrorSeverity$1;
(function (ErrorSeverity) {
    ErrorSeverity["CRITICAL"] = "critical";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["LOW"] = "low";
})(ErrorSeverity$1 || (ErrorSeverity$1 = {}));
var ErrorImpact$1;
(function (ErrorImpact) {
    ErrorImpact["SINGLE_MODULE"] = "single_module";
    ErrorImpact["MULTIPLE_MODULE"] = "multiple_module";
    ErrorImpact["SYSTEM_WIDE"] = "system_wide";
})(ErrorImpact$1 || (ErrorImpact$1 = {}));
var ErrorRecoverability$1;
(function (ErrorRecoverability) {
    ErrorRecoverability["RECOVERABLE"] = "recoverable";
    ErrorRecoverability["NON_RECOVERABLE"] = "non_recoverable";
    ErrorRecoverability["AUTO_RECOVERABLE"] = "auto_recoverable";
})(ErrorRecoverability$1 || (ErrorRecoverability$1 = {}));
var ResponseStatus$1;
(function (ResponseStatus) {
    ResponseStatus["PENDING"] = "pending";
    ResponseStatus["IN_PROGRESS"] = "in_progress";
    ResponseStatus["SUCCESS"] = "success";
    ResponseStatus["FAILURE"] = "failure";
    ResponseStatus["RETRY"] = "retry";
    ResponseStatus["FALLENBACK"] = "fallback";
    ResponseStatus["CANCELLED"] = "cancelled";
})(ResponseStatus$1 || (ResponseStatus$1 = {}));
var ResponseActionType$1;
(function (ResponseActionType) {
    ResponseActionType["RETRY"] = "retry";
    ResponseActionType["FALLBACK"] = "fallback";
    ResponseActionType["LOG"] = "log";
    ResponseActionType["NOTIFY"] = "notify";
    ResponseActionType["ISOLATE"] = "isolate";
    ResponseActionType["RESTART"] = "restart";
    ResponseActionType["CUSTOM"] = "custom";
})(ResponseActionType$1 || (ResponseActionType$1 = {}));
// ResponsePriority removed - use ActionPriority instead
var PolicyType$1;
(function (PolicyType) {
    PolicyType["RETRY"] = "retry";
    PolicyType["FALLBACK"] = "fallback";
    PolicyType["ISOLATION"] = "isolation";
    PolicyType["NOTIFICATION"] = "notification";
    PolicyType["CUSTOM"] = "custom";
})(PolicyType$1 || (PolicyType$1 = {}));
var RuleType$1;
(function (RuleType) {
    RuleType["ROUTING"] = "routing";
    RuleType["FILTERING"] = "filtering";
    RuleType["TRANSFORMATION"] = "transformation";
    RuleType["CUSTOM"] = "custom";
})(RuleType$1 || (RuleType$1 = {}));
var ConditionOperator$1;
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
})(ConditionOperator$1 || (ConditionOperator$1 = {}));
var LogicalOperator$1;
(function (LogicalOperator) {
    LogicalOperator["AND"] = "and";
    LogicalOperator["OR"] = "or";
})(LogicalOperator$1 || (LogicalOperator$1 = {}));
var ActionType$1;
(function (ActionType) {
    ActionType["RETRY"] = "retry";
    ActionType["FALLBACK"] = "fallback";
    ActionType["LOG"] = "log";
    ActionType["NOTIFY"] = "notify";
    ActionType["ISOLATE"] = "isolate";
    ActionType["RESTART"] = "restart";
    ActionType["CUSTOM"] = "custom";
})(ActionType$1 || (ActionType$1 = {}));
var AnnotationType$1;
(function (AnnotationType) {
    AnnotationType["ERROR"] = "error";
    AnnotationType["WARNING"] = "warning";
    AnnotationType["INFO"] = "info";
    AnnotationType["DEBUG"] = "debug";
    AnnotationType["CUSTOM"] = "custom";
})(AnnotationType$1 || (AnnotationType$1 = {}));
var HandlingStatus$1;
(function (HandlingStatus) {
    HandlingStatus["SUCCESS"] = "success";
    HandlingStatus["FAILURE"] = "failure";
    HandlingStatus["PARTIAL"] = "partial";
    HandlingStatus["RETRY"] = "retry";
    HandlingStatus["FALLENBACK"] = "fallback";
})(HandlingStatus$1 || (HandlingStatus$1 = {}));
var ActionStatus$1;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "pending";
    ActionStatus["IN_PROGRESS"] = "in_progress";
    ActionStatus["COMPLETED"] = "completed";
    ActionStatus["FAILED"] = "failed";
    ActionStatus["CANCELLED"] = "cancelled";
})(ActionStatus$1 || (ActionStatus$1 = {}));
var ActionPriority$1;
(function (ActionPriority) {
    ActionPriority["CRITICAL"] = "critical";
    ActionPriority["HIGH"] = "high";
    ActionPriority["MEDIUM"] = "medium";
    ActionPriority["LOW"] = "low";
})(ActionPriority$1 || (ActionPriority$1 = {}));

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
 * Message center for module communication
 */
let MessageCenter$1 = class MessageCenter {
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
};

/**
 * Debug Event Bus - 事件驱动的调试通信总线
 * Event-driven debug communication bus
 *
 * Note: This is now a compatibility layer that re-exports from rcc-debugcenter
 * For new development, import DebugEventBus directly from 'rcc-debugcenter'
 */
let DebugEventBus$1 = class DebugEventBus {
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
};

/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, validation, debug, and messaging
 */
let BaseModule$1 = class BaseModule {
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
        this.messageCenter = MessageCenter$1.getInstance();
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
        this.eventBus = DebugEventBus$1.getInstance();
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
};

let UnderConstructionError$1 = class UnderConstructionError extends Error {
    constructor(featureName, message) {
        super(message);
        this.name = 'UnderConstructionError';
        this.featureName = featureName;
    }
};
let UnderConstruction$1 = class UnderConstruction extends BaseModule$1 {
    constructor() {
        const moduleInfo = {
            id: v4(),
            type: 'underconstruction',
            name: 'UnderConstruction',
            version: '1.0.0',
            description: 'UnderConstruction class for marking unfinished functionality',
            metadata: {
                config: {
                    enableTracking: true,
                    maxHistorySize: 1000,
                    throwOnCall: false,
                    logToConsole: true
                }
            }
        };
        super(moduleInfo);
        this.underConstructionFeatures = new Map();
        this.callHistory = [];
    }
    async initialize() {
        await super.initialize();
        console.log('UnderConstruction模块已初始化');
    }
    markFeature(featureName, description, options = {}) {
        const feature = {
            name: featureName,
            description,
            intendedBehavior: options.intendedBehavior || '',
            priority: options.priority || 'medium',
            category: options.category || 'general',
            estimatedCompletion: options.estimatedCompletion,
            createdAt: Date.now(),
            createdBy: options.createdBy || 'unknown',
            status: 'pending'
        };
        this.underConstructionFeatures.set(featureName, feature);
        console.log(`功能 '${featureName}' 已标记为未完成状态`);
    }
    callUnderConstructionFeature(featureName, context) {
        const config = this.getInfo().metadata?.['config'];
        if (!this.underConstructionFeatures.has(featureName)) {
            this.markFeature(featureName, 'Auto-marked feature');
        }
        const call = {
            id: v4(),
            featureName,
            timestamp: Date.now(),
            context: context || {}
        };
        this.callHistory.push(call);
        if (this.callHistory.length > (config?.maxHistorySize || 1000)) {
            this.callHistory = this.callHistory.slice(-config?.maxHistorySize || 1000);
        }
        if (config?.throwOnCall) {
            throw new UnderConstructionError$1(featureName, `功能 '${featureName}' 尚未完成`);
        }
        console.log(`调用了未完成的功能: ${featureName}`);
    }
    getUnderConstructionFeatures() {
        return Array.from(this.underConstructionFeatures.values());
    }
    getFeature(featureName) {
        return this.underConstructionFeatures.get(featureName);
    }
    getCallHistory(limit) {
        const history = this.callHistory.slice().reverse();
        return limit ? history.slice(0, limit) : history;
    }
    completeFeature(featureName, completionNotes) {
        const feature = this.underConstructionFeatures.get(featureName);
        if (!feature) {
            return false;
        }
        feature.status = 'completed';
        console.log(`功能 '${featureName}' 已完成`);
        return true;
    }
    updateFeatureDescription(featureName, newDescription, newIntendedBehavior) {
        const feature = this.underConstructionFeatures.get(featureName);
        if (!feature) {
            return false;
        }
        feature.description = newDescription;
        if (newIntendedBehavior) {
            feature.intendedBehavior = newIntendedBehavior;
        }
        console.log(`功能 '${featureName}' 描述已更新`);
        return true;
    }
    getStatistics() {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const recentCalls = this.callHistory.filter(call => call.timestamp > dayAgo);
        const byCategory = {};
        const byPriority = {};
        this.underConstructionFeatures.forEach(feature => {
            byCategory[feature.category] = (byCategory[feature.category] || 0) + 1;
            byPriority[feature.priority] = (byPriority[feature.priority] || 0) + 1;
        });
        return {
            totalFeatures: this.underConstructionFeatures.size,
            totalCalls: this.callHistory.length,
            recentCalls24h: recentCalls.length,
            byCategory,
            byPriority
        };
    }
    clearCallHistory() {
        this.callHistory = [];
        console.log('调用历史已清除');
    }
    async destroy() {
        console.log('销毁UnderConstruction模块');
        this.underConstructionFeatures.clear();
        this.callHistory = [];
        await super.destroy();
    }
};

new UnderConstruction$1();

// Create UnderConstruction instance for unimplemented features
new UnderConstruction$1();

// Create UnderConstruction instance for unimplemented features
new UnderConstruction$1();

// Create UnderConstruction instance for unimplemented features
new UnderConstruction$1();

/**
 * Manages module registration and lifecycle
 */
let ModuleRegistry$1 = class ModuleRegistry {
    constructor() {
        this.modules = new Map();
    }
    /**
     * Register a module with the registry
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    register(moduleId, moduleInstance) {
        if (this.modules.has(moduleId)) {
            throw new Error(`Module ${moduleId} is already registered`);
        }
        this.modules.set(moduleId, moduleInstance);
        // Notify about new registration
        if (this.onModuleRegistered) {
            setImmediate(() => this.onModuleRegistered(moduleId));
        }
    }
    /**
     * Unregister a module from the registry
     * @param moduleId - Module ID
     */
    unregister(moduleId) {
        const wasRegistered = this.modules.delete(moduleId);
        if (wasRegistered && this.onModuleUnregistered) {
            setImmediate(() => this.onModuleUnregistered(moduleId));
        }
        return wasRegistered;
    }
    /**
     * Get a module by ID
     * @param moduleId - Module ID
     * @returns Module instance or undefined
     */
    get(moduleId) {
        return this.modules.get(moduleId);
    }
    /**
     * Check if a module is registered
     * @param moduleId - Module ID
     * @returns True if module is registered
     */
    has(moduleId) {
        return this.modules.has(moduleId);
    }
    /**
     * Get all registered modules
     * @returns Map of module IDs to instances
     */
    getAll() {
        return new Map(this.modules);
    }
    /**
     * Get the number of registered modules
     * @returns Number of registered modules
     */
    getCount() {
        return this.modules.size;
    }
    /**
     * Get all module IDs
     * @returns Array of module IDs
     */
    getModuleIds() {
        return Array.from(this.modules.keys());
    }
    /**
     * Set callback for module registration
     * @param callback - Callback function
     */
    onModuleRegister(callback) {
        this.onModuleRegistered = callback;
    }
    /**
     * Set callback for module unregistration
     * @param callback - Callback function
     */
    onModuleUnregister(callback) {
        this.onModuleUnregistered = callback;
    }
    /**
     * Clear all registered modules
     */
    clear() {
        this.modules.clear();
    }
    /**
     * Check if registry is empty
     * @returns True if no modules are registered
     */
    isEmpty() {
        return this.modules.size === 0;
    }
};

/**
 * Manages request/response lifecycle with timeout handling
 */
let RequestManager$1 = class RequestManager {
    constructor() {
        this.pendingRequests = new Map();
    }
    /**
     * Create a new pending request
     * @param correlationId - Request correlation ID
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to response or rejects on timeout
     */
    createRequest(correlationId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            this.pendingRequests.set(correlationId, {
                resolve,
                reject,
                timeoutId,
                startTime: Date.now(),
            });
        });
    }
    /**
     * Create a pending request with callback support
     * @param correlationId - Request correlation ID
     * @param callback - Callback function
     * @param timeout - Timeout in milliseconds
     */
    createRequestAsync(correlationId, callback, timeout = 30000) {
        const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(correlationId);
            callback({
                messageId: '',
                correlationId,
                success: false,
                error: `Request timeout after ${timeout}ms`,
                timestamp: Date.now(),
            });
        }, timeout);
        this.pendingRequests.set(correlationId, {
            resolve: (response) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(correlationId);
                callback(response);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(correlationId);
                callback({
                    messageId: '',
                    correlationId,
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: Date.now(),
                });
            },
            timeoutId,
            startTime: Date.now(),
        });
    }
    /**
     * Resolve a pending request
     * @param correlationId - Request correlation ID
     * @param response - Response to send
     * @returns True if request was found and resolved
     */
    resolveRequest(correlationId, response) {
        const request = this.pendingRequests.get(correlationId);
        if (!request) {
            return false;
        }
        clearTimeout(request.timeoutId);
        request.resolve(response);
        this.pendingRequests.delete(correlationId);
        return true;
    }
    /**
     * Reject a pending request
     * @param correlationId - Request correlation ID
     * @param error - Error to reject with
     * @returns True if request was found and rejected
     */
    rejectRequest(correlationId, error) {
        const request = this.pendingRequests.get(correlationId);
        if (!request) {
            return false;
        }
        clearTimeout(request.timeoutId);
        request.reject(error);
        this.pendingRequests.delete(correlationId);
        return true;
    }
    /**
     * Check if a request is pending
     * @param correlationId - Request correlation ID
     * @returns True if request is pending
     */
    hasPendingRequest(correlationId) {
        return this.pendingRequests.has(correlationId);
    }
    /**
     * Get the number of pending requests
     * @returns Number of pending requests
     */
    getPendingCount() {
        return this.pendingRequests.size;
    }
    /**
     * Get response time for a completed request
     * @param correlationId - Request correlation ID
     * @returns Response time in milliseconds or undefined if not found
     */
    getResponseTime(correlationId) {
        const request = this.pendingRequests.get(correlationId);
        return request ? Date.now() - request.startTime : undefined;
    }
    /**
     * Cancel all pending requests
     * @param error - Error to reject pending requests with
     */
    cancelAll(error = new Error('All requests cancelled')) {
        for (const [correlationId, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeoutId);
            request.reject(error);
        }
        this.pendingRequests.clear();
    }
    /**
     * Clean up expired requests older than specified time
     * @param maxAge - Maximum age in milliseconds
     * @returns Number of expired requests cleaned up
     */
    cleanupExpired(maxAge) {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [correlationId, request] of this.pendingRequests.entries()) {
            if (now - request.startTime > maxAge) {
                clearTimeout(request.timeoutId);
                request.reject(new Error(`Request expired after ${maxAge}ms`));
                this.pendingRequests.delete(correlationId);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * Get all pending request correlation IDs
     * @returns Array of correlation IDs
     */
    getPendingRequestIds() {
        return Array.from(this.pendingRequests.keys());
    }
    /**
     * Clear all pending requests without rejecting them
     */
    clear() {
        for (const [, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeoutId);
        }
        this.pendingRequests.clear();
    }
};

/**
 * Handles message processing, routing, and delivery
 */
let MessageProcessor$1 = class MessageProcessor {
    /**
     * Process an incoming message with TTL validation
     * @param message - Message to process
     * @param targetModule - Target module instance (for targeted messages)
     * @param broadcastHandler - Handler for broadcast messages
     * @returns Promise that resolves when message is processed
     */
    async processMessage(message, targetModule, broadcastHandler) {
        // Check for TTL expiration
        if (message.ttl && Date.now() - message.timestamp > message.ttl) {
            throw new Error('Message TTL expired');
        }
        if (message.target) {
            // Targeted message
            if (!targetModule) {
                throw new Error(`Target module ${message.target} not found`);
            }
            await this.deliverMessage(message, targetModule);
        }
        else {
            // Broadcast message
            await broadcastHandler(message);
        }
    }
    /**
     * Deliver a message to a specific module
     * @param message - Message to deliver
     * @param moduleInstance - Target module instance
     * @returns Promise that resolves to response or void
     */
    async deliverMessage(message, moduleInstance) {
        if (typeof moduleInstance.handleMessage !== 'function') {
            throw new Error(`Module does not implement handleMessage method`);
        }
        try {
            const response = await moduleInstance.handleMessage(message);
            return response;
        }
        catch (error) {
            throw new Error(`Failed to deliver message to module: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Broadcast a message to multiple modules
     * @param message - Message to broadcast
     * @param modules - Map of module IDs to instances
     * @param deliveryHandler - Handler for individual message delivery
     * @returns Promise that resolves when all modules have been processed
     */
    async broadcastMessage(message, modules, deliveryHandler) {
        const deliveryPromises = [];
        for (const [moduleId, moduleInstance] of modules.entries()) {
            if (moduleId !== message.source) {
                // Don't send back to sender
                const deliveryPromise = deliveryHandler(message, moduleId, moduleInstance);
                deliveryPromises.push(deliveryPromise);
            }
        }
        await Promise.allSettled(deliveryPromises);
    }
    /**
     * Validate message structure
     * @param message - Message to validate
     * @returns True if message is valid
     */
    validateMessage(message) {
        const requiredFields = ['id', 'type', 'source', 'payload', 'timestamp'];
        for (const field of requiredFields) {
            if (!(field in message)) {
                return false;
            }
        }
        // Validate data types
        if (typeof message.id !== 'string' || message.id.trim() === '') {
            return false;
        }
        if (typeof message.type !== 'string' || message.type.trim() === '') {
            return false;
        }
        if (typeof message.source !== 'string' || message.source.trim() === '') {
            return false;
        }
        if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
            return false;
        }
        // Validate optional fields
        if (message.target && (typeof message.target !== 'string' || message.target.trim() === '')) {
            return false;
        }
        if (message.correlationId && (typeof message.correlationId !== 'string' || message.correlationId.trim() === '')) {
            return false;
        }
        if (message.ttl && (typeof message.ttl !== 'number' || message.ttl <= 0)) {
            return false;
        }
        if (message.priority && (typeof message.priority !== 'number' || message.priority < 0 || message.priority > 9)) {
            return false;
        }
        return true;
    }
    /**
     * Sanitize message for delivery
     * @param message - Message to sanitize
     * @returns Sanitized message
     */
    sanitizeMessage(message) {
        const sanitized = {
            id: message.id || '',
            type: message.type || '',
            source: message.source || '',
            payload: message.payload,
            timestamp: message.timestamp || Date.now(),
        };
        // Add optional fields if they exist and are valid
        if (message.target && typeof message.target === 'string' && message.target.trim() !== '') {
            sanitized.target = message.target;
        }
        if (message.correlationId && typeof message.correlationId === 'string' && message.correlationId.trim() !== '') {
            sanitized.correlationId = message.correlationId;
        }
        if (message.metadata && typeof message.metadata === 'object' && message.metadata !== null) {
            sanitized.metadata = { ...message.metadata };
        }
        if (message.ttl && typeof message.ttl === 'number' && message.ttl > 0) {
            sanitized.ttl = message.ttl;
        }
        if (message.priority !== undefined && typeof message.priority === 'number' && message.priority >= 0 && message.priority <= 9) {
            sanitized.priority = message.priority;
        }
        return sanitized;
    }
    /**
     * Create a response message
     * @param originalMessage - Original message
     * @param success - Whether operation was successful
     * @param data - Response data
     * @param error - Error message
     * @returns Response message
     */
    createResponse(originalMessage, success, data, error) {
        return {
            messageId: originalMessage.id,
            correlationId: originalMessage.correlationId || '',
            success,
            data,
            error,
            timestamp: Date.now(),
        };
    }
    /**
     * Check if message requires a response
     * @param message - Message to check
     * @returns True if message requires a response
     */
    requiresResponse(message) {
        return !!message.correlationId;
    }
    /**
     * Get message priority level
     * @param message - Message to check
     * @returns Priority level (0-9, default 5)
     */
    getMessagePriority(message) {
        return message.priority !== undefined ? Math.max(0, Math.min(9, message.priority)) : 5;
    }
    /**
     * Check if message has expired
     * @param message - Message to check
     * @returns True if message has expired
     */
    isMessageExpired(message) {
        if (!message.ttl) {
            return false;
        }
        return Date.now() - message.timestamp > message.ttl;
    }
    /**
     * Get remaining TTL for message
     * @param message - Message to check
     * @returns Remaining TTL in milliseconds, or -1 if expired
     */
    getRemainingTTL(message) {
        if (!message.ttl) {
            return -1;
        }
        const elapsed = Date.now() - message.timestamp;
        return message.ttl - elapsed;
    }
};

/**
 * Tracks and manages message center statistics
 */
let StatisticsTracker$1 = class StatisticsTracker {
    constructor() {
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: 0,
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: 0,
        };
        this.responseTimes = [];
        this.startTime = Date.now();
        this.maxResponseTimes = 1000;
    }
    /**
     * Increment total messages count
     */
    incrementTotalMessages() {
        this.stats.totalMessages++;
    }
    /**
     * Increment total requests count
     */
    incrementTotalRequests() {
        this.stats.totalRequests++;
    }
    /**
     * Increment active requests count
     */
    incrementActiveRequests() {
        this.stats.activeRequests++;
    }
    /**
     * Decrement active requests count
     */
    decrementActiveRequests() {
        this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);
    }
    /**
     * Increment delivered messages count
     */
    incrementMessagesDelivered() {
        this.stats.messagesDelivered++;
    }
    /**
     * Increment failed messages count
     */
    incrementMessagesFailed() {
        this.stats.messagesFailed++;
    }
    /**
     * Set registered modules count
     * @param count - Number of registered modules
     */
    setRegisteredModules(count) {
        this.stats.registeredModules = count;
    }
    /**
     * Record a response time
     * @param responseTime - Response time in milliseconds
     */
    recordResponseTime(responseTime) {
        this.responseTimes.push(responseTime);
        // Keep only the most recent response times
        if (this.responseTimes.length > this.maxResponseTimes) {
            this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes / 10);
        }
        // Update average response time
        this.updateAverageResponseTime();
    }
    /**
     * Update the average response time based on recorded times
     */
    updateAverageResponseTime() {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
            this.stats.averageResponseTime = Math.round(sum / this.responseTimes.length);
        }
        else {
            this.stats.averageResponseTime = 0;
        }
    }
    /**
     * Get current statistics
     * @returns Current statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime,
        };
    }
    /**
     * Reset all statistics
     */
    reset() {
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: this.stats.registeredModules, // Keep current module count
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: 0,
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
    /**
     * Get response time statistics
     * @returns Response time statistics
     */
    getResponseTimeStats() {
        if (this.responseTimes.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                last: undefined,
            };
        }
        const count = this.responseTimes.length;
        const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
        const average = Math.round(sum / count);
        const min = Math.min(...this.responseTimes);
        const max = Math.max(...this.responseTimes);
        const last = this.responseTimes[this.responseTimes.length - 1];
        return {
            count,
            average,
            min,
            max,
            last,
        };
    }
    /**
     * Get success rate (percentage of successful deliveries)
     * @returns Success rate percentage (0-100)
     */
    getSuccessRate() {
        const total = this.stats.messagesDelivered + this.stats.messagesFailed;
        if (total === 0) {
            return 0;
        }
        return Math.round((this.stats.messagesDelivered / total) * 100);
    }
    /**
     * Get throughput (messages per second)
     * @returns Messages per second
     */
    getThroughput() {
        const uptime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        if (uptime <= 0) {
            return 0;
        }
        return Math.round(this.stats.totalMessages / uptime);
    }
    /**
     * Get detailed performance metrics
     * @returns Detailed performance metrics
     */
    getPerformanceMetrics() {
        const responseTimeStats = this.getResponseTimeStats();
        return {
            uptime: Date.now() - this.startTime,
            throughput: this.getThroughput(),
            successRate: this.getSuccessRate(),
            responseTime: {
                average: responseTimeStats.average,
                min: responseTimeStats.min,
                max: responseTimeStats.max,
                count: responseTimeStats.count,
            },
            load: {
                activeRequests: this.stats.activeRequests,
                registeredModules: this.stats.registeredModules,
            },
        };
    }
    /**
     * Get the number of recorded response times
     * @returns Number of recorded response times
     */
    getResponseTimeCount() {
        return this.responseTimes.length;
    }
    /**
     * Clear recorded response times
     */
    clearResponseTimes() {
        this.responseTimes = [];
        this.stats.averageResponseTime = 0;
    }
    /**
     * Set the maximum number of response times to keep
     * @param max - Maximum number of response times
     */
    setMaxResponseTimes(max) {
        this.maxResponseTimes = Math.max(1, max);
        // Trim existing response times if needed
        if (this.responseTimes.length > this.maxResponseTimes) {
            this.responseTimes = this.responseTimes.slice(-Math.floor(this.maxResponseTimes / 10));
        }
    }
    /**
     * Get uptime in human-readable format
     * @returns Human-readable uptime string
     */
    getUptimeString() {
        const uptime = Date.now() - this.startTime;
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
};

/**
 * Refactored Message center for module communication
 * Uses composition pattern to separate concerns
 */
let MessageCenter$2 = class MessageCenter {
    /**
     * Private constructor for singleton pattern
     */
    constructor() {
        this.moduleRegistry = new ModuleRegistry$1();
        this.requestManager = new RequestManager$1();
        this.messageProcessor = new MessageProcessor$1();
        this.statisticsTracker = new StatisticsTracker$1();
        this.setupEventHandlers();
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
     * Set up event handlers for module lifecycle events
     */
    setupEventHandlers() {
        this.moduleRegistry.onModuleRegister((moduleId) => {
            this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());
            // Notify other modules about new registration
            this.broadcastMessage({
                id: v4(),
                type: 'module_registered',
                source: 'MessageCenter',
                payload: { moduleId },
                timestamp: Date.now(),
            });
        });
        this.moduleRegistry.onModuleUnregister((moduleId) => {
            this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());
            // Clean up any pending requests for this module
            this.requestManager.cancelAll(new Error(`Module ${moduleId} was unregistered`));
            // Notify other modules about unregistration
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
     * Register a module with the message center
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    registerModule(moduleId, moduleInstance) {
        this.moduleRegistry.register(moduleId, moduleInstance);
    }
    /**
     * Unregister a module from the message center
     * @param moduleId - Module ID
     */
    unregisterModule(moduleId) {
        this.moduleRegistry.unregister(moduleId);
    }
    /**
     * Send a one-way message
     * @param message - Message to send
     */
    sendMessage(message) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid message structure:', message);
            this.statisticsTracker.incrementMessagesFailed();
            return;
        }
        this.statisticsTracker.incrementTotalMessages();
        setImmediate(() => {
            this.processMessage(message).catch((error) => {
                console.error(`Error processing message ${message.id}:`, error);
                this.statisticsTracker.incrementMessagesFailed();
            });
        });
    }
    /**
     * Broadcast a message to all modules
     * @param message - Message to broadcast
     */
    broadcastMessage(message) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid broadcast message structure:', message);
            this.statisticsTracker.incrementMessagesFailed();
            return;
        }
        this.statisticsTracker.incrementTotalMessages();
        setImmediate(() => {
            this.messageProcessor
                .broadcastMessage(message, this.moduleRegistry.getAll(), async (msg, moduleId, moduleInstance) => {
                try {
                    await this.messageProcessor.deliverMessage(msg, moduleInstance);
                    this.statisticsTracker.incrementMessagesDelivered();
                }
                catch (error) {
                    console.error(`Error delivering broadcast message to ${moduleId}:`, error);
                    this.statisticsTracker.incrementMessagesFailed();
                }
            })
                .catch((error) => {
                console.error('Error broadcasting message:', error);
                this.statisticsTracker.incrementMessagesFailed();
            });
        });
    }
    /**
     * Send a request and wait for response
     * @param message - Request message
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to the response
     */
    sendRequest(message, timeout = 30000) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid request message structure:', message);
            return Promise.reject(new Error('Invalid message structure'));
        }
        if (!message.correlationId) {
            message.correlationId = v4();
        }
        this.statisticsTracker.incrementTotalMessages();
        this.statisticsTracker.incrementTotalRequests();
        this.statisticsTracker.incrementActiveRequests();
        return this.requestManager.createRequest(message.correlationId, timeout).finally(() => {
            this.statisticsTracker.decrementActiveRequests();
        });
    }
    /**
     * Send a request with callback (non-blocking)
     * @param message - Request message
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     */
    sendRequestAsync(message, callback, timeout = 30000) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid async request message structure:', message);
            callback({
                messageId: message.id,
                correlationId: message.correlationId || '',
                success: false,
                error: 'Invalid message structure',
                timestamp: Date.now(),
            });
            return;
        }
        if (!message.correlationId) {
            message.correlationId = v4();
        }
        this.statisticsTracker.incrementTotalMessages();
        this.statisticsTracker.incrementTotalRequests();
        this.statisticsTracker.incrementActiveRequests();
        this.requestManager.createRequestAsync(message.correlationId, (response) => {
            this.statisticsTracker.decrementActiveRequests();
            callback(response);
        }, timeout);
    }
    /**
     * Process an incoming message
     * @param message - Message to process
     */
    async processMessage(message) {
        try {
            const targetModule = message.target ? this.moduleRegistry.get(message.target) : undefined;
            await this.messageProcessor.processMessage(message, targetModule, async (broadcastMsg) => {
                await this.broadcastMessage(broadcastMsg);
            });
            this.statisticsTracker.incrementMessagesDelivered();
            // Handle response for requests
            if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
                const responseTime = this.requestManager.getResponseTime(message.correlationId);
                if (responseTime) {
                    this.statisticsTracker.recordResponseTime(responseTime);
                }
            }
        }
        catch (error) {
            this.statisticsTracker.incrementMessagesFailed();
            // If this was a request, send error response
            if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
                this.requestManager.rejectRequest(message.correlationId, error);
            }
            else {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
    }
    /**
     * Get message center statistics
     * @returns Statistics object
     */
    getStats() {
        return this.statisticsTracker.getStats();
    }
    /**
     * Get detailed performance metrics
     * @returns Detailed performance metrics
     */
    getPerformanceMetrics() {
        return this.statisticsTracker.getPerformanceMetrics();
    }
    /**
     * Reset message center statistics
     */
    resetStats() {
        this.statisticsTracker.reset();
    }
    /**
     * Get the number of registered modules
     * @returns Number of registered modules
     */
    getModuleCount() {
        return this.moduleRegistry.getCount();
    }
    /**
     * Check if a module is registered
     * @param moduleId - Module ID
     * @returns True if module is registered
     */
    isModuleRegistered(moduleId) {
        return this.moduleRegistry.has(moduleId);
    }
    /**
     * Get all registered module IDs
     * @returns Array of module IDs
     */
    getModuleIds() {
        return this.moduleRegistry.getModuleIds();
    }
    /**
     * Get the number of pending requests
     * @returns Number of pending requests
     */
    getPendingRequestCount() {
        return this.requestManager.getPendingCount();
    }
    /**
     * Get system uptime in human-readable format
     * @returns Uptime string
     */
    getUptime() {
        return this.statisticsTracker.getUptimeString();
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.requestManager.cancelAll();
        this.moduleRegistry.clear();
        this.statisticsTracker.reset();
    }
};

/**
 * Debug Event Bus - 事件驱动的调试通信总线
 * Event-driven debug communication bus
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
        // Add to queue
        if (this.eventQueue.length >= this.maxQueueSize) {
            this.eventQueue.shift(); // Remove oldest event
        }
        this.eventQueue.push(event);
        // Process event immediately
        this.processEvent(event);
    }
    /**
     * Process a single event
     * @param event - Event to process
     */
    processEvent(event) {
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
     * Clear the event queue
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
let BaseModule$2 = class BaseModule {
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
        this.messageCenter = MessageCenter$2.getInstance();
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
};

class UnderConstructionError extends Error {
    constructor(featureName, message) {
        super(message);
        this.name = 'UnderConstructionError';
        this.featureName = featureName;
    }
}
class UnderConstruction extends BaseModule$2 {
    constructor() {
        const moduleInfo = {
            id: v4(),
            type: 'underconstruction',
            name: 'UnderConstruction',
            version: '1.0.0',
            description: 'UnderConstruction class for marking unfinished functionality',
            metadata: {
                config: {
                    enableTracking: true,
                    maxHistorySize: 1000,
                    throwOnCall: false,
                    logToConsole: true
                }
            }
        };
        super(moduleInfo);
        this.underConstructionFeatures = new Map();
        this.callHistory = [];
    }
    async initialize() {
        await super.initialize();
        console.log('UnderConstruction模块已初始化');
    }
    markFeature(featureName, description, options = {}) {
        const feature = {
            name: featureName,
            description,
            intendedBehavior: options.intendedBehavior || '',
            priority: options.priority || 'medium',
            category: options.category || 'general',
            estimatedCompletion: options.estimatedCompletion,
            createdAt: Date.now(),
            createdBy: options.createdBy || 'unknown',
            status: 'pending'
        };
        this.underConstructionFeatures.set(featureName, feature);
        console.log(`功能 '${featureName}' 已标记为未完成状态`);
    }
    callUnderConstructionFeature(featureName, context) {
        const config = this.getInfo().metadata?.['config'];
        if (!this.underConstructionFeatures.has(featureName)) {
            this.markFeature(featureName, 'Auto-marked feature');
        }
        const call = {
            id: v4(),
            featureName,
            timestamp: Date.now(),
            context: context || {}
        };
        this.callHistory.push(call);
        if (this.callHistory.length > (config?.maxHistorySize || 1000)) {
            this.callHistory = this.callHistory.slice(-config?.maxHistorySize || 1000);
        }
        if (config?.throwOnCall) {
            throw new UnderConstructionError(featureName, `功能 '${featureName}' 尚未完成`);
        }
        console.log(`调用了未完成的功能: ${featureName}`);
    }
    getUnderConstructionFeatures() {
        return Array.from(this.underConstructionFeatures.values());
    }
    getFeature(featureName) {
        return this.underConstructionFeatures.get(featureName);
    }
    getCallHistory(limit) {
        const history = this.callHistory.slice().reverse();
        return limit ? history.slice(0, limit) : history;
    }
    completeFeature(featureName, completionNotes) {
        const feature = this.underConstructionFeatures.get(featureName);
        if (!feature) {
            return false;
        }
        feature.status = 'completed';
        console.log(`功能 '${featureName}' 已完成`);
        return true;
    }
    updateFeatureDescription(featureName, newDescription, newIntendedBehavior) {
        const feature = this.underConstructionFeatures.get(featureName);
        if (!feature) {
            return false;
        }
        feature.description = newDescription;
        if (newIntendedBehavior) {
            feature.intendedBehavior = newIntendedBehavior;
        }
        console.log(`功能 '${featureName}' 描述已更新`);
        return true;
    }
    getStatistics() {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const recentCalls = this.callHistory.filter(call => call.timestamp > dayAgo);
        const byCategory = {};
        const byPriority = {};
        this.underConstructionFeatures.forEach(feature => {
            byCategory[feature.category] = (byCategory[feature.category] || 0) + 1;
            byPriority[feature.priority] = (byPriority[feature.priority] || 0) + 1;
        });
        return {
            totalFeatures: this.underConstructionFeatures.size,
            totalCalls: this.callHistory.length,
            recentCalls24h: recentCalls.length,
            byCategory,
            byPriority
        };
    }
    clearCallHistory() {
        this.callHistory = [];
        console.log('调用历史已清除');
    }
    async destroy() {
        console.log('销毁UnderConstruction模块');
        this.underConstructionFeatures.clear();
        this.callHistory = [];
        await super.destroy();
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

const underConstruction$3 = new UnderConstruction();
/**
 * Configuration validator that ensures all recording configurations are valid
 */
class ConfigValidator {
    constructor(config) {
        this.validationRules = new Map();
        this.currentConfig = config || {};
        this.initializeValidationRules();
    }
    // ========================================
    // Main Validation Methods
    // ========================================
    /**
     * Validate configuration with defaults (legacy method for backward compatibility)
     */
    validateConfig(config) {
        const defaultBasePath = './recording-logs';
        // Basic validation with defaults
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
        const validationResult = this.validateConfiguration(validatedConfig);
        if (validationResult) {
            throw new Error(validationResult);
        }
        return validatedConfig;
    }
    /**
     * Validate configuration and return first error (legacy method for backward compatibility)
     */
    validateConfiguration(config) {
        const errors = this.validateTopLevelConfig(config);
        if (errors.length > 0) {
            return errors[0];
        }
        return null;
    }
    /**
     * Validate configuration consistency (legacy method for backward compatibility)
     */
    validateConfigurationConsistency() {
        // Feature: Configuration consistency validation
        underConstruction$3.callUnderConstructionFeature('configuration-consistency-validation', {
            caller: 'ConfigValidator.validateConfigurationConsistency',
            parameters: {
                validationScope: 'all-components',
                strictMode: true
            },
            purpose: 'Validate consistency across all recording configuration components'
        });
        return {
            valid: true,
            errors: [],
            warnings: [],
            details: {}
        };
    }
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

// Create UnderConstruction instance for unimplemented features
const underConstruction$2 = new UnderConstruction();
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
        // Feature: Cycle cleanup policies
        underConstruction$2.callUnderConstructionFeature('cycle-cleanup-policies', {
            caller: 'CycleRecorder.applyCleanupPolicies',
            parameters: {
                cycleId,
                maxCyclesRetained: this.config.maxCyclesRetained,
                cleanupStrategy: 'lru-oldest-first'
            },
            purpose: 'Clean up old cycle directories based on retention policies'
        });
    }
    truncateFields(data) {
        if (!this.truncationConfig || !this.truncationConfig.enabled) {
            return data;
        }
        // Feature: Field truncation logic
        underConstruction$2.callUnderConstructionFeature('field-truncation-logic', {
            caller: 'CycleRecorder.truncateFields',
            parameters: {
                data,
                truncationConfig: this.truncationConfig,
                strategy: 'recursive-depth-traversal'
            },
            purpose: 'Recursively traverse data and apply truncation rules'
        });
        return data;
    }
}

// Create UnderConstruction instance for unimplemented features
const underConstruction$1 = new UnderConstruction();
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
        // Feature: Error record persistence loading
        underConstruction$1.callUnderConstructionFeature('error-record-persistence-loading', {
            caller: 'ErrorRecorder.loadErrorRecords',
            parameters: {
                errorDirectory: this.config.basePath,
                loadStrategy: 'file-scan'
            },
            purpose: 'Load persisted error records from file system'
        });
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

// Create UnderConstruction instance for unimplemented features
const underConstruction = new UnderConstruction();
/**
 * Core recording manager that coordinates all recording components
 *
 * This class acts as a facade that coordinates specialized recording components:
 * - RequestContextManager: Manages request lifecycle and context
 * - GlobalConfigManager: Handles global configuration and versioning
 * - ConfigValidator: Validates configuration consistency
 * - PathResolver: Resolves file paths and templates
 * - CycleRecorder: Handles circular recording operations
 * - ErrorRecorder: Manages error recording and tracking
 * - FieldTruncator: Handles field truncation and data processing
 */
class RecordingManager {
    constructor(config = {}) {
        this.globalConfig = null;
        this.configChangeCallbacks = new Set();
        this.config = this.validateConfig(config);
        // Initialize specialized components
        this.globalConfigManager = new GlobalConfigManager(this.config);
        this.globalConfig = this.globalConfigManager.getGlobalConfig();
        this.configValidator = new ConfigValidator(this.config);
        this.pathResolver = new PathResolver();
        this.requestContextManager = new RequestContextManager();
        this.cycleRecorder = new CycleRecorder(this.config.cycle || {}, this.config.truncation);
        this.errorRecorder = new ErrorRecorder(this.config.error || {});
        this.fieldTruncator = new FieldTruncator(this.config.truncation || {});
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
            const validationError = this.configValidator.validateConfiguration({ ...this.config, ...newConfig });
            if (validationError && !force) {
                return {
                    success: false,
                    errors: [validationError],
                    requiresForce: true
                };
            }
            this.config = this.configValidator.validateConfig({ ...this.config, ...newConfig });
            // Validate consistency
            const consistencyResult = this.configValidator.validateConfigurationConsistency();
            if (!consistencyResult.valid && !force) {
                return {
                    success: false,
                    errors: consistencyResult.errors,
                    requiresForce: true
                };
            }
            // Update global config
            await this.globalConfigManager.updateGlobalConfig(this.config);
            this.globalConfig = this.globalConfigManager.getGlobalConfig();
            // Update specialized components with new config
            this.updateComponentConfigs();
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
    /**
     * Update component configurations
     */
    updateComponentConfigs() {
        // Note: PathResolver doesn't have updateConfig method
        // Note: RequestContextManager doesn't have updateConfig method
        this.cycleRecorder.updateConfig(this.config.cycle || {});
        this.errorRecorder.updateConfig(this.config.error || {});
        this.fieldTruncator.updateConfig(this.config.truncation || {});
    }
    // ========================================
    // Request Context Management
    // ========================================
    /**
     * Create new request context
     */
    createRequestContext(options = {}) {
        return this.requestContextManager.createContext({
            ...options,
            customConfig: options.customConfig
        });
    }
    /**
     * Get request context
     */
    getRequestContext(requestId) {
        return this.requestContextManager.getContext(requestId);
    }
    /**
     * Update request context
     */
    updateRequestContext(requestId, updates) {
        return this.requestContextManager.updateContext(requestId, updates);
    }
    /**
     * Complete request context
     */
    completeRequestContext(requestId, status = 'completed') {
        const context = this.requestContextManager.getContext(requestId);
        if (!context)
            return false;
        const result = this.requestContextManager.completeContext(requestId, status);
        // Generate trace report if context was found and completed
        if (result && context) {
            const report = this.generateTraceReport(context);
            this.saveTraceReport(report);
        }
        return result;
    }
    // ========================================
    // Cycle Recording Management
    // ========================================
    /**
     * Start cycle recording
     */
    async startCycleRecording(requestId, operation, module) {
        if (!this.config.cycle?.enabled)
            return null;
        const context = this.getRequestContext(requestId);
        if (!context)
            return null;
        return this.cycleRecorder.startCycle(operation, module, {
            requestId,
            basePath: this.pathResolver.resolveCyclePath(this.config.cycle || {}, {
                cycleId: '', // Will be set by cycle recorder
                requestId: context.requestId,
                sessionId: context.sessionId,
                timestamp: Date.now()
            }),
            customConfig: this.config.cycle
        });
    }
    /**
     * Record cycle event
     */
    async recordCycleEvent(handle, event) {
        if (!this.config.cycle?.enabled)
            return false;
        try {
            // Apply field truncation if enabled
            let eventData = { ...event };
            if (this.config.truncation?.enabled) {
                eventData = this.fieldTruncator.truncateFields(eventData, 'cycle');
            }
            return this.cycleRecorder.recordCycleEvent(handle, eventData);
        }
        catch (error) {
            this.logError('Failed to record cycle event', error);
            return false;
        }
    }
    /**
     * End cycle recording
     */
    async endCycleRecording(handle, result, error) {
        if (!this.config.cycle?.enabled)
            return false;
        try {
            const context = handle.requestId ? this.getRequestContext(handle.requestId) : undefined;
            const event = {
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
            };
            // Apply field truncation if enabled
            let eventData = { ...event };
            if (this.config.truncation?.enabled) {
                eventData = this.fieldTruncator.truncateFields(eventData, 'cycle');
            }
            const success = await this.cycleRecorder.endCycle(handle, eventData);
            if (success) {
                // Generate summary
                this.generateCycleSummary(handle);
            }
            return success;
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
    async recordError(errorData) {
        if (!this.config.error?.enabled)
            return '';
        return await this.errorRecorder.recordError(errorData);
    }
    /**
     * Get error records
     */
    getErrorRecords(filters) {
        return this.errorRecorder.getErrors(filters);
    }
    /**
     * Resolve error
     */
    async resolveError(errorId, resolution) {
        return await this.errorRecorder.resolveError(errorId, resolution);
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
        return this.fieldTruncator.truncateFields(data, context);
    }
    /**
     * Get truncation statistics
     */
    getTruncationStats() {
        return this.fieldTruncator.getReport();
    }
    // ========================================
    // Helper Methods
    // ========================================
    /**
     * Validate configuration (delegated to ConfigValidator)
     */
    validateConfig(config) {
        return this.configValidator.validateConfig(config);
    }
    /**
     * Notify configuration changes to all registered callbacks
     */
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
    /**
     * Generate trace report for completed request context
     */
    generateTraceReport(context) {
        // Feature: Trace report generation
        underConstruction.callUnderConstructionFeature('trace-report-generation', {
            caller: 'RecordingManager.generateTraceReport',
            parameters: {
                context,
                reportFormat: 'comprehensive',
                includePerformance: true
            },
            purpose: 'Generate comprehensive trace reports with performance metrics'
        });
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
    /**
     * Save trace report to persistent storage
     */
    saveTraceReport(report) {
        // Feature: Trace report saving
        underConstruction.callUnderConstructionFeature('trace-report-saving', {
            caller: 'RecordingManager.saveTraceReport',
            parameters: {
                report,
                saveStrategy: 'timestamped-directory',
                compression: true
            },
            purpose: 'Save trace reports to persistent storage with compression'
        });
    }
    /**
     * Generate cycle summary for completed cycle
     */
    generateCycleSummary(handle) {
        // Feature: Cycle summary generation
        underConstruction.callUnderConstructionFeature('cycle-summary-generation', {
            caller: 'RecordingManager.generateCycleSummary',
            parameters: {
                handle,
                summaryType: 'statistical-overview',
                includeTiming: true
            },
            purpose: 'Generate statistical summaries for completed cycles'
        });
    }
    /**
     * Log error with context
     */
    logError(message, error) {
        console.error(`[RecordingManager] ${message}:`, error);
    }
}

/**
 * Manages module registration and lifecycle
 */
class ModuleRegistry {
    constructor() {
        this.modules = new Map();
    }
    /**
     * Register a module with the registry
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    register(moduleId, moduleInstance) {
        if (this.modules.has(moduleId)) {
            throw new Error(`Module ${moduleId} is already registered`);
        }
        this.modules.set(moduleId, moduleInstance);
        // Notify about new registration
        if (this.onModuleRegistered) {
            setImmediate(() => this.onModuleRegistered(moduleId));
        }
    }
    /**
     * Unregister a module from the registry
     * @param moduleId - Module ID
     */
    unregister(moduleId) {
        const wasRegistered = this.modules.delete(moduleId);
        if (wasRegistered && this.onModuleUnregistered) {
            setImmediate(() => this.onModuleUnregistered(moduleId));
        }
        return wasRegistered;
    }
    /**
     * Get a module by ID
     * @param moduleId - Module ID
     * @returns Module instance or undefined
     */
    get(moduleId) {
        return this.modules.get(moduleId);
    }
    /**
     * Check if a module is registered
     * @param moduleId - Module ID
     * @returns True if module is registered
     */
    has(moduleId) {
        return this.modules.has(moduleId);
    }
    /**
     * Get all registered modules
     * @returns Map of module IDs to instances
     */
    getAll() {
        return new Map(this.modules);
    }
    /**
     * Get the number of registered modules
     * @returns Number of registered modules
     */
    getCount() {
        return this.modules.size;
    }
    /**
     * Get all module IDs
     * @returns Array of module IDs
     */
    getModuleIds() {
        return Array.from(this.modules.keys());
    }
    /**
     * Set callback for module registration
     * @param callback - Callback function
     */
    onModuleRegister(callback) {
        this.onModuleRegistered = callback;
    }
    /**
     * Set callback for module unregistration
     * @param callback - Callback function
     */
    onModuleUnregister(callback) {
        this.onModuleUnregistered = callback;
    }
    /**
     * Clear all registered modules
     */
    clear() {
        this.modules.clear();
    }
    /**
     * Check if registry is empty
     * @returns True if no modules are registered
     */
    isEmpty() {
        return this.modules.size === 0;
    }
}

/**
 * Manages request/response lifecycle with timeout handling
 */
class RequestManager {
    constructor() {
        this.pendingRequests = new Map();
    }
    /**
     * Create a new pending request
     * @param correlationId - Request correlation ID
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to response or rejects on timeout
     */
    createRequest(correlationId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            this.pendingRequests.set(correlationId, {
                resolve,
                reject,
                timeoutId,
                startTime: Date.now(),
            });
        });
    }
    /**
     * Create a pending request with callback support
     * @param correlationId - Request correlation ID
     * @param callback - Callback function
     * @param timeout - Timeout in milliseconds
     */
    createRequestAsync(correlationId, callback, timeout = 30000) {
        const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(correlationId);
            callback({
                messageId: '',
                correlationId,
                success: false,
                error: `Request timeout after ${timeout}ms`,
                timestamp: Date.now(),
            });
        }, timeout);
        this.pendingRequests.set(correlationId, {
            resolve: (response) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(correlationId);
                callback(response);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(correlationId);
                callback({
                    messageId: '',
                    correlationId,
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: Date.now(),
                });
            },
            timeoutId,
            startTime: Date.now(),
        });
    }
    /**
     * Resolve a pending request
     * @param correlationId - Request correlation ID
     * @param response - Response to send
     * @returns True if request was found and resolved
     */
    resolveRequest(correlationId, response) {
        const request = this.pendingRequests.get(correlationId);
        if (!request) {
            return false;
        }
        clearTimeout(request.timeoutId);
        request.resolve(response);
        this.pendingRequests.delete(correlationId);
        return true;
    }
    /**
     * Reject a pending request
     * @param correlationId - Request correlation ID
     * @param error - Error to reject with
     * @returns True if request was found and rejected
     */
    rejectRequest(correlationId, error) {
        const request = this.pendingRequests.get(correlationId);
        if (!request) {
            return false;
        }
        clearTimeout(request.timeoutId);
        request.reject(error);
        this.pendingRequests.delete(correlationId);
        return true;
    }
    /**
     * Check if a request is pending
     * @param correlationId - Request correlation ID
     * @returns True if request is pending
     */
    hasPendingRequest(correlationId) {
        return this.pendingRequests.has(correlationId);
    }
    /**
     * Get the number of pending requests
     * @returns Number of pending requests
     */
    getPendingCount() {
        return this.pendingRequests.size;
    }
    /**
     * Get response time for a completed request
     * @param correlationId - Request correlation ID
     * @returns Response time in milliseconds or undefined if not found
     */
    getResponseTime(correlationId) {
        const request = this.pendingRequests.get(correlationId);
        return request ? Date.now() - request.startTime : undefined;
    }
    /**
     * Cancel all pending requests
     * @param error - Error to reject pending requests with
     */
    cancelAll(error = new Error('All requests cancelled')) {
        for (const [correlationId, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeoutId);
            request.reject(error);
        }
        this.pendingRequests.clear();
    }
    /**
     * Clean up expired requests older than specified time
     * @param maxAge - Maximum age in milliseconds
     * @returns Number of expired requests cleaned up
     */
    cleanupExpired(maxAge) {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [correlationId, request] of this.pendingRequests.entries()) {
            if (now - request.startTime > maxAge) {
                clearTimeout(request.timeoutId);
                request.reject(new Error(`Request expired after ${maxAge}ms`));
                this.pendingRequests.delete(correlationId);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * Get all pending request correlation IDs
     * @returns Array of correlation IDs
     */
    getPendingRequestIds() {
        return Array.from(this.pendingRequests.keys());
    }
    /**
     * Clear all pending requests without rejecting them
     */
    clear() {
        for (const [, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeoutId);
        }
        this.pendingRequests.clear();
    }
}

/**
 * Handles message processing, routing, and delivery
 */
class MessageProcessor {
    /**
     * Process an incoming message with TTL validation
     * @param message - Message to process
     * @param targetModule - Target module instance (for targeted messages)
     * @param broadcastHandler - Handler for broadcast messages
     * @returns Promise that resolves when message is processed
     */
    async processMessage(message, targetModule, broadcastHandler) {
        // Check for TTL expiration
        if (message.ttl && Date.now() - message.timestamp > message.ttl) {
            throw new Error('Message TTL expired');
        }
        if (message.target) {
            // Targeted message
            if (!targetModule) {
                throw new Error(`Target module ${message.target} not found`);
            }
            await this.deliverMessage(message, targetModule);
        }
        else {
            // Broadcast message
            await broadcastHandler(message);
        }
    }
    /**
     * Deliver a message to a specific module
     * @param message - Message to deliver
     * @param moduleInstance - Target module instance
     * @returns Promise that resolves to response or void
     */
    async deliverMessage(message, moduleInstance) {
        if (typeof moduleInstance.handleMessage !== 'function') {
            throw new Error(`Module does not implement handleMessage method`);
        }
        try {
            const response = await moduleInstance.handleMessage(message);
            return response;
        }
        catch (error) {
            throw new Error(`Failed to deliver message to module: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Broadcast a message to multiple modules
     * @param message - Message to broadcast
     * @param modules - Map of module IDs to instances
     * @param deliveryHandler - Handler for individual message delivery
     * @returns Promise that resolves when all modules have been processed
     */
    async broadcastMessage(message, modules, deliveryHandler) {
        const deliveryPromises = [];
        for (const [moduleId, moduleInstance] of modules.entries()) {
            if (moduleId !== message.source) {
                // Don't send back to sender
                const deliveryPromise = deliveryHandler(message, moduleId, moduleInstance);
                deliveryPromises.push(deliveryPromise);
            }
        }
        await Promise.allSettled(deliveryPromises);
    }
    /**
     * Validate message structure
     * @param message - Message to validate
     * @returns True if message is valid
     */
    validateMessage(message) {
        const requiredFields = ['id', 'type', 'source', 'payload', 'timestamp'];
        for (const field of requiredFields) {
            if (!(field in message)) {
                return false;
            }
        }
        // Validate data types
        if (typeof message.id !== 'string' || message.id.trim() === '') {
            return false;
        }
        if (typeof message.type !== 'string' || message.type.trim() === '') {
            return false;
        }
        if (typeof message.source !== 'string' || message.source.trim() === '') {
            return false;
        }
        if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
            return false;
        }
        // Validate optional fields
        if (message.target && (typeof message.target !== 'string' || message.target.trim() === '')) {
            return false;
        }
        // Validate topic field
        if (message.topic && (typeof message.topic !== 'string' || message.topic.trim() === '')) {
            return false;
        }
        if (message.correlationId && (typeof message.correlationId !== 'string' || message.correlationId.trim() === '')) {
            return false;
        }
        if (message.ttl && (typeof message.ttl !== 'number' || message.ttl <= 0)) {
            return false;
        }
        if (message.priority && (typeof message.priority !== 'number' || message.priority < 0 || message.priority > 9)) {
            return false;
        }
        return true;
    }
    /**
     * Sanitize message for delivery
     * @param message - Message to sanitize
     * @returns Sanitized message
     */
    sanitizeMessage(message) {
        const sanitized = {
            id: message.id || '',
            type: message.type || '',
            source: message.source || '',
            payload: message.payload,
            timestamp: message.timestamp || Date.now(),
        };
        // Add optional fields if they exist and are valid
        if (message.target && typeof message.target === 'string' && message.target.trim() !== '') {
            sanitized.target = message.target;
        }
        // Add topic field
        if (message.topic && typeof message.topic === 'string' && message.topic.trim() !== '') {
            sanitized.topic = message.topic;
        }
        if (message.correlationId && typeof message.correlationId === 'string' && message.correlationId.trim() !== '') {
            sanitized.correlationId = message.correlationId;
        }
        if (message.metadata && typeof message.metadata === 'object' && message.metadata !== null) {
            sanitized.metadata = { ...message.metadata };
        }
        if (message.ttl && typeof message.ttl === 'number' && message.ttl > 0) {
            sanitized.ttl = message.ttl;
        }
        if (message.priority !== undefined && typeof message.priority === 'number' && message.priority >= 0 && message.priority <= 9) {
            sanitized.priority = message.priority;
        }
        return sanitized;
    }
    /**
     * Create a response message
     * @param originalMessage - Original message
     * @param success - Whether operation was successful
     * @param data - Response data
     * @param error - Error message
     * @returns Response message
     */
    createResponse(originalMessage, success, data, error) {
        return {
            messageId: originalMessage.id,
            correlationId: originalMessage.correlationId || '',
            success,
            data,
            error,
            timestamp: Date.now(),
        };
    }
    /**
     * Check if message requires a response
     * @param message - Message to check
     * @returns True if message requires a response
     */
    requiresResponse(message) {
        return !!message.correlationId;
    }
    /**
     * Get message priority level
     * @param message - Message to check
     * @returns Priority level (0-9, default 5)
     */
    getMessagePriority(message) {
        return message.priority !== undefined ? Math.max(0, Math.min(9, message.priority)) : 5;
    }
    /**
     * Check if message has expired
     * @param message - Message to check
     * @returns True if message has expired
     */
    isMessageExpired(message) {
        if (!message.ttl) {
            return false;
        }
        return Date.now() - message.timestamp > message.ttl;
    }
    /**
     * Get remaining TTL for message
     * @param message - Message to check
     * @returns Remaining TTL in milliseconds, or -1 if expired
     */
    getRemainingTTL(message) {
        if (!message.ttl) {
            return -1;
        }
        const elapsed = Date.now() - message.timestamp;
        return message.ttl - elapsed;
    }
}

/**
 * Tracks and manages message center statistics
 */
class StatisticsTracker {
    constructor() {
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: 0,
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: 0,
        };
        this.responseTimes = [];
        this.startTime = Date.now();
        this.maxResponseTimes = 1000;
    }
    /**
     * Increment total messages count
     */
    incrementTotalMessages() {
        this.stats.totalMessages++;
    }
    /**
     * Increment total requests count
     */
    incrementTotalRequests() {
        this.stats.totalRequests++;
    }
    /**
     * Increment active requests count
     */
    incrementActiveRequests() {
        this.stats.activeRequests++;
    }
    /**
     * Decrement active requests count
     */
    decrementActiveRequests() {
        this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);
    }
    /**
     * Increment delivered messages count
     */
    incrementMessagesDelivered() {
        this.stats.messagesDelivered++;
    }
    /**
     * Increment failed messages count
     */
    incrementMessagesFailed() {
        this.stats.messagesFailed++;
    }
    /**
     * Set registered modules count
     * @param count - Number of registered modules
     */
    setRegisteredModules(count) {
        this.stats.registeredModules = count;
    }
    /**
     * Record a response time
     * @param responseTime - Response time in milliseconds
     */
    recordResponseTime(responseTime) {
        this.responseTimes.push(responseTime);
        // Keep only the most recent response times
        if (this.responseTimes.length > this.maxResponseTimes) {
            this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes / 10);
        }
        // Update average response time
        this.updateAverageResponseTime();
    }
    /**
     * Update the average response time based on recorded times
     */
    updateAverageResponseTime() {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
            this.stats.averageResponseTime = Math.round(sum / this.responseTimes.length);
        }
        else {
            this.stats.averageResponseTime = 0;
        }
    }
    /**
     * Get current statistics
     * @returns Current statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime,
        };
    }
    /**
     * Reset all statistics
     */
    reset() {
        this.stats = {
            totalMessages: 0,
            totalRequests: 0,
            activeRequests: 0,
            registeredModules: this.stats.registeredModules, // Keep current module count
            messagesDelivered: 0,
            messagesFailed: 0,
            averageResponseTime: 0,
            uptime: 0,
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
    /**
     * Get response time statistics
     * @returns Response time statistics
     */
    getResponseTimeStats() {
        if (this.responseTimes.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                last: undefined,
            };
        }
        const count = this.responseTimes.length;
        const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
        const average = Math.round(sum / count);
        const min = Math.min(...this.responseTimes);
        const max = Math.max(...this.responseTimes);
        const last = this.responseTimes[this.responseTimes.length - 1];
        return {
            count,
            average,
            min,
            max,
            last,
        };
    }
    /**
     * Get success rate (percentage of successful deliveries)
     * @returns Success rate percentage (0-100)
     */
    getSuccessRate() {
        const total = this.stats.messagesDelivered + this.stats.messagesFailed;
        if (total === 0) {
            return 0;
        }
        return Math.round((this.stats.messagesDelivered / total) * 100);
    }
    /**
     * Get throughput (messages per second)
     * @returns Messages per second
     */
    getThroughput() {
        const uptime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        if (uptime <= 0) {
            return 0;
        }
        return Math.round(this.stats.totalMessages / uptime);
    }
    /**
     * Get detailed performance metrics
     * @returns Detailed performance metrics
     */
    getPerformanceMetrics() {
        const responseTimeStats = this.getResponseTimeStats();
        return {
            uptime: Date.now() - this.startTime,
            throughput: this.getThroughput(),
            successRate: this.getSuccessRate(),
            responseTime: {
                average: responseTimeStats.average,
                min: responseTimeStats.min,
                max: responseTimeStats.max,
                count: responseTimeStats.count,
            },
            load: {
                activeRequests: this.stats.activeRequests,
                registeredModules: this.stats.registeredModules,
            },
        };
    }
    /**
     * Get the number of recorded response times
     * @returns Number of recorded response times
     */
    getResponseTimeCount() {
        return this.responseTimes.length;
    }
    /**
     * Clear recorded response times
     */
    clearResponseTimes() {
        this.responseTimes = [];
        this.stats.averageResponseTime = 0;
    }
    /**
     * Set the maximum number of response times to keep
     * @param max - Maximum number of response times
     */
    setMaxResponseTimes(max) {
        this.maxResponseTimes = Math.max(1, max);
        // Trim existing response times if needed
        if (this.responseTimes.length > this.maxResponseTimes) {
            this.responseTimes = this.responseTimes.slice(-Math.floor(this.maxResponseTimes / 10));
        }
    }
    /**
     * Get uptime in human-readable format
     * @returns Human-readable uptime string
     */
    getUptimeString() {
        const uptime = Date.now() - this.startTime;
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
}

/**
 * Manages topic-based subscriptions for modules
 */
class TopicSubscriptionManager {
    constructor(moduleRegistry) {
        this.topicSubscriptions = new Map();
        this.wildcardSubscriptions = new Set(); // Modules subscribed to all topics
        this.moduleRegistry = moduleRegistry;
    }
    /**
     * Subscribe a module to a specific topic
     * @param moduleId - Module ID to subscribe
     * @param topic - Topic to subscribe to
     * @param options - Subscription options
     */
    subscribeToTopic(moduleId, topic, options = {}) {
        // Validate module exists
        if (!this.moduleRegistry.has(moduleId)) {
            throw new Error(`Module ${moduleId} is not registered`);
        }
        if (options.wildcard) {
            // Wildcard subscription - receive all topic messages
            this.wildcardSubscriptions.add(moduleId);
            return;
        }
        // Normal topic subscription
        if (!this.topicSubscriptions.has(topic)) {
            this.topicSubscriptions.set(topic, new Set());
        }
        this.topicSubscriptions.get(topic).add(moduleId);
    }
    /**
     * Unsubscribe a module from a specific topic
     * @param moduleId - Module ID to unsubscribe
     * @param topic - Topic to unsubscribe from
     * @param options - Unsubscription options
     */
    unsubscribeFromTopic(moduleId, topic, options = {}) {
        if (options.wildcard) {
            this.wildcardSubscriptions.delete(moduleId);
            return;
        }
        const subscribers = this.topicSubscriptions.get(topic);
        if (subscribers) {
            subscribers.delete(moduleId);
            // Clean up empty topic subscriptions
            if (subscribers.size === 0) {
                this.topicSubscriptions.delete(topic);
            }
        }
    }
    /**
     * Get all subscribers for a topic
     * @param topic - Topic to get subscribers for
     * @returns Array of module IDs subscribed to the topic
     */
    getTopicSubscribers(topic) {
        const subscribers = [];
        // Get specific topic subscribers
        const topicSubscribers = this.topicSubscriptions.get(topic);
        if (topicSubscribers) {
            subscribers.push(...topicSubscribers);
        }
        // Add wildcard subscribers
        subscribers.push(...this.wildcardSubscriptions);
        // Filter out modules that are no longer registered
        return subscribers.filter(moduleId => this.moduleRegistry.has(moduleId));
    }
    /**
     * Check if a module is subscribed to a topic
     * @param moduleId - Module ID to check
     * @param topic - Topic to check
     * @returns True if module is subscribed
     */
    isSubscribed(moduleId, topic) {
        // Check wildcard subscription
        if (this.wildcardSubscriptions.has(moduleId)) {
            return true;
        }
        // Check specific topic subscription
        const subscribers = this.topicSubscriptions.get(topic);
        return subscribers ? subscribers.has(moduleId) : false;
    }
    /**
     * Get all topics a module is subscribed to
     * @param moduleId - Module ID to get topics for
     * @returns Array of topics the module is subscribed to
     */
    getModuleSubscriptions(moduleId) {
        const topics = [];
        // Check if module has wildcard subscription
        if (this.wildcardSubscriptions.has(moduleId)) {
            topics.push('*'); // Special marker for wildcard
        }
        // Get specific topic subscriptions
        for (const [topic, subscribers] of this.topicSubscriptions.entries()) {
            if (subscribers.has(moduleId)) {
                topics.push(topic);
            }
        }
        return topics;
    }
    /**
     * Get all active topics
     * @returns Array of active topic names
     */
    getAllTopics() {
        return Array.from(this.topicSubscriptions.keys());
    }
    /**
     * Get subscription statistics
     * @returns Subscription statistics
     */
    getSubscriptionStats() {
        return {
            totalTopics: this.topicSubscriptions.size,
            totalSubscriptions: Array.from(this.topicSubscriptions.values())
                .reduce((sum, subscribers) => sum + subscribers.size, 0),
            wildcardSubscriptions: this.wildcardSubscriptions.size,
            topics: this.getAllTopics()
        };
    }
    /**
     * Clean up subscriptions for unregistered modules
     */
    cleanupOrphanedSubscriptions() {
        const registeredModules = this.moduleRegistry.getModuleIds();
        // Clean up topic subscriptions
        for (const [topic, subscribers] of this.topicSubscriptions.entries()) {
            for (const moduleId of subscribers) {
                if (!registeredModules.includes(moduleId)) {
                    subscribers.delete(moduleId);
                }
            }
            // Remove empty topics
            if (subscribers.size === 0) {
                this.topicSubscriptions.delete(topic);
            }
        }
        // Clean up wildcard subscriptions
        for (const moduleId of this.wildcardSubscriptions) {
            if (!registeredModules.includes(moduleId)) {
                this.wildcardSubscriptions.delete(moduleId);
            }
        }
    }
    /**
     * Clear all subscriptions
     */
    clear() {
        this.topicSubscriptions.clear();
        this.wildcardSubscriptions.clear();
    }
}

/**
 * Refactored Message center for module communication
 * Uses composition pattern to separate concerns
 */
class MessageCenter {
    /**
     * Private constructor for singleton pattern
     */
    constructor() {
        this.moduleRegistry = new ModuleRegistry();
        this.requestManager = new RequestManager();
        this.messageProcessor = new MessageProcessor();
        this.statisticsTracker = new StatisticsTracker();
        this.topicSubscriptionManager = new TopicSubscriptionManager(this.moduleRegistry);
        this.setupEventHandlers();
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
     * Set up event handlers for module lifecycle events
     */
    setupEventHandlers() {
        this.moduleRegistry.onModuleRegister((moduleId) => {
            this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());
            // Notify other modules about new registration
            this.broadcastMessage({
                id: v4(),
                type: 'module_registered',
                source: 'MessageCenter',
                payload: { moduleId },
                timestamp: Date.now(),
            });
        });
        this.moduleRegistry.onModuleUnregister((moduleId) => {
            this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());
            // Clean up any pending requests for this module
            this.requestManager.cancelAll(new Error(`Module ${moduleId} was unregistered`));
            // Clean up topic subscriptions
            this.topicSubscriptionManager.cleanupOrphanedSubscriptions();
            // Notify other modules about unregistration
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
     * Register a module with the message center
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    registerModule(moduleId, moduleInstance) {
        this.moduleRegistry.register(moduleId, moduleInstance);
    }
    /**
     * Unregister a module from the message center
     * @param moduleId - Module ID
     */
    unregisterModule(moduleId) {
        this.moduleRegistry.unregister(moduleId);
    }
    /**
     * Send a one-way message
     * @param message - Message to send
     */
    sendMessage(message) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid message structure:', message);
            this.statisticsTracker.incrementMessagesFailed();
            return;
        }
        this.statisticsTracker.incrementTotalMessages();
        setImmediate(() => {
            this.processMessage(message).catch((error) => {
                console.error(`Error processing message ${message.id}:`, error);
                this.statisticsTracker.incrementMessagesFailed();
            });
        });
    }
    /**
     * Broadcast a message to all modules
     * @param message - Message to broadcast
     */
    broadcastMessage(message) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid broadcast message structure:', message);
            this.statisticsTracker.incrementMessagesFailed();
            return;
        }
        this.statisticsTracker.incrementTotalMessages();
        setImmediate(() => {
            this.messageProcessor
                .broadcastMessage(message, this.moduleRegistry.getAll(), async (msg, moduleId, moduleInstance) => {
                try {
                    await this.messageProcessor.deliverMessage(msg, moduleInstance);
                    this.statisticsTracker.incrementMessagesDelivered();
                }
                catch (error) {
                    console.error(`Error delivering broadcast message to ${moduleId}:`, error);
                    this.statisticsTracker.incrementMessagesFailed();
                }
            })
                .catch((error) => {
                console.error('Error broadcasting message:', error);
                this.statisticsTracker.incrementMessagesFailed();
            });
        });
    }
    /**
     * Send a request and wait for response
     * @param message - Request message
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to the response
     */
    sendRequest(message, timeout = 30000) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid request message structure:', message);
            return Promise.reject(new Error('Invalid message structure'));
        }
        if (!message.correlationId) {
            message.correlationId = v4();
        }
        this.statisticsTracker.incrementTotalMessages();
        this.statisticsTracker.incrementTotalRequests();
        this.statisticsTracker.incrementActiveRequests();
        return this.requestManager.createRequest(message.correlationId, timeout).finally(() => {
            this.statisticsTracker.decrementActiveRequests();
        });
    }
    /**
     * Send a request with callback (non-blocking)
     * @param message - Request message
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     */
    sendRequestAsync(message, callback, timeout = 30000) {
        if (!this.messageProcessor.validateMessage(message)) {
            console.error('Invalid async request message structure:', message);
            callback({
                messageId: message.id,
                correlationId: message.correlationId || '',
                success: false,
                error: 'Invalid message structure',
                timestamp: Date.now(),
            });
            return;
        }
        if (!message.correlationId) {
            message.correlationId = v4();
        }
        this.statisticsTracker.incrementTotalMessages();
        this.statisticsTracker.incrementTotalRequests();
        this.statisticsTracker.incrementActiveRequests();
        this.requestManager.createRequestAsync(message.correlationId, (response) => {
            this.statisticsTracker.decrementActiveRequests();
            callback(response);
        }, timeout);
    }
    /**
     * Process an incoming message
     * @param message - Message to process
     */
    async processMessage(message) {
        try {
            const targetModule = message.target ? this.moduleRegistry.get(message.target) : undefined;
            await this.messageProcessor.processMessage(message, targetModule, async (broadcastMsg) => {
                await this.broadcastMessage(broadcastMsg);
            });
            this.statisticsTracker.incrementMessagesDelivered();
            // Handle response for requests
            if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
                const responseTime = this.requestManager.getResponseTime(message.correlationId);
                if (responseTime) {
                    this.statisticsTracker.recordResponseTime(responseTime);
                }
            }
        }
        catch (error) {
            this.statisticsTracker.incrementMessagesFailed();
            // If this was a request, send error response
            if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
                this.requestManager.rejectRequest(message.correlationId, error);
            }
            else {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
    }
    /**
     * Get message center statistics
     * @returns Statistics object
     */
    getStats() {
        return this.statisticsTracker.getStats();
    }
    /**
     * Get detailed performance metrics
     * @returns Detailed performance metrics
     */
    getPerformanceMetrics() {
        return this.statisticsTracker.getPerformanceMetrics();
    }
    /**
     * Reset message center statistics
     */
    resetStats() {
        this.statisticsTracker.reset();
    }
    /**
     * Subscribe a module to a specific topic
     * @param moduleId - Module ID to subscribe
     * @param topic - Topic to subscribe to
     * @param options - Subscription options
     */
    subscribeToTopic(moduleId, topic, options = {}) {
        this.topicSubscriptionManager.subscribeToTopic(moduleId, topic, options);
    }
    /**
     * Unsubscribe a module from a specific topic
     * @param moduleId - Module ID to unsubscribe
     * @param topic - Topic to unsubscribe from
     * @param options - Unsubscription options
     */
    unsubscribeFromTopic(moduleId, topic, options = {}) {
        this.topicSubscriptionManager.unsubscribeFromTopic(moduleId, topic, options);
    }
    /**
     * Get all subscribers for a topic
     * @param topic - Topic to get subscribers for
     * @returns Array of module IDs subscribed to the topic
     */
    getTopicSubscribers(topic) {
        return this.topicSubscriptionManager.getTopicSubscribers(topic);
    }
    /**
     * Check if a module is subscribed to a topic
     * @param moduleId - Module ID to check
     * @param topic - Topic to check
     * @returns True if module is subscribed
     */
    isSubscribed(moduleId, topic) {
        return this.topicSubscriptionManager.isSubscribed(moduleId, topic);
    }
    /**
     * Get all topics a module is subscribed to
     * @param moduleId - Module ID to get topics for
     * @returns Array of topics the module is subscribed to
     */
    getModuleSubscriptions(moduleId) {
        return this.topicSubscriptionManager.getModuleSubscriptions(moduleId);
    }
    /**
     * Get all active topics
     * @returns Array of active topic names
     */
    getAllTopics() {
        return this.topicSubscriptionManager.getAllTopics();
    }
    /**
     * Get subscription statistics
     * @returns Subscription statistics
     */
    getSubscriptionStats() {
        return this.topicSubscriptionManager.getSubscriptionStats();
    }
    /**
     * Publish a message to a specific topic
     * @param topic - Topic to publish to
     * @param message - Message to publish (without target field)
     * @returns Array of module IDs that received the message
     */
    publishToTopic(topic, message) {
        const fullMessage = {
            ...message,
            topic
        };
        if (!this.messageProcessor.validateMessage(fullMessage)) {
            console.error('Invalid topic message structure:', fullMessage);
            this.statisticsTracker.incrementMessagesFailed();
            return [];
        }
        this.statisticsTracker.incrementTotalMessages();
        const subscribers = this.topicSubscriptionManager.getTopicSubscribers(topic);
        setImmediate(() => {
            this.deliverToTopicSubscribers(fullMessage, subscribers).catch((error) => {
                console.error(`Error delivering topic message to ${topic}:`, error);
                this.statisticsTracker.incrementMessagesFailed();
            });
        });
        return subscribers;
    }
    /**
     * Deliver message to topic subscribers
     * @param message - Message to deliver
     * @param subscribers - Array of subscriber module IDs
     */
    async deliverToTopicSubscribers(message, subscribers) {
        const deliveryPromises = [];
        for (const moduleId of subscribers) {
            if (moduleId !== message.source) {
                // Don't send back to sender
                const moduleInstance = this.moduleRegistry.get(moduleId);
                if (moduleInstance) {
                    const deliveryPromise = this.messageProcessor.deliverMessage(message, moduleInstance)
                        .then(() => {
                        this.statisticsTracker.incrementMessagesDelivered();
                    })
                        .catch((error) => {
                        console.error(`Error delivering topic message to ${moduleId}:`, error);
                        this.statisticsTracker.incrementMessagesFailed();
                    });
                    deliveryPromises.push(deliveryPromise);
                }
            }
        }
        await Promise.allSettled(deliveryPromises);
    }
    /**
     * Get the number of registered modules
     * @returns Number of registered modules
     */
    getModuleCount() {
        return this.moduleRegistry.getCount();
    }
    /**
     * Check if a module is registered
     * @param moduleId - Module ID
     * @returns True if module is registered
     */
    isModuleRegistered(moduleId) {
        return this.moduleRegistry.has(moduleId);
    }
    /**
     * Get all registered module IDs
     * @returns Array of module IDs
     */
    getModuleIds() {
        return this.moduleRegistry.getModuleIds();
    }
    /**
     * Get the number of pending requests
     * @returns Number of pending requests
     */
    getPendingRequestCount() {
        return this.requestManager.getPendingCount();
    }
    /**
     * Get system uptime in human-readable format
     * @returns Uptime string
     */
    getUptime() {
        return this.statisticsTracker.getUptimeString();
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.requestManager.cancelAll();
        this.moduleRegistry.clear();
        this.topicSubscriptionManager.clear();
        this.statisticsTracker.reset();
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
        // Debug event bus functionality moved to rcc-debugcenter package
        // This module now uses external debug handler pattern
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
     * Set external debug handler for integration with DebugCenter
     * @param handler - External debug event handler
     */
    setExternalDebugHandler(handler) {
        this.externalDebugHandler = handler;
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
        // Send to external debug handler if available
        if (this.externalDebugHandler) {
            this.externalDebugHandler(event);
        }
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
        // Send to external debug handler if available
        if (this.externalDebugHandler) {
            this.externalDebugHandler(event);
        }
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
            case 'module_registered':
                // Handle module registration messages
                this.debug('info', 'Module registration received', {
                    moduleId: message.payload?.moduleId,
                    moduleName: message.payload?.moduleName,
                    moduleType: message.payload?.moduleType
                }, 'handleMessage');
                // Call the module lifecycle method
                if (message.payload?.moduleId) {
                    this.onModuleRegistered(message.payload.moduleId);
                }
                return {
                    messageId: message.id,
                    correlationId: message.correlationId || '',
                    success: true,
                    data: {
                        received: true,
                        acknowledged: true,
                        moduleId: this.info.id,
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                };
            case 'server-initialized':
            case 'server-started':
            case 'pipeline_started':
            case 'pipeline_completed':
            case 'request_started':
            case 'request_completed':
                // Handle common system messages silently
                this.debug('info', 'System message received', {
                    type: message.type,
                    messageId: message.id
                }, 'handleMessage');
                return {
                    messageId: message.id,
                    correlationId: message.correlationId || '',
                    success: true,
                    data: {
                        received: true,
                        acknowledged: true,
                        moduleId: this.info.id,
                        timestamp: Date.now()
                    },
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
        // Send to external debug handler if available
        if (this.externalDebugHandler) {
            this.externalDebugHandler(event);
        }
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
        // Send to external debug handler if available
        if (this.externalDebugHandler) {
            this.externalDebugHandler(event);
        }
        // Log locally for backward compatibility
        this.debug('debug', `I/O tracking ended: ${operationId}`, {
            sessionId: this.currentSessionId,
            output: this.debugConfig.trackDataFlow ? output : '[OUTPUT_DATA]',
            success,
            error
        }, 'endIOTracking');
    }
}

export { ActionPriority$2 as ActionPriority, ActionStatus$2 as ActionStatus, ActionType$2 as ActionType, AnnotationType$2 as AnnotationType, BaseModule, ConditionOperator$2 as ConditionOperator, ConfigValidator, ConfigValidator as ConfigurationValidation, CycleRecorder, CycleRecorder as CycleRecording, ErrorImpact$2 as ErrorImpact, ErrorRecorder, ErrorRecorder as ErrorRecording, ErrorRecoverability$2 as ErrorRecoverability, ErrorSeverity$2 as ErrorSeverity, ErrorSource$2 as ErrorSource, ErrorType$2 as ErrorType, FieldTruncator as FieldTruncation, FieldTruncator, GlobalConfigManager, GlobalConfigManager as GlobalConfiguration, HandlingStatus$2 as HandlingStatus, LogicalOperator$2 as LogicalOperator, MessageCenter, MessageProcessor, ModuleRegistry, PathResolver as PathResolution, PathResolver, PolicyType$2 as PolicyType, RecordingManager, RequestContextManager, RequestContextManager as RequestContextTracking, RequestManager, ResponseActionType$2 as ResponseActionType, ResponseStatus$2 as ResponseStatus, RuleType$2 as RuleType, StatisticsTracker };
//# sourceMappingURL=index.esm.js.map
