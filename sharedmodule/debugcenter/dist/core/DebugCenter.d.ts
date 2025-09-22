/**
 * DebugCenter - 调试中心，统一管理流水线会话和记录
 * DebugCenter - Centralized debug management for pipeline sessions and recording
 */
import { DebugEvent } from './DebugEventBus';
export interface PipelineSession {
    sessionId: string;
    pipelineId: string;
    startTime: number;
    endTime?: number;
    status: 'active' | 'completed' | 'failed' | 'terminated';
    operations: Array<{
        operationId: string;
        moduleId: string;
        position: 'start' | 'middle' | 'end';
        startTime: number;
        endTime?: number;
        status: 'running' | 'completed' | 'failed';
        input?: any;
        output?: any;
        error?: string;
    }>;
}
export interface PipelineConfig {
    pipelineId: string;
    startModule: string;
    middleModules: string[];
    endModule: string;
    recordingMode: 'unified' | 'separated';
}
export interface DebugCenterConfig {
    outputDirectory: string;
    maxSessions: number;
    retentionDays: number;
    enableRealTimeUpdates: boolean;
}
export declare class DebugCenter {
    private activeSessions;
    private eventBus;
    private config;
    private cleanupInterval?;
    constructor(config?: Partial<DebugCenterConfig>);
    private setupEventListeners;
    private ensureOutputDirectory;
    private startCleanupTimer;
    private cleanupOldSessions;
    private handleOperationStart;
    private handleOperationEnd;
    private handleOperationError;
    private handleSessionStart;
    private handleSessionEnd;
    private createSessionFromEvent;
    private createSessionFile;
    private updateSessionFile;
    private finalizeSessionFile;
    private generateSessionSummary;
    private writeJsonFile;
    private logDebug;
    getActiveSessions(): PipelineSession[];
    getSession(sessionId: string): PipelineSession | undefined;
    getSessionCount(): number;
    updateConfig(newConfig: Partial<DebugCenterConfig>): void;
    getConfig(): DebugCenterConfig;
    /**
     * Process debug event from external source (e.g., BaseModule)
     * This method provides a standardized interface for receiving debug events from other modules
     * @param event - Debug event from external source
     */
    processDebugEvent(event: DebugEvent): void;
    /**
     * Connect BaseModule to this DebugCenter instance
     * This is a convenience method for easy integration
     * @param baseModule - BaseModule instance to connect
     */
    connectBaseModule(baseModule: any): void;
    destroy(): Promise<void>;
}
//# sourceMappingURL=DebugCenter.d.ts.map