declare module 'rcc-virtual-model-rules' {
  export class VirtualModelRulesModule {
    constructor();
    initialize(): Promise<void>;
    destroy(): Promise<void>;
  }
}