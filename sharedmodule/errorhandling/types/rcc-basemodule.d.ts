declare module 'rcc-basemodule' {
  export class BaseModule {
    constructor(moduleInfo: any);
    logInfo(message: string, data?: any): void;
    debug(level: string, message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    trace(message: string, data?: any): void;
  }
  
  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description?: string;
    type: string;
  }
  
  export interface DebugConfig {
    baseDirectory?: string;
    level?: string;
    phase?: string;
    port?: number;
  }
  
  export enum DebugLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
  }
}