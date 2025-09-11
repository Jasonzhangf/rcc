declare module 'rcc-basemodule' {
  export class BaseModule {
    constructor(moduleInfo: any);
    logInfo(message: string, data?: any, context?: string): void;
    debug(level: string, message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    trace(message: string, data?: any): void;
    log(message: string, data?: any, context?: string): void;
    broadcastMessage(type: string, data: any): void;
    configure(config: any): void;
    getConfig(): any;
    handleMessage(message: any): Promise<any>;
    initialize(): Promise<void>;
    destroy(): Promise<void>;
  }
  
  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description?: string;
    type: string;
    capabilities?: string[];
    dependencies?: string[];
    config?: any;
    metadata?: any;
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