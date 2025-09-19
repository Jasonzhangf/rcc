/**
 * Debug Event Bus - Compatibility layer
 * Re-exports DebugEventBus from rcc-debugcenter for backward compatibility
 *
 * @deprecated Import DebugEventBus directly from 'rcc-debugcenter' instead
 */

// Re-export from debugcenter package for backward compatibility
export { DebugEventBus, type DebugEvent } from 'rcc-debugcenter';
