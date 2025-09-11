/**
 * Configuration interface for UnderConstruction module
 */
export interface UnderConstructionConfig {
  /**
   * Enable call tracking for debugging
   */
  enableCallTracking: boolean;

  /**
   * Maximum size of the call stack
   */
  maxCallStackSize: number;

  /**
   * Log under construction method calls
   */
  logUnderConstructionCalls: boolean;
}

/**
 * Default configuration for UnderConstruction module
 */
export const defaultUnderConstructionConfig: UnderConstructionConfig = {
  enableCallTracking: true,
  maxCallStackSize: 100,
  logUnderConstructionCalls: true
};