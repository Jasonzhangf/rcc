// Temporary type declarations for RCC modules
declare module 'rcc-basemodule' {
  export interface BaseModule {
    getModuleInfo(): any;
    isInitialized(): boolean;
    isRunning(): boolean;
  }

  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    type: string;
  }

  export class BaseModule {
    constructor(moduleInfo: ModuleInfo);
  }
}

declare module 'rcc-debugcenter' {
  export class DebugEventBus {
    static getInstance(): DebugEventBus;
    publish(event: any): void;
  }
}