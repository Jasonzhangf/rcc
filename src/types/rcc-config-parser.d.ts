declare module 'rcc-config-parser' {
  export interface ConfigParseOptions {
    strict?: boolean;
    validate?: boolean;
    autoFix?: boolean;
  }

  export interface ConfigParseResult {
    valid: boolean;
    config?: any;
    errors?: string[];
    warnings?: string[];
  }

  export class ConfigParser {
    constructor(options?: ConfigParseOptions);
    parse(content: string): ConfigParseResult;
    validate(content: any): ConfigParseResult;
  }

  export interface ServerModuleModule {
    ServerModule?: any;
    default?: any;
  }

  export interface DebugCenterModule {
    DebugCenter?: any;
    DebugEventBus?: any;
    default?: any;
  }

  export interface PipelineModule {
    PipelineModule?: any;
    default?: any;
  }

  export function generateAllWrappers(options?: any): any;
}
