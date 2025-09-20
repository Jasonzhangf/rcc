/**
 * Manages pipeline session tracking and position
 */
export class PipelineSessionManager {
  private currentSessionId?: string;
  private pipelinePosition?: 'start' | 'middle' | 'end';
  private moduleId: string;
  private debugCallback?: (level: string, message: string, data?: any, method?: string) => void;

  constructor(moduleId: string, debugCallback?: (level: string, message: string, data?: any, method?: string) => void) {
    this.moduleId = moduleId;
    this.debugCallback = debugCallback;
  }

  /**
   * Sets the pipeline position for this module
   */
  public setPipelinePosition(position: 'start' | 'middle' | 'end'): void {
    this.pipelinePosition = position;
    this.debug('debug', 'Pipeline position set', { position }, 'setPipelinePosition');
  }

  /**
   * Gets the pipeline position for this module
   */
  public getPipelinePosition(): 'start' | 'middle' | 'end' | undefined {
    return this.pipelinePosition;
  }

  /**
   * Sets the current session ID for pipeline operations
   */
  public setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.debug('debug', 'Current session set', { sessionId }, 'setCurrentSession');
  }

  /**
   * Gets the current session ID
   */
  public getCurrentSession(): string | undefined {
    return this.currentSessionId;
  }

  /**
   * Clears the current session
   */
  public clearCurrentSession(): void {
    if (this.currentSessionId) {
      this.debug('debug', 'Current session cleared', { sessionId: this.currentSessionId }, 'clearCurrentSession');
      this.currentSessionId = undefined;
    }
  }

  /**
   * Checks if module has an active session
   */
  public hasActiveSession(): boolean {
    return this.currentSessionId !== undefined;
  }

  /**
   * Gets the pipeline position as a string
   */
  public getPipelinePositionString(): string {
    return this.pipelinePosition || 'middle';
  }

  /**
   * Internal debug logging
   */
  private debug(level: string, message: string, data?: any, method?: string): void {
    if (this.debugCallback) {
      this.debugCallback(level, message, data, method);
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.clearCurrentSession();
    this.pipelinePosition = undefined;
  }
}