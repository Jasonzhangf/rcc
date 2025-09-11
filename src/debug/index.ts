/**
 * RCC Debug System - Two-phase debug configuration
 *
 * This module provides a sophisticated two-phase debug system that:
 * 1. Uses "systemstart" directory before port initialization
 * 2. Switches to port-specific directories after port initialization
 *
 * @module debug
 */

// Two-phase debug system
export { TwoPhaseDebugSystem, TwoPhaseDebugConfig } from './TwoPhaseDebugSystem';

// Module startup configuration
export {
  TwoPhaseDebugModule,
  ModuleStartupConfig,
  createModuleStartupConfig,
  ModuleStartupConfigs,
} from './ModuleStartupConfig';

// Global debug system instance
export { twoPhaseDebugSystem } from './TwoPhaseDebugSystem';

// Re-export debug types from BaseModule
export { DebugLevel, DebugLogEntry, DebugConfig } from '../basemodule/src/BaseModule';
