// Type declarations for rcc-basemodule to resolve import issues
// This file provides fallback type definitions when the actual package is not installed
declare module 'rcc-basemodule' {
  // Core BaseModule class with protected methods that DynamicRoutingClassificationModule needs
  export abstract class BaseModule {
    protected info: {
      id: string;
      name: string;
      version: string;
      type: string;
      description: string;
      metadata?: Record<string, any>;
    };

    constructor(info: any);
    protected log(message: string, data?: any, method?: string): void;
    protected warn(message: string, data?: any, method?: string): void;
    protected error(message: string, data?: any, method?: string): void;
    protected broadcastMessage(type: string, payload: any, metadata?: any): void;
    public configure(config: any): void;
    public async initialize(): Promise<void>;
    public async destroy(): Promise<void>;
    public async handleMessage(message: any): Promise<any>;
    public getInfo(): any;
    public getConfig(): any;
  }

  export type ModuleInfo = {
    id: string;
    name: string;
    version: string;
    type: string;
    description: string;
    metadata?: Record<string, any>;
  };
}

// Type declarations for virtual model rules module
declare module '@/*' {
  export * from './src/*';
}