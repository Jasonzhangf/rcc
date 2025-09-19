import {
  RequestContext,
  RequestContextOptions,
  TraceReport,
  RecordingConfigSnapshot,
  ChainStatus,
  BaseModuleRecordingConfig,
  ModuleRecordingConfig
} from '../interfaces/Recording';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request context manager that handles cross-module chain tracking
 */
export class RequestContextManager {
  private activeContexts: Map<string, RequestContext> = new Map();
  private contextHistory: Map<string, RequestContext[]> = new Map();
  private chainBreakpoints: Map<string, { timestamp: number; reason: string; details: string; repairAttempted: boolean }> = new Map();
  private moduleContexts: Map<string, string[]> = new Map(); // moduleId -> contextIds
  private globalSessionId: string;

  constructor() {
    this.globalSessionId = uuidv4();
  }

  // ========================================
  // Context Creation and Management
  // ========================================

  /**
   * Create new request context
   */
  createContext(options: RequestContextOptions = {}): RequestContext {
    const requestId = uuidv4();
    const sessionId = this.globalSessionId;
    const traceId = uuidv4();
    const chainId = options.inheritContext ?
      (this.activeContexts.get(options.inheritContext)?.chainId || uuidv4()) :
      uuidv4();

    let context: RequestContext;

    if (options.inheritContext && this.activeContexts.has(options.inheritContext)) {
      // Inherit from existing context
      const existing = this.activeContexts.get(options.inheritContext)!;
      context = {
        ...existing,
        requestId,
        currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
        moduleStack: [...existing.moduleStack, this.extractModuleName(options.customConfig?.module) || 'unknown'],
        configSnapshot: this.createConfigSnapshot(options.customConfig || existing.configSnapshot)
      };
    } else {
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
    this.moduleContexts.get(moduleId)!.push(requestId);

    return context;
  }

  /**
   * Get request context
   */
  getContext(requestId: string): RequestContext | undefined {
    return this.activeContexts.get(requestId);
  }

  /**
   * Update request context
   */
  updateContext(requestId: string, updates: Partial<RequestContext>): boolean {
    const context = this.activeContexts.get(requestId);
    if (!context) return false;

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
  completeContext(requestId: string, status: 'completed' | 'error' = 'completed'): boolean {
    const context = this.activeContexts.get(requestId);
    if (!context) return false;

    context.status = status;

    // Generate trace report
    const report = this.generateTraceReport(context);

    // Move to history
    if (!this.contextHistory.has(context.sessionId)) {
      this.contextHistory.set(context.sessionId, []);
    }
    this.contextHistory.get(context.sessionId)!.push(context);

    // Remove from active contexts
    this.activeContexts.delete(requestId);

    // Remove from module contexts
    this.removeFromModuleContexts(requestId, context.currentModule);

    return true;
  }

  /**
   * Get all active contexts
   */
  getActiveContexts(): RequestContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Get contexts by session
   */
  getContextsBySession(sessionId: string): RequestContext[] {
    const active = Array.from(this.activeContexts.values()).filter(ctx => ctx.sessionId === sessionId);
    const history = this.contextHistory.get(sessionId) || [];
    return [...active, ...history];
  }

  /**
   * Get contexts by module
   */
  getContextsByModule(moduleId: string): RequestContext[] {
    const contextIds = this.moduleContexts.get(moduleId) || [];
    return contextIds.map(id => this.activeContexts.get(id)).filter(Boolean) as RequestContext[];
  }

  // ========================================
  // Chain Management
  // ========================================

  /**
   * Get chain status
   */
  getChainStatus(chainId: string): ChainStatus | undefined {
    const contexts = Array.from(this.activeContexts.values()).filter(ctx => ctx.chainId === chainId);
    if (contexts.length === 0) return undefined;

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
  private detectChainBreakpoint(context: RequestContext, reason: string, details: string): void {
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
  private attemptChainRepair(context: RequestContext, reason: string): void {
    const breakpoint = this.chainBreakpoints.get(context.chainId);
    if (!breakpoint || breakpoint.repairAttempted) return;

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
  getChainBreakpoints(chainId?: string): Array<{
    chainId: string;
    timestamp: number;
    reason: string;
    details: string;
    repairAttempted: boolean;
  }> {
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
  clearChainBreakpoints(chainId?: string): void {
    if (chainId) {
      this.chainBreakpoints.delete(chainId);
    } else {
      this.chainBreakpoints.clear();
    }
  }

  // ========================================
  // Shared Data Management
  // ========================================

  /**
   * Set shared data
   */
  setSharedData(requestId: string, key: string, value: any): boolean {
    const context = this.activeContexts.get(requestId);
    if (!context) return false;

    context.sharedData.set(key, value);
    return true;
  }

  /**
   * Get shared data
   */
  getSharedData(requestId: string, key: string): any | undefined {
    const context = this.activeContexts.get(requestId);
    return context?.sharedData.get(key);
  }

  /**
   * Get all shared data
   */
  getAllSharedData(requestId: string): Map<string, any> | undefined {
    const context = this.activeContexts.get(requestId);
    return context?.sharedData;
  }

  /**
   * Share data across chain
   */
  shareDataAcrossChain(chainId: string, key: string, value: any): number {
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
  generateTraceReport(context: RequestContext): TraceReport {
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
  getTraceReports(sessionId?: string): TraceReport[] {
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
  private updateModuleRegistration(requestId: string, oldModule: string, newModule: string): void {
    // Remove from old module
    this.removeFromModuleContexts(requestId, oldModule);

    // Add to new module
    if (!this.moduleContexts.has(newModule)) {
      this.moduleContexts.set(newModule, []);
    }
    this.moduleContexts.get(newModule)!.push(requestId);
  }

  /**
   * Remove from module contexts
   */
  private removeFromModuleContexts(requestId: string, moduleId: string): void {
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
  getActiveModules(): string[] {
    return Array.from(this.moduleContexts.keys()).filter(moduleId => {
      const contextIds = this.moduleContexts.get(moduleId);
      return contextIds && contextIds.length > 0;
    });
  }

  /**
   * Get module context count
   */
  getModuleContextCount(moduleId: string): number {
    return this.moduleContexts.get(moduleId)?.length || 0;
  }

  // ========================================
  // Helper Methods
  // ========================================

  private createConfigSnapshot(customConfig?: Partial<BaseModuleRecordingConfig>): RecordingConfigSnapshot {
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

  private resolveBasePath(customConfig?: Partial<BaseModuleRecordingConfig>): string {
    return customConfig?.basePath || './recording-logs';
  }

  private calculateModuleTimings(context: RequestContext): Record<string, number> {
    // Simple module timing calculation based on path history
    const timings: Record<string, number> = {};
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

  private extractErrors(context: RequestContext): Array<{
    moduleId: string;
    error: string;
    timestamp: number;
  }> {
    const errors: Array<{ moduleId: string; error: string; timestamp: number }> = [];

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

  private generateTraceSummary(context: RequestContext): string {
    const pathChanges = context.pathHistory.length;
    const moduleCount = new Set(context.moduleStack).size;
    const duration = Date.now() - context.startTime;

    return `Trace completed: ${moduleCount} modules, ${pathChanges} path changes, ${duration}ms duration`;
  }

  /**
   * Cleanup old contexts
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    // Clean history
    for (const [sessionId, contexts] of Array.from(this.contextHistory.entries())) {
      const filtered = contexts.filter((ctx: RequestContext) => ctx.startTime > cutoffTime);
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
  getStatistics(): {
    activeContexts: number;
    totalContexts: number;
    chainBreakpoints: number;
    activeModules: number;
    sessionCount: number;
  } {
    return {
      activeContexts: this.activeContexts.size,
      totalContexts: this.activeContexts.size + Array.from(this.contextHistory.values()).reduce((sum, ctxs) => sum + ctxs.length, 0),
      chainBreakpoints: this.chainBreakpoints.size,
      activeModules: this.getActiveModules().length,
      sessionCount: this.contextHistory.size + 1 // +1 for current session
    };
  }

  private extractModuleName(module: string | ModuleRecordingConfig | undefined): string | undefined {
    if (!module) return undefined;
    if (typeof module === 'string') return module;
    return module.enabled ? 'module-config' : 'unknown';
  }
}