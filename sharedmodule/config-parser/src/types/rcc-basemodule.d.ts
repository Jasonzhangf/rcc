declare module 'rcc-basemodule' {
  export interface ModuleInfo {
    id: string;
    type: string;
    name: string;
    version: string;
    description: string;
  }

  export class BaseModule {
    constructor(info: ModuleInfo);
    initialize(): Promise<void>;
    logInfo(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    getInfo(): ModuleInfo;
  }
}