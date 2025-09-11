// Type declaration for rcc-basemodule
declare module 'rcc-basemodule' {
  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    type: string;
    capabilities: string[];
    dependencies: string[];
    config: Record<string, any>;
    metadata: Record<string, any>;
  }

  export class BaseModule {
    constructor(moduleInfo: ModuleInfo);
    protected moduleInfo: ModuleInfo;
    protected log(message: string, data?: any): void;
    protected warn(message: string, data?: any): void;
    protected error(message: string, data?: any): void;
    protected debug(level: string, message: string, data?: any): void;
    protected logInfo(message: string, data?: any): void;
    protected trace(message: string, data?: any): void;
    protected broadcastMessage(message: any): void;
    public configure(config: Record<string, any>): void;
    public initialize(): Promise<void>;
    public destroy(): void;
    public getInfo(): ModuleInfo;
  }
}