declare module 'rcc-basemodule' {
  // Base classes and interfaces
  export class BaseModule {
    constructor(moduleInfo: ModuleInfo);
    protected log: any;
    protected config: any;
    protected debug: any;
    protected error: any;
    protected warn: any;
    protected trace: any;
    protected logInfo: any;

    getId(): string;
    getName(): string;
    getVersion(): string;
    getDescription(): string;
    isInitialized(): boolean;

    initialize(config?: any): Promise<void>;
    configure(config: any): Promise<void>;
    getConfig(): any;
    destroy(): Promise<void>;
    handleMessage(message: any): Promise<void>;
    processDebugEvent(event: any): Promise<void>;
  }

  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    type?: string;
    capabilities?: string[];
    dependencies?: string[];
    config?: any;
    metadata?: any;
  }

  // Other exports
  export class MessageCenter {}
  export class MessageProcessor {}
  export class ModuleRegistry {}
  export class TopicSubscriptionManager {}

  export interface Message {
    id: string;
    type: string;
    source: string;
    target: string;
    payload: any;
    timestamp: number;
    topic?: string;
  }
}