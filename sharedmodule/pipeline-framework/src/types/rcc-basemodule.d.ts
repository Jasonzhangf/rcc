declare module 'rcc-basemodule' {
  import { DebugLevel } from './debug-level';
  import { ErrorSource, ErrorType, ErrorSeverity, ErrorImpact, ErrorRecoverability } from './error-types';
  import { UnderConstructionFeature } from './under-construction';
  import { BaseModuleConfig, RequestContext, DebugConfig } from './types';

  export { DebugLevel };
  export { ErrorSource, ErrorType, ErrorSeverity, ErrorImpact, ErrorRecoverability };
  export { UnderConstructionFeature };
  export { BaseModuleConfig, RequestContext, DebugConfig };

  // Export main classes/functions
  export * from './debug-manager';
  export * from './error-manager';
  export * from './under-construction';
  export * from './utils';
}