import { BaseModule } from '../../core/BaseModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

export class DummyTestModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  public async initialize(config: any): Promise<void> {
    // TODO: Implement initialization logic
    log('${this.moduleInfo.name} initialized');
  }
  
  public async destroy(): Promise<void> {
    // TODO: Implement cleanup logic
    log('${this.moduleInfo.name} destroyed');
  }
  
  public async handshake(moduleInfo: any, connectionInfo: any): Promise<void> {
    // TODO: Implement handshake logic
    log('${this.moduleInfo.name} handshake with ${moduleInfo.name}');
  }
  
  public getModuleInfo() {
    return this.moduleInfo;
  }
  
  public get moduleConfig() {
    return this.config;
  }
}

// Helper function for logging
function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
