import * as fs from 'fs';
import * as path from 'path';

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
 * DebugCenter - 调试中心，统一管理流水线会话和记录
 * DebugCenter - Centralized debug management for pipeline sessions and recording
 */
class DebugCenter {
    constructor(config = {}) {
        this.activeSessions = new Map();
        this.config = {
            outputDirectory: config.outputDirectory || './debug-logs',
            maxSessions: config.maxSessions || 1000,
            retentionDays: config.retentionDays || 7,
            enableRealTimeUpdates: config.enableRealTimeUpdates !== false
        };
        this.eventBus = DebugEventBus.getInstance();
        this.setupEventListeners();
        this.ensureOutputDirectory();
        this.startCleanupTimer();
    }
    setupEventListeners() {
        this.eventBus.subscribe('start', this.handleOperationStart.bind(this));
        this.eventBus.subscribe('end', this.handleOperationEnd.bind(this));
        this.eventBus.subscribe('error', this.handleOperationError.bind(this));
    }
    async ensureOutputDirectory() {
        try {
            await fs.promises.mkdir(this.config.outputDirectory, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create debug output directory:', error);
        }
    }
    startCleanupTimer() {
        // Clean up old sessions every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldSessions();
        }, 60 * 60 * 1000);
    }
    cleanupOldSessions() {
        const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
        for (const [sessionId, session] of this.activeSessions) {
            if (session.startTime < cutoffTime) {
                this.activeSessions.delete(sessionId);
                this.logDebug(`Cleaned up old session: ${sessionId}`);
            }
        }
    }
    handleOperationStart(event) {
        if (event.operationId === 'session_start') {
            this.handleSessionStart(event);
            return;
        }
        // Skip processing if no sessionId is provided
        if (!event.sessionId) {
            this.logDebug(`Received start event without sessionId: ${event.operationId}`);
            return;
        }
        let session = this.activeSessions.get(event.sessionId);
        // If no session exists, create one
        if (!session) {
            session = this.createSessionFromEvent(event);
            this.activeSessions.set(event.sessionId, session);
        }
        // Add operation to session
        const operation = {
            operationId: event.operationId,
            moduleId: event.moduleId,
            position: event.position,
            startTime: event.timestamp,
            status: 'running',
            input: event.data?.input
        };
        session.operations.push(operation);
        this.updateSessionFile(session);
        this.logDebug(`Operation started: ${event.operationId} in session ${event.sessionId}`);
    }
    handleOperationEnd(event) {
        if (event.operationId === 'session_end') {
            this.handleSessionEnd(event);
            return;
        }
        // Skip processing if no sessionId is provided
        if (!event.sessionId) {
            this.logDebug(`Received end event without sessionId: ${event.operationId}`);
            return;
        }
        const session = this.activeSessions.get(event.sessionId);
        if (!session) {
            this.logDebug(`Received end event for unknown session: ${event.sessionId}`);
            return;
        }
        // Find and update the operation
        const operation = session.operations.find(op => op.operationId === event.operationId);
        if (operation) {
            operation.endTime = event.timestamp;
            operation.status = 'completed';
            operation.output = event.data?.output;
        }
        this.updateSessionFile(session);
        this.logDebug(`Operation ended: ${event.operationId} in session ${event.sessionId}`);
    }
    handleOperationError(event) {
        // Skip processing if no sessionId is provided
        if (!event.sessionId) {
            this.logDebug(`Received error event without sessionId: ${event.operationId}`);
            return;
        }
        const session = this.activeSessions.get(event.sessionId);
        if (!session) {
            this.logDebug(`Received error event for unknown session: ${event.sessionId}`);
            return;
        }
        // Find and update the operation
        const operation = session.operations.find(op => op.operationId === event.operationId);
        if (operation) {
            operation.endTime = event.timestamp;
            operation.status = 'failed';
            operation.error = event.data?.error || 'Unknown error';
        }
        // Mark session as failed
        session.status = 'failed';
        session.endTime = event.timestamp;
        this.updateSessionFile(session);
        this.logDebug(`Operation failed: ${event.operationId} in session ${event.sessionId}`);
    }
    handleSessionStart(event) {
        // Skip processing if no sessionId is provided
        if (!event.sessionId) {
            this.logDebug(`Received session start event without sessionId`);
            return;
        }
        const session = this.createSessionFromEvent(event);
        this.activeSessions.set(event.sessionId, session);
        this.createSessionFile(session);
        this.logDebug(`Session started: ${event.sessionId}`);
    }
    handleSessionEnd(event) {
        // Skip processing if no sessionId is provided
        if (!event.sessionId) {
            this.logDebug(`Received session end event without sessionId`);
            return;
        }
        const session = this.activeSessions.get(event.sessionId);
        if (!session) {
            this.logDebug(`Received end event for unknown session: ${event.sessionId}`);
            return;
        }
        session.endTime = event.timestamp;
        session.status = 'completed';
        this.finalizeSessionFile(session);
        this.activeSessions.delete(event.sessionId);
        this.logDebug(`Session ended: ${event.sessionId}`);
    }
    createSessionFromEvent(event) {
        return {
            sessionId: event.sessionId || `session_${Date.now()}`,
            pipelineId: event.data?.pipelineId || 'unknown',
            startTime: event.timestamp,
            status: 'active',
            operations: []
        };
    }
    createSessionFile(session) {
        const fileName = `pipeline-session-${session.sessionId}.json`;
        const filePath = path.join(this.config.outputDirectory, fileName);
        const content = {
            sessionId: session.sessionId,
            pipelineId: session.pipelineId,
            startTime: session.startTime,
            status: session.status,
            operations: session.operations
        };
        this.writeJsonFile(filePath, content);
    }
    updateSessionFile(session) {
        const fileName = `pipeline-session-${session.sessionId}.json`;
        const filePath = path.join(this.config.outputDirectory, fileName);
        const content = {
            sessionId: session.sessionId,
            pipelineId: session.pipelineId,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            operations: session.operations
        };
        this.writeJsonFile(filePath, content);
    }
    finalizeSessionFile(session) {
        this.updateSessionFile(session);
        // Generate summary
        const summary = this.generateSessionSummary(session);
        const summaryFileName = `pipeline-session-${session.sessionId}-summary.json`;
        const summaryFilePath = path.join(this.config.outputDirectory, summaryFileName);
        this.writeJsonFile(summaryFilePath, summary);
    }
    generateSessionSummary(session) {
        const operations = session.operations;
        const totalDuration = session.endTime ? session.endTime - session.startTime : 0;
        return {
            sessionId: session.sessionId,
            pipelineId: session.pipelineId,
            totalDuration,
            operationCount: operations.length,
            successCount: operations.filter(op => op.status === 'completed').length,
            failureCount: operations.filter(op => op.status === 'failed').length,
            runningCount: operations.filter(op => op.status === 'running').length,
            averageOperationDuration: operations.length > 0
                ? operations.reduce((sum, op) => sum + (op.endTime ? op.endTime - op.startTime : 0), 0) / operations.length
                : 0,
            timeline: operations.map(op => ({
                moduleId: op.moduleId,
                operationId: op.operationId,
                position: op.position,
                startTime: op.startTime,
                endTime: op.endTime,
                duration: op.endTime ? op.endTime - op.startTime : 0,
                status: op.status
            }))
        };
    }
    writeJsonFile(filePath, content) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        }
        catch (error) {
            console.error(`Failed to write debug file ${filePath}:`, error);
        }
    }
    logDebug(message, data) {
        if (this.config.enableRealTimeUpdates) {
            console.log(`[DebugCenter] ${message}`, data || '');
        }
    }
    // Public API methods
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    getSessionCount() {
        return this.activeSessions.size;
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (newConfig.outputDirectory) {
            this.ensureOutputDirectory();
        }
        this.logDebug('Configuration updated', { config: this.config });
    }
    getConfig() {
        return { ...this.config };
    }
    /**
     * Process debug event from external source (e.g., BaseModule)
     * This method provides a standardized interface for receiving debug events from other modules
     * @param event - Debug event from external source
     */
    processDebugEvent(event) {
        if (!this.config.enableRealTimeUpdates) {
            return;
        }
        // Validate required fields
        if (!event.sessionId || !event.moduleId || !event.operationId) {
            this.logDebug('Invalid debug event received', { event });
            return;
        }
        // Convert the external event to internal format and process
        const internalEvent = {
            sessionId: event.sessionId,
            moduleId: event.moduleId,
            operationId: event.operationId,
            timestamp: event.timestamp || Date.now(),
            type: event.type,
            position: event.position,
            data: event.data || {}
        };
        // Process through the existing event handlers
        switch (internalEvent.type) {
            case 'start':
                this.handleOperationStart(internalEvent);
                break;
            case 'end':
                this.handleOperationEnd(internalEvent);
                break;
            case 'error':
                this.handleOperationError(internalEvent);
                break;
            default:
                this.logDebug('Unknown event type received', { type: internalEvent.type });
        }
        // Also publish to internal event bus for consistency
        this.eventBus.publish(internalEvent);
    }
    /**
     * Connect BaseModule to this DebugCenter instance
     * This is a convenience method for easy integration
     * @param baseModule - BaseModule instance to connect
     */
    connectBaseModule(baseModule) {
        if (typeof baseModule.setExternalDebugHandler === 'function') {
            baseModule.setExternalDebugHandler((event) => {
                this.processDebugEvent(event);
            });
            this.logDebug('BaseModule connected to DebugCenter');
        }
        else {
            this.logDebug('BaseModule does not support external debug handler');
        }
    }
    async destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Finalize all active sessions
        for (const session of this.activeSessions.values()) {
            session.status = 'terminated';
            session.endTime = Date.now();
            this.finalizeSessionFile(session);
        }
        this.activeSessions.clear();
        this.logDebug('DebugCenter destroyed');
    }
}

// Core exports

export { DebugCenter, DebugEventBus, DebugCenter as default };
//# sourceMappingURL=index.esm.js.map
