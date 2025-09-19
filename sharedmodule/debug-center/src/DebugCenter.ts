/**
 * DebugCenter - 调试中心，统一管理流水线会话和记录
 * DebugCenter - Centralized debug management for pipeline sessions and recording
 */

import { DebugEventBus, DebugEvent } from 'rcc-basemodule';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface PipelineSession {
  sessionId: string;
  pipelineId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed';
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

export class DebugCenter {
  private activeSessions: Map<string, PipelineSession> = new Map();
  private eventBus: DebugEventBus;
  private config: DebugCenterConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<DebugCenterConfig> = {}) {
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

  private setupEventListeners(): void {
    this.eventBus.subscribe('start', this.handleOperationStart.bind(this));
    this.eventBus.subscribe('end', this.handleOperationEnd.bind(this));
    this.eventBus.subscribe('error', this.handleOperationError.bind(this));
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.config.outputDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create debug output directory:', error);
    }
  }

  private startCleanupTimer(): void {
    // Clean up old sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60 * 60 * 1000);
  }

  private cleanupOldSessions(): void {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    for (const [sessionId, session] of this.activeSessions) {
      if (session.startTime < cutoffTime) {
        this.activeSessions.delete(sessionId);
        this.logDebug(`Cleaned up old session: ${sessionId}`);
      }
    }
  }

  private handleOperationStart(event: DebugEvent): void {
    if (event.operationId === 'session_start') {
      this.handleSessionStart(event);
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
      status: 'running' as const,
      input: event.data?.input
    };

    session.operations.push(operation);
    this.updateSessionFile(session);

    this.logDebug(`Operation started: ${event.operationId} in session ${event.sessionId}`);
  }

  private handleOperationEnd(event: DebugEvent): void {
    if (event.operationId === 'session_end') {
      this.handleSessionEnd(event);
      return;
    }

    const session = this.activeSessions.get(event.sessionId);
    if (!session) return;

    const operation = session.operations.find(op => op.operationId === event.operationId);
    if (operation) {
      operation.endTime = event.timestamp;
      operation.output = event.data?.output;
      operation.status = 'completed';
      this.updateSessionFile(session);

      this.logDebug(`Operation completed: ${event.operationId} in session ${event.sessionId}`);
    }
  }

  private handleOperationError(event: DebugEvent): void {
    const session = this.activeSessions.get(event.sessionId);
    if (!session) return;

    const operation = session.operations.find(op => op.operationId === event.operationId);
    if (operation) {
      operation.endTime = event.timestamp;
      operation.error = event.data?.error;
      operation.status = 'failed';
      session.status = 'failed';
      this.updateSessionFile(session);

      this.logDebug(`Operation failed: ${event.operationId} in session ${event.sessionId}`);
    }
  }

  private handleSessionStart(event: DebugEvent): void {
    const pipelineConfig = event.data?.pipelineConfig || {
      pipelineId: 'unknown-pipeline',
      startModule: 'unknown',
      middleModules: [],
      endModule: 'unknown',
      recordingMode: 'unified' as const
    };

    const session: PipelineSession = {
      sessionId: event.sessionId,
      pipelineId: pipelineConfig.pipelineId,
      startTime: event.timestamp,
      status: 'active',
      operations: []
    };

    this.activeSessions.set(event.sessionId, session);
    this.createSessionFile(session);

    this.logDebug(`Session started: ${event.sessionId}`);
  }

  private handleSessionEnd(event: DebugEvent): void {
    const session = this.activeSessions.get(event.sessionId);
    if (!session) return;

    session.endTime = event.timestamp;
    session.status = event.data?.success ? 'completed' : 'failed';

    this.finalizeSessionFile(session);

    // Keep completed sessions for a while for summary generation
    setTimeout(() => {
      this.activeSessions.delete(event.sessionId);
      this.logDebug(`Session removed from active memory: ${event.sessionId}`);
    }, 5 * 60 * 1000); // 5 minutes

    this.logDebug(`Session ended: ${event.sessionId} with status: ${session.status}`);
  }

  private createSessionFromEvent(event: DebugEvent): PipelineSession {
    return {
      sessionId: event.sessionId,
      pipelineId: 'unknown-pipeline',
      startTime: event.timestamp,
      status: 'active',
      operations: []
    };
  }

  private createSessionFile(session: PipelineSession): void {
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

  private updateSessionFile(session: PipelineSession): void {
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

  private finalizeSessionFile(session: PipelineSession): void {
    this.updateSessionFile(session);

    // Generate summary
    const summary = this.generateSessionSummary(session);
    const summaryFileName = `pipeline-session-${session.sessionId}-summary.json`;
    const summaryFilePath = path.join(this.config.outputDirectory, summaryFileName);

    this.writeJsonFile(summaryFilePath, summary);
  }

  private generateSessionSummary(session: PipelineSession): any {
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

  private writeJsonFile(filePath: string, content: any): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    } catch (error) {
      console.error(`Failed to write debug file ${filePath}:`, error);
    }
  }

  private logDebug(message: string, data?: any): void {
    if (this.config.enableRealTimeUpdates) {
      console.log(`[DebugCenter] ${message}`, data || '');
    }
  }

  // Public API methods

  public getActiveSessions(): PipelineSession[] {
    return Array.from(this.activeSessions.values());
  }

  public getSession(sessionId: string): PipelineSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getSessionCount(): number {
    return this.activeSessions.size;
  }

  public updateConfig(newConfig: Partial<DebugCenterConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.outputDirectory) {
      this.ensureOutputDirectory();
    }

    this.logDebug('Configuration updated', { config: this.config });
  }

  public getConfig(): DebugCenterConfig {
    return { ...this.config };
  }

  public async destroy(): Promise<void> {
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