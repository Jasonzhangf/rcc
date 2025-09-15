/**
 * RCC Debug System - Simple configurable debug system
 *
 * This module provides a simple debug system that:
 * 1. Supports configurable log directory
 * 2. Can update directory at runtime
 * 3. Supports different log levels and file output
 *
 * @module debug
 */

// Main debug system
export { DebugSystem, DebugConfig, DebugLevel, DebugLogEntry, debugSystem, initializeDebugSystem, updateDebugDirectory } from './DebugSystem';
