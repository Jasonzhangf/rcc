// Type declarations for rcc-basemodule to resolve import issues
declare module 'rcc-basemodule' {
  export { BaseModule } from './src/BaseModule';
  export type { ModuleInfo } from './src/interfaces/ModuleInfo';
  export type { DebugLevel, DebugLogEntry } from './src/BaseModule';
  export { MessageCenter } from './src/MessageCenter';
}

// Type declarations for virtual model rules module
declare module '@/*' {
  export * from './src/*';
}