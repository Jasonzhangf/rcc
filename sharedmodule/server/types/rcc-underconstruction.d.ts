declare module 'rcc-underconstruction' {
  export class UnderConstruction {
    constructor();
    initialize(): Promise<void>;
    callUnderConstructionFeature(featureName: string, params: any): void;
  }
}